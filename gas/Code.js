// ============================================================
// FinTrack — Google Apps Script Backend · Code.js
// Versión: 2.0  |  Contrato: docs/API_Contract.md v1.0
// ============================================================

// ── 1. CONFIG ────────────────────────────────────────────────
var TZ = "GMT-6";   // Hora central México
var DATE_FMT = "yyyy-MM-dd";
var TIME_FMT = "HH:mm";

// Nombres exactos de hojas en el Spreadsheet
var SH = {
    movimientos: "Movimientos",
    calcData: "Calc_Data",
    metas: "Metas"
};

// Umbrales del semáforo de tarjetas (%)
var UMBRALES = { verde: 30, rojo: 71 };

// Índices de columna de Calc_Data (base-1, fila 1 = header)
// A=Tarjeta B=Límite C=Gastos D=Disponible E=DíaCorte F=DíaPago
// G=PróximoCorte H=PróximoPago I=%Gastado J=EstadoGasto K=RangoIdeal
var CD = {
    nombre: 1, limite: 2, gastos: 3, disponible: 4,
    diaCorte: 5, diaPago: 6, proxCorte: 7, proxPago: 8,
    pctGastado: 9, estado: 10, rangoIdeal: 11
};

// ── 2. UTILIDADES DE RESPUESTA ───────────────────────────────

function getTs() {
    return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss") + "-06:00";
}

function resp(data) {
    return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: data, error: null, timestamp: getTs() }))
        .setMimeType(ContentService.MimeType.JSON);
}

function respErr(code, message) {
    return ContentService
        .createTextOutput(JSON.stringify({ success: false, data: null, error: { code: code, message: message }, timestamp: getTs() }))
        .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sh) throw new Error("Hoja '" + name + "' no encontrada. Verifica el nombre exactamente.");
    return sh;
}

// ── 3. AUTENTICACIÓN ─────────────────────────────────────────

function validateToken(token) {
    var stored = PropertiesService.getScriptProperties().getProperty("AUTH_TOKEN");
    if (!stored || token !== stored) throw { tokenError: true };
}

// ── 4. ENTRY POINTS ─────────────────────────────────────────

function doGet(e) {
    try {
        var p = e.parameter || {};
        var resource = p.resource;
        validateToken(p.token);
        switch (resource) {
            case "movimientos": return getMovimientos(p);
            case "tarjetas": return getTarjetas();
            case "metas": return getMetas();
            default:
                return respErr("UNKNOWN_RESOURCE", "Resource desconocido: '" + resource + "'.");
        }
    } catch (err) {
        if (err && err.tokenError) return respErr("INVALID_TOKEN", "Token de autenticación inválido o ausente.");
        return respErr("INTERNAL_ERROR", err.toString());
    }
}

function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        // Rama legacy: iOS Shortcut (sin token, sin resource)
        if (!data.resource) return legacyDoPost(data);
        // Rama nueva: API con token
        validateToken(data.token);
        switch (data.resource) {
            case "transaccion": return routeTransaccion(data);
            case "meta": return routeMeta(data);
            default:
                return respErr("UNKNOWN_RESOURCE", "Resource desconocido: '" + data.resource + "'.");
        }
    } catch (err) {
        if (err && err.tokenError) return respErr("INVALID_TOKEN", "Token de autenticación inválido o ausente.");
        return respErr("INTERNAL_ERROR", err.toString());
    }
}

// ── 5. LEGACY — iOS Shortcut ─────────────────────────────────
// Payload: { tipo, monto, categoria, comercio, metodo }
// Respuesta compatible original: { status, fila_agregada }

function legacyDoPost(data) {
    // FIX: getActiveSheet() → getSheetByName("Movimientos")
    var sheet = getSheet(SH.movimientos);
    var date = new Date();
    var montoLimpio = data.monto.toString().replace(/[^0-9.,]/g, "");
    var monto = parseFloat(montoLimpio.replace(",", ".")) || 0;
    var row = [
        Utilities.formatDate(date, TZ, DATE_FMT),
        Utilities.formatDate(date, TZ, TIME_FMT),
        data.tipo || "Gasto",
        monto,
        data.categoria || "Sin categoría",
        data.comercio || "N/A",
        data.metodo || "Efectivo"
    ];
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try { sheet.appendRow(row); } finally { lock.releaseLock(); }
    return ContentService
        .createTextOutput(JSON.stringify({ status: "success", fila_agregada: row }))
        .setMimeType(ContentService.MimeType.JSON);
}

