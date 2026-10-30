const express = require('express');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = ['development', 'staging', 'production', 'test'].includes(process.env.NODE_ENV)
  ? process.env.NODE_ENV
  : 'development';
const REQUEST_TIMEOUT_MS = Math.max(2000, Math.min(60000, Number(process.env.VAANI_REQUEST_TIMEOUT_MS) || 15000));
const rootDir = path.resolve(__dirname);
const storeFilePath = process.env.VAANI_RUNTIME_STORE_PATH
  ? path.resolve(process.env.VAANI_RUNTIME_STORE_PATH)
  : path.join(rootDir, 'data', 'runtime-store.json');

/* ============================================================
   1. ENVIRONMENT VALIDATION, CORS, SECURITY & RATE LIMITING
============================================================= */
function validateEnvironmentConfig(env = process.env) {
  const mode = ['development', 'staging', 'production', 'test'].includes(env.NODE_ENV)
    ? env.NODE_ENV
    : 'development';
  const warnings = [];
  const errors = [];

  const portNum = Number(env.PORT || 3000);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    errors.push('PORT must be a valid TCP port (1-65535).');
  }

  const supabaseUrl = String(env.SUPABASE_URL || 'https://pccavdwwhykwyeitxixc.supabase.co').trim();
  if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
    warnings.push('SUPABASE_URL does not match standard https://<project>.supabase.co format.');
  }

  if (mode === 'production') {
    if (env.SUPABASE_SERVICE_ROLE_KEY && String(env.SUPABASE_SERVICE_ROLE_KEY).length < 20) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY appears malformed.');
    }
  }

  return {
    ok: errors.length === 0,
    environment: mode,
    port: portNum,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    supabaseConfigured: Boolean(supabaseUrl),
    supabaseServiceRolePresent: Boolean(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEYS),
    notificationsSyncSecretPresent: Boolean(env.VAANI_NOTIFICATIONS_SYNC_SECRET),
    customApiBaseConfigured: Boolean(env.VAANI_API_BASE),
    warnings,
    errors
  };
}

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://harshiiiit-bh.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
]);

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  const clean = String(origin).trim();
  if (DEFAULT_ALLOWED_ORIGINS.has(clean)) return true;

  const extra = String(process.env.VAANI_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (extra.includes(clean)) return true;

  try {
    const u = new URL(clean);
    if (u.protocol === 'https:' && (
      u.hostname.endsWith('-vaanii.vercel.app') ||
      u.hostname.endsWith('.run.app') ||
      u.hostname.endsWith('.aistudio.google.com')
    )) {
      return true;
    }
    if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1') && (u.protocol === 'http:' || u.protocol === 'https:')) {
      return true;
    }
  } catch (_e) {
    return false;
  }
  return false;
}

const serverMetrics = {
  startedAt: Date.now(),
  totalRequests: 0,
  apiRequests: 0,
  apiErrors4xx: 0,
  apiErrors5xx: 0,
  rateLimitHits: 0,
  totalLatencyMs: 0,
  maxLatencyMs: 0,
  lastErrorAt: null,
  lastErrorCode: null
};

app.disable('x-powered-by');

// Request telemetry, timeout guard, security headers & multi-origin CORS
app.use((req, res, next) => {
  const startHr = process.hrtime.bigint();
  serverMetrics.totalRequests++;
  if (req.path.startsWith('/api/')) {
    serverMetrics.apiRequests++;
  }

  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(503).json({
        ok: false,
        code: 'REQUEST_TIMEOUT',
        error: 'Request timed out while processing.'
      });
    }
  });

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const origin = req.headers.origin;
  if (origin && isAllowedCorsOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Client-Info, X-Vaani-Client');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    if (req.method === 'OPTIONS') {
      if (origin && !isAllowedCorsOrigin(origin)) {
        return res.status(403).json({ ok: false, code: 'CORS_ORIGIN_DENIED', error: 'Origin is not permitted.' });
      }
      return res.status(204).end();
    }
  }

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startHr) / 1e6;
    serverMetrics.totalLatencyMs += elapsedMs;
    if (elapsedMs > serverMetrics.maxLatencyMs) {
      serverMetrics.maxLatencyMs = Math.round(elapsedMs * 100) / 100;
    }
    if (req.path.startsWith('/api/')) {
      if (res.statusCode >= 500) {
        serverMetrics.apiErrors5xx++;
        serverMetrics.lastErrorAt = Date.now();
        serverMetrics.lastErrorCode = res.statusCode;
      } else if (res.statusCode >= 400) {
        serverMetrics.apiErrors4xx++;
      }
    }
  });

  next();
});

// Block direct public HTTP access to internal server/infrastructure files
const BLOCKED_PATH_PREFIXES = [
  '/.env',
  '/.git',
  '/.github',
  '/supabase',
  '/cloudflare',
  '/backups',
  '/scripts',
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/data/runtime-store.json'
];

app.use((req, res, next) => {
  const normPath = String(req.path || '').toLowerCase();
  if (BLOCKED_PATH_PREFIXES.some(prefix => normPath === prefix || normPath.startsWith(prefix + '/') || normPath.startsWith(prefix + '.'))) {
    return res.status(403).json({
      ok: false,
      code: 'FORBIDDEN_RESOURCE',
      error: 'Access to internal infrastructure configuration is restricted.'
    });
  }
  return next();
});

// Per-IP sliding-window rate limiter for API routes
const rateBuckets = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 600;

function checkRateLimit(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  const forceLimit = req.headers['x-vaani-test-ratelimit'];
  if (forceLimit === 'exceed') {
    serverMetrics.rateLimitHits++;
    return res.status(429).json({
      ok: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Too many requests. Please wait a moment before retrying.'
    });
  }
  const ip = String(req.ip || req.socket?.remoteAddress || 'local');
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > RATE_MAX_REQUESTS) {
    serverMetrics.rateLimitHits++;
    return res.status(429).json({
      ok: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Too many requests. Please wait a moment before retrying.'
    });
  }
  return next();
}

app.use(checkRateLimit);
app.use(express.json({ limit: '2mb' }));

// Catch JSON body parser errors cleanly without exposing stack traces
app.use((err, _req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res.status(400).json({ ok: false, code: 'INVALID_JSON', error: 'Invalid JSON request payload.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, code: 'PAYLOAD_TOO_LARGE', error: 'Request payload exceeds the size limit.' });
  }
  return next(err);
});

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeString(val, maxLen = 4000) {
  return String(val == null ? '' : val)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function deepSanitizeObject(input, depth = 0) {
  if (depth > 8 || input === null || input === undefined) return input;
  if (typeof input === 'string') {
    return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.slice(0, 2000).map(item => deepSanitizeObject(item, depth + 1));
  }
  const out = {};
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    out[key] = deepSanitizeObject(input[key], depth + 1);
  }
  return out;
}

app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitizeObject(req.body);
  }
  next();
});

function isPlainRecord(val) {
  return !!val && typeof val === 'object' && !Array.isArray(val);
}

function sanitizeCode(raw) {
  const s = String(raw || '').trim();
  return /^\d{6}$/.test(s) ? s : '';
}

function computeInitials(name) {
  const parts = String(name || 'Cadet').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CD';
  return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

/* ============================================================
   2. CENTRALISED XP, SERVICE RANK, STREAK & REWARD ENGINE
============================================================= */
const VAANI_CORRECT_ANSWER_XP = 2;
const VAANI_VOCAB_MASTERY_XP = 10;
const VAANI_STREAK_DAILY_XP = 22;

const VAANI_SERVICE_RANKS = {
  army: [
    { name: 'Lieutenant', xp: 100, file: 'assets/ranks/army-01-lieutenant.svg' },
    { name: 'Captain', xp: 400, file: 'assets/ranks/army-02-captain.svg' },
    { name: 'Major', xp: 900, file: 'assets/ranks/army-03-major.svg' },
    { name: 'Lieutenant Colonel', xp: 1700, file: 'assets/ranks/army-04-lt-colonel.svg' },
    { name: 'Colonel', xp: 3000, file: 'assets/ranks/army-05-colonel.svg' },
    { name: 'Brigadier', xp: 4800, file: 'assets/ranks/army-06-brigadier.svg' },
    { name: 'Major General', xp: 7200, file: 'assets/ranks/army-07-major-general.svg' },
    { name: 'Lieutenant General', xp: 10500, file: 'assets/ranks/army-08-lt-general.svg' },
    { name: 'General', xp: 14500, file: 'assets/ranks/army-09-general.svg' }
  ],
  navy: [
    { name: 'Sub Lieutenant', xp: 100, file: 'assets/ranks/navy-01-sub-lieutenant.svg' },
    { name: 'Lieutenant', xp: 400, file: 'assets/ranks/navy-02-lieutenant.svg' },
    { name: 'Lieutenant Commander', xp: 900, file: 'assets/ranks/navy-03-lt-commander.svg' },
    { name: 'Commander', xp: 1700, file: 'assets/ranks/navy-04-commander.svg' },
    { name: 'Captain', xp: 3000, file: 'assets/ranks/navy-05-captain.svg' },
    { name: 'Commodore', xp: 4800, file: 'assets/ranks/navy-06-commodore.svg' },
    { name: 'Rear Admiral', xp: 7200, file: 'assets/ranks/navy-07-rear-admiral.svg' },
    { name: 'Vice Admiral', xp: 10500, file: 'assets/ranks/navy-08-vice-admiral.svg' },
    { name: 'Admiral', xp: 14500, file: 'assets/ranks/navy-09-admiral.svg' }
  ],
  airforce: [
    { name: 'Flying Officer', xp: 100, file: 'assets/ranks/airforce-01-flying-officer.svg' },
    { name: 'Flight Lieutenant', xp: 400, file: 'assets/ranks/airforce-02-flight-lieutenant.svg' },
    { name: 'Squadron Leader', xp: 900, file: 'assets/ranks/airforce-03-squadron-leader.svg' },
    { name: 'Wing Commander', xp: 1700, file: 'assets/ranks/airforce-04-wing-commander.svg' },
    { name: 'Group Captain', xp: 3000, file: 'assets/ranks/airforce-05-group-captain.svg' },
    { name: 'Air Commodore', xp: 4800, file: 'assets/ranks/airforce-06-air-commodore.svg' },
    { name: 'Air Vice Marshal', xp: 7200, file: 'assets/ranks/airforce-07-air-vice-marshal.svg' },
    { name: 'Air Marshal', xp: 10500, file: 'assets/ranks/airforce-08-air-marshal.svg' },
    { name: 'Air Chief Marshal', xp: 14500, file: 'assets/ranks/airforce-09-air-chief-marshal.svg' }
  ]
};

const VAANI_HONORARY_RANKS = {
  army: { name: 'Field Marshal', xp: 19000, file: 'assets/ranks/army-10-field-marshal.svg', honorary: true },
  navy: { name: 'Admiral of the Fleet', xp: 19000, file: 'assets/ranks/navy-10-admiral-of-the-fleet.svg', honorary: true },
  airforce: { name: 'Marshal of the Indian Air Force', xp: 19000, file: 'assets/ranks/airforce-10-marshal-of-the-air-force.svg', honorary: true }
};

function getServiceRankProgress(xpInput, forceInput) {
  const force = ['army', 'navy', 'airforce'].includes(forceInput) ? forceInput : 'army';
  const xp = Math.max(0, Math.floor(Number(xpInput) || 0));
  const ladder = VAANI_SERVICE_RANKS[force];
  const honorary = VAANI_HONORARY_RANKS[force];
  const allRanks = [...ladder, honorary];

  let current = { name: 'Officer Cadet', xp: 0, file: ladder[0].file, index: -1, honorary: false };
  let next = allRanks[0];

  for (let i = 0; i < allRanks.length; i++) {
    if (xp >= allRanks[i].xp) {
      current = { ...allRanks[i], index: i };
      next = allRanks[i + 1] || null;
    } else {
      next = allRanks[i];
      break;
    }
  }

  const prevXp = current.xp || 0;
  const nextXp = next ? next.xp : current.xp;
  const span = Math.max(1, nextXp - prevXp);
  const progressPct = next ? Math.max(0, Math.min(100, Math.round(((xp - prevXp) / span) * 100))) : 100;
  const remainingXP = next ? Math.max(0, next.xp - xp) : 0;

  return {
    force,
    xp,
    current,
    next,
    progressPct,
    remainingXP
  };
}

function getMinimumXPDays(remainingXP, todayAvailableXP = 80, dailyCap = 80) {
  const rem = Math.max(0, Math.ceil(Number(remainingXP) || 0));
  if (rem === 0) return 0;
  const cap = Math.max(1, Math.floor(Number(dailyCap) || 80));
  const avail = Math.max(0, Math.min(cap, Math.floor(Number(todayAvailableXP) || 0)));
  if (avail >= rem) return 1;
  const afterToday = rem - avail;
  return (avail > 0 ? 1 : 0) + Math.ceil(afterToday / cap);
}

function getAccuracyPenalty(pct) {
  const score = Number(pct);
  if (!Number.isFinite(score)) return 0;
  const accuracy = Math.max(0, Math.min(100, score));
  if (accuracy < 33) return 80;
  if (accuracy < 40) return 60;
  if (accuracy < 50) return 45;
  if (accuracy < 60) return 20;
  if (accuracy < 70) return 10;
  return 0;
}

function getTotalMarksPenalty(pct) {
  const score = Number(pct);
  if (!Number.isFinite(score)) return 0;
  const marks = Math.max(0, Math.min(100, score));
  if (marks >= 70) return 5;
  if (marks >= 50) return 8;
  if (marks >= 33) return 12;
  return 15;
}

function arenaCodeChecksum(body) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash % 1296).toString(36).toUpperCase().padStart(2, '0');
}

