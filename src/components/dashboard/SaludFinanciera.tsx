'use client';

import { useTarjetas, useComprasMSI, useMovimientos, useCuentasYield } from '@/lib/hooks';
import { GlassCard } from '@/components/ui';
import { CreditUtilization } from './analytics/CreditUtilization';
import { MSITimeline } from './analytics/MSITimeline';
import { RunwayFinanciero } from './analytics/RunwayFinanciero';
import { GastoHormiga } from './analytics/GastoHormiga';

export function SaludFinanciera() {
  const { data: tarjetas = [], isLoading: loadTar } = useTarjetas();
  const { data: comprasMSI = [], isLoading: loadMsi } = useComprasMSI();
  const { data: movimientos = [], isLoading: loadMov } = useMovimientos();
  const { data: yields = [], isLoading: loadYield } = useCuentasYield();

  const isLoading = loadTar || loadMsi || loadMov || loadYield;

  if (isLoading) {
    return (
      <GlassCard style={{ padding: '24px', marginTop: '20px', height: '140px', animation: 'pulse 1.5s infinite' }}>
        <></>
      </GlassCard>
    );
  }

  return (
    <div style={{ marginTop: '0px' }}>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Métricas Avanzadas Premium */}
        <RunwayFinanciero tarjetas={tarjetas} yields={yields} movimientos={movimientos} />
        <GastoHormiga movimientos={movimientos} />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Fila 1: Deuda y Utilización */}
        <CreditUtilization tarjetas={tarjetas} />
        
        {/* Fila 2: Flujo futuro */}
        <MSITimeline comprasMSI={comprasMSI} />
      </div>
    </div>
  );
}
