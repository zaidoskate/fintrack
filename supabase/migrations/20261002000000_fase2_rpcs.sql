-- Fase 2: Operaciones Atómicas y Transacciones ACID

CREATE OR REPLACE FUNCTION adelantar_compra_msi(p_id UUID, p_meses INT, p_descuento NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE compras_msi
  SET 
    meses_adelantados = COALESCE(meses_adelantados, 0) + p_meses,
    descuento_por_adelanto = COALESCE(descuento_por_adelanto, 0) + p_descuento
  WHERE id = p_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION mover_dinero_apartado(p_id UUID, p_monto_delta NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_ini NUMERIC;
  v_interes_acum NUMERIC;
  v_tasa NUMERIC;
  v_fecha_act DATE;
  v_dias INT;
  v_capital_base NUMERIC;
  v_interes_proy NUMERIC := 0;
  v_nuevo_balance NUMERIC;
  v_nuevo_interes NUMERIC;
BEGIN
  SELECT balance_inicial, interes_acumulado, rendimiento_anual, ultima_actualizacion
  INTO v_balance_ini, v_interes_acum, v_tasa, v_fecha_act
  FROM tarjeta_apartados
  WHERE id = p_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apartado no encontrado o sin permisos.';
  END IF;

  v_dias := GREATEST(0, (CURRENT_DATE - v_fecha_act));
  v_tasa := v_tasa / 100.0;
  v_capital_base := v_balance_ini + COALESCE(v_interes_acum, 0);

  IF v_tasa > 0 AND v_dias > 0 THEN
    v_interes_proy := (v_capital_base * POWER(1 + (v_tasa / 365.0), v_dias)) - v_capital_base;
  END IF;

  v_nuevo_balance := v_balance_ini + p_monto_delta;
  v_nuevo_interes := COALESCE(v_interes_acum, 0) + v_interes_proy;

  UPDATE tarjeta_apartados
  SET 
    balance_inicial = v_nuevo_balance,
    interes_acumulado = v_nuevo_interes,
    ultima_actualizacion = CURRENT_DATE
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION mover_dinero_yield(p_id UUID, p_monto_delta NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_ini NUMERIC;
  v_interes_acum NUMERIC;
  v_tasa NUMERIC;
  v_fecha_act DATE;
  v_dias INT;
  v_capital_base NUMERIC;
  v_interes_proy NUMERIC := 0;
  v_nuevo_balance NUMERIC;
  v_nuevo_interes NUMERIC;
BEGIN
  SELECT balance_inicial, interes_acumulado, apy, ultima_actualizacion
  INTO v_balance_ini, v_interes_acum, v_tasa, v_fecha_act
  FROM cuentas_yield
  WHERE id = p_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta Yield no encontrada o sin permisos.';
  END IF;

  v_dias := GREATEST(0, (CURRENT_DATE - v_fecha_act));
  v_tasa := v_tasa / 100.0;
  v_capital_base := v_balance_ini + COALESCE(v_interes_acum, 0);

  IF v_tasa > 0 AND v_dias > 0 THEN
    v_interes_proy := (v_capital_base * POWER(1 + (v_tasa / 365.0), v_dias)) - v_capital_base;
  END IF;

  v_nuevo_balance := v_balance_ini + p_monto_delta;
  v_nuevo_interes := COALESCE(v_interes_acum, 0) + v_interes_proy;

  UPDATE cuentas_yield
  SET 
    balance_inicial = v_nuevo_balance,
    interes_acumulado = v_nuevo_interes,
    ultima_actualizacion = CURRENT_DATE
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION traspaso_debito_efectivo(
  p_tarjeta_origen_id UUID,
  p_tarjeta_destino_id UUID,
  p_monto NUMERIC,
  p_fecha DATE,
  p_hora TIME,
  p_categoria TEXT,
  p_comercio TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insertar Gasto en la tarjeta origen
  INSERT INTO movimientos (user_id, tarjeta_id, fecha, hora, tipo, monto, categoria, comercio)
  VALUES (auth.uid(), p_tarjeta_origen_id, p_fecha, p_hora, 'Gasto', p_monto, p_categoria, p_comercio);

  -- Insertar Ingreso en la tarjeta destino (Efectivo)
  INSERT INTO movimientos (user_id, tarjeta_id, fecha, hora, tipo, monto, categoria, comercio)
  VALUES (auth.uid(), p_tarjeta_destino_id, p_fecha, p_hora, 'Ingreso', p_monto, p_categoria, p_comercio);
END;
$$;
