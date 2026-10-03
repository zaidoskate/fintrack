import { GlassCard } from '@/components/ui';
import type { TarjetaConEstado, MetaConEstado } from '@/lib/types';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const fmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function NetWorth({ tarjetas, metas }: { tarjetas: TarjetaConEstado[], metas: MetaConEstado[] }) {
  const { assets, liabilities, netWorth } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    // Metas
    metas.forEach(m => {
      // Si el aporte proviene de un apartado de débito, ese saldo ya está sumado en tarjeta.apartados.
      // Solo sumar el capital de aportes que NO provengan de apartados registrados.
      const capitalFueraDeApartados = m.aportes
        .filter(a => !a.apartadoId)
        .reduce((sum, a) => sum + (a.monto + a.rendimientoGenerado), 0);
      assets += capitalFueraDeApartados;
    });

    // Tarjetas
    tarjetas.forEach(t => {
      if (t.tipo === 'Débito') {
        assets += t.disponible;
        if (t.apartados) {
          t.apartados.forEach(a => assets += a.balanceCalculado);
        }
      } else {
        // Crédito: lo que se debe es el límite menos lo que está disponible (incluye MSI)
        const usado = t.limite - t.disponible;
        liabilities += usado;
      }
    });

    return { assets, liabilities, netWorth: assets - liabilities };
  }, [tarjetas, metas]);

  const data = [
    { name: 'Activos', value: assets, color: 'var(--credito-verde)' },
    { name: 'Pasivos', value: liabilities, color: 'var(--credito-rojo)' },
  ].filter(d => d.value > 0);

  return (
    <GlassCard style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h4 style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Patrimonio Neto
        </h4>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: netWorth >= 0 ? 'var(--text-primary)' : 'var(--credito-rojo)' }}>
          {fmt.format(netWorth)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ width: '80px', height: '80px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={25} outerRadius={40}
                stroke="none"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(val: unknown) => fmt.format(Number(val))}
                contentStyle={{ background: 'rgba(20,15,17,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Activos Totales</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--credito-verde)', fontWeight: 600 }}>
              {fmt.format(assets)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Deuda Total</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--credito-rojo)', fontWeight: 600 }}>
              {fmt.format(liabilities)}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