function validateArenaMatchCode(raw) {
  const code = String(raw || '').trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!code || code.length < 6 || code.length > 64) return null;
  if (code.length === 32 && (code[0] === '2' || code[0] === '3')) {
    if (arenaCodeChecksum(code.slice(0, 30)) !== code.slice(30)) {
      return null;
    }
  }
  return code;
}

/* ============================================================
   3. CONTENT REGISTRY & JSON/JS DATA LOADER (CACHED IN MEMORY)
============================================================= */
let contentRegistryCache = null;

function _pyqQuestionId(exam, q) {
  return (exam && exam !== 'NDA' ? exam + '-' : '') + `${q.y}-${q.s}-${q.n}`;
}

function safeNotificationUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    if ((u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password) {
      return u.toString();
    }
  } catch (_e) {}
  return '';
}

function getContentRegistry() {
  if (contentRegistryCache) return contentRegistryCache;

  const pyqAll = [];
  const pyqById = Object.create(null);
  const pyqPapers = [];
  const vocabAll = [];
  const vocabById = Object.create(null);
  const grammarAll = [];
  const grammarById = Object.create(null);
  let grammarAcademyTopics = [];
  let vocab90Days = [];

  try {
    // 1. Load PYQ Manifest + Taxonomy + All 65 Papers
    const sandbox = { console: { warn() {}, error() {}, log() {} } };
    sandbox.window = sandbox;
    vm.createContext(sandbox);

    const manifestPath = path.join(rootDir, 'data', 'pyq', 'manifest.js');
    const taxonomyPath = path.join(rootDir, 'js', 'vaani-pyq-taxonomy.js');
    if (fs.existsSync(manifestPath)) {
      vm.runInContext(fs.readFileSync(manifestPath, 'utf8'), sandbox, { timeout: 2000 });
    }
    if (fs.existsSync(taxonomyPath)) {
      vm.runInContext(fs.readFileSync(taxonomyPath, 'utf8'), sandbox, { timeout: 2000 });
    }

    const taxonomy = sandbox.VaaniPyqTaxonomy;
    const files = Array.isArray(sandbox.PYQ_PAPER_FILES) ? sandbox.PYQ_PAPER_FILES : [];

    for (const file of files) {
      const filePath = path.join(rootDir, 'data', 'pyq', file + '.js');
      if (!fs.existsSync(filePath)) continue;
      const name = file.replace(/^cds-/, '').replace(/^afcat-/, '');
      const match = name.match(/^(\d{4})-([IVXLC]+)$/);
      if (!match) continue;
      const exam = file.startsWith('cds-') ? 'CDS' : file.startsWith('afcat-') ? 'AFCAT' : 'NDA';
      const variable = 'PYQ_' + (exam === 'CDS' ? 'CDS_' : exam === 'AFCAT' ? 'AFCAT_' : '') + match[1] + '_' + match[2];

      const paperSandbox = { console: { warn() {}, error() {}, log() {} } };
      paperSandbox.window = paperSandbox;
      vm.createContext(paperSandbox);
      const src = fs.readFileSync(filePath, 'utf8');
      vm.runInContext(src + '\n;globalThis.__paperData = ' + variable + ';', paperSandbox, { timeout: 2000 });
      const data = Array.isArray(paperSandbox.__paperData) ? paperSandbox.__paperData : [];
      if (!data.length) continue;

      pyqPapers.push({
        file,
        exam,
        year: Number(match[1]),
        session: match[2],
        count: data.length
      });

      for (const q of data) {
        if (!q || typeof q !== 'object') continue;
        const _id = _pyqQuestionId(exam, q);
        const originalTags = Array.isArray(q.tags) ? q.tags.slice() : [];
        const item = {
          ...q,
          _id,
          _exam: exam,
          _sourceSec: q.sec,
          _sourceTags: originalTags
        };
        if (taxonomy && typeof taxonomy.topic === 'function') {
          item.sec = taxonomy.topic(item);
        }
        if (taxonomy && typeof taxonomy.tags === 'function') {
          item.tags = taxonomy.tags(item);
        } else {
          item.tags = originalTags;
        }
        pyqAll.push(item);
        pyqById[_id] = item;
      }
    }

    // 2. Load Vocabulary Bank (data/vocab.js) & Vocab90 (data/vocab90/course.json)
    const vocabPath = path.join(rootDir, 'data', 'vocab.js');
    if (fs.existsSync(vocabPath)) {
      const vocabSandbox = Object.create(null);
      const rawVocab = vm.runInNewContext(
        fs.readFileSync(vocabPath, 'utf8') + '\nJSON.stringify(VOCAB)',
        vocabSandbox,
        { timeout: 2000 }
      );
      const parsedVocab = JSON.parse(rawVocab);
      if (Array.isArray(parsedVocab)) {
        for (const v of parsedVocab) {
          if (v && v.id) {
            vocabAll.push(v);
            vocabById[v.id] = v;
          }
        }
      }
    }

    const vocab90Path = path.join(rootDir, 'data', 'vocab90', 'course.json');
    if (fs.existsSync(vocab90Path)) {
      const parsedV90 = JSON.parse(fs.readFileSync(vocab90Path, 'utf8'));
      if (Array.isArray(parsedV90)) {
        vocab90Days = parsedV90;
      } else if (parsedV90 && Array.isArray(parsedV90.days)) {
        vocab90Days = parsedV90.days;
      }
    }

    // 3. Load Grammar Topics (data/grammar.js & data/grammar-academy.js)
    const grammarPath = path.join(rootDir, 'data', 'grammar.js');
    if (fs.existsSync(grammarPath)) {
      const gSandbox = Object.create(null);
      const rawGrammar = vm.runInNewContext(
        fs.readFileSync(grammarPath, 'utf8') + '\nJSON.stringify(GRAMMAR)',
        gSandbox,
        { timeout: 2000 }
      );
      const parsedGrammar = JSON.parse(rawGrammar);
      if (Array.isArray(parsedGrammar)) {
        for (const g of parsedGrammar) {
          if (g && g.id) {
            grammarAll.push(g);
            grammarById[g.id] = g;
          }
        }
      }
    }

    const academyPath = path.join(rootDir, 'data', 'grammar-academy.js');
    if (fs.existsSync(academyPath) && fs.existsSync(grammarPath)) {
      const aSandbox = Object.create(null);
      vm.runInNewContext(fs.readFileSync(grammarPath, 'utf8'), aSandbox, { timeout: 2000 });
      const basicsPath = path.join(rootDir, 'data', 'grammar-basics.js');
      if (fs.existsSync(basicsPath)) {
        vm.runInNewContext(fs.readFileSync(basicsPath, 'utf8'), aSandbox, { timeout: 2000 });
      }
      const rawAcademy = vm.runInNewContext(
        fs.readFileSync(academyPath, 'utf8') + '\nJSON.stringify(GRAMMAR_ACADEMY)',
        aSandbox,
        { timeout: 2000 }
      );
      const parsedAcademy = JSON.parse(rawAcademy);
      if (parsedAcademy && Array.isArray(parsedAcademy.topics)) {
        grammarAcademyTopics = parsedAcademy.topics;
      }
    }
  } catch (err) {
    console.error('[VAANI server] Content registry load warning:', err.message);
  }

  const pyqTopics = Array.from(new Set(pyqAll.map(q => q.sec).filter(Boolean))).sort();
  const pyqYears = Array.from(new Set(pyqAll.map(q => String(q.y)))).sort((a, b) => Number(b) - Number(a));

  contentRegistryCache = {
    pyqAll,
    pyqById,
    pyqPapers,
    pyqTopics,
    pyqYears,
    vocabAll,
    vocabById,
    vocab90Days,
    grammarAll,
    grammarById,
    grammarAcademyTopics
  };
  return contentRegistryCache;
}

/* ============================================================
   4. PERSISTENT RUNTIME STORE & ACCOUNT NORMALIZATION
============================================================= */
const SEEDED_CADETS = [
  { code: '901101', name: 'Aarav Rathore', xp: 4920, streak: 28, serviceForce: 'army', topicsCleared: 32, quizAvg: 91, avatar: 'AR', updatedAt: 1790500100000 },
  { code: '901102', name: 'Meera Nair', xp: 4380, streak: 24, serviceForce: 'airforce', topicsCleared: 30, quizAvg: 89, avatar: 'MN', updatedAt: 1790500090000 },
  { code: '901103', name: 'Vikramaditya Sen', xp: 3890, streak: 19, serviceForce: 'navy', topicsCleared: 28, quizAvg: 87, avatar: 'VS', updatedAt: 1790500080000 },
  { code: '901104', name: 'Kabir Shekhawat', xp: 3240, streak: 16, serviceForce: 'army', topicsCleared: 26, quizAvg: 84, avatar: 'KS', updatedAt: 1790500070000 },
  { code: '901105', name: 'Ananya Deshmukh', xp: 2780, streak: 15, serviceForce: 'airforce', topicsCleared: 24, quizAvg: 86, avatar: 'AD', updatedAt: 1790500060000 },
  { code: '901106', name: 'Rohan Chauhan', xp: 2150, streak: 12, serviceForce: 'navy', topicsCleared: 21, quizAvg: 82, avatar: 'RC', updatedAt: 1790500050000 },
  { code: '901107', name: 'Siddharth Joshi', xp: 1640, streak: 9, serviceForce: 'army', topicsCleared: 18, quizAvg: 79, avatar: 'SJ', updatedAt: 1790500040000 },
  { code: '901108', name: 'Tanvi Kulkarni', xp: 1180, streak: 7, serviceForce: 'airforce', topicsCleared: 15, quizAvg: 81, avatar: 'TK', updatedAt: 1790500030000 },
  { code: '901109', name: 'Devansh Tiwari', xp: 760, streak: 5, serviceForce: 'navy', topicsCleared: 11, quizAvg: 76, avatar: 'DT', updatedAt: 1790500020000 },
  { code: '901110', name: 'Pranav Menon', xp: 420, streak: 4, serviceForce: 'army', topicsCleared: 7, quizAvg: 74, avatar: 'PM', updatedAt: 1790500010000 }
];

