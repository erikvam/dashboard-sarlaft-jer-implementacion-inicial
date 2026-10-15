/**
 * Dashboard SARLAFT JER — endpoint con identidad Firebase y lista autorizada.
 * No expone datos con GET/JSONP. El navegador envía un formulario POST a un iframe
 * y recibe una respuesta postMessage; así evita depender de CORS en ContentService.
 * Configura las propiedades del script según la guía antes de desplegar.
 */
const HEADER_ROW_OVERRIDES = {
  'ROI': 2,
  'BENEFICIARIOS FINALES': 2
};
const ALLOWED_SHEETS = [
  'N. GIROS ENV BOY', ' N. GIROS ENV AMZ', 'TOTAL N GIROS ENV JER',
  'N. P GIROS ENV. BOY', 'N. P GIROS ENV. AMZ', 'TOTAL N. P GIROS ENV. JER',
  'TOTALES GIROS ENV. BOY', 'TOTALES GIROS ENV. AMZ', 'TOTALES GIROS ENV. JER',
  'N. GIROS PAG. BOY', 'N. GIROS PAG. AMZ', 'TOTAL N. GIROS PAG. JER',
  'N. PER GIROS PAG. BOY', 'N. PER GIROS PAG. AMZ', 'TOTAL N. PER GIROS PAG. JER',
  'TOTAL GIROS PAG. BOY', 'TOTAL GIROS PAG. AMZ', 'TOTAL GIROS PAG. JER',
  'CANT PREMIOS CHANCE BOY', 'CANT PREMIOS CHANCE AMZ', 'TOTAL N PREMIOS CHANCE JER',
  'N. PERSONAS PREMIOS CHANCE BOY', 'N. PERSONAS PREMIOS CHANCE AMZ', 'TOTAL N. PERSONAS PREMIOS CHANC',
  ' MONTOS TOTALES PREMIOS CHANCE ', 'MONTOS TOTALES PREMIOS CHANCE A', 'MONTOS TOTALES PREMIOS CHANCE J',
  'CANT. INSTANT-BOY', 'CANT. INSTANT AMZ', 'CANT. INSTANT JER',
  'N. PERSONAS INSTANT BOY.', 'N. PERSONAS INSTANT AMZ.', 'TOTAL PERSONAS INST JER',
  'MONTOS INSTANT. BOY', 'MONTOS INSTANT. AMZ', 'MONTOS INST. JER',
  'CANT RECARGAS BETPLAY BOY', 'CANT RECARGAS BETPLAY AMZ', 'CANT RECARGAS BETPLAY JER',
  'N PERSONAS RECARGAS BOY', 'N PERSONAS RECARGAS AMZ', 'N PERSONAS RECARGAS JER',
  'MONTOS RECARGAS BOY', 'MONTOS RECARGAS AMZ', ' MONTOS RECARGAS JER',
  'CANT RETIROS BETPLAY BOY', 'CANT RETIROS BETPLAY AMZ', 'CANT RETIROS BETPLAY JER',
  'N PERSONAS RETIROS BOY', 'N PERSONAS RETIROS AMZ', 'N PERSONAS RETIROS JER',
  'MONTOS RETIROS BOY', 'MONTOS RETIROS AMZ', 'MONTOS RETIROS JER',
  'ROS', 'ROI', 'CNJSA', 'DEBIDA DILIGENCIA', 'PEP EXT', 'CAPACITACIONES', 'INDUCCIONES',
  'BENEFICIARIOS FINALES', 'formacion oc', 'otras act', 'REUNIONES', 'CAPACITACIONES JER', 'cursos'
];
const VISIBLE_SHEETS = [
  'N. GIROS ENV BOY', 'N. P GIROS ENV. BOY', 'TOTALES GIROS ENV. BOY',
  'N. GIROS PAG. BOY', 'N. PER GIROS PAG. BOY', 'TOTAL GIROS PAG. BOY',
  ' N. GIROS ENV AMZ', 'N. P GIROS ENV. AMZ', 'TOTALES GIROS ENV. AMZ',
  'N. GIROS PAG. AMZ', 'N. PER GIROS PAG. AMZ', 'TOTAL GIROS PAG. AMZ',
  'CANT RECARGAS BETPLAY BOY', 'N PERSONAS RECARGAS BOY', 'MONTOS RECARGAS BOY',
  'CANT RETIROS BETPLAY BOY', 'N PERSONAS RETIROS BOY', 'MONTOS RETIROS BOY',
  'CANT RECARGAS BETPLAY AMZ', 'N PERSONAS RECARGAS AMZ', 'MONTOS RECARGAS AMZ',
  'CANT RETIROS BETPLAY AMZ', 'N PERSONAS RETIROS AMZ', 'MONTOS RETIROS AMZ',
  'CANT PREMIOS CHANCE BOY', 'N. PERSONAS PREMIOS CHANCE BOY',
  ' MONTOS TOTALES PREMIOS CHANCE ', 'CANT. INSTANT-BOY',
  'N. PERSONAS INSTANT BOY.', 'MONTOS INSTANT. BOY',
  'CANT PREMIOS CHANCE AMZ', 'N. PERSONAS PREMIOS CHANCE AMZ',
  'MONTOS TOTALES PREMIOS CHANCE A', 'CANT. INSTANT AMZ',
  'N. PERSONAS INSTANT AMZ.', 'MONTOS INSTANT. AMZ',
  'ROS', 'ROI', 'CNJSA', 'DEBIDA DILIGENCIA', 'PEP EXT',
  'CAPACITACIONES', 'INDUCCIONES', 'formacion oc', 'CAPACITACIONES JER', 'otras act', 'REUNIONES'
];
const MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

