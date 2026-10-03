'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '@/lib/motion/variants';
import { GlassCard, GlassSelect } from '@/components/ui';
import { useTarjetas, QK } from '@/lib/hooks';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Check } from 'lucide-react';

interface ImportarMovimientosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedRow {
  id: string; // temp id
  fecha: string;
  concepto: string;
  categoria: string;
  monto: number;
  tipo: 'Ingreso' | 'Gasto';
  selected: boolean;
}

function parseCSV(text: string): ParsedRow[] {
  if (!text) return [];
  const lines = text.trim().split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return [];
  
  // Detect delimiter
  const sample = lines[0];
  let delimiter = ',';
  if (sample.includes('\t')) delimiter = '\t';
  else if (sample.includes(';')) delimiter = ';';
  
  const parsed: ParsedRow[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    
    // Heurística simple: buscar una fecha y un monto numérico
    let fecha = '';
    let montoRaw = 0;
    let concepto = '';
    
    for (const col of cols) {
      // Intenta detectar fecha DD/MM/YYYY o YYYY-MM-DD
      if (/^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(col)) {
        if (col.includes('/')) {
          const [d, m, y] = col.split('/');
          fecha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
          fecha = col;
        }
        continue;
      }
      
      // Intenta detectar monto
      const cleanNum = col.replace(/[$,\s]/g, '');
      if (/^-?\d+(\.\d+)?$/.test(cleanNum) && cleanNum !== '') {
        // Podría ser un número de transacción, pero priorizamos el primer float que veamos o el último. 
        // Asumimos que el monto tiene decimales o es el último número.
        montoRaw = parseFloat(cleanNum);
        continue;
      }
      
      // Lo demás lo metemos al concepto si es largo
      if (col.length > 3 && isNaN(Number(cleanNum))) {
        concepto += (concepto ? ' ' : '') + col;
      }
    }
    
    if (fecha && !isNaN(montoRaw) && montoRaw !== 0) {
      const upperConc = concepto.toUpperCase();
      let categoriaAuto = 'Sin categoría';
      
      if (upperConc.match(/OXXO|SEVEN|7-ELEVEN|EXTRA/)) categoriaAuto = 'Conveniencia';
      else if (upperConc.match(/UBER|DIDI|GASOLIN|SHELL|BP|ESTACION/)) categoriaAuto = 'Transporte';
      else if (upperConc.match(/WALMART|SORIANA|CHEDRAUI|COSTCO|RESTAURAN|CAFE|STARBUCKS|TACOS/)) categoriaAuto = 'Comida';
      else if (upperConc.match(/NETFLIX|SPOTIFY|DISNEY|HBO|PRIME|CINEMEX|CINEPOLIS/)) categoriaAuto = 'Entretenimiento';
      else if (upperConc.match(/FARMACIA|HOSPITAL|MEDIC|CONSULT/)) categoriaAuto = 'Salud';
      else if (upperConc.match(/CFE|TELMEX|TOTALPLAY|AGUA|GAS|IZZI/)) categoriaAuto = 'Servicios';
      else if (upperConc.match(/PAGO|TARJETA/)) categoriaAuto = 'Pago de tarjeta';

      parsed.push({
        id: Math.random().toString(36).substring(7),
        fecha,
        concepto: concepto.substring(0, 50) || 'Importación manual',
        categoria: categoriaAuto,
        monto: Math.abs(montoRaw),
        tipo: montoRaw > 0 ? 'Ingreso' : 'Gasto',
        selected: true
      });
    }
  }
  return parsed;
}