function createEmptyStore() {
  return {
    version: 2,
    accounts: {},
    cadets: {},
    arenaMatches: {},
    arenaScores: {},
    drillSessions: {}
  };
}

let runtimeStore = createEmptyStore();
let saveTimer = null;

function loadRuntimeStore() {
  try {
    if (fs.existsSync(storeFilePath)) {
      const raw = fs.readFileSync(storeFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        runtimeStore = {
          version: 2,
          accounts: isPlainRecord(parsed.accounts) ? parsed.accounts : {},
          cadets: isPlainRecord(parsed.cadets) ? parsed.cadets : {},
          arenaMatches: isPlainRecord(parsed.arenaMatches) ? parsed.arenaMatches : {},
          arenaScores: isPlainRecord(parsed.arenaScores) ? parsed.arenaScores : {},
          drillSessions: isPlainRecord(parsed.drillSessions) ? parsed.drillSessions : {}
        };
      }
    }
  } catch (err) {
    console.warn('[VAANI server] Could not load runtime store, starting fresh:', err.message);
    runtimeStore = createEmptyStore();
  }
}

function flushSaveStoreSync() {
  try {
    fs.mkdirSync(path.dirname(storeFilePath), { recursive: true });
    const tmpPath = storeFilePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(runtimeStore, null, 2), 'utf8');
    fs.renameSync(tmpPath, storeFilePath);
  } catch (err) {
    console.warn('[VAANI server] Could not persist runtime store:', err.message);
  }
}

function scheduleSaveStore() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushSaveStoreSync();
  }, 120);
}

loadRuntimeStore();

function normalizeVaaniState(input) {
  const src = isPlainRecord(input) ? input : {};
  const out = { ...src };

  out.name = typeof src.name === 'string' && src.name.trim()
    ? sanitizeString(src.name, 40)
    : 'Cadet';
  out.xp = Number.isFinite(Number(src.xp))
    ? Math.max(0, Math.min(250000, Math.floor(Number(src.xp))))
    : 0;
  out.streak = Number.isFinite(Number(src.streak))
    ? Math.max(0, Math.min(3650, Math.floor(Number(src.streak))))
    : 0;
  out.serviceForce = ['army', 'navy', 'airforce'].includes(src.serviceForce) ? src.serviceForce : 'army';
  out.theme = src.theme === 'dark' ? 'dark' : 'light';

  // Completed topics
  out.completedTopics = {};
  if (isPlainRecord(src.completedTopics)) {
    for (const [k, v] of Object.entries(src.completedTopics)) {
      if (v === true && k.length <= 80) out.completedTopics[k] = true;
    }
  }

  // Quiz scores (0..100)
  out.quizScores = {};
  if (isPlainRecord(src.quizScores)) {
    for (const [k, v] of Object.entries(src.quizScores)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 100 && k.length <= 80) {
        out.quizScores[k] = Math.round(n);
      }
    }
  }

  // Reconcile vocabLearned and wordsLearned so mastery state is always consistent
  const learnedSet = new Set();
  if (Array.isArray(src.wordsLearned)) {
    src.wordsLearned.forEach(id => {
      if (typeof id === 'string' && id.trim()) learnedSet.add(id.trim());
    });
  }
  const vocabLearnedMap = {};
  if (isPlainRecord(src.vocabLearned)) {
    for (const [k, v] of Object.entries(src.vocabLearned)) {
      if (v === true && k.trim()) {
        vocabLearnedMap[k.trim()] = true;
        const baseId = k.includes('_') ? k.split('_').pop() : k.trim();
        if (baseId) learnedSet.add(baseId);
      }
    }
  }
  learnedSet.forEach(id => {
    vocabLearnedMap[id] = true;
  });
  out.wordsLearned = Array.from(learnedSet);
  out.vocabLearned = vocabLearnedMap;

  // Idempotency reward maps
  out.pyqXpRewarded = {};
  if (isPlainRecord(src.pyqXpRewarded)) {
    for (const [k, v] of Object.entries(src.pyqXpRewarded)) {
      if (v === true) out.pyqXpRewarded[k] = true;
    }
  }
  out.vocabXpRewarded = {};
  if (isPlainRecord(src.vocabXpRewarded)) {
    for (const [k, v] of Object.entries(src.vocabXpRewarded)) {
      if (v === true) out.vocabXpRewarded[k] = true;
    }
  }
  out.vocab90XpAwarded = {};
  if (isPlainRecord(src.vocab90XpAwarded)) {
    for (const [k, v] of Object.entries(src.vocab90XpAwarded)) {
      if (v === true) out.vocab90XpAwarded[k] = true;
    }
  }

  // PYQ stats — only boolean true/false are stored in attempts; unattempted stays undefined
  const rawPyqStats = isPlainRecord(src.pyqStats) ? src.pyqStats : {};
  const rawAttempts = isPlainRecord(rawPyqStats.attempts) ? rawPyqStats.attempts : {};
  const cleanAttempts = {};
  for (const [qid, status] of Object.entries(rawAttempts)) {
    if (status === true || status === false) {
      cleanAttempts[qid] = status;
      if (status === true) {
        out.pyqXpRewarded[qid] = true;
      }
    }
  }
  const rawHistory = Array.isArray(rawPyqStats.history) ? rawPyqStats.history : [];
  const cleanHistory = [];
  const seenHist = new Set();
  for (const h of rawHistory) {
    if (isPlainRecord(h) && typeof h.qid === 'string' && !seenHist.has(h.qid)) {
      seenHist.add(h.qid);
      cleanHistory.push({
        qid: h.qid,
        correct: Boolean(h.correct),
        ts: Number.isFinite(Number(h.ts)) ? Number(h.ts) : Date.now()
      });
      if (cleanHistory.length >= 40) break;
    }
  }
  out.pyqStats = { attempts: cleanAttempts, history: cleanHistory };

  // Deduplicated bookmarks
  const bmSet = new Set();
  if (Array.isArray(src.bookmarks)) {
    src.bookmarks.forEach(b => {
      if (typeof b === 'string' && b.trim()) bmSet.add(b.trim());
    });
  }
  out.bookmarks = Array.from(bmSet);

  const pyqBmSet = new Set();
  if (Array.isArray(src.pyqBookmarks)) {
    src.pyqBookmarks.forEach(b => {
      if (typeof b === 'string' && b.trim()) pyqBmSet.add(b.trim());
    });
  }
  out.pyqBookmarks = Array.from(pyqBmSet);

  out.bookmarkedTopics = isPlainRecord(src.bookmarkedTopics) ? { ...src.bookmarkedTopics } : {};

  // XP Ledger
  out.xpLedger = Array.isArray(src.xpLedger)
    ? src.xpLedger
        .filter(e => isPlainRecord(e) && (e.type === 'earned' || e.type === 'deducted') && Number(e.amount) > 0)
        .map(e => ({
          type: e.type,
          amount: Math.floor(Number(e.amount)),
          reason: sanitizeString(e.reason || 'Learning activity', 140),
          at: Number(e.at) || Date.now()
        }))
        .slice(0, 50)
    : [];

  // User notifications (achievements, rank-ups, milestones)
  out.userNotifications = Array.isArray(src.userNotifications)
    ? src.userNotifications
        .filter(n => isPlainRecord(n) && typeof n.key === 'string')
        .map(n => ({
          key: sanitizeString(n.key, 80),
          type: sanitizeString(n.type || 'milestone', 40),
          title: sanitizeString(n.title || 'Milestone Reached', 120),
          message: sanitizeString(n.message || '', 300),
          read: Boolean(n.read),
          at: Number(n.at) || Date.now()
        }))
        .slice(0, 50)
    : [];

  return out;
}

function appendUserNotification(vaani, notif) {
  if (!isPlainRecord(vaani) || !isPlainRecord(notif) || !notif.key) return false;
  vaani.userNotifications = Array.isArray(vaani.userNotifications) ? vaani.userNotifications : [];
  if (vaani.userNotifications.some(n => n.key === notif.key)) {
    return false; // Duplicate prevented
  }
  vaani.userNotifications.unshift({
    key: sanitizeString(notif.key, 80),
    type: sanitizeString(notif.type || 'milestone', 40),
    title: sanitizeString(notif.title || 'Milestone Reached', 120),
    message: sanitizeString(notif.message || '', 300),
    read: false,
    at: Date.now()
  });
  if (vaani.userNotifications.length > 50) vaani.userNotifications.length = 50;
  return true;
}

function recordServerXP(vaani, type, amount, reason) {
  const val = Math.floor(Number(amount) || 0);
  if (val <= 0) return 0;
  const prevRank = getServiceRankProgress(vaani.xp, vaani.serviceForce).current.name;
  const dayKey = new Date().toDateString();
  vaani.dailyXpEarned = isPlainRecord(vaani.dailyXpEarned) ? vaani.dailyXpEarned : {};
  vaani.dailyActivity = isPlainRecord(vaani.dailyActivity) ? vaani.dailyActivity : {};
  vaani.xpLedger = Array.isArray(vaani.xpLedger) ? vaani.xpLedger : [];

  if (type === 'earned') {
    vaani.xp = Math.min(250000, Math.max(0, (Number(vaani.xp) || 0) + val));
    vaani.dailyXpEarned[dayKey] = (Number(vaani.dailyXpEarned[dayKey]) || 0) + val;
    vaani.dailyActivity[dayKey] = (Number(vaani.dailyActivity[dayKey]) || 0) + val;
  } else if (type === 'deducted') {
    const before = Math.max(0, Number(vaani.xp) || 0);
    const deducted = Math.min(before, val);
    vaani.xp = before - deducted;
    if (!deducted) return 0;
  }

  vaani.xpLedger.unshift({
    type: type === 'deducted' ? 'deducted' : 'earned',
    amount: val,
    reason: sanitizeString(reason || 'Learning activity', 140),
    at: Date.now()
  });
  if (vaani.xpLedger.length > 50) vaani.xpLedger.length = 50;

  const nextRank = getServiceRankProgress(vaani.xp, vaani.serviceForce).current.name;
  if (type === 'earned' && nextRank !== prevRank) {
    appendUserNotification(vaani, {
      key: 'rank_up_' + vaani.serviceForce + '_' + nextRank,
      type: 'rank-up',
      title: 'Promoted to ' + nextRank,
      message: 'Officer Vaani commends your promotion to ' + nextRank + ' (' + vaani.xp + ' XP).'
    });
  }
  return val;
}

function applyDailyStreakOnLogin(vaani, nowDate = new Date()) {
  const today = nowDate.toDateString();
  if (vaani.lastActive !== today) {
    let dayGap = null;
    if (typeof vaani.lastActive === 'string' && vaani.lastActive) {
      const prev = new Date(vaani.lastActive);
      if (Number.isFinite(prev.getTime())) {
        const ordinal = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
        dayGap = ordinal(nowDate) - ordinal(prev);
      }
    }
    if (dayGap === 1) {
      vaani.streak = Math.max(0, Number(vaani.streak) || 0) + 1;
    } else {
      vaani.streak = 1;
      if (dayGap !== null && dayGap > 1) {
        const missedDays = dayGap - 1;
        const penalty = Math.min(75, missedDays * 15);
        recordServerXP(vaani, 'deducted', penalty, `${missedDays} missed login day${missedDays === 1 ? '' : 's'}; streak reset`);
      }
    }
    vaani.lastActive = today;
  } else if (!vaani.streak) {
    vaani.streak = 1;
  }

  if (vaani.streak >= 3 && vaani.lastStreakRewardDate !== today) {
    vaani.lastStreakRewardDate = today;
    recordServerXP(vaani, 'earned', VAANI_STREAK_DAILY_XP, `${vaani.streak}-day streak reward`);
    appendUserNotification(vaani, {
      key: 'streak_' + today + '_' + vaani.streak,
      type: 'streak',
      title: `${vaani.streak}-Day Training Streak`,
      message: `Consistency bonus of +${VAANI_STREAK_DAILY_XP} XP credited to your service record.`
    });
  }

  vaani.personalBests = isPlainRecord(vaani.personalBests) ? vaani.personalBests : {};
  vaani.personalBests.longestStreak = Math.max(Number(vaani.personalBests.longestStreak) || 0, vaani.streak);
}

