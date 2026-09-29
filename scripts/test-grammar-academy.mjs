import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
context.window = context;
for (const path of ['data/grammar.js', 'data/grammar-basics.js']) {
  vm.runInContext(readFileSync(path, 'utf8'), context, { filename: path, timeout: 2000 });
}
const legacyOriginalIds = vm.runInContext('GRAMMAR.map(topic => topic.id)', context);
const legacyQuizSnapshot = JSON.stringify(vm.runInContext('GRAMMAR.map(topic => ({id:topic.id,quiz:topic.quiz}))', context));
vm.runInContext(readFileSync('data/grammar-academy.js', 'utf8'), context, { filename: 'data/grammar-academy.js', timeout: 2000 });
vm.runInContext(readFileSync('js/vaani-grammar-academy.js', 'utf8'), context, { filename: 'js/vaani-grammar-academy.js', timeout: 2000 });
const { grammar, basics, academy } = vm.runInContext(`({
  grammar: GRAMMAR,
  basics: GRAMMAR_BASICS,
  academy: GRAMMAR_ACADEMY
})`, context);

const legacyIds = [
  'parts-of-speech','noun','pronoun','verb','adjective','adverb','preposition','conjunction',
  'articles','tenses','voice','narration','sva','modals','conditionals','question-tags','comparison',
  'clauses','phrases','gerunds-infinitives','participles','parallelism','punctuation','capitalization',
  'word-formation','sentence-structure','determiners','spotting-errors','sentence-improvement',
  'idioms-phrasal-verbs','one-word-substitution','jumbled-sentences','confused-words','cloze-test-strategy'
];

assert.ok(Array.isArray(grammar), 'Legacy grammar catalog must remain available');
assert.ok(academy && Array.isArray(academy.topics), 'Structured Academy curriculum is missing');
assert.ok(context.VaaniGrammarAcademy, 'Grammar Academy interaction helpers are missing');
for (const id of legacyIds) assert.equal(context.VaaniGrammarAcademy.resolve(id)?.id, id, 'Compatibility resolution must prefer exact legacy IDs: ' + id);
assert.equal(JSON.stringify(grammar.filter(topic => legacyOriginalIds.includes(topic.id)).map(topic => ({id:topic.id,quiz:topic.quiz}))), legacyQuizSnapshot,
  'Existing topic quizzes and IDs must remain unchanged');
assert.deepEqual([...new Set(grammar.map(topic => topic.id))].sort(),
  [...grammar.map(topic => topic.id)].sort(), 'Legacy grammar topic IDs must remain unique');
for (const id of legacyIds) assert.ok(grammar.some(topic => topic.id === id), 'Legacy topic ID changed: ' + id);

const topics = academy.topics;
const topicIds = new Set(topics.map(topic => topic.id));
assert.equal(academy.audit.length, legacyIds.length, 'Every legacy grammar topic needs a gap-audit entry');
assert.deepEqual([...new Set(academy.audit.map(item => item.id))].sort(), [...legacyIds].sort(), 'Grammar audit must cover each old topic exactly once');
assert.equal(topicIds.size, topics.length, 'Academy lesson IDs must be unique');
assert.deepEqual([...new Set(topics.map(topic => topic.stage))].sort(),
  ['advanced','foundation','intermediate','mastery'], 'All four progressive stages must be represented');

const requiredCoverage = [
  'sva','tenses','sequence-of-tenses','determiners','clauses','reduced-relative-clauses',
  'non-finite-verbs','gerunds-infinitives','conditionals','inversion','subjunctive','modals',
  'parallelism','modifier-placement','voice','narration','sentence-transformations'
];
for (const id of requiredCoverage) assert.ok(topicIds.has(id), 'Required grammar concept is missing: ' + id);

