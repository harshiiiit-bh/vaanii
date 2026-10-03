/* VAANI OFFICER ELITE — professional companion layer */
(function(){
  'use strict';
  if(window.__VAANI_OFFICER_ELITE__) return;
  window.__VAANI_OFFICER_ELITE__ = true;

  const quotes = [
    '“The standard is built on ordinary days.”',
    '“Review the miss. Repeat the method. Improve the result.”',
    '“A focused hour beats a distracted afternoon.”',
    '“Do the next useful thing.”',
    '“Accuracy is a habit before it becomes a score.”',
    '“You do not need a perfect attempt. You need an honest one.”'
  ];

  const context = {
    dashboard:['COMMAND CENTRE','Choose one mission. Finish it before opening another.','p0','wave'],
    grammar:['GRAMMAR BATTALION','Find the rule behind the mistake, not just the answer.','p2','point'],
    compare:['PRECISION POST','The difference is usually smaller than it looks. Read carefully.','p3','think'],
    vocab:['WORD ARSENAL','Learn the word, use it, retrieve it.','p7','focus'],
    books:['READING DESK','Understand the paragraph before chasing individual words.','p2','focus'],
    pyq:['PYQ COMMAND','Treat every previous-year question as an after-action report.','p9','observe'],
    games:['ARENA CONTROL','Pressure is a training environment. Keep the method stable.','p4','celebrate'],
    leaderboard:['SITUATION BOARD','Use the board as feedback, not distraction.','p6','observe'],
    profile:['SERVICE RECORD','Track the work. Let the record speak.','p1','salute'],
    notifications:['SIGNAL ROOM','Act on what matters, then return to training.','p0','wave'],
    info:['FIELD MANUAL','Know the system first. Then use it at full speed.','p2','point']
  };

  const state=()=>{try{return typeof State!=='undefined'?State:null}catch(e){return null}};
  const active=()=>{const v=document.querySelector('.view.active');return v?v.id.replace(/^view-/,''):'dashboard'};
  const xp=()=>Math.max(0,Number(state()?.xp)||0);
  const streak=()=>Math.max(0,Number(state()?.streak)||0);
  const level=()=>Math.max(1,Math.floor(xp()/100)+1);

  const mentor=()=>document.getElementById('vaaniMentor');

  function addMeta(){
    const m=mentor();
    if(!m)return;
    const bubble=m.querySelector('.vc-bubble');
    if(!bubble)return;
    let meta=bubble.querySelector('.ve-meta');
    if(!meta){
      meta=document.createElement('div');
      meta.className='ve-meta';
      meta.innerHTML='<strong>OFFICER VAANI · ONLINE</strong><span id="veContext">COMMAND CENTRE</span>';
      const kicker=bubble.querySelector('.vc-kicker');
      bubble.insertBefore(meta,kicker||bubble.firstChild);
    }
    return meta;
  }

  function intel(){
    const m=mentor();
    if(!m)return;
    let box=m.querySelector('#vcIntel');
    if(!box){
      box=document.createElement('div');
      box.id='vcIntel';
      box.className='vc-intel';
      const quote=m.querySelector('.vc-quote');
      if(quote) quote.insertAdjacentElement('afterend',box);
    }
    const best=Number(state()?.personalBests?.highestQuizScore)||0;
    box.innerHTML='<span>STREAK '+streak()+'D</span><span>XP '+xp()+'</span><span>LVL '+level()+'</span>'+(best?'<span>BEST '+Math.round(best)+'%</span>':'');
  }

  function gesturesOff(){
    const m=mentor();
    if(!m)return;
    ['wave','point','think','celebrate','focus','salute','write','observe'].forEach(g=>m.classList.remove('gesture-'+g));
  }

  function pose(pose,gesture){
    const m=mentor();
    if(!m)return;
    const c=m.querySelector('#vcCharacter');
    if(!c)return;
    if(pose){
      if(typeof window.vaaniCharacterSetPose==='function')window.vaaniCharacterSetPose(pose);
      else{
        Array.from(c.classList).forEach(name=>{if(/^vc-p(?:[0-9]|1[01])$/.test(name))c.classList.remove(name);});
        const cls=String(pose).startsWith('vc-')?String(pose):'vc-'+String(pose);
        if(/^vc-p(?:[0-9]|1[01])$/.test(cls))c.classList.add(cls);
      }
    }
    gesturesOff();
    if(gesture){
      void c.offsetWidth;
      m.classList.add('gesture-'+gesture);
    }
    c.setAttribute('aria-label','OFFICER VAANI — '+(gesture||'ready'));
  }

  function setText(kicker,text,quote,poseName,gesture,section){
    const m=mentor();
    if(!m)return;
    addMeta();
    const k=m.querySelector('#vcKicker'),t=m.querySelector('#vcText'),q=m.querySelector('#vcQuote'),ctx=m.querySelector('#veContext');
    if(k)k.textContent=kicker;
    if(t) t.textContent=text;
    if(q) q.textContent=quote||quotes[Math.floor(Date.now()/86400000)%quotes.length];
    if(ctx) ctx.textContent=section||context[active()]?.[0]||'OFFICER VAANI';
    pose(poseName,gesture);
    intel();
  }

  function assessmentActive(){return !!document.body&&(document.body.classList.contains('vaani-assessment-active')||document.body.classList.contains('pv-session-active'));}
  window.VAANI_IS_ASSESSMENT_ACTIVE=assessmentActive;
  window.VAANI_SET_ASSESSMENT_ACTIVE=function(active){
    const enabled=!!active;
    if(document.body){document.body.classList.toggle('vaani-assessment-active',enabled);document.querySelectorAll('.ve-header-mini').forEach(button=>button.setAttribute('aria-disabled',String(enabled)));}
    if(enabled){clearTimeout(idleTimer);idleTimer=null;clearTimeout(routeBriefTimer);routeBriefTimer=null;close();}
    if(typeof updateDockVisibility==='function')updateDockVisibility();
    return enabled;
  };

  function open(){
    const m=mentor();
    if(!m||m.classList.contains('bad-result')||getDockPreferences().hidden||assessmentActive())return;
    addMeta();
    intel();
    // Replace any pending base/elite hide so a fresh briefing cannot vanish early.
    clearTimeout(window.__vaaniMentorTimer);
    m.classList.add('open','speaking','noted');
    window.__vaaniMentorTimer=window.setTimeout(close,9000);
    clearTimeout(m.__vaaniNoteTimer);
    m.__vaaniNoteTimer=setTimeout(()=>m.classList.remove('noted'),420);
  }

  function close(){
    const m=mentor();
    clearTimeout(window.__vaaniMentorTimer);
    window.__vaaniMentorTimer=null;
    if(m){
      m.classList.remove('open','speaking');
      gesturesOff();
    }
  }

  window.VAANI_FEATURE_UPDATE_BRIEFING=function(release){
    if(!release||assessmentActive())return false;
    if(typeof window.vaaniCharacterEnsure==='function')window.vaaniCharacterEnsure();
    const prefs=getDockPreferences();
    if(prefs.hidden)setDockHidden(false,false);
    const bullets=Array.isArray(release.bullets)?release.bullets.slice(0,4):[];
    const detail=[release.summary||'',bullets.length?' '+bullets.join(' • '):''].join('').trim();
    setText(release.tag||'FEATURE UPDATE',release.title||'New VAANI update',detail,'p2','point','FEATURE UPDATE');
    open();
    window.dispatchEvent(new CustomEvent('vaani:feature-update',{detail:release}));
    return true;
  };

  function brief(){
    if(getDockPreferences().hidden||assessmentActive())return;
    if(typeof window.vaaniCharacterEnsure==='function')window.vaaniCharacterEnsure();
    const v=active();
    const c=context[v]||['OFFICER VAANI','Choose a task, focus for a while, and finish what you started.','p10','focus'];
    setText(c[0],c[1],quotes[Math.floor(Date.now()/86400000)%quotes.length],c[2],c[3],c[0]);
    open();
    window.dispatchEvent(new CustomEvent('vaani:briefing',{detail:{view:v}}));
  }

  let routeBriefTimer=null;
  function queueRouteBrief(delay=260){
    // Dismiss a user-opened brief when navigating; never interrupt a task.
    clearTimeout(routeBriefTimer);
    routeBriefTimer=null;
    close();
    if(typeof window.VAANI_SET_ASSESSMENT_ACTIVE==='function')window.VAANI_SET_ASSESSMENT_ACTIVE(false);
    updateDockVisibility();
  }

  function polishFromCurrent(){
    const m=mentor();
    if(!m||m.classList.contains('bad-result'))return;
    const v=active();
    const c=context[v]||context.dashboard;
    setTimeout(()=>pose(c[2],c[3]),0);
    intel();
    addMeta();
  }

  let idleTimer=null;
  function resetIdle(){
    // Idle time is not a reason to open a floating briefing over the page.
    clearTimeout(idleTimer);
    idleTimer=null;
  }

  function wrapNavigation(){
    if(typeof window.switchView!=='function'||window.switchView.__vaaniElite)return;
    const original=window.switchView;
    const wrapped=function(){
      const result=original.apply(this,arguments);
      queueRouteBrief(260);
      return result;
    };
    wrapped.__vaaniElite=true;
    window.switchView=wrapped;
  }


  function statusClock(){
    const m=mentor();
    if(!m)return;
    const meta=addMeta();
    const span=meta?.querySelector('span');
    if(span)span.textContent=(context[active()]||context.dashboard)[0]+' · '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  }


  const DOCK_PREF_KEY='vaani-officer-dock-v1';
  let dockPreferences=null;
  let dockMoveMode=false;
  let dockDrag=null;
  let suppressDockClickUntil=0;

  function getDockPreferences(){
    if(dockPreferences)return dockPreferences;
    const defaults={size:100,position:null,hidden:false};
    try{
      const saved=JSON.parse(localStorage.getItem(DOCK_PREF_KEY)||'null');
      if(saved&&typeof saved==='object'){
        defaults.size=Math.max(60,Math.min(150,Math.round(Number(saved.size)||100)));
        defaults.hidden=saved.hidden===true;
        if(saved.position&&Number.isFinite(Number(saved.position.x))&&Number.isFinite(Number(saved.position.y))){
          defaults.position={x:Number(saved.position.x),y:Number(saved.position.y)};
        }
      }
    }catch(_){}
    dockPreferences=defaults;
    return dockPreferences;
  }

  function saveDockPreferences(){
    try{localStorage.setItem(DOCK_PREF_KEY,JSON.stringify(getDockPreferences()));}catch(_){}
  }

  function safeDockBottom(){
    let limit=window.innerHeight-8;
    const nav=document.querySelector('#bottomNav');
    if(nav){
      const style=getComputedStyle(nav),rect=nav.getBoundingClientRect();
      if(style.display!=='none'&&style.visibility!=='hidden'&&rect.height>0&&rect.top<window.innerHeight){
        limit=Math.min(limit,rect.top-8);
      }
    }
    return Math.max(8,limit);
  }

  function setDockPosition(x,y,save=true){
    const m=mentor();
    if(!m)return null;
    m.classList.add('ve-positioned');
    m.style.right='auto';
    m.style.bottom='auto';
    m.style.transformOrigin='top left';
    const rect=m.getBoundingClientRect();
    const maxX=Math.max(8,window.innerWidth-rect.width-8);
    const maxY=Math.max(8,safeDockBottom()-rect.height);
    const left=Math.round(Math.max(8,Math.min(Number(x)||0,maxX)));
    const top=Math.round(Math.max(8,Math.min(Number(y)||0,maxY)));
    m.style.left=left+'px';
    m.style.top=top+'px';
    syncDockPositionControls();
    if(save){
      const p=getDockPreferences();
      p.position={x:left,y:top};
      saveDockPreferences();
    }
    return {x:left,y:top};
  }

  function clearDockPosition(){
    const m=mentor();
    if(!m)return;
    m.classList.remove('ve-positioned');
    m.style.left='';
    m.style.top='';
    m.style.right='';
    m.style.bottom='';
    m.style.transformOrigin='';
  }

  function setDockScale(value,save=true){
    const m=mentor();
    if(!m)return 100;
    const p=getDockPreferences();
    let size=Math.max(60,Math.min(150,Math.round(Number(value)||100)));
    m.style.setProperty('--ve-dock-scale',(size/100).toFixed(2));
    let rect=m.getBoundingClientRect();
    const widthLimit=Math.max(140,window.innerWidth-16);
    const heightLimit=Math.max(120,safeDockBottom()-8);
    const fit=Math.min(1,widthLimit/Math.max(1,rect.width),heightLimit/Math.max(1,rect.height));
    if(fit<.999){
      size=Math.max(60,Math.floor(size*fit));
      m.style.setProperty('--ve-dock-scale',(size/100).toFixed(2));
      rect=m.getBoundingClientRect();
    }
    if(m.classList.contains('ve-positioned')){
      setDockPosition(rect.left,rect.top,false);
    }else if(rect.left<8){
      setDockPosition(8,rect.top,false);
    }
    p.size=size;
    const slider=m.querySelector('#veDockScale');
    const exact=m.querySelector('#veDockScaleExact');
    const output=m.querySelector('#veDockScaleValue');
    if(slider)slider.value=String(size);
    if(exact)exact.value=String(size);
    if(output)output.textContent=size+'%';
    if(save){
      if(m.classList.contains('ve-positioned')){
        const current=m.getBoundingClientRect();
        p.position={x:Math.round(current.left),y:Math.round(current.top)};
      }
      saveDockPreferences();
    }
    return size;
  }

  function syncDockPositionControls(){
    const m=mentor();
    if(!m)return;
    const rect=m.getBoundingClientRect();
    const x=m.querySelector('#veDockX'),y=m.querySelector('#veDockY');
    const maxX=Math.max(8,Math.floor(window.innerWidth-rect.width-8));
    const maxY=Math.max(8,Math.floor(safeDockBottom()-rect.height));
    if(x){x.min='8';x.max=String(maxX);if(document.activeElement!==x)x.value=String(Math.round(rect.left));}
    if(y){y.min='8';y.max=String(maxY);if(document.activeElement!==y)y.value=String(Math.round(rect.top));}
  }
  function applyDockPositionInputs(){
    const m=mentor();
    if(!m)return;
    const x=m.querySelector('#veDockX'),y=m.querySelector('#veDockY');
    if(!x||!y)return;
    if(!Number.isFinite(x.valueAsNumber)||!Number.isFinite(y.valueAsNumber)){
      setDockStatus('Enter valid pixel coordinates, then apply the position.');
      return;
    }
    const pos=setDockPosition(x.valueAsNumber,y.valueAsNumber,true);
    if(pos)setDockStatus('Position saved at X '+pos.x+' px, Y '+pos.y+' px.');
  }

  function setDockStatus(message){
    const status=mentor()?.querySelector('#veDockStatus');
    if(status)status.textContent=message;
  }

  function setDockMoveMode(enabled){
    const m=mentor();
    if(!m)return;
    dockMoveMode=!!enabled;
    m.classList.toggle('ve-move-mode',dockMoveMode);
    const button=m.querySelector('#veMoveToggle');
    if(button){
      button.setAttribute('aria-pressed',String(dockMoveMode));
      button.textContent=dockMoveMode?'Moving: ON':'Move';
    }
    const character=m.querySelector('#vcCharacter');
    if(character)character.setAttribute('aria-grabbed',String(dockMoveMode));
    setDockStatus(dockMoveMode?'Move enabled — drag the character or use arrow keys.':'Adjust position and size, or hide Officer VAANI.');
  }

  function updateDockVisibility(){
    const p=getDockPreferences();
    // Hide the floating dock on Profile and during assessments. The header
    // avatar remains the single accessible restore/briefing control.
    const routeHidden=active()==='profile';
    const taskHidden=assessmentActive();
    document.body.classList.toggle('ve-vaani-user-hidden',p.hidden);
    document.body.classList.toggle('ve-vaani-route-hidden',routeHidden);
    document.body.classList.toggle('ve-vaani-task-hidden',taskHidden);
    document.body.classList.toggle('ve-vaani-hidden',p.hidden||routeHidden||taskHidden);
    // Remove legacy restore buttons left by older cached builds.
    document.getElementById('veRestoreOfficer')?.remove();
  }

  function setDockHidden(hidden,save=true){
    const p=getDockPreferences();
    p.hidden=!!hidden;
    setDockMoveMode(false);
    close();
    const panel=mentor()?.querySelector('#veAdjustPanel');
    if(panel)panel.hidden=true;
    const toggle=mentor()?.querySelector('#veAdjustToggle');
    if(toggle)toggle.setAttribute('aria-expanded','false');
    updateDockVisibility();
    if(save)saveDockPreferences();
  }

  function toggleDockAdjust(panel,button){
    if(!panel||!button)return;
    panel.hidden=!panel.hidden;
    button.setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden)setDockStatus('Move, resize, reset position, or hide Officer VAANI.');
  }

  function mountDockControls(target){
    const m=target||mentor();
    if(!m)return;
    const bubble=m.querySelector('.vc-bubble');
    const actions=bubble?.querySelector('.vc-actions');
    if(!bubble||!actions)return;
    let toggle=actions.querySelector('#veAdjustToggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.id='veAdjustToggle';
      toggle.textContent='Adjust';
      toggle.setAttribute('aria-expanded','false');
      toggle.setAttribute('aria-controls','veAdjustPanel');
      toggle.title='Move, resize or hide Officer VAANI';
      const next=actions.querySelector('#vcNext');
      actions.insertBefore(toggle,next||null);
    }
    let panel=bubble.querySelector('#veAdjustPanel');
    if(!panel){
      panel=document.createElement('div');
      panel.id='veAdjustPanel';
      panel.className='ve-adjust-panel';
      panel.hidden=true;
      panel.innerHTML=
        '<div class="ve-adjust-actions">'+
          '<button type="button" id="veMoveToggle" aria-pressed="false">Move</button>'+
          '<button type="button" id="veDockReset" title="Return Officer VAANI to the bottom-right corner">Reset</button>'+
          '<button type="button" id="veDockHide" class="ve-hide-officer">Hide</button>'+
        '</div>'+
        '<div class="ve-size-control">'+
          '<label for="veDockScale">Size</label>'+
          '<input id="veDockScale" type="range" min="60" max="150" step="1" value="100" aria-label="Officer VAANI size">'+
          '<input id="veDockScaleExact" type="number" min="60" max="150" step="1" value="100" aria-label="Exact Officer VAANI size in percent">'+
          '<span aria-hidden="true">%</span>'+
        '</div>'+
        '<div class="ve-position-controls">'+
          '<label for="veDockX">Left <span>(px)</span><input id="veDockX" type="number" min="8" step="1" inputmode="numeric" aria-label="Officer VAANI left position in pixels"></label>'+
          '<label for="veDockY">Top <span>(px)</span><input id="veDockY" type="number" min="8" step="1" inputmode="numeric" aria-label="Officer VAANI top position in pixels"></label>'+
          '<button type="button" id="veDockApply">Apply position</button>'+
        '</div>'+
        '<p id="veDockStatus" role="status" aria-live="polite">Move, resize, or enter exact pixel coordinates.</p>';
      bubble.appendChild(panel);
    }
    if(!toggle.dataset.bound){
      toggle.dataset.bound='1';
      toggle.addEventListener('click',()=>toggleDockAdjust(panel,toggle));
      panel.querySelector('#veMoveToggle')?.addEventListener('click',()=>setDockMoveMode(!dockMoveMode));
      panel.querySelector('#veDockScale')?.addEventListener('input',event=>setDockScale(event.target.value,true));
      panel.querySelector('#veDockScaleExact')?.addEventListener('change',event=>setDockScale(event.target.value,true));
      panel.querySelector('#veDockApply')?.addEventListener('click',applyDockPositionInputs);
      panel.querySelector('#veDockReset')?.addEventListener('click',()=>{
        clearDockPosition();
        const current=m.getBoundingClientRect();
        const p=getDockPreferences();
        p.position=null;
        saveDockPreferences();
        syncDockPositionControls();
        setDockStatus('Position reset to the default corner.');
        // Keep default bottom/right anchoring after the reset.
        const scale=Number(p.size)||100;
        m.style.setProperty('--ve-dock-scale',(scale/100).toFixed(2));
      });
      panel.querySelector('#veDockHide')?.addEventListener('click',()=>setDockHidden(true,true));
    }
    updateDockVisibility();
    const p=getDockPreferences();
    if(p.position)setDockPosition(p.position.x,p.position.y,false);
    setDockScale(p.size,false);
    if(p.hidden)close();
    else if(!p.position){
      // The default corner stays responsive to the current viewport.
      clearDockPosition();
      m.style.setProperty('--ve-dock-scale',(p.size/100).toFixed(2));
    }
    setDockMoveMode(false);
    syncDockPositionControls();
  }

  function beginDockDrag(event,character){
    if(!dockMoveMode||!character||event.button!==undefined&&event.button!==0)return;
    const m=mentor();
    if(!m)return;
    event.preventDefault();
    const rect=m.getBoundingClientRect();
    dockDrag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top,moved:false};
    m.classList.add('ve-dragging');
    try{character.setPointerCapture(event.pointerId)}catch(_){}
  }

  function moveDockDrag(event){
    if(!dockDrag||event.pointerId!==dockDrag.pointerId)return;
    const dx=event.clientX-dockDrag.startX,dy=event.clientY-dockDrag.startY;
    if(!dockDrag.moved&&Math.hypot(dx,dy)<4)return;
    dockDrag.moved=true;
    event.preventDefault();
    setDockPosition(dockDrag.left+dx,dockDrag.top+dy,false);
    setDockStatus('Position updated. Release to save.');
  }

  function finishDockDrag(event){
    if(!dockDrag||event.pointerId!==dockDrag.pointerId)return;
    const moved=dockDrag.moved;
    dockDrag=null;
    const m=mentor();
    if(m)m.classList.remove('ve-dragging');
    if(moved&&m){
      const r=m.getBoundingClientRect(),p=getDockPreferences();
      p.position={x:Math.round(r.left),y:Math.round(r.top)};
      suppressDockClickUntil=Date.now()+450;
      saveDockPreferences();
      syncDockPositionControls();
      setDockStatus('Position saved at X '+Math.round(r.left)+' px, Y '+Math.round(r.top)+' px.');
    }
  }

  function moveDockBy(dx,dy){
    const m=mentor();
    if(!m||!dockMoveMode)return;
    const r=m.getBoundingClientRect();
    setDockPosition(r.left+dx,r.top+dy,true);
    setDockStatus('Position saved. Use the arrow keys again or turn Move off.');
  }

  function initDockControls(){
    window.vaaniCharacterOnMount=mountDockControls;
    window.addEventListener('pointermove',moveDockDrag,{passive:false});
    window.addEventListener('pointerup',finishDockDrag,{passive:true});
    window.addEventListener('pointercancel',finishDockDrag,{passive:true});
    window.addEventListener('resize',()=>{
      const m=mentor(),p=getDockPreferences();
      if(!m)return;
      if(m.classList.contains('ve-positioned')){
        const r=m.getBoundingClientRect();
        const next=setDockPosition(r.left,r.top,false);
        if(p.position) p.position=next;
        saveDockPreferences();
      }else{
        setDockScale(p.size,false);
      }
    },{passive:true});
    document.addEventListener('click',e=>{
      const target=e.target instanceof Element?e.target:null;
      if(dockMoveMode&&target?.closest('#vaaniMentor #vcCharacter')){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },true);
    document.addEventListener('keydown',e=>{
      const target=e.target instanceof Element?e.target:null;
      const character=target?.closest('#vaaniMentor #vcCharacter');
      if(!character||!dockMoveMode)return;
      const step=e.shiftKey?10:1;
      const directions={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
      if(directions[e.key]){
        e.preventDefault();
        moveDockBy(...directions[e.key]);
      }else if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },true);
    document.addEventListener('pointerdown',e=>{
      const target=e.target instanceof Element?e.target:null;
      const character=target?.closest('#vaaniMentor #vcCharacter');
      if(!character)return;
      if(dockMoveMode){beginDockDrag(e,character);return;}
      pose(context[active()]?.[2]||'p0','focus');
    },{passive:false});
    const p=getDockPreferences();
    if(mentor())mountDockControls(mentor());
    updateDockVisibility();
    if(p.position&&mentor())setDockPosition(p.position.x,p.position.y,false);
    if(mentor())setDockScale(p.size,false);
  }

  window.vaaniCharacterOnMount=mountDockControls;

  function mountOfficerStations(){
    const brand=document.querySelector('.brand');
    if(!brand)return;
    document.querySelectorAll('.ve-officer-station,.ve-restore-officer,.ve-surface-mini').forEach(button=>button.remove());
    let mini=brand.querySelector('.ve-header-mini');
    if(!mini){
      mini=document.createElement('button');
      mini.type='button';
      mini.className='ve-header-mini';
      mini.setAttribute('aria-label','Open or restore Officer VAANI');
      mini.title='Officer VAANI · briefing and controls';
      brand.appendChild(mini);
    }
    if(!mini.dataset.vaaniDockBound){
      mini.dataset.vaaniDockBound='1';
      mini.addEventListener('click',()=>{
        if(assessmentActive())return;
        if(getDockPreferences().hidden)setDockHidden(false,true);
        if(mentor()?.classList.contains('open'))close();
        else brief();
      });
    }
  }

  function boot(){
    if(typeof window.vaaniCharacterEnsure==='function')window.vaaniCharacterEnsure();
    initDockControls();
    wrapNavigation();
    mountOfficerStations();
    addMeta();
    intel();
    statusClock();
    resetIdle();

    queueRouteBrief(900);
    window.addEventListener('hashchange',()=>queueRouteBrief(180));

    document.addEventListener('click',e=>{
      resetIdle();
      const m=mentor();
      if(!m)return;

      // Launcher buttons open the briefing during this same bubbling click.
      // Do not interpret that click as an outside click and close it immediately.
      if(e.target.closest('.ve-header-mini'))return;
      if(m.contains(e.target)){
        if(e.target.closest('#vcNext')||e.target.closest('#vcCharacter')){
          setTimeout(()=>{
            if(!m.classList.contains('bad-result')){
              open();
              polishFromCurrent();
            }
          },20);
        }
      }else if(m.classList.contains('open')){
        close();
      }
    },{passive:true});

    document.addEventListener('keydown',e=>{
      resetIdle();
      if(e.key==='Escape'){close();return;}
      if((e.key||'').toLowerCase()==='m'&&!/input|textarea|select/i.test(e.target?.tagName||'')){
        e.preventDefault();
        const m=mentor();
        if(m?.classList.contains('open'))close();else brief();
      }
    });

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){intel();statusClock();resetIdle();}
    });

    setInterval(()=>{intel();statusClock()},15000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500),{once:true});
  }else{
    setTimeout(boot,500);
  }
})();