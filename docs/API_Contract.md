# API_Contract.md
## FinTrack — Contrato de Acceso a Datos (Supabase)
**Versión:** 2.0 — Reemplaza el contrato REST v1.0 basado en Google Apps Script

> **Cambio de paradigma:** v1.0 definía endpoints REST propios (`GET /movimientos`, `POST /transaccion`, etc.) porque Apps Script era la única puerta de entrada a los datos. Con Supabase, el frontend consulta las tablas **directamente** vía `supabase-js` (con RLS garantizando el aislamiento), así que ya no existen la mayoría de esos endpoints como tal. El único endpoint HTTP propio que se mantiene es `/api/shortcut`, para la integración con iOS Shortcuts.

---

## 0. Convenciones generales

- **Cliente de datos:** `@supabase/supabase-js` vía `src/lib/supabase/client.ts` (navegador) o `src/lib/supabase/server.ts` (Server Components/Actions).
- **Autenticación implícita:** cada consulta se ejecuta en el contexto de la sesión del usuario autenticado; RLS filtra automáticamente por `auth.uid()`. Ninguna consulta necesita (ni debe) pasar `user_id` manualmente como filtro — eso sería redundante con RLS, no un reemplazo de ella.
- **Formato de fecha:** `date` (YYYY-MM-DD) nativo de PostgreSQL. **Formato de hora:** `time` nativo.
- **Moneda:** `numeric(12,2)` en base de datos; formateado como MXN (`es-MX`) solo en la capa de presentación.

---

## 1. Tabla `tarjetas`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK, autogenerado |
| user_id | uuid | FK a `auth.users`, filtrado por RLS |
| nombre | text | |
| limite | numeric(12,2) | (Para Débito: se usa como Saldo Inicial) |
| dia_corte | int | 1–31 |
| dia_pago | int | 1–31 |
| tipo | text | check `'Crédito'` \| `'Débito'` |
| rendimiento_anual | numeric(5,2) | default 0 (Solo aplicable a Débito) |
| created_at | timestamptz | |

**Lectura (ejemplo, `src/lib/api/tarjetas.ts`):**
```ts
const { data, error } = await supabase
  .from('tarjetas')
  .select('*')
  .order('created_at', { ascending: true });
```
El estado calculado (`gastosPeriodoActual`, `disponible`, `porcentajeUso`, `estadoTermometro`) **no vive en esta tabla** — se calcula en `src/lib/finance/tarjetas.ts` combinando esta tabla con `movimientos` y `compras_msi` (ver `Architecture.md` §5). La función expone un tipo:

```ts
interface TarjetaConEstado {
  id: string;
  nombre: string;
  limite: number;
  diaCorte: number;
  diaPago: number;
  tipo: 'Crédito' | 'Débito';
  rendimientoAnual: number;
  gastosPeriodoActual: number;
  disponible: number;
  porcentajeUso: number;
  estadoTermometro: 'verde' | 'amarillo' | 'rojo';
  etiquetaEstado: string;
  proximoCorte: string;   // YYYY-MM-DD
  proximoPago: string;    // YYYY-MM-DD
  diasParaPago: number;
}
```

**Escritura:** `insert`/`update`/`delete` estándar de `supabase-js`, sin necesidad de especificar `user_id` (un trigger o el `default` de la columna puede tomarlo de `auth.uid()`, o se pasa explícitamente desde `supabase.auth.getUser()` en el cliente).

---

## 2. Tabla `movimientos`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| fecha | date | |
| hora | time | default `current_time` |
| tipo | text | check `'Gasto'` \| `'Ingreso'` |
| monto | numeric(12,2) | check > 0 |
| categoria | text | |
| comercio | text | |
| metodo_pago | text | |
| created_at | timestamptz | |

**Lectura con filtros (equivalente al antiguo `GET /movimientos`):**
```ts
const { data } = await supabase
  .from('movimientos')
  .select('*')
  .gte('fecha', desde)
  .lte('fecha', hasta)
  .order('fecha', { ascending: false })
  .limit(200);
```

