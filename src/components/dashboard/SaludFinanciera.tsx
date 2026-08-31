'use client';

import { useMovimientos, useTarjetas, useComprasMSI, useMetas } from '@/lib/hooks';
import { GlassCard } from '@/components/ui';
import { NetWorth } from './analytics/NetWorth';
import { CreditUtilization } from './analytics/CreditUtilization';
import { MSITimeline } from './analytics/MSITimeline';
import { PassiveIncome } from './analytics/PassiveIncome';
import { ExpenseRadar } from './analytics/ExpenseRadar';

export function SaludFinanciera() {
  const { data: movimientos = [], isLoading: loadMov } = useMovimientos();
  const { data: tarjetas = [], isLoading: loadTar } = useTarjetas();
  const { data: comprasMSI = [], isLoading: loadMsi } = useComprasMSI();
  const { data: metas = [], isLoading: loadMet } = useMetas();

  const isLoading = loadMov || loadTar || loadMsi || loadMet;

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
        gap: '16px'
      }}>
        {/* Fila 1: Resumen Global */}
        <NetWorth tarjetas={tarjetas} metas={metas} />
        
        {/* Fila 2: Deuda y Utilización */}
        <CreditUtilization tarjetas={tarjetas} />
        
        {/* Fila 3: Flujo futuro */}
        <MSITimeline comprasMSI={comprasMSI} />
        
        {/* Fila 4: Inversión / Ahorro */}
        <PassiveIncome tarjetas={tarjetas} />
        
        {/* Fila 5: Radar de Gastos del Mes */}
        <ExpenseRadar movimientos={movimientos} />
      </div>
    </div>
  );
}
