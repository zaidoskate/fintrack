import Link from 'next/link';
import { AmbientBackground } from '@/components/ui';

/**
 * Página 404 personalizada — Glass Ledger aesthetic.
 * Next.js App Router: este archivo se detecta automáticamente.
 */
export default function NotFound() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)', padding: '24px' }}>
      <AmbientBackground />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '360px' }}>

        {/* Número de error con efecto glassmorphism */}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(80px, 20vw, 120px)', letterSpacing: '-0.04em',
          color: 'transparent',
          backgroundImage: 'linear-gradient(135deg, var(--brand) 0%, rgba(250,104,111,0.3) 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          lineHeight: 1,
          marginBottom: '16px',
        }}>
          404
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '22px',
          letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '10px',
        }}>
          Página no encontrada
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
          Esta ruta no existe en FinTrack. Revisa la URL o regresa al dashboard.
        </p>

        {/* Card de acción */}
        <div style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <Link
            href="/dashboard"
            style={{
              display: 'block', padding: '12px', borderRadius: '10px',
              background: 'var(--brand)', color: '#1a0a0b',
              fontWeight: 600, fontSize: '14px', textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            Ir al Dashboard
          </Link>
          <Link
            href="/login"
            style={{
              display: 'block', padding: '12px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-glass)',
              fontSize: '14px', textDecoration: 'none', textAlign: 'center',
            }}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
