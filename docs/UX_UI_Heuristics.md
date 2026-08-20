# UX_UI_Heuristics.md
## FinTrack — Lineamientos de Diseño de Interfaz
**Versión:** 1.0

> **Nota metodológica:** Este documento NO asigna una calificación numérica ni un puntaje global de usabilidad a la interfaz. En su lugar, define **qué significa cada principio en el contexto específico de una app financiera personal** y cómo debe aplicarse en las decisiones de diseño de componentes. Cada heurística se trata de forma independiente porque los trade-offs (ej. velocidad vs. prevención de errores) son distintos según el flujo (registrar un gasto vs. crear una meta).

---

## 1. Marco de Eficacia, Eficiencia y Satisfacción (ISO 9241-11)

ISO 9241-11 define usabilidad como el grado en que un producto puede ser usado por usuarios específicos para lograr objetivos específicos con **eficacia**, **eficiencia** y **satisfacción**, en un contexto de uso determinado. Para FinTrack, el contexto de uso es: *un usuario individual, frecuentemente en movimiento (calle, tienda), con conectividad variable, tomando decisiones financieras rápidas.*

### 1.1 Eficacia (¿el usuario logra su objetivo con precisión y completitud?)
Aplicación al contexto financiero:
- El objetivo primario más frecuente es **"registrar un gasto en menos de 10 segundos"**. La eficacia se mide por la tasa de registros completados sin abandonar el formulario.
- Un registro de transacción es "eficaz" solo si los datos capturados son correctos: el diseño debe minimizar la selección incorrecta de categoría o método de pago (ej. usando el último método de pago usado como valor por defecto inteligente, no un campo vacío).
- En el Dashboard de tarjetas, la eficacia se mide por si el usuario puede responder correctamente y sin ambigüedad a la pregunta *"¿puedo gastar en esta tarjeta ahora mismo?"* solo con un vistazo.

### 1.2 Eficiencia (¿cuántos recursos —tiempo, esfuerzo cognitivo, clics— requiere lograrlo?)
Aplicación al contexto financiero:
- El formulario de "Registro Universal" debe priorizarse sobre cualquier otra pantalla: debe ser alcanzable en máximo 1 tap desde cualquier vista (ej. Floating Action Button persistente).
- Los campos deben ordenarse por frecuencia de uso real, no por orden alfabético o técnico: Monto y Categoría primero (son los que más varían), Método de pago con valor recordado por defecto.
- El teclado numérico debe invocarse automáticamente en el campo Monto (`inputmode="decimal"`), evitando cambios manuales de teclado.
- La eficiencia offline es crítica: no debe haber ninguna pantalla de carga bloqueante al registrar sin conexión; la app "miente" productivamente mostrando el dato como ya guardado (sincronización optimista).

### 1.3 Satisfacción (¿la experiencia genera confianza y una respuesta emocional positiva?)
Aplicación al contexto financiero:
- El dinero genera ansiedad; el diseño debe evitar tonos alarmistas innecesarios. El estado "Rojo" del termómetro de crédito debe comunicar urgencia sin generar pánico (tono informativo: "Te excediste del rango ideal", no "¡PELIGRO!").
- La satisfacción en el Motor de Metas debe reforzarse con microinteracciones positivas al registrar un aporte (ej. animación sutil de la barra de progreso), ya que el ahorro es un comportamiento que se busca reforzar positivamente.
- La transparencia sobre el estado de sincronización (pendiente/sincronizado) es clave para la satisfacción: la ansiedad de "¿se guardó mi gasto o no?" debe eliminarse con indicadores visuales claros y persistentes, nunca silenciosos.

---

## 2. Evaluación de las 10 Heurísticas de Jakob Nielsen aplicadas a FinTrack

Cada heurística se documenta con: **(a)** su significado general, **(b)** su aplicación específica y obligatoria en FinTrack, **(c)** un ejemplo de decisión de diseño concreta.

### H1 — Visibilidad del estado del sistema
- **Significado:** El sistema debe mantener informado al usuario sobre lo que está pasando, con retroalimentación apropiada en tiempo razonable.
- **Aplicación en FinTrack:** Dado que el backend (GAS) es lento y puede fallar, la visibilidad del estado de sincronización NO es opcional, es un requisito central. Cada transacción individual debe tener un estado visual propio: `● Sincronizado` (verde), `◐ Pendiente` (ámbar, con ícono de nube tachada), `✕ Error` (rojo, con opción de reintentar).
- **Decisión de diseño:** Badge de estado global en el header (ej. "3 pendientes de sincronizar") + indicador por ítem en la lista de movimientos recientes.

### H2 — Correspondencia entre el sistema y el mundo real
- **Significado:** El sistema debe hablar el lenguaje del usuario, con palabras, frases y conceptos familiares, no jerga técnica interna.
- **Aplicación en FinTrack:** Usar terminología bancaria/coloquial mexicana consistente con las columnas originales del Sheet: "Corte", "Fecha de pago", "Disponible" — no traducir a términos genéricos como "Ciclo de facturación". El término "Termómetro de crédito" debe usarse literalmente en la UI, ya que fue definido por el propio usuario como metáfora mental.
- **Decisión de diseño:** Los tres estados del termómetro deben usar exactamente las etiquetas provistas: "Rango ideal", "Aún puedes gastar", "Te excediste" — no reinterpretarlas.

### H3 — Control y libertad del usuario
- **Significado:** Los usuarios necesitan una "salida de emergencia" clara para deshacer acciones no deseadas.
- **Aplicación en FinTrack:** Toda transacción debe ser editable y eliminable, incluso después de sincronizada (FR-08). Si el usuario registra un gasto en la tarjeta equivocada, debe poder corregirlo sin fricción, ya que esto afecta directamente el cálculo del termómetro de crédito de dos tarjetas simultáneamente.
- **Decisión de diseño:** Swipe-to-edit / swipe-to-delete en la lista de movimientos, con confirmación solo para eliminar (no para editar).

