(() => {
  'use strict';
  const root = document.getElementById('br-page');
  if (!root) return;

  const $ = id => document.getElementById(id);
  const key = 'next-step-bump-reminders-v2';
  const oldKey = 'next-step-bump-reminders-v1';
  const defaults = {
    enabled: false,
    service: 'DISBOARD',
    command: '/bump',
    channel: '#bump',
    role: '',
    interval: '120',
    mode: 'once',
    repeatInterval: '30',
    message: '{role} It\'s time to bump **{server}**! Use {command} to help us grow. ✨'
  };
  const optionValues = {
    service: ['DISBOARD','Discadia','Custom'],
    interval: ['60','90','120','180','240','360'],
    mode: ['once','repeat'],
    repeatInterval: ['15','30','60','120']
  };
  const form = $('br-form');
  const clone = object => JSON.parse(JSON.stringify(object));
  const clean = value => String(value ?? '').trim();
  const formatTime = date => new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date);
  const formatDuration = minutes => {
    const m = Math.ceil(Math.max(0,minutes));
    if (!m) return 'Now';
    const h = Math.floor(m / 60);
    const remainder = m % 60;
    if (!h) return m + ' min';
    return h + ' hr' + (remainder ? ' ' + remainder + ' min' : '');
  };

  let toastTimer;
  function notify(message) {
    const el = $('br-toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }
  function normalize(value) {
    const result = { ...defaults };
    if (!value || typeof value !== 'object') return result;
    for (const name of Object.keys(defaults)) {
      if (name === 'enabled') result.enabled = value.enabled === true;
      else if (typeof value[name] === 'string') result[name] = value[name];
    }
    for (const [name,allowed] of Object.entries(optionValues)) {
      if (!allowed.includes(result[name])) result[name] = defaults[name];
    }
    result.channel = result.channel.slice(0,100);
    result.role = result.role.slice(0,100);
    result.command = result.command.slice(0,80);
    result.message = result.message.slice(0,1500);
    return result;
  }
  function readState() {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      if (stored && typeof stored === 'object') {
        return {
          settings: normalize(stored.settings),
          history: Array.isArray(stored.history) ? stored.history.filter(x =>
            x && typeof x.id === 'string' && Number.isFinite(x.at) &&
            x.at > 0 && x.at <= Date.now()).slice(0,100) : []
        };
      }
      const old = JSON.parse(localStorage.getItem(oldKey) || 'null');
      if (old && typeof old === 'object') return {settings:normalize(old),history:[]};
    } catch {}
    return {settings:clone(defaults),history:[]};
  }
  const state = readState();
  let saved = clone(state.settings);
  let history = [...state.history].sort((a,b)=>b.at-a.at);

  function persist(settings=saved) {
    try {
      localStorage.setItem(key,JSON.stringify({settings,history}));
      return true;
    } catch {
      notify('Could not save changes.');
      return false;
    }
  }
  function fill(settings) {
    for (const [name,value] of Object.entries(settings)) {
      const input = form.elements.namedItem(name);
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value;
    }
    update();
  }
  function current() {
    return normalize({
      enabled: form.elements.namedItem('enabled').checked,
      service: form.elements.namedItem('service').value,
      command: clean(form.elements.namedItem('command').value),
      channel: clean(form.elements.namedItem('channel').value),
      role: clean(form.elements.namedItem('role').value),
      interval: form.elements.namedItem('interval').value,
      mode: form.elements.namedItem('mode').value,
      repeatInterval: form.elements.namedItem('repeatInterval').value,
      message: form.elements.namedItem('message').value
    });
  }
  function lastBump() { return history.length ? history[0].at : null; }
  function preview(settings) {
    const values = {
      role: settings.role || '@bump-team',
      server: 'Your server',
      minutes: settings.interval,
      command: settings.command || '/bump',
      channel: settings.channel || '#bump'
    };
    return settings.message.replace(/\{(role|server|minutes|command|channel)\}/gi,(match,name)=>values[name.toLowerCase()] ?? match);
  }
  function updatePreview(settings) {
    $('br-preview-text').textContent = preview(settings);
    $('br-preview-location').textContent = settings.channel || '#channel';
    $('br-message-length').textContent = form.elements.namedItem('message').value.length + ' / 1500';
    $('br-repeat-field').hidden = settings.mode !== 'repeat';
  }
  function updateCycle(settings) {
    const last = lastBump();
    const enabled = settings.enabled;
    $('br-status').textContent = enabled ? 'Enabled' : 'Paused';
    $('br-status').classList.toggle('br-ready',enabled);
    $('br-status-detail').textContent = enabled ?
      (settings.mode === 'repeat' ? 'Repeating reminders' : 'One reminder per bump') :
      'Reminders are turned off';
    $('br-total').textContent = history.length.toLocaleString();
    if (!last) {
      $('br-next-time').textContent = 'Not recorded';
      $('br-next-detail').textContent = 'Record a bump to start tracking';
      $('br-cycle-state').textContent = 'No bump recorded';
      $('br-cycle-percent').textContent = '0%';
      $('br-progress').style.width = '0%';
      $('br-cycle-start').textContent = 'Last bump —';
      $('br-cycle-end').textContent = 'Next bump —';
      return;
    }
    const intervalMs = Number(settings.interval) * 60000;
    const dueAt = last + intervalMs;
    const now = Date.now();
    const progress = Math.max(0,Math.min(100,((now-last)/intervalMs)*100));
    const ready = now >= dueAt;
    $('br-next-time').textContent = ready ? 'Ready to bump' : formatDuration((dueAt-now)/60000);
    $('br-next-time').classList.toggle('br-ready',ready);
    $('br-next-detail').textContent = ready ? 'Cooldown complete' : 'Until the next bump';
    $('br-cycle-state').textContent = ready ? 'Bump available' : 'Cooldown in progress';
    $('br-cycle-percent').textContent = Math.round(progress) + '%';
    $('br-progress').style.width = progress + '%';
    $('br-cycle-start').textContent = 'Last: ' + formatTime(new Date(last));
    $('br-cycle-end').textContent = 'Ready: ' + formatTime(new Date(dueAt));
  }
  function update() {
    const data = current();
    const dirty = JSON.stringify(data) !== JSON.stringify(saved);
    $('br-saved-label').textContent = dirty ? 'Unsaved changes' : 'Saved';
    $('br-saved-label').classList.toggle('br-dirty',dirty);
    $('br-dirty-text').textContent = dirty ? 'Unsaved changes' : '';
    $('br-reset').disabled = !dirty;
    updatePreview(data);
    updateCycle(data);
  }
  function renderHistory() {
    const container = $('br-history');
    container.replaceChildren();
    $('br-clear-history').hidden = history.length === 0;
    if (!history.length) {
      const empty = document.createElement('li');
      empty.className = 'br-empty';
      empty.textContent = 'No bumps recorded yet.';
      container.append(empty);
      return;
    }
    history.slice(0,8).forEach((item,index)=>{
      const row = document.createElement('li');
      const icon = document.createElement('span');
      icon.className = 'br-history-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent = '↗';
      const copy = document.createElement('div');
      copy.className = 'br-history-copy';
      const name = document.createElement('strong');
      name.textContent = index===0 ? 'Latest bump' : 'Server bumped';
      const time = document.createElement('small');
      time.textContent = formatTime(new Date(item.at));
      copy.append(name,time);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'br-history-remove';
      remove.dataset.brDelete = item.id;
      remove.setAttribute('aria-label','Remove bump from ' + time.textContent);
      remove.textContent = 'Remove';
      row.append(icon,copy,remove);
      container.append(row);
    });
  }
  function record(at) {
    if (!Number.isFinite(at) || at <= 0 || at > Date.now()) {
      notify('Choose a date and time that has already passed.');
      return;
    }
    const before = [...history];
    history.unshift({id:'bump-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),at});
    history.sort((a,b)=>b.at-a.at);
    history = history.slice(0,100);
    if (!persist()) { history = before; return; }
    renderHistory();
    updateCycle(current());
    $('br-time-form').hidden = true;
    notify('Bump recorded.');
  }
  form.addEventListener('input',update);
  form.addEventListener('change',update);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const data = current();
    if (!clean(data.command)) {
      notify('Enter a bump command.');
      form.elements.namedItem('command').focus();
      return;
    }
    if (data.enabled && !clean(data.channel)) {
      notify('Choose a reminder channel.');
      form.elements.namedItem('channel').focus();
      return;
    }
    if (!clean(data.message)) {
      notify('Enter a reminder message.');
      form.elements.namedItem('message').focus();
      return;
    }
    if (!persist(data)) return;
    saved = clone(data);
    update();
    notify('Bump reminders saved.');
  });
  $('br-reset').addEventListener('click',()=>fill(saved));
  $('br-variables').addEventListener('click',event=>{
    const button = event.target.closest('[data-br-variable]');
    if (!button) return;
    const input = form.elements.namedItem('message');
    const token = '{' + button.dataset.brVariable + '}';
    input.focus();
    input.setRangeText(token,input.selectionStart,input.selectionEnd,'end');
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  $('br-record').addEventListener('click',()=>record(Date.now()));
  $('br-set-time').addEventListener('click',()=>{
    $('br-time-form').hidden = false;
    const date = new Date();
    const localDate = new Date(date.getTime()-date.getTimezoneOffset()*60000);
    $('br-bump-time').max = localDate.toISOString().slice(0,16);
    $('br-bump-time').value = localDate.toISOString().slice(0,16);
    $('br-bump-time').focus();
  });
  $('br-cancel-time').addEventListener('click',()=>{$('br-time-form').hidden=true;});
  $('br-time-form').addEventListener('submit',event=>{
    event.preventDefault();
    record(new Date($('br-bump-time').value).getTime());
  });
  $('br-history').addEventListener('click',event=>{
    const button = event.target.closest('[data-br-delete]');
    if (!button) return;
    const old = [...history];
    history = history.filter(item=>item.id!==button.dataset.brDelete);
    if (!persist()) { history=old; return; }
    renderHistory();
    updateCycle(current());
    notify('Bump removed.');
  });
  $('br-clear-history').addEventListener('click',()=>{
    if (!history.length || !window.confirm('Clear all recorded bumps?')) return;
    const old = [...history];
    history = [];
    if (!persist()) {history=old;return;}
    renderHistory();
    updateCycle(current());
    notify('Bump history cleared.');
  });
  fill(saved);
  renderHistory();
  updateCycle(current());
  setInterval(()=>updateCycle(current()),60000);
})();
