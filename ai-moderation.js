(() => {
  'use strict';
  const root = document.querySelector('.am-page');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean = text => String(text ?? '').trim();
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const id = () => 'am-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
  const storageKey = 'next-step-ai-moderation-v1';
  const language = ['Insults','Threats','Identity attacks','Other offensive language'];
  const attachments = ['Violence attachment','Sexual attachment','Horror attachment','Substance attachment','Other harmful attachments'];
  const categories = [...language,...attachments];
  const severityOptions = [['low','Low'],['medium','Medium'],['high','High']];
  const actionNames = ['Report to moderators','Delete message','Send message','DM user','Open moderation case','Add reaction','Add roles','Remove roles','Set roles','Manage levels'];
  const defaults = {settings:{enabled:false,categories:[...language],actions:['Report to moderators'],reportChannel:''},rules:[]};
  function readState() {
    try {
      const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
      if (!saved || typeof saved!=='object') return clone(defaults);
      const normalized=clone(defaults);
      if(saved.settings && typeof saved.settings==='object') {
        normalized.settings={...normalized.settings,...saved.settings};
        normalized.settings.categories=Array.isArray(saved.settings.categories)?
          saved.settings.categories.filter(x=>categories.includes(x)):language.slice();
        normalized.settings.actions=Array.isArray(saved.settings.actions)?
          saved.settings.actions.filter(x=>actionNames.includes(x)):['Report to moderators'];
      }
      normalized.rules=Array.isArray(saved.rules)?saved.rules.filter(x=>x&&categories.includes(x.trigger)).map(rule=>({
        id:clean(rule.id)||id(),trigger:rule.trigger,severity:['low','medium','high'].includes(rule.severity)?rule.severity:'medium',
        includeChannels:clean(rule.includeChannels),excludeChannels:clean(rule.excludeChannels),
        includeRoles:clean(rule.includeRoles),excludeRoles:clean(rule.excludeRoles),
        actions:Array.isArray(rule.actions)?rule.actions.filter(a=>a&&actionNames.includes(a.kind)).map(a=>({...a,id:clean(a.id)||id()})):[]
      })).slice(0,100):[];
      return normalized;
    }catch{return clone(defaults);}
  }
  let saved=readState();
  let draft=clone(saved);
  let wizardStep=0;
  let wizard={categories:[],actions:[],reportChannel:''};
  let dialogSave=null;
  let formSchema=[];
  let editing=null;
  let toastTimer;
  function notify(message) {
    $('am-toast').textContent=message;
    $('am-toast').hidden=false;
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>$('am-toast').hidden=true,3400);
  }
  function changed(){return JSON.stringify(draft)!==JSON.stringify(saved);}
  function mark(){$('am-savebar').hidden=!changed();}
  function save(){
    try{
      localStorage.setItem(storageKey,JSON.stringify(draft));
      saved=clone(draft);render();notify('AI moderation settings saved.');
      return true;
    }catch {notify('Unable to save settings.');return false;}
  }
  function button(action,label,data={},style='am-secondary'){
    const attrs=Object.entries(data).map(([name,value])=>' data-'+name+'="'+esc(value)+'"').join('');
    return '<button type="button" class="'+style+'" data-am-action="'+action+'"'+attrs+'>'+esc(label)+'</button>';
  }
  function summarizeAction(action){
    if(action.kind==='Report to moderators')return [action.channel,action.reason,action.pingRoles].filter(Boolean).join(' · ');
    if(action.kind==='Delete message')return [action.deleteMode||'All matching',action.delay?String(action.delay)+'s delay':''].filter(Boolean).join(' · ');
    if(action.kind==='Open moderation case')return [action.caseType||'Warn',action.reason,action.duration].filter(Boolean).join(' · ');
    if(action.kind==='Send message'||action.kind==='DM user')return [action.template,action.channel,action.delay?String(action.delay)+'s delay':''].filter(Boolean).join(' · ');
    return [action.details,action.delay?String(action.delay)+'s delay':''].filter(Boolean).join(' · ');
  }
  function render(){
    $('am-setup-btn').textContent=draft.settings.enabled?'Manage setup':'Set up';
    const container=$('am-rule-list');
    const cards=draft.rules.map(rule=>{
      const actions=rule.actions.map(action=>'<div class="am-action-item"><div><strong>'+esc(action.kind)+'</strong>'+
        (summarizeAction(action)?'<small>'+esc(summarizeAction(action))+'</small>':'')+'</div><div class="am-actions">'+
        button('edit-action','Edit',{id:rule.id,aid:action.id})+button('delete-action','Remove',{id:rule.id,aid:action.id},'am-danger')+'</div></div>').join('');
      const scopes=[rule.includeChannels&&'Channels: '+rule.includeChannels,rule.excludeChannels&&'Exclude channels: '+rule.excludeChannels,
        rule.includeRoles&&'Roles: '+rule.includeRoles,rule.excludeRoles&&'Exclude roles: '+rule.excludeRoles].filter(Boolean);
      return '<article class="am-rule" data-rule-id="'+esc(rule.id)+'"><div class="am-rule-heading"><div>'+
        '<div class="am-rule-title"><span class="am-rule-mark" aria-hidden="true">✧</span><strong>'+esc(rule.trigger)+'</strong>'+
        '<span class="am-severity '+esc(rule.severity)+'">'+esc(rule.severity.toUpperCase())+'</span></div>'+
        '<p class="am-subcopy">If '+esc(rule.trigger.toLowerCase())+' is detected, perform the actions below.</p>'+
        '</div><div class="am-actions">'+button('edit-rule','Edit',{id:rule.id})+
        button('delete-rule','Remove',{id:rule.id},'am-danger')+'</div></div>'+
        (scopes.length?'<div class="am-scope">'+scopes.map(t=>'<span class="am-chip">'+esc(t)+'</span>').join('')+'</div>':'')+
        '<div class="am-rule-body"><h3>Actions</h3><div class="am-action-list">'+
        (actions||'<div class="am-empty">No actions added.</div>')+'</div>'+
        '<div class="am-add-action">'+button('add-action','+ Add action',{id:rule.id})+'</div></div></article>';
    });
    container.innerHTML=cards.length?cards.join(''):'<div class="am-empty">No AI moderation conditions yet. Select Set up or add a condition to get started.</div>';
    mark();
  }
  function openWizard(){
    wizardStep=0;
    wizard={categories:[...draft.settings.categories],actions:[...draft.settings.actions],
      reportChannel:draft.settings.reportChannel||''};
    if (!wizard.categories.length)wizard.categories=[...language];
    const dialog=$('am-setup-dialog');
    renderWizard();
    dialog.showModal();
  }
  const setupTitle = ['Set up AI Moderation','Categories','Actions','Report channel'];
  const setupDescription = [
    'Configure AI-powered detection for messages and attachments.',
    'Select categories of inappropriate content to detect and take action on.',
    'Select actions to take when inappropriate content is detected. Additional actions can be set afterwards.',
    'Choose the channel where moderation reports should appear.'
  ];
  function wizardChoices(values,chosen,kind){
    return '<div class="am-categories">'+values.map((label,index)=>
      '<label class="'+(kind==='actions'?'am-action-choice':'am-category-item')+(kind==='actions'&&index===0?' am-highlight':'')+'">'+esc(label)+
      '<input type="checkbox" data-wizard-kind="'+kind+'" value="'+esc(label)+'"'+(chosen.includes(label)?' checked':'')+'></label>').join('')+'</div>';
  }
  function renderWizard(){
    $('am-setup-error').hidden=true;
    $('am-setup-title').textContent=setupTitle[wizardStep];
    $('am-setup-description').textContent=setupDescription[wizardStep];
    $('am-setup-back').textContent=wizardStep?'Back':'Never mind';
    $('am-setup-next').textContent=['Start setup','Continue','Continue','Finish setup'][wizardStep];
    let content='';
    if(wizardStep===0){
      content='<div class="am-setup-intro"><div>Auto-detect inappropriate content</div>'+
        '<div>Report detected content to moderators</div>'+
        '<div>Automatically take action on detected content</div></div>';
    }else if(wizardStep===1){
      content='<p class="am-group-label">Language categories</p>'+wizardChoices(language,wizard.categories,'categories')+
        '<p class="am-group-label">Attachments</p>'+wizardChoices(attachments,wizard.categories,'categories');
    }else if(wizardStep===2){
      content=wizardChoices(['Report to moderators','Delete message'],wizard.actions,'actions');
    }else{
      content='<label class="am-field">Report channel<input id="am-report-channel" value="'+esc(wizard.reportChannel)+'" placeholder="#moderator-logs" maxlength="100" autocomplete="off"></label>';
    }
    $('am-setup-content').innerHTML=content;
  }
  function closeWizard(){$('am-setup-dialog').close();}
  function wizardNext(){
    if(wizardStep===0){wizardStep=1;renderWizard();return;}
    if(wizardStep===1){
      if(!wizard.categories.length){showWizardError('Choose at least one category.');return;}
      wizardStep=2;renderWizard();return;
    }
    if(wizardStep===2){
      if(!wizard.actions.length){showWizardError('Select at least one action.');return;}
      if(wizard.actions.includes('Report to moderators')){wizardStep=3;renderWizard();return;}
      finishWizard();return;
    }
    wizard.reportChannel=clean($('am-report-channel').value);
    if(!wizard.reportChannel){showWizardError('Select a report channel.');$('am-report-channel').focus();return;}
    finishWizard();
  }
  function showWizardError(text){$('am-setup-error').textContent=text;$('am-setup-error').hidden=false;}
  function finishWizard(){
    draft.settings={...draft.settings,enabled:true,categories:[...wizard.categories],actions:[...wizard.actions],reportChannel:wizard.reportChannel};
    draft.rules=draft.rules.filter(rule=>wizard.categories.includes(rule.trigger));
    for(const trigger of wizard.categories) {
      let rule=draft.rules.find(r=>r.trigger===trigger);
      if(!rule){
        rule={id:id(),trigger,severity:'medium',includeChannels:'',excludeChannels:'',includeRoles:'',excludeRoles:'',actions:[]};
        draft.rules.push(rule);
      }
      if(!rule.actions.length)rule.actions=wizard.actions.map(kind=>({id:id(),kind,
        channel:kind==='Report to moderators'?wizard.reportChannel:'',reason:'',pingRoles:'',
        deleteMode:'all',template:'',caseType:'warn',delay:0,details:'',duration:''}));
    }
    closeWizard();render();save();
  }
  $('am-setup-content').addEventListener('change',event=>{
    const el=event.target;
    if(!el.matches('[data-wizard-kind]'))return;
    const list=wizard[el.dataset.wizardKind];
    const index=list.indexOf(el.value);
    if(el.checked && index<0)list.push(el.value);
    else if(!el.checked && index>=0)list.splice(index,1);
    $('am-setup-error').hidden=true;
  });
  $('am-setup-back').addEventListener('click',()=>{
    if(wizardStep===0)closeWizard();
    else if(wizardStep===3){wizard.reportChannel=clean($('am-report-channel').value);wizardStep=2;renderWizard();}
    else {wizardStep--;renderWizard();}
  });
  $('am-setup-next').addEventListener('click',wizardNext);
  $('am-setup-btn').addEventListener('click',openWizard);
  function schemaModal(title,fields,values,onSubmit){
    editing=onSubmit;
    formSchema=fields;
    $('am-edit-title').textContent=title;
    $('am-edit-fields').innerHTML=fields.map(field=>{
      const value=values[field.key]??'';
      let control;
      if(field.type==='select'){
        control='<select name="'+esc(field.key)+'">'+field.options.map(([v,label])=>
          '<option value="'+esc(v)+'"'+(String(v)===String(value)?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select>';
      }else if(field.type==='textarea'){
        control='<textarea name="'+esc(field.key)+'" rows="3"'+(field.required?' required':'')+'>'+esc(value)+'</textarea>';
      }else{
        control='<input name="'+esc(field.key)+'" type="'+(field.type||'text')+'" value="'+esc(value)+'"'+
          (field.type==='number'?' min="0" step="1"':' maxlength="2000"')+(field.required?' required':'')+'>';
      }
      return '<label class="am-field">'+esc(field.label)+control+'</label>';
    }).join('');
    $('am-edit-dialog').showModal();
  }
  const conditionFields=[
    {key:'trigger',label:'Detect',type:'select',options:categories.map(x=>[x,x])},
    {key:'severity',label:'Severity',type:'select',options:severityOptions},
    {key:'includeChannels',label:'Only channels (optional)'},
    {key:'excludeChannels',label:'Excluded channels'},
    {key:'includeRoles',label:'Only roles (optional)'},
    {key:'excludeRoles',label:'Excluded roles'}
  ];
  function editRule(ruleId){
    const old=draft.rules.find(r=>r.id===ruleId)||{trigger:categories[0],severity:'medium',
      includeChannels:'',excludeChannels:'',includeRoles:'',excludeRoles:'',actions:[]};
    schemaModal(ruleId?'Edit condition':'Add condition',conditionFields,old,data=>{
      const duplicate=draft.rules.find(r=>r.trigger===data.trigger&&r.id!==ruleId);
      if(duplicate){notify('A condition for this trigger already exists.');return false;}
      if(ruleId){const match=draft.rules.find(r=>r.id===ruleId);if(match)Object.assign(match,data);}
      else draft.rules.push({...data,id:id(),actions:[]});
    });
  }
  const actionFields=[
    {key:'kind',label:'Action',type:'select',options:actionNames.map(x=>[x,x])},
    {key:'channel',label:'Target channel'},
    {key:'reason',label:'Reason'},
    {key:'pingRoles',label:'Ping roles'},
    {key:'deleteMode',label:'Delete messages',type:'select',options:[['all','All matching messages'],['overflow','Overflow only']]},
    {key:'template',label:'Message template / template list'},
    {key:'caseType',label:'Moderation case',type:'select',options:[['risk','Risk points'],['warn','Warn'],['mute','Mute'],['kick','Kick'],['ban','Ban']]},
    {key:'duration',label:'Case duration or risk points'},
    {key:'details',label:'Role, emoji, XP, and other action details',type:'textarea'},
    {key:'delay',label:'Delay (seconds)',type:'number'}
  ];
  function editAction(ruleId,actionId){
    const rule=draft.rules.find(r=>r.id===ruleId);if(!rule)return;
    const old=rule.actions.find(a=>a.id===actionId)||{
      kind:'Report to moderators',channel:draft.settings.reportChannel||'',reason:'',pingRoles:'',
      deleteMode:'all',template:'',caseType:'warn',duration:'',details:'',delay:0
    };
    schemaModal(actionId?'Edit action':'Add action',actionFields,old,data=>{
      if(actionId){const found=rule.actions.find(a=>a.id===actionId);if(found)Object.assign(found,data);}
      else rule.actions.push({...data,id:id()});
    });
  }
  $('am-edit-form').addEventListener('submit',event=>{
    event.preventDefault();
    if(!editing)return;
    const data={};
    for(const f of formSchema){
      const el=$('am-edit-form').elements.namedItem(f.key);
      data[f.key]=f.type==='number'?Number(el.value):clean(el.value);
    }
    if(editing(data)===false)return;
    $('am-edit-dialog').close();editing=null;render();
  });
  document.querySelectorAll('[data-am-close]').forEach(button=>button.addEventListener('click',()=>{
    const dlg=button.dataset.amClose==='setup'?'am-setup-dialog':'am-edit-dialog';
    $(dlg).close();
  }));
  $('am-add-condition').addEventListener('click',()=>editRule(''));
  $('am-rule-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-am-action]');if(!button)return;
    const action=button.dataset.amAction,ruleId=button.dataset.id;
    if(action==='edit-rule'){editRule(ruleId);return;}
    if(action==='delete-rule'){draft.rules=draft.rules.filter(r=>r.id!==ruleId);render();return;}
    if(action==='add-action'||action==='edit-action'){editAction(ruleId,button.dataset.aid||'');return;}
    if(action==='delete-action'){
      const rule=draft.rules.find(r=>r.id===ruleId);
      if(rule)rule.actions=rule.actions.filter(a=>a.id!==button.dataset.aid);
      render();
    }
  });
  $('am-save').addEventListener('click',save);
  $('am-reset').addEventListener('click',()=>{draft=clone(saved);render();notify('Changes reset.');});
  render();
})();
