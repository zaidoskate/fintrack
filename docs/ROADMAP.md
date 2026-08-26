# ROADMAP.md
## FinTrack — Hoja de ruta de ejecución
**De los documentos de arquitectura al producto desplegado**
**Versión:** 1.0

> Este roadmap asume que ya tienes: `SRS.md`, `Architecture.md`, `UX_UI_Heuristics.md`, `API_Contract.md` generados. Está organizado en **fases secuenciales**, cada una con: objetivo, quién hace qué (Tú / Claude / Antigravity / CI), entregable de salida, y criterio de "listo para avanzar".

---

## Fase 0 — Preparación del entorno (antes de escribir código)
**Duración estimada: 1 sesión (~1-2h)**

| Tarea | Responsable |
|---|---|
| Crear repositorio en GitHub (ej. `fintrack-pwa`) | Tú |
| Crear estructura de carpetas base: `/docs`, `/src` (o `/app` si Next.js App Router) | Tú o Antigravity |
| Mover los 4 `.md` generados a `/docs` dentro del repo | Tú |
| Crear cuenta/proyecto en Vercel y vincularlo al repo (sin desplegar nada aún) | Tú |
| Crear el Google Sheet base con las 4 hojas ya definidas (`Movimientos`, `Calc_Data`, `Metas de Ahorro`, `Análisis de Gastos`) con al menos 2-3 filas de datos de prueba | Tú |
| Decidir stack final: **Next.js vs Vue** (si no está 100% decidido) | Tú, con mi ayuda si quieres comparar trade-offs |

**Entregable:** Repo vacío pero estructurado, con `/docs` poblado, Sheet de prueba con datos dummy, proyecto Vercel creado (sin deploy).

**Criterio para avanzar:** Puedes abrir el repo en Antigravity IDE y el Sheet de prueba tiene datos realistas en las 4 hojas.

---

## Fase 1 — Backend: Google Apps Script (API RESTful)
**Duración estimada: 2-4 sesiones**

Esta fase va **primero** porque el frontend depende de un contrato de API real y probable, no solo del documento. Sin un backend funcional (aunque sea mínimo), no puedes validar nada en el frontend.

### 1.1 Setup inicial
- Crear el proyecto de Apps Script vinculado al Sheet (`Extensiones > Apps Script`).
- Configurar `PropertiesService` con el token de autenticación (`AUTH_TOKEN`), nunca hardcodeado en el código.

### 1.2 Desarrollo guiado por `API_Contract.md`
**Aquí es donde entra Antigravity IDE.** Flujo recomendado:
1. Abre Antigravity con el repo (o carpeta del proyecto de GAS si lo manejas con `clasp` para tener el código versionado en Git — **recomendado**, en vez de editar solo en el editor web de Apps Script).
2. Dale a Antigravity como contexto el archivo `API_Contract.md` completo y el `Architecture.md` (sección de cálculo de periodos, §7).
3. Pide implementación **endpoint por endpoint**, no todo de golpe:
   - Primero `doGet` + router + `GET /tarjetas` (es el más autocontenido y valida la lógica de cálculo de periodo/corte, la parte más delicada).
   - Luego `GET /movimientos` con filtros de fecha.
   - Luego `POST /transaccion` (crear), después editar/eliminar.
   - Luego `GET /metas` y `POST /meta`.
4. **Por qué en este orden:** el cálculo de "Día de Corte → Próximo Corte/Pago" es la lógica de negocio más propensa a errores (meses de 28-31 días). Validarla primero, aislada, evita arrastrar un bug a todo lo demás.

### 1.3 Uso de `clasp` (recomendado para CI/CD real)
- Instala `@google/clasp`, autentícalo, y usa `clasp clone`/`clasp push` para que el código de GAS viva como archivos `.js`/`.ts` dentro del mismo repo de Git (carpeta `/gas` o repo separado `fintrack-backend`).
- Esto te permite versionar el backend igual que el frontend y, opcionalmente, automatizar el `clasp push` también desde GitHub Actions (opcional, fase avanzada).

