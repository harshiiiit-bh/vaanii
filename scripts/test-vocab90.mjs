import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const course=JSON.parse(readFileSync(resolve(root,'data/vocab90/course.json'),'utf8'));
const days=course;
assert.equal(course.length,90,'Exactly 90 days are required.');
assert.deepEqual(course.map(d=>d.day),Array.from({length:90},(_,i)=>i+1),'Days must be continuous and ordered.');
const pages=[];
for(const day of course){
 assert.ok(Array.isArray(day.sourcePages)&&day.sourcePages.length,'Day '+day.day+' has no source pages.');
 assert.ok(Array.isArray(day.sections)&&day.sections.length,'Day '+day.day+' has no content sections.');
 for(const section of day.sections){
  assert.ok(section.title&&section.title.trim(),'Day '+day.day+' has an untitled section.');
  assert.ok(typeof section.text==='string'&&section.text.trim(),'Day '+day.day+' has an empty section.');
  assert.ok(['oneword','idioms','series','verbal','prep','cloze','other'].includes(section.key),'Unknown section key on Day '+day.day+'.');
  assert.doesNotMatch(section.text,/https?:\/\/|www\.|mypathshala|scribd|youtube|telegram|cglaptitudepathshala|play\.google/i,'Promotion/link residue in Day '+day.day+'.');
 }
 pages.push(...day.sourcePages);
}
assert.equal(pages.length,324,'Expected 324 source-page references.');
assert.equal(new Set(pages).size,324,'A PDF page is assigned more than once.');
assert.deepEqual([...new Set(pages)].sort((a,b)=>a-b),Array.from({length:324},(_,i)=>i+1),'Expected exact source page coverage 1–324.');

const day20=days[19];
const day20Prep=day20.sections.find(section=>section.key==='prep');
const day20Cloze=day20.sections.find(section=>section.key==='cloze');
assert.ok(day20Prep,'Day 20 fixed-preposition table is missing.');
assert.match(day20Prep.text,/Confident of-/);
assert.match(day20Prep.text,/Count on-/);
assert.match(day20Prep.text,/Charge of \(Noun\)/);
assert.match(day20Prep.text,/Charge with \(Verb\)/);
assert.match(day20Prep.text,/Cope with-/);
assert.ok(!day20Cloze.text.includes('Confident of-'),'Day 20 prepositions must not be duplicated in cloze content.');
const day33=days[32];
const day33OneWord=day33.sections.find(section=>section.key==='oneword');
const day33Idioms=day33.sections.find(section=>section.key==='idioms');
assert.ok(day33OneWord,'Day 33 one-word substitutions are missing.');
assert.match(day33OneWord.text,/Improvident/);
assert.match(day33OneWord.text,/Malfunction/);
assert.match(day33Idioms.text,/Eat anyone.s salt/);
assert.match(day33Idioms.text,/In one.s kitty/);
assert.ok(!day33Idioms.text.includes('Improvident'),'Day 33 one-word content is mixed into idioms.');

const html=readFileSync(resolve(root,'index.html'),'utf8');
const a=html.indexOf('<section class="view v90-view"'),b=html.indexOf('<!-- ============ WORD DETAIL PAGE ============ -->',a);
assert.ok(a>=0&&b>a,'Native Vocab90 view missing.');
const view=html.slice(a,b);
assert.match(view,/data-v90-mode="all"/);assert.match(view,/v90DayGrid/);
assert.doesNotMatch(view,/scribd|v90ReaderFrame|<iframe/i,'Third-party PDF reader is still embedded.');
assert.match(html,/vaani-vocab90\.js\?v=20261004-structured3/);
assert.match(html,/vaani-vocab90\.css\?v=20261003-structured2/);
const app=readFileSync(resolve(root,'js/app.js'),'utf8');
assert.match(app,/vocab90Completed/);assert.match(app,/vocab90XpAwarded/);assert.match(app,/V90Study\(open\)/);
const controller=readFileSync(resolve(root,'js/vaani-vocab90.js'),'utf8');
assert.match(controller,/data\/vocab90\/course\.json/);assert.match(controller,/addXP\(10/);
assert.doesNotMatch(controller,/localStorage|scribd|v90ReaderFrame/);
assert.match(controller,/function parseOneWordRows/);
assert.match(controller,/v90-oneword-table/);
assert.match(controller,/function anchoredLayout/);
assert.match(controller,/v90-entry-card/);
assert.ok(controller.includes('data/vocab90/course.json?v=20261003-structured1'));
const css=readFileSync(resolve(root,'vaani-vocab90.css'),'utf8');
assert.ok(css.includes('.v90-entry-table-wrap'));
assert.ok(css.includes('.v90-entry-grid'));
const sw=readFileSync(resolve(root,'sw.js'),'utf8');
assert.match(sw,/vaani-shell-v9/);assert.ok(sw.includes('mjs|json|svg'),'Service worker must cache JSON assets.');
console.log('Vocab90 integrity passed: 90 days, 324 unique source pages, native reader, account progress, XP and JSON caching.');
