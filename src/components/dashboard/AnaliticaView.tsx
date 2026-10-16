'use client';

import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend, ReferenceLine } from 'recharts';
import { useMemo, useState } from 'react';
import { useGastosPorCategoria, useFlujoPorMes } from '@/lib/hooks';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, PieChart as PieChartIcon, ChevronDown, ChevronUp } from 'lucide-react';

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

const fmtMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

function mesLabel(iso: string): string {
  if (!iso || iso.length < 7) return '';
  const [y, m] = iso.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${meses[parseInt(m) - 1]} '${y.slice(2)}`;
}

function CustomTooltip({ active, payload, label, showTotal }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl min-w-[150px]">
      <strong className="text-zinc-300 text-xs">{label ?? payload[0]?.payload?.categoria}</strong>
      <div className="mt-2 flex flex-col gap-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
              <span className="text-xs text-zinc-400">{p.name}</span>
            </div>
            <span className="text-sm font-mono tabular-nums text-white font-medium">{fmtMXN.format(p.value)}</span>
          </div>
        ))}
        {showTotal && payload.length > 1 && (
          <div className="flex justify-between gap-4 border-t border-white/10 pt-1 mt-1">
            <span className="text-xs text-zinc-400">Total</span>
            <span className="text-sm font-mono tabular-nums text-white font-semibold">{fmtMXN.format(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

type Rango = '7d' | '30d' | '90d' | '365d';
const RANGOS: { value: Rango; label: string; days: number }[] = [
  { value: '7d',   label: 'Semana',    days: 7 },
  { value: '30d',  label: 'Mes',       days: 30 },
  { value: '90d',  label: 'Trimestre', days: 90 },
  { value: '365d', label: 'Año',       days: 365 },
];

function fechaDesde(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().substring(0, 10);
}

export function AnaliticaView() {
  const [rango, setRango] = useState<Rango>('30d');
  const days = RANGOS.find((r) => r.value === rango)!.days;
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { data: gastosCat = [], isLoading: loadCat } = useGastosPorCategoria(fechaDesde(days));
  const { data: flujoMes = [], isLoading: loadMes } = useFlujoPorMes(fechaDesde(days));
  
  const isLoading = loadCat || loadMes;

  const gastoTotal = useMemo(() => gastosCat.reduce((sum, item) => sum + item.total, 0), [gastosCat]);
  const ingresosTotal = useMemo(() => flujoMes.reduce((sum, item) => sum + item.ingresos, 0), [flujoMes]);
  const flujoLibre = ingresosTotal - gastoTotal;
  const tasaAhorro = ingresosTotal > 0 ? (flujoLibre / ingresosTotal) * 100 : 0;

  const { topCategories, otherCategories } = useMemo(() => {
    const sorted = [...gastosCat].sort((a, b) => b.total - a.total);
    return {
      topCategories: sorted.slice(0, 4),
      otherCategories: sorted.slice(4)
    };
  }, [gastosCat]);

  const porMes = useMemo(() => 
    flujoMes.slice(-6).map(item => ({ 
      mes: mesLabel(item.mes + '-01'), 
      gastos: item.gastos, 
      ingresos: item.ingresos,
      ahorro: item.ingresos - item.gastos,
      gastosFijos: item.gastosFijos || 0,
      gastosVariables: item.gastosVariables || 0
    }))
  , [flujoMes]);

  return (
    <div className="pb-8">
      {/* Control Segmentado */}
      <div className="flex justify-center mb-6">
        <div className="h-10 p-1 bg-zinc-900/80 border border-white/10 rounded-xl flex items-center gap-1 backdrop-blur-md">
          {RANGOS.map((r) => {
            const isActive = rango === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setRango(r.value)}
                className={`relative px-4 h-full text-xs font-medium rounded-lg transition-colors ${isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeAnalyticRange"
                    className="absolute inset-0 bg-white/10 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tríada de KPIs */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <div className="bg-zinc-900/60 border border-white/10 backdrop-blur-md p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <ArrowDownRight size={14} className="text-emerald-400" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">Ingresos</span>
          </div>
          <div className="font-mono tabular-nums text-sm sm:text-base font-semibold text-zinc-100">
            {fmtMXN.format(ingresosTotal)}
          </div>
        </div>
        
        <div className="bg-zinc-900/60 border border-white/10 backdrop-blur-md p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <ArrowUpRight size={14} className="text-rose-400" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">Gastos</span>
          </div>
          <div className="font-mono tabular-nums text-sm sm:text-base font-semibold text-zinc-100">
            {fmtMXN.format(gastoTotal)}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 backdrop-blur-md p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <TrendingUp size={14} className="text-indigo-400" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">Flujo Libre</span>
          </div>
          <div className="font-mono tabular-nums text-sm sm:text-base font-semibold text-zinc-100 flex items-center justify-between">
            {fmtMXN.format(flujoLibre)}
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-300 ml-1">{tasaAhorro.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-2xl bg-zinc-900/50 border border-white/5 animate-pulse" />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Gráfico de Flujo de Caja */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-5 overflow-hidden shadow-xl shadow-black/30">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 ml-2">Flujo de Caja</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={porMes} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeGradient)" />
                  <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pareto Donut Chart */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-5 overflow-hidden shadow-xl shadow-black/30">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 ml-2">Distribución de Gastos</h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-[180px] h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories.concat(otherCategories.length > 0 ? [{ categoria: 'Otros', total: otherCategories.reduce((s, c) => s + c.total, 0) }] : [])}
                      cx="50%" cy="50%"
                      innerRadius={68} outerRadius={82}
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="total"
                      nameKey="categoria"
                      name="Gasto"
                      stroke="none"
                    >
                      {topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colorFor(entry.categoria)} />
                      ))}
                      {otherCategories.length > 0 && <Cell fill="#52525b" />}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Total</span>
                  <span className="text-lg font-mono font-semibold text-zinc-100">{fmtMXN.format(gastoTotal)}</span>
                </div>
              </div>

              <div className="flex-1 w-full flex flex-col gap-3">
                {topCategories.map(cat => (
                  <div key={cat.categoria} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: colorFor(cat.categoria) }} />
                        <span className="text-zinc-300 font-medium">{cat.categoria}</span>
                      </div>
                      <span className="font-mono text-zinc-100">{fmtMXN.format(cat.total)}</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max((cat.total / gastoTotal) * 100, 2)}%`, background: colorFor(cat.categoria) }} />
                    </div>
                  </div>
                ))}

                {otherCategories.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <button 
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 flex items-center justify-center gap-1 transition-colors border border-white/5"
                    >
                      {showAllCategories ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showAllCategories ? 'Ocultar otros gastos' : `Ver ${otherCategories.length} categorías más`}
                    </button>
                    
                    <AnimatePresence>
                      {showAllCategories && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-col gap-3 overflow-hidden mt-1"
                        >
                          {otherCategories.map(cat => (
                            <div key={cat.categoria} className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400 pl-4">{cat.categoria}</span>
                                <span className="font-mono text-zinc-300">{fmtMXN.format(cat.total)}</span>
                              </div>
                              <div className="h-1 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-zinc-600" style={{ width: `${Math.max((cat.total / gastoTotal) * 100, 1)}%` }} />
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Fijos vs Variables */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-5 overflow-hidden shadow-xl shadow-black/30">
            <h3 className="text-sm font-semibold text-zinc-200 ml-2">Gastos fijos vs variables</h3>
            <p className="text-xs text-zinc-500 mb-4 ml-2">Cuánto de cada mes es compromiso fijo y cuánto es consumo variable</p>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMes} margin={{ left: 0, right: 0, top: 10, bottom: 0 }} barCategoryGap="25%">
                  <XAxis dataKey="mes" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip showTotal />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                  <Bar dataKey="gastosFijos" name="Fijos" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="gastosVariables" name="Variables" stackId="a" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ahorro neto por mes */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-5 overflow-hidden shadow-xl shadow-black/30">
            <h3 className="text-sm font-semibold text-zinc-200 ml-2">Ahorro neto mensual</h3>
            <p className="text-xs text-zinc-500 mb-4 ml-2">Ingresos menos gastos. Verde = ahorraste, rojo = gastaste de más</p>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMes} margin={{ left: 0, right: 0, top: 10, bottom: 0 }} barCategoryGap="25%">
                  <XAxis dataKey="mes" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="ahorro" name="Ahorro neto" radius={[6, 6, 6, 6]}>
                    {porMes.map((m, i) => (
                      <Cell key={i} fill={m.ahorro >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
