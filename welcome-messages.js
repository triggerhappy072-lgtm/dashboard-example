(() => {
  'use strict';
  const root = document.querySelector('.wm-page');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const key = 'next-step-welcome-messages-v2';
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => 'wm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  const str = value => String(value == null ? '' : value);
  const clean = value => str(value).trim();
  const esc = value => str(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const notify = message => typeof window.showNotification === 'function' ? window.showNotification(message, 4000) : console.info(message);
  const token = name => '$' + '{' + name + '}';
  const meta = {
    join: { name:'Join messages',event:'join',detail:'joins',copy:'Each message listed below will be sent every time someone joins the server.',initial:'Welcome ' + token('usermention') + ' to **' + token('guildname') + '**!' },
    leave: { name:'Leave messages',event:'leave',detail:'leaves',copy:'Each message listed below will be sent every time someone leaves the server.',initial:token('username') + ' has left ' + token('guildname') + '.' },
    boost: { name:'Boost messages',event:'boost',detail:'boosts',copy:'Each message listed below will be sent every time someone boosts the server.',initial:'Thank you ' + token('usermention') + ' for boosting ' + token('guildname') + '!' },
    role: { name:'Role assignment messages',event:'role assignment',detail:'gets or loses a role',copy:'Each message listed below will be sent every time someone gets or loses the specified role.',initial:token('usermention') + ' has received ' + token('rolename') + '!' }
  };
  const defaultMessage = type => ({
    id:uid(), target:'#welcome', kind:'server', role:'',roleAction:'get',
    content:meta[type].initial, embed:false,author:'',title:'',description:'',fieldName:'',fieldValue:'',footer:'',
    actionRow:false,buttonLabel:'',buttonUrl:'',imageId:''
  });
  const newSection = () => ({ messages:[],groups:[],images:[] });
  const empty = () => ({ join:newSection(),leave:newSection(),boost:newSection(),role:newSection() });
  function migrateOld() {
    const result = empty();
    try {
      const old = JSON.parse(localStorage.getItem('next-step-welcome-messages-v1') || 'null');
      if (!old || typeof old !== 'object') return result;
      ['join','leave','boost'].forEach(type => {
        const v = old[type];
        if (v && v.enabled && typeof v.message === 'string') {
          const message = defaultMessage(type);
          message.content = v.message;
          message.target = clean(v.channel) || '#welcome';
          message.kind = v.dm && type === 'join' ? 'dm' : 'server';
          message.embed = !!v.embed;
          message.role = clean(v.role);
          result[type].messages.push(message);
        }
      });
    } catch {}
    return result;
  }
  function normal(raw) {
    const state = empty();
    if (!raw || typeof raw !== 'object') return state;
    Object.keys(state).forEach(type => {
      const part = raw[type];
      if (!part || typeof part !== 'object') return;
      ['messages','groups','images'].forEach(field => {
        if (Array.isArray(part[field])) state[type][field] = clone(part[field]).slice(0, 50);
      });
    });
    return state;
  }
  let saved;
  try { const raw=localStorage.getItem(key); saved=raw ? normal(JSON.parse(raw)) : migrateOld(); }
  catch { saved=empty(); }
  let draft = clone(saved);
  let active = null, section = 'messages', draggedId = null;
  let setup = {groupId:null, roleAction:'get',destination:'server'};
  let editor = null, working = null, editorTab = 'visual', editorMode = 'edit';
  let imageIndex = -1, imageWorking = null, deletion = null;
  const dSetup=$('wm-setup'),dEditor=$('wm-editor'),dImage=$('wm-image-dialog'),dSimulation=$('wm-simulation'),dConfirm=$('wm-confirm');
  function dirty() { return JSON.stringify(draft) !== JSON.stringify(saved); }
  function previewValues() {
    return { usermention:'@Example Member', username:'Example Member',userid:'123456789012345678',
      guildname:'Example Server',guildmembercount:'1,250',boostcount:'12',rolename:'@Community',
      useravatarurl:'https://example.com/avatar.png',nowtimestamp:'Today',channelname:'#welcome',
      servername:'Example Server',membercount:'1,250',role:'@Community',user:'Example Member' };
  }
  const interpolator = new RegExp('\\$\\{([A-Za-z][A-Za-z0-9]*)\\}','g');
  function interpolate(s) { return str(s).replace(interpolator, (whole,name) => previewValues()[name.toLowerCase()] ?? whole); }
  function formatMessage(value) {
    return esc(interpolate(value)).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/(^|\s)\*([^*]+)\*/g,'$1<em>$2</em>');
  }
  function safeBackground(value) {
    try {const url=new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : '';} catch {return '';}
  }
  function findItem(id) {
    if (!active) return null;
    const state=draft[active];
    const direct=state.messages.find(m=>m.id===id);
    if (direct) return {item:direct,group:null};
    for (const group of state.groups) {
      const item=group.messages.find(m=>m.id===id);
      if(item)return {item,group};
    }
    return null;
  }
  function allItems() {
    const s=draft[active];
    return [...s.messages,...s.groups.flatMap(g=>g.messages)];
  }
  function imageOf(id) { return draft[active].images.find(i=>i.id===id); }
  function mark() { $('wm-save-bar').hidden=!dirty(); }
  function backHome() {
    if (active===null) return;
    active=null; section='messages';
    $('wm-home').hidden=false; $('wm-workspace').hidden=true; $('wm-breadcrumb').hidden=true;
    mark();
  }
  function openRoute(type) {
    if (!meta[type]) return;
    active=type; section='messages';
    $('wm-home').hidden=true; $('wm-workspace').hidden=false; $('wm-breadcrumb').hidden=false;
    $('wm-breadcrumb-name').textContent=meta[type].name;
    showSection('messages'); render();
  }
  function showSection(type) {
    if(type==='simulate'){ openSimulation(); return; }
    section=type;
    document.querySelectorAll('[data-wm-section]').forEach(button=>{
      const selected=button.dataset.wmSection===type;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
    });
    $('wm-section-messages').hidden=type!=='messages';
    $('wm-section-images').hidden=type!=='images';
    render();
  }
  function cardPreview(message) {
    const image=imageOf(message.imageId);
    const embed=message.embed?'<div class="wm-discord-embed">'+
      (message.author?'<small>'+esc(interpolate(message.author))+'</small>':'')+
      (message.title?'<strong>'+esc(interpolate(message.title))+'</strong>':'')+
      (message.description?'<p>'+esc(interpolate(message.description))+'</p>':'')+
      (message.fieldName?'<small>'+esc(interpolate(message.fieldName))+': '+esc(interpolate(message.fieldValue))+'</small>':'')+
      (message.footer?'<small>'+esc(interpolate(message.footer))+'</small>':'')+'</div>':'';
    const img=image?'<div class="wm-message-image">'+esc(interpolate(image.text||image.name))+'</div>':'';
    const action=message.actionRow&&message.buttonLabel?'<span class="wm-preview-action">'+esc(interpolate(message.buttonLabel))+'</span>':'';
    return '<div class="wm-discord"><span class="wm-avatar">NS</span><div class="wm-discord-content"><strong>Next Step <small>BOT</small></strong><p>'+formatMessage(message.content||'(Empty message)')+'</p>'+embed+img+action+'</div></div>';
  }
  function messageCard(m,index,inGroup) {
    const roleLabel=active==='role'&&m.role?' · '+(m.roleAction==='lose'?'Lose ':'Get ')+m.role:'';
    const listChoices=['<option value="">Outside groups</option>'].concat(draft[active].groups.map(g =>
      '<option value="'+esc(g.id)+'"'+(inGroup===g.id?' selected':'')+'>'+esc(g.name)+'</option>')).join('');
    return '<article class="wm-item" draggable="true" data-wm-message-id="'+esc(m.id)+'">'+
      '<div class="wm-item-top"><span class="wm-drag" aria-label="Drag to rearrange" title="Drag to a randomized group">⠿</span>'+
      '<div class="wm-item-copy"><strong>Message '+(index+1)+'</strong><small>'+(m.kind==='dm'?'Direct message':esc(m.target||'unknown-channel'))+esc(roleLabel)+'</small></div>'+
      '<div class="wm-item-actions"><button class="wm-mini" data-wm-preview="'+esc(m.id)+'" title="Preview">Preview</button>'+
      '<button class="wm-mini" data-wm-target="'+esc(m.id)+'" title="Change channel or role">Channel</button>'+
      '<button class="wm-mini" data-wm-edit="'+esc(m.id)+'" title="Edit message">Style</button>'+
      '<button class="wm-mini wm-mini-danger" data-wm-remove-message="'+esc(m.id)+'" aria-label="Delete message">×</button></div></div>'+
      '<div class="wm-item-preview" id="wm-preview-'+esc(m.id)+'">'+cardPreview(m)+'</div>'+
      '<div class="wm-group-footer" style="padding:0 14px 12px"><label style="font-size:11px;color:#afc4b5" for="wm-move-'+esc(m.id)+'">Move to group</label><select id="wm-move-'+esc(m.id)+'" data-wm-move="'+esc(m.id)+'" aria-label="Move message to group">'+listChoices+'</select></div>'+
      '</article>';
  }
  function groupCard(g,i) {
    const cards=g.messages.map((m,index)=>messageCard(m,index,g.id)).join('');
    return '<section class="wm-group" data-wm-group-id="'+esc(g.id)+'">'+
      '<div class="wm-group-heading"><strong>'+esc(g.name)+'</strong><div class="wm-item-actions">'+
      '<button class="wm-mini" data-wm-rename-group="'+esc(g.id)+'">Rename</button>'+
      '<button class="wm-mini" data-wm-add-group="'+esc(g.id)+'">+ Message</button>'+
      '<button class="wm-mini wm-mini-danger" data-wm-remove-group="'+esc(g.id)+'" aria-label="Delete group">×</button></div></div>'+
      '<div class="wm-group-body" data-wm-drop-group="'+esc(g.id)+'">'+(cards||'<p class="wm-group-empty">Drop messages here or add a new one</p>')+'</div>'+
      '<div class="wm-group-footer"><small style="color:#a6bda9">One random message in this group is picked when the event happens.</small></div></section>';
  }
  function imageCard(img) {
    const attachOptions=['<option value="">Not attached</option>'].concat(allItems().map(m=>
      '<option value="'+esc(m.id)+'"'+(m.imageId===img.id?' selected':'')+'>'+esc(m.target||'Message')+' · '+esc(clean(m.content).slice(0,40))+'</option>'));
    return '<article class="wm-image-tile"><div class="wm-image-thumbnail" style="background-color:'+esc(img.color)+';color:'+esc(img.accent)+'">'+esc(interpolate(img.text||img.name))+'</div>'+
      '<div class="wm-image-info"><strong>'+esc(img.name)+'</strong><small>Customizable member image · '+(img.size==='square'?'Square':'Wide')+'</small>'+
      '<label class="wm-field" style="margin:0"><span>Attach to message</span><select data-wm-attach="'+esc(img.id)+'">'+attachOptions.join('')+'</select></label></div>'+
      '<div class="wm-item-actions"><button class="wm-mini" data-wm-edit-image="'+esc(img.id)+'">Edit</button><button class="wm-mini wm-mini-danger" data-wm-remove-image="'+esc(img.id)+'">×</button></div></article>';
  }
  function render() {
    if (!active) { mark(); return; }
    const s=draft[active];
    $('wm-event-description').textContent=meta[active].copy;
    $('wm-message-count').textContent=s.messages.length;
    $('wm-image-count').textContent=s.images.length;
    $('wm-message-list').innerHTML=s.messages.map((m,i)=>messageCard(m,i,'')).join('');
    $('wm-group-list').innerHTML=s.groups.map(groupCard).join('');
    $('wm-image-list').innerHTML=s.images.map(imageCard).join('');
    const cap=s.messages.length>=3;
    document.querySelectorAll('[data-wm-add="message"]').forEach(b=>{b.disabled=cap;b.title=cap?'Maximum of three messages':'Add message';});
    document.querySelectorAll('[data-wm-add="image"]').forEach(b=>{b.disabled=s.images.length>=3;});
    document.querySelectorAll('[data-wm-add="group"]').forEach(b=>{b.disabled=s.groups.length>=3;});
    mark();
  }
  const closeDialog = dialog => { if(dialog.open)dialog.close(); };
  function openSetup(groupId='',editId='') {
    const previous=editId?findItem(editId)?.item:null;
    setup={groupId,editId,roleAction:previous?.roleAction||'get',destination:previous?.kind||'server'};
    $('wm-setup-role').value=previous?.role||'';
    $('wm-setup-channel').value=previous?.kind==='server'?previous.target:'';
    document.querySelectorAll('[data-wm-role-action]').forEach(b=>b.classList.toggle('selected',b.dataset.wmRoleAction===setup.roleAction));
    document.querySelectorAll('[data-wm-destination]').forEach(b=>b.classList.toggle('selected',b.dataset.wmDestination===setup.destination));
    $('wm-role-stage').hidden=active!=='role';
    $('wm-channel-stage').hidden=active==='role';
    $('wm-channel-back').hidden=active!=='role';
    $('wm-setup-title').textContent=active==='role'?'Set a role':'Set a channel';
    displaySuggestions();
    dSetup.showModal();
  }
  function displaySuggestions() {
    const field=$('wm-channel-field'),list=$('wm-channel-suggestions');
    field.hidden=setup.destination==='dm';
    list.hidden=setup.destination==='dm';
    const suggestions=['general','welcome','announcements','goodbye','boosts'];
    list.innerHTML=suggestions.filter(x=>x.includes(clean($('wm-setup-channel').value).replace(/^#/, '').toLowerCase())).map(x=>'<button type="button" data-wm-suggestion="'+x+'"># '+x+'</button>').join('');
  }
  function finishSetup() {
    let target=setup.destination==='dm'?'Direct message':clean($('wm-setup-channel').value);
    if(setup.destination==='server'&&!target){notify('Select or enter a channel first.');$('wm-setup-channel').focus();return;}
    if(setup.destination==='server'&&!target.startsWith('#')&&!/^[0-9]{15,22}$/.test(target))target='#'+target;
    if(setup.editId){
      const existing=findItem(setup.editId)?.item;
      if(!existing)return;
      existing.kind=setup.destination;existing.target=target;
      if(active==='role'){existing.role=clean($('wm-setup-role').value);existing.roleAction=setup.roleAction;}
      closeDialog(dSetup);render();return;
    }
    const item=defaultMessage(active);
    item.kind=setup.destination;item.target=target;
    if(active==='role'){item.role=clean($('wm-setup-role').value);item.roleAction=setup.roleAction;}
    if(setup.groupId){
      const group=draft[active].groups.find(g=>g.id===setup.groupId);
      if(!group)return;
      if(group.messages.length>=3){notify('A randomized group can contain up to three messages.');return;}
      group.messages.push(item);
    } else {
      if(draft[active].messages.length>=3){notify('You can have up to three standalone messages.');return;}
      draft[active].messages.push(item);
    }
    closeDialog(dSetup);
    render();
    openEditor(item.id);
  }
  function addGroup() {
    if(draft[active].groups.length>=3){notify('You can have up to three randomized groups.');return;}
    draft[active].groups.push({id:uid(),name:'Group '+(draft[active].groups.length+1),messages:[]});
    render();
  }
  function moveMessage(id, groupId) {
    const found=findItem(id);
    if(!found)return;
    const target=groupId?draft[active].groups.find(g=>g.id===groupId):null;
    if(groupId&&!target)return;
    if(found.group?.id===groupId||(!found.group&&!groupId))return;
    const destination=target?target.messages:draft[active].messages;
    if(destination.length>=3){notify('This destination is at the three-message limit.');render();return;}
    const source=found.group?found.group.messages:draft[active].messages;
    const index=source.findIndex(m=>m.id===id);
    if(index<0)return;
    const item=source.splice(index,1)[0];
    destination.push(item);
    render();
  }
  function reorderMessage(sourceId,targetId) {
    if(sourceId===targetId)return;
    const source=findItem(sourceId), target=findItem(targetId);
    if(!source||!target)return;
    const from=source.group?source.group.messages:draft[active].messages;
    const to=target.group?target.group.messages:draft[active].messages;
    if(from!==to&&to.length>=3){notify('This destination is at the three-message limit.');return;}
    const index=from.findIndex(m=>m.id===sourceId);
    if(index<0)return;
    const item=from.splice(index,1)[0];
    const next=to.findIndex(m=>m.id===targetId);
    to.splice(next,0,item);
    render();
  }
  function setEditorFields(message) {
    const keys=['content','author','title','description','fieldName','fieldValue','footer','buttonLabel','buttonUrl'];
    keys.forEach(key=>$('wm-msg-'+key).value=str(message[key]));
    $('wm-embed-fields').hidden=!message.embed;
    $('wm-action-fields').hidden=!message.actionRow;
  }
  function readVisual() {
    if(!working)return;
    ['content','author','title','description','fieldName','fieldValue','footer','buttonLabel','buttonUrl'].forEach(k=>working[k]=$('wm-msg-'+k).value);
  }
  function readRaw() {
    try {
      const v=JSON.parse($('wm-msg-raw').value);
      if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Expected a JSON object.');
      const defaults=defaultMessage(active);
      for (const [name,value] of Object.entries(v)) {
        if (!(name in defaults) || typeof value !== typeof defaults[name]) throw new Error('Invalid field: '+name);
      }
      working={...working,...v,id:working.id,target:working.target,kind:working.kind,role:working.role,roleAction:working.roleAction};
      return true;
    } catch(error) { notify('Invalid raw message JSON: '+error.message);$('wm-msg-raw').focus();return false; }
  }
  function selectEditorTab(tab) {
    if(editorTab==='raw'&&tab!=='raw'&&!readRaw())return;
    if(editorTab==='visual')readVisual();
    editorTab=tab;
    document.querySelectorAll('[data-wm-editor-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.wmEditorTab===tab);b.setAttribute('aria-selected',String(b.dataset.wmEditorTab===tab));});
    $('wm-visual').hidden=tab!=='visual';$('wm-raw').hidden=tab!=='raw';$('wm-variables').hidden=tab!=='variables';
    if(tab==='visual')setEditorFields(working);
    if(tab==='raw')$('wm-msg-raw').value=JSON.stringify(working,null,2);
  }
  function previewEditor() {
    $('wm-preview-content').innerHTML=cardPreview(working);
  }
  function selectEditorMode(mode) {
    if(mode==='preview'){
      if(editorTab==='raw'&&!readRaw())return;
      if(editorTab==='visual')readVisual();
      previewEditor();
    }
    editorMode=mode;
    document.querySelectorAll('[data-wm-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.wmMode===mode));
    $('wm-editor-edit').hidden=mode!=='edit';$('wm-preview-screen').hidden=mode!=='preview';
    if(mode==='edit'&&editorTab==='visual')setEditorFields(working);
  }
  function openEditor(id) {
    const found=findItem(id);
    if(!found)return;
    editor={id};working=clone(found.item);
    editorTab='variables';selectEditorTab('visual');
    selectEditorMode('edit');
    dEditor.showModal();
  }
  function commitEditor() {
    if(!editor)return;
    if(editorTab==='raw'&&!readRaw())return;
    if(editorTab==='visual'&&editorMode==='edit')readVisual();
    const found=findItem(editor.id);
    if(found)Object.assign(found.item,clone(working));
    editor=null;working=null;closeDialog(dEditor);render();
  }
  const variableNames=['usermention','username','userid','guildname','guildmembercount','boostcount','rolename','useravatarurl','channelname','nowtimestamp'];
  $('wm-variable-list').innerHTML=variableNames.map(name=>'<button type="button" data-wm-variable="'+esc(name)+'">'+esc(token(name))+'</button>').join('');
  function defaultImage() {return {id:uid(),name:'Dynamic image',size:'wide',url:'',color:'#17291d',accent:'#45d18e',text:'Welcome, '+token('username')+'!',avatar:true};}
  function showImageEditor(imgId) {
    imageIndex=draft[active].images.findIndex(i=>i.id===imgId);
    imageWorking=clone(imageIndex>=0?draft[active].images[imageIndex]:defaultImage());
    $('wm-image-name').value=imageWorking.name;
    $('wm-image-size').value=imageWorking.size;
    $('wm-image-url').value=imageWorking.url;
    $('wm-image-color').value=imageWorking.color;
    $('wm-image-accent').value=imageWorking.accent;
    $('wm-image-text').value=imageWorking.text;
    $('wm-image-avatar').checked=imageWorking.avatar;
    refreshImagePreview();
    dImage.showModal();
  }
  function refreshImagePreview() {
    if(!imageWorking)return;
    const values={name:clean($('wm-image-name').value),size:$('wm-image-size').value,
      url:clean($('wm-image-url').value),color:$('wm-image-color').value,accent:$('wm-image-accent').value,
      text:$('wm-image-text').value,avatar:$('wm-image-avatar').checked};
    Object.assign(imageWorking,values);
    const canvas=$('wm-image-canvas');
    canvas.classList.toggle('square',values.size==='square');
    canvas.style.backgroundColor=values.color;
    const url=safeBackground(values.url);
    canvas.style.backgroundImage=url?'linear-gradient(#0006,#0006),url("'+url.replace(/["\\]/g,'')+'")':'none';
    canvas.style.color=values.accent;
    $('wm-image-canvas-text').textContent=interpolate(values.text);
    $('wm-image-avatar-preview').hidden=!values.avatar;
  }
  function applyImage() {
    refreshImagePreview();
    if(!clean(imageWorking.name)){notify('Enter an image name.');$('wm-image-name').focus();return;}
    if(imageIndex>=0)draft[active].images[imageIndex]=clone(imageWorking);
    else if(draft[active].images.length<3)draft[active].images.push(clone(imageWorking));
    closeDialog(dImage);render();
  }
  function openSimulation() {
    if(!active)return;
    $('wm-simulation-title').textContent='Simulate '+(active==='role'?'role assignment':active);
    const buttons=allItems().map((item,index)=>'<button data-wm-simulate="'+esc(item.id)+'">Message '+(index+1)+' · '+esc(item.target)+'</button>').join('');
    $('wm-simulation-options').innerHTML='<strong style="font-size:12px">Messages</strong>'+buttons+
      (allItems().length?'<button data-wm-simulate="all">Simulate all</button>':'<p>No messages are configured. Add one in the Messages tab first.</p>');
    $('wm-simulation-results').hidden=true;
    dSimulation.showModal();
  }
  function runSimulation(id) {
    const messages=id==='all' ? [...draft[active].messages,...draft[active].groups.flatMap(g=>g.messages.length?[g.messages[Math.floor(Math.random()*g.messages.length)]]:[])] :
      allItems().filter(m=>m.id===id);
    $('wm-simulation-results').hidden=false;
    $('wm-simulation-results').innerHTML=
      messages.map(m=>'<div style="margin-bottom:10px">'+cardPreview(m)+'</div>').join('');
  }
  function askRemove(kind,id) {
    deletion={kind,id};
    $('wm-confirm-heading').textContent=kind==='group'?'Remove randomized group?':'Remove '+(kind==='image'?'dynamic image':'message')+'?';
    $('wm-confirm-text').textContent=kind==='group'?'The group and all its messages will be removed. This can be reset until you save.':'This item will be removed from the draft. Reset to undo before saving.';
    dConfirm.showModal();
  }
  function removeConfirmed() {
    if(!deletion)return;
    const {kind,id}=deletion;
    const s=draft[active];
    if(kind==='group')s.groups=s.groups.filter(g=>g.id!==id);
    if(kind==='message'){
      const found=findItem(id);if(found){const list=found.group?found.group.messages:s.messages;list.splice(list.findIndex(m=>m.id===id),1);}
    }
    if(kind==='image'){s.images=s.images.filter(i=>i.id!==id);allItems().forEach(m=>{if(m.imageId===id)m.imageId='';});}
    deletion=null;closeDialog(dConfirm);render();
  }
  document.querySelectorAll('[data-wm-route]').forEach(b=>b.addEventListener('click',()=>openRoute(b.dataset.wmRoute)));
  $('wm-back').addEventListener('click',backHome);
  document.querySelectorAll('[data-wm-section]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.wmSection)));
  root.addEventListener('click',event=>{
    const btn=event.target.closest('button');
    if(!btn||!active)return;
    if(btn.dataset.wmAdd==='message'){openSetup();return;}
    if(btn.dataset.wmAdd==='group'){addGroup();return;}
    if(btn.dataset.wmAdd==='image'){if(draft[active].images.length>=3)return;showImageEditor('');return;}
    if(btn.dataset.wmAddGroup){openSetup(btn.dataset.wmAddGroup);return;}
    if(btn.dataset.wmEdit){openEditor(btn.dataset.wmEdit);return;}
    if(btn.dataset.wmTarget){openSetup('',btn.dataset.wmTarget);return;}
    if(btn.dataset.wmPreview){
      const row=$('wm-preview-'+btn.dataset.wmPreview);
      if(row)row.classList.toggle('open');
      return;
    }
    if(btn.dataset.wmRemoveMessage){askRemove('message',btn.dataset.wmRemoveMessage);return;}
    if(btn.dataset.wmRemoveGroup){askRemove('group',btn.dataset.wmRemoveGroup);return;}
    if(btn.dataset.wmRenameGroup){
      const group=draft[active].groups.find(g=>g.id===btn.dataset.wmRenameGroup);
      if(!group)return;
      const name=window.prompt('Group name',group.name);
      if(name!==null&&clean(name)){group.name=clean(name).slice(0,80);render();}
      return;
    }
    if(btn.dataset.wmEditImage){showImageEditor(btn.dataset.wmEditImage);return;}
    if(btn.dataset.wmRemoveImage){askRemove('image',btn.dataset.wmRemoveImage);return;}
  });
  root.addEventListener('change',event=>{
    const move=event.target.closest('[data-wm-move]');
    if(move){moveMessage(move.dataset.wmMove,move.value);return;}
    const attach=event.target.closest('[data-wm-attach]');
    if(attach){
      allItems().forEach(m=>{if(m.imageId===attach.dataset.wmAttach)m.imageId='';});
      const target=findItem(attach.value);
      if(target)target.item.imageId=attach.dataset.wmAttach;
      render();
    }
  });
  root.addEventListener('dragstart',event=>{
    const card=event.target.closest('[data-wm-message-id]');
    if(card){draggedId=card.dataset.wmMessageId;if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedId);}}
  });
  root.addEventListener('dragover',event=>{
    const zone=event.target.closest('[data-wm-message-id],[data-wm-drop-group],#wm-message-list');
    if(zone){event.preventDefault();zone.classList.add('over');}
  });
  root.addEventListener('dragleave',event=>{
    const zone=event.target.closest('[data-wm-message-id],[data-wm-drop-group],#wm-message-list');
    if(zone&&!zone.contains(event.relatedTarget))zone.classList.remove('over');
  });
  root.addEventListener('drop',event=>{
    const target=event.target.closest('[data-wm-message-id]');
    if(target&&draggedId){
      event.preventDefault();reorderMessage(draggedId,target.dataset.wmMessageId);draggedId=null;
      document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));
      return;
    }
    const zone=event.target.closest('[data-wm-drop-group],#wm-message-list');
    if(zone&&draggedId){event.preventDefault();moveMessage(draggedId,zone.dataset.wmDropGroup||'');draggedId=null;}
    document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));
  });
  $('wm-save').addEventListener('click',()=>{
    try{localStorage.setItem(key,JSON.stringify(draft));saved=clone(draft);mark();notify('Welcome message settings saved.');}
    catch{notify('Unable to save settings.');}
  });
  $('wm-reset').addEventListener('click',()=>{draft=clone(saved);render();notify('Changes reset.');});
  document.querySelectorAll('[data-wm-close]').forEach(b=>b.addEventListener('click',()=>{
    const name=b.dataset.wmClose, dialog={setup:dSetup,image:dImage,simulation:dSimulation,confirm:dConfirm}[name];
    if(dialog)closeDialog(dialog);
  }));
  document.querySelectorAll('[data-wm-role-action]').forEach(b=>b.addEventListener('click',()=>{
    setup.roleAction=b.dataset.wmRoleAction;
    document.querySelectorAll('[data-wm-role-action]').forEach(el=>el.classList.toggle('selected',el===b));
  }));
  $('wm-role-continue').addEventListener('click',()=>{
    if(!clean($('wm-setup-role').value)){notify('Select or enter a role.');$('wm-setup-role').focus();return;}
    $('wm-role-stage').hidden=true;$('wm-channel-stage').hidden=false;$('wm-setup-title').textContent='Set a channel';
  });
  document.querySelectorAll('[data-wm-destination]').forEach(b=>b.addEventListener('click',()=>{
    setup.destination=b.dataset.wmDestination;
    document.querySelectorAll('[data-wm-destination]').forEach(el=>el.classList.toggle('selected',el===b));
    displaySuggestions();
  }));
  $('wm-setup-channel').addEventListener('input',displaySuggestions);
  $('wm-channel-suggestions').addEventListener('click',event=>{
    const el=event.target.closest('[data-wm-suggestion]');
    if(el){$('wm-setup-channel').value='#'+el.dataset.wmSuggestion;displaySuggestions();}
  });
  $('wm-channel-back').addEventListener('click',()=>{
    $('wm-channel-stage').hidden=true;$('wm-role-stage').hidden=false;$('wm-setup-title').textContent='Set a role';
  });
  $('wm-channel-continue').addEventListener('click',finishSetup);
  document.querySelectorAll('[data-wm-editor-tab]').forEach(b=>b.addEventListener('click',()=>selectEditorTab(b.dataset.wmEditorTab)));
  document.querySelectorAll('[data-wm-mode]').forEach(b=>b.addEventListener('click',()=>selectEditorMode(b.dataset.wmMode)));
  ['content','author','title','description','fieldName','fieldValue','footer','buttonLabel','buttonUrl'].forEach(k=>
    $('wm-msg-'+k).addEventListener('input',()=>{if(working)working[k]=$('wm-msg-'+k).value;}));
  $('wm-msg-raw').addEventListener('input',()=>{});
  $('wm-add-embed').addEventListener('click',()=>{if(!working)return;if(editorTab==='visual')readVisual();working.embed=true;if(editorTab==='visual')setEditorFields(working);});
  $('wm-remove-embed').addEventListener('click',()=>{if(!working)return;readVisual();working.embed=false;setEditorFields(working);});
  $('wm-add-action').addEventListener('click',()=>{if(!working)return;if(editorTab==='visual')readVisual();working.actionRow=true;if(editorTab==='visual')setEditorFields(working);});
  $('wm-remove-action').addEventListener('click',()=>{if(!working)return;readVisual();working.actionRow=false;setEditorFields(working);});
  $('wm-clear').addEventListener('click',()=>{
    if(!working)return;
    const fresh=defaultMessage(active);
    working={...fresh,id:working.id,target:working.target,kind:working.kind,role:working.role,roleAction:working.roleAction};
    if(editorTab==='raw')$('wm-msg-raw').value=JSON.stringify(working,null,2);
    setEditorFields(working);if(editorMode==='preview')previewEditor();
  });
  $('wm-variable-list').addEventListener('click',event=>{
    const b=event.target.closest('[data-wm-variable]');if(!b)return;
    const value=token(b.dataset.wmVariable);
    if(editorTab==='visual'){const field=$('wm-msg-content');field.setRangeText(value,field.selectionStart,field.selectionEnd,'end');working.content=field.value;field.focus();}
    else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>notify('Copied '+value)).catch(()=>notify(value));
    else notify(value);
  });
  $('wm-load').addEventListener('click',()=>$('wm-file').click());
  $('wm-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(file.size>200000)throw new Error('File is too large.');
      const value=JSON.parse(await file.text());
      if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected an object.');
      const baseline=defaultMessage(active);
      const merged={...working};
      for(const [k,v] of Object.entries(value))if(k in baseline&&typeof v===typeof baseline[k]&&!['id','target','role','roleAction','kind'].includes(k))merged[k]=v;
      working=merged;
      if(editorTab==='raw')$('wm-msg-raw').value=JSON.stringify(working,null,2);
      setEditorFields(working);notify('Message imported.');
    }catch(e){notify('Unable to load message: '+e.message);}
    event.target.value='';
  });
  $('wm-apply').addEventListener('click',commitEditor);
  $('wm-close-editor').addEventListener('click',commitEditor);
  dEditor.addEventListener('cancel',event=>{event.preventDefault();commitEditor();});
  ['name','size','url','color','accent','text','avatar'].forEach(k=>{
    const input=$('wm-image-'+k);
    input.addEventListener('input',refreshImagePreview);input.addEventListener('change',refreshImagePreview);
  });
  $('wm-image-apply').addEventListener('click',applyImage);
  $('wm-simulation-options').addEventListener('click',event=>{const b=event.target.closest('[data-wm-simulate]');if(b)runSimulation(b.dataset.wmSimulate);});
  $('wm-remove-confirmed').addEventListener('click',removeConfirmed);
  render();
})();
