/** Solo acepta POST — responde 405 a cualquier otro método para suprimir errores en logs. */
export async function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}

/**
 * POST /api/shortcut — Endpoint de captura para iOS Shortcuts.
 * Implementa: API_Contract.md §5, Architecture.md §3.4.
 * agents.md: reglas 1, 2, 3 — service_role SOLO aquí, nunca en cliente.
 *
 * Body esperado:
 * {
 *   token: string,
 *   tipo: "Gasto" | "Ingreso",
 *   monto: number,
 *   categoria?: string,
 *   comercio?: string,
 *   metodo?: string,
 *   esMeses?: boolean,
 *   meses?: number       // requerido si esMeses === true
 * }
 *
 * Lógica de fecha_ultima_cuota:
 *   Suma (meses - 1) meses a la fecha de hoy, con clamp al último día
 *   del mes destino — misma lógica que getPeriodoVigente en lib/finance/tarjetas.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Cliente service_role (bypass RLS intencional — agents.md regla 3) ─────────
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

/** Último día del mes (year, month0) */
function lastDayOfMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/**
 * Calcula fecha_ultima_cuota: añade (meses - 1) meses a hoy con clamp.
 * Ej: hoy = 31 ene, meses = 2 → 28 feb (o 29 en bisiesto).
 */
function calcFechaUltimaCuota(hoy: Date, meses: number): string {
  const targetMonth0 = hoy.getMonth() + (meses - 1);
  const targetYear   = hoy.getFullYear() + Math.floor(targetMonth0 / 12);
  const normalMonth0 = ((targetMonth0 % 12) + 12) % 12;
  const dia = Math.min(hoy.getDate(), lastDayOfMonth(targetYear, normalMonth0));
  const fecha = new Date(targetYear, normalMonth0, dia);
  return fecha.toISOString().substring(0, 10); // YYYY-MM-DD
}

function todayISO(): string {
  return new Date().toISOString().substring(0, 10);
}

// ── Handler ───────────────────────────────────────────────────────────────────

import { z } from 'zod';

const shortcutSchema = z.object({
  token: z.string().min(1, 'Token requerido.'),
  tipo: z.enum(['Gasto', 'Ingreso']),
  monto: z.number().positive('El monto debe ser > 0.'),
  categoria: z.string().optional(),
  comercio: z.string().optional(),
  metodo: z.string().optional(),
  esMeses: z.boolean().optional(),
  meses: z.number().int().min(2).optional(),
}).refine(data => {
  if (data.esMeses && (!data.meses || data.meses < 2)) return false;
  return true;
}, {
  message: 'Campo "meses" requerido y debe ser ≥ 2 para compras MSI.',
  path: ['meses'],
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Body inválido — se esperaba JSON.' }, { status: 400 });
  }

  const parsed = shortcutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Datos de entrada inválidos.'
    }, { status: 400 });
  }

  const { token, tipo, monto, categoria, comercio, metodo, esMeses, meses } = parsed.data;

  const supabase = getServiceClient();
  const hoy = new Date();

  const { data: config, error: configError } = await supabase
    .from('usuarios_config')
    .select('id')
    .eq('shortcut_token', token)
    .single();

  if (configError || !config) {
    return NextResponse.json(
      { status: 'error', message: 'Token de Shortcut inválido o usuario no encontrado.' },
      { status: 401 },
    );
  }
  const userId = config.id;

  const nombreTarjeta = (metodo ?? '').trim();
  let tarjetaId: string | null = null;
  
  if (nombreTarjeta && nombreTarjeta.toLowerCase() !== 'efectivo') {
    // Sanitizar entrada para prevenir inyección en ilike (wildcards)
    const sanitizedNombre = nombreTarjeta.replace(/[%_]/g, '\\$&');
    const { data: tarjeta, error: tarjetaError } = await supabase
      .from('tarjetas')
      .select('id')
      .eq('user_id', userId)
      .ilike('nombre', sanitizedNombre)
      .single();
      
    if (tarjetaError || !tarjeta) {
      return NextResponse.json(
        { status: 'error', message: `Tarjeta "${nombreTarjeta}" no encontrada en tu cuenta.` },
        { status: 422 },
      );
    }
    tarjetaId = tarjeta.id;
  }

  // 4a. Insertar en compras_msi (cuando esMeses === true y tipo === 'Gasto')
  if (tipo === 'Gasto' && esMeses === true) {
    if (!meses || meses < 2) {
      return NextResponse.json(
        { status: 'error', message: 'Campo "meses" requerido y debe ser ≥ 2 para compras MSI.' },
        { status: 400 },
      );
    }

    if (!tarjetaId) {
      return NextResponse.json(
        { status: 'error', message: `No puedes registrar Compras a MSI en Efectivo. Se requiere una Tarjeta de Crédito válida.` },
        { status: 422 },
      );
    }


    const fechaUltimaCuota = calcFechaUltimaCuota(hoy, meses);

    const { error: msiError } = await supabase.from('compras_msi').insert({
      tarjeta_id:         tarjetaId,
      fecha_compra:       todayISO(),
      comercio:           comercio ?? 'N/A',
      categoria:          categoria ?? 'Sin categoría',
      monto_total:        monto,
      meses_totales:      meses,
      fecha_primer_cargo: todayISO(),
      fecha_ultima_cuota: fechaUltimaCuota,
    });

    if (msiError) {
      console.error('[/api/shortcut] Error insertando compra MSI:', msiError);
      return NextResponse.json(
        { status: 'error', message: 'Error al guardar la compra en base de datos.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: 'success',
      insertado_en: 'compras_msi',
      fecha_ultima_cuota: fechaUltimaCuota,
    });
  }

  // 4b. Insertar en movimientos (caso general)
  const { error: movError } = await supabase.from('movimientos').insert({
    user_id:    userId,
    fecha:      todayISO(),
    tipo:       tipo as 'Gasto' | 'Ingreso',
    monto:      monto,
    categoria:  categoria  ?? 'Sin categoría',
    comercio:   comercio   ?? 'N/A',
    tarjeta_id: tarjetaId,
  });

  if (movError) {
    console.error('[/api/shortcut] Error insertando movimiento:', movError);
    return NextResponse.json(
      { status: 'error', message: 'Error al guardar el movimiento en base de datos.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: 'success', insertado_en: 'movimientos' });
}
