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
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTarjetas, useComprasMSI, useMetas, useCrearTarjeta, useActualizarTarjeta, useEliminarTarjeta } from '@/lib/hooks';
import { TarjetaCard } from '@/components/dashboard/TarjetaCard';
import { SaludFinanciera } from '@/components/dashboard/SaludFinanciera';
import { SortableTarjeta } from '@/components/dashboard/SortableTarjeta';
import { TarjetaFormModal } from '@/components/dashboard/TarjetaFormModal';
import { MovimientosTarjetaModal } from '@/components/dashboard/MovimientosTarjetaModal';
import { GlassCard } from '@/components/ui';
import { Plus, HelpCircle, LayoutGrid, List } from 'lucide-react';
import type { TarjetaConEstado } from '@/lib/types';
import type { NuevaTarjetaInput } from '@/lib/api-inputs';

export default function DashboardPage() {
  const { data: tarjetas, isLoading: loadT, error: errT } = useTarjetas();
  const { data: comprasMSI = [], isLoading: loadM } = useComprasMSI();
  const { data: metas = [] } = useMetas();
  
  const { mutate: crear, isPending: creating } = useCrearTarjeta();
  const { mutate: actualizar, isPending: updating } = useActualizarTarjeta();
  const { mutate: eliminar } = useEliminarTarjeta();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TarjetaConEstado | null>(null);
  const [viewingCard, setViewingCard] = useState<TarjetaConEstado | null>(null);
  
  const [showFlags, setShowFlags] = useState(true);
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [isEditingOrder, setIsEditingOrder] = useState(false);

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
    const savedView = localStorage.getItem('fintrack_card_view_mode');
    if (savedView === 'compact' || savedView === 'full') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewMode(savedView);
    }
  }, []);

  useEffect(() => {
    if (tarjetas) {
      const savedOrder = localStorage.getItem('fintrack_card_order');
      let parsed: string[] = [];
      if (savedOrder) {
        try { parsed = JSON.parse(savedOrder); } catch (e) {}
      }
      const existingIds = new Set(tarjetas.map(t => t.id));
      const validOrder = parsed.filter(id => existingIds.has(id));
      const missingIds = tarjetas.map(t => t.id).filter(id => !validOrder.includes(id));
      
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
  const isPending = creating || updating;

  const handleOpenModal = (tarjeta?: TarjetaConEstado) => {
    setEditingCard(tarjeta || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCard(null);
  };

  const handleSubmit = (data: Partial<NuevaTarjetaInput>) => {
    if (editingCard) {
      actualizar({ id: editingCard.id, campos: data }, {
        onSuccess: () => handleCloseModal()
      });
    } else {
      crear(data as NuevaTarjetaInput, {
        onSuccess: () => handleCloseModal()
      });
    }
  };

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{
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
              setViewMode((prev) => {
                const next = prev === 'full' ? 'compact' : 'full';
                localStorage.setItem('fintrack_card_view_mode', next);
                return next;
              });
            }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-primary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            aria-label="Cambiar vista de tarjetas"
          >
            {viewMode === 'full' ? <LayoutGrid size={16} /> : <List size={16} />}
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
                items={cardOrder}
                strategy={viewMode === 'compact' ? rectSortingStrategy : verticalListSortingStrategy}
              >
                <div style={viewMode === 'compact' ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                } : {}}>
                  {cardOrder.map((id) => {
                    const t = tarjetas.find(card => card.id === id);
                    if (!t) return null;
                    return (
                      <SortableTarjeta 
                        key={t.id} 
                        id={t.id}
                        isEditing={isEditingOrder}
                        onLongPress={() => setIsEditingOrder(true)}
                      >
                        <TarjetaCard
                          tarjeta={t}
                          comprasMSI={comprasMSI.filter((m) => m.tarjetaId === t.id)}
                          metas={metas}
                          showFlags={showFlags}
                          variant={viewMode}
                          onEdit={handleOpenModal}
                          onDelete={(id) => eliminar(id)}
                          onViewDetails={(t) => setViewingCard(t)}
                        />
                      </SortableTarjeta>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Botón Agregar Tarjeta */}
          <GlassCard
            as="button"
            onClick={() => handleOpenModal()}
            style={{
              width: '100%',
              padding: '24px',
              borderStyle: 'dashed',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Plus size={18} />
              <span>Agregar tarjeta</span>
            </div>
          </GlassCard>

          {/* Sección Salud Financiera */}
          <SaludFinanciera />
        </>
      )}

      {/* Modal CRUD */}
      <TarjetaFormModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingCard || undefined}
        isPending={isPending}
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
