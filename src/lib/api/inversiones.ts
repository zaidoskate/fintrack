import { createClient } from '@/lib/supabase/client';
import type { PortafolioActivoRow, CuentaYieldRow, PortafolioActivo, CuentaYield } from '@/lib/types';
import { fetchCryptoPrices } from '../api-prices'; 

const supabase = createClient();

export async function getActivos(): Promise<PortafolioActivo[]> {
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

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
  const { error } = await supabase
    .from('portafolio_activos')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getCuentasYield(): Promise<CuentaYield[]> {
  const { data, error } = await supabase
    .from('cuentas_yield')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const yields = (data as CuentaYieldRow[]).map(r => {
    // Calcular proyeccion de APY al dia de hoy
    const hoyDate = new Date();
    const hoyT00 = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate()).getTime();
    const fechaAct = new Date(r.ultima_actualizacion + 'T00:00:00').getTime();
    const dias = Math.max(0, Math.floor((hoyT00 - fechaAct) / 86_400_000));
    
    const apyDiario = r.apy / 100 / 365;
    const balanceProyectado = r.balance_inicial * Math.pow(1 + apyDiario, Math.max(0, dias));

    return {
      id: r.id,
      nombre: r.nombre,
      moneda: r.moneda,
      balanceInicial: r.balance_inicial,
      apy: r.apy,
      ultimaActualizacion: r.ultima_actualizacion,
      balanceActual: balanceProyectado
    };
  });

  const hasExtranjera = yields.some(y => y.moneda !== 'MXN');
  if (hasExtranjera) {
    try {
      // Tomar USDT como referencia para el USD a MXN (crypto stablecoin)
      const prices = await fetchCryptoPrices(['USDT']);
      const rate = prices['USDT'] || 19.5; 
      
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
  const { error } = await supabase
    .from('cuentas_yield')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function moverDineroYield(id: string, montoDelta: number): Promise<void> {
  const { data: yieldRow, error: fetchErr } = await supabase
    .from('cuentas_yield')
    .select('balance_inicial, apy, ultima_actualizacion')
    .eq('id', id)
    .single();

  if (fetchErr) throw fetchErr;

  const hoyDate = new Date();
  const hoyT00 = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate()).getTime();
  const fechaAct = new Date(yieldRow.ultima_actualizacion + 'T00:00:00').getTime();
  const dias = Math.max(0, Math.floor((hoyT00 - fechaAct) / 86_400_000));
  
  const balanceIni = Number(yieldRow.balance_inicial);
  const apy = Number(yieldRow.apy) / 100;
  
  let balanceCapitalizado = balanceIni;
  if (apy > 0 && dias > 0) {
    balanceCapitalizado = balanceIni * Math.pow(1 + (apy / 365), dias);
  }

  const nuevoBalance = balanceCapitalizado + montoDelta;
  
  const y = hoyDate.getFullYear();
  const m = String(hoyDate.getMonth() + 1).padStart(2, '0');
  const d = String(hoyDate.getDate()).padStart(2, '0');
  const hoyStr = `${y}-${m}-${d}`;

  const { error } = await supabase
    .from('cuentas_yield')
    .update({
      balance_inicial: nuevoBalance,
      ultima_actualizacion: hoyStr
    })
    .eq('id', id);

  if (error) throw error;
}