### 1.4 Validación manual (antes de tocar frontend)
- Usa Postman/Thunder Client/Insomnia (o `curl`) para probar cada endpoint contra el Sheet de prueba, verificando que la respuesta cumpla **exactamente** el envelope JSON definido en `API_Contract.md`.
- Checklist de validación por endpoint:
  - [ ] Responde `401` si el token es incorrecto/ausente.
  - [ ] `GET /tarjetas` calcula correctamente el `estadoTermometro` para los 3 casos (verde/amarillo/rojo) con tus datos dummy.
  - [ ] `POST /transaccion` (crear) devuelve `impactoTarjeta` recalculado cuando el método de pago es una tarjeta.
  - [ ] Filtros de fecha en `GET /movimientos` funcionan con `desde`/`hasta`.

**Entregable:** Web App de GAS desplegada (URL `/exec`), probada manualmente, con los 5 endpoints funcionando contra datos reales de prueba.

**Criterio para avanzar:** Puedes pegar la URL en el navegador (o Postman) y obtener JSON válido para los 5 endpoints, con y sin token correcto.

---

## Fase 1.5 — Migración de backend a Supabase (insertada tras decisión de multiusuario)
**Duración estimada: 1-2 sesiones**

> Insertada entre Fase 1 y Fase 2 al decidir soportar múltiples usuarios con autenticación real. Ver `SRS.md` v2.0, `Architecture.md` v2.0 y `API_Contract.md` v2.0 para el detalle completo. El backend de Google Apps Script (Fase 1) queda retirado como capa de datos de producción; el Sheet histórico se conserva solo como referencia/backup.

**Pasos clave:**
1. Crear proyecto Supabase (gratis), ejecutar `supabase/schema.sql` (tablas + RLS).
2. Configurar variables de entorno en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `IPHONE_SHORTCUT_TOKEN`, `MY_USER_ID` (esta última tras crear la cuenta propia).
3. Antigravity implementa: clientes `@supabase/ssr` (browser/server), `middleware.ts`, páginas `/login` y `/signup`, protección de rutas, `/api/shortcut`, y la capa `lib/api/` + `lib/finance/` reescrita contra Supabase.
4. Actualizar el Shortcut "Fintrack" de iOS: nueva URL (`/api/shortcut`) y token agregado al diccionario.
5. Crear la cuenta propia como primer usuario real; validar aislamiento RLS con una segunda cuenta de prueba.

**Entregable:** Auth funcional (signup/login/logout), capa de datos conectada a Supabase con RLS verificado, Shortcut de iOS migrado y funcionando.

**Criterio para avanzar a Fase 2:** puedes registrarte, iniciar sesión, y confirmar (con una segunda cuenta de prueba) que no hay fuga de datos entre usuarios. El Shortcut real de tu iPhone escribe correctamente en Supabase.

---

## Fase 2 — Frontend: Scaffold + Design System
**Duración estimada: 1-2 sesiones**

> Los Pasos 2.0–2.4 (env vars, `create-next-app`, verificación local) ya no aplican tal cual estaban escritos — las variables de entorno ahora son las de Supabase (cubiertas en Fase 1.5), no las de Apps Script. Continúa desde el Paso 2.5 (design system) en adelante.

### 2.1 Inicialización del proyecto
- `create-next-app` (TypeScript + Tailwind + App Router) o `create-vue` según lo decidido en Fase 0.
- Instala dependencias core: `@tanstack/react-query` (o `@pinia/colada`/Pinia en Vue), `dexie` (wrapper de IndexedDB), `next-pwa` o `vite-plugin-pwa`.

### 2.2 Con Antigravity IDE
1. Dale como contexto `UX_UI_Heuristics.md` completo antes de generar **cualquier** componente visual — esto es lo que evita que el agente genere un dashboard genérico tipo "admin template".
2. Pide primero el **design system base**, no pantallas: paleta semántica (verde/amarillo/rojo del termómetro, separada de la paleta de categorías — ver H4 del documento de heurísticas), tipografía, tokens de espaciado en `tailwind.config`.
3. Luego pide el layout base (shell de navegación, Floating Action Button para "Registro Universal" — ver principio de Eficiencia, §1.2).

### 2.3 Capa de API (`lib/api/`)
- Pide a Antigravity que implemente `lib/api/client.ts` y los módulos por recurso (`movimientos.ts`, `tarjetas.ts`, `metas.ts`) siguiendo **exactamente** los tipos definidos en `API_Contract.md`. Aquí es clave: pide que primero genere las **interfaces TypeScript** de los payloads/respuestas (un archivo `types/api.ts`), y recién después las funciones fetch. Esto te da un contrato tipado que detecta errores en tiempo de compilación si el backend cambia.

