-- Migración de Fase 4.5: Rendimientos y Aportes a Metas

-- 1. Añadir rendimiento a tarjetas
ALTER TABLE public.tarjetas ADD COLUMN rendimiento_anual numeric(5,2) not null default 0;

-- 2. Crear tabla de aportes
CREATE TABLE public.meta_aportes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meta_id uuid not null references public.metas(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null default current_date,
  tarjeta_origen_id uuid references public.tarjetas(id) on delete set null,
  created_at timestamptz not null default now()
);

CREATE INDEX idx_aportes_meta on public.meta_aportes (meta_id);

ALTER TABLE public.meta_aportes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meta_aportes_all_own" on public.meta_aportes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Migrar datos existentes de monto_actual a la nueva tabla de aportes
INSERT INTO public.meta_aportes (user_id, meta_id, monto, fecha)
SELECT user_id, id, monto_actual, current_date
FROM public.metas
WHERE monto_actual > 0;

-- 4. Eliminar columnas obsoletas de metas
ALTER TABLE public.metas DROP COLUMN monto_actual;
ALTER TABLE public.metas DROP COLUMN rendimiento_anual;
