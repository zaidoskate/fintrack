# Software Requirements Specification (SRS)
## PWA de Finanzas Personales — "FinTrack"
**Basado libremente en ISO/IEC/IEEE 29148:2018**
**Versión:** 1.0
**Estado:** Draft para desarrollo inicial (Antigravity IDE)

---

## 1. Introducción

### 1.1 Propósito
Este documento especifica los requisitos funcionales y no funcionales para el desarrollo de una Progressive Web App (PWA) de gestión de finanzas personales. La aplicación reemplaza el uso manual de una hoja de cálculo (Google Sheets) por una interfaz optimizada, con capacidades offline-first, sincronización optimista y análisis financiero en tiempo real.

### 1.2 Alcance del producto
El sistema, denominado **FinTrack**, permitirá al usuario:
- Registrar transacciones financieras (ingresos/gastos) de forma rápida, incluso sin conexión a internet.
- Monitorear el uso de tarjetas de crédito respecto a sus fechas de corte y límites.
- Definir y rastrear metas de ahorro con proyecciones basadas en rendimiento anual.
- Visualizar tendencias de gasto por categoría a lo largo del tiempo.

El backend NO es una base de datos tradicional; es un **Google Apps Script (GAS)** que actúa como capa de API RESTful sobre un Google Sheet existente, por lo que el sistema debe diseñarse asumiendo alta latencia (1–3s) y ausencia de transacciones ACID nativas.

### 1.3 Definiciones y acrónimos
| Término | Definición |
|---|---|
| PWA | Progressive Web App |
| GAS | Google Apps Script |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| SW | Service Worker |
| BG Sync | Background Sync API |
| Optimistic UI | Actualización inmediata de la interfaz antes de confirmar la respuesta del servidor |
| Termómetro de crédito | Indicador visual de uso de tarjeta (Verde/Amarillo/Rojo) |

### 1.4 Referencias
- ISO/IEC/IEEE 29148:2018 (Requirements Engineering)
- ISO 9241-11:2018 (Usabilidad)
- Google Apps Script Web Apps documentation
- Service Worker / Background Sync API (W3C)

---

## 2. Descripción general

### 2.1 Perspectiva del producto
Sistema standalone, cliente-servidor desacoplado:
- **Frontend:** PWA en Next.js/Vue.js + TypeScript + Tailwind, desplegada en Vercel.
- **Backend:** Google Apps Script publicado como Web App (doGet/doPost), actuando como middleware entre el frontend y Google Sheets.
- **Persistencia:** Google Sheets (fuente de verdad remota) + IndexedDB (persistencia local para modo offline y caché).

### 2.2 Usuarios objetivo
Usuario único (uso personal), sin multiusuario en la v1. No se requiere sistema de roles, pero sí un mecanismo de autenticación básica (token) para proteger el endpoint de GAS.

### 2.3 Restricciones de diseño
- Google Apps Script tiene cuotas de ejecución y latencia variable (1–3s por request).
- Google Sheets no soporta bloqueos de fila concurrentes de forma nativa; el diseño debe minimizar condiciones de carrera.
- La app debe funcionar en condiciones de red inestable (offline-first obligatorio para el registro de transacciones).

### 2.4 Suposiciones y dependencias
- El usuario mantiene la estructura de las hojas (`Movimientos`, `Calc_Data`, `Metas de Ahorro`, `Análisis de Gastos`) sin alterar el orden de columnas.
- Existe un despliegue de GAS con un `SCRIPT_URL` público protegido por token compartido.

---

## 3. Requisitos Funcionales (FR)

