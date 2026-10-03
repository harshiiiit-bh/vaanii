import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { console: { warn() {}, error() {}, log() {} } };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'data/pyq/manifest.js'), 'utf8'), sandbox, { filename: 'manifest.js' });

const files = sandbox.PYQ_PAPER_FILES;
assert.ok(Array.isArray(files) && files.length > 0, 'PYQ manifest must contain papers');
assert.equal(new Set(files).size, files.length, 'PYQ manifest must not duplicate files');
vm.runInContext(fs.readFileSync(path.join(root, 'js/vaani-pyq-taxonomy.js'), 'utf8'), sandbox, { filename: 'vaani-pyq-taxonomy.js' });
const taxonomy = sandbox.VaaniPyqTaxonomy;
assert.ok(taxonomy && typeof taxonomy.topic === 'function' && typeof taxonomy.tags === 'function', 'PYQ taxonomy API must be available');

const normalizeText = value => String(value ?? '').normalize('NFKC');
const canonicalSpace = value => normalizeText(value).replace(/\s+/g, ' ').trim();
const hasForbiddenText = value => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u200C\u200D\u2060\uFEFF\uFFFD]/.test(String(value ?? ''));
const hasRepeatedSpace = value => / {2,}/.test(normalizeText(value));
const hasRepeatedWord = value => {
  const tokens = canonicalSpace(value).toLocaleLowerCase().match(/[\p{L}\p{N}']+(?:-[\p{L}\p{N}']+)*/gu) || [];
  for(let i=1;i<tokens.length;i++) if(tokens[i]===tokens[i-1] && tokens[i].length>1) return true;
  return false;
};
const stripStructureLabels = value => canonicalSpace(value)
  .replace(/\(([a-z]|P|Q|R|S)\)/gi,' ')
  .replace(/\b(?:P|Q|R|S|S1|S2|S3|S6)\s*[:.]\s*/gi,' ')
  .replace(/\s+/g,' ')
  .trim();

