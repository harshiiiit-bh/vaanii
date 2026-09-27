/* VAANI optional, user-triggered sentence feedback via LanguageTool's public API. */
(function (global) {
  'use strict';
  var ENDPOINT = 'https://api.languagetool.org/v2/check';
  var MIN_GAP_MS = 8000;
  var lastRequestAt = 0;
  function check(text) {
    var value = String(text == null ? '' : text).trim();
    if (!value) return Promise.reject(new Error('Write a sentence before checking it.'));
    if (value.length > 3000) return Promise.reject(new Error('Please keep the sentence under 3,000 characters.'));
    var wait = MIN_GAP_MS - (Date.now() - lastRequestAt);
    if (wait > 0) return Promise.reject(new Error('Please wait ' + Math.ceil(wait / 1000) + ' seconds before checking again.'));
    if (typeof fetch !== 'function') return Promise.reject(new Error('Online checking is unavailable in this browser.'));
    lastRequestAt = Date.now();
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('The grammar checker timed out. Your sentence is still available here.'));
      }, 8000);
    });
    var request = fetch(ENDPOINT, {
      method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
      body: new URLSearchParams({ text: value, language: 'en-US' }).toString(),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error(response.status === 429 ? 'The free checker is busy. Please try again later.' : 'The grammar checker is temporarily unavailable.');
      return response.json();
    }).then(function (data) {
      if (!data || !Array.isArray(data.matches)) throw new Error('The grammar checker returned an unexpected response.');
      return data.matches.slice(0, 10).map(function (m) {
        return {
          message: typeof m.message === 'string' ? m.message.slice(0, 500) : 'Review this part of the sentence.',
          context: m.context && typeof m.context === 'object' ? String(m.context.text || '').slice(0, 500) : '',
          offset: Number.isFinite(m.offset) ? m.offset : -1,
          length: Number.isFinite(m.length) ? m.length : 0,
          replacements: Array.isArray(m.replacements) ? m.replacements.slice(0, 5).map(function (r) {
            return typeof r.value === 'string' ? r.value.slice(0, 150) : '';
          }).filter(Boolean) : [],
          rule: m.rule && typeof m.rule.id === 'string' ? m.rule.id.slice(0, 100) : ''
        };
      });
    }).finally(function () { clearTimeout(timer); });
    return Promise.race([request, timeout]).finally(function () { clearTimeout(timer); });
  }
  global.VaaniWritingCoach = { check: check };
})(window);
