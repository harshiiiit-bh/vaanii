/* ============================================================
   VOCAB BRIDGE
   ------------------------------------------------------------
   Words you save in Book Reading's vocab register also show up
   in the Vocabulary module, tagged so you can tell where they
   came from. Saved words survive a reload.

   One line is needed inside js/library.js — wherever the vocab
   register actually stores a word, add:

       window.dispatchEvent(new CustomEvent('vbv:vocab-added', {
         detail: { word: theWord, meaning: theMeaning, book: theBookTitle }
       }));

   Until that line exists this file still works: it sweeps the
   register's saved data on load and picks up anything new.
   ============================================================ */
(function (global) {
  'use strict';

  var VX = global.VX = global.VX || {};
  var STORE = 'vx_vocab_from_books';
  var V = VX.vocab = {};

  function saved() {
    try { return JSON.parse(localStorage.getItem(STORE) || '[]'); }
    catch (e) { return []; }
  }
  function persist(list) {
    try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) {}
  }
  function slug(w) {
    return 'book-' + String(w).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /** Shape a register entry into the record the Vocabulary module expects. */
  function toVocabRecord(e) {
    return {
      id: slug(e.word),
      w: String(e.word).replace(/\b\w/, function (c) { return c.toUpperCase(); }),
      pos: e.pos || '—',
      cat: ['from-books'],
      diff: e.diff || 2,
      imp: 3,
      meanEn: e.meaning || 'Saved from your reading. Add a meaning in the register.',
      meanHi: e.meaningHi || '',
      easy: e.book ? 'You saved this while reading ' + e.book + '.' : 'Saved from your reading.',
      syn: e.syn || [], ant: e.ant || [], similar: [], confused: [], family: [],
      colloc: [], exEasy: e.example || '', _fromBook: true, _book: e.book || null
    };
  }

  /** Add a word. Safe to call twice with the same word. */
  V.add = function (entry) {
    if (!entry || !entry.word) return false;
    var list = saved();
    var id = slug(entry.word);
    if (list.some(function (e) { return slug(e.word) === id; })) return false;
    list.push({
      word: entry.word, meaning: entry.meaning || '', book: entry.book || null,
      pos: entry.pos || '', example: entry.example || '', at: Date.now()
    });
    persist(list);
    inject(toVocabRecord(entry));
    return true;
  };

  // VOCAB is `const`-declared in vocab.js, so it is not a window property —
  // read it as a bare identifier instead (see the note in vaani-testkit.js).
  function sharedVocab() {
    try { return (typeof VOCAB !== 'undefined' && Array.isArray(VOCAB)) ? VOCAB : null; }
    catch (e) { return null; }
  }
  function inject(rec) {
    var vocab = sharedVocab();
    if (!vocab) return;
    if (vocab.some(function (v) { return v.id === rec.id; })) return;
    vocab.push(rec);
    if (typeof global.renderVocabGrid === 'function') {
      try { global.renderVocabGrid(); } catch (e) {}
    }
  }

  /** Pull everything already in the register into the vocabulary bank. */
  V.sync = function () {
    saved().forEach(function (e) { inject(toVocabRecord(e)); });
    return saved().length;
  };

  /** Bulk import from the register's own storage, whatever shape it uses. */
  V.importFrom = function (rows, map) {
    if (!Array.isArray(rows)) return 0;
    var added = 0;
    rows.forEach(function (row) {
      var e = map ? map(row) : row;
      if (e && e.word && V.add(e)) added++;
    });
    return added;
  };

  /* Sweep any register data already sitting in storage. Keys are matched
     loosely because the register names them itself. */
  function sweepStorage() {
    var rows = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || !/vocab/i.test(k) || k === STORE) continue;
      try {
        var parsed = JSON.parse(localStorage.getItem(k));
        if (Array.isArray(parsed)) rows = rows.concat(parsed);
      } catch (e) {}
    }
    return V.importFrom(rows, function (r) {
      if (!r || typeof r !== 'object') return null;
      var word = r.word || r.w || r.term || r.text;
      if (!word || typeof word !== 'string') return null;
      return {
        word: word,
        meaning: r.meaning || r.meanEn || r.definition || r.def || '',
        book: r.book || r.source || r.title || null,
        example: r.example || r.sentence || ''
      };
    });
  }

  global.addEventListener('vbv:vocab-added', function (ev) {
    var d = ev.detail || {};
    if (V.add(d)) VX.say && VX.say('"' + d.word + '" added to your vocabulary.');
  });

  function boot() {
    V.sync();
    var found = sweepStorage();
    if (found) console.log('[VAANI] Brought ' + found + ' word(s) across from your reading register.');

    /* let the Vocabulary filters show the new group */
    var bar = document.querySelector('[data-vocab-cat], .vocab-filters, #vocabFilters');
    if (bar && !bar.querySelector('[data-vocab-cat="from-books"]') && saved().length) {
      var b = document.createElement('button');
      b.setAttribute('data-vocab-cat', 'from-books');
      b.textContent = 'From my reading';
      b.className = bar.firstElementChild ? bar.firstElementChild.className : '';
      bar.appendChild(b);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
