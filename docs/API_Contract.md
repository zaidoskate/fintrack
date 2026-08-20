# API_Contract.md
## FinTrack — Contrato de API (Google Apps Script Web App)
**Versión:** 1.0

---

## 0. Convenciones generales

- **Base URL:** `https://script.google.com/macros/s/{SCRIPT_ID}/exec`
- **Formato:** JSON en request y response.
- **Autenticación:** Todos los endpoints requieren un parámetro `token` (query string en GET, campo en el body en POST). El script debe rechazar con `401` si el token no coincide con el configurado en `PropertiesService`.
- **Content-Type recomendado para POST:** `text/plain;charset=utf-8` desde el cliente (para evitar preflight CORS con Apps Script), parseado manualmente como JSON en `doPost(e.postData.contents)`.
- **Formato de fecha:** ISO 8601 (`YYYY-MM-DD`) para fechas, `HH:mm` para horas, en UTC-6 (hora de México) o con offset explícito.
- **Formato de respuesta estándar (envelope):**

```json
{
  "success": true,
  "data": { },
  "error": null,
  "timestamp": "2026-08-19T10:00:00-06:00"
}
```

En caso de error:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token de autenticación inválido o ausente."
  },
  "timestamp": "2026-08-19T10:00:00-06:00"
}
```

---

## 1. `GET /movimientos`

Obtiene el listado de transacciones. Debe soportar filtros por rango de fecha para evitar cargar todo el histórico (NFR-08).

### Query params
| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `token` | string | Sí | Token de autenticación |
| `resource` | string | Sí | Debe ser `"movimientos"` |
| `desde` | string (YYYY-MM-DD) | No | Filtra movimientos desde esta fecha (inclusive) |
| `hasta` | string (YYYY-MM-DD) | No | Filtra movimientos hasta esta fecha (inclusive) |
| `metodoPago` | string | No | Filtra por método de pago específico (ej. nombre de tarjeta) |
| `limit` | number | No | Máximo de registros a devolver (default 200) |

### Ejemplo de request
```
GET /exec?resource=movimientos&token=XXXX&desde=2026-08-01&hasta=2026-08-31&limit=100
```

### Respuesta (200 OK)
```json
{
  "success": true,
  "data": {
    "movimientos": [
      {
        "id": "row_142",
        "fecha": "2026-08-15",
        "hora": "14:32",
        "tipo": "Gasto",
        "monto": 250.00,
        "categoria": "Comida",
        "comercio": "Starbucks Reforma",
        "metodoPago": "BBVA Platino"
      },
      {
        "id": "row_141",
        "fecha": "2026-08-14",
        "hora": "09:10",
        "tipo": "Ingreso",
        "monto": 15000.00,
        "categoria": "Nómina",
        "comercio": "Clever Cloud",
        "metodoPago": "Efectivo"
      }
    ],
    "totalRegistros": 2,
    "hayMas": false
  },
  "error": null,
  "timestamp": "2026-08-19T10:00:00-06:00"
}
```

**Nota de implementación:** el campo `id` debe derivarse de forma determinística del número de fila real en la hoja (`row_{rowIndex}`), ya que se usa posteriormente para operaciones de edición/eliminación.

---

## 2. `POST /transaccion`

Crea una nueva transacción. También debe soportar edición y eliminación mediante el campo `accion`.

### Body (crear)
```json
{
  "token": "XXXX",
  "resource": "transaccion",
  "accion": "crear",
  "clientTempId": "temp_a1b2c3",
  "payload": {
    "fecha": "2026-08-19",
    "hora": "18:45",
    "tipo": "Gasto",
    "monto": 89.50,
    "categoria": "Transporte",
    "comercio": "Uber",
    "metodoPago": "Efectivo"
  }
}
```

- `clientTempId`: generado en el cliente (UUID) para que el frontend pueda reconciliar la respuesta con el registro optimista insertado localmente.

### Body (editar)
```json
{
  "token": "XXXX",
  "resource": "transaccion",
  "accion": "editar",
  "id": "row_142",
  "payload": {
    "monto": 275.00,
    "categoria": "Comida"
  }
}
```

### Body (eliminar)
```json
{
  "token": "XXXX",
  "resource": "transaccion",
  "accion": "eliminar",
  "id": "row_142"
}
```

### Respuesta (200 OK — creación)
```json
{
  "success": true,
  "data": {
    "id": "row_143",
    "clientTempId": "temp_a1b2c3",
    "movimiento": {
      "id": "row_143",
      "fecha": "2026-08-19",
      "hora": "18:45",
      "tipo": "Gasto",
      "monto": 89.50,
      "categoria": "Transporte",
      "comercio": "Uber",
      "metodoPago": "Efectivo"
    },
    "impactoTarjeta": {
      "metodoPago": "Efectivo",
      "aplicaTarjeta": false
    }
  },
  "error": null,
  "timestamp": "2026-08-19T18:45:03-06:00"
}
```

Si `metodoPago` corresponde a una tarjeta de `Calc_Data`, `impactoTarjeta.aplicaTarjeta` debe ser `true` y debe incluir el nuevo `disponible` recalculado, para que el cliente pueda reconciliar el termómetro sin esperar un segundo fetch:

```json
"impactoTarjeta": {
  "metodoPago": "BBVA Platino",
  "aplicaTarjeta": true,
  "gastosPeriodoActual": 4250.00,
  "disponible": 5750.00,
  "porcentajeUso": 42.5
}
```

### Respuesta (400/401/500)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El campo 'monto' debe ser un número positivo."
  },
  "timestamp": "2026-08-19T18:45:03-06:00"
}
```

