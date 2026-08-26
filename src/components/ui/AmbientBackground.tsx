'use client';

/**
 * AmbientBackground — Dos blobs difuminados, fijos detrás del contenido.
 * Implementa los `.blob.blob-coral` y `.blob.blob-deep` de la maqueta Glass Ledger.
 *
 * Extraído literalmente de docs/design/glass-ledger-mockup.html:
 *   .blob-coral: 420×420px, top -120px, left -100px, blur 90px, opacity 0.35
 *   .blob-deep:  460×460px, bottom -160px, right -140px, blur 90px, opacity 0.40
 *
 * Uso: envolver el contenido de una página o del layout raíz.
 * El componente no ocupa espacio de layout (position: fixed, z-index: 0).
 */

export function AmbientBackground() {
  return (
    <>
      {/* Blob coral — brand primary */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'var(--brand)',
          top: '-120px',
          left: '-100px',
          filter: 'blur(90px)',
          opacity: 0.35,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      {/* Blob deep — brand-deep */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          width: '460px',
          height: '460px',
          borderRadius: '50%',
          background: 'var(--brand-deep)',
          bottom: '-160px',
          right: '-140px',
          filter: 'blur(90px)',
          opacity: 0.40,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
