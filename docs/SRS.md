# Software Requirements Specification (SRS)
## PWA de Finanzas Personales — "FinTrack"
**Basado libremente en ISO/IEC/IEEE 29148:2018**
**Versión:** 2.0 — Actualizado tras pivote de backend a Supabase (Postgres + Auth + RLS)
**Estado:** Draft para desarrollo (Antigravity IDE)

> **Nota de versión:** La v1.0 de este documento asumía un backend en Google Apps Script sobre Google Sheets, mono-usuario. La v2.0 refleja el pivote a **Supabase** (PostgreSQL + Auth + Row Level Security), motivado por el requisito de soportar múltiples usuarios (1 usuario hoy, 5–10 en mediano plazo) con aislamiento de datos y autenticación real, manteniendo costo $0. El Shortcut de iOS se conserva sin cambios de experiencia para el usuario final.

---

## 1. Introducción

### 1.1 Propósito
Este documento especifica los requisitos funcionales y no funcionales para el desarrollo de una Progressive Web App (PWA) multiusuario de gestión de finanzas personales, con autenticación individual y datos completamente aislados por usuario.

### 1.2 Alcance del producto
El sistema, denominado **FinTrack**, permitirá a cada usuario registrado:
- Crear una cuenta (signup) e iniciar sesión (login) de forma independiente.
- Registrar transacciones financieras (ingresos/gastos), incluso sin conexión a internet.
- Monitorear el uso de tarjetas de crédito (límites, fechas de corte) y tarjetas de débito (saldo real con cálculo de rendimiento diario).
- Registrar y dar seguimiento a **compras a meses sin intereses (MSI)** pagadas con tarjeta de crédito, sin distorsionar el cálculo del uso real del periodo vigente.
- Definir y rastrear metas de ahorro con proyecciones basadas en rendimiento anual.
- Visualizar tendencias de gasto por categoría a lo largo del tiempo.

El backend es **Supabase** (PostgreSQL gestionado + Auth + Row Level Security), reemplazando el modelo anterior de Google Apps Script sobre Sheets. El aislamiento entre usuarios se garantiza a nivel de base de datos (RLS), no mediante filtros manuales en código de aplicación.

### 1.3 Definiciones y acrónimos
| Término | Definición |
|---|---|
| PWA | Progressive Web App |
| RLS | Row Level Security (PostgreSQL) — política de acceso a filas evaluada por la base de datos, no por la aplicación |
| SW | Service Worker |
| BG Sync | Background Sync API |
| Optimistic UI | Actualización inmediata de la interfaz antes de confirmar la respuesta del servidor |
| Termómetro de crédito | Indicador visual de uso de tarjeta (Verde/Amarillo/Rojo) |
| MSI | Meses Sin Intereses — compra a plazos con tarjeta de crédito, cuota mensual fija sin cargo por interés |
| Service Role Key | Credencial de Supabase que omite RLS; solo se usa server-side, nunca en el navegador |

### 1.4 Referencias
- ISO/IEC/IEEE 29148:2018 (Requirements Engineering)
- ISO 9241-11:2018 (Usabilidad)
- Documentación de Supabase Auth y Row Level Security
- `@supabase/ssr` para autenticación server-side en Next.js App Router

---

## 2. Descripción general

### 2.1 Perspectiva del producto
Sistema cliente-servidor con backend gestionado (BaaS):
- **Frontend:** PWA en Next.js + TypeScript + Tailwind, desplegada en Vercel.
- **Backend:** Supabase — PostgreSQL con Row Level Security, Auth (email/password), y un único endpoint HTTP propio (`/api/shortcut`, Route Handler de Next.js) para la integración con el Shortcut de iOS.
- **Persistencia:** PostgreSQL (fuente de verdad) + IndexedDB (caché local y cola offline).

### 2.2 Usuarios objetivo
Múltiples usuarios independientes (1 hoy, meta de 5–10 en mediano plazo), cada uno con su propia cuenta, sus propias tarjetas, movimientos y metas. Sin roles ni jerarquía entre usuarios — todos tienen el mismo nivel de acceso, limitado exclusivamente a sus propios datos.

