'use client';

import { useMemo } from 'react';
import { GlassCard } from '@/components/ui';
import type { TarjetaConEstado, CuentaYield, Movimiento } from '@/lib/types';
import { esGastoReal } from '@/lib/types';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface RunwayProps {
  tarjetas: TarjetaConEstado[];
  yields: CuentaYield[];
  movimientos: Movimiento[];
}

export function RunwayFinanciero({ tarjetas, yields, movimientos }: RunwayProps) {
  const { diasAutonomia, gastoDiario, liquidez } = useMemo(() => {
    // 1. Calcular liquidez (Débito + Cuentas Yield)
    let totalLiquidez = 0;
    tarjetas.filter(t => t.tipo === 'Débito').forEach(t => totalLiquidez += t.disponible);
    yields.forEach(y => totalLiquidez += (y.valorTotalMXN ?? y.balanceActual));
    
    // 2. Calcular gasto promedio diario últimos 90 días
    const hoy = new Date();
    const hace90Dias = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    let totalGasto90d = 0;
    movimientos.forEach(m => {
      if (esGastoReal(m)) {
        const fechaMov = new Date(m.fecha);
        if (fechaMov >= hace90Dias && fechaMov <= hoy) {
          totalGasto90d += m.monto;
        }
      }
    });

    const gastoDiario = totalGasto90d / 90;
    const diasAutonomia = gastoDiario > 0 ? Math.floor(totalLiquidez / gastoDiario) : 999;

    return { diasAutonomia, gastoDiario, liquidez: totalLiquidez };
  }, [tarjetas, yields, movimientos]);

  const meses = Math.floor(diasAutonomia / 30);
  const dias = diasAutonomia % 30;

  let estadoTexto = '';
  let color = 'var(--text-primary)';
  let Icon = ShieldCheck;
  
  if (diasAutonomia >= 180) { // 6 meses+
    estadoTexto = 'Excelente autonomía';
    color = 'var(--credito-verde)';
  } else if (diasAutonomia >= 90) { // 3 meses+
    estadoTexto = 'Buen colchón';
    color = 'var(--brand)';
  } else if (diasAutonomia >= 30) {
    estadoTexto = 'Atención requerida';
    color = 'var(--credito-amarillo)';
    Icon = ShieldAlert;
  } else {
    estadoTexto = 'Riesgo inminente';
    color = 'var(--credito-rojo)';
    Icon = ShieldAlert;
  }

  return (
    <GlassCard style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Icon size={20} color={color} />
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Runway Financiero</h3>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {diasAutonomia === 999 ? '∞' : meses > 0 ? `${meses}m ${dias}d` : `${dias} días`}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          {estadoTexto}: tu colchón de liquidez actual te permite vivir <strong>{meses > 0 ? `${meses} meses` : `${dias} días`}</strong> sin ingresos.
        </div>
      </div>
      
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Fondo: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(liquidez)}</span>
        <span>Burn rate: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(gastoDiario)}/día</span>
      </div>
    </GlassCard>
  );
}
