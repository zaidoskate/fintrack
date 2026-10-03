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
import { moverDineroApartado } from '@/lib/api/apartados';
import type { MetaRow, MetaAporteRow, TarjetaRow, ApartadoRow, MetaConEstado } from '@/lib/types';

// ── Lectura ───────────────────────────────────────────────────────────────────

export async function getMetas(): Promise<MetaConEstado[]> {
  const supabase = createClient();

  const { data: metasData, error } = await supabase
    .from('metas')
    .select('*, meta_aportes(*, tarjetas!tarjeta_origen_id(id, nombre, rendimiento_anual), tarjeta_apartados!apartado_id(id, nombre, rendimiento_anual))')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const metas: MetaRow[] = [];
  const aportes: MetaAporteRow[] = [];
  const tarjetasMap = new Map<string, TarjetaRow>();
  const apartadosMap = new Map<string, ApartadoRow>();

  for (const m of metasData || []) {
    const { meta_aportes, ...metaData } = m;
    metas.push(metaData as MetaRow);
    if (meta_aportes) {
      for (const ap of (meta_aportes as Array<MetaAporteRow & { tarjetas?: TarjetaRow; tarjeta_apartados?: ApartadoRow }>)) {
        const { tarjetas, tarjeta_apartados, ...apData } = ap;
        aportes.push(apData as MetaAporteRow);
        if (tarjetas && !tarjetasMap.has(tarjetas.id)) tarjetasMap.set(tarjetas.id, tarjetas as TarjetaRow);
        if (tarjeta_apartados && !apartadosMap.has(tarjeta_apartados.id)) apartadosMap.set(tarjeta_apartados.id, tarjeta_apartados as ApartadoRow);
      }
    }
  }

  return calcularEstadoMetas(metas, aportes, Array.from(tarjetasMap.values()), Array.from(apartadosMap.values()));
}

// ── Escritura ─────────────────────────────────────────────────────────────────

export interface NuevaMetaInput {
  nombre: string;
  costoObjetivo: number;
  fechaObjetivo?: string;
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
      fecha_objetivo:     input.fechaObjetivo || null,
    })
    .select()
    .single<MetaRow>();

  if (error) throw error;
  return calcularEstadoMetas([data], [], [], [])[0];
}

/**
 * Registra un aporte a una meta — inserta en `meta_aportes`.
 */
export async function aportarMeta(
  id: string, 
  monto: number, 
  tarjetaId?: string, 
  apartadoId?: string,
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
      tarjeta_origen_id: tarjetaId || null,
      apartado_id: apartadoId || null
    });

  if (error) throw error;

  // Depositar automáticamente en el balance del apartado elegido
  if (apartadoId) {
    await moverDineroApartado(apartadoId, monto);
  }
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
  if (campos.fechaObjetivo      !== undefined) patch.fecha_objetivo     = campos.fechaObjetivo || null;

  const { data, error } = await supabase
    .from('metas')
    .update(patch)
    .eq('id', id)
    .select()
    .single<MetaRow>();

  if (error) throw error;
  
  // Refetch todo en el componente para tener estado actualizado, o retornar dummy si no es crítico:
  return calcularEstadoMetas([data], [], [], [])[0];
}

/** Elimina una meta. */
export async function eliminarMeta(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('metas').delete().eq('id', id);
  if (error) throw error;
}

/** Retiros Parciales en Metas (Soporta emergencias sin borrar histórico) */
export async function retirarDeMeta(id: string, monto: number): Promise<void> {
  if (monto <= 0) throw new Error('El monto del retiro debe ser positivo.');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const { error } = await supabase
    .from('meta_aportes')
    .insert({
      user_id: user.id,
      meta_id: id,
      monto: -monto, // monto negativo para descontar
      fecha: new Date().toISOString().split('T')[0],
      tarjeta_origen_id: null,
      apartado_id: null
    });

  if (error) throw error;
}
