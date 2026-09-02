import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { PortafolioActivo, CuentaYield, TarjetaConEstado } from '@/lib/types';
import { Loader } from '@/components/ui/Loader';
import { GlassSelect } from '@/components/ui/GlassSelect';

interface HistData {
  timestamps: number[];
  prices: number[];
  currency: string;
}

export function PatrimonialAnalytics({ activos, yields, tarjetas = [], displayCurrency, rates }: { activos: PortafolioActivo[]; yields: CuentaYield[]; tarjetas?: TarjetaConEstado[]; displayCurrency: string; rates: Record<string, number> }) {
  const getConvertedValue = (valMXN: number) => {
    if (displayCurrency === 'USD' && rates['MXN=X']) return valMXN / rates['MXN=X'];
    if (displayCurrency === 'EUR' && rates['EURMXN=X']) return valMXN / rates['EURMXN=X'];
    if (displayCurrency === 'BTC' && rates['BTC-USD']) return valMXN / rates['BTC-USD'];
    return valMXN;
  };

  const formatConverted = (valMXN: number, minDecimals = 0) => {
    const val = getConvertedValue(valMXN);
    if (displayCurrency === 'BTC') return `₿ ${val.toFixed(6)}`;
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: displayCurrency, minimumFractionDigits: minDecimals, maximumFractionDigits: 2 }).format(val);
    } catch {
      return `${displayCurrency} ${val.toFixed(2)}`;
    }
  };
  // 1. Datos para la Donut de Distribución
  const distData = useMemo(() => {
    let crypto = 0, stock = 0, etf = 0, yieldTot = 0;
    activos.forEach(a => {
      if (a.tipo === 'crypto') crypto += (a.valorTotal || 0);
      else if (a.tipo === 'stock') stock += (a.valorTotal || 0);
      else if (a.tipo === 'etf') etf += (a.valorTotal || 0);
    });
    yields.forEach(y => {
      yieldTot += (y.valorTotalMXN || y.balanceActual);
    });
    
    return [
      { name: 'Criptomonedas', value: crypto, color: '#f59e0b' },
      { name: 'Acciones', value: stock, color: '#3b82f6' },
      { name: 'ETFs', value: etf, color: '#8b5cf6' },
      { name: 'Cuentas Yield', value: yieldTot, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [activos, yields]);

  // 2. Proyección de Ingresos Pasivos
  const pasivoMensual = useMemo(() => {
    let totalMensualMXN = 0;
    
    // De Cuentas Yield Dedicadas
    yields.forEach(y => {
      const valor = y.valorTotalMXN || y.balanceActual; 
      const anual = valor * (y.apy / 100);
      totalMensualMXN += (anual / 12);
    });

    // De Tarjetas de Débito y Apartados
    tarjetas.forEach(t => {
      if (t.tipo === 'Débito' && (t.rendimientoAnual || 0) > 0) {
        totalMensualMXN += (t.disponible * (t.rendimientoAnual / 100)) / 12;
      }
      if (t.apartados) {
        t.apartados.forEach(a => {
          if ((a.rendimientoAnual || 0) > 0) {
            totalMensualMXN += (a.balanceCalculado * (a.rendimientoAnual / 100)) / 12;
          }
        });
      }
    });

    return totalMensualMXN;
  }, [yields, tarjetas]);

  // 3. Timeline Histórico
  const [range, setRange] = useState<'12h' | '1d' | '1w' | '1m' | '6m'>('1w');
  const [assetFilter, setAssetFilter] = useState<'ambas' | 'cripto' | 'renta_variable'>('ambas');
  const [rawData, setRawData] = useState<Record<string, HistData>>({});
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    if (activos.length === 0) return;

    let r = '5d';
    let i = '1h';
    if (range === '12h') { r = '1d'; i = '15m'; }
    else if (range === '1d') { r = '1d'; i = '5m'; }
    else if (range === '1w') { r = '5d'; i = '15m'; }
    else if (range === '1m') { r = '1mo'; i = '1d'; }
    else if (range === '6m') { r = '6mo'; i = '1d'; }

    const mapSymbol = (s: string, tipo: string) => {
      if (tipo === 'crypto') return `${s}-USD`;
      return s;
    };
    
    const symbolsQuery = activos.map(a => mapSymbol(a.simbolo, a.tipo)).join(',');
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingHist(true);
    fetch(`/api/historical?symbols=${symbolsQuery}&range=${r}&interval=${i}`)
      .then(res => res.json())
      .then(data => setRawData(data))
      .catch(console.error)
      .finally(() => setLoadingHist(false));

  }, [range, activos]);

  const histData = useMemo(() => {
    if (!rawData || Object.keys(rawData).length === 0) return [];
    
    const allTimestamps = new Set<number>();
    Object.values(rawData).forEach(d => {
      if (d.timestamps) d.timestamps.forEach(t => allTimestamps.add(t));
    });
    
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    const getPriceAt = (arrTs: number[], arrPx: number[], targetTs: number) => {
      if (!arrTs || arrTs.length === 0) return 0;
      let lastPx = arrPx[0];
      for (let k = 0; k < arrTs.length; k++) {
        if (arrTs[k] <= targetTs) lastPx = arrPx[k];
        else break;
      }
      return lastPx;
    };

    return sortedTimestamps.map(ts => {
      let totalMXN = 0;
      const mxnRate = getPriceAt(rawData['MXN=X']?.timestamps || [], rawData['MXN=X']?.prices || [], ts) || 19.5;

      activos.forEach(a => {
        if (assetFilter === 'cripto' && a.tipo !== 'crypto') return;
        if (assetFilter === 'renta_variable' && a.tipo === 'crypto') return;

        const sym = a.tipo === 'crypto' ? `${a.simbolo}-USD` : a.simbolo;
        const hd = rawData[sym];
        if (hd) {
          let px = getPriceAt(hd.timestamps, hd.prices, ts);
          if (hd.currency === 'USD') px = px * mxnRate;
          totalMXN += (px * a.cantidad);
        }
      });

      let totalConverted = totalMXN;
      if (displayCurrency === 'USD' && rates['MXN=X']) totalConverted = totalMXN / rates['MXN=X'];
      if (displayCurrency === 'EUR' && rates['EURMXN=X']) totalConverted = totalMXN / rates['EURMXN=X'];
      if (displayCurrency === 'BTC' && rates['BTC-USD']) totalConverted = totalMXN / rates['BTC-USD'];

      const d = new Date(ts * 1000);
      let timeLabel = '';
      if (range === '1m' || range === '6m') {
        timeLabel = d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      } else if (range === '1w') {
        timeLabel = d.toLocaleDateString('es-MX', { weekday: 'short' });
        timeLabel = timeLabel.charAt(0).toUpperCase() + timeLabel.slice(1);
      } else {
        timeLabel = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      return { timestamp: ts, timeLabel, total: totalConverted };
    });
  }, [rawData, assetFilter, activos, range, displayCurrency, rates]);

  const totalDist = distData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
      
      {/* Píldora de Ingresos Pasivos */}
      { pasivoMensual > 0 && (
        <div style={{ display: 'flex' }}>
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.15)', 
            border: '1px solid rgba(16, 185, 129, 0.3)', 
            color: 'var(--credito-verde)', 
            padding: '6px 12px', 
            borderRadius: '100px', 
            fontSize: '13px', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px' 
          }}>
            +{formatConverted(pasivoMensual)} / mes pasivo
          </div>
        </div>
      )}

      {/* Timeline Histórico Compacto */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px', zIndex: 20 }}>
          <div style={{ width: '130px' }}>
            <GlassSelect 
              size="sm"
              options={[
                { value: 'ambas', label: 'Ambas' },
                { value: 'cripto', label: 'Criptos' },
                { value: 'renta_variable', label: 'R. Variable' }
              ]}
              value={assetFilter} 
              onChange={(val) => setAssetFilter(val as 'ambas' | 'cripto' | 'renta_variable')}
            />
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
            {['12h', '1d', '1w', '1m', '6m'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r as '12h' | '1d' | '1w' | '1m' | '6m')}
                style={{
                  background: range === r ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: range === r ? '#fff' : 'var(--text-muted)',
                  border: 'none', padding: '4px 10px', borderRadius: '6px',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: '120px', width: '100%' }}>
          {loadingHist ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.8)' }}>
               <Loader label="Actualizando histórico..." />
            </div>
          ) : histData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '12px' }}>
              Sin datos suficientes.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={histData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="timeLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }} 
                  minTickGap={20}
                />
                <YAxis 
                  hide={false} 
                  domain={['auto', 'auto']} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => formatConverted(val, 0)}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  width={60}
                />
                <Tooltip 
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any) => [formatConverted(val), '']}
                  labelStyle={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}
                  contentStyle={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', padding: '8px 12px' }}
                  itemStyle={{ color: 'var(--brand)', fontWeight: 600, fontSize: '14px', padding: 0 }}
                  separator=""
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="var(--brand)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Barra de Distribución Minimalista */}
      { distData.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', width: '100%', height: '6px', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
            {distData.map(d => (
              <div key={d.name} style={{ width: `${(d.value / totalDist) * 100}%`, background: d.color }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {distData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.name}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{((d.value / totalDist) * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
