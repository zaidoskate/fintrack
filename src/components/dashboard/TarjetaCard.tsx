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
import { GlassCard, StatusPill } from '@/components/ui';
import type { TarjetaConEstado, CompraMSI } from '@/lib/types';
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
  showFlags?: boolean;
  onEdit?: (tarjeta: TarjetaConEstado) => void;
  onDelete?: (tarjetaId: string) => void;
  onViewDetails?: (tarjeta: TarjetaConEstado) => void;
}

export function TarjetaCard({ tarjeta, comprasMSI, showFlags = true, onEdit, onDelete, onViewDetails }: TarjetaCardProps) {
  const [msiOpen, setMsiOpen] = useState(false);
  const msiActivas = comprasMSI.filter((m) => m.mesesRestantes > 0);
  const esCredito = tarjeta.tipo === 'Crédito';

  return (
    <GlassCard
      glow={(!showFlags || !esCredito) ? 'none' : tarjeta.estadoTermometro === 'verde' ? 'none' : tarjeta.estadoTermometro}
      as="article"
      style={{ padding: '24px', marginBottom: '20px', cursor: onViewDetails ? 'pointer' : 'default' }}
      onClick={() => onViewDetails?.(tarjeta)}
    >
      {/* Cabecera: nombre + chip decorativo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: '16px',
          color: 'var(--text-primary)',
        }}>
          {tarjeta.nombre}
        </span>
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
                if (confirm(`¿Eliminar la tarjeta ${tarjeta.nombre}?`)) {
                  onDelete(tarjeta.id);
                }
              }}
              aria-label="Eliminar tarjeta"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Número enmascarado — estilo JetBrains Mono */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '15px',
        letterSpacing: '0.08em',
        color: 'var(--text-secondary)',
        marginBottom: '22px',
      }}>
        •••• •••• •••• ••••
      </div>

      {/* Fila inferior: disponible + pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
            fontSize: '22px',
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {fmt.format(tarjeta.disponible)}
          </div>
        </div>

        {showFlags && esCredito && (
          <StatusPill
            mode="thermometer"
            variant={tarjeta.estadoTermometro}
            label={tarjeta.etiquetaEstado}
          />
        )}
      </div>

      {/* Solo Crédito: Termómetro visual y Desglose */}
      {esCredito && (
        <>
          <div style={{ marginTop: '20px' }}>
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
          </div>

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
        </>
      )}

      {/* Sección MSI expandible — FR-31 */}
      {msiActivas.length > 0 && (
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
    </GlassCard>
  );
}
