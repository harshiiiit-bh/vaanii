/* VAANI Grammar Studio: compact daily drills, four-part error scanner and subtopic micro-lessons. */
(function(){
  'use strict';
  var DRILLS=[
    {q:'Each of the cadets ___ a separate locker.',opts:['have','has','are having','were'],ans:1,exp:'Each is grammatically singular here, so it takes has.'},
    {q:'The flight was delayed ___ heavy rain.',opts:['because','due to','although','despite of'],ans:1,exp:'Due to is followed by a noun phrase: due to heavy rain.'},
    {q:'No sooner had the signal sounded ___ the cadets assembled.',opts:['when','then','than','that'],ans:2,exp:'The standard correlative pair is no sooner … than.'},
    {q:'She has been preparing ___ January.',opts:['for','from','since','by'],ans:2,exp:'Since introduces a starting point; January is the starting point.'},
    {q:'The instructor, along with two trainers, ___ present.',opts:['were','are','have been','was'],ans:3,exp:'The subject is instructor. Along with two trainers does not change its number.'},
    {q:'He is senior ___ me in the service.',opts:['than','to','from','with'],ans:1,exp:'Senior, junior, superior and inferior are normally followed by to.'},
    {q:'The information ___ available on the noticeboard.',opts:['are','were','is','have been'],ans:2,exp:'Information is an uncountable singular noun, so use is.'}
  ];
  var SCANS=[
    {parts:['Each of the officers','have submitted','their reports','before the briefing.'],bad:'B',why:'Each is singular. The verb should be has submitted (or have only when the subject is plural).'},
    {parts:['The cadet is','senior than','his batchmate','in service.'],bad:'B',why:'Senior takes to, not than: senior to his batchmate.'},
    {parts:['No sooner had','the signal sounded','when the pilots','took their positions.'],bad:'C',why:'Use no sooner … than. The corrected phrase is “than the pilots”.'},
    {parts:['The equipment','were checked','before the cadets','left the base.'],bad:'B',why:'Equipment is uncountable and treated as singular here: was checked.'},
    {parts:['The team has','completed its drill','and it is ready','for inspection.'],bad:'E',why:'No error: team is treated as one unit, and has / its / is agree with it.'}
  ];
  var RULES=[
    {id:'sva-each',name:'Each, every, either & neither',topic:'Subject–verb agreement',rule:'Each, every, either and neither are normally singular when they are the subject. In “either of / neither of”, formal exam grammar also expects a singular verb.',good:'Neither of the answers is correct.',bad:'Neither of the answers are correct.',trap:'Do not let a nearby plural noun (“answers”) pull the verb away from the real subject.',core:'sva',q:'Neither of the candidates ___ late.',opts:['are','were','is','have been'],ans:2,exp:'Neither is singular in this sentence, so is is expected.'},
    {id:'sva-phrase',name:'Along with / as well as',topic:'Subject–verb agreement',rule:'Phrases such as along with, together with, as well as and in addition to do not make a singular subject plural. Match the verb to the main subject.',good:'The captain, along with the cadets, is ready.',bad:'The captain, along with the cadets, are ready.',trap:'Temporarily ignore the phrase between commas and find the main subject.',core:'sva',q:'The officer, as well as the trainees, ___ present.',opts:['are','is','have','were'],ans:1,exp:'Officer is the main subject; the interrupting phrase does not change it.'},
    {id:'tense-since',name:'Since vs for',topic:'Tense signals',rule:'Since points to when an action began (since Monday). For states how long it has continued (for three days). With a continuing action, use the present perfect or present perfect continuous as appropriate.',good:'They have trained here for six months.',bad:'They have trained here since six months.',trap:'A duration is not a starting point. “Six months” needs for.',core:'tenses',q:'The cadets have been at the academy ___ July.',opts:['for','since','from','during'],ans:1,exp:'July is a point in time, so since is correct.'},
    {id:'inversion',name:'No sooner / hardly / scarcely',topic:'Inversion & connectors',rule:'Common exam pairs: no sooner … than; hardly/scarcely … when (or before). When these expressions begin a clause, auxiliary–subject inversion is used.',good:'Hardly had the briefing begun when the alarm rang.',bad:'Hardly had the briefing begun than the alarm rang.',trap:'Memorise the pair, not just the first word: no sooner–than; hardly/scarcely–when.',core:'sentence-structure',q:'Hardly had the cadets arrived ___ it began to rain.',opts:['than','when','then','that'],ans:1,exp:'Hardly pairs with when in the standard construction.'},
    {id:'prep-senior',name:'Senior / junior / superior / inferior',topic:'Fixed prepositions',rule:'These adjectives are conventionally followed by to when making a comparison. Avoid than after senior, junior, superior and inferior.',good:'This model is superior to the previous one.',bad:'This model is superior than the previous one.',trap:'Do not apply the ordinary comparative pattern “taller than” to these fixed forms.',core:'preposition',q:'This route is inferior ___ the northern route.',opts:['than','from','to','with'],ans:2,exp:'Inferior is followed by to.'},
    {id:'gerund',name:'Gerund or infinitive',topic:'Verb patterns',rule:'Some verbs are followed by a gerund (-ing), such as avoid, enjoy and consider. Others take an infinitive (to + verb), such as decide, hope and plan. A few change meaning with the pattern.',good:'They decided to wait and avoided making noise.',bad:'They decided waiting and avoided to make noise.',trap:'Learn verb + pattern as a pair; do not choose based only on how a phrase sounds.',core:'gerunds-infinitives',q:'The cadet avoided ___ the instruction.',opts:['to ignore','ignore','ignoring','ignored'],ans:2,exp:'Avoid is followed by a gerund: ignoring.'},
    {id:'parallel',name:'Parallel structure',topic:'Sentence clarity',rule:'Items joined in a series or paired construction should follow the same grammatical pattern. Keep verbs, nouns or clauses in a consistent form.',good:'The course teaches reading, writing and speaking.',bad:'The course teaches reading, to write and speaking.',trap:'Check every item in a list against the grammatical form of the first item.',core:'parallelism',q:'Choose the parallel sentence.',opts:['She likes reading, to write and speaking.','She likes reading, writing and speaking.','She likes to read, writing and to speak.','She likes read, writing and speaking.'],ans:1,exp:'All three items are gerunds: reading, writing and speaking.'},
    {id:'articles',name:'Articles with unique references',topic:'Articles & determiners',rule:'Use the when a noun is identified as unique or specific in context: the sun, the Earth, the principal of our school. General plural or uncountable nouns can take no article.',good:'The Earth moves around the Sun.',bad:'Earth moves around Sun. (when referring to the unique celestial bodies)',trap:'Do not add the automatically before every plural or uncountable noun.',core:'articles',q:'Choose the standard form.',opts:['Sun gives us light.','The sun gives us light.','A sun gives us light.','An sun gives us light.'],ans:1,exp:'The is conventionally used for the unique star in our solar system.'}
  ];
  var tab='drill',drillIndex=0,drillPractice=false,drillAnswered=false,drillChoice=-1;
  var sprint=false,sprintStep=0,sprintScore=0,sprintAnswered=false,sprintChoice=-1;
  var scanIndex=0,scanAnswered=false,scanChoice='',ruleId=RULES[0].id,ruleAnswered=false,ruleChoice=-1;
  var letters=['A','B','C','D'];
  function el(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function dayKey(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function seed(){var p=dayKey().split('-').map(Number);return Math.floor((Date.UTC(p[0],p[1]-1,p[2])-Date.UTC(p[0],0,1))/86400000);}
  function store(){
    if(typeof State==='undefined')return {attempts:0,correct:0,bestSprint:0,mistakes:[],dailyDate:'',dailyDone:false,dailyCorrect:null};
    if(!State.grammarStudio||typeof State.grammarStudio!=='object'||Array.isArray(State.grammarStudio))State.grammarStudio={};
    var s=State.grammarStudio;
    s.attempts=Number.isFinite(Number(s.attempts))?Math.max(0,Number(s.attempts)):0;
    s.correct=Number.isFinite(Number(s.correct))?Math.max(0,Number(s.correct)):0;
    s.bestSprint=Number.isFinite(Number(s.bestSprint))?Math.max(0,Number(s.bestSprint)):0;
    s.mistakes=Array.isArray(s.mistakes)?s.mistakes.filter(function(x){return x&&typeof x==='object';}):[];
    return s;
  }
  function dailyDone(s){return !!s&&s.dailyDate===dayKey()&&s.dailyDone===true;}
  function syncStats(){
    var s=store(),accuracy=s.attempts?Math.round(s.correct/s.attempts*100):0;
    var stats=el('gtStudioStats');if(!stats)return;
    stats.innerHTML='<div class="gt-studio-stat"><b>'+s.attempts+'</b><span>Attempts</span></div><div class="gt-studio-stat"><b>'+accuracy+'%</b><span>Accuracy</span></div><div class="gt-studio-stat"><b>'+s.bestSprint+'/5</b><span>Best sprint</span></div>';
  }
  function save(){if(typeof saveState==='function')saveState();}
  function record(ok,type,ref,prompt,chosen,correct){
    var s=store();s.attempts+=1;if(ok)s.correct+=1;
    if(!ok){s.mistakes.unshift({type:type,ref:ref,prompt:String(prompt||''),chosen:String(chosen||''),correct:String(correct||''),at:Date.now()});s.mistakes=s.mistakes.slice(0,12);}
    save();syncStats();
  }
  function optionHTML(opts,selected,answer,done,attr){
    return '<div class="gt-studio-options">'+opts.map(function(o,i){
      var cls='gt-studio-option',isAnswer=done&&i===answer,isWrong=done&&i===selected&&i!==answer;
      if(isAnswer)cls+=' is-correct';if(isWrong)cls+=' is-wrong';
      return '<button type="button" class="'+cls+'" data-'+attr+'="'+i+'" '+(done?'disabled':'')+'><span class="gts-option-key">'+letters[i%4]+'</span><span>'+esc(o)+'</span></button>';
    }).join('')+'</div>';
  }
  function feedback(ok,exp){
    return '<div class="gt-studio-feedback '+(ok?'good':'bad')+'" role="status"><strong>'+(ok?'Correct.':'Not quite.')+'</strong> '+esc(exp)+'</div>';
  }
  function renderDrill(){
    var panel=el('gtStudioPanel');if(!panel)return;
    var s=store();
    if(sprint){
      if(sprintStep>=5){
        s.bestSprint=Math.max(s.bestSprint,sprintScore);save();syncStats();
        panel.innerHTML='<div class="gt-drill-card"><span class="gt-mode-chip">Sprint complete</span><h4 class="gt-drill-question">You scored '+sprintScore+' / 5</h4><p class="gt-studio-feedback good">A quick review now helps turn a correct answer into a lasting rule. Your best sprint is '+s.bestSprint+'/5.</p><div class="gt-studio-actions"><button class="gt-studio-action primary" type="button" data-gts-sprint-retry>Run it again</button><button class="gt-studio-action" type="button" data-gts-tab="mistakes">Review mistakes</button></div></div>';
        return;
      }
      var sq=DRILLS[(seed()+sprintStep)%DRILLS.length];
      panel.innerHTML='<div class="gt-drill-card"><div class="gt-drill-top"><span class="gt-mode-chip">5-question sprint · '+(sprintStep+1)+' of 5</span><span class="gt-drill-count">'+sprintScore+' correct so far</span></div><div class="gt-studio-progress"><span style="width:'+((sprintStep+(sprintAnswered?1:0))/5*100)+'%"></span></div><h4 class="gt-drill-question">'+esc(sq.q)+'</h4>'+optionHTML(sq.opts,sprintChoice,sq.ans,sprintAnswered,'gts-sprint-option')+(sprintAnswered?feedback(sprintChoice===sq.ans,sq.exp):'')+'<div class="gt-studio-actions">'+(sprintAnswered?'<button class="gt-studio-action primary" type="button" data-gts-sprint-next>'+(sprintStep===4?'See results':'Next question →')+'</button>':'<span class="gt-drill-count">Choose an answer to continue.</span>')+' <button class="gt-studio-action" type="button" data-gts-sprint-exit>Exit sprint</button></div></div>';
      return;
    }
    var idx=drillIndex%DRILLS.length,q=DRILLS[idx],isDaily=!drillPractice&&!dailyDone(s);
    var already=dailyDone(s)&&!drillPractice;
    var tag=isDaily?'Today’s challenge':(already?'Daily challenge completed':'Rapid practice');
    var html='<div class="gt-drill-card"><div class="gt-drill-top"><span class="gt-mode-chip">'+tag+'</span><span class="gt-drill-count">QUESTION '+(idx+1)+' / '+DRILLS.length+'</span></div><h4 class="gt-drill-question">'+esc(q.q)+'</h4>'+optionHTML(q.opts,drillChoice,q.ans,drillAnswered,'gts-drill-option');
    if(drillAnswered)html+=feedback(drillChoice===q.ans,q.exp);
    if(already)html+='<div class="gt-studio-feedback">Your daily challenge is already logged. Keep practising below.</div>';
    html+='<div class="gt-studio-actions">'+(drillAnswered?'<button class="gt-studio-action primary" type="button" data-gts-drill-next>Next question →</button>':'<span class="gt-drill-count">Select an option to reveal the explanation.</span>')+'<button class="gt-studio-action" type="button" data-gts-sprint-start>Launch 5-question sprint</button></div></div>';
    panel.innerHTML=html;
  }
  function renderScanner(){
    var panel=el('gtStudioPanel');if(!panel)return;
    var q=SCANS[scanIndex%SCANS.length],correct=q.bad==='E'?4:letters.indexOf(q.bad);
    var html='<div class="gt-scan-card"><div class="gt-scan-top"><span class="gt-mode-chip">Sentence scanner · exam format</span><span class="gt-drill-count">CASE '+(scanIndex%SCANS.length+1)+' / '+SCANS.length+'</span></div><p class="gt-drill-question">Find the part that contains an error. Choose A–D, or select No error.</p><div class="gt-scan-parts">';
    q.parts.forEach(function(p,i){
      var key=letters[i],cls='gt-scan-part';
      if(scanAnswered&&correct===i)cls+=' is-correct';
      if(scanAnswered&&scanChoice===key&&correct!==i)cls+=' is-wrong';
      html+='<button type="button" class="'+cls+'" data-gts-scan="'+key+'" '+(scanAnswered?'disabled':'')+'><b>'+key+'</b><span>'+esc(p)+'</span></button>';
    });
    html+='<button type="button" class="gt-scan-part no-error'+(scanAnswered&&correct===4?' is-correct':'')+(scanAnswered&&scanChoice==='E'&&correct!==4?' is-wrong':'')+'" data-gts-scan="E" '+(scanAnswered?'disabled':'')+'>No error</button></div>';
    if(scanAnswered)html+=feedback(scanChoice===q.bad,q.why);
    html+='<div class="gt-studio-actions">'+(scanAnswered?'<button class="gt-studio-action primary" type="button" data-gts-scan-next>Next sentence →</button>':'<span class="gt-drill-count">Read all four parts before deciding.</span>')+'</div></div>';
    panel.innerHTML=html;
  }
  function renderRules(){
    var panel=el('gtStudioPanel');if(!panel)return;
    var rule=RULES.find(function(x){return x.id===ruleId;})||RULES[0];
    var html='<div class="gt-rule-layout"><div class="gt-rule-list" aria-label="Choose a micro-lesson">';
    RULES.forEach(function(r){html+='<button type="button" class="gt-rule-choice" data-gts-rule="'+r.id+'" aria-pressed="'+(rule.id===r.id)+'">'+esc(r.name)+'</button>';});
    html+='</div><div class="gt-rule-detail"><span class="gt-mode-chip">'+esc(rule.topic)+'</span><h4>'+esc(rule.name)+'</h4><span class="gt-rule-label">Rule in a nutshell</span><p>'+esc(rule.rule)+'</p><span class="gt-rule-label">Correct pattern</span><div class="gt-rule-example">'+esc(rule.good)+'</div><span class="gt-rule-label">Common exam trap</span><p>'+esc(rule.trap)+'</p><span class="gt-rule-label">Quick check</span><p>'+esc(rule.q)+'</p>'+optionHTML(rule.opts,ruleChoice,rule.ans,ruleAnswered,'gts-rule-option');
    if(ruleAnswered)html+=feedback(ruleChoice===rule.ans,rule.exp);
    html+='<div class="gt-studio-actions">'+(ruleAnswered?'<button class="gt-studio-action primary" type="button" data-gts-rule-reset>Try again</button>':'<span class="gt-drill-count">Test the rule before moving on.</span>')+'<button class="gt-studio-action" type="button" data-gts-open-core="'+rule.core+'">Open full lesson ↗</button></div></div></div>';
    panel.innerHTML=html;
  }
  function renderMistakes(){
    var panel=el('gtStudioPanel'),s=store();if(!panel)return;
    if(!s.mistakes.length){panel.innerHTML='<div class="gt-empty-mistakes">No mini-lab mistakes saved yet. Complete a drill or scan a sentence and any missed answer will appear here for review.</div>';return;}
    panel.innerHTML='<div class="gt-mistake-list">'+s.mistakes.map(function(m,i){
      return '<div class="gt-mistake-card"><strong>'+esc(m.prompt||'Practice question')+'</strong><p>Your answer: <span style="color:#ffc0c0">'+esc(m.chosen||'—')+'</span><br>Review: <span style="color:#a3edc1">'+esc(m.correct||'—')+'</span></p><button type="button" class="gt-studio-action" data-gts-retry="'+i+'">Retry this item ↗</button></div>';
    }).join('')+'</div>';
  }
  function render(){
    syncStats();
    var panel=el('gtStudioPanel');if(!panel)return;
    if(tab==='drill')renderDrill();
    else if(tab==='scanner')renderScanner();
    else if(tab==='rules')renderRules();
    else renderMistakes();
    document.querySelectorAll('#gtStudioLab [data-gts-tab]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.gtsTab===tab));});
  }
  function setTab(next){tab=next;render();}
  function retry(m){
    if(!m)return;
    if(m.type==='scanner'){tab='scanner';scanIndex=Number(m.ref)||0;scanAnswered=false;scanChoice='';}
    else if(m.type==='rule'){tab='rules';ruleId=String(m.ref||RULES[0].id);ruleAnswered=false;ruleChoice=-1;}
    else{tab='drill';sprint=false;drillIndex=Number(m.ref)||0;drillPractice=true;drillAnswered=false;drillChoice=-1;}
    render();
    var lab=el('gtStudioLab');if(lab)lab.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  function init(){
    var lab=el('gtStudioLab');if(!lab||lab.dataset.ready==='1')return;
    lab.dataset.ready='1';
    lab.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b||!lab.contains(b))return;
      if(b.dataset.gtsTab){setTab(b.dataset.gtsTab);return;}
      if(b.hasAttribute('data-gts-drill-option')){
        if(drillAnswered)return;
        drillChoice=Number(b.dataset.gtsDrillOption);drillAnswered=true;
        var q=DRILLS[drillIndex%DRILLS.length],ok=drillChoice===q.ans,s=store();
        if(!drillPractice&&!dailyDone(s)){s.dailyDate=dayKey();s.dailyDone=true;s.dailyCorrect=ok;}
        record(ok,'drill',drillIndex,q.q,q.opts[drillChoice],q.opts[q.ans]);render();return;
      }
      if(b.hasAttribute('data-gts-next')){
        drillIndex=(drillIndex+1)%DRILLS.length;drillPractice=true;drillAnswered=false;drillChoice=-1;render();return;
      }
      if(b.hasAttribute('data-gts-sprint-start')){
        sprint=true;sprintStep=0;sprintScore=0;sprintAnswered=false;sprintChoice=-1;render();return;
      }
      if(b.hasAttribute('data-gts-sprint-option')){
        if(sprintAnswered)return;
        sprintChoice=Number(b.dataset.gtsSprintOption);sprintAnswered=true;
        var sq=DRILLS[(seed()+sprintStep)%DRILLS.length],sok=sprintChoice===sq.ans;
        if(sok)sprintScore++;
        record(sok,'drill',(seed()+sprintStep)%DRILLS.length,sq.q,sq.opts[sprintChoice],sq.opts[sq.ans]);render();return;
      }
      if(b.hasAttribute('data-gts-sprint-next')){
        sprintStep++;sprintAnswered=false;sprintChoice=-1;render();return;
      }
      if(b.hasAttribute('data-gts-sprint-retry')){
        sprint=true;sprintStep=0;sprintScore=0;sprintAnswered=false;sprintChoice=-1;render();return;
      }
      if(b.hasAttribute('data-gts-sprint-exit')){sprint=false;drillAnswered=false;render();return;}
      if(b.hasAttribute('data-gts-scan')){
        if(scanAnswered)return;
        scanChoice=b.dataset.gtsScan;scanAnswered=true;
        var scan=SCANS[scanIndex%SCANS.length],expected=scan.bad==='E'?'No error':'Part '+scan.bad;
        var chosen=scanChoice==='E'?'No error':'Part '+scanChoice;
        record(scanChoice===scan.bad,'scanner',scanIndex,scan.parts.join(' / '),chosen,expected);render();return;
      }
      if(b.hasAttribute('data-gts-scan-next')){scanIndex=(scanIndex+1)%SCANS.length;scanAnswered=false;scanChoice='';render();return;}
      if(b.hasAttribute('data-gts-rule')){
        ruleId=b.dataset.gtsRule;ruleAnswered=false;ruleChoice=-1;render();return;
      }
      if(b.hasAttribute('data-gts-rule-option')){
        if(ruleAnswered)return;
        ruleChoice=Number(b.dataset.gtsRuleOption);ruleAnswered=true;
        var r=RULES.find(function(x){return x.id===ruleId;})||RULES[0];
        record(ruleChoice===r.ans,'rule',r.id,r.q,r.opts[ruleChoice],r.opts[r.ans]);render();return;
      }
      if(b.hasAttribute('data-gts-rule-reset')){ruleAnswered=false;ruleChoice=-1;render();return;}
      if(b.hasAttribute('data-gts-open-core')){
        if(typeof openTopic==='function')openTopic(b.dataset.gtsOpenCore);return;
      }
      if(b.hasAttribute('data-gts-retry')){
        var idx=Number(b.dataset.gtsRetry),s=store();retry(s.mistakes[idx]);return;
      }
    });
    render();
  }
  window.gtStudioGo=function(which){
    var lab=el('gtStudioLab');if(!lab)return;
    setTab(which==='drill'?'drill':which);
    lab.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();