'use client';

/**
 * TarjetaCard — FR-09 a FR-14.
 * Tarjeta minimalista: nombre + acciones, saldo actual, disponible y termómetro de uso.
 * MSI y apartados se muestran en el submenú de la vista principal (MsiApartadosPanel).
 *
 * Toda la data viene del hook useTarjetas() — NFR-06b: ningún fetch directo aquí.
 */

import { useState, useEffect, useRef } from 'react';
import { GlassCard, ConfirmModal } from '@/components/ui';
import type { TarjetaConEstado } from '@/lib/types';
import { Pencil, Trash, RefreshCcw } from 'lucide-react';

/* Formatea monto MXN (es-MX, formato moneda sin decimales si son .00) */
const fmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/* Formatea fecha YYYY-MM-DD → dd/mm/aaaa */
function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface TarjetaCardProps {
  tarjeta: TarjetaConEstado;
  showFlags?: boolean;
  variant?: 'full' | 'compact';
  showBalance?: boolean;
  onEdit?: (tarjeta: TarjetaConEstado) => void;
  onDelete?: (tarjetaId: string) => void;
  onViewDetails?: (tarjeta: TarjetaConEstado) => void;
  onAjustarSaldo?: (tarjeta: TarjetaConEstado) => void;
}

const iconBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' };

export function TarjetaCard({ tarjeta, showFlags = true, variant = 'full', showBalance = true, onEdit, onDelete, onViewDetails, onAjustarSaldo }: TarjetaCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Efecto Tilt 3D
  const cardRef = useRef<HTMLElement>(null);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const x = Math.min(Math.max((e.gamma + 90) / 1.8, 0), 100);
        const y = Math.min(Math.max((e.beta + 90) / 1.8, 0), 100);
        setGlarePos({ x, y, opacity: 0.15 });
      }
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePos({ x, y, opacity: 0.2 });
  };

  const handleMouseLeave = () => {
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  };

  const esCredito = tarjeta.tipo === 'Crédito';
  const saldoActual = esCredito ? tarjeta.gastosPeriodoActual : tarjeta.disponible;
  const mask = (n: number) => (showBalance ? fmt.format(n) : '••••');

  return (
    <GlassCard
      ref={cardRef}
      glow={(!showFlags || !esCredito) ? 'none' : tarjeta.estadoTermometro === 'verde' ? 'none' : tarjeta.estadoTermometro}
      as="article"
      className="w-full relative rounded-2xl border border-white/15 shadow-2xl transition-transform h-[190px] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${tarjeta.color === 'blue' ? '#0f172a, #1e3a8a' : tarjeta.color === 'green' ? '#064e3b, #047857' : tarjeta.color === 'purple' ? '#2e1065, #581c87' : tarjeta.color === 'red' ? '#450a0a, #991b1b' : '#09090b, #18181b'})`,
        padding: '16px 20px',
        cursor: onViewDetails ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => onViewDetails?.(tarjeta)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Tilt Specular Reflection */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.4), transparent 60%)`,
        opacity: glarePos.opacity,
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Bloque primario: nombre + acciones */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '20px',
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}>
            {tarjeta.nombre}
          </span>
          {variant !== 'compact' && (
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {onEdit && (
                <button onClick={(e) => { e.stopPropagation(); onEdit(tarjeta); }} aria-label="Editar tarjeta" style={iconBtn}>
                  <Pencil size={16} />
                </button>
              )}
              {!esCredito && onAjustarSaldo && (
                <button onClick={(e) => { e.stopPropagation(); onAjustarSaldo(tarjeta); }} aria-label="Ajustar saldo" title="Ajustar saldo" style={iconBtn}>
                  <RefreshCcw size={16} />
                </button>
              )}
              {onDelete && (
                <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} aria-label="Eliminar tarjeta" style={iconBtn}>
                  <Trash size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bloque secundario: saldo actual, disponible y barra de uso */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '14px',
            fontVariantNumeric: 'tabular-nums',
            color: !esCredito && tarjeta.disponible < 0 ? '#f87171' : '#fff',
          }}>
            <span style={{ fontFamily: 'inherit', fontWeight: 400, color: 'rgba(255,255,255,0.6)', marginRight: '6px' }}>Saldo actual</span>
            {mask(saldoActual)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            {esCredito ? (
              <>
                <span>Disponible {mask(tarjeta.disponible)}</span>
                {tarjeta.proximoPago && <span>Pago {fmtFecha(tarjeta.proximoPago)} ({tarjeta.diasParaPago}d)</span>}
              </>
            ) : tarjeta.disponible < 0 ? (
              showFlags && <span style={{ color: 'var(--credito-rojo)', fontWeight: 600 }}>Sobregiro</span>
            ) : tarjeta.rendimientoAnual > 0 ? (
              <span style={{ color: 'var(--credito-verde)' }}>{tarjeta.rendimientoAnual}% rendimientos</span>
            ) : (
              <span>Disponible {mask(tarjeta.disponible)}</span>
            )}
          </div>

          <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: '2px' }}>
            {esCredito && (
              <div style={{
                height: '100%',
                width: `${Math.min(tarjeta.porcentajeUso, 100)}%`,
                background: tarjeta.estadoTermometro === 'verde'
                  ? 'var(--credito-verde)'
                  : tarjeta.estadoTermometro === 'amarillo'
                  ? 'var(--credito-amarillo)'
                  : 'var(--credito-rojo)',
                borderRadius: '2px',
                transition: 'width 0.6s ease',
              }} />
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Eliminar Tarjeta"
          message={`¿Estás seguro de eliminar la tarjeta ${tarjeta.nombre}? Esta acción no se puede deshacer y borrará todos sus datos asociados si no están respaldados.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          isDestructive
          onConfirm={() => {
            onDelete?.(tarjeta.id);
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </GlassCard>
  );
}
