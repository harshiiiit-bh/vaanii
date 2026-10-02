(function(){
  'use strict';
  const PAPERS = [
    {id:'cds-2009-I',year:2009,session:'I',title:'CDS I 2009',source:'https://examvictor.com/cds-2009-english-question-paper-1/',key:`D D A D C D D A C B B D D A B C A C A A D B A B D A B A B C C A C C B D D A B A C C B C A A A A B B D A C B A D C D B B B C C A D D B B A A C C B C B B C D B C C C D C D C D A D C A C B D D C D B D B D C B D B D B C B B B B D A C C B D B A`},
    {id:'cds-2009-II',year:2009,session:'II',title:'CDS II 2009',source:'https://examvictor.com/cds-2009-english-question-paper-2/',key:`D B C B C C A B C A B D D B B D D D A B A C B C D D C D D B B D D C D B B C D B A A B C B B A B C B B D C C D C C B C B B A A C C D B D B A C B C B D B B D D C B B B C B B C B D D A D B C A C C C C D C D D D B B C D A D A B C A B D D D C A`},
    {id:'cds-2010-I',year:2010,session:'I',title:'CDS I 2010',source:'https://examvictor.com/cds-2010-english-question-paper-1/',key:`A B D D C B D A D C D D D A D A C D C D D D B D A B D C B C A C B C C B C B C C A A A C C A B B C C B A C B C C C A C A A B B B D C C B B B D C C D B C C C B D C B D B B D D D C D C C A C D D D C A D D A C A C C C A B A C A B D B D B C A A`},
    {id:'cds-2011-I',year:2011,session:'I',title:'CDS I 2011',source:'https://examvictor.com/cds-2011-english-question-paper-1/',key:`D B D C C D C B C B D B A C B C D B A A C A C D C C B A B A C C A B A D D D D C B A C B B B C D C C C D C B B A B B B C A C A B C A C A B C A B B A C B A B B A C A B A B D C B A D C A C B D B A C B B B B D B A D B D B D D C D A D A C B D C`},
    {id:'cds-2011-II',year:2011,session:'II',title:'CDS II 2011',source:'https://examvictor.com/cds-2011-english-question-paper-2/',key:`B D A C A D B B A D C D C D C A D B C C B A C B B A D D A D C B D A D B C C A D B D A D B C C A D B C D C A D A C D B C D C A B C C C B C B B B B A B B C B D C C B A D C A A A A D D A B B C A D A C A C D A C A B D D B D C C A A A D B B C B`},
    {id:'cds-2012-II',year:2012,session:'II',title:'CDS II 2012',source:'https://examvictor.com/cds-2012-english-question-paper-2/',key:`B B D C B A B C A D C C B C C B D A C C A C A C D B B C A D A B C B C A A A C D A A B D C B A C B A B B A D C A B D C B C C B B B B B C D D A C A C B C A A C A A C B A B B A B B C A D C A B B A D C A C A B D A A B D B A D B C B A A B A C C`}
  ];

  PAPERS.forEach(p=>{ p.answers=p.key.trim().split(/\s+/).map(x=>x.toUpperCase()); });
  PAPERS.forEach(p=>{ if(p.answers.length!==120) console.error('[VAANI CDS legacy] Bad key length',p.id,p.answers.length); });

  const NS='vaaniCdsLegacy';
  const answerKey=p=>`${NS}.answers.v1.${p.id}`;
  const resultKey=p=>`${NS}.result.v1.${p.id}`;
  function loadAnswers(p){ try{ const raw=localStorage.getItem(answerKey(p)); const a=raw?JSON.parse(raw):[]; return Array.isArray(a)?a.slice(0,120):[]; }catch(_){return [];} }
  function saveAnswers(p,a){ try{localStorage.setItem(answerKey(p.id||p),JSON.stringify(a));}catch(_){ } }
  function score(p,a){ let answered=0,correct=0,wrong=0; for(let i=0;i<120;i++){const v=a[i]; if(v==null)continue; answered++; if(v===p.answers[i])correct++;else wrong++;} const marks=correct-(wrong/3); return {answered,correct,wrong,blank:120-answered,marks}; }
  function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  function ensureStyle(){
    if(document.getElementById('vaaniCdsLegacyStyle'))return;
    const s=document.createElement('style');s.id='vaaniCdsLegacyStyle';
    s.textContent=`
      #vaaniCdsLegacy{margin:18px 0 6px;border:1px solid rgba(201,162,75,.28);border-radius:22px;padding:20px;background:linear-gradient(145deg,rgba(18,23,31,.96),rgba(9,13,18,.96));box-shadow:0 16px 40px rgba(0,0,0,.22)}
      #vaaniCdsLegacy .vcl-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;margin-bottom:16px}
      #vaaniCdsLegacy h3{margin:0;color:#f6e3ad;font:700 22px/1.1 Cinzel,serif}
      #vaaniCdsLegacy p{margin:5px 0 0;color:#c9d2dd;font:500 12px/1.45 Inter,sans-serif}
      .vcl-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.vcl-card{border:1px solid rgba(201,162,75,.22);border-radius:16px;padding:15px;background:rgba(255,255,255,.035)}
      .vcl-top{display:flex;justify-content:space-between;gap:10px;align-items:start}.vcl-title{color:#fff;font:800 17px/1.15 Oswald,sans-serif;letter-spacing:.3px}.vcl-meta{color:#aeb9c7;font:600 11px/1.4 Inter,sans-serif;margin-top:4px}.vcl-status{font:800 10px/1 Inter,sans-serif;padding:6px 8px;border-radius:999px;background:rgba(87,190,131,.12);color:#8ce0a8;border:1px solid rgba(87,190,131,.22)}
      .vcl-actions{display:flex;gap:8px;margin-top:13px;flex-wrap:wrap}.vcl-btn{border:0;border-radius:10px;padding:9px 12px;cursor:pointer;font:800 11px/1 Inter,sans-serif}.vcl-primary{background:#c9a24b;color:#111}.vcl-ghost{background:rgba(255,255,255,.06);color:#e8edf2;border:1px solid rgba(255,255,255,.09)}.vcl-note{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(201,162,75,.06);border:1px solid rgba(201,162,75,.14);color:#cdd6df;font:600 11px/1.45 Inter,sans-serif}
      #vclModal{position:fixed;inset:0;background:rgba(3,6,10,.8);backdrop-filter:blur(9px);z-index:100000;display:none;align-items:center;justify-content:center;padding:14px}#vclModal.open{display:flex}#vclBox{width:min(1120px,100%);max-height:94vh;overflow:auto;background:#0c1218;border:1px solid rgba(201,162,75,.32);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.55);padding:18px}
      .vcl-mhead{display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:0;background:#0c1218;padding-bottom:10px;z-index:2}.vcl-mtitle{color:#f6e3ad;font:800 22px/1.1 Oswald,sans-serif}.vcl-close{border:0;background:rgba(255,255,255,.06);color:#fff;border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:20px}.vcl-stats{display:flex;gap:12px;flex-wrap:wrap;margin:5px 0 12px}.vcl-stat{padding:7px 10px;border-radius:9px;background:rgba(255,255,255,.045);color:#cbd4de;font:700 11px Inter,sans-serif}.vcl-progress{height:8px;border-radius:99px;background:#1c2730;overflow:hidden}.vcl-progress>span{display:block;height:100%;background:#c9a24b;width:0}.vcl-qgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:15px}.vcl-q{display:grid;grid-template-columns:42px repeat(4,1fr);gap:4px;align-items:center;padding:5px;border-radius:9px;background:rgba(255,255,255,.025)}.vcl-qno{color:#aab5c0;font:800 11px Inter,sans-serif;text-align:center}.vcl-opt{border:1px solid rgba(255,255,255,.1);background:#111a22;color:#e9eef3;border-radius:7px;padding:7px 0;cursor:pointer;font:800 11px Inter,sans-serif}.vcl-opt.sel{background:#c9a24b;color:#111;border-color:#c9a24b}.vcl-opt.correct{background:#2c8052;color:#fff;border-color:#59bb80}.vcl-opt.wrong{background:#8b3943;color:#fff;border-color:#d06a77}.vcl-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:15px;flex-wrap:wrap}.vcl-result{color:#d9e2eb;font:700 12px/1.45 Inter,sans-serif}.vcl-submit{border:0;border-radius:11px;background:#c9a24b;color:#111;padding:11px 15px;font:900 12px Inter,sans-serif;cursor:pointer}.vcl-source{color:#d7ba6e;font:800 11px Inter,sans-serif;text-decoration:none}
      @media(max-width:820px){.vcl-grid{grid-template-columns:1fr}.vcl-qgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.vcl-q{grid-template-columns:34px repeat(4,1fr)}}@media(max-width:520px){#vaaniCdsLegacy{padding:14px}.vcl-qgrid{grid-template-columns:1fr}.vcl-q{grid-template-columns:38px repeat(4,1fr)}}
    `;
    document.head.appendChild(s);
  }

  let current=null,currentAnswers=[];
  function buildArchive(){
    ensureStyle(); const target=document.getElementById('pvArchiveEraList'); if(!target||document.getElementById('vaaniCdsLegacy'))return;
    const host=document.createElement('section');host.id='vaaniCdsLegacy';host.innerHTML=`
      <div class="vcl-head"><div><h3>Early CDS Answer-Sheet Drills</h3><p>Series A / Set A answer-sheet companion for the verified papers collected for VAANI.</p></div></div>
      <div class="vcl-grid">${PAPERS.map(card).join('')}</div>
      <div class="vcl-note">CDS II 2010 and CDS I 2012 are intentionally not listed because a sufficiently trustworthy complete answer key was not found.</div>`;
    target.insertAdjacentElement('afterend',host);ensureModal();
  }
  function card(p){
    const saved=loadAnswers(p),s=score(p,saved),pct=Math.round((saved.filter(Boolean).length/120)*100);
    return `<article class="vcl-card"><div class="vcl-top"><div><div class="vcl-title">${esc(p.title)}</div><div class="vcl-meta">120 questions · Set A · +1 / −⅓ / 0</div></div><span class="vcl-status">KEY VERIFIED</span></div><div class="vcl-meta">Saved: ${pct}% answered${s.answered?` · Last score ${s.marks.toFixed(2)}`:''}</div><div class="vcl-actions"><button class="vcl-btn vcl-primary" onclick="window.vaaniCdsLegacyOpen('${p.id}')">Open Paper Drill</button><a class="vcl-btn vcl-ghost" href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">Paper Source ↗</a></div></article>`;
  }
  function ensureModal(){
    if(document.getElementById('vclModal'))return;
    const m=document.createElement('div');m.id='vclModal';m.innerHTML=`<div id="vclBox"><div class="vcl-mhead"><div><div id="vclTitle" class="vcl-mtitle"></div><div id="vclSub" class="vcl-meta"></div></div><button class="vcl-close" onclick="window.vaaniCdsLegacyClose()" aria-label="Close">×</button></div><div class="vcl-stats"><span id="vclAnswered" class="vcl-stat"></span><span id="vclCorrect" class="vcl-stat"></span><span id="vclWrong" class="vcl-stat"></span><span id="vclScore" class="vcl-stat"></span></div><div class="vcl-progress"><span id="vclProgress"></span></div><div id="vclQuestions" class="vcl-qgrid"></div><div class="vcl-footer"><a id="vclSource" class="vcl-source" target="_blank" rel="noopener noreferrer">Open question paper ↗</a><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span id="vclResult" class="vcl-result"></span><button class="vcl-btn vcl-ghost" onclick="window.vaaniCdsLegacyReset()">Reset</button><button class="vcl-submit" onclick="window.vaaniCdsLegacySubmit()">Submit / Save Result</button></div></div></div>`;
    m.addEventListener('click',e=>{if(e.target===m)window.vaaniCdsLegacyClose()});document.body.appendChild(m);
  }
  function renderModal(showResult){
    if(!current)return;ensureModal();const s=score(current,currentAnswers);
    document.getElementById('vclTitle').textContent=current.title+' · English';document.getElementById('vclSub').textContent='Set A answer-sheet drill · 120 questions';
    document.getElementById('vclAnswered').textContent=`Answered ${s.answered}/120`;document.getElementById('vclCorrect').textContent=`Correct ${s.correct}`;document.getElementById('vclWrong').textContent=`Wrong ${s.wrong}`;document.getElementById('vclScore').textContent=`Score ${s.marks.toFixed(2)}`;
    document.getElementById('vclProgress').style.width=(s.answered/120*100)+'%';document.getElementById('vclSource').href=current.source;
    let old=null;try{old=JSON.parse(localStorage.getItem(resultKey(current))||'null')}catch(_){}
    document.getElementById('vclResult').textContent=showResult&&old?`Saved result: ${old.correct}/120 correct · ${Number(old.marks).toFixed(2)} marks`:'';
    let html='';for(let i=0;i<120;i++){const chosen=currentAnswers[i],key=current.answers[i];html+=`<div class="vcl-q"><span class="vcl-qno">${i+1}</span>${['A','B','C','D'].map(opt=>{const cls=chosen===opt?' sel':'',rev=showResult?(opt===key?' correct':(chosen===opt&&chosen!==key?' wrong':'')):'';return `<button class="vcl-opt${cls}${rev}" onclick="window.vaaniCdsLegacyChoose(${i},'${opt}')" aria-label="Question ${i+1} option ${opt}">${opt}</button>`}).join('')}</div>`}
    document.getElementById('vclQuestions').innerHTML=html;
  }
  window.vaaniCdsLegacyOpen=function(id){current=PAPERS.find(p=>p.id===id)||null;if(!current)return;currentAnswers=loadAnswers(current);document.getElementById('vclModal').classList.add('open');renderModal(true);document.body.style.overflow='hidden';};
  window.vaaniCdsLegacyClose=function(){const m=document.getElementById('vclModal');if(m)m.classList.remove('open');document.body.style.overflow='';current=null;};
  window.vaaniCdsLegacyChoose=function(i,v){if(!current)return;currentAnswers[i]=v;saveAnswers(current,currentAnswers);renderModal(false);};
  window.vaaniCdsLegacyReset=function(){if(!current)return;if(!confirm('Reset all saved answers for this paper?'))return;currentAnswers=[];localStorage.removeItem(answerKey(current));localStorage.removeItem(resultKey(current));renderModal(false);};
  window.vaaniCdsLegacySubmit=function(){if(!current)return;const s=score(current,currentAnswers);try{localStorage.setItem(resultKey(current),JSON.stringify({correct:s.correct,wrong:s.wrong,blank:s.blank,marks:s.marks,at:new Date().toISOString()}))}catch(_){}renderModal(true);};

  let wrapped=false;
  function hook(){if(wrapped||typeof window.pvRender!=='function')return false;const original=window.pvRender;window.pvRender=function(){const r=original.apply(this,arguments);setTimeout(()=>{if(window.PV&&PV.examType==='CDS')buildArchive()},0);return r};wrapped=true;return true;}
  function init(){ensureStyle();hook();setTimeout(()=>{hook();if(window.PV&&PV.examType==='CDS')buildArchive()},200);setTimeout(()=>{hook();if(window.PV&&PV.examType==='CDS')buildArchive()},1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();