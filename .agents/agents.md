# 🤖 FinTrack — Reglas del Agente (Antigravity)

Este archivo define cómo debes comportarte al trabajar en este repositorio. Se aplica en **toda sesión**, sin importar qué te pida el usuario en el prompt puntual.

---

## Contexto del proyecto

FinTrack es una PWA de finanzas personales (Next.js + TypeScript + Tailwind, desplegada en Vercel) con backend en Google Apps Script sobre Google Sheets. El proyecto sigue un roadmap por fases, definido en `docs/ROADMAP.md`. **Siempre verifica en qué fase está el proyecto antes de proponer trabajo que corresponda a una fase futura.**

## Fuente de verdad — SIEMPRE lee antes de escribir código

Antes de generar o modificar cualquier código, debes consultar el documento correspondiente en `/docs`:

| Si vas a tocar... | Lee primero |
|---|---|
| Cualquier endpoint de `/gas` | `docs/API_Contract.md` (estructura JSON exacta, no la inventes) |
| Cálculo de periodos de tarjeta, caché, sincronización optimista, offline | `docs/Architecture.md` |
| Cualquier componente visual, formulario, o flujo de UI | `docs/UX_UI_Heuristics.md` |
| Cualquier feature nueva | `docs/SRS.md` (cita el FR/NFR correspondiente en tu respuesta) |

Si el código que vas a escribir contradice algo documentado, **detente y pregúntale al usuario** si el documento debe actualizarse — no asumas que el documento está desactualizado ni lo ignores en silencio.

## Restricciones no negociables

1. **No rompas el endpoint legacy de Apps Script.** Existe un `doPost` que recibe peticiones sin token desde un iOS Shortcut con el payload `{tipo, monto, categoria, comercio, metodo}`. Cualquier cambio al router de `/gas` debe seguir aceptando ese payload exacto sin exigirle token ni campo `resource`.
2. **Nunca hardcodees secretos.** El token de autenticación (`AUTH_TOKEN`) vive en `PropertiesService` del lado de GAS y en variables de entorno de Vercel del lado del frontend. Nunca lo escribas literal en un archivo que se vaya a commitear.
3. **Toda comunicación del frontend con el backend pasa por `lib/api/`.** Ningún componente de UI debe hacer `fetch` directo al Web App de GAS (ver NFR-06 de `docs/SRS.md`).
4. **Respeta la paleta semántica del termómetro de crédito** (verde/amarillo/rojo) — está reservada exclusivamente para el estado de uso de tarjetas, nunca la reutilices para categorías de gasto u otro propósito (ver H4 en `docs/UX_UI_Heuristics.md`).
5. **No implementes features fuera de la fase actual del roadmap** sin que el usuario lo pida explícitamente. Si detectas que algo "sería bueno tener" pero no está en la fase activa, sugiérelo en texto, no lo codifiques de una vez.

## Estilo de trabajo esperado

- Implementa **un endpoint o un componente a la vez**, no todo de golpe. El usuario prefiere revisar y validar incrementalmente (ver su preferencia por fases disciplinadas).
- Cuando generes código nuevo, indica explícitamente qué requisito (FR-XX / NFR-XX) o qué sección de `Architecture.md` estás implementando.
- Si vas a modificar `/gas`, recuerda que los cambios se prueban con `clasp push` antes de promoverlos a producción con `clasp deploy -i <deploymentId>` — nunca sugieras `clasp deploy` sin `-i` porque generaría una URL nueva y rompería la integración con Vercel y el Shortcut de iPhone.
- El código de infraestructura (CI/CD, `.github/workflows/`) solo se toca a partir de la Fase 5 del roadmap.

## Convenciones técnicas fijas

- **Idioma del código:** inglés (nombres de variables, funciones, tipos). **Idioma de comentarios y mensajes de UI:** español (México), formato de moneda `es-MX`.
- **Formato de fecha:** ISO 8601 (`YYYY-MM-DD`) en toda la capa de API; formato `dd/mm/aaaa` solo en la UI.
- **State management:** server state (datos de GAS) solo vía TanStack Query — nunca duplicado en `useState`. Client state (UI-only) vía Zustand o `useState` local.
- **Linting:** el código debe pasar ESLint + Prettier sin warnings antes de considerarse terminado.
---

## Convenciones de Next.js

Para patrones actualizados y buenas prácticas específicas del framework Next.js (App Router, Server Components, APIs vigentes), consulta también `AGENTS.md` en la raíz del repo, generado y mantenido por la propia herramienta de Next.js.