let papers = 0, questions = 0;
const ids = new Set();
const paperDiagnostics = [];
for (const file of files) {
  const filePath = path.join(root, 'data/pyq', file + '.js');
  assert.ok(fs.existsSync(filePath), 'Manifest entry has no file: ' + file);
  const name = file.replace(/^cds-/, '').replace(/^afcat-/, '');
  const match = name.match(/^(\d{4})-([IVXLC]+)$/);
  assert.ok(match, 'Unexpected PYQ manifest key: ' + file);
  const exam = file.startsWith('cds-') ? 'CDS' : file.startsWith('afcat-') ? 'AFCAT' : 'NDA';
  const variable = 'PYQ_' + (exam === 'CDS' ? 'CDS_' : exam === 'AFCAT' ? 'AFCAT_' : '') + match[1] + '_' + match[2];
  const paperSandbox = { console: { warn() {}, error() {}, log() {} } };
  paperSandbox.window = paperSandbox;
  vm.createContext(paperSandbox);
  const source = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(source + '\n;globalThis.__pyqTestData = ' + variable + ';', paperSandbox, { filename: filePath });
  const data = paperSandbox.__pyqTestData;
  assert.ok(Array.isArray(data) && data.length > 0, 'Paper did not expose a non-empty array: ' + file);
  const expectedQuestionCount = exam === 'NDA' ? 50 : exam === 'CDS' ? 120 : 30;
  assert.equal(data.length, expectedQuestionCount, file + ': expected exactly ' + expectedQuestionCount + ' questions, got ' + data.length);
  const paperIds = new Set();
  const paperNumbers = [];
  const diag = { repeatedSpaces: [], repeatedWords: [], optionDuplicates: [], flattenedStructure: [], partMismatches: [], forbiddenChars: [], htmlLike: [], badOptions: [] };

  for (const q of data) {
    assert.ok(q && typeof q === 'object', file + ': question must be an object');
    assert.equal(Number(q.y), Number(match[1]), file + ': question year mismatch at Q' + q.n);
    assert.equal(String(q.s), match[2], file + ': question session mismatch at Q' + q.n);
    assert.ok(Number.isInteger(Number(q.n)) && Number(q.n) > 0, file + ': invalid question number');
    paperNumbers.push(Number(q.n));

    assert.ok(typeof q.q === 'string' && q.q.trim(), file + ': empty question at Q' + q.n);
    assert.equal(q.q, q.q.trim(), file + ': leading/trailing whitespace in question at Q' + q.n);
    assert.ok(!hasForbiddenText(q.q), file + ': forbidden/invisible/replacement character in question at Q' + q.n);
    if(hasRepeatedSpace(q.q)) diag.repeatedSpaces.push(q.n);
    if(hasRepeatedWord(q.q)) diag.repeatedWords.push(q.n);
    if(/<\/?(?:div|span|p|br|script|style)\b/i.test(q.q)) diag.htmlLike.push(q.n);

    for (const [fieldName, value] of [['question', q.q], ['passage', q.passage]]) {
      if (value == null) continue;
      assert.ok(typeof value === 'string', file + ': ' + fieldName + ' must be text at Q' + q.n);
      assert.ok(!hasForbiddenText(value), file + ': forbidden/invisible/replacement character in ' + fieldName + ' at Q' + q.n);
      if(/<\/?(?:div|span|p|br|script|style)\b/i.test(value)) diag.htmlLike.push(q.n + ':' + fieldName);
    }
    if (Array.isArray(q.parts)) {
      q.parts.forEach((part, partIndex) => {
        assert.ok(typeof part === 'string' && part.trim(), file + ': empty part at Q' + q.n + ' part ' + (partIndex + 1));
        assert.equal(part, part.trim(), file + ': leading/trailing whitespace in part at Q' + q.n + ' part ' + (partIndex + 1));
        assert.ok(!hasForbiddenText(part), file + ': forbidden/invisible/replacement character in part at Q' + q.n + ' part ' + (partIndex + 1));
      });
    }

    assert.ok(Array.isArray(q.o) && q.o.length >= 2, file + ': invalid options at Q' + q.n);
    const canonicalOptions=q.o.map(canonicalSpace);
    if(new Set(canonicalOptions).size!==canonicalOptions.length) diag.optionDuplicates.push(q.n);
    q.o.forEach((option, optionIndex) => {
      assert.ok(typeof option === 'string' && option.trim(), file + ': empty option at Q' + q.n + ' option ' + (optionIndex + 1));
      assert.equal(option, option.trim(), file + ': leading/trailing whitespace in option at Q' + q.n + ' option ' + (optionIndex + 1));
      assert.ok(!hasForbiddenText(option), file + ': forbidden/invisible/replacement character in option at Q' + q.n + ' option ' + (optionIndex + 1));
      if(/<\/?(?:div|span|p|br|script|style)\b/i.test(option)) diag.htmlLike.push(q.n+':'+optionIndex);
    });

    assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.o.length, file + ': invalid answer index at Q' + q.n);
    assert.ok(typeof q.sec === 'string' && q.sec.trim(), file + ': missing source section at Q' + q.n);
    assert.ok(!paperIds.has(String(q.n)), file + ': duplicate question number ' + q.n);
    paperIds.add(String(q.n));

    const secLower=String(q.sec).trim().toLocaleLowerCase();
    if(/ordering of words|sentence arrangement|order(?:ing)? of sentences/i.test(secLower)){
      const hasParts=Array.isArray(q.parts)&&q.parts.length===4;
      const hasLabels=/\bP\b[\s\S]*\bQ\b[\s\S]*\bR\b[\s\S]*\bS\b/.test(q.q)||/\(P\)[\s\S]*\(Q\)[\s\S]*\(R\)[\s\S]*\(S\)/.test(q.q);
      if(!hasParts && !hasLabels) diag.flattenedStructure.push(q.n);
      if(hasParts){
        assert.ok(q.parts.every(part=>typeof part==='string'&&part.trim()),file+': empty Ordering-of-Words part at Q'+q.n);
      }
    }

    if(/spotting errors/i.test(secLower) && Array.isArray(q.parts)){
      assert.equal(q.parts.length,3,file+': Spotting Errors parts must contain exactly three segments at Q'+q.n);
      assert.ok(q.parts.every(part=>typeof part==='string'&&part.trim()),file+': empty Spotting Errors segment at Q'+q.n);
    }

    const id = exam + '|' + q.y + '|' + q.s + '|' + q.n;
    assert.ok(!ids.has(id), 'Duplicate question identity: ' + id);
    ids.add(id);
    const item = { ...q, _exam: exam, _sourceSec: q.sec, _sourceTags: Array.isArray(q.tags) ? q.tags.slice() : [] };
    item.sec = taxonomy.topic(item);
    item.tags = taxonomy.tags(item);
    assert.ok(item.sec && item.sec !== 'English', file + ': unresolved generic English topic at Q' + q.n);
    assert.ok(item.tags.includes(exam), file + ': missing exam tag at Q' + q.n);
    assert.ok(item.tags.includes('English'), file + ': missing English tag at Q' + q.n);
    assert.ok(item.tags.includes(item.sec), file + ': missing canonical skill tag at Q' + q.n);
    for (const original of item._sourceTags) {
      assert.ok(item.tags.includes(original), file + ': source tag was lost at Q' + q.n + ': ' + original);
    }
    questions++;
  }

  paperNumbers.sort((a,b)=>a-b);
  if(paperNumbers[0]!==1 || paperNumbers.some((n,i)=>n!==i+1)){
    const missing=[];
    for(let n=1;n<=paperNumbers[paperNumbers.length-1];n++) if(!paperNumbers.includes(n)) missing.push(n);
    paperDiagnostics.push(file+' questionNumberGaps: '+missing.join(', '));
  }
  const hardKeys=['repeatedSpaces','optionDuplicates','forbiddenChars','htmlLike','badOptions'];
  const warningKeys=['repeatedWords','flattenedStructure'];
  for(const key of hardKeys){
    if(diag[key].length) paperDiagnostics.push(file+' '+key+': '+diag[key].slice(0,20).join(', '));
  }
  for(const key of warningKeys){
    if(diag[key].length) console.warn('PYQ structure warning: '+file+' '+key+': '+diag[key].slice(0,20).join(', '));
  }
  if (file === '2017-II' && exam === 'NDA') {
    const q12 = data.find(q => Number(q.n) === 12);
    const q21 = data.find(q => Number(q.n) === 21);
    const q31 = data.find(q => Number(q.n) === 31);
    assert.equal(q12.ans, 3, 'NDA II 2017 Q12 answer key regression');
    assert.equal(q12.sec, 'Antonyms', 'NDA II 2017 Q12 section regression');
    assert.ok(String(q21.passage || '').includes('I had 21. ______ taken 22. ______ my clothes'), 'NDA II 2017 cloze passage regression');
    assert.deepEqual(JSON.parse(JSON.stringify(q31.parts)), [
      'has slowly and painfully surmounted',
      'and his growing intelligence',
      'all the obstacles that have come in his way',
      'has faced all kinds of dangers'
    ], 'NDA II 2017 Q31 part transcription regression');
  }
  papers++;
}
if(paperDiagnostics.length){
  console.error('PYQ forensic hard findings:');
  for(const finding of paperDiagnostics.slice(0,120)) console.error(' - '+finding);
}
assert.equal(paperDiagnostics.length,0,'Forensic PYQ hard integrity audit found objective data corruption.');
console.log('PYQ bank checks passed: ' + papers + ' papers, ' + questions + ' questions, unique identities and objective text integrity. Legacy structural warnings were reported separately.');


