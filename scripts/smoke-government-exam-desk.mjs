import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const projectRoot = process.cwd();
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(projectRoot, '.' + requested);
    const relative = path.relative(projectRoot, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const baseURL = 'http://127.0.0.1:' + address.port + '/';
const launchOptions = { headless: true, args: ['--no-sandbox'] };
if (process.env.VAANI_BROWSER_EXECUTABLE) launchOptions.executablePath = process.env.VAANI_BROWSER_EXECUTABLE;
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const fixedToday = '2026-09-30';
let failFeeds = false;
const apiRequests = [];
const feedItems = [
  {
    id: 'close-today', title: 'SSC recruitment closing today', organization: 'SSC', category: 'SSC',
    type: 'Recruitment notification', status: 'open', notificationDate: '2026-09-01',
    applicationStartDate: '2026-09-01', lastDate: '2026-09-30', examDate: '2026-12-10',
    examDateConfirmed: true, eligibility: 'Class 12', url: 'https://ssc.gov.in/', official: true,
    summary: 'Applications close on the listed date.'
  },
  {
    id: 'open-eight-days', title: 'Bank officer recruitment', organization: 'IBPS', category: 'BANKING',
    type: 'Recruitment notification', status: 'application open', notificationDate: '2026-09-15',
    applicationStartDate: '2026-09-15', lastDate: '2026-10-08', examDate: '2027-01-15',
    eligibility: 'Bachelor degree in any discipline', url: 'https://www.ibps.in/', official: true,
    summary: 'An open banking recruitment cycle.'
  },
  {
    id: 'close-seven-days', title: 'Science service recruitment', organization: 'UPSC', category: 'UPSC',
    type: 'Annual Calendar', status: 'open', notificationDate: '2026-09-01',
    applicationStartDate: '2026-09-01', lastDate: '2026-10-07', examDate: '2027-03-01',
    dateConfidence: 'tentative', eligibility: 'B.Sc.', url: 'https://upsc.gov.in/', official: true,
    summary: 'Tentative date listed in an annual calendar.'
  },
  {
    id: 'sbi-extension-title', title: 'APPLY ONLINE (Online Registration Extended till 05.10.2026)',
    organization: 'SBI', category: 'BANKING', type: 'notification', status: 'notification',
    notificationDate: '05.10.2026', url: 'https://sbi.bank.in/', official: true,
    summary: 'Application registration has been extended.'
  },
  {
    id: 'sbi-range-near', title: 'APPLY ONLINE (16.09.2026 to 06.10.2026)',
    organization: 'SBI', category: 'BANKING', type: 'notification', status: 'notification',
    notificationDate: '16.09.2026', url: 'https://sbi.bank.in/', official: true,
    summary: 'Application window shown in the official listing.'
  },
  {
    id: 'sbi-range-open', title: 'APPLY ONLINE (30.09.2026 to 21.10.2026)',
    organization: 'SBI', category: 'BANKING', type: 'notification', status: 'notification',
    notificationDate: '30.09.2026', url: 'https://sbi.bank.in/', official: true,
    summary: 'Application window shown in the official listing.'
  },
  {
    id: 'expired-application', title: 'NDA closed application cycle', organization: 'UPSC', category: 'NDA',
    type: 'Recruitment notification', status: 'notification', notificationDate: '2026-08-01',
    applicationStartDate: '2026-08-01', lastDate: '2026-09-29', examDate: '2027-01-03',
    eligibility: 'Class 12', url: 'https://upsc.gov.in/', official: true,
    summary: 'This application cycle has closed.'
  },
  {
    id: 'future-start', title: 'NDA Officer Entry Calendar 2027', organization: 'UPSC', category: 'DEFENCE',
    type: 'Annual Calendar', status: 'scheduled', notificationDate: '2026-10-01',
    applicationStartDate: '2026-10-15', lastDate: '2026-10-20', examDate: '2027-04-10',
    examDateConfidence: 'tentative', eligibility: 'Class 12 with Physics and Mathematics',
    url: 'https://upsc.gov.in/', official: true, summary: 'Dates are scheduled in an annual calendar.'
  },
  {
    id: 'future-result', title: 'NDA answer key update', organization: 'UPSC', category: 'NDA',
    type: 'Answer key', status: 'released', examDate: '2027-02-14', eligibility: 'Class 12',
    url: 'https://upsc.gov.in/', official: true, summary: 'Post-exam answer key.'
  },
  {
    id: 'xss-open', title: '<img src=x onerror=window.__examDeskXss=1>', organization: 'State PSC', category: 'STATE_PSC',
    type: 'Recruitment notification', status: 'open', applicationStartDate: '2026-09-29',
    lastDate: '2026-10-20', examDate: '2026-12-20', eligibility: 'B.A.',
    url: 'https://bpsc.bihar.gov.in/', official: true, summary: 'Escaped feed content.'
  },
  { id: 'invalid-date', title: 'Invalid schedule', type: 'calendar', status: 'scheduled', examDate: '2026-02-31' },
  { id: 'missing-date', title: 'Incomplete scheduled record', status: 'upcoming' },
  null,
  'malformed row'
];
const archiveItems = [
  {
    id: 'historical-result', title: 'Historical NDA result', organization: 'UPSC', category: 'NDA',
    type: 'Result', status: 'result', archivedAt: '2026-09-20', eligibility: 'Class 12',
    url: 'https://upsc.gov.in/', summary: 'Archived result notice.'
  },
  null,
  {}
];

const sourceStatusFixture = {
  version: 1, checkedAt: '2026-09-30T09:00:00Z', status: 'partial',
  sourcesTotal: 3, sourcesOk: 2, sourcesFailed: 1, liveItems: 9, archiveItems: 3,
  snapshotRetained: false, concurrency: 4,
  sources: [
    { source: 'SSC', ok: true, found: 0, durationMs: 125 },
    { source: 'SBI', ok: true, found: 8, durationMs: 240 },
    { source: 'UPSC', ok: false, found: 0, durationMs: 310, error: '403 Forbidden' }
  ]
};

await context.addInitScript(({ fixed }) => {
  const NativeDate = Date;
  const fixedEpoch = new NativeDate(fixed + 'T12:00:00').valueOf();
  class FixedDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [fixedEpoch])); }
    static now() { return fixedEpoch; }
  }
  Object.setPrototypeOf(FixedDate, NativeDate);
  window.Date = FixedDate;
  Element.prototype.scrollIntoView = function (options) {
    window.__examDeskScrollBehavior = options && options.behavior;
  };
}, { fixed: fixedToday });