export function ImportarMovimientosModal({ isOpen, onClose }: ImportarMovimientosModalProps) {
  const { modalTransition } = useMotionConfig();
  const queryClient = useQueryClient();
  const { data: tarjetas = [] } = useTarjetas();
  
  const [csvText, setCsvText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [targetTarjeta, setTargetTarjeta] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleParse = () => {
    const data = parseCSV(csvText);
    if (data.length === 0) {
      setErrorMsg('No se detectaron movimientos válidos. Asegúrate de incluir Fecha, Concepto y Monto.');
    } else {
      setErrorMsg('');
      setParsedData(data);
    }
  };

  const toggleRow = (id: string) => {
    setParsedData(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const handleImport = async () => {
    const toImport = parsedData.filter(r => r.selected);
    if (toImport.length === 0) return;

    setIsImporting(true);
    setErrorMsg('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg('No autenticado');
      setIsImporting(false);
      return;
    }

    const rows = toImport.map(r => ({
      user_id: user.id,
      fecha: r.fecha,
      hora: '12:00:00', // hora por defecto
      tipo: r.tipo,
      monto: r.monto,
      categoria: r.categoria === 'Sin categoría' ? 'Otros' : r.categoria,
      comercio: r.concepto,
      tarjeta_id: targetTarjeta === 'efectivo' ? null : targetTarjeta,
    }));

    const { error } = await supabase.from('movimientos').insert(rows);

    if (error) {
      setErrorMsg('Error al importar: ' + error.message);
      setIsImporting(false);
    } else {
      await queryClient.invalidateQueries({ queryKey: QK.movimientos() });
      await queryClient.invalidateQueries({ queryKey: QK.tarjetas });
      setIsImporting(false);
      onClose();
    }
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
          
          <GlassCard
            as="div"
            style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', zIndex: 1 }}
            {...modalTransition}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={24} /> Importador Masivo
            </h2>

            {parsedData.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Pega el texto de tu estado de cuenta o un CSV. Detectaremos automáticamente las columnas de Fecha, Concepto y Monto. Soporta comas, punto y coma y tabulaciones.
                </p>
                <textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder="20/10/2023, PAGO NETFLIX, -299.00&#10;21/10/2023, DEPOSITO NOMINA, 15000.00"
                  style={{
                    width: '100%', height: '200px', padding: '16px', borderRadius: '12px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-mono)',
                    resize: 'vertical', outline: 'none'
                  }}
                />
                
                {errorMsg && <div style={{ color: 'var(--credito-rojo)', fontSize: '13px' }}>{errorMsg}</div>}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleParse} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--brand)', color: '#000', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    Analizar Datos
                  </button>
                  <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ zIndex: 10 }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Destino de la importación</label>
                  <GlassSelect
                    value={targetTarjeta}
                    onChange={setTargetTarjeta}
                    options={[
                      { value: 'efectivo', label: 'Efectivo' },
                      ...tarjetas.map(t => ({ value: t.id, label: t.nombre }))
                    ]}
                    placeholder="Selecciona tarjeta"
                  />
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead style={{ background: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Incluir</th>
                          <th style={{ padding: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Fecha</th>
                          <th style={{ padding: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Concepto</th>
                          <th style={{ padding: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Cat. Auto</th>
                          <th style={{ padding: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.map(r => (
                          <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: r.selected ? 1 : 0.5 }}>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <button onClick={() => toggleRow(r.id)} style={{ background: r.selected ? 'var(--brand)' : 'transparent', border: r.selected ? 'none' : '1px solid var(--text-muted)', width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                                {r.selected && <Check size={14} />}
                              </button>
                            </td>
                            <td style={{ padding: '10px', color: 'var(--text-primary)' }}>{r.fecha}</td>
                            <td style={{ padding: '10px', color: 'var(--text-primary)' }}>{r.concepto}</td>
                            <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '11px' }}>{r.categoria}</td>
                            <td style={{ padding: '10px', color: r.tipo === 'Ingreso' ? 'var(--credito-verde)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                              {r.tipo === 'Ingreso' ? '+' : '-'}{r.monto}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {errorMsg && <div style={{ color: 'var(--credito-rojo)', fontSize: '13px' }}>{errorMsg}</div>}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={handleImport} 
                    disabled={isImporting || !targetTarjeta || parsedData.filter(r => r.selected).length === 0}
                    style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--brand)', color: '#000', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: (isImporting || !targetTarjeta || parsedData.filter(r => r.selected).length === 0) ? 0.5 : 1 }}
                  >
                    {isImporting ? 'Importando...' : `Importar ${parsedData.filter(r => r.selected).length} movimientos`}
                  </button>
                  <button onClick={() => setParsedData([])} disabled={isImporting} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Rehacer
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
