import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { GlassCard, GlassSelect } from '@/components/ui';
import { useTarjetas, useTraspasoEfectivo } from '@/lib/hooks';

interface RetiroCajeroModalProps {
  onClose: () => void;
}

export function RetiroCajeroModal({ onClose }: RetiroCajeroModalProps) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const { data: tarjetas = [] } = useTarjetas();
  const tarjetasDebito = tarjetas.filter(t => t.tipo === 'Débito');
  
  const [origen, setOrigen] = useState(tarjetasDebito[0]?.nombre || '');
  const [monto, setMonto] = useState('');
  
  const { mutate: realizarTraspaso, isPending } = useTraspasoEfectivo();

  const handleRetiro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origen || !monto || isNaN(Number(monto)) || Number(monto) <= 0) return;
    
    const val = Number(monto);
    const tarjetaId = tarjetasDebito.find(t => t.nombre === origen)?.id;
    if (!tarjetaId) return;

    realizarTraspaso({
      tarjetaOrigenId: tarjetaId,
      monto: val
    }, {
      onSuccess: () => onClose()
    });
  };

  const modal = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '24px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{ width: '100%', maxWidth: '400px' }}
      >
        <GlassCard style={{ padding: '24px', position: 'relative' }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={20} />
          </button>
          
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', marginTop: 0 }}>
            Retiro de Cajero
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Transfiere saldo de tu tarjeta de débito hacia tu billetera en efectivo.
          </p>

          <form onSubmit={handleRetiro} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Origen (Tarjeta de Débito)
              </label>
              {tarjetasDebito.length > 0 ? (
                <GlassSelect
                  options={tarjetasDebito.map(t => t.nombre)}
                  value={origen}
                  onChange={setOrigen}
                />
              ) : (
                <div style={{ fontSize: '14px', color: '#ff4444' }}>No tienes tarjetas de débito registradas.</div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', margin: '8px 0' }}>
              <ArrowRight size={20} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Destino
              </label>
              <div style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px'
              }}>
                Billetera de Efectivo
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Monto a retirar
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="0.00"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px 16px 12px 32px',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || tarjetasDebito.length === 0}
              style={{
                background: 'var(--brand)',
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 600,
                marginTop: '8px',
                cursor: (isPending || tarjetasDebito.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (isPending || tarjetasDebito.length === 0) ? 0.7 : 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                transition: 'opacity 0.2s'
              }}
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Retiro'}
            </button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
