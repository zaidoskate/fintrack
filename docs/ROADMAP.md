# ROADMAP.md
## FinTrack — Hoja de ruta de ejecución
**De los documentos de arquitectura al producto desplegado**
**Versión:** 2.1 (Actualizada post-migración Supabase y Offline)

> Este roadmap refleja el estado actual del proyecto tras la migración exitosa a Supabase, la implementación del modo Offline (PWA) y la adición de Google OAuth. Las referencias antiguas a Google Apps Script han sido marcadas como retiradas.

---

## Fase 0 — Preparación del entorno
**Estado: COMPLETADA**

| Tarea | Responsable |
|---|---|
| Crear repositorio en GitHub (`fintrack-pwa`) | Tú |
| Crear estructura de carpetas base | Tú o Antigravity |
| Mover los `.md` generados a `/docs` | Tú |
| Crear cuenta/proyecto en Vercel y vincularlo al repo | Tú |
| Decidir stack final: **Next.js (App Router)** | Tú / Antigravity |

---

## Fase 1 — Backend: Google Apps Script (RETIRADA)
**Estado: RETIRADA**

Esta fase se desarrolló originalmente para usar Google Sheets como base de datos. Sin embargo, para soportar escalabilidad, autenticación real y múltiples usuarios, fue completamente reemplazada por la **Fase 1.5**. 
*El código antiguo en GAS queda solo como referencia histórica.*

---

## Fase 1.5 — Backend Supabase + Autenticación
**Estado: COMPLETADA**

**Logros:**
1. Creación de base de datos relacional en Supabase con Row Level Security (RLS).
2. Implementación de Auth SSR con Supabase (`/login`, `/signup`).
3. Integración de **Google OAuth** (Inicio de sesión con Google) gratuito vía GCP.
4. Migración de Shortcut de iOS para registrar gastos de forma nativa.
5. Aislamiento total de datos por usuario (`user_id`).

---

## Fase 2 — Frontend: Scaffold + Design System
**Estado: COMPLETADA**

**Logros:**
- Inicialización con Next.js 15+ (App Router).
- Implementación de React Query y Server Actions.
- Creación de Design System "Glass Ledger" (Glassmorphism, desenfoques, colores base).
- Creación de componentes base: `GlassCard`, `StatusPill`, `ConfirmModal`.

---

## Fase 3 — Core Features (Tarjetas, Analítica, Metas)
**Estado: COMPLETADA**

**Logros:**
1. **Dashboard de Tarjetas**: Cálculo de Termómetro de Crédito y fechas de corte.
2. **Analítica**: Filtros de mes/semana, métricas de balance.
3. **Metas de Ahorro**: Motor de metas con barras de progreso circulares y lineales.
4. **Registro Universal**: FAB central para ingresar gastos o ingresos.
5. **Tarjetas de Débito**: Soporte para saldo disponible y desglose cronológico de movimientos por tarjeta.
6. **Rendimientos Dinámicos**: Cálculo de interés compuesto diario para tarjetas de débito y metas.

---

## Fase 4 — PWA y Modo Offline (Offline-first)
**Estado: COMPLETADA**

**Logros:**
1. Implementación de `@serwist/next` (Service Worker).
2. Manifiesto de PWA instalado y validado (instalable en iOS/Android).
3. Sincronización optimista y almacenamiento local (IndexedDB) para permitir usar la app sin conexión a internet.
4. Interfaz adaptada con indicadores de estado de sincronización y validaciones robustas para Safari/iOS.

---

## Fase 5 — CI/CD con GitHub Actions
**Estado: PENDIENTE (Próxima fase)**
**Duración estimada: 1 sesión**

Configurar integración continua para proteger el código antes de añadir features masivos.

1. Crear `.github/workflows/ci.yml`.
2. **Jobs**: Instalar dependencias → Linting (ESLint) → Typechecking (`tsc`).
3. Bloquear fusiones (merges) a `main` si el CI falla.
4. *(Opcional)* Desplegar automáticamente a Vercel solo si el CI pasa exitosamente.

**Entregable:** Workflow de GitHub Actions protegiendo la rama `main`.

---

## Fase 6 — Módulo de Inversiones (Criptos / Acciones / ETFs)
**Estado: EN BACKLOG (Planificación requerida)**

Módulo masivo para trackear portafolios de inversión.

1. **Base de Datos**: Nuevas tablas en Supabase para activos, portafolios y transacciones (compra/venta).
2. **APIs Externas**: Integración con oráculos o APIs gratuitas (ej. Yahoo Finance, CoinGecko) para precios en tiempo real.
3. **UI/UX**: Gráficas de rendimiento histórico, distribución del portafolio (Donut charts), PNL (Profit and Loss).
4. **Lógica**: Cálculo de promedios de compra (DCA), rendimientos no realizados.

---

## Fase 7 — Iteración Continua (Post-Lanzamiento)
**Estado: BACKLOG**

Ideas priorizadas para el futuro:
- Exportación de reportes (PDF/Excel) de analítica.
- Notificaciones Push (vía Web Push API) para recordatorios de pago de tarjetas.
- Presupuestos mensuales estrictos (categorización avanzada).

---

## Checklist maestro (vista rápida)

- [x] Fase 0 — Repo + Vercel creado
- [x] Fase 1 — Backend GAS (RETIRADO)
- [x] Fase 1.5 — Backend Supabase + Auth + Google Auth
- [x] Fase 2 — Scaffold frontend + design system
- [x] Fase 3 — Core Features (Tarjetas, Analítica, Metas, Débito)
- [x] Fase 4 — PWA & Offline-first verificado
- [ ] Fase 5 — CI/CD activo con branch protection
- [ ] Fase 6 — Módulo de Inversiones (Criptos/ETFs)
- [ ] Fase 7 — Backlog de iteración definido y validación fina (Accesibilidad, Lighthouse)
