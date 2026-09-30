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
        { title: '10+2 Technical Entry Scheme (TES)', note: 'Technical officer route after Class 12 PCM; shortlisting and medical rules are notice-specific.', quals: ['12th'], url: 'https://joinindianarmy.nic.in/' },
        { title: 'Technical Graduate Course (TGC)', note: 'Engineering-graduate officer entry; eligible disciplines and age limits are notice-specific.', quals: ['btech'], url: 'https://joinindianarmy.nic.in/' },
        { title: 'SSC Technical', note: 'Short Service Commission technical entry for eligible engineering graduates.', quals: ['btech'], url: 'https://joinindianarmy.nic.in/' },
        { title: 'NCC Special Entry', note: 'Officer entry for candidates meeting the prescribed NCC and degree criteria.', quals: ['graduate'], url: 'https://joinindianarmy.nic.in/' },
        { title: 'JAG Entry', note: 'Judge Advocate General officer route for eligible law graduates.', quals: ['law'], url: 'https://joinindianarmy.nic.in/' },
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
        { title: 'SSC Officer entries', note: 'Executive, technical, logistics, education and other branches as advertised.', quals: ['graduate', 'btech', 'postgraduate'], url: 'https://www.joinindiannavy.gov.in/' },
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
        { title: 'NCC Special Entry (Flying)', note: 'Flying-branch route for eligible NCC Air Wing Senior Division candidates with the prescribed certificate.', quals: ['graduate'], url: 'https://careerairforce.gov.in/' },
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
        { title: 'Assistant Commandant (GD / Technical)', note: 'Officer recruitment for eligible graduates and engineers; branch rules differ.', quals: ['graduate', 'btech'], url: 'https://joinindiancoastguard.cdac.in/' },
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
        { title: 'Combined Medical Services', note: 'Medical qualification and registration required.', quals: ['mbbs'], url: 'https://www.upsc.gov.in/examinations' },
        { title: 'Indian Economic Service', note: 'Postgraduate Economics or an accepted equivalent; read the UPSC notice.', quals: ['postgraduate'], url: 'https://upsc.gov.in/examinations' },
        { title: 'Indian Statistical Service', note: 'Statistics / mathematical-statistics degree requirements apply.', quals: ['bsc', 'postgraduate'], url: 'https://upsc.gov.in/examinations' },
        { title: 'EPFO Enforcement Officer / APFC', note: 'Recruitment is notice-based; degree and post-specific requirements apply.', quals: ['graduate'], url: 'https://upsc.gov.in/recruitment' }
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
        { title: 'CPO / Stenographer', note: 'Graduate or Class 12 route, respectively', quals: ['12th', 'graduate'], url: 'https://ssc.gov.in/' },
        { title: 'Junior Hindi Translator (JHT)', note: 'Language-degree and translation qualification requirements apply.', quals: ['graduate', 'postgraduate'], url: 'https://ssc.gov.in/' },
        { title: 'Selection Posts', note: 'Vacancies span matriculation, higher-secondary and graduate levels.', quals: ['10th', '12th', 'graduate'], url: 'https://ssc.gov.in/' },
        { title: 'Scientific Assistant (IMD)', note: 'Science / engineering subject combinations are specified in the notice.', quals: ['bsc', 'btech'], url: 'https://ssc.gov.in/' }
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
        { title: 'NABARD Grade A / B', note: 'Rural development, agriculture and specialist streams; criteria differ by discipline.', quals: ['graduate', 'postgraduate', 'agri'], url: 'https://www.nabard.org/careers-notices1.aspx' },
        { title: 'SEBI Grade A', note: 'General and specialist streams; the accepted degree varies by stream.', quals: ['graduate', 'postgraduate', 'btech', 'law'], url: 'https://www.sebi.gov.in/department/human-resources-department-37/opportunity.html' },
        { title: 'IRDAI Assistant Manager', note: 'Regulatory officer recruitment; stream-wise eligibility applies.', quals: ['graduate', 'postgraduate'], url: 'https://irdai.gov.in/careers' },
        { title: 'SIDBI Grade A / B', note: 'Development-finance roles with advertisement-specific eligibility.', quals: ['graduate', 'postgraduate', 'btech'], url: 'https://www.sidbi.in/en/careers' },
        { title: 'EXIM Bank Management Trainee', note: 'Finance, banking and specialist disciplines as advertised.', quals: ['graduate', 'postgraduate', 'mba'], url: 'https://www.eximbankindia.in/careers' },
        { title: 'Insurance (LIC / NIACL)', note: 'Administrative and development roles', quals: ['graduate'], url: 'https://licindia.in/careers' }
      ]
    },
    {
      sector: 'teaching', title: 'Teaching & education', eyebrow: 'EDUCATION',
      description: 'Teacher eligibility, school recruitment and academic careers.',
      routes: [
        { title: 'CTET', note: 'Teacher eligibility; teacher-training rules apply.', quals: ['12th', 'teaching'], url: 'https://ctet.nic.in/' },
        { title: 'KVS / NVS', note: 'Teaching and non-teaching posts', quals: ['graduate', 'postgraduate', 'teaching'], url: 'https://kvsangathan.nic.in/' },
        { title: 'DSSSB', note: 'Delhi teaching, clerical and technical recruitment; post-wise criteria apply.', quals: ['12th', 'graduate', 'teaching', 'diploma'], url: 'https://dsssb.delhi.gov.in/' },
        { title: 'Eklavya Model Residential Schools (EMRS)', note: 'Teaching and non-teaching roles; qualification and training rules vary.', quals: ['graduate', 'postgraduate', 'teaching'], url: 'https://nests.tribal.gov.in/' },
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
        { title: 'BSSC Inter Level / CGL', note: 'Bihar subordinate-service recruitment; qualification depends on the post and notice.', quals: ['12th', 'graduate'], url: 'https://bssc.bihar.gov.in/' },
        { title: 'UPSSSC PET & main examinations', note: 'Preliminary eligibility and post-specific main exams for notified Uttar Pradesh vacancies.', quals: ['10th', '12th', 'graduate'], url: 'https://upsssc.gov.in/' },
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
        { title: 'AILET', note: 'National Law University Delhi admission test; UG and PG eligibility differ.', quals: ['12th', 'law', 'graduate'], url: 'https://nationallawuniversitydelhi.in/' },
        { title: 'NIFT / NID / UCEED / NATA', note: 'Fashion, design and architecture admissions; course-wise eligibility differs.', quals: ['12th', 'design', 'architecture', 'graduate'], url: 'https://exams.nta.ac.in/NIFTEE/' },
        { title: 'GATE', note: 'Postgraduate study and selected recruitment pathways', quals: ['btech', 'bsc', 'graduate'], url: 'https://gate2026.iitg.ac.in/' }
      ]
    },
    {
      sector: 'health', title: 'Healthcare & paramedical', eyebrow: 'HEALTH',
      description: 'Nursing, medical, laboratory and allied healthcare recruitment.',
      routes: [
        { title: 'AIIMS NORCET', note: 'Nursing officer recruitment; nursing qualification required.', quals: ['nursing'], url: 'https://www.aiimsexams.ac.in/' },
        { title: 'Medical officer roles', note: 'MBBS and registration requirements vary by notice.', quals: ['mbbs'], url: 'https://www.upsc.gov.in/recruitment' },
        { title: 'Pharmacist', note: 'D.Pharm / B.Pharm and registration requirements vary by post.', quals: ['pharmacy', 'diploma'], url: 'https://www.aiimsexams.ac.in/' },
        { title: 'Physiotherapist', note: 'Recognised physiotherapy qualification and registration where required.', quals: ['bsc', 'graduate', 'paramedical'], url: 'https://www.aiimsexams.ac.in/' },
        { title: 'Optometry & vision care', note: 'Diploma/degree pathways; regulated-role requirements may apply.', quals: ['diploma', 'bsc', 'paramedical'], url: 'https://www.aiimsexams.ac.in/' },
        { title: 'Public health & health administration', note: 'Health-science, public-health or management qualifications by role.', quals: ['graduate', 'postgraduate', 'mbbs', 'nursing'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' },
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
    },
    {
      sector: 'agriculture', title: 'Agriculture, food & environment', eyebrow: 'AGRI / ENVIRONMENT',
      description: 'Careers in agricultural science, rural development, food systems, natural resources and sustainability.',
      routes: [
        { title: 'Agriculture Development Officer', note: 'State agriculture recruitment; degree subject and age rules vary.', quals: ['agri', 'bsc', 'graduate'], url: 'https://icar.gov.in/index.php/en/vacancies' },
        { title: 'ICAR scientist & technical roles', note: 'Research, laboratory, field and technical posts with institute-specific qualifications.', quals: ['agri', 'bsc', 'btech', 'postgraduate', 'diploma'], url: 'https://icar.gov.in/index.php/en/vacancies' },
        { title: 'Actuarial Common Entrance Test (ACET)', note: 'Entry examination for the actuarial profession; check current education and registration rules.', quals: ['12th', 'graduate'], url: 'https://www.actuariesindia.org/' },
        { title: 'Rural development specialist', note: 'Agriculture, economics, finance and community-development pathways.', quals: ['agri', 'ba', 'bsc', 'bcom', 'graduate', 'postgraduate'], url: 'https://www.nabard.org/careers-notices1.aspx' },
        { title: 'Food technology & processing', note: 'Science, engineering and processing qualifications depend on the role.', quals: ['bsc', 'btech', 'diploma', 'postgraduate'], url: 'https://www.fssai.gov.in/cms/jobs.php' },
        { title: 'Food safety officer', note: 'Only specified science/technical degrees are accepted in each recruitment notice.', quals: ['bsc', 'btech', 'postgraduate'], url: 'https://www.fssai.gov.in/cms/jobs.php' },
        { title: 'Fisheries & aquaculture', note: 'Fisheries and allied science degrees; field and research opportunities.', quals: ['agri', 'bsc', 'postgraduate'], url: 'https://icar.gov.in/index.php/en/vacancies' },
        { title: 'Forestry, wildlife & conservation', note: 'Forestry, biology and environmental-science pathways; ranger rules are state-specific.', quals: ['agri', 'bsc', 'graduate', 'postgraduate'], url: 'https://upsc.gov.in/examinations' },
        { title: 'Dairy & animal husbandry', note: 'Veterinary and dairy-science routes; regulated roles require prescribed qualifications.', quals: ['agri', 'bsc', 'btech', 'postgraduate'], url: 'https://icar.gov.in/index.php/en/vacancies' }
      ]
    },
    {
      sector: 'digital', title: 'IT, software & digital careers', eyebrow: 'DIGITAL / TECHNOLOGY',
      description: 'Technology roles across software, data, cyber security, networks and digital product teams.',
      routes: [
        { title: 'Software / web developer', note: 'Build programming, databases and project skills; hiring requirements vary by employer.', quals: ['bca', 'btech', 'bsc', 'graduate'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' },
        { title: 'Data analyst / business intelligence', note: 'Statistics, spreadsheets, SQL and data-visualisation skills are useful.', quals: ['bcom', 'bba', 'bca', 'bsc', 'btech', 'graduate'], url: 'https://swayamplus.education.gov.in/' },
        { title: 'AI / machine-learning associate', note: 'Programming, mathematics and data foundations; advanced roles may require postgraduate study.', quals: ['bca', 'bsc', 'btech', 'postgraduate'], url: 'https://swayam.gov.in/' },
        { title: 'Cybersecurity / SOC analyst', note: 'Networking, operating systems and security labs; certifications may supplement study.', quals: ['bca', 'btech', 'bsc', 'diploma', 'graduate'], url: 'https://www.nielit.gov.in/content/courses' },
        { title: 'Cloud & network support', note: 'Networking, Linux and cloud fundamentals; entry roles may accept a diploma or certification.', quals: ['iti', 'diploma', 'bca', 'btech', 'bsc'], url: 'https://www.nielit.gov.in/content/courses' },
        { title: 'IT support / hardware technician', note: 'Hardware, troubleshooting and operating-system skills; practical training helps.', quals: ['12th', 'iti', 'diploma', 'bca'], url: 'https://www.skillindiadigital.gov.in/' },
        { title: 'Quality assurance / software testing', note: 'Manual testing, test design and automation; coding depth depends on the role.', quals: ['bca', 'btech', 'bsc', 'graduate'], url: 'https://swayamplus.education.gov.in/' },
        { title: 'NIELIT / NIC technical posts', note: 'Government IT recruitment through separate notices and discipline-specific criteria.', quals: ['bca', 'btech', 'bsc', 'diploma', 'postgraduate'], url: 'https://www.nielit.gov.in/recruitments' }
      ]
    },
    {
      sector: 'commerce', title: 'Commerce, accounting & professional courses', eyebrow: 'COMMERCE / FINANCE',
      description: 'Professional qualifications and business careers in audit, taxation, compliance and finance.',
      routes: [
        { title: 'Chartered Accountant (CA)', note: 'ICAI Foundation, Intermediate and Final route; exemptions and entry rules apply.', quals: ['12th', 'bcom', 'graduate', 'ca'], url: 'https://www.icai.org/students.shtml?mod=5' },
        { title: 'Company Secretary (CS)', note: 'ICSI CSEET / Executive / Professional stages; current entry rules apply.', quals: ['12th', 'bcom', 'graduate', 'cs'], url: 'https://www.icsi.edu/students/are-you-interested-in-cs-course' },
        { title: 'Cost & Management Accountant (CMA)', note: 'ICMAI Foundation, Intermediate and Final; exemptions depend on prior study.', quals: ['12th', 'bcom', 'graduate', 'cma'], url: 'https://icmai.in/ClntStudents/CourseEligibility' },
        { title: 'Accounting, audit & taxation', note: 'Accounts, tax compliance and audit-support roles; practical tools improve employability.', quals: ['bcom', 'bba', 'graduate', 'ca', 'cma'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' },
        { title: 'GST & payroll operations', note: 'Accounting software, statutory filings and payroll skills; role requirements vary.', quals: ['12th', 'bcom', 'bba', 'graduate'], url: 'https://www.skillindiadigital.gov.in/' },
        { title: 'Investment & securities operations', note: 'Capital-market operations and research-support roles; check role-specific certification rules.', quals: ['bcom', 'bba', 'bca', 'bsc', 'graduate'], url: 'https://www.nism.ac.in/' },
        { title: 'Business analyst / operations', note: 'Process, reporting and communication skills; backgrounds vary by industry.', quals: ['bba', 'bcom', 'bca', 'btech', 'graduate'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' },
        { title: 'MBA / PGDM management route', note: 'Postgraduate management study; entrance tests and admission rules vary by institute.', quals: ['graduate', 'mba'], url: 'https://www.nirfindia.org/' }
      ]
    },
    {
      sector: 'creative', title: 'Design, architecture & media', eyebrow: 'CREATIVE / COMMUNICATION',
      description: 'Visual design, architecture, fashion, animation, media and communication careers.',
      routes: [
        { title: 'Graphic & visual designer', note: 'Build a portfolio in typography, layout and visual tools; degree rules vary by employer.', quals: ['12th', 'design', 'graduate'], url: 'https://swayam.gov.in/' },
        { title: 'UI / UX & product design', note: 'User research, interaction design and prototyping; portfolio-led entry is common.', quals: ['12th', 'design', 'bca', 'btech', 'graduate'], url: 'https://swayamplus.education.gov.in/' },
        { title: 'Animation, VFX & motion graphics', note: 'Portfolio and tool skills matter; formal design/media courses are optional in some roles.', quals: ['12th', 'design', 'media'], url: 'https://www.skillindiadigital.gov.in/' },
        { title: 'Fashion & textile design', note: 'Design programmes, portfolio and institute-specific entrance routes.', quals: ['12th', 'design'], url: 'https://www.nift.ac.in/' },
        { title: 'Industrial / product design', note: 'Design aptitude, portfolio and programme-specific admission requirements.', quals: ['12th', 'design', 'btech'], url: 'https://admissions.nid.edu/' },
        { title: 'Architecture & planning', note: 'Recognised architecture education and applicable aptitude-test requirements.', quals: ['12th', 'architecture'], url: 'https://www.nata.in/' },
        { title: 'Journalism & mass communication', note: 'Reporting, editing, production and communication roles; course routes vary.', quals: ['12th', 'ba', 'media', 'graduate'], url: 'https://swayam.gov.in/' },
        { title: 'Content writing & communication', note: 'Writing, research and editing portfolio; employers set role-specific standards.', quals: ['12th', 'ba', 'media', 'graduate'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' }
      ]
    },
    {
      sector: 'vocational', title: 'Skilled trades & apprenticeships', eyebrow: 'SKILL / APPRENTICESHIP',
      description: 'Work-based routes for learners who prefer practical training and industry experience.',
      routes: [
        { title: 'NAPS apprenticeships', note: 'Search trade and establishment-based apprenticeship opportunities.', quals: ['10th', '12th', 'iti', 'diploma'], url: 'https://www.apprenticeshipindia.gov.in/' },
        { title: 'NATS apprenticeships', note: 'Graduate, diploma and vocational apprenticeship opportunities; scheme eligibility varies.', quals: ['diploma', 'btech', 'bsc', 'bcom', 'bca', 'graduate'], url: 'https://nats.education.gov.in/' },
        { title: 'Electrician / fitter / welder', note: 'ITI and trade-certification routes with employer-specific practical tests.', quals: ['10th', 'iti'], url: 'https://www.skillindiadigital.gov.in/' },
        { title: 'CNC, machining & manufacturing', note: 'Trade, diploma and hands-on production skills; standards vary by industry.', quals: ['10th', 'iti', 'diploma'], url: 'https://www.skillindiadigital.gov.in/' },
        { title: 'Electronics & embedded technician', note: 'Electronics, maintenance and testing pathways through ITI/diploma and skills training.', quals: ['iti', 'diploma', 'btech'], url: 'https://www.nielit.gov.in/content/courses' },
        { title: 'EV service & automotive technician', note: 'Vehicle diagnostics, electrical safety and service training.', quals: ['10th', 'iti', 'diploma'], url: 'https://www.skillindiadigital.gov.in/' },
        { title: 'Solar / renewable-energy technician', note: 'Electrical and renewable-energy installation/maintenance training.', quals: ['10th', 'iti', 'diploma'], url: 'https://www.skillindiadigital.gov.in/' },
        { title: 'Logistics & supply-chain operations', note: 'Warehouse, inventory, dispatch and operations roles; certifications may help.', quals: ['12th', 'diploma', 'graduate'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' }
      ]
    },
    {
      sector: 'hospitality', title: 'Hospitality, tourism & aviation services', eyebrow: 'SERVICE / TOURISM',
      description: 'Guest services, culinary work, travel operations and airport-facing careers.',
      routes: [
        { title: 'Hotel & hospitality management', note: 'Diploma and degree routes; admission criteria differ by institute.', quals: ['12th', 'hospitality', 'graduate'], url: 'https://exams.nta.ac.in/NCHM/' },
        { title: 'Chef & food production', note: 'Culinary training, food safety and practical experience are central.', quals: ['10th', '12th', 'hospitality'], url: 'https://www.skillindiadigital.gov.in/' },
        { title: 'Travel & tourism operations', note: 'Travel desk, tour operations and destination services; language skills help.', quals: ['12th', 'hospitality', 'graduate'], url: 'https://tourism.gov.in/' },
        { title: 'Airport ground operations', note: 'Customer service, ramp and operations roles; employer training and conditions vary.', quals: ['12th', 'diploma', 'aviation'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' },
        { title: 'Event & conference management', note: 'Planning, budgeting, vendors and communication; practical experience is valuable.', quals: ['12th', 'bba', 'graduate', 'hospitality'], url: 'https://swayamplus.education.gov.in/' }
      ]
    },
    {
      sector: 'research', title: 'Research, laboratories & academia', eyebrow: 'RESEARCH / HIGHER STUDY',
      description: 'Scientific research, academic study and project-based roles across institutions.',
      routes: [
        { title: 'CSIR-UGC NET / JRF', note: 'Research fellowship and eligibility routes; subject and degree rules apply.', quals: ['bsc', 'btech', 'postgraduate'], url: 'https://csirnet.nta.ac.in/' },
        { title: 'ICMR research & project roles', note: 'Project assistant, technical and research vacancies are institute-specific.', quals: ['bsc', 'btech', 'mbbs', 'nursing', 'paramedical', 'postgraduate'], url: 'https://www.icmr.gov.in/' },
        { title: 'Research assistant / project staff', note: 'Universities and funded projects set their own qualifications and selection process.', quals: ['ba', 'bsc', 'btech', 'graduate', 'postgraduate'], url: 'https://icar.gov.in/index.php/en/vacancies' },
        { title: 'PhD / doctoral study', note: 'Entrance, fellowship and admission rules vary by university and subject.', quals: ['postgraduate', 'btech', 'bsc', 'graduate'], url: 'https://swayam.gov.in/' },
        { title: 'Laboratory & scientific support', note: 'Lab, instrumentation and data roles; trade, diploma or degree criteria vary.', quals: ['12th', 'iti', 'diploma', 'bsc', 'btech'], url: 'https://www.nielit.gov.in/recruitments' }
      ]
    },
    {
      sector: 'social', title: 'Social work, counselling & community careers', eyebrow: 'PUBLIC / SOCIAL IMPACT',
      description: 'People-focused careers in counselling, development, community programmes and public services.',
      routes: [
        { title: 'Social work (BSW / MSW)', note: 'Community, healthcare, school and development-sector roles.', quals: ['ba', 'graduate', 'postgraduate', 'socialwork'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' },
        { title: 'Psychology & counselling', note: 'Training and supervised practice requirements depend on the role and setting.', quals: ['ba', 'bsc', 'postgraduate', 'psychology'], url: 'https://swayam.gov.in/' },
        { title: 'NGO & development programmes', note: 'Programme, field and community-coordination roles; experience and local-language skills can help.', quals: ['12th', 'ba', 'bsc', 'graduate', 'socialwork'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' },
        { title: 'Public policy & programme research', note: 'Research, economics and public-administration backgrounds; role requirements vary.', quals: ['ba', 'bsc', 'bcom', 'graduate', 'postgraduate'], url: 'https://swayamplus.education.gov.in/' },
        { title: 'CSR & community engagement', note: 'Corporate social responsibility, reporting and field coordination roles.', quals: ['ba', 'bba', 'bcom', 'graduate', 'socialwork'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' }
      ]
    }
    ,
    {
      sector: 'entrance', title: 'Management entrance & business school routes', eyebrow: 'MBA / BUSINESS',
      description: 'Graduate-level management admission tests and business-school pathways.',
      routes: [
        { title: 'CAT', note: 'Common Admission Test for participating IIMs and other institutions.', quals: ['graduate'], url: 'https://iimcat.ac.in/' },
        { title: 'XAT', note: 'Xavier Aptitude Test; participating institutes set their own admission criteria.', quals: ['graduate'], url: 'https://xatonline.in/' },
        { title: 'CMAT', note: 'NTA management entrance examination accepted by participating institutions.', quals: ['graduate'], url: 'https://cmat.nta.nic.in/' },
        { title: 'MAT', note: 'AIMA management aptitude test; institute acceptance varies.', quals: ['graduate'], url: 'https://mat.aima.in/' },
        { title: 'SNAP', note: 'Symbiosis National Aptitude Test for participating programmes.', quals: ['graduate'], url: 'https://www.snaptest.org/' },
        { title: 'NMAT', note: 'NMAT by GMAC; participating schools determine accepted scores and rules.', quals: ['graduate'], url: 'https://www.mba.com/exams/nmat' },
        { title: 'ATMA', note: 'AIMS Test for Management Admissions; check participating institutions.', quals: ['graduate'], url: 'https://atmaaims.com/' },
        { title: 'State MBA CETs', note: 'State-level management entrance tests; dates and participating institutes vary.', quals: ['graduate'], url: 'https://cetcell.mahacet.org/' }
      ]
    },
    {
      sector: 'research', title: 'Science & research entrance examinations', eyebrow: 'SCIENCE / RESEARCH',
      description: 'Admissions and qualifying tests for science degrees, postgraduate study and research.',
      routes: [
        { title: 'IISER Aptitude Test (IAT)', note: 'Admission route for participating IISER programmes; current eligibility is course-specific.', quals: ['12th'], url: 'https://iiseradmission.in/' },
        { title: 'NEST', note: 'National Entrance Screening Test for NISER and UM-DAE CEBS programmes.', quals: ['12th'], url: 'https://www.nestexam.in/' },
        { title: 'IIT JAM', note: 'Admission test for participating postgraduate science programmes.', quals: ['bsc', 'btech', 'graduate'], url: 'https://jam2027.iitb.ac.in/' },
        { title: 'JEST', note: 'Screening test used by participating science research institutions; each programme sets eligibility.', quals: ['bsc', 'graduate', 'postgraduate'], url: 'https://www.jest.org.in/' },
        { title: 'TIFR Graduate Studies (GS)', note: 'Subject-specific entrance route for participating graduate research programmes.', quals: ['bsc', 'btech', 'graduate', 'postgraduate'], url: 'https://www.tifr.res.in/academics/gs.php' },
        { title: 'CSIR-UGC NET', note: 'National eligibility test for research fellowship and lectureship in notified subjects.', quals: ['postgraduate'], url: 'https://csirnet.nta.ac.in/' }
      ]
    },
    {
      sector: 'creative', title: 'Design, fashion & architecture entrance tests', eyebrow: 'DESIGN / BUILT ENVIRONMENT',
      description: 'Portfolio and aptitude-based admissions for design, fashion and architecture programmes.',
      routes: [
        { title: 'NIFT Entrance Examination (NIFTEE)', note: 'Fashion and design admissions; programme-wise eligibility applies.', quals: ['12th', 'graduate', 'design'], url: 'https://exams.nta.ac.in/NIFTEE/' },
        { title: 'NID Design Aptitude Test (DAT)', note: 'Undergraduate and postgraduate design admission routes.', quals: ['12th', 'graduate', 'design'], url: 'https://admissions.nid.edu/' },
        { title: 'UCEED', note: 'Undergraduate design admission test at participating institutes.', quals: ['12th', 'design'], url: 'https://www.uceed.iitb.ac.in/' },
        { title: 'CEED', note: 'Postgraduate design admission test; participating institutes set additional rules.', quals: ['graduate', 'btech', 'design'], url: 'https://www.ceed.iitb.ac.in/' },
        { title: 'NATA', note: 'Aptitude test used for B.Arch admissions; verify current Council of Architecture rules.', quals: ['12th', 'architecture'], url: 'https://www.nata.in/' },
        { title: 'JEE Main Paper 2 (B.Arch / B.Planning)', note: 'Architecture and planning entrance papers; subject combinations and admission rules differ.', quals: ['12th', 'architecture'], url: 'https://jeemain.nta.nic.in/' }
      ]
    },
    {
      sector: 'technical', title: 'Maritime, shipping & logistics careers', eyebrow: 'MARITIME / LOGISTICS',
      description: 'Sea-going, marine engineering, port operations and logistics pathways.',
      routes: [
        { title: 'IMU-CET', note: 'Indian Maritime University admission test for notified UG and PG programmes.', quals: ['12th', 'graduate', 'btech'], url: 'https://www.imu.edu.in/imunew/admissions-2026-27' },
        { title: 'Nautical Science / Deck Officer pathway', note: 'Diploma or degree routes such as DNS and B.Sc. Nautical Science; medical and sponsorship rules matter.', quals: ['12th', 'graduate'], url: 'https://www.imu.edu.in/imunew/admissions-2026-27' },
        { title: 'Marine Engineering', note: 'Marine engineering degree and lateral-entry routes; institute and medical criteria apply.', quals: ['12th', 'diploma', 'btech'], url: 'https://www.imu.edu.in/imunew/admissions-2026-27' },
        { title: 'Naval Architecture & Ocean Engineering', note: 'Engineering study and specialist design or research roles.', quals: ['12th', 'btech', 'graduate'], url: 'https://www.imu.edu.in/imunew/admissions-2026-27' },
        { title: 'Port, shipping & logistics operations', note: 'Operations, cargo, planning and supply-chain roles; qualifications vary by employer.', quals: ['12th', 'diploma', 'graduate', 'bba', 'bcom'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' }
      ]
    },
    {
      sector: 'teaching', title: 'Sports, fitness & physical education', eyebrow: 'SPORTS / WELLNESS',
      description: 'Coaching, physical education, fitness and sports-support careers.',
      routes: [
        { title: 'B.P.Ed / M.P.Ed admissions', note: 'Physical-education degree routes; entrance, practical and fitness tests vary by university.', quals: ['graduate', 'postgraduate'], url: 'https://www.ncs.gov.in/job-seeker/pages/default.aspx' },
        { title: 'Sports coaching', note: 'Coaching roles through recognised training, sport-specific credentials and advertised vacancies.', quals: ['12th', 'graduate'], url: 'https://sportsauthorityofindia.nic.in/' },
        { title: 'Sports Authority of India recruitment', note: 'Coach, assistant, technical and other posts when advertised.', quals: ['graduate', 'bsc', 'postgraduate'], url: 'https://sportsauthorityofindia.nic.in/' },
        { title: 'Fitness & strength training', note: 'Practical certification, safe programming and experience support entry; employer rules vary.', quals: ['12th', 'graduate'], url: 'https://www.skillindiadigital.gov.in/' }
      ]
    }
  ];

  const state = { items: [], archived: [], generatedAt: null, loading: true, refreshing: false, feedAvailable: false, archiveAvailable: false, feedSource: '', feedError: '', feedRefreshFailed: false, sourceStatus: null, showAllArchive: false, showLaterExamDates: false, showAllLanes: { upcoming: false, ongoing: false, near: false }, linkBoardExpanded: { jobs: false, results: false, admit: false, keys: false } };

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
      item.eligibility, item.qualification, item.qualifications, item.education, item.advertisementNo, item.vacancies,
      item.feeDetails, item.selectionProcess].map(function (value) {
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
    const applicationUrl = safeUrl(item.applicationUrl || item.applyUrl);
    const url = safeUrl(applicationUrl || item.url || item.sourceUrl);
    const officialUrl = safeUrl(item.advertisementUrl || item.notificationUrl || item.sourceUrl);
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
    if (item.feePaymentLastDate && fmtDate(item.feePaymentLastDate)) details.push(['Fee payment', fmtDate(item.feePaymentLastDate)]);
    if (exam && fmtDate(exam)) details.push(['Exam date', fmtDate(exam)]);
    if (!start && !end && !exam && notice && fmtDate(notice)) details.push(['Notice date', fmtDate(notice)]);
    if (item.advertisementNo) details.push(['Advertisement', item.advertisementNo]);
    if (item.vacancies) details.push(['Vacancies', item.vacancies]);
    if (item.feeDetails) details.push(['Fee', item.feeDetails]);
    const detailsMarkup = details.length
      ? '<div class="vx-card-dates">' + details.map(function (pair) {
        return '<div><small>' + esc(pair[0]) + '</small><strong>' + esc(pair[1]) + '</strong></div>';
      }).join('') + '</div>'
      : '';
    const summary = item.summary || 'Open the official source and check the full notice before applying.';
    const actions = [];
    if (url) actions.push('<a class="vx-link-btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
      (applicationUrl ? 'Apply online' : 'Official notice') + ' <span aria-hidden="true">↗</span></a>');
    if (officialUrl && officialUrl !== url) actions.push('<a class="vx-link-btn vx-link-secondary" href="' + esc(officialUrl) +
      '" target="_blank" rel="noopener noreferrer">Official details <span aria-hidden="true">↗</span></a>');
    return '<article class="vx-notice-card vx-' + lane + '">' +
      '<div class="vx-card-top"><span class="vx-status">' + statusLabel + '</span><span class="vx-org">' + esc(organization) + ' · ' + esc(category) + '</span></div>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(summary) + '</p>' +
      detailsMarkup + qualificationsMarkup(qualificationsFor(item)) +
      '<div class="vx-card-bottom"><span class="vx-card-hint">' + esc(lane === 'near' ? (days === 0 ? 'Closes today' : 'Closes in ' + days + ' days') : lane === 'ongoing' ? 'Applications open' : 'Date announced') + '</span>' +
      '<div class="vx-card-actions">' + actions.join('') + '</div></div></article>';
  }

  function renderLane(lane, filters) {
    const suffix = lane === 'near' ? 'Near' : lane.charAt(0).toUpperCase() + lane.slice(1);
    const list = root.querySelector('#vx' + suffix + 'List');
    const count = root.querySelector('#vx' + suffix + 'Count');
    if (!list) return 0;
    const items = uniqueItems(state.items.filter(function (item) { return classify(item) === lane && matches(item, filters); }));
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
    const laneLimit = 4;
    const visibleItems = state.showAllLanes[lane] ? items : items.slice(0, laneLimit);
    list.innerHTML = visibleItems.length
      ? visibleItems.map(function (item) { return noticeCard(item, lane); }).join('')
      : '<div class="vx-empty"><span class="vx-empty-mark">—</span><strong>' + emptyTitle + '</strong><span>' + emptyHint + '</span></div>';
    const more = root.querySelector('#vx' + suffix + 'More');
    if (more) {
      more.hidden = items.length <= laneLimit;
      more.textContent = state.showAllLanes[lane] ? 'Show fewer' : 'View all ' + items.length;
      more.setAttribute('aria-expanded', String(state.showAllLanes[lane]));
    }
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
    const allItems = uniqueItems(state.items.concat(state.archived)).filter(function (item) {
      return DATA.isFutureExamDate(item, today()) && matches(item, filters);
    }).sort(dateSort);
    const laterItems = allItems.filter(function (item) { return !DATA.isExamDateWithinHorizon(item, today(), 120); });
    const items = state.showLaterExamDates ? allItems : allItems.filter(function (item) {
      return DATA.isExamDateWithinHorizon(item, today(), 120);
    });
    const toggle = root.querySelector('#vxLaterExamDates');
    const horizonNote = root.querySelector('#vxExamHorizonNote');
    if (toggle) {
      toggle.hidden = laterItems.length === 0;
      toggle.textContent = state.showLaterExamDates ? 'Show next 120 days' : 'Show later dates (' + laterItems.length + ')';
      toggle.setAttribute('aria-expanded', String(state.showLaterExamDates));
    }
    if (horizonNote) horizonNote.textContent = state.showLaterExamDates
      ? 'Showing all future exam dates in the feed.'
      : 'Showing exam dates in the next 120 days.';
    if (count) count.textContent = String(items.length).padStart(2, '0');
    if (!items.length) {
      const emptyTitle = !state.showLaterExamDates && laterItems.length ? 'No exam dates in the next 120 days' : 'No future exam dates match';
      const emptyHint = !state.showLaterExamDates && laterItems.length
        ? 'Later dates are available above; expand the calendar to see them.'
        : 'Only dates present in the notice feed are shown. Check the relevant official calendar for further dates.';
      mount.innerHTML = '<div class="vx-empty"><span class="vx-empty-mark">▦</span><strong>' + emptyTitle + '</strong><span>' + emptyHint + '</span></div>';
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

  function boardKind(item) {
    const text = [item.title, item.type, item.status].filter(Boolean).join(' ').toLowerCase();
    if (/\b(result|results|merit list|selection list|score card|cut.?off|marksheet)\b/.test(text)) return 'results';
    if (/\b(answer.?key|response sheet|objection tracker)\b/.test(text)) return 'keys';
    if (/\b(admit cards?|e-?admit|hall tickets?|call letters?|admission certificate)\b/.test(text)) return 'admit';
    if (/\b(apply online|online application|application form|registration|recruitment|vacanc(?:y|ies)|advertisement|apprentice|employment notice)\b/.test(text) &&
        !/\b(calendar|answer key|admit card|result|merit list)\b/.test(text)) return 'jobs';
    return '';
  }

  function boardDate(item) {
    const app = DATA.applicationDates(item);
    return parseDate(item.notificationDate || item.publishedAt || item.date || app.start || item.archivedAt || item.firstSeen);
  }

  function isBoardRecent(item, days) {
    const date = boardDate(item);
    return Boolean(date && dayDiff(today(), date) >= 0 && dayDiff(today(), date) <= days);
  }

  function uniqueBoardItems(items, kind) {
    const seen = new Set();
    return items.filter(function (item) {
      const url = safeUrl(kind === 'jobs' ? (item.applicationUrl || item.applyUrl || item.url || item.sourceUrl) :
        (item.url || item.sourceUrl || item.applicationUrl));
      if (!url) return false;
      const title = String(item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const key = url.toLowerCase() + '|' + title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function boardItems(kind, filters) {
    const records = kind === 'jobs' ? state.items : state.items.concat(state.archived);
    const items = uniqueBoardItems(uniqueItems(records).filter(function (item) {
      if (boardKind(item) !== kind || !matches(item, filters)) return false;
      if (kind === 'jobs') {
        const status = classify(item);
        if (status === 'archive') return false;
        return ['near', 'ongoing', 'upcoming'].includes(status) || isBoardRecent(item, 120);
      }
      return state.linkBoardExpanded[kind] || isBoardRecent(item, 180);
    }), kind);
    items.sort(function (a, b) {
      if (kind === 'jobs') {
        const rank = { near: 0, ongoing: 1, upcoming: 2, ignore: 3, archive: 4 };
        const difference = (rank[classify(a)] ?? 3) - (rank[classify(b)] ?? 3);
        if (difference) return difference;
        const ae = DATA.applicationDates(a).end;
        const be = DATA.applicationDates(b).end;
        if (ae && be && ae.getTime() !== be.getTime()) return ae.getTime() - be.getTime();
      }
      const da = boardDate(a), db = boardDate(b);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });
    return items;
  }

  function renderLinkBoard(filters) {
    const groups = [
      { key: 'jobs', empty: 'No current or recent job notices match.' },
      { key: 'results', empty: 'No recent results match.' },
      { key: 'admit', empty: 'No recent admit-card links match.' },
      { key: 'keys', empty: 'No recent answer-key links match.' }
    ];
    groups.forEach(function (group) {
      const suffix = group.key.charAt(0).toUpperCase() + group.key.slice(1);
      const list = root.querySelector('#vxBoard' + suffix + 'List');
      const count = root.querySelector('#vxBoard' + suffix + 'Count');
      const more = root.querySelector('[data-vx-board-more="' + group.key + '"]');
      if (!list) return;
      const items = boardItems(group.key, filters);
      if (count) count.textContent = String(items.length).padStart(2, '0');
      const limit = state.linkBoardExpanded[group.key] ? items.length : 6;
      list.innerHTML = items.length ? items.slice(0, limit).map(function (item) {
        const application = safeUrl(item.applicationUrl || item.applyUrl);
        const notice = safeUrl(item.notificationUrl || item.advertisementUrl || item.sourceUrl || item.url);
        const primary = application || safeUrl(item.url || item.sourceUrl);
        const date = group.key === 'jobs' ? DATA.applicationDates(item) : null;
        const meta = group.key === 'jobs'
          ? date.end && date.end >= today() ? 'Closes ' + fmtDate(date.end)
            : date.start && date.start > today() ? 'Opens ' + fmtDate(date.start)
              : boardDate(item) ? 'Notice ' + fmtDate(boardDate(item)) : 'Official notice'
          : boardDate(item) ? fmtDate(boardDate(item)) : 'Date not listed';
        const detailLink = notice && primary && notice !== primary
          ? '<a class="vx-resource-secondary" href="' + esc(notice) + '" target="_blank" rel="noopener noreferrer">Notice ↗</a>' : '';
        const actionLabel = group.key === 'jobs' ? (application || /\/apply(?:\?|$)/i.test(primary || '') ? 'Apply ↗' : 'Open ↗') : 'Open ↗';
        return '<li class="vx-resource-row"><div class="vx-resource-copy"><a class="vx-resource-title" href="' + esc(notice || primary) + '" target="_blank" rel="noopener noreferrer">' + esc(item.title || 'Official update') + '</a>' +
          '<small>' + esc(item.organization || item.sourceName || 'Official source') + ' · ' + esc(meta) + '</small></div><div class="vx-resource-actions">' +
          (primary ? '<a class="vx-resource-action" href="' + esc(primary) + '" target="_blank" rel="noopener noreferrer">' + actionLabel + '</a>' : '') + detailLink + '</div></li>';
      }).join('') : '<li class="vx-resource-empty">' + (state.loading ? 'Loading official links…' : esc(group.empty)) + '</li>';
      if (more) {
        more.hidden = items.length <= 6;
        more.textContent = state.linkBoardExpanded[group.key] ? 'Show fewer' : 'View all ' + items.length;
        more.setAttribute('aria-expanded', String(state.linkBoardExpanded[group.key]));
      }
    });
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
    renderLinkBoard(filters);
    const upcoming = renderLane('upcoming', filters);
    const ongoing = renderLane('ongoing', filters);
    const near = renderLane('near', filters);
    renderExamDates(filters);
    renderCareers(filters);
    renderArchive(filters);
    const total = root.querySelector('#vxTotalCount');
    const active = root.querySelector('#vxActiveCount');
    if (total) total.textContent = String(upcoming + ongoing + near);
    if (active) active.textContent = String(uniqueItems(state.items).filter(function (item) { return ['upcoming', 'ongoing', 'near'].includes(classify(item)); }).length);
  }

  const markup = [
    '<div class="vx-shell vx-shell-clean">',
    '<header class="vx-hero vx-hero-clean"><div class="vx-hero-copy"><span class="vx-eyebrow vx-hero-kicker">VAANI · EXAM INTELLIGENCE</span><h1 id="ncTitle">Government exam desk</h1><p>Find upcoming exams, open applications and closing deadlines without digging through a crowded directory.</p></div>',
    '<div class="vx-hero-foot"><span><b id="vxTotalCount">00</b><small>live &amp; scheduled notices</small></span><span><b id="vxActiveCount">00</b><small>current feed items</small></span><span class="vx-sync" id="vxSyncStamp">Syncing official feeds…</span></div></header>',
    '<section class="vx-filter-panel vx-filter-clean" id="vxFilterPanel" aria-label="Search and filter exams"><div class="vx-filter-heading"><div><span class="vx-eyebrow">QUICK FIND</span><h2>What are you looking for?</h2><p>Search by exam, role or qualification.</p></div><button type="button" class="vx-reset" id="vxReset">Clear filters</button></div>',
    '<div class="vx-controls"><label class="vx-search-wrap"><span>SEARCH</span><input id="vxSearch" type="search" placeholder="e.g. NDA, BCA, NTPC…" autocomplete="off"></label>',
    '<label><span>QUALIFICATION</span><select id="vxQualification"><option value="all">All qualifications</option>' + DATA.QUALIFICATIONS.map(function (option) { return '<option value="' + esc(option.id) + '">' + esc(option.label) + '</option>'; }).join('') + '</select></label>',
    '<label><span>SECTOR</span><select id="vxSector"><option value="all">All sectors</option>' + DATA.SECTORS.map(function (sector) { return '<option value="' + esc(sector.id) + '">' + esc(sector.label) + '</option>'; }).join('') + '</select></label></div>',
    '<p class="vx-filter-note"><span aria-hidden="true">ⓘ</span> Results depend on source data. Always confirm eligibility and dates in the official notification.</p></section>',
    '<section class="vx-ops-strip vx-ops-clean" aria-label="Notification feed status"><div class="vx-ops-summary"><span class="vx-ops-dot" id="vxOpsDot" aria-hidden="true"></span><div class="vx-ops-copy"><strong id="vxFeedHealth" aria-live="polite">Checking source health…</strong><small id="vxFeedSummary">Checking the latest notification feed.</small></div></div><div class="vx-ops-actions"><button type="button" class="vx-refresh" id="vxRefreshFeed">↻ Refresh</button><details class="vx-source-report" id="vxSourceReport"><summary id="vxSourceSummary">Sources</summary><div class="vx-source-list" id="vxSourceList"><p>Loading source report…</p></div></details></div></section>',
    '<section class="vx-lane vx-lane-near vx-primary-lane" id="vx-near" aria-labelledby="vxNearTitle"><div class="vx-section-heading"><div><span class="vx-section-index">ACT FIRST</span><h2 id="vxNearTitle">Closing soon</h2><p>Applications closing today or within 7 days.</p></div><span class="vx-lane-count" id="vxNearCount">00</span></div><div class="vx-notice-grid" id="vxNearList" aria-live="polite"></div><button type="button" class="vx-resource-more vx-lane-more" id="vxNearMore" data-vx-lane-more="near" aria-controls="vxNearList" hidden>View all</button></section>',
    '<section class="vx-lane vx-lane-ongoing vx-primary-lane" id="vx-ongoing" aria-labelledby="vxOngoingTitle"><div class="vx-section-heading"><div><span class="vx-section-index">APPLY NOW</span><h2 id="vxOngoingTitle">Open applications</h2><p>Forms currently open beyond the 7-day closing window.</p></div><span class="vx-lane-count" id="vxOngoingCount">00</span></div><div class="vx-notice-grid" id="vxOngoingList" aria-live="polite"></div><button type="button" class="vx-resource-more vx-lane-more" id="vxOngoingMore" data-vx-lane-more="ongoing" aria-controls="vxOngoingList" hidden>View all</button></section>',
    '<section class="vx-lane vx-lane-upcoming vx-primary-lane" id="vx-upcoming" aria-labelledby="vxUpcomingTitle"><div class="vx-section-heading"><div><span class="vx-section-index">PLAN AHEAD</span><h2 id="vxUpcomingTitle">Upcoming examinations</h2><p>Announced or scheduled dates. Calendar dates may be tentative.</p></div><span class="vx-lane-count" id="vxUpcomingCount">00</span></div><div class="vx-notice-grid" id="vxUpcomingList" aria-live="polite"></div><button type="button" class="vx-resource-more vx-lane-more" id="vxUpcomingMore" data-vx-lane-more="upcoming" aria-controls="vxUpcomingList" hidden>View all</button></section>',
    '<details class="vx-secondary vx-links-fold" id="vx-links"><summary class="vx-secondary-summary"><span><strong>Latest official links</strong><small>Jobs, results, admit cards and answer keys</small></span><span class="vx-fold-mark" aria-hidden="true">+</span></summary><div class="vx-fold-body"><section class="vx-link-board" id="vx-link-board" aria-labelledby="vxLinkBoardTitle"><div class="vx-section-heading"><div><h2 id="vxLinkBoardTitle">Official update directory</h2><p>Open the relevant official notice before relying on dates.</p></div><span class="vx-board-stamp">OFFICIAL LINKS</span></div><div class="vx-link-grid"><article class="vx-link-column vx-link-column-jobs" id="vx-board-jobs" aria-labelledby="vxBoardJobsTitle"><div class="vx-link-column-head"><div><span>APPLICATIONS</span><h3 id="vxBoardJobsTitle">Latest jobs</h3></div><b id="vxBoardJobsCount">00</b></div><ul class="vx-resource-list" id="vxBoardJobsList" aria-live="polite"></ul><button type="button" class="vx-resource-more" data-vx-board-more="jobs" hidden>View all</button></article><article class="vx-link-column vx-link-column-results" id="vx-board-results" aria-labelledby="vxBoardResultsTitle"><div class="vx-link-column-head"><div><span>OUTCOMES</span><h3 id="vxBoardResultsTitle">Results</h3></div><b id="vxBoardResultsCount">00</b></div><ul class="vx-resource-list" id="vxBoardResultsList" aria-live="polite"></ul><button type="button" class="vx-resource-more" data-vx-board-more="results" hidden>View all</button></article><article class="vx-link-column vx-link-column-admit" id="vx-board-admit" aria-labelledby="vxBoardAdmitTitle"><div class="vx-link-column-head"><div><span>EXAM ACCESS</span><h3 id="vxBoardAdmitTitle">Admit cards</h3></div><b id="vxBoardAdmitCount">00</b></div><ul class="vx-resource-list" id="vxBoardAdmitList" aria-live="polite"></ul><button type="button" class="vx-resource-more" data-vx-board-more="admit" hidden>View all</button></article><article class="vx-link-column vx-link-column-keys" id="vx-board-keys" aria-labelledby="vxBoardKeysTitle"><div class="vx-link-column-head"><div><span>ANSWER REVIEW</span><h3 id="vxBoardKeysTitle">Answer keys</h3></div><b id="vxBoardKeysCount">00</b></div><ul class="vx-resource-list" id="vxBoardKeysList" aria-live="polite"></ul><button type="button" class="vx-resource-more" data-vx-board-more="keys" hidden>View all</button></article></div></section></div></details>',
    '<details class="vx-secondary vx-date-section" id="vx-exam-dates" aria-labelledby="vxExamDatesTitle"><summary class="vx-secondary-summary"><span><strong id="vxExamDatesTitle">Exam date calendar</strong><small>Confirmed and tentative dates from the feed</small></span><span class="vx-lane-count" id="vxExamDatesCount">00</span><span class="vx-fold-mark" aria-hidden="true">+</span></summary><div class="vx-fold-body"><div class="vx-date-toolbar"><span id="vxExamHorizonNote">Showing exam dates in the next 120 days.</span><button type="button" class="vx-date-toggle" id="vxLaterExamDates" hidden>Show later dates</button></div><div class="vx-date-list" id="vxExamDatesList" aria-live="polite"></div></div></details>',
    '<details class="vx-secondary vx-defence-section" id="vx-defence" aria-labelledby="vxDefenceTitle"><summary class="vx-secondary-summary"><span><strong id="vxDefenceTitle">Defence &amp; uniformed careers</strong><small>Armed Forces, Coast Guard, CAPF and other services</small></span><span class="vx-fold-mark" aria-hidden="true">+</span></summary><div class="vx-fold-body"><div class="vx-defence-banner"><div><span class="vx-eyebrow">SERVICE PATHWAYS</span><h2>Explore by force</h2><p>Compare entry routes and open the official recruitment portals.</p></div><span class="vx-defence-seal" aria-hidden="true">★</span></div><div class="vx-subheading"><div><h3>Armed Forces &amp; Coast Guard</h3><p>Army, Navy, Air Force and Coast Guard routes.</p></div><span>01 — 04</span></div><div class="vx-force-grid" id="vxForcesGrid"></div><div class="vx-subheading vx-uniformed-heading"><div><h3>CAPF &amp; other uniformed services</h3><p>Each force and recruitment route is listed separately.</p></div><span>05 — 13</span></div><div class="vx-force-grid vx-uniformed-grid" id="vxUniformedGrid"></div></div></details>',
    '<details class="vx-secondary vx-career-section" id="vx-careers" aria-labelledby="vxCareersTitle"><summary class="vx-secondary-summary"><span><strong id="vxCareersTitle">Explore career options</strong><small>Central and state services, technical roles, education, healthcare and more</small></span><span class="vx-fold-mark" aria-hidden="true">+</span></summary><div class="vx-fold-body"><p class="vx-secondary-intro">Browse major career families and their routes. This directory is a guide, not an exhaustive list or an eligibility decision.</p><div class="vx-career-grid" id="vxCareerGrid"></div></div></details>',
    '<details class="vx-archive vx-secondary" id="vx-archive"><summary><span><strong>Notification archive</strong><small>Closed applications, completed cycles and older notices</small></span><span class="vx-archive-count" id="vxArchiveCount">Loading…</span><span class="vx-fold-mark" aria-hidden="true">+</span></summary><div class="vx-archive-body"><div class="vx-archive-grid" id="vxArchiveGrid"></div><button type="button" class="vx-archive-more" id="vxArchiveMore" hidden>Show all archived notices</button></div></details>',
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
        const snapshotResult = await loadJson(['data/defence-notifications.json'], isFeedPayload);
        const curatedSnapshot = snapshotResult.source ? DATA.normalizeItems(snapshotResult.data).filter(function (item) { return Boolean(item.verifiedAt); }) : [];
        state.items = uniqueItems(DATA.normalizeItems(feedResult.data).concat(curatedSnapshot));
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
      state.showLaterExamDates = false;
      Object.keys(state.showAllLanes).forEach(function (key) { state.showAllLanes[key] = false; });
      renderAll();
    });
    root.querySelectorAll('[data-vx-lane-more]').forEach(function (button) {
      button.addEventListener('click', function () {
        const lane = button.dataset.vxLaneMore;
        if (Object.prototype.hasOwnProperty.call(state.showAllLanes, lane)) {
          state.showAllLanes[lane] = !state.showAllLanes[lane];
          renderAll();
        }
      });
    });
    root.querySelector('#vxArchiveMore')?.addEventListener('click', function () {
      state.showAllArchive = !state.showAllArchive;
      renderAll();
    });
    root.querySelector('#vxLaterExamDates')?.addEventListener('click', function () {
      state.showLaterExamDates = !state.showLaterExamDates;
      renderAll();
    });
    root.querySelectorAll('[data-vx-board-more]').forEach(function (button) {
      button.addEventListener('click', function () {
        const key = button.dataset.vxBoardMore;
        if (Object.prototype.hasOwnProperty.call(state.linkBoardExpanded, key)) {
          state.linkBoardExpanded[key] = !state.linkBoardExpanded[key];
          renderAll();
        }
      });
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
