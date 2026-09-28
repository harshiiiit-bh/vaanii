/* VAANI Defence Notification Centre */
(function(){
  'use strict';
  const app=document.getElementById('notificationHubApp');
  if(!app)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const exams=[
    {id:'nda1',name:'NDA & NA I 2027',short:'NDA I 2027',type:'UPSC Annual Calendar',status:'calendar',notification:'2 December 2026',last:'22 December 2026',exam:'11 April 2027',note:'Dates are scheduled in the UPSC Annual Calendar 2027. DOB, vacancies, eligibility and final application instructions must be taken from the individual notification when released.',url:'https://www.upsc.gov.in/content/annual-calendar-2027-0'},
    {id:'cds1',name:'CDS I 2027',short:'CDS I 2027',type:'UPSC Annual Calendar',status:'calendar',notification:'2 December 2026',last:'22 December 2026',exam:'11 April 2027',note:'Dates are scheduled in the UPSC Annual Calendar 2027. Age limits differ by academy and must be checked against the individual notification.',url:'https://www.upsc.gov.in/content/annual-calendar-2027-0'},
    {id:'nda2',name:'NDA & NA II 2026',short:'NDA II 2026',type:'Official notification',status:'completed',notification:'20 May 2026',last:'9 June 2026',exam:'13 September 2026',dob:'1 January 2008 – 1 January 2011 (both inclusive)',note:'This cycle has concluded. The dates and DOB shown here belong only to NDA-II 2026; they must not be reused for NDA-I 2027.',url:'https://www.upsc.gov.in/'},
    {id:'cds2',name:'CDS II 2027',short:'CDS II 2027',type:'UPSC Annual Calendar',status:'calendar',notification:'20 May 2027',last:'9 June 2027',exam:'19 September 2027',note:'Scheduled in the UPSC Annual Calendar 2027. Final details are subject to the individual notification.',url:'https://www.upsc.gov.in/content/annual-calendar-2027-0'},
    {id:'nda2-27',name:'NDA & NA II 2027',short:'NDA II 2027',type:'UPSC Annual Calendar',status:'calendar',notification:'19 May 2027',last:'8 June 2027',exam:'19 September 2027',note:'Scheduled in the UPSC Annual Calendar 2027. Final eligibility and DOB criteria are not yet confirmed here.',url:'https://www.upsc.gov.in/content/annual-calendar-2027-0'}
  ];
  const links=[
    ['UPSC official website','https://www.upsc.gov.in/'],
    ['UPSC online application portal','https://upsconline.nic.in/'],
    ['UPSC Annual Calendar 2027','https://www.upsc.gov.in/content/annual-calendar-2027-0'],
    ['UPSC active examinations','https://www.upsc.gov.in/examinations/active-examinations'],
    ['UPSC admit cards','https://upsconline.nic.in/'],
    ['AFCAT official portal','https://afcat.edcil.co.in/']
  ];
  app.innerHTML=`
    <div class="nh-hero"><div class="nh-kicker">VAANI · DEFENCE EXAM INTELLIGENCE</div><h1>Notification <em>Centre</em></h1><p>Official dates, eligibility, application guidance and candidate portals — explained in plain language.</p><div class="nh-hero-stats"><span><b>03</b> exam pathways</span><span><b>01</b> unified guide</span><span><b>100%</b> source-labelled</span></div></div>
    <div class="nh-tabs" role="tablist" aria-label="Notification sections"><button class="active" data-nh-tab="overview">Overview</button><button data-nh-tab="otr">OTR / URN Guide</button><button data-nh-tab="eligibility">Eligibility</button><button data-nh-tab="portals">Official Portals</button></div>
    <section class="nh-panel" data-nh-panel="overview"><div class="nh-section-head"><div><span class="nh-eyebrow">LIVE DEFENCE FEED</span><h2>Latest notifications &amp; updates</h2></div><span class="nh-source-tag" id="nhFeedUpdated">Checking official sources…</span></div><div class="nh-alert"><strong>Automatic source watch:</strong> Vaani checks configured official recruitment/exam pages on a schedule and publishes discovered links here. Always open the official notice before applying.</div><div class="nh-feed-toolbar"><input id="nhFeedSearch" type="search" placeholder="Search NDA, Agniveer, BSF, rally…" aria-label="Search notifications"><div class="nh-feed-filters" id="nhFeedFilters"><button class="active" data-filter="ALL">All</button><button data-filter="NDA">NDA</button><button data-filter="CDS">CDS</button><button data-filter="AFCAT">AFCAT</button><button data-filter="CAPF">CAPF</button><button data-filter="AGNIVEER">Agniveer</button><button data-filter="ARMY_RALLY">Rally</button><button data-filter="BSF">BSF</button><button data-filter="CRPF">CRPF</button></div></div><div class="nh-feed-grid" id="nhLiveFeed"><div class="nh-feed-empty">Loading the defence feed…</div></div><div class="nh-feed-note">Sources are organisation-owned public pages. A discovered link is not an endorsement or an eligibility decision.</div><div class="nh-section-head nh-calendar-head"><div><span class="nh-eyebrow">EXAM WATCH</span><h2>Defence exam calendar</h2></div><span class="nh-source-tag">Official-source dates</span></div><div class="nh-alert"><strong>Important:</strong> Annual-calendar dates are schedules, not individual exam notifications. Eligibility, DOB, vacancies and final instructions are confirmed only by the relevant notification.</div><div class="nh-exam-grid" id="nhExamGrid"></div></section>
    <section class="nh-panel" data-nh-panel="otr" hidden><div class="nh-section-head"><div><span class="nh-eyebrow">APPLICATION BASICS</span><h2>OTR / URN, explained simply</h2></div></div><p class="nh-lead">UPSC’s online application system uses a common registration profile. The <b>URN (Universal Registration Number)</b> identifies your registration; the examination-specific application is separate.</p><div class="nh-flow"><div><b>01</b><strong>Create an account</strong><p>Register using your own active email and mobile number.</p></div><i>↓</i><div><b>02</b><strong>Generate your URN</strong><p>Complete the common registration details and keep the URN safe.</p></div><i>↓</i><div><b>03</b><strong>Complete the CAF</strong><p>Fill the Common Application Form carefully, matching your certificates.</p></div><i>↓</i><div><b>04</b><strong>Choose an examination</strong><p>Open the exam-specific module and provide the required details.</p></div><i>↓</i><div><b>05</b><strong>Review and submit</strong><p>Pay the fee if applicable, preview the form and submit before the deadline.</p></div></div><div class="nh-two"><article class="nh-info"><span class="nh-chip">URN</span><h3>Your common registration identity</h3><p>Created during registration and used across UPSC examination applications.</p></article><article class="nh-info"><span class="nh-chip">Application</span><h3>Specific to an exam</h3><p>Each examination has its own application details and submission status. A URN alone does not mean you have applied.</p></article></div><h3 class="nh-subhead">Before you start</h3><div class="nh-checklist"><label><input type="checkbox"> Active mobile number and email</label><label><input type="checkbox"> Matriculation certificate for name and DOB</label><label><input type="checkbox"> Class 10+2 details and subject information</label><label><input type="checkbox"> Accepted photo identity document</label><label><input type="checkbox"> Recent photograph and signature, as specified</label><label><input type="checkbox"> Time to review the completed form</label></div><p class="nh-footnote">The exact fields, upload specifications and documents can change. Follow the live instructions on the official portal for the exam you are applying to.</p></section>
    <section class="nh-panel" data-nh-panel="eligibility" hidden><div class="nh-section-head"><div><span class="nh-eyebrow">PRELIMINARY CHECK</span><h2>Understand your eligibility</h2></div></div><p class="nh-lead">Use this guide to understand the main qualification routes. It is not an official eligibility decision.</p><div class="nh-two"><article class="nh-info"><span class="nh-chip">NDA · Army Wing</span><h3>Educational qualification</h3><p>Class 12 pass or equivalent. Candidates appearing in Class 12 may apply where the notification permits.</p></article><article class="nh-info"><span class="nh-chip">NDA · Air Force / Navy / INA</span><h3>Educational qualification</h3><p>Class 12 with Physics, Chemistry and Mathematics, or equivalent, subject to the notification.</p></article></div><div class="nh-info nh-wide"><span class="nh-chip">CDS</span><h3>Academy-wise qualification</h3><p>IMA and OTA generally require a recognised university degree; Indian Naval Academy requires an engineering degree; Air Force Academy requires a degree with Physics and Mathematics at 10+2 level or a Bachelor of Engineering, subject to the applicable notification and conditions.</p></div><div class="nh-info nh-wide"><span class="nh-chip">AFCAT</span><h3>Branch-specific qualification</h3><p>Flying, Ground Duty (Technical) and Ground Duty (Non-Technical) have different age, education and marks requirements. Check the current IAF notification for your chosen branch; do not assume one qualification covers all branches.</p></div><div class="nh-alert"><strong>DOB rule:</strong> Do not copy an old cycle’s date range into a new cycle. For NDA-I 2027, the DOB range will be shown only after the official notification is released. The NDA-II 2026 DOB range shown in its archived card applies only to that cycle.</div><p class="nh-footnote">Other conditions can include nationality, marital status, gender/academy restrictions, physical and medical standards, and branch-specific requirements. The notification is authoritative.</p></section>
    <section class="nh-panel" data-nh-panel="portals" hidden><div class="nh-section-head"><div><span class="nh-eyebrow">DIRECT LINKS</span><h2>Official websites & candidate login</h2></div></div><p class="nh-lead">These links open the official organisation’s website. Vaani does not collect UPSC/AFCAT passwords and does not imitate the official login.</p><div class="nh-link-grid">'+links.map((x,i)=>'<a class="nh-link-card" href="'+esc(x[1])+'" target="_blank" rel="noopener noreferrer"><span class="nh-link-num">'+String(i+1).padStart(2,'0')+'</span><span><strong>'+esc(x[0])+'</strong><small>Open official website ↗</small></span><b>↗</b></a>').join('')+'</div><div class="nh-alert"><strong>Login tip:</strong> Use the official portal to create your account, retrieve your registration details, apply, and access available admit-card or result services. Never share your password or OTP with anyone.</div></section>
    <div class="nh-footer"><span>VAANI · INFORMATION DESK</span><span>Always verify dates and eligibility in the official notice.</span></div>`;
  const grid=document.getElementById('nhExamGrid');
  const feed=document.getElementById('nhLiveFeed');
  const feedUpdated=document.getElementById('nhFeedUpdated');
  const feedSearch=document.getElementById('nhFeedSearch');
  const feedFilters=document.getElementById('nhFeedFilters');
  let liveItems=[];
  let activeFilter='ALL';

  function feedCard(item){
    const label=String(item.category||'DEFENCE').replace('_',' ');
    const status=String(item.status||item.type||'update').replace(/-/g,' ');
    const seen=item.lastSeen?new Date(item.lastSeen):null;
    const seenText=seen&&!Number.isNaN(seen.valueOf())?seen.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Recently checked';
    return '<article class="nh-feed-card">'+
      '<div class="nh-feed-top"><span class="nh-feed-cat">'+esc(label)+'</span><span class="nh-feed-status">'+esc(status)+'</span></div>'+
      '<h3>'+esc(item.title)+'</h3>'+
      '<p>'+esc(item.summary||'Open the official source for the complete notice and eligibility conditions.')+'</p>'+
      '<div class="nh-feed-meta"><span>'+esc(item.organization||'Official source')+'</span><span>Checked '+esc(seenText)+'</span></div>'+
      '<a class="nh-card-link" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Open official notice/source ↗</a>'+
      '</article>';
  }

  function renderFeed(){
    if(!feed)return;
    const q=(feedSearch?.value||'').trim().toLowerCase();
    const filtered=liveItems.filter(item=>{
      const text=[item.title,item.organization,item.category,item.summary].join(' ').toLowerCase();
      return (activeFilter==='ALL'||item.category===activeFilter) && (!q||text.includes(q));
    }).slice(0,48);
    feed.innerHTML=filtered.length?filtered.map(feedCard).join(''):'<div class="nh-feed-empty">No matching notifications found. Try another filter.</div>';
  }

  feedFilters?.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
    activeFilter=btn.dataset.filter||'ALL';
    feedFilters.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));
    renderFeed();
  }));
  feedSearch?.addEventListener('input',renderFeed);

  fetch('data/defence-notifications.json?v='+Date.now(),{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('feed '+r.status);return r.json();})
    .then(data=>{
      liveItems=Array.isArray(data.items)?data.items:[];
      const stamp=data.generatedAt?new Date(data.generatedAt):null;
      feedUpdated.textContent=stamp&&!Number.isNaN(stamp.valueOf())?'Auto-synced '+stamp.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Auto-synced feed';
      renderFeed();
    })
    .catch(()=>{
      feedUpdated.textContent='Live feed temporarily unavailable';
      feed.innerHTML='<div class="nh-feed-empty">The automatic feed could not be loaded right now. The calendar below remains available.</div>';
    });


  grid.innerHTML=exams.map(e=>'<article class="nh-exam-card"><div class="nh-card-top"><span class="nh-status '+e.status+'">'+(e.status==='completed'?'EXAM COMPLETED':'CALENDAR ONLY')+'</span><span class="nh-cycle">'+esc(e.type)+'</span></div><h3>'+esc(e.name)+'</h3><div class="nh-date-row"><span>Notification</span><b>'+esc(e.notification)+'</b></div><div class="nh-date-row"><span>Application closes</span><b>'+esc(e.last)+'</b></div><div class="nh-date-row exam-date"><span>Exam date</span><b>'+esc(e.exam)+'</b></div>'+(e.dob?'<div class="nh-dob"><span>DOB for this cycle only</span><b>'+esc(e.dob)+'</b></div>':'')+'<p>'+esc(e.note)+'</p><a class="nh-card-link" href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">View official source ↗</a></article>').join('');
  app.querySelectorAll('[data-nh-tab]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.nhTab;app.querySelectorAll('[data-nh-tab]').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-selected',String(b===btn));});app.querySelectorAll('[data-nh-panel]').forEach(p=>p.hidden=p.dataset.nhPanel!==key);}));
})();