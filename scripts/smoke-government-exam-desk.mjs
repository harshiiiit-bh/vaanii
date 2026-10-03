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

let browser = null;
let context = null;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const baseURL = 'http://127.0.0.1:' + address.port + '/';
const launchOptions = { headless: true, args: ['--no-sandbox'] };
if (process.env.VAANI_BROWSER_EXECUTABLE) launchOptions.executablePath = process.env.VAANI_BROWSER_EXECUTABLE;
browser = await chromium.launch(launchOptions);
context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
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
    id: 'board-job-extra', title: 'Recruitment notification for a sample technical post 2026', organization: 'Sample Board', category: 'TECHNICAL',
    type: 'Recruitment notification', status: 'notification', notificationDate: '2026-09-15',
    url: 'https://example.gov.in/notice', official: true, summary: 'Synthetic link-board fixture; not a live vacancy.'
  },
  ...['A', 'B', 'C', 'D'].map((suffix, index) => ({
    id: 'upcoming-schedule-' + suffix,
    title: 'Synthetic upcoming schedule ' + suffix,
    organization: 'UPSC', category: 'UPSC', type: 'Annual Calendar', status: 'scheduled',
    applicationStartDate: '2027-05-' + String(20 + index).padStart(2, '0'),
    url: 'https://upsc.gov.in/', official: true,
    summary: 'Synthetic schedule fixture for the notice preview control.'
  })),
  {
    id: 'sample-admit-card', title: 'SSC CHSL Admit Card 2026', organization: 'SSC', category: 'SSC',
    type: 'admit-card', status: 'admit-card', notificationDate: '2026-09-25',
    url: 'https://ssc.gov.in/', official: true, summary: 'Sample admit-card notice.'
  },
  {
    id: 'future-result', title: 'NDA answer key update', organization: 'UPSC', category: 'NDA',
    type: 'Answer key', status: 'released', notificationDate: '2026-09-24', examDate: '2027-02-14', eligibility: 'Class 12',
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
  version: 1, checkedAt: '2026-09-30T12:00:00', status: 'partial',
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
  if (!isApi && url.pathname.endsWith('/data/defence-notifications.json')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 1, generatedAt: '2026-09-30T09:00:00Z', items: feedItems }) });
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

