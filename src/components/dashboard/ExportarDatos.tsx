'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useMovimientos } from '@/lib/hooks';

export function ExportarDatos() {
  const [isExporting, setIsExporting] = useState(false);
  const { data: movimientos } = useMovimientos();

  const handleExport = () => {
    if (!movimientos || movimientos.length === 0) return;
    setIsExporting(true);

    try {
      // Usar tabulador (\t) para evitar conflictos con comas en comercios/nombres
      const headers = ['Fecha', 'Hora', 'Tipo', 'Categoría', 'Comercio', 'Monto', 'Método de Pago'];
      const rows = movimientos.map(m => [
        m.fecha,
        m.hora,
        m.tipo,
        m.categoria?.replace(/[\t\r\n]/g, ' ') || '',
        m.comercio?.replace(/[\t\r\n]/g, ' ') || '',
        m.monto.toString(),
        m.metodoPago?.replace(/[\t\r\n]/g, ' ') || ''
      ]);

      const tsvContent = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t'))
      ].join('\n');

      const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fintrack_movimientos_${new Date().toISOString().split('T')[0]}.tsv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || !movimientos || movimientos.length === 0}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'var(--text-primary)',
        fontSize: '14px',
        fontWeight: 600,
        cursor: (isExporting || !movimientos || movimientos.length === 0) ? 'not-allowed' : 'pointer',
        opacity: (isExporting || !movimientos || movimientos.length === 0) ? 0.6 : 1,
        transition: 'background 0.2s'
      }}
    >
      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      Exportar a TSV
    </button>
  );
}
