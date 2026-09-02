'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CuentaYield } from '@/lib/types';
import { useActivos, useCuentasYield, useTarjetas, useMovimientos, useAddActivo, useAddCuentaYield, useDeleteActivo, useDeleteCuentaYield, useUpdateActivo, useUpdateCuentaYield } from '@/lib/hooks';
import { calcularSaldoEfectivo } from '@/lib/finance/efectivo';
import { AddInversionModal } from './AddInversionModal';
import { AddCuentaYieldModal } from './AddCuentaYieldModal';
import { PatrimonialAnalytics } from './analytics/PatrimonialAnalytics';
import { GlassCard, GlassSelect, ConfirmModal } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import { Plus, Trash, TrendingUp, Wallet, Bitcoin, LineChart, DollarSign, HelpCircle, Pencil } from 'lucide-react';

export function DashboardPatrimonial() {
  const { data: activos = [], isLoading: loadA } = useActivos();
  const { data: yields = [], isLoading: loadY } = useCuentasYield();
  const { data: tarjetas = [], isLoading: loadT } = useTarjetas();
  const { data: movimientos = [], isLoading: loadM } = useMovimientos();
  
  const { mutate: addActivo, isPending: addingA } = useAddActivo();
  const { mutate: addYield, isPending: addingY } = useAddCuentaYield();
  const { mutate: delActivo } = useDeleteActivo();
  const { mutate: delYield } = useDeleteCuentaYield();
  const { mutate: updateActivo } = useUpdateActivo();
  const { mutate: updateYield } = useUpdateCuentaYield();

  const [activeTab, setActiveTab] = useState<'activos' | 'yields'>('activos');

  const yieldsCombinados = useMemo(() => {
    const list: (CuentaYield & { isAuto?: boolean })[] = [...yields];
    tarjetas.forEach(t => {
      if (t.tipo === 'Débito') {
        if (t.rendimientoAnual > 0) {
          list.push({
            id: `card-${t.id}`,
            nombre: `Saldo ${t.nombre}`,
            moneda: 'MXN',
            apy: t.rendimientoAnual,
            balanceInicial: t.disponible,
            balanceActual: t.disponible,
            valorTotalMXN: t.disponible,
            ultimaActualizacion: new Date().toISOString().split('T')[0],
            isAuto: true
          });
        }
        if (t.apartados) {
          t.apartados.forEach(a => {
            if (a.rendimientoAnual > 0) {
              list.push({
                id: `apt-${a.id}`,
                nombre: `${a.nombre} (${t.nombre})`,
                moneda: 'MXN',
                apy: a.rendimientoAnual,
                balanceInicial: a.balanceInicial,
                balanceActual: a.balanceCalculado,
                valorTotalMXN: a.balanceCalculado,
                ultimaActualizacion: a.ultimaActualizacion || new Date().toISOString().split('T')[0],
                isAuto: true
              });
            }
          });
        }
      }
    });
    return list;
  }, [yields, tarjetas]);
  const [showAddActivo, setShowAddActivo] = useState(false);
  const [showAddYield, setShowAddYield] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'activo' | 'yield', id: string } | null>(null);
  
  const [editTarget, setEditTarget] = useState<{ type: 'activo' | 'yield', id: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editInversionInicial, setEditInversionInicial] = useState('');



  const totalActivos = activos.reduce((sum, a) => sum + (a.valorTotal || 0), 0);
  
  // Incluir TODO el efectivo y cuentas bancarias en el patrimonio
  let totalBancario = 0;
  tarjetas.filter(t => t.tipo === 'Débito').forEach(t => {
    totalBancario += t.disponible;
    if (t.apartados) {
      t.apartados.forEach(a => { totalBancario += a.balanceCalculado; });
    }
  });

  const totalYieldsPuros = yields.reduce((sum, y) => sum + (y.valorTotalMXN || y.balanceActual), 0);
  const balanceEfectivo = calcularSaldoEfectivo(movimientos);
  const granTotal = totalActivos + totalYieldsPuros + totalBancario + balanceEfectivo;

  const [displayCurrency, setDisplayCurrency] = useState('MXN');
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/prices?symbols=MXN=X,EURMXN=X,BTC-USD')
      .then(res => res.json())
      .then(data => setRates(data))
      .catch(console.error);
  }, []);

  const getConvertedValue = (valMXN: number) => {
    if (displayCurrency === 'USD' && rates['MXN=X']) return valMXN / rates['MXN=X'];
    if (displayCurrency === 'EUR' && rates['EURMXN=X']) return valMXN / rates['EURMXN=X'];
    if (displayCurrency === 'BTC' && rates['BTC-USD']) return valMXN / rates['BTC-USD'];
    return valMXN;
  };

  const formatConverted = (valMXN: number, minDecimals = 2) => {
    const val = getConvertedValue(valMXN);
    if (displayCurrency === 'BTC') return `₿ ${val.toFixed(6)}`;
    
    try {
      const currencyFormatter = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: displayCurrency,
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: 2
      });
      return currencyFormatter.format(val);
    } catch {
      // Fallback en caso de moneda no soportada por el navegador
      return `${displayCurrency} ${val.toFixed(2)}`;
    }
  };

  const handleAddActivo = (datos: { simbolo: string; tipo: 'crypto' | 'stock' | 'etf'; cantidad: number; inversionInicial: number }) => {
    addActivo({
      simbolo: datos.simbolo,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      inversionInicial: datos.inversionInicial,
    }, {
      onSuccess: () => {
        setShowAddActivo(false);
      }
    });
  };

  const handleAddYield = (datos: { nombre: string; moneda: 'MXN' | 'USD' | 'USDC' | 'USDT'; balance_inicial: number; apy: number }) => {
    addYield({
      nombre: datos.nombre,
      moneda: datos.moneda,
      balance_inicial: datos.balance_inicial,
      apy: datos.apy,
      ultima_actualizacion: new Date().toISOString().split('T')[0]
    }, {
      onSuccess: () => {
        setShowAddYield(false);
      }
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editValue) return;

    if (editTarget.type === 'activo') {
      updateActivo({ id: editTarget.id, campos: { cantidad: parseFloat(editValue), inversionInicial: editInversionInicial ? parseFloat(editInversionInicial) : undefined } }, {
        onSuccess: () => setEditTarget(null)
      });
    } else {
      updateYield({ id: editTarget.id, campos: { balance_inicial: parseFloat(editValue), ultima_actualizacion: new Date().toISOString().split('T')[0] } }, {
        onSuccess: () => setEditTarget(null)
      });
    }
  };

  if (loadA || loadY || loadT || loadM) {
    return <Loader label="Cargando portafolio..." fullHeight />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Patrimonio Total
            </div>
            <div style={{ width: '80px', zIndex: 10 }}>
              <GlassSelect
                options={['MXN', 'USD', 'EUR', 'BTC']}
                value={displayCurrency}
                onChange={setDisplayCurrency}
              />
            </div>
          </div>
          <button
            onClick={() => setInfoModalOpen(true)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
            aria-label="Info de instrumentos"
          >
            <HelpCircle size={18} />
          </button>
        </div>
        <div style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {formatConverted(granTotal, 0)}
          <div style={{ background: 'var(--credito-verde)', color: '#000', fontSize: '12px', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> LIVE
          </div>
        </div>
      </div>

      <PatrimonialAnalytics activos={activos} yields={yields} tarjetas={tarjetas} />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('activos')}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px',
            background: activeTab === 'activos' ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: activeTab === 'activos' ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
            color: activeTab === 'activos' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <LineChart size={18} /> Renta Variable
        </button>
        <button
          onClick={() => setActiveTab('yields')}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px',
            background: activeTab === 'yields' ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: activeTab === 'yields' ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
            color: activeTab === 'yields' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <Wallet size={18} /> Cuentas Yield
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'activos' && (
          <motion.div key="activos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Criptomonedas y acciones</h3>
              <button onClick={() => setShowAddActivo(true)} style={{ background: 'var(--brand)', color: '#000', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Plus size={18} />
              </button>
            </div>
            {showAddActivo && (
              <AddInversionModal
                onClose={() => setShowAddActivo(false)}
                onSubmit={handleAddActivo}
                isPending={addingA}
              />
            )}

            {activos.length === 0 && !showAddActivo && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No tienes activos registrados.</div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activos.map(a => (
                <GlassCard key={a.id} style={{ padding: 0 }}>
                  <div style={{ padding: '16px', position: 'relative', display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', color: 'var(--brand)', width: '64px', minHeight: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {a.tipo === 'crypto' ? <Bitcoin size={32} /> : <LineChart size={32} />}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '24px' }}>
                      <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.2 }}>{a.simbolo}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{a.cantidad} posesiones</div>
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor Total</div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>{formatConverted(a.valorTotal || 0)}</div>
                          {(() => {
                            const valAct = a.valorTotal || 0;
                            const invIni = a.inversionInicial || 0;
                            if (invIni === 0) return null;
                            const diff = valAct - invIni;
                            const isPositive = diff >= 0;
                            const diffPorcentaje = (diff / invIni) * 100;
                            
                            return (
                              <div style={{ fontSize: '12px', color: isPositive ? 'var(--credito-verde)' : '#ff4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                {isPositive ? '▲' : '▼'} {formatConverted(Math.abs(diff))} ({diffPorcentaje > 0 ? '+' : ''}{diffPorcentaje.toFixed(2)}%)
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio Mercado</div>
                          <div style={{ fontSize: '14px', color: 'var(--credito-verde)', fontWeight: 500 }}>{formatConverted(a.precioActual || 0)} c/u</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                      <button onClick={() => { setEditTarget({ type: 'activo', id: a.id }); setEditValue(String(a.cantidad)); setEditInversionInicial(String(a.inversionInicial || 0)); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => setDeleteTarget({ type: 'activo', id: a.id })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'yields' && (
          <motion.div key="yields" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Cuentas de Rendimiento</h3>
              <button onClick={() => setShowAddYield(true)} style={{ background: 'var(--brand)', color: '#000', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Plus size={18} />
              </button>
            </div>

            {showAddYield && (
              <AddCuentaYieldModal
                onClose={() => setShowAddYield(false)}
                onSubmit={handleAddYield}
                isPending={addingY}
              />
            )}

            {yieldsCombinados.length === 0 && !showAddYield && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No tienes cuentas yield.</div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {yieldsCombinados.map((y: CuentaYield & { isAuto?: boolean }) => (
                <GlassCard key={y.id} style={{ padding: 0 }}>
                  <div style={{ padding: '16px', position: 'relative', display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', color: '#4ade80', width: '64px', minHeight: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={32} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '24px' }}>
                      <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.2 }}>{y.nombre}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{y.apy}% APY Pasivo</div>
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor Total</div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>
                            {formatConverted(y.moneda === 'MXN' ? y.balanceActual : (y.valorTotalMXN || y.balanceActual))}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rendimiento Total</div>
                          <div style={{ fontSize: '14px', color: 'var(--credito-verde)', fontWeight: 500 }}>
                            +{formatConverted((y.valorTotalMXN || y.balanceActual) - (y.moneda === 'MXN' ? y.balanceInicial : y.balanceInicial * ((y.valorTotalMXN || 1) / y.balanceActual)))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!y.isAuto && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setEditTarget({ type: 'yield', id: y.id }); setEditValue(String(y.moneda === 'MXN' ? y.balanceActual.toFixed(2) : y.balanceActual)); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                          <Pencil size={18} />
                        </button>
                        <button onClick={() => setDeleteTarget({ type: 'yield', id: y.id })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                          <Trash size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {infoModalOpen && (
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
            <div style={{ position: 'absolute', inset: 0 }} onClick={() => setInfoModalOpen(false)} />
            
            <GlassCard style={{ width: '100%', maxWidth: '380px', padding: '24px', zIndex: 1, position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
                Acerca de tus Inversiones
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Acciones y ETFs (Renta Variable)</strong><br/>
                  Representan una fracción de propiedad en empresas o fondos cotizados. Su valor es volátil y depende del mercado, pero históricamente ofrecen los mayores retornos a largo plazo.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Criptomonedas (Renta Variable)</strong><br/>
                  Activos digitales descentralizados (como Bitcoin). Son instrumentos de altísima volatilidad y riesgo, útiles para diversificación agresiva.
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Cuentas Yield (Renta Pasiva)</strong><br/>
                  Cuentas remuneradas que te pagan un porcentaje anual (APY) solo por mantener tu dinero ahí (ej. Mercado Pago, CETES). Son de bajo riesgo.
                </div>
              </div>
              <button
                onClick={() => setInfoModalOpen(false)}
                style={{
                  width: '100%', marginTop: '24px', padding: '12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                  color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600
                }}
              >
                Entendido
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          >
            <div style={{ position: 'absolute', inset: 0 }} onClick={() => setEditTarget(null)} />
            <GlassCard style={{ width: '100%', maxWidth: '320px', padding: '24px', zIndex: 1, position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
                Editar {editTarget.type === 'activo' ? 'cantidad' : 'balance'}
              </h2>
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {editTarget.type === 'activo' ? 'Nueva cantidad (Posesiones)' : 'Nuevo balance inicial'}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-primary)', outline: 'none'
                    }}
                  />
                </div>
                
                {editTarget.type === 'activo' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Inversión Inicial (MXN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editInversionInicial}
                      onChange={e => setEditInversionInicial(e.target.value)}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-primary)', outline: 'none'
                      }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" style={{ flex: 1, background: 'var(--brand)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer' }}>
                    Guardar
                  </button>
                  <button type="button" onClick={() => setEditTarget(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="¿Eliminar registro?"
        message="Esta acción no se puede deshacer y el activo será removido de tu portafolio permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTarget?.type === 'activo') delActivo(deleteTarget.id);
          if (deleteTarget?.type === 'yield') delYield(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  );
}
