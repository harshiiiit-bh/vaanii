(function(){'use strict';
const root=document.getElementById('view-notifications');if(!root)return;
let filter='all';
const cards=[...root.querySelectorAll('.nc-card')],tabs=[...root.querySelectorAll('[data-nc-filter]')],search=root.querySelector('#ncSearch');

function apply(){const q=(search?.value||'').trim().toLowerCase();cards.forEach(c=>{c.hidden=!(filter==='all'||c.dataset.category===filter)||!!q&&!c.textContent.toLowerCase().includes(q);});}
tabs.forEach(t=>t.addEventListener('click',()=>{filter=t.dataset.ncFilter;tabs.forEach(x=>{x.classList.toggle('active',x===t);x.setAttribute('aria-pressed',String(x===t));});apply();}));
search?.addEventListener('input',apply);

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addArchiveButton(section){
  const archive=document.createElement('div');
  archive.className='nc-archive-wrap';
  archive.innerHTML='<button type="button" class="nc-archive-toggle" id="ncArchiveToggle">🗄️ View notification archive</button><div class="nc-archive-panel" id="ncArchivePanel" hidden><div class="nc-archive-head"><div><b>Historical defence notifications</b><span>Past cycles stay here instead of disappearing.</span></div><span id="ncArchiveCount"></span></div><div class="nc-archive-grid" id="ncArchiveGrid"><div class="nc-live-empty">Loading archive…</div></div></div>';
  section.appendChild(archive);
  const toggle=archive.querySelector('#ncArchiveToggle'),panel=archive.querySelector('#ncArchivePanel'),grid=archive.querySelector('#ncArchiveGrid'),count=archive.querySelector('#ncArchiveCount');
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.textContent=panel.hidden?'🗄️ View notification archive':'✕ Hide notification archive';});
  fetch('data/defence-notifications-archive.json?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('archive '+r.status);return r.json();}).then(data=>{
    const items=Array.isArray(data.items)?data.items:[];
    count.textContent=items.length+' archived';
    grid.innerHTML=items.length?items.slice(0,48).map(x=>'<article class="nc-live-card"><div class="nc-live-top"><span>'+esc(String(x.category||'DEFENCE').replace('_',' '))+'</span><small>ARCHIVED</small></div><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary||'Historical notification. Open the official source for reference.')+'</p><div class="nc-live-meta"><span>'+esc(x.organization||'Official source')+'</span><span>Archived '+esc(x.archivedAt?new Date(x.archivedAt).toLocaleDateString('en-IN'):'')+'</span></div><a class="nc-btn" href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">Open source ↗</a></article>').join(''):'<div class="nc-live-empty">No archived notifications yet.</div>';
  }).catch(()=>{grid.innerHTML='<div class="nc-live-empty">Archive is temporarily unavailable.</div>';});
}

function addLiveFeed(){
  const toolbar=root.querySelector('.nc-toolbar');
  const grid=root.querySelector('.nc-grid');
  if(!toolbar||!grid)return;
  const section=document.createElement('section');
  section.className='nc-live';
  section.innerHTML='<div class="nc-live-head"><div><span class="nc-live-kicker">AUTO-SYNCED DEFENCE FEED</span><h2>Latest official updates</h2><p>Vaani checks configured public recruitment and examination pages on a schedule. This feed surfaces links; the official notice remains authoritative.</p></div><span class="nc-live-stamp" id="ncLiveStamp">Checking sources…</span></div>'+
    '<div class="nc-live-controls"><input id="ncLiveSearch" type="search" placeholder="Search NDA, Agniveer, BSF, rally…" aria-label="Search live defence updates"><div class="nc-live-filters" id="ncLiveFilters"><button class="active" data-live-filter="ALL">All</button><button data-live-filter="NDA">NDA</button><button data-live-filter="CDS">CDS</button><button data-live-filter="AFCAT">AFCAT</button><button data-live-filter="CAPF">CAPF</button><button data-live-filter="AGNIVEER">Agniveer</button><button data-live-filter="ARMY_RALLY">Rally</button><button data-live-filter="BSF">BSF</button><button data-live-filter="CRPF">CRPF</button></div></div>'+
    '<div class="nc-live-grid" id="ncLiveGrid"><div class="nc-live-empty">Loading…</div></div>';
  toolbar.insertAdjacentElement('afterend',section);
  const liveGrid=section.querySelector('#ncLiveGrid'),liveSearch=section.querySelector('#ncLiveSearch'),liveFilters=section.querySelector('#ncLiveFilters'),stamp=section.querySelector('#ncLiveStamp');
  let items=[],liveFilter='ALL';
  function render(){
    const q=(liveSearch.value||'').trim().toLowerCase();
    const rows=items.filter(x=>(liveFilter==='ALL'||x.category===liveFilter)&&(!q||[x.title,x.organization,x.category,x.summary].join(' ').toLowerCase().includes(q))).slice(0,36);
    liveGrid.innerHTML=rows.length?rows.map(x=>{
      const d=x.lastSeen?new Date(x.lastSeen):null;
      const seen=d&&!Number.isNaN(d.valueOf())?d.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Recently checked';
      return '<article class="nc-live-card"><div class="nc-live-top"><span>'+esc(String(x.category||'DEFENCE').replace('_',' '))+'</span><small>'+esc(String(x.status||x.type||'update').replace(/-/g,' '))+'</small></div><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary||'Open the official source for the complete notice.')+'</p><div class="nc-live-meta"><span>'+esc(x.organization||'Official source')+'</span><span>Checked '+esc(seen)+'</span></div><a class="nc-btn primary" href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">Open official source ↗</a></article>';
    }).join(''):'<div class="nc-live-empty">No matching updates found.</div>';
  }
  liveSearch.addEventListener('input',render);
  liveFilters.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{liveFilter=b.dataset.liveFilter;liveFilters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render();}));
  fetch('data/defence-notifications.json?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('feed '+r.status);return r.json();}).then(data=>{
    items=Array.isArray(data.items)?data.items:[];
    const d=data.generatedAt?new Date(data.generatedAt):null;
    stamp.textContent=d&&!Number.isNaN(d.valueOf())?'Synced '+d.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Auto-synced';
    render();
  }).catch(()=>{stamp.textContent='Feed unavailable';liveGrid.innerHTML='<div class="nc-live-empty">The automatic feed could not be loaded. The verified notification cards below remain available.</div>';});
}
addLiveFeed();

root.querySelector('#ncEligibilityForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const d=root.querySelector('#ncDob').value,cycle=root.querySelector('#ncEntry').value,r=root.querySelector('#ncEligibilityResult');
  if(cycle==='nda1'){r.textContent='NDA-I 2027 DOB criteria will be confirmed in its official notification. Vaani will not estimate it from a previous cycle.';}
  else if(!d){r.textContent='Please enter your date of birth.';}
  else{const x=new Date(d+'T00:00:00Z'),a=new Date('2008-01-02T00:00:00Z'),b=new Date('2011-01-01T00:00:00Z');r.textContent=x>=a&&x<=b?'Your DOB falls within the NDA-II 2026 range shown. This is only a date check; verify all other conditions in the official notice.':'Your DOB falls outside the NDA-II 2026 range shown. Verify against the official notice before concluding.';}
  r.classList.add('show');
});
})();