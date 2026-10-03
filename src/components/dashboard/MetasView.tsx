'use client';

/**
 * MetasView — Motor de Metas FR-15 a FR-19 con CRUD completo.
 * GlassCard por meta, progreso circular, aportes y creación/edición/eliminación.
 * Usa useMetas(), useCrearMeta(), useAportarMeta(), useEliminarMeta() — NFR-06b.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useMetas, useCrearMeta, useAportarMeta,
  useEditarMeta, useEliminarMeta, useTarjetas, useRetirarDeMeta
} from '@/lib/hooks';
import { GlassCard, ConfirmModal, GlassSelect } from '@/components/ui';
import type { MetaConEstado } from '@/lib/types';
import { Pencil, Trash, Calculator } from 'lucide-react';
import { triggerHaptic, playSuccessChime } from '@/lib/ui/feedback';
import { CalculadoraMetaModal } from '@/components/dashboard/CalculadoraMetaModal';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

/* ── Barra de progreso ──────────────────────────────────────────────────────── */
function ProgressBar({ pct }: { pct: number }) {
  const clipped = Math.min(pct, 100);
  const color = clipped >= 100 ? 'var(--credito-verde)' : clipped >= 50 ? 'var(--brand)' : 'var(--credito-amarillo)';
  return (
    <div style={{ position: 'relative', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', margin: '12px 0 6px' }}>
      <div style={{ height: '100%', width: `${clipped}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
    </div>
  );
}

/* ── Card individual de meta ────────────────────────────────────────────────── */
function MetaCard({ meta }: { meta: MetaConEstado }) {
  const [aportando, setAportando] = useState(false);
  const [montoAporte, setMontoAporte] = useState('');
  const [editando, setEditando] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(meta.nombre);
  const [costoEdit, setCostoEdit] = useState(String(meta.costoObjetivo));
  const [fechaObjEdit, setFechaObjEdit] = useState(meta.fechaObjetivo || '');
  const [modoAccion, setModoAccion] = useState<'Aportar' | 'Retirar'>('Aportar');

  const { mutate: aportar, isPending: aportaPending } = useAportarMeta();
  const { mutate: retirar, isPending: retiraPending } = useRetirarDeMeta();
  const { mutate: editar, isPending: editPending } = useEditarMeta();
  const { mutate: eliminar } = useEliminarMeta();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calculadoraOpen, setCalculadoraOpen] = useState(false);
  
  useEffect(() => {
    if (!editando) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombreEdit(meta.nombre);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCostoEdit(String(meta.costoObjetivo));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFechaObjEdit(meta.fechaObjetivo || '');
    }
  }, [meta, editando]);
  
  const { data: tarjetas = [] } = useTarjetas();
  const tarjetasDebito = tarjetas.filter(t => t.tipo === 'Débito');
  
  const [tarjetaOrigen, setTarjetaOrigen] = useState('');
  const [apartadoId, setApartadoId] = useState('');
  const [fechaAporte, setFechaAporte] = useState(new Date().toISOString().split('T')[0]);

  const tarjetaSeleccionada = tarjetasDebito.find(t => t.id === tarjetaOrigen);
  const apartadosDeTarjeta = tarjetaSeleccionada?.apartados || [];

  return (
    <GlassCard
      glow={meta.progreso >= 100 ? 'verde' : 'none'}
      as="article"
      style={{ overflow: 'visible', padding: '20px 24px', marginBottom: '16px' }}
    >
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {editando ? (
          <input
            value={nombreEdit}
            onChange={(e) => setNombreEdit(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '4px 10px', color: 'var(--text-primary)', fontSize: '15px', flex: 1, marginRight: '8px' }}
          />
        ) : (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '16px', color: 'var(--text-primary)' }}>
            {meta.nombre}
          </div>
        )}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => setCalculadoraOpen(true)} 
            style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', padding: '4px' }} 
            title="Simulador de ahorro"
            aria-label="Simulador de ahorro"
          >
            <Calculator size={16} />
          </button>
          <button 
            onClick={() => setEditando((v) => !v)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} 
            title="Editar"
            aria-label="Editar meta"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} 
            title="Eliminar"
            aria-label="Eliminar meta"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={`¿Eliminar la meta ${meta.nombre}?`}
        message="Esta acción no se puede deshacer y borrará todo el progreso registrado."
        confirmText="Eliminar"
        onConfirm={() => eliminar(meta.id)}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <CalculadoraMetaModal 
        isOpen={calculadoraOpen} 
        onClose={() => setCalculadoraOpen(false)} 
        meta={meta} 
      />

      {/* Barra de progreso */}
      <ProgressBar pct={meta.progreso} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
        <span>{meta.progreso.toFixed(1)}% completado</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>Meta: {editando ? (
            <input
              type="number"
              value={costoEdit}
              onChange={(e) => setCostoEdit(e.target.value)}
              style={{ width: '80px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '2px 6px', color: 'var(--text-primary)', fontSize: '11px', textAlign: 'right' }}
            />
          ) : fmt.format(meta.costoObjetivo)}</span>
          
          {editando && (
            <input
              type="date"
              value={fechaObjEdit}
              onChange={(e) => setFechaObjEdit(e.target.value)}
              style={{ width: '110px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '2px 6px', color: 'var(--text-primary)', fontSize: '11px' }}
            />
          )}
        </div>
      </div>

      {/* Ahorro sugerido normal */}
      {meta.proyeccion.aportesMensualesPromedio > 0 && !editando && meta.progreso < 100 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--brand)' }}>
          Ahorro sugerido: {fmt.format(meta.proyeccion.aportesMensualesPromedio)}/mes 
          {meta.proyeccion.fechaEstimadaCumplimiento && ` para alcanzarla en ${meta.proyeccion.fechaEstimadaCumplimiento}`}
        </div>
      )}

      {/* Ahorro sugerido dinámico (durante edición) */}
      {editando && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--brand)' }}>
          {(() => {
            const costoObjetivoNum = parseFloat(costoEdit) || 0;
            const faltanteEdit = Math.max(0, costoObjetivoNum - meta.montoActual);
            let sugerenciaMensualEdit = faltanteEdit;
            let mesesStr = '';
            
            if (fechaObjEdit) {
              const fechaObj = new Date(fechaObjEdit + 'T00:00:00');
              const hoyTime = new Date().getTime();
              const diffTime = Math.max(0, fechaObj.getTime() - hoyTime);
              const mesesRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
              if (mesesRestantes > 0) {
                sugerenciaMensualEdit = faltanteEdit / mesesRestantes;
                mesesStr = ` (en ${mesesRestantes} mes${mesesRestantes > 1 ? 'es' : ''})`;
              }
            }
            
            if (sugerenciaMensualEdit > 0 && faltanteEdit > 0) {
              return <>Proyección ajustada: {fmt.format(sugerenciaMensualEdit)}/mes{mesesStr}</>;
            }
            return null;
          })()}
        </div>
      )}

      {/* Montos consolidados y compactos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '2px' }}>Ahorrado Total</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
            {fmt.format(meta.montoActual)}
          </div>
        </div>
        
        {meta.rendimientoGenerado > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Capital depositado</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {fmt.format(meta.capitalAportado)}
              <span style={{ color: 'var(--credito-verde)', marginLeft: '6px', fontWeight: 600 }}>
                +{fmt.format(meta.rendimientoGenerado)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Guardar edición */}
      {editando && (
        <button
          onClick={() => {
            editar({ id: meta.id, campos: { nombre: nombreEdit, costoObjetivo: parseFloat(costoEdit), fechaObjetivo: fechaObjEdit || null } });
            setEditando(false);
          }}
          disabled={editPending}
          style={{ ...btnPrimary, marginTop: '12px', width: '100%' }}
        >
          {editPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      )}

      {/* Sección de aporte */}
      {!editando && meta.progreso < 100 && (
        <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
          {aportando ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
                {modoAccion === 'Aportar' ? 'Aportar a Meta' : 'Retirar de Meta'}
              </div>
              <input
                type="number"
                placeholder={modoAccion === 'Aportar' ? "Monto a aportar" : "Monto a retirar"}
                value={montoAporte}
                onChange={(e) => setMontoAporte(e.target.value)}
                style={inputStyle}
                min="1"
                max={modoAccion === 'Retirar' ? meta.montoActual : undefined}
              />
              <input
                type="date"
                value={fechaAporte}
                onChange={(e) => setFechaAporte(e.target.value)}
                style={inputStyle}
              />
              {modoAccion === 'Aportar' && tarjetasDebito.length > 0 && (
                <div style={{ position: 'relative', zIndex: 30 }}>
                  <GlassSelect
                    value={tarjetaOrigen}
                    onChange={(val) => {
                      setTarjetaOrigen(val);
                      setApartadoId(''); // reset apartado al cambiar de tarjeta
                    }}
                    options={[
                      { value: '', label: 'Sin tarjeta (efectivo)' },
                      ...tarjetasDebito.map(t => ({
                        value: t.id,
                        label: `${t.nombre} ${t.rendimientoAnual > 0 ? `(${t.rendimientoAnual}% APY)` : ''}`
                      }))
                    ]}
                    placeholder="Selecciona tarjeta"
                  />
                </div>
              )}
              {modoAccion === 'Aportar' && apartadosDeTarjeta.length > 0 && (
                <div style={{ position: 'relative', zIndex: 20 }}>
                  <GlassSelect
                    value={apartadoId}
                    onChange={(val) => setApartadoId(val)}
                    options={[
                      { value: '', label: 'Balance general (sin apartado)' },
                      ...apartadosDeTarjeta.map(a => ({
                        value: a.id,
                        label: `${a.nombre} (${a.rendimientoAnual}% APY)`
                      }))
                    ]}
                    placeholder="Selecciona apartado"
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    const monto = parseFloat(montoAporte);
                    if (monto > 0) {
                      if (modoAccion === 'Aportar') {
                        aportar(
                          { id: meta.id, monto, tarjetaId: tarjetaOrigen || undefined, apartadoId: apartadoId || undefined, fecha: fechaAporte }, 
                          { onSuccess: () => { 
                              triggerHaptic('success');
                              playSuccessChime();
                              setAportando(false); 
                              setMontoAporte(''); 
                              setTarjetaOrigen(''); 
                              setApartadoId(''); 
                          } }
                        );
                      } else {
                        retirar(
                          { id: meta.id, monto },
                          { onSuccess: () => {
                              triggerHaptic('success');
                              setAportando(false);
                              setMontoAporte('');
                          }}
                        )
                      }
                    }
                  }}
                  disabled={(modoAccion === 'Aportar' ? aportaPending : retiraPending) || !montoAporte}
                  style={{ ...btnPrimary, flex: 1, background: modoAccion === 'Retirar' ? 'var(--text-primary)' : 'var(--brand)' }}
                >
                  {(modoAccion === 'Aportar' ? aportaPending : retiraPending) ? '…' : (modoAccion === 'Aportar' ? 'Confirmar Aporte' : 'Confirmar Retiro')}
                </button>
                <button onClick={() => setAportando(false)} style={btnMuted}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => { setModoAccion('Aportar'); setAportando(true); }} 
                style={{ ...btnSecondary, flex: 1, background: 'rgba(250, 104, 111, 0.1)', color: 'var(--brand)', border: '1px solid var(--brand)' }}
              >
                Aportar
              </button>
              {meta.montoActual > 0 && (
                <button 
                  onClick={() => { setModoAccion('Retirar'); setAportando(true); }} 
                  style={{ ...btnSecondary, flex: 1 }}
                >
                  Retirar
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {!editando && meta.progreso >= 100 && (
        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--credito-verde)' }}>
          Meta cumplida
        </div>
      )}
    </GlassCard>
  );
}

/* ── Formulario nueva meta ──────────────────────────────────────────────────── */
function NuevaMetaForm({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [nombre, setNombre] = useState('');
  const [costo, setCosto] = useState('');
  const [fechaObj, setFechaObj] = useState('');
  const { mutate: crear, isPending } = useCrearMeta();

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre('');
      setCosto('');
      setFechaObj('');
    }
  }, [isOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !costo) return;
    crear(
      { nombre, costoObjetivo: parseFloat(costo), fechaObjetivo: fechaObj || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
          <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
          
          <GlassCard style={{ width: '100%', maxWidth: '380px', padding: '24px', zIndex: 1, marginBottom: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Nueva meta
            </h2>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input required placeholder="Nombre de la meta" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
              <input required type="number" placeholder="Costo objetivo (MXN)" value={costo} onChange={(e) => setCosto(e.target.value)} style={inputStyle} min="1" />
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Fecha objetivo (Opcional)</label>
                <input type="date" value={fechaObj} onChange={(e) => setFechaObj(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={isPending} style={{ ...btnPrimary, flex: 1 }}>
                  {isPending ? 'Creando…' : 'Crear meta'}
                </button>
                <button type="button" onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Vista principal ────────────────────────────────────────────────────────── */
export function MetasView() {
  const [creando, setCreando] = useState(false);
  const { data: metas = [], isLoading, error } = useMetas();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '26px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Metas
          </h1>
        </div>
        <button onClick={() => setCreando(true)} style={btnPrimary}>+ Nueva</button>
      </div>

      <NuevaMetaForm isOpen={creando} onClose={() => setCreando(false)} />

      {isLoading && <div style={{ height: '120px', borderRadius: '22px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', animation: 'pulse 1.5s ease-in-out infinite' }} />}

      {error && <GlassCard glow="rojo" style={{ padding: '16px 20px' }}><p style={{ color: 'var(--credito-rojo)', fontSize: '14px' }}>Error: {error.message}</p></GlassCard>}

      {!isLoading && !error && metas.length === 0 && !creando && (
        <GlassCard style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Aún no tienes metas. Toca <strong>+ Nueva</strong> para empezar.</p>
        </GlassCard>
      )}

      {metas.map((m, i) => (
        <div key={m.id} style={{ position: 'relative', zIndex: metas.length - i }}>
          <MetaCard meta={m} />
        </div>
      ))}
    </div>
  );
}

/* ── Estilos comunes ─────────────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--border-glass)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  flex: 1,
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--brand)',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 18px',
  color: '#1a0a0b',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--border-glass)',
  borderRadius: '10px',
  padding: '10px 16px',
  color: 'var(--text-secondary)',
  fontSize: '14px',
  cursor: 'pointer',
};

const btnMuted: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '15px',
  padding: '2px 4px',
};
