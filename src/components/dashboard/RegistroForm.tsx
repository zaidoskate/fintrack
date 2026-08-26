'use client';

/**
 * RegistroForm — Registro Universal FR-01 a FR-08 con Sincronización Optimista.
 * Incluye rama MSI (checkbox visible solo cuando método = tarjeta de crédito).
 * Usa useCrearMovimiento() + useCrearCompraMSI() + useTarjetas() — NFR-06b.
 *
 * Sincronización optimista (FR-06/07):
 *   - queryClient.setQueryData actualiza movimientos inmediatamente.
 *   - Si el server falla, onError revierte con el snapshot previo.
 *   - Sin offline todavía — eso es Fase 4.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GlassCard, GlassSelect } from '@/components/ui';
import {
  useCrearMovimiento, useEditarMovimiento, useCrearCompraMSI, useTarjetas, QK,
} from '@/lib/hooks';
import type { Movimiento } from '@/lib/types';

const CATEGORIAS = [
  'Comida', 'Transporte', 'Entretenimiento', 'Salud',
  'Ropa', 'Conveniencia', 'Servicios', 'Sin categoría',
];

const METODOS_EFECTIVO = ['Efectivo', 'SPEI / Transferencia', 'Débito'];
// Nombres de tarjetas de crédito — se obtienen de useTarjetas() en tiempo real

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

interface RegistroFormProps {
  onClose?: () => void;
  initialData?: Movimiento;
}

export function RegistroForm({ onClose, initialData }: RegistroFormProps) {
  const qc = useQueryClient();
  const { data: tarjetas = [] } = useTarjetas();

  /* ── Estado del formulario ─────────────────────────────────────── */
  const [tipo,       setTipo]      = useState<'Gasto' | 'Ingreso'>(initialData?.tipo || 'Gasto');
  const [monto,      setMonto]     = useState(initialData?.monto.toString() || '');
  const [categoria,  setCat]       = useState(initialData?.categoria || CATEGORIAS[0]);
  const [comercio,   setCom]       = useState(initialData?.comercio || '');
  const [metodo,     setMetodo]    = useState(initialData?.metodoPago || 'Efectivo');
  const [esMeses,    setEsMeses]   = useState(false);
  const [meses,      setMeses]     = useState(3);
  const [error,      setError]     = useState<string | null>(null);
  const [exito,      setExito]     = useState(false);

  /* ── Nombres de tarjetas para el selector de método ─────────────── */
  const nombresTarjetas = tarjetas.map((t) => t.nombre);
  const metodosDisp = [...METODOS_EFECTIVO, ...nombresTarjetas];
  const esTarjeta = nombresTarjetas.includes(metodo);

  /* ── Mutations ────────────────────────────────────────────────── */
  const { mutate: crearMov } = useCrearMovimiento();
  const { mutate: editarMov } = useEditarMovimiento();
  const { mutate: crearMSI } = useCrearCompraMSI();

  /* ── Submit ───────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const montoNum = parseFloat(monto.replace(/[,$\s]/g, ''));
    if (!montoNum || montoNum <= 0) { setError('El monto debe ser mayor a 0.'); return; }

    const hoyISO = new Date().toISOString().substring(0, 10);

    /* ── Rama MSI (agents.md regla 7: nunca a movimientos) ─────── */
    if (tipo === 'Gasto' && esTarjeta && esMeses) {
      const tarjeta = tarjetas.find((t) => t.nombre === metodo);
      if (!tarjeta) { setError('Tarjeta no encontrada.'); return; }

      crearMSI(
        {
          tarjetaId:    tarjeta.id,
          comercio:     comercio || 'N/A',
          categoria,
          montoTotal:   montoNum,
          mesesTotales: meses,
          fechaPrimerCargo: hoyISO,
        },
        {
          onSuccess: () => { setExito(true); setTimeout(() => { setExito(false); resetForm(); onClose?.(); }, 1500); },
          onError:   (err) => setError(err.message),
        },
      );
      return;
    }

    /* ── Rama normal — Sincronización Optimista (FR-06/07) ─────── */
    const optimisticMov: Movimiento = {
      id:         `temp-${Date.now()}`,
      fecha:      hoyISO,
      hora:       new Date().toTimeString().substring(0, 5),
      tipo,
      monto:      montoNum,
      categoria,
      comercio:   comercio || 'N/A',
      metodoPago: metodo,
    };

    // Snapshot para rollback
    const prev = qc.getQueryData<Movimiento[]>(QK.movimientos());

    // Actualización optimista inmediata
    qc.setQueryData<Movimiento[]>(QK.movimientos(), (old = []) => {
      if (initialData) {
        return old.map(m => m.id === initialData.id ? optimisticMov : m);
      }
      return [optimisticMov, ...old];
    });

    const payload = { tipo, monto: montoNum, categoria, comercio: comercio || 'N/A', metodoPago: metodo };
    const mutationOpts = {
      onSuccess: () => {
        setExito(true);
        setTimeout(() => { setExito(false); resetForm(); onClose?.(); }, 1200);
      },
      onError: (err: Error) => {
        // Rollback
        if (prev) qc.setQueryData(QK.movimientos(), prev);
        setError(err.message);
      },
    };

    if (initialData) {
      editarMov({ id: initialData.id, campos: payload }, mutationOpts);
    } else {
      crearMov(payload, mutationOpts);
    }
  };

  const resetForm = () => {
    setMonto(''); setCom(''); setCat(CATEGORIAS[0]);
    setMetodo('Efectivo'); setEsMeses(false); setMeses(3);
    setTipo('Gasto'); setError(null);
  };

  /* ── UI ───────────────────────────────────────────────────────── */
  if (exito) {
    return (
      <GlassCard glow="verde" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}></div>
        <p style={{ color: 'var(--credito-verde)', fontWeight: 600 }}>
          {esMeses ? 'Compra MSI registrada' : 'Movimiento guardado'}
        </p>
        {esMeses && monto && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            {meses} cuotas de {fmt.format(parseFloat(monto.replace(/[,$\s]/g,'')) / meses)}
          </p>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard style={{ padding: '24px 24px 32px', overflow: 'visible' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
        {initialData ? 'Editar movimiento' : esMeses ? 'Compra a MSI' : 'Nuevo registro'}
      </h2>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: 'var(--credito-rojo)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Tipo */}
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
          {(['Gasto', 'Ingreso'] as const).map((t) => (
            <button
              key={t} type="button"
              onClick={() => { setTipo(t); setEsMeses(false); }}
              style={{
                flex: 1, padding: '10px',
                background: tipo === t
                  ? t === 'Gasto' ? 'rgba(250,104,111,0.2)' : 'rgba(52,211,153,0.2)'
                  : 'transparent',
                color: tipo === t
                  ? t === 'Gasto' ? 'var(--brand)' : 'var(--credito-verde)'
                  : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Monto */}
        <input
          required type="number" step="0.01" min="0.01"
          placeholder="Monto (MXN)" value={monto}
          onChange={(e) => setMonto(e.target.value)}
          style={inputStyle}
          inputMode="decimal"
        />

        {/* Comercio */}
        <input
          placeholder="Comercio o descripción" value={comercio}
          onChange={(e) => setCom(e.target.value)}
          style={inputStyle}
        />

        {/* Categoría */}
        <div style={{ zIndex: 30, position: 'relative' }}>
          <GlassSelect
            options={CATEGORIAS}
            value={categoria}
            onChange={(val: string) => setCat(val)}
            placeholder="Selecciona categoría"
          />
        </div>

        {/* Método de pago */}
        <div style={{ zIndex: 20, position: 'relative' }}>
          <GlassSelect
            options={metodosDisp}
            value={metodo}
            onChange={(val: string) => { setMetodo(val); setEsMeses(false); }}
            placeholder="Selecciona método"
          />
        </div>

        {/* Checkbox MSI — solo si método es tarjeta de crédito y tipo Gasto y NO estamos editando (FR-26) */}
        {tipo === 'Gasto' && esTarjeta && !initialData && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={esMeses}
              onChange={(e) => setEsMeses(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--brand)' }}
            />
            Es a meses sin intereses (MSI)
          </label>
        )}

        {/* Selector de meses — visible solo si esMeses */}
        {esMeses && (
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              Número de meses
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[3, 6, 9, 12, 18, 24].map((n) => (
                <button
                  key={n} type="button"
                  onClick={() => setMeses(n)}
                  style={{
                    padding: '7px 14px', borderRadius: '9999px', border: '1px solid',
                    borderColor: meses === n ? 'var(--brand)' : 'var(--border-glass)',
                    background: meses === n ? 'rgba(250,104,111,0.15)' : 'transparent',
                    color: meses === n ? 'var(--brand)' : 'var(--text-secondary)',
                    fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {n}m
                </button>
              ))}
            </div>
            {monto && (
              <p style={{ fontSize: '12px', color: 'var(--credito-amarillo)', marginTop: '8px' }}>
                Cuota: {fmt.format(parseFloat(monto.replace(/[,$\s]/g,'')) / meses)}/mes
              </p>
            )}
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="submit" style={{ ...btnPrimary, flex: 1 }}>
            {initialData ? 'Guardar cambios' : esMeses ? `Registrar ${meses} meses` : `Registrar ${tipo.toLowerCase()}`}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
          )}
        </div>
      </form>
    </GlassCard>
  );
}

/* ── Estilos comunes ─────────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--border-glass)',
  borderRadius: '10px', padding: '11px 14px',
  color: 'var(--text-primary)', fontSize: '15px', outline: 'none', width: '100%',
};
const btnPrimary: React.CSSProperties = {
  background: 'var(--brand)', border: 'none', borderRadius: '10px',
  padding: '12px 18px', color: '#1a0a0b', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
  borderRadius: '10px', padding: '12px 16px',
  color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer',
};
