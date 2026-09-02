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
import { Pencil, Trash, ArrowRightLeft, FastForward } from 'lucide-react';
import { useAdelantarCompraMSI } from '@/lib/hooks';

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
  showBalance?: boolean;
  onEdit?: (tarjeta: TarjetaConEstado) => void;
  onDelete?: (tarjetaId: string) => void;
  onViewDetails?: (tarjeta: TarjetaConEstado) => void;
  onAddApartado?: (tarjeta: TarjetaConEstado) => void;
  onMoveApartado?: (apartadoId: string, maxRetiro: number, maxIngreso: number) => void;
}

export function TarjetaCard({ tarjeta, comprasMSI, metas = [], showFlags = true, variant = 'full', showBalance = true, onEdit, onDelete, onViewDetails, onAddApartado, onMoveApartado }: TarjetaCardProps) {
  const [msiOpen, setMsiOpen] = useState(false);
  const [metasOpen, setMetasOpen] = useState(false);
  const [apartadosOpen, setApartadosOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adelantarMSI, setAdelantarMSI] = useState<string | null>(null);
  const [adelantarMeses, setAdelantarMeses] = useState(1);
  const [adelantarDescuento, setAdelantarDescuento] = useState(0);

  const { mutate: adelantar, isPending: isAdelantando } = useAdelantarCompraMSI();

  const msiActivas = comprasMSI.filter((m) => m.mesesRestantes > 0);
  const esCredito = tarjeta.tipo === 'Crédito';
  const apartados = tarjeta.apartados || [];

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

      {adelantarMSI && (
        <ConfirmModal
          isOpen={true}
          title="Adelantar Mensualidades"
          message={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                ¿Cuántos meses deseas adelantar?
                <input 
                  type="number" 
                  min="1" 
                  max="48"
                  value={adelantarMeses}
                  onChange={(e) => setAdelantarMeses(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', marginTop: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                />
              </label>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Descuento ofrecido por el banco (MXN, opcional)
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={adelantarDescuento}
                  onChange={(e) => setAdelantarDescuento(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', marginTop: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                />
              </label>
            </div>
          }
          confirmText={isAdelantando ? "Guardando..." : "Confirmar Adelanto"}
          cancelText="Cancelar"
          onConfirm={() => {
            adelantar({ id: adelantarMSI, meses: adelantarMeses, descuento: adelantarDescuento }, {
              onSuccess: () => setAdelantarMSI(null)
            });
          }}
          onCancel={() => setAdelantarMSI(null)}
        />
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
            {showBalance ? fmt.format(tarjeta.disponible) : '••••••••'}
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
                      {msi.mesesAdelantados > 0 && ` (Adelantados: ${msi.mesesAdelantados})`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdelantarMSI(msi.id);
                        setAdelantarMeses(1);
                        setAdelantarDescuento(0);
                      }}
                      title="Adelantar mensualidades"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FastForward size={16} />
                    </button>
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

      {/* Sección Apartados expandible (Débito) */}
      {!esCredito && variant === 'full' && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {apartados.length > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); setApartadosOpen((v) => !v); }}
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
                  transform: apartadosOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}>▶</span>
                {apartados.length} Apartado{apartados.length !== 1 ? 's' : ''} con rendimiento
              </button>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sin apartados</span>
            )}
            
            {onAddApartado && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddApartado(tarjeta); }}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px',
                  color: 'var(--text-primary)', fontSize: '11px', padding: '2px 6px', cursor: 'pointer'
                }}
              >
                + Nuevo apartado
              </button>
            )}
          </div>

          {apartadosOpen && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {apartados.map((a) => (
                <div
                  key={a.id}
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
                      {a.nombre}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--credito-verde)', marginTop: '2px' }}>
                      {a.rendimientoAnual}% APY
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      textAlign: 'right',
                    }}>
                      {fmt.format(a.balanceCalculado)}
                    </div>
                    {onMoveApartado && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveApartado(a.id, a.balanceCalculado, tarjeta.disponible); }}
                        style={{
                          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
                          color: 'var(--text-primary)', padding: '6px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Transferir a saldo"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                    )}
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
