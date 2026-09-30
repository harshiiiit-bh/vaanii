(function (global) {
  'use strict';

  const QUALIFICATIONS = Object.freeze([
    { id: '10th', label: 'Class 10' },
    { id: '12th', label: 'Class 12' },
    { id: 'iti', label: 'ITI' },
    { id: 'diploma', label: 'Diploma' },
    { id: 'ba', label: 'BA' },
    { id: 'bsc', label: 'B.Sc.' },
    { id: 'bcom', label: 'B.Com.' },
    { id: 'bca', label: 'BCA' },
    { id: 'bba', label: 'BBA' },
    { id: 'btech', label: 'B.Tech / B.E.' },
    { id: 'graduate', label: 'Graduation' },
    { id: 'postgraduate', label: 'Postgraduation' },
    { id: 'teaching', label: 'Teaching qualification' },
    { id: 'law', label: 'Law degree' },
    { id: 'mbbs', label: 'MBBS / Medical' },
    { id: 'nursing', label: 'Nursing' },
    { id: 'paramedical', label: 'Paramedical' }
  ].map(Object.freeze));

  const SECTORS = Object.freeze([
    { id: 'defence', label: 'Defence & uniformed' },
    { id: 'upsc', label: 'UPSC & central' },
    { id: 'ssc', label: 'SSC' },
    { id: 'railways', label: 'Railways' },
    { id: 'banking', label: 'Banking & finance' },
    { id: 'teaching', label: 'Teaching & education' },
    { id: 'state', label: 'State services' },
    { id: 'technical', label: 'Technical & PSU' },
    { id: 'entrance', label: 'Entrance & higher education' },
    { id: 'health', label: 'Healthcare' },
    { id: 'law', label: 'Law & judiciary' },
    { id: 'insurance', label: 'Insurance & other central roles' },
    { id: 'other', label: 'Other / unclassified' }
  ].map(Object.freeze));

  const DEGREE_QUALIFICATIONS = Object.freeze([
    'ba', 'bsc', 'bcom', 'bca', 'bba', 'btech', 'postgraduate', 'law', 'mbbs'
  ]);
  const DATE_FIELDS = Object.freeze({
    start: ['applicationStartDate', 'startDate', 'openDate'],
    end: ['lastDate', 'applicationEndDate', 'closingDate'],
    exam: ['examDate', 'examinationDate'],
    notice: ['notificationDate', 'publishedAt', 'date']
  });

  function firstValue(record, keys) {
    for (const key of keys) {
      if (record[key] != null && String(record[key]).trim()) return record[key];
    }
    return null;
  }

  function makeDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function parseDate(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.valueOf())) return null;
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const text = String(value).trim();
    if (!text) return null;

    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/);
    if (match) return makeDate(Number(match[1]), Number(match[2]), Number(match[3]));

    match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (match) return makeDate(Number(match[3]), Number(match[2]), Number(match[1]));

    const parsed = new Date(text);
    if (Number.isNaN(parsed.valueOf())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  function referenceDate(value) {
    return parseDate(value) || parseDate(new Date());
  }

  function daysBetween(later, earlier) {
    return Math.round((later.getTime() - earlier.getTime()) / 86400000);
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeItems(payload) {
    const items = Array.isArray(payload) ? payload : isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
    return items.filter(isRecord);
  }

  function classify(item, todayValue) {
    if (!isRecord(item)) return 'ignore';
    const today = referenceDate(todayValue);
    const status = [item.status, item.type].filter(Boolean).join(' ').toLowerCase().replace(/[_-]+/g, ' ');
    const postExam = [item.title, item.summary, item.status, item.type]
      .filter(Boolean).join(' ').toLowerCase();
    const end = parseDate(firstValue(item, DATE_FIELDS.end));
    const start = parseDate(firstValue(item, DATE_FIELDS.start));
    const exam = parseDate(firstValue(item, DATE_FIELDS.exam));
    const notice = parseDate(firstValue(item, DATE_FIELDS.notice));

    if (item.archivedAt || item.archiveReason || /\b(closed|expired|archived|completed|exam over|cycle over|withdrawn)\b/.test(status)) return 'archive';
    if ((end && end < today) || (exam && exam < today)) return 'archive';
    if (/\b(results?|admit cards?|e-?admit cards?|hall tickets?|answer keys?|score cards?|merit lists?|city intimation)\b/.test(postExam)) return 'archive';

    if (start && start > today) return 'upcoming';

    const explicitlyOpen = /\b(open|ongoing|active|accepting|live|registration open|application open)\b/.test(status);
    const dateRangeIsOpen = Boolean(start && start <= today && (!end || end >= today));
    if ((explicitlyOpen || dateRangeIsOpen) && (!start || start <= today) && (!end || end >= today)) {
      return end && daysBetween(end, today) <= 7 ? 'near' : 'ongoing';
    }

    if ((exam && exam > today) || (notice && notice > today)) return 'upcoming';
    return 'ignore';
  }

  function isFutureExamDate(item, todayValue) {
    if (!isRecord(item)) return false;
    const date = parseDate(firstValue(item, DATE_FIELDS.exam));
    const today = referenceDate(todayValue);
    return Boolean(date && date >= today);
  }

  function examDateConfidence(item) {
    if (!isRecord(item)) return 'unverified';
    if (item.examDateConfirmed === true || item.isExamDateConfirmed === true) return 'confirmed';
    if (item.examDateTentative === true || item.isExamDateTentative === true || item.isTentative === true) return 'tentative';
    const explicit = [item.examDateConfidence, item.dateConfidence, item.examDateStatus, item.dateStatus, item.examDateType]
      .filter(Boolean).join(' ').toLowerCase();
    if (/\b(confirmed|final|official notice)\b/.test(explicit)) return 'confirmed';
    if (/\b(tentative|calendar|scheduled|planned)\b/.test(explicit)) return 'tentative';
    const sourceType = [item.type, item.status, item.summary].filter(Boolean).join(' ').toLowerCase();
    if (/\b(annual calendar|tentative|calendar only|planned schedule)\b/.test(sourceType)) return 'tentative';
    return 'unverified';
  }

  function normalizeQualifications(values) {
    const raw = Array.isArray(values) ? values.join(' ') : String(values || '');
    const text = raw.toLowerCase().replace(/[’]/g, "'");
    const tags = [];
    const add = function (tag) { if (!tags.includes(tag)) tags.push(tag); };

    if (/10th|class\s*10|matric|matriculation|secondary/.test(text)) add('10th');
    if (/12th|class\s*12|10\s*\+\s*2|intermediate|higher secondary|senior secondary/.test(text)) add('12th');
    if (/\biti\b|industrial training institute/.test(text)) add('iti');
    if (/\bdiploma\b|polytechnic/.test(text)) add('diploma');
    if (/\bb\s*\.?\s*a\.?\b|bachelor of arts/.test(text)) add('ba');
    if (/\bb\s*\.?\s*sc\.?(?![a-z])|bachelor of science/.test(text)) add('bsc');
    if (/\bb\s*\.?\s*com\.?(?![a-z])|bachelor of commerce/.test(text)) add('bcom');
    if (/\bbca\b|bachelor of computer applications/.test(text)) add('bca');
    if (/\bbba\b|bachelor of business administration/.test(text)) add('bba');
    if (/\bb\s*\.?\s*tech\b|\bb\s*\.?\s*e\.?\b|engineering degree/.test(text)) add('btech');
    if (/\bpost[\s-]?graduate\b|master'?s|\bm\s*\.?\s*sc\b|\bm\s*\.?\s*tech\b|\bph\s*\.?\s*d\b|\bjrf\b/.test(text)) add('postgraduate');
    if (/teaching qualification|\bb\s*\.?\s*ed\b|\bd\s*\.?\s*el\s*\.?\s*ed\b|teacher training/.test(text)) add('teaching');
    if (/\bllb\b|law degree|bachelor of law/.test(text)) add('law');
    if (/\bmbbs\b|medical degree/.test(text)) add('mbbs');
    if (/nursing|\bgnm\b/.test(text)) add('nursing');
    if (/paramedical|radiographer|lab technician/.test(text)) add('paramedical');

    const withoutPostgraduate = text.replace(/\bpost[\s-]?graduate\b/g, '');
    if (/\bgraduate\b|\bgraduation\b|bachelor'?s degree|degree in any discipline/.test(withoutPostgraduate)) add('graduate');
    return tags;
  }

  function qualificationsFor(item) {
    if (!isRecord(item)) return [];
    return normalizeQualifications([
      item.eligibility, item.qualification, item.qualifications, item.education,
      item.requiredQualification, item.eligibleQualifications
    ]);
  }

  function qualificationMatches(tags, selected) {
    if (selected === 'all') return true;
    if (!Array.isArray(tags) || !tags.length) return false;
    if (tags.includes(selected)) return true;
    if (selected === 'graduate') return tags.includes('graduate') || tags.some(tag => DEGREE_QUALIFICATIONS.includes(tag));
    if (selected === 'postgraduate') return tags.includes('graduate') || tags.some(tag => DEGREE_QUALIFICATIONS.includes(tag));
    return tags.includes('graduate') && DEGREE_QUALIFICATIONS.includes(selected);
  }

  function sectorFor(item) {
    if (!isRecord(item)) return 'other';
    const text = [item.category, item.organization, item.title].filter(Boolean).join(' ').toLowerCase();
    if (/nda|cds|agniveer|army|navy|air force|afcat|coast guard|bsf|crpf|itbp|cisf|capf|assam rifles|rpf|paramilitary|police/.test(text)) return 'defence';
    if (/ssc|staff selection|cgl|chsl|mts|stenographer/.test(text)) return 'ssc';
    if (/railway|rrb|ntpc|loco pilot/.test(text)) return 'railways';
    if (/bank|ibps|sbi|rbi|lic|insurance/.test(text)) return 'banking';
    if (/ctet|kvs|nvs|teacher|teaching|ugc net|jrf/.test(text)) return 'teaching';
    if (/bpsc|uppsc|mppsc|rpsc|jpsc|state psc/.test(text)) return 'state';
    if (/upsc|civil service|forest service|geo-scientist|engineering services/.test(text)) return 'upsc';
    if (/isro|drdo|barc|technical|aai|gate/.test(text)) return 'technical';
    if (/jee|neet|cuet|nta|entrance|clat|nift|nata/.test(text)) return 'entrance';
    if (/medical|nursing|paramedical|aiims|healthcare/.test(text)) return 'health';
    if (/judicial|prosecution|legal/.test(text)) return 'law';
    if (/epfo|esic|central department/.test(text)) return 'insurance';
    return 'other';
  }

  function compareExamDates(a, b) {
    const left = isRecord(a) ? parseDate(firstValue(a, DATE_FIELDS.exam)) : null;
    const right = isRecord(b) ? parseDate(firstValue(b, DATE_FIELDS.exam)) : null;
    return (left ? left.getTime() : Infinity) - (right ? right.getTime() : Infinity);
  }

  global.VaaniExamDeskData = Object.freeze({
    QUALIFICATIONS,
    SECTORS,
    parseDate,
    normalizeItems,
    classify,
    isFutureExamDate,
    examDateConfidence,
    normalizeQualifications,
    qualificationsFor,
    qualificationMatches,
    sectorFor,
    compareExamDates
  });
})(typeof window !== 'undefined' ? window : globalThis);
