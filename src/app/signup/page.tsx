import { signUp } from '@/app/auth/actions';
import { AmbientBackground } from '@/components/ui';
import { AuthSubmitButton } from '@/components/ui/AuthSubmitButton';

/**
 * Página de registro — Glass Ledger.
 * Server Component puro: sin event handlers.
 */
export const metadata = {
  title: 'Crear cuenta — FinTrack',
  description: 'Crea tu cuenta gratuita en FinTrack.',
};

interface SignupPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, message } = await searchParams;

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
            Crear cuenta
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

          {/* Botones de OAuth */}
          <form style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            <button
              formAction={async () => {
                'use server';
                const { signInWithProvider } = await import('@/app/auth/actions');
                await signInWithProvider('google');
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '10px', transition: 'background 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
            <button
              formAction={async () => {
                'use server';
                const { signInWithProvider } = await import('@/app/auth/actions');
                await signInWithProvider('apple');
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '10px', transition: 'background 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.63 2.15-3.06 1.74-2.58 5.79.52 7.02-.75 1.54-1.63 3.02-2.8 4.14zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continuar con Apple
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>o con tu correo</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <form action={signUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="displayName" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tu nombre
              </label>
              <input
                id="displayName" name="displayName" type="text"
                autoComplete="name" required placeholder="Juan García"
                className="glass-input"
              />
            </div>

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
                autoComplete="new-password" required minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="glass-input"
              />
            </div>

            <AuthSubmitButton label="Crear cuenta" />
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            ¿Ya tienes cuenta?{' '}
            <a href="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
