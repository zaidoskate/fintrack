import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AmbientBackground } from '@/components/ui';
import { QueryProvider } from '@/components/QueryProvider';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { ModoProvider } from '@/lib/ModoContext';
import { LayoutContent } from './LayoutContent';

/**
 * Layout del dashboard — envuelve todas las rutas protegidas.
 * Se separa en un Client Component (LayoutContent) para usar el contexto.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Cold Start Interception (Phase 1 Onboarding)
  const [{ count: countT }, { count: countY }, { count: countA }] = await Promise.all([
    supabase.from('tarjetas').select('*', { count: 'exact', head: true }),
    supabase.from('cuentas_yield').select('*', { count: 'exact', head: true }),
    supabase.from('portafolio_activos').select('*', { count: 'exact', head: true })
  ]);

  if (countT === 0 && countY === 0 && countA === 0) {
    redirect('/onboarding');
  }

  const userName = user.user_metadata?.full_name?.split(' ')[0] || 'Usuario';

  return (
    <QueryProvider>
      <ModoProvider>
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <SyncIndicator />
          <AmbientBackground />
          <LayoutContent user={user} userName={userName}>
            {children}
          </LayoutContent>
        </div>
      </ModoProvider>
    </QueryProvider>
  );
}
