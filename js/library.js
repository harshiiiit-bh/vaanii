/* ============================================================
   VAANI — Book Reading (Veer Bhogya Vasundhara), ported in as
   a native section. Needs data/vbv/images.js, data/vbv/quotes.js
   and data/vbv/offline-dict.js loaded first, and styles-vbv.css
   for its scoped styling. Login/account (the 6-digit code) now
   lives in VAANI's own gate — see the gate code in index.html.
============================================================ */
/* ================= STATE & STORAGE ================= */
/* ================= PORTABLE STORAGE LAYER ================= */
/* Works inside Claude (window.storage) AND when exported to GitHub Pages,
   opened locally, or shared via WhatsApp (falls back to localStorage). */
const INSIDE_CLAUDE = !!(window.storage && typeof window.storage.get === 'function');
const Store = INSIDE_CLAUDE ? window.storage : {
  async get(key){
    const raw = localStorage.getItem('vbv_'+key);
    if(raw === null){ const e = new Error('not found'); e.notFound = true; throw e; }
    return { key, value: raw, shared:false };
  },
  async set(key, value){
    try{ localStorage.setItem('vbv_'+key, value); return { key, value, shared:false }; }
    catch(e){ return null; }
  },
  async delete(key){ localStorage.removeItem('vbv_'+key); return { key, deleted:true, shared:false }; },
  async list(prefix){
    const p = 'vbv_'+(prefix||'');
    const keys = Object.keys(localStorage).filter(k=>k.startsWith(p)).map(k=>k.slice(4));
    return { keys, shared:false };
  }
};

const LEGACY_DATA_KEY = 'veer_bhogya_data_v1'; // pre-account single-profile key, migrated on first boot
const DEFAULT_DATA = { completed: [], ongoing: [], upcoming: [], vocab: [], achievements: [], goal: { monthlyBooks: 2, dailyPages: 20 }, cadetName: '', quizHistory: [], createdAt: '',
  levels: { viewed: { basic:{vocab:[],grammar:[]}, intermediate:{vocab:[],grammar:[]}, advanced:{vocab:[],grammar:[]} }, quizScores: { basic:null, intermediate:null, advanced:null } }
};
const BOOK_CATEGORIES = ['Fiction','Non-Fiction','Biography','History','Defence & Strategy','GK / Current Affairs','Poetry','Other'];

/* ---- Levels: structured vocab/grammar/quiz curriculum, folded in as a core section ---- */
const LEVELS = ['basic','intermediate','advanced'];
const LEVEL_LABEL = {basic:'Basic', intermediate:'Intermediate', advanced:'Advanced'};
const VBV_GRAMMAR = {
  basic: [
    {t:"Simple tenses", b:"Present simple for habits and facts, past simple for finished actions, and future simple with \u2018will\u2019 for predictions or promises.",
     ex:["He walks to school every day.","She walked to school yesterday.","They will walk to school tomorrow."]},
    {t:"Articles: a, an, the", b:"Use \u2018a\u2019 or \u2018an\u2019 for one unspecified thing (\u2018an\u2019 before a vowel sound), and \u2018the\u2019 for something specific or already known.",
     ex:["I saw a dog near the gate.","I saw the dog we talked about yesterday."]},
    {t:"Subject-verb agreement", b:"The verb must match the subject in number \u2014 singular subjects take singular verbs, plural subjects take plural verbs.",
     ex:["She writes every day.","They write every day."]},
    {t:"Prepositions of place and time", b:"Use \u2018in\u2019 for months, years, and enclosed spaces; \u2018on\u2019 for days, dates, and surfaces; \u2018at\u2019 for exact times and points.",
     ex:["The exam is in June.","The exam is on Monday.","The exam starts at nine o'clock."]},
    {t:"Basic sentence order (SVO)", b:"English sentences typically follow Subject + Verb + Object order.",
     ex:["The soldier carried the flag.","The teacher explained the lesson."]}
  ],
  intermediate: [
    {t:"Perfect tenses", b:"Present perfect links a past action to a present result (\u2018have/has\u2019 + past participle); past perfect shows an action that happened before another past action (\u2018had\u2019 + past participle).",
     ex:["I have finished my homework.","I had finished my homework before he arrived."]},
    {t:"First and second conditionals", b:"First conditional talks about real future possibilities (\u2018If + present, will + base verb\u2019). Second conditional talks about unreal or hypothetical present situations (\u2018If + past, would + base verb\u2019).",
     ex:["If it rains, I will stay home.","If I had more time, I would travel more."]},
    {t:"Active and passive voice", b:"Active voice focuses on who does the action. Passive voice focuses on the receiver of the action, using \u2018be\u2019 + past participle.",
     ex:["The officer gave the order.","The order was given by the officer."]},
    {t:"Reported speech", b:"When reporting what someone said, tenses usually shift back one step, and pronouns or time words change to match.",
     ex:["Direct: \u201cI am tired,\u201d she said.","Reported: She said (that) she was tired."]},
    {t:"Modal verbs", b:"\u2018Can/could\u2019 express ability, \u2018may/might\u2019 express permission or possibility, and \u2018must/have to\u2019 express obligation.",
     ex:["You must submit the form by Friday.","May I leave a little early today?"]}
  ],
  advanced: [
    {t:"Third and mixed conditionals", b:"Third conditional expresses an unreal past (\u2018If + had + past participle, would have + past participle\u2019). Mixed conditionals combine two different time frames.",
     ex:["If he had trained harder, he would have qualified.","If she were more disciplined, she would have finished by now."]},
    {t:"Subjunctive mood", b:"Used to express wishes, suggestions, or hypothetical situations \u2014 often after verbs like \u2018suggest\u2019 or \u2018recommend\u2019, or in the phrase \u2018if I were\u2019.",
     ex:["The commander suggested that he be more punctual.","I wish I were better prepared."]},
    {t:"Inversion for emphasis", b:"Placing a negative or limiting adverbial at the start of a sentence and inverting the subject and auxiliary verb adds formal emphasis.",
     ex:["Never have I seen such discipline.","Rarely does he complain."]},
    {t:"Cleft sentences", b:"Splitting a sentence into two clauses to emphasize a particular part of the information, often with \u2018It is/was \u2026 that\u2019 or \u2018What \u2026 is\u2019.",
     ex:["It was his courage that impressed the panel.","What matters most is consistency."]},
    {t:"Participle clauses", b:"Using \u2013ing or \u2013ed forms to combine ideas more concisely and formally, replacing a full clause.",
     ex:["Having completed the training, he reported for duty.","Exhausted by the march, the recruits rested."]}
  ]
};
const PHRASES = {
  basic: {label:"Greetings & small talk", items:[
    "Good morning! How are you doing today?",
    "It's nice to meet you.",
    "What have you been up to lately?",
    "Could you please repeat that?",
    "I'm sorry, I didn't catch your name.",
    "Have a great day!",
    "Thank you so much for your help."
  ]},
  intermediate: {label:"Opinions & discussion", items:[
    "In my opinion, discipline is the key to success.",
    "I completely agree with what you just said.",
    "I see your point, but I look at it differently.",
    "Could you explain what you mean by that?",
    "That's a fair point, though I'd like to add something.",
    "I'm not entirely convinced by that argument.",
    "Let's agree to disagree on this one."
  ]},
  advanced: {label:"Interview & SSB-style responses", items:[
    "Good morning, sir. Thank you for this opportunity.",
    "I believe my greatest strength is staying calm under pressure.",
    "I have always been drawn to a life of discipline and service.",
    "If I face a setback, I try to learn from it and move forward with a clear plan.",
    "I keep myself updated on current affairs by reading the newspaper daily.",
    "Teamwork, to me, means putting the group's success before personal credit.",
    "I would welcome any feedback that helps me improve."
  ]}
};
const QUIZZES = {
  basic: [
    {q:"What does \u2018commence\u2019 mean?", o:["End","Begin","Pause","Repeat"], a:1},
    {q:"Which sentence is correct?", o:["She walk to school.","She walks to school.","She walking to school.","She walked to school tomorrow."], a:1},
    {q:"\u2018Genuine\u2019 most nearly means:", o:["Fake","Authentic","Expensive","Rare"], a:1},
    {q:"Which article fits: \u201cI saw ___ elephant at the zoo.\u201d", o:["a","an","the","(no article)"], a:1},
    {q:"\u2018Ignore\u2019 is closest in meaning to:", o:["Notice","Disregard","Remember","Follow"], a:1}
  ],
  intermediate: [
    {q:"\u2018Meticulous\u2019 most nearly means:", o:["Careless","Thorough","Quick","Loud"], a:1},
    {q:"Which is the correct passive form of \u201cThe officer gave the order\u201d?", o:["The order gave the officer.","The order was given by the officer.","The order is giving by the officer.","The order has give by the officer."], a:1},
    {q:"\u2018Plausible\u2019 is closest in meaning to:", o:["Impossible","Believable","Silly","Boring"], a:1},
    {q:"Which sentence correctly uses the first conditional?", o:["If it rains, I would stay home.","If it rains, I will stay home.","If it rained, I will stay home.","If it rain, I stay home."], a:1},
    {q:"\u2018Resilient\u2019 describes someone who:", o:["Gives up easily","Recovers quickly from difficulty","Talks too much","Avoids responsibility"], a:1}
  ],
  advanced: [
    {q:"\u2018Ubiquitous\u2019 most nearly means:", o:["Rare","Present everywhere","Expensive","Hidden"], a:1},
    {q:"Which sentence uses correct inversion?", o:["I have never seen such discipline.","Never have I seen such discipline.","Never I have seen such discipline.","I never have seen such discipline."], a:1},
    {q:"A \u2018sycophant\u2019 is someone who:", o:["Leads bravely","Flatters others for advantage","Speaks rarely","Works independently"], a:1},
    {q:"\u2018Taciturn\u2019 is closest in meaning to:", o:["Talkative","Reserved","Angry","Friendly"], a:1},
    {q:"Which sentence correctly uses the third conditional?", o:["If he trains harder, he will qualify.","If he had trained harder, he would have qualified.","If he trained harder, he would qualify.","If he train harder, he qualify."], a:1}
  ]
};
let DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
let dataLoaded = false;
let ACTIVE_CODE = null;

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function accountKey(code){ return 'veer_bhogya_account_' + code; }

/* ---- Session pointer: purely a "remember which code is active on this
   browser" convenience, always kept locally regardless of environment, so
   the site never logs you out until you explicitly log out. ---- */
function setSessionCode(code){ try{ localStorage.setItem('vbv_session_code', code); }catch(e){} }
function getSessionCode(){ try{ return localStorage.getItem('vbv_session_code'); }catch(e){ return null; } }
function clearSessionCode(){ try{ localStorage.removeItem('vbv_session_code'); }catch(e){} }

function applyLoadedAccount(code, parsed){
  ACTIVE_CODE = code;
  const vaaniPart = (parsed && parsed.vaani) || {};
  const vbvPart = (parsed && parsed.vbv) || {};
  if(typeof State !== 'undefined') Object.assign(State, vaaniPart);
  DATA = Object.assign({}, DEFAULT_DATA, vbvPart);
  DATA.goal = Object.assign({}, DEFAULT_DATA.goal, vbvPart.goal||{});
  DATA.levels = Object.assign({}, DEFAULT_DATA.levels, vbvPart.levels||{});
  DATA.levels.viewed = Object.assign({basic:{vocab:[],grammar:[]},intermediate:{vocab:[],grammar:[]},advanced:{vocab:[],grammar:[]}}, DATA.levels.viewed||{});
  DATA.levels.quizScores = Object.assign({basic:null,intermediate:null,advanced:null}, DATA.levels.quizScores||{});
  if(!DATA.createdAt) DATA.createdAt = new Date().toISOString();
  dataLoaded = true;
}

/* Account data is saved with shared:true. Inside Claude that makes it
   follow the same code across any browser this artifact is opened in.
   Outside Claude (GitHub Pages, a saved file) there is no server behind
   it, so the code just namespaces separate local profiles on that one
   browser — it can't sync across devices without a real backend. */
async function loginWithCode(rawCode){
  const code = (rawCode||'').replace(/\D/g,'').slice(0,6);
  if(code.length !== 6) return { ok:false, msg:'Enter all 6 digits.' };
  try{
    const res = await Store.get(accountKey(code), true);
    if(res && res.value){
      applyLoadedAccount(code, JSON.parse(res.value));
      setSessionCode(code);
      return { ok:true };
    }
  }catch(e){ /* not found */ }
  return { ok:false, msg:'No account found with that code. Check the digits, or create a new one.' };
}
function generateCode(){ return String(Math.floor(100000 + Math.random()*900000)); }
async function pickFreeCode(){
  for(let i=0;i<6;i++){
    const code = generateCode();
    try{ await Store.get(accountKey(code), true); }
    catch(e){ return code; }
  }
  return generateCode();
}
async function createNewAccount(){
  const code = await pickFreeCode();
  applyLoadedAccount(code, {});
  await saveData();
  setSessionCode(code);
  return code;
}
async function tryMigrateLegacyData(){
  try{
    const res = await Store.get(LEGACY_DATA_KEY, false);
    if(res && res.value){
      const code = await pickFreeCode();
      applyLoadedAccount(code, { vaani:{}, vbv: JSON.parse(res.value) });
      await saveData();
      setSessionCode(code);
      return code;
    }
  }catch(e){ /* no legacy data — nothing to migrate */ }
  return null;
}

async function persistCombinedAccount(){
  if(!ACTIVE_CODE) return false;
  try{
    const combined = JSON.stringify({ vaani: (typeof State!=='undefined'?State:{}), vbv: DATA });
    const res = await Store.set(accountKey(ACTIVE_CODE), combined, true);
    return !!res;
  }catch(e){ console.error(e); return false; }
}
async function saveData(){
  if(!ACTIVE_CODE) return;
  const newlyUnlocked = checkAndUnlockAchievements();
  const ok = await persistCombinedAccount();
  if(!ok){ vbvToast('Could not save — storage returned nothing.', 'angry'); }
  if(newlyUnlocked.length){
    celebrate();
    newlyUnlocked.forEach((a,i)=> setTimeout(()=> vbvToast(`Medal earned: ${a.icon} ${a.title}`, 'good'), i*650));
  }
}

/* ---- API key (device-level setting, not tied to any one account; only needed once this page lives outside Claude) ---- */
async function getApiKey(){
  try{ const res = await Store.get('anthropic_api_key', false); return (res && res.value) ? res.value : ''; }
  catch(e){ return ''; }
}
async function setApiKeyStored(key){
  try{ await Store.set('anthropic_api_key', key, false); return true; } catch(e){ return false; }
}

function logout(){
  clearSessionCode();
  closeModal();
  location.reload();
}

/* ---- Backup / restore ---- */
function exportData(){
  const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'veer-bhogya-vasundhara-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=> URL.revokeObjectURL(url), 2000);
  vbvToast('Backup downloaded.', 'good');
}
let __pendingImport = null;
async function handleImportFile(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  let parsed;
  try{
    const text = await file.text();
    parsed = JSON.parse(text);
    const looksValid = parsed && typeof parsed==='object' && ['completed','ongoing','upcoming','vocab'].some(k=>Array.isArray(parsed[k]));
    if(!looksValid) throw new Error('not a VBV backup file');
  }catch(e){
    vbvToast("That file doesn't look like a valid backup.", 'angry');
    return;
  }
  __pendingImport = parsed;
  openModal(`
    <h3>Import this backup?</h3>
    <div class="sub">This replaces everything currently in this account with the file's contents.</div>
    <p style="font-size:13px; color:var(--navy-soft);">${(parsed.completed||[]).length} completed, ${(parsed.ongoing||[]).length} ongoing, ${(parsed.upcoming||[]).length} upcoming, ${(parsed.vocab||[]).length} vocab words.</p>
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="confirmImport()">Replace My Data</button>
    </div>
  `);
}
async function confirmImport(){
  if(!__pendingImport){ closeModal(); return; }
  DATA = Object.assign({}, DEFAULT_DATA, __pendingImport);
  DATA.goal = Object.assign({}, DEFAULT_DATA.goal, __pendingImport.goal||{});
  __pendingImport = null;
  await saveData();
  closeModal();
  vbvToast('Backup imported.', 'good');
  navigate();
}

/* ================= UTIL ================= */
function fmtDate(d){
  if(!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
}
function fmtDateTime(iso){
  if(!iso) return '—';
  const dt = new Date(iso);
  return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) + ', ' +
         dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
}
function todayStr(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function durationBetween(startIso, endIso){
  const ms = new Date(endIso) - new Date(startIso);
  if(ms < 0) return 'same moment';
  const totalMin = Math.round(ms/60000);
  const days = Math.floor(totalMin/1440);
  const hours = Math.floor((totalMin%1440)/60);
  const mins = totalMin%60;
  let parts=[];
  if(days) parts.push(days+'d');
  if(hours) parts.push(hours+'h');
  if(mins || parts.length===0) parts.push(mins+'m');
  return parts.join(' ');
}
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/* Deterministic "spine" accent color per book, so the same title always
   gets the same color — a bookshelf feel with zero network/images needed. */
function spineColorFor(title){
  const palette = ['#A32A20','#B8862F','#3E6E93','#516B4E','#7A1E16','#8B6210','#2E4A5E','#3D5A3A'];
  let hash = 0;
  for(let i=0;i<title.length;i++){ hash = (hash*31 + title.charCodeAt(i)) >>> 0; }
  return palette[hash % palette.length];
}
/* Reading pace: total pages divided by calendar days from start to finish.
   Only computable once the book has a known page count — kept separate
   from the personal 1-5 star rating, which stays a subjective opinion. */
function computeDaysTaken(startAt, endAt){
  const ms = new Date(endAt) - new Date(startAt);
  return Math.max(1, Math.round(ms/86400000));
}
function paceRating(totalPages, startAt, endAt){
  if(!totalPages || totalPages<=0) return null;
  const days = computeDaysTaken(startAt, endAt);
  const perDay = totalPages / days;
  let stars, label;
  if(perDay >= 50){ stars=5; label='Blitz Pace'; }
  else if(perDay >= 30){ stars=4; label='Rapid Advance'; }
  else if(perDay >= 15){ stars=3; label='Steady March'; }
  else if(perDay >= 7){ stars=2; label='Measured Advance'; }
  else { stars=1; label='Slow and Steady'; }
  return { stars, label, perDay: Math.round(perDay*10)/10, days };
}

/* ================= TOASTS ================= */
function vbvToast(msg, kind){
  const stack = document.getElementById('vbvToast-stack');
  while(stack.children.length >= 4){ stack.removeChild(stack.firstChild); }
  const el = document.createElement('div');
  el.className = 'vbvToast' + (kind ? ' '+kind : '');
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=>el.remove(), 400); }, 4200);
}

