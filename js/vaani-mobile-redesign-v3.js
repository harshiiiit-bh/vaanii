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

  /* ----------------------------------------------------------
     MOBILE COMMAND ROOMS
     The mobile experience is a set of finite rooms rather than
     one endlessly stacked dashboard. Rooms switch in-place and
     also respond to horizontal swipe gestures.
  ---------------------------------------------------------- */

  const MOBILE_ROOMS={
    dashboard:[
      {id:'mission',icon:'◎',label:'Mission',selectors:['#view-dashboard .vd-hero','#view-dashboard #reviewWidgetCard','#view-dashboard .vd-briefing']},
      {id:'progress',icon:'◈',label:'Progress',selectors:['#view-dashboard .vd-roadmap','#view-dashboard .grid-2']},
      {id:'practice',icon:'△',label:'Practice',selectors:['#view-dashboard [aria-label="XP Arcade"]','#view-dashboard .vd-focus-sprint','#view-dashboard .pyq-stat-mini']},
      {id:'rewards',icon:'★',label:'Rewards',selectors:['#view-dashboard .quote-panel','#view-dashboard .vd-badge-grid','#view-dashboard .spin-card','#view-dashboard #mysteryBoxWrap']}
    ],
    grammar:[
      {id:'map',icon:'◎',label:'Map',selectors:['#view-grammar .gt-tree-wrap']},
      {id:'progress',icon:'◈',label:'Progress',selectors:['#view-grammar .gt-sidebar']},
      {id:'academy',icon:'▣',label:'Academy',selectors:['#view-grammar .ga-catalog']}
    ],
    vocab:[
      {id:'word',icon:'A',label:'Word',selectors:['#view-vocab .word-of-day']},
      {id:'drill',icon:'↗',label:'Drill',selectors:['#view-vocab .singles-strip','#view-vocab .vocab-toolbar']},
      {id:'library',icon:'▦',label:'Library',selectors:['#view-vocab .vv-word-grid']}
    ],
    vocab90:[
      {id:'briefing',icon:'◎',label:'Briefing',selectors:['#view-vocab90 .v90-hero','#view-vocab90 .v90-toolbar']},
      {id:'days',icon:'01',label:'Days',selectors:['#view-vocab90 .v90-daywise-view']},
      {id:'course',icon:'▦',label:'Full Course',selectors:['#view-vocab90 .v90-all-view','#view-vocab90 .v90-search-results']}
    ],
    books:[
      {id:'reader',icon:'▤',label:'Reader',selectors:['#view-books .vbv-scope']},
      {id:'companion',icon:'⌕',label:'Companion',selectors:['#view-books .bc-global-link']}
    ],
    games:[
      {id:'briefing',icon:'◎',label:'Briefing',selectors:['#view-games .vx-briefing']},
      {id:'arena',icon:'△',label:'Arena',selectors:['#view-games .vx-arena']},
      {id:'championship',icon:'★',label:'Championship',selectors:['#view-games .vx-championship']}
    ],
    compare:[
      {id:'library',icon:'▦',label:'Library',selectors:['#view-compare .cmp-library-strip']},
      {id:'pairs',icon:'⇄',label:'Pairs',selectors:['#view-compare .cmp-spotlight']}
    ],
    profile:[
      {id:'profile',icon:'◎',label:'Profile',selectors:['#view-profile .vp-profile-hero']},
      {id:'path',icon:'↗',label:'Path',selectors:['#view-profile .vp-path-card']},
      {id:'rank',icon:'★',label:'Rank',selectors:['#view-profile .vp-rank-card']},
      {id:'record',icon:'▤',label:'Record',selectors:['#view-profile .vp-activity-card','#view-profile .vp-achievements']}
    ],
    leaderboard:[
      {id:'record',icon:'◎',label:'Record',selectors:['#view-leaderboard .service-hero','#view-leaderboard .service-grid']},
      {id:'signals',icon:'△',label:'Signals',selectors:['#view-leaderboard .service-signal-grid']},
      {id:'activity',icon:'◷',label:'Activity',selectors:['#view-leaderboard .service-week']},
      {id:'field',icon:'▤',label:'Field Log',selectors:['#view-leaderboard .service-fieldlog']}
    ],
    notifications:[
      {id:'updates',icon:'◎',label:'Updates',selectors:['#view-notifications .notification-grid']},
      {id:'exams',icon:'▦',label:'Exam Desk',selectors:['#view-notifications .nc-directory']}
    ],
    info:[
      {id:'featured',icon:'◎',label:'Featured',selectors:['#view-info .nc-featured']},
      {id:'directory',icon:'▦',label:'Directory',selectors:['#view-info .nc-directory']},
      {id:'calendar',icon:'◷',label:'Calendar',selectors:['#view-info .nc-accordion']}
    ]
  };

  const roomState={name:null,rooms:[],index:0,touchX:0,touchY:0};

  function normalizeRoomElement(el){
    if(!el) return null;
    if(el.matches('.vd-roadmap,.vd-badge-grid,.pyq-stat-mini')){
      return el.closest('.card')||el;
    }
    if(el.matches('#activityFeed')){
      return el.closest('.grid-2')||el.closest('.card')||el;
    }
    return el;
  }

  function uniqueElements(selectors){
    const found=[];
    (selectors||[]).forEach(sel=>{
      const raw=qs(sel);
      const el=normalizeRoomElement(raw);
      if(el && !found.includes(el)) found.push(el);
    });
    return found;
  }

  function buildRooms(name){
    return (MOBILE_ROOMS[name]||[])
      .map(room=>({...room,elements:uniqueElements(room.selectors)}))
      .filter(room=>room.elements.length);
  }

  function roomStorageKey(name){
    return 'vaani.mobile.room.'+name;
  }

  function roomSwitcher(){
    return qs('#mobileRoomSwitcher');
  }

  function removeRoomSwitcher(){
    roomSwitcher()?.remove();
    document.body.classList.remove('mobile-rooms-mode');
    roomState.name=null;
    roomState.rooms=[];
    roomState.index=0;
  }

  function ensureRoomSwitcher(name,rooms){
    let bar=roomSwitcher();
    if(!bar){
      bar=document.createElement('nav');
      bar.id='mobileRoomSwitcher';
      bar.className='mobile-room-switcher';
      bar.setAttribute('aria-label','Mobile sections');
      const viewbar=qs('.mobile-viewbar');
      (viewbar||qs('#mainContent'))?.insertAdjacentElement(viewbar?'afterend':'afterbegin',bar);
    }
    bar.innerHTML=
      '<div class="mrs-track">'+
      rooms.map((room,i)=>
        '<button type="button" class="mrs-tab'+(i===roomState.index?' active':'')+'" data-room-index="'+i+'">'+
          '<span class="mrs-icon" aria-hidden="true">'+escapeHtml(room.icon)+'</span>'+
          '<span class="mrs-label">'+escapeHtml(room.label)+'</span>'+
        '</button>'
      ).join('')+
      '</div>'+
      '<div class="mrs-progress" aria-hidden="true"><i></i></div>';

    qsa('.mrs-tab',bar).forEach(btn=>{
      btn.addEventListener('click',()=>{
        setMobileRoom(Number(btn.dataset.roomIndex),true);
      });
    });
  }

  function setMobileRoom(index,scrollTop){
    if(!mobile() || !roomState.rooms.length) return;
    const safe=Math.max(0,Math.min(roomState.rooms.length-1,index));
    roomState.index=safe;
    const room=roomState.rooms[safe];

    roomState.rooms.forEach((candidate,i)=>{
      const active=i===safe;
      candidate.elements.forEach(el=>{
        el.classList.toggle('mobile-room-hidden',!active);
        el.setAttribute('aria-hidden',active?'false':'true');
      });
    });

    const bar=roomSwitcher();
    qsa('.mrs-tab',bar||document).forEach(btn=>{
      const active=Number(btn.dataset.roomIndex)===safe;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
    if(bar){
      const pct=roomState.rooms.length===1?100:((safe+1)/roomState.rooms.length)*100;
      const line=qs('.mrs-progress i',bar);
      if(line) line.style.width=pct+'%';
      qs('.mrs-tab.active',bar)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    }

    localStorage.setItem(roomStorageKey(roomState.name),String(safe));
    if(scrollTop){
      const view=qs('#view-'+roomState.name);
      if(view){
        const top=Math.max(0,(view.getBoundingClientRect().top+window.scrollY)-8);
        window.scrollTo({top,behavior:'smooth'});
      }
    }
  }

  function setupMobileRooms(name){
    if(!mobile()) return;
    const rooms=buildRooms(name);
    if(!rooms.length){
      removeRoomSwitcher();
      return;
    }

    roomState.name=name;
    roomState.rooms=rooms;
    const saved=Number(localStorage.getItem(roomStorageKey(name)));
    roomState.index=Number.isInteger(saved)&&saved>=0&&saved<rooms.length?saved:0;

    const viewbar=qs('.mobile-viewbar');
    const sectionBtn=qs('.mobile-viewbar-btn',viewbar||document);
    if(sectionBtn){
      sectionBtn.style.display='none';
      sectionBtn.setAttribute('aria-hidden','true');
    }

    if(rooms.length<2){
      roomSwitcher()?.remove();
      rooms[0].elements.forEach(el=>{
        el.classList.remove('mobile-room-hidden');
        el.removeAttribute('aria-hidden');
      });
      document.body.classList.remove('mobile-rooms-mode');
      return;
    }

    document.body.classList.add('mobile-rooms-mode');
    ensureRoomSwitcher(name,rooms);
    setMobileRoom(roomState.index,false);

    const main=qs('#mainContent');
    if(main && main.dataset.mobileRoomTouch!=='1'){
      main.dataset.mobileRoomTouch='1';
      main.addEventListener('touchstart',e=>{
        if(!mobile()||!roomState.rooms.length)return;
        const t=e.changedTouches?.[0];
        if(!t)return;
        roomState.touchX=t.clientX;
        roomState.touchY=t.clientY;
      },{passive:true});
      main.addEventListener('touchend',e=>{
        if(!mobile()||!roomState.rooms.length)return;
        const target=e.target;
        if(target?.closest?.('button,a,input,textarea,select,[contenteditable="true"],[data-no-room-swipe]')) return;
        const t=e.changedTouches?.[0];
        if(!t)return;
        const dx=t.clientX-roomState.touchX;
        const dy=t.clientY-roomState.touchY;
        if(Math.abs(dx)<55 || Math.abs(dx)<Math.abs(dy)*1.35)return;
        const scrollBox=target?.closest?.('.scroll-x,.horizontal-scroll');
        if(scrollBox && scrollBox.scrollWidth>scrollBox.clientWidth+8) return;
        setMobileRoom(roomState.index+(dx<0?1:-1),true);
      },{passive:true});
    }
  }

  function hideLegacyQuickNav(){
    const fab=qs('#quickNavBtn'),menu=qs('#quickNavMenu');
    if(fab) fab.setAttribute('aria-hidden','true');
    if(menu) menu.setAttribute('aria-hidden','true');
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

  if(!window.__VAANI_MOBILE_ROOMS_ROUTING__ && typeof window.switchView==='function'){
    window.__VAANI_MOBILE_ROOMS_ROUTING__=true;
    const originalSwitchView=window.switchView;
    window.switchView=function(name){
      const result=originalSwitchView.apply(this,arguments);
      window.setTimeout(()=>{
        if(mobile()) setupMobileRooms(name);
      },100);
      return result;
    };
  }

  function init(){
    if(!mobile()) return;
    overrideMoreGlobals();
    hideLegacyQuickNav();
    replaceMobileDashboardShortcut();
    setupMobileRooms(document.querySelector('.view.active')?.id?.replace(/^view-/,'')||'dashboard');

    // Defensive: a More-sheet open must never leave an invisible blocker behind.
    qs('#moreSheetBackdrop')?.addEventListener('click',closeMore,{passive:true});

    // Escape closes the V3 sheet cleanly.
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape' && document.body.classList.contains('mobile-more-open')) closeMore();
    });

    window.addEventListener('resize',()=>{
      if(mobile()){
        replaceMobileDashboardShortcut();
        setupMobileRooms(document.querySelector('.view.active')?.id?.replace(/^view-/,'')||'dashboard');
      }else{
        qsa('.mobile-room-hidden').forEach(el=>{
          el.classList.remove('mobile-room-hidden');
          el.removeAttribute('aria-hidden');
        });
        removeRoomSwitcher();
      }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.VAANI_MOBILE_V3={openMoreSheet:function(){callGlobal('openMoreSheet');},closeMoreSheet:closeMore};
})();