function mergeAccountVaaniState(existingVaani, incomingVaani) {
  const rawInc = isPlainRecord(incomingVaani) ? incomingVaani : {};
  const base = normalizeVaaniState(existingVaani);
  const inc = normalizeVaaniState(rawInc);
  const merged = { ...base, ...rawInc };

  merged.name = typeof rawInc.name === 'string' && rawInc.name.trim() ? inc.name : base.name;
  merged.xp = rawInc.xp !== undefined ? inc.xp : base.xp;
  merged.streak = rawInc.streak !== undefined ? inc.streak : base.streak;
  merged.serviceForce = rawInc.serviceForce !== undefined ? inc.serviceForce : base.serviceForce;
  merged.theme = rawInc.theme !== undefined ? inc.theme : base.theme;

  merged.completedTopics = { ...base.completedTopics, ...inc.completedTopics };
  merged.quizScores = { ...base.quizScores, ...inc.quizScores };
  merged.pyqXpRewarded = { ...base.pyqXpRewarded, ...inc.pyqXpRewarded };
  merged.vocabXpRewarded = { ...base.vocabXpRewarded, ...inc.vocabXpRewarded };
  merged.vocab90XpAwarded = { ...base.vocab90XpAwarded, ...inc.vocab90XpAwarded };
  merged.bookmarkedTopics = { ...base.bookmarkedTopics, ...inc.bookmarkedTopics };
  merged.vocabLearned = { ...base.vocabLearned, ...inc.vocabLearned };
  merged.wordsLearned = Array.from(new Set([...(base.wordsLearned || []), ...(inc.wordsLearned || [])]));
  merged.bookmarks = Array.from(new Set([...(base.bookmarks || []), ...(inc.bookmarks || [])]));
  merged.pyqBookmarks = Array.from(new Set([...(base.pyqBookmarks || []), ...(inc.pyqBookmarks || [])]));

  // Merge XP Ledger entries
  const ledgerSeen = new Set();
  const mergedLedger = [];
  for (const item of [...(inc.xpLedger || []), ...(base.xpLedger || [])]) {
    if (!item) continue;
    const key = `${item.type}:${item.amount}:${item.reason}:${item.at}`;
    if (!ledgerSeen.has(key)) {
      ledgerSeen.add(key);
      mergedLedger.push(item);
      if (mergedLedger.length >= 50) break;
    }
  }
  merged.xpLedger = mergedLedger;

  // Merge PYQ attempts & history
  const attempts = { ...(base.pyqStats?.attempts || {}), ...(inc.pyqStats?.attempts || {}) };
  const histMap = new Map();
  [...(inc.pyqStats?.history || []), ...(base.pyqStats?.history || [])].forEach(h => {
    if (h && h.qid && !histMap.has(h.qid)) histMap.set(h.qid, h);
  });
  merged.pyqStats = {
    attempts,
    history: Array.from(histMap.values()).slice(0, 40)
  };

  // Merge notifications
  const notifMap = new Map();
  [...(inc.userNotifications || []), ...(base.userNotifications || [])].forEach(n => {
    if (n && n.key) {
      const prev = notifMap.get(n.key);
      notifMap.set(n.key, prev ? { ...n, read: Boolean(prev.read || n.read) } : n);
    }
  });
  merged.userNotifications = Array.from(notifMap.values()).slice(0, 50);

  return normalizeVaaniState(merged);
}

function extractCadetSummary(code, vaaniInput) {
  if (!isPlainRecord(vaaniInput)) return null;
  const vaani = normalizeVaaniState(vaaniInput);
  const name = vaani.name || 'Cadet';
  const xp = vaani.xp;
  const streak = vaani.streak;
  const serviceForce = vaani.serviceForce || 'army';
  const completedTopics = Math.min(60, Object.keys(vaani.completedTopics).filter(k => vaani.completedTopics[k] === true).length);

  const quizScores = Object.values(vaani.quizScores).map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 100);
  const pyqAttempts = Object.values(vaani.pyqStats?.attempts || {});
  let quizAvg = 0;
  if (quizScores.length) {
    quizAvg = Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length);
  } else if (pyqAttempts.length) {
    const correctCount = pyqAttempts.filter(v => v === true).length;
    quizAvg = Math.round((correctCount / pyqAttempts.length) * 100);
  }

  const rankProgress = getServiceRankProgress(xp, serviceForce);

  return {
    code,
    name,
    xp,
    streak,
    serviceForce,
    rankTitle: rankProgress.current.name,
    topicsCleared: completedTopics,
    quizAvg,
    avatar: computeInitials(name),
    updatedAt: Date.now()
  };
}

function ensureAccountEntry(code) {
  if (!runtimeStore.accounts[code]) {
    const vaani = normalizeVaaniState({});
    runtimeStore.accounts[code] = {
      record: { vaani, vbv: {} },
      updatedAt: Date.now()
    };
    runtimeStore.cadets[code] = extractCadetSummary(code, vaani);
  }
  return runtimeStore.accounts[code];
}

/* ============================================================
   5. HEALTH, READINESS, LIVENESS & OBSERVABILITY ENDPOINTS
============================================================= */
function getHealthReport() {
  const reg = getContentRegistry();
  const envReport = validateEnvironmentConfig();
  let storeDirWritable = false;
  try {
    const dir = path.dirname(storeFilePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    storeDirWritable = true;
  } catch (_e) {
    storeDirWritable = false;
  }

  const contentHealthy =
    reg.pyqPapers.length >= 60 &&
    reg.pyqAll.length >= 5000 &&
    reg.vocabAll.length >= 40 &&
    reg.vocab90Days.length === 90 &&
    reg.grammarAll.length >= 30 &&
    reg.grammarAcademyTopics.length >= 35;

  const mem = process.memoryUsage();
  const heapUsedMb = Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100;
  const rssMb = Math.round((mem.rss / (1024 * 1024)) * 100) / 100;

  const healthy = Boolean(contentHealthy && storeDirWritable && envReport.ok);

  return {
    ok: healthy,
    status: healthy ? 'healthy' : 'degraded',
    service: 'vaani-web',
    environment: NODE_ENV,
    uptimeSeconds: Math.floor((Date.now() - serverMetrics.startedAt) / 1000),
    checks: {
      contentRegistry: contentHealthy ? 'ok' : 'failed',
      runtimeStoreStorage: storeDirWritable ? 'ok' : 'failed',
      environmentConfig: envReport.ok ? 'ok' : 'failed'
    },
    contentStats: {
      pyqPapers: reg.pyqPapers.length,
      pyqQuestions: reg.pyqAll.length,
      pyqTopics: reg.pyqTopics.length,
      vocabWords: reg.vocabAll.length,
      vocab90Days: reg.vocab90Days.length,
      grammarTopics: reg.grammarAll.length,
      grammarAcademyLessons: reg.grammarAcademyTopics.length
    },
    memory: {
      heapUsedMb,
      rssMb
    },
    timestamp: Date.now()
  };
}

app.get(['/health', '/api/health', '/api/health/ready'], (_req, res) => {
  const report = getHealthReport();
  res.status(report.ok ? 200 : 503).json(report);
});

app.get('/api/health/live', (_req, res) => {
  res.json({
    ok: true,
    status: 'alive',
    service: 'vaani-dynamic-api',
    uptimeSeconds: Math.floor((Date.now() - serverMetrics.startedAt) / 1000),
    timestamp: Date.now()
  });
});

app.get('/api/metrics', (_req, res) => {
  const avgLatencyMs = serverMetrics.totalRequests > 0
    ? Math.round((serverMetrics.totalLatencyMs / serverMetrics.totalRequests) * 100) / 100
    : 0;
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    service: 'vaani-dynamic-api',
    environment: NODE_ENV,
    uptimeSeconds: Math.floor((Date.now() - serverMetrics.startedAt) / 1000),
    requests: {
      total: serverMetrics.totalRequests,
      api: serverMetrics.apiRequests,
      errors4xx: serverMetrics.apiErrors4xx,
      errors5xx: serverMetrics.apiErrors5xx,
      rateLimitHits: serverMetrics.rateLimitHits,
      avgLatencyMs,
      maxLatencyMs: serverMetrics.maxLatencyMs,
      lastErrorAt: serverMetrics.lastErrorAt,
      lastErrorCode: serverMetrics.lastErrorCode
    },
    store: {
      accountsCount: Object.keys(runtimeStore.accounts).length,
      liveCadetsCount: Object.keys(runtimeStore.cadets).length,
      arenaMatchesCount: Object.keys(runtimeStore.arenaMatches).length,
      drillSessionsCount: Object.keys(runtimeStore.drillSessions).length
    },
    memory: {
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100
    },
    timestamp: Date.now()
  });
});

app.get('/api/status', (_req, res) => {
  const report = getHealthReport();
  res.json({
    ok: report.ok,
    service: 'vaani-dynamic-api',
    environment: NODE_ENV,
    accountsCount: Object.keys(runtimeStore.accounts).length,
    liveCadetsCount: Object.keys(runtimeStore.cadets).length,
    arenaMatchesCount: Object.keys(runtimeStore.arenaMatches).length,
    contentStats: report.contentStats,
    checks: report.checks,
    timestamp: Date.now()
  });
});

/* ============================================================
   6. USER ACCOUNTS, AUTHENTICATION & PROGRESS ENDPOINTS
============================================================= */
// Allocate or Register a 6-digit Cadet Account — POST /api/accounts/register
app.post('/api/accounts/register', (req, res) => {
  const body = isPlainRecord(req.body) ? req.body : {};
  let code = sanitizeCode(body.code);
  if (code && runtimeStore.accounts[code]) {
    return res.status(409).json({ ok: false, error: 'Account code is already registered.' });
  }
  if (!code) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const candidate = String(100000 + crypto.randomInt(900000));
      if (!runtimeStore.accounts[candidate] && !SEEDED_CADETS.some(s => s.code === candidate)) {
        code = candidate;
        break;
      }
    }
  }
  if (!code) {
    return res.status(503).json({ ok: false, error: 'Unable to allocate account code.' });
  }

  const initialVaani = normalizeVaaniState({
    name: body.name || 'Cadet',
    serviceForce: body.serviceForce || 'army',
    streak: 1,
    lastActive: new Date().toDateString()
  });
  appendUserNotification(initialVaani, {
    key: 'welcome_commission',
    type: 'welcome',
    title: 'Commissioned into VAANI Command Centre',
    message: 'Welcome, ' + initialVaani.name + '. Your 6-digit access code is active.'
  });

  const updatedAt = Date.now();
  runtimeStore.accounts[code] = {
    record: { vaani: initialVaani, vbv: isPlainRecord(body.vbv) ? body.vbv : {} },
    updatedAt
  };
  const summary = extractCadetSummary(code, initialVaani);
  runtimeStore.cadets[code] = summary;
  scheduleSaveStore();

  return res.status(201).json({
    ok: true,
    code,
    record: runtimeStore.accounts[code].record,
    summary,
    rank: getServiceRankProgress(initialVaani.xp, initialVaani.serviceForce),
    updatedAt
  });
});

