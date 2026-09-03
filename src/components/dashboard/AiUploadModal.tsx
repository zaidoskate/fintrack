import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { useCrearMovimiento, useCrearCompraMSI, useMovimientos, useTarjetas } from '@/lib/hooks';

export function AiUploadModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [tarjetaId, setTarjetaId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<{ movimientos: {tipo:string,monto:number,comercio:string,fecha:string}[], msi: {comercio:string,monto_total:number,meses_totales:number,fecha:string}[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { data: tarjetas = [] } = useTarjetas();
  const tarjetasCredito = tarjetas.filter(t => t.tipo === 'Crédito');
  
  const { data: movimientos = [] } = useMovimientos();
  const { mutateAsync: crearMov } = useCrearMovimiento();
  const { mutateAsync: crearMSI } = useCrearCompraMSI();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file || !tarjetaId) return;
    setIsProcessing(true);
    setErrorMsg('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/ai/parse-statement', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al procesar el documento');
      }
      
      const data = await res.json();
      if (!data.movimientos) data.movimientos = [];
      if (!data.msi) data.msi = [];
      setParsedData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error interno';
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedData || !tarjetaId) return;
    setIsProcessing(true);
    
    try {
      const tarjeta = tarjetasCredito.find(t => t.id === tarjetaId);
      if (!tarjeta) throw new Error('Tarjeta no encontrada');

      let totalMsi = 0;
      for (const m of parsedData.msi) {
        totalMsi += m.monto_total;
        await crearMSI({
          tarjetaId: tarjeta.id,
          comercio: m.comercio,
          categoria: 'Otros',
          montoTotal: m.monto_total,
          mesesTotales: m.meses_totales,
          fechaCompra: m.fecha
        });
      }

      let totalMovs = 0;
      for (const m of parsedData.movimientos) {
        if (m.tipo === 'Gasto') totalMovs += m.monto;
        if (m.tipo === 'Ingreso') totalMovs -= m.monto;
        
        await crearMov({
          tipo: m.tipo,
          monto: m.monto,
          comercio: m.comercio,
          categoria: 'Otros',
          fecha: m.fecha,
          metodoPago: tarjeta.nombre
        });
      }

      const totalAInsertar = totalMsi + totalMovs;
      
      const deudaInicialMov = movimientos.find(m => 
        m.metodo_pago === tarjeta.nombre && 
        (m.comercio === 'Deuda Inicial' || m.comercio === 'Saldo Inicial')
      );

      if (deudaInicialMov && totalAInsertar > 0) {
        await crearMov({
          tipo: 'Ingreso',
          monto: Math.min(Number(deudaInicialMov.monto), totalAInsertar),
          comercio: 'Ajuste Conciliación IA',
          categoria: 'Ajuste',
          fecha: new Date().toISOString().split('T')[0],
          metodoPago: tarjeta.nombre
        });
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setErrorMsg(msg);
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ width: '100%', maxWidth: '500px', zIndex: 10 }}>
        <GlassCard style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}>
                <path d="M8 9h.01" />
                <path d="M16 9h.01" />
                <path d="M7 15a6 6 0 0 0 10 0" />
              </svg>
              Asistente de IA
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {!parsedData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                Sube tu estado de cuenta (PDF) o una captura de pantalla de los movimientos recientes de tu app bancaria.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selecciona tu tarjeta de crédito:</label>
                <select 
                  value={tarjetaId} 
                  onChange={e => setTarjetaId(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">Seleccionar tarjeta...</option>
                  {tarjetasCredito.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed var(--brand)', borderRadius: '16px', padding: '40px 20px',
                  textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)',
                  transition: 'background 0.2s'
                }}
                onClick={() => document.getElementById('ai-file-input')?.click()}
              >
                <input 
                  id="ai-file-input" type="file" style={{ display: 'none' }} 
                  accept="application/pdf,image/*" 
                  onChange={e => {
                    if (e.target.files?.length) setFile(e.target.files[0]);
                  }} 
                />
                <Upload size={32} color="var(--brand)" style={{ marginBottom: '12px' }} />
                <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>
                  {file ? file.name : 'Toca para subir o arrastra aquí'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Soporta PDF o Imágenes (Máx 4MB)
                </div>
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--credito-rojo)', fontSize: '13px', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  {errorMsg}
                </div>
              )}

              <button 
                onClick={handleProcess}
                disabled={!file || !tarjetaId || isProcessing}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px',
                  background: 'var(--brand)', color: '#fff', fontSize: '15px', fontWeight: 600,
                  border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  opacity: (!file || !tarjetaId || isProcessing) ? 0.7 : 1
                }}
              >
                {isProcessing ? <Loader2 size={18} className="spin" /> : 'Analizar Documento'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--credito-verde)' }}>
                <CheckCircle2 size={24} />
                <div style={{ fontSize: '14px', fontWeight: 500 }}>¡Análisis completado! Revisa los datos:</div>
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {parsedData.msi.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px', margin: 0 }}>
                      Meses Sin Intereses ({parsedData.msi.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {parsedData.msi.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{m.comercio} ({m.meses_totales} MSI)</span>
                          <span style={{ fontWeight: 600, color: 'var(--credito-rojo)' }}>${m.monto_total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {parsedData.movimientos.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px', margin: 0 }}>
                      Movimientos Corrientes ({parsedData.movimientos.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {parsedData.movimientos.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{m.comercio}</span>
                          <span style={{ fontWeight: 600, color: m.tipo === 'Ingreso' ? 'var(--credito-verde)' : 'var(--credito-rojo)' }}>
                            {m.tipo === 'Ingreso' ? '+' : '-'}${m.monto}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--credito-rojo)', fontSize: '13px', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertCircle size={16} />
                  {errorMsg}
                </div>
              )}

              <button 
                onClick={handleConfirm}
                disabled={isProcessing}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px',
                  background: 'var(--brand)', color: '#fff', fontSize: '15px', fontWeight: 600,
                  border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  opacity: isProcessing ? 0.7 : 1
                }}
              >
                {isProcessing ? <Loader2 size={18} className="spin" /> : 'Confirmar e Importar Todo'}
              </button>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
