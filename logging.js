(() => {
  if (document.body.dataset.featurePage !== 'Logging') return;

  const categoriesRoot = document.getElementById('logging-categories');
  const typeView = document.getElementById('logging-types-view');
  const settingsView = document.getElementById('logging-settings-view');
  const search = document.getElementById('logging-type-search');
  const massBar = document.querySelector('[data-mass-bar]');
  const selectedLabel = document.querySelector('[data-selected-label]');
  let massEditing = false;

  const data = [
    ['Applications', ['App Add', 'App Command Permission Update', 'App Remove']],
    ['Channels', ['Channel Bitrate Update', 'Channel Create', 'Channel Default Archive Duration Update', 'Channel Default Reaction Emoji Update', 'Channel Default Sort Order Update', 'Channel Default Thread Slow Mode Update', 'Channel Delete', 'Channel Forum Layout Update', 'Channel Forum Tags Update', 'Channel Name Update', 'Channel NSFW Update', 'Channel Parent Update', 'Channel Permissions Update', 'Channel Pins Update', 'Channel RTC Region Update', 'Channel Slow Mode Update', 'Channel Topic Update', 'Channel Type Update', 'Channel User Limit Update', 'Channel Video Quality Update', 'Channel Voice Status Update']],
    ['Discord AutoMod', ['Discord AutoMod Rule Actions Update', 'Discord AutoMod Rule Channels Update', 'Discord AutoMod Rule Content Update', 'Discord AutoMod Rule Create', 'Discord AutoMod Rule Delete', 'Discord AutoMod Rule Name Update', 'Discord AutoMod Rule Roles Update', 'Discord AutoMod Rule Toggle', 'Discord AutoMod Rule Whitelist Update']],
    ['Emojis', ['Emoji Create', 'Emoji Delete', 'Emoji Name Update', 'Emoji Roles Update']],
    ['Events', ['Event Create', 'Event Delete', 'Event Description Update', 'Event End Time Update', 'Event Image Update', 'Event Location Update', 'Event Name Update', 'Event Privacy Level Update', 'Event Start Time Update', 'Event Status Update', 'Event User Subscribe', 'Event User Unsubscribe']],
    ['Invites', ['Invite Create', 'Invite Delete', 'Invite Post']],
    ['Messages', ['Message Delete', 'Message Bulk Delete', 'Message Edit', 'Message Publish', 'Message Sent Using Command']],
    ['Polls', ['Poll Create', 'Poll Delete', 'Poll Finalize', 'Poll Votes Add', 'Poll Votes Remove']],
    ['Roles', ['Role Color Update', 'Role Create', 'Role Delete', 'Role Hoist Update', 'Role Icon Update', 'Role Mentionable Update', 'Role Name Update', 'Role Permissions Update']],
    ['Stage', ['Stage End', 'Stage Privacy Update', 'Stage Start', 'Stage Topic Update']],
    ['Server', ['AFK Channel Update', 'AFK Timeout Update', 'Ban Add', 'Ban Remove', 'Server Banner Update', 'Server Boost Level Update', 'Boost Progress Bar Toggle', 'Server Content Filter Level Update', 'Server Description Update', 'Server Discovery Splash Update', 'Server Features Update', 'Server Icon Update', 'Member Prune', 'Message Notifications Update', 'MFA Level Update', 'Server Name Update', 'Onboarding Channels Update', 'Onboarding Question Add', 'Onboarding Question Remove', 'Onboarding Question Update', 'Onboarding Toggle', 'Server Owner Update', 'Partnered Update', 'Server Preferred Locale Update', 'Public Updates Channel Update', 'Server Rules Channel Update', 'Server Splash Update', 'System Channel Update', 'User Join', 'User Kick', 'User Leave', 'Server Vanity Update', 'Verification Level Update', 'Verified Update', 'Server Widget Update']],
    ['Stickers', ['Sticker Create', 'Sticker Delete', 'Sticker Description Update', 'Sticker Name', 'Sticker Related Emoji Update']],
    ['Soundboard', ['Soundboard Sound Delete', 'Soundboard Sound Emoji Update', 'Soundboard Sound Name Update', 'Soundboard Sound Upload', 'Soundboard Sound Volume Update']],
    ['Threads', ['Thread Archive', 'Thread Archive Duration Update', 'Thread Create', 'Thread Delete', 'Thread Lock', 'Thread Name Update', 'Thread Slow Mode Update', 'Thread Unarchive', 'Thread Unlock']],
    ['Users', ['User Avatar Update', 'User Name Update', 'User Roles Add', 'User Roles Remove', 'User Roles Update', 'User Timed Out', 'User Timeout Removed']],
    ['Voice', ['Voice Channel Full', 'Voice User Join', 'Voice User Kick', 'Voice User Leave', 'Voice User Move', 'Voice User Switch']],
    ['Webhooks', ['Webhook Avatar Update', 'Webhook Channel Update', 'Webhook Create', 'Webhook Delete', 'Webhook Name Update']],
    ['Moderation', ['Auto Moderation', 'Ban Add', 'Ban Remove', 'Case Delete', 'Mass Case Delete', 'Case Update', 'Kick Add', 'Kick Remove', 'Mute Add', 'Mute Remove', 'Report Create', 'Reports Accept', 'Reports Ignore', 'User Note Add', 'User Note Remove', 'Warn Add', 'Warn Remove']]
  ].map(([name, types]) => ({ name, types: types.map((type) => ({ name: type, channels: [] })) }));

  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const markDirty = () => {};

  function renderCategories() {
    categoriesRoot.innerHTML = data.map((category, categoryIndex) => `<section class="logging-category" data-category-index="${categoryIndex}" aria-expanded="false">
      <div class="logging-category-row">
        <input class="logging-category-check" type="checkbox" data-category-check="${categoryIndex}" aria-label="Select ${esc(category.name)}">
        <button class="logging-category-toggle" type="button" data-category-toggle="${categoryIndex}"><span>${esc(category.name)}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
        <button class="logging-set-category" type="button" data-category-channel="${categoryIndex}">Set category channel</button>
      </div>
      <div class="logging-category-body" data-category-body="${categoryIndex}" hidden>
        ${category.types.map((type, typeIndex) => `<div class="logging-type-row" data-type-row data-category-index="${categoryIndex}" data-type-index="${typeIndex}" data-search-text="${esc((category.name + ' ' + type.name).toLowerCase())}">
          <input class="logging-type-check" type="checkbox" data-type-check aria-label="Select ${esc(type.name)}">
          <span class="logging-type-name">${esc(type.name)}</span>
          <div class="logging-type-channels"><span data-type-channels>${type.channels.map((channel, channelIndex) => channelChip(channel, categoryIndex, typeIndex, channelIndex)).join('')}</span><button class="logging-add-channel ${type.channels.length ? 'compact' : ''}" type="button" data-type-channel="${categoryIndex}:${typeIndex}" aria-label="${type.channels.length ? 'Add another channel' : 'Set channel'}" ${type.channels.length >= 4 ? 'disabled' : ''}>${type.channels.length ? '+' : 'Set channel'}</button></div>
        </div>`).join('')}
      </div>
    </section>`).join('');
    bindCategoryControls();
    filterTypes();
    syncMassUi();
  }

  function syncMassUi() {
    typeView.classList.toggle('mass-editing', massEditing);
    massBar.hidden = !massEditing;
    document.querySelector('[data-mass-edit]').classList.toggle('active', massEditing);
    document.querySelector('[data-set-all]').disabled = massEditing;
    document.querySelector('[data-remove-all]').disabled = massEditing;
    categoriesRoot.querySelectorAll('[data-category-channel],[data-type-channel]').forEach((button) => { button.disabled = massEditing; });
    updateMassCount();
  }

  function channelChip(channel, categoryIndex, typeIndex, channelIndex) {
    return `<span class="logging-channel-chip"><button type="button" class="logging-channel-label" data-edit-channel="${categoryIndex}:${typeIndex}:${channelIndex}"># ${esc(channel)}</button><button type="button" data-remove-channel="${esc(channel)}" aria-label="Remove ${esc(channel)}">&times;</button></span>`;
  }

  function openPicker(kind, title, onPick) {
    const isChannel = kind === 'channel';
    const options = isChannel ? ['Preview data','Preview data 2','Preview data 3','Preview data 4'] : ['Preview Role 1','Preview Role 2','Preview Role 3','Preview Role 4'];
    const overlay = document.createElement('div');
    overlay.className = 'logging-modal-overlay';
    const optionHtml = isChannel
      ? `<div class="logging-channel-group">Text Channels</div>${options.slice(0,2).map((option) => `<button class="logging-channel-option" type="button" data-channel-option="${esc(option)}"># ${esc(option)}</button>`).join('')}<div class="logging-channel-group">Preview category</div>${options.slice(2).map((option) => `<button class="logging-channel-option" type="button" data-channel-option="${esc(option)}"># ${esc(option)}</button>`).join('')}`
      : `<div class="logging-channel-group">Roles</div>${options.map((option) => `<button class="logging-channel-option" type="button" data-channel-option="${esc(option)}">${esc(option)}</button>`).join('')}`;
    overlay.innerHTML = `<div class="logging-modal"><button class="logging-modal-close" type="button">&times;</button><h2>${esc(title)}</h2><p class="logging-modal-copy">Select a ${isChannel ? 'channel' : 'role'}</p><input class="logging-channel-search" type="search" placeholder="${isChannel ? 'Channel' : 'Role'}"><div class="logging-channel-options">${optionHtml}</div><p class="logging-modal-note">${isChannel ? 'Channel' : 'Role'} not found?</p><button class="logging-modal-secondary" type="button" data-other-channel>Use other ${isChannel ? 'channel' : 'role'}</button></div>`;
    document.body.append(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.logging-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    const input = overlay.querySelector('.logging-channel-search');
    input.focus();
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      overlay.querySelectorAll('[data-channel-option]').forEach((button) => { button.hidden = !!q && !button.textContent.toLowerCase().includes(q); });
    });
    overlay.querySelectorAll('[data-channel-option]').forEach((button) => button.addEventListener('click', () => { onPick(button.dataset.channelOption); close(); }));
    overlay.querySelector('[data-other-channel]').addEventListener('click', () => {
      const code = '<@000000000000000000> lc-preview';
      const modal = overlay.querySelector('.logging-modal');
      modal.innerHTML = `<button class="logging-modal-close" type="button">&times;</button><h2>${esc(title)}</h2><p class="logging-modal-copy">Send the following message into the channel you want to use</p><div class="logging-copy-code"><code>${esc(code)}</code><button type="button" data-copy-code aria-label="Copy message">Copy</button></div><p class="logging-waiting">Waiting for you to send the message</p>`;
      modal.querySelector('.logging-modal-close').addEventListener('click', close);
      modal.querySelector('[data-copy-code]').addEventListener('click', async (event) => {
        try { await navigator.clipboard.writeText(code); event.currentTarget.textContent = 'Copied'; } catch { event.currentTarget.textContent = 'Copy'; }
      });
    });
  }

  function setTypeChannel(categoryIndex, typeIndex, channel, replace = false) {
    const type = data[categoryIndex].types[typeIndex];
    if (replace) type.channels = [];
    if (!type.channels.includes(channel) && type.channels.length < 4) type.channels.push(channel);
  }

  function bindCategoryControls() {
    categoriesRoot.querySelectorAll('[data-category-toggle]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.categoryToggle);
      const section = categoriesRoot.querySelector(`[data-category-index="${index}"]`);
      const body = categoriesRoot.querySelector(`[data-category-body="${index}"]`);
      const open = section.getAttribute('aria-expanded') === 'true';
      section.setAttribute('aria-expanded', String(!open));
      body.hidden = open;
    }));

    categoriesRoot.querySelectorAll('[data-category-channel]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.categoryChannel);
      openPicker('channel', data[index].name, (channel) => {
        data[index].types.forEach((type, typeIndex) => setTypeChannel(index, typeIndex, channel, true));
        renderCategories();
        markDirty();
      });
    }));

    categoriesRoot.querySelectorAll('[data-type-channel]').forEach((button) => button.addEventListener('click', () => {
      const [categoryIndex, typeIndex] = button.dataset.typeChannel.split(':').map(Number);
      if (data[categoryIndex].types[typeIndex].channels.length >= 4) return;
      openPicker('channel', data[categoryIndex].types[typeIndex].name, (channel) => {
        setTypeChannel(categoryIndex, typeIndex, channel);
        renderCategories();
        const body = categoriesRoot.querySelector(`[data-category-body="${categoryIndex}"]`);
        const section = categoriesRoot.querySelector(`[data-category-index="${categoryIndex}"]`);
        section.setAttribute('aria-expanded', 'true');
        body.hidden = false;
        markDirty();
      });
    }));

    categoriesRoot.querySelectorAll('[data-remove-channel]').forEach((button) => button.addEventListener('click', () => {
      const row = button.closest('[data-type-row]');
      const categoryIndex = Number(row.dataset.categoryIndex);
      const typeIndex = Number(row.dataset.typeIndex);
      const channel = button.dataset.removeChannel;
      data[categoryIndex].types[typeIndex].channels = data[categoryIndex].types[typeIndex].channels.filter((item) => item !== channel);
      renderCategories();
      markDirty();
    }));

    categoriesRoot.querySelectorAll('[data-edit-channel]').forEach((button) => button.addEventListener('click', () => {
      const [categoryIndex, typeIndex, channelIndex] = button.dataset.editChannel.split(':').map(Number);
      openPicker('channel', data[categoryIndex].types[typeIndex].name, (channel) => {
        data[categoryIndex].types[typeIndex].channels[channelIndex] = channel;
        renderCategories();
        const body = categoriesRoot.querySelector(`[data-category-body="${categoryIndex}"]`);
        const section = categoriesRoot.querySelector(`[data-category-index="${categoryIndex}"]`);
        section.setAttribute('aria-expanded', 'true');
        body.hidden = false;
        markDirty();
      });
    }));

    categoriesRoot.querySelectorAll('[data-category-check]').forEach((checkbox) => checkbox.addEventListener('change', () => {
      const index = Number(checkbox.dataset.categoryCheck);
      categoriesRoot.querySelectorAll(`[data-type-row][data-category-index="${index}"] [data-type-check]`).forEach((input) => { input.checked = checkbox.checked; });
      updateMassCount();
    }));
    categoriesRoot.querySelectorAll('[data-type-check]').forEach((checkbox) => checkbox.addEventListener('change', () => {
      const row = checkbox.closest('[data-type-row]');
      const categoryIndex = Number(row.dataset.categoryIndex);
      const typeChecks = [...categoriesRoot.querySelectorAll(`[data-type-row][data-category-index="${categoryIndex}"] [data-type-check]`)];
      const categoryCheck = categoriesRoot.querySelector(`[data-category-check="${categoryIndex}"]`);
      const checked = typeChecks.filter((input) => input.checked).length;
      categoryCheck.checked = checked === typeChecks.length;
      categoryCheck.indeterminate = checked > 0 && checked < typeChecks.length;
      updateMassCount();
    }));
  }

  function filterTypes() {
    const q = search.value.trim().toLowerCase();
    categoriesRoot.querySelectorAll('.logging-category').forEach((category) => {
      const categoryIndex = Number(category.dataset.categoryIndex);
      const categoryMatch = data[categoryIndex].name.toLowerCase().includes(q);
      let visibleChildren = 0;
      category.querySelectorAll('[data-type-row]').forEach((row) => {
        const match = !q || categoryMatch || row.dataset.searchText.includes(q);
        row.classList.toggle('hidden-by-search', !match);
        if (match) visibleChildren += 1;
      });
      category.classList.toggle('hidden-by-search', !!q && !categoryMatch && !visibleChildren);
      if (q && visibleChildren) { category.setAttribute('aria-expanded', 'true'); category.querySelector('.logging-category-body').hidden = false; }
    });
  }

  function updateMassCount() {
    const count = categoriesRoot.querySelectorAll('[data-type-check]:checked').length;
    if (selectedLabel) selectedLabel.textContent = `${count} ${count === 1 ? 'type' : 'types'} selected`;
  }

  document.querySelectorAll('[data-log-tab]').forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.logTab;
    document.querySelectorAll('[data-log-tab]').forEach((tab) => { const active = tab === button; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
    typeView.hidden = target !== 'types';
    settingsView.hidden = target !== 'settings';
    history.replaceState(null, '', target === 'types' ? '#types' : '#settings');
  }));

  document.querySelector('[data-set-all]').addEventListener('click', () => openPicker('channel', 'All types', (channel) => { data.forEach((category, categoryIndex) => category.types.forEach((type, typeIndex) => setTypeChannel(categoryIndex, typeIndex, channel, true))); renderCategories(); markDirty(); }));
  document.querySelector('[data-remove-all]').addEventListener('click', () => { data.forEach((category) => category.types.forEach((type) => { type.channels = []; })); renderCategories(); markDirty(); });
  document.querySelector('[data-mass-edit]').addEventListener('click', () => {
    massEditing = !massEditing;
    if (!massEditing) categoriesRoot.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => { checkbox.checked = false; });
    syncMassUi();
  });
  document.querySelector('[data-mass-set]').addEventListener('click', () => {
    const selected = [...categoriesRoot.querySelectorAll('[data-type-check]:checked')];
    if (!selected.length) return;
    openPicker('channel', 'Selected types', (channel) => { selected.forEach((checkbox) => { const row = checkbox.closest('[data-type-row]'); setTypeChannel(Number(row.dataset.categoryIndex), Number(row.dataset.typeIndex), channel, true); }); renderCategories(); markDirty(); });
  });
  document.querySelector('[data-mass-remove]').addEventListener('click', () => { categoriesRoot.querySelectorAll('[data-type-check]:checked').forEach((checkbox) => { const row = checkbox.closest('[data-type-row]'); data[Number(row.dataset.categoryIndex)].types[Number(row.dataset.typeIndex)].channels = []; }); renderCategories(); markDirty(); });
  search.addEventListener('input', filterTypes);

  document.querySelectorAll('#logging-settings-view input[type="checkbox"]').forEach((input) => input.addEventListener('change', markDirty));
  document.querySelectorAll('[data-inline-picker]').forEach((picker) => {
    const button = picker.querySelector('[data-inline-add]');
    const chips = picker.querySelector('[data-inline-chips]');
    const kind = picker.dataset.kind;
    let menu = null;
    const closeMenu = () => { menu?.remove(); menu = null; };
    const updateButton = () => { button.innerHTML = `<span>+</span> ${chips.children.length ? `Add ${kind.toLowerCase()}` : `No ${kind.toLowerCase()}s added`}`; };
    const addValue = (value) => {
      if ([...chips.children].some((chip) => chip.dataset.value === value)) return closeMenu();
      const chip = document.createElement('span');
      chip.className = 'logging-user-chip';
      chip.dataset.value = value;
      chip.innerHTML = `${kind === 'Channel' ? '# ' : ''}${esc(value)} <button type="button" aria-label="Remove">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => { chip.remove(); updateButton(); markDirty(); });
      chips.append(chip);
      updateButton();
      closeMenu();
      markDirty();
    };
    button.addEventListener('click', () => {
      if (menu) return closeMenu();
      const values = kind === 'Channel' ? ['Preview data', 'Preview data 2', 'Preview data 3', 'Preview data 4'] : ['Preview Role 1', 'Preview Role 2', 'Preview Role 3', 'Preview Role 4'];
      menu = document.createElement('div');
      menu.className = 'logging-inline-menu';
      menu.innerHTML = `<input type="search" placeholder="${kind}">${values.map((value) => `<button type="button" data-inline-choice="${esc(value)}">${kind === 'Channel' ? '# ' : ''}${esc(value)}</button>`).join('')}`;
      picker.append(menu);
      const input = menu.querySelector('input');
      input.focus();
      input.addEventListener('input', () => { const q = input.value.trim().toLowerCase(); menu.querySelectorAll('[data-inline-choice]').forEach((choice) => { choice.hidden = !!q && !choice.textContent.toLowerCase().includes(q); }); });
      menu.querySelectorAll('[data-inline-choice]').forEach((choice) => choice.addEventListener('click', () => addValue(choice.dataset.inlineChoice)));
    });
  });

  document.getElementById('logging-user-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('logging-user-id');
    const value = input.value.trim();
    if (!/^\d{17,19}$/.test(value)) return;
    if ([...document.querySelectorAll('#logging-user-list .logging-user-chip')].some((chip) => chip.dataset.value === value)) return;
    const chip = document.createElement('span');
    chip.className = 'logging-user-chip';
    chip.dataset.value = value;
    chip.innerHTML = `${esc(value)} <button type="button" aria-label="Remove ${esc(value)}">&times;</button>`;
    chip.querySelector('button').addEventListener('click', () => { chip.remove(); markDirty(); });
    document.getElementById('logging-user-list').append(chip);
    input.value = '';
    markDirty();
  });

  renderCategories();
  const initial = location.hash.slice(1);
  if (initial === 'settings') document.querySelector('[data-log-tab="settings"]').click();
})();
