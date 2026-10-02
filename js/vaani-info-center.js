/* ============================================================
   VAANI INFO CENTER
   Dedicated guide + post-update first-visit briefing.
============================================================ */
(function(){
  const INFO_TOUR_VERSION='20261002-info-center1';
  const TOUR_TEXT='Welcome to VAANI, aspirant. I have moved the how-to information into one clean guide. Tap the new info button anytime to understand every feature, every XP rule and every part of your learning system.';

  const officerSVG = '<img class="vi-officer-model" src="https://cdn-ai-hs.picsart.com/ai-hot-storage/26983f1e-c8a3-4711-8463-852b639599c7.png" alt="Officer VAANI" loading="lazy" decoding="async">';

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
          '<div><div class="vi-kicker">VAANI FIELD MANUAL · INFORMATION CENTRE</div><h1 id="viTitle">Know the system. Then master it.</h1><p>Your field manual for English learning, configured tests, PYQs, chapter-based textbook study, career discovery, progress tracking and the tools that support every session.</p><div class="vi-hero-actions"><button class="btn" type="button" onclick="switchView(\'dashboard\')">← Back to VAANI</button><button class="btn ghost" type="button" onclick="openGlobalSearch()">⌕ Search VAANI</button></div></div>',
          '<div class="vi-command-art" aria-hidden="true"><svg viewBox="0 0 420 290"><g class="vi-svg-orbit" fill="none" stroke="rgba(230,198,111,.42)" stroke-width="1.5"><ellipse cx="210" cy="145" rx="150" ry="62"/><ellipse cx="210" cy="145" rx="150" ry="62" transform="rotate(58 210 145)"/><ellipse cx="210" cy="145" rx="150" ry="62" transform="rotate(-58 210 145)"/></g><circle cx="210" cy="145" r="58" fill="rgba(201,162,75,.13)" stroke="rgba(230,198,111,.64)" stroke-width="2"/><circle class="vi-svg-pulse" cx="210" cy="145" r="32" fill="none" stroke="#e6c66f" stroke-width="2"/><path class="vi-svg-dash" d="M78 235 C142 190 273 190 345 76" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-dasharray="8 10"/><circle cx="210" cy="145" r="10" fill="#e6c66f"/><path d="M192 167 L210 110 L228 167 L210 184Z" fill="#fff" opacity=".9"/><path d="M202 167 L210 129 L218 167" fill="#1b2a34"/></svg></div>',
        '</div>',
      '</section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>Start here</h2><p>The four things every aspirant should understand first.</p></div></div><div class="vi-flow">',
        '<div class="vi-step"><div class="vi-step-num">01</div><h3>Your account</h3><p>VAANI uses an account code to restore your saved learning record. Keep the code safe.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">02</div><h3>Pick a route</h3><p>Use the bottom navigation on mobile or the desktop navigation to move between learning areas.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">03</div><h3>Practice</h3><p>Choose a focused drill or configure a timed session. Your available modes depend on the question set you open.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">04</div><h3>Track progress</h3><p>Use your final report, mistake review, bookmarks, XP ledger and rank-progress card to decide what to study next.</p></div>',
      '</div></section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>The VAANI map</h2><p>A current guide to the learning, testing, career and progress tools available on the site.</p></div></div><div class="vi-grid">',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">📘</div><h3>Grammar Academy</h3></div><p>Learn grammar through structured lessons, rule explanations, examples and diagrams. Topic checks give immediate feedback, and attempted questions can be revisited for correction.</p><div class="vi-chip-row"><span class="vi-chip">Guided lessons</span><span class="vi-chip">Topic quizzes</span><span class="vi-chip">Mistake review</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🔄</div><h3>Comparisons</h3></div><p>Study commonly confused words and structures side by side, then use focused drills to check whether you can distinguish them in exam-style questions.</p><div class="vi-chip-row"><span class="vi-chip">Confusables</span><span class="vi-chip">Focused drills</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">📚</div><h3>Vocabulary Vault</h3></div><p>Explore curated words, the word of the day, meanings, examples, synonyms and antonyms. Search vocabulary, mark words learned and build your own learning register.</p><div class="vi-chip-row"><span class="vi-chip">Word of the day</span><span class="vi-chip">Search</span><span class="vi-chip">Learning register</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">📖</div><h3>Book Reading</h3></div><p>Read in the dedicated workspace, keep reading notes and save useful words to the reading vocabulary register. The reader is separate from PYQ practice.</p><div class="vi-chip-row"><span class="vi-chip">Reader</span><span class="vi-chip">Notes</span><span class="vi-chip">Vocabulary capture</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">📗</div><h3>Wren &amp; Martin companion</h3></div><p>Follow 89 contents entries using printed page and exercise references. Track reading and exercise completion, practise with 72 original VAANI MCQs, use chapter-mapped drills, review book-practice mistakes and work from original writing prompts. These are supplementary VAANI materials—not official PYQs or copied publisher exercises.</p><div class="vi-chip-row"><span class="vi-chip">Chapter tracker</span><span class="vi-chip">72 original MCQs</span><span class="vi-chip">Writing prompts</span><span class="vi-chip">Mixed &amp; mistake review</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🎯</div><h3>PYQ Command Vault</h3></div><p>Work previous-year English questions with exam, year and session tags. Open individual questions, use filters and bookmarks, or launch an exam simulation from a supported paper.</p><div class="vi-chip-row"><span class="vi-chip">NDA</span><span class="vi-chip">CDS</span><span class="vi-chip">AFCAT</span><span class="vi-chip">Paper simulation</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">⏱️</div><h3>Configurable Test Kit</h3></div><p>Choose Practice, Quiz, Rapid Fire, Revision, Bookmarks, Mistakes Only or book-based grammar practice where available. Before a session, set the question count, eligible exam source and timer options. Timed sessions submit automatically when the clock runs out.</p><div class="vi-chip-row"><span class="vi-chip">Question count</span><span class="vi-chip">Timer setup</span><span class="vi-chip">Rapid Fire</span><span class="vi-chip">Revision sets</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🧾</div><h3>Final report cards</h3></div><p>After an assessment, review correct, wrong and skipped answers, accuracy, applicable net marks and XP changes. Reopen each question for review. Officer VAANI’s after-action guidance belongs in the final report—not in the middle of an active test.</p><div class="vi-chip-row"><span class="vi-chip">Score breakdown</span><span class="vi-chip">Question review</span><span class="vi-chip">Officer briefing</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">⚔️</div><h3>Arena</h3></div><p>Create or join a shared match using a code. The host sets the question bank, question count, clock, player limit and expiry; the match uses a common question set and provides a result board with standings and review.</p><div class="vi-chip-row"><span class="vi-chip">Shared match codes</span><span class="vi-chip">Locked settings</span><span class="vi-chip">Leaderboard</span><span class="vi-chip">Review mode</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🧭</div><h3>Career &amp; Exam Desk</h3></div><p>Explore defence services, CAPFs, central and state recruitment, technical/science careers, entrance exams, healthcare, law and other routes. Filter opportunities by education or qualification and follow the official links. Always confirm exact eligibility and dates in the relevant notification.</p><div class="vi-chip-row"><span class="vi-chip">Career directory</span><span class="vi-chip">Qualification filters</span><span class="vi-chip">Official portals</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🔔</div><h3>Defence notifications</h3></div><p>Check the notices and updates area for defence-related information, current feed entries and archived items. Use the linked official source to verify a notice before acting on it.</p><div class="vi-chip-row"><span class="vi-chip">Current feed</span><span class="vi-chip">Archive</span><span class="vi-chip">Source links</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">👤</div><h3>Profile &amp; service-rank progress</h3></div><p>Track XP, streaks, activity history, attempts, learning milestones, statistics and your progress through the service-themed rank ladder. VAANI ranks are learning milestones only; they do not represent a real appointment, selection or promotion.</p><div class="vi-chip-row"><span class="vi-chip">XP ledger</span><span class="vi-chip">Milestones</span><span class="vi-chip">Rank progress</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🔎</div><h3>Search, actions &amp; focus</h3></div><p>Use global search to reach lessons, words and PYQs, and open the available action palette or focus controls when you need a shortcut or a quieter workspace.</p><div class="vi-chip-row"><span class="vi-chip">Global search</span><span class="vi-chip">Action palette</span><span class="vi-chip">Focus mode</span></div></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🪖</div><h3>Officer VAANI controls</h3></div><p>Use the header avatar to open or close the briefing and adjustment panel. Move the dock, resize it, enter exact position values, reset it or hide it; use the same header control to bring it back. Automatic briefings stay out of active assessments.</p><div class="vi-chip-row"><span class="vi-chip">Move &amp; resize</span><span class="vi-chip">Exact position</span><span class="vi-chip">Hide / restore</span></div></article>',
      '</div></section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>⚡ XP system</h2><p>The progression rules live here instead of being scattered across the website.</p></div></div><div class="vi-card vi-xp">',
        '<div class="vi-xp-equation"><span class="vi-xp-node">Correct answer × +2 XP</span><span class="vi-xp-arrow">＋</span><span class="vi-xp-node">Accuracy adjustment</span><span class="vi-xp-arrow">＋</span><span class="vi-xp-node">Net-marks adjustment</span><span class="vi-xp-arrow">＝</span><span class="vi-xp-node">Paper XP result</span></div>',
        '<div class="vi-rule-grid">',
          '<div class="vi-rule"><strong>Correct answers</strong><span>Every correct question earns +2 XP. The base amount is identical regardless of the paper or module.</span></div>',
          '<div class="vi-rule"><strong>No daily cap</strong><span>There is no maximum amount of XP you can legitimately earn in one calendar day.</span></div>',
          '<div class="vi-rule"><strong>Accuracy deductions</strong><span>60–69%: −10 · 50–59%: −20 · 40–49%: −45 · 33–39%: −60 · below 33%: −80. 70%+ has no accuracy deduction.</span></div>',
          '<div class="vi-rule"><strong>Paper net-marks deductions</strong><span>70%+: −5 · 50–69%: −8 · 33–49%: −12 · below 33%: −15 after the paper negative-marking calculation.</span></div>',
          '<div class="vi-rule"><strong>3+ day streak</strong><span>Once the streak reaches 3 days, an active day grants a fixed +22 XP streak reward.</span></div>',
          '<div class="vi-rule"><strong>Streak reset</strong><span>A missed login day resets the streak. Each missed day also deducts 15 XP, up to 75 XP.</span></div>',
          '<div class="vi-rule"><strong>Extra activities</strong><span>Grammar clears, Memory Match, vocabulary learning, Focus Sprint, combos, Lucky Spin and Mystery Box can award separate activity XP.</span></div>',
          '<div class="vi-rule"><strong>XP can fall</strong><span>Deductions are real. XP never goes below zero, and deductions do not create a new earning cap.</span></div>',
          '<div class="vi-rule"><strong>Why it matters</strong><span>VAANI rewards answering correctly while making careless, low-accuracy attempts costly.</span></div>',
        '</div>',
      '</div></section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>📱 Mobile controls</h2><p>A quick map for the buttons you see on a phone.</p></div></div><div class="vi-grid">',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">ⓘ</div><h3>Info button</h3></div><p>The information button in the header opens this field manual. Use it whenever you need an explanation of a tool or learning flow.</p></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">☰</div><h3>More</h3></div><p>The bottom More button opens secondary destinations such as Profile, Statistics, Bookmarks, Settings and Feedback.</p></article>',
        '<article class="vi-card"><div class="vi-card-top"><div class="vi-card-icon">🔍</div><h3>Search</h3></div><p>Search lessons, vocabulary, practice content and PYQs without manually hunting through sections. The action palette and focus controls are available separately.</p></article>',
      '</div></section>',
      '<section class="vi-section reveal"><div class="vi-section-head"><div><h2>🧭 Study flow</h2><p>A practical route through the platform.</p></div></div><div class="vi-flow">',
        '<div class="vi-step"><div class="vi-step-num">01</div><h3>Learn</h3><p>Open Grammar, Comparison or Vocabulary content and understand the concept first.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">02</div><h3>Drill</h3><p>Answer focused questions and use the immediate explanations to correct mistakes.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">03</div><h3>Test</h3><p>Move to PYQs and full-paper simulations when you are ready for exam-style pressure.</p></div>',
        '<div class="vi-step"><div class="vi-step-num">04</div><h3>Review</h3><p>Use the mistake notebook, bookmarks and profile statistics to target weak areas.</p></div>',
      '</div><div class="vi-callout" style="margin-top:14px">Tip: the dedicated guide explains the platform itself. Learning pages stay focused on learning instead of carrying repeated how-to instructions.</div></section>',
      '<section class="vi-section reveal"><div class="vi-footer-card"><div><strong style="font:700 1.1rem var(--serif,Georgia)">Still stuck?</strong><p>Open Feedback from More, or return to this guide anytime from the info button.</p></div><button class="btn" type="button" onclick="switchView(\'dashboard\')">Return to Dashboard</button></div></section>',
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