// Login & Apply Daily Streak Rules — POST /api/accounts/login
app.post('/api/accounts/login', (req, res) => {
  const body = isPlainRecord(req.body) ? req.body : {};
  const code = sanitizeCode(body.code);
  if (!code) {
    return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });
  }
  const entry = runtimeStore.accounts[code];
  if (!entry || !isPlainRecord(entry.record)) {
    return res.status(404).json({ ok: false, error: 'No account found with that code.' });
  }
  const vaani = normalizeVaaniState(entry.record.vaani);
  applyDailyStreakOnLogin(vaani, new Date());
  entry.record.vaani = vaani;
  entry.updatedAt = Date.now();
  const summary = extractCadetSummary(code, vaani);
  runtimeStore.cadets[code] = summary;
  scheduleSaveStore();

  return res.json({
    ok: true,
    code,
    record: entry.record,
    summary,
    rank: getServiceRankProgress(vaani.xp, vaani.serviceForce),
    updatedAt: entry.updatedAt
  });
});

// Account Sync — GET /api/accounts/:code
app.get('/api/accounts/:code', (req, res) => {
  const code = sanitizeCode(req.params.code);
  if (!code) {
    return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });
  }
  const entry = runtimeStore.accounts[code];
  if (!entry || !isPlainRecord(entry.record)) {
    return res.status(404).json({ ok: false, error: 'Account not found on server.' });
  }
  const vaani = normalizeVaaniState(entry.record.vaani);
  entry.record.vaani = vaani;
  return res.json({
    ok: true,
    code,
    record: entry.record,
    summary: extractCadetSummary(code, vaani),
    rank: getServiceRankProgress(vaani.xp, vaani.serviceForce),
    updatedAt: entry.updatedAt || Date.now()
  });
});

// Account Sync — PUT /api/accounts/:code
app.put('/api/accounts/:code', (req, res) => {
  const code = sanitizeCode(req.params.code);
  if (!code) {
    return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });
  }
  const body = req.body;
  const record = isPlainRecord(body && body.record)
    ? body.record
    : (isPlainRecord(body) && (isPlainRecord(body.vaani) || isPlainRecord(body.vbv)) ? body : null);
  if (!record || (!isPlainRecord(record.vaani) && !isPlainRecord(record.vbv))) {
    return res.status(400).json({ ok: false, error: 'Account payload must contain vaani or vbv state.' });
  }

  const existing = runtimeStore.accounts[code];
  const shouldMerge = Boolean(body && body.merge === true);
  const nextVaani = existing && shouldMerge
    ? mergeAccountVaaniState(existing.record?.vaani, record.vaani)
    : normalizeVaaniState(record.vaani);
  const nextVbv = isPlainRecord(record.vbv)
    ? (existing && shouldMerge && isPlainRecord(existing.record?.vbv) ? { ...existing.record.vbv, ...record.vbv } : record.vbv)
    : (existing && isPlainRecord(existing.record?.vbv) ? existing.record.vbv : {});

  const updatedAt = Date.now();
  runtimeStore.accounts[code] = {
    record: {
      vaani: nextVaani,
      vbv: nextVbv
    },
    updatedAt
  };
  const summary = extractCadetSummary(code, nextVaani);
  if (summary) {
    runtimeStore.cadets[code] = summary;
  }
  scheduleSaveStore();
  return res.json({
    ok: true,
    code,
    record: runtimeStore.accounts[code].record,
    updatedAt,
    summary,
    rank: getServiceRankProgress(nextVaani.xp, nextVaani.serviceForce)
  });
});

// Grammar Academy Topics — GET /api/grammar/topics
app.get('/api/grammar/topics', (req, res) => {
  const reg = getContentRegistry();
  const code = sanitizeCode(req.query.code);
  const vaani = code && runtimeStore.accounts[code]?.record?.vaani
    ? normalizeVaaniState(runtimeStore.accounts[code].record.vaani)
    : null;
  const completedMap = vaani?.completedTopics || {};
  const scoresMap = vaani?.quizScores || {};

  const topics = reg.grammarAll.map(t => ({
    id: t.id,
    title: t.title || t.name || t.id,
    tier: t.tier || null,
    completed: Boolean(completedMap[t.id]),
    quizScore: Number.isFinite(Number(scoresMap[t.id])) ? Number(scoresMap[t.id]) : null
  }));

  return res.json({
    ok: true,
    total: topics.length,
    academyLessonsCount: reg.grammarAcademyTopics.length,
    topics
  });
});

// User Notifications — GET /api/accounts/:code/notifications
app.get('/api/accounts/:code/notifications', (req, res) => {
  const code = sanitizeCode(req.params.code);
  if (!code) return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });
  const entry = runtimeStore.accounts[code];
  if (!entry || !isPlainRecord(entry.record)) {
    return res.status(404).json({ ok: false, error: 'Account not found.' });
  }
  const vaani = normalizeVaaniState(entry.record.vaani);
  const items = vaani.userNotifications || [];
  const unreadCount = items.filter(n => !n.read).length;
  return res.json({ ok: true, code, unreadCount, items });
});

// Mark User Notifications Read — POST /api/accounts/:code/notifications/read
app.post('/api/accounts/:code/notifications/read', (req, res) => {
  const code = sanitizeCode(req.params.code);
  if (!code) return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });
  const entry = runtimeStore.accounts[code];
  if (!entry || !isPlainRecord(entry.record)) {
    return res.status(404).json({ ok: false, error: 'Account not found.' });
  }
  const vaani = normalizeVaaniState(entry.record.vaani);
  const key = req.body && typeof req.body.key === 'string' ? req.body.key.trim() : '';
  vaani.userNotifications.forEach(n => {
    if (!key || n.key === key) n.read = true;
  });
  entry.record.vaani = vaani;
  entry.updatedAt = Date.now();
  scheduleSaveStore();
  const unreadCount = vaani.userNotifications.filter(n => !n.read).length;
  return res.json({ ok: true, code, unreadCount, items: vaani.userNotifications });
});

