import fs from 'node:fs/promises';
import { createSourceStatus, fetchWithRetry, mapConcurrent } from './notification-sync-utils.mjs';

const DATA_FILE = 'data/defence-notifications.json';
const ARCHIVE_FILE = 'data/defence-notifications-archive.json';
const STATUS_FILE = 'data/defence-notifications-status.json';
const SOURCE_CONCURRENCY = 4;
const USER_AGENT = 'VAANI-Defence-Notification-Bot/1.0 (+https://harshiiiit-bh.github.io/vaanii/)';
const MAX_PER_SOURCE = 80;

const sources = [
  { name:'UPSC — Active Examinations', url:'https://www.upsc.gov.in/examinations/active-examinations', categories:['NDA','CDS','CAPF'] },
  { name:'UPSC — Forthcoming Examinations', url:'https://www.upsc.gov.in/examinations/forthcoming-examinations', categories:['NDA','CDS','CAPF'] },
  { name:'UPSC — Examination Notifications', url:'https://www.upsc.gov.in/exams-related-info/exam-notification', categories:['UPSC'] },
  { name:'UPSC — Official Home', url:'https://www.upsc.gov.in/', categories:['UPSC'] },
  { name:'Indian Air Force — AFCAT', url:'https://afcat.edcil.co.in/', categories:['AFCAT'] },
  { name:'Indian Army — Join Indian Army', url:'https://joinindianarmy.nic.in/', categories:['AGNIVEER','ARMY_RALLY'] },
  { name:'Indian Navy — Join Indian Navy', url:'https://www.joinindiannavy.gov.in/', categories:['AGNIVEER','NAVY'] },
  { name:'Agniveervayu', url:'https://agnipathvayu.cdac.in/', categories:['AGNIVEER','AIR_FORCE'] },
  { name:'BSF Recruitment', url:'https://rectt.bsf.gov.in/', categories:['BSF'] },
  { name:'CRPF Recruitment', url:'https://rect.crpf.gov.in/', categories:['CRPF'] },
  { name:'SSC — Official Notice Board', url:'https://ssc.gov.in/', categories:['SSC'] },
  { name:'Railway Recruitment Boards — Employment Notices', url:'https://www.rrbcdg.gov.in/employment-notices.php', categories:['RAILWAYS'] },
  { name:'IBPS — CRP Updates', url:'https://www.ibps.in/index.php/crp-updates/', categories:['BANKING'] },
  { name:'SBI — Current Openings', url:'https://sbi.bank.in/en/web/careers/current-openings', categories:['BANKING'] },
  { name:'CTET — Official Documents', url:'https://ctet.nic.in/documents/', categories:['TEACHING'] },
  { name:'KVS — Recruitment Notices', url:'https://kvsangathan.nic.in/en/interview-notice/', categories:['TEACHING'] },
  { name:'BPSC — Official Notices', url:'https://bpsc.bihar.gov.in/', categories:['STATE_PSC'] },
  { name:'UPPSC — Official Notices', url:'https://uppsc.up.nic.in/', categories:['STATE_PSC'] },
  { name:'ISRO — Current Opportunities', url:'https://www.isro.gov.in/ISRO_EN/ViewAllOpportunities.html', categories:['TECHNICAL'] },
  { name:'DRDO — Vacancies', url:'https://www.drdo.gov.in/drdo/offerings/vacancies', categories:['TECHNICAL'] },
  { name:'NTA — Official Exam Directory', url:'https://www.nta.ac.in/', categories:['ENTRANCE'] },
  { name:'JEE Main — Official Notices', url:'https://jeemain.nta.nic.in/', categories:['ENTRANCE'] },
  { name:'NEET UG — Official Notices', url:'https://neet.nta.nic.in/', categories:['ENTRANCE'] },
  { name:'UGC NET — Official Notices', url:'https://ugcnet.nta.nic.in/', categories:['ENTRANCE'] },
  { name:'CSBC Bihar — Police Recruitment', url:'https://csbc.bihar.gov.in/', categories:['POLICE'] },
  { name:'BPSSC Bihar — Police Recruitment', url:'https://bpssc.bihar.gov.in/', categories:['POLICE'] },
  { name:'UPPRPB — Police Recruitment', url:'https://uppbpb.gov.in/', categories:['POLICE'] }
];

