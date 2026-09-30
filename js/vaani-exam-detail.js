(function(){
'use strict';
var q=new URLSearchParams(location.search),title=q.get('title')||'Exam / career pathway',desc=q.get('description')||'',type=q.get('type')||'EXAM',portal=q.get('portal')||'',tags=(q.get('tags')||'').split('|').filter(Boolean);
var el=function(id){return document.getElementById(id)};
el('detailTitle').textContent=title;el('detailDescription').textContent=desc;el('detailType').textContent=type.toUpperCase();document.title=title+' | VAANI';
if(portal)el('detailPortal').href=portal;else el('detailPortal').style.display='none';
el('detailNotice').href=portal;
var tagText=tags.join(' ').toLowerCase(),rules=[];
if(/class 10|matriculation/.test(tagText))rules.push('Class 10 / matriculation route may apply.');
if(/class 12|10\+2|higher-secondary/.test(tagText))rules.push('Class 12 / higher-secondary route may apply; subjects vary.');
if(/graduate|degree|officer/.test(tagText))rules.push('Recognised graduation may be required; degree and percentage rules vary.');
if(/engineering|btech|technical/.test(tagText))rules.push('Engineering / technical qualification may be required for the relevant route.');
if(/iti|trade/.test(tagText))rules.push('Relevant ITI / trade qualification may apply.');
if(/diploma/.test(tagText))rules.push('Relevant diploma may apply.');
el('detailEligibility').innerHTML=(rules.length?rules:['Eligibility is route-specific. Check the current official notification for education, age, nationality, physical / medical and other conditions.']).map(function(x){return '<p>• '+x+'</p>'}).join('')+(tags.length?'<div class="vx-detail-note">Directory tags: '+tags.join(' · ')+'</div>':'');
function date(v){if(!v)return null;var d=new Date(v);return isNaN(d)?null:d}
function fmt(v){var d=date(v);return d?d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):''}
function row(a,b){var f=fmt(b);return f?'<div class="vx-detail-date"><span>'+a+'</span><b>'+f+'</b></div>':''}
function score(item){var text=[item.title,item.organization,item.sourceName,item.summary].filter(Boolean).join(' ').toLowerCase(),words=title.toLowerCase().split(/[^a-z0-9]+/).filter(function(x){return x.length>2}),n=0;words.forEach(function(w){if(text.indexOf(w)>=0)n++});return n}
async function load(){
var urls=['https://vaani-notifications-api.harshitchaubey127.workers.dev/api/notifications','data/defence-notifications.json'];
for(var i=0;i<urls.length;i++){try{var r=await fetch(urls[i]+'?_='+Date.now(),{cache:'no-store'});if(!r.ok)continue;var d=await r.json();if(d&&Array.isArray(d.items))return d.items}catch(e){}}
return [];
}
load().then(function(items){
var best=items.map(function(x){return {x:x,s:score(x)}}).sort(function(a,b){return b.s-a.s})[0];
if(!best||best.s<1){el('detailDates').textContent='No matching live notification is currently in VAANI’s feed. Check the official portal for the latest dates.';el('detailStatus').textContent='No current notification was confidently matched to this pathway.';return}
var x=best.x,app=x.applicationStartDate||x.applicationStart||x.startDate,end=x.lastDate||x.applicationEndDate||x.applicationEnd||x.endDate,exam=x.examDate||x.examinationDate,notice=x.notificationDate||x.publishedAt||x.date,fee=x.feePaymentLastDate;
var out=row('Notification date',notice)+row('Application opens',app)+row('Application deadline',end)+row('Fee payment deadline',fee)+row('Exam date',exam);
el('detailDates').innerHTML=out||'The matched notice does not currently expose date fields. Open the official notice.';
if(x.url||x.sourceUrl)el('detailNotice').href=x.url||x.sourceUrl;
el('detailStatus').innerHTML='<strong>'+String(x.title||title)+'</strong><br>'+(x.summary||'A matching notification was found in the current feed.');
});
})();