'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useMetas, useCrearMeta, useAportarMeta,
  useEditarMeta, useEliminarMeta, useTarjetas, useRetirarDeMeta
} from '@/lib/hooks';
import { GlassCard, ConfirmModal, GlassSelect } from '@/components/ui';
import type { MetaConEstado, TarjetaConEstado } from '@/lib/types';
import { Trash, Calculator, Plus, Car, Home, Plane, ShieldCheck, Flag, X, ArrowDown, ArrowUp } from 'lucide-react';
import { triggerHaptic, playSuccessChime } from '@/lib/ui/feedback';
import { CalculadoraMetaModal } from '@/components/dashboard/CalculadoraMetaModal';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

// Avatar color map based on goal name
function getMetaColorAndIcon(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes('auto') || n.includes('coche') || n.includes('moto')) return { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Car };
  if (n.includes('casa') || n.includes('hogar') || n.includes('depa')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Home };
  if (n.includes('viaje') || n.includes('vuelo') || n.includes('vacaciones')) return { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Plane };
  if (n.includes('emergencia') || n.includes('salud') || n.includes('fondo')) return { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: ShieldCheck };
  return { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Flag };
}

/* ── Modal rápido de Aporte ────────────────────────────────────────────────── */
function AporteRapidoModal({
  isOpen, onClose, meta, tarjetasDebito
}: {
  isOpen: boolean; onClose: () => void; meta: MetaConEstado | null; tarjetasDebito: TarjetaConEstado[]
}) {
  const [montoAporte, setMontoAporte] = useState('');
  const [fechaAporte, setFechaAporte] = useState('');
  const [tarjetaOrigen, setTarjetaOrigen] = useState('');
  const [apartadoId, setApartadoId] = useState('');
  const [modoAccion, setModoAccion] = useState<'Aportar' | 'Retirar'>('Aportar');

  const { mutate: aportar, isPending: aportaPending } = useAportarMeta();
  const { mutate: retirar, isPending: retiraPending } = useRetirarDeMeta();

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMontoAporte('');
      setFechaAporte(new Date().toISOString().split('T')[0]);
      setTarjetaOrigen('');
      setApartadoId('');
      setModoAccion('Aportar');
    }
  }, [isOpen, meta]);

  if (!isOpen || !meta) return null;

  const tarjetaSeleccionada = tarjetasDebito.find(t => t.id === tarjetaOrigen);
  const apartadosDeTarjeta = tarjetaSeleccionada?.apartados || [];

  const handleConfirm = () => {
    const monto = parseFloat(montoAporte);
    if (monto > 0) {
      if (modoAccion === 'Aportar') {
        aportar(
          { id: meta.id, monto, tarjetaId: tarjetaOrigen || undefined, apartadoId: apartadoId || undefined, fecha: fechaAporte }, 
          { onSuccess: () => { 
              triggerHaptic('success');
              playSuccessChime();
              onClose();
          } }
        );
      } else {
        retirar(
          { id: meta.id, monto },
          { onSuccess: () => {
              triggerHaptic('success');
              onClose();
          }}
        )
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div className="absolute inset-0" onClick={onClose} />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl sm:rounded-3xl p-5 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">
              Movimiento a {meta.nombre}
            </h3>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="flex bg-zinc-950 p-1 rounded-xl mb-5">
            <button
              onClick={() => setModoAccion('Aportar')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${modoAccion === 'Aportar' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500'}`}
            >
              <ArrowUp size={16} /> Aportar
            </button>
            <button
              onClick={() => setModoAccion('Retirar')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${modoAccion === 'Retirar' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-500'}`}
            >
              <ArrowDown size={16} /> Retirar
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-zinc-400 ml-1 mb-1 block">Monto</label>
              <input
                type="number"
                placeholder="0.00"
                value={montoAporte}
                onChange={(e) => setMontoAporte(e.target.value)}
                className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-brand/50"
                min="1"
                max={modoAccion === 'Retirar' ? meta.montoActual : undefined}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 ml-1 mb-1 block">Fecha</label>
              <input
                type="date"
                value={fechaAporte}
                onChange={(e) => setFechaAporte(e.target.value)}
                className="w-full bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-brand/50 [color-scheme:dark]"
              />
            </div>

            {modoAccion === 'Aportar' && tarjetasDebito.length > 0 && (
              <div className="relative z-30">
                <label className="text-xs text-zinc-400 ml-1 mb-1 block">Origen</label>
                <GlassSelect
                  value={tarjetaOrigen}
                  onChange={(val) => {
                    setTarjetaOrigen(val);
                    setApartadoId('');
                  }}
                  options={[
                    { value: '', label: 'Efectivo / Sin tarjeta' },
                    ...tarjetasDebito.map(t => ({
                      value: t.id,
                      label: `${t.nombre} ${t.rendimientoAnual > 0 ? `(${t.rendimientoAnual}% APY)` : ''}`
                    }))
                  ]}
                  placeholder="Selecciona origen"
                />
              </div>
            )}
            
            {modoAccion === 'Aportar' && apartadosDeTarjeta.length > 0 && (
              <div className="relative z-20">
                <GlassSelect
                  value={apartadoId}
                  onChange={(val) => setApartadoId(val)}
                  options={[
                    { value: '', label: 'Balance general' },
                    ...apartadosDeTarjeta.map((a) => ({
                      value: a.id,
                      label: `${a.nombre}`
                    }))
                  ]}
                  placeholder="Selecciona apartado"
                />
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={(modoAccion === 'Aportar' ? aportaPending : retiraPending) || !montoAporte}
              className={`w-full py-3.5 rounded-xl text-zinc-950 font-bold text-[15px] transition-opacity mt-2 ${modoAccion === 'Retirar' ? 'bg-rose-400' : 'bg-brand'} ${(aportaPending || retiraPending || !montoAporte) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {(modoAccion === 'Aportar' ? aportaPending : retiraPending) ? 'Procesando…' : (modoAccion === 'Aportar' ? 'Confirmar Aporte' : 'Confirmar Retiro')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Modal de Edición ───────────────────────────────────────────────────────── */
function EditarMetaModal({ isOpen, onClose, meta }: { isOpen: boolean; onClose: () => void; meta: MetaConEstado | null }) {
  const [nombre, setNombre] = useState('');
  const [costo, setCosto] = useState('');
  const [fechaObj, setFechaObj] = useState('');
  const { mutate: editar, isPending } = useEditarMeta();
  const { mutate: eliminar } = useEliminarMeta();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && meta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre(meta.nombre);
      setCosto(String(meta.costoObjetivo));
      setFechaObj(meta.fechaObjetivo || '');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, meta]);

  if (!isOpen || !meta) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !costo) return;
    editar(
      { id: meta.id, campos: { nombre, costoObjetivo: parseFloat(costo), fechaObjetivo: fechaObj || null } },
      { onSuccess: onClose }
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div className="absolute inset-0" onClick={onClose} />
        <GlassCard className="relative w-full max-w-sm p-6 z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-lg text-white">Editar Meta</h2>
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 bg-rose-500/10 text-rose-400 rounded-full">
              <Trash size={16} />
            </button>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input required placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
            <input required type="number" placeholder="Costo" value={costo} onChange={(e) => setCosto(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" min="1" />
            <div>
              <label className="text-xs text-zinc-400 ml-1 mb-1 block">Fecha objetivo</label>
              <input type="date" value={fechaObj} onChange={(e) => setFechaObj(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none [color-scheme:dark]" />
            </div>
            <div className="flex gap-3 mt-2">
              <button type="submit" disabled={isPending} className="flex-1 bg-brand text-zinc-950 font-bold py-3 rounded-xl">
                {isPending ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" onClick={onClose} className="flex-1 bg-white/5 text-zinc-300 font-medium py-3 rounded-xl border border-white/10">Cancelar</button>
            </div>
          </form>
        </GlassCard>

        {showDeleteConfirm && (
          <ConfirmModal
            isOpen={true}
            title={`¿Eliminar ${meta.nombre}?`}
            message="Esta acción no se puede deshacer y borrará todo el progreso."
            confirmText="Eliminar"
            isDestructive
            onConfirm={() => {
              eliminar(meta.id);
              setShowDeleteConfirm(false);
              onClose();
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Card modular de meta (74px) ────────────────────────────────────────────── */
function MetaRow({ meta, onAporte, onEdit, onCalculadora }: { meta: MetaConEstado; onAporte: (m: MetaConEstado) => void; onEdit: (m: MetaConEstado) => void; onCalculadora: (m: MetaConEstado) => void }) {
  const { bg, text, icon: Icon } = getMetaColorAndIcon(meta.nombre);
  const isCompleted = meta.progreso >= 100;
  
  return (
    <div className="h-[74px] px-4 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-between gap-3 mb-2.5 backdrop-blur-md overflow-hidden relative">
      {/* ProgressBar inside Row */}
      <div className="absolute bottom-0 left-0 h-1 bg-zinc-800/50 w-full">
        <div className={`h-full ${isCompleted ? 'bg-emerald-400' : 'bg-brand'}`} style={{ width: `${Math.min(meta.progreso, 100)}%` }} />
      </div>

      <div className="flex items-center gap-3 overflow-hidden flex-1" onClick={() => onEdit(meta)}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg} ${text}`}>
          <Icon size={20} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-100 truncate">
            {meta.nombre}
          </div>
          <div className="text-xs text-zinc-400 truncate">
            {meta.proyeccion.aportesMensualesPromedio > 0 
              ? `Sugerido: ${fmt.format(meta.proyeccion.aportesMensualesPromedio)}/mes`
              : `${meta.progreso.toFixed(1)}% completado`
            }
            {meta.fechaObjetivo && meta.proyeccion.fechaEstimadaCumplimiento && ` • Hasta ${meta.proyeccion.fechaEstimadaCumplimiento.substring(0,3)}`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end mr-1">
          <div className="font-mono tabular-nums text-sm font-medium text-zinc-100 flex items-baseline gap-1">
            {fmt.format(meta.capitalAportado)}
            {meta.rendimientoGenerado > 0 && (
              <span className="text-sm font-medium text-emerald-400">+ {fmt.format(meta.rendimientoGenerado)}</span>
            )}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
            de {fmt.format(meta.costoObjetivo)}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onCalculadora(meta); }}
          aria-label="Simular meta"
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-zinc-300 flex items-center justify-center transition-all shrink-0"
        >
          <Calculator size={16} />
        </button>
        {!isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onAporte(meta); }}
            aria-label="Aporte rápido"
            className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 flex items-center justify-center transition-all shrink-0"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="absolute inset-0" onClick={onClose} />
          <GlassCard className="relative w-full max-w-sm p-6 z-10">
            <h2 className="font-display text-lg text-white mb-5">Nueva meta</h2>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <input required placeholder="Nombre de la meta" value={nombre} onChange={(e) => setNombre(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
              <input required type="number" placeholder="Costo objetivo (MXN)" value={costo} onChange={(e) => setCosto(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" min="1" />
              <div>
                <label className="text-xs text-zinc-400 ml-1 mb-1 block">Fecha objetivo (Opcional)</label>
                <input type="date" value={fechaObj} onChange={(e) => setFechaObj(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none [color-scheme:dark]" />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" disabled={isPending} className="flex-1 bg-brand text-zinc-950 font-bold py-3 rounded-xl">
                  {isPending ? 'Creando…' : 'Crear meta'}
                </button>
                <button type="button" onClick={onClose} className="flex-1 bg-white/5 text-zinc-300 font-medium py-3 rounded-xl border border-white/10">Cancelar</button>
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
  const [metaAporte, setMetaAporte] = useState<MetaConEstado | null>(null);
  const [metaEdit, setMetaEdit] = useState<MetaConEstado | null>(null);
  const [metaParaSimulador, setMetaParaSimulador] = useState<MetaConEstado | null>(null);
  const { data: metas = [], isLoading, error } = useMetas();
  const { data: tarjetas = [] } = useTarjetas();

  return (
    <div className="pb-8">
      <div className="flex justify-between items-end mb-6">
        <h1 className="font-display font-medium text-[26px] tracking-tight text-white">
          Metas
        </h1>
        <button onClick={() => setCreando(true)} className="bg-brand text-zinc-950 font-semibold px-4 py-2 rounded-xl text-sm">
          + Nueva
        </button>
      </div>

      <NuevaMetaForm isOpen={creando} onClose={() => setCreando(false)} />
      
      <AporteRapidoModal 
        isOpen={metaAporte !== null} 
        onClose={() => setMetaAporte(null)} 
        meta={metaAporte} 
        tarjetasDebito={tarjetas.filter(t => t.tipo === 'Débito')} 
      />

      <EditarMetaModal
        isOpen={metaEdit !== null}
        onClose={() => setMetaEdit(null)}
        meta={metaEdit}
      />

      {isLoading && <div className="h-20 rounded-2xl bg-zinc-900/50 border border-white/5 animate-pulse" />}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
          <p className="text-rose-400 text-sm">Error: {error.message}</p>
        </div>
      )}

      {!isLoading && !error && metas.length === 0 && !creando && (
        <GlassCard className="p-10 text-center">
          <p className="text-zinc-400 text-sm">Aún no tienes metas. Toca <strong className="text-white">+ Nueva</strong> para empezar.</p>
        </GlassCard>
      )}

      <div className="flex flex-col gap-0">
        {metas.map((m) => (
          <MetaRow 
            key={m.id} 
            meta={m} 
            onAporte={setMetaAporte} 
            onEdit={setMetaEdit} 
            onCalculadora={setMetaParaSimulador} 
          />
        ))}
      </div>

      {metaParaSimulador && (
        <CalculadoraMetaModal
          isOpen={true}
          onClose={() => setMetaParaSimulador(null)}
          meta={metaParaSimulador}
          tarjetasDebito={tarjetas.filter(t => t.tipo === 'Débito')}
        />
      )}
    </div>
  );
}
