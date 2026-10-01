#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const appPath=path.resolve(new URL('.',import.meta.url).pathname,'..','js','app.js');
const source=fs.readFileSync(appPath,'utf8');

function sliceBetween(start,end){
  const a=source.indexOf(start);
  const b=source.indexOf(end,a+start.length);
  if(a<0||b<0) throw new Error('Missing source anchor: '+start);
  return source.slice(a,b);
}
const rankBlock=sliceBetween('const VAANI_SERVICE_RANKS','const VAANI_HONORARY_RANKS');
const honoraryBlock=sliceBetween('const VAANI_HONORARY_RANKS','const VAANI_SERVICE_CHOICES');
const progressFn=sliceBetween('function getServiceRankProgress','function getMinimumXPDays');
const minDaysFn=sliceBetween('function getMinimumXPDays','function makeServiceInsignia');
const accuracyFn=sliceBetween('function getAccuracyPenalty','function getTotalMarksPenalty');
const marksFn=sliceBetween('function getTotalMarksPenalty','function dailyXPDayKey');

const sandbox={};
vm.runInNewContext(
  rankBlock+'\n'+honoraryBlock+'\n'+progressFn+'\n'+minDaysFn+'\n'+accuracyFn+'\n'+marksFn+
  '\nthis.api={VAANI_SERVICE_RANKS,VAANI_HONORARY_RANKS,getServiceRankProgress,getMinimumXPDays,getAccuracyPenalty,getTotalMarksPenalty};',
  sandbox
);
const {VAANI_SERVICE_RANKS,VAANI_HONORARY_RANKS,getServiceRankProgress,getMinimumXPDays,getAccuracyPenalty,getTotalMarksPenalty}=sandbox.api;

const expected=[100,400,900,1700,3000,4800,7200,10500,14500];
for(const [force,ranks] of Object.entries(VAANI_SERVICE_RANKS)){
  const thresholds=ranks.map(r=>r.xp);
  assert(JSON.stringify(thresholds)===JSON.stringify(expected),force+' thresholds changed unexpectedly');
  for(let i=1;i<thresholds.length;i++)assert(thresholds[i]>thresholds[i-1],force+' thresholds must increase');
  assert(ranks.every(r=>typeof r.name==='string'&&typeof r.file==='string'&&r.file.endsWith('.svg')),force+' rank entries incomplete');
  const p=getServiceRankProgress(0,force);
  assert(p.next.name===ranks[0].name&&p.remainingXP===100,force+' zero-XP milestone calculation failed');
  const max=getServiceRankProgress(19000,force);
  assert(max.current.name===VAANI_HONORARY_RANKS[force].name,'honorary rank not reached at 19,000 XP for '+force);
}
assert(VAANI_HONORARY_RANKS.army.xp===19000&&VAANI_HONORARY_RANKS.navy.xp===19000&&VAANI_HONORARY_RANKS.airforce.xp===19000,'honorary XP mismatch');

const accuracyCases=[[70,0],[60,10],[59.9,10],[50,20],[49.9,45],[40,45],[39.9,60],[33,60],[32.99,80],[0,80]];
for(const [score,want] of accuracyCases) assert(getAccuracyPenalty(score)===want,'accuracy penalty failed at '+score);
const marksCases=[[100,5],[70,5],[69.99,8],[50,8],[49.99,12],[33,12],[32.99,15],[0,15]];
for(const [score,want] of marksCases) assert(getTotalMarksPenalty(score)===want,'marks penalty failed at '+score);

assert(getMinimumXPDays(100,80,80)===1,'100 XP should take one earning day from a fresh 80-XP day');
assert(getMinimumXPDays(19000,80,80)===238,'19,000 XP field-marshal milestone should require at least 238 earning days at 80/day');
assert(getMinimumXPDays(19000,0,80)===238,'19,000 XP milestone day count is wrong with no XP remaining today');

function assert(ok,message){ if(!ok) throw new Error(message); }
console.log('PASS: service rank XP, accuracy deductions, marks deductions, and daily pacing checks.');
