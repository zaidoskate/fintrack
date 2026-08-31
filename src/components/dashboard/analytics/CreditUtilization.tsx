import { GlassCard } from '@/components/ui';
import type { TarjetaConEstado } from '@/lib/types';
import { useMemo } from 'react';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

export function CreditUtilization({ tarjetas }: { tarjetas: TarjetaConEstado[] }) {
  const { limiteTotal, usadoTotal, pct } = useMemo(() => {
    let limiteTotal = 0;
    let usadoTotal = 0;

    tarjetas.forEach(t => {
      if (t.tipo === 'Crédito') {
        limiteTotal += t.limite;
        usadoTotal += (t.limite - t.disponible);
      }
    });

    const pct = limiteTotal > 0 ? (usadoTotal / limiteTotal) * 100 : 0;
    return { limiteTotal, usadoTotal, pct };
  }, [tarjetas]);

  if (limiteTotal === 0) return null; // No credit cards

  const color = pct > 50 ? 'var(--credito-rojo)' : pct > 30 ? 'var(--credito-amarillo)' : 'var(--brand)';

  return (
    <GlassCard style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
      <div>
        <h4 style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Utilización de Crédito
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color }}>
            {pct.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {fmt.format(usadoTotal)} / {fmt.format(limiteTotal)}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 1s ease-out, background 0.3s ease'
        }} />
      </div>

      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
        {pct < 30 ? '¡Excelente! Mantienes una utilización saludable.' : pct <= 50 ? 'Estás en el límite recomendado (30%).' : 'Cuidado, tu utilización de crédito es alta y podría afectar tu score.'}
      </p>
    </GlassCard>
  );
}
