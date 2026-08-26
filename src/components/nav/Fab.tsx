"use client";

import { useState } from "react";

// -- Icono + SVG ------------------------------------------------------------
function IconPlus({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="28" height="28" viewBox="0 0 24 24"
      fill="none" aria-hidden
      style={{
        transition: `transform var(--duration-base) var(--ease-spring)`,
        transform: rotated ? "rotate(45deg)" : "rotate(0deg)",
      }}
    >
      <path d="M12 5v14M5 12h14"
        stroke="white" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// -- Tipos de acceso r�pido (placeholder) ---------------------------------
const QUICK_ACTIONS = [
  { id: "fab-gasto", label: "Gasto", emoji: "??", color: "var(--color-credito-rojo-500)" },
  { id: "fab-ingreso", label: "Ingreso", emoji: "??", color: "var(--color-ingreso)" },
  { id: "fab-ahorro", label: "Ahorro", emoji: "??", color: "var(--color-categoria-ahorro)" },
] as const;

// -- Componente -------------------------------------------------------------
export function Fab() {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  return (
    <>
      {/* Backdrop semitransparente al abrir */}
      {open && (
        <div
          id="fab-backdrop"
          aria-hidden
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: "var(--z-overlay)",
            backgroundColor: "rgb(0 0 0 / 0.55)",
            backdropFilter: "blur(2px)",
            animation: `fadeIn var(--duration-base) var(--ease-out) forwards`,
          }}
        />
      )}

      {/* Quick-action pills (aparecen sobre el FAB) */}
      <div
        aria-hidden={!open}
        style={{
          position: "fixed",
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 72px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: "var(--z-fab)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {[...QUICK_ACTIONS].reverse().map(({ id, label, emoji, color }, i) => (
          <button
            key={id}
            id={id}
            aria-label={`Registrar ${label}`}
            onClick={close}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: "44px",
              paddingInline: "18px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--bg-elevated)",
              border: `1px solid var(--border-base)`,
              color: color,
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              cursor: "pointer",
              boxShadow: "var(--shadow-md)",
              opacity: open ? 1 : 0,
              transform: open
                ? "translateY(0) scale(1)"
                : `translateY(${(QUICK_ACTIONS.length - i) * 12}px) scale(0.8)`,
              transition: `opacity var(--duration-base) var(--ease-out) ${i * 40}ms,
                           transform var(--duration-slow) var(--ease-spring) ${i * 40}ms`,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "18px" }}>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* FAB principal --------------------------------------------------- */}
      <button
        id="fab-registro-universal"
        aria-label="Registrar movimiento"
        aria-expanded={open}
        aria-controls="fab-backdrop"
        onClick={toggle}
        style={{
          position: "fixed",
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 12px)",
          left: "50%",
          transform: open
            ? "translateX(-50%) scale(1.08)"
            : "translateX(-50%) scale(1)",
          zIndex: "var(--z-fab)",
          width: "60px",
          height: "60px",
          borderRadius: "var(--radius-full)",
          /* Gradiente indigo ? violeta */
          background: "linear-gradient(135deg, var(--color-acento) 0%, #7c3aed 100%)",
          boxShadow: open
            ? "var(--shadow-xl), 0 0 24px 4px var(--color-acento-ring)"
            : "var(--shadow-lg)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: `transform var(--duration-base) var(--ease-spring),
                       box-shadow var(--duration-base) var(--ease-out)`,
        }}
      >
        <IconPlus rotated={open} />
      </button>

      {/* Keyframe para el backdrop */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
