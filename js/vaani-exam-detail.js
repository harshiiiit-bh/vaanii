(function () {
  'use strict';

  var q = new URLSearchParams(location.search);
  var title = q.get('title') || 'Career / exam pathway';
  var sector = q.get('sector') || 'other';
  var group = q.get('group') || 'Government Exam Desk';
  var eyebrow = q.get('eyebrow') || '';
  var desc = q.get('description') || '';
  var groupDescription = q.get('groupDescription') || '';
  var portal = q.get('portal') || '';
  var quals = (q.get('quals') || '').split('|').filter(Boolean);
  var clean = function (v) { return String(v == null ? '' : v).trim(); };
  var el = function (id) { return document.getElementById(id); };

  var sectorLabels = {
    defence:'Defence', upsc:'UPSC', ssc:'SSC', railways:'Railways', banking:'Banking',
    teaching:'Teaching', state:'State services', technical:'Technical', entrance:'Entrance',
    health:'Healthcare', law:'Law', insurance:'Insurance', agriculture:'Agriculture',
    digital:'IT & digital', commerce:'Commerce', creative:'Design & media',
    vocational:'Vocational', hospitality:'Hospitality', research:'Research',
    social:'Social service', other:'Other'
  };
  var qualLabels = {
    '10th':'Class 10', '12th':'Class 12', iti:'ITI', diploma:'Diploma',
    ba:'B.A.', bsc:'B.Sc.', bcom:'B.Com.', bca:'BCA', bba:'BBA',
    btech:'B.Tech / B.E.', graduate:'Graduation', postgraduate:'Postgraduation',
    teaching:'Teaching qualification', law:'Law degree', mbbs:'MBBS / Medical',
    nursing:'Nursing', paramedical:'Paramedical', agri:'Agriculture & allied degree',
    pharmacy:'Pharmacy', architecture:'Architecture / planning', design:'Design / fine arts',
    ca:'Chartered Accountancy', cs:'Company Secretary', cma:'Cost & Management Accountancy',
    mba:'MBA / PGDM', hospitality:'Hospitality / hotel management',
    psychology:'Psychology / counselling', socialwork:'Social work', media:'Media / journalism'
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }

  function safeUrl(value) {
    var raw = clean(value);
    try {
      var u = new URL(raw, location.href);
      if ((u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password) return u.href;
    } catch (e) {}
    return '';
  }

  function setText(id, value) {
    var node = el(id);
    if (node) node.textContent = clean(value);
  }

  setText('detailTitle', title);
  setText('detailType', eyebrow || 'PATHWAY');
  setText('detailGroup', group);
  setText('detailSector', sectorLabels[sector] || sector);
  setText('detailDescription', desc || groupDescription || 'Open the official source to review the current route.');
  setText('detailGroupDescription', groupDescription || 'This route belongs to the ' + (sectorLabels[sector] || sector) + ' career family.');

  if (portal && safeUrl(portal)) {
    el('detailPortal').href = safeUrl(portal);
  } else {
    el('detailPortal').style.display = 'none';
  }
  el('detailNotice').style.display = 'none';
  document.title = title + ' | VAANI';

  var eligibilityNode = el('detailEligibility');
  if (eligibilityNode) {
    if (quals.length) {
      eligibilityNode.innerHTML =
        '<div class="vx-detail-meta">' +
        quals.map(function (qv) {
          return '<span class="vx-detail-pill">' + esc(qualLabels[qv] || qv) + '</span>';
        }).join('') +
        '</div>' +
        '<p>These are the Government Exam Desk route tags. The exact age, subject, percentage, nationality, medical, physical and registration conditions are notification-specific.</p>';
    } else {
      eligibilityNode.textContent = 'Eligibility is route-specific. Check the current official notification before applying.';
    }
  }

  function parseDate(value) {
    if (!value) return null;
    var text = clean(value);
    var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    var dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    var d = new Date(text);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(value) {
    var d = parseDate(value);
    return d ? d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';
  }

  function first(item, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var value = item && item[keys[i]];
      if (value != null && clean(value)) return value;
    }
    return '';
  }

  function textOf(item) {
    return [
      item && item.title, item && item.organization, item && item.sourceName, item && item.summary,
      item && item.category, item && item.type, item && item.status, item && item.eligibility,
      item && item.qualification, item && item.qualifications, item && item.education,
      item && item.advertisementNo
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function meaningfulWords(value) {
    var stop = {
      'the':1,'and':1,'for':1,'after':1,'entry':1,'route':1,'pathway':1,'exam':1,
      'examination':1,'recruitment':1,'recruitment':1,'career':1,'services':1,'service':1,
      'officer':1,'officers':1,'national':1,'government':1,'other':1,'entries':1
    };
    return clean(value).toLowerCase().split(/[^a-z0-9]+/).filter(function (word) {
      return word.length > 2 && !stop[word];
    });
  }

  function score(item) {
    var hay = textOf(item);
    var words = meaningfulWords(title + ' ' + (group || '') + ' ' + (quals || []).join(' '));
    var scoreValue = 0;
    words.forEach(function (word) {
      if (hay.indexOf(word) >= 0) scoreValue += word.length >= 5 ? 3 : 2;
    });
    var domain = safeUrl(portal);
    if (domain) {
      try {
        var host = new URL(domain).hostname.replace(/^www\./, '');
        if (hay.indexOf(host.split('.')[0]) >= 0) scoreValue += 1;
      } catch (e) {}
    }
    return scoreValue;
  }

  function dateRow(label, value) {
    var f = fmtDate(value);
    return f ? '<div class="vx-detail-date"><span>' + esc(label) + '</span><b>' + esc(f) + '</b></div>' : '';
  }

  async function loadItems() {
    var urls = [
      'https://vaani-notifications-api.harshitchaubey127.workers.dev/api/notifications',
      '../data/defence-notifications.json',
      'data/defence-notifications.json'
    ];
    for (var i = 0; i < urls.length; i += 1) {
      try {
        var response = await fetch(urls[i] + (urls[i].indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now(), { cache:'no-store' });
        if (!response.ok) continue;
        var payload = await response.json();
        if (payload && Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload)) return payload;
      } catch (e) {}
    }
    return [];
  }

  loadItems().then(function (items) {
    var ranked = items.map(function (item) {
      return { item:item, score:score(item) };
    }).sort(function (a,b) { return b.score - a.score; });
    var best = ranked[0];

    if (!best || best.score < 2) {
      setText('detailDates', 'No live notification is confidently matched to this route right now. Open the official portal for the latest cycle.');
      setText('detailStatus', 'No current notification was confidently matched. The route page is still useful as a qualification and official-portal guide.');
      if (el('detailNotes')) {
        el('detailNotes').textContent = 'No live notice match was returned by the current VAANI feed. Dates are intentionally not guessed.';
      }
      return;
    }

    var item = best.item;
    var start = first(item, ['applicationStartDate','applicationStart','startDate','openDate']);
    var end = first(item, ['lastDate','applicationEndDate','applicationEnd','endDate','closingDate']);
    var fee = first(item, ['feePaymentLastDate','feeLastDate']);
    var exam = first(item, ['examDate','examinationDate']);
    var notice = first(item, ['notificationDate','publishedAt','date']);
    var vacancy = first(item, ['vacancies','vacancyCount']);
    var rows =
      dateRow('Notification date', notice) +
      dateRow('Applications open', start) +
      dateRow('Application deadline', end) +
      dateRow('Fee payment deadline', fee) +
      dateRow('Exam date', exam) +
      (vacancy ? '<div class="vx-detail-date"><span>Vacancies</span><b>' + esc(vacancy) + '</b></div>' : '');

    setText('detailDates', '');
    el('detailDates').innerHTML = rows || 'The matched notice does not expose structured date fields. Open the official notice.';
    el('detailStatus').innerHTML =
      '<span class="vx-detail-status">' + esc(item.status || 'LIVE OFFICIAL FEED') + '</span>' +
      '<p><strong>' + esc(item.title || title) + '</strong></p>' +
      '<p>' + esc(item.summary || 'A matching notification was found in the current VAANI feed.') + '</p>';

    var noticeUrl = safeUrl(first(item, ['advertisementUrl','notificationUrl','sourceUrl','url']));
    if (noticeUrl) {
      el('detailNotice').href = noticeUrl;
      el('detailNotice').style.display = 'inline-flex';
    }

    var extra = [];
    if (item.selectionProcess) extra.push('Selection: ' + clean(item.selectionProcess));
    if (item.feeDetails) extra.push('Fee: ' + clean(item.feeDetails));
    if (item.eligibility) extra.push('Eligibility in notice: ' + clean(item.eligibility));
    if (extra.length) el('detailNotes').innerHTML = extra.map(function (x) { return '<p>• ' + esc(x) + '</p>'; }).join('');
    else el('detailNotes').textContent = 'Use the current official notice for exact age, education, vacancies, selection stages, fees and document requirements.';
  });
})();