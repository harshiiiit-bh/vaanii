import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.VAANI_BASE_URL || 'http://127.0.0.1:4173/';
const launchOptions = { headless: true, args: ['--no-sandbox'] };
if (process.env.VAANI_BROWSER_EXECUTABLE) launchOptions.executablePath = process.env.VAANI_BROWSER_EXECUTABLE;

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
  serviceWorkers: 'block'
});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.stack || error.message));

async function dismissBriefing(){
  await page.waitForFunction(() => {
    const tour = document.getElementById('viTour')?.classList.contains('open');
    const mentor = document.getElementById('vaaniMentor')?.classList.contains('open');
    const latest = window.VAANI_LATEST_FEATURE_RELEASE?.version;
    const seen = typeof State !== 'undefined' && latest && State.infoTourVersion === latest;
    return Boolean(tour || mentor || seen);
  }, null, { timeout: 8000 });
  if(await page.locator('#viTour.open').count() || await page.locator('#vaaniMentor.open').count()){
    await page.keyboard.press('Escape');
    await page.waitForFunction(() =>
      !document.getElementById('viTour')?.classList.contains('open') &&
      !document.getElementById('vaaniMentor')?.classList.contains('open'),
      null, { timeout: 5000 });
  }
}

async function assertNoOverflow(label){
  const metrics=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth
  }));
  assert.ok(metrics.scrollWidth <= metrics.width + 1, label+' introduced horizontal overflow: '+JSON.stringify(metrics));
}

async function openMore(){
  const button=page.locator('#bottomNav button').filter({hasText:'More'});
  await button.click();
  await page.waitForFunction(()=>document.getElementById('moreSheet')?.classList.contains('show'));
  assert.ok(await page.locator('#sheetBody .mobile-more-item').count() >= 10,'More menu did not render its command grid');
  assert.equal(await page.locator('#sheetBody .sheet-category').count(),0,'Legacy nested More categories are still being rendered');
}

async function openMoreItem(label){
  await openMore();
  await page.locator('#sheetBody .mobile-more-item').filter({hasText:label}).first().click();
}

async function assertView(name,label){
  await page.waitForFunction(view => document.getElementById('view-'+view)?.classList.contains('active'), name);
  assert.equal(await page.locator('.view.active').getAttribute('id'),'view-'+name,label+' opened the wrong view');
  await assertNoOverflow(label);
}

try{
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#gate-stage-start',{state:'visible',timeout:15000});
  await page.evaluate(()=>{ generateCode=()=> '390844'; });
  await page.locator('#cadetName').fill('Mobile Smoke Cadet');
  await page.locator('#gateBtn').click();
  await page.waitForSelector('#gate-stage-showcode',{state:'visible',timeout:15000});
  await page.evaluate(()=>{ State.serviceForce=null; });
  await page.locator('#gate-stage-showcode .gate-btn').click();
  await page.waitForSelector('#serviceForcePicker[data-mode="onboarding"]',{state:'visible',timeout:15000});
  await page.locator('#serviceForcePicker .service-force-option[data-force="army"]').click();
  await page.waitForFunction(()=>document.getElementById('gate')?.classList.contains('hide'),null,{timeout:15000});
  await dismissBriefing();

  const bottomButtons=page.locator('#bottomNav button');
  assert.equal(await bottomButtons.count(),5,'Mobile primary navigation must contain exactly five destinations');
  assert.equal(await page.locator('#quickNavBtn').evaluate(el=>getComputedStyle(el).display),'none','Desktop quick navigator must not obstruct mobile');
  assert.ok(await page.locator('.mobile-dashboard-more').count(),'Dashboard master disclosure is missing');
  assert.equal(await page.locator('.mobile-dashboard-more').evaluate(el=>el.classList.contains('is-collapsed')),true,'Dashboard secondary modules should start collapsed');

  await page.locator('.mobile-dashboard-more-head').click();
  assert.equal(await page.locator('.mobile-dashboard-more').evaluate(el=>el.classList.contains('is-collapsed')),false,'Dashboard master disclosure did not open');
  await page.locator('.mobile-dashboard-more-head').click();
  await assertNoOverflow('dashboard');

  await openMoreItem('Grammar'); await assertView('grammar','Grammar');
  await openMoreItem('Vocabulary'); await assertView('vocab','Vocabulary');
  await openMoreItem('Comparisons'); await assertView('compare','Comparisons');
  await openMoreItem('90-Day Vocab'); await assertView('vocab90','90-Day Vocabulary');
  await openMoreItem('PYQ Vault'); await assertView('pyq','PYQ Vault');
  await openMoreItem('Arena'); await assertView('games','Arena');
  await openMoreItem('Profile'); await assertView('profile','Profile');
  await openMoreItem('Leaderboard'); await assertView('leaderboard','Leaderboard');
  await openMoreItem('Notifications'); await assertView('notifications','Notifications');
  await openMoreItem('Book Reading'); await assertView('books','Book Reading');
  await openMoreItem('VAANI Guide'); await assertView('info','VAANI Guide');

  await openMore();
  await page.locator('#sheetBody .mobile-more-item').filter({hasText:'Display & Settings'}).click();
  await page.waitForSelector('#focusPanel.show',{state:'visible',timeout:3000});
  await assertNoOverflow('settings');

  await page.evaluate(()=>switchView('dashboard'));
  await page.waitForFunction(()=>document.getElementById('view-dashboard')?.classList.contains('active'));
  await page.evaluate(()=>window.scrollTo({top:700,behavior:'instant'}));
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#bottomNav').evaluate(el=>el.classList.contains('mobile-nav-hidden')),true,'Bottom navigation should hide while scrolling down');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#bottomNav').evaluate(el=>el.classList.contains('mobile-nav-hidden')),false,'Bottom navigation should return when scrolling back up');

  assert.deepEqual(pageErrors,[],'Mobile smoke found page errors: '+pageErrors.join('\n'));
  console.log('Mobile smoke passed: navigation, More menu, dashboard disclosure, settings, overflow and scroll-aware bottom nav.');
} finally {
  await context.close();
  await browser.close();
}