/* ================= MODAL ================= */
function openModal(html){
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-layer').classList.add('show');
}
function closeModal(){
  document.getElementById('modal-layer').classList.remove('show');
  document.getElementById('modal-content').innerHTML = '';
}
document.getElementById('modal-layer').addEventListener('click', (e)=>{
  if(e.target.id === 'modal-layer') closeModal();
});

/* ================= BUTTON GUARD (prevents double-submits) ================= */
/* Call at the top of an async action handler. Disables the button that was
   just clicked (reliably the focused element right after a click/tap) so a
   fast double-tap can't fire the action twice. Call release() on any path
   that returns without re-rendering the page — success paths that end in
   navigate() don't need it, since the button is replaced anyway. */
function guardBtn(){
  const btn = document.activeElement;
  if(btn && btn.tagName === 'BUTTON'){
    if(btn.disabled) return { btn:null, release(){} };
    btn.disabled = true;
    return { btn, release(){ btn.disabled = false; } };
  }
  return { btn:null, release(){} };
}

/* ================= MOBILE NAV ================= */
function vbvToggleMobileNav(){
  document.getElementById('vbv-mainnav').classList.toggle('open');
  document.getElementById('nav-backdrop').classList.toggle('show');
}
function vbvCloseMobileNav(){
  document.getElementById('vbv-mainnav').classList.remove('open');
  document.getElementById('nav-backdrop').classList.remove('show');
}

/* ================= STATUS BANNER ================= */
async function checkStorageHealth(){
  try{
    await Store.set('__vbv_probe__', '1', false);
    await Store.get('__vbv_probe__', false);
    await Store.delete('__vbv_probe__', false);
    return true;
  }catch(e){ return false; }
}
function showBanner(msg){
  const el = document.getElementById('status-banner');
  el.innerHTML = escapeHtml(msg) + ' <button onclick="this.parentElement.classList.remove(\'show\')">Dismiss</button>';
  el.classList.add('show');
}

/* ================= QUOTES / TICKER ================= */
let quotePos = 0;
function pickRandomQuote(){ return QUOTES[Math.floor(Math.random()*QUOTES.length)]; }

function startTicker(){
  const span = document.getElementById('ticker-text');
  function next(){
    span.style.opacity = '0';
    setTimeout(()=>{
      span.textContent = pickRandomQuote();
      span.style.opacity = '1';
    }, 400);
  }
  next();
  setInterval(next, 6000);
}

/* ================= DIGITAL CLOCK (front page) ================= */
function startClock(){
  function tick(){
    const now = new Date();
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    if(timeEl) timeEl.textContent = now.toLocaleTimeString('en-IN', {hour12:false});
    if(dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', {weekday:'short', day:'2-digit', month:'short', year:'numeric'});
  }
  tick();
  setInterval(tick, 1000);
}

/* ================= ROUTER ================= */
const routes = {
  home: renderHome,
  ongoing: renderOngoingList,
  ongoingDetail: renderOngoingDetail,
  completed: renderCompletedList,
  upcoming: renderUpcomingList,
  vocab: renderVocab,
  academy: renderAcademy,
  dashboard: renderDashboard,
  board: renderBoard,
  achievements: renderAchievements,
  vocabtest: renderQuizSetup,
  library: renderLibrary,
  flashcards: renderFlashcardsHome,
  levels: vbvRenderLevels,
  spoken: renderSpoken,
};

function currentRoute(){
  const hash = location.hash.replace('#/','') || 'home';
  const parts = hash.split('/');
  return { name: parts[0] || 'home', id: parts[1] || null };
}

let timerInterval = null;
let quizTimerInterval = null;

/* ---------------- IN-APP BACK NAVIGATION ---------------- */
/* Our own history stack, independent of the browser's — so "back" always
   walks through pages actually visited in this app, and never risks
   leaving the app entirely (which window.history.back() could do). */
let navStack = ['home'];
let isBackNavigation = false;
function goBack(){
  if(navStack.length <= 1) return;
  isBackNavigation = true;
  navStack.pop();
  location.hash = '#/' + navStack[navStack.length-1];
}
function updateBackButtonVisibility(){
  const btn = document.getElementById('back-nav-btn');
  if(btn) btn.style.display = navStack.length > 1 ? 'flex' : 'none';
}

function navigate(){
  if(timerInterval){ clearInterval(timerInterval); timerInterval = null; }
  if(quizTimerInterval){ clearInterval(quizTimerInterval); quizTimerInterval = null; }
  closeModal();
  vbvCloseMobileNav();
  const routeKey = location.hash.replace('#/','') || 'home';
  if(isBackNavigation){
    isBackNavigation = false;
  } else if(navStack[navStack.length-1] !== routeKey){
    navStack.push(routeKey);
    if(navStack.length > 30) navStack.shift();
  }
  const { name, id } = currentRoute();
  document.querySelectorAll('#vbv-mainnav button').forEach(b=>{
    b.classList.toggle('active', b.dataset.route === name || (name==='ongoingDetail' && b.dataset.route==='ongoing'));
  });
  const app = document.getElementById('app');
  const fn = (name === 'ongoingDetail') ? routes.ongoingDetail : (routes[name] || renderHome);
  app.classList.add('page-leaving');
  setTimeout(()=>{
    app.innerHTML = fn(id);
    app.classList.remove('page-leaving');
    window.scrollTo({top:0, behavior:'smooth'});
    bindPageEvents(name, id);
    updateBackButtonVisibility();
  }, 170);
}

document.querySelectorAll('#vbv-mainnav button').forEach(btn=>{
  btn.addEventListener('click', ()=>{ location.hash = '#/' + btn.dataset.route; });
});
window.addEventListener('hashchange', navigate);

/* ================= HOME ================= */
function renderHome(){
  const totalPagesRead = DATA.ongoing.reduce((s,b)=> s + b.logs.reduce((a,l)=>a+Number(l.pages||0),0), 0)
    + DATA.completed.reduce((s,b)=> s + (b.logs? b.logs.reduce((a,l)=>a+Number(l.pages||0),0):0), 0);
  const isFreshAccount = !DATA.completed.length && !DATA.ongoing.length && !DATA.upcoming.length && !DATA.vocab.length;
  return `
  <div class="page">
    <div class="hero" id="hero">
      <div class="hero-img" id="hero-img" style="background-image:url('${IMG.chetwode_refl}')"></div>
      <div class="hero-scrim"></div>
      <div class="digi-clock">
        <div class="clock-time" id="clock-time">00:00:00</div>
        <div class="clock-date" id="clock-date">—</div>
      </div>
      <div class="hero-content">
        <div class="page-eyebrow">Reading Command Post</div>
        <h1>${DATA.cadetName ? 'Welcome back, '+escapeHtml(DATA.cadetName) : 'Every book is a drill for the mind'}</h1>
        <p>Every page read is ground gained.</p>
        <div class="hero-cta">
          <button class="vbv-btn btn-maroon" onclick="location.hash='#/upcoming'">Add a Book</button>
          <button class="vbv-btn btn-ghost" onclick="location.hash='#/ongoing'">View Ongoing</button>
        </div>
      </div>
    </div>

    <div class="stat-row">
      <div class="vbv-stat-card"><div class="num">${DATA.completed.length}</div><div class="lbl">Books Completed</div></div>
      <div class="vbv-stat-card"><div class="num">${DATA.ongoing.length}</div><div class="lbl">Currently Reading</div></div>
      <div class="vbv-stat-card"><div class="num">${DATA.upcoming.length}</div><div class="lbl">On the Waitlist</div></div>
      <div class="vbv-stat-card"><div class="num">${DATA.vocab.length}</div><div class="lbl">Words Commanded</div></div>
      <div class="vbv-stat-card"><div class="num">${totalPagesRead}</div><div class="lbl">Pages Logged</div></div>
    </div>

    ${(()=>{ const wod = wordOfTheDay(); return `
    <div class="wod-card">
      <div>
        <div class="wod-label">Word of the Day</div>
        <div class="vbv-wod-word">${escapeHtml(wod.word)}</div>
        <div class="wod-meaning">${escapeHtml(wod.meaning)}</div>
      </div>
      <button class="vbv-btn btn-gold btn-sm" onclick="addWordOfDayToRegister()">Add to My Register</button>
    </div>`; })()}

    ${isFreshAccount ? `
    <div class="onboard-card">
      <h3>Let's get your first book moving</h3>
      <div class="onboard-steps">
        <div class="onboard-step"><span class="onboard-num">1</span><div><strong>Add a book</strong><p>Put anything you're planning to read into your Upcoming queue.</p></div></div>
        <div class="onboard-step"><span class="onboard-num">2</span><div><strong>Start reading</strong><p>Move it to Ongoing with one tap — the start date and time are stamped automatically.</p></div></div>
        <div class="onboard-step"><span class="onboard-num">3</span><div><strong>Log as you go</strong><p>Pages, minutes, highlights, and new words — all from one screen, then mark it complete when you finish.</p></div></div>
      </div>
      <button class="vbv-btn btn-gold" onclick="location.hash='#/upcoming'">Add Your First Book</button>
    </div>` : ''}

    <div class="section-title-row"><h3>Currently Reading</h3><a href="#/ongoing">View all →</a></div>
    <div class="book-grid" style="margin-bottom:46px;">
      ${DATA.ongoing.length ? DATA.ongoing.slice(0,3).map(ongoingCardHtml).join('') :
        `<div class="vbv-empty-state" style="grid-column:1/-1;"><h4>No book in progress</h4><p>Move a title from Upcoming to start your reading log.</p></div>`}
    </div>

    <div class="quote-block"><p id="home-quote">${pickRandomQuote()}</p></div>

    <div class="section-title-row"><h3>Your Command Tools</h3></div>
    <div class="book-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); margin-bottom:46px;">
      <div class="tool-tile" style="background-image:url('${IMG.parade_ncc}')" onclick="location.hash='#/dashboard'">
        <div><span class="tt-label">📊 Progress Tracker</span><small class="tt-sub">Streaks, heatmap &amp; goals</small></div>
      </div>
      <div class="tool-tile" style="background-image:url('${IMG.officers_march}')" onclick="location.hash='#/board'">
        <div><span class="tt-label">🗂️ Reading Board</span><small class="tt-sub">Drag books across stages</small></div>
      </div>
      <div class="tool-tile" style="background-image:url('${IMG.mud}')" onclick="location.hash='#/achievements'">
        <div><span class="tt-label">🎖️ Medals &amp; Stickers</span><small class="tt-sub">${DATA.achievements.length} earned so far</small></div>
      </div>
    </div>
  </div>`;
}

/* ================= ONGOING ================= */
function ongoingCardHtml(b){
  const pagesLogged = b.logs.reduce((a,l)=>a+Number(l.pages||0),0);
  const totalMin = b.logs.reduce((a,l)=>a+Number(l.minutes||0),0);
  const pct = b.totalPages ? Math.min(100, Math.round(100*pagesLogged/b.totalPages)) : null;
  return `
  <div class="book-card" style="border-left-color:${spineColorFor(b.title)};">
    <span class="vbv-badge badge-ongoing">Ongoing</span>
    <h4>${escapeHtml(b.title)}</h4>
    <div class="author">${escapeHtml(b.author||'Author unknown')}</div>
    ${b.category ? `<span class="vbv-chip" style="width:fit-content;">${escapeHtml(b.category)}</span>` : ''}
    ${pct!==null ? `<div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>` : ''}
    <div class="meta-line"><span>Started ${fmtDate(b.startDate)}</span><span>${b.totalPages ? pagesLogged+'p / '+b.totalPages+'p' : pagesLogged+'p · '+totalMin+'m logged'}</span></div>
    <div class="card-actions">
      <button class="vbv-btn btn-sm btn-maroon" onclick="location.hash='#/ongoingDetail/${b.id}'">Open Log</button>
      <button class="vbv-btn btn-sm btn-outline" onclick="openCompleteModal('${b.id}')">Mark Complete</button>
      <button class="vbv-btn btn-sm btn-outline" onclick="openAbandonModal('${b.id}')">Remove</button>
    </div>
  </div>`;
}

function renderOngoingList(){
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.heli_parade}')">
      <div class="page-eyebrow">Active Reading</div>
      <h2>Ongoing Books</h2>
      <p>Books currently under your command. Open a book to log daily pages, minutes, and vocabulary.</p>
    </div>
    <div class="book-grid">
      ${DATA.ongoing.length ? DATA.ongoing.map(ongoingCardHtml).join('') :
        `<div class="vbv-empty-state" style="grid-column:1/-1;"><h4>Nothing in progress</h4><p>Promote a book from your Upcoming list to begin tracking it.</p>
         <button class="vbv-btn btn-maroon btn-sm" style="margin-top:12px;" onclick="location.hash='#/upcoming'">Go to Upcoming</button></div>`}
    </div>
  </div>`;
}

let __modalStay = false;
let __pendingRating = 0;
function openCompleteModal(bookId, stay){
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(!b) return;
  __modalStay = !!stay;
  __pendingRating = 0;
  openModal(`
    <h3>Mark "${escapeHtml(b.title)}" complete</h3>
    <div class="sub">Enter the date you finished. Time is stamped automatically, right now.</div>
    <label>Completion date</label>
    <input type="date" id="complete-date" value="${todayStr()}" max="${todayStr()}">
    ${!b.totalPages ? `
    <label style="margin-top:14px;">Total pages (optional — enables a pace rating)</label>
    <input type="number" id="complete-total-pages" min="1" placeholder="e.g. 320">` : ''}
    <label style="margin-top:14px;">Rate this book</label>
    <div class="star-row" id="star-row">
      ${[1,2,3,4,5].map(n=>`<span data-val="${n}" onclick="setRating(${n})">&#9733;</span>`).join('')}
    </div>
    <label style="margin-top:2px;">A line on it (optional)</label>
    <textarea id="complete-review" rows="2" placeholder="What stayed with you..."></textarea>
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="completeBook('${bookId}')">Confirm Completion</button>
    </div>
  `);
}
function setRating(n){
  __pendingRating = n;
  document.querySelectorAll('#star-row span').forEach(s=>{
    s.classList.toggle('filled', Number(s.dataset.val) <= n);
  });
}
async function completeBook(bookId){
  const idx = DATA.ongoing.findIndex(x=>x.id===bookId);
  if(idx===-1) return;
  guardBtn();
  const date = document.getElementById('complete-date').value || todayStr();
  const review = (document.getElementById('complete-review').value || '').trim();
  const b = DATA.ongoing[idx];
  const pagesInput = document.getElementById('complete-total-pages');
  const totalPages = b.totalPages || (pagesInput ? Number(pagesInput.value) || null : null);
  const nowIso = new Date().toISOString();
  const endIso = date + 'T' + nowIso.slice(11);
  const completedBook = {
    id: b.id, title: b.title, author: b.author, totalPages, category: b.category || null,
    startDate: b.startDate, startAt: b.startAt,
    endDate: date, endAt: endIso,
    logs: b.logs, notes: b.notes||[], vocabCount: (b.vocabWordIds||[]).length,
    rating: __pendingRating, review: review
  };
  DATA.completed.unshift(completedBook);
  DATA.ongoing.splice(idx,1);
  await saveData();
  closeModal();
  celebrate();
  vbvToast('Marked complete — filed to your record.', 'good');
  if(__modalStay && currentRoute().name==='board'){ navigate(); }
  else{ location.hash = '#/completed'; }
}

/* ---- Abandon an ongoing book without completing it ---- */
function openAbandonModal(bookId){
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(!b) return;
  openModal(`
    <h3>Remove "${escapeHtml(b.title)}"?</h3>
    <div class="sub">This drops it from Ongoing without marking it complete — its logged pages, minutes, and highlights go with it. This can't be undone.</div>
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="confirmAbandon('${bookId}')">Remove It</button>
    </div>
  `);
}
async function confirmAbandon(bookId){
  DATA.ongoing = DATA.ongoing.filter(b=>b.id!==bookId);
  await saveData();
  closeModal();
  vbvToast('Removed from Ongoing.', 'good');
  location.hash = '#/ongoing';
}

/* ---- Ongoing Detail (per-book log + vocab quick add) ---- */
function renderOngoingDetail(id){
  const b = DATA.ongoing.find(x=>x.id===id);
  if(!b){
    return `<div class="page"><div class="vbv-empty-state"><h4>Book not found</h4><p>It may have been completed or removed.</p></div></div>`;
  }
  const pagesLogged = b.logs.reduce((a,l)=>a+Number(l.pages||0),0);
  const totalMin = b.logs.reduce((a,l)=>a+Number(l.minutes||0),0);
  const logsSorted = [...b.logs].sort((a,c)=> c.date.localeCompare(a.date));
  const notesSorted = [...(b.notes||[])].sort((a,c)=> c.date.localeCompare(a.date));
  const timerRunning = !!b.activeTimerStart;
  const pagesPct = b.totalPages ? Math.min(100, Math.round(100*pagesLogged/b.totalPages)) : null;
  return `
  <div class="page">
    <div class="page-head">
      <div class="page-eyebrow">Ongoing Book</div>
      <h2>${escapeHtml(b.title)}</h2>
      <p>${escapeHtml(b.author||'')} &nbsp;·&nbsp; Started ${fmtDateTime(b.startAt)}</p>
    </div>

    <div class="stat-row" style="grid-template-columns:repeat(3,1fr); margin-bottom:20px;">
      <div class="vbv-stat-card"><div class="num">${pagesLogged}</div><div class="lbl">Pages Logged</div></div>
      <div class="vbv-stat-card"><div class="num">${totalMin}</div><div class="lbl">Minutes Logged</div></div>
      <div class="vbv-stat-card"><div class="num">${(b.vocabWordIds||[]).length}</div><div class="lbl">Words Captured</div></div>
    </div>

    ${b.totalPages ? `
    <div class="panel" style="margin-bottom:20px;">
      <div class="goal-label"><span>Pages progress</span><span>${pagesLogged} / ${b.totalPages} (${pagesPct}%)</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pagesPct}%"></div></div>
      <button class="link-btn-light" style="margin-top:8px;" onclick="openSetTotalPagesModal('${b.id}')">Edit total pages</button>
    </div>` : `
    <div class="panel" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <p style="font-size:12.5px; color:var(--navy-soft); margin:0;">Add the book's total page count to track progress and get a pace rating when you finish.</p>
      <button class="vbv-btn btn-outline btn-sm" onclick="openSetTotalPagesModal('${b.id}')">Add Total Pages</button>
    </div>`}

    <div class="timer-box">
      <div>
        <div class="timer-display" id="timer-display">00:00:00</div>
        <div class="timer-sub">${timerRunning ? 'Reading session in progress' : 'Live reading timer'}</div>
      </div>
      <button class="vbv-btn ${timerRunning?'btn-gold':'btn-maroon'} btn-sm" onclick="${timerRunning?`stopTimer('${b.id}')`:`startTimer('${b.id}')`}">${timerRunning?'Stop &amp; Log Time':'Start Timer'}</button>
    </div>

    <div class="panel">
      <h3 style="margin-bottom:14px;">Log today's reading</h3>
      <div class="form-row">
        <div><label>Date</label><input type="date" id="log-date" value="${todayStr()}" max="${todayStr()}"></div>
        <div><label>Pages read</label><input type="number" id="log-pages" min="0" placeholder="e.g. 24"></div>
      </div>
      <div class="form-row">
        <div><label>Time taken (minutes)</label><input type="number" id="log-minutes" min="0" placeholder="e.g. 40"></div>
        <div style="display:flex; align-items:flex-end;"><button class="vbv-btn btn-maroon" style="width:100%;" onclick="addLog('${b.id}')">Add Log Entry</button></div>
      </div>
    </div>

    <div class="panel">
      <h3 style="margin-bottom:14px;">Save a highlight</h3>
      <p style="font-size:13px; color:var(--navy-soft); margin-bottom:12px;">A quote or a line worth keeping from this book.</p>
      <textarea id="highlight-input" rows="2" placeholder="e.g. Discipline is the soul of an army — Washington"></textarea>
      <button class="vbv-btn btn-outline btn-sm" style="margin-top:10px;" onclick="addHighlight('${b.id}')">Save Highlight</button>
      ${notesSorted.length ? `<div style="margin-top:14px;">${notesSorted.map(n=>`<div class="highlight-item">${escapeHtml(n.text)}<span class="h-date">${fmtDate(n.date)}</span></div>`).join('')}</div>` : ''}
    </div>

    <div class="panel">
      <h3 style="margin-bottom:14px;">Add a word to your Vocab Register</h3>
      <p style="font-size:13px; color:var(--navy-soft); margin-bottom:12px;">Type any new word you learnt from this book. It will be defined and sorted into the Vocab Register automatically — no need to open that tab.</p>
      <div class="form-row" style="grid-template-columns:2fr 1fr;">
        <div><label>New word</label><input type="text" id="vocab-input" placeholder="e.g. Indefatigable"></div>
        <div style="display:flex; align-items:flex-end;"><button class="vbv-btn btn-gold" style="width:100%;" id="vocab-add-btn" onclick="submitVocabWord('${b.id}')">Add Word</button></div>
      </div>
    </div>

    <div class="section-title-row"><h3>Reading log</h3></div>
    ${logsSorted.length ? `
    <div class="table-scroll">
    <table class="logtable">
      <thead><tr><th>Date</th><th>Pages</th><th>Minutes</th><th>Pace</th></tr></thead>
      <tbody>
        ${logsSorted.map(l=>`<tr><td>${fmtDate(l.date)}</td><td>${l.pages}</td><td>${l.minutes}</td><td>${l.minutes>0 ? (l.pages/l.minutes).toFixed(2)+' pg/min' : '—'}</td></tr>`).join('')}
      </tbody>
    </table>
    </div>` : `<div class="vbv-empty-state"><h4>No entries yet</h4><p>Log your first reading session above.</p></div>`}

    <div class="card-actions" style="margin-top:28px;">
      <button class="vbv-btn btn-outline btn-sm" onclick="location.hash='#/ongoing'">← Back to Ongoing</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="openCompleteModal('${b.id}')">Mark Book Complete</button>
      <button class="vbv-btn btn-outline btn-sm" onclick="openAbandonModal('${b.id}')">Remove Book</button>
    </div>
  </div>`;
}

async function addLog(bookId){
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(!b) return;
  const g = guardBtn();
  const date = document.getElementById('log-date').value || todayStr();
  const pages = Number(document.getElementById('log-pages').value || 0);
  const minutes = Number(document.getElementById('log-minutes').value || 0);
  if(pages<=0 && minutes<=0){ vbvToast('Enter pages or minutes before logging.', 'angry'); g.release(); return; }
  b.logs.push({date, pages, minutes});
  await saveData();
  vbvToast('Reading session logged.', 'good');
  navigate();
}

function openSetTotalPagesModal(bookId){
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(!b) return;
  openModal(`
    <h3>Total pages in "${escapeHtml(b.title)}"</h3>
    <div class="sub">Used to track progress and rate your reading pace once you finish.</div>
    <label>Total pages</label>
    <input type="number" id="total-pages-input" min="1" value="${b.totalPages||''}" placeholder="e.g. 320">
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="saveTotalPages('${bookId}')">Save</button>
    </div>
  `);
}
async function saveTotalPages(bookId){
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(!b) return;
  const val = Number(document.getElementById('total-pages-input').value);
  if(!val || val<=0){ vbvToast('Enter a valid page count.', 'angry'); return; }
  b.totalPages = val;
  await saveData();
  closeModal();
  vbvToast('Total pages saved.', 'good');
  navigate();
}

async function startTimer(bookId){
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(!b) return;
  b.activeTimerStart = new Date().toISOString();
  await saveData();
  navigate();
}
async function stopTimer(bookId){
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(!b || !b.activeTimerStart) return;
  const elapsedMin = Math.max(1, Math.round((Date.now() - new Date(b.activeTimerStart).getTime())/60000));
  b.activeTimerStart = null;
  await saveData();
  navigate();
  setTimeout(()=>{
    const minutesInput = document.getElementById('log-minutes');
    if(minutesInput) minutesInput.value = elapsedMin;
  }, 190);
  vbvToast(`Timer stopped — ${elapsedMin} min captured. Add pages read, then log it.`, 'good');
}
async function addHighlight(bookId){
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(!b) return;
  const g = guardBtn();
  const input = document.getElementById('highlight-input');
  const text = input.value.trim();
  if(!text){ vbvToast('Write something before saving.', 'angry'); g.release(); return; }
  b.notes = b.notes || [];
  b.notes.push({date: todayStr(), text});
  await saveData();
  vbvToast('Highlight saved.', 'good');
  navigate();
}

/* ================= COMPLETED ================= */
function completedCardHtml(b){
  const pagesRead = (b.logs||[]).reduce((a,l)=>a+Number(l.pages||0),0);
  const stars = b.rating ? '★'.repeat(b.rating) + '☆'.repeat(5-b.rating) : '';
  const pace = b.totalPages ? paceRating(b.totalPages, b.startAt, b.endAt) : null;
  return `
  <div class="book-card" style="border-left-color:${spineColorFor(b.title)};">
    <span class="vbv-badge badge-completed">Completed</span>
    <h4>${escapeHtml(b.title)}</h4>
    <div class="author">${escapeHtml(b.author||'Author unknown')}</div>
    ${b.category ? `<span class="vbv-chip" style="width:fit-content;">${escapeHtml(b.category)}</span>` : ''}
    ${stars ? `<div style="color:var(--gold); font-size:15px; letter-spacing:2px;">${stars}</div>` : ''}
    <div class="meta-line"><span>Start</span><span>${fmtDateTime(b.startAt)}</span></div>
    <div class="meta-line"><span>Finish</span><span>${fmtDateTime(b.endAt)}</span></div>
    <div class="meta-line"><span>Total time</span><span>${durationBetween(b.startAt, b.endAt)}</span></div>
    <div class="meta-line"><span>Pages read</span><span>${b.totalPages ? pagesRead+' / '+b.totalPages : (pagesRead || '—')}</span></div>
    ${pace ? `<div class="pace-badge">🥾 ${pace.label} — ${pace.perDay} pages/day (${b.totalPages}p in ${pace.days}d)</div>` :
      `<button class="link-btn-light" onclick="openEditCompletedModal('${b.id}')">add total pages for a pace rating</button>`}
    ${b.review ? `<div class="review-quote">"${escapeHtml(b.review)}"</div>` : ''}
    <div class="card-actions">
      <button class="vbv-btn btn-sm btn-outline" onclick="openEditCompletedModal('${b.id}')">Edit</button>
      <button class="vbv-btn btn-sm btn-outline" onclick="openCertificateModal('${b.id}')">Certificate</button>
      <button class="vbv-btn btn-sm btn-outline" onclick="openDeleteCompletedModal('${b.id}')">Delete</button>
    </div>
  </div>`;
}
function openEditCompletedModal(bookId){
  const b = DATA.completed.find(x=>x.id===bookId);
  if(!b) return;
  __pendingRating = b.rating || 0;
  openModal(`
    <h3>Edit "${escapeHtml(b.title)}"</h3>
    <div class="sub">Fix the rating, review, or page count — the dates and logs stay as recorded.</div>
    <label>Total pages</label>
    <input type="number" id="edit-total-pages" min="1" value="${b.totalPages||''}" placeholder="e.g. 320">
    <label style="margin-top:10px;">Rating</label>
    <div class="star-row" id="star-row">
      ${[1,2,3,4,5].map(n=>`<span data-val="${n}" class="${n<=(b.rating||0)?'filled':''}" onclick="setRating(${n})">&#9733;</span>`).join('')}
    </div>
    <label style="margin-top:10px;">Review</label>
    <textarea id="complete-review" rows="2" placeholder="What stayed with you...">${escapeHtml(b.review||'')}</textarea>
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="saveEditedCompleted('${bookId}')">Save</button>
    </div>
  `);
}
async function saveEditedCompleted(bookId){
  const b = DATA.completed.find(x=>x.id===bookId);
  if(!b){ closeModal(); return; }
  const pagesVal = Number(document.getElementById('edit-total-pages').value);
  b.totalPages = pagesVal > 0 ? pagesVal : (b.totalPages || null);
  b.rating = __pendingRating;
  b.review = (document.getElementById('complete-review').value || '').trim();
  await saveData();
  closeModal();
  vbvToast('Updated.', 'good');
  navigate();
}
function openCertificateModal(bookId){
  const b = DATA.completed.find(x=>x.id===bookId);
  if(!b) return;
  const pace = b.totalPages ? paceRating(b.totalPages, b.startAt, b.endAt) : null;
  const stars = b.rating ? '★'.repeat(b.rating) : '';
  openModal(`
    <div class="certificate">
      <div class="cert-crest">★</div>
      <div class="cert-title hindi-title">वीर भोग्या वसुंधरा</div>
      <div class="cert-sub">Certificate of Completion</div>
      <p class="cert-body">This certifies that</p>
      <div class="cert-name">${escapeHtml(DATA.cadetName || 'A Dedicated Reader')}</div>
      <p class="cert-body">has completed reading</p>
      <div class="cert-book">"${escapeHtml(b.title)}"</div>
      ${b.author ? `<p class="cert-body">by ${escapeHtml(b.author)}</p>` : ''}
      <div class="cert-stats">${fmtDate(b.startDate)} — ${fmtDate(b.endDate)} · ${durationBetween(b.startAt, b.endAt)}</div>
      ${pace ? `<div class="cert-stats">${pace.label} — ${pace.perDay} pages/day</div>` : ''}
      ${stars ? `<div class="cert-stars">${stars}</div>` : ''}
    </div>
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Close</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="window.print()">Print / Save as PDF</button>
    </div>
  `);
}
function openDeleteCompletedModal(bookId){
  const b = DATA.completed.find(x=>x.id===bookId);
  if(!b) return;
  openModal(`
    <h3>Delete "${escapeHtml(b.title)}"?</h3>
    <div class="sub">This permanently removes it from your Completed record, including its logs and review. This can't be undone.</div>
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="confirmDeleteCompleted('${bookId}')">Delete It</button>
    </div>
  `);
}
async function confirmDeleteCompleted(bookId){
  DATA.completed = DATA.completed.filter(b=>b.id!==bookId);
  await saveData();
  closeModal();
  vbvToast('Deleted.', 'good');
  navigate();
}
function renderCompletedList(){
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.heli_full}')">
      <div class="page-eyebrow">Service Record</div>
      <h2>Completed Books</h2>
      <p>Every finished book, with start and finish logged to the minute.</p>
    </div>
    <div class="book-grid">
      ${DATA.completed.length ? DATA.completed.map(completedCardHtml).join('') :
        `<div class="vbv-empty-state" style="grid-column:1/-1;"><h4>No books completed yet</h4><p>Finish an ongoing book to see it filed here.</p></div>`}
    </div>
  </div>`;
}

