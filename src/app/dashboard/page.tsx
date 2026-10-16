'use client';

/**
 * Dashboard principal — Feature 1: Dashboard de Tarjetas (FR-09 a FR-14, FR-31).
 * Consume useTarjetas() + useComprasMSI() — NFR-06b.
 * Agrega CRUD completo de Tarjetas (Caveman style).
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTarjetas, useComprasMSI, useCrearTarjeta, useActualizarTarjeta, useEliminarTarjeta, useMovimientos } from '@/lib/hooks';
import { calcularSaldoEfectivo } from '@/lib/finance/efectivo';
import { TarjetaCard } from '@/components/dashboard/TarjetaCard';
import { EfectivoCard } from '@/components/dashboard/EfectivoCard';

import { SortableTarjeta } from '@/components/dashboard/SortableTarjeta';
import { TarjetaFormModal } from '@/components/dashboard/TarjetaFormModal';
import { MovimientosTarjetaModal } from '@/components/dashboard/MovimientosTarjetaModal';
import { ApartadoFormModal } from '@/components/dashboard/ApartadoFormModal';
import { MoverDineroApartadoModal } from '@/components/dashboard/MoverDineroApartadoModal';
import { AjusteSaldoModal } from '@/components/dashboard/AjusteSaldoModal';
import { ImportarMovimientosModal } from '@/components/dashboard/ImportarMovimientosModal';
import { CuentasPorCobrarCard } from '@/components/dashboard/CuentasPorCobrarCard';
import { MsiApartadosPanel } from '@/components/dashboard/MsiApartadosPanel';
import { GlassCard } from '@/components/ui';
import { Plus, HelpCircle, Eye, EyeOff, UploadCloud } from 'lucide-react';
import type { TarjetaConEstado } from '@/lib/types';

export default function DashboardPage() {
  const { data: tarjetas, isLoading: loadT, error: errT } = useTarjetas();
  const { data: comprasMSI = [], isLoading: loadM } = useComprasMSI();
  const { data: movimientos = [] } = useMovimientos();
  
  const { mutate: crear } = useCrearTarjeta();
  const { mutate: actualizar } = useActualizarTarjeta();
  const { mutate: eliminar } = useEliminarTarjeta();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TarjetaConEstado | null>(null);
  const [viewingCard, setViewingCard] = useState<TarjetaConEstado | null>(null);
  const [apartadoCard, setApartadoCard] = useState<TarjetaConEstado | null>(null);
  const [moveApartado, setMoveApartado] = useState<{ id: string, maxRetiro: number, maxIngreso: number } | null>(null);
  const [ajustandoTarjeta, setAjustandoTarjeta] = useState<TarjetaConEstado | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  const [showFlags, setShowFlags] = useState(true);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [showBalances, setShowBalances] = useState(true);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  useEffect(() => {
    const savedFlags = localStorage.getItem('fintrack_show_flags');
    if (savedFlags !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowFlags(savedFlags === 'true');
    }
    const savedBalances = localStorage.getItem('fintrack_show_balances');
    if (savedBalances !== null) {
      setShowBalances(savedBalances === 'true');
    }
  }, []);

  useEffect(() => {
    if (tarjetas) {
      const savedOrder = localStorage.getItem('fintrack_card_order');
      let parsed: string[] = [];
      if (savedOrder) {
        try { parsed = JSON.parse(savedOrder); } catch {}
      }
      const existingIds = new Set(tarjetas.map(t => t.id));
      existingIds.add('efectivo');
      const validOrder = parsed.filter(id => existingIds.has(id));
      const missingIds = ['efectivo', ...tarjetas.map(t => t.id)].filter(id => !validOrder.includes(id));
      
      const newOrder = [...validOrder, ...missingIds];
      // Only set if different to avoid unnecessary renders
      if (newOrder.join(',') !== cardOrder.join(',')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCardOrder(newOrder);
      }
    }
  }, [tarjetas, cardOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('fintrack_card_order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const toggleFlags = () => {
    setShowFlags((prev) => {
      const next = !prev;
      localStorage.setItem('fintrack_show_flags', String(next));
      return next;
    });
  };

  const isLoading = loadT || loadM;

  const handleOpenModal = (tarjeta?: TarjetaConEstado) => {
    if (tarjeta) {
      setEditingCard(tarjeta);
    } else {
      setEditingCard(null);
      setModalOpen(true);
    }
  };

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 id="title-tarjetas" style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: '26px',
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          Tus tarjetas
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isEditingOrder && (
            <button
              onClick={() => setIsEditingOrder(false)}
              style={{
                background: 'var(--brand)', border: 'none', color: '#fff',
                cursor: 'pointer', padding: '6px 14px', borderRadius: '16px',
                fontSize: '13px', fontWeight: 600,
              }}
            >
              Hecho
            </button>
          )}



          <button
            onClick={() => {
              setShowBalances((prev) => {
                const next = !prev;
                localStorage.setItem('fintrack_show_balances', String(next));
                return next;
              });
            }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-primary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            aria-label="Ocultar saldos"
          >
            {showBalances ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            onClick={() => setInfoModalOpen(true)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
            aria-label="Info de banderas de gasto"
          >
            <HelpCircle size={18} />
          </button>
          
          <button
            onClick={toggleFlags}
            style={{
              background: showFlags ? 'var(--brand)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '20px',
              width: '40px',
              height: '22px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
            aria-label="Activar banderas de gasto"
          >
            <motion.div
              animate={{ x: showFlags ? 18 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                width: '18px',
                height: '18px',
                background: '#fff',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                position: 'absolute',
                top: '2px',
                left: 0
              }}
            />
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: '200px',
                borderRadius: '22px',
                background: 'var(--surface-glass)',
                border: '1px solid var(--border-glass)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {errT && (
        <GlassCard glow="rojo" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--credito-rojo)', fontSize: '14px' }}>
            Error al cargar tarjetas: {errT.message}
          </p>
        </GlassCard>
      )}

      {!isLoading && !errT && tarjetas && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <EfectivoCard 
              saldo={calcularSaldoEfectivo(movimientos)} 
              showBalance={showBalances}
              onClick={() => setViewingCard({
                id: 'efectivo',
                nombre: 'Efectivo',
                tipo: 'Débito', // Fake tipo para omitir lógicas de crédito
                disponible: calcularSaldoEfectivo(movimientos),
                limite: 0,
                marca: 'Mastercard',
                color: 'blue'
              } as unknown as TarjetaConEstado)}
            />
            <CuentasPorCobrarCard />
          </div>

          {tarjetas.length === 0 ? (
            <GlassCard style={{ padding: '40px 24px', textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Aún no tienes tarjetas. Agrega una para comenzar.
              </p>
            </GlassCard>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={cardOrder.filter(id => id !== 'efectivo')}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-4 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {cardOrder.map((id) => {
                    if (id === 'efectivo') return null;

                    const t = tarjetas.find(card => card.id === id);
                    if (!t) return null;
                    return (
                      <div key={t.id} className="min-w-[280px] max-w-[340px] flex-1 snap-center">
                        <SortableTarjeta 
                          id={t.id}
                          isEditing={isEditingOrder}
                          onLongPress={() => setIsEditingOrder(true)}
                        >
                        <TarjetaCard
                          tarjeta={t}
                          showFlags={showFlags}
                          variant="full"
                          showBalance={showBalances}
                          onEdit={(t) => setEditingCard(t)}
                          onDelete={eliminar}
                          onViewDetails={(t) => setViewingCard(t)}
                          onAjustarSaldo={(t) => setAjustandoTarjeta(t)}
                        />
                        </SortableTarjeta>
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {tarjetas.length > 0 && (
            <MsiApartadosPanel
              tarjetas={tarjetas}
              comprasMSI={comprasMSI}
              showBalance={showBalances}
              onAddApartado={(t) => setApartadoCard(t)}
              onMoveApartado={(id, maxRetiro, maxIngreso) => setMoveApartado({ id, maxRetiro, maxIngreso })}
            />
          )}

          {/* Botón Agregar Tarjeta */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              id="btn-add-card"
              onClick={() => handleOpenModal()}
              style={{
                flex: 1,
                height: '40px',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1px dashed var(--border-glass)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Plus size={16} />
                <span>Agregar tarjeta</span>
              </div>
            </button>

            <button
              onClick={() => setImportModalOpen(true)}
              style={{
                flex: 1,
                height: '40px',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1px dashed var(--border-glass)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <UploadCloud size={16} />
                <span>Importar CSV</span>
              </div>
            </button>
          </div>

          {/* Sección Salud Financiera */}

        </>
      )}

      {/* Modales */}
      <TarjetaFormModal
        isOpen={modalOpen || editingCard !== null}
        onClose={() => { setModalOpen(false); setEditingCard(null); }}
        initialData={editingCard || undefined}
        onSubmit={(datos) => {
          if (editingCard) {
            actualizar({ id: editingCard.id, campos: datos });
          } else {
            crear(datos as unknown as import('@/lib/api-inputs').NuevaTarjetaInput);
          }
          setModalOpen(false);
          setEditingCard(null);
        }}
      />

      <ApartadoFormModal
        isOpen={apartadoCard !== null}
        onClose={() => setApartadoCard(null)}
        tarjeta={apartadoCard}
      />

      <MoverDineroApartadoModal
        isOpen={moveApartado !== null}
        onClose={() => setMoveApartado(null)}
        apartadoId={moveApartado?.id || null}
        maxRetiro={moveApartado?.maxRetiro || 0}
        maxIngreso={moveApartado?.maxIngreso || 0}
      />

      <AjusteSaldoModal
        isOpen={ajustandoTarjeta !== null}
        onClose={() => setAjustandoTarjeta(null)}
        tarjeta={ajustandoTarjeta}
      />

      <ImportarMovimientosModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />

      {/* Modal Detalles */}
      <MovimientosTarjetaModal
        tarjeta={viewingCard}
        onClose={() => setViewingCard(null)}
      />

      {/* Modal de Información de Banderas */}
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
                Banderas de Gasto
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--credito-verde)' }} />
                  <div><strong>Rango ideal (0% - 30%)</strong><br/>Uso óptimo de la tarjeta.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--credito-amarillo)' }} />
                  <div><strong>Controla tus gastos (30% - 80%)</strong><br/>Precaución al endeudarte más.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--credito-rojo)' }} />
                  <div><strong>Cuidado (&gt;80%)</strong><br/>Alto nivel de deuda.</div>
                </div>
              </div>
              <button
                onClick={() => setInfoModalOpen(false)}
                style={{
                  width: '100%', marginTop: '24px', padding: '12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
                  color: 'var(--text-primary)', cursor: 'pointer'
                }}
              >
                Entendido
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </main>
  );
}
