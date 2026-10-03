import { GlassCard } from '@/components/ui';
import type { Movimiento } from '@/lib/types';
import { esGastoReal } from '@/lib/types';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

const COLORS = ['var(--brand)', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export function ExpenseRadar({ movimientos }: { movimientos: Movimiento[] }) {
  const { data, totalGasto } = useMemo(() => {
    const ahora = new Date();
    const currentMonth = ahora.getMonth();
    const currentYear = ahora.getFullYear();

    const gastos = movimientos.filter((m) => {
      if (!esGastoReal(m)) return false;
      const [yearStr, monthStr] = m.fecha.split('-');
      if (!yearStr || !monthStr) return false;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      return year === currentYear && month === currentMonth;
    });

    const categoryMap: Record<string, number> = {};
    let total = 0;

    gastos.forEach(g => {
      categoryMap[g.categoria] = (categoryMap[g.categoria] || 0) + g.monto;
      total += g.monto;
    });

    const sortedCats = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Si hay más de 5, agrupamos los demás en "Otros"
    if (sortedCats.length > 5) {
      const top5 = sortedCats.slice(0, 5);
      const othersValue = sortedCats.slice(5).reduce((sum, cat) => sum + cat.value, 0);
      top5.push({ name: 'Otros', value: othersValue });
      return { data: top5, totalGasto: total };
    }

    return { data: sortedCats, totalGasto: total };
  }, [movimientos]);

  if (data.length === 0) return null; // No expenses this month

  return (
    <GlassCard style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <h4 style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Gastos del Mes
        </h4>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {fmt.format(totalGasto)}
        </div>
      </div>

      <div style={{ height: '180px', width: '100%', marginTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={80}
              stroke="none"
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(val: unknown) => fmt.format(Number(val))}
              contentStyle={{ background: 'rgba(20,15,17,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend 
              verticalAlign="middle" align="right" layout="vertical"
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
