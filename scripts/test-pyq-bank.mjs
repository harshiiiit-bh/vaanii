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

let papers = 0, questions = 0;
const ids = new Set();
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
  const paperIds = new Set();
  for (const q of data) {
    assert.ok(q && typeof q === 'object', file + ': question must be an object');
    assert.equal(Number(q.y), Number(match[1]), file + ': question year mismatch at Q' + q.n);
    assert.equal(String(q.s), match[2], file + ': question session mismatch at Q' + q.n);
    assert.ok(Number.isInteger(Number(q.n)) && Number(q.n) > 0, file + ': invalid question number');
    assert.ok(typeof q.q === 'string' && q.q.trim(), file + ': empty question at Q' + q.n);
    assert.ok(Array.isArray(q.o) && q.o.length >= 2, file + ': invalid options at Q' + q.n);
    assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.o.length, file + ': invalid answer index at Q' + q.n);
    assert.ok(typeof q.sec === 'string' && q.sec.trim(), file + ': missing source section at Q' + q.n);
    assert.ok(!paperIds.has(String(q.n)), file + ': duplicate question number ' + q.n);
    paperIds.add(String(q.n));
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
  papers++;
}
console.log('PYQ bank checks passed: ' + papers + ' papers, ' + questions + ' questions, unique identities and normalized tags.');


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
