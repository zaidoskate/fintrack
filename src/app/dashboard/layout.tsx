import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AmbientBackground } from '@/components/ui';
import { QueryProvider } from '@/components/QueryProvider';
import { signOut } from '@/app/auth/actions';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { LogOut } from 'lucide-react';
import { FabRegistro } from '@/components/dashboard/FabRegistro';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { Greeting } from '@/components/dashboard/Greeting';
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
