import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '@/components/ui';
import { CalendarDays, Calculator, Target } from 'lucide-react';
import type { MetaConEstado } from '@/lib/types';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

interface Props {
  isOpen: boolean;
  onClose: () => void;
  meta: MetaConEstado;
}

export function CalculadoraMetaModal({ isOpen, onClose, meta }: Props) {
  const [modo, setModo] = useState<'fecha' | 'aporte'>('fecha');
  const [targetDate, setTargetDate] = useState('');
  const [aporteCantidad, setAporteCantidad] = useState('');
  const [aporteFrecuencia, setAporteFrecuencia] = useState<'diario' | 'semanal' | 'quincenal' | 'mensual'>('mensual');

  const faltante = Math.max(0, meta.costoObjetivo - meta.montoActual);

  // Reiniciar estado al abrir
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetDate(meta.fechaObjetivo || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAporteCantidad('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAporteFrecuencia('mensual');
    }
  }, [isOpen, meta]);

  // Cálculos para Modo A: Calcular aporte según fecha
  const calculoFecha = useMemo(() => {
    if (modo !== 'fecha' || !targetDate || faltante <= 0) return null;
    const fechaObj = new Date(targetDate + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const diffTime = Math.max(0, fechaObj.getTime() - hoy.getTime());
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diasRestantes <= 0) return null;

    return {
      diario: faltante / diasRestantes,
      semanal: faltante / (diasRestantes / 7),
      quincenal: faltante / (diasRestantes / 15.22),
      mensual: faltante / (diasRestantes / 30.44),
      diasRestantes
    };
  }, [modo, targetDate, faltante]);

  // Cálculos para Modo B: Calcular fecha según aporte
  const calculoAporte = useMemo(() => {
    const cantidad = parseFloat(aporteCantidad);
    if (modo !== 'aporte' || !cantidad || cantidad <= 0 || faltante <= 0) return null;

    const periodosRestantes = faltante / cantidad;
    let diasRestantes = 0;
    
    switch(aporteFrecuencia) {
      case 'diario': diasRestantes = periodosRestantes; break;
      case 'semanal': diasRestantes = periodosRestantes * 7; break;
      case 'quincenal': diasRestantes = periodosRestantes * 15.22; break;
      case 'mensual': diasRestantes = periodosRestantes * 30.44; break;
    }

    const fechaAlcanzada = new Date();
    fechaAlcanzada.setDate(fechaAlcanzada.getDate() + Math.ceil(diasRestantes));

    return {
      fecha: fechaAlcanzada,
      periodosRestantes: Math.ceil(periodosRestantes),
      diasRestantes: Math.ceil(diasRestantes)
    };
  }, [modo, aporteCantidad, aporteFrecuencia, faltante]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', padding: '16px'
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
        
        <GlassCard style={{ width: '100%', maxWidth: '420px', padding: '24px', zIndex: 1, position: 'relative', marginBottom: 'env(safe-area-inset-bottom, 20px)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
              <Calculator size={18} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Simulador de Ahorro</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Te faltan {fmt.format(faltante)} para tu meta</div>
            </div>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
            <button
              onClick={() => setModo('fecha')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: modo === 'fecha' ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: modo === 'fecha' ? '#fff' : 'var(--text-muted)'
              }}
            >
              Definir Fecha
            </button>
            <button
              onClick={() => setModo('aporte')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: modo === 'aporte' ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: modo === 'aporte' ? '#fff' : 'var(--text-muted)'
              }}
            >
              Definir Aporte
            </button>
          </div>

          {faltante <= 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--credito-verde)' }}>
              ¡Ya has alcanzado esta meta!
            </div>
          ) : (
            <div style={{ minHeight: '220px' }}>
              <AnimatePresence mode="wait">
                {modo === 'fecha' ? (
                  <motion.div key="fecha" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>¿Para cuándo lo quieres?</label>
                      <input 
                        type="date" 
                        value={targetDate} 
                        onChange={(e) => setTargetDate(e.target.value)} 
                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '15px' }}
                      />
                    </div>
                    
                    {calculoFecha ? (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Target size={14} /> Para llegar en {calculoFecha.diasRestantes} días deberás ahorrar:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Diariamente</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt.format(calculoFecha.diario)}</span>
                          </div>
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Semanalmente</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt.format(calculoFecha.semanal)}</span>
                          </div>
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--brand)' }}>Mensualmente</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--brand)' }}>{fmt.format(calculoFecha.mensual)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Selecciona una fecha futura para ver tus proyecciones.
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="aporte" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>¿Cuánto puedes aportar?</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="number" 
                          placeholder="Monto"
                          value={aporteCantidad} 
                          onChange={(e) => setAporteCantidad(e.target.value)} 
                          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '15px' }}
                        />
                        <select
                          value={aporteFrecuencia}
                          onChange={(e) => setAporteFrecuencia(e.target.value as 'diario' | 'semanal' | 'quincenal' | 'mensual')}
                          style={{ width: '130px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px', color: 'var(--text-primary)', fontSize: '14px', appearance: 'none' }}
                        >
                          <option value="diario">Al día</option>
                          <option value="semanal">A la sem</option>
                          <option value="quincenal">A la quin</option>
                          <option value="mensual">Al mes</option>
                        </select>
                      </div>
                    </div>

                    {calculoAporte ? (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <CalendarDays size={24} color="var(--brand)" style={{ marginBottom: '12px' }} />
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Lograrás tu meta en aprox. <strong>{calculoAporte.periodosRestantes} pagos</strong> ({calculoAporte.diasRestantes} días)
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          Fecha estimada de cumplimiento:
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {calculoAporte.fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Ingresa un monto para ver cuándo lograrás tu meta.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button onClick={onClose} style={{ width: '100%', marginTop: '20px', padding: '14px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
            Cerrar Simulador
          </button>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}
