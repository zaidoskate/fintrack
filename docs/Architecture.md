# Architecture.md
## FinTrack — Arquitectura de Software
**Versión:** 1.0

---

## 1. Visión general

FinTrack es una arquitectura **cliente-céntrica** (thick client), donde la mayor parte de la lógica de negocio, cálculo y resiliencia vive en el frontend, dado que el backend (Google Apps Script) es intencionalmente delgado, lento y sin estado persistente propio más allá de Google Sheets.

Principio rector: **"El backend es lento, no confiable en latencia, y debe tratarse como una cola remota de escritura, no como una base de datos transaccional."**

---

## 2. Diagrama de componentes (textual)

```
┌───────────────────────────────────────────────────────────────────┐
│                         DISPOSITIVO DEL USUARIO                     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PWA (Next.js / Vue + TS)                   │   │
│  │                                                                 │   │
│  │  ┌───────────────┐   ┌────────────────────┐   ┌────────────┐ │   │
│  │  │   UI Layer     │   │  State Manager      │   │  Service    │ │   │
│  │  │  (Componentes, │◄─►│  (React Query /     │◄─►│  Worker     │ │   │
│  │  │  Dashboard,    │   │   TanStack Query /   │   │  (SW)       │ │   │
│  │  │  Formularios)  │   │   Pinia store)       │   │             │ │   │
│  │  └───────────────┘   └──────────┬─────────┘   └──────┬─────┘ │   │
│  │                                    │                     │       │   │
│  │                          ┌─────────▼─────────┐  ┌────────▼────┐ │   │
│  │                          │  API Client Layer  │  │  IndexedDB   │ │   │
│  │                          │  (lib/api/*.ts)     │  │  (Cola de    │ │   │
│  │                          │  Fetch wrapper +    │  │  outbox +    │ │   │
│  │                          │  auth token         │  │  caché local)│ │   │
│  │                          └─────────┬─────────┘  └──────────────┘ │   │
│  └────────────────────────────────────┼───────────────────────────┘   │
└───────────────────────────────────────┼───────────────────────────────┘
                                          │ HTTPS (Fetch API)
                                          │ GET / POST (JSON)
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │      Google Apps Script (Web App)          │
                     │      doGet(e) / doPost(e)                  │
                     │  ┌───────────────────────────────────┐   │
                     │  │  Router interno (por parámetro       │   │
                     │  │  ?resource=movimientos|tarjetas|... )  │   │
                     │  ├───────────────────────────────────┤   │
                     │  │  Middleware de autenticación (token) │   │
                     │  ├───────────────────────────────────┤   │
                     │  │  Capa de negocio (cálculo de         │   │
                     │  │  periodos, validaciones)             │   │
                     │  └───────────────────┬───────────────┘   │
                     └───────────────────────┼───────────────────┘
                                              │ SpreadsheetApp API
                                              ▼
                     ┌─────────────────────────────────────────┐
                     │            Google Sheets                    │
                     │  Movimientos | Calc_Data | Metas de Ahorro  │
                     │  | Análisis de Gastos                       │
                     └─────────────────────────────────────────┘
```

---

## 3. Flujo de datos detallado

### 3.1 Flujo de lectura (GET) — ej. cargar Dashboard
1. El componente de UI monta y dispara un hook (`useMovimientos()`, `useTarjetas()`).
2. El State Manager (React Query/TanStack Query) revisa su caché en memoria + persistida (localStorage/IndexedDB vía `persistQueryClient`).
3. Si existe caché válida (no `stale`), se renderiza inmediatamente sin esperar red (**stale-while-revalidate**).
4. En paralelo, se dispara el `fetch` real hacia el GAS Web App.
5. Cuando la respuesta llega (1–3s después), el State Manager reconcilia los datos: si difieren, actualiza la UI de forma silenciosa (sin parpadeos ni loaders bloqueantes).

### 3.2 Flujo de escritura (POST) — ej. registrar transacción
1. El usuario envía el formulario de "Registro Universal".
2. **Paso optimista inmediato:** el API Client Layer genera un ID temporal (`temp_uuid`), inserta el registro en la caché local de React Query (`queryClient.setQueryData`) y en el store de UI. La pantalla se actualiza al instante (< 100ms).
3. El registro se escribe también en **IndexedDB (tabla `outbox`)** con estado `pending`.
4. Si hay red disponible: el API Client intenta el `fetch POST` inmediatamente.
   - **Éxito:** el backend responde con el ID/rowIndex real. Se reemplaza el `temp_uuid` por el ID real en caché e IndexedDB, y se marca `synced`.
   - **Fallo (red o error 5xx del backend):** el registro permanece en `outbox` como `pending`, y la UI muestra un badge "Pendiente de sincronización" sobre ese ítem.
5. Si NO hay red disponible: el Service Worker intercepta la petición fallida (o la app detecta `navigator.onLine === false`) y registra una tarea de **Background Sync** (`sync.register('sync-outbox')`).
6. Cuando el navegador detecta que la conectividad regresó, dispara el evento `sync` en el Service Worker, que recorre la tabla `outbox` de IndexedDB y reenvía cada transacción pendiente en orden (FIFO), actualizando el estado conforme cada una se confirma.
7. **Reconciliación:** tras cualquier sincronización exitosa, se invalida (`invalidateQueries`) la query de `movimientos`, `tarjetas` (por el recálculo de "Disponible") y `análisis de gastos`, forzando un refetch en segundo plano.

