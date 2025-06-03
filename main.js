// main.js

$(document).ready(function () {
  const STORAGE_KEY = 'memoEnvieData';
  let editingLast = false;

  function getNowTime() {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  }

  function getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  function loadEntries() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function mergeEntries(newEntries) {
    const existing = loadEntries();
    const merged = [...existing];

    newEntries.forEach(newEntry => {
      const duplicate = existing.find(e =>
        e.date === newEntry.date &&
        e.time === newEntry.time &&
        e.type === newEntry.type
      );
      if (!duplicate) {
        merged.push(newEntry);
      }
    });

    merged.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return dateTimeA - dateTimeB;
    });

    saveEntries(merged);
  }



  function getLastEntry() {
    const entries = loadEntries();
    return entries.length ? entries[entries.length - 1] : null;
  }

  function createEntryFromForm() {
    return {
      date: $('#entry-date').val(),
      time: $('#entry-time').val() || getNowTime(),
      intensity: $('#entry-intensity').val(),
      type: $('#entry-type').prop('disabled') ? null : $('#entry-type').val(),
      resisted: $('#entry-resisted').is(':checked'),
      strategy: $('#entry-strategy').val().trim(),
      comment: $('#entry-comment').val().trim()
    };
  }

  function fillForm(entry) {
    $('#entry-date').val(entry.date);
    $('#entry-time').val(entry.time);
    $('#entry-intensity').val(entry.intensity);
    $('#entry-type').val(entry.type);
    $('#entry-resisted').prop('checked', entry.resisted).trigger('change');
    $('#entry-strategy').val(entry.strategy);
    $('#entry-comment').val(entry.comment);
  }

  function clearForm() {
    $('#entry-form')[0].reset();
    $('#entry-date').val(getTodayDate());
    $('#entry-time').val(getNowTime());
    $('#entry-resisted').prop('checked', false).trigger('change');
    $('#edit-alert').hide();
    editingLast = false;
  }

  $('#main-button').on('click', function () {
    clearForm();
    $('#entryModal').modal('show');
  });

  $('#entry-form').on('submit', function (e) {
    e.preventDefault();
    const entry = createEntryFromForm();
    const entries = loadEntries();
    if (editingLast && entries.length) {
      entries[entries.length - 1] = entry;
    } else {
      entries.push(entry);
    }
    saveEntries(entries);
    $('#entryModal').modal('hide');
    editingLast = false;
  });

  $('#entry-resisted').on('change', function () {
    const resisted = $(this).is(':checked');
    const typeSelect = $('#entry-type');
    if (resisted) {
      typeSelect.val('');
      typeSelect.prop('disabled', true);
      typeSelect.removeAttr('required');
    } else {
      typeSelect.prop('disabled', false);
      typeSelect.attr('required', true);
    }
  });

  $('#menu-edit-last').on('click', function (e) {
    e.preventDefault();
    const last = getLastEntry();
    if (!last) {
      alert("Aucune donnée enregistrée.");
      return;
    }
    fillForm(last);
    $('#edit-alert').show();
    $('#entryModal').modal('show');
    editingLast = true;
  });

  $('#menu-export-json').on('click', function (e) {
    e.preventDefault();
    const data = loadEntries();
    const json = JSON.stringify(data, null, 2);
    showModal('Export JSON', `<pre>${json}</pre>`);
  });

  $('#menu-export-csv').on('click', function (e) {
    e.preventDefault();
    const data = loadEntries();
    const headers = ['date', 'time', 'intensity', 'type', 'resisted', 'strategy', 'comment'];
    const csv = [headers.join(',')].concat(data.map(e => headers.map(h => JSON.stringify(e[h] || '')).join(','))).join('\n');
    showModal('Export CSV', `<pre>${csv}</pre>`);
  });

  $('#menu-import-json').on('click', function (e) {
    e.preventDefault();
    const html = `
      <textarea id="import-json" class="form-control" rows="10"></textarea>
      <button id="import-btn" class="btn btn-primary mt-2">Importer</button>
    `;
    showModal('Importer JSON', html);

    $(document).off('click', '#import-btn').on('click', '#import-btn', function () {
      try {
        const json = JSON.parse($('#import-json').val());
        if (!Array.isArray(json)) throw new Error();
        saveEntries(json);
        alert('Import réussi.');
        $('.modal').modal('hide');
      } catch {
        alert('Format JSON invalide.');
      }
    });
  });

  $('#menu-merge-json').on('click', function (e) {
    e.preventDefault();
    const html = `
      <textarea id="merge-json" class="form-control" rows="10"></textarea>
      <button id="merge-btn" class="btn btn-primary mt-2">Merger</button>
    `;
    showModal('Merger JSON', html);

    $(document).off('click', '#merge-btn').on('click', '#merge-btn', function () {
      try {
        const json = JSON.parse($('#merge-json').val());
        if (!Array.isArray(json)) throw new Error();
        mergeEntries(json);
        alert('Merge réussi.');
        $('.modal').modal('hide');
      } catch {
        alert('Format JSON invalide.');
      }
    });
  });
























  $('#menu-stats').on('click', function (e) {
    e.preventDefault();
    const entries = loadEntries();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const month = now.getMonth();

    const groups = { today: [], week: [], month: [] };

    entries.forEach(entry => {
      const d = new Date(entry.date);
      if (entry.date === today) groups.today.push(entry);
      if (d >= weekStart) groups.week.push(entry);
      if (d.getMonth() === month) groups.month.push(entry);
    });

    const html = Object.entries(groups).map(([label, list]) => {
      const resisted = list.filter(e => e.resisted).length;
      const percent = list.length ? Math.round(resisted / list.length * 1000) / 10 : 0;
      const strategies = countBy(list.map(e => e.strategy || 'Aucune'));
      const stratList = Object.entries(strategies)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} (${v})`)
        .join(', ');
      const rows = list.map(e => `<tr><td>${e.time}</td><td>${e.type || '—'}</td><td>${e.resisted ? 'oui' : 'non'}</td><td>${e.strategy || '—'}</td></td><td>${e.comment || '—'}</td></tr>`).join('');
      return `
        <div class="accordion-item">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#${label}-stats">
              ${label.toUpperCase()} : ${list.length} envies, ${resisted} résistées : ${percent}%
            </button>
          </h2>
          <div id="${label}-stats" class="accordion-collapse collapse">
            <div class="accordion-body">
              <p><strong>Stratégies utilisées :</strong> ${stratList || '—'}</p>
              <table class="table table-borderless">
                <thead><tr><th>Heure</th><th>Type</th><th>Résisté ?</th><th>Stratégie</th><th>Commentaire</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join('');

    showModal('Statistiques', `<div class="accordion">${html}</div>`);
  });

  function countBy(arr) {
    return arr.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
  }

  function showModal(title, body) {
    const id = 'dynamicModal';
    const modal = `
      <div class="modal fade" id="${id}" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">${body}</div>
          </div>
        </div>
      </div>`;
    $('#dynamic-modals').html(modal);
    const m = new bootstrap.Modal(document.getElementById(id));
    m.show();
  }

  clearForm();

  window.memoEnvie = {
    getEntries: loadEntries,
    saveEntries: saveEntries,
    getLastEntry: getLastEntry,
    fillForm: fillForm
  };
});
