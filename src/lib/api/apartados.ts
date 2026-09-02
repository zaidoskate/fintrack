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
  
  // 1. Obtener balance actual y rendimiento del apartado para capitalizarlo
  const { data: apartado, error: fetchErr } = await supabase
    .from('tarjeta_apartados')
    .select('balance_inicial, interes_acumulado, rendimiento_anual, ultima_actualizacion')
    .eq('id', id)
    .single();

  if (fetchErr) throw fetchErr;

  const hoyDate = new Date();
  const hoyT00 = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate()).getTime();
  const fechaAct = new Date(apartado.ultima_actualizacion + 'T00:00:00').getTime();
  const dias = Math.max(0, Math.floor((hoyT00 - fechaAct) / 86_400_000));
  
  const balanceIni = Number(apartado.balance_inicial);
  const interesAcum = Number(apartado.interes_acumulado || 0);
  const tasaAnual = Number(apartado.rendimiento_anual) / 100;
  
  const capitalBase = balanceIni + interesAcum;
  let interesProyectado = 0;
  if (tasaAnual > 0 && dias > 0) {
    const balanceCapitalizado = capitalBase * Math.pow(1 + (tasaAnual / 365), dias);
    interesProyectado = balanceCapitalizado - capitalBase;
  }

  // Calculamos el nuevo balance base sumando SOLO el montoDelta al principal
  const nuevoBalance = balanceIni + montoDelta;
  const nuevoInteres = interesAcum + interesProyectado;
  
  // Hoy en formato YYYY-MM-DD local
  const y = hoyDate.getFullYear();
  const m = String(hoyDate.getMonth() + 1).padStart(2, '0');
  const d = String(hoyDate.getDate()).padStart(2, '0');
  const hoyStr = `${y}-${m}-${d}`;

  const { error } = await supabase
    .from('tarjeta_apartados')
    .update({
      balance_inicial: nuevoBalance,
      interes_acumulado: nuevoInteres,
      ultima_actualizacion: hoyStr
    })
    .eq('id', id);

  if (error) throw error;
}

export async function eliminarApartado(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('tarjeta_apartados').delete().eq('id', id);
  if (error) throw error;
}
