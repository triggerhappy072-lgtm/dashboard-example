(() => {
 'use strict';
 const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=o=>JSON.parse(JSON.stringify(o)),key='next-step-commands-v1';
 const catalog={
  'General':['config','disable','enable','info','list','permissions','ping'],
  'Auto Moderation':['automoderation'],
  'Information':['avatarinfo','bannerinfo','channelinfo','emojiinfo','guildbannerinfo','guildchannelcount','guildiconinfo','guildinfo','guildmembercount','guildsplashinfo','roleinfo','searchdocumentation','stickerinfo','stickerpackinfo','userinfo'],
  'Interactions':['interactions','transfer-slash-commands-to-cb'],
  'Join Roles':['joinroles'],'Logging':['log'],
  'Messages':['sendtemplate','sendmessage'],
  'Moderation':['archive','ban','block-appeal-user','casedelete','caseinfo','caselist','casesplit','caseupdate','caseclose','createrole','editrole','joinguardwhitelist','kick','linkcaseview','lock','lockall','massban','masskick','massmute','masswarn','message-histories','mute','nameban','namekick','namemute','namewarn','prune','purge','predefinedreasons','removerole','report-blacklist','report-ignoreall','report-sendmissing','report','restore-appeal-messages','send-to-appeal','setproof','setslowmode','timeban','timekick','timemute','timewarn','unban','unblock-appeal-user','unlock','unlockall','unmute','unwarn','usernotes','warn','warns','assignrole'],
  'Reaction Roles':['reactionroles','reactionrolesconfig']
 };
 const defaultDescriptions={ban:'Ban a member from the server.',kick:'Remove a member from the server.',mute:'Mute a member.',warn:'Issue a warning.',purge:'Delete a selected number of messages.',help:'Display available commands.',ping:'Show bot latency.',userinfo:'Show information about a member.',guildinfo:'Show server details.',sendmessage:'Send a message.',sendtemplate:'Send a saved message template.',config:'Manage bot configuration.',report:'Report a member to moderators.',joinroles:'Manage join roles.',reactionroles:'Manage reaction roles.',automoderation:'Configure moderation rules.'};
 const responseNames=[['notFound','Command not found','When a command does not exist.'],['wrongUsage','Wrong command usage','When command arguments are incorrect.'],['noPermission','No command permissions','When a member cannot use a command.'],['disabledChannel','Disabled in channel','When this command is blocked in a channel.'],['cooldown','Command on cooldown','When a member tries again before the cooldown ends.']];
 const actionOptions=['Send message','Send template or message list','Add role','Remove role','Set roles','Send direct message','Open moderation case','Delete message','React to message','Give XP','Run workflow'];
 const blankCmd=(name,custom=false)=>({name,custom,enabled:true,prefix:true,slash:false,aliases:[],permissions:'everyone',roles:'',users:'',channels:'',reply:true,deleteInput:false,deleteOutput:false,cooldown:0,cooldownScope:'user',target:'none',action:'Send message',actionValue:'',description:defaultDescriptions[name]||'',arguments:'',options:'',deleteAfter:0});
 const initial=()=>({prefixes:['/','s!'],custom:[],defaults:{},errors:Object.fromEntries(responseNames.map(([id,title])=>[id,{enabled:true,message:title+'.'}]))});
 function load(){const base=initial();try{const value=JSON.parse(localStorage.getItem(key)||'null');if(value&&typeof value==='object'){
   if(Array.isArray(value.prefixes))base.prefixes=value.prefixes.filter(v=>typeof v==='string'&&v.trim()).slice(0,12);
   if(Array.isArray(value.custom))base.custom=value.custom.filter(v=>v&&typeof v.name==='string').map(v=>({...blankCmd(v.name,true),...v})).slice(0,50);
   if(value.defaults&&typeof value.defaults==='object')base.defaults=value.defaults;
   if(value.errors&&typeof value.errors==='object')base.errors={...base.errors,...value.errors};
  }}catch{}return base;}
 let saved=load(),state=clone(saved),view='home',search='',selected=new Set(),toastTimer,editor=null,modalFields=[];
 const dirty=()=>{$('cm-savebar').hidden=JSON.stringify(saved)===JSON.stringify(state);};
 function toast(msg){const el=$('cm-toast');el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2800);}
 function actionsMarkup(key,name,props={}){return '<button type="button" class="'+(props.cls||'cm-secondary')+'" data-action="'+key+'" data-name="'+escape(name||'')+'">'+escape(props.label||key)+'</button>';}
 function home(){
  return '<div class="cm-card"><button class="cm-card-heading cm-card-button" type="button" data-route="custom"><span class="cm-card-icon">⌘</span><div><h2>Custom commands</h2><p>Create and manage commands with triggers, arguments, and actions.</p></div><span class="cm-chevron">›</span></button><div class="cm-setting-body"><button class="cm-primary" type="button" data-action="add-command">+ Create new command</button><span class="cm-pill" style="margin-left:9px">'+state.custom.length+'/50 commands</span></div></div>'+
  '<div class="cm-card"><button class="cm-card-heading cm-card-button" data-route="default" type="button"><span class="cm-card-icon">☷</span><div><h2>Default commands</h2><p>Update permissions, aliases, and command behavior for built-in commands.</p></div><span class="cm-chevron">›</span></button></div>'+
  '<div class="cm-card"><div class="cm-card-heading"><span class="cm-card-icon">/</span><div><h2>Prefixes</h2><p>Choose the characters used before text commands.</p></div></div><div class="cm-setting-body"><div class="cm-inline" id="cm-prefix-list">'+state.prefixes.map((p,i)=>'<span class="cm-prefix">'+escape(p)+' <button type="button" data-action="remove-prefix" data-index="'+i+'" aria-label="Remove '+escape(p)+'">×</button></span>').join('')+'</div><form class="cm-inline" id="cm-prefix-form" style="margin-top:14px"><input class="cm-search" maxlength="12" name="prefix" placeholder="New prefix" aria-label="New prefix" required style="max-width:200px"><button class="cm-primary">+ Add prefix</button></form></div></div>'+
  '<div class="cm-card"><div class="cm-card-heading"><span class="cm-card-icon">!</span><div><h2>Error messages</h2><p>Customize the responses to common command errors.</p></div></div><div class="cm-setting-body"><div class="cm-error-list">'+responseNames.map(([id,title,desc])=>{
    const conf=state.errors[id]||{enabled:true,message:''};
    return '<div class="cm-error-item"><div><strong>'+escape(title)+'</strong><small>'+escape(desc)+'</small></div><div class="cm-actions"><label class="cm-toggle" style="margin:0;padding:8px"><span>Enabled</span><input type="checkbox" data-error-toggle="'+id+'"'+(conf.enabled?' checked':'')+'></label>'+actionsMarkup('edit-error',id,{label:'Edit'})+'</div></div>';
  }).join('')+'</div></div></div>';
 }
 const lookup=name=>{const n=state.custom.find(c=>c.name===name);return n||({...blankCmd(name),...(state.defaults[name]||{})});};
 function list(){
  const isCustom=view==='custom';
  const items=isCustom?state.custom:Object.entries(catalog).flatMap(([group,items])=>items.map(name=>({...lookup(name),group})));
  const results=items.filter(c=>!search||[c.name,c.description,c.group,...(c.aliases||[])].join(' ').toLowerCase().includes(search.toLowerCase()));
  const groups=isCustom?{'Custom commands':results}:Object.fromEntries(Object.keys(catalog).map(group=>[group,results.filter(c=>c.group===group)]));
  return '<button type="button" data-route="home" class="cm-back">‹ Commands</button>'+
    '<div class="cm-card"><div class="cm-card-heading"><span class="cm-card-icon">'+(isCustom?'⌘':'☷')+'</span><div><h2>'+(isCustom?'Custom commands':'Default commands')+'</h2><p>'+(isCustom?'Create custom commands and configure their behavior.':'Edit default command permissions, aliases, cooldowns, and presentation.')+'</p></div></div><div class="cm-setting-body">'+
    '<div class="cm-toolbar"><input class="cm-search" id="cm-search" type="search" value="'+escape(search)+'" placeholder="Search commands" aria-label="Search commands">'+(isCustom?actionsMarkup('add-command','',{label:'+ Create command',cls:'cm-primary'}):'')+
    actionsMarkup('mass-edit','',{label:'Mass edit'})+'</div><div class="cm-inline" style="margin-bottom:13px"><label class="cm-toggle" style="margin:0"><span>Select all shown</span><input type="checkbox" id="cm-select-all"'+(results.length&&results.every(c=>selected.has(c.name))?' checked':'')+'></label><span class="cm-pill">'+selected.size+' selected</span></div>'+
    '<div class="cm-categories">'+Object.entries(groups).map(([group,entries])=>!entries.length?'':'<div><div class="cm-category-heading">'+escape(group)+'</div><div class="cm-list">'+entries.map(c=>
      '<div class="cm-list-row"><input type="checkbox" data-select-command="'+escape(c.name)+'" aria-label="Select '+escape(c.name)+'"'+(selected.has(c.name)?' checked':'')+'><div class="cm-list-copy"><strong>'+(isCustom?'!':'/')+escape(c.name)+'</strong><small>'+
      escape(c.description||'Configure command settings')+(c.slash?' · Slash':'')+(!c.enabled?' · Disabled':'')+'</small></div><div class="cm-actions">'+
      actionsMarkup('help',c.name,{label:'?'})+actionsMarkup('toggle',c.name,{label:c.enabled?'Disable':'Enable'})+actionsMarkup('edit',c.name,{label:'Edit'})+
      (isCustom?actionsMarkup('delete-command',c.name,{label:'Remove',cls:'cm-danger'}):'')+
      '</div></div>').join('')+'</div></div>').join('')+'</div>'+
    (!results.length?'<div class="cm-empty">No commands match the current search.</div>':'')+'</div></div>';
 }
 function render(){const root=$('cm-content');root.innerHTML=view==='home'?home():list();dirty();}
 function modal(title,fields,initial,onSave){
  editor=onSave;modalFields=fields;$('cm-modal-heading').textContent=title;
  $('cm-form').querySelector('[type=submit]').hidden=false;
  $('cm-modal-body').innerHTML=fields.map(f=>{
    const value=initial[f.key]??(f.type==='checkbox'?false:'');
    let control='';
    if(f.type==='checkbox')control='<label class="cm-toggle"><span>'+escape(f.label)+(f.help?'<small>'+escape(f.help)+'</small>':'')+'</span><input name="'+escape(f.key)+'" type="checkbox"'+(value?' checked':'')+'></label>';
    else if(f.type==='textarea')control='<label class="cm-field"><span>'+escape(f.label)+'</span><textarea name="'+escape(f.key)+'" maxlength="4000">'+escape(value)+'</textarea></label>';
    else if(f.type==='select')control='<label class="cm-field"><span>'+escape(f.label)+'</span><select name="'+escape(f.key)+'">'+f.items.map(([v,label])=>'<option value="'+escape(v)+'"'+(String(value)===String(v)?' selected':'')+'>'+escape(label)+'</option>').join('')+'</select></label>';
    else control='<label class="cm-field"><span>'+escape(f.label)+'</span><input name="'+escape(f.key)+'" type="'+(f.type||'text')+'" value="'+escape(Array.isArray(value)?value.join(', '):value)+'" maxlength="2000"'+(f.type==='number'?' min="0" step="1"':'')+(f.required?' required':'')+'></label>';
    return control;
  }).join('');
  $('cm-modal').showModal();
 }
 const fields=[
  {key:'name',label:'Command name',required:true},
  {key:'description',label:'Command description'},
  {key:'enabled',label:'Enable command',type:'checkbox'},
  {key:'prefix',label:'Enable prefix command',type:'checkbox'},
  {key:'slash',label:'Register as slash command',type:'checkbox'},
  {key:'target',label:'Command target',type:'select',items:[['none','No target'],['user','User'],['role','Role'],['channel','Channel'],['message','Message'],['text','Text']]},
  {key:'arguments',label:'Command arguments (comma separated)',help:'For example: user, reason'},
  {key:'action',label:'Action',type:'select',items:actionOptions.map(x=>[x,x])},
  {key:'actionValue',label:'Action details / template / roles',type:'textarea'},
  {key:'aliases',label:'Aliases (comma separated)'},
  {key:'permissions',label:'Allowed users',type:'select',items:[['everyone','Everyone'],['moderators','Moderators'],['administrators','Administrators'],['custom','Selected members or roles']]},
  {key:'roles',label:'Allowed roles / excluded roles'},
  {key:'users',label:'Allowed members / excluded members'},
  {key:'channels',label:'Allowed channels / excluded channels'},
  {key:'reply',label:'Reply to invoking message',type:'checkbox'},
  {key:'deleteInput',label:'Delete input message',type:'checkbox'},
  {key:'deleteOutput',label:'Delete output message',type:'checkbox'},
  {key:'deleteAfter',label:'Delete output after (seconds)',type:'number'},
  {key:'cooldown',label:'Cooldown (seconds)',type:'number'},
  {key:'cooldownScope',label:'Cooldown scope',type:'select',items:[['user','Per member'],['channel','Per channel'],['server','Entire server']]}
 ];
 const editableFields=fields.filter(f=>true);
 function commandEditor(name,isNew=false){
  const old=isNew?blankCmd('',true):lookup(name);
  modal(isNew?'Create custom command':'Edit /'+name,editableFields,old,data=>{
    const nextName=String(data.name).toLowerCase().trim().replace(/^[!/]+/,'');
    if(!/^[a-z0-9_-]{1,32}$/.test(nextName)){toast('Use 1–32 letters, numbers, underscores, or hyphens.');return false;}
    if((isNew||nextName!==name) &&(state.custom.some(c=>c.name===nextName)||Object.values(catalog).some(xs=>xs.includes(nextName)))){toast('That command name already exists.');return false;}
    const next={...old,...data,name:nextName,aliases:String(data.aliases).split(',').map(s=>s.trim()).filter(Boolean)};
    if(isNew){if(state.custom.length>=50){toast('Maximum of 50 custom commands.');return false;}state.custom.push(next);}
    else if(old.custom){state.custom=state.custom.map(c=>c.name===name?next:c);}
    else {if(nextName!==name){toast('Default command names cannot be renamed.');return false;}delete next.name;delete next.custom;state.defaults[name]=next;}
    selected.delete(name);return true;
  });
  const nameEl=$('cm-form').elements.namedItem('name');
  if(!isNew&&!old.custom)nameEl.readOnly=true;
 }
 function errorEditor(name){
  const entry=state.errors[name]||{enabled:true,message:''};
  modal('Edit '+responseNames.find(([id])=>id===name)?.[1],[{key:'enabled',label:'Enable error response',type:'checkbox'},{key:'message',label:'Response message',type:'textarea'}],entry,data=>{state.errors[name]=data;return true;});
 }
 $('cm-modal-close').addEventListener('click',()=>$('cm-modal').close());
 $('cm-cancel').addEventListener('click',()=>$('cm-modal').close());
 $('cm-form').addEventListener('submit',e=>{
  e.preventDefault();if(!editor)return;
  const form=e.currentTarget,data={};
  for(const f of modalFields){
   const el=form.elements.namedItem(f.key);
   data[f.key]=f.type==='checkbox'?el.checked:f.type==='number'?Number(el.value):el.value.trim();
  }
  if(editor(data)!==false){$('cm-modal').close();editor=null;render();toast('Changes applied.');}
 });
 $('cm-content').addEventListener('submit',e=>{
  if(e.target.id!=='cm-prefix-form')return;e.preventDefault();
  const value=e.target.elements.namedItem('prefix').value.trim();
  if(!value)return;
  if(state.prefixes.includes(value)){toast('That prefix is already added.');return;}
  if(state.prefixes.length>=12){toast('Maximum of 12 prefixes.');return;}
  state.prefixes.push(value);render();
 });
 $('cm-content').addEventListener('input',e=>{
  if(e.target.id==='cm-search'){search=e.target.value;const pos=e.target.selectionStart;render();const input=$('cm-search');input.focus();input.setSelectionRange(pos,pos);}
 });
 $('cm-content').addEventListener('change',e=>{
  if(e.target.dataset.errorToggle){state.errors[e.target.dataset.errorToggle].enabled=e.target.checked;dirty();}
  if(e.target.dataset.selectCommand){if(e.target.checked)selected.add(e.target.dataset.selectCommand);else selected.delete(e.target.dataset.selectCommand);render();}
  if(e.target.id==='cm-select-all'){const list=view==='custom'?state.custom:Object.values(catalog).flatMap(names=>names.map(name=>lookup(name)));list.filter(c=>!search||c.name.includes(search.toLowerCase())).forEach(c=>e.target.checked?selected.add(c.name):selected.delete(c.name));render();}
 });
 $('cm-content').addEventListener('click',e=>{
  const route=e.target.closest('[data-route]');
  if(route){view=route.dataset.route;search='';selected.clear();render();return;}
  const button=e.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action,name=button.dataset.name;
  if(action==='add-command'){commandEditor('',true);return;}
  if(action==='edit'){commandEditor(name);return;}
  if(action==='edit-error'){errorEditor(name);return;}
  if(action==='help'){
   const c=lookup(name);
   modal('About /'+name,[{key:'description',label:'Description',type:'textarea'},{key:'arguments',label:'Usage arguments'}],c,()=>true);
   $('cm-form').querySelectorAll('textarea,input').forEach(field=>{field.readOnly=true;});
   $('cm-form').querySelector('[type=submit]').hidden=true;
   return;
  }
  if(action==='remove-prefix'){if(state.prefixes.length<=1){toast('Keep at least one prefix.');return;}state.prefixes.splice(Number(button.dataset.index),1);render();return;}
  if(action==='delete-command'){if(!confirm('Remove /'+name+'?'))return;state.custom=state.custom.filter(c=>c.name!==name);selected.delete(name);render();return;}
  if(action==='toggle'){
   const custom=state.custom.find(c=>c.name===name);
   if(custom)custom.enabled=!custom.enabled;
   else state.defaults[name]={...state.defaults[name],enabled:!lookup(name).enabled};
   render();return;
  }
  if(action==='mass-edit'){
   if(!selected.size){toast('Select at least one command.');return;}
   modal('Mass edit '+selected.size+' commands',[
    {key:'enabled',label:'Enable selected commands',type:'checkbox'},
    {key:'prefix',label:'Enable prefix commands',type:'checkbox'},
    {key:'slash',label:'Register as slash commands',type:'checkbox'},
    {key:'permissions',label:'Permissions',type:'select',items:[['everyone','Everyone'],['moderators','Moderators'],['administrators','Administrators'],['custom','Selected roles and members']]},
    {key:'reply',label:'Reply to messages',type:'checkbox'},
    {key:'deleteInput',label:'Delete input messages',type:'checkbox'},
    {key:'deleteOutput',label:'Delete output messages',type:'checkbox'},
    {key:'cooldown',label:'Cooldown in seconds',type:'number'}
   ],{enabled:true,prefix:true,slash:false,permissions:'everyone',reply:true,deleteInput:false,deleteOutput:false,cooldown:0},data=>{
    for(const name of selected){
     const custom=state.custom.find(c=>c.name===name);
     if(custom)Object.assign(custom,data);
     else state.defaults[name]={...state.defaults[name],...data};
    }selected.clear();return true;
   });return;
  }
 });
 $('cm-save').addEventListener('click',()=>{try{localStorage.setItem(key,JSON.stringify(state));saved=clone(state);dirty();toast('Commands saved.');}catch{toast('Could not save commands.');}});
 $('cm-reset').addEventListener('click',()=>{state=clone(saved);render();toast('Changes reset.');});
 render();
})();
