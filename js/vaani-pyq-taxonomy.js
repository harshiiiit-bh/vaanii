/* VAANI PYQ taxonomy.
   Keeps the imported paper data untouched while presenting a consistent
   skill label across topic practice, filters, question chips and stats. */
(function (global) {
  'use strict';

  var aliases = Object.freeze({
    'Comprehension': 'Reading Comprehension',
    'Word Classes': 'Parts of Speech & Word Classes',
    'Parts of Speech': 'Parts of Speech & Word Classes',
    'Active and Passive Voice': 'Active & Passive Voice',
    'Active/Passive Voice': 'Active & Passive Voice',
    'Homonyms/Homophones': 'Homonyms & Homophones',
    'Homophones': 'Homonyms & Homophones',
    'Choose the Correct Usage': 'Word Usage',
    'Correct Usage of Word': 'Word Usage'
  });

  var grammarTags = Object.create(null);
  function tagRange(year, session, start, end, tag) {
    for (var n = start; n <= end; n++) {
      grammarTags['NDA|' + year + '|' + session + '|' + n] = tag;
    }
  }

  // The source files grouped these under a broad "Grammar" heading.
  // Re-label them by the actual skill each question tests.
  tagRange(2010, 'II', 41, 41, 'Prepositions and Determiners');
  tagRange(2010, 'II', 42, 45, 'Fill in the Blanks');
  tagRange(2010, 'II', 46, 50, 'Prepositions and Determiners');

  tagRange(2013, 'II', 31, 31, 'Prepositions and Determiners');
  tagRange(2013, 'II', 32, 33, 'Idioms and Phrases');
  tagRange(2013, 'II', 34, 34, 'Use of Phrasal Verbs');
  tagRange(2013, 'II', 35, 35, 'Prepositions and Determiners');
  tagRange(2013, 'II', 36, 36, 'Use of Phrasal Verbs');
  tagRange(2013, 'II', 37, 39, 'Prepositions and Determiners');
  tagRange(2013, 'II', 40, 40, 'Prepositions and Determiners');

  tagRange(2016, 'I', 31, 40, 'Sentence Improvement');
  tagRange(2016, 'II', 38, 50, 'Sentence Improvement');
  tagRange(2017, 'I', 21, 30, 'Sentence Improvement');
  tagRange(2020, 'I', 31, 40, 'Prepositions and Determiners');
  tagRange(2025, 'II', 39, 40, 'Sentence Correction');

  function topic(question) {
    if (!question || typeof question !== 'object') return '';
    var raw = String(question._sourceSec || question.sec || '').trim();
    if (!raw) return '';
    if (raw === 'Grammar') {
      var exam = String(question._exam || 'NDA').toUpperCase();
      var key = exam + '|' + question.y + '|' + question.s + '|' + question.n;
      if (grammarTags[key]) return grammarTags[key];

      var options = Array.isArray(question.o) ? question.o : [];
      if (options.some(function (option) { return /^no improvement$/i.test(String(option).trim()); })) {
        return 'Sentence Improvement';
      }
      return 'Grammar (Mixed)';
    }
    return aliases[raw] || raw;
  }

  function keyword(question) {
    if (!question || typeof question !== 'object') return '';
    if (typeof question.keyword === 'string' && question.keyword.trim()) return question.keyword.trim();
    var text = String(question.q || '');
    var bracketed = text.match(/\[([^\]]{1,100})\]/);
    if (bracketed && bracketed[1].trim()) return bracketed[1].trim();
    if (question.sec === 'Synonyms' || question.sec === 'Antonyms') {
      var quoted = text.match(/["'“”‘’]([^"'“”‘’]{2,80})["'“”‘’]/);
      if (quoted && /^[\p{L}'-]+(?:\s+[\p{L}'-]+)*$/u.test(quoted[1].trim())) return quoted[1].trim();
      var caps = text.match(/\b[A-Z][A-Z'-]{2,}\b/g);
      if (caps && caps.length) return caps[caps.length - 1];
    }
    return '';
  }

  global.VaaniPyqTaxonomy = Object.freeze({ topic: topic, keyword: keyword });
})(window);