// ── 6. GET /movimientos ──────────────────────────────────────

function getMovimientos(params) {
    var sheet = getSheet(SH.movimientos);
    var data = sheet.getDataRange().getValues();
    var result = [];
    var desde = params.desde ? new Date(params.desde + "T00:00:00") : null;
    var hasta = params.hasta ? new Date(params.hasta + "T23:59:59") : null;
    var metF = params.metodoPago ? params.metodoPago.toLowerCase() : null;
    var limit = params.limit ? parseInt(params.limit, 10) : 200;

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[0] && !row[3]) continue;
        var fechaD = (row[0] instanceof Date) ? row[0] : new Date(row[0] + "T00:00:00");
        if (desde && fechaD < desde) continue;
        if (hasta && fechaD > hasta) continue;
        if (metF && (row[6] || "").toString().toLowerCase() !== metF) continue;
        result.push(rowToMovimiento(row, i + 1));
        if (result.length >= limit) break;
    }
    return resp({ movimientos: result, totalRegistros: result.length, hayMas: result.length === limit });
}

function rowToMovimiento(row, rowIndex) {
    var fechaS = (row[0] instanceof Date) ? Utilities.formatDate(row[0], TZ, DATE_FMT) : row[0].toString();
    var horaV = row[1];
    var horaS = (horaV instanceof Date) ? Utilities.formatDate(horaV, TZ, TIME_FMT) : horaV.toString().substring(0, 5);
    return {
        id: "row_" + rowIndex, fecha: fechaS, hora: horaS,
        tipo: row[2] || "Gasto", monto: parseFloat(row[3]) || 0,
        categoria: row[4] || "", comercio: row[5] || "", metodoPago: row[6] || ""
    };
}

// ── 7. GET /tarjetas ─────────────────────────────────────────

function getTarjetas() {
    var cdSheet = getSheet(SH.calcData);
    var cdData = cdSheet.getDataRange().getValues();
    var movSheet = getSheet(SH.movimientos);
    var movData = movSheet.getDataRange().getValues();
    var hoy = new Date();
    var tarjetas = [];

    for (var i = 1; i < cdData.length; i++) {
        var cdRow = cdData[i];
        var nombre = (cdRow[0] || "").toString().trim();
        if (!nombre) continue;

        var limite = parseFloat(cdRow[1]) || 0;
        var diaCorte = parseInt(cdRow[4], 10) || 1;
        var diaPago = parseInt(cdRow[5], 10) || 1;

        var periodo = getPeriodoVigente(diaCorte, hoy);
        var proxCorte = periodo.proximoCorte;
        var proxPagoD = calcProxPago(proxCorte, diaPago);
        var diasParaPago = Math.ceil((proxPagoD - hoy) / 86400000);

        var gastosPeriodo = 0;
        for (var j = 1; j < movData.length; j++) {
            var mov = movData[j];
            if (!mov[3]) continue;
            if ((mov[6] || "").toString().trim().toLowerCase() !== nombre.toLowerCase()) continue;
            if ((mov[2] || "").toString().trim() !== "Gasto") continue;
            var mf = (mov[0] instanceof Date) ? mov[0] : new Date(mov[0] + "T00:00:00");
            if (mf < periodo.inicio || mf > periodo.fin) continue;
            gastosPeriodo += parseFloat(mov[3]) || 0;
        }
        gastosPeriodo = Math.round(gastosPeriodo * 100) / 100;
        var disponible = Math.round((limite - gastosPeriodo) * 100) / 100;
        var pctUso = limite > 0 ? Math.round((gastosPeriodo / limite) * 1000) / 10 : 0;
        var termometro = pctUso <= UMBRALES.verde ? "verde" : pctUso < UMBRALES.rojo ? "amarillo" : "rojo";
        var etiqueta = termometro === "verde" ? "Todo bien"
            : termometro === "amarillo" ? "Aún puedes gastar"
                : pctUso >= 100 ? "Te excediste" : "Límite casi alcanzado";

        var proxCorteStr = Utilities.formatDate(proxCorte, TZ, DATE_FMT);
        var proxPagoStr = Utilities.formatDate(proxPagoD, TZ, DATE_FMT);

        // Actualizar columnas calculadas en Calc_Data
        var sr = i + 1;
        cdSheet.getRange(sr, CD.gastos).setValue(gastosPeriodo);
        cdSheet.getRange(sr, CD.disponible).setValue(disponible);
        cdSheet.getRange(sr, CD.proxCorte).setValue(proxCorteStr);
        cdSheet.getRange(sr, CD.proxPago).setValue(proxPagoStr);
        cdSheet.getRange(sr, CD.pctGastado).setValue(pctUso);
        cdSheet.getRange(sr, CD.estado).setValue(etiqueta);

        tarjetas.push({
            nombre: nombre, limite: limite,
            gastosPeriodoActual: gastosPeriodo, disponible: disponible,
            porcentajeUso: pctUso, estadoTermometro: termometro, etiquetaEstado: etiqueta,
            diaCorte: diaCorte, diaPago: diaPago,
            proximoCorte: proxCorteStr, proximoPago: proxPagoStr, diasParaPago: diasParaPago
        });
    }

    return resp({
        tarjetas: tarjetas,
        umbrales: { verde: { max: 30 }, amarillo: { min: 31, max: 70 }, rojo: { min: 71 } }
    });
}