await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  const isApi = url.hostname === 'vaani-notifications-api.harshitchaubey127.workers.dev';
  if (isApi) apiRequests.push(url.pathname);
  const isLocalFeed = url.pathname.endsWith('/data/defence-notifications.json') || url.pathname.endsWith('/data/defence-notifications-archive.json');
  const isLocalStatus = url.pathname.endsWith('/data/defence-notifications-status.json');
  if (failFeeds && (isApi || isLocalFeed || isLocalStatus)) {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'fixture unavailable' }) });
    return;
  }
  if (isLocalStatus) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sourceStatusFixture) });
    return;
  }
  if (isApi && url.pathname.endsWith('/api/notifications/archive')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 1, generatedAt: '2026-09-30T09:00:00Z', items: archiveItems }) });
    return;
  }
  if (isApi && url.pathname.endsWith('/api/notifications')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 1, generatedAt: '2026-09-30T09:00:00Z', items: feedItems }) });
    return;
  }
  await route.continue();
});

const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(baseURL + '?v=notifications', { waitUntil: 'domcontentloaded' });
  // Exercise the same entry gate as a real visitor before clicking page controls.
  await page.waitForSelector('#gate-stage-start', { state: 'visible', timeout: 15000 });
  await page.evaluate(() => { generateCode = () => '654321'; });
  await page.locator('#cadetName').fill('Exam Desk Smoke Cadet');
  await page.locator('#gateBtn').click();
  await page.waitForSelector('#gate-stage-showcode', { state: 'visible', timeout: 15000 });
  await page.locator('#gate-stage-showcode .gate-btn').click();
  await page.waitForFunction(() => document.getElementById('gate')?.classList.contains('hide'), null, { timeout: 15000 });
  await page.locator('#vxSyncStamp').waitFor();
  await page.waitForFunction(() => {
    const text = document.querySelector('#vxSyncStamp')?.textContent || '';
    return text && !text.includes('Syncing official feeds');
  }, null, { timeout: 5000 }).catch(async error => {
    const status = await page.locator('#vxSyncStamp').textContent();
    throw new Error('Notification feed did not settle: ' + JSON.stringify(status) + ' (' + error.message + ')');
  });
  assert.deepEqual(apiRequests.slice().sort(), ['/api/notifications', '/api/notifications/archive'],
    'the Exam Desk should read the existing live feed and archive once each');
  assert.match(await page.locator('#vxFeedHealth').innerText(), /Partial source coverage/, 'feed health should disclose incomplete source coverage');
  assert.match(await page.locator('#vxFeedSummary').innerText(), /2\/3 sources reachable/, 'feed health should show the source coverage count');
  await page.locator('#vxSourceReport summary').click();
  assert.equal(await page.locator('#vxSourceList li').count(), 3, 'source details should list each configured source');
  assert.match(await page.locator('#vxSourceList').innerText(), /UPSC[\s\S]*403 Forbidden/, 'failed source diagnostics should be visible');
  await page.locator('#vxSourceReport summary').click();
  const initialRefreshRequests = apiRequests.length;
  await page.locator('#vxRefreshFeed').click();
  await page.waitForFunction(() => !document.querySelector('#vxRefreshFeed')?.disabled);
  assert.equal(apiRequests.length, initialRefreshRequests + 2, 'Refresh feed should recheck both live API endpoints');
  assert.equal(await page.locator('#vxNearList .vx-notice-card').count(), 4, 'refresh should preserve the classified deadline cards');

  assert.equal(await page.locator('#vxUpcomingList .vx-notice-card').count(), 1, 'only an upcoming future start should be in Upcoming');
  assert.equal(await page.locator('#vxOngoingList .vx-notice-card').count(), 3, 'open applications outside seven days, including title date ranges, should be Ongoing');
  assert.equal(await page.locator('#vxNearList .vx-notice-card').count(), 4, 'today, seven-day and inferred title deadlines should be Deadline Near');
  const extensionCard = page.locator('#vxNearList .vx-notice-card').filter({ hasText: 'Online Registration Extended till 05.10.2026' });
  assert.equal(await extensionCard.count(), 1, 'an explicitly extended application should appear in Deadline Near');
  assert.match(await extensionCard.innerText(), /CLOSING DATE[\s\S]*05 Oct 2026/i, 'the extension date should be labelled as the closing date');
  assert.match(await extensionCard.innerText(), /Closes in 5 days/, 'the extension card should show the remaining closing window');
  assert.equal(await page.locator('#vxNearList .vx-notice-card').filter({ hasText: '16.09.2026 to 06.10.2026' }).count(), 1,
    'a range ending within the next seven days should appear in Deadline Near');
  assert.equal(await page.locator('#vxOngoingList .vx-notice-card').filter({ hasText: '30.09.2026 to 21.10.2026' }).count(), 1,
    'a date range that is open today and closes beyond seven days should appear in Ongoing');
  assert.equal(await page.locator('#vxUpcomingList').innerText().then(text => text.includes('NDA Officer Entry Calendar 2027')), true);
  assert.equal(await page.locator('#vxUpcomingList').innerText().then(text => text.includes('answer key')), false,
    'a post-exam notice must not become an active opportunity');
  assert.equal(await page.locator('#vxArchiveGrid .vx-archive-card').count(), 3, 'expired application and both result records should stay archived');
  assert.equal(await page.locator('#vxExamDatesList .vx-date-row').count(), 7, 'future exam dates remain visible independently of application status');
  assert.equal(await page.locator('#vxExamDatesList .vx-date-month').count(), 5, 'future exam dates should be grouped by month and year');
  const calendarTitles = await page.locator('#vxExamDatesList .vx-date-row h4').allTextContents();
  assert.equal(calendarTitles[0], 'SSC recruitment closing today',
    'the exam calendar should sort by the actual exam date in chronological order');
  assert.ok(calendarTitles.includes('NDA closed application cycle'),
    'a future exam date should remain on the calendar even when its application is archived');
  assert.equal(await page.locator('#vxExamDatesList').innerText().then(text => text.includes('CONFIRMED · OFFICIAL NOTICE')), true);
  assert.equal(await page.locator('#vxExamDatesList').innerText().then(text => text.includes('TENTATIVE · CALENDAR')), true);
  assert.equal(await page.locator('#vxOngoingList img').count(), 0, 'feed text must be escaped before rendering');
  assert.equal(await page.evaluate(() => window.__examDeskXss || 0), 0, 'escaped feed text must not execute');

  const qualificationOptions = await page.locator('#vxQualification option').evaluateAll(options => options.map(option => option.value));
  for (const qualification of ['10th', '12th', 'iti', 'diploma', 'ba', 'bsc', 'bcom', 'bca', 'bba', 'btech', 'graduate', 'postgraduate', 'teaching', 'law', 'mbbs', 'nursing', 'paramedical']) {
    assert.ok(qualificationOptions.includes(qualification), 'qualification filter should include ' + qualification);
  }

  await page.locator('#vxSearch').fill('NDA');
  await page.locator('#vxQualification').selectOption('12th');
  await page.locator('#vxSector').selectOption('defence');
  assert.equal(await page.locator('#vxUpcomingList .vx-notice-card').count(), 1, 'search, qualification and sector filters should combine');
  assert.equal(await page.locator('#vxForcesGrid .vx-force-card').count() > 0, true, 'combined filters should retain matching force pathways');
  assert.equal(await page.locator('#vxArchiveGrid .vx-archive-card').count() > 0, true, 'combined filters should also search the archive');

  await page.locator('#vxSearch').fill('no-matching-exam-record');
  assert.equal(await page.locator('#vx-ongoing').evaluate(element => element.classList.contains('vx-lane-is-empty')), true,
    'empty lanes should be marked for compact presentation');
  assert.equal(await page.locator('#vxOngoingList .vx-empty').evaluate(element => getComputedStyle(element).minHeight), '0px',
    'empty lanes should not reserve a tall blank card');
  await page.locator('#vxReset').click();
  assert.equal(await page.locator('#vxSearch').inputValue(), '');
  assert.equal(await page.locator('#vxQualification').inputValue(), 'all');
  assert.equal(await page.locator('#vxSector').inputValue(), 'all');
  assert.equal(await page.locator('#vxOngoingList .vx-notice-card').count(), 3, 'Reset Filters should restore all inferred and explicit open applications');

  const armedForces = await page.locator('#vxForcesGrid .vx-force-card h3').allTextContents();
  for (const force of ['Indian Army', 'Indian Navy', 'Indian Air Force', 'Indian Coast Guard']) {
    assert.ok(armedForces.includes(force), force + ' should have a distinct force card');
  }
  const uniformedForces = await page.locator('#vxUniformedGrid .vx-force-card h3').allTextContents();
  for (const force of ['Border Security Force', 'Central Reserve Police Force', 'Central Industrial Security Force', 'Indo-Tibetan Border Police', 'Sashastra Seema Bal', 'Assam Rifles', 'CAPF Assistant Commandant', 'Railway Protection Force', 'State Police']) {
    assert.ok(uniformedForces.includes(force), force + ' should have a distinct uniformed-service card');
  }

  await page.locator('body').evaluate(element => element.setAttribute('data-theme', 'dark'));
  const darkBackground = await page.locator('.vx-filter-panel').evaluate(element => getComputedStyle(element).backgroundColor);
  assert.notEqual(darkBackground, 'rgba(0, 0, 0, 0)', 'the dark theme should style the filter panel');
  await page.locator('[data-vx-jump="vx-careers"]').click();
  assert.equal(await page.evaluate(() => window.__examDeskScrollBehavior), 'auto', 'section navigation should respect reduced motion');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.locator('#view-notifications .vx-shell').evaluate(element => ({
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
    columns: getComputedStyle(element.querySelector('.vx-notice-grid')).gridTemplateColumns
  }));
  assert.ok(mobile.scrollWidth <= mobile.width + 1, 'mobile Exam Desk should not require horizontal scrolling: ' + JSON.stringify(mobile));
  assert.ok(!mobile.columns.includes(' '), 'mobile notice cards should use a single column');

  failFeeds = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#vxSyncStamp').waitFor();
  await page.waitForFunction(() => document.querySelector('#vxSyncStamp')?.textContent.includes('Feed unavailable'));
  assert.equal(await page.locator('#vxUpcomingList .vx-notice-card').count(), 0, 'feed failures should show an empty state rather than stale fake opportunities');
  assert.equal(pageErrors.length, 0, 'Exam Desk should not throw during normal, malformed or unavailable feed responses: ' + pageErrors.join(' | '));

  console.log('Government Exam Desk browser smoke: status lanes, archive, calendar, filters, force cards, XSS, errors, reduced motion, dark theme and mobile layout passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
