import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL=process.env.VAANI_BASE_URL||'http://127.0.0.1:4173/';
const launchOptions={headless:true,args:['--no-sandbox']};
if(process.env.VAANI_BROWSER_EXECUTABLE)launchOptions.executablePath=process.env.VAANI_BROWSER_EXECUTABLE;
const browser=await chromium.launch(launchOptions);
try{
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#gate-stage-start',{state:'visible',timeout:15000});
  await page.evaluate(()=>{generateCode=()=> '111111';});
  await page.locator('#cadetName').fill('Account A');
  await page.locator('#gateBtn').click();
  await page.waitForSelector('#gate-stage-showcode',{state:'visible',timeout:15000});
  const firstCode=await page.locator('#gate-code-display').innerText();
  await page.locator('#gate-stage-showcode .gate-btn').click();
  await page.waitForSelector('#serviceForcePicker[data-mode="onboarding"]',{state:'visible',timeout:15000});
  await page.locator('#serviceForcePicker .service-force-option[data-force="army"]').click();
  await page.waitForFunction(()=>document.getElementById('gate')?.classList.contains('hide'));
  const accountA=await page.evaluate(async()=>{
    const code=getSessionCode();
    State.xp=321;State.completedTopics={noun:true};State.quizScores={sva:87};
    State.topicProgress={tenses:true};State.bookmarkedTopics={clauses:true};State.topicNotes={clauses:'Account A only'};
    State.grammarMastery={sva:{attempts:4,correct:3,lastAttempt:123}};toggleBookmark('a-pyq',null);
    localStorage.setItem('vaani_bookmarks',JSON.stringify(['legacy-a-pyq']));
    DATA.completed.push({id:'a-completed'});DATA.ongoing.push({id:'a-ongoing'});DATA.upcoming.push({id:'a-upcoming'});
    DATA.vocab.push({id:'a-word',word:'A-only'});DATA.achievements.push({id:'a-medal'});DATA.quizHistory.push({id:'a-score'});
    saveState();await saveData();return code;
  });
  assert.match(accountA,/^\d{6}$/);assert.match(firstCode.replace(/\s/g,''),/^111111$/);

  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.evaluate(()=>logout())
  ]);
  await page.waitForSelector('#gate-stage-start',{state:'visible',timeout:15000});
  const accountB=await page.evaluate(async()=>{generateCode=()=> '222222';return createNewAccount();});
  assert.equal(accountB,'222222');
  const cleanB=await page.evaluate(()=>({
    xp:State.xp,completed:State.completedTopics,scores:State.quizScores,progress:State.topicProgress,
    bookmarks:State.bookmarkedTopics,notes:State.topicNotes,grammarMastery:State.grammarMastery,pyqBookmarks:State.pyqBookmarks,pyqBookmarksApi:getBookmarks(),
    books:Object.fromEntries(['completed','ongoing','upcoming','vocab','achievements','quizHistory'].map(key=>[key,DATA[key]]))
  }));
  assert.equal(cleanB.xp,0);assert.deepEqual(cleanB.completed,{});assert.deepEqual(cleanB.scores,{});
  assert.deepEqual(cleanB.progress,{});assert.deepEqual(cleanB.bookmarks,{});assert.deepEqual(cleanB.notes,{});
  assert.deepEqual(cleanB.grammarMastery,{});
  assert.deepEqual(cleanB.pyqBookmarks,[]);assert.deepEqual(cleanB.pyqBookmarksApi,[],'New account inherited browser-wide PYQ bookmarks');
  for(const values of Object.values(cleanB.books))assert.deepEqual(values,[],'New account inherited Book Reading rows');

  await page.evaluate(async()=>{State.xp=12;State.vocabLearned={'b-word':true};toggleBookmark('b-pyq',null);await saveData();});
  const restoredA=await page.evaluate(async code=>{const result=await loginWithCode(code);return {result,state:State,books:DATA,pyqBookmarks:getBookmarks()};},accountA);
  assert.equal(restoredA.result.ok,true);assert.equal(restoredA.state.xp,321);
  assert.equal(restoredA.state.serviceForce,'army','Account A service preference was not restored');
  assert.equal(restoredA.state.completedTopics.noun,true);assert.equal(restoredA.state.quizScores.sva,87);
  assert.equal(restoredA.state.topicProgress.tenses,true);assert.equal(restoredA.state.bookmarkedTopics.clauses,true);
  assert.deepEqual(restoredA.state.grammarMastery.sva,{attempts:4,correct:3,lastAttempt:123});
  assert.deepEqual(restoredA.state.pyqBookmarks,['a-pyq']);assert.deepEqual(restoredA.pyqBookmarks,['a-pyq']);
  assert.equal(restoredA.state.topicNotes.clauses,'Account A only');assert.equal(restoredA.books.completed[0].id,'a-completed');
  assert.equal(restoredA.books.ongoing[0].id,'a-ongoing');assert.equal(restoredA.books.vocab[0].id,'a-word');

  const restoredB=await page.evaluate(async code=>{const result=await loginWithCode(code);return {result,state:State,books:DATA,pyqBookmarks:getBookmarks()};},accountB);
  assert.equal(restoredB.result.ok,true);assert.equal(restoredB.state.xp,12);
  assert.deepEqual(restoredB.state.pyqBookmarks,['b-pyq']);assert.deepEqual(restoredB.pyqBookmarks,['b-pyq'],'Account B PYQ bookmarks were not restored');
  for(const key of ['completedTopics','quizScores','topicProgress','bookmarkedTopics','topicNotes','grammarMastery'])assert.deepEqual(restoredB.state[key],{},'Account switch leaked '+key);
  assert.equal(restoredB.state.vocabLearned['b-word'],true);
  for(const [collection,id] of Object.entries({completed:'a-completed',ongoing:'a-ongoing',vocab:'a-word'})){
    assert.equal(restoredB.books[collection].some(item=>item.id===id),false,'Account switch leaked Book Reading '+collection);
  }

  const rejected=await page.evaluate(async()=>{
    localStorage.setItem('vbv_veer_bhogya_account_999999','[]');
    return loginWithCode('999999');
  });
  assert.equal(rejected.ok,false);assert.equal(await page.evaluate(()=>State.xp),12,'Malformed login changed the active profile');

  const partial=await page.evaluate(async()=>{
    localStorage.setItem('vbv_veer_bhogya_account_333333',JSON.stringify({
      vaani:{xp:6,completedTopics:[],quizScores:'bad',bookmarkedTopics:[],topicNotes:'bad',grammarMastery:[]},
      vbv:{completed:'bad',ongoing:{},vocab:[null,{id:'partial-word'}],goal:{monthlyBooks:'bad',dailyPages:17},
        levels:{viewed:{basic:{vocab:'bad',grammar:['clauses']}},quizScores:{basic:'90',intermediate:'bad'}}}
    }));
    const result=await loginWithCode('333333');
    return {result,state:State,books:DATA};
  });
  assert.equal(partial.result.ok,true);assert.equal(partial.state.xp,6);
  assert.deepEqual(partial.state.completedTopics,{});assert.deepEqual(partial.state.quizScores,{});
  assert.deepEqual(partial.state.bookmarkedTopics,{});assert.deepEqual(partial.state.topicNotes,{});
  assert.deepEqual(partial.state.grammarMastery,{});
  assert.deepEqual(partial.state.pyqBookmarks,['legacy-a-pyq'],'Legacy bookmarks were not adopted by the first existing account');
  assert.deepEqual(partial.books.completed,[]);assert.deepEqual(partial.books.ongoing,[]);
  assert.equal(partial.books.vocab.length,1);assert.equal(partial.books.vocab[0].id,'partial-word');
  assert.equal(partial.books.goal.monthlyBooks,2);assert.equal(partial.books.goal.dailyPages,17);
  assert.deepEqual(partial.books.levels.viewed.basic.vocab,[]);assert.deepEqual(partial.books.levels.viewed.basic.grammar,['clauses']);
  assert.equal(partial.books.levels.quizScores.basic,90);assert.equal(partial.books.levels.quizScores.intermediate,null);

  const switchedBack=await page.evaluate(async code=>{const result=await loginWithCode(code);return {result,xp:State.xp,pyqBookmarks:getBookmarks()};},accountB);
  assert.equal(switchedBack.result.ok,true);assert.equal(switchedBack.xp,12);
  assert.deepEqual(switchedBack.pyqBookmarks,['b-pyq']);
  const failedSwitch=await page.evaluate(async code=>{
    const original=Store.set;Store.set=async()=>null;
    try{const result=await loginWithCode(code);return {result,xp:State.xp,active:ACTIVE_CODE};}
    finally{Store.set=original;}
  },accountA);
  assert.equal(failedSwitch.result.ok,false);assert.equal(failedSwitch.xp,12);assert.equal(failedSwitch.active,accountB,'Failed save switched the active account');
  const failedLogout=await page.evaluate(async()=>{
    const original=Store.set;Store.set=async()=>null;
    try{const result=await logout();return {result,xp:State.xp,active:ACTIVE_CODE};}
    finally{Store.set=original;}
  });
  assert.equal(failedLogout.result,false);assert.equal(failedLogout.xp,12);assert.equal(failedLogout.active,accountB,'Failed save logged the account out');
  page.once('dialog',dialog=>dialog.accept());
  await Promise.all([page.evaluate(()=>resetProgress()),page.waitForNavigation({waitUntil:'domcontentloaded'})]);
  await page.waitForFunction(()=>document.getElementById('gate')?.classList.contains('hide'),null,{timeout:15000});
  const resetSnapshot=await page.evaluate(()=>({xp:State.xp,completed:State.completedTopics,scores:State.quizScores,pyqBookmarks:getBookmarks(),book:DATA.completed}));
  assert.equal(resetSnapshot.xp,0);assert.deepEqual(resetSnapshot.completed,{});assert.deepEqual(resetSnapshot.scores,{});
  assert.deepEqual(resetSnapshot.pyqBookmarks,[]);assert.deepEqual(resetSnapshot.book,[],'Resetting VAANI learning progress should preserve independent Book Reading data');
  await page.evaluate(()=>localStorage.setItem('vaani_state',JSON.stringify({xp:999,completedTopics:{'stale-global-cache':true}})));
  await Promise.all([
    page.evaluate(()=>logout()),
    page.waitForNavigation({waitUntil:'domcontentloaded'})
  ]);
  await page.waitForSelector('#gate-stage-start',{state:'visible',timeout:15000});
  const logoutState=await page.evaluate(()=>({xp:State.xp,completed:State.completedTopics,active:ACTIVE_CODE,books:DATA.completed}));
  assert.equal(logoutState.xp,0,'Logout left the previous profile in live memory');
  assert.deepEqual(logoutState.completed,{});assert.equal(logoutState.active,null);assert.deepEqual(logoutState.books,[]);
  const loggedOutLoad=await page.evaluate(()=>{loadState();return {xp:State.xp,pyqBookmarks:getBookmarks()};});
  assert.equal(loggedOutLoad.xp,0,'loadState hydrated an unscoped account snapshot while logged out');
  assert.deepEqual(loggedOutLoad.pyqBookmarks,[],'Logged-out state exposed another account’s PYQ bookmarks');
  await context.close();
  console.log('PASS account isolation: deterministic create/login/logout/switch, malformed/partial records, bookmarks, quiz scores, and legacy data preservation');
}finally{await browser.close();}
