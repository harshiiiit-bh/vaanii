import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('index.html', 'utf8').replace(/<!--[\\s\\S]*?-->/g, '');
const ids = [...html.matchAll(/\bid\s*=\s*(['"])(.*?)\1/g)].map((m) => m[2]);
const seen = new Set();
const duplicates = new Set();
for (const id of ids) {
  if (seen.has(id)) duplicates.add(id);
  seen.add(id);
}
if (duplicates.size) {
  console.error('Duplicate HTML IDs:', [...duplicates].join(', '));
  process.exitCode = 1;
} else {
  console.log('HTML IDs: unique');
}

const refs = [
  ...[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]),
  ...[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]),
];
const missing = refs
  .filter((ref) => !/^(?:[a-z]+:)?\/\//i.test(ref) && !/^(?:data:|#)/i.test(ref))
  .map((ref) => ref.split(/[?#]/, 1)[0].replace(/^\.\//, '').replace(/^\//, ''))
  .filter((ref) => ref && ref !== '...' && !existsSync(ref));
if (missing.length) {
  console.error('Missing local assets:', [...new Set(missing)].join(', '));
  process.exitCode = 1;
} else {
  console.log('Local script and stylesheet references: present');
}

// Guard against literal escaped characters leaking into the rendered page.
if (/\\n\s*<link\b/i.test(html)) {
  console.error('Escaped newline leaked into HTML markup near a stylesheet link');
  process.exitCode = 1;
} else {
  console.log('HTML markup: no escaped-newline leak near stylesheet links');
}
// Keep the supplied VAANI emblem consistent across page branding and icons.
const vaaniLogoUrl = 'https://gcdn.picsart.com/cloud-storage/139d6748-1bf1-4286-b8d6-03414b61deb6.png';
const vaaniFaviconHref = 'assets/vaani-emblem-favicon.png?v=20261001-circle2';
const requiredBrandingMarkup = [
  ['header logo', '<img class="vaani-brand-logo" src="' + vaaniLogoUrl + '"'],
  ['welcome logo', '<img class="gate-emblem-image" src="' + vaaniLogoUrl + '"'],
  ['browser tab PNG favicon', '<link rel="icon" type="image/png" sizes="32x32" href="' + vaaniFaviconHref + '">'],
  ['Apple touch icon', '<link rel="apple-touch-icon" href="' + vaaniLogoUrl + '">'],
  ['social preview image', '<meta property="og:image" content="' + vaaniLogoUrl + '">']
];
for (const [label, markup] of requiredBrandingMarkup) {
  if (!html.includes(markup)) {
    console.error('Branding asset missing or inconsistent:', label);
    process.exitCode = 1;
  }
}
if (!existsSync('assets/vaani-emblem-favicon.png')) {
  console.error('Local circular VAANI favicon asset is missing');
  process.exitCode = 1;
}
try {
  const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  if (!manifest.icons?.some(icon => icon.src === vaaniLogoUrl && icon.type === 'image/png')) {
    console.error('PWA manifest icon does not use the supplied VAANI emblem');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('PWA manifest is invalid:', error.message);
  process.exitCode = 1;
}
if (!html.includes('vaani-brand-emblem.css?v=20261001-circle1')) {
  console.error('VAANI emblem styling cache key is outdated');
  process.exitCode = 1;
}
if (html.includes('editing-temp/')) {
  console.error('Temporary image URL leaked into page branding');
  process.exitCode = 1;
}

// Account-code surfaces must use the active code and keep the mobile reveal responsive.
const accountCodeMarkup = [
  '<section class="card vp-account-code-card" id="vpAccountCodeCard" hidden',
  '<output class="vp-account-code-value" id="vpAccountCodeValue"',
  '<div class="mobile-account-code" id="mobileAccountCodeBar" hidden',
  '<button type="button" class="mobile-account-code-toggle" id="mobileAccountCodeToggle"',
  '<div class="mobile-account-code-panel" id="mobileAccountCodePanel" hidden',
  'onclick="toggleMobileAccountCode()"',
  'onclick="copyAccountCode()"'
];
for (const markup of accountCodeMarkup) {
  if (!html.includes(markup)) {
    console.error('Account-code UI markup missing:', markup);
    process.exitCode = 1;
  }
}
const accountCodeApp = readFileSync('js/app.js', 'utf8');
const accountCodeCss = readFileSync('vaani-profile.css', 'utf8');
for (const [label, marker] of [
  ['active-code reader', 'function currentAccountLoginCode()'],
  ['account-code UI refresh', 'function refreshAccountCodeControls()'],
  ['mobile reveal handler', 'function toggleMobileAccountCode()'],
  ['copy handler', 'async function copyAccountCode()']
]) {
  if (!accountCodeApp.includes(marker)) {
    console.error('Account-code behavior missing:', label);
    process.exitCode = 1;
  }
}
if (!accountCodeCss.includes('@media(max-width:767px)') ||
    !accountCodeCss.includes('.vp-account-code-card{display:none!important}') ||
    !accountCodeCss.includes('.mobile-account-code:not([hidden])')) {
  console.error('Account-code responsive profile/mobile layout is incomplete');
  process.exitCode = 1;
}
if (!html.includes('vaani-profile.css?v=20261003-profile-photo1') ||
    !html.includes('js/app.js?v=20261004-pyq-nav2')) {
  console.error('Account-code asset cache keys are outdated');
  process.exitCode = 1;
}

const notificationCss = readFileSync('vaani-defence-feed.css', 'utf8');
if (!/#view-notifications\s+\.nc-hero::before\s*\{[^}]*content\s*:\s*none\s*!important/i.test(notificationCss)) {
  console.error('Notifications hero is still exposed to the global header glass overlay');
  process.exitCode = 1;
} else {
  console.log('Notifications hero: global header overlay disabled');
}

function loadData(path, variable) {
  const source = readFileSync(path, 'utf8');
  const json = vm.runInNewContext(source + '\nJSON.stringify(' + variable + ')', Object.create(null), { timeout: 1000 });
  if (typeof json !== 'string') throw new Error(path + ': data did not serialize');
  return JSON.parse(json);
}
try {
  const grammar = loadData('data/grammar.js', 'GRAMMAR');
  const basics = loadData('data/grammar-basics.js', 'GRAMMAR_BASICS');
  const vocab = loadData('data/vocab.js', 'VOCAB');
  const grammarIds = new Set(grammar.map((item) => item.id));
  const basicIds = new Set(Object.keys(basics));
  const missingBasics = [...grammarIds].filter((id) => !basicIds.has(id));
  const orphanBasics = [...basicIds].filter((id) => !grammarIds.has(id));
  if (missingBasics.length || orphanBasics.length) throw new Error('Grammar basics mismatch. Missing: ' + missingBasics.join(', ') + '; unknown: ' + orphanBasics.join(', '));
  for (const item of grammar) {
    if (!item.id || !item.title || !item.desc || !Array.isArray(item.quiz)) throw new Error('Invalid grammar topic: ' + (item.id || 'unknown'));
    for (const [index, question] of item.quiz.entries()) {
      if (!question.q || !Array.isArray(question.opts) || question.opts.length < 2 || !Number.isInteger(question.ans) || question.ans < 0 || question.ans >= question.opts.length) throw new Error('Invalid grammar quiz answer: ' + item.id + ' question ' + (index + 1));
    }
  }
  for (const item of vocab) {
    for (const field of ['id', 'w', 'meanEn', 'meanHi', 'easy']) if (typeof item[field] !== 'string' || !item[field].trim()) throw new Error('Vocabulary entry missing ' + field + ': ' + (item.w || item.id || 'unknown'));
    if (!Array.isArray(item.quiz)) throw new Error('Vocabulary quiz must be an array: ' + item.w);
    for (const [index, question] of item.quiz.entries()) {
      if (!question.q || !Array.isArray(question.opts) || question.opts.length < 2 || !Number.isInteger(question.ans) || question.ans < 0 || question.ans >= question.opts.length) throw new Error('Invalid vocabulary quiz answer: ' + item.w + ' question ' + (index + 1));
    }
  }
  console.log('Learning data: ' + grammar.length + ' grammar topics, ' + vocab.length + ' vocabulary entries validated');

  const academyContext = Object.create(null);
  for (const path of ['data/grammar.js', 'data/grammar-basics.js', 'data/grammar-academy.js']) {
    vm.runInNewContext(readFileSync(path, 'utf8'), academyContext, { timeout: 2000 });
  }
  const academy = JSON.parse(vm.runInNewContext('JSON.stringify(GRAMMAR_ACADEMY)', academyContext));
  const academyTopics = academy && academy.topics;
  const academyCatalogIds = new Set(JSON.parse(vm.runInNewContext('JSON.stringify(GRAMMAR.map(topic => topic.id))', academyContext)));
  if (!Array.isArray(academyTopics) || academyTopics.length < 40) throw new Error('Advanced Grammar Academy curriculum is incomplete.');
  const academyIds = academyTopics.map(topic => topic.id);
  if (new Set(academyIds).size !== academyIds.length) throw new Error('Duplicate Grammar Academy topic IDs.');
  const requiredGrammar = ['sequence-of-tenses','reduced-relative-clauses','non-finite-verbs','modifier-placement','inversion','subjunctive','sentence-transformations'];
  for (const id of requiredGrammar) if (!academyIds.includes(id)) throw new Error('Grammar Academy is missing required topic: ' + id);
  const academyIdSet = new Set(academyIds);
  const assessmentIds = [];
  for (const topic of academyTopics) {
    if (!topic.legacyId || !academyCatalogIds.has(topic.legacyId)) throw new Error('Grammar Academy legacy mapping is broken: ' + topic.id);
    for (const prerequisite of topic.prerequisites || []) if (!academyIdSet.has(prerequisite)) throw new Error('Unknown Grammar Academy prerequisite: ' + topic.id + ' -> ' + prerequisite);
    if ((topic.assessments || []).length < 3) throw new Error('Grammar Academy topic lacks tiered checks: ' + topic.id);
    if (!topic.diagram || !topic.diagram.label || !topic.diagram.text || !Array.isArray(topic.diagram.steps) || topic.diagram.steps.length < 3) throw new Error('Grammar Academy diagram or text equivalent is missing: ' + topic.id);
    if (new Set(topic.sections.map(section => section.body)).size !== topic.sections.length) throw new Error('Grammar Academy repeats a lesson section: ' + topic.id);
    if (new Set(topic.examples.map(example => example.text)).size !== topic.examples.length) throw new Error('Grammar Academy repeats an example: ' + topic.id);
    const prompts = topic.assessments.map(item => item.prompt);
    if (new Set(prompts).size !== prompts.length) throw new Error('Grammar Academy repeats an assessment prompt: ' + topic.id);
    for (const item of topic.assessments) {
      assessmentIds.push(item.id);
      if (!item.prompt || !Array.isArray(item.options) || item.options.length < 3 || !Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.options.length ||
          new Set(item.options).size !== item.options.length || !Array.isArray(item.reasons) || item.reasons.length !== item.options.length || item.reasons.some(reason => String(reason).trim().length < 12) || item.provenance !== 'authored-practice') {
        throw new Error('Invalid Grammar Academy assessment or provenance: ' + item.id);
      }
    }
  }
  if (new Set(assessmentIds).size !== assessmentIds.length) throw new Error('Duplicate Grammar Academy assessment IDs.');
  const pageSource = readFileSync('index.html', 'utf8');
  if (!pageSource.includes('data/grammar-academy.js') || pageSource.indexOf('data/grammar-academy.js') > pageSource.indexOf('js/app.js')) {
    throw new Error('Grammar Academy data must load before the main app.');
  }
  console.log('Grammar Academy: ' + academyTopics.length + ' mapped lessons, tiered checks, prerequisites and authored provenance validated');
} catch (error) {
  console.error('Learning data validation failed:', error.message);
  process.exitCode = 1;
}

function contrastRatio(fg, bg) {
  function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map((v) => parseInt(v, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function token(css, selector, name) {
  const escaped = selector.replace(/\./g, '\\.').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
  const re = new RegExp(escaped + '\\s*\\{([^}]*)\\}', 'g');
  let match, value = null;
  while ((match = re.exec(css))) {
    const declarations = match[1].replace(/\/\*[\s\S]*?\*\//g, '');
    const found = declarations.match(new RegExp('(?:^|[;\\s])' + name + '\\s*:\\s*(#[0-9a-f]{6})\\b', 'i'));
    if (found) value = found[1];
  }
  return value;
}
function contrastAssert(label, fg, bg) {
  if (!fg || !bg || contrastRatio(fg, bg) < 4.5) {
    throw new Error(label + ' contrast below 4.5:1 (' + (fg && bg ? contrastRatio(fg, bg).toFixed(2) : 'missing token') + ')');
  }
}
try {
  const appCss = readFileSync('styles.css', 'utf8');
  const contrastCss = readFileSync('vaani-contrast.css', 'utf8');
  const themePairs = [
    { label: 'Light muted text', selector: ':root', bgSelector: ':root', fgToken: '--muted2', bgToken: '--bg' },
    { label: 'Dark muted text', selector: '[data-theme="dark"]', bgSelector: '[data-theme="dark"]', fgToken: '--muted2', bgToken: '--bg' },
    { label: 'Sepia muted text', selector: 'body.mode-sepia', bgSelector: 'body.mode-sepia', fgToken: '--muted2', bgToken: '--bg' },
    { label: 'Dashboard muted text', selector: '#view-dashboard', bgSelector: '#view-dashboard', fgToken: '--muted2', bgToken: '--panel' },
    { label: 'Grammar locked text', selector: '.gt-root', bgSelector: '.gt-root', fgToken: '--gt-muted2', bgToken: '--gt-bg0' }
  ];
  for (const pair of themePairs) {
    contrastAssert(pair.label, token(contrastCss, pair.selector, pair.fgToken), token(appCss, pair.bgSelector, pair.bgToken));
  }
  if (!/#view-dashboard\s*\{[^}]*color:\s*var\(--text\)/s.test(contrastCss)) throw new Error('Dashboard does not apply its scoped text color.');
  if (!/\.gj-node\.locked\s*\{[^}]*opacity:\s*1/s.test(contrastCss)) throw new Error('Grammar Journey locked nodes still fade their text.');
  const ink = { light: '#16212e', dark: '#e9ecef' };
  const onInk = { light: token(contrastCss, ':root', '--vx-on-ink'), dark: token(contrastCss, '[data-theme="dark"]', '--vx-on-ink') };
  contrastAssert('Arena selected control (light)', onInk.light, ink.light);
  contrastAssert('Arena selected control (dark)', onInk.dark, ink.dark);
  contrastAssert('Arena positive status', token(contrastCss, ':root', '--vx-on-ok'), '#2e8f63');
  contrastAssert('Arena positive status (dark)', token(contrastCss, ':root', '--vx-on-ok'), '#49d186');
  console.log('Contrast checks: dashboard, muted theme text, Grammar Journey and Arena controls validated');
} catch (error) {
  console.error('Contrast validation failed:', error.message);
  process.exitCode = 1;
}

/* PYQ manifest, answer-index, taxonomy and target-word regression audit. */
try {
  const manifestContext = Object.create(null);
  vm.runInNewContext(readFileSync('data/pyq/manifest.js', 'utf8'), manifestContext, { timeout: 1000 });
  const paperNames = manifestContext.PYQ_PAPER_FILES;
  if (!Array.isArray(paperNames) || !paperNames.length) throw new Error('PYQ manifest is missing or empty.');

  const taxonomyContext = { window: {} };
  vm.runInNewContext(readFileSync('js/vaani-pyq-taxonomy.js', 'utf8'), taxonomyContext, { timeout: 1000 });
  const taxonomy = taxonomyContext.window.VaaniPyqTaxonomy;
  if (!taxonomy || typeof taxonomy.topic !== 'function' || typeof taxonomy.keyword !== 'function') throw new Error('PYQ taxonomy helper is missing.');

  const ids = new Set();
  const topicCounts = new Map();
  const topicIssues = [], directionIssues = [], targetWordIssues = [];
  let questionCount = 0;
  for (const filename of paperNames) {
    const path = 'data/pyq/' + filename + '.js';
    if (!existsSync(path)) throw new Error('PYQ manifest points to a missing paper: ' + path);
    const context = Object.create(null);
    vm.runInNewContext(readFileSync(path, 'utf8'), context, { timeout: 1500 });
    const variable = Object.keys(context).find((key) => /^PYQ_(?:(?:CDS|AFCAT)_)?\d{4}_(?:I|II)$/.test(key));
    if (!variable || !Array.isArray(context[variable])) throw new Error('No PYQ question array found in ' + path);
    const exam = filename.startsWith('cds-') ? 'CDS' : filename.startsWith('afcat-') ? 'AFCAT' : 'NDA';
    for (const [index, q] of context[variable].entries()) {
      const at = path + ' question ' + (q && q.n ? q.n : index + 1);
      if (!q || typeof q.q !== 'string' || !q.q.trim() || !Array.isArray(q.o) || q.o.length < 2 || !Number.isInteger(q.ans) || q.ans < 0 || q.ans >= q.o.length) {
        throw new Error('Invalid question or answer index: ' + at);
      }
      if (typeof q.sec !== 'string' || !q.sec.trim()) throw new Error('Missing topic tag: ' + at);
      if (String(q.sec).trim().toLowerCase() === 'spotting errors') {
        if (q.o.length !== 4) throw new Error('Spotting Errors must expose four choices (a–d): ' + at);
        const explicitParts = Array.isArray(q.parts) && q.parts.length === 3 &&
          q.parts.every(part => typeof part === 'string' && part.trim());
        const normalizeSegmentText = value => String(value).toLocaleLowerCase()
          .replace(/[“”‘’]/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
        const reconstructablePrompt = explicitParts
          ? String(q.q).replace(/\s*\|\s*no\s+error\.?\s*$/i, '')
          : q.q;
        if (explicitParts && normalizeSegmentText(q.parts.join(' ')) !== normalizeSegmentText(reconstructablePrompt)) {
          throw new Error('Spotting Errors parts do not reconstruct the sentence: ' + at);
        }
        const inlineLabels = [...q.q.matchAll(/\(([abc])\)/gi)].map(match => match[1].toLowerCase()).slice(0, 3);
        const hasInlineLabels = inlineLabels.join('') === 'abc';
        const pipeParts = q.q.split(/\s*\|\s*/).map(part => part.trim()).filter(Boolean);
        const hasPipeParts = pipeParts.length === 3 || (pipeParts.length === 4 && /^no\s+error\.?$/i.test(pipeParts[3]));
        let optionCursor = 0;
        const optionParts = q.o.slice(0, 3).map(option => String(option).trim());
        const hasChoiceParts = optionParts.length === 3 && optionParts.every(phrase => {
          if (phrase.length <= 2 || /^\(?[abc]\)?\.?$/i.test(phrase)) return false;
          const index = q.q.toLocaleLowerCase().indexOf(phrase.toLocaleLowerCase(), optionCursor);
          if (index < 0) return false;
          optionCursor = index + phrase.length;
          return true;
        });
        if (!explicitParts && !hasInlineLabels && !hasPipeParts && !hasChoiceParts) {
          throw new Error('Spotting Errors prompt has no identifiable (a)/(b)/(c) segments: ' + at);
        }
      }
      const id = exam + '-' + q.y + '-' + q.s + '-' + q.n;
      if (ids.has(id)) throw new Error('Duplicate PYQ question ID: ' + id);
      ids.add(id);
      const tag = taxonomy.topic({ ...q, _exam: exam });
      if (!tag || tag === 'Grammar' || tag === 'Grammar (Mixed)') topicIssues.push(at + ' (' + q.sec + ')');
      if (tag) topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
      const prompt = q.q.toLocaleLowerCase();
      const asksAntonym = /\b(?:antonym|opposite in meaning|opposite meaning)\b/.test(prompt);
      const asksSynonym = /\b(?:synonym|similar in meaning|same in meaning)\b/.test(prompt);
      if (asksAntonym && !asksSynonym && tag !== 'Antonyms') directionIssues.push('antonym tagged ' + tag + ': ' + at);
      if (asksSynonym && !asksAntonym && tag !== 'Synonyms') directionIssues.push('synonym tagged ' + tag + ': ' + at);
      if (q.sec === 'Synonyms' || q.sec === 'Antonyms' || tag === 'Synonyms' || tag === 'Antonyms') {
        const keyword = taxonomy.keyword(q);
        if (!keyword || !prompt.includes(keyword.toLocaleLowerCase())) {
          targetWordIssues.push(at);
        }
      }
    }
    questionCount += context[variable].length;
  }
  if (topicIssues.length || directionIssues.length || targetWordIssues.length) {
    const summary = [];
    if (topicIssues.length) summary.push('unresolved topics (' + topicIssues.length + '): ' + topicIssues.slice(0, 12).join(', '));
    if (directionIssues.length) summary.push('wrong question-type tags (' + directionIssues.length + '): ' + directionIssues.slice(0, 12).join(', '));
    if (targetWordIssues.length) summary.push('missing target words (' + targetWordIssues.length + '): ' + targetWordIssues.slice(0, 30).join(', '));
    throw new Error(summary.join(' | '));
  }
  const forbidden = ['Comprehension', 'Word Classes', 'Parts of Speech', 'Active and Passive Voice', 'Active/Passive Voice', 'Homonyms/Homophones', 'Homophones'];
  for (const label of forbidden) if (topicCounts.has(label)) throw new Error('Duplicate/legacy topic label remains: ' + label);
  console.log('PYQ audit: ' + paperNames.length + ' papers, ' + questionCount + ' questions, ' + topicCounts.size + ' normalized topics validated');
} catch (error) {
  console.error('PYQ audit failed:', error.message);
  process.exitCode = 1;
}

/* Grammar navigation and creator-credit regression checks. */
try {
  const appSource = readFileSync('js/app.js', 'utf8');
  const pageSource = readFileSync('index.html', 'utf8');
  const grammarContext = Object.create(null);
  for (const path of ['data/grammar.js', 'data/grammar-basics.js', 'data/grammar-academy.js']) {
    vm.runInNewContext(readFileSync(path, 'utf8'), grammarContext, { timeout: 2000 });
  }
  const grammar = JSON.parse(vm.runInNewContext('JSON.stringify(GRAMMAR)', grammarContext));
  const tierMatch = appSource.match(/const SKILL_TIERS\s*=\s*(\[[\s\S]*?\]);/);
  if (!tierMatch) throw new Error('Grammar curriculum tiers are missing.');
  const tiers = vm.runInNewContext('(' + tierMatch[1] + ')', Object.create(null), { timeout: 1000 });
  const tierIds = tiers.flatMap((tier) => tier.ids);
  const grammarIds = grammar.map((topic) => topic.id);
  const duplicates = tierIds.filter((id, index) => tierIds.indexOf(id) !== index);
  const missing = grammarIds.filter((id) => !tierIds.includes(id));
  const unknown = tierIds.filter((id) => !grammarIds.includes(id));
  if (duplicates.length || missing.length || unknown.length) {
    throw new Error('Grammar tier coverage mismatch. Duplicate: ' + duplicates.join(', ') + '; missing: ' + missing.join(', ') + '; unknown: ' + unknown.join(', '));
  }
  for (const required of ['function gtTopicBrowserHTML(', 'function gtApplyBrowserFilters(', 'function renderGrammarJourney()']) {
    if (!appSource.includes(required)) throw new Error('Grammar UI component missing: ' + required);
  }
  if (!/<link\b[^>]*\bhref="vaani-grammar-ux\.css(?:\?[^"]*)?"/i.test(pageSource)) throw new Error('Grammar UX stylesheet is not linked.');
  if (pageSource.indexOf('js/vaani-grammar-academy.js') > pageSource.indexOf('js/app.js')) throw new Error('Grammar Academy interactions must load before the main app.');
  if (!pageSource.includes('data/grammar-academy.js') || pageSource.indexOf('data/grammar-academy.js') > pageSource.indexOf('js/app.js')) throw new Error('Grammar Academy curriculum must load before the main app.');
  const academyUi = readFileSync('js/vaani-grammar-academy.js', 'utf8');
  const academyCss = readFileSync('vaani-grammar-ux.css', 'utf8');
  for (const required of ['Academy.analyzeSentence', 'Academy.getMixedQuestions', 'Academy.getAdaptiveItems']) {
    if (!academyUi.includes(required)) throw new Error('Grammar Academy interaction missing: ' + required);
  }
  for (const required of ['.ga-catalog', '.ga-analysis-output', ':focus-visible', '@media(max-width:520px)', '@media(prefers-reduced-motion:reduce)']) {
    if (!academyCss.includes(required)) throw new Error('Grammar Academy accessibility/responsive styling missing: ' + required);
  }
  if (!pageSource.includes('Designed and developed by</span><strong>Harshit Chaubey</strong>')) throw new Error('Site-wide creator credit is missing.');
  console.log('Grammar UX: ' + grammarIds.length + ' topics covered by the navigation tiers; browser, journey, styles and creator credit present');
} catch (error) {
  console.error('Grammar UX validation failed:', error.message);
  process.exitCode = 1;
}

/* Site refresh: comparison bank, daily rotation, section wiring and removed drill. */
try {
  const appSource = readFileSync('js/app.js', 'utf8');
  const pageSource = readFileSync('index.html', 'utf8');
  const arenaSource = readFileSync('js/vaani-arena.js', 'utf8');
  const siteCss = readFileSync('vaani-site-refresh.css', 'utf8');
  const extrasContext = { window: {} };
  vm.runInNewContext(readFileSync('data/comparisons-extra.js', 'utf8'), extrasContext, { timeout: 1500 });
  const extras = extrasContext.window.VAANI_COMPARISON_EXTRA;
  if (!Array.isArray(extras) || extras.length !== 72) throw new Error('Expected 72 curated additional comparison pairs.');
  if (
    arenaSource.includes('A.supabaseAdapter') ||
    pageSource.includes('useSync(VX.arena.supabaseAdapter') ||
    /(?:\.from\(['"]arena_scores['"]\)|\/rest\/v1\/arena_scores)[\s\S]{0,900}(?:\.insert\(|\.upsert\(|\.update\(|\.delete\(|method:\s*['"](?:POST|PUT|PATCH|DELETE)['"])/i.test(arenaSource)
  ) {
    throw new Error('Arena direct browser score writes are still enabled.');
  }
  if (!arenaSource.includes('var LocalAdapter') || !arenaSource.includes('var live = false') && !arenaSource.includes('live: false')) {
    throw new Error('Arena local-first adapter is missing.');
  }

  const start = appSource.indexOf('const COMPARISONS = [');
  const end = appSource.indexOf('\n].concat(Array.isArray(window.VAANI_COMPARISON_EXTRA)', start);
  if (start < 0 || end < 0) throw new Error('Comparison bank is not connected to the extra comparison data.');
  const base = ['who-whom', 'its-its-apostrophe', 'affect-effect'];
  for (const id of base) if (!appSource.includes("id:'" + id + "'") && !appSource.includes('id:"' + id + '"')) throw new Error('Original comparison was lost: ' + id);
  const ids = new Set(base);
  for (const [index, pair] of extras.entries()) {
    const at = 'additional comparison #' + (index + 1);
    for (const field of ['id', 'a', 'b', 'group', 'meanA', 'meanB', 'rule', 'trick', 'officerTip']) {
      if (typeof pair[field] !== 'string' || !pair[field].trim()) throw new Error(at + ' is missing ' + field);
    }
    if (ids.has(pair.id)) throw new Error('Duplicate comparison ID: ' + pair.id);
    ids.add(pair.id);
    if (!Array.isArray(pair.examples) || !pair.examples.length || !Array.isArray(pair.exceptions) || !pair.exceptions.length) throw new Error(at + ' needs examples and a usage note.');
    if (!Array.isArray(pair.pyq) || !pair.pyq.length) throw new Error(at + ' needs a practice question.');
    for (const [qIndex, q] of pair.pyq.entries()) {
      if (!q.q || !Array.isArray(q.opts) || q.opts.length < 2 || !Number.isInteger(q.ans) || q.ans < 0 || q.ans >= q.opts.length) {
        throw new Error(at + ' has an invalid practice question #' + (qIndex + 1));
      }
      if (q.pyq === true) throw new Error(at + ' incorrectly labels authored practice as an official PYQ.');
    }
  }
  if (ids.size !== 75) throw new Error('Expected 75 comparisons total, found ' + ids.size + '.');
  if (!pageSource.includes('data/comparisons-extra.js') || pageSource.indexOf('data/comparisons-extra.js') > pageSource.indexOf('js/app.js')) {
    throw new Error('Additional comparisons must load before the main app.');
  }
  if (!/<link\b[^>]*\bhref="vaani-site-refresh\.css(?:\?[^"]*)?"/i.test(pageSource)) throw new Error('Site refresh stylesheet is not linked.');
  if (pageSource.includes('id="flashCard"') || pageSource.includes('Flashcard Drill') || pageSource.includes('data-route="flashcards"')) throw new Error('The Vocabulary Flashcard Drill UI is still present.');
  for (const id of ['vpProfileAvatar', 'vpOverviewStats', 'vpActivityList', 'vpFocusMission', 'vpSkillSignals', 'vpRhythmGrid', 'serviceMetrics', 'serviceWeekWrap', 'serviceSkillSignals', 'serviceGoalList', 'fieldLogFilters', 'compareFilters', 'compareResultCount', 'dailyShuffleBtn']) {
    if (!pageSource.includes('id="' + id + '"')) throw new Error('Missing redesigned UI container: ' + id);
  }
  for (const required of ['function pickDaily(', 'getDailyRotationSalt(', 'vaani_daily_rotation_salt_v1', 'recentIds.add(id)', 'function renderProfileSnapshot(', 'function compareGroupOf(', 'let serviceBadgeFilter=', 'rawQuestions =']) {
    if (!appSource.includes(required)) throw new Error('Site refresh behavior missing: ' + required);
  }
  for (const required of ['vx-home-metrics', 'vx-mode-grid', 'vx-arena-brief', 'vx-board-summary', 'vx-board-heading']) {
    if (!arenaSource.includes(required)) throw new Error('Arena refresh markup missing: ' + required);
  }
  const allRefreshCss = siteCss;
  for (const required of ['.cmp-hero', '.vp-profile-hero', '.service-hero', '.vx-home-metrics', '.vx-mode-grid', '.service-signal-grid', '.vp-focus-grid', '.daily-refresh-btn']) {
    if (!allRefreshCss.includes(required)) throw new Error('Site refresh styles missing: ' + required);
  }
  console.log('Site refresh: ' + ids.size + ' comparisons, daily rotation, randomized drills, richer Arena/Profile/Service Record and removed Flashcard Drill validated');
} catch (error) {
  console.error('Site refresh validation failed:', error.message);
  process.exitCode = 1;
}


/* Book Reading and cross-module vocabulary integration checks. */
try {
  const appSource = readFileSync('js/app.js', 'utf8');
  const pageSource = readFileSync('index.html', 'utf8');
  const librarySource = readFileSync('js/library.js', 'utf8');
  const bookCss = readFileSync('vaani-bookreading.css', 'utf8');
  const readmeSource = readFileSync('README.md', 'utf8');
  for (const required of [
    'window.VaaniBookRegister.add=addVaaniCaptureToRegister',
    'function filterVbvRegister()',
    'function renderHomeCommandCenter()',
    'function filterLibraryBooks()',
    'function sortLibraryBooks(mode)',
    'vbv-book-jumpbar'
  ]) {
    if (!librarySource.includes(required)) throw new Error('Book Reading feature is missing: ' + required);
  }
  for (const required of [
    'function addVaaniItemToBookRegister(',
    'function makeBookRegisterButton(',
    'function openCompare(id){',
    'Save to Book Register'
  ]) {
    if (!appSource.includes(required)) throw new Error('VAANI → Book Register link is missing: ' + required);
  }
  for (const id of ['dashWordToBook', 'wdAddToBookRegister']) {
    if (!pageSource.includes('id="' + id + '"')) throw new Error('Missing one-click capture control: ' + id);
  }
  if (pageSource.includes('data-route="flashcards"') || librarySource.includes('flashcards: renderFlashcardsHome') ||
      librarySource.includes('function renderFlashcardsHome(') || librarySource.includes('Review Flashcards')) {
    throw new Error('The removed flashcard drill is still wired into Book Reading.');
  }
  for (const required of ['.vbv-command-center', '.vbv-register-capture', '.vbv-library-toolbar', '.vbv-book-jumpbar']) {
    if (!bookCss.includes(required)) throw new Error('Book Reading styling is missing: ' + required);
  }
  for (const heading of ['## What’s inside', '## Run locally', '## Deploy with GitHub Pages', '## Data and privacy', '## Content files', '## Check changes']) {
    if (!readmeSource.includes(heading)) throw new Error('README guide section is missing: ' + heading);
  }
  console.log('Book Reading: unified register, one-click capture, searchable library, reading desk navigation, responsive styles and concise README validated');
} catch (error) {
  console.error('Book Reading validation failed:', error.message);
  process.exitCode = 1;
}




/* Feature release briefing + Information Centre sync audit. */
try {
  const infoSource=readFileSync('js/vaani-info-center.js','utf8');
  const officerSource=readFileSync('js/vaani-character-elite.js','utf8');
  const infoCss=readFileSync('vaani-info-center.css','utf8');
  const officerCss=readFileSync('vaani-character-elite.css','utf8');
  const pageSource=readFileSync('index.html','utf8');
  try { new Function(infoSource); } catch(error){ throw new Error('Info Centre JavaScript syntax is invalid: '+error.message); }
  try { new Function(officerSource); } catch(error){ throw new Error('Officer VAANI JavaScript syntax is invalid: '+error.message); }

  for(const marker of [
    'FEATURE_RELEASES',
    'INFO_TOUR_VERSION=FEATURE_RELEASES[0].version',
    'LATEST_RELEASE',
    'renderReleaseHistoryHTML',
    'VAANI_FEATURE_RELEASES',
    'VAANI_LATEST_FEATURE_RELEASE',
    'window.replayVaaniFeatureBriefing',
    'window.markVaaniFeatureUpdateRead',
    'window.refreshVaaniFeatureUpdateIndicator',
    'featureBriefingPending',
    'featureUpdateIsUnread',
    'syncInfoUpdateIndicator',
    'markLatestFeatureRead',
    'bindReleaseActions',
    'vi-release-read-btn',
    'info-update-badge'
  ]) {
    if(!infoSource.includes(marker))throw new Error('Feature release manifest integration missing: '+marker);
  }
  const versions=[...infoSource.matchAll(/version:'([^']+)'/g)].map(match=>match[1]);
  if(versions.length<3)throw new Error('Feature release manifest is unexpectedly small: '+versions.length+' release(s).');
  if(new Set(versions).size!==versions.length)throw new Error('Duplicate feature release version detected.');
  if(!infoSource.includes('NEW UPDATE · Officer briefing pending') || !infoSource.includes('UPDATE SEEN · replay anytime')) {
    throw new Error('Release unread/seen status copy is missing.');
  }
  if(!infoSource.includes("window.openInfoCenter=function(options)")) {
    throw new Error('Information Centre options API is missing.');
  }
  if(!infoSource.includes("if(opts.markRead)markLatestFeatureRead();")) {
    throw new Error('Explicit mark-read path is missing.');
  }
  for(const field of ['category:', 'scope:', 'impact:']) {
    const count=(infoSource.match(new RegExp(field,'g'))||[]).length;
    if(count!==versions.length)throw new Error('Release metadata is incomplete for '+field+' ('+count+'/'+versions.length+').');
  }

  if(!infoSource.includes('VAANI_FEATURE_UPDATE_BRIEFING'))throw new Error('First-login briefing bridge is missing.');
  if(!officerSource.includes('window.VAANI_FEATURE_UPDATE_BRIEFING=function(release)'))throw new Error('Officer VAANI feature-briefing handler is missing.');
  if(!officerSource.includes("new CustomEvent('vaani:feature-update'"))throw new Error('Feature update briefing event is missing.');
  if(!officerSource.includes('open(12000)')||!officerSource.includes('feature-update'))throw new Error('Elevated Officer release briefing presentation is missing.');
  for(const marker of ['mountFeatureUpdateAction','veFeatureNotes','openInfoCenter({markRead:true})']) {
    if(!officerSource.includes(marker))throw new Error('Officer release-notes action is missing: '+marker);
  }

  for(const marker of [
    '.vi-release-card',
    '.vi-release-card.is-latest',
    '.vi-release-new',
    '.vi-release-hero',
    '.vi-release-count',
    '.vi-release-meta',
    '.vi-release-actions',
    '.vi-release-read-btn'
  ]) {
    if(!infoCss.includes(marker))throw new Error('Information Centre release-note styling missing: '+marker);
  }
  for(const marker of ['#vaaniMentor.feature-update', '.vc-quote{', 'FEATURE RELEASE BRIEFING', '#veFeatureNotes']) {
    if(!officerCss.includes(marker))throw new Error('Officer feature-briefing styling missing: '+marker);
  }
  if(!pageSource.includes('vaani-info-center.css?v=20261003-release3'))throw new Error('Info Centre cache key was not refreshed.');
  if(!pageSource.includes('js/vaani-info-center.js?v=20261004-release7'))throw new Error('Info Centre script cache key was not refreshed.');
  if(!pageSource.includes('vaani-character-elite.css?v=20261003-release3'))throw new Error('Officer elite CSS cache key was not refreshed.');
  if(!pageSource.includes('js/vaani-character-elite.js?v=20261003-release4'))throw new Error('Officer elite script cache key was not refreshed.');
  console.log('Feature updates: shared manifest, duplicate/version audit, bounded Officer retry, replay controls, release metadata, elevated briefing UI and cache keys validated');
}catch(error){console.error('Feature release audit failed:',error.message);process.exitCode=1;}

/* Profile picture + Arena avatar integrity audit. */
try {
  const appSource=readFileSync('js/app.js','utf8');
  const arenaSource=readFileSync('js/vaani-arena.js','utf8');
  const profileCss=readFileSync('vaani-profile.css','utf8');
  const arenaCss=readFileSync('vaani-arena-briefing.css','utf8');
  const indexSource=readFileSync('index.html','utf8');
  for(const marker of ['profilePhoto:{src:', 'normalizeProfilePhoto', 'ensureProfilePhotoEditor', 'openProfilePhotoEditor', 'bakeProfileCrop', 'Drop image here', 'Image link']) {
    if(!appSource.includes(marker))throw new Error('Profile picture capability missing: '+marker);
  }
  for(const marker of ['class="vp-profile-avatar"', 'onclick="openProfilePhotoEditor()"']) {
    if(!indexSource.includes(marker))throw new Error('Profile picture entry point missing: '+marker);
  }
  for(const marker of ['.vp-profile-avatar{','.vp-photo-editor','.vp-photo-crop-guide','.vp-photo-dropzone']) {
    if(!profileCss.includes(marker))throw new Error('Profile picture styling missing: '+marker);
  }
  for(const marker of ['profileAvatarSnapshot','hostAvatarSnapshot','arenaAvatarHtml','&av=','hostAvatar:profileAvatarSnapshot()','avatar:profileAvatarSnapshot()']) {
    if(!arenaSource.includes(marker))throw new Error('Arena avatar integration missing: '+marker);
  }
  for(const marker of ['.vx-host-avatar img','.vx-championship-avatar img','.vx-championship-podium-avatar img']) {
    if(!arenaCss.includes(marker))throw new Error('Arena avatar styling missing: '+marker);
  }
  console.log('Profile pictures: device upload, drag/drop, image-link input, circular crop controls, account persistence, Arena host identity and leaderboard avatar integration validated');
}catch(error){console.error('Profile picture audit failed:',error.message);process.exitCode=1;}

/* Academy redesign and retired Book Reading shortcuts. */
try {
  const librarySource = readFileSync('js/library.js', 'utf8');
  const pageSource = readFileSync('index.html', 'utf8');
  const academyCss = readFileSync('styles-vbv.css', 'utf8');
  const navStart = pageSource.indexOf('<nav class="mainnav" id="vbv-mainnav">');
  const navEnd = pageSource.indexOf('</nav>', navStart);
  const bookNav = navStart >= 0 && navEnd >= 0 ? pageSource.slice(navStart, navEnd) : '';
  const homeStart = librarySource.indexOf('function renderHomeCommandCenter(){');
  const homeEnd = librarySource.indexOf('\nfunction ', homeStart + 10);
  const homeTools = homeStart >= 0 && homeEnd >= 0 ? librarySource.slice(homeStart, homeEnd) : '';
  const academyStart = librarySource.indexOf('function renderAcademy(){');
  // Source is checked out with CRLF on Windows, so find the stable comment
  // marker itself instead of relying on a particular newline sequence.
  const academyEnd = librarySource.indexOf('/* ================= EFFICIENCY:', academyStart);
  const academy = academyStart >= 0 && academyEnd >= 0 ? librarySource.slice(academyStart, academyEnd) : '';
  if (bookNav.includes('data-route="levels"') || bookNav.includes('data-route="spoken"')) throw new Error('Removed Levels/Spoken English links remain in Book Reading navigation.');
  if (homeTools.includes('#/levels') || homeTools.includes('#/spoken') || homeTools.includes('English levels') || homeTools.includes('Spoken English')) throw new Error('Removed Levels/Spoken English shortcuts remain on Book Reading home.');
  if (librarySource.includes('  levels: vbvRenderLevels,') || librarySource.includes('  spoken: renderSpoken,')) throw new Error('Retired Levels/Spoken routes remain active.');
  for (const required of ['academy-hero', 'Four academies.', 'National Defence Academy', 'Indian Military Academy', 'Air Force Academy', 'Indian Naval Academy', 'academy-grid', 'academy-fieldnote', 'Photo source ↗']) {
    if (!academy.includes(required)) throw new Error('Academy redesign missing required content: ' + required);
  }
  for (const required of ['.academy-hero', '.academy-grid', '.academy-card-photo', '.academy-fieldnote', '@media(max-width:760px)']) {
    if (!academyCss.includes(required)) throw new Error('Academy responsive styling missing: ' + required);
  }
  console.log('Academy: four-academy image gallery, attributions, responsive styling and retired Book Reading links validated');
} catch (error) {
  console.error('Academy validation failed:', error.message);
  process.exitCode = 1;
}

/* PYQ presentation compatibility audit. */
try {
  const pyqApp=readFileSync('js/app.js','utf8');
  const pyqCss=readFileSync('vaani-pyq-polish.css','utf8');
  if(!pyqApp.includes('function pyqSpottingParts(')||!pyqApp.includes('function pyqSpottingFormat(')||!pyqApp.includes('function pyqLabeledBlocks(')||!pyqApp.includes('function pyqPromptHTML(')) throw new Error('PYQ structured renderer helpers are missing.');
  if(!pyqApp.includes('<div class="pv-topic-group-list" id="pvTopicGrid">')||!pyqApp.includes('<div class="pv-topic-grid pv-topic-subgrid">')) throw new Error('PYQ outer group list must be separate from the inner skill-card grid.');
  if(!/#view-pyq \.pv-topic-group-list\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/s.test(pyqCss)) throw new Error('PYQ group list must use a full-width single-column layout.');
  const ctx=Object.create(null); vm.runInNewContext(readFileSync('data/pyq/manifest.js','utf8'),ctx,{timeout:1000});
  const paperNames=ctx.PYQ_PAPER_FILES;
  const renderableSpot=q=>{
    if(Array.isArray(q.parts)&&(q.parts.length===3||q.parts.length===4)&&q.parts.every(x=>typeof x==='string'&&x.trim()))return true;
    if(/\s\|\s/.test(String(q.q||''))){const p=String(q.q).split(/\s*\|\s*/).map(x=>x.trim()).filter(Boolean);if(p.length===3||(p.length===4&&/^no\s+error\.?$/i.test(p[3])))return true;}
    if(/\(a\).*\(b\).*\(c\)/i.test(String(q.q||'')))return true;
    const o=Array.isArray(q.o)?q.o.slice(0,3).map(x=>String(x||'').trim()):[];
    return o.length===3&&o.every(x=>x.length>2&&!/error in part/i.test(x));
  };
  const hasLabeledBlocks=q=>{
    const text=String(q.q||'');
    const inline=[...text.matchAll(/\(([PQRS])\)\s*\/?\s*/g)].length;
    const prefix=[...text.matchAll(/(?:^|\n|\s|[\/\|]\s*)(S1|S2|S3|S6|P|Q|R|S)\s*[\.:]\s*/g)].length;
    const sec=String(q.sec||'').trim().toLowerCase();
    if(sec==='sentence arrangement (pqrs)')return inline>=4||prefix>=4;
    if(sec==='ordering of sentences')return prefix>=6||(['P','Q','R','S'].every(label=>new RegExp('(?:^|[\\s:/|])'+label+'\\s*[:.]').test(text)));
    if(sec==='choose the correct usage')return prefix>=3;
    return true;
  };
  let total=0,spotting=0,spottingBad=[],wordClass=0,wordClassBad=[],structured=0,structuredBad=[],reading=0,readingBad=[];
  for(const filename of paperNames){
    const path='data/pyq/'+filename+'.js';if(!existsSync(path))throw new Error('PYQ manifest points to missing paper: '+path);
    const c=Object.create(null);vm.runInNewContext(readFileSync(path,'utf8'),c,{timeout:1500});
    const variable=Object.keys(c).find(key=>/^PYQ_(?:(?:CDS|AFCAT)_)?\d{4}_(?:I|II)$/.test(key));if(!variable)throw new Error('No PYQ array in '+path);
    for(const q of c[variable]){
      total++;const sec=String(q.sec||'').trim();const at=path+' question '+q.n;
      if(sec.toLowerCase()==='spotting errors'){spotting++;if(!renderableSpot(q))spottingBad.push(at);}
      if(/^(?:word classes|parts of speech)$/i.test(sec)){wordClass++;if(typeof q.keyword!=='string'||!q.keyword.trim()||!String(q.q||'').toLocaleLowerCase().includes(q.keyword.trim().toLocaleLowerCase()))wordClassBad.push(at);}
      if(/ordering of sentences|sentence arrangement \(pqrs\)|choose the correct usage/i.test(sec)){structured++;if(!hasLabeledBlocks(q))structuredBad.push(at);}
      if(/reading comprehension/i.test(sec)){reading++;if(typeof q.passage!=='string'||!q.passage.trim())readingBad.push(at);}
    }
  }
  if(spottingBad.length)throw new Error('Spotting Errors missing visible sentence-part structure: '+spottingBad.slice(0,20).join(', '));
  if(wordClassBad.length)throw new Error('Word Classes/Parts of Speech missing target-word highlighting: '+wordClassBad.slice(0,20).join(', '));
  if(structuredBad.length)throw new Error('Structured PYQ lost its printed labels: '+structuredBad.slice(0,20).join(', '));
  if(readingBad.length)throw new Error('Reading Comprehension missing passage context: '+readingBad.slice(0,20).join(', '));
  console.log('PYQ presentation audit: '+total+' questions; '+spotting+' Spotting Errors, '+wordClass+' Parts-of-Speech/Word-Class, '+structured+' labeled-structure questions, '+reading+' Reading Comprehension checks passed');
}catch(error){console.error('PYQ presentation audit failed:',error.message);process.exitCode=1;}




/* Information Centre coverage guard. Keep shipped modules represented in the user guide. */
try{
 const infoGuide=readFileSync('js/vaani-info-center.js','utf8');
 for(const feature of ['Wren &amp; Martin companion','Configurable Test Kit','Final report cards','Career &amp; Exam Desk','Shared match codes','Officer VAANI controls','learning milestones only']){
   if(!infoGuide.includes(feature))throw new Error('Information Centre is missing an updated feature: '+feature);
 }
 
}catch(error){console.error('Information Centre audit failed:',error.message);process.exitCode=1;}

/* Arena command-console integrity audit. */
try {
  const arena = readFileSync('js/vaani-arena.js','utf8');
  const arenaCss = readFileSync('vaani-arena-briefing.css','utf8');
  const officerSource = readFileSync('js/vaani-character-elite.js','utf8');
  const pageSource = readFileSync('index.html','utf8');
  for (const marker of [
    'screenCreateV2','screenShareV2','screenHostAnswers',
    'parseArenaInvite','matchHostName','hostName',
    'Leaderboard after attempt','?arena=CODE&host=NAME',
    'var CODE_VERSION = 3',
    'var LEGACY_SRC_CODES',
    'NDA+CDS',
    'NDA+AFCAT',
    'CDS+AFCAT',
    'normalizedSourceFromCodes',
    'poolForSource',
    'Click two or more exam banks',
    'sourceExamCodes(d.source)',
    'hostSpectate',
    'PARTICIPATE',
    'Spectate',
    'vx-host-spectate-panel',
    'Open answer key'
  ]) {
    if (!arena.includes(marker)) throw new Error('Arena redesign marker is missing: ' + marker);
  }
  for (const marker of [
    '.vx-arena-setup','.vx-arena-source-grid','.vx-arena-deploy-summary',
    '.vx-arena-share','.vx-host-identity','.vx-host-action-secondary',
    '.vx-host-answer-key',
    '.vx-arena-source-selection',
    '.vx-arena-source-card-all',
    '.vx-host-spectate-panel',
    '.vx-host-participate',
    '.vx-host-spectate',
    '.vx-invite-action',
    '.vx-invite-copy-code',
    '.vx-invite-share',
    'ARENA_RECOVERY_KEY',
    'function arenaAnalysis',
    'function startMistakeDrill',
    'SESSION RECOVERED',
    'vx-arena-intelligence',
    'vx-arena-practice-complete'
  ]) {
    if (!arenaCss.includes(marker)) throw new Error('Arena redesign style is missing: ' + marker);
  }
  if (!/hostName:\s*matchHostName\(m\)/.test(arena)) throw new Error('Arena recent-match records must retain host identity.');
  if (!arena.includes('Copy invite link')) throw new Error('Arena host invite link control is missing.');
  const requiredCombos = ['NDA','CDS','AFCAT','NDA+CDS','NDA+AFCAT','CDS+AFCAT','BOTH'];
  const comboHits = requiredCombos.filter(code => arena.includes("'" + code + "'"));
  if (comboHits.length !== requiredCombos.length) throw new Error('Arena multi-bank source matrix is incomplete.');
  if (!arena.includes("A.questionsFor = function (match, playerName) {\n    var pool = poolForSource(match.source);")) {
    throw new Error('Arena question generation is not using the combined source pool.');
  }
  if (!arena.includes("A.poolForDraft = function (source, type, paperKey) {\n    return applyFilters(poolForSource(source), type, paperKey);")) {
    throw new Error('Arena draft availability is not using the combined source pool.');
  }
  if (!arena.includes("function papersFor(source) {\n    var pool = poolForSource(source);")) {
    throw new Error('Arena paper filters are not using the combined source pool.');
  }
  if (!/v !== 2 && v !== CODE_VERSION/.test(arena)) throw new Error('Arena match-code decoder is not backward compatible with v2 invites.');
  if (!arena.includes('codeVersion: v')) throw new Error('Arena decoded matches do not retain the code version.');
  if (!pageSource.includes('vaani-arena-briefing.css?v=20261004-qparts1')) throw new Error('Arena question-parts CSS cache key is outdated.');
  if (!pageSource.includes('js/vaani-arena.js?v=20261004-qparts1')) throw new Error('Arena question-parts JS cache key is outdated.');
  if (!arena.includes('function copyText(value, onSuccess)')) throw new Error('Arena invite copy fallback is missing.');
  if (!arena.includes('var share=actionButton(\'Share invite\'')) throw new Error('Arena share action is not always rendered.');
  if (!arena.includes('navigator.share')) throw new Error('Native share action is missing.');
  if (!pageSource.includes('js/vaani-info-center.js?v=20261004-release7')) throw new Error('Feature release cache key is outdated.');
  if (!arena.includes("S.hostSpectate=true")) throw new Error('Host spectate mode is not activated from the host-only control.');
  if (!arena.includes("S.result=null;")) throw new Error('Host spectate must not create a player result before opening the board.');
  if (!arena.includes("if(hostSpectating)")) throw new Error('Result screen is missing the host spectate presentation.');
  if (!arena.includes('var hasOwnAttempt=!!previousAttempt(m.code);')) throw new Error('Pre-attempt leaderboard lock is missing.');
  if (!arena.includes('if(!hostSpectating && !hasOwnAttempt)')) throw new Error('Pre-attempt result lock is missing.');
  if (!arena.includes('if(!S.hostSpectate && !previousAttempt(m.code))')) throw new Error('Host answer-key context gate is missing.');
  if (!arena.includes('Leaderboard after attempt')) throw new Error('Fair-play lock copy is missing.');
  if (!arena.includes('function questionPromptHtml(q)')) throw new Error('Official question segmentation renderer is missing.');
  if (!arena.includes('vx-question-parts')) throw new Error('Arena question segmentation markup is missing.');
  if (!readFileSync('data/pyq/cds-2013-II.js','utf8').includes('"parts": [\n      "When the artist had started",\n      "singing a popular song",\n      "in chorus",\n      "everyone in the audience joined"')) throw new Error('CDS 2013-II Q75 P/Q/R/S source parts are missing.');
  if (!pageSource.includes('js/vaani-info-center.js?v=20261004-release7')) throw new Error('Question-parts feature release cache key is outdated.');
  if (!readFileSync('data/pyq/cds-2009-II.js','utf8').includes('from behind a curtain (P) he held it in such a manner (Q) bringing the light (R) that it fell slantwise on her face. (S)')) throw new Error('CDS 2009-II Q73 P/Q/R/S source correction is missing.');
  const fairPlayInfo=readFileSync('js/vaani-info-center.js','utf8');
  if (!fairPlayInfo.includes("version:'20261004-arena-fairplay1'")) throw new Error('Arena fair-play release entry is missing.');
  if (!arena.includes("clearRunRecovery();")) throw new Error('Arena recovery state is not cleared after official submission.');
  if (!arena.includes("if(!r.practiceMode)saveRunRecovery();")) throw new Error('Arena recovery is not persisted during active official runs.');
  if (!arena.includes("practiceMode:!!options.practice")) throw new Error('Mistake-drill practice mode is missing.');
  if (!arena.includes("S.practiceSummary=")) throw new Error('Mistake-drill completion state is missing.');
  if (!arena.includes("window.dispatchEvent(new CustomEvent('vaani:arena-analysis'")) throw new Error('Arena analytics event is missing.');
  if (!officerSource.includes('window.VAANI_ARENA_ANALYSIS_BRIEFING=function(insights)')) throw new Error('Officer Arena debrief bridge is missing.');
  if (!pageSource.includes('js/vaani-info-center.js?v=20261004-release7')) throw new Error('Feature release cache key is outdated.');
  if (!pageSource.includes('js/vaani-character-elite.js?v=20261003-release4')) throw new Error('Officer debrief cache key is outdated.');
  console.log('Arena intelligence audit: recovery, analytics, mistake drill, contextual Officer debrief and cache keys validated');
  console.log('Arena multi-bank audit: v3 source matrix, v2 decode compatibility, combined pool generation, multi-select UI, responsive styling and cache keys validated');
  console.log('Arena: redesigned question-selection console, host controls, shared host identity and answer-key route validated');
}catch(error){console.error('Arena audit failed:',error.message);process.exitCode=1;}

/* Wren & Martin Book Companion integrity audit. */
try{
 const chapters=loadData('data/book-companion.js','VAANI_BOOK_CHAPTERS');
 const bank=loadData('data/book-practice.js','VAANI_BOOK_PRACTICE');
 const ids=new Set(),qids=new Set(),prompts=new Set(),counts={};
 if(!Array.isArray(chapters)||chapters.length!==89)throw new Error('Expected 89 TOC entries.');
 for(const c of chapters){if(!c||!c.id||ids.has(c.id)||!c.title||!c.pages||!['grammar','analysis','usage','structures','writing','appendix'].includes(c.sectionId))throw new Error('Invalid TOC entry: '+(c&&c.id));ids.add(c.id);counts[c.sectionId]=(counts[c.sectionId]||0)+1;}
 const expected={grammar:43,analysis:16,usage:13,structures:3,writing:12,appendix:2};
 for(const k of Object.keys(expected))if(counts[k]!==expected[k])throw new Error('Unexpected '+k+' chapter count.');
 if(!Array.isArray(bank)||bank.length!==72)throw new Error('Expected 72 book-linked questions.');
 for(const q of bank){if(q._exam!=='BOOK'||q._sourceType!=='book-supplementary'||!q._id||qids.has(q._id)||!q.q||prompts.has(q.q)||!Array.isArray(q.o)||q.o.length!==4||!Number.isInteger(q.ans)||q.ans<0||q.ans>3||!q.exp||!q.rule||!Array.isArray(q.bookChapterIds)||q.bookChapterIds.some(id=>!ids.has(id)))throw new Error('Invalid supplementary MCQ: '+q._id);qids.add(q._id);prompts.add(q.q);}
 if(bank.filter(q=>!q.bookChapterIds.length).length!==3)throw new Error('Expected three clearly unlinked supplemental items.');
 const app=readFileSync('js/app.js','utf8'),ui=readFileSync('js/vaani-book-companion.js','utf8');
 if(!html.includes('data/book-companion.js?v=20261002-bookcompanion2')||!html.includes('js/vaani-book-companion.js?v=20261002-bookcompanion3')||!html.includes('vaani-book-companion.css?v=20261002-bookcompanion3'))throw new Error('Book companion assets not loaded.');
 if(!html.includes('Wren &amp; Martin · Chapter companion')||!html.includes('Wren &amp; Martin · English reference')||!ui.includes('data-book-chapter=') )throw new Error('Book companion cross-area entry points or chapter identity are missing.');
 for(const marker of ['bookStudy:{completedChapterIds:[],completedExerciseIds:[],lastChapterId:null}','bookChapterId:s.bookChapterId||null'])if(!app.includes(marker))throw new Error('Book progress/resume integration missing.');
 for(const marker of ['pvOpenBookCompanion','pvOpenBookChapter','pvToggleBookChapterRead','pvToggleBookExercise','pvLaunchBookChapterPractice'])if(!ui.includes(marker))throw new Error('Book companion action missing: '+marker);
 console.log('Book Companion audit: 89 TOC entries, 72 original mapped MCQs, study checklist and session integration passed');
 const character=readFileSync('js/vaani-character.js','utf8'),eliteCharacter=readFileSync('js/vaani-character-elite.js','utf8');
 const characterCss=readFileSync('vaani-character.css','utf8'),eliteCharacterCss=readFileSync('vaani-character-elite.css','utf8');
 if(!character.includes('window.vaaniCharacterSetPose=function(pose)')||!eliteCharacter.includes('window.vaaniCharacterSetPose(pose)'))throw new Error('Officer VAANI pose state helper is missing.');
 if(!eliteCharacter.includes("e.target.closest('.ve-header-mini')"))throw new Error('Officer VAANI header launcher is not excluded from outside-click dismissal.');
 if(!eliteCharacter.includes("document.getElementById('veRestoreOfficer')?.remove()")||!eliteCharacter.includes("if(getDockPreferences().hidden)setDockHidden(false,true)")||eliteCharacter.includes("restore.id='veRestoreOfficer'"))throw new Error('Officer VAANI must restore from the header without a bottom control.');
  if(!character.includes('window.vaaniCharacterEnsure=ensure')||!eliteCharacter.includes("window.vaaniCharacterEnsure==='function'"))throw new Error('Officer VAANI mount handshake is missing.');
  if(!character.includes('assets/officer-vaani.svg'))throw new Error('Officer VAANI base local art fallback is missing.');
 if(!character.includes('https://cdn-ai-hs.picsart.com/ai-hot-storage/acfec6d8-2627-4b42-bd67-1923ba9898f4.png')||!characterCss.includes('https://cdn-ai-hs.picsart.com/ai-hot-storage/acfec6d8-2627-4b42-bd67-1923ba9898f4.png')||!eliteCharacterCss.includes('https://cdn-ai-hs.picsart.com/ai-hot-storage/acfec6d8-2627-4b42-bd67-1923ba9898f4.png'))throw new Error('AI-cleaned Officer VAANI pose sheet is missing from the character renderers.');
 if(!characterCss.includes('https://cdn-ai-hs.picsart.com/ai-hot-storage/2a136339-4163-42a0-b366-0541c84cc19a.png')||!eliteCharacterCss.includes('https://cdn-ai-hs.picsart.com/ai-hot-storage/2a136339-4163-42a0-b366-0541c84cc19a.png'))throw new Error('AI-cleaned Officer VAANI portrait is missing from compact art.');
  if(!eliteCharacter.includes("window.addEventListener('hashchange',()=>queueRouteBrief(180)"))throw new Error('Officer VAANI route-close hook is missing.');
  const routeBriefStart=eliteCharacter.indexOf('function queueRouteBrief('),routeBriefEnd=eliteCharacter.indexOf('function polishFromCurrent(',routeBriefStart);
  if(routeBriefStart<0||routeBriefEnd<0||/\bbrief\s*\(\s*\)/.test(eliteCharacter.slice(routeBriefStart,routeBriefEnd)))throw new Error('Officer VAANI route changes must not trigger unsolicited briefings.');
  if(eliteCharacter.includes('const host=target||view.firstElementChild')||!eliteCharacter.includes("const routeHidden=active()==='profile'")||!eliteCharacterCss.includes("body:has(#view-profile.active) #vaaniMentor:not(.bad-result){display:none!important}"))throw new Error('Officer VAANI dock must not overlap the Profile hero.');
  if(eliteCharacter.includes('function wrapResult(){'))throw new Error('Officer VAANI result callback must not open a floating recovery briefing.');
  if(!eliteCharacterCss.includes('#vaaniMentor:not(.bad-result):not(.speaking):not(.open):not(.ve-move-mode){visibility:hidden!important;pointer-events:none!important}'))throw new Error('Collapsed Officer VAANI must not block page controls.');
  if(!html.includes('vaani-character-elite.css?v=20261003-release3')||!html.includes('js/vaani-character.js?v=20261002-aiclean3')||!html.includes('js/vaani-character-elite.js?v=20261003-release4'))throw new Error('Officer VAANI asset cache keys are outdated.');
  if(!html.includes('vaani-contrast-repair.css?v=20261002-contrast2'))throw new Error('Site-wide contrast repair must load after all visual layers.');
  const contrastRepair=readFileSync('vaani-contrast-repair.css','utf8');
  if(!contrastRepair.includes('--muted:#b8c3ce')||!contrastRepair.includes('--muted2:#9aa8b5')||!contrastRepair.includes('#view-grammar .gt-topic-desc')||!contrastRepair.includes('#view-grammar > .bc-global-link')||!contrastRepair.includes('background-color:#0b1722!important'))throw new Error('Site-wide contrast tokens, Grammar readability or companion banner rules are missing.');
  const appForReports=readFileSync('js/app.js','utf8'),dashboardCss=readFileSync('vaani-dashboard.css','utf8');
  if(!appForReports.includes('function vaaniResultBriefingNode(')||!appForReports.includes("PV.screen='summary';pvRender();")||!appForReports.includes("completedCard.appendChild(briefing)"))throw new Error('Inline end-of-attempt report and Officer VAANI briefing are incomplete.');
  if(!html.includes('assets/indian-flag-backdrop.svg')||!dashboardCss.includes('.vd-flag-backdrop'))throw new Error('Dashboard Indian flag backdrop is missing.');
  if(!html.includes('https://cdn-ai-hs.picsart.com/ai-hot-storage/2a136339-4163-42a0-b366-0541c84cc19a.png')||!appForReports.includes("portrait.src='https://cdn-ai-hs.picsart.com/ai-hot-storage/2a136339-4163-42a0-b366-0541c84cc19a.png'"))throw new Error('AI-cleaned Officer VAANI cutout is not integrated across dashboard and result cards.');
  if(appForReports.includes('vaaniCharacterSpeak(name),700'))throw new Error('PYQ page rendering must not open a briefing during an attempt.');
  if(!appForReports.includes("const liveQuiz=step==='practice'&&!!document.querySelector('#pane-quiz .quiz-live-card')")||!appForReports.includes('window.VAANI_SET_ASSESSMENT_ACTIVE(liveQuiz)'))throw new Error('Grammar practice flow must activate and release assessment focus.');
  if(!appForReports.includes("XP in the '+(progress.current?progress.current.name:'starting')+' → '+progress.next.name+' band")||!appForReports.includes("' total XP · '+progress.remainingXP.toLocaleString('en-IN')+' XP to '+progress.next.name"))throw new Error('Service-rank labels must distinguish band progress from total XP.');
  if(!eliteCharacter.includes("getDockPreferences")||!eliteCharacter.includes("function setDockPosition")||!eliteCharacter.includes("function setDockScale"))throw new Error('Officer VAANI move/resize preference controls are missing.');
  if(!eliteCharacter.includes('id="veDockScaleExact"')||!eliteCharacter.includes('step="1"'))throw new Error('Officer VAANI exact one-percent size control is missing.');
  if(!eliteCharacter.includes('id="veDockX"')||!eliteCharacter.includes('id="veDockY"')||!eliteCharacter.includes('function applyDockPositionInputs')||!eliteCharacter.includes('id="veDockApply"'))throw new Error('Officer VAANI exact pixel-position controls are missing.');
  if(!eliteCharacter.includes("veRestoreOfficer")||!eliteCharacter.includes("function setDockHidden"))throw new Error('Officer VAANI hide/restore controls are missing.');
  if(!eliteCharacter.includes("window.addEventListener('pointermove',moveDockDrag"))throw new Error('Officer VAANI drag interaction is missing.');
 if(characterCss.includes('calc(var(--pose-col')||eliteCharacterCss.includes('calc(var(--pose-col'))throw new Error('Officer VAANI sprite still uses fragile computed pose offsets.');
 console.log('Officer VAANI audit: persistent asset states, reliable pose coordinates and non-dismissing launchers validated');
}catch(error){console.error('Book Companion audit failed:',error.message);process.exitCode=1;}

/* Cloudflare Worker Preview configuration and read-only safety guard. */
try {
  const workerConfigSource = readFileSync('cloudflare/notifications/wrangler.jsonc', 'utf8');
  const workerConfig = JSON.parse(workerConfigSource.replace(/^\s*\/\/.*$/gm, ''));
  const productionDb = (workerConfig.d1_databases || []).find(binding => binding.binding === 'DB');
  const previewDb = (workerConfig.previews?.d1_databases || []).find(binding => binding.binding === 'DB');
  const workerSource = readFileSync('cloudflare/notifications/src/index.js', 'utf8');
  if (!workerConfig.previews || !previewDb) throw new Error('Wrangler Previews must declare the DB binding.');
  if (!workerConfig.previews.vars || workerConfig.previews.vars.ENVIRONMENT !== 'preview') {
    throw new Error('Wrangler Previews must set ENVIRONMENT=preview.');
  }
  if (!productionDb || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previewDb.database_id || '')) {
    throw new Error('Preview DB must have a valid D1 database ID.');
  }
  if (!workerSource.includes('env.ENVIRONMENT === "preview"') ||
      !workerSource.includes('Write operations are disabled in Worker Previews.')) {
    throw new Error('Worker must reject write operations in Preview deployments.');
  }
  console.log('Cloudflare Worker: Preview DB binding and read-only write guard validated');
} catch (error) {
  console.error('Cloudflare Preview validation failed:', error.message);
  process.exitCode = 1;
}