/* ================= UPCOMING ================= */
function upcomingCardHtml(b){
  return `
  <div class="book-card" style="border-left-color:${spineColorFor(b.title)};">
    <span class="vbv-badge badge-upcoming">Waitlist</span>
    <h4>${escapeHtml(b.title)}</h4>
    <div class="author">${escapeHtml(b.author||'Author unknown')}</div>
    ${b.category ? `<span class="vbv-chip" style="width:fit-content;">${escapeHtml(b.category)}</span>` : ''}
    <div class="meta-line"><span>Added ${fmtDate(b.addedAt.slice(0,10))}</span><span></span></div>
    <div class="card-actions">
      <button class="vbv-btn btn-sm btn-maroon" onclick="openStartModal('${b.id}')">Start Reading</button>
      <button class="vbv-btn btn-sm btn-outline" onclick="removeUpcoming('${b.id}')">Remove</button>
    </div>
  </div>`;
}
function renderUpcomingList(){
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.gate}')">
      <div class="page-eyebrow">Reading Queue</div>
      <h2>Upcoming Books</h2>
      <p>Your reading orders for the future. Add titles here, then promote them to Ongoing when you begin.</p>
    </div>
    <div class="panel">
      <h3 style="margin-bottom:14px;">Add a book to the queue</h3>
      <div class="form-row">
        <div><label>Title</label><input type="text" id="up-title" placeholder="e.g. The Art of War"></div>
        <div><label>Author (optional)</label><input type="text" id="up-author" placeholder="e.g. Sun Tzu"></div>
      </div>
      <div class="form-row">
        <div><label>Total pages (optional)</label><input type="number" id="up-pages" min="1" placeholder="e.g. 320"></div>
        <div><label>Category (optional)</label>
          <select id="up-category">
            <option value="">— Select —</option>
            ${BOOK_CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="vbv-btn btn-maroon" onclick="addUpcoming()">Add to Upcoming</button>
    </div>
    <div class="book-grid">
      ${DATA.upcoming.length ? DATA.upcoming.map(upcomingCardHtml).join('') :
        `<div class="vbv-empty-state" style="grid-column:1/-1;"><h4>Queue is empty</h4><p>Add the next book you plan to read.</p></div>`}
    </div>
  </div>`;
}
async function addUpcoming(){
  const g = guardBtn();
  const title = document.getElementById('up-title').value.trim();
  const author = document.getElementById('up-author').value.trim();
  const totalPages = Number(document.getElementById('up-pages').value) || null;
  const category = document.getElementById('up-category').value || null;
  if(!title){ vbvToast('Enter a book title first.', 'angry'); g.release(); return; }
  DATA.upcoming.unshift({id: uid(), title, author, totalPages, category, addedAt: new Date().toISOString()});
  await saveData();
  vbvToast('Added to your reading queue.', 'good');
  navigate();
}
async function removeUpcoming(id){
  DATA.upcoming = DATA.upcoming.filter(b=>b.id!==id);
  await saveData();
  vbvToast('Removed from queue.');
  navigate();
}
function openStartModal(id, stay){
  const b = DATA.upcoming.find(x=>x.id===id);
  if(!b) return;
  __modalStay = !!stay;
  openModal(`
    <h3>Start reading "${escapeHtml(b.title)}"</h3>
    <div class="sub">Enter the date you started. Time is stamped automatically, right now.</div>
    <label>Start date</label>
    <input type="date" id="start-date" value="${todayStr()}" max="${todayStr()}">
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="startReading('${id}')">Confirm Start</button>
    </div>
  `);
}
async function startReading(id){
  const idx = DATA.upcoming.findIndex(x=>x.id===id);
  if(idx===-1) return;
  const g = guardBtn();
  const b = DATA.upcoming[idx];
  const date = document.getElementById('start-date').value || todayStr();
  const nowIso = new Date().toISOString();
  const startAt = date + 'T' + nowIso.slice(11);
  DATA.ongoing.unshift({
    id: b.id, title: b.title, author: b.author, totalPages: b.totalPages || null, category: b.category || null,
    startDate: date, startAt: startAt,
    logs: [], vocabWordIds: []
  });
  DATA.upcoming.splice(idx,1);
  await saveData();
  closeModal();
  vbvToast('Reading started — good luck, cadet.', 'good');
  if(__modalStay && currentRoute().name==='board'){ navigate(); }
  else{ location.hash = '#/ongoingDetail/' + b.id; }
}

/* ================= VOCAB REGISTER ================= */
function buildWordPrompt(word){
  return `You are a strict vocabulary dictionary API. For the English word "${word}", respond with ONLY a JSON object, no markdown fences, no preamble, in exactly this shape:
{"meaning":"a single clear concise definition (max 25 words)","synonyms":["five","close","synonyms","of","word"],"antonyms":["five","clear","antonyms","if","possible"]}
If fewer than 5 genuine antonyms exist, return as many as genuinely exist (can be fewer than 5, never invented). Do not include the word itself in the lists.`;
}
function parseWordResponse(data){
  const textBlock = (data.content||[]).find(c=>c.type==='text');
  if(!textBlock) throw new Error('No response from dictionary service');
  let clean = textBlock.text.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
  const parsed = JSON.parse(clean);
  return {
    meaning: parsed.meaning || '',
    synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0,5) : [],
    antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms.slice(0,5) : []
  };
}
/* Five-tier lookup, in order, so adding a word almost never "fails":
   1. Bundled offline dictionary (instant, zero network, works anywhere).
   2. The built-in Claude connection (works instantly inside Claude, any word).
   3. Free Dictionary API + Datamuse — two public, keyless, CORS-enabled
      APIs. No signup, no cost, work identically inside or outside Claude
      as long as there's internet. This is the safety net for words the
      offline bank misses and for whenever Claude's own connection isn't
      reachable (e.g. exported outside Claude with no key set up yet).
   4. A personal Anthropic API key saved in Settings — used only if the
      free APIs came back incomplete (e.g. a definition with no synonyms).
   5. Manual entry — the true last resort, so the word is always captured
      even with no dictionary match and no network at all. */
function lookupOffline(word){
  const entry = OFFLINE_DICT[word.trim().toLowerCase()];
  if(!entry) return null;
  return { meaning: entry.meaning, synonyms: (entry.synonyms||[]).slice(0,5), antonyms: (entry.antonyms||[]).slice(0,5) };
}
function isGoodWordResult(r){
  return !!(r && r.meaning && (r.synonyms.length || r.antonyms.length));
}
async function lookupFreeDictionaryApi(word){
  try{
    const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.trim().toLowerCase()));
    if(!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if(!entry) return null;
    let meaning = '', syn = [], ant = [];
    (entry.meanings||[]).forEach(m=>{
      syn = syn.concat(m.synonyms||[]);
      ant = ant.concat(m.antonyms||[]);
      (m.definitions||[]).forEach(d=>{
        if(!meaning && d.definition) meaning = d.definition;
        syn = syn.concat(d.synonyms||[]);
        ant = ant.concat(d.antonyms||[]);
      });
    });
    if(!meaning) return null;
    return { meaning, synonyms: [...new Set(syn)], antonyms: [...new Set(ant)] };
  }catch(e){ return null; }
}
async function lookupDatamuse(word){
  const w = encodeURIComponent(word.trim().toLowerCase());
  try{
    const [synRes, antRes] = await Promise.all([
      fetch('https://api.datamuse.com/words?rel_syn=' + w + '&max=5'),
      fetch('https://api.datamuse.com/words?rel_ant=' + w + '&max=5')
    ]);
    const synData = synRes.ok ? await synRes.json() : [];
    const antData = antRes.ok ? await antRes.json() : [];
    return { synonyms: (synData||[]).map(x=>x.word), antonyms: (antData||[]).map(x=>x.word) };
  }catch(e){ return { synonyms: [], antonyms: [] }; }
}
/* dictionaryapi.dev often leaves synonyms/antonyms empty even when the
   definition is good, so Datamuse's word lists take priority for those
   two fields whenever it found anything; the dictionary API's own
   synonyms/antonyms only fill in if Datamuse came back empty too. */
async function lookupFreeApis(word){
  const [dict, dm] = await Promise.all([lookupFreeDictionaryApi(word), lookupDatamuse(word)]);
  const meaning = dict ? dict.meaning : '';
  const synonyms = (dm.synonyms.length ? dm.synonyms : (dict ? dict.synonyms : [])).slice(0,5);
  const antonyms = (dm.antonyms.length ? dm.antonyms : (dict ? dict.antonyms : [])).slice(0,5);
  if(!meaning && !synonyms.length && !antonyms.length) return null;
  return { meaning: meaning || '(No definition found — synonyms/antonyms below.)', synonyms, antonyms };
}
async function callClaudeForWord(word){
  const offline = lookupOffline(word);
  if(offline) return offline;

  const prompt = buildWordPrompt(word);
  const body = JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: prompt }] });

  try{
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body
    });
    if(res.ok){
      const claudeResult = parseWordResponse(await res.json());
      if(isGoodWordResult(claudeResult)) return claudeResult;
    }
  }catch(e){ /* not inside Claude, or offline — try the free APIs next */ }

  const freeResult = await lookupFreeApis(word);
  if(isGoodWordResult(freeResult)) return freeResult;

  const key = await getApiKey();
  if(key){
    const res2 = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body
    });
    if(res2.ok){
      const keyedResult = parseWordResponse(await res2.json());
      if(isGoodWordResult(keyedResult)) return keyedResult;
    }
  }

  if(freeResult && (freeResult.meaning || freeResult.synonyms.length || freeResult.antonyms.length)) return freeResult;
  const noKeyErr = new Error('NO_KEY'); noKeyErr.noKey = true; throw noKeyErr;
}

function findVocabByWord(word){
  const w = word.trim().toLowerCase();
  return DATA.vocab.find(v => v.word.trim().toLowerCase() === w);
}
function findVocabWhoseSynonymsInclude(word){
  const w = word.trim().toLowerCase();
  return DATA.vocab.find(v => (v.synonyms||[]).some(s=>s.trim().toLowerCase()===w));
}
function findVocabWhoseAntonymsInclude(word){
  const w = word.trim().toLowerCase();
  return DATA.vocab.find(v => (v.antonyms||[]).some(s=>s.trim().toLowerCase()===w));
}

let __pendingVocab = null; // {bookId, word, result}
let __manualPending = null; // {bookId, word}

async function submitVocabWord(bookId){
  const input = document.getElementById('vocab-input');
  const btn = document.getElementById('vocab-add-btn');
  const word = input.value.trim();
  if(!word){ vbvToast('Type a word first.', 'angry'); return; }

  const existing = findVocabByWord(word);
  if(existing){
    openModal(`
      <h3>Oh, come on.</h3>
      <div class="sub"></div>
      <p style="font-size:14.5px; line-height:1.6;">You already added <strong>"${escapeHtml(existing.word)}"</strong> to your register on ${fmtDate(existing.dateAdded)}.
      How exactly do you plan to clear the interview if you can't even remember a word you personally wrote down?
      Open your Vocab Register once in a while — it's not decoration.</p>
      <div class="modal-actions"><button class="vbv-btn btn-maroon btn-sm" onclick="closeModal()">Fine, noted</button></div>
    `);
    return;
  }

  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;
  let result;
  try{
    result = await callClaudeForWord(word);
  }catch(e){
    btn.innerHTML = 'Add Word'; btn.disabled = false;
    if(e && e.noKey){
      openManualEntryModal(bookId, word);
      return;
    }
    console.error(e);
    vbvToast('Could not reach the dictionary service — add it manually instead.', 'angry');
    openManualEntryModal(bookId, word);
    return;
  }
  btn.innerHTML = 'Add Word'; btn.disabled = false;
  proceedWithWordResult(bookId, word, result);
}

function proceedWithWordResult(bookId, word, result){
  const synHit = findVocabWhoseSynonymsInclude(word) || (result.synonyms||[]).map(s=>findVocabByWord(s)).find(Boolean);
  const antHit = findVocabWhoseAntonymsInclude(word) || (result.antonyms||[]).map(s=>findVocabByWord(s)).find(Boolean);

  __pendingVocab = { bookId, word, result };

  if(synHit){
    openModal(`
      <h3>Heads up — a synonym match</h3>
      <div class="sub">"${escapeHtml(word)}" is a synonym of a word already in your register.</div>
      <p style="font-size:14.5px; line-height:1.6;"><strong>${escapeHtml(word)}</strong> is a synonym of <strong>"${escapeHtml(synHit.word)}"</strong>, which you added on ${fmtDate(synHit.dateAdded)}.</p>
      <div class="modal-actions">
        <button class="vbv-btn btn-outline btn-sm" onclick="finalizeVocabAdd(null)">Add Separately</button>
        <button class="vbv-btn btn-maroon btn-sm" onclick="finalizeVocabAdd('${synHit.id}')">Add to "${escapeHtml(synHit.word)}"'s list</button>
      </div>
    `);
    return;
  }
  if(antHit){
    vbvToast(`Note: "${word}" is the opposite of "${antHit.word}" — already in your register.`, 'good');
  }
  finalizeVocabAdd(null);
}

function openManualEntryModal(bookId, word){
  __manualPending = { bookId, word };
  openModal(`
    <h3>Add "${escapeHtml(word)}" manually</h3>
    <div class="sub">No AI connection available right now — fill this in yourself and it'll still be sorted and cross-checked like any other word.</div>
    <label>Meaning</label>
    <textarea id="man-meaning" rows="2" placeholder="A short definition..."></textarea>
    <label style="margin-top:10px;">Synonyms (comma-separated, optional)</label>
    <input type="text" id="man-syn" placeholder="e.g. tireless, persistent, resolute">
    <label style="margin-top:10px;">Antonyms (comma-separated, optional)</label>
    <input type="text" id="man-ant" placeholder="e.g. weary, lazy">
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="submitManualWord()">Add Word</button>
    </div>
    <p style="font-size:11px; color:var(--navy-soft); margin-top:12px;">Tip: add an Anthropic API key in Settings (⚙ top right) to get automatic meanings/synonyms/antonyms anywhere this page is opened.</p>
  `);
}
function submitManualWord(){
  if(!__manualPending) return;
  const { bookId, word } = __manualPending;
  __manualPending = null;
  const meaning = (document.getElementById('man-meaning').value || '').trim() || 'No definition given.';
  const synonyms = (document.getElementById('man-syn').value || '').split(',').map(s=>s.trim()).filter(Boolean).slice(0,5);
  const antonyms = (document.getElementById('man-ant').value || '').split(',').map(s=>s.trim()).filter(Boolean).slice(0,5);
  proceedWithWordResult(bookId, word, { meaning, synonyms, antonyms });
}

/* ---- Settings: API key for use outside Claude ---- */
function openSettings(){
  getApiKey().then(key=>{
    const codeDisplay = ACTIVE_CODE ? ACTIVE_CODE.slice(0,3)+' '+ACTIVE_CODE.slice(3) : '—';
    openModal(`
      <h3>Settings</h3>
      <div class="sub">Everything here — book tracking, streaks, medals, highlights — works instantly, anywhere this page is opened, with no setup.</div>

      <div class="goal-box" style="border-top:none; padding-top:0;">
        <label>Your account code</label>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-family:'JetBrains Mono',monospace; font-size:20px; letter-spacing:3px; color:var(--maroon-dark);">${codeDisplay}</div>
          <button class="vbv-btn btn-outline btn-sm" onclick="copyAccountCode()">Copy</button>
        </div>
        <p style="font-size:11.5px; color:var(--navy-soft); margin-top:6px;">Enter this same code on any other browser (inside Claude) to pick up right where you left off. Keep it private — anyone with the code can open this account.</p>
      </div>

      <div class="goal-box">
        <p style="font-size:13px; line-height:1.6; color:var(--navy-soft);">The Vocab Register looks a word up in this order: a built-in offline word bank (zero internet needed) → Claude, when this page is inside Claude → two free public dictionary/thesaurus APIs that need no key at all → your own API key below, if you've added one → manual entry, if every automatic option comes up empty. In practice almost every word gets filled in automatically, with or without a key.</p>
        <label style="margin-top:6px;">Anthropic API key (optional)</label>
        <input type="text" id="api-key-input" placeholder="sk-ant-..." value="${escapeHtml(key)}">
        <p style="font-size:11px; color:var(--navy-soft); margin-top:8px;">Get one free at console.anthropic.com → API Keys. Stored only in this browser — never uploaded anywhere by this site. Don't share a copy of this file after typing your key in; export a clean copy first if you plan to send it to someone else.</p>
        <div class="modal-actions">
          <button class="vbv-btn btn-outline btn-sm" onclick="clearApiKey()">Clear Key</button>
          <button class="vbv-btn btn-maroon btn-sm" onclick="saveApiKeyFromSettings()">Save Key</button>
        </div>
      </div>

      <div class="goal-box">
        <label>Backup your data</label>
        <p style="font-size:11.5px; color:var(--navy-soft); margin-top:2px; margin-bottom:10px;">Download everything — books, vocab, streaks, medals, quiz history — as one file. Good practice before switching devices, and the only real safety net against a browser clearing its storage.</p>
        <div class="modal-actions" style="justify-content:flex-start;">
          <button class="vbv-btn btn-outline btn-sm" onclick="exportData()">Download Backup</button>
          <button class="vbv-btn btn-outline btn-sm" onclick="document.getElementById('import-file-input').click()">Restore From Backup</button>
        </div>
      </div>

      <div class="goal-box">
        <button class="vbv-btn btn-outline btn-sm" onclick="logout()">Log Out</button>
        <p style="font-size:11px; color:var(--navy-soft); margin-top:8px;">Also how you switch to — or create — a different account: log out, then choose "I Have a Code" or "First Time Here" on the next screen.</p>
      </div>

      <div class="goal-box">
        <label>Deploying this page</label>
        <p style="font-size:11.5px; color:var(--navy-soft); line-height:1.6; margin-top:2px;">This is one self-contained file — no separate assets to lose track of. To host it free: create a GitHub repo, upload this file renamed to <code>index.html</code>, then turn on Pages under Settings → Pages → Deploy from branch (main). It'll be live at <code>yourname.github.io/reponame</code> in a minute or two. Sending it over WhatsApp works exactly the same file, no changes needed.</p>
      </div>
    `);
  });
}
function copyAccountCode(){
  if(!ACTIVE_CODE) return;
  const text = ACTIVE_CODE;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=> vbvToast('Code copied.', 'good')).catch(()=> vbvToast('Could not copy — copy it manually.', 'angry'));
  } else {
    vbvToast('Copy not supported here — copy it manually: ' + ACTIVE_CODE.slice(0,3)+' '+ACTIVE_CODE.slice(3), 'good');
  }
}
async function saveApiKeyFromSettings(){
  const key = (document.getElementById('api-key-input').value || '').trim();
  await setApiKeyStored(key);
  closeModal();
  vbvToast(key ? 'API key saved in this browser.' : 'API key cleared.', 'good');
}
async function clearApiKey(){
  await setApiKeyStored('');
  closeModal();
  vbvToast('API key cleared.', 'good');
}

async function finalizeVocabAdd(mergeIntoId){
  closeModal();
  if(!__pendingVocab) return;
  const { bookId, word, result } = __pendingVocab;
  __pendingVocab = null;

  if(mergeIntoId){
    await attachSynonym(mergeIntoId, word);
    return;
  }
  const entry = {
    id: uid(), word: word, meaning: result.meaning,
    synonyms: result.synonyms||[], antonyms: result.antonyms||[],
    dateAdded: todayStr(), sourceBookId: bookId,
    sourceBookTitle: (DATA.ongoing.find(b=>b.id===bookId)||{}).title || ''
  };
  DATA.vocab.unshift(entry);
  const b = DATA.ongoing.find(x=>x.id===bookId);
  if(b){ b.vocabWordIds = b.vocabWordIds||[]; b.vocabWordIds.push(entry.id); }
  await saveData();
  const input = document.getElementById('vocab-input');
  if(input) input.value = '';
  vbvToast(`"${word}" added to your Vocab Register.`, 'good');
  navigate();
}

async function attachSynonym(vocabId, word){
  const v = DATA.vocab.find(x=>x.id===vocabId);
  if(!v) { closeModal(); return; }
  v.synonyms = v.synonyms||[];
  if(!v.synonyms.some(s=>s.toLowerCase()===word.toLowerCase())) v.synonyms.push(word);
  await saveData();
  closeModal();
  const input = document.getElementById('vocab-input');
  if(input) input.value = '';
  vbvToast(`"${word}" added to "${v.word}"'s synonym list.`, 'good');
  navigate();
}

