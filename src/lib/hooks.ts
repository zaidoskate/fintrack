'use client';

/**
 * Hooks de TanStack Query para todas las entidades.
 * Architecture.md §4 — staleTime diferenciado:
 *   tarjetas / metas: 5 min (cambian poco, cálculo costoso)
 *   movimientos:      60s  (lectura frecuente, mutaciones frecuentes)
 *   compras_msi:      5 min
 *
 * NFR-06b: ningún componente importa supabase directamente.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { getTarjetas, crearTarjeta, actualizarTarjeta, eliminarTarjeta }
  from '@/lib/api/tarjetas';
import { getMovimientos, crearMovimiento, editarMovimiento, eliminarMovimiento }
  from '@/lib/api/movimientos';
import { getMetas, crearMeta, aportarMeta, editarMeta, eliminarMeta }
  from '@/lib/api/metas';
import { getComprasMSI, crearCompraMSI, eliminarCompraMSI }
  from '@/lib/api/compras-msi';
import type {
  FiltrosMovimientos,
  TarjetaConEstado,
  Movimiento,
  MetaConEstado,
  CompraMSI,
} from '@/lib/types';
import type {
  NuevaTarjetaInput,
  NuevoMovimientoInput,
  NuevaMetaInput,
  NuevaCompraMSIInput,
} from '@/lib/api-inputs';
import { db } from '@/lib/offline/db';

async function handleOfflineError(action: string, payload: any, err: any) {
  if (err?.message === 'Failed to fetch' || !navigator.onLine) {
    await db.outbox.add({
      action,
      payload,
      createdAt: new Date().toISOString()
    });
    console.warn(`[Offline] Acción ${action} guardada en outbox.`);
  } else {
    throw err;
  }
}

// ── Query Keys (centralizadas para invalidaciones coherentes) ─────────────────
export const QK = {
  tarjetas:    ['tarjetas']             as const,
  movimientos: (f?: FiltrosMovimientos) => ['movimientos', f] as const,
  metas:       ['metas']               as const,
  msi:         (tarjetaId?: string)    => ['compras-msi', tarjetaId] as const,
};

// ── Tarjetas ──────────────────────────────────────────────────────────────────

export function useTarjetas(
  opts?: Partial<UseQueryOptions<TarjetaConEstado[]>>,
) {
  return useQuery<TarjetaConEstado[]>({
    queryKey: QK.tarjetas,
    queryFn:  getTarjetas,
    staleTime: 5 * 60_000,  // 5 min — Architecture.md §4
    ...opts,
  });
}

export function useCrearTarjeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crearTarjeta,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.tarjetas }),
  });
}

export function useActualizarTarjeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, campos }: { id: string; campos: Partial<NuevaTarjetaInput> }) =>
      actualizarTarjeta(id, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.tarjetas }),
  });
}

export function useEliminarTarjeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eliminarTarjeta,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.tarjetas }),
  });
}

// ── Movimientos ───────────────────────────────────────────────────────────────

export function useMovimientos(filtros?: FiltrosMovimientos) {
  return useQuery<Movimiento[]>({
    queryKey: QK.movimientos(filtros),
    queryFn:  () => getMovimientos(filtros),
    staleTime: 60_000,  // 60s — Architecture.md §4
  });
}

export function useCrearMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NuevoMovimientoInput) => {
      try {
        return await crearMovimiento(payload);
      } catch (err) {
        await handleOfflineError('crearMovimiento', payload, err);
        return payload as unknown as Movimiento; // Retorno optimista ficticio
      }
    },
    // Optimista
    onMutate: async (newMov) => {
      await qc.cancelQueries({ queryKey: QK.movimientos() });
      const prev = qc.getQueryData<Movimiento[]>(QK.movimientos());
      qc.setQueryData<Movimiento[]>(QK.movimientos(), (old) => {
        const fakeMov: Movimiento = {
          id: `temp-${Date.now()}`,
          fecha: newMov.fecha || new Date().toISOString().split('T')[0],
          hora: newMov.hora || new Date().toTimeString().slice(0,5),
          tipo: newMov.tipo,
          monto: newMov.monto,
          categoria: newMov.categoria || 'Sin categoría',
          comercio: newMov.comercio || '',
          metodoPago: newMov.metodoPago || 'Efectivo'
        };
        return old ? [fakeMov, ...old] : [fakeMov];
      });
      return { prev };
    },
    onError: (err, newMov, context) => {
      if (err.message !== 'Failed to fetch' && navigator.onLine && context?.prev) {
        qc.setQueryData(QK.movimientos(), context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] });
      qc.invalidateQueries({ queryKey: QK.tarjetas }); 
    },
  });
}

export function useEditarMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, campos }: { id: string; campos: Partial<NuevoMovimientoInput> }) =>
      editarMovimiento(id, campos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] });
      qc.invalidateQueries({ queryKey: QK.tarjetas });
    },
  });
}

export function useEliminarMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eliminarMovimiento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] });
      qc.invalidateQueries({ queryKey: QK.tarjetas });
    },
  });
}

// ── Metas ─────────────────────────────────────────────────────────────────────

export function useMetas(opts?: Partial<UseQueryOptions<MetaConEstado[]>>) {
  return useQuery<MetaConEstado[]>({
    queryKey: QK.metas,
    queryFn:  getMetas,
    staleTime: 5 * 60_000,  // 5 min
    ...opts,
  });
}

export function useCrearMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crearMeta,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.metas }),
  });
}

export function useAportarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, monto }: { id: string; monto: number }) => aportarMeta(id, monto),
    // Optimista: actualiza la cache antes de que el server confirme
    onMutate: async ({ id, monto }) => {
      await qc.cancelQueries({ queryKey: QK.metas });
      const prev = qc.getQueryData<MetaConEstado[]>(QK.metas);
      qc.setQueryData<MetaConEstado[]>(QK.metas, (old) =>
        old?.map((m) =>
          m.id === id
            ? { ...m, montoActual: m.montoActual + monto }
            : m,
        ) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.metas, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.metas }),
  });
}

export function useEditarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, campos }: { id: string; campos: Partial<NuevaMetaInput> }) =>
      editarMeta(id, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.metas }),
  });
}

export function useEliminarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eliminarMeta,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.metas }),
  });
}

// ── Compras MSI ───────────────────────────────────────────────────────────────

export function useComprasMSI(tarjetaId?: string) {
  return useQuery<CompraMSI[]>({
    queryKey: QK.msi(tarjetaId),
    queryFn:  () => getComprasMSI(tarjetaId),
    staleTime: 5 * 60_000,
  });
}

export function useCrearCompraMSI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crearCompraMSI,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.msi(vars.tarjetaId) });
      qc.invalidateQueries({ queryKey: QK.msi() });
      qc.invalidateQueries({ queryKey: QK.tarjetas }); // recalcula termómetro
    },
  });
}

export function useEliminarCompraMSI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eliminarCompraMSI,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compras-msi'] });
      qc.invalidateQueries({ queryKey: QK.tarjetas });
    },
  });
}
