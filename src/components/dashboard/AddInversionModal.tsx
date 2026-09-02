import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui';
import { X, Info, TrendingUp, CircleDollarSign, Coins } from 'lucide-react';

interface AddInversionModalProps {
  onClose: () => void;
  onSubmit: (datos: { simbolo: string; tipo: 'crypto' | 'stock' | 'etf'; cantidad: number; inversionInicial: number }) => void;
  isPending: boolean;
}

export function AddInversionModal({ onClose, onSubmit, isPending }: AddInversionModalProps) {
  const [tipo, setTipo] = useState<'crypto' | 'stock' | 'etf'>('stock');
  const [simbolo, setSimbolo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [inversionInicial, setInversionInicial] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simbolo || !cantidad || !inversionInicial) return;
    onSubmit({
      simbolo: simbolo.toUpperCase(),
      tipo,
      cantidad: parseFloat(cantidad),
      inversionInicial: parseFloat(inversionInicial)
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
                Añadir Inversión
              </h2>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Segmented Control for Type */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Tipo de Activo</label>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '4px' }}>
                  {[
                    { id: 'stock', label: 'Acción', icon: TrendingUp },
                    { id: 'etf', label: 'ETF', icon: CircleDollarSign },
                    { id: 'crypto', label: 'Crypto', icon: Coins }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTipo(opt.id as 'crypto' | 'stock' | 'etf')}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '10px 0', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.2s', border: 'none',
                        background: tipo === opt.id ? 'var(--brand)' : 'transparent',
                        color: tipo === opt.id ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      <opt.icon size={16} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Símbolo */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Símbolo (Ticker)
                </label>
                <input
                  type="text"
                  required
                  placeholder={tipo === 'crypto' ? "Ej. BTC" : "Ej. QQQM o AAPL"}
                  value={simbolo}
                  onChange={e => setSimbolo(e.target.value.toUpperCase())}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)', fontSize: '16px', outline: 'none', textTransform: 'uppercase'
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <Info size={14} color="var(--brand)" />
                  {tipo === 'crypto' 
                    ? "Usa el símbolo base como BTC o ETH." 
                    : "Usa el símbolo oficial de Yahoo Finance (Mercado de USA recomendado)."}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Cantidad poseída
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="Ej. 1.5"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)', fontSize: '16px', outline: 'none'
                  }}
                />
              </div>

              {/* Inversión Inicial */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Inversión Inicial (MXN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ej. 1000.00"
                  value={inversionInicial}
                  onChange={e => setInversionInicial(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)', fontSize: '16px', outline: 'none'
                  }}
                />
              </div>

              {/* Acciones */}
              <button
                type="submit"
                disabled={isPending || !simbolo || !cantidad || !inversionInicial}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px',
                  background: isPending || !simbolo || !cantidad || !inversionInicial ? 'rgba(255,255,255,0.1)' : 'var(--brand)',
                  color: isPending || !simbolo || !cantidad || !inversionInicial ? 'var(--text-muted)' : '#fff',
                  border: 'none', fontSize: '16px', fontWeight: 600, cursor: isPending || !simbolo || !cantidad || !inversionInicial ? 'not-allowed' : 'pointer',
                  marginTop: '10px', transition: 'all 0.2s'
                }}
              >
                {isPending ? 'Guardando...' : 'Añadir al Portafolio'}
              </button>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