function renderVocab(){
  const groups = {};
  [...DATA.vocab].sort((a,b)=>b.dateAdded.localeCompare(a.dateAdded)).forEach(v=>{
    groups[v.dateAdded] = groups[v.dateAdded] || [];
    groups[v.dateAdded].push(v);
  });
  const dates = Object.keys(groups).sort((a,b)=>b.localeCompare(a));
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.chetwode_day}')">
      <div class="page-eyebrow">Vocabulary Command</div>
      <h2>Vocab Register</h2>
      <p>Every word you've captured from your reading, sorted by the date you learnt it. Add new words from any ongoing book's log — they land here automatically.</p>
    </div>
    ${DATA.vocab.length >= 4 ? `
    <div class="panel" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
      <div><h3 style="margin-bottom:4px;">Ready to test yourself?</h3><p style="font-size:12.5px; color:var(--navy-soft);">A quick multiple-choice quiz pulled from these ${DATA.vocab.length} words.</p></div>
      <button class="vbv-btn btn-gold" onclick="location.hash='#/vocabtest'">Take a Test</button>
    </div>` : ''}
    ${DATA.vocab.length >= 1 ? `
    <div class="panel" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
      <div><h3 style="margin-bottom:4px;">Or drill with flashcards</h3><p style="font-size:12.5px; color:var(--navy-soft);">Flip through your words — the ones you know least come back more often.</p></div>
      <button class="vbv-btn btn-outline" onclick="location.hash='#/flashcards'">Review Flashcards</button>
    </div>` : ''}
    ${dates.length ? dates.map(d=>`
      <div class="vocab-day-group">
        <div class="vocab-day-label">${fmtDate(d)} &nbsp;·&nbsp; ${groups[d].length} word${groups[d].length>1?'s':''}</div>
        ${groups[d].map(vocabCardHtml).join('')}
      </div>
    `).join('') : `<div class="vbv-empty-state"><h4>Register is empty</h4><p>Open any ongoing book and add a word — it will appear here.</p></div>`}
  </div>`;
}
function vocabCardHtml(v){
  return `
  <div class="vocab-card" id="vc-${v.id}">
    <div class="vocab-word-row" onclick="document.getElementById('vc-${v.id}').classList.toggle('open')">
      <div><span class="vocab-word">${escapeHtml(v.word)}</span> <span class="mastery-dots" title="Flashcard mastery">${masteryDots(v.mastery)}</span></div>
      <div class="vocab-source">${v.sourceBookTitle ? 'from "'+escapeHtml(v.sourceBookTitle)+'"' : ''}</div>
    </div>
    <div class="vocab-body">
      <div class="vocab-meaning">${escapeHtml(v.meaning)}</div>
      <div class="tag-group"><span class="lbl">Synonyms</span>${(v.synonyms||[]).map(s=>`<span class="tag syn">${escapeHtml(s)}</span>`).join('') || '<span class="tag">none found</span>'}</div>
      <div class="tag-group"><span class="lbl">Antonyms</span>${(v.antonyms||[]).map(s=>`<span class="tag ant">${escapeHtml(s)}</span>`).join('') || '<span class="tag">none found</span>'}</div>
      <button class="vbv-btn btn-outline btn-sm" style="margin-top:8px;" onclick="openDeleteVocabModal('${v.id}')">Remove Word</button>
    </div>
  </div>`;
}
function openDeleteVocabModal(vocabId){
  const v = DATA.vocab.find(x=>x.id===vocabId);
  if(!v) return;
  openModal(`
    <h3>Remove "${escapeHtml(v.word)}"?</h3>
    <div class="sub">This deletes it from your Vocab Register, including its meaning and synonym/antonym lists. This can't be undone.</div>
    <div class="modal-actions">
      <button class="vbv-btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
      <button class="vbv-btn btn-maroon btn-sm" onclick="confirmDeleteVocab('${vocabId}')">Remove It</button>
    </div>
  `);
}
async function confirmDeleteVocab(vocabId){
  DATA.vocab = DATA.vocab.filter(v=>v.id!==vocabId);
  await saveData();
  closeModal();
  vbvToast('Removed from your Vocab Register.', 'good');
  navigate();
}

/* ================= ACADEMY / GALLERY PAGE ================= */
function renderAcademy(){
  return `
  <div class="page">
    <div class="page-head">
      <div class="page-eyebrow">The Spirit Behind the Discipline</div>
      <h2>Indian Military Academy, Dehradun</h2>
      <p>Motto: <em>Veer Bhogya Vasundhara</em> — "The brave shall inherit the earth." A reminder for every page turned and every word learnt on the way there.</p>
    </div>

    <div class="about-grid">
      <div class="tilt-wrap"><img class="tilt-img" id="tilt-1" src="${IMG.chetwode_day}" alt="Chetwode Hall under monsoon skies"></div>
      <div>
        <h3 style="margin-bottom:10px;">Chetwode Hall</h3>
        <p style="color:var(--navy-soft); line-height:1.7; font-size:14.5px;">The administrative heart of the Academy, its facade lined with the words every cadet is made to live by: the safety, honour and welfare of your country come first, always and every time. This site borrows that same standard for a far smaller battlefield — your reading list.</p>
      </div>
    </div>

    <div class="section-title-row"><h3>What discipline builds</h3></div>
    <div class="milestone-grid">
      <div class="milestone-tile" style="background-image:url('${IMG.parade_ncc}')">
        <h4>Before sunrise</h4><p>The day begins long before comfort would prefer — a habit this register asks you to bring to your reading too.</p>
      </div>
      <div class="milestone-tile" style="background-image:url('${IMG.mud}')">
        <h4>On the ground</h4><p>Training tests the body to reveal the will. Track your ongoing books the same way: log every session, however small.</p>
      </div>
      <div class="milestone-tile" style="background-image:url('${IMG.heli_parade}')">
        <h4>In the classroom</h4><p>Vocabulary and comprehension are quietly graded skills for every service interview. Your Vocab Register is built for that exact test.</p>
      </div>
      <div class="milestone-tile" style="background-image:url('${IMG.officers_march}')">
        <h4>On parade</h4><p>What's rehearsed daily eventually looks effortless. That's the whole idea behind Completed Books — proof of days that added up.</p>
      </div>
    </div>
  </div>`;
}

/* ================= EFFICIENCY: rAF-throttled handlers ================= */
function rafThrottle(fn){
  let ticking = false, lastArgs = null;
  return function(...args){
    lastArgs = args;
    if(!ticking){
      ticking = true;
      requestAnimationFrame(()=>{ fn.apply(this, lastArgs); ticking = false; });
    }
  };
}

/* ================= 3D TILT (signature hero moments) + BOARD DRAG + TIMER ================= */
function bindPageEvents(routeName, routeId){
  if(routeName === 'home'){
    const hero = document.getElementById('hero');
    const heroImg = document.getElementById('hero-img');
    if(hero && heroImg){
      const onMove = rafThrottle((e)=>{
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left)/r.width - 0.5;
        const y = (e.clientY - r.top)/r.height - 0.5;
        heroImg.style.transform = `scale(1.06) translate(${x*-14}px, ${y*-10}px)`;
      });
      hero.addEventListener('mousemove', onMove);
      hero.addEventListener('mouseleave', ()=>{ heroImg.style.transform = 'scale(1) translate(0,0)'; });
    }
  }
  if(routeName === 'academy'){
    const img = document.getElementById('tilt-1');
    const wrap = img ? img.parentElement : null;
    if(wrap && img){
      const onMove = rafThrottle((e)=>{
        const r = wrap.getBoundingClientRect();
        const x = (e.clientX - r.left)/r.width - 0.5;
        const y = (e.clientY - r.top)/r.height - 0.5;
        img.style.transform = `rotateY(${x*10}deg) rotateX(${-y*10}deg)`;
      });
      wrap.addEventListener('mousemove', onMove);
      wrap.addEventListener('mouseleave', ()=>{ img.style.transform = 'rotateY(0) rotateX(0)'; });
    }
  }
  if(routeName === 'ongoingDetail'){
    const b = DATA.ongoing.find(x=>x.id===routeId);
    if(b && b.activeTimerStart){
      const disp = document.getElementById('timer-display');
      const tick = ()=>{
        const secs = Math.max(0, Math.floor((Date.now() - new Date(b.activeTimerStart).getTime())/1000));
        const hh = String(Math.floor(secs/3600)).padStart(2,'0');
        const mm = String(Math.floor((secs%3600)/60)).padStart(2,'0');
        const ss = String(secs%60).padStart(2,'0');
        if(disp) disp.textContent = `${hh}:${mm}:${ss}`;
      };
      tick();
      timerInterval = setInterval(tick, 1000);
    }
  }
}

/* ================= CONFETTI (celebration moment) ================= */
function celebrate(){
  const layer = document.getElementById('confetti-layer');
  if(!layer) return;
  const colors = ['#B8862F','#A32A20','#3E6E93','#516B4E','#EAE3D0'];
  for(let i=0;i<48;i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const size = 6 + Math.random()*6;
    p.style.width = size+'px';
    p.style.height = (size*0.4+4)+'px';
    p.style.left = Math.random()*100+'vw';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDuration = (2.2+Math.random()*1.6)+'s';
    p.style.animationDelay = (Math.random()*0.3)+'s';
    layer.appendChild(p);
    setTimeout(()=>p.remove(), 4200);
  }
}

/* ================= PROGRESS HELPERS ================= */
function totalPagesAllTime(d){
  d = d || DATA;
  let t = 0;
  d.ongoing.forEach(b=> t += (b.logs||[]).reduce((a,l)=>a+Number(l.pages||0),0));
  d.completed.forEach(b=> t += (b.logs||[]).reduce((a,l)=>a+Number(l.pages||0),0));
  return t;
}
function totalHighlights(d){
  d = d || DATA;
  let t = 0;
  d.ongoing.forEach(b=> t += (b.notes||[]).length);
  d.completed.forEach(b=> t += (b.notes||[]).length);
  return t;
}
function allLogDates(d){
  d = d || DATA;
  const set = new Set();
  [...d.ongoing, ...d.completed].forEach(b=> (b.logs||[]).forEach(l=>{ if(l.date) set.add(l.date); }));
  return set;
}
function dateKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function computeStreaks(d){
  d = d || DATA;
  const dates = allLogDates(d);
  if(dates.size===0) return {current:0, longest:0};
  const sorted = [...dates].sort();
  let longest = 1, run = 1;
  for(let i=1;i<sorted.length;i++){
    const diffDays = Math.round((new Date(sorted[i]+'T00:00:00') - new Date(sorted[i-1]+'T00:00:00'))/86400000);
    run = (diffDays===1) ? run+1 : 1;
    longest = Math.max(longest, run);
  }
  let current = 0;
  let cursor = new Date(todayStr()+'T00:00:00');
  while(dates.has(dateKey(cursor))){ current++; cursor.setDate(cursor.getDate()-1); }
  if(current===0){
    cursor = new Date(todayStr()+'T00:00:00');
    cursor.setDate(cursor.getDate()-1);
    while(dates.has(dateKey(cursor))){ current++; cursor.setDate(cursor.getDate()-1); }
  }
  return {current, longest};
}

/* ================= ACHIEVEMENTS / STICKERS ================= */
const ACHIEVEMENTS = [
  // Vocabulary
  {id:'first_word', title:'First Word', icon:'🔤', desc:'Add your first word to the Vocab Register.', check: d=> d.vocab.length>=1},
  {id:'word_10', title:'First Squad', icon:'🔡', desc:'Collect 10 words.', check: d=> d.vocab.length>=10},
  {id:'word_25', title:'Word Hoarder', icon:'📖', desc:'Collect 25 words.', check: d=> d.vocab.length>=25},
  {id:'word_50', title:'Half a Hundred', icon:'📘', desc:'Collect 50 words.', check: d=> d.vocab.length>=50},
  {id:'word_100', title:'Vocabulary Commander', icon:'🎖️', desc:'Collect 100 words.', check: d=> d.vocab.length>=100},
  {id:'word_150', title:'Lexicon Warrior', icon:'🗡️', desc:'Collect 150 words.', check: d=> d.vocab.length>=150},
  {id:'word_200', title:'Word Legion', icon:'🏛️', desc:'Collect 200 words.', check: d=> d.vocab.length>=200},
  {id:'word_300', title:'Master of Words', icon:'👑', desc:'Collect 300 words.', check: d=> d.vocab.length>=300},
  {id:'vocab_source_variety', title:'Well-Traveled Reader', icon:'🗺️', desc:'Learn words sourced from at least 3 different books.', check: d=> new Set(d.vocab.map(v=>v.sourceBookId).filter(Boolean)).size>=3},
  // Books completed
  {id:'first_book', title:'First Salute', icon:'🫡', desc:'Complete your first book.', check: d=> d.completed.length>=1},
  {id:'book_3', title:'Triple Tour', icon:'📗', desc:'Complete 3 books.', check: d=> d.completed.length>=3},
  {id:'book_5', title:'Bookworm Battalion', icon:'📚', desc:'Complete 5 books.', check: d=> d.completed.length>=5},
  {id:'book_10', title:'Century Reader', icon:'🏅', desc:'Complete 10 books.', check: d=> d.completed.length>=10},
  {id:'book_15', title:'Field Marshal Reader', icon:'🎗️', desc:'Complete 15 books.', check: d=> d.completed.length>=15},
  {id:'book_20', title:'Battalion Commander', icon:'🏵️', desc:'Complete 20 books.', check: d=> d.completed.length>=20},
  {id:'book_25', title:'Quarter Century', icon:'🏆', desc:'Complete 25 books.', check: d=> d.completed.length>=25},
  {id:'book_50', title:'Half-Century Hero', icon:'👑', desc:'Complete 50 books.', check: d=> d.completed.length>=50},
  // Streaks
  {id:'streak_3', title:'Steady Recruit', icon:'🔥', desc:'Log reading 3 days in a row.', check: d=> computeStreaks(d).current>=3},
  {id:'streak_7', title:'Iron Discipline', icon:'⚔️', desc:'Log reading 7 days in a row.', check: d=> computeStreaks(d).current>=7},
  {id:'streak_14', title:'Fortnight Discipline', icon:'📆', desc:'Log reading 14 days in a row.', check: d=> computeStreaks(d).current>=14},
  {id:'streak_30', title:'Unbreakable', icon:'🛡️', desc:'Log reading 30 days in a row.', check: d=> computeStreaks(d).current>=30},
  {id:'streak_60', title:'Veteran Reader', icon:'🦅', desc:'Log reading 60 days in a row.', check: d=> computeStreaks(d).current>=60},
  {id:'streak_100', title:'Century of Days', icon:'💯', desc:'Log reading 100 days in a row.', check: d=> computeStreaks(d).current>=100},
  // Pages
  {id:'pages_100', title:'First Mile', icon:'🚩', desc:'Log 100 pages in total.', check: d=> totalPagesAllTime(d)>=100},
  {id:'pages_500', title:'Long March', icon:'🎒', desc:'Log 500 pages in total.', check: d=> totalPagesAllTime(d)>=500},
  {id:'pages_1000', title:'Page Marcher', icon:'🥾', desc:'Log 1,000 pages in total.', check: d=> totalPagesAllTime(d)>=1000},
  {id:'pages_2500', title:'Endurance Trek', icon:'🏔️', desc:'Log 2,500 pages in total.', check: d=> totalPagesAllTime(d)>=2500},
  {id:'pages_5000', title:'Distance Runner', icon:'🥇', desc:'Log 5,000 pages in total.', check: d=> totalPagesAllTime(d)>=5000},
  {id:'pages_10000', title:'Grand Campaign', icon:'🌄', desc:'Log 10,000 pages in total.', check: d=> totalPagesAllTime(d)>=10000},
  // Highlights
  {id:'notes_10', title:'Note Taker', icon:'📝', desc:'Save 10 highlights from your books.', check: d=> totalHighlights(d)>=10},
  {id:'notes_25', title:'Field Notes', icon:'🗒️', desc:'Save 25 highlights.', check: d=> totalHighlights(d)>=25},
  {id:'notes_50', title:'Chronicle Keeper', icon:'📔', desc:'Save 50 highlights.', check: d=> totalHighlights(d)>=50},
  // Ratings, reviews & pace
  {id:'five_star', title:'Five Star General', icon:'⭐', desc:'Rate a completed book 5 stars.', check: d=> d.completed.some(b=>b.rating===5)},
  {id:'rated_10', title:"Critic's Eye", icon:'🔍', desc:'Rate 10 completed books.', check: d=> d.completed.filter(b=>b.rating>0).length>=10},
  {id:'reviewed_10', title:'War Correspondent', icon:'🖋️', desc:'Write a review for 10 completed books.', check: d=> d.completed.filter(b=>b.review && b.review.trim()).length>=10},
  {id:'speed_reader', title:'Speed Reader', icon:'🐇', desc:'Finish a book within 3 days of starting.', check: d=> d.completed.some(b=> (new Date(b.endAt)-new Date(b.startAt))/86400000 <= 3)},
  {id:'same_day_finish', title:'Dawn to Dusk', icon:'🌅', desc:'Start and finish a book on the same day.', check: d=> d.completed.some(b=> b.startDate===b.endDate)},
  {id:'big_book', title:'Heavyweight Campaign', icon:'🏋️', desc:'Complete a book of 500+ pages.', check: d=> d.completed.some(b=> (b.totalPages||0)>=500)},
  {id:'pace_blitz', title:'Blitzkrieg Reader', icon:'⚡', desc:'Earn a top Blitz Pace rating on any completed book.', check: d=> d.completed.some(b=> b.totalPages && paceRating(b.totalPages,b.startAt,b.endAt) && paceRating(b.totalPages,b.startAt,b.endAt).stars===5)},
  // Time of day
  {id:'dawn_patrol', title:'Dawn Patrol', icon:'🌄', desc:'Start a book before 6 AM.', check: d=> [...d.ongoing, ...d.completed].some(b=> b.startAt && new Date(b.startAt).getHours() < 6)},
  {id:'midnight_reader', title:'Midnight Watch', icon:'🌙', desc:'Start a book at or after 11 PM.', check: d=> [...d.ongoing, ...d.completed].some(b=> b.startAt && new Date(b.startAt).getHours() >= 23)},
  // Vocab Test
  {id:'quiz_first', title:'First Inspection', icon:'📋', desc:'Complete your first Vocab Test.', check: d=> (d.quizHistory||[]).length>=1},
  {id:'quiz_5', title:'Drill Regular', icon:'🗓️', desc:'Complete 5 Vocab Tests.', check: d=> (d.quizHistory||[]).length>=5},
  {id:'quiz_10', title:'Drill Sergeant', icon:'📐', desc:'Complete 10 Vocab Tests.', check: d=> (d.quizHistory||[]).length>=10},
  {id:'quiz_perfect', title:'Sharpshooter', icon:'🎯', desc:'Score 100% on a test of at least 5 questions.', check: d=> (d.quizHistory||[]).some(h=>h.percent===100 && h.total>=5)},
  {id:'quiz_perfect_3', title:'Triple Bullseye', icon:'🎪', desc:'Score 100% on three separate tests.', check: d=> (d.quizHistory||[]).filter(h=>h.percent===100).length>=3},
  {id:'quiz_avg80', title:'Sharp Mind', icon:'🧠', desc:'Average 80%+ across your last 5 tests.', check: d=> { const h=(d.quizHistory||[]).slice(-5); return h.length>=5 && (h.reduce((s,x)=>s+x.percent,0)/h.length)>=80; }},
  {id:'quiz_comeback', title:'The Comeback', icon:'📈', desc:'Score 20+ points higher than your previous test.', check: d=> { const h=d.quizHistory||[]; return h.length>=2 && (h[h.length-1].percent - h[h.length-2].percent)>=20; }},
  {id:'quiz_type_master', title:'Triple Threat', icon:'🎓', desc:'Complete a test in each type — Meanings, Synonyms, and Antonyms only.', check: d=> { const t=new Set((d.quizHistory||[]).map(h=>h.type)); return t.has('meaning')&&t.has('synonym')&&t.has('antonym'); }},
  // Tenure
  {id:'tenure_7', title:'One Week In', icon:'📅', desc:'7 days since you created your account.', check: d=> d.createdAt && (Date.now()-new Date(d.createdAt).getTime())/86400000>=7},
  {id:'tenure_30', title:'One Month of Service', icon:'🎫', desc:'30 days since you created your account.', check: d=> d.createdAt && (Date.now()-new Date(d.createdAt).getTime())/86400000>=30},
  {id:'tenure_100', title:'Hundred Days', icon:'🎖', desc:'100 days since you created your account.', check: d=> d.createdAt && (Date.now()-new Date(d.createdAt).getTime())/86400000>=100},
  {id:'tenure_365', title:'One Year Standing', icon:'🎉', desc:'365 days since you created your account.', check: d=> d.createdAt && (Date.now()-new Date(d.createdAt).getTime())/86400000>=365},
  // Workspace & meta
  {id:'upcoming_10', title:'Full Armory', icon:'🗃️', desc:'Have 10 books queued in Upcoming at once.', check: d=> d.upcoming.length>=10},
  {id:'all_rounder', title:'All-Rounder Cadet', icon:'🌟', desc:'Complete a book, learn a word, save a highlight, and finish a test — all at least once.', check: d=> d.completed.length>=1 && d.vocab.length>=1 && totalHighlights(d)>=1 && (d.quizHistory||[]).length>=1},
  {id:'decorated_veteran', title:'Decorated Veteran', icon:'🎖️', desc:'Unlock 40 other medals.', check: d=> d.achievements.length>=40},
  {id:'flash_mastered_10', title:'Flash Discipline', icon:'🃏', desc:'Get 10 words to full mastery in Flashcards.', check: d=> d.vocab.filter(v=>(v.mastery||0)>=5).length>=10},
  {id:'genre_explorer', title:'Genre Explorer', icon:'🧭', desc:'Complete a book in 3 different categories.', check: d=> new Set(d.completed.map(b=>b.category).filter(Boolean)).size>=3},
  {id:'triple_crown', title:'Triple Crown', icon:'👑', desc:'Score 80%+ on the Basic, Intermediate, and Advanced level quizzes.', check: d=> d.levels && ['basic','intermediate','advanced'].every(l=> (d.levels.quizScores[l]||0)>=80)},
  {id:'grammar_scholar', title:'Grammar Scholar', icon:'📜', desc:'Review every grammar point across all three levels.', check: d=> d.levels && ['basic','intermediate','advanced'].every(l=> (d.levels.viewed[l].grammar||[]).length>=5)},
];
function checkAndUnlockAchievements(){
  const unlockedIds = new Set(DATA.achievements.map(a=>a.id));
  const newly = [];
  ACHIEVEMENTS.forEach(a=>{
    if(!unlockedIds.has(a.id) && a.check(DATA)){
      DATA.achievements.push({id:a.id, dateUnlocked: todayStr()});
      newly.push(a);
    }
  });
  return newly;
}
function renderAchievements(){
  const unlockedMap = {};
  DATA.achievements.forEach(a=> unlockedMap[a.id]=a.dateUnlocked);
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.mud}')">
      <div class="page-eyebrow">Wall of Honour</div>
      <h2>Medals &amp; Stickers</h2>
      <p>Earned through logged pages, finished books, and words learnt — never handed out.</p>
    </div>
    <div class="sticker-grid">
      ${ACHIEVEMENTS.map(a=>{
        const earned = unlockedMap[a.id];
        return `<div class="sticker ${earned?'':'locked'}">
          <div class="sticker-icon">${a.icon}</div>
          <h5>${escapeHtml(a.title)}</h5>
          <p>${escapeHtml(a.desc)}</p>
          ${earned ? `<div class="earned-date">Earned ${fmtDate(earned)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ================= DASHBOARD / PROGRESS TRACKER ================= */
function renderDashboard(){
  const streaks = computeStreaks();
  const totalPages = totalPagesAllTime();
  const today = todayStr();
  const pagesToday = [...DATA.ongoing, ...DATA.completed].reduce((s,b)=> s + (b.logs||[]).filter(l=>l.date===today).reduce((a,l)=>a+Number(l.pages||0),0), 0);
  const thisMonth = today.slice(0,7);
  const booksThisMonth = DATA.completed.filter(b=> (b.endDate||'').slice(0,7)===thisMonth).length;
  const goal = DATA.goal;
  const pagesPct = goal.dailyPages ? Math.min(100, Math.round(100*pagesToday/goal.dailyPages)) : 0;
  const booksPct = goal.monthlyBooks ? Math.min(100, Math.round(100*booksThisMonth/goal.monthlyBooks)) : 0;

  const days = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate()-83);
  for(let i=0;i<84;i++){
    const key = dateKey(cursor);
    const pages = [...DATA.ongoing, ...DATA.completed].reduce((s,b)=> s+(b.logs||[]).filter(l=>l.date===key).reduce((a,l)=>a+Number(l.pages||0),0),0);
    let level = 0;
    if(pages>0) level=1;
    if(pages>=15) level=2;
    if(pages>=30) level=3;
    if(pages>=60) level=4;
    days.push({key, pages, level});
    cursor.setDate(cursor.getDate()+1);
  }

  const recentAch = [...DATA.achievements].sort((a,b)=>b.dateUnlocked.localeCompare(a.dateUnlocked)).slice(0,6)
    .map(a=> ACHIEVEMENTS.find(x=>x.id===a.id)).filter(Boolean);

  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.officers_march}')">
      <div class="page-eyebrow">Command Dashboard</div>
      <h2>Progress Tracker</h2>
      <p>Your reading discipline, measured daily — not just remembered fondly.</p>
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="streak-row">
          <div class="streak-flame">🔥</div>
          <div><div class="streak-num">${streaks.current}</div><div class="streak-lbl">day current streak · best ${streaks.longest}</div></div>
        </div>
        <h4 style="font-size:14px; margin-bottom:6px;">Last 12 weeks</h4>
        <div class="heatmap">
          ${days.map(d=>`<div class="vbv-heat-cell" data-level="${d.level}" data-tip="${fmtDate(d.key)} — ${d.pages}p"></div>`).join('')}
        </div>
      </div>

      <div class="panel">
        <h4 style="font-size:14px; margin-bottom:2px;">Monthly Goal</h4>
        <div class="goal-box" style="border-top:none; padding-top:6px;">
          <div class="goal-label"><span>Books this month</span><span>${booksThisMonth} / ${goal.monthlyBooks}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${booksPct}%; background:var(--sage);"></div></div>
        </div>
        <div class="goal-box">
          <div class="goal-label"><span>Pages today</span><span>${pagesToday} / ${goal.dailyPages}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pagesPct}%;"></div></div>
        </div>
        <div class="goal-box">
          <label style="margin-top:4px;">Set new goal</label>
          <div class="form-row">
            <div><label>Books / month</label><input type="number" min="1" id="goal-books" value="${goal.monthlyBooks}"></div>
            <div><label>Pages / day</label><input type="number" min="1" id="goal-pages" value="${goal.dailyPages}"></div>
          </div>
          <button class="vbv-btn btn-outline btn-sm" onclick="saveGoal()">Save Goal</button>
        </div>
      </div>
    </div>

    <div class="stat-row">
      <div class="vbv-stat-card"><div class="num">${totalPages}</div><div class="lbl">Total Pages Logged</div></div>
      <div class="vbv-stat-card"><div class="num">${DATA.completed.length}</div><div class="lbl">Books Completed</div></div>
      <div class="vbv-stat-card"><div class="num">${DATA.vocab.length}</div><div class="lbl">Words Commanded</div></div>
      <div class="vbv-stat-card"><div class="num">${totalHighlights()}</div><div class="lbl">Highlights Saved</div></div>
    </div>

    <div class="section-title-row"><h3>Recent Medals</h3><a href="#/achievements">View all →</a></div>
    <div class="mini-badge-row">
      ${recentAch.length ? recentAch.map(a=>`<div class="mini-sticker" title="${escapeHtml(a.title)}">${a.icon}</div>`).join('') :
      `<p style="font-size:13px; color:var(--navy-soft);">No medals yet — log a page or add a word to start earning them.</p>`}
    </div>
  </div>`;
}
async function saveGoal(){
  guardBtn();
  const books = Number(document.getElementById('goal-books').value) || 1;
  const pages = Number(document.getElementById('goal-pages').value) || 1;
  DATA.goal = { monthlyBooks: books, dailyPages: pages };
  await saveData();
  vbvToast('Goal updated.', 'good');
  navigate();
}

