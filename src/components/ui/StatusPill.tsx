'use client';

/**
 * StatusPill — Pill de estado semántico.
 * Implementa el `.pill` de la maqueta Glass Ledger y los estados de sincronización (H1).
 *
 * Modos:
 *   thermometer → estado del termómetro de crédito ('verde' | 'amarillo' | 'rojo')
 *   sync        → estado de sincronización ('ok' | 'pending' | 'error')
 *
 * Extraído de la maqueta:
 *   padding: 6px 12px / border-radius: 100px / font-size: 12px / font-weight: 600
 *   .pill-amber: bg rgba(251,191,36,0.15) / color #FBBF24
 *   .pill-rojo:  bg rgba(239,68,68,0.15)  / color #EF4444
 *   .pill-dot:   6×6px / border-radius 50% / box-shadow glow
 *
 * H4 compliance: verde/amarillo/rojo son exclusivos del termómetro.
 *   El coral de marca (#FA686F) NUNCA aparece en ningún pill de estado.
 */

type ThermometerVariant = 'verde' | 'amarillo' | 'rojo';
type SyncVariant = 'ok' | 'pending' | 'error';

interface ThermometerPillProps {
  mode: 'thermometer';
  variant: ThermometerVariant;
  label?: string; // si no se pasa, usa la etiqueta canónica del doc
}

interface SyncPillProps {
  mode: 'sync';
  variant: SyncVariant;
  count?: number; // para "3 pendientes"
}

type StatusPillProps = ThermometerPillProps | SyncPillProps;

/* Configuración de estilos por variante — valores literales de la maqueta */
const THERM_CONFIG: Record<ThermometerVariant, {
  bg: string;
  color: string;
  dotGlow: string;
  defaultLabel: string;
}> = {
  verde: {
    bg:           'rgba(52, 211, 153, 0.15)',
    color:        'var(--credito-verde)',
    dotGlow:      '0 0 8px var(--credito-verde)',
    defaultLabel: 'Rango ideal',
  },
  amarillo: {
    bg:           'rgba(251, 191, 36, 0.15)',
    color:        'var(--credito-amarillo)',
    dotGlow:      '0 0 8px var(--credito-amarillo)',
    defaultLabel: 'Aún puedes gastar',
  },
  rojo: {
    bg:           'rgba(239, 68, 68, 0.15)',
    color:        'var(--credito-rojo)',
    dotGlow:      '0 0 8px var(--credito-rojo)',
    defaultLabel: 'Te excediste',
  },
};

const SYNC_CONFIG: Record<SyncVariant, {
  bg: string;
  color: string;
  dotGlow: string;
  defaultLabel: string;
}> = {
  ok: {
    bg:           'rgba(52, 211, 153, 0.12)',
    color:        'var(--credito-verde)',
    dotGlow:      '0 0 6px var(--credito-verde)',
    defaultLabel: 'Sincronizado',
  },
  pending: {
    bg:           'rgba(251, 191, 36, 0.12)',
    color:        'var(--credito-amarillo)',
    dotGlow:      '0 0 6px var(--credito-amarillo)',
    defaultLabel: 'Pendiente',
  },
  error: {
    bg:           'rgba(239, 68, 68, 0.12)',
    color:        'var(--credito-rojo)',
    dotGlow:      '0 0 6px var(--credito-rojo)',
    defaultLabel: 'Error al sincronizar',
  },
};

export function StatusPill(props: StatusPillProps) {
  let bg: string;
  let color: string;
  let dotGlow: string;
  let label: string;

  if (props.mode === 'thermometer') {
    const cfg = THERM_CONFIG[props.variant];
    bg       = cfg.bg;
    color    = cfg.color;
    dotGlow  = cfg.dotGlow;
    label    = props.label ?? cfg.defaultLabel;
  } else {
    const cfg = SYNC_CONFIG[props.variant];
    bg       = cfg.bg;
    color    = cfg.color;
    dotGlow  = cfg.dotGlow;
    label    = props.count
      ? `${props.count} pendiente${props.count !== 1 ? 's' : ''}`
      : cfg.defaultLabel;
  }

  return (
    <span
      role="status"
      aria-label={label}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '6px',
        padding:        '6px 12px',
        borderRadius:   '9999px',
        fontSize:       '0.75rem',   /* 12px — maqueta */
        fontWeight:     600,
        background:     bg,
        color:          color,
        lineHeight:     1,
        userSelect:     'none',
      }}
    >
      {/* Dot con glow — .pill-dot de la maqueta */}
      <span
        aria-hidden="true"
        style={{
          width:        '6px',
          height:       '6px',
          borderRadius: '50%',
          background:   color,
          boxShadow:    dotGlow,
          flexShrink:   0,
        }}
      />
      {label}
    </span>
  );
}
