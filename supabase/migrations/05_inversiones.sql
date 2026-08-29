-- 05_inversiones.sql
-- Tablas para el Módulo Patrimonial (Fase 6)

-- 1. Tabla portafolio_activos (Renta variable: Cripto, Stocks, ETFs)
CREATE TABLE IF NOT EXISTS public.portafolio_activos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  simbolo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('crypto', 'stock', 'etf')),
  cantidad numeric(18,8) NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.portafolio_activos ENABLE ROW LEVEL SECURITY;

-- Políticas para portafolio_activos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios activos" ON public.portafolio_activos;
CREATE POLICY "Los usuarios pueden ver sus propios activos"
  ON public.portafolio_activos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios activos" ON public.portafolio_activos;
CREATE POLICY "Los usuarios pueden insertar sus propios activos"
  ON public.portafolio_activos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios activos" ON public.portafolio_activos;
CREATE POLICY "Los usuarios pueden actualizar sus propios activos"
  ON public.portafolio_activos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios activos" ON public.portafolio_activos;
CREATE POLICY "Los usuarios pueden eliminar sus propios activos"
  ON public.portafolio_activos FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Tabla cuentas_yield (Renta fija con APY variable: AirTM USDC, etc.)
CREATE TABLE IF NOT EXISTS public.cuentas_yield (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  moneda text NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD', 'USDC', 'USDT')),
  balance_inicial numeric(12,2) NOT NULL DEFAULT 0,
  apy numeric(5,2) NOT NULL DEFAULT 0,
  ultima_actualizacion date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.cuentas_yield ENABLE ROW LEVEL SECURITY;

-- Políticas para cuentas_yield
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias cuentas yield" ON public.cuentas_yield;
CREATE POLICY "Los usuarios pueden ver sus propias cuentas yield"
  ON public.cuentas_yield FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias cuentas yield" ON public.cuentas_yield;
CREATE POLICY "Los usuarios pueden insertar sus propias cuentas yield"
  ON public.cuentas_yield FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias cuentas yield" ON public.cuentas_yield;
CREATE POLICY "Los usuarios pueden actualizar sus propias cuentas yield"
  ON public.cuentas_yield FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias cuentas yield" ON public.cuentas_yield;
CREATE POLICY "Los usuarios pueden eliminar sus propias cuentas yield"
  ON public.cuentas_yield FOR DELETE
  USING (auth.uid() = user_id);
