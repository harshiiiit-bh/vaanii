/* ============================================================
   VAANI — SAFE 3D MODEL REGISTRY
   CSS-only figures, one unique model per major section.
   ============================================================ */

(function(){
  'use strict';

  const MODEL_FACTORIES = {
    dashboard: () => `
      <div class="vaani-3d-model vaani-model-dashboard" aria-hidden="true" data-3d-model="dashboard">
        <div class="vaani-3d-model__scene">
          <div class="vaani-3d-model__glow"></div>
          <div class="vaani-3d-model__floor"></div>
          <div class="compass-ring"></div>
          <div class="compass-needle"></div>
          <div class="compass-core"></div>
        </div>
      </div>`,
    grammar: () => `
      <div class="vaani-3d-model vaani-model-grammar" aria-hidden="true" data-3d-model="grammar">
        <div class="vaani-3d-model__scene">
          <div class="vaani-3d-model__glow"></div>
          <div class="vaani-3d-cube">
            <span class="face front">RULE</span><span class="face back">EX</span>
            <span class="face right">EXAM</span><span class="face left">TEST</span>
            <span class="face top">WHY</span><span class="face bottom">DRILL</span>
          </div>
        </div>
      </div>`,
    journey: () => `
      <div class="vaani-3d-model vaani-model-journey" aria-hidden="true" data-3d-model="journey">
        <div class="vaani-3d-model__scene">
          <div class="vaani-3d-model__glow"></div>
          <div class="stage s1"></div><div class="stage s2"></div><div class="stage s3"></div><div class="stage s4"></div>
          <div class="flag"></div>
        </div>
      </div>`,
    topic: () => `
      <div class="vaani-3d-model vaani-model-topic" aria-hidden="true" data-3d-model="topic">
        <div class="vaani-3d-model__scene">
          <div class="lens"></div><div class="lens-axis"></div>
        </div>
      </div>`,
    compare: () => `
      <div class="vaani-3d-model vaani-model-compare" aria-hidden="true" data-3d-model="compare">
        <div class="vaani-3d-model__scene">
          <div class="prism left"></div><div class="prism right"></div><div class="vs">VS</div>
        </div>
      </div>`,
    'compare-detail': () => `
      <div class="vaani-3d-model vaani-model-compare-detail" aria-hidden="true" data-3d-model="compare-detail">
        <div class="vaani-3d-model__scene">
          <div class="beam"></div><div class="plate one"></div><div class="plate two"></div><div class="hub"></div>
        </div>
      </div>`,
    vocab: () => `
      <div class="vaani-3d-model vaani-model-vocab" aria-hidden="true" data-3d-model="vocab">
        <div class="vaani-3d-model__scene">
          <div class="barrel">
            <div class="barrel-face f1">WORD</div><div class="barrel-face f2">MEAN</div><div class="barrel-face f3">USE</div>
          </div>
          <div class="cap top"></div><div class="cap bottom"></div>
        </div>
      </div>`,
    worddetail: () => `
      <div class="vaani-3d-model vaani-model-worddetail" aria-hidden="true" data-3d-model="worddetail">
        <div class="vaani-3d-model__scene"><div class="word-prism"></div></div>
      </div>`,
    books: () => `
      <div class="vaani-3d-model vaani-model-books" aria-hidden="true" data-3d-model="books">
        <div class="vaani-3d-model__scene">
          <div class="book-half book-left"><span class="page-line l1"></span><span class="page-line l2"></span><span class="page-line l3"></span></div>
          <div class="book-half book-right"><span class="page-line l1"></span><span class="page-line l2"></span><span class="page-line l3"></span></div>
          <div class="spine"></div>
        </div>
      </div>`,
    pyq: () => `
      <div class="vaani-3d-model vaani-model-pyq" aria-hidden="true" data-3d-model="pyq">
        <div class="vaani-3d-model__scene">
          <div class="target r1"></div><div class="target r2"></div><div class="target r3"></div><div class="pin"></div>
        </div>
      </div>`,
    games: () => `
      <div class="vaani-3d-model vaani-model-games" aria-hidden="true" data-3d-model="games">
        <div class="vaani-3d-model__scene">
          <div class="vaani-3d-cube"><span class="face front"></span><span class="face back"></span><span class="face right"></span><span class="face left"></span><span class="face top"></span><span class="face bottom"></span>
          <i class="dot d1"></i><i class="dot d2"></i><i class="dot d3"></i></div>
        </div>
      </div>`,
    leaderboard: () => `
      <div class="vaani-3d-model vaani-model-leaderboard" aria-hidden="true" data-3d-model="leaderboard">
        <div class="vaani-3d-model__scene">
          <div class="podium p1"></div><div class="podium p2"></div><div class="podium p3"></div>
          <div class="cup"><span class="handle h1"></span><span class="handle h2"></span></div>
        </div>
      </div>`,
    profile: () => `
      <div class="vaani-3d-model vaani-model-profile" aria-hidden="true" data-3d-model="profile">
        <div class="vaani-3d-model__scene"><div class="ribbon"></div><div class="medal"></div></div>
      </div>`,
    notifications: () => `
      <div class="vaani-3d-model vaani-model-notifications" aria-hidden="true" data-3d-model="notifications">
        <div class="vaani-3d-model__scene">
          <div class="signal s2"></div><div class="signal s1"></div><div class="beacon"></div><div class="lamp"></div>
        </div>
      </div>`
  };

  const VIEW_TO_MODEL = {
    'view-dashboard':'dashboard',
    'view-grammar':'grammar',
    'view-journey':'journey',
    'view-topic':'topic',
    'view-compare':'compare',
    'view-compare-detail':'compare-detail',
    'view-vocab':'vocab',
    'view-worddetail':'worddetail',
    'view-books':'books',
    'view-pyq':'pyq',
    'view-games':'games',
    'view-leaderboard':'leaderboard',
    'view-profile':'profile',
    'view-notifications':'notifications'
  };

  function supported(){
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !!(window.CSS && CSS.supports && CSS.supports('transform-style','preserve-3d'));
  }

  function mountOne(view){
    if(!view || view.querySelector(':scope > .vaani-3d-model')) return;
    const modelName=VIEW_TO_MODEL[view.id];
    const factory=MODEL_FACTORIES[modelName];
    if(!factory) return;
    // Keep route content measurable; the model is an overlay decoration only.
    view.insertAdjacentHTML('afterbegin',factory());
    const model=view.querySelector(':scope > .vaani-3d-model');
    if(model){
      model.dataset.supported = supported() ? '1' : '0';
      if(!supported()) model.classList.add('is-flat-fallback');
    }
  }

  function init(){
    document.querySelectorAll('.view').forEach(mountOne);
    window.VAANI_3D = {
      version:'1.0-safe',
      supported,
      models:Object.keys(MODEL_FACTORIES),
      count:()=>document.querySelectorAll('.vaani-3d-model').length,
      validate:()=>{
        const views=[...document.querySelectorAll('.view')];
        const issues=[];
        views.forEach(view=>{
          const modelName=VIEW_TO_MODEL[view.id];
          if(!modelName) return;
          const models=view.querySelectorAll(':scope > .vaani-3d-model');
          if(models.length!==1) issues.push(view.id+': expected exactly 1 model, found '+models.length);
          const model=models[0];
          if(model && getComputedStyle(model).pointerEvents!=='none') issues.push(view.id+': model intercepts pointer input');
        });
        return {ok:issues.length===0,issues,total:document.querySelectorAll('.vaani-3d-model').length};
      }
    };
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();