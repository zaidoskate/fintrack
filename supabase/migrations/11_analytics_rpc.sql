-- supabase/migrations/11_analytics_rpc.sql

-- Función para agrupar gastos por categoría
CREATE OR REPLACE FUNCTION public.get_gastos_por_categoria(p_user_id uuid, p_desde date)
RETURNS TABLE (categoria text, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT m.categoria, SUM(m.monto) as total
    FROM public.movimientos m
    WHERE m.user_id = p_user_id
      AND m.tipo = 'Gasto'
      AND m.categoria != 'Traspaso'
      AND m.fecha >= p_desde
    GROUP BY m.categoria
    ORDER BY total DESC;
END;
$$;

-- Función para agrupar ingresos y gastos por mes
CREATE OR REPLACE FUNCTION public.get_flujo_por_mes(p_user_id uuid, p_desde date)
RETURNS TABLE (mes text, ingresos numeric, gastos numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT 
      to_char(m.fecha, 'YYYY-MM') as mes,
      SUM(CASE WHEN m.tipo = 'Ingreso' THEN m.monto ELSE 0 END) as ingresos,
      SUM(CASE WHEN m.tipo = 'Gasto' AND m.categoria != 'Traspaso' THEN m.monto ELSE 0 END) as gastos
    FROM public.movimientos m
    WHERE m.user_id = p_user_id
      AND m.fecha >= p_desde
    GROUP BY to_char(m.fecha, 'YYYY-MM')
    ORDER BY mes ASC;
END;
$$;
