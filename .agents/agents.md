# 🤖 FinTrack — Reglas del Agente (Antigravity)

Este archivo define cómo debes comportarte al trabajar en este repositorio. Se aplica en **toda sesión**, sin importar qué te pida el usuario en el prompt puntual.

**Versión 2.1** — Supabase como único backend. Google Apps Script eliminado por completo.

---

## Contexto del proyecto

FinTrack es una PWA de finanzas personales (Next.js App Router + TypeScript + Tailwind v4, desplegada en Vercel) con backend en **Supabase** (PostgreSQL + Auth + Row Level Security). El proyecto sigue un roadmap por fases definido en `docs/ROADMAP.md`. **Siempre verifica en qué fase está el proyecto antes de proponer trabajo que corresponda a una fase futura.**

> **Nota histórica:** el proyecto usó Google Apps Script + Google Sheets como backend en la Fase 1 (antes de agosto 2026). Ese backend está **completamente retirado**. Si encuentras referencias a GAS, clasp, Apps Script, PropertiesService, `doGet`, `doPost`, `/gas`, `Code.js`, o `getSheetByName` en el código o en conversaciones previas, son residuos históricos — ignóralos. El backend vigente es exclusivamente Supabase.

---

## Fuente de verdad — SIEMPRE lee antes de escribir código

Antes de generar o modificar cualquier código, consulta el documento correspondiente en `/docs`:

| Si vas a tocar… | Lee primero |
|---|---|
| Esquema de base de datos, tablas, RLS | `docs/API_Contract.md` (v2.0) y `/supabase/schema.sql` |
| Autenticación, periodos de tarjeta, caché, offline, sincronización | `docs/Architecture.md` (v2.0) |
| Cualquier componente visual, formulario o flujo de UI | `docs/UX_UI_Heuristics.md` |
| Cualquier feature nueva | `docs/SRS.md` (cita el FR/NFR correspondiente en tu respuesta) |

Si el código contradice algo documentado, **detente y pregúntale al usuario** si el documento debe actualizarse — nunca lo ignores en silencio.

---

## Restricciones no negociables

### 1. Compatibilidad con el Shortcut de iPhone — NO ROMPER
El único endpoint HTTP propio del sistema es `POST /api/shortcut` (Route Handler Next.js). El Shortcut de iPhone envía exactamente este payload y no se puede cambiar sin actualizar también el Shortcut:

```json
{
  "token": "<IPHONE_SHORTCUT_TOKEN>",
  "tipo": "Gasto",
  "monto": 150.00,
  "categoria": "Comida",
  "comercio": "OXXO",
  "metodo": "Efectivo",
  "esMeses": false
}
```

Con MSI:
```json
{
  "token": "<IPHONE_SHORTCUT_TOKEN>",
  "tipo": "Gasto",
  "monto": 6000.00,
  "categoria": "Electrónica",
  "comercio": "Amazon",
  "metodo": "Crédito PLATA",
  "esMeses": true,
  "meses": 6
}
```

Cualquier modificación a `src/app/api/shortcut/route.ts` **debe seguir aceptando este payload exacto**. Si el cambio requiere romper la compatibilidad, avisa al usuario primero — él actualiza el Shortcut manualmente.

### 2. Nunca hardcodear secretos
Los siguientes valores viven **únicamente** en variables de entorno (`.env.local` en desarrollo, Vercel en producción). Nunca en código versionado:
- `NEXT_PUBLIC_SUPABASE_URL` — URL pública del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave anónima (segura de exponer al navegador con RLS)
- `SUPABASE_SERVICE_ROLE_KEY` — omite RLS; **solo en servidor**, jamás en el bundle del navegador
- `IPHONE_SHORTCUT_TOKEN` — token de autenticación del Shortcut de iOS
- `MY_USER_ID` — UUID del usuario propietario para el Shortcut (inserta en su nombre)

> En GAS v1.0 el token vivía en `PropertiesService` con clave `"TOKEN"`. Eso fue eliminado. El token ahora es `process.env.IPHONE_SHORTCUT_TOKEN` en el Route Handler de Next.js.

### 3. `service_role key` exclusivamente en código servidor
`SUPABASE_SERVICE_ROLE_KEY` solo puede importarse/usarse dentro de Route Handlers server-side (actualmente `src/app/api/shortcut/route.ts`). Si detectas que un componente cliente (`"use client"`) lo necesita, es señal de diseño incorrecto — detente y avisa al usuario.

