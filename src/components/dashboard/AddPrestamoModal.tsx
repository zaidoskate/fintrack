'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { GlassCard } from '@/components/ui';
import { X, Loader2 } from 'lucide-react';
import { useCrearPrestamo } from '@/lib/hooks';

export function AddPrestamoModal({ onClose }: { onClose: () => void }) {
  const [nombre, setNombre] = useState('');
  const [entidad, setEntidad] = useState('');
  const [direccion, setDireccion] = useState<'pasivo' | 'activo'>('pasivo');
  const [montoOriginal, setMontoOriginal] = useState('');
  const [tasaAnual, setTasaAnual] = useState('');
  const [plazoMeses, setPlazoMeses] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);

  const { mutateAsync: crearAsync, isPending } = useCrearPrestamo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mo = parseFloat(montoOriginal);
    const pm = parseInt(plazoMeses, 10);
    const t = parseFloat(tasaAnual) || 0;
    
    if (!nombre || mo <= 0 || pm <= 0) return;

    // Calcular cuota mensual (simplificada si no hay tasa, usar fórmula si la hay)
    let cuota = mo / pm;
    if (t > 0) {
      const r = (t / 100) / 12;
      cuota = (mo * r) / (1 - Math.pow(1 + r, -pm));
    }

    try {
      await crearAsync({
        nombre,
        tipo: 'personal_bancario',
        direccion,
        montoOriginal: mo,
        saldoInsoluto: mo,
        tasaAnual: t,
        plazoMesesTotales: pm,
        mesesPagados: 0,
        cuotaMensual: cuota,
        diaPago: 1,
        fechaInicio,
        contacto: entidad
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(10px)', padding: '16px' }}
    >
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <GlassCard style={{ width: '100%', maxWidth: '400px', zIndex: 1, padding: '24px', background: 'rgba(18, 12, 14, 0.94)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', fontFamily: 'var(--font-display)' }}>Registrar Préstamo</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
            <button type="button" onClick={() => setDireccion('pasivo')} style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer', background: direccion === 'pasivo' ? 'rgba(255,255,255,0.12)' : 'transparent', color: direccion === 'pasivo' ? '#fff' : 'var(--text-muted)' }}>Deuda (Me prestaron)</button>
            <button type="button" onClick={() => setDireccion('activo')} style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer', background: direccion === 'activo' ? 'rgba(255,255,255,0.12)' : 'transparent', color: direccion === 'activo' ? '#fff' : 'var(--text-muted)' }}>Por Cobrar (Presté)</button>
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Nombre / Concepto</label>
            <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 14px', color: '#fff' }} />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Entidad / Contacto</label>
            <input type="text" value={entidad} onChange={e => setEntidad(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 14px', color: '#fff' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Monto Total</label>
              <input required type="number" step="0.01" value={montoOriginal} onChange={e => setMontoOriginal(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 14px', color: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Tasa Anual (%)</label>
              <input required type="number" step="0.1" value={tasaAnual} onChange={e => setTasaAnual(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 14px', color: '#fff' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Plazo (Meses)</label>
              <input required type="number" value={plazoMeses} onChange={e => setPlazoMeses(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 14px', color: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Fecha Inicio</label>
              <input required type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 14px', color: '#fff', colorScheme: 'dark' }} />
            </div>
          </div>

          <button type="submit" disabled={isPending} style={{ width: '100%', background: 'var(--brand)', color: '#000', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 600, marginTop: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {isPending ? <Loader2 className="animate-spin" size={20} /> : 'Registrar'}
          </button>
        </form>
      </GlassCard>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