for (const topic of topics) {
  assert.ok(topic.title && topic.summary && topic.legacyId, topic.id + ': title, summary, and legacy mapping are required');
  assert.ok(grammar.some(legacy => legacy.id === topic.legacyId), topic.id + ': legacy mapping does not resolve');
  assert.ok(Array.isArray(topic.prerequisites), topic.id + ': prerequisites must be an array');
  for (const prerequisite of topic.prerequisites) assert.ok(topicIds.has(prerequisite), topic.id + ': missing prerequisite ' + prerequisite);
  assert.ok(Array.isArray(topic.sections) && topic.sections.length >= 2, topic.id + ': lesson needs structured explanation sections');
  assert.ok(topic.sections.every(section => section.title && section.body.length >= 90), topic.id + ': explanation section is too shallow');
  assert.equal(new Set(topic.sections.map(section => section.body)).size, topic.sections.length, topic.id + ': lesson sections repeat the same explanation');
  assert.ok(Array.isArray(topic.examples) && topic.examples.length >= 3, topic.id + ': needs multiple examples and counterexamples');
  assert.equal(new Set(topic.examples.map(example => example.text)).size, topic.examples.length, topic.id + ': examples must be distinct');
  assert.ok(topic.examples.some(example => example.kind === 'counterexample'), topic.id + ': needs a counterexample');
  assert.ok(topic.diagram?.label && topic.diagram?.text && topic.diagram.steps?.length >= 3, topic.id + ': needs a diagram with an equivalent text description');
  assert.ok(Array.isArray(topic.misconceptions) && topic.misconceptions.length >= 1, topic.id + ': common errors are missing');
  assert.ok(Array.isArray(topic.exercises) && topic.exercises.length >= 2, topic.id + ': conceptual exercises are missing');
  assert.ok(Array.isArray(topic.assessments) && topic.assessments.length >= 3, topic.id + ': tiered assessments are missing');
  for (const question of topic.assessments) {
    assert.ok(question.id && question.prompt, topic.id + ': assessment needs an ID and prompt');
    assert.ok(Array.isArray(question.options) && question.options.length >= 3, question.id + ': needs plausible alternatives');
    assert.equal(new Set(question.options).size, question.options.length, question.id + ': duplicate alternatives make the item ambiguous');
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, question.id + ': invalid answer index');
    assert.equal(question.reasons?.length, question.options.length, question.id + ': explain every answer option');
    assert.ok(question.reasons.every(reason => typeof reason === 'string' && reason.trim().length >= 12), question.id + ': explanation is too short');
    assert.equal(question.provenance, 'authored-practice', question.id + ': authored practice must retain provenance');
    assert.ok(question.examSkills?.length, question.id + ': exam-skill alignment is missing');
  }
  assert.equal(new Set(topic.assessments.map(question => question.prompt)).size, topic.assessments.length, topic.id + ': assessment prompts are repetitive');
}
const assessmentIds = topics.flatMap(topic => topic.assessments.map(question => question.id));
assert.equal(new Set(assessmentIds).size, assessmentIds.length, 'Assessment IDs must be unique across the curriculum');

const visiting = new Set(), visited = new Set();
function visit(id) {
  if (visiting.has(id)) throw new Error('Curriculum prerequisite cycle includes ' + id);
  if (visited.has(id)) return;
  visiting.add(id);
  for (const prerequisite of topics.find(topic => topic.id === id).prerequisites) visit(prerequisite);
  visiting.delete(id);
  visited.add(id);
}
for (const topic of topics) visit(topic.id);

for (const id of legacyIds) assert.ok(basics[id] || topicIds.has(id), 'Legacy basics entry disappeared: ' + id);
const analyzer = context.VaaniGrammarAcademy.analyzeSentence('Although the route was difficult, the team completed it.');
assert.equal(analyzer.ok, true, 'Sentence analyzer rejected a valid sentence');
assert.ok(analyzer.clauses.length >= 2, 'Clause analyzer missed the dependent/main clause split');
assert.equal(context.VaaniGrammarAcademy.analyzeSentence('   ').ok, false, 'Empty sentence should receive actionable feedback');
const mixedOne = context.VaaniGrammarAcademy.getMixedQuestions('regression-seed', 12);
const mixedTwo = context.VaaniGrammarAcademy.getMixedQuestions('regression-seed', 12);
assert.deepEqual(JSON.parse(JSON.stringify(mixedOne)), JSON.parse(JSON.stringify(mixedTwo)), 'Mixed challenge selection must be deterministic for a seed');
assert.equal(mixedOne.length, 12, 'Mixed challenge should contain the requested number of lessons');
for (const entry of mixedOne) {
  assert.ok(topicIds.has(entry.topicId), 'Mixed challenge points to an unknown lesson');
  assert.ok(entry.question.provenance === 'authored-practice', 'Mixed challenge mislabeled an assessment');
}
const firstItem = topics[0].assessments[0];
const correctGrade = context.VaaniGrammarAcademy.gradeExercise(firstItem, firstItem.answer);
assert.equal(correctGrade.correct, true, 'Exercise grader rejected the correct answer');
assert.ok(correctGrade.explanation, 'Exercise grader omitted answer reasoning');
assert.equal(context.VaaniGrammarAcademy.gradeExercise(firstItem, -1).ok, false, 'Exercise grader accepted an invalid option');
const weakItems = context.VaaniGrammarAcademy.getAdaptiveItems({ reviewQueue: [], grammarMastery: { sva: { attempts: 4, correct: 1 } } });
assert.equal(weakItems.length, 1, 'Weak grammar mastery must enter adaptive revision');
assert.equal(weakItems[0].ref, 'sva');
assert.equal(weakItems[0].priority, 'weak');
console.log('Grammar Academy audit: ' + topics.length + ' mapped lessons, four stages, legacy IDs, explanations, analyzer, deterministic mixed practice and grading validated');