### 2.3 Restricciones de diseño
- El costo de infraestructura debe mantenerse en $0 mientras el proyecto tenga ≤ 10 usuarios activos (dentro del free tier de Supabase: 500MB de base de datos, 50,000 usuarios activos/mes en Auth).
- El aislamiento entre usuarios se implementa exclusivamente mediante RLS — ninguna consulta de la aplicación debe depender de un filtro manual de `user_id` como único mecanismo de seguridad.
- El Shortcut de iOS no debe requerir que el usuario inicie sesión vía OAuth desde la app de Shortcuts; usa un token fijo + `service_role` key server-side.

### 2.4 Suposiciones y dependencias
- Cada usuario configura sus propias tarjetas (nombre, límite, día de corte, día de pago) manualmente desde la PWA tras registrarse — no hay importación automática de datos bancarios en esta versión.
- El correo de confirmación de Supabase Auth está activo antes de invitar usuarios reales (puede desactivarse temporalmente solo durante desarrollo).

---

## 3. Requisitos Funcionales (FR)

### 3.0 Módulo: Autenticación (nuevo en v2.0)
| ID | Requisito | Prioridad |
|---|---|---|
| FR-00a | El sistema debe permitir crear una cuenta con correo y contraseña (signup). | Alta |
| FR-00b | El sistema debe permitir iniciar sesión con correo y contraseña (login). | Alta |
| FR-00c | El sistema debe mantener la sesión activa entre recargas y visitas, usando cookies HTTP-only gestionadas por `@supabase/ssr`. | Alta |
| FR-00d | El sistema debe redirigir a `/login` cualquier intento de acceso a rutas del dashboard sin sesión activa. | Alta |
| FR-00e | El sistema debe permitir cerrar sesión (logout) desde cualquier vista autenticada. | Media |
| FR-00f | El sistema debe garantizar, a nivel de base de datos (RLS), que ningún usuario pueda leer o modificar filas de `tarjetas`, `movimientos`, `metas` o `compras_msi` que no le pertenezcan — independientemente de bugs en el código de la aplicación. | Alta (crítico de seguridad) |

### 3.1 Módulo: Registro Universal de Transacciones
(FR-01 a FR-08 se mantienen sin cambios respecto a v1.0 — ver comportamiento offline-first, sincronización optimista, edición y eliminación. La diferencia es de implementación: las escrituras van contra Supabase con RLS en vez de contra Google Apps Script.)

### 3.2 Módulo: Dashboard de Tarjetas de Crédito
(FR-09 a FR-14 se mantienen sin cambios conceptuales. Cambio de implementación clave: el cálculo de `gastosPeriodoActual`, `disponible`, `porcentajeUso` y `estadoTermometro` ya **no se escribe de vuelta** a ninguna tabla — se calcula en tiempo real mediante consulta a `movimientos` + `compras_msi`, ver `Architecture.md` §5.)

### 3.2b Módulo: Compras a Meses sin Intereses — MSI (nuevo en v2.0)
| ID | Requisito | Prioridad |
|---|---|---|
| FR-26 | El sistema debe permitir registrar una compra a meses sin intereses asociada a una tarjeta de crédito específica, con: Comercio, Categoría, Monto Total, Número de Meses. | Alta |
| FR-27 | El sistema debe calcular automáticamente la Cuota Mensual = Monto Total / Meses Totales (columna generada en base de datos, sin cálculo de interés). | Alta |
| FR-28 | El sistema debe calcular `fecha_ultima_cuota` sumando (Meses Totales − 1) meses a la fecha de primer cargo, aplicando el mismo criterio de "clamp" de fin de mes usado en el cálculo de periodos de corte. | Alta |
| FR-29 | El cálculo de `gastosPeriodoActual` de una tarjeta (para el termómetro de crédito) debe incluir la Cuota Mensual de cualquier compra MSI activa (fecha de hoy entre `fecha_primer_cargo` y `fecha_ultima_cuota`) asociada a esa tarjeta, ADEMÁS de los movimientos de tipo Gasto del periodo. | Alta |
| FR-30 | Las compras MSI NO deben generar una fila en `movimientos` — viven exclusivamente en la tabla `compras_msi`. | Alta |
| FR-31 | El sistema debe permitir consultar el listado de compras MSI activas por tarjeta, mostrando meses restantes. | Media |
| FR-32 | (Backlog, no bloqueante) Las cuotas de compras MSI no se reflejan automáticamente en la Analítica de Gastos por categoría — limitación aceptada conscientemente, documentada como ítem de mejora futura. | Baja |

