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

   What a verified server can add later: a shared leaderboard.
   Until attempts are authenticated and validated server-side,
   boards remain local to this device.
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
    var pool = poolForSource(match.source);
    pool = applyFilters(pool, match.type, match.paperKey);
    // sort first so the starting order is identical everywhere,
    // regardless of the order papers happened to load in
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
    // State is also `const`-declared in app.js — same bare-identifier read.
    var s; try { s = (typeof State !== 'undefined') ? State : {}; } catch (e) { s = {}; }
    return s.name || s.cadetName || (localStorage.getItem('vaani_name') || '').trim() || 'Cadet';
  }
  function playerId() {
    var k = 'vx_player_id';
    var v = localStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2, 10); localStorage.setItem(k, v); }
    return v;
  }

  /* Host privilege is a client-side label only — there is no server
     auth, so it just marks "this device ran Create match for this
     code." Anyone determined could set the same flag by hand; that's
     an acceptable trust level for a study-group tool like this one. */
  function markHost(code) {
    try { localStorage.setItem('vx_arena_host_' + code, '1'); } catch (e) {}
  }
  function isHost(code) {
    try { return localStorage.getItem('vx_arena_host_' + code) === '1'; }
    catch (e) { return false; }
  }

  /* =========================================================
     LEADERBOARD SYNC
     Default adapter: this device only.
     ========================================================= */
  var LocalAdapter = {
    name: 'local',
    live: false,
    key: function (code) { return 'vx_arena_board_' + code; },
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

  /* Shared historical reads are served by a narrow Edge Function. The
     browser key is publishable; score submissions remain device-local until
     a trusted validation endpoint is implemented. */
  var SHARED_BOARD_ENDPOINT = 'https://pccavdwwhykwyeitxixc.supabase.co/functions/v1/arena-leaderboard';
  var SHARED_BOARD_API_KEY = 'sb_publishable_VfRmr2xFvu4Iv8sfSJReQQ_qzr5z_MI';
  var SharedReadAdapter = {
    name: 'shared-read',
    live: false,
    shared: true,
    submit: function (code, entry) {
      return LocalAdapter.submit(code, entry);
    },
    fetch: function (code) {
      if (typeof global.fetch !== 'function') return Promise.reject(new Error('Shared leaderboard fetch is unavailable'));
      return global.fetch(SHARED_BOARD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SHARED_BOARD_API_KEY
        },
        body: JSON.stringify({ code: code })
      }).then(function (response) {
        if (!response.ok) throw new Error('Shared leaderboard returned HTTP ' + response.status);
        return response.json();
      }).then(function (payload) {
        if (!payload || !Array.isArray(payload.rows)) throw new Error('Shared leaderboard response is invalid');
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
  var S = { screen: 'home', match: null, draft: null, run: null, result: null, rows: [], hostSpectate: false };

  function host() { return document.getElementById('view-games'); }

  function clearQTimer() {
    if (S._qTimerHandle) { clearInterval(S._qTimerHandle); S._qTimerHandle = null; }
  }

  function render() {
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
    // guarded: scrollIntoView is universal in real browsers, but costs
    // nothing to check first rather than assume
    if (typeof wrap.scrollIntoView === 'function') {
      wrap.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
  A.render = render;

  function go(screen) {
    S.screen=screen;
    if(typeof global.VAANI_SET_ASSESSMENT_ACTIVE==='function')global.VAANI_SET_ASSESSMENT_ACTIVE(screen==='run');
    render();
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
      { label: 'Recent matches', value: recentAll.length, detail: 'On this device' },
      { label: 'Open codes', value: openCount, detail: 'Still available' },
      { label: 'Your submissions', value: attemptedCount, detail: 'First attempts only' }
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
    recentHeading.innerHTML = '<div><span class="vx-section-kicker">MATCH HISTORY</span><h3>Your recent matches</h3><p>Quick access to codes you created or joined on this device.</p></div><span class="vx-section-count">' + recent.length + ' shown</span>';
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
      ? 'Historical standings are shared across players as unverified records. New score submissions stay on this device.'
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
        S.match=parsed;
        S.hostName=match.hostName;
        markHost(parsed.code);
        rememberMatch(parsed);
        go('share');
      });
      actionButtons.appendChild(cancel);actionButtons.appendChild(make);actionBar.appendChild(actionButtons);
      form.appendChild(actionBar);
    }
    draw();
  }

  function screenShareV2(w) {
    var m = hydrateMatch(S.match);
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

      var boardBtn=el('button','vx-btn ghost vx-host-action-secondary');
      boardBtn.type='button';
      boardBtn.textContent='View leaderboard';
      boardBtn.addEventListener('click',function(){
        loadBoard().then(function(){go('result');}).catch(function(){go('result');});
      });
      actions.appendChild(boardBtn);
    }
    shell.appendChild(actions);

    var copyRow=el('div','vx-invite-copy-row');
    var copyInvite=el('button','vx-btn ghost','Copy invite link');
    copyInvite.type='button';
    copyInvite.addEventListener('click',function(){
      if(!navigator.clipboard){say('Clipboard is unavailable.');return;}
      navigator.clipboard.writeText(inviteUrl).then(function(){
        copyInvite.textContent='Invite link copied';setTimeout(function(){copyInvite.textContent='Copy invite link';},1600);
      });
    });
    copyRow.appendChild(copyInvite);

    var copyCode=el('button','vx-btn ghost','Copy code');
    copyCode.type='button';
    copyCode.addEventListener('click',function(){
      if(!navigator.clipboard){say('Clipboard is unavailable.');return;}
      navigator.clipboard.writeText(A.prettyCode(m.code)).then(function(){
        copyCode.textContent='Code copied';setTimeout(function(){copyCode.textContent='Copy code';},1600);
      });
    });
    copyRow.appendChild(copyCode);

    if(navigator.share){
      var share=el('button','vx-btn ghost','Share invite');
      share.type='button';
      share.addEventListener('click',function(){
        navigator.share({title:'VAANI Arena · '+(hostName||'Host'),text:'Join my VAANI Arena match hosted by '+(hostName||'the host')+'.',url:inviteUrl}).catch(function(){});
      });
      copyRow.appendChild(share);
    }
    shell.appendChild(copyRow);

    var note=el('div','vx-arena-host-note');
    note.innerHTML=ownHost
      ? '<span>HOST ACCESS</span><p><b>Participate</b> enters the normal test. <b>Spectate</b> opens the private host control room with the answer key, leaderboard and question-by-question player performance without starting an attempt.</p>'
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
        var prompt=(typeof pyqHi==='function'?pyqHi(q):esc(q.q));
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
        S.match = parsed;
        markHost(parsed.code);
        rememberMatch(parsed);
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
      S.match = m; rememberMatch(m); go('briefing');
    }
    go2.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
    actions.appendChild(go2);
    w.appendChild(actions);
    input.focus();
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
  function beginRun(questions) {
    S.run = { questions: questions, index: 0, answers: {}, skipped: {}, startedAt: Date.now() };
    go('run');
    if (VX.timer) {
      VX.timer.start({
        mode: 'countdown',
        seconds: S.match.seconds,
        onEnd: function () { say('Time up — your answers were submitted.'); finishRun(true); }
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
      b.addEventListener('click', function () { r.index = i; render(); });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function screenRun(w) {
    var r = S.run, m = S.match;
    if (!r) return go('home');
    var q = r.questions[r.index];

    var top = el('div', 'vx-meta-strip');
    top.innerHTML =
      '<span class="vx-chip">Question ' + (r.index + 1) + ' of ' + r.questions.length + '</span>' +
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
      '<p style="font-size:1rem;line-height:1.65;color:var(--vx-ink);margin:0 0 18px">' +
      (q.keyword ? '<b>' + esc(q.keyword) + '</b> — ' : '') + esc(q.q) + '</p>';
    card.innerHTML = body;

    var opts = el('div', 'vx-seg');
    opts.style.flexDirection = 'column';
    q.o.forEach(function (text, i) {
      var b = el('button', null, esc(text));
      b.type = 'button';
      b.style.textAlign = 'left';
      b.style.width = '100%';
      b.setAttribute('aria-pressed', String(r.answers[q._id] === i));
      b.addEventListener('click', function () {
        r.answers[q._id] = i;
        delete r.skipped[q._id];
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
    prev.addEventListener('click', function () { r.index--; render(); });
    var next = el('button', 'vx-btn ghost', 'Skip'); next.type = 'button';
    next.disabled = r.index >= r.questions.length - 1;
    next.addEventListener('click', function () {
      if (r.answers[q._id] === undefined) r.skipped[q._id] = true;
      r.index++; render();
    });
    nav.appendChild(prev); nav.appendChild(next);
    w.appendChild(nav);

    var answered = Object.keys(r.answers).length;
    var submit = el('button', 'vx-btn ' + (answered === r.questions.length ? 'primary' : 'danger'),
      'Submit (' + answered + '/' + r.questions.length + ' answered)');
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
    var r = S.run, m = S.match;
    if (!r) return;
    if (VX.timer) VX.timer.stop();
    clearQTimer();
    var negFrac = NEG_MARKS[m.negMark] || 0;
    var score = 0;
    r.questions.forEach(function (q) {
      var a = r.answers[q._id];
      if (a === undefined) return; // blank — never penalised
      score += (a === q.ans) ? 1 : negFrac;
    });
    score = Math.round(score * 100) / 100;
    var seconds = Math.min(m.seconds, Math.round((Date.now() - r.startedAt) / 1000));
    var entry = {
      pid: playerId(), name: playerName(), score: score,
      avatar: profileAvatarSnapshot(), seconds: seconds, total: r.questions.length,
      at: Date.now(), auto: !!auto,
      qids: r.questions.map(function (q) { return q._id; }),
      answers: r.answers,
      expiresAt: m.expiresAt
    };
    S.result = entry;
    S.run = null;
    recordAttempt(m.code, entry);
    if (typeof global.addXP === 'function') global.addXP(score * 2, 'Arena match');
    A.sync.submit(m.code, entry).then(loadBoard).then(function () { go('result'); },
      function () {
        S._boardError = true;
        S.rows = reconcileLocalAttempt([]);
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
        else if (Number(own.at) >= Number(out[index].at || 0)) out[index] = own;
      }
    }
    return rankRows(out);
  }

  function loadBoard() {
    if (!S.match) { S.rows = []; S._boardError = true; return Promise.resolve(S.rows); }
    S._boardError = false;
    return Promise.resolve().then(function () { return A.sync.fetch(S.match.code); }).then(function (rows) {
      S.rows = reconcileLocalAttempt(rows);
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

    if(hostSpectating){
      var control=el('section','vx-host-spectate-panel');
      control.innerHTML=
        '<div><span class="vx-arena-setup-kicker">HOST CONTROL · SPECTATE MODE</span>' +
        '<h2>Observe without attempting.</h2>' +
        '<p>The leaderboard below is live. Click any submitted player to inspect correct, incorrect and skipped questions. The answer key is available without starting the test.</p></div>';
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
      '<p>Prior shared attempts are shown as unverified history. New submissions stay on this device until secure score validation is available.</p>';
    var championshipStatus = el('div', 'vx-championship-status');
    var championshipStatusDot = el('span', 'vx-championship-status-dot');
    championshipStatusDot.setAttribute('aria-hidden', 'true');
    var championshipStatusText = el('span');
    championshipStatus.appendChild(championshipStatusDot);
    championshipStatus.appendChild(championshipStatusText);
    function updateChampionshipStatus() {
      if (A.sync.shared && !S._boardError) {
        championshipStatus.className = 'vx-championship-status is-shared';
        championshipStatusText.textContent = 'SHARED READ · UNVERIFIED HISTORY';
      } else if (A.sync.shared) {
        championshipStatus.className = 'vx-championship-status is-error';
        championshipStatusText.textContent = 'SHARED READ OFFLINE · LOCAL FALLBACK';
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

    function drawBoard() {
      entries = S.rows.slice(0, MAX_PLAYERS).map(function (row, i) { return { row: row, rank: i + 1 }; });
      var myRank = entries.findIndex(function (entry) { return entry.row.pid === playerId(); }) + 1;
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
    }
    search.addEventListener('input', drawBoard);
    drawBoard();
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
    if (!row.answers) return null;
    var qs = matchQuestions();
    if (!qs.length) return null;
    var correct = 0, incorrect = 0, skipped = 0;
    qs.forEach(function (q) {
      var given = row.answers[q._id];
      if (given === undefined) skipped++;
      else if (given === q.ans) correct++;
      else incorrect++;
    });
    return { correct: correct, incorrect: incorrect, skipped: skipped };
  }

  /* ---------------------------------------------------------
     PLAYER DETAIL SHEET
     Any attempter tapping a name gets a time + correct/incorrect/
     skipped summary. Whoever hosted the match (this device only —
     see isHost) additionally gets the full question-by-question
     breakdown for that person, same colouring as "View answers".
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

    if (isHost(S.match.code)) renderPlayerBreakdown(sheet, row, rank, close);
    else renderPlayerSummary(sheet, row, rank, close);

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

  function renderPlayerSummary(sheet, row, rank, close) {
    sheetHeader(sheet, row, rank);
    var stats = gradeRow(row);
    if (stats) {
      var read = el('div', 'vx-readout');
      read.innerHTML =
        '<span><b style="color:var(--vx-ok)">' + stats.correct + '</b> correct</span>' +
        '<span><b style="color:var(--vx-danger)">' + stats.incorrect + '</b> incorrect</span>' +
        '<span><b style="color:var(--vx-muted)">' + stats.skipped + '</b> skipped</span>';
      sheet.appendChild(read);
    } else {
      sheet.appendChild(el('p', 'vx-sub', 'A detailed breakdown is not available for this attempt.'));
    }
    sheet.appendChild(closeButton(close));
  }

  function renderPlayerBreakdown(sheet, row, rank, close) {
    sheetHeader(sheet, row, rank);
    var qs = matchQuestions();
    if (!qs.length || !row.answers) {
      sheet.appendChild(el('p', 'vx-sub', 'A detailed breakdown is not available for this attempt.'));
      sheet.appendChild(closeButton(close));
      return;
    }
    sheet.appendChild(el('p', 'vx-sub', 'Green is correct. Red is what they picked and got wrong — the correct option is marked separately. Grey means they left it blank.'));
    var list = el('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:16px;margin-top:6px';
    qs.forEach(function (q, i) {
      var given = row.answers[q._id];
      var card = el('div', 'vx-tile');
      card.style.cursor = 'default';
      card.innerHTML =
        '<p style="font-size:.78rem;color:var(--vx-muted);margin:0 0 8px">Question ' + (i + 1) + (q.sec ? ' &middot; ' + esc(q.sec) : '') + '</p>' +
        (q.passage ? '<div class="pv-passage"><div class="pv-passage-label">Passage</div><div class="pv-passage-text">' + esc(q.passage) + '</div></div>' : '') +
        '<p style="font-size:1rem;line-height:1.6;color:var(--vx-ink);margin:0 0 14px">' +
        (q.keyword ? '<b>' + esc(q.keyword) + '</b> &mdash; ' : '') +
        (typeof pyqHi === 'function' ? pyqHi(q) : esc(q.q)) + '</p>';
      var opts = el('div', 'vx-seg');
      opts.style.flexDirection = 'column';
      (q.o || []).forEach(function (text, oi) {
        var cls = '';
        if (oi === q.ans) cls = ' correct';
        else if (oi === given) cls = ' wrong';
        var b = el('div', 'opt-btn' + cls, esc(text));
        b.style.cursor = 'default';
        opts.appendChild(b);
      });
      card.appendChild(opts);
      if (given === undefined) card.appendChild(el('p', 'vx-hint', 'Left blank &mdash; no penalty.'));
      list.appendChild(card);
    });
    sheet.appendChild(list);
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
    var list = el('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:16px;margin-top:16px';
    res.qids.forEach(function (qid, i) {
      var q = byId[qid];
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
        if (oi === q.ans) cls = ' correct';
        else if (oi === given) cls = ' wrong';
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
     local records
     --------------------------------------------------------- */
  function loadRecent() {
    try { return JSON.parse(localStorage.getItem('vx_arena_recent') || '[]'); }
    catch (e) { return []; }
  }
  function saveRecent(list) {
    try { localStorage.setItem('vx_arena_recent', JSON.stringify(list.slice(0, 20))); } catch (e) {}
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
    try { localStorage.setItem('vx_arena_done_' + code, JSON.stringify(entry)); } catch (e) {}
  }
  function previousAttempt(code) {
    try { return JSON.parse(localStorage.getItem('vx_arena_done_' + code) || 'null'); }
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
      }
    }
    if (host() && host().offsetParent !== null) render();
    // Local boards need no remote cleanup; a future verified adapter owns its retention policy.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
