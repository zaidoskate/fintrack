/**
 * Cliente de Supabase para el navegador.
 * Implementa: Architecture.md §3.1, agents.md regla 3.
 * Usar en: Client Components, hooks de TanStack Query en el cliente.
 * NUNCA importar service_role key aquí.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