### 3.3 Módulo: Motor de Metas y Rendimientos
El cálculo de progresos y proyecciones soporta **interés compuesto diario** (rendimientos anualizados) aplicable tanto a las metas de ahorro como a las tarjetas de débito. Un aporte a una meta actualiza únicamente `monto_actual` en la tabla `metas` — nunca genera una fila en `movimientos`, por decisión explícita del usuario.

### 3.4 Módulo: Analítica de Gastos
(FR-20 a FR-22 sin cambios respecto a v1.0, ahora consultando la tabla `movimientos` vía SQL en vez de iterar un arreglo en Apps Script.)

### 3.5 Módulo: Sincronización y Caché
(FR-23 a FR-25 sin cambios conceptuales respecto a v1.0.)

### 3.6 Módulo: Captura vía iOS Shortcuts
| ID | Requisito | Prioridad |
|---|---|---|
| FR-33 | El sistema debe exponer un único endpoint HTTP (`/api/shortcut`) que reciba el mismo payload JSON que el Shortcut de iOS ya envía hoy (`tipo, monto, categoria, comercio, metodo`, más `esMeses`/`meses` cuando aplique), validado con un token fijo (`IPHONE_SHORTCUT_TOKEN`), e inserte los datos en nombre del usuario propietario (`MY_USER_ID`) usando la `service_role key` de Supabase. | Alta |

---

## 4. Requisitos No Funcionales (NFR)

(NFR-01 a NFR-03, NFR-07, NFR-09, NFR-11 a NFR-13 se mantienen sin cambios respecto a v1.0. Los siguientes reemplazan o se agregan a los de la v1.0 en el contexto de Supabase:)

| ID | Categoría | Requisito |
|---|---|---|
| NFR-04b | Instalabilidad | (sin cambios) |
| NFR-05b | Seguridad | El aislamiento entre usuarios se implementa mediante políticas de Row Level Security en PostgreSQL, no mediante lógica de filtrado en la capa de aplicación. La `service_role key` nunca debe estar presente en código que se ejecute en el navegador ni en variables de entorno con prefijo `NEXT_PUBLIC_`. |
| NFR-06b | Mantenibilidad / Portabilidad | Toda consulta a Supabase debe pasar por `src/lib/api/` o `src/lib/finance/` — ningún componente de UI debe importar el cliente de Supabase directamente. |
| NFR-08b | Escalabilidad de datos | El sistema debe funcionar de forma aceptable con hasta 10 usuarios concurrentes y varios años de histórico de movimientos por usuario, dentro de los límites del free tier de Supabase (500MB). |
| NFR-14 | CI/CD | (sin cambios respecto a v1.0) |
| NFR-15 | Costo | La infraestructura completa (Vercel + Supabase) debe mantenerse en $0/mes mientras el número de usuarios activos sea ≤ 10 y el volumen de datos no exceda el free tier. |
| NFR-16 | Autenticación | Las contraseñas nunca se almacenan ni se procesan directamente por la aplicación — se delegan por completo a Supabase Auth. |
| NFR-17 | Aislamiento de datos | Un fallo o bug en el código de la aplicación (frontend o Route Handler) no debe poder resultar en que un usuario lea o modifique datos de otro usuario, gracias a RLS como capa de seguridad independiente del código de aplicación. |
| NFR-18 | Continuidad del Shortcut de iOS | La migración de backend no debe requerir que el usuario cambie su forma de uso del Shortcut de iOS más allá de actualizar la URL de destino y agregar el token de autenticación al payload. |

---

## 5. Criterios de aceptación de alto nivel (actualizados)
- Un usuario nuevo puede registrarse, iniciar sesión, y ver un dashboard vacío — sin poder ver datos de ningún otro usuario, ni siquiera manipulando la URL o las herramientas de desarrollador del navegador.
- Una compra MSI registrada debe reflejarse en el termómetro de crédito solo por el monto de la cuota mensual, no por el monto total, durante todos los meses en que esté activa.
- El Shortcut de iOS, apuntando a la nueva URL con el token actualizado, sigue registrando transacciones sin fricción adicional para el usuario.
- Verificación de seguridad obligatoria antes de invitar al segundo usuario real: crear dos cuentas de prueba, registrar datos en cada una, y confirmar mediante inspección directa de la base de datos (o intentos deliberados de consulta cruzada) que RLS bloquea el acceso cruzado.
