'use client';

/**
 * QueryProvider — envuelve la app con QueryClientProvider de TanStack Query.
 * Architecture.md §4: state management de server state SOLO vía TanStack Query.
 * staleTime por tipo de dato (Architecture.md §4):
 *   - movimientos: 60s
 *   - tarjetas/metas: 5 min
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Valores conservadores — cada hook puede sobreescribir
            staleTime:            60_000,   // 60s default
            gcTime:               5 * 60_000,
            retry:                1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
