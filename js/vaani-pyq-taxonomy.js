/* VAANI PYQ taxonomy.
   Preserve each source question while adding stable, readable skill labels
   for topic practice, filters, chips, search and analytics. */
(function (global) {
  'use strict';

  var aliases = Object.freeze({
    'comprehension': 'Reading Comprehension',
    'reading comprehension': 'Reading Comprehension',
    'word classes': 'Parts of Speech & Word Classes',
    'word classes parts of speech': 'Parts of Speech & Word Classes',
    'parts of speech': 'Parts of Speech & Word Classes',
    'parts of speech and word classes': 'Parts of Speech & Word Classes',
    'active and passive voice': 'Active & Passive Voice',
    'active passive voice': 'Active & Passive Voice',
    'homonyms homophones': 'Homonyms & Homophones',
    'homophones': 'Homonyms & Homophones',
    'choose the correct usage': 'Word Usage',
    'correct usage of word': 'Word Usage',
    'word meaning': 'Word Meanings',
    'word meanings': 'Word Meanings',
    'word meaning vocabulary': 'Word Meanings',
    'common words': 'Commonly Used Words',
    'sentence arrangement pqrs': 'Sentence Arrangement (PQRS)',
    'reconstructing passage': 'Ordering of Sentences'
  });

  var grammarTags = Object.create(null);
  function tagRange(year, session, start, end, tag) {
    for (var n = start; n <= end; n++) grammarTags['NDA|' + year + '|' + session + '|' + n] = tag;
  }
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

  function norm(value) {
    return String(value == null ? '' : value).normalize('NFKC')
      .toLocaleLowerCase().replace(/[‐‑‒–—]/g, '-').replace(/&/g, ' and ')
      .replace(/[\/]/g, ' ').replace(/[_.,:;()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function sectionFromLabel(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return '';
    var key = norm(raw);
    if (aliases[key]) return aliases[key];
    if (/\b(?:cloze test|cloze passage)\b/.test(key)) return 'Cloze Test';
    if (/\b(?:fill in the blanks|fillers)\b/.test(key)) return 'Fill in the Blanks';
    if (/\b(?:sentence completion|completion of sentences)\b/.test(key)) return 'Sentence Completion';
    if (/\b(?:sentence improvement|no improvement)\b/.test(key)) return 'Sentence Improvement';
    if (/\bsentence correction\b/.test(key)) return 'Sentence Correction';
    if (/\b(?:spotting errors|error spotting)\b/.test(key)) return 'Spotting Errors';
    if (/\bordering of words\b/.test(key)) return 'Ordering of Words in a Sentence';
    if (/\b(?:sentence arrangement|ordering of sentences|reconstructing passage|paragraph jumbles?)\b/.test(key)) {
      return /pqrs/.test(key) ? 'Sentence Arrangement (PQRS)' : 'Ordering of Sentences';
    }
    if (/\b(?:reading comprehension|reading passage|factual passage|expository passage|vocabulary based reading comprehension)\b/.test(key)) return 'Reading Comprehension';
    if (/\b(?:active passive voice|voice change)\b/.test(key)) return 'Active & Passive Voice';
    if (/\b(?:direct indirect speech|reported speech|narration)\b/.test(key)) return 'Direct/Indirect Speech';
    if (/\b(?:parts of speech|word classes|word class|nouns? basic grammar|pronouns? basic grammar|adjectives? basic grammar|adverbs? basic grammar)\b/.test(key)) return 'Parts of Speech & Word Classes';
    if (/\b(?:synonyms?|synonyms vocabulary)\b/.test(key)) return 'Synonyms';
    if (/\b(?:antonyms?|antonyms vocabulary)\b/.test(key)) return 'Antonyms';
    if (/\b(?:idioms?|idioms and phrases|phrases vocabulary)\b/.test(key)) return 'Idioms and Phrases';
    if (/\b(?:spelling|spellings)\b/.test(key)) return 'Spellings';
    if (/\b(?:word meanings?|word meaning vocabulary)\b/.test(key)) return 'Word Meanings';
    if (/\b(?:paired words|usage of pairs)\b/.test(key)) return 'Usage of Paired Words';
    if (/\bselecting words\b/.test(key)) return 'Selecting Words';
    if (/\bword substitution\b/.test(key)) return 'Word Substitution';
    if (/\bprepositions?\b/.test(key)) return 'Prepositions';
    if (/\b(?:articles?|determiners?|demonstratives?|quantifiers?)\b/.test(key)) return 'Determiners & Articles';
    if (/\bdiscourse markers\b/.test(key)) return 'Discourse Markers';
    if (/\b(?:homonyms|homophones)\b/.test(key)) return 'Homonyms & Homophones';
    if (/\b(?:vocabulary|word usage|commonly used words)\b/.test(key)) return raw;
    if (/\b(?:tenses?|verb forms?|modal verbs?|subject verb agreement|phrasal verbs?)\b/.test(key)) return 'Verb System';
    return raw;
  }

  function inferSection(question) {
    var prompt = String(question && question.q || '').toLocaleLowerCase();
    var passage = String(question && question.passage || '').toLocaleLowerCase();
    var options = Array.isArray(question && question.o) ? question.o.map(function (x) { return String(x).toLocaleLowerCase(); }) : [];
    var joined = options.join(' ');
    if (options.some(function (x) { return /^no improvement[.! ]*$/.test(x.trim()); })) return 'Sentence Improvement';
    if (/\b(?:correct spelling|correctly spelt|correctly spelled|spelling mistake|misspelt|misspelled)\b/.test(prompt)) return 'Spellings';
    if (/\b(?:active to passive|passive to active|change (?:the sentence )?(?:into|from).*voice|voice)\b/.test(prompt)) return 'Active & Passive Voice';
    if (/\b(?:direct|indirect|reported) speech\b|\bnarration\b/.test(prompt)) return 'Direct/Indirect Speech';
    if (/\b(?:proper|correct) sequence should be\b|\bthe correct sequence\b|\bthe proper sequence\b|\bjumbled\b|\brearrange\b/.test(prompt)) return 'Ordering of Sentences';
    if (/\b(?:synonym|similar in meaning|same in meaning)\b/.test(prompt)) return 'Synonyms';
    if (/\b(?:antonym|opposite in meaning|opposite meaning)\b/.test(prompt)) return 'Antonyms';
    if (/\b(?:idiom|phrase)\b/.test(prompt)) return 'Idioms and Phrases';
    if (/_{2,}|\[\s*blank\s*\]/i.test(prompt)) return /_{2,}.*_{2,}/s.test(prompt) || /_{2,}.*_{2,}/s.test(passage) ? 'Cloze Test' : 'Fill in the Blanks';
    if (/\bno error\b/.test(prompt) || (/\bno error\b/.test(joined) && /\([abc]\)|\bpart\s*\(?[abc]\)?\b|\|\s*/.test(prompt))) return 'Spotting Errors';
    if (/\b(?:meaning of|word means|means the same|means the opposite|means)\b/.test(prompt)) return 'Word Meanings';
    if (question && question.keyword) return 'Vocabulary';
    if (question && question.passage) return 'Reading Comprehension';
    if (/\b(?:correct usage|most appropriate word|choose the correct word)\b/.test(prompt)) return 'Word Usage';
    if (/\b(?:grammar|grammatically correct)\b/.test(prompt)) return 'Grammar (Mixed)';
    if (options.some(function (x) { return /\bno change\b/.test(x); })) return 'Sentence Correction';
    return prompt.trim() ? 'English (Unclassified)' : 'English (Unclassified)';
  }

  function topic(question) {
    if (!question || typeof question !== 'object') return '';
    var raw = String(question._sourceSec || question.sec || '').trim();
    if (!raw) return '';
    var rawKey = norm(raw);
    var prompt = String(question.q || '').toLocaleLowerCase();
    var asksAntonym = /\b(?:antonym|opposite in meaning|opposite meaning)\b/.test(prompt);
    var asksSynonym = /\b(?:synonym|similar in meaning|same in meaning)\b/.test(prompt);
    if (asksAntonym !== asksSynonym) return asksAntonym ? 'Antonyms' : 'Synonyms';
    var exam = String(question._exam || 'NDA').toUpperCase();
    if (rawKey === 'english' || rawKey === 'grammar') {
      var detail = sectionFromLabel(question.topic);
      if (detail && norm(detail) !== rawKey && detail !== raw) return detail;
      var sourceTags = Array.isArray(question._sourceTags) ? question._sourceTags : (Array.isArray(question.tags) ? question.tags : []);
      for (var i = 0; i < sourceTags.length; i++) {
        var tagged = sectionFromLabel(sourceTags[i]);
        if (tagged && norm(tagged) !== rawKey && norm(tagged) !== 'english') return tagged;
      }
      var key = exam + '|' + question.y + '|' + question.s + '|' + question.n;
      if (grammarTags[key]) return grammarTags[key];
      if (rawKey === 'grammar') return 'Grammar (Mixed)';
      return inferSection(question);
    }
    return sectionFromLabel(raw) || raw;
  }

  function tags(question) {
    if (!question || typeof question !== 'object') return [];
    var exam = String(question._exam || (Array.isArray(question.tags) && question.tags.indexOf('AFCAT') >= 0 ? 'AFCAT' : Array.isArray(question.tags) && question.tags.indexOf('CDS') >= 0 ? 'CDS' : 'NDA')).toUpperCase();
    var original = Array.isArray(question._sourceTags) ? question._sourceTags : (Array.isArray(question.tags) ? question.tags : []);
    // Source tags are archival metadata: retain their exact values and order.
    // The normalized de-duplication applies only to additional generated tags.
    var out = original.slice(), seen = Object.create(null);
    out.forEach(function (value) { if (typeof value === 'string' && norm(value)) seen[norm(value)] = true; });
    function add(value) {
      if (typeof value !== 'string') return;
      var label = value.replace(/\s+/g, ' ').trim();
      if (!label) return;
      var key = norm(label);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(label);
    }
    add(exam);
    add('English');
    var section = topic(question);
    if (section) add(section);
    original.concat([question.topic]).forEach(function (label) {
      var canonical = sectionFromLabel(label);
      if (canonical && norm(canonical) !== norm(label) && canonical !== 'English (Unclassified)') add(canonical);
    });
    return out;
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

  global.VaaniPyqTaxonomy = Object.freeze({ topic: topic, tags: tags, keyword: keyword });
})(window);
