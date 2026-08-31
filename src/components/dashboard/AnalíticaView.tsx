'use client';

/**
 * Gráfico de tendencia de gastos por categoría — FR-20 a FR-22.
 * Usa Recharts (BarChart por categoría + LineChart de tendencia mensual).
 * NFR-06b: consume useMovimientos() — sin Supabase directo.
 *
 * H4: colores de categorías (categoria-*) completamente distintos
 * a los del termómetro (credito-*). Nunca mezclar paletas.
 */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { useMemo, useState } from 'react';
import { useMovimientos } from '@/lib/hooks';
import { GlassCard } from '@/components/ui';
import type { Movimiento } from '@/lib/types';
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

/* ── Agregaciones ──────────────────────────────────────────────────────────── */

function agruparPorCategoria(movs: Movimiento[]) {
  const map: Record<string, number> = {};
  for (const m of movs) {
    if (m.tipo !== 'Gasto') continue;
    map[m.categoria] = (map[m.categoria] ?? 0) + m.monto;
  }
  return Object.entries(map)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function agruparPorMes(movs: Movimiento[]) {
  const map: Record<string, number> = {};
  for (const m of movs) {
    if (m.tipo !== 'Gasto') continue;
    const mes = m.fecha.substring(0, 7); // YYYY-MM
    map[mes] = (map[mes] ?? 0) + m.monto;
  }
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([mes, total]) => ({ mes: mesLabel(mes + '-01'), total }));
}

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

  const { data: movimientos = [], isLoading } = useMovimientos({ desde: fechaDesde(days) });

  const gastoTotal = useMemo(
    () => movimientos.filter((m) => m.tipo === 'Gasto').reduce((s, m) => s + m.monto, 0),
    [movimientos],
  );
  const porCategoria = useMemo(() => agruparPorCategoria(movimientos), [movimientos]);
  const porMes       = useMemo(() => agruparPorMes(movimientos), [movimientos]);

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 500, fontSize: '26px',
        letterSpacing: '-0.02em', marginBottom: '20px',
        color: 'var(--text-primary)',
      }}>
        Analítica
      </h1>

      {/* Nueva Sección: Salud Financiera (Grid con 5 módulos) */}
      <div style={{ marginBottom: '40px' }}>
        <SaludFinanciera />
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600, fontSize: '20px',
        color: 'var(--text-primary)', marginBottom: '16px',
      }}>
        Tendencia de Gastos
      </h2>

      {/* Selector de rango */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {RANGOS.map((r) => (
          <button
            key={r.value}
            onClick={() => setRango(r.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: rango === r.value ? 'var(--brand)' : 'var(--border-glass)',
              background: rango === r.value ? 'rgba(250,104,111,0.15)' : 'transparent',
              color: rango === r.value ? 'var(--brand)' : 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{
          height: '200px', borderRadius: '22px',
          background: 'var(--surface-glass)',
          border: '1px solid var(--border-glass)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : (
        <>
          {/* Resumen total */}
          <GlassCard style={{ padding: '20px 24px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total gastado
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '28px',
              color: 'var(--text-primary)', marginTop: '4px',
            }}>
              {fmtMXN.format(gastoTotal)}
            </div>
          </GlassCard>

          {/* Gráfico por categoría */}
          <GlassCard style={{ padding: '20px 16px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', paddingLeft: '8px' }}>
              Por categoría
            </div>
            {porCategoria.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                Sin gastos en este período
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porCategoria} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category" dataKey="categoria"
                    width={100} tick={{ fill: 'rgba(245,245,247,0.6)', fontSize: 12 }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {porCategoria.map((entry) => (
                      <Cell key={entry.categoria} fill={colorFor(entry.categoria)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Tendencia mensual */}
          {porMes.length > 1 && (
            <GlassCard style={{ padding: '20px 16px 16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', paddingLeft: '8px' }}>
                Tendencia mensual
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={porMes} margin={{ left: 0, right: 8 }}>
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
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
