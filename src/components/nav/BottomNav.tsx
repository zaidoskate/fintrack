"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// -- Iconos inline SVG (sin dependencia externa) ----------------------------
function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5"
        fill={active ? "var(--color-acento)" : "currentColor"} opacity={active ? 1 : 0.4} />
      <rect x="14" y="3" width="7" height="7" rx="1.5"
        fill={active ? "var(--color-acento)" : "currentColor"} opacity={active ? 1 : 0.4} />
      <rect x="3" y="14" width="7" height="7" rx="1.5"
        fill={active ? "var(--color-acento)" : "currentColor"} opacity={active ? 1 : 0.4} />
      <rect x="14" y="14" width="7" height="7" rx="1.5"
        fill="none" stroke={active ? "var(--color-acento)" : "currentColor"}
        strokeWidth="1.5" strokeDasharray="2 1" opacity={active ? 0.6 : 0.3} />
    </svg>
  );
}

function IconCards({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3"
        fill={active ? "var(--color-acento)" : "transparent"}
        opacity={active ? 0.15 : 1}
        stroke={active ? "var(--color-acento)" : "currentColor"}
        strokeWidth={active ? "2" : "1.5"}
        className={active ? "" : "opacity-40"} />
      <rect x="2" y="5" width="20" height="14" rx="3"
        stroke={active ? "var(--color-acento)" : "currentColor"}
        strokeWidth={active ? "2" : "1.5"} fill="none"
        opacity={active ? 1 : 0.4} />
      <rect x="2" y="9" width="20" height="3"
        fill={active ? "var(--color-acento)" : "currentColor"}
        opacity={active ? 0.4 : 0.25} />
      <rect x="6" y="14" width="5" height="2" rx="1"
        fill={active ? "var(--color-acento)" : "currentColor"}
        opacity={active ? 0.8 : 0.4} />
    </svg>
  );
}

function IconGoals({ active }: { active: boolean }) {
  const c = active ? "var(--color-acento)" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={c}
        strokeWidth={active ? "2" : "1.5"} opacity={active ? 1 : 0.4} />
      <circle cx="12" cy="12" r="5" stroke={c}
        strokeWidth="1.5" opacity={active ? 0.5 : 0.25} />
      <circle cx="12" cy="12" r="2" fill={c} opacity={active ? 1 : 0.4} />
    </svg>
  );
}

function IconAnalytics({ active }: { active: boolean }) {
  const c = active ? "var(--color-acento)" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18 L8 12 L12 15 L16 8 L20 11"
        stroke={c} strokeWidth={active ? "2" : "1.5"}
        strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.4} />
      <circle cx="20" cy="11" r="2" fill={c} opacity={active ? 1 : 0.4} />
      <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Inicio", Icon: IconDashboard, id: "nav-inicio" },
  { href: "/tarjetas", label: "Tarjetas", Icon: IconCards, id: "nav-tarjetas" },
  { href: "/metas", label: "Metas", Icon: IconGoals, id: "nav-metas" },
  { href: "/analisis", label: "Análisis", Icon: IconAnalytics, id: "nav-analisis" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Navegación principal"
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: "var(--z-sticky)",
        height: "64px",
        backgroundColor: "var(--bg-surface)",
        borderTop: "1px solid var(--border-base)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        alignItems: "center",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TABS.map(({ href, label, Icon, id }, index) => {
        const active =
          pathname === href ||
          (href !== "/" && pathname.startsWith(href));

        return (
          <Link
            key={href}
            id={id}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              height: "100%",
              color: active ? "var(--color-acento)" : "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "var(--font-size-2xs)",
              fontWeight: active
                ? "var(--font-weight-semibold)"
                : "var(--font-weight-normal)",
              letterSpacing: "var(--letter-spacing-wide)",
              transition: "color var(--duration-fast) var(--ease-out)",
              /* Hueco para el FAB centrado */
              ...(index === 1 ? { paddingRight: "20px" } : {}),
              ...(index === 2 ? { paddingLeft: "20px" } : {}),
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "24px",
                borderRadius: "var(--radius-full)",
                backgroundColor: active
                  ? "var(--color-acento-muted)"
                  : "transparent",
                transition: "background-color var(--duration-fast) var(--ease-out)",
              }}
            >
              <Icon active={active} />
            </span>
            <span style={{ lineHeight: 1 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}