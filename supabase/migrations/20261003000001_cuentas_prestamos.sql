-- Módulo 1: Gestor de Cuentas por Cobrar
ALTER TABLE public.movimientos ADD COLUMN IF NOT EXISTS monto_propio NUMERIC DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.cuentas_por_cobrar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movimiento_id UUID REFERENCES public.movimientos(id) ON DELETE SET NULL,
  deudor TEXT NOT NULL,
  concepto TEXT NOT NULL,
  monto_total NUMERIC NOT NULL,
  monto_saldado NUMERIC NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  fecha TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own cuentas por cobrar" ON public.cuentas_por_cobrar;
CREATE POLICY "Users manage their own cuentas por cobrar" ON public.cuentas_por_cobrar
  FOR ALL USING (auth.uid() = user_id);

-- Módulo 3: Gestión Integral de Préstamos e Hipotecas
CREATE TABLE IF NOT EXISTS public.prestamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  direccion TEXT NOT NULL DEFAULT 'pasivo',
  monto_original NUMERIC NOT NULL,
  saldo_insoluto NUMERIC NOT NULL,
  tasa_anual NUMERIC NOT NULL DEFAULT 0,
  plazo_meses_totales INT NOT NULL DEFAULT 12,
  meses_pagados INT NOT NULL DEFAULT 0,
  cuota_mensual NUMERIC NOT NULL DEFAULT 0,
  dia_pago INT NOT NULL DEFAULT 1,
  fecha_inicio TEXT NOT NULL,
  contacto TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own prestamos" ON public.prestamos;
CREATE POLICY "Users manage their own prestamos" ON public.prestamos
  FOR ALL USING (auth.uid() = user_id);
