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
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, GlassSelect } from '@/components/ui';
import {
  useCrearMovimiento, useEditarMovimiento, useCrearCompraMSI, useTarjetas, QK,
} from '@/lib/hooks';
import { triggerHaptic, playSuccessChime } from '@/lib/ui/feedback';
import type { Movimiento } from '@/lib/types';
import type { NuevoMovimientoInput } from '@/lib/api/movimientos';

const CATEGORIAS_GASTO = [
  'Comida', 'Transporte', 'Entretenimiento', 'Salud',
  'Ropa', 'Conveniencia', 'Servicios', 'Pago de tarjeta', 'Traspaso', 'Sin categoría',
];

const CATEGORIAS_INGRESO = [
  'Sueldo', 'Negocio/Ventas', 'Rendimientos', 'Préstamos',
  'Regalos', 'Traspaso', 'Otros ingresos'
];

const METODOS_EFECTIVO = ['Efectivo'];
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
  const [tipo, setTipo] = useState<'Gasto' | 'Ingreso'>(initialData?.tipo || 'Gasto');
  const [monto, setMonto] = useState(initialData?.monto.toString() || '');
  const [categoria, setCat] = useState(initialData?.categoria || CATEGORIAS_GASTO[0]);
  const [comercio, setCom] = useState(initialData?.comercio || '');
  const [metodo, setMetodo] = useState(initialData?.metodoPago || 'Efectivo');
  const [esMeses, setEsMeses] = useState(false);
  const [meses, setMeses] = useState(3);
  const [fechaPrimerCargo, setFechaPrimerCargo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  /* ── Gasto compartido ─────────────────────────────────────────── */
  const [esGastoDeTercero, setEsGastoDeTercero] = useState(initialData?.esGastoDeTercero ?? false);
  const [gastoCompartido, setGastoCompartido] = useState(false);
  const [miConsumo, setMiConsumo] = useState('');
  const [deudor, setDeudor] = useState('');
  const [conceptoDeuda, setConceptoDeuda] = useState('');

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
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0.');
      return;
    }
    if (!comercio.trim()) {
      setError('Por favor ingresa un comercio o concepto.');
      return;
    }

    const hoyISO = new Date().toISOString().substring(0, 10);

    /* ── Rama MSI (agents.md regla 7: nunca a movimientos) ─────── */
    if (tipo === 'Gasto' && esTarjeta && esMeses) {
      const tarjeta = tarjetas.find((t) => t.nombre === metodo);
      if (!tarjeta) { setError('Tarjeta no encontrada.'); return; }

      crearMSI(
        {
          tarjetaId: tarjeta.id,
          comercio: comercio || 'N/A',
          categoria,
          montoTotal: montoNum,
          mesesTotales: meses,
          fechaPrimerCargo: fechaPrimerCargo || undefined,
        },
        {
          onSuccess: () => {
            triggerHaptic('success');
            playSuccessChime();
            setExito(true);
            setTimeout(() => { onClose?.(); }, 900);
          },
          onError: (err) => setError(err.message),
        },
      );
      return;
    }

    /* ── Rama normal — Sincronización Optimista (FR-06/07) ─────── */
    const tempId = `temp-${Date.now()}`;
    const horaText = new Date().toTimeString().substring(0, 5);

    const optimisticMov: Movimiento = {
      id: tempId,
      fecha: hoyISO,
      hora: horaText,
      tipo,
      monto: montoNum,
      categoria,
      comercio: comercio || 'N/A',
      metodoPago: metodo,
      esGastoDeTercero: tipo === 'Gasto' && esGastoDeTercero,
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

    const tarjetaId = metodo === 'Efectivo' ? null : tarjetas.find(t => t.nombre === metodo)?.id || null;
    const payload: Omit<NuevoMovimientoInput, 'fecha'> = { tipo, monto: montoNum, categoria, comercio: comercio || 'N/A', tarjetaId, esGastoDeTercero: tipo === 'Gasto' && esGastoDeTercero };

    if (tipo === 'Gasto' && gastoCompartido && !esGastoDeTercero) {
      const miConsumoNum = parseFloat(miConsumo.replace(/[,$\s]/g, ''));
      if (!miConsumoNum || miConsumoNum <= 0 || miConsumoNum >= montoNum) {
        setError('Tu consumo debe ser mayor a 0 y menor al total.');
        return;
      }
      if (!deudor.trim()) {
        setError('Indica quién te debe.');
        return;
      }
      payload.montoPropio = miConsumoNum;
      payload.cuentaPorCobrar = {
        deudor,
        concepto: conceptoDeuda || (comercio || 'Gasto compartido'),
        montoTotal: montoNum - miConsumoNum,
      };
    }

    const mutationOpts = {
      onSuccess: () => {
        triggerHaptic('success');
        playSuccessChime();
        setExito(true);
        setTimeout(() => { onClose?.(); }, 900);
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
      crearMov({ fecha: hoyISO, ...payload }, mutationOpts);
    }
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
            {meses} cuotas de {fmt.format(parseFloat(monto.replace(/[,$\s]/g, '')) / meses)}
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

      <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Tipo */}
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
          {(['Gasto', 'Ingreso'] as const).map((t) => (
            <button
              key={t} type="button"
              onClick={() => {
                setTipo(t as 'Gasto' | 'Ingreso');
                if (t === 'Ingreso' && !CATEGORIAS_INGRESO.includes(categoria)) setCat(CATEGORIAS_INGRESO[0]);
                if (t === 'Gasto' && !CATEGORIAS_GASTO.includes(categoria)) setCat(CATEGORIAS_GASTO[0]);
              }}
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
          type="number" step="0.01" min="0.01"
          placeholder="Monto total" value={monto}
          onChange={(e) => setMonto(e.target.value)}
          style={inputStyle}
          inputMode="decimal"
        />

        {/* Comercio */}
        <input
          placeholder="Comercio o concepto" value={comercio}
          onChange={(e) => setCom(e.target.value)}
          style={inputStyle}
        />

        {/* Categoría */}
        <div style={{ zIndex: 30, position: 'relative' }}>
          <GlassSelect
            value={categoria}
            onChange={setCat}
            options={tipo === 'Ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO}
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
                Cuota: {fmt.format(parseFloat(monto.replace(/[,$\s]/g, '')) / meses)}/mes
              </p>
            )}

            <input
              type="date"
              placeholder="Primer cargo (YYYY-MM-DD)"
              value={fechaPrimerCargo}
              onChange={(e) => setFechaPrimerCargo(e.target.value)}
              style={inputStyle}
              aria-label="Mes del primer cargo"
            />
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Si lo dejas en blanco, se calculará automáticamente según tu fecha de corte.
            </p>
          </div>
        )}

        {/* Gasto de un tercero (excluido de analíticas) */}
        {tipo === 'Gasto' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Gasto de un tercero (se reembolsará)</span>
            <div
              role="switch"
              aria-checked={esGastoDeTercero}
              aria-label="Gasto de un tercero"
              onClick={() => setEsGastoDeTercero(!esGastoDeTercero)}
              style={{
                width: '44px', height: '24px', flexShrink: 0,
                background: esGastoDeTercero ? 'var(--brand)' : 'rgba(255,255,255,0.1)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '2px',
                cursor: 'pointer', transition: 'background 0.3s', boxSizing: 'border-box',
              }}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', marginLeft: esGastoDeTercero ? 'auto' : '0' }}
              />
            </div>
          </div>
        )}

        {/* Gasto Compartido / Me deben */}
        {tipo === 'Gasto' && !initialData && !esGastoDeTercero && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>¿Gasto compartido / Me deben?</span>
              <div
                onClick={() => setGastoCompartido(!gastoCompartido)}
                style={{
                  width: '44px',
                  height: '24px',
                  background: gastoCompartido ? 'var(--brand)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  cursor: 'pointer',
                  transition: 'background 0.3s',
                  boxSizing: 'border-box'
                }}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    width: '20px',
                    height: '20px',
                    background: '#fff',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    marginLeft: gastoCompartido ? 'auto' : '0'
                  }}
                />
              </div>
            </div>

            <AnimatePresence>
              {gastoCompartido && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <input type="text" inputMode="decimal" placeholder="Mi parte (ej. $600.00)" value={miConsumo} onChange={(e) => setMiConsumo(e.target.value)} style={inputStyle} aria-label="Mi consumo real" />

                    {monto && miConsumo && parseFloat(monto) - parseFloat(miConsumo) > 0 && (
                      <div style={{ color: 'var(--credito-verde)', fontSize: '13px', fontWeight: 600 }}>Por cobrar a terceros: {fmt.format(parseFloat(monto) - parseFloat(miConsumo))}</div>
                    )}

                    <input type="text" placeholder="¿Quién te debe? (ej. Amigos cena, Carlos)" value={deudor} onChange={(e) => setDeudor(e.target.value)} style={{ ...inputStyle, marginTop: '8px' }} aria-label="Deudor" />

                    <input type="text" placeholder="Concepto de la deuda (opcional)" value={conceptoDeuda} onChange={(e) => setConceptoDeuda(e.target.value)} style={{ ...inputStyle, marginTop: '8px' }} aria-label="Concepto de deuda" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="submit" style={{ ...btnPrimary, flex: 1, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {initialData ? 'Guardar' : esMeses ? `Registrar MSI` : `Guardar gasto`}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} style={{ ...btnSecondary, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cancelar</button>
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