**Entregable:** App corriendo en local (`localhost:3000`) con layout base, design system aplicado, y capa de API tipada (aún sin conectar a UI real).

**Criterio para avanzar:** `npm run dev` levanta sin errores, tienes los tipos de `API_Contract.md` reflejados 1:1 en `types/api.ts`.

---

## Fase 3 — Frontend: Feature por feature (con datos reales, sin offline todavía)
**Duración estimada: 3-5 sesiones**

Implementa **en este orden** (de menor a mayor complejidad de estado):

1. **Dashboard de Tarjetas** (`GET /tarjetas`) — solo lectura, ideal para validar React Query end-to-end con datos reales del backend de la Fase 1.
2. **Analítica** (`GET /movimientos` + agregaciones en cliente o `Análisis de Gastos`) — sigue siendo solo lectura.
3. **Motor de Metas** — aquí ya metes el primer CRUD con mutaciones (`useMutation`), pero sin offline todavía (asume red disponible).
4. **Registro Universal** — el más complejo, déjalo al final de esta fase porque es donde vas a construir la Sincronización Optimista (FR-06/07) **antes** de añadirle la capa offline.

En cada feature, el patrón de trabajo con Antigravity:
- Referencia el FR específico del `SRS.md` en el prompt (ej. "Implementa FR-09 a FR-14 del SRS").
- Pide que el componente consuma `lib/api/` — nunca fetch directo dentro del componente (NFR-06).
- Revisa tú mismo (o pídeme a mí revisión de código) que el `staleTime` de cada query coincida con lo definido en `Architecture.md` §4 (60s movimientos, 5 min tarjetas/metas).

**Entregable:** App funcional completa contra el backend real, sin soporte offline, sin Service Worker todavía.

**Criterio para avanzar:** Puedes usar la app de principio a fin (ver tarjetas, registrar transacción, crear meta, aportar, ver analítica) con conexión a internet normal.

---

## Fase 4 — Offline-first: Service Worker + IndexedDB + Background Sync
**Duración estimada: 2-3 sesiones (la fase más delicada técnicamente)**

Esta es la fase de mayor riesgo técnico — aísla su desarrollo del resto.

1. Configura `next-pwa`/`vite-plugin-pwa` con Workbox: `StaleWhileRevalidate` para GETs, estrategia custom para POSTs (ver `Architecture.md` §4).
2. Implementa `lib/api/offline/outbox.ts` con Dexie (tabla `outbox`).
3. Implementa la lógica de Sincronización Optimista real en el flujo de "Registro Universal" (ya tenías el flujo online-only de la Fase 3; ahora lo envuelves con el manejo offline).
4. Implementa el registro de Background Sync (`sync.register`) y su fallback para Safari/iOS (`visibilitychange` + botón manual — ver riesgo técnico en `Architecture.md` §9).
5. Implementa el store `useSyncStatus` y los indicadores visuales de H1 (Visibilidad del estado del sistema) del documento de heurísticas.

### Pruebas obligatorias de esta fase (manuales)
- [ ] Modo avión activado → registrar transacción → aparece como "Pendiente" → desactivar modo avión → se sincroniza sola sin recargar la app.
- [ ] Cerrar la pestaña con transacciones pendientes → reabrir → siguen pendientes y se sincronizan.
- [ ] Simular fallo del backend (cambiar token temporalmente) → la transacción debe mostrar estado de error con opción de reintentar, no perderse.

**Entregable:** App instalable como PWA con soporte offline completo verificado.

**Criterio para avanzar:** Los 3 casos de prueba manuales de arriba pasan consistentemente.

---

## Fase 5 — CI/CD con GitHub Actions
**Duración estimada: 1 sesión**

Aunque lo mencionamos como NFR-14, aún no generamos el `.yml`. Este es el momento correcto para hacerlo (con código real ya existente para lintear).

1. Pídeme (o a Antigravity) el archivo `.github/workflows/ci.yml` con:
   - Trigger: `push` y `pull_request` a `main`.
   - Jobs: `install` → `lint` (ESLint) → `format:check` (Prettier) → `typecheck` (`tsc --noEmit`) → (opcional) `test` si ya tienes pruebas unitarias.
   - Debe correr en paralelo/antes del build de Vercel, actuando como gate: si falla, Vercel igual construirá su propio preview (Vercel no espera a GitHub Actions por defecto), así que considera:
     - Opción A (recomendada): usar **GitHub branch protection rules** para que `main` no acepte merge si el workflow falla — así el `build` de Vercel en producción solo ocurre sobre código ya validado.
     - Opción B: desactivar el build automático de Vercel en push directo y disparar el deploy solo tras un job exitoso de CI (más complejo, usando Vercel CLI dentro del propio workflow).
