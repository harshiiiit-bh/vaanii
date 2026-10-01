/* ============================================================
   VAANI INFO CENTER
   Dedicated guide + post-update first-visit briefing.
============================================================ */
(function(){
  const INFO_TOUR_VERSION='20261002-info-center1';
  const TOUR_TEXT='Welcome to VAANI, aspirant. I have moved the how-to information into one clean guide. Tap the new info button anytime to understand every feature, every XP rule and every part of your learning system.';

  const officerSVG =
    '<svg class="vi-officer-svg" viewBox="0 0 210 300" role="img" aria-label="Illustration of an Indian Army officer">'+
      '<defs>'+
        '<linearGradient id="viUniform" x1="0" x2="1"><stop offset="0" stop-color="#2f5a43"/><stop offset="1" stop-color="#183a2b"/></linearGradient>'+
        '<linearGradient id="viSkin" x1="0" x2="1"><stop offset="0" stop-color="#9a5f3c"/><stop offset="1" stop-color="#c7865f"/></linearGradient>'+
      '</defs>'+
      '<g class="vi-officer-bob">'+
        '<ellipse cx="111" cy="288" rx="63" ry="8" fill="rgba(0,0,0,.25)"/>'+
        '<path d="M69 130 Q108 110 149 130 L169 215 Q154 230 111 232 Q72 230 54 215Z" fill="url(#viUniform)" stroke="#10271c" stroke-width="3"/>'+
        '<path d="M78 137 L105 160 L90 186 L64 165Z" fill="#406e53"/>'+
        '<path d="M144 137 L117 160 L132 186 L158 165Z" fill="#406e53"/>'+
        '<path d="M93 214 H129 V270 H93Z" fill="#172a21"/>'+
        '<path d="M72 206 H91 V274 H63Z" fill="#234333"/>'+
        '<path d="M129 206 H149 L159 274 H132Z" fill="#234333"/>'+
        '<path d="M62 271 H92 V284 H57 Q55 275 62 271Z" fill="#131a1d"/>'+
        '<path d="M133 271 H159 Q167 275 167 284 H132Z" fill="#131a1d"/>'+
        '<path d="M92 155 Q111 169 129 155 L127 187 Q111 198 94 187Z" fill="#d6b18d" opacity=".95"/>'+
        '<path d="M98 159 L111 181 L124 159" fill="#f6f6f2"/>'+
        '<path d="M98 160 L111 172 L124 160 L121 151 H101Z" fill="#0f2831"/>'+
        '<circle cx="111" cy="91" r="34" fill="url(#viSkin)" stroke="#71432a" stroke-width="2"/>'+
        '<path d="M79 91 Q111 54 143 91 Q139 63 111 59 Q83 63 79 91Z" fill="#17251d"/>'+
        '<path d="M78 86 Q112 54 146 86 L139 99 Q112 80 84 99Z" fill="#1b2920"/>'+
        '<path d="M74 82 Q111 61 148 82 L145 95 Q112 78 77 95Z" fill="#23382c"/>'+
        '<rect x="100" y="69" width="22" height="6" rx="3" fill="#d8ae48"/>'+
        '<circle cx="111" cy="71.5" r="4" fill="#d8ae48"/>'+
        '<path d="M96 105 Q111 112 126 105" fill="none" stroke="#6b3d29" stroke-width="2" stroke-linecap="round"/>'+
        '<path d="M96 96 Q101 92 106 96 M116 96 Q121 92 126 96" fill="none" stroke="#4a2d20" stroke-width="2" stroke-linecap="round"/>'+
        '<rect x="74" y="188" width="74" height="9" rx="4" fill="#3b2a16"/>'+
        '<rect x="99" y="186" width="24" height="14" rx="3" fill="#d8ae48"/>'+
        '<circle cx="111" cy="193" r="3" fill="#183a2b"/>'+
        '<g class="vi-officer-salute">'+
          '<path d="M143 150 Q164 147 171 127 Q176 114 168 106 Q161 103 156 113 L146 134Z" fill="url(#viSkin)" stroke="#71432a" stroke-width="2"/>'+
          '<path d="M167 108 L183 111 Q187 121 181 128 L169 126Z" fill="url(#viSkin)" stroke="#71432a" stroke-width="2"/>'+
        '</g>'+
        '<rect x="61" y="143" width="18" height="9" rx="2" fill="#d8ae48"/>'+
        '<rect x="143" y="143" width="18" height="9" rx="2" fill="#d8ae48"/>'+
        '<circle cx="83" cy="147.5" r="3" fill="#d8ae48"/>'+
        '<circle cx="139" cy="147.5" r="3" fill="#d8ae48"/>'+
        '<path d="M95 176 H127" stroke="#d8ae48" stroke-width="2" stroke-dasharray="3 3"/>'+
      '</g>'+
    '</svg>';

  function positionTourSpot(){
    const btn=document.getElementById('infoBtn');
    const tour=document.getElementById('viTour');
    if(!btn||!tour)return;
    const r=btn.getBoundingClientRect();
    tour.style.setProperty('--vi-spot-x',(r.left+r.width/2)+'px');
    tour.style.setProperty('--vi-spot-y',(r.top+r.height/2)+'px');
  }

  function markTourSeen(){
    if(typeof State==='undefined')return;
    State.infoTourVersion=INFO_TOUR_VERSION;
    State.infoTourSeenAt=Date.now();
    if(typeof saveState==='function')saveState();
  }

  function closeTour(){
    markTourSeen();
    const el=document.getElementById('viTour');
    if(el)el.classList.remove('open');
    document.body.classList.remove('vi-tour-lock');
  }

  function buildTour(){
    if(document.getElementById('viTour'))return;
    const el=document.createElement('div');
    el.id='viTour';
    el.className='vi-tour';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-labelledby','viTourTitle');
    el.innerHTML =
      '<div class="vi-tour-ring" aria-hidden="true"></div>'+
      '<div class="vi-tour-scene">'+
        '<div class="vi-tour-officer" aria-hidden="true">'+officerSVG+'</div>'+
        '<div class="vi-tour-bubble">'+
          '<div class="vi-tour-kicker">FIELD BRIEFING · UPDATE 01</div>'+
          '<h3 id="viTourTitle">Your VAANI field manual</h3>'+
          '<p><span id="viTourText" class="vi-tour-type"></span><span class="vi-tour-cursor" aria-hidden="true"></span></p>'+
          '<div class="vi-tour-actions" id="viTourActions">'+
            '<button type="button" class="btn" id="viTourOpen">Open Guide</button>'+
            '<button type="button" class="btn ghost" id="viTourSkip">Skip briefing</button>'+
          '</div>'+
          '<div class="vi-tour-note">This briefing appears once after this update. The guide remains available from the ⓘ button.</div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(el);
    document.getElementById('viTourOpen').addEventListener('click',function(){
      markTourSeen();
      el.classList.remove('open');
      document.body.classList.remove('vi-tour-lock');
      if(typeof openInfoCenter==='function')openInfoCenter();
    });
    document.getElementById('viTourSkip').addEventListener('click',closeTour);
  }

  function typeTourText(){
    const host=document.getElementById('viTourText');
    const actions=document.getElementById('viTourActions');
    if(!host||!actions)return;
    host.textContent='';
    let i=0;
    function tick(){
      if(i>=TOUR_TEXT.length){actions.classList.add('show');return;}
      host.textContent+=TOUR_TEXT.charAt(i++);
      window.setTimeout(tick,16);
    }
    window.setTimeout(tick,1150);
  }

  function maybeShowInfoTour(){
    if(typeof ACTIVE_CODE==='undefined'||!ACTIVE_CODE)return;
    if(typeof State==='undefined')return;
    if(State.infoTourVersion===INFO_TOUR_VERSION)return;
    buildTour();
    requestAnimationFrame(function(){
      positionTourSpot();
      const el=document.getElementById('viTour');
      if(el)el.classList.add('open');
      document.body.classList.add('vi-tour-lock');
      typeTourText();
    });
  }

  const INFO_HTML = [
    '<div class="vi-shell">',
      '<section class="vi-hero reveal">',
        '<div class="vi-hero-grid">',
          '<div><div class="vi-kicker">VAANI FIELD MANUAL · INFORMATION CENTRE</div><h1 id="viTitle">Know the system. Then master it.</h1><p>One dedicated place for every important explanation in VAANI — navigation, learning modules, PYQs, XP, streaks, profile progress, account safety and the tools that make the platform work.</p><div class="vi-hero-actions"><button class="btn" type="button" onclick="switchView(\\'dashboard\\')">← Back to VAANI</button><button class="btn ghost" type="button" onclick="openGlobalSearch()">⌕ Search VAANI</button></div></div>',
          '<div class="vi-command-art" aria-hidden="true"><svg viewBox="0 0 420 290"><g class="vi-svg-orbit" fill="none" stroke="rgba(230,198,111,.42)" stroke-width="1.5"><ellipse cx="210" cy="145" rx="150" ry="62"/><ellipse cx="210" cy="145" rx="150" ry="62" transform="rotate(58 210 145)"/><ellipse cx="210" cy="145" rx="150" ry="62" transform="rotate(-58 210 145)"/></g><circle cx="210" cy="145" r="58" fill="rgba(201,162,75,.13)" stroke="rgba(230,198,111,.64)" stroke-width="2"/><circle class="vi-svg-pulse" cx="210" cy="145" r="32" fill="none" stroke="#e6c66f" stroke-width="2"/><path class="vi-svg-dash" d="M78 235 C142 190 273 190 345 76" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-dasharray="8 10"/><circle cx="210" cy="145" r="10" fill="#e6c66f"/><path d="M192 167 L210 110 L228 167 L210 184Z" fill="#fff" opacity=".9"/><path d="M202 167 L210 129 L218 167" fill="#1b2a34"/></svg></div>',
        '</div>',
      '</section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>Start here</h2><p>The four things every aspirant should understand first.</p></div></div><div class="vi-flow">',
        '<div class="vi-step"><div class="vi-step-num">01</div><h3>Your account</h3><p>VAANI uses an account code to restore your saved learning record. Keep the code safe.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">02</div><h3>Pick a route</h3><p>Use the bottom navigation on mobile or the desktop navigation to move between learning areas.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">03</div><h3>Practice</h3><p>Learn a concept, answer questions, work PYQs, review mistakes and return to weak areas.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">04</div><h3>Track progress</h3><p>XP, streaks, grammar progress, attempts, bookmarks and your service record update as you learn.</p></div>',
      '</div></section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>The VAANI map</h2><p>What each major area is for.</p></div></div><div class="vi-grid">',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">📘</div><h3>Grammar Academy</h3></div><p>Study rule-based English lessons, examples, diagrams and topic checks. Correct answers earn the standard question XP.</p><div class="vi-chip-row"><span class="vi-chip">Lessons</span><span class="vi-chip">Topic checks</span><span class="vi-chip">Mistake review</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🔄</div><h3>Comparisons</h3></div><p>Train on commonly confused words and structures with focused drills built around distinctions that matter in exams.</p><div class="vi-chip-row"><span class="vi-chip">Confusables</span><span class="vi-chip">Drills</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">📚</div><h3>Vocabulary Vault</h3></div><p>Learn curated words, meanings, examples, synonyms and antonyms. Mark a word learned to record vocabulary progress.</p><div class="vi-chip-row"><span class="vi-chip">Word of day</span><span class="vi-chip">Register</span><span class="vi-chip">Test</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">📖</div><h3>Book Reading</h3></div><p>Read inside the dedicated reading workspace and save discoveries into the reading vocabulary register.</p><div class="vi-chip-row"><span class="vi-chip">Reader</span><span class="vi-chip">Notes</span><span class="vi-chip">Vocab capture</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🎯</div><h3>PYQ Command Vault</h3></div><p>Work previous-year questions by exam, year and session. Practice individual questions or run a full paper simulation.</p><div class="vi-chip-row"><span class="vi-chip">NDA</span><span class="vi-chip">CDS</span><span class="vi-chip">AFCAT</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">⚔️</div><h3>Arena</h3></div><p>Use quick memory and speed activities for variety. These activities can give separate bonus XP in addition to correct-answer XP.</p><div class="vi-chip-row"><span class="vi-chip">Match game</span><span class="vi-chip">Combos</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">👤</div><h3>Profile &amp; service record</h3></div><p>See your XP, streak, learning milestones, service-rank progression, recent transactions and long-term statistics.</p><div class="vi-chip-row"><span class="vi-chip">XP ledger</span><span class="vi-chip">Milestones</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🔔</div><h3>Notifications &amp; updates</h3></div><p>Use the updates area for platform notices and current information. External links open in the relevant official portal.</p><div class="vi-chip-row"><span class="vi-chip">Updates</span><span class="vi-chip">Official links</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🔎</div><h3>Search &amp; focus tools</h3></div><p>Search across lessons, vocabulary and PYQs. Focus mode reduces distractions when you want a concentrated session.</p><div class="vi-chip-row"><span class="vi-chip">Search</span><span class="vi-chip">Focus</span><span class="vi-chip">Quick actions</span></div></article>',
      '</div></section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>⚡ XP system</h2><p>The progression rules live here instead of being scattered across the website.</p></div></div><div class="vi-card vi-xp">',
        '<div class="vi-xp-equation"><span class="vi-xp-node">Correct answer × +2 XP</span><span class="vi-xp-arrow">＋</span><span class="vi-xp-node">Accuracy adjustment</span><span class="vi-xp-arrow">＋</span><span class="vi-xp-node">Net-marks adjustment</span><span class="vi-xp-arrow">＝</span><span class="vi-xp-node">Paper XP result</span></div>',
        '<div class="vi-rule-grid">',
          '<div class="vi-rule"><strong>Correct answers</strong><span>Every correct question earns +2 XP. The base amount is identical regardless of the paper or module.</span></div>',
          '<div class="vi-rule"><strong>No daily cap</strong><span>There is no maximum amount of XP you can legitimately earn in one calendar day.</span></div>',
          '<div class="vi-rule"><strong>Accuracy deductions</strong><span>60–69%: −10 · 50–59%: −20 · 40–49%: −45 · 33–39%: −60 · below 33%: −80. 70%+ has no accuracy deduction.</span></div>',
          '<div class="vi-rule"><strong>Paper net-marks deductions</strong><span>70%+: −5 · 50–69%: −8 · 33–49%: −12 · below 33%: −15 after the paper negative-marking calculation.</span></div>',
          '<div class="vi-rule"><strong>3+ day streak</strong><span>Once the streak reaches 3 days, an active day grants a fixed +22 XP streak reward.</span></div>',
          '<div class="vi-rule"><strong>Extra activities</strong><span>Grammar clears, Memory Match, vocabulary learning, Focus Sprint, combos, Lucky Spin and Mystery Box can award separate activity XP.</span></div>',
          '<div class="vi-rule"><strong>XP can fall</strong><span>Deductions are real. XP never goes below zero, and deductions do not create a new earning cap.</span></div>',
          '<div class="vi-rule"><strong>Why it matters</strong><span>VAANI rewards answering correctly while making careless, low-accuracy attempts costly.</span></div>',
        '</div>',
      '</div></section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>📱 Mobile controls</h2><p>A quick map for the buttons you see on a phone.</p></div></div><div class="vi-grid">',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">ⓘ</div><h3>Info button</h3></div><p>The new info button is the permanent home of this field manual. Use it whenever you forget what something does.</p></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">☰</div><h3>More</h3></div><p>The bottom More button opens secondary destinations such as Profile, Statistics, Bookmarks, Settings and Feedback.</p></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🔍</div><h3>Search</h3></div><p>Search lessons, words, practice content and PYQs without manually hunting through sections.</p></article>',
      '</div></section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>🧭 Study flow</h2><p>A practical route through the platform.</p></div></div><div class="vi-flow">',
        '<div class="vi-step"><div class="vi-step-num">01</div><h3>Learn</h3><p>Open Grammar, Comparison or Vocabulary content and understand the concept first.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">02</div><h3>Drill</h3><p>Answer focused questions and use the immediate explanations to correct mistakes.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">03</div><h3>Test</h3><p>Move to PYQs and full-paper simulations when you are ready for exam-style pressure.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">04</div><h3>Review</h3><p>Use the mistake notebook, bookmarks and profile statistics to target weak areas.</p></div>',
      '</div><div class="vi-callout" style="margin-top:14px">Tip: the dedicated guide explains the platform itself. Learning pages stay focused on learning instead of carrying repeated how-to instructions.</div></section>',
      '<section class="vi-section reveal"><div class="vi-footer-card"><div><strong style="font:700 1.1rem var(--serif,Georgia)">Still stuck?</strong><p>Open Feedback from More, or return to this guide anytime from the info button.</p></div><button class="btn" type="button" onclick="switchView(\\'dashboard\\')">Return to Dashboard</button></div></section>',
    '</div>'
  ].join('');

  function renderInfoCenter(){
    const mount=document.getElementById('infoCenterMount');
    if(!mount||mount.dataset.ready==='1')return;
    mount.innerHTML=INFO_HTML;
    mount.dataset.ready='1';
    if(typeof initReveal==='function')safeCall(initReveal,'initReveal(info)');
    setTimeout(function(){ if(typeof forceRevealIn==='function')forceRevealIn(document.getElementById('view-info')); },100);
  }

  window.openInfoCenter=function(){
    markTourSeen();
    renderInfoCenter();
    if(typeof switchView==='function')switchView('info');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  window.maybeShowInfoTour=maybeShowInfoTour;
  window.closeInfoTour=closeTour;

  window.addEventListener('resize',function(){
    if(document.getElementById('viTour')?.classList.contains('open'))positionTourSpot();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && document.getElementById('viTour')?.classList.contains('open'))closeTour();
  });
})();