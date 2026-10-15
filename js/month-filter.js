(function () {
  'use strict';
  const MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const LABELS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const PRESETS = {
    ALL: MONTHS.slice(), Q1: MONTHS.slice(0, 3), Q2: MONTHS.slice(3, 6), Q3: MONTHS.slice(6, 9), Q4: MONTHS.slice(9, 12),
    H1: MONTHS.slice(0, 6), H2: MONTHS.slice(6, 12)
  };
  let selected = MONTHS.slice();
  const toggle = document.getElementById('month-toggle');
  const popover = document.getElementById('month-popover');
  const checkboxes = document.getElementById('month-checkboxes');
  const count = document.getElementById('month-selected-count');

  function renderCheckboxes() {
    checkboxes.innerHTML = MONTHS.map((month, index) => '<label class="month-check"><input type="checkbox" value="' + month + '" ' + (selected.includes(month) ? 'checked' : '') + '><span>' + LABELS[index] + '</span></label>').join('');
    checkboxes.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => {
      const values = Array.from(checkboxes.querySelectorAll('input:checked')).map((el) => el.value);
      selected = MONTHS.filter((month) => values.includes(month));
      updateSummary();
    }));
    updateSummary();
  }
  function updateSummary() {
    const all = selected.length === 12;
    const summary = all ? 'Todos' : selected.length === 0 ? 'Ninguno' : selected.map((month) => LABELS[MONTHS.indexOf(month)].slice(0, 3)).join(', ');
    toggle.textContent = 'Meses: ' + summary;
    count.textContent = selected.length + (selected.length === 1 ? ' mes seleccionado' : ' meses seleccionados');
  }
  function set(values) {
    selected = MONTHS.filter((month) => values.includes(month));
    renderCheckboxes();
  }
  toggle.addEventListener('click', () => {
    const open = popover.hidden;
    popover.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('month-done').addEventListener('click', () => {
    if (!selected.length) {
      window.JERDashboard?.setStatus('Selecciona por lo menos un mes.', 'error');
      return;
    }
    popover.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.month-preset').forEach((button) => button.addEventListener('click', () => set(PRESETS[button.dataset.preset] || MONTHS)));
  renderCheckboxes();
  window.JERMonthFilter = {
    getSelection: () => MONTHS.filter((month) => selected.includes(month)),
    setSelection: set,
    getLabel: () => selected.length === 12 ? 'TODOS LOS MESES' : selected.map((month) => LABELS[MONTHS.indexOf(month)].toUpperCase()).join(' · '),
    monthOrder: MONTHS.slice()
  };
})();
