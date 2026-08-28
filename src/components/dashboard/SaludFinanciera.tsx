'use client';

import { useMovimientos } from '@/lib/hooks';
import { GlassCard } from '@/components/ui';
import { useMemo } from 'react';

const fmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function SaludFinanciera() {
  const { data: movimientos = [], isLoading } = useMovimientos();

  const { ingresosMes, gastosMes, balance, porcentajeGasto } = useMemo(() => {
    const ahora = new Date();
    const currentMonth = ahora.getMonth();
    const currentYear = ahora.getFullYear();

    const movimientosDelMes = movimientos.filter((m) => {
      const [yearStr, monthStr] = m.fecha.split('-');
      if (!yearStr || !monthStr) return false;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1; // 0-indexed
      return year === currentYear && month === currentMonth;
    });

    let ingresosMes = 0;
    let gastosMes = 0;

    movimientosDelMes.forEach((m) => {
      if (m.tipo === 'Ingreso') ingresosMes += m.monto;
      else if (m.tipo === 'Gasto') gastosMes += m.monto;
    });

    const balance = ingresosMes - gastosMes;
    // Si no hay ingresos pero hay gastos, el porcentaje es "100%" (o infinito).
    // Para UX, lo limitamos.
    const porcentajeGasto = ingresosMes > 0 ? (gastosMes / ingresosMes) * 100 : gastosMes > 0 ? 100 : 0;
    
    // Cap at 100% for the visual bar
    const visualPercent = Math.min(porcentajeGasto, 100);

    return { ingresosMes, gastosMes, balance, porcentajeGasto: visualPercent };
  }, [movimientos]);

  if (isLoading) {
    return (
      <GlassCard style={{ padding: '24px', marginTop: '20px', height: '140px', animation: 'pulse 1.5s infinite' }}>
        <></>
      </GlassCard>
    );
  }

  return (
    <GlassCard as="section" style={{ padding: '24px', marginTop: '20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: '18px',
          color: 'var(--text-primary)',
          margin: '0 0 4px 0'
        }}>Salud Financiera</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Balance del mes en curso</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingresos</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--credito-verde)', fontWeight: 600 }}>
            {fmt.format(ingresosMes)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gastos</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--text-primary)', fontWeight: 600 }}>
            {fmt.format(gastosMes)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '6px',
        borderRadius: '3px',
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        marginBottom: '10px'
      }}>
        <div style={{
          height: '100%',
          width: `${porcentajeGasto}%`,
          background: porcentajeGasto > 85 ? 'var(--credito-rojo)' : porcentajeGasto > 60 ? 'var(--credito-amarillo)' : 'var(--brand)',
          borderRadius: '3px',
          transition: 'width 0.6s ease, background 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          Restante: <strong style={{ color: 'var(--text-primary)' }}>{fmt.format(balance)}</strong>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {porcentajeGasto.toFixed(1)}% gastado
        </span>
      </div>
    </GlassCard>
  );
}
