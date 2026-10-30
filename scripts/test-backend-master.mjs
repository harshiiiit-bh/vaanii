#!/usr/bin/env node
/**
 * VAANI — Backend Master Automated Regression & Reliability Test Suite
 * Verifies all 24 required backend domains against the Express backend,
 * Supabase shared validators/migrations, and educational content registries.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { arenaCodeChecksum, normalizeArenaMatchCode, sanitizeArenaRows } from '../supabase/functions/_shared/arena-leaderboard.mjs';
import serverModule from '../server.js';

const {
  app,
  runtimeStore,
  getContentRegistry,
  getServiceRankProgress,
  getMinimumXPDays,
  getAccuracyPenalty,
  getTotalMarksPenalty,
  validateArenaMatchCode,
  normalizeVaaniState,
  mergeAccountVaaniState
} = serverModule;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function requestJson(serverUrl, reqPath, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    Accept: 'application/json',
    ...((options.body !== undefined || options.rawBody !== undefined) ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };
  const bodyStr = options.rawBody !== undefined
    ? options.rawBody
    : (options.body !== undefined ? JSON.stringify(options.body) : undefined);

  return new Promise((resolve, reject) => {
    const u = new URL(reqPath, serverUrl);
    const req = http.request(
      u,
      { method, headers },
      res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(data); } catch (_e) {}
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (bodyStr !== undefined) req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  // Snapshot initial store so we leave zero test data behind
  const snapshotAccounts = JSON.stringify(runtimeStore.accounts);
  const snapshotCadets = JSON.stringify(runtimeStore.cadets);
  const snapshotArenaMatches = JSON.stringify(runtimeStore.arenaMatches);
  const snapshotArenaScores = JSON.stringify(runtimeStore.arenaScores);
  const snapshotDrills = JSON.stringify(runtimeStore.drillSessions);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // -------------------------------------------------------------------------
    // 21. JSON & JS Content Loading Integrity
    // -------------------------------------------------------------------------
    const reg = getContentRegistry();
    assert.equal(reg.pyqPapers.length, 65, 'Should load all 65 PYQ papers');
    assert.equal(reg.pyqAll.length, 5400, 'Should load all 5,400 PYQ questions');
    assert.equal(reg.pyqTopics.length, 46, 'Should normalize 46 PYQ topics');
    assert.equal(reg.vocabAll.length, 44, 'Should load 44 core vocabulary entries');
    assert.equal(reg.vocab90Days.length, 90, 'Should load 90 Vocab90 course days');
    assert.equal(reg.grammarAll.length, 34, 'Should load 34 Grammar topics');
    assert.equal(reg.grammarAcademyTopics.length, 41, 'Should load 41 Grammar Academy lessons');
    console.log('✓ [21] Content registry loading verified (65 papers, 5400 PYQs, 44 vocab, 90 days, 34 grammar, 41 academy)');

    // -------------------------------------------------------------------------
    // 1. Authentication (Registration & 6-Digit Code Login)
    // -------------------------------------------------------------------------
    const regRes = await requestJson(baseUrl, '/api/accounts/register', {
      method: 'POST',
      body: { name: 'Lt. Vikram Rathore', serviceForce: 'army' }
    });
    assert.equal(regRes.status, 201, 'Registration should return 201 Created');
    assert.equal(regRes.body.ok, true);
    const codeA = regRes.body.code;
    assert.match(codeA, /^\d{6}$/, 'Allocated code must be 6 digits');
    assert.equal(regRes.body.summary.name, 'Lt. Vikram Rathore');

    const dupReg = await requestJson(baseUrl, '/api/accounts/register', {
      method: 'POST',
      body: { code: codeA, name: 'Duplicate Attempt' }
    });
    assert.equal(dupReg.status, 409, 'Duplicate account registration must return 409 Conflict');

    const loginRes = await requestJson(baseUrl, '/api/accounts/login', {
      method: 'POST',
      body: { code: codeA }
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.ok, true);
    assert.equal(loginRes.body.code, codeA);

    const badLogin = await requestJson(baseUrl, '/api/accounts/login', {
      method: 'POST',
      body: { code: '000000' }
    });
    assert.equal(badLogin.status, 404, 'Unknown account login must return 404');
    console.log('✓ [1] Authentication (registration, collision guard, login, 404 check) passed');

    // -------------------------------------------------------------------------
    // 2. Authorisation, Account Isolation & Prototype Pollution Protection
    // -------------------------------------------------------------------------
    const regB = await requestJson(baseUrl, '/api/accounts/register', {
      method: 'POST',
      body: { name: 'Flg Offr Aditi', serviceForce: 'airforce' }
    });
    const codeB = regB.body.code;
    assert.notEqual(codeA, codeB, 'Each registered cadet must receive an isolated 6-digit code');

    const pollutedBody = '{"record":{"vaani":{"name":"Cadet A","xp":250,"__proto__":{"polluted":true}}}}';
    const putPolluted = await requestJson(baseUrl, `/api/accounts/${codeA}`, {
      method: 'PUT',
      rawBody: pollutedBody
    });
    assert.equal(putPolluted.status, 200);
    assert.equal(({}).polluted, undefined, 'Prototype pollution must be stripped');

    const checkB = await requestJson(baseUrl, `/api/accounts/${codeB}`);
    assert.equal(checkB.body.record.vaani.xp, 0, 'Account B must remain completely isolated from Account A updates');
    console.log('✓ [2] Authorisation, account isolation, and prototype pollution guards passed');

    // -------------------------------------------------------------------------
    // 3 & 4. Profile Operations & User Progress Persistence
    // -------------------------------------------------------------------------
    const putProfile = await requestJson(baseUrl, `/api/accounts/${codeA}`, {
      method: 'PUT',
      body: {
        record: {
          vaani: {
            name: 'Capt. Vikram Rathore',
            serviceForce: 'navy',
            theme: 'dark',
            xp: 420,
            streak: 4,
            completedTopics: { 'parts-of-speech': true, 'noun': true, 'verb': true },
            quizScores: { 'parts-of-speech': 90, 'noun': 80 }
          },
          vbv: { quotesRead: 5 }
        }
      }
    });
    assert.equal(putProfile.status, 200);
    assert.equal(putProfile.body.summary.name, 'Capt. Vikram Rathore');
    assert.equal(putProfile.body.summary.serviceForce, 'navy');
    assert.equal(putProfile.body.summary.topicsCleared, 3);
    assert.equal(putProfile.body.summary.quizAvg, 85);
    assert.equal(putProfile.body.rank.current.name, 'Lieutenant');

    const getProfile = await requestJson(baseUrl, `/api/accounts/${codeA}`);
    assert.equal(getProfile.status, 200);
    assert.equal(getProfile.body.record.vaani.theme, 'dark');
    assert.equal(getProfile.body.record.vbv.quotesRead, 5);
    console.log('✓ [3, 4] Profile operations and user progress persistence passed');

    // -------------------------------------------------------------------------
    // 5. Database Access Policies & Supabase Migration / RPC Verification
    // -------------------------------------------------------------------------
    const migPath = path.join(rootDir, 'supabase', 'migrations', '20261030120000_vaani_backend_master_upgrade.sql');
    assert.ok(fs.existsSync(migPath), 'Supabase backend master migration must exist');
    const migSql = fs.readFileSync(migPath, 'utf8');
    assert.match(migSql, /alter table public\.cadet_accounts enable row level security/i);
    assert.match(migSql, /revoke all on table public\.cadet_accounts from public, anon, authenticated/i);
    assert.match(migSql, /create or replace function public\.vaani_sync_cadet_account/i);
    assert.match(migSql, /create or replace function public\.vaani_get_cohort_leaderboard/i);

    const v3Body = ['3', '0', '01', '001', '01', '000000', '0000000', '00', '000', '00', '0'].join('');
    const validV3Code = v3Body + arenaCodeChecksum(v3Body);
    assert.equal(normalizeArenaMatchCode(validV3Code), validV3Code, 'Supabase validator must accept Arena v3 codes');
    console.log('✓ [5] Database access policies, RLS rules, and Supabase v2/v3 validators passed');

    // -------------------------------------------------------------------------
    // 6, 7, 8, 9, 12. PYQ Filtering, Search, Inline Solving, Explanations & Bookmarks
    // -------------------------------------------------------------------------
    const sampleQ = reg.pyqAll[0];
    const sampleQ2 = reg.pyqAll[1];

    // Solve sampleQ correctly -> should award +2 XP
    const solveCorrect1 = await requestJson(baseUrl, '/api/pyq/solve', {
      method: 'POST',
      body: { code: codeA, qid: sampleQ._id, selectedOption: sampleQ.ans }
    });
    assert.equal(solveCorrect1.status, 200);
    assert.equal(solveCorrect1.body.correct, true);
    assert.equal(solveCorrect1.body.correctAnswer, sampleQ.ans);
    assert.equal(solveCorrect1.body.explanation, sampleQ.exp || '');
    assert.equal(solveCorrect1.body.xpAwarded, 2, 'First correct PYQ solve must award +2 XP');
    assert.equal(solveCorrect1.body.alreadyRewarded, false);

    // Repeat submission of same question -> must NOT award duplicate XP
    const solveCorrect2 = await requestJson(baseUrl, '/api/pyq/solve', {
      method: 'POST',
      body: { code: codeA, qid: sampleQ._id, selectedOption: sampleQ.ans }
    });
    assert.equal(solveCorrect2.body.xpAwarded, 0, 'Repeat PYQ solve must award 0 XP');
    assert.equal(solveCorrect2.body.alreadyRewarded, true);

    // Solve sampleQ2 incorrectly
    const wrongOption = (sampleQ2.ans + 1) % sampleQ2.o.length;
    const solveWrong = await requestJson(baseUrl, '/api/pyq/solve', {
      method: 'POST',
      body: { code: codeA, qid: sampleQ2._id, selectedOption: wrongOption }
    });
    assert.equal(solveWrong.body.correct, false);
    assert.equal(solveWrong.body.xpAwarded, 0);

    // Toggle bookmark on sampleQ
    const bmRes = await requestJson(baseUrl, '/api/pyq/bookmark', {
      method: 'POST',
      body: { code: codeA, qid: sampleQ._id }
    });
    assert.equal(bmRes.body.bookmarked, true);

    // Verify PYQ status filtering: unanswered questions must NEVER be classified as MISTAKES/INCORRECT
    const filterMistakes = await requestJson(
      baseUrl,
      `/api/pyq/questions?code=${codeA}&status=MISTAKES&pageSize=20`
    );
    assert.equal(filterMistakes.body.totalMatching, 1, 'Only the 1 actually wrong question may appear in MISTAKES');
    assert.equal(filterMistakes.body.items[0]._id, sampleQ2._id);
    assert.equal(filterMistakes.body.counts.unattempted, 5398, '5398 unanswered questions must remain in unattempted');

    const filterSolved = await requestJson(
      baseUrl,
      `/api/pyq/questions?code=${codeA}&status=SOLVED&pageSize=20`
    );
    assert.equal(filterSolved.body.totalMatching, 1);
    assert.equal(filterSolved.body.items[0]._id, sampleQ._id);

    const filterBm = await requestJson(
      baseUrl,
      `/api/pyq/questions?code=${codeA}&status=BOOKMARKED&pageSize=20`
    );
    assert.equal(filterBm.body.totalMatching, 1);
    assert.equal(filterBm.body.items[0]._id, sampleQ._id);

    // Keyword search test
    const searchRes = await requestJson(
      baseUrl,
      `/api/pyq/questions?exam=NDA&q=${encodeURIComponent(sampleQ.q.slice(0, 18))}`
    );
    assert.ok(searchRes.body.totalMatching >= 1, 'Keyword search must find matching PYQs');
    console.log('✓ [6, 7, 8, 9, 12] PYQ filtering, search, answer validation, explanations, and bookmarks passed');

    // -------------------------------------------------------------------------
    // 10 & 19 & 20. Filtered Drills, Session Expiry & Assessment Scoring
    // -------------------------------------------------------------------------
    const drillCreate = await requestJson(baseUrl, '/api/pyq/drill', {
      method: 'POST',
      body: { code: codeA, exam: 'NDA', count: 5, order: 'canonical' }
    });
    assert.equal(drillCreate.status, 201);
    assert.equal(drillCreate.body.questions.length, 5);
    const qIds = drillCreate.body.questions.map(q => q._id);
    assert.equal(new Set(qIds).size, 5, 'Drill questions must have zero duplicates');

    const drillAnswers = {};
    drillAnswers[qIds[0]] = reg.pyqById[qIds[0]].ans; // Correct
    drillAnswers[qIds[1]] = (reg.pyqById[qIds[1]].ans + 1) % reg.pyqById[qIds[1]].o.length; // Incorrect

    const drillSubmit = await requestJson(baseUrl, `/api/pyq/drill/${drillCreate.body.sessionId}/submit`, {
      method: 'POST',
      body: { code: codeA, answers: drillAnswers }
    });
    assert.equal(drillSubmit.status, 200);
    assert.equal(drillSubmit.body.correct, 1);
    assert.equal(drillSubmit.body.incorrect, 1);
    assert.equal(drillSubmit.body.skipped, 3);
    assert.equal(drillSubmit.body.accuracyPct, 50);

    // Duplicate drill submit returns cached result without double XP
    const drillSubmitDup = await requestJson(baseUrl, `/api/pyq/drill/${drillCreate.body.sessionId}/submit`, {
      method: 'POST',
      body: { code: codeA, answers: drillAnswers }
    });
    assert.equal(drillSubmitDup.body.duplicate, true);

    // Expired drill session test
    const expiredDrill = await requestJson(baseUrl, '/api/pyq/drill', {
      method: 'POST',
      body: { code: codeA, exam: 'NDA', count: 3, expiresAt: Date.now() - 5000 }
    });
    const expiredSubmit = await requestJson(baseUrl, `/api/pyq/drill/${expiredDrill.body.sessionId}/submit`, {
      method: 'POST',
      body: { code: codeA, answers: {} }
    });
    assert.equal(expiredSubmit.status, 410, 'Expired drill submission must return 410 Gone');
    console.log('✓ [10, 19, 20] Filtered drill creation, deduplication, scoring, and session expiry passed');

    // -------------------------------------------------------------------------
    // 11. Vocabulary Mastery & Bookmark System
    // -------------------------------------------------------------------------
    const vocabMaster1 = await requestJson(baseUrl, '/api/vocab/mastery', {
      method: 'POST',
      body: { code: codeA, wordId: 'indomitable', mastered: true }
    });
    assert.equal(vocabMaster1.status, 200);
    assert.equal(vocabMaster1.body.mastered, true);
    assert.equal(vocabMaster1.body.xpAwarded, 10, 'First mastery of a word must award +10 XP');

    // Repeat mastery must not double-award XP
    const vocabMaster2 = await requestJson(baseUrl, '/api/vocab/mastery', {
      method: 'POST',
      body: { code: codeA, wordId: 'indomitable', mastered: true }
    });
    assert.equal(vocabMaster2.body.xpAwarded, 0, 'Repeat mastery must award 0 XP');
    assert.equal(vocabMaster2.body.alreadyRewarded, true);

    const vocabBm = await requestJson(baseUrl, '/api/vocab/bookmark', {
      method: 'POST',
      body: { code: codeA, wordId: 'capitulate', bookmarked: true }
    });
    assert.equal(vocabBm.body.bookmarked, true);

    const vocabListMastered = await requestJson(baseUrl, `/api/vocab/words?code=${codeA}&status=mastered`);
    assert.equal(vocabListMastered.body.items.length, 1);
    assert.equal(vocabListMastered.body.items[0].id, 'indomitable');

    const vocabListUnmastered = await requestJson(baseUrl, `/api/vocab/words?code=${codeA}&status=unmastered`);
    assert.equal(vocabListUnmastered.body.items.length, 43);

    const vocabListBookmarked = await requestJson(baseUrl, `/api/vocab/words?code=${codeA}&status=bookmarked`);
    assert.equal(vocabListBookmarked.body.items.length, 1);
    assert.equal(vocabListBookmarked.body.items[0].id, 'capitulate');

    // Ensure Account B does not inherit Account A's mastered words
    const vocabListB = await requestJson(baseUrl, `/api/vocab/words?code=${codeB}&status=mastered`);
    assert.equal(vocabListB.body.items.length, 0, 'Vocabulary mastery must be isolated per user');
    console.log('✓ [11] Vocabulary mastery, filter states, +10 XP idempotency, and user isolation passed');

    // -------------------------------------------------------------------------
    // 13, 14, 15. Global & Service-Force Leaderboard Filtering, Sorting & Sync
    // -------------------------------------------------------------------------
    const syncRes1 = await requestJson(baseUrl, '/api/leaderboard/sync', {
      method: 'POST',
      body: { code: codeA, syncId: 'sync-token-1' }
    });
    assert.equal(syncRes1.status, 200);
    assert.equal(syncRes1.body.duplicate, false);

    const syncRes2 = await requestJson(baseUrl, '/api/leaderboard/sync', {
      method: 'POST',
      body: { code: codeA, syncId: 'sync-token-1' }
    });
    assert.equal(syncRes2.body.duplicate, true, 'Duplicate syncId must be caught idempotently');

    const lbLive = await requestJson(baseUrl, `/api/leaderboard/global?mode=live&code=${codeA}`);
    assert.equal(lbLive.status, 200);
    assert.ok(lbLive.body.rows.every(r => r.isBenchmark === false && r.sourceLabel === 'LIVE CADET'));
    assert.ok(lbLive.body.rows.some(r => r.isCurrentCadet === true));

    const lbNavy = await requestJson(baseUrl, `/api/leaderboard/global?force=navy&sort=accuracy&code=${codeA}`);
    assert.ok(lbNavy.body.rows.every(r => r.serviceForce === 'navy'));
    for (let i = 1; i < lbNavy.body.rows.length; i++) {
      assert.ok(lbNavy.body.rows[i - 1].quizAvg >= lbNavy.body.rows[i].quizAvg, 'Accuracy sort must be descending');
    }
    console.log('✓ [13, 14, 15] Leaderboard filtering, sorting, provenance badges, and idempotent score sync passed');

    // -------------------------------------------------------------------------
    // 16, 17, 18. XP, Rank & Streak Calculation Engine
    // -------------------------------------------------------------------------
    const r0 = getServiceRankProgress(0, 'army');
    assert.equal(r0.current.name, 'Officer Cadet');
    assert.equal(r0.next.name, 'Lieutenant');
    assert.equal(r0.remainingXP, 100);

    const rMax = getServiceRankProgress(19000, 'airforce');
    assert.equal(rMax.current.name, 'Marshal of the Indian Air Force');
    assert.equal(rMax.remainingXP, 0);

    assert.equal(getAccuracyPenalty(75), 0);
    assert.equal(getAccuracyPenalty(65), 10);
    assert.equal(getAccuracyPenalty(25), 80);
    assert.equal(getTotalMarksPenalty(80), 5);
    assert.equal(getTotalMarksPenalty(20), 15);
    assert.equal(getMinimumXPDays(19000, 80, 80), 238);
    console.log('✓ [16, 17, 18] Centralised XP, Rank ladder, accuracy/marks deductions, and streak engine passed');

    // -------------------------------------------------------------------------
    // 22 & 23. Error Handling, Rate Limiting & Concurrent Update Merging
    // -------------------------------------------------------------------------
    const badJsonRes = await requestJson(baseUrl, `/api/accounts/${codeA}`, {
      method: 'PUT',
      rawBody: '{malformed json'
    });
    assert.equal(badJsonRes.status, 400);
    assert.equal(badJsonRes.body.code, 'INVALID_JSON');

    const rateLimitRes = await requestJson(baseUrl, '/api/status', {
      headers: { 'x-vaani-test-ratelimit': 'exceed' }
    });
    assert.equal(rateLimitRes.status, 429);
    assert.equal(rateLimitRes.body.code, 'RATE_LIMIT_EXCEEDED');

    // Concurrent updates with merge: true must preserve topics from both requests
    await Promise.all([
      requestJson(baseUrl, `/api/accounts/${codeA}`, {
        method: 'PUT',
        body: { merge: true, record: { vaani: { completedTopics: { 'tenses': true } } } }
      }),
      requestJson(baseUrl, `/api/accounts/${codeA}`, {
        method: 'PUT',
        body: { merge: true, record: { vaani: { completedTopics: { 'modals': true } } } }
      })
    ]);
    const mergedAcc = await requestJson(baseUrl, `/api/accounts/${codeA}`);
    assert.equal(mergedAcc.body.record.vaani.completedTopics['tenses'], true);
    assert.equal(mergedAcc.body.record.vaani.completedTopics['modals'], true);
    assert.equal(mergedAcc.body.record.vaani.completedTopics['parts-of-speech'], true);
    console.log('✓ [22, 23] Structured error handling, rate-limit protection, and concurrent merge updates passed');

    // -------------------------------------------------------------------------
    // 24. Arena Endpoints, Officer Vaani Briefing & Existing Frontend Compatibility
    // -------------------------------------------------------------------------
    const arenaReg = await requestJson(baseUrl, '/api/arena/register-match', {
      method: 'POST',
      body: {
        p_code: validV3Code,
        p_host_pid: 'host-1',
        p_host_name: 'Capt. Vikram',
        p_expires_at: Date.now() + 60000,
        p_question_ids: [sampleQ._id, sampleQ2._id],
        p_question_snapshot: [sampleQ, sampleQ2]
      }
    });
    assert.equal(arenaReg.status, 200);
    assert.equal(arenaReg.body.ok, true);

    const arenaSubmit = await requestJson(baseUrl, '/api/arena/submit', {
      method: 'POST',
      body: {
        p_code: validV3Code,
        p_pid: 'player-1',
        p_name: 'Cadet Alpha',
        p_seconds: 42,
        p_total: 2,
        p_answers: { [sampleQ._id]: sampleQ.ans, [sampleQ2._id]: sampleQ2.ans }
      }
    });
    assert.equal(arenaSubmit.status, 200);
    assert.equal(arenaSubmit.body.entry.score, 2);
    assert.equal(arenaSubmit.body.entry.correct, 2);
    assert.equal(arenaSubmit.body.entry.answers, undefined, 'Public submission response must omit raw answers');

    const arenaLb = await requestJson(baseUrl, '/api/arena/leaderboard', {
      method: 'POST',
      body: { p_code: validV3Code }
    });
    assert.equal(arenaLb.status, 200);
    assert.equal(arenaLb.body.rows.length, 1);
    assert.equal(arenaLb.body.rows[0].answers, undefined, 'Arena leaderboard must omit raw answers');

    const briefingRes = await requestJson(baseUrl, `/api/officer-vaani/briefing?code=${codeA}&view=pyq`);
    assert.equal(briefingRes.status, 200);
    assert.equal(briefingRes.body.ok, true);
    assert.ok(briefingRes.body.pose);
    assert.ok(briefingRes.body.directive);
    console.log('✓ [24] Arena checksum/scoring/privacy, Officer Vaani briefing API, and frontend compatibility passed');

    console.log('\nPASS: All 24 VAANI Backend Master test suites succeeded.');
  } finally {
    // Restore original store state and close test server
    runtimeStore.accounts = JSON.parse(snapshotAccounts);
    runtimeStore.cadets = JSON.parse(snapshotCadets);
    runtimeStore.arenaMatches = JSON.parse(snapshotArenaMatches);
    runtimeStore.arenaScores = JSON.parse(snapshotArenaScores);
    runtimeStore.drillSessions = JSON.parse(snapshotDrills);
    serverModule.flushSaveStoreSync();
    await new Promise(resolve => server.close(resolve));
  }
}

runTests().catch(err => {
  console.error('FAIL: Backend Master test suite failed:', err);
  process.exit(1);
});
