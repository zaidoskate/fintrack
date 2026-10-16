'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HandCoins, ChevronRight, X, CheckCircle, Trash2 } from 'lucide-react';
import { useCuentasPorCobrar, useSaldarCuenta, useTarjetas, useAsumirDeudaCompleta } from '@/lib/hooks';
import type { CuentaPorCobrar } from '@/lib/types';
import { createPortal } from 'react-dom';
import { ConfirmModal } from '@/components/ui';
import { playSuccessChime, triggerHaptic } from '@/lib/ui/feedback';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function CuentasPorCobrarCard() {
  const { data: cuentas = [] } = useCuentasPorCobrar();
  const pendientes = cuentas.filter(c => c.estado === 'pendiente');
  const [modalOpen, setModalOpen] = useState(false);

  const totalPendiente = pendientes.reduce((acc, c) => acc + (c.montoTotal - c.montoSaldado), 0);
  const totalDeudores = new Set(pendientes.map(c => c.deudor)).size;

  if (pendientes.length === 0) return null;

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className="h-[52px] min-h-[52px] px-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <HandCoins size={16} />
          </div>
          <div className="ml-2 flex items-center">
            <span className="text-xs font-semibold text-zinc-200">Por cobrar</span>
            <span className="text-[11px] font-medium text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full ml-2">
              {totalDeudores} deudores
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums text-sm sm:text-base font-semibold text-zinc-100">
            {fmt.format(totalPendiente)}
          </span>
          <div className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-zinc-300 border border-white/10 flex items-center justify-center transition-all shrink-0">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && <CuentasPorCobrarModal onClose={() => setModalOpen(false)} cuentas={pendientes} />}
      </AnimatePresence>
    </>
  );
}

function CuentasPorCobrarModal({ onClose, cuentas }: { onClose: () => void; cuentas: CuentaPorCobrar[] }) {
  const [cuentaActiva, setCuentaActiva] = useState<CuentaPorCobrar | null>(null);

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(18, 12, 14, 0.94)', borderTop: '1px solid var(--border-glass)',
          borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
          padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          maxHeight: '90vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontFamily: 'var(--font-display)', color: '#fff' }}>
            Cuentas por Cobrar
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {cuentaActiva ? (
          <SaldarCuentaView cuenta={cuentaActiva} onBack={() => setCuentaActiva(null)} onClose={onClose} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cuentas.map(c => (
              <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{c.deudor}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{c.concepto}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--credito-amarillo)' }}>
                      {fmt.format(c.montoTotal - c.montoSaldado)}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                      Pendiente de {fmt.format(c.montoTotal)}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setCuentaActiva(c)} style={{ flex: 1, background: 'var(--credito-verde)', border: 'none', borderRadius: '8px', height: '40px', color: '#111', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                    <CheckCircle size={16} /> Saldar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}

function SaldarCuentaView({ cuenta, onBack, onClose }: { cuenta: CuentaPorCobrar; onBack: () => void; onClose: () => void }) {
  const { data: tarjetas = [] } = useTarjetas();
  const { mutateAsync: saldarAsync } = useSaldarCuenta();
  const { mutateAsync: asumirAsync } = useAsumirDeudaCompleta();
  const [metodo, setMetodo] = useState('Efectivo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAsumiendo, setIsAsumiendo] = useState(false);
  const [showConfirmAsumir, setShowConfirmAsumir] = useState(false);

  const pendiente = cuenta.montoTotal - cuenta.montoSaldado;

  const handleAsumir = () => {
    setShowConfirmAsumir(true);
  };

  const ejecutarAsumir = async () => {
    setShowConfirmAsumir(false);
    setIsAsumiendo(true);
    try {
      await asumirAsync({
        cuentaId: cuenta.id,
        movimientoId: cuenta.movimientoId
      });
      triggerHaptic('success');
      playSuccessChime();
      onClose();
    } catch (err) {
      console.error(err);
      triggerHaptic('warning');
    } finally {
      setIsAsumiendo(false);
    }
  };

  const handleSaldar = async () => {
    setIsSubmitting(true);
    try {
      const tarjetaId = metodo === 'Efectivo' ? null : tarjetas.find(t => t.nombre === metodo)?.id || null;
      await saldarAsync({
        cuentaId: cuenta.id,
        montoSaldar: pendiente,
        tarjetaDestinoId: tarjetaId
      });
      triggerHaptic('success');
      playSuccessChime();
      onClose();
    } catch (err) {
      console.error(err);
      triggerHaptic('warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Vas a registrar el cobro de <strong>{fmt.format(pendiente)}</strong> de {cuenta.deudor}.
      </p>

      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
        ¿A dónde entró este dinero?
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        <button
          onClick={() => setMetodo('Efectivo')}
          style={{ padding: '0 16px', height: '40px', borderRadius: '10px', border: metodo === 'Efectivo' ? '1px solid var(--brand)' : '1px solid var(--border-glass)', background: metodo === 'Efectivo' ? 'rgba(250,104,111,0.1)' : 'rgba(255,255,255,0.05)', color: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          Efectivo
        </button>
        {tarjetas.map(t => (
          <button
            key={t.id}
            onClick={() => setMetodo(t.nombre)}
            style={{ padding: '0 16px', height: '40px', borderRadius: '10px', border: metodo === t.nombre ? '1px solid var(--brand)' : '1px solid var(--border-glass)', background: metodo === t.nombre ? 'rgba(250,104,111,0.1)' : 'rgba(255,255,255,0.05)', color: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {t.nombre} ({t.tipo})
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={onBack} disabled={isSubmitting || isAsumiendo} style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Volver
        </button>
        <button onClick={handleSaldar} disabled={isSubmitting || isAsumiendo} style={{ flex: 2, height: '40px', padding: '0 16px', borderRadius: '10px', border: 'none', background: 'var(--credito-verde)', color: '#111', fontWeight: 600, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isSubmitting ? 'Registrando...' : 'Confirmar Cobro'}
        </button>
      </div>

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', textAlign: 'center' }}>
        <button 
          onClick={handleAsumir} 
          disabled={isSubmitting || isAsumiendo} 
          style={{ background: 'transparent', height: '40px', border: 'none', color: 'var(--credito-rojo)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0 auto', opacity: isAsumiendo ? 0.5 : 1 }}
        >
          <Trash2 size={16} /> {isAsumiendo ? 'Asumiendo...' : 'Asumir gasto (Condonar)'}
        </button>
      </div>

      <ConfirmModal
        isOpen={showConfirmAsumir}
        title="Asumir gasto (Condonar)"
        message="¿Estás seguro de asumir el gasto completo? Esto borrará esta cuenta por cobrar y el gasto se contabilizará 100% como tuyo."
        onConfirm={ejecutarAsumir}
        onCancel={() => setShowConfirmAsumir(false)}
        isDestructive
        confirmText="Asumir gasto"
      />
    </div>
  );
}
