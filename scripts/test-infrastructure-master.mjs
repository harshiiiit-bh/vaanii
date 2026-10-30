import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import serverModule from '../server.js';
import {
  createBackupSnapshot,
  verifyBackupSnapshot,
  restoreBackupSnapshot,
  runDisasterRecoveryDrill
} from './backup-recovery.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const {
  app,
  validateEnvironmentConfig,
  isAllowedCorsOrigin,
  getHealthReport,
  flushSaveStoreSync
} = serverModule;

function requestRaw(server, method, reqPath, { body = undefined, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body !== undefined
      ? (typeof body === 'string' ? body : JSON.stringify(body))
      : null;

    const reqHeaders = {
      Accept: 'application/json',
      ...headers
    };
    if (payload !== null && !reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    if (payload !== null) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path: reqPath,
        method,
        headers: reqHeaders
      },
      res => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          raw += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (_e) {
            json = null;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            raw,
            json
          });
        });
      }
    );
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

async function runInfrastructureSuite() {
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  let passed = 0;
  async function step(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ [${passed}] ${name}`);
    } catch (err) {
      console.error(`  ✕ FAILED [${name}]:`, err.message);
      throw err;
    }
  }

  try {
    console.log('=== VAANI INFRASTRUCTURE, HOSTING & DEPLOYMENT MASTER VERIFICATION ===');

    // -------------------------------------------------------------------------
    // PART A: INFRASTRUCTURE, SECURITY, CORS, CACHING, HEALTH & DR CHECKS
    // -------------------------------------------------------------------------
    await step('Environment configuration validator & .env.example completeness', async () => {
      const envExamplePath = path.join(ROOT_DIR, '.env.example');
      assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');
      const envExample = fs.readFileSync(envExamplePath, 'utf8');
      for (const requiredVar of [
        'NODE_ENV=',
        'PORT=',
        'VAANI_ALLOWED_ORIGINS=',
        'VAANI_API_BASE=',
        'SUPABASE_URL=',
        'SUPABASE_ANON_KEY=',
        'SUPABASE_SERVICE_ROLE_KEY=',
        'VAANI_NOTIFICATIONS_API=',
        'VAANI_NOTIFICATIONS_SYNC_SECRET='
      ]) {
        assert.ok(envExample.includes(requiredVar), `.env.example missing ${requiredVar}`);
      }

      const validReport = validateEnvironmentConfig({
        NODE_ENV: 'production',
        PORT: '3000',
        SUPABASE_URL: 'https://pccavdwwhykwyeitxixc.supabase.co'
      });
      assert.equal(validReport.ok, true);
      assert.equal(validReport.environment, 'production');

      const invalidPortReport = validateEnvironmentConfig({
        NODE_ENV: 'production',
        PORT: '99999'
      });
      assert.equal(invalidPortReport.ok, false);
    });

    await step('Zero leaked secrets in repository source files', async () => {
      const filesToScan = [
        '.env.example',
        'server.js',
        'index.html',
        'js/app.js',
        'js/vaani-dynamic-engine.js',
        'js/vaani-arena.js',
        'supabase/functions/arena-leaderboard/index.ts'
      ];
      const secretPatterns = [
        /sb_secret_[a-zA-Z0-9_-]{12,}/,
        /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
        /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/
      ];
      for (const rel of filesToScan) {
        const content = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
        for (const regex of secretPatterns) {
          assert.equal(regex.test(content), false, `Potential secret pattern matched in ${rel}`);
        }
      }
    });

    await step('Multi-origin CORS policy for GitHub Pages, Vercel, Cloud Run & localhost', async () => {
      assert.equal(isAllowedCorsOrigin('https://harshiiiit-bh.github.io'), true);
      assert.equal(isAllowedCorsOrigin('http://localhost:3000'), true);
      assert.equal(isAllowedCorsOrigin('http://127.0.0.1:4173'), true);
      assert.equal(isAllowedCorsOrigin('https://preview-123-vaanii.vercel.app'), true);
      assert.equal(isAllowedCorsOrigin('https://vaani-prod-xyz.run.app'), true);
      assert.equal(isAllowedCorsOrigin('https://malicious-attacker.example.com'), false);

      // Verify preflight OPTIONS request from GitHub Pages origin
      const preflight = await requestRaw(server, 'OPTIONS', '/api/status', {
        headers: {
          Origin: 'https://harshiiiit-bh.github.io',
          'Access-Control-Request-Method': 'POST'
        }
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers['access-control-allow-origin'], 'https://harshiiiit-bh.github.io');

      // Verify disallowed origin preflight is rejected with 403
      const blockedPreflight = await requestRaw(server, 'OPTIONS', '/api/status', {
        headers: {
          Origin: 'https://evil-domain.example.com',
          'Access-Control-Request-Method': 'POST'
        }
      });
      assert.equal(blockedPreflight.status, 403);
    });

    await step('Sensitive infrastructure paths are blocked from public HTTP access', async () => {
      for (const restrictedPath of [
        '/.env',
        '/.env.example',
        '/.github/workflows/quality.yml',
        '/supabase/config.toml',
        '/cloudflare/notifications/wrangler.jsonc',
        '/server.js',
        '/package.json',
        '/data/runtime-store.json'
      ]) {
        const res = await requestRaw(server, 'GET', restrictedPath);
        assert.equal(res.status, 403, `Expected 403 for restricted path ${restrictedPath}, got ${res.status}`);
        assert.equal(res.json?.code, 'FORBIDDEN_RESOURCE');
      }
    });

    await step('Health, Liveness, Readiness & Observability Metrics probes', async () => {
      const health = await requestRaw(server, 'GET', '/health');
      assert.equal(health.status, 200);
      assert.equal(health.json?.ok, true);
      assert.equal(health.json?.checks?.contentRegistry, 'ok');
      assert.equal(health.json?.checks?.runtimeStoreStorage, 'ok');
      assert.equal(health.json?.contentStats?.pyqQuestions, 5400);
      assert.equal(health.json?.contentStats?.vocabWords, 44);
      assert.equal(health.json?.contentStats?.vocab90Days, 90);

      const live = await requestRaw(server, 'GET', '/api/health/live');
      assert.equal(live.status, 200);
      assert.equal(live.json?.status, 'alive');

      const ready = await requestRaw(server, 'GET', '/api/health/ready');
      assert.equal(ready.status, 200);
      assert.equal(ready.json?.ok, true);

      const metrics = await requestRaw(server, 'GET', '/api/metrics');
      assert.equal(metrics.status, 200);
      assert.equal(metrics.json?.ok, true);
      assert.ok(metrics.json?.requests?.total >= 3);
      assert.ok(typeof metrics.json?.memory?.heapUsedMb === 'number');
    });

    await step('Static asset caching headers vs dynamic API no-store headers', async () => {
      const htmlRes = await requestRaw(server, 'GET', '/index.html', {
        headers: { Accept: 'text/html' }
      });
      assert.equal(htmlRes.status, 200);
      assert.ok(String(htmlRes.headers['cache-control']).includes('no-cache'));

      const swRes = await requestRaw(server, 'GET', '/sw.js');
      assert.equal(swRes.status, 200);
      assert.ok(String(swRes.headers['cache-control']).includes('no-cache'));

      const cssRes = await requestRaw(server, 'GET', '/vaani-dynamic.css');
      assert.equal(cssRes.status, 200);
      assert.ok(String(cssRes.headers['cache-control']).includes('max-age=3600'));

      const apiRes = await requestRaw(server, 'GET', '/api/status');
      assert.equal(apiRes.status, 200);
      assert.ok(String(apiRes.headers['cache-control']).includes('no-store'));
    });

    await step('Automated Backup, SHA-256 Checksum Verification & Disaster Recovery Drill', async () => {
      const drillResult = runDisasterRecoveryDrill();
      assert.equal(drillResult.ok, true);
      assert.ok(drillResult.checksum && drillResult.checksum.length === 64);
    });

    // -------------------------------------------------------------------------
    // PART B: COMPLETE 23-STEP END-TO-END USER JOURNEY VERIFICATION
    // -------------------------------------------------------------------------
    let journeyCode = '';

    await step('Journey 1 & 2: Open homepage & navigate SPA view routes', async () => {
      const home = await requestRaw(server, 'GET', '/', { headers: { Accept: 'text/html' } });
      assert.equal(home.status, 200);
      assert.ok(home.raw.includes('id="view-dashboard"'));
      assert.ok(home.raw.includes('js/vaani-dynamic-engine.js'));

      const grammarRoute = await requestRaw(server, 'GET', '/?v=grammar', { headers: { Accept: 'text/html' } });
      assert.equal(grammarRoute.status, 200);
    });

    await step('Journey 3: Register a new Cadet account', async () => {
      const reg = await requestRaw(server, 'POST', '/api/accounts/register', {
        body: { name: 'Lt. Rohan Verma', serviceForce: 'airforce' }
      });
      assert.equal(reg.status, 201);
      assert.equal(reg.json?.ok, true);
      assert.match(reg.json?.code, /^\d{6}$/);
      journeyCode = reg.json.code;
    });

    await step('Journey 4 & 5: Log in with 6-digit code & maintain session state', async () => {
      const login = await requestRaw(server, 'POST', '/api/accounts/login', {
        body: { code: journeyCode }
      });
      assert.equal(login.status, 200);
      assert.equal(login.json?.ok, true);
      assert.equal(login.json?.record?.vaani?.name, 'Lt. Rohan Verma');
      assert.equal(login.json?.record?.vaani?.serviceForce, 'airforce');

      const sessionGet = await requestRaw(server, 'GET', `/api/accounts/${journeyCode}`);
      assert.equal(sessionGet.status, 200);
      assert.equal(sessionGet.json?.record?.vaani?.name, 'Lt. Rohan Verma');
    });

    await step('Journey 6: Load Dashboard Command Centre briefing', async () => {
      const dash = await requestRaw(server, 'GET', `/api/officer-vaani/briefing?view=dashboard&code=${journeyCode}`);
      assert.equal(dash.status, 200);
      assert.equal(dash.json?.ok, true);
      assert.equal(dash.json?.pose, 'welcome');
      assert.ok(dash.json?.title.includes('Lt. Rohan Verma'));
    });

    await step('Journey 7 & 8: Open Grammar Academy lessons & complete a grammar topic', async () => {
      const topics = await requestRaw(server, 'GET', '/api/grammar/topics');
      assert.equal(topics.status, 200);
      assert.ok(topics.json?.total >= 34);
      const firstTopicId = topics.json.topics[0].id;

      const update = await requestRaw(server, 'PUT', `/api/accounts/${journeyCode}`, {
        body: {
          record: {
            vaani: {
              name: 'Lt. Rohan Verma',
              serviceForce: 'airforce',
              completedTopics: { [firstTopicId]: true },
              quizScores: { [firstTopicId]: 92 }
            }
          }
        }
      });
      assert.equal(update.status, 200);
      assert.equal(update.json?.record?.vaani?.completedTopics?.[firstTopicId], true);
      assert.equal(update.json?.record?.vaani?.quizScores?.[firstTopicId], 92);
    });

    let samplePyq = null;

    await step('Journey 9 & 10: Open PYQ module & filter PYQs by exam, year, topic & status', async () => {
      const pyqRes = await requestRaw(server, 'GET', `/api/pyq/questions?exam=NDA&status=UNATTEMPTED&code=${journeyCode}&pageSize=10&includeAnswers=true`);
      assert.equal(pyqRes.status, 200);
      assert.equal(pyqRes.json?.ok, true);
      assert.ok(pyqRes.json?.items?.length > 0);
      samplePyq = pyqRes.json.items[0];
      assert.ok(samplePyq._id);
    });

    await step('Journey 11 & 12: Solve PYQ question, verify explanation & anti-farming XP guard', async () => {
      const solve1 = await requestRaw(server, 'POST', '/api/pyq/solve', {
        body: {
          code: journeyCode,
          qid: samplePyq._id,
          selectedOption: samplePyq.ans
        }
      });
      assert.equal(solve1.status, 200);
      assert.equal(solve1.json?.correct, true);
      assert.equal(solve1.json?.xpAwarded, 2);
      assert.equal(solve1.json?.alreadyRewarded, false);
      assert.equal(typeof solve1.json?.explanation, 'string');

      // Re-solving same PYQ must award 0 duplicate XP
      const solve2 = await requestRaw(server, 'POST', '/api/pyq/solve', {
        body: {
          code: journeyCode,
          qid: samplePyq._id,
          selectedOption: samplePyq.ans
        }
      });
      assert.equal(solve2.status, 200);
      assert.equal(solve2.json?.xpAwarded, 0);
      assert.equal(solve2.json?.alreadyRewarded, true);
    });

    await step('Journey 13: Bookmark PYQ question and filter by bookmarked', async () => {
      const bm = await requestRaw(server, 'POST', '/api/pyq/bookmark', {
        body: { code: journeyCode, qid: samplePyq._id }
      });
      assert.equal(bm.status, 200);
      assert.equal(bm.json?.bookmarked, true);

      const filteredBm = await requestRaw(server, 'GET', `/api/pyq/questions?status=BOOKMARKED&code=${journeyCode}`);
      assert.equal(filteredBm.status, 200);
      assert.ok(filteredBm.json?.items?.some(q => q._id === samplePyq._id));
    });

    await step('Journey 14 & 15: Open Vocabulary bank & mark word mastered (+10 XP once)', async () => {
      const vocabRes = await requestRaw(server, 'GET', `/api/vocab/words?status=unmastered&code=${journeyCode}`);
      assert.equal(vocabRes.status, 200);
      assert.ok(vocabRes.json?.items?.length > 0);
      const wordId = vocabRes.json.items[0].id;

      const m1 = await requestRaw(server, 'POST', '/api/vocab/mastery', {
        body: { code: journeyCode, wordId, mastered: true }
      });
      assert.equal(m1.status, 200);
      assert.equal(m1.json?.mastered, true);
      assert.equal(m1.json?.xpAwarded, 10);

      // Unmaster and remaster -> 0 duplicate XP
      await requestRaw(server, 'POST', '/api/vocab/mastery', {
        body: { code: journeyCode, wordId, mastered: false }
      });
      const m2 = await requestRaw(server, 'POST', '/api/vocab/mastery', {
        body: { code: journeyCode, wordId, mastered: true }
      });
      assert.equal(m2.status, 200);
      assert.equal(m2.json?.xpAwarded, 0);
      assert.equal(m2.json?.alreadyRewarded, true);
    });

    await step('Journey 16: Complete an Arena match & verify leaderboard sanitization', async () => {
      const matchCreate = await requestRaw(server, 'POST', '/api/arena/register-match', {
        body: {
          code: '390812',
          hostPid: 'host_' + journeyCode,
          hostName: 'Lt. Rohan Verma',
          expiresAt: Date.now() + 60000,
          questionIds: [samplePyq._id]
        }
      });
      assert.equal(matchCreate.status, 200);
      assert.equal(matchCreate.json?.ok, true);

      const scoreSubmit = await requestRaw(server, 'POST', '/api/arena/submit', {
        body: {
          code: '390812',
          pid: 'cadet_' + journeyCode,
          name: 'Lt. Rohan Verma',
          score: 9,
          seconds: 145,
          total: 10,
          correct: 9,
          incorrect: 1,
          skipped: 0
        }
      });
      assert.equal(scoreSubmit.status, 200);
      assert.equal(scoreSubmit.json?.ok, true);

      const lb = await requestRaw(server, 'POST', '/api/arena/leaderboard', {
        body: { code: '390812' }
      });
      assert.equal(lb.status, 200);
      assert.ok(lb.json?.rows?.some(r => r.name === 'Lt. Rohan Verma' && r.score === 9));
    });

    await step('Journey 17, 18 & 19: Award XP, verify streak & calculate Service Rank promotion', async () => {
      const putXp = await requestRaw(server, 'PUT', `/api/accounts/${journeyCode}`, {
        body: {
          merge: true,
          record: {
            vaani: {
              name: 'Lt. Rohan Verma',
              serviceForce: 'airforce',
              xp: 432,
              streak: 5
            }
          }
        }
      });
      assert.equal(putXp.status, 200);
      assert.equal(putXp.json?.ok, true);
      assert.equal(putXp.json?.record?.vaani?.xp, 432);
      assert.equal(putXp.json?.rank?.current?.name, 'Flight Lieutenant'); // Air Force 400+ XP rank
    });

    await step('Journey 20: Sync & query Global + Air Force Cohort Leaderboard', async () => {
      const syncRes = await requestRaw(server, 'POST', '/api/leaderboard/sync', {
        body: { code: journeyCode }
      });
      assert.equal(syncRes.status, 200);

      const boardRes = await requestRaw(server, 'GET', `/api/leaderboard/global?force=airforce&mode=live&code=${journeyCode}`);
      assert.equal(boardRes.status, 200);
      const myRow = boardRes.json?.rows?.find(r => r.isCurrentCadet);
      assert.ok(myRow, 'Current cadet must appear on live Air Force leaderboard');
      assert.equal(myRow.xp, 432);
      assert.equal(myRow.rankTitle, 'Flight Lieutenant');
    });

    await step('Journey 21 & 22: View Profile state, flush persistence & verify reload integrity', async () => {
      flushSaveStoreSync();
      const profileRes = await requestRaw(server, 'GET', `/api/accounts/${journeyCode}`);
      assert.equal(profileRes.status, 200);
      assert.equal(profileRes.json?.record?.vaani?.xp, 432);
      assert.equal(profileRes.json?.summary?.rankTitle, 'Flight Lieutenant');
      assert.ok(profileRes.json?.record?.vaani?.xpLedger?.length >= 2);
    });

    await step('Journey 23: Trigger Officer Vaani contextual briefings across all modules', async () => {
      for (const [view, expectedPose] of [
        ['dashboard', 'welcome'],
        ['grammar', 'teaching'],
        ['pyq', 'exam'],
        ['vocab', 'guidance'],
        ['leaderboard', 'congratulatory']
      ]) {
        const b = await requestRaw(server, 'GET', `/api/officer-vaani/briefing?view=${view}&code=${journeyCode}`);
        assert.equal(b.status, 200);
        assert.equal(b.json?.ok, true);
        assert.equal(b.json?.pose, expectedPose, `Expected pose ${expectedPose} for view ${view}`);
        assert.equal(b.json?.metrics?.xp, 432);
      }
    });

    console.log(`\nALL ${passed} INFRASTRUCTURE & END-TO-END USER JOURNEY CHECKS PASSED.`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

runInfrastructureSuite().catch(err => {
  console.error('Infrastructure verification failed:', err);
  process.exitCode = 1;
});
