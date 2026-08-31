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

  // La proyección requiere un aporte mensual promedio.
  // En v2.0 no hay tabla de aportes históricos — se deja null por ahora
  // y se completa cuando el usuario ingrese un aporte mensual esperado (FR-backlog).
  // La UI puede mostrar un input "¿Cuánto puedes ahorrar por mes?"
  const aporteMensual = 0; // placeholder hasta FR que agregue el campo

  let mesesSinRendimiento: number | null = null;
  let mesesConRendimiento: number | null = null;
  let fechaEstimada: string | null = null;

  if (aporteMensual > 0 && faltante > 0) {
    mesesSinRendimiento = Math.ceil(faltante / aporteMensual);
    // Para simplificar, la proyección futura usa una tasa promedio de 0% (se puede mejorar después si ligan una tarjeta base a la meta)
    mesesConRendimiento = mesesSinRendimiento;
    const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + mesesSinRendimiento, hoy.getDate());
    fechaEstimada = toISODate(fechaFin);
  }

  return {
    id:               meta.id,
    nombre:           meta.nombre,
    costoObjetivo,
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
