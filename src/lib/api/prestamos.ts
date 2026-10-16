import { createClient } from '@/lib/supabase/client';
import type { Prestamo } from '@/lib/types';

export async function getPrestamos(): Promise<Prestamo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('prestamos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo as Prestamo['tipo'],
    direccion: row.direccion as Prestamo['direccion'],
    montoOriginal: Number(row.monto_original),
    saldoInsoluto: Number(row.saldo_insoluto),
    tasaAnual: Number(row.tasa_anual),
    plazoMesesTotales: row.plazo_meses_totales,
    mesesPagados: row.meses_pagados,
    cuotaMensual: Number(row.cuota_mensual),
    diaPago: row.dia_pago,
    fechaInicio: row.fecha_inicio,
    contacto: row.contacto
  }));
}

export async function crearPrestamo(input: Omit<Prestamo, 'id'>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data, error } = await supabase.from('prestamos').insert({
    user_id: user.id,
    nombre: input.nombre,
    tipo: input.tipo,
    direccion: input.direccion,
    monto_original: input.montoOriginal,
    saldo_insoluto: input.saldoInsoluto,
    tasa_anual: input.tasaAnual,
    plazo_meses_totales: input.plazoMesesTotales,
    meses_pagados: input.mesesPagados,
    cuota_mensual: input.cuotaMensual,
    dia_pago: input.diaPago,
    fecha_inicio: input.fechaInicio,
    contacto: input.contacto || null
  }).select('*').single();

  if (error) throw error;
  return data;
}

export async function actualizarPrestamo({ id, campos }: { id: string; campos: Partial<Prestamo> }) {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (campos.nombre !== undefined) payload.nombre = campos.nombre;
  if (campos.saldoInsoluto !== undefined) payload.saldo_insoluto = campos.saldoInsoluto;
  if (campos.mesesPagados !== undefined) payload.meses_pagados = campos.mesesPagados;
  if (campos.cuotaMensual !== undefined) payload.cuota_mensual = campos.cuotaMensual;
  
  const { data, error } = await supabase
    .from('prestamos')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function eliminarPrestamo(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('prestamos').delete().eq('id', id);
  if (error) throw error;
}
