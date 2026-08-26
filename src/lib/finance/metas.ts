/**
 * Lógica de negocio: proyección de metas de ahorro.
 * Implementa: API_Contract.md §3 (progreso + proyección).
 * El algoritmo de interés compuesto es el mismo que v1.0 GAS — trasladado a TypeScript.
 * agents.md: lógica de negocio en lib/finance/, no persiste resultados en DB.
 */

import type { MetaRow, MetaConEstado } from '@/lib/types';

/** Formatea Date a YYYY-MM-DD */
function toISODate(date: Date): string {
  return date.toISOString().substring(0, 10);
}

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
  hoy: Date = new Date(),
): MetaConEstado {
  const costoObjetivo   = Number(meta.costo_objetivo);
  const montoActual     = Number(meta.monto_actual);
  const rendimientoAnual = Number(meta.rendimiento_anual);

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
    // Sin rendimiento
    mesesSinRendimiento = Math.ceil(faltante / aporteMensual);

    // Con rendimiento compuesto mensual
    const tasaMensual = rendimientoAnual > 0
      ? Math.pow(1 + rendimientoAnual / 100, 1 / 12) - 1
      : 0;

    let acum = montoActual;
    let meses = 0;
    while (acum < costoObjetivo && meses < 600) {
      acum = acum * (1 + tasaMensual) + aporteMensual;
      meses++;
    }
    if (meses < 600) {
      mesesConRendimiento = meses;
      const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + meses, hoy.getDate());
      fechaEstimada = toISODate(fechaFin);
    }
  }

  return {
    id:               meta.id,
    nombre:           meta.nombre,
    costoObjetivo,
    montoActual,
    rendimientoAnual,
    progreso,
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
  hoy: Date = new Date(),
): MetaConEstado[] {
  return metas.map((m) => calcularEstadoMeta(m, hoy));
}
