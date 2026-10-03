/**
 * Lógica de negocio: proyección de metas de ahorro.
 * Implementa: API_Contract.md §3 (progreso + proyección).
 * El algoritmo de interés compuesto es el mismo que v1.0 GAS — trasladado a TypeScript.
 * agents.md: lógica de negocio en lib/finance/, no persiste resultados en DB.
 */

import type { MetaRow, MetaAporteRow, TarjetaRow, ApartadoRow, MetaConEstado, MetaAporte } from '@/lib/types';

/** Formatea Date a YYYY-MM-DD */
function toISODate(date: Date): string {
  return date.toISOString().substring(0, 10);
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calcula el estado completo de una meta de ahorro.
 *
 * Proyección:
 * - Sin rendimiento: meses = ceil(faltante / aporteMensual)
 * - Con rendimiento: interés compuesto mensual, iteración mes a mes
 *
 * @param meta          Fila de la tabla `metas`.
 * @param hoy           Fecha de referencia.
 */
export function calcularEstadoMeta(
  meta: MetaRow,
  aportesRow: MetaAporteRow[],
  tarjetas: TarjetaRow[],
  apartados: ApartadoRow[],
  hoy: Date = new Date(),
): MetaConEstado {
  const costoObjetivo = Number(meta.costo_objetivo);
  let capitalAportado = 0;
  let rendimientoGenerado = 0;

  const hoyTime = hoy.getTime();

  // Procesar cada aporte
  const aportes: MetaAporte[] = aportesRow.map(row => {
    const monto = Number(row.monto);
    capitalAportado += monto;

    let rendAporte = 0;
    const tarjeta = tarjetas.find(t => t.id === row.tarjeta_origen_id);
    const apartado = row.apartado_id ? apartados.find(a => a.id === row.apartado_id) : null;
    
    // El rendimiento viene del apartado, si no tiene apartado, vemos si la tarjeta base tiene rendimiento
    const tasa = apartado ? Number(apartado.rendimiento_anual) : (tarjeta ? Number(tarjeta.rendimiento_anual) : 0);
    
    if (tasa > 0) {
      const fechaAporte = new Date(row.fecha + 'T00:00:00').getTime();
      const dias = Math.max(0, Math.floor((hoyTime - fechaAporte) / MS_PER_DAY));
      const tasaAnual = tasa / 100;
      // Fórmula de interés compuesto diario
      const montoConInteres = monto * Math.pow(1 + (tasaAnual / 365), dias);
      rendAporte = montoConInteres - monto;
    }

    rendimientoGenerado += rendAporte;

    return {
      id: row.id,
      metaId: row.meta_id,
      monto,
      fecha: row.fecha,
      tarjetaOrigenId: row.tarjeta_origen_id,
      tarjetaOrigenNombre: tarjeta?.nombre,
      apartadoId: row.apartado_id || null,
      apartadoNombre: apartado?.nombre,
      rendimientoGenerado: rendAporte
    };
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const montoActual = capitalAportado + rendimientoGenerado;

  const progreso = costoObjetivo > 0
    ? Math.round((montoActual / costoObjetivo) * 1000) / 10
    : 0;

  const faltante = costoObjetivo - montoActual;

  let aporteMensual = 0;
  let mesesSinRendimiento: number | null = null;
  let mesesConRendimiento: number | null = null;
  let fechaEstimada: string | null = null;

  if (meta.fecha_objetivo) {
    const fechaObj = new Date(meta.fecha_objetivo + 'T00:00:00');
    const diffTime = Math.max(0, fechaObj.getTime() - hoyTime);
    const mesesRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    
    if (mesesRestantes > 0 && faltante > 0) {
      aporteMensual = faltante / mesesRestantes;
      mesesSinRendimiento = mesesRestantes;
      mesesConRendimiento = mesesRestantes;
      fechaEstimada = meta.fecha_objetivo;
    } else if (faltante > 0) {
      aporteMensual = faltante;
      mesesSinRendimiento = 1;
      mesesConRendimiento = 1;
      fechaEstimada = meta.fecha_objetivo;
    }
  } else {
    if (aportes.length > 0) {
      const primerAporte = aportes[aportes.length - 1].fecha; // sorted desc
      const fechaPrimer = new Date(primerAporte + 'T00:00:00').getTime();
      const diffTime = Math.max(0, hoyTime - fechaPrimer);
      const mesesTranscurridos = Math.max(1, diffTime / (1000 * 60 * 60 * 24 * 30.44));
      aporteMensual = capitalAportado / mesesTranscurridos;
    }

    if (aporteMensual > 0 && faltante > 0) {
      mesesSinRendimiento = Math.ceil(faltante / aporteMensual);
      mesesConRendimiento = mesesSinRendimiento;
      const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + mesesSinRendimiento, hoy.getDate());
      fechaEstimada = toISODate(fechaFin);
    }
  }

  return {
    id:               meta.id,
    nombre:           meta.nombre,
    costoObjetivo,
    fechaObjetivo:    meta.fecha_objetivo || undefined,
    montoActual,
    capitalAportado,
    rendimientoGenerado,
    progreso,
    aportes,
    proyeccion: {
      aportesMensualesPromedio:         aporteMensual,
      mesesEstimadosSinRendimiento:     mesesSinRendimiento,
      mesesEstimadosConRendimiento:     mesesConRendimiento,
      fechaEstimadaCumplimiento:        fechaEstimada,
    },
  };
}

export function calcularEstadoMetas(
  metas: MetaRow[],
  aportes: MetaAporteRow[],
  tarjetas: TarjetaRow[],
  apartados: ApartadoRow[],
  hoy: Date = new Date(),
): MetaConEstado[] {
  return metas.map((m) => {
    const aportesDeMeta = aportes.filter(a => a.meta_id === m.id);
    return calcularEstadoMeta(m, aportesDeMeta, tarjetas, apartados, hoy);
  });
}
