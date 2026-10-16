export interface AmortizationRow {
  mes: number;
  cuota: number;
  interes: number;
  capital: number;
  saldoRestante: number;
}

/**
 * Calcula la cuota mensual fija (sistema francés)
 */
export function calcularCuotaMensual(montoOriginal: number, tasaAnual: number, plazoMesesTotales: number): number {
  if (tasaAnual <= 0) {
    return montoOriginal / plazoMesesTotales;
  }
  
  const r = (tasaAnual / 100) / 12;
  const n = plazoMesesTotales;
  const c = montoOriginal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return c;
}

/**
 * Genera la tabla de amortización para todo el préstamo (asumiendo pagos fijos sin adelantos)
 */
export function generarTablaAmortizacion(montoOriginal: number, tasaAnual: number, plazoMesesTotales: number): AmortizationRow[] {
  const cuota = calcularCuotaMensual(montoOriginal, tasaAnual, plazoMesesTotales);
  const r = (tasaAnual / 100) / 12;
  
  let saldo = montoOriginal;
  const tabla: AmortizationRow[] = [];
  
  for (let mes = 1; mes <= plazoMesesTotales; mes++) {
    const interes = saldo * r;
    let capital = cuota - interes;
    
    // Ajuste por redondeo en el último mes
    if (mes === plazoMesesTotales || saldo - capital < 0.01) {
      capital = saldo;
      saldo = 0;
    } else {
      saldo -= capital;
    }
    
    tabla.push({
      mes,
      cuota: capital + interes,
      interes,
      capital,
      saldoRestante: Math.max(0, saldo)
    });
    
    if (saldo <= 0) break;
  }
  
  return tabla;
}

export interface ImpactoAbono {
  reduccionPlazo: {
    nuevosMesesTotales: number;
    mesesAhorrados: number;
    interesAhorrado: number;
    nuevaCuota: number; // Será la misma que la anterior
  };
  reduccionCuota: {
    nuevosMesesTotales: number; // Será el mismo plazo original restante
    mesesAhorrados: 0;
    interesAhorrado: number;
    nuevaCuota: number;
  };
}

/**
 * Simula el impacto de realizar un pago extraordinario a capital
 */
export function simularAbonoCapital(
  saldoActual: number,
  tasaAnual: number,
  mesesRestantes: number,
  cuotaActual: number,
  abonoExtra: number
): ImpactoAbono | null {
  if (saldoActual <= 0 || abonoExtra <= 0 || abonoExtra >= saldoActual) {
    return null; // El préstamo se liquida o no es válido
  }

  const r = (tasaAnual / 100) / 12;
  const nuevoSaldo = saldoActual - abonoExtra;

  // Calculamos interés total original restante
  let interesTotalOriginal = 0;
  let sObj = saldoActual;
  for (let i = 0; i < mesesRestantes; i++) {
    const int = sObj * r;
    const cap = cuotaActual - int;
    interesTotalOriginal += int;
    sObj -= cap;
    if (sObj <= 0) break;
  }

  // 1. Mantener cuota, reducir plazo
  let nMesesReducido = 0;
  let sRed = nuevoSaldo;
  let interesReducido = 0;
  
  if (r === 0) {
    nMesesReducido = Math.ceil(nuevoSaldo / cuotaActual);
  } else {
    // n = -log(1 - r * P / C) / log(1 + r)
    const factor = 1 - (r * nuevoSaldo) / cuotaActual;
    if (factor <= 0) {
      // La cuota es demasiado baja para el saldo, no debería pasar si la cuota era correcta
      nMesesReducido = mesesRestantes;
    } else {
      nMesesReducido = Math.ceil(-Math.log(factor) / Math.log(1 + r));
    }
    
    // Calcular interés real
    let sTmp = nuevoSaldo;
    for (let i = 0; i < nMesesReducido; i++) {
      const int = sTmp * r;
      const cap = cuotaActual - int;
      interesReducido += int;
      sTmp -= cap;
      if (sTmp <= 0) break;
    }
  }

  // 2. Mantener plazo, reducir cuota
  const nuevaCuota = calcularCuotaMensual(nuevoSaldo, tasaAnual, mesesRestantes);
  let interesNuevaCuota = 0;
  let sCua = nuevoSaldo;
  for (let i = 0; i < mesesRestantes; i++) {
    const int = sCua * r;
    const cap = nuevaCuota - int;
    interesNuevaCuota += int;
    sCua -= cap;
    if (sCua <= 0) break;
  }

  return {
    reduccionPlazo: {
      nuevosMesesTotales: nMesesReducido,
      mesesAhorrados: Math.max(0, mesesRestantes - nMesesReducido),
      interesAhorrado: Math.max(0, interesTotalOriginal - interesReducido),
      nuevaCuota: cuotaActual
    },
    reduccionCuota: {
      nuevosMesesTotales: mesesRestantes,
      mesesAhorrados: 0,
      interesAhorrado: Math.max(0, interesTotalOriginal - interesNuevaCuota),
      nuevaCuota: nuevaCuota
    }
  };
}
