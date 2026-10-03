'use client';

/**
 * QueryProvider — envuelve la app con QueryClientProvider de TanStack Query.
 * Architecture.md §4: state management de server state SOLO vía TanStack Query.
 * staleTime por tipo de dato (Architecture.md §4):
 *   - movimientos: 60s
 *   - tarjetas/metas: 5 min
 */
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, useEffect } from 'react';
import { get, set, del } from 'idb-keyval';
import type { Persister } from '@tanstack/react-query-persist-client';

function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery'): Persister {
  return {
    persistClient: async (client: unknown) => {
      await set(idbValidKey, client);
    },
    restoreClient: async () => {
      return await get(idbValidKey);
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  };
}

const idbPersister = createIDBPersister('fintrack-query-cache');

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            60_000,   // 60s default
            gcTime:               24 * 60 * 60 * 1000, // 24 hours
            retry:                1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_NOW') {
          // You could trigger a sync processing here if it was pending
        }
      });

      // Handle Service Worker updates
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Notifica al usuario de nueva version
                window.dispatchEvent(new CustomEvent('sw-update-available', {
                  detail: { worker: newWorker }
                }));
              }
            });
          }
        });
      });
    }
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: idbPersister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