### 4. RLS obligatorio en toda tabla nueva
Toda tabla que agregues a `/supabase/schema.sql` o a una migración nueva **debe tener**:
```sql
alter table public.<tabla> enable row level security;
create policy "<tabla>_all_own" on public.<tabla>
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
Sin RLS activo, cualquier usuario autenticado puede leer los datos de otro. No hay excepción — si una tabla no tiene `user_id`, documenta explícitamente por qué y qué política de acceso aplica.

### 5. Toda comunicación con Supabase pasa por `lib/api/` o `lib/finance/`
Ningún componente de UI importa el cliente de Supabase directamente ni hace queries inline. La capa de datos es:
- `src/lib/supabase/client.ts` — `createBrowserClient` (navegador, anon key)
- `src/lib/supabase/server.ts` — `createServerClient` (Server Components/Actions, cookies)
- `src/lib/api/*.ts` — funciones de lectura/escritura por entidad
- `src/lib/finance/*.ts` — cálculos de negocio puros (sin I/O, testeables)

### 6. Autenticación: siempre `getUser()`, nunca `getSession()` a solas
`supabase.auth.getSession()` puede devolver datos stale de cookies sin validar contra el servidor de Auth. Siempre usar `supabase.auth.getUser()` en Server Components, middleware y Route Handlers para verificar que la sesión sigue siendo válida.

### 7. Paleta semántica del termómetro — no reutilizar
Los tokens `credito-verde`, `credito-amarillo`, `credito-rojo` (definidos en `src/app/globals.css`) están reservados **exclusivamente** para el estado de uso de tarjetas de crédito. Nunca usarlos para categorías de gasto, etiquetas genéricas, o cualquier otro propósito (UX/UI Heuristics H4).

### 8. Compras MSI y aportes a metas — reglas de escritura estrictas
- **Compras MSI** → solo insertan en `compras_msi`. Nunca en `movimientos`.
- **Aportes a metas** → solo actualizan `metas.monto_actual`. Nunca en `movimientos`.
- No revertir estas decisiones sin confirmación explícita del usuario.

### 9. No implementar fuera de la fase actual del roadmap
Sin que el usuario lo pida explícitamente, no implementes features de fases futuras. Si identificas algo "que sería bueno tener", sugiérelo en texto, no lo codifiques.

---

## Estilo de trabajo esperado

- Implementa **un endpoint, tabla o componente a la vez** — el usuario prefiere revisar y validar incrementalmente.
- Al generar código nuevo, indica el FR/NFR de `docs/SRS.md` o la sección de `Architecture.md` que implementas.
- Cambios al esquema (`/supabase/schema.sql` o migraciones nuevas) **requieren ejecución manual** del usuario en el SQL Editor de Supabase — nunca asumas que un `CREATE TABLE`/`ALTER TABLE` ya está aplicado.
- Código de infraestructura CI/CD (`.github/workflows/`) solo a partir de la Fase 5.

---

## Convenciones técnicas fijas

- **Idioma del código:** inglés (variables, funciones, tipos). **Idioma de UI y comentarios:** español (México). Moneda: formato `es-MX`.
- **Fechas:** `date`/`timestamptz` nativo de PostgreSQL en la capa de datos; `dd/mm/aaaa` solo en la UI.
- **Autenticación:** `@supabase/ssr` — `createBrowserClient` en cliente, `createServerClient` en servidor. Sesión verificada con `auth.getUser()`.
- **State management:** datos de Supabase solo vía TanStack Query (`staleTime` diferenciado por tipo). Estado UI-only vía Zustand o `useState` local.
- **Linting:** ESLint + Prettier sin warnings antes de considerar cualquier cambio como terminado.

---

## Convenciones de Next.js

Para patrones actualizados y buenas prácticas específicas del framework Next.js (App Router, Server Components, APIs vigentes), consulta también `AGENTS.md` en la raíz del repo, generado y mantenido por la propia herramienta de Next.js (`next dev`). En caso de conflicto entre ese archivo y este, **este archivo tiene prioridad** para decisiones de negocio y arquitectura de FinTrack; `AGENTS.md` tiene prioridad para convenciones del framework Next.js en sí.
