import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui';
import { X, DollarSign, Wallet, Percent, Banknote } from 'lucide-react';

interface AddCuentaYieldModalProps {
  onClose: () => void;
  onSubmit: (datos: { nombre: string; moneda: 'MXN' | 'USD' | 'USDC' | 'USDT'; balance_inicial: number; apy: number }) => void;
  isPending: boolean;
}

export function AddCuentaYieldModal({ onClose, onSubmit, isPending }: AddCuentaYieldModalProps) {
  const [moneda, setMoneda] = useState<'MXN' | 'USD' | 'USDC' | 'USDT'>('MXN');
  const [nombre, setNombre] = useState('');
  const [balance, setBalance] = useState('');
  const [apy, setApy] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !balance || !apy) return;
    onSubmit({
      nombre,
      moneda,
      balance_inicial: parseFloat(balance),
      apy: parseFloat(apy)
    });
  };

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
        
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ width: '100%', maxWidth: '500px', position: 'relative', zIndex: 1 }}
        >
          <GlassCard style={{ borderRadius: '24px 24px 0 0', padding: '24px', borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Añadir Cuenta Yield
              </h2>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Nombre */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Nombre de la plataforma
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. MercadoPago, AirTM, Binance..."
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)', fontSize: '16px', outline: 'none'
                  }}
                />
              </div>

              {/* Segmented Control for Currency */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Moneda Base
                </label>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '4px' }}>
                  {[
                    { id: 'MXN', label: 'MXN', icon: Banknote },
                    { id: 'USD', label: 'USD', icon: DollarSign },
                    { id: 'USDC', label: 'USDC', icon: Wallet },
                    { id: 'USDT', label: 'USDT', icon: Wallet }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMoneda(opt.id as 'MXN' | 'USD' | 'USDC' | 'USDT')}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '10px 0', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s', border: 'none',
                        background: moneda === opt.id ? 'var(--brand)' : 'transparent',
                        color: moneda === opt.id ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      <opt.icon size={14} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Balance */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Balance Actual
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="Ej. 10000"
                    value={balance}
                    onChange={e => setBalance(e.target.value)}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '14px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                      color: 'var(--text-primary)', fontSize: '16px', outline: 'none'
                    }}
                  />
                </div>

                {/* APY */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Rendimiento Anual (APY)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="200"
                      required
                      placeholder="Ej. 15.0"
                      value={apy}
                      onChange={e => setApy(e.target.value)}
                      style={{
                        width: '100%', padding: '14px 16px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                        color: 'var(--text-primary)', fontSize: '16px', outline: 'none'
                      }}
                    />
                    <Percent size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <button
                type="submit"
                disabled={isPending || !nombre || !balance || !apy}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px',
                  background: isPending || !nombre || !balance || !apy ? 'rgba(255,255,255,0.1)' : 'var(--brand)',
                  color: isPending || !nombre || !balance || !apy ? 'var(--text-muted)' : '#fff',
                  border: 'none', fontSize: '16px', fontWeight: 600, cursor: isPending || !nombre || !balance || !apy ? 'not-allowed' : 'pointer',
                  marginTop: '10px', transition: 'all 0.2s'
                }}
              >
                {isPending ? 'Guardando...' : 'Añadir Cuenta Yield'}
              </button>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
