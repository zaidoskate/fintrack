/**
 * src/components/ui/index.ts
 * Barrel de exportaciones de los primitivos UI de Glass Ledger.
 * Importar siempre desde '@/components/ui' — nunca importar archivos individuales
 * directamente en componentes de página (agents.md regla 5).
 */
export { GlassCard }       from './GlassCard';
export { AuthSubmitButton } from './AuthSubmitButton';
export { ConfirmModal } from './ConfirmModal';
export { AmbientBackground } from './AmbientBackground';
export { StatusPill }       from './StatusPill';
export * from './GlassSelect';
export * from './Loader';
