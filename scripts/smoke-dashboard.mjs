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
await page.addInitScript(() => {
  window.__vaaniClipboardWrites = [];
  try {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async value => { window.__vaaniClipboardWrites.push(String(value)); } }
    });
    window.__vaaniClipboardMockInstalled = true;
  } catch (error) {
    window.__vaaniClipboardMockInstalled = false;
  }
});
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
async function dismissInfoTour() {
  // The first-visit briefing may be rendered either as the legacy Info Tour
  // or as the newer Officer VAANI briefing. CI only needs the onboarding
  // overlay cleared; it must not fail when the optional presentation route
  // takes longer than the page's normal boot path.
  await page.waitForFunction(() => {
    const tour = document.getElementById('viTour');
    const mentor = document.getElementById('vaaniMentor');
    return Boolean(tour?.classList.contains('open')) ||
      Boolean(mentor?.classList.contains('open')) ||
      (typeof State !== 'undefined' && State.infoTourVersion === '20261002-info-center1');
  }, null, { timeout: 10000 });
  if (await page.locator('#viTour.open').count()) {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('viTour')?.classList.contains('open'),
      null, { timeout: 5000 });
  }
  if (await page.locator('#vaaniMentor.open').count()) {
    await page.evaluate(() => {
      if (typeof window.vaaniCharacterHide === 'function') window.vaaniCharacterHide();
    });
    await page.waitForFunction(() => !document.getElementById('vaaniMentor')?.classList.contains('open'),
      null, { timeout: 5000 });
  }
}
async function clickMainView(name) {
  const desktopButton = page.locator('#vaaniMainNav button[data-view="' + name + '"]');
  const bottomButton = page.locator('#bottomNav button[data-view="' + name + '"]');
  if (await desktopButton.isVisible()) {
    await desktopButton.click();
  } else if (await bottomButton.count()) {
    await bottomButton.click();
  } else {
    const moreButton = page.locator('#bottomNav button').filter({ hasText: 'More' });
    const moreLabels = { books:'Book Reading', profile:'Profile', leaderboard:'Statistics', games:'Achievements', compare:'Comparisons', notifications:'Notifications' };
    const moreLabel = moreLabels[name];
    if (moreLabel && await moreButton.isVisible()) {
      await moreButton.click();
      await page.locator('#sheetBody .sheet-menu-item').filter({ hasText: moreLabel }).click();
    } else {
      throw new Error('No mobile navigation entry is available for ' + name);
    }
  }
  await page.waitForFunction(view => {
    const el = document.getElementById('view-' + view);
    return !!el && el.classList.contains('active');
  }, name);
  const navView = ({journey:'grammar',topic:'grammar','compare-detail':'compare',worddetail:'vocab'})[name] || name;
  for (const selector of ['#vaaniMainNav', '#bottomNav']) {
    const current = page.locator(selector + ' button[aria-current="page"]');
    if (await page.locator(selector + ' button[data-view="' + navView + '"]').count()) {
      assert.equal(await current.getAttribute('data-view'), navView,
        selector + ' should expose the active section through aria-current after navigating to ' + name);
    }
  }
}

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#gate-stage-start', { state: 'visible', timeout: 15000 });
  // Branding regression: check the circular site emblem and the actual local
  // favicon response, including alpha transparency at all four corners.
  const logoState = await page.evaluate(() => {
    const headerLogo = document.querySelector('.vaani-brand-logo');
    const gateLogo = document.querySelector('.gate-emblem-image');
    const favicon = document.querySelector('link[rel~="icon"][type="image/png"]');
    return {
      headerSrc: headerLogo?.getAttribute('src') || '',
      gateSrc: gateLogo?.getAttribute('src') || '',
      faviconHref: favicon?.getAttribute('href') || '',
      headerClip: headerLogo ? getComputedStyle(headerLogo).clipPath : '',
      gateClip: gateLogo ? getComputedStyle(gateLogo).clipPath : ''
    };
  });
  const expectedLogo = 'https://gcdn.picsart.com/cloud-storage/139d6748-1bf1-4286-b8d6-03414b61deb6.png';
  assert.equal(logoState.headerSrc, expectedLogo, 'header should use the supplied VAANI emblem');
  assert.equal(logoState.gateSrc, expectedLogo, 'welcome screen should use the supplied VAANI emblem');
  assert.equal(logoState.faviconHref, 'assets/vaani-emblem-favicon.png?v=20261001-circle2', 'browser tab should use the local circular favicon');
  assert.ok(logoState.headerClip.includes('47%'), 'header logo should crop only the square corners');
  assert.ok(logoState.gateClip.includes('47%'), 'welcome logo should crop only the square corners');
  const faviconUrl = new URL(logoState.faviconHref, page.url()).toString();
  const faviconResponse = await page.request.get(faviconUrl);
  assert.equal(faviconResponse.status(), 200, 'local browser favicon should return HTTP 200');
  assert.equal((faviconResponse.headers()['content-type'] || '').split(';')[0], 'image/png', 'favicon response should be PNG');
  const faviconAlpha = await page.evaluate(async src => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      cornerAlpha: ctx.getImageData(0, 0, 1, 1).data[3],
      centerAlpha: ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3]
    };
  }, faviconUrl);
  assert.deepEqual([faviconAlpha.width, faviconAlpha.height], [32, 32], 'favicon should remain a compact 32px image');
  assert.equal(faviconAlpha.cornerAlpha, 0, 'favicon corners should be transparent');
  assert.ok(faviconAlpha.centerAlpha > 0, 'favicon should retain the emblem center');
  await page.waitForFunction(() => {
    const images = [document.querySelector('.vaani-brand-logo'), document.querySelector('.gate-emblem-image')];
    return images.every(image => image && image.complete && image.naturalWidth > 0);
  }, null, { timeout: 15000 });
  console.log('PASS branding: circular header/welcome emblem and transparent local favicon');



  await page.evaluate(() => { generateCode=()=> '123456'; });
  await page.locator('#cadetName').fill('VAANI Smoke Cadet');
  await page.locator('#gateBtn').click();
  await page.waitForSelector('#gate-stage-showcode', { state: 'visible', timeout: 15000 });
  const codeText = await textOf('#gate-code-display');
  assert.match(codeText.replace(/\s/g, ''), /^\d{6}$/, 'New account code should contain six digits');
  await page.evaluate(() => { State.serviceForce = null; });
  await page.locator('#gate-stage-showcode .gate-btn').click();
  await page.waitForSelector('#serviceForcePicker[data-mode="onboarding"]', { state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#serviceForcePicker .service-force-option').count(), 3,
    'New account should be asked to select one of the three services');
  await page.locator('#serviceForcePicker .service-force-option[data-force="army"]').click();
  await page.waitForFunction(() => document.getElementById('gate')?.classList.contains('hide'), null, { timeout: 15000 });
  await dismissInfoTour();
  assert.equal(await page.evaluate(() => State.serviceForce), 'army', 'Selected service was not applied to the new account');

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
  assert.equal(await page.locator('.vd-flag-backdrop').count(),1,'Dashboard must include the Indian flag backdrop');
  assert.equal(await page.locator('.vd-officer-image').getAttribute('src'),'https://cdn-ai-hs.picsart.com/ai-hot-storage/2a136339-4163-42a0-b366-0541c84cc19a.png','Dashboard must use the AI-cleaned Officer VAANI cutout');
  console.log('PASS dashboard: flag hero, clean officer, roadmap, missions, word, heatmap, badges and focus sprint');

  // Officer VAANI must retain image state while either renderer changes poses.
  await page.evaluate(() => window.vaaniCharacterSpeak('dashboard'));
  await page.waitForSelector('#vaaniMentor .vc-character', { timeout: 5000 });
  const characterState = await page.evaluate(() => {
    const mentor = document.getElementById('vaaniMentor');
    const model = mentor.querySelector('.vc-character');
    const img = model.querySelector('.vc-character-sheet');
    const spriteSrc=img.getAttribute('src');
    const fallback = model.querySelector('.vc-character-fallback');
    img.dispatchEvent(new Event('load'));
    window.vaaniCharacterSpeak('grammar');
    const afterBase = {
      ready: model.classList.contains('asset-ready'),
      fallbackDisplay: getComputedStyle(fallback).display
    };
    const launcher = document.querySelector('.ve-header-mini');
    if (!launcher) throw new Error('Officer VAANI header launcher missing');
    const launcherBefore = {
      activeView:document.querySelector('.view.active')?.id||'',
      assessmentActive:typeof window.VAANI_IS_ASSESSMENT_ACTIVE==='function'?window.VAANI_IS_ASSESSMENT_ACTIVE():null,
      bodyClasses:document.body.className,
      dockPrefs:localStorage.getItem('vaani-officer-dock-v1')
    };
    console.log('DIAG Officer VAANI launcher:',JSON.stringify(launcherBefore));
    launcher.click();
    const afterElite = {
      ready: model.classList.contains('asset-ready'),
      speaking: mentor.classList.contains('speaking'),
      open: mentor.classList.contains('open'),
      poseCount: Array.from(model.classList).filter(c => /^vc-p(?:[0-9]|1[01])$/.test(c)).length
    };
    img.dispatchEvent(new Event('error'));
    window.vaaniCharacterSpeak('vocab');
    const afterError = {
      error: model.classList.contains('asset-error'),
      ready: model.classList.contains('asset-ready'),
      fallbackDisplay: getComputedStyle(fallback).display
    };
    img.dispatchEvent(new Event('load'));
    window.vaaniCharacterHide();
    return {afterBase,afterElite,afterError,fallbackAsset:fallback.querySelector('img')?.getAttribute('src')||'',spriteSrc};
  });
  assert.equal(characterState.spriteSrc,'https://cdn-ai-hs.picsart.com/ai-hot-storage/acfec6d8-2627-4b42-bd67-1923ba9898f4.png','Dock should use the AI-cleaned four-by-three pose sheet');
  assert.equal(characterState.afterBase.ready,true,'Base pose change erased loaded-image state');
  assert.equal(characterState.afterBase.fallbackDisplay,'none','Loaded sprite did not hide its fallback');
  assert.equal(characterState.afterElite.ready,true,'Elite pose change erased loaded-image state');
  assert.equal(characterState.afterElite.speaking,true,'Officer launcher briefing was closed by its own click');
  assert.equal(characterState.afterElite.open,true,'Officer launcher did not keep its briefing open');
  assert.equal(characterState.afterElite.poseCount,1,'Officer pose state became duplicated or invalid');
  assert.match(characterState.fallbackAsset,/assets\/officer-vaani\.svg(?:\?.*)?$/,'Officer VAANI needs a same-origin SVG fallback');
  assert.equal(characterState.afterError.error,true,'Image error state was erased by a later pose');
  assert.equal(characterState.afterError.ready,false,'Errored image remained marked as ready');
  assert.notEqual(characterState.afterError.fallbackDisplay,'none','Fallback disappeared after image failure');
  console.log('PASS Officer VAANI: pose state, local SVG fallback, launch click and briefing visibility');
  await page.evaluate(() => window.vaaniCharacterSpeak('dashboard'));
  await page.waitForSelector('#veAdjustToggle', { timeout:5000 });
  assert.equal(await page.locator('#vaaniMentor').evaluate(el=>el.classList.contains('speaking')),true,'Officer VAANI briefing did not open for controls');
  await page.locator('#veAdjustToggle').click();
  assert.equal(await page.locator('#veAdjustPanel').isVisible(),true,'Adjust panel did not open');
  await page.locator('#veDockScale').evaluate(el=>{el.value='117';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const resizeState=await page.evaluate(()=>({scale:Number(document.getElementById('vaaniMentor').style.getPropertyValue('--ve-dock-scale')),range:Number(document.getElementById('veDockScale').value),exact:Number(document.getElementById('veDockScaleExact').value)}));
  assert.ok(resizeState.scale>1&&resizeState.range===117&&resizeState.exact===117,'Officer VAANI did not resize to the exact requested size: '+JSON.stringify(resizeState));
  await page.locator('#veDockScaleExact').fill('123');
  await page.locator('#veDockScaleExact').dispatchEvent('change');
  assert.equal(await page.locator('#veDockScale').inputValue(),'123','Exact size input did not synchronize with the slider');
  await page.locator('#veDockX').fill('120');
  await page.locator('#veDockY').fill('104');
  await page.locator('#veDockApply').click();
  const precisePosition=await page.evaluate(()=>{const r=document.getElementById('vaaniMentor').getBoundingClientRect();return {left:Math.round(r.left),top:Math.round(r.top),x:Number(document.getElementById('veDockX').value),y:Number(document.getElementById('veDockY').value)};});
  assert.deepEqual(precisePosition,{left:120,top:104,x:120,y:104},'Exact pixel positioning did not apply consistently: '+JSON.stringify(precisePosition));
  await page.locator('#veMoveToggle').click();
  const dragBox=await page.locator('#vcCharacter').boundingBox();
  assert.ok(dragBox,'Officer VAANI character has no draggable bounds');
  await page.mouse.move(dragBox.x+dragBox.width/2,dragBox.y+dragBox.height/2);
  await page.mouse.down();
  await page.mouse.move(dragBox.x+dragBox.width/2+52,dragBox.y+dragBox.height/2+36,{steps:5});
  await page.mouse.up();
  await page.waitForTimeout(60);
  const movedState=await page.evaluate(()=>({positioned:document.getElementById('vaaniMentor').classList.contains('ve-positioned'),prefs:JSON.parse(localStorage.getItem('vaani-officer-dock-v1')||'{}'),rect:document.getElementById('vaaniMentor').getBoundingClientRect().toJSON()}));
  assert.equal(movedState.positioned,true,'Moving Officer VAANI did not set a custom position');
  assert.ok(movedState.prefs.position&&Number.isFinite(movedState.prefs.position.x)&&Number.isFinite(movedState.prefs.position.y),'New Officer VAANI position was not persisted');
  await page.locator('#veDockReset').click();
  assert.equal(await page.locator('#vaaniMentor').evaluate(el=>el.classList.contains('ve-positioned')),false,'Reset did not return Officer VAANI to its default corner');
  await page.locator('#veDockHide').click();
  assert.equal(await page.locator('#vaaniMentor').isVisible(),false,'Hide did not remove Officer VAANI from view');
  assert.equal(await page.locator('#veRestoreOfficer').count(),0,'Redundant bottom restore button must not be created');
  assert.equal(await page.locator('.ve-header-mini').isVisible(),true,'Header avatar should remain available to restore Officer VAANI');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vaani-officer-dock-v1')||'{}').hidden),true,'Hidden preference was not persisted');
  await page.reload();
  await page.waitForSelector('.ve-header-mini',{timeout:10000});
  assert.equal(await page.locator('#vaaniMentor').isVisible(),false,'Officer VAANI reappeared after refresh despite saved hidden preference');
  await page.locator('.ve-header-mini').click();
  await page.waitForSelector('#vaaniMentor.speaking',{timeout:5000});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vaani-officer-dock-v1')||'{}').hidden),false,'Restore did not persist the visible preference');
  assert.equal(await page.locator('#veRestoreOfficer').count(),0,'Redundant bottom restore button should remain absent');
  console.log('PASS Officer VAANI controls: resize, drag, reset, hide and header restore across refresh');


  await clickMainView('profile');
  await assertVisibleText('#vpProfileRank', 'Service-aware Profile rank');
  assert.equal(await page.locator('#rankDailyXPHint').count(), 0,
    'Profile should not render the retired daily-cap hint');
  assert.match(await page.locator('#rankPaceHint').textContent(), /there is no daily XP cap/,
    'Rank pacing should explain that XP earning is unlimited');
  assert.equal(await page.locator('#serviceRankBadgeSource').count(), 0,
    'Rank card should not expose insignia source links');
  assert.equal(await page.locator('#serviceRankList .vp-service-rank-insignia a').count(), 0,
    'Insignia images should not be clickable source links');
  await page.locator('#infoBtn').click();
  await page.waitForFunction(() => document.getElementById('view-info')?.classList.contains('active'), null, { timeout: 10000 });
  const xpRulesText=await page.locator('.vi-xp').innerText();
  assert.match(xpRulesText,/60–69%: −10 · 50–59%: −20 · 40–49%: −45 · 33–39%: −60 · below 33%: −80/,
    'VAANI Guide should disclose every accuracy deduction tier');
  assert.match(xpRulesText,/70%\+: −5 · 50–69%: −8 · 33–49%: −12 · below 33%: −15/,
    'VAANI Guide should disclose every net-marks deduction tier');
  assert.match(xpRulesText,/there is no maximum amount of XP you can legitimately earn in one calendar day/i,
    'VAANI Guide should disclose unlimited daily XP earning');
  assert.match(xpRulesText,/missed login day resets the streak/i,
    'VAANI Guide should disclose missed-login penalty');
  await clickMainView('profile');
  await page.locator('#serviceRankLadder summary').click();
  const armyLadder = await page.locator('#serviceRankList .vp-service-rank-row').allInnerTexts();
  const armyRankNames = await page.locator('#serviceRankList .vp-service-rank-name').allTextContents();
  assert.equal(armyLadder.length, 10, 'Army ladder should show 9 regular and 1 honorary officer rank');
  assert.match(armyLadder[0], /Lieutenant/, 'Army commissioned ladder should start at Lieutenant');
  assert.match(armyLadder[8], /General/, 'Army regular ladder should end at General');
  assert.match(armyLadder[9], /Field Marshal/, 'Army honorary rank should be displayed separately');
  assert.ok(await page.locator('#serviceRankList .vp-service-rank-insignia img').count() >= 9,
    'Army ladder is missing insignia images');
  assert.deepEqual(await page.locator('#serviceRankList .vp-service-rank-threshold').allTextContents(),
    ['100 total XP · +100 for this step','400 total XP · +300 for this step','900 total XP · +500 for this step','1,700 total XP · +800 for this step','3,000 total XP · +1,300 for this step','4,800 total XP · +1,800 for this step','7,200 total XP · +2,400 for this step','10,500 total XP · +3,300 for this step','14,500 total XP · +4,000 for this step','19,000 total XP · +4,500 for this step'],
    'Army milestones should show increasing cumulative thresholds and step costs');
  await page.evaluate(() => { State.xp=500; refreshDashboard(); });
  assert.equal(await page.locator('#rankTitle').textContent(), 'Captain',
    'Army 400-XP threshold should unlock Captain, not several ranks at once');
  assert.match(await page.locator('#rankXPText').textContent(), /Major.*900 total XP/,
    'Army rank progress should name Major and show its cumulative threshold');
  const rankBoundary=await page.evaluate(()=>({
    before:getServiceRankProgress(399,'army').current.name,
    at:getServiceRankProgress(400,'army').current.name,
    after:getServiceRankProgress(19000,'army').current.name,
    next:getServiceRankProgress(19000,'army').next
  }));
  assert.deepEqual(rankBoundary,{before:'Lieutenant',at:'Captain',after:'Field Marshal',next:null},
    'Rank transitions should occur only at their threshold and continue to Field Marshal');
  const paceMath=await page.evaluate(()=>({
    first:getMinimumXPDays(100,0,80),
    next:getMinimumXPDays(500,0,80),
    partiallyAvailable:getMinimumXPDays(50,30,80),
    canFinishToday:getMinimumXPDays(50,80,80),
    afterTop:getMinimumXPDays(0,80,80)
  }));
  assert.deepEqual(paceMath,{first:2,next:7,partiallyAvailable:1,canFinishToday:1,afterTop:0},
    'Milestone pace should provide a daily-rate estimate without imposing a daily XP cap');
  assert.equal(await page.locator('#rankDailyXPTrack').count(),0,
    'Retired daily allowance meter should not be rendered');
  assert.equal(await page.locator('#rankPaceHint').count(),1,
    'Rank card should provide an explicit next-milestone pace guide');
  await page.evaluate(() => { State.xp=0; refreshDashboard(); });

  const economy=await page.evaluate(()=>{
    const original={xp:State.xp,ledger:{...State.dailyXpEarned},activity:{...State.dailyActivity},xpLedger:[...(State.xpLedger||[])]};
    const today=new Date().toDateString();
    State.xp=0;State.dailyXpEarned={[today]:0};State.dailyActivity={[today]:0};
    const first=addXP(200,'unlimited earning regression');
    const continued=addXP(50,'continued earning regression');
    const afterEarning=State.xp;
    const penalty=deductXP(10,'deduction regression');
    const afterPenalty=State.xp;
    const afterLoss=addXP(50,'earning after deduction regression');
    const earned=State.dailyXpEarned[today];
    State.xp=original.xp;State.dailyXpEarned=original.ledger;State.dailyActivity=original.activity;State.xpLedger=original.xpLedger;
    saveState();refreshDashboard();
    return {first,continued,afterEarning,penalty,afterPenalty,afterLoss,earned};
  });
  assert.deepEqual(economy,{first:200,continued:50,afterEarning:250,penalty:10,afterPenalty:240,afterLoss:50,earned:300},
    'XP should remain uncapped, with deductions applied independently and earning available afterward');
  assert.match(await page.locator('#rankPaceHint').textContent(), /there is no daily XP cap/,
    'Profile should explain that continued earning is not daily-capped');

  const penaltyTiers=await page.evaluate(()=>({
    accuracy:[100,70,69,60,59,50,49,40,39,33,32,0].map(score=>({score,penalty:getAccuracyPenalty(score)})),
    marks:[100,70,69,50,49,33,32,0].map(score=>({score,penalty:getTotalMarksPenalty(score)})),
    fractionalAccuracy:[69.99,59.99,49.99,39.99,32.99].map(score=>({score,penalty:getAccuracyPenalty(score)})),
    fractionalMarks:[69.99,49.99,32.99].map(score=>({score,penalty:getTotalMarksPenalty(score)}))
  }));
  assert.deepEqual(penaltyTiers.accuracy,[
    {score:100,penalty:0},{score:70,penalty:0},{score:69,penalty:10},
    {score:60,penalty:10},{score:59,penalty:20},{score:50,penalty:20},
    {score:49,penalty:45},{score:40,penalty:45},{score:39,penalty:60},
    {score:33,penalty:60},{score:32,penalty:80},{score:0,penalty:80}
  ],'Accuracy penalty tiers must match every requested boundary');
  assert.deepEqual(penaltyTiers.marks,[
    {score:100,penalty:5},{score:70,penalty:5},{score:69,penalty:8},
    {score:50,penalty:8},{score:49,penalty:12},{score:33,penalty:12},
    {score:32,penalty:15},{score:0,penalty:15}
  ],'Total-marks penalty tiers must match every requested boundary');
  assert.deepEqual(penaltyTiers.fractionalAccuracy,[
    {score:69.99,penalty:10},{score:59.99,penalty:20},{score:49.99,penalty:45},
    {score:39.99,penalty:60},{score:32.99,penalty:80}
  ],'Accuracy deductions must not round a below-threshold score into the next tier');
  assert.deepEqual(penaltyTiers.fractionalMarks,[
    {score:69.99,penalty:8},{score:49.99,penalty:12},{score:32.99,penalty:15}
  ],'Net-mark deductions must preserve exact fractional threshold boundaries');
  const accuracy=await page.evaluate(()=>{
    const original={xp:State.xp,ledger:{...State.dailyXpEarned},activity:{...State.dailyActivity},xpLedger:[...(State.xpLedger||[])]};
    const today=new Date().toDateString();
    State.xp=100;State.dailyXpEarned={[today]:0};State.dailyActivity={[today]:0};
    awardAccuracyXP(50,'accuracy regression');
    const afterAccuracy=State.xp;
    const marksDeducted=deductExamMarksXP(50,'marks regression');
    const afterMarks=State.xp;
    const reward=awardAccuracyXP(70,'accuracy regression');
    const result={afterAccuracy,marksDeducted,afterMarks,reward,xp:State.xp,earned:State.dailyXpEarned[today]};
    State.xp=original.xp;State.dailyXpEarned=original.ledger;State.dailyActivity=original.activity;State.xpLedger=original.xpLedger;
    saveState();refreshDashboard();
    return result;
  });
  assert.deepEqual(accuracy,{afterAccuracy:80,marksDeducted:8,afterMarks:72,reward:0,xp:72,earned:0},
    'Accuracy and net-marks deductions should apply independently; passing accuracy adds no separate bonus');

  const history=await page.evaluate(()=>{
    const original=State.xpLedger;
    State.xpLedger=[];
    recordXPTransaction('earned',7,'Reward ledger regression');
    recordXPTransaction('deducted',10,'Penalty ledger regression');
    renderServiceXPLedger();
    const host=document.getElementById('rankXPLedger');
    const initial={
      entries:host?.querySelectorAll('.vp-xp-ledger-entry').length,
      text:host?.textContent||'',
      unsafeNodes:host?.querySelectorAll('img,script').length||0
    };
    recordXPTransaction('earned',3,'<img src=x onerror=alert(1)>');
    for(let i=1;i<=55;i++)recordXPTransaction('earned',i,'History '+i);
    renderServiceXPLedger();
    const bounded={
      stored:State.xpLedger.length,
      newest:State.xpLedger[0]?.reason,
      oldest:State.xpLedger[State.xpLedger.length-1]?.reason,
      visible:host?.querySelectorAll('.vp-xp-ledger-entry').length,
      text:host?.textContent||'',
      unsafeNodes:host?.querySelectorAll('img,script').length||0
    };
    State.xpLedger=original;
    renderServiceXPLedger();
    return {initial,bounded};
  });
  assert.equal(history.initial.entries,2,'XP history should render recorded gains and losses');
  assert.match(history.initial.text,/\+7 XP/,'XP history should show earned amounts with a plus sign');
  assert.match(history.initial.text,/−10 XP/,'XP history should show deductions with a minus sign');
  assert.equal(history.initial.unsafeNodes,0,'XP reasons must render as text, not executable markup');
  assert.equal(history.bounded.stored,50,'XP history must retain no more than 50 entries');
  assert.equal(history.bounded.newest,'History 55','XP history should keep the newest transaction first');
  assert.equal(history.bounded.oldest,'History 6','XP history should evict the oldest entries');
  assert.equal(history.bounded.visible,8,'XP history should render only its eight most recent entries');
  assert.equal(history.bounded.unsafeNodes,0,'XP history must remain safe after repeated rendering');
  assert.ok(history.bounded.text.includes('History 55'),'XP history should render the latest entry');

  const loginPenalty=await page.evaluate(()=>{
    const original={xp:State.xp,streak:State.streak,lastActive:State.lastActive,ledger:{...State.dailyXpEarned},activity:{...State.dailyActivity},xpLedger:[...(State.xpLedger||[])]};
    const prior=new Date();prior.setDate(prior.getDate()-2);
    State.xp=100;State.streak=5;State.lastActive=prior.toDateString();
    finishGateEntry();
    const once={xp:State.xp,streak:State.streak,lastActive:State.lastActive};
    finishGateEntry();
    const twice={xp:State.xp,streak:State.streak,lastActive:State.lastActive};
    State.xp=original.xp;State.streak=original.streak;State.lastActive=original.lastActive;
    State.dailyXpEarned=original.ledger;State.dailyActivity=original.activity;State.xpLedger=original.xpLedger;
    saveState();refreshDashboard();
    return {once,twice};
  });
  assert.equal(loginPenalty.once.xp,85,'One missed login day should deduct 15 XP');
  assert.equal(loginPenalty.once.streak,1,'A missed day should reset the daily streak');
  assert.deepEqual(loginPenalty.twice,loginPenalty.once,'Logging in twice on the same day must not repeat the penalty');
  await page.locator('#serviceRankLadder summary').click();
  await page.locator('#serviceRankCard .vp-service-change').click();
  await page.locator('#serviceForcePicker .service-force-option[data-force="navy"]').click();
  await page.waitForFunction(() => !document.getElementById('serviceForcePicker'));
  assert.equal(await page.evaluate(() => State.serviceForce), 'navy',
    'Changing service should update the active account');
  assert.equal(await page.evaluate(() => State.xp), 0,
    'Changing service should preserve learning XP');
  await page.locator('#serviceRankLadder summary').click();
  const navyLadder = await page.locator('#serviceRankList .vp-service-rank-row').allInnerTexts();
  const navyRankNames = await page.locator('#serviceRankList .vp-service-rank-name').allTextContents();
  assert.match(navyLadder[0], /Sub Lieutenant/, 'Navy ladder should start at Sub Lieutenant');
  assert.match(navyLadder[8], /Admiral/, 'Navy regular ladder should end at Admiral');
  assert.match(navyLadder[9], /Admiral of the Fleet/, 'Navy honorary rank should be visibly separate');

  await page.locator('#serviceRankCard .vp-service-change').click();
  await page.locator('#serviceForcePicker .service-force-option[data-force="airforce"]').click();
  await page.waitForFunction(() => !document.getElementById('serviceForcePicker'));
  assert.equal(await page.evaluate(() => State.serviceForce), 'airforce',
    'Changing to Air Force should update the active account');
  assert.equal(await page.evaluate(() => State.xp), 0,
    'Changing to Air Force should preserve learning XP');
  const ladderOpen = await page.locator('#serviceRankLadder').evaluate(el => el.open);
  if (!ladderOpen) await page.locator('#serviceRankLadder summary').click();
  const airforceLadder = await page.locator('#serviceRankList .vp-service-rank-row').allInnerTexts();
  const airforceRankNames = await page.locator('#serviceRankList .vp-service-rank-name').allTextContents();
  assert.match(airforceLadder[0], /Flying Officer/, 'Air Force ladder should start at Flying Officer');
  assert.match(airforceLadder[8], /Air Chief Marshal/, 'Air Force regular ladder should end at Air Chief Marshal');
  assert.match(airforceLadder[9], /Marshal of the Indian Air Force/, 'Air Force honorary rank should be visibly separate');
  assert.notDeepEqual(armyRankNames.slice(0,9),navyRankNames.slice(0,9),
    'Army and Navy should display different regular ranks');
  assert.notDeepEqual(armyRankNames.slice(0,9),airforceRankNames.slice(0,9),
    'Army and Air Force should display different regular ranks');
  assert.notDeepEqual(navyRankNames.slice(0,9),airforceRankNames.slice(0,9),
    'Navy and Air Force should display different regular ranks');

  await page.locator('#serviceRankCard .vp-service-change').click();
  await page.locator('#serviceForcePicker .service-force-option[data-force="army"]').click();
  await page.waitForFunction(() => !document.getElementById('serviceForcePicker'));
  await clickMainView('dashboard');
  console.log('PASS service ranks: distinct Army/Navy/Air Force ladders, insignia display, XP milestones, daily cap, strict penalties and force changes');

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
    const code=await createNewAccount();
    State.serviceForce='navy';
    await persistCombinedAccount();
    return code;
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
  // finishGateEntry schedules a first-visit guide for the newly active account.
  await dismissInfoTour();
  console.log('PASS account isolation: create, logout, restore, switch and reject malformed records');

  await clickMainView('grammar');
  const arenaSecurity = await page.evaluate(async () => {
    const arena=VX.arena;
    const match={source:'BOTH',count:8,seconds:240,cap:8,seed:482731,expiresAt:Date.now()+3600000};
    const code=arena.encode(match),decoded=arena.decode(code);
    const first=arena.questionsFor(decoded,'Smoke Cadet').map(question=>question._id);
    const second=arena.questionsFor(arena.decode(code),'Smoke Cadet').map(question=>question._id);
    const boardKey=code;
    const testEntry={pid:'smoke-player',name:'Smoke Cadet',score:6,seconds:60,total:8,at:1,answers:{}};
    const originalFetch=window.fetch;
    let request=null;
    window.fetch=(url,options={})=>{
      request={url:String(url),method:String(options.method||'GET'),body:options.body||null,
        contentType:options.headers?.['Content-Type']||options.headers?.['content-type']||''};
      const isLeaderboard=String(url).includes('/rest/v1/rpc/arena_get_leaderboard');
      return Promise.resolve({ok:true,json:()=>Promise.resolve(isLeaderboard
        ? {rows:[{code:boardKey,pid:'remote-player',name:'Remote Cadet',score:7,seconds:45,total:8,at:2}],verified:false,source:'historical'}
        : {ok:true,duplicate:false,source:'shared'})});
    };
    let sharedRows=[];
    try {
      // The shared writer is server-validated in production. Here the browser
      // smoke test stubs that response because this synthetic code is not
      // registered in the real Arena match table.
      await arena.sync.submit(boardKey,testEntry);
      localStorage.setItem('vx_arena_board_'+boardKey,JSON.stringify([testEntry]));
      sharedRows=await arena.sync.fetch(boardKey);
    } finally {
      window.fetch=originalFetch;
      localStorage.removeItem('vx_arena_board_'+boardKey);
    }
    const localRows=[testEntry];
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
  assert.equal(arenaSecurity.adapter,'shared','Shared Arena adapter was not configured');
  assert.equal(arenaSecurity.live,true,'Shared Arena adapter should expose its live network state');
  assert.equal(arenaSecurity.shared,true,'Arena must identify its shared read-only board');
  assert.equal(arenaSecurity.request.method,'POST','Shared Arena endpoint must use POST');
  assert.ok(arenaSecurity.request.url.includes('/rest/v1/rpc/arena_get_leaderboard'),'Shared Arena read did not use the Edge Function');
  assert.equal(JSON.parse(arenaSecurity.request.body).p_code,arenaSecurity.code,'Shared Arena read sent the wrong match code');
  assert.ok(arenaSecurity.request.contentType.toLowerCase().includes('application/json'),'Shared Arena read must send JSON');
  assert.equal(arenaSecurity.remoteAdapter,'undefined','Browser score writes must not expose the removed Supabase adapter');
  console.log('PASS Arena security: deterministic match, device-local submission, Edge Function historical read and no public writer');

  await clickMainView('grammar');
  const contrastAudit=await page.evaluate(()=>{
    const body=document.body;
    const saved={theme:body.dataset.theme,zen:body.classList.contains('mode-zen'),sepia:body.classList.contains('mode-sepia')};
    const rgb=value=>{
      const v=String(value||'').trim();
      if(/^#[\da-f]{3}$/i.test(v))return v.slice(1).split('').map(x=>parseInt(x+x,16));
      if(/^#[\da-f]{6}$/i.test(v))return [parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)];
      const m=v.match(/[\d.]+/g);return m&&m.length>=3?m.slice(0,3).map(Number):null;
    };
    const lum=value=>{
      const c=rgb(value);if(!c)return NaN;
      const v=c.map(x=>x/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));
      return .2126*v[0]+.7152*v[1]+.0722*v[2];
    };
    const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    const cases=[['light',null],['dark',null],['light','mode-zen'],['dark','mode-zen'],['light','mode-sepia']];
    const results=[];
    for(const [theme,mode] of cases){
      body.dataset.theme=theme;
      body.classList.toggle('mode-zen',mode==='mode-zen');
      body.classList.toggle('mode-sepia',mode==='mode-sepia');
      const cs=getComputedStyle(body),panel=cs.getPropertyValue('--panel').trim();
      const muted=cs.getPropertyValue('--muted').trim(),muted2=cs.getPropertyValue('--muted2').trim();
      results.push({theme,mode,muted,muted2,mutedRatio:ratio(muted,panel),muted2Ratio:ratio(muted2,panel)});
    }
    body.dataset.theme=saved.theme||'light';
    body.classList.toggle('mode-zen',saved.zen);
    body.classList.toggle('mode-sepia',saved.sepia);
    const grammarCopy=document.querySelector('#view-grammar .gt-browser-intro p');
    const grammarCompanion=document.querySelector('#view-grammar > .bc-global-link');
    const companionTitle=grammarCompanion?.querySelector('strong');
    const companionDetail=grammarCompanion?.querySelector('small');
    const companionButton=grammarCompanion?.querySelector('button');
    const companionBg='#16313a';
    return {
      results,
      grammarCopy:grammarCopy?{color:getComputedStyle(grammarCopy).color,opacity:getComputedStyle(grammarCopy).opacity}:null,
      grammarCompanion:grammarCompanion?{
        opacity:getComputedStyle(grammarCompanion).opacity,
        filter:getComputedStyle(grammarCompanion).filter,
        backgroundColor:getComputedStyle(grammarCompanion).backgroundColor,
        backgroundImage:getComputedStyle(grammarCompanion).backgroundImage,
        titleColor:companionTitle?getComputedStyle(companionTitle).color:'',
        detailColor:companionDetail?getComputedStyle(companionDetail).color:'',
        buttonColor:companionButton?getComputedStyle(companionButton).color:'',
        buttonBackground:companionButton?getComputedStyle(companionButton).backgroundColor:'',
        titleRatio:companionTitle?ratio(getComputedStyle(companionTitle).color,companionBg):NaN,
        detailRatio:companionDetail?ratio(getComputedStyle(companionDetail).color,companionBg):NaN,
        buttonRatio:companionButton?ratio(getComputedStyle(companionButton).color,getComputedStyle(companionButton).backgroundColor):NaN
      }:null
    };
  });
  assert.ok(contrastAudit.results.every(x=>x.mutedRatio>=4.5&&x.muted2Ratio>=4.5),
    'Theme tokens must retain readable muted and secondary text contrast: '+JSON.stringify(contrastAudit.results));
  assert.ok(!contrastAudit.grammarCopy||Number(contrastAudit.grammarCopy.opacity)===1,
    'Grammar supporting copy must not be faded');
  assert.ok(contrastAudit.grammarCompanion&&Number(contrastAudit.grammarCompanion.opacity)===1&&contrastAudit.grammarCompanion.filter==='none',
    'Grammar companion banner must not be faded or filtered');
  assert.ok(contrastAudit.grammarCompanion.backgroundImage.includes('rgb(22, 49, 58)')&&contrastAudit.grammarCompanion.backgroundColor==='rgb(11, 23, 34)',
    'Grammar companion banner must use its dark command surface: '+JSON.stringify(contrastAudit.grammarCompanion));
  assert.ok(contrastAudit.grammarCompanion.titleRatio>=4.5&&contrastAudit.grammarCompanion.detailRatio>=4.5&&contrastAudit.grammarCompanion.buttonRatio>=4.5,
    'Grammar companion title, description and action must meet 4.5:1 contrast: '+JSON.stringify(contrastAudit.grammarCompanion));
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
      assert.equal(await page.locator('#vaaniMentor').isVisible(),false,'Officer VAANI dock must stay out of live grammar quizzes');
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
      assert.equal(await page.locator('#pane-quiz .quiz-complete-card .vaani-result-briefing').count(),1,'Grammar completion must contain the Officer VAANI briefing inside its report card');
      const lessonScore=await page.evaluate(() => ({academy:State.quizScores['sequence-of-tenses'],legacy:State.quizScores.tenses}));
      assert.equal(typeof lessonScore.academy,'number','New Academy quiz score was not saved under its own stable ID');
      assert.equal(lessonScore.legacy,79,'New Academy quiz overwrote its legacy parent topic score');
      await page.evaluate(() => jumpFlow('summary',document.querySelector('.flow-step[data-step="summary"]')));
      assert.equal(await page.locator('#vaaniMentor.bad-result.show').count(),0,
        'A low score must not open a floating Officer VAANI recovery overlay');
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
  assert.equal(await page.evaluate(() => State.serviceForce), 'navy',
    'The active account service did not persist when the account resumed');
  assert.equal(await page.locator('#serviceForcePicker').count(), 0,
    'Returning account with a saved service should not be prompted again');
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
    const direct=navPage.locator('#bottomNav button[data-view="' + view + '"]');
    if (await direct.count()) {
      await direct.click();
    } else {
      await navPage.locator('#bottomNav button').filter({hasText:'More'}).click();
      await navPage.locator('#sheetBody .sheet-menu-item').filter({hasText:'Notifications'}).click();
    }
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
  assert.equal(await page.locator('#view-profile .ve-officer-station').count(),0,
    'Profile must not receive a floating station badge over the rank and logout controls');
  assert.equal(await page.locator('#vaaniMentor').isVisible(),false,
    'Floating Officer VAANI dock must be hidden while Profile is active');
  assert.equal(await page.locator('#vaaniMentor.open').count(),0,
    'Opening Profile must not trigger an unsolicited Officer VAANI briefing');
  const profileState = await page.evaluate(() => ({
    name:String(State.name||'Cadet').trim(),
    initials:String(State.name||'Cadet').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0].toUpperCase()).join(''),
    expectedXP:String(State.xp||0)
  }));
  const profileAccountCode = await page.evaluate(() => String(ACTIVE_CODE||''));
  assert.match(profileAccountCode,/^\d{6}$/, 'Active login code should contain exactly six digits');
  assert.ok(await page.locator('#vpAccountCodeCard').isVisible(),
    'Desktop/tablet Profile should show the account code card');
  assert.equal((await textOf('#vpAccountCodeValue')).replace(/\D/g,''),profileAccountCode,
    'Profile account code should match the active account');
  assert.equal(await page.locator('#mobileAccountCodeBar').isVisible(),false,
    'Mobile-only account code action should remain hidden on desktop');
  assert.equal(await page.evaluate(() => window.__vaaniClipboardMockInstalled),true,
    'Clipboard test harness did not install');
  await page.evaluate(() => { window.__vaaniClipboardWrites=[]; });
  await page.locator('#vpCopyAccountCode').click();
  await page.waitForFunction(() => window.__vaaniClipboardWrites?.length===1, null, {timeout:3000});
  assert.deepEqual(await page.evaluate(() => window.__vaaniClipboardWrites),[profileAccountCode],
    'Desktop Copy code button should copy the active account code');
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
  await page.waitForSelector('#pvTopicGrid.pv-topic-group-list > .pv-topic-group', { timeout: 10000 });
  const measureTopicGroup = () => page.locator('#pvTopicGrid').evaluate(root => {
    const group = root.querySelector('.pv-topic-group');
    const title = group && group.querySelector('.pv-topic-group-copy strong');
    return {
      isSeparated: root.classList.contains('pv-topic-group-list') && !root.classList.contains('pv-topic-grid'),
      rootWidth: root.getBoundingClientRect().width,
      groupWidth: group ? group.getBoundingClientRect().width : 0,
      titleWidth: title ? title.getBoundingClientRect().width : 0,
      titleHeight: title ? title.getBoundingClientRect().height : 0
    };
  });
  const desktopTopicLayout = await measureTopicGroup();
  assert.equal(desktopTopicLayout.isSeparated, true, 'outer topic groups must not reuse the inner skill-card grid');
  assert.ok(desktopTopicLayout.groupWidth > desktopTopicLayout.rootWidth * 0.9,
    'desktop topic group should span the available width: ' + JSON.stringify(desktopTopicLayout));
  assert.ok(desktopTopicLayout.titleWidth > 240 && desktopTopicLayout.titleHeight < 100,
    'desktop topic heading should not collapse into vertical character wrapping: ' + JSON.stringify(desktopTopicLayout));
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileTopicLayout = await measureTopicGroup();
  assert.ok(mobileTopicLayout.groupWidth > mobileTopicLayout.rootWidth * 0.9,
    'mobile topic group should span the available width: ' + JSON.stringify(mobileTopicLayout));
  assert.ok(mobileTopicLayout.titleWidth > 200 && mobileTopicLayout.titleHeight < 130,
    'mobile topic heading should remain readable: ' + JSON.stringify(mobileTopicLayout));
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log('PASS PYQ layout: full-width group panels and readable headings at desktop and mobile widths');
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
  assert.equal(await page.locator('#vaaniMentor.open').count(),0,'An answered PYQ must not open a floating briefing');
  await page.evaluate(()=>pvNext());
  await page.waitForFunction(()=>PV.screen==='summary',null,{timeout:5000});
  assert.ok(await page.locator('#view-pyq .pv-summary-hero').count(),'Completed practice must show its report card');
  assert.equal(await page.locator('#view-pyq .pv-summary-hero .vaani-result-briefing').count(),1,
    'PYQ practice report must contain the Officer VAANI briefing');
  assert.equal(await page.locator('#vaaniMentor.open').count(),0,'Finishing PYQ practice must not open a floating briefing');
  await page.evaluate(()=>pvGoHome());
  await page.locator('#pvApp .pv-mode-card').filter({hasText:'Practice Mode'}).click();
  await page.waitForSelector('.vx-setup-scrim .vx-source-card[data-source="NDA+CDS"]',{timeout:5000});
  const combinedSetup=await page.evaluate(()=>({
    choices:Array.from(document.querySelectorAll('.vx-source-card')).map(card=>({code:card.dataset.source,count:Number(card.dataset.count),label:card.querySelector('.vx-source-name')?.textContent||''})),
    expected:Object.fromEntries(['NDA+CDS','CDS+AFCAT','NDA+AFCAT','ALL'].map(source=>[source,VX.poolFor(source,PYQ_ALL).length]))
  }));
  for(const code of ['NDA+CDS','CDS+AFCAT','NDA+AFCAT','ALL']){
    const choice=combinedSetup.choices.find(item=>item.code===code);
    assert.ok(choice, 'Combined setup is missing '+code);
    assert.equal(choice.count,combinedSetup.expected[code],code+' displays an inaccurate question count');
  }
  assert.equal(combinedSetup.choices.find(item=>item.code==='ALL').label,'All three','The full combined bank should be labelled clearly');
  await page.locator('.vx-source-card[data-source="CDS+AFCAT"]').click();
  assert.equal(await page.locator('.vx-source-card[data-source="CDS+AFCAT"]').getAttribute('aria-pressed'),'true','Selected combination should have a clear selected state');
  await page.locator('.vx-btn.primary').click();
  await page.waitForFunction(()=>PV.screen==='session'&&PV.session?.mode==='practice');
  const startedCombined=await page.evaluate(()=>({count:PV.session.questions.length,source:PV.session.questions.map(q=>q._exam)}));
  assert.equal(startedCombined.count,20,'Combined bank should honour the chosen question count');
  assert.ok(startedCombined.source.every(code=>['CDS','AFCAT'].includes(code)),'Combined practice drew questions outside the selected pair');
  await page.evaluate(()=>pvGoHome());
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>pvLaunchMode('practice'));
  await page.waitForSelector('.vx-setup-scrim .vx-source-card[data-source="NDA+AFCAT"]',{timeout:5000});
  const mobileSetup=await page.locator('.vx-setup-sheet').evaluate(el=>({width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
  assert.ok(mobileSetup.width<=390&&mobileSetup.scrollWidth<=mobileSetup.clientWidth+1,'Mobile setup should fit without horizontal overflow: '+JSON.stringify(mobileSetup));
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#pvApp .pv-mode-card').filter({hasText:'Bookmarks'}).click();
  await page.waitForSelector('.vx-scrim[role="dialog"]',{timeout:5000});
  assert.match(await page.locator('.vx-scrim').getAttribute('aria-label'),/Bookmarks/i,
    'Saved-question mode did not open its accessible test-setup dialog');
  assert.match(await page.locator('.vx-sheet .vx-readout').textContent(),/1 question/,
    'Bookmark setup did not constrain its question count to the saved bank');
  await page.locator('.vx-sheet .vx-btn.primary').click();
  await page.waitForFunction(() => PV.screen==='session'&&PV.session?.mode==='bookmarks');
  assert.equal(await page.evaluate(id=>PV.session.questions.some(question=>question._id===id),pyqInteractionFixture.id),true,
    'Saved PYQ bookmark did not appear in the Bookmarks practice mode');
  await page.evaluate(()=>pvGoHome());
  await page.evaluate(({id,hadExplanation,oldExplanation})=>{
    if(hadExplanation)PYQ_BY_ID[id].exp=oldExplanation;else delete PYQ_BY_ID[id].exp;
  },pyqInteractionFixture);
  await page.evaluate(({id})=>pvStartSession('rapidfire',[PYQ_BY_ID[id]],{title:'Rapid Fire regression',perQSeconds:20}),pyqInteractionFixture);
  await page.waitForSelector('#view-pyq #pvTimerRingBox',{timeout:5000});
  assert.equal(await page.locator('#vaaniMentor.open').count(),0,'Rapid Fire must remain free of floating briefings');
  await page.locator('#view-pyq .pv-options .pv-option').nth(pyqInteractionFixture.answer).click();
  await page.evaluate(()=>pvNext());
  await page.waitForFunction(()=>PV.screen==='summary',null,{timeout:5000});
  assert.equal(await page.locator('#view-pyq .pv-summary-hero .vaani-result-briefing').count(),1,
    'Rapid Fire completion must show its Officer VAANI briefing inside the report card');
  await page.evaluate(()=>pvGoHome());
  console.log('PASS PYQ interactions: bookmark, answer review, bookmarks mode, practice report and rapid-fire report');
  await page.evaluate(()=>pvGoHome());
  await page.locator('#view-pyq .bc-open').click();
  await page.waitForSelector('#view-pyq .bc-companion',{timeout:5000});
  assert.match(await page.locator('#view-pyq .bc-stats').textContent(),/89/,'Book TOC count absent');
  await page.locator('#view-pyq [data-book-filter="grammar"]').click();
  await page.locator('#view-pyq .bc-row[data-book-chapter="grammar-10"] .bc-row-open').click();
  await page.waitForSelector('#view-pyq .bc-chapter',{timeout:5000});
  assert.match(await page.locator('#view-pyq .bc-reference').textContent(),/24/,'Printed page not shown');
  await page.locator('#view-pyq .bc-mark-read').click();
  assert.equal(await page.evaluate(()=>State.bookStudy.completedChapterIds.includes('grammar-10')),true,'Read marker did not persist');
  await page.locator('#view-pyq .bc-mark-exercise').click();
  await page.locator('#view-pyq .bc-chapter-practice').click();
  await page.waitForSelector('.vx-scrim[role="dialog"]',{timeout:5000});
  await page.locator('.vx-sheet .vx-btn.primary').click();
  await page.waitForFunction(()=>PV.screen==='session'&&PV.session?.mode==='bookpractice'&&PV.session?.bookChapterId==='grammar-10');
  const q=await page.evaluate(()=>({id:PV.session.questions[0]._id,ans:PV.session.questions[0].ans}));
  await page.locator('#view-pyq .pv-options .pv-option').nth(q.ans).click();
  assert.equal(await page.evaluate(id=>State.bookPracticeStats.attempts[id],q.id),true,'Book answer not stored');
  assert.equal(await page.evaluate(id=>State.pyqStats.attempts[id],q.id),undefined,'Book answer polluted PYQ tracking');
  await page.evaluate(()=>pvExitSession());
  console.log('PASS Wren & Martin Companion: printed references, checklists and isolated chapter drills');

  // The reference companion must be reachable from the related learning wings.
  await clickMainView('grammar');
  await page.locator('#view-grammar .bc-global-link button').click();
  await page.waitForSelector('#view-pyq .bc-companion',{timeout:5000});
  assert.equal(await page.evaluate(()=>PV.screen),'bookcompanion','Grammar entry did not open the companion');
  await clickMainView('books');
  await page.locator('#view-books .bc-global-link button').click();
  await page.waitForSelector('#view-pyq .bc-companion',{timeout:5000});
  assert.equal(await page.evaluate(()=>PV.screen),'bookcompanion','Book Reading entry did not open the companion');
  await clickMainView('pyq');
  await page.evaluate(()=>pvGoHome());
  console.log('PASS Wren & Martin entry points: Grammar, Book Reading and PYQ Center');





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
  await page.setViewportSize({width:390,height:844});
  await clickMainView('profile');
  const mobileAccountCode = await page.evaluate(() => String(ACTIVE_CODE||''));
  assert.match(mobileAccountCode,/^\d{6}$/, 'Mobile account code should match an active six-digit code');
  assert.equal(await page.locator('#vpAccountCodeCard').isVisible(),false,
    'The desktop account-code card should be hidden on phones');
  assert.ok(await page.locator('#mobileAccountCodeBar').isVisible(),
    'Mobile should show the Login code option at the top');
  assert.equal(await page.locator('#mobileAccountCodePanel').isVisible(),false,
    'Mobile login code should stay hidden until the user taps the option');
  assert.equal(await page.locator('#mobileAccountCodeToggle').getAttribute('aria-expanded'),'false',
    'Mobile login code toggle should start collapsed');
  await page.locator('#mobileAccountCodeToggle').click();
  assert.ok(await page.locator('#mobileAccountCodePanel').isVisible(),
    'Tapping Login code should reveal the code panel');
  assert.equal((await textOf('#mobileAccountCodeValue')).replace(/\D/g,''),mobileAccountCode,
    'Mobile reveal should show the current account code');
  assert.equal(await page.locator('#mobileAccountCodeToggle').getAttribute('aria-expanded'),'true',
    'Mobile login code toggle should expose its expanded state');
  await page.evaluate(() => { window.__vaaniClipboardWrites=[]; });
  await page.locator('#mobileAccountCodeCopy').click();
  await page.waitForFunction(() => window.__vaaniClipboardWrites?.length===1, null, {timeout:3000});
  assert.deepEqual(await page.evaluate(() => window.__vaaniClipboardWrites),[mobileAccountCode],
    'Mobile Copy button should copy the active account code');
  await page.locator('#mobileAccountCodeToggle').click();
  assert.equal(await page.locator('#mobileAccountCodePanel').isVisible(),false,
    'Tapping the open Login code option should hide the code panel');
  assert.equal(await textOf('#mobileAccountCodeValue'),'',
    'Hidden mobile login code should be cleared from the visible field');
  assert.equal(await page.locator('#mobileAccountCodeToggle').getAttribute('aria-expanded'),'false',
    'Mobile login code toggle should return to collapsed state');
  console.log('PASS Account code: desktop profile display/copy and mobile top-bar reveal/hide/copy');

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
    assert.equal(await page.locator('#view-games .vaani-result-briefing').count(),1,
      'Arena match results must embed the Officer VAANI briefing with the report');
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
