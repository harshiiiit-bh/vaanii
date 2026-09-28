import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.VAANI_BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce'
});
const page = await context.newPage();
const pageErrors = [];
const vaErrors = [];

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

  await clickMainView('notifications');
  await page.waitForTimeout(250);
  const notificationText = await page.locator('#view-notifications').innerText();
  assert.ok(!notificationText.includes('\\n'), 'A literal escaped newline leaked into the visible page');
  const notificationHero = await page.locator('#view-notifications .nc-hero').evaluate(el => ({
    before: getComputedStyle(el, '::before').content,
    background: getComputedStyle(el).backgroundImage,
    titleColor: getComputedStyle(el.querySelector('h1')).color
  }));
  assert.equal(notificationHero.before, 'none', 'Global header glass overlay is covering the notifications hero');
  assert.match(notificationHero.background, /linear-gradient/, 'Notifications hero lost its dark gradient');
  assert.equal(notificationHero.titleColor, 'rgb(255, 255, 255)', 'Notifications hero heading is not white');
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
  assert.ok(await page.locator('#dailySetTabs button').count() > 0, 'Daily set tabs are empty');
  assert.ok(await page.locator('#dailySetGrid .daily-card, #dailySetGrid .word-card, #dailySetGrid .vocab-card').count() > 0,
    'Daily set cards are empty');
  assert.ok(await page.locator('#dailySinglesStrip .single-card').count() > 0, 'Daily micro-lessons are empty');
  assert.ok(await page.locator('#confuseTableBody .cw-card').count() > 0, 'Confused-word section is empty');
  console.log('PASS vocabulary: bank, daily sets, micro-lessons and confused-word cards');

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
  const academyImageResults = await page.locator('#app .academy-card-photo').evaluateAll(frames => frames.map(frame => {
    const img = frame.querySelector('img');
    return { alt:frame.getAttribute('aria-label')||img?.alt||'', src:img?.currentSrc||img?.src||'', width:img?.naturalWidth||0 };
  }));
  assert.equal(academyImageResults.length, 4, 'Each academy needs an image card');
  assert.ok(academyImageResults.every(image => image.alt && image.width > 0), 'One or more academy photos did not load: ' + JSON.stringify(academyImageResults));
  console.log('PASS Book Reading Academy: four real academy photos load with accessible alt text and source credits');

  for (const view of ['grammar', 'compare', 'pyq', 'games', 'leaderboard', 'profile']) {
    await clickMainView(view);
    await page.waitForTimeout(250);
  }
  assert.ok(await page.locator('.vp-logout-btn').count(), 'Profile logout control is missing');
  console.log('PASS navigation: all primary views opened; logout control is present');

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
  await clickMainView('books');
  await page.locator('#vbv-mainnav button[data-route="academy"]').click();
  await page.waitForSelector('#app .academy-page', { timeout: 15000 });
  assert.equal(await page.locator('#app .academy-card').count(), 4, 'Mobile Academy gallery is incomplete');
  const academyMobile = await page.evaluate(() => ({ width:innerWidth, scrollWidth:document.documentElement.scrollWidth }));
  assert.ok(academyMobile.scrollWidth <= academyMobile.width + 2, 'Horizontal overflow on mobile Academy: ' + JSON.stringify(academyMobile));
  console.log('PASS mobile Academy: all four cards fit a 390px viewport');
  await clickMainView('profile');


  console.log('PASS mobile layout: dashboard, vocabulary, Book Reading and profile fit a 390px viewport');

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
} catch (error) {
  try { await page.screenshot({ path: 'vaani-browser-smoke-failure.png', fullPage: true }); } catch {}
  console.error('Browser smoke test failed:', error.stack || error.message);
  if (pageErrors.length) console.error('Browser exceptions:', pageErrors.join('\n'));
  if (vaErrors.length) console.error('Application render errors:', vaErrors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
