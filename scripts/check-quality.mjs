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
