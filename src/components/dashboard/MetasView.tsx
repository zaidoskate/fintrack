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
  useEditarMeta, useEliminarMeta, useTarjetas
} from '@/lib/hooks';
import { GlassCard, ConfirmModal } from '@/components/ui';
import type { MetaConEstado } from '@/lib/types';
import { Pencil, Trash } from 'lucide-react';

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

  const { mutate: aportar, isPending: aportaPending } = useAportarMeta();
  const { mutate: editar, isPending: editPending } = useEditarMeta();
  const { mutate: eliminar } = useEliminarMeta();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data: tarjetas = [] } = useTarjetas();
  const tarjetasDebito = tarjetas.filter(t => t.tipo === 'Débito');
  
  const [tarjetaOrigen, setTarjetaOrigen] = useState('');
  const [fechaAporte, setFechaAporte] = useState(new Date().toISOString().split('T')[0]);

  const faltante = meta.costoObjetivo - meta.montoActual;

  return (
    <GlassCard
      glow={meta.progreso >= 100 ? 'verde' : 'none'}
      as="article"
      style={{ padding: '20px 24px', marginBottom: '16px' }}
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

      {/* Montos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '3px' }}>Ahorrado</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)' }}>
            {fmt.format(meta.montoActual)}
          </div>
          {meta.rendimientoGenerado > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--credito-verde)', marginTop: '2px' }}>
              +{fmt.format(meta.rendimientoGenerado)} rendimientos
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>Objetivo</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {editando ? (
              <input
                type="number"
                value={costoEdit}
                onChange={(e) => setCostoEdit(e.target.value)}
                style={{ width: '100px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '3px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'right' }}
              />
            ) : fmt.format(meta.costoObjetivo)}
          </div>
        </div>
      </div>

      <ProgressBar pct={meta.progreso} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>{meta.progreso.toFixed(1)}% completado</span>
        <span>Falta {fmt.format(Math.max(0, faltante))}</span>
      </div>

      {/* Rendimiento global */}
      {meta.rendimientoGenerado > 0 && (
        <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Capital aportado:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{fmt.format(meta.capitalAportado)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Rendimientos ganados:</span>
            <strong style={{ color: 'var(--credito-verde)' }}>+{fmt.format(meta.rendimientoGenerado)}</strong>
          </div>
        </div>
      )}

      {/* Guardar edición */}
      {editando && (
        <button
          onClick={() => {
            editar({ id: meta.id, campos: { nombre: nombreEdit, costoObjetivo: parseFloat(costoEdit) } });
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
              <input
                type="number"
                placeholder="Monto a aportar"
                value={montoAporte}
                onChange={(e) => setMontoAporte(e.target.value)}
                style={inputStyle}
                min="1"
              />
              <input
                type="date"
                value={fechaAporte}
                onChange={(e) => setFechaAporte(e.target.value)}
                style={inputStyle}
              />
              {tarjetasDebito.length > 0 && (
                <select
                  value={tarjetaOrigen}
                  onChange={(e) => setTarjetaOrigen(e.target.value)}
                  style={{ ...inputStyle, WebkitAppearance: 'none' }}
                >
                  <option value="">Sin tarjeta (efectivo)</option>
                  {tarjetasDebito.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} {t.rendimientoAnual > 0 ? `(${t.rendimientoAnual}% APY)` : ''}</option>
                  ))}
                </select>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    const monto = parseFloat(montoAporte);
                    if (monto > 0) {
                      aportar(
                        { id: meta.id, monto, tarjetaId: tarjetaOrigen || undefined, fecha: fechaAporte }, 
                        { onSuccess: () => { setAportando(false); setMontoAporte(''); setTarjetaOrigen(''); } }
                      );
                    }
                  }}
                  disabled={aportaPending || !montoAporte}
                  style={{ ...btnPrimary, flex: 1 }}
                >
                  {aportaPending ? '…' : 'Aportar'}
                </button>
                <button onClick={() => setAportando(false)} style={btnMuted}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAportando(true)} style={{ ...btnSecondary, width: '100%' }}>
              Registrar aporte
            </button>
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
  const { mutate: crear, isPending } = useCrearMeta();

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre('');
      setCosto('');
    }
  }, [isOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !costo) return;
    crear(
      { nombre, costoObjetivo: parseFloat(costo) },
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

      {metas.map((m) => <MetaCard key={m.id} meta={m} />)}
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
