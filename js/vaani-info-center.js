/* ============================================================
   VAANI INFO CENTER
   Dedicated guide + post-update first-visit briefing.
============================================================ */
(function(){
  const INFO_TOUR_VERSION='20261002-info-center1';
  const TOUR_TEXT='Welcome to VAANI, aspirant. I have moved the how-to information into one clean guide. Tap the new info button anytime to understand every feature, every XP rule and every part of your learning system.';

  const officerSVG =
    '<svg class="vi-officer-svg" viewBox="0 0 210 300" role="img" aria-label="Illustration of an Indian Army officer">'+
      '<defs>'+
        '<linearGradient id="viUniform" x1="0" x2="1"><stop offset="0" stop-color="#2f5a43"/><stop offset="1" stop-color="#183a2b"/></linearGradient>'+
        '<linearGradient id="viSkin" x1="0" x2="1"><stop offset="0" stop-color="#9a5f3c"/><stop offset="1" stop-color="#c7865f"/></linearGradient>'+
      '</defs>'+
      '<g class="vi-officer-bob">'+
        '<ellipse cx="111" cy="288" rx="63" ry="8" fill="rgba(0,0,0,.25)"/>'+
        '<path d="M69 130 Q108 110 149 130 L169 215 Q154 230 111 232 Q72 230 54 215Z" fill="url(#viUniform)" stroke="#10271c" stroke-width="3"/>'+
        '<path d="M78 137 L105 160 L90 186 L64 165Z" fill="#406e53"/>'+
        '<path d="M144 137 L117 160 L132 186 L158 165Z" fill="#406e53"/>'+
        '<path d="M93 214 H129 V270 H93Z" fill="#172a21"/>'+
        '<path d="M72 206 H91 V274 H63Z" fill="#234333"/>'+
        '<path d="M129 206 H149 L159 274 H132Z" fill="#234333"/>'+
        '<path d="M62 271 H92 V284 H57 Q55 275 62 271Z" fill="#131a1d"/>'+
        '<path d="M133 271 H159 Q167 275 167 284 H132Z" fill="#131a1d"/>'+
        '<path d="M92 155 Q111 169 129 155 L127 187 Q111 198 94 187Z" fill="#d6b18d" opacity=".95"/>'+
        '<path d="M98 159 L111 181 L124 159" fill="#f6f6f2"/>'+
        '<path d="M98 160 L111 172 L124 160 L121 151 H101Z" fill="#0f2831"/>'+
        '<circle cx="111" cy="91" r="34" fill="url(#viSkin)" stroke="#71432a" stroke-width="2"/>'+
        '<path d="M79 91 Q111 54 143 91 Q139 63 111 59 Q83 63 79 91Z" fill="#17251d"/>'+
        '<path d="M78 86 Q112 54 146 86 L139 99 Q112 80 84 99Z" fill="#1b2920"/>'+
        '<path d="M74 82 Q111 61 148 82 L145 95 Q112 78 77 95Z" fill="#23382c"/>'+
        '<rect x="100" y="69" width="22" height="6" rx="3" fill="#d8ae48"/>'+
        '<circle cx="111" cy="71.5" r="4" fill="#d8ae48"/>'+
        '<path d="M96 105 Q111 112 126 105" fill="none" stroke="#6b3d29" stroke-width="2" stroke-linecap="round"/>'+
        '<path d="M96 96 Q101 92 106 96 M116 96 Q121 92 126 96" fill="none" stroke="#4a2d20" stroke-width="2" stroke-linecap="round"/>'+
        '<rect x="74" y="188" width="74" height="9" rx="4" fill="#3b2a16"/>'+
        '<rect x="99" y="186" width="24" height="14" rx="3" fill="#d8ae48"/>'+
        '<circle cx="111" cy="193" r="3" fill="#183a2b"/>'+
        '<g class="vi-officer-salute">'+
          '<path d="M143 150 Q164 147 171 127 Q176 114 168 106 Q161 103 156 113 L146 134Z" fill="url(#viSkin)" stroke="#71432a" stroke-width="2"/>'+
          '<path d="M167 108 L183 111 Q187 121 181 128 L169 126Z" fill="url(#viSkin)" stroke="#71432a" stroke-width="2"/>'+
        '</g>'+
        '<rect x="61" y="143" width="18" height="9" rx="2" fill="#d8ae48"/>'+
        '<rect x="143" y="143" width="18" height="9" rx="2" fill="#d8ae48"/>'+
        '<circle cx="83" cy="147.5" r="3" fill="#d8ae48"/>'+
        '<circle cx="139" cy="147.5" r="3" fill="#d8ae48"/>'+
        '<path d="M95 176 H127" stroke="#d8ae48" stroke-width="2" stroke-dasharray="3 3"/>'+
      '</g>'+
    '</svg>';

  function positionTourSpot(){
    const btn=document.getElementById('infoBtn');
    const tour=document.getElementById('viTour');
    if(!btn||!tour)return;
    const r=btn.getBoundingClientRect();
    tour.style.setProperty('--vi-spot-x',(r.left+r.width/2)+'px');
    tour.style.setProperty('--vi-spot-y',(r.top+r.height/2)+'px');
  }

  function markTourSeen(){
    if(typeof State==='undefined')return;
    State.infoTourVersion=INFO_TOUR_VERSION;
    State.infoTourSeenAt=Date.now();
    if(typeof saveState==='function')saveState();
  }

  function closeTour(){
    markTourSeen();
    const el=document.getElementById('viTour');
    if(el)el.classList.remove('open');
    document.body.classList.remove('vi-tour-lock');
  }

  function buildTour(){
    if(document.getElementById('viTour'))return;
    const el=document.createElement('div');
    el.id='viTour';
    el.className='vi-tour';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-labelledby','viTourTitle');
    el.innerHTML =
      '<div class="vi-tour-ring" aria-hidden="true"></div>'+
      '<div class="vi-tour-scene">'+
        '<div class="vi-tour-officer" aria-hidden="true">'+officerSVG+'</div>'+
        '<div class="vi-tour-bubble">'+
          '<div class="vi-tour-kicker">FIELD BRIEFING · UPDATE 01</div>'+
          '<h3 id="viTourTitle">Your VAANI field manual</h3>'+
          '<p><span id="viTourText" class="vi-tour-type"></span><span class="vi-tour-cursor" aria-hidden="true"></span></p>'+
          '<div class="vi-tour-actions" id="viTourActions">'+
            '<button type="button" class="btn" id="viTourOpen">Open Guide</button>'+
            '<button type="button" class="btn ghost" id="viTourSkip">Skip briefing</button>'+
          '</div>'+
          '<div class="vi-tour-note">This briefing appears once after this update. The guide remains available from the ⓘ button.</div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(el);
    document.getElementById('viTourOpen').addEventListener('click',function(){
      markTourSeen();
      el.classList.remove('open');
      document.body.classList.remove('vi-tour-lock');
      if(typeof openInfoCenter==='function')openInfoCenter();
    });
    document.getElementById('viTourSkip').addEventListener('click',closeTour);
  }

  function typeTourText(){
    const host=document.getElementById('viTourText');
    const actions=document.getElementById('viTourActions');
    if(!host||!actions)return;
    host.textContent='';
    let i=0;
    function tick(){
      if(i>=TOUR_TEXT.length){actions.classList.add('show');return;}
      host.textContent+=TOUR_TEXT.charAt(i++);
      window.setTimeout(tick,16);
    }
    window.setTimeout(tick,1150);
  }

  function maybeShowInfoTour(){
    if(typeof ACTIVE_CODE==='undefined'||!ACTIVE_CODE)return;
    if(typeof State==='undefined')return;
    if(State.infoTourVersion===INFO_TOUR_VERSION)return;
    buildTour();
    requestAnimationFrame(function(){
      positionTourSpot();
      const el=document.getElementById('viTour');
      if(el)el.classList.add('open');
      document.body.classList.add('vi-tour-lock');
      typeTourText();
    });
  }

  window.openInfoCenter=function(){
    markTourSeen();
    if(typeof switchView==='function')switchView('info');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  window.maybeShowInfoTour=maybeShowInfoTour;
  window.closeInfoTour=closeTour;

  window.addEventListener('resize',function(){
    if(document.getElementById('viTour')?.classList.contains('open'))positionTourSpot();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && document.getElementById('viTour')?.classList.contains('open'))closeTour();
  });
})();