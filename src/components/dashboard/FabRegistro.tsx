'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { RegistroForm } from '@/components/dashboard/RegistroForm';

export function FabRegistro() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const reset = () => {
      setIsHidden(false);
      clearTimeout(timeout);
      // Solo esconder si no está abierto
      timeout = setTimeout(() => setIsHidden(true), 5000);
    };

    window.addEventListener('touchstart', reset, { passive: true });
    window.addEventListener('mousemove', reset, { passive: true });
    window.addEventListener('scroll', reset, { passive: true });
    reset();

    return () => {
      window.removeEventListener('touchstart', reset);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('scroll', reset);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      {/* Overlay y Formulario */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100, // Alto para cubrir el dashboard pero bajo el FAB
              background: 'rgba(10, 5, 8, 0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              paddingBottom: '100px', // Espacio para el FAB abajo
              overflowY: 'auto',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ width: '100%', maxWidth: '400px' }}
            >
              <RegistroForm onClose={() => setIsOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        id="fab-registro"
        onClick={() => {
          if (isHidden && !isOpen) {
            setIsHidden(false);
          } else {
            setIsOpen(!isOpen);
          }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          y: isHidden && !isOpen ? 45 : 0,
          opacity: isHidden && !isOpen ? 0.6 : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          position: 'fixed',
          bottom: '28px',
          left: '50%',
          x: '-50%',
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          background: isOpen ? 'var(--surface-glass)' : 'var(--brand)',
          border: isOpen ? '1px solid var(--border-glass)' : 'none',
          color: isOpen ? 'var(--text-primary)' : '#1a0a0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.3)' : '0 8px 24px var(--brand-dim)',
          zIndex: 110, // Más alto que el overlay para que se pueda clickear y cerrar
          cursor: 'pointer',
        }}
        aria-label={isOpen ? "Cerrar registro" : "Registrar movimiento"}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <Plus size={28} strokeWidth={2.5} />
        </motion.div>
      </motion.button>
    </>
  );
}
