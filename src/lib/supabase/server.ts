/**
 * Cliente de Supabase para el servidor (Server Components, Route Handlers, Server Actions).
 * Implementa: Architecture.md §3.1, API_Contract.md §0, agents.md regla 3 y 6.
 * Lee/escribe cookies para mantener la sesión del usuario (patrón oficial @supabase/ssr).
 * NUNCA usar este archivo en Client Components.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // En Server Components el set no tiene efecto — es esperado.
            // El middleware se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}

/**
 * Cliente con service_role key — SOLO para el Route Handler /api/shortcut.
 * Omite RLS por diseño (agents.md regla 3).
 * No exportar ni importar en ningún otro archivo.
 */
export async function createServiceClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch { /* expected in Server Components */ }
        },
      },
    },
  );
}
