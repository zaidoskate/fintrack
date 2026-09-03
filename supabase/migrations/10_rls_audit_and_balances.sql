-- supabase/migrations/10_rls_audit_and_balances.sql

-- 1. Habilitar RLS explícitamente en tablas base (OWASP A01)
ALTER TABLE public.tarjetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_msi ENABLE ROW LEVEL SECURITY;

-- 2. Políticas (DO block para evitar errores si ya existen por creación manual)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tarjetas_user_isolation' AND tablename = 'tarjetas') THEN
        CREATE POLICY "tarjetas_user_isolation" ON public.tarjetas FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'movimientos_user_isolation' AND tablename = 'movimientos') THEN
        CREATE POLICY "movimientos_user_isolation" ON public.movimientos FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'compras_msi_user_isolation' AND tablename = 'compras_msi') THEN
        CREATE POLICY "compras_msi_user_isolation" ON public.compras_msi FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Materializar Saldo de Débito
ALTER TABLE public.tarjetas 
ADD COLUMN IF NOT EXISTS balance_actual numeric(12,2) DEFAULT 0;

-- Inicializar `balance_actual` para las tarjetas de Débito existentes
UPDATE public.tarjetas t
SET balance_actual = (
  COALESCE(t.limite, 0) + 
  COALESCE((SELECT SUM(m.monto) FROM public.movimientos m WHERE m.metodo_pago = t.nombre AND m.user_id = t.user_id AND m.tipo = 'Ingreso'), 0) -
  COALESCE((SELECT SUM(m.monto) FROM public.movimientos m WHERE m.metodo_pago = t.nombre AND m.user_id = t.user_id AND m.tipo = 'Gasto'), 0)
)
WHERE t.tipo = 'Débito';

-- 4. Trigger en `movimientos` para actualizar `balance_actual`
CREATE OR REPLACE FUNCTION public.update_tarjeta_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Para INSERT
    IF TG_OP = 'INSERT' THEN
        UPDATE public.tarjetas
        SET balance_actual = balance_actual + (CASE WHEN NEW.tipo = 'Ingreso' THEN NEW.monto ELSE -NEW.monto END)
        WHERE nombre = NEW.metodo_pago AND user_id = NEW.user_id AND tipo = 'Débito';
        RETURN NEW;
    
    -- Para DELETE
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.tarjetas
        SET balance_actual = balance_actual - (CASE WHEN OLD.tipo = 'Ingreso' THEN OLD.monto ELSE -OLD.monto END)
        WHERE nombre = OLD.metodo_pago AND user_id = OLD.user_id AND tipo = 'Débito';
        RETURN OLD;
        
    -- Para UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revertir OLD
        UPDATE public.tarjetas
        SET balance_actual = balance_actual - (CASE WHEN OLD.tipo = 'Ingreso' THEN OLD.monto ELSE -OLD.monto END)
        WHERE nombre = OLD.metodo_pago AND user_id = OLD.user_id AND tipo = 'Débito';
        
        -- Aplicar NEW
        UPDATE public.tarjetas
        SET balance_actual = balance_actual + (CASE WHEN NEW.tipo = 'Ingreso' THEN NEW.monto ELSE -NEW.monto END)
        WHERE nombre = NEW.metodo_pago AND user_id = NEW.user_id AND tipo = 'Débito';
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tarjeta_balance ON public.movimientos;
CREATE TRIGGER trigger_update_tarjeta_balance
AFTER INSERT OR UPDATE OR DELETE ON public.movimientos
FOR EACH ROW EXECUTE FUNCTION public.update_tarjeta_balance();

-- 5. Trigger en `tarjetas` para cuando se actualiza el `limite` (saldo inicial)
CREATE OR REPLACE FUNCTION public.update_tarjeta_limite()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.tipo = 'Débito' AND NEW.limite IS DISTINCT FROM OLD.limite THEN
        NEW.balance_actual = NEW.balance_actual + (NEW.limite - COALESCE(OLD.limite, 0));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tarjeta_limite ON public.tarjetas;
CREATE TRIGGER trigger_update_tarjeta_limite
BEFORE UPDATE ON public.tarjetas
FOR EACH ROW EXECUTE FUNCTION public.update_tarjeta_limite();
