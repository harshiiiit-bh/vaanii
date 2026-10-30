/* ============================================================
   VAANI DYNAMIC ENGINE & ULTIMATE UX UPGRADE (js/vaani-dynamic-engine.js)
   1. Server Account Sync (/api/accounts/:code) + Offline Fallback
   2. Reactive State Bus (vaani:state-changed)
   3. Officer Vaani 8-Pose Shaded SVG Character Rig & Briefings
   4. Deep URL Router (?v=...&id=...) + 200ms GPU View Transitions
   5. Contextual Breadcrumb & Quick-Action Bar (#vaaniBreadcrumbBar)
   6. Vocabulary Mastery System (All / Mastered / Unmastered / Bookmarked)
   7. Interactive Paginated PYQ Explorer + Anti-Duplicate XP Guard
   8. Global & Service-Force Cohort Standings (Live + Benchmarks)
============================================================= */
(function () {
  'use strict';

  if (window.__VAANI_DYNAMIC_ENGINE_LOADED) return;
  window.__VAANI_DYNAMIC_ENGINE_LOADED = true;

  // Capture native fetch at startup so synthetic test stubs on window.fetch
  // are never polluted by background account/leaderboard sync calls.
  const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

  // Capture initial URL deep-link parameters before boot replaceState can run
  let initialBootParams = { v: '', id: '' };
  try {
    const sp = new URLSearchParams(window.location.search || '');
    initialBootParams = {
      v: sp.get('v') || '',
      id: sp.get('id') || ''
    };
  } catch (_e) {}

  function getConfiguredApiBase() {
    try {
      if (typeof window.VAANI_API_BASE === 'string' && window.VAANI_API_BASE.trim()) {
        return window.VAANI_API_BASE.trim().replace(/\/+$/, '');
      }
      const meta = document.querySelector('meta[name="vaani-api-base"]');
      if (meta && meta.content && meta.content.trim()) {
        return meta.content.trim().replace(/\/+$/, '');
      }
      const stored = window.localStorage ? window.localStorage.getItem('vaani_api_base') : '';
      if (stored && /^https?:\/\//i.test(stored.trim())) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch (_e) {}
    return '';
  }

  function isStaticOnlyHostWithoutApiBase() {
    const base = getConfiguredApiBase();
    if (base) return false;
    try {
      const host = String(window.location && window.location.hostname || '').toLowerCase();
      // GitHub Pages is a static-only host unless VAANI_API_BASE is explicitly configured
      if (host.endsWith('.github.io')) return true;
    } catch (_e) {}
    return false;
  }

  function resolveApiUrl(apiPath) {
    const cleanPath = String(apiPath || '').startsWith('/') ? String(apiPath) : '/' + String(apiPath || '');
    const base = getConfiguredApiBase();
    return base ? base + cleanPath : cleanPath;
  }

  function callVaaniApi(apiPath, options) {
    if (!nativeFetch || isStaticOnlyHostWithoutApiBase()) {
      return Promise.reject(new Error('STATIC_HOST_NO_BACKEND'));
    }
    return nativeFetch(resolveApiUrl(apiPath), options);
  }

  window.VaaniApiConfig = {
    getApiBase: getConfiguredApiBase,
    resolveApiUrl: resolveApiUrl,
    isStaticOnlyHost: isStaticOnlyHostWithoutApiBase
  };

  function escHtml(val) {
    return String(val == null ? '' : val).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function emitStateChanged(detail) {
    try {
      window.dispatchEvent(new CustomEvent('vaani:state-changed', { detail: detail || {} }));
    } catch (_e) {}
  }

  /* ============================================================
     1. OFFICER VAANI — 8-POSE SHADED SVG CHARACTER DESIGN SYSTEM
  ============================================================= */
  const OFFICER_POSES = {
    welcome: {
      key: 'welcome',
      label: 'Welcome',
      badge: 'COMMAND WELCOME',
      title: 'Welcome to Command Centre, Cadet.',
      directive: 'Select your primary target for today—one focused grammar rule or 15 timed PYQs builds unstoppable momentum.',
      browLeft: 'M124 111 Q136 105 149 109',
      browRight: 'M171 109 Q184 105 196 111',
      mouth: 'M144 158 Q160 167 176 158',
      teeth: true,
      headTransform: 'rotate(0 160 125)',
      gestureType: 'salute-welcome',
      accentColor: '#c9a24b'
    },
    teaching: {
      key: 'teaching',
      label: 'Teaching',
      badge: 'TACTICAL INSTRUCTION',
      title: 'Understand the mechanism behind the rule.',
      directive: 'In NDA and CDS spotting-error items, identify the subject-verb core first before scanning modifiers and prepositions.',
      browLeft: 'M124 109 Q136 103 149 108',
      browRight: 'M171 110 Q184 106 196 111',
      mouth: 'M146 159 Q160 165 174 159',
      teeth: true,
      headTransform: 'rotate(-1.5 160 125)',
      gestureType: 'pointer',
      accentColor: '#5b9bd8'
    },
    thinking: {
      key: 'thinking',
      label: 'Thinking',
      badge: 'STRATEGIC ANALYSIS',
      title: 'Look twice at confusing option pairs.',
      directive: 'When two options look nearly identical, check tense sequence, fixed prepositions, and idiomatic collocation.',
      browLeft: 'M124 113 Q136 109 149 111',
      browRight: 'M171 106 Q184 101 196 108',
      mouth: 'M148 160 Q160 159 172 161',
      teeth: false,
      headTransform: 'rotate(2 160 125)',
      gestureType: 'chin-think',
      accentColor: '#d9a941'
    },
    motivational: {
      key: 'motivational',
      label: 'Motivational',
      badge: 'MORALE & DISCIPLINE',
      title: 'Consistency outranks occasional intensity.',
      directive: 'Even 20 minutes of deliberate practice keeps your streak alive and sharpens your exam instinct.',
      browLeft: 'M125 109 Q137 104 149 109',
      browRight: 'M171 109 Q183 104 195 109',
      mouth: 'M143 157 Q160 168 177 157',
      teeth: true,
      headTransform: 'rotate(0 160 125)',
      gestureType: 'fist-resolve',
      accentColor: '#e6c66f'
    },
    congratulatory: {
      key: 'congratulatory',
      label: 'Congrats',
      badge: 'COMMENDATION',
      title: 'Well executed, Cadet. Standard maintained.',
      directive: 'Your accuracy and discipline are advancing your service record. Lock in the lesson and move to the next objective.',
      browLeft: 'M124 108 Q136 102 149 107',
      browRight: 'M171 107 Q184 102 196 108',
      mouth: 'M142 156 Q160 169 178 156',
      teeth: true,
      headTransform: 'rotate(-1 160 125)',
      gestureType: 'crisp-salute',
      accentColor: '#49d186'
    },
    exam: {
      key: 'exam',
      label: 'Exam Mode',
      badge: 'EXAMINATION PROTOCOL',
      title: 'Calm precision under timed conditions.',
      directive: 'Eliminate two distractors first, verify grammar structure, and never let a single question break your tempo.',
      browLeft: 'M125 113 Q137 110 150 114',
      browRight: 'M170 114 Q183 110 195 113',
      mouth: 'M147 161 L173 161',
      teeth: false,
      headTransform: 'rotate(0 160 125)',
      gestureType: 'command-folded',
      accentColor: '#e2575a'
    },
    celebration: {
      key: 'celebration',
      label: 'Celebration',
      badge: 'MILESTONE ACHIEVED',
      title: 'Outstanding milestone cleared!',
      directive: 'Every badge and rank promotion is earned through verified answers. Take pride in the work and raise your target.',
      browLeft: 'M123 107 Q136 100 149 106',
      browRight: 'M171 106 Q184 100 197 107',
      mouth: 'M141 155 Q160 171 179 155',
      teeth: true,
      headTransform: 'rotate(-1.5 160 125)',
      gestureType: 'laurel-honour',
      accentColor: '#f0c874'
    },
    guidance: {
      key: 'guidance',
      label: 'Guidance',
      badge: 'FIELD GUIDANCE',
      title: 'Here is your clearest path forward.',
      directive: 'Use the filters and weak-area spotlights to isolate unmastered words and review missed PYQs systematically.',
      browLeft: 'M124 110 Q136 104 149 108',
      browRight: 'M171 108 Q184 104 196 110',
      mouth: 'M145 158 Q160 166 175 158',
      teeth: true,
      headTransform: 'rotate(1 160 125)',
      gestureType: 'open-guide',
      accentColor: '#2fd7c4'
    }
  };

  const LEGACY_POSE_MAP = {
    'p0': 'welcome',
    'vc-p0': 'welcome',
    'p1': 'congratulatory',
    'vc-p1': 'congratulatory',
    'p2': 'teaching',
    'vc-p2': 'teaching',
    'p3': 'thinking',
    'vc-p3': 'thinking',
    'p4': 'celebration',
    'vc-p4': 'celebration',
    'p5': 'guidance',
    'vc-p5': 'guidance',
    'p6': 'exam',
    'vc-p6': 'exam',
    'p7': 'guidance',
    'vc-p7': 'guidance',
    'p8': 'teaching',
    'vc-p8': 'teaching',
    'p9': 'exam',
    'vc-p9': 'exam',
    'p10': 'motivational',
    'vc-p10': 'motivational',
    'p11': 'celebration',
    'vc-p11': 'celebration'
  };

  function normalizePoseKey(raw) {
    const k = String(raw || 'welcome').trim().toLowerCase();
    if (OFFICER_POSES[k]) return k;
    if (LEGACY_POSE_MAP[k]) return LEGACY_POSE_MAP[k];
    return 'welcome';
  }

  function renderPoseForegroundSVG(gestureType, uid) {
    if (gestureType === 'crisp-salute' || gestureType === 'salute-welcome') {
      // Crisp military right-hand salute near beret brow
      return (
        '<g class="vaani-pose-arm">' +
          '<path d="M58 258 L26 178 L78 106 L96 118 L58 182 L88 248 Z" fill="url(#tunicMain_' + uid + ')" stroke="#1e2b1a" stroke-width="2"/>' +
          '<path d="M76 108 L108 92 L113 102 L84 119 Z" fill="url(#skinFace_' + uid + ')" stroke="#8f5331" stroke-width="1.6"/>' +
        '</g>'
      );
    }
    if (gestureType === 'pointer') {
      // Tactical briefing pointer & command baton
      return (
        '<g class="vaani-pose-arm">' +
          '<path d="M238 256 L278 206 L294 218 L254 276 Z" fill="url(#tunicMain_' + uid + ')" stroke="#1e2b1a" stroke-width="2"/>' +
          '<circle cx="284" cy="206" r="11" fill="url(#skinFace_' + uid + ')" stroke="#8f5331" stroke-width="1.6"/>' +
          '<line x1="286" y1="204" x2="310" y2="152" stroke="url(#brassGold_' + uid + ')" stroke-width="3.5" stroke-linecap="round"/>' +
          '<circle cx="310" cy="152" r="3.5" fill="#f9e498"/>' +
        '</g>'
      );
    }
    if (gestureType === 'chin-think') {
      // Hand raised thoughtfully near jawline
      return (
        '<g class="vaani-pose-arm">' +
          '<path d="M222 288 L194 212 L176 216 L196 294 Z" fill="url(#tunicMain_' + uid + ')" stroke="#1e2b1a" stroke-width="2"/>' +
          '<ellipse cx="176" cy="196" rx="13" ry="9" transform="rotate(-18 176 196)" fill="url(#skinFace_' + uid + ')" stroke="#8f5331" stroke-width="1.6"/>' +
        '</g>'
      );
    }
    if (gestureType === 'fist-resolve') {
      // Determined fist over chest / command resolve
      return (
        '<g class="vaani-pose-arm">' +
          '<path d="M62 292 L114 252 L128 272 L82 316 Z" fill="url(#tunicMain_' + uid + ')" stroke="#1e2b1a" stroke-width="2"/>' +
          '<rect x="114" y="244" width="24" height="20" rx="7" fill="url(#skinFace_' + uid + ')" stroke="#8f5331" stroke-width="1.6"/>' +
        '</g>'
      );
    }
    if (gestureType === 'command-folded') {
      // Command folded arms & tactical exam badge
      return (
        '<g class="vaani-pose-arm">' +
          '<path d="M68 296 L252 296 L244 328 L76 328 Z" fill="url(#tunicLapel_' + uid + ')" stroke="#1e2b1a" stroke-width="2"/>' +
          '<circle cx="256" cy="106" r="18" fill="#101a24" stroke="url(#brassGold_' + uid + ')" stroke-width="2"/>' +
          '<path d="M256 95 L256 106 L264 110" fill="none" stroke="#f9e498" stroke-width="2.2" stroke-linecap="round"/>' +
        '</g>'
      );
    }
    if (gestureType === 'laurel-honour') {
      // Achievement celebration stars & gold citation crest
      return (
        '<g class="vaani-pose-arm">' +
          '<polygon points="48,108 52,118 63,119 55,126 57,137 48,131 39,137 41,126 33,119 44,118" fill="url(#brassGold_' + uid + ')"/>' +
          '<polygon points="272,108 276,118 287,119 279,126 281,137 272,131 263,137 265,126 257,119 268,118" fill="url(#brassGold_' + uid + ')"/>' +
        '</g>'
      );
    }
    // 'open-guide'
    return (
      '<g class="vaani-pose-arm">' +
        '<path d="M234 268 L276 232 L290 248 L246 288 Z" fill="url(#tunicMain_' + uid + ')" stroke="#1e2b1a" stroke-width="2"/>' +
        '<ellipse cx="286" cy="232" rx="13" ry="8" transform="rotate(-25 286 232)" fill="url(#skinFace_' + uid + ')" stroke="#8f5331" stroke-width="1.6"/>' +
      '</g>'
    );
  }

  let svgInstanceCounter = 0;
  function renderOfficerRigSVG(poseInput) {
    const poseKey = normalizePoseKey(poseInput);
    const p = OFFICER_POSES[poseKey] || OFFICER_POSES.welcome;
    const uid = 'ov' + (++svgInstanceCounter);

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360" role="img" aria-label="Officer VAANI — ' + escHtml(p.label) + ' pose">' +
        '<defs>' +
          '<radialGradient id="bgGlow_' + uid + '" cx="50%" cy="42%" r="54%">' +
            '<stop offset="0%" stop-color="' + p.accentColor + '" stop-opacity="0.32"/>' +
            '<stop offset="65%" stop-color="#18303c" stop-opacity="0.08"/>' +
            '<stop offset="100%" stop-color="#0b1520" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<linearGradient id="tunicMain_' + uid + '" x1="0.15" y1="0" x2="0.85" y2="1">' +
            '<stop offset="0%" stop-color="#4e6343"/>' +
            '<stop offset="45%" stop-color="#384b31"/>' +
            '<stop offset="100%" stop-color="#22301e"/>' +
          '</linearGradient>' +
          '<linearGradient id="tunicLapel_' + uid + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#5d7450"/>' +
            '<stop offset="100%" stop-color="#2d3e27"/>' +
          '</linearGradient>' +
          '<linearGradient id="shirtKhaki_' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#f2ead7"/>' +
            '<stop offset="100%" stop-color="#d5c6a5"/>' +
          '</linearGradient>' +
          '<linearGradient id="brassGold_' + uid + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#f9e498"/>' +
            '<stop offset="50%" stop-color="#d4a849"/>' +
            '<stop offset="100%" stop-color="#8f681e"/>' +
          '</linearGradient>' +
          '<linearGradient id="leatherStrap_' + uid + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#6e3b23"/>' +
            '<stop offset="50%" stop-color="#4d2614"/>' +
            '<stop offset="100%" stop-color="#2e150a"/>' +
          '</linearGradient>' +
          '<linearGradient id="skinFace_' + uid + '" x1="0.2" y1="0.1" x2="0.85" y2="0.95">' +
            '<stop offset="0%" stop-color="#e5ae86"/>' +
            '<stop offset="55%" stop-color="#cf9167"/>' +
            '<stop offset="100%" stop-color="#a86b44"/>' +
          '</linearGradient>' +
          '<linearGradient id="skinNeck_' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#b87851"/>' +
            '<stop offset="100%" stop-color="#935936"/>' +
          '</linearGradient>' +
          '<linearGradient id="beretGreen_' + uid + '" x1="0.1" y1="0" x2="0.9" y2="1">' +
            '<stop offset="0%" stop-color="#3f5538"/>' +
            '<stop offset="60%" stop-color="#293924"/>' +
            '<stop offset="100%" stop-color="#182315"/>' +
          '</linearGradient>' +
          '<linearGradient id="hairDark_' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#2b2623"/>' +
            '<stop offset="100%" stop-color="#12100e"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<circle cx="160" cy="158" r="134" fill="url(#bgGlow_' + uid + ')"/>' +
        '<ellipse cx="160" cy="346" rx="106" ry="8" fill="#09131a" opacity="0.28"/>' +
        /* Athletic Torso & Ceremonial Olive Tunic */
        '<path d="M34 348 C40 268, 72 226, 118 214 L202 214 C248 226, 280 268, 286 348 Z" fill="url(#tunicMain_' + uid + ')" stroke="#1e2b1a" stroke-width="2.5"/>' +
        '<path d="M62 232 L118 213 L122 227 L68 245 Z" fill="url(#tunicLapel_' + uid + ')" stroke="url(#brassGold_' + uid + ')" stroke-width="1.8"/>' +
        '<path d="M258 232 L202 213 L198 227 L252 245 Z" fill="url(#tunicLapel_' + uid + ')" stroke="url(#brassGold_' + uid + ')" stroke-width="1.8"/>' +
        '<circle cx="84" cy="232" r="4" fill="url(#brassGold_' + uid + ')"/>' +
        '<circle cx="100" cy="226" r="4" fill="url(#brassGold_' + uid + ')"/>' +
        '<circle cx="236" cy="232" r="4" fill="url(#brassGold_' + uid + ')"/>' +
        '<circle cx="220" cy="226" r="4" fill="url(#brassGold_' + uid + ')"/>' +
        /* Neck, Khaki Collar & Tie */
        '<path d="M132 178 L188 178 L194 224 L160 242 L126 224 Z" fill="url(#skinNeck_' + uid + ')"/>' +
        '<path d="M126 212 L160 256 L194 212 L184 202 L160 228 L136 202 Z" fill="url(#shirtKhaki_' + uid + ')" stroke="#bfb08e" stroke-width="1.2"/>' +
        '<path d="M153 224 L167 224 L170 278 L160 292 L150 278 Z" fill="#1e2a19"/>' +
        '<path d="M116 212 L160 288 L134 296 L102 242 Z" fill="url(#tunicLapel_' + uid + ')" stroke="#23311e" stroke-width="1.5"/>' +
        '<path d="M204 212 L160 288 L186 296 L218 242 Z" fill="url(#tunicLapel_' + uid + ')" stroke="#23311e" stroke-width="1.5"/>' +
        '<polygon points="114,234 128,228 135,248 121,253" fill="#8f2424" stroke="url(#brassGold_' + uid + ')" stroke-width="1"/>' +
        '<polygon points="206,234 192,228 185,248 199,253" fill="#8f2424" stroke="url(#brassGold_' + uid + ')" stroke-width="1"/>' +
        /* Sam Browne Strap & Ribbons */
        '<path d="M96 222 L208 348 L226 348 L112 216 Z" fill="url(#leatherStrap_' + uid + ')" stroke="#281107" stroke-width="1.2"/>' +
        '<rect x="76" y="267" width="52" height="10" rx="2" fill="#101820" stroke="url(#brassGold_' + uid + ')" stroke-width="1.2"/>' +
        '<text x="102" y="274.5" text-anchor="middle" fill="#f6df96" font-family="monospace" font-size="6.2" font-weight="700">VAANI</text>' +
        '<g transform="translate(194, 266)">' +
          '<rect x="0" y="0" width="16" height="7" rx="1" fill="#b83227"/>' +
          '<rect x="17" y="0" width="16" height="7" rx="1" fill="#1d4e89"/>' +
          '<rect x="34" y="0" width="16" height="7" rx="1" fill="#2e6f40"/>' +
          '<rect x="0" y="0" width="50" height="7" rx="1" fill="none" stroke="url(#brassGold_' + uid + ')" stroke-width="1"/>' +
        '</g>' +
        '<circle cx="160" cy="304" r="4" fill="url(#brassGold_' + uid + ')"/>' +
        '<circle cx="160" cy="328" r="4" fill="url(#brassGold_' + uid + ')"/>' +
        /* Head & Dynamic Facial Expression */
        '<g transform="' + p.headTransform + '">' +
          '<path d="M107 118 C98 116, 95 130, 99 142 C102 150, 108 153, 113 149 Z" fill="url(#skinFace_' + uid + ')" stroke="#9b5f3b" stroke-width="1.8"/>' +
          '<path d="M213 118 C222 116, 225 130, 221 142 C218 150, 212 153, 207 149 Z" fill="url(#skinFace_' + uid + ')" stroke="#9b5f3b" stroke-width="1.8"/>' +
          '<path d="M110 88 C110 56, 130 42, 160 42 C190 42, 210 56, 210 88 L210 132 C210 158, 193 182, 160 190 C127 182, 110 158, 110 132 Z" fill="url(#skinFace_' + uid + ')" stroke="#935836" stroke-width="2"/>' +
          '<path d="M108 106 C106 78, 116 54, 146 48 C174 44, 206 56, 212 86 C213 94, 212 102, 210 108 C207 92, 199 82, 184 78 C162 74, 136 82, 120 92 C114 96, 111 101, 108 106 Z" fill="url(#hairDark_' + uid + ')"/>' +
          '<path d="' + p.browLeft + '" fill="none" stroke="#221d1a" stroke-width="4.2" stroke-linecap="round"/>' +
          '<path d="' + p.browRight + '" fill="none" stroke="#221d1a" stroke-width="4.2" stroke-linecap="round"/>' +
          '<ellipse cx="137" cy="122" rx="8.5" ry="5.2" fill="#ffffff"/>' +
          '<ellipse cx="183" cy="122" rx="8.5" ry="5.2" fill="#ffffff"/>' +
          '<circle cx="137" cy="122" r="4.3" fill="#2a1e17"/>' +
          '<circle cx="183" cy="122" r="4.3" fill="#2a1e17"/>' +
          '<circle cx="139" cy="120.2" r="1.4" fill="#ffffff"/>' +
          '<circle cx="185" cy="120.2" r="1.4" fill="#ffffff"/>' +
          '<path d="M160 116 L157 142 Q160 146 166 143" fill="none" stroke="#8f5331" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="' + p.mouth + '" fill="none" stroke="#7d4324" stroke-width="3" stroke-linecap="round"/>' +
          (p.teeth ? '<path d="M149 160 Q160 165 171 160" fill="#ffffff" opacity="0.75"/>' : '') +
          '<path d="M98 82 C96 44, 134 22, 178 26 C214 29, 234 48, 228 76 C206 70, 174 68, 138 74 C120 77, 108 80, 98 82 Z" fill="url(#beretGreen_' + uid + ')" stroke="#172214" stroke-width="2.2"/>' +
          '<path d="M104 78 Q160 66 216 78 L214 87 Q160 76 106 87 Z" fill="#141a14" stroke="url(#brassGold_' + uid + ')" stroke-width="1"/>' +
          '<g transform="translate(136, 46)">' +
            '<circle cx="0" cy="12" r="11" fill="#8f2424" stroke="url(#brassGold_' + uid + ')" stroke-width="2"/>' +
            '<polygon points="0,4 2.5,9.5 8.5,10 4,14 5.2,20 0,16.8 -5.2,20 -4,14 -8.5,10 -2.5,9.5" fill="url(#brassGold_' + uid + ')"/>' +
          '</g>' +
        '</g>' +
        renderPoseForegroundSVG(p.gestureType, uid) +
      '</svg>'
    );
  }

  const VaaniOfficerRig = {
    currentPose: 'welcome',

    setPose(poseInput) {
      const poseKey = normalizePoseKey(poseInput);
      this.currentPose = poseKey;
      const poseObj = OFFICER_POSES[poseKey] || OFFICER_POSES.welcome;

      // Update Hero Rig if mounted
      const heroSvgHolder = document.getElementById('vaaniHeroRigSvg');
      if (heroSvgHolder) {
        heroSvgHolder.innerHTML = renderOfficerRigSVG(poseKey);
      }
      const badgeEl = document.getElementById('vaaniHeroDirectiveBadge');
      if (badgeEl) badgeEl.textContent = poseObj.badge + ' · POSE: ' + poseObj.label.toUpperCase();
      const textEl = document.getElementById('vaaniHeroDirectiveText');
      if (textEl) textEl.textContent = poseObj.directive;

      document.querySelectorAll('[data-vaani-pose-btn]').forEach(function (btn) {
        const active = btn.getAttribute('data-vaani-pose-btn') === poseKey;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });

      // Update Floating Dock Character Overlay if mounted
      const dockOverlay = document.getElementById('vaaniDockRigOverlay');
      if (dockOverlay) {
        dockOverlay.innerHTML = renderOfficerRigSVG(poseKey);
      }
    },

    mountHeroStage() {
      const stage = document.querySelector('#view-dashboard .vd-officer-stage');
      if (stage && !document.getElementById('vaaniHeroRigStage')) {
        stage.classList.add('has-vaani-rig');
        const rigWrap = document.createElement('div');
        rigWrap.id = 'vaaniHeroRigStage';
        rigWrap.className = 'vaani-hero-rig-stage';
        rigWrap.innerHTML =
          '<div class="vaani-rig-svg-holder" id="vaaniHeroRigSvg">' +
            renderOfficerRigSVG(this.currentPose) +
          '</div>';
        const badge = stage.querySelector('.vd-officer-badge');
        if (badge) {
          stage.insertBefore(rigWrap, badge);
        } else {
          stage.appendChild(rigWrap);
        }
      }

      const heroInner = document.querySelector('#view-dashboard .vd-hero-inner');
      if (heroInner && !document.getElementById('vaaniHeroDirectiveBox')) {
        const poseObj = OFFICER_POSES[this.currentPose] || OFFICER_POSES.welcome;
        const box = document.createElement('div');
        box.id = 'vaaniHeroDirectiveBox';
        box.className = 'vaani-hero-directive-box';
        box.innerHTML =
          '<div class="vaani-hero-directive-top">' +
            '<span>OFFICER VAANI · YOUR TRAINING OFFICER</span>' +
            '<span id="vaaniHeroDirectiveBadge">' + escHtml(poseObj.badge) + ' · POSE: ' + escHtml(poseObj.label.toUpperCase()) + '</span>' +
          '</div>' +
          '<p class="vaani-hero-directive-text" id="vaaniHeroDirectiveText">' + escHtml(poseObj.directive) + '</p>' +
          '<div class="vaani-pose-switcher" role="group" aria-label="Officer VAANI expressions and poses">' +
            Object.keys(OFFICER_POSES).map(function (k) {
              const item = OFFICER_POSES[k];
              const isAct = k === VaaniOfficerRig.currentPose;
              return (
                '<button type="button" class="vaani-pose-btn ' + (isAct ? 'active' : '') + '" data-vaani-pose-btn="' + k + '" aria-pressed="' + isAct + '">' +
                  escHtml(item.label) +
                '</button>'
              );
            }).join('') +
          '</div>';
        heroInner.appendChild(box);

        box.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-vaani-pose-btn]');
          if (!btn) return;
          const nextPose = btn.getAttribute('data-vaani-pose-btn');
          VaaniOfficerRig.setPose(nextPose);
        });
      }
    },

    mountDockOverlay() {
      const ch = document.getElementById('vcCharacter');
      if (!ch) return;
      if (!document.getElementById('vaaniDockRigOverlay')) {
        const overlay = document.createElement('span');
        overlay.id = 'vaaniDockRigOverlay';
        overlay.className = 'vaani-dock-rig-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = renderOfficerRigSVG(this.currentPose);
        const nameplate = ch.querySelector('.vc-character-nameplate');
        if (nameplate) {
          ch.insertBefore(overlay, nameplate);
        } else {
          ch.appendChild(overlay);
        }
      }
      if (typeof window.vaaniCharacterSetPose === 'function' && !window.vaaniCharacterSetPose.__vaaniRigWrapped) {
        const origSetPose = window.vaaniCharacterSetPose;
        const wrappedSetPose = function (pose) {
          const res = origSetPose.apply(this, arguments);
          VaaniOfficerRig.setPose(pose);
          return res;
        };
        wrappedSetPose.__vaaniRigWrapped = true;
        window.vaaniCharacterSetPose = wrappedSetPose;
      }
    },

    mountModuleBanners() {
      // Grammar Academy purposeful introduction banner
      const viewGrammar = document.getElementById('view-grammar');
      if (viewGrammar && !document.getElementById('vaaniGrammarOfficerBanner')) {
        const banner = document.createElement('div');
        banner.id = 'vaaniGrammarOfficerBanner';
        banner.className = 'vaani-module-officer-banner';
        banner.innerHTML =
          '<div class="vaani-mob-avatar" aria-hidden="true">' + renderOfficerRigSVG('teaching') + '</div>' +
          '<div>' +
            '<div class="vaani-mob-kicker">OFFICER VAANI · GRAMMAR ACADEMY BRIEFING</div>' +
            '<h3 class="vaani-mob-title">Master the rule, verify the trap, then test under exam conditions.</h3>' +
            '<p class="vaani-mob-desc">Every grammar node below links directly to worked examples, common NDA/CDS error traps, and topic-mapped PYQs.</p>' +
          '</div>' +
          '<div>' +
            '<button type="button" class="vaani-bc-btn" onclick="gtStartLearning()">▶ Resume Next Lesson</button>' +
          '</div>';
        const gtHeader = viewGrammar.querySelector('.gt-header');
        if (gtHeader && gtHeader.nextSibling) {
          viewGrammar.insertBefore(banner, gtHeader.nextSibling);
        } else {
          viewGrammar.insertBefore(banner, viewGrammar.firstChild);
        }
      }
    }
  };

  window.VaaniOfficerRig = VaaniOfficerRig;

  function updateDashboardQuickTileBadges() {
    if (typeof State === 'undefined') return;
    const qaWrap = document.querySelector('#view-dashboard .vd-qa');
    if (!qaWrap) return;
    const totalGrammar = (typeof GRAMMAR !== 'undefined' && Array.isArray(GRAMMAR)) ? GRAMMAR.length : 35;
    const doneGrammar = (typeof GRAMMAR !== 'undefined' && Array.isArray(GRAMMAR))
      ? GRAMMAR.filter(function (g) { return !!(State.completedTopics && State.completedTopics[g.id]); }).length
      : 0;
    const st = typeof ensurePyqStats === 'function' ? ensurePyqStats() : { attempts: {} };
    const pyqSolved = Object.keys(st.attempts || {}).length;
    const vocabDone = (typeof VOCAB !== 'undefined' && Array.isArray(VOCAB))
      ? VOCAB.filter(function (v) { return isVocabWordLearned(v.id); }).length
      : 0;

    const map = {
      grammar: doneGrammar + '/' + totalGrammar,
      pyq: pyqSolved + ' Qs',
      vocab: vocabDone + ' words'
    };

    Object.keys(map).forEach(function (viewKey) {
      const btn = qaWrap.querySelector('button[onclick*="\'' + viewKey + '\'"]');
      if (!btn) return;
      let badge = btn.querySelector('.vd-qa-count');
      if (!badge) {
        badge = document.createElement('small');
        badge.className = 'vd-qa-count';
        btn.appendChild(badge);
      }
      badge.textContent = map[viewKey];
    });
  }

  /* ============================================================
     2. SERVER ACCOUNT SYNC & REACTIVE STATE BUS
  ============================================================= */
  const VaaniSync = {
    state: 'local', // 'synced' | 'syncing' | 'local' | 'error'
    lastSyncedAt: null,
    syncTimer: null,
    inFlight: false,
    lastManualSyncAt: 0,

    setStatus(nextState, syncedAt) {
      this.state = nextState;
      if (syncedAt) this.lastSyncedAt = syncedAt;
      this.renderIndicators();
    },

    statusLabel() {
      if (this.state === 'syncing') return 'Syncing…';
      if (this.state === 'synced') return 'Server Synced';
      if (this.state === 'error') return 'Offline · Saved Locally';
      return 'Saved Locally';
    },

    ensureHeaderPill() {
      const topRight = document.querySelector('header .topbar .top-right');
      if (!topRight || document.getElementById('vaaniSyncPill')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'vaaniSyncPill';
      btn.className = 'vaani-sync-pill';
      btn.setAttribute('data-sync-state', this.state);
      btn.setAttribute('aria-label', 'Account synchronization status. Click to sync now.');
      btn.title = 'Click to synchronize your account progress with the VAANI server';
      btn.innerHTML = '<span class="vaani-sync-dot" aria-hidden="true"></span><span class="vaani-sync-label">' + escHtml(this.statusLabel()) + '</span>';
      btn.addEventListener('click', function () {
        VaaniSync.pushNow(true);
      });
      topRight.insertBefore(btn, topRight.firstChild);
    },

    renderIndicators() {
      this.ensureHeaderPill();
      const pill = document.getElementById('vaaniSyncPill');
      if (pill) {
        pill.setAttribute('data-sync-state', this.state);
        const lbl = pill.querySelector('.vaani-sync-label');
        if (lbl) lbl.textContent = this.statusLabel();
      }
      const cohortSyncStatus = document.getElementById('vaaniCohortSyncBadge');
      if (cohortSyncStatus) {
        cohortSyncStatus.textContent = this.statusLabel();
      }
    },

    schedulePush() {
      if (typeof ACTIVE_CODE === 'undefined' || !ACTIVE_CODE || !/^\d{6}$/.test(String(ACTIVE_CODE))) return;
      if (this.syncTimer) clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(function () {
        VaaniSync.syncTimer = null;
        VaaniSync.pushNow(false);
      }, 380);
    },

    async pushNow(manual) {
      if (!nativeFetch) return false;
      const code = typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE ? String(ACTIVE_CODE).trim() : '';
      if (!/^\d{6}$/.test(code)) {
        if (manual && typeof toast === 'function') toast('Sign in with your 6-digit code to sync with the server.');
        return false;
      }
      if (manual && Date.now() - this.lastManualSyncAt < 2000) {
        if (typeof toast === 'function') toast('Score is already synchronized with the server.');
        return true;
      }
      if (this.inFlight) return false;
      this.inFlight = true;
      if (manual) this.lastManualSyncAt = Date.now();
      this.setStatus('syncing');
      try {
        const payload = {
          record: {
            vaani: typeof State !== 'undefined' ? State : {},
            vbv: typeof DATA !== 'undefined' ? DATA : {}
          }
        };
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? setTimeout(function () { controller.abort(); }, 4500) : null;
        const res = await callVaaniApi('/api/accounts/' + encodeURIComponent(code), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller ? controller.signal : undefined
        });
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        this.setStatus('synced', (data && data.updatedAt) || Date.now());
        if (manual && typeof toast === 'function') {
          toast('Account progress & score synchronized with server.');
        }
        return true;
      } catch (_err) {
        this.setStatus('local');
        if (manual && typeof toast === 'function') {
          toast('Saved on this device. Server sync will retry when online.');
        }
        return false;
      } finally {
        this.inFlight = false;
      }
    },

    async fetchRemoteAccount(code) {
      if (!nativeFetch || isStaticOnlyHostWithoutApiBase() || !/^\d{6}$/.test(String(code || ''))) return null;
      try {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? setTimeout(function () { controller.abort(); }, 2500) : null;
        const res = await callVaaniApi('/api/accounts/' + encodeURIComponent(code), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller ? controller.signal : undefined
        });
        if (timer) clearTimeout(timer);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.ok && data.record && typeof data.record === 'object') {
          return data.record;
        }
      } catch (_err) {}
      return null;
    }
  };

  window.VaaniSync = VaaniSync;

  function bindAccountAndStateHooks() {
    if (typeof window.persistCombinedAccount === 'function' && !window.persistCombinedAccount.__vaaniDynamicWrapped) {
      const origPersist = window.persistCombinedAccount;
      const wrappedPersist = async function () {
        const ok = await origPersist.apply(this, arguments);
        if (ok) {
          VaaniSync.schedulePush();
          emitStateChanged({ source: 'persistCombinedAccount' });
        }
        return ok;
      };
      wrappedPersist.__vaaniDynamicWrapped = true;
      window.persistCombinedAccount = wrappedPersist;
    }

    if (typeof window.loginWithCode === 'function' && !window.loginWithCode.__vaaniDynamicWrapped) {
      const origLogin = window.loginWithCode;
      const wrappedLogin = async function (code) {
        const clean = String(code || '').trim();
        let hadLocalEntryBeforeLogin = false;
        try {
          if (typeof accountKey === 'function' && window.localStorage) {
            hadLocalEntryBeforeLogin = window.localStorage.getItem('vbv_' + accountKey(clean)) !== null;
          }
        } catch (_e) {}
        const res = await origLogin.apply(this, arguments);
        if (res && res.ok) {
          VaaniSync.schedulePush();
          emitStateChanged({ source: 'loginWithCode', code: clean });
          return res;
        }
        const errText = String((res && (res.msg || res.error)) || '');
        if (
          res &&
          !res.ok &&
          !hadLocalEntryBeforeLogin &&
          (errText.includes('No usable account') || errText.includes('No account found')) &&
          /^\d{6}$/.test(clean)
        ) {
          const remoteRecord = await VaaniSync.fetchRemoteAccount(clean);
          if (remoteRecord && typeof Store !== 'undefined' && typeof accountKey === 'function') {
            const savedLocally = await Store.set(accountKey(clean), JSON.stringify(remoteRecord));
            if (savedLocally) {
              const retryRes = await origLogin.call(this, clean);
              if (retryRes && retryRes.ok) {
                VaaniSync.setStatus('synced', Date.now());
                emitStateChanged({ source: 'loginWithCodeRemote', code: clean });
              }
              return retryRes;
            }
          }
        }
        return res;
      };
      wrappedLogin.__vaaniDynamicWrapped = true;
      window.loginWithCode = wrappedLogin;
    }

    if (typeof window.saveState === 'function' && !window.saveState.__vaaniDynamicWrapped) {
      const origSaveState = window.saveState;
      const wrappedSaveState = function () {
        const res = origSaveState.apply(this, arguments);
        VaaniSync.schedulePush();
        updateDashboardQuickTileBadges();
        emitStateChanged({ source: 'saveState' });
        return res;
      };
      wrappedSaveState.__vaaniDynamicWrapped = true;
      window.saveState = wrappedSaveState;
    }

    if (typeof window.toggleBookmark === 'function' && !window.toggleBookmark.__vaaniDynamicWrapped) {
      const origToggleBm = window.toggleBookmark;
      const wrappedToggleBm = function (qid, starEl) {
        const res = origToggleBm.apply(this, arguments);
        emitStateChanged({ source: 'toggleBookmark', qid: qid });
        return res;
      };
      wrappedToggleBm.__vaaniDynamicWrapped = true;
      window.toggleBookmark = wrappedToggleBm;
    }

    if (typeof window.vaaniResultBriefingNode === 'function' && !window.vaaniResultBriefingNode.__vaaniDynamicWrapped) {
      const origBriefingNode = window.vaaniResultBriefingNode;
      const wrappedBriefingNode = function (score, label) {
        const section = origBriefingNode.apply(this, arguments);
        try {
          const pct = Number(score);
          const poseKey = !Number.isFinite(pct)
            ? 'guidance'
            : pct >= 90
            ? 'celebration'
            : pct >= 70
            ? 'congratulatory'
            : pct >= 50
            ? 'motivational'
            : 'guidance';
          VaaniOfficerRig.setPose(poseKey);
          const art = section && section.querySelector ? section.querySelector('.vaani-result-briefing-art') : null;
          if (art && !art.querySelector('.vaani-result-rig-svg')) {
            art.classList.add('has-vaani-rig');
            const holder = document.createElement('div');
            holder.className = 'vaani-result-rig-svg';
            holder.setAttribute('aria-hidden', 'true');
            holder.innerHTML = renderOfficerRigSVG(poseKey);
            art.appendChild(holder);
          }
        } catch (_e) {}
        return section;
      };
      wrappedBriefingNode.__vaaniDynamicWrapped = true;
      window.vaaniResultBriefingNode = wrappedBriefingNode;
    }

    if (typeof window.addXP === 'function' && !window.addXP.__vaaniDynamicWrapped) {
      const origAddXp = window.addXP;
      const wrappedAddXp = function (amount, reason) {
        const res = origAddXp.apply(this, arguments);
        if (Number(amount) >= 10) {
          VaaniOfficerRig.setPose('congratulatory');
        }
        updateDashboardQuickTileBadges();
        return res;
      };
      wrappedAddXp.__vaaniDynamicWrapped = true;
      window.addXP = wrappedAddXp;
    }
  }

  /* ============================================================
     3. DEEP-LINK ROUTER, 200MS VIEW TRANSITIONS & BREADCRUMBS
  ============================================================= */
  let activeTransitionTimer = null;

  function getActiveSubItemId(viewName) {
    if (viewName === 'topic' && typeof currentTopic !== 'undefined' && currentTopic && currentTopic.id) {
      return String(currentTopic.id);
    }
    if (viewName === 'worddetail' && typeof currentWordId !== 'undefined' && currentWordId) {
      return String(currentWordId);
    }
    if (viewName === 'compare-detail' && typeof currentCompare !== 'undefined' && currentCompare && currentCompare.id) {
      return String(currentCompare.id);
    }
    if (initialBootParams.id && initialBootParams.v === viewName) {
      return String(initialBootParams.id);
    }
    return '';
  }

  function enhanceUrlBuilder() {
    if (typeof window.__vaaniViewUrl !== 'function' || window.__vaaniViewUrl.__vaaniDynamicWrapped) return;
    const origViewUrl = window.__vaaniViewUrl;
    const wrappedViewUrl = function (view, hash) {
      const base = origViewUrl.call(this, view, hash);
      try {
        const u = new URL(base, window.location.origin);
        const subId = getActiveSubItemId(view);
        if (subId) {
          u.searchParams.set('id', subId);
        } else {
          u.searchParams.delete('id');
        }
        return u.pathname + u.search + u.hash;
      } catch (_e) {
        return base;
      }
    };
    wrappedViewUrl.__vaaniDynamicWrapped = true;
    window.__vaaniViewUrl = wrappedViewUrl;
  }

  function ensureBreadcrumbBar() {
    let bar = document.getElementById('vaaniBreadcrumbBar');
    if (bar) return bar;
    const main = document.getElementById('mainContent');
    if (!main) return null;
    bar = document.createElement('nav');
    bar.id = 'vaaniBreadcrumbBar';
    bar.className = 'vaani-breadcrumb-bar';
    bar.setAttribute('aria-label', 'Contextual breadcrumb navigation');
    bar.hidden = true;
    main.insertBefore(bar, main.firstChild);
    return bar;
  }

  function getAdjacentGrammarTopics(topicId) {
    if (typeof SKILL_TIERS === 'undefined' || typeof GRAMMAR === 'undefined') return { prev: null, next: null };
    const flat = SKILL_TIERS.flatMap(function (t) { return t.ids; }).filter(function (id) {
      return GRAMMAR.some(function (g) { return g.id === id; });
    });
    const idx = flat.indexOf(topicId);
    if (idx === -1) return { prev: null, next: null };
    const prevId = idx > 0 ? flat[idx - 1] : null;
    const nextId = idx < flat.length - 1 ? flat[idx + 1] : null;
    return {
      prev: prevId ? GRAMMAR.find(function (g) { return g.id === prevId; }) : null,
      next: nextId ? GRAMMAR.find(function (g) { return g.id === nextId; }) : null
    };
  }

  function getAdjacentWords(wordId) {
    if (typeof VOCAB === 'undefined' || !Array.isArray(VOCAB)) return { prev: null, next: null };
    const idx = VOCAB.findIndex(function (v) { return v.id === wordId; });
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? VOCAB[idx - 1] : null,
      next: idx < VOCAB.length - 1 ? VOCAB[idx + 1] : null
    };
  }

  function getAdjacentComparisons(cmpId) {
    if (typeof COMPARISONS === 'undefined' || !Array.isArray(COMPARISONS)) return { prev: null, next: null };
    const idx = COMPARISONS.findIndex(function (c) { return c.id === cmpId; });
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? COMPARISONS[idx - 1] : null,
      next: idx < COMPARISONS.length - 1 ? COMPARISONS[idx + 1] : null
    };
  }

  function updateBreadcrumbBar(activeViewName) {
    const bar = ensureBreadcrumbBar();
    if (!bar) return;
    const view = activeViewName || (typeof __vaaniActiveView === 'function' ? __vaaniActiveView() : 'dashboard');

    if (view === 'topic' && typeof currentTopic !== 'undefined' && currentTopic) {
      const parentView = (typeof lastListView === 'string' && lastListView) ? lastListView : 'grammar';
      const parentLabel = {
        grammar: 'Grammar Academy',
        practice: 'Sentence Practice',
        reading: 'Reading Comprehension',
        tests: 'Mock Tests'
      }[parentView] || 'Grammar Academy';
      const tid = currentTopic.id;
      const isSaved = !!(typeof State !== 'undefined' && State.bookmarkedTopics && State.bookmarkedTopics[tid]);
      const adj = getAdjacentGrammarTopics(tid);
      const linkedPyqs = (typeof PYQ_ALL !== 'undefined' && Array.isArray(PYQ_ALL))
        ? PYQ_ALL.filter(function (q) { return q.lessonId === tid; }).length
        : 0;

      bar.hidden = false;
      bar.innerHTML =
        '<div class="vaani-bc-trail">' +
          '<button type="button" class="vaani-bc-link" data-bc-view="dashboard">Command Center</button>' +
          '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
          '<button type="button" class="vaani-bc-link" data-bc-view="' + escHtml(parentView) + '">' + escHtml(parentLabel) + '</button>' +
          '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
          '<span class="vaani-bc-current">' + escHtml(currentTopic.title || 'Lesson') + '</span>' +
        '</div>' +
        '<div class="vaani-bc-actions">' +
          '<button type="button" class="vaani-bc-btn ' + (isSaved ? 'is-active' : '') + '" data-bc-action="bookmark-topic" data-topic-id="' + escHtml(tid) + '">' +
            (isSaved ? '★ Saved Topic' : '☆ Save Topic') +
          '</button>' +
          (linkedPyqs > 0
            ? '<button type="button" class="vaani-bc-btn" data-bc-action="topic-pyq" data-topic-id="' + escHtml(tid) + '">🎯 ' + linkedPyqs + ' PYQs</button>'
            : '') +
          (adj.prev
            ? '<button type="button" class="vaani-bc-btn" data-bc-action="open-topic" data-topic-id="' + escHtml(adj.prev.id) + '" title="Previous: ' + escHtml(adj.prev.title) + '">← Prev</button>'
            : '') +
          (adj.next
            ? '<button type="button" class="vaani-bc-btn" data-bc-action="open-topic" data-topic-id="' + escHtml(adj.next.id) + '" title="Next: ' + escHtml(adj.next.title) + '">Next →</button>'
            : '') +
        '</div>';
      renderTopicFooterNav(tid, adj, isSaved, linkedPyqs);
      return;
    }

    if (view === 'journey') {
      bar.hidden = false;
      bar.innerHTML =
        '<div class="vaani-bc-trail">' +
          '<button type="button" class="vaani-bc-link" data-bc-view="dashboard">Command Center</button>' +
          '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
          '<button type="button" class="vaani-bc-link" data-bc-view="grammar">Grammar Academy</button>' +
          '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
          '<span class="vaani-bc-current">Campaign Roadmap</span>' +
        '</div>' +
        '<div class="vaani-bc-actions">' +
          '<button type="button" class="vaani-bc-btn" data-bc-view="grammar">← Back to Skill Tree</button>' +
        '</div>';
      return;
    }

    if (view === 'worddetail' && typeof currentWordId !== 'undefined' && currentWordId && typeof VOCAB_BY_ID !== 'undefined') {
      const w = VOCAB_BY_ID[currentWordId];
      if (w) {
        const adj = getAdjacentWords(w.id);
        const learned = isVocabWordLearned(w.id);
        bar.hidden = false;
        bar.innerHTML =
          '<div class="vaani-bc-trail">' +
            '<button type="button" class="vaani-bc-link" data-bc-view="dashboard">Command Center</button>' +
            '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
            '<button type="button" class="vaani-bc-link" data-bc-view="vocab">Vocabulary Hub</button>' +
            '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
            '<span class="vaani-bc-current">' + escHtml(w.w) + '</span>' +
          '</div>' +
          '<div class="vaani-bc-actions">' +
            '<button type="button" class="vaani-bc-btn ' + (learned ? 'is-active' : '') + '" data-bc-action="mark-word">' +
              (learned ? '✓ Mastered' : '＋ Mark Mastered (+10 XP)') +
            '</button>' +
            (adj.prev
              ? '<button type="button" class="vaani-bc-btn" data-bc-action="open-word" data-word-id="' + escHtml(adj.prev.id) + '">← ' + escHtml(adj.prev.w) + '</button>'
              : '') +
            (adj.next
              ? '<button type="button" class="vaani-bc-btn" data-bc-action="open-word" data-word-id="' + escHtml(adj.next.id) + '">' + escHtml(adj.next.w) + ' →</button>'
              : '') +
          '</div>';
        return;
      }
    }

    if (view === 'vocab90') {
      bar.hidden = false;
      bar.innerHTML =
        '<div class="vaani-bc-trail">' +
          '<button type="button" class="vaani-bc-link" data-bc-view="dashboard">Command Center</button>' +
          '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
          '<button type="button" class="vaani-bc-link" data-bc-view="vocab">Vocabulary Hub</button>' +
          '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
          '<span class="vaani-bc-current">90-Day Vocabulary Target</span>' +
        '</div>' +
        '<div class="vaani-bc-actions">' +
          '<button type="button" class="vaani-bc-btn" data-bc-view="vocab">← Vocabulary Hub</button>' +
        '</div>';
      return;
    }

    if (view === 'compare-detail' && typeof currentCompare !== 'undefined' && currentCompare) {
      const adj = getAdjacentComparisons(currentCompare.id);
      bar.hidden = false;
      bar.innerHTML =
        '<div class="vaani-bc-trail">' +
          '<button type="button" class="vaani-bc-link" data-bc-view="dashboard">Command Center</button>' +
          '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
          '<button type="button" class="vaani-bc-link" data-bc-view="compare">Confusable Pairs</button>' +
          '<span class="vaani-bc-sep" aria-hidden="true">›</span>' +
          '<span class="vaani-bc-current">' + escHtml(currentCompare.a + ' vs ' + currentCompare.b) + '</span>' +
        '</div>' +
        '<div class="vaani-bc-actions">' +
          (adj.prev
            ? '<button type="button" class="vaani-bc-btn" data-bc-action="open-compare" data-cmp-id="' + escHtml(adj.prev.id) + '">← ' + escHtml(adj.prev.a + '/' + adj.prev.b) + '</button>'
            : '') +
          (adj.next
            ? '<button type="button" class="vaani-bc-btn" data-bc-action="open-compare" data-cmp-id="' + escHtml(adj.next.id) + '">' + escHtml(adj.next.a + '/' + adj.next.b) + ' →</button>'
            : '') +
        '</div>';
      return;
    }

    bar.hidden = true;
    bar.innerHTML = '';
  }

  function renderTopicFooterNav(tid, adj, isSaved, linkedPyqs) {
    const viewTopic = document.getElementById('view-topic');
    if (!viewTopic) return;
    let footer = document.getElementById('vaaniTopicNavFooter');
    if (!footer) {
      footer = document.createElement('div');
      footer.id = 'vaaniTopicNavFooter';
      footer.className = 'vaani-topic-nav-footer';
      viewTopic.appendChild(footer);
    }
    footer.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        (adj.prev
          ? '<button type="button" class="btn ghost" data-bc-action="open-topic" data-topic-id="' + escHtml(adj.prev.id) + '">← ' + escHtml(adj.prev.title) + '</button>'
          : '<button type="button" class="btn ghost" data-bc-view="grammar">← All Grammar Topics</button>') +
        '<button type="button" class="btn ghost ' + (isSaved ? 'is-active' : '') + '" data-bc-action="bookmark-topic" data-topic-id="' + escHtml(tid) + '">' +
          (isSaved ? '★ Bookmarked' : '☆ Bookmark Lesson') +
        '</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        (linkedPyqs > 0
          ? '<button type="button" class="btn ghost" data-bc-action="topic-pyq" data-topic-id="' + escHtml(tid) + '">🎯 Solve ' + linkedPyqs + ' Linked PYQs</button>'
          : '') +
        (adj.next
          ? '<button type="button" class="btn" data-bc-action="open-topic" data-topic-id="' + escHtml(adj.next.id) + '">Next: ' + escHtml(adj.next.title) + ' →</button>'
          : '') +
      '</div>';
  }

  document.addEventListener('click', function (e) {
    const viewBtn = e.target.closest('[data-bc-view]');
    if (viewBtn) {
      const targetView = viewBtn.getAttribute('data-bc-view');
      if (targetView && typeof switchView === 'function') switchView(targetView);
      return;
    }
    const actionBtn = e.target.closest('[data-bc-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-bc-action');
    if (action === 'open-topic') {
      const id = actionBtn.getAttribute('data-topic-id');
      if (id && typeof openTopic === 'function') openTopic(id);
    } else if (action === 'bookmark-topic') {
      const id = actionBtn.getAttribute('data-topic-id');
      if (!id || typeof State === 'undefined') return;
      State.bookmarkedTopics = State.bookmarkedTopics || {};
      if (State.bookmarkedTopics[id]) {
        delete State.bookmarkedTopics[id];
        if (typeof toast === 'function') toast('Removed lesson bookmark.');
      } else {
        State.bookmarkedTopics[id] = true;
        if (typeof toast === 'function') toast('Lesson bookmarked for quick revision.');
      }
      if (typeof saveState === 'function') saveState();
      updateBreadcrumbBar('topic');
    } else if (action === 'topic-pyq') {
      const id = actionBtn.getAttribute('data-topic-id');
      if (id && typeof openPyqByLesson === 'function') openPyqByLesson(id);
    } else if (action === 'open-word') {
      const id = actionBtn.getAttribute('data-word-id');
      if (id && typeof openWord === 'function') openWord(id);
    } else if (action === 'mark-word') {
      if (typeof markWordLearned === 'function') markWordLearned();
      updateBreadcrumbBar('worddetail');
    } else if (action === 'open-compare') {
      const id = actionBtn.getAttribute('data-cmp-id');
      if (id && typeof openCompare === 'function') openCompare(id);
    }
  });

  function bindNavigationAndTransitions() {
    enhanceUrlBuilder();

    if (typeof window.switchView === 'function' && !window.switchView.__vaaniDynamicWrapped) {
      const origSwitchView = window.switchView;
      const wrappedSwitchView = function (name, options) {
        origSwitchView.apply(this, arguments);
        const skipAnim = !!(options && options.history === false);
        const target = document.getElementById('view-' + name);
        if (target && !skipAnim) {
          document.querySelectorAll('.view.vaani-view-enter').forEach(function (el) {
            if (el !== target) el.classList.remove('vaani-view-enter');
          });
          target.classList.remove('vaani-view-enter');
          void target.offsetWidth;
          target.classList.add('vaani-view-enter');
          if (activeTransitionTimer) clearTimeout(activeTransitionTimer);
          activeTransitionTimer = setTimeout(function () {
            target.classList.remove('vaani-view-enter');
          }, 220);
        }
        updateBreadcrumbBar(name);
        updateDashboardQuickTileBadges();
      };
      wrappedSwitchView.__vaaniDynamicWrapped = true;
      window.switchView = wrappedSwitchView;
    }

    if (typeof window.openTopic === 'function' && !window.openTopic.__vaaniDynamicWrapped) {
      const origOpenTopic = window.openTopic;
      const wrappedOpenTopic = function (id) {
        origOpenTopic.apply(this, arguments);
        updateBreadcrumbBar('topic');
      };
      wrappedOpenTopic.__vaaniDynamicWrapped = true;
      window.openTopic = wrappedOpenTopic;
    }

    if (typeof window.openWord === 'function' && !window.openWord.__vaaniDynamicWrapped) {
      const origOpenWord = window.openWord;
      const wrappedOpenWord = function (id) {
        origOpenWord.apply(this, arguments);
        updateBreadcrumbBar('worddetail');
      };
      wrappedOpenWord.__vaaniDynamicWrapped = true;
      window.openWord = wrappedOpenWord;
    }

    if (typeof window.openCompare === 'function' && !window.openCompare.__vaaniDynamicWrapped) {
      const origOpenCompare = window.openCompare;
      const wrappedOpenCompare = function (id) {
        origOpenCompare.apply(this, arguments);
        updateBreadcrumbBar('compare-detail');
      };
      wrappedOpenCompare.__vaaniDynamicWrapped = true;
      window.openCompare = wrappedOpenCompare;
    }

    const hydrateSubItemFromUrl = function (view, itemId) {
      if (!itemId) return;
      if (view === 'topic' && typeof openTopic === 'function') {
        openTopic(itemId);
      } else if (view === 'worddetail' && typeof openWord === 'function') {
        openWord(itemId);
      } else if (view === 'compare-detail' && typeof openCompare === 'function') {
        openCompare(itemId);
      }
    };

    try {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('v') || initialBootParams.v;
      const itemId = params.get('id') || initialBootParams.id;
      if (itemId) {
        hydrateSubItemFromUrl(view, itemId);
        initialBootParams = { v: '', id: '' };
      }
    } catch (_e) {}

    window.addEventListener('popstate', function () {
      try {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('v');
        const itemId = params.get('id');
        if (itemId) {
          if (view === 'topic' && (typeof currentTopic === 'undefined' || !currentTopic || String(currentTopic.id) !== String(itemId))) {
            hydrateSubItemFromUrl(view, itemId);
          } else if (view === 'worddetail' && (typeof currentWordId === 'undefined' || String(currentWordId) !== String(itemId))) {
            hydrateSubItemFromUrl(view, itemId);
          } else if (view === 'compare-detail' && (typeof currentCompare === 'undefined' || !currentCompare || String(currentCompare.id) !== String(itemId))) {
            hydrateSubItemFromUrl(view, itemId);
          }
        }
      } catch (_e) {}
    });
  }

  /* ============================================================
     4. VOCABULARY MASTERY SYSTEM (All / Mastered / Unmastered / Bookmarked)
  ============================================================= */
  let vocabMasteryFilter = 'all'; // 'all' | 'learned' | 'unlearned' | 'bookmarked'

  function isVocabWordLearned(wordId) {
    if (typeof State === 'undefined') return false;
    if (Array.isArray(State.wordsLearned) && State.wordsLearned.includes(wordId)) return true;
    if (State.vocabLearned && typeof State.vocabLearned === 'object') {
      const keys = Object.keys(State.vocabLearned);
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] === wordId || keys[i].endsWith('_' + wordId)) {
          if (State.vocabLearned[keys[i]]) return true;
        }
      }
    }
    return false;
  }

  function isVocabWordBookmarked(wordId) {
    if (typeof State === 'undefined') return false;
    const bms = Array.isArray(State.bookmarks) ? State.bookmarks : [];
    return bms.includes(wordId) || bms.includes('vocab:' + wordId);
  }

  function toggleVocabWordMastery(wordId) {
    if (typeof State === 'undefined' || !wordId) return;
    State.wordsLearned = Array.isArray(State.wordsLearned) ? State.wordsLearned : [];
    State.vocabLearned = (State.vocabLearned && typeof State.vocabLearned === 'object') ? State.vocabLearned : {};
    State.vocabXpRewarded = (State.vocabXpRewarded && typeof State.vocabXpRewarded === 'object') ? State.vocabXpRewarded : {};

    const currentlyLearned = isVocabWordLearned(wordId);
    if (currentlyLearned) {
      State.wordsLearned = State.wordsLearned.filter(function (id) { return id !== wordId; });
      Object.keys(State.vocabLearned).forEach(function (k) {
        if (k === wordId || k.endsWith('_' + wordId)) delete State.vocabLearned[k];
      });
      if (typeof toast === 'function') toast('Word moved back to Unmastered for revision.');
    } else {
      if (!State.wordsLearned.includes(wordId)) State.wordsLearned.push(wordId);
      State.vocabLearned[wordId] = true;
      if (!State.vocabXpRewarded[wordId]) {
        State.vocabXpRewarded[wordId] = true;
        if (typeof addXP === 'function') addXP(10, 'Mastered word: ' + wordId);
      } else if (typeof toast === 'function') {
        toast('Word marked as Mastered ✓');
      }
    }
    if (typeof saveState === 'function') saveState();
    if (typeof renderVocabGrid === 'function') renderVocabGrid();
    const code = typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE ? String(ACTIVE_CODE).trim() : '';
    if (nativeFetch && !isStaticOnlyHostWithoutApiBase() && /^\d{6}$/.test(code)) {
      callVaaniApi('/api/vocab/mastery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, wordId: wordId, mastered: !currentlyLearned })
      }).catch(function () {});
    }
  }

  function toggleVocabWordBookmark(wordId) {
    if (typeof State === 'undefined' || !wordId) return;
    State.bookmarks = Array.isArray(State.bookmarks) ? State.bookmarks : [];
    const idx = State.bookmarks.indexOf(wordId);
    const desiredBm = idx < 0;
    if (idx >= 0) {
      State.bookmarks.splice(idx, 1);
      if (typeof toast === 'function') toast('Removed word bookmark.');
    } else {
      State.bookmarks.push(wordId);
      if (typeof toast === 'function') toast('Word bookmarked ★');
    }
    if (typeof saveState === 'function') saveState();
    if (typeof renderVocabGrid === 'function') renderVocabGrid();
    const code = typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE ? String(ACTIVE_CODE).trim() : '';
    if (nativeFetch && !isStaticOnlyHostWithoutApiBase() && /^\d{6}$/.test(code)) {
      callVaaniApi('/api/vocab/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, wordId: wordId, bookmarked: desiredBm })
      }).catch(function () {});
    }
  }

  function updateVocabMasteryUI() {
    const diffChips = document.getElementById('vocabDiffChips');
    if (!diffChips || typeof VOCAB === 'undefined' || !Array.isArray(VOCAB)) return;

    const total = VOCAB.length;
    const masteredCount = VOCAB.filter(function (v) { return isVocabWordLearned(v.id); }).length;
    const unmasteredCount = Math.max(0, total - masteredCount);
    const bookmarkedCount = VOCAB.filter(function (v) { return isVocabWordBookmarked(v.id); }).length;
    const pct = total ? Math.round((masteredCount / total) * 100) : 0;

    // 1. Command Bar with progress & Weak-Vocabulary quick filter
    let cmdBar = document.getElementById('vocabMasteryCommandBar');
    if (!cmdBar) {
      cmdBar = document.createElement('div');
      cmdBar.id = 'vocabMasteryCommandBar';
      cmdBar.className = 'vv-mastery-command-bar';
      diffChips.parentNode.insertBefore(cmdBar, diffChips);
    }
    cmdBar.innerHTML =
      '<div class="vv-mastery-stats">' +
        '<span class="vv-mastery-stat">Mastered: <b>' + masteredCount + ' / ' + total + '</b> (' + pct + '%)</span>' +
        '<span class="vv-mastery-stat">Unmastered: <b>' + unmasteredCount + '</b></span>' +
        '<span class="vv-mastery-stat">Bookmarked: <b>' + bookmarkedCount + '</b></span>' +
        '<div class="vv-mastery-bar-track" aria-hidden="true"><div class="vv-mastery-bar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (unmasteredCount > 0
          ? '<button type="button" class="vaani-bc-btn ' + (vocabMasteryFilter === 'unlearned' ? 'is-active' : '') + '" id="vvFocusUnmasteredBtn">Focus Unmastered (' + unmasteredCount + ')</button>'
          : '') +
      '</div>';

    const focusBtn = cmdBar.querySelector('#vvFocusUnmasteredBtn');
    if (focusBtn) {
      focusBtn.addEventListener('click', function () {
        vocabMasteryFilter = vocabMasteryFilter === 'unlearned' ? 'all' : 'unlearned';
        if (typeof renderVocabGrid === 'function') renderVocabGrid();
      });
    }

    // 2. Mastery Filter Chips (All · Mastered · Unmastered · Bookmarked)
    let row = document.getElementById('vocabMasteryChips');
    if (!row) {
      row = document.createElement('div');
      row.className = 'filter-chips';
      row.id = 'vocabMasteryChips';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'Filter vocabulary by mastery status');
      diffChips.parentNode.insertBefore(row, diffChips.nextSibling);
      row.addEventListener('click', function (e) {
        const chip = e.target.closest('[data-mastery]');
        if (!chip) return;
        vocabMasteryFilter = chip.getAttribute('data-mastery') || 'all';
        if (typeof renderVocabGrid === 'function') renderVocabGrid();
      });
    }

    const tabs = [
      ['all', 'All (' + total + ')'],
      ['learned', '✓ Mastered (' + masteredCount + ')'],
      ['unlearned', '○ Unmastered (' + unmasteredCount + ')'],
      ['bookmarked', '★ Bookmarked (' + bookmarkedCount + ')']
    ];
    row.innerHTML = tabs.map(function (t) {
      const isAct = vocabMasteryFilter === t[0];
      return '<span class="chip ' + (isAct ? 'active' : '') + '" data-mastery="' + t[0] + '" role="button" tabindex="0" aria-pressed="' + isAct + '">' + t[1] + '</span>';
    }).join('');
  }

  function enhanceVocabGrid() {
    if (typeof window.renderVocabGrid !== 'function' || window.renderVocabGrid.__vaaniDynamicWrapped) return;
    const origRenderVocabGrid = window.renderVocabGrid;
    const wrappedRenderVocabGrid = function () {
      updateVocabMasteryUI();
      origRenderVocabGrid.apply(this, arguments);
      const grid = document.getElementById('vocabGrid');
      if (!grid || typeof VOCAB === 'undefined') return;
      const cards = Array.from(grid.querySelectorAll('.word-card'));
      let visibleCount = 0;

      cards.forEach(function (card) {
        const h3 = card.querySelector('h3');
        if (!h3) return;
        const wordText = h3.textContent.trim();
        const entry = VOCAB.find(function (v) { return v.w === wordText; });
        if (!entry) return;
        const learned = isVocabWordLearned(entry.id);
        const bookmarked = isVocabWordBookmarked(entry.id);

        if (
          (vocabMasteryFilter === 'learned' && !learned) ||
          (vocabMasteryFilter === 'unlearned' && learned) ||
          (vocabMasteryFilter === 'bookmarked' && !bookmarked)
        ) {
          card.remove();
          return;
        }
        visibleCount++;

        // Add Mastery Status Badge inside .wc-pos (leaving h3 untouched for smoke tests)
        const posEl = card.querySelector('.wc-pos');
        if (posEl && !posEl.querySelector('.wc-learned-badge')) {
          const badge = document.createElement('span');
          badge.className = 'wc-learned-badge ' + (learned ? '' : 'unmastered');
          badge.textContent = learned ? '✓ Mastered' : '○ Unmastered';
          posEl.appendChild(badge);
        }

        // Add inline Mastery & Bookmark controls
        if (!card.querySelector('.wc-mastery-actions')) {
          const actRow = document.createElement('div');
          actRow.className = 'wc-mastery-actions';
          actRow.innerHTML =
            '<button type="button" class="wc-mastery-btn ' + (learned ? 'is-mastered' : '') + '" data-wc-mastery="' + escHtml(entry.id) + '">' +
              (learned ? '✓ Mastered' : '＋ Mark Mastered') +
            '</button>' +
            '<button type="button" class="wc-mastery-btn ' + (bookmarked ? 'is-bookmarked' : '') + '" data-wc-bm="' + escHtml(entry.id) + '" aria-label="Bookmark ' + escHtml(entry.w) + '">' +
              (bookmarked ? '★ Saved' : '☆ Bookmark') +
            '</button>';
          actRow.addEventListener('click', function (ev) {
            ev.stopPropagation();
            const mBtn = ev.target.closest('[data-wc-mastery]');
            if (mBtn) {
              toggleVocabWordMastery(mBtn.getAttribute('data-wc-mastery'));
              return;
            }
            const bmBtn = ev.target.closest('[data-wc-bm]');
            if (bmBtn) {
              toggleVocabWordBookmark(bmBtn.getAttribute('data-wc-bm'));
            }
          });
          card.appendChild(actRow);
        }
      });

      if (visibleCount === 0 && !grid.querySelector('.vaani-module-officer-banner')) {
        const emptyBanner = document.createElement('div');
        emptyBanner.className = 'vaani-module-officer-banner';
        emptyBanner.style.gridColumn = '1 / -1';
        emptyBanner.innerHTML =
          '<div class="vaani-mob-avatar" aria-hidden="true">' + renderOfficerRigSVG('guidance') + '</div>' +
          '<div>' +
            '<div class="vaani-mob-kicker">OFFICER VAANI · VOCABULARY FILTER</div>' +
            '<h3 class="vaani-mob-title">No vocabulary words match this filter combination.</h3>' +
            '<p class="vaani-mob-desc">Reset the mastery or category filter to view the complete NDA & CDS vocabulary arsenal.</p>' +
          '</div>' +
          '<div>' +
            '<button type="button" class="vaani-bc-btn" id="vvResetEmptyFilterBtn">↺ Show All Words</button>' +
          '</div>';
        grid.appendChild(emptyBanner);
        const resetBtn = emptyBanner.querySelector('#vvResetEmptyFilterBtn');
        if (resetBtn) {
          resetBtn.addEventListener('click', function () {
            vocabMasteryFilter = 'all';
            if (typeof renderVocabGrid === 'function') renderVocabGrid();
          });
        }
      }
    };
    wrappedRenderVocabGrid.__vaaniDynamicWrapped = true;
    window.renderVocabGrid = wrappedRenderVocabGrid;
  }

  /* ============================================================
     5. INTERACTIVE PAGINATED PYQ EXPLORER + ANTI-FARMING XP GUARD
  ============================================================= */
  const PyqExplorer = {
    exam: 'ALL',
    year: 'ALL',
    topic: 'ALL',
    status: 'ALL', // 'ALL' | 'SOLVED' | 'MISTAKES' | 'BOOKMARKED' | 'UNATTEMPTED'
    query: '',
    page: 1,
    pageSize: 10,
    expanded: true,
    sessionAnswers: {},
    sessionXpStatus: {}, // 'awarded' | 'already-claimed'

    getBaseFilteredWithoutStatus() {
      if (typeof PYQ_ALL === 'undefined' || !Array.isArray(PYQ_ALL)) return [];
      const qLower = this.query.trim().toLowerCase();
      return PYQ_ALL.filter(function (q) {
        if (PyqExplorer.exam !== 'ALL' && q._exam !== PyqExplorer.exam) return false;
        if (PyqExplorer.year !== 'ALL' && String(q.y) !== String(PyqExplorer.year)) return false;
        if (PyqExplorer.topic !== 'ALL' && q.sec !== PyqExplorer.topic) return false;
        if (qLower) {
          const hay = (q.q + ' ' + (q.passage || '') + ' ' + (q.o || []).join(' ') + ' ' + (q.sec || '') + ' ' + q.y).toLowerCase();
          if (!hay.includes(qLower)) return false;
        }
        return true;
      });
    },

    getFilteredQuestions() {
      const base = this.getBaseFilteredWithoutStatus();
      if (this.status === 'ALL') return base;
      const st = typeof ensurePyqStats === 'function' ? ensurePyqStats() : { attempts: {} };
      const bms = new Set(typeof getBookmarks === 'function' ? getBookmarks() : []);
      return base.filter(function (q) {
        const att = st.attempts[q._id];
        const isBm = bms.has('pyq:' + q._id) || bms.has(q._id);
        if (PyqExplorer.status === 'UNATTEMPTED') return att === undefined;
        if (PyqExplorer.status === 'SOLVED') return att === true;
        if (PyqExplorer.status === 'MISTAKES') return att === false;
        if (PyqExplorer.status === 'BOOKMARKED') return isBm;
        return true;
      });
    },

    mountIntoPyqHome() {
      const pvApp = document.getElementById('pvApp');
      if (!pvApp || (typeof PV !== 'undefined' && PV.screen !== 'home')) return;
      const screen = pvApp.querySelector('.pv-screen');
      if (!screen) return;

      let shell = document.getElementById('pvDynamicExplorer');
      if (!shell) {
        shell = document.createElement('section');
        shell.id = 'pvDynamicExplorer';
        shell.className = 'pv-explorer-shell';
        shell.setAttribute('aria-label', 'Interactive PYQ Question Bank Explorer');
        const topicTools = screen.querySelector('.pv-topic-tools');
        const topicHeading = topicTools ? topicTools.previousElementSibling : null;
        if (topicHeading && topicHeading.parentNode === screen) {
          screen.insertBefore(shell, topicHeading);
        } else {
          screen.appendChild(shell);
        }
      }
      this.renderShell(shell);
    },

    renderShell(shell) {
      if (!shell || typeof PYQ_ALL === 'undefined') return;
      const years = Array.from(new Set(PYQ_ALL.map(function (q) { return String(q.y); }))).sort(function (a, b) { return Number(b) - Number(a); });
      const topics = Array.from(new Set(PYQ_ALL.map(function (q) { return q.sec; }).filter(Boolean))).sort();
      const base = this.getBaseFilteredWithoutStatus();
      const filtered = this.getFilteredQuestions();
      const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
      if (this.page > totalPages) this.page = totalPages;
      if (this.page < 1) this.page = 1;

      const st = typeof ensurePyqStats === 'function' ? ensurePyqStats() : { attempts: {} };
      const bms = new Set(typeof getBookmarks === 'function' ? getBookmarks() : []);
      const countCorrect = base.filter(function (q) { return st.attempts[q._id] === true; }).length;
      const countWrong = base.filter(function (q) { return st.attempts[q._id] === false; }).length;
      const countBm = base.filter(function (q) { return bms.has('pyq:' + q._id) || bms.has(q._id); }).length;
      const countUnattempted = base.filter(function (q) { return st.attempts[q._id] === undefined; }).length;

      const solvedInFiltered = filtered.filter(function (q) { return st.attempts[q._id] !== undefined; }).length;
      const correctInFiltered = filtered.filter(function (q) { return st.attempts[q._id] === true; }).length;
      const accPct = solvedInFiltered ? Math.round((correctInFiltered / solvedInFiltered) * 100) : null;

      const sliceStart = (this.page - 1) * this.pageSize;
      const pageItems = this.expanded ? filtered.slice(sliceStart, sliceStart + this.pageSize) : [];

      const statusTabs = [
        ['ALL', 'All Questions', base.length],
        ['SOLVED', 'Correct ✓', countCorrect],
        ['MISTAKES', 'Incorrect ✕', countWrong],
        ['BOOKMARKED', 'Bookmarked ★', countBm],
        ['UNATTEMPTED', 'Unattempted', countUnattempted]
      ];

      shell.innerHTML =
        '<div class="pv-explorer-head">' +
          '<div>' +
            '<span class="pv-explorer-kicker">DYNAMIC QUESTION BANK · ' + PYQ_ALL.length + ' VERIFIED PYQS</span>' +
            '<h3 class="pv-explorer-title">Interactive PYQ Question Explorer</h3>' +
            '<p class="pv-explorer-sub">Filter by status, exam, year, topic, or keyword search. Solve inline with instant explanations or launch your filtered set as a full drill.</p>' +
          '</div>' +
          '<div class="pv-explorer-head-actions">' +
            '<button type="button" class="btn ghost" id="pvExpToggleCards">' +
              (this.expanded ? 'Collapse List ▲' : 'Show Questions (' + filtered.length + ') ▼') +
            '</button>' +
            '<button type="button" class="btn" id="pvExpLaunchDrill" ' + (filtered.length === 0 ? 'disabled' : '') + '>' +
              '⚡ LAUNCH FILTERED DRILL (' + Math.min(filtered.length, 30) + ' Qs)' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="pv-status-tabs" role="group" aria-label="Filter PYQ questions by status">' +
          statusTabs.map(function (tab) {
            const isAct = PyqExplorer.status === tab[0];
            return (
              '<button type="button" class="pv-status-tab ' + (isAct ? 'active' : '') + '" data-pv-status-tab="' + tab[0] + '" aria-pressed="' + isAct + '">' +
                '<span>' + escHtml(tab[1]) + '</span>' +
                '<small>(' + tab[2] + ')</small>' +
              '</button>'
            );
          }).join('') +
        '</div>' +
        '<div class="pv-explorer-controls">' +
          '<div class="pv-exp-field">' +
            '<label for="pvExpExam">Exam Wing</label>' +
            '<select id="pvExpExam">' +
              '<option value="ALL"' + (this.exam === 'ALL' ? ' selected' : '') + '>All Exams (NDA · CDS · AFCAT)</option>' +
              '<option value="NDA"' + (this.exam === 'NDA' ? ' selected' : '') + '>NDA & NA</option>' +
              '<option value="CDS"' + (this.exam === 'CDS' ? ' selected' : '') + '>CDS (IMA/INA/AFA/OTA)</option>' +
              '<option value="AFCAT"' + (this.exam === 'AFCAT' ? ' selected' : '') + '>AFCAT</option>' +
            '</select>' +
          '</div>' +
          '<div class="pv-exp-field">' +
            '<label for="pvExpYear">Exam Year</label>' +
            '<select id="pvExpYear">' +
              '<option value="ALL"' + (this.year === 'ALL' ? ' selected' : '') + '>All Years (2009–2025)</option>' +
              years.map(function (y) {
                return '<option value="' + escHtml(y) + '"' + (PyqExplorer.year === y ? ' selected' : '') + '>' + escHtml(y) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div class="pv-exp-field">' +
            '<label for="pvExpTopic">Skill / Topic</label>' +
            '<select id="pvExpTopic">' +
              '<option value="ALL"' + (this.topic === 'ALL' ? ' selected' : '') + '>All Topics (' + topics.length + ')</option>' +
              topics.map(function (t) {
                return '<option value="' + escHtml(t) + '"' + (PyqExplorer.topic === t ? ' selected' : '') + '>' + escHtml(t) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div class="pv-exp-field">' +
            '<label for="pvExpStatus">Attempt Status</label>' +
            '<select id="pvExpStatus">' +
              '<option value="ALL"' + (this.status === 'ALL' ? ' selected' : '') + '>All Questions</option>' +
              '<option value="SOLVED"' + (this.status === 'SOLVED' ? ' selected' : '') + '>Correct ✓</option>' +
              '<option value="MISTAKES"' + (this.status === 'MISTAKES' ? ' selected' : '') + '>Incorrect ✕</option>' +
              '<option value="BOOKMARKED"' + (this.status === 'BOOKMARKED' ? ' selected' : '') + '>Bookmarked ★</option>' +
              '<option value="UNATTEMPTED"' + (this.status === 'UNATTEMPTED' ? ' selected' : '') + '>Unattempted</option>' +
            '</select>' +
          '</div>' +
          '<div class="pv-exp-field">' +
            '<label for="pvExpSearch">Keyword Search</label>' +
            '<input id="pvExpSearch" type="search" maxlength="80" placeholder="Search question text or word…" value="' + escHtml(this.query) + '">' +
          '</div>' +
        '</div>' +
        '<div class="pv-explorer-summary-bar">' +
          '<div class="pv-explorer-metrics">' +
            '<span>Matching: <b>' + filtered.length + '</b> questions</span>' +
            '<span>Attempted: <b>' + solvedInFiltered + '</b></span>' +
            '<span>Accuracy: <b>' + (accPct === null ? '—' : accPct + '%') + '</b></span>' +
          '</div>' +
          (this.exam !== 'ALL' || this.year !== 'ALL' || this.topic !== 'ALL' || this.status !== 'ALL' || this.query
            ? '<button type="button" class="vaani-bc-btn" id="pvExpResetFilters">↺ Reset All Filters</button>'
            : '') +
        '</div>' +
        (this.expanded
          ? '<div class="pv-explorer-list">' +
              (pageItems.length
                ? pageItems.map(function (q, idx) { return PyqExplorer.renderQuestionCard(q, sliceStart + idx + 1, filtered.length); }).join('')
                : '<div class="vaani-module-officer-banner">' +
                    '<div class="vaani-mob-avatar" aria-hidden="true">' + renderOfficerRigSVG('guidance') + '</div>' +
                    '<div>' +
                      '<div class="vaani-mob-kicker">OFFICER VAANI · NO MATCHING QUESTIONS</div>' +
                      '<h3 class="vaani-mob-title">No PYQs match your active filter or keyword search.</h3>' +
                      '<p class="vaani-mob-desc">Try switching the status tab back to All Questions or clearing your search term.</p>' +
                    '</div>' +
                    '<div><button type="button" class="vaani-bc-btn" id="pvExpEmptyResetBtn">↺ Reset Filters</button></div>' +
                  '</div>') +
            '</div>' +
            '<div class="pv-explorer-pager">' +
              '<span>Showing <b>' + (filtered.length ? (sliceStart + 1) + '–' + Math.min(sliceStart + this.pageSize, filtered.length) : '0') + '</b> of <b>' + filtered.length + '</b> · Page <b>' + this.page + '</b> of <b>' + totalPages + '</b></span>' +
              '<div style="display:flex;gap:8px;align-items:center">' +
                '<button type="button" class="vaani-bc-btn" id="pvExpPrevPage" ' + (this.page <= 1 ? 'disabled' : '') + '>← Previous</button>' +
                '<button type="button" class="vaani-bc-btn" id="pvExpNextPage" ' + (this.page >= totalPages ? 'disabled' : '') + '>Next →</button>' +
              '</div>' +
            '</div>'
          : '');

      this.bindShellEvents(shell, filtered);
    },

    renderQuestionCard(q, serialNum, totalFiltered) {
      const st = typeof ensurePyqStats === 'function' ? ensurePyqStats() : { attempts: {} };
      const bms = new Set(typeof getBookmarks === 'function' ? getBookmarks() : []);
      const isBm = bms.has('pyq:' + q._id) || bms.has(q._id);
      const chosen = this.sessionAnswers[q._id];
      const hasAnswered = chosen !== undefined;
      const prevAttempt = st.attempts[q._id];
      const opts = typeof pyqOptionLabels === 'function' ? pyqOptionLabels(q) : (q.o || []);
      const promptHtml = typeof pyqPromptHTML === 'function' ? pyqPromptHTML(q) : escHtml(q.q);
      const xpNote = this.sessionXpStatus[q._id];

      return (
        '<article class="pv-exp-card" data-qid="' + escHtml(q._id) + '">' +
          '<div class="pv-exp-card-top">' +
            '<div class="pv-exp-badges">' +
              '<span class="pv-exp-badge">Question #' + serialNum + ' of ' + totalFiltered + ' · ' + escHtml(q._exam || 'NDA') + ' ' + escHtml(q.s) + ' ' + escHtml(q.y) + '</span>' +
              '<span class="pv-exp-badge topic">' + escHtml(q.sec || 'English') + '</span>' +
              (prevAttempt === true ? '<span class="pv-exp-badge solved-ok">✓ Correct</span>' : '') +
              (prevAttempt === false ? '<span class="pv-exp-badge solved-no">✕ Incorrect</span>' : '') +
              (prevAttempt === undefined ? '<span class="pv-exp-badge">Unattempted</span>' : '') +
            '</div>' +
            '<button type="button" class="pv-exp-bm-btn ' + (isBm ? 'active' : '') + '" data-exp-bm="' + escHtml(q._id) + '" aria-label="Bookmark question">' +
              (isBm ? '★ Bookmarked' : '☆ Bookmark') +
            '</button>' +
          '</div>' +
          (q.passage ? '<div class="pv-passage" style="margin-bottom:10px"><div class="pv-passage-label">Passage</div><div class="pv-passage-text">' + escHtml(q.passage) + '</div></div>' : '') +
          '<div class="pv-exp-qprompt">' + promptHtml + '</div>' +
          '<div class="pv-exp-opts">' +
            opts.map(function (optText, oi) {
              let cls = 'pv-exp-opt';
              if (hasAnswered) {
                if (oi === chosen) cls += ' selected';
                if (oi === q.ans) cls += ' correct';
                else if (oi === chosen) cls += ' wrong';
              }
              const letter = String.fromCharCode(65 + oi);
              return (
                '<button type="button" class="' + cls + '" data-exp-qid="' + escHtml(q._id) + '" data-exp-oi="' + oi + '" ' + (hasAnswered ? 'disabled' : '') + '>' +
                  '<span class="pv-exp-opt-letter">' + letter + '</span>' +
                  '<span>' + escHtml(optText) + '</span>' +
                '</button>'
              );
            }).join('') +
          '</div>' +
          (hasAnswered
            ? '<div class="pv-exp-feedback">' +
                '<div class="pv-exp-feedback-top">' +
                  '<strong>' +
                    (chosen === q.ans
                      ? '✓ Correct! You selected Option ' + String.fromCharCode(65 + chosen)
                      : '✕ Incorrect — You selected Option ' + String.fromCharCode(65 + chosen) + ' · Correct Answer: Option ' + String.fromCharCode(65 + q.ans)) +
                  '</strong>' +
                  (chosen === q.ans
                    ? '<span class="pv-exp-badge xp-award">' +
                        (xpNote === 'awarded' ? '+2 XP · First Clear Reward' : 'Verified · XP Already Claimed') +
                      '</span>'
                    : '') +
                '</div>' +
                (q.exp ? '<div style="margin-top:6px">' + escHtml(q.exp) + '</div>' : '') +
              '</div>'
            : '') +
        '</article>'
      );
    },

    bindShellEvents(shell, filtered) {
      const toggleBtn = shell.querySelector('#pvExpToggleCards');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          PyqExplorer.expanded = !PyqExplorer.expanded;
          PyqExplorer.renderShell(shell);
        });
      }
      const launchBtn = shell.querySelector('#pvExpLaunchDrill');
      if (launchBtn) {
        launchBtn.addEventListener('click', function () {
          if (!filtered.length || typeof pvStartSession !== 'function') return;
          const pool = (typeof pvShuffle === 'function' ? pvShuffle(filtered) : filtered.slice()).slice(0, 30);
          const titleParts = [];
          if (PyqExplorer.exam !== 'ALL') titleParts.push(PyqExplorer.exam);
          if (PyqExplorer.year !== 'ALL') titleParts.push(PyqExplorer.year);
          if (PyqExplorer.topic !== 'ALL') titleParts.push(PyqExplorer.topic);
          if (PyqExplorer.status !== 'ALL') titleParts.push(PyqExplorer.status);
          const title = titleParts.length ? 'Filtered Drill · ' + titleParts.join(' · ') : 'Filtered PYQ Drill';
          const code = typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE ? String(ACTIVE_CODE).trim() : '';
          if (nativeFetch && !isStaticOnlyHostWithoutApiBase()) {
            callVaaniApi('/api/pyq/drill', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: /^\d{6}$/.test(code) ? code : undefined,
                exam: PyqExplorer.exam,
                year: PyqExplorer.year,
                topic: PyqExplorer.topic,
                status: PyqExplorer.status,
                q: PyqExplorer.query,
                count: pool.length
              })
            }).catch(function () {});
          }
          pvStartSession('practice', pool, { title: title });
        });
      }
      shell.querySelectorAll('[data-pv-status-tab]').forEach(function (tabBtn) {
        tabBtn.addEventListener('click', function () {
          PyqExplorer.status = tabBtn.getAttribute('data-pv-status-tab') || 'ALL';
          PyqExplorer.page = 1;
          PyqExplorer.expanded = true;
          PyqExplorer.renderShell(shell);
        });
      });
      const examSel = shell.querySelector('#pvExpExam');
      if (examSel) {
        examSel.addEventListener('change', function () {
          PyqExplorer.exam = examSel.value;
          PyqExplorer.page = 1;
          PyqExplorer.expanded = true;
          PyqExplorer.renderShell(shell);
        });
      }
      const yearSel = shell.querySelector('#pvExpYear');
      if (yearSel) {
        yearSel.addEventListener('change', function () {
          PyqExplorer.year = yearSel.value;
          PyqExplorer.page = 1;
          PyqExplorer.expanded = true;
          PyqExplorer.renderShell(shell);
        });
      }
      const topicSel = shell.querySelector('#pvExpTopic');
      if (topicSel) {
        topicSel.addEventListener('change', function () {
          PyqExplorer.topic = topicSel.value;
          PyqExplorer.page = 1;
          PyqExplorer.expanded = true;
          PyqExplorer.renderShell(shell);
        });
      }
      const statusSel = shell.querySelector('#pvExpStatus');
      if (statusSel) {
        statusSel.addEventListener('change', function () {
          PyqExplorer.status = statusSel.value;
          PyqExplorer.page = 1;
          PyqExplorer.expanded = true;
          PyqExplorer.renderShell(shell);
        });
      }
      const searchInp = shell.querySelector('#pvExpSearch');
      if (searchInp) {
        searchInp.addEventListener('input', function () {
          PyqExplorer.query = searchInp.value;
          PyqExplorer.page = 1;
          PyqExplorer.expanded = true;
          PyqExplorer.renderShell(shell);
          const nextInp = shell.querySelector('#pvExpSearch');
          if (nextInp) {
            nextInp.focus();
            const len = nextInp.value.length;
            try { nextInp.setSelectionRange(len, len); } catch (_e) {}
          }
        });
      }
      const resetAll = function () {
        PyqExplorer.exam = 'ALL';
        PyqExplorer.year = 'ALL';
        PyqExplorer.topic = 'ALL';
        PyqExplorer.status = 'ALL';
        PyqExplorer.query = '';
        PyqExplorer.page = 1;
        PyqExplorer.renderShell(shell);
      };
      const resetBtn = shell.querySelector('#pvExpResetFilters');
      if (resetBtn) resetBtn.addEventListener('click', resetAll);
      const emptyResetBtn = shell.querySelector('#pvExpEmptyResetBtn');
      if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAll);

      const prevBtn = shell.querySelector('#pvExpPrevPage');
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          if (PyqExplorer.page > 1) {
            PyqExplorer.page--;
            PyqExplorer.renderShell(shell);
          }
        });
      }
      const nextBtn = shell.querySelector('#pvExpNextPage');
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          PyqExplorer.page++;
          PyqExplorer.renderShell(shell);
        });
      }
      shell.querySelectorAll('[data-exp-oi]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const qid = btn.getAttribute('data-exp-qid');
          const oi = Number(btn.getAttribute('data-exp-oi'));
          const q = typeof PYQ_BY_ID !== 'undefined' ? PYQ_BY_ID[qid] : null;
          if (!q) return;
          const st = typeof ensurePyqStats === 'function' ? ensurePyqStats() : { attempts: {} };
          if (typeof State !== 'undefined') {
            State.pyqXpRewarded = (State.pyqXpRewarded && typeof State.pyqXpRewarded === 'object') ? State.pyqXpRewarded : {};
          }
          const alreadyRewarded = !!(
            st.attempts[qid] === true ||
            (typeof State !== 'undefined' && State.pyqXpRewarded && State.pyqXpRewarded[qid])
          );
          const isCorrect = oi === q.ans;
          PyqExplorer.sessionAnswers[qid] = oi;
          if (typeof recordPyqAttempt === 'function') {
            recordPyqAttempt(qid, isCorrect);
          }
          if (isCorrect) {
            if (!alreadyRewarded) {
              if (typeof State !== 'undefined' && State.pyqXpRewarded) {
                State.pyqXpRewarded[qid] = true;
              }
              PyqExplorer.sessionXpStatus[qid] = 'awarded';
              if (typeof addXP === 'function') {
                addXP(2, 'PYQ solved: ' + (q.sec || 'English'));
              }
            } else {
              PyqExplorer.sessionXpStatus[qid] = 'already-claimed';
            }
          }
          if (typeof saveState === 'function') saveState();
          const code = typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE ? String(ACTIVE_CODE).trim() : '';
          if (nativeFetch && !isStaticOnlyHostWithoutApiBase() && /^\d{6}$/.test(code)) {
            callVaaniApi('/api/pyq/solve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: code, qid: qid, selectedOption: oi })
            }).catch(function () {});
          }
          PyqExplorer.renderShell(shell);
        });
      });
      shell.querySelectorAll('[data-exp-bm]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const qid = btn.getAttribute('data-exp-bm');
          if (!qid || typeof toggleBookmark !== 'function') return;
          const key = (typeof State !== 'undefined' && Array.isArray(State.pyqBookmarks) && State.pyqBookmarks.includes(qid))
            ? qid
            : 'pyq:' + qid;
          toggleBookmark(key, btn);
          const code = typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE ? String(ACTIVE_CODE).trim() : '';
          if (nativeFetch && !isStaticOnlyHostWithoutApiBase() && /^\d{6}$/.test(code)) {
            callVaaniApi('/api/pyq/bookmark', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: code, qid: qid })
            }).catch(function () {});
          }
          PyqExplorer.renderShell(shell);
        });
      });
    }
  };

  function hookPyqRender() {
    if (typeof window.pvRender === 'function' && !window.pvRender.__vaaniDynamicWrapped) {
      const origPvRender = window.pvRender;
      const wrappedPvRender = function () {
        const res = origPvRender.apply(this, arguments);
        if (typeof PV !== 'undefined' && PV.screen === 'home') {
          PyqExplorer.mountIntoPyqHome();
        }
        return res;
      };
      wrappedPvRender.__vaaniDynamicWrapped = true;
      window.pvRender = wrappedPvRender;
    }
  }

  /* ============================================================
     6. GLOBAL & SERVICE-FORCE CADET COHORT STANDINGS
  ============================================================= */
  const CohortBoard = {
    force: 'all', // 'all' | 'army' | 'navy' | 'airforce'
    sort: 'xp',   // 'xp' | 'streak' | 'accuracy'
    mode: 'all',  // 'all' (Live + Benchmarks) | 'live' (Live Synced Cadets Only)
    query: '',
    rows: [],
    loading: false,

    fallbackRows() {
      const benchmarks = [
        { codeHint: '90••01', name: 'Aarav Rathore', xp: 4920, streak: 28, serviceForce: 'army', topicsCleared: 32, quizAvg: 91, avatar: 'AR', isCurrentCadet: false, isBenchmark: true, sourceLabel: 'ACADEMY BENCHMARK' },
        { codeHint: '90••02', name: 'Meera Nair', xp: 4380, streak: 24, serviceForce: 'airforce', topicsCleared: 30, quizAvg: 89, avatar: 'MN', isCurrentCadet: false, isBenchmark: true, sourceLabel: 'ACADEMY BENCHMARK' },
        { codeHint: '90••03', name: 'Vikramaditya Sen', xp: 3890, streak: 19, serviceForce: 'navy', topicsCleared: 28, quizAvg: 87, avatar: 'VS', isCurrentCadet: false, isBenchmark: true, sourceLabel: 'ACADEMY BENCHMARK' },
        { codeHint: '90••04', name: 'Kabir Shekhawat', xp: 3240, streak: 16, serviceForce: 'army', topicsCleared: 26, quizAvg: 84, avatar: 'KS', isCurrentCadet: false, isBenchmark: true, sourceLabel: 'ACADEMY BENCHMARK' },
        { codeHint: '90••05', name: 'Ananya Deshmukh', xp: 2780, streak: 15, serviceForce: 'airforce', topicsCleared: 24, quizAvg: 86, avatar: 'AD', isCurrentCadet: false, isBenchmark: true, sourceLabel: 'ACADEMY BENCHMARK' },
        { codeHint: '90••06', name: 'Rohan Chauhan', xp: 2150, streak: 12, serviceForce: 'navy', topicsCleared: 21, quizAvg: 82, avatar: 'RC', isCurrentCadet: false, isBenchmark: true, sourceLabel: 'ACADEMY BENCHMARK' }
      ];
      const base = this.mode === 'live' ? [] : benchmarks.slice();
      if (typeof State !== 'undefined') {
        const completed = typeof GRAMMAR !== 'undefined' ? GRAMMAR.filter(function (g) { return !!(State.completedTopics && State.completedTopics[g.id]); }).length : 0;
        const scores = Object.values(State.quizScores || {}).map(Number).filter(function (n) { return Number.isFinite(n); });
        const avg = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0;
        const code = typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE ? String(ACTIVE_CODE) : '';
        base.push({
          codeHint: code.length === 6 ? code.slice(0, 2) + '••' + code.slice(4) : 'LOCAL',
          name: State.name || 'Cadet',
          xp: Number(State.xp) || 0,
          streak: Number(State.streak) || 0,
          serviceForce: State.serviceForce || 'army',
          topicsCleared: completed,
          quizAvg: avg,
          avatar: String(State.name || 'CD').trim().split(/\s+/).slice(0, 2).map(function (s) { return (s[0] || 'C').toUpperCase(); }).join(''),
          isCurrentCadet: true,
          isBenchmark: false,
          sourceLabel: 'LIVE CADET'
        });
      }
      const q = this.query.trim().toLowerCase();
      let list = base.filter(function (r) {
        if (CohortBoard.force !== 'all' && r.serviceForce !== CohortBoard.force) return false;
        if (q) {
          const mName = String(r.name || '').toLowerCase().includes(q);
          const mCode = String(r.codeHint || '').toLowerCase().includes(q);
          if (!mName && !mCode) return false;
        }
        return true;
      });
      list.sort(function (a, b) {
        if (CohortBoard.sort === 'streak') return (b.streak - a.streak) || (b.xp - a.xp);
        if (CohortBoard.sort === 'accuracy') return (b.quizAvg - a.quizAvg) || (b.xp - a.xp);
        return (b.xp - a.xp) || (b.streak - a.streak);
      });
      return list.map(function (r, i) { return Object.assign({}, r, { rank: i + 1 }); });
    },

    async fetchStandings(manualSync) {
      const code = typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE ? String(ACTIVE_CODE) : '';
      if (!nativeFetch || isStaticOnlyHostWithoutApiBase()) {
        this.rows = this.fallbackRows();
        this.renderCard();
        return;
      }
      this.loading = true;
      this.renderCard();
      try {
        if (/^\d{6}$/.test(code)) {
          await VaaniSync.pushNow(!!manualSync);
          if (manualSync) {
            await callVaaniApi('/api/leaderboard/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: code,
                vaani: typeof State !== 'undefined' ? State : undefined
              })
            }).catch(function () {});
          }
        } else if (manualSync && typeof toast === 'function') {
          toast('Sign in with a 6-digit account code to synchronize your score.');
        }
        const url = '/api/leaderboard/global?force=' + encodeURIComponent(this.force) +
          '&sort=' + encodeURIComponent(this.sort) +
          '&mode=' + encodeURIComponent(this.mode) +
          '&q=' + encodeURIComponent(this.query) +
          '&code=' + encodeURIComponent(code);
        const res = await callVaaniApi(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data && Array.isArray(data.rows)) {
          this.rows = data.rows;
        } else {
          this.rows = this.fallbackRows();
        }
      } catch (_err) {
        this.rows = this.fallbackRows();
      } finally {
        this.loading = false;
        this.renderCard();
      }
    },

    mountCard() {
      const viewLb = document.getElementById('view-leaderboard');
      if (!viewLb) return;
      let card = document.getElementById('vaaniCohortCard');
      if (!card) {
        card = document.createElement('div');
        card.id = 'vaaniCohortCard';
        card.className = 'card service-card vaani-cohort-card';
        const serviceHero = viewLb.querySelector('.service-hero');
        if (serviceHero && serviceHero.nextSibling) {
          viewLb.insertBefore(card, serviceHero.nextSibling);
        } else {
          viewLb.appendChild(card);
        }
      }
      if (!this.rows.length && !this.loading) {
        this.fetchStandings(false);
      } else {
        this.renderCard();
      }
    },

    renderCard() {
      const card = document.getElementById('vaaniCohortCard');
      if (!card) return;
      const rows = this.rows.length || this.mode === 'live' || this.query ? this.rows : this.fallbackRows();
      const forceBadge = function (force) {
        if (force === 'navy') return '⚓ Navy';
        if (force === 'airforce') return '🦅 Air Force';
        return '⚔️ Army';
      };

      card.innerHTML =
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px">' +
          '<div>' +
            '<div class="panel-title"><span class="bar"></span>Global &amp; Service-Force Cadet Cohort Standings</div>' +
            '<p class="service-card-sub">Live server-synchronized Cadet accounts alongside clearly labeled Academy Benchmark targets. No fabricated user records.</p>' +
          '</div>' +
          '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">' +
            '<span class="pv-exp-badge" id="vaaniCohortSyncBadge">' + escHtml(VaaniSync.statusLabel()) + '</span>' +
            '<button type="button" class="vaani-bc-btn ' + (this.mode === 'live' ? 'is-active' : '') + '" id="vaaniCohortModeBtn">' +
              (this.mode === 'live' ? 'Showing: Live Cadets Only' : 'Showing: Live + Benchmarks') +
            '</button>' +
            '<button type="button" class="btn" style="padding:6px 12px;font-size:.78rem" id="vaaniCohortRefreshBtn" ' + (this.loading ? 'disabled' : '') + '>' +
              (this.loading ? 'Syncing Score…' : '↻ Sync My Score') +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="vaani-cohort-toolbar">' +
          '<div class="vaani-cohort-filters" role="group" aria-label="Filter standings by service force">' +
            [['all', 'All Forces'], ['army', 'Army'], ['navy', 'Navy'], ['airforce', 'Air Force']].map(function (pair) {
              const active = CohortBoard.force === pair[0];
              return '<button type="button" class="service-filter ' + (active ? 'active' : '') + '" data-cohort-force="' + pair[0] + '" aria-pressed="' + active + '">' + pair[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div class="vaani-cohort-controls">' +
            '<select id="vaaniCohortSort" aria-label="Sort standings">' +
              '<option value="xp"' + (this.sort === 'xp' ? ' selected' : '') + '>Sort by: XP</option>' +
              '<option value="streak"' + (this.sort === 'streak' ? ' selected' : '') + '>Sort by: Streak</option>' +
              '<option value="accuracy"' + (this.sort === 'accuracy' ? ' selected' : '') + '>Sort by: Accuracy</option>' +
            '</select>' +
            '<input id="vaaniCohortSearch" type="search" placeholder="Search Cadet name or ID…" value="' + escHtml(this.query) + '" aria-label="Search Cadet standings">' +
          '</div>' +
        '</div>' +
        '<div class="vaani-cohort-table">' +
          (rows.length
            ? rows.slice(0, 20).map(function (r) {
                return (
                  '<div class="vaani-cohort-row ' + (r.isCurrentCadet ? 'is-me' : '') + '">' +
                    '<div class="vaani-cohort-rank">#' + r.rank + '</div>' +
                    '<div class="vaani-cohort-avatar" aria-hidden="true">' + escHtml(r.avatar || 'CD') + '</div>' +
                    '<div class="vaani-cohort-main">' +
                      '<div class="vaani-cohort-name">' +
                        '<span>' + escHtml(r.name) + '</span>' +
                        (r.isCurrentCadet ? '<span class="pv-exp-badge solved-ok">YOU</span>' : '') +
                        (r.isBenchmark
                          ? '<span class="pv-exp-badge" title="Reference target for NDA/CDS preparation">ACADEMY BENCHMARK</span>'
                          : '<span class="pv-exp-badge solved-ok" title="Synchronized Cadet account">LIVE CADET · ' + escHtml(r.codeHint || '') + '</span>') +
                      '</div>' +
                      '<div class="vaani-cohort-sub">' + forceBadge(r.serviceForce) + ' · ' + (r.topicsCleared || 0) + '/35 topics cleared · ' + (r.quizAvg ? r.quizAvg + '% accuracy' : '0% accuracy') + '</div>' +
                    '</div>' +
                    '<div class="vaani-cohort-stats">' +
                      '<span>⭐ <b>' + r.xp + '</b> XP</span>' +
                      '<span>🔥 <b>' + (r.streak || 0) + '</b>d</span>' +
                      '<span>🎯 <b>' + (r.quizAvg || 0) + '%</b></span>' +
                    '</div>' +
                  '</div>'
                );
              }).join('')
            : '<div class="vaani-module-officer-banner">' +
                '<div class="vaani-mob-avatar" aria-hidden="true">' + renderOfficerRigSVG('guidance') + '</div>' +
                '<div>' +
                  '<div class="vaani-mob-kicker">OFFICER VAANI · COHORT STANDINGS</div>' +
                  '<h3 class="vaani-mob-title">No Cadet records match this filter.</h3>' +
                  '<p class="vaani-mob-desc">Click Sync My Score to publish your current account progress or include Academy Benchmark targets.</p>' +
                '</div>' +
                '<div>' +
                  '<button type="button" class="vaani-bc-btn" id="vaaniCohortEmptyResetBtn">Show All Standings</button>' +
                '</div>' +
              '</div>') +
        '</div>';

      card.querySelectorAll('[data-cohort-force]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          CohortBoard.force = btn.getAttribute('data-cohort-force') || 'all';
          CohortBoard.fetchStandings(false);
        });
      });
      const modeBtn = card.querySelector('#vaaniCohortModeBtn');
      if (modeBtn) {
        modeBtn.addEventListener('click', function () {
          CohortBoard.mode = CohortBoard.mode === 'live' ? 'all' : 'live';
          CohortBoard.fetchStandings(false);
        });
      }
      const sortSel = card.querySelector('#vaaniCohortSort');
      if (sortSel) {
        sortSel.addEventListener('change', function () {
          CohortBoard.sort = sortSel.value;
          CohortBoard.fetchStandings(false);
        });
      }
      const searchInp = card.querySelector('#vaaniCohortSearch');
      if (searchInp) {
        searchInp.addEventListener('input', function () {
          CohortBoard.query = searchInp.value;
          CohortBoard.fetchStandings(false);
        });
      }
      const refreshBtn = card.querySelector('#vaaniCohortRefreshBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
          CohortBoard.fetchStandings(true);
        });
      }
      const emptyReset = card.querySelector('#vaaniCohortEmptyResetBtn');
      if (emptyReset) {
        emptyReset.addEventListener('click', function () {
          CohortBoard.mode = 'all';
          CohortBoard.force = 'all';
          CohortBoard.query = '';
          CohortBoard.fetchStandings(false);
        });
      }
    }
  };

  function hookLeaderboardRender() {
    if (typeof window.renderLeaderboard === 'function' && !window.renderLeaderboard.__vaaniDynamicWrapped) {
      const origRenderLb = window.renderLeaderboard;
      const wrappedRenderLb = function () {
        const res = origRenderLb.apply(this, arguments);
        CohortBoard.mountCard();
        return res;
      };
      wrappedRenderLb.__vaaniDynamicWrapped = true;
      window.renderLeaderboard = wrappedRenderLb;
    }
  }

  /* ============================================================
     7. INITIALIZATION
  ============================================================= */
  function initDynamicEngine() {
    VaaniSync.ensureHeaderPill();
    ensureBreadcrumbBar();
    VaaniOfficerRig.mountHeroStage();
    VaaniOfficerRig.mountDockOverlay();
    VaaniOfficerRig.mountModuleBanners();
    updateDashboardQuickTileBadges();
    bindAccountAndStateHooks();
    bindNavigationAndTransitions();
    enhanceVocabGrid();
    hookPyqRender();
    hookLeaderboardRender();

    // Ensure dock overlay is also mounted if #vaaniMentor is created slightly later
    setTimeout(function () {
      VaaniOfficerRig.mountDockOverlay();
      updateDashboardQuickTileBadges();
    }, 650);

    if (typeof PV !== 'undefined' && PV.screen === 'home' && document.getElementById('pvApp')) {
      PyqExplorer.mountIntoPyqHome();
    }
    if (document.getElementById('view-leaderboard')) {
      CohortBoard.mountCard();
    }
    if (typeof ACTIVE_CODE !== 'undefined' && ACTIVE_CODE && /^\d{6}$/.test(String(ACTIVE_CODE))) {
      VaaniSync.schedulePush();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicEngine);
  } else {
    initDynamicEngine();
  }
})();
