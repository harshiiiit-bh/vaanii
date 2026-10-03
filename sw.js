/* VAANI's service-worker cache is namespaced to this app. */
const CACHE_PREFIX = 'vaani-shell-';
const CACHE = 'vaani-shell-v12';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    './',
    './index.html',
    './vaani-upgrade-core.css',
    './js/vaani-upgrade-core.js',
    './vaani-vocab90.css?v=20261003-structured2',
    './js/vaani-vocab90.js?v=20261004-structured3',
    './js/library.js?v=20261004-loginfix1',
    './js/app.js?v=20261004-loginfix3'
  ])));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.cache === 'no-store' || request.headers.has('authorization')) return;

  const scope = new URL(self.registration.scope);
  const url = new URL(request.url);
  const scopePath = scope.pathname.endsWith('/') ? scope.pathname : scope.pathname + '/';
  if (url.origin !== scope.origin || !url.pathname.startsWith(scopePath)) return;

  if (request.mode === 'navigate') {
    const fallback = new URL('./index.html', scope).href;
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE);
          await cache.put(fallback, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(fallback)) || Response.error();
      }
    })());
    return;
  }

  const staticDestination = ['script', 'style', 'image', 'font'].includes(request.destination);
  const staticPath = /\.(?:css|js|mjs|json|svg|png|jpe?g|webp|ico|woff2?)$/i.test(url.pathname);
  if (!staticDestination && !staticPath) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    try {
      const response = await fetch(request);
      const control = (response.headers.get('cache-control') || '').toLowerCase();
      if (response.ok && response.type === 'basic' && !/\bno-store\b/.test(control)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});
