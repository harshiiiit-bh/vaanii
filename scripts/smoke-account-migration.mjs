import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.VAANI_BASE_URL || 'http://127.0.0.1:4173/';
const launchOptions = { headless: true, args: ['--no-sandbox'] };
if (process.env.VAANI_BROWSER_EXECUTABLE) launchOptions.executablePath = process.env.VAANI_BROWSER_EXECUTABLE;
const browser = await chromium.launch(launchOptions);
try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    if (localStorage.getItem('vaani_state') !== null) return;
    localStorage.setItem('vaani_state', JSON.stringify({
      name: 'Legacy Cadet', xp: 44,
      completedTopics: { noun: true }, quizScores: { sva: 81 },
      topicProgress: { tenses: true }, bookmarkedTopics: { clauses: true },
      topicNotes: { clauses: 'Legacy note survives migration' }
    }));
    localStorage.setItem('vaani_bookmarks', JSON.stringify(['legacy-pyq-1','legacy-pyq-2']));
    localStorage.setItem('vbv_veer_bhogya_data_v1', JSON.stringify({
      cadetName: 'Legacy Cadet',
      completed: [{ id: 'legacy-book', title: 'Migrated Book' }],
      ongoing: [{ id: 'legacy-current', title: 'Current Book', logs: [] }],
      upcoming: [], vocab: [{ id: 'legacy-word', word: 'Legacy' }],
      achievements: [], quizHistory: [],
      goal: { monthlyBooks: 4, dailyPages: 18 }
    }));
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#gate-stage-showcode', { state: 'visible', timeout: 15000 });
  const migrated = await page.evaluate(() => {
    const code = getSessionCode();
    const key = 'vbv_veer_bhogya_account_' + code;
    const record = JSON.parse(localStorage.getItem(key));
    return {
      code, migrationFlag: localStorage.getItem('vaani_account_migration_v1'),
      state: { name: State.name, xp: State.xp, completed: State.completedTopics,
        scores: State.quizScores, progress: State.topicProgress, bookmarks: State.bookmarkedTopics, notes: State.topicNotes,
        pyqBookmarks: State.pyqBookmarks },
      vbv: DATA, saved: JSON.parse(localStorage.getItem(key))
    };
  });
  assert.match(migrated.code || '', /^\d{6}$/, 'Migration must create and activate one account');
  assert.equal(migrated.migrationFlag, 'done', 'Migration completion marker was not saved');
  assert.equal(migrated.state.name, 'Legacy Cadet');
  assert.equal(migrated.state.xp, 44);
  assert.deepEqual(migrated.state.completed, { noun: true });
  assert.deepEqual(migrated.state.scores, { sva: 81 });
  assert.deepEqual(migrated.state.progress, { tenses: true });
  assert.deepEqual(migrated.state.bookmarks, { clauses: true });
  assert.deepEqual(migrated.state.pyqBookmarks, ['legacy-pyq-1','legacy-pyq-2']);
  assert.equal(migrated.state.notes.clauses, 'Legacy note survives migration');
  assert.equal(migrated.vbv.completed[0].id, 'legacy-book');
  assert.equal(migrated.vbv.ongoing[0].id, 'legacy-current');
  assert.equal(migrated.vbv.vocab[0].id, 'legacy-word');
  assert.equal(migrated.vbv.goal.monthlyBooks, 4);
  assert.equal(migrated.saved.vaani.xp, 44, 'Migrated Vaani progress was not persisted in the account record');
  assert.equal(migrated.saved.vbv.completed[0].id, 'legacy-book', 'Migrated Book Reading progress was not persisted');
  console.log('PASS account migration: legacy Vaani and Book Reading progress preserved in the new account record');
  await context.close();
} finally {
  await browser.close();
}
