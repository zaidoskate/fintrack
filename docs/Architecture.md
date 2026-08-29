# Architecture.md
## FinTrack — Arquitectura de Software
**Versión:** 2.0 — Pivote de backend a Supabase (PostgreSQL + Auth + RLS)

> Reemplaza el modelo v1.0 (Google Apps Script sobre Google Sheets). El Shortcut de iOS se conserva mediante un endpoint propio.

---

## 1. Visión general

FinTrack pasa de un modelo "thick client contra un backend lento sin motor de consultas" (GAS + Sheets) a un modelo estándar de aplicación full-stack con **Backend as a Service**: PostgreSQL gestionado, autenticación integrada, y seguridad a nivel de fila (RLS) como mecanismo primario de aislamiento multiusuario.

Principio rector actualizado: **"La base de datos es la última línea de defensa del aislamiento entre usuarios — el código de aplicación puede tener bugs, las políticas de RLS son la garantía que no depende de que el código esté libre de errores."**

---

## 2. Diagrama de componentes (textual)

```
┌───────────────────────────────────────────────────────────────────┐
│                         DISPOSITIVO DEL USUARIO                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PWA (Next.js App Router)                    │   │
│  │  ┌───────────────┐   ┌────────────────────┐   ┌────────────┐ │   │
│  │  │   UI Layer     │   │  State Manager      │   │  Service    │ │   │
│  │  │  (Dashboard,   │◄─►│  (TanStack Query)    │◄─►│  Worker     │ │   │
│  │  │  Formularios)  │   │                       │   │  (SW)       │ │   │
│  │  └───────────────┘   └──────────┬─────────┘   └──────┬─────┘ │   │
│  │                          ┌─────────▼─────────┐  ┌────────▼────┐ │   │
│  │                          │  lib/api/           │  │  IndexedDB   │ │   │
│  │                          │  lib/finance/       │  │  (outbox +   │ │   │
│  │                          │  lib/supabase/      │  │  caché)      │ │   │
│  │                          │  (client.ts)         │  │              │ │   │
│  │                          └─────────┬─────────┘  └──────────────┘ │   │
│  └────────────────────────────────────┼───────────────────────────┘   │
└───────────────────────────────────────┼───────────────────────────────┘
                                          │ HTTPS
                                          │ (supabase-js, con sesión de usuario)
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │                SUPABASE                    │
                     │  ┌───────────────────────────────────┐   │
                     │  │  Auth (email/password, cookies)      │   │
                     │  ├───────────────────────────────────┤   │
                     │  │  PostgreSQL + Row Level Security      │   │
                     │  │  (profiles, tarjetas, movimientos,   │   │
                     │  │   metas, compras_msi,                │   │
                     │  │   portafolio_activos, cuentas_yield) │   │
                     │  └───────────────────────────────────┘   │
                     └─────────────────────────────────────────┘
                                          ▲
                                          │ service_role key (bypass RLS)
                                          │
                     ┌─────────────────────────────────────────┐
                     │   Vercel — Route Handler propio            │
                     │   /api/shortcut  (Next.js)                 │
                     │   Valida IPHONE_SHORTCUT_TOKEN,             │
                     │   inserta con user_id = MY_USER_ID          │
                     └─────────────────────────────────────────┘
                                          ▲
                                          │ HTTPS POST (JSON)
                                          │
                              ┌───────────────────────┐
                              │   iOS Shortcuts App      │
                              │  "Registra un gasto"     │
                              │  "Registra un ingreso"   │
                              │  "Fintrack" (webhook)    │
                              └───────────────────────┘
```

---

## 3. Flujo de datos detallado

### 3.1 Autenticación (nuevo)
1. El usuario visita `/signup` o `/login`. Un Server Action (`src/app/auth/actions.ts`) llama a `supabase.auth.signUp()` o `signInWithPassword()`.
2. Supabase gestiona la sesión mediante cookies HTTP-only. `middleware.ts` refresca la sesión en cada request usando `@supabase/ssr` → `updateSession()`.
3. Cualquier Server Component o Route Handler que necesite el usuario actual llama `supabase.auth.getUser()` (nunca confiar en cookies sin verificar contra el servidor de Auth).
4. Si no hay sesión válida, se redirige a `/login` antes de renderizar cualquier ruta del dashboard.

### 3.2 Flujo de lectura (Dashboard, Movimientos, Metas)
1. El componente llama un hook de TanStack Query (`useTarjetas()`, `useMovimientos()`).
2. El hook usa el cliente de navegador de Supabase (`src/lib/supabase/client.ts`) para consultar la tabla correspondiente.
3. RLS filtra automáticamente por `auth.uid()` — la consulta ni siquiera necesita especificar `user_id` manualmente; PostgreSQL lo hace cumplir a nivel de política.
4. Caché en memoria/persistida igual que en v1.0 (`staleTime` por tipo de dato).

### 3.3 Flujo de escritura (transacciones, metas, MSI)
Se conserva el patrón de **Sincronización Optimista** descrito en v1.0: actualización inmediata de la UI + cola en IndexedDB (`outbox`) + reintento con Background Sync si no hay red. La diferencia es el destino de la escritura: Supabase (`insert`/`update`/`delete` vía `supabase-js`) en vez de un `fetch` a Apps Script.

