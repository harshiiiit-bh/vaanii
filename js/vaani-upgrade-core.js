/* VAANI 1000x Upgrade Core
   Non-invasive enhancement layer loaded after the main app. */
(function(){
  'use strict';
  if(window.__VAANI_UPGRADE_CORE__) return;
  window.__VAANI_UPGRADE_CORE__=true;

  const state={errors:0,rejections:0,resourceErrors:0,installPrompt:null,shortcutBuffer:'',shortcutTimer:null};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function getState(){
    try{return typeof State!=='undefined'?State:null}catch(e){return null}
  }
  function showRecovery(msg){
    const old=document.querySelector('.vu-recovered'); if(old) old.remove();
    const n=document.createElement('div');
    n.className='vu-recovered';
    n.innerHTML='<b aria-hidden="true">🛡️</b><span>'+esc(msg||'VAANI recovered from a small UI glitch.')+'</span>';
    document.body.appendChild(n);
    setTimeout(()=>n.remove(),4200);
  }
  function updateStatus(){
    const el=document.getElementById('vuStatus');
    if(!el)return;
    const offline=!navigator.onLine;
    el.classList.toggle('offline',offline);
    el.classList.toggle('warn',!offline && (state.errors||state.rejections));
    const label=offline?'Offline mode':(state.errors||state.rejections)?'Protected · '+(state.errors+state.rejections)+' issue'+((state.errors+state.rejections)===1?'':'s'):'System ready';
    el.querySelector('.vu-status-label').textContent=label;
  }
  function nav(name){
    if(typeof window.switchView==='function') window.switchView(name);
    closePalette();
  }
  function dailyChallenge(){
    try{
      const list=(typeof PYQ_ALL!=='undefined'&&Array.isArray(PYQ_ALL)) ? PYQ_ALL.slice() : [];
      for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
      const pool=list.slice(0,10);
      if(!pool.length){showRecovery('Daily Challenge is waiting for PYQ data to finish loading.');return}
      if(typeof window.switchView==='function') window.switchView('pyq');
      if(typeof window.pvStartSession==='function') window.pvStartSession('quiz',pool,{title:'Daily Challenge · '+new Date().toLocaleDateString('en-IN')});
    }catch(e){showRecovery('Daily Challenge could not start right now.')}
    closePalette();
  }
  function randomPyq(){
    try{
      const list=(typeof PYQ_ALL!=='undefined'&&Array.isArray(PYQ_ALL)) ? PYQ_ALL : [];
      if(!list.length){showRecovery('PYQ bank is not ready yet.');return}
      const q=list[Math.floor(Math.random()*list.length)];
      if(typeof window.switchView==='function') window.switchView('pyq');
      if(typeof window.pvStartSession==='function') window.pvStartSession('section',[q],{title:'Quick PYQ · '+((window.PYQ_EXAM_INFO&&PYQ_EXAM_INFO[q._exam]&&PYQ_EXAM_INFO[q._exam].short)||q._exam||'PYQ')+' '+(q.s||'')+' '+(q.y||'')});
    }catch(e){showRecovery('Quick PYQ could not start right now.')}
    closePalette();
  }
  function resume(){
    try{
      const s=getState();
      if(s && s.pyqContinue && typeof window.switchView==='function' && typeof window.pvResumeContinue==='function'){
        window.switchView('pyq'); window.pvResumeContinue(); closePalette(); return;
      }
      if(typeof window.jumpToContinue==='function'){window.jumpToContinue();closePalette();return}
      if(typeof window.switchView==='function') window.switchView('dashboard');
      closePalette();
    }catch(e){showRecovery('Nothing to resume yet.')}
  }
  function health(){
    const routes=[...document.querySelectorAll('.view')].map(v=>v.id.replace(/^view-/,'')).filter(Boolean);
    const broken=[...document.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0&&i.currentSrc).length;
    const scripts=[...document.scripts].filter(s=>s.src).length;
    const text='<div class="vu-health"><div class="vu-health-grid"><div class="vu-health-card"><b>'+routes.length+'</b><span>views discovered</span></div><div class="vu-health-card"><b>'+scripts+'</b><span>script assets</span></div><div class="vu-health-card"><b>'+broken+'</b><span>broken images now</span></div></div><div class="vu-health-note"><b>Bug shield:</b> '+state.errors+' JS error'+(state.errors===1?'':'s')+' and '+state.rejections+' rejected promise'+(state.rejections===1?'':'s')+' observed this session. '+(navigator.onLine?'Network online.':'Offline: cached/local features remain usable.')+'</div></div>';
    const body=document.getElementById('vuHealthBody'); if(body) body.innerHTML=text;
    document.getElementById('vuHealthPanel')?.removeAttribute('hidden');
  }

  const actions=[
    ['🎯','Daily Challenge','10 random PYQs · build a daily habit',dailyChallenge,'D'],
    ['⚡','Random PYQ','Jump straight into one historical question',randomPyq,'R'],
    ['▶','Resume Learning','Continue your saved PYQ/grammar progress',resume,'C'],
    ['🏠','Dashboard','Open your learning command center',()=>nav('dashboard'),'G D'],
    ['📘','Grammar','Open the grammar academy',()=>nav('grammar'),'G G'],
    ['🗂️','Vocabulary','Open vocabulary practice',()=>nav('vocab'),'G V'],
    ['🎯','PYQ Vault','Open Previous Year Questions',()=>nav('pyq'),'G P'],
    ['📖','Book Reading','Open the reading workspace',()=>nav('books'),'G B'],
    ['🏟️','Arena','Open timed arena practice',()=>nav('games'),'G A'],
    ['🧘','Focus / Zen','Open the display & focus panel',()=>{if(typeof window.toggleFocusPanel==='function')window.toggleFocusPanel();closePalette()},'F'],
    ['🌗','Theme','Toggle dark/light mode',()=>{if(typeof window.toggleTheme==='function')window.toggleTheme();closePalette()},'T'],
    ['🩺','System Health','Inspect the current client-side health',health,'H']
  ];

  function buildUI(){
    const dock=document.createElement('div');
    dock.id='vaaniUpgradeDock';
    dock.innerHTML='<div id="vuStatus" class="vu-status"><span class="vu-status-dot"></span><span class="vu-status-label">System ready</span></div><button type="button" class="vu-dock-btn" id="vuQuickBtn" aria-keyshortcuts="?" aria-label="Open VAANI quick actions">⚡ Quick Actions <span class="vu-kbd">?</span></button>';
    document.body.appendChild(dock);

    const pal=document.createElement('div');
    pal.id='vaaniUpgradePalette';
    pal.setAttribute('aria-hidden','true');
    pal.innerHTML='<div class="vu-palette" role="dialog" aria-modal="true" aria-label="VAANI Quick Actions"><div class="vu-palette-head"><input id="vuActionSearch" class="vu-palette-input" type="search" autocomplete="off" placeholder="Search actions…"><span class="vu-palette-hint">Esc close · ↑↓ move · Enter open</span></div><div class="vu-palette-body" id="vuActionBody"></div><div id="vuHealthPanel"><div id="vuHealthBody"></div></div></div>';
    document.body.appendChild(pal);

    document.getElementById('vuQuickBtn').addEventListener('click',()=>openPalette());
    pal.addEventListener('click',e=>{if(e.target===pal)closePalette()});

    const search=document.getElementById('vuActionSearch');
    search.addEventListener('input',()=>renderActions(search.value));
    search.addEventListener('keydown',e=>{
      const buttons=[...document.querySelectorAll('.vu-action:not([hidden])')];
      const idx=buttons.indexOf(document.activeElement);
      if(e.key==='ArrowDown'){e.preventDefault();buttons[Math.min(buttons.length-1,idx+1)]?.focus()}
      if(e.key==='ArrowUp'){e.preventDefault();buttons[Math.max(0,idx-1)]?.focus()}
      if(e.key==='Enter'&&buttons.length===1){e.preventDefault();buttons[0].click()}
    });
    pal.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();closePalette()}
    });

    try{ if('loading' in HTMLImageElement.prototype) document.querySelectorAll('img').forEach((img,i)=>{if(i>1&&!img.hasAttribute('loading'))img.loading='lazy';if(!img.hasAttribute('decoding'))img.decoding='async'}) }catch(e){}
  }

  function renderActions(term){
    const body=document.getElementById('vuActionBody'); if(!body)return;
    const q=String(term||'').trim().toLowerCase();
    const matches=actions.filter(a=>(a[1]+' '+a[2]+' '+a[4]).toLowerCase().includes(q));
    if(!matches.length){body.innerHTML='<div class="vu-empty">No quick action matches that search.</div>';return}
    const groups=[['DAILY',''],['NAVIGATION','']];
    let html='';
    matches.forEach((a,i)=>{
      html+='<button type="button" class="vu-action" data-idx="'+i+'" aria-label="'+esc(a[1])+'"><span class="vu-action-main"><span class="vu-action-ico" aria-hidden="true">'+a[0]+'</span><span class="vu-action-copy"><span class="vu-action-title">'+esc(a[1])+'</span><span class="vu-action-sub">'+esc(a[2])+'</span></span></span><span class="vu-action-kbd">'+esc(a[4])+'</span></button>';
    });
    body.innerHTML=html;
    body.querySelectorAll('.vu-action').forEach((b,i)=>b.addEventListener('click',()=>matches[i][3]()));
  }
  function openPalette(){
    const p=document.getElementById('vaaniUpgradePalette');if(!p)return;
    p.classList.add('show');p.setAttribute('aria-hidden','false');
    const input=document.getElementById('vuActionSearch');input.value='';renderActions('');setTimeout(()=>input.focus(),0);
  }
  function closePalette(){
    const p=document.getElementById('vaaniUpgradePalette');if(!p)return;
    p.classList.remove('show');p.setAttribute('aria-hidden','true');
  }

  function augmentGlobalSearch(){
    if(typeof window.renderGlobalSearch!=='function'||window.renderGlobalSearch.__vuWrapped)return;
    const original=window.renderGlobalSearch;
    function wrapped(){
      original.apply(this,arguments);
      const input=document.getElementById('globalSearch'),results=document.getElementById('gsearchResults');
      if(!input||!results||input.value.trim())return;
      const wrap=document.createElement('div');
      wrap.innerHTML='<div class="gsearch-group-label">VAANI Quick Actions</div>'+actions.slice(0,7).map((a,i)=>'<div class="gsearch-item" data-vu-action="'+i+'"><span class="gi-title">'+a[0]+' '+esc(a[1])+'</span><span class="gi-sub">'+esc(a[2])+'</span></div>').join('');
      wrap.querySelectorAll('[data-vu-action]').forEach((el,i)=>el.addEventListener('click',()=>actions[i][3]()));
      results.appendChild(wrap);
    }
    wrapped.__vuWrapped=true;
    window.renderGlobalSearch=wrapped;
  }

  function registerSW(){
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
  }

  window.addEventListener('online',updateStatus);
  window.addEventListener('offline',updateStatus);
  window.addEventListener('error',e=>{
    if(e && e.target && e.target !== window){state.resourceErrors++;updateStatus();return}
    state.errors++;updateStatus();
    if(state.errors===1)showRecovery('VAANI kept running after a small script error.');
  });
  window.addEventListener('unhandledrejection',()=>{state.rejections++;updateStatus()});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;updateStatus()});

  document.addEventListener('keydown',e=>{
    const tag=(e.target&&e.target.tagName||'').toLowerCase();
    const typing=tag==='input'||tag==='textarea'||tag==='select'||(e.target&&e.target.isContentEditable);
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(typeof window.openGlobalSearch==='function')window.openGlobalSearch();return}
    if(e.key==='Escape'){closePalette();if(typeof window.closeGlobalSearch==='function')window.closeGlobalSearch(false);return}
    if(typing)return;
    if(e.key==='/' && typeof window.openGlobalSearch==='function'){e.preventDefault();window.openGlobalSearch();return}
    if(e.key==='?'){e.preventDefault();openPalette();return}
    if(e.key.toLowerCase()==='g'){
      clearTimeout(state.shortcutTimer);state.shortcutBuffer='g';state.shortcutTimer=setTimeout(()=>state.shortcutBuffer='',900);return;
    }
    if(state.shortcutBuffer==='g'){
      state.shortcutBuffer='';
      const map={d:'dashboard',g:'grammar',v:'vocab',p:'pyq',b:'books',a:'games',l:'leaderboard',r:'profile'};
      const view=map[e.key.toLowerCase()];if(view)nav(view);return;
    }
    if(e.key.toLowerCase()==='f'&&typeof window.toggleFocusPanel==='function'){window.toggleFocusPanel();return}
    if(e.key.toLowerCase()==='t'&&typeof window.toggleTheme==='function'){window.toggleTheme();return}
  });

  window.VAANI_UPGRADE={
    openPalette,closePalette,
    health,
    getDiagnostics:()=>({errors:state.errors,rejections:state.rejections,resourceErrors:state.resourceErrors,online:navigator.onLine})
  };

  function boot(){
    buildUI();
    updateStatus();
    augmentGlobalSearch();
    registerSW();
    if(state.installPrompt){ /* reserved for future install affordance */ }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();