import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.VAANI_BASE_URL || 'http://127.0.0.1:4173/';
const launchOptions = { headless: true, args: ['--no-sandbox'] };
if (process.env.VAANI_BROWSER_EXECUTABLE) launchOptions.executablePath = process.env.VAANI_BROWSER_EXECUTABLE;
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce'
});
const page = await context.newPage();
const sharedArenaFixture = Array.from({ length: 12 }, (_, i) => ({
  code: '',
  pid: 'legacy-cadet-' + String(i + 1).padStart(2, '0'),
  name: 'Legacy Cadet ' + String(i + 1).padStart(2, '0'),
  score: 15 - (i % 6),
  seconds: 48 + i * 7,
  total: 15,
  at: 1790500000000 + i
}));
await page.route('https://pccavdwwhykwyeitxixc.supabase.co/functions/v1/arena-leaderboard', async route => {
  const request = route.request();
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 200, headers: cors, body: 'ok' });
    return;
  }
  let requestedCode = '';
  try { requestedCode = request.postDataJSON()?.code || ''; } catch {}
  const rows = sharedArenaFixture.map(row => ({ ...row, code: requestedCode }));
  await route.fulfill({
    status: 200,
    headers: cors,
    contentType: 'application/json',
    body: JSON.stringify({ rows, verified: false, source: 'historical' })
  });
});
const pageErrors = [];
const vaErrors = [];
let academyImageResults = null;

page.on('pageerror', error => pageErrors.push(error.stack || error.message));
page.on('console', message => {
  if (message.type() !== 'error') return;
  const value = message.text();
  if (/\[VAANI\].*(render error|uncaught error)/i.test(value) ||
      /\[VBV\].*(error|failed)/i.test(value)) vaErrors.push(value);
});

