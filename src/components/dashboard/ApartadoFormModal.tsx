'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '@/components/ui';
import { useCrearApartado, useMoverDineroApartado } from '@/lib/hooks';
import type { TarjetaConEstado } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tarjeta: TarjetaConEstado | null;
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

export function ApartadoFormModal({ isOpen, onClose, tarjeta }: Props) {
  const [nombre, setNombre] = useState('');
  const [rendimiento, setRendimiento] = useState('');
  const [montoInicial, setMontoInicial] = useState('');
  
  const { mutateAsync: crear, isPending: isCreating } = useCrearApartado();
  const { mutateAsync: mover, isPending: isMoving } = useMoverDineroApartado();

  const isPending = isCreating || isMoving;

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre('');
      setRendimiento('');
      setMontoInicial('');
    }
  }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarjeta || !nombre) return;
    
    try {
      const apartado = await crear({
        tarjeta_id: tarjeta.id,
        nombre,
        rendimiento_anual: parseFloat(rendimiento || '0'),
      });

      const monto = parseFloat(montoInicial || '0');
      if (monto > 0) {
        await mover({ id: apartado.id, montoDelta: monto });
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Hubo un error al crear el apartado.');
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
              Nuevo Apartado
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              En: {tarjeta?.nombre}
            </p>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre</label>
                <input required placeholder="Ej. Ahorro vacaciones" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Rendimiento Anual (APY %)</label>
                <input type="number" placeholder="0" step="0.01" value={rendimiento} onChange={e => setRendimiento(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Mover saldo inicial (opcional)</label>
                <input type="number" placeholder="0.00" step="0.01" value={montoInicial} onChange={e => setMontoInicial(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={isPending} style={{
                  flex: 1, background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer'
                }}>
                  {isPending ? 'Guardando…' : 'Crear Apartado'}
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
