import { useState } from 'react';

import { Wallet, ArrowRightLeft } from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { RetiroCajeroModal } from './RetiroCajeroModal';

interface EfectivoCardProps {
  saldo: number;
  variant?: 'full' | 'compact';
  showBalance?: boolean;
  onClick?: () => void;
}

export function EfectivoCard({ saldo, variant = 'full', showBalance = true, onClick }: EfectivoCardProps) {
  const [showRetiro, setShowRetiro] = useState(false);
  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  return (
    <>
      <GlassCard
        className="efectivo-card"
        onClick={onClick}
        as={onClick ? "button" : "div"}
        style={{
          padding: variant === 'compact' ? '16px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: variant === 'compact' ? 'auto' : '180px',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          cursor: onClick ? 'pointer' : 'default',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: variant === 'compact' ? '16px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#fff' 
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: variant === 'compact' ? '15px' : '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Efectivo</h3>
              {variant === 'full' && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Billetera física</p>
              )}
            </div>
          </div>
          
          {variant === 'full' && (
            <button
            onClick={(e) => { e.stopPropagation(); setShowRetiro(true); }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
              <ArrowRightLeft size={14} /> Retiro de cajero
            </button>
          )}
        </div>

        <div style={{ marginTop: variant === 'compact' ? 'auto' : '24px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            Saldo Disponible
          </div>
          <div style={{ fontSize: variant === 'compact' ? '18px' : '22px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {showBalance ? fmt.format(saldo) : '••••••••'}
          </div>
        </div>
      </GlassCard>

      {showRetiro && (
        <RetiroCajeroModal onClose={() => setShowRetiro(false)} />
      )}
    </>
  );
}
