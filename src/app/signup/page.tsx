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