const MONITORING_SHEET_COUNT = 54;

function doGet() {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8"><title>Servicio SARLAFT JER</title></head>' +
    '<body style="font-family:Arial,sans-serif;padding:24px"><h2>Servicio del dashboard SARLAFT JER</h2>' +
    '<p>Este servicio solo responde a solicitudes POST con una sesión Firebase válida y un correo autorizado.</p></body></html>'
  ).setTitle('Servicio SARLAFT JER');
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const nonce = String(params.nonce || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  const parentOrigin = validOrigin_(String(params.parentOrigin || '')) ? String(params.parentOrigin) : 'https://invalid.invalid';
  let result;
  try {
    if (!nonce) throw apiError_('INVALID_REQUEST', 'Falta el identificador de solicitud.');
    if (!isOriginAllowed_(parentOrigin)) throw apiError_('ORIGIN_NOT_ALLOWED', 'El origen de este dashboard no está autorizado en ALLOWED_ORIGINS.');
    const raw = params.payload;
    if (!raw) throw apiError_('INVALID_REQUEST', 'La solicitud no contiene datos.');
    let request;
    try { request = JSON.parse(raw); } catch (_) { throw apiError_('INVALID_REQUEST', 'El contenido de la solicitud no es JSON válido.'); }
    if (request.action !== 'data') throw apiError_('INVALID_ACTION', 'Acción no admitida.');
    const identity = verifyFirebaseUser_(String(request.idToken || ''));
    if (!identity.emailVerified) throw apiError_('EMAIL_NOT_VERIFIED', 'Verifica el correo electrónico de Firebase antes de consultar el informe.');
    if (!isEmailAuthorized_(identity.email)) throw apiError_('NOT_AUTHORIZED', 'La cuenta se autenticó, pero su correo no está en la lista autorizada para el informe.');
    const spreadsheetId = getScriptProperty_('SPREADSHEET_ID');
    if (!spreadsheetId) throw apiError_('SHEET_NOT_CONFIGURED', 'Configura SPREADSHEET_ID en las propiedades del proyecto de Apps Script.');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    result = buildDashboardResponse_(spreadsheet, request);
    result.user = { email: identity.email, uid: identity.uid };
  } catch (error) {
    result = { ok: false, code: error && error.code ? error.code : 'SERVER_ERROR', error: error && error.message ? error.message : String(error) };
  }
  return bridgeResponse_(nonce, parentOrigin, result);
}

