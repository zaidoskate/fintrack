'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { GlassCard } from '@/components/ui';
import { X, TrendingDown, Clock, Info } from 'lucide-react';
import type { Prestamo } from '@/lib/types';
import { calcularCuotaMensual, generarTablaAmortizacion, simularAbonoCapital } from '@/lib/finance/prestamos';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function PrestamoDetalleModal({ prestamo, onClose }: { prestamo: Prestamo, onClose: () => void }) {
  const [tab, setTab] = useState<'info' | 'amortizacion' | 'simulador'>('info');
  const [abonoExtra, setAbonoExtra] = useState('');

  const cuotaMensual = useMemo(() => {
    return calcularCuotaMensual(prestamo.montoOriginal, prestamo.tasaAnual, prestamo.plazoMesesTotales);
  }, [prestamo.montoOriginal, prestamo.tasaAnual, prestamo.plazoMesesTotales]);

  const tablaOriginal = useMemo(() => {
    return generarTablaAmortizacion(prestamo.montoOriginal, prestamo.tasaAnual, prestamo.plazoMesesTotales);
  }, [prestamo.montoOriginal, prestamo.tasaAnual, prestamo.plazoMesesTotales]);

  const impacto = useMemo(() => {
    const amt = parseFloat(abonoExtra.replace(/[,$\s]/g, ''));
    if (!amt || amt <= 0 || amt >= prestamo.saldoInsoluto) return null;
    return simularAbonoCapital(prestamo.saldoInsoluto, prestamo.tasaAnual, (prestamo.plazoMesesTotales - prestamo.mesesPagados), cuotaMensual, amt);
  }, [abonoExtra, prestamo.saldoInsoluto, prestamo.tasaAnual, prestamo.plazoMesesTotales, prestamo.mesesPagados, cuotaMensual]);

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '16px' }}
    >
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <GlassCard style={{ width: '100%', maxWidth: '500px', zIndex: 1, maxHeight: '90vh', overflowY: 'auto', background: 'rgba(18, 12, 14, 0.94)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#fff', fontFamily: 'var(--font-display)' }}>{prestamo.nombre}</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{prestamo.contacto || prestamo.tipo} • {prestamo.direccion === 'pasivo' ? 'Deuda' : 'Préstamo a cobrar'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
          {(['info', 'amortizacion', 'simulador'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t ? 'rgba(255,255,255,0.12)' : 'transparent', color: tab === t ? '#fff' : 'var(--text-muted)', textTransform: 'capitalize' }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Saldo Insoluto</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmt.format(prestamo.saldoInsoluto)}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Cuota Mensual</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmt.format(cuotaMensual)}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Tasa de Interés</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>{prestamo.tasaAnual}% Anual</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Plazo</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>{(prestamo.plazoMesesTotales - prestamo.mesesPagados)} / {prestamo.plazoMesesTotales} meses</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'amortizacion' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 2fr', gap: '8px', padding: '0 8px 8px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
              <div>Mes</div>
              <div style={{ textAlign: 'right' }}>Capital</div>
              <div style={{ textAlign: 'right' }}>Interés</div>
              <div style={{ textAlign: 'right' }}>Saldo</div>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingTop: '8px' }}>
              {tablaOriginal.map(row => (
                <div key={row.mes} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 2fr', gap: '8px', padding: '8px', fontSize: '12px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>{row.mes}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt.format(row.capital)}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--credito-rojo)' }}>{fmt.format(row.interes)}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt.format(row.saldoRestante)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'simulador' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Monto a abonar a capital</label>
              <input
                type="text"
                inputMode="decimal"
                value={abonoExtra}
                onChange={(e) => setAbonoExtra(e.target.value)}
                placeholder="$0.00"
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '16px', outline: 'none' }}
              />
            </div>

            {impacto && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', color: 'var(--credito-verde)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}><Clock size={16} /> Opción 1: Reducir Plazo</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Nuevos meses restantes:</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{impacto.reduccionPlazo.nuevosMesesTotales} meses</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tiempo ahorrado:</span>
                    <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{impacto.reduccionPlazo.mesesAhorrados} meses</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Intereses ahorrados:</span>
                    <span style={{ color: 'var(--credito-verde)', fontWeight: 600 }}>{fmt.format(impacto.reduccionPlazo.interesAhorrado)}</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}><TrendingDown size={16} /> Opción 2: Reducir Mensualidad</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Nueva cuota:</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{fmt.format(impacto.reduccionCuota.nuevaCuota)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Intereses ahorrados:</span>
                    <span style={{ color: 'var(--credito-verde)', fontWeight: 600 }}>{fmt.format(impacto.reduccionCuota.interesAhorrado)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0 }}>En la mayoría de los casos, <strong>reducir plazo</strong> te ahorrará más dinero a largo plazo, mientras que <strong>reducir mensualidad</strong> mejorará tu flujo de caja inmediato.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}