/* ============================================================
   VAANI CHARACTER MENTOR
   One reusable character system with route-aware dialogue and
   result recovery coaching.
============================================================ */
(function(){
  const MESSAGES={
    dashboard:[
      ['p0','MISSION BRIEFING','Good to see you, aspirant. Pick one target and attack it properly.','Discipline beats motivation when motivation runs out.'],
      ['p10','MORALE CHECK','Small progress still counts. The next correct answer is waiting for you.','Consistency turns ordinary practice into extraordinary preparation.']
    ],
    grammar:[
      ['p2','GRAMMAR COACH','Do not just memorize the rule. Understand why the sentence works. Then test it.','Learn the rule. Apply the rule. Own the rule.'],
      ['p8','WRITING DRILL','Write one example in your own words. That is where the rule becomes yours.','Practice is where knowledge becomes instinct.']
    ],
    compare:[
      ['p3','THINKING POST','Slow down on confusing pairs. One tiny distinction can change the whole answer.','Precision wins marks.'],
      ['p6','ANSWER CHECK','Read both options carefully. The trap usually lives in one word.','Look twice. Answer once.']
    ],
    vocab:[
      ['p7','WORD ARSENAL','One new word today becomes one less word that can surprise you in the exam.','Build your vocabulary like an arsenal — one piece at a time.'],
      ['p10','WORD OF THE DAY','Learn it, use it, and meet it again later. Retrieval is what makes it stick.','A word remembered is a mark earned.']
    ],
    books:[
      ['p2','READING DESK','Read for meaning first. Details become easier when the big picture is clear.','Read with purpose, not just speed.'],
      ['p3','FIELD NOTE','Notice unfamiliar words, but do not let one word break your reading flow.','Keep moving. Come back. Master it.']
    ],
    pyq:[
      ['p6','PYQ COMMAND','Treat every PYQ like a mission report: read carefully, decide, and learn from the result.','Past papers reveal the battlefield.'],
      ['p9','TIME CONTROL','Accuracy first. Speed is useful only after the method is reliable.','Calm decisions create fast decisions.']
    ],
    games:[
      ['p4','ARENA','A little competition is fine. Just make sure the fun still teaches you something.','Train hard. Enjoy the win. Review the miss.'],
      ['p10','COMBO CHECK','Build the combo, but do not chase it by guessing. Accuracy comes first.','Good streaks come from good decisions.']
    ],
    profile:[
      ['p1','SERVICE RECORD','This page is your record, not your reward. Let the numbers show the work you put in.','Earn the progress. Then wear it.'],
      ['p11','KEEP GOING','Your next milestone is not far away. Keep stacking honest practice.','Every session leaves a mark.']
    ],
    notifications:[
      ['p0','SITUATION REPORT','Keep an eye on important updates, then get back to training.','Information is useful when it leads to action.']
    ],
    info:[
      ['p2','FIELD MANUAL','This guide is your map of VAANI. Come back here whenever a feature needs explaining.','Know the system. Then master it.']
    ],
    default:[
      ['p1','OFFICER VAANI','Choose a task, focus for a while, and finish what you started.','One mission at a time.']
    ]
  };

  const POSE_CLASS = /^vc-p(?:[0-9]|1[01])$/;
  function setCharacterPose(ch, pose){
    if(!ch)return false;
    Array.from(ch.classList).forEach(name=>{if(POSE_CLASS.test(name))ch.classList.remove(name);});
    const value=String(pose||'');
    const cls=value.startsWith('vc-')?value:'vc-'+value;
    if(!POSE_CLASS.test(cls))return false;
    ch.classList.add(cls);
    return true;
  }

  function currentView(){
    const v=document.querySelector('.view.active');
    return v ? v.id.replace('view-','') : 'dashboard';
  }

  function ensure(){
    if(document.getElementById('vaaniMentor'))return;
    const el=document.createElement('div');
    el.id='vaaniMentor';
    el.className='vaani-mentor';
    el.innerHTML=
      '<div class="vc-bubble" aria-live="polite">'+
        '<div class="vc-kicker" id="vcKicker">MISSION BRIEFING</div>'+
        '<div class="vc-text" id="vcText"></div>'+
        '<div class="vc-quote" id="vcQuote"></div>'+
        '<div class="vc-actions"><button type="button" id="vcHide">Dismiss</button><button type="button" id="vcNext" class="primary">Next briefing</button></div>'+
      '</div>'+
      '<div class="vc-character vc-p0" id="vcCharacter" role="button" tabindex="0" aria-label="OFFICER VAANI mentor">'+
        '<span class="vc-character-frame" aria-hidden="true">'+
          '<img class="vc-character-sheet" src="https://gcdn.picsart.com/editing-temp/2ca4be62-1e4a-4425-8b14-018c55a4d4b4.png" alt="" draggable="false" decoding="async" fetchpriority="low">'+
        '</span>'+
        '<span class="vc-character-fallback" aria-hidden="true">OV</span>'+
        '<span class="vc-character-nameplate" aria-hidden="true">OFFICER VAANI</span>'+
      '</div>';
    document.body.appendChild(el);
    document.getElementById('vcHide').addEventListener('click',()=>hide());
    document.getElementById('vcNext').addEventListener('click',()=>speak(currentView(),true));
    const ch=document.getElementById('vcCharacter');
    const img=ch.querySelector('.vc-character-sheet');
    if(img){
      const markReady=()=>{ch.classList.remove('asset-error');ch.classList.add('asset-ready');};
      const markError=()=>{ch.classList.remove('asset-ready');ch.classList.add('asset-error');};
      img.addEventListener('load',markReady);
      img.addEventListener('error',markError);
      // The cached image can finish before listeners are attached.
      if(img.complete){if(img.naturalWidth>0)markReady();else markError();}
    }
    ch.addEventListener('click',()=>speak(currentView(),true));
    ch.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();speak(currentView(),true)}});
  }

  function show(){
    ensure();
    const el=document.getElementById('vaaniMentor');
    if(!el)return;
    el.classList.add('speaking');
  }
  function hide(){
    window.clearTimeout(window.__vaaniMentorTimer);
    window.__vaaniMentorTimer=null;
    const el=document.getElementById('vaaniMentor');
    if(el)el.classList.remove('speaking','open');
  }

  let messageIndex={};
  function speak(view,force){
    ensure();
    const pool=MESSAGES[view]||MESSAGES.default;
    const idx=(messageIndex[view]||0)+(force?1:0);
    messageIndex[view]=idx%pool.length;
    const item=pool[messageIndex[view]];
    const ch=document.getElementById('vcCharacter');
    const kicker=document.getElementById('vcKicker');
    const text=document.getElementById('vcText');
    const quote=document.getElementById('vcQuote');
    if(!ch||!kicker||!text||!quote)return;
    setCharacterPose(ch,item[0]);
    kicker.textContent=item[1];
    text.textContent=item[2];
    quote.textContent='“'+item[3]+'”';
    show();
    window.clearTimeout(window.__vaaniMentorTimer);
    window.__vaaniMentorTimer=window.setTimeout(hide,9000);
  }

  function result(pct,label){
    const score=Number(pct);
    if(!Number.isFinite(score))return;
    ensure();
    hide();
    if(score<50){
      const wrap=document.getElementById('vaaniMentor');
      if(!wrap)return;
      wrap.classList.add('bad-result','show');
      wrap.innerHTML=
        '<button class="vc-close" type="button" aria-label="Close motivation">✕</button>'+
        '<div class="vc-recovery-card">'+
          '<div class="vc-recovery-art"></div>'+
          '<div class="vc-recovery-copy">'+
            '<div class="vc-kicker">RECOVERY BRIEFING · '+String(label||'Practice Result').toUpperCase().slice(0,44)+'</div>'+
            '<h3>Not your result. Just your feedback.</h3>'+
            '<p>You missed more than you wanted today. That is useful information. Review the wrong answers, find the pattern, and run the mission again with a better method.</p>'+
            '<blockquote>“A poor score is a report on today’s preparation — not a verdict on tomorrow’s performance.”</blockquote>'+
            '<div class="vc-recovery-actions"><button class="btn" type="button" id="vcRecoveryClose">Back to training</button><button class="btn ghost" type="button" id="vcRecoveryGuide">Open OFFICER VAANI Guide</button></div>'+
          '</div>'+
        '</div>';
      wrap.querySelector('.vc-close').onclick=closeRecovery;
      wrap.querySelector('#vcRecoveryClose').onclick=closeRecovery;
      wrap.querySelector('#vcRecoveryGuide').onclick=()=>{closeRecovery();if(typeof openInfoCenter==='function')openInfoCenter()};
    }else if(score<70){
      speak(currentView(),false);
      const text=document.getElementById('vcText');
      const quote=document.getElementById('vcQuote');
      const kick=document.getElementById('vcKicker');
      if(kick)kick.textContent='AFTER ACTION REVIEW';
      if(text)text.textContent='You are not where you want to be yet. Review the mistakes before the next attempt.';
      if(quote)quote.textContent='“Fix the process, and the score follows.”';
    }else{
      speak(currentView(),false);
      const kick=document.getElementById('vcKicker');
      const text=document.getElementById('vcText');
      const quote=document.getElementById('vcQuote');
      if(kick)kick.textContent='RESULT RECORDED';
      if(text)text.textContent='Good work. Save the lesson from this attempt and keep moving.';
      if(quote)quote.textContent='“Earn the next improvement.”';
    }
  }

  function closeRecovery(){
    const wrap=document.getElementById('vaaniMentor');
    if(!wrap)return;
    wrap.remove();
    ensure();
  }

  window.vaaniCharacterResult=result;
  window.vaaniCharacterSpeak=(view)=>speak(view||currentView(),true);
  window.vaaniCharacterHide=hide;
  window.vaaniCharacterSetPose=function(pose){return setCharacterPose(document.getElementById('vcCharacter'),pose);};

  function onRoute(){
    if(['info','topic','compare-detail','worddetail'].includes(currentView())){hide();return;}
    const key='vaani-character-'+currentView();
    const now=Date.now();
    const last=Number(sessionStorage.getItem(key)||0);
    if(now-last>12000){
      sessionStorage.setItem(key,String(now));
      window.setTimeout(()=>speak(currentView(),false),450);
    }
  }

  window.addEventListener('hashchange',()=>window.setTimeout(onRoute,300));
  window.addEventListener('load',()=>window.setTimeout(onRoute,1200));
})();