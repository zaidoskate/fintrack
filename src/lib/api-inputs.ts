/**
 * Tipos de input para mutaciones — exportados desde un solo lugar
 * para que hooks.ts y componentes de formulario los compartan sin duplicar.
 */
export type { NuevaTarjetaInput }    from '@/lib/api/tarjetas';
export type { NuevoMovimientoInput, EditarMovimientoInput } from '@/lib/api/movimientos';
export type { NuevaMetaInput }       from '@/lib/api/metas';
export type { NuevaCompraMSIInput }  from '@/lib/api/compras-msi';
