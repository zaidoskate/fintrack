'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '@/lib/motion/variants';
import { GlassCard } from '@/components/ui';
import { useMovimientos, useCrearMovimiento, useEliminarMovimiento } from '@/lib/hooks';
import type { TarjetaConEstado, Movimiento } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Edit2, Trash2, Search } from 'lucide-react';
import { RegistroForm } from './RegistroForm';

const fmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface MovimientosTarjetaModalProps {
  tarjeta: TarjetaConEstado | null;
  onClose: () => void;
}

export function MovimientosTarjetaModal({ tarjeta, onClose }: MovimientosTarjetaModalProps) {
  const { modalTransition } = useMotionConfig();
  const { data: movimientos = [], isLoading } = useMovimientos(
    tarjeta ? { metodoPago: tarjeta.nombre, limit: 50 } : undefined
  );
  
  const { mutate: crearMovimiento, isPending } = useCrearMovimiento();
  const { mutate: eliminarMov } = useEliminarMovimiento();
  const [payMode, setPayMode] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarjeta) return;
    crearMovimiento({
      tipo: 'Ingreso',
      monto: parseFloat(payAmount),
      metodoPago: tarjeta.nombre,
      categoria: 'Pago de tarjeta',
      comercio: 'Pago',
    }, {
      onSuccess: () => {
        setPayMode(false);
        setPayAmount('');
      }
    });
  };

  // Filtrar y Agrupar por mes
  const grouped = useMemo(() => {
    const filtered = movimientos.filter(m => 
      !searchTerm || 
      m.comercio?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.monto.toString().includes(searchTerm)
    );
    
    const groups: Record<string, Movimiento[]> = {};
    for (const mov of filtered) {
      const date = new Date(mov.fecha + 'T00:00:00');
      const key = date.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
      const capKey = key.charAt(0).toUpperCase() + key.slice(1);
      if (!groups[capKey]) groups[capKey] = [];
      groups[capKey].push(mov);
    }
    return groups;
  }, [movimientos, searchTerm]);

  return (
    <AnimatePresence>
      {tarjeta && (
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
            as="div"
            style={{ width: '100%', maxWidth: '420px', padding: '24px', zIndex: 1, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            {...modalTransition}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)' }}>
                  Movimientos
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tarjeta.nombre}</div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}
              >
                ×
              </button>
            </div>

            {editingMov ? (
              <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <RegistroForm initialData={editingMov} onClose={() => setEditingMov(null)} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Buscar comercio, categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '10px',
                      padding: '10px 12px 10px 36px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {tarjeta.tipo === 'Crédito' && (
                  <div style={{ marginBottom: '20px' }}>
                <AnimatePresence mode="wait">
                  {!payMode ? (
                    <motion.button
                      key="btn-pay"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={() => setPayMode(true)}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                        background: 'var(--brand)', color: '#1a0a0b', fontWeight: 600,
                        cursor: 'pointer', fontSize: '14px'
                      }}
                    >
                      Registrar Pago
                    </motion.button>
                  ) : (
                    <motion.form
                      key="form-pay"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onSubmit={handlePaySubmit}
                      style={{
                        background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                        Monto a pagar (MXN)
                      </label>
                      <input
                        type="number" required min="1" step="0.01" placeholder="Ej. 5000"
                        value={payAmount} onChange={e => setPayAmount(e.target.value)}
                        className="glass-input"
                        style={{ marginBottom: '12px', width: '100%' }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="submit"
                          disabled={isPending}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                            background: 'var(--brand)', color: '#1a0a0b', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          {isPending ? '...' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayMode(false)}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)',
                            background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', cursor: 'pointer'
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                overflowY: 'auto', 
                paddingRight: '10px',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}>
                {isLoading && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Cargando movimientos...
                  </div>
                )}
                
                {!isLoading && movimientos.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    No hay movimientos registrados.
                  </div>
                )}
              
                {!isLoading && Object.entries(grouped).map(([mes, movs]) => (
                  <div key={mes} style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                      marginBottom: '10px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      paddingBottom: '4px'
                    }}>
                      {mes}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {movs.map((mov) => (
                        <div key={mov.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {mov.comercio || mov.categoria}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {fmtFecha(mov.fecha)} · {mov.tipo === 'Ingreso' ? 'Ingreso' : mov.categoria}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              fontSize: '15px',
                              color: mov.tipo === 'Ingreso' ? 'var(--credito-verde)' : 'var(--text-primary)',
                              textAlign: 'right'
                            }}>
                              {mov.tipo === 'Ingreso' ? '+' : '-'}{fmt.format(mov.monto)}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setEditingMov(mov)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                aria-label="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('¿Eliminar este movimiento?')) {
                                    eliminarMov(mov.id);
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--credito-rojo)', cursor: 'pointer', padding: '4px', opacity: 0.8 }}
                                aria-label="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
