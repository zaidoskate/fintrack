# ROADMAP.md
## FinTrack — Hoja de ruta de ejecución
**De los documentos de arquitectura al producto desplegado**
**Versión:** 2.2 (Actualizada post-CI/CD y Módulo Patrimonial)

> Este roadmap refleja el estado actual del proyecto tras la migración exitosa a Supabase, la implementación del modo Offline (PWA), la configuración de GitHub Actions y el despliegue de las analíticas patrimoniales.

---

## Fase 0 a Fase 4
**Estado: COMPLETADA**
*(Preparación, Backend Supabase, Scaffold Glass Ledger, Core Features, y PWA Offline-first completadas exitosamente).*

---

## Fase 5 — CI/CD con GitHub Actions
**Estado: COMPLETADA**

**Logros:**
1. Configuración de integración continua para proteger el código.
2. **Jobs**: Instalación de dependencias → Linting (ESLint) → Typechecking (`tsc`).
3. Bloqueo de fusiones a `main` si el CI falla.

---

## Fase 6 — Módulo de Inversiones (Criptos / Acciones / ETFs / Yields)
**Estado: COMPLETADA**

**Logros:**
1. **Base de Datos**: Tablas en Supabase para `portafolio_activos` y `cuentas_yield`.
2. **API Proxy Interna (Yahoo Finance)**: Migración exitosa de CoinGecko a una ruta proxy server-side para cotizaciones `LIVE` de la bolsa americana (`QQQM`, `AAPL`) y Cripto sin problemas de CORS.
3. **UX & UI (Glassmorphism)**: 
   - Selector Global de Monedas (Conversión dinámica del Gran Total a `USD`, `MXN`, `EUR` y `BTC`).
   - Reemplazo de formularios estáticos por modales (`AddInversionModal`, `AddCuentaYieldModal`).
   - Componente `Loader` animado centralizado.
4. **Analítica Patrimonial Avanzada (Fintech UX)**:
   - *Distribución Minimalista*: Barra de distribución apilada horizontal (0 scroll extra).
   - *Ingresos Pasivos*: Píldora/Badge inteligente que calcula rendimientos combinados de Cuentas Yield, Tarjetas de Débito y Apartados.
   - *Timeline Histórico (Hero)*: Gráfica de `recharts` que cruza precios históricos de Yahoo Finance (con conversión dinámica de moneda) vs el portafolio actual del usuario en rangos de 12H, 1D, 1W, 1M, y 6M.

---

## Fase 7 — Iteración Continua (Post-Lanzamiento / Backlog)
**Estado: BACKLOG**

Ideas priorizadas para el futuro:
- Exportación de reportes (PDF/Excel) de analítica.
- Notificaciones Push (vía Web Push API) para recordatorios de pago de tarjetas.
- Presupuestos mensuales estrictos (categorización avanzada).

### Propuesta Técnica: Notificaciones de Plusvalía e Hitos Financieros (Integración Resend)
Para lograr notificaciones automáticas por correo de crecimiento y plusvalía, la arquitectura necesitaría:
1. **Campo `costo_promedio` en BD**: Actualmente la base de datos sólo guarda *cuántos* títulos tienes, pero no *cuánto te costaron*. Se necesita agregar una columna `costo_promedio` (o `precio_compra`) a la tabla `portafolio_activos`.
2. **Cron Job Backend (Supabase Edge Functions o Vercel Cron)**: 
   - Un proceso automático que corra 1 vez al día o a la semana.
   - Consultaría a Yahoo Finance por los precios actuales.
   - Calcularía la diferencia entre el *precio actual* y el `costo_promedio`.
3. **Integración con Resend**:
   - Si la plusvalía de algún activo sobrepasa un umbral (Ej. creció un +5% en la semana), el backend dispara la API de Resend (`resend.emails.send()`) con un correo HTML moderno.

---

## Checklist maestro (vista rápida)

- [x] Fase 0 — Repo + Vercel creado
- [x] Fase 1 — Backend GAS (RETIRADO)
- [x] Fase 1.5 — Backend Supabase + Auth + Google Auth
- [x] Fase 2 — Scaffold frontend + design system
- [x] Fase 3 — Core Features (Tarjetas, Analítica, Metas, Débito)
- [x] Fase 4 — PWA & Offline-first verificado
- [x] Fase 5 — CI/CD activo con branch protection
- [x] Fase 6 — Módulo de Inversiones y Analítica Patrimonial
- [x] Fase 7 — Módulo de Perfil de Usuario y Modificaciones Patrimoniales
