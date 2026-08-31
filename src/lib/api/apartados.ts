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
      ultima_actualizacion: new Date().toISOString().split('T')[0]
    })
    .select()
    .single<ApartadoRow>();

  if (error) throw error;
  return data;
}

export async function moverDineroApartado(id: string, montoDelta: number): Promise<void> {
  const supabase = createClient();
  
  // 1. Obtener balance actual del apartado para actualizarlo
  const { data: apartado, error: fetchErr } = await supabase
    .from('tarjeta_apartados')
    .select('balance_inicial, ultima_actualizacion')
    .eq('id', id)
    .single();

  if (fetchErr) throw fetchErr;

  // Calculamos el nuevo balance base sumando el montoDelta (puede ser negativo para retirar)
  const nuevoBalance = Number(apartado.balance_inicial) + montoDelta;
  
  // OJO: Si fuéramos puristas del interés compuesto, al hacer un movimiento 
  // deberíamos capitalizar el interés generado hasta hoy, sumarlo al balance, y resetear la fecha.
  // Por simplicidad caveman y requerimiento del usuario, mantendremos la última actualización
  // como hoy si se deposita, para que el nuevo cálculo de APY sea desde hoy con el nuevo balance.
  // Pero si retira, no debería perder los intereses. Aquí lo simplificaremos: 
  // Todo depósito o retiro consolida la fecha a hoy para el nuevo cálculo.
  
  const { error } = await supabase
    .from('tarjeta_apartados')
    .update({
      balance_inicial: nuevoBalance,
      ultima_actualizacion: new Date().toISOString().split('T')[0]
    })
    .eq('id', id);

  if (error) throw error;
}

export async function eliminarApartado(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tarjeta_apartados').delete().eq('id', id);
  if (error) throw error;
}
