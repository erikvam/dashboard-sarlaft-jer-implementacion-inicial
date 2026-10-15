(function () {
  'use strict';
  const root = document.getElementById('report-pages');
  const DEFAULT_LOGO = 'assets/jer-logo.png';
  const help = document.getElementById('editor-help');
  const editToggle = document.getElementById('edit-toggle');
  const insertButton = document.getElementById('insert-text');
  const addButton = document.getElementById('add-page');
  const deleteButton = document.getElementById('delete-page');
  const upButton = document.getElementById('move-page-up');
  const downButton = document.getElementById('move-page-down');
  const logoButton = document.getElementById('change-logo');
  const logoInput = document.getElementById('logo-file');
  const exportButton = document.getElementById('export-settings');
  const importButton = document.getElementById('import-settings');
  const settingsInput = document.getElementById('settings-file');
  let state = window.JERLocalStore.defaults();
  let editing = false;
  let insertMode = false;
  let selectedPageId = null;
  let saveTimer = null;
  let readyPromise = loadInitialState();

  async function loadInitialState() {
    try {
      state = await window.JERLocalStore.getState();
    } catch (error) {
      console.warn('No se pudo recuperar la configuración local:', error);
      state = window.JERLocalStore.defaults();
      notify('No fue posible leer la edición local guardada. El informe se abrirá sin esos cambios.', 'error');
    }
    return state;
  }

  function notify(message, kind) {
    const banner = document.getElementById('status-banner');
    if (banner) {
      banner.textContent = message;
      banner.className = 'status-banner' + (kind ? ' ' + kind : '');
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function slug(text) {
    return String(text || 'pagina').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'pagina';
  }

  function debounceSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => window.JERLocalStore.saveState(state).catch((e) => notify(e.message, 'error')), 250);
  }

  async function saveNow() {
    clearTimeout(saveTimer);
    await window.JERLocalStore.saveState(state);
  }

  function elementsByLayoutKey(page, key) {
    if (!key) return null;
    return Array.from(page.querySelectorAll('[data-layout-key]')).find((el) => el.dataset.layoutKey === key) || null;
  }

  function assignLayoutKeys(page) {
    const counters = Object.create(null);
    const selector = '.page-body, .metric-stack, .metric-panel, .metric-chart-wrap, .chart-slot, .general-two-col, .general-card, .card-content, .cover-content, .cover-copy, .activity-list, .narrative-box, .custom-page-copy, .data-table, .detail-table-wrap';
    page.querySelectorAll(selector).forEach((el) => {
      const role = Array.from(el.classList).find((name) => [
        'page-body','metric-stack','metric-panel','metric-chart-wrap','chart-slot','general-two-col','general-card','card-content','cover-content','cover-copy','activity-list','narrative-box','custom-page-copy','data-table','detail-table-wrap'
      ].includes(name)) || 'layout';
      counters[role] = (counters[role] || 0) + 1;
      el.dataset.layoutKey = page.dataset.pageId + '::' + role + ':' + counters[role];
    });
  }

  function assignEditableKeys(page) {
    const pageId = page.dataset.pageId;
    function tag(selector, role) {
      page.querySelectorAll(selector).forEach((element, index) => {
        element.dataset.editKey = pageId + '|' + role + '|' + index;
        const saved = state.edits[element.dataset.editKey];
        if (typeof saved === 'string') element.textContent = saved;
      });
    }
    tag('.page-header h1', 'page-title');
    tag('.cover-copy', 'cover-copy');
    tag('.activity-list li', 'activity-item');
    tag('.narrative-box', 'narrative');
    tag('.page-note', 'page-note');
    tag('.metric-heading', 'metric-heading');
    tag('.general-card h2', 'card-heading');
    tag('.detail-intro', 'detail-intro');
    tag('.close-message strong', 'closing-role');
    tag('.close-message span', 'closing-thanks');
  }

  function createCustomPage(pageData, index) {
    const page = document.createElement('section');
    page.className = 'report-page custom-text-page';
    page.dataset.pageId = pageData.id;
    page.innerHTML = '<header class="page-header"><h1></h1><div class="brand-mark"><img src="' + DEFAULT_LOGO + '" alt="Logotipo JER"></div><span class="period-chip">PÁGINA EDITABLE</span></header><div class="page-body"><div class="custom-page-copy"></div></div><footer class="page-footer"></footer>';
    page.querySelector('.page-header h1').textContent = pageData.title || ('Página nueva ' + (index + 1));
    page.querySelector('.custom-page-copy').textContent = pageData.text || 'Escribe aquí el contenido de esta página.';
    page.querySelector('.page-header h1').dataset.editKey = pageData.id + '|custom-title|0';
    page.querySelector('.custom-page-copy').dataset.editKey = pageData.id + '|custom-text|0';
    if (typeof state.edits[pageData.id + '|custom-title|0'] === 'string') page.querySelector('.page-header h1').textContent = state.edits[pageData.id + '|custom-title|0'];
    if (typeof state.edits[pageData.id + '|custom-text|0'] === 'string') page.querySelector('.custom-page-copy').textContent = state.edits[pageData.id + '|custom-text|0'];
    return page;
  }

  function insertStoredBlocks(page) {
    const pageId = page.dataset.pageId;
    (state.customBlocks || []).filter((block) => block.pageId === pageId).forEach((block) => {
      const parent = elementsByLayoutKey(page, block.parentKey);
      if (!parent) return;
      const node = document.createElement('div');
      node.className = 'editor-text-block';
      node.dataset.customBlockId = block.id;
      node.textContent = block.text || 'Escribe aquí…';
      const before = elementsByLayoutKey(page, block.beforeKey);
      if (before && before.parentElement === parent) parent.insertBefore(node, before);
      else parent.appendChild(node);
    });
  }

  function applyPageOrder() {
    const pages = Array.from(root.querySelectorAll('.report-page'));
    const ids = pages.map((page) => page.dataset.pageId);
    const order = Array.isArray(state.pageOrder) ? state.pageOrder.filter((id) => ids.includes(id)) : [];
    ids.forEach((id) => { if (!order.includes(id)) order.push(id); });
    state.pageOrder = order;
    order.forEach((id) => {
      const page = pages.find((candidate) => candidate.dataset.pageId === id);
      if (page) root.appendChild(page);
    });
  }

  function updatePageNumbers() {
    const pages = Array.from(root.querySelectorAll('.report-page'));
    pages.forEach((page, index) => {
      const footer = page.querySelector('.page-footer');
      if (footer) footer.textContent = (index + 1) + ' / ' + pages.length;
      page.classList.toggle('selected-page', page.dataset.pageId === selectedPageId);
    });
  }

  function applyLogo() {
    const logo = state.logoDataUrl || DEFAULT_LOGO;
    root.querySelectorAll('.brand-mark img').forEach((image) => { image.src = logo; });
  }

  function decorateReport(reportRoot) {
    const existingPages = Array.from(reportRoot.querySelectorAll('.report-page'));
    state.deletedPages = Array.isArray(state.deletedPages) ? state.deletedPages : [];
    existingPages.forEach((page) => {
      if (state.deletedPages.includes(page.dataset.pageId)) page.remove();
    });
    (state.customPages || []).forEach((pageData, index) => {
      reportRoot.appendChild(createCustomPage(pageData, index));
    });
    Array.from(reportRoot.querySelectorAll('.report-page')).forEach((page) => {
      assignLayoutKeys(page);
      assignEditableKeys(page);
    });
    Array.from(reportRoot.querySelectorAll('.report-page')).forEach(insertStoredBlocks);
    Array.from(reportRoot.querySelectorAll('.report-page')).forEach((page) => {
      page.querySelectorAll('[data-edit-key]').forEach((element) => {
        const saved = state.edits[element.dataset.editKey];
        if (typeof saved === 'string') element.textContent = saved;
        element.contentEditable = editing ? 'true' : 'false';
        element.classList.toggle('editing-text', editing);
        element.spellcheck = editing;
      });
      page.querySelectorAll('[data-custom-block-id]').forEach((element) => {
        const block = (state.customBlocks || []).find((candidate) => candidate.id === element.dataset.customBlockId);
        if (block) element.textContent = block.text || '';
        element.contentEditable = editing ? 'true' : 'false';
        element.classList.toggle('editing-text', editing);
        element.spellcheck = editing;
      });
    });
    applyLogo();
    applyPageOrder();
    updatePageNumbers();
    saveNow().catch((e) => console.warn('No se pudo guardar la configuración local:', e));
  }

  function setEditing(enabled) {
    editing = Boolean(enabled);
    editToggle.setAttribute('aria-pressed', String(editing));
    editToggle.textContent = editing ? 'Terminar edición' : 'Editar textos';
    root.querySelectorAll('[data-edit-key]').forEach((element) => {
      element.contentEditable = editing ? 'true' : 'false';
      element.classList.toggle('editing-text', editing);
      element.spellcheck = editing;
    });
    root.querySelectorAll('[data-custom-block-id]').forEach((element) => {
      element.contentEditable = editing ? 'true' : 'false';
      element.classList.toggle('editing-text', editing);
      element.spellcheck = editing;
    });
    notify(editing ? 'Edición activada: pulsa sobre los títulos o textos con borde y modifica su contenido. Los cambios se guardan en este navegador.' : 'Edición de textos desactivada. Los cambios guardados localmente se conservarán en este navegador.', 'success');
  }

  function setInsertMode(enabled) {
    insertMode = Boolean(enabled);
    insertButton.setAttribute('aria-pressed', String(insertMode));
    insertButton.classList.toggle('button-mode-active', insertMode);
    help.hidden = !insertMode;
    help.textContent = 'Modo T activo: haz clic en el bloque o la gráfica donde deseas insertar texto. Se insertará en el flujo del contenido, no como una capa que tape los datos.';
    root.classList.toggle('insert-text-mode', insertMode);
  }

  function chooseInsertionPoint(page, target) {
    let anchor = null;
    let parent = null;
    const chartSlot = target.closest('.chart-slot');
    const panel = target.closest('.metric-panel');
    const card = target.closest('.general-card');
    if (chartSlot) {
      anchor = chartSlot;
      parent = chartSlot.parentElement;
    } else if (panel && panel.parentElement) {
      anchor = panel;
      parent = panel.parentElement;
    } else if (card && card.parentElement) {
      const content = card.querySelector('.card-content');
      if (content) {
        parent = content;
        anchor = content.firstElementChild;
      } else {
        anchor = card;
        parent = card.parentElement;
      }
    } else {
      const block = target.closest('.cover-copy, .activity-list, .narrative-box, .page-note, .custom-page-copy, .detail-table-wrap, .general-two-col, .metric-stack, .cover-content');
      if (block && block.parentElement) {
        anchor = block;
        parent = block.parentElement;
      } else {
        parent = page.querySelector('.page-body');
        anchor = parent ? parent.firstElementChild : null;
      }
    }
    if (!parent) return null;
    const parentKey = parent.dataset.layoutKey;
    const beforeKey = anchor ? anchor.dataset.layoutKey : null;
    return { parent, anchor, parentKey, beforeKey };
  }

  function insertTextBlock(page, target) {
    const point = chooseInsertionPoint(page, target);
    if (!point || !point.parentKey) {
      notify('No se encontró un punto de inserción válido. Haz clic sobre una gráfica, tabla, bloque o espacio de la página.', 'error');
      return;
    }
    const id = 'text-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const block = { id, pageId: page.dataset.pageId, parentKey: point.parentKey, beforeKey: point.beforeKey, text: 'Escribe aquí tu texto…' };
    state.customBlocks.push(block);
    const node = document.createElement('div');
    node.className = 'editor-text-block';
    node.dataset.customBlockId = id;
    node.contentEditable = 'true';
    node.spellcheck = true;
    node.textContent = block.text;
    if (point.anchor && point.anchor.parentElement === point.parent) point.parent.insertBefore(node, point.anchor);
    else point.parent.appendChild(node);
    selectedPageId = page.dataset.pageId;
    updatePageNumbers();
    setInsertMode(false);
    setEditing(true);
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    saveNow().catch((error) => notify(error.message, 'error'));
    notify('Cuadro de texto insertado. Escribe el contenido; se guardará en este navegador.', 'success');
  }

  function ensureSelectedPage() {
    if (!selectedPageId) {
      notify('Primero haz clic en la página que deseas seleccionar.', 'error');
      return null;
    }
    return Array.from(root.querySelectorAll('.report-page')).find((page) => page.dataset.pageId === selectedPageId) || null;
  }

  root.addEventListener('click', (event) => {
    const page = event.target.closest('.report-page');
    if (!page) return;
    if (insertMode) {
      event.preventDefault();
      event.stopPropagation();
      insertTextBlock(page, event.target);
      return;
    }
    selectedPageId = page.dataset.pageId;
    updatePageNumbers();
  }, true);

  root.addEventListener('input', (event) => {
    const element = event.target;
    if (element.dataset.editKey) state.edits[element.dataset.editKey] = element.innerText.replace(/\u00a0/g, ' ');
    if (element.dataset.customBlockId) {
      const block = state.customBlocks.find((candidate) => candidate.id === element.dataset.customBlockId);
      if (block) block.text = element.innerText.replace(/\u00a0/g, ' ');
    }
    debounceSave();
  });

  editToggle.addEventListener('click', () => setEditing(!editing));
  insertButton.addEventListener('click', () => setInsertMode(!insertMode));
  addButton.addEventListener('click', async () => {
    await saveNow();
    const id = 'custom-page-' + Date.now().toString(36);
    state.customPages.push({ id, title: 'Página nueva', text: 'Escribe aquí el contenido de esta página.' });
    state.pageOrder.push(id);
    selectedPageId = id;
    if (window.JERDashboard) await window.JERDashboard.renderCurrent();
    setEditing(true);
    notify('Página de texto agregada. Puedes editar el título y el contenido.', 'success');
  });
  deleteButton.addEventListener('click', async () => {
    const page = ensureSelectedPage();
    if (!page) return;
    const title = page.querySelector('.page-header h1')?.textContent || 'esta página';
    if (!window.confirm('¿Eliminar "' + title + '" del informe y del PDF? Esto no elimina datos de Google Sheets.')) return;
    await saveNow();
    if (page.classList.contains('custom-text-page')) state.customPages = state.customPages.filter((item) => item.id !== selectedPageId);
    else state.deletedPages.push(selectedPageId);
    state.customBlocks = state.customBlocks.filter((block) => block.pageId !== selectedPageId);
    state.pageOrder = state.pageOrder.filter((id) => id !== selectedPageId);
    page.remove();
    selectedPageId = null;
    updatePageNumbers();
    await saveNow();
    notify('Página eliminada de la composición local. Google Sheets no fue modificado.', 'success');
  });
  async function moveSelected(offset) {
    const page = ensureSelectedPage();
    if (!page) return;
    const pages = Array.from(root.querySelectorAll('.report-page'));
    const index = pages.indexOf(page);
    const target = index + offset;
    if (target < 0 || target >= pages.length) return;
    if (offset < 0) root.insertBefore(page, pages[target]);
    else root.insertBefore(pages[target], page);
    state.pageOrder = Array.from(root.querySelectorAll('.report-page')).map((item) => item.dataset.pageId);
    updatePageNumbers();
    await saveNow();
  }
  upButton.addEventListener('click', () => moveSelected(-1));
  downButton.addEventListener('click', () => moveSelected(1));

  logoButton.addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', async () => {
    const file = logoInput.files && logoInput.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      notify('El logo debe ser una imagen PNG, JPG o WebP.', 'error'); logoInput.value = ''; return;
    }
    if (file.size > 3 * 1024 * 1024) {
      notify('El logo supera los 3 MB. Elige una imagen más ligera para guardarla localmente.', 'error'); logoInput.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      state.logoDataUrl = String(reader.result);
      applyLogo();
      try { await saveNow(); notify('Logo actualizado en este navegador. El PDF usará el logo nuevo.', 'success'); }
      catch (error) { notify(error.message, 'error'); }
    };
    reader.onerror = () => notify('No se pudo leer la imagen seleccionada.', 'error');
    reader.readAsDataURL(file);
    logoInput.value = '';
  });

  exportButton.addEventListener('click', async () => {
    try {
      await saveNow();
      const blob = new Blob([JSON.stringify({ format: 'jer-sarlaft-local-v1', exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'configuracion-local-sarlaft-jer.json'; link.click();
      URL.revokeObjectURL(url);
      notify('Copia de la edición exportada. Guárdala en una ubicación segura.', 'success');
    } catch (error) { notify(error.message, 'error'); }
  });
  importButton.addEventListener('click', () => settingsInput.click());
  settingsInput.addEventListener('change', async () => {
    const file = settingsInput.files && settingsInput.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.format !== 'jer-sarlaft-local-v1' || !parsed.state || typeof parsed.state !== 'object') throw new Error('El archivo no parece una copia válida de la edición SARLAFT JER.');
      const confirmed = window.confirm('Importar esta configuración reemplazará los cambios locales actuales. ¿Continuar?');
      if (!confirmed) return;
      state = Object.assign(window.JERLocalStore.defaults(), parsed.state);
      await saveNow();
      if (window.JERDashboard) await window.JERDashboard.renderCurrent();
      notify('Configuración importada correctamente.', 'success');
    } catch (error) { notify('No se pudo importar: ' + error.message, 'error'); }
    finally { settingsInput.value = ''; }
  });

  window.JEREditor = {
    ready: () => readyPromise,
    getState: () => state,
    decorateReport,
    saveNow,
    setEditing,
    setEnabled(enabled) {
      [editToggle, insertButton, addButton, deleteButton, upButton, downButton, logoButton, exportButton, importButton].forEach((button) => { button.disabled = !enabled; });
      if (!enabled) setInsertMode(false);
    },
    hasOverflow() {
      return Array.from(root.querySelectorAll('.report-page')).some((page) => {
        const body = page.querySelector('.page-body');
        if (!body) return false;
        const bodyRect = body.getBoundingClientRect();
        return Array.from(page.querySelectorAll('.editor-text-block, .custom-page-copy')).some((block) => {
          const rect = block.getBoundingClientRect();
          return rect.bottom > bodyRect.bottom + 2 || rect.right > bodyRect.right + 2;
        });
      });
    }
  };
})();
