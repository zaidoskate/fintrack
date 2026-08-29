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

export async function addActivo(activo: Omit<PortafolioActivoRow, 'id' | 'user_id' | 'created_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from('portafolio_activos')
    .insert({ ...activo, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateActivo(id: string, campos: Partial<PortafolioActivoRow>) {
  const { data, error } = await supabase
    .from('portafolio_activos')
    .update(campos)
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
    const dias = Math.floor((new Date().getTime() - new Date(r.ultima_actualizacion).getTime()) / (1000 * 60 * 60 * 24));
    
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