### 3.1 Módulo: Registro Universal de Transacciones
| ID | Requisito | Prioridad |
|---|---|---|
| FR-01 | El sistema debe permitir registrar una transacción con: Fecha, Hora, Tipo (Gasto/Ingreso), Monto, Categoría, Comercio/Descripción, Método de pago. | Alta |
| FR-02 | El formulario de registro debe auto-completar Fecha y Hora con el valor actual del dispositivo, editable manualmente. | Media |
| FR-03 | El sistema debe permitir seleccionar el Método de pago desde una lista que incluya efectivo y las tarjetas configuradas en `Calc_Data`. | Alta |
| FR-04 | Si el dispositivo está sin conexión, el sistema debe encolar la transacción en IndexedDB y mostrarla en la UI con un estado visual "Pendiente de sincronización". | Alta |
| FR-05 | El sistema debe reintentar automáticamente el envío de transacciones encoladas cuando detecte que la red se restableció (Background Sync). | Alta |
| FR-06 | El sistema debe aplicar Sincronización Optimista: la transacción debe reflejarse en el dashboard y en los cálculos (saldo disponible, gasto por categoría) de forma inmediata, antes de la confirmación del servidor. | Alta |
| FR-07 | Si el servidor rechaza o falla una transacción previamente optimista, el sistema debe revertir el estado local y notificar al usuario. | Alta |
| FR-08 | El sistema debe permitir edición y eliminación de una transacción existente (si la latencia y el modelo de datos de GAS lo permiten mediante un ID/rowIndex único). | Media |

### 3.2 Módulo: Dashboard de Tarjetas de Crédito
| ID | Requisito | Prioridad |
|---|---|---|
| FR-09 | El sistema debe mostrar, por cada tarjeta registrada en `Calc_Data`, el Límite, Gastos acumulados del periodo actual y Disponible. | Alta |
| FR-10 | El sistema debe calcular el porcentaje de uso = (Gastos / Límite) × 100. | Alta |
| FR-11 | El sistema debe representar visualmente el porcentaje de uso mediante un "Termómetro de crédito" con tres estados: Verde ("Rango ideal", uso ≤ 30%), Amarillo ("Aún puedes gastar", uso 31–70%), Rojo ("Te excediste", uso > 70%). Los umbrales deben ser configurables. | Alta |
| FR-12 | El sistema debe calcular el periodo de corte vigente usando "Día de Corte" y determinar "Próximo Corte" y "Próximo Pago" automáticamente si no están presentes o están desactualizados. | Alta |
| FR-13 | El sistema debe filtrar y sumar únicamente los movimientos de tipo Gasto asociados a esa tarjeta dentro del periodo de corte vigente. | Alta |
| FR-14 | El sistema debe alertar visualmente cuando falten ≤ 5 días para la fecha de pago. | Media |

### 3.3 Módulo: Motor de Metas y Rendimientos
| ID | Requisito | Prioridad |
|---|---|---|
| FR-15 | El sistema debe permitir CRUD completo de Metas de Ahorro: Nombre, Costo Objetivo, Monto Actual, Rendimiento Anual. | Alta |
| FR-16 | El sistema debe calcular el Progreso (%) = (Monto Actual / Costo Objetivo) × 100. | Alta |
| FR-17 | El sistema debe calcular una proyección de tiempo estimado (en meses) para alcanzar el Costo Objetivo, considerando aportes recurrentes (si se configuran) y el interés compuesto derivado del Rendimiento Anual. | Alta |
| FR-18 | El sistema debe permitir registrar aportes manuales a una meta, actualizando el Monto Actual. | Alta |
| FR-19 | El sistema debe mostrar una comparación entre "tiempo estimado sin rendimiento" vs. "tiempo estimado con rendimiento aplicado" para visibilizar el beneficio del interés. | Baja |

### 3.4 Módulo: Analítica de Gastos
| ID | Requisito | Prioridad |
|---|---|---|
| FR-20 | El sistema debe generar un gráfico de tendencia de gastos mensuales agrupados por categoría, a partir de `Análisis de Gastos` o calculado en el cliente desde `Movimientos`. | Alta |
| FR-21 | El sistema debe permitir alternar la vista de analítica entre rango mensual y semestral. | Media |
| FR-22 | El sistema debe mostrar el top N de categorías con mayor gasto en el periodo seleccionado. | Media |

