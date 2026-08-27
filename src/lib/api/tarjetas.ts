/**
 * API de tarjetas: lectura desde Supabase + cálculo del estado del termómetro.
 * Implementa: API_Contract.md §1, Architecture.md §3.2 y §5.
 * agents.md: regla 5 — los componentes no importan supabase directamente.
 *
 * La función principal de lectura (getTarjetas) hace 3 consultas en paralelo
 * (tarjetas, movimientos, compras_msi) y combina el resultado en lib/finance/.
 * El estado calculado (gastos, disponible, %) NO se persiste en DB.
 */

import { createClient } from '@/lib/supabase/client';
import { calcularEstadoTarjetas } from '@/lib/finance/tarjetas';
import type {
  TarjetaRow,
  MovimientoRow,
  CompraMSIRow,
  TarjetaConEstado,
} from '@/lib/types';

// ── Lectura ───────────────────────────────────────────────────────────────────

/**
 * Obtiene todas las tarjetas del usuario autenticado con su estado calculado.
 * Llamar desde Client Components / hooks de TanStack Query.
 * RLS garantiza que solo se devuelven las filas del usuario actual.
 */
export async function getTarjetas(): Promise<TarjetaConEstado[]> {
  const supabase = createClient();

  // Tres consultas en paralelo para minimizar la latencia total
  const [tarjetasRes, movimientosRes, msiRes] = await Promise.all([
    supabase
      .from('tarjetas')
      .select('*')
      .order('created_at', { ascending: true })
      .returns<TarjetaRow[]>(),

    supabase
      .from('movimientos')
      .select('id, fecha, hora, tipo, monto, metodo_pago, categoria, comercio')
      .order('fecha', { ascending: false })
      .limit(2000)           // techo razonable para el cálculo de saldos y periodos
      .returns<MovimientoRow[]>(),

    supabase
      .from('compras_msi')
      .select('id, tarjeta_id, cuota_mensual, fecha_primer_cargo, fecha_ultima_cuota, meses_totales, monto_total')
      .returns<CompraMSIRow[]>(),
  ]);

  if (tarjetasRes.error) throw tarjetasRes.error;
  if (movimientosRes.error) throw movimientosRes.error;
  if (msiRes.error) throw msiRes.error;

  return calcularEstadoTarjetas(
    tarjetasRes.data ?? [],
    movimientosRes.data ?? [],
    msiRes.data ?? [],
  );
}

// ── Escritura ─────────────────────────────────────────────────────────────────

export interface NuevaTarjetaInput {
  nombre: string;
  tipo: 'Crédito' | 'Débito';
  limite: number;
  diaCorte: number | null;
  diaPago: number | null;
  rendimientoAnual?: number;
}

/** Crea una tarjeta para el usuario autenticado. */
export async function crearTarjeta(input: NuevaTarjetaInput): Promise<TarjetaRow> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const { data, error } = await supabase
    .from('tarjetas')
    .insert({
      user_id:   user.id,
      nombre:    input.nombre,
      tipo:      input.tipo,
      limite:    input.limite,
      dia_corte: input.diaCorte,
      dia_pago:  input.diaPago,
      rendimiento_anual: input.rendimientoAnual ?? 0,
    })
    .select()
    .single<TarjetaRow>();

  if (error) throw error;
  return data;
}

/** Actualiza campos de una tarjeta existente (debe pertenecer al usuario — RLS). */
export async function actualizarTarjeta(
  id: string,
  campos: Partial<Omit<NuevaTarjetaInput, never>>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tarjetas')
    .update({
      ...(campos.nombre    !== undefined && { nombre: campos.nombre }),
      ...(campos.tipo      !== undefined && { tipo: campos.tipo }),
      ...(campos.limite    !== undefined && { limite: campos.limite }),
      ...(campos.diaCorte  !== undefined && { dia_corte: campos.diaCorte }),
      ...(campos.diaPago   !== undefined && { dia_pago: campos.diaPago }),
      ...(campos.rendimientoAnual !== undefined && { rendimiento_anual: campos.rendimientoAnual }),
    })
    .eq('id', id);

  if (error) throw error;
}

/** Elimina una tarjeta (ON DELETE CASCADE elimina sus compras_msi asociadas). */
export async function eliminarTarjeta(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tarjetas').delete().eq('id', id);
  if (error) throw error;
}
