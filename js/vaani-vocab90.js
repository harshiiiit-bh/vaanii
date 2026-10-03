/* VAANI · native 90-day vocabulary course */
(function(global){
 'use strict';
 var course=null,coursePromise=null,mode='day',selectedDay=1,phase=0,booted=false,searchTimer=null,searchSequence=0;
 var labels={oneword:'One-word substitutions',idioms:'Idioms & phrases',series:'Word series',verbal:'Verbal phrases',prep:'Fixed prepositions',cloze:'Cloze-test vocabulary',other:'Additional study material'};
 function stateMap(key){try{if(typeof State==='undefined'||!State)return{};if(!State[key]||typeof State[key]!=='object'||Array.isArray(State[key]))State[key]={};return State[key];}catch(e){return{};}}
 function isComplete(n){return stateMap('vocab90Completed')[String(n)]===true;}
 function completedCount(){var m=stateMap('vocab90Completed');return Object.keys(m).filter(function(k){var n=Number(k);return Number.isInteger(n)&&n>=1&&n<=90&&String(n)===k&&m[k]===true;}).length;}
 function pad(n){return String(n).padStart(2,'0');}
 function setText(id,value){var n=document.getElementById(id);if(n)n.textContent=value;}
 function fail(e){var n=document.getElementById('v90LoadError');if(n){n.hidden=false;n.textContent='The vocabulary course could not be loaded. Check your connection and refresh. '+String(e&&e.message||'');}}
 function clearError(){var n=document.getElementById('v90LoadError');if(n){n.hidden=true;n.textContent='';}}
 function loadCourse(){
   if(course)return Promise.resolve(course);if(coursePromise)return coursePromise;
   coursePromise=global.fetch('./data/vocab90/course.json?v=20261003-structured1',{cache:'no-cache'})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(rows){
      if(!Array.isArray(rows)||rows.length!==90)throw new Error('Course data must contain exactly 90 days.');
      for(var i=0;i<90;i++)if(!rows[i]||rows[i].day!==i+1||!Array.isArray(rows[i].sections)||!rows[i].sections.length)throw new Error('Invalid lesson data at Day '+(i+1)+'.');
      course=rows;coursePromise=null;return course;
    }).catch(function(e){coursePromise=null;throw e;});
   return coursePromise;
 }
 function dayData(n){return course&&course[n-1]&&course[n-1].day===n?course[n-1]:null;}
 function progress(){
   var n=completedCount(),pct=Math.round(n/90*100),remaining=90-n;
   setText('v90ProgressCount',n+' / 90');setText('v90ProgressPercent',pct+'% complete');
   setText('v90Remaining',remaining+(remaining===1?' day remaining':' days remaining'));
   var bar=document.getElementById('v90ProgressBar'),fill=document.getElementById('v90ProgressFill');
   if(bar)bar.setAttribute('aria-valuenow',String(n));if(fill)fill.style.width=pct+'%';
   var reset=document.getElementById('v90ResetProgress');if(reset)reset.disabled=n===0;
 }
 function renderPhases(){
   document.querySelectorAll('[data-v90-phase]').forEach(function(b){b.setAttribute('aria-pressed',Number(b.dataset.v90Phase)===phase?'true':'false');});
   setText('v90PhaseCount',pad(phase*30+1)+'–'+pad(Math.min(90,(phase+1)*30)));
 }
 function renderGrid(){
   var host=document.getElementById('v90DayGrid');if(!host)return;host.replaceChildren();
   for(var n=phase*30+1;n<=Math.min(90,(phase+1)*30);n++){
     var done=isComplete(n),button=document.createElement('button');
     button.type='button';button.className='v90-day'+(n===selectedDay?' is-selected':'')+(done?' is-done':'');
     button.dataset.v90Select=String(n);button.setAttribute('aria-pressed',n===selectedDay?'true':'false');
     button.setAttribute('aria-label','Day '+pad(n)+(done?', completed':'')+(n===selectedDay?', selected':''));
     var number=document.createElement('span');number.className='v90-day-num';number.textContent=pad(n);button.appendChild(number);
     if(done){var check=document.createElement('span');check.className='v90-day-check';check.setAttribute('aria-hidden','true');check.textContent='✓';button.appendChild(check);}
     host.appendChild(button);
   }
 }
 function compactText(value){return String(value==null?'':value).replace(/\s+/g,' ').trim();}
 function parseOneWordRows(value){
   var source=compactText(value),expression=/([A-Z][A-Za-z'’.-]*(?:\s+[a-z][A-Za-z'’.-]*)?)\s*\(([^)]*[\u0900-\u097F][^)]*)\)/g;
   var rows=[],cursor=0,match;
   while((match=expression.exec(source))){
     var definition=source.slice(cursor,match.index).trim();
     var word=String(match[1]||'').trim().replace(/([A-Za-z]{5,})\s+([a-z])$/,'$1$2');
     var hindi=String(match[2]||'').trim();
     if(!definition||!word||!hindi)return null;
     rows.push({definition:definition,word:word,hindi:hindi});
     cursor=expression.lastIndex;
   }
   if(rows.length<15||rows.length>24||source.slice(cursor).trim())return null;
   return rows;
 }
 function anchoredLayout(value,key){
   var config={
     idioms:{pattern:/(?:^|\n)\s*([A-Z][^\n]{1,90}?)\s+[–—-]\s*(?=[\u0900-\u097F(])/g,min:8,max:24},
     series:{pattern:/([A-Z][A-Z'’]{1,27})\s*[-–—\u00ad\ufffd￾]+\s*(?=[\s\u0900-\u097F])/g,min:6,max:22},
     verbal:{pattern:/([A-Z][a-zA-Z'’]*(?:\s+[a-z][a-zA-Z'’]*){0,4}(?:\s+\([^)]{1,30}\))?)\s*[-–—]\s*(?=To\b|\()/g,min:3,max:8},
     prep:{pattern:/([A-Z][a-z]+(?:\s+[a-z]+){0,3}(?:\s*\([^)]{1,20}\))?)\s*[-–—]\s*(?=\()/g,min:3,max:8},
     cloze:{pattern:/(?:^|\n)\s*(\d{1,2})\s+(?=[A-Z])/g,min:1,max:6}
   }[key];
   if(!config)return null;
   var source=String(value==null?'':value).replace(/\r\n?/g,'\n'),expression=new RegExp(config.pattern.source,config.pattern.flags);
   var matches=[],match;
   while((match=expression.exec(source))){
     var title=String(match[1]||'').trim().replace(/\s+/g,' ');
     var start=match.index+match[0].indexOf(match[1]);
     var bodyStart=expression.lastIndex;
     var separator=source.slice(start+String(match[1]).length,bodyStart).trim();
     if(!title||start<0)continue;
     matches.push({title:title,start:start,bodyStart:bodyStart,separator:separator});
   }
   if(matches.length<config.min||matches.length>config.max)return null;
   var cards=matches.map(function(item,index){
     var end=index+1<matches.length?matches[index+1].start:source.length;
     return {title:key==='cloze'?'Set '+item.title:item.title,separator:item.separator,body:source.slice(item.bodyStart,end).trim()};
   });
   return {prefix:source.slice(0,matches[0].start).trim(),cards:cards};
 }
 function addPlainText(host,className,value){
   var node=document.createElement('div');node.className=className;node.textContent=String(value||'').replace(/\r\n?/g,'\n').trim();host.appendChild(node);return node;
 }
 function makeOneWordTable(rows){
   var wrap=document.createElement('div');wrap.className='v90-entry-layout v90-oneword-layout';
   var scroller=document.createElement('div');scroller.className='v90-entry-table-wrap';
   var table=document.createElement('table');table.className='v90-entry-table v90-oneword-table';
   table.setAttribute('aria-label','One-word substitutions: definitions and answers');
   var caption=document.createElement('caption');caption.textContent='Definition and matching one-word answer';table.appendChild(caption);
   var thead=document.createElement('thead'),tr=document.createElement('tr');
   ['Description','Answer'].forEach(function(label){var th=document.createElement('th');th.scope='col';th.textContent=label;tr.appendChild(th);});
   thead.appendChild(tr);table.appendChild(thead);
   var tbody=document.createElement('tbody');
   rows.forEach(function(row){
     var line=document.createElement('tr'),definition=document.createElement('td');
     definition.className='v90-definition-cell';definition.textContent=row.definition;
     var answer=document.createElement('td'),word=document.createElement('strong'),hindi=document.createElement('small');
     answer.className='v90-answer-cell';word.className='v90-entry-word';word.lang='en';word.textContent=row.word;
     hindi.className='v90-entry-hindi';hindi.lang='hi';hindi.textContent='('+row.hindi+')';
     answer.appendChild(word);answer.appendChild(hindi);line.appendChild(definition);line.appendChild(answer);tbody.appendChild(line);
   });
   table.appendChild(tbody);scroller.appendChild(table);wrap.appendChild(scroller);return wrap;
 }
 function makeAnchoredCards(layout,key){
   var wrap=document.createElement('div');wrap.className='v90-entry-layout v90-'+key+'-layout';
   if(layout.prefix)addPlainText(wrap,'v90-entry-prefix',layout.prefix);
   var grid=document.createElement('div');grid.className='v90-entry-grid v90-'+key+'-grid';
   layout.cards.forEach(function(entry){
     var card=document.createElement('article');card.className='v90-entry-card';
     var head=document.createElement('div');head.className='v90-entry-card-head';
     var title=document.createElement('h5');title.className='v90-entry-card-title';title.textContent=entry.title;head.appendChild(title);
     if(entry.separator){var separator=document.createElement('span');separator.className='v90-entry-card-separator';separator.textContent=entry.separator;head.appendChild(separator);}
     card.appendChild(head);if(entry.body)addPlainText(card,'v90-entry-card-body',entry.body);grid.appendChild(card);
   });
   wrap.appendChild(grid);return wrap;
 }
 function makeSection(s){
   var card=document.createElement('article');card.className='v90-section-card';
   var head=document.createElement('div');head.className='v90-section-head';var title=document.createElement('h4');
   title.textContent=s.title||labels[s.key]||labels.other;head.appendChild(title);
   card.appendChild(head);var body=document.createElement('div');body.className='v90-section-content';
   if(s.key==='oneword'){
     var rows=parseOneWordRows(s.text);
     if(rows)body.appendChild(makeOneWordTable(rows));
     else addPlainText(body,'v90-transcript',s.text);
   }else{
     var layout=anchoredLayout(s.text,s.key);
     if(layout)body.appendChild(makeAnchoredCards(layout,s.key));
     else addPlainText(body,'v90-transcript',s.text);
   }
   card.appendChild(body);return card;
 }
 function makeCompletionButton(n){
   var done=isComplete(n),b=document.createElement('button');b.type='button';b.className='v90-complete'+(done?' is-done':'');
   b.dataset.v90Complete=String(n);b.setAttribute('aria-pressed',done?'true':'false');
   b.textContent=done?'✓ Completed · Undo':'Mark complete · +10 XP';return b;
 }
 function syncCompletion(n){
   var done=isComplete(n);
   document.querySelectorAll('[data-v90-complete="'+n+'"]').forEach(function(b){b.classList.toggle('is-done',done);b.setAttribute('aria-pressed',done?'true':'false');b.textContent=done?'✓ Completed · Undo':'Mark complete · +10 XP';});
   var article=document.querySelector('[data-v90-article="'+n+'"]');if(article)article.classList.toggle('is-completed',done);
   if(n===selectedDay){
     var status=document.getElementById('v90SelectedStatus');if(status){status.classList.toggle('is-done',done);status.textContent=done?'COMPLETED':'NOT COMPLETED';}
     var selected=document.getElementById('v90MarkDone');if(selected){selected.dataset.v90Complete=String(n);selected.classList.toggle('is-done',done);selected.setAttribute('aria-pressed',done?'true':'false');selected.textContent=done?'✓ Completed · Undo':'Mark day complete · +10 XP';}
   }
   var tile=document.querySelector('[data-v90-select="'+n+'"]');
   if(tile){tile.classList.toggle('is-done',done);var check=tile.querySelector('.v90-day-check');if(done&&!check){check=document.createElement('span');check.className='v90-day-check';check.setAttribute('aria-hidden','true');check.textContent='✓';tile.appendChild(check);}if(!done&&check)check.remove();}
 }
 function showSelectedDay(){
   var day=dayData(selectedDay),pages=day&&Array.isArray(day.sourcePages)?day.sourcePages:[];
   setText('v90SelectedKicker','DAY '+pad(selectedDay)+(selectedDay===1?' · START HERE':' · STUDY SESSION'));
   setText('v90SelectedTitle','Day '+pad(selectedDay));
   setText('v90SelectedMeta',((day&&day.sections)||[]).length+' sections · '+(pages.length?'PDF pages '+Math.min.apply(null,pages)+'–'+Math.max.apply(null,pages):'study material'));
   var previous=document.getElementById('v90PrevDay'),next=document.getElementById('v90NextDay');
   if(previous)previous.disabled=selectedDay<=1;if(next)next.disabled=selectedDay>=90;
   syncCompletion(selectedDay);
   var host=document.getElementById('v90DayContent');if(!host)return;host.replaceChildren();
   if(!day){var none=document.createElement('div');none.className='v90-no-results';none.textContent='No lesson content is available for this day.';host.appendChild(none);return;}
   (day.sections||[]).forEach(function(s){host.appendChild(makeSection(s));});
 }
 function selectDay(n){
   n=Number(n);if(!Number.isInteger(n)||n<1||n>90)return;
   selectedDay=n;phase=Math.floor((n-1)/30);renderPhases();renderGrid();clearError();
   setText('v90SelectedMeta','Loading study material…');var mark=document.getElementById('v90MarkDone');if(mark)mark.dataset.v90Complete=String(n);
   var host=document.getElementById('v90DayContent');if(host){host.replaceChildren();var loading=document.createElement('div');loading.className='v90-loading';loading.textContent='Loading Day '+pad(n)+'…';host.appendChild(loading);}
   loadCourse().then(function(){if(n===selectedDay)showSelectedDay();}).catch(fail);
 }
 function renderAll(){
   var host=document.getElementById('v90AllContent');if(!host)return;host.replaceChildren();
   var fragment=document.createDocumentFragment();
   course.forEach(function(day){
     var article=document.createElement('article');article.className='v90-day-article'+(isComplete(day.day)?' is-completed':'');article.dataset.v90Article=String(day.day);
     var head=document.createElement('div');head.className='v90-day-article-head';
     var group=document.createElement('div');group.className='v90-day-article-title';
     var num=document.createElement('span');num.className='v90-day-article-num';num.textContent=pad(day.day);group.appendChild(num);
     var titleBox=document.createElement('div');var title=document.createElement('h4');title.textContent='Day '+pad(day.day);titleBox.appendChild(title);
     var small=document.createElement('small');small.textContent=(day.sections||[]).length+' study sections';titleBox.appendChild(small);
     group.appendChild(titleBox);head.appendChild(group);head.appendChild(makeCompletionButton(day.day));article.appendChild(head);
     var body=document.createElement('div');body.className='v90-day-article-body';(day.sections||[]).forEach(function(s){body.appendChild(makeSection(s));});
     article.appendChild(body);fragment.appendChild(article);
   });
   host.appendChild(fragment);setText('v90AllCount',course.length+' lessons');progress();
 }
 function loadAll(){loadCourse().then(renderAll).catch(fail);}
 function searchCourse(value){
   var query=String(value||'').trim().toLowerCase(),results=document.getElementById('v90SearchResults');
   if(!results)return;
   var dayView=document.getElementById('v90DaywiseView'),allView=document.getElementById('v90AllView'),sequence=++searchSequence;
   if(!query){
     results.hidden=true;if(dayView)dayView.hidden=mode!=='day';if(allView)allView.hidden=mode!=='all';
     if(mode==='all')loadAll();else selectDay(selectedDay);return;
   }
   results.hidden=false;if(dayView)dayView.hidden=true;if(allView)allView.hidden=true;
   results.replaceChildren();var loading=document.createElement('div');loading.className='v90-loading';loading.textContent='Searching the full course…';results.appendChild(loading);
   loadCourse().then(function(){
     if(sequence!==searchSequence)return;
     results.replaceChildren();var heading=document.createElement('h3');heading.textContent='Search results';results.appendChild(heading);
     var hits=[];
     course.forEach(function(day){(day.sections||[]).forEach(function(section){
       var text=(section.title+' '+section.meta+' '+section.text).toLowerCase();if(text.indexOf(query)<0)return;
       var plain=String(section.text||'').replace(/\s+/g,' ').trim(),at=plain.toLowerCase().indexOf(query);if(at<0)at=0;
       var from=Math.max(0,at-75),to=Math.min(plain.length,at+query.length+125);
       hits.push({day:day.day,title:section.title,snippet:(from?'…':'')+plain.slice(from,to)+(to<plain.length?'…':'')});
     });});
     if(!hits.length){var none=document.createElement('div');none.className='v90-no-results';none.textContent='No matches found. Try another word or phrase.';results.appendChild(none);return;}
     hits.slice(0,150).forEach(function(hit){
       var card=document.createElement('article');card.className='v90-search-hit';var label=document.createElement('strong');label.textContent='Day '+pad(hit.day)+' · '+hit.title;card.appendChild(label);
       var excerpt=document.createElement('p');excerpt.textContent=hit.snippet;card.appendChild(excerpt);
       var button=document.createElement('button');button.type='button';button.dataset.v90OpenDay=String(hit.day);button.textContent='Open Day '+pad(hit.day)+' →';card.appendChild(button);results.appendChild(card);
     });
     if(hits.length>150){var note=document.createElement('p');note.className='v90-loading';note.textContent='Showing the first 150 matching sections.';results.appendChild(note);}
   }).catch(function(error){if(sequence===searchSequence){results.replaceChildren();fail(error);}});
 }
 function toggleCompletion(n){
   var completed=stateMap('vocab90Completed'),awarded=stateMap('vocab90XpAwarded'),key=String(n);
   if(completed[key]===true){delete completed[key];if(typeof saveState==='function')saveState();}
   else{
     var alreadyAwarded=awarded[key]===true;completed[key]=true;
     if(!alreadyAwarded){
       var before=(typeof State!=='undefined'&&Number.isFinite(Number(State.xp)))?Number(State.xp):0;awarded[key]=true;
       try{
         if(typeof addXP!=='function')throw new Error('VAANI XP service is unavailable.');
         var amount=addXP(10,'90-Day Vocabulary · Day '+pad(n));
         if(amount!==10&&Number(State.xp)===before){delete completed[key];delete awarded[key];if(typeof saveState==='function')saveState();}
       }catch(error){
         if(Number(State.xp)===before){delete completed[key];delete awarded[key];if(typeof saveState==='function')saveState();}
         console.error('[VAANI] Vocab90 XP award failed:',error);if(typeof toast==='function')toast('XP could not be awarded. Please try again.');
       }
     }else{
       if(typeof saveState==='function')saveState();
       if(typeof toast==='function')toast('Day '+pad(n)+' completed. XP was already claimed.');
     }
   }
   progress();syncCompletion(n);
 }
 function switchMode(next){
   mode=next==='all'?'all':'day';
   document.querySelectorAll('[data-v90-mode]').forEach(function(button){button.setAttribute('aria-pressed',button.dataset.v90Mode===mode?'true':'false');});
   var dayView=document.getElementById('v90DaywiseView'),allView=document.getElementById('v90AllView'),query=(document.getElementById('v90Search')||{}).value||'';
   if(query.trim()){searchCourse(query);return;}
   searchSequence++;clearError();if(dayView)dayView.hidden=mode!=='day';if(allView)allView.hidden=mode!=='all';
   if(mode==='all'){var host=document.getElementById('v90AllContent');if(host){host.replaceChildren();var wait=document.createElement('div');wait.className='v90-loading';wait.textContent='Loading all 90 days…';host.appendChild(wait);}loadAll();}
   else selectDay(selectedDay);
 }
 function bind(){
   if(booted||!document.getElementById('view-vocab90'))return;booted=true;
   document.querySelectorAll('[data-v90-mode]').forEach(function(button){button.addEventListener('click',function(){switchMode(button.dataset.v90Mode);});});
   document.querySelectorAll('[data-v90-phase]').forEach(function(button){button.addEventListener('click',function(){phase=Number(button.dataset.v90Phase)||0;renderPhases();renderGrid();});});
   var grid=document.getElementById('v90DayGrid');if(grid)grid.addEventListener('click',function(event){var button=event.target.closest('[data-v90-select]');if(button)selectDay(Number(button.dataset.v90Select));});
   var search=document.getElementById('v90Search');if(search)search.addEventListener('input',function(){if(searchTimer!==null)global.clearTimeout(searchTimer);var value=search.value;searchTimer=global.setTimeout(function(){searchCourse(value);},160);});
   var prev=document.getElementById('v90PrevDay'),next=document.getElementById('v90NextDay');if(prev)prev.addEventListener('click',function(){if(selectedDay>1)selectDay(selectedDay-1);});if(next)next.addEventListener('click',function(){if(selectedDay<90)selectDay(selectedDay+1);});
   var reset=document.getElementById('v90ResetProgress');if(reset)reset.addEventListener('click',function(){
     if(!completedCount())return;
     if(!global.confirm('Reset completed days? Earned XP will remain, and each day can reward XP only once.'))return;
     var map=stateMap('vocab90Completed');Object.keys(map).forEach(function(key){delete map[key];});
     if(typeof saveState==='function')saveState();progress();renderGrid();syncCompletion(selectedDay);
     if(typeof toast==='function')toast('90-day completion progress has been reset.');
   });
   document.addEventListener('click',function(event){
     var done=event.target.closest('[data-v90-complete]');
     if(done){event.preventDefault();toggleCompletion(Number(done.dataset.v90Complete));return;}
     var open=event.target.closest('[data-v90-open-day]');
     if(open){
       var input=document.getElementById('v90Search');if(input)input.value='';
       mode='day';document.querySelectorAll('[data-v90-mode]').forEach(function(button){button.setAttribute('aria-pressed',button.dataset.v90Mode==='day'?'true':'false');});
       var dayView=document.getElementById('v90DaywiseView'),allView=document.getElementById('v90AllView'),results=document.getElementById('v90SearchResults');
       if(dayView)dayView.hidden=false;if(allView)allView.hidden=true;if(results)results.hidden=true;
       searchSequence++;selectDay(Number(open.dataset.v90OpenDay));
     }
   });
   selectedDay=90;for(var n=1;n<=90;n++){if(!isComplete(n)){selectedDay=n;break;}}
   phase=Math.floor((selectedDay-1)/30);renderPhases();renderGrid();progress();
 }
 function open(){bind();progress();if(mode==='all')loadAll();else selectDay(selectedDay);}
 global.VAANI_VOCAB90={open:open,render:open};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})(window);
