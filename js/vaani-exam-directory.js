(function () {
  'use strict';
  function ready() {
    var grid = document.getElementById('ncDirectoryGrid');
    if (!grid) return;
    grid.querySelectorAll('.nc-directory-card').forEach(function (card) {
      if (card.dataset.detailBound === '1') return;
      card.dataset.detailBound = '1';
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      var titleEl = card.querySelector('h3');
      var typeEl = card.querySelector('.nc-dir-type');
      var descEl = card.querySelector(':scope > p');
      var tags = Array.from(card.querySelectorAll('.nc-tags span')).map(function (x) { return x.textContent.trim(); });
      var primary = card.querySelector('.nc-dir-actions .nc-btn.primary') || card.querySelector('.nc-dir-actions a');
      var params = new URLSearchParams();
      params.set('title', titleEl ? titleEl.textContent.trim() : 'Exam / Career pathway');
      params.set('sector', card.dataset.sector || '');
      params.set('type', typeEl ? typeEl.textContent.trim() : '');
      params.set('description', descEl ? descEl.textContent.trim() : '');
      params.set('tags', tags.join('|'));
      if (primary && primary.href) params.set('portal', primary.href);
      var href = 'exam.html?' + params.toString();
      card.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function (event) { event.stopPropagation(); });
      });
      function open() {
        card.classList.add('nc-directory-opened');
        window.setTimeout(function () { window.location.href = href; }, 80);
      }
      card.addEventListener('click', open);
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();