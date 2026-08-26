/**
 * API de metas: CRUD contra Supabase.
 * Implementa: API_Contract.md §3, agents.md regla 7.
 *
 * REGLA CRÍTICA (agents.md regla 7):
 * - Aportar a una meta → solo actualiza `metas.monto_actual`.
 * - NUNCA genera una fila en `movimientos`.
 */

import { createClient } from '@/lib/supabase/client';
import { calcularEstadoMetas } from '@/lib/finance/metas';
import type { MetaRow, MetaConEstado } from '@/lib/types';

// ── Lectura ───────────────────────────────────────────────────────────────────

/**
 * Obtiene todas las metas del usuario con progreso y proyección calculados.
 * RLS filtra automáticamente por usuario autenticado.
 */
export async function getMetas(): Promise<MetaConEstado[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .order('created_at', { ascending: true })
    .returns<MetaRow[]>();

  if (error) throw error;
  return calcularEstadoMetas(data ?? []);
}

// ── Escritura ─────────────────────────────────────────────────────────────────

export interface NuevaMetaInput {
  nombre: string;
  costoObjetivo: number;
  montoActual?: number;
  rendimientoAnual?: number;
}

/** Crea una meta de ahorro para el usuario autenticado. */
export async function crearMeta(input: NuevaMetaInput): Promise<MetaConEstado> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const { data, error } = await supabase
    .from('metas')
    .insert({
      user_id:            user.id,
      nombre:             input.nombre,
      costo_objetivo:     input.costoObjetivo,
      monto_actual:       input.montoActual      ?? 0,
      rendimiento_anual:  input.rendimientoAnual ?? 0,
    })
    .select()
    .single<MetaRow>();

  if (error) throw error;
  return calcularEstadoMetas([data])[0];
}

/**
 * Registra un aporte a una meta — actualiza SOLO `monto_actual`.
 * agents.md regla 7: NUNCA genera fila en `movimientos`.
 */
export async function aportarMeta(id: string, monto: number): Promise<MetaConEstado> {
  if (monto <= 0) throw new Error('El monto del aporte debe ser positivo.');
  const supabase = createClient();

  // Primero obtenemos el valor actual para sumar (RLS garantiza que es del usuario)
  const { data: actual, error: fetchError } = await supabase
    .from('metas')
    .select('monto_actual')
    .eq('id', id)
    .single<Pick<MetaRow, 'monto_actual'>>();

  if (fetchError) throw fetchError;

  const nuevoMonto = Number(actual.monto_actual) + monto;

  const { data, error } = await supabase
    .from('metas')
    .update({ monto_actual: nuevoMonto })
    .eq('id', id)
    .select()
    .single<MetaRow>();

  if (error) throw error;
  return calcularEstadoMetas([data])[0];
}

/** Edita campos de una meta existente. */
export async function editarMeta(
  id: string,
  campos: Partial<NuevaMetaInput>,
): Promise<MetaConEstado> {
  const supabase = createClient();

  const patch: Record<string, unknown> = {};
  if (campos.nombre             !== undefined) patch.nombre             = campos.nombre;
  if (campos.costoObjetivo      !== undefined) patch.costo_objetivo     = campos.costoObjetivo;
  if (campos.montoActual        !== undefined) patch.monto_actual       = campos.montoActual;
  if (campos.rendimientoAnual   !== undefined) patch.rendimiento_anual  = campos.rendimientoAnual;

  const { data, error } = await supabase
    .from('metas')
    .update(patch)
    .eq('id', id)
    .select()
    .single<MetaRow>();

  if (error) throw error;
  return calcularEstadoMetas([data])[0];
}

/** Elimina una meta. */
export async function eliminarMeta(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('metas').delete().eq('id', id);
  if (error) throw error;
}
