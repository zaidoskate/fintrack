import type { Movimiento } from '@/lib/types';

/**
 * Calcula el saldo total disponible en efectivo.
 * El efectivo no es una tarjeta registrada en DB, su saldo es puramente
 * el acumulado de todos los movimientos (Ingresos - Gastos) donde
 * el método de pago es 'Efectivo'.
 * 
 * @param movimientos Todos los movimientos del usuario
 * @returns Saldo actual en efectivo
 */
export function calcularSaldoEfectivo(movimientos: Movimiento[]): number {
  let saldo = 0;

  for (const mov of movimientos) {
    if (mov.metodoPago.toLowerCase() !== 'efectivo') continue;

    if (mov.tipo === 'Ingreso') {
      saldo += Number(mov.monto);
    } else if (mov.tipo === 'Gasto') {
      saldo -= Number(mov.monto);
    }
  }

  return Math.round(saldo * 100) / 100;
}