2. Configura los **secrets** necesarios en GitHub (si el CI llega a necesitar variables, ej. para tests que golpeen un mock del backend).
3. Verifica que Vercel tenga configuradas las variables de entorno (`NEXT_PUBLIC_GAS_URL`, `GAS_AUTH_TOKEN`) en su dashboard, no en el repo.

**Entregable:** Workflow de CI corriendo en cada push/PR, branch protection activa en `main`.

**Criterio para avanzar:** Un PR con un error de lint intencional falla visiblemente en GitHub y bloquea el merge.

---

## Fase 6 — Deploy a producción y validación final
**Duración estimada: 1 sesión**

1. Deploy real en Vercel (producción) apuntando al backend de GAS ya desplegado (no al de pruebas, si usaste uno distinto).
2. Validar Lighthouse/PWA checklist: instalabilidad, manifest, ícono, HTTPS, performance.
3. Validar accesibilidad básica (NFR-09): contraste de colores del termómetro (verifica que no dependa solo del color — revisa el principio "nunca ocultar el signo" de `UX_UI_Heuristics.md` §3).
4. Prueba end-to-end en un dispositivo móvil real: instalar la PWA desde el navegador, registrar un gasto en la calle con datos móviles pobres o modo avión.

**Entregable:** FinTrack instalado y usándose en tu teléfono, conectado a tu Sheet real.

---

## Fase 7 — Iteración continua (post-lanzamiento)
Sin duración fija — backlog vivo.

Ideas priorizadas para después del MVP (no bloquean el lanzamiento):
- FR-19 (comparación de proyección con/sin rendimiento) si no se hizo en Fase 3.
- Exportación de reportes (PDF/Excel) de analítica.
- Notificaciones push (via Web Push API) para alertas de "faltan 5 días para el pago" (FR-14), aprovechando que ya tienes el Service Worker.
- Automatizar `clasp push` del backend dentro del mismo pipeline de GitHub Actions, si decidiste versionar GAS con clasp en la Fase 1.

---

## Cómo dividir el trabajo entre Claude, Antigravity IDE y tú (resumen operativo)

| Rol | Cuándo usarlo |
|---|---|
| **Claude (yo, en este chat)** | Decisiones de arquitectura, resolver dudas de diseño antes de escribir código, generar/actualizar los documentos `.md` cuando cambien los requisitos, revisar código puntual que me pegues cuando algo no cuadre con el contrato, generar el `ci.yml` cuando llegues a la Fase 5. |
| **Antigravity IDE** | Generación y edición de código real dentro del repo, feature por feature, usando los `.md` de `/docs` como contexto persistente. Es tu "mano ejecutora" fase a fase. |
| **Tú** | Validación manual de cada criterio "listo para avanzar", decisiones de producto (umbrales del termómetro, prioridad de features del backlog de Fase 7), pruebas en dispositivo real. |

**Regla de oro para evitar drift entre documentación y código:** cada vez que Antigravity (o tú) tome una decisión que se desvíe de lo documentado en los 4 `.md` (ej. cambiar un umbral, agregar un campo), vuelve a este chat y dime el cambio para que actualice el documento correspondiente antes de seguir. Así los `.md` en `/docs` siempre reflejan la verdad actual del proyecto, y no se convierten en documentación muerta.

---

## Checklist maestro (vista rápida)

- [ ] Fase 0 — Repo + Sheet de prueba + Vercel creado
- [ ] Fase 1 — Backend GAS: 5 endpoints funcionando y validados manualmente
- [ ] Fase 2 — Scaffold frontend + design system + capa de API tipada
- [ ] Fase 3 — 4 features funcionando online (Tarjetas, Analítica, Metas, Registro)
- [ ] Fase 4 — Offline-first verificado (3 pruebas manuales pasando)
- [ ] Fase 5 — CI/CD activo con branch protection
- [ ] Fase 6 — Deploy a producción y validado en dispositivo real
- [ ] Fase 7 — Backlog de iteración definido
