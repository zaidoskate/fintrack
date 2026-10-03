'use client';

import type { CSSProperties, ReactNode } from 'react';

/**
 * GlassCard — Card de vidrio con efecto glassmorfismo.
 * Implementa exactamente el `.card` y `.card::before` de la maqueta Glass Ledger.
 *
 * Extracción literal de docs/design/glass-ledger-mockup.html:
 *   background: rgba(255, 255, 255, 0.06)
 *   backdrop-filter: blur(24px) saturate(160%)
 *   border: 1px solid rgba(255, 255, 255, 0.12)
 *   border-radius: 22px
 *   box-shadow: 0 8px 32px rgba(0,0,0,0.45)
 *
 *   ::before (glow): top -40% / left -20% / 160%×160% / blur 50px / opacity 0.22
 *     .card-amber::before → background: #FBBF24
 *     .card-rojo::before  → background: #EF4444
 *     (verde añadido por consistencia con el termómetro)
 *
 * Props:
 *   glow      → color del resplandor interno ('verde' | 'amarillo' | 'rojo' | 'none')
 *   className → clases Tailwind adicionales
 *   style     → estilos inline adicionales
 *   children  → contenido de la card
 */

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { useMotionConfig } from '@/lib/motion/variants';

type GlowVariant = 'verde' | 'amarillo' | 'rojo' | 'none';

const GLOW_COLOR: Record<GlowVariant, string> = {
  verde:    'var(--credito-verde-glow)',
  amarillo: 'var(--credito-amarillo-glow)',
  rojo:     'var(--credito-rojo-glow)',
  none:     'transparent',
};

interface GlassCardProps extends HTMLMotionProps<'div'> {
  glow?: GlowVariant;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  as?: 'div' | 'article' | 'section' | 'li' | 'button';
}

export const GlassCard = forwardRef<HTMLElement, GlassCardProps>(function GlassCard({
  glow = 'none',
  className = '',
  style,
  children,
  as = 'div',
  ...motionProps
}, ref) {
  const glowColor = GLOW_COLOR[glow];
  const hasGlow = glow !== 'none';
  const { interactiveProps } = useMotionConfig();

  // Pick the motion component based on 'as' prop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionComponent = motion.create(as as any) as any;
  const isInteractive = !!motionProps.onClick || as === 'button';

  return (
    <MotionComponent
      ref={ref}
      className={className}
      {...(isInteractive ? interactiveProps : {})}
      {...motionProps}
      style={{
        position: 'relative',
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid var(--border-glass)',
        borderRadius: '22px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Glow ::before */}
      {hasGlow && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-40%',
            left: '-20%',
            width: '160%',
            height: '160%',
            borderRadius: '50%',
            background: glowColor,
            filter: 'blur(50px)',
            opacity: 0.22,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Contenido sobre el glow */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>
    </MotionComponent>
  );
});