// Validate the real test-setup pool builder against representative NDA/CDS/AFCAT sources.
const setupSandbox = {
  console: { warn() {}, error() {}, log() {} },
  document: { readyState: 'loading', addEventListener() {} }
};
setupSandbox.window = setupSandbox;
setupSandbox.PYQ_ALL = [
  { _id: 'N1', _exam: 'NDA' }, { _id: 'N2', _exam: 'NDA' },
  { _id: 'C1', _exam: 'CDS' }, { _id: 'C2', _exam: 'CDS' }, { _id: 'C3', _exam: 'CDS' },
  { _id: 'A1', _exam: 'AFCAT' }
];
vm.createContext(setupSandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/vaani-testkit.js'), 'utf8'), setupSandbox, { filename: 'vaani-testkit.js' });
const vx = setupSandbox.VX;
assert.ok(vx && typeof vx.poolFor === 'function' && typeof vx.sourceChoices === 'function', 'Test setup source API must be available');
const sourceChoiceSnapshot = JSON.parse(JSON.stringify(vx.sourceChoices(setupSandbox.PYQ_ALL)));
assert.deepEqual(sourceChoiceSnapshot.map(choice => choice.code), [
  'NDA', 'CDS', 'AFCAT', 'NDA+CDS', 'CDS+AFCAT', 'NDA+AFCAT', 'ALL'
], 'Setup selector must show all single, paired, and all-three banks');
assert.deepEqual(sourceChoiceSnapshot.map(choice => choice.count), [2, 3, 1, 5, 4, 3, 6], 'Combined bank question counts must be exact');
for (const [source, exams] of [
  ['NDA+CDS', ['NDA', 'CDS']],
  ['CDS+AFCAT', ['CDS', 'AFCAT']],
  ['NDA+AFCAT', ['NDA', 'AFCAT']],
  ['ALL', ['NDA', 'CDS', 'AFCAT']]
]) {
  const pool = vx.poolFor(source, setupSandbox.PYQ_ALL);
  assert.ok(pool.length > 0, source + ' should have available questions');
  assert.ok(pool.every(question => exams.includes(question._exam)), source + ' included an unrelated exam bank');
}
assert.equal(vx.poolFor('BOTH', setupSandbox.PYQ_ALL).length, 6, 'Legacy BOTH source should remain compatible');
console.log('Combined exam setup tests passed: exact pair pools, all-three pool, counts, and legacy BOTH support.');
