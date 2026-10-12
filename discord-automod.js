/*
 * Discord built-in AutoMod frontend preview for Next Step.
 * No Discord API calls are made; the integration team can map saved settings
 * to real Discord rules and permission-aware role/channel pickers later.
 */
(() => {
  const view = document.getElementById('discord-automod-view');
  const content = document.getElementById('discord-automod-content');
  const landing = document.getElementById('home-view');
  const advanced = document.getElementById('advanced-automod-view');
  const entry = document.querySelector('[data-automod-setup="discord"]');
  if (!view || !content || !landing || !entry) return;

  const key = 'next-step-discord-automod-rules-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const defaults = {
    rules: [
      { id:'profile', type:'profile', name:'Block Words in Member Profile Names', enabled:false, configured:false,
        words:'', regex:'', allowWords:'', categories:[], mentionLimit:20, mentionRaid:true, actions:{block:true,alert:false,timeout:false},
        customMessage:'', alertChannel:'', timeoutDuration:'60 secs', exemptions:[] },
      { id:'mentions', type:'mentions', name:'Block Mention Spam', enabled:true, configured:true,
        words:'', regex:'', allowWords:'', categories:[], mentionLimit:20, mentionRaid:true, actions:{block:true,alert:false,timeout:false},
        customMessage:'', alertChannel:'', timeoutDuration:'60 secs', exemptions:[] },
      { id:'spam', type:'spam', name:'Block Suspected Spam Content', enabled:false, configured:false,
        words:'', regex:'', allowWords:'', categories:[], mentionLimit:20, mentionRaid:true, actions:{block:true,alert:false,timeout:false},
        customMessage:'', alertChannel:'', timeoutDuration:'60 secs', exemptions:[] },
      { id:'flagged', type:'flagged', name:'Block Commonly Flagged Words', enabled:false, configured:false,
        words:'', regex:'', allowWords:'', categories:[], mentionLimit:20, mentionRaid:true,
        actions:{block:true,alert:false,timeout:false},customMessage:'',alertChannel:'',timeoutDuration:'60 secs',exemptions:[] },
      { id:'custom-1', type:'custom', name:'Block Custom Words', enabled:false, configured:false,
        words:'', regex:'', allowWords:'', categories:[], mentionLimit:20, mentionRaid:true, actions:{block:true,alert:false,timeout:false},
        customMessage:'', alertChannel:'', timeoutDuration:'60 secs', exemptions:[] }
    ],
    sensitiveFilter:'all'
  };
  let saved;
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    saved = data && Array.isArray(data.rules) && data.rules.length ? data : clone(defaults);
  } catch { saved = clone(defaults); }
  let draft = clone(saved);
  let activeId = null;
  let filterOpen = false;
  let moreId = null;
  let dialogState = null;
  let sourceSaveText = null;
  const bar = document.getElementById('discord-automod-unsaved');
  const label = document.getElementById('discord-automod-unsaved-label');
  const alignSaveBar = () => {
    const shell = view.querySelector('.discord-automod-shell');
    if (!shell || !bar) return;
    const box = shell.getBoundingClientRect();
    bar.style.left = box.left + 'px';
    bar.style.width = box.width + 'px';
    bar.style.transform = 'none';
  };
  window.addEventListener('resize', alignSaveBar);
  const definitions = {
    profile:{ icon:'◉', description:"Block specific language in your members' usernames.", tags:['block member interactions','send alert'] },
    mentions:{ icon:'@', description:'Prevent excessive mentions and mention raids.', tags:['block message','send alert','timeout member'] },
    spam:{ icon:'◉', description:'Monitor messages, forum posts, and threads for potentially spammy content or activity. (Support for English only)', tags:['block message','send alert'] },
    flagged:{ icon:'☰', description:'Flag messages that contain profanity and more. (Support for English only)', tags:['block message','send alert'] },
    custom:{ icon:'☷', description:'Create your own filter to block specific language from your server.', tags:['block message','send alert','timeout member'] }
  };
  const ruleIcon = type => {
    const shapes = {
      profile:'<circle cx="12" cy="8" r="3.1"/><path d="M5.5 19v-1.5a6.5 6.5 0 0 1 13 0V19"/><circle cx="12" cy="12" r="10"/>',
      spam:'<path d="M4 12c0-5.5 3.2-9 8-9s8 3.5 8 9v7l-3-1.5-3.3 1.5-3.4-1.5L7 19l-3-1.5Z"/><path d="M8.5 11h.01M15.5 11h.01"/><path d="M9 15c1.6-1 4.4-1 6 0"/>',
      flagged:'<path d="M4 7h16M4 12h16M4 17h16"/>',
      custom:'<path d="M4 7h12M4 12h12M4 17h8M18 14v7M14.5 17.5h7"/>'
    };
    if(type==='mentions')return '@';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[type]||shapes.flagged}</svg>`;
  };
  const demoScopes = [
    {id:'role:moderator',label:'@ Moderator',kind:'role'},
    {id:'role:member',label:'@ Member',kind:'role'},
    {id:'role:vip',label:'@ VIP',kind:'role'},
    {id:'channel:general',label:'#general',kind:'channel'},
    {id:'channel:rules',label:'#rules',kind:'channel'},
    {id:'channel:moderator-only',label:'#moderator-only',kind:'channel'},
    {id:'channel:shadows-place',label:'#shadows-place',kind:'channel'},
    {id:'channel:main-radical-highway',label:'#main-radical-highway',kind:'channel'}
  ];
  const phraseCount = value => String(value||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean).length;
  const regexCount = value => String(value||'').split(/\n/).filter(s=>s.trim()).length;
  const timeoutChoices = ['60 secs','5 mins','10 mins','1 hour','1 day','1 week'];
  const getRule = id => draft.rules.find(rule => rule.id === id);
  const isDirty = () => JSON.stringify(draft) !== JSON.stringify(saved);
  const updateBar = () => {
    bar.hidden = !isDirty();
    const rule = getRule(activeId);
    if (label) label.textContent = rule && isDirty() ?
      `Currently editing "${rule.name || 'Untitled Rule'}" rule` :
      'Careful — you have unsaved changes!';
  };
  const checked = on => on ? ' checked' : '';
  const attr = value => escapeHtml(value);
  const setHash = hash => history.replaceState(null,'',location.pathname + location.search + hash);

  function goSummary() {
    view.hidden = true;
    advanced.hidden = true;
    landing.hidden = false;
    setHash('');
    document.querySelector('.main-content')?.scrollTo({top:0,behavior:'auto'});
    entry.querySelector('button')?.focus();
  }
  function goDiscord() {
    view.hidden = false;
    landing.hidden = true;
    advanced.hidden = true;
    setHash('#discord-auto-moderation');
    render();
    document.querySelector('.main-content')?.scrollTo({top:0,behavior:'auto'});
  }
  entry.tabIndex=0;
  entry.setAttribute('role','button');
  entry.addEventListener('click',event=>{
    if(event.target.closest('a,input,select'))return;
    goDiscord();
  });
  entry.addEventListener('keydown',event=>{
    if(event.target !== entry || (event.key!=='Enter' && event.key!==' '))return;
    event.preventDefault();
    goDiscord();
  });
  view.querySelectorAll('[data-discord-back]').forEach(button=>button.addEventListener('click',goSummary));
  window.addEventListener('hashchange',()=>{
    if(location.hash==='#discord-auto-moderation') goDiscord();
    else if(!view.hidden){view.hidden=true;landing.hidden=false;}
  });

  const actionChips = rule => {
    const tags = !rule.configured ? definitions[rule.type].tags : [
      ...(rule.actions.block?[rule.type==='profile'?'block member interactions':'block message']:[]),
      ...(rule.actions.alert?[`send alert${rule.alertChannel?' ('+(demoScopes.find(s=>s.id===rule.alertChannel)?.label||rule.alertChannel)+')':''}`]:[]),
      ...(rule.actions.timeout&&['custom','mentions'].includes(rule.type)?[`timeout member (${rule.timeoutDuration||'60 secs'})`]:[])
    ];
    return tags.map(tag=>`<span class="dam-chip">${escapeHtml(tag)}</span>`).join('');
  };
  const ruleControls = rule => {
    const configured = rule.configured;
    const buttonLabel = configured?'Edit':rule.type==='custom'?'Create':'Set Up';
    return `<div class="dam-rule-controls">
      ${configured ? `<label class="dam-switch"><input type="checkbox" aria-label="Enable ${attr(rule.name)}" data-dam-enable="${attr(rule.id)}"${checked(rule.enabled)}><span></span></label>`:''}
      ${configured ? `<button class="dam-more" type="button" data-dam-more="${attr(rule.id)}" aria-label="More rule options">⋮</button>` : ''}
      ${!configured ? `<button type="button" class="dam-primary dam-setup" data-dam-edit="${attr(rule.id)}">${buttonLabel}</button>` : ''}
    </div>`;
  };
  const ruleCard = rule => {
    const desc = definitions[rule.type];
    const isOpen = rule.id === activeId;
    return `<article class="dam-rule-card${isOpen?' is-expanded':''}" data-dam-rule="${attr(rule.id)}">
      ${isOpen ? renderEditor(rule) : `
        <div class="dam-rule-summary">
          <span class="dam-rule-icon" aria-hidden="true">${ruleIcon(rule.type)}</span>
          <div class="dam-rule-copy">
            <button class="dam-rule-title" type="button" data-dam-edit="${attr(rule.id)}">${escapeHtml(rule.name)}</button>
            ${rule.type==='custom'&&rule.configured?`<small class="dam-word-total">(${phraseCount(rule.words)} ${phraseCount(rule.words)===1?'word':'words'})</small>`:''}
            ${!rule.configured ? `<p>${escapeHtml(desc.description)}</p>` : ''}
            <div class="dam-chips">${actionChips(rule)}</div>
          </div>
          ${ruleControls(rule)}
        </div>`}
      ${moreId===rule.id?`<div class="dam-rule-menu">
        <button type="button" data-dam-edit-menu="${attr(rule.id)}">Edit Rule</button>
        ${rule.type==='custom'?`<button type="button" data-dam-remove-rule="${attr(rule.id)}">Delete Rule</button>
        <button type="button" data-dam-copy-id="${attr(rule.id)}">Copy AutoMod Rule ID</button>`:''}
      </div>`:''}
    </article>`;
  };

  function renderWords(rule) {
    const helper = 'Separate words or phrases with commas or new lines. Use * at the beginning, end, or both for partial matching.';
    return `<div class="dam-field">
      <textarea id="dam-words-${attr(rule.id)}" aria-label="Words or phrases to block" data-dam-field="words" rows="4" placeholder="Enter 1 or more words or phrases">${escapeHtml(rule.words)}</textarea>
      <div class="dam-word-foot"><span>${helper}</span><span data-dam-counter>${phraseCount(rule.words)} / 1000</span></div>
    </div>
    <details class="dam-accordion"><summary>Use regex patterns for advanced matching (optional)</summary>
      <textarea data-dam-field="regex" rows="3" placeholder="^b(a|@)d\\s(w|0)rd(s|$)">${escapeHtml(rule.regex)}</textarea>
      <span class="dam-item-counter" data-dam-regex-counter>${regexCount(rule.regex)} / 10</span>
      <p>Use a new line for each regex pattern. Case-insensitive and global flags are applied by default (and other flags are not supported). Visit our <a href="https://support.discord.com/" target="_blank" rel="noopener noreferrer">Help Center</a> for more info.</p>
    </details>
    <details class="dam-accordion"><summary>Allow words and phrases (optional)</summary>
      <textarea data-dam-field="allowWords" rows="3" placeholder="Enter 1 or more words or phrases">${escapeHtml(rule.allowWords)}</textarea>
      <span class="dam-item-counter" data-dam-allow-counter>${phraseCount(rule.allowWords)} / 100</span>
      <p>Add words or phrases members are allowed to use, separated by a comma (cat, happy puppy, *cookie*).</p>
    </details>`;
  }
  function renderCondition(rule) {
    switch(rule.type){
      case 'profile': case 'custom': return renderWords(rule);
      case 'mentions': return `<div class="dam-mention-limit">
        <span class="dam-response-icon">@</span><div class="dam-response-copy"><strong>Unique mentions (role + user) per message</strong>
        <small>Limit the number of unique mentions in each message.</small></div>
        <div class="dam-number-stepper"><button type="button" data-dam-step="-1" aria-label="Decrease mention limit">−</button>
        <input aria-label="Unique mentions per message" type="number" min="1" max="50" data-dam-field="mentionLimit" value="${attr(rule.mentionLimit ?? 20)}">
        <button type="button" data-dam-step="1" aria-label="Increase mention limit">+</button></div>
      </div><label class="dam-mention-raid"><span class="dam-response-icon">@</span>
        <span class="dam-response-copy"><strong>Enable mention raid detection</strong><small>Allow automatic detection of mention raids in the server.</small></span>
        <input type="checkbox" data-dam-raid${checked(rule.mentionRaid!==false)}>
      </label>`;
      case 'spam': return '<p class="dam-static-condition">If message is suspected of being spam...</p>';
      case 'flagged': return `
        <div class="dam-categories">${[
          ['Severe Profanity','Extreme forms of swearing or cursing'],
          ['Insults & Slurs','Personally insulting terms and terms that may be considered hate speech'],
          ['Sexual Content','Terms that refer to sexually explicit behavior or activity']
        ].map(([category,description])=>
          `<label><input type="checkbox" data-dam-category="${attr(category)}"${checked(rule.categories.includes(category))}>
           <span><strong>${escapeHtml(category)}</strong><small>${escapeHtml(description)}</small></span></label>`).join('')}</div>
        <details class="dam-accordion"><summary>Allow words and phrases (optional)</summary>
          <textarea data-dam-field="allowWords" rows="3" placeholder="Enter 1 or more words or phrases">${escapeHtml(rule.allowWords)}</textarea>
          <span class="dam-item-counter" data-dam-allow-counter>${phraseCount(rule.allowWords)} / 100</span>
        </details>`;
      default:return '';
    }
  }
  function responseRows(rule) {
    const profile = rule.type === 'profile';
    const opts = [
      {key:'block',label:profile?'Block member interactions':'Block message',
        detail:profile?'Prevents a member from using text, voice, or other interactions.':
          rule.type==='mentions'?'Block messages with an excessive # of unique mentions.':
          rule.type==='spam'?'Block messages with spam-like content from being posted.':
          rule.type==='flagged'?'Block messages containing these words from being posted.':
          'Block messages containing the listed keywords from being posted.'},
      {key:'alert',label:'Send alert',detail:'Sends an alert containing the flagged message to a chosen channel.'},
      ...(['custom','mentions'].includes(rule.type)?[{key:'timeout',label:'Timeout member',
        detail:"Temporarily disables a member's ability to send messages or join voice channels."}]:[])
    ];
    return `<div class="dam-response-list">${opts.map(opt=>`<div class="dam-response">
      <button type="button" class="dam-response-row${profile&&opt.key==='block'?' dam-locked-action':''}" data-dam-action-open="${opt.key}" aria-pressed="${!!rule.actions[opt.key]}"${profile&&opt.key==='block'?' aria-disabled="true" title="Member interaction blocking is required for this rule"':''}>
        <span class="dam-response-icon">${opt.key==='alert'?'#':opt.key==='timeout'?'◷':'⊗'}</span>
        <span class="dam-response-copy"><strong>${opt.label}</strong><small>${opt.detail}</small>
          ${opt.key==='block'&&!profile&&rule.actions.block?
            '<small>A custom error message can be shown to members.</small>':''}
          ${opt.key==='alert'&&rule.actions.alert&&rule.alertChannel?
            `<small>Alert message will be sent to ${escapeHtml(demoScopes.find(s=>s.id===rule.alertChannel)?.label||rule.alertChannel)}.</small>`:''}
          ${opt.key==='timeout'&&rule.actions.timeout?
            `<small>Members who exceed your set mention limit will be timed out for ${escapeHtml(rule.timeoutDuration||'60 secs')}.</small>`:''}
        </span>
        <span class="dam-action-box${rule.actions[opt.key]?' is-on':''}" aria-hidden="true">${rule.actions[opt.key]?'✓':''}</span>
      </button>
      ${opt.key==='block'&&!profile&&rule.actions.block?
        `<div class="dam-action-links"><button type="button" class="dam-link" data-dam-configure="message">${rule.customMessage?'Edit Custom Message':'Edit Custom Message'}</button></div>`:''}
      ${opt.key==='alert'&&rule.actions.alert?
        `<div class="dam-action-links"><button type="button" class="dam-link" data-dam-configure="alert">Edit Channel</button></div>`:''}
      ${opt.key==='timeout'&&rule.actions.timeout?
        `<div class="dam-action-links"><button type="button" class="dam-link" data-dam-configure="timeout">Edit Duration</button></div>`:''}
    </div>`).join('')}</div>`;
  }
  function exemptionPicker(rule) {
    const scope = rule.type==='profile'?'roles':'roles or channels';
    return `<div class="dam-exempt-picker">
      <label for="dam-exempt-${attr(rule.id)}">Allow certain ${scope} (optional)</label>
      <div class="dam-picked">${rule.exemptions.map(id=>{
        const found=demoScopes.find(s=>s.id===id);
        return found?`<span class="dam-selected-chip">${escapeHtml(found.label)}
          <button type="button" data-dam-exempt-remove="${attr(id)}" aria-label="Remove ${attr(found.label)}">×</button></span>`:'';}).join('')}</div>
      <input id="dam-exempt-${attr(rule.id)}" type="search" data-dam-exempt-search placeholder="Search channels or roles" autocomplete="off">
      <div class="dam-picker-options" hidden>${demoScopes.filter(e=>rule.type!=='profile'||e.kind==='role').map(e=>
        `<button type="button" data-dam-exempt-option="${attr(e.id)}" data-dam-exempt-label="${attr(e.label.toLowerCase())}">
          <span>${escapeHtml(e.label)}</span><span>${rule.exemptions.includes(e.id)?'✓':'+'}</span></button>`).join('')}</div>
      <small>Psst — members with Admin and Manage Server permissions are always excluded from filter rules.</small>
    </div>`;
  }
  function renderEditor(rule) {
    const desc=definitions[rule.type];
    return `<div class="dam-editor">
      <div class="dam-editor-top">
        <label class="dam-editor-name">Rule Name
          <input type="text" maxlength="100" data-dam-field="name" value="${attr(rule.name)}" aria-label="Rule Name">
        </label>
        <label class="dam-switch"><input type="checkbox" aria-label="Enable ${attr(rule.name)}" data-dam-enable="${attr(rule.id)}"${checked(rule.enabled)}><span></span></label>
        <button class="dam-more" type="button" data-dam-more="${attr(rule.id)}" aria-label="More rule options">⋮</button>
      </div>
      <div class="dam-step">
        <span class="dam-step-number">1</span>
        <div class="dam-step-panel">
          <h3>${rule.type==='spam'?'If message is suspected of being spam...':rule.type==='mentions'?'Configure limits':rule.type==='flagged'?'Select the type of language':'Choose your words'}</h3>
          ${renderCondition(rule)}
        </div>
      </div>
      <div class="dam-step-arrow" aria-hidden="true">↓</div>
      <div class="dam-step">
        <span class="dam-step-number">2</span>
        <div class="dam-step-panel"><h3>Choose a response</h3>${responseRows(rule)}</div>
      </div>
      <div class="dam-step-arrow" aria-hidden="true">×</div>
      <div class="dam-step">
        <span class="dam-step-number">3</span>
        <div class="dam-step-panel">${exemptionPicker(rule)}</div>
      </div>
    </div>`;
  }
  function renderSensitive() {
    const labelText={
      all:'Filter messages from all members',
      limited:'Filter messages from server members without roles',
      none:'Do not filter'
    };
    const descriptions={
      all:'All messages will be filtered for sensitive image-based media.',
      limited:'This option is not available for Community Servers.',
      none:'This option is not available for Community Servers.'
    };
    return `<section class="dam-sensitive" aria-labelledby="dam-sensitive-title">
      <h3 id="dam-sensitive-title">Sensitive content filters</h3>
      <p>Choose if server members can share image-based media detected by Discord's sensitive content filters. This setting applies to channels that are not age-restricted.</p>
      <div class="dam-sensitive-current"><div><strong>${labelText[draft.sensitiveFilter]||labelText.all}</strong>
        <small>${descriptions[draft.sensitiveFilter]||descriptions.all}</small></div>
        <button type="button" data-dam-change-sensitive>Change</button></div>
      ${filterOpen?`<fieldset class="dam-sensitive-options" aria-label="Sensitive content filtering">
        ${Object.keys(labelText).map(id=>`<label class="${id==='all'?'':'dam-disabled'}">
          <span><strong>${labelText[id]}</strong><small>${descriptions[id]}</small></span>
          <input type="radio" name="dam-sensitive" value="${id}"${checked(draft.sensitiveFilter===id)}${id!=='all'?' disabled':''}>
        </label>`).join('')}
      </fieldset>`:''}
    </section>`;
  }
  function openDialog(type, ruleId) {
    const rule=getRule(ruleId);
    if(!rule)return;
    dialogState={type,ruleId,value:type==='alert'?rule.alertChannel||'':
      type==='timeout'?rule.timeoutDuration||'60 secs':
      type==='message'?rule.customMessage||'':''};
    renderDialog();
  }
  function renderDialog() {
    view.querySelector('.dam-modal-backdrop')?.remove();
    if(!dialogState)return;
    const rule=getRule(dialogState.ruleId);
    if(!rule){dialogState=null;return;}
    const {type}=dialogState;
    let title='',description='',body='',confirm='Save';
    if(type==='alert'){
      title='Send alert';
      description='Choose a channel to post the alert message to. The alert will contain the flagged message contents, author, and channel it was originally posted to.';
      const selected=demoScopes.find(s=>s.id===dialogState.value);
      body=`<div class="dam-modal-channel">
        <input type="search" data-dam-dialog-channel autocomplete="off" aria-label="Select a text channel"
          placeholder="Select a text channel" value="${attr(selected?.label||'')}">
        <span class="dam-select-arrow">⌄</span>
        <div class="dam-channel-options" hidden>${demoScopes.filter(s=>s.kind==='channel').map(s=>
          `<button type="button" data-dam-dialog-channel-option="${attr(s.id)}" data-channel-label="${attr(s.label.toLowerCase())}">${escapeHtml(s.label)}</button>`).join('')}</div>
      </div><p class="dam-channel-note">Anyone with access to this text channel will see the alert.</p>`;
    }else if(type==='timeout'){
      title='Timeout member';
      description='Choose how long you want to timeout a member if they break this rule. Members in timeout are temporarily not allowed to chat, react in text channels, or connect to voice or Stage channels.';
      body=`<select data-dam-dialog-duration aria-label="Timeout duration">${timeoutChoices.map(t=>
        `<option value="${attr(t)}"${t===dialogState.value?' selected':''}>${escapeHtml(t)}</option>`).join('')}</select>`;
    }else if(type==='message'){
      title='Edit Custom Message';confirm='Edit';
      description="Your custom message will be shown when AutoMod blocks a member's message. This is a chance to help members understand your server's guidelines!";
      body=`<textarea data-dam-dialog-message maxlength="150" rows="3" placeholder="Enter your custom message">${escapeHtml(dialogState.value)}</textarea>`;
    }else if(type==='delete'){
      title='Remove Rule';confirm='Confirm';
      description=`Are you sure you want to remove the "${rule.name}" AutoMod rule?`;
    }
    const overlay=document.createElement('div');
    overlay.className='dam-modal-backdrop';
    overlay.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="dam-modal-title" class="dam-modal">
      <button type="button" class="dam-modal-close" data-dam-dialog-cancel aria-label="Close dialog">×</button>
      <h2 id="dam-modal-title">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p>
      ${body}<div class="dam-modal-error" data-dam-dialog-error hidden></div>
      <div class="dam-modal-footer">
        <button type="button" data-dam-dialog-cancel>Cancel</button>
        <button type="button" data-dam-dialog-save class="${type==='delete'?'danger':''}">${confirm}</button>
      </div>
    </section>`;
    view.append(overlay);
    overlay.querySelector('input,select,textarea,[data-dam-dialog-save]')?.focus();
  }
  function closeDialog(){dialogState=null;view.querySelector('.dam-modal-backdrop')?.remove();}
  view.addEventListener('click',event=>{
    const cancel=event.target.closest('[data-dam-dialog-cancel]');
    if(cancel || event.target.classList.contains('dam-modal-backdrop')){closeDialog();return;}
    const option=event.target.closest('[data-dam-dialog-channel-option]');
    if(option){
      dialogState.value=option.dataset.damDialogChannelOption;
      const input=view.querySelector('[data-dam-dialog-channel]');
      input.value=demoScopes.find(s=>s.id===dialogState.value)?.label||'';
      view.querySelector('.dam-channel-options').hidden=true;
      view.querySelector('[data-dam-dialog-error]').hidden=true;
      return;
    }
    if(event.target.closest('[data-dam-dialog-channel]')){
      view.querySelector('.dam-channel-options').hidden=false;return;
    }
    if(!event.target.closest('[data-dam-dialog-save]'))return;
    const {type,ruleId}=dialogState;
    const rule=getRule(ruleId);
    if(!rule)return;
    if(type==='alert'){
      if(!dialogState.value){
        const error=view.querySelector('[data-dam-dialog-error]');
        error.textContent='Please select a channel.';error.hidden=false;return;
      }
      rule.alertChannel=dialogState.value;
      rule.actions.alert=true;
    }else if(type==='timeout'){
      rule.timeoutDuration=view.querySelector('[data-dam-dialog-duration]').value;
      rule.actions.timeout=true;
    }else if(type==='message'){
      rule.customMessage=view.querySelector('[data-dam-dialog-message]').value;
    }else if(type==='delete'){
      const index=draft.rules.findIndex(r=>r.id===ruleId);
      if(index!==-1){
        if(rule.type==='custom'){
          draft.rules.splice(index,1);
          if(!draft.rules.some(r=>r.type==='custom')){
            const replacement=clone(defaults.rules.find(r=>r.type==='custom'));
            draft.rules.push(replacement);
          }
        }else{
          draft.rules[index]={...clone(defaults.rules.find(r=>r.type===rule.type)),id:ruleId};
          if(rule.type==='mentions'){draft.rules[index].enabled=false;draft.rules[index].configured=false;}
        }
      }
      activeId=null;moreId=null;
    }
    closeDialog();render();
  });
  view.addEventListener('input',event=>{
    if(event.target.matches('[data-dam-dialog-channel]')){
      const value=event.target.value.toLowerCase();
      const selected=demoScopes.find(s=>s.kind==='channel'&&s.label.toLowerCase()===value);
      dialogState.value=selected?.id||'';
      const menu=view.querySelector('.dam-channel-options');
      menu.hidden=false;
      menu.querySelectorAll('button').forEach(button=>button.hidden=!button.dataset.channelLabel.includes(value));
      return;
    }
  });
  function render() {
    const profile=draft.rules.filter(r=>r.type==='profile');
    const contentRules=draft.rules.filter(r=>r.type!=='profile');
    content.innerHTML=`<section class="dam-section"><h3>Members</h3>${profile.map(ruleCard).join('')}</section>
      <section class="dam-section"><h3>Content</h3>${contentRules.map(ruleCard).join('')}
        ${draft.rules.some(rule=>rule.type==='custom'&&rule.configured)?'<button type="button" class="dam-another" data-dam-create-custom>⊕ Create Block Custom Words</button>':''}
      </section>${renderSensitive()}`;
    renderDialog();
    alignSaveBar();
    updateBar();
  }

  function setActive(id) {
    if (!getRule(id)) return;
    if (activeId === id) {activeId=null; moreId=null;render();return;}
    const rule = getRule(id);
    activeId=id;
    moreId=null;
    if (!rule.configured) {
      rule.configured=true;
      rule.enabled=true;
    }
    render();
  }
  content.addEventListener('click', event => {
    const target=event.target;
    const edit=target.closest('[data-dam-edit]');
    const editMenu=target.closest('[data-dam-edit-menu]');
    const more=target.closest('[data-dam-more]');
    const remove=target.closest('[data-dam-remove-rule]');
    const copy=target.closest('[data-dam-copy-id]');
    const option=target.closest('[data-dam-exempt-option]');
    const removeExempt=target.closest('[data-dam-exempt-remove]');
    const response=target.closest('[data-dam-action-open]');
    const config=target.closest('[data-dam-configure]');
    const step=target.closest('[data-dam-step]');
    if (config) {
      const ruleId=config.closest('[data-dam-rule]')?.dataset.damRule;
      openDialog(config.dataset.damConfigure,ruleId);return;
    }
    if (response) {
      const rule=getRule(response.closest('[data-dam-rule]')?.dataset.damRule);
      if(!rule)return;
      const action=response.dataset.damActionOpen;
      if(action==='block'){
        if(rule.type==='profile')return;
        rule.actions.block=!rule.actions.block;render();return;
      }
      if(target.closest('.dam-action-box')&&rule.actions[action]){
        rule.actions[action]=false;render();return;
      }
      openDialog(action,rule.id);return;
    }
    if(step){
      const rule=getRule(step.closest('[data-dam-rule]')?.dataset.damRule);
      if(rule){
        rule.mentionLimit=Math.max(1,Math.min(50,Number(rule.mentionLimit||20)+Number(step.dataset.damStep)));
        render();
      }
      return;
    }
    if(editMenu){activeId=editMenu.dataset.damEditMenu;moreId=null;render();return;}
    if (edit){setActive(edit.dataset.damEdit);return;}
    const summary=target.closest('.dam-rule-summary');
    if(summary && !target.closest('button,input,label,a')){
      setActive(summary.closest('[data-dam-rule]').dataset.damRule);return;
    }
    if (more){moreId=moreId===more.dataset.damMore?null:more.dataset.damMore;render();return;}
    if (remove){
      openDialog('delete',remove.dataset.damRemoveRule);return;
    }
    if(copy){
      const rule=getRule(copy.dataset.damCopyId);
      if(!rule)return;
      const textId=rule.id;
      navigator.clipboard?.writeText(textId).catch(()=>{});
      moreId=null;render();return;
    }
    if (target.closest('[data-dam-create-custom]')){
      const base=clone(defaults.rules.find(rule=>rule.type==='custom'));
      let suffix=2;
      while(draft.rules.some(item=>item.id==='custom-'+suffix))suffix++;
      base.id='custom-'+suffix;
      base.name='Block Custom Words '+(draft.rules.filter(rule=>rule.type==='custom').length+1);
      base.configured=true;
      base.enabled=true;
      draft.rules.push(base);
      activeId=base.id;moreId=null;render();return;
    }
    if (target.closest('[data-dam-change-sensitive]')){filterOpen=!filterOpen;render();return;}
    const picker=target.closest('.dam-exempt-picker');
    if (option || removeExempt) {
      const card=target.closest('[data-dam-rule]');
      const rule=card&&getRule(card.dataset.damRule);
      if(!rule)return;
      const id=option?.dataset.damExemptOption || removeExempt?.dataset.damExemptRemove;
      rule.exemptions=rule.exemptions.includes(id)?rule.exemptions.filter(value=>value!==id):[...rule.exemptions,id];
      render();return;
    }
    if(!picker)content.querySelectorAll('.dam-picker-options').forEach(options=>options.hidden=true);
  });
  content.addEventListener('focusin',event=>{
    if (!event.target.matches('[data-dam-exempt-search]'))return;
    const picker=event.target.closest('.dam-exempt-picker');
    const choices=picker.querySelector('.dam-picker-options');
    choices.hidden=false;
    choices.querySelectorAll('button').forEach(button=>button.hidden=false);
  });
  content.addEventListener('input',event=>{
    const input=event.target;
    if(input.matches('[data-dam-exempt-search]')){
      const picker=input.closest('.dam-exempt-picker');
      const options=picker?.querySelector('.dam-picker-options');
      if(options){
        options.hidden=false;
        const query=input.value.toLowerCase().trim();
        options.querySelectorAll('button').forEach(button=>
          button.hidden=!!query&&!button.dataset.damExemptLabel.includes(query));
      }
      return;
    }
    if(!input.matches('[data-dam-field]'))return;
    const rule=getRule(input.closest('[data-dam-rule]')?.dataset.damRule);
    if(!rule)return;
    const field=input.dataset.damField;
    if(!(field in rule))return;
    const value=input.type==='number' ? Math.max(1,Number(input.value)||1) : input.value;
    rule[field]=value;
    if(field==='words'){
      const counter=input.closest('.dam-field')?.querySelector('[data-dam-counter]');
      if(counter)counter.textContent=phraseCount(input.value)+' / 1000';
    }
    if(field==='regex'){
      const counter=input.closest('.dam-accordion')?.querySelector('[data-dam-regex-counter]');
      if(counter)counter.textContent=regexCount(input.value)+' / 10';
    }
    if(field==='allowWords'){
      const counter=input.closest('.dam-accordion')?.querySelector('[data-dam-allow-counter]');
      if(counter)counter.textContent=phraseCount(input.value)+' / 100';
    }
    updateBar();
  });
  content.addEventListener('change',event=>{
    const input=event.target;
    if(input.matches('[name="dam-sensitive"]')){
      draft.sensitiveFilter=input.value;
      render();
      filterOpen=true;
      return;
    }
    const rule=getRule(input.closest('[data-dam-rule]')?.dataset.damRule);
    if(!rule)return;
    if(input.matches('[data-dam-enable]')){
      rule.enabled=input.checked;
      render();return;
    }
    if(input.matches('[data-dam-category]')){
      const value=input.dataset.damCategory;
      rule.categories=input.checked?[...new Set([...rule.categories,value])]:rule.categories.filter(item=>item!==value);
      updateBar();return;
    }
    if(input.matches('[data-dam-raid]')){rule.mentionRaid=input.checked;updateBar();return;}
    if(input.matches('[data-dam-field]')) {
      const field=input.dataset.damField;
      rule[field]=input.type==='number'?Math.max(1,Number(input.value)||1):input.value;
      updateBar();
    }
  });
  bar.querySelector('[data-dam-save]').addEventListener('click',()=>{
    for (const rule of draft.rules) {
      if(!rule.configured || !rule.enabled)continue;
      if(['profile','custom'].includes(rule.type)&&!(rule.words.trim()||rule.regex.trim())){
        label.textContent=`Add a blocked word or regex pattern to "${rule.name}" before saving.`;
        activeId=rule.id;
        render();
        label.textContent=`Add a blocked word or regex pattern to "${rule.name}" before saving.`;
        return;
      }
      if(rule.type==='flagged'&&!rule.categories.length){
        activeId=rule.id;render();
        label.textContent='Choose at least one language category before saving.';return;
      }
      if(['profile','custom'].includes(rule.type)&&phraseCount(rule.words)>1000){
        activeId=rule.id;render();
        label.textContent='You can only add up to 1000 blocked words or phrases.';return;
      }
      if(['profile','custom'].includes(rule.type)&&regexCount(rule.regex)>10){
        activeId=rule.id;render();
        label.textContent='You can only add up to 10 regular expression patterns.';return;
      }
      if(['profile','custom','flagged'].includes(rule.type)&&phraseCount(rule.allowWords)>100){
        activeId=rule.id;render();
        label.textContent='You can only allow up to 100 words or phrases.';return;
      }
      if(rule.actions.alert&&!rule.alertChannel){
        activeId=rule.id;
        render();
        label.textContent=`Choose an alert channel for "${rule.name}" before saving.`;
        return;
      }
    }
    saved=clone(draft);
    try{localStorage.setItem(key,JSON.stringify(saved));}
    catch(error){label.textContent='Unable to save in this browser. Check storage permissions.';return;}
    activeId=null;moreId=null;filterOpen=false;render();
  });
  bar.querySelector('[data-dam-cancel]').addEventListener('click',()=>{
    draft=clone(saved);
    activeId=null;moreId=null;filterOpen=false;render();
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape' || view.hidden)return;
    if(dialogState){closeDialog();return;}
    if(content.querySelector('.dam-picker-options:not([hidden])')){
      content.querySelectorAll('.dam-picker-options').forEach(el=>el.hidden=true);
    }else if(activeId){activeId=null;moreId=null;render();}
    else if(filterOpen){filterOpen=false;render();}
    else goSummary();
  });
  document.addEventListener('click',event=>{
    if(view.hidden || event.target.closest('.dam-exempt-picker'))return;
    content.querySelectorAll('.dam-picker-options').forEach(options=>options.hidden=true);
  });
  if(location.hash==='#discord-auto-moderation')goDiscord();
  else render();
})();