### 3.3 Manejo de conflictos y consistencia
- El servidor (Google Sheets vía GAS) es la **fuente de verdad final**. Cualquier cálculo optimista en el cliente (ej. "Disponible" de una tarjeta) se recalcula y sobreescribe silenciosamente al recibir la respuesta real.
- No se implementa resolución de conflictos compleja (last-write-wins es aceptable, dado que es una app mono-usuario).

---

## 4. Estrategia de caché

| Capa | Tecnología | TTL / Estrategia | Propósito |
|---|---|---|---|
| Caché en memoria | React Query / TanStack Query (o Pinia + `@pinia/colada` en Vue) | `staleTime`: 60s para `movimientos`, 5 min para `tarjetas`/`metas` (cambian con menor frecuencia) | Evitar refetch innecesario dentro de la sesión activa |
| Caché persistida | `persistQueryClient` + IndexedDB/localStorage | Persiste entre recargas de la app | Permite arranque instantáneo (datos previos) incluso sin red |
| Cola de escritura offline | IndexedDB (tabla `outbox`) | Persistente hasta confirmación del servidor | Garantiza que ninguna transacción se pierda por falta de red |
| Caché HTTP del Service Worker | Workbox (`StaleWhileRevalidate` para GET, `NetworkOnly` con Background Sync para POST) | Definida en `next-pwa` / `vite-plugin-pwa` config | Permite que el "shell" de la app y las respuestas GET recientes se sirvan instantáneamente |

**Regla de invalidación clave:** cualquier mutación (POST transacción, CRUD de meta) invalida en cascada las queries dependientes:
- Nueva transacción → invalida `movimientos`, `tarjetas` (recalcula Disponible/uso), `análisis-gastos`.
- Aporte a meta → invalida `metas`.

---

## 5. Manejo de estado (State Management)

- **Server state** (datos que vienen del backend): gestionado exclusivamente por React Query/TanStack Query. Nunca se duplica manualmente en `useState`/store global.
- **Client state** (UI-only: modal abierto, filtros seleccionados, tema): gestionado con `useState`/`Zustand` (Next.js) o `Pinia` (Vue), completamente separado del server state.
- **Estado de sincronización global:** un store ligero (`useSyncStatus`) expone `idle | syncing | pending | error`, alimentado por listeners del Service Worker (`postMessage`) y del estado de la `outbox` en IndexedDB.

---

## 6. Capa de abstracción de API (Backend for Frontend ligero)

Todo el frontend se comunica con GAS **exclusivamente** a través de una carpeta `lib/api/`:

```
lib/api/
  client.ts        // fetch wrapper: base URL, token, manejo de errores, timeout
  movimientos.ts    // getMovimientos(), createMovimiento()
  tarjetas.ts       // getTarjetas()
  metas.ts          // getMetas(), createMeta(), updateMeta(), deleteMeta()
  offline/
    outbox.ts        // CRUD sobre IndexedDB (Dexie.js recomendado)
    sync.ts           // lógica de reintentos y Background Sync
```

Esto asegura NFR-06 (portabilidad): si en el futuro se migra el backend de GAS a un backend real (Node/Postgres), solo se reescribe esta carpeta.

---

## 7. Cálculo de periodos de tarjetas (lógica crítica)

Dado que `Calc_Data` almacena "Día de Corte" y "Día de Pago" como enteros (día del mes), la lógica de cálculo de periodo vigente debe residir en una función pura y testeable, idealmente **duplicada en ambos lados** (GAS para el valor "oficial" que se guarda en Sheets, y en el cliente para el recálculo optimista):

```
function getPeriodoVigente(diaCorte: number, hoy: Date): { inicio: Date, fin: Date, proximoCorte: Date, proximoPago: Date }
```

Esta función debe considerar meses con menos días que `diaCorte` (ej. corte día 31 en febrero → usar último día del mes).

---

## 8. Infraestructura y despliegue

- **Frontend:** Vercel (build automático desde `main`), variables de entorno (`NEXT_PUBLIC_GAS_URL`, `GAS_AUTH_TOKEN`) configuradas en el dashboard de Vercel, nunca hardcodeadas.
- **Backend:** Google Apps Script desplegado como "Web App" con acceso "Cualquier usuario, incluso anónimo" (protegido a nivel de aplicación por token, ya que GAS no soporta CORS headers personalizados de forma trivial — se recomienda validar el token como parámetro de query o en el body).
- **CI/CD:** ver sección de GitHub Actions en el documento de requisitos (NFR-14); el pipeline corre en paralelo al build nativo de Vercel, actuando como gate de calidad antes del merge/deploy.

---

## 9. Riesgos técnicos identificados
| Riesgo | Mitigación |
|---|---|
| CORS con Google Apps Script | Usar `mode: 'no-cors'` no es viable si se necesita leer la respuesta; se debe configurar el Web App para responder con `ContentService` y headers correctos, o usar `text/plain` como `Content-Type` en el POST para evitar preflight. |
| Límite de cuota diaria de GAS (ejecuciones) | Minimizar llamadas mediante caché agresiva; agrupar escrituras cuando sea posible. |
| Pérdida de datos en `outbox` si el usuario borra datos del navegador | Mostrar advertencia clara en la UI cuando existan transacciones pendientes sin sincronizar por más de X horas. |
| Falta de soporte de Background Sync en Safari/iOS | Fallback: sincronización al recuperar el foco de la app (`visibilitychange`) + botón manual de "Sincronizar ahora". |
