(function () {
  'use strict';

  var sectorLabels = {
    defence: 'Defence',
    upsc: 'UPSC',
    ssc: 'SSC',
    railways: 'Railways',
    banking: 'Banking',
    teaching: 'Teaching',
    state: 'State services',
    technical: 'Technical',
    entrance: 'Entrance',
    health: 'Healthcare',
    law: 'Law',
    insurance: 'Insurance',
    agriculture: 'Agriculture',
    digital: 'IT & digital',
    commerce: 'Commerce',
    creative: 'Design & media',
    vocational: 'Vocational',
    hospitality: 'Hospitality',
    research: 'Research',
    social: 'Social service',
    other: 'Other'
  };

  var root, grid, countEl, emptyEl, searchEl, activeSector = 'all', cards = [];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }

  function routeUrl(route) {
    var params = new URLSearchParams();
    params.set('title', route.title || 'Career / exam pathway');
    params.set('sector', route.sector || 'other');
    params.set('group', route.groupTitle || '');
    params.set('eyebrow', route.groupEyebrow || '');
    params.set('description', route.note || '');
    params.set('groupDescription', route.groupDescription || '');
    params.set('quals', (route.quals || []).join('|'));
    if (route.url) params.set('portal', route.url);
    return 'exam.html?' + params.toString();
  }

  function normalizeCatalog() {
    var source = Array.isArray(window.VAANI_CAREER_OPTIONS) ? window.VAANI_CAREER_OPTIONS : [];
    var seen = new Set();
    return source.filter(function (route) {
      if (!route || !route.title) return false;
      var key = [route.sector, route.groupTitle, route.title, route.url].join('|').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function cardMarkup(route, index) {
    var sector = route.sector || 'other';
    var label = sectorLabels[sector] || sector;
    var quals = Array.isArray(route.quals) ? route.quals : [];
    return '<a class="nc-directory-card" href="' + esc(routeUrl(route)) + '"' +
      ' data-sector="' + esc(sector) + '" data-search="' +
      esc([route.title, route.note, route.groupTitle, route.groupEyebrow, label, quals.join(' ')].join(' ').toLowerCase()) + '">' +
      '<div class="nc-dir-top"><span class="nc-dir-number">' + String(index + 1).padStart(3, '0') + '</span>' +
      '<span class="nc-dir-type">' + esc(route.groupEyebrow || route.groupTitle || label) + '</span></div>' +
      '<h3>' + esc(route.title) + '</h3>' +
      '<p>' + esc(route.note || route.groupDescription || 'Open the dedicated route page for eligibility, dates and the official portal.') + '</p>' +
      '<span class="nc-dir-sector">' + esc(label) + '</span>' +
      (quals.length ? '<div class="nc-tags">' + quals.slice(0, 3).map(function (q) { return '<span>' + esc(q) + '</span>'; }).join('') + '</div>' : '') +
      '</a>';
  }

  function applyFilter() {
    var query = String(searchEl && searchEl.value || '').trim().toLowerCase();
    var visible = 0;
    cards.forEach(function (card) {
      var sectorOk = activeSector === 'all' || card.dataset.sector === activeSector;
      var text = card.dataset.search || '';
      var queryOk = !query || text.indexOf(query) >= 0;
      var show = sectorOk && queryOk;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (countEl) countEl.textContent = visible + ' career pathways';
    if (emptyEl) emptyEl.hidden = visible !== 0;
  }

  function bindFilters() {
    root.querySelectorAll('[data-nc-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        activeSector = button.dataset.ncFilter || 'all';
        root.querySelectorAll('[data-nc-filter]').forEach(function (item) {
          var active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        applyFilter();
      });
    });
    if (searchEl) searchEl.addEventListener('input', applyFilter);
  }

  function render() {
    root = document.getElementById('view-notifications');
    grid = document.getElementById('ncDirectoryGrid');
    countEl = document.getElementById('ncDirectoryCount');
    emptyEl = document.getElementById('ncDirectoryEmpty');
    searchEl = document.getElementById('ncSearch');
    if (!root || !grid) return;

    var catalog = normalizeCatalog();
    grid.innerHTML = catalog.map(cardMarkup).join('');
    cards = Array.prototype.slice.call(grid.querySelectorAll('.nc-directory-card'));
    bindFilters();
    applyFilter();
  }

  function boot() {
    if (!Array.isArray(window.VAANI_CAREER_OPTIONS)) {
      window.setTimeout(boot, 60);
      return;
    }
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();