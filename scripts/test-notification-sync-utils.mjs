import assert from 'node:assert/strict';
import { createSourceStatus, fetchWithRetry, mapConcurrent } from './notification-sync-utils.mjs';

const input = [4, 1, 3, 2, 5, 0];
let active = 0;
let peak = 0;
const mapped = await mapConcurrent(input, 2, async value => {
  active++;
  peak = Math.max(peak, active);
  await Promise.resolve();
  active--;
  return value * 3;
});
assert.deepEqual(mapped, [12, 3, 9, 6, 15, 0], 'concurrent mapping preserves input order');
assert.equal(peak, 2, 'concurrency is bounded to the requested limit');
assert.equal((await mapConcurrent([], 4, async value => value)).length, 0, 'empty work queues are safe');
await assert.rejects(mapConcurrent([1], 0, async value => value), RangeError);

let tries = 0;
const waits = [];
const response = await fetchWithRetry('https://example.test/feed', {
  attempts: 3, baseDelayMs: 10, sleepImpl: async ms => waits.push(ms),
  fetchImpl: async () => {
    tries++;
    return tries === 1
      ? { ok: false, status: 503, statusText: 'Unavailable', headers: new Headers() }
      : { ok: true, status: 200, headers: new Headers() };
  }
});
assert.equal(response.status, 200);
assert.equal(tries, 2, 'transient HTTP errors are retried');
assert.deepEqual(waits, [10]);

let blockedTries = 0;
await assert.rejects(fetchWithRetry('https://example.test/forbidden', {
  attempts: 3, sleepImpl: async () => assert.fail('403 responses should not be retried'),
  fetchImpl: async () => {
    blockedTries++;
    return { ok: false, status: 403, statusText: 'Forbidden', headers: new Headers() };
  }
}), /HTTP 403 Forbidden/);
assert.equal(blockedTries, 1, 'permanent HTTP errors fail fast');

let networkTries = 0;
const network = await fetchWithRetry('https://example.test/network', {
  attempts: 2, baseDelayMs: 5, sleepImpl: async () => {},
  fetchImpl: async () => {
    networkTries++;
    if (networkTries === 1) throw new Error('temporary network failure');
    return { ok: true, status: 200 };
  }
});
assert.equal(network.status, 200);
assert.equal(networkTries, 2, 'transient network errors are retried');

const health = createSourceStatus({
  checkedAt: '2026-09-30T09:00:00.000Z',
  sources: [
    { source: 'SSC', ok: true, found: 4, durationMs: 120 },
    { source: 'UPSC', ok: false, error: '403\nForbidden', durationMs: 90 }
  ],
  liveItems: 23, archiveItems: 7, snapshotRetained: true, concurrency: 4
});
assert.equal(health.status, 'partial');
assert.equal(health.sourcesOk, 1);
assert.equal(health.sourcesFailed, 1);
assert.equal(health.liveItems, 23);
assert.equal(health.concurrency, 4);
assert.equal(health.sources[1].error, '403 Forbidden', 'source errors are normalized for safe display');
assert.equal(createSourceStatus({ sources: [{ source: 'x', ok: false }] }).status, 'unavailable');

console.log('Notification sync utilities: bounded concurrency, transient retries, fail-fast permanent errors and source-health report passed');
