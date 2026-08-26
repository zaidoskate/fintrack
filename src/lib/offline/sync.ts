import { db, type OutboxRequest } from './db';
import { crearMovimiento, editarMovimiento, eliminarMovimiento } from '@/lib/api/movimientos';
import { crearTarjeta, actualizarTarjeta, eliminarTarjeta } from '@/lib/api/tarjetas';
import { crearMeta, editarMeta, eliminarMeta, aportarMeta } from '@/lib/api/metas';
import { crearCompraMSI, eliminarCompraMSI } from '@/lib/api/compras-msi';
import { QueryClient } from '@tanstack/react-query';
import { QK } from '@/lib/hooks';

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
    } catch (err: any) {
      console.error(`Error sincronizando acción offline: ${item.action}`, err);
      // Si el error es claramente de red, detenemos el loop y reintentaremos luego.
      if (err.message === 'Failed to fetch' || !navigator.onLine) {
        break;
      }
      // Si el error es del servidor (ej. 400 Bad Request, RLS, etc.),
      // puede ser que el payload esté corrupto.
      // Dependiendo del caso, podríamos borrarlo para no atorar la cola, 
      // pero por ahora lo dejamos o alertamos. 
      // Si quieres que no bloquee:
      // await db.outbox.delete(item.id!);
    }
  }

  // Al finalizar de vaciar (o parcialmente) la cola, invalidamos para refrescar UI
  queryClient.invalidateQueries({ queryKey: QK.movimientos() });
  queryClient.invalidateQueries({ queryKey: QK.tarjetas });
  queryClient.invalidateQueries({ queryKey: QK.metas });
  queryClient.invalidateQueries({ queryKey: QK.msi() });
}

async function processAction(item: OutboxRequest) {
  switch (item.action) {
    case 'crearMovimiento':
      return await crearMovimiento(item.payload);
    case 'editarMovimiento':
      return await editarMovimiento(item.payload.id, item.payload.campos);
    case 'eliminarMovimiento':
      return await eliminarMovimiento(item.payload.id);
      
    case 'crearTarjeta':
      return await crearTarjeta(item.payload);
    case 'actualizarTarjeta':
      return await actualizarTarjeta(item.payload.id, item.payload.campos);
    case 'eliminarTarjeta':
      return await eliminarTarjeta(item.payload.id);

    case 'crearMeta':
      return await crearMeta(item.payload);
    case 'editarMeta':
      return await editarMeta(item.payload.id, item.payload.campos);
    case 'aportarMeta':
      return await aportarMeta(item.payload.id, item.payload.monto);
    case 'eliminarMeta':
      return await eliminarMeta(item.payload.id);

    case 'crearCompraMSI':
      return await crearCompraMSI(item.payload);
    case 'eliminarCompraMSI':
      return await eliminarCompraMSI(item.payload.id);
      
    default:
      console.warn('Acción desconocida en el outbox:', item.action);
  }
}
