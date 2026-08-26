'use client';

/**
 * DashboardNav — tabs de navegación del dashboard.
 * Tarjetas (home) | Analítica | Metas
 * Usa la URL actual para marcar el tab activo.
 */
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, BarChart2, Target } from 'lucide-react';

const TABS = [
  { href: '/dashboard',          label: 'Tarjetas', icon: CreditCard },
  { href: '/dashboard/analitica', label: 'Analítica', icon: BarChart2 },
  { href: '/dashboard/metas',    label: 'Metas',    icon: Target },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: 'flex',
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        border: '1px solid var(--border-glass)',
        borderRadius: '14px',
        padding: '4px',
        gap: '2px',
      }}
      aria-label="Navegación del dashboard"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href ||
          (tab.href !== '/dashboard' && pathname.startsWith(tab.href));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '9px 8px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <tab.icon size={16} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
