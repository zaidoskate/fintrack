import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, GlassSelect } from '@/components/ui';
import { CalendarDays, Calculator, Target, Info } from 'lucide-react';
import type { MetaConEstado, TarjetaConEstado } from '@/lib/types';
import { useEditarMeta } from '@/lib/hooks';
import { triggerHaptic, playSuccessChime } from '@/lib/ui/feedback';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

interface Props {
  isOpen: boolean;
  onClose: () => void;
  meta: MetaConEstado;
  tarjetasDebito: TarjetaConEstado[];
}

export function CalculadoraMetaModal({ isOpen, onClose, meta, tarjetasDebito }: Props) {
  const [modo, setModo] = useState<'fecha' | 'aporte'>('fecha');
  const [targetDate, setTargetDate] = useState('');
  const [aporteCantidad, setAporteCantidad] = useState('');
  const [aporteFrecuencia, setAporteFrecuencia] = useState<'diario' | 'semanal' | 'quincenal' | 'mensual'>('mensual');
  const [fuenteId, setFuenteId] = useState<string>(''); // id de tarjeta o apartado

  const { mutate: editar, isPending: editPending } = useEditarMeta();

  const faltante = Math.max(0, meta.costoObjetivo - meta.montoActual);

  // Generar opciones de fuentes de rendimiento
  const opcionesFuentes = useMemo(() => {
    const opts = [{ value: '', label: 'Sin cuenta asociada (0% APY)', apy: 0 }];
    tarjetasDebito.forEach(t => {
      if (t.rendimientoAnual > 0) {
        opts.push({ value: t.id, label: `${t.nombre} (${t.rendimientoAnual}% APY)`, apy: t.rendimientoAnual });
      }
      if (t.apartados) {
        t.apartados.forEach(a => {
          if (a.rendimientoAnual > 0) {
            opts.push({ value: a.id, label: `${a.nombre} (${a.rendimientoAnual}% APY)`, apy: a.rendimientoAnual });
          }
        });
      }
    });
    return opts;
  }, [tarjetasDebito]);

  // Si la meta ya tiene un aporte previo, preseleccionar esa fuente (tarjeta o apartado) si aún existe
  useEffect(() => {
    if (isOpen && meta.aportes.length > 0) {
      const ultimo = meta.aportes[0]; // están ordenados desc
      const srcId = ultimo.apartadoId || ultimo.tarjetaOrigenId;
      if (srcId && opcionesFuentes.some(o => o.value === srcId)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFuenteId(srcId);
      }
    }
  }, [isOpen, meta.aportes, opcionesFuentes]);

  const selectedApy = opcionesFuentes.find(o => o.value === fuenteId)?.apy || 0;

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
  }, [isOpen, meta.fechaObjetivo]);

  // Funciones rápidas para fecha
  const addMonths = (m: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    setTargetDate(d.toISOString().substring(0, 10));
  };
  const setEndOfYear = () => {
    const d = new Date(new Date().getFullYear(), 11, 31);
    setTargetDate(d.toISOString().substring(0, 10));
  };

  // Cálculos para Modo A: Calcular aporte según fecha
  const calculoFecha = useMemo(() => {
    if (modo !== 'fecha' || !targetDate || faltante <= 0) return null;
    const fechaObj = new Date(targetDate + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const diffTime = Math.max(0, fechaObj.getTime() - hoy.getTime());
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diasRestantes <= 0) return null;

    let cuotaDiaria = faltante / diasRestantes;
    let cuotaSemanal = faltante / (diasRestantes / 7);
    let cuotaQuincenal = faltante / (diasRestantes / 15.22);
    let cuotaMensual = faltante / (diasRestantes / 30.44);

    let ahorroInteresMXN = 0;

    if (selectedApy > 0) {
      const dr = (selectedApy / 100) / 365;
      const d = diasRestantes;
      // Formula FV = P * (((1+r)^t - 1) / r) => P = FV * r / (((1+r)^t - 1))
      cuotaDiaria = (faltante * dr) / (Math.pow(1 + dr, d) - 1);
      
      const totalAportado = cuotaDiaria * d;
      ahorroInteresMXN = Math.max(0, faltante - totalAportado);

      // Aproximaciones para las demás frecuencias
      cuotaSemanal = cuotaDiaria * 7;
      cuotaQuincenal = cuotaDiaria * 15.22;
      cuotaMensual = cuotaDiaria * 30.44;
    }

    return {
      diario: cuotaDiaria,
      semanal: cuotaSemanal,
      quincenal: cuotaQuincenal,
      mensual: cuotaMensual,
      ahorroInteresMXN,
      diasRestantes
    };
  }, [modo, targetDate, faltante, selectedApy]);

  // Cálculos para Modo B: Calcular fecha según aporte
  const calculoAporte = useMemo(() => {
    const cantidad = parseFloat(aporteCantidad);
    if (modo !== 'aporte' || !cantidad || cantidad <= 0 || faltante <= 0) return null;

    let periodosRestantes = faltante / cantidad;
    let diasRestantes = 0;
    
    // Convertir todo a ritmo diario para simplificar interés
    let aporteDiario = cantidad;
    switch(aporteFrecuencia) {
      case 'diario': aporteDiario = cantidad; break;
      case 'semanal': aporteDiario = cantidad / 7; break;
      case 'quincenal': aporteDiario = cantidad / 15.22; break;
      case 'mensual': aporteDiario = cantidad / 30.44; break;
    }

    let ahorroInteresMXN = 0;

    if (selectedApy > 0) {
      const dr = (selectedApy / 100) / 365;
      // t = ln(FV*r/P + 1) / ln(1+r)
      const t = Math.log((faltante * dr) / aporteDiario + 1) / Math.log(1 + dr);
      diasRestantes = t;
      
      const totalAportado = aporteDiario * diasRestantes;
      ahorroInteresMXN = Math.max(0, faltante - totalAportado);
      
      periodosRestantes = diasRestantes / (aporteDiario === cantidad ? 1 : (aporteFrecuencia === 'semanal' ? 7 : (aporteFrecuencia === 'quincenal' ? 15.22 : 30.44)));
    } else {
      diasRestantes = periodosRestantes * (aporteFrecuencia === 'diario' ? 1 : (aporteFrecuencia === 'semanal' ? 7 : (aporteFrecuencia === 'quincenal' ? 15.22 : 30.44)));
    }

    const fechaAlcanzada = new Date();
    fechaAlcanzada.setDate(fechaAlcanzada.getDate() + Math.ceil(diasRestantes));

    return {
      fecha: fechaAlcanzada,
      periodosRestantes: Math.ceil(periodosRestantes),
      diasRestantes: Math.ceil(diasRestantes),
      ahorroInteresMXN
    };
  }, [modo, aporteCantidad, aporteFrecuencia, faltante, selectedApy]);

  const fijarPlan = () => {
    let nuevaFecha: string | null = null;
    if (modo === 'fecha' && targetDate) nuevaFecha = targetDate;
    if (modo === 'aporte' && calculoAporte) nuevaFecha = calculoAporte.fecha.toISOString().substring(0, 10);
    
    if (nuevaFecha) {
      editar(
        { id: meta.id, campos: { fechaObjetivo: nuevaFecha } },
        {
          onSuccess: () => {
            triggerHaptic('success');
            playSuccessChime();
            onClose();
          }
        }
      );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '16px'
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
        
        <GlassCard style={{ width: '100%', maxWidth: '440px', padding: '24px', zIndex: 1, position: 'relative', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(18, 18, 20, 0.85)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
              <Calculator size={18} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Simulador de Ahorro</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Te faltan {fmt.format(faltante)} para tu meta</div>
            </div>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', marginBottom: '16px' }}>
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

          <div style={{ marginBottom: '20px', zIndex: 20, position: 'relative' }}>
             <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Instrumento de inversión (Opcional)</label>
             <GlassSelect 
               value={fuenteId}
               onChange={(val) => setFuenteId(val)}
               options={opcionesFuentes.map(o => ({ value: o.value, label: o.label }))}
               placeholder="Selecciona tarjeta o apartado"
             />
          </div>

          {faltante <= 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--credito-verde)' }}>
              ¡Ya has alcanzado esta meta!
            </div>
          ) : (
            <div style={{ minHeight: '260px' }}>
              <AnimatePresence mode="wait">
                {modo === 'fecha' ? (
                  <motion.div key="fecha" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>¿Para cuándo lo quieres?</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => addMonths(3)} style={presetBtn}>+3m</button>
                          <button onClick={() => addMonths(6)} style={presetBtn}>+6m</button>
                          <button onClick={() => addMonths(12)} style={presetBtn}>+1a</button>
                          <button onClick={setEndOfYear} style={presetBtn}>Fin de año</button>
                        </div>
                      </div>
                      <input 
                        type="date" 
                        value={targetDate} 
                        onChange={(e) => setTargetDate(e.target.value)} 
                        style={{ width: '100%', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '15px', outline: 'none' }}
                      />
                    </div>
                    
                    {calculoFecha ? (
                      <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Diariamente</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt.format(calculoFecha.diario)} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ día</span></span>
                          </div>
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Semanalmente</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt.format(calculoFecha.semanal)} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ sem</span></span>
                          </div>
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Quincenalmente</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt.format(calculoFecha.quincenal)} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ quin</span></span>
                          </div>
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '16px', color: 'var(--brand)', fontWeight: 600 }}>Mensualmente</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--brand)' }}>{fmt.format(calculoFecha.mensual)} <span style={{ fontSize: '12px', color: 'var(--brand)', opacity: 0.8 }}>/ mes</span></span>
                          </div>
                        </div>

                        {calculoFecha.ahorroInteresMXN > 0 && (
                          <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(168, 255, 120, 0.08)', borderRadius: '8px', border: '1px solid rgba(168, 255, 120, 0.2)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <Info size={16} color="var(--credito-verde)" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ fontSize: '12px', color: 'var(--credito-verde)', lineHeight: 1.4 }}>
                              Con tu rendimiento del {selectedApy}% APY, te ahorras <strong>{fmt.format(calculoFecha.ahorroInteresMXN)} MXN</strong> en aportaciones directas por interés compuesto.
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={fijarPlan}
                          disabled={editPending}
                          style={{ width: '100%', marginTop: '16px', padding: '12px', background: 'var(--brand)', border: 'none', borderRadius: '10px', color: '#1a0a0b', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          <Target size={16} /> Guardar plan (Meta: {targetDate})
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
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
                          style={{ flex: 1, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '15px', outline: 'none' }}
                        />
                        <select
                          value={aporteFrecuencia}
                          onChange={(e) => setAporteFrecuencia(e.target.value as 'diario' | 'semanal' | 'quincenal' | 'mensual')}
                          style={{ width: '130px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '12px', color: 'var(--text-primary)', fontSize: '14px', appearance: 'none', outline: 'none' }}
                        >
                          <option value="diario" style={{ color: 'black' }}>Al día</option>
                          <option value="semanal" style={{ color: 'black' }}>A la sem</option>
                          <option value="quincenal" style={{ color: 'black' }}>A la quin</option>
                          <option value="mensual" style={{ color: 'black' }}>Al mes</option>
                        </select>
                      </div>
                    </div>

                    {calculoAporte ? (
                      <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <CalendarDays size={28} color="var(--brand)" style={{ marginBottom: '12px' }} />
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Lograrás tu meta en aprox. <strong>{calculoAporte.periodosRestantes} pagos</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          Fecha exacta estimada de cumplimiento:
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {calculoAporte.fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>

                        {calculoAporte.ahorroInteresMXN > 0 && (
                          <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(168, 255, 120, 0.08)', borderRadius: '8px', border: '1px solid rgba(168, 255, 120, 0.2)', display: 'flex', gap: '8px', alignItems: 'flex-start', textAlign: 'left', width: '100%' }}>
                            <Info size={16} color="var(--credito-verde)" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ fontSize: '12px', color: 'var(--credito-verde)', lineHeight: 1.4 }}>
                              Con tu rendimiento del {selectedApy}% APY, te ahorras <strong>{fmt.format(calculoAporte.ahorroInteresMXN)} MXN</strong> en aportaciones directas.
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={fijarPlan}
                          disabled={editPending}
                          style={{ width: '100%', marginTop: '16px', padding: '12px', background: 'var(--brand)', border: 'none', borderRadius: '10px', color: '#1a0a0b', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          <Target size={16} /> Fijar esta fecha estimada como mi meta
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Ingresa un monto para ver cuándo lograrás tu meta.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', padding: '8px 16px', fontWeight: 500 }}>
              Cerrar Simulador
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}

const presetBtn: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  padding: '4px 8px',
  borderRadius: '6px',
  cursor: 'pointer'
};
