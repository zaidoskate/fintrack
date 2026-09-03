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
import { crearApartado as apiCrearApartado, moverDineroApartado as apiMoverDineroApartado, eliminarApartado as apiEliminarApartado } from '@/lib/api/apartados';
import { getMovimientos, crearMovimiento, editarMovimiento, eliminarMovimiento, getGastosPorCategoria, getFlujoPorMes }
  from '@/lib/api/movimientos';
import { getMetas, crearMeta, aportarMeta, editarMeta, eliminarMeta }
  from '@/lib/api/metas';
import { getComprasMSI, crearCompraMSI, eliminarCompraMSI }
  from '@/lib/api/compras-msi';
import { getActivos, addActivo,  updateActivo, deleteActivo,
  getCuentasYield, addCuentaYield, updateCuentaYield, deleteCuentaYield, moverDineroYield
} from '@/lib/api/inversiones';
import { getShortcutToken } from '@/lib/api/user';
import type {
  FiltrosMovimientos,
  TarjetaConEstado,
  Movimiento,
  MetaConEstado,
  CompraMSI,
  PortafolioActivo,
  CuentaYield,
  CuentaYieldRow
} from '@/lib/types';
import type {
  NuevaTarjetaInput,
  NuevoMovimientoInput,
  EditarMovimientoInput,
  NuevaMetaInput,
} from '@/lib/api-inputs';
import { db } from '@/lib/offline/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleOfflineError(action: string, payload: any, err: any) {
  if (err?.message === 'Failed to fetch' || !navigator.onLine) {
    await db.outbox.add({
      action,
      payload,
      createdAt: new Date().toISOString()
    });
    console.warn(`[Offline] Acción ${action} guardada en outbox.`);
    
    // Despachar evento para que SyncIndicator muestre el toast
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-action', { detail: action }));
    }
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
  activos:     ['activos']             as const,
  yields:      ['yields']              as const,
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

import { useInfiniteQuery } from '@tanstack/react-query';

export function useMovimientos(filtros?: FiltrosMovimientos) {
  return useQuery<Movimiento[]>({
    queryKey: QK.movimientos(filtros),
    queryFn:  () => getMovimientos(filtros),
    staleTime: 60_000,  // 60s — Architecture.md §4
  });
}

export function useMovimientosPaginados(filtros?: FiltrosMovimientos) {
  return useInfiniteQuery({
    queryKey: ['movimientos', 'paginated', filtros],
    queryFn: async ({ pageParam = 0 }) => {
      return getMovimientos({ ...filtros, offset: pageParam, limit: 30 });
    },
    getNextPageParam: (lastPage, allPages) => {
      // Si devolvió menos del límite (30), ya no hay más
      return lastPage.length === 30 ? allPages.length * 30 : undefined;
    },
    initialPageParam: 0,
    staleTime: 60_000,
  });
}

export function useGastosPorCategoria(desde: string) {
  return useQuery({
    queryKey: ['analytics', 'gastos_categoria', desde],
    queryFn: () => getGastosPorCategoria(desde),
    staleTime: 5 * 60_000,
  });
}

export function useFlujoPorMes(desde: string) {
  return useQuery({
    queryKey: ['analytics', 'flujo_mes', desde],
    queryFn: () => getFlujoPorMes(desde),
    staleTime: 5 * 60_000,
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
          fecha: newMov.fecha,
          hora: new Date().toTimeString().slice(0,5),
          tipo: newMov.tipo,
          monto: newMov.monto,
          categoria: newMov.categoria,
          comercio: newMov.comercio,
          metodoPago: 'Actualizando...'
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
    mutationFn: ({ id, campos }: { id: string; campos: Partial<EditarMovimientoInput> }) =>
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
    mutationFn: ({ id, monto, tarjetaId, apartadoId, fecha }: { id: string; monto: number, tarjetaId?: string, apartadoId?: string, fecha?: string }) => aportarMeta(id, monto, tarjetaId, apartadoId, fecha),
    // Optimista: actualiza la cache antes de que el server confirme
    onMutate: async ({ id, monto }) => {
      await qc.cancelQueries({ queryKey: QK.metas });
      const prev = qc.getQueryData<MetaConEstado[]>(QK.metas);
      qc.setQueryData<MetaConEstado[]>(QK.metas, (old) =>
        old?.map((m) =>
          m.id === id
            ? { ...m, montoActual: m.montoActual + monto, capitalAportado: (m.capitalAportado || 0) + monto }
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

// ── Apartados ─────────────────────────────────────────────────────────────────

export function useCrearApartado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCrearApartado,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.tarjetas }),
  });
}

export function useMoverDineroApartado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, montoDelta }: { id: string; montoDelta: number }) => apiMoverDineroApartado(id, montoDelta),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.tarjetas }),
  });
}

export function useEliminarApartado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiEliminarApartado,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.tarjetas }),
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

import { adelantarCompraMSI } from './api/compras-msi';

export function useAdelantarCompraMSI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, meses, descuento }: { id: string; meses: number; descuento: number }) => adelantarCompraMSI(id, meses, descuento),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compras-msi'] });
      qc.invalidateQueries({ queryKey: QK.tarjetas }); 
    },
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

// ── Inversiones (Fase 6) ───────────────────────────────────────────────────────

export function useActivos() {
  return useQuery<PortafolioActivo[]>({
    queryKey: QK.activos,
    queryFn: getActivos,
    staleTime: 5 * 60_000,
  });
}

export function useAddActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addActivo,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.activos }),
  });
}

export function useUpdateActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, campos }: { id: string; campos: Partial<PortafolioActivo> }) => updateActivo(id, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.activos }),
  });
}

export function useDeleteActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteActivo,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.activos }),
  });
}

export function useCuentasYield() {
  return useQuery<CuentaYield[]>({
    queryKey: QK.yields,
    queryFn: getCuentasYield,
    staleTime: 5 * 60_000,
  });
}

export function useAddCuentaYield() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addCuentaYield,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.yields }),
  });
}

export function useMoverDineroYield() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, montoDelta }: { id: string; montoDelta: number }) => moverDineroYield(id, montoDelta),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.yields }),
  });
}

export function useUpdateCuentaYield() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, campos }: { id: string; campos: Partial<CuentaYieldRow> }) => updateCuentaYield(id, campos),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.yields }),
  });
}

export function useDeleteCuentaYield() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCuentaYield,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.yields }),
  });
}

export function useShortcutToken() {
  return useQuery({
    queryKey: ['user', 'shortcut_token'],
    queryFn: getShortcutToken,
    staleTime: Infinity,
  });
}