await page.goto(baseURL + '?v=notifications', { waitUntil: 'domcontentloaded' });
  // Exercise the same entry gate as a real visitor before clicking page controls.
  await page.waitForSelector('#gate-stage-start', { state: 'visible', timeout: 15000 });
  await page.evaluate(() => { generateCode = () => '654321'; });
  await page.locator('#cadetName').fill('Exam Desk Smoke Cadet');
  await page.locator('#gateBtn').click();
  await page.waitForSelector('#gate-stage-showcode', { state: 'visible', timeout: 15000 });
  await page.evaluate(() => { State.serviceForce = null; });
  await page.locator('#gate-stage-showcode .gate-btn').click();
  await page.waitForSelector('#serviceForcePicker[data-mode="onboarding"]', { state: 'visible', timeout: 15000 });
  await page.locator('#serviceForcePicker .service-force-option[data-force="army"]').click();
  await page.waitForFunction(() => document.getElementById('gate')?.classList.contains('hide'), null, { timeout: 15000 });
  // The first-visit briefing can use either the legacy modal tour or the
  // current Officer VAANI floating briefing. Both are intentionally dismissible
  // before the smoke test exercises the page beneath them.
  await page.waitForFunction(() => (
    document.getElementById('viTour')?.classList.contains('open') ||
    document.getElementById('vaaniMentor')?.classList.contains('open')
  ), null, { timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (
    !document.getElementById('viTour')?.classList.contains('open') &&
    !document.getElementById('vaaniMentor')?.classList.contains('open')
  ), null, { timeout: 5000 });
  await page.locator('#vxSyncStamp').waitFor();
  await page.waitForFunction(() => {
    const text = document.querySelector('#vxSyncStamp')?.textContent || '';
    return text && !text.includes('Syncing official feeds');
  }, null, { timeout: 5000 }).catch(async error => {
    const status = await page.locator('#vxSyncStamp').textContent();
    throw new Error('Notification feed did not settle: ' + JSON.stringify(status) + ' (' + error.message + ')');
  });
  // Check the screenshot-specific PYQ issue before the unrelated Desk smoke assertions.
  await page.evaluate(() => switchView('pyq'));
  await page.waitForSelector('#pvTopicGrid .pv-topic-group', { state: 'attached', timeout: 20000 });
  await page.waitForFunction(() => {
    const group = document.querySelector('#pvTopicGrid .pv-topic-group');
    return Boolean(group && group.getBoundingClientRect().width > 0);
  }, null, { timeout: 15000 });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const pyqDesktopLayout = await page.locator('#pvTopicGrid').evaluate(element => {
    const group = element.querySelector('.pv-topic-group');
    const title = group?.querySelector('.pv-topic-group-copy strong');
    return {
      containerWidth: element.getBoundingClientRect().width,
      groupWidth: group?.getBoundingClientRect().width || 0,
      titleWidth: title?.getBoundingClientRect().width || 0,
      columns: getComputedStyle(element).gridTemplateColumns.trim().split(' ').filter(Boolean).length
    };
  });
  assert.equal(pyqDesktopLayout.columns, 1, 'PYQ groups should use a single outer column on desktop: ' + JSON.stringify(pyqDesktopLayout));
  assert.ok(pyqDesktopLayout.groupWidth >= pyqDesktopLayout.containerWidth * 0.85,
    'PYQ group panels should fill the available desktop width: ' + JSON.stringify(pyqDesktopLayout));
  assert.ok(pyqDesktopLayout.titleWidth >= 240,
    'PYQ group headings must not collapse to one-character wrapping: ' + JSON.stringify(pyqDesktopLayout));
  await page.setViewportSize({ width: 390, height: 844 });
  const pyqMobileLayout = await page.locator('#pvTopicGrid').evaluate(element => ({
    containerWidth: element.getBoundingClientRect().width,
    groupWidth: element.querySelector('.pv-topic-group')?.getBoundingClientRect().width || 0,
    documentWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth
  }));
  assert.ok(pyqMobileLayout.groupWidth >= pyqMobileLayout.containerWidth * 0.85,
    'PYQ group panels should remain full-width on mobile: ' + JSON.stringify(pyqMobileLayout));
  assert.ok(pyqMobileLayout.documentScrollWidth <= pyqMobileLayout.documentWidth + 1,
    'PYQ should not introduce horizontal page scrolling on mobile: ' + JSON.stringify(pyqMobileLayout));
  await page.evaluate(() => switchView('notifications'));
  await page.waitForSelector('#vxSyncStamp', { state: 'attached', timeout: 10000 });


  assert.deepEqual(apiRequests.slice().sort(), ['/api/notifications', '/api/notifications/archive'],
    'the Exam Desk should read the existing live feed and archive once each');
  for (const id of ['vx-links', 'vx-exam-dates', 'vx-defence', 'vx-careers', 'vx-archive']) {
    const panel = page.locator('#' + id);
    assert.equal(await panel.evaluate(element => element instanceof HTMLDetailsElement), true, id + ' should be an accessible expandable panel');
    assert.equal(await panel.evaluate(element => element.open), false, id + ' should be collapsed on initial load to reduce clutter');
  }
  await page.waitForFunction(() => document.querySelector('#vxRefreshFeed') && !document.querySelector('#vxRefreshFeed').disabled, null, { timeout: 10000 });
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
  await page.locator('#vx-links > summary').click();
  assert.equal(await page.locator('#vx-links').evaluate(element => element.open), true, 'the official links panel should expand on activation');
  assert.ok(await page.locator('#vxBoardJobsList .vx-resource-row').count() >= 5, 'link board should show multiple open or scheduled application links');
  assert.ok((await page.locator('#vxBoardJobsList').innerText()).includes('SSC recruitment closing today'), 'job links should be shown as direct titles');
  assert.equal(await page.locator('#vxBoardResultsList .vx-resource-row').count(), 1, 'link board should separate recent results');
  assert.equal(await page.locator('#vxBoardAdmitList .vx-resource-row').count(), 1, 'link board should separate admit cards');
  assert.equal(await page.locator('#vxBoardKeysList .vx-resource-row').count(), 1, 'link board should separate answer keys');
  const jobRowCount = page.locator('#vxBoardJobsList .vx-resource-row');
  const jobTotal = Number((await page.locator('#vxBoardJobsCount').innerText()).trim());
  const jobPreview = await jobRowCount.count();
  assert.equal(jobPreview, Math.min(6, jobTotal), 'job board should begin with a six-item preview');
  await page.locator('[data-vx-board-more="jobs"]').click();
  assert.equal(await jobRowCount.count(), jobTotal, 'View all should reveal every job in the current result set');
  await page.locator('[data-vx-board-more="jobs"]').click();
  assert.equal(await jobRowCount.count(), Math.min(6, jobTotal), 'Show fewer should restore the six-item preview');
  await page.locator('#vx-links > summary').click();
  assert.equal(await page.locator('#vx-links').evaluate(element => element.open), false, 'the official links panel should collapse on second activation');

  assert.equal(await page.locator('#vxUpcomingList .vx-notice-card').count(), 4, 'upcoming lane should initially show only four preview cards');
  assert.equal(await page.locator('#vxUpcomingMore').isVisible(), true, 'large lanes should expose a View all control');
  const upcomingTotal = Number((await page.locator('#vxUpcomingCount').innerText()).trim());
  const upcomingMoreText = await page.locator('#vxUpcomingMore').innerText();
  const upcomingMoreNumber = Number((upcomingMoreText.match(/\d+/) || [])[0]);
  assert.equal(upcomingMoreNumber, upcomingTotal, 'preview control should disclose the complete result count');
  await page.locator('#vxUpcomingMore').click();
  assert.equal(await page.locator('#vxUpcomingList .vx-notice-card').count(), upcomingTotal, 'View all should reveal every matching upcoming notice');
  await page.locator('#vxUpcomingMore').click();
  assert.equal(await page.locator('#vxUpcomingList .vx-notice-card').count(), 4, 'Show fewer should restore the compact upcoming preview');
  const ongoingTotal = Number((await page.locator('#vxOngoingCount').innerText()).trim());
  const nearTotal = Number((await page.locator('#vxNearCount').innerText()).trim());
  const ongoingVisible = Math.min(4, ongoingTotal);
  const nearVisible = Math.min(4, nearTotal);
  assert.equal(await page.locator('#vxOngoingList .vx-notice-card').count(), ongoingVisible, 'open applications outside seven days, including title date ranges, should be Ongoing');
  const ongoingMore = page.locator('#vxOngoingMore');
  if (ongoingTotal > 4) {
    assert.equal(await ongoingMore.isVisible(), true, 'large ongoing lanes should expose a View all control');
    assert.equal((await ongoingMore.innerText()).trim(), 'View all ' + ongoingTotal, 'ongoing preview should disclose the full result count');
    await ongoingMore.click();
    assert.equal(await page.locator('#vxOngoingList .vx-notice-card').count(), ongoingTotal, 'View all should expose every ongoing notice');
  }
  assert.equal(await page.locator('#vxNearList .vx-notice-card').count(), nearVisible, 'today, seven-day and inferred title deadlines should be Deadline Near');
  const nearMore = page.locator('#vxNearMore');
  if (nearTotal > 4) {
    assert.equal(await nearMore.isVisible(), true, 'large deadline lanes should expose a View all control');
    const label = (await nearMore.innerText()).trim();
    assert.equal(label, 'View all ' + nearTotal, 'deadline preview should disclose the complete result count');
    await nearMore.click();
    assert.equal(await page.locator('#vxNearList .vx-notice-card').count(), nearTotal, 'View all should expose every deadline notice');
  }
  const extensionCard = page.locator('#vxNearList .vx-notice-card').filter({ hasText: 'Online Registration Extended till 05.10.2026' });
  assert.equal(await extensionCard.count(), 1, 'an explicitly extended application should appear in Deadline Near');
  assert.match(await extensionCard.innerText(), /CLOSING DATE[\s\S]*05 Oct 2026/i, 'the extension date should be labelled as the closing date');
  assert.match(await extensionCard.innerText(), /Closes in 5 days/, 'the extension card should show the remaining closing window');
  assert.equal(await page.locator('#vxNearList .vx-notice-card').filter({ hasText: '16.09.2026 to 06.10.2026' }).count(), 1,
    'a range ending within the next seven days should appear in Deadline Near');
  assert.equal(await page.locator('#vxOngoingList .vx-notice-card').filter({ hasText: '30.09.2026 to 21.10.2026' }).count(), 1,
    'a date range that is open today and closes beyond seven days should appear in Ongoing');
  if (ongoingTotal > 4) {
    await ongoingMore.click();
    assert.equal(await page.locator('#vxOngoingList .vx-notice-card').count(), ongoingVisible, 'Show fewer should restore the ongoing preview');
  }
  if (nearTotal > 4) {
    await nearMore.click();
    assert.equal(await page.locator('#vxNearList .vx-notice-card').count(), nearVisible, 'Show fewer should restore the deadline preview');
  }
  assert.equal(await page.locator('#vxUpcomingList').innerText().then(text => text.includes('NDA Officer Entry Calendar 2027')), true);
  assert.equal(await page.locator('#vxUpcomingList').innerText().then(text => text.includes('answer key')), false,
    'a post-exam notice must not become an active opportunity');
  await page.locator('#vx-archive > summary').click();
  assert.equal(await page.locator('#vx-archive').evaluate(element => element.open), true, 'the archive should expand on activation');
  assert.equal(await page.locator('#vxArchiveGrid .vx-archive-card').count(), 4, 'expired application, result, answer-key and admit-card records should stay archived');
  await page.locator('#vx-exam-dates > summary').click();
  assert.equal(await page.locator('#vx-exam-dates').evaluate(element => element.open), true, 'the calendar should expand on activation');
  const defaultCalendarRows = await page.locator('#vxExamDatesList .vx-date-row').evaluateAll(rows => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return rows.map(row => {
      const block = row.querySelector('.vx-date-block');
      const day = Number(block?.querySelector('strong')?.textContent || 0);
      const monthLabel = String(block?.querySelector('span')?.textContent || '').trim().slice(0, 3);
      const month = monthNames.indexOf(monthLabel);
      const year = Number(block?.querySelector('small')?.textContent || 0);
      const date = month >= 0 && year ? new Date(year, month, day) : new Date(NaN);
      return {
        title: row.querySelector('h4')?.textContent?.trim() || '',
        days: Number.isNaN(date.valueOf()) ? NaN : Math.round((date.valueOf() - today.valueOf()) / 86400000)
      };
    });
  });
  const defaultCalendarCount = defaultCalendarRows.length;
  const calendarTitles = defaultCalendarRows.map(row => row.title);
  assert.ok(defaultCalendarCount >= 4, 'the default calendar should show the fixture’s near-term exam dates');
  assert.ok(defaultCalendarRows.every(row => Number.isFinite(row.days) && row.days >= 0 && row.days <= 120),
    'the default calendar must keep every row inside its 120-day window: ' + JSON.stringify(defaultCalendarRows));
  assert.ok(await page.locator('#vxExamDatesList .vx-date-month').count() >= 2, 'near-term exam dates should be grouped by month and year');
  assert.equal(calendarTitles[0], 'SSC recruitment closing today',
    'the exam calendar should sort by the actual exam date in chronological order');
  assert.ok(calendarTitles.includes('NDA closed application cycle'),
    'near-term future exam should remain visible even if its application is closed');
  assert.ok(!calendarTitles.includes('NDA Officer Entry Calendar 2027'),
    'distant NDA exam dates should stay hidden in the default calendar view');
  await page.locator('#vxLaterExamDates').click();
  const expandedCalendarTitles = await page.locator('#vxExamDatesList .vx-date-row h4').allTextContents();
  const expandedCalendarCount = await page.locator('#vxExamDatesList .vx-date-row').count();
  assert.ok(expandedCalendarCount > defaultCalendarCount, 'show later dates should expand the calendar');
  assert.ok(expandedCalendarTitles.includes('NDA Officer Entry Calendar 2027'),
    'expanded calendar should expose far-future exam dates');
  assert.ok(expandedCalendarTitles.includes('NDA closed application cycle'),
    'expanded calendar should retain older-cycle future exam dates');
  assert.equal(await page.locator('#vxExamDatesList').innerText().then(text => text.includes('TENTATIVE · CALENDAR')), true,
    'tentative dates should remain visible when the user expands the calendar');
  await page.locator('#vxLaterExamDates').click();
  assert.equal(await page.locator('#vxExamDatesList .vx-date-row').count(), defaultCalendarCount,
    'calendar toggle should return to the exact 120-day view');
  assert.deepEqual(await page.locator('#vxExamDatesList .vx-date-row h4').allTextContents(), calendarTitles,
    'collapsing the calendar should restore the same near-term date set');
  await page.locator('#vx-exam-dates > summary').click();
  await page.locator('#vx-archive > summary').click();
  assert.equal(await page.locator('#vxOngoingList img').count(), 0, 'feed text must be escaped before rendering');
  assert.equal(await page.evaluate(() => window.__examDeskXss || 0), 0, 'escaped feed text must not execute');

  const qualificationOptions = await page.locator('#vxQualification option').evaluateAll(options => options.map(option => option.value));
  for (const qualification of ['10th', '12th', 'iti', 'diploma', 'ba', 'bsc', 'bcom', 'bca', 'bba', 'btech', 'graduate', 'postgraduate', 'teaching', 'law', 'mbbs', 'nursing', 'paramedical', 'aviation']) {
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
  assert.equal(await page.locator('#vxOngoingList .vx-notice-card').count(), ongoingVisible, 'Reset Filters should restore all inferred and explicit open applications');

  await page.locator('#vx-careers > summary').click();
  assert.equal(await page.locator('#vx-careers').evaluate(element => element.open), true, 'career options should expand on activation');
  const careerGroupsVisible = await page.locator('#vxCareerGrid .vx-career-card h3').allTextContents();
  for (const group of ['Agriculture, food & environment', 'IT, software & digital careers', 'Commerce, accounting & professional courses', 'Design, architecture & media', 'Skilled trades & apprenticeships', 'Hospitality, tourism & aviation services', 'Research, laboratories & academia', 'Social work, counselling & community careers', 'Management entrance & business school routes', 'Science & research entrance examinations', 'Design, fashion & architecture entrance tests', 'Maritime, shipping & logistics careers', 'Sports, fitness & physical education', 'Engineering entrance tests & university admissions', 'Aviation, pilot licensing & aircraft careers', 'PSU & core-industry recruitment', 'Forest, fire, prison & field services', 'Teacher recruitment & eligibility exams', 'Postgraduate medicine & allied health exams', 'Finance, securities & professional credentials', 'Hotel management admissions & culinary careers', 'Scholarships, fellowships & student support', 'Career routes by education stage']) {
    assert.ok(careerGroupsVisible.includes(group), 'Career Map should include ' + group);
  }
  const indexMarkup = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
  const directoryStart = indexMarkup.indexOf('<div class="nc-directory-grid" id="ncDirectoryGrid">');
  const directoryEnd = indexMarkup.indexOf('</div>\n    <div class="nc-directory-empty"', directoryStart);
  assert.ok(directoryStart >= 0 && directoryEnd > directoryStart, 'the static exam directory should remain present in index.html');
  const directoryMarkup = indexMarkup.slice(directoryStart, directoryEnd);
  assert.equal((directoryMarkup.match(/class="nc-directory-card" data-sector=/g) || []).length, 55,
    'the expanded exam directory should expose all 55 exam and career entries');
  assert.ok(indexMarkup.includes('id="ncDirectoryCount">55 exam &amp; career pathways'), 'the directory count should match its 18 cards');
  for (const exam of ['MBA &amp; management entrance exams', 'Law entrance &amp; qualifying exams', 'Science, research &amp; postgraduate tests', 'Apprenticeship &amp; skilled trade routes', 'National &amp; university engineering entrances', 'State engineering &amp; professional CETs', 'Pilot &amp; aircraft licensing exams', 'Postgraduate medical entrances', 'Nursing &amp; paramedical entrances', 'Teacher recruitment &amp; eligibility', 'Public sector &amp; core-industry hiring', 'State subordinate &amp; field recruitment', 'Finance &amp; securities credentials', 'Hotel management &amp; culinary admissions', 'Student scholarships &amp; fellowships']) {
    assert.ok(directoryMarkup.includes(exam), 'the directory should include ' + exam);
  }
  const careerText = await page.locator('#vxCareerGrid').innerText();
  for (const option of ['Software / web developer', 'Chartered Accountant (CA)', 'Company Secretary (CS)', 'Agriculture Development Officer', 'NAPS apprenticeships', 'Hotel & hospitality management', 'CAT', 'IISER Aptitude Test (IAT)', 'NIFT Entrance Examination (NIFTEE)', 'IMU-CET', 'BSSC Inter Level / CGL', 'Actuarial Common Entrance Test (ACET)', 'BITSAT', 'VITEEE', 'COMEDK UGET', 'DGCA Flight Crew examinations', 'NEET-PG', 'AIIMS B.Sc. Nursing', 'BPSC TRE', 'NISM certification exams', 'NCHM JEE', 'After Class 10', 'After Graduation']) {
    assert.ok(careerText.includes(option), 'Career Map should expose ' + option);
  }
  await page.locator('#vxSearch').fill('CAT');
  const catSearchText = await page.locator('#vxCareerGrid').innerText();
  assert.ok(catSearchText.includes('CAT'), 'the Career Map search should find CAT');
  assert.ok(!catSearchText.includes('XAT'), 'the Career Map search should narrow management routes to the matching exam');
  await page.locator('#vxSearch').fill('BITSAT');
  assert.ok((await page.locator('#vxCareerGrid').innerText()).includes('BITSAT'), 'the Career Map search should find engineering entrances');
  await page.locator('#vxSearch').fill('DGCA');
  assert.ok((await page.locator('#vxCareerGrid').innerText()).includes('DGCA Flight Crew examinations'), 'the Career Map search should find aviation licensing');
  await page.locator('#vxQualification').selectOption('aviation');
  assert.ok((await page.locator('#vxCareerGrid').innerText()).includes('DGCA Flight Crew examinations'), 'the aviation qualification filter should retain its matching flight-crew route');
  await page.locator('#vxReset').click();

  await page.locator('#vx-careers > summary').click();
  await page.locator('#vx-defence > summary').click();
  assert.equal(await page.locator('#vx-defence').evaluate(element => element.open), true, 'defence pathways should expand on activation');
  const armedForces = await page.locator('#vxForcesGrid .vx-force-card h3').allTextContents();
  for (const route of ['10+2 Technical Entry Scheme (TES)', 'Technical Graduate Course (TGC)', 'SSC Technical', 'NCC Special Entry', 'JAG Entry']) {
    assert.ok((await page.locator('#vxForcesGrid').innerText()).includes(route), 'Army career map should include ' + route);
  }
  for (const force of ['Indian Army', 'Indian Navy', 'Indian Air Force', 'Indian Coast Guard']) {
    assert.ok(armedForces.includes(force), force + ' should have a distinct force card');
  }
  const uniformedForces = await page.locator('#vxUniformedGrid .vx-force-card h3').allTextContents();
  for (const force of ['Border Security Force', 'Central Reserve Police Force', 'Central Industrial Security Force', 'Indo-Tibetan Border Police', 'Sashastra Seema Bal', 'Assam Rifles', 'CAPF Assistant Commandant', 'Railway Protection Force', 'State Police']) {
    assert.ok(uniformedForces.includes(force), force + ' should have a distinct uniformed-service card');
  }

  await page.locator('#vx-defence > summary').click();
  await page.locator('body').evaluate(element => element.setAttribute('data-theme', 'dark'));
  const darkBackground = await page.locator('.vx-filter-panel').evaluate(element => getComputedStyle(element).backgroundColor);
  assert.notEqual(darkBackground, 'rgba(0, 0, 0, 0)', 'the dark theme should style the filter panel');
  const cardMotion = await page.locator('#vxNearList .vx-notice-card').first().evaluate(element => getComputedStyle(element).transitionDuration);
  assert.ok(Number.parseFloat(cardMotion) <= 0.0001, 'reduced-motion preference should reduce notice-card transitions to a negligible duration: ' + cardMotion);

  // The live Exam Desk replaces the static directory after boot. Validate
  // the fallback's mobile CSS at source level and keep responsive browser checks
  // focused on the live desk that users interact with.
  const directoryCss = await readFile(path.join(projectRoot, 'vaani-exam-directory-mobile.css'), 'utf8');
  const mobileDirectoryCssStart = directoryCss.indexOf('@media (max-width:600px){');
  const mobileDirectoryCssEnd = directoryCss.indexOf('@media (max-width:390px){', mobileDirectoryCssStart);
  assert.ok(mobileDirectoryCssStart >= 0 && mobileDirectoryCssEnd > mobileDirectoryCssStart,
    'the mobile exam-directory media rules should be present');
  const mobileDirectoryCss = directoryCss.slice(mobileDirectoryCssStart, mobileDirectoryCssEnd);
  assert.ok(mobileDirectoryCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important;'),
    'the mobile exam directory should use two readable columns');
  assert.ok(mobileDirectoryCss.includes('font-size:12px!important;'),
    'mobile exam-directory headings should use a readable font size');
  assert.ok(mobileDirectoryCss.includes('display:-webkit-box!important;') && mobileDirectoryCss.includes('font-size:10px!important;'),
    'mobile exam-directory descriptions should remain visible at a readable size');

  for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 900 }, { width: 1024, height: 900 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.locator('#view-notifications .vx-shell').evaluate(element => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      columns: getComputedStyle(element.querySelector('.vx-notice-grid')).gridTemplateColumns
    }));
    assert.ok(layout.scrollWidth <= layout.width + 1, 'Exam Desk should not require horizontal scrolling at ' + viewport.width + 'px: ' + JSON.stringify(layout));
    if (viewport.width <= 560) assert.ok(!layout.columns.includes(' '), 'notice cards should use a single column at ' + viewport.width + 'px');
  }

  failFeeds = true;
  const refreshFailureResponse = page.waitForResponse(response => response.status() === 503, { timeout: 10000 });
  await page.locator('#vxRefreshFeed').click();
  await refreshFailureResponse;
  await page.waitForFunction(() => {
    const button = document.querySelector('#vxRefreshFeed');
    const health = document.querySelector('#vxFeedHealth')?.textContent || '';
    return Boolean(button && !button.disabled && health.includes('Refresh failed · showing last loaded data'));
  }, null, { timeout: 10000 });
  assert.equal(await page.locator('#vxNearList .vx-notice-card').count(), nearVisible, 'a failed manual refresh should retain the last loaded notice cards');
  assert.match(await page.locator('#vxFeedHealth').innerText(), /Refresh failed · showing last loaded data/, 'a failed manual refresh should be visible without clearing the current list');
  assert.match(await page.locator('#vxFeedSummary').innerText(), /last loaded data retained/, 'the management panel should disclose retained data after a failed refresh');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#vxSyncStamp').waitFor();
  await page.waitForFunction(() => document.querySelector('#vxSyncStamp')?.textContent.includes('Feed unavailable'));
  assert.equal(await page.locator('#vxUpcomingList .vx-notice-card').count(), 0, 'feed failures should show an empty state rather than stale fake opportunities');
  assert.equal(pageErrors.length, 0, 'Exam Desk should not throw during normal, malformed or unavailable feed responses: ' + pageErrors.join(' | '));

  console.log('Government Exam Desk + PYQ browser smoke: calendar horizon and toggle, PYQ group width at desktop/mobile, Exam Desk feeds, filters, Career Map, archive, XSS, reduced motion and responsive layouts passed');
} finally {
  const cleanup = [];
  if (browser || context) {
    cleanup.push((async () => {
      try {
        if (context) await context.close();
      } finally {
        if (browser) await browser.close();
      }
    })());
  }
  if (server.listening) {
    server.closeAllConnections?.();
    cleanup.push(new Promise(resolve => server.close(resolve)));
  }
  const outcomes = await Promise.allSettled(cleanup);
  const failedCleanup = outcomes.find(outcome => outcome.status === 'rejected');
  if (failedCleanup) throw failedCleanup.reason;
}