// ── 8. POST /transaccion ─────────────────────────────────────

function routeTransaccion(data) {
    switch ((data.accion || "").toLowerCase()) {
        case "crear": return crearTransaccion(data);
        case "editar": return editarTransaccion(data);
        case "eliminar": return eliminarTransaccion(data);
        default:
            return respErr("VALIDATION_ERROR", "accion inválida: '" + data.accion + "'. Valores: crear, editar, eliminar.");
    }
}

function crearTransaccion(data) {
    var p = data.payload || {};
    var monto = parseFloat(p.monto);
    if (isNaN(monto) || monto <= 0) return respErr("VALIDATION_ERROR", "El campo 'monto' debe ser un número positivo.");
    if (!p.tipo) return respErr("VALIDATION_ERROR", "El campo 'tipo' es requerido.");

    var hoy = new Date();
    var fecha = p.fecha || Utilities.formatDate(hoy, TZ, DATE_FMT);
    var hora = p.hora || Utilities.formatDate(hoy, TZ, TIME_FMT);
    var row = [fecha, hora, p.tipo || "Gasto", monto,
        p.categoria || "Sin categoría", p.comercio || "N/A", p.metodoPago || "Efectivo"];

    var sheet = getSheet(SH.movimientos);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return respErr("SHEET_LOCKED", "No se pudo adquirir el lock. Intenta de nuevo.");
    try { sheet.appendRow(row); } finally { lock.releaseLock(); }

    var id = "row_" + sheet.getLastRow();
    var movimiento = {
        id: id, fecha: fecha, hora: hora, tipo: row[2], monto: monto,
        categoria: row[4], comercio: row[5], metodoPago: row[6]
    };
    return resp({
        id: id, clientTempId: data.clientTempId || null,
        movimiento: movimiento, impactoTarjeta: calcImpactoTarjeta(row[6], row[2])
    });
}