**Tipo TypeScript:**
```ts
interface Movimiento {
  id: string;
  fecha: string;
  hora: string;
  tipo: 'Gasto' | 'Ingreso';
  monto: number;
  categoria: string;
  comercio: string;
  metodoPago: string;
}
```

---

## 3. Tabla `metas`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| nombre | text | |
| costo_objetivo | numeric(12,2) | check > 0 |
| monto_actual | numeric(12,2) | default 0 |
| rendimiento_anual | numeric(5,2) | default 0 |
| created_at | timestamptz | |

El cálculo de `progreso` y `proyeccion` (mismo algoritmo de interés compuesto mensual de v1.0) se hace en `src/lib/finance/metas.ts`, no se persiste.

**Aportar a una meta:** `update` directo sobre `monto_actual` — **nunca** genera fila en `movimientos` (decisión confirmada explícitamente).

---

## 4. Tabla `compras_msi`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| tarjeta_id | uuid | FK a `tarjetas` |
| fecha_compra | date | |
| comercio | text | |
| categoria | text | |
| monto_total | numeric(12,2) | check > 0 |
| meses_totales | int | check ≥ 2 |
| cuota_mensual | numeric(12,2) | **generada automáticamente**: `round(monto_total / meses_totales, 2)` |
| fecha_primer_cargo | date | |
| fecha_ultima_cuota | date | calculada al insertar |
| created_at | timestamptz | |

**Tipo TypeScript:**
```ts
interface CompraMSI {
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
  mesesRestantes: number; // calculado en cliente, no persistido
}
```

---

## 5. `POST /api/shortcut` (único endpoint HTTP propio)

Route Handler de Next.js. Reemplaza al `doPost` legacy de Apps Script.

### Body
```json
{
  "token": "IPHONE_SHORTCUT_TOKEN",
  "tipo": "Gasto",
  "monto": 89.50,
  "categoria": "Transporte",
  "comercio": "Uber",
  "metodo": "Crédito NU",
  "esMeses": false
}
```

Con MSI:
```json
{
  "token": "IPHONE_SHORTCUT_TOKEN",
  "tipo": "Gasto",
  "monto": 6000.00,
  "categoria": "Electrónica",
  "comercio": "Amazon",
  "metodo": "Crédito PLATA",
  "esMeses": true,
  "meses": 6
}
```

### Respuesta (200 OK)
```json
{
  "status": "success",
  "insertado_en": "movimientos"
}
```
o `"insertado_en": "compras_msi"` según corresponda.

### Respuesta de error
```json
{ "status": "error", "message": "Token inválido." }
```
(status 401)

### Lógica interna (resumen — implementación completa en Antigravity)
1. Validar `token === process.env.IPHONE_SHORTCUT_TOKEN` → si no, `401`.
2. Instanciar cliente Supabase con `service_role key` (server-side únicamente).
3. Si `tipo === 'Gasto' && esMeses === true` → resolver `tarjeta_id` buscando por `nombre = metodo` en `tarjetas` (filtrando por `user_id = MY_USER_ID`), calcular `fecha_ultima_cuota`, insertar en `compras_msi`.
4. En cualquier otro caso → insertar en `movimientos` con `user_id = process.env.MY_USER_ID`.

---

## 6. Resumen de acceso a datos

| Operación | Mecanismo |
|---|---|
| Leer/escribir tarjetas, movimientos, metas, compras_msi (desde la PWA) | `supabase-js` directo, protegido por RLS |
| Autenticación (signup/login/logout/sesión) | `supabase.auth.*` vía `@supabase/ssr` |
| Captura desde iOS Shortcuts | `POST /api/shortcut` (único endpoint HTTP propio del sistema) |

> Ya no existe un "backend propio" en el sentido de v1.0 — Supabase **es** el backend para la mayoría de operaciones; el único código de servidor que FinTrack mantiene es el Route Handler de Shortcuts y la lógica de cálculo financiero en `src/lib/finance/`.