function buildDashboardResponse_(spreadsheet, request) {
  const all = readAllAllowedSheets_(spreadsheet);
  const availableYears = all.availableYears;
  const requestedYear = Number(request.year);
  const year = requestedYear && availableYears.indexOf(requestedYear) >= 0
    ? requestedYear
    : (availableYears.length ? availableYears[availableYears.length - 1] : new Date().getFullYear());
  const incomingMonths = Array.isArray(request.months) ? request.months.map(normalize_) : MONTHS.slice();
  const selectedMonths = MONTHS.filter(function (month) { return incomingMonths.indexOf(month) >= 0; });
  if (!selectedMonths.length) throw apiError_('NO_MONTHS', 'Selecciona al menos un mes.');

  const sheetNamesToReturn = Array.from(new Set(VISIBLE_SHEETS.concat(all.newSheetNames)));
  const datasets = {};
  sheetNamesToReturn.forEach(function (sheetName) {
    const source = all.datasets[sheetName];
    if (!source) return;
    const yearIndex = findHeaderIndex_(source.headers, ['ANO', 'YEAR', 'AÑO']);
    const monthIndex = findHeaderIndex_(source.headers, ['MES']);
    let rows = source.rows.filter(function (row) {
      if (yearIndex >= 0 && Number(row[yearIndex]) !== year) return false;
      if (monthIndex >= 0 && selectedMonths.indexOf(normalize_(row[monthIndex])) < 0) return false;
      return true;
    });
    if (monthIndex >= 0) {
      rows = rows.slice().sort(function (a, b) {
        return MONTHS.indexOf(normalize_(a[monthIndex])) - MONTHS.indexOf(normalize_(b[monthIndex]));
      });
    }
    datasets[sheetName] = { name: sheetName, headers: source.headers, rows: rows };
  });

  const monthLabel = selectedMonths.length === 12 ? 'TODOS LOS MESES' : selectedMonths.map(titleCase_).join(' · ').toUpperCase();
  return {
    ok: true,
    year: year,
    months: selectedMonths,
    monthLabel: monthLabel,
    availableYears: availableYears,
    datasets: datasets,
    newSheets: all.newSheetNames,
    sheetCatalog: all.sheetCatalog,
    warnings: all.warnings
  };
}

function verifyFirebaseUser_(idToken) {
  if (!idToken || idToken.length < 100) throw apiError_('NO_TOKEN', 'No se recibió un token de sesión válido.');
  const apiKey = getScriptProperty_('FIREBASE_API_KEY');
  if (!apiKey) throw apiError_('FIREBASE_NOT_CONFIGURED', 'Configura FIREBASE_API_KEY en las propiedades de Apps Script.');
  const endpoint = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey);
  let response;
  try {
    response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    });
  } catch (error) {
    throw apiError_('FIREBASE_LOOKUP_FAILED', 'No fue posible validar la sesión con Firebase. Revisa la API y los permisos de UrlFetchApp.');
  }
  const status = response.getResponseCode();
  let body = {};
  try { body = JSON.parse(response.getContentText() || '{}'); } catch (_) {}
  if (status !== 200 || !body.users || !body.users.length) {
    throw apiError_('INVALID_TOKEN', 'El token de Firebase no es válido o expiró. Cierra sesión y vuelve a entrar.');
  }
  const user = body.users[0];
  if (user.disabled === true) throw apiError_('USER_DISABLED', 'La cuenta está deshabilitada en Firebase.');
  return {
    uid: String(user.localId || ''),
    email: String(user.email || '').trim().toLowerCase(),
    emailVerified: user.emailVerified === true
  };
}

function isEmailAuthorized_(email) {
  const list = getScriptProperty_('AUTHORIZED_EMAILS');
  if (!list || !email) return false; // Fallar cerrado si no existe la lista.
  const authorized = list.split(/[;,\n]/).map(function (item) { return item.trim().toLowerCase(); }).filter(Boolean);
  return authorized.indexOf(String(email).trim().toLowerCase()) >= 0;
}

function isOriginAllowed_(origin) {
  const list = getScriptProperty_('ALLOWED_ORIGINS');
  if (!list) return false; // No se envían datos hasta configurar el origen exacto.
  const allowed = list.split(/[;,\n]/).map(function (item) { return item.trim().replace(/\/$/, ''); }).filter(Boolean);
  return allowed.indexOf(origin.replace(/\/$/, '')) >= 0;
}

