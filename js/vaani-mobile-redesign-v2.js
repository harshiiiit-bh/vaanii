/*
 * VAANI MOBILE REDESIGN V2
 * Presentation/interaction layer only. Core learning logic is untouched.
 */
(function(){
  'use strict';

  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
  const q = (s, root=document) => root.querySelector(s);
  const qa = (s, root=document) => Array.from(root.querySelectorAll(s));

  const VIEW_META = {
    dashboard:{title:'Home',meta:'Mission control'},
    grammar:{title:'Grammar Academy',meta:'Learn & test'},
    journey:{title:'Grammar Journey',meta:'Campaign path'},
    topic:{title:'Topic',meta:'Lesson dossier'},
    compare:{title:'Comparisons',meta:'Confusable pairs'},
    'compare-detail':{title:'Comparison',meta:'Pair dossier'},
    vocab:{title:'Vocabulary',meta:'Word mastery'},
    vocab90:{title:'90-Day Vocabulary',meta:'Daily mission'},
    worddetail:{title:'Word Dossier',meta:'Vocabulary detail'},
    books:{title:'Book Reading',meta:'Reading command'},
    pyq:{title:'PYQ Command Vault',meta:'Practice'},
    games:{title:'Arena',meta:'Speed & memory'},
    leaderboard:{title:'Service Record',meta:'Progress'},
    profile:{title:'Profile',meta:'Your dossier'},
    notifications:{title:'Updates',meta:'Latest notices'},
    info:{title:'VAANI Guide',meta:'Help & guidance'}
  };

  const SECTION_MAP = {
    dashboard:[
      ['Mission briefing','#view-dashboard .vd-hero'],
      ["Today's focus",'#view-dashboard .vd-briefing'],
      ['Learning roadmap','#view-dashboard .vd-roadmap'],
      ['Activity & word of day','#view-dashboard .activity-feed'],
      ['XP Arcade','#view-dashboard [aria-label="XP Arcade"]'],
      ['Focus Sprint','#view-dashboard .vd-focus-sprint'],
      ['Achievements','#view-dashboard .vd-badge-grid'],
      ['Lucky Spin','#view-dashboard .spin-card'],
      ['PYQ summary','#view-dashboard .pyq-stat-mini']
    ],
    grammar:[
      ['Grammar tree','#view-grammar .gt-tree-wrap'],
      ['Progress','#view-grammar .gt-sidebar'],
      ['Quick actions','#view-grammar .gt-quickactions'],
      ['Grammar Academy','#view-grammar .ga-catalog']
    ],
    vocab:[
      ['Word of the day','#view-vocab .word-of-day'],
      ['Daily words','#view-vocab .singles-strip'],
      ['Vocabulary tools','#view-vocab .vocab-toolbar'],
      ['Word library','#view-vocab .vv-word-grid']
    ],
    books:[
      ['Reader','#view-books .vbv-scope'],
      ['Book companion','#view-books .bc-global-link']
    ],
    pyq:[
      ['Command vault','#view-pyq #pvApp']
    ],
    games:[
      ['Arena briefing','#view-games .vx-briefing'],
      ['Challenge','#view-games .vx-arena'],
      ['Championship','#view-games .vx-championship']
    ],
    profile:[
      ['Profile','#view-profile .vp-profile-hero'],
      ['Learning path','#view-profile .vp-path-card'],
      ['Rank progress','#view-profile .vp-rank-card'],
      ['Recent activity','#view-profile .vp-activity-card'],
      ['Achievements','#view-profile .vp-achievements']
    ],
    leaderboard:[
      ['Service record','#view-leaderboard .service-hero'],
      ['Personal bests','#view-leaderboard .service-grid'],
      ['Performance','#view-leaderboard .service-signal-grid'],
      ['Seven-day activity','#view-leaderboard .service-week'],
      ['Field log','#view-leaderboard .service-fieldlog']
    ],
    notifications:[
      ['Latest updates','#view-notifications .notification-grid'],
      ['Exam desk','#view-notifications .nc-directory']
    ],
    info:[
      ['Latest updates','#view-info .nc-featured'],
      ['Exam directory','#view-info .nc-directory'],
      ['Calendar','#view-info .nc-accordion']
    ]
  };

  function mobileShell(){
    if(q('.mobile-viewbar')) return;
    const main=q('#mainContent');
    if(!main) return;
    const bar=document.createElement('div');
    bar.className='mobile-viewbar';
    bar.innerHTML=
      '<span class="mobile-viewbar-title">VAANI</span>'+
      '<span class="mobile-viewbar-meta"></span>'+
      '<button class="mobile-viewbar-btn" type="button" aria-haspopup="dialog">Sections</button>';
    main.prepend(bar);

    const btn=q('.mobile-viewbar-btn',bar);
    btn.addEventListener('click',openSectionSheet);
  }

  function updateViewbar(name){
    const bar=q('.mobile-viewbar');
    if(!bar) return;
    const meta=VIEW_META[name]||{title:name,meta:'VAANI'};
    const title=q('.mobile-viewbar-title',bar);
    const sub=q('.mobile-viewbar-meta',bar);
    title.textContent=meta.title;
    sub.textContent=meta.meta;
    const btn=q('.mobile-viewbar-btn',bar);
    btn.style.display=(SECTION_MAP[name]||[]).length ? '' : 'none';
  }

  function ensureSectionSheet(){
    if(q('#mobileSectionSheet')) return q('#mobileSectionSheet');
    const sheet=document.createElement('div');
    sheet.id='mobileSectionSheet';
    sheet.className='mobile-section-sheet';
    sheet.innerHTML=
      '<div class="mobile-section-panel" role="dialog" aria-modal="true" aria-labelledby="mobileSectionTitle">'+
        '<div class="mobile-section-head">'+
          '<strong id="mobileSectionTitle">Sections</strong>'+
          '<button class="mobile-section-close" type="button" aria-label="Close">✕</button>'+
        '</div>'+
        '<div class="mobile-section-links"></div>'+
      '</div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click',e=>{
      if(e.target===sheet) closeSectionSheet();
    });
    q('.mobile-section-close',sheet).addEventListener('click',closeSectionSheet);
    return sheet;
  }

  function openSectionSheet(){
    if(!isMobile()) return;
    const name=currentView();
    const sheet=ensureSectionSheet();
    const links=q('.mobile-section-links',sheet);
    const entries=SECTION_MAP[name]||[];
    links.innerHTML='';
    let count=0;
    entries.forEach(([label,selector])=>{
      const el=q(selector);
      if(!el || el.offsetParent===null) return;
      if(!el.id) el.id='mobile-section-'+name+'-'+count++;
      const b=document.createElement('button');
      b.type='button';
      b.className='mobile-section-link';
      b.innerHTML='<span>'+escapeHtml(label)+'</span><span>JUMP →</span>';
      b.addEventListener('click',()=>{
        closeSectionSheet();
        el.classList.remove('is-collapsed');
        el.scrollIntoView({behavior:'smooth',block:'start'});
      });
      links.appendChild(b);
    });
    if(!links.children.length){
      const empty=document.createElement('div');
      empty.className='sheet-empty';
      empty.textContent='No sections available on this view.';
      links.appendChild(empty);
    }
    sheet.classList.add('show');
    document.body.classList.add('mobile-section-open');
  }

  function closeSectionSheet(){
    const sheet=q('#mobileSectionSheet');
    if(sheet) sheet.classList.remove('show');
    document.body.classList.remove('mobile-section-open');
  }

  function escapeHtml(v){
    return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function currentView(){
    const active=q('.view.active');
    return active ? active.id.replace(/^view-/,'') : 'dashboard';
  }

  function foldKey(el,label){
    return 'vaani.mobile.fold.'+currentView()+'.'+(el.id||label.replace(/\W+/g,'-').toLowerCase());
  }

  function makeFold(el,label,collapsed){
    if(!el || el.dataset.mobileFoldReady==='1') return;
    el.dataset.mobileFoldReady='1';
    el.classList.add('mobile-fold');

    let header=el.querySelector(':scope > .panel-title');
    if(!header) header=el.querySelector(':scope > .vd-briefing-head');
    if(!header) header=el.querySelector(':scope > .section-head');

    if(!header){
      header=document.createElement('div');
      header.className='mobile-fold-head';
      const title=document.createElement('strong');
      title.textContent=label;
      header.appendChild(title);
      el.prepend(header);
    }else{
      header.classList.add('mobile-fold-head');
      if(!header.querySelector('.mobile-fold-label') && !header.matches('.panel-title')){
        const txt=document.createElement('span');
        txt.className='mobile-fold-label';
        txt.textContent=label;
        header.prepend(txt);
      }
    }

    const body=document.createElement('div');
    body.className='mobile-fold-body';

    const nodes=Array.from(el.children);
    nodes.forEach(node=>{
      if(node!==header) body.appendChild(node);
    });
    el.appendChild(body);

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='mobile-fold-toggle';
    toggle.setAttribute('aria-label','Expand '+label);
    toggle.setAttribute('aria-expanded',collapsed?'false':'true');
    toggle.textContent=collapsed?'＋':'−';
    header.appendChild(toggle);

    const saved=localStorage.getItem(foldKey(el,label));
    const initial=saved===null ? !!collapsed : saved==='1';
    setFold(el,initial,label,false);

    toggle.addEventListener('click',e=>{
      e.stopPropagation();
      const next=!el.classList.contains('is-collapsed');
      setFold(el,next,label,true);
    });
  }

  function setFold(el,collapsed,label,persist){
    el.classList.toggle('is-collapsed',collapsed);
    const btn=q('.mobile-fold-toggle',el);
    if(btn){
      btn.textContent=collapsed?'＋':'−';
      btn.setAttribute('aria-expanded',collapsed?'false':'true');
      btn.setAttribute('aria-label',(collapsed?'Expand ':'Collapse ')+label);
    }
    if(persist) localStorage.setItem(foldKey(el,label),collapsed?'1':'0');
  }

  function setupFolds(name){
    if(!isMobile()) return;

    // Long detail pages: keep the core explanation visible, defer supplemental evidence.
    if(name==='worddetail'){
      qa('#view-worddetail > .wd-section').forEach((el,i)=>{
        const heading=el.querySelector('h4')?.textContent?.trim()||'Word details';
        makeFold(el,heading,i>=2);
      });
      qa('#view-worddetail > .wd-grid-2').forEach((el,i)=>{
        if(i>=1) makeFold(el,'Additional word data',true);
      });
    }
    if(name==='compare-detail'){
      qa('#view-compare-detail > .card').forEach((el,i)=>{
        const heading=el.querySelector('.panel-title')?.textContent?.trim()||'Comparison detail';
        makeFold(el,heading,i>=1);
      });
    }

    const configs={
      dashboard:[
        ['#reviewWidgetCard','Mistake notebook',false],
        ['#view-dashboard .vd-roadmap','Learning roadmap',true],
        ['#view-dashboard .grid-2','Activity & daily word',true],
        ['#view-dashboard [aria-label="XP Arcade"]','XP Arcade',true],
        ['#view-dashboard .vd-focus-sprint','Focus Sprint',false],
        ['#view-dashboard .vd-badge-grid','Achievements',true],
        ['#view-dashboard .spin-card','Daily lucky spin',true],
        ['#view-dashboard .pyq-stat-mini','PYQ summary',true]
      ],
      grammar:[
        ['#view-grammar .gt-sidebar','Progress & exam data',true],
        ['#view-grammar .ga-catalog','Grammar Academy',true]
      ],
      compare:[
        ['#view-compare .cmp-library-strip','Comparison library',true],
        ['#view-compare .cmp-spotlight','Spotlight',true]
      ],
      vocab:[
        ['#view-vocab .singles-strip','Daily word cards',false]
      ],
      leaderboard:[
        ['#view-leaderboard .service-signal-grid','Performance signals',true],
        ['#view-leaderboard .service-week','Seven-day activity',true],
        ['#view-leaderboard .service-fieldlog','Field log',true]
      ],
      profile:[
        ['#view-profile .vp-path-card','Learning path',true],
        ['#view-profile .vp-activity-card','Recent activity',true],
        ['#view-profile .vp-achievements','Achievements',true],
        ['#view-profile .vp-rank-card','Rank progress',false]
      ],
      info:[
        ['#view-info .nc-directory','Exam directory',true]
      ]
    };

    (configs[name]||[]).forEach(([sel,label,collapsed])=>{
      let el=q(sel);
      if(!el) return;
      // Inner data grids fold as their containing card so the card heading remains
      // the visible summary instead of inserting a heading into a grid.
      if(el.matches('.vd-roadmap,.vd-badge-grid,.pyq-stat-mini,.activity-feed')){
        el=el.closest('.vd-card')||el;
      }
      makeFold(el,label,collapsed);
    });
  }

  function setupMoreSheet(){
    if(typeof window.showSheetMenu!=='function') return;
    window.showSheetMenu=function(){
      const body=q('#sheetBody');
      const title=q('#sheetTitle');
      const back=q('#sheetBackBtn');
      if(!body) return;
      title.textContent='More';
      back.style.display='none';
      body.innerHTML=
        '<div class="sheet-menu-group">'+
          '<span class="sheet-group-label">Study</span>'+
          category('📘','Learn','Grammar, vocabulary & comparisons','learn')+
          category('🎯','Practice','PYQ vault, tests & Arena','practice')+
          category('📚','Library','Book reading & saved material','library')+
        '</div>'+
        '<div class="sheet-menu-group">'+
          '<span class="sheet-group-label">Your record</span>'+
          category('👤','Progress & account','Profile, statistics & achievements','record')+
          category('📢','Updates','Notifications and exam updates','updates')+
        '</div>'+
        '<div class="sheet-menu-group">'+
          '<span class="sheet-group-label">Support</span>'+
          category('ⓘ','VAANI Guide','How the command center works','guide')+
          category('⚙️','Display & settings','Focus, font and theme controls','settings')+
        '</div>';
    };

    window.showSheetCategory=function(categoryId){
      const body=q('#sheetBody');
      const title=q('#sheetTitle');
      const back=q('#sheetBackBtn');
      if(!body) return;
      const groups={
        learn:[
          ['📘','Grammar','grammar'],
          ['🗂️','Vocabulary','vocab'],
          ['📐','Comparisons','compare']
        ],
        practice:[
          ['🎯','PYQ Command Vault','pyq'],
          ['🎮','Arena','games'],
          ['🧠','Grammar tests','grammar']
        ],
        library:[
          ['📖','Book Reading','books'],
          ['★','Bookmarks','__bookmarks']
        ],
        record:[
          ['👤','Profile','profile'],
          ['📊','Statistics','leaderboard'],
          ['🏅','Achievements','games']
        ],
        updates:[
          ['📢','Notifications','notifications'],
          ['🗓️','Exam desk','info']
        ],
        guide:[
          ['ⓘ','VAANI Guide','__guide']
        ],
        settings:[
          ['◧','Focus & display modes','__settings'],
          ['🌙','Theme','__theme']
        ]
      };
      const list=groups[categoryId]||[];
      title.textContent=categoryId[0].toUpperCase()+categoryId.slice(1);
      back.style.display='flex';
      body.innerHTML=list.map(([icon,label,action])=>
        '<button class="sheet-menu-item" onclick="mobileSheetAction('+JSON.stringify(action)+')">'+
        '<span class="smi-icon">'+icon+'</span><span class="smi-label">'+escapeHtml(label)+'</span><span class="smi-arrow">›</span></button>'
      ).join('');
    };

    window.mobileSheetAction=function(action){
      if(action==='__bookmarks' && typeof showSheetBookmarks==='function'){showSheetBookmarks();return;}
      if(action==='__guide'){closeMoreSheet();openInfoCenter();return;}
      if(action==='__settings'){closeMoreSheet();toggleFocusPanel();return;}
      if(action==='__theme'){closeMoreSheet();toggleTheme();return;}
      closeMoreSheet();
      if(typeof switchView==='function') switchView(action);
    };

    function category(icon,label,sub,id){
      return '<button type="button" class="sheet-category" onclick="showSheetCategory('+JSON.stringify(id)+')">'+
        '<span class="smi-icon">'+icon+'</span><span><span class="smi-label">'+escapeHtml(label)+'</span><small>'+escapeHtml(sub)+'</small></span><span class="smi-arrow">›</span></button>';
    }
  }

  function compactTopQuickAccess(){
    if(!isMobile()) return;
    const qa=q('#view-dashboard .vd-qa');
    if(!qa || qa.dataset.mobileCompact==='1') return;
    qa.dataset.mobileCompact='1';
    // Keep five existing destinations; the fifth moves into More so the strip stays calm.
    const buttons=Array.from(qa.querySelectorAll('button'));
    const profile=buttons.find(b=>(b.textContent||'').trim().toLowerCase()==='profile');
    if(profile) profile.style.display='none';
  }

  function navScrollBehavior(){
    if(!isMobile()) return;
    let last=window.scrollY;
    let ticking=false;
    const nav=q('#bottomNav');
    const onScroll=()=>{
      if(ticking) return;
      ticking=true;
      requestAnimationFrame(()=>{
        const y=window.scrollY;
        if(Math.abs(y-last)>10){
          if(y>last && y>180) nav?.classList.add('mobile-nav-hidden');
          else nav?.classList.remove('mobile-nav-hidden');
          last=y;
        }
        ticking=false;
      });
    };
    window.addEventListener('scroll',onScroll,{passive:true});
  }

  function primaryNavSetup(){
    const nav=q('#bottomNav');
    if(!nav) return;
    qa('button',nav).forEach(b=>{
      b.dataset.mobilePrimary='true';
    });
  }

  function enhanceView(name){
    if(!isMobile()) return;
    mobileShell();
    updateViewbar(name);
    setupFolds(name);
    compactTopQuickAccess();
    closeSectionSheet();
  }

  function patchSwitchView(){
    if(typeof window.switchView!=='function' || window.switchView.__mobileV2) return;
    const original=window.switchView;
    function wrapped(name,options){
      const result=original.apply(this,arguments);
      window.setTimeout(()=>enhanceView(name),0);
      return result;
    }
    wrapped.__mobileV2=true;
    window.switchView=wrapped;
  }

  function init(){
    mobileShell();
    primaryNavSetup();
    setupMoreSheet();
    patchSwitchView();
    enhanceView(currentView());
    navScrollBehavior();

    window.addEventListener('resize',()=>{
      if(isMobile()){
        enhanceView(currentView());
      }else{
        closeSectionSheet();
        q('.mobile-viewbar')?.remove();
        qa('.mobile-fold').forEach(el=>{
          // Desktop never receives the mobile folding rules.
          el.classList.remove('is-collapsed');
        });
      }
    });

    document.addEventListener('keydown',e=>{
      if(e.key==='Escape') closeSectionSheet();
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.VAANI_MOBILE_V2={enhanceView,openSectionSheet,closeSectionSheet};
})();
