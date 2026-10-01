function countUp(id,target,suffix){
  suffix = suffix||'';
  const el = document.getElementById(id); if(!el) return;
  const start = parseInt(el.textContent)||0;
  if(start===target){ el.textContent=target+suffix; return; }
  const dur=700; const t0=performance.now();
  function step(t){
    const p=Math.min(1,(t-t0)/dur);
    const val=Math.round(start+(target-start)*(1-Math.pow(1-p,3)));
    el.textContent=val+suffix;
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.addEventListener('click',(e)=>{
  const btn = e.target.closest('.btn, .opt-btn, .gate-btn, .ma-year-tile, .ma-session-card, .ma-gate-card, .ma-era-head, .pv-examtype-card');
  if(!btn) return;
  const r = btn.getBoundingClientRect();
  const circle = document.createElement('span');
  const size = Math.max(r.width,r.height);
  circle.className='ripple-circle';
  circle.style.width=circle.style.height=size+'px';
  circle.style.left=(e.clientX-r.left-size/2)+'px';
  circle.style.top=(e.clientY-r.top-size/2)+'px';
  btn.classList.add('ripple');
  btn.appendChild(circle);
  setTimeout(()=>circle.remove(),650);
});
document.addEventListener('mousemove',(e)=>{
  const btn = e.target.closest && e.target.closest('.btn');
  if(!btn) return;
  const r = btn.getBoundingClientRect();
  btn.style.setProperty('--mx',(e.clientX-r.left)+'px');
  btn.style.setProperty('--my',(e.clientY-r.top)+'px');
  btn.classList.add('glow-btn');
});
/* ============================================================
   STATE
=============================================================*/
function createDefaultState(){
  return {
    name:'Cadet', xp:0, streak:0, lastActive:null,
    completedTopics:{}, quizScores:{}, vocabLearned:{}, theme:'light', missions:{},
    dailyActivity:{}, focusSessions:{}, mysteryBoxesClaimed:0, reviewQueue:[],
    personalBests:{ bestCombo:0, longestStreak:0, highestQuizScore:0, fastestQuizSeconds:null, fastestQuizLabel:'', totalQuizzesTaken:0 },
    pyqStats:{ attempts:{} }, topicProgress:{}, topicLastAttempt:{}, bookmarkedTopics:{}, topicNotes:{}, pyqBookmarks:[], grammarMastery:{},
    pyqContinue:null, lastSpinDate:null, activity:[]
  };
}
const State = createDefaultState();
function loadState(){
  // Account records are the only active source of learning progress. The
  // device-wide vaani_state key is read only by the explicit legacy migration.
  resetStateForAccount();
  normalizeState();
}
/* Guards against corrupted/partial localStorage data (older versions, manual edits, etc.)
   so downstream render functions can always assume these fields exist. This removes the
   race where a render call in progress before normalization completed could throw and
   silently abort mid-function — the root cause of the blank Grammar screen on first launch. */
function normalizeState(){
  const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  State.completedTopics=isRecord(State.completedTopics)?State.completedTopics:{};
  State.quizScores=isRecord(State.quizScores)?State.quizScores:{};
  State.vocabLearned=isRecord(State.vocabLearned)?State.vocabLearned:{};
  State.missions=isRecord(State.missions)?State.missions:{};
  State.dailyActivity=isRecord(State.dailyActivity)?State.dailyActivity:{};
  State.focusSessions=isRecord(State.focusSessions)?State.focusSessions:{};
  State.topicProgress=isRecord(State.topicProgress)?State.topicProgress:{};
  State.topicLastAttempt=isRecord(State.topicLastAttempt)?State.topicLastAttempt:{};
  State.bookmarkedTopics=isRecord(State.bookmarkedTopics)?State.bookmarkedTopics:{};
  State.topicNotes=isRecord(State.topicNotes)?State.topicNotes:{};
  State.pyqBookmarks=Array.isArray(State.pyqBookmarks)?Array.from(new Set(State.pyqBookmarks.filter(id=>typeof id==='string'&&id))):[];
  State.grammarMastery=isRecord(State.grammarMastery)?State.grammarMastery:{};
  Object.keys(State.grammarMastery).forEach(id=>{
    const entry=State.grammarMastery[id];
    if(!isRecord(entry)){delete State.grammarMastery[id];return;}
    const attempts=Number(entry.attempts),correct=Number(entry.correct);
    if(!Number.isFinite(attempts)||!Number.isFinite(correct)||attempts<0||correct<0){delete State.grammarMastery[id];return;}
    State.grammarMastery[id]={attempts:Math.floor(attempts),correct:Math.min(Math.floor(correct),Math.floor(attempts)),lastAttempt:Number.isFinite(Number(entry.lastAttempt))?Number(entry.lastAttempt):null};
  });
  State.pyqStats=isRecord(State.pyqStats)?State.pyqStats:{attempts:{}};
  State.pyqStats.attempts=isRecord(State.pyqStats.attempts)?State.pyqStats.attempts:{};
  State.personalBests=isRecord(State.personalBests)?State.personalBests:{};
  Object.assign(State.personalBests,{bestCombo:0,longestStreak:0,highestQuizScore:0,fastestQuizSeconds:null,fastestQuizLabel:'',totalQuizzesTaken:0},State.personalBests);
  State.mysteryBoxesClaimed=Number.isFinite(Number(State.mysteryBoxesClaimed))?Math.max(0,Math.floor(Number(State.mysteryBoxesClaimed))):0;
  State.reviewQueue=Array.isArray(State.reviewQueue)?State.reviewQueue.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)):[];
  State.name=typeof State.name==='string'?(State.name.trim().slice(0,40)||'Cadet'):'Cadet';
  State.xp=Number.isFinite(Number(State.xp))?Math.max(0,Math.floor(Number(State.xp))):0;
  State.streak=Number.isFinite(Number(State.streak))?Math.max(0,Math.floor(Number(State.streak))):0;
  State.theme=State.theme==='dark'?'dark':'light';
}
let __vaaniStorageWarningShown=false;
function saveState(){
  if(typeof ACTIVE_CODE==='undefined'||!ACTIVE_CODE)return false;
  try{
    if(typeof persistCombinedAccount==='function'){
      const pending=persistCombinedAccount();
      if(pending&&typeof pending.then==='function')pending.then(ok=>{
        if(!ok&&!__vaaniStorageWarningShown&&typeof toast==='function'){
          __vaaniStorageWarningShown=true;
          toast('Progress could not be saved. Your current session can continue, but it may not persist.');
        }
      }).catch(err=>console.warn('[VAANI] Account sync could not save progress:',err));
    }
  }
  catch(err){console.warn('[VAANI] Account sync could not save progress:',err);}
  return true;
}
function resetStateForAccount(){
  Object.keys(State).forEach(key=>delete State[key]);
  Object.assign(State,createDefaultState());
}

/* ============================================================
   ERROR BOUNDARY / SAFE-CALL UTILITY
   Runs a render function in isolation — if it throws, the error is
   logged and swallowed instead of halting the caller (e.g. refreshAll's
   chain of render calls), so a single bad function can never blank
   out every view that renders after it.
=============================================================*/
function safeCall(fn, label){
  try{ fn(); }
  catch(err){
    console.error('[VAANI] render error in '+(label||fn.name||'anonymous')+':', err);
  }
}
window.addEventListener('error', function(e){
  console.error('[VAANI] uncaught error:', e.error||e.message);
  // Never let a single uncaught error leave the visible view empty —
  // re-attempt a render of whatever view is currently active.
  try{
    const activeView = document.querySelector('.view.active');
    if(activeView && activeView.id==='view-grammar') safeCall(renderGrammarTree,'renderGrammarTree(recover)');
  }catch(e2){}
});
window.addEventListener('unhandledrejection', function(e){
  console.error('[VAANI] unhandled promise rejection:', e.reason);
});

/* ============================================================
   GATE — account creation / login with a 6-digit code.
   Ported in from Veer Bhogya Vasundhara: this is now the one entry
   point for the whole site, governing both VAANI's own progress and
   the Book Reading section under a single account. The account
   functions themselves (Store, accountKey, generateCode, pickFreeCode,
   loginWithCode, createNewAccount, applyLoadedAccount,
   tryMigrateLegacyData, ACTIVE_CODE, session-code helpers) live in
   js/library.js, loaded above — this block is just the UI glue for
   VAANI's own gate screen.
============================================================ */
function showGateStage(name){
  ['checking','start','showcode'].forEach(s=>{
    const el = document.getElementById('gate-stage-'+s);
    if(el) el.style.display = (s===name) ? 'block' : 'none';
  });
  if(name==='start'){ resetGatePanels(); }
}
function resetGatePanels(){
  const namePanel = document.getElementById('gate-panel-name');
  const codePanel = document.getElementById('gate-panel-code');
  if(namePanel){ namePanel.style.display = 'block'; namePanel.classList.remove('gate-panel-out','gate-panel-in'); }
  if(codePanel){ codePanel.style.display = 'none'; codePanel.classList.remove('gate-panel-out','gate-panel-in'); }
  const codeInput = document.getElementById('gate-code-input');
  if(codeInput) codeInput.value = '';
  const errEl = document.getElementById('gate-login-error');
  if(errEl) errEl.textContent = '';
  const label = document.getElementById('gateCardLabelText');
  if(label) label.textContent = 'CADET IDENTIFICATION';
}
/* Swaps the name box and code box in place with a short glitter burst. */
function sparkleBurst(container){
  const rect = container.getBoundingClientRect();
  const layer = document.getElementById('gate');
  if(!layer) return;
  for(let i=0;i<16;i++){
    const s = document.createElement('div');
    s.className = 'gate-sparkle';
    s.textContent = '✨';
    s.style.left = (rect.left + rect.width * Math.random()) + 'px';
    s.style.top = (rect.top + rect.height * Math.random()) + 'px';
    s.style.fontSize = (9 + Math.random()*13) + 'px';
    s.style.animationDelay = (Math.random()*0.18) + 's';
    layer.appendChild(s);
    setTimeout(()=> s.remove(), 950);
  }
}
function switchGatePanel(target){
  const wrap = document.getElementById('gate-panel-wrap');
  const namePanel = document.getElementById('gate-panel-name');
  const codePanel = document.getElementById('gate-panel-code');
  const showing = target === 'code' ? codePanel : namePanel;
  const hiding = target === 'code' ? namePanel : codePanel;
  if(!showing || !hiding || showing.style.display !== 'none') return; // already showing / mid-transition
  sparkleBurst(wrap);
  const label = document.getElementById('gateCardLabelText');
  hiding.classList.add('gate-panel-out');
  setTimeout(()=>{
    hiding.style.display = 'none';
    hiding.classList.remove('gate-panel-out');
    showing.style.display = 'block';
    showing.classList.add('gate-panel-in');
    setTimeout(()=> showing.classList.remove('gate-panel-in'), 430);
    if(label) label.textContent = target==='code' ? 'ACCESS CODE' : 'CADET IDENTIFICATION';
    if(target === 'code'){
      const el = document.getElementById('gate-code-input');
      if(el){ el.value = ''; setTimeout(()=>el.focus(), 60); }
    }
  }, 230);
}
/* Runs on every load: tries to silently resume a saved session first, then
   looks for pre-account legacy data (from before this account system
   existed) to migrate, and only then shows the name/code entry screen. */
async function initGateSession(){
  showGateStage('checking');
  const sessionCode = getSessionCode();
  if(sessionCode){
    const res = await loginWithCode(sessionCode);
    if(res.ok){ finishGateEntry(); return; }
  }
  const migratedCode = await tryMigrateLegacyData();
  if(migratedCode){
    document.getElementById('gate-showcode-heading').textContent = 'Found your existing progress — here is its new account code';
    document.getElementById('gate-code-display').textContent = migratedCode.slice(0,3)+' '+migratedCode.slice(3);
    showGateStage('showcode');
    return;
  }
  // No account or legacy profile was restored. Clear the device-wide cache from
  // memory and never prefill a new profile with the previous user's name.
  if(typeof resetStateForAccount==='function') resetStateForAccount();
  showGateStage('start');
  const inp = document.getElementById('cadetName');
  if(inp) inp.value = '';
}
async function handleGateLogin(){
  const btn = document.getElementById('gate-login-btn');
  const code = document.getElementById('gate-code-input').value;
  const errEl = document.getElementById('gate-login-error');
  errEl.textContent = '';
  btn.disabled = true;
  const res = await loginWithCode(code);
  btn.disabled = false;
  if(res.ok){ finishGateEntry(); } else { errEl.textContent = res.msg; }
}
async function handleGateCreate(){
  const inp = document.getElementById('cadetName');
  const v = inp.value.trim();
  if(!v){
    inp.style.borderColor = 'var(--red)';
    inp.placeholder = 'NAME REQUIRED';
    inp.classList.add('shake-err');
    setTimeout(()=>inp.classList.remove('shake-err'), 500);
    inp.focus();
    return;
  }
  const btn = document.getElementById('gateBtn');
  btn.disabled = true;
  let code;
  try{
    code = await createNewAccount();
    State.name = v;
    saveState();
  }catch(err){
    const errEl=document.getElementById('gate-login-error');
    if(errEl) errEl.textContent='Could not create your account. Please try again.';
    btn.disabled=false;
    return;
  }
  btn.disabled = false;
  document.getElementById('gate-showcode-heading').textContent = 'Your account code — save this somewhere safe';
  document.getElementById('gate-code-display').textContent = code.slice(0,3)+' '+code.slice(3);
  showGateStage('showcode');
}
function finishGateEntry(){
  if(typeof requestGyroParallax==='function') requestGyroParallax();
  const today = new Date().toDateString();
  if(State.lastActive !== today){
    const y = new Date(); y.setDate(y.getDate()-1);
    State.streak = (State.lastActive === y.toDateString()) ? State.streak+1 : 1;
    State.lastActive = today;
  }
  normalizeState();
  State.personalBests.longestStreak = Math.max(State.personalBests.longestStreak||0, State.streak);
  saveState();
  document.getElementById('gate').classList.add('hide');
  // Route through the exact same render pipeline used for every later navigation
  // (safeCall-wrapped refreshAll + switchView on the currently-active view), so first
  // launch, refresh, and returning users all follow one identical init path.
  safeCall(refreshAll,'refreshAll(finishGateEntry)');
  const active = document.querySelector('.view.active');
  const activeName = active ? active.id.replace('view-','') : 'dashboard';
  safeCall(()=>switchView(activeName),'switchView(finishGateEntry)');
  toast('Welcome, '+State.name+'. Streak: '+State.streak+' days.');
}
document.getElementById('cadetName').addEventListener('keydown',e=>{if(e.key==='Enter')handleGateCreate();});

function toggleTheme(){
  State.theme = State.theme==='dark'?'light':'dark';
  document.body.setAttribute('data-theme',State.theme);
  const tb=document.getElementById('themeBtn'); if(tb) tb.textContent = State.theme==='dark'?'☀️':'🌙';
  saveState();
}

function addXP(n, reason){
  State.xp += n;
  const dayKey = new Date().toDateString();
  State.dailyActivity = State.dailyActivity || {};
  State.dailyActivity[dayKey] = (State.dailyActivity[dayKey]||0) + n;
  saveState(); refreshTopBar(); refreshDashboard();
  toast('+'+n+' XP — '+reason);
  checkBadges();
  checkMysteryBox();
}
function toast(msg){
  const w = document.getElementById('toast-wrap');
  if(!w) return;
  const t = document.createElement('div');
  t.className='toast';
  t.setAttribute('role','status');
  t.textContent='⭐ '+String(msg == null ? '' : msg);
  w.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

/* ============================================================
   NAV
=============================================================*/
let lastListView='grammar';
let __grammarNavPending = false;
let __vaaniNavHistoryReady = false;

function __vaaniViewUrl(view, hash=''){
  const u = new URL(window.location.href);
  u.searchParams.set('v', view);
  u.hash = hash || '';
  return u.pathname + u.search + u.hash;
}

function __vaaniActiveView(){
  const active = document.querySelector('.view.active');
  return active ? active.id.replace(/^view-/, '') : 'dashboard';
}

/*
 * The main VAANI UI is an SPA layered over a real document. Previously,
 * switchView() only changed CSS classes, so the Android/browser back action
 * had no in-app history to return to and could leave the site immediately.
 *
 * Main views now get real History API entries. Book Reading is intentionally
 * left to its own hash router; we bridge the two routers so browser back
 * remains coherent instead of fighting each other.
 */
function initVaaniNavigationHistory(){
  if(__vaaniNavHistoryReady) return;
  __vaaniNavHistoryReady = true;

  const params = new URLSearchParams(location.search);
  const queryView = params.get('v');
  const hasBookRoute = location.hash.startsWith('#/');
  const initialView = hasBookRoute ? 'books' :
    (queryView && document.getElementById('view-'+queryView) ? queryView : __vaaniActiveView());

  if(hasBookRoute){
    switchView('books',{history:false,preserveScroll:true});
  } else if(initialView !== __vaaniActiveView()){
    switchView(initialView,{history:false,preserveScroll:true});
  }

  /*
   * Give every top-level VAANI view a distinct URL. This is deliberate:
   * some mobile browsers/WebViews are unreliable when an SPA repeatedly
   * pushStates the exact same URL. A tiny ?v= route makes every navigation
   * a real, distinguishable session-history entry while still remaining
   * the same document.
   */
  history.replaceState(
    Object.assign({}, history.state || {}, {vaaniView:initialView}),
    '',
    __vaaniViewUrl(initialView, hasBookRoute ? location.hash : '')
  );

  window.addEventListener('popstate',(event)=>{
    if(location.hash.startsWith('#/') &&
       document.getElementById('view-books')?.classList.contains('active')){
      return;
    }
    const state = event.state || history.state || {};
    const params = new URLSearchParams(location.search);
    const name = state.vaaniView || params.get('v');
    if(name && document.getElementById('view-'+name)){
      switchView(name,{history:false,preserveScroll:true});
    } else if(!location.hash.startsWith('#/')){
      switchView('dashboard',{history:false,preserveScroll:true});
    }
  });
}

document.querySelectorAll('#vaaniMainNav button').forEach(b=>{
  b.addEventListener('click',()=>switchView(b.dataset.view));
});

function switchView(name, options={}){
  const target = document.getElementById('view-'+name);
  if(!target) return; // unknown view name — nothing to switch to, avoid throwing

  const fromName = __vaaniActiveView();

  if(__vaaniNavHistoryReady && options.history !== false){
    if(name==='books'){
      /*
       * Book Reading already uses a hash router. Use one hash entry when
       * entering it, and mark that entry as belonging to the books view.
       * A specific route can be requested by links such as "Vocab Register".
       */
      const requestedRoute = String(options.bookRoute || '').replace(/^\/#?/, '').replace(/^#\//,'');
      const currentRoute = location.hash.startsWith('#/') ? location.hash.slice(2) : '';
      const route = requestedRoute || currentRoute || 'home';
      const desiredHash = '#/'+route;
      if(location.hash !== desiredHash) location.hash = desiredHash;
      history.replaceState(
        Object.assign({}, history.state || {}, {vaaniView:'books'}),
        '',
        __vaaniViewUrl('books', desiredHash)
      );
    } else if(fromName !== name){
      /*
       * Leaving Book Reading must strip its hash so the next browser-back
       * lands on the actual previous application view rather than an
       * invisible library route.
       */
      history.pushState(
        Object.assign({}, history.state || {}, {vaaniView:name}),
        '',
        __vaaniViewUrl(name)
      );
    }
  }

  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  target.classList.add('active');
  document.querySelectorAll('#vaaniMainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  document.querySelectorAll('.bottomnav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  if(['grammar','compare','vocab','practice','reading','tests','games','pyq'].includes(name)) lastListView=name;
  if(name==='leaderboard') safeCall(renderLeaderboard,'renderLeaderboard');
  if(name==='pyq') safeCall(renderPyqView,'renderPyqView');
  if(name==='books') safeCall(mountLibrarySection,'mountLibrarySection');
  // Rebuild the vocabulary hub after it becomes visible. Its daily panels depend
  // on the active page being mounted; refreshing here also recovers from a prior
  // partial render without requiring a hard reload.
  if(name==='vocab'){
    safeCall(renderVocabGrid,'renderVocabGrid(switchView)');
    safeCall(renderDailySetTabs,'renderDailySetTabs(switchView)');
    safeCall(renderDailySingles,'renderDailySingles(switchView)');
    safeCall(renderConfuseTable,'renderConfuseTable(switchView)');
  }
  if(name==='grammar'){
    // Defer to the next animation frame: the 'active' class change above must be committed
    // to layout first, so the container (aspect-ratio box) has a real, measurable size
    // before the tree is built — this is what previously raced on first navigation.
    if(!__grammarNavPending){
      __grammarNavPending = true;
      requestAnimationFrame(()=>{
        __grammarNavPending = false;
        safeCall(()=>renderGrammarTree(),'renderGrammarTree(switchView)');
      });
    }
  }
  if(name==='journey') setTimeout(()=>safeCall(renderGrammarJourney,'renderGrammarJourney'), 30);
  closeMobileNav();
  if(!options.preserveScroll) window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(()=>{
    if(typeof initTilt==='function') safeCall(initTilt,'initTilt');
    if(typeof initReveal==='function') safeCall(initReveal,'initReveal');
    forceRevealIn(target);
  },60);
}
/* Safety net for requirement #6: guarantee that nothing inside the view we just navigated
   to can be permanently stuck at opacity:0 / translateY() because its IntersectionObserver
   entry never fired (e.g. it was already fully in the (hidden) viewport so no intersection
   change ever occurs). Give the real scroll-reveal animation a chance first, then reveal
   any stragglers. */
function forceRevealIn(viewEl){
  if(!viewEl) return;
  setTimeout(()=>{
    viewEl.querySelectorAll('.reveal:not(.in)').forEach(el=>el.classList.add('in'));
  }, 500);
}
function toggleMobileNav(){
  const nav=document.getElementById('vaaniMainNav'), btn=document.getElementById('hamburgerBtn');
  const open=nav.classList.toggle('open');
  btn.classList.toggle('open',open);
  btn.textContent=open?'✕':'☰';
  btn.setAttribute('aria-expanded',open?'true':'false');
  document.body.style.overflow=open?'hidden':'';
}
function closeMobileNav(){
  const nav=document.getElementById('vaaniMainNav'), btn=document.getElementById('hamburgerBtn');
  nav.classList.remove('open');
  if(btn){btn.classList.remove('open');btn.textContent='☰';btn.setAttribute('aria-expanded','false');}
  document.body.style.overflow='';
}
document.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'){ const nav=document.getElementById('vaaniMainNav'); if(nav&&nav.classList.contains('open')) closeMobileNav(); }
});
document.addEventListener('click',(e)=>{
  const nav=document.getElementById('vaaniMainNav');
  if(!nav || !nav.classList.contains('open')) return;
  if(e.target===nav){ closeMobileNav(); } // tap on empty area of the full-screen overlay closes it
});

/* ============================================================
   CONTENT DATA — GRAMMAR
=============================================================*/

/* ============================================================
   CONTENT DATA — COMPARISONS (Confusable Pairs Lab)
=============================================================*/
const COMPARISONS = [
{
  id:'who-whom', a:'Who', b:'Whom', tagline:'The pronoun that decides half your error-spotting marks — and the one NDA candidates get wrong most.',
  meanA:'A subject pronoun. It performs the action of the verb — the one doing something.',
  meanB:'An object pronoun. It receives the action of the verb or follows a preposition — the one something is done to.',
  difference:`<p><b>Who</b> and <b>whom</b> are both used to ask about or refer to people, but they occupy opposite grammatical roles. <b>Who</b> is the subject of a clause — it does the verb. <b>Whom</b> is the object of a clause — the verb (or a preposition) is done to it.</p>
   <p>The fastest test: answer the question in your head using <i>he</i> or <i>him</i>. If <b>he</b> fits, use <b>who</b>. If <b>him</b> fits, use <b>whom</b> — both end in "m," which is the easiest memory hook in English grammar.</p>`,
  table:{headers:['Aspect','Who','Whom'],rows:[
    ['Grammatical role','Subject','Object'],
    ['Replaces','he / she / they','him / her / them'],
    ['Typical position','Before the verb','After a verb or preposition'],
    ['Quick swap test','"He did it" → who','"It was done to him" → whom'],
    ['Formality','Neutral, used everywhere','Slightly formal, often dropped in speech']
  ]},
  rule:`<p>Rule: use <b>who</b> when the pronoun is doing the action of the verb in its own clause; use <b>whom</b> when the pronoun is receiving the action, or sits directly after a preposition (to whom, for whom, with whom, by whom).</p>
   <p>In multi-clause sentences, isolate the clause containing who/whom and test it on its own — ignore the rest of the sentence while testing.</p>`,
  exceptions:[
    'In casual spoken English, "who" is widely accepted even in object position ("Who did you call?") — but NDA written English always expects the formal "whom" after a preposition.',
    'When a preposition is moved to the end of a sentence ("Who did you give it to?"), spoken English keeps "who," but the SSB-correct written form is "To whom did you give it?"',
    '"Whoever" / "whomever" follow the exact same subject/object logic as who/whom, just for indefinite clauses.'
  ],
  examples:[
    {right:'Who is knocking at the door?',wrong:'Whom is knocking at the door?',note:'"Who" performs the action of knocking → subject → who.'},
    {right:'Whom did you meet at the parade?',wrong:'Who did you meet at the parade?',note:'"You met him" → object of "meet" → whom.'},
    {right:'To whom should I report?',wrong:'To who should I report?',note:'Directly after a preposition ("to") → always whom in formal English.'},
    {right:'The officer who briefed us was strict.',wrong:'The officer whom briefed us was strict.',note:'"Who" briefed us — subject of "briefed" → who.'}
  ],
  trick:'Memory Trick — "M for M": if the hidden answer uses "hiM" or "theM," the question word ends in M too: <b>whoM</b>. If the answer would be "he" or "they," use <b>who</b>. Say it out loud: "Him → whoM."',
  officerTip:'SSB interview boards listen for "to whom" / "with whom" in spoken answers — getting this right under pressure quietly signals command of formal English.',
  pyq:[
    {q:'Choose the correct option: "___ do you think will win the race?"',opts:['Who','Whom','Whose','Which'],ans:0,exp:'"He will win" — subject of "win" → who.',pyq:true,year:'NDA 2019'},
    {q:'Choose the correct option: "He is the man ___ I borrowed the book from."',opts:['who','whom','whose','which'],ans:1,exp:'"I borrowed the book from him" — object of preposition "from" → whom.',pyq:true,year:'NDA 2021'},
    {q:'Select the correctly formed sentence:',opts:['Whom is calling me?','Who is calling me?','Who calling me is?','Whom calling is me?'],ans:1,exp:'"He is calling me" — subject of "is calling" → who.'},
    {q:'"___ shall I say is calling?" — fill the blank:',opts:['Who','Whom','Whose','Which'],ans:0,exp:'"He is calling" — who is the subject of the embedded clause, regardless of "shall I say."'},
    {q:'Identify the correct usage:',opts:['For who the bell tolls','For whom the bell tolls','For whose the bell tolls','For which whom tolls'],ans:1,exp:'After the preposition "for," formal English always takes "whom."',pyq:true,year:'NDA 2017'}
  ]
},
{
  id:'its-its-apostrophe', a:"Its", b:"It's", tagline:'One apostrophe, two completely different words — a classic NDA spotting trap.',
  meanA:'A possessive pronoun, meaning "belonging to it." Like his/her/their — no apostrophe, because possessive pronouns never take one.',
  meanB:'A contraction of "it is" or "it has." The apostrophe replaces the missing letter(s), exactly like "don\'t" stands for "do not."',
  difference:`<p>This pair is purely about spelling, not meaning — but it is one of the highest-frequency traps in NDA error-spotting because the two words sound identical. <b>Its</b> shows ownership ("the dog wagged its tail"). <b>It's</b> is always short for "it is" or "it has" ("it's raining," "it's been a long day").</p>
   <p>The single reliable test: expand the sentence. If "it is" or "it has" makes sense in place of the word, you need the apostrophe (<b>it's</b>). If not, you need the plain possessive (<b>its</b>).</p>`,
  table:{headers:['Aspect',"Its","It's"],rows:[
    ['Type','Possessive pronoun','Contraction'],
    ['Stands for','belonging to it','it is / it has'],
    ['Apostrophe rule','Never — like his, her, their','Always — apostrophe marks missing letters'],
    ['Expand test','Cannot expand','Expands to "it is" / "it has"'],
    ['Example','The unit lost its way.','It\'s lost its way (it is lost).']
  ]},
  rule:`<p>Rule: possessive pronouns (my, your, his, her, its, our, their) <b>never</b> take an apostrophe in standard English. The apostrophe in "it's" exists purely to mark a contraction, never possession — this breaks the usual pattern people expect (where 's normally shows possession, as in "the soldier's rifle"), which is exactly why it's so commonly misused.</p>`,
  exceptions:[
    '"It\'s" can also stand for "it has" in perfect tense constructions: "It\'s been raining since morning" = "It has been raining."',
    'There is no plural or alternate form — unlike most nouns, "its" never becomes "its\'" under any circumstance.',
    'In very old/poetic English ("it\'s own sake," 18th century texts), the apostrophe was sometimes used for possession — this is archaic and never correct in modern or NDA English.'
  ],
  examples:[
    {right:'The committee announced its decision.',wrong:"The committee announced it's decision.",note:'Possession — "belonging to the committee" — no apostrophe.'},
    {right:"It's time to leave for the parade.",wrong:'Its time to leave for the parade.',note:'"It is time" — contraction needs the apostrophe.'},
    {right:"The team celebrated because it's won three matches in a row.",wrong:"The team celebrated because its won three matches in a row.",note:'"It has won" — contraction of "it has."'},
    {right:'Every animal protects its territory.',wrong:"Every animal protects it's territory.",note:'Possession — territory belongs to the animal — no apostrophe.'}
  ],
  trick:'Memory Trick — "Expand it": mentally replace the word with "it is." If the sentence still makes sense, you need the apostrophe. "The dog wagged it is tail" sounds wrong → so it\'s "its." "It is raining" sounds right → so it\'s "it\'s."',
  officerTip:'In SSB written exercises (PIQ, essay), this single apostrophe error is one of the fastest ways to look careless — proofread every "its/it\'s" before submitting.',
  pyq:[
    {q:'Choose the correct sentence:',opts:['The cat licked it\'s paw.','The cat licked its paw.','The cat licked its\' paw.','The cat licked it is paw.'],ans:1,exp:'Possession — the paw belongs to the cat — no apostrophe needed.',pyq:true,year:'NDA 2018'},
    {q:'Fill in the blank: "___ been a long time since we last met."',opts:['Its','It\'s','Its\'','It is\'s'],ans:1,exp:'"It has been" — contraction requires the apostrophe.',pyq:true,year:'NDA 2020'},
    {q:'Identify the error: "The company increased it\'s profits this year."',opts:['No error',"'it\'s' should be 'its'",'"increased" should be "increases"','"profits" should be "profit"'],ans:1,exp:'Possession ("profits belonging to the company") — should be "its," not "it\'s."'},
    {q:'Choose correctly: "___ a beautiful morning."',opts:['Its','It\'s','Its\'','It\'ve'],ans:1,exp:'"It is a beautiful morning" — contraction needs the apostrophe.'},
    {q:'Spot the correct option:',opts:["The bird built it's nest.",'The bird built its nest.','The bird built its\' nest.','The bird built it is nest.'],ans:1,exp:'Possession — the nest belongs to the bird — no apostrophe.'}
  ]
},
{
  id:'affect-effect', a:'Affect', b:'Effect', tagline:'Verb vs noun — the pair examiners love to hide inside long sentences.',
  meanA:'Usually a verb meaning "to influence or have an impact on" something.',
  meanB:'Usually a noun meaning "the result or outcome" of an action or cause.',
  difference:`<p><b>Affect</b> and <b>effect</b> are commonly confused because they sound almost identical and relate to the same idea — cause and consequence. The reliable pattern: <b>affect</b> is the action (a verb) — something <i>affects</i> something else. <b>Effect</b> is the result (a noun) — an <i>effect</i> is produced.</p>
   <p>Quick test: if you can put "the" or "an" in front of the word, it's a noun → <b>effect</b>. If the word needs a subject doing something to an object, it's a verb → <b>affect</b>.</p>`,
  table:{headers:['Aspect','Affect','Effect'],rows:[
    ['Most common role','Verb','Noun'],
    ['Meaning','to influence / impact','the result / outcome'],
    ['Quick test',"Can you say 'X affects Y'?","Can you say 'the effect of X'?"],
    ['Article test','Cannot take "the/an" before it','Can take "the/an" before it'],
    ['Example','The heat affected his performance.','The heat had a strong effect on his performance.']
  ]},
  rule:`<p>Default rule: <b>affect = verb</b> (to influence), <b>effect = noun</b> (a result). Apply this in roughly 90% of NDA-level sentences. The fixed phrase "to bring about" or "to put into effect" — and the rarer use of "effect" as a verb meaning "to bring about" (as in "effect a change") — are the main exceptions.</p>`,
  exceptions:[
    '"Effect" can rarely be used as a verb meaning "to cause / bring about": "The new officer effected several changes in routine." This is formal and uncommon, but appears in advanced NDA-level passages.',
    '"Affect" can rarely be used as a noun in psychology, meaning a person\'s visible emotional state ("a flat affect") — this sense never appears in NDA-level general English and can be ignored for exam purposes.',
    '"Side effects," "in effect," "take effect," and "personal effects" are fixed phrases — always "effect," never "affect," regardless of context.'
  ],
  examples:[
    {right:'Lack of sleep can affect concentration.',wrong:'Lack of sleep can effect concentration.',note:'Verb — sleep influences concentration — affect.'},
    {right:'The medicine had an immediate effect.',wrong:'The medicine had an immediate affect.',note:'Noun, takes "an" before it — effect.'},
    {right:'The new policy will take effect from Monday.',wrong:'The new policy will take affect from Monday.',note:'Fixed phrase "take effect" — always effect.'},
    {right:'The general effected major reforms in training.',wrong:'The general affected major reforms in training.',note:'Rare verb sense of "effect" — to bring about/cause — here it fits better than "affect" (influence).'}
  ],
  trick:'Memory Trick — "RAVEN": Remember Affect = Verb, Effect = Noun. Whenever in doubt, ask "is this an action (affect) or a result (effect)?"',
  officerTip:'In GD/lecturette topics about social issues ("effect of social media," "how pollution affects health"), examiners deliberately mix both words — practising this pair sharpens listening accuracy too.',
  pyq:[
    {q:'Choose the correct word: "Smoking can seriously ___ your health."',opts:['affect','effect','effects','affects'],ans:0,exp:'Verb needed — smoking influences health — affect.',pyq:true,year:'NDA 2016'},
    {q:'Choose the correct word: "The new rule had a positive ___ on discipline."',opts:['affect','effect','affecting','effected'],ans:1,exp:'Noun, takes "a/an" before it — effect.',pyq:true,year:'NDA 2022'},
    {q:'Identify the error: "The decision will effect thousands of soldiers."',opts:['No error','"effect" should be "affect"','"decision" should be "decisions"','"thousands" should be "thousand"'],ans:1,exp:'Verb needed (to influence) — should be "affect."'},
    {q:'Select the correct sentence:',opts:['The drought had a devastating affect on crops.','The drought had a devastating effect on crops.','The drought had a devastating effected on crops.','The drought had a devastating affecting on crops.'],ans:1,exp:'Noun — takes "a devastating" before it — effect.'},
    {q:'Fill the blank: "The new CEO plans to ___ several changes."',opts:['affect','effect','affects','effecting'],ans:1,exp:'Rare verb sense of "effect" — to bring about/cause — fits here, not "affect" (influence).'}
  ]
},
].concat(Array.isArray(window.VAANI_COMPARISON_EXTRA)?window.VAANI_COMPARISON_EXTRA:[]);

/* ============================================================
   VOCAB DATA — full mastery schema
   Fields: id,w,pos,cat[],diff(1-3),imp(1-5 exam importance),freq,
   meanEn,meanHi,easy,ipa,syl,etym,root,affix,
   syn[],ant[],similar[],confused[],family[],
   formal,brAm,prep,colloc[],mnemonic,mistake,
   exEasy,exMed,exAdv,exEdit,exNDA,years,pyq,quiz[{q,opts,ans,exp}]
=============================================================*/

/* ============================================================
   CONFUSING PAIRS (comparison table data)
=============================================================*/
const CONFUSED_PAIRS = [
{pair:'Affect / Effect',a:'Affect (verb) — to influence something.',b:'Effect (noun) — the result of a change.',trick:'"Affect" = Action (verb); "Effect" = End result (noun).'},
{pair:'Accept / Except',a:'Accept (verb) — to agree to receive or believe something.',b:'Except (preposition) — excluding; other than.',trick:'"Except" starts like "exclude" — both leave something out.'},
{pair:'Stationary / Stationery',a:'Stationary (adj) — not moving.',b:'Stationery (noun) — writing materials, paper, pens.',trick:'"stationEry" has an E, like "lEtter" and "papEr."'},
{pair:'Complement / Compliment',a:'Complement (verb/noun) — something that completes or goes well with.',b:'Compliment (verb/noun) — an expression of praise.',trick:'"complEment" completes; "complIment" gives prIde.'},
{pair:'Beside / Besides',a:'Beside (preposition) — next to.',b:'Besides (adverb) — in addition to; also.',trick:'"Besides" with an S means "also" — both have an extra S for "extra" info.'},
{pair:'Continual / Continuous',a:'Continual — happening repeatedly, with breaks.',b:'Continuous — happening without any interruption.',trick:'ContinUous = Unbroken; Continual = repeated, with gaps.'},
{pair:'Discreet / Discrete',a:'Discreet (adj) — careful and tactful, avoiding attention.',b:'Discrete (adj) — separate and distinct.',trick:'"discrEEt" keeps secrets close (two Es together); "discrETe" things are sEparaTE.'},
{pair:'Eminent / Imminent',a:'Eminent (adj) — famous and respected.',b:'Imminent (adj) — about to happen very soon.',trick:'"Eminent" = Excellent reputation; "Imminent" = Impending event.'},
{pair:'Principal / Principle',a:'Principal (noun/adj) — head of an institution; main/most important.',b:'Principle (noun) — a fundamental rule or belief.',trick:'The "principAL" is your pAL; a "principLE" is a ruLE.'},
{pair:'Lose / Loose',a:'Lose (verb) — to fail to keep or win something.',b:'Loose (adj) — not tight; free from restraint.',trick:'"Loose" has two Os, like a baggy, loose-fitting shirt.'},
{pair:'Elicit / Illicit',a:'Elicit (verb) — to draw out a response or information.',b:'Illicit (adj) — illegal or forbidden.',trick:'"ILLicit" looks like "ILLegal" — both start with ILL.'},
{pair:'Adverse / Averse',a:'Adverse (adj) — harmful or unfavourable (describes conditions/events).',b:'Averse (adj) — strongly disliking or opposed (describes a person\u2019s feeling).',trick:'"ADverse" describes ADverse conditions; "AVerse" is how You feel (Averse = "I have an aversion").'}
];

/* ============================================================
   DAILY MICRO-LESSON POOLS (one rotates per day, by date)
=============================================================*/
const DAILY_IDIOMS = [
{t:'Bite the bullet',mean:'To face a difficult or painful situation with courage.',ex:'He had to bite the bullet and accept the tough posting.'},
{t:'Once in a blue moon',mean:'Very rarely.',ex:'He visits his hometown once in a blue moon.'},
{t:'Back to the wall',mean:'In a desperate situation with no easy way out.',ex:'With his back to the wall, the soldier fought on.'},
{t:'Burn the midnight oil',mean:'To work late into the night.',ex:'Cadets often burn the midnight oil before the final exam.'},
{t:'Cut corners',mean:'To do something in the cheapest or easiest way, often sacrificing quality.',ex:'You cannot cut corners when it comes to safety drills.'},
{t:'Hit the nail on the head',mean:'To describe exactly what is causing a situation or problem.',ex:'The instructor hit the nail on the head about our weak spot.'},
{t:'In the same boat',mean:'In the same difficult situation as someone else.',ex:'All the new recruits were in the same boat during training.'},
{t:'Keep at bay',mean:'To prevent something from approaching or affecting you.',ex:'Constant patrolling kept the smugglers at bay.'},
{t:'On the fence',mean:'Undecided between two choices.',ex:'He is still on the fence about which branch to join.'},
{t:'Turn a blind eye',mean:'To deliberately ignore something wrong.',ex:'The officer refused to turn a blind eye to indiscipline.'},
{t:'Pull strings',mean:'To use personal connections to gain an advantage.',ex:'He refused to pull strings to get a better posting.'},
{t:'Make a long story short',mean:'To summarize briefly.',ex:'To make a long story short, the mission was a success.'}
];
const DAILY_PHRASES = [
{t:'A far cry from',mean:'Very different from.',ex:'Life at the academy was a far cry from his comfortable home.'},
{t:'In the nick of time',mean:'At the last possible moment.',ex:'The reinforcements arrived in the nick of time.'},
{t:'Against all odds',mean:'Despite great difficulty; very unlikely to succeed.',ex:'Against all odds, the small unit held the position.'},
{t:'By and large',mean:'On the whole; generally speaking.',ex:'By and large, the training programme was a success.'},
{t:'At the eleventh hour',mean:'At the very last moment, just before it is too late.',ex:'The deal was struck at the eleventh hour.'},
{t:'Under the weather',mean:'Feeling slightly unwell.',ex:'He skipped the parade as he was feeling under the weather.'},
{t:'Out of the blue',mean:'Suddenly and unexpectedly.',ex:'The transfer order came out of the blue.'},
{t:'A blessing in disguise',mean:'Something that seems bad at first but turns out to be good.',ex:'The injury was a blessing in disguise — it kept him from a risky mission.'}
];
const DAILY_PROVERBS = [
{t:'Actions speak louder than words.',mean:'What you do matters more than what you say.',ex:'The captain led by example — actions speak louder than words.'},
{t:'A stitch in time saves nine.',mean:'Fixing a small problem early prevents bigger trouble later.',ex:'Routine maintenance follows the rule: a stitch in time saves nine.'},
{t:'All that glitters is not gold.',mean:'Not everything that looks valuable or good actually is.',ex:'The flashy new recruit soon proved that all that glitters is not gold.'},
{t:'Better late than never.',mean:'It is better to do something late than not at all.',ex:'He finally apologised — better late than never.'},
{t:'Discretion is the better part of valour.',mean:'Sometimes caution is wiser than reckless bravery.',ex:'The commander withdrew, knowing discretion is the better part of valour.'},
{t:'Every cloud has a silver lining.',mean:'Even difficult situations have some positive aspect.',ex:'The delay let them regroup — every cloud has a silver lining.'},
{t:'Practice makes perfect.',mean:'Repeated practice improves skill.',ex:'Daily drills prove that practice makes perfect.'},
{t:'Where there\u2019s a will, there\u2019s a way.',mean:'Determination can overcome obstacles.',ex:'Despite the setback, the team proved where there\u2019s a will, there\u2019s a way.'}
];
const DAILY_PHRASAL_VERBS = [
{t:'Carry out',mean:'To perform or complete a task.',ex:'The unit carried out the operation flawlessly.'},
{t:'Bring about',mean:'To cause something to happen.',ex:'The reforms brought about a major change in training.'},
{t:'Call off',mean:'To cancel.',ex:'The exercise was called off due to bad weather.'},
{t:'Set up',mean:'To establish or arrange.',ex:'They set up a forward base near the border.'},
{t:'Look into',mean:'To investigate.',ex:'The board agreed to look into the complaint.'},
{t:'Stand by',mean:'To be ready to act; to support someone.',ex:'The reserve unit was told to stand by.'},
{t:'Break out',mean:'To start suddenly (often used for conflict or disease).',ex:'Fighting broke out along the border at dawn.'},
{t:'Hold on',mean:'To wait; to maintain a position.',ex:'The platoon was ordered to hold on until backup arrived.'},
{t:'Wear down',mean:'To gradually weaken or exhaust.',ex:'The long siege began to wear down the defenders.'},
{t:'Fall back',mean:'To retreat in an organised way.',ex:'The company fell back to a more defensible position.'}
];
const DAILY_COLLOCATIONS = [
{t:'Make a decision',mean:'To decide.',ex:'The general had to make a swift decision.'},
{t:'Take responsibility',mean:'To accept accountability.',ex:'He took full responsibility for the error.'},
{t:'Pay attention',mean:'To concentrate on something.',ex:'Cadets must pay attention during the briefing.'},
{t:'Draw a conclusion',mean:'To reach a judgement based on evidence.',ex:'It is too early to draw a conclusion from one report.'},
{t:'Heavy rain',mean:'Intense rainfall.',ex:'Heavy rain delayed the field exercise.'},
{t:'Strong coffee',mean:'Concentrated, intense coffee.',ex:'Night watch always runs on strong coffee.'},
{t:'Deeply concerned',mean:'Very worried.',ex:'Officials are deeply concerned about the ceasefire violations.'},
{t:'Utterly devastated',mean:'Completely shocked or ruined.',ex:'The village was utterly devastated by the flood.'}
];
const DAILY_PREFIXES = [
{t:'un-',mean:'Not / opposite of.',ex:'unarmed, unaware, unyielding'},
{t:'re-',mean:'Again / back.',ex:'reconnaissance, regroup, retreat'},
{t:'dis-',mean:'Not / reverse action.',ex:'disarm, disobey, discredit'},
{t:'mis-',mean:'Wrongly / badly.',ex:'misfire, miscalculate, mislead'},
{t:'pre-',mean:'Before.',ex:'pre-empt, precaution, predecessor'},
{t:'anti-',mean:'Against.',ex:'antiaircraft, antidote, antiwar'},
{t:'sub-',mean:'Under / below.',ex:'subordinate, submarine, subjugate'},
{t:'inter-',mean:'Between / among.',ex:'intercept, international, interrogate'}
];
const DAILY_SUFFIXES = [
{t:'-tion',mean:'Forms nouns indicating an action or state.',ex:'reconnaissance → no; better: action → action, formation, mobilization'},
{t:'-able',mean:'Capable of / fit for.',ex:'commendable, vulnerable, formidable'},
{t:'-ful',mean:'Full of.',ex:'resourceful, dutiful, vengeful'},
{t:'-less',mean:'Without.',ex:'fearless, relentless, defenceless'},
{t:'-ment',mean:'Forms nouns showing a result or action.',ex:'deployment, achievement, judgment'},
{t:'-ous',mean:'Full of / having the qualities of.',ex:'audacious, pernicious, courageous'},
{t:'-ize',mean:'To make or become.',ex:'mobilize, demoralize, neutralize'},
{t:'-ist',mean:'A person who does/believes in something.',ex:'strategist, loyalist, specialist'}
];
const DAILY_ROOTS = [
{t:'Bene / Bon (good)',mean:'Latin root meaning "good."',ex:'benefit, benevolent, bonus'},
{t:'Dict (to say)',mean:'Latin root meaning "to say/speak."',ex:'dictate, predict, verdict'},
{t:'Bellum / Belli (war)',mean:'Latin root meaning "war."',ex:'belligerent, rebellion, antebellum'},
{t:'Port (to carry)',mean:'Latin root meaning "to carry."',ex:'transport, deport, portable'},
{t:'Spect (to look)',mean:'Latin root meaning "to look/see."',ex:'inspect, spectator, retrospect'},
{t:'Duc/Duct (to lead)',mean:'Latin root meaning "to lead."',ex:'conduct, induce, deduce'},
{t:'Vid/Vis (to see)',mean:'Latin root meaning "to see."',ex:'visible, supervise, vision'},
{t:'Scrib/Script (to write)',mean:'Latin root meaning "to write."',ex:'inscribe, manuscript, prescribe'}
];
const FOREIGN_PHRASES = [
{t:'Status quo',lang:'Latin',mean:'The existing state of affairs.',ex:'Both sides agreed to maintain the status quo along the border.'},
{t:'Bona fide',lang:'Latin',mean:'Genuine; in good faith.',ex:'He presented bona fide identification at the checkpoint.'},
{t:'Vis-à-vis',lang:'French',mean:'In relation to; compared with.',ex:'The report assessed troop strength vis-à-vis the neighbouring country.'},
{t:'Coup d\u2019état',lang:'French',mean:'A sudden, illegal seizure of power, often by the military.',ex:'The region saw its third coup d\u2019état in a decade.'},
{t:'Quid pro quo',lang:'Latin',mean:'A favour given in exchange for something.',ex:'Critics alleged a quid pro quo behind the deal.'},
{t:'Modus operandi',lang:'Latin',mean:'A particular way or method of doing something.',ex:'Investigators studied the smugglers\u2019 modus operandi.'},
{t:'Déjà vu',lang:'French',mean:'A feeling of having already experienced the present situation.',ex:'Watching the negotiations stall again felt like déjà vu.'},
{t:'Ad hoc',lang:'Latin',mean:'Formed or done for a particular purpose, as necessary.',ex:'An ad hoc committee was set up to investigate the incident.'}
];

/* ============================================================
   PRACTICE / READING / TESTS DATA
=============================================================*/
const PRACTICE = [
{id:'p-error',icon:'🎯',title:'Error Detection',desc:'Spot the grammatically wrong segment of a sentence.',
 q:[{s:'The soldiers (A) was marching (B) towards the (C) border at dawn (D) No error',ans:'A',exp:'"Soldiers" is plural, so it should be "were marching," not "was marching."'},
    {s:'Neither of the two officers (A) were willing (B) to take charge (C) of the unit (D) No error',ans:'A',exp:'"Neither" is singular and requires "was," not "were."'}]},
{id:'p-improve',icon:'✨',title:'Sentence Improvement',desc:'Choose the best replacement for the underlined part.',
 q:[{s:'He is one of the best officer in the regiment.',opts:['one of the best officer','one of the best officers','one of the better officer','no improvement'],ans:1,exp:'"One of the" must be followed by a plural noun: "officers."'}]},
{id:'p-rearrange',icon:'🔀',title:'Sentence Rearrangement (PQRS)',desc:'Arrange jumbled parts into a logical sentence.',
 q:[{s:'P: he reached the camp / Q: after a long march / R: tired but determined / S: at dawn',opts:['P-Q-S-R','Q-P-S-R','P-S-Q-R','S-P-Q-R'],ans:0,exp:'Logical flow: action (P) → manner (Q) → time (S) → state (R): "He reached the camp after a long march at dawn, tired but determined."'}]},
{id:'p-cloze',icon:'🧩',title:'Cloze Test',desc:'Fill in the blank with the most appropriate word from context.',
 q:[{s:'Discipline is the ___ of every successful army; without it, even the bravest soldiers fail.',opts:['enemy','backbone','luxury','accident'],ans:1,exp:'"Backbone" fits the context of being foundational/essential.'}]},
{id:'p-onewordsub',icon:'🔤',title:'One Word Substitution',desc:'Replace the phrase with a single precise word.',
 q:[{s:'A person who is invited to a place but goes uninvited:',opts:['Trespasser','Gatecrasher','Intruder','Stranger'],ans:1,exp:'"Gatecrasher" specifically means someone who attends uninvited.'}]},
{id:'p-spotting',icon:'🔍',title:'Spotting Errors — Advanced',desc:'Multi-clause sentences with subtle agreement/tense errors.',
 q:[{s:'Each of the candidates (A) have submitted (B) their documents (C) before the deadline (D) No error',ans:'A',exp:'"Each" requires singular "has submitted," not "have submitted."'}]},
];

const READING = [
{id:'r1',icon:'📰',title:'The Sentinel at Siachen',time:'8 min',
 passage:`The Siachen Glacier, often called the world's highest battlefield, sits at altitudes exceeding 20,000 feet, where temperatures plunge to minus 50 degrees Celsius and oxygen is thin enough to slow thought itself. Since 1984, Indian soldiers have maintained a continuous presence here, not because the terrain offers any strategic resource, but because ceding it would expose vital territory to encroachment. Survival itself becomes the daily mission: frostbite, altitude sickness, and avalanches claim more lives than enemy fire ever has. Yet morale among the troops remains remarkably resilient, sustained by a culture that treats endurance as a form of quiet heroism rather than misfortune.`,
 q:[{s:'According to the passage, what is the primary danger soldiers face at Siachen?',opts:['Enemy fire','Environmental hazards','Lack of supplies','Equipment failure'],ans:1,exp:'The passage states frostbite, altitude sickness, and avalanches claim more lives than enemy fire.'},
 {s:'The word "ceding" in the passage most nearly means:',opts:['Capturing','Giving up','Defending','Exploring'],ans:1,exp:'"Ceding" means surrendering or giving up territory.'},
 {s:'What is the author\'s tone toward the soldiers stationed there?',opts:['Critical','Indifferent','Admiring','Skeptical'],ans:2,exp:'Phrases like "quiet heroism" and "remarkably resilient" indicate admiration.'}]},
{id:'r2',icon:'🛡️',title:'Leadership Under Fire',time:'6 min',
 passage:`Field Marshal Sam Manekshaw once remarked that a leader's true test arrives not in the planning room but on the battlefield, where decisions must be made in seconds with incomplete information. Military history is replete with examples of commanders who excelled at theory yet faltered under the chaos of real engagement, and others who, lacking formal brilliance, thrived because they could read a changing situation and adapt instantly. This distinction — between knowledge and judgment — defines the gap between a competent officer and an exceptional one.`,
 q:[{s:'The passage suggests that exceptional officers are distinguished primarily by:',opts:['Formal academic brilliance','Ability to adapt under pressure','Years of service','Physical fitness'],ans:1,exp:'The passage explicitly distinguishes "knowledge" from "judgment," favoring adaptive judgment.'},
 {s:'The word "replete" means:',opts:['Empty','Full of','Lacking','Confused'],ans:1,exp:'"Replete with" means abundantly filled with examples.'}]},
];

const TESTS = [
{id:'t1',icon:'📝',title:'Daily Quiz',desc:'10 mixed questions across grammar & vocabulary.',n:10},
{id:'t2',icon:'📅',title:'Weekly Test',desc:'25 questions covering the week\'s topics.',n:12},
{id:'t3',icon:'🏅',title:'Grand Mock Test',desc:'Full-length simulated NDA English paper.',n:15},
{id:'t4',icon:'📜',title:'PYQ Set — Tenses & Voice',desc:'Previous-year-style questions, topic-wise.',n:8},
{id:'t5',icon:'⏳',title:'Timed Sprint (5 min)',desc:'Fast-paced accuracy drill under the clock.',n:8},
{id:'t6',icon:'🧠',title:'Adaptive Difficulty Set',desc:'Question difficulty adjusts to your accuracy.',n:10},
];
function buildGenericQuiz(n){
  const pool = [];
  GRAMMAR.forEach(g=>g.quiz.forEach(q=>pool.push(q)));
  PRACTICE.forEach(p=>p.q.forEach(q=>{
    if(q.opts) pool.push({q:q.s,opts:q.opts,ans:q.ans,exp:q.exp});
  }));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,n);
}

/* ============================================================
   PYQ COMMAND VAULT — DATA + ENGINE (integrated module)
   Paper data now lives in data/pyq/<year>-<session>.js (one file per
   paper, loaded via <script src> near the top of this file). To add a
   future paper: drop a new file in there and add one <script src> line
   -- _pyqAutoDiscover() below picks it up automatically. Everything
   else -- filters, dashboard stats, topic cross-links, global search --
   reads from PYQ_PAPERS/PYQ_ALL automatically.
=============================================================*/

/* ============================================================
   PYQ PAPER REGISTRY — dynamic, metadata-driven, order-independent
   ------------------------------------------------------------
   Design contract (read this before adding a paper):

   1. A paper's identity (year + session) is DERIVED from the `y`/`s`
      fields already present on its own questions — never passed in
      separately. Single source of truth: edit the data, and the
      registry, sort order and grouping all follow automatically.
   2. registerPYQPaper() calls may appear in ANY order, ANYWHERE in the
      file. Final ordering is always recomputed from scratch by
      getSortedPYQPapers() — nothing relies on call/registration order.
   3. Malformed data (not an array, empty, no question passes
      validation) is skipped with a console.warn — it never throws and
      never corrupts the rest of the archive.
   4. Duplicate papers (same year+session registered twice) are
      detected and the later one is ignored, with a console.warn.
   5. TO ADD A NEW PAPER: define its question array exactly like the
      existing ones (every question needs y/s/n/sec/q/o/ans) and call
      registerPYQPaper(YOUR_ARRAY) once, anywhere. Nothing else needs
      to change — no manual year/session bookkeeping, no inserting it
      "in the right place" in a master list.
   6. As a forward-compatible safety net, _pyqAutoDiscover() also scans
      `window` for any not-yet-registered array matching the
      PYQ_<year>_<session> naming convention. Top-level `const` in a
      classic <script> doesn't attach to `window`, so this is a no-op
      today — but if papers are ever split into their own files using
      `var PYQ_2020_I = [...]`, they get picked up with ZERO extra
      code, i.e. "drop the file in and it just appears".
   ============================================================ */
const _pyqRegistry = [];
const _pyqSeenKeys = new Set();

/* ---- exam types ----
   Bare `PYQ_<year>_<session>` globals are NDA by default (unchanged,
   zero renaming of existing files). `PYQ_CDS_<year>_<session>` globals
   are CDS. Add new exam types here if the archive ever grows beyond
   these two — nothing else needs a hardcoded exam list. */
const PYQ_EXAM_INFO = {
  NDA: { code:'NDA', full:'National Defence Academy', short:'NDA' },
  CDS: { code:'CDS', full:'Combined Defence Services', short:'CDS' },
  AFCAT: { code:'AFCAT', full:'Air Force Common Admission Test', short:'AFCAT' }
};
function _pyqKey(exam, year, session){ return exam+'-'+year+'-'+session; }

// Roman-numeral-aware session ranking, so sorting keeps working
// correctly even for session labels this file's author never
// anticipated (III, IV, etc.) instead of a hardcoded {I,II} map.
const _PYQ_ROMAN_RANK = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
function _pyqSessionRank(session){
  const r = _PYQ_ROMAN_RANK[String(session).toUpperCase()];
  return r !== undefined ? r : 999; // unrecognised sessions sort after known ones
}

function _pyqValidateQuestion(item){
  return !!item && typeof item === 'object'
    && item.y != null && !isNaN(Number(item.y))
    && typeof item.s === 'string' && item.s.trim() !== ''
    && typeof item.q === 'string' && item.q.trim() !== ''
    && Array.isArray(item.o) && item.o.length >= 2
    && typeof item.ans === 'number' && item.ans >= 0 && item.ans < item.o.length;
}

/**
 * Register one paper's question array. Year/session are read straight
 * off the questions themselves — see contract above. `exam` is 'NDA'
 * (default, for backward compatibility) or 'CDS'.
 */
function registerPYQPaper(data, exam){
  const examCode = exam || 'NDA';
  if(!Array.isArray(data) || !data.length){
    console.warn('[PYQ] Skipped an invalid paper source (expected a non-empty array).', data);
    return;
  }
  const validQuestions = data.filter(_pyqValidateQuestion);
  if(!validQuestions.length){
    console.warn('[PYQ] Skipped a paper source: every question failed validation.', data);
    return;
  }
  const year = Number(validQuestions[0].y);
  const session = String(validQuestions[0].s);
  const examShort = (PYQ_EXAM_INFO[examCode] && PYQ_EXAM_INFO[examCode].short) || examCode;
  const label = examShort + ' ' + session + ' ' + year;

  // Guard against a single array accidentally mixing questions from
  // more than one paper — keep only the ones matching the paper's
  // dominant (first-question) identity, and warn about the rest.
  const cleanQuestions = validQuestions.filter(q => Number(q.y) === year && String(q.s) === session);
  if(cleanQuestions.length !== validQuestions.length){
    console.warn('[PYQ] "'+label+'": '+(validQuestions.length-cleanQuestions.length)+' question(s) had mismatched year/session metadata and were dropped.');
  }

  const key = _pyqKey(examCode, year, session);
  if(_pyqSeenKeys.has(key)){
    console.warn('[PYQ] Duplicate paper ignored: "'+label+'" is already registered.');
    return;
  }
  _pyqSeenKeys.add(key);
  _pyqRegistry.push({ year:year, session:session, exam:examCode, label:label, data:cleanQuestions });
}

/* ---- forward-compatible auto-discovery (see point 6 above) ----
   Two naming conventions, two exams: bare `PYQ_<year>_<session>` is
   NDA (unchanged); `PYQ_CDS_<year>_<session>` is CDS. The CDS pattern
   is checked first since it's the more specific of the two — a CDS
   global would never match the bare NDA pattern anyway (it doesn't
   start with 4 digits right after "PYQ_"), but checking order keeps
   the intent explicit. */
function _pyqAutoDiscover(){
  if(typeof window === 'undefined') return;
  const cdsPattern = /^PYQ_CDS_(\d{4})_([IVXLC]+)$/;
  const afcatPattern = /^PYQ_AFCAT_(\d{4})_([IVXLC]+)$/;
  const ndaPattern = /^PYQ_(\d{4})_([IVXLC]+)$/;
  Object.keys(window).forEach(function(key){
    let exam = null;
    if(cdsPattern.test(key)) exam = 'CDS';
    else if(afcatPattern.test(key)) exam = 'AFCAT';
    else if(ndaPattern.test(key)) exam = 'NDA';
    else return;
    const candidate = window[key];
    if(!Array.isArray(candidate) || !candidate.length) return;
    const already = _pyqSeenKeys.has(_pyqKey(exam, Number(candidate[0].y), String(candidate[0].s)));
    if(!already) registerPYQPaper(candidate, exam);
  });
}

// Papers are picked up automatically by _pyqAutoDiscover() below (each
// data/pyq/*.js file declares `var PYQ_<year>_<session> = [...]`, which
// attaches to `window` and matches the naming convention it scans for).
// No manual registerPYQPaper() calls needed any more.
_pyqAutoDiscover(); // picks up any paper attached to `window` that wasn't explicitly registered above

/* ---- final sorted view consumed by the rest of the app ----
   Year ascending (2009 → latest); within a year, NDA I before NDA II
   (and any further sessions in roman-numeral order); recomputed fresh
   every load so it never depends on registration order. */
function getSortedPYQPapers(){
  return _pyqRegistry.slice().sort(function(a,b){
    if(a.year !== b.year) return a.year - b.year;
    const rankDiff = _pyqSessionRank(a.session) - _pyqSessionRank(b.session);
    if(rankDiff !== 0) return rankDiff;
    return String(a.session).localeCompare(String(b.session)); // stable fallback for equal/unknown ranks
  });
}
const PYQ_PAPERS = getSortedPYQPapers();
// _id stays exactly `${y}-${s}-${n}` for NDA (the default/original exam) so
// every existing user's saved stats/bookmarks keep matching with zero
// migration. Only non-NDA exams (CDS, etc.) get an exam prefix, which is
// enough on its own to guarantee no collision with NDA even if a future
// exam ever shares a year+session+question-number with an NDA paper.
function _pyqQuestionId(exam, q){ return (exam && exam!=='NDA' ? exam+'-' : '') + `${q.y}-${q.s}-${q.n}`; }
const PYQ_ALL = PYQ_PAPERS.flatMap(p=>p.data.map(q=>{
  const originalTags=Array.isArray(q.tags)?q.tags.slice():[];
  const item={...q,_id:_pyqQuestionId(p.exam,q),_exam:p.exam,_sourceSec:q.sec,_sourceTags:originalTags};
  if(window.VaaniPyqTaxonomy&&typeof window.VaaniPyqTaxonomy.topic==='function') item.sec=window.VaaniPyqTaxonomy.topic(item);
  if(window.VaaniPyqTaxonomy&&typeof window.VaaniPyqTaxonomy.tags==='function') item.tags=window.VaaniPyqTaxonomy.tags(item);
  else item.tags=originalTags;
  return item;
}));
const PYQ_BY_ID = {}; PYQ_ALL.forEach(q=>PYQ_BY_ID[q._id]=q);

/* Highlight the explicit target keyword safely across PYQ types. */
function pyqHighlightText(text, keyword){
  text=String(text==null?'':text);
  keyword=String(keyword||'').trim();
  const safe=value=>escapeHtmlVaani(String(value)).replace(/\r\n?/g,'\n');
  if(!keyword)return safe(text);
  const at=text.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase());
  if(at<0)return safe(text);
  const endAt=at+keyword.length;
  return safe(text.slice(0,at))+'<mark class="pyq-vocab-hi pyq-keyword-highlight">'+safe(text.slice(at,endAt))+'</mark>'+safe(text.slice(endAt));
}
function pyqHi(q){
  if(!q||typeof q.q!=='string')return '';
  const keyword=window.VaaniPyqTaxonomy&&typeof window.VaaniPyqTaxonomy.keyword==='function'
    ?window.VaaniPyqTaxonomy.keyword(q):String(q.keyword||'').trim();
  return pyqHighlightText(q.q,keyword);
}
/* Render spotting-error sentence boundaries as visible, labelled parts.
   Sources vary: imported CDS banks may carry an explicit parts array,
   older NDA banks place (a)/(b)/(c) inline, and newer CDS banks use |. */
function pyqSpottingCleanPart(value){
  return String(value==null?'':value)
    .replace(/^\s*(?:\/|\|)\s*/,'')
    .replace(/\s*(?:\/|\|)\s*$/,'')
    .trim();
}
function pyqSpottingIsNoError(value){
  return /^no\s+error[.!?]?$/i.test(pyqSpottingCleanPart(value));
}
function pyqSpottingParts(q){
  if(!q||typeof q.q!=='string')return null;
  const source=q.q;
  const explicit=String(q.spottingFormat||'').trim().toLowerCase();
  const forceFour=explicit==='four-part'||q.spottingNoError===false;
  const forceNoError=explicit==='three-part-no-error'||q.spottingNoError===true;
  const markers=[...source.matchAll(/\(([abcd])\)\s*\/?/gi)];
  if(markers.length>=3){
    const sequence=markers.map(m=>m[1].toLowerCase()).join('');
    const hasABC=sequence.startsWith('abc');
    const hasABCD=sequence.startsWith('abcd');
    if(hasABC){
      const atFront=!source.slice(0,markers[0].index).trim();
      const bridge=hasABCD
        ?pyqSpottingCleanPart(source.slice(markers[2].index+markers[2][0].length,markers[3].index))
        :'';
      const afterD=hasABCD
        ?pyqSpottingCleanPart(source.slice(markers[3].index+markers[3][0].length))
        :'';
      const noErrorOption=Array.isArray(q.o)&&q.o.some(option=>/\bno\s+error\b/i.test(String(option)));
      const sourceSaysNoError=pyqSpottingIsNoError(bridge)||pyqSpottingIsNoError(afterD);
      const noError=forceFour?false:(forceNoError||sourceSaysNoError||(!hasABCD&&noErrorOption));
      const count=forceFour?4:(hasABCD?(noError?3:4):3);
      if(markers.length>=count){
        const parts=[];
        if(atFront){
          for(let i=0;i<count;i++){
            const marker=markers[i];
            const next=markers[i+1];
            const raw=source.slice(marker.index+marker[0].length,next?next.index:source.length);
            parts.push(pyqSpottingCleanPart(raw));
          }
        }else{
          let cursor=0;
          for(let i=0;i<count;i++){
            const marker=markers[i];
            parts.push(pyqSpottingCleanPart(source.slice(cursor,marker.index)));
            cursor=marker.index+marker[0].length;
          }
        }
        if(parts.length===count&&parts.every(part=>part))return parts;
      }
    }
  }
  // Pipe-delimited legacy sources may omit the inline (a)-(d) markers.
  if(/\s\|\s/.test(source)){
    const split=source.split(/\s*\|\s*/).map(pyqSpottingCleanPart).filter(Boolean);
    if(split.length===4&&pyqSpottingIsNoError(split[3]))return split.slice(0,3);
    if(split.length===3||split.length===4)return split;
  }
  if(Array.isArray(q.parts)&&(q.parts.length===3||q.parts.length===4)&&q.parts.every(p=>typeof p==='string'&&p.trim())){
    return q.parts.map(p=>pyqSpottingCleanPart(p));
  }
  // Legacy NDA banks sometimes store the sentence fragments in q.o.
  const choices=Array.isArray(q.o)?q.o.map(value=>String(value).trim()):[];
  const hasNoError=choices.length>0&&pyqSpottingIsNoError(choices[choices.length-1]);
  const count=choices.length-(hasNoError?1:0);
  if((count===3||count===4)&&choices.slice(0,count).every(value=>value.length>2&&!/^error\s+in\s+part/i.test(value))){
    const lower=source.toLocaleLowerCase();let cursor=0;const parts=[];
    for(const phrase of choices.slice(0,count)){
      const index=lower.indexOf(phrase.toLocaleLowerCase(),cursor);
      if(index<0)return null;
      parts.push(source.slice(index,index+phrase.length));cursor=index+phrase.length;
    }
    const tail=source.slice(cursor);
    if(/^[\s.!?;:]*$/.test(tail)&&tail.trim())parts[parts.length-1]+=tail.trim();
    return parts;
  }
  return null;
}
function pyqSpottingFormat(q,parts){
  const explicit=String(q&&q.spottingFormat||'').trim().toLowerCase();
  if(explicit==='four-part'||explicit==='four-part-no-error')return 'four-part';
  if(explicit==='three-part')return 'three-part';
  if(explicit==='three-part-no-error')return 'three-part-no-error';
  if(q&&q.spottingNoError===false)return parts&&parts.length===4?'four-part':'three-part';
  if(q&&q.spottingNoError===true)return 'three-part-no-error';
  const options=Array.isArray(q&&q.o)?q.o.map(value=>String(value||'')):[];
  if(options.some(value=>/error\s+in\s+part\s*\(?d\)?/i.test(value)))return 'four-part';
  if(parts&&parts.length===4)return 'four-part';
  const source=String(q&&q.q||'');
  const markers=[...source.matchAll(/\(([abcd])\)\s*\/?/gi)];
  const hasABCD=markers.map(m=>m[1].toLowerCase()).join('').startsWith('abcd');
  if(hasABCD){
    const bridge=markers[2]&&markers[3]
      ?pyqSpottingCleanPart(source.slice(markers[2].index+markers[2][0].length,markers[3].index)):'';
    const afterD=markers[3]?pyqSpottingCleanPart(source.slice(markers[3].index+markers[3][0].length)):'';
    if(!pyqSpottingIsNoError(bridge)&&!pyqSpottingIsNoError(afterD))return 'four-part';
  }
  const hasNoError=/\bno\s+error\b/i.test(source)||options.some(value=>/\bno\s+error\b/i.test(value));
  if(parts&&parts.length===3)return hasNoError?'three-part-no-error':'three-part';
  if(hasNoError)return 'three-part-no-error';
  return 'three-part';
}
function pyqOptionLabels(q){
  if(!q||!Array.isArray(q.o))return [];
  if(String(q._sourceSec||q.sec||'').trim().toLowerCase()==='spotting errors'){
    const parts=pyqSpottingParts(q);
    const format=pyqSpottingFormat(q,parts);
    const explicit=String(q.spottingFormat||'').trim().toLowerCase();
    const hasDChoice=q.o.some(value=>/error\s+in\s+part\s*\(?d\)?/i.test(String(value)));
    const hasNoError=q.o.some(value=>/\bno\s+error\b/i.test(String(value)));
    if(!parts&&!explicit&&q.spottingNoError===undefined&&!hasDChoice&&!hasNoError)return q.o;
    const count=format==='four-part'?4:format==='three-part-no-error'?3:parts&&parts.length===4?4:3;
    const labels=Array.from({length:count},(_,i)=>'Error in part ('+String.fromCharCode(97+i)+')');
    if(format==='three-part-no-error')labels.push('No error');
    return labels;
  }
  return q.o;
}
function pyqLabeledBlocks(q){
  if(!q||typeof q.q!=='string')return null;
  const source=q.q;
  const inline=[...source.matchAll(/\(([PQRS])\)\s*\/?\s*/g)];
  if(inline.length>=3){
    const blocks=[];let cursor=0;
    for(const m of inline){
      const text=source.slice(cursor,m.index).trim();
      if(text)blocks.push({label:m[1],text});
      cursor=m.index+m[0].length;
    }
    const tail=source.slice(cursor).trim();
    if(tail&&blocks.length)blocks[blocks.length-1].text+=' '+tail;
    return blocks.length>=3?blocks:null;
  }
  const re=/(?:^|\n|\s|[\/\|]\s*)(S1|S2|S3|S6|P|Q|R|S)\s*[\.:]\s*/g;
  const matches=[...source.matchAll(re)];
  if(!matches.length)return null;
  const blocks=[];
  for(let i=0;i<matches.length;i++){
    const label=matches[i][1];
    const startAt=matches[i].index+matches[i][0].length;
    const endAt=i+1<matches.length?matches[i+1].index:source.length;
    const text=source.slice(startAt,endAt).replace(/\s*\/\s*$/,'').trim();
    if(text)blocks.push({label,text});
  }
  return blocks.length>=3?blocks:null;
}
function pyqLabeledBlocksHTML(q){
  const blocks=pyqLabeledBlocks(q);
  if(!blocks)return null;
  const keyword=window.VaaniPyqTaxonomy&&typeof window.VaaniPyqTaxonomy.keyword==='function'
    ?window.VaaniPyqTaxonomy.keyword(q):String(q.keyword||'').trim();
  return '<div class="pv-structured-question">'+blocks.map(b=>
    '<div class="pv-structured-row"><span class="pv-structured-label">'+escapeHtmlVaani(b.label)+'</span><span class="pv-structured-text">'+pyqHighlightText(b.text,keyword)+'</span></div>'
  ).join('')+'</div>';
}
function pyqPromptHTML(q){
  if(!q||typeof q.q!=='string')return '';
  const sourceSec=String(q._sourceSec||q.sec||'').trim().toLowerCase();
  if(sourceSec==='spotting errors'){
    const parts=pyqSpottingParts(q);
    if(!parts)return '<span class="pv-error-unsegmented">'+pyqHi(q)+'</span>';
    const partLabels=parts.map((_,i)=>String.fromCharCode(97+i));
    return '<span class="pv-error-parts" role="group" aria-label="Sentence parts '+partLabels.join(', ')+'" data-part-count="'+parts.length+'">'+
      parts.map((part,i)=>'<span class="pv-error-segment"><span class="pv-error-segment-text">'+escapeHtmlVaani(part)+'</span><span class="pv-error-segment-label" aria-label="Part '+partLabels[i]+'">('+partLabels[i]+')</span></span>').join('<span class="pv-error-segment-divider" aria-hidden="true"> / </span>')+
      '</span>';
  }
  if(/^(?:choose the correct usage|ordering of sentences|sentence arrangement \(pqrs\))$/i.test(sourceSec)){
    const structured=pyqLabeledBlocksHTML(q);if(structured)return structured;
  }
  return pyqHi(q);
}
/* ---- stats (persisted in State.pyqStats) ---- */
function ensurePyqStats(){
  State.pyqStats = State.pyqStats || { attempts:{}, history:[] };
  State.pyqStats.attempts = State.pyqStats.attempts || {};
  State.pyqStats.history = State.pyqStats.history || [];
  return State.pyqStats;
}
function pyqAccuracyFor(list){
  const st = ensurePyqStats();
  const attempted = list.filter(q=>st.attempts[q._id]!==undefined);
  if(!attempted.length) return null;
  const correct = attempted.filter(q=>st.attempts[q._id]===true).length;
  return Math.round((correct/attempted.length)*100);
}
function pyqTopicAccuracy(){
  const st = ensurePyqStats();
  const bySec = {};
  PYQ_ALL.forEach(q=>{
    if(st.attempts[q._id]===undefined) return;
    bySec[q.sec] = bySec[q.sec] || {c:0,t:0};
    bySec[q.sec].t++;
    if(st.attempts[q._id]===true) bySec[q.sec].c++;
  });
  return Object.entries(bySec).map(([sec,v])=>({sec, acc:Math.round(v.c/v.t*100), n:v.t}));
}
/* ============================================================
   MISTAKE NOTEBOOK — spaced repetition for vocab + PYQ.
   Leitner-style boxes: get it wrong -> back to box 0, due tomorrow.
   Get it right -> advance a box, due further out. Reach the last box
   and get it right once more -> it's graduated, drops off the list.
============================================================ */
const REVIEW_INTERVALS_DAYS = [1,2,4,8,16,30];
function ensureReviewQueue(){ if(!Array.isArray(State.reviewQueue)) State.reviewQueue=[]; return State.reviewQueue; }
function findReviewItem(kind, ref){ return ensureReviewQueue().find(x=>x.kind===kind && x.ref===ref); }
function addDaysISO(days){ const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString(); }
function reviewMarkWrong(kind, ref){
  const q = ensureReviewQueue();
  let item = findReviewItem(kind, ref);
  if(!item){ item = {kind, ref, box:0, wrongCount:0, rightCount:0, addedAt:new Date().toISOString()}; q.push(item); }
  item.box = 0;
  item.wrongCount = (item.wrongCount||0)+1;
  item.nextReview = addDaysISO(REVIEW_INTERVALS_DAYS[0]);
  saveState();
}
function reviewMarkRight(kind, ref){
  const item = findReviewItem(kind, ref);
  if(!item) return; // never missed, nothing to track
  item.rightCount = (item.rightCount||0)+1;
  if(item.box >= REVIEW_INTERVALS_DAYS.length-1){
    const q = ensureReviewQueue(); const idx = q.indexOf(item); if(idx>-1) q.splice(idx,1); // graduated
  } else {
    item.box++;
    item.nextReview = addDaysISO(REVIEW_INTERVALS_DAYS[item.box]);
  }
  saveState();
}
function reviewDueItems(kindFilter){
  const now = Date.now();
  const queue=ensureReviewQueue();
  if((!kindFilter||kindFilter==='grammar')&&window.VaaniGrammarAcademy){
    window.VaaniGrammarAcademy.getAdaptiveItems(State).filter(entry=>entry.priority==='weak').forEach(entry=>{
      if(!findReviewItem('grammar',entry.ref))queue.push({kind:'grammar',ref:entry.ref,box:0,wrongCount:0,rightCount:0,addedAt:new Date(now).toISOString(),nextReview:new Date(now).toISOString(),source:'weak-mastery'});
    });
  }
  return queue.filter(x=> (!kindFilter || x.kind===kindFilter) && new Date(x.nextReview).getTime() <= now);
}
function reviewSoonestDue(){
  const q = ensureReviewQueue();
  if(!q.length) return null;
  return q.reduce((a,b)=> new Date(a.nextReview) < new Date(b.nextReview) ? a : b);
}

function recordPyqAttempt(qid, correct){
  const st = ensurePyqStats();
  st.attempts[qid] = correct;
  st.history = st.history.filter(h=>h.qid!==qid);
  st.history.unshift({qid, correct, ts:Date.now()});
  if(st.history.length>40) st.history.length = 40;
  if(correct) reviewMarkRight('pyq', qid); else reviewMarkWrong('pyq', qid);
  saveState();
}

/* ---- learn concept cross-link ---- */
function pyqLearnConcept(qid){
  const q = PYQ_BY_ID[qid]; if(!q) return;
  if(q.lessonType==='grammar' && q.lessonId){
    const g = GRAMMAR.find(x=>x.id===q.lessonId);
    if(g){ openTopic(g.id); return; }
  }
  if(q.lessonType==='vocab'){
    switchView('vocab');
    if(q.keyword){ document.getElementById('vocabSearch').value=q.keyword; renderVocabGrid(); }
    toast('Opened Vocabulary Hub' + (q.keyword?` — searching "${q.keyword}"`:''));
    return;
  }
  if(q.lessonType==='practice' && q.lessonId){
    switchView('pyq');
    toast('Opened matching drill: '+ (PRACTICE.find(p=>p.id===q.lessonId)||{title:'Sentence Practice'}).title);
    return;
  }
  if(q.lessonType==='reading'){
    switchView('pyq');
    toast('Opened Reading Comprehension module');
    return;
  }
  toast('No linked lesson yet for this question — more coverage coming as content expands.');
}

/* ============================================================
   PYQ VAULT 2.0 — dashboard-first, one-question-at-a-time engine
   Screens: home -> paper -> section drill / exam-picker -> session -> summary
   ============================================================ */
const letters = ['a','b','c','d'];
const TOPIC_ICONS = { 'Spotting Errors':'🔍', 'Vocabulary':'📚', 'Grammar':'✍️', 'Reading Comprehension':'📖', 'Sentence Arrangement (PQRS)':'🔀' };
const PV = { screen:'home', paperKey:null, session:null, archiveEra:null, archiveYear:null, paperReturn:null, examType:null };

function pvShuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function pvFmtTime(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60), s = sec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function pvRingSVG(pct, size, stroke, colorVar, extraClass){
  size = size||108; stroke = stroke||10; colorVar = colorVar||'--gold';
  pct = Math.max(0, Math.min(100, pct));
  const r = (size-stroke)/2, c = 2*Math.PI*r, off = c-(pct/100)*c;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="pv-ring-svg ${extraClass||''}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(${colorVar})" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size/2} ${size/2})" class="pv-ring-fill"/>
  </svg>`;
}
const PV_TOPIC_ICONS={
  'Synonyms':'🔗','Antonyms':'↔️','Spotting Errors':'🔎','Reading Comprehension':'📖',
  'Sentence Arrangement (PQRS)':'🧩','Fill in the Blanks':'✍️','Grammar':'📐',
  'Sentence Improvement':'📝','Sentence Correction':'🛠️','Selecting Words':'🧠',
  'Ordering of Sentences':'🧩','Ordering of Words in a Sentence':'🔤',
  'Idioms and Phrases':'💬','Usage of Paired Words':'🔀','Cloze Test':'📄',
  'Sentence Completion':'📝','Parts of Speech & Word Classes':'🏷️',
  'Prepositions and Determiners':'📍','Correlating Sentences':'🔗','Matching List':'🧩',
  'Adaptation of Borrowed Words':'🌐','Use of Phrasal Verbs':'⚡','Commonly Used Words':'📚',
  'Word Meanings':'📖','Active & Passive Voice':'🔄','Direct/Indirect Speech':'🗣️',
  'Discourse Markers':'🧭','Vocabulary':'🅰️','Homonyms & Homophones':'🔊','Word Usage':'✅'
};
function pvTopicIcon(sec){ return PV_TOPIC_ICONS[sec] || TOPIC_ICONS[sec] || '📘'; }
function pvTopicHint(sec){
  const hints={
    'Synonyms':'Choose words with similar meanings.','Antonyms':'Choose words with opposite meanings.',
    'Spotting Errors':'Find the incorrect part of a sentence.','Reading Comprehension':'Answer questions using the passage.',
    'Sentence Arrangement (PQRS)':'Put sentence parts in a logical order.','Fill in the Blanks':'Complete the sentence using context.',
    'Sentence Improvement':'Improve the marked part without changing meaning.','Sentence Correction':'Select the grammatically correct sentence.',
    'Selecting Words':'Choose the word that best fits the context.','Ordering of Sentences':'Arrange sentences into a clear passage.',
    'Ordering of Words in a Sentence':'Put words in the correct order.','Idioms and Phrases':'Understand fixed expressions and their meanings.',
    'Usage of Paired Words':'Choose the correct word from a pair.','Cloze Test':'Complete a passage using context clues.',
    'Sentence Completion':'Finish the sentence logically and grammatically.','Parts of Speech & Word Classes':'Identify how words function in a sentence.',
    'Prepositions and Determiners':'Practise prepositions and noun determiners.','Correlating Sentences':'Match sentences that belong together.',
    'Matching List':'Match each item with its correct partner.','Adaptation of Borrowed Words':'Practise words adopted from other languages.',
    'Use of Phrasal Verbs':'Choose the correct verb-particle combination.','Commonly Used Words':'Build accuracy with everyday English.',
    'Word Meanings':'Choose the meaning that fits the context.','Active & Passive Voice':'Change the focus while preserving meaning.',
    'Direct/Indirect Speech':'Report spoken words accurately.','Discourse Markers':'Connect ideas with the right linking expressions.',
    'Vocabulary':'Practise precise word meaning and usage.','Homonyms & Homophones':'Distinguish words that sound alike or share forms.',
    'Word Usage':'Choose the correct word or expression.'
  };
  return hints[sec]||'Practise questions from this skill.';
}
function pvAccBadgeClass(acc){ if(acc===null) return 'mid'; return acc>=70?'strong':(acc<45?'weak':'mid'); }

/* ---- persistence for "Continue where you left off" ---- */
function pvSaveContinue(){
  const s = PV.session; if(!s || s.finished){ return; }
  State.pyqContinue = {
    mode:s.mode, title:s.title, qids:s.questions.map(q=>q._id), index:s.index, answers:s.answers,
    negativeMarking:!!s.negativeMarking, deferReveal:!!s.deferReveal, perQSeconds:s.perQSeconds||null,
    timeLimitSec:s.timeLimitSec||null, savedAt:Date.now()
  };
  saveState();
}
function pvClearContinue(){ State.pyqContinue = null; saveState(); }
function pvResumeContinue(){
  const c = State.pyqContinue; if(!c) return;
  const qs = c.qids.map(id=>PYQ_BY_ID[id]).filter(Boolean);
  if(!qs.length){ pvClearContinue(); toast('That session is no longer available.'); return; }
  pvStartSession(c.mode, qs, {
    title:c.title, negativeMarking:c.negativeMarking, deferReveal:c.deferReveal,
    perQSeconds:c.perQSeconds, timeLimitSec:c.timeLimitSec, resumeIndex:c.index, resumeAnswers:c.answers
  });
}

/* ---- data groupers ----
   `exam` is optional on all of these: pass it to scope to one exam
   (used by the Previous Years Papers archive, via PV.examType), or
   omit it to see every exam's papers together (used by the unrelated,
   pre-existing global Exam Mode picker, which is out of scope here and
   left exactly as it behaved before). */
function pvPapersByYear(exam){
  const years = {};
  // PYQ_PAPERS is already globally sorted (year ascending; within a
  // year, sessions in roman-numeral order — I before II before III...)
  // by getSortedPYQPapers(), so grouping below preserves that order
  // without needing to re-sort. Years with only one session (or any
  // number of sessions) are handled automatically — nothing here
  // assumes a fixed pair of papers per year.
  const papersToGroup = exam ? PYQ_PAPERS.filter(p=>p.exam===exam) : PYQ_PAPERS;
  papersToGroup.forEach(p=>{ years[p.year] = years[p.year] || []; years[p.year].push(p); });
  return Object.keys(years).sort((a,b)=>a-b).map(y=>{
    const papers = years[y];
    const st = ensurePyqStats();
    let totalQ = 0, attempted = 0, correctSum = 0, answeredSum = 0;
    papers.forEach(p=>{
      const qs = p.data;
      totalQ += qs.length;
      qs.forEach(q=>{
        const id = _pyqQuestionId(p.exam, q);
        if(st.attempts[id]!==undefined){ attempted++; answeredSum++; if(st.attempts[id]===true) correctSum++; }
      });
    });
    const completion = totalQ ? Math.round(attempted/totalQ*100) : 0;
    const bestScore = answeredSum ? Math.round(correctSum/answeredSum*100) : null;
    return { year:y, papers, totalQ, completion, bestScore };
  });
}
function pvPaperQuestions(year, session, exam){
  return PYQ_ALL.filter(q=>String(q.y)===String(year) && q.s===session && (!exam || q._exam===exam));
}
function pvPaperSections(year, session, exam){
  const list = pvPaperQuestions(year, session, exam);
  const order = [], groups = {};
  list.forEach(q=>{ if(!groups[q.sec]){ groups[q.sec]=[]; order.push(q.sec); } groups[q.sec].push(q); });
  return order.map(sec=>({ sec, list:groups[sec] }));
}
function pvTopics(){ return [...new Set(PYQ_ALL.map(q=>q.sec))]; }
function pvTopicStatsMap(){
  const st=ensurePyqStats(), map={};
  PYQ_ALL.forEach(q=>{
    const key=String(q.sec||'Other').trim()||'Other';
    if(!map[key]) map[key]={total:0,attempted:0,correct:0};
    map[key].total++;
    if(st.attempts[q._id]!==undefined){
      map[key].attempted++;
      if(st.attempts[q._id]===true) map[key].correct++;
    }
  });
  return map;
}

/* ---- topic discovery grouping ----
   The question bank keeps its original topic labels and question data.
   This layer only controls how those skills are presented in the
   Topic-Wise Practice browser.
   Group only concepts that naturally belong together; anything that
   doesn't fit remains in "Other Skills" rather than being forced into
   a category. */
const PV_TOPIC_GROUP_ORDER=['parts-of-speech','determiners','verb-system','sentence-structure','usage-accuracy','vocabulary','reading-exam','other'];
const PV_TOPIC_GROUPS={
  'parts-of-speech':{title:'Parts of Speech',desc:'Core word classes — the building blocks of English.',rank:10},
  'determiners':{title:'Determiners & Articles',desc:'Articles, demonstratives, quantifiers and noun-reference choices.',rank:20},
  'verb-system':{title:'Verb System',desc:'Verb forms, tense, agreement, modals and related verb patterns.',rank:30},
  'sentence-structure':{title:'Sentence Structure & Transformation',desc:'Clauses, sentence relationships and structural transformations.',rank:40},
  'usage-accuracy':{title:'Usage & Accuracy',desc:'Grammar accuracy, word usage and precision-focused practice.',rank:50},
  'vocabulary':{title:'Vocabulary & Expressions',desc:'Meaning, word choice, idioms and commonly tested vocabulary.',rank:60},
  'reading-exam':{title:'Reading & Exam Skills',desc:'Comprehension, arrangement and exam-pattern question types.',rank:70},
  'other':{title:'Other Skills',desc:'Topics that do not belong naturally in another group.',rank:999}
};
const PV_PARTS_ORDER=['parts of speech','parts of speech and word classes','word classes','noun','nouns','pronoun','pronouns','verb','verbs','adjective','adjectives','adverb','adverbs','preposition','prepositions','conjunction','conjunctions','interjection','interjections'];
function pvTopicNorm(value){
  return String(value==null?'':value).toLocaleLowerCase().replace(/[‐‑‒–—]/g,'-').replace(/&/g,' and ').replace(/\bgrammar\b/g,'').replace(/\s+/g,' ').trim();
}
function pvTopicGroupInfo(topic){
  const compact=pvTopicNorm(topic).replace(/[().,:]/g,'').replace(/\s+/g,' ').trim();
  const partIndex=PV_PARTS_ORDER.indexOf(compact);
  if(partIndex>=0)return {id:'parts-of-speech',order:partIndex,label:PV_TOPIC_GROUPS['parts-of-speech']};
  const determinerTerms=['article','articles','determiner','determiners','demonstrative','demonstratives','quantifier','quantifiers','possessives','possessive determiners'];
  const determinerIndex=determinerTerms.indexOf(compact);
  if(determinerIndex>=0)return {id:'determiners',order:determinerIndex,label:PV_TOPIC_GROUPS.determiners};
  const verbTerms=['verb forms','verb','verbs','tense','tenses','subject-verb agreement','subject verb agreement','sequence of tenses','modals','modal verbs','non-finite verbs','non finite verbs','gerunds and infinitives','gerunds infinitives','gerunds','infinitives','participles'];
  const verbIndex=verbTerms.indexOf(compact);
  if(verbIndex>=0)return {id:'verb-system',order:verbIndex,label:PV_TOPIC_GROUPS['verb-system']};
  const structureTerms=['clauses','clause','phrases','phrase','conditionals','conditional sentences','question tags','comparison','comparisons','sentence structure','sentence transformations','sentence transformation','parallelism','inversion','modifier placement','active passive voice','active passive','active and passive voice','direct indirect speech','narration','reported speech','voice'];
  const structureIndex=structureTerms.indexOf(compact);
  if(structureIndex>=0)return {id:'sentence-structure',order:structureIndex,label:PV_TOPIC_GROUPS['sentence-structure']};
  const usageTerms=['word usage','commonly used words','homonyms and homophones','homonyms homophones','confused words','prepositions and determiners','fill in the blanks','sentence completion','sentence correction','sentence improvement','spotting errors','punctuation','capitalization','word formation','use of phrasal verbs'];
  const usageIndex=usageTerms.indexOf(compact);
  if(usageIndex>=0)return {id:'usage-accuracy',order:usageIndex,label:PV_TOPIC_GROUPS['usage-accuracy']};
  const vocabTerms=['synonyms','antonyms','idioms and phrases','one word substitution','adaptation of borrowed words','word meanings','vocabulary','word choice','usage of paired words'];
  const vocabIndex=vocabTerms.indexOf(compact);
  if(vocabIndex>=0)return {id:'vocabulary',order:vocabIndex,label:PV_TOPIC_GROUPS.vocabulary};
  const readingTerms=['reading comprehension','comprehension','cloze test','selecting words','jumbled sentences','sentence arrangement (pqrs)','ordering of sentences','ordering of words in a sentence','correlating sentences','matching list'];
  const readingIndex=readingTerms.indexOf(compact);
  if(readingIndex>=0)return {id:'reading-exam',order:readingIndex,label:PV_TOPIC_GROUPS['reading-exam']};
  return {id:'other',order:0,label:PV_TOPIC_GROUPS.other};
}
function pvTopicGroups(topicList){
  const buckets={};
  topicList.forEach((topic,index)=>{const info=pvTopicGroupInfo(topic);if(!buckets[info.id])buckets[info.id]=[];buckets[info.id].push({topic,order:info.order,sourceIndex:index});});
  return PV_TOPIC_GROUP_ORDER.filter(id=>buckets[id]&&buckets[id].length).map(id=>{
    const meta=PV_TOPIC_GROUPS[id];
    const items=buckets[id].slice().sort((a,b)=>a.order!==b.order?a.order-b.order:a.topic.localeCompare(b.topic));
    return {id,title:meta.title,desc:meta.desc,rank:meta.rank,items};
  });
}

/* ---- Military Archive — dynamic era bucketing ----
   Papers are grouped into 4-year Era blocks starting at 2009 (2009–2012,
   2013–2016, 2017–2020, ...). Nothing here hardcodes a specific year or a
   fixed list of eras — buckets are derived purely from whatever years exist
   in PYQ_PAPERS, so a newly registered paper (any future year) automatically
   lands in the correct existing era, or spins up a brand-new era card, with
   zero changes to this code. The era containing (or ahead of) the current
   real-world year is labelled open-ended, e.g. "2025+"; fully-elapsed eras
   get a closed range label, e.g. "2009–2012". */
function pvEraForYear(year){
  const y = parseInt(year,10);
  const start = 2009 + Math.floor((y-2009)/4)*4;
  const end = start+3;
  const nowYear = new Date().getFullYear();
  const label = (end>=nowYear) ? (start+'+') : (start+'–'+end);
  return { key:start, start, end, label };
}
function pvEraGroups(exam){
  const yearGroups = pvPapersByYear(exam);
  const st = ensurePyqStats();
  const eras = {};
  yearGroups.forEach(g=>{
    const e = pvEraForYear(g.year);
    if(!eras[e.key]) eras[e.key] = { key:e.key, label:e.label, years:[] };
    eras[e.key].years.push(g);
  });
  return Object.keys(eras).sort((a,b)=>a-b).map(k=>{
    const era = eras[k];
    let totalPapers=0, totalQ=0, attempted=0;
    era.years.forEach(y=>{
      totalPapers += y.papers.length;
      totalQ += y.totalQ;
      y.papers.forEach(p=>{ p.data.forEach(q=>{ const id=_pyqQuestionId(p.exam,q); if(st.attempts[id]!==undefined) attempted++; }); });
    });
    const completion = totalQ ? Math.round(attempted/totalQ*100) : 0;
    return { key:era.key, label:era.label, years:era.years, totalPapers, totalQ, completion };
  });
}

/* ---- router ---- */
function renderPyqView(){ pvRender(); }
function pvRender(){
  const root = document.getElementById('pvApp'); if(!root) return;
  if(PV.screen==='home') {
    root.innerHTML = pvHomeHTML();
    const topicGrid=root.querySelector('#pvTopicGrid');
    if(topicGrid)topicGrid.addEventListener('click',event=>{
      const card=event.target.closest('.pv-topic-card');
      if(card&&topicGrid.contains(card))pvLaunchTopic(decodeURIComponent(card.dataset.topic||''));
    });
    const topicSearch=root.querySelector('#pvTopicSearch');
    if(topicSearch)topicSearch.addEventListener('input',()=>pvFilterTopicCards(topicSearch.value));
  }
  else if(PV.screen==='examtype') root.innerHTML = pvExamTypeHTML();
  else if(PV.screen==='archive') {
    root.innerHTML = pvArchiveHTML();
    const archiveSearch=root.querySelector('#pvArchiveSearch');
    if(archiveSearch)archiveSearch.addEventListener('input',()=>pvFilterArchiveYears(archiveSearch.value));
  }
  else if(PV.screen==='archiveSessions') root.innerHTML = pvArchiveSessionsHTML();
  else if(PV.screen==='paper') root.innerHTML = pvPaperHTML();
  else if(PV.screen==='exampicker') root.innerHTML = pvExamPickerHTML();
  else if(PV.screen==='session') root.innerHTML = pvSessionHTML();
  else if(PV.screen==='summary') root.innerHTML = pvSummaryHTML();
  document.body.classList.toggle('pv-session-active', PV.screen==='session');
  window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(()=>{ if(typeof initReveal==='function') initReveal(); },30);
}
function pvGoHome(){ pvStopTimer(); PV.screen='home'; PV.session=null; PV.paperReturn=null; pvRender(); }

/* ============================================================
   MILITARY ARCHIVE — Era → Year → Session hierarchy
   Its own Command Center wing: hero banner, folder-style Era cards
   that accordion open into a Year grid, which drills into a Session
   list, which hands off to the existing Paper screen (unchanged).
   ============================================================ */
/* ---- exam-choice screen: shown first, ahead of the archive itself ----
   PV.examType is the single piece of state that scopes every archive
   screen below (era list, year, session list, paper) to one exam. It's
   set here and only read by the archive-flow functions, so it can never
   bleed into the unrelated global Exam Mode picker (pvExamPickerHTML),
   which never looks at it. */
function pvGoExamType(){ PV.screen='examtype'; PV.examType=null; PV.archiveEra=null; PV.archiveYear=null; pvRender(); }
function pvGoArchive(exam){ if(exam) PV.examType=exam; PV.screen='archive'; PV.archiveEra=null; PV.archiveYear=null; pvRender(); }
/**
 * Runs the click micro-interaction (chosen card pulses, the other
 * fades) then hands off to pvGoArchive(exam). Skips the animation
 * delay entirely under prefers-reduced-motion — the CSS classes below
 * still apply (so state/appearance stays correct) but the site's global
 * reduced-motion rule (see styles.css) already zeroes their transition
 * durations; this only additionally avoids the JS setTimeout delay,
 * which that CSS rule can't reach on its own.
 */
function pvChooseExamType(exam, btnEl){
  const grid = document.getElementById('pvExamTypeGrid');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!grid || !btnEl || reduce){ pvGoArchive(exam); return; }
  grid.querySelectorAll('.pv-examtype-card').forEach(c=>{
    c.classList.add(c===btnEl ? 'is-chosen' : 'is-fading');
  });
  setTimeout(()=>{ pvGoArchive(exam); }, 480);
}
function pvExamTypeHTML(){
  // Icons for known exams; anything registered in PYQ_EXAM_INFO without
  // an icon here still gets a card (falls back to a generic crest), so
  // adding a future exam only ever means one line in PYQ_EXAM_INFO.
  const EXAM_ICONS = { NDA:'🎖️', CDS:'🛡️', AFCAT:'✈️' };
  const examCard = (code)=>{
    const info = PYQ_EXAM_INFO[code] || { full:code, short:code };
    const papers = PYQ_PAPERS.filter(p=>p.exam===code);
    const qCount = PYQ_ALL.filter(q=>q._exam===code).length;
    const icon = EXAM_ICONS[code] || '🎯';
    const countLabel = papers.length
      ? `${papers.length} paper${papers.length!==1?'s':''} · ${qCount} question${qCount!==1?'s':''}`
      : 'Coming soon';
    return `<button type="button" class="pv-examtype-card pv-examtype-${code.toLowerCase()}" onclick="pvChooseExamType('${code}', this)">
      <span class="pv-examtype-overlay"></span>
      <span class="pv-examtype-body">
        <span class="pv-examtype-crest">${icon}</span>
        <span class="pv-examtype-name">${info.full}</span>
        <span class="pv-examtype-code">${info.short}</span>
        <span class="pv-examtype-stats">${countLabel}</span>
      </span>
    </button>`;
  };
  return `<div class="pv-screen ma-root">
    <div class="pv-topbar">
      <div class="pv-back" onclick="pvGoHome()">←</div>
      <div class="pv-topbar-title">Previous Years Papers<small>Choose Your Exam</small></div>
    </div>
    <div class="pv-examtype-grid" id="pvExamTypeGrid">
      ${Object.keys(PYQ_EXAM_INFO).map(examCard).join('')}
    </div>
  </div>`;
}
function pvToggleEra(key){ PV.archiveEra = (PV.archiveEra===key ? null : key); pvRender(); }
function pvOpenArchiveYear(year){ PV.archiveYear=year; PV.screen='archiveSessions'; pvRender(); }
function pvBackToArchive(){ PV.screen='archive'; pvRender(); }
function pvOpenSessionFromArchive(year, session){ PV.paperReturn='archiveSessions'; pvOpenPaper(year, session); }
function pvPaperBack(){
  if(PV.paperReturn==='archiveSessions'){ PV.screen='archiveSessions'; pvRender(); }
  else { pvGoHome(); }
}

function pvArchiveHTML(){
  const exam = PV.examType;
  const examInfo = PYQ_EXAM_INFO[exam] || { full:exam||'', short:exam||'' };
  const eras = pvEraGroups(exam);
  const totalPapers = PYQ_PAPERS.filter(p=>p.exam===exam).length;
  const totalQAll = PYQ_ALL.filter(q=>q._exam===exam).length;
  const st = ensurePyqStats();
  const attemptedAll = PYQ_ALL.filter(q=>q._exam===exam && st.attempts[q._id]!==undefined).length;
  const overallPct = totalQAll ? Math.round(attemptedAll/totalQAll*100) : 0;

  const erasHTML = eras.length ? eras.map((e,i)=>{
    const expanded = PV.archiveEra===e.key;
    const yearsHTML = e.years.map(y=>`
      <div class="ma-year-tile" data-year="${y.year}" role="button" tabindex="0" aria-label="Open ${y.year} papers" onkeydown="pvActivateOnKey(event)" onclick="pvOpenArchiveYear('${y.year}')">
        <div class="ma-year-top">
          <span class="ma-year-folder">🗂️</span>
          ${pvRingSVG(y.completion,40,4,'--gold')}
        </div>
        <div class="ma-year-num">${y.year}</div>
        <div class="ma-year-meta">${y.papers.length} paper${y.papers.length>1?'s':''} · ${y.completion}%</div>
      </div>`).join('');
    return `<div class="ma-era-card ${expanded?'expanded':''}" style="animation-delay:${i*60}ms">
      <div class="ma-era-head" role="button" tabindex="0" aria-expanded="${expanded?'true':'false'}" aria-label="Toggle ${e.label} era" onkeydown="pvActivateOnKey(event)" onclick="pvToggleEra(${e.key})">
        <div class="ma-era-icon">${expanded?'📂':'📁'}</div>
        <div class="ma-era-body">
          <div class="ma-era-name">${e.label}</div>
          <div class="ma-era-meta">${e.totalPapers} paper${e.totalPapers>1?'s':''} · ${e.totalQ} questions</div>
        </div>
        <div class="ma-era-ring">${pvRingSVG(e.completion,44,4,'--gold')}<div class="ma-era-ring-pct">${e.completion}%</div></div>
        <div class="ma-era-arrow">▾</div>
      </div>
      <div class="ma-era-panel"><div class="ma-era-panel-inner">
        <div class="ma-year-grid">${yearsHTML}</div>
      </div></div>
    </div>`;
  }).join('') : `<div class="pv-empty-note pv-empty-note-lg">
      <div class="pv-empty-icon">🗄️</div>
      <div class="pv-empty-title">No ${examInfo.short} papers yet</div>
      <div class="pv-empty-sub">Check back soon — this vault gets filled in as papers are verified and added.</div>
    </div>`;

  return `<div class="pv-screen ma-root">
    <div class="pv-topbar">
      <div class="pv-back" onclick="pvGoExamType()">←</div>
      <div class="pv-topbar-title">Previous Years Papers<small>${examInfo.full} · Records &amp; Dossiers Division</small></div>
    </div>
    <div class="ma-hero reveal">
      <div class="ma-hero-stamp">Official Records</div>
      <div class="ma-hero-top">
        <div class="ma-hero-crest">🗃️</div>
        <div>
          <div class="ma-hero-title">The ${examInfo.short} Archive Vault</div>
        </div>
      </div>
      <div class="ma-hero-desc">Every previous-year ${examInfo.short} paper on file, filed by era. Break the seal on an Era to reveal its years, then select a session to begin your briefing.</div>
      <div class="ma-hero-stats">
        <div class="ma-hero-stat"><b>${eras.length}</b><span>Eras</span></div>
        <div class="ma-hero-stat"><b>${totalPapers}</b><span>Papers</span></div>
        <div class="ma-hero-stat"><b>${totalQAll}</b><span>Questions</span></div>
        <div class="ma-hero-stat"><b>${overallPct}%</b><span>Cleared</span></div>
      </div>
    </div>
    <div class="ma-archive-tools">
      <label class="ma-archive-search"><span aria-hidden="true">⌕</span><input id="pvArchiveSearch" type="search" maxlength="12" inputmode="numeric" autocomplete="off" placeholder="Find a year (e.g. 2021)" aria-label="Search archive by year"><button type="button" id="pvArchiveClear" onclick="pvClearArchiveSearch()" aria-label="Clear year search" hidden>×</button></label>
      <span id="pvArchiveResults" aria-live="polite">Years and papers by selected exam</span>
    </div>
    <div class="ma-era-list" id="pvArchiveEraList">${erasHTML}</div>
    <div class="pv-empty-note pv-topic-empty" id="pvArchiveEmpty" hidden>No matching year. Try a different year.</div>
  </div>`;
}

function pvActivateOnKey(event){
  if(!event || (event.key!=='Enter'&&event.key!==' '))return;
  event.preventDefault();
  if(event.currentTarget)event.currentTarget.click();
}
function pvFilterArchiveYears(value){
  const root=document.getElementById('pvArchiveEraList');if(!root)return;
  const term=String(value||'').trim().toLocaleLowerCase();
  let visibleYears=0,visiblePapers=0;
  root.querySelectorAll('.ma-era-card').forEach(card=>{
    const tiles=Array.from(card.querySelectorAll('.ma-year-tile'));
    let inEra=0;
    tiles.forEach(tile=>{
      const year=String(tile.dataset.year||'').toLocaleLowerCase();
      const match=!term||year.includes(term);
      tile.hidden=!match;
      if(match){inEra++;visibleYears++;}
    });
    card.hidden=inEra===0;
    const shouldOpen=!!term&&inEra>0;
    const isOpen=shouldOpen||(!term&&String(card.querySelector('.ma-era-name')?.textContent||'').startsWith(String(PV.archiveEra||'NO_MATCH')));
    card.classList.toggle('expanded',isOpen);
    const head=card.querySelector('.ma-era-head');
    if(head)head.setAttribute('aria-expanded',String(isOpen));
    const icon=card.querySelector('.ma-era-icon');if(icon)icon.textContent=isOpen?'📂':'📁';
    if(inEra){
      const label=card.querySelector('.ma-era-meta');
      if(label)visiblePapers+=Number((label.textContent.match(/\d+/)||[])[0]||0);
    }
  });
  const results=document.getElementById('pvArchiveResults');
  if(results)results.textContent=term?(visibleYears+' matching year'+(visibleYears===1?'':'s')+' · '+visiblePapers+' papers'):(visibleYears+' years · '+visiblePapers+' papers');
  const empty=document.getElementById('pvArchiveEmpty');if(empty)empty.hidden=visibleYears>0;
  const clear=document.getElementById('pvArchiveClear');if(clear)clear.hidden=!term;
}
function pvClearArchiveSearch(){
  const input=document.getElementById('pvArchiveSearch');if(!input)return;
  input.value='';pvFilterArchiveYears('');input.focus();
}

function pvArchiveSessionsHTML(){
  const year = PV.archiveYear;
  const exam = PV.examType;
  const g = pvPapersByYear(exam).find(x=>String(x.year)===String(year));
  if(!g){ setTimeout(pvGoArchive,0); return `<div class="pv-screen"></div>`; }
  const st = ensurePyqStats();
  const rows = g.papers.map((p,i)=>{
    const qs = pvPaperQuestions(p.year,p.session,exam);
    const attempted = qs.filter(q=>st.attempts[q._id]!==undefined).length;
    const pct = qs.length ? Math.round(attempted/qs.length*100) : 0;
    return `<div class="ma-session-card" role="button" tabindex="0" aria-label="Open ${p.label}" onkeydown="pvActivateOnKey(event)" style="animation-delay:${i*80}ms" onclick="pvOpenSessionFromArchive(${p.year},'${p.session}')">
      <div class="ma-session-icon">🎖️</div>
      <div class="ma-session-body">
        <div class="ma-session-title">${p.label}</div>
        <div class="ma-session-sub">${qs.length} Questions${attempted?` · ${pct}% progress`:' · Not started'}</div>
        <div class="ma-session-progress"><div class="ma-session-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="ma-session-arrow">→</div>
    </div>`;
  }).join('');
  return `<div class="pv-screen ma-root">
    <div class="pv-topbar">
      <div class="pv-back" onclick="pvBackToArchive()">←</div>
      <div class="pv-topbar-title">${year}<small>Select Session</small></div>
    </div>
    <div class="ma-session-list">${rows}</div>
  </div>`;
}

/* ============================================================
   HOME DASHBOARD
   ============================================================ */
function pvHomeHTML(){
  const st = ensurePyqStats();
  const totalQ = PYQ_ALL.length;
  const solvedIds = Object.keys(st.attempts).filter(id=>!!PYQ_BY_ID[id]);
  const solved = solvedIds.length;
  const acc = pyqAccuracyFor(PYQ_ALL);
  const bm = getBookmarks().filter(b=>b.startsWith('pyq:')&&!!PYQ_BY_ID[b.slice(4)]).length;
  const mistakesCount = solvedIds.filter(id=>st.attempts[id]===false).length;
  const pct = totalQ ? Math.round(solved/totalQ*100) : 0;
  const streakDays = State.streak || 0;

  const continueC = State.pyqContinue;
  const continueHTML = continueC ? `
    <div class="pv-continue reveal" onclick="pvResumeContinue()">
      <div class="pv-continue-icon">▶</div>
      <div class="pv-continue-body">
        <div class="pv-continue-title">Continue: ${continueC.title}</div>
        <div class="pv-continue-sub">Question ${(continueC.index||0)+1} of ${continueC.qids.length}</div>
      </div>
      <div class="pv-continue-arrow">→</div>
    </div>` : '';

  const modes = [
    {icon:'📘', title:'Practice Mode', sub:'Learn at your own pace', fn:"pvLaunchMode('practice')"},
    {icon:'🎲', title:'Quiz Mode', sub:'20 random questions', fn:"pvLaunchMode('quiz')"},
    {icon:'⚡', title:'Rapid Fire', sub:'30 Qs · 20 sec each', fn:"pvLaunchMode('rapidfire')"},
    {icon:'🎖️', title:'Exam Mode', sub:'Full paper · timed', fn:"pvLaunchMode('exam')"},
    {icon:'📖', title:'Revision', sub:solved+' solved so far', fn:"pvLaunchMode('revision')"},
    {icon:'🔖', title:'Bookmarks', sub:bm+' saved question'+(bm!==1?'s':''), fn:"pvLaunchMode('bookmarks')"},
    {icon:'🎯', title:'Mistakes Only', sub:mistakesCount+' to review', fn:"pvLaunchMode('mistakes')"},
  ];
  const modesHTML = modes.map(m=>`
    <div class="pv-mode-card" onclick="${m.fn}">
      <div class="pv-mode-icon">${m.icon}</div>
      <div class="pv-mode-title">${m.title}</div>
      <div class="pv-mode-sub">${m.sub}</div>
    </div>`).join('');

  const eraGroups = pvEraGroups();
  const archiveGateHTML = `<div class="ma-gate-card" role="button" tabindex="0" aria-label="Browse previous-year papers" onkeydown="pvActivateOnKey(event)" onclick="pvGoExamType()">
    <div class="ma-gate-icon">🗃️</div>
    <div class="ma-gate-body">
      <div class="ma-gate-title">Previous Years Papers</div>
      <div class="ma-gate-sub">Every paper on file, filed by Era — browse the full dossier vault.</div>
      <div class="ma-gate-stats"><span><b>${eraGroups.length}</b> Eras</span><span><b>${PYQ_PAPERS.length}</b> Papers</span><span><b>${totalQ}</b> Qs</span></div>
    </div>
    <div class="ma-gate-arrow">→</div>
  </div>`;

  const topicList = pvTopics();
  const topicStats = pvTopicStatsMap();
  const topicGroups = pvTopicGroups(topicList);
  const topicCardsHTML = items => items.map(entry=>{
    const t=entry.topic, ts=topicStats[t]||{total:0,attempted:0,correct:0};
    const acc=ts.attempted?Math.round(ts.correct/ts.attempted*100):null;
    const progress=ts.total?Math.round(ts.attempted/ts.total*100):0;
    const accLabel=acc===null?'New':acc+'%';
    const p=t+' '+pvTopicHint(t);
    return '<button type="button" class="pv-topic-card" data-topic="'+encodeURIComponent(t)+'" data-topic-search="'+encodeURIComponent(p.toLocaleLowerCase())+'" aria-label="Practice '+escapeHtmlVaani(t)+', '+ts.total+' questions">'+
      '<span class="pv-topic-emoji" aria-hidden="true">'+pvTopicIcon(t)+'</span>'+
      '<span class="pv-topic-copy">'+
        '<span class="pv-topic-name">'+escapeHtmlVaani(t)+'</span>'+
        '<span class="pv-topic-count">'+ts.total+' questions · '+ts.attempted+' attempted</span>'+
        '<span class="pv-topic-progress" aria-hidden="true"><span style="width:'+progress+'%"></span></span>'+
        '<span class="pv-topic-hint">'+escapeHtmlVaani(pvTopicHint(t))+'</span>'+
      '</span>'+
      '<span class="pv-topic-side"><span class="pv-topic-acc '+pvAccBadgeClass(acc)+'">'+accLabel+'</span><span class="pv-topic-open">Practice <b aria-hidden="true">→</b></span></span>'+
    '</button>';
  }).join('');
  const topicsHTML = topicGroups.map(group=>{
    const gs=group.items.reduce((a,item)=>{ const ts=topicStats[item.topic]||{total:0,attempted:0,correct:0}; a.total+=ts.total; a.attempted+=ts.attempted; a.correct+=ts.correct; return a; },{total:0,attempted:0,correct:0});
    const gacc=gs.attempted?Math.round(gs.correct/gs.attempted*100):null;
    const searchText=(group.title+' '+group.desc).toLocaleLowerCase();
    return '<section class="pv-topic-group" data-topic-group="'+group.id+'" data-topic-group-search="'+encodeURIComponent(searchText)+'">'+
      '<button type="button" class="pv-topic-group-head" onclick="pvToggleTopicGroup(\''+group.id+'\')" aria-expanded="false" aria-controls="pv-topic-group-'+group.id+'">'+
        '<span class="pv-topic-group-copy"><span class="pv-topic-group-kicker">GROUPED SKILLS</span><strong>'+escapeHtmlVaani(group.title)+'</strong><small>'+escapeHtmlVaani(group.desc)+'</small></span>'+
        '<span class="pv-topic-group-head-side"><span class="pv-topic-group-metrics"><span>'+group.items.length+' skills</span><span>'+gs.total+' Q</span><span>'+(gacc===null?'New':gacc+'% acc')+'</span></span><span class="pv-topic-group-chevron" aria-hidden="true">⌄</span></span>'+
      '</button>'+
      '<div class="pv-topic-group-body" id="pv-topic-group-'+group.id+'" hidden>'+
        '<div class="pv-topic-group-actions"><div class="pv-topic-group-summary"><b>'+gs.total+' questions</b><span>'+gs.attempted+' attempted · '+(gacc===null?'No attempts yet':gacc+'% accuracy')+'</span></div><button type="button" class="pv-topic-group-practice" onclick="pvLaunchTopicGroup(\''+group.id+'\')">Practice all →</button></div>'+
        '<div class="pv-topic-grid pv-topic-subgrid">'+topicCardsHTML(group.items)+'</div>'+
      '</div>'+
    '</section>';
  }).join('');

  const recent = st.history.slice(0,5);
  const recentHTML = recent.length ? recent.map(h=>{
    const q = PYQ_BY_ID[h.qid]; if(!q) return '';
    return `<div class="pv-recent-item" onclick="pvReviewFromRecent('${h.qid}')">
      <div class="pv-recent-dot ${h.correct?'ok':'no'}">${h.correct?'✓':'✕'}</div>
      <div class="pv-recent-body">
        <div class="pv-recent-q">${pyqPromptHTML(q)}</div>
        <div class="pv-recent-meta">${(PYQ_EXAM_INFO[q._exam]&&PYQ_EXAM_INFO[q._exam].short)||'NDA'} ${q.s} ${q.y} · ${pvOriginalTopicTag(q)}</div>
      </div>
    </div>`;
  }).join('') : `<div class="pv-empty-note">Solve a few questions and your recent activity will show up here.</div>`;

  return `<div class="pv-screen">
    <div class="pv-hero reveal">
      <div class="pv-hero-top">
        <div class="pv-hero-id">
          <div class="pv-hero-badge">🎖️</div>
          <div>
            <div class="pv-hero-title">PYQ Command Center</div>
          </div>
        </div>
        <div class="pv-hero-target" onclick="pvLaunchMode('quiz')" title="Quick quiz">🎯</div>
      </div>
      <div class="pv-progress-card">
        <div class="pv-ring-wrap">
          ${pvRingSVG(pct,108,10,'--gold')}
          <div class="pv-ring-center"><div class="pv-ring-pct">${pct}%</div><div class="pv-ring-lbl">Overall<br>Progress</div></div>
        </div>
        <div class="pv-stat-grid">
          <div class="pv-stat-box"><span class="pv-stat-icon">📊</span><div><div class="pv-stat-n">${solved} / ${totalQ}</div><div class="pv-stat-l">Solved</div></div></div>
          <div class="pv-stat-box"><span class="pv-stat-icon">🎯</span><div><div class="pv-stat-n">${acc===null?'—':acc+'%'}</div><div class="pv-stat-l">Accuracy</div></div></div>
          <div class="pv-stat-box"><span class="pv-stat-icon">🔥</span><div><div class="pv-stat-n">${streakDays}</div><div class="pv-stat-l">Day Streak</div></div></div>
          <div class="pv-stat-box"><span class="pv-stat-icon">🔖</span><div><div class="pv-stat-n">${bm}</div><div class="pv-stat-l">Bookmarked</div></div></div>
        </div>
      </div>
    </div>

    ${continueHTML}

    <div class="pv-section-title"><h3><span class="bar"></span>Practice Modes</h3></div>
    <div class="pv-modes-grid">${modesHTML}</div>

    <div class="pv-section-title"><h3><span class="bar"></span>Previous Years Papers</h3></div>
    ${archiveGateHTML}

    <div class="pv-section-title"><h3><span class="bar"></span>Topic-Wise Practice</h3></div>
    <div class="pv-topic-tools">
      <div class="pv-topic-tools-copy"><strong>Choose a skill</strong><small>Grouped for speed. Open a group, then launch a skill or the whole group.</small></div>
      <label class="pv-topic-search"><span class="search-mark" aria-hidden="true">⌕</span><input id="pvTopicSearch" type="search" maxlength="60" autocomplete="off" placeholder="Search skills, groups or keywords…" aria-label="Search topic-wise practice"><button type="button" class="pv-topic-clear" id="pvTopicClear" onclick="pvClearTopicSearch()" aria-label="Clear topic search" hidden>×</button></label>
      <div class="pv-topic-tool-actions" aria-label="Topic group controls"><button type="button" class="pv-topic-tool-btn" onclick="pvSetAllTopicGroups(true)">Expand all</button><button type="button" class="pv-topic-tool-btn" onclick="pvSetAllTopicGroups(false)">Collapse all</button></div>
      <span class="pv-topic-results" id="pvTopicResults" aria-live="polite">${topicList.length} skills</span>
    </div>
    <div class="pv-topic-group-list" id="pvTopicGrid">${topicsHTML}</div>
    <div class="pv-empty-note pv-topic-empty" id="pvTopicEmpty" hidden>No matching topic. Try another search.</div>
  </div>`;
}

function pvSetTopicGroupState(group,open){
  if(!group)return;
  const body=group.querySelector('.pv-topic-group-body'), head=group.querySelector('.pv-topic-group-head');
  if(!body||!head)return;
  body.hidden=!open;
  head.setAttribute('aria-expanded',String(!!open));
  group.classList.toggle('is-open',!!open);
}
function pvToggleTopicGroup(groupId){
  const group=document.querySelector('.pv-topic-group[data-topic-group="'+CSS.escape(groupId)+'"]');
  if(!group)return;
  const body=group.querySelector('.pv-topic-group-body');
  pvSetTopicGroupState(group,!!body && body.hidden);
}
function pvSetAllTopicGroups(open){
  document.querySelectorAll('#pvTopicGrid .pv-topic-group').forEach(group=>pvSetTopicGroupState(group,!!open));
}
function pvClearTopicSearch(){
  const input=document.getElementById('pvTopicSearch');
  if(!input)return;
  input.value='';
  pvFilterTopicCards('');
  input.focus();
}
function pvLaunchTopicGroup(groupId){
  const group=pvTopicGroups(pvTopics()).find(item=>item.id===groupId);
  if(!group){ toast('This group is not available yet.'); return; }
  const topics=new Set(group.items.map(item=>item.topic));
  const list=PYQ_ALL.filter(q=>topics.has(q.sec));
  if(!list.length){ toast('No questions are available in this group yet.'); return; }
  pvStartSession('section',list,{title:group.title});
}

function pvOriginalTopicTag(q){
  if(!q)return '';
  return String(q.sec||q._sourceSec||'').trim() || 'English (Unclassified)';
}

function pvFilterTopicCards(value){
  const grid=document.getElementById('pvTopicGrid');if(!grid)return;
  const term=String(value||'').trim().toLocaleLowerCase();
  const cards=Array.from(grid.querySelectorAll('.pv-topic-card'));
  let visible=0, visibleGroups=0;
  cards.forEach(card=>{
    const topic=decodeURIComponent(String(card.dataset.topic||'')).toLocaleLowerCase();
    const searchText=decodeURIComponent(String(card.dataset.topicSearch||''));
    card.hidden=!!term && !topic.includes(term) && !searchText.includes(term);
  });
  grid.querySelectorAll('.pv-topic-group').forEach(group=>{
    const groupText=decodeURIComponent(String(group.dataset.topicGroupSearch||''));
    const groupMatch=!!term && groupText.includes(term);
    const groupCards=Array.from(group.querySelectorAll('.pv-topic-card'));
    if(groupMatch) groupCards.forEach(card=>{card.hidden=false;});
    const groupVisible=group.querySelectorAll('.pv-topic-card:not([hidden])').length;
    group.hidden=groupVisible===0;
    if(groupVisible>0){visibleGroups++;visible+=groupVisible;}
    if(term&&groupVisible>0)pvSetTopicGroupState(group,true);
  });
  const results=document.getElementById('pvTopicResults');
  if(results)results.textContent=term?(visible+' skills · '+visibleGroups+' groups'):(cards.length+' skills · '+visibleGroups+' groups');
  const empty=document.getElementById('pvTopicEmpty');if(empty)empty.hidden=visible>0;
  const clear=document.getElementById('pvTopicClear');if(clear)clear.hidden=!term;
}
function pvLaunchTopic(sec){
  const list = PYQ_ALL.filter(q=>q.sec===sec);
  pvStartSession('section', list, {title:sec});
}
function pvReviewFromRecent(qid){
  const q = PYQ_BY_ID[qid]; if(!q) return;
  const list = PYQ_ALL.filter(x=>x.sec===q.sec);
  pvStartSession('section', list, {title:q.sec});
  const idx = PV.session.questions.findIndex(x=>x._id===qid);
  PV.session.index = Math.max(0, idx);
  pvRender();
}

function pvLaunchMode(mode){
  const st = ensurePyqStats();
  if(mode==='practice'){
    pvStartSession('practice', PYQ_ALL, {title:'Practice Mode'});
  } else if(mode==='quiz'){
    const pool = pvShuffle(PYQ_ALL).slice(0,20);
    pvStartSession('quiz', pool, {title:'Quiz Mode'});
  } else if(mode==='rapidfire'){
    const pool = pvShuffle(PYQ_ALL).slice(0,30);
    pvStartSession('rapidfire', pool, {title:'Rapid Fire', perQSeconds:20});
  } else if(mode==='exam'){
    PV.screen='exampicker'; pvRender();
  } else if(mode==='revision'){
    const ids = Object.keys(st.attempts).filter(id=>!!PYQ_BY_ID[id]);
    if(!ids.length){ toast("Solve a few PYQs first — Revision Mode reviews what you've already attempted."); return; }
    const list = ids.map(id=>PYQ_BY_ID[id]);
    pvStartSession('revision', list, {title:'Revision Mode'});
  } else if(mode==='bookmarks'){
    const list = getBookmarks().filter(b=>b.startsWith('pyq:')).map(b=>PYQ_BY_ID[b.slice(4)]).filter(Boolean);
    if(!list.length){ toast('No bookmarks yet — tap ★ on any question to save it here.'); return; }
    pvStartSession('bookmarks', list, {title:'Bookmarks'});
  } else if(mode==='mistakes'){
    const ids = Object.keys(st.attempts).filter(id=>st.attempts[id]===false&&!!PYQ_BY_ID[id]);
    if(!ids.length){ toast('No mistakes logged yet — nice work, Cadet.'); return; }
    const list = ids.map(id=>PYQ_BY_ID[id]);
    pvStartSession('mistakes', list, {title:'Mistakes Only'});
  }
}

/* ============================================================
   PAPER PAGE
   ============================================================ */
function pvOpenPaper(year, session){
  // paperKey carries the exam too (PV.examType, set back when the exam
  // was first chosen) so a paper opened from the CDS archive can never
  // pull in an NDA paper's questions even if year+session happen to match.
  PV.paperKey = (PV.examType||'NDA')+'-'+year+'-'+session;
  PV.screen='paper';
  pvRender();
}
function pvPaperHTML(){
  const [exam, year, session] = PV.paperKey.split('-');
  const examLabel = (PYQ_EXAM_INFO[exam] && PYQ_EXAM_INFO[exam].short) || exam;
  const sections = pvPaperSections(year, session, exam);
  const allQ = pvPaperQuestions(year, session, exam);
  const acc = pyqAccuracyFor(allQ);
  const attempted = allQ.filter(q=>ensurePyqStats().attempts[q._id]!==undefined).length;
  const pct = allQ.length ? Math.round(attempted/allQ.length*100) : 0;

  const sectionsHTML = sections.map(s=>{
    const a = pyqAccuracyFor(s.list);
    return `<div class="pv-section-card" onclick="pvOpenSection(${year},'${session}','${s.sec.replace(/'/g,"\\'")}')">
      <div class="pv-section-icon">${pvTopicIcon(s.sec)}</div>
      <div class="pv-section-card-body">
        <div class="pv-section-card-title">${s.sec}</div>
        <div class="pv-section-card-sub">${s.list.length} questions${a!==null?` · ${a}% accuracy`:''}</div>
      </div>
      <div class="pv-section-card-arrow">→</div>
    </div>`;
  }).join('');

  return `<div class="pv-screen">
    <div class="pv-topbar">
      <div class="pv-back" onclick="pvPaperBack()">←</div>
      <div class="pv-topbar-title">${examLabel} ${session} · ${year}<small>Mission Briefing</small></div>
    </div>
    <div class="pv-paper-hero">
      ${pvRingSVG(pct,80,8,'--gold')}
      <div class="pv-paper-hero-body">
        <div class="pv-paper-hero-title">${examLabel} ${session} English Paper — ${year}</div>
        <div class="pv-paper-hero-sub">${allQ.length} questions · ${attempted} attempted${acc!==null?` · ${acc}% accuracy`:''}</div>
      </div>
    </div>
    <div class="pv-section-title"><h3><span class="bar"></span>Sections</h3></div>
    ${sectionsHTML}
    <button class="btn ghost" style="width:100%;justify-content:center;margin-top:6px" onclick="pvPracticeFullPaper(${year},'${session}')">📘 Practice Full Paper</button>
  </div>`;
}
function pvOpenSection(year, session, sec){
  const exam = PV.examType;
  const examLabel = (PYQ_EXAM_INFO[exam] && PYQ_EXAM_INFO[exam].short) || exam || '';
  const list = pvPaperQuestions(year, session, exam).filter(q=>q.sec===sec);
  pvStartSession('section', list, {title:`${examLabel} ${session} ${year} · ${sec}`});
}
function pvPracticeFullPaper(year, session){
  const exam = PV.examType;
  const examLabel = (PYQ_EXAM_INFO[exam] && PYQ_EXAM_INFO[exam].short) || exam || '';
  const list = pvPaperQuestions(year, session, exam);
  pvStartSession('section', list, {title:`${examLabel} ${session} ${year} — Full Paper`});
}

/* ============================================================
   EXAM MODE PICKER
   ============================================================ */
function pvExamPickerHTML(){
  const yearGroups = pvPapersByYear();
  const rows = yearGroups.flatMap(g=>g.papers).map(p=>{
    const qs = pvPaperQuestions(p.year, p.session, p.exam);
    const mins = Math.max(15, Math.round(qs.length*1));
    const examLabel = (PYQ_EXAM_INFO[p.exam] && PYQ_EXAM_INFO[p.exam].short) || p.exam;
    return `<div class="pv-paper-row" onclick="pvStartExam(${p.year},'${p.session}','${p.exam}')">
      <div class="pv-paper-row-body">
        <div class="pv-paper-row-title">${examLabel} ${p.session} · ${p.year} Simulation</div>
        <div class="pv-paper-row-sub">${qs.length} questions · ${mins} min timer</div>
      </div>
      <div class="pv-paper-row-arrow">→</div>
    </div>`;
  }).join('');
  return `<div class="pv-screen">
    <div class="pv-topbar">
      <div class="pv-back" onclick="pvGoHome()">←</div>
      <div class="pv-topbar-title">Exam Mode<small>Choose a paper to simulate</small></div>
    </div>
    <div class="pv-exam-note">⚠ Full simulation: one timed attempt at the complete paper, negative marking (−⅓ per wrong answer), and no explanations until you submit — just like the real exam hall.</div>
    ${rows}
  </div>`;
}
function pvStartExam(year, session, exam){
  // exam is passed explicitly from the picker above; PV.examType is set here
  // too since vaani-testkit.js's own pvStartExam patch reads it from there.
  if(exam) PV.examType = exam;
  const qs = pvPaperQuestions(year, session, exam);
  if(!qs.length){ toast('This paper is not available yet.'); return; }
  const mins = Math.max(15, Math.round(qs.length*1));
  const examLabel = (PYQ_EXAM_INFO[exam] && PYQ_EXAM_INFO[exam].short) || exam || 'NDA';
  pvStartSession('exam', qs, {
    title:`${examLabel} ${session} ${year} · Exam Simulation`, negativeMarking:true, deferReveal:true, timeLimitSec: mins*60
  });
}

/* ============================================================
   SESSION ENGINE (shared by every mode)
   ============================================================ */
function pvStartSession(mode, questions, opts){
  opts = opts || {};
  if(!questions || !questions.length){ toast('No questions available for this mode yet.'); return; }
  pvStopTimer();
  const s = {
    mode, title: opts.title || mode,
    questions: questions.slice(),
    index: opts.resumeIndex || 0,
    answers: opts.resumeAnswers || {},
    negativeMarking: !!opts.negativeMarking,
    deferReveal: !!opts.deferReveal,
    perQSeconds: opts.perQSeconds || null,
    timeLimitSec: opts.timeLimitSec || null,
    remaining: opts.timeLimitSec || opts.perQSeconds || null,
    streak: 0, bestStreak: 0,
    finished: false, timerId: null
  };
  if(s.index >= s.questions.length) s.index = 0;
  PV.session = s;
  PV.screen = 'session';
  pvRender();
  pvStartTimerIfNeeded();
  pvSaveContinue();
}
function pvStopTimer(){
  if(PV.session && PV.session.timerId){ clearInterval(PV.session.timerId); PV.session.timerId = null; }
}
function pvStartTimerIfNeeded(){
  const s = PV.session; if(!s) return;
  pvStopTimer();
  if(s.mode==='exam' && s.timeLimitSec){
    s.timerId = setInterval(()=>{
      s.remaining--;
      if(s.remaining<=0){ s.remaining=0; pvFinishSession(); return; }
      pvTickTimerDOM();
    }, 1000);
  } else if(s.mode==='rapidfire' && s.perQSeconds){
    s.remaining = s.perQSeconds;
    s.timerId = setInterval(()=>{
      s.remaining--;
      if(s.remaining<=0){ s.remaining=0; pvTickTimerDOM(); pvAutoAdvanceOnTimeout(); return; }
      pvTickTimerDOM();
    }, 1000);
  }
}
function pvTickTimerDOM(){
  const s = PV.session; if(!s) return;
  const pill = document.getElementById('pvTimerPill');
  if(pill){ pill.textContent = pvFmtTime(s.remaining); pill.parentElement.classList.toggle('low', s.remaining<=30); }
  const ringNum = document.getElementById('pvTimerRingNum');
  if(ringNum){
    ringNum.textContent = s.remaining;
    const pct = (s.remaining/s.perQSeconds)*100;
    const svgWrap = document.getElementById('pvTimerRingSvg');
    if(svgWrap) svgWrap.innerHTML = pvRingSVG(pct,50,6,'--gold');
    const ringBox = document.getElementById('pvTimerRingBox');
    if(ringBox) ringBox.classList.toggle('low', s.remaining<=5);
  }
}
function pvAutoAdvanceOnTimeout(){
  const s = PV.session; const q = s.questions[s.index];
  if(!s.answers[q._id]){
    s.answers[q._id] = { choice:-1, correct:false, timeUp:true };
    s.streak = 0;
    recordPyqAttempt(q._id, false);
  }
  if(s.index < s.questions.length-1){ s.index++; s.remaining = s.perQSeconds; pvRender(); pvStartTimerIfNeeded(); }
  else { pvFinishSession(); }
}

function pvCurrentQ(){ const s=PV.session; return s ? s.questions[s.index] : null; }

function pvSelectOption(choiceIdx){
  const s = PV.session; if(!s) return;
  const q = s.questions[s.index];
  if(s.answers[q._id]) return; // already answered
  const correct = choiceIdx===q.ans;
  s.answers[q._id] = { choice: choiceIdx, correct };
  if(correct){ s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); addXP(2,'PYQ solved correctly'); }
  else { s.streak = 0; }
  recordPyqAttempt(q._id, correct);
  refreshDashboardPyqCard();
  pvSaveContinue();
  pvRender();
}

function pvConfirmSubmitExam(){
  const s=PV.session;if(!s||s.mode!=='exam')return;
  const blank=s.questions.filter(q=>!s.answers[q._id]).length;
  const message=blank?'You have '+blank+' unanswered question'+(blank===1?'':'s')+'. They will receive zero. Submit now?':'You have answered every question. Submit the exam now?';
  if(typeof confirm==='function'&&!confirm(message))return;
  pvFinishSession();
}
function pvNext(){
  const s = PV.session; if(!s) return;
  if(s.index < s.questions.length-1){ s.index++; if(s.mode==='rapidfire'){ s.remaining=s.perQSeconds; } pvRender(); if(s.mode==='rapidfire') pvStartTimerIfNeeded(); pvSaveContinue(); }
  else if(s.mode==='exam') pvConfirmSubmitExam();
  else pvFinishSession();
}
function pvPrev(){
  const s = PV.session; if(!s) return;
  if(s.index>0){ s.index--; pvRender(); pvSaveContinue(); }
}
function pvJumpTo(i){
  const s = PV.session; if(!s) return;
  s.index = i; pvRender(); pvSaveContinue();
}

function pvFinishSession(){
  const s = PV.session; if(!s) return;
  pvStopTimer();
  s.finished = true;
  pvClearContinue();
  if(s.mode==='exam'){ PV.screen='summary'; pvRender(); return; }
  toast('Session complete — nice work, Cadet!');
  pvGoHome();
}

function pvReportError(qid){
  toast('Reported — thanks, Cadet. We\'ll review this question.');
}

function pvPaperIdentity(q){
  const exam=String(q&&q._exam||'NDA').trim().toUpperCase();
  const info=PYQ_EXAM_INFO[exam];
  const code=info?info.short:exam;
  const year=Number(q&&q.y);
  const session=String(q&&q.s||'').trim().toUpperCase();
  const validYear=Number.isFinite(year)&&year>=1900&&year<=2100;
  const validSession=/^[IVXLC]+$/.test(session);
  return {code:code,year:validYear?String(year):'',session:validSession?session:'',label:[code,validSession?session:'',validYear?String(year):''].filter(Boolean).join(' ')};
}

function pvPaperChipHTML(q){
  const p=pvPaperIdentity(q);
  const title=p.label?'Source paper · '+p.code+(p.year?' '+p.year:''):'Source paper';
  return '<span class="pyq-chip yr" data-exam="'+escapeHtmlVaani(p.code||'PYQ')+'" title="'+escapeHtmlVaani(title)+'">'+escapeHtmlVaani(p.label||'PYQ')+'</span>';
}

function pvSessionHTML(){
  const s = PV.session; if(!s) return '';
  const q = s.questions[s.index];
  const answer = s.answers[q._id];
  const bmId = 'pyq:'+q._id;
  const bookmarked = isBookmarked(bmId);
  const isRevisionLike = (s.mode==='revision' || s.mode==='revision-review');
  const answered = !!answer || isRevisionLike;
  const showResult = answered && !(s.mode==='exam'); // exam defers reveal until summary

  const progressPct = ((s.index+1)/s.questions.length)*100;

  let timerHTML = '';
  if(s.mode==='exam' && s.timeLimitSec){
    timerHTML = `<div class="pv-timer-pill ${s.remaining<=30?'low':''}"><span class="l">Time Left</span><span id="pvTimerPill">${pvFmtTime(s.remaining)}</span></div>`;
  } else if(s.mode==='rapidfire' && s.perQSeconds){
    timerHTML = `<div class="pv-timer-ring" id="pvTimerRingBox">
      <div id="pvTimerRingSvg">${pvRingSVG((s.remaining/s.perQSeconds)*100,50,6,'--gold')}</div>
      <div class="pv-timer-ring-num" id="pvTimerRingNum">${s.remaining}</div>
    </div>`;
  }
  let scoreHTML = '';
  if(s.mode==='rapidfire' || s.mode==='quiz'){
    const correctCount = Object.values(s.answers).filter(a=>a.correct).length;
    scoreHTML = `<div class="pv-score-badges">
      <div class="pv-score-badge"><div class="n">${correctCount*10}</div><div class="l">Score</div></div>
      <div class="pv-score-badge"><div class="n">×${s.streak}</div><div class="l">Streak</div></div>
    </div>`;
  }

  const displayOptions = pyqOptionLabels(q);
  let optsHTML = '';
  if(isRevisionLike){
    optsHTML = displayOptions.map((opt,i)=>`<div class="pv-option ${i===q.ans?'correct':''}" style="cursor:default">
      <span class="ol">${letters[i]}</span><span>${escapeHtmlVaani(opt)}</span></div>`).join('');
  } else {
    optsHTML = displayOptions.map((opt,i)=>{
      let cls = '';
      if(answer && s.mode!=='exam'){
        if(i===q.ans) cls='correct';
        else if(i===answer.choice) cls='wrong';
      } else if(answer && s.mode==='exam' && i===answer.choice){cls='selected-neutral';}
      return `<button class="pv-option ${cls}" aria-pressed="${answer && i===answer.choice?'true':'false'}" ${answer?'disabled':''} onclick="pvSelectOption(${i})">
        <span class="ol">${letters[i]}</span><span>${escapeHtmlVaani(opt)}</span></button>`;
    }).join('');
  }

  // Answer correctness is already shown by the option states and the explanation panel.
  // Keep the question area clean instead of repeating a banner after every answer.
  let feedbackHTML = '';
  let explainHTML = '';
  if(showResult || isRevisionLike){
    const extraNotes = `${q.exp?`<div><b>Why:</b> ${escapeHtmlVaani(q.exp)}</div>`:''}${q.rule?`<div style="margin-top:8px"><b>📐 Rule:</b> ${escapeHtmlVaani(q.rule)}</div>`:''}${q.shortcut?`<div style="margin-top:8px">⚡ ${escapeHtmlVaani(q.shortcut)}</div>`:''}${q.correctionNote?`<div style="margin-top:8px;color:var(--red)">⚠ <b>Answer-key note:</b> ${escapeHtmlVaani(q.correctionNote)}</div>`:''}`;
    if(extraNotes) explainHTML = `<div class="pv-explain-panel">${extraNotes}</div>`;
  } else if(s.mode==='exam' && answer){
    explainHTML = `<div class="pv-feedback" style="background:rgba(201,162,75,.1);border-left:3px solid var(--gold);color:var(--gold)">✓ Answer saved — answers and explanations will be revealed after submission.</div>`;
  }

  const qgrid = s.questions.map((qq,i)=>{
    let cls='';
    if(i===s.index)cls='current';
    else if(s.answers[qq._id])cls=s.mode==='exam'?'answered':(s.answers[qq._id].correct?'solved':'incorrect');
    const status=cls==='current'?'current':cls==='answered'?'answered':cls==='solved'?'correct':cls==='incorrect'?'incorrect':'not answered';
    return `<button class="${cls}" aria-label="Question ${i+1}, ${status}" ${i===s.index?'aria-current="step"':''} onclick="pvJumpTo(${i})">${i+1}</button>`;
  }).join('');

  return `<div class="pv-screen">
    <div class="pv-session-top">
      <div class="pv-back" onclick="${s.mode==='exam'?`pvConfirmExitExam()`:(s.mode==='revision-review'?`pvBackToSummary()`:`pvExitSession()`)}">←</div>
      <div class="pv-session-info">
        <div class="pv-session-title">${s.title}</div>
        <div class="pv-session-sub">Q ${s.index+1} / ${s.questions.length}</div>
      </div>
      ${timerHTML}
      ${scoreHTML}
    </div>

    <div class="pv-progress-track"><div class="pv-progress-fill" style="width:${progressPct}%"></div></div>
    <div class="pv-progress-count"><span>${Math.round(progressPct)}% through</span><span>${Object.keys(s.answers).length} answered</span></div>

    <div class="pv-qcard reveal">
      <div class="pv-qmeta-row">
${pvPaperChipHTML(q)}
        <span class="pyq-chip tp" title="Normalized skill · Source section: ${escapeHtmlVaani(q._sourceSec||q.sec||'English')}">${escapeHtmlVaani(pvOriginalTopicTag(q)||'PYQ')}</span>
        ${q.diff?`<span class="pyq-chip diff-${q.diff}">${q.diff}</span>`:''}
        <button class="bm-star ${bookmarked?'active':''}" onclick="toggleBookmark('${bmId}', this)" title="Bookmark" style="margin-left:auto">★</button>
      </div>
      ${q.passage ? `<div class="pv-passage"><div class="pv-passage-label">Passage</div><div class="pv-passage-text">${escapeHtmlVaani(q.passage)}</div></div>` : ''}
      <div class="pv-qtext">${pyqPromptHTML(q)}</div>
      <div class="pv-answer-hint" ${answer||isRevisionLike?'hidden':''}>Select one option to continue.</div>
      <div class="pv-options">${optsHTML}</div>
      ${feedbackHTML}
      ${explainHTML}
      ${(showResult || isRevisionLike) ? `<div class="pv-qcard-actions">
        <div class="pv-qcard-actions-left">
          <button class="pv-icon-btn" onclick="pvReportError('${q._id}')">⚑ Report</button>
        </div>
      </div>` : ''}
    </div>

    <div class="pv-nav-actions">
      <button class="pv-nav-btn" onclick="pvPrev()" ${s.index===0?'disabled':''}>← Previous</button>
      ${s.mode==='revision-review'
        ? `<button class="pv-nav-btn primary" onclick="${s.index===s.questions.length-1 ? 'pvBackToSummary()' : 'pvNext()'}">${s.index===s.questions.length-1 ? 'Back to Results' : 'Next →'}</button>`
        : `<button class="pv-nav-btn primary" onclick="pvNext()" ${(!answer && !isRevisionLike && s.mode!=='exam')?'disabled':''}>${s.index===s.questions.length-1 ? (s.mode==='exam'?'Submit Exam':'Finish') : 'Next →'}</button>`}
    </div>

    <div class="pv-qgrid-wrap">
      <div class="pv-qgrid-title">Question Navigation</div>
      <div class="pv-qgrid">${qgrid}</div>
      <div class="pv-qgrid-legend">
        <span><i class="solved"></i>Solved</span>
        <span><i class="incorrect"></i>Incorrect</span>
        <span><i class="current"></i>Current</span>
        <span><i class="unattempted"></i>Unattempted</span>
      </div>
    </div>
  </div>`;
}
function pvExitSession(){ pvStopTimer(); pvGoHome(); }
function pvConfirmExitExam(){
  if(confirm('Leave the exam simulation now? Your progress on this attempt will be lost.')){ pvStopTimer(); PV.session=null; pvClearContinue(); pvGoHome(); }
}

/* ============================================================
   EXAM SUMMARY
   ============================================================ */
function pvSummaryHTML(){
  const s = PV.session; if(!s) return '';
  let correct=0, wrong=0, unattempted=0;
  s.questions.forEach(q=>{
    const a = s.answers[q._id];
    if(!a || a.choice===-1) unattempted++;
    else if(a.correct) correct++;
    else wrong++;
  });
  const rawScore = correct - (wrong/3);
  const scoreLabel = (Math.round(rawScore*100)/100).toString();
  const total = s.questions.length;
  const acc = (correct+wrong) ? Math.round(correct/(correct+wrong)*100) : 0;

  const reviewHTML = s.questions.map((q,i)=>{
    const a = s.answers[q._id];
    const stat = (!a || a.choice===-1) ? '⬜' : (a.correct ? '✅' : '❌');
    return `<div class="pv-review-item" onclick="pvReviewExamQ(${i})">
      <span class="idx">Q${i+1}</span><span class="q">${pyqPromptHTML(q)}</span><span class="stat">${stat}</span>
    </div>`;
  }).join('');

  return `<div class="pv-screen">
    <div class="pv-topbar">
      <div class="pv-back" onclick="pvGoHome()">←</div>
      <div class="pv-topbar-title">${s.title}<small>Exam Results</small></div>
    </div>
    <div class="pv-summary-hero">
      <div class="pv-summary-score">${scoreLabel} / ${total}</div>
      <div class="pv-summary-label">Net Score (−⅓ negative marking applied)</div>
      <div class="pv-summary-grid">
        <div class="pv-summary-stat"><div class="n" style="color:var(--green)">${correct}</div><div class="l">Correct</div></div>
        <div class="pv-summary-stat"><div class="n" style="color:var(--red)">${wrong}</div><div class="l">Wrong</div></div>
        <div class="pv-summary-stat"><div class="n" style="color:var(--muted)">${unattempted}</div><div class="l">Skipped</div></div>
      </div>
      <div class="pv-summary-grid" style="grid-template-columns:1fr">
        <div class="pv-summary-stat"><div class="n">${acc}%</div><div class="l">Accuracy on attempted questions</div></div>
      </div>
    </div>
    <div class="pv-section-title"><h3><span class="bar"></span>Review Every Question</h3></div>
    ${reviewHTML}
    <button class="btn" style="width:100%;justify-content:center;margin-top:12px" onclick="pvGoHome()">🏠 Back to Command Center</button>
  </div>`;
}
function pvReviewExamQ(i){
  const s = PV.session; if(!s) return;
  s.mode = 'revision-review'; // reveal answers freely without further scoring
  s.index = i;
  PV.screen = 'session';
  pvRender();
}
function pvBackToSummary(){
  const s = PV.session; if(!s) return;
  s.mode = 'exam';
  PV.screen = 'summary';
  pvRender();
}

/* ---- open a single search result as its own scoped session ---- */
function pvOpenSearchResult(qid, term){
  const searchInput = document.getElementById('globalSearch');
  const searchTerm = (typeof term === 'string' ? term : (searchInput ? searchInput.value : '')).trim().toLowerCase();
  switchView('pyq');
  const q = PYQ_BY_ID[qid]; if(!q){ pvGoHome(); return; }
  const list = PYQ_ALL.filter(x=>(x.q+' '+x.o.join(' ')+' '+x.sec+' '+x.sub).toLowerCase().includes(searchTerm));
  const pool = list.length ? list : [q];
  pvStartSession('section', pool, {title:'Search results'});
  const idx = PV.session.questions.findIndex(x=>x._id===qid);
  if(idx>0){ PV.session.index = idx; pvRender(); }
}

/* ---- optional preset entry points (used by "Solve PYQs on this topic" links) ---- */
function openPyqFiltered(presetTopic, presetLessonId){
  switchView('pyq');
  if(presetLessonId){ openPyqByLesson(presetLessonId); return; }
  if(presetTopic){ pvLaunchTopic(presetTopic); return; }
  pvGoHome();
}
function openPyqByLesson(lessonId){
  switchView('pyq');
  const list = PYQ_ALL.filter(q=>q.lessonId===lessonId);
  if(!list.length){ toast('No linked PYQs found for this lesson yet.'); pvGoHome(); return; }
  pvStartSession('section', list, {title:'Related PYQs'});
}

function refreshDashboardPyqCard(){
  const el = document.getElementById('dashPyqStatMini'); if(!el) return;
  const st = ensurePyqStats();
  const solved = Object.keys(st.attempts).length;
  const acc = pyqAccuracyFor(PYQ_ALL);
  const bm = getBookmarks().filter(b=>b.startsWith('pyq:')).length;
  el.innerHTML = `
    <div class="psm-box"><div class="psm-n">${solved}</div><div class="psm-l">Solved</div></div>
    <div class="psm-box"><div class="psm-n">${acc===null?'—':acc+'%'}</div><div class="psm-l">Accuracy</div></div>
    <div class="psm-box"><div class="psm-n">${PYQ_PAPERS.length}</div><div class="psm-l">Papers</div></div>
    <div class="psm-box"><div class="psm-n">${bm}</div><div class="psm-l">Bookmarked</div></div>`;
  const topicAcc = pyqTopicAccuracy();
  const strong = topicAcc.filter(t=>t.acc>=70).sort((a,b)=>b.acc-a.acc).slice(0,4);
  const weak = topicAcc.filter(t=>t.acc<70).sort((a,b)=>a.acc-b.acc).slice(0,4);
  const strongEl = document.getElementById('dashPyqStrong');
  const weakEl = document.getElementById('dashPyqWeak');
  if(strongEl) strongEl.innerHTML = strong.length? strong.map(t=>`<span class="pyq-topic-pill strong">${t.sec} · ${t.acc}%</span>`).join('') : '<span class="lbl" style="opacity:.6">Solve a few PYQs to see this</span>';
  if(weakEl) weakEl.innerHTML = weak.length? weak.map(t=>`<span class="pyq-topic-pill weak">${t.sec} · ${t.acc}%</span>`).join('') : '<span class="lbl" style="opacity:.6">Solve a few PYQs to see this</span>';
}

/* ---- related PYQs injected into a grammar topic page ---- */
function relatedPyqHTML(lessonId){
  const related = PYQ_ALL.filter(q=>q.lessonId===lessonId);
  if(!related.length) return '';
  const preview = related.slice(0,3);
  return `<div id="fs-pyq-real" class="panel-title" style="margin-top:24px"><span class="bar"></span>Real NDA PYQs On This Topic (${related.length})</div>
    ${preview.map(q=>`<div class="related-pyq-mini" onclick="openPyqByLesson('${lessonId}')">
       <div class="rpm-meta">${(PYQ_EXAM_INFO[q._exam]&&PYQ_EXAM_INFO[q._exam].short)||'NDA'} ${q.s} ${q.y} · ${q.sub}</div>${pyqPromptHTML(q)}
     </div>`).join('')}
    <button class="btn ghost" style="margin-top:6px" onclick="openPyqByLesson('${lessonId}')">🎯 Solve All ${related.length} Previous Year Questions on this Topic</button>`;
}

/* ---- GLOBAL SEARCH ---- */
let __gsearchReturnFocus = null;
function openGlobalSearch(){
  const overlay = document.getElementById('gsearchOverlay');
  if(!overlay) return;
  if(!overlay.classList.contains('show')) __gsearchReturnFocus = document.activeElement;
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden','false');
  const inp = document.getElementById('globalSearch');
  if(inp){ inp.value=''; inp.focus(); }
  renderGlobalSearch();
}
function closeGlobalSearch(restoreFocus){
  const overlay = document.getElementById('gsearchOverlay');
  if(!overlay) return;
  const wasOpen = overlay.classList.contains('show');
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden','true');
  const target = __gsearchReturnFocus;
  __gsearchReturnFocus = null;
  if(restoreFocus !== false && wasOpen && target && target.isConnected && typeof target.focus === 'function') target.focus();
}
function renderGlobalSearch(){
  const term = (document.getElementById('globalSearch').value||'').trim().toLowerCase();
  const results = document.getElementById('gsearchResults');
  if(!term){ results.innerHTML = `<div class="gsearch-empty">Type to search lessons, vocabulary, PYQs, and practice sets.</div>`; return; }

  const lessons = GRAMMAR.filter(g=>g.title.toLowerCase().includes(term)||g.desc.toLowerCase().includes(term)).slice(0,5);
  const vocab = VOCAB.filter(v=>v.w.toLowerCase().includes(term)||v.meanEn.toLowerCase().includes(term)).slice(0,5);
  const practice = PRACTICE.filter(p=>p.title.toLowerCase().includes(term)||p.desc.toLowerCase().includes(term)).slice(0,4);
  const reading = READING.filter(r=>r.title.toLowerCase().includes(term)).slice(0,3);
  const pyqs = PYQ_ALL.filter(q=>(q.q+' '+q.o.join(' ')+' '+q.sec+' '+q.sub).toLowerCase().includes(term)).slice(0,6);

  if(!lessons.length && !vocab.length && !practice.length && !reading.length && !pyqs.length){
    results.innerHTML = `<div class="gsearch-empty">No matches for "${escapeHtmlVaani(term)}". Try a shorter or more general term.</div>`;
    return;
  }

  let html='';
  if(lessons.length){
    html += `<div class="gsearch-group-label">Lessons</div>` + lessons.map(g=>
      `<div class="gsearch-item" onclick="closeGlobalSearch();openTopic('${g.id}')"><span class="gi-title">${g.icon} ${g.title}</span><span class="gi-sub">${g.desc}</span></div>`).join('');
  }
  if(vocab.length){
    html += `<div class="gsearch-group-label">Vocabulary</div>` + vocab.map(v=>
      `<div class="gsearch-item" onclick="closeGlobalSearch();openWord('${v.id}')"><span class="gi-title">${v.w}</span><span class="gi-sub">${v.meanEn}</span></div>`).join('');
  }
  if(pyqs.length){
    html += `<div class="gsearch-group-label">Previous Year Questions (${pyqs.length}${pyqs.length===6?'+':''})</div>` + pyqs.map(q=>
      `<div class="gsearch-item" onclick="closeGlobalSearch();pvOpenSearchResult('${q._id}')"><span class="gi-title">${(PYQ_EXAM_INFO[q._exam]&&PYQ_EXAM_INFO[q._exam].short)||'NDA'} ${q.s} ${q.y} · ${q.sec}</span><span class="gi-sub">${q.q.slice(0,90)}${q.q.length>90?'…':''}</span></div>`).join('');
  }
  if(practice.length){
    html += `<div class="gsearch-group-label">Practice</div>` + practice.map(p=>
      `<div class="gsearch-item" onclick="closeGlobalSearch();switchView('pyq')"><span class="gi-title">${p.icon} ${p.title}</span><span class="gi-sub">${p.desc}</span></div>`).join('');
  }
  if(reading.length){
    html += `<div class="gsearch-group-label">Reading</div>` + reading.map(r=>
      `<div class="gsearch-item" onclick="closeGlobalSearch();switchView('pyq')"><span class="gi-title">${r.icon} ${r.title}</span><span class="gi-sub">${r.time}</span></div>`).join('');
  }
  results.innerHTML = html;
}


/* ============================================================
   RENDER: GRAMMAR GRID
=============================================================*/
function topicStatus(id){
  if(State.completedTopics[id]) return 'cleared';
  return 'progress';
}

/* ---- Skill Tree: curriculum-ordered progression map ---- */
const SKILL_TIERS = [
  {label:'Tier I · Foundations', ids:['parts-of-speech','noun','pronoun','verb','adjective','adverb','preposition']},
  {label:'Tier II · Verb Systems', ids:['conjunction','articles','tenses','sequence-of-tenses','voice','narration','sva','modals','subjunctive']},
  {label:'Tier III · Sentence Architecture', ids:['conditionals','question-tags','comparison','clauses','reduced-relative-clauses','phrases','non-finite-verbs','gerunds-infinitives','participles']},
  {label:'Tier IV · Precision & Polish', ids:['parallelism','punctuation','capitalization','word-formation','sentence-structure','determiners','modifier-placement']},
  {label:'Tier V · Exam Technique', ids:['spotting-errors','sentence-improvement','idioms-phrasal-verbs','one-word-substitution','jumbled-sentences','confused-words','cloze-test-strategy','inversion','sentence-transformations']}
];
function renderSkillTree(){
  const wrap = document.getElementById('skillTreeWrap'); if(!wrap) return;
  const flatOrder = SKILL_TIERS.flatMap(t=>t.ids);
  let firstIncompleteIdx = flatOrder.findIndex(id=>!State.completedTopics[id]);
  if(firstIncompleteIdx===-1) firstIncompleteIdx = flatOrder.length;
  let html = `<div class="st-legend">
    <span><span class="dot" style="background:var(--green)"></span>Cleared</span>
    <span><span class="dot" style="background:var(--gold)"></span>Next up</span>
    <span><span class="dot" style="background:var(--muted2)"></span>Upcoming</span>
  </div><div class="skill-tree">`;
  SKILL_TIERS.forEach(tier=>{
    html += `<div class="st-tier"><div class="st-tier-label">${tier.label}</div><div class="st-row">`;
    tier.ids.forEach(id=>{
      const g = GRAMMAR.find(x=>x.id===id);
      if(!g) return;
      const flatIdx = flatOrder.indexOf(id);
      const done = !!State.completedTopics[id];
      const status = done ? 'completed' : (flatIdx===firstIncompleteIdx ? 'current' : (flatIdx<firstIncompleteIdx ? 'completed' : 'locked'));
      const pyqCount = (typeof PYQ_ALL!=='undefined') ? PYQ_ALL.filter(q=>q.lessonId===id).length : 0;
      html += `<button class="st-node ${status}" data-id="${id}">
        <div class="st-node-badge">${g.icon}</div>
        <div class="st-node-label">${g.title}</div>
        ${pyqCount?`<div class="pyq-tag" style="margin:4px 0 0;display:inline-block">${pyqCount} PYQ${pyqCount>1?'s':''}</div>`:''}
      </button>`;
    });
    html += `</div></div>`;
  });
  html += `</div>`;
  wrap.innerHTML = html;
  wrap.querySelectorAll('.st-node').forEach(node=>{
    node.addEventListener('click',()=>{
      const id = node.dataset.id;
      if(node.classList.contains('locked')) toast('Skipping ahead — clearing earlier tiers first gets you combo bonuses, but opening this now, Cadet.');
      openTopic(id);
    });
  });
}

/* ============================================================
   GRAMMAR TREE — PHASE 1 render engine
   (Phase 2 "Grammar Journey" can extend TREE_TOPICS / add tiers here)
=============================================================*/
const TREE_TOPICS = [
  {id:'parts-of-speech', x:230.0, y:56.0, apex:true},
  {id:'noun', x:30.0, y:214.0},
  {id:'pronoun', x:106.5, y:198.0},
  {id:'verb', x:190.6, y:226.0},
  {id:'adjective', x:266.7, y:205.0},
  {id:'adverb', x:350.4, y:229.0},
  {id:'preposition', x:428.7, y:203.0},
  {id:'conjunction', x:28.0, y:375.4},
  {id:'articles', x:100.8, y:346.4},
  {id:'tenses', x:162.2, y:394.6},
  {id:'voice', x:229.7, y:353.6},
  {id:'narration', x:294.6, y:397.0},
  {id:'sva', x:359.3, y:352.8},
  {id:'modals', x:432.0, y:382.2},
  {id:'conditionals', x:28.0, y:533.5},
  {id:'question-tags', x:101.0, y:504.8},
  {id:'comparison', x:163.7, y:551.8},
  {id:'clauses', x:231.0, y:512.2},
  {id:'phrases', x:296.5, y:555.4},
  {id:'gerunds-infinitives', x:360.1, y:509.5},
  {id:'participles', x:432.0, y:540.9},
  {id:'parallelism', x:31.5, y:688.1},
  {id:'punctuation', x:108.7, y:671.9},
  {id:'capitalization', x:192.7, y:700.0},
  {id:'word-formation', x:268.8, y:679.0},
  {id:'sentence-structure', x:346.4, y:703.0},
  {id:'determiners', x:426.2, y:677.0},
  {id:'spotting-errors', x:28.0, y:849.2},
  {id:'sentence-improvement', x:101.1, y:820.9},
  {id:'idioms-phrasal-verbs', x:163.7, y:868.2},
  {id:'one-word-substitution', x:231.1, y:827.9},
  {id:'jumbled-sentences', x:295.9, y:871.3},
  {id:'confused-words', x:359.9, y:826.0},
  {id:'cloze-test-strategy', x:432.0, y:856.6}
];
const TREE_META = {
  'parts-of-speech':{weightage:'High',difficulty:1,time:'7 min'},
  'noun':{weightage:'Medium',difficulty:1,time:'5 min'},
  'pronoun':{weightage:'Medium',difficulty:1,time:'5 min'},
  'verb':{weightage:'High',difficulty:1,time:'5 min'},
  'adjective':{weightage:'Medium',difficulty:1,time:'5 min'},
  'adverb':{weightage:'Medium',difficulty:1,time:'5 min'},
  'preposition':{weightage:'High',difficulty:2,time:'5 min'},
  'conjunction':{weightage:'Medium',difficulty:2,time:'5 min'},
  'tenses':{weightage:'High',difficulty:3,time:'12 min'},
  'voice':{weightage:'High',difficulty:2,time:'8 min'},
  'question-tags':{weightage:'Low',difficulty:2,time:'8 min'},
  'articles':{weightage:'High',difficulty:2,time:'5 min'},
  'narration':{weightage:'High',difficulty:3,time:'10 min'},
  'sva':{weightage:'High',difficulty:2,time:'7 min'},
  'modals':{weightage:'Medium',difficulty:2,time:'5 min'},
  'conditionals':{weightage:'Medium',difficulty:2,time:'6 min'},
  'comparison':{weightage:'Medium',difficulty:1,time:'4 min'},
  'clauses':{weightage:'High',difficulty:3,time:'8 min'},
  'phrases':{weightage:'Medium',difficulty:2,time:'5 min'},
  'gerunds-infinitives':{weightage:'Medium',difficulty:2,time:'5 min'},
  'participles':{weightage:'Medium',difficulty:2,time:'5 min'},
  'parallelism':{weightage:'Medium',difficulty:2,time:'5 min'},
  'punctuation':{weightage:'Low',difficulty:1,time:'4 min'},
  'capitalization':{weightage:'Low',difficulty:1,time:'3 min'},
  'word-formation':{weightage:'Medium',difficulty:2,time:'6 min'},
  'sentence-structure':{weightage:'Medium',difficulty:2,time:'6 min'},
  'determiners':{weightage:'Medium',difficulty:1,time:'4 min'},
  'spotting-errors':{weightage:'High',difficulty:3,time:'10 min'},
  'sentence-improvement':{weightage:'High',difficulty:3,time:'9 min'},
  'idioms-phrasal-verbs':{weightage:'High',difficulty:2,time:'8 min'},
  'one-word-substitution':{weightage:'High',difficulty:2,time:'6 min'},
  'jumbled-sentences':{weightage:'Medium',difficulty:3,time:'8 min'},
  'confused-words':{weightage:'Medium',difficulty:2,time:'6 min'},
  'cloze-test-strategy':{weightage:'High',difficulty:3,time:'10 min'}
};
const GT_DIFF_LABEL = {1:'Easy',2:'Medium',3:'Hard'};
let gtActiveTopicId = null;

function gtProgress(id){
  if(State.completedTopics[id]) return {pct:100, state:'completed'};
  if(State.quizScores[id]!=null) return {pct:Math.max(35,Math.min(90,State.quizScores[id])), state:'progress'};
  if(State.topicProgress && State.topicProgress[id]) return {pct:20, state:'progress'};
  return {pct:0, state:'empty'};
}
function gtRingSVG(pct,color){
  const r=34, c=Math.PI*2*r;
  const off = c-(Math.max(0,Math.min(100,pct))/100)*c;
  return `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" class="gt-ov-bg"></circle><circle cx="40" cy="40" r="${r}" class="gt-ov-fg" style="stroke:${color};stroke-dasharray:${c};stroke-dashoffset:${off}"></circle></svg>`;
}
function gtTreeSVGMarkup(){
  const TRUNK_X = 230;
  const branches = TREE_TOPICS.filter(n=>!n.apex).map(n=>{
    const midX = (TRUNK_X+n.x)/2, midY = n.y-24;
    return `<path d="M${TRUNK_X},${n.y} Q${midX},${midY} ${n.x},${n.y}" class="gt-branch"/>`;
  }).join('');
  return `<svg class="gt-tree-svg" viewBox="0 0 460 960" preserveAspectRatio="xMidYMid meet">
    <path d="M230,940 C226,760 234,560 228,400 C224,280 234,160 230,56" class="gt-trunk"/>
    ${branches}
    <ellipse cx="230" cy="942" rx="76" ry="11" class="gt-root-shadow"/>
  </svg>`;
}
function gtSkeletonHTML(){
  return `<div class="gt-skeleton" aria-hidden="true">
    <div class="gt-skel-pulse gt-skel-trunk"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:50%;top:6%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:15%;top:22%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:85%;top:22%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:10%;top:39%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:90%;top:39%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:15%;top:56%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:85%;top:56%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:10%;top:73%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:90%;top:73%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:15%;top:90%"></div>
    <div class="gt-skel-pulse gt-skel-node" style="left:85%;top:90%"></div>
  </div>`;
}
function renderGrammarTree(retryCount){
  const canvas = document.getElementById('gtTreeCanvas');
  if(!canvas) return; // DOM not ready yet — nothing to do, caller may retry
  retryCount = retryCount || 0;

  // Guard #1: required data not initialized yet (e.g. called before GRAMMAR/TREE_TOPICS
  // parsed, or before State was normalized). Show a skeleton and retry shortly instead
  // of leaving a blank container or throwing mid-build.
  const dataReady = typeof GRAMMAR!=='undefined' && Array.isArray(GRAMMAR) && GRAMMAR.length
    && typeof TREE_TOPICS!=='undefined' && Array.isArray(TREE_TOPICS) && TREE_TOPICS.length
    && State && State.completedTopics && State.quizScores;
  if(!dataReady){
    if(!canvas.dataset.built) canvas.innerHTML = gtSkeletonHTML();
    if(retryCount < 20) setTimeout(()=>renderGrammarTree(retryCount+1), 50);
    return;
  }

  // Guard #2: prevent duplicate/overlapping builds (e.g. rapid nav taps, or the boot-time
  // refreshAll() and a user-triggered switchView('grammar') landing in the same tick).
  if(canvas.dataset.building==='1') return;
  canvas.dataset.building = '1';

  try{
    renderGrammarTreeInner(canvas);
  }catch(err){
    console.error('[VAANI] renderGrammarTree failed:', err);
    if(!canvas.dataset.built){
      canvas.innerHTML = gtSkeletonHTML();
      if(retryCount < 20) setTimeout(()=>renderGrammarTree(retryCount+1), 80);
    }
  }finally{
    canvas.dataset.building = '';
  }
}
function gtTopicStatus(id,order,frontier){
  if(State.completedTopics[id])return 'completed';
  if(order.indexOf(id)===frontier)return 'current';
  if(State.quizScores[id]!=null||(State.topicProgress&&State.topicProgress[id]))return 'progress';
  return 'upcoming';
}
function gtTopicBrowserHTML(order,frontier,query,filter){
  const tierDescriptions=[
    'Begin with the building blocks of English.',
    'Learn how verbs, time and sentence links work.',
    'Connect ideas and build more complex sentences.',
    'Make your written English more precise.',
    'Apply grammar skills to exam-style questions.'
  ];
  const openTier=frontier>=order.length?SKILL_TIERS.length-1:Math.max(0,SKILL_TIERS.findIndex(t=>t.ids.includes(order[frontier])));
  const browser=document.createElement('div');browser.className='gt-topic-browser';
  const intro=document.createElement('div');intro.className='gt-browser-intro';
  const kicker=document.createElement('span');kicker.className='gt-browser-kicker';kicker.textContent='A clearer way to learn';
  const heading=document.createElement('h3');heading.textContent='Choose one topic at a time';
  const help=document.createElement('p');help.textContent='Start with the next topic, or open any section to explore. Every card shows what the topic covers and how far you have progressed.';
  intro.append(kicker,heading,help);browser.appendChild(intro);

  const toolbar=document.createElement('div');toolbar.className='gt-browser-toolbar';
  const label=document.createElement('label');label.className='gt-browser-search';
  const icon=document.createElement('span');icon.className='search-icon';icon.setAttribute('aria-hidden','true');icon.textContent='⌕';
  const input=document.createElement('input');input.id='gtTopicSearch';input.type='search';input.maxLength=70;input.autocomplete='off';input.placeholder='Search grammar topics…';input.setAttribute('aria-label','Search grammar topics');input.value=query;
  label.append(icon,input);
  const count=document.createElement('span');count.className='gt-browser-count';count.id='gtBrowserCount';count.setAttribute('aria-live','polite');count.textContent=order.length+' topics';
  toolbar.append(label,count);browser.appendChild(toolbar);

  const filters=document.createElement('div');filters.className='gt-browser-filters';filters.setAttribute('role','group');filters.setAttribute('aria-label','Filter grammar topics');
  [['all','All'],['current','Next up'],['progress','In progress'],['completed','Completed']].forEach(([value,text])=>{
    const button=document.createElement('button');button.type='button';button.className='gt-browser-filter';button.dataset.gtFilter=value;button.textContent=text;button.setAttribute('aria-pressed',String(filter===value));filters.appendChild(button);
  });
  browser.appendChild(filters);

  const groups=document.createElement('div');groups.className='gt-topic-groups';
  SKILL_TIERS.forEach((tier,tierIndex)=>{
    const ids=tier.ids.filter(id=>GRAMMAR.some(g=>g.id===id));if(!ids.length)return;
    const completed=ids.filter(id=>State.completedTopics[id]).length,pct=Math.round(completed/ids.length*100);
    const details=document.createElement('details');details.className='gt-topic-group';details.dataset.tier=String(tierIndex);
    details.dataset.defaultOpen=String(openTier===tierIndex);details.open=openTier===tierIndex;
    const summary=document.createElement('summary');
    const number=document.createElement('span');number.className='gt-tier-index';number.textContent=String(tierIndex+1).padStart(2,'0');
    const copy=document.createElement('span');copy.className='gt-tier-copy';
    const title=document.createElement('span');title.className='gt-tier-title';title.textContent=tier.label.replace(/^Tier [IVX]+\s*·\s*/,'');
    const subtitle=document.createElement('span');subtitle.className='gt-tier-subtitle';subtitle.textContent=tierDescriptions[tierIndex]||'Continue through the grammar curriculum.';
    copy.append(title,subtitle);
    const countLabel=document.createElement('span');countLabel.className='gt-tier-count';countLabel.textContent=completed+'/'+ids.length+' complete';
    summary.append(number,copy,countLabel);details.appendChild(summary);
    const progress=document.createElement('div');progress.className='gt-tier-progress';progress.setAttribute('aria-hidden','true');
    const fill=document.createElement('div');fill.className='gt-tier-progress-fill';fill.style.width=pct+'%';progress.appendChild(fill);details.appendChild(progress);
    const grid=document.createElement('div');grid.className='gt-topic-grid';
    ids.forEach(id=>{
      const g=GRAMMAR.find(x=>x.id===id);if(!g)return;
      const status=gtTopicStatus(id,order,frontier),pctValue=gtProgress(id).pct||0;
      const statusLabel=status==='completed'?'Completed':status==='current'?'Next up':status==='progress'?'In progress':'Not started';
      const card=document.createElement('button');card.type='button';card.className='gt-topic-card';card.dataset.id=id;card.dataset.status=status;
      card.setAttribute('aria-label','Open '+g.title+'. '+statusLabel+'.');
      const topicIcon=document.createElement('span');topicIcon.className='gt-topic-icon';topicIcon.setAttribute('aria-hidden','true');topicIcon.textContent=g.icon||'📘';
      const body=document.createElement('span');body.className='gt-topic-copy';
      const topicTitle=document.createElement('span');topicTitle.className='gt-topic-title';topicTitle.textContent=g.title;
      const desc=document.createElement('span');desc.className='gt-topic-desc';desc.textContent=g.desc||'Open this topic to study its rules and examples.';
      const metaRow=document.createElement('span');metaRow.className='gt-topic-meta';
      const statusText=document.createElement('span');statusText.className='gt-topic-status';statusText.textContent=statusLabel;
      const percent=document.createElement('span');percent.className='gt-topic-pct';percent.textContent=pctValue+'%';
      metaRow.append(statusText,percent);
      const mini=document.createElement('span');mini.className='gt-topic-mini-progress';mini.setAttribute('aria-hidden','true');
      const miniFill=document.createElement('span');miniFill.style.width=pctValue+'%';mini.appendChild(miniFill);
      body.append(topicTitle,desc,metaRow,mini);
      const open=document.createElement('span');open.className='gt-topic-open';open.setAttribute('aria-hidden','true');open.textContent='›';
      card.append(topicIcon,body,open);grid.appendChild(card);
    });
    details.appendChild(grid);groups.appendChild(details);
  });
  browser.appendChild(groups);
  const empty=document.createElement('div');empty.className='gt-browser-empty';empty.id='gtBrowserEmpty';empty.hidden=true;empty.textContent='No topics match this search or filter. Try another term or choose All.';browser.appendChild(empty);
  return browser;
}
function gtApplyBrowserFilters(canvas){
  const term=String(canvas.dataset.topicSearch||'').trim().toLocaleLowerCase();
  const filter=canvas.dataset.topicFilter||'all';
  let visible=0,total=0;
  canvas.querySelectorAll('.gt-topic-group').forEach(group=>{
    let groupVisible=0;
    group.querySelectorAll('.gt-topic-card').forEach(card=>{
      total++;
      const title=card.querySelector('.gt-topic-title')?.textContent||'';
      const desc=card.querySelector('.gt-topic-desc')?.textContent||'';
      const matchesText=!term||(title+' '+desc).toLocaleLowerCase().includes(term);
      const matchesFilter=filter==='all'||card.dataset.status===filter;
      const show=matchesText&&matchesFilter;card.hidden=!show;
      if(show){groupVisible++;visible++;}
    });
    group.hidden=groupVisible===0;
    if(term||filter!=='all')group.open=groupVisible>0;
    else group.open=group.dataset.defaultOpen==='true';
  });
  const count=canvas.querySelector('#gtBrowserCount');
  if(count)count.textContent=(term||filter!=='all')?visible+' of '+total+' topics':visible+' topics';
  const empty=canvas.querySelector('#gtBrowserEmpty');if(empty)empty.hidden=visible>0;
}
function gtBindTopicBrowser(canvas){
  if(canvas.dataset.eventsBound==='1')return;
  canvas.dataset.eventsBound='1';
  canvas.addEventListener('input',event=>{
    if(event.target&&event.target.id==='gtTopicSearch'){
      canvas.dataset.topicSearch=event.target.value;gtApplyBrowserFilters(canvas);
    }
  });
  canvas.addEventListener('click',event=>{
    const filter=event.target.closest('[data-gt-filter]');
    if(filter&&canvas.contains(filter)){
      canvas.dataset.topicFilter=filter.dataset.gtFilter||'all';
      canvas.querySelectorAll('[data-gt-filter]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===filter)));
      gtApplyBrowserFilters(canvas);return;
    }
    const card=event.target.closest('.gt-topic-card');
    if(card&&canvas.contains(card))gtOpenSheet(card.dataset.id);
  });
}
function renderGrammarTreeInner(canvas){
  const cleared=Object.keys(State.completedTopics).filter(id=>GRAMMAR.some(g=>g.id===id)).length;
  const total=GRAMMAR.length;
  const overallPct=total?Math.round((cleared/total)*100):0;
  const scores=Object.values(State.quizScores);
  const avgScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
  const elTopics=document.getElementById('gtChipTopics');if(elTopics)elTopics.textContent=total;
  const elCovered=document.getElementById('gtChipCovered');if(elCovered)elCovered.textContent=overallPct+'%';
  const elScore=document.getElementById('gtChipScore');if(elScore)elScore.textContent=avgScore!=null?avgScore+'%':'--';
  const ringWrap=document.getElementById('gtOverallRing');
  if(ringWrap)ringWrap.innerHTML=gtRingSVG(overallPct,'var(--gt-teal)')+'<div class="gt-ring-num">'+overallPct+'%</div>';
  const progSub=document.getElementById('gtProgressSub');if(progSub)progSub.textContent=cleared+' of '+total+' topics complete';
  const power=cleared*15+(avgScore||0);
  const powerNum=document.getElementById('gtPowerNum');if(powerNum)powerNum.textContent=power;
  const powerSub=document.getElementById('gtPowerSub');
  if(powerSub)powerSub.textContent=power===0?'Begin the journey':(power<100?'Building momentum':'Command-level grasp');
  const statCompleted=document.getElementById('gtStatCompleted');if(statCompleted)statCompleted.textContent=cleared+' / '+total;
  const statTests=document.getElementById('gtStatTests');
  if(statTests)statTests.textContent=(State.personalBests&&State.personalBests.totalQuizzesTaken)||0;
  const donut=document.getElementById('gtDonut');
  if(donut&&!donut.dataset.built){
    donut.style.background='conic-gradient(var(--gt-red) 0% 45%,var(--gt-gold) 45% 75%,var(--gt-teal) 75% 100%)';
    donut.innerHTML='<div class="gt-donut-hole"><b>20–25%</b><span>in English</span></div>';
    donut.dataset.built='1';
  }
  const order=SKILL_TIERS.flatMap(t=>t.ids).filter(id=>GRAMMAR.some(g=>g.id===id));
  const frontier=order.findIndex(id=>!State.completedTopics[id]);
  const query=canvas.dataset.topicSearch||'',filter=canvas.dataset.topicFilter||'all';
  const browser=gtTopicBrowserHTML(order,frontier===-1?order.length:frontier,query,filter);
  canvas.replaceChildren(browser);
  canvas.dataset.built='1';
  gtBindTopicBrowser(canvas);
  gtApplyBrowserFilters(canvas);
  renderGrammarAcademyCatalog();
}

function recordGrammarMastery(topicId,correct){
  if(!window.GRAMMAR_ACADEMY||!GRAMMAR_ACADEMY.topics.some(topic=>topic.id===topicId))return;
  State.grammarMastery=State.grammarMastery||{};
  const entry=State.grammarMastery[topicId]||{attempts:0,correct:0,lastAttempt:null};
  entry.attempts++;if(correct)entry.correct++;entry.lastAttempt=Date.now();State.grammarMastery[topicId]=entry;
  if(correct)reviewMarkRight('grammar',topicId);else reviewMarkWrong('grammar',topicId);
  saveState();
}

function renderGrammarAcademyCatalog(){
  const host=document.getElementById('grammarAcademyCatalog');
  const curriculum=window.GRAMMAR_ACADEMY;
  if(!host||!curriculum||!Array.isArray(curriculum.stages)||!Array.isArray(curriculum.topics))return;
  host.replaceChildren();
  curriculum.stages.forEach((stage,index)=>{
    const topics=curriculum.topics.filter(topic=>topic.stage===stage.id);
    const section=document.createElement('section');section.className='ga-stage-card';
    const heading=document.createElement('div');heading.className='ga-stage-heading';
    const label=document.createElement('span');label.className='ga-stage-number';label.textContent=String(index+1).padStart(2,'0');
    const copy=document.createElement('div');const title=document.createElement('h4');title.textContent=stage.label;
    const description=document.createElement('p');description.textContent=stage.description;copy.append(title,description);
    const count=document.createElement('span');count.className='ga-stage-count';count.textContent=topics.length+' lessons';heading.append(label,copy,count);section.append(heading);
    const list=document.createElement('div');list.className='ga-stage-lessons';
    topics.forEach(topic=>{
      const button=document.createElement('button');button.type='button';button.className='ga-lesson-link';button.textContent=topic.title;
      button.setAttribute('aria-label','Open '+topic.title+' grammar lesson');button.addEventListener('click',()=>openTopic(topic.id));list.appendChild(button);
    });
    section.appendChild(list);host.appendChild(section);
  });
}

function grammarAcademyLessonHTML(topic){
  if(!topic)return '';
  const esc=escapeHtmlVaani;
  const sections=topic.sections.map(section=>'<section class="ga-lesson-section"><h4>'+esc(section.title)+'</h4><p>'+esc(section.body)+'</p></section>').join('');
  const examples=topic.examples.map(example=>'<article class="ga-example '+(example.kind==='counterexample'?'is-counterexample':'')+'"><span>'+esc(example.kind==='counterexample'?'Counterexample':'Worked example')+'</span><p>'+esc(example.text)+'</p><small>'+esc(example.analysis)+'</small></article>').join('');
  const mistakes=topic.misconceptions.map(item=>'<article class="ga-misconception"><b>Common trap</b><p>'+esc(item.error)+'</p><small>'+esc(item.why)+' '+esc(item.correction)+'</small></article>').join('');
  const exercises=topic.exercises.map(item=>'<li><b>'+esc(item.type==='repair'?'Repair':'Analyze')+':</b> '+esc(item.prompt)+'<details><summary>Show a model of the reasoning</summary><p>'+esc(item.answer)+'</p></details></li>').join('');
  const steps=topic.diagram.steps.map((step,index)=>'<li><span>'+String(index+1)+'</span><b>'+esc(step.label)+'</b><small>'+esc(step.detail)+'</small></li>').join('');
  return '<section class="ga-lesson" aria-label="'+esc(topic.title)+' Academy lesson"><div class="ga-lesson-top"><span>'+esc(topic.stage)+' · original practice</span><p>'+esc(topic.summary)+'</p></div><div class="ga-lesson-columns">'+sections+'</div><div class="ga-examples">'+examples+'</div><div class="ga-mistakes">'+mistakes+'</div><section class="ga-diagram"><h4>'+esc(topic.diagram.label||'Reasoning path')+'</h4><p>'+esc(topic.diagram.text)+'</p><ol>'+steps+'</ol></section><section class="ga-exercises"><h4>Work the concept</h4><ol>'+exercises+'</ol></section><section class="ga-analysis"><h4>Interactive sentence analysis</h4><p>Identify likely clause boundaries and grammar markers, then verify the parser’s clues against the sentence meaning.</p><label for="gaSentenceInput">Sentence to analyze</label><textarea id="gaSentenceInput" rows="3" maxlength="3000" placeholder="For example: Although the route was difficult, the team completed it."></textarea><button class="btn ghost" type="button" id="gaAnalyzeButton">Analyze sentence</button><div id="gaAnalysisOutput" class="ga-analysis-output" role="status" aria-live="polite"></div></section><p class="ga-provenance">Assessment items are original authored practice aligned to named English skills; they are not official PYQs.</p></section>';
}

function analyzeGrammarSentence(){
  const input=document.getElementById('gaSentenceInput'),output=document.getElementById('gaAnalysisOutput');
  if(!input||!output||!window.VaaniGrammarAcademy)return;
  const result=VaaniGrammarAcademy.analyzeSentence(input.value);output.replaceChildren();
  const message=document.createElement('p');message.textContent=result.ok?result.note:result.message;output.appendChild(message);
  if(!result.ok)return;
  const heading=document.createElement('h5');heading.textContent='Clause identification (first-pass)';output.appendChild(heading);
  const clauses=document.createElement('ol');result.clauses.forEach(clause=>{const li=document.createElement('li');li.textContent=clause.label+': '+clause.text;clauses.appendChild(li);});output.appendChild(clauses);
  const tokenHeading=document.createElement('h5');tokenHeading.textContent='Grammar markers';output.appendChild(tokenHeading);
  const tokens=document.createElement('ul');result.tokens.filter(token=>token.role!=='word').forEach(token=>{const li=document.createElement('li');li.textContent=token.text+' — '+token.role;tokens.appendChild(li);});
  if(!tokens.childElementCount){const li=document.createElement('li');li.textContent='No likely clause markers or verb forms detected.';tokens.appendChild(li);}output.appendChild(tokens);
}

function startGrammarMixedChallenge(){
  if(!window.VaaniGrammarAcademy)return;
  const day=typeof dailyDateKey==='function'?dailyDateKey():new Date().toISOString().slice(0,10);
  const selected=VaaniGrammarAcademy.getMixedQuestions(day+'|grammar-academy',12);
  const questions=selected.map(entry=>{const item=entry.question;return {
    q:item.prompt,opts:item.options.slice(),ans:item.answer,exp:item.explanation,reasons:item.reasons.slice(),
    lessonId:entry.topicId,provenance:item.provenance
  };});
  document.getElementById('topicEyebrow').textContent='Grammar Academy · mixed practice';
  document.getElementById('topicTitle').textContent='Mixed-concept challenge';
  document.getElementById('topicStamp').textContent='ORIGINAL PRACTICE';
  document.getElementById('topicMetaStrip').textContent=questions.length+' questions · '+day+' rotation · authored practice';
  document.getElementById('flowStepper').replaceChildren();
  document.querySelectorAll('.tab-btn').forEach(button=>button.classList.toggle('active',button.dataset.tab==='quiz'));
  document.querySelectorAll('.tab-pane').forEach(pane=>pane.classList.toggle('active',pane.id==='pane-quiz'));
  switchView('topic');renderQuizPane('grammar-mixed-challenge',questions);
}

function gtRipple(btn,e){
  const r = document.createElement('span'); r.className='gt-fruit-ripple';
  const rect = btn.getBoundingClientRect();
  r.style.width = r.style.height = rect.width+'px';
  r.style.left = '0'; r.style.top = '0';
  btn.querySelector('.gt-fruit-ring').appendChild(r);
  setTimeout(()=>r.remove(),600);
}
function gtSparkleTopic(id){
  const canvas = document.getElementById('gtTreeCanvas'); if(!canvas) return;
  const btn = canvas.querySelector(`.gt-fruit[data-id="${id}"]`); if(!btn) return;
  const icons=['✨','⭐','🌟'];
  for(let i=0;i<5;i++){
    const s = document.createElement('span'); s.className='gt-sparkle'; s.textContent = icons[i%icons.length];
    s.style.left = (50 + (Math.random()*40-20))+'%'; s.style.top = (50 + (Math.random()*20-10))+'%';
    s.style.animationDelay = (i*60)+'ms';
    btn.appendChild(s);
    setTimeout(()=>s.remove(),1100+i*60);
  }
}

/* ---- bottom sheet ---- */
function gtOpenSheet(id){
  const g = GRAMMAR.find(x=>x.id===id); if(!g) return;
  gtActiveTopicId = id;
  const meta = TREE_META[id] || {weightage:'Medium',difficulty:2,time:'6 min'};
  const {pct, state} = gtProgress(id);
  const mastery = (State.quizScores && State.quizScores[id]!=null) ? State.quizScores[id] : null;
  const totalQ = (g.quiz && g.quiz.length) || 0;
  const solvedQ = mastery!=null ? totalQ : 0;

  document.getElementById('gtSheetIcon').textContent = g.icon;
  document.getElementById('gtSheetTitle').textContent = g.title;
  document.getElementById('gtSheetDesc').textContent = g.desc;
  document.getElementById('gtSheetWeightage').textContent = meta.weightage;
  document.getElementById('gtSheetDifficulty').textContent = GT_DIFF_LABEL[meta.difficulty]||'Medium';
  document.getElementById('gtSheetTime').textContent = meta.time;
  document.getElementById('gtSheetMastery').textContent = mastery!=null ? mastery+'%' : '—';
  document.getElementById('gtSheetQSolved').textContent = totalQ ? (solvedQ+' / '+totalQ) : '—';

  const ringColor = state==='completed' ? 'var(--gt-green)' : (state==='progress' ? 'var(--gt-gold)' : 'var(--gt-teal)');
  document.getElementById('gtSheetRing').innerHTML = gtRingSVG(pct, ringColor) + `<div class="gt-ring-num">${pct}%</div>`;

  const statusEl = document.getElementById('gtSheetStatus');
  statusEl.textContent = state==='completed' ? '✓ Completed' : (state==='progress' ? 'In Progress' : 'Not Started');
  statusEl.className = 'gt-sheet-progress-status ' + (state==='completed'?'completed':state==='progress'?'progress':'');

  const bm = document.getElementById('gtSheetBookmark');
  const isBm = !!(State.bookmarkedTopics && State.bookmarkedTopics[id]);
  bm.classList.toggle('is-bookmarked', isBm);
  const bmLbl = bm.querySelector('.gt-sheet-btn-lbl'); if(bmLbl) bmLbl.textContent = isBm ? 'Saved' : 'Save';

  /* Prerequisites */
  const prereqEl = document.getElementById('gtSheetPrereq');
  const prereqIds = (g.meta && g.meta.prereq) || [];
  if(prereqEl){
    if(!prereqIds.length){
      prereqEl.innerHTML = `<span class="gt-dossier-empty-val">None — open topic</span>`;
    } else {
      prereqEl.innerHTML = prereqIds.map(pid=>{
        const pg = GRAMMAR.find(x=>x.id===pid || x.title===pid);
        const label = pg ? pg.title : pid;
        const cleared = pg ? !!State.completedTopics[pg.id] : false;
        return `<span class="gt-dossier-pill${cleared?'':' locked'}">${cleared?'✓ ':''}${label}</span>`;
      }).join('');
    }
  }

  /* Last attempt */
  const lastAttemptEl = document.getElementById('gtSheetLastAttempt');
  if(lastAttemptEl){
    const ts = State.topicLastAttempt && State.topicLastAttempt[id];
    lastAttemptEl.textContent = ts ? gtRelativeTime(ts) : '—';
  }

  document.documentElement.classList.add('gt-dossier-lock');
  document.body.classList.add('gt-dossier-lock');
  document.getElementById('gtSheetOverlay').classList.add('open');
}
function gtRelativeTime(ts){
  const diff = Math.max(0, Date.now()-ts);
  const min = Math.floor(diff/60000), hr = Math.floor(diff/3600000), day = Math.floor(diff/86400000);
  if(day>0) return day===1 ? '1 day ago' : day+' days ago';
  if(hr>0) return hr===1 ? '1 hour ago' : hr+' hours ago';
  if(min>0) return min===1 ? '1 min ago' : min+' mins ago';
  return 'Just now';
}
function gtCloseSheet(e){
  if(e && e.target!==e.currentTarget) return;
  document.getElementById('gtSheetOverlay').classList.remove('open');
  document.documentElement.classList.remove('gt-dossier-lock');
  document.body.classList.remove('gt-dossier-lock');
}
function gtSheetBtnRipple(e){
  const btn = e && e.currentTarget; if(!btn) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.4;
  const r = document.createElement('span');
  r.className = 'gt-btn-ripple';
  r.style.width = r.style.height = size+'px';
  r.style.left = ((e.clientX||rect.left+rect.width/2) - rect.left - size/2)+'px';
  r.style.top = ((e.clientY||rect.top+rect.height/2) - rect.top - size/2)+'px';
  btn.appendChild(r);
  setTimeout(()=>r.remove(), 550);
}
function gtSheetStartTopic(){
  if(!gtActiveTopicId) return;
  gtCloseSheet();
  openTopic(gtActiveTopicId);
}
function gtSheetOpenQuiz(){
  if(!gtActiveTopicId) return;
  const id = gtActiveTopicId;
  gtCloseSheet();
  openTopic(id);
  setTimeout(()=>{ const tab=document.querySelector('.tab-btn[data-tab="quiz"]'); if(tab) tab.click(); },50);
}
function gtSheetOpenPyq(){
  if(!gtActiveTopicId) return;
  const id = gtActiveTopicId;
  gtCloseSheet();
  openPyqByLesson(id);
}
function gtToggleBookmark(){
  if(!gtActiveTopicId) return;
  State.bookmarkedTopics = State.bookmarkedTopics || {};
  const id = gtActiveTopicId;
  const bm = document.getElementById('gtSheetBookmark');
  const lbl = bm.querySelector('.gt-sheet-btn-lbl');
  if(State.bookmarkedTopics[id]){
    delete State.bookmarkedTopics[id];
    bm.classList.remove('is-bookmarked'); if(lbl) lbl.textContent='Save';
    toast('Bookmark removed.');
  } else {
    State.bookmarkedTopics[id]=true;
    bm.classList.add('is-bookmarked'); if(lbl) lbl.textContent='Saved';
    toast('Topic bookmarked.');
  }
  saveState();
}
function gtOpenNotes(){
  if(!gtActiveTopicId) return;
  const g = GRAMMAR.find(x=>x.id===gtActiveTopicId); if(!g) return;
  document.getElementById('gtNotesTopicName').textContent = g.title;
  State.topicNotes = State.topicNotes || {};
  document.getElementById('gtNotesArea').value = State.topicNotes[gtActiveTopicId] || '';
  document.getElementById('gtNotesOverlay').classList.add('open');
}
function gtCloseNotes(e){
  if(e && e.target!==e.currentTarget) return;
  document.getElementById('gtNotesOverlay').classList.remove('open');
}
function gtSaveNotes(){
  if(!gtActiveTopicId) return;
  State.topicNotes = State.topicNotes || {};
  State.topicNotes[gtActiveTopicId] = document.getElementById('gtNotesArea').value;
  saveState();
  toast('Note saved.');
  gtCloseNotes();
}
function gtPortalTap(){
  switchView('journey');
}
function gtStartLearning(){
  const t = getContinueTopic();
  if(t) openTopic(t.id);
}
function gtTopicTest(){
  const t = getContinueTopic();
  if(!t) return;
  openTopic(t.id);
  setTimeout(()=>{ const tab=document.querySelector('.tab-btn[data-tab="quiz"]'); if(tab) tab.click(); },50);
}
function gtSmartRevision(){
  const cont = getContinueTopic();
  const rec = getRecommendedTopic(cont?cont.id:null);
  if(!rec || !rec.topic) return;
  openTopic(rec.topic.id);
  setTimeout(()=>{ const tab=document.querySelector('.tab-btn[data-tab="quiz"]'); if(tab) tab.click(); },50);
  toast(rec.reason || 'Revision topic loaded.');
}

/* ============================================================
   GRAMMAR JOURNEY — PHASE 2 render engine
   Order follows the curriculum sequence already defined in
   SKILL_TIERS (Phase 1 skill tree), so progression/locking logic
   stays identical app-wide. Reuses gtOpenSheet for the level sheet
   and gtProgress/TREE_META for per-topic data — fully modular so a
   Command Token / hint system can hook in later without a rebuild.
=============================================================*/
const GJ_SHORT = {
  'parts-of-speech':'PoS','noun':'Noun','pronoun':'Pron','verb':'Verb','adjective':'Adj','adverb':'Adv',
  'preposition':'Prep','conjunction':'Conj','articles':'Art','tenses':'Tense','voice':'Voice','narration':'Narr',
  'sva':'SVA','modals':'Modal','conditionals':'Cond','question-tags':'QTag','comparison':'Comp','clauses':'Clause',
  'phrases':'Phrase','gerunds-infinitives':'Ger','participles':'Part','parallelism':'Para','punctuation':'Punc',
  'capitalization':'Cap','word-formation':'WForm','sentence-structure':'SentS','determiners':'Det',
  'spotting-errors':'Error','sentence-improvement':'Improv','idioms-phrasal-verbs':'Idiom',
  'one-word-substitution':'OWS','jumbled-sentences':'Order','confused-words':'Confuse','cloze-test-strategy':'Cloze'
};
function gjOrder(){ return SKILL_TIERS.flatMap(t=>t.ids).filter(id=>GRAMMAR.some(g=>g.id===id)); }
function gjFrontierIndex(order){
  const idx = order.findIndex(id=>!State.completedTopics[id]);
  return idx===-1 ? order.length : idx;
}
let gjResizeBound = false;
function renderGrammarJourney(){
  const wrap=document.getElementById('gjPathWrap');
  if(!wrap)return;
  const order=gjOrder(),total=order.length;
  const cleared=order.filter(id=>State.completedTopics[id]).length;
  const frontier=gjFrontierIndex(order);
  const overallPct=total?Math.round(cleared/total*100):0;

  const rankChip=document.getElementById('gjRankChip');if(rankChip)rankChip.textContent='Rank: '+gjRankLabel(cleared,total);
  const elOverall=document.getElementById('gjStatOverall');if(elOverall)elOverall.textContent=overallPct+'%';
  const elCompleted=document.getElementById('gjStatCompleted');if(elCompleted)elCompleted.textContent=cleared+'/'+total;
  const frontierTopic=order[frontier]?GRAMMAR.find(g=>g.id===order[frontier]):null;
  const elCurrent=document.getElementById('gjStatCurrent');if(elCurrent)elCurrent.textContent=frontierTopic?(GJ_SHORT[frontierTopic.id]||frontierTopic.title):'Done';
  const elStreak=document.getElementById('gjStatStreak');if(elStreak)elStreak.textContent=(State.personalBests&&State.personalBests.longestStreak)||0;
  const cadetLine=document.getElementById('gjCadetLine');
  const cadetSub=document.getElementById('gjCadetSub');
  const cadetBar=document.getElementById('gjCadetBarFill');
  if(cadetLine)cadetLine.textContent=frontierTopic?('Next up: '+frontierTopic.title):'Every topic cleared, Cadet!';
  if(cadetSub)cadetSub.textContent=frontierTopic?'Follow the stages below. Each card opens a topic with its lesson, notes and practice.':'All grammar topics are complete. Revisit any stage to revise.';
  if(cadetBar)cadetBar.style.width=overallPct+'%';

  const descriptions=[
    'Start here: learn the basic parts of a sentence.',
    'Build control over verbs, time and sentence links.',
    'Put ideas together and understand sentence patterns.',
    'Improve clarity, correctness and written form.',
    'Practise the question styles used in competitive exams.'
  ];
  const roadmap=document.createElement('div');roadmap.className='gj-roadmap';
  SKILL_TIERS.forEach((tier,tierIndex)=>{
    const ids=tier.ids.filter(id=>GRAMMAR.some(g=>g.id===id));if(!ids.length)return;
    const doneCount=ids.filter(id=>State.completedTopics[id]).length;
    const tierPct=Math.round(doneCount/ids.length*100);
    const containsFrontier=frontier<total&&ids.includes(order[frontier]);
    const isDefault=containsFrontier||(frontier>=total&&tierIndex===SKILL_TIERS.length-1);
    const stage=document.createElement('details');stage.className='gj-roadmap-stage';stage.dataset.tier=String(tierIndex);stage.open=isDefault;
    const summary=document.createElement('summary');
    const num=document.createElement('span');num.className='gj-stage-num';num.textContent=String(tierIndex+1).padStart(2,'0');
    const copy=document.createElement('span');copy.className='gj-stage-copy';
    const title=document.createElement('span');title.className='gj-stage-title';title.textContent=tier.label.replace(/^Tier [IVX]+\s*·\s*/,'');
    const desc=document.createElement('span');desc.className='gj-stage-desc';desc.textContent=descriptions[tierIndex]||'Keep moving through the grammar curriculum.';
    copy.append(title,desc);
    const count=document.createElement('span');count.className='gj-stage-count';count.textContent=doneCount+'/'+ids.length+' cleared';
    summary.append(num,copy,count);stage.appendChild(summary);
    const progress=document.createElement('div');progress.className='gj-stage-progress';progress.setAttribute('aria-hidden','true');
    const fill=document.createElement('span');fill.style.width=tierPct+'%';progress.appendChild(fill);stage.appendChild(progress);
    const grid=document.createElement('div');grid.className='gj-stage-grid';
    ids.forEach(id=>{
      const g=GRAMMAR.find(x=>x.id===id);if(!g)return;
      const index=order.indexOf(id),done=!!State.completedTopics[id],locked=index>frontier;
      const state=done?'is-done':index===frontier?'is-current':locked?'is-locked':'is-available';
      const label=done?'Completed':index===frontier?'Next up':locked?'Locked':'Available';
      const card=document.createElement('button');card.type='button';card.className='gj-roadmap-card '+state;card.dataset.id=id;card.dataset.locked=locked?'1':'0';
      card.setAttribute('aria-label',g.title+'. '+label+(locked?'. Clear the earlier topics first.':'. Open topic.'));
      const icon=document.createElement('span');icon.className='gj-roadmap-icon';icon.setAttribute('aria-hidden','true');icon.textContent=g.icon||'📘';
      const body=document.createElement('span');body.className='gj-roadmap-copy';
      const name=document.createElement('span');name.className='gj-roadmap-name';name.textContent=g.title;
      const short=document.createElement('span');short.className='gj-roadmap-desc';short.textContent=g.desc||'Open the topic to study its rules and examples.';
      const status=document.createElement('span');status.className='gj-roadmap-state';status.textContent=label;
      body.append(name,short,status);
      const action=document.createElement('span');action.className='gj-roadmap-action';action.setAttribute('aria-hidden','true');action.textContent=locked?'🔒':'→';
      card.append(icon,body,action);grid.appendChild(card);
    });
    stage.appendChild(grid);roadmap.appendChild(stage);
  });
  wrap.style.removeProperty('height');
  wrap.replaceChildren(roadmap);
  if(wrap.dataset.eventsBound!=='1'){
    wrap.dataset.eventsBound='1';
    wrap.addEventListener('click',event=>{
      const card=event.target.closest('.gj-roadmap-card');
      if(!card||!wrap.contains(card))return;
      if(card.dataset.locked==='1'){toast('Clear the levels above this one first, Cadet.');return;}
      gtOpenSheet(card.dataset.id);
    });
  }
}
function gjRankLabel(cleared,total){
  if(!total) return 'Recruit';
  const pct = cleared/total;
  if(pct>=1) return 'Commander';
  if(pct>=0.7) return 'Captain';
  if(pct>=0.4) return 'Lieutenant';
  if(pct>0) return 'Cadet';
  return 'Recruit';
}
window.addEventListener('resize', ()=>{
  if(gjResizeBound) return;
  gjResizeBound = true;
  setTimeout(()=>{
    gjResizeBound = false;
    const v = document.getElementById('view-journey');
    if(v && v.classList.contains('active')) renderGrammarJourney();
  }, 200);
});

/* ---- Daily Lucky Spin ---- */
const SPIN_REWARDS = [5,50,10,15,10,25,10,20];
function updateSpinState(){
  const btn = document.getElementById('spinBtn'); if(!btn) return;
  const today = new Date().toDateString();
  if(State.lastSpinDate===today){
    btn.disabled = true; btn.textContent = 'Come back tomorrow';
    document.getElementById('spinDesc').textContent = 'You\'ve claimed today\'s spin. A fresh spin unlocks after midnight.';
  } else {
    btn.disabled = false; btn.textContent = 'Spin the Wheel';
    document.getElementById('spinDesc').textContent = 'One free spin per day. Land the wheel for bonus XP — the higher the number, the bigger the reward.';
  }
}
let spinCurrentRotation = 0;
function doLuckySpin(){
  const today = new Date().toDateString();
  if(State.lastSpinDate===today){ toast('Already claimed today\'s spin. Come back tomorrow, Cadet.'); return; }
  const btn = document.getElementById('spinBtn'); const wheel = document.getElementById('spinWheel');
  if(!btn||!wheel||btn.disabled) return;
  btn.disabled = true;
  const i = Math.floor(Math.random()*SPIN_REWARDS.length);
  const reward = SPIN_REWARDS[i];
  // Angle (0-360) the wheel must be rotated to so segment i's center sits under the top pointer.
  const targetAngle = (360 - (i*45 + 22.5) + 360) % 360;
  // Always spin forward from wherever the wheel currently is, landing exactly on targetAngle,
  // plus a handful of full extra turns for a satisfying spin (never rotates backward).
  const currentMod = ((spinCurrentRotation % 360) + 360) % 360;
  let delta = targetAngle - currentMod;
  if(delta <= 0) delta += 360;
  spinCurrentRotation += 1800 + delta;
  wheel.style.transform = `rotate(${spinCurrentRotation}deg)`;
  setTimeout(()=>{
    addXP(reward,'Daily Lucky Spin');
    State.lastSpinDate = today; saveState();
    launchConfettiIf(reward>=20);
    toast('Lucky Spin landed on +'+reward+' XP!');
    updateSpinState();
    refreshDashboard();
  }, 3650);
}

let currentTopic=null;
function diffDots(n){let h='<span class="diff-dots">';for(let i=1;i<=3;i++)h+=`<span class="diff-dot ${i<=n?'fill':''}"></span>`;return h+'</span>';}
function renderMindmap(d){
  if(!d) return '';
  return `<div class="mindmap reveal"><div class="mm-center">${d.center}</div><div class="mm-branches">
    ${d.branches.map(b=>`<div class="mm-branch"><div class="mm-branch-label">${b.label}</div>
      <div class="mm-leaves">${(b.sub||[]).map(s=>`<div class="mm-leaf">${s}</div>`).join('')}</div></div>`).join('')}
  </div></div>`;
}
function renderCompare(c){
  if(!c) return '';
  return `<div class="cmp-wrap reveal"><table class="compare-table"><thead><tr>${c.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${c.rows.map(r=>`<tr>${r.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderLevels(lv){
  if(!lv) return '';
  const order=['beginner','intermediate','advanced','expert'];
  const keys=order.filter(k=>lv[k]);
  return `<div class="reveal"><div class="level-tabs">${keys.map((k,i)=>`<button class="level-tab ${i===0?'active':''}" onclick="setLevel(this,'${k}')">${k}</button>`).join('')}</div>
  ${keys.map((k,i)=>`<div class="level-pane ${i===0?'active':''}" data-level="${k}">${lv[k]}</div>`).join('')}</div>`;
}
function setLevel(btn,key){
  const wrap=btn.closest('.reveal');
  wrap.querySelectorAll('.level-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  wrap.querySelectorAll('.level-pane').forEach(p=>p.classList.toggle('active',p.dataset.level===key));
}
function toggleAccordion(el){el.parentElement.classList.toggle('open');}
function toggleReveal(el){el.classList.toggle('open');}
function openTopic(id){
  currentTopic = GRAMMAR.find(g=>g.id===id);
  if(!currentTopic) return;
  const academyTopic=window.VaaniGrammarAcademy&&VaaniGrammarAcademy.resolve(id);
  State.topicProgress = State.topicProgress || {};
  if(!State.topicProgress[id]){ State.topicProgress[id]=true; saveState(); }
  document.getElementById('topicEyebrow').textContent='Grammar Module';
  document.getElementById('topicTitle').textContent=currentTopic.title;
  const st = topicStatus(id);
  const stampEl = document.getElementById('topicStamp');
  stampEl.textContent = st==='cleared'?'CLEARED':'IN PROGRESS';
  stampEl.className='status-stamp '+(st==='cleared'?'cleared':'progress');

  const meta = currentTopic.meta || {difficulty:2,time:'6 min',prereq:[],related:[]};
  document.getElementById('topicMetaStrip').innerHTML = `
    <div class="meta-pill">⏱ <b>${meta.time||'6 min'}</b> read</div>
    <div class="meta-pill">Difficulty ${diffDots(meta.difficulty||2)}</div>
    ${meta.prereq&&meta.prereq.length?`<div class="meta-pill">Prereq: <b>${meta.prereq.join(', ')}</b></div>`:''}
    <div class="meta-pill">📝 ${academyTopic?academyTopic.assessments.length:currentTopic.quiz.length} quiz Qs</div>`;

  const steps=[['concept','①','Concept'],['rule','②','Rule'],['exception','③','Exception'],['trick','④','Trick'],
    ['example','⑤','Example'],['practice','⑥','Practice'],['pyq','⑦','PYQ'],['summary','⑧','Summary']];
  document.getElementById('flowStepper').innerHTML = steps.map((s,i)=>
    `<div class="flow-step ${i===0?'cur':''}" data-step="${s[0]}" onclick="jumpFlow('${s[0]}',this)"><span class="fn">${i+1}</span>${s[2]}</div>`).join('');

  // Plain-language explanation comes first; detailed reference stays optional.
  const basics=(typeof GRAMMAR_BASICS!=='undefined'&&GRAMMAR_BASICS[currentTopic.id])||{plain:currentTopic.summary||currentTopic.desc||'Study the rule and examples below.',rule:'Check the role of the word or phrase in the complete sentence.',good:(currentTopic.examples&&currentTopic.examples[0]&&currentTopic.examples[0].s)||'',bad:'',why:(currentTopic.examples&&currentTopic.examples[0]&&currentTopic.examples[0].note)||''};
  const escLesson=escapeHtmlVaani;
  let learnHtml='<section class="lesson-start-card"><div class="lesson-start-top"><span class="lesson-kicker">START HERE · PLAIN ENGLISH</span><span class="lesson-time">'+escLesson(meta.time||'6 min')+'</span></div><h3>Understand the idea first</h3><p class="lesson-plain">'+escLesson(basics.plain)+'</p><div class="lesson-rule"><span class="lesson-mini-label">THE RULE</span><p>'+escLesson(basics.rule)+'</p></div>'+(basics.good?'<div class="lesson-example is-good"><span class="lesson-mini-label">EXAMPLE</span><p>'+escLesson(basics.good)+'</p></div>':'')+(basics.bad?'<div class="lesson-example is-watch"><span class="lesson-mini-label">WATCH OUT</span><p>'+escLesson(basics.bad)+'</p><small>'+escLesson(basics.why||'Check the rule before choosing.')+'</small></div>':'')+(!basics.bad&&basics.why?'<p class="lesson-why">'+escLesson(basics.why)+'</p>':'')+'<div class="lesson-start-actions"><button class="btn" type="button" id="lessonGoPractice">Try a question →</button><span>Detailed notes are available below when you need them.</span></div></section>';
  learnHtml+='<details class="lesson-reference"><summary>Open detailed reference notes (optional)</summary><div class="lesson-reference-body">'+(currentTopic.learn||'')+(currentTopic.didYouKnow?'<div class="dyk-box"><span class="dyk-icon">💡</span><div><b>DID YOU KNOW?</b>'+currentTopic.didYouKnow+'</div></div>':'')+(currentTopic.diagram?renderMindmap(currentTopic.diagram):'')+(currentTopic.exception?'<div class="exception-box"><span class="elabel">⚠ EXCEPTION TO THE RULE</span>'+currentTopic.exception+'</div>':'')+(currentTopic.levels?'<div class="panel-title" style="margin-top:24px"><span class="bar"></span>Explore by Depth</div>'+renderLevels(currentTopic.levels):'')+(currentTopic.comparison?'<div class="panel-title" style="margin-top:24px"><span class="bar"></span>Comparison Table</div>'+renderCompare(currentTopic.comparison):'')+(currentTopic.cheatSheet?'<div class="cheat-card"><h4>📋 '+escLesson(currentTopic.cheatSheet.title||'Printable Cheat Sheet')+'</h4><div class="cheat-grid">'+(currentTopic.cheatSheet.items||[]).map(it=>'<div class="cheat-cell"><b>'+escLesson(it.k)+'</b>'+escLesson(it.v)+'</div>').join('')+'</div></div>':'')+'</div></details>';

  if(academyTopic) learnHtml+=grammarAcademyLessonHTML(academyTopic);
  learnHtml='<section class="grammar-coach-card"><div class="lesson-kicker">PRACTISE WRITING</div><h3>Try your own sentence</h3><p>Write one sentence using this rule. The optional checker can suggest corrections.</p><label for="grammarCoachInput">Your sentence</label><textarea id="grammarCoachInput" rows="3" maxlength="3000" placeholder="Write a sentence in your own words…"></textarea><div class="grammar-coach-actions"><button class="btn ghost" type="button" id="grammarCoachCheck" onclick="checkGrammarSentence()">Check sentence</button><span>Manual check · English (US)</span></div><div id="grammarCoachResult" class="grammar-coach-result" role="status" aria-live="polite"></div><small class="grammar-coach-privacy">Your sentence is sent to LanguageTool only when you press Check sentence. Avoid entering personal information. Automated suggestions can be imperfect.</small><small class="grammar-coach-credit">Powered by <a href="https://languagetool.org/" target="_blank" rel="noopener noreferrer">LanguageTool</a>.</small></section>'+learnHtml;
  document.getElementById('pane-learn').innerHTML=learnHtml;
  const lessonPracticeBtn=document.getElementById('lessonGoPractice');
  if(lessonPracticeBtn)lessonPracticeBtn.addEventListener('click',()=>{const practiceStep=document.querySelector('.flow-step[data-step="practice"]');if(practiceStep)jumpFlow('practice',practiceStep);});


  // ---- EXAMPLES PANE ----
  let exHtml = `<div id="fs-example">` + currentTopic.examples.map(e=>
    `<div class="example-box reveal">"${e.s}"<br><span style="font-style:normal;color:var(--muted2);font-size:.8rem">→ ${e.note}</span></div>`).join('') + `</div>`;
  if(currentTopic.officerTip){
    exHtml += `<div class="officer-tip reveal"><span class="oicon">🎖</span><div><b style="color:var(--green);display:block;font-family:var(--mono);font-size:.68rem;letter-spacing:.1em;margin-bottom:4px">OFFICER'S TIP</b>${currentTopic.officerTip}</div></div>`;
  }
  if(currentTopic.realLife){
    exHtml += `<div class="explain-block reveal"><p><b style="color:var(--gold)">Real-life application:</b> ${currentTopic.realLife}</p></div>`;
  }
  document.getElementById('pane-examples').innerHTML = exHtml;

  // ---- TRICKS PANE ----
  document.getElementById('pane-tricks').innerHTML = `<div id="fs-trick">` +
    currentTopic.tricks.map(t=>`<div class="trick-box reveal"><span class="tlabel">MEMORY TRICK</span>${t.t}</div>`).join('') + `</div>` +
    currentTopic.mistakes.map(m=>`<div class="mistake-box reveal"><span class="mlabel">COMMON MISTAKE</span>${m.m}</div>`).join('') +
    (currentTopic.pyqNotes ? `<div id="fs-pyq" class="panel-title" style="margin-top:24px"><span class="bar"></span>Frequently Asked In NDA PYQ</div>` +
      currentTopic.pyqNotes.map(p=>`<div class="reveal-card" onclick="toggleReveal(this)"><div class="rc-q">${p.q}<span class="rc-hint">TAP TO REVEAL</span></div><div class="rc-a">${p.a}</div></div>`).join('') : '') +
    relatedPyqHTML(currentTopic.id);

  // ---- SUMMARY PANE ----
  document.getElementById('pane-summary').innerHTML = `<div id="fs-summary" class="explain-block reveal"><p>${currentTopic.summary}</p></div>
    ${currentTopic.mnemonicChain?`<div class="trick-box reveal"><span class="tlabel">QUICK MNEMONIC</span>${currentTopic.mnemonicChain}</div>`:''}
    <button class="btn glow-btn" onclick="completeTopic('${currentTopic.id}')">Mark Topic Cleared +25 XP</button>`;

  const academyQuiz=academyTopic?academyTopic.assessments.map(item=>({q:item.prompt,opts:item.options.slice(),ans:item.answer,exp:item.explanation,reasons:item.reasons.slice(),lessonId:academyTopic.id,provenance:item.provenance})):currentTopic.quiz;
  renderQuizPane(currentTopic.id, academyQuiz);
  const analyzeButton=document.getElementById('gaAnalyzeButton');if(analyzeButton)analyzeButton.addEventListener('click',analyzeGrammarSentence);
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='learn'));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id==='pane-learn'));
  switchView('topic');
  logActivity('Opened topic', currentTopic.title);
  initReveal(); initTilt();
  document.querySelector('main').scrollTo&&window.scrollTo({top:0,behavior:'smooth'});
}
function jumpFlow(step,btn){
  const tabMap={concept:'learn',rule:'learn',exception:'learn',trick:'tricks',example:'examples',practice:'quiz',pyq:'tricks',summary:'summary'};
  document.querySelectorAll('.flow-step').forEach(s=>s.classList.remove('cur'));
  btn.classList.add('cur');
  const tabName=tabMap[step];
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tabName));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id==='pane-'+tabName));
  setTimeout(()=>{const el=document.getElementById('fs-'+step); if(el) el.scrollIntoView({behavior:'smooth',block:'start'});},80);
}
function jumpRelated(title){
  const t = GRAMMAR.find(g=>g.title.toLowerCase()===title.toLowerCase() || g.id===title);
  if(t) openTopic(t.id); else toast('Topic coming soon: '+title);
}
function initReveal(){
  const els = document.querySelectorAll('.reveal:not(.in)');
  els.forEach((el,i)=>{
    if(!el.style.transitionDelay) el.style.transitionDelay = Math.min(i%8,7)*55+'ms';
  });
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{threshold:.12});
  els.forEach(el=>io.observe(el));
}
function initTilt(){
  document.querySelectorAll('.topic-card, .word-card').forEach(card=>{
    if(card._tiltBound) return; card._tiltBound=true; card.classList.add('tilt');
    card.addEventListener('mousemove',(e)=>{
      const r=card.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`perspective(700px) rotateY(${x*6}deg) rotateX(${-y*6}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave',()=>{card.style.transform='';});
  });
}
window.addEventListener('scroll',()=>{
  const view=document.getElementById('view-topic');
  if(!view.classList.contains('active')) return;
  const h=document.documentElement.scrollHeight-window.innerHeight;
  const fill=document.getElementById('readProgressFill');
  if(fill) fill.style.width = h>0 ? Math.min(100,(window.scrollY/h)*100)+'%' : '0%';
});
document.querySelectorAll('.tab-btn').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('pane-'+b.dataset.tab).classList.add('active');
  });
});
function completeTopic(id){
  if(!State.completedTopics[id]){
    State.completedTopics[id]=true; saveState(); addXP(25,'Topic cleared: '+currentTopic.title);
    logActivity('Cleared topic', currentTopic.title); refreshAll(); launchConfettiIf(true);
    if(typeof gtSparkleTopic==='function') gtSparkleTopic(id);
  } else { toast('Already cleared.'); }
}

/* ---- shared personal-bests tracker for any completed quiz/drill ---- */
function recordQuizCompletion(pct, elapsedSec, label){
  const pb = State.personalBests;
  pb.totalQuizzesTaken = (pb.totalQuizzesTaken||0) + 1;
  if(pct > (pb.highestQuizScore||0)) pb.highestQuizScore = pct;
  if(pct >= 70 && elapsedSec != null && (pb.fastestQuizSeconds==null || elapsedSec < pb.fastestQuizSeconds)){
    pb.fastestQuizSeconds = Math.round(elapsedSec);
    pb.fastestQuizLabel = label;
  }
  saveState();
}
function renderQuizPane(id, quiz){
  const pane=document.getElementById('pane-quiz');if(!pane)return;
  const questions=Array.isArray(quiz)?quiz:[];let idx=0,correctCount=0,qTimer=null,started=null,finished=false;
  function finish(){
    if(finished)return;finished=true;if(qTimer){qTimer.stop();qTimer=null;}
    const pct=questions.length?Math.round(correctCount/questions.length*100):0;State.quizScores[id]=pct;State.topicLastAttempt=State.topicLastAttempt||{};State.topicLastAttempt[id]=Date.now();saveState();
    recordQuizCompletion(pct,started?(Date.now()-started)/1000:null,((GRAMMAR.find(g=>g.id===id)||{}).title)||id);
    pane.innerHTML='<div class="quiz-card quiz-complete-card" role="status"><span class="lesson-kicker">TOPIC CHECK COMPLETE</span><h3>Your result</h3><div class="quiz-result-score">'+pct+'%</div><p>'+correctCount+' of '+questions.length+' answers correct</p><div class="quiz-result-track"><div style="width:'+pct+'%"></div></div><div class="quiz-result-actions"><button class="btn" type="button" id="quizRetry">Try again</button><button class="btn ghost" type="button" id="quizBack">Review lesson</button></div></div>';
    pane.querySelector('#quizRetry').addEventListener('click',()=>renderQuizPane(id,questions));pane.querySelector('#quizBack').addEventListener('click',()=>{const b=document.querySelector('.tab-btn[data-tab="learn"]');if(b)b.click();});
    addXP(Math.max(5,Math.round(pct/10)),'Quiz score on '+(((GRAMMAR.find(g=>g.id===id)||{}).title)||'topic'));launchConfettiIf(pct>=70);
  }
  function draw(){
    if(qTimer){qTimer.stop();qTimer=null;}if(!questions.length){pane.innerHTML='<div class="quiz-card"><h3>Practice coming soon</h3><p>No questions are available for this topic yet.</p></div>';return;}if(idx>=questions.length){finish();return;}
    if(idx===0)comboCount=0;if(started===null)started=Date.now();const item=questions[idx]||{};
    pane.innerHTML='<div class="quiz-card quiz-live-card"><div class="quiz-headline"><div><span class="lesson-kicker">CHECK YOUR UNDERSTANDING</span><div class="quiz-progress" id="grammarQuizProgress"></div></div><div class="qtimer-ring" id="qTimerRing"><svg viewBox="0 0 40 40"><circle class="qt-bg" cx="20" cy="20" r="16"></circle><circle class="qt-fg" cx="20" cy="20" r="16"></circle></svg><div class="qt-num">15</div></div></div><div class="quiz-progress-track" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="'+questions.length+'" aria-valuenow="'+(idx+1)+'"><div class="quiz-progress-fill" style="width:'+((idx+1)/questions.length*100)+'%"></div></div><div class="quiz-q" id="grammarQuizQuestion"></div><div class="quiz-options" id="optsWrap"></div><div class="quiz-feedback" id="qFeedback" role="status" aria-live="polite"></div><button class="btn quiz-nextbtn" id="nextBtn" type="button" disabled>'+(idx===questions.length-1?'View result':'Next question →')+'</button></div>';
    pane.querySelector('#grammarQuizProgress').textContent='Question '+(idx+1)+' of '+questions.length;pane.querySelector('#grammarQuizQuestion').textContent=String(item.q||'Read the question carefully.');
    const card=pane.querySelector('.quiz-card'),wrap=pane.querySelector('#optsWrap');qTimer=startQTimer(pane.querySelector('#qTimerRing'));
    (Array.isArray(item.opts)?item.opts:[]).forEach((option,i)=>{const b=document.createElement('button');b.type='button';b.className='opt-btn quiz-option';b.setAttribute('aria-pressed','false');const letter=document.createElement('span');letter.className='quiz-option-letter';letter.textContent=String.fromCharCode(65+i);const label=document.createElement('span');label.className='quiz-option-text';label.textContent=String(option);b.append(letter,label);b.addEventListener('click',()=>{if(b.disabled)return;const elapsed=qElapsedSeconds(qTimer);if(qTimer){qTimer.stop();qTimer=null;}wrap.querySelectorAll('button').forEach(x=>{x.disabled=true;x.setAttribute('aria-pressed','false');});b.setAttribute('aria-pressed','true');const fb=pane.querySelector('#qFeedback');
      const wasCorrect=i===item.ans;
      if(wasCorrect){correctCount++;b.classList.add('correct');handleQuizCorrect(b,card);fb.className='quiz-feedback is-correct';fb.textContent='Correct. '+String(item.exp||'You selected the right answer.');if(item.lessonId)recordGrammarMastery(item.lessonId,true);if(elapsed<=5){addXP(2,'Quick answer');const speed=document.createElement('span');speed.className='speed-tag';speed.textContent='⚡ Quick answer +2 XP';fb.appendChild(speed);}}
      else{b.classList.add('wrong');const right=wrap.querySelectorAll('button')[item.ans];if(right)right.classList.add('correct');handleQuizWrong(card);fb.className='quiz-feedback is-wrong';fb.textContent='Not quite. Correct answer: '+String((item.opts||[])[item.ans]||'the highlighted option')+'. '+String(item.exp||'Review the rule and try again.');if(item.lessonId)recordGrammarMastery(item.lessonId,false);}
      if(Array.isArray(item.reasons)&&item.reasons.length){const rationale=document.createElement('ul');rationale.className='ga-choice-reasons';item.reasons.forEach((reason,index)=>{const li=document.createElement('li');li.textContent=String.fromCharCode(65+index)+'. '+String(reason);rationale.appendChild(li);});fb.appendChild(rationale);}
      const next=pane.querySelector('#nextBtn');next.disabled=false;next.focus();});wrap.appendChild(b);});
    const next=pane.querySelector('#nextBtn');next.addEventListener('click',()=>{if(!next.disabled){idx++;draw();}});
    if(!item.opts||item.opts.length<2||!Number.isInteger(item.ans)||item.ans<0||item.ans>=item.opts.length){next.disabled=true;pane.querySelector('#qFeedback').textContent='This question needs correction before it can be answered.';if(qTimer){qTimer.stop();qTimer=null;}}
  }draw();
}
/* ============================================================
   VOCAB RENDER — Mastery Hub
=============================================================*/
let vocabCat='all', vocabDiff='all', currentWordId=null;
const VOCAB_BY_ID = {}; VOCAB.forEach(v=>VOCAB_BY_ID[v.id]=v);
function getDailyRotationSalt(){
  const key='vaani_daily_rotation_salt_v1';
  try{
    let value=localStorage.getItem(key);
    if(!value){value=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(key,value);}
    return value;
  }catch(e){return 'session-'+Date.now();}
}
function shuffleDailyContent(){
  const key='vaani_daily_rotation_salt_v1';
  const salt=Math.random().toString(36).slice(2)+Date.now().toString(36);
  try{localStorage.setItem(key,salt);}catch(e){}
  renderDailySetTabs();
  renderDailySingles();
  const note=document.getElementById('dailyRotationStatus');
  if(note)note.innerHTML='<strong>Today’s rotation refreshed.</strong> New items were selected while recent repeats were avoided where possible.';
  toast('Today’s learning rotation shuffled.');
}
function dailyDateKey(date){
  const d=date||new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function dailyHash(text){
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function dailyShuffle(items,seed){
  let state=seed||0x6D2B79F5;
  function random(){
    state=(state+0x6D2B79F5)|0;
    let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  }
  const out=items.slice();
  for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function dailyItemId(item,index){
  let raw=item&& (item.id||item.t||item.w||item.word||item.phrase||item.q);
  if(raw==null||raw===''){try{raw=JSON.stringify(item);}catch(e){raw='item';}}
  return String(raw).trim().toLocaleLowerCase()+'#'+index;
}
function pickDaily(arr,n,offset){
  const items=Array.isArray(arr)?arr.filter(item=>item!=null):[];
  const wanted=Math.max(0,Math.min(items.length,Math.floor(Number(n)||0)));
  if(!wanted)return [];
  const indexed=items.map((item,index)=>({id:dailyItemId(item,index),item:item}));
  const byId=new Map(indexed.map(entry=>[entry.id,entry.item]));
  const rotationSalt=getDailyRotationSalt();
  const fingerprint=String(offset||0)+'|'+indexed.map(entry=>entry.id).join('|');
  const storageKey='vaani_daily_rotation_v3_'+dailyHash(fingerprint).toString(36);
  const today=dailyDateKey();
  let stored=null;
  try{stored=JSON.parse(localStorage.getItem(storageKey)||'null');}catch(e){}
  let history=stored&&Array.isArray(stored.history)?stored.history:[];
  let orderIds=stored&&stored.date===today&&stored.salt===rotationSalt&&Array.isArray(stored.order)?stored.order.filter(id=>byId.has(id)):[];
  if(orderIds.length!==items.length){
    const shuffled=dailyShuffle(indexed,dailyHash(today+'|'+fingerprint+'|'+rotationSalt));
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-7);const cutoffKey=dailyDateKey(cutoff);
    const recentIds=new Set();
    history.filter(entry=>entry&&typeof entry.date==='string'&&entry.date<today&&entry.date>=cutoffKey)
      .forEach(entry=>(Array.isArray(entry.ids)?entry.ids:[]).forEach(id=>recentIds.add(id)));
    const fresh=shuffled.filter(entry=>!recentIds.has(entry.id));
    const repeats=shuffled.filter(entry=>recentIds.has(entry.id));
    orderIds=fresh.concat(repeats).map(entry=>entry.id);
  }
  const selectedIds=orderIds.slice(0,wanted);
  const previous=history.filter(entry=>entry&&entry.date!==today);
  previous.push({date:today,ids:selectedIds});
  try{
    localStorage.setItem(storageKey,JSON.stringify({date:today,salt:rotationSalt,order:orderIds,history:previous.slice(-15)}));
  }catch(e){}
  return selectedIds.map(id=>byId.get(id)).filter(item=>item!==undefined);
}

function setVocabCat(c){vocabCat=c;document.querySelectorAll('#vocabCatChips .chip').forEach(ch=>ch.classList.toggle('active',ch.dataset.cat===c));renderVocabGrid();}
function setVocabDiff(d){vocabDiff=d;document.querySelectorAll('#vocabDiffChips .chip').forEach(ch=>ch.classList.toggle('active',ch.dataset.diff===d));renderVocabGrid();}

async function addVaaniItemToBookRegister(payload,button){
  const item=payload&&typeof payload==='object'?payload:{};
  const word=String(item.word||'').replace(/\s+/g,' ').trim();
  if(!word){toast('This item has no word or phrase to save.');return false;}
  if(button){button.disabled=true;button.dataset.saving='1';button.textContent='Saving…';}
  try{
    const bridge=window.VaaniBookRegister;
    if(!bridge||typeof bridge.add!=='function'){
      toast('Book Reading register is not ready yet. Open Book Reading once, then try again.');
      if(button){button.disabled=false;button.textContent='Add to Book Register';delete button.dataset.saving;}
      return false;
    }
    const result=await bridge.add({
      word,meaning:String(item.meaning||'').trim(),
      synonyms:Array.isArray(item.synonyms)?item.synonyms:[],
      antonyms:Array.isArray(item.antonyms)?item.antonyms:[],
      example:String(item.example||'').trim(),
      kind:String(item.kind||'word'),
      source:String(item.source||'VAANI Vocabulary')
    });
    if(!result||!result.ok){
      toast((result&&result.message)||'Could not save this item. Check your account and try again.');
      if(button){button.disabled=false;button.textContent='Add to Book Register';delete button.dataset.saving;}
      return false;
    }
    if(button){button.textContent=result.duplicate?'✓ In Register':'✓ Added to Register';button.classList.add('is-saved');button.setAttribute('aria-label',word+(result.duplicate?' is already in the Book Reading Register':' added to the Book Reading Register'));}
    toast(result.duplicate?'"'+word+'" is already in your Book Reading Register.':'Saved "'+word+'" to your Book Reading Register.');
    return true;
  }catch(error){
    console.error('[VAANI → Book Register]',error);
    toast('Could not reach the Book Reading register. Your current page is unchanged.');
    if(button){button.disabled=false;button.textContent='Add to Book Register';delete button.dataset.saving;}
    return false;
  }
}
function makeBookRegisterButton(payload,label){
  const button=document.createElement('button');
  button.type='button';button.className='btn ghost v-book-capture';
  button.textContent=label||'Add to Book Register';
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();addVaaniItemToBookRegister(payload,button);});
  return button;
}

function renderVocabGrid(){
  const grid = document.getElementById('vocabGrid'); if(!grid) return; grid.innerHTML='';
  const term = (document.getElementById('vocabSearch')?.value||'').toLowerCase();
  let list = VOCAB.filter(v=>(vocabCat==='all'||v.cat.includes(vocabCat)) && (vocabDiff==='all'||String(v.diff)===vocabDiff));
  if(term) list = list.filter(v=>v.w.toLowerCase().includes(term)||v.meanEn.toLowerCase().includes(term));
  if(!list.length){grid.innerHTML='<div class="empty-state">No words match your filters.</div>';return;}
  list.forEach(v=>{
    const div=document.createElement('div'); div.className='card word-card';
    div.innerHTML=`<div class="wc-top"><h3>${v.w}</h3><div class="wc-imp" title="Exam importance ${v.imp}/5">${'●'.repeat(v.imp)}${'○'.repeat(5-v.imp)}</div></div>
      <div class="wc-pos">${v.pos}</div>
      <p class="wc-mean">${v.meanEn}</p>
      <div class="wc-tags"><span class="wc-tag wc-stars">${'★'.repeat(v.diff)}${'☆'.repeat(3-v.diff)}</span>${v.cat.map(c=>`<span class="wc-tag">${c}</span>`).join('')}</div>`;
    div.onclick=()=>openWord(v.id);
    div.appendChild(makeBookRegisterButton({word:v.w,meaning:v.meanEn,synonyms:v.syn,antonyms:v.ant,example:v.exEasy,kind:'word',source:'VAANI Vocabulary'},'＋ Book Register'));
    grid.appendChild(div);
  });
}

function renderDailySetTabs(){
  const shuffleBtn=document.getElementById('dailyShuffleBtn');
  if(shuffleBtn&&shuffleBtn.dataset.bound!=='1'){
    shuffleBtn.dataset.bound='1';
    shuffleBtn.addEventListener('click',shuffleDailyContent);
  }
  const sets=[
    {key:'wod',label:'Words of the Day',cat:null,offset:0},
    {key:'advanced',label:'Advanced Words',cat:'advanced',offset:1},
    {key:'nda',label:'NDA Frequent',cat:'nda',offset:2},
    {key:'editorial',label:'Editorial Words',cat:'editorial',offset:3},
    {key:'military',label:'Military Vocabulary',cat:'military',offset:4},
    {key:'foreign',label:'Foreign Phrases',cat:'foreign',offset:5}
  ];
  const tabs=document.getElementById('dailySetTabs');
  if(!tabs){console.warn('[VAANI] dailySetTabs container is missing');return;}
  tabs.innerHTML='';
  sets.forEach((s,i)=>{
    const b=document.createElement('button'); b.className='daily-tab-btn'+(i===0?' active':''); b.textContent=s.label; b.dataset.key=s.key;
    b.onclick=()=>{document.querySelectorAll('.daily-tab-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderDailySetGrid(s);};
    tabs.appendChild(b);
  });
  renderDailySetGrid(sets[0]);
}
function renderDailySetGrid(setDef){
  const grid=document.getElementById('dailySetGrid');
  if(!grid){console.warn('[VAANI] dailySetGrid container is missing');return;}
  grid.innerHTML='';
  if(!setDef){grid.innerHTML='<div class="empty-state">Choose a daily set to begin.</div>';return;}
  if(setDef.key==='foreign'){
    const picks = pickDaily(FOREIGN_PHRASES,5,setDef.offset);
    picks.forEach(p=>{
      const div=document.createElement('div'); div.className='card word-card'; div.style.cursor='default';
      div.innerHTML=`<h3>${p.t}</h3><div class="wc-pos">${p.lang}</div><p class="wc-mean">${p.mean}</p><div class="example-box" style="margin-top:8px">"${p.ex}"</div>`;
      div.appendChild(makeBookRegisterButton({word:p.t,meaning:p.mean,example:p.ex,kind:'phrase',source:'VAANI Foreign Phrases'},'＋ Book Register'));
      grid.appendChild(div);
    });
    return;
  }
  const pool = setDef.cat ? VOCAB.filter(v=>v.cat.includes(setDef.cat)) : VOCAB;
  const picks = pickDaily(pool,5,setDef.offset);
  picks.forEach(v=>{
    const div=document.createElement('div'); div.className='card word-card';
    div.innerHTML=`<div class="wc-top"><h3>${v.w}</h3><div class="wc-imp" title="Exam importance ${v.imp}/5">${'●'.repeat(v.imp)}${'○'.repeat(5-v.imp)}</div></div><div class="wc-pos">${v.pos}</div><p class="wc-mean">${v.meanEn}</p>`;
    div.onclick=()=>openWord(v.id);
    div.appendChild(makeBookRegisterButton({word:v.w,meaning:v.meanEn,synonyms:v.syn,antonyms:v.ant,example:v.exEasy,kind:'word',source:'VAANI Daily Vocabulary'},'＋ Book Register'));
    grid.appendChild(div);
  });
}

function renderDailySingles(){
  const strip=document.getElementById('dailySinglesStrip'); if(!strip)return; strip.innerHTML='';
  const items=[
    {label:'Idiom of the Day',tag:'IDM',d:pickDaily(DAILY_IDIOMS,1,6)[0]},
    {label:'Phrase of the Day',tag:'PHR',d:pickDaily(DAILY_PHRASES,1,7)[0]},
    {label:'Proverb of the Day',tag:'PRV',d:pickDaily(DAILY_PROVERBS,1,8)[0]},
    {label:'Phrasal Verb of the Day',tag:'P·V',d:pickDaily(DAILY_PHRASAL_VERBS,1,9)[0]},
    {label:'Collocation of the Day',tag:'COL',d:pickDaily(DAILY_COLLOCATIONS,1,10)[0]},
    {label:'Prefix of the Day',tag:'PRE',d:pickDaily(DAILY_PREFIXES,1,11)[0]},
    {label:'Suffix of the Day',tag:'SUF',d:pickDaily(DAILY_SUFFIXES,1,12)[0]},
    {label:'Root Word of the Day',tag:'ROOT',d:pickDaily(DAILY_ROOTS,1,13)[0]}
  ];
  const available=items.filter(it=>it.d&&it.d.t);
  if(!available.length){strip.innerHTML='<div class="empty-state">Daily lessons are temporarily unavailable. Please try again shortly.</div>';return;}
  available.forEach(it=>{
    const div=document.createElement('div'); div.className='single-card';
    div.innerHTML=`<div class="sc-badge">${it.tag}</div><div class="sc-label">${it.label.toUpperCase()}</div><div class="sc-word">${it.d.t}</div><div class="sc-mean">${it.d.mean||''}</div>`;
    div.appendChild(makeBookRegisterButton({word:it.d.t,meaning:it.d.mean||'',example:it.d.ex||'',kind:it.label.toLowerCase().replace(/ of the day$/,''),source:'VAANI '+it.label},'＋ Book Register'));
    strip.appendChild(div);
  });
}

function renderConfuseTable(){
  const body=document.getElementById('confuseTableBody'); if(!body) return; body.innerHTML='';
  CONFUSED_PAIRS.forEach(p=>{
    const card=document.createElement('div'); card.className='cw-card';
    card.innerHTML=`<div class="cw-pair-name">${p.pair}</div>
      <div class="cw-sides">
        <div class="cw-side"><span class="cw-side-tag">A</span>${p.a}</div>
        <div class="cw-vs">vs</div>
        <div class="cw-side"><span class="cw-side-tag b">B</span>${p.b}</div>
      </div>
      <div class="cw-trick"><span class="cw-trick-lbl">Memory trick</span>${p.trick}</div>`;
    body.appendChild(card);
  });
}


function markWordLearned(){
  const today=new Date().toDateString();
  const key = currentWordId || 'wod';
  if(!State.vocabLearned[today+'_'+key]){State.vocabLearned[today+'_'+key]=true; State.vocabLearned[today]=true; saveState();addXP(10,'Word learned: '+(VOCAB_BY_ID[currentWordId]?VOCAB_BY_ID[currentWordId].w:'Word of the Day'));}
  else toast('Already marked today.');
}
function renderWOD(){
  const v = pickDaily(VOCAB,1,0)[0];
  document.getElementById('dashWord').textContent=v.w;
  document.getElementById('dashWordMeaning').textContent=v.meanEn;
  const capture=document.getElementById('dashWordToBook');
  if(capture)capture.onclick=()=>addVaaniItemToBookRegister({word:v.w,meaning:v.meanEn,synonyms:v.syn,antonyms:v.ant,example:v.exEasy,kind:'word',source:'VAANI Word of the Day'},capture);
}

function lookupExternalWord(){
  const word=VOCAB_BY_ID[currentWordId],button=document.getElementById('wdDictionaryLookup'),host=document.getElementById('wdDictionaryResult');
  if(!word||!button||!host)return;if(typeof VaaniDictionary==='undefined'){host.textContent='Online dictionary unavailable. The curated VAANI entry remains available.';return;}
  button.disabled=true;button.textContent='Looking up…';host.textContent='Looking up an optional dictionary entry…';
  VaaniDictionary.lookup(word.w).then(result=>{if(currentWordId!==word.id)return;host.innerHTML='';const entry=result.entry;
    const source=document.createElement('p');source.className='dict-source';source.textContent=(result.stale?'Showing a saved entry because the service is unavailable. ':result.source==='cache'?'Showing a saved dictionary entry. ':'Online dictionary result. ')+'Supplementary data; compare with the VAANI lesson.';host.appendChild(source);
    if(entry.phonetic){const p=document.createElement('p');p.className='dict-phonetic';p.textContent='Pronunciation: '+entry.phonetic;host.appendChild(p);}
    entry.meanings.forEach(m=>{const group=document.createElement('div');group.className='dict-meaning';if(m.partOfSpeech){const h=document.createElement('h5');h.textContent=m.partOfSpeech;group.appendChild(h);}m.definitions.forEach(d=>{const p=document.createElement('p');p.className='dict-definition';p.textContent=d.definition;group.appendChild(p);if(d.example){const ex=document.createElement('p');ex.className='dict-example';ex.textContent='Example: '+d.example;group.appendChild(ex);}if(d.synonyms.length){const sy=document.createElement('p');sy.className='dict-related';sy.textContent='Synonyms: '+d.synonyms.join(', ');group.appendChild(sy);}if(d.antonyms.length){const an=document.createElement('p');an.className='dict-related';an.textContent='Antonyms: '+d.antonyms.join(', ');group.appendChild(an);}});host.appendChild(group);});
    const audioUrl=entry.phonetics.map(p=>p.audio).find(url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='ssl.gstatic.com'||u.hostname.endsWith('.dictionaryapi.dev'));}catch(e){return false;}});if(audioUrl){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=audioUrl;audio.setAttribute('aria-label','Word pronunciation audio');host.appendChild(audio);}
  }).catch(err=>{if(currentWordId===word.id)host.textContent=(err&&err.message?err.message:'Online lookup failed.')+' Your curated VAANI entry is still available above.';}).finally(()=>{if(currentWordId===word.id){button.disabled=false;button.textContent='Refresh lookup';}});
}
function checkGrammarSentence(){
 const input=document.getElementById('grammarCoachInput'),result=document.getElementById('grammarCoachResult'),button=document.getElementById('grammarCoachCheck');
 if(!input||!result||!button)return;const sentence=input.value.trim();result.textContent='';if(!sentence){result.textContent='Write a sentence first.';input.focus();return;}
 if(typeof VaaniWritingCoach==='undefined'){result.textContent='Online checker unavailable. Use the lesson examples and practice questions instead.';return;}
 const request=(window.__vaaniCoachRequest||0)+1;window.__vaaniCoachRequest=request;button.disabled=true;button.textContent='Checking…';result.textContent='Checking your sentence…';
 VaaniWritingCoach.check(sentence).then(matches=>{if(request!==window.__vaaniCoachRequest)return;result.innerHTML='';if(!matches.length){const p=document.createElement('p');p.className='coach-success';p.textContent='No issues found by the checker. Automated feedback cannot guarantee a perfect sentence.';result.appendChild(p);return;}const intro=document.createElement('p');intro.className='coach-intro';intro.textContent=matches.length+' suggestion(s) to review';result.appendChild(intro);matches.forEach((m,i)=>{const card=document.createElement('div');card.className='coach-issue';const h=document.createElement('strong');h.textContent='Suggestion '+(i+1);card.appendChild(h);const p=document.createElement('p');p.textContent=m.message;card.appendChild(p);if(m.context){const c=document.createElement('small');c.textContent='Context: '+m.context;card.appendChild(c);}if(m.replacements.length){const r=document.createElement('p');r.className='coach-replacements';r.textContent='Possible correction: '+m.replacements.join(' · ');card.appendChild(r);}result.appendChild(card);});}).catch(err=>{if(request===window.__vaaniCoachRequest)result.textContent=(err&&err.message?err.message:'Online checking failed.')+' Your sentence has not been changed.';}).finally(()=>{if(request===window.__vaaniCoachRequest){button.disabled=false;button.textContent='Check sentence';}});
}
function openWord(id){
  const v = VOCAB_BY_ID[id]; if(!v) return;
  currentWordId = id;
  document.getElementById('wdWord').textContent=v.w;
  document.getElementById('wdIpa').textContent=v.ipa;
  document.getElementById('wdPos').textContent=v.pos;
  document.getElementById('wdMetaRow').innerHTML=`<span><b>Category:</b> ${v.cat.join(', ')}</span><span><b>Difficulty:</b> ${'★'.repeat(v.diff)}</span><span><b>Exam Importance:</b> ${v.imp}/5</span>`;
  document.getElementById('wdMeanEn').textContent=v.meanEn;
  document.getElementById('wdMeanHi').textContent=v.meanHi;
  document.getElementById('wdEasy').textContent=v.easy;
  document.getElementById('wdEtym').textContent=v.etym;
  document.getElementById('wdRoot').textContent=v.root;
  document.getElementById('wdAffix').textContent=v.affix;
  document.getElementById('wdSyl').textContent=v.syl;
  document.getElementById('wdMnemonic').textContent=v.mnemonic;
  document.getElementById('wdMistake').textContent=v.mistake;
  document.getElementById('wdSyn').innerHTML=v.syn.map(s=>`<span class="wd-chip" onclick="searchOrOpen('${s.replace(/'/g,"\\'")}')">${s}</span>`).join('');
  document.getElementById('wdAnt').innerHTML=v.ant.map(s=>`<span class="wd-chip ant" onclick="searchOrOpen('${s.replace(/'/g,"\\'")}')">${s}</span>`).join('');
  document.getElementById('wdFamily').innerHTML=(v.family||[]).map(s=>`<span class="wd-chip">${s}</span>`).join('')||'<span class="wc-mean">—</span>';
  document.getElementById('wdConfused').innerHTML=(v.confused||[]).map(s=>`<span class="wd-chip" style="cursor:default">${s}</span>`).join('')||'<span class="wc-mean">—</span>';
  document.getElementById('wdFormal').textContent=v.formal;
  document.getElementById('wdBrAm').textContent=v.brAm;
  document.getElementById('wdPrep').textContent=v.prep;
  document.getElementById('wdColloc').textContent=(v.colloc||[]).join(' · ');
  document.getElementById('wdExEasy').textContent='Easy: "'+v.exEasy+'"';
  document.getElementById('wdExMed').textContent='Medium: "'+v.exMed+'"';
  document.getElementById('wdExAdv').textContent='Advanced: "'+v.exAdv+'"';
  document.getElementById('wdExEdit').textContent='Editorial: "'+v.exEdit+'"';
  document.getElementById('wdExNDA').textContent='NDA-style: "'+v.exNDA+'"';
  document.getElementById('wdDiffStars').textContent='★'.repeat(v.diff)+'☆'.repeat(3-v.diff);
  document.getElementById('wdImportance').textContent=v.imp+' / 5';
  document.getElementById('wdYears').textContent=v.years;
  document.getElementById('wdPYQ').textContent=v.pyq;
  const capture=document.getElementById('wdAddToBookRegister');
  if(capture){
    capture.disabled=false;capture.textContent='＋ Add to Book Register';capture.classList.remove('is-saved');
    capture.onclick=()=>addVaaniItemToBookRegister({word:v.w,meaning:v.meanEn,synonyms:v.syn,antonyms:v.ant,example:v.exEasy,kind:'word',source:'VAANI Vocabulary'},capture);
  }
  const dictionaryPanel=document.getElementById('wdDictionaryResult'),dictionaryButton=document.getElementById('wdDictionaryLookup');
  if(dictionaryPanel)dictionaryPanel.textContent='';if(dictionaryButton){dictionaryButton.disabled=false;dictionaryButton.textContent='Look up word';}
  renderWordQuiz(v);
  switchView('worddetail');
}
function searchOrOpen(word){
  const match = VOCAB.find(v=>v.w.toLowerCase()===word.toLowerCase());
  if(match){ openWord(match.id); }
  else { switchView('vocab'); document.getElementById('vocabSearch').value=word; renderVocabGrid(); toast('Showing closest matches for "'+word+'"'); }
}
function renderWordQuiz(v){
  const wrap=document.getElementById('wdQuizWrap'); wrap.innerHTML='';
  if(!v.quiz || !v.quiz.length){wrap.innerHTML='<p class="wc-mean">No quiz available for this word yet.</p>';return;}
  v.quiz.forEach((item,qi)=>{
    const block=document.createElement('div'); block.style.marginBottom='16px';
    block.innerHTML=`<div class="quiz-q" style="font-size:.9rem">${qi+1}. ${item.q}</div><div id="wdOpts${qi}"></div><div class="quiz-feedback" id="wdFb${qi}"></div>`;
    wrap.appendChild(block);
    const optsWrap=block.querySelector(`#wdOpts${qi}`);
    item.opts.forEach((o,oi)=>{
      const b=document.createElement('button'); b.className='opt-btn'; b.textContent=o;
      b.onclick=()=>{
        optsWrap.querySelectorAll('.opt-btn').forEach(x=>x.disabled=true);
        if(oi===item.ans){b.classList.add('correct');handleQuizCorrect(b,null);reviewMarkRight('vocab',v.id);}
        else{b.classList.add('wrong');optsWrap.querySelectorAll('.opt-btn')[item.ans].classList.add('correct');handleQuizWrong(null);reviewMarkWrong('vocab',v.id);}
      };
      optsWrap.appendChild(b);
    });
  });
}

/* ============================================================
   PRACTICE / READING / TESTS RENDER
=============================================================*/
function renderPracticeGrid(){
  const grid=document.getElementById('practiceGrid'); if(!grid)return; grid.innerHTML='';
  const randomized = (typeof pvShuffle==='function' ? pvShuffle(PRACTICE) : PRACTICE.slice());
  randomized.forEach(p=>{
    const div=document.createElement('div'); div.className='card topic-card';
    div.innerHTML=`<div class="icon">${p.icon}</div><span class="vaani-mini-kicker">Randomized drill</span><h3>${p.title}</h3><p>${p.desc}</p>
      <div class="topic-meta"><span>${p.q.length} question${p.q.length>1?'s':''}</span><span>Open ›</span></div>`;
    div.onclick=()=>openPractice(p);
    grid.appendChild(div);
  });
}
function openPractice(p){
  document.getElementById('topicEyebrow').textContent='Sentence Practice · Randomized set';
  document.getElementById('topicTitle').textContent=p.title;
  document.getElementById('topicStamp').style.display='none';
  document.querySelectorAll('.tab-btn').forEach((b,i)=>b.style.display = b.dataset.tab==='quiz'?'block':'none');
  document.querySelectorAll('.tab-btn')[3].classList.add('active');
  document.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));
  document.getElementById('pane-quiz').classList.add('active');
  const rawQuestions = (typeof pvShuffle==='function' ? pvShuffle(p.q) : p.q.slice());
  const quiz = rawQuestions.map(item=>{
    if(item.opts){
      const indexed=item.opts.map((text,index)=>({text,index}));
      const shuffledOpts=typeof pvShuffle==='function'?pvShuffle(indexed):indexed;
      return {q:item.s,opts:shuffledOpts.map(o=>o.text),ans:shuffledOpts.findIndex(o=>o.index===item.ans),exp:item.exp};
    }
    return {q:item.s+' — which part has the error?',opts:['A','B','C','D'],ans:['A','B','C','D'].indexOf(item.ans),exp:item.exp};
  });
  currentTopic={id:p.id,title:p.title};
  renderQuizPane(p.id, quiz);
  lastListView='practice';
  switchView('topic');
}
function renderReadingGrid(){
  const grid=document.getElementById('readingGrid'); if(!grid)return; grid.innerHTML='';
  READING.forEach(r=>{
    const div=document.createElement('div'); div.className='card topic-card';
    div.innerHTML=`<div class="icon">${r.icon}</div><h3>${r.title}</h3><p>Comprehension passage with analytical questions.</p>
      <div class="topic-meta"><span>⏱ ${r.time}</span><span>${r.q.length} questions</span></div>`;
    div.onclick=()=>openReading(r);
    grid.appendChild(div);
  });
}
function openReading(r){
  document.getElementById('topicEyebrow').textContent='Reading Comprehension';
  document.getElementById('topicTitle').textContent=r.title;
  document.getElementById('topicStamp').style.display='none';
  document.querySelectorAll('.tab-btn').forEach(b=>b.style.display='none');
  document.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));
  document.getElementById('pane-learn').classList.add('active');
  document.getElementById('pane-learn').innerHTML = `<div class="explain-block"><p>${r.passage}</p></div>
    <div id="rcQuizHolder"></div>`;
  currentTopic={id:r.id,title:r.title};
  const holder=document.getElementById('rcQuizHolder');
  const origPane = document.getElementById('pane-quiz');
  origPane.id='pane-quiz'; // keep
  holder.appendChild(Object.assign(document.createElement('div'),{}));
  setTimeout(()=>renderQuizPane(r.id, r.q.map(q=>({q:q.s,opts:q.opts,ans:q.ans,exp:q.exp}))),0);
  document.getElementById('pane-quiz').style.display='block';
  document.getElementById('pane-quiz').classList.add('active');
  lastListView='reading';
  switchView('topic');
}
function renderTestsGrid(){
  const grid=document.getElementById('testsGrid'); if(!grid)return; grid.innerHTML='';
  TESTS.forEach(t=>{
    const div=document.createElement('div'); div.className='card topic-card';
    div.innerHTML=`<div class="icon">${t.icon}</div><h3>${t.title}</h3><p>${t.desc}</p>
      <div class="topic-meta"><span>${t.n} questions</span><span>Start ›</span></div>`;
    div.onclick=()=>{
      document.getElementById('topicEyebrow').textContent='Test';
      document.getElementById('topicTitle').textContent=t.title;
      document.getElementById('topicStamp').style.display='none';
      document.querySelectorAll('.tab-btn').forEach(b=>b.style.display = b.dataset.tab==='quiz'?'block':'none');
      document.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));
      document.getElementById('pane-quiz').classList.add('active');
      currentTopic={id:t.id,title:t.title};
      renderQuizPane(t.id, buildGenericQuiz(t.n));
      lastListView='tests';
      switchView('topic');
    };
    grid.appendChild(div);
  });
}

/* ============================================================
   DASHBOARD / TOPBAR
=============================================================*/
function refreshTopBar(){
  document.getElementById('xpNum').textContent = State.xp;
  document.getElementById('lvlNum').textContent = Math.floor(State.xp/100)+1;
  document.getElementById('streakNum').textContent = State.streak;
}
function logActivity(action,detail){
  State.activity = State.activity || [];
  State.activity.unshift({action,detail,t:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
  State.activity = State.activity.slice(0,8);
  saveState();
}
function renderProfileSnapshot(){
  const name=String(State.name||'Cadet').trim()||'Cadet';
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part.charAt(0).toUpperCase()).join('')||'C';
  const avatar=document.getElementById('vpProfileAvatar');if(avatar)avatar.textContent=initials;
  const completed=GRAMMAR.filter(g=>!!State.completedTopics[g.id]).length;
  const scores=Object.values(State.quizScores).map(Number).filter(n=>Number.isFinite(n)&&n>=0&&n<=100);
  const avg=scores.length?Math.round(scores.reduce((sum,n)=>sum+n,0)/scores.length):null;
  const level=Math.floor(State.xp/100)+1;
  const ranks=['Recruit','Cadet','Lance Naik','Naik','Havildar','Subedar','Lieutenant','Captain','Major','Colonel'];
  const rank=ranks[Math.min(level-1,ranks.length-1)];
  const rankEl=document.getElementById('vpProfileRank');if(rankEl)rankEl.textContent=rank;
  const host=document.getElementById('vpOverviewStats');
  if(host)host.innerHTML=[
    ['Total XP',String(State.xp||0),'✦'],['Current streak',(State.streak||0)+' days','🔥'],
    ['Grammar topics',completed+'/'+GRAMMAR.length,'📘'],['Average quiz score',avg==null?'—':avg+'%','◎']
  ].map(item=>'<div class="vp-overview-card"><span class="vp-overview-icon" aria-hidden="true">'+item[2]+'</span><span class="vp-overview-label">'+item[0]+'</span><strong>'+item[1]+'</strong></div>').join('');

  const order=SKILL_TIERS.flatMap(t=>t.ids).filter(id=>GRAMMAR.some(g=>g.id===id));
  const nextId=order.find(id=>!State.completedTopics[id]);
  const nextTopic=nextId?GRAMMAR.find(g=>g.id===nextId):null;
  const mission=document.getElementById('vpFocusMission');
  if(mission){
    if(nextTopic){
      mission.innerHTML='<div class="vp-focus-mission"><div class="vp-focus-icon" aria-hidden="true">'+(nextTopic.icon||'📘')+'</div><div><b>'+escapeHtmlVaani(nextTopic.title)+'</b><span>'+escapeHtmlVaani(nextTopic.desc||'Continue your Grammar journey one topic at a time.')+'</span></div></div><button type="button" class="btn vp-focus-action" onclick="openTopic(\''+String(nextTopic.id).replace(/'/g,"\\\\'")+'\')">Open next topic →</button>';
    }else{
      mission.innerHTML='<div class="vp-focus-mission"><div class="vp-focus-icon" aria-hidden="true">🏁</div><div><b>Grammar curriculum cleared</b><span>Revisit any topic to strengthen retention, or keep building vocabulary and comparisons.</span></div></div>';
    }
  }

  function familyAverage(ids){
    const values=ids.map(id=>State.quizScores[id]).map(Number).filter(n=>Number.isFinite(n)&&n>=0&&n<=100);
    return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
  }
  const grammarAvg=familyAverage(GRAMMAR.map(g=>g.id));
  const compareAvg=familyAverage(COMPARISONS.map(c=>'cmp-'+c.id));
  const practiceAvg=familyAverage(PRACTICE.map(p=>p.id));
  const readingAvg=familyAverage(READING.map(r=>r.id));
  const signals=[['Grammar',grammarAvg],['Comparisons',compareAvg],['Practice',practiceAvg],['Reading',readingAvg]];
  const signalHost=document.getElementById('vpSkillSignals');
  if(signalHost){
    signalHost.innerHTML=signals.map(([label,val])=>{
      const value=val==null?0:val;
      return '<div class="vp-skill-signal"><label>'+label+'</label><div class="bar"><span style="width:'+value+'%"></span></div><strong>'+ (val==null?'—':value+'%') +'</strong></div>';
    }).join('');
  }

  const feed=document.getElementById('vpActivityList');if(feed){
    const activity=Array.isArray(State.activity)?State.activity.filter(a=>a&&typeof a==='object').slice(0,6):[];
    feed.innerHTML=activity.length?activity.map(a=>'<div class="vp-activity-item"><span class="vp-activity-dot" aria-hidden="true"></span><span class="vp-activity-copy"><b>'+escapeHtmlVaani(a.action||'Learning activity')+'</b><span>'+escapeHtmlVaani(a.detail||'')+'</span></span><time>'+escapeHtmlVaani(a.t||'')+'</time></div>').join(''):'<div class="vp-activity-empty">No activity has been recorded yet. Complete a lesson or quiz to start your learning log.</div>';
  }

  const rhythm=document.getElementById('vpRhythmGrid');
  const rhythmNote=document.getElementById('vpRhythmNote');
  if(rhythm){
    rhythm.innerHTML='';
    const days=[];
    for(let i=13;i>=0;i--){
      const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);
      const xp=Math.max(0,Number(State.dailyActivity&&State.dailyActivity[d.toDateString()])||0);
      days.push({date:d,xp});
      let level=0;if(xp>0)level=1;if(xp>=10)level=2;if(xp>=25)level=3;if(xp>=50)level=4;
      const cell=document.createElement('span');cell.className='vp-rhythm-cell'+(level?' l'+level:'');cell.title=d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '+xp+' XP';rhythm.appendChild(cell);
    }
    if(rhythmNote){
      const active=days.filter(d=>d.xp>0).length,totalXp=days.reduce((sum,d)=>sum+d.xp,0);
      rhythmNote.innerHTML='<span>'+active+' active day'+(active===1?'':'s')+'</span><span>'+totalXp+' XP in 14 days</span>';
    }
  }
}
function renderDashboardMissions(){
  const host=document.getElementById('missionList');
  if(!host)return;
  const missions=[
    {label:'Clear 1 grammar topic',done:Object.keys(State.completedTopics||{}).length>=1},
    {label:'Score 70%+ on any quiz',done:Object.values(State.quizScores||{}).some(s=>Number(s)>=70)},
    {label:'Learn the word of the day',done:!!(State.vocabLearned||{})[new Date().toDateString()]}
  ];
  host.innerHTML=missions.map(m=>'<div class="mastery-row"><span style="width:auto;flex:1;color:'+(m.done?'var(--green)':'var(--muted)')+'">'+(m.done?'✓':'▫')+' '+m.label+'</span></div>').join('');
}
function refreshDashboard(){
  renderProfileSnapshot();
  document.getElementById('dashName').textContent = State.name;
  document.getElementById('profName').textContent = State.name+"'s Service File";
  countUp('statXP', State.xp);
  countUp('statStreak', State.streak);
  const cleared = Object.keys(State.completedTopics).length;
  document.getElementById('statTopics').textContent = cleared+'/'+GRAMMAR.length;
  const scores = Object.values(State.quizScores);
  const avgAcc = scores.length? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  countUp('statAcc', avgAcc, '%');
  setRing('ringXP', Math.min(100, Math.round((State.xp%500)/5)));
  setRing('ringStreak', Math.min(100, State.streak*10));
  setRing('ringTopics', Math.round((cleared/GRAMMAR.length)*100));
  setRing('ringAcc', avgAcc);

  document.getElementById('mGrammar').style.width = Math.round((cleared/GRAMMAR.length)*100)+'%';
  const vocabLearnedDays = Object.keys(State.vocabLearned).length;
  const pGrammar = Math.round((cleared/GRAMMAR.length)*100);
  const pVocab = Math.min(100, vocabLearnedDays*8);
  document.getElementById('mVocab').style.width = pVocab+'%';
  const practiceDone = Object.keys(State.quizScores).filter(k=>PRACTICE.some(p=>p.id===k)).length;
  const pPractice = Math.min(100, practiceDone*20);
  document.getElementById('mPractice').style.width = pPractice+'%';
  const readingDone = Object.keys(State.quizScores).filter(k=>READING.some(r=>r.id===k)).length;
  const pReading = Math.min(100, readingDone*50);
  document.getElementById('mReading').style.width = pReading+'%';
  renderRadarChart([pGrammar,pVocab,pPractice,pReading]);

  // heatmap — real daily XP activity, not simulated
  const heat = document.getElementById('heatmap'); heat.innerHTML='';
  const today0 = new Date();
  for(let i=59;i>=0;i--){
    const d=new Date(today0); d.setDate(d.getDate()-i);
    const key=d.toDateString();
    const xpDay = (State.dailyActivity && State.dailyActivity[key]) || 0;
    const c=document.createElement('div'); c.className='heat-cell';
    let lvl=0;
    if(xpDay>=40) lvl=4; else if(xpDay>=20) lvl=3; else if(xpDay>=8) lvl=2; else if(xpDay>0) lvl=1;
    if(lvl) c.classList.add('heat-lvl'+lvl);
    c.title = d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + (xpDay?` — ${xpDay} XP`:' — no activity');
    heat.appendChild(c);
  }
  // activity
  const feed=document.getElementById('activityFeed');
  const activityItems = Array.isArray(State.activity) ? State.activity.filter(a=>a && typeof a==='object') : [];
  if(feed && activityItems.length){
    feed.innerHTML = activityItems.slice(0,50).map(a=>`<div class="activity-item"><span><b>${escapeHtmlVaani(a.action || 'Activity')}</b> — ${escapeHtmlVaani(a.detail || '')}</span><span>${escapeHtmlVaani(a.t || '')}</span></div>`).join('');
  }
  // missions
  const missions=[
    {id:'m1',label:'Clear 1 grammar topic',target:1,get:()=>Object.keys(State.completedTopics).length},
    {id:'m2',label:'Score 70%+ on any quiz',target:1,get:()=>Object.values(State.quizScores).some(s=>s>=70)?1:0},
    {id:'m3',label:'Learn the word of the day',target:1,get:()=>State.vocabLearned[new Date().toDateString()]?1:0},
  ];
  document.getElementById('missionList').innerHTML = missions.map(m=>{
    const done = m.get()>=m.target;
    return `<div class="mastery-row"><span style="width:auto;flex:1;color:${done?'var(--green)':'var(--muted)'}">${done?'✅':'▫️'} ${m.label}</span></div>`;
  }).join('');

  // rank
  const lvl = Math.floor(State.xp/100)+1;
  const ranks=['Recruit','Cadet','Lance Naik','Naik','Havildar','Subedar','Lieutenant','Captain','Major','Colonel'];
  const rankName = ranks[Math.min(lvl-1, ranks.length-1)];
  document.getElementById('rankTitle').textContent = rankName;
  const rankBadge = document.getElementById('rankBadge');
  if(rankBadge){
    rankBadge.setAttribute('data-rank-level', Math.min(lvl, ranks.length));
    const chevronCount = Math.min(5, Math.ceil(Math.min(lvl, ranks.length)/2));
    const chevronsHost = document.getElementById('vpChevrons');
    if(chevronsHost){
      chevronsHost.innerHTML = Array.from({length:chevronCount}).map((_,i)=>{
        const y = 68 - i*11;
        return `<path d="M32,${y} L50,${y-9} L68,${y}" class="vp-chevron"/>`;
      }).join('');
    }
  }
  const maxRankReached=lvl>=ranks.length;
  const within=maxRankReached?100:State.xp%100;
  document.getElementById('rankBar').style.width=within+'%';
  document.getElementById('rankXPText').textContent=maxRankReached?'Maximum rank achieved':within+' / 100 XP to next rank';

  // progress tree — every topic, not just the first 10 (was GRAMMAR.slice(0,10),
  // silently hiding 24 of 34 with no indication more existed)
  const tree=document.getElementById('progTree'); tree.innerHTML='';
  GRAMMAR.forEach(g=>{
    const done = !!State.completedTopics[g.id];
    const n=document.createElement('div'); n.className='prog-node'+(done?' done':'');
    n.innerHTML=`<b>${g.title}</b><span>${done?'Cleared':'Pending'}</span>`;
    tree.appendChild(n);
  });

  renderBadges();
  renderMysteryBox();
  renderReviewWidget();
  renderFocusSprint();
  refreshHomeV2();
}
/* ---- Focus Sprint: a local, timed study session with capped XP ---- */
let focusSprint = {minutes:15,remaining:900,running:false,endsAt:0,interval:null,task:'Grammar'};
function focusDayKey(){return new Date().toDateString();}
function focusFmt(seconds){const n=Math.max(0,Math.ceil(seconds));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function focusSetDuration(minutes){
  if(focusSprint.running)return;
  focusSprint.minutes=minutes;focusSprint.remaining=minutes*60;
  renderFocusSprint();
}
function focusSetTask(task){
  if(focusSprint.running)return;
  focusSprint.task=task;renderFocusSprint();
}
function focusStopTicker(){if(focusSprint.interval){clearInterval(focusSprint.interval);focusSprint.interval=null;}}
function focusTick(){
  focusSprint.remaining=Math.max(0,Math.ceil((focusSprint.endsAt-Date.now())/1000));
  const timer=document.getElementById('focusSprintTimer');
  const bar=document.getElementById('focusSprintProgress');
  const status=document.getElementById('focusSprintStatus');
  if(timer)timer.textContent=focusFmt(focusSprint.remaining);
  if(bar)bar.style.width=(100*(1-focusSprint.remaining/(focusSprint.minutes*60)))+'%';
  if(!focusSprint.remaining){
    focusStopTicker();focusSprint.running=false;
    const day=focusDayKey();const done=Number(State.focusSessions[day]||0)+1;State.focusSessions[day]=done;saveState();
    if(done<=3)addXP(5,'Focus Sprint completed');
    else{refreshDashboard();toast('Focus Sprint complete — daily XP limit reached.');}
    focusSprint.remaining=focusSprint.minutes*60;
    const freshStatus=document.getElementById('focusSprintStatus');
    if(freshStatus)freshStatus.textContent=done<=3?'Sprint complete. Take a short break before the next one.':'Sprint complete. You have reached today’s 3-session XP limit.';
    const btn=document.getElementById('focusSprintToggle');if(btn){btn.textContent='Start another sprint';btn.disabled=false;}
    const progress=document.getElementById('focusSprintProgress');if(progress)progress.style.width='0%';
    const timerEl=document.getElementById('focusSprintTimer');if(timerEl)timerEl.textContent=focusFmt(focusSprint.remaining);
    return;
  }
}
function focusToggleSprint(){
  if(focusSprint.running){
    focusSprint.remaining=Math.max(0,Math.ceil((focusSprint.endsAt-Date.now())/1000));focusStopTicker();focusSprint.running=false;
    const b=document.getElementById('focusSprintToggle');if(b)b.textContent='Resume sprint';
    const s=document.getElementById('focusSprintStatus');if(s)s.textContent='Paused — resume whenever you are ready.';
    focusTick();return;
  }
  focusSprint.running=true;focusSprint.endsAt=Date.now()+focusSprint.remaining*1000;
  const b=document.getElementById('focusSprintToggle');if(b)b.textContent='Pause sprint';
  const s=document.getElementById('focusSprintStatus');if(s)s.textContent='Stay focused. Your sprint is in progress.';
  focusSprint.interval=setInterval(focusTick,250);focusTick();
}
function focusResetSprint(){
  focusStopTicker();focusSprint.running=false;focusSprint.remaining=focusSprint.minutes*60;renderFocusSprint();
}
function renderFocusSprint(){
  const host=document.getElementById('focusSprintWidget');if(!host)return;
  const today=Number(State.focusSessions[focusDayKey()]||0);
  const tasks=['Grammar','Vocabulary','PYQ practice','Reading','Comparisons'];
  const pct=focusSprint.running?100*(1-focusSprint.remaining/(focusSprint.minutes*60)):0;
  host.innerHTML='<div class="vd-focus-head"><div><span class="vd-focus-kicker">DEEP WORK · LOCAL TIMER</span><h2>Focus Sprint</h2><p>Choose a task, set a short target and work without distractions.</p></div><div class="vd-focus-count"><strong>'+today+'</strong><span>completed today</span></div></div>'+
    '<div class="vd-focus-body"><div class="vd-focus-controls"><label for="focusSprintTask">What are you working on?</label><select id="focusSprintTask" onchange="focusSetTask(this.value)" '+(focusSprint.running?'disabled':'')+'>'+tasks.map(t=>'<option value="'+t+'" '+(focusSprint.task===t?'selected':'')+'>'+t+'</option>').join('')+'</select>'+
    '<div class="vd-focus-presets" aria-label="Sprint duration">'+[5,15,25,45].map(n=>'<button type="button" class="vd-focus-preset '+(focusSprint.minutes===n?'active':'')+'" onclick="focusSetDuration('+n+')" '+(focusSprint.running?'disabled':'')+'>'+n+' min</button>').join('')+'</div></div>'+
    '<div class="vd-focus-clock"><div class="vd-focus-time" id="focusSprintTimer">'+focusFmt(focusSprint.remaining)+'</div><div class="vd-focus-progress"><span id="focusSprintProgress" style="width:'+pct+'%"></span></div><p id="focusSprintStatus" aria-live="polite">'+(focusSprint.running?'Stay focused. Your sprint is in progress.':'Your timer starts when you begin.')+'</p>'+
    '<div class="vd-focus-actions"><button type="button" class="btn" id="focusSprintToggle" onclick="focusToggleSprint()">'+(focusSprint.running?'Pause sprint':'Start sprint')+'</button><button type="button" class="btn ghost" onclick="focusResetSprint()">Reset</button></div></div></div>'+
    '<div class="vd-focus-foot">Complete a sprint to earn 5 XP · Maximum 3 rewarded sprints per day.</div>';
}
function checkBadges(){ refreshDashboard(); }

/* ---- Mistake Notebook: dashboard widget + review session UI ---- */
function relativeDueText(iso){
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.round(diffMs/86400000);
  if(days<=0) return 'today';
  if(days===1) return 'tomorrow';
  return 'in '+days+' days';
}
function renderReviewWidget(){
  const body = document.getElementById('reviewWidgetBody');
  const card = document.getElementById('reviewWidgetCard');
  if(!body) return;
  const queue = ensureReviewQueue();
  const due = reviewDueItems();
  card.classList.toggle('review-due-glow', due.length>0);
  if(!queue.length){
    body.innerHTML = `<p class="review-empty">Nothing here yet — missed vocabulary, grammar, and PYQ items will land here for spaced review, so mistakes turn into the thing you know best.</p>`;
    return;
  }
  if(!due.length){
    const soonest = reviewSoonestDue();
    body.innerHTML = `<p class="review-empty">All caught up. ${queue.length} item${queue.length===1?'':'s'} in your notebook — next one due ${soonest?relativeDueText(soonest.nextReview):'soon'}.</p>`;
    return;
  }
  const dueVocab = due.filter(x=>x.kind==='vocab').length;
  const duePyq = due.filter(x=>x.kind==='pyq').length;
  const dueGrammar = due.filter(x=>x.kind==='grammar').length;
  body.innerHTML = `
    <div class="review-due-row">
      <div class="review-due-count" id="reviewDueCount">0</div>
      <div class="review-due-text">due for review right now<br><span class="review-due-breakdown">${dueVocab} vocab · ${dueGrammar} grammar · ${duePyq} PYQ</span></div>
      <button class="btn" onclick="openReviewSession()">Start Review →</button>
    </div>`;
  countUp('reviewDueCount', due.length);
}
let reviewSessionQueue = [], reviewSessionIdx = 0;
function openReviewSession(kindFilter){
  const due = reviewDueItems(kindFilter);
  if(!due.length){ toast('Nothing due for review right now.'); return; }
  reviewSessionQueue = due.slice(0,20).sort(()=>Math.random()-0.5);
  reviewSessionIdx = 0;
  document.getElementById('reviewOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
  renderReviewCard();
}
function closeReviewSession(){
  document.getElementById('reviewOverlay').classList.remove('show');
  document.body.style.overflow = '';
  renderReviewWidget();
}
function renderReviewCard(){
  const item = reviewSessionQueue[reviewSessionIdx];
  const cardEl = document.getElementById('reviewCard');
  cardEl.classList.remove('flipped');
  document.getElementById('reviewProgress').textContent = (reviewSessionIdx+1)+' / '+reviewSessionQueue.length;
  const front = document.getElementById('reviewFront');
  const back = document.getElementById('reviewBack');
  const actions = document.getElementById('reviewActions');
  if(item.kind==='vocab'){
    const v = VOCAB.find(x=>x.id===item.ref);
    if(!v){ reviewAdvance(); return; }
    front.innerHTML = `<div class="review-kind-tag">VOCAB</div><div class="review-word">${v.w}</div><div class="review-hint">Tap the card to reveal the meaning</div>`;
    back.innerHTML = `<div class="review-kind-tag">VOCAB</div><div class="review-word">${v.w}</div><div class="review-meaning">${v.meanEn||''}</div>`;
    front.onclick = back.onclick = ()=>cardEl.classList.toggle('flipped');
    actions.innerHTML = `
      <button class="btn ghost" onclick="reviewGradeVocab(false)">Still shaky</button>
      <button class="btn" onclick="reviewGradeVocab(true)">Got it ✓</button>`;
  } else if(item.kind==='grammar'){
    const adaptive=window.VaaniGrammarAcademy&&VaaniGrammarAcademy.getAdaptiveItems(State).find(entry=>entry.ref===item.ref);
    if(!adaptive){reviewAdvance();return;}
    const topic=adaptive.topic,q=adaptive.question;
    front.onclick=back.onclick=null;
    front.replaceChildren();
    const tag=document.createElement('div');tag.className='review-kind-tag';tag.textContent='GRAMMAR · '+topic.title;
    const prompt=document.createElement('div');prompt.className='review-q';prompt.textContent=q.prompt;
    const options=document.createElement('div');options.className='review-opts';
    q.options.forEach((option,index)=>{const button=document.createElement('button');button.type='button';button.className='opt-btn';button.textContent=String(option);button.addEventListener('click',()=>reviewAnswerGrammar(index));options.appendChild(button);});
    front.append(tag,prompt,options);
    back.replaceChildren();actions.replaceChildren();
  } else {
    const q = PYQ_BY_ID[item.ref];
    if(!q){ reviewAdvance(); return; }
    front.onclick = back.onclick = null;
    front.innerHTML = `<div class="review-kind-tag">PYQ · ${escapeHtmlVaani(q.sec||'')}</div>
      ${q.passage ? `<div class="pv-passage"><div class="pv-passage-label">Passage</div><div class="pv-passage-text">${escapeHtmlVaani(q.passage)}</div></div>` : ''}
      <div class="review-q">${q.q}</div>
      <div class="review-opts">${q.o.map((o,i)=>`<button class="opt-btn" onclick="reviewAnswerPyq(${i})">${o}</button>`).join('')}</div>`;
    back.innerHTML = '';
    actions.innerHTML = '';
  }
}
function reviewAnswerPyq(oi){
  const item = reviewSessionQueue[reviewSessionIdx];
  const q = PYQ_BY_ID[item.ref];
  const correct = oi === q.ans;
  const opts = document.querySelectorAll('#reviewFront .opt-btn');
  opts.forEach((b,i)=>{ b.disabled=true; if(i===q.ans) b.classList.add('correct'); else if(i===oi) b.classList.add('wrong'); });
  recordPyqAttempt(q._id, correct);
  setTimeout(reviewAdvance, 850);
}
function reviewAnswerGrammar(optionIndex){
  const item=reviewSessionQueue[reviewSessionIdx];
  const adaptive=window.VaaniGrammarAcademy&&VaaniGrammarAcademy.getAdaptiveItems(State).find(entry=>entry.ref===item.ref);
  if(!adaptive)return;
  const question=adaptive.question,correct=optionIndex===question.answer;
  const options=document.querySelectorAll('#reviewFront .opt-btn');
  options.forEach((button,index)=>{button.disabled=true;if(index===question.answer)button.classList.add('correct');else if(index===optionIndex)button.classList.add('wrong');});
  const feedback=document.createElement('p');feedback.className='quiz-feedback '+(correct?'is-correct':'is-wrong');
  feedback.textContent=(correct?'Correct. ':'Review this one. ')+(question.reasons[optionIndex]||question.explanation||'Check the lesson rule.');
  document.getElementById('reviewFront').appendChild(feedback);
  recordGrammarMastery(item.ref,correct);
  setTimeout(reviewAdvance,850);
}
function reviewGradeVocab(gotIt){
  const item = reviewSessionQueue[reviewSessionIdx];
  if(gotIt) reviewMarkRight('vocab', item.ref); else reviewMarkWrong('vocab', item.ref);
  reviewAdvance();
}
function reviewAdvance(){
  reviewSessionIdx++;
  if(reviewSessionIdx >= reviewSessionQueue.length){
    toast('Review session complete — nice work.');
    closeReviewSession();
    return;
  }
  renderReviewCard();
}
function escapeHtmlVaani(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ============================================================
   VAANI 2.0 — HOME REDESIGN DATA LAYER (uses existing GRAMMAR/SKILL_TIERS data only)
=============================================================*/
const QUOTES_OF_DAY = [
  {q:'Discipline is the bridge between goals and accomplishment.',a:'Jim Rohn'},
  {q:'The more you sweat in peace, the less you bleed in war.',a:'Military Proverb'},
  {q:'Success is the sum of small efforts repeated day in and day out.',a:'Robert Collier'},
  {q:'A soldier who won\u2019t read is only half prepared.',a:'Old Army Saying'},
  {q:'Amateurs practice until they get it right. Professionals practice until they can\u2019t get it wrong.',a:'Attributed'},
  {q:'Preparation is the invisible half of victory.',a:'Unknown'},
  {q:'Calm is a superpower — on the page and on the parade ground.',a:'Cadet Wisdom'}
];
function getContinueTopic(){
  const order = SKILL_TIERS.flatMap(t=>t.ids);
  for(const id of order){ if(!State.completedTopics[id]){ const g=GRAMMAR.find(x=>x.id===id); if(g) return g; } }
  return GRAMMAR.find(g=>!State.completedTopics[g.id]) || GRAMMAR[0];
}
function getRecommendedTopic(contId){
  const scored = Object.entries(State.quizScores).filter(([id])=>GRAMMAR.some(g=>g.id===id));
  if(scored.length){
    scored.sort((a,b)=>a[1]-b[1]);
    const g = GRAMMAR.find(x=>x.id===scored[0][0]);
    if(g && g.id!==contId) return {topic:g, reason:'Your lowest score so far was '+scored[0][1]+'% here — worth another pass.'};
  }
  const order = SKILL_TIERS.flatMap(t=>t.ids);
  const idx = order.indexOf(contId);
  for(let i=idx+1;i<order.length;i++){ const g=GRAMMAR.find(x=>x.id===order[i]); if(g) return {topic:g, reason:'Next up on your roadmap.'}; }
  return {topic:GRAMMAR[0], reason:'A solid place to start.'};
}
function jumpToContinue(){ const t=getContinueTopic(); if(t) openTopic(t.id); else switchView('grammar'); }
function refreshHomeV2(){
  const dEl=document.getElementById('heroDate');
  if(dEl) dEl.textContent = new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});

  const cont = getContinueTopic();
  if(cont){
    document.getElementById('continueIcon').textContent = cont.icon;
    document.getElementById('continueTitle').textContent = cont.title;
    document.getElementById('continueDesc').textContent = cont.desc;
    document.getElementById('continueBtn').onclick = ()=>openTopic(cont.id);
  }
  const rec = getRecommendedTopic(cont?cont.id:null);
  if(rec && rec.topic){
    document.getElementById('recommendIcon').textContent = rec.topic.icon;
    document.getElementById('recommendTitle').textContent = rec.topic.title;
    document.getElementById('recommendDesc').textContent = rec.reason;
    document.getElementById('recommendBtn').onclick = ()=>openTopic(rec.topic.id);
  }

  const todayKey = new Date().toDateString();
  const xpToday = (State.dailyActivity && State.dailyActivity[todayKey]) || 0;
  const goalTarget = 20;
  const pct = Math.min(100, Math.round((xpToday/goalTarget)*100));
  setRing('goalRingWrap', pct);
  const gtEl=document.getElementById('goalText');
  if(gtEl) gtEl.textContent = xpToday>=goalTarget ? 'Goal complete for today — well done, cadet.' : `Earn ${goalTarget} XP today. You're at ${xpToday}/${goalTarget}.`;

  const track=document.getElementById('roadmapTrack');
  if(track){
    track.innerHTML='';
    const order = SKILL_TIERS.flatMap(t=>t.ids);
    let currentSet=false;
    order.forEach(id=>{
      const g=GRAMMAR.find(x=>x.id===id); if(!g) return;
      const done = !!State.completedTopics[id];
      let cls='locked';
      if(done) cls='done'; else if(!currentSet){ cls='current'; currentSet=true; }
      const node=document.createElement('div'); node.className='rm-node '+cls;
      node.innerHTML=`<div class="rm-dot">${done?'✓':g.icon}</div><div class="rm-label">${g.title}</div>`;
      node.onclick=()=>openTopic(id);
      track.appendChild(node);
    });
  }

  const now=new Date();
  const quoteDay=Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(now.getFullYear(),0,1))/86400000);
  const qEl=document.getElementById('quoteText'),qaEl=document.getElementById('quoteAuthor');
  if(Array.isArray(QUOTES_OF_DAY)&&QUOTES_OF_DAY.length){
    const qi=((quoteDay%QUOTES_OF_DAY.length)+QUOTES_OF_DAY.length)%QUOTES_OF_DAY.length;
    if(qEl)qEl.textContent=QUOTES_OF_DAY[qi].q||'Keep showing up and keep learning.';
    if(qaEl)qaEl.textContent='— '+(QUOTES_OF_DAY[qi].a||'VAANI');
  }else{
    if(qEl)qEl.textContent='Keep showing up and keep learning.';
    if(qaEl)qaEl.textContent='— VAANI';
  }

  const lvl2 = Math.floor(State.xp/100)+1;
  const ranks2=['Recruit','Cadet','Lance Naik','Naik','Havildar','Subedar','Lieutenant','Captain','Major','Colonel'];
  const fr=document.getElementById('footerRank'); if(fr) fr.textContent = 'Rank: '+ranks2[Math.min(lvl2-1, ranks2.length-1)];
}

/* ---- Radar chart: real mastery data across 4 skill axes, no library ---- */
function renderRadarChart(values){
  const host = document.getElementById('radarChartWrap'); if(!host) return;
  const labels = ['Grammar','Vocab','Practice','Reading'];
  const cx=100, cy=100, R=76;
  const angleFor = i => (-90 + i*(360/4)) * Math.PI/180;
  const pointAt = (i, pct) => {
    const a = angleFor(i), r = (pct/100)*R;
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  };
  let grids='';
  [0.25,0.5,0.75,1].forEach(f=>{
    const pts = [0,1,2,3].map(i=>pointAt(i,100*f).join(',')).join(' ');
    grids += `<polygon class="radar-grid" points="${pts}"></polygon>`;
  });
  let axes='', labelsSvg='';
  [0,1,2,3].forEach(i=>{
    const [x,y] = pointAt(i,100);
    axes += `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"></line>`;
    const [lx,ly] = pointAt(i,120);
    labelsSvg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${labels[i]} ${Math.round(values[i])}%</text>`;
  });
  const shapePts = [0,1,2,3].map(i=>pointAt(i, Math.max(3,values[i])).join(',')).join(' ');
  const dots = [0,1,2,3].map(i=>{ const [x,y]=pointAt(i,Math.max(3,values[i])); return `<circle class="radar-dot" cx="${x}" cy="${y}" r="2.5"></circle>`; }).join('');
  host.innerHTML = `<svg class="radar-svg" viewBox="0 0 200 200" width="220" height="220">
    ${grids}${axes}
    <polygon class="radar-shape" points="${shapePts}"></polygon>${dots}
    ${labelsSvg}
  </svg>`;
}

/* ---- Mystery Box: real milestone-gated bonus reward (every 150 XP) ---- */
function mysteryMilestonesAvailable(){ return Math.floor(State.xp/150); }
function checkMysteryBox(){
  if(mysteryMilestonesAvailable() > (State.mysteryBoxesClaimed||0)) renderMysteryBox();
}
function renderMysteryBox(){
  const host = document.getElementById('mysteryBoxWrap'); if(!host) return;
  const avail = mysteryMilestonesAvailable();
  const claimed = State.mysteryBoxesClaimed||0;
  const isAvailable = avail > claimed;
  const nextThreshold = (claimed+1)*150;
  const into = State.xp - claimed*150;
  const pct = Math.min(100, Math.round((into/150)*100));
  host.innerHTML = `<div class="card mystery-box-card ${isAvailable?'available':'locked'}" id="mysteryBoxCard">
    <div class="mystery-box-icon">${isAvailable?'🎁':'🔒'}</div>
    <h4>${isAvailable?'Mystery Box Ready':'Mystery Box Locked'}</h4>
    <p>${isAvailable?'Tap to open — a surprise XP reward is waiting.':`Earn ${nextThreshold-State.xp} more XP to unlock (${State.xp}/${nextThreshold})`}</p>
    ${!isAvailable?`<div class="mb-progress"><div class="mb-progress-fill" style="width:${pct}%"></div></div>`:''}
  </div>`;
  if(isAvailable) document.getElementById('mysteryBoxCard').onclick = openMysteryBox;
}
function openMysteryBox(){
  if(mysteryMilestonesAvailable() <= (State.mysteryBoxesClaimed||0)) return;
  State.mysteryBoxesClaimed = (State.mysteryBoxesClaimed||0) + 1;
  const rewards = [15,20,25,30,40];
  const reward = rewards[Math.floor(Math.random()*rewards.length)];
  saveState();
  const card = document.getElementById('mysteryBoxCard');
  if(card){ card.classList.add('mystery-box-reveal'); card.innerHTML = `<div class="mystery-box-icon">✨</div><h4>+${reward} XP!</h4><p>Mystery box claimed, Cadet.</p>`; card.onclick=null; }
  launchConfettiIf(true);
  setTimeout(()=>{ addXP(reward,'Mystery Box'); },350);
}
const BADGES=[
  {id:'first-topic',icon:'🎖️',name:'First Blood',hint:'Clear your first grammar topic',check:()=>Object.keys(State.completedTopics).length>=1},
  {id:'five-topics',icon:'🏅',name:'Five Cleared',hint:'Clear 5 grammar topics',check:()=>Object.keys(State.completedTopics).length>=5},
  {id:'all-topics',icon:'👑',name:'Grammar Master',hint:'Clear every grammar topic',check:()=>Object.keys(State.completedTopics).length>=GRAMMAR.length},
  {id:'streak3',icon:'🔥',name:'3-Day Streak',hint:'Maintain a 3-day streak',check:()=>State.streak>=3},
  {id:'streak7',icon:'⚡',name:'7-Day Streak',hint:'Maintain a 7-day streak',check:()=>State.streak>=7},
  {id:'xp100',icon:'⭐',name:'100 XP',hint:'Earn 100 XP total',check:()=>State.xp>=100},
  {id:'xp500',icon:'🌟',name:'500 XP',hint:'Earn 500 XP total',check:()=>State.xp>=500},
  {id:'perfect',icon:'💯',name:'Perfect Score',hint:'Score 100% on any quiz',check:()=>Object.values(State.quizScores).some(s=>s===100)},
];
function renderBadges(){
  const targets=['badgeGrid','dashBadgeGrid','profileBadgeGrid'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!targets.length) return;
  targets.forEach(grid=>{
    grid.innerHTML='';
    BADGES.forEach(b=>{
      const earned=b.check();
      const div=document.createElement('div'); div.className='badge'+(earned?' earned':'');
      div.innerHTML=`<div class="bicon">${b.icon}</div><div class="bname">${b.name}</div>`;
      grid.appendChild(div);
    });
  });
}

/* ============================================================
   PHASE 7: SERVICE RECORD (personal bests + real rank + earned citations)
=============================================================*/
let serviceBadgeFilter='all';
function renderLeaderboard(){
  const pbHost=document.getElementById('personalBestsWrap');
  const rankHost=document.getElementById('rankObjectiveWrap');
  const logHost=document.getElementById('fieldLogWrap');
  if(!pbHost||!rankHost||!logHost)return;
  const pb=State.personalBests||{};
  const completed=GRAMMAR.filter(g=>!!State.completedTopics[g.id]).length;
  const scoreValues=Object.values(State.quizScores).map(Number).filter(n=>Number.isFinite(n)&&n>=0&&n<=100);
  const average=scoreValues.length?Math.round(scoreValues.reduce((sum,n)=>sum+n,0)/scoreValues.length):null;
  const metrics=document.getElementById('serviceMetrics');
  if(metrics){
    const data=[
      {label:'Total XP',value:String(State.xp||0),hint:'Lifetime earned'},
      {label:'Current streak',value:String(State.streak||0),hint:'Consecutive days'},
      {label:'Topics cleared',value:completed+'/'+GRAMMAR.length,hint:'Grammar curriculum'},
      {label:'Quiz average',value:average==null?'—':average+'%',hint:scoreValues.length+' recorded scores'}
    ];
    metrics.innerHTML=data.map(item=>'<div class="service-metric"><span>'+item.label+'</span><strong>'+item.value+'</strong><small>'+item.hint+'</small></div>').join('');
  }
  const rows=[
    {label:'Best Combo',value:pb.bestCombo?'×'+pb.bestCombo:'—'},
    {label:'Longest Streak',value:pb.longestStreak?pb.longestStreak+' days':'—'},
    {label:'Highest Quiz Score',value:pb.highestQuizScore!=null?pb.highestQuizScore+'%':'—'},
    {label:'Fastest Quiz Clear',value:pb.fastestQuizSeconds!=null?pb.fastestQuizSeconds+'s · '+(pb.fastestQuizLabel||'Quiz'):'—'},
    {label:'Quizzes Attempted',value:pb.totalQuizzesTaken||0}
  ];
  pbHost.innerHTML=rows.map(r=>'<div class="service-record-row"><span>'+r.label+'</span><b>'+r.value+'</b></div>').join('');

  const ranks=['Recruit','Cadet','Lance Naik','Naik','Havildar','Subedar','Lieutenant','Captain','Major','Colonel'];
  const lvl=Math.floor((State.xp||0)/100)+1;
  const rankName=ranks[Math.min(lvl-1,ranks.length-1)];
  const nextRankName=ranks[Math.min(lvl,ranks.length-1)];
  const within=(State.xp||0)%100;
  const nextObjective=BADGES.find(b=>!b.check());
  rankHost.innerHTML=
    '<div class="service-rank-display"><div class="service-rank-kicker">CURRENT RANK</div><div class="service-rank-name">'+rankName+'</div>'+
    '<div class="service-rank-track" role="progressbar" aria-label="Progress toward next rank" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+within+'"><span style="width:'+within+'%"></span></div>'+
    '<div class="service-rank-copy">'+within+' / 100 XP toward <b>'+nextRankName+'</b></div></div>'+
    (nextObjective?'<div class="service-objective"><span class="service-objective-icon" aria-hidden="true">'+nextObjective.icon+'</span><span><b>Next objective · '+escapeHtmlVaani(nextObjective.name)+'</b><small>'+escapeHtmlVaani(nextObjective.hint)+'</small></span></div>':
    '<div class="service-objective"><span class="service-objective-icon" aria-hidden="true">🏆</span><span><b>All citations earned</b><small>Every current milestone is complete.</small></span></div>');

  const serviceSignals=document.getElementById('serviceSkillSignals');
  const serviceGoals=document.getElementById('serviceGoalList');
  function serviceAverage(ids){
    const vals=ids.map(id=>State.quizScores[id]).map(Number).filter(n=>Number.isFinite(n)&&n>=0&&n<=100);
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  }
  if(serviceSignals){
    const signals=[
      ['Grammar',serviceAverage(GRAMMAR.map(g=>g.id))],
      ['Comparisons',serviceAverage(COMPARISONS.map(c=>'cmp-'+c.id))],
      ['Practice',serviceAverage(PRACTICE.map(p=>p.id))],
      ['Reading',serviceAverage(READING.map(r=>r.id))]
    ];
    serviceSignals.innerHTML=signals.map(([label,value])=>{
      const pct=value==null?0:value;
      return '<div class="service-signal-row"><label>'+label+'</label><div class="service-signal-bar"><span style="width:'+pct+'%"></span></div><strong>'+ (value==null?'—':pct+'%') +'</strong></div>';
    }).join('');
  }
  if(serviceGoals){
    const goals=[];
    const nextTopic=SKILL_TIERS.flatMap(t=>t.ids).map(id=>GRAMMAR.find(g=>g.id===id)).find(g=>g&&!State.completedTopics[g.id]);
    if(nextTopic)goals.push({icon:nextTopic.icon||'📘',title:'Clear '+nextTopic.title,detail:'Next topic in your Grammar progression.'});
    if((State.streak||0)<7)goals.push({icon:'🔥',title:'Build a 7-day streak',detail:(State.streak||0)+' consecutive day'+((State.streak||0)===1?'':'s')+' recorded so far.'});
    const highest=pb.highestQuizScore==null?null:Number(pb.highestQuizScore);
    if(highest==null||highest<70)goals.push({icon:'🎯',title:'Record a 70%+ quiz',detail:highest==null?'No quiz high score recorded yet.':'Current best: '+highest+'%.'});
    if((State.xp||0)<100)goals.push({icon:'✦',title:'Reach 100 XP',detail:Math.max(0,100-(State.xp||0))+' XP remaining to the next level.'});
    if(!goals.length)goals.push({icon:'🏅',title:'Maintain the standard',detail:'Your current baseline is established. Keep practising consistently.'});
    serviceGoals.innerHTML=goals.slice(0,4).map(g=>'<div class="service-goal-item"><i aria-hidden="true">'+g.icon+'</i><span><b>'+escapeHtmlVaani(g.title)+'</b><small>'+escapeHtmlVaani(g.detail)+'</small></span></div>').join('');
  }

  const weekHost=document.getElementById('serviceWeekWrap');
  if(weekHost){
    const days=[];
    for(let i=6;i>=0;i--){
      const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-i);
      const key=date.toDateString();
      const xp=Math.max(0,Number(State.dailyActivity&&State.dailyActivity[key])||0);
      days.push({label:date.toLocaleDateString(undefined,{weekday:'short'}),date:date.toLocaleDateString(undefined,{month:'short',day:'numeric'}),xp:xp,today:i===0});
    }
    const max=Math.max(1,...days.map(d=>d.xp));
    weekHost.innerHTML='<div class="service-week-bars">'+days.map(d=>'<div class="service-week-day'+(d.today?' today':'')+'" title="'+d.date+': '+d.xp+' XP"><div class="service-week-track"><span style="height:'+Math.max(d.xp?6:2,Math.round(d.xp/max*100))+'%"></span></div><b>'+d.xp+'</b><small>'+d.label+'</small></div>').join('')+'</div>'+
      '<div class="service-week-note">'+days.filter(d=>d.xp>0).length+' active day'+(days.filter(d=>d.xp>0).length===1?'':'s')+' · '+days.reduce((sum,d)=>sum+d.xp,0)+' XP in the last 7 days</div>';
  }

  const filters=document.getElementById('fieldLogFilters');
  if(filters&&filters.dataset.bound!=='1'){
    filters.dataset.bound='1';
    filters.addEventListener('click',event=>{
      const button=event.target.closest('[data-filter]');
      if(!button||!filters.contains(button))return;
      serviceBadgeFilter=button.dataset.filter||'all';
      filters.querySelectorAll('[data-filter]').forEach(el=>{
        const active=el===button;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));
      });
      renderLeaderboard();
    });
  }
  const badgeRows=BADGES.map(b=>({badge:b,earned:!!b.check()})).filter(row=>
    serviceBadgeFilter==='all'||(serviceBadgeFilter==='earned'?row.earned:!row.earned)
  );
  logHost.innerHTML=badgeRows.map(({badge:b,earned})=>
    '<div class="service-citation'+(earned?' earned':' locked')+'"><span class="service-citation-icon" aria-hidden="true">'+b.icon+'</span>'+
    '<span class="service-citation-copy"><b>'+escapeHtmlVaani(b.name)+'</b><small>'+escapeHtmlVaani(b.hint)+'</small></span>'+
    '<span class="service-citation-status">'+(earned?'EARNED':'LOCKED')+'</span></div>'
  ).join('')||'<div class="service-week-note">No citations in this view.</div>';
}
/* ============================================================
   MATCH GAME
=============================================================*/
let matchState={first:null,lock:false};
function initMatchGame(){
  const pairs = VOCAB.slice(0,4);
  let tiles=[];
  pairs.forEach((p,i)=>{ tiles.push({id:'w'+i,text:p.w,pair:i}); tiles.push({id:'s'+i,text:p.syn[0],pair:i}); });
  for(let i=tiles.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
  const grid=document.getElementById('matchGrid'); grid.innerHTML='';
  matchState={first:null,lock:false};
  tiles.forEach(t=>{
    const div=document.createElement('div'); div.className='match-tile'; div.textContent=t.text; div.dataset.pair=t.pair;
    div.onclick=()=>handleMatchClick(div);
    grid.appendChild(div);
  });
}
function handleMatchClick(div){
  if(matchState.lock || div.classList.contains('matched') || div.classList.contains('flipped')) return;
  div.classList.add('flipped');
  if(!matchState.first){ matchState.first=div; return; }
  matchState.lock=true;
  const a=matchState.first, b=div;
  if(a.dataset.pair===b.dataset.pair){
    a.classList.add('matched'); b.classList.add('matched');
    matchState.first=null; matchState.lock=false;
    const allMatched = [...document.querySelectorAll('.match-tile')].every(t=>t.classList.contains('matched'));
    if(allMatched){ addXP(20,'Match game cleared'); launchConfettiIf(true); }
  } else {
    setTimeout(()=>{a.classList.remove('flipped'); b.classList.remove('flipped'); matchState.first=null; matchState.lock=false;},700);
  }
}

/* ============================================================
   CONFETTI
=============================================================*/
function launchConfettiIf(cond){ if(cond) launchConfetti(); }
function launchConfetti(){
  const canvas=document.getElementById('confetti-canvas'); const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const colors=['#c9a24b','#49d186','#5b9bd8','#e2575a','#fff'];
  let pieces=Array.from({length:120},()=>({x:Math.random()*canvas.width,y:-20,r:Math.random()*6+4,c:colors[Math.floor(Math.random()*colors.length)],
    vy:Math.random()*3+2,vx:Math.random()*2-1,rot:Math.random()*360}));
  let frame=0;
  function draw(){
    frame++;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{
      p.y+=p.vy; p.x+=p.vx; p.rot+=5;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r); ctx.restore();
    });
    if(frame<140) requestAnimationFrame(draw); else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

async function resetProgress(){
  if(!confirm('Reset all progress? This cannot be undone.'))return;
  if(typeof ACTIVE_CODE==='undefined'||!ACTIVE_CODE){toast('Sign in before resetting account progress.');return;}
  const previous=JSON.stringify(State),name=State.name,theme=State.theme;
  resetStateForAccount();
  State.name=name;State.theme=theme;
  document.body.setAttribute('data-theme',theme);
  try{
    if(!await persistCombinedAccount())throw new Error('Account progress save failed');
  }catch(err){
    resetStateForAccount();Object.assign(State,JSON.parse(previous));normalizeState();
    document.body.setAttribute('data-theme',State.theme);
    toast('Progress could not be reset because the account record could not be saved.');
    return;
  }
  location.reload();
}

/* ============================================================
   INIT
=============================================================*/
function refreshAll(){
  normalizeState();
  safeCall(()=>{
    document.body.setAttribute('data-theme', State.theme);
    const tb0=document.getElementById('themeBtn'); if(tb0) tb0.textContent = State.theme==='dark'?'☀️':'🌙';
  }, 'themeSync');
  // Each call below is isolated: if one throws, every subsequent call still runs.
  // renderGrammarTree in particular must never be skipped just because an earlier,
  // unrelated render function failed.
  safeCall(()=>refreshTopBar(), 'refreshTopBar');
  safeCall(()=>renderGrammarTree(), 'renderGrammarTree');
  safeCall(()=>{
    const vj = document.getElementById('view-journey');
    if(vj && vj.classList.contains('active')) renderGrammarJourney();
  }, 'renderGrammarJourney');
  safeCall(()=>renderCompareGrid(), 'renderCompareGrid');
  safeCall(()=>renderVocabGrid(), 'renderVocabGrid');
  safeCall(()=>renderWOD(), 'renderWOD');
  safeCall(()=>renderDailySetTabs(), 'renderDailySetTabs');
  safeCall(()=>renderDailySingles(), 'renderDailySingles');
  safeCall(()=>renderConfuseTable(), 'renderConfuseTable');
  safeCall(()=>renderPracticeGrid(), 'renderPracticeGrid');
  safeCall(()=>renderReadingGrid(), 'renderReadingGrid');
  safeCall(()=>renderTestsGrid(), 'renderTestsGrid');
  safeCall(()=>initMatchGame(), 'initMatchGame');
  safeCall(()=>refreshDashboard(), 'refreshDashboard');
  // Recover hero, mission and roadmap independently if a secondary dashboard widget fails.
  safeCall(()=>refreshHomeV2(), 'refreshHomeV2(recovery)');
  safeCall(()=>renderDashboardMissions(), 'renderDashboardMissions(recovery)');
  safeCall(()=>refreshDashboardPyqCard(), 'refreshDashboardPyqCard');
  safeCall(()=>renderLeaderboard(), 'renderLeaderboard');
  safeCall(()=>updateSpinState(), 'updateSpinState');
  safeCall(()=>{
    const stw = document.getElementById('skillTreeWrap');
    if(stw && stw.style.display!=='none') renderSkillTree();
  }, 'renderSkillTree');
  setTimeout(()=>safeCall(()=>initMagnetic(),'initMagnetic'), 60);
}
/* ============================================================
   COMPARISONS — render + quiz logic
=============================================================*/
let compareGroup='all';
function compareGroupOf(c){
  if(c.group)return c.group;
  if(c.id==='who-whom')return 'Grammar';
  if(c.id==='its-its-apostrophe')return 'Spelling';
  return 'Word choice';
}
function renderCompareGrid(){
  const grid=document.getElementById('compareGrid');if(!grid)return;
  const search=document.getElementById('compareSearch');
  const term=String(search&&search.value||'').trim().toLocaleLowerCase();
  const groups=Array.from(new Set(COMPARISONS.map(compareGroupOf))).sort((a,b)=>a.localeCompare(b));
  const filters=document.getElementById('compareFilters');
  if(filters){
    filters.innerHTML='';
    [['all','All pairs']].concat(groups.map(group=>[group,group])).forEach(([value,label])=>{
      const button=document.createElement('button');button.type='button';
      button.className='cmp-filter'+(compareGroup===value?' active':'');
      button.dataset.group=value;button.setAttribute('aria-pressed',String(compareGroup===value));
      button.textContent=label+(value==='all'?' ('+COMPARISONS.length+')':' ('+COMPARISONS.filter(c=>compareGroupOf(c)===value).length+')');
      button.addEventListener('click',()=>{compareGroup=value;renderCompareGrid();});
      filters.appendChild(button);
    });
  }
  const list=COMPARISONS.filter(c=>{
    const searchable=[c.a,c.b,c.tagline,c.meanA,c.meanB,c.rule,compareGroupOf(c)].join(' ').replace(/<[^>]*>/g,' ').toLocaleLowerCase();
    return (compareGroup==='all'||compareGroupOf(c)===compareGroup)&&(!term||searchable.includes(term));
  });
  const counter=document.getElementById('compareResultCount');
  if(counter)counter.textContent=list.length+' of '+COMPARISONS.length+' pairs';
  const total=document.getElementById('compareTotal');if(total)total.textContent=COMPARISONS.length;
  const practised=document.getElementById('comparePractised');
  if(practised)practised.textContent=COMPARISONS.filter(c=>State.quizScores['cmp-'+c.id]!=null).length;
  grid.innerHTML='';
  if(!list.length){const empty=document.createElement('div');empty.className='cmp-empty';empty.textContent='No pairs match this search and category. Try another word or choose All pairs.';grid.appendChild(empty);return;}
  list.forEach(c=>{
    const score=State.quizScores['cmp-'+c.id];
    const done=score!==undefined;
    const button=document.createElement('button');button.type='button';button.className='card cmp-card';
    button.setAttribute('aria-label','Study '+c.a+' versus '+c.b+(done?'. Last drill score '+score+' percent.':'. Not yet practised.'));
    const meta=document.createElement('span');meta.className='cmp-card-top';
    const category=document.createElement('span');category.className='cmp-card-category';category.textContent=compareGroupOf(c);
    const priority=document.createElement('span');priority.className='cmp-card-priority';priority.textContent=c.priority||'Core';
    meta.append(category,priority);
    const pair=document.createElement('span');pair.className='cmp-pair-row';
    const left=document.createElement('span');left.textContent=c.a;
    const vs=document.createElement('span');vs.className='cmp-vs';vs.textContent='VS';
    const right=document.createElement('span');right.textContent=c.b;
    pair.append(left,vs,right);
    const desc=document.createElement('span');desc.className='cmp-desc';desc.textContent=c.tagline;
    const footer=document.createElement('span');footer.className='cmp-card-foot';
    const progress=document.createElement('span');progress.className='cmp-progress-chip'+(done?' done':'');
    progress.textContent=done?'✓ Practised · '+score+'%':'Not practised yet';
    const action=document.createElement('span');action.className='cmp-card-action';action.textContent='Study pair →';
    footer.append(progress,action);
    button.append(meta,pair,desc,footer);
    button.addEventListener('click',()=>openCompare(c.id));
    grid.appendChild(button);
  });
}
let currentCompare = null;
function openCompare(id){
  const c = COMPARISONS.find(x=>x.id===id); if(!c) return;
  currentCompare = c;
  switchView('compare-detail');
  document.getElementById('cmpTitle').textContent = c.a + ' vs ' + c.b;
  document.getElementById('cmpTagline').textContent = c.tagline;
  document.getElementById('cmpMeanA').dataset.letter = c.a[0];
  document.getElementById('cmpMeanA').innerHTML = `<h3>${c.a}</h3><p>${c.meanA}</p>`;
  document.getElementById('cmpMeanB').dataset.letter = c.b[0];
  document.getElementById('cmpMeanB').innerHTML = `<h3>${c.b}</h3><p>${c.meanB}</p>`;
  document.getElementById('cmpMeanA').appendChild(makeBookRegisterButton({word:c.a,meaning:c.meanA,kind:'word',source:'VAANI Comparisons'},'＋ Save to Book Register'));
  document.getElementById('cmpMeanB').appendChild(makeBookRegisterButton({word:c.b,meaning:c.meanB,kind:'word',source:'VAANI Comparisons'},'＋ Save to Book Register'));
  document.getElementById('cmpDifference').innerHTML = c.difference;
  document.getElementById('cmpRule').innerHTML = c.rule;
  document.getElementById('cmpExceptions').innerHTML = c.exceptions.map(e=>`<li>${e}</li>`).join('');
  const t = c.table;
  document.getElementById('cmpTable').innerHTML = `<thead><tr>${t.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map(r=>`<tr>${r.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;
  document.getElementById('cmpExamples').innerHTML = c.examples.map(ex=>`
    <div class="cmp-ex-pair">
      <div class="cmp-ex-box right">${ex.right}</div>
      <div class="cmp-ex-box wrong">${ex.wrong}</div>
    </div>
    <div class="cmp-ex-note">${ex.note}</div>`).join('');
  document.getElementById('cmpTrick').innerHTML = `<div class="panel-title"><span class="bar"></span>Memory Trick &amp; Officer Tip</div>
    <p>${c.trick}</p><p style="margin-top:8px"><b>Officer Tip:</b> ${c.officerTip}</p>`;
  renderComparePane(c.id, c.pyq);
}
function renderComparePane(id, quiz){
  const pane = document.getElementById('cmpQuizWrap');
  let idx=0, correctCount=0, qTimer=null, quizStartTs=null;
  function render(){
    if(idx===0) comboCount=0;
    if(idx===0 && quizStartTs===null) quizStartTs = Date.now();
    if(idx>=quiz.length){
      const pct = Math.round((correctCount/quiz.length)*100);
      State.quizScores['cmp-'+id]=pct; saveState();
      recordQuizCompletion(pct, quizStartTs?(Date.now()-quizStartTs)/1000:null, (currentCompare?currentCompare.a+' vs '+currentCompare.b:'Comparison drill'));
      pane.innerHTML = `<div class="quiz-card" style="text-align:center">
        <h3 style="margin-bottom:10px">Drill Complete</h3>
        <div class="num serif" style="font-size:2.4rem;color:var(--gold)">${pct}%</div>
        <p style="color:var(--muted);margin:10px 0">${correctCount} of ${quiz.length} correct${comboBest>=3?` · Best combo ×${comboBest}`:''}</p>
        <button class="btn" onclick="renderComparePane('${id}', COMPARISONS.find(c=>c.id==='${id}').pyq)">Retry Drill</button></div>`;
      addXP(Math.max(5,Math.round(pct/10)),'Comparison drill: '+(currentCompare?currentCompare.a+' vs '+currentCompare.b:'pair'));
      launchConfettiIf(pct>=70);
      return;
    }
    const item = quiz[idx];
    pane.innerHTML = `<div class="quiz-card">
      <div class="qhead-row">
        <div class="quiz-progress">QUESTION ${idx+1} / ${quiz.length} <span class="combo-badge${comboCount>=2?' show':''}">🔥 ×${comboCount}</span> ${item.pyq?`<span class="pyq-tag">PYQ ${item.year||''}</span>`:''}</div>
        <div class="qtimer-ring" id="cmpTimerRing"><svg viewBox="0 0 40 40"><circle class="qt-bg" cx="20" cy="20" r="16"></circle><circle class="qt-fg" cx="20" cy="20" r="16"></circle></svg><div class="qt-num">15</div></div>
      </div>
      <div class="quiz-q">${item.q}</div>
      <div id="cmpOptsWrap"></div>
      <div class="quiz-feedback" id="cmpFeedback"></div>
      <button class="btn quiz-nextbtn" id="cmpNextBtn" style="display:none" onclick="advanceComparePane()">Next →</button>
    </div>`;
    const cardEl = pane.querySelector('.quiz-card');
    qTimer = startQTimer(document.getElementById('cmpTimerRing'));
    const wrap = document.getElementById('cmpOptsWrap');
    item.opts.forEach((o,i)=>{
      const b=document.createElement('button'); b.className='opt-btn'; b.textContent=o;
      b.onclick=()=>{
        if(qTimer) qTimer.stop();
        document.querySelectorAll('#cmpOptsWrap .opt-btn').forEach(x=>x.disabled=true);
        const fb = document.getElementById('cmpFeedback');
        if(i===item.ans){
          b.classList.add('correct');correctCount++;
          handleQuizCorrect(b, cardEl);
          if(qElapsedSeconds(qTimer)<=5){ addXP(2,'Quick answer'); fb.insertAdjacentHTML('afterend','<span class="speed-tag">⚡ Quick answer +2 XP</span>'); }
        } else {
          b.classList.add('wrong');document.querySelectorAll('#cmpOptsWrap .opt-btn')[item.ans].classList.add('correct');
          handleQuizWrong(cardEl);
        }
        document.getElementById('cmpNextBtn').style.display='inline-flex';
      };
      wrap.appendChild(b);
    });
  }
  window.advanceComparePane=()=>{idx++;render();};
  render();
}

/* ============================================================
   PHASE 2: PREMIUM UPGRADE MODULE
=============================================================*/

function setRing(wrapId, pct){
  const wrap = document.getElementById(wrapId);
  if(!wrap) return;
  let ring = wrap.querySelector('.ring-wrap');
  if(!ring){
    ring = document.createElement('div'); ring.className='ring-wrap';
    ring.innerHTML = `<svg viewBox="0 0 80 80"><circle class="ring-bg" cx="40" cy="40" r="34"></circle><circle class="ring-fg" cx="40" cy="40" r="34"></circle></svg><div class="ring-label"></div>`;
    wrap.insertBefore(ring, wrap.firstChild);
  }
  const c = Math.PI*2*34;
  const fg = ring.querySelector('.ring-fg');
  fg.style.strokeDasharray = c;
  fg.style.strokeDashoffset = c - (Math.max(0,Math.min(100,pct))/100)*c;
  ring.querySelector('.ring-label').textContent = Math.round(pct)+'%';
}

/* ---- scroll progress + back to top ---- */
window.addEventListener('scroll',()=>{
  const h=document.documentElement.scrollHeight-window.innerHeight;
  const sp=document.getElementById('scrollProgress');
  if(sp) sp.style.width = h>0 ? (window.scrollY/h)*100+'%' : '0%';
  const btt=document.getElementById('backToTop');
  if(btt) btt.classList.toggle('show', window.scrollY>500);
},{passive:true});

/* ---- ripple effect on interactive elements ---- */
document.addEventListener('click',(e)=>{
  const el = e.target.closest('.btn,.chip,.daily-tab-btn,.tab-btn,nav.mainnav button,.bottomnav button,.theme-toggle,.hamburger,.gate-btn,.card,.opt-btn,.wd-chip,.match-tile,.single-card');
  if(!el) return;
  el.classList.add('rippler');
  const r = el.getBoundingClientRect();
  const ripple = document.createElement('span'); ripple.className='ripple-el';
  const size = Math.max(r.width,r.height)*1.4;
  ripple.style.width = ripple.style.height = size+'px';
  ripple.style.left = (e.clientX-r.left-size/2)+'px';
  ripple.style.top = (e.clientY-r.top-size/2)+'px';
  el.appendChild(ripple);
  setTimeout(()=>ripple.remove(),650);
});

/* ---- custom cursor glow + dot ---- */
(function(){
  const glow=document.getElementById('cursorGlow'), dot=document.getElementById('cursorDot');
  if(!glow||!dot) return;
  let gx=innerWidth/2, gy=innerHeight/2;
  window.addEventListener('mousemove',(e)=>{
    gx=e.clientX; gy=e.clientY;
    dot.style.transform=`translate(${gx}px,${gy}px) translate(-50%,-50%)`;
    if(e.target.closest('button,a,.card,input')) dot.classList.add('active'); else dot.classList.remove('active');
  });
  (function loop(){
    glow.style.transform=`translate(${gx}px,${gy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
})();

/* ---- Layer 6: unified background parallax — pointer + touch + gyroscope, GPU-only (transform) ---- */
(function(){
  const sys=document.getElementById('bgSystem');
  if(!sys) return;
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion) return; // leave --par-x/--par-y at 0, layers stay static — animations still respect their own reduced-motion rules below

  const RANGE = 22; // max px offset for the shallowest-to-deepest layers (multiplied by each layer's --depth)
  let targetX=0, targetY=0, curX=0, curY=0;

  function setTarget(nx, ny){ // nx, ny normalized -1..1
    targetX = nx * RANGE;
    targetY = ny * RANGE;
  }
  window.addEventListener('mousemove', (e)=>{
    setTarget((e.clientX/innerWidth-.5)*2, (e.clientY/innerHeight-.5)*2);
  }, {passive:true});
  window.addEventListener('touchmove', (e)=>{
    if(!e.touches || !e.touches[0]) return;
    const t=e.touches[0];
    setTarget((t.clientX/innerWidth-.5)*2, (t.clientY/innerHeight-.5)*2);
  }, {passive:true});

  function tick(){
    curX += (targetX-curX)*0.06;
    curY += (targetY-curY)*0.06;
    sys.style.setProperty('--par-x', curX.toFixed(2)+'px');
    sys.style.setProperty('--par-y', curY.toFixed(2)+'px');
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // gyroscope (mobile) — only activates after explicit permission granted via enterAcademy() user gesture
  window.addEventListener('deviceorientation', (e)=>{
    if(e.beta==null || e.gamma==null) return;
    const ny = Math.max(-1, Math.min(1, e.beta/45));   // front-back tilt
    const nx = Math.max(-1, Math.min(1, e.gamma/45));  // left-right tilt
    setTarget(nx, ny);
  }, true);
})();
function requestGyroParallax(){
  try{
    if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
      DeviceOrientationEvent.requestPermission().catch(()=>{});
    }
  }catch(err){/* gyroscope unavailable — mouse/touch parallax still works */}
}

/* ---- magnetic + 3D tilt for cards (extends initTilt) ---- */
function initMagnetic(){
  document.querySelectorAll('.card').forEach(card=>{
    if(card._shineBound) return; card._shineBound=true;
    if(!card.querySelector('.card-shine')){
      const s=document.createElement('div'); s.className='card-shine'; card.appendChild(s);
      const t=document.createElement('div'); t.className='card-trace'; card.appendChild(t);
    }
  });
}

/* ---- floating particle background (canvas, lightweight) ---- */
(function(){
  const canvas=document.getElementById('particleCanvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let particles=[], w,h;
  function resize(){ w=canvas.width=innerWidth; h=canvas.height=innerHeight; }
  resize(); window.addEventListener('resize',resize);
  const COUNT = innerWidth<700?22:42;
  for(let i=0;i<COUNT;i++){
    particles.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.8+.4,vx:(Math.random()-.5)*.15,vy:(Math.random()-.5)*.15,a:Math.random()*.5+.15});
  }
  function tick(){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#c9a24b';
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=w; if(p.x>w)p.x=0; if(p.y<0)p.y=h; if(p.y>h)p.y=0;
      ctx.globalAlpha=p.a;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ---- floating vocabulary universe: real words + military symbols drifting up through the background ---- */
(function(){
  const host=document.getElementById('floatWords');
  if(!host) return;
  const pool = (typeof VOCAB!=='undefined' && VOCAB.length) ? VOCAB.map(v=>v.w) :
    ['LUCID','TENACITY','VALOUR','RESOLVE','PRUDENT','STOIC','VIGILANT','AUDACIOUS'];
  const symbols = ['⚔','✈','⚓','★','▲','◈','⬡','⌖','✦'];
  let alive=0; const MAX_ALIVE = innerWidth<700?6:12;
  function spawn(){
    if(alive>=MAX_ALIVE) return;
    const isSymbol = Math.random()<0.28;
    const w=document.createElement('span'); w.className='float-word'+(isSymbol?' float-symbol':'');
    w.textContent = isSymbol ? symbols[Math.floor(Math.random()*symbols.length)] : pool[Math.floor(Math.random()*pool.length)];
    const size = isSymbol ? (Math.random()*0.6+0.9).toFixed(2) : (Math.random()*0.5+0.72).toFixed(2);
    const dur = (Math.random()*14+16).toFixed(1);
    const left = (Math.random()*94+2).toFixed(1);
    const dx = Math.round((Math.random()-.5)*160);
    const rot = (Math.random()*6-3).toFixed(1);
    const op = (Math.random()*0.10+0.08).toFixed(2);
    w.style.cssText = `left:${left}%;font-size:${size}rem;animation-duration:${dur}s;--fwdx:${dx}px;--fwrot:${rot}deg;--fwop:${op}`;
    host.appendChild(w); alive++;
    w.addEventListener('animationend',()=>{ w.remove(); alive--; });
  }
  for(let i=0;i<4;i++) setTimeout(spawn, i*1400);
  setInterval(spawn, 3200);
})();

/* ---- combo system + XP burst particles + question feel ---- */
let comboCount=0, comboBest=0;
function burstAt(x,y,kind){
  const colors = kind==='wrong' ? ['#e2575a','#ff8a8d'] : ['#c9a24b','#49d186','#ffd479'];
  const n = kind==='wrong' ? 8 : 14;
  for(let i=0;i<n;i++){
    const p=document.createElement('div'); p.className='burst-particle';
    const ang = (Math.PI*2*i/n) + Math.random()*0.4;
    const dist = 40+Math.random()*70;
    const bx = Math.cos(ang)*dist, by = Math.sin(ang)*dist;
    const size = 3+Math.random()*4;
    p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colors[i%colors.length]};--bx:${bx}px;--by:${by}px;box-shadow:0 0 6px ${colors[i%colors.length]}`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),720);
  }
}
function showComboPop(n,x,y){
  const el=document.createElement('div'); el.className='combo-pop';
  const scale = Math.min(1.4+n*0.14, 3.1);
  let label = 'COMBO ×'+n, color='var(--gold)';
  if(n>=8){label='UNSTOPPABLE ×'+n; color='#ff5f6d';}
  else if(n>=5){label='ON FIRE ×'+n; color='#ff9f4a';}
  el.textContent = label;
  el.style.cssText = `left:${x}px;top:${y}px;font-size:${scale}rem;color:${color}`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),860);
}
function handleQuizCorrect(btnEl, cardEl){
  comboCount++; comboBest=Math.max(comboBest,comboCount);
  if(comboBest > (State.personalBests.bestCombo||0)){ State.personalBests.bestCombo = comboBest; saveState(); }
  const r=btnEl.getBoundingClientRect(); const x=r.left+r.width/2, y=r.top;
  burstAt(x,y,'correct');
  if(comboCount>=2) showComboPop(comboCount,x,y);
  if(comboCount>0 && comboCount%3===0){
    const bonus=Math.min(comboCount*2,20);
    addXP(bonus,'Combo ×'+comboCount+' bonus');
    launchConfettiIf(comboCount>=6);
  }
  if(cardEl){ cardEl.classList.remove('flash-wrong'); void cardEl.offsetWidth; cardEl.classList.add('flash-correct'); setTimeout(()=>cardEl.classList.remove('flash-correct'),520); }
}
function handleQuizWrong(cardEl){
  comboCount=0;
  if(cardEl){ cardEl.classList.remove('flash-correct'); void cardEl.offsetWidth; cardEl.classList.add('flash-wrong'); setTimeout(()=>cardEl.classList.remove('flash-wrong'),520); }
}
/* per-question countdown ring: visual pressure + speed bonus, never force-fails a question */
function startQTimer(ringEl, onExpireVisualOnly){
  if(!ringEl) return null;
  const fg=ringEl.querySelector('.qt-fg'), num=ringEl.querySelector('.qt-num');
  const R=16, C=2*Math.PI*R, TOTAL=15;
  fg.style.strokeDasharray = C;
  fg.style.strokeDashoffset = 0;
  fg.style.transitionDuration = TOTAL+'s';
  requestAnimationFrame(()=>{ fg.style.strokeDashoffset = C; });
  const startedAt = Date.now();
  const lowT = setTimeout(()=>ringEl.classList.add('low'), (TOTAL-5)*1000);
  const iv = setInterval(()=>{
    const left = Math.max(0, TOTAL-Math.floor((Date.now()-startedAt)/1000));
    if(num) num.textContent = left;
    if(left<=0) clearInterval(iv);
  },1000);
  return { startedAt, stop(){ clearTimeout(lowT); clearInterval(iv); } };
}
function qElapsedSeconds(timer){ return timer ? (Date.now()-timer.startedAt)/1000 : 99; }

/* ---- static parallax starfield ---- */
(function(){
  const canvas=document.getElementById('starField');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let w,h,stars=[];
  function resize(){
    w=canvas.width=innerWidth; h=canvas.height=innerHeight;
    stars=[]; const n=innerWidth<700?60:120;
    for(let i=0;i<n;i++) stars.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.2+.2,a:Math.random()});
  }
  resize(); window.addEventListener('resize',resize);
  function draw(){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#ffffff';
    stars.forEach(s=>{
      const tw = s.a + Math.sin(Date.now()/1200+s.x)*.15;
      ctx.globalAlpha = Math.max(0,Math.min(1,tw))*.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    });
    ctx.globalAlpha=1;
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---- gate boot sequence: typing status + soldier-walk progress ---- */
(function(){
  const statusEl=document.getElementById('gateStatus');
  const fill=document.getElementById('gateLoadFill');
  const track=document.getElementById('gateTrack');
  const soldier=document.getElementById('gateSoldier');
  const gateBtn=document.getElementById('gateBtn');
  if(!statusEl||!fill) return;
  const lines=['INITIALIZING SECURE LINK','VERIFYING CLEARANCE','LOADING SYLLABUS DATABASE','CALIBRATING DRILL ENGINE','ACCESS GRANTED'];
  let li=0, ci=0, pct=0, done=false;
  function typeLine(){
    if(li>=lines.length) return;
    const line=lines[li];
    if(ci<=line.length){
      statusEl.innerHTML = line.slice(0,ci)+'<span class="cursor-blink"></span>';
      ci++; setTimeout(typeLine, 26);
    } else {
      li++; ci=0; setTimeout(typeLine, 260);
    }
  }
  typeLine();

  function spawnDust(leftPct){
    if(!track) return;
    const d=document.createElement('div'); d.className='gate-dust';
    d.style.left='calc('+leftPct+'% - 2px)';
    track.appendChild(d);
    setTimeout(()=>d.remove(), 560);
  }
  let lastDust=0;
  const loadInt=setInterval(()=>{
    pct=Math.min(100,pct+Math.random()*9+3);
    fill.style.width=pct+'%';
    const soldierPct=Math.min(96, 4 + pct*0.92);
    if(soldier) soldier.style.left=soldierPct+'%';
    if(Date.now()-lastDust>180){ spawnDust(soldierPct); lastDust=Date.now(); }
    if(pct>=100 && !done){
      done=true;
      clearInterval(loadInt);
      setTimeout(()=>{
        if(soldier){ soldier.classList.remove('walking'); soldier.classList.add('saluting'); }
        if(track) track.classList.add('complete');
        if(gateBtn) gateBtn.classList.add('armed');
      }, 220);
    }
  },140);

  // floating vocabulary word layer
  const vocabWords=['Tenacious','Magnanimous','Exonerate','Camaraderie','Vindicate','Resilience','Perseverance','Integrity','Gallantry','Fortitude','Steadfast','Vigilance','Audacity','Discipline'];
  const vocabEl=document.getElementById('gateVocab');
  if(vocabEl){
    vocabWords.forEach((w,i)=>{
      const s=document.createElement('span');
      s.textContent=w;
      s.style.left=(6+Math.random()*80)+'%';
      s.style.top=(6+Math.random()*80)+'%';
      s.style.setProperty('--peak',(0.03+Math.random()*0.05).toFixed(3));
      s.style.animationDuration=(24+Math.random()*20)+'s';
      s.style.animationDelay=(-Math.random()*30)+'s';
      vocabEl.appendChild(s);
    });
  }

  // gate particle canvas (glowing dust)
  const gc=document.getElementById('gateParticles');
  if(gc){
    const gctx=gc.getContext('2d'); let gw,gh,gp=[];
    function gresize(){ gw=gc.width=gc.parentElement.offsetWidth; gh=gc.height=gc.parentElement.offsetHeight;
      gp=[]; for(let i=0;i<50;i++) gp.push({x:Math.random()*gw,y:Math.random()*gh,r:Math.random()*1.4+.3,vy:Math.random()*.35+.08}); }
    gresize(); window.addEventListener('resize',gresize);
    function gtick(){
      gctx.clearRect(0,0,gw,gh); gctx.fillStyle='#e8cf8f';
      gp.forEach(p=>{ p.y-=p.vy; if(p.y<0)p.y=gh; gctx.globalAlpha=.35; gctx.beginPath(); gctx.arc(p.x,p.y,p.r,0,Math.PI*2); gctx.fill(); });
      gctx.globalAlpha=1;
      if(!document.getElementById('gate').classList.contains('hide')) requestAnimationFrame(gtick);
    }
    gtick();
  }
})();

/* ---- floating XP popup near XP pill on addXP (visual flourish) ---- */
const _origAddXP = addXP;
addXP = function(n, reason){
  _origAddXP(n, reason);
  const pill = document.querySelector('.xp-pill');
  if(pill){
    const r = pill.getBoundingClientRect();
    const f = document.createElement('div'); f.className='xp-float'; f.textContent='+'+n+' XP';
    f.style.left = r.left+'px'; f.style.top = (r.top-6)+'px';
    document.body.appendChild(f); setTimeout(()=>f.remove(),1150);
  }
};

/* extend switchView to re-bind magnetic shine layers + scroll-to-top on route change */
const _origSwitchView = switchView;
switchView = function(name, options){
  _origSwitchView(name, options);
  setTimeout(initMagnetic, 70);
};


/* ============================================================
   PHASE 3: READING MODES / BOOKMARKS / BADGES / QUICK NAV
=============================================================*/
function toggleFocusPanel(){
  document.getElementById('focusPanel').classList.toggle('show');
}
document.addEventListener('click', (e)=>{
  const panel=document.getElementById('focusPanel');
  if(panel && panel.classList.contains('show') && !panel.contains(e.target) && e.target.id!=='focusBtn'){
    panel.classList.remove('show');
  }
});
function setDisplayMode(mode){
  document.body.classList.remove('mode-focus','mode-zen','mode-sepia');
  if(mode!=='normal') document.body.classList.add('mode-'+mode);
  localStorage.setItem('vaani_mode', mode);
  document.querySelectorAll('.fmode-btn').forEach(b=>b.classList.toggle('active', b.dataset.mode===mode));
}
function resetDisplaySettings(){
  setDisplayMode('normal');
  applyFontSize(100);
  toast('Display reset to Normal, 100%.');
}
document.querySelectorAll('.fmode-btn').forEach(b=>b.addEventListener('click',()=>setDisplayMode(b.dataset.mode)));
(function(){
  const saved = localStorage.getItem('vaani_mode') || 'normal';
  setDisplayMode(saved);
})();

const FONT_STEPS = [50,60,70,80,90,100,110,120,130,150];
function adjustFont(dir){
  let cur = parseInt(localStorage.getItem('vaani_fsize')||'100');
  let idx = FONT_STEPS.indexOf(cur);
  if(idx===-1) idx = FONT_STEPS.indexOf(100);
  idx = Math.max(0, Math.min(FONT_STEPS.length-1, idx+dir));
  applyFontSize(FONT_STEPS[idx]);
}
function applyFontSize(size){
  document.documentElement.style.fontSize = size+'%';
  const lbl=document.getElementById('fsizeVal'); if(lbl) lbl.textContent=size+'%';
  localStorage.setItem('vaani_fsize', size);
  document.querySelectorAll('.fsize-btn[data-size]').forEach(b=>b.classList.toggle('active', parseInt(b.dataset.size)===size));
}
(function(){
  const saved = parseInt(localStorage.getItem('vaani_fsize')||'100');
  const size = FONT_STEPS.includes(saved) ? saved : 100;
  document.documentElement.style.fontSize = size+'%';
  const lbl=document.getElementById('fsizeVal'); if(lbl) lbl.textContent=size+'%';
})();

/* keyboard shortcuts */
document.addEventListener('keydown',(e)=>{
  const key = String(e.key || '');
  const isSearchShortcut = (e.ctrlKey || e.metaKey) && key.toLowerCase()==='k';
  if(isSearchShortcut){
    e.preventDefault();
    const overlay=document.getElementById('gsearchOverlay');
    const input=document.getElementById('globalSearch');
    if(overlay && overlay.classList.contains('show')){
      if(input){ input.focus(); input.select(); }
    } else openGlobalSearch();
    return;
  }
  const target=e.target;
  const tag=target && target.tagName ? target.tagName.toUpperCase() : '';
  if(tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT' || (target && target.isContentEditable)) {
    if(key==='Escape' && target && typeof target.blur==='function') target.blur();
    return;
  }
  const map={'1':'dashboard','2':'grammar','3':'compare','4':'vocab','5':'practice','6':'reading','7':'tests','8':'games','9':'pyq'};
  if(map[key]) switchView(map[key]);
  if(key.toLowerCase()==='f') setDisplayMode(document.body.classList.contains('mode-focus')?'normal':'focus');
  if(key==='Escape') setDisplayMode('normal');
  if(key==='/'){ e.preventDefault(); openGlobalSearch(); }
});
document.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'){ closeGlobalSearch(); closeMoreSheet(); if(document.getElementById('gtSheetOverlay').classList.contains('open')) gtCloseSheet(); }
  if(e.key==='Enter' && document.getElementById('gsearchOverlay').classList.contains('show')){
    const first = document.querySelector('#gsearchResults .gsearch-item');
    if(first) first.click();
  }
});

/* ===== BOTTOM SHEET (More menu) ===== */
function openMoreSheet(){
  document.getElementById('moreSheetBackdrop').classList.add('show');
  document.getElementById('moreSheet').classList.add('show');
  document.body.style.overflow='hidden';
  showSheetMenu();
}
function closeMoreSheet(){
  document.getElementById('moreSheetBackdrop').classList.remove('show');
  document.getElementById('moreSheet').classList.remove('show');
  document.body.style.overflow='';
}
function sheetGo(view){ closeMoreSheet(); switchView(view); }
function showSheetMenu(){
  document.getElementById('sheetTitle').textContent='More';
  document.getElementById('sheetBackBtn').style.display='none';
  const items=[
    {icon:'👤',label:'Profile',action:"sheetGo('profile')"},
    {icon:'🎖️',label:'Achievements',action:"sheetGo('games')"},
    {icon:'★',label:'Bookmarks',action:"showSheetBookmarks()"},
    {icon:'📊',label:'Statistics',action:"sheetGo('leaderboard')"},
    {icon:'⚙️',label:'Settings',action:"closeMoreSheet();toggleFocusPanel()"},
    {icon:'✉️',label:'Feedback',soon:false, action:"showSheetFeedback()"},
    {icon:'ℹ️',label:'About VAANI',action:"showSheetAbout()"}
  ];
  document.getElementById('sheetBody').innerHTML = items.map(it=>
    `<button class="sheet-menu-item" onclick="${it.action}">
      <span class="smi-icon">${it.icon}</span><span class="smi-label">${it.label}</span><span class="smi-arrow">›</span>
    </button>`).join('');
}
function sheetSubheader(title){
  document.getElementById('sheetTitle').textContent=title;
  document.getElementById('sheetBackBtn').style.display='flex';
}
function showSheetBookmarks(){
  sheetSubheader('Bookmarks');
  const bm = getBookmarks().filter(b=>b.startsWith('pyq:'));
  const body = document.getElementById('sheetBody');
  if(!bm.length){
    body.innerHTML = `<div class="sheet-empty">No bookmarks yet.<br>Tap the ★ on any PYQ card to save it here.</div>`;
    return;
  }
  body.innerHTML = bm.map(b=>{
    const qid = b.slice(4);
    const q = PYQ_BY_ID[qid];
    if(!q) return '';
    return `<div class="sheet-bm-item" onclick="closeMoreSheet();switchView('pyq');">
      <b>${q.y} · ${q.s}</b> — ${(q.q||'').slice(0,70)}${(q.q||'').length>70?'…':''}
    </div>`;
  }).join('') || `<div class="sheet-empty">No bookmarks yet.</div>`;
}
function showSheetFeedback(){
  sheetSubheader('Feedback');
  document.getElementById('sheetBody').innerHTML = `
    <div class="sheet-about">
      <p>Found a bug, a wrong answer key, or have a suggestion? Send it directly — every report gets read.</p>
      <a class="btn" style="display:block;text-align:center;text-decoration:none" href="mailto:h29417221@gmail.com?subject=VAANI%20Feedback">✉️ Email Feedback</a>
      <p style="text-align:center;font-family:var(--mono);font-size:.72rem;color:var(--muted2);margin-top:10px">h29417221@gmail.com</p>
    </div>`;
}
function showSheetAbout(){
  sheetSubheader('About VAANI');
  document.getElementById('sheetBody').innerHTML = `
    <div class="sheet-about">
      <p><b>VAANI</b> is an NDA/NA English preparation command centre — grammar lessons, vocabulary training, reading comprehension, and a source-verified archive of previous year questions.</p>
      <p>Every PYQ in the archive is transcribed from an official NDA/NA English paper; nothing is generated or guessed. Currently ${PYQ_PAPERS.length} paper${PYQ_PAPERS.length!==1?'s':''} ${PYQ_PAPERS.length!==1?'are':'is'} available (${PYQ_PAPERS.map(p=>p.label).join(', ')}), with more to follow as they are verified and added.</p>
      <p>All progress, XP, streaks, and bookmarks are stored locally on this device.</p>
    </div>`;
}

/* quick nav fab */
function toggleQuickNav(){
  const fab=document.getElementById('quickNavBtn'), menu=document.getElementById('quickNavMenu');
  const open = !fab.classList.contains('open');
  fab.classList.toggle('open', open); menu.classList.toggle('show', open);
  if(open && !menu.dataset.built){
    menu.dataset.built='1';
    const items=[['Dashboard','dashboard'],['Grammar','grammar'],['Comparisons','compare'],['Vocabulary','vocab'],['Practice','practice'],['Reading','reading'],['Tests & PYQ','tests'],['🎯 Previous Year Questions','pyq'],['Arena','games'],['Profile','profile']];
    menu.innerHTML = items.map(([label,v])=>`<div class="qnav-item" onclick="switchView('${v}');toggleQuickNav();">${label}</div>`).join('');
  }
}

/* bookmarks for questions */
function getBookmarks(){ return Array.isArray(State.pyqBookmarks)?State.pyqBookmarks:[]; }
function toggleBookmark(qid, starEl){
  if(!ACTIVE_CODE||typeof qid!=='string'||!qid)return;
  let bm = getBookmarks().slice();
  if(bm.includes(qid)){ bm = bm.filter(x=>x!==qid); if(starEl) starEl.classList.remove('active'); }
  else { bm.push(qid); if(starEl) starEl.classList.add('active'); }
  State.pyqBookmarks=bm;
  saveState();
}
function isBookmarked(qid){ return getBookmarks().includes(qid); }

/* ============================================================
   BOOT — single, guarded entry point.
   This is the ONLY place app init runs at page load. It runs at the end of <body>,
   so the full DOM already exists. First launch, hard refresh, and returning users
   all pass through this exact same sequence: normalize -> load -> render (isolated).
=============================================================*/
function bootApp(){
  if(window.__vaaniBooted) return; // guards against this script block ever running twice
  window.__vaaniBooted = true;
  safeCall(loadState, 'loadState');
  safeCall(initVaaniNavigationHistory, 'initVaaniNavigationHistory(boot)');
  safeCall(refreshAll, 'refreshAll(boot)');
  safeCall(initGateSession, 'initGateSession(boot)');
}
bootApp();