/* ================= KANBAN BOARD (multi-system workspace view) ================= */
function boardCardHtml(b, col){
  const extra = col==='completed' ? `<div class="b-meta">${b.rating ? '★'.repeat(b.rating) : 'not rated'}</div>` :
                col==='ongoing' ? `<div class="b-meta">${(b.logs||[]).reduce((a,l)=>a+Number(l.pages||0),0)}p logged</div>` :
                `<div class="b-meta">Added ${fmtDate((b.addedAt||'').slice(0,10))}</div>`;
  const moveBtn = col==='upcoming' ? `<button class="vbv-btn btn-outline btn-sm board-move-btn" onclick="event.stopPropagation(); openStartModal('${b.id}', true)">Start →</button>` :
                  col==='ongoing' ? `<button class="vbv-btn btn-outline btn-sm board-move-btn" onclick="event.stopPropagation(); openCompleteModal('${b.id}', true)">Complete →</button>` : '';
  return `<div class="board-card" draggable="true" data-id="${b.id}" data-col="${col}" ondragstart="onCardDragStart(event)" ondragend="onCardDragEnd(event)">
    <h5>${escapeHtml(b.title)}</h5>
    <div class="b-meta">${escapeHtml(b.author||'')}</div>
    ${extra}
    ${moveBtn}
  </div>`;
}
function renderBoard(){
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.parade_ncc}')">
      <div class="page-eyebrow">Workspace</div>
      <h2>Reading Board</h2>
      <p>Drag a title on desktop, or tap "Move →" on a card — both push it forward: Upcoming → Ongoing → Completed.</p>
    </div>
    <div class="board">
      <div class="board-col" data-col="upcoming" ondragover="onColDragOver(event)" ondragleave="onColDragLeave(event)" ondrop="onColDrop(event)">
        <div class="board-col-head"><h4>Upcoming</h4><span class="board-count">${DATA.upcoming.length}</span></div>
        ${DATA.upcoming.length ? DATA.upcoming.map(b=>boardCardHtml(b,'upcoming')).join('') : '<div class="board-empty">Empty queue</div>'}
      </div>
      <div class="board-col" data-col="ongoing" ondragover="onColDragOver(event)" ondragleave="onColDragLeave(event)" ondrop="onColDrop(event)">
        <div class="board-col-head"><h4>Ongoing</h4><span class="board-count">${DATA.ongoing.length}</span></div>
        ${DATA.ongoing.length ? DATA.ongoing.map(b=>boardCardHtml(b,'ongoing')).join('') : '<div class="board-empty">Nothing in progress</div>'}
      </div>
      <div class="board-col" data-col="completed" ondragover="onColDragOver(event)" ondragleave="onColDragLeave(event)" ondrop="onColDrop(event)">
        <div class="board-col-head"><h4>Completed</h4><span class="board-count">${DATA.completed.length}</span></div>
        ${DATA.completed.length ? DATA.completed.map(b=>boardCardHtml(b,'completed')).join('') : '<div class="board-empty">Nothing filed yet</div>'}
      </div>
    </div>
  </div>`;
}
let dragPayload = null;
function onCardDragStart(e){
  dragPayload = { id: e.currentTarget.dataset.id, col: e.currentTarget.dataset.col };
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function onCardDragEnd(e){ e.currentTarget.classList.remove('dragging'); }
function onColDragOver(e){ e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function onColDragLeave(e){ e.currentTarget.classList.remove('drag-over'); }
async function onColDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if(!dragPayload) return;
  const targetCol = e.currentTarget.dataset.col;
  const { id, col } = dragPayload;
  dragPayload = null;
  if(col===targetCol) return;
  if(col==='upcoming' && targetCol==='ongoing'){ openStartModal(id, true); return; }
  if(col==='ongoing' && targetCol==='completed'){ openCompleteModal(id, true); return; }
  vbvToast('Books move forward one stage at a time — Upcoming → Ongoing → Completed.', 'angry');
}

/* ================= GLOBAL SEARCH ================= */
function openSearch(){
  openModal(`
    <h3>Search your library</h3>
    <div class="sub">Books and vocabulary, all in one place.</div>
    <input type="text" id="search-input" placeholder="Start typing a title or word..." oninput="runSearch()">
    <div id="search-results" style="margin-top:12px; max-height:320px; overflow:auto;"></div>
  `);
  setTimeout(()=>{ const el = document.getElementById('search-input'); if(el) el.focus(); }, 60);
}
function runSearch(){
  const q = (document.getElementById('search-input').value || '').trim().toLowerCase();
  const box = document.getElementById('search-results');
  if(!q){ box.innerHTML=''; window.searchResults=[]; return; }
  const results = [];
  DATA.ongoing.forEach(b=>{ if(b.title.toLowerCase().includes(q)) results.push({label:b.title, tag:'Ongoing', hash:'#/ongoingDetail/'+b.id}); });
  DATA.completed.forEach(b=>{ if(b.title.toLowerCase().includes(q)) results.push({label:b.title, tag:'Completed', hash:'#/completed'}); });
  DATA.upcoming.forEach(b=>{ if(b.title.toLowerCase().includes(q)) results.push({label:b.title, tag:'Upcoming', hash:'#/upcoming'}); });
  DATA.vocab.forEach(v=>{ if(v.word.toLowerCase().includes(q)) results.push({label:v.word, tag:'Vocab', hash:'#/vocab'}); });
  window.searchResults = results;
  box.innerHTML = results.length ? results.slice(0,30).map((r,i)=>
    `<div class="search-result" onclick="goToSearchResult(${i})"><span>${escapeHtml(r.label)}</span><span class="tag-sm">${r.tag}</span></div>`
  ).join('') : `<p style="font-size:13px; color:var(--navy-soft);">No matches.</p>`;
}
function goToSearchResult(i){
  const r = (window.searchResults||[])[i];
  if(!r) return;
  closeModal();
  location.hash = r.hash;
}

/* ================= VOCAB TEST ================= */
let QUIZ_STATE = { phase: 'setup' };
let QUIZ_SETUP = { count: 10, timeSec: 300, type: 'mixed' };

function shuffleArray(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function formatMMSS(totalSec){
  const s = Math.max(0, totalSec);
  const m = Math.floor(s/60);
  const sec = s%60;
  return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
}
function buildSingleQuestion(entry, qType){
  if(qType === 'meaning'){
    const correct = entry.meaning;
    if(!correct) return null;
    const distractors = shuffleArray(
      DATA.vocab.filter(v=>v.id!==entry.id && v.meaning && v.meaning.toLowerCase()!==correct.toLowerCase()).map(v=>v.meaning)
    ).slice(0,3);
    if(distractors.length < 3) return null;
    return { word: entry.word, type:'meaning', prompt: `What does "${entry.word}" mean?`, options: shuffleArray([correct, ...distractors]), correctAnswer: correct };
  }
  const list = qType==='synonym' ? entry.synonyms : entry.antonyms;
  if(!list || !list.length) return null;
  const correct = list[Math.floor(Math.random()*list.length)];
  const distractors = shuffleArray(
    DATA.vocab.filter(v=>v.id!==entry.id && v.word.toLowerCase()!==correct.toLowerCase()).map(v=>v.word)
  ).slice(0,3);
  if(distractors.length < 3) return null;
  const label = qType==='synonym' ? 'a synonym' : 'an antonym';
  return { word: entry.word, type:qType, prompt: `Which is ${label} of "${entry.word}"?`, options: shuffleArray([correct, ...distractors]), correctAnswer: correct };
}
function buildQuizQuestions(count, typeFilter){
  if(DATA.vocab.length < 4) return [];
  const pool = shuffleArray(DATA.vocab);
  const questions = [];
  for(const entry of pool){
    if(questions.length >= count) break;
    const availableTypes = ['meaning'];
    if((entry.synonyms||[]).length) availableTypes.push('synonym');
    if((entry.antonyms||[]).length) availableTypes.push('antonym');
    let qType = typeFilter;
    if(typeFilter === 'mixed'){
      qType = availableTypes[Math.floor(Math.random()*availableTypes.length)];
    } else if(!availableTypes.includes(typeFilter)){
      continue;
    }
    const q = buildSingleQuestion(entry, qType);
    if(q) questions.push(q);
  }
  return questions;
}

function renderQuizSetup(){
  QUIZ_STATE = { phase: 'setup' };
  const vocabCount = DATA.vocab.length;
  const countOptions = [5,10,15,20].filter(n=>n<=vocabCount);
  if(!countOptions.length && vocabCount>=4) countOptions.push(vocabCount);
  QUIZ_SETUP = {
    count: countOptions.includes(10) ? 10 : (countOptions[countOptions.length-1] || vocabCount),
    timeSec: 300,
    type: 'mixed'
  };
  const hist = DATA.quizHistory || [];
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.heli_parade}')">
      <div class="page-eyebrow">Vocabulary Command</div>
      <h2>Vocab Test</h2>
      <p>Multiple-choice questions pulled straight from your own Vocab Register — meanings, synonyms, and antonyms.</p>
    </div>

    ${vocabCount < 4 ? `
    <div class="vbv-empty-state"><h4>Not enough words yet</h4><p>You need at least 4 words in your Vocab Register to take a test — you currently have ${vocabCount}.</p>
    <button class="vbv-btn btn-maroon btn-sm" style="margin-top:12px;" onclick="location.hash='#/vocab'">Go Add Some Words</button></div>
    ` : `
    <div class="panel">
      <h3 style="margin-bottom:16px;">Set up your test</h3>
      <label>Number of questions</label>
      <div class="chip-row" id="quiz-qcount-row">
        ${countOptions.map(n=>`<button class="vbv-chip ${n===QUIZ_SETUP.count?'active':''}" data-val="${n}" onclick="selectQuizChip(this,'qcount')">${n}</button>`).join('')}
      </div>
      <label style="margin-top:6px;">Time limit</label>
      <div class="chip-row" id="quiz-time-row">
        ${[['2 min',120],['5 min',300],['10 min',600],['No limit',0]].map(([l,v])=>`<button class="vbv-chip ${v===QUIZ_SETUP.timeSec?'active':''}" data-val="${v}" onclick="selectQuizChip(this,'time')">${l}</button>`).join('')}
      </div>
      <label style="margin-top:6px;">Question types</label>
      <div class="chip-row" id="quiz-type-row">
        ${[['Mixed','mixed'],['Meanings only','meaning'],['Synonyms only','synonym'],['Antonyms only','antonym']].map(([l,v])=>`<button class="vbv-chip ${v===QUIZ_SETUP.type?'active':''}" data-val="${v}" onclick="selectQuizChip(this,'type')">${l}</button>`).join('')}
      </div>
      <button class="vbv-btn btn-maroon" style="margin-top:22px;" onclick="startQuiz()">Start Test</button>
    </div>
    `}

    ${hist.length ? `
    <div class="section-title-row" style="margin-top:8px;"><h3>Last 3 Attempts</h3></div>
    ${renderLastThreeScores()}
    ${hist.length>=2 ? `
    <div class="section-title-row" style="margin-top:26px;"><h3>Improvement Tracker</h3></div>
    <div class="panel">${renderTrendChart()}<p style="margin-top:10px; font-size:12.5px;">${improvementLabel(hist.slice(-10))}</p></div>` : ''}
    ` : ''}
  </div>`;
}
function selectQuizChip(el, group){
  const row = el.parentElement;
  [...row.children].forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  if(group==='qcount') QUIZ_SETUP.count = Number(el.dataset.val);
  if(group==='time') QUIZ_SETUP.timeSec = Number(el.dataset.val);
  if(group==='type') QUIZ_SETUP.type = el.dataset.val;
}
function startQuiz(){
  const questions = buildQuizQuestions(QUIZ_SETUP.count, QUIZ_SETUP.type);
  if(questions.length < 1){ vbvToast('Could not build a test from that combination — try "Mixed" question types.', 'angry'); return; }
  if(questions.length < QUIZ_SETUP.count){ vbvToast(`Only enough data for ${questions.length} question${questions.length>1?'s':''} — starting with that.`, 'good'); }
  QUIZ_STATE = { phase:'active', questions, index:0, score:0, missed:[], answered:false, timeSec: QUIZ_SETUP.timeSec, remaining: QUIZ_SETUP.timeSec };
  mountQuizActive();
  if(QUIZ_SETUP.timeSec > 0){
    quizTimerInterval = setInterval(()=>{
      QUIZ_STATE.remaining--;
      const disp = document.getElementById('quiz-timer-display');
      if(disp){ disp.textContent = formatMMSS(QUIZ_STATE.remaining); disp.classList.toggle('low', QUIZ_STATE.remaining<=15); }
      if(QUIZ_STATE.remaining <= 0){
        clearInterval(quizTimerInterval); quizTimerInterval = null;
        finishQuiz(true);
      }
    }, 1000);
  }
}
function mountQuizActive(){
  document.getElementById('app').innerHTML = renderQuizActive();
  window.scrollTo({top:0, behavior:'smooth'});
}
function renderQuizActive(){
  const { questions, index, score, timeSec, remaining } = QUIZ_STATE;
  const q = questions[index];
  const typeLabel = q.type==='meaning' ? 'Meaning' : q.type==='synonym' ? 'Synonym' : 'Antonym';
  return `
  <div class="page">
    <div class="quiz-shell">
      <div class="quiz-top-row">
        <div class="vbv-quiz-progress">Question ${index+1} of ${questions.length}</div>
        ${timeSec>0 ? `<div class="quiz-timer" id="quiz-timer-display">${formatMMSS(remaining)}</div>` : ''}
      </div>
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${Math.round(100*index/questions.length)}%"></div></div>
      <div class="vbv-quiz-card">
        <div class="quiz-type-tag">${typeLabel}</div>
        <h3 class="quiz-prompt">${escapeHtml(q.prompt)}</h3>
        <div class="quiz-options" id="quiz-options">
          ${q.options.map((opt,i)=>`<button class="quiz-option" data-idx="${i}" onclick="selectQuizAnswer(${i})">${escapeHtml(opt)}</button>`).join('')}
        </div>
      </div>
      <div class="quiz-score-row">Score so far: ${score} / ${index}</div>
    </div>
  </div>`;
}
function selectQuizAnswer(i){
  if(QUIZ_STATE.answered) return;
  QUIZ_STATE.answered = true;
  const q = QUIZ_STATE.questions[QUIZ_STATE.index];
  const correctIdx = q.options.indexOf(q.correctAnswer);
  document.querySelectorAll('#quiz-options .quiz-option').forEach((b,bi)=>{
    b.disabled = true;
    if(bi===correctIdx) b.classList.add('correct');
    else if(bi===i) b.classList.add('incorrect');
  });
  if(i === correctIdx){ QUIZ_STATE.score++; }
  else{ QUIZ_STATE.missed.push({ word:q.word, type:q.type, prompt:q.prompt, correctAnswer:q.correctAnswer, yourAnswer:q.options[i] }); }
  setTimeout(()=>{
    QUIZ_STATE.index++;
    if(QUIZ_STATE.index >= QUIZ_STATE.questions.length){ finishQuiz(false); }
    else{ QUIZ_STATE.answered = false; mountQuizActive(); }
  }, 900);
}
async function finishQuiz(timedOut){
  if(quizTimerInterval){ clearInterval(quizTimerInterval); quizTimerInterval = null; }
  const total = QUIZ_STATE.questions.length;
  const correct = QUIZ_STATE.score;
  const percent = total>0 ? Math.round(100*correct/total) : 0;
  DATA.quizHistory = DATA.quizHistory || [];
  DATA.quizHistory.push({ date: todayStr(), total, correct, percent, type: QUIZ_SETUP.type, timedOut: !!timedOut });
  if(DATA.quizHistory.length > 50) DATA.quizHistory = DATA.quizHistory.slice(-50);
  await saveData();
  QUIZ_STATE.phase = 'results';
  QUIZ_STATE.lastCorrect = correct;
  QUIZ_STATE.lastTotal = total;
  QUIZ_STATE.lastPercent = percent;
  document.getElementById('app').innerHTML = renderQuizResults();
  window.scrollTo({top:0, behavior:'smooth'});
  if(percent === 100 && total >= 5) celebrate();
}
function renderLastThreeScores(){
  const hist = (DATA.quizHistory||[]).slice(-3).reverse();
  if(!hist.length) return '';
  return `<div class="quiz-history-row">
    ${hist.map(h=>`<div class="quiz-history-chip"><div class="qh-percent">${h.percent}%</div><div class="qh-meta">${h.correct}/${h.total} · ${fmtDate(h.date)}</div></div>`).join('')}
  </div>`;
}
function renderTrendChart(){
  const hist = (DATA.quizHistory||[]).slice(-10);
  if(!hist.length) return '';
  return `<div class="quiz-trend">
    ${hist.map((h,i)=>`<div class="quiz-trend-col">
      <div class="quiz-trend-bar ${i===hist.length-1?'recent':''}" style="height:${Math.max(4, Math.round(h.percent*0.8))}px;" title="${h.percent}%"></div>
      <div class="quiz-trend-label">${h.percent}%</div>
    </div>`).join('')}
  </div>`;
}
function improvementLabel(hist){
  if(hist.length < 2) return '';
  const latest = hist[hist.length-1].percent;
  const prevAvg = hist.slice(0,-1).reduce((s,h)=>s+h.percent,0) / (hist.length-1);
  const diff = latest - prevAvg;
  if(diff > 5) return `<span style="color:var(--sage); font-weight:600;">▲ Improving — ${Math.round(diff)} pts above your average</span>`;
  if(diff < -5) return `<span style="color:var(--maroon-dark); font-weight:600;">▼ Below your average by ${Math.round(Math.abs(diff))} pts</span>`;
  return `<span style="color:var(--navy-soft);">● Holding steady around your average</span>`;
}
function renderMissedList(missed){
  if(!missed.length) return `<p style="font-size:13px; color:var(--sage);">Perfect run — nothing to review.</p>`;
  return missed.map(m=>`<div class="highlight-item"><strong>${escapeHtml(m.word)}</strong> — ${escapeHtml(m.prompt)}<br>Correct: <span style="color:var(--sage);">${escapeHtml(m.correctAnswer)}</span> · You answered: <span style="color:var(--maroon-dark);">${escapeHtml(m.yourAnswer)}</span><span class="h-date">${escapeHtml(m.type)}</span></div>`).join('');
}
function renderQuizResults(){
  const { lastCorrect, lastTotal, lastPercent, missed } = QUIZ_STATE;
  const msg = lastPercent>=90 ? 'Outstanding, cadet.' : lastPercent>=70 ? 'Solid work.' : lastPercent>=50 ? "Keep drilling — you're getting there." : 'Back to the books, recruit.';
  const hist = DATA.quizHistory || [];
  return `
  <div class="page">
    <div class="page-head">
      <div class="page-eyebrow">Test Complete</div>
      <h2>${msg}</h2>
    </div>
    <div class="quiz-result-score">
      <div class="qr-big">${lastCorrect} / ${lastTotal}</div>
      <div class="qr-percent">${lastPercent}%</div>
    </div>

    <div class="section-title-row"><h3>Last 3 Attempts</h3></div>
    ${renderLastThreeScores()}

    ${hist.length>=2 ? `
    <div class="section-title-row" style="margin-top:26px;"><h3>Improvement Tracker</h3></div>
    <div class="panel">${renderTrendChart()}<p style="margin-top:10px; font-size:12.5px;">${improvementLabel(hist.slice(-10))}</p></div>` : ''}

    <div class="section-title-row" style="margin-top:26px;"><h3>Words to Review</h3></div>
    <div class="panel">${renderMissedList(missed)}</div>

    <div class="card-actions" style="margin-top:26px;">
      <button class="vbv-btn btn-maroon btn-sm" onclick="restartQuizSetup()">Take Another Test</button>
      <button class="vbv-btn btn-outline btn-sm" onclick="location.hash='#/vocab'">Back to Vocab Register</button>
    </div>
  </div>`;
}
function restartQuizSetup(){
  document.getElementById('app').innerHTML = renderQuizSetup();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ================= LIBRARY / INSIGHTS ================= */
function allBooksWithStatus(){
  return [
    ...DATA.completed.map(b=>({...b, status:'completed'})),
    ...DATA.ongoing.map(b=>({...b, status:'ongoing'})),
    ...DATA.upcoming.map(b=>({...b, status:'upcoming'})),
  ];
}
function libraryBookGridHtml(filter){
  const all = allBooksWithStatus();
  const filtered = filter==='All' ? all : filter==='Uncategorized' ? all.filter(b=>!b.category) : all.filter(b=>b.category===filter);
  if(!filtered.length) return `<div class="vbv-empty-state" style="grid-column:1/-1;"><h4>No books here</h4><p>Nothing filed under this category yet.</p></div>`;
  return filtered.map(b=> b.status==='completed' ? completedCardHtml(b) : b.status==='ongoing' ? ongoingCardHtml(b) : upcomingCardHtml(b)).join('');
}
function setLibraryFilter(el){
  const row = el.parentElement;
  [...row.children].forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('library-book-grid').innerHTML = libraryBookGridHtml(el.dataset.val);
}
function renderLibrary(){
  const all = allBooksWithStatus();
  const counts = {};
  BOOK_CATEGORIES.forEach(c=> counts[c]=0);
  let uncategorized = 0;
  all.forEach(b=>{ if(b.category && counts[b.category]!==undefined) counts[b.category]++; else uncategorized++; });
  const maxCount = Math.max(1, ...Object.values(counts), uncategorized);
  const totalPagesByCat = {};
  BOOK_CATEGORIES.forEach(c=> totalPagesByCat[c]=0);
  DATA.completed.forEach(b=>{
    const p = (b.logs||[]).reduce((a,l)=>a+Number(l.pages||0),0);
    if(b.category && totalPagesByCat[b.category]!==undefined) totalPagesByCat[b.category]+=p;
  });
  const topCategory = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.officers_march}')">
      <div class="page-eyebrow">Full Library</div>
      <h2>Your Reading Library</h2>
      <p>Every book across every stage, organized by category — a wider view than Ongoing, Completed, or Upcoming alone.</p>
    </div>

    <div class="panel">
      <h3 style="margin-bottom:14px;">By Category</h3>
      ${BOOK_CATEGORIES.map(c=>`
        <div class="cat-bar-row">
          <span class="cat-bar-label">${c}</span>
          <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${Math.round(100*counts[c]/maxCount)}%"></div></div>
          <span class="cat-bar-count">${counts[c]}</span>
        </div>`).join('')}
      ${uncategorized ? `
        <div class="cat-bar-row">
          <span class="cat-bar-label">Uncategorized</span>
          <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${Math.round(100*uncategorized/maxCount)}%; background:var(--navy-soft);"></div></div>
          <span class="cat-bar-count">${uncategorized}</span>
        </div>` : ''}
      ${topCategory && topCategory[1]>0 ? `<p style="font-size:12.5px; color:var(--navy-soft); margin-top:12px;">Your most-stocked shelf: <strong>${topCategory[0]}</strong> (${topCategory[1]} book${topCategory[1]>1?'s':''}).</p>` : ''}
    </div>

    <div class="section-title-row" style="margin-top:26px;"><h3>Browse</h3></div>
    <div class="chip-row" id="lib-filter-row">
      <button class="vbv-chip active" data-val="All" onclick="setLibraryFilter(this)">All (${all.length})</button>
      ${BOOK_CATEGORIES.map(c=>`<button class="vbv-chip" data-val="${c}" onclick="setLibraryFilter(this)">${c} (${counts[c]})</button>`).join('')}
      ${uncategorized ? `<button class="vbv-chip" data-val="Uncategorized" onclick="setLibraryFilter(this)">Uncategorized (${uncategorized})</button>` : ''}
    </div>
    <div class="book-grid" id="library-book-grid">${libraryBookGridHtml('All')}</div>
  </div>`;
}

/* ================= WORD OF THE DAY ================= */
function wordOfTheDay(){
  const keys = Object.keys(OFFLINE_DICT);
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  const key = keys[dayOfYear % keys.length];
  return { word: key, ...OFFLINE_DICT[key] };
}
async function addWordOfDayToRegister(){
  const wod = wordOfTheDay();
  if(findVocabByWord(wod.word)){ vbvToast(`"${wod.word}" is already in your register.`, 'good'); return; }
  proceedWithWordResult(null, wod.word, { meaning: wod.meaning, synonyms: wod.synonyms, antonyms: wod.antonyms });
}

/* ================= FLASHCARDS ================= */
let FLASH_STATE = null;
function buildFlashcardDeck(){
  const arr = DATA.vocab.slice();
  arr.sort((a,b)=> (a.mastery||0)-(b.mastery||0) || (a.lastReviewedAt||'').localeCompare(b.lastReviewedAt||''));
  return shuffleArray(arr.slice(0, Math.min(20, arr.length)));
}
function masteryDots(level){
  const n = level||0;
  return '●'.repeat(n) + '○'.repeat(5-n);
}
function renderFlashcardsHome(){
  const vocabCount = DATA.vocab.length;
  const mastered = DATA.vocab.filter(v=>(v.mastery||0)>=4).length;
  const learning = DATA.vocab.filter(v=>(v.mastery||0)<2).length;
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.chetwode_refl}')">
      <div class="page-eyebrow">Vocabulary Command</div>
      <h2>Flashcards</h2>
      <p>Flip through your Vocab Register, word by word. Cards you're still learning come back around more often.</p>
    </div>
    ${vocabCount < 1 ? `
    <div class="vbv-empty-state"><h4>Your register is empty</h4><p>Add words from any ongoing book's log first.</p>
    <button class="vbv-btn btn-maroon btn-sm" style="margin-top:12px;" onclick="location.hash='#/vocab'">Go to Vocab Register</button></div>
    ` : `
    <div class="stat-row" style="grid-template-columns:repeat(3,1fr); margin-bottom:26px;">
      <div class="vbv-stat-card"><div class="num">${vocabCount}</div><div class="lbl">Words Total</div></div>
      <div class="vbv-stat-card"><div class="num">${mastered}</div><div class="lbl">Well Mastered</div></div>
      <div class="vbv-stat-card"><div class="num">${learning}</div><div class="lbl">Still Learning</div></div>
    </div>
    <div class="panel" style="text-align:center;">
      <p style="font-size:13px; color:var(--navy-soft); margin-bottom:16px;">Each session reviews up to 20 words, prioritizing the ones you know least.</p>
      <button class="vbv-btn btn-maroon" onclick="startFlashcards()">Start Review</button>
    </div>
    `}
  </div>`;
}
function startFlashcards(){
  const deck = buildFlashcardDeck();
  if(!deck.length){ vbvToast('Add some words to your Vocab Register first.', 'angry'); return; }
  FLASH_STATE = { deck, index:0, flipped:false, knowCount:0, learningCount:0 };
  mountFlashActive();
}
function mountFlashActive(){
  document.getElementById('app').innerHTML = renderFlashActive();
  window.scrollTo({top:0, behavior:'smooth'});
}
function renderFlashActive(){
  const { deck, index, flipped } = FLASH_STATE;
  const v = deck[index];
  return `
  <div class="page">
    <div class="quiz-shell">
      <div class="quiz-top-row">
        <div class="vbv-quiz-progress">Card ${index+1} of ${deck.length}</div>
        <div class="vbv-quiz-progress">${masteryDots(v.mastery)}</div>
      </div>
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${Math.round(100*index/deck.length)}%"></div></div>
      <div class="vbv-flash-card" onclick="flipFlashcard()">
        <div class="flash-card-inner ${flipped?'flipped':''}">
          <div class="vbv-flash-face vbv-flash-front">
            <div class="flash-word">${escapeHtml(v.word)}</div>
            <div class="flash-hint">Tap to reveal</div>
          </div>
          <div class="vbv-flash-face vbv-flash-back">
            <div class="flash-meaning">${escapeHtml(v.meaning)}</div>
            ${(v.synonyms||[]).length ? `<div class="tag-group">${(v.synonyms||[]).slice(0,3).map(s=>`<span class="tag syn">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
          </div>
        </div>
      </div>
      ${flipped ? `
      <div class="flash-actions">
        <button class="vbv-btn btn-outline" onclick="event.stopPropagation(); rateFlashcard(false)">Still Learning</button>
        <button class="vbv-btn btn-maroon" onclick="event.stopPropagation(); rateFlashcard(true)">Know It</button>
      </div>` : `<p style="text-align:center; font-size:12px; color:var(--navy-soft);">Tap the card to see the meaning</p>`}
    </div>
  </div>`;
}
function flipFlashcard(){
  FLASH_STATE.flipped = !FLASH_STATE.flipped;
  mountFlashActive();
}
async function rateFlashcard(knewIt){
  const v = FLASH_STATE.deck[FLASH_STATE.index];
  const entry = DATA.vocab.find(x=>x.id===v.id);
  if(entry){
    entry.mastery = knewIt ? Math.min(5, (entry.mastery||0)+1) : Math.max(0, (entry.mastery||0)-1);
    entry.lastReviewedAt = todayStr();
  }
  if(knewIt) FLASH_STATE.knowCount++; else FLASH_STATE.learningCount++;
  await saveData();
  FLASH_STATE.index++;
  FLASH_STATE.flipped = false;
  if(FLASH_STATE.index >= FLASH_STATE.deck.length){ mountFlashSummary(); }
  else{ mountFlashActive(); }
}
function mountFlashSummary(){
  const { deck, knowCount, learningCount } = FLASH_STATE;
  document.getElementById('app').innerHTML = `
  <div class="page">
    <div class="page-head">
      <div class="page-eyebrow">Review Complete</div>
      <h2>${deck.length} cards down.</h2>
    </div>
    <div class="stat-row" style="grid-template-columns:repeat(2,1fr); margin-bottom:26px;">
      <div class="vbv-stat-card"><div class="num">${knowCount}</div><div class="lbl">Know It</div></div>
      <div class="vbv-stat-card"><div class="num">${learningCount}</div><div class="lbl">Still Learning</div></div>
    </div>
    <div class="card-actions">
      <button class="vbv-btn btn-maroon btn-sm" onclick="startFlashcards()">Review Again</button>
      <button class="vbv-btn btn-outline btn-sm" onclick="location.hash='#/vocab'">Back to Vocab Register</button>
    </div>
  </div>`;
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ================= LEVELS (vocab + grammar + quiz curriculum) ================= */
let currentLevelTab = 'basic';
function levelVocabCardHtml(word, entry, level){
  const viewed = (DATA.levels.viewed[level].vocab||[]).includes(word);
  const id = 'lv-'+level+'-'+word;
  return `
  <div class="vocab-card" id="${id}">
    <div class="vocab-word-row" onclick="toggleLevelVocab('${id}','${word}','${level}')">
      <div><span class="vocab-word">${escapeHtml(word)}</span> ${viewed?'<span style="color:var(--sage); font-size:12px;">✓</span>':''}</div>
      <div class="vocab-source">${entry.pos ? escapeHtml(entry.pos) : ''}</div>
    </div>
    <div class="vocab-body">
      <div class="vocab-meaning">${escapeHtml(entry.meaning)}</div>
      ${entry.example ? `<div class="review-quote">"${escapeHtml(entry.example)}"</div>` : ''}
      <div class="tag-group"><span class="lbl">Synonyms</span>${(entry.synonyms||[]).map(s=>`<span class="tag syn">${escapeHtml(s)}</span>`).join('') || '<span class="tag">none listed</span>'}</div>
    </div>
  </div>`;
}
async function toggleLevelVocab(id, word, level){
  document.getElementById(id).classList.toggle('open');
  const arr = DATA.levels.viewed[level].vocab;
  if(!arr.includes(word)){ arr.push(word); await saveData(); }
}
function grammarCardHtml(g, idx, level){
  const gid = 'gr-'+level+'-'+idx;
  const viewed = (DATA.levels.viewed[level].grammar||[]).includes(idx);
  return `
  <div class="vocab-card" id="${gid}">
    <div class="vocab-word-row" onclick="toggleGrammarPoint('${gid}',${idx},'${level}')">
      <div><span class="vocab-word" style="font-size:16px;">${escapeHtml(g.t)}</span> ${viewed?'<span style="color:var(--sage); font-size:12px;">✓</span>':''}</div>
    </div>
    <div class="vocab-body">
      <div class="vocab-meaning">${escapeHtml(g.b)}</div>
      ${g.ex.map(e=>`<div class="review-quote">"${escapeHtml(e)}"</div>`).join('')}
    </div>
  </div>`;
}
async function toggleGrammarPoint(gid, idx, level){
  document.getElementById(gid).classList.toggle('open');
  const arr = DATA.levels.viewed[level].grammar;
  if(!arr.includes(idx)){ arr.push(idx); await saveData(); }
}
function vbvRenderLevels(){
  const level = currentLevelTab;
  const words = Object.entries(OFFLINE_DICT).filter(([w,e])=>e.level===level);
  const grammarPoints = VBV_GRAMMAR[level];
  const vocabViewed = (DATA.levels.viewed[level].vocab||[]).length;
  const grammarViewed = (DATA.levels.viewed[level].grammar||[]).length;
  const vocabPct = words.length ? Math.round(100*vocabViewed/words.length) : 0;
  const grammarPct = grammarPoints.length ? Math.round(100*grammarViewed/grammarPoints.length) : 0;
  const bestScore = DATA.levels.quizScores[level];
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.heli_full}')">
      <div class="page-eyebrow">English Proficiency</div>
      <h2>Levels</h2>
      <p>Structured vocabulary, grammar, and quizzes — Basic through Advanced. These words also feed your Vocab Register lookups and Word of the Day automatically.</p>
    </div>

    <div class="chip-row">
      ${LEVELS.map(l=>`<button class="vbv-chip ${l===level?'active':''}" onclick="setLevelTab('${l}')">${LEVEL_LABEL[l]}</button>`).join('')}
    </div>

    <div class="stat-row" style="grid-template-columns:repeat(3,1fr); margin-bottom:26px;">
      <div class="vbv-stat-card"><div class="num">${vocabPct}%</div><div class="lbl">Vocabulary Reviewed</div></div>
      <div class="vbv-stat-card"><div class="num">${grammarPct}%</div><div class="lbl">Grammar Reviewed</div></div>
      <div class="vbv-stat-card"><div class="num">${bestScore===null?'—':bestScore+'%'}</div><div class="lbl">Best Quiz Score</div></div>
    </div>

    <div class="section-title-row"><h3>${LEVEL_LABEL[level]} Vocabulary</h3></div>
    ${words.map(([w,e])=>levelVocabCardHtml(w,e,level)).join('')}

    <div class="section-title-row" style="margin-top:26px;"><h3>${LEVEL_LABEL[level]} Grammar</h3></div>
    ${grammarPoints.map((g,i)=>grammarCardHtml(g,i,level)).join('')}

    <div class="panel" style="margin-top:26px; text-align:center;">
      <h3 style="margin-bottom:10px;">${LEVEL_LABEL[level]} Quiz</h3>
      <p style="font-size:13px; color:var(--navy-soft); margin-bottom:14px;">5 questions testing this level's vocabulary and grammar.</p>
      <button class="vbv-btn btn-maroon" onclick="startLevelQuiz('${level}')">Take ${LEVEL_LABEL[level]} Quiz</button>
    </div>
  </div>`;
}
function setLevelTab(level){
  currentLevelTab = level;
  document.getElementById('app').innerHTML = vbvRenderLevels();
  window.scrollTo({top:0, behavior:'smooth'});
}

let LEVEL_QUIZ_STATE = null;
function startLevelQuiz(level){
  LEVEL_QUIZ_STATE = { level, questions: QUIZZES[level], index:0, score:0, answered:false };
  mountLevelQuizActive();
}
function mountLevelQuizActive(){
  document.getElementById('app').innerHTML = renderLevelQuizActive();
  window.scrollTo({top:0, behavior:'smooth'});
}
function renderLevelQuizActive(){
  const { level, questions, index, score } = LEVEL_QUIZ_STATE;
  const q = questions[index];
  return `
  <div class="page">
    <div class="quiz-shell">
      <div class="quiz-top-row"><div class="vbv-quiz-progress">${LEVEL_LABEL[level]} Quiz — Question ${index+1} of ${questions.length}</div></div>
      <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${Math.round(100*index/questions.length)}%"></div></div>
      <div class="vbv-quiz-card">
        <div class="quiz-type-tag">${LEVEL_LABEL[level]}</div>
        <h3 class="quiz-prompt">${escapeHtml(q.q)}</h3>
        <div class="quiz-options" id="lvl-quiz-options">
          ${q.o.map((opt,i)=>`<button class="quiz-option" data-idx="${i}" onclick="selectLevelQuizAnswer(${i})">${escapeHtml(opt)}</button>`).join('')}
        </div>
      </div>
      <div class="quiz-score-row">Score so far: ${score} / ${index}</div>
    </div>
  </div>`;
}
function selectLevelQuizAnswer(i){
  if(LEVEL_QUIZ_STATE.answered) return;
  LEVEL_QUIZ_STATE.answered = true;
  const q = LEVEL_QUIZ_STATE.questions[LEVEL_QUIZ_STATE.index];
  document.querySelectorAll('#lvl-quiz-options .quiz-option').forEach((b,bi)=>{
    b.disabled = true;
    if(bi===q.a) b.classList.add('correct');
    else if(bi===i) b.classList.add('incorrect');
  });
  if(i===q.a) LEVEL_QUIZ_STATE.score++;
  setTimeout(()=>{
    LEVEL_QUIZ_STATE.index++;
    LEVEL_QUIZ_STATE.answered = false;
    if(LEVEL_QUIZ_STATE.index >= LEVEL_QUIZ_STATE.questions.length){ finishLevelQuiz(); }
    else{ mountLevelQuizActive(); }
  }, 900);
}
async function finishLevelQuiz(){
  const { level, questions, score } = LEVEL_QUIZ_STATE;
  const percent = Math.round(100*score/questions.length);
  if(DATA.levels.quizScores[level]===null || percent>DATA.levels.quizScores[level]){ DATA.levels.quizScores[level] = percent; }
  await saveData();
  document.getElementById('app').innerHTML = `
  <div class="page">
    <div class="page-head"><div class="page-eyebrow">${LEVEL_LABEL[level]} Quiz Complete</div><h2>${score} / ${questions.length} correct</h2></div>
    <div class="quiz-result-score"><div class="qr-big">${percent}%</div><div class="qr-percent">Best score: ${DATA.levels.quizScores[level]}%</div></div>
    <div class="card-actions">
      <button class="vbv-btn btn-maroon btn-sm" onclick="startLevelQuiz('${level}')">Retake Quiz</button>
      <button class="vbv-btn btn-outline btn-sm" onclick="location.hash='#/levels'">Back to Levels</button>
    </div>
  </div>`;
  window.scrollTo({top:0, behavior:'smooth'});
  if(percent===100) celebrate();
}

/* ================= SPOKEN ENGLISH ================= */
function escJs(s){ return String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
function speak(text){
  if(!("speechSynthesis" in window)){ vbvToast("Text-to-speech isn't supported in this browser.", 'angry'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
function matchScore(target, said){
  const norm = s => s.toLowerCase().replace(/[^a-z\s]/g,"").split(/\s+/).filter(Boolean);
  const t = norm(target), s = norm(said);
  if(t.length === 0) return 0;
  let matches = 0;
  const pool = s.slice();
  t.forEach(word => {
    const idx = pool.indexOf(word);
    if(idx > -1){ matches++; pool.splice(idx,1); }
  });
  return Math.round((matches / t.length) * 100);
}
function practiceSpeech(target, micId, fbId){
  const fb = document.getElementById(fbId);
  const mic = document.getElementById(micId);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ fb.textContent = "Speech practice needs Chrome on desktop or Android."; return; }
  const rec = new SR();
  rec.lang = "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  mic.classList.add("listening");
  fb.textContent = "Listening… say the phrase now.";
  rec.onresult = (e) => {
    const said = e.results[0][0].transcript;
    const score = matchScore(target, said);
    fb.textContent = 'You said: "' + said + '" — ' + score + '% match';
  };
  rec.onerror = () => { fb.textContent = "Couldn't hear that clearly — try again."; };
  rec.onend = () => { mic.classList.remove("listening"); };
  try{ rec.start(); }catch(e){ mic.classList.remove("listening"); }
}
let spokenCategoryTab = 'basic';
function renderSpoken(){
  const cat = spokenCategoryTab;
  const data = PHRASES[cat];
  return `
  <div class="page">
    <div class="page-head with-bg" style="background-image:url('${IMG.officers_march}')">
      <div class="page-eyebrow">Spoken English</div>
      <h2>Practice Speaking</h2>
      <p>Listen to a phrase, then try saying it yourself — built for interviews and SSB-style responses.</p>
    </div>
    <div class="chip-row">
      ${LEVELS.map(l=>`<button class="vbv-chip ${l===cat?'active':''}" onclick="setSpokenTab('${l}')">${PHRASES[l].label}</button>`).join('')}
    </div>
    <div class="panel">
      ${data.items.map((phrase,i)=>{
        const micId = 'mic-'+cat+'-'+i;
        const fbId = 'fb-'+cat+'-'+i;
        return `
        <div class="phrase-row">
          <div class="phrase-text">"${escapeHtml(phrase)}"</div>
          <div class="phrase-actions">
            <button class="vbv-btn btn-outline btn-sm" onclick="speak(PHRASES['${cat}'].items[${i}])">🔊 Listen</button>
            <button class="vbv-btn btn-outline btn-sm mic-btn" id="${micId}" onclick="practiceSpeech(PHRASES['${cat}'].items[${i}], '${micId}', '${fbId}')">🎤 Practice</button>
          </div>
          <div class="phrase-feedback" id="${fbId}"></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function setSpokenTab(cat){
  spokenCategoryTab = cat;
  document.getElementById('app').innerHTML = renderSpoken();
  window.scrollTo({top:0, behavior:'smooth'});
}


/* ================= MOUNT (replaces the old standalone boot()) =================
   VBV no longer has its own gate/login — the person already entered through
   VAANI's own gate, which sets ACTIVE_CODE/DATA via applyLoadedAccount() before
   this ever runs. This just does VBV's own one-time setup, the first time the
   Book Reading tab is opened. */
let __vbvMounted = false;
function mountLibrarySection(){
  if(__vbvMounted) return;
  __vbvMounted = true;
  const fy = document.getElementById('fyear');
  if(fy) fy.textContent = new Date().getFullYear();
  startTicker();
  startClock();
  checkStorageHealth().then(ok=>{
    if(!ok) showBanner("This browser is blocking storage (common in private/incognito mode) — your progress won't be saved after you close this tab.");
  });
  if(!location.hash || !location.hash.startsWith('#/')) location.hash = '#/home';
  navigate();
}
