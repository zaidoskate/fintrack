'use client';

import { useTarjetas, useComprasMSI } from '@/lib/hooks';
import { GlassCard } from '@/components/ui';
import { CreditUtilization } from './analytics/CreditUtilization';
import { MSITimeline } from './analytics/MSITimeline';

export function SaludFinanciera() {
  const { data: tarjetas = [], isLoading: loadTar } = useTarjetas();
  const { data: comprasMSI = [], isLoading: loadMsi } = useComprasMSI();

  const isLoading = loadTar || loadMsi;

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
