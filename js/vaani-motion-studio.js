/* VAANI Motion Studio
   Optional effects are muted by default. This module only adds its own
   preference key and decorative UI; it does not touch learning progress. */
(function(){
  'use strict';
  if(window.__VAANI_MOTION_STUDIO__) return;
  window.__VAANI_MOTION_STUDIO__ = true;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefKey = 'vaani_motion_studio_v1';
  const defaults = {parallax:true, depth:true, sound:false};
  let prefs = Object.assign({}, defaults);
  try{
    const saved = JSON.parse(localStorage.getItem(prefKey) || 'null');
    if(saved && typeof saved === 'object'){
      prefs.parallax = saved.parallax !== false;
      prefs.depth = saved.depth !== false;
      prefs.sound = saved.sound === true;
    }
  }catch(_err){}

  function savePrefs(){
    try{localStorage.setItem(prefKey,JSON.stringify(prefs));}catch(_err){}
  }
  function applyPrefs(){
    document.documentElement.classList.toggle('vfx-no-parallax',!prefs.parallax || !finePointer || reduceMotion);
    document.documentElement.classList.toggle('vfx-no-depth',!prefs.depth || reduceMotion);
    document.documentElement.classList.toggle('vfx-sound-on',prefs.sound);
    document.querySelectorAll('[data-vfx-toggle]').forEach(function(btn){
      const key=btn.getAttribute('data-vfx-toggle');
      btn.setAttribute('aria-checked',String(!!prefs[key]));
      btn.classList.toggle('is-on',!!prefs[key]);
    });
    const hint=document.getElementById('vfxSoundHint');
    if(hint) hint.textContent=prefs.sound?'Playful sounds are on.':'Muted by default — enable for tiny sound effects.';
  }

  function addScene(){
    if(document.getElementById('vaaniVfxScene')) return;
    const scene=document.createElement('div');
    scene.id='vaaniVfxScene';
    scene.setAttribute('aria-hidden','true');
    scene.innerHTML='<div class="vfx-depth vfx-orb" data-depth="0.20"></div>'+
      '<div class="vfx-depth vfx-orbit" data-depth="0.34"></div>'+
      '<div class="vfx-depth vfx-cube" data-depth="0.48"><i class="front"></i><i class="back"></i><i class="right"></i><i class="left"></i><i class="top"></i><i class="bottom"></i></div>'+
      '<div class="vfx-depth vfx-medal" data-depth="0.26"><span></span><span></span></div>';
    document.body.insertBefore(scene,document.body.firstChild);
  }

  const stickerSvg={
    dashboard:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3 28 18 44 24 28 29 24 45 19 29 4 24 19 18Z" fill="#d3ad65" fill-opacity=".35" stroke="#b78e49" stroke-width="1.5" stroke-linejoin="round"/><circle cx="24" cy="24" r="6" fill="#4da99a" fill-opacity=".3" stroke="#4a9b90" stroke-width="1.5"/><path class="vfx-sticker-spark" d="m38 5 1.7 4.3L44 11l-4.3 1.6L38 17l-1.6-4.4L32 11l4.4-1.7Z" fill="#c69e58"/></svg>',
    grammar:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 10c8-3 13-1 17 3 4-4 9-6 17-3v27c-8-2-13 0-17 4-4-4-9-6-17-4Z" fill="#d9eee5" stroke="#4a9b90" stroke-width="1.7" stroke-linejoin="round"/><path d="M24 13v28M12 17c4-1 7 0 9 2m-9 4c4-1 7 0 9 2m15-8c-4-1-7 0-9 2m9 4c-4-1-7 0-9 2" fill="none" stroke="#568c7e" stroke-width="1.5" stroke-linecap="round"/><path class="vfx-sticker-spark" d="m36 3 1.4 3.6L41 8l-3.6 1.4L36 13l-1.4-3.6L31 8l3.6-1.4Z" fill="#c69e58"/></svg>',
    compare:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7v31M11 13h26M17 13 9 28h16L17 13Zm14 0-8 15h16l-8-15Z" fill="none" stroke="#b88d49" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 30c2 5 15 5 18 0M23 30c2 5 15 5 18 0M17 39h14" fill="none" stroke="#4b9a8e" stroke-width="1.8" stroke-linecap="round"/><circle class="vfx-sticker-glow" cx="24" cy="6" r="3" fill="#d8b469"/></svg>',
    vocab:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="#e5eee9" stroke="#4e998e" stroke-width="1.5"/><path d="M15 33 22 15h4l7 18m-15-6h16" fill="none" stroke="#275d58" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path class="vfx-sticker-spark" d="m36 2 1.2 3.1L40 6.5l-2.8 1.2L36 11l-1.2-3.3L32 6.5l2.8-1.4Z" fill="#c69e58"/></svg>',
    books:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 10c8-3 14-1 19 3 5-4 11-6 19-3v27c-8-2-14 0-19 4-5-4-11-6-19-4Z" fill="#e1eee8" stroke="#4b988c" stroke-width="1.6"/><path d="M24 13v28M11 18c4-1 7 0 10 2m-10 5c4-1 7 0 10 2m16-9c-4-1-7 0-10 2m10 5c-4-1-7 0-10 2" stroke="#598c80" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M33 5c0 0 6-5 10-1-1 6-6 8-11 5Z" fill="#d9bb77" stroke="#b68a42" stroke-width="1.2"/></svg>',
    pyq:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="#e9eee7" stroke="#4d958b" stroke-width="1.5"/><circle cx="24" cy="24" r="12" fill="none" stroke="#b68c4c" stroke-width="1.5"/><circle cx="24" cy="24" r="6" fill="#d5ad63" fill-opacity=".5" stroke="#b68c4c" stroke-width="1.5"/><path d="m24 4 3 15-3 5-3-5Z" fill="#4a9489"/><path class="vfx-sticker-spark" d="m39 5 1.3 3.1L44 9.5l-3.7 1.3L39 14l-1.3-3.2L34 9.5l3.7-1.4Z" fill="#c69e58"/></svg>',
    games:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 7h20v7c0 10-5 15-10 15s-10-5-10-15Z" fill="#e4d2a7" stroke="#ae8746" stroke-width="1.7"/><path d="M14 12H7v5c0 5 4 8 10 8M34 12h7v5c0 5-4 8-10 8M24 29v8m-9 4h18" fill="none" stroke="#ae8746" stroke-width="1.7" stroke-linecap="round"/><path d="m24 11 1.7 4h4.2l-3.4 2.5 1.3 4-3.8-2.5-3.8 2.5 1.3-4-3.4-2.5h4.2Z" fill="#4a9489"/></svg>',
    leaderboard:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 5h18v12c0 8-4 12-9 12s-9-4-9-12Z" fill="#e4d2a7" stroke="#af8646" stroke-width="1.6"/><path d="M15 10H7v6c0 6 4 9 10 9m16-15h8v6c0 6-4 9-10 9M24 29v9m-8 4h16" fill="none" stroke="#af8646" stroke-width="1.6" stroke-linecap="round"/><path d="m24 9 1.4 3.4 3.6.3-2.7 2.3.9 3.5-3.2-1.9-3.2 1.9.9-3.5-2.7-2.3 3.6-.3Z" fill="#4b9a8e"/></svg>',
    profile:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 40 10v12c0 10-7 16-16 22C15 38 8 32 8 22V10Z" fill="#e0eee7" stroke="#4a978b" stroke-width="1.7" stroke-linejoin="round"/><circle cx="24" cy="19" r="5" fill="#cda65f"/><path d="M14 33c2-6 6-8 10-8s8 2 10 8" fill="none" stroke="#4a978b" stroke-width="2" stroke-linecap="round"/></svg>',
    notifications:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 32c3-3 3-6 3-13a10 10 0 0 1 20 0c0 7 0 10 3 13Z" fill="#e4eee8" stroke="#4b988b" stroke-width="1.7" stroke-linejoin="round"/><path d="M20 37c1 4 7 4 8 0" fill="none" stroke="#b88d49" stroke-width="2" stroke-linecap="round"/><path class="vfx-sticker-spark" d="m37 5 1.2 3L41 9l-2.8 1.2L37 13l-1.2-2.8L33 9l2.8-1.1Z" fill="#c69e58"/></svg>'
  };

  function addStickers(){
    Object.keys(stickerSvg).forEach(function(key){
      const view=document.getElementById('view-'+key);
      if(!view) return;
      const heading=view.querySelector('.section-head h1,.section-head h2,.section-header h1,.section-header h2,.module-head h1,.module-head h2,h1,h2');
      if(!heading || heading.querySelector('.vfx-sticker')) return;
      const sticker=document.createElement('span');
      sticker.className='vfx-sticker vfx-sticker-'+key;
      sticker.setAttribute('aria-hidden','true');
      sticker.innerHTML=stickerSvg[key];
      heading.appendChild(sticker);
    });
  }

  function makeDock(){
    if(document.getElementById('vaaniVfxDock')) return;
    const dock=document.createElement('aside');
    dock.id='vaaniVfxDock';
    dock.setAttribute('aria-label','VAANI experience studio');
    dock.innerHTML=
      '<section class="vfx-dock-panel" id="vfxDockPanel" aria-label="Motion and focus controls" hidden>'+
        '<div class="vfx-dock-head"><div><strong>FIELD STUDIO</strong><small>Personalise the way VAANI feels.</small></div><button class="vfx-dock-close" type="button" aria-label="Close Studio">×</button></div>'+
        '<div class="vfx-dock-controls" aria-label="Experience controls">'+
          '<button class="vfx-control" type="button" role="switch" aria-checked="true" data-vfx-toggle="depth"><span class="vfx-switch-dot"></span><span>3D accents</span></button>'+
          '<button class="vfx-control" type="button" role="switch" aria-checked="true" data-vfx-toggle="parallax"><span class="vfx-switch-dot"></span><span>Parallax</span></button>'+
          '<button class="vfx-control" type="button" role="switch" aria-checked="false" data-vfx-toggle="sound"><span class="vfx-switch-dot"></span><span>Playful SFX</span></button>'+
        '</div>'+
        '<div class="vfx-sprint"><div class="vfx-sprint-top"><span class="vfx-sprint-label">5-minute focus flight</span><strong class="vfx-timer" id="vfxTimer" aria-live="off">05:00</strong></div>'+
          '<div class="vfx-timer-actions"><button type="button" class="vfx-start" id="vfxTimerStart">Start sprint</button><button type="button" id="vfxTimerPause">Pause</button><button type="button" id="vfxTimerReset">Reset</button></div></div>'+
        '<div class="vfx-quick-title">Quick launch</div><div class="vfx-quick-launch">'+
          '<button type="button" data-vfx-view="grammar">Grammar</button><button type="button" data-vfx-view="vocab">Vocab</button><button type="button" data-vfx-view="pyq">PYQ</button><button type="button" data-vfx-view="books">Reading</button></div>'+
        '<div class="vfx-sound-row"><small id="vfxSoundHint">Muted by default — enable for tiny sound effects.</small><button type="button" class="vfx-sound-preview" id="vfxSoundPreview">Test funny sound</button></div>'+
      '</section>'+
      '<button class="vfx-dock-trigger" type="button" id="vfxDockTrigger" aria-controls="vfxDockPanel" aria-expanded="false"><span class="vfx-dock-star" aria-hidden="true">✦</span><span>Studio</span></button>';
    document.body.appendChild(dock);

    const trigger=dock.querySelector('#vfxDockTrigger');
    const panel=dock.querySelector('#vfxDockPanel');
    const close=dock.querySelector('.vfx-dock-close');
    function setOpen(open){
      panel.hidden=!open;
      trigger.setAttribute('aria-expanded',String(open));
      if(open) close.focus({preventScroll:true});
    }
    trigger.addEventListener('click',function(){setOpen(panel.hidden);});
    close.addEventListener('click',function(){setOpen(false);trigger.focus({preventScroll:true});});
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&!panel.hidden){setOpen(false);trigger.focus({preventScroll:true});}
    });
    dock.querySelectorAll('[data-vfx-toggle]').forEach(function(btn){
      btn.addEventListener('click',function(){
        const key=btn.getAttribute('data-vfx-toggle');
        prefs[key]=!prefs[key];savePrefs();applyPrefs();
        if(key==='sound'&&prefs.sound) playTone('funny',true);
      });
    });
    dock.querySelectorAll('[data-vfx-view]').forEach(function(btn){
      btn.addEventListener('click',function(){
        const view=btn.getAttribute('data-vfx-view');
        if(typeof window.switchView==='function') window.switchView(view);
        else{
          const nav=document.querySelector('[data-view="'+view+'"]');
          if(nav) nav.click();
        }
        setOpen(false);
      });
    });
    dock.querySelector('#vfxSoundPreview').addEventListener('click',function(){playTone('funny',true);});
    return dock;
  }

  let audioContext=null;
  function playTone(kind,force){
    if(!force&&!prefs.sound) return;
    try{
      const AudioCtor=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtor) return;
      if(!audioContext) audioContext=new AudioCtor();
      if(audioContext.state==='suspended') audioContext.resume().catch(function(){});
      const now=audioContext.currentTime;
      const osc=audioContext.createOscillator();
      const gain=audioContext.createGain();
      osc.type=kind==='funny'?'triangle':'sine';
      const start=kind==='funny'?260:430;
      osc.frequency.setValueAtTime(start,now);
      osc.frequency.exponentialRampToValueAtTime(kind==='funny'?680:760,now+.075);
      osc.frequency.exponentialRampToValueAtTime(kind==='funny'?190:520,now+.23);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.045,now+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.25);
      osc.connect(gain);gain.connect(audioContext.destination);
      osc.start(now);osc.stop(now+.26);
    }catch(_err){}
  }

  let secondsLeft=300,deadline=0,timerHandle=null;
  function renderTimer(){
    const el=document.getElementById('vfxTimer');
    if(!el) return;
    const mm=String(Math.floor(secondsLeft/60)).padStart(2,'0');
    const ss=String(secondsLeft%60).padStart(2,'0');
    el.textContent=mm+':'+ss;
    const start=document.getElementById('vfxTimerStart');
    if(start) start.textContent=timerHandle?'Running…':(secondsLeft===300?'Start sprint':(secondsLeft===0?'Start again':'Resume'));
  }
  function stopTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null;}}
  function tickTimer(){
    secondsLeft=Math.max(0,Math.ceil((deadline-Date.now())/1000));
    renderTimer();
    if(secondsLeft<=0){
      stopTimer();
      if(typeof window.toast==='function') window.toast('Focus flight complete — take a short reset.');
      playTone('funny');
    }
  }
  function wireTimer(){
    const start=document.getElementById('vfxTimerStart');
    const pause=document.getElementById('vfxTimerPause');
    const reset=document.getElementById('vfxTimerReset');
    if(!start||!pause||!reset) return;
    start.addEventListener('click',function(){
      if(timerHandle) return;
      if(secondsLeft<=0) secondsLeft=300;
      deadline=Date.now()+secondsLeft*1000;
      timerHandle=setInterval(tickTimer,250);renderTimer();
    });
    pause.addEventListener('click',function(){
      if(!timerHandle) return;
      secondsLeft=Math.max(0,Math.ceil((deadline-Date.now())/1000));
      stopTimer();renderTimer();
    });
    reset.addEventListener('click',function(){stopTimer();secondsLeft=300;renderTimer();});
    renderTimer();
  }

  function wireParallax(){
    const scene=document.getElementById('vaaniVfxScene');
    if(!scene||!finePointer||reduceMotion) return;
    const layers=Array.from(scene.querySelectorAll('[data-depth]'));
    let px=0,py=0,scroll=0,raf=0;
    function render(){
      raf=0;
      if(!prefs.parallax){layers.forEach(function(el){el.style.translate='0 0';});return;}
      layers.forEach(function(el){
        const depth=Number(el.getAttribute('data-depth'))||.2;
        const x=px*depth*17;
        const y=py*depth*11-Math.min(scroll,1400)*depth*.018;
        el.style.translate=x.toFixed(1)+'px '+y.toFixed(1)+'px';
      });
    }
    function schedule(){if(!raf)raf=requestAnimationFrame(render);}
    window.addEventListener('pointermove',function(e){
      px=(e.clientX/window.innerWidth-.5)*2;
      py=(e.clientY/window.innerHeight-.5)*2;
      schedule();
    },{passive:true});
    window.addEventListener('scroll',function(){scroll=window.scrollY||0;schedule();},{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
  }

  function wireViewTransitions(){
    let previous=(document.querySelector('.view.active')||{}).id||'';
    const observer=new MutationObserver(function(){
      const active=document.querySelector('.view.active');
      if(!active||active.id===previous)return;
      previous=active.id;
      if(reduceMotion)return;
      active.classList.remove('vfx-shape-enter');
      void active.offsetWidth;
      active.classList.add('vfx-shape-enter');
      window.setTimeout(function(){active.classList.remove('vfx-shape-enter');},650);
    });
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  }

  function init(){
    addScene();addStickers();makeDock();applyPrefs();wireTimer();wireParallax();wireViewTransitions();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();