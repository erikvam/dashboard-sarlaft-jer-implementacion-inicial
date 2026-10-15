(function () {
  'use strict';

  const MONTH_ORDER = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const PALETTE = ['#3549a8', '#55a9d6', '#d83b43', '#7a88c9'];
  const charts = [];
  const pagesRoot = document.getElementById('report-pages');
  const statusBanner = document.getElementById('status-banner');
  const yearSelect = document.getElementById('year-select');
  const applyButton = document.getElementById('apply-filters');
  const pdfButton = document.getElementById('download-pdf');
  let latestResponse = null;
  let pageKeyCounts = Object.create(null);
  let dashboardLoading = false;

  function setStatus(message, kind) {
    statusBanner.textContent = message;
    statusBanner.className = 'status-banner' + (kind ? ' ' + kind : '');
  }

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim().toUpperCase().replace(/\s+/g, ' ');
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function formatNumber(value) {
    if (value == null || value === '') return '—';
    if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
  }

  function formatPercent(value) {
    if (value == null || value === '' || typeof value !== 'number' || !Number.isFinite(value)) return value == null || value === '' ? '—' : String(value);
    return new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 3 }).format(value);
  }

  function formatCell(value, header) {
    if (value == null || value === '') return '—';
    const h = normalize(header);
    if (typeof value === 'number') {
      if (h.includes('%') || h.includes('PORCENTAJE')) return formatPercent(value);
      return formatNumber(value);
    }
    return String(value);
  }

  function compactNumber(value) {
    if (!Number.isFinite(value)) return '';
    const abs = Math.abs(value);
    if (abs >= 1e9) return (value / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' mil M';
    if (abs >= 1e6) return (value / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
    if (abs >= 1e3) return (value / 1e3).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' mil';
    return value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  function prettyHeader(header) {
    return String(header == null ? '' : header).trim().replace(/\s+/g, ' ');
  }

  function getDataset(name) {
    return latestResponse && latestResponse.datasets ? latestResponse.datasets[name] : null;
  }

  function getHeaderIndex(headers, match) {
    const target = normalize(match);
    return headers.findIndex((header) => normalize(header) === target);
  }

  function monthIndex(headers) {
    return headers.findIndex((header) => normalize(header) === 'MES');
  }

  function yearIndex(headers) {
    return headers.findIndex((header) => ['ANO', 'YEAR'].includes(normalize(header)));
  }

  function numericColumns(dataset) {
    const headers = dataset.headers || [];
    const yi = yearIndex(headers);
    const mi = monthIndex(headers);
    return headers.map((header, index) => ({ header, index, h: normalize(header) }))
      .filter((x) => x.index !== yi && x.index !== mi && !x.h.includes('%') && !x.h.includes('PORCENTAJE'))
      .filter((x) => dataset.rows.some((row) => typeof row[x.index] === 'number' && Number.isFinite(row[x.index])))
      .map((x) => x.index);
  }

  function createTable(dataset, options) {
    const opts = options || {};
    if (!dataset || !Array.isArray(dataset.headers)) {
      return '<p class="empty-cell">No hay datos disponibles para esta sección.</p>';
    }
    const headers = dataset.headers;
    let indices = opts.indices ? opts.indices.slice() : headers.map((_, i) => i);
    if (!opts.keepYear) indices = indices.filter((i) => yearIndex(headers) !== i);
    if (opts.limitColumns && indices.length > opts.limitColumns) indices = indices.slice(0, opts.limitColumns);
    const rows = dataset.rows || [];
    if (!indices.length) return '<p class="empty-cell">No hay columnas para mostrar.</p>';

    let html = '<table class="data-table"><thead><tr>';
    for (const idx of indices) html += '<th>' + esc(prettyHeader(headers[idx])) + '</th>';
    html += '</tr></thead><tbody>';
    if (!rows.length) {
      html += '<tr><td class="empty-cell" colspan="' + indices.length + '">Sin registros para el período seleccionado.</td></tr>';
    } else {
      rows.forEach((row) => {
        html += '<tr>';
        indices.forEach((idx) => {
          const header = headers[idx];
          const cell = formatCell(row[idx], header);
          html += '<td title="' + esc(cell) + '">' + esc(cell) + '</td>';
        });
        html += '</tr>';
      });
    }
    html += '</tbody></table>';
    return html;
  }

  function getMetricModel(metric, dataset) {
    if (!dataset) return null;
    const headers = dataset.headers || [];
    const nums = numericColumns(dataset);
    const mi = monthIndex(headers);
    let seriesIndices;
    if (Array.isArray(metric.seriesIndices) && metric.seriesIndices.length) {
      seriesIndices = metric.seriesIndices;
    } else {
      const primary = metric.primaryIndex != null ? metric.primaryIndex : nums[0];
      const secondary = metric.secondaryIndex != null ? metric.secondaryIndex : nums.find((idx) => idx !== primary);
      seriesIndices = [primary, secondary].filter((idx) => idx != null && idx >= 0 && idx < headers.length);
    }
    const displayIndices = metric.displayIndices || Array.from(new Set([mi, ...headers.map((_, i) => i).filter((idx) => idx !== yearIndex(headers))])).filter((idx) => idx >= 0);
    const filteredSeries = seriesIndices.filter((idx) => idx >= 0 && idx < headers.length);
    return { headers, rows: dataset.rows || [], monthIdx: mi, seriesIndices: filteredSeries, displayIndices };
  }

  function buildChart(canvas, metric, dataset, model) {
    if (!canvas || !dataset || !model || !model.rows.length || !model.seriesIndices.length || typeof Chart === 'undefined') return;
    const labels = model.rows.map((row) => {
      const idx = model.monthIdx;
      return idx >= 0 ? String(row[idx] == null ? '' : row[idx]).toUpperCase() : '';
    });
    const grouped = Array.isArray(metric.seriesIndices) && metric.seriesIndices.length > 1;
    const series = model.seriesIndices.map((idx, index) => {
      const color = PALETTE[index % PALETTE.length];
      const lineSeries = !grouped && index === 1;
      return {
        label: prettyHeader(model.headers[idx]),
        data: model.rows.map((row) => (typeof row[idx] === 'number' && Number.isFinite(row[idx]) ? row[idx] : 0)),
        type: lineSeries ? 'line' : 'bar',
        yAxisID: lineSeries ? 'y1' : 'y',
        backgroundColor: lineSeries ? color : color + 'cc',
        borderColor: color,
        borderWidth: lineSeries ? 2 : 1,
        borderRadius: lineSeries ? 0 : 2,
        barPercentage: 0.76,
        categoryPercentage: 0.72,
        pointRadius: lineSeries ? 3 : 0,
        pointHoverRadius: 5,
        tension: 0.2,
        order: lineSeries ? 0 : 1
      };
    });

    const scales = {
      x: {
        grid: { display: false },
        ticks: { color: '#3f4554', maxRotation: 0, minRotation: 0, autoSkip: false, font: { size: 9 } }
      },
      y: {
        beginAtZero: true,
        position: 'left',
        grid: { color: '#e6e8ef' },
        ticks: { color: '#555c6e', font: { size: 9 }, callback: compactNumber }
      }
    };
    if (!grouped && model.seriesIndices.length > 1) {
      scales.y1 = {
        beginAtZero: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#555c6e', font: { size: 9 }, callback: compactNumber }
      };
    }

    const instance = new Chart(canvas.getContext('2d'), {
      type: 'bar', data: { labels, datasets: series },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: series.length > 1, position: 'top', labels: { boxWidth: 10, boxHeight: 8, padding: 10, font: { size: 9 } } },
          tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + formatNumber(ctx.parsed.y) } }
        },
        scales
      }
    });
    charts.push(instance);
  }

  function pageSlug(value) {
    return String(value || 'pagina').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'pagina';
  }

  function createPage(title, pageType) {
    const page = document.createElement('section');
    page.className = 'report-page' + (pageType ? ' ' + pageType : '');
    const year = latestResponse && latestResponse.year ? latestResponse.year : '';
    const month = latestResponse && latestResponse.monthLabel ? latestResponse.monthLabel : 'Todos los meses';
    const baseKey = pageSlug((pageType || 'page') + '-' + (title || 'sin-titulo'));
    pageKeyCounts[baseKey] = (pageKeyCounts[baseKey] || 0) + 1;
    page.dataset.pageId = baseKey + '-' + pageKeyCounts[baseKey];
    page.innerHTML = '<header class="page-header"><h1>' + esc(title) + '</h1><div class="brand-mark"><img src="assets/jer-logo.png" alt="JER, Junto a ti"></div><span class="period-chip">PERÍODO: ' + esc(month) + ' ' + esc(year) + '</span></header><div class="page-body"></div><footer class="page-footer"></footer>';
    pagesRoot.appendChild(page);
    return { page, body: page.querySelector('.page-body') };
  }

  function renderCover() {
    const { body } = createPage('INFORME DE GESTIÓN SARLAFT · OFICIAL DE CUMPLIMIENTO', 'cover-page');
    const intro = 'Continuando con la cultura de prevención y control del LA/FT-PADM, la Oficial de Cumplimiento de JER S.A. (departamentos Boyacá y Amazonas) desarrolla actividades de debida diligencia, capacitación, monitoreo, análisis, seguimiento y control de operaciones, de acuerdo con los lineamientos y políticas vigentes de la organización.';
    body.innerHTML = '<div class="cover-content"><div class="period-box">PERÍODO: ' + esc((latestResponse.monthLabel || 'Todos los meses') + ' · ' + latestResponse.year) + '</div><p class="cover-copy">' + esc(intro) + '</p></div>';
  }

  function renderActivities() {
    const { body } = createPage('ACTIVIDADES EJECUTADAS · BOYACÁ - AMAZONAS', 'activities-page');
    body.innerHTML = '<ul class="activity-list">' + JER_CONFIG.activities.map((item) => '<li>' + esc(item) + '</li>').join('') + '</ul>';
  }

  function renderNarrative(item) {
    const { body } = createPage(item.title, 'narrative-page');
    body.innerHTML = '<div class="narrative-box">' + esc(item.text) + '</div>';
  }

  function renderMetricPanel(metric, dataset) {
    const model = getMetricModel(metric, dataset);
    const panel = document.createElement('section');
    panel.className = 'metric-panel';
    panel.innerHTML = '<div class="metric-heading">' + esc(metric.title) + '</div><div class="metric-layout"><div class="metric-table-wrap"></div><div class="metric-chart-wrap"><div class="chart-slot"><canvas aria-label="Gráfica de ' + esc(metric.title) + '"></canvas></div></div></div>';
    const tableWrap = panel.querySelector('.metric-table-wrap');
    const chartWrap = panel.querySelector('canvas');
    if (!dataset || !model) {
      tableWrap.innerHTML = '<p class="empty-cell">No se encontró la hoja de origen: ' + esc(metric.sheet || '') + '</p>';
    } else {
      tableWrap.innerHTML = createTable(dataset, { indices: model.displayIndices });
      buildChart(chartWrap, metric, dataset, model);
    }
    return panel;
  }

  function renderMetricPage(item) {
    const { body } = createPage(item.title, 'metric-page');
    if (item.note) body.innerHTML = '<p class="page-note">' + esc(item.note) + '</p>';
    const stack = document.createElement('div');
    stack.className = 'metric-stack';
    item.metrics.forEach((metric) => stack.appendChild(renderMetricPanel(metric, getDataset(metric.sheet))));
    body.appendChild(stack);
  }

  function renderPairTables(item) {
    const { body } = createPage(item.title, 'paired-table-page');
    const grid = document.createElement('div');
    grid.className = 'general-two-col';
    item.cards.forEach((card) => {
      const ds = getDataset(card.sheet);
      const el = document.createElement('section');
      el.className = 'general-card';
      el.innerHTML = '<h2>' + esc(card.title) + '</h2><div class="card-content">' + createTable(ds) + '</div>';
      grid.appendChild(el);
    });
    body.appendChild(grid);
  }

  function renderCnjsa(item) {
    const { body } = createPage(item.title, 'metric-page');
    const stack = document.createElement('div');
    stack.className = 'metric-stack';
    const ds = getDataset(item.sheet);
    stack.appendChild(renderMetricPanel({
      title: 'PREMIOS REPORTADOS A LA UIAF · BOYACÁ', sheet: item.sheet,
      primaryIndex: 2, secondaryIndex: 3, displayIndices: [1, 2, 3]
    }, ds));
    stack.appendChild(renderMetricPanel({
      title: 'PREMIOS REPORTADOS A LA UIAF · AMAZONAS', sheet: item.sheet,
      primaryIndex: 4, secondaryIndex: 5, displayIndices: [1, 4, 5]
    }, ds));
    body.appendChild(stack);
  }

  function renderDueDiligence(item) {
    const { body } = createPage(item.title, 'paired-table-page');
    const ds = getDataset(item.sheet);
    const model = getMetricModel({
      title: 'TOTAL DE MONITOREOS', primaryIndex: 14, secondaryIndex: 19,
      displayIndices: [1, 14, 15, 16, 17, 18, 19, 20]
    }, ds);
    const grid = document.createElement('div');
    grid.className = 'general-two-col';
    const left = document.createElement('section');
    left.className = 'general-card';
    left.innerHTML = '<h2>MONITOREO DE TERCEROS POR MES</h2><div class="card-content"><div class="chart-slot"><canvas></canvas></div></div>';
    if (ds && model) buildChart(left.querySelector('canvas'), { primaryIndex: 14, secondaryIndex: 19 }, ds, model);
    const right = document.createElement('section');
    right.className = 'general-card';
    right.innerHTML = '<h2>DETALLE DE MONITOREOS</h2><div class="card-content">' +
      createTable(ds, { indices: [1, 14, 15, 16, 18, 19, 20] }) + '</div>';
    grid.append(left, right);
    body.appendChild(grid);
  }

  function renderTrainingDashboard(item) {
    const { body } = createPage(item.title, 'metric-page');
    const stack = document.createElement('div');
    stack.className = 'metric-stack';
    const cap = getDataset(item.capSheet);
    stack.appendChild(renderMetricPanel({
      title: 'CANTIDAD DE CAPACITACIONES POR MES', sheet: item.capSheet,
      primaryIndex: 16, displayIndices: [1, 16]
    }, cap));
    const inductions = getDataset(item.inductionSheet);
    stack.appendChild(renderMetricPanel({
      title: 'INDUCCIONES POR MES', sheet: item.inductionSheet,
      seriesIndices: [2, 3], displayIndices: [1, 2, 3, 4]
    }, inductions));
    body.appendChild(stack);
  }

  function renderDetailPages(sheetName, title, tableTitle) {
    const ds = getDataset(sheetName);
    if (!ds) {
      const { body } = createPage(title, 'general-table-page');
      body.innerHTML = '<p class="empty-cell">No se encontró la hoja de origen: ' + esc(sheetName) + '</p>';
      return;
    }
    const headers = ds.headers || [];
    let indices = headers.map((_, i) => i).filter((i) => i !== yearIndex(headers));
    const rows = ds.rows || [];
    const pageSize = Math.max(1, Number(JER_CONFIG.detailRowsPerPage) || 12);
    const chunks = [];
    for (let i = 0; i < rows.length; i += pageSize) chunks.push(rows.slice(i, i + pageSize));
    if (!chunks.length) chunks.push([]);

    chunks.forEach((chunk, chunkIndex) => {
      const titleWithContinuation = chunks.length > 1 ? title + ' · CONTINUACIÓN ' + (chunkIndex + 1) : title;
      const { body } = createPage(titleWithContinuation, 'general-table-page');
      const singleChunk = { headers, rows: chunk };
      body.innerHTML = '<p class="detail-intro">' + esc(tableTitle || title) + ' · ' + chunk.length + ' registro(s) en esta página.</p><div class="detail-table-wrap">' + createTable(singleChunk, { indices }) + '</div>';
    });
  }

  function renderDetailPair(item) {
    item.sheets.forEach((entry) => renderDetailPages(entry.sheet, item.title + ' · ' + entry.title, entry.title));
  }

  function renderClosing() {
    const { body } = createPage('', 'closing-page');
    body.innerHTML = '<div class="close-page"><div class="close-message">Realizado por:<strong>OFICIAL DE CUMPLIMIENTO</strong><span>GRACIAS</span></div><div class="compliance-mark">JER<span>COMPLIANCE OFFICER</span></div></div>';
  }

  function renderNewSheetPages() {
    const names = latestResponse && Array.isArray(latestResponse.newSheets) ? latestResponse.newSheets : [];
    names.forEach((entry) => {
      const sheetName = typeof entry === 'string' ? entry : entry.name;
      const ds = getDataset(sheetName);
      if (!sheetName || !ds) return;
      const mi = monthIndex(ds.headers || []);
      const numeric = numericColumns(ds);
      if (mi >= 0 && numeric.length && ds.rows.length <= 15) {
        const { body } = createPage('NUEVO MONITOREO · ' + sheetName, 'dynamic-monitoring-page');
        const note = document.createElement('p');
        note.className = 'page-note';
        note.textContent = 'Pestaña detectada automáticamente en Google Sheets. Revisa los encabezados para confirmar que las series representan correctamente el monitoreo.';
        const panel = document.createElement('section');
        panel.className = 'metric-panel dynamic-monitor-panel';
        panel.innerHTML = '<div class="metric-heading">' + esc(sheetName) + '</div><div class="metric-layout"><div class="metric-table-wrap"></div><div class="metric-chart-wrap"><div class="chart-slot"><canvas aria-label="Gráfica de ' + esc(sheetName) + '"></canvas></div></div></div>';
        const model = getMetricModel({ seriesIndices: numeric.slice(0, 2), displayIndices: ds.headers.map((_, idx) => idx).filter((idx) => idx !== yearIndex(ds.headers)) }, ds);
        panel.querySelector('.metric-table-wrap').innerHTML = createTable(ds, { indices: model ? model.displayIndices : undefined, limitColumns: 8 });
        if (model) buildChart(panel.querySelector('canvas'), { seriesIndices: numeric.slice(0, 2) }, ds, model);
        body.append(note, panel);
      } else {
        renderDetailPages(sheetName, 'NUEVO MONITOREO · ' + sheetName, sheetName);
      }
    });
  }

  function renderReport() {
    charts.splice(0).forEach((chart) => { try { chart.destroy(); } catch (_) {} });
    pagesRoot.innerHTML = '';
    pageKeyCounts = Object.create(null);
    let dynamicSheetsRendered = false;
    JER_CONFIG.reportSequence.forEach((item) => {
      if (item.type === 'closing' && !dynamicSheetsRendered) {
        renderNewSheetPages();
        dynamicSheetsRendered = true;
      }
      switch (item.type) {
        case 'cover': renderCover(); break;
        case 'activities': renderActivities(); break;
        case 'metric': renderMetricPage(item); break;
        case 'narrative': renderNarrative(item); break;
        case 'pairedTables': renderPairTables(item); break;
        case 'cnjsa': renderCnjsa(item); break;
        case 'dueDiligence': renderDueDiligence(item); break;
        case 'trainingDashboard': renderTrainingDashboard(item); break;
        case 'detail': renderDetailPages(item.sheet, item.title, item.tableTitle); break;
        case 'detailPair': renderDetailPair(item); break;
        case 'closing': renderClosing(); break;
        default: break;
      }
    });
    if (!dynamicSheetsRendered) renderNewSheetPages();
    if (window.JEREditor) window.JEREditor.decorateReport(pagesRoot, latestResponse);
    const pages = Array.from(pagesRoot.querySelectorAll('.report-page'));
    pages.forEach((page, index) => {
      const footer = page.querySelector('.page-footer');
      if (footer) footer.textContent = (index + 1) + ' / ' + pages.length;
    });
  }

  function postToAppsScript(payload, timeoutMs) {
    return new Promise((resolve, reject) => {
      if (!JER_CONFIG.scriptUrl || JER_CONFIG.scriptUrl.includes('PEGA_AQUI')) {
        reject(new Error('Falta configurar la URL del Web App en js/config.js.'));
        return;
      }
      const nonce = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
      const frameName = 'jer_api_frame_' + nonce.replace(/[^a-z0-9]/gi, '');
      const iframe = document.createElement('iframe');
      iframe.name = frameName;
      iframe.title = 'Conexión segura del dashboard';
      iframe.hidden = true;
      iframe.setAttribute('aria-hidden', 'true');
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = JER_CONFIG.scriptUrl;
      form.target = frameName;
      form.enctype = 'application/x-www-form-urlencoded';
      form.hidden = true;
      const fields = { payload: JSON.stringify(payload), nonce: nonce, parentOrigin: window.location.origin };
      Object.keys(fields).forEach((name) => {
        const input = document.createElement('input');
        input.type = 'hidden'; input.name = name; input.value = fields[name]; form.appendChild(input);
      });
      let finished = false;
      const timeout = setTimeout(() => finish(new Error('Se agotó el tiempo de espera de Apps Script. Comprueba la URL del Web App y que ALLOWED_ORIGINS incluya el origen de GitHub Pages.')), timeoutMs || 45000);
      function finish(error, result) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        form.remove(); iframe.remove();
        if (error) reject(error); else resolve(result);
      }
      function onMessage(event) {
        const data = event.data;
        if (!data || data.type !== 'jer-apps-script-response' || data.nonce !== nonce) return;
        // La carga se inicia desde este iframe; el nonce aleatorio relaciona la respuesta con la solicitud actual.
        finish(null, data.payload);
      }
      window.addEventListener('message', onMessage);
      document.body.append(iframe, form);
      form.submit();
    });
  }

  function populateYears(years, selectedYear) {
    const unique = [...new Set((years || []).map((year) => Number(year)).filter((year) => Number.isFinite(year)))].sort((a, b) => b - a);
    if (!unique.length && selectedYear) unique.push(Number(selectedYear));
    yearSelect.innerHTML = unique.map((year) => '<option value="' + year + '">' + year + '</option>').join('');
    if (selectedYear && unique.includes(Number(selectedYear))) yearSelect.value = String(selectedYear);
  }

  function readableBackendError(result) {
    const code = result && (result.code || result.errorCode);
    const map = {
      'NOT_AUTHORIZED': 'Tu cuenta inició sesión, pero aún no está autorizada para consultar los datos. Pide al administrador que agregue tu correo a AUTHORIZED_EMAILS en Apps Script.',
      'EMAIL_NOT_VERIFIED': 'Verifica tu correo electrónico con el enlace enviado por Firebase antes de consultar el informe.',
      'FIREBASE_NOT_CONFIGURED': 'Falta configurar FIREBASE_API_KEY en las propiedades del proyecto de Apps Script.',
      'SHEET_NOT_CONFIGURED': 'Falta configurar SPREADSHEET_ID en las propiedades del proyecto de Apps Script.',
      'ORIGIN_NOT_ALLOWED': 'El origen de GitHub Pages no está incluido en ALLOWED_ORIGINS en Apps Script.',
      'INVALID_TOKEN': 'La sesión no es válida o ha caducado. Cierra sesión y vuelve a iniciar sesión.',
      'NO_TOKEN': 'No se recibió una sesión válida de Firebase.'
    };
    return map[code] || (result && result.error) || 'Apps Script devolvió una respuesta no válida.';
  }

  async function loadDashboard() {
    if (dashboardLoading) return;
    if (!window.JERAuth || !window.JERAuth.currentUser) {
      setStatus('Inicia sesión para consultar el informe.', 'error');
      return;
    }
    const months = window.JERMonthFilter.getSelection();
    if (!months.length) {
      setStatus('Selecciona al menos un mes.', 'error');
      return;
    }
    const year = yearSelect.value || '';
    dashboardLoading = true;
    applyButton.disabled = true;
    pdfButton.disabled = true;
    setStatus('Verificando sesión y consultando Google Sheets…');
    try {
      await window.JEREditor.ready();
      const idToken = await window.JERAuth.getIdToken();
      const result = await postToAppsScript({ action: 'data', idToken, year, months }, 45000);
      if (!result || result.ok !== true) throw new Error(readableBackendError(result));
      latestResponse = result;
      populateYears(result.availableYears || [], result.year);
      window.JERMonthFilter.setSelection(result.months || months);
      renderReport();
      const warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0;
      const newCount = Array.isArray(result.newSheets) ? result.newSheets.length : 0;
      setStatus('Datos autorizados · ' + result.year + ' · ' + (result.monthLabel || 'Todos los meses') + ' · ' + pagesRoot.querySelectorAll('.report-page').length + ' páginas' + (newCount ? ' · nuevas pestañas detectadas: ' + newCount : '') + (warningCount ? ' · advertencias: ' + warningCount : ''), 'success');
      if (warningCount) console.warn('Advertencias de Apps Script:', result.warnings);
      pdfButton.disabled = false;
      window.JEREditor.setEnabled(true);
    } catch (error) {
      console.error(error);
      latestResponse = null;
      pagesRoot.innerHTML = '<section class="empty-state"><h1>No se pudo cargar el informe</h1><p>' + esc(error.message || 'Error desconocido') + '</p><p>Comprueba la URL de Apps Script, los datos de Firebase y que tu correo esté incluido en AUTHORIZED_EMAILS.</p></section>';
      setStatus(error.message || 'No se pudieron cargar los datos.', 'error');
      window.JEREditor?.setEnabled(false);
      pdfButton.disabled = true;
    } finally {
      applyButton.disabled = false;
      dashboardLoading = false;
    }
  }

  async function downloadPdf() {
    if (!latestResponse || typeof html2canvas === 'undefined' || !window.jspdf) {
      setStatus('No es posible exportar todavía. Primero carga correctamente el informe.', 'error');
      return;
    }
    const pages = Array.from(pagesRoot.querySelectorAll('.report-page'));
    if (!pages.length) return;
    if (window.JEREditor && window.JEREditor.hasOverflow()) {
      setStatus('Hay uno o más cuadros de texto que sobrepasan el espacio de su página. Acorta el texto o muévelo a una página nueva antes de descargar el PDF.', 'error');
      return;
    }
    pdfButton.disabled = true;
    applyButton.disabled = true;
    const originalText = pdfButton.textContent;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [906, 600], compress: true });
    try {
      for (let index = 0; index < pages.length; index++) {
        pdfButton.textContent = 'Generando ' + (index + 1) + '/' + pages.length;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const canvas = await html2canvas(pages[index], {
          scale: 1.8, backgroundColor: '#ffffff', useCORS: true, logging: false,
          width: 1200, height: 794, windowWidth: 1200,
          onclone: (clonedDocument) => {
            const toolbar = clonedDocument.querySelector('.app-toolbar');
            const banner = clonedDocument.querySelector('.status-banner');
            if (toolbar) toolbar.style.display = 'none';
            if (banner) banner.style.display = 'none';
            clonedDocument.querySelectorAll('.selected-page').forEach((page) => page.classList.remove('selected-page'));
            clonedDocument.querySelectorAll('.editing-text').forEach((element) => element.classList.remove('editing-text'));
            clonedDocument.querySelectorAll('.editor-text-block').forEach((element) => {
              element.style.border = '0'; element.style.background = 'transparent'; element.style.padding = '0'; element.style.borderRadius = '0';
            });
            clonedDocument.querySelectorAll('.custom-page-copy').forEach((element) => { element.style.border = '0'; });
          }
        });
        const image = canvas.toDataURL('image/jpeg', 0.92);
        if (index > 0) pdf.addPage([906, 600], 'landscape');
        pdf.addImage(image, 'JPEG', 0, 0, 906, 600, undefined, 'FAST');
        canvas.width = 1; canvas.height = 1;
      }
      const monthFile = (latestResponse.months || []).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'sin-meses';
      pdf.save('Informe_SARLAFT_JER_' + latestResponse.year + '_' + monthFile + '.pdf');
      setStatus('PDF generado con ' + pages.length + ' páginas.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('Falló la exportación del PDF: ' + (error.message || 'error desconocido'), 'error');
    } finally {
      pdfButton.disabled = false;
      applyButton.disabled = false;
      pdfButton.textContent = originalText;
    }
  }

  applyButton.addEventListener('click', loadDashboard);
  pdfButton.addEventListener('click', downloadPdf);

  window.addEventListener('jer-authenticated', () => { loadDashboard(); });
  window.addEventListener('jer-logged-out', () => {
    charts.splice(0).forEach((chart) => { try { chart.destroy(); } catch (_) {} });
    latestResponse = null;
    pagesRoot.innerHTML = '<section class="empty-state"><h1>Dashboard SARLAFT JER</h1><p>Inicia sesión para consultar el informe.</p></section>';
    pdfButton.disabled = true;
    setStatus('Sesión cerrada. Los datos del informe se han retirado de la pantalla.', 'success');
  });
  window.JERDashboard = {
    reload: loadDashboard,
    async renderCurrent() {
      await window.JEREditor.ready();
      if (latestResponse) renderReport(); else await loadDashboard();
    },
    setStatus,
    getResponse: () => latestResponse
  };
  // Recupera una sesión Firebase persistida aunque el primer evento haya ocurrido antes de este listener.
  if (window.JERAuth && window.JERAuth.currentUser) loadDashboard();
})();
