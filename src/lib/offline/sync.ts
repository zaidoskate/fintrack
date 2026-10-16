import { db, type OutboxRequest } from './db';
import { crearMovimiento, editarMovimiento, eliminarMovimiento, traspasoEfectivo } from '@/lib/api/movimientos';
import { crearTarjeta, actualizarTarjeta, eliminarTarjeta } from '@/lib/api/tarjetas';
import { crearMeta, editarMeta, eliminarMeta, aportarMeta } from '@/lib/api/metas';
import { crearCompraMSI, eliminarCompraMSI } from '@/lib/api/compras-msi';
import { saldarCuentaPorCobrar } from '@/lib/api/cuentas_cobrar';
import { crearPrestamo, actualizarPrestamo, eliminarPrestamo } from '@/lib/api/prestamos';
import { QueryClient } from '@tanstack/react-query';


export async function forceSync(queryClient: QueryClient) {
  if (!navigator.onLine) return; // Si no hay red explícita, ni lo intentamos

  const pending = await db.outbox.orderBy('createdAt').toArray();
  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      await processAction(item);
      // Si tuvo éxito, lo borramos de la cola
      if (item.id) {
        await db.outbox.delete(item.id);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Error sincronizando acción offline: ${item.action}`, error);
      // Si el error es claramente de red, detenemos el loop y reintentaremos luego.
      if (error.message === 'Failed to fetch' || !navigator.onLine || error.message.includes('timeout')) {
        break;
      }
      
      // Errores irrecuperables (400, integridad, validación) se borran para evitar Head-of-Line Blocking
      console.warn(`Descartando acción irrecuperable: ${item.action}`, error);
      if (item.id) {
        await db.outbox.delete(item.id);
      }
    }
  }

  // Al finalizar de vaciar (o parcialmente) la cola, invalidamos para refrescar UI
  queryClient.invalidateQueries({ queryKey: ['movimientos'] });
  queryClient.invalidateQueries({ queryKey: ['tarjetas'] });
  queryClient.invalidateQueries({ queryKey: ['metas'] });
  queryClient.invalidateQueries({ queryKey: ['compras-msi'] });
  queryClient.invalidateQueries({ queryKey: ['cuentas_por_cobrar'] });
  queryClient.invalidateQueries({ queryKey: ['prestamos'] });
}

async function processAction(item: OutboxRequest) {
  switch (item.action) {
    case 'crearMovimiento':
      return await crearMovimiento(item.payload as Parameters<typeof crearMovimiento>[0]);
    case 'editarMovimiento':
      return await editarMovimiento((item.payload as { id: string }).id, (item.payload as { campos: Parameters<typeof editarMovimiento>[1] }).campos);
    case 'eliminarMovimiento':
      return await eliminarMovimiento((item.payload as { id: string }).id);
    case 'traspasoEfectivo':
      return await traspasoEfectivo((item.payload as { tarjetaOrigenId: string }).tarjetaOrigenId, (item.payload as { monto: number }).monto);
      
    case 'crearTarjeta':
      return await crearTarjeta(item.payload as Parameters<typeof crearTarjeta>[0]);
    case 'actualizarTarjeta':
      return await actualizarTarjeta((item.payload as { id: string }).id, (item.payload as { campos: Parameters<typeof actualizarTarjeta>[1] }).campos);
    case 'eliminarTarjeta':
      return await eliminarTarjeta((item.payload as { id: string }).id);

    case 'crearMeta':
      return await crearMeta(item.payload as Parameters<typeof crearMeta>[0]);
    case 'editarMeta':
      return await editarMeta((item.payload as { id: string }).id, (item.payload as { campos: Parameters<typeof editarMeta>[1] }).campos);
    case 'aportarMeta':
      return await aportarMeta((item.payload as { id: string }).id, (item.payload as { monto: number }).monto);
    case 'eliminarMeta':
      return await eliminarMeta((item.payload as { id: string }).id);

    case 'crearCompraMSI':
      return await crearCompraMSI(item.payload as Parameters<typeof crearCompraMSI>[0]);
    case 'eliminarCompraMSI':
      return await eliminarCompraMSI((item.payload as { id: string }).id);
      
    case 'saldarCuenta':
      return await saldarCuentaPorCobrar(item.payload as Parameters<typeof saldarCuentaPorCobrar>[0]);
      
    case 'crearPrestamo':
      return await crearPrestamo(item.payload as Parameters<typeof crearPrestamo>[0]);
    case 'actualizarPrestamo':
      return await actualizarPrestamo({ id: (item.payload as { id: string }).id, campos: (item.payload as { campos: any }).campos });
    case 'eliminarPrestamo':
      return await eliminarPrestamo((item.payload as { id: string }).id);

    default:
      console.warn('Acción desconocida en el outbox:', item.action);
  }
}
