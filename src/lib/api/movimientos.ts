/**
 * API de movimientos: CRUD contra Supabase.
 * Implementa: API_Contract.md §2, Architecture.md §3.2–3.3.
 * agents.md: regla 5 — los componentes no importan supabase directamente.
 *
 * Los movimientos de tipo 'Ahorro' ya NO existen en v2.0 — los aportes a metas
 * actualizan directamente `metas.monto_actual` (agents.md regla 7).
 */

import { createClient } from '@/lib/supabase/client';
import type { Movimiento, MovimientoRow, FiltrosMovimientos } from '@/lib/types';

// ── Normalización DB → dominio ────────────────────────────────────────────────

function rowToMovimiento(row: MovimientoRow): Movimiento {
  return {
    id:         row.id,
    fecha:      row.fecha,
    hora:       row.hora.substring(0, 5), // HH:MM
    tipo:       row.tipo,
    monto:      Number(row.monto),
    categoria:  row.categoria,
    comercio:   row.comercio,
    metodoPago: row.tarjetas?.nombre ?? 'Efectivo',
  };
}

// ── Lectura ───────────────────────────────────────────────────────────────────

/**
 * Obtiene movimientos con filtros opcionales.
 * Equivalente al antiguo GET /movimientos de GAS.
 * RLS filtra automáticamente por usuario autenticado.
 */
export async function getMovimientos(filtros: FiltrosMovimientos = {}): Promise<Movimiento[]> {
  const supabase = createClient();
  const limit = filtros.limit ?? 200;

  let query = supabase
    .from('movimientos')
    .select('*, tarjetas(nombre)')
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })
    .range(filtros.offset ?? 0, (filtros.offset ?? 0) + limit - 1);

  if (filtros.desde) query = query.gte('fecha', filtros.desde);
  if (filtros.hasta) query = query.lte('fecha', filtros.hasta);
  if (filtros.tarjetaId !== undefined) {
    if (filtros.tarjetaId === 'Efectivo' || filtros.tarjetaId === null) {
      query = query.is('tarjeta_id', null);
    } else {
      query = query.eq('tarjeta_id', filtros.tarjetaId);
    }
  }
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo);

  const { data, error } = await query.returns<MovimientoRow[]>();
  if (error) throw error;

  return (data ?? []).map(rowToMovimiento);
}

import { CATEGORIAS_TRANSFERENCIA } from '@/lib/types';

export async function getGastosPorCategoria(desde: string) {
  const movs = await getMovimientos({ desde, limit: 5000 });
  const map: Record<string, number> = {};
  for (const m of movs) {
    if (m.tipo === 'Gasto' && !(CATEGORIAS_TRANSFERENCIA as readonly string[]).includes(m.categoria)) {
      map[m.categoria] = (map[m.categoria] || 0) + m.monto;
    }
  }
  return Object.entries(map)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

export async function getFlujoPorMes(desde: string) {
  const movs = await getMovimientos({ desde, limit: 5000 });
  const map: Record<string, { ingresos: number; gastos: number }> = {};
  for (const m of movs) {
    const mes = m.fecha.substring(0, 7); // YYYY-MM
    if (!map[mes]) map[mes] = { ingresos: 0, gastos: 0 };
    if (m.tipo === 'Ingreso' && !(CATEGORIAS_TRANSFERENCIA as readonly string[]).includes(m.categoria)) {
      map[mes].ingresos += m.monto;
    } else if (m.tipo === 'Gasto' && !(CATEGORIAS_TRANSFERENCIA as readonly string[]).includes(m.categoria)) {
      map[mes].gastos += m.monto;
    }
  }
  return Object.entries(map)
    .map(([mes, vals]) => ({ mes, ingresos: vals.ingresos, gastos: vals.gastos }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

// ── Escritura ─────────────────────────────────────────────────────────────────

export interface NuevoMovimientoInput {
  fecha: string;
  tipo: 'Gasto' | 'Ingreso';
  monto: number;
  categoria: string;
  comercio: string;
  tarjetaId: string | null;
}

/** Crea un movimiento para el usuario autenticado. */
export async function crearMovimiento(mov: NuevoMovimientoInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data, error } = await supabase.from('movimientos').insert({
    user_id: user.id,
    fecha: mov.fecha,
    hora: new Date().toTimeString().substring(0, 8),
    tipo: mov.tipo,
    monto: mov.monto,
    categoria: mov.categoria,
    comercio: mov.comercio,
    tarjeta_id: mov.tarjetaId,
  }).select('*, tarjetas(nombre)').single();

  if (error) throw error;
  return rowToMovimiento(data);
}

export interface EditarMovimientoInput {
  fecha?: string;
  tipo?: 'Gasto' | 'Ingreso';
  monto?: number;
  categoria?: string;
  comercio?: string;
  tarjetaId?: string | null;
}

/** Actualiza campos de un movimiento existente (RLS valida que pertenezca al usuario). */
export async function editarMovimiento(id: string, mov: EditarMovimientoInput) {
  const supabase = createClient();
  const updatePayload: Record<string, unknown> = { ...mov };
  if ('tarjetaId' in mov) {
    updatePayload.tarjeta_id = mov.tarjetaId;
    delete updatePayload.tarjetaId;
  }
  
  const { data, error } = await supabase
    .from('movimientos')
    .update(updatePayload)
    .eq('id', id)
    .select('*, tarjetas(nombre)')
    .single();

  if (error) throw error;
  return rowToMovimiento(data);
}

/** Elimina un movimiento (H3: control y libertad del usuario). */
export async function eliminarMovimiento(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('movimientos').delete().eq('id', id);
  if (error) throw error;
}

export async function traspasoEfectivo(tarjetaOrigenId: string, monto: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const now = new Date();
  const fecha = now.toISOString().split('T')[0];
  const hora = now.toTimeString().substring(0, 8);

  const { error } = await supabase.rpc('traspaso_debito_efectivo', {
    p_tarjeta_origen_id: tarjetaOrigenId,
    p_tarjeta_destino_id: null,
    p_monto: monto,
    p_fecha: fecha,
    p_hora: hora,
    p_categoria: 'Traspaso',
    p_comercio: 'Retiro ATM'
  });

  if (error) throw error;
}
