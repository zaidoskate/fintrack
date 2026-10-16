-- Añadir la columna de fecha_objetivo a la tabla metas
ALTER TABLE public.metas ADD COLUMN IF NOT EXISTS fecha_objetivo DATE;