### 3.5 Módulo: Sincronización y Caché
| ID | Requisito | Prioridad |
|---|---|---|
| FR-23 | El sistema debe cachear las respuestas de lectura (GET) usando un gestor de estado de servidor (ej. React Query / TanStack Query) con estrategia `stale-while-revalidate`. | Alta |
| FR-24 | El sistema debe exponer un indicador global de estado de sincronización (sincronizado / sincronizando / pendiente / error). | Media |
| FR-25 | El sistema debe permitir refresco manual (pull-to-refresh o botón) que invalide la caché y fuerce un refetch. | Baja |

---

## 4. Requisitos No Funcionales (NFR)

| ID | Categoría | Requisito |
|---|---|---|
| NFR-01 | Rendimiento percibido | El tiempo entre la acción del usuario (ej. guardar transacción) y la actualización visual de la UI debe ser < 100ms, independientemente de la latencia real del backend (Optimistic UI). |
| NFR-02 | Disponibilidad offline | El registro de transacciones y la consulta de datos previamente cacheados deben funcionar al 100% sin conexión a internet. |
| NFR-03 | Resiliencia de red | El sistema debe reintentar automáticamente peticiones fallidas con backoff exponencial, hasta un máximo configurable de intentos. |
| NFR-04 | Instalabilidad | La app debe cumplir los criterios de instalación PWA (manifest.json, Service Worker registrado, ícono, HTTPS) para ser instalable en Android/iOS/Desktop. |
| NFR-05 | Seguridad | Las peticiones al Web App de GAS deben incluir un token de autenticación en el header o body; el script debe rechazar peticiones sin token válido. |
| NFR-06 | Portabilidad | El frontend debe ser agnóstico a cambios menores en el backend: toda comunicación con GAS debe pasar por una capa de abstracción (`/lib/api`), nunca invocada directamente desde componentes de UI. |
| NFR-07 | Mantenibilidad | El código debe seguir un linting estricto (ESLint + Prettier) validado en CI antes de cada despliegue. |
| NFR-08 | Escalabilidad de datos | El sistema debe funcionar de forma aceptable con un histórico de hasta 10,000 filas en `Movimientos` sin degradar el tiempo de carga inicial (uso de paginación o rangos de fecha en las consultas GET). |
| NFR-09 | Accesibilidad | La interfaz debe cumplir un nivel razonable de WCAG 2.1 AA (contraste de color, navegación por teclado, etiquetas ARIA en formularios). |
| NFR-10 | Consistencia de datos | Ante conflicto entre una escritura optimista y el estado real del servidor, el servidor siempre es la fuente de verdad final (reconciliación post-sync). |
| NFR-11 | Compatibilidad | Soporte para las últimas 2 versiones de Chrome, Safari (iOS) y Edge. Background Sync debe tener fallback (polling manual) en navegadores sin soporte (ej. Safari/iOS). |
| NFR-12 | Observabilidad | Los errores de sincronización con GAS deben quedar registrados (log local + consola) con timestamp y payload para depuración. |
| NFR-13 | Internacionalización de formato | Montos y fechas deben formatearse en locale `es-MX` (moneda MXN, formato de fecha dd/mm/aaaa). |
| NFR-14 | CI/CD | Todo push a `main` debe ejecutar lint + format check antes de permitir el build de Vercel; un fallo en CI debe bloquear el despliegue. |

---

## 5. Criterios de aceptación de alto nivel
- Una transacción registrada offline debe aparecer en Google Sheets automáticamente al recuperar la señal, sin intervención manual del usuario.
- El termómetro de crédito debe reflejar el color correcto de forma consistente con los umbrales definidos, verificable con datos de prueba.
- La proyección de metas debe coincidir (± redondeo) con el cálculo manual de interés compuesto para un caso de prueba fijo.
- El pipeline de CI debe fallar visiblemente si se introduce código con errores de lint.