const relevant = /(nda|national defence academy|naval academy|cds|combined defence services|afcat|air force common admission|capf|central armed police|agniveer|agniveervayu|agniveer vayu|recruitment rally|rally bharti|army recruitment|indian army|indian navy|navy recruitment|bsf|border security force|crpf|central reserve police|cisf|itbp|indo tibetan|ssb|assam rifles|coast guard|ssc|staff selection|cgl|chsl|mts|stenographer|selection post|junior engineer|railway|rrb|ntpc|group[- ]?d|loco pilot|technician|ibps|sbi|rbi|bank|probationary officer|customer service associate|clerical cadre|ctet|kvs|navodaya|nvs|teacher|bpsc|uppsc|mppsc|rpsc|jpsc|state public service|isro|drdo|barc|airports authority|iocl|aiims|esic|admit card|notification|advertisement|recruitment)/i;
const dateRx = /\b(?:0?[1-9]|[12]\d|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:20\d{2})\b|\b(?:20\d{2})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g;

function stripHtml(html){
  return html
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#39;/gi,"'")
    .replace(/&quot;/gi,'"')
    .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi,(_,code)=>String.fromCodePoint(parseInt(code,16)))
    .replace(/\s+/g,' ')
    .trim();
}

function normalizeUrl(href, base){
  try {
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    return u.href;
  } catch { return null; }
}

function categoryFor(text, fallback){
  const s = text.toLowerCase();
  const family = fallback[0] || '';
  if (['SSC','RAILWAYS','BANKING','TEACHING','STATE_PSC','TECHNICAL','UPSC','ENTRANCE','POLICE'].includes(family)) return family;
  if (/afcat|air force common admission/.test(s)) return 'AFCAT';
  if (/combined defence services|\bcds\b/.test(s)) return 'CDS';
  if (/national defence academy|\bnda\b/.test(s)) return 'NDA';
  if (/agniveer vayu|agnipathvayu|air force agniveer/.test(s)) return 'AGNIVEER';
  if (/agniveer|join indian navy|navy recruitment/.test(s)) return 'AGNIVEER';
  if (/recruitment rally|rally bharti|army recruitment|join indian army/.test(s)) return 'ARMY_RALLY';
  if (/border security force|\bbsf\b/.test(s)) return 'BSF';
  if (/central reserve police|\bcrpf\b/.test(s)) return 'CRPF';
  if (/central industrial security|\bcisf\b/.test(s)) return 'CISF';
  if (/indo[- ]tibetan|\bitbp\b/.test(s)) return 'ITBP';
  if (/sashastra seema bal|\bssb\b/.test(s)) return 'SSB';
  if (/assam rifles/.test(s)) return 'ASSAM_RIFLES';
  if (/coast guard/.test(s)) return 'COAST_GUARD';
  if (/railway|\brrb\b|ntpc|loco pilot|\balp\b|group[- ]?d/.test(s)) return 'RAILWAYS';
  if (/ibps|\bsbi\b|\brbi\b|probationary officer|customer service associate|bank/.test(s)) return 'BANKING';
  if (/ctet|kvs|navodaya|\bnvs\b|teacher eligibility|\btet\b/.test(s)) return 'TEACHING';
  if (/\bssc\b|staff selection|\bcgl\b|\bchsl\b|\bmts\b|stenographer|selection post/.test(s)) return 'SSC';
  if (/bpsc|uppsc|mppsc|rpsc|jpsc|state public service/.test(s)) return 'STATE_PSC';
  if (/\bupsc\b|civil services|forest service|engineering services|geo-scientist|epfo/.test(s)) return 'UPSC';
  if (/isro|drdo|barc|airports authority|\baai\b|\biocl\b|aiims|esic/.test(s)) return 'TECHNICAL';
  return family || 'OTHER';
}

