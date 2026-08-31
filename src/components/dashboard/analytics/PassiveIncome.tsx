import { GlassCard } from '@/components/ui';
import type { TarjetaConEstado } from '@/lib/types';
import { useMemo } from 'react';
import { Zap } from 'lucide-react';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

export function PassiveIncome({ tarjetas }: { tarjetas: TarjetaConEstado[] }) {
  const { totalInvertido, apyPonderado, ingresoMensual } = useMemo(() => {
    let totalInvertido = 0;
    let sumaPonderada = 0; // sum(monto * apy)

    tarjetas.forEach(t => {
      if (t.tipo === 'Débito' && t.apartados) {
        t.apartados.forEach(a => {
          if (a.rendimientoAnual > 0) {
            totalInvertido += a.balanceCalculado;
            sumaPonderada += (a.balanceCalculado * a.rendimientoAnual);
          }
        });
      }
    });

    const apyPonderado = totalInvertido > 0 ? (sumaPonderada / totalInvertido) : 0;
    const ingresoMensual = totalInvertido > 0 ? (totalInvertido * (apyPonderado / 100)) / 12 : 0;

    return { totalInvertido, apyPonderado, ingresoMensual };
  }, [tarjetas]);

  if (totalInvertido === 0) return null; // No passive income

  return (
    <GlassCard glow="verde" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
      <div>
        <h4 style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Dinero Trabajando
        </h4>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Ingreso pasivo generado por tus apartados.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <Zap size={24} color="var(--credito-verde)" />
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ganancia Mensual Est.</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color: 'var(--credito-verde)' }}>
            +{fmt.format(ingresoMensual)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Capital Invertido</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
            {fmt.format(totalInvertido)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tasa (APY Promedio)</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
            {apyPonderado.toFixed(2)}%
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
