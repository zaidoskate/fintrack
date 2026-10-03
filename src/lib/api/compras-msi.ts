/**
 * lib/api/compras-msi.ts — CRUD de compras a meses sin intereses.
 * Implementa: API_Contract.md §4, SRS FR-26 a FR-31.
 * agents.md regla 7: las compras MSI NUNCA generan fila en movimientos.
 */
import { createClient } from '@/lib/supabase/client';
import type { CompraMSI, CompraMSIRow } from '@/lib/types';

function rowToCompraMSI(row: CompraMSIRow, hoy: Date = new Date()): CompraMSI {
  const primerCargo = new Date(row.fecha_primer_cargo + 'T00:00:00');
  
  const m = hoy.getMonth();
  const y = hoy.getFullYear();
  const mPrimer = primerCargo.getMonth();
  const yPrimer = primerCargo.getFullYear();
  
  // Meses transcurridos calendario
  const mesesTranscurridos = (y - yPrimer) * 12 + (m - mPrimer);
  
  // Si hoy es antes del primer cargo, transcurridos es 0, si ya pasó el mes es >0.
  const cuotasCobradasCronologicas = Math.max(0, mesesTranscurridos + 1); // +1 porque el mes del primer cargo es la cuota 1
  
  const mesesAdelantados = row.meses_adelantados ?? 0;
  
  // Restantes = totales - cobradas por tiempo - adelantadas
  const mesesRestantes = Math.max(0, row.meses_totales - cuotasCobradasCronologicas - mesesAdelantados);

  return {
    id:               row.id,
    tarjetaId:        row.tarjeta_id,
    fechaCompra:      row.fecha_compra,
    comercio:         row.comercio,
    categoria:        row.categoria,
    montoTotal:       Number(row.monto_total),
    mesesTotales:     row.meses_totales,
    cuotaMensual:     Number(row.cuota_mensual),
    fechaPrimerCargo: row.fecha_primer_cargo,
    fechaUltimaCuota: row.fecha_ultima_cuota,
    mesesAdelantados,
    descuentoPorAdelanto: Number(row.descuento_por_adelanto ?? 0),
    mesesRestantes,
  };

  void primerCargo; // solo para suprimir warning de variable no usada
}

/** Todas las compras MSI del usuario, opcionalmente filtradas por tarjeta. */
export async function getComprasMSI(tarjetaId?: string): Promise<CompraMSI[]> {
  const supabase = createClient();
  let query = supabase
    .from('compras_msi')
    .select('*')
    .order('fecha_compra', { ascending: false });

  if (tarjetaId) query = query.eq('tarjeta_id', tarjetaId);

  const { data, error } = await query.returns<CompraMSIRow[]>();
  if (error) throw error;


  const hoy = new Date();
  return (data ?? []).map((r) => rowToCompraMSI(r, hoy));
}

export interface NuevaCompraMSIInput {
  tarjetaId: string;
  comercio: string;
  categoria?: string;
  montoTotal: number;
  mesesTotales: number;
  fechaPrimerCargo?: string; // YYYY-MM-DD, default hoy
}

/** Calcula fecha_ultima_cuota con clamp de fin de mes (FR-28). */
function calcFechaUltimaCuota(primerCargo: string, meses: number): string {
  const base = new Date(primerCargo + 'T00:00:00');
  const targetMonth0 = base.getMonth() + (meses - 1);
  const targetYear   = base.getFullYear() + Math.floor(targetMonth0 / 12);
  const normalMonth0 = ((targetMonth0 % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalMonth0 + 1, 0).getDate();
  const dia = Math.min(base.getDate(), lastDay);
  return `${targetYear}-${String(normalMonth0 + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
}

export async function crearCompraMSI(input: NuevaCompraMSIInput): Promise<CompraMSI> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');

  // Obtener la tarjeta para saber el día de corte
  const { data: tarjeta } = await supabase.from('tarjetas').select('dia_corte').eq('id', input.tarjetaId).single();
  const diaCorte = tarjeta?.dia_corte || 1;

  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const d = hoy.getDate();

  const lastDay = new Date(y, m + 1, 0).getDate();
  const corteEsteMes = Math.min(diaCorte, lastDay);

  let primerCargoCalculado = new Date(y, m, corteEsteMes);
  // Si compramos antes del corte, entra en el corte de ESTE mes.
  // Si compramos el mismo día o después, entra en el corte del PRÓXIMO mes.
  if (d >= corteEsteMes) {
    const nextM = m === 11 ? 0 : m + 1;
    const nextY = m === 11 ? y + 1 : y;
    const ld = new Date(nextY, nextM + 1, 0).getDate();
    primerCargoCalculado = new Date(nextY, nextM, Math.min(diaCorte, ld));
  }

  const hoyStr = hoy.toISOString().substring(0, 10);
  const primerCargoStr = input.fechaPrimerCargo ?? primerCargoCalculado.toISOString().substring(0, 10);
  const fechaUltimaCuota = calcFechaUltimaCuota(primerCargoStr, input.mesesTotales);

  const { data, error } = await supabase
    .from('compras_msi')
    .insert({
      user_id:            user.id,
      tarjeta_id:         input.tarjetaId,
      comercio:           input.comercio,
      categoria:          input.categoria ?? 'Sin categoría',
      monto_total:        input.montoTotal,
      meses_totales:      input.mesesTotales,
      fecha_compra:       hoyStr,
      fecha_primer_cargo: primerCargoStr,
      fecha_ultima_cuota: fechaUltimaCuota,
      meses_adelantados:  0,
      descuento_por_adelanto: 0,
    })
    .select()
    .single<CompraMSIRow>();

  if (error) throw error;
  return rowToCompraMSI(data);
}

export async function adelantarCompraMSI(id: string, mesesAdelantados: number, descuento: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('adelantar_compra_msi', {
    p_id: id,
    p_meses: mesesAdelantados,
    p_descuento: descuento
  });

  if (error) throw error;
}

export async function eliminarCompraMSI(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('compras_msi').delete().eq('id', id);
  if (error) throw error;
}
