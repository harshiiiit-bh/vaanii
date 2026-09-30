const RETRYABLE_STATUSES = new Set([408, 425, 429]);

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryableStatus(status) {
  return RETRYABLE_STATUSES.has(Number(status)) || (Number(status) >= 500 && Number(status) <= 599);
}

function retryDelay(attempt, response, baseDelayMs, maxDelayMs) {
  const header = response?.headers?.get?.('retry-after');
  if (header) {
    const seconds = Number(header);
    const dateDelay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay) && dateDelay >= 0) return Math.min(dateDelay, maxDelayMs);
  }
  return Math.min(baseDelayMs * (2 ** (attempt - 1)), maxDelayMs);
}

export async function mapConcurrent(items, concurrency, mapper) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError('concurrency must be a positive integer');
  if (typeof mapper !== 'function') throw new TypeError('mapper must be a function');
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function fetchWithRetry(url, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    attempts = 3,
    timeoutMs = 15000,
    baseDelayMs = 300,
    maxDelayMs = 2000,
    sleepImpl = pause,
    ...requestOptions
  } = options;
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  if (!Number.isInteger(attempts) || attempts < 1) throw new RangeError('attempts must be a positive integer');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new RangeError('timeoutMs must be positive');
  if (typeof sleepImpl !== 'function') throw new TypeError('sleepImpl must be a function');

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...requestOptions,
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(timeoutMs)
          : undefined
      });
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      await sleepImpl(retryDelay(attempt, null, baseDelayMs, maxDelayMs));
      continue;
    }
    if (response.ok) return response;
    lastError = new Error('HTTP ' + response.status + (response.statusText ? ' ' + response.statusText : ''));
    if (!retryableStatus(response.status) || attempt === attempts) throw lastError;
    await sleepImpl(retryDelay(attempt, response, baseDelayMs, maxDelayMs));
  }
  throw lastError || new Error('Request failed');
}

export function createSourceStatus({ checkedAt, sources, liveItems = 0, archiveItems = 0, snapshotRetained = false, concurrency = 1 }) {
  const rows = (Array.isArray(sources) ? sources : []).map(source => {
    const row = {
      source: String(source.source || 'Official source').replace(/[\r\n\t]+/g, ' ').slice(0, 180),
      ok: source.ok === true,
      found: Number.isFinite(Number(source.found)) ? Math.max(0, Number(source.found)) : 0,
      durationMs: Number.isFinite(Number(source.durationMs)) ? Math.max(0, Math.round(Number(source.durationMs))) : 0
    };
    if (!row.ok) row.error = String(source.error || 'Request failed').replace(/[\r\n\t]+/g, ' ').slice(0, 240);
    return row;
  });
  const sourcesOk = rows.filter(source => source.ok).length;
  return {
    version: 1,
    checkedAt: checkedAt || new Date().toISOString(),
    status: !rows.length || sourcesOk === 0 ? 'unavailable' : sourcesOk === rows.length ? 'healthy' : 'partial',
    sourcesTotal: rows.length,
    sourcesOk,
    sourcesFailed: rows.length - sourcesOk,
    liveItems: Math.max(0, Math.floor(Number(liveItems) || 0)),
    archiveItems: Math.max(0, Math.floor(Number(archiveItems) || 0)),
    snapshotRetained: snapshotRetained === true,
    concurrency: Math.max(1, Math.floor(Number(concurrency) || 1)),
    sources: rows
  };
}
