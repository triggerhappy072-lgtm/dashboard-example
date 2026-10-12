(() => {
  const root = document.querySelector('.rp-page');
  if (!root) return;

  const key = 'next-step-raid-protection-v1';
  const defaults = {
    detectEnabled: false, joinCount: 10, joinWindow: 60, ignoreTrusted: true,
    verifyEnabled: false, minimumAge: 7, verificationAction: 'review',
    verifyOnlyRaid: true, response: 'alert', lockdownDuration: 15,
    cooldown: 5, alertChannel: '', mentionRole: '', exemptRoles: ''
  };
  const safeLoad = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return { ...defaults, ...saved };
    } catch {}
    return { ...defaults };
  };
  let stored = safeLoad();
  const unsaved = document.getElementById('rp-unsaved');
  const fields = [...root.querySelectorAll('[data-rp-field]')];
  const radioFields = [...root.querySelectorAll('input[name="rp-response"]')];
  const numeric = new Set(['joinCount', 'joinWindow', 'minimumAge', 'lockdownDuration', 'cooldown']);
  const summaries = {
    detection: {
      enabled: state => state.detectEnabled,
      text: state => state.detectEnabled ? `${state.joinCount} joins in ${state.joinWindow} seconds` : 'Off · Detect unusually fast member joins'
    },
    verification: {
      enabled: state => state.verifyEnabled,
      text: state => state.verifyEnabled ? `Review accounts younger than ${state.minimumAge} days` : 'Off · Optional account and CAPTCHA checks'
    },
    response: {
      enabled: state => state.response !== 'alert',
      text: state => ({
        alert: 'Alert moderators · No automatic restrictions',
        lockdown: `Temporary join lockdown · ${state.lockdownDuration} min`,
        restrict: `Temporarily restrict new members · ${state.lockdownDuration} min`
      })[state.response] || 'Alert moderators · No automatic restrictions'
    },
    alerts: {
      enabled: state => !!state.alertChannel.trim(),
      text: state => state.alertChannel.trim() ? `Send alerts to ${state.alertChannel.trim()}` : 'Choose a moderation channel and trusted roles'
    }
  };

  function readForm() {
    const draft = {};
    fields.forEach(field => {
      const name = field.dataset.rpField;
      draft[name] = field.type === 'checkbox' ? field.checked :
        numeric.has(name) ? Number(field.value) : field.value;
    });
    draft.response = radioFields.find(field => field.checked)?.value || 'alert';
    return draft;
  }
  function populate(state) {
    fields.forEach(field => {
      const value = state[field.dataset.rpField];
      if (field.type === 'checkbox') field.checked = !!value;
      else field.value = String(value ?? '');
    });
    radioFields.forEach(field => { field.checked = field.value === state.response; });
    syncSummaries(state);
    unsaved.hidden = true;
  }
  function syncSummaries(state) {
    let enabledCount = 0;
    Object.entries(summaries).forEach(([name, config]) => {
      const enabled = config.enabled(state);
      if (enabled) enabledCount += 1;
      root.querySelector(`[data-rp-summary="${name}"]`).textContent = config.text(state);
      const status = root.querySelector(`[data-rp-status="${name}"]`);
      status.textContent = enabled ? 'Configured' : name === 'response' || name === 'alerts' ? 'Review' : 'Off';
      status.classList.toggle('on', enabled);
    });
    document.getElementById('rp-enabled-count').textContent = `${enabledCount} of 4 configured`;
  }
  function isDirty(state) {
    return Object.keys(defaults).some(name => String(state[name]) !== String(stored[name]));
  }
  function onEdit() {
    const draft = readForm();
    syncSummaries(draft);
    unsaved.hidden = !isDirty(draft);
  }
  root.querySelectorAll('[data-rp-open]').forEach(button => {
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      root.querySelectorAll('[data-rp-open]').forEach(other => {
        other.setAttribute('aria-expanded', 'false');
        document.getElementById('rp-panel-' + other.dataset.rpOpen).hidden = true;
      });
      button.setAttribute('aria-expanded', String(!open));
      document.getElementById('rp-panel-' + button.dataset.rpOpen).hidden = open;
    });
  });
  fields.forEach(field => {
    field.addEventListener('input', onEdit);
    field.addEventListener('change', onEdit);
  });
  radioFields.forEach(field => field.addEventListener('change', onEdit));
  document.getElementById('rp-discard').addEventListener('click', () => populate(stored));
  document.getElementById('rp-save').addEventListener('click', () => {
    const draft = readForm();
    const ranges = [
      ['joinCount', 2, 1000],
      ['joinWindow', 10, 600],
      ['minimumAge', 0, 3650],
      ['lockdownDuration', 5, 120],
      ['cooldown', 1, 30]
    ];
    for (const [field, min, max] of ranges) {
      if (!Number.isFinite(draft[field]) || draft[field] < min || draft[field] > max) {
        window.showNotification?.(`Please enter a valid value for ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
        root.querySelector(`[data-rp-field="${field}"]`).focus();
        return;
      }
    }
    try {
      localStorage.setItem(key, JSON.stringify(draft));
      stored = draft;
      populate(stored);
      window.showNotification?.('Raid Protection preferences saved locally. Bot integration is still required.');
    } catch {
      window.showNotification?.('Could not save Raid Protection settings in this browser.');
    }
  });
  document.getElementById('rp-run-simulation').addEventListener('click', () => {
    const state = readForm();
    const joins = Number(document.getElementById('rp-try-joins').value);
    const seconds = Number(document.getElementById('rp-try-seconds').value);
    const output = document.getElementById('rp-simulation-result');
    output.hidden = false;
    const valid = Number.isFinite(joins) && Number.isFinite(seconds) && joins >= 0 && seconds >= 1;
    if (!valid) {
      output.textContent = 'Enter a nonnegative join count and a time of at least one second.';
      output.classList.add('warn');
      return;
    }
    if (!state.detectEnabled) {
      output.textContent = 'Raid detection is currently disabled in these settings. Enable it to simulate a possible trigger.';
      output.classList.add('warn');
      return;
    }
    const triggered = joins >= state.joinCount && seconds <= state.joinWindow;
    output.classList.toggle('warn', triggered);
    output.textContent = triggered ?
      `Would trigger: ${joins} joins in ${seconds} seconds meets your threshold of ${state.joinCount} joins within ${state.joinWindow} seconds. This is a local simulation only.` :
      `Would not trigger: ${joins} joins in ${seconds} seconds does not meet the configured join-wave threshold. This is a local simulation only.`;
  });
  populate(stored);
})();
