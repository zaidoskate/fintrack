'use client';

import { motion, AnimatePresence } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useMotionConfig } from '@/lib/motion/variants';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pageTransition } = useMotionConfig();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={pageTransition.transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