function editarTransaccion(data) {
    var rowIndex = parseRowId(data.id || "");
    if (!rowIndex) return respErr("VALIDATION_ERROR", "id inválido. Formato esperado: 'row_N'.");
    var sheet = getSheet(SH.movimientos);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return respErr("SHEET_LOCKED", "No se pudo adquirir el lock.");
    try {
        var existing = sheet.getRange(rowIndex, 1, 1, 7).getValues()[0];
        if (!existing[0] && !existing[3]) return respErr("NOT_FOUND", "Transacción '" + data.id + "' no encontrada.");
        var p = data.payload || {};
        var nr = [
            p.fecha !== undefined ? p.fecha : existing[0],
            p.hora !== undefined ? p.hora : existing[1],
            p.tipo !== undefined ? p.tipo : existing[2],
            p.monto !== undefined ? parseFloat(p.monto) : existing[3],
            p.categoria !== undefined ? p.categoria : existing[4],
            p.comercio !== undefined ? p.comercio : existing[5],
            p.metodoPago !== undefined ? p.metodoPago : existing[6]
        ];
        sheet.getRange(rowIndex, 1, 1, 7).setValues([nr]);
    } finally { lock.releaseLock(); }
    return resp({ id: data.id, editado: true });
}

function eliminarTransaccion(data) {
    var rowIndex = parseRowId(data.id || "");
    if (!rowIndex) return respErr("VALIDATION_ERROR", "id inválido. Formato esperado: 'row_N'.");
    var sheet = getSheet(SH.movimientos);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return respErr("SHEET_LOCKED", "No se pudo adquirir el lock.");
    try {
        if (!sheet.getRange(rowIndex, 1).getValue())
            return respErr("NOT_FOUND", "Transacción '" + data.id + "' no encontrada.");
        sheet.deleteRow(rowIndex);
    } finally { lock.releaseLock(); }
    return resp({ id: data.id, eliminado: true });
}

// ── 9. GET /metas ────────────────────────────────────────────

function getMetas() {
    var sheet = getSheet(SH.metas);
    var data = sheet.getDataRange().getValues();
    var movData = getSheet(SH.movimientos).getDataRange().getValues();
    var metas = [];
    for (var i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        metas.push(buildMetaObj(data[i], i + 1, movData));
    }
    return resp({ metas: metas });
}

function buildMetaObj(row, rowIndex, movData) {
    var id = row[0] ? row[0].toString() : "meta_" + String(rowIndex).padStart(2, "0");
    var nombre = row[1] || "";
    var costoObjetivo = parseFloat(row[2]) || 0;
    var montoActual = parseFloat(row[3]) || 0;
    var rendAnual = parseFloat(row[4]) || 0;
    var progreso = costoObjetivo > 0 ? Math.round(montoActual / costoObjetivo * 1000) / 10 : 0;

    // Aportes mensuales: movimientos de tipo "Ahorro" con categoria = nombre de la meta
    var aportesPorMes = {};
    if (movData) {
        for (var j = 1; j < movData.length; j++) {
            var mov = movData[j];
            if ((mov[2] || "").toString().toLowerCase() !== "ahorro") continue;
            if ((mov[4] || "").toString().toLowerCase() !== nombre.toLowerCase()) continue;
            var mf = (mov[0] instanceof Date) ? mov[0] : new Date(mov[0] + "T00:00:00");
            var key = mf.getFullYear() + "-" + (mf.getMonth() + 1);
            aportesPorMes[key] = (aportesPorMes[key] || 0) + (parseFloat(mov[3]) || 0);
        }
    }
    var meses = Object.keys(aportesPorMes).length;
    var total = Object.keys(aportesPorMes).reduce(function (s, k) { return s + aportesPorMes[k]; }, 0);
    var aporte = meses > 0 ? Math.round(total / meses * 100) / 100 : 0;
    var faltante = costoObjetivo - montoActual;
    var mSin = (aporte > 0 && faltante > 0) ? Math.ceil(faltante / aporte) : null;

    var mCon = null, fechaEstimada = null;
    if (aporte > 0 && faltante > 0) {
        var tasa = rendAnual > 0 ? Math.pow(1 + rendAnual / 100, 1 / 12) - 1 : 0;
        var acum = montoActual, m = 0;
        while (acum < costoObjetivo && m < 600) { acum = acum * (1 + tasa) + aporte; m++; }
        if (m < 600) {
            mCon = m;
            var hoy = new Date();
            var fFin = new Date(hoy.getFullYear(), hoy.getMonth() + m, hoy.getDate());
            fechaEstimada = Utilities.formatDate(fFin, TZ, DATE_FMT);
        }
    }

    return {
        id: id, nombre: nombre, costoObjetivo: costoObjetivo,
        montoActual: montoActual, progreso: progreso, rendimientoAnual: rendAnual,
        proyeccion: {
            aportesMensualesPromedio: aporte,
            mesesEstimadosSinRendimiento: mSin,
            mesesEstimadosConRendimiento: mCon,
            fechaEstimadaCumplimiento: fechaEstimada
        }
    };
}

