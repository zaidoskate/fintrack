'use client';

import { useMemo } from 'react';
import { GlassCard } from '@/components/ui';
import type { Movimiento } from '@/lib/types';
import { esGastoReal } from '@/lib/types';
import { Coffee } from 'lucide-react';

interface GastoHormigaProps {
  movimientos: Movimiento[];
}

export function GastoHormiga({ movimientos }: GastoHormigaProps) {
  const { totalHormiga, porcentaje, totalGasto } = useMemo(() => {
    const hoy = new Date();
    const currentMesStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    let totalGastoMes = 0;
    let totalHormigaMes = 0;

    movimientos.forEach(m => {
      if (esGastoReal(m) && m.fecha.startsWith(currentMesStr)) {
        totalGastoMes += m.monto;
        if (m.monto <= 250) {
          totalHormigaMes += m.monto;
        }
      }
    });

    const porcentaje = totalGastoMes > 0 ? (totalHormigaMes / totalGastoMes) * 100 : 0;
    
    return { totalHormiga: totalHormigaMes, porcentaje, totalGasto: totalGastoMes };
  }, [movimientos]);

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  return (
    <GlassCard style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Coffee size={20} color="var(--brand)" />
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Gastos Hormiga</h3>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {formatter.format(totalHormiga)}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Acumulado este mes en micro-gastos (≤ $250).
        </div>
      </div>
      
      <div style={{ marginTop: '16px' }}>
        <div style={{
          height: '6px',
          borderRadius: '3px',
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          marginBottom: '6px'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(porcentaje, 100)}%`,
            background: porcentaje > 15 ? 'var(--credito-rojo)' : porcentaje > 5 ? 'var(--credito-amarillo)' : 'var(--brand)',
            borderRadius: '3px',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Representan el <strong>{porcentaje.toFixed(1)}%</strong> de tus gastos</span>
          <span>{formatter.format(totalGasto)} total</span>
        </div>
      </div>
    </GlassCard>
  );
}
