'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface GlassSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function GlassSelect({ options, value, onChange, placeholder, style }: GlassSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayValue = value || placeholder || 'Seleccionar...';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.06)',
          border: isOpen ? '1px solid var(--brand)' : '1px solid var(--border-glass)',
          borderRadius: '10px',
          padding: '11px 14px',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '15px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s ease',
        }}
      >
        {displayValue}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={18} color="var(--text-secondary)" />
        </motion.div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 50,
              margin: 0,
              padding: '6px',
              listStyle: 'none',
              background: 'rgba(20, 15, 17, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              maxHeight: '220px',
              overflowY: 'auto',
            }}
          >
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: value === opt ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: value === opt ? 'var(--brand)' : 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (value !== opt) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (value !== opt) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {opt}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
