/* VAANI OFFICER ELITE — adaptive companion layer */
(function(){
  'use strict';
  if(window.__VAANI_OFFICER_ELITE__)return;
  window.__VAANI_OFFICER_ELITE__=true;

  const quotes=[
    '“The standard is built on ordinary days.”',
    '“Review the miss. Repeat the method. Improve the result.”',
    '“A focused hour beats a distracted afternoon.”',
    '“Do the next useful thing.”',
    '“Accuracy is a habit before it becomes a score.”',
    '“You do not need a perfect attempt. You need an honest one.”'
  ];
  const context={
    dashboard:['COMMAND CENTRE','Choose one mission. Finish it before opening another.'],
    grammar:['GRAMMAR BATTALION','Find the rule behind the mistake, not just the answer.'],
    compare:['PRECISION POST','The difference is usually smaller than it looks. Read carefully.'],
    vocab:['WORD ARSENAL','Learn the word, use it, retrieve it.'],
    books:['READING DESK','Understand the paragraph before chasing individual words.'],
    pyq:['PYQ COMMAND','Treat every previous-year question as an after-action report.'],
    games:['ARENA CONTROL','Pressure is a training environment. Keep the method stable.'],
    leaderboard:['SITUATION BOARD','Use the board as feedback, not distraction.'],
    profile:['SERVICE RECORD','Track the work. Let the record speak.'],
    notifications:['SIGNAL ROOM','Act on what matters, then return to training.']
  };

  const state=()=>{try{return typeof State!=='undefined'?State:null}catch(e){return null}};
  const active=()=>{const v=document.querySelector('.view.active');return v?v.id.replace(/^view-/,''):'dashboard'};
  const level=()=>Math.max(1,Math.floor((Number(state()?.xp)||0)/100)+1);
  const xp=()=>Math.max(0,Number(state()?.xp)||0);
  const streak=()=>Math.max(0,Number(state()?.streak)||0);

  function mentor(){return document.getElementById('vaaniMentor')}
  function ensureIntel(){
    const m=mentor(); if(!m)return;
    const intel=m.querySelector('#vcIntel'); if(!intel)return;
    const best=Number(state()?.personalBests?.highestQuizScore)||0;
    intel.innerHTML='<span>🔥 '+streak()+'D</span><span>⭐ '+xp()+' XP</span><span>LVL '+level()+'</span>'+(best?'<span>BEST '+Math.round(best)+'%</span>':'');
  }
  function setText(kicker,text,quote,pose){
    const m=mentor();if(!m)return;
    const k=m.querySelector('#vcKicker'),t=m.querySelector('#vcText'),q=m.querySelector('#vcQuote'),c=m.querySelector('#vcCharacter');
    if(k)k.textContent=kicker;
    if(t)t.textContent=text;
    if(q)q.textContent=quote||quotes[Math.floor(Date.now()/86400000)%quotes.length];
    if(c&&pose)c.className='vc-character '+pose;
    ensureIntel();
  }
  function open(){const m=mentor();if(m){m.classList.add('open');m.classList.remove('mini');}}
  function close(){const m=mentor();if(m)m.classList.remove('open')}
  function brief(){
    const v=active(),c=context[v]||['VAANI MENTOR','Choose a task, focus for a while, and finish what you started.'];
    setText(c[0],c[1],quotes[Math.floor(Date.now()/86400000)%quotes.length],'p'+(Math.floor(Date.now()/86400000)%12));
    open();
  }

  let idle;
  function resetIdle(){
    clearTimeout(idle);
    idle=setTimeout(()=>{
      if(document.hidden)return resetIdle();
      const v=active();
      if(['dashboard','grammar','vocab','pyq','games','books'].includes(v)){
        const lines=[
          ['FOCUS CHECK','Still here? Pick the next useful action instead of switching tasks.'],
          ['MOMENTUM','If the method is not working, change the method — not the mission.'],
          ['FIELD NOTE','One deliberate attempt is worth more than several distracted ones.']
        ];
        const x=lines[Math.floor(Math.random()*lines.length)];
        setText(x[0],x[1],quotes[Math.floor(Math.random()*quotes.length)],'p8');
        open();
      }
      resetIdle();
    },120000);
  }

  function wrapNavigation(){
    if(typeof window.switchView!=='function'||window.switchView.__vaaniElite)return;
    const original=window.switchView;
    const wrapped=function(){
      const r=original.apply(this,arguments);
      ensureIntel();
      setTimeout(()=>{brief();resetIdle()},350);
      return r;
    };
    wrapped.__vaaniElite=true;
    window.switchView=wrapped;
  }

  function wrapResult(){
    if(typeof window.vaaniCharacterResult!=='function'||window.vaaniCharacterResult.__vaaniElite){
      return;
    }
    const original=window.vaaniCharacterResult;
    const wrapped=function(score,label){
      const r=original.apply(this,arguments);
      const n=Math.max(0,Math.min(100,Number(score)||0));
      let kicker='EXCELLENT EXECUTION',text='Strong result. Save the method that produced it.',pose='p4';
      if(n<33){kicker='DEBRIEF REQUIRED';text='Stop. Review the wrong answers before another full attempt. Find the repeated pattern first.';pose='p5'}
      else if(n<50){kicker='RECOVERY BRIEFING';text='The weak points are visible now. Convert each mistake into one concrete revision task.';pose='p5'}
      else if(n<70){kicker='AFTER ACTION REVIEW';text='A workable base is here. Remove the repeated errors before chasing more speed.';pose='p6'}
      else if(n<90){kicker='SOLID EXECUTION';text='Good work. Protect accuracy and identify the few remaining leaks.';pose='p10'}
      setText(kicker,text,n<50?'“Review the miss. Repeat the method. Improve the result.”':'“Reproduce the preparation, not just the score.”',pose);
      open();
      return r;
    };
    wrapped.__vaaniElite=true;
    window.vaaniCharacterResult=wrapped;
  }

  function scoreTicker(){
    const m=mentor();if(!m)return;
    const old=m.querySelector('.ve-score-ticker');if(old)old.remove();
    const s=document.createElement('div');
    s.className='ve-score-ticker';
    s.textContent='FIELD INTEL · '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    m.appendChild(s);
  }

  function boot(){
    wrapNavigation();
    wrapResult();
    ensureIntel();
    scoreTicker();
    resetIdle();
    setTimeout(brief,4500);
    document.addEventListener('keydown',e=>{
      if((e.key||'').toLowerCase()==='m' && !/input|textarea|select/i.test(e.target?.tagName||'')){
        e.preventDefault();const m=mentor();if(m?.classList.contains('open'))close();else brief();
      }
    });
    document.addEventListener('click',resetIdle,{passive:true});
    document.addEventListener('keydown',resetIdle,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensureIntel();resetIdle()}});
    setInterval(ensureIntel,15000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500),{once:true});
  else setTimeout(boot,500);
})();