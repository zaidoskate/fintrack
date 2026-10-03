import { createClient } from '@/lib/supabase/client';
import type { PortafolioActivoRow, CuentaYieldRow, PortafolioActivo, CuentaYield } from '@/lib/types';
import { fetchCryptoPrices } from '../api-prices'; 

export async function getActivos(): Promise<PortafolioActivo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('portafolio_activos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data as PortafolioActivoRow[];
  
  // Transform to camelCase and initialize empty prices
  const activos = rows.map(r => ({
    id: r.id,
    simbolo: r.simbolo,
    tipo: r.tipo,
    cantidad: r.cantidad,
    inversionInicial: r.inversion_inicial || 0,
  } as PortafolioActivo));

  // Try to fetch prices (we'll implement this with cache)
  try {
    const prices = await fetchCryptoPrices(activos.map(a => a.simbolo));
    return activos.map(a => {
      const price = prices[a.simbolo.toUpperCase()] || 0;
      return {
        ...a,
        precioActual: price,
        valorTotal: a.cantidad * price
      };
    });
  } catch (err) {
    console.warn("Failed to fetch prices:", err);
    return activos; // Return without prices if network fails
  }
}

export async function addActivo(activo: Omit<PortafolioActivo, 'id' | 'precioActual' | 'valorTotal'>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Verificar si ya existe
  const { data: existente } = await supabase
    .from('portafolio_activos')
    .select('*')
    .eq('simbolo', activo.simbolo)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existente) {
    const row = {
      cantidad: existente.cantidad + activo.cantidad,
      inversion_inicial: (existente.inversion_inicial || 0) + activo.inversionInicial
    };
    const { data, error } = await supabase
      .from('portafolio_activos')
      .update(row)
      .eq('id', existente.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const row = {
    simbolo: activo.simbolo,
    tipo: activo.tipo,
    cantidad: activo.cantidad,
    inversion_inicial: activo.inversionInicial,
    user_id: user.id
  };

  const { data, error } = await supabase
    .from('portafolio_activos')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateActivo(id: string, campos: Partial<PortafolioActivo>) {
  const supabase = createClient();
  const row: Partial<PortafolioActivoRow> = {};
  if (campos.simbolo !== undefined) row.simbolo = campos.simbolo;
  if (campos.tipo !== undefined) row.tipo = campos.tipo;
  if (campos.cantidad !== undefined) row.cantidad = campos.cantidad;
  if (campos.inversionInicial !== undefined) row.inversion_inicial = campos.inversionInicial;

  const { data, error } = await supabase
    .from('portafolio_activos')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteActivo(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('portafolio_activos')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getCuentasYield(): Promise<CuentaYield[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cuentas_yield')
    .select('*, interes_dinamico')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const yields = (data as CuentaYieldRow[]).map(r => {
    // Calcular proyeccion de APY al dia de hoy con funcion de Postgres
    const interesPostgres = Number((r as CuentaYieldRow & { interes_dinamico?: number }).interes_dinamico || 0);
    const balanceIni = r.balance_inicial;
    const interesAcum = (r.interes_acumulado || 0) + interesPostgres;
    const capitalBase = balanceIni + interesAcum;
    
    const balanceProyectado = capitalBase;

    return {
      id: r.id,
      nombre: r.nombre,
      moneda: r.moneda,
      balanceInicial: balanceIni,
      interesAcumulado: interesAcum,
      apy: r.apy,
      ultimaActualizacion: r.ultima_actualizacion,
      balanceActual: balanceProyectado
    };
  });

  const hasExtranjera = yields.some(y => y.moneda !== 'MXN');
  if (hasExtranjera) {
    try {
      // Tomar MXN=X como referencia para el USD a MXN (cotización oficial)
      const prices = await fetchCryptoPrices(['MXN=X']);
      const rate = prices['MXN=X'] || 19.5; 
      
      return yields.map(y => ({
        ...y,
        valorTotalMXN: y.moneda === 'MXN' ? y.balanceActual : y.balanceActual * rate
      }));
    } catch (err) {
      console.warn("Error fetching forex rate:", err);
    }
  }

  // Fallback si no hay red o no requiere conversion
  return yields.map(y => ({
    ...y,
    valorTotalMXN: y.moneda === 'MXN' ? y.balanceActual : y.balanceActual * 19.5
  }));
}

export async function addCuentaYield(cuenta: Omit<CuentaYieldRow, 'id' | 'user_id' | 'created_at'>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from('cuentas_yield')
    .insert({ ...cuenta, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCuentaYield(id: string, campos: Partial<CuentaYieldRow>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cuentas_yield')
    .update(campos)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCuentaYield(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('cuentas_yield')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function moverDineroYield(id: string, montoDelta: number): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('mover_dinero_yield', {
    p_id: id,
    p_monto_delta: montoDelta
  });

  if (error) throw error;
}
