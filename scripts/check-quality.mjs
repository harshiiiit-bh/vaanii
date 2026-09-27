import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8').replace(/<!--[\\s\\S]*?-->/g, '');
const ids = [...html.matchAll(/\\bid\\s*=\\s*(['"])(.*?)\\1/g)].map((m) => m[2]);
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
  ...[...html.matchAll(/<script\\b[^>]*\\bsrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]),
  ...[...html.matchAll(/<link\\b[^>]*\\brel=["']stylesheet["'][^>]*\\bhref=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]),
];
const missing = refs
  .filter((ref) => !/^(?:[a-z]+:)?\\/\\//i.test(ref) && !/^(?:data:|#)/i.test(ref))
  .map((ref) => ref.split(/[?#]/, 1)[0].replace(/^\\.\\//, '').replace(/^\\//, ''))
  .filter((ref) => ref && !existsSync(ref));
if (missing.length) {
  console.error('Missing local assets:', [...new Set(missing)].join(', '));
  process.exitCode = 1;
} else {
  console.log('Local script and stylesheet references: present');
}
