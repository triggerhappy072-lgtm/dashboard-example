(() => {
  'use strict';
  const page=document.querySelector('.ap-page');
  if(!page)return;
  const $=id=>document.getElementById(id);
  const storageKey='next-step-appearance-v1';
  const defaults={
    name:'Next Step',
    avatar:'',
    banner:'',
    status:'online',
    customStatus:"Ready for what's next.",
    activityType:'Playing',
    activityText:'Helping your server grow',
    about:'Helping communities take the next step.'
  };
  const keys=Object.keys(defaults);
  const fieldLabels={name:'Bot name',avatar:'Avatar',banner:'Banner',status:'Status',customStatus:'Custom status',activity:'Activity',about:'About Me'};
  const descriptions={
    name:'Set the display name shown on your bot’s profile.',
    avatar:'Choose the profile image that appears beside your bot’s name.',
    banner:'Change the image behind the top of the profile.',
    status:'Choose how the bot appears in Discord.',
    customStatus:'Set the short message shown next to the avatar.',
    activity:'Choose an activity type and what your bot is doing.',
    about:'Write the description shown in your bot’s About Me section.'
  };
  const statusLabels={online:'Online',idle:'Idle',dnd:'Do Not Disturb',invisible:'Invisible'};
  const activities=['None','Playing','Watching','Listening','Competing'];
  const copy=object=>JSON.parse(JSON.stringify(object));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeImage=value=>value===''||/^https?:\/\/[^ ]+/i.test(value)||/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value);
  function load(){
    try{
      const stored=JSON.parse(localStorage.getItem(storageKey)||'null');
      if(!stored||typeof stored!=='object'||Array.isArray(stored))return copy(defaults);
      const result=copy(defaults);
      for(const key of keys){
        if(typeof stored[key]==='string')result[key]=stored[key].slice(0,key==='avatar'||key==='banner'?2800000:600);
      }
      if(!Object.hasOwn(statusLabels,result.status))result.status='online';
      if(!activities.includes(result.activityType))result.activityType='None';
      if(!safeImage(result.avatar))result.avatar='';
      if(!safeImage(result.banner))result.banner='';
      return result;
    }catch{return copy(defaults);}
  }
  let saved=load();
  let draft=copy(saved);
  let active='name';
  let toastTimer;
  function notify(message){
    const toast=$('ap-toast');toast.textContent=message;toast.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,3200);
  }
  function short(value,max=220){
    const display=String(value??'').trim();
    return display.length>max?display.slice(0,max)+'…':display;
  }
  function currentValue(field){
    if(field==='activity'){
      return draft.activityType==='None'?'None':draft.activityType+(draft.activityText?' · '+draft.activityText:'');
    }
    if(field==='status')return statusLabels[draft.status];
    if(field==='avatar'||field==='banner')return draft[field]?'Custom image':'Default artwork';
    return draft[field]||'Empty';
  }
  function drawImage(type,value){
    const img=$(type==='banner'?'ap-banner-img':'ap-avatar-img');
    const fallback=$(type==='banner'?'ap-banner-design':'ap-avatar-initials');
    if(!value){img.hidden=true;img.removeAttribute('src');fallback.hidden=false;return;}
    img.onload=()=>{if(img.getAttribute('src')===value){img.hidden=false;fallback.hidden=true;}};
    img.onerror=()=>{if(img.getAttribute('src')===value){img.hidden=true;fallback.hidden=false;}};
    img.hidden=true;fallback.hidden=false;
    if(img.getAttribute('src')!==value)img.src=value;
    else if(img.complete&&img.naturalWidth){img.hidden=false;fallback.hidden=true;}
  }
  function renderPreview(){
    $('ap-name-text').textContent=draft.name||'Next Step';
    $('ap-avatar-initials').textContent=(draft.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('')||'NS').toUpperCase();
    $('ap-handle-text').textContent='nextstep';
    $('ap-status-bubble-text').textContent=draft.customStatus||'Set custom status';
    $('ap-status-text').textContent=statusLabels[draft.status]||'Online';
    $('ap-presence-dot').className='ap-presence-dot '+draft.status;
    $('ap-activity-kind').textContent=draft.activityType==='None'?'No activity':draft.activityType;
    $('ap-activity-text').textContent=draft.activityType==='None'?'Select to add an activity':(draft.activityText||'Set activity text');
    $('ap-about-text').textContent=draft.about||'Add an About Me description';
    drawImage('banner',draft.banner);
    drawImage('avatar',draft.avatar);
    document.querySelectorAll('[data-ap-edit]').forEach(button=>{
      const isActive=button.dataset.apEdit===active;
      button.classList.toggle('ap-selected',isActive);
      if(button.closest('#ap-quick-grid'))button.setAttribute('aria-pressed',String(isActive));
    });
  }
  function dirty(){
    $('ap-savebar').hidden=JSON.stringify(saved)===JSON.stringify(draft);
  }
  const input=(label,name,value,opts={})=>
    '<label class="ap-field"><span>'+esc(label)+'</span><input name="'+esc(name)+'" type="'+esc(opts.type||'text')+
    '" value="'+esc(value)+'" maxlength="'+(opts.max||180)+'" placeholder="'+esc(opts.placeholder||'')+'"'+(opts.required?' required':'')+'>'+
    (opts.help?'<small>'+esc(opts.help)+'</small>':'')+'</label>';
  function renderEditor(){
    $('ap-editor-heading').textContent=fieldLabels[active];
    $('ap-editor-description').textContent=descriptions[active];
    $('ap-current-value').textContent=short(currentValue(active));
    let html='';
    if(active==='name'){
      html=input('Display name','name',draft.name,{max:80,required:true,placeholder:'Next Step'});
    }else if(active==='avatar'||active==='banner'){
      const name=active;
      html=input(name==='avatar'?'Avatar image URL':'Banner image URL','imageUrl',
        draft[name].startsWith('data:')?'':draft[name],
        {max:2000,placeholder:'https://example.com/image.png',help:'Paste an image URL, or upload an image below.'});
      html+='<label class="ap-field"><span>Upload image</span><input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small>'+
        (name==='avatar'?'Square images work best.':'A wide image works best for banners.')+
        ' PNG, JPG, WebP, or GIF — up to 8 MB.</small></label>';
      if(draft[name])html+='<button type="button" class="ap-secondary" data-ap-remove="'+name+'" style="margin-bottom:14px">Remove image</button>';
    }else if(active==='status'){
      html='<label class="ap-field"><span>Presence</span><select name="status">'+
        Object.entries(statusLabels).map(([key,label])=>'<option value="'+key+'"'+(draft.status===key?' selected':'')+'>'+label+'</option>').join('')+'</select></label>';
    }else if(active==='customStatus'){
      html=input('Custom status','customStatus',draft.customStatus,{max:128,placeholder:'What is your bot up to?'});
    }else if(active==='activity'){
      html='<label class="ap-field"><span>Activity type</span><select name="activityType">'+
        activities.map(value=>'<option value="'+value+'"'+(value===draft.activityType?' selected':'')+'>'+value+'</option>').join('')+'</select></label>';
      html+=input('Activity text','activityText',draft.activityText,{max:128,placeholder:'Helping your server grow'});
    }else if(active==='about'){
      html='<label class="ap-field"><span>About Me</span><textarea name="about" rows="5" maxlength="190" placeholder="Introduce your bot">'+esc(draft.about)+'</textarea><small>Up to 190 characters.</small></label>';
    }
    $('ap-fields').innerHTML=html;
    const first=$('ap-fields').querySelector('input:not([type=file]),select,textarea');
    if(first)first.focus({preventScroll:true});
    renderPreview();dirty();
  }
  function selectField(field){
    if(!Object.hasOwn(fieldLabels,field))return;
    active=field;renderEditor();
  }
  async function processImage(file,field){
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Choose a PNG, JPG, WebP, or GIF image.');
    if(file.size>8*1024*1024)throw Error('Image must be smaller than 8 MB.');
    const src=URL.createObjectURL(file);
    try{
      const image=new Image();
      image.decoding='async';
      const loaded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Unable to read that image.'));});
      image.src=src;
      await loaded;
      const canvas=document.createElement('canvas');
      const width=field==='avatar'?320:1200;
      const height=field==='avatar'?320:440;
      canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');
      if(!context)throw Error('Image processing is unavailable.');
      const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight);
      const scaledW=image.naturalWidth*scale,scaledH=image.naturalHeight*scale;
      context.drawImage(image,(width-scaledW)/2,(height-scaledH)/2,scaledW,scaledH);
      const result=canvas.toDataURL('image/webp',.83);
      if(result.length>2800000)throw Error('Image is too large to save. Try a smaller image.');
      return result;
    }finally{URL.revokeObjectURL(src);}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-ap-edit]');
    if(button){selectField(button.dataset.apEdit);return;}
    const remove=event.target.closest('[data-ap-remove]');
    if(remove){
      draft[remove.dataset.apRemove]='';
      renderEditor();notify('Image removed from the preview.');
    }
  });
  $('ap-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget;
    const field=active;
    const value=name=>form.elements.namedItem(name)?.value??'';
    const applyButton=form.querySelector('[type=submit]');
    applyButton.disabled=true;
    try{
      if(field==='avatar'||field==='banner'){
        const file=form.elements.namedItem('imageFile').files[0];
        if(file)draft[field]=await processImage(file,field);
        else{
          const url=value('imageUrl').trim();
          if(url && !/^https?:\/\//i.test(url))throw Error('Use a valid http or https image URL.');
          if(url)draft[field]=url;
          else if(!draft[field].startsWith('data:'))draft[field]='';
        }
      }else if(field==='name'){
        const name=value('name').trim();
        if(!name)throw Error('Enter a bot name.');
        draft.name=name;
      }else if(field==='status'){
        draft.status=value('status');
      }else if(field==='customStatus'){
        draft.customStatus=value('customStatus').trim();
      }else if(field==='activity'){
        draft.activityType=value('activityType');
        draft.activityText=value('activityText').trim();
      }else if(field==='about'){
        draft.about=value('about').trim();
      }
      renderEditor();notify('Profile preview updated.');
    }catch(error){notify(error.message||'Could not update the profile.');}
    finally{applyButton.disabled=false;}
  });
  $('ap-field-reset').addEventListener('click',()=>{
    if(active==='activity'){draft.activityType=saved.activityType;draft.activityText=saved.activityText;}
    else draft[active]=saved[active];
    renderEditor();notify('Field reset to its last saved value.');
  });
  $('ap-save').addEventListener('click',()=>{
    try{
      localStorage.setItem(storageKey,JSON.stringify(draft));
      saved=copy(draft);dirty();notify('Appearance saved.');
    }catch{notify('Could not save appearance. Try a smaller image.');}
  });
  $('ap-reset').addEventListener('click',()=>{
    draft=copy(saved);renderEditor();notify('Unsaved changes discarded.');
  });
  renderEditor();
})();
