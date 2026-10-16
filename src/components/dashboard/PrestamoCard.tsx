'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui';
import { ArrowDownRight, ArrowUpRight, Calculator, Calendar } from 'lucide-react';
import type { Prestamo } from '@/lib/types';
import { PrestamoDetalleModal } from './PrestamoDetalleModal';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function PrestamoCard({ prestamo }: { prestamo: Prestamo }) {
  const [modalOpen, setModalOpen] = useState(false);

  const progreso = ((prestamo.montoOriginal - prestamo.saldoInsoluto) / prestamo.montoOriginal) * 100;
  const esActivo = prestamo.direccion === 'activo';

  return (
    <>
      <GlassCard onClick={() => setModalOpen(true)} style={{ padding: '16px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: esActivo ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: esActivo ? 'var(--credito-verde)' : 'var(--credito-rojo)'
            }}>
              {esActivo ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 600 }}>{prestamo.nombre}</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{prestamo.contacto || prestamo.tipo}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>
              {fmt.format(prestamo.saldoInsoluto)}
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Saldo Pendiente</p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ height: '100%', background: esActivo ? 'var(--credito-verde)' : 'var(--brand)', width: `${progreso}%` }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} /> {prestamo.plazoMesesTotales - prestamo.mesesPagados} meses restantes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calculator size={14} /> {prestamo.tasaAnual}% Anual
          </div>
        </div>
      </GlassCard>

      {modalOpen && <PrestamoDetalleModal prestamo={prestamo} onClose={() => setModalOpen(false)} />}
    </>
  );
}