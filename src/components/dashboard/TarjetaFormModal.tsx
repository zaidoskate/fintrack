'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '@/lib/motion/variants';
import { GlassCard } from '@/components/ui';
import type { NuevaTarjetaInput } from '@/lib/api-inputs';

interface TarjetaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<NuevaTarjetaInput>) => void;
  initialData?: Partial<NuevaTarjetaInput>;
  isPending?: boolean;
}

export function TarjetaFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isPending,
}: TarjetaFormModalProps) {
  const { modalTransition } = useMotionConfig();
  const [tipo, setTipo] = useState<'Crédito' | 'Débito'>(initialData?.tipo || 'Crédito');
  const [nombre, setNombre] = useState(initialData?.nombre || '');
  const [limite, setLimite] = useState(initialData?.limite?.toString() || '');
  const [diaCorte, setDiaCorte] = useState(initialData?.diaCorte?.toString() || '');
  const [diaPago, setDiaPago] = useState(initialData?.diaPago?.toString() || '');
  const [rendimientoAnual, setRendimientoAnual] = useState(initialData?.rendimientoAnual?.toString() || '');

  // Reset form when initialData changes
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTipo(initialData?.tipo || 'Crédito');
      setNombre(initialData?.nombre || '');
      setLimite(initialData?.limite?.toString() || '');
      setDiaCorte(initialData?.diaCorte?.toString() || '');
      setDiaPago(initialData?.diaPago?.toString() || '');
      setRendimientoAnual(initialData?.rendimientoAnual?.toString() || '');
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      nombre,
      tipo,
      limite: parseFloat(limite),
      diaCorte: tipo === 'Crédito' ? parseInt(diaCorte, 10) : null,
      diaPago: tipo === 'Crédito' ? parseInt(diaPago, 10) : null,
      rendimientoAnual: tipo === 'Débito' ? (parseFloat(rendimientoAnual) || 0) : 0,
    });
  };

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
          {/* Backdrop click to close */}
          <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
          
          <GlassCard
            as="div" // No es necesario animar GlassCard nativamente si envolvemos aquí, pero motion.div está en GlassCard ya.
            style={{ width: '100%', maxWidth: '380px', padding: '24px', zIndex: 1 }}
            {...modalTransition}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              {initialData ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tipo de Tarjeta</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setTipo('Crédito')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                      border: tipo === 'Crédito' ? '1px solid var(--brand)' : '1px solid var(--border-glass)',
                      background: tipo === 'Crédito' ? 'rgba(250, 104, 111, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: tipo === 'Crédito' ? 'var(--brand)' : 'var(--text-secondary)'
                    }}
                  >
                    Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('Débito')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                      border: tipo === 'Débito' ? '1px solid var(--brand)' : '1px solid var(--border-glass)',
                      background: tipo === 'Débito' ? 'rgba(250, 104, 111, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: tipo === 'Débito' ? 'var(--brand)' : 'var(--text-secondary)'
                    }}
                  >
                    Débito
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nombre</label>
                <input
                  type="text" required placeholder={tipo === 'Crédito' ? "Ej. Nu Bank" : "Ej. Débito BBVA"}
                  value={nombre} onChange={e => setNombre(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tipo === 'Crédito' ? 'Límite de Crédito (MXN)' : 'Saldo Inicial (MXN)'}</label>
                <input
                  type="number" required min={tipo === 'Crédito' ? "1" : "0"} step="0.01" placeholder={tipo === 'Crédito' ? "20000" : "5000"}
                  value={limite} onChange={e => setLimite(e.target.value)}
                  className="glass-input"
                />
              </div>

              <AnimatePresence>
                {tipo === 'Crédito' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ display: 'flex', gap: '14px', overflow: 'hidden' }}
                  >
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Día de Corte</label>
                      <input
                        type="number" required min="1" max="31" placeholder="15"
                        value={diaCorte} onChange={e => setDiaCorte(e.target.value)}
                        className="glass-input"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Día de Pago</label>
                      <input
                        type="number" required min="1" max="31" placeholder="5"
                        value={diaPago} onChange={e => setDiaPago(e.target.value)}
                        className="glass-input"
                      />
                    </div>
                  </motion.div>
                )}
                {tipo === 'Débito' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rendimiento Anual / TNA % (Opcional)</label>
                    <input
                      type="number" min="0" step="0.1" placeholder="Ej. 15.0"
                      value={rendimientoAnual} onChange={e => setRendimientoAnual(e.target.value)}
                      className="glass-input"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

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
                  {isPending ? 'Guardando...' : 'Guardar'}
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
