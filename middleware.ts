/**
 * middleware.ts — Refresca la sesión de Supabase en cada request.
 * Implementa: Architecture.md §3.1, agents.md regla 6.
 * Protege rutas del dashboard redirigiendo a /login si no hay sesión.
 *
 * El middleware NO puede leer directamente de la DB — solo refresca tokens.
 * La verificación real del usuario se hace en cada Server Component/Action
 * con supabase.auth.getUser() (agents.md convención de auth).
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rutas que requieren sesión activa
const PROTECTED_PREFIXES = ['/dashboard', '/tarjetas', '/movimientos', '/metas', '/registro', '/onboarding'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagar cookies tanto al request como al response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no llamar supabase.auth.getSession() aquí —
  // puede devolver sesiones stale de cookies. Usar getUser() para
  // validar contra el servidor de Auth (Architecture.md §3.1).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirigir rutas protegidas si no hay sesión
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname); // para redirigir de vuelta tras login
    return NextResponse.redirect(loginUrl);
  }

  // Redirigir /login y /signup a /dashboard si ya hay sesión
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, archivos de extensión conocida
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
