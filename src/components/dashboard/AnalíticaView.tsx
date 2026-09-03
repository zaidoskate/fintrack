'use client';

/**
 * Gráfico de tendencia de gastos por categoría — FR-20 a FR-22.
 * Usa Recharts (BarChart por categoría + LineChart de tendencia mensual).
 * NFR-06b: consume useMovimientos() — sin Supabase directo.
 *
 * H4: colores de categorías (categoria-*) completamente distintos
 * a los del termómetro (credito-*). Nunca mezclar paletas.
 */

import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useMemo, useState } from 'react';
import { useGastosPorCategoria, useFlujoPorMes } from '@/lib/hooks';
import { GlassCard } from '@/components/ui';
import { SaludFinanciera } from '@/components/dashboard/SaludFinanciera';

/* ── Paleta categorías (H4 — NUNCA reutilizar credito-*) ─────────────────── */
const CATEGORIA_COLOR: Record<string, string> = {
  'Comida':           '#818cf8',
  'Transporte':       '#38bdf8',
  'Entretenimiento':  '#c084fc',
  'Salud':            '#2dd4bf',
  'Ropa':             '#f472b6',
  'Conveniencia':     '#a78bfa',
  'Servicios':        '#67e8f9',
  'Sin categoría':    '#94a3b8',
};
function colorFor(cat: string): string {
  return CATEGORIA_COLOR[cat] ?? '#94a3b8';
}

/* ── Formateo ──────────────────────────────────────────────────────────────── */
const fmtMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

/* Convierte YYYY-MM-DD → etiqueta corta "Ene '25" */
function mesLabel(iso: string): string {
  const [y, m] = iso.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${meses[parseInt(m) - 1]} '${y.slice(2)}`;
}

/* ── Agregaciones se movieron a Supabase RPC ────────────────────────────────── */

/* ── Custom Tooltip ─────────────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,10,11,0.92)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px',
      padding: '8px 14px',
      fontSize: '13px',
      color: 'var(--text-primary)',
    }}>
      <strong>{label}</strong>
      <br />
      {fmtMXN.format(payload[0].value)}
    </div>
  );
}

/* ── Selector de rango ──────────────────────────────────────────────────────── */
type Rango = '30d' | '90d' | '180d' | 'ytd';
const RANGOS: { value: Rango; label: string; days: number }[] = [
  { value: '30d',  label: '30 días', days: 30 },
  { value: '90d',  label: '90 días', days: 90 },
  { value: '180d', label: '6 meses', days: 180 },
  { value: 'ytd',  label: 'Este año', days: 365 },
];

function fechaDesde(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().substring(0, 10);
}

/* ── Componente principal ──────────────────────────────────────────────────── */
export function AnalíticaView() {
  const [rango, setRango] = useState<Rango>('90d');
  const days = RANGOS.find((r) => r.value === rango)!.days;

  const { data: gastosCat = [], isLoading: loadCat } = useGastosPorCategoria(fechaDesde(days));
  const { data: flujoMes = [], isLoading: loadMes } = useFlujoPorMes(fechaDesde(days));
  
  const isLoading = loadCat || loadMes;

  const gastoTotal = useMemo(() => gastosCat.reduce((sum, item) => sum + item.total, 0), [gastosCat]);
  const porCategoria = useMemo(() => gastosCat.slice(0, 8), [gastosCat]);
  const porMes = useMemo(() => 
    flujoMes.slice(-6).map(item => ({ mes: mesLabel(item.mes + '-01'), total: item.gastos }))
  , [flujoMes]);

  return (
    <div>
      {/* Hero Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Flujo y Gastos
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total gastado en el periodo</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '40px', color: 'var(--text-primary)', marginTop: '4px', letterSpacing: '-0.02em' }}>
            {fmtMXN.format(gastoTotal)}
          </div>
        </div>
        
        {/* Selector de rango estilo Píldora */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '4px' }}>
          {RANGOS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRango(r.value)}
              style={{
                background: rango === r.value ? 'var(--brand)' : 'transparent',
                color: rango === r.value ? '#fff' : 'var(--text-muted)',
                border: 'none', padding: '8px 16px', borderRadius: '10px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <SaludFinanciera />

      {isLoading ? (
        <div style={{
          height: '200px', borderRadius: '22px',
          background: 'var(--surface-glass)',
          border: '1px solid var(--border-glass)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : (
        <GlassCard style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>Tendencia y Categorías</h3>
          
          {/* Gráfico de Línea (Tendencia Mensual) */}
          {porMes.length > 0 ? (
            <div style={{ height: '180px', width: '100%', marginBottom: '32px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={porMes} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="mes" tick={{ fill: 'rgba(245,245,247,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="total"
                    stroke="var(--brand)" strokeWidth={2}
                    dot={{ fill: 'var(--brand)', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Sin datos para gráfica de tendencia
            </div>
          )}

          {/* Barra de Distribución por Categoría */}
          {porCategoria.length > 0 && (
            <div>
              <div style={{ display: 'flex', width: '100%', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                {porCategoria.map(c => (
                  <div key={c.categoria} style={{ width: `${(c.total / gastoTotal) * 100}%`, background: colorFor(c.categoria) }} />
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {porCategoria.map(c => (
                  <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorFor(c.categoria) }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.categoria}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {((c.total / gastoTotal) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
