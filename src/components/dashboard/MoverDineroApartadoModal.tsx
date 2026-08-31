'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '@/components/ui';
import { useMoverDineroApartado } from '@/lib/hooks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apartadoId: string | null;
  maxRetiro: number;
  maxIngreso: number;
}

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--border-glass)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: 'var(--text-primary)',
  fontSize: '15px',
  width: '100%',
};

export function MoverDineroApartadoModal({ isOpen, onClose, apartadoId, maxRetiro, maxIngreso }: Props) {
  const [monto, setMonto] = useState('');
  const [esRetiro, setEsRetiro] = useState(true);
  
  const { mutateAsync: mover, isPending } = useMoverDineroApartado();

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMonto('');
      setEsRetiro(true);
    }
  }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartadoId) return;
    
    const m = parseFloat(monto || '0');
    if (m <= 0) return;

    try {
      // Si es retiro, montoDelta es negativo (sale del apartado)
      // Si es ingreso, montoDelta es positivo (entra al apartado)
      await mover({ id: apartadoId, montoDelta: esRetiro ? -m : m });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Hubo un error al mover el dinero.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
          
          <GlassCard style={{ width: '100%', maxWidth: '380px', padding: '24px', zIndex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Transferir Saldo
            </h2>
            
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <button
                  type="button"
                  onClick={() => setEsRetiro(false)}
                  style={{
                    flex: 1, padding: '10px',
                    background: !esRetiro ? 'rgba(52,211,153,0.2)' : 'transparent',
                    color: !esRetiro ? 'var(--credito-verde)' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  }}
                >
                  Ingresar
                </button>
                <button
                  type="button"
                  onClick={() => setEsRetiro(true)}
                  style={{
                    flex: 1, padding: '10px',
                    background: esRetiro ? 'rgba(250,104,111,0.2)' : 'transparent',
                    color: esRetiro ? 'var(--brand)' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  }}
                >
                  Retirar
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Monto a {esRetiro ? 'retirar del' : 'ingresar al'} apartado
                </label>
                <input
                  required type="number" placeholder="0.00" step="0.01" min="0.01" max={esRetiro ? maxRetiro : maxIngreso}
                  value={monto} onChange={e => setMonto(e.target.value)} style={inputStyle}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {esRetiro 
                    ? `Disponible para retirar: ${maxRetiro.toFixed(2)}`
                    : `Disponible en la tarjeta: ${maxIngreso.toFixed(2)}`
                  }
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={isPending || !monto} style={{
                  flex: 1, background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer'
                }}>
                  {isPending ? 'Procesando…' : 'Confirmar'}
                </button>
                <button type="button" onClick={onClose} style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', fontWeight: 500, cursor: 'pointer'
                }}>
                  Cancelar
                </button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
