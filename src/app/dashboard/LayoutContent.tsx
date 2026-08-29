'use client';

import type { User } from '@supabase/supabase-js';

import { useModo } from '@/lib/ModoContext';
import { signOut } from '@/app/auth/actions';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { LogOut, Settings } from 'lucide-react';
import { FabRegistro } from '@/components/dashboard/FabRegistro';
import { Greeting } from '@/components/dashboard/Greeting';
import { useState } from 'react';
import { DashboardPatrimonial } from '@/components/dashboard/DashboardPatrimonial';
import { ProfileModal } from '@/components/dashboard/ProfileModal';
import { AnimatePresence } from 'motion/react';

export function LayoutContent({ children, userName, user }: { children: React.ReactNode, userName: string, user: User }) {
  const { modo, setModo } = useModo();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
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
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Ajustes"
              style={{
                background: showSettings ? 'rgba(255,255,255,0.1)' : 'none', 
                border: 'none', color: 'var(--text-primary)',
                cursor: 'pointer', padding: '6px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              <Settings size={20} />
            </button>
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
          </div>
        </header>

        {/* Modal de Ajustes y Perfil */}
        <AnimatePresence>
          {showSettings && (
            <ProfileModal
              user={user}
              onClose={() => setShowSettings(false)}
              modo={modo}
              setModo={setModo}
            />
          )}
        </AnimatePresence>

        {modo === 'diario' ? (
          <>
            <Greeting name={userName} />
            <DashboardNav />
            <div style={{ marginTop: '24px' }}>
              <PageTransition>{children}</PageTransition>
            </div>
          </>
        ) : (
          <DashboardPatrimonial />
        )}
      </div>

      {modo === 'diario' && <FabRegistro />}
    </>
  );
}