### 3.4 Flujo de captura vía iOS Shortcuts
1. El Shortcut "Fintrack" hace `POST` a `https://tu-dominio.vercel.app/api/shortcut` con el payload `{ token, tipo, monto, categoria, comercio, metodo, esMeses?, meses? }`.
2. El Route Handler valida `token === process.env.IPHONE_SHORTCUT_TOKEN`.
3. Usa el cliente de Supabase inicializado con `SUPABASE_SERVICE_ROLE_KEY` (que **omite RLS por diseño**) para insertar la fila con `user_id = process.env.MY_USER_ID`.
4. Si `esMeses === true`: inserta en `compras_msi` (calcula `fecha_ultima_cuota`). Si no: inserta en `movimientos`.

**Importante:** el `service_role` client se instancia **solo dentro de este Route Handler** (código server-side), nunca se importa en ningún archivo que pueda terminar en el bundle del navegador.

---

## 4. Estrategia de caché
(Sin cambios respecto a v1.0 — TanStack Query con `staleTime` diferenciado, `persistQueryClient` para caché entre recargas, `outbox` en IndexedDB para escrituras offline. Ver v1.0 §4 para la tabla completa; se mantiene vigente.)

---

## 5. Cálculo del termómetro de crédito (cambio clave respecto a v1.0)

En GAS, el cálculo se escribía de vuelta a `Calc_Data` en cada `GET /tarjetas` (workaround necesario por la falta de motor de consultas de Sheets). En Supabase, el cálculo se hace **en tiempo real, sin persistir el resultado**, en `src/lib/finance/tarjetas.ts`:

```
function calcularEstadoTarjeta(tarjeta, movimientos, comprasMSI, hoy):
  periodo = getPeriodoVigente(tarjeta.dia_corte, hoy)   // misma lógica de clamp que v1.0
  gastosMovimientos = suma de movimientos
      donde metodo_pago == tarjeta.nombre
      y tipo == 'Gasto'
      y fecha dentro de [periodo.inicio, periodo.fin]

  gastosMSI = suma de cuota_mensual de compras_msi
      donde tarjeta_id == tarjeta.id
      y hoy entre fecha_primer_cargo y fecha_ultima_cuota

  gastosPeriodo = gastosMovimientos + gastosMSI
  disponible = tarjeta.limite - gastosPeriodo
  porcentajeUso = (gastosPeriodo / tarjeta.limite) * 100
  estadoTermometro = clasificar(porcentajeUso)   // verde/amarillo/rojo, mismos umbrales
```

Esta función vive en TypeScript, no en SQL — mantiene la lógica de negocio portable y testeable, consistente con el principio de v1.0 de no dispersar reglas de negocio entre capas.

---

## 6. Seguridad y aislamiento multiusuario

| Mecanismo | Dónde vive | Propósito |
|---|---|---|
| Row Level Security (RLS) | PostgreSQL (Supabase) | Bloquea cualquier lectura/escritura cruzada entre usuarios, incluso si el código de aplicación tiene un bug |
| `auth.uid()` en políticas | PostgreSQL | Cada política compara `user_id` de la fila contra el usuario autenticado en la sesión actual |
| `anon key` | Cliente (navegador) | Segura de exponer — no otorga acceso a datos por sí sola, RLS es quien decide |
| `service_role key` | Solo `/api/shortcut` (server-side) | Bypass intencional de RLS, para insertar en nombre de un usuario fijo sin requerir su sesión activa |
| Middleware de sesión | `middleware.ts` | Refresca tokens de sesión y protege rutas del dashboard |

---

## 7. Modo Patrimonial e Integración de APIs Externas (Fase 6)

El Modo Patrimonial (Inversiones) funciona como un contexto paralelo al Dashboard de Gastos.
1. **Separación de Contexto**: Se activa mediante un toggle en Ajustes. La UI alterna entre `DashboardGastos` y `DashboardPatrimonial`.
2. **APIs de Precios**: Los activos variables (Cripto/Stocks) almacenan solo la cantidad poseída en Supabase (`portafolio_activos`). Los precios en tiempo real se consultan a APIs públicas (ej. CoinGecko, Finnhub) en el cliente.
3. **Caché de Precios**: Para evitar quemar los límites de tasa de las APIs gratuitas, las cotizaciones se guardan en `localStorage` con un TTL (Time-to-Live) de 15 a 60 minutos.
4. **Cuentas Yield**: (ej. AirTM). Almacenan un balance inicial y un APY. El crecimiento pasivo se proyecta linealmente en el frontend usando la diferencia de días entre `ultima_actualizacion` y hoy.

---

## 8. Infraestructura y despliegue

- **Frontend + Route Handlers:** Vercel (sin cambios respecto a v1.0).
- **Backend de datos:** Supabase (proyecto único usado en Production/Preview/Development por simplicidad, dado el bajo riesgo con RLS activo — separar en proyectos de staging/prod queda como mejora futura opcional).
- **CI/CD:** sin cambios respecto a v1.0 (GitHub Actions, ver Fase 5 del roadmap).

---

## 8. Riesgos técnicos actualizados
| Riesgo | Mitigación |
|---|---|
| Bug en una política de RLS que sea demasiado permisiva | Probar explícitamente con 2 cuentas de prueba antes de invitar usuarios reales (ver criterio de aceptación en `SRS.md` §5) |
| `service_role key` filtrada accidentalmente (ej. commiteada por error) | Nunca debe estar en código versionado; solo en variables de entorno de Vercel; revisar `.gitignore` cubre `.env.local` |
| Proyecto gratuito de Supabase se pausa tras 7 días de inactividad | No aplica mientras el uso sea diario; monitorear si se agregan usuarios de baja frecuencia |
| Analítica de gastos no refleja cuotas MSI mes a mes | Aceptado como limitación conocida (FR-32), backlog de Fase 7 |
