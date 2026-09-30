(function () {
  'use strict';

  const root = document.getElementById('view-notifications');
  if (!root) return;

  const DATA = window.VaaniExamDeskData;
  if (!DATA) return;

  const API = String(window.VAANI_NOTIFICATIONS_API || '').replace(/\/$/, '');
  const feedUrls = [API ? API + '/api/notifications' : '', 'data/defence-notifications.json'].filter(Boolean);
  const archiveUrls = [API ? API + '/api/notifications/archive' : '', 'data/defence-notifications-archive.json'].filter(Boolean);
  const statusUrls = ['data/defence-notifications-status.json'];

  const QUAL_LABELS = Object.fromEntries(DATA.QUALIFICATIONS.map(function (option) { return [option.id, option.label]; }));

  const forceGroups = [
    {
      title: 'Indian Army', eyebrow: 'LAND FORCE',
      description: 'Officer and Agniveer routes, with eligibility determined by entry and trade.',
      url: 'https://joinindianarmy.nic.in/',
      routes: [
        { title: 'NDA & NA', note: 'Officer entry after Class 12; stream rules vary by wing.', quals: ['12th'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'CDS', note: 'Officer entry after graduation; academy rules differ.', quals: ['graduate'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'Agniveer', note: 'GD, Technical, Office Assistant and Tradesmen routes; criteria vary by trade.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://joinindianarmy.nic.in/' },
        { title: 'Technical & other advertised entries', note: 'Technical, specialist and direct entries appear in separate notices.', quals: ['12th', 'diploma', 'btech', 'graduate'], url: 'https://joinindianarmy.nic.in/' }
      ]
    },
    {
      title: 'Indian Navy', eyebrow: 'MARITIME FORCE',
      description: 'Officer, technical cadet and Agniveer sailor pathways.',
      url: 'https://www.joinindiannavy.gov.in/',
      routes: [
        { title: 'NDA & NA', note: 'Naval Academy officer route through UPSC; PCM rules apply.', quals: ['12th'], url: 'https://www.upsc.gov.in/examinations' },
        { title: '10+2 B.Tech Cadet Entry', note: 'Class 12 science route; subject, rank and course rules come from the notice.', quals: ['12th'], url: 'https://www.joinindiannavy.gov.in/' },
        { title: 'Agniveer SSR / MR', note: 'Sailor entries with different educational criteria.', quals: ['10th', '12th'], url: 'https://www.joinindiannavy.gov.in/' },
        { title: 'Other notified entries', note: 'Officer, technical and specialist entries are announced separately.', quals: ['12th', 'diploma', 'btech', 'graduate'], url: 'https://www.joinindiannavy.gov.in/' }
      ]
    },
    {
      title: 'Indian Air Force', eyebrow: 'AIR POWER',
      description: 'Officer and Agniveervayu routes across flying and ground roles.',
      url: 'https://careerairforce.gov.in/',
      routes: [
        { title: 'NDA', note: 'Officer entry after Class 12; subject rules vary by branch.', quals: ['12th'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'AFCAT', note: 'Graduate entry for eligible branches; branch-specific criteria apply.', quals: ['graduate'], url: 'https://afcat.cdac.in/' },
        { title: 'Agniveervayu', note: 'Class 12, vocational and other routes as listed in each notice.', quals: ['12th', 'diploma'], url: 'https://agnipathvayu.cdac.in/AV/' },
        { title: 'Other advertised entries', note: 'Officer and specialist branches have separate subject, degree and medical criteria.', quals: ['graduate', 'btech'], url: 'https://careerairforce.gov.in/' }
      ]
    },
    {
      title: 'Indian Coast Guard', eyebrow: 'MARITIME SECURITY',
      description: 'Navik, Yantrik and officer opportunities through separate notices.',
      url: 'https://www.indiancoastguard.gov.in/',
      routes: [
        { title: 'Navik (GD)', note: 'Class 12 route; subject requirements apply.', quals: ['12th'], url: 'https://www.indiancoastguard.gov.in/' },
        { title: 'Navik (DB)', note: 'Class 10 route; check the current recruitment notice.', quals: ['10th'], url: 'https://www.indiancoastguard.gov.in/' },
        { title: 'Yantrik', note: 'Diploma-based technical route; branch rules vary.', quals: ['diploma'], url: 'https://joinindiancoastguard.cdac.in/' },
        { title: 'Officer entries', note: 'Officer opportunities and requirements are published by entry and branch.', quals: ['graduate', 'btech'], url: 'https://joinindiancoastguard.cdac.in/' }
      ]
    }
  ];

  const uniformedGroups = [
    { title: 'Border Security Force', eyebrow: 'BSF', description: 'Border security, technical and specialist recruitments.', url: 'https://rectt.bsf.gov.in/', routes: [
      { title: 'Constable, trades & technical posts', note: 'Post-specific education and trade requirements apply.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://rectt.bsf.gov.in/' },
      { title: 'Subordinate & officer entries', note: 'Check the relevant BSF notice for qualifications and selection stages.', quals: ['12th', 'graduate'], url: 'https://rectt.bsf.gov.in/' }
    ] },
    { title: 'Central Reserve Police Force', eyebrow: 'CRPF', description: 'Constable, technical, ministerial and officer opportunities.', url: 'https://rect.crpf.gov.in/', routes: [
      { title: 'Constable & technical posts', note: 'Trade and education criteria differ by post.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://rect.crpf.gov.in/' },
      { title: 'SI, specialist & officer entries', note: 'Use the current CRPF advertisement for exact requirements.', quals: ['graduate', 'btech'], url: 'https://rect.crpf.gov.in/' }
    ] },
    { title: 'Central Industrial Security Force', eyebrow: 'CISF', description: 'Industrial security, fire, driver and specialist recruitments.', url: 'https://cisfrectt.cisf.gov.in/', routes: [
      { title: 'Constable, fire & driver posts', note: 'Education, licence and physical standards vary by post.', quals: ['10th', '12th', 'iti'], url: 'https://cisfrectt.cisf.gov.in/' },
      { title: 'ASI, SI & specialist entries', note: 'Check the current CISF notice for the exact qualification.', quals: ['12th', 'graduate', 'diploma'], url: 'https://cisfrectt.cisf.gov.in/' }
    ] },
    { title: 'Indo-Tibetan Border Police', eyebrow: 'ITBP', description: 'Border, technical, medical and specialist recruitments.', url: 'https://recruitment.itbpolice.nic.in/', routes: [
      { title: 'Constable & technical posts', note: 'Post-specific education and trade requirements apply.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://recruitment.itbpolice.nic.in/' },
      { title: 'SI, specialist & officer entries', note: 'Use the current ITBP notice for exact requirements.', quals: ['graduate', 'btech'], url: 'https://recruitment.itbpolice.nic.in/' }
    ] },
    { title: 'Sashastra Seema Bal', eyebrow: 'SSB', description: 'Constable, technical, subordinate and specialist opportunities.', url: 'https://recruitment.ssb.gov.in/', routes: [
      { title: 'Constable & trade posts', note: 'Trade and education criteria vary by advertised post.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://recruitment.ssb.gov.in/' },
      { title: 'SI, specialist & officer entries', note: 'Confirm exact qualifications from the active SSB notice.', quals: ['graduate', 'btech'], url: 'https://recruitment.ssb.gov.in/' }
    ] },
    { title: 'Assam Rifles', eyebrow: 'AR', description: 'Rifleman, technical, trades and other advertised posts.', url: 'https://www.assamrifles.gov.in/', routes: [
      { title: 'Rifleman & trade posts', note: 'Education and trade requirements depend on the advertisement.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://www.assamrifles.gov.in/' },
      { title: 'Technical & other entries', note: 'Check the latest Assam Rifles recruitment notice.', quals: ['12th', 'diploma', 'graduate'], url: 'https://www.assamrifles.gov.in/' }
    ] },
    { title: 'CAPF Assistant Commandant', eyebrow: 'UPSC · CAPF', description: 'Officer recruitment for Central Armed Police Forces through UPSC.', url: 'https://www.upsc.gov.in/examinations', routes: [
      { title: 'CAPF (Assistant Commandant)', note: 'Degree, age, physical and other conditions are defined in each notice.', quals: ['graduate'], url: 'https://www.upsc.gov.in/examinations' }
    ] },
    { title: 'Railway Protection Force', eyebrow: 'RPF', description: 'Constable and Sub-Inspector recruitment when notified.', url: 'https://www.rrbcdg.gov.in/', routes: [
      { title: 'Constable', note: 'Check the current recruitment notice for education and physical criteria.', quals: ['10th'], url: 'https://www.rrbcdg.gov.in/' },
      { title: 'Sub-Inspector', note: 'Degree and other requirements are set by the applicable notice.', quals: ['graduate'], url: 'https://www.rrbcdg.gov.in/' }
    ] },
    { title: 'State Police', eyebrow: 'STATE RECRUITMENT', description: 'State police constable, SI and specialist opportunities.', url: 'https://police.gov.in/', routes: [
      { title: 'Constable & technical posts', note: 'State, post and notice determine qualification and standards.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://police.gov.in/' },
      { title: 'Sub-Inspector & specialist posts', note: 'Use your state police or PSC recruitment notice for exact criteria.', quals: ['graduate'], url: 'https://police.gov.in/' }
    ] }
  ];

  const careerGroups = [
    {
      sector: 'upsc', title: 'Civil services & national recruitment', eyebrow: 'UPSC',
      description: 'Administrative, diplomatic, forest, engineering, medical and other central services.',
      routes: [
        { title: 'Civil Services (IAS / IPS / IFS)', note: 'Civil Services Examination', quals: ['graduate'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'Indian Forest Service', note: 'Subject-specific degree requirements apply.', quals: ['bsc', 'btech', 'graduate'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'Engineering Services', note: 'Engineering discipline-specific recruitment.', quals: ['btech', 'diploma'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'Combined Geo-Scientist', note: 'Relevant science/engineering qualifications.', quals: ['bsc', 'btech', 'postgraduate'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'CAPF Assistant Commandant', note: 'Officer entry for Central Armed Police Forces.', quals: ['graduate'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'Combined Medical Services', note: 'Medical qualification and registration required.', quals: ['mbbs'], url: 'https://www.upsc.gov.in/examinations' }
      ]
    },
    {
      sector: 'ssc', title: 'Staff Selection Commission', eyebrow: 'SSC',
      description: 'Central ministries, departments, offices and uniformed recruitment.',
      routes: [
        { title: 'CGL', note: 'Graduate-level posts', quals: ['graduate'], url: 'https://ssc.gov.in/' },
        { title: 'CHSL', note: 'Higher-secondary-level posts', quals: ['12th'], url: 'https://ssc.gov.in/' },
        { title: 'MTS / Havaldar', note: 'Matriculation-level posts', quals: ['10th'], url: 'https://ssc.gov.in/' },
        { title: 'GD Constable', note: 'CAPF and other notified forces', quals: ['10th'], url: 'https://ssc.gov.in/' },
        { title: 'Junior Engineer', note: 'Relevant engineering diploma/degree', quals: ['diploma', 'btech'], url: 'https://ssc.gov.in/' },
        { title: 'CPO / Stenographer', note: 'Graduate or Class 12 route, respectively', quals: ['12th', 'graduate'], url: 'https://ssc.gov.in/' }
      ]
    },
    {
      sector: 'railways', title: 'Railway recruitment', eyebrow: 'RRB / RRC',
      description: 'Operating, technical, clerical, engineering and protection roles.',
      routes: [
        { title: 'NTPC', note: 'Undergraduate and graduate posts', quals: ['12th', 'graduate'], url: 'https://www.rrbcdg.gov.in/' },
        { title: 'Assistant Loco Pilot', note: 'Relevant ITI/diploma requirements', quals: ['iti', 'diploma'], url: 'https://www.rrbcdg.gov.in/' },
        { title: 'Junior Engineer', note: 'Relevant engineering qualification', quals: ['diploma', 'btech'], url: 'https://www.rrbcdg.gov.in/' },
        { title: 'Technician', note: 'Trade and post-specific requirements', quals: ['10th', 'iti', 'diploma'], url: 'https://www.rrbcdg.gov.in/' },
        { title: 'Group D / Level 1', note: 'Entry-level posts; notice controls criteria', quals: ['10th', 'iti'], url: 'https://www.rrbcdg.gov.in/' },
        { title: 'RPF', note: 'Railway Protection Force', quals: ['10th', 'graduate'], url: 'https://www.rrbcdg.gov.in/' }
      ]
    },
    {
      sector: 'banking', title: 'Banking & finance', eyebrow: 'BANKING',
      description: 'Public-sector banks, regional rural banks and financial institutions.',
      routes: [
        { title: 'IBPS PO / Clerk', note: 'Common recruitment processes', quals: ['graduate'], url: 'https://www.ibps.in/' },
        { title: 'IBPS RRB', note: 'Office Assistant and Officer Scale posts', quals: ['graduate'], url: 'https://www.ibps.in/' },
        { title: 'IBPS Specialist Officer', note: 'Role-specific qualifications', quals: ['graduate', 'btech', 'bca', 'bsc'], url: 'https://www.ibps.in/' },
        { title: 'SBI PO / Junior Associate', note: 'Probationary Officer and Clerk', quals: ['graduate'], url: 'https://sbi.co.in/web/careers' },
        { title: 'RBI Grade B / Assistant', note: 'Separate educational criteria by post', quals: ['graduate', 'postgraduate'], url: 'https://opportunities.rbi.org.in/' },
        { title: 'Insurance (LIC / NIACL)', note: 'Administrative and development roles', quals: ['graduate'], url: 'https://licindia.in/careers' }
      ]
    },
    {
      sector: 'teaching', title: 'Teaching & education', eyebrow: 'EDUCATION',
      description: 'Teacher eligibility, school recruitment and academic careers.',
      routes: [
        { title: 'CTET', note: 'Teacher eligibility; teacher-training rules apply.', quals: ['12th', 'teaching'], url: 'https://ctet.nic.in/' },
        { title: 'KVS / NVS', note: 'Teaching and non-teaching posts', quals: ['graduate', 'postgraduate', 'teaching'], url: 'https://kvsangathan.nic.in/' },
        { title: 'State TET / Teacher recruitment', note: 'State-specific eligibility and training rules', quals: ['12th', 'graduate', 'teaching'], url: 'https://ctet.nic.in/' },
        { title: 'UGC NET / JRF', note: 'Postgraduate-level academic eligibility', quals: ['postgraduate'], url: 'https://ugcnet.nta.ac.in/' }
      ]
    },
    {
      sector: 'state', title: 'State services & police', eyebrow: 'STATE PSC',
      description: 'Administrative services, state departments and state police recruitment.',
      routes: [
        { title: 'BPSC / UPPSC / State PSCs', note: 'State civil and allied services', quals: ['graduate'], url: 'https://bpsc.bihar.gov.in/' },
        { title: 'Bihar Police (CSBC)', note: 'Constable and advertised posts', quals: ['10th', '12th'], url: 'https://csbc.bihar.gov.in/' },
        { title: 'Bihar Police (BPSSC)', note: 'Sub-Inspector and other notified posts', quals: ['graduate'], url: 'https://bpssc.bihar.gov.in/' },
        { title: 'State departmental posts', note: 'Clerical, technical and specialist openings', quals: ['10th', '12th', 'diploma', 'graduate'], url: 'https://bpsc.bihar.gov.in/' }
      ]
    },
    {
      sector: 'technical', title: 'Technical, science & PSU', eyebrow: 'ENGINEERING / SCIENCE',
      description: 'Space, defence research, atomic energy, aviation and public-sector technical roles.',
      routes: [
        { title: 'ISRO', note: 'Scientist, engineer, technician and research openings', quals: ['btech', 'bsc', 'diploma', 'postgraduate'], url: 'https://www.isro.gov.in/Careers.html' },
        { title: 'DRDO', note: 'Scientist, technical and apprentice roles', quals: ['btech', 'bsc', 'diploma', 'postgraduate'], url: 'https://www.drdo.gov.in/' },
        { title: 'BARC', note: 'Scientific and technical recruitment', quals: ['btech', 'bsc', 'diploma', 'postgraduate'], url: 'https://www.barc.gov.in/careers.html' },
        { title: 'AAI', note: 'Junior executive and other airport authority posts', quals: ['12th', 'diploma', 'btech', 'graduate'], url: 'https://www.aai.aero/en/careers' },
        { title: 'PSUs through GATE', note: 'Only participating PSUs and listed disciplines', quals: ['btech'], url: 'https://gate2026.iitg.ac.in/' }
      ]
    },
    {
      sector: 'entrance', title: 'Entrance & higher education', eyebrow: 'NTA / UNIVERSITY',
      description: 'Admission tests and academic entry routes after school or graduation.',
      routes: [
        { title: 'JEE Main / Advanced', note: 'Engineering admission; subject and attempt rules apply.', quals: ['12th'], url: 'https://jeemain.nta.nic.in/' },
        { title: 'NEET UG', note: 'Medical and allied admission; subject rules apply.', quals: ['12th'], url: 'https://neet.nta.nic.in/' },
        { title: 'CUET UG', note: 'University admission across participating institutions.', quals: ['12th'], url: 'https://cuet.nta.nic.in/' },
        { title: 'CLAT UG / PG', note: 'Law admission; UG and PG routes differ.', quals: ['12th', 'law', 'graduate'], url: 'https://consortiumofnlus.ac.in/' },
        { title: 'NIFT / NATA', note: 'Design and architecture admission routes', quals: ['12th'], url: 'https://exams.nta.ac.in/' },
        { title: 'GATE', note: 'Postgraduate study and selected recruitment pathways', quals: ['btech', 'bsc', 'graduate'], url: 'https://gate2026.iitg.ac.in/' }
      ]
    },
    {
      sector: 'health', title: 'Healthcare & paramedical', eyebrow: 'HEALTH',
      description: 'Nursing, medical, laboratory and allied healthcare recruitment.',
      routes: [
        { title: 'AIIMS NORCET', note: 'Nursing officer recruitment; nursing qualification required.', quals: ['nursing'], url: 'https://www.aiimsexams.ac.in/' },
        { title: 'Medical officer roles', note: 'MBBS and registration requirements vary by notice.', quals: ['mbbs'], url: 'https://www.upsc.gov.in/recruitment' },
        { title: 'Paramedical & lab roles', note: 'Relevant diploma or degree by post', quals: ['diploma', 'bsc', 'paramedical'], url: 'https://www.aiimsexams.ac.in/' }
      ]
    },
    {
      sector: 'law', title: 'Law & judiciary', eyebrow: 'LEGAL SERVICES',
      description: 'Judicial services, prosecution and legal support roles.',
      routes: [
        { title: 'State Judicial Services', note: 'Law degree and state-specific conditions', quals: ['law'], url: 'https://www.bpsc.bihar.gov.in/' },
        { title: 'Assistant Prosecution Officer', note: 'Law degree; state rules vary', quals: ['law'], url: 'https://bpssc.bihar.gov.in/' },
        { title: 'CLAT PG', note: 'Postgraduate law admission route', quals: ['law', 'graduate'], url: 'https://consortiumofnlus.ac.in/' }
      ]
    },
    {
      sector: 'insurance', title: 'Insurance, EPFO & other central roles', eyebrow: 'OTHER RECRUITMENT',
      description: 'Regulatory, social-security, insurance and specialist central openings.',
      routes: [
        { title: 'EPFO / ESIC', note: 'Administrative and specialist recruitment', quals: ['graduate', 'btech', 'bca', 'bsc'], url: 'https://www.epfindia.gov.in/' },
        { title: 'LIC / General insurance', note: 'Assistant, AAO, ADO and specialist posts', quals: ['graduate'], url: 'https://licindia.in/careers' },
        { title: 'Central department vacancies', note: 'Post-specific clerical, technical and research roles', quals: ['10th', '12th', 'iti', 'diploma', 'graduate', 'postgraduate'], url: 'https://upsc.gov.in/recruitment' }
      ]
    }
  ];

  const state = { items: [], archived: [], generatedAt: null, loading: true, refreshing: false, feedAvailable: false, archiveAvailable: false, feedSource: '', feedError: '', feedRefreshFailed: false, sourceStatus: null, showAllArchive: false };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function safeUrl(value) {
    const url = String(value || '');
    try {
      const parsed = new URL(url);
      return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password ? url : '';
    } catch (error) {
      return '';
    }
  }

  function parseDate(value) {
    return DATA.parseDate(value);
  }

  function today() {
    return DATA.parseDate(new Date());
  }

  function dayDiff(later, earlier) {
    return Math.round((later.getTime() - earlier.getTime()) / 86400000);
  }

  function fmtDate(value) {
    const date = parseDate(value);
    return date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  }

  function itemText(item) {
    return [item.title, item.organization, item.category, item.type, item.status, item.summary, item.sourceName,
      item.eligibility, item.qualification, item.qualifications, item.education].map(function (value) {
      return Array.isArray(value) ? value.join(' ') : String(value || '');
    }).join(' ').toLowerCase();
  }

  function sectorFor(item) {
    return DATA.sectorFor(item);
  }

  function normalizeQualifications(values) {
    return DATA.normalizeQualifications(values);
  }

  function qualificationsFor(item) {
    return DATA.qualificationsFor(item);
  }

  function qualMatches(tags, selected) {
    return DATA.qualificationMatches(tags, selected);
  }

  function controls() {
    return {
      query: String(root.querySelector('#vxSearch')?.value || '').trim().toLowerCase(),
      qualification: root.querySelector('#vxQualification')?.value || 'all',
      sector: root.querySelector('#vxSector')?.value || 'all'
    };
  }

  function matches(item, filters) {
    return (filters.sector === 'all' || sectorFor(item) === filters.sector) &&
      qualMatches(qualificationsFor(item), filters.qualification) &&
      (!filters.query || itemText(item).includes(filters.query));
  }

  function classify(item) {
    return DATA.classify(item, today());
  }

  function reasonForArchive(item) {
    const end = DATA.applicationDates(item).end;
    const exam = parseDate(item.examDate || item.examinationDate);
    const now = today();
    if (item.archiveReason) return String(item.archiveReason).replace(/[-_]+/g, ' ');
    if (item.archivedAt) return 'Historical notice';
    if (/\b(results?|admit cards?|e-?admit cards?|hall tickets?|answer keys?|score cards?|merit lists?)\b/.test(itemText(item))) return 'Post-exam update';
    if (end && end < now) return 'Application deadline crossed';
    if (exam && exam < now) return 'Exam date passed';
    if (/\b(closed|expired|completed|withdrawn)\b/.test(String(item.status || '').toLowerCase())) return 'Application cycle closed';
    return 'Older notice';
  }

  function dateSort(a, b) {
    return DATA.compareExamDates(a, b);
  }

  function uniqueItems(items) {
    const seen = new Set();
    return DATA.normalizeItems(items).filter(function (item) {
      const key = String(item.id || (item.title || '') + '|' + (item.url || '')).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function qualificationsMarkup(tags) {
    const labels = (Array.isArray(tags) ? tags : []).map(function (tag) { return QUAL_LABELS[tag]; }).filter(Boolean);
    return labels.length
      ? '<div class="vx-tags">' + labels.map(function (label) { return '<span class="vx-tag">' + esc(label) + '</span>'; }).join('') + '</div>'
      : '<div class="vx-tags"><span class="vx-tag muted">Eligibility in notice</span></div>';
  }

  function noticeCard(item, lane) {
    const title = item.title || 'Official examination update';
    const category = String(item.category || 'Government').replace(/[_-]+/g, ' ');
    const organization = item.organization || item.sourceName || 'Official source';
    const url = safeUrl(item.url || item.sourceUrl);
    const applicationWindow = DATA.applicationDates(item);
    const start = applicationWindow.start;
    const end = applicationWindow.end;
    const exam = item.examDate || item.examinationDate;
    const notice = item.notificationDate || item.publishedAt || item.date;
    const now = today();
    const endDate = parseDate(end);
    const days = endDate ? dayDiff(endDate, now) : null;
    const confidence = DATA.examDateConfidence(item);
    const upcomingLabel = confidence === 'confirmed' ? 'UPCOMING · CONFIRMED DATE' :
      confidence === 'tentative' ? 'UPCOMING · TENTATIVE DATE' : 'UPCOMING · VERIFY DATE';
    const statusLabel = lane === 'near' ? 'DEADLINE NEAR' : lane === 'ongoing' ? 'APPLICATION OPEN' : upcomingLabel;
    const details = [];
    if (start && fmtDate(start)) details.push(['Opening date', fmtDate(start)]);
    if (end && fmtDate(end)) details.push(['Closing date', fmtDate(end)]);
    if (exam && fmtDate(exam)) details.push(['Exam date', fmtDate(exam)]);
    if (!start && !end && !exam && notice && fmtDate(notice)) details.push(['Notice date', fmtDate(notice)]);
    const detailsMarkup = details.length
      ? '<div class="vx-card-dates">' + details.map(function (pair) {
        return '<div><small>' + esc(pair[0]) + '</small><strong>' + esc(pair[1]) + '</strong></div>';
      }).join('') + '</div>'
      : '';
    const summary = item.summary || 'Open the official source and check the full notice before applying.';
    return '<article class="vx-notice-card vx-' + lane + '">' +
      '<div class="vx-card-top"><span class="vx-status">' + statusLabel + '</span><span class="vx-org">' + esc(organization) + ' · ' + esc(category) + '</span></div>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(summary) + '</p>' +
      detailsMarkup + qualificationsMarkup(qualificationsFor(item)) +
      '<div class="vx-card-bottom"><span class="vx-card-hint">' + esc(lane === 'near' ? (days === 0 ? 'Closes today' : 'Closes in ' + days + ' days') : lane === 'ongoing' ? 'Applications open' : 'Date announced') + '</span>' +
      (url ? '<a class="vx-link-btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Official notice <span aria-hidden="true">↗</span></a>' : '') +
      '</div></article>';
  }

  function renderLane(lane, filters) {
    const suffix = lane === 'near' ? 'Near' : lane.charAt(0).toUpperCase() + lane.slice(1);
    const list = root.querySelector('#vx' + suffix + 'List');
    const count = root.querySelector('#vx' + suffix + 'Count');
    if (!list) return 0;
    const items = state.items.filter(function (item) { return classify(item) === lane && matches(item, filters); });
    const section = list.closest('.vx-lane');
    if (section) section.classList.toggle('vx-lane-is-empty', items.length === 0);
    items.sort(function (a, b) {
      if (lane === 'near') {
        const da = DATA.applicationDates(a).end;
        const db = DATA.applicationDates(b).end;
        return (da ? da.getTime() : Infinity) - (db ? db.getTime() : Infinity);
      }
      const da = parseDate(a.examDate || a.examinationDate || a.applicationStartDate || a.notificationDate || a.lastDate);
      const db = parseDate(b.examDate || b.examinationDate || b.applicationStartDate || b.notificationDate || b.lastDate);
      if (!da && !db) return String(a.title || '').localeCompare(String(b.title || ''));
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
    if (count) count.textContent = String(items.length);
    const hasFilters = Boolean(filters.query || filters.qualification !== 'all' || filters.sector !== 'all');
    const emptyTitle = state.loading ? 'Syncing official notices…' : hasFilters ? 'No matching notices' :
      lane === 'near' ? 'No deadlines within 7 days' :
      lane === 'ongoing' ? 'No applications open beyond the 7-day window' : 'No upcoming exam notices';
    const emptyHint = state.loading ? 'Loading the latest feed.' : hasFilters ? 'Clear or adjust your filters to see more notices.' :
      lane === 'ongoing' ? 'Closing-soon applications are listed separately in Deadline near.' :
      'Check the official recruitment portals for the latest updates.';
    list.innerHTML = items.length
      ? items.map(function (item) { return noticeCard(item, lane); }).join('')
      : '<div class="vx-empty"><span class="vx-empty-mark">—</span><strong>' + emptyTitle + '</strong><span>' + emptyHint + '</span></div>';
    return items.length;
  }

  function routeMatches(route, filters, groupText, sector) {
    const qualOk = qualMatches(route.quals, filters.qualification);
    const sectorOk = filters.sector === 'all' || filters.sector === sector;
    const routeText = [route.title, route.note, route.quals.map(function (tag) { return QUAL_LABELS[tag] || tag; }).join(' ')].join(' ').toLowerCase();
    const queryOk = !filters.query || groupText.includes(filters.query) || routeText.includes(filters.query);
    return qualOk && sectorOk && queryOk;
  }

  function routeMarkup(route) {
    const url = safeUrl(route.url);
    return '<div class="vx-route"><div class="vx-route-main"><strong>' + esc(route.title) + '</strong><span>' + esc(route.note) + '</span>' +
      '<div class="vx-tags">' + route.quals.map(function (tag) { return '<span class="vx-tag">' + esc(QUAL_LABELS[tag] || tag) + '</span>'; }).join('') + '</div></div>' +
      (url ? '<a class="vx-route-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Open official portal for ' + esc(route.title) + '">↗</a>' : '') + '</div>';
  }

  function forceCardMarkup(group, filters) {
    const groupText = [group.title, group.eyebrow, group.description].join(' ').toLowerCase();
    const routes = group.routes.filter(function (route) { return routeMatches(route, filters, groupText, 'defence'); });
    if (!routes.length) return '';
    return '<article class="vx-force-card"><div class="vx-force-head"><span class="vx-force-mark" aria-hidden="true">' +
      '<svg viewBox="0 0 40 40" role="presentation"><path d="M20 3 33 8v10c0 9-5.5 15-13 19C12.5 33 7 27 7 18V8z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m13 20 5 5 10-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</span><div><span class="vx-eyebrow">' + esc(group.eyebrow) + '</span><h3>' + esc(group.title) + '</h3></div></div>' +
      '<p class="vx-force-desc">' + esc(group.description) + '</p><div class="vx-routes">' + routes.map(routeMarkup).join('') + '</div>' +
      '<a class="vx-force-portal" href="' + esc(safeUrl(group.url)) + '" target="_blank" rel="noopener noreferrer">Official recruitment portal <span aria-hidden="true">↗</span></a></article>';
  }

  function careerCardMarkup(group, filters) {
    const groupText = [group.title, group.eyebrow, group.description].join(' ').toLowerCase();
    const routes = group.routes.filter(function (route) { return routeMatches(route, filters, groupText, group.sector); });
    if (!routes.length) return '';
    return '<article class="vx-career-card"><div class="vx-career-head"><span class="vx-eyebrow">' + esc(group.eyebrow) + '</span><span class="vx-career-arrow" aria-hidden="true">↗</span></div>' +
      '<h3>' + esc(group.title) + '</h3><p>' + esc(group.description) + '</p><div class="vx-career-routes">' + routes.map(routeMarkup).join('') + '</div></article>';
  }

  function renderCareers(filters) {
    const forces = root.querySelector('#vxForcesGrid');
    const uniformed = root.querySelector('#vxUniformedGrid');
    const careers = root.querySelector('#vxCareerGrid');
    if (forces) forces.innerHTML = forceGroups.map(function (group) { return forceCardMarkup(group, filters); }).join('') ||
      '<div class="vx-empty"><strong>No Armed Forces routes match these filters.</strong><span>Choose a different qualification or sector.</span></div>';
    if (uniformed) uniformed.innerHTML = uniformedGroups.map(function (group) { return forceCardMarkup(group, filters); }).join('') ||
      '<div class="vx-empty"><strong>No uniformed-service routes match these filters.</strong><span>Choose a different qualification or sector.</span></div>';
    if (careers) careers.innerHTML = careerGroups.map(function (group) { return careerCardMarkup(group, filters); }).join('') ||
      '<div class="vx-empty"><strong>No career routes match these filters.</strong><span>Choose a different qualification or sector.</span></div>';
  }

  function renderExamDates(filters) {
    const mount = root.querySelector('#vxExamDatesList');
    const count = root.querySelector('#vxExamDatesCount');
    if (!mount) return;
    const items = uniqueItems(state.items.concat(state.archived)).filter(function (item) {
      return DATA.isFutureExamDate(item, today()) && matches(item, filters);
    }).sort(dateSort);
    if (count) count.textContent = String(items.length).padStart(2, '0');
    if (!items.length) {
      mount.innerHTML = '<div class="vx-empty"><span class="vx-empty-mark">▦</span><strong>No future exam dates match</strong><span>Only dates present in the notice feed are shown. Check the relevant official calendar for further dates.</span></div>';
      return;
    }

    const months = new Map();
    items.forEach(function (item) {
      const date = parseDate(item.examDate || item.examinationDate);
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      if (!months.has(key)) months.set(key, { title: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), items: [] });
      months.get(key).items.push(item);
    });

    mount.innerHTML = Array.from(months.values()).map(function (month) {
      const rows = month.items.map(function (item) {
        const date = parseDate(item.examDate || item.examinationDate);
        const confidence = DATA.examDateConfidence(item);
        const confidenceLabel = confidence === 'confirmed' ? 'CONFIRMED · OFFICIAL NOTICE' :
          confidence === 'tentative' ? 'TENTATIVE · CALENDAR' : 'UNVERIFIED · CHECK SOURCE';
        const confidenceNote = confidence === 'confirmed'
          ? 'Date explicitly marked confirmed; verify any later corrigendum.'
          : confidence === 'tentative'
            ? 'Calendar schedule; verify against the individual notification.'
            : 'The feed does not confirm this date; verify on the official portal.';
        const url = safeUrl(item.url || item.sourceUrl);
        return '<article class="vx-date-row"><div class="vx-date-block"><strong>' + esc(date.toLocaleDateString('en-IN', { day: '2-digit' })) + '</strong><span>' + esc(date.toLocaleDateString('en-IN', { month: 'short' })) + '</span><small>' + esc(date.getFullYear()) + '</small></div>' +
          '<div class="vx-date-info"><span class="vx-date-tag vx-date-' + confidence + '">' + confidenceLabel + '</span><h4>' + esc(item.title || 'Examination') + '</h4>' +
          '<p>' + esc(item.organization || item.sourceName || 'Exam authority') + ' · ' + esc(confidenceNote) + '</p></div>' +
          (url ? '<a class="vx-route-link vx-date-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Verify exam date for ' + esc(item.title || 'examination') + '">↗</a>' : '') +
          '</article>';
      }).join('');
      return '<div class="vx-date-month" role="group" aria-label="' + esc(month.title) + '"><h3 class="vx-date-month-title">' + esc(month.title) + '</h3><div class="vx-date-month-items">' + rows + '</div></div>';
    }).join('');
  }

  function renderArchive(filters) {
    const mount = root.querySelector('#vxArchiveGrid');
    const count = root.querySelector('#vxArchiveCount');
    const more = root.querySelector('#vxArchiveMore');
    if (!mount) return;
    const items = uniqueItems(state.archived.concat(state.items.filter(function (item) { return classify(item) === 'archive'; })))
      .filter(function (item) { return matches(item, filters); })
      .sort(function (a, b) {
        const da = parseDate(a.lastDate || a.examDate || a.notificationDate || a.archivedAt);
        const db = parseDate(b.lastDate || b.examDate || b.notificationDate || b.archivedAt);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });
    if (count) count.textContent = items.length + (items.length === 1 ? ' item' : ' items');
    const limit = state.showAllArchive ? items.length : 12;
    mount.innerHTML = items.length ? items.slice(0, limit).map(function (item) {
      const url = safeUrl(item.url || item.sourceUrl);
      const detail = fmtDate(DATA.applicationDates(item).end) || fmtDate(item.examDate || item.notificationDate);
      return '<article class="vx-archive-card"><div class="vx-archive-top"><span>ARCHIVED</span><small>' + esc(detail || fmtDate(item.archivedAt) || 'Historical') + '</small></div>' +
        '<h3>' + esc(item.title || 'Historical recruitment notice') + '</h3><p>' + esc(item.organization || item.sourceName || 'Official source') + ' · ' + esc(reasonForArchive(item)) + '</p>' +
        (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open source ↗</a>' : '') + '</article>';
    }).join('') : '<div class="vx-empty"><strong>' + (state.loading ? 'Loading archive…' : state.archiveAvailable ? 'No archived notices match' : 'Archive temporarily unavailable') + '</strong><span>' + (state.loading ? 'Checking the notification history.' : state.archiveAvailable ? 'Archived notices appear here when their dates pass or the source marks them closed.' : 'Try again later or use the official recruitment portals above.') + '</span></div>';
    if (more) {
      more.hidden = items.length <= 12;
      more.textContent = state.showAllArchive ? 'Show fewer archived notices' : 'Show all ' + items.length + ' archived notices';
    }
  }

  function renderSourceManagement() {
    const report = state.sourceStatus;
    const health = root.querySelector('#vxFeedHealth');
    const detail = root.querySelector('#vxFeedSummary');
    const refresh = root.querySelector('#vxRefreshFeed');
    const summary = root.querySelector('#vxSourceSummary');
    const list = root.querySelector('#vxSourceList');
    const panel = root.querySelector('.vx-ops-strip');
    if (!panel) return;

    const total = report && Number.isInteger(report.sourcesTotal) ? report.sourcesTotal : 0;
    const ok = report && Number.isInteger(report.sourcesOk) ? report.sourcesOk : 0;
    const checked = report && report.checkedAt ? new Date(report.checkedAt) : null;
    const checkedValid = checked && !Number.isNaN(checked.valueOf());
    const stale = Boolean(report) && (!checkedValid || Date.now() - checked.valueOf() > 90 * 60 * 1000);
    let tone = 'unknown';
    let title = 'Source report unavailable';
    if (state.refreshing) {
      title = 'Refreshing the latest feed…';
    } else if (state.feedRefreshFailed && state.feedAvailable) {
      tone = 'stale';
      title = 'Refresh failed · showing last loaded data';
    } else if (state.feedRefreshFailed) {
      title = 'Feed unavailable · check official portals';
    } else if (report && total > 0 && ok === total && !stale) {
      tone = 'healthy';
      title = 'All configured sources responded';
    } else if (report && ok > 0 && !stale) {
      tone = 'partial';
      title = 'Partial source coverage';
    } else if (report && stale) {
      tone = 'stale';
      title = 'Source report is stale';
    } else if (report && total > 0 && ok === 0) {
      title = 'No source responded on the last check';
    }
    panel.classList.toggle('is-healthy', tone === 'healthy');
    panel.classList.toggle('is-partial', tone === 'partial');
    panel.classList.toggle('is-stale', tone === 'stale');
    panel.classList.toggle('is-unknown', tone === 'unknown');
    if (health) health.textContent = title;
    const origin = state.feedSource === 'worker' ? 'Cloudflare Worker feed' :
      state.feedSource === 'snapshot' ? 'bundled fallback snapshot' : 'feed not loaded';
    const stamp = checkedValid ? checked.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'check time unavailable';
    const coverage = total ? ok + '/' + total + ' sources reachable' : 'Source availability is not reported';
    const fallbackNote = state.feedSource === 'snapshot' && state.feedError ? ' · live service unavailable; using snapshot' : '';
    const retainedNote = state.feedRefreshFailed && state.feedAvailable ? ' · last loaded data retained' : '';
    if (detail) detail.textContent = [coverage, origin + fallbackNote + retainedNote, checkedValid ? 'last checked ' + stamp + (stale ? ' · stale' : '') : ''].filter(Boolean).join(' · ');
    if (refresh) {
      refresh.disabled = state.refreshing;
      refresh.setAttribute('aria-busy', String(state.refreshing));
      refresh.textContent = state.refreshing ? 'Checking…' : '↻ Refresh feed';
    }
    if (summary) summary.textContent = total ? 'Source report (' + ok + '/' + total + ')' : 'Source report';
    if (list) {
      const sources = report && Array.isArray(report.sources) ? report.sources : [];
      list.innerHTML = sources.length ? '<ul>' + sources.map(function (source) {
        return '<li class="vx-source-entry ' + (source.ok ? 'is-ok' : 'is-failed') + '"><span class="vx-source-name">' + esc(source.source || 'Official source') + '</span>' +
          '<span class="vx-source-result">' + (source.ok ? 'Reachable · ' + Number(source.found || 0) + ' matches' : 'Failed · ' + esc(source.error || 'Request failed')) + '</span>' +
          '<small>' + (Number(source.durationMs) > 0 ? Math.round(Number(source.durationMs)) + ' ms' : 'Duration unavailable') + '</small></li>';
      }).join('') + '</ul>' : '<p>Source-level diagnostics are unavailable. Use the official portals to verify current notices.</p>';
    }
  }
  function renderAll() {
    const filters = controls();
    renderSourceManagement();
    const upcoming = renderLane('upcoming', filters);
    const ongoing = renderLane('ongoing', filters);
    const near = renderLane('near', filters);
    renderExamDates(filters);
    renderCareers(filters);
    renderArchive(filters);
    const total = root.querySelector('#vxTotalCount');
    const active = root.querySelector('#vxActiveCount');
    if (total) total.textContent = String(upcoming + ongoing + near);
    if (active) active.textContent = String(state.items.filter(function (item) { return ['upcoming', 'ongoing', 'near'].includes(classify(item)); }).length);
  }

  const markup = [
    '<div class="vx-shell">',
    '<header class="vx-hero"><div class="vx-hero-copy"><span class="vx-eyebrow vx-hero-kicker">VAANI · CAREER INTELLIGENCE</span><h1 id="ncTitle">Government exam desk</h1>',
    '<p>One clear place for exam schedules, application windows and career routes. Separate what is coming, what is open and what is closing.</p>',
    '<div class="vx-hero-chips"><span>Official sources first</span><span>Dates separated from notices</span><span>Expired cycles archived</span></div></div>',
    '<div class="vx-hero-visual" aria-hidden="true"><div class="vx-orbit vx-orbit-a"></div><div class="vx-orbit vx-orbit-b"></div>',
    '<div class="vx-hero-emblem"><svg viewBox="0 0 100 100" role="presentation"><path d="M50 7 82 19v24c0 22-13 39-32 50C31 82 18 65 18 43V19z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M34 51 45 62 68 36" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="vx-hero-visual-label">FIND · VERIFY · APPLY</div></div>',
    '<div class="vx-hero-foot"><span><b id="vxTotalCount">00</b><small>actionable notices</small></span><span><b id="vxActiveCount">00</b><small>current / scheduled</small></span><span class="vx-sync" id="vxSyncStamp">Syncing official feeds…</span></div></header>',
    '<section class="vx-ops-strip" aria-label="Notification feed management"><div class="vx-ops-summary"><span class="vx-ops-dot" id="vxOpsDot" aria-hidden="true"></span><div class="vx-ops-copy"><span class="vx-ops-kicker">FEED MANAGEMENT</span><strong id="vxFeedHealth" aria-live="polite">Checking source health…</strong><small id="vxFeedSummary">Checking the Worker feed and the latest snapshot.</small></div></div><div class="vx-ops-actions"><button type="button" class="vx-refresh" id="vxRefreshFeed">↻ Refresh feed</button><details class="vx-source-report" id="vxSourceReport"><summary id="vxSourceSummary">Source report</summary><div class="vx-source-list" id="vxSourceList"><p>Loading source report…</p></div></details></div></section>',
    '<nav class="vx-jump" aria-label="Exam desk sections"><button type="button" data-vx-jump="vx-upcoming">Upcoming</button><button type="button" data-vx-jump="vx-ongoing">Ongoing</button><button type="button" data-vx-jump="vx-near">Deadline near</button><button type="button" data-vx-jump="vx-exam-dates">Exam dates</button><button type="button" data-vx-jump="vx-defence">Defence corner</button><button type="button" data-vx-jump="vx-careers">Career map</button><button type="button" data-vx-jump="vx-archive">Archive</button></nav>',
    '<section class="vx-filter-panel" id="vxFilterPanel" aria-label="Search and filter exams"><div class="vx-filter-heading"><div><span class="vx-eyebrow">SMART DIRECTORY</span><h2>Find your next route</h2><p>Search exams or narrow notices and career paths by qualification and sector.</p></div><button type="button" class="vx-reset" id="vxReset">Reset filters</button></div>',
    '<div class="vx-controls"><label class="vx-search-wrap"><span>SEARCH EXAMS &amp; CAREERS</span><input id="vxSearch" type="search" placeholder="Try NDA, BCA, NTPC, technician…" autocomplete="off"></label>',
    '<label><span>YOUR QUALIFICATION</span><select id="vxQualification"><option value="all">All qualifications</option>' + DATA.QUALIFICATIONS.map(function (option) { return '<option value="' + esc(option.id) + '">' + esc(option.label) + '</option>'; }).join('') + '</select></label>',
    '<label><span>SECTOR</span><select id="vxSector"><option value="all">All sectors</option>' + DATA.SECTORS.map(function (sector) { return '<option value="' + esc(sector.id) + '">' + esc(sector.label) + '</option>'; }).join('') + '</select></label></div>',
    '<p class="vx-filter-note"><span aria-hidden="true">ⓘ</span> Live-notice qualifications are shown only when the source provides them. Career tags are typical pathways, not eligibility decisions; the current official notice always controls.</p></section>',
    '<section class="vx-lane vx-lane-upcoming" id="vx-upcoming" aria-labelledby="vxUpcomingTitle"><div class="vx-section-heading"><div><span class="vx-section-index">01 / PLANNED</span><h2 id="vxUpcomingTitle">Upcoming examinations</h2><p>Dates announced or scheduled; annual-calendar dates remain tentative until the exam notice.</p></div><span class="vx-lane-count" id="vxUpcomingCount">00</span></div><div class="vx-notice-grid" id="vxUpcomingList" aria-live="polite"></div></section>',
    '<section class="vx-lane vx-lane-ongoing" id="vx-ongoing" aria-labelledby="vxOngoingTitle"><div class="vx-section-heading"><div><span class="vx-section-index">02 / OPEN</span><h2 id="vxOngoingTitle">Ongoing applications</h2><p>Application windows that are currently open and are not within the 7-day closing window.</p></div><span class="vx-lane-count" id="vxOngoingCount">00</span></div><div class="vx-notice-grid" id="vxOngoingList" aria-live="polite"></div></section>',
    '<section class="vx-lane vx-lane-near" id="vx-near" aria-labelledby="vxNearTitle"><div class="vx-section-heading"><div><span class="vx-section-index">03 / PRIORITY</span><h2 id="vxNearTitle">Deadline near</h2><p>Application forms closing today or within 7 days. Check the closing date and official instructions.</p></div><span class="vx-lane-count" id="vxNearCount">00</span></div><div class="vx-notice-grid" id="vxNearList" aria-live="polite"></div></section>',
    '<section class="vx-date-section" id="vx-exam-dates" aria-labelledby="vxExamDatesTitle"><div class="vx-section-heading"><div><span class="vx-section-index">DATEBOARD / SEPARATE VIEW</span><h2 id="vxExamDatesTitle">Exam date calendar</h2><p>Upcoming examination dates in one chronological list, separate from application status.</p></div><span class="vx-lane-count" id="vxExamDatesCount">00</span></div><div class="vx-date-list" id="vxExamDatesList" aria-live="polite"></div></section>',
    '<section class="vx-defence-section" id="vx-defence" aria-labelledby="vxDefenceTitle"><div class="vx-defence-banner"><div><span class="vx-eyebrow">SPECIAL CORNER · UNIFORMED CAREERS</span><h2 id="vxDefenceTitle">Defence &amp; national security</h2><p>Explore military, Coast Guard, CAPF and other uniformed-service pathways in distinct service cards.</p></div><span class="vx-defence-seal" aria-hidden="true">★</span></div>',
    '<div class="vx-subheading"><div><h3>Armed Forces &amp; Coast Guard</h3><p>Army, Navy, Air Force and Coast Guard routes.</p></div><span>01 — 04</span></div><div class="vx-force-grid" id="vxForcesGrid"></div>',
    '<div class="vx-subheading vx-uniformed-heading"><div><h3>CAPF &amp; other uniformed services</h3><p>Each force and recruitment route is listed separately.</p></div><span>05 — 13</span></div><div class="vx-force-grid vx-uniformed-grid" id="vxUniformedGrid"></div></section>',
    '<section class="vx-career-section" id="vx-careers" aria-labelledby="vxCareersTitle"><div class="vx-section-heading"><div><span class="vx-section-index">CAREER MAP / MAJOR ROUTES</span><h2 id="vxCareersTitle">Explore career options</h2><p>Browse central and state services, technical roles, education, healthcare and admission pathways. This directory covers major routes and is not exhaustive.</p></div><span class="vx-map-label">' + careerGroups.length + ' CAREER FAMILIES</span></div><div class="vx-career-grid" id="vxCareerGrid"></div></section>',
    '<details class="vx-archive" id="vx-archive"><summary><span><span class="vx-section-index">REFERENCE / HISTORY</span><strong>Notification archive</strong><small>Closed applications, passed exam cycles and older notices stay here.</small></span><span class="vx-archive-count" id="vxArchiveCount">Loading…</span></summary>',
    '<div class="vx-archive-body"><div class="vx-archive-grid" id="vxArchiveGrid"></div><button type="button" class="vx-archive-more" id="vxArchiveMore" hidden>Show all archived notices</button></div></details>',
    '<p class="vx-disclaimer">VAANI organises publicly available exam information; it does not issue notifications or accept applications. Dates and eligibility can change. Use the official source to confirm every detail before applying.</p>',
    '</div>'
  ].join('');

  function isFeedPayload(value) {
    return Boolean(value && typeof value === 'object' && Array.isArray(value.items));
  }

  function isSourceStatus(value) {
    return Boolean(value && typeof value === 'object' && Number.isInteger(value.sourcesTotal) &&
      Number.isInteger(value.sourcesOk) && Array.isArray(value.sources));
  }

  async function loadJson(urls, validate) {
    const failures = [];
    for (let index = 0; index < urls.length; index++) {
      const url = urls[index];
      try {
        const requestUrl = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
        const response = await fetch(requestUrl, { cache: 'no-store', signal: AbortSignal.timeout(9000) });
        if (!response.ok) {
          failures.push('HTTP ' + response.status);
          continue;
        }
        const data = await response.json();
        if (typeof validate === 'function' && !validate(data)) {
          failures.push('Invalid response structure');
          continue;
        }
        return { data, source: url, error: failures.join('; '), fallback: index > 0 };
      } catch (caught) {
        failures.push(String(caught && caught.message || caught || 'Request failed'));
      }
    }
    return { data: { items: [] }, source: '', error: failures.join('; ') || 'No source available', fallback: false };
  }

  async function refreshData() {
    if (state.refreshing) return;
    state.refreshing = true;
    if (!state.items.length && !state.archived.length) state.loading = true;
    renderSourceManagement();
    try {
      const results = await Promise.all([
        loadJson(feedUrls, isFeedPayload),
        loadJson(archiveUrls, isFeedPayload),
        loadJson(statusUrls, isSourceStatus)
      ]);
      const feedResult = results[0] || {};
      const archiveResult = results[1] || {};
      const statusResult = results[2] || {};
      if (feedResult.source) {
        state.feedRefreshFailed = false;
        state.items = DATA.normalizeItems(feedResult.data);
        state.feedAvailable = true;
        state.feedSource = feedResult.fallback || !API || !feedResult.source.startsWith(API) ? 'snapshot' : 'worker';
        state.feedError = feedResult.error || '';
        state.generatedAt = state.feedSource === 'snapshot' && feedResult.data ? feedResult.data.generatedAt || null : null;
      } else {
        state.feedRefreshFailed = true;
        state.feedError = feedResult.error || 'Feed unavailable';
        if (!state.feedAvailable) state.items = [];
      }
      if (archiveResult.source) {
        state.archived = DATA.normalizeItems(archiveResult.data).filter(function (item) {
          return ['id', 'title', 'organization', 'sourceName', 'category', 'summary', 'url', 'sourceUrl',
            'archivedAt', 'lastDate', 'examDate', 'notificationDate'].some(function (key) {
            return item[key] != null && String(item[key]).trim() !== '';
          });
        });
        state.archiveAvailable = true;
      } else if (!state.archiveAvailable) {
        state.archived = [];
      }
      if (statusResult.source) state.sourceStatus = statusResult.data;
      if (state.sourceStatus && state.sourceStatus.checkedAt) state.generatedAt = state.sourceStatus.checkedAt;
    } catch (error) {
      state.feedError = String(error && error.message || error || 'Refresh failed');
    } finally {
      state.loading = false;
      state.refreshing = false;
      const stamp = root.querySelector('#vxSyncStamp');
      if (stamp) {
        const date = state.generatedAt ? new Date(state.generatedAt) : null;
        const formatted = date && !Number.isNaN(date.valueOf())
          ? date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '';
        stamp.textContent = !state.feedAvailable ? 'Feed unavailable · check official portals' :
          formatted ? 'Last source check ' + formatted : state.feedSource === 'worker' ? 'Live feed connected' : 'Snapshot loaded';
      }
      renderAll();
    }
  }

  function install() {
    root.innerHTML = markup;
    root.querySelectorAll('[data-vx-jump]').forEach(function (button) {
      button.addEventListener('click', function () {
        const target = root.querySelector('#' + button.dataset.vxJump);
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
    ['#vxSearch', '#vxQualification', '#vxSector'].forEach(function (selector) {
      const control = root.querySelector(selector);
      if (control) control.addEventListener(selector === '#vxSearch' ? 'input' : 'change', renderAll);
    });
    root.querySelector('#vxReset')?.addEventListener('click', function () {
      root.querySelector('#vxSearch').value = '';
      root.querySelector('#vxQualification').value = 'all';
      root.querySelector('#vxSector').value = 'all';
      state.showAllArchive = false;
      renderAll();
    });
    root.querySelector('#vxArchiveMore')?.addEventListener('click', function () {
      state.showAllArchive = !state.showAllArchive;
      renderAll();
    });
    root.querySelector('#vxRefreshFeed')?.addEventListener('click', refreshData);
    renderAll();
    refreshData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
