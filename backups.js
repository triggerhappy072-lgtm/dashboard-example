(() => {
  const root = document.querySelector('.bu-page');
  if (!root) return;

  // Deliberately share General Settings' documented local backup format.
  // The existing General Settings page and script are not modified.
  const prefix = 'next-step-general-';
  const storageKey = name => prefix + name;
  const localHistoryKey = storageKey('backup-history');
  const mapping = {
    language: 'language',
    customLanguages: 'custom-languages',
    customTranslations: 'custom-translations',
    dateFormat: 'date-format',
    managerRoles: 'manager-roles',
    errorTypes: 'error-types',
    permissionSubjects: 'permission-subjects',
    permissionGrants: 'permission-grants',
    backupPreferences: 'backup-preferences'
  };
  const defaults = {
    language: 'en', customLanguages: [], customTranslations: {},
    dateFormat: 'DD/MM/YYYY - HH:mm:ss', managerRoles: [],
    errorTypes: { 'Cannot send message to this user': true, 'Unknown message': true, 'Unknown member': true },
    permissionSubjects: [], permissionGrants: {},
    backupPreferences: { interval: '24h', parts: { bot: true, server: true, channels: true, roles: true } }
  };
  const notify = text => {
    if (typeof window.showNotification === 'function') window.showNotification(text);
    else setStatus(text);
  };
  const setStatus = message => {
    const node = document.getElementById('bu-preference-state');
    if (node) node.textContent = message;
  };
  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(storageKey(key));
      return value === null ? fallback : JSON.parse(value);
    } catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(storageKey(key), JSON.stringify(value));
  const safeHistory = () => {
    const data = read('backup-history', []);
    return Array.isArray(data) ? data.filter(entry => entry && entry.backup && entry.backup.settings && entry.createdAt) : [];
  };
  let history = safeHistory();
  const historyElement = document.getElementById('bu-history');
  const dialog = document.getElementById('bu-dialog');
  const dialogTitle = document.getElementById('bu-dialog-title');
  const dialogContent = document.getElementById('bu-dialog-content');
  const confirmButton = document.getElementById('bu-dialog-confirm');
  const interval = document.getElementById('bu-interval');
  const partInputs = [...root.querySelectorAll('[data-bu-part]')];
  let queuedAction = null;
  let preferences = read('backup-preferences', defaults.backupPreferences);
  if (!preferences || typeof preferences !== 'object') preferences = defaults.backupPreferences;

  function makeBackup() {
    const settings = Object.fromEntries(Object.entries(mapping).map(([name, key]) => [name, read(key, defaults[name])]));
    return { app: 'Next Step Dashboard', version: 1, createdAt: new Date().toISOString(), settings };
  }
  function saveHistory() {
    write('backup-history', history);
    renderHistory();
  }
  function filenameFrom(text) {
    return String(text).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\s+/g, '-').slice(0, 85) || 'next-step-settings';
  }
  function downloadJSON(json, filename) {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filenameFrom(filename) + '.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function validateBackup(value) {
    if (!value || value.app !== 'Next Step Dashboard' || !value.settings ||
        typeof value.settings !== 'object' || Array.isArray(value.settings)) {
      throw new Error('This is not a compatible Next Step settings backup.');
    }
    const settings = value.settings;
    if (!Object.keys(mapping).some(name => Object.prototype.hasOwnProperty.call(settings, name))) {
      throw new Error('No supported settings were found in this backup.');
    }
    const arrayFields = ['customLanguages', 'managerRoles', 'permissionSubjects'];
    const objectFields = ['customTranslations', 'errorTypes', 'permissionGrants', 'backupPreferences'];
    for (const field of arrayFields) {
      if (field in settings && !Array.isArray(settings[field])) throw new Error('Invalid ' + field + ' format.');
    }
    if (settings.managerRoles?.some(role => typeof role !== 'string')) {
      throw new Error('Manager roles must be text values.');
    }
    if (settings.permissionSubjects?.some(subject => !subject || typeof subject !== 'object' || typeof subject.id !== 'string' || typeof subject.name !== 'string')) {
      throw new Error('Invalid permission subjects format.');
    }
    for (const field of objectFields) {
      if (field in settings && (!settings[field] || typeof settings[field] !== 'object' || Array.isArray(settings[field]))) {
        throw new Error('Invalid ' + field + ' format.');
      }
    }
    for (const field of ['language', 'dateFormat']) {
      if (field in settings && typeof settings[field] !== 'string') throw new Error('Invalid ' + field + ' format.');
    }
    if ('backupPreferences' in settings) {
      const preference = settings.backupPreferences;
      const validIntervals = ['15m', '1h', '6h', '12h', '24h', 'manual'];
      if (!validIntervals.includes(preference.interval) || !preference.parts ||
          typeof preference.parts !== 'object' || Array.isArray(preference.parts)) {
        throw new Error('Invalid backup preferences format.');
      }
    }
    return value;
  }
  function addBackup(backup, name) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(name).slice(0, 120),
      createdAt: backup.createdAt || new Date().toISOString(),
      backup
    };
    history.unshift(entry);
    try {
      saveHistory();
    } catch (error) {
      history.shift();
      throw new Error('Could not save this backup to browser storage. Try exporting the file instead.');
    }
    return entry;
  }
  function prettyTime(time) {
    const date = new Date(time);
    return Number.isFinite(date.getTime()) ?
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Date unknown';
  }
  function makeButton(label, action, entryId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset[action] = entryId;
    return button;
  }
  function renderHistory() {
    historyElement.replaceChildren();
    const count = history.length;
    document.getElementById('bu-count').textContent = String(count);
    document.getElementById('bu-history-count').textContent = count + (count === 1 ? ' backup' : ' backups');
    document.getElementById('bu-last').textContent = count ? prettyTime(history[0].createdAt) : 'None yet';
    if (count === 0) {
      historyElement.innerHTML = '<div class="bu-empty"><span aria-hidden="true">◎</span><strong>No local backups yet</strong><p>Create a settings backup or import a compatible JSON file to see it here.</p></div>';
      return;
    }
    history.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'bu-history-row';
      const icon = document.createElement('span');
      icon.className = 'bu-file-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 2h9l4 4v16H6zM15 2v5h4M9 12h7M9 16h7"/></svg>';
      const details = document.createElement('div');
      details.className = 'bu-file-details';
      const title = document.createElement('strong');
      title.textContent = entry.name;
      const date = document.createElement('small');
      date.textContent = prettyTime(entry.createdAt) + ' · Local settings';
      details.append(title, date);
      const actions = document.createElement('div');
      actions.className = 'bu-file-actions';
      actions.append(
        makeButton('Restore', 'buRestore', entry.id),
        makeButton('Download', 'buDownload', entry.id),
        makeButton('Remove', 'buDelete', entry.id)
      );
      row.append(icon, details, actions);
      historyElement.append(row);
    });
  }
  function openDialog(title, message, buttonText, callback, danger = false) {
    dialogTitle.textContent = title;
    dialogContent.replaceChildren();
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    dialogContent.append(paragraph);
    queuedAction = callback;
    confirmButton.textContent = buttonText;
    confirmButton.classList.toggle('bu-danger', danger);
    dialog.showModal();
  }
  document.getElementById('bu-dialog-close').addEventListener('click', () => dialog.close());
  document.getElementById('bu-dialog-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { queuedAction = null; });
  confirmButton.addEventListener('click', () => {
    const action = queuedAction;
    if (action) action();
    dialog.close();
  });
  historyElement.addEventListener('click', event => {
    const button = event.target.closest('button[data-bu-restore], button[data-bu-download], button[data-bu-delete]');
    if (!button) return;
    const id = button.dataset.buRestore || button.dataset.buDownload || button.dataset.buDelete;
    const entry = history.find(item => String(item.id) === String(id));
    if (!entry) return;
    if (button.hasAttribute('data-bu-download')) {
      downloadJSON(entry.backup, entry.name);
      return;
    }
    if (button.hasAttribute('data-bu-delete')) {
      openDialog('Remove local backup', `Remove "${entry.name}" from local backup history? This does not change your dashboard's current settings.`, 'Remove backup', () => {
        const previous = history;
        history = history.filter(item => item.id !== entry.id);
        try { saveHistory(); } catch { history = previous; renderHistory(); notify('Could not remove this local backup.'); }
      }, true);
      return;
    }
    openDialog('Restore dashboard settings', `Restore "${entry.name}" to your browser? This will replace the supported General Settings values on this device. It will not change any Discord server data, and it will not delete the General Settings page.`, 'Restore local settings', () => {
      try {
        validateBackup(entry.backup);
        const presentSettings = makeBackup();
        const values = Object.entries(mapping)
          .filter(([field]) => Object.prototype.hasOwnProperty.call(entry.backup.settings, field))
          .map(([field, key]) => [storageKey(key), JSON.stringify(entry.backup.settings[field])]);
        const originalValues = values.map(([storageKeyName]) => [storageKeyName, localStorage.getItem(storageKeyName)]);
        try {
          addBackup(presentSettings, 'Before restore · ' + prettyTime(presentSettings.createdAt));
          for (const [storageKeyName, value] of values) localStorage.setItem(storageKeyName, value);
        } catch (error) {
          originalValues.forEach(([name, value]) => {
            try { if (value === null) localStorage.removeItem(name); else localStorage.setItem(name, value); } catch {}
          });
          throw error;
        }
        preferences = read('backup-preferences', defaults.backupPreferences);
        applyPreferences();
        notify('Supported dashboard settings restored locally. Reload General Settings to see the changes.');
      } catch (error) {
        notify(error.message || 'Could not restore this backup.');
      }
    });
  });

  document.getElementById('bu-create').addEventListener('click', () => {
    const backup = makeBackup();
    try {
      addBackup(backup, 'Next Step ' + prettyTime(backup.createdAt));
      notify('Dashboard settings backup saved in this browser.');
    } catch (error) { notify(error.message); }
  });
  document.getElementById('bu-export').addEventListener('click', () => {
    const backup = makeBackup();
    downloadJSON(backup, 'next-step-backup-' + backup.createdAt.slice(0, 10));
    notify('Current dashboard settings exported as JSON.');
  });
  document.getElementById('bu-import').addEventListener('change', async event => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('This file is too large to import (2 MB maximum).');
      const backup = validateBackup(JSON.parse(await file.text()));
      addBackup(backup, file.name.replace(/\.json$/i, ''));
      notify('Backup imported to local history. Current dashboard settings were not changed.');
    } catch (error) { notify(error.message || 'Could not import this JSON file.'); }
    finally { input.value = ''; }
  });

  function applyPreferences() {
    const current = preferences && typeof preferences === 'object' ? preferences : defaults.backupPreferences;
    const options = [...interval.options].map(option => option.value);
    interval.value = options.includes(current.interval) ? current.interval : '24h';
    partInputs.forEach(input => {
      input.checked = current.parts?.[input.dataset.buPart] !== false;
    });
  }
  document.getElementById('bu-save-preferences').addEventListener('click', () => {
    const parts = Object.fromEntries(partInputs.map(input => [input.dataset.buPart, input.checked]));
    preferences = { ...preferences, interval: interval.value, parts: { ...preferences.parts, ...parts } };
    try {
      write('backup-preferences', preferences);
      setStatus('Preference saved locally. No server backups have been scheduled.');
      window.showNotification?.('Server backup preferences saved locally. Backend integration is still required.');
    } catch {
      setStatus('Could not save backup preferences in this browser.');
    }
  });

  applyPreferences();
  renderHistory();
})();
