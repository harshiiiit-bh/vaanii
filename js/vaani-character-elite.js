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

  function open(){
    const m=mentor();
    if(!m||m.classList.contains('bad-result'))return;
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

  function brief(){
    if(typeof window.vaaniCharacterEnsure==='function')window.vaaniCharacterEnsure();
    const v=active();
    const c=context[v]||['OFFICER VAANI','Choose a task, focus for a while, and finish what you started.','p10','focus'];
    setText(c[0],c[1],quotes[Math.floor(Date.now()/86400000)%quotes.length],c[2],c[3],c[0]);
    open();
    window.dispatchEvent(new CustomEvent('vaani:briefing',{detail:{view:v}}));
  }

  let routeBriefTimer=null;
  function queueRouteBrief(delay=260){
    clearTimeout(routeBriefTimer);
    routeBriefTimer=setTimeout(()=>{
      routeBriefTimer=null;
      const view=active();
      if(['info','topic','compare-detail','worddetail'].includes(view)){close();return;}
      brief();
      resetIdle();
    },delay);
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

  let idleTimer;
  function resetIdle(){
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{
      if(document.hidden)return resetIdle();
      const v=active();
      if(['dashboard','grammar','vocab','pyq','games','books','compare'].includes(v)){
        const lines=[
          ['FOCUS CHECK','Still here? Choose the next useful action instead of switching tasks.','p6','focus'],
          ['MOMENTUM','If the method is not working, change the method — not the mission.','p3','think'],
          ['FIELD NOTE','One deliberate attempt is worth more than several distracted ones.','p8','write']
        ];
        const x=lines[Math.floor(Math.random()*lines.length)];
        setText(x[0],x[1],quotes[Math.floor(Math.random()*quotes.length)],x[2],x[3],(context[v]||context.dashboard)[0]);
        open();
      }
      resetIdle();
    },120000);
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

  function wrapResult(){
    if(typeof window.vaaniCharacterResult!=='function'||window.vaaniCharacterResult.__vaaniElite)return;
    const original=window.vaaniCharacterResult;
    const wrapped=function(score,label){
      const result=original.apply(this,arguments);
      const n=Math.max(0,Math.min(100,Number(score)||0));

      if(n<50){
        const m=mentor();
        if(m && !m.classList.contains('bad-result')){
          setText('RECOVERY BRIEFING','The weak points are visible now. Convert each mistake into one concrete revision task.','“Review the miss. Repeat the method. Improve the result.”','p5','think','AFTER ACTION REVIEW');
          open();
        }
        return result;
      }

      let kicker='EXCELLENT EXECUTION';
      let text='Strong result. Save the method that produced it.';
      let p='p4';
      let g='celebrate';
      if(n<70){kicker='AFTER ACTION REVIEW';text='A workable base is here. Remove the repeated errors before chasing more speed.';p='p6';g='think';}
      else if(n<90){kicker='SOLID EXECUTION';text='Good work. Protect accuracy and identify the few remaining leaks.';p='p10';g='focus';}

      setText(kicker,text,n>=90?'“Reproduce the preparation, not just the score.”':'“Fix the process, and the score follows.”',p,g,'RESULT DEBRIEF');
      open();
      return result;
    };
    wrapped.__vaaniElite=true;
    window.vaaniCharacterResult=wrapped;
  }

  function statusClock(){
    const m=mentor();
    if(!m)return;
    const meta=addMeta();
    const span=meta?.querySelector('span');
    if(span)span.textContent=(context[active()]||context.dashboard)[0]+' · '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  }

  function mountOfficerStations(){
    // Compact contextual Officer VAANI rail: deep integration without
    // adding another large card to every screen.
    const brand=document.querySelector('.brand');
    if(brand && !brand.querySelector('.ve-header-mini')){
      const mini=document.createElement('button');
      mini.type='button';
      mini.className='ve-header-mini';
      mini.setAttribute('aria-label','Open Officer VAANI');
      mini.title='Officer VAANI · open briefing';
      mini.addEventListener('click',brief);
      brand.appendChild(mini);
    }

    const stations={
      grammar:['GRAMMAR','Rule check','point'],
      compare:['PRECISION','Read twice','think'],
      vocab:['VOCAB','Word drill','focus'],
      books:['READING','Meaning first','observe'],
      pyq:['PYQ','Mission report','salute'],
      games:['ARENA','Stay precise','celebrate'],
      leaderboard:['BOARD','Use as feedback','observe'],
      profile:['RECORD','Track the work','salute'],
      notifications:['SIGNAL','Act on what matters','wave']
    };

    Object.entries(stations).forEach(([viewId,data])=>{
      const view=document.getElementById('view-'+viewId);
      if(!view || view.querySelector('.ve-officer-station'))return;

      const station=document.createElement('button');
      station.type='button';
      station.className='ve-officer-station';
      station.innerHTML=
        '<span class="ve-station-avatar">'+
          '<img src="assets/officer-vaani.svg" alt="" loading="lazy" decoding="async">'+
          '<i aria-hidden="true"></i>'+
        '</span>'+
        '<span class="ve-station-label">'+
          '<b>OFFICER VAANI</b><em>'+data[0]+'</em>'+
        '</span>'+
        '<span class="ve-station-hint">'+data[1]+'</span>'+
        '<span class="ve-station-arrow" aria-hidden="true">→</span>';
      station.title='Officer VAANI · '+data[0];
      station.addEventListener('click',brief);

      const target=view.querySelector('.view-header,.section-head,.page-head,.grammar-head,.vocab-head,.pyq-head,.arena-head');
      const host=target||view.firstElementChild;
      if(!host) return;
      host.classList.add('ve-station-host');
      host.appendChild(station);
    });
  }

  function boot(){
    if(typeof window.vaaniCharacterEnsure==='function')window.vaaniCharacterEnsure();
    wrapNavigation();
    mountOfficerStations();
    wrapResult();
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
      if(e.target.closest('.ve-header-mini,.ve-officer-station'))return;
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

    document.addEventListener('pointerdown',e=>{
      const target=e.target instanceof Element?e.target:null;
      if(target?.closest('#vaaniMentor #vcCharacter'))pose(context[active()]?.[2]||'p0','focus');
    },{passive:true});

    setInterval(()=>{intel();statusClock()},15000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500),{once:true});
  }else{
    setTimeout(boot,500);
  }
})();