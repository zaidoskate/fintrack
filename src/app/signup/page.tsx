import { signUp } from '@/app/auth/actions';

/**
 * Página de registro de cuenta.
 * Implementa: Architecture.md §3.1, UX_UI_Heuristics.md H1, H5.
 */
export const metadata = {
  title: 'Crear cuenta — FinTrack',
  description: 'Crea tu cuenta gratuita en FinTrack y empieza a tomar control de tus finanzas.',
};

interface SignupPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, message } = await searchParams;

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-base)' }}>

      <div className="w-full max-w-sm">
        {/* Marca */}
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

        {/* Card */}
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
            Crear cuenta
          </h2>

          {/* Feedback — H1 */}
          {error && (
            <div
              className="rounded-lg px-4 py-3 mb-4"
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
              className="rounded-lg px-4 py-3 mb-4"
              style={{
                backgroundColor: 'var(--color-credito-verde-bg)',
                color: 'var(--color-credito-verde-500)',
                fontSize: 'var(--font-size-sm)',
              }}
              role="status">
              {decodeURIComponent(message)}
            </div>
          )}

          <form action={signUp} className="flex flex-col gap-4">

            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="displayName"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Tu nombre
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                placeholder="Juan García"
                className="w-full rounded-lg px-3 py-2.5 border"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-base)',
                  outline: 'none',
                }}
              />
            </div>

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
                className="w-full rounded-lg px-3 py-2.5 border"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-base)',
                  outline: 'none',
                }}
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
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg px-3 py-2.5 border"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-base)',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg py-3 font-semibold mt-2"
              style={{
                backgroundColor: 'var(--color-acento)',
                color: '#fff',
                fontSize: 'var(--font-size-base)',
              }}>
              Crear cuenta
            </button>
          </form>

          <p
            className="text-center mt-5"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            ¿Ya tienes cuenta?{' '}
            <a
              href="/login"
              style={{ color: 'var(--color-acento)' }}
              className="font-medium hover:underline">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
