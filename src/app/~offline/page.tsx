import { GlassCard } from "@/components/ui";

export default function OfflinePage() {
  return (
    <main style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px'
    }}>
      <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '10px' }}>
          Sin conexión
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Parece que estás desconectado de internet y esta página no se ha guardado en caché.
        </p>
      </GlassCard>
    </main>
  );
}
