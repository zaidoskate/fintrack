'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { GlassCard } from './GlassCard';

export interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
  align?: 'top' | 'bottom' | 'left' | 'right';
  onEnter?: () => void;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  isOpen: boolean;
}

export function TutorialOverlay({ steps, onComplete, isOpen }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Measure target element when step changes
  useEffect(() => {
    if (!isOpen || !steps[currentStep]) return;
    
    const step = steps[currentStep];
    if (step.onEnter) {
      step.onEnter();
    }

    const updateRect = (smooth = false) => {
      const el = document.getElementById(step.targetId);
      if (el) {
        if (smooth) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTargetRect(el.getBoundingClientRect());
      }
    };

    updateRect(true);
    
    const handleScrollOrResize = () => updateRect(false);
    
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    
    const observer = new MutationObserver(() => updateRect(false));
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize, { capture: true });
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      observer.disconnect();
    };
  }, [currentStep, isOpen, steps]);

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'auto' }}>
      
      {/* Overlay con Spotlight (Eliminamos el doble fondo para que no sea tan oscuro) */}
      <AnimatePresence>
        {targetRect && (
          <motion.div
            key="spotlight"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            style={{
              position: 'absolute',
              borderRadius: '20px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              background: 'transparent',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          style={{
            position: 'absolute',
            zIndex: 10,
            // Fallback to center if no rect found
            ...(targetRect ? getTooltipPosition(targetRect, step.align || 'bottom') : {
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
            })
          }}
        >
          <GlassCard style={{ width: '320px', padding: '24px', border: '1px solid var(--brand)', background: 'rgba(20,15,17,0.95)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Paso {currentStep + 1} de {steps.length}
              </span>
              <button 
                onClick={onComplete}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#fff', marginBottom: '8px' }}>
              {step.title}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              {step.description}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={onComplete}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
              >
                Saltar tutorial
              </button>
              
              <button
                onClick={() => {
                  if (currentStep < steps.length - 1) {
                    setCurrentStep(c => c + 1);
                  } else {
                    onComplete();
                  }
                }}
                style={{
                  background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '12px',
                  padding: '10px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {currentStep < steps.length - 1 ? (
                  <>Siguiente <ChevronRight size={16} /></>
                ) : (
                  <>Finalizar <CheckCircle2 size={16} /></>
                )}
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
      
    </div>
  );
}

function getTooltipPosition(rect: DOMRect, align: 'top' | 'bottom' | 'left' | 'right') {
  const margin = 24;
  const tooltipWidth = 320;
  
  // Clampeamos el left para que el tooltip (de 320px) no se corte a la derecha ni a la izquierda
  const clampedLeft = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, rect.left + rect.width / 2 - tooltipWidth / 2));

  switch (align) {
    case 'top': {
      const desiredTop = rect.top - margin - 200;
      if (desiredTop < 16) {
        return { top: rect.bottom + margin, left: clampedLeft };
      }
      return { top: desiredTop, left: clampedLeft };
    }
    case 'bottom':
      return { top: rect.bottom + margin, left: clampedLeft };
    case 'left':
      return { top: Math.max(16, rect.top + rect.height / 2 - 100), left: Math.max(16, rect.left - margin - tooltipWidth) };
    case 'right':
      return { top: Math.max(16, rect.top + rect.height / 2 - 100), left: Math.min(window.innerWidth - tooltipWidth - 16, rect.right + margin) };
    default:
      return { top: rect.bottom + margin, left: clampedLeft };
  }
}
