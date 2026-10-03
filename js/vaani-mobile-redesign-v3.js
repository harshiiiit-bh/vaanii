/* VAANI MOBILE REDESIGN V3
 * Fix layer:
 * - replaces fragile inline More-menu handlers with delegated events
 * - makes every More destination direct and testable
 * - hides duplicate Quick Actions on mobile (relocated into command menu)
 * - turns the dashboard's many secondary modules into one progressive drawer
 * - keeps all underlying features and desktop behavior intact
 */
(function(){
  'use strict';

  const mobile=()=>window.matchMedia('(max-width:767px)').matches;
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));

  const NAV_ITEMS=[
    {
      group:'STUDY',
      items:[
        ['📘','Grammar','Learn rules & lessons','view','grammar',false],
        ['🗂️','Vocabulary','Word mastery','view','vocab',false],
        ['📐','Comparisons','Confusable pairs','view','compare',false],
        ['📅','90-Day Vocab','Daily vocabulary mission','view','vocab90',false]
      ]
    },
    {
      group:'PRACTICE',
      items:[
        ['🎯','PYQ Vault','Previous-year questions','view','pyq',true],
        ['🎮','Arena','Speed & memory practice','view','games',false],
        ['🧠','Grammar Tests','Timed grammar tests','view','grammar',false],
        ['📖','Book Reading','Reading & practice register','view','books',false]
      ]
    },
    {
      group:'YOUR RECORD',
      items:[
        ['👤','Profile','Cadet profile & preferences','view','profile',false],
        ['📊','Leaderboard','Service record & stats','view','leaderboard',false],
        ['🏅','Achievements','Badges & milestones','action','achievements',false],
        ['📢','Notifications','Updates & announcements','view','notifications',false]
      ]
    },
    {
      group:'SUPPORT',
      items:[
        ['ⓘ','VAANI Guide','How the command center works','action','guide',false],
        ['⚙️','Display & Settings','Focus, font & theme','action','settings',false],
        ['★','Bookmarks','Saved PYQ questions','action','bookmarks',false],
        ['✉️','Feedback','Send a report or suggestion','action','feedback',false]
      ]
    }
  ];

  function callGlobal(name){
    const fn=window[name];
    if(typeof fn==='function'){
      try{return fn.apply(window,Array.prototype.slice.call(arguments,1));}catch(err){
        console.error('[VAANI mobile] '+name+' failed',err);
      }
    }
    return null;
  }

  function closeMore(){
    const sheet=qs('#moreSheet'),back=qs('#moreSheetBackdrop');
    sheet?.classList.remove('show');
    back?.classList.remove('show');
    document.body.classList.remove('mobile-more-open');
    if(document.body.style.overflow==='hidden') document.body.style.overflow='';
  }

  function openView(view){
    closeMore();
    if(view==='books'){
      callGlobal('switchView','books',{preserveScroll:false});
    }else{
      callGlobal('switchView',view,{preserveScroll:false});
    }
  }

  function renderMore(){
    const body=qs('#sheetBody'),title=qs('#sheetTitle'),back=qs('#sheetBackBtn');
    if(!body) return;
    if(title) title.textContent='More';
    if(back) back.style.display='none';

    let html=
      '<div class="mobile-more-intro">'+
        '<strong>Command menu</strong>'+
        '<span>All secondary features are here. Nothing has been removed; they are grouped so the main screen stays clean.</span>'+
      '</div>';

    NAV_ITEMS.forEach(section=>{
      html+='<section class="mobile-more-group">';
      html+='<div class="mobile-more-group-title">'+section.group+'</div>';
      html+='<div class="mobile-more-grid">';
      section.items.forEach(([icon,label,sub,type,value,feature])=>{
        html+=
          '<button type="button" class="mobile-more-item'+(feature?' is-feature':'')+'"'+
          ' data-more-type="'+type+'" data-more-value="'+escapeAttr(value)+'">'+
            '<span class="more-ico" aria-hidden="true">'+icon+'</span>'+
            '<span class="more-label">'+escapeHtml(label)+'</span>'+
            '<span class="more-sub">'+escapeHtml(sub)+'</span>'+
            '<span class="more-arrow" aria-hidden="true">›</span>'+
          '</button>';
      });
      html+='</div></section>';
    });

    body.innerHTML=html;
  }

  function escapeHtml(v){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  const escapeAttr=escapeHtml;

  function handleMoreClick(e){
    const item=e.target.closest('.mobile-more-item');
    if(!item) return;
    e.preventDefault();
    e.stopPropagation();
    const type=item.dataset.moreType;
    const value=item.dataset.moreValue;
    if(type==='view'){openView(value);return;}
    if(value==='guide'){
      closeMore();
      if(typeof window.openInfoCenter==='function') callGlobal('openInfoCenter');
      else qs('#infoBtn')?.click();
      return;
    }
    if(value==='settings'){
      closeMore();
      callGlobal('toggleFocusPanel');
      return;
    }
    if(value==='achievements'){
      closeMore();
      callGlobal('switchView','profile',{preserveScroll:false});
      window.setTimeout(()=>{
        const target=qs('#view-profile .vp-achievements');
        target?.scrollIntoView?.({behavior:'smooth',block:'start'});
      },120);
      return;
    }
    if(value==='bookmarks'){
      const oldShow=window.showSheetBookmarks;
      if(typeof oldShow==='function'){
        oldShow();
      }else{
        if(qs('#sheetBody')) qs('#sheetBody').innerHTML='<div class="sheet-empty">Bookmarks are available from the PYQ cards.</div>';
      }
      return;
    }
    if(value==='feedback'){
      if(typeof window.showSheetFeedback==='function') window.showSheetFeedback();
      else {
        const body=qs('#sheetBody');
        if(body) body.innerHTML='<div class="sheet-about"><p>Send VAANI feedback by email.</p><a class="btn" href="mailto:h29417221@gmail.com?subject=VAANI%20Feedback">✉️ Email Feedback</a></div>';
      }
      return;
    }
  }

  function bindMore(){
    const body=qs('#sheetBody');
    if(!body || body.dataset.mobileV3Bound==='1') return;
    body.dataset.mobileV3Bound='1';
    body.addEventListener('click',handleMoreClick);
  }

  function overrideMoreGlobals(){
    window.showSheetMenu=function(){
      if(!mobile()) return;
      renderMore();
      bindMore();
    };

    window.openMoreSheet=function(){
      const sheet=qs('#moreSheet'),back=qs('#moreSheetBackdrop');
      if(!sheet||!back) return;
      renderMore();
      bindMore();
      back.classList.add('show');
      sheet.classList.add('show');
      document.body.classList.add('mobile-more-open');
      document.body.style.overflow='hidden';
      const close=qs('.sheet-close',sheet);
      close?.focus?.();
    };

    window.closeMoreSheet=function(){closeMore();};
  }

  function setupDashboardMaster(){
    if(!mobile()) return;
    const view=qs('#view-dashboard');
    if(!view || view.dataset.mobileV3Dashboard==='1') return;

    const briefing=qs('.vd-briefing',view);
    const focus=qs('.vd-focus-sprint',view);
    if(!briefing || !focus) return;

    const more=qs('.mobile-dashboard-more');
    if(more){
      view.dataset.mobileV3Dashboard='1';
      return;
    }

    const roadmap=qs('.vd-roadmap',view)?.closest('.card');
    const activity=qs('#activityFeed',view)?.closest('.grid-2');
    const arcade=qs('[aria-label="XP Arcade"]',view);
    const quote=qs('.quote-panel',view);
    const achievements=qs('.vd-badge-grid',view)?.closest('.card');
    const spin=qs('.spin-card',view);
    const mystery=qs('#mysteryBoxWrap',view);
    const pyq=qs('.pyq-stat-mini',view)?.closest('.card');

    const nodes=[roadmap,activity,arcade,quote,achievements,spin,mystery,pyq].filter(Boolean);
    if(!nodes.length) return;

    const shell=document.createElement('section');
    shell.className='mobile-dashboard-more is-collapsed';
    shell.setAttribute('aria-label','More dashboard modules');

    const head=document.createElement('button');
    head.type='button';
    head.className='mobile-dashboard-more-head';
    head.innerHTML=
      '<span class="m3-more-mark">≡</span>'+
      '<span class="m3-more-copy"><strong>More on your dashboard</strong><small>Roadmap · activity · XP · achievements · PYQ insights</small></span>'+
      '<span class="m3-more-plus" aria-hidden="true"></span>';

    const body=document.createElement('div');
    body.className='mobile-dashboard-more-body';

    nodes.forEach(n=>body.appendChild(n));
    shell.appendChild(head);
    shell.appendChild(body);

    // Put Focus Sprint before the long analytics drawer.
    briefing.insertAdjacentElement('afterend',focus);
    focus.insertAdjacentElement('afterend',shell);

    head.addEventListener('click',()=>{
      const collapsed=shell.classList.toggle('is-collapsed');
      localStorage.setItem('vaani.mobile.dashboard.more',collapsed?'1':'0');
      head.setAttribute('aria-expanded',collapsed?'false':'true');
      if(!collapsed) body.scrollIntoView({behavior:'smooth',block:'start'});
    });

    const saved=localStorage.getItem('vaani.mobile.dashboard.more');
    const collapsed=saved===null ? true : saved==='1';
    shell.classList.toggle('is-collapsed',collapsed);
    head.setAttribute('aria-expanded',collapsed?'false':'true');

    view.dataset.mobileV3Dashboard='1';
  }

  function enhanceDashboardSectionMap(){
    const view=qs('#view-dashboard');
    const shell=qs('.mobile-dashboard-more',view);
    if(!view||!shell) return;

    // Section jumps should open the master drawer when the target lives inside it.
    window.VAANI_MOBILE_V3_DASHBOARD_SHELL=shell;
  }

  function patchSectionJump(){
    const open=window.VAANI_MOBILE_V2?.openSectionSheet;
    if(typeof open!=='function' || open.__v3patched) return;
    // Leave the existing sheet builder intact; only make dashboard jumps reveal the drawer.
    // This is handled through capture on section-link clicks because V2 creates them dynamically.
    const observer=new MutationObserver(()=>{
      qsa('#mobileSectionSheet .mobile-section-link').forEach(btn=>{
        if(btn.dataset.v3Bound==='1') return;
        btn.dataset.v3Bound='1';
        btn.addEventListener('click',()=>{
          const shell=window.VAANI_MOBILE_V3_DASHBOARD_SHELL;
          if(shell){
            const text=(btn.textContent||'').toLowerCase();
            if(/roadmap|activity|xp|achievement|lucky|pyq|word|focus/.test(text)){
              shell.classList.remove('is-collapsed');
              shell.querySelector('.mobile-dashboard-more-head')?.setAttribute('aria-expanded','true');
              localStorage.setItem('vaani.mobile.dashboard.more','0');
            }
          }
        },true);
      });
    });
    observer.observe(document.body,{subtree:true,childList:true});
    open.__v3patched=true;
  }

  function hideLegacyQuickNav(){
    const fab=qs('#quickNavBtn'),menu=qs('#quickNavMenu');
    if(fab) fab.setAttribute('aria-hidden','true');
    if(menu) menu.setAttribute('aria-hidden','true');
  }


  /* ----------------------------------------------------------
     MOBILE COMMAND DECK
     Long mobile pages are now navigated as finite mission chapters.
     It does not alter desktop scrolling or the underlying view logic.
  ---------------------------------------------------------- */
  const CHAPTERS={
    dashboard:[
      ['Mission briefing','#view-dashboard .vd-hero'],
      ["Today's focus",'#view-dashboard .vd-briefing'],
      ['Focus sprint','#view-dashboard .vd-focus-sprint'],
      ['More modules','#view-dashboard .mobile-dashboard-more'],
      ['Practice','#view-dashboard .ga-catalog']
    ],
    grammar:[
      ['Grammar map','#view-grammar .gt-tree-wrap'],
      ['Progress','#view-grammar .gt-sidebar'],
      ['Quick actions','#view-grammar .gt-quickactions'],
      ['Academy','#view-grammar .ga-catalog']
    ],
    vocab:[
      ['Word of the day','#view-vocab .word-of-day'],
      ['Daily words','#view-vocab .singles-strip'],
      ['Tools','#view-vocab .vocab-toolbar'],
      ['Word library','#view-vocab .vv-word-grid']
    ],
    vocab90:[
      ['Daily mission','#view-vocab90'],
      ['Today','#view-vocab90 .v90-day'],
      ['Vocabulary deck','#view-vocab90 .v90-section']
    ],
    books:[
      ['Reading desk','#view-books .vbv-scope'],
      ['Book companion','#view-books .bc-global-link']
    ],
    pyq:[
      ['Command vault','#view-pyq #pvApp']
    ],
    games:[
      ['Briefing','#view-games .vx-briefing'],
      ['Arena','#view-games .vx-arena'],
      ['Championship','#view-games .vx-championship']
    ],
    compare:[
      ['Comparison library','#view-compare .cmp-library-strip'],
      ['Precision pairs','#view-compare .cmp-spotlight']
    ],
    profile:[
      ['Profile','#view-profile .vp-profile-hero'],
      ['Learning path','#view-profile .vp-path-card'],
      ['Rank','#view-profile .vp-rank-card'],
      ['Activity','#view-profile .vp-activity-card'],
      ['Achievements','#view-profile .vp-achievements']
    ],
    leaderboard:[
      ['Service record','#view-leaderboard .service-hero'],
      ['Personal bests','#view-leaderboard .service-grid'],
      ['Performance','#view-leaderboard .service-signal-grid'],
      ['Activity','#view-leaderboard .service-week'],
      ['Field log','#view-leaderboard .service-fieldlog']
    ],
    notifications:[
      ['Updates','#view-notifications .notification-grid'],
      ['Exam desk','#view-notifications .nc-directory']
    ],
    info:[
      ['Featured','#view-info .nc-featured'],
      ['Exam directory','#view-info .nc-directory'],
      ['Calendar','#view-info .nc-accordion']
    ]
  };

  let missionDeck={name:null,items:[],index:0};

  function getMissionItems(name){
    const defs=CHAPTERS[name]||[];
    return defs.map(([label,selector])=>{
      const el=qs(selector);
      return el?{label,el}:null;
    }).filter(Boolean);
  }

  function removeMissionDeck(){
    qs('#mobileMissionDeck')?.remove();
    missionDeck={name:null,items:[],index:0};
  }

  function renderMissionDeck(name){
    if(!mobile()) return;
    const view=qs('#view-'+name);
    if(!view) return;
    const items=getMissionItems(name);
    if(items.length<2){
      removeMissionDeck();
      return;
    }

    let deck=qs('#mobileMissionDeck');
    if(!deck){
      deck=document.createElement('aside');
      deck.id='mobileMissionDeck';
      deck.setAttribute('aria-label','Mobile mission navigator');
      document.body.appendChild(deck);
    }

    missionDeck={name,items,index:0};

    deck.innerHTML=
      '<div class="mdeck-top">'+
        '<span class="mdeck-kicker">MOBILE MISSION</span>'+
        '<span class="mdeck-count" id="mdeckCount"></span>'+
      '</div>'+
      '<div class="mdeck-main">'+
        '<button type="button" class="mdeck-btn" id="mdeckPrev" aria-label="Previous section">‹</button>'+
        '<div class="mdeck-current">'+
          '<strong id="mdeckTitle"></strong>'+
          '<div class="mdeck-dots" id="mdeckDots" aria-hidden="true"></div>'+
        '</div>'+
        '<button type="button" class="mdeck-btn" id="mdeckNext" aria-label="Next section">›</button>'+
      '</div>';

    const prev=qs('#mdeckPrev',deck),next=qs('#mdeckNext',deck);
    prev?.addEventListener('click',()=>moveMission(-1));
    next?.addEventListener('click',()=>moveMission(1));

    updateMissionDeck();
  }

  function updateMissionDeck(){
    const deck=qs('#mobileMissionDeck');
    if(!deck||!missionDeck.items.length)return;
    const {items,index}=missionDeck;
    const item=items[index];
    const title=qs('#mdeckTitle',deck);
    const count=qs('#mdeckCount',deck);
    const dots=qs('#mdeckDots',deck);
    if(title)title.textContent=item.label;
    if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');
    if(dots)dots.innerHTML=items.map((_,i)=>'<i class="'+(i===index?'active':'')+'"></i>').join('');
    if(item.el){
      item.el.classList.add('mdeck-target');
      item.el.style.setProperty('--mdeck-index',String(index));
    }
    const p=qs('#mdeckPrev',deck),n=qs('#mdeckNext',deck);
    if(p)p.disabled=index===0;
    if(n)n.disabled=index===items.length-1;
  }

  function moveMission(delta){
    if(!mobile()||!missionDeck.items.length)return;
    const next=Math.max(0,Math.min(missionDeck.items.length-1,missionDeck.index+delta));
    if(next===missionDeck.index)return;
    missionDeck.index=next;
    updateMissionDeck();
    missionDeck.items[next].el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function setupMobileMissionDeck(name){
    if(!mobile())return;
    renderMissionDeck(name);
  }

  function patchMobileViewRouting(){
    if(window.__VAANI_MOBILE_MISSION_ROUTING__)return;
    window.__VAANI_MOBILE_MISSION_ROUTING__=true;

    const original=window.switchView;
    if(typeof original!=='function')return;
    window.switchView=function(name){
      const result=original.apply(this,arguments);
      window.setTimeout(()=>{
        if(mobile())setupMobileMissionDeck(name);
        else removeMissionDeck();
      },80);
      return result;
    };

    window.addEventListener('scroll',()=>{
      if(!mobile()||!missionDeck.items.length)return;
      const threshold=window.scrollY+Math.max(90,window.innerHeight*.28);
      let closest=0,best=Infinity;
      missionDeck.items.forEach((item,i)=>{
        const top=Math.abs(item.el.getBoundingClientRect().top+window.scrollY-threshold);
        if(top<best){best=top;closest=i;}
      });
      if(closest!==missionDeck.index){
        missionDeck.index=closest;
        updateMissionDeck();
      }
    },{passive:true});
  }

  function replaceMobileDashboardShortcut(){
    if(!mobile())return;
    const qa=qs('#view-dashboard .vd-qa');
    if(!qa||qa.dataset.mobileBooksShortcut==='1')return;

    const vocab=Array.from(qa.querySelectorAll('button')).find(
      b=>(b.textContent||'').trim().toLowerCase()==='vocab'
    );
    if(!vocab)return;

    vocab.setAttribute('onclick',"switchView('books')");
    vocab.setAttribute('aria-label','Open Book Reading');
    vocab.dataset.mobileOriginalShortcut='vocab';
    vocab.innerHTML=
      '<span class="vd-qa-ico" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+
          '<path d="M5 4.5h10.8A3.2 3.2 0 0 1 19 7.7V19H8.2A3.2 3.2 0 0 1 5 15.8V4.5Z"/>'+
          '<path d="M8 19V7.7A3.2 3.2 0 0 1 11.2 4.5"/>'+
          '<path d="M9.5 9h6.5M9.5 12h6.5"/>'+
        '</svg>'+
      '</span><span>Books</span>';
    qa.dataset.mobileBooksShortcut='1';
  }

  function init(){
    if(!mobile()) return;
    overrideMoreGlobals();
    hideLegacyQuickNav();
    setupDashboardMaster();
    enhanceDashboardSectionMap();
    patchSectionJump();
    replaceMobileDashboardShortcut();
    patchMobileViewRouting();
    setupMobileMissionDeck(document.querySelector('.view.active')?.id?.replace(/^view-/,'')||'dashboard');

    // Defensive: a More-sheet open must never leave an invisible blocker behind.
    qs('#moreSheetBackdrop')?.addEventListener('click',closeMore,{passive:true});

    // Escape closes the V3 sheet cleanly.
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape' && document.body.classList.contains('mobile-more-open')) closeMore();
    });
    window.addEventListener('resize',()=>{
      if(mobile()){
        replaceMobileDashboardShortcut();
        setupMobileMissionDeck(document.querySelector('.view.active')?.id?.replace(/^view-/,'')||'dashboard');
      }else{
        removeMissionDeck();
      }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.VAANI_MOBILE_V3={openMoreSheet:function(){callGlobal('openMoreSheet');},closeMoreSheet:closeMore};
})();