### H4 — Consistencia y estándares
- **Significado:** Los usuarios no deben tener que preguntarse si distintas palabras, situaciones o acciones significan lo mismo.
- **Aplicación en FinTrack:** El color verde/amarillo/rojo debe usarse EXCLUSIVAMENTE para el significado de estado financiero (uso de crédito, alertas), nunca para otra categorización (ej. no usar rojo para "categoría de gasto = comida" en un gráfico, porque generaría ambigüedad semántica con el termómetro).
- **Decisión de diseño:** Definir una paleta semántica fija en el design system (Tailwind config: `credito-verde`, `credito-amarillo`, `credito-rojo`) separada de la paleta de categorías de gasto (que debe usar tonos neutros/azules/morados, nunca semáforo).

### H5 — Prevención de errores
- **Significado:** Mejor diseño que previene problemas que buenos mensajes de error.
- **Aplicación en FinTrack:** Prevenir montos inválidos (negativos, con más de 2 decimales) directamente en el input, no después del submit. Prevenir la selección de una tarjeta inexistente o inactiva en el picker de método de pago.
- **Decisión de diseño:** El campo Monto solo acepta números positivos con formato de moneda en tiempo real (máscara de input); el selector de "Método de pago" solo lista tarjetas con datos válidos en `Calc_Data`.

### H6 — Reconocimiento antes que recuerdo
- **Significado:** Minimizar la carga de memoria del usuario haciendo visibles las opciones y la información relevante.
- **Aplicación en FinTrack:** El usuario no debería tener que recordar cuánto lleva gastado en una tarjeta antes de decidir usarla: esa información (Disponible, % de uso) debe estar visible en el propio selector de método de pago del formulario de registro, no solo en el Dashboard separado.
- **Decisión de diseño:** En el dropdown de "Método de pago", cada tarjeta muestra un mini-indicador de color junto a su nombre reflejando su estado actual del termómetro.

### H7 — Flexibilidad y eficiencia de uso
- **Significado:** Aceleradores invisibles para usuarios novatos pero que agilizan la interacción para usuarios expertos.
- **Aplicación en FinTrack:** Dado que es una app de uso diario y personal (usuario experto desde el día 1), se deben ofrecer atajos: registro rápido con valores por defecto memorizados (última categoría/método usados por comercio), y posibilidad de "duplicar" una transacción anterior.
- **Decisión de diseño:** Autocompletar Categoría según el histórico de un mismo texto en "Comercio/Descripción" (ej. escribir "Oxxo" sugiere automáticamente categoría "Conveniencia").

### H8 — Diseño estético y minimalista
- **Significado:** Las interfaces no deben contener información irrelevante o raramente necesaria.
- **Aplicación en FinTrack:** El Dashboard principal debe priorizar jerárquicamente: 1) Termómetros de tarjetas, 2) Resumen de metas, 3) Analítica. La analítica detallada (gráficos semestrales) no debe competir visualmente en la vista principal; debe vivir en una sección secundaria.
- **Decisión de diseño:** Dashboard "at a glance" con máximo 2 scrolls de altura de pantalla en móvil; gráficos de tendencia detallados en una ruta/tab separada (`/analitica`).

### H9 — Ayudar a los usuarios a reconocer, diagnosticar y recuperarse de errores
- **Significado:** Los mensajes de error deben expresarse en lenguaje claro (sin códigos), indicar el problema con precisión y sugerir una solución.
- **Aplicación en FinTrack:** Un fallo de sincronización con Google Sheets no debe mostrar errores técnicos ("Error 500" o "fetch failed"). Debe explicar la implicación real: "No se pudo guardar en la nube todavía. Tu gasto está a salvo en este dispositivo y se enviará automáticamente."
- **Decisión de diseño:** Componente de Toast/Snackbar con mensaje humano + acción "Reintentar ahora" para errores de sincronización.

### H10 — Ayuda y documentación
- **Significado:** Aunque lo ideal es que el sistema se use sin documentación, debe proveerse ayuda contextual cuando sea necesaria.
- **Aplicación en FinTrack:** Los cálculos financieros (proyección de metas, periodo de corte) no son obvios para todos los usuarios. Se debe ofrecer ayuda contextual breve (tooltip/ícono "i") junto a campos como "Rendimiento Anual" o "Día de Corte", explicando su efecto en el cálculo, sin requerir salir del flujo.
- **Decisión de diseño:** Ícono de información inline (no un manual separado) que despliega un popover breve con el criterio de cálculo exacto (ej. "El progreso se calcula considerando interés compuesto mensual").

---

## 3. Principios adicionales específicos del dominio financiero

Estos no forman parte de las heurísticas clásicas de Nielsen, pero son necesarios dado que es una app de finanzas personales:

1. **Nunca ocultar el signo de una operación.** Todo monto debe llevar prefijo visual claro (+ para ingreso, - para gasto) independientemente del color, para accesibilidad (daltonismo).
2. **Reversibilidad financiera visible.** El usuario debe poder ver claramente el efecto de una acción sobre sus números antes de confirmarla quando el impacto es significativo (ej. al crear una meta con un aporte inicial alto, mostrar cómo afecta su disponible general si aplica).
3. **No usar dark patterns de ningún tipo** (ej. no ocultar el botón de "cancelar aporte" o dificultar la eliminación de una transacción), dado que es una herramienta de control personal, no un producto con métricas de retención comercial.