function statusFor(text){
  const s=text.toLowerCase();
  if (/result|final result|merit list/.test(s)) return 'result';
  if (/admit card|e-admit|hall ticket/.test(s)) return 'admit-card';
  if (/answer key/.test(s)) return 'answer-key';
  if (/recruitment|notification|advertisement|application|apply online|vacancy|rally/.test(s)) return 'notification';
  return 'update';
}

function titleFromAnchor(text){
  return text.replace(/\s+/g,' ').replace(/^(click here|view|download)\s*[:|-]?\s*/i,'').trim().slice(0,180);
}

function makeId(title,url){
  return (title+'|'+url).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110);
}

const curatedIds = new Set([
  'upsc-nda-i-2027-calendar','upsc-cds-i-2027-calendar',
  'ssc-cgl-2026-city-admission-certificate','ssc-cgl-2026-tentative-vacancies',
  'ssc-stenographer-2026-answer-key','sbi-sco-2026-27-20',
  'isro-sac-02-2026-research-roles','drdo-pxe-apprentice-2026-27'
]);

const curatedApplications = [
  {
    "id": "curated-sbi-sco-2026-27-20",
    "title": "SBI Specialist Cadre Officers — Dean, Faculty & Marketing Executive (Advt. CRPD/SCO/2026-27/20)",
    "organization": "SBI",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "applicationStartDate": "2026-09-16",
    "lastDate": "2026-10-06",
    "advertisementNo": "CRPD/SCO/2026-27/20",
    "eligibility": "Post-specific qualifications and experience apply; see official advertisement",
    "applicationUrl": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-20/apply",
    "url": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-20/apply",
    "notificationUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceName": "SBI — Current Openings",
    "official": true,
    "summary": "Contract engagement for Dean, Faculty and Marketing Executive. Online registration: 16 Sep–6 Oct 2026. Check the linked advertisement for post-wise criteria.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-sbi-sco-2026-27-22",
    "title": "SBI Specialist Cadre Officers — Contract Engagement (Advt. CRPD/SCO/2026-27/22)",
    "organization": "SBI",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "applicationStartDate": "2026-09-16",
    "lastDate": "2026-10-06",
    "advertisementNo": "CRPD/SCO/2026-27/22",
    "eligibility": "Post-specific qualifications and experience apply; see official advertisement",
    "applicationUrl": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-22/apply",
    "url": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-22/apply",
    "notificationUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceName": "SBI — Current Openings",
    "official": true,
    "summary": "Specialist Cadre Officer contract recruitment. Online registration: 16 Sep–6 Oct 2026. Use the official advertisement to confirm the exact role and requirements.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-sbi-sco-2026-27-23",
    "title": "SBI Specialist Cadre Officers — Wealth Management & Premier Banking (Advt. CRPD/SCO/2026-27/23)",
    "organization": "SBI",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "applicationStartDate": "2026-09-04",
    "lastDate": "2026-10-05",
    "advertisementNo": "CRPD/SCO/2026-27/23",
    "eligibility": "Post-specific qualifications and experience apply; see official advertisement",
    "applicationUrl": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-23/apply",
    "url": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-23/apply",
    "notificationUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceName": "SBI — Current Openings",
    "official": true,
    "summary": "Wealth Management & Premier Banking contract recruitment. The closing date was extended to 5 Oct 2026; verify role-specific conditions in the advertisement.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-sbi-sco-2026-27-24",
    "title": "SBI Specialist Cadre Officer — Contract Engagement (Advt. CRPD/SCO/2026-27/24)",
    "organization": "SBI",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "applicationStartDate": "2026-09-30",
    "lastDate": "2026-10-21",
    "advertisementNo": "CRPD/SCO/2026-27/24",
    "eligibility": "Post-specific qualifications and experience apply; see official advertisement",
    "applicationUrl": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-24/apply",
    "url": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-24/apply",
    "notificationUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceName": "SBI — Current Openings",
    "official": true,
    "summary": "Separate Specialist Cadre Officer contract advertisement. Online registration: 30 Sep–21 Oct 2026. Check the official advertisement for role and eligibility.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-sbi-sco-2026-27-25",
    "title": "SBI Specialist Cadre Officers — Contract Engagement (Advt. CRPD/SCO/2026-27/25)",
    "organization": "SBI",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "applicationStartDate": "2026-09-30",
    "lastDate": "2026-10-21",
    "advertisementNo": "CRPD/SCO/2026-27/25",
    "eligibility": "Post-specific qualifications and experience apply; see official advertisement",
    "applicationUrl": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-25/apply",
    "url": "https://recruitment.sbi.bank.in/crpd-sco-2026-27-25/apply",
    "notificationUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceUrl": "https://sbi.bank.in/en/web/careers/current-openings",
    "sourceName": "SBI — Current Openings",
    "official": true,
    "summary": "Separate Specialist Cadre Officer contract advertisement. Online registration: 30 Sep–21 Oct 2026. Check the official advertisement for role and eligibility.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-ssc-cpo-2026",
    "title": "SSC Sub-Inspector in Delhi Police & CAPFs Examination 2026",
    "organization": "SSC",
    "category": "SSC",
    "type": "Recruitment notification",
    "status": "notification",
    "notificationDate": "2026-09-10",
    "applicationStartDate": "2026-09-10",
    "lastDate": "2026-09-30",
    "advertisementNo": "SSC CPO 2026",
    "vacancies": "1,871 (tentative)",
    "eligibility": "Bachelor's degree; post-specific age and physical standards apply",
    "feeDetails": "₹100; exemptions as stated in the official notice",
    "applicationUrl": "https://ssc.gov.in/login",
    "url": "https://ssc.gov.in/login",
    "notificationUrl": "https://ssc.gov.in/",
    "sourceUrl": "https://ssc.gov.in/",
    "sourceName": "SSC — Official Notice Board",
    "official": true,
    "summary": "Sub-Inspector recruitment for Delhi Police and CAPFs. Applications close on 30 Sep 2026; confirm age, physical standards and post-specific requirements in the official notice.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-ssc-chsl-2026",
    "title": "SSC Combined Higher Secondary (10+2) Level Examination 2026",
    "organization": "SSC",
    "category": "SSC",
    "type": "Recruitment notification",
    "status": "notification",
    "notificationDate": "2026-09-07",
    "applicationStartDate": "2026-09-07",
    "lastDate": "2026-10-07",
    "feePaymentLastDate": "2026-10-08",
    "advertisementNo": "HQ-C1102/5/2026-C-1",
    "vacancies": "2,536 (tentative)",
    "eligibility": "Class 12 or equivalent; post-specific conditions apply",
    "feeDetails": "₹100; exemptions as stated in the official notice",
    "applicationUrl": "https://ssc.gov.in/login",
    "url": "https://ssc.gov.in/login",
    "notificationUrl": "https://ssc.gov.in/",
    "sourceUrl": "https://ssc.gov.in/",
    "sourceName": "SSC — Official Notice Board",
    "official": true,
    "summary": "LDC/JSA and Data Entry Operator recruitment. Online applications close on 7 Oct 2026; fee payment closes on 8 Oct. Vacancies are tentative.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-boi-officers-2026-27-02",
    "title": "Bank of India — Officers in Various Streams up to Scale IV (Project 2026–27/02)",
    "organization": "Bank of India",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "notificationDate": "2026-09-10",
    "applicationStartDate": "2026-09-10",
    "lastDate": "2026-10-05",
    "advertisementNo": "Project No. 2026–27/02",
    "eligibility": "Post-specific degree, professional qualification and experience requirements apply",
    "applicationUrl": "https://ibpsreg.ibps.in/boiaug26/",
    "url": "https://ibpsreg.ibps.in/boiaug26/",
    "notificationUrl": "https://bankofindia.bank.in/career/recruitment-notice",
    "sourceUrl": "https://bankofindia.bank.in/career/recruitment-notice",
    "sourceName": "Bank of India — Recruitment",
    "official": true,
    "summary": "Online registration runs from 10 Sep to 5 Oct 2026. Eligibility varies by officer stream and scale; read the official advertisement before applying.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-bob-hr-2026",
    "title": "Bank of Baroda — Human Resource Recruitment (Regular Basis)",
    "organization": "Bank of Baroda",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "notificationDate": "2026-09-04",
    "applicationStartDate": "2026-09-04",
    "lastDate": "2026-10-01",
    "eligibility": "Department- and post-specific qualifications apply; see the official advertisement",
    "applicationUrl": "https://ibpsreg.ibps.in/bonwejul26/",
    "url": "https://ibpsreg.ibps.in/bonwejul26/",
    "notificationUrl": "https://www.bankofbaroda.in/career",
    "sourceUrl": "https://www.bankofbaroda.in/career",
    "sourceName": "Bank of Baroda — Careers",
    "official": true,
    "summary": "Online registration closes on 1 Oct 2026. Check the linked application portal and Bank of Baroda notice for the departments, qualifications and conditions.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-ibps-various-2026",
    "title": "IBPS — Recruitment of Various Posts (2026)",
    "organization": "IBPS",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "notificationDate": "2026-09-23",
    "applicationStartDate": "2026-09-23",
    "lastDate": "2026-10-06",
    "eligibility": "Post-specific education and experience requirements apply",
    "applicationUrl": "https://ibpsreg.ibps.in/ibpsvpspt26/",
    "url": "https://ibpsreg.ibps.in/ibpsvpspt26/",
    "notificationUrl": "https://www.ibps.in/index.php/careers/",
    "sourceUrl": "https://www.ibps.in/index.php/careers/",
    "sourceName": "IBPS — Careers",
    "official": true,
    "summary": "IBPS recruitment application portal opened on 23 Sep 2026 and closes on 6 Oct. Review the current advertisement and application instructions for the exact posts and eligibility.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-ibps-ieb-srd-2026-27-04",
    "title": "IBPS — Special Recruitment Drive (Advt. HRM/DM/SRD/2026–27/04)",
    "organization": "IBPS",
    "category": "BANKING",
    "type": "Recruitment notification",
    "status": "notification",
    "notificationDate": "2026-09-15",
    "applicationStartDate": "2026-09-15",
    "lastDate": "2026-10-10",
    "advertisementNo": "HRM/DM/SRD/2026–27/04",
    "eligibility": "Drive- and post-specific eligibility applies; check the official notice",
    "applicationUrl": "https://ibpsreg.ibps.in/iebsrdaug26/",
    "url": "https://ibpsreg.ibps.in/iebsrdaug26/",
    "notificationUrl": "https://www.ibps.in/index.php/recruitment/",
    "sourceUrl": "https://www.ibps.in/index.php/recruitment/",
    "sourceName": "IBPS — Other Ongoing Recruitments",
    "official": true,
    "summary": "The online registration window runs from 15 Sep to 10 Oct 2026. Check the official recruitment notice for the exact drive scope and eligibility.",
    "verifiedAt": "2026-09-30"
  },
  {
    "id": "curated-mecl-non-executive-03-2026",
    "title": "MECL — Non-Executive Recruitment (Advt. 03/Rectt./2026)",
    "organization": "MECL",
    "category": "TECHNICAL",
    "type": "Recruitment notification",
    "status": "notification",
    "notificationDate": "2026-09-12",
    "applicationStartDate": "2026-09-12",
    "lastDate": "2026-10-11",
    "advertisementNo": "03/Rectt./2026",
    "eligibility": "Post-specific education, trade and experience requirements apply",
    "applicationUrl": "https://ibpsreg.ibps.in/mecljul26/",
    "url": "https://ibpsreg.ibps.in/mecljul26/",
    "notificationUrl": "https://mecl.co.in/ContentPageMecl.aspx?ControlID=61&Lng=EN&page=advertisement-notices-and-results",
    "sourceUrl": "https://mecl.co.in/ContentPageMecl.aspx?ControlID=61&Lng=EN&page=advertisement-notices-and-results",
    "sourceName": "MECL — Advertisement Notices",
    "official": true,
    "summary": "Non-Executive recruitment under Advertisement 03/Rectt./2026. Registration closes on 11 Oct 2026; verify post-wise qualifications in the detailed advertisement.",
    "verifiedAt": "2026-09-30"
  }
];