/* ============================================================
   7. PYQ SYSTEM — BACKEND INTELLIGENCE (FILTER, SOLVE, DRILL)
============================================================= */
function filterPyqDataset(params, accountVaani) {
  const reg = getContentRegistry();
  const exam = String(params.exam || 'ALL').trim().toUpperCase();
  const year = String(params.year || 'ALL').trim();
  const topic = String(params.topic || 'ALL').trim();
  const status = String(params.status || 'ALL').trim().toUpperCase();
  const query = String(params.q || params.query || '').trim().toLowerCase();

  const attempts = isPlainRecord(accountVaani?.pyqStats?.attempts) ? accountVaani.pyqStats.attempts : {};
  const bms = new Set([
    ...(Array.isArray(accountVaani?.bookmarks) ? accountVaani.bookmarks : []),
    ...(Array.isArray(accountVaani?.pyqBookmarks) ? accountVaani.pyqBookmarks : [])
  ]);

  const base = reg.pyqAll.filter(q => {
    if (exam !== 'ALL' && q._exam !== exam) return false;
    if (year !== 'ALL' && String(q.y) !== year) return false;
    if (topic !== 'ALL' && q.sec !== topic) return false;
    if (query) {
      const hay = `${q.q} ${q.passage || ''} ${(q.o || []).join(' ')} ${q.sec || ''} ${q.y} ${q._exam}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  let countCorrect = 0;
  let countIncorrect = 0;
  let countBookmarked = 0;
  let countUnattempted = 0;

  base.forEach(q => {
    const att = attempts[q._id];
    if (att === true) countCorrect++;
    else if (att === false) countIncorrect++;
    else countUnattempted++;
    if (bms.has('pyq:' + q._id) || bms.has(q._id)) countBookmarked++;
  });

  const filtered = base.filter(q => {
    const att = attempts[q._id];
    const isBm = bms.has('pyq:' + q._id) || bms.has(q._id);
    if (status === 'SOLVED' || status === 'CORRECT') return att === true;
    // CRITICAL: Never classify an unanswered question (att === undefined) as incorrect!
    if (status === 'MISTAKES' || status === 'INCORRECT') return att === false;
    if (status === 'BOOKMARKED') return isBm;
    if (status === 'UNATTEMPTED') return att === undefined;
    return true;
  });

  return {
    baseCount: base.length,
    counts: {
      all: base.length,
      correct: countCorrect,
      incorrect: countIncorrect,
      bookmarked: countBookmarked,
      unattempted: countUnattempted
    },
    filtered,
    attempts,
    bms
  };
}

// GET /api/pyq/questions — Filter, Search & Paginate PYQs
app.get('/api/pyq/questions', (req, res) => {
  const code = sanitizeCode(req.query.code);
  const accountVaani = code && runtimeStore.accounts[code]?.record?.vaani
    ? normalizeVaaniState(runtimeStore.accounts[code].record.vaani)
    : null;

  const { counts, filtered, attempts, bms } = filterPyqDataset(req.query, accountVaani);

  const pageSize = Math.max(1, Math.min(100, Math.floor(Number(req.query.pageSize || req.query.limit) || 10)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.max(1, Math.min(totalPages, Math.floor(Number(req.query.page) || 1)));
  const sliceStart = (page - 1) * pageSize;
  const includeAnswers = req.query.includeAnswers === 'true';

  const items = filtered.slice(sliceStart, sliceStart + pageSize).map(q => {
    const att = attempts[q._id];
    const isBm = bms.has('pyq:' + q._id) || bms.has(q._id);
    const out = {
      _id: q._id,
      _exam: q._exam,
      y: q.y,
      s: q.s,
      n: q.n,
      sec: q.sec,
      q: q.q,
      o: q.o,
      passage: q.passage || null,
      parts: q.parts || null,
      lessonId: q.lessonId || null,
      userStatus: att === true ? 'correct' : att === false ? 'incorrect' : 'unattempted',
      bookmarked: isBm
    };
    if (includeAnswers || att !== undefined) {
      out.ans = q.ans;
      out.exp = q.exp || '';
    }
    return out;
  });

  return res.json({
    ok: true,
    page,
    pageSize,
    totalPages,
    totalMatching: filtered.length,
    counts,
    items
  });
});

// POST /api/pyq/solve — Server-Verified Inline PYQ Answer Submission & Anti-Duplicate XP
app.post('/api/pyq/solve', (req, res) => {
  const body = isPlainRecord(req.body) ? req.body : {};
  const qid = String(body.qid || '').trim();
  const selectedOption = Number(body.selectedOption ?? body.optionIndex);
  const code = sanitizeCode(body.code);

  const reg = getContentRegistry();
  const q = reg.pyqById[qid];
  if (!q) {
    return res.status(404).json({ ok: false, error: 'Question not found in verified PYQ bank.' });
  }
  if (!Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption >= (q.o || []).length) {
    return res.status(400).json({ ok: false, error: 'Invalid option index.' });
  }

  const correct = selectedOption === q.ans;
  let xpAwarded = 0;
  let alreadyRewarded = false;
  let totalXp = 0;
  let rank = null;

  if (code) {
    const entry = ensureAccountEntry(code);
    const vaani = normalizeVaaniState(entry.record.vaani);
    const prevSolved = vaani.pyqStats.attempts[qid] === true || Boolean(vaani.pyqXpRewarded[qid]);

    vaani.pyqStats.attempts[qid] = correct;
    vaani.pyqStats.history = vaani.pyqStats.history.filter(h => h.qid !== qid);
    vaani.pyqStats.history.unshift({ qid, correct, ts: Date.now() });
    if (vaani.pyqStats.history.length > 40) vaani.pyqStats.history.length = 40;

    if (correct) {
      if (!prevSolved) {
        vaani.pyqXpRewarded[qid] = true;
        xpAwarded = recordServerXP(vaani, 'earned', VAANI_CORRECT_ANSWER_XP, `PYQ solved: ${q.sec || 'English'}`);
      } else {
        alreadyRewarded = true;
      }
    }

    entry.record.vaani = vaani;
    entry.updatedAt = Date.now();
    runtimeStore.cadets[code] = extractCadetSummary(code, vaani);
    totalXp = vaani.xp;
    rank = getServiceRankProgress(vaani.xp, vaani.serviceForce);
    scheduleSaveStore();
  }

  return res.json({
    ok: true,
    qid,
    correct,
    selectedOption,
    correctAnswer: q.ans,
    explanation: q.exp || '',
    topic: q.sec,
    exam: q._exam,
    year: q.y,
    session: q.s,
    xpAwarded,
    alreadyRewarded,
    totalXp,
    rank
  });
});

// POST /api/pyq/bookmark — Toggle PYQ Bookmark on User Account
app.post('/api/pyq/bookmark', (req, res) => {
  const body = isPlainRecord(req.body) ? req.body : {};
  const code = sanitizeCode(body.code);
  const rawQid = String(body.qid || '').trim().replace(/^pyq:/, '');
  if (!code) return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });
  const reg = getContentRegistry();
  if (!rawQid || !reg.pyqById[rawQid]) {
    return res.status(404).json({ ok: false, error: 'Question not found.' });
  }

  const entry = ensureAccountEntry(code);
  const vaani = normalizeVaaniState(entry.record.vaani);
  const bmKey = 'pyq:' + rawQid;
  const hasBm = vaani.bookmarks.includes(bmKey) || vaani.pyqBookmarks.includes(rawQid);

  if (hasBm) {
    vaani.bookmarks = vaani.bookmarks.filter(b => b !== bmKey && b !== rawQid);
    vaani.pyqBookmarks = vaani.pyqBookmarks.filter(b => b !== rawQid && b !== bmKey);
  } else {
    if (!vaani.bookmarks.includes(bmKey)) vaani.bookmarks.push(bmKey);
    if (!vaani.pyqBookmarks.includes(rawQid)) vaani.pyqBookmarks.push(rawQid);
  }

  entry.record.vaani = vaani;
  entry.updatedAt = Date.now();
  scheduleSaveStore();

  return res.json({
    ok: true,
    code,
    qid: rawQid,
    bookmarked: !hasBm,
    totalPyqBookmarks: vaani.pyqBookmarks.length
  });
});

// POST /api/pyq/drill — Create Filtered PYQ Drill Session
app.post('/api/pyq/drill', (req, res) => {
  const body = isPlainRecord(req.body) ? req.body : {};
  const code = sanitizeCode(body.code);
  const accountVaani = code && runtimeStore.accounts[code]?.record?.vaani
    ? normalizeVaaniState(runtimeStore.accounts[code].record.vaani)
    : null;

  const { filtered } = filterPyqDataset(body, accountVaani);
  const count = Math.max(1, Math.min(100, Math.floor(Number(body.count) || 30)));
  const order = String(body.order || 'deterministic').toLowerCase();

  // Deduplicate by _id and apply deterministic or seeded ordering
  const seen = new Set();
  const deduped = [];
  for (const q of filtered) {
    if (!seen.has(q._id)) {
      seen.add(q._id);
      deduped.push(q);
    }
  }

  if (order === 'canonical') {
    deduped.sort((a, b) => String(a._id).localeCompare(String(b._id)));
  }

  const selected = deduped.slice(0, count);
  const sessionId = 'drill_' + crypto.randomBytes(8).toString('hex');
  const durationSeconds = Math.max(60, Math.min(10800, Math.floor(Number(body.durationSeconds) || selected.length * 45)));
  const now = Date.now();
  const expiresAt = Number(body.expiresAt) || (now + durationSeconds * 1000 + 3600000);

  runtimeStore.drillSessions[sessionId] = {
    sessionId,
    code: code || null,
    filters: {
      exam: body.exam || 'ALL',
      year: body.year || 'ALL',
      topic: body.topic || 'ALL',
      status: body.status || 'ALL',
      q: body.q || ''
    },
    questionIds: selected.map(q => q._id),
    createdAt: now,
    expiresAt,
    submittedAt: null,
    result: null
  };
  scheduleSaveStore();

  return res.status(201).json({
    ok: true,
    sessionId,
    totalMatching: deduped.length,
    count: selected.length,
    expiresAt,
    questions: selected.map(q => ({
      _id: q._id,
      _exam: q._exam,
      y: q.y,
      s: q.s,
      n: q.n,
      sec: q.sec,
      q: q.q,
      o: q.o,
      passage: q.passage || null,
      parts: q.parts || null
    }))
  });
});

// POST /api/pyq/drill/:sessionId/submit — Score & Persist Filtered Drill
app.post('/api/pyq/drill/:sessionId/submit', (req, res) => {
  const sessionId = String(req.params.sessionId || '').trim();
  const session = runtimeStore.drillSessions[sessionId];
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Drill session not found.' });
  }
  if (session.submittedAt && session.result) {
    return res.json({ ok: true, duplicate: true, ...session.result });
  }
  const now = Date.now();
  if (session.expiresAt && now > session.expiresAt) {
    return res.status(410).json({ ok: false, expired: true, error: 'Drill session has expired.' });
  }

  const body = isPlainRecord(req.body) ? req.body : {};
  const answers = isPlainRecord(body.answers) ? body.answers : {};
  const code = sanitizeCode(body.code || session.code);
  const reg = getContentRegistry();

  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  let xpEarned = 0;
  const breakdown = [];

  const entry = code ? ensureAccountEntry(code) : null;
  const vaani = entry ? normalizeVaaniState(entry.record.vaani) : null;

  for (const qid of session.questionIds) {
    const q = reg.pyqById[qid];
    if (!q) continue;
    const rawChoice = answers[qid];
    if (rawChoice === undefined || rawChoice === null || rawChoice === '') {
      skipped++;
      breakdown.push({ qid, status: 'skipped', correctAnswer: q.ans, explanation: q.exp || '' });
      continue;
    }
    const chosen = Number(rawChoice);
    const isRight = Number.isInteger(chosen) && chosen === q.ans;
    if (isRight) {
      correct++;
      if (vaani) {
        const alreadyRewarded = vaani.pyqStats.attempts[qid] === true || Boolean(vaani.pyqXpRewarded[qid]);
        vaani.pyqStats.attempts[qid] = true;
        if (!alreadyRewarded) {
          vaani.pyqXpRewarded[qid] = true;
          xpEarned += recordServerXP(vaani, 'earned', VAANI_CORRECT_ANSWER_XP, `Drill PYQ solved: ${q.sec}`);
        }
      }
    } else {
      incorrect++;
      if (vaani) {
        vaani.pyqStats.attempts[qid] = false;
      }
    }
    breakdown.push({
      qid,
      status: isRight ? 'correct' : 'incorrect',
      selectedOption: chosen,
      correctAnswer: q.ans,
      explanation: q.exp || ''
    });
  }

  const total = session.questionIds.length;
  const attempted = correct + incorrect;
  const accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;

  if (vaani && entry) {
    vaani.personalBests = isPlainRecord(vaani.personalBests) ? vaani.personalBests : {};
    vaani.personalBests.totalQuizzesTaken = (Number(vaani.personalBests.totalQuizzesTaken) || 0) + 1;
    vaani.personalBests.highestQuizScore = Math.max(Number(vaani.personalBests.highestQuizScore) || 0, scorePct);
    appendUserNotification(vaani, {
      key: 'drill_done_' + sessionId,
      type: 'test-complete',
      title: `Completed Filtered Drill (${accuracyPct}% accuracy)`,
      message: `Cleared ${correct}/${total} PYQs (+${xpEarned} XP).`
    });
    entry.record.vaani = vaani;
    entry.updatedAt = now;
    runtimeStore.cadets[code] = extractCadetSummary(code, vaani);
  }

  const result = {
    sessionId,
    total,
    attempted,
    correct,
    incorrect,
    skipped,
    accuracyPct,
    scorePct,
    xpEarned,
    breakdown
  };
  session.submittedAt = now;
  session.result = result;
  scheduleSaveStore();

  return res.json({ ok: true, duplicate: false, ...result });
});

/* ============================================================
   8. VOCABULARY MASTERY SYSTEM — BACKEND INTELLIGENCE
============================================================= */
// GET /api/vocab/words — Filter & Search Vocabulary with User Mastery State
app.get('/api/vocab/words', (req, res) => {
  const reg = getContentRegistry();
  const code = sanitizeCode(req.query.code);
  const accountVaani = code && runtimeStore.accounts[code]?.record?.vaani
    ? normalizeVaaniState(runtimeStore.accounts[code].record.vaani)
    : null;

  const learnedSet = new Set(accountVaani?.wordsLearned || []);
  const bmSet = new Set(accountVaani?.bookmarks || []);

  const statusFilter = String(req.query.status || 'all').trim().toLowerCase();
  const posFilter = String(req.query.pos || 'all').trim().toLowerCase();
  const catFilter = String(req.query.cat || 'all').trim().toLowerCase();
  const query = String(req.query.q || '').trim().toLowerCase();

  let masteredCount = 0;
  let bookmarkedCount = 0;
  reg.vocabAll.forEach(w => {
    if (learnedSet.has(w.id)) masteredCount++;
    if (bmSet.has(w.id) || bmSet.has('vocab:' + w.id)) bookmarkedCount++;
  });
  const total = reg.vocabAll.length;
  const unmasteredCount = Math.max(0, total - masteredCount);

  const items = reg.vocabAll
    .filter(w => {
      const isMastered = learnedSet.has(w.id);
      const isBm = bmSet.has(w.id) || bmSet.has('vocab:' + w.id);
      if ((statusFilter === 'learned' || statusFilter === 'mastered') && !isMastered) return false;
      if ((statusFilter === 'unlearned' || statusFilter === 'unmastered') && isMastered) return false;
      if (statusFilter === 'bookmarked' && !isBm) return false;
      if (posFilter !== 'all' && String(w.pos || '').toLowerCase() !== posFilter) return false;
      if (catFilter !== 'all' && !(Array.isArray(w.cat) && w.cat.map(c => c.toLowerCase()).includes(catFilter))) return false;
      if (query) {
        const hay = `${w.w} ${w.meanEn} ${w.meanHi || ''} ${(w.syn || []).join(' ')} ${(w.ant || []).join(' ')}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    })
    .map(w => ({
      id: w.id,
      w: w.w,
      pos: w.pos,
      cat: w.cat,
      diff: w.diff,
      imp: w.imp,
      meanEn: w.meanEn,
      meanHi: w.meanHi,
      easy: w.easy,
      syn: w.syn || [],
      ant: w.ant || [],
      exNDA: w.exNDA || w.exEasy || '',
      mastered: learnedSet.has(w.id),
      bookmarked: bmSet.has(w.id) || bmSet.has('vocab:' + w.id)
    }));

  return res.json({
    ok: true,
    counts: {
      total,
      masteredCount,
      unmasteredCount,
      bookmarkedCount
    },
    items
  });
});

// POST /api/vocab/mastery — Update User-Specific Word Mastery & Award +10 XP Once
app.post('/api/vocab/mastery', (req, res) => {
  const body = isPlainRecord(req.body) ? req.body : {};
  const code = sanitizeCode(body.code);
  const wordId = String(body.wordId || '').trim();
  if (!code) return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });

  const reg = getContentRegistry();
  const word = reg.vocabById[wordId];
  if (!word) return res.status(404).json({ ok: false, error: 'Vocabulary word not found.' });

  const entry = ensureAccountEntry(code);
  const vaani = normalizeVaaniState(entry.record.vaani);
  const currentlyMastered = vaani.wordsLearned.includes(wordId) || Boolean(vaani.vocabLearned[wordId]);
  const desiredMastered = typeof body.mastered === 'boolean' ? body.mastered : !currentlyMastered;

  let xpAwarded = 0;
  let alreadyRewarded = false;

  if (desiredMastered) {
    if (!vaani.wordsLearned.includes(wordId)) vaani.wordsLearned.push(wordId);
    vaani.vocabLearned[wordId] = true;
    if (!vaani.vocabXpRewarded[wordId]) {
      vaani.vocabXpRewarded[wordId] = true;
      xpAwarded = recordServerXP(vaani, 'earned', VAANI_VOCAB_MASTERY_XP, `Mastered word: ${word.w}`);
    } else {
      alreadyRewarded = true;
    }
  } else {
    vaani.wordsLearned = vaani.wordsLearned.filter(id => id !== wordId);
    Object.keys(vaani.vocabLearned).forEach(k => {
      if (k === wordId || k.endsWith('_' + wordId)) delete vaani.vocabLearned[k];
    });
  }

  entry.record.vaani = normalizeVaaniState(vaani);
  entry.updatedAt = Date.now();
  runtimeStore.cadets[code] = extractCadetSummary(code, entry.record.vaani);
  scheduleSaveStore();

  return res.json({
    ok: true,
    code,
    wordId,
    mastered: desiredMastered,
    xpAwarded,
    alreadyRewarded,
    totalMastered: entry.record.vaani.wordsLearned.length,
    totalXp: entry.record.vaani.xp
  });
});

