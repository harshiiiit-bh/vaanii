(function () {
  'use strict';

  const root = document.getElementById('view-notifications');
  if (!root) return;

  const API = String(window.VAANI_NOTIFICATIONS_API || '').replace(/\/$/, '');
  const feedUrls = [API ? API + '/api/notifications' : '', 'data/defence-notifications.json'].filter(Boolean);
  const archiveUrls = [API ? API + '/api/notifications/archive' : '', 'data/defence-notifications-archive.json'].filter(Boolean);

  const QUAL_LABELS = {
    '10th': 'Class 10', '12th': 'Class 12', diploma: 'Diploma', iti: 'ITI',
    bca: 'BCA', bsc: 'B.Sc.', btech: 'B.Tech / B.E.', graduate: 'Graduation',
    postgraduate: 'Postgraduate', teaching: 'Teaching qualification', law: 'Law degree',
    mbbs: 'MBBS / Medical', nursing: 'Nursing', paramedical: 'Paramedical'
  };

  const forceGroups = [
    {
      title: 'Indian Army', eyebrow: 'LAND FORCE',
      description: 'Officer and Agniveer routes, with eligibility determined by entry and trade.',
      url: 'https://joinindianarmy.nic.in/',
      routes: [
        { title: 'NDA & NA', note: 'Officer entry after Class 12; stream rules vary by wing.', quals: ['12th'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'CDS', note: 'Officer entry after graduation; academy rules differ.', quals: ['graduate'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'Agniveer', note: 'GD, Technical, Office Assistant and Tradesmen routes.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://joinindianarmy.nic.in/' }
      ]
    },
    {
      title: 'Indian Navy', eyebrow: 'MARITIME FORCE',
      description: 'Officer, technical cadet and Agniveer sailor pathways.',
      url: 'https://www.joinindiannavy.gov.in/',
      routes: [
        { title: 'NDA & NA', note: 'Naval Academy officer route through UPSC; PCM rules apply.', quals: ['12th'], url: 'https://www.upsc.gov.in/examinations' },
        { title: '10+2 B.Tech Cadet Entry', note: 'Technical officer entry; check the course notice for requirements.', quals: ['12th', 'btech'], url: 'https://www.joinindiannavy.gov.in/' },
        { title: 'Agniveer SSR / MR', note: 'Sailor entries with different educational criteria.', quals: ['10th', '12th'], url: 'https://www.joinindiannavy.gov.in/' }
      ]
    },
    {
      title: 'Indian Air Force', eyebrow: 'AIR POWER',
      description: 'Officer and Agniveervayu routes across flying and ground roles.',
      url: 'https://careerairforce.gov.in/',
      routes: [
        { title: 'NDA', note: 'Officer entry after Class 12; subject rules vary by branch.', quals: ['12th'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'AFCAT', note: 'Graduate entry for eligible branches; branch-specific criteria apply.', quals: ['graduate'], url: 'https://afcat.cdac.in/' },
        { title: 'Agniveervayu', note: 'Class 12, vocational and other routes as listed in each notice.', quals: ['12th', 'diploma'], url: 'https://agnipathvayu.cdac.in/AV/' }
      ]
    },
    {
      title: 'Indian Coast Guard', eyebrow: 'MARITIME SECURITY',
      description: 'Navik, Yantrik and officer opportunities through separate notices.',
      url: 'https://www.indiancoastguard.gov.in/',
      routes: [
        { title: 'Navik (GD)', note: 'Class 12 route; subject requirements apply.', quals: ['12th'], url: 'https://www.indiancoastguard.gov.in/' },
        { title: 'Navik (DB)', note: 'Class 10 route; check the current recruitment notice.', quals: ['10th'], url: 'https://www.indiancoastguard.gov.in/' },
        { title: 'Yantrik', note: 'Diploma-based technical route; branch rules vary.', quals: ['diploma'], url: 'https://www.indiancoastguard.gov.in/' }
      ]
    },
    {
      title: 'Central Armed Police Forces', eyebrow: 'CAPF & BORDER SECURITY',
      description: 'Recruitment routes across border, internal-security and industrial-security forces.',
      url: 'https://www.upsc.gov.in/examinations',
      routes: [
        { title: 'BSF', note: 'Constable, technical, trades and officer routes.', quals: ['10th', '12th', 'diploma', 'iti', 'graduate'], url: 'https://rectt.bsf.gov.in/' },
        { title: 'CRPF', note: 'Constable, SI, technical and officer routes.', quals: ['10th', '12th', 'diploma', 'iti', 'graduate'], url: 'https://rect.crpf.gov.in/' },
        { title: 'ITBP', note: 'Constable, SI, technical and specialist recruitments.', quals: ['10th', '12th', 'diploma', 'iti', 'graduate'], url: 'https://recruitment.itbpolice.nic.in/' },
        { title: 'CISF', note: 'Constable, SI, fire and specialist recruitments.', quals: ['10th', '12th', 'diploma', 'iti', 'graduate'], url: 'https://cisfrectt.cisf.gov.in/' },
        { title: 'SSB', note: 'Constable, SI and specialist recruitment notices.', quals: ['10th', '12th', 'diploma', 'iti', 'graduate'], url: 'https://recruitment.ssb.gov.in/advertisementsUrl' },
        { title: 'Assam Rifles', note: 'Rifleman, technical and other advertised posts.', quals: ['10th', '12th', 'diploma', 'iti', 'graduate'], url: 'https://www.assamrifles.gov.in/' },
        { title: 'CAPF Assistant Commandant', note: 'Officer recruitment through UPSC.', quals: ['graduate'], url: 'https://www.upsc.gov.in/examinations' }
      ]
    },
    {
      title: 'Railway & State Police', eyebrow: 'UNIFORMED PUBLIC SERVICE',
      description: 'Railway Protection Force and state-level police recruitment.',
      url: 'https://www.rrbcdg.gov.in/',
      routes: [
        { title: 'RPF', note: 'Constable and Sub-Inspector recruitment when notified.', quals: ['10th', 'graduate'], url: 'https://www.rrbcdg.gov.in/' },
        { title: 'State Police', note: 'Constable, SI and specialist roles; state rules differ.', quals: ['10th', '12th', 'graduate'], url: 'https://csbc.bihar.gov.in/' }
      ]
    }
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

  const state = { items: [], archived: [], generatedAt: null, loading: true, showAllArchive: false };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function safeUrl(value) {
    const url = String(value || '');
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : '';
    } catch (error) {
      return '';
    }
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.valueOf())) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const text = String(value).trim();
    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    const parsed = new Date(text);
    return Number.isNaN(parsed.valueOf()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  function today() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dayDiff(later, earlier) {
    return Math.round((later.getTime() - earlier.getTime()) / 86400000);
  }

  function fmtDate(value) {
    const date = parseDate(value);
    return date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  }

  function itemText(item) {
    return [item.title, item.organization, item.category, item.type, item.status, item.summary, item.sourceName].join(' ').toLowerCase();
  }

  function sectorFor(item) {
    const text = [item.category, item.organization, item.title].join(' ').toLowerCase();
    if (/nda|cds|agniveer|army|navy|air force|afcat|coast guard|bsf|crpf|itbp|cisf|capf|assam rifles|rpf|paramilitary/.test(text)) return 'defence';
    if (/ssc|staff selection|cgl|chsl|mts|stenographer/.test(text)) return 'ssc';
    if (/railway|rrb|ntpc|loco pilot|rpf/.test(text)) return 'railways';
    if (/bank|ibps|sbi|rbi|lic|insurance/.test(text)) return 'banking';
    if (/ctet|kvs|nvs|teacher|teaching|ugc net|jrf/.test(text)) return 'teaching';
    if (/bpsc|uppsc|mppsc|rpsc|jpsc|state psc/.test(text)) return 'state';
    if (/upsc|civil service|forest service|geo-scientist|engineering services/.test(text)) return 'upsc';
    if (/isro|drdo|barc|technical|aai|gate/.test(text)) return 'technical';
    if (/jee|neet|cuet|nta|entrance|clat|nift|nata/.test(text)) return 'entrance';
    if (/medical|nursing|paramedical|aiims|healthcare/.test(text)) return 'health';
    if (/judicial|prosecution|legal/.test(text)) return 'law';
    return 'insurance';
  }

  function normalizeQualifications(values) {
    const raw = Array.isArray(values) ? values.join(' ') : String(values || '');
    const text = raw.toLowerCase();
    const tags = [];
    const add = function (tag) { if (!tags.includes(tag)) tags.push(tag); };
    if (/10th|class\s*10|matric|matriculation|secondary/.test(text)) add('10th');
    if (/12th|class\s*12|10\s*\+\s*2|intermediate|higher secondary|senior secondary/.test(text)) add('12th');
    if (/iti|industrial training institute/.test(text)) add('iti');
    if (/diploma|polytechnic/.test(text)) add('diploma');
    if (/\bbca\b/.test(text)) add('bca');
    if (/\bb\.?\s?sc\b|bachelor of science/.test(text)) add('bsc');
    if (/\bb\.?\s?tech\b|\bb\.?\s?e\.?\b|engineering degree/.test(text)) add('btech');
    if (/postgraduate|post graduate|master'?s|m\.?\s?sc|m\.?\s?tech|ph\.?\s?d|jrf/.test(text)) add('postgraduate');
    if (/teaching qualification|b\.?\s?ed|d\.?\s?el\.?\s?ed|teacher training/.test(text)) add('teaching');
    if (/llb|law degree|bachelor of law/.test(text)) add('law');
    if (/mbbs|medical degree/.test(text)) add('mbbs');
    if (/nursing|gnm|b\.?\s?sc nursing/.test(text)) add('nursing');
    if (/paramedical|radiographer|lab technician/.test(text)) add('paramedical');
    if (/graduate|graduation|bachelor'?s degree|degree in any discipline/.test(text) && !tags.includes('graduate')) add('graduate');
    return tags;
  }

  function qualificationsFor(item) {
    const supplied = [
      item.eligibility, item.qualification, item.qualifications, item.education,
      item.requiredQualification, item.eligibleQualifications
    ];
    const tags = normalizeQualifications(supplied);
    if (tags.length) return tags;

    const text = itemText(item);
    if (/nda|naval academy/.test(text)) return ['12th'];
    if (/agniveer|agniveervayu/.test(text)) return ['10th', '12th', 'iti', 'diploma'];
    if (/navik db/.test(text)) return ['10th'];
    if (/navik gd/.test(text)) return ['12th'];
    if (/cds|afcat|civil services|cgl|assistant commandant|grade b|bank|state psc|sub-inspector|sub inspector/.test(text)) return ['graduate'];
    if (/jee|neet|cuet|entrance|chsl|ctet/.test(text)) return ['12th'];
    if (/constable|mts|group d/.test(text)) return ['10th', '12th'];
    if (/yantrik|junior engineer|engineering|technical|isro|drdo|barc/.test(text)) return ['diploma', 'btech', 'bsc', 'postgraduate'];
    if (/ugc net|jrf/.test(text)) return ['postgraduate'];
    return [];
  }

  function qualMatches(tags, selected) {
    if (selected === 'all') return true;
    if (!tags || !tags.length) return false;
    if (tags.includes(selected)) return true;
    if (selected === 'graduate') return tags.some(function (tag) {
      return ['bca', 'bsc', 'btech', 'postgraduate', 'law', 'mbbs', 'nursing', 'paramedical'].includes(tag);
    });
    if (['bca', 'bsc', 'btech', 'law', 'mbbs', 'nursing', 'paramedical', 'postgraduate'].includes(selected)) return tags.includes('graduate');
    return false;
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
    const now = today();
    const status = String(item.status || '').toLowerCase().replace(/[_-]+/g, ' ');
    const type = String(item.type || '').toLowerCase();
    const end = parseDate(item.lastDate || item.applicationEndDate || item.closingDate);
    const start = parseDate(item.applicationStartDate || item.startDate || item.openDate);
    const exam = parseDate(item.examDate || item.examinationDate);
    const notice = parseDate(item.notificationDate || item.publishedAt || item.date);
    const explicitlyArchived = Boolean(item.archivedAt || item.archiveReason) ||
      /\b(closed|expired|archived|completed|exam over|cycle over|withdrawn)\b/.test(status);
    if (explicitlyArchived) return 'archive';
    if (exam && exam < now) return 'archive';
    if (end && end < now) return 'archive';

    const active = /\b(open|ongoing|active|accepting|live|registration open|application open)\b/.test(status);
    const started = (start && start <= now) || (!start && notice && notice <= now);
    if (end && end >= now && (active || started)) {
      return dayDiff(end, now) <= 7 ? 'near' : 'ongoing';
    }
    if (active && (!start || start <= now) && (!end || end >= now)) return 'ongoing';
    if ((start && start > now) || (end && end > now) || (exam && exam >= now) || (notice && notice > now)) return 'upcoming';
    if (/\b(upcoming|calendar|scheduled)\b/.test(status + ' ' + type)) return 'upcoming';
    if (notice && dayDiff(now, notice) > 45) return 'archive';
    if (notice && dayDiff(now, notice) >= 0 && dayDiff(now, notice) <= 45 && /\b(notification|recruitment|advertisement|notice)\b/.test(type + ' ' + status)) return 'upcoming';
    if (/\b(result|admit card|admit-card|answer key|score card)\b/.test(status + ' ' + type)) return 'archive';
    return 'ignore';
  }

  function reasonForArchive(item) {
    const end = parseDate(item.lastDate || item.applicationEndDate || item.closingDate);
    const exam = parseDate(item.examDate || item.examinationDate);
    const now = today();
    if (item.archiveReason) return String(item.archiveReason).replace(/[-_]+/g, ' ');
    if (item.archivedAt) return 'Historical notice';
    if (end && end < now) return 'Application deadline crossed';
    if (exam && exam < now) return 'Exam date passed';
    const status = String(item.status || '').toLowerCase();
    if (/closed|expired/.test(status)) return 'Application cycle closed';
    if (/result|admit|answer key/.test(status + ' ' + item.type)) return 'Post-exam update';
    return 'Older notice';
  }

  function dateSort(a, b) {
    const da = parseDate(a.examDate || a.examinationDate);
    const db = parseDate(b.examDate || b.examinationDate);
    return (da ? da.getTime() : Infinity) - (db ? db.getTime() : Infinity);
  }

  function uniqueItems(items) {
    const seen = new Set();
    return items.filter(function (item) {
      const key = String(item.id || (item.title || '') + '|' + (item.url || '')).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function qualificationsMarkup(tags) {
    const labels = (tags || []).map(function (tag) { return QUAL_LABELS[tag]; }).filter(Boolean);
    return labels.length
      ? '<div class="vx-tags">' + labels.map(function (label) { return '<span class="vx-tag">' + esc(label) + '</span>'; }).join('') + '</div>'
      : '<div class="vx-tags"><span class="vx-tag muted">Eligibility in notice</span></div>';
  }

  function noticeCard(item, lane) {
    const title = item.title || 'Official examination update';
    const category = String(item.category || 'Government').replace(/[_-]+/g, ' ');
    const organization = item.organization || item.sourceName || 'Official source';
    const url = safeUrl(item.url || item.sourceUrl);
    const end = item.lastDate || item.applicationEndDate || item.closingDate;
    const exam = item.examDate || item.examinationDate;
    const notice = item.notificationDate || item.publishedAt || item.date;
    const now = today();
    const days = parseDate(end) ? dayDiff(parseDate(end), now) : null;
    const laneText = lane === 'near' ? (days === 0 ? 'Closes today' : 'Closes in ' + days + ' days') :
      lane === 'ongoing' ? 'Applications open' : 'Date announced';
    const statusLabel = lane === 'near' ? 'DEADLINE NEAR' : lane === 'ongoing' ? 'APPLICATION OPEN' : 'UPCOMING';
    const details = [];
    if (end) details.push(['Last date', fmtDate(end)]);
    if (exam) details.push(['Exam date', fmtDate(exam)]);
    if (!end && !exam && notice) details.push(['Notice date', fmtDate(notice)]);
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
    items.sort(function (a, b) {
      if (lane === 'near') return dateSort(a, b);
      const da = parseDate(a.examDate || a.notificationDate || a.lastDate);
      const db = parseDate(b.examDate || b.notificationDate || b.lastDate);
      if (!da && !db) return String(a.title || '').localeCompare(String(b.title || ''));
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
    if (count) count.textContent = String(items.length).padStart(2, '0');
    list.innerHTML = items.length
      ? items.map(function (item) { return noticeCard(item, lane); }).join('')
      : '<div class="vx-empty"><span class="vx-empty-mark">—</span><strong>' + (state.loading ? 'Syncing official notices…' : 'Nothing to show here right now') + '</strong><span>' + (state.loading ? 'Loading the latest feed.' : 'Try clearing a filter or check the official portals again later.') + '</span></div>';
    return items.length;
  }

  function routeMatches(route, filters, groupText, sector) {
    const qualOk = qualMatches(route.quals, filters.qualification);
    const sectorOk = filters.sector === 'all' || filters.sector === sector;
    const routeText = [route.title, route.note].join(' ').toLowerCase();
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
    const careers = root.querySelector('#vxCareerGrid');
    if (forces) forces.innerHTML = forceGroups.map(function (group) { return forceCardMarkup(group, filters); }).join('') ||
      '<div class="vx-empty"><strong>No service routes match these filters.</strong><span>Choose a different qualification or sector.</span></div>';
    if (careers) careers.innerHTML = careerGroups.map(function (group) { return careerCardMarkup(group, filters); }).join('') ||
      '<div class="vx-empty"><strong>No career routes match these filters.</strong><span>Choose a different qualification or sector.</span></div>';
  }

  function renderExamDates(filters) {
    const mount = root.querySelector('#vxExamDatesList');
    const count = root.querySelector('#vxExamDatesCount');
    if (!mount) return;
    const now = today();
    const items = uniqueItems(state.items.concat(state.archived)).filter(function (item) {
      const date = parseDate(item.examDate || item.examinationDate);
      return date && date >= now && matches(item, filters);
    }).sort(dateSort);
    if (count) count.textContent = String(items.length).padStart(2, '0');
    mount.innerHTML = items.length ? items.map(function (item) {
      const date = parseDate(item.examDate || item.examinationDate);
      const tentative = /calendar|tentative|schedule|planned/i.test(String(item.type || '') + ' ' + String(item.summary || ''));
      const url = safeUrl(item.url || item.sourceUrl);
      return '<article class="vx-date-row"><div class="vx-date-block"><strong>' + esc(date.toLocaleDateString('en-IN', { day: '2-digit' })) + '</strong><span>' + esc(date.toLocaleDateString('en-IN', { month: 'short' })) + '</span><small>' + esc(date.getFullYear()) + '</small></div>' +
        '<div class="vx-date-info"><span class="vx-date-tag">' + (tentative ? 'TENTATIVE / CALENDAR' : 'EXAM DATE LISTED') + '</span><h3>' + esc(item.title || 'Examination') + '</h3>' +
        '<p>' + esc(item.organization || item.sourceName || 'Exam authority') + (tentative ? ' · Verify against the individual notification.' : ' · Verify the schedule on the official portal.') + '</p></div>' +
        (url ? '<a class="vx-route-link vx-date-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Verify exam date for ' + esc(item.title || 'examination') + '">↗</a>' : '') +
        '</article>';
    }).join('') : '<div class="vx-empty"><span class="vx-empty-mark">▦</span><strong>No future exam dates match</strong><span>Only dates present in the notice feed are shown. Check the relevant official calendar for further dates.</span></div>';
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
      const detail = fmtDate(item.lastDate || item.examDate || item.notificationDate);
      return '<article class="vx-archive-card"><div class="vx-archive-top"><span>ARCHIVED</span><small>' + esc(detail || fmtDate(item.archivedAt) || 'Historical') + '</small></div>' +
        '<h3>' + esc(item.title || 'Historical recruitment notice') + '</h3><p>' + esc(item.organization || item.sourceName || 'Official source') + ' · ' + esc(reasonForArchive(item)) + '</p>' +
        (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open source ↗</a>' : '') + '</article>';
    }).join('') : '<div class="vx-empty"><strong>No archived notices match</strong><span>Archived notices appear here when their dates have passed or the source marks them closed.</span></div>';
    if (more) {
      more.hidden = items.length <= 12;
      more.textContent = state.showAllArchive ? 'Show fewer archived notices' : 'Show all ' + items.length + ' archived notices';
    }
  }

  function renderAll() {
    const filters = controls();
    const upcoming = renderLane('upcoming', filters);
    const ongoing = renderLane('ongoing', filters);
    const near = renderLane('near', filters);
    renderExamDates(filters);
    renderCareers(filters);
    renderArchive(filters);
    const total = root.querySelector('#vxTotalCount');
    const active = root.querySelector('#vxActiveCount');
    if (total) total.textContent = String(upcoming + ongoing + near).padStart(2, '0');
    if (active) active.textContent = String(state.items.filter(function (item) { return ['upcoming', 'ongoing', 'near'].includes(classify(item)); }).length).padStart(2, '0');
  }

  const markup = [
    '<div class="vx-shell">',
    '<header class="vx-hero"><div class="vx-hero-copy"><span class="vx-eyebrow vx-hero-kicker">VAANI · CAREER INTELLIGENCE</span><h1 id="ncTitle">Government exam desk</h1>',
    '<p>One clear place for exam schedules, application windows and career routes. Separate what is coming, what is open and what is closing.</p>',
    '<div class="vx-hero-chips"><span>Official sources first</span><span>Dates separated from notices</span><span>Expired cycles archived</span></div></div>',
    '<div class="vx-hero-visual" aria-hidden="true"><div class="vx-orbit vx-orbit-a"></div><div class="vx-orbit vx-orbit-b"></div>',
    '<div class="vx-hero-emblem"><svg viewBox="0 0 100 100" role="presentation"><path d="M50 7 82 19v24c0 22-13 39-32 50C31 82 18 65 18 43V19z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M34 51 45 62 68 36" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="vx-hero-visual-label">FIND · VERIFY · APPLY</div></div>',
    '<div class="vx-hero-foot"><span><b id="vxTotalCount">00</b><small>actionable notices</small></span><span><b id="vxActiveCount">00</b><small>current / scheduled</small></span><span class="vx-sync" id="vxSyncStamp">Syncing official feeds…</span></div></header>',
    '<nav class="vx-jump" aria-label="Exam desk sections"><button type="button" data-vx-jump="vx-upcoming">Upcoming</button><button type="button" data-vx-jump="vx-ongoing">Ongoing</button><button type="button" data-vx-jump="vx-near">Deadline near</button><button type="button" data-vx-jump="vx-exam-dates">Exam dates</button><button type="button" data-vx-jump="vx-defence">Defence corner</button><button type="button" data-vx-jump="vx-careers">Career map</button><button type="button" data-vx-jump="vx-archive">Archive</button></nav>',
    '<section class="vx-filter-panel" aria-label="Search and filter exams"><div class="vx-filter-heading"><div><span class="vx-eyebrow">SMART DIRECTORY</span><h2>Find your next route</h2><p>Search exams or narrow notices and career paths by qualification and sector.</p></div><button type="button" class="vx-reset" id="vxReset">Reset filters</button></div>',
    '<div class="vx-controls"><label class="vx-search-wrap"><span>SEARCH EXAMS &amp; CAREERS</span><input id="vxSearch" type="search" placeholder="Try NDA, BCA, NTPC, technician…" autocomplete="off"></label>',
    '<label><span>YOUR QUALIFICATION</span><select id="vxQualification"><option value="all">All qualifications</option><option value="10th">Class 10</option><option value="12th">Class 12</option><option value="diploma">Diploma</option><option value="iti">ITI</option><option value="bca">BCA</option><option value="bsc">B.Sc.</option><option value="btech">B.Tech / B.E.</option><option value="graduate">Any graduation</option><option value="postgraduate">Postgraduate</option><option value="teaching">Teaching qualification</option><option value="law">Law degree</option><option value="mbbs">MBBS / Medical</option><option value="nursing">Nursing</option><option value="paramedical">Paramedical</option></select></label>',
    '<label><span>SECTOR</span><select id="vxSector"><option value="all">All sectors</option><option value="defence">Defence &amp; uniformed</option><option value="upsc">UPSC &amp; central</option><option value="ssc">SSC</option><option value="railways">Railways</option><option value="banking">Banking &amp; finance</option><option value="teaching">Teaching &amp; education</option><option value="state">State services</option><option value="technical">Technical &amp; PSU</option><option value="entrance">Entrance &amp; higher education</option><option value="health">Healthcare</option><option value="law">Law &amp; judiciary</option><option value="insurance">Insurance &amp; other</option></select></label></div>',
    '<p class="vx-filter-note"><span aria-hidden="true">ⓘ</span> Qualification tags are a discovery aid, not an eligibility decision. The individual notification always controls.</p></section>',
    '<section class="vx-lane vx-lane-upcoming" id="vx-upcoming" aria-labelledby="vxUpcomingTitle"><div class="vx-section-heading"><div><span class="vx-section-index">01 / PLANNED</span><h2 id="vxUpcomingTitle">Upcoming examinations</h2><p>Dates announced or scheduled; annual-calendar dates remain tentative until the exam notice.</p></div><span class="vx-lane-count" id="vxUpcomingCount">00</span></div><div class="vx-notice-grid" id="vxUpcomingList" aria-live="polite"></div></section>',
    '<section class="vx-lane vx-lane-ongoing" id="vx-ongoing" aria-labelledby="vxOngoingTitle"><div class="vx-section-heading"><div><span class="vx-section-index">02 / OPEN</span><h2 id="vxOngoingTitle">Ongoing applications</h2><p>Application windows that are currently open and are not within the 7-day closing window.</p></div><span class="vx-lane-count" id="vxOngoingCount">00</span></div><div class="vx-notice-grid" id="vxOngoingList" aria-live="polite"></div></section>',
    '<section class="vx-lane vx-lane-near" id="vx-near" aria-labelledby="vxNearTitle"><div class="vx-section-heading"><div><span class="vx-section-index">03 / PRIORITY</span><h2 id="vxNearTitle">Deadline near</h2><p>Application forms closing today or within 7 days. Check the closing date and official instructions.</p></div><span class="vx-lane-count" id="vxNearCount">00</span></div><div class="vx-notice-grid" id="vxNearList" aria-live="polite"></div></section>',
    '<section class="vx-date-section" id="vx-exam-dates" aria-labelledby="vxExamDatesTitle"><div class="vx-section-heading"><div><span class="vx-section-index">DATEBOARD / SEPARATE VIEW</span><h2 id="vxExamDatesTitle">Exam date calendar</h2><p>Upcoming examination dates in one chronological list, separate from application status.</p></div><span class="vx-lane-count" id="vxExamDatesCount">00</span></div><div class="vx-date-list" id="vxExamDatesList" aria-live="polite"></div></section>',
    '<section class="vx-defence-section" id="vx-defence" aria-labelledby="vxDefenceTitle"><div class="vx-defence-banner"><div><span class="vx-eyebrow">SPECIAL CORNER · UNIFORMED CAREERS</span><h2 id="vxDefenceTitle">Defence &amp; national security</h2><p>Explore officer, Agniveer, sailor, airman, Coast Guard and CAPF pathways without mixing them into live exam notices.</p></div><span class="vx-defence-seal" aria-hidden="true">★</span></div>',
    '<div class="vx-subheading"><div><h3>Armed forces &amp; maritime service</h3><p>Army, Navy, Air Force and Coast Guard routes.</p></div><span>01 — 04</span></div><div class="vx-force-grid" id="vxForcesGrid"></div></section>',
    '<section class="vx-career-section" id="vx-careers" aria-labelledby="vxCareersTitle"><div class="vx-section-heading"><div><span class="vx-section-index">CAREER MAP / MAJOR ROUTES</span><h2 id="vxCareersTitle">Explore career options</h2><p>Browse central and state services, technical roles, education, healthcare and admission pathways.</p></div><span class="vx-map-label">12 PATHWAYS</span></div><div class="vx-career-grid" id="vxCareerGrid"></div></section>',
    '<details class="vx-archive" id="vx-archive"><summary><span><span class="vx-section-index">REFERENCE / HISTORY</span><strong>Notification archive</strong><small>Closed applications, passed exam cycles and older notices stay here.</small></span><span class="vx-archive-count" id="vxArchiveCount">Loading…</span></summary>',
    '<div class="vx-archive-body"><div class="vx-archive-grid" id="vxArchiveGrid"></div><button type="button" class="vx-archive-more" id="vxArchiveMore" hidden>Show all archived notices</button></div></details>',
    '<p class="vx-disclaimer">VAANI organises publicly available exam information; it does not issue notifications or accept applications. Dates and eligibility can change. Use the official source to confirm every detail before applying.</p>',
    '</div>'
  ].join('');

  async function loadJson(urls) {
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) continue;
        return await response.json();
      } catch (error) {
        // Continue to the local snapshot if the live service is unreachable.
      }
    }
    return { items: [] };
  }

  function install() {
    root.innerHTML = markup;
    root.querySelectorAll('[data-vx-jump]').forEach(function (button) {
      button.addEventListener('click', function () {
        const target = root.querySelector('#' + button.dataset.vxJump);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    renderAll();
    Promise.all([loadJson(feedUrls), loadJson(archiveUrls)]).then(function (results) {
      const feed = results[0] || {};
      const archive = results[1] || {};
      state.items = Array.isArray(feed.items) ? feed.items : Array.isArray(feed) ? feed : [];
      state.archived = Array.isArray(archive.items) ? archive.items : Array.isArray(archive) ? archive : [];
      state.generatedAt = feed.generatedAt || null;
      state.loading = false;
      const stamp = root.querySelector('#vxSyncStamp');
      if (stamp) {
        const date = state.generatedAt ? new Date(state.generatedAt) : null;
        stamp.textContent = date && !Number.isNaN(date.valueOf())
          ? 'Feed checked ' + date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : 'Official feed loaded';
      }
      renderAll();
    }).catch(function () {
      state.loading = false;
      const stamp = root.querySelector('#vxSyncStamp');
      if (stamp) stamp.textContent = 'Feed unavailable · check official portals';
      renderAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();