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

   What a server would add: a shared live leaderboard across
   devices. Until one is connected, boards are per-device.
   See ArenaSync at the bottom — swap in the Supabase adapter
   and every board becomes live for all players.
   ============================================================ */
(function (global) {
  'use strict';

  var VX = global.VX = global.VX || {};
  var A = VX.arena = {};

  var MAX_PLAYERS = 100;
  var CODE_VERSION = 1;
  var EPOCH = Date.UTC(2024, 0, 1) / 60000; // minutes since 2024-01-01, keeps codes short

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
     src 0=NDA 1=CDS 2=BOTH  (+3 means "shuffle the order per player")
     --------------------------------------------------------- */
  var SRC_CODES = ['NDA', 'CDS', 'BOTH'];

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

  A.encode = function (m) {
    var srcIdx = SRC_CODES.indexOf(m.source);
    if (srcIdx < 0) srcIdx = 2;
    if (m.shuffleOrder) srcIdx += 3;
    var body =
      b36(CODE_VERSION, 1) +
      b36(srcIdx, 1) +
      b36(m.count, 2) +
      b36(m.seconds, 3) +
      b36(m.cap, 2) +
      b36(m.seed, 6) +
      b36(Math.round(m.expiresAt / 60000) - EPOCH, 7);
    return body + checksum(body);
  };

  A.decode = function (raw) {
    var code = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (code.length !== 24) return null;
    var body = code.slice(0, 22);
    if (checksum(body) !== code.slice(22)) return null;
    var v = unb36(body.slice(0, 1));
    if (v !== CODE_VERSION) return null;
    var srcIdx = unb36(body.slice(1, 2));
    var shuffleOrder = srcIdx >= 3;
    if (shuffleOrder) srcIdx -= 3;
    var m = {
      code: code,
      source: SRC_CODES[srcIdx] || 'BOTH',
      shuffleOrder: shuffleOrder,
      count: unb36(body.slice(2, 4)),
      seconds: unb36(body.slice(4, 7)),
      cap: unb36(body.slice(7, 9)),
      seed: unb36(body.slice(9, 15)),
      expiresAt: (unb36(body.slice(15, 22)) + EPOCH) * 60000
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

  A.questionsFor = function (match, playerName) {
    var pool = (VX.poolFor ? VX.poolFor(match.source) : sharedPYQAll());
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

  A.sync = LocalAdapter;
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
  var S = { screen: 'home', match: null, draft: null, run: null, result: null, rows: [] };

  function host() { return document.getElementById('view-games'); }

  function render() {
    var h = host();
    if (!h) return;
    h.innerHTML = '';
    var wrap = el('div', 'vx-arena');
    h.appendChild(wrap);
    ({
      home: screenHome, create: screenCreate, share: screenShare,
      join: screenJoin, briefing: screenBriefing, run: screenRun,
      result: screenResult, help: screenHelp
    }[S.screen] || screenHome)(wrap);
    // guarded: scrollIntoView is universal in real browsers, but costs
    // nothing to check first rather than assume
    if (typeof wrap.scrollIntoView === 'function') {
      wrap.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
  A.render = render;

  function go(screen) { S.screen = screen; render(); }

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

    /* recent matches on this device */
    var recent = loadRecent();
    if (recent.length) {
      w.appendChild(el('h3', null, 'Your recent matches'));
      var board = el('div', 'vx-board');
      board.style.marginTop = '12px';
      recent.slice(0, 6).forEach(function (r) {
        var row = el('div', 'vx-row');
        var expired = Date.now() > r.expiresAt;
        row.innerHTML =
          '<span class="vx-rank">' + (expired ? '&times;' : '&bull;') + '</span>' +
          '<span>' + esc(A.prettyCode(r.code)) + '<br><span class="vx-time">' +
            r.count + ' questions &middot; ' + r.source +
            (expired ? ' &middot; closed' : ' &middot; open until ' + new Date(r.expiresAt).toLocaleString()) +
          '</span></span>' +
          '<span class="vx-score">' + (r.myScore != null ? r.myScore + '/' + r.count : '—') + '</span>';
        var b = el('button', 'vx-btn ghost', expired ? 'Board' : 'Open');
        b.type = 'button';
        b.style.padding = '7px 14px';
        b.addEventListener('click', function () {
          var m = A.decode(r.code);
          if (!m) { say('That code could not be read.'); return; }
          S.match = m;
          if (expired) { S.result = null; loadBoard().then(function () { go('result'); }); }
          else go('briefing');
        });
        row.appendChild(b);
        board.appendChild(row);
      });
      w.appendChild(board);
    }

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
      '<li><b>The host sets the test.</b> Question bank (NDA, CDS or both), how many questions, the time limit, how many players can join, and the date the code closes.</li>' +
      '<li><b>A code is generated.</b> Share it however you like. The code carries the settings, so nothing needs to be uploaded anywhere.</li>' +
      '<li><b>Everyone gets the same questions.</b> Up to ' + MAX_PLAYERS + ' players can use one code. The question set is identical for all of them — only the order changes, and only if the host asked for that.</li>' +
      '<li><b>Play whenever you like, before the deadline.</b> Players do not have to start together. Once the closing time passes, the code stops working and no new attempts are accepted.</li>' +
      '<li><b>One attempt each.</b> Your score and your finishing time both count — a tie on score is broken by whoever was faster.</li>';
    w.appendChild(ol);
    var note = el('p', 'vx-sub');
    note.style.marginTop = '18px';
    note.innerHTML = A.sync.live
      ? 'Leaderboards are shared live across every player.'
      : 'Right now the leaderboard shows attempts made on this device. Connect a database to make boards live for everyone — see the integration notes.';
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
      minutes: 20,
      cap: 10,
      shuffleOrder: false,
      deadline: d.toISOString().slice(0, 16)
    };
  }

  function screenCreate(w) {
    backBtn(w, 'Arena', 'home');
    w.appendChild(el('h3', null, 'Start a match'));
    w.appendChild(el('p', 'vx-sub', 'These settings are locked into the code once you create it.'));

    var d = S.draft;
    var form = el('div');
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

    function draw() {
      form.innerHTML = '';
      var nda = VX.poolFor ? VX.poolFor('NDA').length : 0;
      var cds = VX.poolFor ? VX.poolFor('CDS').length : 0;
      var max = VX.poolFor ? VX.poolFor(d.source).length : 0;
      if (d.count > max) d.count = max;

      /* bank */
      var f0 = el('div', 'vx-field');
      f0.appendChild(el('label', null, 'Question bank<span class="vx-hint">Questions are drawn at random from whichever bank you pick.</span>'));
      var choices = [];
      if (nda) choices.push('NDA');
      if (cds) choices.push('CDS');
      if (nda && cds) choices.push('BOTH');
      if (!choices.length) choices = ['NDA'];
      f0.appendChild(seg(choices, d.source, function (v) {
        return v === 'BOTH' ? 'Both (' + (nda + cds) + ')' : v + ' (' + (v === 'NDA' ? nda : cds) + ')';
      }, function (v) { d.source = v; draw(); }));
      if (!cds) f0.appendChild(el('span', 'vx-hint', 'CDS papers are not loaded yet. Drop them into data/pyq/ and this option appears on its own.'));
      form.appendChild(f0);

      /* questions */
      var f1 = el('div', 'vx-field');
      f1.appendChild(el('label', null, 'Questions<span class="vx-hint">' + max + ' available in this bank. Up to 1295 per match.</span>'));
      f1.appendChild(seg([10, 20, 30, 50].filter(function (v) { return v <= max; }), d.count,
        function (v) { return v; }, function (v) { d.count = v; draw(); }));
      var cn = el('input', 'vx-num'); cn.type = 'number'; cn.min = 1; cn.max = Math.min(max, 1295); cn.value = d.count;
      cn.setAttribute('aria-label', 'Custom number of questions'); cn.style.marginTop = '8px';
      cn.addEventListener('change', function () { d.count = Math.max(1, Math.min(cn.max, parseInt(cn.value, 10) || 1)); draw(); });
      f1.appendChild(cn);
      form.appendChild(f1);

      /* time */
      var f2 = el('div', 'vx-field');
      f2.appendChild(el('label', null, 'Time limit<span class="vx-hint">Every player gets the same clock. Tests submit themselves at zero.</span>'));
      f2.appendChild(seg([5, 10, 20, 30, 45], d.minutes, function (v) { return v + ' min'; },
        function (v) { d.minutes = v; draw(); }));
      var mn = el('input', 'vx-num'); mn.type = 'number'; mn.min = 1; mn.max = 300; mn.value = d.minutes;
      mn.setAttribute('aria-label', 'Custom minutes'); mn.style.marginTop = '8px';
      mn.addEventListener('change', function () { d.minutes = Math.max(1, Math.min(300, parseInt(mn.value, 10) || 1)); draw(); });
      f2.appendChild(mn);
      form.appendChild(f2);

      /* players */
      var f3 = el('div', 'vx-field');
      f3.appendChild(el('label', null, 'Players<span class="vx-hint">How many people may use this code. ' + MAX_PLAYERS + ' is the ceiling.</span>'));
      f3.appendChild(seg([2, 5, 10, 25, 50, 100], d.cap, function (v) { return v; },
        function (v) { d.cap = v; draw(); }));
      form.appendChild(f3);

      /* deadline */
      var f4 = el('div', 'vx-field');
      f4.appendChild(el('label', null, 'Code closes<span class="vx-hint">After this moment the code stops working and no new attempts count.</span>'));
      var dl = el('input', 'vx-num'); dl.type = 'datetime-local'; dl.value = d.deadline;
      dl.min = new Date(Date.now() + 6e4).toISOString().slice(0, 16);
      dl.setAttribute('aria-label', 'Closing date and time');
      dl.addEventListener('change', function () { d.deadline = dl.value; });
      f4.appendChild(dl);
      form.appendChild(f4);

      /* order */
      var f5 = el('div', 'vx-field');
      f5.appendChild(el('label', null, 'Question order<span class="vx-hint">The questions are always the same. This only decides whether everyone meets them in the same order.</span>'));
      f5.appendChild(seg([false, true], d.shuffleOrder,
        function (v) { return v ? 'Shuffled per player' : 'Same for everyone'; },
        function (v) { d.shuffleOrder = v; draw(); }));
      form.appendChild(f5);

      var actions = el('div', 'vx-actions');
      var cancel = el('button', 'vx-btn ghost', 'Cancel'); cancel.type = 'button';
      cancel.addEventListener('click', function () { go('home'); });
      var make = el('button', 'vx-btn primary', 'Create match'); make.type = 'button';
      if (max < 1) { make.disabled = true; make.textContent = 'No questions loaded'; }
      make.addEventListener('click', function () {
        var expiresAt = new Date(d.deadline).getTime();
        if (!expiresAt || expiresAt <= Date.now()) { say('Pick a closing time in the future.'); return; }
        var match = {
          source: d.source, count: d.count, seconds: d.minutes * 60,
          cap: Math.min(d.cap, MAX_PLAYERS), shuffleOrder: d.shuffleOrder,
          seed: Math.floor(Math.random() * 2176782335), expiresAt: expiresAt
        };
        match.code = A.encode(match);
        // round-trip so what we show is exactly what a joiner will read
        var parsed = A.decode(match.code);
        if (!parsed) { say('Could not build a code from those settings.'); return; }
        S.match = parsed;
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
      Math.round(m.seconds / 60) + ' min. Tap to jump straight in:';

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

  function matchStrip(m) {
    var strip = el('div', 'vx-meta-strip');
    var closed = Date.now() > m.expiresAt;
    strip.innerHTML =
      '<span class="vx-chip">' + m.count + ' questions</span>' +
      '<span class="vx-chip">' + Math.round(m.seconds / 60) + ' min</span>' +
      '<span class="vx-chip">' + (m.source === 'BOTH' ? 'NDA + CDS' : m.source) + '</span>' +
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
      var m = A.decode(input.value);
      if (!m) { err.textContent = 'That code could not be read. Check for a missing or mistyped character.'; return; }
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
    backBtn(w, 'Arena', 'home');
    w.appendChild(el('h3', null, 'Before you start'));
    w.appendChild(matchStrip(m));

    var prev = previousAttempt(m.code);
    if (prev) {
      var done = el('p', 'vx-sub');
      done.innerHTML = 'You already sat this match and scored <b>' + prev.score + '/' + m.count +
        '</b> in ' + fmtClock(prev.seconds) + '. Only your first attempt counts.';
      w.appendChild(done);
      var seeBoard = el('button', 'vx-btn primary', 'See the leaderboard'); seeBoard.type = 'button';
      seeBoard.addEventListener('click', function () {
        S.result = prev; loadBoard().then(function () { go('result'); });
      });
      w.appendChild(seeBoard);
      return;
    }

    var qs = A.questionsFor(m, playerName());
    if (qs.length < m.count) {
      var warn = el('p', 'vx-sub');
      warn.style.color = 'var(--vx-danger)';
      warn.textContent = 'This match needs ' + m.count + ' questions but only ' + qs.length +
        ' are loaded on this device. Make sure you are on the same version of VAANI as the host.';
      w.appendChild(warn);
      if (!qs.length) return;
    }

    var ol = el('ol', 'vx-steps');
    ol.innerHTML =
      '<li><b>' + m.count + ' questions, ' + Math.round(m.seconds / 60) + ' minutes.</b> The clock starts the moment you begin and does not pause.</li>' +
      '<li><b>It submits itself at zero.</b> Anything left blank is marked wrong.</li>' +
      '<li><b>One attempt.</b> Your score and your finishing time both go on the board.</li>';
    w.appendChild(ol);

    var start = el('button', 'vx-btn primary', 'Begin'); start.type = 'button';
    start.style.marginTop = '8px';
    start.addEventListener('click', function () { beginRun(qs); });
    w.appendChild(start);
  }

  /* ---------------------------------------------------------
     RUN
     --------------------------------------------------------- */
  function beginRun(questions) {
    S.run = { questions: questions, index: 0, answers: {}, startedAt: Date.now() };
    go('run');
    if (VX.timer) {
      VX.timer.start({
        mode: 'countdown',
        seconds: S.match.seconds,
        onEnd: function () { say('Time up — your answers were submitted.'); finishRun(true); }
      });
    }
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

    var card = el('div', 'vx-tile');
    card.style.cursor = 'default';
    var body = '<p style="font-size:1rem;line-height:1.65;color:var(--vx-ink);margin:0 0 18px">' +
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
    next.addEventListener('click', function () { r.index++; render(); });
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
  }

  function finishRun(auto) {
    var r = S.run, m = S.match;
    if (!r) return;
    if (VX.timer) VX.timer.stop();
    var score = 0;
    r.questions.forEach(function (q) { if (r.answers[q._id] === q.ans) score++; });
    var seconds = Math.min(m.seconds, Math.round((Date.now() - r.startedAt) / 1000));
    var entry = {
      pid: playerId(), name: playerName(), score: score,
      seconds: seconds, total: r.questions.length,
      at: Date.now(), auto: !!auto
    };
    S.result = entry;
    S.run = null;
    recordAttempt(m.code, entry);
    if (typeof global.addXP === 'function') global.addXP(score * 2, 'Arena match');
    A.sync.submit(m.code, entry).then(loadBoard).then(function () { go('result'); },
      function () { go('result'); });
  }

  /* ---------------------------------------------------------
     RESULT + BOARD
     --------------------------------------------------------- */
  function loadBoard() {
    return Promise.resolve(A.sync.fetch(S.match.code)).then(function (rows) {
      S.rows = rankRows(rows || []);
      return S.rows;
    }, function () { S.rows = []; return S.rows; });
  }

  function screenResult(w) {
    var m = S.match, res = S.result;
    backBtn(w, 'Arena', 'home');
    w.appendChild(el('h3', null, 'Result'));

    if (res) {
      var hero = el('div', 'vx-arena-hero');
      hero.style.padding = '30px';
      var pct = Math.round((res.score / res.total) * 100);
      hero.innerHTML =
        '<h2 style="font-size:2.6rem;margin-bottom:4px">' + res.score + '<span style="opacity:.5;font-size:1.3rem">/' + res.total + '</span></h2>' +
        '<p>' + pct + '% correct, finished in ' + fmtClock(res.seconds) +
        (res.auto ? '. The clock ran out before you submitted.' : '.') + '</p>';
      w.appendChild(hero);
    }

    w.appendChild(matchStrip(m));
    w.appendChild(el('h3', null, 'Leaderboard'));

    var board = el('div', 'vx-board');
    board.style.marginTop = '12px';
    if (!S.rows.length) {
      board.appendChild(el('div', 'vx-empty', 'No attempts recorded yet.'));
    } else {
      var me = playerId();
      S.rows.slice(0, MAX_PLAYERS).forEach(function (row, i) {
        var tr = el('div', 'vx-row' + (row.pid === me ? ' is-you' : '') + (i < 3 ? ' is-podium' : ''));
        tr.innerHTML =
          '<span class="vx-rank">' + (i + 1) + '</span>' +
          '<span>' + esc(row.name) + (row.pid === me ? ' <span class="vx-time">you</span>' : '') + '</span>' +
          '<span class="vx-score">' + row.score + '/' + row.total + '</span>' +
          '<span class="vx-time">' + fmtClock(row.seconds) + '</span>';
        board.appendChild(tr);
      });
    }
    w.appendChild(board);

    if (!A.sync.live) {
      var note = el('p', 'vx-sub');
      note.style.marginTop = '14px';
      note.textContent = 'This board covers attempts made on this device. Connect a database to see every player here.';
      w.appendChild(note);
    }

    var again = el('button', 'vx-btn ghost', 'Back to Arena');
    again.type = 'button'; again.style.marginTop = '18px';
    again.addEventListener('click', function () { go('home'); });
    w.appendChild(again);
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
    list.unshift({ code: m.code, count: m.count, source: m.source, expiresAt: m.expiresAt, myScore: null });
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
    // deep link: ?arena=CODE
    var qs = new URLSearchParams(location.search);
    var code = qs.get('arena');
    if (code) {
      var m = A.decode(code);
      if (m) { S.match = m; S.screen = 'briefing'; rememberMatch(m); }
    }
    if (host() && host().offsetParent !== null) render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* =========================================================
     OPTIONAL: live leaderboards via Supabase
     ---------------------------------------------------------
     1. Create a free project at supabase.com
     2. Run this SQL:
          create table arena_scores (
            id bigserial primary key,
            code text not null,
            pid text not null,
            name text not null,
            score int not null,
            seconds int not null,
            total int not null,
            at bigint not null,
            unique (code, pid)
          );
          alter table arena_scores enable row level security;
          create policy "read"   on arena_scores for select using (true);
          create policy "insert" on arena_scores for insert with check (true);
     3. Paste your project URL and anon key below and call:
          VX.arena.useSync(VX.arena.supabaseAdapter(URL, ANON_KEY));
     ========================================================= */
  A.supabaseAdapter = function (url, anonKey) {
    var base = url.replace(/\/$/, '') + '/rest/v1/arena_scores';
    var headers = {
      'apikey': anonKey,
      'Authorization': 'Bearer ' + anonKey,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };
    return {
      name: 'supabase',
      live: true,
      submit: function (code, e) {
        return fetch(base, {
          method: 'POST', headers: headers,
          body: JSON.stringify({
            code: code, pid: e.pid, name: e.name,
            score: e.score, seconds: e.seconds, total: e.total, at: e.at
          })
        }).then(function (r) { return r.ok; });
      },
      fetch: function (code) {
        return fetch(base + '?code=eq.' + encodeURIComponent(code) +
          '&order=score.desc,seconds.asc&limit=' + MAX_PLAYERS, { headers: headers })
          .then(function (r) { return r.ok ? r.json() : []; })
          .catch(function () { return []; });
      }
    };
  };

})(window);