function validOrigin_(origin) {
  return /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function bridgeResponse_(nonce, parentOrigin, payload) {
  const safeOrigin = validOrigin_(parentOrigin) ? parentOrigin : 'https://invalid.invalid';
  const message = JSON.stringify({ type: 'jer-apps-script-response', nonce: nonce, payload: payload })
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const target = JSON.stringify(safeOrigin);
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    'window.top.postMessage(' + message + ',' + target + ');' +
    '</script><p>Respuesta del dashboard. Puedes cerrar esta ventana.</p></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function readAllAllowedSheets_(spreadsheet) {
  const datasets = {};
  const warnings = [];
  const years = {};
  const allSheetNames = spreadsheet.getSheets().map(function (sheet) { return sheet.getName(); });
  const knownNames = ALLOWED_SHEETS.slice();
  const newSheetNames = allSheetNames.filter(function (name) { return knownNames.indexOf(name) < 0; });
  const sourceNames = Array.from(new Set(ALLOWED_SHEETS.slice(0, MONITORING_SHEET_COUNT).concat(VISIBLE_SHEETS).concat(newSheetNames)));

  sourceNames.forEach(function (sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      if (VISIBLE_SHEETS.indexOf(sheetName) >= 0) warnings.push('No existe la pestaña visible: ' + sheetName);
      return;
    }
    const values = sheet.getDataRange().getValues();
    const headerRow = HEADER_ROW_OVERRIDES[sheetName] || 1;
    if (!values || values.length < headerRow) {
      warnings.push('La pestaña está vacía: ' + sheetName);
      return;
    }
    const headers = values[headerRow - 1].map(function (value) { return String(value == null ? '' : value).trim(); });
    const rows = values.slice(headerRow).filter(function (row) {
      return row.some(function (value) { return value !== '' && value !== null; });
    }).map(function (row) { return row.map(cleanValue_); });
    const yearIndex = findHeaderIndex_(headers, ['ANO', 'YEAR', 'AÑO']);
    const isMonitoringSource = ALLOWED_SHEETS.slice(0, MONITORING_SHEET_COUNT).indexOf(sheetName) >= 0 || newSheetNames.indexOf(sheetName) >= 0;
    if (yearIndex >= 0 && isMonitoringSource) {
      rows.forEach(function (row) {
        const numericYear = Number(row[yearIndex]);
        if (numericYear && numericYear >= 2000 && numericYear <= 2200) years[numericYear] = true;
      });
    }
    datasets[sheetName] = { name: sheetName, headers: headers, rows: rows };
  });

  const sheetCatalog = allSheetNames.map(function (name) {
    const dataset = datasets[name];
    const sheet = spreadsheet.getSheetByName(name);
    let headers = dataset ? dataset.headers : [];
    if (!headers.length && sheet && sheet.getLastRow() > 0) {
      const override = HEADER_ROW_OVERRIDES[name] || 1;
      headers = sheet.getRange(override, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return String(value || '').trim(); });
    }
    return { name: name, headers: headers, rows: sheet ? Math.max(0, sheet.getLastRow() - (HEADER_ROW_OVERRIDES[name] || 1)) : 0, isNew: newSheetNames.indexOf(name) >= 0 };
  });
  return {
    datasets: datasets,
    warnings: warnings,
    newSheetNames: newSheetNames,
    sheetCatalog: sheetCatalog,
    availableYears: Object.keys(years).map(Number).sort(function (a, b) { return a - b; })
  };
}

function cleanValue_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (value === '' || value === undefined) return null;
  return value;
}

function normalize_(value) {
  return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function findHeaderIndex_(headers, choices) {
  const normalized = headers.map(normalize_);
  for (let i = 0; i < choices.length; i++) {
    const index = normalized.indexOf(normalize_(choices[i]));
    if (index >= 0) return index;
  }
  return -1;
}

function titleCase_(text) {
  return String(text).toLowerCase().replace(/^./, function (first) { return first.toUpperCase(); });
}

function getScriptProperty_(key) {
  return String(PropertiesService.getScriptProperties().getProperty(key) || '').trim();
}

function apiError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/** Ejecuta manualmente desde Apps Script; no devuelve datos del libro al navegador. */
function probarConexion() {
  const spreadsheetId = getScriptProperty_('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Configura SPREADSHEET_ID en las propiedades del proyecto.');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const result = readAllAllowedSheets_(spreadsheet);
  Logger.log('Libro: %s', spreadsheet.getName());
  Logger.log('Años encontrados: %s', JSON.stringify(result.availableYears));
  Logger.log('Hojas visibles y nuevas identificadas: %s', VISIBLE_SHEETS.length + result.newSheetNames.length);
  Logger.log('Advertencias: %s', JSON.stringify(result.warnings));
}

/** Revisa que las propiedades obligatorias estén configuradas; no imprime sus valores. */
function revisarConfiguracion() {
  const required = ['SPREADSHEET_ID', 'FIREBASE_API_KEY', 'AUTHORIZED_EMAILS', 'ALLOWED_ORIGINS'];
  const missing = required.filter(function (key) { return !getScriptProperty_(key); });
  Logger.log(missing.length ? 'Faltan propiedades: %s' : 'Configuración básica completa.', JSON.stringify(missing));
}
