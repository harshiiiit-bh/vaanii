/* VAANI stability layer
   Protects critical visuals from failed image requests and adds
   a small, defensive runtime watchdog without changing app state. */
(function(){
  'use strict';
  if(window.__VAANI_STABILITY__) return;
  window.__VAANI_STABILITY__=true;

  function markHeroImage(img){
    if(!img) return;
    img.setAttribute('fetchpriority','high');
    img.loading='eager';
    img.addEventListener('load',function(){
      img.classList.remove('is-loading');
      img.classList.remove('is-broken');
    },{once:true});
    img.addEventListener('error',function(){
      if(img.dataset.fallbackTried==='1'){
        img.classList.remove('is-loading');
        img.classList.add('is-broken');
        return;
      }
      img.dataset.fallbackTried='1';
      img.classList.remove('is-loading');
      img.classList.add('is-broken');
      img.src='assets/hero-photo.jpg';
      img.classList.remove('is-broken');
      img.classList.add('is-loading');
    },{passive:true});

    if(img.complete){
      if(img.naturalWidth>0) img.classList.remove('is-loading');
      else img.dispatchEvent(new Event('error'));
    }else{
      img.classList.add('is-loading');
    }
  }

  function init(){
    markHeroImage(document.querySelector('.vd-hero-photo'));

    /* Do not allow decorative visual modules to become click blockers. */
    document.querySelectorAll('#vaaniVfxScene,[aria-hidden="true"]').forEach(function(el){
      if(el.id==='vaaniVfxScene') el.style.pointerEvents='none';
    });
  }

  window.addEventListener('error',function(e){
    /* Keep visual failures non-fatal; real app errors remain visible in console. */
    const target=e.target;
    if(target && target.tagName==='IMG' && target.classList && target.classList.contains('vd-hero-photo')){
      markHeroImage(target);
    }
  },true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();