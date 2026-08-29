'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useActivos, useCuentasYield, useAddActivo, useAddCuentaYield, useDeleteActivo, useDeleteCuentaYield, useUpdateActivo, useUpdateCuentaYield } from '@/lib/hooks';
import { GlassCard, GlassSelect, ConfirmModal } from '@/components/ui';
import { Plus, Trash, TrendingUp, Wallet, Bitcoin, LineChart, DollarSign, HelpCircle, Pencil } from 'lucide-react';

export function DashboardPatrimonial() {
  const { data: activos = [], isLoading: loadA } = useActivos();
  const { data: yields = [], isLoading: loadY } = useCuentasYield();
  
  const { mutate: addActivo, isPending: addingA } = useAddActivo();
  const { mutate: addYield, isPending: addingY } = useAddCuentaYield();
  const { mutate: delActivo } = useDeleteActivo();
  const { mutate: delYield } = useDeleteCuentaYield();
  const { mutate: updateActivo } = useUpdateActivo();
  const { mutate: updateYield } = useUpdateCuentaYield();

  const [activeTab, setActiveTab] = useState<'activos' | 'yields'>('activos');
  const [showAddActivo, setShowAddActivo] = useState(false);
  const [showAddYield, setShowAddYield] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'activo' | 'yield', id: string } | null>(null);
  
  const [editTarget, setEditTarget] = useState<{ type: 'activo' | 'yield', id: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const [formActivo, setFormActivo] = useState({ simbolo: '', tipo: 'Cripto', cantidad: '' });
  const [formYield, setFormYield] = useState({ nombre: '', moneda: 'MXN', balance_inicial: '', apy: '' });

  const totalActivos = activos.reduce((sum, a) => sum + (a.valorTotal || 0), 0);
  const totalYields = yields.reduce((sum, y) => sum + (y.valorTotalMXN || y.balanceActual), 0);
  const granTotal = totalActivos + totalYields;

  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  const handleAddActivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActivo.simbolo || !formActivo.cantidad) return;
    const tipoDb = formActivo.tipo === 'Cripto' ? 'crypto' : formActivo.tipo === 'Acción' ? 'stock' : 'etf';
    addActivo({
      simbolo: formActivo.simbolo.toUpperCase(),
      tipo: tipoDb as 'crypto'|'stock'|'etf',
      cantidad: parseFloat(formActivo.cantidad)
    }, {
      onSuccess: () => {
        setShowAddActivo(false);
        setFormActivo({ simbolo: '', tipo: 'Cripto', cantidad: '' });
      }
    });
  };

  const handleAddYield = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYield.nombre || !formYield.balance_inicial || !formYield.apy) return;
    addYield({
      nombre: formYield.nombre,
      moneda: formYield.moneda as any,
      balance_inicial: parseFloat(formYield.balance_inicial),
      apy: parseFloat(formYield.apy),
      ultima_actualizacion: new Date().toISOString().split('T')[0]
    }, {
      onSuccess: () => {
        setShowAddYield(false);
        setFormYield({ nombre: '', moneda: 'MXN', balance_inicial: '', apy: '' });
      }
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) return;
    
    if (editTarget.type === 'activo') {
      updateActivo({ id: editTarget.id, campos: { cantidad: val } });
    } else {
      updateYield({ id: editTarget.id, campos: { balance_inicial: val, ultima_actualizacion: new Date().toISOString().split('T')[0] } });
    }
    setEditTarget(null);
  };

  if (loadA || loadY) {
    return <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>Cargando portafolio...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Patrimonio Total
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
          {fmt.format(granTotal)}
          <div style={{ background: 'var(--credito-verde)', color: '#000', fontSize: '12px', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> LIVE
          </div>
        </div>
      </div>

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
              <GlassCard style={{ padding: '16px', marginBottom: '16px' }}>
                <form onSubmit={handleAddActivo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <input placeholder="Símbolo (ej. BTC)" value={formActivo.simbolo} onChange={e => setFormActivo({...formActivo, simbolo: e.target.value})} style={{ flex: 1, minWidth: '120px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} required />
                    <div style={{ flex: 1, minWidth: '120px', zIndex: 10 }}>
                      <GlassSelect
                        options={['Cripto', 'Acción', 'ETF']}
                        value={formActivo.tipo}
                        onChange={(val: string) => setFormActivo({...formActivo, tipo: val})}
                        placeholder="Tipo"
                      />
                    </div>
                  </div>
                  <input type="number" step="any" placeholder="Cantidad que posees" value={formActivo.cantidad} onChange={e => setFormActivo({...formActivo, cantidad: e.target.value})} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: '#fff', boxSizing: 'border-box', width: '100%' }} required />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button type="submit" disabled={addingA} style={{ flex: 1, background: 'var(--text-primary)', color: '#000', padding: '10px', borderRadius: '8px', fontWeight: 600, border: 'none' }}>{addingA ? 'Guardando...' : 'Guardar'}</button>
                    <button type="button" onClick={() => setShowAddActivo(false)} style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', borderRadius: '8px' }}>Cancelar</button>
                  </div>
                </form>
              </GlassCard>
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
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>{fmt.format(a.valorTotal || 0)}</div>
                        <div style={{ fontSize: '13px', color: 'var(--credito-verde)' }}>{fmt.format(a.precioActual || 0)} c/u</div>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                      <button onClick={() => { setEditTarget({ type: 'activo', id: a.id }); setEditValue(String(a.cantidad)); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
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
              <GlassCard style={{ padding: '16px', marginBottom: '16px' }}>
                <form onSubmit={handleAddYield} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <input placeholder="Nombre (ej. AirTM USDC)" value={formYield.nombre} onChange={e => setFormYield({...formYield, nombre: e.target.value})} style={{ flex: 1, minWidth: '150px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} required />
                    <div style={{ width: '100px', zIndex: 10 }}>
                      <GlassSelect
                        options={['MXN', 'USD', 'USDC', 'USDT']}
                        value={formYield.moneda}
                        onChange={(val: string) => setFormYield({...formYield, moneda: val})}
                        placeholder="Moneda"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <input type="number" step="any" placeholder="Balance Inicial" value={formYield.balance_inicial} onChange={e => setFormYield({...formYield, balance_inicial: e.target.value})} style={{ flex: 1, minWidth: '150px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} required />
                    <input type="number" step="any" placeholder="APY % (ej. 5.5)" value={formYield.apy} onChange={e => setFormYield({...formYield, apy: e.target.value})} style={{ flex: 1, minWidth: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} required />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button type="submit" disabled={addingY} style={{ flex: 1, background: 'var(--text-primary)', color: '#000', padding: '10px', borderRadius: '8px', fontWeight: 600, border: 'none' }}>{addingY ? 'Guardando...' : 'Guardar'}</button>
                    <button type="button" onClick={() => setShowAddYield(false)} style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', borderRadius: '8px' }}>Cancelar</button>
                  </div>
                </form>
              </GlassCard>
            )}

            {yields.length === 0 && !showAddYield && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No tienes cuentas yield.</div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {yields.map(y => (
                <GlassCard key={y.id} style={{ padding: 0 }}>
                  <div style={{ padding: '16px', position: 'relative', display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', color: '#4ade80', width: '64px', minHeight: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={32} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '24px' }}>
                      <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.2 }}>{y.nombre}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{y.apy}% APY Pasivo</div>
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>
                          {y.moneda === 'MXN' ? fmt.format(y.balanceActual) : `${y.balanceActual.toFixed(2)} ${y.moneda}`}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--credito-verde)' }}>
                          +{fmt.format((y.valorTotalMXN || y.balanceActual) - (y.moneda === 'MXN' ? y.balanceInicial : y.balanceInicial * ((y.valorTotalMXN || 1) / y.balanceActual)))} (en MXN)
                        </div>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                      <button onClick={() => { setEditTarget({ type: 'yield', id: y.id }); setEditValue(String(y.moneda === 'MXN' ? y.balanceActual.toFixed(2) : y.balanceActual)); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => setDeleteTarget({ type: 'yield', id: y.id })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <Trash size={18} />
                      </button>
                    </div>
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
                <input
                  type="number"
                  step="any"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff', boxSizing: 'border-box', fontSize: '16px' }}
                  required
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px' }}>
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