// ── 10. POST /meta ───────────────────────────────────────────

function routeMeta(data) {
    switch ((data.accion || "").toLowerCase()) {
        case "crear": return crearMeta(data);
        case "aportar": return aportarMeta(data);
        case "editar": return editarMeta(data);
        case "eliminar": return eliminarMeta(data);
        default:
            return respErr("VALIDATION_ERROR", "accion inválida: '" + data.accion + "'. Valores: crear, aportar, editar, eliminar.");
    }
}

function crearMeta(data) {
    var p = data.payload || {};
    if (!p.nombre) return respErr("VALIDATION_ERROR", "El campo 'nombre' es requerido.");
    if (!p.costoObjetivo) return respErr("VALIDATION_ERROR", "El campo 'costoObjetivo' es requerido.");
    var sheet = getSheet(SH.metas);
    var lastRow = sheet.getLastRow();
    var id = "meta_" + String(lastRow).padStart(2, "0");
    var row = [id, p.nombre, parseFloat(p.costoObjetivo) || 0,
        parseFloat(p.montoActual) || 0, parseFloat(p.rendimientoAnual) || 0];
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return respErr("SHEET_LOCKED", "No se pudo adquirir el lock.");
    try { sheet.appendRow(row); } finally { lock.releaseLock(); }
    return resp({ meta: buildMetaObj(row, lastRow + 1, null) });
}

function aportarMeta(data) {
    if (!data.id) return respErr("VALIDATION_ERROR", "El campo 'id' es requerido.");
    var monto = parseFloat((data.payload || {}).monto);
    if (!monto || monto <= 0) return respErr("VALIDATION_ERROR", "El campo 'monto' debe ser un número positivo.");
    var sheet = getSheet(SH.metas);
    var sheetRow = findMetaRow(sheet, data.id);
    if (!sheetRow) return respErr("NOT_FOUND", "Meta '" + data.id + "' no encontrada.");
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return respErr("SHEET_LOCKED", "No se pudo adquirir el lock.");
    try {
        var current = parseFloat(sheet.getRange(sheetRow, 4).getValue()) || 0;
        sheet.getRange(sheetRow, 4).setValue(current + monto);
    } finally { lock.releaseLock(); }
    var updatedRow = sheet.getRange(sheetRow, 1, 1, 5).getValues()[0];
    return resp({ meta: buildMetaObj(updatedRow, sheetRow, null) });
}

function editarMeta(data) {
    if (!data.id) return respErr("VALIDATION_ERROR", "El campo 'id' es requerido.");
    var sheet = getSheet(SH.metas);
    var sheetRow = findMetaRow(sheet, data.id);
    if (!sheetRow) return respErr("NOT_FOUND", "Meta '" + data.id + "' no encontrada.");
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return respErr("SHEET_LOCKED", "No se pudo adquirir el lock.");
    try {
        var ex = sheet.getRange(sheetRow, 1, 1, 5).getValues()[0];
        var p = data.payload || {};
        var nr = [ex[0],
        p.nombre !== undefined ? p.nombre : ex[1],
        p.costoObjetivo !== undefined ? parseFloat(p.costoObjetivo) : ex[2],
        p.montoActual !== undefined ? parseFloat(p.montoActual) : ex[3],
        p.rendimientoAnual !== undefined ? parseFloat(p.rendimientoAnual) : ex[4]];
        sheet.getRange(sheetRow, 1, 1, 5).setValues([nr]);
    } finally { lock.releaseLock(); }
    var updatedRow = sheet.getRange(sheetRow, 1, 1, 5).getValues()[0];
    return resp({ meta: buildMetaObj(updatedRow, sheetRow, null) });
}