**Códigos de error sugeridos:** `INVALID_TOKEN`, `VALIDATION_ERROR`, `NOT_FOUND` (para editar/eliminar un id inexistente), `SHEET_LOCKED` (si `LockService` no pudo adquirir el lock a tiempo), `INTERNAL_ERROR`.

---

## 3. `GET /tarjetas`

Obtiene el estado calculado de todas las tarjetas registradas en `Calc_Data`.

### Query params
| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `token` | string | Sí | Token de autenticación |
| `resource` | string | Sí | Debe ser `"tarjetas"` |

### Respuesta (200 OK)
```json
{
  "success": true,
  "data": {
    "tarjetas": [
      {
        "nombre": "BBVA Platino",
        "limite": 10000.00,
        "gastosPeriodoActual": 4250.00,
        "disponible": 5750.00,
        "porcentajeUso": 42.5,
        "estadoTermometro": "amarillo",
        "etiquetaEstado": "Aún puedes gastar",
        "diaCorte": 20,
        "diaPago": 5,
        "proximoCorte": "2026-08-20",
        "proximoPago": "2026-09-05",
        "diasParaPago": 17
      },
      {
        "nombre": "Santander Free",
        "limite": 5000.00,
        "gastosPeriodoActual": 4800.00,
        "disponible": 200.00,
        "porcentajeUso": 96.0,
        "estadoTermometro": "rojo",
        "etiquetaEstado": "Te excediste",
        "diaCorte": 3,
        "diaPago": 18,
        "proximoCorte": "2026-09-03",
        "proximoPago": "2026-09-18",
        "diasParaPago": 30
      }
    ],
    "umbrales": {
      "verde": { "max": 30 },
      "amarillo": { "min": 31, "max": 70 },
      "rojo": { "min": 71 }
    }
  },
  "error": null,
  "timestamp": "2026-08-19T10:00:00-06:00"
}
```

**Nota:** el backend calcula `estadoTermometro` server-side para mantener una única fuente de verdad de la lógica de negocio (evita divergencia entre cliente y servidor), pero el cliente debe poder replicar el mismo cálculo localmente para la sincronización optimista (ver Architecture.md §7).

---

## 4. `GET /metas`

Obtiene las metas de ahorro con su progreso y proyección calculada.

### Query params
| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `token` | string | Sí | Token de autenticación |
| `resource` | string | Sí | Debe ser `"metas"` |

### Respuesta (200 OK)
```json
{
  "success": true,
  "data": {
    "metas": [
      {
        "id": "meta_01",
        "nombre": "Laptop nueva",
        "costoObjetivo": 25000.00,
        "montoActual": 12500.00,
        "progreso": 50.0,
        "rendimientoAnual": 8.5,
        "proyeccion": {
          "aportesMensualesPromedio": 1500.00,
          "mesesEstimadosSinRendimiento": 8,
          "mesesEstimadosConRendimiento": 7,
          "fechaEstimadaCumplimiento": "2027-03-19"
        }
      }
    ]
  },
  "error": null,
  "timestamp": "2026-08-19T10:00:00-06:00"
}
```

---

## 5. `POST /meta` (complementario, requerido por FR-15/FR-18)

No solicitado explícitamente en el enunciado original, pero necesario para completar el CRUD de metas descrito en el SRS. Se documenta aquí por completitud del contrato.

### Body (crear)
```json
{
  "token": "XXXX",
  "resource": "meta",
  "accion": "crear",
  "payload": {
    "nombre": "Fondo de emergencia",
    "costoObjetivo": 50000.00,
    "montoActual": 0,
    "rendimientoAnual": 9.0
  }
}
```

### Body (aportar)
```json
{
  "token": "XXXX",
  "resource": "meta",
  "accion": "aportar",
  "id": "meta_01",
  "payload": {
    "monto": 1500.00
  }
}
```

### Body (editar / eliminar)
Mismo patrón que en `/transaccion`: `accion: "editar" | "eliminar"`, con `id` obligatorio.

### Respuesta (200 OK)
```json
{
  "success": true,
  "data": {
    "meta": {
      "id": "meta_01",
      "nombre": "Fondo de emergencia",
      "costoObjetivo": 50000.00,
      "montoActual": 1500.00,
      "progreso": 3.0,
      "rendimientoAnual": 9.0
    }
  },
  "error": null,
  "timestamp": "2026-08-19T10:00:00-06:00"
}
```

---

## 6. Resumen de endpoints

| Método | Endpoint lógico | `resource` | Propósito |
|---|---|---|---|
| GET | `/movimientos` | `movimientos` | Listar transacciones (con filtros de fecha) |
| POST | `/transaccion` | `transaccion` | Crear / editar / eliminar transacción |
| GET | `/tarjetas` | `tarjetas` | Estado calculado de tarjetas de crédito |
| GET | `/metas` | `metas` | Listar metas con progreso y proyección |
| POST | `/meta` | `meta` | Crear / editar / eliminar / aportar a una meta |

> Todos los endpoints reales se implementan sobre una única URL de Web App (`doGet` / `doPost`), enrutados internamente por el parámetro `resource`, ya que Google Apps Script no permite definir múltiples rutas HTTP nativas.