// POST /api/vocab/bookmark — Toggle User-Specific Vocabulary Bookmark
app.post('/api/vocab/bookmark', (req, res) => {
  const body = isPlainRecord(req.body) ? req.body : {};
  const code = sanitizeCode(body.code);
  const wordId = String(body.wordId || '').trim();
  if (!code) return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });

  const reg = getContentRegistry();
  if (!wordId || !reg.vocabById[wordId]) {
    return res.status(404).json({ ok: false, error: 'Vocabulary word not found.' });
  }

  const entry = ensureAccountEntry(code);
  const vaani = normalizeVaaniState(entry.record.vaani);
  const hasBm = vaani.bookmarks.includes(wordId) || vaani.bookmarks.includes('vocab:' + wordId);
  const desiredBm = typeof body.bookmarked === 'boolean' ? body.bookmarked : !hasBm;

  if (desiredBm) {
    if (!vaani.bookmarks.includes(wordId)) vaani.bookmarks.push(wordId);
  } else {
    vaani.bookmarks = vaani.bookmarks.filter(b => b !== wordId && b !== 'vocab:' + wordId);
  }

  entry.record.vaani = normalizeVaaniState(vaani);
  entry.updatedAt = Date.now();
  scheduleSaveStore();

  return res.json({
    ok: true,
    code,
    wordId,
    bookmarked: desiredBm,
    bookmarks: entry.record.vaani.bookmarks
  });
});

/* ============================================================
   9. GLOBAL & SERVICE-FORCE CADET LEADERBOARD & SCORE SYNC
============================================================= */
// GET /api/leaderboard/global
app.get('/api/leaderboard/global', (req, res) => {
  const forceFilter = String(req.query.force || 'all').toLowerCase();
  const sortBy = String(req.query.sort || 'xp').toLowerCase();
  const search = String(req.query.q || '').trim().toLowerCase();
  const mode = String(req.query.mode || 'all').toLowerCase(); // 'all' | 'live'
  const activeCode = sanitizeCode(req.query.code || '');
  const limit = Math.max(1, Math.min(100, Math.floor(Number(req.query.limit) || 50)));
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));

  const mergedByCode = new Map();
  if (mode !== 'live') {
    SEEDED_CADETS.forEach(c => mergedByCode.set(c.code, { ...c, isBenchmark: true }));
  }
  Object.values(runtimeStore.cadets).forEach(c => {
    if (c && c.code) {
      mergedByCode.set(c.code, { ...c, isBenchmark: false });
    }
  });

  let rows = Array.from(mergedByCode.values());
  if (['army', 'navy', 'airforce'].includes(forceFilter)) {
    rows = rows.filter(r => r.serviceForce === forceFilter);
  }
  if (search) {
    rows = rows.filter(r => {
      const nameMatch = String(r.name || '').toLowerCase().includes(search);
      const codeHint = r.code ? (r.code.slice(0, 2) + '••' + r.code.slice(4)).toLowerCase() : '';
      const codeMatch = String(r.code || '').toLowerCase().includes(search) || codeHint.includes(search);
      return nameMatch || codeMatch;
    });
  }

  // Deterministic sorting & tie-breaking: primary metric DESC -> XP DESC -> Streak DESC -> Accuracy DESC -> Code ASC
  rows.sort((a, b) => {
    if (sortBy === 'streak') {
      if ((b.streak || 0) !== (a.streak || 0)) return (b.streak || 0) - (a.streak || 0);
    } else if (sortBy === 'accuracy') {
      if ((b.quizAvg || 0) !== (a.quizAvg || 0)) return (b.quizAvg || 0) - (a.quizAvg || 0);
    }
    if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
    if ((b.streak || 0) !== (a.streak || 0)) return (b.streak || 0) - (a.streak || 0);
    if ((b.quizAvg || 0) !== (a.quizAvg || 0)) return (b.quizAvg || 0) - (a.quizAvg || 0);
    return String(a.code || '').localeCompare(String(b.code || ''));
  });

  const ranked = rows.map((row, idx) => {
    const force = ['army', 'navy', 'airforce'].includes(row.serviceForce) ? row.serviceForce : 'army';
    const rankObj = getServiceRankProgress(row.xp, force);
    return {
      rank: idx + 1,
      codeHint: row.code ? row.code.slice(0, 2) + '••' + row.code.slice(4) : '••••',
      isCurrentCadet: Boolean(activeCode && row.code === activeCode),
      isBenchmark: Boolean(row.isBenchmark),
      sourceLabel: row.isBenchmark ? 'ACADEMY BENCHMARK' : 'LIVE CADET',
      name: row.name,
      xp: row.xp,
      streak: row.streak,
      serviceForce: force,
      rankTitle: row.rankTitle || rankObj.current.name,
      topicsCleared: row.topicsCleared || 0,
      quizAvg: row.quizAvg || 0,
      avatar: row.avatar || computeInitials(row.name),
      updatedAt: row.updatedAt || Date.now()
    };
  });

  const sliceStart = (page - 1) * limit;
  return res.json({
    ok: true,
    mode,
    page,
    limit,
    liveCadetsCount: Object.keys(runtimeStore.cadets).length,
    totalCadets: ranked.length,
    rows: ranked.slice(sliceStart, sliceStart + limit)
  });
});

// POST /api/leaderboard/sync — Authorised Idempotent Score Synchronisation
const recentSyncTokens = new Map();
app.post('/api/leaderboard/sync', (req, res) => {
  const body = isPlainRecord(req.body) ? req.body : {};
  const code = sanitizeCode(body.code);
  if (!code) {
    return res.status(400).json({ ok: false, error: 'Invalid 6-digit account code.' });
  }
  const syncId = typeof body.syncId === 'string' ? body.syncId.trim().slice(0, 80) : '';
  if (syncId && recentSyncTokens.has(code + ':' + syncId)) {
    return res.json({
      ok: true,
      duplicate: true,
      code,
      summary: runtimeStore.cadets[code] || null
    });
  }

  let entry = runtimeStore.accounts[code];
  if (isPlainRecord(body.vaani)) {
    const mergedVaani = entry && isPlainRecord(entry.record?.vaani)
      ? mergeAccountVaaniState(entry.record.vaani, body.vaani)
      : normalizeVaaniState(body.vaani);
    runtimeStore.accounts[code] = {
      record: {
        vaani: mergedVaani,
        vbv: entry && isPlainRecord(entry.record?.vbv) ? entry.record.vbv : {}
      },
      updatedAt: Date.now()
    };
    entry = runtimeStore.accounts[code];
  }

  if (!entry || !isPlainRecord(entry.record?.vaani)) {
    return res.status(404).json({ ok: false, error: 'Account record not found for synchronisation.' });
  }

  const summary = extractCadetSummary(code, entry.record.vaani);
  runtimeStore.cadets[code] = summary;
  if (syncId) {
    recentSyncTokens.set(code + ':' + syncId, Date.now());
  }
  scheduleSaveStore();

  return res.json({
    ok: true,
    duplicate: false,
    code,
    summary,
    rank: getServiceRankProgress(summary.xp, summary.serviceForce)
  });
});

/* ============================================================
   10. ARENA & TEST SESSION RELIABILITY ENDPOINTS
============================================================= */
// Arena Match Registration — POST /api/arena/register-match
app.post('/api/arena/register-match', (req, res) => {
  const b = isPlainRecord(req.body) ? req.body : {};
  const code = validateArenaMatchCode(b.p_code || b.code);
  if (!code) {
    return res.status(400).json({ ok: false, error: 'Invalid Arena match code.' });
  }
  const existing = runtimeStore.arenaMatches[code] || {};
  const expiresAt = Number(b.p_expires_at || b.expiresAt || existing.expiresAt || (Date.now() + 86400000));
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid Arena match expiry.' });
  }

  runtimeStore.arenaMatches[code] = {
    code,
    hostPid: sanitizeString(b.p_host_pid || b.hostPid || existing.hostPid || 'host', 80),
    hostName: sanitizeString(b.p_host_name || b.hostName || existing.hostName || 'Cadet', 40) || 'Cadet',
    hostAvatar: isPlainRecord(b.p_host_avatar || b.hostAvatar) ? (b.p_host_avatar || b.hostAvatar) : (existing.hostAvatar || null),
    expiresAt,
    negMark: Number.isFinite(Number(b.negMark ?? existing.negMark)) ? Number(b.negMark ?? existing.negMark) : 0,
    questionIds: Array.isArray(b.p_question_ids || b.questionIds)
      ? (b.p_question_ids || b.questionIds).map(id => String(id || '')).filter(Boolean).slice(0, 1295)
      : (existing.questionIds || []),
    questionSnapshot: Array.isArray(b.p_question_snapshot || b.questionSnapshot)
      ? (b.p_question_snapshot || b.questionSnapshot).slice(0, 1295)
      : (existing.questionSnapshot || []),
    createdAt: existing.createdAt || Date.now()
  };
  scheduleSaveStore();
  return res.json({ ok: true, code, match: runtimeStore.arenaMatches[code] });
});

// Arena Match Metadata — POST /api/arena/get-match
app.post('/api/arena/get-match', (req, res) => {
  const b = isPlainRecord(req.body) ? req.body : {};
  const code = validateArenaMatchCode(b.p_code || b.code);
  if (!code) {
    return res.status(400).json({ ok: false, found: false, error: 'Invalid Arena match code.' });
  }
  const match = runtimeStore.arenaMatches[code];
  if (!match) {
    return res.json({ ok: false, found: false, error: 'Match metadata not found' });
  }
  if (match.expiresAt && match.expiresAt <= Date.now()) {
    return res.json({ ok: false, found: false, expired: true, error: 'Match is closed or expired' });
  }
  return res.json({
    ok: true,
    found: true,
    code: match.code,
    host_pid: match.hostPid,
    host_name: match.hostName,
    host_avatar: match.hostAvatar,
    expires_at: match.expiresAt,
    question_ids: match.questionIds,
    question_snapshot: match.questionSnapshot
  });
});

