import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('js/vaani-exam-desk-data.js', 'utf8');
const context = { Date, Intl, URL };
context.globalThis = context;
vm.runInNewContext(source, context, { filename: 'js/vaani-exam-desk-data.js', timeout: 1000 });

const desk = context.VaaniExamDeskData;
assert.ok(desk, 'exam desk data rules must load');

const today = '2026-09-30';
const cases = [
  ['deadline today is near', { status: 'open', lastDate: '2026-09-30' }, 'near'],
  ['deadline seven days away is near', { status: 'open', lastDate: '2026-10-07' }, 'near'],
  ['deadline eight days away is ongoing', { status: 'open', lastDate: '2026-10-08' }, 'ongoing'],
  ['explicitly open application without dates stays available', { status: 'application open' }, 'ongoing'],
  ['future application start is upcoming', { status: 'notification', applicationStartDate: '2026-10-01' }, 'upcoming'],
  ['future announced exam date is upcoming', { type: 'Recruitment notification', examDate: '2027-02-15' }, 'upcoming'],
  ['past application deadline is archived even with a future exam', { status: 'notification', lastDate: '2026-09-29', examDate: '2027-02-15' }, 'archive'],
  ['past exam is archived', { status: 'notification', examDate: '2026-09-29' }, 'archive'],
  ['result is archived even when a future exam date is present', { title: 'Recruitment result', status: 'result', examDate: '2027-02-15' }, 'archive'],
  ['admit card is never a fresh opportunity', { title: 'Admit card released', status: 'released', examDate: '2027-02-15' }, 'archive'],
  ['answer key is never a fresh opportunity', { title: 'Answer key', type: 'answer key', examDate: '2027-02-15' }, 'archive'],
  ['unknown record with no usable dates is ignored', {}, 'ignore'],
  ['invalid date does not create an active opportunity', { status: 'upcoming', examDate: '2026-02-31' }, 'ignore']
];

for (const [name, item, expected] of cases) {
  assert.equal(desk.classify(item, today), expected, name);
}

assert.equal(desk.parseDate('2026-02-31'), null, 'impossible ISO dates must not roll into March');
assert.equal(desk.classify(null, today), 'ignore', 'null feed entries must be safe');
assert.equal(desk.normalizeItems({ items: [null, 'bad row', [], {}, { title: 'Valid row' }] }).length, 2,
  'feed parsing must discard non-record entries but tolerate incomplete records');
assert.equal(desk.isFutureExamDate({ lastDate: '2026-09-29', examDate: '2027-02-15' }, today), true,
  'a closed cycle may stay visible in the separate future exam calendar');
assert.equal(desk.isFutureExamDate({ examDate: 'not a date' }, today), false,
  'invalid exam dates must not enter the calendar');

const graduateTags = desk.normalizeQualifications('BA, B.Sc., B.Com., BCA, BBA and B.Tech / B.E.');
for (const qualification of ['ba', 'bsc', 'bcom', 'bca', 'bba', 'btech']) {
  assert.ok(graduateTags.includes(qualification), 'qualification parser must recognize ' + qualification);
  assert.ok(desk.QUALIFICATIONS.some(option => option.id === qualification), 'filter must offer ' + qualification);
}
assert.equal(desk.qualificationMatches(['graduate'], 'ba'), true,
  'a general graduation pathway must match a specific undergraduate filter');
assert.equal(desk.qualificationMatches(['ba'], 'bsc'), false,
  'a BA-specific pathway must not be implied eligible for B.Sc.');
assert.equal(desk.qualificationMatches(['postgraduate'], 'ba'), false,
  'postgraduate requirements must not be mistaken for bachelor-level eligibility');
assert.equal(desk.sectorFor({ category: 'unclassified' }), 'other',
  'unknown sectors must not be mislabeled as insurance');

assert.equal(desk.examDateConfidence({ type: 'Annual Calendar' }), 'tentative');
assert.equal(desk.examDateConfidence({ examDateConfirmed: true }), 'confirmed');
assert.equal(desk.examDateConfidence({ official: true, type: 'notification' }), 'unverified',
  'an official source alone does not prove that this particular exam date is confirmed');

const sorted = [
  { id: 'late', examDate: '2027-03-01' },
  { id: 'early', examDate: '2027-01-15' },
  { id: 'invalid', examDate: 'bad date' }
].sort(desk.compareExamDates).map(item => item.id);
assert.deepEqual(sorted, ['early', 'late', 'invalid'], 'exam dates must sort chronologically with invalid dates last');

console.log('Government Exam Desk data tests: ' + cases.length + ' classification cases and qualification/date integrity checks passed');