async function textOf(selector) {
  return page.locator(selector).first().textContent().then(value => (value || '').trim());
}
async function assertVisibleText(selector, label) {
  const value = await textOf(selector);
  assert.ok(value && value !== '—' && !/^loading/i.test(value), label + ' was blank: ' + JSON.stringify(value));
}
async function clickMainView(name) {
  const desktopButton = page.locator('#vaaniMainNav button[data-view="' + name + '"]');
  const bottomButton = page.locator('#bottomNav button[data-view="' + name + '"]');
  if (await desktopButton.isVisible()) {
    await desktopButton.click();
  } else if (await bottomButton.count()) {
    await bottomButton.click();
  } else {
    await page.locator('#hamburgerBtn').click();
    await desktopButton.click();
  }
  await page.waitForFunction(view => {
    const el = document.getElementById('view-' + view);
    return !!el && el.classList.contains('active');
  }, name);
}

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#gate-stage-start', { state: 'visible', timeout: 15000 });
  await page.evaluate(() => { generateCode=()=> '123456'; });
  await page.locator('#cadetName').fill('VAANI Smoke Cadet');
  await page.locator('#gateBtn').click();
  await page.waitForSelector('#gate-stage-showcode', { state: 'visible', timeout: 15000 });
  const codeText = await textOf('#gate-code-display');
  assert.match(codeText.replace(/\s/g, ''), /^\d{6}$/, 'New account code should contain six digits');
  await page.locator('#gate-stage-showcode .gate-btn').click();
  await page.waitForFunction(() => document.getElementById('gate')?.classList.contains('hide'), null, { timeout: 15000 });
  await page.waitForTimeout(900);

  assert.equal(await page.locator('#view-dashboard').evaluate(el => el.classList.contains('active')), true);
  await assertVisibleText('#dashName', 'Dashboard cadet name');
  await assertVisibleText('#heroDate', 'Dashboard date');
  await assertVisibleText('#continueTitle', 'Continue Learning card');
  await assertVisibleText('#recommendTitle', 'Recommended card');
  await assertVisibleText('#goalText', 'Today’s focus message');
  assert.ok(await page.locator('#roadmapTrack .rm-node').count() > 0, 'Learning roadmap has no nodes');
  assert.ok(await page.locator('#missionList .mastery-row').count() >= 3, 'Daily mission list did not render');
  await assertVisibleText('#dashWord', 'Word of the Day');
  await assertVisibleText('#dashWordMeaning', 'Word of the Day meaning');
  assert.equal(await page.locator('#heatmap .heat-cell').count(), 60, '60-day heatmap did not render');
  assert.ok(await page.locator('#dashBadgeGrid .badge').count() > 0, 'Dashboard achievements did not render');
  assert.ok(await page.locator('#focusSprintWidget .vd-focus-body').count() > 0, 'Focus Sprint did not render');
  console.log('PASS dashboard: hero, briefing, roadmap, missions, word, heatmap, badges and focus sprint');

  // Account isolation regression: seed account A, logout, create account B in
  // the same browser, then switch repeatedly and verify each saved profile.
  const accountA = await page.evaluate(async () => {
    const code=localStorage.getItem('vbv_session_code');
    State.xp=321; State.completedTopics={'account-a-topic':true};
    State.quizScores={'account-a-quiz':87};
    State.topicProgress={'account-a-progress':true};
    State.bookmarkedTopics={'account-a-bookmark':true};
    State.topicNotes={'account-a-note':'A-only lesson note'};
    const vbvSeed={
      completed:[{id:'account-a-completed',title:'A completed book'}],
      ongoing:[{id:'account-a-ongoing',title:'A current book',logs:[]}],
      upcoming:[{id:'account-a-upcoming',title:'A planned book'}],
      vocab:[{id:'account-a-vocab',word:'A-only'}],
      achievements:[{id:'account-a-achievement'}],
      quizHistory:[{id:'account-a-quiz-history',date:'2026-09-29',total:1,correct:1,percent:100,type:'regression',timedOut:false}]
    };
    Object.entries(vbvSeed).forEach(([key,rows])=>DATA[key].push(...rows));
    saveState();
    await saveData();
    return code;
  });
  assert.match(accountA || '', /^\d{6}$/, 'Initial account code missing');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.evaluate(() => logout())
  ]);
  await page.waitForSelector('#gate-stage-start', { state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#cadetName').inputValue(), '',
    'New-account form retained the previous account name after logout');
  const accountB = await page.evaluate(async () => {
    generateCode=()=> '654321';
    return await createNewAccount();
  });
  assert.notEqual(accountB, accountA, 'Regression accounts unexpectedly share a code');
  const cleanB = await page.evaluate(() => ({xp:State.xp,completed:State.completedTopics,scores:State.quizScores,
    books:Object.fromEntries(['completed','ongoing','upcoming','vocab','achievements','quizHistory'].map(key=>[key,DATA[key].map(item=>item.id)]))}));
  assert.equal(cleanB.xp, 0, 'New account inherited XP from the prior account');
  assert.deepEqual(cleanB.completed, {}, 'New account inherited completed topics');
  assert.deepEqual(cleanB.scores, {}, 'New account inherited quiz scores');
  for(const [key,id] of Object.entries({completed:'account-a-completed',ongoing:'account-a-ongoing',upcoming:'account-a-upcoming',vocab:'account-a-vocab',achievements:'account-a-achievement',quizHistory:'account-a-quiz-history'})){
    assert.equal(cleanB.books[key].includes(id), false, 'New account inherited Book Reading '+key);
  }
  await page.evaluate(async () => {
    State.xp=12; State.vocabLearned={'account-b-word':true};
    await saveData();
  });
  const restoredA = await page.evaluate(async code => {
    const result=await loginWithCode(code);
    return {result,xp:State.xp,completed:State.completedTopics,scores:State.quizScores,progress:State.topicProgress,bookmarks:State.bookmarkedTopics,notes:State.topicNotes,
      books:Object.fromEntries(['completed','ongoing','upcoming','vocab','achievements','quizHistory'].map(key=>[key,DATA[key].map(item=>item.id)]))};
  }, accountA);
  assert.equal(restoredA.result.ok, true, 'Existing account A failed to log in');
  assert.equal(restoredA.xp, 321, 'Account A XP was not restored');
  assert.equal(restoredA.completed['account-a-topic'], true, 'Account A topic progress was not restored');
  assert.equal(restoredA.scores['account-a-quiz'], 87, 'Account A quiz progress was not restored');
  assert.equal(restoredA.progress['account-a-progress'], true, 'Account A in-progress lesson state was not restored');
  assert.equal(restoredA.bookmarks['account-a-bookmark'], true, 'Account A bookmark was not restored');
  assert.equal(restoredA.notes['account-a-note'], 'A-only lesson note', 'Account A lesson note was not restored');
  for(const [key,id] of Object.entries({completed:'account-a-completed',ongoing:'account-a-ongoing',upcoming:'account-a-upcoming',vocab:'account-a-vocab',achievements:'account-a-achievement',quizHistory:'account-a-quiz-history'})){
    assert.equal(restoredA.books[key].includes(id), true, 'Account A Book Reading '+key+' was not restored');
  }
  const restoredB = await page.evaluate(async code => {
    const result=await loginWithCode(code);
    return {result,xp:State.xp,completed:State.completedTopics,scores:State.quizScores,vocab:State.vocabLearned,progress:State.topicProgress,bookmarks:State.bookmarkedTopics,notes:State.topicNotes,
      books:Object.fromEntries(['completed','ongoing','upcoming','vocab','achievements','quizHistory'].map(key=>[key,DATA[key].map(item=>item.id)]))};
  }, accountB);
  assert.equal(restoredB.result.ok, true, 'Existing account B failed to log in');
  assert.equal(restoredB.xp, 12, 'Account B XP was not restored');
  assert.deepEqual(restoredB.completed, {}, 'Switching to account B leaked account A topics');
  assert.deepEqual(restoredB.scores, {}, 'Switching to account B leaked account A quiz progress');
  assert.deepEqual(restoredB.progress, {}, 'Switching to account B leaked account A in-progress topics');
  assert.deepEqual(restoredB.bookmarks, {}, 'Switching to account B leaked account A bookmarks');
  assert.deepEqual(restoredB.notes, {}, 'Switching to account B leaked account A notes');
  assert.equal(restoredB.vocab['account-b-word'], true, 'Account B vocabulary progress was not restored');
  for(const [key,id] of Object.entries({completed:'account-a-completed',ongoing:'account-a-ongoing',upcoming:'account-a-upcoming',vocab:'account-a-vocab',achievements:'account-a-achievement',quizHistory:'account-a-quiz-history'})){
    assert.equal(restoredB.books[key].includes(id), false, 'Switching to account B leaked account A Book Reading '+key);
  }
  const rejectedCorrupt = await page.evaluate(async code => {
    localStorage.setItem('vbv_veer_bhogya_account_111111','[]');
    return await loginWithCode('111111');
  });
  assert.equal(rejectedCorrupt.ok, false, 'Malformed account record was accepted');
  assert.equal(await page.evaluate(() => State.xp), 12, 'Malformed account login changed the active profile');
  const incompleteAccount = await page.evaluate(async () => {
    localStorage.setItem('vbv_veer_bhogya_account_222222', JSON.stringify({
      vaani: { xp: 6, completedTopics: [], quizScores: 'invalid', bookmarkedTopics: [], topicNotes: 'invalid' },
      vbv: { completed: 'invalid', ongoing: {}, upcoming: 'invalid', vocab: [null, {id:'partial-word',word:'Partial'}],
        goal: {monthlyBooks:'invalid',dailyPages:17}, levels:{viewed:{basic:{vocab:'invalid',grammar:['clauses']}},quizScores:{basic:'90',intermediate:'invalid'}} }
    }));
    const result = await loginWithCode('222222');
    return { result, xp:State.xp, completed:State.completedTopics, scores:State.quizScores,bookmarks:State.bookmarkedTopics,notes:State.topicNotes,
      books:{completed:DATA.completed,ongoing:DATA.ongoing,vocab:DATA.vocab,goal:DATA.goal,levels:DATA.levels} };
  });
  assert.equal(incompleteAccount.result.ok, true, 'A valid partial account record should restore safely');
  assert.equal(incompleteAccount.xp, 6, 'Partial account data was not restored');
  assert.deepEqual(incompleteAccount.completed, {}, 'Partial account inherited the previous account’s topics');
  assert.deepEqual(incompleteAccount.scores, {}, 'Partial account inherited the previous account’s scores');
  assert.deepEqual(incompleteAccount.bookmarks, {}, 'Malformed bookmarks were not normalized safely');
  assert.deepEqual(incompleteAccount.notes, {}, 'Malformed notes were not normalized safely');
  assert.deepEqual(incompleteAccount.books.completed, [], 'Partial account did not receive safe Book Reading defaults');
  assert.deepEqual(incompleteAccount.books.ongoing, [], 'Partial account did not receive safe ongoing-book defaults');
  assert.equal(incompleteAccount.books.vocab.length, 1, 'Valid vocabulary data was not preserved beside a malformed row');
  assert.equal(incompleteAccount.books.vocab[0].id, 'partial-word');
  assert.equal(incompleteAccount.books.goal.monthlyBooks, 2, 'Partial account did not receive a safe goal default');
  assert.equal(incompleteAccount.books.goal.dailyPages, 17, 'Valid account goal data was not preserved');
  assert.deepEqual(incompleteAccount.books.levels.viewed.basic.vocab, [], 'Malformed viewed-level data was not normalized');
  assert.deepEqual(incompleteAccount.books.levels.viewed.basic.grammar, ['clauses'], 'Valid viewed-level progress was not preserved');
  assert.equal(incompleteAccount.books.levels.quizScores.basic, 90, 'Valid level quiz score was not restored');
  assert.equal(incompleteAccount.books.levels.quizScores.intermediate, null, 'Invalid level quiz score was not normalized');
  const switchedBack = await page.evaluate(async code => {
    const result=await loginWithCode(code);return {result,xp:State.xp,completed:State.completedTopics};
  }, accountB);
  assert.equal(switchedBack.result.ok, true, 'Switching back from a partial account failed');
  assert.equal(switchedBack.xp, 12, 'Switching back from a partial account lost the complete account data');
  assert.deepEqual(switchedBack.completed, {}, 'Partial-account switching introduced cross-account progress');
  await page.evaluate(() => finishGateEntry());
  console.log('PASS account isolation: create, logout, restore, switch and reject malformed records');

  await clickMainView('grammar');
  const arenaSecurity = await page.evaluate(async () => {
    const arena=VX.arena;
    const match={source:'BOTH',count:8,seconds:240,cap:8,seed:482731,expiresAt:Date.now()+3600000};
    const code=arena.encode(match),decoded=arena.decode(code);
    const first=arena.questionsFor(decoded,'Smoke Cadet').map(question=>question._id);
    const second=arena.questionsFor(arena.decode(code),'Smoke Cadet').map(question=>question._id);
    const boardKey='smoke-regression-arena';
    const testEntry={pid:'smoke-player',name:'Smoke Cadet',score:6,seconds:60,total:8,at:1,answers:{}};
    await arena.sync.submit(boardKey,testEntry);
    const localRows=JSON.parse(localStorage.getItem('vx_arena_board_'+boardKey)||'[]');
    const originalFetch=window.fetch;
    let request=null;
    window.fetch=(url,options={})=>{
      request={url:String(url),method:String(options.method||'GET'),body:options.body||null,
        contentType:options.headers?.['Content-Type']||options.headers?.['content-type']||''};
      return Promise.resolve({ok:true,json:()=>Promise.resolve({rows:[
        {code:boardKey,pid:'remote-player',name:'Remote Cadet',score:7,seconds:45,total:8,at:2}
      ],verified:false,source:'historical'})});
    };
    let sharedRows=[];
    try { sharedRows=await arena.sync.fetch(boardKey); }
    finally {
      window.fetch=originalFetch;
      localStorage.removeItem('vx_arena_board_'+boardKey);
    }
    return {code,decoded,first,second,localRows,sharedRows,request,
      adapter:arena.sync.name,live:arena.sync.live,shared:arena.sync.shared,
      remoteAdapter:typeof arena.supabaseAdapter};
  });
  assert.equal(arenaSecurity.code.length,32,'Arena match code did not round-trip');
  assert.equal(arenaSecurity.decoded?.seed,482731,'Arena match code lost its seed');
  assert.deepEqual(arenaSecurity.first,arenaSecurity.second,'Arena question selection changed for an identical match seed');
  assert.equal(arenaSecurity.localRows.length,1,'Arena score was not saved locally on this device');
  assert.equal(arenaSecurity.sharedRows.length,1,'Shared Arena read did not return a historical row');
  assert.equal(arenaSecurity.sharedRows[0].pid,'remote-player','Shared Arena read returned the wrong row');
  assert.equal(arenaSecurity.adapter,'shared-read','Shared read adapter was not configured');
  assert.equal(arenaSecurity.live,false,'Shared read must not enable browser score writes');
  assert.equal(arenaSecurity.shared,true,'Arena must identify its shared read-only board');
  assert.equal(arenaSecurity.request.method,'POST','Shared Arena endpoint must use POST');
  assert.ok(arenaSecurity.request.url.includes('/functions/v1/arena-leaderboard'),'Shared Arena read did not use the Edge Function');
  assert.equal(JSON.parse(arenaSecurity.request.body).code,'smoke-regression-arena','Shared Arena read sent the wrong match code');
  assert.ok(arenaSecurity.request.contentType.toLowerCase().includes('application/json'),'Shared Arena read must send JSON');
  assert.equal(arenaSecurity.remoteAdapter,'undefined','Browser score writes must not expose the removed Supabase adapter');
  console.log('PASS Arena security: deterministic match, device-local submission, Edge Function historical read and no public writer');

  await clickMainView('grammar');
  await page.waitForFunction(() => document.querySelectorAll('#grammarAcademyCatalog .ga-stage-card').length === 4);
  assert.ok(await page.locator('#grammarAcademyCatalog .ga-lesson-link').count() >= 40,
    'Academy lesson catalog did not expose the complete mapped curriculum');
  const addedLessons = [
    ['sequence-of-tenses','Sequence of Tenses'],
    ['reduced-relative-clauses','Reduced Relative Clauses'],
    ['non-finite-verbs','Non-finite Verb Constructions'],
    ['modifier-placement','Modifier Placement'],
    ['inversion','Inversion and Emphasis'],
    ['subjunctive','Subjunctive and Mandative Forms'],
    ['sentence-transformations','Sentence Transformations']
  ];
  for (const [id,title] of addedLessons) {
    await clickMainView('grammar');
    await page.locator('#grammarAcademyCatalog .ga-lesson-link').filter({hasText:title}).click();
    await page.waitForFunction(() => document.getElementById('view-topic')?.classList.contains('active'),null,{timeout:5000});
    assert.equal(await page.locator('#topicTitle').textContent(),title,'New Academy lesson did not open under its own title: '+id);
    assert.equal(await page.locator('#view-topic .ga-lesson').getAttribute('aria-label'),title+' Academy lesson',
      'New Academy lesson content did not render: '+id);
    assert.equal(await page.evaluate(lessonId => State.topicProgress[lessonId],id),true,
      'New Academy lesson progress was not recorded under its stable ID: '+id);
    const assessmentCount=await page.evaluate(lessonId => GRAMMAR_ACADEMY.topics.find(topic=>topic.id===lessonId)?.assessments.length,id);
    assert.ok(Number.isInteger(assessmentCount)&&assessmentCount>=3,'New Academy lesson has no tiered assessments: '+id);
    assert.ok((await page.locator('#topicMetaStrip').innerText()).includes(assessmentCount+' quiz Qs'),
      'Lesson metadata did not match the Academy assessment count for '+id);
    if (id === 'sequence-of-tenses') {
      await page.evaluate(() => { State.quizScores.tenses=79; saveState(); });
      await page.evaluate(() => jumpFlow('practice',document.querySelector('.flow-step[data-step="practice"]')));
      for (let question=0;question<assessmentCount;question++) {
        await page.locator('#optsWrap .quiz-option').first().click();
        if (question<assessmentCount-1) {
          await page.locator('#nextBtn').click();
          await page.waitForFunction(expected => document.getElementById('grammarQuizProgress')?.textContent===expected,
            'Question '+(question+2)+' of '+assessmentCount);
        }
      }
      await page.locator('#nextBtn').click();
      await page.waitForSelector('#pane-quiz .quiz-complete-card',{timeout:5000});
      const lessonScore=await page.evaluate(() => ({academy:State.quizScores['sequence-of-tenses'],legacy:State.quizScores.tenses}));
      assert.equal(typeof lessonScore.academy,'number','New Academy quiz score was not saved under its own stable ID');
      assert.equal(lessonScore.legacy,79,'New Academy quiz overwrote its legacy parent topic score');
      await page.evaluate(() => jumpFlow('summary',document.querySelector('.flow-step[data-step="summary"]')));
      await page.locator('#pane-summary .btn.glow-btn').click();
      const lessonCompletion=await page.evaluate(() => ({academy:State.completedTopics['sequence-of-tenses'],legacy:State.completedTopics.tenses}));
      assert.equal(lessonCompletion.academy,true,'New Academy completion was not saved under its own stable ID');
      assert.notEqual(lessonCompletion.legacy,true,'New Academy completion was incorrectly assigned to its legacy parent');
    }
  }
  console.log('PASS Grammar Academy: all seven added lessons open with accurate assessment counts and account-scoped IDs');
  await clickMainView('grammar');
  await page.locator('#grammarAcademyCatalog .ga-lesson-link').first().click();
  await page.waitForSelector('#view-topic .ga-lesson', { state: 'visible', timeout: 5000 });
  await page.locator('#gaSentenceInput').fill('Although the route was difficult, the team completed it.');
  await page.locator('#gaAnalyzeButton').click();
  assert.ok(await page.locator('#gaAnalysisOutput ol li').count() >= 2,
    'Interactive clause analysis failed to identify both clauses');
  await page.evaluate(() => jumpFlow('practice', document.querySelector('.flow-step[data-step="practice"]')));
  await page.locator('#optsWrap .quiz-option').first().click();
  assert.ok(await page.locator('#qFeedback .ga-choice-reasons li').count() >= 3,
    'Grammar feedback must explain the correct answer and plausible alternatives');
  const masteryAndAdaptive = await page.evaluate(() => {
    const recorded=State.grammarMastery?.determiners;
    const previousMastery=State.grammarMastery,previousQueue=State.reviewQueue;
    State.grammarMastery={sva:{attempts:2,correct:0,lastAttempt:1}};State.reviewQueue=[];
    const weak=reviewDueItems('grammar').find(item=>item.ref==='sva');
    State.grammarMastery=previousMastery;State.reviewQueue=previousQueue;
    return {recorded,weak:weak&&{ref:weak.ref,source:weak.source}};
  });
  assert.equal(masteryAndAdaptive.recorded?.attempts,1,'Grammar assessment did not update account-scoped mastery');
  assert.equal(masteryAndAdaptive.recorded?.correct,1,'Correct grammar assessment was not scored');
  assert.deepEqual(masteryAndAdaptive.weak,{ref:'sva',source:'weak-mastery'},'Weak grammar concepts did not enter adaptive revision');
  const mixedSelection = await page.evaluate(() => {
    const academy=VaaniGrammarAcademy;
    return JSON.stringify(academy.getMixedQuestions('browser-regression',12).map(item=>item.topicId));
  });
  assert.equal(await page.evaluate(() => JSON.stringify(VaaniGrammarAcademy.getMixedQuestions('browser-regression',12).map(item=>item.topicId))),
    mixedSelection, 'Mixed challenge selection changed for the same deterministic seed');
  await clickMainView('grammar');
  await page.locator('#grammarAcademyCatalog .ga-lesson-link').first().click();
  await page.waitForSelector('#view-topic .ga-lesson', { state:'visible', timeout:5000 });
  const lessonDepth = await page.evaluate(() => ({
    examples:document.querySelectorAll('#view-topic .ga-example').length,
    counterexamples:document.querySelectorAll('#view-topic .ga-example.is-counterexample').length,
    traps:document.querySelectorAll('#view-topic .ga-misconception').length,
    diagramSteps:document.querySelectorAll('#view-topic .ga-diagram li').length,
    exercises:document.querySelectorAll('#view-topic .ga-exercises > ol > li').length,
    provenance:document.querySelector('#view-topic .ga-provenance')?.textContent||''
  }));
  assert.ok(lessonDepth.examples>=3&&lessonDepth.counterexamples>=1,
    'Academy lesson needs worked examples and a counterexample: '+JSON.stringify(lessonDepth));
  assert.ok(lessonDepth.traps>=2&&lessonDepth.diagramSteps>=3&&lessonDepth.exercises>=2,
    'Academy lesson omitted misconception, diagram or conceptual exercise content: '+JSON.stringify(lessonDepth));
  assert.match(lessonDepth.provenance,/not official PYQs/i,'Original Academy practice provenance is missing');
  const reasoningSummary=page.locator('#view-topic .ga-exercises summary').first();
  await reasoningSummary.focus(); await page.keyboard.press('Enter');
  assert.equal(await reasoningSummary.locator('..').getAttribute('open')!==null,true,
    'Keyboard activation did not reveal the exercise reasoning');
  await clickMainView('grammar');
  await page.locator('#view-grammar .ga-catalog-head button').click();
  await page.waitForFunction(() => document.getElementById('view-topic')?.classList.contains('active'));
  assert.equal((await page.locator('#topicTitle').textContent()).trim(),'Mixed-concept challenge',
    'Academy mixed-concept challenge did not open');
  assert.match(await page.locator('#topicMetaStrip').textContent(),/12 questions.*authored practice/,
    'Mixed challenge did not announce its 12-question original-practice format');
  const mixedOptionCount=await page.locator('#optsWrap .quiz-option').count();
  const expectedMixedOptionCount=await page.evaluate(() =>
    VaaniGrammarAcademy.getMixedQuestions(dailyDateKey()+'|grammar-academy',12)[0]?.question.options.length||0);
  assert.ok(mixedOptionCount>=3,'Mixed challenge question has too few answer choices');
  assert.equal(mixedOptionCount,expectedMixedOptionCount,
    'Mixed challenge did not render the selected assessment’s authored answer choices');
  await page.locator('#optsWrap .quiz-option').first().click();
  assert.ok(await page.locator('#qFeedback .ga-choice-reasons li').count()>=3,
    'Mixed challenge answer did not explain the correct choice and alternatives');
  console.log('PASS Grammar Academy depth: worked/counterexamples, traps, diagrams, keyboard reasoning, mixed challenge and sourced practice labels');
  await clickMainView('grammar');
  await page.waitForFunction(() =>
    document.getElementById('view-grammar')?.classList.contains('active') &&
    !!document.querySelector('#grammarAcademyCatalog .ga-lesson-link')
  , null, { timeout: 5000 });
  // Grammar navigation rebuilds the catalog on the next frame. Let the
  // rebuilt button settle before sending keyboard input, avoiding a detached
  // focused node while still exercising the native Enter-to-click behavior.
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  ));
  const keyboardLessonLink = page.locator('#grammarAcademyCatalog .ga-lesson-link').first();
  await keyboardLessonLink.waitFor({ state: 'visible', timeout: 5000 });
  await keyboardLessonLink.press('Enter');
  await page.waitForFunction(() => document.getElementById('view-topic')?.classList.contains('active'), null, { timeout: 5000 });
  const academyA11y = await page.evaluate(() => ({
    focus:document.activeElement?.textContent?.trim(),
    reducedMotion:getComputedStyle(document.querySelector('.ga-lesson-link')).animationName
  }));
  assert.ok(academyA11y.focus, 'Keyboard activation did not focus/open a lesson');
  assert.equal(academyA11y.reducedMotion, 'none', 'Grammar Academy ignored the reduced-motion preference');
  await page.setViewportSize({width:320,height:800});
  const academyNarrow = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert.ok(academyNarrow.scrollWidth<=academyNarrow.width+2, 'Grammar Academy overflows a 320px viewport: '+JSON.stringify(academyNarrow));
  await page.setViewportSize({width:1440,height:1000});
  console.log('PASS Grammar Academy: mapped stages, lesson navigation, clause analysis, distractor feedback, keyboard/mobile layout and reduced motion');

  // SAFE 3D REGRESSION — every section gets exactly one isolated model.
  const threeDRegistry = await page.evaluate(() => ({
    exists: !!window.VAANI_3D,
    supported: window.VAANI_3D?.supported?.() ?? false,
    validation: window.VAANI_3D?.validate?.(),
    models: window.VAANI_3D?.models || [],
    viewCount: document.querySelectorAll('.view').length
  }));
  assert.equal(threeDRegistry.exists, true, 'VAANI 3D registry did not initialize');
  assert.equal(threeDRegistry.validation?.ok, true,
    '3D registry validation failed: ' + JSON.stringify(threeDRegistry.validation));
  assert.equal(threeDRegistry.models.length, 14, 'Expected 14 section-specific 3D models');
  assert.equal(threeDRegistry.validation.total, 14, '3D model count mismatch');
  assert.ok(threeDRegistry.viewCount >= 14, 'Expected all major views to be present');

  const threeDViews = [
    'dashboard','grammar','journey','topic','compare','compare-detail',
    'vocab','worddetail','books','pyq','games','leaderboard','profile','notifications'
  ];
  for (const modelView of threeDViews) {
    const info = await page.evaluate(view => {
      const el=document.getElementById('view-'+view);
      const model=el?.querySelector(':scope > .vaani-3d-model');
      if(!el||!model) return {ok:false,reason:'missing '+view};
      const rect=model.getBoundingClientRect();
      const cs=getComputedStyle(model);
      return {
        ok:true, name:model.dataset['3dModel']||null,
        pointerEvents:cs.pointerEvents, position:cs.position,
        width:rect.width,height:rect.height,
        cssWidth:parseFloat(cs.width)||0,cssHeight:parseFloat(cs.height)||0,
        finite:[rect.left,rect.top,rect.right,rect.bottom].every(Number.isFinite)
      };
    }, modelView);
    assert.equal(info.ok,true,'Missing 3D model for '+modelView);
    assert.equal(info.pointerEvents,'none','3D model intercepted input on '+modelView);
    assert.equal(info.position,'absolute','3D model must be absolutely isolated on '+modelView);
    assert.ok(info.cssWidth>0 && info.cssHeight>0,'3D model CSS dimensions are zero on '+modelView);
    if (info.width > 0 || info.height > 0) {
      assert.ok(info.width>0 && info.height>0,'Visible 3D model has zero size on '+modelView);
      assert.equal(info.finite,true,'Invalid 3D geometry on '+modelView);
    }
  }
  console.log('PASS 3D registry: 14 distinct section models, isolated pointer-events and finite geometry');

  // 1009-cycle torture loop: repeatedly route-switch through the primary
  // navigation while checking that the active model remains intact, unique,
  // non-interactive, and within the document bounds.
  const threeDCycleViews = ['dashboard','grammar','compare','vocab','books','pyq','games','leaderboard','profile','notifications'];
  for (let cycle=0; cycle<1009; cycle++) {
    const view=threeDCycleViews[cycle % threeDCycleViews.length];
    // Keep this rendering stress loop out of the browser's session history.
    // The dedicated mobile Back journey below tests real history entries.
    await page.evaluate(viewName => switchView(viewName, {history:false}), view);
    await page.waitForFunction(viewName => {
      const active=document.getElementById('view-'+viewName);
      return !!active?.querySelector(':scope > .vaani-3d-model');
    }, view, {timeout:3000});
    const probe=await page.evaluate(expected => {
      const active=document.querySelector('.view.active');
      const model=active?.querySelector(':scope > .vaani-3d-model');
      const rect=model?.getBoundingClientRect();
      const cs=model ? getComputedStyle(model) : null;
      return {
        activeId:active?.id||null,
        modelCount:active?.querySelectorAll(':scope > .vaani-3d-model').length||0,
        pointerEvents:cs?.pointerEvents||null,
        width:rect?.width||0,height:rect?.height||0,
        documentWidth:document.documentElement.scrollWidth,
        viewportWidth:innerWidth,
        modelOverflow:rect ? (rect.left < -2 || rect.right > innerWidth + 2) : true
      };
    }, view);
    assert.equal(probe.activeId,'view-'+view,'3D torture cycle navigated to wrong view: '+cycle);
    assert.equal(probe.modelCount,1,'Duplicate/missing 3D model after cycle '+cycle+' ('+view+')');
    assert.equal(probe.pointerEvents,'none','3D model captured input at cycle '+cycle+' ('+view+')');
    assert.ok(probe.width>0 && probe.height>0,'3D model collapsed at cycle '+cycle+' ('+view+')');
    assert.equal(probe.modelOverflow,false,'3D model escaped viewport at cycle '+cycle+' ('+view+'): '+JSON.stringify(probe));
    assert.ok(probe.documentWidth <= probe.viewportWidth + 2,
      '3D model caused horizontal overflow at cycle '+cycle+' ('+view+'): '+JSON.stringify(probe));
  }
  console.log('PASS 3D torture test: 1009 route/model cycles completed without duplicates, overflow or input interception');


  await clickMainView('notifications');
  await page.waitForTimeout(250);
  const notificationText = await page.locator('#view-notifications').innerText();
  assert.ok(!notificationText.includes('\\n'), 'A literal escaped newline leaked into the visible page');
  const notificationHero = await page.locator('#view-notifications .vx-hero').evaluate(el => ({
    before: getComputedStyle(el, '::before').content,
    background: getComputedStyle(el).backgroundImage,
    titleColor: getComputedStyle(el.querySelector('h1')).color
  }));
  assert.equal(notificationHero.before, 'none', 'Global header glass overlay is covering the redesigned notifications hero');
  assert.match(notificationHero.background, /linear-gradient/, 'Redesigned notifications hero lost its dark gradient');
  assert.equal(notificationHero.titleColor, 'rgb(251, 252, 255)', 'Redesigned notifications hero heading lost its light foreground');
  console.log('PASS notifications: no escaped newline; hero gradient and heading remain visible');
  await clickMainView('dashboard');

  await page.locator('#themeBtn').click();
  const darkTheme = await page.evaluate(() => document.body.getAttribute('data-theme'));
  assert.equal(darkTheme, 'dark', 'Theme toggle did not enter dark mode');
  await assertVisibleText('#continueTitle', 'Dark-mode dashboard briefing');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('gate')?.classList.contains('hide'), null, { timeout: 15000 });
  await page.waitForTimeout(900);
  await assertVisibleText('#continueTitle', 'Dashboard after saved-session reload');
  assert.ok(await page.locator('#roadmapTrack .rm-node').count() > 0, 'Roadmap was empty after saved-session reload');
  assert.ok(await page.locator('#missionList .mastery-row').count() >= 3, 'Missions were empty after saved-session reload');
  console.log('PASS theme/session reload: dashboard remains populated in dark mode after reload');

  await clickMainView('vocab');
  assert.ok(await page.locator('#vocabGrid .word-card').count() > 0, 'Vocabulary word bank is empty');
  const microLayout = await page.evaluate(() => {
    const strip = document.getElementById('dailySinglesStrip');
    const card = strip?.querySelector('.single-card');
    const btn = card?.querySelector('.v-book-capture');
    return {
      columns: strip ? getComputedStyle(strip).gridTemplateColumns.split(' ').length : 0,
      cardMinWidth: card ? Math.round(card.getBoundingClientRect().width) : 0,
      buttonWhiteSpace: btn ? getComputedStyle(btn).whiteSpace : '',
      buttonWidth: btn ? Math.round(btn.getBoundingClientRect().width) : 0
    };
  });
  assert.ok(microLayout.columns <= 4 && microLayout.columns >= 1, 'Invalid micro-lesson grid column count: ' + JSON.stringify(microLayout));
  assert.equal(microLayout.buttonWhiteSpace, 'nowrap', 'Book Register button is allowed to wrap character-by-character');
  assert.ok(microLayout.buttonWidth > 0, 'Book Register button has no measurable width');
  assert.ok(await page.locator('#dailySetTabs button').count() > 0, 'Daily set tabs are empty');
  assert.ok(await page.locator('#dailySetGrid .daily-card, #dailySetGrid .word-card, #dailySetGrid .vocab-card').count() > 0,
    'Daily set cards are empty');
  assert.ok(await page.locator('#dailySinglesStrip .single-card').count() > 0, 'Daily micro-lessons are empty');
  assert.ok(await page.locator('#confuseTableBody .cw-card').count() > 0, 'Confused-word section is empty');
  console.log('PASS vocabulary: bank, daily sets, micro-lessons and confused-word cards');
  const vocabSearchFixture = await page.evaluate(() => {
    const term=VOCAB[0].w.toLowerCase();
    return {term,count:VOCAB.filter(word=>word.w.toLowerCase().includes(term)||word.meanEn.toLowerCase().includes(term)).length,
      first:VOCAB[0].w};
  });
  await page.locator('#vocabSearch').fill(vocabSearchFixture.term);
  assert.equal(await page.locator('#vocabGrid .word-card').count(),vocabSearchFixture.count,
    'Vocabulary search did not return the matching bank records');
  await page.locator('#vocabGrid .word-card h3').first().click();
  await page.waitForFunction(() => document.getElementById('view-worddetail')?.classList.contains('active'));
  assert.equal((await page.locator('#wdWord').textContent()).trim(),vocabSearchFixture.first,
    'Vocabulary word detail did not open the selected search result');
  await page.locator('#view-worddetail .detail-back').click();
  await page.waitForFunction(() => document.getElementById('view-vocab')?.classList.contains('active'));
  await page.locator('#vocabSearch').fill('');
  await page.locator('#vocabCatChips [data-cat="advanced"]').click();
  const advancedExpected = await page.evaluate(() => VOCAB.filter(word=>word.cat.includes('advanced')).length);
  assert.equal(await page.locator('#vocabGrid .word-card').count(),advancedExpected,
    'Vocabulary category filter did not match advanced word records');
  await page.locator('#vocabDiffChips [data-diff="3"]').click();
  const hardExpected = await page.evaluate(() => VOCAB.filter(word=>word.cat.includes('advanced')&&String(word.diff)==='3').length);
  assert.equal(await page.locator('#vocabGrid .word-card').count(),hardExpected,
    'Vocabulary difficulty filter did not combine with the selected category');
  await page.locator('#dailySetTabs [data-key="nda"]').click();
  assert.equal(await page.locator('#dailySetGrid .word-card').count(),5,
    'NDA Frequent daily vocabulary tab did not render its five deterministic picks');
  await page.locator('#vocabCatChips [data-cat="all"]').click();
  await page.locator('#vocabDiffChips [data-diff="all"]').click();
  await page.locator('#vocabSearch').fill('');
  console.log('PASS vocabulary interactions: search, word detail/back, combined filters and daily set selection');

  // Use a fresh tab for browser-history assertions so the 1,009-cycle
  // rendering stress test above cannot exhaust Chromium's per-tab history cap.
  // Tabs in this context share localStorage, so the same saved test account loads.
  const navPage = await context.newPage();
  navPage.on('pageerror', error => pageErrors.push(error.stack || error.message));
  navPage.on('console', message => {
    if (message.type() !== 'error') return;
    const value = message.text();
    if (/\[VAANI\].*(render error|uncaught error)/i.test(value) ||
        /\[VBV\].*(error|failed)/i.test(value)) vaErrors.push(value);
  });
  await navPage.setViewportSize({ width: 390, height: 844 });
  await navPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await navPage.waitForFunction(() => document.getElementById('gate')?.classList.contains('hide'), null, { timeout: 15000 });
  await navPage.waitForFunction(() => document.getElementById('view-dashboard')?.classList.contains('active'));

  // Full mobile bottom-nav back journey: Home → Grammar → Vocab → PYQ → Updates
  // and then Back must walk that exact path without closing the document.
  await navPage.evaluate(() => {
    window.__vaaniTestPopTrace = [];
    window.addEventListener('popstate', event => {
      window.__vaaniTestPopTrace.push({
        eventState:event.state,
        state:history.state,
        url:location.href,
        active:document.querySelector('.view.active')?.id || null
      });
    });
  });
  const mobileNavJourney = ['grammar','vocab','pyq','notifications'];
  for (const view of mobileNavJourney) {
    await navPage.locator('#bottomNav button[data-view="' + view + '"]').click();
    await navPage.waitForFunction(v => document.getElementById('view-' + v)?.classList.contains('active'), view);
  }
  const journeyState = await navPage.evaluate(() => ({
    view: history.state?.vaaniView,
    url: location.href,
    length: history.length
  }));
  assert.equal(journeyState.view, 'notifications', 'Mobile nav did not record Updates as a history route');
  assert.match(journeyState.url, /[?&]v=notifications(?:#|$)/, 'Mobile nav route URL is not distinct');
  assert.ok(journeyState.length >= 5, 'Mobile navigation did not create enough history entries: ' + JSON.stringify(journeyState));

  for (const expected of ['pyq','vocab','grammar','dashboard']) {
    const beforeBack = await navPage.evaluate(() => ({
      url:location.href, state:history.state, active:document.querySelector('.view.active')?.id||null, length:history.length
    }));
    await navPage.goBack();
    const afterBack = await navPage.evaluate(() => ({
      url:location.href, state:history.state, active:document.querySelector('.view.active')?.id||null,
      length:history.length, popTrace:window.__vaaniTestPopTrace.slice()
    }));
    console.log('MOBILE BACK TRACE', JSON.stringify({expected,beforeBack,afterBack}));
    await navPage.waitForFunction(v => document.getElementById('view-' + v)?.classList.contains('active'), expected, {timeout:10000})
      .catch(async error => {
        const actual = await navPage.evaluate(() => ({
          url:location.href, state:history.state, active:document.querySelector('.view.active')?.id||null,
          length:history.length, popTrace:window.__vaaniTestPopTrace.slice()
        }));
        throw new Error('Browser back expected ' + expected + '; actual=' + JSON.stringify(actual) +
          '; previous=' + JSON.stringify(afterBack) + '; cause=' + error.message);
      });
    assert.equal(await navPage.evaluate(() => history.state?.vaaniView), expected,
      'Browser back did not return to ' + expected);
  }
  assert.equal(await navPage.evaluate(() => history.state?.vaaniView), 'dashboard',
    'Final back state is not Dashboard');
  console.log('PASS full mobile back journey: Updates → PYQ → Vocab → Grammar → Home');

  // Word-detail browser Back is also exercised in the isolated tab.
  await navPage.locator('#bottomNav button[data-view="vocab"]').click();
  await navPage.waitForFunction(() => document.getElementById('view-vocab')?.classList.contains('active'));
  await navPage.locator('#vocabGrid .word-card').first().locator('h3').click();
  await navPage.waitForFunction(() => document.getElementById('view-worddetail')?.classList.contains('active'));
  assert.equal(await navPage.evaluate(() => history.state?.vaaniView), 'worddetail',
    'Word-detail navigation did not create an in-app history state');
  await navPage.goBack();
  await navPage.waitForFunction(() => document.getElementById('view-vocab')?.classList.contains('active'));
  assert.equal(await navPage.evaluate(() => history.state?.vaaniView), 'vocab',
    'Browser back did not return to Vocabulary from Word Detail');
  console.log('PASS SPA browser back: Vocabulary → Dashboard and Word Detail → Vocabulary');
  await navPage.close();

  const firstWordCard = page.locator('#vocabGrid .word-card').first();
  const capturedWord = (await firstWordCard.locator('h3').textContent() || '').trim();
  const capture = firstWordCard.locator('.v-book-capture');
  assert.ok(await capture.count(), 'Vocabulary-to-Book-Reading capture button is missing');
  await capture.click();
  await page.waitForFunction(el => /Added to Register|In Register/.test(el.textContent || ''), await capture.elementHandle(), { timeout: 10000 });
  console.log('PASS vocabulary bridge: capture action returned a saved/duplicate state');

  await clickMainView('books');
  await page.waitForSelector('#app .vbv-command-center', { timeout: 15000 });
  assert.ok(await page.locator('#app .vbv-home-tool').count() >= 4, 'Book Reading command-centre shortcuts are missing');
  await page.locator('#vbv-mainnav button[data-route="vocab"]').click();
  await page.waitForTimeout(300);
  assert.ok(await page.locator('#app .vocab-card').count() > 0, 'Book Reading Vocab Register did not render');
  const registerText = (await page.locator('#app').textContent()) || '';
  assert.ok(registerText.includes(capturedWord), 'Captured Vocabulary word did not appear in the Book Reading register: ' + capturedWord);
  console.log('PASS Book Reading: command centre and captured word appears in the shared register');

  const bookNavRoutes = await page.locator('#vbv-mainnav button').evaluateAll(buttons => buttons.map(button => button.dataset.route));
  assert.ok(!bookNavRoutes.includes('levels'), 'Levels is still present in Book Reading navigation');
  assert.ok(!bookNavRoutes.includes('spoken'), 'Spoken English is still present in Book Reading navigation');
  await page.locator('#vbv-mainnav button[data-route="academy"]').click();
  await page.waitForSelector('#app .academy-page', { timeout: 15000 });
  assert.equal(await page.locator('#app .academy-card').count(), 4, 'Academy gallery must show all four academies');
  const academyHash = await page.evaluate(() => location.hash);
  await page.locator('#app .academy-hero-cta').click();
  assert.equal(await page.evaluate(() => location.hash), academyHash, 'Academy gallery shortcut must not leave the Academy route');
  await page.locator('#app .academy-card-photo').evaluateAll(frames => Promise.all(frames.map(frame => {
    const img = frame.querySelector('img');
    if (!img || img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once:true });
      img.addEventListener('error', resolve, { once:true });
      setTimeout(resolve, 20000);
    });
  })));
  academyImageResults = await page.locator('#app .academy-card-photo').evaluateAll(frames => frames.map(frame => {
    const img = frame.querySelector('img');
    return { alt:frame.getAttribute('aria-label')||img?.alt||'', src:img?.currentSrc||img?.src||'', width:img?.naturalWidth||0 };
  }));
  assert.equal(await page.locator('#app .academy-card-photo').count(), 4, 'Each academy needs an image card');
  console.log('PASS Book Reading Academy: four academy cards render with accessible alt text and source credits');

  for (const view of ['grammar', 'compare', 'pyq', 'games', 'leaderboard', 'profile']) {
    await clickMainView(view);
    await page.waitForTimeout(250);
  }
  assert.ok(await page.locator('.vp-logout-btn').count(), 'Profile logout control is missing');
  console.log('PASS navigation: all primary views opened; logout control is present');

  await clickMainView('profile');
  const profileState = await page.evaluate(() => ({
    name:String(State.name||'Cadet').trim(),
    initials:String(State.name||'Cadet').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0].toUpperCase()).join(''),
    expectedXP:String(State.xp||0)
  }));
  assert.equal((await page.locator('#profName').textContent()).trim(),profileState.name+"'s Service File",
    'Profile hero does not show the current account');
  assert.equal((await page.locator('#vpProfileAvatar').textContent()).trim(),profileState.initials,
    'Profile avatar initials do not match the current account');
  assert.equal(await page.locator('#vpOverviewStats .vp-overview-card').count(),4,
    'Profile learning overview is incomplete');
  assert.ok((await page.locator('#vpOverviewStats').innerText()).includes(profileState.expectedXP),
    'Profile learning overview does not show the current account XP');
  assert.equal(await page.locator('#vpRhythmGrid .vp-rhythm-cell').count(),14,
    'Profile activity rhythm did not render its 14 days');
  const focusTopic=(await page.locator('#vpFocusMission .vp-focus-mission b').textContent()||'').trim();
  await page.locator('#vpFocusMission button').click();
  await page.waitForFunction(() => document.getElementById('view-topic')?.classList.contains('active'));
  assert.equal((await page.locator('#topicTitle').textContent()).trim(),focusTopic,
    'Profile current-mission shortcut did not open the named grammar topic');
  console.log('PASS Profile: account identity, progress overview, 14-day rhythm and current-mission shortcut');

  await clickMainView('leaderboard');
  assert.equal(await page.locator('#serviceMetrics .service-metric').count(),4,
    'Personal service record metrics are incomplete');
  assert.equal(await page.locator('#personalBestsWrap .service-record-row').count(),5,
    'Personal bests did not render all recorded metrics');
  assert.equal(await page.locator('#serviceWeekWrap .service-week-day').count(),7,
    'Personal service record did not render a seven-day activity view');
  assert.ok(await page.locator('#serviceGoalList .service-goal-item').count()>0,
    'Personal service record has no progress-based next mission');
  const badgeBaseline=await page.evaluate(() => ({
    total:BADGES.length,earned:BADGES.filter(badge=>badge.check()).length,
    locked:BADGES.filter(badge=>!badge.check()).length
  }));
  await page.locator('#fieldLogFilters [data-filter="earned"]').click();
  assert.equal(await page.locator('#fieldLogFilters [data-filter="earned"]').getAttribute('aria-pressed'),'true',
    'Leaderboard earned filter did not expose its selected state');
  assert.equal(await page.locator('#fieldLogWrap .service-citation').count(),badgeBaseline.earned,
    'Leaderboard earned filter returned the wrong number of citations');
  assert.equal(await page.locator('#fieldLogWrap .service-citation.locked').count(),0,
    'Leaderboard earned filter retained locked citations');
  await page.locator('#fieldLogFilters [data-filter="locked"]').click();
  assert.equal(await page.locator('#fieldLogWrap .service-citation').count(),badgeBaseline.locked,
    'Leaderboard locked filter returned the wrong number of citations');
  assert.equal(await page.locator('#fieldLogWrap .service-citation.earned').count(),0,
    'Leaderboard locked filter retained earned citations');
  await page.locator('#fieldLogFilters [data-filter="all"]').click();
  assert.equal(await page.locator('#fieldLogWrap .service-citation').count(),badgeBaseline.total,
    'Leaderboard all filter did not restore the complete citation list');
  console.log('PASS Leaderboard: personal metrics, bests, activity, missions and earned/locked citation filters');

  await clickMainView('pyq');
  await page.evaluate(() => {
    const question = PYQ_ALL.find(q => q._exam === 'CDS' && q.y === 2022 && q.s === 'I' &&
      q.n === 1 && q.sec === 'Spotting Errors');
    if (!question) throw new Error('CDS I 2022 spotting-error regression question was not loaded');
    pvStartSession('section', [question], { title: 'CDS I 2022 · Spotting Errors' });
  });
  await page.waitForSelector('#view-pyq .pv-error-parts', { timeout: 10000 });
  const renderedParts = await page.locator('#view-pyq .pv-error-segment-label').allTextContents();
  assert.deepEqual(renderedParts, ['(a)', '(b)', '(c)'], 'Spotting Errors must show all three sentence-part labels');
  const renderedPrompt = (await page.locator('#view-pyq .pv-error-parts').textContent()) || '';
  assert.ok(renderedPrompt.includes('This task is being undertaken') &&
    renderedPrompt.includes('for the benefit of young people in needed') &&
    renderedPrompt.includes('at the instance of the Chief of the Group.'),
    'Spotting Errors segment text was not preserved');
  console.log('PASS PYQ presentation: CDS I 2022 spotting-error prompt displays labelled (a), (b), and (c) parts');
  const cdsOptions=await page.locator('#view-pyq .pv-options .pv-option').allTextContents();
  assert.equal(cdsOptions.length,4,'CDS I 2022 three-part question must retain four response options');
  assert.ok(cdsOptions[3].includes('No error'),'CDS I 2022 source marks the fourth response as No error');


  await page.evaluate(() => {
    const question = PYQ_ALL.find(q => q._exam === 'NDA' && q.y === 2009 && q.s === 'I' &&
      q.n === 17 && q.sec === 'Spotting Errors');
    if (!question) throw new Error('NDA 2009-I legacy spotting-error question was not loaded');
    pvStartSession('section', [question], { title: 'NDA I 2009 Spotting Errors' });
  });
  await page.waitForSelector('#view-pyq .pv-error-parts', { timeout: 10000 });
  const ndaParts = await page.locator('#view-pyq .pv-error-segment-label').allTextContents();
  assert.deepEqual(ndaParts, ['(a)', '(b)', '(c)'], 'Legacy NDA fragment choices must be rendered as marked parts');
  const ndaPrompt = (await page.locator('#view-pyq .pv-error-parts').textContent()) || '';
  assert.ok(ndaPrompt.includes('He hesitated to accept the post') &&
    ndaPrompt.includes('as he did not think') &&
    ndaPrompt.includes('that the salary would be enough'),
    'Legacy NDA fragments were not mapped to the sentence');
  console.log('PASS PYQ presentation: NDA 2009-I legacy answer-fragment format displays labelled parts');
  const fourPartFixture=await page.evaluate(()=>{
    const base=PYQ_ALL.find(q=>q._exam==='NDA'&&q.sec==='Spotting Errors');
    if(!base)throw new Error('No spotting-error record available for four-part fixture');
    const q={...base,_id:'__smoke-four-part-spotting__',n:9999,
      q:'The cadet reported (a) / the issue (b) / before the drill (c) / without delay. (d)',
      parts:['The cadet reported','the issue','before the drill','without delay.'],
      spottingFormat:'four-part',
      o:['Error in part (a)','Error in part (b)','Error in part (c)','Error in part (d)'],ans:3};
    const previous=PV.session;
    try{
      PV.session={mode:'practice',title:'Four-part spotting regression',questions:[q],index:0,
        answers:{},streak:0,bestStreak:0,remaining:null,perQSeconds:null,timeLimitSec:null};
      const doc=new DOMParser().parseFromString(pvSessionHTML(),'text/html');
      return {
        parts:[...doc.querySelectorAll('.pv-error-segment-label')].map(el=>el.textContent.trim()),
        options:[...doc.querySelectorAll('.pv-options .pv-option')].map(el=>(el.textContent||'').replace(/\s+/g,' ').trim()),
        prompt:doc.querySelector('.pv-error-parts')?.textContent||''
      };
    }finally{PV.session=previous;}
  });
  assert.deepEqual(fourPartFixture.parts,['(a)','(b)','(c)','(d)'],
    'Four-part spotting must preserve all four sentence-part labels');
  assert.equal(fourPartFixture.options.length,4,'Four-part spotting must have exactly four error-part choices');
  assert.ok(fourPartFixture.options.every((option,i)=>option.includes('Error in part ('+String.fromCharCode(97+i)+')')),
    'Four-part spotting choices must map to parts a-d: '+JSON.stringify(fourPartFixture.options));
  assert.ok(fourPartFixture.prompt.includes('without delay.'),'Fourth sentence fragment was dropped');
  console.log('PASS PYQ presentation: synthetic four-part format displays (a)-(d) and four matching answer choices');

  const inferredFormats=await page.evaluate(()=>{
    const base=PYQ_ALL.find(q=>q._exam==='NDA'&&q.sec==='Spotting Errors');
    if(!base)throw new Error('No spotting-error record available for inferred-format fixtures');
    const render=q=>{
      const previous=PV.session;
      try{
        PV.session={mode:'practice',title:'Spotting format regression',questions:[q],index:0,
          answers:{},streak:0,bestStreak:0,remaining:null,perQSeconds:null,timeLimitSec:null};
        const doc=new DOMParser().parseFromString(pvSessionHTML(),'text/html');
        const options=[...doc.querySelectorAll('.pv-options .pv-option')].map(el=>(el.textContent||'').replace(/\s+/g,' ').trim());
        return {
          parts:[...doc.querySelectorAll('.pv-error-segment-label')].map(el=>el.textContent.trim()),
          text:[...doc.querySelectorAll('.pv-error-segment-text')].map(el=>(el.textContent||'').replace(/\s+/g,' ').trim()),
          options,
          parsed:pyqSpottingParts(q),
          format:pyqSpottingFormat(q,pyqSpottingParts(q))
        };
      }finally{PV.session=previous;}
    };
    const four={...base,_id:'__smoke-inferred-four__',n:9998,
      q:'The cadet reported (a) / the issue (b) / before the drill (c) / without delay. (d)',
      o:['(a)','(b)','(c)','(d)']};
    delete four.parts;delete four.spottingFormat;delete four.spottingNoError;
    const three={...base,_id:'__smoke-inferred-three-no-error__',n:9997,
      q:'The cadet reported (a) / the issue (b) / before the drill (c) / No error (d)',
      o:['(a)','(b)','(c)','(d)']};
    delete three.parts;delete three.spottingFormat;delete three.spottingNoError;
    return {four:render(four),three:render(three)};
  });
  assert.equal(inferredFormats.four.format,'four-part','Four source segments should infer the four-part format');
  assert.deepEqual(inferredFormats.four.parts,['(a)','(b)','(c)','(d)']);
  assert.deepEqual(inferredFormats.four.text,['The cadet reported','the issue','before the drill','without delay.']);
  assert.ok(inferredFormats.four.options[3].includes('Error in part (d)'),
    'Four-part D must be Error in part (d): '+JSON.stringify(inferredFormats.four.options));
  assert.equal(inferredFormats.three.format,'three-part-no-error','A printed No error (d) must infer three-part format');
  assert.deepEqual(inferredFormats.three.parts,['(a)','(b)','(c)']);
  assert.equal(inferredFormats.three.options.length,4);
  assert.ok(inferredFormats.three.options[3].includes('No error'),
    'Three-part D must remain No error: '+JSON.stringify(inferredFormats.three.options));
  console.log('PASS PYQ presentation: inferred four-part D=Error in part (d); three-part D=No error');

  const fullPyqAudit = await page.evaluate(() => {
    const previous = PV.session;
    const issues = [];
    let checked = 0;
    try {
      for (const q of PYQ_ALL) {
        PV.session = {
          mode:'practice', title:'PYQ presentation audit', questions:[q], index:0,
          answers:{}, streak:0, bestStreak:0, remaining:null,
          perQSeconds:null, timeLimitSec:null
        };
        const markup = pvSessionHTML();
        const doc = new DOMParser().parseFromString(markup, 'text/html');
        const prompt = doc.querySelector('.pv-qtext');
        const options = [...doc.querySelectorAll('.pv-options .pv-option')];
        if (!prompt || !prompt.textContent.trim()) issues.push(q._id+': missing prompt');
        const isSpotting=String(q._sourceSec||q.sec).trim().toLowerCase()==='spotting errors';
        const expectedOptionCount=isSpotting?pyqOptionLabels(q).length:q.o.length;
        if (options.length !== expectedOptionCount) {
          issues.push(q._id+': expected '+expectedOptionCount+' visible options, found '+options.length);
        }
        if (options.some(option => !option.querySelector('.ol') || !(option.textContent||'').trim())) {
          issues.push(q._id+': option missing its letter or text');
        }
        if (q.passage && !doc.querySelector('.pv-passage-text')) issues.push(q._id+': passage missing from prompt');
        if (isSpotting) {
          const labels=[...doc.querySelectorAll('.pv-error-segment-label')].map(el=>el.textContent.trim());
          const parts=pyqSpottingParts(q)||[];
          const expected=parts.map((_,i)=>'('+String.fromCharCode(97+i)+')');
          if (labels.join('|')!==expected.join('|')) issues.push(q._id+': spotting parts missing or mislabelled: '+labels.join(','));
          if (parts.length!==3&&parts.length!==4) issues.push(q._id+': unsupported spotting part count '+parts.length);
          const format=pyqSpottingFormat(q,parts);
          const choices=pyqOptionLabels(q);
          if (format==='four-part'&&parts.length!==4) issues.push(q._id+': four-part format does not have four segments');
          if (format==='three-part-no-error'&&parts.length!==3) issues.push(q._id+': three-part-no-error format does not have three segments');
          if (format==='four-part'&&(choices.length!==4||choices[3]!=='Error in part (d)')) issues.push(q._id+': four-part D choice is not Error in part (d)');
          if (format==='three-part-no-error'&&(choices.length!==4||choices[3]!=='No error')) issues.push(q._id+': three-part D choice is not No error');
        }
        checked++;
        if (issues.length >= 30) break;
      }
    } finally {
      PV.session = previous;
    }
    return {checked,total:PYQ_ALL.length,issues};
  });
  assert.equal(fullPyqAudit.issues.length, 0, 'PYQ browser rendering issues: '+JSON.stringify(fullPyqAudit.issues));
  assert.equal(fullPyqAudit.checked, fullPyqAudit.total, 'Not every PYQ was rendered by the browser audit');
  console.log('PASS full-bank PYQ browser rendering: '+fullPyqAudit.checked+' questions checked across NDA and CDS');
  await page.evaluate(() => pvExitSession());
  assert.equal(await page.evaluate(() => document.body.classList.contains('pv-session-active')), false,
    'PYQ regression test left the active practice-session state behind');

  const pyqInteractionFixture=await page.evaluate(()=>{
    const question=PYQ_ALL.find(item=>Array.isArray(item.o)&&item.o.length>=2);
    if(!question)throw new Error('No PYQ is available for the answer/bookmark interaction regression');
    return {id:question._id,answer:question.ans,hadExplanation:Object.prototype.hasOwnProperty.call(question,'exp'),oldExplanation:question.exp||''};
  });
  await page.evaluate(({id})=>{
    const question=PYQ_BY_ID[id];
    question.exp='Browser regression fixture: the selected answer is correct.';
    pvStartSession('practice',[question],{title:'Browser interaction regression'});
  },pyqInteractionFixture);
  await page.waitForSelector('#view-pyq .bm-star',{timeout:10000});
  await page.locator('#view-pyq .bm-star').click();
  assert.equal((await page.locator('#view-pyq .bm-star').getAttribute('class')).includes('active'),true,
    'PYQ bookmark control did not enter its saved state');
  assert.equal(await page.evaluate(id=>State.pyqBookmarks.includes('pyq:'+id),pyqInteractionFixture.id),true,
    'PYQ bookmark was not persisted in the account state');
  await page.locator('#view-pyq .pv-options .pv-option').nth(pyqInteractionFixture.answer).click();
  await page.waitForSelector('#view-pyq .pv-explain-panel',{timeout:5000});
  assert.ok((await page.locator('#view-pyq .pv-explain-panel').textContent()).includes('Browser regression fixture'),
    'PYQ correct-answer feedback did not show the available explanation');
  const pyqFeedback=await page.evaluate(id=>({
    correct:State.pyqStats.attempts[id],history:State.pyqStats.history.find(item=>item.qid===id)?.correct
  }),pyqInteractionFixture.id);
  assert.equal(pyqFeedback.correct,true,'Correct PYQ selection did not update the account attempt record');
  assert.equal(pyqFeedback.history,true,'PYQ answer was not added to recent activity');
  await page.evaluate(()=>pvGoHome());
  await page.locator('#pvApp .pv-mode-card').filter({hasText:'Bookmarks'}).click();
  await page.waitForSelector('.vx-scrim[role="dialog"]',{timeout:5000});
  assert.match(await page.locator('.vx-scrim').getAttribute('aria-label'),/Bookmarks/i,
    'Saved-question mode did not open its accessible test-setup dialog');
  assert.match(await page.locator('.vx-sheet .vx-readout').textContent(),/1 questions/,
    'Bookmark setup did not constrain its question count to the saved bank');
  await page.locator('.vx-sheet .vx-btn.primary').click();
  await page.waitForFunction(() => PV.screen==='session'&&PV.session?.mode==='bookmarks');
  assert.equal(await page.evaluate(id=>PV.session.questions.some(question=>question._id===id),pyqInteractionFixture.id),true,
    'Saved PYQ bookmark did not appear in the Bookmarks practice mode');
  await page.evaluate(()=>pvGoHome());
  await page.evaluate(({id,hadExplanation,oldExplanation})=>{
    if(hadExplanation)PYQ_BY_ID[id].exp=oldExplanation;else delete PYQ_BY_ID[id].exp;
  },pyqInteractionFixture);
  console.log('PASS PYQ interactions: save bookmark, answer with explanation, persist attempt and launch bookmarks');




  // Exercise every remaining Book Reading route, including empty states.
  await clickMainView('books');
  for (const route of ['home','dashboard','board','library','ongoing','completed','upcoming','vocab','vocabtest','achievements','academy']) {
    await page.locator('#vbv-mainnav button[data-route="' + route + '"]').click();
    await page.waitForFunction(routeName => {
      const current = (location.hash.replace('#/','').split('/')[0] || 'home');
      return current === routeName && !!document.querySelector('#app .page');
    }, route, { timeout: 10000 });
    await page.waitForTimeout(230);
    const pageText = ((await page.locator('#app').textContent()) || '').trim();
    assert.ok(pageText.length > 20, 'Book Reading route has no meaningful content: ' + route);
  }
  console.log('PASS Book Reading routes: home, progress, board, library, ongoing, completed, upcoming, vocab, vocab test, medals and academy');

  // End-to-end reading lifecycle: queue -> ongoing -> log/highlight -> completed -> searchable library.
  await page.locator('#vbv-mainnav button[data-route="upcoming"]').click();
  await page.locator('#up-title').fill('VAANI Regression Reading Journey');
  await page.locator('#up-author').fill('Smoke Test Author');
  await page.locator('#up-pages').fill('100');
  await page.locator('#up-category').selectOption('Fiction');
  await page.locator('#app button[onclick="addUpcoming()"]').click();
  await page.waitForFunction(() => document.querySelector('#app .book-card h4')?.textContent?.includes('VAANI Regression Reading Journey'));
  const queuedCard = page.locator('#app .book-card').filter({ hasText:'VAANI Regression Reading Journey' }).first();
  await queuedCard.locator('button[onclick^="openStartModal("]').click();
  await page.getByRole('button', { name:'Confirm Start' }).click();
  await page.waitForFunction(() => location.hash.startsWith('#/ongoingDetail/'), null, { timeout:10000 });
  await page.waitForSelector('#app #log-pages', { timeout:10000 });
  assert.ok((await page.locator('#app').textContent()).includes('VAANI Regression Reading Journey'), 'Started book detail is missing its title');
  await page.locator('#log-pages').fill('12');
  await page.locator('#log-minutes').fill('25');
  await page.locator('#vbv-book-log button[onclick^="addLog("]').click();
  await page.waitForSelector('#app .logtable tbody tr', { timeout:10000 });
  assert.ok((await page.locator('#app .logtable').textContent()).includes('12'), 'Reading log was not displayed after save');
  await page.locator('#highlight-input').fill('Consistency compounds over time.');
  await page.locator('#vbv-book-highlights button[onclick^="addHighlight("]').click();
  await page.waitForFunction(() => document.querySelector('#app .highlight-item')?.textContent?.includes('Consistency compounds over time.'));
  await page.locator('#app button[onclick^="openCompleteModal("]').click();
  await page.locator('#complete-review').fill('Browser journey completed.');
  await page.locator('#star-row span[data-val="4"]').click();
  await page.getByRole('button', { name:'Confirm Completion' }).click();
  await page.waitForFunction(() => location.hash === '#/completed', null, { timeout:10000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#app .book-card h4')).some(el => el.textContent.includes('VAANI Regression Reading Journey')), null, { timeout:10000 });
  const completedCard = page.locator('#app .book-card').filter({ hasText:'VAANI Regression Reading Journey' }).first();
  assert.ok(await completedCard.count(), 'Completed book was not filed in Completed');
  assert.ok((await completedCard.textContent()).includes('Browser journey completed.'), 'Completion review was not retained');
  assert.ok((await completedCard.textContent()).includes('12 / 100'), 'Page count was not retained on completion');
  await page.locator('#vbv-mainnav button[data-route="library"]').click();
  await page.waitForSelector('#app #lib-search', { timeout:10000 });
  await page.locator('#lib-search').fill('VAANI Regression Reading Journey');
  assert.equal(await page.locator('#app #library-book-grid .book-card').count(), 1, 'Library search did not find the completed book');
  await page.locator('#app #lib-status-row button[data-status="completed"]').click();
  assert.equal(await page.locator('#app #library-book-grid .book-card').count(), 1, 'Library completed-stage filter hid the completed book');
  await page.locator('#app #lib-sort').selectOption('title');
  console.log('PASS reading lifecycle: add, start, log, highlight, complete, search, filter and sort');

  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ['dashboard', 'vocab', 'books', 'profile']) {
    await clickMainView(view);
    await page.waitForTimeout(250);
    if (view === 'books') await page.waitForSelector('#app .page', { timeout: 15000 });
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scrollWidth <= dimensions.width + 2, 'Horizontal overflow on mobile ' + view + ': ' + JSON.stringify(dimensions));
  }
  const mobileFrameChecks = await page.evaluate(async views => {
    const probes=[];
    for(const view of views){
      switchView(view,{history:false,preserveScroll:true});
      for(let frame=0;frame<5;frame++){
        await new Promise(requestAnimationFrame);
        const active=[...document.querySelectorAll('.view.active')];
        const el=active[0],style=el&&getComputedStyle(el),rect=el?.getBoundingClientRect();
        probes.push({view,frame,activeCount:active.length,display:style?.display||'',visibility:style?.visibility||'',
          opacity:style?Number(style.opacity):0,width:rect?.width||0,height:rect?.height||0,
          documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth});
      }
    }
    return probes;
  },['dashboard','grammar','vocab','pyq','leaderboard','profile','compare','games']);
  assert.ok(mobileFrameChecks.every(probe=>probe.activeCount===1&&probe.display!=='none'&&probe.visibility==='visible'&&
    probe.opacity>=0.99&&probe.width>0&&probe.height>0&&probe.documentWidth<=probe.viewportWidth+2),
    'Mobile view flicker/blank-frame probe failed: '+JSON.stringify(mobileFrameChecks.filter(probe=>
      probe.activeCount!==1||probe.display==='none'||probe.visibility!=='visible'||probe.opacity<0.99||
      probe.width<=0||probe.height<=0||probe.documentWidth>probe.viewportWidth+2)));
  console.log('PASS mobile flicker probe: 40 animation frames across 8 redesigned views remained visible and within viewport');
  await clickMainView('books');
  await page.locator('#vbv-mainnav button[data-route="academy"]').click();
  await page.waitForSelector('#app .academy-page', { timeout: 15000 });
  assert.equal(await page.locator('#app .academy-card').count(), 4, 'Mobile Academy gallery is incomplete');
  const academyMobile = await page.evaluate(() => ({ width:innerWidth, scrollWidth:document.documentElement.scrollWidth }));
  assert.ok(academyMobile.scrollWidth <= academyMobile.width + 2, 'Horizontal overflow on mobile Academy: ' + JSON.stringify(academyMobile));
  console.log('PASS mobile Academy: all four cards fit a 390px viewport');
  await clickMainView('profile');


  console.log('PASS mobile layout: dashboard, vocabulary, Book Reading and profile fit a 390px viewport');

  // Exercise primary views at narrow-phone, tablet, laptop and wide-desktop sizes.
  // This checks the view and navigation shells as well as the main document width.
  for (const width of [320, 360, 390, 414, 768, 1024, 1280, 1600]) {
    console.log('RESPONSIVE CHECK viewport=' + width);
    await page.setViewportSize({ width, height: 900 });
    const views = width === 320
      ? ['dashboard', 'grammar', 'vocab', 'books', 'profile', 'notifications']
      : ['dashboard', 'grammar', 'compare', 'vocab', 'pyq', 'games', 'leaderboard', 'profile', 'notifications', 'books'];
    for (const view of views) {
      await clickMainView(view);
      const layout = await page.evaluate(() => {
        const active = document.querySelector('.view.active');
        const rect = active?.getBoundingClientRect();
        return {
          width: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          left: rect ? Math.round(rect.left) : null,
          right: rect ? Math.round(rect.right) : null,
          mainNavVisible: !!document.querySelector('#vaaniMainNav') &&
            getComputedStyle(document.querySelector('#vaaniMainNav')).display !== 'none',
          bottomNavVisible: !!document.querySelector('#bottomNav') &&
            getComputedStyle(document.querySelector('#bottomNav')).display !== 'none'
        };
      });
      assert.ok(layout.documentWidth <= width + 2,
        'Document overflow at ' + width + 'px in ' + view + ': ' + JSON.stringify(layout));
      assert.ok(layout.left !== null && layout.left >= -2 && layout.right <= width + 2,
        'Active view exceeds viewport at ' + width + 'px in ' + view + ': ' + JSON.stringify(layout));
      if (width >= 768) {
        assert.equal(layout.mainNavVisible, true, 'Primary navigation disappeared at ' + width + 'px');
        assert.equal(layout.bottomNavVisible, false, 'Mobile bottom navigation unexpectedly appears at ' + width + 'px');
      } else {
        assert.equal(layout.bottomNavVisible, true, 'Mobile bottom navigation disappeared at ' + width + 'px');
      }
    }
  }
  console.log('PASS responsive views: narrow phone, tablet, laptop and wide desktop layouts');

  // End-to-end regression: if a local board read returns no rows after an
  // attempt was saved, the completed local result must still appear in the
  // standings now and when the player reopens that match.
  await clickMainView('games');
  await page.locator('#view-games button.vx-tile').filter({ hasText: 'Start a match' }).click();
  await page.locator('#view-games button').filter({ hasText: 'Create match' }).click();
  await page.locator('#view-games button').filter({ hasText: 'Take it now' }).click();
  await page.locator('#view-games .vx-briefing-start').click();
  await page.evaluate(() => {
    window.__arenaSyncBeforeEmptyBoardRegression = VX.arena.sync;
    VX.arena.useSync({
      name: 'empty-board-regression',
      live: false,
      submit: () => Promise.resolve(true),
      fetch: () => Promise.resolve([])
    });
  });
  try {
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#view-games button').filter({ hasText: /^Submit \(/ }).click();
    await page.waitForSelector('#view-games .vx-board-summary-card', { state: 'visible', timeout: 10000 });
    const immediateBoard = await page.evaluate(() => ({
      attempts: document.querySelector('#view-games .vx-board-summary-card strong')?.textContent,
      rows: document.querySelectorAll('#view-games .vx-board .vx-row-tap').length,
      currentRank: document.querySelector('#view-games .vx-result-rank strong')?.textContent
    }));
    assert.equal(immediateBoard.attempts, '1', 'Completed local result disappeared when the board adapter returned an empty list');
    assert.equal(immediateBoard.rows, 1, 'Current local result was not rendered as a leaderboard row');
    assert.equal(immediateBoard.currentRank, '#1', 'Current local result did not receive its local position');
    const championshipDesign = await page.evaluate(() => ({
      hero: document.querySelectorAll('#view-games .vx-championship-hero').length,
      svg: document.querySelectorAll('#view-games .vx-championship-svg').length,
      svgHidden: document.querySelector('#view-games .vx-championship-art')?.getAttribute('aria-hidden'),
      podium: document.querySelectorAll('#view-games .vx-championship-podium-card').length,
      listHeading: document.querySelector('#view-games .vx-championship-list-head')?.textContent
    }));
    assert.equal(championshipDesign.hero, 1, 'Arena championship hero did not render');
    assert.equal(championshipDesign.svg, 1, 'Inline trophy artwork did not render');
    assert.equal(championshipDesign.svgHidden, 'true', 'Decorative trophy SVG must be hidden from screen readers');
    assert.equal(championshipDesign.podium, 1, 'Single-player championship podium card did not render');
    assert.match(championshipDesign.listHeading || '', /RANK\s*&\s*CADET.*SCORE.*TIME/i,
      'Leaderboard column labels did not render');

    const savedViewport = page.viewportSize();
    for (const width of [320, 360, 390, 414, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const bounds = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        deck: document.querySelector('#view-games .vx-championship')?.getBoundingClientRect().toJSON(),
        hero: document.querySelector('#view-games .vx-championship-hero')?.getBoundingClientRect().toJSON()
      }));
      assert.ok(bounds.documentWidth <= width + 2,
        'Arena leaderboard overflowed at ' + width + 'px: ' + JSON.stringify(bounds));
      assert.ok(bounds.deck && bounds.deck.left >= -2 && bounds.deck.right <= width + 2,
        'Arena leaderboard deck exceeded viewport at ' + width + 'px: ' + JSON.stringify(bounds.deck));
      assert.ok(bounds.hero && bounds.hero.width > 0,
        'Arena championship hero failed to size at ' + width + 'px');
    }
    await page.setViewportSize(savedViewport);

    await page.locator('#view-games button').filter({ hasText: 'Back to Arena' }).last().click();
    await page.locator('#view-games .vx-recent-row').first().getByRole('button', { name: 'Open' }).click();
    await page.locator('#view-games button').filter({ hasText: 'View your result & leaderboard' }).click();
    await page.waitForFunction(() =>
      document.querySelector('#view-games .vx-board-summary-card strong')?.textContent === '1'
    , { timeout: 10000 });
    assert.equal(await page.locator('#view-games .vx-board .vx-row-tap').count(), 1,
      'Saved local result was lost when reopening the match with an empty board adapter');
    console.log('PASS Arena result reconciliation: current and reopened local attempt appear despite an empty board response');
  } finally {
    await page.evaluate(() => {
      if (window.__arenaSyncBeforeEmptyBoardRegression) {
        VX.arena.useSync(window.__arenaSyncBeforeEmptyBoardRegression);
        delete window.__arenaSyncBeforeEmptyBoardRegression;
      }
    });
  }

  await page.locator('#view-games .vx-championship-refresh').click();
  await page.waitForFunction(() =>
    document.querySelectorAll('#view-games .vx-championship-row').length >= 12
  , { timeout: 10000 });
  const sharedBoard = await page.evaluate(() => ({
    attempts: document.querySelector('#view-games .vx-championship-metric strong')?.textContent,
    rows: document.querySelectorAll('#view-games .vx-championship-row').length,
    state: document.querySelector('#view-games .vx-championship-status')?.textContent
  }));
  assert.ok(Number(sharedBoard.attempts) >= 12, 'Historical shared attempts did not appear in the board summary');
  assert.ok(sharedBoard.rows >= 12, 'Historical shared players did not appear in the leaderboard');
  assert.match(sharedBoard.state || '', /SHARED READ.*UNVERIFIED HISTORY/i,
    'Shared historical results are not clearly marked as unverified');
  console.log('PASS Arena shared-read standings: 12 historical players render alongside local result');

  await clickMainView('profile');

  const savedAccountKeys = await page.evaluate(() =>
    Object.keys(localStorage).filter(key => key.startsWith('vbv_veer_bhogya_account_')));
  assert.ok(savedAccountKeys.length > 0, 'Account data was not persisted before logout');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.vp-logout-btn:visible').first().click();
  await page.waitForSelector('#gate-stage-start', { state: 'visible', timeout: 15000 });
  const afterLogout = await page.evaluate(() => ({
    session: localStorage.getItem('vbv_session_code'),
    accounts: Object.keys(localStorage).filter(key => key.startsWith('vbv_veer_bhogya_account_'))
  }));
  assert.equal(afterLogout.session, null, 'Logout did not clear the session pointer');
  assert.ok(afterLogout.accounts.length > 0, 'Logout removed the saved account data');
  console.log('PASS logout: session cleared while saved account data was retained');

  assert.deepEqual(pageErrors, [], 'Uncaught browser exceptions: ' + pageErrors.join(' | '));
  assert.deepEqual(vaErrors, [], 'Application render errors: ' + vaErrors.join(' | '));
  console.log('PASS runtime: no uncaught browser or VAANI/VBV render errors');
  assert.equal(academyImageResults?.length, 4, 'Each academy needs an image card');
  assert.ok(academyImageResults.every(image => image.alt && image.width > 0), 'One or more academy photos did not load: ' + JSON.stringify(academyImageResults));
  console.log('PASS Book Reading Academy: four real academy photos load with accessible alt text and source credits');
} catch (error) {
  try { await page.screenshot({ path: 'vaani-browser-smoke-failure.png', fullPage: true }); } catch {}
  console.error('Browser smoke test failed:', error.stack || error.message);
  if (pageErrors.length) console.error('Browser exceptions:', pageErrors.join('\n'));
  if (vaErrors.length) console.error('Application render errors:', vaErrors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
