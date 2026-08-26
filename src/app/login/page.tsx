import { signIn } from '@/app/auth/actions';
import { AmbientBackground } from '@/components/ui';

/**
 * Página de inicio de sesión — Glass Ledger.
 * Server Component puro: sin event handlers, sin 'use client'.
 * H1: feedback de error/éxito en URL params.
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
    <main style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: 'var(--bg-base)' }}>
      <AmbientBackground />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '380px' }}>

        {/* Marca */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--brand), #ff8a8f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
            color: '#1a0a0b', margin: '0 auto 14px',
          }}>F</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '4px' }}>
            FinTrack
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Tu dinero, bajo control
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid var(--border-glass)',
          borderRadius: '22px',
          padding: '28px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            Iniciar sesión
          </h2>

          {/* Feedback — H1 */}
          {error && (
            <div role="alert" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '14px', color: 'var(--credito-rojo)' }}>
              {decodeURIComponent(error)}
            </div>
          )}
          {message && (
            <div role="status" style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '14px', color: 'var(--credito-verde)' }}>
              {decodeURIComponent(message)}
            </div>
          )}

          <form action={signIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input type="hidden" name="next" value={next ?? '/dashboard'} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Correo electrónico
              </label>
              <input
                id="email" name="email" type="email"
                autoComplete="email" required placeholder="tu@correo.com"
                className="glass-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="password" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Contraseña
              </label>
              <input
                id="password" name="password" type="password"
                autoComplete="current-password" required placeholder="••••••••"
                className="glass-input"
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                background: 'var(--brand)', color: '#1a0a0b',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px',
                cursor: 'pointer', marginTop: '4px',
              }}
            >
              Entrar
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            ¿No tienes cuenta?{' '}
            <a href="/signup" style={{ color: 'var(--brand)', fontWeight: 600 }}>
              Regístrate
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
