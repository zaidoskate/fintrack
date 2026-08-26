import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AmbientBackground } from '@/components/ui';
import { QueryProvider } from '@/components/QueryProvider';
import { signOut } from '@/app/auth/actions';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { LogOut } from 'lucide-react';
import { FabRegistro } from '@/components/dashboard/FabRegistro';

/**
 * Layout del dashboard — envuelve todas las rutas protegidas con:
 * - QueryProvider (TanStack Query)
 * - AmbientBackground (blobs Glass Ledger)
 * - Header (logo + brand name + signout)
 * - DashboardNav (tabs: Tarjetas / Analítica / Metas)
 * - FabRegistro (+) que abre RegistroForm como overlay
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <QueryProvider>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <AmbientBackground />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '420px',
            margin: '0 auto',
            padding: '32px 20px 110px',
          }}
        >
          {/* Header */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div aria-hidden="true" style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--brand), #ff8a8f)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#1a0a0b',
              }}>F</div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                FinTrack
              </span>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title="Salir"
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: '6px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <LogOut size={20} />
              </button>
            </form>
          </header>

          {/* Navegación por tabs */}
          <DashboardNav />

          {/* Contenido de la página activa */}
          <div style={{ marginTop: '24px' }}>
            <PageTransition>{children}</PageTransition>
          </div>
        </div>

        {/* FAB Interactivo */}
        <FabRegistro />
      </div>
    </QueryProvider>
  );
}
