-- Gastos de terceros: suman a la deuda/saldo de la tarjeta pero se excluyen de analíticas personales
ALTER TABLE public.movimientos ADD COLUMN IF NOT EXISTS es_gasto_de_tercero BOOLEAN NOT NULL DEFAULT FALSE;
