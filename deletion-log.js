(() => {
  'use strict';
  const key='next-step-deletion-log-v1';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clean=value=>String(value??'').trim();
  const limit=5000;
  const pageSize=20;
  let records=[];
  let activePage=1;
  let filters={query:'',type:'all',range:'all',channel:'all'};
  let root=null;
  let statusTimer;
  const date=(value)=>{
    if(typeof value==='number')return value<1e11?value*1000:value;
    const parsed=Date.parse(value||'');
    return Number.isFinite(parsed)?parsed:NaN;
  };
  const typeOf=(value)=>{
    const kind=clean(value).toLowerCase();
    return kind==='bulk'||kind==='mass'||kind==='multiple'?'bulk':'single';
  };
  function normalize(entry,index){
    if(!entry || typeof entry!=='object'||Array.isArray(entry))return null;
    const timestamp=date(entry.deletedAt??entry.timestamp??entry.time??entry.createdAt??entry.date);
    if(!Number.isFinite(timestamp)||timestamp<=0 || timestamp>Date.now()+60000)return null;
    const count=Number(entry.count??entry.messageCount??entry.deletedCount??1);
    const messageId=clean(entry.messageId??entry.message_id??'').slice(0,120);
    const id=clean(entry.id??entry.eventId??(messageId||'deleted')+'-'+timestamp+'-'+index).slice(0,180);
    const author=clean(entry.author??entry.user??entry.member??entry.authorName??'Unknown');
    const executor=clean(entry.deletedBy??entry.executor??entry.moderator??entry.actor??'Unknown');
    const channel=clean(entry.channel??entry.channelName??entry.channelId??'Unknown');
    const content=String(entry.content??entry.message??entry.messageContent??'').slice(0,10000);
    const reason=String(entry.reason??'').slice(0,2000);
    const rawAttachments=Array.isArray(entry.attachments)?entry.attachments:[];
    const attachments=rawAttachments.slice(0,20).map(a=>clean(typeof a==='string'?a:a?.url??a?.filename)).filter(Boolean);
    const deducedCount=Number.isInteger(count)&&count>=1?Math.min(count,100000):1;
    const type=typeOf(entry.type??entry.eventType??(deducedCount>1?'bulk':'single'));
    return {id,deletedAt:timestamp,type,count:deducedCount,author:author.slice(0,150),
      authorId:clean(entry.authorId??entry.userId??'').slice(0,120),
      deletedBy:executor.slice(0,150),executorId:clean(entry.executorId??'').slice(0,120),
      channel:channel.slice(0,160),messageId,content,reason,attachments};
  }
  function read(){
    try{
      const saved=JSON.parse(localStorage.getItem(key)||'[]');
      const values=Array.isArray(saved)?saved:Array.isArray(saved?.entries)?saved.entries:[];
      return values.map(normalize).filter(Boolean).sort((a,b)=>b.deletedAt-a.deletedAt).slice(0,limit);
    }catch{return [];}
  }
  records=read();
  function persist(){
    try{localStorage.setItem(key,JSON.stringify(records));return true;}
    catch{status('Could not save log records.','error');return false;}
  }
  function clock(time){
    try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(time));}
    catch{return 'Unknown date';}
  }
  function label(name,value){
    return '<div class="dl-detail"><dt>'+esc(name)+'</dt><dd>'+esc(value||'—')+'</dd></div>';
  }
  function option(value,title){return '<option value="'+esc(value)+'">'+esc(title)+'</option>';}
  function render(){
    const dayAgo=Date.now()-86400000;
    const channels=[...new Set(records.map(x=>x.channel))].sort((a,b)=>a.localeCompare(b));
    return '<div class="dl-page" data-dl-page>'+
      '<div class="dl-stats">'+
        '<div class="dl-stat"><small>Deletion events</small><strong id="dl-total">'+records.length.toLocaleString()+'</strong><span>All recorded events</span></div>'+
        '<div class="dl-stat"><small>Last 24 hours</small><strong id="dl-today">'+records.filter(x=>x.deletedAt>=dayAgo).length.toLocaleString()+'</strong><span>Recent deletion events</span></div>'+
        '<div class="dl-stat"><small>Bulk deletions</small><strong id="dl-bulk">'+records.filter(x=>x.type==='bulk').length.toLocaleString()+'</strong><span>Events affecting multiple messages</span></div>'+
      '</div><section class="dl-panel" aria-labelledby="dl-title">'+
      '<div class="dl-panel-head"><div><h2 id="dl-title">Deleted messages</h2><p>Review message removals and associated audit details.</p></div>'+
      '<div class="dl-panel-actions">'+
      '<button type="button" class="dl-btn dl-primary" data-dl-import>Import JSON</button>'+
      '<input id="dl-file" type="file" accept=".json,application/json" hidden aria-label="Import deletion log JSON">'+
      '<button type="button" class="dl-btn" data-dl-export="json"'+(!records.length?' disabled':'')+'>Export JSON</button>'+
      '<button type="button" class="dl-btn" data-dl-export="csv"'+(!records.length?' disabled':'')+'>Export CSV</button>'+
      '<button type="button" class="dl-btn dl-danger" data-dl-clear'+(!records.length?' disabled':'')+'>Clear</button>'+
      '</div></div>'+
      '<div class="dl-filters">'+
        '<label class="dl-filter"><span>Search logs</span><input id="dl-search" type="search" placeholder="Member, channel, executor, message..." value="'+esc(filters.query)+'" autocomplete="off"></label>'+
        '<label class="dl-filter"><span>Event type</span><select id="dl-type">'+option('all','All events')+option('single','Single message')+option('bulk','Bulk deletion')+'</select></label>'+
        '<label class="dl-filter"><span>Date</span><select id="dl-range">'+option('all','All time')+option('day','Last 24 hours')+option('week','Last 7 days')+option('month','Last 30 days')+'</select></label>'+
        '<label class="dl-filter"><span>Channel</span><select id="dl-channel">'+option('all','All channels')+channels.map(c=>option(c,c)).join('')+'</select></label>'+
      '</div>'+
      '<div class="dl-result-count" id="dl-results" role="status" aria-live="polite"></div>'+
      '<div class="dl-table-wrap" id="dl-data"></div>'+
      '<div class="dl-pagination" id="dl-pagination"></div>'+
      '<p class="dl-status" id="dl-status" role="status" aria-live="polite" hidden></p>'+
      '</section>'+
      '<dialog class="dl-modal" id="dl-dialog" aria-labelledby="dl-detail-title"><div class="dl-modal-header"><h2 id="dl-detail-title">Deletion details</h2>'+
      '<button type="button" data-dl-close aria-label="Close details">×</button></div><dl id="dl-details" class="dl-details"></dl>'+
      '<div class="dl-modal-actions"><button class="dl-btn" type="button" data-dl-close>Close</button></div></dialog></div>';
  }
  function status(message,kind='success'){
    const el=root?.querySelector('#dl-status');
    if(!el)return;
    el.textContent=message;
    el.hidden=false;
    el.classList.toggle('dl-error',kind==='error');
    clearTimeout(statusTimer);
    statusTimer=setTimeout(()=>{if(el.isConnected)el.hidden=true;},4600);
  }
  function filtered(){
    const now=Date.now();
    const cutoffs={day:now-86400000,week:now-7*86400000,month:now-30*86400000};
    const query=filters.query.toLowerCase();
    return records.filter(e=>{
      if(filters.type!=='all'&&e.type!==filters.type)return false;
      if(filters.range!=='all'&&e.deletedAt<cutoffs[filters.range])return false;
      if(filters.channel!=='all'&&e.channel!==filters.channel)return false;
      return !query||[e.id,e.messageId,e.author,e.authorId,e.deletedBy,e.executorId,e.channel,e.content,e.reason]
        .some(v=>String(v).toLowerCase().includes(query));
    });
  }
  function fill(){
    const hits=filtered();
    const pages=Math.max(1,Math.ceil(hits.length/pageSize));
    activePage=Math.min(activePage,pages);
    root.querySelector('#dl-results').textContent=hits.length.toLocaleString()+' '+(hits.length===1?'event':'events')+' found';
    const container=root.querySelector('#dl-data');
    if(!hits.length){
      container.innerHTML='<div class="dl-empty"><span class="dl-empty-icon" aria-hidden="true">▤</span>'+
        '<strong>'+(records.length?'No matching deletions':'No deletion records yet')+'</strong><p>'+
        (records.length?'Try changing your search or filters.':'Imported deletion records will appear here with the message, author, channel, and deletion details.')+'</p></div>';
    }else{
      const rows=hits.slice((activePage-1)*pageSize,activePage*pageSize).map(e=>
        '<tr><td>'+esc(clock(e.deletedAt))+'</td>'+
        '<td><span class="dl-type'+(e.type==='bulk'?' bulk':'')+'">'+(e.type==='bulk'?'Bulk · '+e.count:'Single')+'</span></td>'+
        '<td><div class="dl-user"><strong>'+esc(e.author)+'</strong>'+(e.authorId?'<small>'+esc(e.authorId)+'</small>':'')+'</div></td>'+
        '<td>'+esc(e.channel)+'</td><td>'+esc(e.deletedBy)+'</td>'+
        '<td class="dl-truncate" title="'+esc(e.content)+'">'+esc(e.content||'—')+'</td>'+
        '<td><button type="button" class="dl-btn" data-dl-open="'+esc(e.id)+'">Details</button></td></tr>').join('');
      container.innerHTML='<table class="dl-table"><thead><tr><th>Deleted at</th><th>Type</th><th>Author</th><th>Channel</th><th>Deleted by</th><th>Content</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
    }
    const pagination=root.querySelector('#dl-pagination');
    pagination.innerHTML='<span>Page '+activePage+' of '+pages+'</span><div class="dl-pagination-actions">'+
      '<button class="dl-btn" type="button" data-dl-page="-1"'+(activePage===1?' disabled':'')+'>Previous</button>'+
      '<button class="dl-btn" type="button" data-dl-page="1"'+(activePage>=pages?' disabled':'')+'>Next</button></div>';
  }
  function details(id){
    const record=records.find(e=>e.id===id);
    if(!record)return;
    const container=root.querySelector('#dl-details');
    container.innerHTML=label('Deleted at',clock(record.deletedAt))+label('Event type',record.type==='bulk'?'Bulk deletion':'Single message')+
      label('Messages deleted',record.count)+label('Channel',record.channel)+
      label('Message author',record.author)+label('Author ID',record.authorId)+
      label('Deleted by',record.deletedBy)+label('Executor ID',record.executorId)+
      label('Message ID',record.messageId)+label('Event ID',record.id)+
      label('Reason',record.reason)+
      '<div class="dl-detail wide"><dt>Message content</dt><dd class="dl-body">'+esc(record.content||'No message content recorded')+'</dd></div>'+
      '<div class="dl-detail wide"><dt>Attachments</dt><dd class="dl-body">'+
      (record.attachments.length?record.attachments.map(esc).join('\n'):'None recorded')+'</dd></div>';
    root.querySelector('#dl-dialog').showModal();
  }
  function quoteCSV(value){return '"'+String(value??'').replace(/"/g,'""')+'"';}
  function exportData(kind){
    if(!records.length)return;
    let contents,mime,filename;
    const stamp=new Date().toISOString().slice(0,10);
    if(kind==='json'){
      filename='deletion-log-'+stamp+'.json';
      contents=JSON.stringify({entries:records},null,2);
      mime='application/json;charset=utf-8';
    }else{
      filename='deletion-log-'+stamp+'.csv';
      const fields=['id','deletedAt','type','count','author','authorId','deletedBy','executorId','channel','messageId','content','reason','attachments'];
      contents=[fields.map(quoteCSV).join(','),...records.map(e=>fields.map(f=>quoteCSV(f==='deletedAt'?new Date(e.deletedAt).toISOString():f==='attachments'?e.attachments.join(' | '):e[f])).join(','))].join('\r\n');
      mime='text/csv;charset=utf-8';
    }
    const href=URL.createObjectURL(new Blob([contents],{type:mime}));
    const link=document.createElement('a');
    link.href=href;link.download=filename;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),60000);
  }
  async function importData(file){
    if(!file)return;
    if(file.size>5*1024*1024){status('Select a JSON file smaller than 5 MB.','error');return;}
    try{
      const parsed=JSON.parse(await file.text());
      const entries=Array.isArray(parsed)?parsed:
        Array.isArray(parsed?.entries)?parsed.entries:
        Array.isArray(parsed?.events)?parsed.events:
        Array.isArray(parsed?.logs)?parsed.logs:null;
      if(!entries)throw Error('JSON must contain an entries, events, or logs array.');
      if(entries.length>limit)throw Error('The file contains more than 5,000 entries.');
      const normalized=entries.map(normalize).filter(Boolean);
      if(entries.length && !normalized.length)throw Error('No valid deletion records found. Each entry needs a deletion timestamp.');
      const map=new Map(records.map(e=>[e.id,e]));
      for(const e of normalized)map.set(e.id,e);
      const next=[...map.values()].sort((a,b)=>b.deletedAt-a.deletedAt).slice(0,limit);
      const prior=records;
      records=next;
      if(!persist()){records=prior;return;}
      filters={query:'',type:'all',range:'all',channel:'all'};
      activePage=1;
      refresh();
      status('Imported '+normalized.length.toLocaleString()+' deletion '+(normalized.length===1?'record':'records')+'.');
    }catch(error){status(error.message||'Could not read the JSON file.','error');}
  }
  function refresh(){
    if(!root?.isConnected)return;
    const holder=document.createElement('div');
    holder.innerHTML=render();
    const replacement=holder.firstElementChild;
    root.replaceWith(replacement);
    bind(replacement);
  }
  function bind(element){
    root=element.querySelector('[data-dl-page]')||element;
    if(!root.matches('[data-dl-page]'))return;
    const search=root.querySelector('#dl-search');
    const type=root.querySelector('#dl-type');
    const range=root.querySelector('#dl-range');
    const channel=root.querySelector('#dl-channel');
    type.value=filters.type;range.value=filters.range;
    if([...channel.options].some(x=>x.value===filters.channel))channel.value=filters.channel;
    else {filters.channel='all';channel.value='all';}
    search.value=filters.query;
    for(const [element,name] of [[search,'query'],[type,'type'],[range,'range'],[channel,'channel']]){
      element.addEventListener(name==='query'?'input':'change',()=>{
        filters[name]=element.value;activePage=1;fill();
      });
    }
    const file=root.querySelector('#dl-file');
    root.querySelector('[data-dl-import]').addEventListener('click',()=>file.click());
    file.addEventListener('change',async()=>{await importData(file.files?.[0]);file.value='';});
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button)return;
      if(button.hasAttribute('data-dl-open')){details(button.dataset.dlOpen);return;}
      if(button.hasAttribute('data-dl-page')){activePage+=Number(button.dataset.dlPage);fill();return;}
      if(button.hasAttribute('data-dl-export')){exportData(button.dataset.dlExport);return;}
      if(button.hasAttribute('data-dl-close')){root.querySelector('#dl-dialog').close();return;}
      if(button.hasAttribute('data-dl-clear')){
        if(!records.length||!confirm('Clear all imported deletion records?'))return;
        const prior=records;records=[];
        if(!persist()){records=prior;return;}
        filters={query:'',type:'all',range:'all',channel:'all'};
        activePage=1;refresh();status('Deletion log cleared.');
      }
    });
    fill();
  }
  window.NextStepDeletionLog={render,bind};
})();
