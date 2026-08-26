/**
 * Lógica de negocio: cálculo del termómetro de crédito y periodos de tarjeta.
 * Implementa: Architecture.md §5 (cálculo en TypeScript, no en SQL),
 *             Architecture.md §7 de v1.0 (lógica de clamp de periodos — vigente en v2.0).
 * agents.md: lógica de negocio en lib/finance/, no en componentes ni en SQL.
 *
 * REGLA DE ORO (UX/UI H4): los valores 'verde' | 'amarillo' | 'rojo' que produce
 * este módulo son EXCLUSIVOS del termómetro de crédito. Nunca reutilizarlos
 * para categorías de gasto u otro propósito.
 */

import type {
  TarjetaRow,
  MovimientoRow,
  CompraMSIRow,
  TarjetaConEstado,
} from '@/lib/types';

// ── Umbrales del semáforo (Architecture.md §5, UX/UI Heuristics H4) ──────────
const UMBRAL_VERDE = 30;   // ≤ 30% → verde "Rango ideal"
const UMBRAL_ROJO  = 71;   // ≥ 71% → rojo "Te excediste" / "Límite casi alcanzado"

// ── Cálculo de periodos (Architecture.md v1.0 §7, trasladado a TypeScript) ───

interface Periodo {
  inicio: Date;
  fin: Date;
  proximoCorte: Date;
}

/**
 * Calcula el periodo de corte vigente para una tarjeta.
 * Clampea el día de corte al último día del mes cuando el mes tiene menos días.
 * Ej: corte día 31 en febrero → usa el último día de febrero.
 *
 * @param diaCorte  Día del mes de corte (1-31), tal como está en la tabla `tarjetas`.
 * @param hoy       Fecha de referencia (normalmente `new Date()`).
 */
export function getPeriodoVigente(diaCorte: number, hoy: Date): Periodo {
  const y = hoy.getFullYear();
  const m = hoy.getMonth(); // 0-indexed
  const d = hoy.getDate();

  /** Clampea `day` al último día del mes (year, month0) */
  function clamp(year: number, month0: number, day: number): number {
    const lastDay = new Date(year, month0 + 1, 0).getDate();
    return Math.min(day, lastDay);
  }

  const corteEsteMes = clamp(y, m, diaCorte);

  let inicio: Date;
  let fin: Date;
  let proximoCorte: Date;

  if (d < corteEsteMes) {
    // El corte aún no ha ocurrido este mes → el periodo arrancó el mes anterior
    const prevM = m === 0 ? 11 : m - 1;
    const prevY = m === 0 ? y - 1 : y;
    inicio       = new Date(prevY, prevM, clamp(prevY, prevM, diaCorte));
    fin          = new Date(y, m, corteEsteMes - 1, 23, 59, 59, 999);
    proximoCorte = new Date(y, m, corteEsteMes);
  } else {
    // Ya cortó este mes → periodo activo arrancó hoy o antes del corte
    const nextM = m === 11 ? 0 : m + 1;
    const nextY = m === 11 ? y + 1 : y;
    inicio       = new Date(y, m, corteEsteMes);
    fin          = new Date(nextY, nextM, clamp(nextY, nextM, diaCorte) - 1, 23, 59, 59, 999);
    proximoCorte = new Date(nextY, nextM, clamp(nextY, nextM, diaCorte));
  }

  return { inicio, fin, proximoCorte };
}

/**
 * Calcula la fecha del próximo pago a partir del próximo corte.
 * Si diaPago <= diaCorte, el pago cae en el mes siguiente al corte.
 */
export function calcProximoPago(proximoCorte: Date, diaPago: number): Date {
  const m = proximoCorte.getMonth();
  const y = proximoCorte.getFullYear();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const dia = Math.min(diaPago, lastDay);
  let proxP = new Date(y, m, dia);

  if (proxP <= proximoCorte) {
    const nm = m === 11 ? 0 : m + 1;
    const ny = m === 11 ? y + 1 : y;
    const ld = new Date(ny, nm + 1, 0).getDate();
    proxP = new Date(ny, nm, Math.min(diaPago, ld));
  }
  return proxP;
}

/** Formatea un Date como YYYY-MM-DD sin conversión de zona horaria */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Diferencia en días (redondeada hacia arriba) */
function diffDias(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86_400_000);
}

// ── Clasificación del semáforo ────────────────────────────────────────────────

