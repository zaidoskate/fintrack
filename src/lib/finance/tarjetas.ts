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
  ApartadoRow,
  ApartadoConEstado,
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
export function calcProximoPago(hoy: Date, diaPago: number): Date {
  const m = hoy.getMonth();
  const y = hoy.getFullYear();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const dia = Math.min(diaPago, lastDay);
  
  let proxP = new Date(y, m, dia);
  const hoyMidnight = new Date(y, m, hoy.getDate());

  if (proxP < hoyMidnight) {
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
    return { estadoTermometro: 'amarillo', etiquetaEstado: 'Controla tus gastos' };
  }
  return { estadoTermometro: 'rojo', etiquetaEstado: 'Cuidado' };
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
  apartadosRow: ApartadoRow[] = [],
  hoy: Date = new Date(),
): TarjetaConEstado {
  // === LÓGICA PARA TARJETA DE DÉBITO ===
  if (tarjeta.tipo === 'Débito') {
    // Para débito, el saldo principal ya viene pre-calculado desde Supabase
    // (limite inicial + ingresos - gastos) vía Triggers.
    let saldo = Number(tarjeta.balance_actual ?? tarjeta.limite ?? 0);

    // Calcular estado de apartados de esta tarjeta
    const apartados: ApartadoConEstado[] = apartadosRow
      .filter(a => a.tarjeta_id === tarjeta.id)
      .map(a => {
        const balanceIni = Number(a.balance_inicial);
        // 1. Usar el interés base guardado + el interés calculado por Postgres al vuelo
        const interesPostgres = Number((a as ApartadoRow & { interes_dinamico_apartados?: number }).interes_dinamico_apartados || 0);
        const interesAcum = Number(a.interes_acumulado || 0) + interesPostgres;
        
        const capitalBase = balanceIni + interesAcum;
        const balanceCalculado = capitalBase;

        return {
          id: a.id,
          tarjetaId: a.tarjeta_id,
          nombre: a.nombre,
          rendimientoAnual: Number(a.rendimiento_anual),
          balanceInicial: balanceIni,
          interesAcumulado: interesAcum,
          balanceCalculado: Math.round(balanceCalculado * 100) / 100,
          ultimaActualizacion: a.ultima_actualizacion
        };
      });

    // Restamos el capital metido a apartados del saldo disponible principal de la tarjeta
    // Nota: Solo restamos el balance inicial invertido, no el rendimiento generado.
    const saldoEnApartados = apartadosRow
      .filter(a => a.tarjeta_id === tarjeta.id)
      .reduce((sum, a) => sum + Number(a.balance_inicial), 0);
    
    saldo -= saldoEnApartados;

    return {
      id:                  tarjeta.id,
      nombre:              tarjeta.nombre,
      tipo:                'Débito',
      limite:              Number(tarjeta.limite) || 0,
      diaCorte:            null,
      diaPago:             null,
      rendimientoAnual:    tarjeta.rendimiento_anual ?? 0,
      gastosPeriodoActual: 0,
      disponible:          Math.round(saldo * 100) / 100 === 0 ? 0 : Math.round(saldo * 100) / 100, // Elimina -0
      porcentajeUso:       0,
      estadoTermometro:    saldo < 0 ? 'rojo' : 'verde',
      etiquetaEstado:      saldo < 0 ? 'Sobregiro' : 'Saldo disponible',
      proximoCorte:        null,
      proximoPago:         null,
      diasParaPago:        null,
      apartados:           apartados,
    };
  }

  // === LÓGICA PARA TARJETA DE CRÉDITO ===
  const periodo = getPeriodoVigente(tarjeta.dia_corte || 1, hoy);

  // Gastos e Ingresos históricos para la tarjeta (hasta el fin del periodo actual)
  let gastosDelPeriodo = Number(tarjeta.gasto_inicial_ciclo || 0);
  let pagosDelPeriodo = 0;

  for (const mov of movimientos) {
    if (mov.tarjeta_id !== tarjeta.id) continue;
    const fecha = new Date(mov.fecha + 'T00:00:00');
    // Sumamos TODO el historial hasta el fin del periodo actual para que la deuda se arrastre
    // si no se ha pagado. Los pagos ('Ingreso') contrarrestan esta deuda de forma acumulativa.
    if (fecha <= periodo.fin) {
      if (mov.tipo === 'Gasto') {
        gastosDelPeriodo += Number(mov.monto);
      } else if (mov.tipo === 'Ingreso') {
        pagosDelPeriodo += Number(mov.monto);
      }
    }
  }

  // Cuotas MSI activas hoy para esta tarjeta (Architecture.md §5)
  let gastosMSIFacturados = 0;
  let saldoCongeladoMSI = 0;

  comprasMSI.forEach((msi) => {
    if (msi.tarjeta_id !== tarjeta.id) return;
    const primerCargo = new Date(msi.fecha_primer_cargo + 'T00:00:00');
    const fechaCompra = new Date(msi.fecha_compra + 'T00:00:00');
    
    // Si la compra ya se realizó
    if (hoy >= fechaCompra) {
      // 1. ¿Cuántos meses han pasado desde el primer cargo hasta el FIN del periodo actual?
      const mFin = periodo.fin.getMonth();
      const yFin = periodo.fin.getFullYear();
      const mPrimer = primerCargo.getMonth();
      const yPrimer = primerCargo.getFullYear();
      
      const mesesTranscurridos = (yFin - yPrimer) * 12 + (mFin - mPrimer);
      
      // Cuotas facturadas (incluye la del periodo actual si ya llegamos a él)
      const cuotasFacturadas = Math.max(0, mesesTranscurridos + 1);
      
      // 2. Sumamos todas las cuotas facturadas hasta el momento (histórico)
      const cuotasReales = Math.min(cuotasFacturadas, Number(msi.meses_totales));
      if (cuotasReales > 0) {
        gastosMSIFacturados += cuotasReales * Number(msi.cuota_mensual);
      }
      
      // 3. El saldo congelado es el restante DESPUÉS de descontar cuotas facturadas y adelantadas
      const cuotasRestantesParaCongelar = Math.max(0, Number(msi.meses_totales) - cuotasFacturadas - (msi.meses_adelantados ?? 0));
      if (cuotasRestantesParaCongelar > 0) {
        saldoCongeladoMSI += (cuotasRestantesParaCongelar * Number(msi.cuota_mensual)) - (Number(msi.descuento_por_adelanto) ?? 0);
      }
    }
  });

  // Gastos totales = (Gastos históricos + Cuotas MSI históricas) - Pagos realizados
  const deudaTotal = (gastosDelPeriodo + gastosMSIFacturados) - pagosDelPeriodo;
  
  // Si los pagos superan la deuda, el periodo actual queda en 0 (saldo a favor se reflejará en el disponible)
  const gastosPeriodoActual = Math.round(Math.max(0, deudaTotal) * 100) / 100;
  
  const limite = Number(tarjeta.limite);
  // El disponible real resta la deuda total del mes y el saldo congelado a meses
  const saldoAFavor = deudaTotal < 0 ? Math.abs(deudaTotal) : 0;
  const disponible = Math.round((limite - gastosPeriodoActual + saldoAFavor - saldoCongeladoMSI) * 100) / 100;
  
  // El porcentaje de uso debe reflejar el uso total del límite (incluyendo MSI congelado)
  const usoTotalLínea = gastosPeriodoActual + saldoCongeladoMSI;
  const porcentajeUso = limite > 0
    ? Math.round((usoTotalLínea / limite) * 1000) / 10
    : 0;

  const { estadoTermometro, etiquetaEstado } = clasificarEstado(porcentajeUso);

  const proxCorte = periodo.proximoCorte;
  const proxPago  = calcProximoPago(hoy, tarjeta.dia_pago || 1);

  return {
    id:                  tarjeta.id,
    nombre:              tarjeta.nombre,
    tipo:                'Crédito',
    limite,
    diaCorte:            tarjeta.dia_corte,
    diaPago:             tarjeta.dia_pago,
    rendimientoAnual:    Number(tarjeta.rendimiento_anual) || 0,
    gastoInicialCiclo:   tarjeta.gasto_inicial_ciclo,
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
  apartados: ApartadoRow[] = [],
  hoy: Date = new Date(),
): TarjetaConEstado[] {
  return tarjetas.map((t) => calcularEstadoTarjeta(t, movimientos, comprasMSI, apartados, hoy));
}

/** Umbrales exportados para que el cliente pueda replicar el semáforo (Architecture.md §3.3) */
export const UMBRALES = {
  verde:    { max: UMBRAL_VERDE },
  amarillo: { min: UMBRAL_VERDE + 1, max: UMBRAL_ROJO - 1 },
  rojo:     { min: UMBRAL_ROJO },
} as const;
