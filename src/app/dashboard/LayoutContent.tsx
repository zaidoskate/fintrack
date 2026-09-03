'use client';

import type { User } from '@supabase/supabase-js';

import { useModo } from '@/lib/ModoContext';
import { signOut } from '@/app/auth/actions';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { LogOut, Settings } from 'lucide-react';
import { FabRegistro } from '@/components/dashboard/FabRegistro';
import { Greeting } from '@/components/dashboard/Greeting';
import { useState, useEffect } from 'react';
import { DashboardPatrimonial } from '@/components/dashboard/DashboardPatrimonial';
import { ProfileModal } from '@/components/dashboard/ProfileModal';
import { AnimatePresence } from 'motion/react';
import { TutorialOverlay, TutorialStep } from '@/components/ui/TutorialOverlay';
import { useRouter } from 'next/navigation';

export function LayoutContent({ children, userName, user }: { children: React.ReactNode, userName: string, user: User }) {
  const { modo, setModo } = useModo();
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();

  // Tutorial logic
  const [tourOpen, setTourOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isPending = localStorage.getItem('fintrack_tour_pending') === 'true';
    if (isPending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowPrompt(true);
      localStorage.removeItem('fintrack_tour_pending');
    }
  }, []);

  const tutorialSteps: TutorialStep[] = [
    {
      targetId: 'btn-add-card',
      title: 'Tus Tarjetas',
      description: 'Aquí verás un resumen de todas tus cuentas bancarias y tarjetas. Puedes deslizar para ver el reverso y administrar apartados.',
      align: 'top',
      onEnter: () => { setModo('diario'); router.push('/dashboard'); }
    },
    {
      targetId: 'fab-registro',
      title: 'Registrar Movimientos',
      description: 'Usa este botón rápido para registrar gastos o ingresos a tus tarjetas. Es el botón que más usarás.',
      align: 'top',
      onEnter: () => { setModo('diario'); router.push('/dashboard'); }
    },
    {
      targetId: 'nav-metas',
      title: 'Tus Metas',
      description: 'Aquí puedes crear metas de ahorro y apartar dinero. Te diremos exactamente cuánto ahorrar al día para lograrlas.',
      align: 'bottom',
      onEnter: () => { setModo('diario'); }
    },
    {
      targetId: 'btn-settings',
      title: 'El Modo Patrimonial',
      description: 'FinTrack tiene dos caras. Usa este botón de ajustes para cambiar al Modo Patrimonial.',
      align: 'bottom',
      onEnter: () => { setModo('diario'); }
    },
    {
      targetId: 'btn-add-yield',
      title: 'Cuentas Yield',
      description: 'En el Modo Patrimonial, aquí puedes registrar cuentas que te generen rendimiento pasivo (Nu, MercadoPago, etc).',
      align: 'bottom',
      onEnter: () => { 
        setModo('patrimonio'); 
        router.push('/dashboard?tab=yields');
      }
    },
    {
      targetId: 'btn-add-activo',
      title: 'Inversiones y Criptos',
      description: 'Y aquí podrás agregar tus ETFs, Acciones o Criptomonedas. ¡El valor se actualizará en tiempo real!',
      align: 'bottom',
      onEnter: () => { 
        setModo('patrimonio'); 
        router.push('/dashboard?tab=activos');
      }
    }
  ];

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
              id="btn-settings"
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

      {/* Prompt inicial del Tour */}
      <AnimatePresence>
        {showPrompt && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: '24px' }}>
            <div style={{ background: 'var(--surface-glass)', border: '1px solid var(--brand)', borderRadius: '24px', padding: '32px', maxWidth: '400px', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: '#fff', marginBottom: '16px' }}>¡Todo listo!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
                Tu cuenta ha sido creada. ¿Te gustaría tomar un recorrido rápido de 1 minuto para conocer dónde está cada cosa?
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowPrompt(false)} 
                  style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Saltar
                </button>
                <button 
                  onClick={() => { setShowPrompt(false); setTourOpen(true); }} 
                  style={{ flex: 1, padding: '14px', background: 'var(--brand)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Sí, dar recorrido
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <TutorialOverlay 
        isOpen={tourOpen} 
        steps={tutorialSteps} 
        onComplete={() => {
          setTourOpen(false);
          setModo('diario');
          router.push('/dashboard');
        }} 
      />
    </>
  );
}
