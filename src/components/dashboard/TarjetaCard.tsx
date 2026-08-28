'use client';

/**
 * TarjetaCard — FR-09 a FR-14 + FR-31.
 * Muestra el termómetro de crédito de una tarjeta con GlassCard + StatusPill.
 * Incluye sección expandible de compras MSI activas de esa tarjeta (FR-31).
 *
 * Toda la data viene del hook useTarjetas() + useComprasMSI() —
 * NFR-06b: ningún fetch directo aquí.
 */

import { useState } from 'react';
import { GlassCard, StatusPill, ConfirmModal } from '@/components/ui';
import type { TarjetaConEstado, CompraMSI, MetaConEstado } from '@/lib/types';
import { Pencil, Trash } from 'lucide-react';

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
  comprasMSI: CompraMSI[];
  metas?: MetaConEstado[];
  showFlags?: boolean;
  variant?: 'full' | 'compact';
  onEdit?: (tarjeta: TarjetaConEstado) => void;
  onDelete?: (tarjetaId: string) => void;
  onViewDetails?: (tarjeta: TarjetaConEstado) => void;
}

export function TarjetaCard({ tarjeta, comprasMSI, metas = [], showFlags = true, variant = 'full', onEdit, onDelete, onViewDetails }: TarjetaCardProps) {
  const [msiOpen, setMsiOpen] = useState(false);
  const [metasOpen, setMetasOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const msiActivas = comprasMSI.filter((m) => m.mesesRestantes > 0);
  const esCredito = tarjeta.tipo === 'Crédito';

  let totalAportado = 0;
  const desgloseMetas: { metaNombre: string; monto: number; id: string }[] = [];

  if (!esCredito && metas.length > 0) {
    metas.forEach(meta => {
      let aportadoAEstaMeta = 0;
      meta.aportes.forEach(aporte => {
        if (aporte.tarjetaOrigenId === tarjeta.id) {
          aportadoAEstaMeta += aporte.monto;
          totalAportado += aporte.monto;
        }
      });
      if (aportadoAEstaMeta > 0) {
        desgloseMetas.push({ metaNombre: meta.nombre, monto: aportadoAEstaMeta, id: meta.id });
      }
    });
  }

  return (
    <GlassCard
      glow={(!showFlags || !esCredito) ? 'none' : tarjeta.estadoTermometro === 'verde' ? 'none' : tarjeta.estadoTermometro}
      as="article"
      style={{ 
        padding: variant === 'compact' ? '16px' : '24px', 
        marginBottom: variant === 'compact' ? 0 : '20px', 
        cursor: onViewDetails ? 'pointer' : 'default',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={() => onViewDetails?.(tarjeta)}
    >
      {/* Cabecera: nombre + chip decorativo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: variant === 'compact' ? '16px' : '28px' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: variant === 'compact' ? '15px' : '16px',
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '85%'
        }}>
          {tarjeta.nombre}
        </span>
        {variant !== 'compact' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(tarjeta); }}
                aria-label="Editar tarjeta"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <Pencil size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                aria-label="Eliminar tarjeta"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <Trash size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={`¿Eliminar la tarjeta ${tarjeta.nombre}?`}
        message="Esta acción no se puede deshacer y eliminará todos los movimientos asociados a esta tarjeta."
        confirmText="Eliminar"
        onConfirm={() => onDelete?.(tarjeta.id)}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Número enmascarado — estilo JetBrains Mono */}
      {variant === 'full' && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '15px',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
          marginBottom: '22px',
        }}>
          •••• •••• •••• ••••
        </div>
      )}

      {/* Fila inferior: disponible + pill */}
      <div style={{ 
        display: 'flex', 
        justifyContent: variant === 'compact' ? 'flex-start' : 'space-between', 
        alignItems: variant === 'compact' ? 'flex-start' : 'flex-end',
        flexDirection: variant === 'compact' ? 'column' : 'row',
        gap: variant === 'compact' ? '6px' : '0'
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginBottom: '4px',
          }}>
            {esCredito ? 'Disponible' : 'Saldo actual'}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: variant === 'compact' ? '18px' : '22px',
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {fmt.format(tarjeta.disponible)}
          </div>
        </div>

        {showFlags && esCredito && variant === 'full' && (
          <StatusPill
            mode="thermometer"
            variant={tarjeta.estadoTermometro}
            label={tarjeta.etiquetaEstado}
          />
        )}
        {showFlags && esCredito && variant === 'compact' && (
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: tarjeta.estadoTermometro === 'verde'
                  ? 'var(--credito-verde)'
                  : tarjeta.estadoTermometro === 'amarillo'
                  ? 'var(--credito-amarillo)'
                  : 'var(--credito-rojo)',
          }}>
            {tarjeta.porcentajeUso.toFixed(0)}% uso
          </div>
        )}
        {!esCredito && tarjeta.rendimientoAnual > 0 && variant === 'full' && (
          <StatusPill
            mode="thermometer"
            variant="verde"
            label={`${tarjeta.rendimientoAnual}% rendimientos`}
          />
        )}
        {!esCredito && tarjeta.rendimientoAnual > 0 && variant === 'compact' && (
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--credito-verde)' }}>
            {tarjeta.rendimientoAnual}% rendimientos
          </div>
        )}
      </div>

      {/* Solo Crédito: Termómetro visual y Desglose */}
      {esCredito && (
        <>
          <div style={{ marginTop: variant === 'compact' ? '12px' : '20px' }}>
            <div style={{
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
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
            </div>
            {variant === 'full' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '6px',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}>
                <span>{tarjeta.porcentajeUso.toFixed(1)}% del límite</span>
                <span>Pago: {tarjeta.proximoPago ? fmtFecha(tarjeta.proximoPago) : ''} ({tarjeta.diasParaPago}d)</span>
              </div>
            )}
          </div>

          {variant === 'full' && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '14px',
              padding: '12px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}>
              <span>Gastado: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmt.format(tarjeta.gastosPeriodoActual)}</strong></span>
              <span>Límite: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmt.format(tarjeta.limite)}</strong></span>
            </div>
          )}
        </>
      )}

      {/* Spacer para Débito en modo compacto para igualar altura con Crédito */}
      {!esCredito && variant === 'compact' && (
        <div style={{ marginTop: '12px', height: '4px' }} />
      )}

      {/* Sección MSI expandible — FR-31 */}
      {variant === 'full' && msiActivas.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMsiOpen((v) => !v); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: msiOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}>▶</span>
            {msiActivas.length} MSI activa{msiActivas.length !== 1 ? 's' : ''}
          </button>

          {msiOpen && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {msiActivas.map((msi) => (
                <div
                  key={msi.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {msi.comercio}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {msi.mesesRestantes} mes{msi.mesesRestantes !== 1 ? 'es' : ''} restante{msi.mesesRestantes !== 1 ? 's' : ''}
                      {' · '}total {fmt.format(msi.montoTotal)}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'var(--credito-amarillo)',
                    textAlign: 'right',
                  }}>
                    {fmt.format(msi.cuotaMensual)}
                    <div style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)' }}>/mes</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sección Metas expandible (Débito) */}
      {!esCredito && variant === 'full' && desgloseMetas.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMetasOpen((v) => !v); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: metasOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}>▶</span>
            {fmt.format(totalAportado)} aportados a metas
          </button>

          {metasOpen && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {desgloseMetas.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {m.metaNombre}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'var(--credito-verde)',
                    textAlign: 'right',
                  }}>
                    {fmt.format(m.monto)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      </div>
    </GlassCard>
  );
}
