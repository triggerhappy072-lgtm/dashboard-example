(() => {
  if (!document.querySelector('.advanced-rule-grid')) return;
  const grid = document.querySelector('.advanced-rule-grid');
  const esc = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const configKey = 'next-step-automod-module-settings-v1';
  const rulesKey = 'next-step-automod-advanced-rules-v1';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
  const moduleSettings = read(configKey, {});
  const markDirty = () => { const bar = document.getElementById('automod-unsaved-bar'); if (bar) bar.hidden = false; };

  // Keep additional conditions in the same grid and delegate to the existing editors.
  const additions = [
    ['repeated-messages', 'Repeated messages', 'Take action when a member sends the same message repeatedly.'],
    ['characters', 'Characters', 'Limit the number of characters members send in a short period.'],
    ['zalgo', 'Zalgo', 'Detect messages containing excessive combining characters.'],
    ['risks', 'Risks', 'Respond to users accumulating risk points.']
  ];
  const template = grid.querySelector('[data-rule="spam"]');
  const divider = grid.querySelector('.advanced-divider');
  additions.forEach(([id, title, description]) => {
    if (!template || grid.querySelector(`[data-rule="${id}"]`)) return;
    const card = template.cloneNode(true);
    card.dataset.rule = id;
    card.querySelector('h2').textContent = title;
    card.querySelector('p').textContent = description;
    grid.insertBefore(card, divider);
  });

  // A single, accessible editor used for settings, scopes, and action configuration.
  function dialog(title, body, onSave, { onRemove, note } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'feedback-overlay';
    overlay.innerHTML = `<section class="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title"><h2 id="feedback-dialog-title">${esc(title)}</h2>${note ? `<p>${esc(note)}</p>` : ''}<form><div class="feedback-fields">${body}</div><div class="feedback-controls">${onRemove ? '<button type="button" data-feedback-remove>Remove action</button>' : ''}<button type="button" data-feedback-cancel>Cancel</button><button type="submit" data-feedback-save>Save</button></div></form></section>`;
    document.body.append(overlay);
    const form = overlay.querySelector('form');
    const close = () => { overlay.remove(); document.removeEventListener('keydown', escapeKey); };
    overlay.querySelector('[data-feedback-cancel]').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const escapeKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escapeKey);
    form.addEventListener('submit', e => { e.preventDefault(); onSave(new FormData(form), form); close(); });
    overlay.querySelector('[data-feedback-remove]')?.addEventListener('click', () => { onRemove(); close(); });
    overlay.querySelector('input,select,button')?.focus();
    return overlay;
  }
  const checked = (value) => value ? ' checked' : '';
  const inputField = (name, label, value, type = 'text') => `<label>${esc(label)}<input name="${esc(name)}" type="${type}" value="${esc(value ?? '')}"></label>`;
  const checkField = (name, label, value) => `<label class="feedback-check"><input name="${esc(name)}" type="checkbox"${checked(value)}><span>${esc(label)}</span></label>`;

  const moduleDefinitions = {
    join: { title:'Join Guard', fields: [
      ['enabled','Enable Join Guard','checkbox',false],
      ['accountAge','Minimum account age in days','number',7],
      ['blockBots','Block bot accounts','checkbox',false],
      ['action','For matching accounts','select',['Flag for review','Kick member','Ban member']],
      ['logChannel','Log channel','text','#moderation']
    ] },
    threads: { title:'Auto-delete thread creation system message', fields: [
      ['enabled','Enable automatic deletion','checkbox',false],
      ['channels','Channels (comma separated)','text','#general'],
      ['delay','Delete after (seconds)','number',0]
    ] }
  };
  const selectField = (name, label, options, selected) => `<label>${esc(label)}<select name="${esc(name)}">${options.map(o => `<option${o === selected ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  function openModule(key) {
    const def = moduleDefinitions[key];
    const saved = moduleSettings[key] || {};
    const body = def.fields.map(([name,label,type,initial]) => {
      const value = saved[name] ?? initial;
      return type === 'checkbox' ? checkField(name,label,value) : type === 'select' ? selectField(name,label,initial,value) : inputField(name,label,value,type);
    }).join('');
    dialog(def.title,body,(values)=>{
      const state={};
      def.fields.forEach(([name,,type]) => { state[name] = type === 'checkbox' ? values.has(name) : type === 'number' ? Math.max(0,Number(values.get(name))||0) : values.get(name); });
      moduleSettings[key] = state;
      localStorage.setItem(configKey,JSON.stringify(moduleSettings));
      const button=document.querySelector(`[data-automod-setup="${key}"] .sapph-action`);
      if(button) button.textContent=state.enabled?'Configure':'Set up';
    }, {note:'Frontend configuration preview. Discord bot execution is handled by the backend integration.'});
  }
  document.querySelectorAll('[data-automod-setup]:not([data-automod-setup="discord"])').forEach(row=>{
    const key=row.dataset.automodSetup;
    const button=row.querySelector('.sapph-action');
    if(button && moduleSettings[key]?.enabled) button.textContent='Configure';
    row.addEventListener('click',e=>{
      if(e.target.closest('a,input,select')) return;
      openModule(key);
    });
    row.tabIndex=0;
    row.setAttribute('role','button');
    row.addEventListener('keydown',e=>{if(e.target===row && (e.key==='Enter'||e.key===' ')){e.preventDefault();openModule(key);}});
  });
  const advancedRow=document.getElementById('advanced-automod-open')?.closest('.sapph-automod-row');
  advancedRow?.addEventListener('click', e=>{
    if(e.target.closest('button,a')) return;
    document.getElementById('advanced-automod-open')?.click();
  });
  if(advancedRow){advancedRow.tabIndex=0;advancedRow.setAttribute('role','button');advancedRow.addEventListener('keydown',e=>{if(e.target===advancedRow&&(e.key==='Enter'||e.key===' ')){e.preventDefault();document.getElementById('advanced-automod-open')?.click();}});}

  const roles=['Preview Moderator','Preview Member','Preview VIP','Preview Newcomer'];
  const channels=['general','announcements','rules','moderation'];
  function openScope(subject,title) {
    const saved=readScope(subject);
    const choice=(kind,options)=>`<fieldset><legend>${kind === 'roles'?'Roles':'Channels'}</legend>${selectField(kind+'Mode','Filter mode',['Whitelist','Blacklist'],saved[kind+'Mode'])}<div class="feedback-options">${options.map(opt=>checkField(kind+':'+opt,(kind==='channels'?'# ':'@ ')+opt,(saved[kind]||[]).includes(opt))).join('')}</div></fieldset>`;
    dialog(title, choice('roles',roles)+choice('channels',channels),(data)=>{
      const state={rolesMode:data.get('rolesMode'),channelsMode:data.get('channelsMode'),roles:roles.filter(v=>data.has('roles:'+v)),channels:channels.filter(v=>data.has('channels:'+v))};
      subject.dataset.feedbackScope=JSON.stringify(state);
      markDirty();
      let badge=subject.querySelector(':scope > .feedback-scope-indicator');
      if(!badge){badge=document.createElement('span');badge.className='feedback-scope-indicator';subject.append(badge);}
      badge.textContent=`Roles: ${state.rolesMode} (${state.roles.length}) · Channels: ${state.channelsMode} (${state.channels.length})`;
    });
  }
  function readScope(element){try{return JSON.parse(element.dataset.feedbackScope||'{}')}catch{return {}}}

  // Capture clicks before old placeholder dialogs open; allow independent
  // role/channel filters at tile, group, and condition granularity.
  grid.addEventListener('click',e=>{
    const tile=e.target.closest('.advanced-rule-card');
    if(!tile)return;
    const removeAction=e.target.closest('[data-remove-action-chip]');
    if(removeAction){
      e.preventDefault();e.stopImmediatePropagation();
      const chip=removeAction.previousElementSibling;
      const area=removeAction.closest('.condition-actions');
      chip?.matches('.action-chip')&&chip.remove();
      removeAction.remove();
      if(area&&!area.querySelector('.action-chip')){
        const empty=document.createElement('span');
        empty.className='no-actions';empty.textContent='No actions added';
        area.prepend(empty);
      }
      markDirty();return;
    }
    const ruleScope=e.target.closest('[data-manage-roles],[data-manage-roles-channels]');
    const groupScope=e.target.closest('.group-roles-open');
    const conditionScope=e.target.closest('[data-condition-scope]');
    if(ruleScope||groupScope||conditionScope) {
      e.preventDefault();e.stopImmediatePropagation();
      const subject=conditionScope?.closest('.condition-builder') || groupScope?.closest('.rule-builder') || tile;
      const context=conditionScope?'Condition':groupScope?'Group':'Rule';
      openScope(subject,`${context} roles and channels — ${tile.querySelector('h2')?.textContent||'Rule'}`);
      return;
    }
    const groupHeader=e.target.closest('.rule-builder-head');
    if(groupHeader&&!e.target.closest('button,a,input,select')){
      e.stopImmediatePropagation();
      openScope(groupHeader.closest('.rule-builder'), 'Group roles and channels');
      return;
    }
    const titleOrDescription = e.target.parentElement === tile && ['H2','P'].includes(e.target.tagName);
    if((e.target===tile||titleOrDescription||e.target.closest('.advanced-empty'))&&!e.target.closest('button,a,input,select,.rule-builder,.condition-builder')){
      e.stopImmediatePropagation();
      openScope(tile,`Rule roles and channels — ${tile.querySelector('h2')?.textContent||'Rule'}`);
      return;
    }
    if(e.target.closest('[data-collapse-condition]')){
      e.stopImmediatePropagation();
      const item=e.target.closest('.condition-builder');
      const actions=item.querySelector('.condition-actions');
      if(actions)actions.hidden=!actions.hidden;
    }
    if(e.target.closest('.action-chip')){
      e.stopImmediatePropagation();
      openActionSettings(e.target.closest('.action-chip'));
    }
  },true);

  const actionFields={
    'Delete messages': [inputField('delay','Delay (seconds)',0,'number'),checkField('deleteOverflow','Delete overflow only',false)].join(''),
    'Send message': inputField('message','Message text','')+inputField('channel','Send to channel','#general'),
    'Report to moderators': inputField('channel','Report channel','#moderation')+inputField('reason','Reason',''),
    'DM user': inputField('message','Direct message',''),
    'Open moderation case': selectField('type','Punishment',['Risk','Warn','Mute','Kick','Ban'],'Warn')+inputField('reason','Reason',''),
    'Add reactions': inputField('emoji','Emoji','✅'),
    'Add roles': inputField('role','Role','Preview Member'),
    'Remove roles': inputField('role','Role','Preview Member'),
    'Set roles': inputField('role','Role','Preview Member'),
    'Manage levels': selectField('operation','Operation',['Add','Remove','Set'],'Add')+inputField('levels','Levels',1,'number')
  };
  function openActionSettings(chip){
    const name=chip.dataset.actionType||chip.textContent.replace(/\s*⚙\s*$/,'').trim();
    let stored={};try{stored=JSON.parse(chip.dataset.actionConfig||'{}');}catch{}
    const overlay=dialog('Action settings: '+name,actionFields[name]||inputField('value','Value',''),(data,form)=>{
      const result={};
      form.querySelectorAll('input,select').forEach(field=>{result[field.name]=field.type==='checkbox'?field.checked:field.value;});
      chip.dataset.actionType=name;
      chip.dataset.actionConfig=JSON.stringify(result);
      markDirty();
    },{onRemove:()=>{chip.nextElementSibling?.matches('[data-remove-action-chip]')&&chip.nextElementSibling.remove();chip.remove();markDirty();}});
    overlay.querySelectorAll('input,select').forEach(field=>{
      if(!(field.name in stored))return;
      if(field.type==='checkbox')field.checked=!!stored[field.name];else field.value=stored[field.name];
    });
  }
  // Mark each new chip with its own settings name.
  function decorateActionChips(root=grid){
    root.querySelectorAll('.condition-actions .action-chip').forEach(chip=>{
      if(!chip.dataset.actionType) chip.dataset.actionType=chip.textContent.replace(/\s*⚙\s*$/,'').trim();
      if(chip.nextElementSibling?.matches('[data-remove-action-chip]'))return;
      const remove=document.createElement('button');
      remove.type='button';remove.className='action-remove-button';
      remove.dataset.removeActionChip='';
      remove.title=`Remove ${chip.dataset.actionType}`;
      remove.setAttribute('aria-label',remove.title);
      remove.textContent='×';
      chip.after(remove);
    });
  }
  grid.addEventListener('click', e=>{
    if(!e.target.closest('.action-menu button'))return;
    const area=e.target.closest('.condition-actions');
    queueMicrotask(()=>decorateActionChips(area));
  });

  // Make all group-editor toolbar buttons actionable, and keep the parent group
  // in sync rather than modifying an isolated preview.
  grid.addEventListener('click',e=>{
    if(!e.target.closest('.group-expand-open'))return;
    queueMicrotask(()=>{
      const modal=document.getElementById('group-editor-modal');
      const tools=modal?.querySelector('.group-editor-tools');
      if(!tools)return;
      tools.removeAttribute('aria-hidden');
      tools.innerHTML='<span class="feedback-toolbar"><button type="button" data-group-tool="ascending" title="Sort ascending">A→Z</button><button type="button" data-group-tool="descending" title="Sort descending">Z→A</button><button type="button" data-group-tool="unique" title="Remove duplicates">Unique</button><button type="button" data-group-tool="reverse" title="Reverse order">Reverse</button><button type="button" data-group-tool="clear" title="Clear items">Clear</button></span>';
    });
  });
  document.getElementById('group-editor-modal')?.addEventListener('click',e=>{
    const tool=e.target.closest('[data-group-tool]');
    const item=e.target.closest('.group-editor-item');
    if(!tool&&!item)return;
    const modal=document.getElementById('group-editor-modal');
    const area=modal.querySelector('#group-editor-items');
    let values=[...area.querySelectorAll('.group-editor-item')].map(el=>el.textContent);
    if(item) values=values.filter((_,i)=>i!==[...area.children].indexOf(item));
    else {
      switch(tool.dataset.groupTool){
        case 'ascending':values.sort((a,b)=>a.localeCompare(b));break;
        case 'descending':values.sort((a,b)=>b.localeCompare(a));break;
        case 'unique':values=[...new Set(values)];break;
        case 'reverse':values.reverse();break;
        case 'clear':values=[];break;
      }
    }
    area.replaceChildren(...values.map(value=>{const span=document.createElement('button');span.type='button';span.className='group-editor-item';span.textContent=value;span.title='Remove';return span;}));
    const parent=grid.querySelector(`[data-rule="${modal.dataset.rule}"]`);
    const group=parent?.querySelectorAll('.rule-builder')?.[Number(modal.dataset.sourceIndex)];
    const entry=group?.querySelector('.builder-entry');
    entry?.querySelectorAll('.word-chip').forEach(chip=>chip.remove());
    values.forEach(value=>{const span=document.createElement('span');span.className='word-chip';span.textContent=value;entry?.append(span);});
    markDirty();
  });
  grid.addEventListener('change',e=>{
    if(e.target.closest('.condition-editor')){
      e.target.dispatchEvent(new Event('input',{bubbles:true}));
      markDirty();
    }
  });

  // Store exactly the frontend state needed to reconstruct delegated editors.
  const saveRules=()=>{
    const saved={};
    grid.querySelectorAll('.advanced-rule-card').forEach(card=>{
      const source=card.querySelector('.rule-builders');
      const clone=source.cloneNode(true);
      const originalFields=[...source.querySelectorAll('input,select,textarea')];
      clone.querySelectorAll('input,select,textarea').forEach((field,index)=>{
        const original=originalFields[index];
        if(!original)return;
        if(field.type==='checkbox'){
          if(original.checked)field.setAttribute('checked','');
          else field.removeAttribute('checked');
        }else if(field.tagName==='SELECT'){
          // cloneNode does not reliably copy a live select's changed selection.
          [...field.options].forEach((option,i)=>{
            if(original.options[i]?.selected)option.setAttribute('selected','');
            else option.removeAttribute('selected');
          });
        }else if(field.tagName==='TEXTAREA')field.textContent=original.value;
        else field.setAttribute('value',original.value);
      });
      saved[card.dataset.rule]={html:clone.innerHTML,scope:card.dataset.feedbackScope||''};
    });
    localStorage.setItem(rulesKey,JSON.stringify(saved));
  };
  const savedRules=read(rulesKey,{});
  grid.querySelectorAll('.advanced-rule-card').forEach(card=>{
    const item=savedRules[card.dataset.rule];
    if(!item)return;
    card.querySelector('.rule-builders').innerHTML=item.html||'';
    card.dataset.feedbackScope=item.scope||'';
    if(card.querySelector('.rule-builders').children.length)card.querySelector('.advanced-empty').style.display='none';
  });
  decorateActionChips();
  document.getElementById('automod-save')?.addEventListener('click',saveRules);
})();
