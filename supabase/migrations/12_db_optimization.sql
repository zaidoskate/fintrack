-- supabase/migrations/12_db_optimization.sql

-- 1. Crear tabla para usuarios y sus configuraciones (incluyendo Shortcut Token)
CREATE TABLE IF NOT EXISTS public.usuarios_config (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shortcut_token uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Habilitar RLS para usuarios_config
ALTER TABLE public.usuarios_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propia config"
    ON public.usuarios_config FOR SELECT
    USING (auth.uid() = id);

-- Trigger para crear config automáticamente al crear un nuevo usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios_config (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Opcional, si el trigger no existe en auth)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END
$$;

-- Insertar configuración para usuarios existentes
INSERT INTO public.usuarios_config (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Normalización de la tabla `movimientos`
-- Agregar tarjeta_id (puede ser nulo para Efectivo)
ALTER TABLE public.movimientos
ADD COLUMN tarjeta_id uuid REFERENCES public.tarjetas(id) ON DELETE CASCADE;

-- Llenar tarjeta_id buscando el nombre de la tarjeta en `metodo_pago`
UPDATE public.movimientos m
SET tarjeta_id = t.id
FROM public.tarjetas t
WHERE m.user_id = t.user_id 
  AND m.metodo_pago = t.nombre;

-- Eliminar columna metodo_pago
ALTER TABLE public.movimientos
DROP COLUMN metodo_pago;

-- 3. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_movimientos_user_fecha ON public.movimientos(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_tarjetas_user ON public.tarjetas(user_id);

-- 4. Arreglar Trigger de balances (10_rls_audit_and_balances) para usar tarjeta_id
CREATE OR REPLACE FUNCTION public.update_tarjeta_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Para INSERT
    IF TG_OP = 'INSERT' THEN
        UPDATE public.tarjetas
        SET balance_actual = balance_actual + (CASE WHEN NEW.tipo = 'Ingreso' THEN NEW.monto ELSE -NEW.monto END)
        WHERE id = NEW.tarjeta_id AND tipo = 'Débito';
        RETURN NEW;
    
    -- Para DELETE
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.tarjetas
        SET balance_actual = balance_actual - (CASE WHEN OLD.tipo = 'Ingreso' THEN OLD.monto ELSE -OLD.monto END)
        WHERE id = OLD.tarjeta_id AND tipo = 'Débito';
        RETURN OLD;
        
    -- Para UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revertir OLD
        UPDATE public.tarjetas
        SET balance_actual = balance_actual - (CASE WHEN OLD.tipo = 'Ingreso' THEN OLD.monto ELSE -OLD.monto END)
        WHERE id = OLD.tarjeta_id AND tipo = 'Débito';
        
        -- Aplicar NEW
        UPDATE public.tarjetas
        SET balance_actual = balance_actual + (CASE WHEN NEW.tipo = 'Ingreso' THEN NEW.monto ELSE -NEW.monto END)
        WHERE id = NEW.tarjeta_id AND tipo = 'Débito';
        
        -- Opcional: si se modificó el límite de la tarjeta (aunque esto va en la tabla tarjetas)
        IF TG_TABLE_NAME = 'tarjetas' THEN
            NEW.balance_actual = NEW.balance_actual + (NEW.limite - COALESCE(OLD.limite, 0));
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE INDEX IF NOT EXISTS idx_compras_msi_user_tarjeta ON public.compras_msi(user_id, tarjeta_id);

-- 4. ON DELETE CASCADE (En caso de que no lo tuvieran antes)
-- Primero debemos remover el FK constraint actual (esto requiere conocer el nombre, lo hacemos de forma dinámica o recreando)
-- En Supabase la restricción default suele ser nombre_tabla_columna_fkey

DO $$
BEGIN
  -- Compras MSI
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'compras_msi_tarjeta_id_fkey'
  ) THEN
    ALTER TABLE public.compras_msi DROP CONSTRAINT compras_msi_tarjeta_id_fkey;
  END IF;
  
  ALTER TABLE public.compras_msi 
  ADD CONSTRAINT compras_msi_tarjeta_id_fkey 
  FOREIGN KEY (tarjeta_id) REFERENCES public.tarjetas(id) ON DELETE CASCADE;

  -- Apartados
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tarjeta_apartados_tarjeta_id_fkey'
  ) THEN
    ALTER TABLE public.tarjeta_apartados DROP CONSTRAINT tarjeta_apartados_tarjeta_id_fkey;
  END IF;
  
  ALTER TABLE public.tarjeta_apartados 
  ADD CONSTRAINT tarjeta_apartados_tarjeta_id_fkey 
  FOREIGN KEY (tarjeta_id) REFERENCES public.tarjetas(id) ON DELETE CASCADE;
END
$$;

-- 5. Función Computada para Rendimientos (Evita Cronjobs)
-- Esto permite hacer SELECT *, interes_acumulado FROM cuentas_yield
CREATE OR REPLACE FUNCTION public.interes_dinamico(y public.cuentas_yield)
RETURNS numeric AS $$
BEGIN
  -- Si no hay apy o balance, retorna 0
  IF y.apy = 0 OR y.balance_inicial = 0 THEN
    RETURN 0;
  END IF;
  
  -- Fórmula interés compuesto diario: Monto * ((1 + TasaDiaria) ^ Dias - 1)
  -- Nota: En la vida real el rendimiento suele ser simple (Monto * (Tasa/360) * Dias)
  -- Usaremos interés simple anualizado diario:
  RETURN y.balance_inicial * ((y.apy / 100.0) / 365.0) * (current_date - y.ultima_actualizacion);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.interes_dinamico_apartados(a public.tarjeta_apartados)
RETURNS numeric AS $$
BEGIN
  IF a.rendimiento_anual = 0 OR a.balance_inicial = 0 THEN
    RETURN 0;
  END IF;
  RETURN a.balance_inicial * ((a.rendimiento_anual / 100.0) / 365.0) * (current_date - a.ultima_actualizacion);
END;
$$ LANGUAGE plpgsql STABLE;
