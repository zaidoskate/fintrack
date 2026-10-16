import { createClient } from '@/lib/supabase/client';
import type { CuentaPorCobrar } from '@/lib/types';
import { crearMovimiento } from './movimientos';

export async function getCuentasPorCobrar(): Promise<CuentaPorCobrar[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cuentas_por_cobrar')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    movimientoId: row.movimiento_id,
    deudor: row.deudor,
    concepto: row.concepto,
    montoTotal: Number(row.monto_total),
    montoSaldado: Number(row.monto_saldado),
    estado: row.estado as 'pendiente' | 'saldado',
    fecha: row.fecha
  }));
}

export async function saldarCuentaPorCobrar({
  cuentaId,
  montoSaldar,
  tarjetaDestinoId
}: {
  cuentaId: string;
  montoSaldar: number;
  tarjetaDestinoId: string | null;
}) {
  const supabase = createClient();

  // 1. Fetch current cuenta
  const { data: cuenta, error: errFetch } = await supabase
    .from('cuentas_por_cobrar')
    .select('*')
    .eq('id', cuentaId)
    .single();

  if (errFetch || !cuenta) throw new Error('Cuenta no encontrada');

  const nuevoSaldado = Number(cuenta.monto_saldado) + montoSaldar;
  const nuevoEstado = nuevoSaldado >= Number(cuenta.monto_total) ? 'saldado' : 'pendiente';

  // 2. Insertar movimiento de Cobro de deuda
  await crearMovimiento({
    fecha: new Date().toISOString().substring(0, 10),
    tipo: 'Ingreso',
    monto: montoSaldar,
    categoria: 'Cobro de deuda',
    comercio: `Pago de ${cuenta.deudor} (${cuenta.concepto})`,
    tarjetaId: tarjetaDestinoId
  });

  // 3. Update cuenta
  const { error: errUpdate } = await supabase
    .from('cuentas_por_cobrar')
    .update({
      monto_saldado: nuevoSaldado,
      estado: nuevoEstado
    })
    .eq('id', cuentaId);

  if (errUpdate) throw errUpdate;
}

export async function asumirDeudaCompleta({ cuentaId, movimientoId }: { cuentaId: string; movimientoId: string | null }) {
  const supabase = createClient();
  
  if (movimientoId) {
    const { error: errUpdateMov } = await supabase
      .from('movimientos')
      .update({ monto_propio: null })
      .eq('id', movimientoId);
      
    if (errUpdateMov) throw errUpdateMov;
  }
  
  const { error: errDelete } = await supabase
    .from('cuentas_por_cobrar')
    .delete()
    .eq('id', cuentaId);
    
  if (errDelete) throw errDelete;
}