function clasificarEstado(porcentajeUso: number): {
  estadoTermometro: 'verde' | 'amarillo' | 'rojo';
  etiquetaEstado: string;
} {
  if (porcentajeUso <= UMBRAL_VERDE) {
    return { estadoTermometro: 'verde', etiquetaEstado: 'Rango ideal' };
  }
  if (porcentajeUso < UMBRAL_ROJO) {
    return { estadoTermometro: 'amarillo', etiquetaEstado: 'Aún puedes gastar' };
  }
  // H2: usar exactamente las etiquetas definidas por el usuario
  if (porcentajeUso >= 100) {
    return { estadoTermometro: 'rojo', etiquetaEstado: 'Te excediste' };
  }
  return { estadoTermometro: 'rojo', etiquetaEstado: 'Límite casi alcanzado' };
}

// ── Cálculo principal del estado de una tarjeta (Architecture.md §5) ─────────

/**
 * Calcula el estado completo de una tarjeta combinando movimientos y compras MSI.
 * Este cálculo se hace en tiempo real, nunca se persiste en la DB.
 *
 * @param tarjeta     Fila de la tabla `tarjetas`.
 * @param movimientos Todos los movimientos del usuario (se filtra internamente por tarjeta y periodo).
 * @param comprasMSI  Todas las compras MSI del usuario (se filtra internamente).
 * @param hoy         Fecha de referencia.
 */
export function calcularEstadoTarjeta(
  tarjeta: TarjetaRow,
  movimientos: MovimientoRow[],
  comprasMSI: CompraMSIRow[],
  hoy: Date = new Date(),
): TarjetaConEstado {
  const periodo = getPeriodoVigente(tarjeta.dia_corte, hoy);

  // Gastos de movimientos normales dentro del periodo y con la tarjeta correcta
  const gastosMovimientos = movimientos
    .filter((mov) => {
      if (mov.tipo !== 'Gasto') return false;
      if (mov.metodo_pago.toLowerCase() !== tarjeta.nombre.toLowerCase()) return false;
      const fecha = new Date(mov.fecha + 'T00:00:00');
      return fecha >= periodo.inicio && fecha <= periodo.fin;
    })
    .reduce((sum, mov) => sum + Number(mov.monto), 0);

  // Cuotas MSI activas hoy para esta tarjeta (Architecture.md §5)
  const gastosMSI = comprasMSI
    .filter((msi) => {
      if (msi.tarjeta_id !== tarjeta.id) return false;
      const primerCargo = new Date(msi.fecha_primer_cargo + 'T00:00:00');
      const ultimaCuota = new Date(msi.fecha_ultima_cuota + 'T00:00:00');
      return hoy >= primerCargo && hoy <= ultimaCuota;
    })
    .reduce((sum, msi) => sum + Number(msi.cuota_mensual), 0);

  const gastosPeriodoActual = Math.round((gastosMovimientos + gastosMSI) * 100) / 100;
  const limite = Number(tarjeta.limite);
  const disponible = Math.round((limite - gastosPeriodoActual) * 100) / 100;
  const porcentajeUso = limite > 0
    ? Math.round((gastosPeriodoActual / limite) * 1000) / 10
    : 0;

  const { estadoTermometro, etiquetaEstado } = clasificarEstado(porcentajeUso);

  const proxCorte = periodo.proximoCorte;
  const proxPago  = calcProximoPago(proxCorte, tarjeta.dia_pago);

  return {
    id:                  tarjeta.id,
    nombre:              tarjeta.nombre,
    limite,
    diaCorte:            tarjeta.dia_corte,
    diaPago:             tarjeta.dia_pago,
    gastosPeriodoActual,
    disponible,
    porcentajeUso,
    estadoTermometro,
    etiquetaEstado,
    proximoCorte:        toISODate(proxCorte),
    proximoPago:         toISODate(proxPago),
    diasParaPago:        diffDias(hoy, proxPago),
  };
}

/**
 * Calcula el estado de todas las tarjetas de una vez.
 * Uso: lib/api/tarjetas.ts → getTarjetas()
 */
export function calcularEstadoTarjetas(
  tarjetas: TarjetaRow[],
  movimientos: MovimientoRow[],
  comprasMSI: CompraMSIRow[],
  hoy: Date = new Date(),
): TarjetaConEstado[] {
  return tarjetas.map((t) => calcularEstadoTarjeta(t, movimientos, comprasMSI, hoy));
}

/** Umbrales exportados para que el cliente pueda replicar el semáforo (Architecture.md §3.3) */
export const UMBRALES = {
  verde:    { max: UMBRAL_VERDE },
  amarillo: { min: UMBRAL_VERDE + 1, max: UMBRAL_ROJO - 1 },
  rojo:     { min: UMBRAL_ROJO },
} as const;
