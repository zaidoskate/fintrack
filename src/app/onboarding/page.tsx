import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AmbientBackground } from '@/components/ui';
import { OnboardingWizard } from './OnboardingWizard';
import { QueryProvider } from '@/components/QueryProvider';

export const metadata = {
  title: '¡Bienvenido! — FinTrack',
  description: 'Configura tu primer activo en FinTrack',
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Si por alguna razón vuelve a entrar aquí y ya tiene datos, echarlo al dashboard
  const [{ count: countT }, { count: countY }, { count: countA }] = await Promise.all([
    supabase.from('tarjetas').select('*', { count: 'exact', head: true }),
    supabase.from('cuentas_yield').select('*', { count: 'exact', head: true }),
    supabase.from('portafolio_activos').select('*', { count: 'exact', head: true })
  ]);

  if ((countT || 0) > 0 || (countY || 0) > 0 || (countA || 0) > 0) {
    redirect('/dashboard');
  }

  const userName = user.user_metadata?.full_name?.split(' ')[0] || 'Usuario';

  return (
    <main style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: 'var(--bg-base)' }}>
      <AmbientBackground />
      <QueryProvider>
        <OnboardingWizard userName={userName} />
      </QueryProvider>
    </main>
  );
}
