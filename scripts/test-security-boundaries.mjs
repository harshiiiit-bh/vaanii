import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sw = read('sw.js');
const legacyNotifications = read('js/notifications.js');
const notifications = read('js/vaani-notifications.js');
const library = read('js/library.js');

assert.match(sw, /const CACHE_PREFIX = 'vaani-shell-'/);
assert.match(sw, /key\.startsWith\(CACHE_PREFIX\) && key !== CACHE/);
assert.doesNotMatch(sw, /keys\.filter\(k\s*=>\s*k\s*!==\s*CACHE\)/);
assert.match(sw, /request\.cache === 'no-store'/);
assert.match(sw, /request\.headers\.has\('authorization'\)/);
assert.match(sw, /scopePath/);

assert.match(legacyNotifications, /const safeUrl\s*=\s*value\s*=>/);
assert.match(legacyNotifications, /const url=safeUrl\(item&&item\.url\)/);
assert.match(legacyNotifications, /url\?'<a class="nh-card-link" href="'\+esc\(url\)/);
assert.doesNotMatch(legacyNotifications, /href="'\s*\+\s*esc\(item\.url\)/);

assert.match(notifications, /const url = new URL\(raw\)/);
assert.match(notifications, /!url\.username && !url\.password/);
assert.match(library, /function optionalRequestTimeout\(ms\)/);
assert.match(library, /if\(INSIDE_CLAUDE\)/);
assert.ok((library.match(/signal: optionalRequestTimeout\(8000\)/g) || []).length >= 5,
  'All optional online lookups should have bounded requests');
console.log('Security boundary regression checks passed: cache isolation, no-store/auth bypass, notification link validation, and bounded dictionary requests.');
