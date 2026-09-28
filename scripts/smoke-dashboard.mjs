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
  if (await desktopButton.isVisible()) {
    await desktopButton.click();
  } else {
    await page.locator('#bottomNav button[data-view="' + name + '"]').click();
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

  for (const view of ['grammar', 'compare', 'pyq', 'games', 'leaderboard', 'profile']) {
    await clickMainView(view);
    await page.waitForTimeout(250);
  }
  assert.ok(await page.locator('.vp-logout-btn').count(), 'Profile logout control is missing');
  console.log('PASS navigation: all primary views opened; logout control is present');

  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ['dashboard', 'vocab', 'books', 'profile']) {
    await clickMainView(view);
    await page.waitForTimeout(250);
    if (view === 'books') await page.waitForSelector('#app .vbv-command-center', { timeout: 15000 });
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scrollWidth <= dimensions.width + 2, 'Horizontal overflow on mobile ' + view + ': ' + JSON.stringify(dimensions));
  }
  console.log('PASS mobile layout: dashboard, vocabulary, Book Reading and profile fit a 390px viewport');

  const savedAccountKeys = await page.evaluate(() =>
    Object.keys(localStorage).filter(key => key.startsWith('vbv_veer_bhogya_account_')));
  assert.ok(savedAccountKeys.length > 0, 'Account data was not persisted before logout');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.vp-logout-btn').click();
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
