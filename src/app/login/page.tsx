import { signIn } from '@/app/auth/actions';

/**
 * Página de inicio de sesión.
 * Implementa: Architecture.md §3.1, UX_UI_Heuristics.md H1 (estado del sistema),
 * H2 (lenguaje del usuario), H5 (prevención de errores — validación de campos).
 */
export const metadata = {
  title: 'Iniciar sesión — FinTrack',
  description: 'Accede a tu panel financiero personal en FinTrack.',
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message, next } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-base)' }}>

      <div className="w-full max-w-sm">
        {/* Logo / Marca */}
        <div className="text-center mb-8">
          <h1
            className="font-bold tracking-tight mb-1"
            style={{
              fontSize: 'var(--font-size-2xl)',
              color: 'var(--text-primary)',
              letterSpacing: 'var(--letter-spacing-tight)',
            }}>
            FinTrack
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Tu dinero, bajo control
          </p>
        </div>

        {/* Card del formulario */}
        <div
          className="rounded-2xl p-6 border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-base)',
            boxShadow: 'var(--shadow-lg)',
          }}>

          <h2
            className="font-semibold mb-6"
            style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
            Iniciar sesión
          </h2>

          {/* Feedback de error / mensaje — H1: visibilidad del estado */}
          {error && (
            <div
              className="rounded-lg px-4 py-3 mb-4 text-sm"
              style={{
                backgroundColor: 'var(--color-credito-rojo-bg)',
                color: 'var(--color-credito-rojo-500)',
                fontSize: 'var(--font-size-sm)',
              }}
              role="alert">
              {decodeURIComponent(error)}
            </div>
          )}
          {message && (
            <div
              className="rounded-lg px-4 py-3 mb-4 text-sm"
              style={{
                backgroundColor: 'var(--color-credito-verde-bg)',
                color: 'var(--color-credito-verde-500)',
                fontSize: 'var(--font-size-sm)',
              }}
              role="status">
              {decodeURIComponent(message)}
            </div>
          )}

          <form action={signIn} className="flex flex-col gap-4">
            {/* Campo oculto para redirigir tras login */}
            <input type="hidden" name="next" value={next ?? '/dashboard'} />

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@correo.com"
                className="w-full rounded-lg px-3 py-2.5 border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-base)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-base)')}
              />
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-base)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-base)')}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-lg py-3 font-semibold transition-opacity mt-2"
              style={{
                backgroundColor: 'var(--color-acento)',
                color: '#fff',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
              }}>
              Entrar
            </button>
          </form>

          {/* Enlace a registro */}
          <p
            className="text-center mt-5"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            ¿No tienes cuenta?{' '}
            <a
              href="/signup"
              style={{ color: 'var(--color-acento)' }}
              className="font-medium hover:underline">
              Regístrate
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
