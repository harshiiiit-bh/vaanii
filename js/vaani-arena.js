/* ============================================================
   VAANI ARENA  ·  rebuilt from scratch
   ------------------------------------------------------------
   A host sets up a match, gets a short code, and shares it.
   Everyone who enters that code sits the SAME test.

   How the same questions reach everyone with no server:
   the code itself carries the settings and a random seed. Every
   device runs the same seeded shuffle over the same question
   bank, so it lands on the same questions in the same order.
   Nothing is fetched, nothing can drift.

   Shared leaderboard data is stored in Supabase and returned through
   a narrow RPC. Scores remain unverified because the client supplies
   the attempt payload; the server validates the shape before storing it.
   ============================================================ */
(function (global) {
  'use strict';

  var VX = global.VX = global.VX || {};
  var A = VX.arena = {};

  var MAX_PLAYERS = 100;
  var CODE_VERSION = 3;
  var EPOCH = Date.UTC(2024, 0, 1) / 60000; // minutes since 2024-01-01, keeps codes short
  var NEG_MARKS = [0, -1 / 3, -1 / 2, -1]; // index stored in the code -> fraction lost per wrong answer
  var NEG_LABELS = ['No penalty', '&minus;1/3', '&minus;1/2', '&minus;1'];

  /* ---------------------------------------------------------
     helpers
     --------------------------------------------------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function say(m) { (VX.say || console.log)(m); }
  function fmtClock(s) { return VX.fmtClock ? VX.fmtClock(s) : s + 's'; }

  /*
   * One correctness rule for every Arena surface.
   * PYQ answer indices have historically appeared as both numbers and strings.
   * Strict equality let score/result/analysis disagree about the same attempt.
   */
  function answerMatches(given, expected) {
    if (given === undefined || given === null || expected === undefined || expected === null) return false;
    var gn = Number(given), en = Number(expected);
    if (Number.isFinite(gn) && Number.isFinite(en)) return gn === en;
    return String(given).trim() === String(expected).trim();
  }

  function b36(n, width) {
    var s = Math.max(0, Math.floor(n)).toString(36).toUpperCase();
    while (s.length < width) s = '0' + s;
    return s.slice(-width);
  }
  function unb36(s) { return parseInt(s, 36); }

  /* deterministic RNG — same seed, same sequence, every device */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(list, seed) {
    var rnd = mulberry32(seed), a = list.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function hashString(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------------------------------------------------------
     MATCH CODE  ·  encode / decode
     layout: v(1) src(1) count(2) secs(3) cap(2) seed(6) exp(7) check(2)
     src is an index into SRC_CODES; adding SRC_CODES.length to it means
     "shuffle the order per player". New exams just get appended to
     SRC_CODES — nothing else about the layout needs to change.
     --------------------------------------------------------- */
  var SRC_CODES = ['NDA', 'CDS', 'AFCAT', 'NDA+CDS', 'NDA+AFCAT', 'CDS+AFCAT', 'BOTH'];
  var LEGACY_SRC_CODES = ['NDA', 'CDS', 'AFCAT', 'BOTH'];

  /* Two-character FNV-1a check. One mistyped character must never
     decode into a different but valid match — that would quietly put
     two players on two different tests. */
  function checksum(body) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < body.length; i++) {
      h ^= body.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return b36(h % 1296, 2);
  }

  /* layout (v2): v(1) src(1) count(2) secs(3) cap(2) seed(6) exp(7)
                  type(2) paper(3) perQ(2) neg(1) check(2)  =  32 chars
     type/paper are 1-based indices into typesFor(source)/papersFor(source);
     0 means "no filter" (Mixed types / Any paper). Those lists come from
     the bundled question data, which is identical on every device — same
     assumption the seeded shuffle already relies on. */
  function sourceLabel(source) {
    return source === 'BOTH' ? 'NDA+CDS+AFCAT' : String(source || 'NDA');
  }
  function sourceExamCodes(source) {
    return sourceLabel(source).split('+').filter(Boolean);
  }
  function normalizedSourceFromCodes(codes) {
    var wanted = {}, ordered = ['NDA','CDS','AFCAT'], out = [];
    (Array.isArray(codes) ? codes : []).forEach(function (code) { wanted[code] = true; });
    ordered.forEach(function (code) { if (wanted[code]) out.push(code); });
    return out.length === 3 ? 'BOTH' : (out.join('+') || 'NDA');
  }

  A.encode = function (m) {
    var srcIdx = SRC_CODES.indexOf(m.source);
    if (srcIdx < 0) srcIdx = SRC_CODES.indexOf('BOTH');
    if (m.shuffleOrder) srcIdx += SRC_CODES.length;
    var typeIdx = 0;
    if (m.type) { var ti = typesFor(m.source).indexOf(m.type); typeIdx = ti >= 0 ? ti + 1 : 0; }
    var paperIdx = 0;
    if (m.paperKey) {
      var papers = papersFor(m.source), pi = -1;
      for (var i = 0; i < papers.length; i++) if (papers[i].key === m.paperKey) { pi = i; break; }
      paperIdx = pi >= 0 ? pi + 1 : 0;
    }
    var body =
      b36(CODE_VERSION, 1) +
      b36(srcIdx, 1) +
      b36(m.count, 2) +
      b36(m.seconds, 3) +
      b36(m.cap, 2) +
      b36(m.seed, 6) +
      b36(Math.round(m.expiresAt / 60000) - EPOCH, 7) +
      b36(typeIdx, 2) +
      b36(paperIdx, 3) +
      b36(m.perQSeconds || 0, 2) +
      b36(m.negMark || 0, 1);
    return body + checksum(body);
  };

  A.decode = function (raw) {
    var code = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (code.length !== 32) return null;
    var body = code.slice(0, 30);
    if (checksum(body) !== code.slice(30)) return null;

    var v = unb36(body.slice(0, 1));
    if (v !== 2 && v !== CODE_VERSION) return null;
    var srcIdx = unb36(body.slice(1, 2));
    var sourceCodes;
    var shuffleOrder;

    if (v === 2) {
      sourceCodes = LEGACY_SRC_CODES;
      shuffleOrder = srcIdx >= sourceCodes.length;
      if (shuffleOrder) srcIdx -= sourceCodes.length;
    } else {
      sourceCodes = SRC_CODES;
      shuffleOrder = srcIdx >= sourceCodes.length;
      if (shuffleOrder) srcIdx -= sourceCodes.length;
    }

    var source = sourceCodes[srcIdx] || 'BOTH';
    var typeIdx = unb36(body.slice(22, 24));
    var paperIdx = unb36(body.slice(24, 27));
    var types = typesFor(source), papers = papersFor(source);
    var m = {
      code: code,
      source: source,
      shuffleOrder: shuffleOrder,
      count: unb36(body.slice(2, 4)),
      seconds: unb36(body.slice(4, 7)),
      cap: unb36(body.slice(7, 9)),
      seed: unb36(body.slice(9, 15)),
      expiresAt: (unb36(body.slice(15, 22)) + EPOCH) * 60000,
      type: typeIdx > 0 ? (types[typeIdx - 1] || null) : null,
      paperKey: paperIdx > 0 ? ((papers[paperIdx - 1] || {}).key || null) : null,
      perQSeconds: unb36(body.slice(27, 29)),
      negMark: unb36(body.slice(29, 30)),
      codeVersion: v
    };
    if (!m.count || !m.seconds) return null;
    return m;
  };

  A.prettyCode = function (code) {
    return code.replace(/(.{6})/g, '$1-').replace(/-$/, '');
  };

  /* ---------------------------------------------------------
     Build the match's question set — identical on every device
     --------------------------------------------------------- */
  function sharedPYQAll() {
    try { return (typeof PYQ_ALL !== 'undefined' && Array.isArray(PYQ_ALL)) ? PYQ_ALL : []; }
    catch (e) { return []; }
  }

  function paperKeyOf(q) { return String(q._exam || '') + '|' + String(q.s || '') + '|' + String(q.y || ''); }

  function poolForSource(source) {
    var codes = sourceExamCodes(source), merged = [], seen = {};
    codes.forEach(function (code) {
      var pool = VX.poolFor ? VX.poolFor(code) : sharedPYQAll();
      pool.forEach(function (q) {
        var id = String(q._id || '');
        if (!seen[id]) { seen[id] = true; merged.push(q); }
      });
    });
    return merged;
  }
  A.poolForSource = poolForSource;

  /* Distinct question types ("sec") available in a bank, alphabetical —
     same bundled data on every device means this list, and therefore
     its indices, line up host-to-joiner exactly like the seeded shuffle does. */
  function typesFor(source) {
    var pool = poolForSource(source);
    var seen = {}, out = [];
    pool.forEach(function (q) { if (q.sec && !seen[q.sec]) { seen[q.sec] = true; out.push(q.sec); } });
    out.sort();
    return out;
  }

  /* Distinct papers (exam + session + year) in a bank, newest first. */
  function papersFor(source) {
    var pool = poolForSource(source);
    var seen = {}, out = [];
    pool.forEach(function (q) {
      var key = paperKeyOf(q);
      if (!seen[key]) { seen[key] = { key: key, exam: q._exam, s: q.s, y: q.y, count: 0 }; out.push(seen[key]); }
      seen[key].count++;
    });
    out.sort(function (a, b) {
      if (String(a.y) !== String(b.y)) return Number(b.y) - Number(a.y);
      if (a.exam !== b.exam) return String(a.exam).localeCompare(String(b.exam));
      return String(a.s).localeCompare(String(b.s));
    });
    return out;
  }
  A.typesFor = typesFor;
  A.papersFor = papersFor;

  function applyFilters(pool, type, paperKey) {
    if (paperKey) pool = pool.filter(function (q) { return paperKeyOf(q) === paperKey; });
    if (type) pool = pool.filter(function (q) { return q.sec === type; });
    return pool;
  }
  A.poolForDraft = function (source, type, paperKey) {
    return applyFilters(poolForSource(source), type, paperKey);
  };

  A.questionsFor = function (match, playerName) {
    if (Array.isArray(match && match.frozenQuestions) && match.frozenQuestions.length) {
      var snapshot = match.frozenQuestions.map(function (q) {
        return q && typeof q === 'object' ? JSON.parse(JSON.stringify(q)) : null;
      }).filter(Boolean);
      if (match.shuffleOrder && playerName) {
        snapshot = seededShuffle(snapshot, (match.seed ^ hashString(playerName)) >>> 0);
      }
      return snapshot.slice(0, Math.min(match.count, snapshot.length));
    }
    var pool = poolForSource(match.source);
    var frozen = Array.isArray(match && match.frozenQuestionIds) ? match.frozenQuestionIds.map(function (id) { return String(id || ''); }).filter(Boolean) : [];
    if (frozen.length) {
      var byId = {};
      pool.forEach(function (q) { byId[String(q._id || '')] = q; });
      var pickedFrozen = [];
      frozen.forEach(function (id) { if (byId[id]) pickedFrozen.push(byId[id]); });
      if (pickedFrozen.length) {
        if (match.shuffleOrder && playerName) {
          pickedFrozen = seededShuffle(pickedFrozen, (match.seed ^ hashString(playerName)) >>> 0);
        }
        return pickedFrozen.slice(0, Math.min(match.count, pickedFrozen.length));
      }
    }
    pool = applyFilters(pool, match.type, match.paperKey);
    // Legacy matches created before frozen question IDs existed continue to
    // use the original seeded-pool behavior. New matches freeze their IDs at
    // creation, so later PYQ corrections cannot change an active match.
    pool = pool.slice().sort(function (a, b) {
      return String(a._id) < String(b._id) ? -1 : (String(a._id) > String(b._id) ? 1 : 0);
    });
    if (!pool.length) return [];
    var picked = seededShuffle(pool, match.seed).slice(0, Math.min(match.count, pool.length));
    if (match.shuffleOrder && playerName) {
      picked = seededShuffle(picked, (match.seed ^ hashString(playerName)) >>> 0);
    }
    return picked;
  };

  /* ---------------------------------------------------------
     Who is playing
     --------------------------------------------------------- */
  function playerName() {
    // The active VAANI account is the sole source of identity. Never fall back
    // to a device-wide `vaani_name` key because that leaks names across accounts.
    var s; try { s = (typeof State !== 'undefined') ? State : {}; } catch (e) { s = {}; }
    return String(s.name || s.cadetName || 'Cadet').trim() || 'Cadet';
  }

  /* Account-scoped storage namespace. Every Arena cache, identity, host flag,
     attempt and recovery snapshot uses the currently authenticated VAANI
     account code. This function must be declared before any Arena renderer
     calls loadRecent(), including the home screen. */
  function arenaAccountKey(base){
    var account=arenaActiveCode();
    return account ? (String(base)+'_'+account) : String(base)+'_anonymous';
  }
  function playerId() {
    // Bind the Arena identity to the active VAANI account. A different
    // account on the same browser must never inherit the previous account's
    // Arena player id.
    var account = '';
    try { account = (typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE) ? String(ACTIVE_CODE) : ''; }
    catch (e) { account = ''; }
    migrateLegacyArenaStorage();
    var k = account ? ('vx_player_id_' + account) : 'vx_player_id';
    var v = localStorage.getItem(k);
    if (!v) {
      v = Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(k, v); } catch (e) {}
    }
    return v;
  }

  /* Host privilege is a client-side label only — there is no server
     auth, so it just marks "this device ran Create match for this
     code." Anyone determined could set the same flag by hand; that's
     an acceptable trust level for a study-group tool like this one. */
  function markHost(code) {
    try { localStorage.setItem(arenaAccountKey('vx_arena_host_' + code), '1'); } catch (e) {}
  }
  function isHost(code) {
    try { return localStorage.getItem(arenaAccountKey('vx_arena_host_' + code)) === '1'; }
    catch (e) { return false; }
  }

  /* =========================================================
     LEADERBOARD SYNC
     Shared adapter: Supabase RPC, with local recovery/display fallback.
     ========================================================= */
  var LocalAdapter = {
    name: 'local',
    live: false,
    key: function (code) { return arenaAccountKey('vx_arena_board_' + code); },
    read: function (code) {
      try { return JSON.parse(localStorage.getItem(this.key(code)) || '[]'); }
      catch (e) { return []; }
    },
    submit: function (code, entry) {
      var rows = this.read(code).filter(function (r) { return r.pid !== entry.pid; });
      rows.push(entry);
      try { localStorage.setItem(this.key(code), JSON.stringify(rows.slice(0, MAX_PLAYERS))); }
      catch (e) { /* storage full — the run still counted locally */ }
      return Promise.resolve(true);
    },
    fetch: function (code) { return Promise.resolve(this.read(code)); }
  };

  /* Shared Arena board:
     - submissions go to Supabase via the public RPC
     - reads come from the narrow leaderboard RPC
     - local storage remains only as an offline recovery/display cache */
  var SHARED_BOARD_ENDPOINT = 'https://pccavdwwhykwyeitxixc.supabase.co/rest/v1/rpc/arena_get_leaderboard';
  var SHARED_SUBMIT_ENDPOINT = 'https://pccavdwwhykwyeitxixc.supabase.co/rest/v1/rpc/arena_submit_attempt_v2';
  var SHARED_REGISTER_MATCH_ENDPOINT = 'https://pccavdwwhykwyeitxixc.supabase.co/rest/v1/rpc/arena_register_match';
  var SHARED_GET_MATCH_ENDPOINT = 'https://pccavdwwhykwyeitxixc.supabase.co/rest/v1/rpc/arena_get_match';
  var SHARED_BOARD_API_KEY = 'sb_publishable_VfRmr2xFvu4Iv8sfSJReQQ_qzr5z_MI';

  var SharedReadAdapter = {
    name: 'shared',
    live: true,
    shared: true,
    submit: function (code, entry) {
      if (typeof global.fetch !== 'function') {
        return Promise.reject(new Error('Shared leaderboard submission is unavailable'));
      }
      var payload = {
        p_code: code,
        p_pid: String(entry.pid || ''),
        p_name: String(entry.name || 'Cadet'),
        p_score: Number(entry.score),
        p_seconds: Math.max(0, Math.round(Number(entry.seconds) || 0)),
        p_total: Math.max(1, Math.round(Number(entry.total) || 1)),
        p_correct: Math.max(0, Math.round(Number(entry.correct) || 0)),
        p_incorrect: Math.max(0, Math.round(Number(entry.incorrect) || 0)),
        p_skipped: Math.max(0, Math.round(Number(entry.skipped) || 0)),
        p_answers: entry.answers && typeof entry.answers === 'object' ? entry.answers : {},
        p_expires_at: Number(entry.expiresAt) || null
      };
      return global.fetch(SHARED_SUBMIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SHARED_BOARD_API_KEY
        },
        body: JSON.stringify(payload)
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('Shared leaderboard submission returned HTTP ' + response.status);
        }
        return response.json();
      }).then(function (result) {
        if (!result || result.ok !== true) {
          throw new Error((result && result.error) || 'Shared leaderboard submission was rejected');
        }
        return true;
      });
    },
    registerMatch: function (match) {
      if (typeof global.fetch !== 'function') return Promise.reject(new Error('Shared match registry is unavailable'));
      var body = {
        p_code: String(match.code || ''),
        p_host_pid: playerId(),
        p_host_name: String(match.hostName || playerName() || 'Cadet'),
        p_host_avatar: match.hostAvatar && typeof match.hostAvatar === 'object' ? match.hostAvatar : null,
        p_expires_at: Number(match.expiresAt) || 0,
        p_question_ids: Array.isArray(match.frozenQuestionIds) ? match.frozenQuestionIds.map(function (id) { return String(id || ''); }).filter(Boolean) : [],
        p_question_snapshot: Array.isArray(match.frozenQuestions) ? match.frozenQuestions : []
      };
      return global.fetch(SHARED_REGISTER_MATCH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SHARED_BOARD_API_KEY
        },
        body: JSON.stringify(body)
      }).then(function (response) {
        if (!response.ok) throw new Error('Shared match registry returned HTTP ' + response.status);
        return response.json();
      }).then(function (payload) {
        if (!payload || payload.ok !== true) throw new Error((payload && payload.error) || 'Shared match registry rejected');
        return payload;
      });
    },
    getMatchMetadata: function (code) {
      if (typeof global.fetch !== 'function') return Promise.reject(new Error('Shared match registry is unavailable'));
      return global.fetch(SHARED_GET_MATCH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SHARED_BOARD_API_KEY
        },
        body: JSON.stringify({ p_code: String(code || '') })
      }).then(function (response) {
        if (!response.ok) throw new Error('Shared match registry returned HTTP ' + response.status);
        return response.json();
      }).then(function (payload) {
        if (!payload || payload.ok !== true) return null;
        return payload;
      });
    },
    fetch: function (code) {
      if (typeof global.fetch !== 'function') {
        return Promise.reject(new Error('Shared leaderboard fetch is unavailable'));
      }
      return global.fetch(SHARED_BOARD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SHARED_BOARD_API_KEY
        },
        body: JSON.stringify({ p_code: String(code || '') })
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('Shared leaderboard returned HTTP ' + response.status);
        }
        return response.json();
      }).then(function (payload) {
        if (!payload || !Array.isArray(payload.rows)) {
          throw new Error('Shared leaderboard response is invalid');
        }
        return payload.rows;
      });
    }
  };

  A.sync = SharedReadAdapter;
  A.useSync = function (adapter) { A.sync = adapter; };

  function rankRows(rows) {
    return rows.slice().sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;   // higher score first
      return a.seconds - b.seconds;                         // then faster
    });
  }

  /* =========================================================
     VIEW STATE
     ========================================================= */
  var S = { screen: 'home', match: null, draft: null, run: null, result: null, rows: [], hostSpectate: false, recoverySnapshot: null, practiceSummary: null, _metadataRequests: Object.create(null), _metadataLoaded: Object.create(null) };

  function resetArenaForAccountChange(){
    clearQTimer();
    if(S._expiryTimer){ clearTimeout(S._expiryTimer); S._expiryTimer=null; }
    if(VX.timer && typeof VX.timer.stop==='function') VX.timer.stop();
    S.screen='home';
    S.match=null;
    S.draft=null;
    S.run=null;
    S.result=null;
    S.rows=[];
    S.hostSpectate=false;
    S.recoverySnapshot=null;
    S.practiceSummary=null;
    S._metadataRequests=Object.create(null);
    S._metadataLoaded=Object.create(null);
    if(typeof global.VAANI_SET_ASSESSMENT_ACTIVE==='function')global.VAANI_SET_ASSESSMENT_ACTIVE(false);
    var h=host();
    if(h && h.offsetParent!==null){
      try{ render(); }catch(e){ console.error('[Arena] account reset render failed:',e); }
    }
  }

  global.addEventListener('vaani:account-changed',function(){
    resetArenaForAccountChange();
  });

  function host() { return document.getElementById('view-games'); }

  function clearQTimer() {
    if (S._qTimerHandle) { clearInterval(S._qTimerHandle); S._qTimerHandle = null; }
  }

  function render(options) {
    options = options || {};
    clearQTimer(); // any per-question countdown belongs to the screen being replaced
    if (S._expiryTimer) { clearTimeout(S._expiryTimer); S._expiryTimer = null; }
    var h = host();
    if (!h) return;
    h.innerHTML = '';
    var wrap = el('div', 'vx-arena');
    h.appendChild(wrap);
    ({
      home: screenHome, create: screenCreateV2, share: screenShareV2,
      join: screenJoin, briefing: screenBriefing, run: screenRun,
      result: screenResult, review: screenReview, hostAnswers: screenHostAnswers, help: screenHelp
    }[S.screen] || screenHome)(wrap);
    // Re-renders inside the current screen must not steal the user's scroll position.
    // Navigation through go() explicitly opts into a top-of-screen jump.
    if (options.scroll === true && typeof wrap.scrollIntoView === 'function') {
      wrap.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
  A.render = render;

  function go(screen) {
    S.screen=screen;
    if(typeof global.VAANI_SET_ASSESSMENT_ACTIVE==='function')global.VAANI_SET_ASSESSMENT_ACTIVE(screen==='run');
    // On phones, keep the user's current scroll position stable. The old mobile
    // room/touch layer already caused unwanted upward motion; Arena navigation
    // must not reintroduce it.
    var isMobileViewport = !!(window.matchMedia && window.matchMedia('(max-width:767px)').matches);
    render({scroll:!isMobileViewport});
  }

  function backBtn(parent, label, screen) {
    var b = el('button', 'vx-back', '&larr; ' + label);
    b.type = 'button';
    b.addEventListener('click', function () { go(screen); });
    parent.appendChild(b);
  }

  /* ---------------------------------------------------------
     HOME
     --------------------------------------------------------- */
  function screenHome(w) {
    var hero = el('div', 'vx-arena-hero');
    hero.innerHTML =
      '<svg class="vx-sweep" viewBox="0 0 460 460" aria-hidden="true">' +
        '<defs><linearGradient id="vxSweepG" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="#c8a44a" stop-opacity=".55"/>' +
          '<stop offset="100%" stop-color="#c8a44a" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        '<circle cx="230" cy="230" r="215" fill="none" stroke="rgba(200,164,74,.18)"/>' +
        '<circle cx="230" cy="230" r="150" fill="none" stroke="rgba(200,164,74,.14)"/>' +
        '<circle cx="230" cy="230" r="85"  fill="none" stroke="rgba(200,164,74,.10)"/>' +
        '<g class="vx-sweep-arm"><path d="M230 230 L445 230 A215 215 0 0 0 383 78 Z" fill="url(#vxSweepG)"/></g>' +
      '</svg>' +
      '<h2>Arena</h2>' +
      '<p>Set a test, share the code, and see who actually comes out on top. Everyone who joins sits the same questions.</p>';
    w.appendChild(hero);

    var actions = el('div', 'vx-arena-actions');

    var tCreate = el('button', 'vx-tile');
    tCreate.type = 'button';
    tCreate.innerHTML =
      '<svg class="vx-tile-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<path d="M12 4v16M4 12h16" stroke-linecap="round"/><circle cx="12" cy="12" r="9.5" opacity=".28"/></svg>' +
      '<h4>Start a match</h4><p>Choose the bank, the number of questions, the clock and how long the code stays open. You get a code to share.</p>';
    tCreate.addEventListener('click', function () { S.draft = defaultDraft(); go('create'); });
    actions.appendChild(tCreate);

    var tJoin = el('button', 'vx-tile');
    tJoin.type = 'button';
    tJoin.innerHTML =
      '<svg class="vx-tile-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" stroke-linecap="round"/>' +
      '<path d="M8 12h8" stroke-linecap="round"/></svg>' +
      '<h4>Join with a code</h4><p>Paste the code a friend sent you. You will see the settings before anything starts.</p>';
    tJoin.addEventListener('click', function () { go('join'); });
    actions.appendChild(tJoin);

    w.appendChild(actions);

    /* Recent matches and activity summary: only real local records are shown. */
    var recentAll = loadRecent().slice(0, 20);
    var recent = recentAll.slice(0, 3);
    var openCount = recentAll.filter(function (r) { return Date.now() < Number(r.expiresAt); }).length;
    var attemptedCount = recentAll.filter(function (r) { return r.myScore != null; }).length;
    var homeMetrics = el('div', 'vx-home-metrics');
    [
      { label: 'Recent matches', value: recentAll.length, detail: 'On this account' },
      { label: 'Open codes', value: openCount, detail: 'Still available' },
      { label: 'Your submissions', value: attemptedCount, detail: 'This account' }
    ].forEach(function (item) {
      var metric = el('div', 'vx-home-metric');
      metric.innerHTML = '<span>' + esc(item.label) + '</span><strong>' + esc(String(item.value)) + '</strong><small>' + esc(item.detail) + '</small>';
      homeMetrics.appendChild(metric);
    });
    w.appendChild(homeMetrics);

    /* Quick-start templates make the Arena feel like a command centre rather
       than an empty waiting room. Each template still opens the normal
       settings screen, so the existing match rules and validation remain in charge. */
    var modes = el('section', 'vx-mode-section');
    var modeHead = el('div', 'vx-section-heading');
    modeHead.innerHTML = '<div><span class="vx-section-kicker">QUICK DEPLOY</span><h3>Choose a match format</h3><p>Start from a preset, then change any setting before you create the code.</p></div><span class="vx-section-count">4 presets</span>';
    modes.appendChild(modeHead);
    var modeGrid = el('div', 'vx-mode-grid');
    var presets = [
      {icon:'⚡',title:'Rapid Duel',desc:'10 mixed PYQs with a tight clock. Good for a fast accuracy check.',meta:'10 Q · 7 MIN',count:10,time:7,cap:8,shuffle:true},
      {icon:'🎯',title:'NDA Sprint',desc:'20 mixed questions built for an exam-style session with enough time to think.',meta:'20 Q · 20 MIN',count:20,time:20,cap:10,shuffle:true},
      {icon:'🛡️',title:'Long Run',desc:'40-question endurance round for concentration and consistency.',meta:'40 Q · 40 MIN',count:40,time:40,cap:15,shuffle:true},
      {icon:'🔭',title:'Open Challenge',desc:'Start from a balanced mixed bank and customise everything yourself.',meta:'CUSTOMISE ALL',count:30,time:25,cap:10,shuffle:false}
    ];
    presets.forEach(function(preset){
      var card=el('button','vx-mode-card');
      card.type='button';
      card.innerHTML='<span class="vx-mode-icon" aria-hidden="true">'+preset.icon+'</span><span class="vx-mode-title">'+esc(preset.title)+'</span><span class="vx-mode-desc">'+esc(preset.desc)+'</span><span class="vx-mode-meta">'+esc(preset.meta)+'</span>';
      card.addEventListener('click',function(){
        var d=defaultDraft();
        d.count=preset.count;d.timeUnit='min';d.timeValue=preset.time;d.timeM=preset.time;d.timeH=0;d.timeS=0;d.cap=preset.cap;d.shuffleOrder=!!preset.shuffle;
        S.draft=d;go('create');
      });
      modeGrid.appendChild(card);
    });
    modes.appendChild(modeGrid);
    w.appendChild(modes);

    var brief=el('section','vx-arena-brief');
    var briefCard=el('div','vx-brief-card');
    briefCard.innerHTML='<h4>How a VAANI Arena match works</h4><p>You create a code with locked settings. Every player who joins gets the same question set and the result board stays tied to that match code until it expires.</p><div class="vx-steps-mini"><div class="vx-step-mini"><b>01 · SET</b><span>Pick bank, count, clock and expiry.</span></div><div class="vx-step-mini"><b>02 · SHARE</b><span>Send the compact code or link.</span></div><div class="vx-step-mini"><b>03 · COMPARE</b><span>Review score, time and standings.</span></div></div>';
    brief.appendChild(briefCard);
    var standards=el('div','vx-brief-card');
    standards.innerHTML='<h4>Match standards</h4><p>Designed to keep shared matches fair and easy to understand.</p><div class="vx-standards"><span class="vx-standard-pill">Same question set</span><span class="vx-standard-pill">Locked settings</span><span class="vx-standard-pill">Seeded shuffle</span><span class="vx-standard-pill">Expiry aware</span><span class="vx-standard-pill">Review mode</span></div>';
    brief.appendChild(standards);
    w.appendChild(brief);

    var recentSection = el('section', 'vx-recent-section');
    var recentHeading = el('div', 'vx-section-heading');
    recentHeading.innerHTML = '<div><span class="vx-section-kicker">MATCH HISTORY</span><h3>Your recent matches</h3><p>Quick access to codes you created or joined with this account.</p></div><span class="vx-section-count">' + recent.length + ' shown</span>';
    recentSection.appendChild(recentHeading);
    if (recent.length) {
      var board = el('div', 'vx-board vx-recent-board');
      recent.forEach(function (r) {
        var row = el('div', 'vx-row vx-recent-row');
        var expired = Date.now() >= Number(r.expiresAt);
        var score = r.myScore != null ? r.myScore + '/' + r.count : '—';
        row.innerHTML =
          '<span class="vx-rank ' + (expired ? 'is-closed' : 'is-open') + '">' + (expired ? '&times;' : '&bull;') + '</span>' +
          '<span class="vx-recent-main"><strong class="vx-recent-code">' + esc(A.prettyCode(r.code)) + '</strong><small class="vx-recent-meta">' +
            esc(String(r.count)) + ' questions · ' + esc(String(r.source)) +
            (expired ? ' · Closed' : ' · Open until ' + esc(new Date(r.expiresAt).toLocaleString())) +
          '</small></span>' +
          '<span class="vx-score">' + esc(score) + '</span>';
        var btnRow = el('div', 'vx-recent-actions');
        if (!expired) {
          var shareBtn = el('button', 'vx-btn ghost', 'Share');
          shareBtn.type = 'button';
          shareBtn.addEventListener('click', function () {
            var sm = hydrateMatch(A.decode(r.code), r.hostName, r.hostAvatar);
            if (!sm) { say('That code could not be read.'); return; }
            S.match = sm;
            go('share');
          });
          btnRow.appendChild(shareBtn);
        }
        var b = el('button', 'vx-btn ghost', expired ? 'Board' : 'Open');
        b.type = 'button';
        b.addEventListener('click', function () {
          var m = hydrateMatch(A.decode(r.code), r.hostName, r.hostAvatar);
          if (!m) { say('That code could not be read.'); return; }
          S.match = m;
          if (expired) { S.result = null; S.rows = []; go('result'); }
          else go('briefing');
        });
        btnRow.appendChild(b);
        row.appendChild(btnRow);
        board.appendChild(row);
      });
      recentSection.appendChild(board);
    } else {
      var noRecent = el('div', 'vx-empty vx-recent-empty', 'Your match history will appear here after you create or join a match.');
      recentSection.appendChild(noRecent);
    }
    w.appendChild(recentSection);

    var help = el('button', 'vx-btn ghost', 'How Arena works');
    help.type = 'button';
    help.style.marginTop = '22px';
    help.addEventListener('click', function () { go('help'); });
    w.appendChild(help);
  }

  /* ---------------------------------------------------------
     HELP
     --------------------------------------------------------- */
  function screenHelp(w) {
    backBtn(w, 'Arena', 'home');
    w.appendChild(el('h3', null, 'How Arena works'));
    var ol = el('ol', 'vx-steps');
    ol.innerHTML =
      '<li><b>The host sets the test.</b> Question bank (NDA, CDS, AFCAT or a combined mix), how many questions, the time limit, how many players can join, and the date the code closes.</li>' +
      '<li><b>A code is generated.</b> Share it however you like. The code carries the settings, so nothing needs to be uploaded anywhere.</li>' +
      '<li><b>Everyone gets the same questions.</b> Up to ' + MAX_PLAYERS + ' players can use one code. The question set is identical for all of them — only the order changes, and only if the host asked for that.</li>' +
      '<li><b>Play whenever you like, before the deadline.</b> Players do not have to start together. Once the closing time passes, the code stops working and no new attempts are accepted.</li>' +
      '<li><b>One attempt each.</b> Your score and your finishing time both count — a tie on score is broken by whoever was faster.</li>';
    w.appendChild(ol);
    var note = el('p', 'vx-sub');
    note.style.marginTop = '18px';
    note.innerHTML = A.sync.shared
      ? 'The shared board is live. New attempts are submitted to the common match board and appear for every participant.'
      : 'This board contains attempts saved on this device. Shared scores are disabled until a signed-in server verifies each attempt.';
    w.appendChild(note);
  }

  /* ---------------------------------------------------------
     CREATE
     --------------------------------------------------------- */
  function defaultDraft() {
    var sources = VX.availableSources ? VX.availableSources() : [];
    var d = new Date(Date.now() + 3 * 864e5);
    return {
      source: sources.length > 1 ? 'BOTH' : (sources[0] ? sources[0].code : 'NDA'),
      count: 20,
      timeUnit: 'min', timeValue: 20,
      timeH: 0, timeM: 20, timeS: 0,
      cap: 10,
      shuffleOrder: false,
      deadline: d.toISOString().slice(0, 16),
      type: null,       // null = Mixed (every type)
      paperKey: null,   // null = Any paper
      perQOn: false, perQSeconds: 30,
      negMark: 0        // 0 = no penalty, index into NEG_MARKS
    };
  }
  function hmsFromSeconds(total) {
    total = Math.max(0, Math.round(total));
    return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
  }
  function draftSeconds(d) {
    var secs;
    if (d.timeUnit === 'mixed') {
      secs = (d.timeH || 0) * 3600 + (d.timeM || 0) * 60 + (d.timeS || 0);
    } else {
      var mult = d.timeUnit === 'sec' ? 1 : d.timeUnit === 'hr' ? 3600 : 60;
      secs = d.timeValue * mult;
    }
    return Math.max(1, Math.min(46655, Math.round(secs)));
  }
  function draftPool(d) { return A.poolForDraft(d.source, d.type, d.paperKey); }


  /* =========================================================
     ARENA V2 UI
     The data/match engine stays unchanged; these views are a
     deeper command-console presentation layered over it.
     ========================================================= */

  function matchHostName(m) {
    if (m && m.hostName) return String(m.hostName);
    if (m && m.code) {
      var recent = loadRecent();
      var hit = recent.filter(function (r) { return r.code === m.code; })[0];
      if (hit && hit.hostName) return String(hit.hostName);
    }
    return '';
  }

  function profileAvatarSnapshot() {
    try {
      var p = (typeof State !== 'undefined' && State.profilePhoto) ? State.profilePhoto : null;
      if (!p || !p.src) return null;
      var src = String(p.src || '');
      if (!/^(?:https?:\/\/|data:image\/)/i.test(src)) return null;
      if (src.length > 18000) return null;
      return { src: src, x: Number(p.x) || 50, y: Number(p.y) || 50, zoom: Number(p.zoom) || 1 };
    } catch (e) { return null; }
  }
  function hostAvatarSnapshot(m) {
    if (m && m.hostAvatar && m.hostAvatar.src) return m.hostAvatar;
    return isHost(m && m.code) ? profileAvatarSnapshot() : null;
  }
  function arenaAvatarHtml(photo, name, cls) {
    var safe = photo && photo.src && /^(?:https?:\/\/|data:image\/)/i.test(String(photo.src)) ? String(photo.src) : '';
    var n = String(name || 'Cadet').trim() || 'Cadet';
    var initial = n.slice(0, 1).toUpperCase() || 'C';
    var x = photo && Number.isFinite(Number(photo.x)) ? Number(photo.x) : 50;
    var y = photo && Number.isFinite(Number(photo.y)) ? Number(photo.y) : 50;
    var zoom = photo && Number.isFinite(Number(photo.zoom)) ? Number(photo.zoom) : 1;
    return '<span class="' + cls + (safe ? ' has-photo' : '') + '">' +
      (safe ? '<img src="' + esc(safe) + '" alt="" loading="eager" decoding="async" style="object-position:' + x + '% ' + y + '%;transform:scale(' + zoom + ')">' : esc(initial)) +
      '</span>';
  }
  function hydrateMatch(m, hostName, hostAvatar) {
    if (!m) return m;
    var known = hostName || matchHostName(m);
    if (known) m.hostName = String(known).slice(0, 40);
    if (hostAvatar && hostAvatar.src) m.hostAvatar = hostAvatar;
    return m;
  }

  function applySharedMatchMetadata(m, meta) {
    if (!m || !meta) return m;
    if (meta.host_name) m.hostName = String(meta.host_name).slice(0, 40);
    if (meta.host_pid) m.hostPid = String(meta.host_pid).slice(0, 80);
    if (meta.host_avatar && typeof meta.host_avatar === 'object' && meta.host_avatar.src) {
      m.hostAvatar = meta.host_avatar;
    }
    if (meta.expires_at) m.expiresAt = Number(meta.expires_at) || m.expiresAt;
    if (Array.isArray(meta.question_ids) && meta.question_ids.length) {
      m.frozenQuestionIds = meta.question_ids.map(function (id) { return String(id || ''); }).filter(Boolean);
    }
    if (Array.isArray(meta.question_snapshot) && meta.question_snapshot.length) {
      m.frozenQuestions = meta.question_snapshot.map(snapshotArenaQuestion).filter(Boolean);
      if (!m.frozenQuestionIds || !m.frozenQuestionIds.length) {
        m.frozenQuestionIds = m.frozenQuestions.map(function (q) { return String(q._id || ''); }).filter(Boolean);
      }
    }
    rememberMatch(m);
    return m;
  }

  function registerSharedMatchMetadata(m) {
    if (!m || !m.code || !isHost(m.code) || !A.sync || typeof A.sync.registerMatch !== 'function') {
      return Promise.resolve(null);
    }
    return A.sync.registerMatch(m).then(function(payload) {
      return applySharedMatchMetadata(m, payload);
    }).catch(function() {
      return null;
    });
  }

  function fetchSharedMatchMetadata(m) {
    if (!m || !m.code || !A.sync || typeof A.sync.getMatchMetadata !== 'function') {
      return Promise.resolve(m);
    }
    var code = String(m.code);
    if (S._metadataRequests[code]) return S._metadataRequests[code];
    if (S._metadataLoaded[code]) return Promise.resolve(m);

    var request = A.sync.getMatchMetadata(code).then(function(meta) {
      // Mark this code as resolved even when the server has no extra metadata.
      // That prevents a render -> fetch -> render loop on stale/legacy matches.
      S._metadataLoaded[code] = true;
      if (meta) applySharedMatchMetadata(m, meta);
      return m;
    }).catch(function() {
      // A failed metadata lookup must also be one-shot for this rendered screen;
      // otherwise the briefing would continuously rebuild itself and jump.
      S._metadataLoaded[code] = true;
      return m;
    });

    S._metadataRequests[code] = request;
    request.then(function() {
      delete S._metadataRequests[code];
    }, function() {
      delete S._metadataRequests[code];
    });
    return request;
  }

  function arenaInviteUrl(m) {
    var hostName = matchHostName(m);
    var avatar = hostAvatarSnapshot(m);
    var url = location.origin + location.pathname + '?arena=' + encodeURIComponent(m.code);
    if (hostName) url += '&host=' + encodeURIComponent(hostName);
    if (avatar && avatar.src) {
      url += '&av=' + encodeURIComponent(avatar.src) + '&ax=' + encodeURIComponent(avatar.x) + '&ay=' + encodeURIComponent(avatar.y) + '&az=' + encodeURIComponent(avatar.zoom);
    }
    return url;
  }

  function parseArenaInvite(raw) {
    var value = String(raw || '').trim();
    var code = value, hostName = '', avatarSrc = '';
    var avatar = null;
    try {
      var u = new URL(value, location.href);
      if (u.searchParams.get('arena')) {
        code = u.searchParams.get('arena') || '';
        hostName = u.searchParams.get('host') || '';
        avatarSrc = u.searchParams.get('av') || '';
        if (avatarSrc) avatar = {src: avatarSrc, x:Number(u.searchParams.get('ax'))||50, y:Number(u.searchParams.get('ay'))||50, zoom:Number(u.searchParams.get('az'))||1};
      }
    } catch (e) {}
    if (!hostName) {
      var mHost = value.match(/[?&]host=([^&#\s]+)/i);
      if (mHost) { try { hostName = decodeURIComponent(mHost[1]); } catch (e2) { hostName = mHost[1]; } }
    }
    var m = A.decode(code);
    return { match: hydrateMatch(m, hostName, avatar), hostName: hostName, hostAvatar: avatar };
  }

  function setupSection(kicker, title, copy, cls) {
    var section = el('section', 'vx-arena-setup-section' + (cls ? ' ' + cls : ''));
    var head = el('div', 'vx-arena-setup-section-head');
    head.innerHTML =
      '<div><span class="vx-arena-setup-kicker">' + esc(kicker) + '</span>' +
      '<h3>' + esc(title) + '</h3>' +
      (copy ? '<p>' + esc(copy) + '</p>' : '') + '</div>';
    section.appendChild(head);
    return section;
  }

  function setupSelect(label, options, current, onPick) {
    var wrap = el('label', 'vx-arena-select-wrap');
    var top = el('span', 'vx-arena-control-label', label);
    wrap.appendChild(top);
    var select = el('select', 'vx-arena-select');
    options.forEach(function (option) {
      var node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      if (option.value === String(current == null ? '' : current)) node.selected = true;
      select.appendChild(node);
    });
    select.addEventListener('change', function () { onPick(select.value); });
    wrap.appendChild(select);
    return wrap;
  }

  function setupChoiceButton(label, value, current, onPick, extraClass) {
    var button = el('button', 'vx-arena-choice' + (extraClass ? ' ' + extraClass : ''));
    button.type = 'button';
    button.setAttribute('aria-pressed', String(value === current));
    button.innerHTML = label;
    button.addEventListener('click', function () { onPick(value); });
    return button;
  }

  function screenCreateV2(w) {
    var d = S.draft || defaultDraft();
    S.draft = d;

    var shell = el('div', 'vx-arena-setup');
    var top = el('div', 'vx-arena-setup-top');
    var back = el('button', 'vx-back', '&larr; Arena');
    back.type = 'button';
    back.addEventListener('click', function () { go('home'); });
    top.appendChild(back);

    var titleBlock = el('div', 'vx-arena-setup-title');
    titleBlock.innerHTML =
      '<span class="vx-arena-setup-kicker">MATCH DEPLOYMENT</span>' +
      '<h2>Build your Arena</h2>' +
      '<p>Lock the question pool, challenge settings and match rules before generating the invite.</p>';
    top.appendChild(titleBlock);
    shell.appendChild(top);

    var summary = el('div', 'vx-arena-deploy-summary');
    shell.appendChild(summary);

    var form = el('div', 'vx-arena-setup-form');
    shell.appendChild(form);
    w.appendChild(shell);

    function draw() {
      form.innerHTML = '';
      var avail = VX.availableSources ? VX.availableSources() : [];
      var examCodes = avail.map(function (a) { return a.code; }).filter(function (code) {
        return code === 'NDA' || code === 'CDS' || code === 'AFCAT';
      });
      if (!examCodes.length) examCodes = ['NDA'];

      function selectedExamCodes() {
        var picked = sourceExamCodes(d.source).filter(function (code) { return examCodes.indexOf(code) >= 0; });
        if (!picked.length) picked = [examCodes[0]];
        return ['NDA','CDS','AFCAT'].filter(function (code) { return picked.indexOf(code) >= 0; });
      }
      function syncDraftSource(codes) {
        d.source = normalizedSourceFromCodes(codes);
      }

      var pickedCodes = selectedExamCodes();
      syncDraftSource(pickedCodes);

      var typeOptsRaw = typesFor(d.source);
      if (d.type && typeOptsRaw.indexOf(d.type) < 0) d.type = null;
      var paperOptsRaw = papersFor(d.source);
      if (d.paperKey && !paperOptsRaw.some(function (p) { return p.key === d.paperKey; })) d.paperKey = null;

      var max = draftPool(d).length;
      if (max > 0) d.count = Math.max(1, Math.min(max, Number(d.count) || 1));
      else d.count = 1;

      var seconds = draftSeconds(d);
      var hostDisplay = playerName();

      summary.innerHTML =
        '<div class="vx-deploy-summary-main">' +
          '<span class="vx-deploy-summary-kicker">READY TO DEPLOY</span>' +
          '<strong id="vxDeployHeadline">' + esc(d.count + ' questions · ' + timeLabel(seconds)) + '</strong>' +
          '<span id="vxDeployPool">' + esc(sourceLabel(d.source).replace(/\+/g, ' + ') + ' · ' + max + ' available') + '</span>' +
        '</div>' +
        '<div class="vx-deploy-summary-grid">' +
          '<div><span>HOST</span><strong>' + esc(hostDisplay) + '</strong></div>' +
          '<div><span>PLAYERS</span><strong>' + esc(String(d.cap)) + '</strong></div>' +
          '<div><span>PENALTY</span><strong>' + esc(NEG_LABELS[d.negMark].replace('&minus;', '−')) + '</strong></div>' +
          '<div><span>ORDER</span><strong>' + esc(d.shuffleOrder ? 'Per player' : 'Same') + '</strong></div>' +
        '</div>';

      /* 01 — pool */
      var pool = setupSection('01 · QUESTION SELECTION', 'Pick exactly what the squad will face',
        'Click two or more exam banks to combine them. The seed locks the combined question set identically across every device. Filters only change the pool before the match is created.');
      var sourceGrid = el('div', 'vx-arena-source-grid');
      var sourceStatus = el('div', 'vx-arena-source-selection');
      sourceStatus.innerHTML =
        '<span class="vx-arena-source-selection-dot"></span>' +
        '<strong>' + pickedCodes.length + ' bank' + (pickedCodes.length === 1 ? '' : 's') + ' selected</strong>' +
        '<span>' + esc(pickedCodes.join(' + ')) + '</span>';
      pool.appendChild(sourceStatus);

      examCodes.forEach(function (code) {
        var item = avail.filter(function (a) { return a.code === code; })[0] || {};
        var selected = pickedCodes.indexOf(code) >= 0;
        var card = el('button', 'vx-arena-source-card' + (selected ? ' is-selected' : ''));
        card.type = 'button';
        card.innerHTML =
          '<span class="vx-arena-source-icon">' + (code === 'NDA' ? 'N' : code === 'CDS' ? 'C' : 'A') + '</span>' +
          '<span class="vx-arena-source-name">' + esc(code) + '</span>' +
          '<span class="vx-arena-source-count">' + esc(String(Number(item.count || 0))) + ' questions</span>' +
          '<span class="vx-arena-source-check">✓</span>';
        card.setAttribute('aria-pressed', String(selected));
        card.setAttribute('aria-label', code + (selected ? ' selected' : ' not selected'));
        card.addEventListener('click', function () {
          var next = pickedCodes.filter(function (name) { return name !== code; });
          if (!selected) next.push(code);
          if (!next.length) return;
          syncDraftSource(next);
          draw();
        });
        sourceGrid.appendChild(card);
      });

      if (examCodes.length === 3) {
        var allSelected = d.source === 'BOTH';
        var totalAll = examCodes.reduce(function (sum, code) {
          var item = avail.filter(function (a) { return a.code === code; })[0] || {};
          return sum + Number(item.count || 0);
        }, 0);
        var allCard = el('button', 'vx-arena-source-card vx-arena-source-card-all' + (allSelected ? ' is-selected' : ''));
        allCard.type = 'button';
        allCard.innerHTML =
          '<span class="vx-arena-source-icon">N+C+A</span>' +
          '<span class="vx-arena-source-name">All banks</span>' +
          '<span class="vx-arena-source-count">' + esc(String(totalAll)) + ' questions</span>' +
          '<span class="vx-arena-source-check">✓</span>';
        allCard.setAttribute('aria-pressed', String(allSelected));
        allCard.setAttribute('aria-label', allSelected ? 'All exam banks selected' : 'Select all exam banks');
        allCard.addEventListener('click', function () {
          syncDraftSource(allSelected ? [examCodes[0]] : examCodes.slice());
          draw();
        });
        sourceGrid.appendChild(allCard);
      }
      pool.appendChild(sourceGrid);

      var filterGrid = el('div', 'vx-arena-filter-grid');
      filterGrid.appendChild(setupSelect('Paper', [{value:'',label:'Any paper · all years mixed'}].concat(
        paperOptsRaw.map(function (p) {
          return { value: p.key, label: String(p.exam || '') + ' ' + String(p.s || '') + ' ' + String(p.y || '') + ' · ' + p.count + ' Q' };
        })
      ), d.paperKey || '', function (v) { d.paperKey = v || null; draw(); }));

      filterGrid.appendChild(setupSelect('Question type', [{value:'',label:'Mixed · every question type'}].concat(
        typeOptsRaw.map(function (t) { return { value: t, label: t }; })
      ), d.type || '', function (v) { d.type = v || null; draw(); }));

      pool.appendChild(filterGrid);

      var availability = el('div', 'vx-arena-availability');
      availability.innerHTML =
        '<span class="vx-arena-availability-dot"></span>' +
        '<span><strong>' + esc(String(max)) + ' questions</strong> are available after these filters.</span>' +
        (d.paperKey || d.type ? '<button type="button">Reset filters</button>' : '');
      if (d.paperKey || d.type) {
        availability.querySelector('button').addEventListener('click', function () {
          d.paperKey = null; d.type = null; draw();
        });
      }
      pool.appendChild(availability);
      form.appendChild(pool);

      /* 02 — challenge */
      var challenge = setupSection('02 · CHALLENGE SETTINGS', 'Choose the pace',
        'Make the round short and sharp or give the squad an endurance test.');
      var challengeGrid = el('div', 'vx-arena-challenge-grid');

      var countCard = el('div', 'vx-arena-control-card');
      countCard.innerHTML = '<span class="vx-arena-control-label">Questions</span><p class="vx-arena-control-hint">How many questions will everyone receive?</p>';
      var countChoices = el('div', 'vx-arena-choice-grid');
      [10,15,20,25,30,50,75,100].filter(function (v) { return v <= max; }).forEach(function (v) {
        countChoices.appendChild(setupChoiceButton(String(v), v, d.count, function (value) { d.count = value; draw(); }));
      });
      countCard.appendChild(countChoices);
      var countInput = el('input', 'vx-arena-inline-number');
      countInput.type = 'number'; countInput.min = '1'; countInput.max = String(Math.max(1, Math.min(max, 1295))); countInput.value = String(d.count);
      countInput.setAttribute('aria-label', 'Custom number of questions');
      countInput.addEventListener('change', function () {
        d.count = Math.max(1, Math.min(Number(countInput.max), parseInt(countInput.value, 10) || 1)); draw();
      });
      countCard.appendChild(countInput);
      challengeGrid.appendChild(countCard);

      var timeCard = el('div', 'vx-arena-control-card');
      timeCard.innerHTML = '<span class="vx-arena-control-label">Overall clock</span><p class="vx-arena-control-hint">Everyone gets the same total time.</p>';
      var timeUnitChoices = el('div', 'vx-arena-choice-grid two');
      ['min','sec','hr','mixed'].forEach(function (unit) {
        timeUnitChoices.appendChild(setupChoiceButton(
          unit === 'min' ? 'Minutes' : unit === 'sec' ? 'Seconds' : unit === 'hr' ? 'Hours' : 'H · M · S',
          unit, d.timeUnit, function (v) {
            if (v === 'mixed' && d.timeUnit !== 'mixed') {
              var hms = hmsFromSeconds(draftSeconds(d)); d.timeH = hms.h; d.timeM = hms.m; d.timeS = hms.s;
            } else if (v !== 'mixed' && d.timeUnit === 'mixed') {
              var total = draftSeconds(d);
              d.timeValue = v === 'sec' ? total : v === 'min' ? Math.max(1, Math.round(total / 60)) : Math.max(1, Math.round(total / 3600));
            } else if (v !== 'mixed' && d.timeUnit !== 'mixed') {
              if (v === 'sec' && d.timeUnit === 'min') d.timeValue *= 60;
              else if (v === 'min' && d.timeUnit === 'sec') d.timeValue = Math.max(1, Math.round(d.timeValue / 60));
              else if (v === 'min' && d.timeUnit === 'hr') d.timeValue *= 60;
              else if (v === 'hr' && d.timeUnit === 'min') d.timeValue = Math.max(1, Math.round(d.timeValue / 60));
              else if (v === 'sec' && d.timeUnit === 'hr') d.timeValue *= 3600;
              else if (v === 'hr' && d.timeUnit === 'sec') d.timeValue = Math.max(1, Math.round(d.timeValue / 3600));
            }
            d.timeUnit = v; draw();
          }
        ));
      });
      timeCard.appendChild(timeUnitChoices);

      if (d.timeUnit === 'mixed') {
        var hmsGrid = el('div', 'vx-arena-hms-grid');
        [['Hours','timeH',12],['Minutes','timeM',59],['Seconds','timeS',59]].forEach(function (item) {
          var lab = el('label', 'vx-arena-hms');
          lab.innerHTML = '<span>' + item[0] + '</span>';
          var inp = el('input', 'vx-arena-inline-number');
          inp.type = 'number'; inp.min = '0'; inp.max = String(item[2]); inp.value = String(d[item[1]] || 0);
          inp.addEventListener('change', function () { d[item[1]] = Math.max(0, Math.min(item[2], parseInt(inp.value, 10) || 0)); draw(); });
          lab.appendChild(inp); hmsGrid.appendChild(lab);
        });
        timeCard.appendChild(hmsGrid);
      } else {
        var presets = {sec:[15,20,30,40,45,60,90], min:[5,10,15,20,25,30,45], hr:[1,2,3,4,6,8,12]};
        var timeChoices = el('div', 'vx-arena-choice-grid');
        presets[d.timeUnit].forEach(function (v) {
          timeChoices.appendChild(setupChoiceButton(String(v) + (d.timeUnit === 'sec' ? 's' : d.timeUnit === 'min' ? ' min' : ' hr'), v, d.timeValue, function (value) { d.timeValue = value; draw(); }));
        });
        timeCard.appendChild(timeChoices);
        var timeInput = el('input', 'vx-arena-inline-number');
        timeInput.type='number'; timeInput.min='1'; timeInput.max=String({sec:3600,min:300,hr:12}[d.timeUnit]); timeInput.value=String(d.timeValue);
        timeInput.setAttribute('aria-label','Custom time limit');
        timeInput.addEventListener('change',function(){d.timeValue=Math.max(1,Math.min(Number(timeInput.max),parseInt(timeInput.value,10)||1));draw();});
        timeCard.appendChild(timeInput);
      }

      var timeRead = el('div', 'vx-arena-mini-readout');
      timeRead.innerHTML = '<span>LIVE CLOCK</span><strong>' + esc(timeLabel(seconds)) + '</strong>';
      timeCard.appendChild(timeRead);
      challengeGrid.appendChild(timeCard);
      challenge.appendChild(challengeGrid);

      var perQ = el('div', 'vx-arena-inline-row');
      perQ.innerHTML = '<div><span class="vx-arena-control-label">Per-question timer</span><p class="vx-arena-control-hint">Optional. Auto-advance each question when its countdown ends.</p></div>';
      var perQControls = el('div', 'vx-arena-inline-actions');
      [false,true].forEach(function(v){ perQControls.appendChild(setupChoiceButton(v ? 'On' : 'Off', v, d.perQOn, function(value){d.perQOn=value;draw();})); });
      perQ.appendChild(perQControls);
      if (d.perQOn) {
        var pq = el('input', 'vx-arena-inline-number vx-arena-inline-number-small');
        pq.type='number';pq.min='5';pq.max='1295';pq.value=String(d.perQSeconds);
        pq.setAttribute('aria-label','Seconds per question');
        pq.addEventListener('change',function(){d.perQSeconds=Math.max(5,Math.min(1295,parseInt(pq.value,10)||5));draw();});
        perQ.appendChild(pq);
        perQ.appendChild(el('span','vx-arena-inline-suffix','seconds / question'));
      }
      challenge.appendChild(perQ);
      form.appendChild(challenge);

      /* 03 — rules */
      var rules = setupSection('03 · MATCH RULES', 'Lock the playing conditions',
        'These rules are encoded with the match and shown to every player before the attempt.');
      var rulesGrid = el('div','vx-arena-rules-grid');

      var penalty = el('div','vx-arena-control-card');
      penalty.innerHTML='<span class="vx-arena-control-label">Negative marking</span><p class="vx-arena-control-hint">Wrong answers lose marks; blanks remain unpenalised.</p>';
      var penaltyChoices=el('div','vx-arena-choice-grid');
      [0,1,2,3].forEach(function(v){penaltyChoices.appendChild(setupChoiceButton(NEG_LABELS[v].replace('&minus;','−'),v,d.negMark,function(value){d.negMark=value;draw();}));});
      penalty.appendChild(penaltyChoices); rulesGrid.appendChild(penalty);

      var players = el('div','vx-arena-control-card');
      players.innerHTML='<span class="vx-arena-control-label">Player cap</span><p class="vx-arena-control-hint">How many people can use the invite?</p>';
      var playerChoices=el('div','vx-arena-choice-grid');
      [2,3,5,10,15,20,25,50,100].forEach(function(v){playerChoices.appendChild(setupChoiceButton(String(v),v,d.cap,function(value){d.cap=value;draw();}));});
      players.appendChild(playerChoices); rulesGrid.appendChild(players);

      var order = el('div','vx-arena-control-card');
      order.innerHTML='<span class="vx-arena-control-label">Question order</span><p class="vx-arena-control-hint">Same questions; optionally shuffle their order per player.</p>';
      var orderChoices=el('div','vx-arena-choice-grid two');
      orderChoices.appendChild(setupChoiceButton('Same for everyone',false,d.shuffleOrder,function(value){d.shuffleOrder=value;draw();}));
      orderChoices.appendChild(setupChoiceButton('Shuffle per player',true,d.shuffleOrder,function(value){d.shuffleOrder=value;draw();}));
      order.appendChild(orderChoices); rulesGrid.appendChild(order);

      var deadline = el('label','vx-arena-control-card');
      deadline.innerHTML='<span class="vx-arena-control-label">Invite closes</span><p class="vx-arena-control-hint">After this point, new attempts cannot start.</p>';
      var dl = el('input','vx-arena-datetime');
      dl.type='datetime-local'; dl.value=d.deadline; dl.min=new Date(Date.now()+6e4).toISOString().slice(0,16);
      dl.addEventListener('change',function(){d.deadline=dl.value;draw();});
      deadline.appendChild(dl); rulesGrid.appendChild(deadline);

      rules.appendChild(rulesGrid);
      form.appendChild(rules);

      /* deploy bar */
      var actionBar = el('div','vx-arena-deploy-bar');
      var closeHint = el('div','vx-arena-deploy-note');
      closeHint.innerHTML='<span class="vx-arena-deploy-icon">⌁</span><div><strong>Host: ' + esc(hostDisplay) + '</strong><span>Generate the code only when everything above is ready.</span></div>';
      actionBar.appendChild(closeHint);
      var actionButtons=el('div','vx-arena-deploy-actions');
      var cancel=el('button','vx-btn ghost','Cancel');cancel.type='button';cancel.addEventListener('click',function(){go('home');});
      var make=el('button','vx-btn primary','Generate Arena invite →');make.type='button';
      if(max<1||seconds<=0){make.disabled=true;make.textContent='No valid questions / clock';}
      make.addEventListener('click',function(){
        var expiresAt=new Date(d.deadline).getTime();
        if(!expiresAt||expiresAt<=Date.now()){say('Pick a closing time in the future.');return;}
        var match={
          source:d.source,count:d.count,seconds:seconds,cap:Math.min(d.cap,MAX_PLAYERS),
          shuffleOrder:d.shuffleOrder,seed:Math.floor(Math.random()*2176782335),expiresAt:expiresAt,
          type:d.type,paperKey:d.paperKey,perQSeconds:d.perQOn?d.perQSeconds:0,negMark:d.negMark,
          hostName:playerName(),hostAvatar:profileAvatarSnapshot()
        };
        match.code=A.encode(match);
        var parsed=A.decode(match.code);
        if(!parsed){say('Could not build a code from those settings.');return;}
        parsed.hostName=match.hostName;
        parsed.hostAvatar=match.hostAvatar;
        freezeMatchQuestions(parsed);
        S.match=parsed;
        S.hostName=match.hostName;
        markHost(parsed.code);
        rememberMatch(parsed);
        registerSharedMatchMetadata(parsed);
        go('share');
      });
      actionButtons.appendChild(cancel);actionButtons.appendChild(make);actionBar.appendChild(actionButtons);
      form.appendChild(actionBar);
    }
    draw();
  }

  function screenShareV2(w) {
    var m = hydrateMatch(S.match);
    registerSharedMatchMetadata(m);
    S.match = m;
    var hostName = matchHostName(m);
    var ownHost = isHost(m.code);

    var shell = el('div','vx-arena-share');
    var back = el('button','vx-back','&larr; Arena');
    back.type='button';back.addEventListener('click',function(){go('home');});
    shell.appendChild(back);

    var hero = el('div','vx-arena-share-hero');
    hero.innerHTML =
      '<div class="vx-share-eyebrow"><span>ARENA DEPLOYED</span><b>' + (ownHost ? 'HOST CONTROL' : 'MATCH READY') + '</b></div>' +
      '<h2>' + (ownHost ? 'Your match is live.' : 'Match ready to enter.') + '</h2>' +
      '<p>' + (ownHost ? 'The invite is locked. You can enter the test yourself or open the host board and answer key.' : 'Use the invite link or code below to enter the same locked question set.') + '</p>';
    if(hostName){
      var hostLine=el('div','vx-host-identity');
      hostLine.innerHTML=arenaAvatarHtml(hostAvatarSnapshot(m),hostName,'vx-host-avatar')+'<span><small>HOSTED BY</small><strong>'+esc(hostName)+'</strong></span>';
      hero.appendChild(hostLine);
    }
    shell.appendChild(hero);

    var codeCard=el('div','vx-arena-invite-card');
    codeCard.innerHTML =
      '<div class="vx-invite-kicker">MATCH INVITE</div>' +
      '<div class="vx-invite-code"><code>' + esc(A.prettyCode(m.code)) + '</code></div>' +
      '<div class="vx-invite-meta">' + matchStrip(m).outerHTML + '</div>';
    shell.appendChild(codeCard);

    var inviteUrl=arenaInviteUrl(m);
    var actions=el('div','vx-arena-host-actions'+(ownHost?' is-host-choice':''));
    if(ownHost){
      var participate=el('button','vx-btn primary vx-host-action-main vx-host-participate');
      participate.type='button';
      participate.innerHTML='<span class="vx-host-choice-kicker">PARTICIPATE</span><strong>Enter Arena</strong><small>Take the test under normal player rules.</small><b aria-hidden="true">→</b>';
      participate.addEventListener('click',function(){S.hostSpectate=false;go('briefing');});
      actions.appendChild(participate);

      var spectate=el('button','vx-btn vx-host-action-secondary vx-host-spectate');
      spectate.type='button';
      spectate.innerHTML='<span class="vx-host-choice-kicker">HOST CONTROL</span><strong>Spectate</strong><small>See answers, leaderboard and question-level performance without attempting.</small><b aria-hidden="true">◉</b>';
      spectate.addEventListener('click',function(){
        if(!isHost(m.code)){say('Host spectate is only available on the host device.');return;}
        S.hostSpectate=true;
        S.result=null;
        loadBoard().then(function(){go('result');}).catch(function(){go('result');});
      });
      actions.appendChild(spectate);
    }else{
      var enter=el('button','vx-btn primary vx-host-action-main');
      enter.type='button';
      enter.innerHTML='Join Arena <span>→</span>';
      enter.addEventListener('click',function(){S.hostSpectate=false;go('briefing');});
      actions.appendChild(enter);

      var hasOwnAttempt=!!previousAttempt(m.code);
      var boardBtn=el('button','vx-btn ghost vx-host-action-secondary');
      boardBtn.type='button';
      boardBtn.textContent=hasOwnAttempt?'View leaderboard':'Leaderboard after attempt';
      boardBtn.disabled=!hasOwnAttempt;
      boardBtn.setAttribute('aria-disabled',String(!hasOwnAttempt));
      boardBtn.addEventListener('click',function(){
        if(!hasOwnAttempt){
          say('Finish your official attempt to unlock the leaderboard and answer review.');
          return;
        }
        loadBoard().then(function(){go('result');}).catch(function(){go('result');});
      });
      actions.appendChild(boardBtn);
    }
    shell.appendChild(actions);

    var copyRow=el('div','vx-invite-copy-row');

    function copyText(value, onSuccess){
      value=String(value||'');
      function done(){
        if(typeof onSuccess==='function')onSuccess();
      }
      if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
        navigator.clipboard.writeText(value).then(done).catch(function(){
          try{
            var area=document.createElement('textarea');
            area.value=value;
            area.style.position='fixed';
            area.style.left='-9999px';
            area.setAttribute('readonly','');
            document.body.appendChild(area);
            area.select();
            var ok=document.execCommand('copy');
            area.remove();
            if(ok)done();else say('Copy is unavailable in this browser.');
          }catch(e){say('Copy is unavailable in this browser.');}
        });
        return;
      }
      try{
        var area=document.createElement('textarea');
        area.value=value;
        area.style.position='fixed';
        area.style.left='-9999px';
        area.setAttribute('readonly','');
        document.body.appendChild(area);
        area.select();
        var ok=document.execCommand('copy');
        area.remove();
        if(ok)done();else say('Copy is unavailable in this browser.');
      }catch(e){say('Copy is unavailable in this browser.');}
    }

    function actionButton(label, icon, className){
      var button=el('button','vx-btn ghost vx-invite-action '+className);
      button.type='button';
      button.innerHTML='<span class="vx-invite-action-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span>';
      return button;
    }

    var copyInvite=actionButton('Copy invite link','↗','vx-invite-copy-link');
    copyInvite.setAttribute('aria-label','Copy Arena invite link');
    copyInvite.addEventListener('click',function(){
      copyText(inviteUrl,function(){
        copyInvite.classList.add('is-done');
        copyInvite.querySelector('span:last-child').textContent='Link copied';
        setTimeout(function(){
          copyInvite.classList.remove('is-done');
          copyInvite.querySelector('span:last-child').textContent='Copy invite link';
        },1600);
      });
    });
    copyRow.appendChild(copyInvite);

    var copyCode=actionButton('Copy code','⌗','vx-invite-copy-code');
    copyCode.setAttribute('aria-label','Copy Arena match code');
    copyCode.addEventListener('click',function(){
      copyText(A.prettyCode(m.code),function(){
        copyCode.classList.add('is-done');
        copyCode.querySelector('span:last-child').textContent='Code copied';
        setTimeout(function(){
          copyCode.classList.remove('is-done');
          copyCode.querySelector('span:last-child').textContent='Copy code';
        },1600);
      });
    });
    copyRow.appendChild(copyCode);

    var share=actionButton('Share invite','↗','vx-invite-share');
    share.setAttribute('aria-label','Share Arena invite');
    share.addEventListener('click',function(){
      if(navigator.share){
        navigator.share({
          title:'VAANI Arena · '+(hostName||'Host'),
          text:'Join my VAANI Arena match hosted by '+(hostName||'the host')+'.',
          url:inviteUrl
        }).catch(function(){});
        return;
      }
      copyText(inviteUrl,function(){
        share.classList.add('is-done');
        share.querySelector('span:last-child').textContent='Link copied';
        say('Sharing is unavailable here, so the invite link was copied.');
        setTimeout(function(){
          share.classList.remove('is-done');
          share.querySelector('span:last-child').textContent='Share invite';
        },1800);
      });
    });
    copyRow.appendChild(share);

    shell.appendChild(copyRow);

    var note=el('div','vx-arena-host-note');
    note.innerHTML=ownHost
      ? '<span>HOST ACCESS</span><p><b>Participate</b> enters the normal test. <b>Spectate</b> opens the private host control room with the answer key, leaderboard and question-by-question player performance without starting an attempt. Use the action bar above to copy or share the invite at any time.</p>'
      : '<span>MATCH IDENTITY</span><p>Open the shared invite link to keep the host name attached to this match on your device.</p>';
    shell.appendChild(note);

    w.appendChild(shell);
  }

  function screenHostAnswers(w) {
    var m = hydrateMatch(S.match);
    if (!m || !isHost(m.code)) {
      w.appendChild(el('div','vx-empty','Host access is only available on the device that created this match.'));
      return;
    }
    if(!S.hostSpectate && !previousAttempt(m.code)){
      w.appendChild(el('div','vx-empty','Host answer access is reserved for Spectate mode before the host attempts the match.'));
      return;
    }

    var shell=el('div','vx-host-answer-key');
    var top=el('div','vx-host-answer-hero');
    top.innerHTML='<span class="vx-arena-setup-kicker">HOST ANSWER KEY</span><h2>' + esc(matchHostName(m) || 'Host') + ' · Control Room</h2><p>Correct options for this match, using the exact question set encoded in the invite.</p>';
    var back=el('button','vx-back','&larr; Leaderboard');
    back.type='button';back.addEventListener('click',function(){go('result');});
    top.appendChild(back);
    shell.appendChild(top);

    var tools=el('div','vx-host-answer-tools');
    var search=el('input','vx-board-search');search.type='search';search.placeholder='Search question or topic…';search.setAttribute('aria-label','Search answer key');
    tools.appendChild(search);
    shell.appendChild(tools);

    var list=el('div','vx-host-answer-list');
    shell.appendChild(list);
    w.appendChild(shell);

    var qs=matchQuestions();
    function drawAnswers(){
      list.innerHTML='';
      var query=String(search.value||'').trim().toLowerCase();
      qs.forEach(function(q,i){
        var hay=(String(q.q||'')+' '+String(q.sec||'')+' '+String(q.keyword||'')).toLowerCase();
        if(query && hay.indexOf(query)<0)return;
        var card=el('article','vx-host-answer-card');
        var prompt=questionPromptHtml(q);
        card.innerHTML='<div class="vx-host-answer-meta"><span>Q'+(i+1)+'</span><span>'+esc(q.sec||'Mixed')+'</span><span>'+esc((q._exam||'')+' '+(q.s||'')+' '+(q.y||''))+'</span></div>' +
          (q.passage?'<div class="pv-passage"><div class="pv-passage-label">Passage</div><div class="pv-passage-text">'+esc(q.passage)+'</div></div>':'') +
          '<div class="vx-host-answer-prompt">'+prompt+'</div>';
        var opts=el('div','vx-host-answer-options');
        (q.o||[]).forEach(function(option,oi){
          var row=el('div','vx-host-answer-option'+(oi===q.ans?' is-correct':''));
          row.innerHTML='<span class="vx-host-answer-letter">'+String.fromCharCode(65+oi)+'</span><span>'+esc(option)+'</span>'+(oi===q.ans?'<b>✓ CORRECT</b>':'');
          opts.appendChild(row);
        });
        card.appendChild(opts);list.appendChild(card);
      });
      if(!list.children.length)list.appendChild(el('div','vx-empty','No questions match that search.'));
    }
    search.addEventListener('input',drawAnswers);
    drawAnswers();

    var actions=el('div','vx-actions');
    var board=el('button','vx-btn primary','Back to leaderboard');board.type='button';board.addEventListener('click',function(){go('result');});
    actions.appendChild(board);
    var home=el('button','vx-btn ghost','Back to Arena');home.type='button';home.addEventListener('click',function(){go('home');});
    actions.appendChild(home);
    shell.appendChild(actions);
  }

  function screenCreate(w) {
    backBtn(w, 'Arena', 'home');
    w.appendChild(el('h3', null, 'Start a match'));
    w.appendChild(el('p', 'vx-sub', 'These settings are locked into the code once you create it.'));

    var d = S.draft;
    var form = el('div');
    form.style.cssText = 'display:flex;flex-direction:column;gap:30px;';
    w.appendChild(form);

    function seg(values, current, fmt, onPick) {
      var row = el('div', 'vx-seg');
      values.forEach(function (v) {
        var b = el('button', null, fmt(v));
        b.type = 'button';
        b.setAttribute('aria-pressed', String(v === current));
        b.addEventListener('click', function () { onPick(v); });
        row.appendChild(b);
      });
      return row;
    }

    function field(labelHtml) {
      var f = el('div', 'vx-field');
      var lbl = el('label', null, labelHtml);
      lbl.style.cssText = 'display:block;margin-bottom:12px;line-height:1.45';
      f.appendChild(lbl);
      return f;
    }

    function select(cls, options, current, onPick) {
      var s = el('select', cls);
      options.forEach(function (o) {
        var opt = el('option', null, esc(o.label));
        opt.value = o.value;
        if (o.value === (current || '')) opt.selected = true;
        s.appendChild(opt);
      });
      s.addEventListener('change', function () { onPick(s.value); });
      return s;
    }

    function draw() {
      form.innerHTML = '';
      var avail = VX.availableSources ? VX.availableSources() : [];
      var totalAll = avail.reduce(function (sum, a) { return sum + a.count; }, 0);
      var typeOptsRaw = typesFor(d.source);
      if (d.type && typeOptsRaw.indexOf(d.type) < 0) d.type = null;
      var paperOptsRaw = papersFor(d.source);
      if (d.paperKey && !paperOptsRaw.some(function (p) { return p.key === d.paperKey; })) d.paperKey = null;

      var max = draftPool(d).length;
      if (d.count > max) d.count = max;

      /* bank */
      var f0 = field('Question bank<span class="vx-hint">Questions are drawn at random from whichever bank you pick.</span>');
      var choices = avail.map(function (a) { return a.code; });
      if (avail.length > 1) choices.push('BOTH');
      if (!choices.length) choices = ['NDA'];
      f0.appendChild(seg(choices, d.source, function (v) {
        if (v === 'BOTH') return 'Both (' + totalAll + ')';
        var match = avail.filter(function (a) { return a.code === v; })[0];
        return v + ' (' + (match ? match.count : 0) + ')';
      }, function (v) { d.source = v; draw(); }));
      form.appendChild(f0);

      /* paper */
      var fP = field('Paper<span class="vx-hint">Pin the match to one specific paper, or draw from every paper in the bank.</span>');
      var paperOpts = [{ value: '', label: 'Any paper (all years mixed)' }].concat(
        paperOptsRaw.map(function (p) {
          return { value: p.key, label: (p.exam || '') + ' ' + (p.s || '') + ' ' + (p.y || '') + ' (' + p.count + ')' };
        })
      );
      fP.appendChild(select('vx-num', paperOpts, d.paperKey || '', function (v) { d.paperKey = v || null; draw(); }));
      form.appendChild(fP);

      /* question type */
      var fT = field('Question type<span class="vx-hint">Stick to one topic, or leave it Mixed for a bit of everything.</span>');
      var typeOpts = [{ value: '', label: 'Mixed (every type)' }].concat(
        typeOptsRaw.map(function (t) { return { value: t, label: t }; })
      );
      fT.appendChild(select('vx-num', typeOpts, d.type || '', function (v) { d.type = v || null; draw(); }));
      form.appendChild(fT);

      /* questions */
      var f1 = field('Questions<span class="vx-hint">' + max + ' available with these filters. Up to 1295 per match.</span>');
      f1.appendChild(seg([10, 15, 20, 25, 30, 50, 75, 100].filter(function (v) { return v <= max; }), d.count,
        function (v) { return v; }, function (v) { d.count = v; draw(); }));
      var cn = el('input', 'vx-num'); cn.type = 'number'; cn.min = 1; cn.max = Math.max(1, Math.min(max, 1295)); cn.value = d.count;
      cn.setAttribute('aria-label', 'Custom number of questions'); cn.style.marginTop = '10px';
      cn.addEventListener('change', function () { d.count = Math.max(1, Math.min(cn.max, parseInt(cn.value, 10) || 1)); draw(); });
      f1.appendChild(cn);
      form.appendChild(f1);

      /* time */
      var f2 = field('Time limit<span class="vx-hint">Every player gets the same overall clock. Tests submit themselves at zero.</span>');
      var timeMax = { sec: 3600, min: 300, hr: 12 };
      var unitRow = seg(['sec', 'min', 'hr', 'mixed'], d.timeUnit, function (v) {
        return v === 'sec' ? 'Seconds' : v === 'hr' ? 'Hours' : v === 'mixed' ? 'Mixed (h m s)' : 'Minutes';
      }, function (v) {
        if (v === 'mixed' && d.timeUnit !== 'mixed') {
          // entering mixed mode: seed h/m/s from whatever single-unit value is currently set
          var hms = hmsFromSeconds(draftSeconds(d));
          d.timeH = hms.h; d.timeM = hms.m; d.timeS = hms.s;
        } else if (v !== 'mixed' && d.timeUnit === 'mixed') {
          // leaving mixed mode: collapse h/m/s into the single unit being switched to
          var total = draftSeconds(d);
          if (v === 'sec') d.timeValue = Math.max(1, Math.min(timeMax.sec, total));
          else if (v === 'min') d.timeValue = Math.max(1, Math.min(timeMax.min, Math.round(total / 60)));
          else d.timeValue = Math.max(1, Math.min(timeMax.hr, Math.round(total / 3600)));
        } else if (v !== 'mixed' && d.timeUnit !== 'mixed') {
          // carry over a sensible value when switching between single units
          if (v === 'sec' && d.timeUnit === 'min') d.timeValue = d.timeValue * 60;
          else if (v === 'min' && d.timeUnit === 'sec') d.timeValue = Math.max(1, Math.round(d.timeValue / 60));
          else if (v === 'min' && d.timeUnit === 'hr') d.timeValue = d.timeValue * 60;
          else if (v === 'hr' && d.timeUnit === 'min') d.timeValue = Math.max(1, Math.round(d.timeValue / 60));
          else if (v === 'sec' && d.timeUnit === 'hr') d.timeValue = d.timeValue * 3600;
          else if (v === 'hr' && d.timeUnit === 'sec') d.timeValue = Math.max(1, Math.round(d.timeValue / 3600));
        }
        d.timeUnit = v; draw();
      });
      unitRow.style.marginBottom = '10px';
      f2.appendChild(unitRow);

      if (d.timeUnit === 'mixed') {
        function hmsInput(label, value, max, onChange) {
          var wrap = el('div');
          wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:88px;';
          wrap.appendChild(el('span', 'vx-hint', label));
          var inp = el('input', 'vx-num'); inp.type = 'number'; inp.min = 0; inp.max = max; inp.value = value;
          inp.setAttribute('aria-label', label + ' for the time limit');
          inp.addEventListener('change', function () {
            onChange(Math.max(0, Math.min(max, parseInt(inp.value, 10) || 0))); draw();
          });
          wrap.appendChild(inp);
          return wrap;
        }
        var hmsRow = el('div');
        hmsRow.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap;';
        hmsRow.appendChild(hmsInput('Hours', d.timeH || 0, 12, function (v) { d.timeH = v; }));
        hmsRow.appendChild(hmsInput('Minutes', d.timeM || 0, 59, function (v) { d.timeM = v; }));
        hmsRow.appendChild(hmsInput('Seconds', d.timeS || 0, 59, function (v) { d.timeS = v; }));
        f2.appendChild(hmsRow);
        var totalHint = el('p', 'vx-hint', 'Total: ' + timeLabel(draftSeconds(d)));
        totalHint.style.marginTop = '10px';
        f2.appendChild(totalHint);
      } else {
        var timePresets = { sec: [15, 20, 30, 40, 45, 60, 90], min: [5, 10, 15, 20, 25, 30, 45], hr: [1, 2, 3, 4, 6, 8, 12] };
        f2.appendChild(seg(timePresets[d.timeUnit], d.timeValue, function (v) { return v + ' ' + d.timeUnit; },
          function (v) { d.timeValue = v; draw(); }));
        var tn = el('input', 'vx-num'); tn.type = 'number'; tn.min = 1; tn.max = timeMax[d.timeUnit]; tn.value = d.timeValue;
        tn.setAttribute('aria-label', 'Custom time limit'); tn.style.marginTop = '10px';
        tn.addEventListener('change', function () { d.timeValue = Math.max(1, Math.min(timeMax[d.timeUnit], parseInt(tn.value, 10) || 1)); draw(); });
        f2.appendChild(tn);
      }
      form.appendChild(f2);

      /* per-question timer */
      var fQ = field('Time per question<span class="vx-hint">Optional. Each question gets its own countdown and auto-advances at zero — on top of the overall clock above.</span>');
      var perQToggle = seg([false, true], d.perQOn, function (v) { return v ? 'On' : 'Off'; },
        function (v) { d.perQOn = v; draw(); });
      if (d.perQOn) perQToggle.style.marginBottom = '10px';
      fQ.appendChild(perQToggle);
      if (d.perQOn) {
        fQ.appendChild(seg([10, 15, 20, 30, 40, 45, 60, 90], d.perQSeconds, function (v) { return v + 's'; },
          function (v) { d.perQSeconds = v; draw(); }));
        var pq = el('input', 'vx-num'); pq.type = 'number'; pq.min = 5; pq.max = 1295; pq.value = d.perQSeconds;
        pq.setAttribute('aria-label', 'Custom seconds per question'); pq.style.marginTop = '10px';
        pq.addEventListener('change', function () { d.perQSeconds = Math.max(5, Math.min(1295, parseInt(pq.value, 10) || 5)); draw(); });
        fQ.appendChild(pq);
      }
      form.appendChild(fQ);

      /* negative marking */
      var fN = field('Negative marking<span class="vx-hint">Deduct marks for a wrong answer. Blanks are never penalised.</span>');
      fN.appendChild(seg([0, 1, 2, 3], d.negMark, function (v) { return NEG_LABELS[v]; },
        function (v) { d.negMark = v; draw(); }));
      form.appendChild(fN);

      /* players */
      var f3 = field('Players<span class="vx-hint">How many people may use this code. ' + MAX_PLAYERS + ' is the ceiling.</span>');
      f3.appendChild(seg([2, 3, 5, 10, 15, 20, 25, 50, 100], d.cap, function (v) { return v; },
        function (v) { d.cap = v; draw(); }));
      form.appendChild(f3);

      /* deadline */
      var f4 = field('Code closes<span class="vx-hint">After this moment the code stops working and no new attempts count.</span>');
      var dl = el('input', 'vx-num'); dl.type = 'datetime-local'; dl.value = d.deadline;
      dl.min = new Date(Date.now() + 6e4).toISOString().slice(0, 16);
      dl.setAttribute('aria-label', 'Closing date and time');
      dl.addEventListener('change', function () { d.deadline = dl.value; });
      f4.appendChild(dl);
      form.appendChild(f4);

      /* order */
      var f5 = field('Question order<span class="vx-hint">The questions are always the same. This only decides whether everyone meets them in the same order.</span>');
      f5.appendChild(seg([false, true], d.shuffleOrder,
        function (v) { return v ? 'Shuffled per player' : 'Same for everyone'; },
        function (v) { d.shuffleOrder = v; draw(); }));
      form.appendChild(f5);

      var actions = el('div', 'vx-actions');
      var cancel = el('button', 'vx-btn ghost', 'Cancel'); cancel.type = 'button';
      cancel.addEventListener('click', function () { go('home'); });
      var make = el('button', 'vx-btn primary', 'Create match'); make.type = 'button';
      if (max < 1) { make.disabled = true; make.textContent = 'No questions match these filters'; }
      make.addEventListener('click', function () {
        var expiresAt = new Date(d.deadline).getTime();
        if (!expiresAt || expiresAt <= Date.now()) { say('Pick a closing time in the future.'); return; }
        var match = {
          source: d.source, count: d.count, seconds: draftSeconds(d),
          cap: Math.min(d.cap, MAX_PLAYERS), shuffleOrder: d.shuffleOrder,
          seed: Math.floor(Math.random() * 2176782335), expiresAt: expiresAt,
          type: d.type, paperKey: d.paperKey,
          perQSeconds: d.perQOn ? d.perQSeconds : 0,
          negMark: d.negMark
        };
        match.code = A.encode(match);
        // round-trip so what we show is exactly what a joiner will read
        var parsed = A.decode(match.code);
        if (!parsed) { say('Could not build a code from those settings.'); return; }
        freezeMatchQuestions(parsed);
        S.match = parsed;
        markHost(parsed.code);
        rememberMatch(parsed);
        registerSharedMatchMetadata(parsed);
        go('share');
      });
      actions.appendChild(cancel); actions.appendChild(make);
      form.appendChild(actions);
    }
    draw();
  }

  /* ---------------------------------------------------------
     SHARE
     --------------------------------------------------------- */
  function screenShare(w) {
    var m = S.match;
    backBtn(w, 'Arena', 'home');
    w.appendChild(el('h3', null, 'Match ready'));
    w.appendChild(el('p', 'vx-sub', 'Share this with your friends. Anyone who opens it gets these exact questions.'));

    var disp = el('div', 'vx-code-display');
    disp.innerHTML = '<code>' + esc(A.prettyCode(m.code)) + '</code>';
    w.appendChild(disp);

    w.appendChild(matchStrip(m));

    var deepLink = location.origin + location.pathname + '?arena=' + m.code;
    var shareText = 'Join my Arena match on VAANI — ' + m.count + ' questions, ' +
      timeLabel(m.seconds) + '. Tap to jump straight in:';

    var actions = el('div', 'vx-actions');

    if (navigator.share) {
      // one tap -> phone's native share sheet (WhatsApp, Messages, etc.),
      // pre-filled with a link that auto-opens straight to this match —
      // no code to type in by hand on the other end
      var share = el('button', 'vx-btn primary', 'Share with friends'); share.type = 'button';
      share.addEventListener('click', function () {
        navigator.share({ title: 'VAANI Arena match', text: shareText, url: deepLink })
          .catch(function () { /* user cancelled the share sheet — not an error */ });
      });
      actions.appendChild(share);
    }

    var copy = el('button', 'vx-btn' + (navigator.share ? ' ghost' : ' primary'), 'Copy code'); copy.type = 'button';
    copy.addEventListener('click', function () {
      var text = A.prettyCode(m.code);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
          function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy code'; }, 1600); },
          function () { say('Copy failed — select the code and copy it by hand.'); });
      } else say('Select the code above to copy it.');
    });
    actions.appendChild(copy);

    var play = el('button', 'vx-btn ghost', 'Take it now'); play.type = 'button';
    play.addEventListener('click', function () { go('briefing'); });
    actions.appendChild(play);
    w.appendChild(actions);
  }

  function timeLabel(seconds) {
    seconds = Math.max(0, Math.round(seconds));
    if (seconds % 3600 === 0 && seconds >= 3600) return (seconds / 3600) + ' hr';
    if (seconds % 60 === 0) return (seconds / 60) + ' min';
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    var parts = [];
    if (h) parts.push(h + ' hr');
    if (m) parts.push(m + ' min');
    if (s || !parts.length) parts.push(s + ' sec');
    return parts.join(' ');
  }
  function snapshotArenaQuestion(q) {
    if (!q || typeof q !== 'object') return null;
    var out = {};
    Object.keys(q).forEach(function (key) {
      if (key === '_id' || key === 'q' || key === 'o' || key === 'ans' ||
          key === 'sec' || key === 's' || key === 'y' || key === '_exam' ||
          key === 'parts' || key === 'passage' || key === 'keyword' ||
          key === 'exp' || key === 'rule' || key === 'shortcut' ||
          key === 'tags' || key === 'topic' || key === 'diff') {
        out[key] = q[key];
      }
    });
    return out._id ? out : null;
  }

  function freezeMatchQuestions(m) {
    if (!m) return m;
    if (Array.isArray(m.frozenQuestions) && m.frozenQuestions.length) return m;
    var qs = A.questionsFor(m, '');
    m.frozenQuestionIds = qs.map(function (q) { return String(q._id || ''); }).filter(Boolean);
    m.frozenQuestions = qs.map(snapshotArenaQuestion).filter(Boolean);
    return m;
  }

  function paperLabel(m) {
    var hit = papersFor(m.source).filter(function (p) { return p.key === m.paperKey; })[0];
    return hit ? ((hit.exam || '') + ' ' + (hit.s || '') + ' ' + (hit.y || '')) : 'One paper';
  }

  function matchStrip(m) {
    var strip = el('div', 'vx-meta-strip');
    var closed = Date.now() > m.expiresAt;
    var hostName = matchHostName(m);
    strip.innerHTML =
      (hostName ? '<span class="vx-chip vx-host-chip">Hosted by ' + esc(hostName) + '</span>' : '') +
      '<span class="vx-chip">' + m.count + ' questions</span>' +
      '<span class="vx-chip">' + timeLabel(m.seconds) + '</span>' +
      '<span class="vx-chip">' + (sourceLabel(m.source).replace(/\+/g, ' + ')) + '</span>' +
      (m.paperKey ? '<span class="vx-chip">' + esc(paperLabel(m)) + '</span>' : '') +
      (m.type ? '<span class="vx-chip">' + esc(m.type) + '</span>' : '') +
      (m.perQSeconds ? '<span class="vx-chip">' + m.perQSeconds + 's / question</span>' : '') +
      (m.negMark ? '<span class="vx-chip">' + NEG_LABELS[m.negMark] + ' penalty</span>' : '') +
      '<span class="vx-chip">up to ' + m.cap + ' players</span>' +
      '<span class="vx-chip' + (closed ? ' warn' : '') + '">' +
        (closed ? 'Closed ' : 'Closes ') + new Date(m.expiresAt).toLocaleString() + '</span>';
    return strip;
  }

  /* ---------------------------------------------------------
     JOIN
     --------------------------------------------------------- */
  function screenJoin(w) {
    backBtn(w, 'Arena', 'home');
    w.appendChild(el('h3', null, 'Join a match'));
    w.appendChild(el('p', 'vx-sub', 'Enter the code exactly as you received it. Dashes and spacing do not matter.'));

    var input = el('input', 'vx-code-input');
    input.type = 'text'; input.placeholder = 'XXXXXX-XXXXXX-XXXXXX-XXXXX';
    input.setAttribute('aria-label', 'Match code');
    input.autocomplete = 'off'; input.spellcheck = false;
    w.appendChild(input);

    var err = el('p', 'vx-sub'); err.style.color = 'var(--vx-danger)'; err.style.margin = '10px 0 0';
    w.appendChild(err);

    var actions = el('div', 'vx-actions'); actions.style.marginTop = '18px';
    var go2 = el('button', 'vx-btn primary', 'Look up match'); go2.type = 'button';
    function attempt() {
      err.textContent = '';
      var parsedInvite = parseArenaInvite(input.value);
      var m = parsedInvite.match;
      if (!m) { err.textContent = 'That code or invite link could not be read. Check for a missing or mistyped character.'; return; }
      m = hydrateMatch(m, parsedInvite.hostName);
      if (Date.now() > m.expiresAt) {
        err.textContent = 'This code closed on ' + new Date(m.expiresAt).toLocaleString() + '. Ask the host for a new one.';
        return;
      }
      S.match = m;
      fetchSharedMatchMetadata(m).then(function() {
        if (S.match && S.match.code === m.code) {
          S.match = m;
          rememberMatch(m);
          go('briefing');
        }
      }).catch(function() {
        rememberMatch(m);
        go('briefing');
      });
    }
    go2.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
    actions.appendChild(go2);
    w.appendChild(actions);
    input.focus();
  }

  /* ---------------------------------------------------------
     SESSION RECOVERY
     --------------------------------------------------------- */
  function arenaRecoveryKey(){ return arenaAccountKey('vx_arena_active_recovery_v1'); }
  var ARENA_RECOVERY_KEY = 'vx_arena_active_recovery_v1';
  var ARENA_ACCOUNT_SCOPE_VERSION = 3;

  function saveRunRecovery(){
    var r=S.run,m=S.match;
    if(!r||!m||r.practiceMode)return;
    var snapshot={
      version:1,
      code:m.code,
      index:Number(r.index)||0,
      startedAt:Number(r.startedAt)||Date.now(),
      qids:r.questions.map(function(q){return q._id;}),
      qSnapshots:r.questions.map(snapshotArenaQuestion).filter(Boolean),
      answers:r.answers||{},
      skipped:r.skipped||{},
      savedAt:Date.now()
    };
    try{localStorage.setItem(arenaRecoveryKey(),JSON.stringify(snapshot));}catch(e){}
  }

  function clearRunRecovery(){
    S.recoverySnapshot=null;
    try{localStorage.removeItem(arenaRecoveryKey());}catch(e){}
  }

  function readRunRecovery(){
    try{
      var snapshot=JSON.parse(localStorage.getItem(arenaRecoveryKey())||'null');
      if(!snapshot||snapshot.version!==1||!snapshot.code||!Array.isArray(snapshot.qids)||!snapshot.qids.length)return null;
      if(Date.now()-Number(snapshot.savedAt||0)>7*24*60*60*1000)return null;
      return snapshot;
    }catch(e){return null;}
  }

  function questionsFromRecovery(m,snapshot){
    if (Array.isArray(snapshot.qSnapshots) && snapshot.qSnapshots.length) {
      return snapshot.qSnapshots.map(snapshotArenaQuestion).filter(Boolean);
    }
    var pool=A.questionsFor(m,playerName()),byId={};
    pool.forEach(function(q){byId[q._id]=q;});
    var questions=snapshot.qids.map(function(id){return byId[id];}).filter(Boolean);
    return questions.length===snapshot.qids.length?questions:null;
  }

  function resumeRecoveredRun(){
    var m=S.match,snapshot=S.recoverySnapshot||readRunRecovery();
    if(!m||!snapshot||snapshot.code!==m.code){
      say('The saved Arena session could not be restored.');
      clearRunRecovery();
      return;
    }
    var questions=questionsFromRecovery(m,snapshot);
    if(!questions||!questions.length){
      say('Those questions are no longer available on this device.');
      clearRunRecovery();
      return;
    }
    var elapsed=Math.max(0,Math.round((Date.now()-Number(snapshot.startedAt||Date.now()))/1000));
    var remaining=Math.max(0,m.seconds-elapsed);
    if(remaining<=0){
      S.run={
        questions:questions,
        index:Math.min(Number(snapshot.index)||0,questions.length-1),
        answers:snapshot.answers||{},
        skipped:snapshot.skipped||{},
        startedAt:Number(snapshot.startedAt)||Date.now(),
        recovered:true
      };
      clearRunRecovery();
      finishRun(true);
      return;
    }
    S.run={
      questions:questions,
      index:Math.min(Number(snapshot.index)||0,questions.length-1),
      answers:snapshot.answers||{},
      skipped:snapshot.skipped||{},
      startedAt:Number(snapshot.startedAt)||Date.now(),
      recovered:true
    };
    clearRunRecovery();
    go('run');
    if(VX.timer){
      VX.timer.start({
        mode:'countdown',
        seconds:remaining,
        onEnd:function(){say('Time up — your recovered answers were submitted.');finishRun(true);}
      });
    }
  }

  /* ---------------------------------------------------------
     BRIEFING
     --------------------------------------------------------- */
  function screenBriefing(w) {
    var m = S.match;
    var panel = el('section', 'vx-briefing');
    backBtn(panel, 'Back to Arena', 'home');

    var hero = el('div', 'vx-briefing-hero');
    var eyebrow = el('div', 'vx-briefing-eyebrow');
    eyebrow.innerHTML = '<span class="vx-briefing-live-dot"></span> MATCH BRIEFING <span class="vx-briefing-code">CODE · ' + esc(m.code || '—') + '</span>';
    hero.appendChild(eyebrow);
    var title = el('h2', 'vx-briefing-title', 'Your challenge starts here.');
    hero.appendChild(title);
    var intro = el('p', 'vx-briefing-intro', 'Review the rules, get focused, and make every answer count.');
    hero.appendChild(intro);
    var hostLine = el('div', 'vx-host-identity vx-briefing-host');
    var hostName = matchHostName(m);
    hostLine.innerHTML = arenaAvatarHtml(hostAvatarSnapshot(m),hostName || 'Host','vx-host-avatar')+'<span><small>HOSTED BY</small><strong>'+esc(hostName || 'Host name shared by invite')+'</strong></span>';
    hero.appendChild(hostLine);
    panel.appendChild(hero);

    var stats = el('div', 'vx-briefing-stats');
    [
      {icon:'◈',label:'QUESTIONS',value:String(m.count)},
      {icon:'◷',label:'TIME LIMIT',value:timeLabel(m.seconds)},
      {icon:'◎',label:'EXAM BANK',value:sourceLabel(m.source).replace(/\+/g, ' + ')},
      {icon:'♙',label:'PLAYERS',value:'Up to ' + m.cap}
    ].forEach(function(item){
      var tile=el('div','vx-briefing-stat');
      var icon=el('span','vx-briefing-stat-icon',item.icon);
      var label=el('span','vx-briefing-stat-label',item.label);
      var value=el('strong','vx-briefing-stat-value',item.value);
      tile.appendChild(icon);tile.appendChild(label);tile.appendChild(value);stats.appendChild(tile);
    });
    panel.appendChild(stats);

    var recovery=S.recoverySnapshot||readRunRecovery();
    if(recovery&&recovery.code===m.code){
      S.recoverySnapshot=recovery;
      var recoveryNotice=el('div','vx-briefing-recovery');
      recoveryNotice.innerHTML='<div><span class="vx-briefing-recovery-kicker">SESSION RECOVERED</span><strong>Your Arena attempt was interrupted.</strong><p>Your saved answers and question position are ready. Resume without losing your attempt.</p></div>';
      var recoveryActions=el('div','vx-briefing-recovery-actions');
      var resume=el('button','vx-btn primary','Resume session');
      resume.type='button';
      resume.addEventListener('click',resumeRecoveredRun);
      recoveryActions.appendChild(resume);
      var discard=el('button','vx-btn ghost','Discard recovery');
      discard.type='button';
      discard.addEventListener('click',function(){
        clearRunRecovery();
        S.recoverySnapshot=null;
        render();
      });
      recoveryActions.appendChild(discard);
      recoveryNotice.appendChild(recoveryActions);
      panel.appendChild(recoveryNotice);
    }

    var prev = previousAttempt(m.code);
    if (prev) {
      var done = el('div', 'vx-briefing-notice');
      done.innerHTML = '<span class="vx-briefing-notice-icon">✓</span><div><b>Attempt already recorded</b><p>You scored <strong>' + esc(String(prev.score)) + '/' + esc(String(m.count)) + '</strong> in ' + esc(fmtClock(prev.seconds)) + '. Only your first attempt counts.</p></div>';
      panel.appendChild(done);
      var seeBoard = el('button', 'vx-btn primary vx-briefing-board', 'View your result & leaderboard'); seeBoard.type = 'button';
      seeBoard.addEventListener('click', function () {
        S.result = prev;
        if (Date.now() > m.expiresAt) { S.rows = []; go('result'); }
        else loadBoard().then(function () { go('result'); });
      });
      panel.appendChild(seeBoard);
      w.appendChild(panel);
      return;
    }

    var qs = A.questionsFor(m, playerName());
    if (!isHost(m.code) && !S._metadataLoaded[String(m.code)] && !S._metadataRequests[String(m.code)]) {
      fetchSharedMatchMetadata(m).then(function(){
        if (S.match && S.match.code === m.code) render();
      });
    }
    if (qs.length < m.count) {
      var warn = el('div', 'vx-briefing-notice warning');
      warn.textContent = 'This match requires ' + m.count + ' questions, but only ' + qs.length + ' are available on this device. Please update VAANI or ask the host to check the question bank.';
      panel.appendChild(warn);
      if (!qs.length) { w.appendChild(panel); return; }
    }

    var lower = el('div','vx-briefing-lower');
    var rules = el('div','vx-briefing-rules');
    var rulesHead = el('div','vx-briefing-section-head');
    rulesHead.innerHTML = '<span class="vx-briefing-section-icon">≡</span><div><h3>Rules of engagement</h3><p>Know the format before you deploy.</p></div>';
    rules.appendChild(rulesHead);
    var list=el('ol','vx-briefing-rule-list');
    var ruleItems=[
      {title:m.count+' questions · '+timeLabel(m.seconds),desc:'The overall clock starts when you begin and cannot be paused.'}
    ];
    if(m.perQSeconds)ruleItems.push({title:m.perQSeconds+' seconds per question',desc:'Questions advance automatically when the per-question timer expires.'});
    ruleItems.push({title:'Automatic submission',desc:'When the timer reaches zero, your answers are submitted. Unanswered questions score zero.'});
    if(m.negMark)ruleItems.push({title:'Negative marking · '+NEG_LABELS[m.negMark].replace('&minus;','−'),desc:'Incorrect answers lose marks. Leaving a question blank carries no penalty.'});
    ruleItems.push({title:'One official attempt',desc:'Your first attempt is recorded on the leaderboard. Your score and finish time both matter.'});
    ruleItems.forEach(function(item,i){
      var li=el('li','vx-briefing-rule');
      var number=el('span','vx-briefing-rule-number',String(i+1).padStart(2,'0'));
      var copy=el('div','vx-briefing-rule-copy');
      var strong=el('strong',null,item.title);var desc=el('p',null,item.desc);
      copy.appendChild(strong);copy.appendChild(desc);li.appendChild(number);li.appendChild(copy);list.appendChild(li);
    });
    rules.appendChild(list);lower.appendChild(rules);

    var deploy=el('aside','vx-briefing-deploy');
    deploy.innerHTML='<div class="vx-briefing-deploy-mark">VAANI <span>ARENA</span></div><div class="vx-briefing-deploy-orbit" aria-hidden="true">✦</div><div class="vx-briefing-deploy-kicker">CADET, ARE YOU READY?</div><h3>Focus. Think.<br>Execute.</h3><p>Stay calm, manage your time and trust your preparation.</p>';
    var start=el('button','vx-btn primary vx-briefing-start','Begin match <span aria-hidden="true">→</span>');start.type='button';
    start.addEventListener('click',function(){beginRun(qs);});
    deploy.appendChild(start);
    var hint=el('div','vx-briefing-hint');hint.textContent='Your timer starts immediately.';deploy.appendChild(hint);
    lower.appendChild(deploy);panel.appendChild(lower);w.appendChild(panel);
  }

  /* ---------------------------------------------------------
     RUN
     --------------------------------------------------------- */
  function beginRun(questions,options) {
    options=options||{};
    S.run={
      questions:questions,
      index:0,
      answers:{},
      skipped:{},
      startedAt:Date.now(),
      practiceMode:!!options.practice
    };
    if(!S.run.practiceMode)saveRunRecovery();
    go('run');
    if(!S.run.practiceMode&&VX.timer){
      VX.timer.start({
        mode:'countdown',
        seconds:S.match.seconds,
        onEnd:function(){say('Time up — your answers were submitted.');finishRun(true);}
      });
    }
  }

  /* Jump-to-question grid: green = attempted, grey = explicitly skipped,
     red = not attempted yet. Clicking a tile jumps straight to it. */
  function questionGridHTML(r) {
    var wrap = el('div', 'vx-qgrid-wrap');
    var legend = el('div', 'vx-qgrid-legend');
    legend.innerHTML =
      '<span><i class="vx-qdot ok"></i>Attempted</span>' +
      '<span><i class="vx-qdot skip"></i>Skipped</span>' +
      '<span><i class="vx-qdot none"></i>Not attempted</span>';
    wrap.appendChild(legend);
    var grid = el('div', 'vx-qgrid');
    r.questions.forEach(function (q, i) {
      var state = r.answers[q._id] !== undefined ? 'ok' : (r.skipped[q._id] ? 'skip' : 'none');
      var b = el('button', 'vx-qgrid-btn ' + state, String(i + 1));
      b.type = 'button';
      if (i === r.index) b.classList.add('current');
      b.setAttribute('aria-label', 'Question ' + (i + 1) + ' — ' +
        (state === 'ok' ? 'attempted' : state === 'skip' ? 'skipped' : 'not attempted'));
      b.addEventListener('click', function () { r.index = i; if(!r.practiceMode)saveRunRecovery(); render(); });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function questionPromptHtml(q){
    /* The main PYQ engine already knows how to safely split:
       - S1/S6 + P/Q/R/S sentence-arrangement questions
       - P/Q/R/S-only ordering questions
       - spotting-error fragments
       Reuse that parser here so Arena and the normal PYQ view never disagree. */
    function renderBlocks(blocks){
      if(!Array.isArray(blocks)||!blocks.length) return '';
      var fixed=[], jumbled=[];
      blocks.forEach(function(block){
        var label=String(block&&block.label||'').trim().toUpperCase();
        var text=String(block&&block.text||'').trim();
        if(!text)return;
        if(/^S(?:1|6)$/.test(label)) fixed.push({label:label,text:text});
        else if(/^[PQRS]$/.test(label)) jumbled.push({label:label,text:text});
        else jumbled.push({label:label,text:text});
      });
      var html='';
      if(fixed.length){
        html += '<div class="vx-arrange-section">' +
          '<div class="vx-arrange-kicker">FIXED SENTENCES</div>' +
          '<div class="vx-question-parts vx-fixed-parts">' +
          fixed.map(function(block){
            return '<div class="vx-question-part-row"><span>'+esc(block.label)+'</span><p>'+esc(block.text)+'</p></div>';
          }).join('') +
          '</div></div>';
      }
      if(jumbled.length){
        html += '<div class="vx-arrange-section">' +
          '<div class="vx-arrange-kicker">' +
          (fixed.length ? 'ARRANGE P–Q–R–S BETWEEN THEM' : 'ARRANGE THESE PARTS') +
          '</div>' +
          '<div class="vx-question-parts vx-jumbled-parts">' +
          jumbled.map(function(block){
            return '<div class="vx-question-part-row"><span>'+esc(block.label)+'</span><p>'+esc(block.text)+'</p></div>';
          }).join('') +
          '</div></div>';
      }
      return html;
    }

    /* Spotting errors: explicitly label A/B/C(/D) so the sentence is
       never presented as one long unlabeled line. */
    var sec = String(q && (q._sourceSec || q.sec) || '').trim().toLowerCase();
    if(sec === 'spotting errors' && typeof pyqSpottingParts === 'function'){
      var spottingParts = pyqSpottingParts(q);
      if(Array.isArray(spottingParts) && spottingParts.length){
        var spottingRows = spottingParts.map(function(part,i){
          var label=String.fromCharCode(97+i);
          return '<div class="vx-question-part-row vx-error-part-row"><span>'+esc(label)+'</span><p>'+esc(part)+'</p></div>';
        }).join('');
        return '<div class="vx-arrange-section">' +
          '<div class="vx-arrange-kicker">SPOTTING ERROR · IDENTIFY THE WRONG PART</div>' +
          '<div class="vx-question-parts vx-error-parts">'+spottingRows+'</div>' +
          '</div>';
      }
    }

    /* PQRS / S1-S6: prefer the canonical parser from app.js. */
    if(typeof pyqLabeledBlocks === 'function'){
      try{
        var parsed = pyqLabeledBlocks(q);
        var parsedHtml = renderBlocks(parsed);
        if(parsedHtml) return parsedHtml;
      }catch(e){}
    }

    /* Fallback for legacy structured data. */
    if(Array.isArray(q.parts) && q.parts.length){
      var labels = sec.indexOf('ordering of words') >= 0 ? ['P','Q','R','S'] : ['a','b','c','d'];
      var rows=q.parts.map(function(part,i){
        var label=labels[i]||String(i+1);
        return '<div class="vx-question-part-row"><span>'+esc(label)+'</span><p>'+esc(part)+'</p></div>';
      }).join('');
      return '<div class="vx-arrange-section">' +
        '<div class="vx-arrange-kicker">'+
          (sec.indexOf('ordering') >= 0 ? 'ARRANGE THESE PARTS' : 'QUESTION PARTS')+
        '</div>' +
        '<div class="vx-question-parts">'+rows+'</div>' +
      '</div>';
    }

    return (q.keyword ? '<b>' + esc(q.keyword) + '</b> — ' : '') + esc(q.q);
  }

  function screenRun(w) {
    var r = S.run, m = S.match;
    if (!r) return go('home');
    var q = r.questions[r.index];

    var top = el('div', 'vx-meta-strip');
    top.innerHTML =
      '<span class="vx-chip ' + (r.practiceMode ? 'warn' : '') + '">' + (r.practiceMode ? 'MISTAKE DRILL · ' : '') + 'Question ' + (r.index + 1) + ' of ' + r.questions.length + '</span>' +
      '<span class="vx-chip">' + esc(q.sec || '') + '</span>' +
      '<span class="vx-chip">' + esc(q._exam || 'NDA') + ' ' + esc(q.s || '') + ' ' + esc(q.y || '') + '</span>';
    w.appendChild(top);

    /* optional per-question countdown — fresh every time a question is
       shown; auto-advances (or submits, if this is the last one) at zero */
    if (m.perQSeconds) {
      var qChip = el('span', 'vx-chip warn');
      top.appendChild(qChip);
      var deadline = Date.now() + m.perQSeconds * 1000;
      var tick = function () {
        var left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        qChip.textContent = left + 's left';
        if (left <= 0) {
          clearQTimer();
          if (r.index < r.questions.length - 1) { r.index++; render(); }
          else finishRun(true);
        }
      };
      tick();
      S._qTimerHandle = setInterval(tick, 250);
    }

    var card = el('div', 'vx-tile');
    card.style.cursor = 'default';
    var body =
      (q.passage ? '<div class="pv-passage"><div class="pv-passage-label">Passage</div><div class="pv-passage-text">' + esc(q.passage) + '</div></div>' : '') +
      '<div class="vx-question-prompt">' + questionPromptHtml(q) + '</div>';
    card.innerHTML = body;

    var isArrangement = typeof pyqIsArrangementQuestion === 'function' && pyqIsArrangementQuestion(q);
    var opts = el('div', 'vx-seg' + (isArrangement ? ' vx-arrange-options' : ''));
    opts.style.flexDirection = 'column';
    q.o.forEach(function (text, i) {
      var b = el('button', null);
      b.type = 'button';
      b.style.textAlign = 'left';
      b.style.width = '100%';
      b.setAttribute('aria-pressed', String(r.answers[q._id] === i));
      if(isArrangement){
        b.classList.add('vx-answer-choice');
        b.innerHTML =
          '<span class="vx-answer-choice-label">' + String.fromCharCode(65+i) + '</span>' +
          '<span class="vx-answer-choice-text">' + esc(text) + '</span>';
      }else{
        b.textContent = String(text);
      }
      b.addEventListener('click', function () {
        r.answers[q._id] = i;
        delete r.skipped[q._id];
        if(!r.practiceMode)saveRunRecovery();
        if (r.index < r.questions.length - 1) { r.index++; render(); }
        else render();
      });
      opts.appendChild(b);
    });
    card.appendChild(opts);
    w.appendChild(card);

    var nav = el('div', 'vx-actions');
    nav.style.marginTop = '18px';
    var prev = el('button', 'vx-btn ghost', 'Previous'); prev.type = 'button';
    prev.disabled = r.index === 0;
    prev.addEventListener('click', function () { r.index--; if(!r.practiceMode)saveRunRecovery(); render(); });
    var next = el('button', 'vx-btn ghost', 'Skip'); next.type = 'button';
    next.disabled = r.index >= r.questions.length - 1;
    next.addEventListener('click', function () {
      if (r.answers[q._id] === undefined) r.skipped[q._id] = true;
      r.index++;
      if(!r.practiceMode)saveRunRecovery();
      render();
    });
    nav.appendChild(prev); nav.appendChild(next);
    w.appendChild(nav);

    var answered = Object.keys(r.answers).length;
    var submit = el('button', 'vx-btn ' + (answered === r.questions.length ? 'primary' : 'danger'),
      (r.practiceMode ? 'Finish drill (' : 'Submit (') + answered + '/' + r.questions.length + ' answered)');
    submit.type = 'button';
    submit.style.marginTop = '12px';
    submit.addEventListener('click', function () {
      if (answered < r.questions.length &&
        !confirm((r.questions.length - answered) + ' question(s) are still blank. Submit anyway?')) return;
      finishRun(false);
    });
    w.appendChild(submit);

    /* nav grid moved to the bottom (matches the PYQ Test Kit layout) so it
       never pushes the question itself down the page as a match grows —
       at 100+ questions a top-mounted grid would bury the question below
       several rows of tiles before the person sees it. */
    w.appendChild(questionGridHTML(r));
  }

  function finishRun(auto) {
    var r=S.run,m=S.match;
    if(!r)return;
    if(VX.timer)VX.timer.stop();
    clearQTimer();

    if(r.practiceMode){
      var practiceCorrect=0,practiceIncorrect=0,practiceSkipped=0;
      r.questions.forEach(function(q){
        var a=r.answers[q._id];
        if(a===undefined)practiceSkipped++;
        else if(answerMatches(a,q.ans))practiceCorrect++;
        else practiceIncorrect++;
      });
      S.practiceSummary={
        total:r.questions.length,
        correct:practiceCorrect,
        incorrect:practiceIncorrect,
        skipped:practiceSkipped,
        at:Date.now()
      };
      S.run=null;
      go('result');
      return;
    }

    clearRunRecovery();
    var negFrac=NEG_MARKS[m.negMark]||0;
    var score=0;
    var correctCount=0, incorrectCount=0, skippedCount=0;

    r.questions.forEach(function(q){
      var a=r.answers[q._id];
      if(a===undefined){
        skippedCount++;
        return;
      }
      if(answerMatches(a,q.ans)){
        correctCount++;
        score+=1;
      }else{
        incorrectCount++;
        score+=negFrac;
      }
    });

    score=Math.round(score*100)/100;
    var seconds=Math.min(m.seconds,Math.round((Date.now()-r.startedAt)/1000));
    var entry={
      pid:playerId(),name:playerName(),score:score,
      avatar: profileAvatarSnapshot(),seconds:seconds,total:r.questions.length,
      correct:correctCount,
      incorrect:incorrectCount,
      skipped:skippedCount,
      at:Date.now(),auto:!!auto,
      qids:r.questions.map(function(q){return q._id;}),
      answers:r.answers,
      /*
       * Keep the exact attempt-time question/answer key locally. This prevents
       * future PYQ corrections from rewriting a historical Arena result.
       */
      qSnapshots:r.questions.map(function(q){return snapshotArenaQuestion(q);}).filter(Boolean),
      expiresAt:m.expiresAt
    };
    S.result=entry;
    S.run=null;
    recordAttempt(m.code,entry);
    if(typeof global.addXP==='function')global.addXP(score*2,'Arena match');

    // Put the just-finished attempt into the local board immediately. The shared
    // fetch can then fill in the other players without leaving the result page blank.
    S._boardError=false;
    S.rows=reconcileLocalAttempt((Array.isArray(S.rows)?S.rows:[]).concat([entry]));

    A.sync.submit(m.code,entry).then(function(){
      go('result');
    },function(){
      S._boardError=true;
      // Keep the local result visible even when the network is temporarily down.
      S.rows=reconcileLocalAttempt(S.rows);
      go('result');
    });
  }
  /* ---------------------------------------------------------
     RESULT + BOARD
     --------------------------------------------------------- */
  /* The local result is also stored under vx_arena_done_<code>. A board
     adapter can temporarily return an empty list (for example, after a
     storage write failed or while recovering an older attempt). Keep the
     completed local attempt visible instead of showing a false empty board.
     This fallback is display-only; it does not make a score remotely verified. */
  function reconcileLocalAttempt(rows) {
    var out = Array.isArray(rows) ? rows.slice() : [];
    if (S.match) {
      var own = S.result || previousAttempt(S.match.code);
      if (own && typeof own.pid === 'string' && own.pid) {
        var index = out.findIndex(function (row) { return row && row.pid === own.pid; });
        if (index < 0) out.push(own);
        else {
          // The shared leaderboard intentionally returns only public ranking
          // fields. Never let that sanitized row erase the local attempt
          // payload on the device that actually submitted it. This was
          // especially visible to the host: reopening the result replaced
          // the host's answers/qSnapshots with the public row, so the host
          // detail sheet said "detailed breakdown is not available".
          var shared = out[index] || {};
          var merged = Object.assign({}, shared);
          Object.keys(own).forEach(function (key) {
            if (own[key] !== undefined && own[key] !== null) merged[key] = own[key];
          });
          out[index] = merged;
        }
      }
    }
    return rankRows(out);
  }

  function loadBoard() {
    if (!S.match) { S.rows = []; S._boardError = true; return Promise.resolve(S.rows); }
    S._boardError = false;
    var own = S.result || previousAttempt(S.match.code);
    var register = isHost(S.match.code) ? registerSharedMatchMetadata(S.match) : Promise.resolve(null);
    // Retry a local attempt against the shared board whenever the result page
    // is opened/refreshed. A transient network failure must not permanently
    // strand an otherwise completed submission on one device.
    var syncOwn = own && own.pid ? A.sync.submit(S.match.code, own).catch(function () { return false; }) : Promise.resolve(true);
    return register.then(function () {
      return syncOwn;
    }).then(function () {
      return A.sync.fetch(S.match.code);
    }).then(function (rows) {
      S.rows = reconcileLocalAttempt(rows);
      if (S.match && S.match.hostPid && S.match.hostAvatar) {
        S.rows.forEach(function(row) {
          if (row && row.pid === S.match.hostPid && !row.avatar) row.avatar = S.match.hostAvatar;
        });
      }
      return S.rows;
    }, function () {
      S.rows = reconcileLocalAttempt([]);
      S._boardError = true;
      return S.rows;
    });
  }

  function scheduleResultExpiry(match) {
    if (S._expiryTimer) clearTimeout(S._expiryTimer);
    function checkExpiry() {
      S._expiryTimer = null;
      if (S.screen !== 'result' || !S.match || S.match.code !== match.code) return;
      var remaining = Number(match.expiresAt) - Date.now();
      if (remaining <= 0) { go('result'); return; }
      S._expiryTimer = setTimeout(checkExpiry, Math.min(remaining + 25, 2147483647));
    }
    var delay = Math.max(0, Number(match.expiresAt) - Date.now() + 25);
    S._expiryTimer = setTimeout(checkExpiry, Math.min(delay, 2147483647));
  }

  function arenaAnalysis(m,res){
    if(!m||!res)return null;

    var qs=Array.isArray(res.qSnapshots)&&res.qSnapshots.length
      ? res.qSnapshots.map(function(q){return q&&typeof q==='object'?JSON.parse(JSON.stringify(q)):null;}).filter(Boolean)
      : matchQuestions();
    var sections={},mistakes=[];

    /*
     * A perfect official score is stronger evidence than a mutable legacy
     * answer key. Older Arena matches did not freeze question snapshots, so
     * later PYQ corrections could otherwise manufacture a fake "mistake".
     */
    var officialPerfect = Number(res.score) === Number(res.total) &&
      Number(res.total) === qs.length && qs.length > 0;

    qs.forEach(function(q,i){
      var given=res.answers?res.answers[q._id]:undefined;
      var key=q.sec||q._exam||'Mixed';
      if(!sections[key])sections[key]={name:key,correct:0,incorrect:0,skipped:0,total:0};
      var sec=sections[key];sec.total++;

      if(officialPerfect){
        sec.correct++;
      }else if(given===undefined){
        sec.skipped++;
        mistakes.push({index:i+1,q:q,status:'skipped'});
      }else if(answerMatches(given,q.ans)){
        sec.correct++;
      }else{
        sec.incorrect++;
        mistakes.push({index:i+1,q:q,status:'incorrect'});
      }
    });

    var sectionList=Object.keys(sections).map(function(k){
      var item=sections[k];
      var attempted=item.correct+item.incorrect;
      item.accuracy=attempted?Math.round(item.correct/attempted*100):0;
      return item;
    }).sort(function(a,b){return b.accuracy-a.accuracy||b.total-a.total;});
    var focus=sectionList.slice().sort(function(a,b){return a.accuracy-b.accuracy||b.total-a.total;});

    var correctCount=officialPerfect?qs.length:qs.filter(function(q){
      var given=res.answers?res.answers[q._id]:undefined;
      return given!==undefined && answerMatches(given,q.ans);
    }).length;
    var incorrectCount=officialPerfect?0:mistakes.filter(function(x){return x.status==='incorrect';}).length;
    var skippedCount=officialPerfect?0:mistakes.filter(function(x){return x.status==='skipped';}).length;

    return {
      total:qs.length,
      correct:correctCount,
      incorrect:incorrectCount,
      skipped:skippedCount,
      accuracy:qs.length?Math.round(correctCount/qs.length*100):0,
      strongest:sectionList[0]||null,
      weakest:focus[0]||null,
      sections:sectionList,
      mistakeCount:mistakes.length,
      mistakes:mistakes,
      mistakePreview:mistakes.slice(0,8)
    };
  }
  function startMistakeDrill(){
    var m=S.match,res=S.result;
    if(!m||!res)return;
    var qs=matchQuestions().filter(function(q){
      var a=res.answers?res.answers[q._id]:undefined;
      return a===undefined||Number(a)!==Number(q.ans);
    });
    if(!qs.length){say('No mistakes to drill — clean run.');return;}
    beginRun(qs,{practice:true});
  }

  function screenResult(w) {
    var m = S.match, res = S.result;
    backBtn(w, 'Arena', 'home');
    var hostSpectating = !!(S.hostSpectate && m && isHost(m.code));
    w.appendChild(el('h3', null, hostSpectating ? 'Host spectate' : 'Match result'));
    if (!m) {
      w.appendChild(el('div', 'vx-empty', 'No active match was found. Return to the Arena to start or join a match.'));
      return;
    }

    var closed = Date.now() >= Number(m.expiresAt);
    var hasOwnAttempt = !!res || !!previousAttempt(m.code);

    if(!hostSpectating && !hasOwnAttempt){
      var locked=el('section','vx-preattempt-lock');
      locked.innerHTML=
        '<span class="vx-arena-setup-kicker">FAIR PLAY LOCK</span>' +
        '<h2>Leaderboard locked until your attempt.</h2>' +
        '<p>Everyone gets the same question set. Answer review and match standings unlock after you submit your official attempt. The host can spectate separately.</p>';
      var joinBtn=el('button','vx-btn primary','Enter Arena');
      joinBtn.type='button';
      joinBtn.addEventListener('click',function(){S.hostSpectate=false;go('briefing');});
      locked.appendChild(joinBtn);
      w.appendChild(locked);
      w.appendChild(matchStrip(m));
      if(closed){
        w.appendChild(el('div','vx-empty','This match has already closed.'));
      }
      return;
    }

    if(hostSpectating){
      var control=el('section','vx-host-spectate-panel');
      control.innerHTML=
        '<div><span class="vx-arena-setup-kicker">HOST CONTROL · SPECTATE MODE</span>' +
        '<h2>Observe without attempting.</h2>' +
        '<p>The leaderboard below is live. Tap any submitted player to view their public score summary. The answer key is available without starting the test.</p></div>';
      var controlActions=el('div','vx-host-spectate-panel-actions');

      var keyBtn=el('button','vx-btn primary','Open answer key');
      keyBtn.type='button';
      keyBtn.addEventListener('click',function(){go('hostAnswers');});
      controlActions.appendChild(keyBtn);

      var participateBtn=el('button','vx-btn ghost','Participate instead');
      participateBtn.type='button';
      participateBtn.addEventListener('click',function(){S.hostSpectate=false;go('briefing');});
      controlActions.appendChild(participateBtn);

      control.appendChild(controlActions);
      w.appendChild(control);
    }
    if (res) {
      var total = Math.max(0, Number(res.total) || 0);
      var stats = gradeRow(res);
      var accuracy = (stats && total) ? Math.round(stats.correct / total * 100) : null;
      var rawScore = Number(res.score);
      var scoreLabel = Number.isFinite(rawScore) ? String(Math.round(rawScore * 100) / 100) : '0';
      var rank = S.rows.findIndex(function (row) { return row.pid === res.pid; }) + 1;

      var summary = el('div', 'vx-result-summary');
      var ring = el('div', 'vx-result-ring');
      ring.style.setProperty('--vx-accuracy', (accuracy == null ? 0 : Math.max(0, Math.min(100, accuracy))) + '%');
      ring.setAttribute('role', 'img');
      ring.setAttribute('aria-label', accuracy == null ? 'Accuracy unavailable' : accuracy + ' percent accuracy');
      ring.innerHTML = '<div class="vx-result-ring-inner"><strong>' + (accuracy == null ? '—' : accuracy + '%') +
        '</strong><span>accuracy</span></div>';
      summary.appendChild(ring);

      var copy = el('div', 'vx-result-copy');
      copy.innerHTML =
        '<div class="vx-result-kicker">MATCH COMPLETE</div>' +
        '<h2>Your performance</h2>' +
        '<div class="vx-result-scoreline"><span>Score</span><strong>' + esc(scoreLabel) + '<small> / ' + total + '</small></strong></div>' +
        '<p>' + (res.auto ? 'The clock ran out before you submitted.' : 'Your answers have been submitted.') +
        ' Finished in ' + esc(fmtClock(res.seconds)) + '.</p>' +
        '<div class="vx-result-rank"><span>Leaderboard rank</span><strong>' + (rank > 0 ? '#' + rank : '—') + '</strong></div>';
      summary.appendChild(copy);
      w.appendChild(summary);

      var statsGrid = el('div', 'vx-result-stats');
      function addStat(label, value, tone) {
        var stat = el('div', 'vx-result-stat' + (tone ? ' ' + tone : ''));
        stat.innerHTML = '<span>' + label + '</span><strong>' + value + '</strong>';
        statsGrid.appendChild(stat);
      }
      addStat('Correct', stats ? stats.correct : '—', 'is-correct');
      addStat('Incorrect', stats ? stats.incorrect : '—', 'is-wrong');
      addStat('Skipped', stats ? stats.skipped : '—', 'is-skipped');
      addStat('Time taken', esc(fmtClock(res.seconds)), 'is-time');
      w.appendChild(statsGrid);

      var insights=arenaAnalysis(m,res);
      if(insights){
        var intel=el('section','vx-arena-intelligence');
        var intelHead=el('div','vx-arena-intelligence-head');
        intelHead.innerHTML='<div><span class="vx-arena-intelligence-kicker">VAANI INTELLIGENCE</span><h3>What this attempt tells you</h3><p>Your result is now converted into concrete study targets.</p></div>';
        var intelActions=el('div','vx-arena-intelligence-actions');
        var drill=el('button','vx-btn primary','Retry '+insights.mistakeCount+' mistake'+(insights.mistakeCount===1?'':'s'));
        drill.type='button';
        drill.disabled=!insights.mistakeCount;
        drill.addEventListener('click',startMistakeDrill);
        intelActions.appendChild(drill);
        if(typeof window.VAANI_ARENA_ANALYSIS_BRIEFING==='function'){
          var brief=el('button','vx-btn ghost','Brief Officer VAANI');
          brief.type='button';
          brief.addEventListener('click',function(){window.VAANI_ARENA_ANALYSIS_BRIEFING(insights);});
          intelActions.appendChild(brief);
        }
        intelHead.appendChild(intelActions);
        intel.appendChild(intelHead);

        var intelGrid=el('div','vx-arena-intel-grid');
        [
          ['ACCURACY',insights.accuracy+'%','overall question accuracy'],
          ['FOCUS ITEMS',String(insights.mistakeCount),'incorrect + skipped'],
          ['STRONGEST',insights.strongest?insights.strongest.name:'—',insights.strongest?insights.strongest.accuracy+'% accuracy':'not enough data'],
          ['FOCUS AREA',insights.weakest?insights.weakest.name:'—',insights.weakest?insights.weakest.accuracy+'% accuracy':'not enough data']
        ].forEach(function(item){
          var card=el('div','vx-arena-intel-card');
          card.innerHTML='<span>'+esc(item[0])+'</span><strong>'+esc(item[1])+'</strong><small>'+esc(item[2])+'</small>';
          intelGrid.appendChild(card);
        });
        intel.appendChild(intelGrid);

        if(insights.sections.length){
          var sections=el('div','vx-arena-intel-sections');
          sections.innerHTML='<div class="vx-arena-intel-subhead"><span>TOPIC SIGNAL</span><small>accuracy among answered questions</small></div>';
          insights.sections.slice(0,6).forEach(function(sec){
            var row=el('div','vx-arena-intel-section');
            row.innerHTML='<div><strong>'+esc(sec.name)+'</strong><small>'+sec.correct+' correct · '+sec.incorrect+' wrong · '+sec.skipped+' skipped</small></div><div class="vx-arena-intel-bar"><i style="width:'+sec.accuracy+'%"></i></div><b>'+sec.accuracy+'%</b>';
            sections.appendChild(row);
          });
          intel.appendChild(sections);
        }

        if(insights.mistakeCount){
          var misses=el('div','vx-arena-intel-mistakes');
          misses.innerHTML='<div class="vx-arena-intel-subhead"><span>REVIEW QUEUE</span><small>the first items VAANI recommends revisiting</small></div>';
          insights.mistakePreview.slice(0,5).forEach(function(item){
            var row=el('button','vx-arena-intel-mistake');
            row.type='button';
            row.innerHTML='<span>Q'+item.index+'</span><span><strong>'+esc(item.q.sec||item.q._exam||'Mixed')+'</strong><small>'+(item.status==='skipped'?'Skipped':'Incorrect')+'</small></span><b>Review →</b>';
            row.addEventListener('click',function(){S.screen='review';render();});
            misses.appendChild(row);
          });
          intel.appendChild(misses);
        }
        w.appendChild(intel);
        try{window.dispatchEvent(new CustomEvent('vaani:arena-analysis',{detail:insights}));}catch(e){}
      }

      if(S.practiceSummary){
        var practice=el('div','vx-arena-practice-complete');
        practice.innerHTML='<span class="vx-arena-intelligence-kicker">MISTAKE DRILL COMPLETE</span><strong>'+S.practiceSummary.correct+' correct · '+S.practiceSummary.incorrect+' wrong · '+S.practiceSummary.skipped+' skipped</strong><small>This drill did not change your official Arena leaderboard result.</small>';
        w.appendChild(practice);
        S.practiceSummary=null;
      }

      if(typeof window.vaaniResultBriefingNode==='function'){
        var officerBriefing=window.vaaniResultBriefingNode(accuracy,'Arena match');
        if(officerBriefing)w.appendChild(officerBriefing);
      }
    }

    w.appendChild(matchStrip(m));
    if (closed) {
      var scrim = el('div', 'vx-expired-scrim');
      scrim.setAttribute('role', 'dialog');
      scrim.setAttribute('aria-modal', 'true');
      scrim.setAttribute('aria-labelledby', 'vxExpiredTitle');
      var dialog = el('div', 'vx-expired-dialog');
      dialog.innerHTML =
        '<div class="vx-expired-icon" aria-hidden="true">⌛</div>' +
        '<h2 id="vxExpiredTitle">Session expired</h2>' +
        '<p>This match closed on ' + esc(new Date(m.expiresAt).toLocaleString()) +
        '. The leaderboard is no longer available.</p>';
      var returnBtn = el('button', 'vx-btn primary', 'Back to Arena');
      returnBtn.type = 'button';
      returnBtn.addEventListener('click', function () { go('home'); });
      dialog.appendChild(returnBtn);
      scrim.appendChild(dialog);
      w.appendChild(scrim);
      returnBtn.focus();
      return;
    }

    var entries = [];

    /* A new championship-style board: all interaction hooks remain local
       to this result view; the inline artwork is self-contained and offline-safe. */
    var championship = el('section', 'vx-championship');
    championship.setAttribute('aria-label', 'Match leaderboard');

    var championshipHero = el('div', 'vx-championship-hero');
    var heroCopy = el('div', 'vx-championship-hero-copy');
    heroCopy.innerHTML =
      '<span class="vx-championship-kicker"><i aria-hidden="true"></i> ARENA · FINAL STANDINGS</span>' +
      '<h3>Every second counts.</h3>' +
      '<p>The shared match board is live. Every submitted attempt is synchronized across participants; records remain unverified.</p>';
    var championshipStatus = el('div', 'vx-championship-status');
    var championshipStatusDot = el('span', 'vx-championship-status-dot');
    championshipStatusDot.setAttribute('aria-hidden', 'true');
    var championshipStatusText = el('span');
    championshipStatus.appendChild(championshipStatusDot);
    championshipStatus.appendChild(championshipStatusText);
    function updateChampionshipStatus() {
      if (A.sync.shared && !S._boardError) {
        championshipStatus.className = 'vx-championship-status is-shared';
        championshipStatusText.textContent = 'SHARED LIVE BOARD · UNVERIFIED';
      } else if (A.sync.shared) {
        championshipStatus.className = 'vx-championship-status is-error';
        championshipStatusText.textContent = 'SHARED BOARD OFFLINE · LOCAL COPY';
      } else {
        championshipStatus.className = 'vx-championship-status is-local';
        championshipStatusText.textContent = 'THIS DEVICE · LOCAL BOARD';
      }
    }
    updateChampionshipStatus();
    heroCopy.appendChild(championshipStatus);
    championshipHero.appendChild(heroCopy);

    var heroArt = el('div', 'vx-championship-art');
    heroArt.setAttribute('aria-hidden', 'true');
    heroArt.innerHTML =
      '<svg class="vx-championship-svg" viewBox="0 0 440 286" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
        '<defs>' +
          '<linearGradient id="vxChampCup" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#fff0a8"/><stop offset=".34" stop-color="#e4b84d"/><stop offset=".7" stop-color="#a86f20"/><stop offset="1" stop-color="#f7d97b"/>' +
          '</linearGradient>' +
          '<linearGradient id="vxChampCupSide" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="#a66b1d"/><stop offset=".55" stop-color="#dba83c"/><stop offset="1" stop-color="#fff0a4"/>' +
          '</linearGradient>' +
          '<linearGradient id="vxChampBase" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#d8e4f2"/><stop offset=".45" stop-color="#7791af"/><stop offset="1" stop-color="#263c5a"/>' +
          '</linearGradient>' +
          '<radialGradient id="vxChampGlow">' +
            '<stop offset="0" stop-color="#e6b94e" stop-opacity=".34"/><stop offset="1" stop-color="#e6b94e" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<filter id="vxChampShadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>' +
        '</defs>' +
        '<ellipse cx="235" cy="242" rx="157" ry="31" fill="url(#vxChampGlow)"/>' +
        '<g fill="none" stroke="#7ed8ef" stroke-opacity=".23">' +
          '<ellipse cx="235" cy="141" rx="184" ry="57" transform="rotate(-13 235 141)"/>' +
          '<ellipse cx="235" cy="141" rx="150" ry="43" transform="rotate(19 235 141)" stroke-dasharray="3 8"/>' +
        '</g>' +
        '<g fill="#d7f5ff" opacity=".9"><path d="M88 67l2.5 7.5L98 77l-7.5 2.5L88 87l-2.5-7.5L78 77l7.5-2.5z"/><path d="M353 56l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="333" cy="191" r="2"/><circle cx="115" cy="194" r="1.8"/></g>' +
        '<g class="vx-championship-cup-float">' +
          '<path d="M174 57h-27c0 29 13 48 39 54M266 57h27c0 29-13 48-39 54" fill="none" stroke="#c99534" stroke-width="13" stroke-linecap="round"/>' +
          '<path d="M147 57h-10c0 35 16 57 46 63" fill="none" stroke="#ffe69a" stroke-opacity=".75" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M293 57h10c0 35-16 57-46 63" fill="none" stroke="#ffe69a" stroke-opacity=".75" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M174 47h92l-8 69c-4 29-18 48-38 48s-34-19-38-48z" fill="url(#vxChampCup)" stroke="#ffe39a" stroke-width="1.2"/>' +
          '<path d="M220 48h46l-8 68c-4 29-18 48-38 48z" fill="url(#vxChampCupSide)" opacity=".62"/>' +
          '<path d="M181 57h78" stroke="#fff5c3" stroke-width="4" stroke-linecap="round" opacity=".8"/>' +
          '<path d="M206 90l14-17 14 17-5 23h-18z" fill="#fff3bf" opacity=".9"/>' +
          '<path d="M220 77v35" stroke="#bf8628" stroke-width="2" opacity=".72"/>' +
          '<path d="M209 94h22" stroke="#bf8628" stroke-width="2" opacity=".72"/>' +
          '<path d="M209 164h22l5 25h-32z" fill="url(#vxChampBase)"/>' +
          '<path d="M204 188h32l9 13h-50z" fill="#7b91ac"/>' +
          '<path d="M195 201h50l10 13h-70z" fill="url(#vxChampBase)" stroke="#adbed0" stroke-opacity=".62"/>' +
          '<path d="M220 202v11" stroke="#edf6ff" stroke-opacity=".65" stroke-width="2"/>' +
        '</g>' +
        '<g class="vx-championship-particles" fill="#9be8f7">' +
          '<circle cx="121" cy="111" r="2.5"/><circle cx="321" cy="110" r="2"/><circle cx="343" cy="150" r="3"/><circle cx="137" cy="164" r="2"/>' +
        '</g>' +
        '<g fill="none" stroke="#8bd9ec" stroke-opacity=".5" stroke-width="1.2"><path d="M105 220l30-13 22 13-30 13z"/><path d="M281 229l28-16 28 16-28 16z"/></g>' +
      '</svg>';
    championshipHero.appendChild(heroArt);
    championship.appendChild(championshipHero);

    var boardSummary = el('div', 'vx-board-summary vx-championship-metrics');
    championship.appendChild(boardSummary);

    var toolbar = el('div', 'vx-board-toolbar vx-championship-toolbar');
    var search = el('input', 'vx-board-search vx-championship-search');
    search.type = 'search';
    search.placeholder = 'Find a cadet by name…';
    search.setAttribute('aria-label', 'Search leaderboard players');
    search.autocomplete = 'off';
    var filters = el('div', 'vx-board-filters vx-championship-filters');
    var activeFilter = 'all';
    var filterDefs = [
      { id: 'all', label: 'All' },
      { id: 'top3', label: 'Top 3' },
      { id: 'mine', label: 'My rank' }
    ];
    var filterButtons = {};
    filterDefs.forEach(function (def) {
      var b = el('button', 'vx-board-filter vx-championship-filter', def.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(def.id === activeFilter));
      b.addEventListener('click', function () {
        activeFilter = def.id;
        Object.keys(filterButtons).forEach(function (id) {
          filterButtons[id].setAttribute('aria-pressed', String(id === activeFilter));
        });
        drawBoard();
      });
      filterButtons[def.id] = b;
      filters.appendChild(b);
    });
    var refresh = el('button', 'vx-btn ghost vx-board-refresh vx-championship-refresh', '↻ Refresh board');
    refresh.type = 'button';
    refresh.addEventListener('click', function () {
      if (refresh.disabled || Date.now() >= Number(m.expiresAt)) { if (Date.now() >= Number(m.expiresAt)) go('result'); return; }
      refresh.disabled = true;
      refresh.textContent = 'Refreshing…';
      loadBoard().then(function () {
        if (S.screen !== 'result' || !S.match || S.match.code !== m.code) return;
        if (Date.now() >= Number(m.expiresAt)) { go('result'); return; }
        refresh.disabled = false;
        refresh.textContent = '↻ Refresh board';
        drawBoard();
      });
    });
    toolbar.appendChild(search);
    toolbar.appendChild(filters);
    toolbar.appendChild(refresh);
    championship.appendChild(toolbar);

    var podiumHead = el('div','vx-championship-section-head vx-board-heading');
    podiumHead.innerHTML='<div><span>THE PODIUM</span><p>Standout performances from this match</p></div><span class="vx-championship-count">0 attempts</span>';
    championship.appendChild(podiumHead);
    var podium = el('div', 'vx-podium vx-championship-podium');
    var listHead = el('div','vx-championship-list-head');
    listHead.innerHTML='<span>RANK & CADET</span><span>SCORE</span><span>TIME</span>';
    var board = el('div', 'vx-board vx-championship-board');
    var status = el('p', 'vx-board-status vx-championship-statusline');
    status.setAttribute('aria-live', 'polite');
    championship.appendChild(podium);
    championship.appendChild(listHead);
    championship.appendChild(board);
    championship.appendChild(status);
    w.appendChild(championship);

    /* ---------------------------------------------------------
       MOBILE ARENA BOARD
       A deliberately separate composition from the desktop
       championship board. Desktop markup remains unchanged.
       --------------------------------------------------------- */
    var mobileBoard = el('section', 'vx-arena-mobile-board');
    mobileBoard.setAttribute('aria-label', 'Mobile match leaderboard');

    var mobileTop = el('div', 'vx-amb-top');
    var mobileTitle = el('div', 'vx-amb-title');
    mobileTitle.innerHTML =
      '<span class="vx-amb-eyebrow"><i></i> ARENA LIVE</span>' +
      '<h3>Match standings</h3>' +
      '<p>Fast view. Tap a cadet for score details.</p>';
    var mobileRefresh = el('button', 'vx-amb-refresh', '↻');
    mobileRefresh.type = 'button';
    mobileRefresh.setAttribute('aria-label', 'Refresh leaderboard');
    mobileTop.appendChild(mobileTitle);
    mobileTop.appendChild(mobileRefresh);
    mobileBoard.appendChild(mobileTop);

    var mobileHero = el('div', 'vx-amb-you-card');
    mobileBoard.appendChild(mobileHero);

    var mobileStats = el('div', 'vx-amb-stats');
    mobileBoard.appendChild(mobileStats);

    var mobileControls = el('div', 'vx-amb-controls');
    var mobileSearch = el('input', 'vx-amb-search');
    mobileSearch.type = 'search';
    mobileSearch.placeholder = 'Search cadets…';
    mobileSearch.autocomplete = 'off';
    mobileSearch.setAttribute('aria-label', 'Search leaderboard cadets');
    mobileControls.appendChild(mobileSearch);
    var mobileFilters = el('div', 'vx-amb-filter-row');
    mobileControls.appendChild(mobileFilters);
    mobileBoard.appendChild(mobileControls);

    var mobilePodium = el('div', 'vx-amb-podium');
    mobileBoard.appendChild(mobilePodium);

    var mobileListHead = el('div', 'vx-amb-list-head');
    mobileListHead.innerHTML = '<span>STANDINGS</span><span>SCORE</span>';
    mobileBoard.appendChild(mobileListHead);
    var mobileList = el('div', 'vx-amb-list');
    mobileBoard.appendChild(mobileList);
    var mobileStatus = el('div', 'vx-amb-status');
    mobileBoard.appendChild(mobileStatus);

    var mobileFilter = 'all';
    var mobileFilterButtons = {};
    [
      {id:'all',label:'All'},
      {id:'top3',label:'Top 3'},
      {id:'mine',label:'My rank'}
    ].forEach(function(def){
      var b=el('button','vx-amb-filter',def.label);
      b.type='button';
      b.setAttribute('aria-pressed',String(def.id===mobileFilter));
      b.addEventListener('click',function(){
        mobileFilter=def.id;
        Object.keys(mobileFilterButtons).forEach(function(id){
          mobileFilterButtons[id].setAttribute('aria-pressed',String(id===mobileFilter));
        });
        drawMobileBoard();
      });
      mobileFilterButtons[def.id]=b;
      mobileFilters.appendChild(b);
    });

    mobileRefresh.addEventListener('click', function(){
      if(mobileRefresh.disabled || Date.now() >= Number(m.expiresAt)){
        if(Date.now() >= Number(m.expiresAt)) go('result');
        return;
      }
      mobileRefresh.disabled=true;
      mobileRefresh.textContent='…';
      loadBoard().then(function(){
        if(S.screen !== 'result' || !S.match || S.match.code !== m.code) return;
        mobileRefresh.disabled=false;
        mobileRefresh.textContent='↻';
        drawMobileBoard();
      },function(){
        mobileRefresh.disabled=false;
        mobileRefresh.textContent='↻';
        drawMobileBoard();
      });
    });
    mobileSearch.addEventListener('input', drawMobileBoard);

    function drawMobileBoard() {
      var allEntries = S.rows.slice(0, MAX_PLAYERS).map(function(row,i){
        return {row:row,rank:i+1};
      });
      var currentPid = (res && res.pid) ? String(res.pid) : playerId();
      var my = allEntries.find(function(x){ return x.row.pid === currentPid; });
      var myRank = my ? my.rank : 0;
      var top = allEntries[0];

      mobileHero.innerHTML =
        '<div class="vx-amb-you-label">YOUR STANDING</div>' +
        '<div class="vx-amb-you-main">' +
          '<strong class="vx-amb-you-rank">' + (myRank ? '#'+myRank : '—') + '</strong>' +
          '<div class="vx-amb-you-copy"><b>' + esc(my ? String(my.row.name || 'Cadet') : 'Your result') + '</b>' +
          '<span>' + (my ? esc(String(my.row.score)+' / '+String(my.row.total)) : 'Not ranked yet') + '</span></div>' +
        '</div>' +
        '<div class="vx-amb-you-foot">' +
          '<span>' + (my ? 'Finished in '+esc(fmtClock(my.row.seconds)) : 'Submit your attempt to enter the standings') + '</span>' +
          '<em>' + (top ? 'Leader '+esc(String(top.row.score))+'/'+esc(String(top.row.total)) : 'No attempts yet') + '</em>' +
        '</div>';

      mobileStats.innerHTML =
        '<div><span>PLAYERS</span><b>' + allEntries.length + '</b></div>' +
        '<div><span>LEADER</span><b>' + (top ? esc(String(top.row.score)) : '—') + '</b></div>' +
        '<div><span>YOUR RANK</span><b>' + (myRank ? '#'+myRank : '—') + '</b></div>';

      var query=String(mobileSearch.value||'').trim().toLowerCase();
      var visible=allEntries.filter(function(entry){
        var name=String(entry.row.name||'Cadet').toLowerCase();
        if(query && !name.includes(query)) return false;
        if(mobileFilter==='top3' && entry.rank>3) return false;
        if(mobileFilter==='mine' && entry.row.pid!==playerId()) return false;
        return true;
      });

      mobilePodium.innerHTML='';
      visible.filter(function(e){return e.rank<=3;}).forEach(function(entry){
        var card=el('button','vx-amb-podium-card rank-'+entry.rank);
        card.type='button';
        var name=String(entry.row.name||'Cadet');
        var medal={1:'1ST',2:'2ND',3:'3RD'}[entry.rank];
        card.innerHTML=
          '<span class="vx-amb-podium-rank">'+medal+'</span>'+
          arenaAvatarHtml(entry.row.avatar || (entry.row.pid===playerId()?profileAvatarSnapshot():null),name,'vx-amb-podium-avatar')+
          '<b>'+esc(name)+'</b>'+
          '<span>'+esc(String(entry.row.score))+'/'+esc(String(entry.row.total))+' · '+esc(fmtClock(entry.row.seconds))+'</span>';
        card.addEventListener('click',function(){openPlayerSheet(entry.row,entry.rank);});
        mobilePodium.appendChild(card);
      });
      mobilePodium.hidden = mobilePodium.children.length === 0;

      mobileList.innerHTML='';
      if(!visible.length){
        mobileList.appendChild(el('div','vx-amb-empty',
          S._boardError ? 'Leaderboard unavailable. Tap refresh.' :
          (mobileFilter==='mine' ? 'Your result is not on the board yet.' :
          (query ? 'No cadets found.' : 'No attempts recorded yet.'))));
      } else {
        visible.forEach(function(entry){
          var row=entry.row;
          var name=String(row.name||'Cadet');
          var item=el('button','vx-amb-row'+(row.pid===playerId()?' is-you':''));
          item.type='button';
          item.innerHTML=
            '<span class="vx-amb-row-rank">'+entry.rank+'</span>'+
            arenaAvatarHtml(row.avatar || (row.pid===playerId()?profileAvatarSnapshot():null),name,'vx-amb-row-avatar')+
            '<span class="vx-amb-row-name"><b>'+esc(name)+'</b><small>'+
              (row.pid===playerId()?'YOU':'CADET')+'</small></span>'+
            '<span class="vx-amb-row-score"><b>'+esc(String(row.score))+
              '<small>/'+esc(String(row.total))+'</small></b><small>'+esc(fmtClock(row.seconds))+'</small></span>'+
            '<span class="vx-amb-row-arrow">›</span>';
          item.setAttribute('aria-label',name+', rank '+entry.rank+', score '+row.score+' out of '+row.total);
          item.addEventListener('click',function(){openPlayerSheet(row,entry.rank);});
          mobileList.appendChild(item);
        });
      }
      mobileStatus.textContent=visible.length+' '+(visible.length===1?'cadet':'cadets')+' shown';
    }

    w.appendChild(mobileBoard);

    function drawBoard() {
      entries = S.rows.slice(0, MAX_PLAYERS).map(function (row, i) { return { row: row, rank: i + 1 }; });
      var currentPid = (res && res.pid) ? String(res.pid) : playerId();
      var myRank = entries.findIndex(function (entry) { return entry.row.pid === currentPid; }) + 1;
      var topScore = entries.length ? String(entries[0].row.score) + '/' + String(entries[0].row.total) : '—';
      boardSummary.innerHTML = '';
      [
        {label:'Attempts',value:String(entries.length),hint:'Recorded on this board'},
        {label:'Top score',value:topScore,hint:'Current match lead'},
        {label:'Your position',value:myRank>0?'#'+myRank:'—',hint:myRank>0?'Your standing':'Not ranked yet'}
      ].forEach(function (item, i) {
        var card=el('div','vx-board-summary-card vx-championship-metric metric-'+(i+1));
        card.innerHTML='<span>'+esc(item.label)+'</span><strong>'+esc(item.value)+'</strong><small>'+esc(item.hint)+'</small>';
        boardSummary.appendChild(card);
      });
      var count = podiumHead.querySelector('.vx-championship-count');
      if (count) count.textContent = entries.length + ' ' + (entries.length === 1 ? 'attempt' : 'attempts');
      var resultRank = w.querySelector('.vx-result-rank strong');
      if (resultRank) resultRank.textContent = myRank > 0 ? '#' + myRank : '—';
      updateChampionshipStatus();
      podium.innerHTML = '';
      board.innerHTML = '';
      var query = String(search.value || '').trim().toLowerCase();
      var visible = entries.filter(function (entry) {
        var name = String(entry.row.name || 'Cadet').toLowerCase();
        if (query && !name.includes(query)) return false;
        if (activeFilter === 'top3' && entry.rank > 3) return false;
        if (activeFilter === 'mine' && entry.row.pid !== playerId()) return false;
        return true;
      });

      var podiumEntries = visible.filter(function (entry) { return entry.rank <= 3; });
      podium.hidden = podiumEntries.length === 0;
      podiumEntries.forEach(function (entry) {
        var medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        var podiumName = String(entry.row.name || 'Cadet');
        var initials = podiumName.trim().slice(0, 1).toUpperCase() || 'C';
        var card = el('button', 'vx-podium-card vx-championship-podium-card rank-' + entry.rank);
        card.type = 'button';
        card.innerHTML =
          '<span class="vx-podium-medal" aria-hidden="true">' + medals[entry.rank] + '</span>' +
          '<span class="vx-podium-rank">RANK ' + entry.rank + '</span>' +
          arenaAvatarHtml(entry.row.avatar || (entry.row.pid === playerId() ? profileAvatarSnapshot() : null),podiumName,'vx-championship-podium-avatar') +
          '<strong class="vx-podium-name">' + esc(podiumName) + '</strong>' +
          '<span class="vx-podium-score">' + esc(String(entry.row.score)) + ' / ' + esc(String(entry.row.total)) + '</span>' +
          '<span class="vx-championship-podium-time">' + esc(fmtClock(entry.row.seconds)) + ' · FINISH</span>';
        card.setAttribute('aria-label', (entry.row.name || 'Cadet') + ', rank ' + entry.rank + '. View details.');
        card.addEventListener('click', function () { openPlayerSheet(entry.row, entry.rank); });
        podium.appendChild(card);
      });

      if (!visible.length) {
        var empty = S._boardError
          ? 'Could not load the leaderboard. Select Refresh board to try again.'
          : (activeFilter === 'mine' ? 'Your attempt is not on this leaderboard yet.'
          : (query ? 'No players match this search.' : 'No attempts recorded yet.'));
        board.appendChild(el('div', 'vx-empty', empty));
      } else {
        visible.forEach(function (entry) {
          var row = entry.row, rank = entry.rank;
          var rowName = String(row.name || 'Cadet');
          var rowInitial = rowName.trim().slice(0, 1).toUpperCase() || 'C';
          var tr = el('div', 'vx-row vx-row-tap vx-championship-row' + (row.pid === playerId() ? ' is-you' : '') + (rank <= 3 ? ' is-podium' : ''));
          tr.innerHTML =
            '<span class="vx-rank"><span class="vx-championship-rank-pill">' + rank + '</span></span>' +
            '<span class="vx-championship-player">' +
              arenaAvatarHtml(row.avatar || (row.pid === playerId() ? profileAvatarSnapshot() : null),rowName,'vx-championship-avatar') +
              '<span class="vx-championship-player-copy"><strong class="vx-player-name">' + esc(rowName) + '</strong>' +
              (row.pid === playerId() ? '<small class="vx-championship-you">YOUR RESULT</small>' : '<small class="vx-championship-player-label">CADET</small>') +
              '</span></span>' +
            '<span class="vx-championship-score"><strong class="vx-score">' + esc(String(row.score)) + '<small> / ' + esc(String(row.total)) + '</small></strong></span>' +
            '<span class="vx-time vx-championship-time"><small>TIME</small><strong>' + esc(fmtClock(row.seconds)) + '</strong></span>' +
            '<span class="vx-row-chevron" aria-hidden="true">›</span>';
          tr.setAttribute('role', 'button');
          tr.tabIndex = 0;
          tr.setAttribute('aria-label', rowName + ', rank ' + rank + ', ' + row.score + ' out of ' + row.total + '. View details.');
          tr.addEventListener('click', function () { openPlayerSheet(row, rank); });
          tr.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlayerSheet(row, rank); }
          });
          board.appendChild(tr);
        });
      }
      status.textContent = visible.length + ' player' + (visible.length === 1 ? '' : 's') + ' shown';
      drawMobileBoard();
    }
    search.addEventListener('input', drawBoard);
    drawBoard();
    loadBoard().then(function () {
      if (S.screen === 'result' && S.match && S.match.code === m.code) drawBoard();
    }).catch(function () {
      if (S.screen === 'result' && S.match && S.match.code === m.code) drawBoard();
    });
    scheduleResultExpiry(m);

    if (isHost(m.code)) {
      var hostKey = el('button', 'vx-btn primary vx-host-key-launch', 'Open host answer key');
      hostKey.type = 'button';
      hostKey.style.marginTop = '18px';
      hostKey.addEventListener('click', function () { go('hostAnswers'); });
      w.appendChild(hostKey);
    }

    var again = el('button', 'vx-btn ghost', 'Back to Arena');
    again.type = 'button'; again.style.marginTop = '18px';
    again.addEventListener('click', function () { go('home'); });

    if (res && res.qids && res.qids.length) {
      var review = el('button', 'vx-btn ghost', 'View answers');
      review.type = 'button'; review.style.marginTop = '18px'; review.style.marginRight = '10px';
      review.addEventListener('click', function () { go('review'); });
      w.appendChild(review);
    }
    w.appendChild(again);
  }

  function sharedById() {
    try { return (typeof PYQ_BY_ID !== 'undefined') ? PYQ_BY_ID : {}; }
    catch (e) { return {}; }
  }

  /* The picked question SET for a match depends only on match.seed —
     shuffleOrder + playerName only ever re-sort that same set, they
     never change which questions are in it. So any name works here;
     we only want the set, to grade against. */
  function matchQuestions() {
    return A.questionsFor(S.match, '');
  }

  /* Correct / incorrect / skipped for one row, derived client-side
     from its synced answers map against the shared question bank —
     works even though the score itself carries fractional negative
     marking. Returns null when no answer record reached the board
     (e.g. an attempt submitted before this synced answers at all). */
  function gradeRow(row) {
    if (!row) return null;

    // New attempts carry counts computed against the exact questions at submit time.
    if (Number.isFinite(Number(row.correct)) &&
        Number.isFinite(Number(row.incorrect)) &&
        Number.isFinite(Number(row.skipped))) {
      return {
        correct: Math.max(0, Math.round(Number(row.correct))),
        incorrect: Math.max(0, Math.round(Number(row.incorrect))),
        skipped: Math.max(0, Math.round(Number(row.skipped)))
      };
    }

    if (row.answers) {
      var qs = Array.isArray(row.qSnapshots)&&row.qSnapshots.length ? row.qSnapshots : matchQuestions();
      if (qs.length) {
        // For legacy perfect attempts, the official score proves every question
        // earned its full mark even if the current question bank has since changed.
        if (Number(row.score) === Number(row.total) && Number(row.total) === qs.length) {
          return {correct:qs.length,incorrect:0,skipped:0};
        }

        var correct = 0, incorrect = 0, skipped = 0;
        qs.forEach(function (q) {
          var given = row.answers[q._id];
          if (given === undefined) skipped++;
          else if (answerMatches(given, q.ans)) correct++;
          else incorrect++;
        });
        return { correct: correct, incorrect: incorrect, skipped: skipped };
      }
    }

    // Legacy shared rows can lack aggregate counts. First infer using
    // the match's configured negative-marking rule; when that metadata is
    // unavailable, try the supported negative-marking rules and only accept
    // a result when the solution is unambiguous.
    var total = Math.max(0, Math.round(Number(row.total) || 0));
    var score = Math.round(Number(row.score) * 100) / 100;
    if (total > 0 && Number.isFinite(score)) {
      var negFracs = [];
      var configured = S.match ? Number(S.match.negMark) : -1;
      if (configured >= 0 && configured < NEG_MARKS.length && NEG_MARKS[configured] < 0) {
        negFracs.push(NEG_MARKS[configured]);
      } else {
        negFracs = NEG_MARKS.filter(function(frac){ return frac < 0; });
      }

      var solutions = [];
      negFracs.forEach(function(negFrac){
        for (var wrong = 0; wrong <= total; wrong++) {
          var exactCorrect = score - negFrac * wrong;
          var wholeCorrect = Math.round(exactCorrect);
          if (Math.abs(exactCorrect - wholeCorrect) > 0.005) continue;
          var skip = total - wholeCorrect - wrong;
          if (wholeCorrect < 0 || skip < 0) continue;
          var checkScore = Math.round((wholeCorrect + negFrac * wrong) * 100) / 100;
          if (Math.abs(checkScore - score) <= 0.005) {
            var candidate = {correct:wholeCorrect, incorrect:wrong, skipped:skip};
            if (!solutions.some(function(item){
              return item.correct === candidate.correct &&
                     item.incorrect === candidate.incorrect &&
                     item.skipped === candidate.skipped;
            })) solutions.push(candidate);
          }
        }
      });
      if (solutions.length === 1) return solutions[0];
    }
    return null;
  }
  /* ---------------------------------------------------------
     PLAYER DETAIL SHEET
     Any attempter tapping a name gets a public time + correct/
     incorrect/skipped summary. The question-by-question answer
     breakdown is intentionally kept out of leaderboard taps.
     --------------------------------------------------------- */
  function openPlayerSheet(row, rank) {
    var scrim = el('div', 'vx-scrim');
    scrim.setAttribute('role', 'dialog');
    scrim.setAttribute('aria-modal', 'true');
    scrim.setAttribute('aria-label', row.name + (String(row.name).slice(-1) === 's' ? '\u2019' : '\u2019s') + ' attempt');

    var sheet = el('div', 'vx-sheet');
    scrim.appendChild(sheet);

    function teardown() {
      document.removeEventListener('keydown', onKey);
      scrim.remove();
    }
    function close() { teardown(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    scrim.addEventListener('mousedown', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', onKey);

    // Leaderboard taps expose only the compact public summary.
    // The question-by-question breakdown is intentionally unavailable.
    renderPlayerSummary(sheet, row, rank, close);

    document.body.appendChild(scrim);
    var first = sheet.querySelector('button');
    if (first) first.focus();
  }

  function sheetHeader(sheet, row, rank) {
    sheet.appendChild(el('h3', null, esc(row.name)));
    sheet.appendChild(el('p', 'vx-sub',
      'Rank #' + rank + ' &middot; ' + row.score + '/' + row.total + ' &middot; finished in ' + fmtClock(row.seconds)));
  }

  function closeButton(close) {
    var actions = el('div', 'vx-actions'); actions.style.marginTop = '18px';
    var btn = el('button', 'vx-btn ghost', 'Close'); btn.type = 'button';
    btn.addEventListener('click', close);
    actions.appendChild(btn);
    return actions;
  }

  function localAttemptForRow(row) {
    var candidates = [];
    try {
      if (S.result) candidates.push(S.result);
      if (S.match && S.match.code) {
        var previous = previousAttempt(S.match.code);
        if (previous) candidates.push(previous);
      }
    } catch (e) {}

    var normalizedName = String(row && row.name || '').trim().toLowerCase();
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (!candidate) continue;
      if (row && candidate.pid && row.pid && String(candidate.pid) === String(row.pid)) return candidate;
      if (normalizedName && String(candidate.name || '').trim().toLowerCase() === normalizedName && candidate.answers) return candidate;
    }
    return null;
  }

  function renderPlayerSummary(sheet, row, rank, close) {
    sheetHeader(sheet, row, rank);
    var stats = gradeRow(row);
    if (!stats) {
      var local = localAttemptForRow(row);
      if (local) stats = gradeRow(local);
    }
    if (stats) {
      var read = el('div', 'vx-readout');
      read.innerHTML =
        '<span><b style="color:var(--vx-ok)">' + stats.correct + '</b> correct</span>' +
        '<span><b style="color:var(--vx-danger)">' + stats.incorrect + '</b> incorrect</span>' +
        '<span><b style="color:var(--vx-muted)">' + stats.skipped + '</b> skipped</span>';
      sheet.appendChild(read);
    } else {
      sheet.appendChild(el('p', 'vx-sub', 'Attempt statistics are unavailable.'));
    }
    sheet.appendChild(closeButton(close));
  }
  /* ---------------------------------------------------------
     REVIEW  ·  question-by-question right/wrong after submission
     --------------------------------------------------------- */
  function screenReview(w) {
    var res = S.result;
    backBtn(w, 'Result', 'result');
    w.appendChild(el('h3', null, 'View answers'));
    if (!res || !res.qids || !res.qids.length) {
      w.appendChild(el('p', 'vx-sub', 'No answer record is available for this attempt.'));
      return;
    }
    w.appendChild(el('p', 'vx-sub', 'Green is what you picked and correct. Red is what you picked and wrong — the correct option is marked separately. Grey means you left it blank.'));

    var byId = sharedById();
    var resultQuestions = Array.isArray(res.qSnapshots)&&res.qSnapshots.length ? res.qSnapshots : null;
    var list = el('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:16px;margin-top:16px';
    res.qids.forEach(function (qid, i) {
      var q = resultQuestions ? resultQuestions[i] : byId[qid];
      var card = el('div', 'vx-tile');
      card.style.cursor = 'default';
      if (!q) {
        card.innerHTML = '<p class="vx-sub">Question ' + (i + 1) + ' is no longer available on this device.</p>';
        list.appendChild(card);
        return;
      }
      var given = res.answers ? res.answers[qid] : undefined;
      var body =
        '<p style="font-size:.78rem;color:var(--vx-muted);margin:0 0 8px">Question ' + (i + 1) + (q.sec ? ' · ' + esc(q.sec) : '') + '</p>' +
        (q.passage ? '<div class="pv-passage"><div class="pv-passage-label">Passage</div><div class="pv-passage-text">' + esc(q.passage) + '</div></div>' : '') +
        '<p style="font-size:1rem;line-height:1.6;color:var(--vx-ink);margin:0 0 14px">' +
        (q.keyword ? '<b>' + esc(q.keyword) + '</b> — ' : '') +
        (typeof pyqHi === 'function' ? pyqHi(q) : esc(q.q)) + '</p>';
      card.innerHTML = body;
      var opts = el('div', 'vx-seg');
      opts.style.flexDirection = 'column';
      (q.o || []).forEach(function (text, oi) {
        var cls = '';
        var officialPerfect = Number(res.score) === Number(res.total) && Number(res.total) === res.qids.length && res.qids.length > 0;
        if (officialPerfect && given !== undefined) cls = (answerMatches(oi,given) ? ' correct' : '');
        else if (answerMatches(oi,q.ans)) cls = ' correct';
        else if (given !== undefined && answerMatches(oi,given)) cls = ' wrong';
        var b = el('div', 'opt-btn' + cls, esc(text));
        b.style.cursor = 'default';
        opts.appendChild(b);
      });
      card.appendChild(opts);
      if (given === undefined) {
        card.appendChild(el('p', 'vx-hint', 'You left this blank — no penalty.'));
      }
      list.appendChild(card);
    });
    w.appendChild(list);

    var back = el('button', 'vx-btn ghost', 'Back to result');
    back.type = 'button'; back.style.marginTop = '18px';
    back.addEventListener('click', function () { go('result'); });
    w.appendChild(back);
  }

  /* ---------------------------------------------------------
     local records + safe legacy migration
     --------------------------------------------------------- */
  /*
   * Arena originally used device-wide localStorage keys. The first account
   * isolation patch stopped reading those keys, which made the old owner's
   * history appear to vanish. V3 migrates only records that can be attributed
   * to the active account without guessing.
   *
   * Strong ownership signal:
   *   - attempt timestamp >= this account's creation timestamp
   *
   * Fallback only for genuinely old account records that lack a creation date:
   *   - exact stored attempt name match
   *
   * A freshly-created account therefore cannot inherit an older account's
   * attempted Arena history just because both accounts use the same device.
   */
  function arenaActiveCode(){
    try { return (typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE) ? String(ACTIVE_CODE) : ''; }
    catch(e){ return ''; }
  }
  function arenaNameKey(value){ return String(value||'').trim().replace(/\s+/g,' ').toLowerCase(); }
  function safeJsonStorageGet(key){
    try{
      var raw=localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function accountCreatedAtMs(){
    var candidates=[];
    try{
      if(typeof DATA!=='undefined' && DATA && DATA.createdAt)candidates.push(DATA.createdAt);
    }catch(e){}
    try{
      if(typeof State!=='undefined' && State && State.accountCreatedAt)candidates.push(State.accountCreatedAt);
    }catch(e){}
    for(var i=0;i<candidates.length;i++){
      var ms=new Date(candidates[i]).getTime();
      if(Number.isFinite(ms) && ms>0)return ms;
    }
    return 0;
  }

  function legacyPrimaryAccountCode(){
    /*
     * The very first account created by the old migration path is the safest
     * owner for the old device-wide Arena store. New accounts created later
     * must never claim that history. Use the oldest persisted account record
     * rather than the active name, which avoids same-name account collisions.
     */
    var migrationDone=false;
    try{ migrationDone=localStorage.getItem('vaani_account_migration_v1')==='done'; }catch(e){}
    if(!migrationDone)return '';
    var active=arenaActiveCode();
    if(!active)return '';
    var oldestCode='', oldestAt=Infinity, count=0;
    try{
      Object.keys(localStorage).forEach(function(key){
        var prefix='vbv_veer_bhogya_account_';
        if(key.indexOf(prefix)!==0)return;
        var code=key.slice(prefix.length);
        var account=safeJsonStorageGet(key);
        if(!account || typeof account!=='object')return;
        count++;
        var raw=account.vbv && account.vbv.createdAt;
        var at=new Date(raw||0).getTime();
        if(!Number.isFinite(at)||at<=0)at=Infinity;
        if(at<oldestAt){
          oldestAt=at;
          oldestCode=code;
        }
      });
    }catch(e){}
    return count===1 ? active : (oldestCode||'')===active ? active : '';
  }
  function legacyAttemptBelongsToActiveAccount(entry){
    if(!entry || typeof entry!=='object')return false;
    if(legacyPrimaryAccountCode())return true;
    var created=accountCreatedAtMs();
    var at=Number(entry.at);
    if(created && Number.isFinite(at) && at>0){
      // Allow a small clock-skew margin around account creation.
      return at >= created - 5*60*1000 && at <= Date.now()+5*60*1000;
    }
    // Existing pre-account records may lack createdAt. Only use an exact name
    // fallback in that case; new accounts always receive a createdAt.
    if(!created){
      var name=arenaNameKey(playerName());
      return !!name && arenaNameKey(entry.name)===name;
    }
    return false;
  }
  function migrationMarkerKey(){
    return 'vx_arena_legacy_migrated_v4_' + arenaActiveCode();
  }
  function migrateLegacyArenaStorage(){
    var account=arenaActiveCode();
    if(!account)return false;
    var marker=migrationMarkerKey();
    try{ if(localStorage.getItem(marker)==='1')return false; }catch(e){}

    var legacyRecent=safeJsonStorageGet('vx_arena_recent');
    if(!Array.isArray(legacyRecent))legacyRecent=[];
    var legacyPid='';
    try{ legacyPid=String(localStorage.getItem('vx_player_id')||''); }catch(e){}

    var ownedCodes={};
    var ownedEntries={};
    var legacyPrimary=!!legacyPrimaryAccountCode();
    try{
      Object.keys(localStorage).forEach(function(key){
        if(key.indexOf('vx_arena_done_')!==0)return;
        var code=key.slice('vx_arena_done_'.length);
        var entry=safeJsonStorageGet(key);
        if(entry && legacyAttemptBelongsToActiveAccount(entry)){
          ownedCodes[code]=true;
          ownedEntries[code]=entry;
        }
      });
    }catch(e){}

    // The primary legacy account is allowed to recover old match history even
    // when no attempt was made on a particular match (host-only history).
    if(legacyPrimary){
      legacyRecent.forEach(function(item){
        if(item && item.code)ownedCodes[String(item.code)]=true;
      });
    }else{
      // Also inspect done records referenced by recent history.
      legacyRecent.forEach(function(item){
        if(!item || !item.code)return;
        var code=String(item.code);
        if(ownedCodes[code])return;
        var done=safeJsonStorageGet('vx_arena_done_'+code);
        if(done && legacyAttemptBelongsToActiveAccount(done)){
          ownedCodes[code]=true;
          ownedEntries[code]=done;
        }
      });
    }

    // Nothing can be safely attributed to this account.
    if(!Object.keys(ownedCodes).length && !legacyPid){
      try{ localStorage.setItem(marker,'1'); }catch(e){}
      return false;
    }

    var did=false;

    // Recover only recent-match rows tied to an owned attempt. This preserves
    // the old user's visible history without copying unrelated host/join records.
    var ownedRecent=legacyRecent.filter(function(item){
      return item && item.code && !!ownedCodes[String(item.code)];
    }).slice(0,20);

    var scopedRecentKey=arenaAccountKey('vx_arena_recent');
    var existingRecent=safeJsonStorageGet(scopedRecentKey);
    if(!Array.isArray(existingRecent) && ownedRecent.length){
      try{
        localStorage.setItem(scopedRecentKey,JSON.stringify(ownedRecent));
        did=true;
      }catch(e){}
    }

    Object.keys(ownedCodes).forEach(function(code){
      var oldDone=ownedEntries[code] || safeJsonStorageGet('vx_arena_done_'+code);
      if(oldDone){
        var target=arenaAccountKey('vx_arena_done_'+code);
        if(!safeJsonStorageGet(target)){
          try{ localStorage.setItem(target,JSON.stringify(oldDone)); did=true; }catch(e){}
        }
      }

      // A board cache is safe to migrate only alongside an owned attempt.
      var oldBoard=safeJsonStorageGet('vx_arena_board_'+code);
      if(Array.isArray(oldBoard)){
        var boardTarget=arenaAccountKey('vx_arena_board_'+code);
        if(!safeJsonStorageGet(boardTarget)){
          try{ localStorage.setItem(boardTarget,JSON.stringify(oldBoard)); did=true; }catch(e){}
        }
      }
    });

    // Preserve the legacy player id for the account that actually owns the
    // recovered attempt. This keeps existing Supabase leaderboard rows tied to
    // the same player instead of silently creating a second identity.
    if(legacyPid && Object.keys(ownedCodes).length){
      var pidTarget=arenaAccountKey('vx_player_id');
      try{
        if(!localStorage.getItem(pidTarget)){
          localStorage.setItem(pidTarget,legacyPid);
          did=true;
        }
      }catch(e){}
    }

    // Recover an interrupted run only when the same account owns its finished
    // historical record for that match, avoiding cross-account resume leaks.
    try{
      var recovery=safeJsonStorageGet('vx_arena_active_recovery_v1');
      if(recovery && recovery.code && ownedCodes[String(recovery.code)] && !safeJsonStorageGet(arenaRecoveryKey())){
        localStorage.setItem(arenaRecoveryKey(),JSON.stringify(recovery));
        did=true;
      }
    }catch(e){}

    try{ localStorage.setItem(marker,'1'); }catch(e){}
    return did;
  }

  function loadRecent() {
    migrateLegacyArenaStorage();
    try { return JSON.parse(localStorage.getItem(arenaAccountKey('vx_arena_recent')) || '[]'); }
    catch (e) { return []; }
  }
  function saveRecent(list) {
    try { localStorage.setItem(arenaAccountKey('vx_arena_recent'), JSON.stringify(list.slice(0, 20))); } catch (e) {}
  }
  function rememberMatch(m) {
    var list = loadRecent().filter(function (r) { return r.code !== m.code; });
    list.unshift({ code: m.code, count: m.count, source: m.source, expiresAt: m.expiresAt, hostName: matchHostName(m), hostAvatar: m.hostAvatar || null, myScore: null });
    saveRecent(list);
  }
  function recordAttempt(code, entry) {
    var list = loadRecent();
    var hit = list.filter(function (r) { return r.code === code; })[0];
    if (hit) { hit.myScore = entry.score; hit.mySeconds = entry.seconds; saveRecent(list); }
    try { localStorage.setItem(arenaAccountKey('vx_arena_done_' + code), JSON.stringify(entry)); } catch (e) {}
  }
  function previousAttempt(code) {
    migrateLegacyArenaStorage();
    try { return JSON.parse(localStorage.getItem(arenaAccountKey('vx_arena_done_' + code)) || 'null'); }
    catch (e) { return null; }
  }

  /* =========================================================
     BOOT — take over #view-games whenever it is shown
     ========================================================= */
  function boot() {
    if (typeof global.switchView === 'function' && !global.switchView.__vxArena) {
      var orig = global.switchView;
      global.switchView = function (name) {
        var out = orig.apply(this, arguments);
        if (name === 'games') { try { render(); } catch (e) { console.error('[Arena]', e); } }
        else if (VX.timer && S.run) { /* leaving mid-match: keep the clock, warn */ }
        return out;
      };
      global.switchView.__vxArena = true;
    }
    // deep link: ?arena=CODE&host=NAME
    var qs = new URLSearchParams(location.search);
    var code = qs.get('arena');
    var inviteHost = qs.get('host') || '';
    var inviteAvatarSrc = qs.get('av') || '';
    var inviteAvatar = inviteAvatarSrc ? {src:inviteAvatarSrc,x:Number(qs.get('ax'))||50,y:Number(qs.get('ay'))||50,zoom:Number(qs.get('az'))||1} : null;
    if (code) {
      var m = A.decode(code);
      if (m) {
        m = hydrateMatch(m, inviteHost, inviteAvatar);
        S.match = m; S.screen = 'briefing'; rememberMatch(m);
        fetchSharedMatchMetadata(m).then(function() {
          if (S.match && S.match.code === m.code) render();
        });
      }
    } else {
      var recovery=readRunRecovery();
      if(recovery){
        var recoveredMatch=A.decode(recovery.code);
        if(recoveredMatch&&!previousAttempt(recovery.code)&&Date.now()<recoveredMatch.expiresAt){
          S.match=recoveredMatch;
          S.recoverySnapshot=recovery;
          S.screen='briefing';
          rememberMatch(recoveredMatch);
        }else{
          try{localStorage.removeItem(arenaRecoveryKey());}catch(e){}
        }
      }
    }
    if (host() && host().offsetParent !== null) render();
    // Local boards need no remote cleanup; a future verified adapter owns its retention policy.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
