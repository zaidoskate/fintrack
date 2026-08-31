-- 06_apartados.sql
-- Tablas para el manejo de apartados en tarjetas de débito y su vinculación con metas

CREATE TABLE IF NOT EXISTS public.tarjeta_apartados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tarjeta_id uuid REFERENCES public.tarjetas(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  rendimiento_anual numeric(5,2) NOT NULL DEFAULT 0,
  balance_inicial numeric(12,2) NOT NULL DEFAULT 0,
  ultima_actualizacion date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tarjeta_apartados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios apartados" ON public.tarjeta_apartados;
CREATE POLICY "Los usuarios pueden ver sus propios apartados"
  ON public.tarjeta_apartados FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios apartados" ON public.tarjeta_apartados;
CREATE POLICY "Los usuarios pueden insertar sus propios apartados"
  ON public.tarjeta_apartados FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios apartados" ON public.tarjeta_apartados;
CREATE POLICY "Los usuarios pueden actualizar sus propios apartados"
  ON public.tarjeta_apartados FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios apartados" ON public.tarjeta_apartados;
CREATE POLICY "Los usuarios pueden eliminar sus propios apartados"
  ON public.tarjeta_apartados FOR DELETE
  USING (auth.uid() = user_id);

-- Añadir referencia al apartado en meta_aportes
ALTER TABLE public.meta_aportes 
ADD COLUMN IF NOT EXISTS apartado_id uuid REFERENCES public.tarjeta_apartados(id) ON DELETE SET NULL;
