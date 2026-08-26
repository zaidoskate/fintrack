import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * /dashboard — punto de entrada protegido.
 * Verifica sesión con getUser() (nunca getSession — agents.md convención de auth).
 * Si no hay sesión, el middleware ya redirige; esta verificación es defensiva.
 * La UI del dashboard se construye en Fase 3.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="text-center">
        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            marginBottom: '0.5rem',
          }}>
          FinTrack
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>
          Sesión activa como {user.email}
        </p>
        <p
          style={{
            color: 'var(--text-disabled)',
            fontSize: 'var(--font-size-sm)',
            marginTop: '1rem',
          }}>
          Dashboard — Fase 3 (próxima sesión)
        </p>
      </div>
    </main>
  );
}
