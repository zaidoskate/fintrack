'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '@/lib/motion/variants';
import { GlassCard } from '@/components/ui';
import { useCrearMovimiento } from '@/lib/hooks';
import type { TarjetaConEstado } from '@/lib/types';

interface AjusteSaldoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarjeta: TarjetaConEstado | null;
}

export function AjusteSaldoModal({ isOpen, onClose, tarjeta }: AjusteSaldoModalProps) {
  const { modalTransition } = useMotionConfig();
  const [saldoReal, setSaldoReal] = useState('');
  const { mutate: crearMovimiento, isPending } = useCrearMovimiento();

  useEffect(() => {
    if (isOpen && tarjeta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaldoReal(tarjeta.disponible.toString());
    }
  }, [isOpen, tarjeta]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarjeta) return;

    const real = parseFloat(saldoReal);
    if (isNaN(real)) return;

    const diferencia = real - tarjeta.disponible;
    if (Math.abs(diferencia) < 0.01) {
      onClose(); // Sin cambios
      return;
    }

    const tipo = diferencia > 0 ? 'Ingreso' : 'Gasto';
    const monto = Math.abs(diferencia);
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const now = new Date(Date.now() - tzOffset);
    const [fecha] = now.toISOString().split('T');

    crearMovimiento({
      fecha,
      tipo,
      monto,
      categoria: 'Ajuste de balance',
      comercio: 'Ajuste de saldo',
      tarjetaId: tarjeta.id,
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  if (!tarjeta) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
          
          <GlassCard
            as="div"
            style={{ width: '100%', maxWidth: '380px', padding: '24px', zIndex: 1 }}
            {...modalTransition}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Ajustar Saldo
            </h2>

            <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <p>Saldo registrado en app: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(tarjeta.disponible)}
              </strong></p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Saldo real en tu banco hoy</label>
                <input
                  type="number" required min="0" step="0.01"
                  value={saldoReal} onChange={e => setSaldoReal(e.target.value)}
                  className="glass-input"
                  style={{ marginTop: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                    background: 'var(--brand)', color: '#1a0a0b', fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isPending ? 'Ajustando...' : 'Guardar ajuste'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                    color: 'var(--text-secondary)', cursor: 'pointer'
                  }}
                >
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
