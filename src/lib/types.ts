/**
 * Tipos compartidos de dominio financiero.
 * Implementa: API_Contract.md v2.0 (interfaces TypeScript de §1–4).
 * agents.md: toda comunicación con Supabase pasa por lib/api/ o lib/finance/.
 */

// ── Tablas de Supabase (snake_case, reflejan el esquema) ─────────────────────

export interface TarjetaRow {
  id: string;
  user_id: string;
  nombre: string;
  tipo: 'Crédito' | 'Débito';
  limite: number;       // Para Débito esto es el Saldo Inicial
  dia_corte: number | null;
  dia_pago: number | null;
  created_at: string;
}

export interface MovimientoRow {
  id: string;
  user_id: string;
  fecha: string;        // YYYY-MM-DD
  hora: string;         // HH:MM:SS
  tipo: 'Gasto' | 'Ingreso';
  monto: number;
  categoria: string;
  comercio: string;
  metodo_pago: string;
  created_at: string;
}

export interface MetaRow {
  id: string;
  user_id: string;
  nombre: string;
  costo_objetivo: number;
  monto_actual: number;
  rendimiento_anual: number;
  created_at: string;
}

export interface CompraMSIRow {
  id: string;
  user_id: string;
  tarjeta_id: string;
  fecha_compra: string;
  comercio: string;
  categoria: string;
  monto_total: number;
  meses_totales: number;
  cuota_mensual: number;  // campo generado por PostgreSQL
  fecha_primer_cargo: string;
  fecha_ultima_cuota: string;
  created_at: string;
}

// ── Tipos de dominio (camelCase, para la UI y lib/finance/) ──────────────────

/** Estado calculado de una tarjeta (Architecture.md §5) */
export interface TarjetaConEstado {
  id: string;
  nombre: string;
  tipo: 'Crédito' | 'Débito';
  limite: number;        // Límite o Saldo inicial
  diaCorte: number | null;
  diaPago: number | null;
  gastosPeriodoActual: number;
  disponible: number;    // Límite disponible (Crédito) o Saldo actual (Débito)
  porcentajeUso: number; // 0 para Débito
  estadoTermometro: 'verde' | 'amarillo' | 'rojo'; // 'verde' para Débito siempre
  etiquetaEstado: string;
  proximoCorte: string | null;  // YYYY-MM-DD
  proximoPago: string | null;   // YYYY-MM-DD
  diasParaPago: number | null;
}

/** Movimiento normalizado para la UI */
export interface Movimiento {
  id: string;
  fecha: string;
  hora: string;
  tipo: 'Gasto' | 'Ingreso';
  monto: number;
  categoria: string;
  comercio: string;
  metodoPago: string;
}

/** Meta con progreso y proyección calculados */
export interface MetaConEstado {
  id: string;
  nombre: string;
  costoObjetivo: number;
  montoActual: number;
  rendimientoAnual: number;
  progreso: number;         // porcentaje 0–100
  proyeccion: {
    aportesMensualesPromedio: number;
    mesesEstimadosSinRendimiento: number | null;
    mesesEstimadosConRendimiento: number | null;
    fechaEstimadaCumplimiento: string | null;  // YYYY-MM-DD
  };
}

/** Compra MSI con meses restantes calculados */
export interface CompraMSI {
  id: string;
  tarjetaId: string;
  fechaCompra: string;
  comercio: string;
  categoria: string;
  montoTotal: number;
  mesesTotales: number;
  cuotaMensual: number;
  fechaPrimerCargo: string;
  fechaUltimaCuota: string;
  mesesRestantes: number;  // calculado en cliente
}

// ── Parámetros de filtro ─────────────────────────────────────────────────────

export interface FiltrosMovimientos {
  desde?: string;   // YYYY-MM-DD
  hasta?: string;   // YYYY-MM-DD
  metodoPago?: string;
  tipo?: 'Gasto' | 'Ingreso';
  limit?: number;
}
