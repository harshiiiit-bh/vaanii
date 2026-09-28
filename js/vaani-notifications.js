(function () {
  'use strict';

  const API = (window.VAANI_NOTIFICATIONS_API || '').replace(/\/$/, '');
  const feedUrl = () => API ? API + '/api/notifications' : 'data/defence-notifications.json';
  const archiveUrl = () => API ? API + '/api/notifications/archive' : 'data/defence-notifications-archive.json';
  const root = document.getElementById('view-notifications');
  if (!root) return;

  const tabs = [...root.querySelectorAll('[data-nc-filter]')];
  const directoryCards = [...root.querySelectorAll('.nc-directory-card')];
  const search = root.querySelector('#ncSearch');
  const count = root.querySelector('#ncDirectoryCount');
  const empty = root.querySelector('#ncDirectoryEmpty');
  const liveList = root.querySelector('#ncLiveList');
  const liveStamp = root.querySelector('#ncLiveStamp');
  let filter = 'all';
  let liveItems = [];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function safeUrl(value) {
    const url = String(value || '');
    return /^https?:\/\//i.test(url) ? url : '';
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? String(value)
      : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function sectorForCategory(value) {
    const category = String(value || '').toUpperCase().replace(/[ -]+/g, '_');
    if (['NDA','CDS','AFCAT','AGNIVEER','ARMY_RALLY','CAPF','BSF','CRPF','CISF','ITBP','SSB','ASSAM_RIFLES','COAST_GUARD','NAVY','AIR_FORCE','DEFENCE'].includes(category)) return 'defence';
    if (['SSC'].includes(category)) return 'ssc';
    if (['RAILWAYS','RRB'].includes(category)) return 'railways';
    if (['BANKING','IBPS','SBI','RBI'].includes(category)) return 'banking';
    if (['TEACHING','CTET','KVS','NVS'].includes(category)) return 'teaching';
    if (['UPSC'].includes(category)) return 'upsc';
    if (['STATE_PSC','BPSC','UPPSC','MPPSC','RPSC','JPSC'].includes(category)) return 'state-psc';
    if (['TECHNICAL','ISRO','DRDO','BARC','AAI'].includes(category)) return 'technical';
    if (['ENTRANCE','NTA','JEE','NEET','CUET','UGC_NET','CSIR_NET'].includes(category)) return 'entrance';
    if (['POLICE','STATE_POLICE','UPPRPB','CSBC','BPSSC'].includes(category)) return 'police';
    return 'other';
  }

  function applyDirectoryFilters() {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    directoryCards.forEach(card => {
      const sectorMatch = filter === 'all' || card.dataset.sector === filter;
      const queryMatch = !query || card.textContent.toLowerCase().includes(query);
      card.hidden = !(sectorMatch && queryMatch);
      if (!card.hidden) visible++;
    });
    if (count) count.textContent = visible + (visible === 1 ? ' exam family' : ' exam families');
    if (empty) empty.hidden = visible !== 0;
    renderLive(liveItems);
  }

  tabs.forEach(tab => tab.addEventListener('click', () => {
    filter = tab.dataset.ncFilter || 'all';
    tabs.forEach(item => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    applyDirectoryFilters();
  }));
  search?.addEventListener('input', applyDirectoryFilters);
  applyDirectoryFilters();

  function renderArchive(items) {
    const mount = root.querySelector('#ncArchiveMount');
    if (!mount) return;

    const wrap = document.createElement('div');
    wrap.className = 'nc-archive-wrap';
    wrap.innerHTML = '<button type="button" class="nc-archive-toggle" aria-expanded="false">View notification archive</button>' +
      '<div class="nc-archive-panel" hidden><div class="nc-archive-head"><div><b>Historical notifications</b><span>Past recruitment cycles stay here for reference.</span></div><span class="nc-archive-count"></span></div>' +
      '<div class="nc-archive-grid"><div class="nc-live-empty">Loading archive…</div></div></div>';
    mount.replaceChildren(wrap);

    const toggle = wrap.querySelector('.nc-archive-toggle');
    const panel = wrap.querySelector('.nc-archive-panel');
    const grid = wrap.querySelector('.nc-archive-grid');
    const archiveCount = wrap.querySelector('.nc-archive-count');
    toggle.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Hide notification archive' : 'View notification archive';
    });

    archiveCount.textContent = items.length + ' archived';
    grid.innerHTML = items.length ? items.slice(0, 36).map(item => {
      const url = safeUrl(item.url);
      const archived = formatDate(item.archivedAt);
      return '<article class="nc-live-row"><span class="nc-live-badge">ARCHIVED</span><div class="nc-live-content">' +
        '<div class="nc-live-meta">' + esc(item.category || 'Government') + ' · ' + esc(item.organization || 'Official source') + '</div>' +
        '<h3>' + esc(item.title || 'Historical notification') + '</h3>' +
        '<p>' + esc(item.summary || 'Historical recruitment or examination notice.') + (archived ? ' · Archived ' + esc(archived) : '') + '</p>' +
        (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open official source ↗</a>' : '') +
        '</div></article>';
    }).join('') : '<div class="nc-live-empty">No archived notifications yet.</div>';
  }

  function renderLive(items) {
    if (!liveList) return;
    const query = (search?.value || '').trim().toLowerCase();
    const rows = items.filter(item => {
      const sectorMatch = filter === 'all' || sectorForCategory(item.category) === filter;
      const text = [item.title, item.organization, item.category, item.summary, item.status].join(' ').toLowerCase();
      return sectorMatch && (!query || text.includes(query));
    }).slice(0, 8);
    liveList.innerHTML = rows.length ? rows.map(item => {
      const url = safeUrl(item.url);
      const category = String(item.category || 'Government').replace(/[_-]+/g, ' ');
      const status = String(item.status || item.type || 'update').replace(/[_-]+/g, ' ');
      const date = item.lastDate
        ? 'Deadline ' + formatDate(item.lastDate)
        : item.notificationDate
          ? 'Notice ' + formatDate(item.notificationDate)
          : item.examDate
            ? 'Exam ' + formatDate(item.examDate)
            : item.lastSeen
              ? 'Checked ' + formatDate(item.lastSeen)
              : 'Official update';
      return '<article class="nc-live-row"><span class="nc-live-badge">' + esc(category) + '</span><div class="nc-live-content">' +
        '<div class="nc-live-meta">' + esc(item.organization || 'Official source') + ' · ' + esc(status) + '</div>' +
        '<h3>' + esc(item.title || 'Official update') + '</h3>' +
        '<p>' + esc(item.summary || 'Open the official source for the complete notice.') + '</p>' +
        '<div class="nc-live-meta nc-live-date">' + esc(date) + '</div>' +
        (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open official source ↗</a>' : '') +
        '</div></article>';
    }).join('') : '<div class="nc-live-empty">No synced updates are available yet. Browse the exam families below and check their official portals.</div>';
  }

  fetch(feedUrl(), { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Notification feed returned ' + response.status);
      return response.json();
    })
    .then(data => {
      liveItems = Array.isArray(data.items) ? data.items : [];
      const items = liveItems;
      const generated = data.generatedAt ? new Date(data.generatedAt) : null;
      liveStamp.textContent = generated && !Number.isNaN(generated.valueOf())
        ? 'Synced ' + generated.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Auto-synced';
      renderLive(items);
    })
    .catch(() => {
      if (liveStamp) liveStamp.textContent = 'Feed unavailable';
      if (liveList) liveList.innerHTML = '<div class="nc-live-empty">The auto-synced feed is temporarily unavailable. Use the official exam portals in the directory below.</div>';
    });

  fetch(archiveUrl(), { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Archive returned ' + response.status);
      return response.json();
    })
    .then(data => renderArchive(Array.isArray(data.items) ? data.items : []))
    .catch(() => {
      const mount = root.querySelector('#ncArchiveMount');
      if (mount) mount.innerHTML = '<div class="nc-disclaimer">The archive is temporarily unavailable.</div>';
    });

  root.querySelector('#ncEligibilityForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const dob = root.querySelector('#ncDob')?.value;
    const cycle = root.querySelector('#ncEntry')?.value;
    const result = root.querySelector('#ncEligibilityResult');
    if (!result) return;
    if (cycle === 'nda1') {
      result.textContent = 'NDA-I 2027 DOB criteria will be confirmed in its official notification. Vaani will not estimate it from a previous cycle.';
    } else if (!dob) {
      result.textContent = 'Please enter your date of birth.';
    } else {
      const date = new Date(dob + 'T00:00:00Z');
      const min = new Date('2008-01-02T00:00:00Z');
      const max = new Date('2011-01-01T00:00:00Z');
      result.textContent = date >= min && date <= max
        ? 'Your DOB falls within the NDA-II 2026 range shown. This is only a date check; verify all other conditions in the official notice.'
        : 'Your DOB falls outside the NDA-II 2026 range shown. Verify against the official notice before concluding.';
    }
    result.classList.add('show');
  });
})();
