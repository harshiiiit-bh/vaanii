import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import serverPkg from '../server.js';
const { app, getContentRegistry } = serverPkg;

const ROOT = process.cwd();

function hexToRgb(hex) {
  const clean = String(hex || '').replace(/^#/, '').trim();
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function relativeLuminance({ r, g, b }) {
  const chan = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function contrastRatio(fgHex, bgHex) {
  const l1 = relativeLuminance(hexToRgb(fgHex));
  const l2 = relativeLuminance(hexToRgb(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

async function runAuditTests() {
  console.log('=== VAANI COMPLETE WEBSITE AUDIT, BUG FIXING & PERFORMANCE SUITE ===');
  const results = [];
  const perfMetrics = {};

  function recordTest(name, fn) {
    results.push({ name, fn });
  }

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. WCAG AA Colour Contrast Verification across Light, Dark, Zen, and Sepia Themes
    recordTest('WCAG AA Colour Contrast (>= 4.5:1) across Light, Dark, Zen, and Sepia themes', async () => {
      const dynCss = fs.readFileSync(path.join(ROOT, 'vaani-dynamic.css'), 'utf8');
      const baseCss = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
      const repairCss = fs.readFileSync(path.join(ROOT, 'vaani-contrast-repair.css'), 'utf8');

      // Ensure no off-white fallback var(--ink, #f5f2e9) remains on theme-adaptive selectors
      assert.equal(
        dynCss.includes('var(--ink, #f5f2e9)'),
        false,
        'vaani-dynamic.css must not use var(--ink, #f5f2e9) off-white fallback on theme-adaptive surfaces'
      );
      assert.equal(baseCss.includes('--text:#16212E'), true, 'Light mode --text token must be #16212E');
      assert.equal(repairCss.includes('#view-grammar'), true, 'Grammar contrast repair rules must exist');

      const themeMatrix = [
        // Light Mode
        { theme: 'Light', pair: 'Primary Text on Panel', fg: '#16212E', bg: '#FFFFFF', min: 4.5 },
        { theme: 'Light', pair: 'Primary Text on Cream BG', fg: '#16212E', bg: '#F7F4EC', min: 4.5 },
        { theme: 'Light', pair: 'Muted Text on Panel', fg: '#475569', bg: '#FFFFFF', min: 4.5 },
        { theme: 'Light', pair: 'Muted Text on Cream BG', fg: '#475569', bg: '#F7F4EC', min: 4.5 },
        { theme: 'Light', pair: 'Gold Ink Badge/Link on Panel', fg: '#6e4b10', bg: '#FFFFFF', min: 4.5 },
        { theme: 'Light', pair: 'Gold Ink Badge/Link on Cream BG', fg: '#6e4b10', bg: '#F7F4EC', min: 4.5 },
        { theme: 'Light', pair: 'Green Ink Solved Badge on Panel', fg: '#0d6839', bg: '#FFFFFF', min: 4.5 },
        { theme: 'Light', pair: 'Green Ink Solved Badge on Cream BG', fg: '#0d6839', bg: '#F7F4EC', min: 4.5 },
        { theme: 'Light', pair: 'Red Ink Mistake Badge on Panel', fg: '#9e2426', bg: '#FFFFFF', min: 4.5 },
        { theme: 'Light', pair: 'Red Ink Mistake Badge on Cream BG', fg: '#9e2426', bg: '#F7F4EC', min: 4.5 },
        // Dark Mode
        { theme: 'Dark', pair: 'Primary Text on Dark Panel', fg: '#e9ecef', bg: '#12232c', min: 4.5 },
        { theme: 'Dark', pair: 'Primary Text on Dark BG', fg: '#e9ecef', bg: '#0d1b22', min: 4.5 },
        { theme: 'Dark', pair: 'Muted Text on Dark Panel', fg: '#a5b3bc', bg: '#12232c', min: 4.5 },
        { theme: 'Dark', pair: 'Gold Ink on Dark Panel', fg: '#f0d078', bg: '#12232c', min: 4.5 },
        { theme: 'Dark', pair: 'Green Ink on Dark Panel', fg: '#5ce096', bg: '#12232c', min: 4.5 },
        { theme: 'Dark', pair: 'Red Ink on Dark Panel', fg: '#ff8083', bg: '#12232c', min: 4.5 },
        // Zen Mode
        { theme: 'Zen', pair: 'Primary Text on Zen BG', fg: '#1E293B', bg: '#EFECE2', min: 4.5 },
        { theme: 'Zen', pair: 'Gold Ink on Zen BG', fg: '#6e4b10', bg: '#EFECE2', min: 4.5 },
        // Sepia Mode
        { theme: 'Sepia', pair: 'Primary Text on Sepia BG', fg: '#2C1E14', bg: '#F5EBDC', min: 4.5 },
        { theme: 'Sepia', pair: 'Gold Ink on Sepia BG', fg: '#6e4b10', bg: '#F5EBDC', min: 4.5 },
        // Grammar Navy Command Surface
        { theme: 'Grammar Command', pair: 'Banner Title on Navy', fg: '#f3f6f8', bg: '#102331', min: 4.5 },
        { theme: 'Grammar Command', pair: 'Banner Desc on Navy', fg: '#c2cdd5', bg: '#102331', min: 4.5 },
        { theme: 'Grammar Command', pair: 'Banner Kicker on Navy', fg: '#f0d078', bg: '#102331', min: 4.5 }
      ];

      for (const item of themeMatrix) {
        const ratio = contrastRatio(item.fg, item.bg);
        assert.equal(
          ratio >= item.min,
          true,
          `[${item.theme}] ${item.pair} (${item.fg} on ${item.bg}) contrast ratio ${ratio}:1 is below ${item.min}:1`
        );
      }
    });

    // 2. Responsive Breakpoints & Mobile Overflow Prevention (320px - 1600px)
    recordTest('Responsive Breakpoint & 320px Ultra-Narrow Viewport Overflow Guards', async () => {
      const dynCss = fs.readFileSync(path.join(ROOT, 'vaani-dynamic.css'), 'utf8');
      const stabCss = fs.readFileSync(path.join(ROOT, 'vaani-stability.css'), 'utf8');
      const baseCss = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

      assert.equal(dynCss.includes('@media (max-width: 640px)'), true, '640px mobile breakpoint must exist in vaani-dynamic.css');
      assert.equal(dynCss.includes('@media (max-width: 480px)'), true, '480px narrow mobile breakpoint must exist in vaani-dynamic.css');
      assert.equal(dynCss.includes('.vv-mastery-bar-track'), true, 'Vocab mastery progress bar track must be responsive');
      assert.equal(stabCss.includes('overflow-x: hidden') || baseCss.includes('overflow-x:hidden'), true, 'Global horizontal overflow guard must exist');
    });

    // 3. Officer Vaani 8-Pose Rig, Legacy Pose Map & Asset Integrity
    recordTest('Officer Vaani 8-Pose SVG Rig, Legacy Pose Map & Asset Integrity', async () => {
      const engineJs = fs.readFileSync(path.join(ROOT, 'js', 'vaani-dynamic-engine.js'), 'utf8');
      const requiredPoses = [
        'welcome',
        'teaching',
        'thinking',
        'motivational',
        'congratulatory',
        'exam',
        'celebration',
        'guidance'
      ];
      for (const pose of requiredPoses) {
        assert.equal(engineJs.includes(`${pose}: {`), true, `Officer Vaani pose '${pose}' must be defined`);
      }
      for (let i = 0; i <= 11; i++) {
        assert.equal(engineJs.includes(`'vc-p${i}'`), true, `Legacy pose vc-p${i} must be mapped`);
      }
      assert.equal(fs.existsSync(path.join(ROOT, 'assets', 'officer-vaani.svg')), true, 'assets/officer-vaani.svg must exist');
      assert.equal(fs.existsSync(path.join(ROOT, 'assets', 'vaani-icon.svg')), true, 'assets/vaani-icon.svg must exist');
      assert.equal(fs.existsSync(path.join(ROOT, 'assets', 'vaani-emblem-favicon.png')), true, 'assets/vaani-emblem-favicon.png must exist');
    });

    // 4. Deep-Link Router (?v=...&id=...) & Cross-Device Login Fallback Verification
    recordTest('Deep-Link Sub-Item Router & Cross-Device Account Login Fallback Guard', async () => {
      const engineJs = fs.readFileSync(path.join(ROOT, 'js', 'vaani-dynamic-engine.js'), 'utf8');
      assert.equal(
        engineJs.includes("errText.includes('No usable account')"),
        true,
        'wrappedLogin must match library.js "No usable account" message for cross-device login'
      );
      assert.equal(
        engineJs.includes('!hadLocalEntryBeforeLogin'),
        true,
        'wrappedLogin must not overwrite corrupt local entries during login'
      );
      assert.equal(
        engineJs.includes('initialBootParams'),
        true,
        'Deep-link router must preserve initial boot ?v=...&id=... parameters'
      );
      assert.equal(
        engineJs.includes("window.addEventListener('popstate'"),
        true,
        'Deep-link router must re-hydrate sub-items on browser Back/Forward popstate'
      );
    });

    // 5. End-to-End Backend Journeys (Accounts, PYQ, Vocab, Grammar, Arena, Leaderboard, History/Geography)
    recordTest('End-to-End API Journeys, Anti-Duplicate XP Guard & Content Integrity', async () => {
      const t0 = performance.now();
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthMs = performance.now() - t0;
      perfMetrics.healthEndpointLatencyMs = Number(healthMs.toFixed(2));
      assert.equal(healthRes.status, 200);
      const healthData = await healthRes.json();
      assert.equal(healthData.ok, true);
      assert.equal(healthData.contentStats.pyqQuestions >= 5000, true, 'PYQ count must be >= 5000');
      assert.equal(healthData.contentStats.vocabWords >= 40, true, 'Vocab count must be >= 40');
      assert.equal(healthData.contentStats.vocab90Days === 90, true, 'Vocab 90-day count must be 90');
      assert.equal(healthData.contentStats.grammarTopics >= 34, true, 'Grammar count must be >= 34');

      // Test account creation & cross-device fetch
      const code = '741852';
      const putRes = await fetch(`${baseUrl}/api/accounts/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            vaani: {
              name: 'Cadet Audit',
              serviceForce: 'airforce',
              xp: 350,
              streak: 5,
              completedTopics: { t1: true, t2: true }
            },
            vbv: { profile: { name: 'Cadet Audit' } }
          }
        })
      });
      assert.equal(putRes.status, 200);

      // Verify PYQ solve & anti-duplicate XP guard
      const pyqListRes = await fetch(`${baseUrl}/api/pyq/questions?exam=NDA&pageSize=5`);
      assert.equal(pyqListRes.status, 200);
      const pyqList = await pyqListRes.json();
      assert.equal(pyqList.ok, true);
      assert.equal(pyqList.items.length > 0, true);
      const sampleQ = getContentRegistry().pyqAll[0];

      const solve1 = await fetch(`${baseUrl}/api/pyq/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, qid: sampleQ._id, selectedOption: sampleQ.ans })
      });
      const solve1Data = await solve1.json();
      assert.equal(solve1Data.ok, true);
      assert.equal(solve1Data.correct, true);
      assert.equal(solve1Data.xpAwarded, 2);

      const solve2 = await fetch(`${baseUrl}/api/pyq/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, qid: sampleQ._id, selectedOption: sampleQ.ans })
      });
      const solve2Data = await solve2.json();
      assert.equal(solve2Data.ok, true);
      assert.equal(solve2Data.xpAwarded, 0, 'Duplicate PYQ solve must award 0 XP');
      assert.equal(solve2Data.alreadyRewarded, true);

      // Verify Vocabulary Mastery & Bookmarking
      const vocabRes = await fetch(`${baseUrl}/api/vocab/words?code=${code}`);
      const vocabData = await vocabRes.json();
      assert.equal(vocabData.ok, true);
      const sampleW = vocabData.items[0];

      const mastery1 = await fetch(`${baseUrl}/api/vocab/mastery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, wordId: sampleW.id, mastered: true })
      });
      const mastery1Data = await mastery1.json();
      assert.equal(mastery1Data.ok, true);
      assert.equal(mastery1Data.xpAwarded, 10);

      // Verify Academy, Government Exam Desk, and Book Reading views and data
      const examDeskJs = fs.readFileSync(path.join(ROOT, 'js', 'vaani-exam-desk-data.js'), 'utf8');
      const bookCompanionJs = fs.readFileSync(path.join(ROOT, 'data', 'book-companion.js'), 'utf8');
      const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      const expectedViews = [
        'view-dashboard',
        'view-grammar',
        'view-journey',
        'view-topic',
        'view-vocab',
        'view-vocab90',
        'view-worddetail',
        'view-compare',
        'view-compare-detail',
        'view-pyq',
        'view-games',
        'view-leaderboard',
        'view-profile',
        'view-notifications',
        'view-books'
      ];
      for (const vid of expectedViews) {
        assert.equal(indexHtml.includes(`id="${vid}"`), true, `View #${vid} must exist in index.html`);
      }
      assert.equal(
        examDeskJs.length > 5000 && bookCompanionJs.length > 1000,
        true,
        'Government Exam Desk and Book Companion data must be present'
      );
    });

    // 6. Real Measured Performance & Static Asset Footprint
    recordTest('Measured API Latencies, Memory Footprint & Static Bundle Sizes', async () => {
      const endpoints = [
        '/api/health',
        '/api/status',
        '/api/metrics',
        '/api/pyq/questions?exam=CDS&pageSize=10',
        '/api/vocab/words',
        '/api/grammar/topics',
        '/api/leaderboard/global?force=all&sort=xp'
      ];
      const timings = {};
      for (const ep of endpoints) {
        const start = performance.now();
        const res = await fetch(`${baseUrl}${ep}`);
        assert.equal(res.status, 200, `Endpoint ${ep} must return 200`);
        await res.json();
        timings[ep] = Number((performance.now() - start).toFixed(2));
      }
      perfMetrics.warmApiLatenciesMs = timings;

      const mem = process.memoryUsage();
      perfMetrics.memoryMB = {
        rss: Number((mem.rss / (1024 * 1024)).toFixed(2)),
        heapUsed: Number((mem.heapUsed / (1024 * 1024)).toFixed(2))
      };

      const trackedFiles = [
        'index.html',
        'styles.css',
        'vaani-contrast-repair.css',
        'vaani-dynamic.css',
        'vaani-stability.css',
        'js/app.js',
        'js/library.js',
        'js/vaani-upgrade-core.js',
        'js/vaani-reliability.js',
        'js/vaani-dynamic-engine.js',
        'server.js'
      ];
      const fileSizesKB = {};
      for (const rel of trackedFiles) {
        const stat = fs.statSync(path.join(ROOT, rel));
        fileSizesKB[rel] = Number((stat.size / 1024).toFixed(1));
      }
      perfMetrics.fileSizesKB = fileSizesKB;
    });

    let passed = 0;
    for (const t of results) {
      await t.fn();
      passed++;
      console.log(`  [PASS] ${t.name}`);
    }
    console.log(`\nALL ${passed}/${results.length} COMPLETE AUDIT SUITES PASSED.`);
    console.log('MEASURED PERFORMANCE METRICS:', JSON.stringify(perfMetrics, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runAuditTests().catch((err) => {
  console.error('[FAIL] Audit test suite failed:', err);
  process.exit(1);
});
