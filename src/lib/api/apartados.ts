import { createClient } from '@/lib/supabase/client';
import type { ApartadoRow } from '@/lib/types';

export interface NuevoApartadoInput {
  tarjeta_id: string;
  nombre: string;
  rendimiento_anual: number;
}

export async function crearApartado(input: NuevoApartadoInput): Promise<ApartadoRow> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  const { data, error } = await supabase
    .from('tarjeta_apartados')
    .insert({
      user_id: user.id,
      tarjeta_id: input.tarjeta_id,
      nombre: input.nombre,
      rendimiento_anual: input.rendimiento_anual,
      balance_inicial: 0,
      interes_acumulado: 0,
      ultima_actualizacion: new Date().toISOString().split('T')[0]
    })
    .select()
    .single<ApartadoRow>();

  if (error) throw error;
  return data;
}

export async function moverDineroApartado(id: string, montoDelta: number): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase.rpc('mover_dinero_apartado', {
    p_id: id,
    p_monto_delta: montoDelta
  });

  if (error) throw error;
}

export async function eliminarApartado(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tarjeta_apartados').delete().eq('id', id);
  if (error) throw error;
}