const navigationTitles = new Set([
  'home','about us','about drdo','our team','technology clusters','corporate clusters',
  'schemes and services','industry support','vacancies','competitions and awards',
  'products','publications','avalanche warning bulletin','drdo in news','forms and manuals',
  'press release','acts and policies','photos','videos','conference','contact us','rti',
  'faqs','faq','more','login','sign in','administration','promotion','recruitment rules',
  'direct recruitment','notifications/recruitment','notifications / recruitment',
  'employment','syllabus','admit cards','results/misc/answer keys','circular',
  'events calendar','event calendar','copyright statement','recruitment','notifications',
  'notification','apply online','read more','view details','click here','download'
]);

function cleanNoticeTitle(value) {
  let title = stripHtml(String(value || ''))
    .replace(/\s*(?:read more|view details|click here|download pdf)\b[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (title.length > 180) {
    const first = title.split(/(?<=[.!?])\s+/)[0];
    title = first && first.length >= 18 ? first : title.slice(0, 180).trim();
  }
  return title.slice(0, 180);
}

function isNoticeTitle(value, href = '') {
  const title = cleanNoticeTitle(value);
  const normalized = title.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!title || title.length < 14 || navigationTitles.has(normalized)) return false;
  if (/[{}]|\| translate \|/i.test(title)) return false;
  if (/^(?:home|about|contact|login|dashboard|administration|promotion|manual|faq|more)\b/i.test(title)) return false;
  if (/^(?:notifications?\s*\/\s*recruitment|results?\s*\/\s*misc|recruitment rules|direct recruitment)$/i.test(title)) return false;
  if (/\b(?:copyright|privacy policy|terms of use|sitemap|site map|feedback|user manual|website policy)\b/i.test(title)) return false;
  const noticeSignal = /\b(?:advt\.?|advertisement|notification|recruitment|vacanc(?:y|ies)|employment notice|admit cards?|e-?admit cards?|hall tickets?|answer keys?|results?|merit lists?|extension of (?:the )?(?:last )?date|inviting online applications?|apply online|examination|written exam(?:ination)?|interview|corrigendum|provisional|city intimation|application form|shortlist(?:ed)?)\b|calendar schedule/i;
  if (noticeSignal.test(title)) return true;
  return /\.(?:pdf|html?)($|\?)/i.test(href) && /(?:notice|advt|advert|recruit|vacan|exam|result|admit|answer)/i.test(href);
}

function isNoticeRecord(item) {
  return Boolean(item && (curatedIds.has(String(item.id || '')) || isNoticeTitle(item.title, item.url)));
}

async function fetchSource(source){
  const res = await fetchWithRetry(source.url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow', timeoutMs: 20000, attempts: 3, baseDelayMs: 300, maxDelayMs: 1800
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const html = await res.text();
  const matches = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const out = [];
  for (const m of matches) {
    if (out.length >= MAX_PER_SOURCE) break;
    const label = stripHtml(m[2]);
    const href = normalizeUrl(m[1], source.url);
    if (!href || label.length < 2) continue;

    let surroundingHtml = '';
    const rowStart = html.lastIndexOf('<tr', m.index);
    const rowEnd = html.indexOf('</tr>', m.index);
    if (rowStart >= 0 && rowEnd >= 0 && m.index - rowStart < 2500 && rowEnd - m.index < 2500) {
      surroundingHtml = html.slice(rowStart, rowEnd + 5);
    } else {
      const liStart = html.lastIndexOf('<li', m.index);
      const liEnd = html.indexOf('</li>', m.index);
      if (liStart >= 0 && liEnd >= 0 && m.index - liStart < 1200 && liEnd - m.index < 1200) {
        surroundingHtml = html.slice(liStart, liEnd + 5);
      } else {
        surroundingHtml = html.slice(Math.max(0, m.index - 500), Math.min(html.length, m.index + 1000));
      }
    }
    const nearby = stripHtml(surroundingHtml);
    const context = [label, nearby, href].join(' ').slice(0, 1800);
    if (!relevant.test(context)) continue;

    const genericLabel = /^(click here|view|download|read more|more|apply online|apply now|here|details|know more)[\s:—-]*$/i.test(label);
    const title = cleanNoticeTitle(titleFromAnchor(genericLabel && nearby.length > 12 ? nearby : label || source.name));
    if (!isNoticeTitle(title, href)) continue;
    out.push({ label: title, url: href, context });
  }
  return { out, checkedAt: new Date().toISOString() };
}

function inferDates(context){
  return [...context.matchAll(dateRx)].map(x=>x[0]).slice(0,4);
}

async function main(){
  let existing={version:1,generatedAt:null,source:'VAANI Defence Notification Engine',items:[]};
  let archive={version:1,generatedAt:null,source:'VAANI Defence Notification Archive',items:[]};
  try { existing=JSON.parse(await fs.readFile(DATA_FILE,'utf8')); } catch {}
  try { archive=JSON.parse(await fs.readFile(ARCHIVE_FILE,'utf8')); } catch {}
  const rejectedIds=(existing.items||[]).filter(x=>!isNoticeRecord(x)).map(x=>String(x.id)).filter(Boolean);
  const pruneIds=[...new Set([...(Array.isArray(existing.pruneIds)?existing.pruneIds:[]),...rejectedIds])];
  const byKey=new Map((existing.items||[]).filter(isNoticeRecord).map(x=>[x.id,x]));
  const sourceResults = await mapConcurrent(sources, SOURCE_CONCURRENCY, async source => {
    const started = Date.now();
    try {
      const result = await fetchSource(source);
      return { source, ok: true, found: result.out.length, durationMs: Date.now() - started, hits: result.out };
    } catch (error) {
      return { source, ok: false, found: 0, durationMs: Date.now() - started, error: String(error?.message || error), hits: [] };
    }
  });
  const runLog = sourceResults.map(result => ({
    source: result.source.name, ok: result.ok, found: result.found, durationMs: result.durationMs,
    ...(result.error ? { error: result.error } : {})
  }));
  const now = new Date();
  const sourceStatus = createSourceStatus({
    checkedAt: now.toISOString(), sources: runLog,
    liveItems: (existing.items || []).length, archiveItems: (archive.items || []).length,
    snapshotRetained: true, concurrency: SOURCE_CONCURRENCY
  });
  if (sourceStatus.sourcesOk === 0) {
    await fs.writeFile(STATUS_FILE, JSON.stringify(sourceStatus, null, 2) + String.fromCharCode(10));
    console.warn('All official sources failed; preserving the last known-good live and archive snapshots.');
    console.log(JSON.stringify(sourceStatus, null, 2));
    return;
  }

  for (const result of sourceResults) {
    if (!result.ok) continue;
    const source = result.source;
    for (const hit of result.hits) {
      const combined = hit.label + ' ' + hit.url + ' ' + hit.context;
      const category = categoryFor(combined, source.categories);
      const id = makeId(hit.label, hit.url);
      const dates = inferDates(hit.context);
      const prev = byKey.get(id);
      byKey.set(id, {
        ...(prev || {}),
        id,
        title: hit.label,
        organization: source.name.split(' — ')[0],
        category,
        type: statusFor(combined),
        status: statusFor(combined),
        ...(dates[0] && !prev?.notificationDate ? { notificationDate: dates[0] } : {}),
        url: hit.url,
        sourceUrl: source.url,
        sourceName: source.name,
        official: true,
        firstSeen: prev?.firstSeen || now.toISOString(),
        lastSeen: now.toISOString(),
        summary: prev?.summary || "Automatically discovered from the organisation's public source page. Open the official source and verify the complete notice before applying."
      });
    }
  }

  // Reapply verified application details after scraping so generic
  // "APPLY ONLINE" anchors cannot erase informative titles and date fields.
  for (const curated of curatedApplications) {
    const found = byKey.get(curated.id) || (
      curated.id.startsWith('curated-sbi-')
        ? [...byKey.values()].find(item => item.url === curated.applicationUrl || item.applicationUrl === curated.applicationUrl)
        : null
    );
    const id = found?.id || curated.id;
    byKey.set(id, {
      ...(found || {}),
      ...curated,
      id,
      firstSeen: found?.firstSeen || now.toISOString(),
      lastSeen: now.toISOString()
    });
  }

  const archiveMap=new Map((archive.items||[]).map(x=>[x.id,x]));
  const live=[];
  for (const item of byKey.values()) {
    const examDate = item.examDate ? new Date(item.examDate) : null;
    const deadline = item.lastDate ? new Date(item.lastDate) : null;
    const itemStatus = String(item.status || item.type || '').toLowerCase();
    const examPassed = examDate && !Number.isNaN(examDate.valueOf()) && examDate < now;
    const applicationClosed = deadline && !Number.isNaN(deadline.valueOf()) && deadline < now && /notification|upcoming|application/.test(itemStatus);
    const titleYear = (String(item.title).match(/20\d{2}/) || [])[0];
    const oldYear = titleYear && Number(titleYear) < now.getUTCFullYear();
    if (examPassed || applicationClosed || oldYear) {
      const reason = examPassed ? 'exam-date-passed' : applicationClosed ? 'application-deadline-passed' : 'older-cycle';
      archiveMap.set(item.id, {
        ...item,
        archivedAt: archiveMap.get(item.id)?.archivedAt || now.toISOString(),
        archiveReason: reason
      });
    } else live.push(item);
  }
  const items=live.filter(x=>x.title&&x.url).sort((a,b)=>String(b.lastSeen||b.firstSeen).localeCompare(String(a.lastSeen||a.firstSeen)));
  const archived=[...archiveMap.values()].sort((a,b)=>String(b.archivedAt||'').localeCompare(String(a.archivedAt||'')));
  const output = { version: 1, generatedAt: now.toISOString(), source: 'VAANI Government & Defence Notification Engine', checkedSources: runLog, pruneIds, items };
  const archiveOutput = { version: 1, generatedAt: now.toISOString(), source: 'VAANI Defence Notification Archive', items: archived };
  const statusOutput = createSourceStatus({
    checkedAt: now.toISOString(), sources: runLog, liveItems: items.length, archiveItems: archived.length,
    snapshotRetained: false, concurrency: SOURCE_CONCURRENCY
  });
  await Promise.all([
    fs.writeFile(DATA_FILE, JSON.stringify(output, null, 2) + String.fromCharCode(10)),
    fs.writeFile(ARCHIVE_FILE, JSON.stringify(archiveOutput, null, 2) + String.fromCharCode(10)),
    fs.writeFile(STATUS_FILE, JSON.stringify(statusOutput, null, 2) + String.fromCharCode(10))
  ]);
  console.log(JSON.stringify({ generatedAt: output.generatedAt, items: items.length, archiveItems: archived.length, ...statusOutput }, null, 2));
}

main().catch(error=>{console.error(error);process.exit(1);});
