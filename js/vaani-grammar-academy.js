/* Accessible, dependency-free helpers for the structured grammar curriculum. */
(function (global) {
  'use strict';
  var Academy = global.VaaniGrammarAcademy = global.VaaniGrammarAcademy || {};

  Academy.resolve = function (topicId) {
    var curriculum = global.GRAMMAR_ACADEMY;
    if (!curriculum || !Array.isArray(curriculum.topics)) return null;
    return curriculum.topics.find(function (topic) { return topic.id === topicId; }) ||
      curriculum.topics.find(function (topic) { return topic.legacyId === topicId; }) || null;
  };

  Academy.analyzeSentence = function (input) {
    var sentence = String(input == null ? '' : input).replace(/\s+/g, ' ').trim();
    if (!sentence) return { ok: false, message: 'Enter a sentence to analyze.', tokens: [], clauses: [] };
    if (sentence.length > 3000) return { ok: false, message: 'Keep the sentence under 3,000 characters.', tokens: [], clauses: [] };

    var subordinators = /^(because|although|though|while|when|if|unless|since|before|after|that|who|whom|whose|which|where|whether|as|until|once|provided)$/i;
    var coordinators = /^(and|but|or|nor|for|yet|so)$/i;
    var auxiliary = /^(am|is|are|was|were|be|being|been|do|does|did|have|has|had|can|could|may|might|must|shall|should|will|would)$/i;
    var tokens = sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)?|\d+(?:\.\d+)?|[^\s\w]/g) || [];
    var clauses = [], current = [], currentType = 'main';
    function flush() {
      var text = current.join(' ').replace(/\s+([,.;:!?])/g, '$1').trim();
      if (text) clauses.push({ text: text, type: currentType, label: currentType === 'dependent' ? 'Likely dependent clause' : 'Clause or sentence unit' });
      current = [];
    }
    tokens.forEach(function (token, index) {
      var clean = token.toLowerCase().replace(/[.,;:!?]$/, '');
      if (subordinators.test(clean) && current.length) flush();
      if (subordinators.test(clean)) currentType = 'dependent';
      else if (coordinators.test(clean) && current.length) {
        flush();
        currentType = 'main';
      }
      current.push(token);
      if (/[,.!?;]/.test(token) && index < tokens.length - 1) {
        flush();
        if (currentType === 'dependent') currentType = 'main';
      }
    });
    flush();
    if (clauses.length > 1 && clauses[0].type === 'dependent') {
      clauses[0].label = 'Likely dependent clause; check how it attaches';
    }
    var analyzedTokens = tokens.map(function (token) {
      var lower = token.toLowerCase().replace(/[.,;:!?]$/, '');
      var role = 'word';
      if (subordinators.test(lower)) role = 'subordinating marker';
      else if (coordinators.test(lower)) role = 'coordinating marker';
      else if (auxiliary.test(lower)) role = 'possible finite auxiliary';
      else if (/^[A-Za-z]+$/.test(token) && /(ed|ing)$/.test(lower)) role = 'possible non-finite or inflected verb';
      return { text: token, role: role };
    });
    return { ok: true, sentence: sentence, tokens: analyzedTokens, clauses: clauses,
      note: 'This is a first-pass study aid: marker words and word endings are clues, not a full parser. Confirm each clause’s subject, finite verb, and meaning.' };
  };

  Academy.getAdaptiveItems = function (state) {
    var queue = state && Array.isArray(state.reviewQueue) ? state.reviewQueue : [];
    var topics = global.GRAMMAR_ACADEMY && global.GRAMMAR_ACADEMY.topics || [];
    var items = queue.filter(function (item) { return item && item.kind === 'grammar'; }).map(function (item) {
      var topic = topics.find(function (candidate) { return candidate.id === item.ref; });
      return topic ? { ref: item.ref, topic: topic, question: topic.assessments[0], priority: 'review' } : null;
    }).filter(Boolean);
    var seen = new Set(items.map(function (item) { return item.ref; }));
    var mastery = state && state.grammarMastery && typeof state.grammarMastery === 'object' ? state.grammarMastery : {};
    Object.keys(mastery).map(function (id) {
      var entry = mastery[id] || {}, attempts = Number(entry.attempts) || 0, correct = Number(entry.correct) || 0;
      return { id: id, attempts: attempts, accuracy: attempts ? correct / attempts : 1 };
    }).filter(function (entry) { return entry.attempts >= 2 && entry.accuracy < 0.7 && !seen.has(entry.id); })
      .sort(function (left, right) { return left.accuracy - right.accuracy || left.id.localeCompare(right.id); })
      .forEach(function (entry) {
        var topic = topics.find(function (candidate) { return candidate.id === entry.id; });
        if (topic) items.push({ ref: topic.id, topic: topic, question: topic.assessments[0], priority: 'weak' });
      });
    return items;
  };

  Academy.getMixedQuestions = function (seed, limit) {
    var topics = global.GRAMMAR_ACADEMY && global.GRAMMAR_ACADEMY.topics || [];
    var eligible = topics.filter(function (topic) { return Array.isArray(topic.assessments) && topic.assessments.length; });
    if (!eligible.length) return [];
    var hash = 2166136261, value = String(seed == null ? '' : seed);
    for (var i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    var start = (hash >>> 0) % eligible.length;
    var count = Math.max(0, Math.min(eligible.length, Math.floor(Number(limit) || 12)));
    return Array.from({ length: count }, function (_, index) {
      var topic = eligible[(start + index * 3) % eligible.length];
      var question = topic.assessments[(start + topic.id.length) % topic.assessments.length];
      return { topicId: topic.id, question: question };
    });
  };

  Academy.gradeExercise = function (item, response) {
    if (!item || !Array.isArray(item.options)) return { ok: false, message: 'This exercise is unavailable.' };
    var answer = Number(response);
    if (!Number.isInteger(answer) || answer < 0 || answer >= item.options.length) return { ok: false, message: 'Choose one of the listed options.' };
    return { ok: true, correct: answer === item.answer, explanation: item.reasons[answer] || item.explanation || '' };
  };
})(typeof window !== 'undefined' ? window : globalThis);
