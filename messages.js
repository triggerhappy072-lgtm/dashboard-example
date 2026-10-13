(() => {
 'use strict';
 const $=id=>document.getElementById(id),clone=value=>JSON.parse(JSON.stringify(value)),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key='next-step-messages-v1',id=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);
 const tabs=[['templates','Templates'],['lists','Message lists'],['components','Components'],['scheduled','Scheduled messages'],['defaults','Default messages']];
 const defaultMessageNames=['Command not found','Wrong command usage','Missing permissions','Command on cooldown','Level-up message','Report received','Confession approved','Confession denied','Welcome message','Goodbye message','Punishment notice','Translation message'];
 const vars=['{user}','{username}','{server}','{channel}','{message}','{level}','{xp}','{reason}','{date}','{time}','{count}'];
 const actionChoices=['Send template','Send message list','Add role','Remove role','Set role','Open moderation case','DM user','Delete message','Run command'];
 const defaults=()=>({folders:[],templates:[],lists:[],components:[],schedules:[],builtin:Object.fromEntries(defaultMessageNames.map(name=>[name,{content:'',embed:false,embedTitle:'',embedDescription:''}])),sendCommand:false});
 const blankTemplate=()=>({id:id(),name:'',folder:'',content:'',embed:false,embedTitle:'',embedDescription:'',embedFooter:'',embedColor:'#39b878',buttons:[],menus:[],raw:'',renderType:'normal',removeTitleEmoji:false,removeEmptyLines:false,
  automation:{enabled:false,channels:'',words:'',ignoreCase:true,requireSpaces:false,reply:false,dmOnly:false,cooldown:0,deleteDelay:0,dmCountdown:false,excludeMode:'exclude',roles:''},
  sticky:{enabled:false,channel:'',includeBots:false,behavior:'instant',delay:0,conversationDuration:0,deleteBehavior:'after-end',sendOrder:'oldest'},
  delivery:{mode:'send',channel:'',messageId:'',webhook:''}});
 function load(){const base=defaults();try{const value=JSON.parse(localStorage.getItem(key)||'null');if(!value||typeof value!=='object')return base;
  for(const k of ['folders','templates','lists','components','schedules'])if(Array.isArray(value[k]))base[k]=value[k].filter(x=>x&&typeof x==='object').slice(0,500);
  if(value.builtin&&typeof value.builtin==='object')base.builtin={...base.builtin,...value.builtin};
  base.sendCommand=value.sendCommand===true;
 }catch{}return base;}
 let saved=load(),state=clone(saved),tab='templates',folder='',query='',openedList='',openedComponent='',modalHandler=null,modalFields=[],editTemp=null,editBuiltin=null,editorMode='visual',toastTimer;
 const currentTemplates=()=>state.templates.filter(x=>(!folder||x.folder===folder)&&(!query||x.name.toLowerCase().includes(query.toLowerCase())));
 const label=(name,html)=>'<label class="ms-field"><span>'+escape(name)+'</span>'+html+'</label>';
 const input=(key,name,value='',opts={})=>label(name,'<input name="'+escape(key)+'" type="'+(opts.type||'text')+'" value="'+escape(value)+'" maxlength="'+(opts.max||2000)+'" '+(opts.required?'required':'')+' placeholder="'+escape(opts.placeholder||'')+'">');
 const select=(key,name,items,value='')=>label(name,'<select name="'+escape(key)+'">'+items.map(([v,t])=>'<option value="'+escape(v)+'"'+(String(value)===String(v)?' selected':'')+'>'+escape(t)+'</option>').join('')+'</select>');
 const textarea=(key,name,value='',opts={})=>label(name,'<textarea name="'+escape(key)+'" rows="'+(opts.rows||3)+'" maxlength="'+(opts.max||6000)+'" placeholder="'+escape(opts.placeholder||'')+'">'+escape(value)+'</textarea>');
 const tick=(key,name,value,help='')=>'<label class="ms-toggle"><span>'+escape(name)+(help?'<small>'+escape(help)+'</small>':'')+'</span><input type="checkbox" name="'+escape(key)+'"'+(value?' checked':'')+'></label>';
 const btn=(action,title,data={},cls='ms-secondary')=>'<button type="button" class="'+cls+'" data-ms-action="'+action+'"'+Object.entries(data).map(([k,v])=>' data-'+k+'="'+escape(v)+'"').join('')+'>'+escape(title)+'</button>';
 const row=(title,subtitle,buttons)=>'<div class="ms-row"><div class="ms-row-copy"><strong>'+escape(title)+'</strong>'+(subtitle?'<small>'+escape(subtitle)+'</small>':'')+'</div><div class="ms-actions">'+buttons+'</div></div>';
 const panel=(title,subtitle,body,actions='')=>'<section class="ms-panel"><header class="ms-panel-head"><div><h2>'+escape(title)+'</h2>'+(subtitle?'<p>'+escape(subtitle)+'</p>':'')+'</div><div class="ms-actions">'+actions+'</div></header>'+body+'</section>';
 const empty=text=>'<div class="ms-empty">'+escape(text)+'</div>';
 const toast=message=>{const el=$('ms-toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3000);};
 const mark=()=>{$('ms-savebar').hidden=JSON.stringify(state)===JSON.stringify(saved);};
 function renderTabs(){
  $('ms-tabs').innerHTML=tabs.map(([key,label])=>'<button type="button" role="tab" data-ms-tab="'+key+'" aria-selected="'+String(key===tab)+'">'+escape(label)+'</button>').join('');
 }
 function renderTemplates(){
  const categories='<div class="ms-panel"><header class="ms-panel-head"><h2>Folders</h2>'+btn('add-folder','+ New folder')+'</header><div class="ms-folder-list">'+
   '<button type="button" data-ms-folder="" aria-pressed="'+(!folder)+'">All templates ('+state.templates.length+')</button>'+
   state.folders.map(x=>'<button type="button" data-ms-folder="'+escape(x.id)+'" aria-pressed="'+(folder===x.id)+'">'+escape(x.name)+' ('+state.templates.filter(t=>t.folder===x.id).length+')</button>').join('')+'</div>'+
   (folder?'<div class="ms-actions" style="margin-top:15px">'+btn('rename-folder','Rename folder',{id:folder})+btn('delete-folder','Remove folder',{id:folder},'ms-danger')+'</div>':'')+'</div>';
  const listing=panel('Message templates','Organize reusable messages, embeds, automation, and delivery settings.',
   '<div class="ms-toolbar"><input type="search" class="ms-search" id="ms-search" placeholder="Search templates" value="'+escape(query)+'" aria-label="Search templates"></div>'+
   '<div class="ms-list">'+(currentTemplates().length?currentTemplates().map(x=>row(x.name,
      (x.folder?state.folders.find(f=>f.id===x.folder)?.name||'Folder':'No folder')+' · '+(x.automation?.enabled?'Automated':'Manual')+(x.sticky?.enabled?' · Sticky':''),
      btn('edit-template','Edit',{id:x.id})+btn('duplicate-template','Duplicate',{id:x.id})+btn('remove-template','Remove',{id:x.id},'ms-danger'))).join(''):empty('No templates in this view. Create one to get started.'))+'</div>',
   btn('create-template','+ New template',{},'ms-primary'));
  return '<div class="ms-layout"><div>'+categories+'</div><div>'+listing+'</div></div>';
 }
 function renderLists(){
  if(openedList){
   const list=state.lists.find(x=>x.id===openedList);
   if(!list){openedList='';return renderLists();}
   const order=list.templates||[];
   const templateOptions=state.templates.filter(t=>!order.includes(t.id));
   return panel(list.name,'Add templates and choose what happens when the list reaches its end.',
    '<div class="ms-actions" style="margin-bottom:15px">'+btn('back-lists','‹ All lists')+btn('edit-list','Edit name / ending',{id:list.id})+'</div>'+
    '<div class="ms-subpanel"><h3>When the list ends</h3><span class="ms-badge">'+escape(list.end||'Stop')+'</span></div>'+
    '<div class="ms-stack">'+(order.length?order.map((tid,index)=>{
      const template=state.templates.find(t=>t.id===tid);
      return row((index+1)+'. '+(template?.name||'Unavailable template'),'Position '+(index+1),
        btn('move-list-template','↑',{id:tid,dir:'-1'})+btn('move-list-template','↓',{id:tid,dir:'1'})+btn('remove-list-template','Remove',{id:tid},'ms-danger'));
    }).join(''):empty('No templates in this list yet.'))+'</div>'+
    '<form id="ms-add-list-template" class="ms-actions" style="margin-top:15px"><select name="template" class="ms-search" style="max-width:300px" required><option value="">Select a template</option>'+
    templateOptions.map(t=>'<option value="'+escape(t.id)+'">'+escape(t.name)+'</option>').join('')+'</select><button class="ms-primary"'+(!templateOptions.length?' disabled':'')+'>+ Add template</button></form>');
  }
  return panel('Message lists','Send multiple templates in a chosen order, then stop or replay.',
    '<div class="ms-list">'+(state.lists.length?state.lists.map(x=>row(x.name,(x.templates||[]).length+' templates · '+(x.end||'Stop'),
       btn('open-list','Manage',{id:x.id})+btn('edit-list','Edit',{id:x.id})+btn('delete-list','Remove',{id:x.id},'ms-danger'))).join(''):empty('No message lists created yet.'))+'</div>',
    btn('add-list','+ New list',{},'ms-primary'));
 }
 function renderComponents(){
  if(openedComponent){
   const component=state.components.find(c=>c.id===openedComponent);
   if(!component){openedComponent='';return renderComponents();}
   return panel(component.name,component.type==='select'?'Manage options and their actions.':'Button action configuration.',
    '<div class="ms-actions" style="margin-bottom:16px">'+btn('back-components','‹ Components')+btn('edit-component','Edit component',{id:component.id})+'</div>'+
    (component.type==='select'?tick('keep','Keep selection after use',component.keep||false):'')+
    '<div class="ms-list">'+(component.type==='select'?(component.options||[]).map((option,i)=>row(option.label||'Option',
       option.action+' · '+(option.target||'No target'),btn('edit-option','Edit',{id:option.id})+btn('delete-option','Remove',{id:option.id},'ms-danger'))).join(''):'')+
    '</div><div class="ms-actions" style="margin-top:13px">'+(component.type==='select'?btn('add-option','+ Add option',{},'ms-primary'):'')+'</div>');
  }
  return panel('Custom components','Create interactive buttons and select menus for message templates.',
    '<div class="ms-list">'+(state.components.length?state.components.map(c=>row(c.name,
      (c.type==='select'?'Select menu · '+(c.options||[]).length+' options':'Button · '+(c.action||'No action')),
      btn('open-component','Manage',{id:c.id})+btn('edit-component','Edit',{id:c.id})+btn('delete-component','Remove',{id:c.id},'ms-danger'))).join(''):empty('No custom components created yet.'))+'</div>',
    btn('add-component','+ New component',{},'ms-primary'));
 }
 function renderScheduled(){
  const dates=state.schedules.slice().sort((a,b)=>new Date(a.at)-new Date(b.at));
  return panel('Scheduled messages','Choose a template or message list, delivery channel, and time.',
   '<div class="ms-list">'+(dates.length?dates.map(s=>{
    const item=s.kind==='list'?state.lists.find(l=>l.id===s.item):state.templates.find(t=>t.id===s.item);
    const timestamp=new Date(s.at);
    return row(item?.name||'Missing item',(Number.isNaN(timestamp.getTime())?'No date':timestamp.toLocaleString())+' · '+s.channel+' · '+s.repeat,
      btn('edit-schedule','Edit',{id:s.id})+btn('delete-schedule','Remove',{id:s.id},'ms-danger'));
   }).join(''):empty('No scheduled messages yet.'))+'</div>',btn('add-schedule','+ Schedule message',{},'ms-primary'));
 }
 function renderDefaults(){
  return panel('Default messages','Browse and edit Next Step’s built-in message templates.',
   '<div class="ms-list">'+defaultMessageNames.map(name=>{
    const value=state.builtin[name]||{};
    return row(name,(value.content||'No custom message')+(value.embed?' · Embed enabled':''),
      btn('edit-builtin','Edit',{name}));
   }).join('')+'</div>')+
   panel('Send message with command','Control whether saved messages can be sent through bot commands.',
     tick('sendCommand','Enable send message with command',state.sendCommand,'Allow command-based use of saved message templates and lists.'));
 }
 function render(){
  renderTabs();$('ms-content').innerHTML=tab==='templates'?renderTemplates():tab==='lists'?renderLists():tab==='components'?renderComponents():tab==='scheduled'?renderScheduled():renderDefaults();mark();
 }
 function modal(title,fields,values,onSave){
  modalFields=fields;modalHandler=onSave;
  $('ms-dialog-title').textContent=title;
  $('ms-dialog-content').innerHTML=fields.map(f=>{
   const value=values[f.key]??'';
   if(f.type==='checkbox')return tick(f.key,f.label,value);
   if(f.type==='select')return select(f.key,f.label,f.items,value);
   if(f.type==='textarea')return textarea(f.key,f.label,value);
   return input(f.key,f.label,value,{type:f.type,required:f.required,max:f.max});
  }).join('');$('ms-dialog').showModal();
 }
 function folderEditor(folderId){
  const old=state.folders.find(x=>x.id===folderId);
  modal(old?'Rename folder':'Create folder',[{key:'name',label:'Folder name',required:true}],{name:old?.name||''},data=>{
    if(!data.name){toast('Enter a folder name.');return false;}
    if(old)old.name=data.name;else state.folders.push({id:id(),name:data.name});
  });
 }
 function listEditor(listId){
  const old=state.lists.find(x=>x.id===listId);
  modal(old?'Edit message list':'New message list',[
    {key:'name',label:'List name',required:true},{key:'end',label:'When the list ends',type:'select',
    items:[['Stop','Stop'],['Shuffle and Replay','Shuffle and Replay'],['Replay','Replay']]}
  ],{name:old?.name||'',end:old?.end||'Stop'},data=>{
    if(!data.name){toast('Enter a list name.');return false;}
    if(old)Object.assign(old,data);else state.lists.push({...data,id:id(),templates:[]});
  });
 }
 function componentEditor(componentId){
  const old=state.components.find(c=>c.id===componentId);
  modal(old?'Edit component':'New component',[
    {key:'name',label:'Component name',required:true},
    {key:'type',label:'Component type',type:'select',items:[['button','Button'],['select','Select menu']]},
    {key:'label',label:'Visible label'},
    {key:'action',label:'Button action',type:'select',items:actionChoices.map(x=>[x,x])},
    {key:'target',label:'Template, list, role, or action details'},
    {key:'keep',label:'Keep selection after use',type:'checkbox'}
  ],old||{name:'',type:'button',label:'',action:actionChoices[0],target:'',keep:false},data=>{
    if(!data.name){toast('Enter a component name.');return false;}
    if(old)Object.assign(old,data);else state.components.push({...data,id:id(),options:[]});
  });
 }
 function optionEditor(optionId){
  const component=state.components.find(c=>c.id===openedComponent);
  if(!component)return;
  const old=(component.options||[]).find(o=>o.id===optionId);
  modal(old?'Edit menu option':'Add menu option',[
    {key:'label',label:'Option label',required:true},{key:'value',label:'Option value'},
    {key:'action',label:'Action',type:'select',items:actionChoices.map(x=>[x,x])},
    {key:'target',label:'Template, list, role, or action details'}
  ],old||{label:'',value:'',action:actionChoices[0],target:''},data=>{
    if(!data.label){toast('Enter an option label.');return false;}
    if(old)Object.assign(old,data);else (component.options??=[]).push({...data,id:id()});
  });
 }
 function scheduleEditor(scheduleId){
  const old=state.schedules.find(s=>s.id===scheduleId);
  const templates=state.templates.map(t=>['template:'+t.id,'Template: '+t.name]);
  const lists=state.lists.map(l=>['list:'+l.id,'List: '+l.name]);
  if(!templates.length&&!lists.length){toast('Create a message template or list first.');return;}
  const now=new Date(Date.now()+300000);const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  modal(old?'Edit scheduled message':'Schedule message',[
    {key:'item',label:'Template or message list',type:'select',items:[...templates,...lists]},
    {key:'at',label:'Date and time',type:'datetime-local',required:true},
    {key:'channel',label:'Destination channel',required:true},
    {key:'repeat',label:'Repeat',type:'select',items:[['None','Once'],['Hourly','Hourly'],['Daily','Daily'],['Weekly','Weekly']]}
  ],old?{...old,item:old.kind+':'+old.item}:{item:[...templates,...lists][0][0],at:local,channel:'#general',repeat:'None'},data=>{
    if(!data.at||Number.isNaN(new Date(data.at).getTime())){toast('Choose a valid date.');return false;}
    if(!data.channel){toast('Enter a channel.');return false;}
    const [kind,...parts]=data.item.split(':');const item=parts.join(':');
    const savedData={at:data.at,channel:data.channel,repeat:data.repeat,kind,item};
    if(old)Object.assign(old,savedData);else state.schedules.push({...savedData,id:id()});
  });
 }
 function markEditorFields(form){const fields=[...form.querySelectorAll('[name]')];const changes={};
  for(const el of fields)changes[el.name]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
  return changes;
 }
 function switchMode(mode){
  if(editTemp)readTempFields();
  editorMode=mode;
  document.querySelectorAll('[data-ms-mode]').forEach(b=>b.classList.toggle('ms-tab-active',b.dataset.msMode===mode));
  renderEditor();
 }
 function editTemplate(templateId,builtinName){
  editBuiltin=builtinName||null;
  editTemp=editBuiltin?{...blankTemplate(),...clone(state.builtin[editBuiltin]||{}),name:editBuiltin,folder:''}:
   (state.templates.find(t=>t.id===templateId)?clone(state.templates.find(t=>t.id===templateId)):blankTemplate());
  editTemp.automation={...blankTemplate().automation,...editTemp.automation};
  editTemp.sticky={...blankTemplate().sticky,...editTemp.sticky};
  editTemp.delivery={...blankTemplate().delivery,...editTemp.delivery};
  editorMode='visual';
  $('ms-template-title').textContent=editBuiltin?'Default message: '+editBuiltin:(templateId?'Edit template':'Create template');
  const form=$('ms-template-form');form.elements.namedItem('name').value=editTemp.name;
  form.elements.namedItem('name').disabled=!!editBuiltin;
  $('ms-editor-folder').innerHTML='<option value="">No folder</option>'+state.folders.map(f=>'<option value="'+escape(f.id)+'">'+escape(f.name)+'</option>').join('');
  form.elements.namedItem('folder').value=editTemp.folder||'';
  form.elements.namedItem('folder').disabled=!!editBuiltin;
  document.querySelectorAll('[data-ms-mode]').forEach(b=>b.classList.toggle('ms-tab-active',b.dataset.msMode==='visual'));
  renderEditor();
  $('ms-template-dialog').showModal();
 }
 function visual(){
  return '<div class="ms-form-grid">'+
    select('renderType','Message type',[['normal','Normal message'],['embed','Embed message'],['both','Text and embed']],editTemp.renderType||'normal')+
    input('embedColor','Embed color',editTemp.embedColor||'#39b878',{type:'color',max:12})+'</div>'+
   textarea('content','Message content',editTemp.content,{rows:6})+
   '<div class="ms-subpanel"><h3>Variables</h3><div class="ms-variables">'+vars.map(v=>'<button type="button" data-ms-variable="'+escape(v)+'" title="Insert variable">'+escape(v)+'</button><button type="button" data-ms-copy-variable="'+escape(v)+'" title="Copy '+escape(v)+'" aria-label="Copy '+escape(v)+'">⧉</button>').join('')+'</div>'+
   tick('removeTitleEmoji','Remove title emoji',editTemp.removeTitleEmoji)+tick('removeEmptyLines','Remove empty lines',editTemp.removeEmptyLines)+'</div>'+
   '<div class="ms-subpanel"><h3>Embed</h3>'+tick('embed','Include embed',editTemp.embed)+
     input('embedTitle','Embed title',editTemp.embedTitle)+textarea('embedDescription','Embed description',editTemp.embedDescription)+input('embedFooter','Embed footer',editTemp.embedFooter)+'</div>'+
   '<div class="ms-subpanel"><h3>Action row</h3><p>Attach custom buttons and select menus created under Components.</p>'+
     '<div class="ms-component-list">'+state.components.map(c=>tick('component:'+c.id,c.name,editTemp.buttons?.includes(c.id),c.type==='select'?'Select menu':'Button')).join('')+
     (state.components.length?'':empty('Create a component in the Components tab to add it here.'))+'</div></div>'+
   '<div class="ms-subpanel"><h3>Use this message</h3>'+select('delivery.mode','Action',[['send','Send a new message'],['edit','Edit an existing message']],editTemp.delivery.mode)+
     input('delivery.channel','Channel',editTemp.delivery.channel,{placeholder:'#general'})+
     input('delivery.messageId','Existing message ID',editTemp.delivery.messageId)+
     input('delivery.webhook','Webhook URL (optional)',editTemp.delivery.webhook,{placeholder:'https://discord.com/api/webhooks/...'})+'</div>'+
   '<div class="ms-subpanel"><h3>Message preview</h3><div class="ms-preview" id="ms-message-preview"></div>'+
   '<div class="ms-actions" style="margin-top:11px">'+btn('copy-raw','Copy JSON')+btn('load-json','Load existing message JSON')+btn('clear-editor','Clear message')+'</div></div>';
 }
 function raw(){
  const payload={content:editTemp.content,embeds:editTemp.embed?[{title:editTemp.embedTitle,description:editTemp.embedDescription,color:parseInt((editTemp.embedColor||'#39b878').slice(1),16),footer:{text:editTemp.embedFooter}}]:[],
     components:(editTemp.buttons||[]).map(ref=>({componentId:ref}))};
  return '<div class="ms-subpanel"><h3>Raw JSON editor</h3>'+textarea('rawPayload','Message JSON',JSON.stringify(payload,null,2),{rows:17})+
    '<p>Use the standard content, embeds, and components fields.</p></div>';
 }
 function configFields(prefix,fields){
  return '<div class="ms-form-grid">'+fields.map(f=>{
   const key=prefix+'.'+f.key,value=editTemp[prefix][f.key];
   if(f.type==='checkbox')return tick(key,f.label,value);
   if(f.type==='select')return select(key,f.label,f.items,value);
   if(f.type==='textarea')return textarea(key,f.label,value);
   return input(key,f.label,value,{type:f.type||'text'});
  }).join('')+'</div>';
 }
 function automation(){
  return '<div class="ms-subpanel"><h3>Automated messages</h3>'+tick('automation.enabled','Enable automation',editTemp.automation.enabled)+
    configFields('automation',[
     {key:'channels',label:'Channels'},{key:'words',label:'Trigger words (comma-separated)',type:'textarea'},
     {key:'ignoreCase',label:'Ignore capitalization',type:'checkbox'},{key:'requireSpaces',label:'Require word boundaries',type:'checkbox'},
     {key:'reply',label:'Reply to triggering message',type:'checkbox'},{key:'dmOnly',label:'Send only by DM',type:'checkbox'},
     {key:'cooldown',label:'Send cooldown (seconds)',type:'number'},{key:'deleteDelay',label:'Delete after (seconds)',type:'number'},
     {key:'dmCountdown',label:'DM on countdown',type:'checkbox'},
     {key:'excludeMode',label:'Role filter',type:'select',items:[['exclude','Exclude listed roles'],['include','Only listed roles']]},
     {key:'roles',label:'Roles to include or exclude'}
    ])+'</div>';
 }
 function sticky(){
  return '<div class="ms-subpanel"><h3>Sticky messages</h3>'+
    tick('sticky.enabled','Enable sticky messages',editTemp.sticky.enabled)+configFields('sticky',[
     {key:'channel',label:'Sticky channel'},{key:'includeBots',label:'Count bot messages',type:'checkbox'},
     {key:'behavior',label:'Detection behavior',type:'select',items:[['instant','Instant'],['delay','With delay']]},
     {key:'delay',label:'Detection delay (seconds)',type:'number'},
     {key:'conversationDuration',label:'Conversation duration (minutes)',type:'number'},
     {key:'deleteBehavior',label:'Conversation delete behavior',type:'select',
       items:[['after-end','After conversation ends'],['with-start','When conversation starts'],['delay','After a delay']]},
     {key:'sendOrder',label:'Send order',type:'select',items:[['oldest','Oldest first'],['newest','Newest first']]}
    ])+'</div>';
 }
 function renderEditor(){
  $('ms-template-editor').innerHTML=editorMode==='visual'?visual():editorMode==='raw'?raw():editorMode==='automation'?automation():sticky();
  if(editorMode==='visual'){const area=$('ms-template-editor');const update=()=>{
    const box=area.querySelector('#ms-message-preview');if(!box)return;
    const preview=readPreviewData();
    box.replaceChildren();
    const content=document.createElement('div');content.textContent=preview.removeEmptyLines?preview.content.split('\n').filter(s=>s.trim()).join('\n'):preview.content;
    box.append(content);
    if(preview.embed){const em=document.createElement('div');em.className='ms-embed';const title=document.createElement('strong');title.textContent=preview.embedTitle;const desc=document.createElement('span');desc.textContent=preview.embedDescription;const footer=document.createElement('small');footer.textContent=preview.embedFooter;em.append(title,desc,footer);box.append(em);}
    for(const id of preview.buttons||[]){const c=state.components.find(v=>v.id===id);if(!c)continue;const b=document.createElement('button');b.type='button';b.disabled=true;b.textContent=c.label||c.name;box.append(b);}
   };
   area.addEventListener('input',update);area.addEventListener('change',update);update();
  }
 }
 function readPreviewData(){
  const temp=clone(editTemp),root=$('ms-template-editor');
  for(const el of root.querySelectorAll('[name]')){
   const name=el.name,val=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
   if(name.startsWith('component:'))continue;
   if(name.startsWith('delivery.'))temp.delivery[name.slice(9)]=val;
   else if(!name.includes('.'))temp[name]=val;
  }
  temp.buttons=[...root.querySelectorAll('[name^="component:"]:checked')].map(el=>el.name.slice(10));
  return temp;
 }
 function readTempFields(){
  const root=$('ms-template-editor');
  if(editorMode==='raw'){
   try{
    const value=JSON.parse(root.querySelector('[name=rawPayload]').value);
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('JSON must be an object.');
    editTemp.content=String(value.content??'');
    const embed=Array.isArray(value.embeds)&&value.embeds.length?value.embeds[0]:null;
    editTemp.embed=!!embed;
    if(embed){editTemp.embedTitle=String(embed.title||'');editTemp.embedDescription=String(embed.description||'');editTemp.embedFooter=String(embed.footer?.text||'');if(Number.isInteger(embed.color))editTemp.embedColor='#'+embed.color.toString(16).padStart(6,'0');}
    editTemp.buttons=Array.isArray(value.components)?value.components.map(v=>v.componentId).filter(Boolean):[];
   }catch(error){toast('Invalid message JSON: '+error.message);return false;}
   return true;
  }
  const inputs=root.querySelectorAll('[name]');
  for(const el of inputs){
   const name=el.name,val=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
   if(name.startsWith('component:'))continue;
   const bits=name.split('.');
   if(bits.length===2&&editTemp[bits[0]])editTemp[bits[0]][bits[1]]=val;
   else editTemp[name]=val;
  }
  if(editorMode==='visual')editTemp.buttons=[...root.querySelectorAll('[name^="component:"]:checked')].map(el=>el.name.slice(10));
  return true;
 }
 $('ms-template-editor').addEventListener('click',event=>{
  const copyVariable=event.target.closest('[data-ms-copy-variable]');
  if(copyVariable){
   navigator.clipboard?.writeText(copyVariable.dataset.msCopyVariable).then(()=>toast('Variable copied.'),()=>toast('Unable to copy variable.'));
   return;
  }
  const variable=event.target.closest('[data-ms-variable]');
  if(variable){const area=$('ms-template-editor [name=content]');if(!area)return;area.focus();area.setRangeText(variable.dataset.msVariable,area.selectionStart,area.selectionEnd,'end');area.dispatchEvent(new Event('input',{bubbles:true}));return;}
  const action=event.target.closest('[data-ms-action]');if(!action)return;
  if(action.dataset.msAction==='copy-raw'){
   const data=readPreviewData();const payload=JSON.stringify({content:data.content,embeds:data.embed?[{title:data.embedTitle,description:data.embedDescription,footer:{text:data.embedFooter}}]:[]},null,2);
   navigator.clipboard?.writeText(payload).then(()=>toast('Message JSON copied.'),()=>toast('Unable to copy.'));return;
  }
  if(action.dataset.msAction==='clear-editor'){
   $('ms-template-editor [name=content]').value='';$('ms-template-editor [name=embedTitle]').value='';$('ms-template-editor [name=embedDescription]').value='';$('ms-template-editor [name=embedFooter]').value='';$('ms-template-editor [name=content]').dispatchEvent(new Event('input',{bubbles:true}));return;
  }
  if(action.dataset.msAction==='load-json'){
   const json=prompt('Paste existing message JSON');
   if(json===null)return;
   try{
    const v=JSON.parse(json);
    if(typeof v.content==='string')$('ms-template-editor [name=content]').value=v.content;
    if(Array.isArray(v.embeds)&&v.embeds[0]){
     $('ms-template-editor [name=embed]').checked=true;
     $('ms-template-editor [name=embedTitle]').value=v.embeds[0].title||'';
     $('ms-template-editor [name=embedDescription]').value=v.embeds[0].description||'';
     $('ms-template-editor [name=embedFooter]').value=v.embeds[0].footer?.text||'';
    }
    $('ms-template-editor [name=content]').dispatchEvent(new Event('input',{bubbles:true}));
    toast('Message JSON loaded.');
   }catch{toast('Unable to read that message JSON.');}
  }
 });
 function saveTemplate(){
  if(!readTempFields())return false;
  editTemp.name=$('ms-template-form').elements.name.value.trim();
  editTemp.folder=$('ms-template-form').elements.folder.value;
  if(!editTemp.name){toast('Enter a template name.');return false;}
  if(editBuiltin){
   state.builtin[editBuiltin]={content:editTemp.content,embed:editTemp.embed,embedTitle:editTemp.embedTitle,
     embedDescription:editTemp.embedDescription,embedFooter:editTemp.embedFooter,embedColor:editTemp.embedColor,
     buttons:editTemp.buttons,automation:editTemp.automation,sticky:editTemp.sticky,delivery:editTemp.delivery};
  }else{
   const index=state.templates.findIndex(t=>t.id===editTemp.id);
   if(index>=0)state.templates[index]=clone(editTemp);
   else state.templates.push(clone(editTemp));
  }
  return true;
 }
 $('ms-template-form').addEventListener('submit',event=>{
  event.preventDefault();
  if(saveTemplate()){$('ms-template-dialog').close();render();toast('Message saved.');}
 });
 document.querySelectorAll('[data-ms-mode]').forEach(button=>button.addEventListener('click',()=>{
  if(editTemp&&readTempFields()===false)return;
  editorMode=button.dataset.msMode;
  document.querySelectorAll('[data-ms-mode]').forEach(b=>b.classList.toggle('ms-tab-active',b===button));
  renderEditor();
 }));
 $('ms-template-cancel').addEventListener('click',()=>$('ms-template-dialog').close());
 $('ms-template-close').addEventListener('click',()=>$('ms-template-dialog').close());
 $('ms-close').addEventListener('click',()=>$('ms-dialog').close());
 $('ms-cancel').addEventListener('click',()=>$('ms-dialog').close());
 $('ms-dialog-form').addEventListener('submit',event=>{
  event.preventDefault();if(!modalHandler)return;
  const data=markEditorFields(event.currentTarget);
  if(modalHandler(data)!==false){$('ms-dialog').close();modalHandler=null;render();toast('Changes applied.');}
 });
 $('ms-tabs').addEventListener('click',event=>{
  const selected=event.target.closest('[data-ms-tab]');if(!selected)return;
  tab=selected.dataset.msTab;query='';folder='';openedList='';openedComponent='';render();
 });
 $('ms-content').addEventListener('input',event=>{
  if(event.target.id==='ms-search'){query=event.target.value;const at=event.target.selectionStart;render();const el=$('ms-search');el.focus();el.setSelectionRange(at,at);}
 });
 $('ms-content').addEventListener('change',event=>{
  if(event.target.name==='sendCommand'){state.sendCommand=event.target.checked;mark();}
  if(event.target.name==='keep'){const c=state.components.find(x=>x.id===openedComponent);if(c){c.keep=event.target.checked;mark();}}
 });
 $('ms-content').addEventListener('submit',event=>{
  if(event.target.id!=='ms-add-list-template')return;
  event.preventDefault();const list=state.lists.find(x=>x.id===openedList),tid=event.target.elements.template.value;
  if(list&&tid&&state.templates.some(t=>t.id===tid)){list.templates.push(tid);render();}
 });
 $('ms-content').addEventListener('click',event=>{
  const chosen=event.target.closest('[data-ms-folder]');
  if(chosen){folder=chosen.dataset.msFolder;render();return;}
  const b=event.target.closest('[data-ms-action]');if(!b)return;
  const action=b.dataset.msAction,itemId=b.dataset.id;
  if(action==='add-folder'){folderEditor('');return;}
  if(action==='rename-folder'){folderEditor(itemId);return;}
  if(action==='delete-folder'){
   if(!confirm('Delete this folder? Its templates will be moved to No folder.'))return;
   state.folders=state.folders.filter(x=>x.id!==itemId);state.templates.forEach(t=>{if(t.folder===itemId)t.folder='';});folder='';render();return;
  }
  if(action==='create-template'){editTemplate('');return;}
  if(action==='edit-template'){editTemplate(itemId);return;}
  if(action==='duplicate-template'){const t=state.templates.find(x=>x.id===itemId);if(t)state.templates.push({...clone(t),id:id(),name:t.name+' (copy)'});render();return;}
  if(action==='remove-template'){if(!confirm('Remove this template?'))return;state.templates=state.templates.filter(x=>x.id!==itemId);state.lists.forEach(l=>l.templates=l.templates.filter(ref=>ref!==itemId));render();return;}
  if(action==='add-list'||action==='edit-list'){listEditor(itemId);return;}
  if(action==='delete-list'){if(!confirm('Remove this message list?'))return;state.lists=state.lists.filter(x=>x.id!==itemId);render();return;}
  if(action==='open-list'){openedList=itemId;render();return;}
  if(action==='back-lists'){openedList='';render();return;}
  if(action==='move-list-template'||action==='remove-list-template'){
   const list=state.lists.find(x=>x.id===openedList);if(!list)return;
   const index=list.templates.indexOf(itemId);
   if(index<0)return;
   if(action==='remove-list-template')list.templates.splice(index,1);
   else{const next=index+Number(b.dataset.dir);if(next>=0&&next<list.templates.length){[list.templates[index],list.templates[next]]=[list.templates[next],list.templates[index]];}}
   render();return;
  }
  if(action==='add-component'||action==='edit-component'){componentEditor(itemId);return;}
  if(action==='open-component'){openedComponent=itemId;render();return;}
  if(action==='back-components'){openedComponent='';render();return;}
  if(action==='delete-component'){if(!confirm('Remove this component?'))return;state.components=state.components.filter(x=>x.id!==itemId);state.templates.forEach(t=>t.buttons=(t.buttons||[]).filter(ref=>ref!==itemId));render();return;}
  if(action==='add-option'||action==='edit-option'){optionEditor(itemId);return;}
  if(action==='delete-option'){const c=state.components.find(x=>x.id===openedComponent);if(c)c.options=c.options.filter(o=>o.id!==itemId);render();return;}
  if(action==='add-schedule'||action==='edit-schedule'){scheduleEditor(itemId);return;}
  if(action==='delete-schedule'){if(!confirm('Remove this scheduled message?'))return;state.schedules=state.schedules.filter(x=>x.id!==itemId);render();return;}
  if(action==='edit-builtin'){editTemplate('',b.dataset.name);return;}
 });
 $('ms-save').addEventListener('click',()=>{
  try{localStorage.setItem(key,JSON.stringify(state));saved=clone(state);mark();toast('Message settings saved.');}
  catch{toast('Unable to save messages.');}
 });
 $('ms-reset').addEventListener('click',()=>{state=clone(saved);render();toast('Changes reset.');});
 render();
})();
