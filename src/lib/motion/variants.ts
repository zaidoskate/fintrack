'use client';

import { useReducedMotion } from 'motion/react';

export function useMotionConfig() {
  const shouldReduceMotion = useReducedMotion();

  return {
    shouldReduceMotion,
    /* Transition de página */
    pageTransition: {
      initial: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: shouldReduceMotion ? 0 : -10 },
      transition: { duration: 0.25, ease: 'easeOut' as const },
    },
    /* Modal / Sheet */
    modalTransition: {
      initial: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 },
      transition: { duration: 0.2, ease: 'easeOut' as const },
    },
    /* Interacciones hover/tap para botones y cards */
    interactiveProps: shouldReduceMotion
      ? {}
      : {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98 },
        },
    /* Listas con stagger */
    listContainer: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: {
          staggerChildren: shouldReduceMotion ? 0 : 0.05,
        },
      },
    },
    listItem: {
      initial: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    },
  };
}
