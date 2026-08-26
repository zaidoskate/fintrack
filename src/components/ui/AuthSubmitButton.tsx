'use client';

import { useFormStatus } from 'react-dom';
import { motion } from 'motion/react';

export function AuthSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(250, 104, 111, 0.4)' }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
        background: 'linear-gradient(135deg, var(--brand), #ff8a8f)', color: '#1a0a0b',
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px',
        cursor: pending ? 'not-allowed' : 'pointer', marginTop: '4px',
        opacity: pending ? 0.7 : 1,
        transition: 'opacity 0.2s'
      }}
    >
      {pending ? '...' : label}
    </motion.button>
  );
}
