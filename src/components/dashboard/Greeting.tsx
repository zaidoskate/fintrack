'use client';

import { useState, useEffect } from 'react';

export function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('Hola');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 19) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  if (!mounted) {
    return (
      <div style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
        Hola, <span style={{ color: 'var(--brand)' }}>{name}</span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
      {greeting}, <span style={{ color: 'var(--brand)' }}>{name}</span>
    </div>
  );
}
