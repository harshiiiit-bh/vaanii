/* ============================================================
   VAANI · 90-DAY VOCABULARY TRACK
   Dedicated subpage controller. Progress is browser-local and
   intentionally separate from XP, exams, and the main word bank.
   ============================================================ */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'vaani_vocab90_progress_v1';
  var SOURCE_URL = 'https://www.scribd.com/document/883515539/My-Pathshala-Vocabulary-90-Days-Target-by-SSC-Aspirant';

  // Start pages taken from the uploaded 324-page source PDF. The
  // source prints Day 88 before Day 87; these entries follow the
  // printed day labels rather than silently renumbering them.
  var PAGE_STARTS = [
    1,5,10,14,17,20,23,26,29,32,35,38,41,44,47,50,54,59,63,67,
    72,77,82,86,90,95,99,103,107,111,115,120,124,128,132,136,
    140,144,148,153,157,162,166,170,174,178,182,186,190,194,198,
    202,206,210,214,217,221,225,229,232,235,238,241,244,247,250,
    253,256,259,262,265,268,271,274,277,280,283,286,289,292,295,
    298,301,304,307,310,316,313,319,322
  ];

  function readProgress() {
    try {
      var value = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(value)) return [];
      return value.filter(function (day) {
        return Number.isInteger(day) && day >= 1 && day <= 90;
      }).filter(function (day, index, list) {
        return list.indexOf(day) === index;
      });
    } catch (error) {
      return [];
    }
  }

  var completed = readProgress();
  var selectedDay = 1;
  var activePhase = 0;

  function saveProgress() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    } catch (error) {
      // The page remains usable in private/restricted storage modes.
    }
  }

  function pageRange(day) {
    var start = PAGE_STARTS[day - 1];
    var next = PAGE_STARTS.filter(function (page) { return page > start; })
      .sort(function (a, b) { return a - b; })[0];
    return { start: start, end: next ? next - 1 : 324 };
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function updateProgress() {
    var count = completed.length;
    var percent = Math.round(count / 90 * 100);
    setText('v90ProgressCount', count + ' / 90');
    setText('v90ProgressPercent', percent + '% complete');
    setText('v90Remaining', (90 - count) + (90 - count === 1 ? ' day left' : ' days left'));
    var bar = document.getElementById('v90ProgressBar');
    var fill = document.getElementById('v90ProgressFill');
    if (bar) bar.setAttribute('aria-valuenow', String(count));
    if (fill) fill.style.width = percent + '%';
  }

  function renderDayGrid() {
    var grid = document.getElementById('v90DayGrid');
    if (!grid) return;
    var search = (document.getElementById('v90DaySearch') || {}).value || '';
    search = search.trim();
    var start = activePhase * 30 + 1;
    var end = Math.min(start + 29, 90);
    var days = [];
    for (var day = 1; day <= 90; day++) {
      var inPhase = day >= start && day <= end;
      var matches = !search || String(day).indexOf(search) !== -1;
      if ((search ? matches : inPhase)) days.push(day);
    }
    grid.replaceChildren();
    if (!days.length) {
      var empty = document.createElement('p');
      empty.className = 'v90-empty';
      empty.textContent = 'No matching day. Try a number from 1 to 90.';
      grid.appendChild(empty);
      return;
    }
    days.forEach(function (day) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'v90-day' +
        (day === selectedDay ? ' is-selected' : '') +
        (completed.indexOf(day) !== -1 ? ' is-done' : '');
      button.setAttribute('data-v90-day', String(day));
      button.setAttribute('aria-pressed', day === selectedDay ? 'true' : 'false');
      button.setAttribute('aria-label', 'Day ' + String(day).padStart(2, '0') +
        (completed.indexOf(day) !== -1 ? ', completed' : '') +
        (day === selectedDay ? ', selected' : ''));
      var number = document.createElement('span');
      number.className = 'v90-day-num';
      number.textContent = String(day).padStart(2, '0');
      button.appendChild(number);
      if (completed.indexOf(day) !== -1) {
        var check = document.createElement('span');
        check.className = 'v90-day-check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '✓';
        button.appendChild(check);
      }
      grid.appendChild(button);
    });
  }

  function syncPhaseButtons() {
    document.querySelectorAll('[data-v90-phase]').forEach(function (button) {
      var active = Number(button.getAttribute('data-v90-phase')) === activePhase;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function updateSelectedDay() {
    var day = selectedDay;
    var range = pageRange(day);
    var isDone = completed.indexOf(day) !== -1;
    setText('v90SelectedKicker', 'DAY ' + String(day).padStart(2, '0') + (day === 1 ? ' · START HERE' : ' · STUDY SESSION'));
    setText('v90SelectedTitle', 'Day ' + String(day).padStart(2, '0'));
    setText('v90SelectedMeta', 'Source PDF · page ' + range.start + (range.end > range.start ? '–' + range.end : ''));
    setText('v90SelectedStatus', isDone ? 'COMPLETED' : 'NOT COMPLETED');
    var status = document.getElementById('v90SelectedStatus');
    if (status) status.classList.toggle('is-done', isDone);
    var mark = document.getElementById('v90MarkDone');
    if (mark) {
      mark.textContent = isDone ? 'Mark as not complete' : 'Mark day complete';
      mark.setAttribute('aria-pressed', isDone ? 'true' : 'false');
    }
    var prev = document.getElementById('v90PrevDay');
    var next = document.getElementById('v90NextDay');
    if (prev) prev.disabled = day <= 1;
    if (next) next.disabled = day >= 90;
    var href = SOURCE_URL + '?start_page=' + range.start;
    var source = document.getElementById('v90OpenSource');
    if (source) source.href = href;
    var frame = document.getElementById('v90ReaderFrame');
    var view = document.getElementById('view-vocab90');
    var frameUrl = 'https://www.scribd.com/embeds/883515539/content?start_page=' + range.start + '&view_mode=scroll';
    // Defer the third-party reader until the dedicated page is actually opened.
    if (frame && view && view.classList.contains('active') && frame.getAttribute('src') !== frameUrl) {
      frame.setAttribute('src', frameUrl);
    }
  }

  function selectDay(day) {
    day = Number(day);
    if (!Number.isInteger(day) || day < 1 || day > 90) return;
    selectedDay = day;
    activePhase = Math.floor((day - 1) / 30);
    syncPhaseButtons();
    renderDayGrid();
    updateSelectedDay();
  }

  function bind() {
    if (!document.getElementById('view-vocab90')) return;
    // Resume at the first unfinished day; if all are done, show Day 90.
    selectedDay = 90;
    for (var d = 1; d <= 90; d++) {
      if (completed.indexOf(d) === -1) { selectedDay = d; break; }
    }
    activePhase = Math.floor((selectedDay - 1) / 30);
    syncPhaseButtons();
    renderDayGrid();
    var view = document.getElementById('view-vocab90');
    if (view && global.MutationObserver) {
      var viewObserver = new global.MutationObserver(function () {
        if (view.classList.contains('active')) updateSelectedDay();
      });
      viewObserver.observe(view, { attributes: true, attributeFilter: ['class'] });
    }
    updateSelectedDay();
    updateProgress();

    var grid = document.getElementById('v90DayGrid');
    if (grid) grid.addEventListener('click', function (event) {
      var button = event.target.closest('[data-v90-day]');
      if (button) selectDay(button.getAttribute('data-v90-day'));
    });

    document.querySelectorAll('[data-v90-phase]').forEach(function (button) {
      button.addEventListener('click', function () {
        activePhase = Number(button.getAttribute('data-v90-phase'));
        var search = document.getElementById('v90DaySearch');
        if (search) search.value = '';
        syncPhaseButtons();
        renderDayGrid();
      });
    });

    var search = document.getElementById('v90DaySearch');
    if (search) search.addEventListener('input', renderDayGrid);

    var mark = document.getElementById('v90MarkDone');
    if (mark) mark.addEventListener('click', function () {
      var index = completed.indexOf(selectedDay);
      if (index === -1) completed.push(selectedDay);
      else completed.splice(index, 1);
      completed.sort(function (a, b) { return a - b; });
      saveProgress();
      updateProgress();
      updateSelectedDay();
      renderDayGrid();
    });

    var prev = document.getElementById('v90PrevDay');
    var next = document.getElementById('v90NextDay');
    if (prev) prev.addEventListener('click', function () { selectDay(selectedDay - 1); });
    if (next) next.addEventListener('click', function () { selectDay(selectedDay + 1); });

    var reset = document.getElementById('v90ResetProgress');
    if (reset) reset.addEventListener('click', function () {
      if (!completed.length) return;
      if (!global.confirm('Clear all 90-day progress saved in this browser?')) return;
      completed = [];
      saveProgress();
      selectDay(1);
      updateProgress();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})(window);
