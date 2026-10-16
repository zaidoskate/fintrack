'use client';

/**
 * MsiApartadosPanel — submenú con MSI activos (tarjetas de crédito)
 * y apartados con rendimiento (tarjetas de débito).
 */

import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { GlassCard, ConfirmModal } from '@/components/ui';
import { useAdelantarCompraMSI } from '@/lib/hooks';
import type { TarjetaConEstado, CompraMSI } from '@/lib/types';

const fmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

interface Props {
  tarjetas: TarjetaConEstado[];
  comprasMSI: CompraMSI[];
  showBalance?: boolean;
  onAddApartado: (tarjeta: TarjetaConEstado) => void;
  onMoveApartado: (apartadoId: string, maxRetiro: number, maxIngreso: number) => void;
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', marginTop: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' };

export function MsiApartadosPanel({ tarjetas, comprasMSI, showBalance = true, onAddApartado, onMoveApartado }: Props) {
  const [tab, setTab] = useState<'msi' | 'apartados'>('msi');
  const [adelantarMSI, setAdelantarMSI] = useState<string | null>(null);
  const [adelantarMeses, setAdelantarMeses] = useState(1);
  const [adelantarDescuento, setAdelantarDescuento] = useState(0);
  const { mutate: adelantar, isPending } = useAdelantarCompraMSI();

  const credito = tarjetas.filter((t) => t.tipo === 'Crédito');
  const debito = tarjetas.filter((t) => t.tipo === 'Débito');
  const msiActivas = comprasMSI.filter((m) => m.mesesRestantes > 0 && credito.some((t) => t.id === m.tarjetaId));
  const mensualidad = msiActivas.reduce((acc, m) => acc + m.cuotaMensual, 0);
  const totalApartados = debito.reduce((n, t) => n + (t.apartados?.length ?? 0), 0);
  const mask = (n: number) => (showBalance ? fmt.format(n) : '••••');

  const tabBtn = (id: 'msi' | 'apartados', label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${tab === id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
    >
      {label}
    </button>
  );

  return (
    <GlassCard className="mt-4 mb-6 p-3 bg-zinc-900/60">
      <div className="flex gap-1 p-1 bg-black/20 rounded-xl mb-3">
        {tabBtn('msi', `Meses sin Intereses (${msiActivas.length})`)}
        {tabBtn('apartados', `Apartados y Rendimientos (${totalApartados})`)}
      </div>

      {tab === 'msi' && (
        <div className="flex flex-col gap-1.5">
          {msiActivas.length === 0 && <p className="text-xs text-zinc-500 text-center py-3">Sin MSI activos.</p>}
          {msiActivas.map((msi) => {
            const t = credito.find((c) => c.id === msi.tarjetaId);
            return (
              <button
                key={msi.id}
                onClick={() => { setAdelantarMSI(msi.id); setAdelantarMeses(1); setAdelantarDescuento(0); }}
                className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2 text-left"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] text-zinc-200 font-medium truncate">{msi.comercio}</span>
                  <span className="text-[10px] text-zinc-500">{t?.nombre} · {msi.mesesTotales - msi.mesesRestantes + 1}/{msi.mesesTotales}</span>
                </div>
                <span className="text-xs font-mono text-zinc-300 shrink-0">{mask(msi.cuotaMensual)}/mes</span>
              </button>
            );
          })}
          {msiActivas.length > 0 && (
            <div className="text-xs text-emerald-400 text-right mt-1">Mensualidad total: {mask(mensualidad)}</div>
          )}
        </div>
      )}

      {tab === 'apartados' && (
        <div className="flex flex-col gap-3">
          {debito.length === 0 && <p className="text-xs text-zinc-500 text-center py-3">Sin tarjetas de débito.</p>}
          {debito.map((t) => (
            <div key={t.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">{t.nombre}</span>
                <button onClick={() => onAddApartado(t)} className="bg-white/10 rounded text-[11px] text-zinc-100 px-2 py-0.5">
                  + Apartado
                </button>
              </div>
              {(t.apartados ?? []).length === 0 && <span className="text-[11px] text-zinc-600">Sin apartados</span>}
              {(t.apartados ?? []).map((a) => (
                <div key={a.id} className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[13px] text-zinc-200 font-medium truncate">{a.nombre}</div>
                    <div className="text-[10px] text-emerald-400">
                      {a.rendimientoAnual}% APY · +{mask(a.balanceCalculado - a.balanceInicial)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[13px] font-semibold text-zinc-100">{mask(a.balanceCalculado)}</span>
                    <button
                      onClick={() => onMoveApartado(a.id, a.balanceCalculado, t.disponible)}
                      className="bg-white/10 rounded-lg text-zinc-100 p-1.5"
                      title="Transferir a saldo"
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {adelantarMSI && (
        <ConfirmModal
          isOpen={true}
          title="Adelantar Mensualidades"
          message={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                ¿Cuántos meses deseas adelantar?
                <input type="number" min="1" max="48" value={adelantarMeses} onChange={(e) => setAdelantarMeses(Number(e.target.value))} style={inputStyle} />
              </label>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Descuento ofrecido por el banco (MXN, opcional)
                <input type="number" min="0" step="0.01" value={adelantarDescuento} onChange={(e) => setAdelantarDescuento(Number(e.target.value))} style={inputStyle} />
              </label>
            </div>
          }
          confirmText={isPending ? 'Guardando...' : 'Confirmar Adelanto'}
          cancelText="Cancelar"
          onConfirm={() => {
            adelantar({ id: adelantarMSI, meses: adelantarMeses, descuento: adelantarDescuento }, {
              onSuccess: () => setAdelantarMSI(null),
            });
          }}
          onCancel={() => setAdelantarMSI(null)}
        />
      )}
    </GlassCard>
  );
}
