(() => {
  'use strict';
  const root = document.querySelector('[data-cx-page]');
  if (!root) return;
  const feature = root.dataset.cxPage;
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clean = value => String(value == null ? '' : value).trim();
  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => 'cx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
  const btn = (action, label, extra='', cls='cx-secondary') => '<button type="button" class="' + cls + '" data-action="' + action + '" ' + extra + '>' + esc(label) + '</button>';
  const field = (key,label,type='text',placeholder='',details='') =>
    '<label class="cx-field"><span>' + esc(label) + '</span><input data-setting="' + esc(key) +
    '" type="' + type + '" value="' + esc(state.settings[key]) + '" placeholder="' + esc(placeholder) +
    '"' + (type === 'number' ? ' min="0" step="1"' : ' maxlength="2000"') + '>' +
    (details ? '<small>'+esc(details)+'</small>' : '') + '</label>';
  const area = (key,label,placeholder='',details='') =>
    '<label class="cx-field"><span>' + esc(label) + '</span><textarea data-setting="' + esc(key) + '" rows="3" placeholder="' +
    esc(placeholder) + '">' + esc(state.settings[key]) + '</textarea>' + (details?'<small>'+esc(details)+'</small>':'')+'</label>';
  const toggle = (key,label,details='') =>
    '<label class="cx-switch"><span>' + esc(label) + (details?'<small>'+esc(details)+'</small>':'') +
    '</span><input type="checkbox" data-setting="' + esc(key) + '"' +
    (state.settings[key]?' checked':'') + '></label>';
  const select = (key,label,items) =>
    '<label class="cx-field"><span>' + esc(label) + '</span><select data-setting="' + esc(key) + '">' +
    items.map(([value,title])=>'<option value="'+esc(value)+'"'+(String(state.settings[key])===String(value)?' selected':'')+'>'+esc(title)+'</option>').join('')+'</select></label>';
  const box = (title,content,actions='') => '<section class="cx-section"><div class="cx-section-head"><h2>'+esc(title)+'</h2>'+actions+'</div>'+content+'</section>';
  const empty = message => '<div class="cx-empty">'+esc(message)+'</div>';
  const chip = value => '<span class="cx-chip">'+esc(value)+'</span>';
  const group = (title,description='',content='') =>
    '<div class="cx-card"><div class="cx-card-head"><div><strong class="cx-card-title">'+esc(title)+'</strong>'+
    (description?'<div class="cx-card-subtitle">'+esc(description)+'</div>':'')+'</div></div>'+content+'</div>';
  const key = 'next-step-'+feature+'-v1';
  const kinds = ['Delete message','Send message','Report to moderators','DM user','Open moderation case','Add reaction','Add roles','Remove roles','Set roles','Manage levels'];
  const severity = [['low','Low'],['medium','Medium'],['high','High']];
  const triggersAI = ['Insults','Threats','Identity attacks','Other offensive language','Violence attachment','Sexual attachment','Horror attachment','Substance attachment','Other harmful attachments'];
  const triggersProfile = ['Profile banner','Profile picture','Profile name','Bio','Status','Pronouns','Connected domains'];
  const templateNames = [
    ['confession','Confession message'],['review','Review message'],['approved','Approved message'],
    ['denied','Denied message'],['deniedReason','Denied with reason'],['confessBan','Confession ban']
  ];
  const tabs = {
    'levels':[['settings','Settings'],['rewards','Levels'],['logs','XP logs']],
    'anonymous-messages':[['pending','Pending confessions'],['appeals','Appeals'],['settings','Settings'],['templates','Messages']],
    'check-in-reminders':[['lists','Check-in lists'],['ignored','Ignored users']],
    'translator':[['settings','Settings'],['messages','Message editor'],['recent','Recent translations']],
    'ai-moderation':[['conditions','Conditions']],
    'profile-checker':[['conditions','Conditions']]
  }[feature];
  const defaultSettings = {
    'levels': {
      minXp:10,maxXp:25,spamFilter:true,minLength:5,xpCooldown:60,ignoreBots:true,
      channelMode:'blacklist',channels:'',roleMode:'blacklist',roles:'',
      convoWindow:600,voiceMessageXp:2,voiceMessageDuration:60,gifXp:2,gifDuration:60,
      pollXp:3,pollDuration:60,attachmentXp:3,attachmentDuration:60,
      serverBoostXp:10,serverBoostDuration:60,bumpXp:15,bumpDuration:120,
      voiceCallXp:5,callInterval:10,callMax:150,
      dailyMax:1000,decay:0,decayEvery:1440,inactiveTime:10080
    },
    'anonymous-messages':{autoMod:true,confessionChannels:'',reviewChannels:'',anonymousReview:false},
    'check-in-reminders':{},
    'translator':{autoMod:true,model:'Default',language:'English',triggers:'!t, !translate',personal:true,personalButton:true,changeButton:true,translateButton:true},
    'ai-moderation':{},
    'profile-checker':{}
  };
  const defaultTemplates = feature === 'anonymous-messages'
    ? Object.fromEntries(templateNames.map(([id,name])=>[id,{content:'',delivery:'channel',destination:''}]))
    : feature === 'levels'
      ? {levelUp:{content:'Congratulations {user}! You reached level {level}.',delivery:'channel',destination:''},
         level:{content:'{user} is level {level} with {xp} XP.',delivery:'channel',destination:''}}
      : feature === 'translator'
        ? {translated:{content:'{user}: {original}\nTranslation: {translated}',delivery:'channel',destination:''}}
        : {};
  function defaults() {
    return {settings:clone(defaultSettings[feature]),templates:clone(defaultTemplates),
      rewards:[],logs:[],pending:[],appeals:[],reviewed:[],lists:[],ignored:[],recent:[],rules:[]};
  }
  function load() {
    const base=defaults();
    try {
      const value=JSON.parse(localStorage.getItem(key)||'null');
      if(!value||typeof value!=='object'||Array.isArray(value))return base;
      if(value.settings&&typeof value.settings==='object')Object.assign(base.settings,value.settings);
      if(value.templates&&typeof value.templates==='object') {
        for (const name of Object.keys(base.templates)) {
          if(value.templates[name]&&typeof value.templates[name]==='object')Object.assign(base.templates[name],value.templates[name]);
        }
      }
      for(const field of ['rewards','logs','pending','appeals','reviewed','lists','ignored','recent','rules']){
        if(Array.isArray(value[field]))base[field]=value[field].slice(0,150);
      }
    }catch {}
    return base;
  }
  let saved=load();
  let state=clone(saved);
  let currentTab=tabs[0][0];
  let expanded={pending:false,appeals:false};
  let modalHandler=null;
  let toastTimer;
  function notify(message){
    const el=$('cx-toast');el.textContent=message;el.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},3000);
  }
  function mark(){ $('cx-savebar').hidden=JSON.stringify(state)===JSON.stringify(saved); }
  function renderTabs(){
    $('cx-tabs').innerHTML=tabs.map(([name,label])=>'<button type="button" role="tab" aria-selected="'+(name===currentTab)+'" data-cx-tab="'+name+'">'+esc(label)+'</button>').join('');
  }
  function render(){renderTabs();$('cx-content').innerHTML=body();mark();}
  function updateSetting(target){
    const name=target.dataset.setting;if(!name)return;
    state.settings[name]=target.type==='checkbox'?target.checked:target.type==='number'?Number(target.value):target.value;
    mark();
  }
  function modal(title,fields,initial,onSave) {
    modalHandler=onSave;
    $('cx-dialog-title').textContent=title;
    $('cx-dialog-fields').oninput=null;
    $('cx-dialog-fields').innerHTML=fields.map(f=>{
      const value=initial[f.key] == null ? '' : initial[f.key];
      if(f.type==='textarea')return '<label class="cx-field"><span>'+esc(f.label)+'</span><textarea name="'+esc(f.key)+'" rows="5"'+(f.required?' required':'')+'>'+esc(value)+'</textarea></label>';
      if(f.type==='select')return '<label class="cx-field"><span>'+esc(f.label)+'</span><select name="'+esc(f.key)+'">'+
        f.items.map(([v,label])=>'<option value="'+esc(v)+'"'+(String(value)===String(v)?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
      if(f.type==='checkbox')return '<label class="cx-switch"><span>'+esc(f.label)+'</span><input type="checkbox" name="'+esc(f.key)+'"'+(value?' checked':'')+'></label>';
      return '<label class="cx-field"><span>'+esc(f.label)+'</span><input name="'+esc(f.key)+'" type="'+(f.type||'text')+'" value="'+esc(value)+'"'+(f.type==='number'?' min="0" step="1"':' maxlength="2000"')+(f.required?' required':'')+'></label>';
    }).join('');
    $('cx-dialog').showModal();
    $('cx-dialog-fields').querySelector('input:not([type=checkbox]),select,textarea')?.focus();
    modalFields=fields;
  }
  let modalFields=[];
  const modalClose=()=>{$('cx-dialog').close();modalHandler=null;};
  $('cx-dialog-close').addEventListener('click',modalClose);
  $('cx-dialog-cancel').addEventListener('click',modalClose);
  $('cx-dialog-form').addEventListener('submit',event=>{
    event.preventDefault();if(!modalHandler)return;
    const data={};
    for(const f of modalFields){
      const el=$('cx-dialog-form').elements.namedItem(f.key);
      data[f.key]=f.type==='checkbox'?el.checked:f.type==='number'?Number(el.value):clean(el.value);
    }
    if(modalHandler(data)!==false){modalClose();render();}
  });
  const editFields=()=>[
    {key:'content',label:'Message content',type:'textarea',required:true},
    {key:'delivery',label:'Delivery',type:'select',items:[['channel','Channel'],['dm','Direct message'],['off','Off']]},
    {key:'destination',label:'Channel or recipient'},
    {key:'embed',label:'Include embed',type:'checkbox'},
    {key:'embedTitle',label:'Embed title'},
    {key:'embedDescription',label:'Embed description',type:'textarea'},
    {key:'footer',label:'Embed footer'},
    {key:'buttonLabel',label:'Action button label'},
    {key:'buttonUrl',label:'Action button URL'}
  ];
  function editTemplate(name,title) {
    const original=state.templates[name]||{content:'',delivery:'channel',destination:''};
    modal(title,editFields(),clone(original),data=>{
      if(data.buttonUrl&&!/^https?:\/\//i.test(data.buttonUrl)){notify('Enter a valid http or https button URL.');return false;}
      state.templates[name]=data;
    });
    const content=$('cx-dialog-fields');
    const tools=document.createElement('div');
    tools.className='cx-template-tools';
    tools.innerHTML='<h3>Variables</h3><div class="cx-variables">' +
      ['{user}','{server}','{level}','{xp}','{translated}','{original}','{channel}','{reason}']
        .map(value=>'<button type="button" data-cx-insert="'+esc(value)+'">'+esc(value)+'</button>').join('')+
      '</div><h3>Message preview</h3><div id="cx-template-preview" class="cx-message-preview"></div>';
    content.append(tools);
    const refresh=()=>{
      const f=$('cx-dialog-form').elements;
      const preview=$('cx-template-preview');
      const contentText=f.namedItem('content').value;
      const titleText=clean(f.namedItem('embedTitle').value);
      const descText=clean(f.namedItem('embedDescription').value);
      const footerText=clean(f.namedItem('footer').value);
      const buttonText=clean(f.namedItem('buttonLabel').value);
      preview.replaceChildren();
      const main=document.createElement('div');
      main.textContent=contentText;
      preview.append(main);
      if(f.namedItem('embed').checked){
        const embed=document.createElement('div');embed.className='cx-embed-preview';
        const titleEl=document.createElement('strong');titleEl.textContent=titleText;
        const desc=document.createElement('p');desc.textContent=descText;
        const footer=document.createElement('small');footer.textContent=footerText;
        embed.append(titleEl,desc,footer);preview.append(embed);
      }
      if(buttonText){
        const button=document.createElement('span');button.className='cx-action-preview';button.textContent=buttonText;
        preview.append(button);
      }
    };
    content.oninput=refresh;
    tools.addEventListener('click',event=>{
      const b=event.target.closest('[data-cx-insert]');
      if(!b)return;
      const el=$('cx-dialog-form').elements.namedItem('content');
      el.focus();el.setRangeText(b.dataset.cxInsert,el.selectionStart,el.selectionEnd,'end');
      refresh();
    });
    refresh();
  }
  function renderTemplates(names){
    return '<div class="cx-card-list">'+names.map(([name,title])=>{
      const t=state.templates[name]||{content:'',delivery:'channel',destination:''};
      return '<div class="cx-card"><div class="cx-card-head"><div><strong class="cx-card-title">'+esc(title)+'</strong>'+
        '<div class="cx-card-subtitle">'+esc(t.delivery)+(t.destination?' · '+esc(t.destination):'')+'</div></div>'+
        btn('edit-template','Edit','data-key="'+esc(name)+'" data-title="'+esc(title)+'"')+'</div>'+
        (t.content?'<div class="cx-message-preview" style="margin-top:12px">'+esc(t.content)+
         (t.embed?'<div class="cx-embed-preview"><strong>'+esc(t.embedTitle||'')+'</strong><p>'+esc(t.embedDescription||'')+
           '</p><small>'+esc(t.footer||'')+'</small></div>':'')+
         (t.buttonLabel?'<span class="cx-action-preview">'+esc(t.buttonLabel)+'</span>':'')+'</div>':'')+'</div>';
    }).join('')+'</div>';
  }
  function settingPair(a,b){return '<div class="cx-two">'+a+b+'</div>';}
  function levels(){
    if(currentTab==='rewards'){
      const cards=state.rewards.length?state.rewards.map(item=>
        '<div class="cx-card"><div class="cx-card-head"><div><strong class="cx-card-title">Level '+esc(item.level)+'</strong>'+
        '<div class="cx-card-subtitle">'+esc(item.xp)+' XP required · '+esc(item.role||'No reward role')+'</div></div>'+
        '<div class="cx-card-actions">'+btn('edit-reward','Edit','data-id="'+esc(item.id)+'"')+
        btn('remove-reward','Remove','data-id="'+esc(item.id)+'"','cx-danger')+'</div></div></div>').join(''):empty('No level rewards added.');
      return box('Level rewards',cards,btn('add-reward','+ Add level','','cx-primary'));
    }
    if(currentTab==='logs'){
      const rows=state.logs.length?'<table class="cx-table"><thead><tr><th>Member</th><th>XP</th><th>Source</th><th>Time</th></tr></thead><tbody>'+
        state.logs.map(e=>'<tr><td>'+esc(e.member)+'</td><td>'+esc(e.xp)+'</td><td>'+esc(e.source)+'</td><td>'+esc(e.time)+'</td></tr>').join('')+'</tbody></table>':empty('No XP activity recorded yet.');
      return box('XP logs',rows);
    }
    return box('Message XP',settingPair(field('minXp','Minimum XP per message','number'),field('maxXp','Maximum XP per message','number'))+
      toggle('spamFilter','Filter spam','Only count a message if the member has not sent a message in the previous 10 messages')+
      settingPair(field('minLength','Minimum message length','number'),field('xpCooldown','XP cooldown (seconds)','number'))+
      toggle('ignoreBots','Ignore bot messages')+
      settingPair(select('channelMode','Channel filter',[['blacklist','Exclude channels'],['whitelist','Only these channels']]),
        select('roleMode','Roles and members filter',[['blacklist','Exclude listed'],['whitelist','Only listed']]))+
      settingPair(area('channels','Channels','Channel names or IDs, separated by commas'),area('roles','Roles and members','Role/member IDs, separated by commas')))
      +box('Conversation boosters',settingPair(field('convoWindow','Maximum time between messages (seconds)','number'),field('voiceMessageXp','Voice message XP','number'))+
       settingPair(field('voiceMessageDuration','Voice message duration (seconds)','number'),field('gifXp','GIF booster XP','number'))+
       settingPair(field('gifDuration','GIF duration (seconds)','number'),field('pollXp','Poll booster XP','number'))+
       settingPair(field('pollDuration','Poll duration (seconds)','number'),field('attachmentXp','Attachment booster XP','number'))+
       settingPair(field('attachmentDuration','Attachment duration (seconds)','number'),field('serverBoostXp','Server boost XP','number'))+
       settingPair(field('serverBoostDuration','Server boost duration (minutes)','number'),field('bumpXp','Bump XP','number'))+
       settingPair(field('bumpDuration','Bump booster duration (minutes)','number'),field('voiceCallXp','Voice call XP','number'))+
       settingPair(field('callInterval','Call interval (minutes)','number'),field('callMax','Maximum XP per call','number')))
      +box('Global XP settings',settingPair(field('dailyMax','Maximum XP per day','number'),field('decay','XP decrease amount','number'))+
        settingPair(field('decayEvery','XP decrease interval (minutes)','number'),field('inactiveTime','Inactive time before decrease (minutes)','number')))
      +box('Level messages',renderTemplates([['levelUp','Level-up message'],['level','/level command message']]));
  }
  function confessionList(name){
    const items=state[name], isPending=name==='pending';
    const displayed=expanded[name]?items:items.slice(0,3);
    const card=displayed.map(e=>
      '<article class="cx-card"><div class="cx-card-head"><div><strong class="cx-card-title">'+esc((isPending?'Confession ':'Appeal ')+e.id.slice(-6))+'</strong>'+
        '<div class="cx-card-subtitle">'+esc(e.message)+'</div></div><div class="cx-card-actions">'+
        btn(isPending?'approve':'accept-appeal',isPending?'Approve':'Accept','data-id="'+esc(e.id)+'"','cx-primary')+
        btn(isPending?'deny':'deny-appeal','Deny','data-id="'+esc(e.id)+'"')+
        (isPending?btn('deny-reason','Deny with reason','data-id="'+esc(e.id)+'"')+
        btn('confess-ban','Confession ban','data-id="'+esc(e.id)+'"','cx-danger')+
        btn('report-confession','Report','data-id="'+esc(e.id)+'"'):'')+'</div></div></article>').join('');
    const label=isPending?'Pending confessions':'Pending appeals';
    const actions=btn(isPending?'add-confession':'add-appeal',isPending?'+ Add confession':'+ Add appeal','','cx-primary');
    return box(label,(items.length?'<div class="cx-card-list">'+card+'</div>':empty('No '+label.toLowerCase()+'.'))+
      (items.length>3?'<div class="cx-toolbar" style="margin-top:12px">'+btn('expand-list',expanded[name]?'Show fewer':'Show all '+items.length,'data-kind="'+name+'"')+'</div>':'') ,actions)+
      (state.reviewed.length?box('Review history','<div class="cx-card-list">'+state.reviewed.slice(0,10).map(e=>
        group(e.result,(e.message||'').slice(0,140))).join('')+'</div>'):'');
  }
  function anon(){
    if(currentTab==='pending'||currentTab==='appeals')return confessionList(currentTab);
    if(currentTab==='templates')return box('Confession messages',renderTemplates(templateNames));
    return box('Confession settings',toggle('autoMod','Apply auto moderation')+
      settingPair(area('confessionChannels','Confession channels','Channel names or IDs'),area('reviewChannels','Review channels','Channel names or IDs'))+
      toggle('anonymousReview','Anonymous review','Restrict identifying details to administrators'));
  }
  function checkin(){
    if(currentTab==='ignored'){
      const cards=state.ignored.length?state.ignored.map(e=>'<div class="cx-card"><div class="cx-card-head"><div><strong class="cx-card-title">'+esc(e.member)+'</strong>'+
        '<div class="cx-card-subtitle">'+esc(e.reason||'Ignored for check-ins')+'</div></div>'+
        btn('remove-ignored','Remove','data-id="'+esc(e.id)+'"','cx-danger')+'</div></div>').join(''):empty('No ignored members.');
      return box('Ignored user lists','<div class="cx-card-list">'+cards+'</div>',btn('add-ignored','+ Add member','','cx-primary'));
    }
    const cards=state.lists.length?state.lists.map(e=>
      '<article class="cx-card"><div class="cx-card-head"><div><strong class="cx-card-title">'+esc(e.name)+'</strong>'+
      '<div class="cx-card-subtitle">Watching '+esc(e.role||'No role selected')+'</div></div>'+
      '<div class="cx-card-actions">'+btn('edit-checkin','Edit','data-id="'+esc(e.id)+'"')+
      btn('remove-checkin','Remove','data-id="'+esc(e.id)+'"','cx-danger')+'</div></div>'+
      '<div class="cx-meta">'+chip('Notify: '+(e.times||'No times'))+chip('Ignore after '+e.threshold+' ignored commands')+
      chip((e.members||'').split(',').filter(Boolean).length+' listed members')+'</div>'+
      (e.message?'<div class="cx-message-preview" style="margin-top:13px">'+esc(e.message)+'</div>':'')+
      '<div class="cx-card-subtitle" style="margin-top:12px">Members: '+esc(e.members||'No members listed')+
      '<br>Blacklisted roles: '+esc(e.blacklistRoles||'None')+'<br>Blacklisted members: '+esc(e.blacklistMembers||'None')+'</div></article>').join(''):
      empty('No check-in lists configured.');
    return box('Check-in lists','<div class="cx-card-list">'+cards+'</div>',btn('add-checkin','+ Add list','','cx-primary'))+
      box('Check-in command','<div class="cx-note"><strong>/checkin [list] [user] [done/notdone]</strong>'+
      '<p>Choose a list or use the default top list, select a member, and set the check-in status.</p></div>');
  }
  function translator(){
    if(currentTab==='messages')return box('Translation message',renderTemplates([['translated','Translated message']])+
      '<div class="cx-note" style="margin-top:14px">Translated messages support Change (edit or delete your own message) and Translate (choose a language). Auto moderation applies to edits.</div>');
    if(currentTab==='recent'){
      return box('Recent translations',state.recent.length?
        '<div class="cx-card-list">'+state.recent.map(e=>group(e.language,e.text)).join('')+'</div>':empty('No translations recorded.'));
    }
    return box('Translation settings',toggle('autoMod','Apply auto moderation to translations')+
      settingPair(select('model','AI model',[['Default','Default'],['Fast','Fast'],['Advanced','Advanced']]),
        field('language','Translate to','text','English'))+
      area('triggers','Translator triggers','!t, !translate','Separate triggers with commas')+
      toggle('personal','Enable /translate [language] [text]')+
      toggle('personalButton','Show translation command button')+
      toggle('changeButton','Show Change button','The original message author can edit or delete their message')+
      toggle('translateButton','Show Translate button','Readers can choose a language'));
  }
  function rules(){
    const profile=feature==='profile-checker',items=state.rules;
    const rulesHTML=items.length?items.map(rule=>{
      const actions=Array.isArray(rule.actions)?rule.actions:[];
      return '<article class="cx-card"><div class="cx-card-head"><div><strong class="cx-card-title">'+esc(rule.trigger)+'</strong>'+
        '<div class="cx-card-subtitle">'+esc(rule.severity)+' severity'+(rule.words?' · Keywords: '+esc(rule.words):'')+'</div></div>'+
        '<div class="cx-card-actions">'+btn('edit-rule','Edit trigger','data-id="'+esc(rule.id)+'"')+
        btn('remove-rule','Remove','data-id="'+esc(rule.id)+'"','cx-danger')+'</div></div>'+
        '<div class="cx-card-list" style="margin-top:13px">'+(actions.length?actions.map(action=>
          '<div class="cx-card"><div class="cx-card-head"><div><strong class="cx-card-title">'+esc(action.kind)+'</strong>'+
          '<div class="cx-card-subtitle">'+esc(action.details||'')+(action.delay?' · '+esc(action.delay)+'s delay':'')+'</div></div>'+
          '<div class="cx-card-actions">'+btn('edit-rule-action','Edit','data-id="'+esc(rule.id)+'" data-aid="'+esc(action.id)+'"')+
          btn('remove-rule-action','Remove','data-id="'+esc(rule.id)+'" data-aid="'+esc(action.id)+'"','cx-danger')+'</div></div></div>').join(''):
          empty('No actions added to this condition.'))+'</div>'+
          '<div class="cx-toolbar" style="margin-top:12px">'+btn('add-rule-action','+ Add action','data-id="'+esc(rule.id)+'"')+'</div></article>';
    }).join(''):empty(profile?'No profile conditions added.':'No AI moderation conditions added.');
    return box(profile?'Profile conditions':'AI moderation conditions',
      '<div class="cx-card-list">'+rulesHTML+'</div>',
      btn('add-rule','+ Add condition','','cx-primary'));
  }
  function body(){
    if(feature==='levels')return levels();
    if(feature==='anonymous-messages')return anon();
    if(feature==='check-in-reminders')return checkin();
    if(feature==='translator')return translator();
    return rules();
  }
  function replaceItem(collection,identifier,fields) {
    const index=collection.findIndex(item=>item.id===identifier);
    if(index<0)return false;
    collection[index]={...collection[index],...fields};return true;
  }
  function editReward(identifier) {
    const old=state.rewards.find(x=>x.id===identifier)||{level:1,xp:100,role:''};
    modal(identifier?'Edit level reward':'Add level reward',[
      {key:'level',label:'Level',type:'number',required:true},
      {key:'xp',label:'XP required',type:'number',required:true},
      {key:'role',label:'Reward role'}
    ],old,data=>{
      if(data.level<1){notify('Level must be at least 1.');return false;}
      if(state.rewards.some(item=>item.level===data.level&&item.id!==identifier)){
        notify('That level already exists.');return false;
      }
      if(identifier)replaceItem(state.rewards,identifier,data);
      else state.rewards.push({...data,id:id()});
      state.rewards.sort((a,b)=>a.level-b.level);
    });
  }
  function editCheckin(identifier){
    const old=state.lists.find(x=>x.id===identifier)||{
      name:'',role:'',members:'',blacklistRoles:'',blacklistMembers:'',threshold:3,times:'09:00',message:'{user}, please complete your check-in.'
    };
    modal(identifier?'Edit check-in list':'New check-in list',[
      {key:'name',label:'List name',required:true},{key:'role',label:'Role to watch',required:true},
      {key:'members',label:'Members currently on the list (comma-separated)',type:'textarea'},
      {key:'blacklistRoles',label:'Excluded roles',type:'textarea'},
      {key:'blacklistMembers',label:'Excluded members',type:'textarea'},
      {key:'threshold',label:'Ignore after this many /checkin ignored commands',type:'number'},
      {key:'times',label:'Notification times (HH:MM, comma-separated)',required:true},
      {key:'message',label:'Notification message',type:'textarea',required:true}
    ],old,data=>{
      if(!data.name||!data.role||!data.message){notify('Enter a list name, role, and message.');return false;}
      const times=data.times.split(',').map(x=>x.trim());
      if(!times.length||times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))){notify('Use times such as 09:00, 20:30.');return false;}
      if(identifier)replaceItem(state.lists,identifier,data);else state.lists.push({...data,id:id()});
    });
  }
  function editRule(identifier){
    const old=state.rules.find(x=>x.id===identifier)||{
      trigger:(feature==='ai-moderation'?triggersAI:triggersProfile)[0],severity:'medium',words:'',actions:[]
    };
    const choices=(feature==='ai-moderation'?triggersAI:triggersProfile).map(x=>[x,x]);
    modal(identifier?'Edit condition':'New condition',[
      {key:'trigger',label:'Trigger',type:'select',items:choices},
      {key:'severity',label:'Severity',type:'select',items:severity},
      {key:'words',label:'Trigger words (for text-based checks)',type:'textarea'}
    ],old,data=>{
      if(identifier)replaceItem(state.rules,identifier,data);
      else state.rules.push({...data,id:id(),actions:[]});
    });
  }
  function editRuleAction(ruleId,actionId){
    const rule=state.rules.find(x=>x.id===ruleId);if(!rule)return;
    const old=rule.actions.find(x=>x.id===actionId)||{kind:kinds[0],details:'',delay:0};
    modal(actionId?'Edit action':'New action',[
      {key:'kind',label:'Action',type:'select',items:kinds.map(x=>[x,x])},
      {key:'details',label:'Channel, role, template, reason, or action settings',type:'textarea'},
      {key:'delay',label:'Delay (seconds)',type:'number'}
    ],old,data=>{
      if(actionId)replaceItem(rule.actions,actionId,data);
      else rule.actions.push({...data,id:id()});
    });
  }
  function review(name,identifier,result){
    const list=state[name];const index=list.findIndex(e=>e.id===identifier);if(index<0)return;
    const item=list.splice(index,1)[0];
    state.reviewed.unshift({...item,result,at:Date.now()});
    render();notify(result+'.');
  }
  $('cx-tabs').addEventListener('click',event=>{
    const button=event.target.closest('[data-cx-tab]');
    if(button){currentTab=button.dataset.cxTab;render();}
  });
  $('cx-content').addEventListener('input',event=>updateSetting(event.target));
  $('cx-content').addEventListener('change',event=>updateSetting(event.target));
  $('cx-content').addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    const action=button.dataset.action,identifier=button.dataset.id;
    if(action==='edit-template'){editTemplate(button.dataset.key,button.dataset.title);return;}
    if(action==='add-reward'||action==='edit-reward'){editReward(identifier);return;}
    if(action==='remove-reward'){state.rewards=state.rewards.filter(x=>x.id!==identifier);render();return;}
    if(action==='add-checkin'||action==='edit-checkin'){editCheckin(identifier);return;}
    if(action==='remove-checkin'){state.lists=state.lists.filter(x=>x.id!==identifier);render();return;}
    if(action==='add-ignored'){
      modal('Ignore member',[{key:'member',label:'Member / member ID',required:true},{key:'reason',label:'Reason'}],{},data=>{
        if(!data.member){notify('Enter a member.');return false;}
        state.ignored.push({...data,id:id()});
      });return;
    }
    if(action==='remove-ignored'){state.ignored=state.ignored.filter(x=>x.id!==identifier);render();return;}
    if(action==='add-rule'||action==='edit-rule'){editRule(identifier);return;}
    if(action==='remove-rule'){state.rules=state.rules.filter(x=>x.id!==identifier);render();return;}
    if(action==='add-rule-action'||action==='edit-rule-action'){editRuleAction(identifier,button.dataset.aid);return;}
    if(action==='remove-rule-action'){
      const rule=state.rules.find(x=>x.id===identifier);
      if(rule)rule.actions=rule.actions.filter(x=>x.id!==button.dataset.aid);
      render();return;
    }
    if(action==='expand-list'){expanded[button.dataset.kind]=!expanded[button.dataset.kind];render();return;}
    if(action==='add-confession'||action==='add-appeal'){
      const pending=action==='add-confession';
      modal(pending?'New confession':'New appeal',[
        {key:'message',label:pending?'Confession':'Appeal text',type:'textarea',required:true}
      ],{},data=>{
        if(!data.message){notify('Enter a message.');return false;}
        state[pending?'pending':'appeals'].unshift({...data,id:id(),at:Date.now()});
      });return;
    }
    if(action==='approve'){review('pending',identifier,'Approved');return;}
    if(action==='deny'){review('pending',identifier,'Denied');return;}
    if(action==='confess-ban'){review('pending',identifier,'Confession banned');return;}
    if(action==='report-confession'){review('pending',identifier,'Reported to moderators');return;}
    if(action==='accept-appeal'){review('appeals',identifier,'Appeal accepted');return;}
    if(action==='deny-appeal'){review('appeals',identifier,'Appeal denied');return;}
    if(action==='deny-reason'){
      modal('Deny with reason',[{key:'reason',label:'Reason',type:'textarea',required:true}],{},data=>{
        if(!data.reason){notify('Enter a reason.');return false;}
        review('pending',identifier,'Denied: '+data.reason);
      });return;
    }
  });
  $('cx-save').addEventListener('click',()=>{
    try{localStorage.setItem(key,JSON.stringify(state));saved=clone(state);mark();notify('Settings saved.');}
    catch{notify('Unable to save settings.');}
  });
  $('cx-reset').addEventListener('click',()=>{state=clone(saved);render();notify('Changes reset.');});
  render();
})();