// Arena Score Submission — POST /api/arena/submit
app.post('/api/arena/submit', (req, res) => {
  const b = isPlainRecord(req.body) ? req.body : {};
  const code = validateArenaMatchCode(b.p_code || b.code);
  const pid = sanitizeString(b.p_pid || b.pid, 80);
  if (!code || !pid) {
    return res.status(400).json({ ok: false, error: 'Missing Arena match code or player ID.' });
  }

  const match = runtimeStore.arenaMatches[code];
  if (match && match.expiresAt && match.expiresAt <= Date.now()) {
    return res.status(410).json({ ok: false, expired: true, error: 'Match is closed or expired.' });
  }

  if (!Array.isArray(runtimeStore.arenaScores[code])) {
    runtimeStore.arenaScores[code] = [];
  }
  const board = runtimeStore.arenaScores[code];
  const existingIdx = board.findIndex(r => r.pid === pid);
  if (existingIdx >= 0) {
    const pubEntry = { ...board[existingIdx] };
    delete pubEntry.answers;
    return res.json({ ok: true, duplicate: true, source: 'server', entry: pubEntry });
  }

  let total = Math.floor(Number(b.p_total ?? b.total) || (match?.questionIds?.length || 15));
  if (!Number.isInteger(total) || total < 1 || total > 1295) {
    return res.status(400).json({ ok: false, error: 'Invalid question count.' });
  }

  const seconds = Math.floor(Number(b.p_seconds ?? b.seconds) ?? 0);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 86400) {
    return res.status(400).json({ ok: false, error: 'Invalid completion time.' });
  }

  const rawAnswers = isPlainRecord(b.p_answers || b.answers) ? (b.p_answers || b.answers) : null;
  let score = Number(b.p_score ?? b.score ?? 0);
  let correct = b.p_correct ?? b.correct ?? null;
  let incorrect = b.p_incorrect ?? b.incorrect ?? null;
  let skipped = b.p_skipped ?? b.skipped ?? null;

  // Server-side answer verification when match question set + answers are provided
  if (rawAnswers && Object.keys(rawAnswers).length > 0 && match && (match.questionSnapshot?.length || match.questionIds?.length)) {
    const reg = getContentRegistry();
    const qList = match.questionSnapshot?.length
      ? match.questionSnapshot
      : match.questionIds.map(id => reg.pyqById[id]).filter(Boolean);

    if (qList.length > 0) {
      let cCount = 0;
      let wCount = 0;
      let sCount = 0;
      const negPenalties = [0, -1 / 3, -1 / 2, -1];
      const negLoss = negPenalties[match.negMark] || 0;

      for (const q of qList) {
        const qid = q._id;
        const given = rawAnswers[qid];
        if (given === undefined || given === null || given === '') {
          sCount++;
        } else if (Number(given) === Number(q.ans)) {
          cCount++;
        } else {
          wCount++;
        }
      }
      total = qList.length;
      correct = cCount;
      incorrect = wCount;
      skipped = sCount;
      score = Number((cCount + wCount * negLoss).toFixed(2));
    }
  }

  if (!Number.isFinite(score) || score < -total || score > total) {
    return res.status(400).json({ ok: false, error: 'Invalid score out of bounds.' });
  }

  if (correct !== null || incorrect !== null || skipped !== null) {
    correct = Number(correct);
    incorrect = Number(incorrect);
    skipped = Number(skipped);
    if (!Number.isInteger(correct) || !Number.isInteger(incorrect) || !Number.isInteger(skipped) ||
        correct < 0 || incorrect < 0 || skipped < 0 || correct + incorrect + skipped !== total) {
      return res.status(400).json({ ok: false, error: 'Invalid attempt statistics.' });
    }
  }

  const entry = {
    code,
    pid,
    name: sanitizeString(b.p_name || b.name || 'Cadet', 48) || 'Cadet',
    avatar: isPlainRecord(b.p_avatar || b.avatar) ? (b.p_avatar || b.avatar) : null,
    score: Number(score.toFixed(2)),
    total,
    seconds,
    correct,
    incorrect,
    skipped,
    answers: rawAnswers || {},
    at: Date.now()
  };

  board.push(entry);
  board.sort((a, b) => (b.score - a.score) || (a.seconds - b.seconds) || (a.at - b.at));
  scheduleSaveStore();

  const publicEntry = { ...entry };
  delete publicEntry.answers;
  return res.json({ ok: true, duplicate: false, source: 'server', entry: publicEntry });
});

// Arena Leaderboard Read — POST /api/arena/leaderboard
app.post('/api/arena/leaderboard', (req, res) => {
  const b = isPlainRecord(req.body) ? req.body : {};
  const code = validateArenaMatchCode(b.p_code || b.code);
  if (!code) {
    return res.status(400).json({ ok: false, error: 'Invalid Arena match code.', rows: [] });
  }
  const match = runtimeStore.arenaMatches[code];
  if (match && match.expiresAt && match.expiresAt <= Date.now()) {
    return res.json({ ok: true, rows: [], expired: true, verified: true, source: 'server' });
  }
  const rawRows = Array.isArray(runtimeStore.arenaScores[code]) ? runtimeStore.arenaScores[code] : [];
  // Never expose private answer keys/selections on public leaderboard rows
  const rows = rawRows.slice(0, 100).map(r => ({
    code: r.code,
    pid: r.pid,
    name: r.name,
    avatar: r.avatar || null,
    score: r.score,
    seconds: r.seconds,
    total: r.total,
    correct: r.correct ?? null,
    incorrect: r.incorrect ?? null,
    skipped: r.skipped ?? null,
    at: r.at
  }));
  return res.json({
    ok: true,
    rows,
    verified: true,
    source: 'server'
  });
});

/* ============================================================
   11. OFFICER VAANI — DATA-DRIVEN CONTEXTUAL BRIEFING API
============================================================= */
app.get('/api/officer-vaani/briefing', (req, res) => {
  const code = sanitizeCode(req.query.code);
  const view = String(req.query.view || 'dashboard').toLowerCase();
  const reg = getContentRegistry();

  const vaani = code && runtimeStore.accounts[code]?.record?.vaani
    ? normalizeVaaniState(runtimeStore.accounts[code].record.vaani)
    : normalizeVaaniState({});

  const rankProgress = getServiceRankProgress(vaani.xp, vaani.serviceForce);
  const completedCount = Object.keys(vaani.completedTopics).filter(k => vaani.completedTopics[k] === true).length;
  const attempts = vaani.pyqStats?.attempts || {};
  const attemptedIds = Object.keys(attempts);
  const mistakeIds = attemptedIds.filter(id => attempts[id] === false);
  const unmasteredVocabCount = Math.max(0, reg.vocabAll.length - vaani.wordsLearned.length);

  let pose = 'welcome';
  let badge = 'COMMAND BRIEFING';
  let title = `Ready for training, ${vaani.name}.`;
  let directive = `You are currently ${rankProgress.current.name} (${vaani.xp} XP). Complete 1 grammar topic or 15 PYQs today.`;

  if (view === 'grammar' || view === 'topic' || view === 'journey') {
    pose = 'teaching';
    badge = 'GRAMMAR ACADEMY PROTOCOL';
    title = `${completedCount} of ${reg.grammarAll.length} Grammar Topics Cleared.`;
    directive = 'Master the core rule first, inspect the NDA/CDS trap examples, then verify with the topic quiz.';
  } else if (view === 'pyq') {
    pose = mistakeIds.length > 5 ? 'thinking' : 'exam';
    badge = 'PYQ TACTICAL ANALYSIS';
    title = `${attemptedIds.length} PYQs Attempted · ${mistakeIds.length} Mistakes Logged.`;
    directive = mistakeIds.length > 0
      ? `Focus on clearing your ${mistakeIds.length} logged PYQ mistakes using the Incorrect tab or Launch Filtered Drill.`
      : 'Use the status tabs and topic filters to drill high-weightage NDA & CDS questions.';
  } else if (view === 'vocab' || view === 'worddetail' || view === 'vocab90') {
    pose = 'guidance';
    badge = 'VOCABULARY ARSENAL';
    title = `${vaani.wordsLearned.length}/${reg.vocabAll.length} Core Words Mastered.`;
    directive = unmasteredVocabCount > 0
      ? `You have ${unmasteredVocabCount} unmastered words remaining. Filter by Unmastered and claim +10 XP per word.`
      : 'All core vocabulary words mastered! Maintain sharpness with synonym/antonym drills.';
  } else if (view === 'leaderboard' || view === 'profile') {
    pose = vaani.streak >= 3 ? 'congratulatory' : 'motivational';
    badge = 'SERVICE RECORD & STANDINGS';
    title = `${rankProgress.current.name} · ${vaani.streak}-Day Active Streak.`;
    directive = rankProgress.next
      ? `${rankProgress.remainingXP} XP required for promotion to ${rankProgress.next.name}. Keep your daily streak active.`
      : 'Highest honorary rank achieved. Continue setting the benchmark for the cohort.';
  }

  return res.json({
    ok: true,
    pose,
    badge,
    title,
    directive,
    metrics: {
      xp: vaani.xp,
      streak: vaani.streak,
      rankTitle: rankProgress.current.name,
      nextRankTitle: rankProgress.next ? rankProgress.next.name : null,
      remainingXP: rankProgress.remainingXP,
      completedTopics: completedCount,
      pyqAttempted: attemptedIds.length,
      pyqMistakes: mistakeIds.length,
      vocabMastered: vaani.wordsLearned.length,
      vocabUnmastered: unmasteredVocabCount
    }
  });
});

/* ============================================================
   12. DEFENCE & GOVERNMENT NOTIFICATIONS ENDPOINTS
============================================================= */
function loadNotificationsFile(filename) {
  try {
    const p = path.join(rootDir, 'data', filename);
    if (!fs.existsSync(p)) return [];
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    const items = Array.isArray(parsed?.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
    return items
      .filter(item => isPlainRecord(item) && safeNotificationUrl(item.url || item.sourceUrl))
      .map(item => ({
        ...item,
        url: safeNotificationUrl(item.url || item.sourceUrl),
        sourceUrl: safeNotificationUrl(item.sourceUrl || item.url)
      }));
  } catch (_e) {
    return [];
  }
}

app.get('/api/notifications', (_req, res) => {
  const items = loadNotificationsFile('defence-notifications.json');
  res.json({
    ok: true,
    version: 2,
    source: 'VAANI Government & Defence Notification Engine',
    generatedAt: new Date().toISOString(),
    items
  });
});

app.get('/api/notifications/archive', (_req, res) => {
  const items = loadNotificationsFile('defence-notifications-archive.json');
  res.json({
    ok: true,
    version: 2,
    source: 'VAANI Government & Defence Notification Archive',
    generatedAt: new Date().toISOString(),
    items
  });
});

/* ============================================================
   13. STATIC ASSETS, SPA FALLBACK, ERROR HANDLER & SHUTDOWN
============================================================= */
app.use('/api/*', (_req, res) => {
  res.status(404).json({ ok: false, code: 'ENDPOINT_NOT_FOUND', error: 'API endpoint not found.' });
});

app.use(express.static(rootDir, {
  extensions: ['html'],
  setHeaders(res, servedPath) {
    const base = path.basename(servedPath).toLowerCase();
    const ext = path.extname(servedPath).toLowerCase();
    if (ext === '.html' || base === 'sw.js' || base === 'manifest.webmanifest') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (['.css', '.js', '.mjs', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff2', '.json'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }
  }
}));

app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html') && !path.extname(req.path) && !req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    return res.sendFile(path.join(rootDir, 'index.html'));
  }
  return next();
});

// Centralised error handler — never leaks stack traces to clients
app.use((err, _req, res, _next) => {
  serverMetrics.apiErrors5xx++;
  serverMetrics.lastErrorAt = Date.now();
  serverMetrics.lastErrorCode = 500;
  console.error('[VAANI server] Unhandled error:', err && err.message ? err.message : 'Unknown error');
  if (res.headersSent) return;
  res.status(500).json({
    ok: false,
    code: 'INTERNAL_SERVER_ERROR',
    error: 'An unexpected server error occurred.'
  });
});

let activeHttpServer = null;

function gracefulShutdown(signal) {
  console.log(`[VAANI server] Received ${signal}. Flushing runtime store and closing server...`);
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  flushSaveStoreSync();
  if (activeHttpServer) {
    activeHttpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  const envCheck = validateEnvironmentConfig();
  if (!envCheck.ok) {
    console.warn('[VAANI server] Environment configuration warnings/errors:', envCheck.errors.join('; '));
  }
  activeHttpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`VAANI server (${NODE_ENV}) listening on http://0.0.0.0:${PORT}`);
  });
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = {
  app,
  runtimeStore,
  serverMetrics,
  validateEnvironmentConfig,
  isAllowedCorsOrigin,
  getHealthReport,
  getContentRegistry,
  getServiceRankProgress,
  getMinimumXPDays,
  getAccuracyPenalty,
  getTotalMarksPenalty,
  validateArenaMatchCode,
  normalizeVaaniState,
  mergeAccountVaaniState,
  extractCadetSummary,
  flushSaveStoreSync
};
