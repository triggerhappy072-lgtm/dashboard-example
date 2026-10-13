(() => {
  const page = document.querySelector('.sn-page');
  if (!page) return;

  const key = 'next-step-social-notifications-v2';
  const providerNames = {
    youtube: 'YouTube',
    twitch: 'Twitch',
    tiktok: 'TikTok'
  };
  const providerExamples = {
    youtube: { name: 'username', title: 'New video', description: 'A new video has just been published.' },
    twitch: { name: 'username', title: 'Live now', description: 'Playing games live on Twitch.' },
    tiktok: { name: 'username', title: 'New TikTok post', description: 'A new video has been published.' }
  };
  const emptyState = () => ({ youtube: [], twitch: [], tiktok: [] });
  const clone = value => JSON.parse(JSON.stringify(value));
  const trim = value => String(value ?? '').trim();
  const randomId = () => `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const notify = message => {
    if (typeof window.showNotification === 'function') window.showNotification(message, 4000);
    else console.info(message);
  };

  function defaultMessage(provider) {
    const label = providerNames[provider];
    return {
      content: '${pingroles}',
      author: provider === 'twitch' ? '${channelname} is live on Twitch' :
        provider === 'tiktok' ? '${channelname} published a TikTok video' :
          '${channelname} published a new video on YouTube',
      title: '${title}',
      description: provider === 'youtube' ? '' : '${description}',
      footer: provider === 'youtube' ? 'Published' : label + ' update',
      fieldName: '', fieldValue: '', showEmbed: true, actionRow: false
    };
  }
  function defaultDestination(target) {
    return {
      id: randomId(), target, roles: [], autoPublish: false,
      customMessage: false, messages: []
    };
  }
  function normalizeState(raw) {
    const output = emptyState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return output;
    for (const type of Object.keys(output)) {
      const creators = raw[type];
      if (!Array.isArray(creators)) continue;
      output[type] = creators.slice(0, type === 'youtube' ? 5 : 60)
        .filter(creator => creator && typeof creator.handle === 'string' && Array.isArray(creator.destinations))
        .map(creator => ({
          id: String(creator.id || randomId()),
          handle: trim(creator.handle).slice(0, 120),
          destinations: creator.destinations.slice(0, 25).filter(d => d && typeof d.target === 'string').map(d => ({
            id: String(d.id || randomId()),
            target: trim(d.target).slice(0, 250),
            roles: Array.isArray(d.roles) ? d.roles.filter(r => typeof r === 'string').slice(0, 20) : [],
            autoPublish: !!d.autoPublish,
            customMessage: !!d.customMessage,
              messages: Array.isArray(d.messages) ?
                d.messages.slice(0, 8).filter(m => m && typeof m === 'object').map(m => ({
                ...defaultMessage(type),
                ...Object.fromEntries(Object.entries(m).filter(([k, v]) =>
                  Object.hasOwn(defaultMessage(type), k) && typeof v === typeof defaultMessage(type)[k]))
              })) : []
          }))
        }));
    }
    return output;
  }
  function migrateV1() {
    try {
      const legacy = JSON.parse(localStorage.getItem('next-step-social-notifications-v1') || 'null');
      const old = legacy?.youtube;
      if (!old || typeof old.source !== 'string' || !trim(old.channel)) return emptyState();
      const match = old.source.match(/(?:youtube\.com\/(?:@|channel\/)|^@?)([\w.-]+)/i);
      if (!match) return emptyState();
      return {
        ...emptyState(),
        youtube: [{
          id: randomId(), handle: match[1],
          destinations: [{
            ...defaultDestination(old.channel),
            roles: trim(old.role) ? [trim(old.role)] : [],
            customMessage: !!trim(old.message),
            messages: trim(old.message) ? [{ ...defaultMessage('youtube'), content: old.message }] : []
          }]
        }]
      };
    } catch { return emptyState(); }
  }
  let persisted;
  try {
    const raw = localStorage.getItem(key);
    persisted = raw === null ? migrateV1() : normalizeState(JSON.parse(raw));
  } catch { persisted = emptyState(); }
  let draft = clone(persisted);

  const setupDialog = document.getElementById('sn-setup-dialog');
  const settingsDialog = document.getElementById('sn-settings-dialog');
  const messageDialog = document.getElementById('sn-message-dialog');
  const saveBar = document.getElementById('sn-save-bar');
  const creatorInput = document.getElementById('sn-creator-input');
  const destinationInput = document.getElementById('sn-destination-input');
  let setup = { provider: 'youtube', handle: '', step: 'creator', forCreatorId: null };
  let editing = null;
  let tempSettings = null;
  let editingMessageIndex = null;
  let tempMessage = null;
  let editorTab = 'visual';
  let focusAfterDialog = null;
  let recentlyAdded = null;

  function isDirty() { return JSON.stringify(draft) !== JSON.stringify(persisted); }
  function creatorFor(type, creatorId) {
    return draft[type]?.find(creator => creator.id === creatorId) || null;
  }
  function destinationFor(type, creatorId, destinationId) {
    return creatorFor(type, creatorId)?.destinations.find(d => d.id === destinationId) || null;
  }
  function isWebhook(value) { return /^https?:\/\//i.test(trim(value)); }
  function destinationLabel(value) {
    const raw = trim(value);
    if (isWebhook(raw) || raw.startsWith('Webhook')) return 'Webhook';
    return raw.startsWith('#') ? raw : '#' + raw;
  }
  function canonicalDestination(value) {
    const raw = trim(value);
    if (!raw) return '';
    // Discord webhook URLs contain an authorization token: never keep it in localStorage.
    if (isWebhook(raw)) return 'Webhook';
    return raw;
  }
  function resetInputs() {
    creatorInput.value = '';
    destinationInput.value = '';
  }

  const node = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = String(content);
    return element;
  };
  const action = (label, dataset, className = 'sn-secondary') => {
    const button = node('button', className, label);
    button.type = 'button';
    Object.entries(dataset).forEach(([name, value]) => { button.dataset[name] = String(value); });
    return button;
  };
  function render() {
    for (const type of Object.keys(providerNames)) {
      const creators = draft[type];
      const container = document.querySelector(`[data-provider-entries="${type}"]`);
      container.replaceChildren();
      container.hidden = creators.length === 0;
      const button = document.querySelector(`[data-add-provider="${type}"]`);
      button.textContent = creators.length ? 'Add ' + (type === 'tiktok' ? 'user' : 'channel') : 'Set up';
      if (type === 'youtube') {
        button.disabled = creators.length >= 5;
        button.title = '';
      }
      for (const creator of creators) {
        const row = node('article', 'sn-creator-entry');
        const header = node('div', 'sn-creator-entry-head');
        const identity = node('div', 'sn-creator-identity');
        identity.append(node('strong', '', '@' + creator.handle));
        header.append(identity);
        const destList = node('div', 'sn-creator-destination-list');
        creator.destinations.forEach(destination => {
          const item = node('div', 'sn-destination-item');
          item.append(node('span', 'sn-service-destination-icon', '↳'));
          const info = node('div', 'sn-destination-info');
          info.append(node('strong', '', destinationLabel(destination.target)));
          item.append(info,
            action('Edit', { snEditDestination: destination.id, snCreator: creator.id, snType: type }),
            action('Remove', { snRemoveDestination: destination.id, snCreator: creator.id, snType: type }, 'sn-danger'));
          destList.append(item);
        });
        const controls = node('div', 'sn-creator-entry-actions');
        controls.append(action('Add channel', { snAddDestination: creator.id, snType: type }),
          action('Remove', { snRemoveCreator: creator.id, snType: type }, 'sn-secondary'));
        row.append(header, destList, controls);
        container.append(row);
      }
    }
    saveBar.hidden = !isDirty();
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
    if (focusAfterDialog?.isConnected) focusAfterDialog.focus();
  }
  document.querySelectorAll('[data-sn-close]').forEach(button =>
    button.addEventListener('click', () => {
      const type = button.dataset.snClose;
      closeDialog(type === 'setup' ? setupDialog : type === 'settings' ? settingsDialog : messageDialog);
    }));

  function openSetup(type, creatorId = null) {
    if (type === 'youtube' && draft.youtube.length >= 5 && !creatorId) {
      notify('The YouTube list is full (5 of 5).');
      return;
    }
    setup = { provider: type, handle: creatorId ? creatorFor(type, creatorId)?.handle || '' : '', step: creatorId ? 'destination' : 'creator', forCreatorId: creatorId };
    focusAfterDialog = document.activeElement;
    resetInputs();
    const words = {
      youtube: ["Enter a YouTube channel's @handle or ID.", 'Channel @handle or ID', 'username'],
      twitch: ["Enter a Twitch channel's name. You may be prompted to connect a Twitch account before adding any channel.", 'Channel name', 'username'],
      tiktok: ["Enter a TikTok user's name.", 'User name', 'username']
    }[type];
    document.querySelector('#sn-setup-icon img').src = 'social-icons/' + type + '.png';
    document.getElementById('sn-setup-title').textContent = 'Add ' + (type === 'tiktok' ? 'user' : 'channel');
    document.getElementById('sn-setup-creator-copy').textContent = words[0];
    document.getElementById('sn-creator-label').textContent = words[1];
    creatorInput.placeholder = words[2];
    showSetupStep(setup.step);
    setupDialog.showModal();
    (creatorId ? destinationInput : creatorInput).focus();
  }
  function showSetupStep(step) {
    setup.step = step;
    document.getElementById('sn-setup-creator-stage').hidden = step !== 'creator';
    document.getElementById('sn-setup-destination-stage').hidden = step !== 'destination';
    document.getElementById('sn-setup-success-stage').hidden = step !== 'success';
  }
  function cleanHandle(value) {
    let str = trim(value);
    if (/^https?:\/\//i.test(str)) {
      try {
        const url = new URL(str);
        str = url.pathname.split('/').filter(Boolean).pop() || '';
      } catch {}
    }
    return str.replace(/^@/, '');
  }
  document.getElementById('sn-creator-next').addEventListener('click', () => {
    const handle = cleanHandle(creatorInput.value);
    if (!handle || handle.length > 120 || !/^[\w.-]+$/.test(handle)) {
      notify('Enter a creator handle, channel ID, or username containing letters, numbers, dots, hyphens or underscores.');
      creatorInput.focus();
      return;
    }
    const duplicate = draft[setup.provider].some(c => c.handle.toLowerCase() === handle.toLowerCase());
    if (duplicate) {
      notify('That channel is already added.');
      creatorInput.focus();
      return;
    }
    setup.handle = handle;
    showSetupStep('destination');
    destinationInput.focus();
  });
  document.getElementById('sn-destination-back').addEventListener('click', () => {
    closeDialog(setupDialog);
  });
  document.getElementById('sn-destination-finish').addEventListener('click', () => {
    const target = canonicalDestination(destinationInput.value);
    if (!target) {
      notify('Choose a channel name or webhook destination first.');
      destinationInput.focus();
      return;
    }
    let creator = setup.forCreatorId ? creatorFor(setup.provider, setup.forCreatorId) : null;
    if (!creator) {
      creator = { id: randomId(), handle: setup.handle, destinations: [] };
      draft[setup.provider].push(creator);
    }
    if (creator.destinations.some(d => d.target.toLowerCase() === target.toLowerCase())) {
      notify('This creator already has a matching destination.');
      return;
    }
    const destination = defaultDestination(target);
    creator.destinations.push(destination);
    recentlyAdded = { type: setup.provider, creatorId: creator.id, destinationId: destination.id };
    render();
    document.getElementById('sn-setup-title').textContent = setup.provider === 'tiktok' ? 'TikTok user added' :
      setup.provider === 'twitch' ? 'Twitch channel added' : 'YouTube channel added';
    document.getElementById('sn-setup-success-copy').textContent = '@' + creator.handle + ' successfully added.';
    showSetupStep('success');
  });
  document.getElementById('sn-open-added-settings').addEventListener('click', () => {
    const added = recentlyAdded;
    closeDialog(setupDialog);
    if (added) openSettings(added.type, added.creatorId, added.destinationId);
  });
  page.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.addProvider) { openSetup(button.dataset.addProvider); return; }
    const type = button.dataset.snType;
    const creatorId = button.dataset.snCreator;
    if (button.dataset.snAddDestination) { openSetup(type, button.dataset.snAddDestination); return; }
    if (button.dataset.snEditDestination) { openSettings(type, creatorId, button.dataset.snEditDestination); return; }
    if (button.dataset.snRemoveDestination) {
      if (!window.confirm('Remove this notification destination?')) return;
      const creator = creatorFor(type, creatorId);
      if (creator) creator.destinations = creator.destinations.filter(d => d.id !== button.dataset.snRemoveDestination);
      if (creator && creator.destinations.length === 0) draft[type] = draft[type].filter(c => c.id !== creatorId);
      render();
      return;
    }
    if (button.dataset.snRemoveCreator) {
      if (!window.confirm('Remove this channel and its destinations?')) return;
      draft[type] = draft[type].filter(c => c.id !== button.dataset.snRemoveCreator);
      render();
    }
  });

  document.getElementById('sn-save').addEventListener('click', () => {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
      persisted = clone(draft);
      render();
      notify('Settings saved.');
    } catch {
      notify('Local storage is unavailable. Settings were not saved.');
    }
  });
  document.getElementById('sn-reset').addEventListener('click', () => {
    draft = clone(persisted);
    render();
    notify('Changes reset.');
  });

  function renderRoles() {
    const container = document.getElementById('sn-role-chips');
    container.replaceChildren();
    if (tempSettings.roles.length === 0) container.append(node('span', 'sn-role-empty', 'No roles added'));
    tempSettings.roles.forEach((role, index) => {
      const chip = node('span', 'sn-role-chip', role);
      const remove = action('×', { snRoleRemove: index });
      remove.setAttribute('aria-label', 'Remove role ' + role);
      chip.append(remove);
      container.append(chip);
    });
  }
  function addRole() {
    const input = document.getElementById('sn-role-input');
    const role = trim(input.value);
    if (!role) return;
    if (tempSettings.roles.length >= 20) { notify('Up to 20 role labels can be configured.'); return; }
    if (!tempSettings.roles.some(r => r.toLowerCase() === role.toLowerCase())) tempSettings.roles.push(role);
    input.value = '';
    renderRoles();
  }
  document.getElementById('sn-add-role').addEventListener('click', addRole);
  document.getElementById('sn-role-input').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); addRole(); }
  });
  document.getElementById('sn-role-chips').addEventListener('click', event => {
    const button = event.target.closest('[data-sn-role-remove]');
    if (!button) return;
    tempSettings.roles.splice(Number(button.dataset.snRoleRemove), 1);
    renderRoles();
  });

  function openSettings(type, creatorId, destinationId) {
    const source = destinationFor(type, creatorId, destinationId);
    const creator = creatorFor(type, creatorId);
    if (!source || !creator) return;
    focusAfterDialog = document.activeElement;
    editing = { type, creatorId, destinationId };
    tempSettings = clone(source);
    document.getElementById('sn-settings-title').textContent = type === 'tiktok' ? 'User settings' : 'Channel settings';
    document.querySelector('#sn-settings-icon img').src = 'social-icons/' + type + '.png';
    document.getElementById('sn-settings-creator').textContent = '@' + creator.handle;
    document.getElementById('sn-settings-destination').value = tempSettings.target;
    document.getElementById('sn-role-input').value = '';
    document.getElementById('sn-auto-publish').checked = tempSettings.autoPublish;
    document.getElementById('sn-use-custom').checked = tempSettings.customMessage;
    renderRoles();
    renderMessages();
    settingsDialog.showModal();
  }
  function renderMessages() {
    document.getElementById('sn-custom-messages').hidden = !tempSettings.customMessage;
    document.getElementById('sn-add-message').disabled = tempSettings.messages.length >= 8;
    const container = document.getElementById('sn-message-list');
    container.replaceChildren();
    if (!tempSettings.customMessage) return;
    tempSettings.messages.forEach((message, index) => {
      const row = node('div', 'sn-message-item');
      const card = node('div', 'sn-message-mini-card');
      card.append(node('span', 'sn-avatar', 'NS'));
      const copy = node('div', 'sn-message-mini-copy');
      const name = node('strong', '', 'Next Step');
      name.append(node('small', '', ' BOT'));
      copy.append(name, node('p', '', trim(message.content) || '${pingroles}'));
      if (message.showEmbed !== false) {
        const embed = node('div', 'sn-message-mini-embed');
        embed.append(node('strong', '', message.author), node('p', '', message.title));
        if (message.description) embed.append(node('p', '', message.description));
        embed.append(node('small', '', message.footer));
        copy.append(embed);
      }
      card.append(copy);
      row.append(card,
        action('Open message editor', { snMessageEdit: index }),
        action('×', { snMessageRemove: index }, 'sn-secondary'));
      container.append(row);
    });
  }
  document.getElementById('sn-use-custom').addEventListener('change', event => {
    tempSettings.customMessage = event.target.checked;
    if (tempSettings.customMessage && !tempSettings.messages.length) tempSettings.messages.push(defaultMessage(editing.type));
    renderMessages();
  });
  document.getElementById('sn-custom-messages').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.snMessageEdit !== undefined) openMessageEditor(Number(button.dataset.snMessageEdit));
    if (button.dataset.snMessageRemove !== undefined) {
      tempSettings.messages.splice(Number(button.dataset.snMessageRemove), 1);
      renderMessages();
    }
  });
  document.getElementById('sn-add-message').addEventListener('click', () => {
    if (tempSettings.messages.length >= 8) return;
    tempSettings.customMessage = true;
    document.getElementById('sn-use-custom').checked = true;
    openMessageEditor(tempSettings.messages.length);
  });
  document.getElementById('sn-confirm-settings').addEventListener('click', () => {
    const destination = destinationFor(editing.type, editing.creatorId, editing.destinationId);
    if (!destination) return;
    const targetInput = document.getElementById('sn-settings-destination');
    const target = canonicalDestination(targetInput.value);
    if (!target) {
      notify('A destination channel or webhook is required.');
      targetInput.focus();
      return;
    }
    tempSettings.target = target;
    tempSettings.autoPublish = document.getElementById('sn-auto-publish').checked;
    tempSettings.customMessage = document.getElementById('sn-use-custom').checked;
    Object.assign(destination, clone(tempSettings));
    closeDialog(settingsDialog);
    render();
  });

  const variables = ['id', 'url', 'title', 'description', 'shorteneddescription',
    'duration', 'thumbnailurl', 'publishedtimestamp', 'channelname', 'channelurl',
    'pingroles', 'nowtimestamp', 'guildname', 'guildmembercount', 'guildiconurl'];
  function editorFieldsToMessage() {
    return {
      ...tempMessage,
      content: document.getElementById('sn-message-content').value,
      author: document.getElementById('sn-embed-author').value,
      title: document.getElementById('sn-embed-title').value,
      description: document.getElementById('sn-embed-description').value,
      footer: document.getElementById('sn-embed-footer').value,
      fieldName: document.getElementById('sn-embed-field-name').value,
      fieldValue: document.getElementById('sn-embed-field-value').value
    };
  }
  function populateEditor(message) {
    document.getElementById('sn-message-content').value = message.content || '';
    document.getElementById('sn-embed-author').value = message.author || '';
    document.getElementById('sn-embed-title').value = message.title || '';
    document.getElementById('sn-embed-description').value = message.description || '';
    document.getElementById('sn-embed-footer').value = message.footer || '';
    document.getElementById('sn-embed-field-name').value = message.fieldName || '';
    document.getElementById('sn-embed-field-value').value = message.fieldValue || '';
    document.getElementById('sn-editor-embed-fields').hidden = message.showEmbed === false;
    renderMessagePreview();
  }
  function exampleVariable(name) {
    const creator = creatorFor(editing.type, editing.creatorId);
    const sample = providerExamples[editing.type];
    const values = {
      id: 'example-123', url: 'https://example.com/video',
      title: sample.title, description: sample.description,
      shorteneddescription: sample.description.slice(0, 35),
      duration: '12:34', thumbnailurl: 'https://example.com/thumbnail.png',
      publishedtimestamp: 'Example date', channelname: creator?.handle || sample.name,
      channelurl: 'https://example.com/creator', pingroles: tempSettings.roles.join(' '),
      nowtimestamp: 'Example date', guildname: 'Example Server',
      guildmembercount: '1,250', guildiconurl: 'https://example.com/icon.png'
    };
    return values[name] ?? '${' + name + '}';
  }
  function interpolate(input) {
    return String(input ?? '').replace(/\$\{([a-zA-Z]+)\}/g, (_token, name) => exampleVariable(name));
  }
  function renderMessagePreview() {
    const message = tempMessage || defaultMessage(editing.type);
    document.getElementById('sn-message-preview-text').textContent = interpolate(message.content);
    document.getElementById('sn-message-preview-author').textContent = interpolate(message.author);
    document.getElementById('sn-message-preview-title').textContent = interpolate(message.title);
    document.getElementById('sn-message-preview-description').textContent = interpolate(message.description);
    document.getElementById('sn-message-preview-footer').textContent = interpolate(message.footer);
    document.getElementById('sn-message-preview-field').textContent =
      [message.fieldName, message.fieldValue].filter(Boolean).map(interpolate).join(': ');
    document.querySelector('#sn-editor-preview .sn-embed-preview').hidden = message.showEmbed === false;
    document.getElementById('sn-message-preview-action').hidden = !message.actionRow;
  }
  function readRawEditor() {
    const raw = document.getElementById('sn-raw-message');
    try {
      const obj = JSON.parse(raw.value);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw Error('Expected an object.');
      const defaults = defaultMessage(editing.type);
      const allowed = Object.keys(defaults);
      if (allowed.some(field => field in obj && typeof obj[field] !== typeof defaults[field])) throw Error('Invalid message field.');
      tempMessage = { ...defaultMessage(editing.type), ...Object.fromEntries(allowed.filter(f => f in obj).map(f => [f, obj[f]])) };
      return true;
    } catch (error) {
      notify('Invalid raw message JSON: ' + error.message);
      raw.focus();
      return false;
    }
  }
  function showEditorTab(type) {
    if (editorTab === 'raw' && type !== 'raw' && !readRawEditor()) return;
    if (editorTab === 'visual') tempMessage = editorFieldsToMessage();
    editorTab = type;
    document.querySelectorAll('[data-sn-editor-tab]').forEach(button => {
      const selected = button.dataset.snEditorTab === type;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('[data-sn-editor-view]').forEach(view => { view.hidden = view.dataset.snEditorView !== type; });
    if (type === 'raw') document.getElementById('sn-raw-message').value = JSON.stringify(tempMessage, null, 2);
    if (type === 'visual') populateEditor(tempMessage);
    renderMessagePreview();
  }
  function showEditorMode(type) {
    if (type === 'preview') {
      if (editorTab === 'raw' && !readRawEditor()) return;
      if (editorTab === 'visual') tempMessage = editorFieldsToMessage();
    }
    document.querySelectorAll('[data-sn-editor-mode]').forEach(button => {
      const selected = button.dataset.snEditorMode === type;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    document.getElementById('sn-editor-edit').hidden = type !== 'edit';
    document.getElementById('sn-editor-preview').hidden = type !== 'preview';
    if (type === 'edit' && editorTab === 'visual') populateEditor(tempMessage);
    renderMessagePreview();
  }
  function openMessageEditor(index) {
    editingMessageIndex = index;
    tempMessage = clone(tempSettings.messages[index] || defaultMessage(editing.type));
    editorTab = 'variables'; // Forces Visual to initialize from the temporary draft.
    populateEditor(tempMessage);
    showEditorTab('visual');
    document.getElementById('sn-message-title').textContent = 'Message editor';
    focusAfterDialog = document.activeElement;
    messageDialog.showModal();
    showEditorMode('edit');
  }
  document.querySelectorAll('[data-sn-editor-tab]').forEach(button => button.addEventListener('click', () => showEditorTab(button.dataset.snEditorTab)));
  document.querySelectorAll('[data-sn-editor-mode]').forEach(button =>
    button.addEventListener('click', () => showEditorMode(button.dataset.snEditorMode)));
  ['content', 'author', 'title', 'description', 'footer', 'fieldName', 'fieldValue'].forEach(field => {
    const ids = { content: 'sn-message-content', author: 'sn-embed-author', title: 'sn-embed-title', description: 'sn-embed-description', footer: 'sn-embed-footer', fieldName: 'sn-embed-field-name', fieldValue: 'sn-embed-field-value' };
    document.getElementById(ids[field]).addEventListener('input', () => {
      tempMessage = editorFieldsToMessage();
      renderMessagePreview();
    });
  });
  document.getElementById('sn-raw-message').addEventListener('input', event => {
    try {
      const obj = JSON.parse(event.target.value);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const defaults = defaultMessage(editing.type);
        const allowed = Object.keys(defaults);
        if (allowed.every(k => !(k in obj) || typeof obj[k] === typeof defaults[k])) {
          tempMessage = { ...defaultMessage(editing.type), ...Object.fromEntries(allowed.filter(k => k in obj).map(k => [k, obj[k]])) };
          renderMessagePreview();
        }
      }
    } catch {}
  });
  const variableList = document.getElementById('sn-variable-list');
  variables.forEach(name => {
    const button = action('${' + name + '}', { snVariable: name });
    button.type = 'button';
    variableList.append(button);
  });
  variableList.addEventListener('click', event => {
    const button = event.target.closest('[data-sn-variable]');
    if (!button) return;
    const token = '${' + button.dataset.snVariable + '}';
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(token).then(() => notify('Copied ' + token))
        .catch(() => notify('Variable: ' + token));
    } else notify('Variable: ' + token);
  });
  function commitMessageEditor() {
    if (editorTab === 'raw' && !readRawEditor()) return;
    if (editorTab === 'visual' && !document.getElementById('sn-editor-edit').hidden) tempMessage = editorFieldsToMessage();
    tempSettings.messages[editingMessageIndex] = clone(tempMessage);
    closeDialog(messageDialog);
    renderMessages();
  }
  document.querySelector('[data-close-editor]').addEventListener('click', commitMessageEditor);
  messageDialog.addEventListener('cancel', event => {
    event.preventDefault();
    commitMessageEditor();
  });
  document.getElementById('sn-editor-add-embed').addEventListener('click', () => {
    if (editorTab === 'visual') tempMessage = editorFieldsToMessage();
    tempMessage.showEmbed = true;
    if (editorTab === 'visual') populateEditor(tempMessage);
    renderMessagePreview();
  });
  document.getElementById('sn-editor-action-row').addEventListener('click', () => {
    if (editorTab === 'visual') tempMessage = editorFieldsToMessage();
    tempMessage.actionRow = true;
    renderMessagePreview();
  });
  document.getElementById('sn-editor-reset').addEventListener('click', () => {
    tempMessage = defaultMessage(editing.type);
    if (editorTab === 'raw') document.getElementById('sn-raw-message').value = JSON.stringify(tempMessage, null, 2);
    populateEditor(tempMessage);
  });
  document.getElementById('sn-editor-load').addEventListener('click', () => document.getElementById('sn-editor-import').click());
  document.getElementById('sn-editor-import').addEventListener('change', async event => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 200000) throw Error('File is too large.');
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Expected a JSON object.');
      const defaults = defaultMessage(editing.type);
      const values = Object.entries(parsed).filter(([name, value]) =>
        Object.hasOwn(defaults, name) && typeof value === typeof defaults[name]);
      if (!values.length) throw Error('No compatible fields.');
      tempMessage = { ...defaults, ...Object.fromEntries(values) };
      if (editorTab === 'raw') document.getElementById('sn-raw-message').value = JSON.stringify(tempMessage, null, 2);
      populateEditor(tempMessage);
    } catch (error) { notify('Unable to load message: ' + error.message); }
    finally { input.value = ''; }
  });
  messageDialog.addEventListener('close', () => { editingMessageIndex = null; tempMessage = null; });
  render();
})();
