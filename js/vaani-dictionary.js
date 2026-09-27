/* VAANI optional dictionary enrichment. Curated VAANI content always stays primary. */
(function (global) {
  'use strict';
  var ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
  var MAX_RESPONSE_CHARS = 250000;
  var CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
  var memory = Object.create(null);
  var pending = Object.create(null);

  function clean(value, max) {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max || 500) : '';
  }
  function safeEntry(raw) {
    if (!Array.isArray(raw)) return null;
    var entry = raw.find(function (e) { return e && typeof e === 'object' && Array.isArray(e.meanings); });
    if (!entry) return null;
    var phonetics = Array.isArray(entry.phonetics) ? entry.phonetics.slice(0, 5).map(function (p) {
      return { text: clean(p && p.text, 80), audio: clean(p && p.audio, 500) };
    }).filter(function (p) { return p.text || p.audio; }) : [];
    var meanings = [];
    (entry.meanings || []).slice(0, 4).forEach(function (m) {
      if (!m || typeof m !== 'object') return;
      var defs = (Array.isArray(m.definitions) ? m.definitions : []).slice(0, 3).map(function (d) {
        return {
          definition: clean(d && d.definition, 700),
          example: clean(d && d.example, 500),
          synonyms: Array.isArray(d && d.synonyms) ? d.synonyms.slice(0, 8).map(function (s) { return clean(s, 80); }).filter(Boolean) : [],
          antonyms: Array.isArray(d && d.antonyms) ? d.antonyms.slice(0, 8).map(function (s) { return clean(s, 80); }).filter(Boolean) : []
        };
      }).filter(function (d) { return d.definition; });
      if (defs.length) meanings.push({ partOfSpeech: clean(m.partOfSpeech, 60), definitions: defs });
    });
    if (!meanings.length) return null;
    return {
      word: clean(entry.word, 100),
      phonetic: clean(entry.phonetic, 80) || (phonetics.find(function (p) { return p.text; }) || {}).text || '',
      phonetics: phonetics,
      meanings: meanings,
      source: 'Free Dictionary API'
    };
  }
  function cacheKey(word) { return 'vaani_dict_cache_' + word.toLowerCase(); }
  function readCache(word) {
    try {
      var value = JSON.parse(localStorage.getItem(cacheKey(word)) || 'null');
      return value && value.entry ? value : null;
    } catch (e) { return null; }
  }
  function writeCache(word, entry) {
    var value = { savedAt: Date.now(), entry: entry };
    memory[word.toLowerCase()] = value;
    try { localStorage.setItem(cacheKey(word), JSON.stringify(value)); } catch (e) { /* cache is optional */ }
  }
  function lookup(word, options) {
    options = options || {};
    var value = String(word || '').trim();
    if (!/^[A-Za-z][A-Za-z'-]{0,63}$/.test(value)) {
      return Promise.reject(new Error('Online lookup supports a single English word only.'));
    }
    var key = value.toLowerCase();
    var cached = memory[key] || readCache(value);
    if (!options.refresh && cached && Date.now() - cached.savedAt < CACHE_TTL) {
      return Promise.resolve({ entry: cached.entry, source: 'cache', stale: false });
    }
    if (pending[key]) return pending[key];
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timeoutId;
    var timeout = new Promise(function (_, reject) {
      timeoutId = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('The dictionary took too long to respond.'));
      }, 7000);
    });
    var request = fetch(ENDPOINT + encodeURIComponent(value), {
      method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error(response.status === 404 ? 'No online entry was found for this word.' : 'The dictionary is temporarily unavailable.');
      return response.text();
    }).then(function (body) {
      if (body.length > MAX_RESPONSE_CHARS) throw new Error('The dictionary returned an unexpectedly large response.');
      var data;
      try { data = JSON.parse(body); } catch (e) { throw new Error('The dictionary returned unreadable data.'); }
      var entry = safeEntry(data);
      if (!entry) throw new Error('No usable online entry was found for this word.');
      writeCache(value, entry);
      return { entry: entry, source: 'network', stale: false };
    }).catch(function (err) {
      if (cached && cached.entry) return { entry: cached.entry, source: 'cache', stale: true };
      if (err && err.name === 'AbortError') throw new Error('The dictionary request timed out.');
      throw err;
    });
    pending[key] = Promise.race([request, timeout]).finally(function () {
      clearTimeout(timeoutId);
      delete pending[key];
    });
    return pending[key];
  }
  global.VaaniDictionary = { lookup: lookup };
})(window);
