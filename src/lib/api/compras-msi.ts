/**
 * lib/api/compras-msi.ts — CRUD de compras a meses sin intereses.
 * Implementa: API_Contract.md §4, SRS FR-26 a FR-31.
 * agents.md regla 7: las compras MSI NUNCA generan fila en movimientos.
 */
import { createClient } from '@/lib/supabase/client';
import type { CompraMSI, CompraMSIRow } from '@/lib/types';

function rowToCompraMSI(row: CompraMSIRow, hoy: Date = new Date()): CompraMSI {
  const ultimaCuota = new Date(row.fecha_ultima_cuota + 'T00:00:00');
  const primerCargo = new Date(row.fecha_primer_cargo + 'T00:00:00');

  // Meses restantes: meses entre hoy y fecha_ultima_cuota (redondeado hacia arriba)
  const diffMs = ultimaCuota.getTime() - hoy.getTime();
  const mesesRestantes = Math.max(0, Math.ceil(diffMs / (30.44 * 86_400_000)));

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

  const hoyStr = new Date().toISOString().substring(0, 10);
  const primerCargo = input.fechaPrimerCargo ?? hoyStr;
  const fechaUltimaCuota = calcFechaUltimaCuota(primerCargo, input.mesesTotales);

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
      fecha_primer_cargo: primerCargo,
      fecha_ultima_cuota: fechaUltimaCuota,
    })
    .select()
    .single<CompraMSIRow>();

  if (error) throw error;
  return rowToCompraMSI(data);
}

export async function eliminarCompraMSI(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('compras_msi').delete().eq('id', id);
  if (error) throw error;
}