function eliminarMeta(data) {
    if (!data.id) return respErr("VALIDATION_ERROR", "El campo 'id' es requerido.");
    var sheet = getSheet(SH.metas);
    var sheetRow = findMetaRow(sheet, data.id);
    if (!sheetRow) return respErr("NOT_FOUND", "Meta '" + data.id + "' no encontrada.");
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return respErr("SHEET_LOCKED", "No se pudo adquirir el lock.");
    try { sheet.deleteRow(sheetRow); } finally { lock.releaseLock(); }
    return resp({ id: data.id, eliminado: true });
}

function findMetaRow(sheet, id) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if ((data[i][0] || "").toString() === id) return i + 1;
    }
    return null;
}

// ── 11. LÓGICA DE NEGOCIO — PERIODOS (Architecture.md §7) ────

function getPeriodoVigente(diaCorte, hoy) {
    var y = hoy.getFullYear(), m = hoy.getMonth(), d = hoy.getDate();
    function clamp(yr, mo, day) { return Math.min(day, new Date(yr, mo + 1, 0).getDate()); }
    var corteEste = clamp(y, m, diaCorte);
    var inicio, fin, proximoCorte;
    if (d < corteEste) {
        var py = m === 0 ? y - 1 : y, pm = m === 0 ? 11 : m - 1;
        inicio = new Date(py, pm, clamp(py, pm, diaCorte));
        fin = new Date(y, m, corteEste - 1, 23, 59, 59);
        proximoCorte = new Date(y, m, corteEste);
    } else {
        var ny = m === 11 ? y + 1 : y, nm = m === 11 ? 0 : m + 1;
        inicio = new Date(y, m, corteEste);
        fin = new Date(ny, nm, clamp(ny, nm, diaCorte) - 1, 23, 59, 59);
        proximoCorte = new Date(ny, nm, clamp(ny, nm, diaCorte));
    }
    return { inicio: inicio, fin: fin, proximoCorte: proximoCorte };
}

function calcProxPago(proxCorte, diaPago) {
    var m = proxCorte.getMonth(), y = proxCorte.getFullYear();
    var dia = Math.min(diaPago, new Date(y, m + 1, 0).getDate());
    var proxP = new Date(y, m, dia);
    if (proxP <= proxCorte) {
        var nm = m === 11 ? 0 : m + 1, ny = m === 11 ? y + 1 : y;
        proxP = new Date(ny, nm, Math.min(diaPago, new Date(ny, nm + 1, 0).getDate()));
    }
    return proxP;
}

function calcImpactoTarjeta(metodoPago, tipo) {
    if (!metodoPago || tipo !== "Gasto") return { metodoPago: metodoPago || "Efectivo", aplicaTarjeta: false };
    try {
        var cdSheet = getSheet(SH.calcData);
        var cdData = cdSheet.getDataRange().getValues();
        for (var i = 1; i < cdData.length; i++) {
            if ((cdData[i][0] || "").toString().trim().toLowerCase() !== metodoPago.toLowerCase()) continue;
            var limite = parseFloat(cdData[i][1]) || 0;
            var gastos = parseFloat(cdSheet.getRange(i + 1, CD.gastos).getValue()) || 0;
            var pct = limite > 0 ? Math.round(gastos / limite * 1000) / 10 : 0;
            return {
                metodoPago: metodoPago, aplicaTarjeta: true,
                gastosPeriodoActual: gastos,
                disponible: Math.round((limite - gastos) * 100) / 100,
                porcentajeUso: pct
            };
        }
    } catch (e) { /* Calc_Data opcional */ }
    return { metodoPago: metodoPago, aplicaTarjeta: false };
}

// ── 12. HELPERS ──────────────────────────────────────────────

function parseRowId(id) {
    var match = /^row_(\d+)$/.exec(id);
    if (!match) return null;
    var n = parseInt(match[1], 10);
    return n >= 2 ? n : null;
}

// ── (FIN) ────────────────────────────────────────────────────