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
        ['🏅','Achievements','Badges & milestones','view','games',false],
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

  function init(){
    if(!mobile()) return;
    overrideMoreGlobals();
    hideLegacyQuickNav();
    setupDashboardMaster();
    enhanceDashboardSectionMap();
    patchSectionJump();

    // Defensive: a More-sheet open must never leave an invisible blocker behind.
    qs('#moreSheetBackdrop')?.addEventListener('click',closeMore,{passive:true});

    // Escape closes the V3 sheet cleanly.
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape' && document.body.classList.contains('mobile-more-open')) closeMore();
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.VAANI_MOBILE_V3={openMoreSheet:function(){callGlobal('openMoreSheet');},closeMoreSheet:closeMore};
})();
