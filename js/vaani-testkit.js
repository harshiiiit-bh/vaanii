/* ============================================================
   VAANI-X TEST KIT
   ------------------------------------------------------------
   Adds to every PYQ mode:
     · a pre-test setup screen (how many questions / how long /
       which exam the questions come from)
     · a floating timer that survives your pvRender() re-draws
     · the final-10-seconds escalation (digits grow + fade to
       dark red) and automatic submit when the clock hits zero
     · practice mode's two clock styles: count down, or count up
       and just record how long you took

   Load AFTER the main app script. It patches the existing
   pv* functions in place — your index.html keeps working if
   this file is removed.
   ============================================================ */
(function (global) {
  'use strict';

  var VX = global.VX = global.VX || {};

  /* ---------------------------------------------------------
     Small helpers
     --------------------------------------------------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function fmtClock(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  }
  VX.fmtClock = fmtClock;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function mixHex(from, to, t) {
    var f = [parseInt(from.substr(1, 2), 16), parseInt(from.substr(3, 2), 16), parseInt(from.substr(5, 2), 16)];
    var g = [parseInt(to.substr(1, 2), 16), parseInt(to.substr(3, 2), 16), parseInt(to.substr(5, 2), 16)];
    return 'rgb(' + Math.round(lerp(f[0], g[0], t)) + ',' +
                    Math.round(lerp(f[1], g[1], t)) + ',' +
                    Math.round(lerp(f[2], g[2], t)) + ')';
  }

  function say(msg) {
    if (typeof global.toast === 'function') global.toast(msg);
    else console.log('[VAANI]', msg);
  }
  VX.say = say;

  /* =========================================================
     1. QUESTION POOL BY EXAM SOURCE
     Your questions already carry q._exam === 'NDA' | 'CDS'.
     ========================================================= */
  // PYQ_ALL is declared with `const` in app.js. Unlike `var`, a top-level
  // const/let never becomes a window property — but it DOES live in the one
  // lexical scope every classic <script> tag on the page shares, so a bare
  // reference to it (guarded by typeof, which never throws on an unknown
  // identifier) sees it correctly from here, in every browser.
  function allQuestions() {
    try { return (typeof PYQ_ALL !== 'undefined' && Array.isArray(PYQ_ALL)) ? PYQ_ALL : []; }
    catch (e) { return []; }
  }
  function sharedById() {
    try { return (typeof PYQ_BY_ID !== 'undefined') ? PYQ_BY_ID : {}; }
    catch (e) { return {}; }
  }
  // PV (the PYQ session engine's own state singleton) is also `const`-declared
  // in app.js, so it is invisible on window too — same bare-identifier read.
  function sharedPV() {
    try { return (typeof PV !== 'undefined') ? PV : null; }
    catch (e) { return null; }
  }

  VX.poolFor = function (source, baseList) {
    var list = baseList || allQuestions();
    if (source === 'BOTH' || source === 'ALL' || !source) return list.slice();
    var selected = String(source).split('+').map(function (code) { return code.trim(); }).filter(Boolean);
    if (!selected.length) return list.slice();
    return list.filter(function (q) { return selected.indexOf(q._exam) !== -1; });
  };

  /** Which exam sources actually have questions loaded right now. */
  VX.availableSources = function (baseList) {
    var list = baseList || allQuestions();
    var counts = {}, order = [];
    list.forEach(function (q) {
      var code = q._exam;
      if (!code) return;
      if (!counts[code]) { counts[code] = 0; order.push(code); }
      counts[code]++;
    });
    return order.map(function (code) { return { code: code, count: counts[code] }; });
  };

  /** Stable, exam-aware options for one bank or a combined bank. */
  VX.sourceChoices = function (baseList) {
    var list = baseList || allQuestions();
    var sources = VX.availableSources(list);
    var present = sources.map(function (source) { return source.code; });
    var examOrder = ['NDA', 'CDS', 'AFCAT'];
    var ordered = examOrder.filter(function (code) { return present.indexOf(code) !== -1; })
      .concat(present.filter(function (code) { return examOrder.indexOf(code) === -1; }));
    var choices = ordered.map(function (code) {
      var source = sources.filter(function (item) { return item.code === code; })[0];
      return { code: code, label: code, detail: 'Single exam bank', count: source ? source.count : 0, kind: 'single' };
    });
    var pairs = [
      { codes: ['NDA', 'CDS'], code: 'NDA+CDS', label: 'NDA + CDS' },
      { codes: ['CDS', 'AFCAT'], code: 'CDS+AFCAT', label: 'CDS + AFCAT' },
      { codes: ['NDA', 'AFCAT'], code: 'NDA+AFCAT', label: 'NDA + AFCAT' }
    ];
    pairs.forEach(function (pair) {
      if (!pair.codes.every(function (code) { return present.indexOf(code) !== -1; })) return;
      choices.push({
        code: pair.code, label: pair.label, detail: 'Two-exam combination',
        count: list.filter(function (q) { return pair.codes.indexOf(q._exam) !== -1; }).length,
        kind: 'combined'
      });
    });
    var hasAllThree = examOrder.every(function (code) { return present.indexOf(code) !== -1; });
    if (hasAllThree) {
      choices.push({ code: 'ALL', label: 'All three', detail: 'NDA + CDS + AFCAT', count: list.length, kind: 'all' });
    } else if (ordered.length > 1) {
      var coversAll = choices.some(function (choice) {
        var codes = choice.code === 'ALL' || choice.code === 'BOTH' ? ordered : String(choice.code).split('+');
        return codes.length === ordered.length && ordered.every(function (code) { return codes.indexOf(code) !== -1; });
      });
      if (!coversAll) choices.push({ code: 'BOTH', label: 'All available', detail: ordered.join(' + '), count: list.length, kind: 'all' });
    }
    return choices;
  };

  /* =========================================================
     2. SETUP SCREEN
     VX.setup(opts) -> Promise<config | null>
     config = { count, source, timing:'countdown'|'open', seconds }
     ========================================================= */
  var COUNT_PRESETS = [10, 20, 30, 50, 100];
  var MINUTE_PRESETS = [5, 10, 15, 30, 45, 60];

  VX.setup = function (opts) {
    opts = opts || {};
    var sources = VX.availableSources(opts.baseList);
    var sourceChoices = VX.sourceChoices(opts.baseList);
    var showSource = opts.source !== false && sources.length > 0;
    var sourceCodes = sources.map(function (source) { return source.code; });
    var allKnownExams = ['NDA', 'CDS', 'AFCAT'].every(function (code) { return sourceCodes.indexOf(code) !== -1; });
    var defaultSource = opts.defaultSource || (allKnownExams ? 'ALL' : (sources.length > 1
      ? (sourceCodes.length === 2 && sourceCodes.every(function (code) { return ['NDA', 'CDS', 'AFCAT'].indexOf(code) !== -1; })
        ? ['NDA', 'CDS', 'AFCAT'].filter(function (code) { return sourceCodes.indexOf(code) !== -1; }).join('+')
        : 'BOTH')
      : (sources[0] ? sources[0].code : 'NDA')));
    if (defaultSource === 'BOTH' && allKnownExams) defaultSource = 'ALL';
    if (!sourceChoices.some(function (choice) { return choice.code === defaultSource; })) {
      defaultSource = sourceChoices.length ? sourceChoices[sourceChoices.length - 1].code : 'NDA';
    }

    var cfg = {
      count: opts.defaultCount || 20,
      source: defaultSource,
      timing: opts.defaultTiming || (opts.timing === 'countdown' ? 'countdown' : 'open'),
      minutes: opts.defaultMinutes || 15
    };
    // A mode like Rapid Fire is always timed — don't offer "no limit".
    var lockTiming = opts.timing === 'countdown' || opts.timing === 'open';
    if (lockTiming) cfg.timing = opts.timing;

    return new Promise(function (resolve) {
      var previousFocus = document.activeElement;
      var previousOverflow = document.body.style.overflow;
      var scrim = el('div', 'vx-scrim vx-setup-scrim');
      scrim.setAttribute('role', 'dialog');
      scrim.setAttribute('aria-modal', 'true');
      scrim.setAttribute('aria-label', opts.title || 'Set up your test');

      var sheet = el('div', 'vx-sheet vx-setup-sheet');
      scrim.appendChild(sheet);

      function poolSize() {
        var base = VX.poolFor(cfg.source, opts.baseList);
        return base.length;
      }

      function segRow(values, current, fmt, onPick, disabledFn) {
        var row = el('div', 'vx-seg');
        values.forEach(function (v) {
          var b = el('button', null, fmt(v));
          b.type = 'button';
          b.setAttribute('aria-pressed', String(v === current));
          if (disabledFn && disabledFn(v)) b.disabled = true;
          b.addEventListener('click', function () { onPick(v); });
          row.appendChild(b);
        });
        return row;
      }

      function textNode(tag, cls, value) {
        var node = el(tag, cls);
        node.textContent = value == null ? '' : String(value);
        return node;
      }

      function displayCount(value) {
        return Number(value || 0).toLocaleString('en-IN');
      }

      function sourceCard(choice) {
        var selected = cfg.source === choice.code;
        var card = el('button', 'vx-source-card' + (selected ? ' is-selected' : ''));
        card.type = 'button';
        card.dataset.source = choice.code;
        card.dataset.count = String(choice.count);
        card.setAttribute('aria-pressed', String(selected));
        card.setAttribute('aria-label', choice.label + ', ' + displayCount(choice.count) + ' questions');
        var top = el('span', 'vx-source-card-top');
        top.appendChild(textNode('span', 'vx-source-tag', choice.kind === 'single' ? 'SINGLE BANK' : (choice.kind === 'all' ? 'COMPLETE MIX' : 'COMBINED')));
        top.appendChild(textNode('span', 'vx-source-check', selected ? '✓' : ''));
        card.appendChild(top);
        card.appendChild(textNode('strong', 'vx-source-name', choice.label));
        card.appendChild(textNode('span', 'vx-source-detail', choice.detail));
        card.appendChild(textNode('span', 'vx-source-count', displayCount(choice.count) + ' questions'));
        card.addEventListener('click', function () { cfg.source = choice.code; draw(); });
        return card;
      }

      function sourceGroup(title, groupChoices) {
        if (!groupChoices.length) return null;
        var group = el('div', 'vx-source-group');
        group.appendChild(textNode('div', 'vx-source-group-title', title));
        var grid = el('div', 'vx-source-grid');
        groupChoices.forEach(function (choice) { grid.appendChild(sourceCard(choice)); });
        group.appendChild(grid);
        return group;
      }

      function draw() {
        var max = poolSize();
        if (cfg.count > max) cfg.count = max;
        sheet.innerHTML = '';

        var heading = el('div', 'vx-setup-heading');
        var headingCopy = el('div', 'vx-setup-heading-copy');
        headingCopy.appendChild(textNode('div', 'vx-setup-eyebrow', 'VAANI  /  MISSION CONFIGURATION'));
        var title = textNode('h3', null, opts.title || 'Set up your test');
        title.id = 'vxSetupTitle';
        headingCopy.appendChild(title);
        var subtitle = textNode('p', 'vx-sub', opts.subtitle || 'Choose your question mix, set the size of the mission, and select the clock.');
        subtitle.id = 'vxSetupSubtitle';
        headingCopy.appendChild(subtitle);
        heading.appendChild(headingCopy);
        var closeButton = textNode('button', 'vx-setup-close', '×');
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Close test setup');
        closeButton.title = 'Close setup';
        closeButton.addEventListener('click', close);
        heading.appendChild(closeButton);
        scrim.setAttribute('aria-labelledby', 'vxSetupTitle');
        scrim.setAttribute('aria-describedby', 'vxSetupSubtitle');
        sheet.appendChild(heading);

        var selectedChoice = sourceChoices.filter(function (choice) { return choice.code === cfg.source; })[0];
        var read = el('div', 'vx-readout vx-setup-readout');
        var questionMetric = el('div', 'vx-readout-metric');
        questionMetric.appendChild(textNode('span', 'vx-readout-label', 'QUESTION SET'));
        questionMetric.appendChild(textNode('strong', 'vx-readout-value', cfg.count + (cfg.count === 1 ? ' question' : ' questions')));
        questionMetric.appendChild(textNode('small', 'vx-readout-detail', displayCount(max) + ' available · ' + (selectedChoice ? selectedChoice.label : 'Selected bank')));
        var clockMetric = el('div', 'vx-readout-metric');
        clockMetric.appendChild(textNode('span', 'vx-readout-label', 'CLOCK'));
        clockMetric.appendChild(textNode('strong', 'vx-readout-value', cfg.timing === 'countdown' ? cfg.minutes + ' min limit' : 'Track my time'));
        clockMetric.appendChild(textNode('small', 'vx-readout-detail', cfg.timing === 'countdown' ? 'Auto-submit at zero' : 'No limit · duration recorded'));
        read.appendChild(questionMetric);
        read.appendChild(clockMetric);
        sheet.appendChild(read);

        /* ---- exam source ---- */
        if (showSource) {
          var f0 = el('section', 'vx-field vx-source-field');
          f0.setAttribute('aria-label', 'Choose exam question banks');
          f0.appendChild(el('div', 'vx-field-title', '<strong>Question banks</strong><span class="vx-hint">Choose a single exam or combine banks into one mixed set.</span>'));
          var singles = sourceChoices.filter(function (choice) { return choice.kind === 'single'; });
          var combinations = sourceChoices.filter(function (choice) { return choice.kind !== 'single'; });
          if (singles.length) f0.appendChild(sourceGroup('SINGLE EXAM', singles));
          if (combinations.length) f0.appendChild(sourceGroup('COMBINED EXAMS', combinations));
          sheet.appendChild(f0);
        }

        /* ---- how many questions ---- */
        var f1 = el('section', 'vx-field vx-setup-count');
        f1.appendChild(el('label', null,
          'Question count<span class="vx-hint">' + displayCount(max) + ' available for the selected bank.</span>'));
        var presets = COUNT_PRESETS.filter(function (v) { return v <= max; });
        if (max > 0 && presets.indexOf(max) === -1 && max < 100) presets.push(max);
        f1.appendChild(segRow(presets, cfg.count, function (v) { return v; },
          function (v) { cfg.count = v; draw(); }));
        var custom = el('input', 'vx-num');
        custom.type = 'number'; custom.min = 1; custom.max = max; custom.value = cfg.count;
        custom.setAttribute('aria-label', 'Custom number of questions');
        custom.setAttribute('inputmode', 'numeric');
        custom.style.marginTop = '8px';
        custom.addEventListener('change', function () {
          var v = Math.max(1, Math.min(max, parseInt(custom.value, 10) || 1));
          cfg.count = v; draw();
        });
        f1.appendChild(custom);
        sheet.appendChild(f1);

        /* ---- timing ---- */
        var f2 = el('section', 'vx-field vx-setup-clock');
        if (!lockTiming) {
          f2.appendChild(el('label', null,
            'Clock mode<span class="vx-hint">Count down for a challenge or track the time you take.</span>'));
          f2.appendChild(segRow(['countdown', 'open'], cfg.timing, function (v) {
            return v === 'countdown' ? 'Time limit' : 'Track my time';
          }, function (v) { cfg.timing = v; draw(); }));
        }
        if (cfg.timing === 'countdown') {
          var lbl = el('label', null,
            'Time limit<span class="vx-hint">The test submits automatically when time runs out.</span>');
          lbl.style.marginTop = lockTiming ? '0' : '16px';
          f2.appendChild(lbl);
          f2.appendChild(segRow(MINUTE_PRESETS, cfg.minutes, function (v) { return v + ' min'; },
            function (v) { cfg.minutes = v; draw(); }));
          var cm = el('input', 'vx-num');
          cm.type = 'number'; cm.min = 1; cm.max = 300; cm.value = cfg.minutes;
          cm.setAttribute('aria-label', 'Custom minutes');
          cm.setAttribute('inputmode', 'numeric');
          cm.style.marginTop = '8px';
          cm.addEventListener('change', function () {
            cfg.minutes = Math.max(1, Math.min(300, parseInt(cm.value, 10) || 1)); draw();
          });
          f2.appendChild(cm);
        }
        sheet.appendChild(f2);

        /* ---- actions ---- */
        var actions = el('div', 'vx-actions vx-setup-actions');
        var cancel = textNode('button', 'vx-btn ghost', 'Cancel');
        cancel.type = 'button';
        cancel.addEventListener('click', close);
        var go = textNode('button', 'vx-btn primary', opts.confirmLabel || 'Start test');
        go.type = 'button';
        if (max < 1) { go.disabled = true; go.textContent = 'No questions in this bank'; }
        go.addEventListener('click', function () {
          done({
            count: cfg.count,
            source: cfg.source,
            timing: cfg.timing,
            seconds: cfg.timing === 'countdown' ? cfg.minutes * 60 : null
          });
        });
        actions.appendChild(cancel);
        actions.appendChild(go);
        sheet.appendChild(actions);
      }
      var settled = false;
      function teardown() {
        document.removeEventListener('keydown', onKey);
        if (document.body) document.body.style.overflow = previousOverflow;
        scrim.remove();
        if (previousFocus && typeof previousFocus.focus === 'function' && document.contains(previousFocus)) {
          previousFocus.focus();
        }
      }
      function close() { if (settled) return; settled = true; teardown(); resolve(null); }
      function done(v) { if (settled) return; settled = true; teardown(); resolve(v); }
      function onKey(e) {
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return;
        var focusable = Array.prototype.slice.call(sheet.querySelectorAll('button:not([disabled]),input:not([disabled])'))
          .filter(function (node) { return node.offsetParent !== null; });
        if (!focusable.length) { e.preventDefault(); return; }
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }

      scrim.addEventListener('mousedown', function (e) { if (e.target === scrim) close(); });
      document.addEventListener('keydown', onKey);

      draw();
      document.body.appendChild(scrim);
      document.body.style.overflow = 'hidden';
      var first = sheet.querySelector('.vx-source-card[aria-pressed="true"], .vx-seg button[aria-pressed="true"], .vx-btn');
      if (first) first.focus();
    });
  };

  /* =========================================================
     3. FLOATING TIMER
     Lives outside your view markup, so pvRender() redrawing
     the screen never kills the clock.
     ========================================================= */
  var Timer = {
    id: null, hud: null,
    mode: 'off',      // 'countdown' | 'elapsed' | 'off'
    remaining: 0,
    elapsed: 0,
    onEnd: null,
    warned: false
  };
  VX.timer = Timer;

  function ensureHud() {
    if (Timer.hud && document.body.contains(Timer.hud)) return Timer.hud;
    var hud = el('div', 'vx-hud');
    hud.innerHTML =
      '<div class="vx-clock" id="vxClock">' +
        '<span class="vx-clock-label" id="vxClockLabel">Time</span>' +
        '<span class="vx-clock-time" id="vxClockTime" role="timer" aria-live="off">00:00</span>' +
      '</div>' +
      '<div class="vx-elapsed" id="vxElapsed" hidden></div>';
    document.body.appendChild(hud);
    Timer.hud = hud;
    return hud;
  }

  Timer.start = function (o) {
    Timer.stop();
    o = o || {};
    Timer.mode = o.mode === 'countdown' ? 'countdown' : 'elapsed';
    Timer.remaining = o.seconds || 0;
    Timer.elapsed = 0;
    Timer.onEnd = o.onEnd || null;
    Timer.warned = false;
    ensureHud();
    paint();
    Timer.id = setInterval(function () {
      Timer.elapsed++;
      if (Timer.mode === 'countdown') {
        Timer.remaining--;
        if (Timer.remaining <= 0) {
          Timer.remaining = 0;
          paint();
          var cb = Timer.onEnd;
          Timer.stop();
          if (cb) cb();
          return;
        }
      }
      paint();
    }, 1000);
  };

  Timer.stop = function () {
    if (Timer.id) { clearInterval(Timer.id); Timer.id = null; }
    Timer.mode = 'off';
    if (Timer.hud) { Timer.hud.remove(); Timer.hud = null; }
  };

  Timer.takenSeconds = function () { return Timer.elapsed; };

  function paint() {
    var clock = document.getElementById('vxClock');
    var time = document.getElementById('vxClockTime');
    var label = document.getElementById('vxClockLabel');
    var extra = document.getElementById('vxElapsed');
    if (!clock || !time) return;

    if (Timer.mode === 'countdown') {
      label.textContent = 'Left';
      time.textContent = fmtClock(Timer.remaining);

      // --- final ten seconds: grow + fade white -> dark red ---
      var r = Timer.remaining;
      if (r <= 10) {
        // heat: 0 at ten seconds left, 1 at one second left
        var heat = Math.min(1, Math.max(0, (10 - r) / 9));
        clock.classList.add('is-hot');
        clock.style.setProperty('--vx-heat', heat.toFixed(3));
        clock.style.background = mixHex('#12202e', '#2a0508', heat);
        clock.style.borderColor = mixHex('#12202e', '#8b0000', heat);
        time.style.color = mixHex('#ffffff', '#8b0000', heat);
        // a glow that grows as the colour darkens, so the digits stay readable
        time.style.textShadow = '0 0 ' + (6 + heat * 22).toFixed(0) + 'px rgba(255,'
          + Math.round(70 - heat * 60) + ',' + Math.round(70 - heat * 60) + ','
          + (0.25 + heat * 0.75).toFixed(2) + ')';
        if (r <= 5) clock.classList.add('is-critical');
        if (!Timer.warned) {
          Timer.warned = true;
          time.setAttribute('aria-live', 'assertive');
          say('Ten seconds left.');
        }
      } else {
        clock.classList.remove('is-hot', 'is-critical');
        clock.style.background = '';
        clock.style.borderColor = '';
        time.style.color = '';
        time.style.textShadow = '';
      }

      if (extra) {
        extra.hidden = false;
        extra.textContent = 'Taken ' + fmtClock(Timer.elapsed);
      }
    } else {
      label.textContent = 'Taken';
      time.textContent = fmtClock(Timer.elapsed);
      if (extra) extra.hidden = true;
    }
  }

  /* =========================================================
     4. PATCH THE PYQ SESSION ENGINE
     ========================================================= */
  function shuffle(arr, rnd) {
    var a = arr.slice(), i, j, t;
    rnd = rnd || Math.random;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  VX.shuffle = shuffle;

  /** Turn a setup config into the question list for a session. */
  VX.buildPool = function (cfg, baseList) {
    var pool = VX.poolFor(cfg.source, baseList);
    return shuffle(pool).slice(0, cfg.count);
  };

  var MODE_SETUP = {
    practice:  { title: 'Practice mode',  subtitle: 'Work at your own pace. Answers are revealed as you go.', timing: null },
    quiz:      { title: 'Quiz mode',      subtitle: 'A mixed set drawn at random from the question bank.',    timing: null },
    rapidfire: { title: 'Rapid fire',     subtitle: 'Fast questions against the clock. The set submits itself when time runs out.', timing: 'countdown', defaultMinutes: 10, defaultCount: 30 },
    revision:  { title: 'Revision',       subtitle: 'Questions you have already attempted, brought back round.', timing: null },
    bookmarks: { title: 'Bookmarks',      subtitle: 'Only the questions you starred.',                        timing: null },
    mistakes:  { title: 'Mistakes only',  subtitle: 'Only the questions you got wrong.',                      timing: null },
    bookpractice: { title: 'Book-based Grammar', subtitle: 'Original supplementary MCQs based on Wren & Martin topics. These are not official PYQs.', timing: null, defaultCount: 20, source: false }
  };

  function startConfigured(mode, cfg, baseList, extraOpts) {
    var questions = VX.buildPool(cfg, baseList);
    if (!questions.length) { say('No questions matched that setup. Try a different bank.'); return; }
    var opts = Object.assign({
      title: (MODE_SETUP[mode] && MODE_SETUP[mode].title) || mode,
      timeLimitSec: cfg.seconds || null
    }, extraOpts || {});
    opts.vxTiming = cfg.timing;
    global.pvStartSession(mode, questions, opts);
  }

  function patch() {
    if (typeof global.pvStartSession !== 'function') return false;

    /* ---- every mode now opens the setup screen first ---- */
    if (typeof global.pvLaunchMode === 'function' && !global.pvLaunchMode.__vx) {
      var origLaunch = global.pvLaunchMode;
      global.pvLaunchMode = function (mode) {
        // exam mode keeps its own paper picker
        if (mode === 'exam') return origLaunch.call(this, mode);

        var meta = MODE_SETUP[mode];
        if (!meta) return origLaunch.call(this, mode);

        // restricted modes draw from a narrower list, not the whole bank
        var baseList = null;
        var st = typeof global.ensurePyqStats === 'function' ? global.ensurePyqStats() : null;
        var byId = sharedById();

        if (mode === 'revision' && st) {
          baseList = Object.keys(st.attempts).map(function (id) { return byId[id]; }).filter(Boolean);
          if (!baseList.length) { say('Solve a few questions first — revision replays what you have already attempted.'); return; }
        } else if (mode === 'mistakes' && st) {
          baseList = Object.keys(st.attempts).filter(function (id) { return st.attempts[id] === false; })
            .map(function (id) { return byId[id]; }).filter(Boolean);
          if (!baseList.length) { say('No mistakes logged yet. Nice work.'); return; }
        } else if (mode === 'bookpractice') {
          baseList = Array.isArray(global.VAANI_BOOK_PRACTICE) ? global.VAANI_BOOK_PRACTICE.slice() : [];
          if (!baseList.length) { say('Supplementary grammar questions are unavailable right now.'); return; }
        } else if (mode === 'bookmarks') {
          var bm = typeof global.getBookmarks === 'function' ? global.getBookmarks() : [];
          var bookById = global.VAANI_BOOK_PRACTICE_BY_ID || {};
          baseList = bm.filter(function (b) { return b.indexOf('pyq:') === 0; })
            .map(function (b) { return byId[b.slice(4)]; })
            .concat(bm.filter(function (b) { return b.indexOf('book:') === 0; })
              .map(function (b) { return bookById[b.slice(5)]; }))
            .filter(Boolean);
          if (!baseList.length) { say('No bookmarks yet. Star any question to save it here.'); return; }
        }

        VX.setup({
          title: meta.title,
          subtitle: meta.subtitle,
          baseList: baseList,
          source: meta.source === false ? false : undefined,
          timing: meta.timing,
          defaultCount: meta.defaultCount || Math.min(20, (baseList || allQuestions()).length),
          defaultMinutes: meta.defaultMinutes || 15,
          confirmLabel: 'Start ' + meta.title.toLowerCase()
        }).then(function (cfg) {
          if (!cfg) return;
          startConfigured(mode, cfg, baseList,
            mode === 'rapidfire' ? { deferReveal: false } : null);
        });
      };
      global.pvLaunchMode.__vx = true;
    }

    /* ---- topic-wise practice gets the same setup screen ---- */
    if (typeof global.pvLaunchTopic === 'function' && !global.pvLaunchTopic.__vx) {
      global.pvLaunchTopic = function (sec) {
        var baseList = allQuestions().filter(function (q) { return q.sec === sec; });
        if (!baseList.length) { say('No questions filed under ' + sec + ' yet.'); return; }
        VX.setup({
          title: sec,
          subtitle: 'Topic practice drawn only from ' + sec + ' questions.',
          baseList: baseList,
          defaultCount: Math.min(20, baseList.length),
          confirmLabel: 'Start practice'
        }).then(function (cfg) {
          if (!cfg) return;
          startConfigured('section', cfg, baseList, { title: sec });
        });
      };
      global.pvLaunchTopic.__vx = true;
    }

    /* ---- exam simulation: let the host set the clock ---- */
    if (typeof global.pvStartExam === 'function' && !global.pvStartExam.__vx) {
      global.pvStartExam = function (year, session, exam) {
        var PVs = sharedPV();
        if (exam && PVs) PVs.examType = exam;
        var examType = (PVs && PVs.examType) || exam || null;
        var qs = typeof global.pvPaperQuestions === 'function'
          ? global.pvPaperQuestions(year, session, examType) : [];
        if (!qs.length) { say('That paper is not available yet.'); return; }
        VX.setup({
          title: 'Exam simulation',
          subtitle: 'Full paper conditions: answers stay hidden until you submit, and wrong answers carry negative marking.',
          baseList: qs,
          source: false,
          timing: 'countdown',
          defaultCount: qs.length,
          defaultMinutes: Math.max(15, Math.round(qs.length * 1.2)),
          confirmLabel: 'Begin exam'
        }).then(function (cfg) {
          if (!cfg) return;
          var picked = shuffle(qs).slice(0, cfg.count)
            .sort(function (a, b) { return (a.n || 0) - (b.n || 0); });
          global.pvStartSession('exam', picked, {
            title: (examType || 'NDA') + ' ' + session + ' ' + year + ' · Exam simulation',
            negativeMarking: true, deferReveal: true,
            timeLimitSec: cfg.seconds, vxTiming: 'countdown'
          });
        });
      };
      global.pvStartExam.__vx = true;
    }

    /* ---- the clock itself ---- */
    if (typeof global.pvStartTimerIfNeeded === 'function' && !global.pvStartTimerIfNeeded.__vx) {
      global.pvStartTimerIfNeeded = function () {
        var s = sharedPV() && sharedPV().session;
        if (!s) return;
        if (s.timerId) { clearInterval(s.timerId); s.timerId = null; }

        if (s.timeLimitSec) {
          Timer.start({
            mode: 'countdown',
            seconds: s.remaining || s.timeLimitSec,
            onEnd: function () {
              var live = sharedPV() && sharedPV().session;
              if (live && !live.finished) {
                live.autoSubmitted = true;
                say('Time up — your test was submitted.');
                global.pvFinishSession();
              }
            }
          });
        } else {
          // no limit: count up so the summary can report the time taken
          Timer.start({ mode: 'elapsed' });
        }
      };
      global.pvStartTimerIfNeeded.__vx = true;
    }

    if (typeof global.pvStopTimer === 'function' && !global.pvStopTimer.__vx) {
      var origStop = global.pvStopTimer;
      global.pvStopTimer = function () {
        try { origStop.apply(this, arguments); } catch (e) { /* keep going */ }
        var s = sharedPV() && sharedPV().session;
        if (s && !s.finished) s.vxTaken = Timer.takenSeconds();
        Timer.stop();
      };
      global.pvStopTimer.__vx = true;
    }

    /* ---- record the time taken on the finished session ---- */
    if (typeof global.pvFinishSession === 'function' && !global.pvFinishSession.__vx) {
      var origFinish = global.pvFinishSession;
      global.pvFinishSession = function () {
        var s = sharedPV() && sharedPV().session;
        if (s) s.vxTaken = Timer.takenSeconds();
        Timer.stop();
        return origFinish.apply(this, arguments);
      };
      global.pvFinishSession.__vx = true;
    }

    /* ---- show "time taken" on the summary screen ---- */
    if (typeof global.pvRender === 'function' && !global.pvRender.__vx) {
      var origRender = global.pvRender;
      global.pvRender = function () {
        var out = origRender.apply(this, arguments);
        try { decorateSummary(); } catch (e) { /* never break the render */ }
        return out;
      };
      global.pvRender.__vx = true;
    }

    return true;
  }

  function decorateSummary() {
    var PV = sharedPV();
    if (!PV || PV.screen !== 'summary' || !PV.session) return;
    var host = document.getElementById('view-pyq');
    if (!host || host.querySelector('.vx-taken-chip')) return;
    var taken = PV.session.vxTaken;
    if (!taken && taken !== 0) return;
    var strip = el('div', 'vx-meta-strip vx-taken-chip');
    strip.innerHTML =
      '<span class="vx-chip">Time taken ' + fmtClock(taken) + '</span>' +
      (PV.session.questions && PV.session.questions.length
        ? '<span class="vx-chip">' + (taken / PV.session.questions.length).toFixed(1) + 's per question</span>'
        : '') +
      (PV.session.autoSubmitted ? '<span class="vx-chip warn">Submitted automatically at time up</span>' : '');
    var head = host.querySelector('.section-head, h2');
    if (head && head.parentNode) head.parentNode.insertBefore(strip, head.nextSibling);
    else host.insertBefore(strip, host.firstChild);
  }

  /* =========================================================
     5. BOOT
     ========================================================= */
  function boot() {
    if (!patch()) {
      // the main script may still be parsing — retry briefly
      var tries = 0;
      var iv = setInterval(function () {
        if (patch() || ++tries > 40) clearInterval(iv);
      }, 100);
    }
    // never leave a clock running on a dead session
    window.addEventListener('pagehide', function () { Timer.stop(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
