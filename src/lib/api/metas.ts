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
import type { MetaRow, MetaAporteRow, TarjetaRow, MetaConEstado } from '@/lib/types';

// ── Lectura ───────────────────────────────────────────────────────────────────

export async function getMetas(): Promise<MetaConEstado[]> {
  const supabase = createClient();

  const [metasRes, aportesRes, tarjetasRes] = await Promise.all([
    supabase.from('metas').select('*').order('created_at', { ascending: true }).returns<MetaRow[]>(),
    supabase.from('meta_aportes').select('*').returns<MetaAporteRow[]>(),
    supabase.from('tarjetas').select('id, nombre, rendimiento_anual').returns<TarjetaRow[]>()
  ]);

  if (metasRes.error) throw metasRes.error;
  if (aportesRes.error) throw aportesRes.error;
  if (tarjetasRes.error) throw tarjetasRes.error;

  return calcularEstadoMetas(metasRes.data ?? [], aportesRes.data ?? [], tarjetasRes.data ?? []);
}

// ── Escritura ─────────────────────────────────────────────────────────────────

export interface NuevaMetaInput {
  nombre: string;
  costoObjetivo: number;
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
    })
    .select()
    .single<MetaRow>();

  if (error) throw error;
  return calcularEstadoMetas([data], [], [])[0];
}

/**
 * Registra un aporte a una meta — inserta en `meta_aportes`.
 */
export async function aportarMeta(
  id: string, 
  monto: number, 
  tarjetaId?: string, 
  fechaAporte?: string
): Promise<void> {
  if (monto <= 0) throw new Error('El monto del aporte debe ser positivo.');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const { error } = await supabase
    .from('meta_aportes')
    .insert({
      user_id: user.id,
      meta_id: id,
      monto: monto,
      fecha: fechaAporte || new Date().toISOString().split('T')[0],
      tarjeta_origen_id: tarjetaId || null
    });

  if (error) throw error;
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

  const { data, error } = await supabase
    .from('metas')
    .update(patch)
    .eq('id', id)
    .select()
    .single<MetaRow>();

  if (error) throw error;
  
  // Refetch todo en el componente para tener estado actualizado, o retornar dummy si no es crítico:
  return calcularEstadoMetas([data], [], [])[0];
}

/** Elimina una meta. */
export async function eliminarMeta(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('metas').delete().eq('id', id);
  if (error) throw error;
}
