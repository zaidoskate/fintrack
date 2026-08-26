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
    metodoPago: row.metodo_pago,
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
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })
    .limit(limit);

  if (filtros.desde) query = query.gte('fecha', filtros.desde);
  if (filtros.hasta) query = query.lte('fecha', filtros.hasta);
  if (filtros.metodoPago) query = query.eq('metodo_pago', filtros.metodoPago);
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo);

  const { data, error } = await query.returns<MovimientoRow[]>();
  if (error) throw error;

  return (data ?? []).map(rowToMovimiento);
}

// ── Escritura ─────────────────────────────────────────────────────────────────

export interface NuevoMovimientoInput {
  fecha?: string;      // YYYY-MM-DD — default: hoy
  hora?: string;       // HH:MM — default: ahora
  tipo: 'Gasto' | 'Ingreso';
  monto: number;
  categoria?: string;
  comercio?: string;
  metodoPago?: string;
}

/** Crea un movimiento para el usuario autenticado. */
export async function crearMovimiento(input: NuevoMovimientoInput): Promise<Movimiento> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const hoy = new Date();
  const fechaHoy = hoy.toISOString().substring(0, 10);
  const horaAhora = hoy.toTimeString().substring(0, 8); // HH:MM:SS

  const { data, error } = await supabase
    .from('movimientos')
    .insert({
      user_id:    user.id,
      fecha:      input.fecha      ?? fechaHoy,
      hora:       input.hora       ?? horaAhora,
      tipo:       input.tipo,
      monto:      input.monto,
      categoria:  input.categoria  ?? 'Sin categoría',
      comercio:   input.comercio   ?? 'N/A',
      metodo_pago: input.metodoPago ?? 'Efectivo',
    })
    .select()
    .single<MovimientoRow>();

  if (error) throw error;
  return rowToMovimiento(data);
}

/** Actualiza campos de un movimiento existente (RLS valida que pertenezca al usuario). */
export async function editarMovimiento(
  id: string,
  campos: Partial<NuevoMovimientoInput>,
): Promise<Movimiento> {
  const supabase = createClient();

  const patch: Record<string, unknown> = {};
  if (campos.fecha      !== undefined) patch.fecha       = campos.fecha;
  if (campos.hora       !== undefined) patch.hora        = campos.hora;
  if (campos.tipo       !== undefined) patch.tipo        = campos.tipo;
  if (campos.monto      !== undefined) patch.monto       = campos.monto;
  if (campos.categoria  !== undefined) patch.categoria   = campos.categoria;
  if (campos.comercio   !== undefined) patch.comercio    = campos.comercio;
  if (campos.metodoPago !== undefined) patch.metodo_pago = campos.metodoPago;

  const { data, error } = await supabase
    .from('movimientos')
    .update(patch)
    .eq('id', id)
    .select()
    .single<MovimientoRow>();

  if (error) throw error;
  return rowToMovimiento(data);
}

/** Elimina un movimiento (H3: control y libertad del usuario). */
export async function eliminarMovimiento(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('movimientos').delete().eq('id', id);
  if (error) throw error;
}
