import { GlassCard } from '@/components/ui';
import type { CompraMSI } from '@/lib/types';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

export function MSITimeline({ comprasMSI }: { comprasMSI: CompraMSI[] }) {
  const data = useMemo(() => {
    const ahora = new Date();
    const currentYear = ahora.getFullYear();
    const currentMonth = ahora.getMonth();

    const nextMonths: { name: string; monto: number }[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      nextMonths.push({
        name: monthNames[d.getMonth()],
        monto: 0,
      });
    }

    const activas = comprasMSI.filter(c => c.mesesRestantes > 0);

    activas.forEach(compra => {
      const cuota = compra.montoTotal / compra.mesesTotales;
      const primerCargo = new Date(compra.fechaPrimerCargo);
      const primerYear = primerCargo.getFullYear();
      const primerMes = primerCargo.getMonth();

      // Para cada una de las 6 cubetas, verificamos si esa cuota le corresponde
      for (let i = 0; i < 6; i++) {
        const bucketDate = new Date(currentYear, currentMonth + i, 1);
        const bucketAbsMonth = bucketDate.getFullYear() * 12 + bucketDate.getMonth();
        const startAbsMonth = primerYear * 12 + primerMes;
        const endAbsMonth = startAbsMonth + compra.mesesTotales - 1 - (compra.mesesAdelantados || 0);

        if (bucketAbsMonth >= startAbsMonth && bucketAbsMonth <= endAbsMonth) {
          nextMonths[i].monto += cuota;
        }
      }
    });

    return nextMonths;
  }, [comprasMSI]);

  const hasDebt = data.some(d => d.monto > 0);

  if (!hasDebt) return null; // No active MSI

  return (
    <GlassCard style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h4 style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Deuda Futura (MSI)
        </h4>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Proyección de pagos a meses sin intereses en los próximos 6 meses.</p>
      </div>

      <div style={{ height: '180px', width: '100%', marginTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              formatter={(val: unknown) => fmt.format(Number(val))}
              contentStyle={{ background: 'rgba(20,15,17,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="monto" fill="var(--brand)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
