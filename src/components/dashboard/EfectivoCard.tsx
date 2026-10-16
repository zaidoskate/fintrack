import { useState } from 'react';
import { Banknote, Minus } from 'lucide-react';
import { RetiroCajeroModal } from './RetiroCajeroModal';

interface EfectivoCardProps {
  saldo: number;
  variant?: 'full' | 'compact';
  showBalance?: boolean;
  onClick?: () => void;
}

export function EfectivoCard({ saldo, showBalance = true, onClick }: EfectivoCardProps) {
  const [showRetiro, setShowRetiro] = useState(false);
  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  return (
    <>
      <div
        onClick={onClick}
        className={`h-[52px] min-h-[52px] px-4 flex items-center justify-between rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
      >
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Banknote size={16} />
          </div>
          <span className="text-xs font-semibold text-zinc-200 ml-2.5">Efectivo</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums text-sm sm:text-base font-semibold text-emerald-400 mr-3">
            {showBalance ? fmt.format(saldo) : '••••••••'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setShowRetiro(true); }}
            aria-label="Registrar retiro de efectivo"
            className="w-9 h-9 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-all shrink-0"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>

      {showRetiro && (
        <RetiroCajeroModal onClose={() => setShowRetiro(false)} />
      )}
    </>
  );
}
