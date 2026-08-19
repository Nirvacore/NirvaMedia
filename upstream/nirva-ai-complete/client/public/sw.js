const CACHE_NAME = 'nirva-ai-v2';
const SHELL_ROUTES = [
  '/',
  '/ecosystem',
  '/organization',
  '/orchestration',
  '/plugins',
  '/demo',
  '/docs',
  '/reports',
  '/chat',
  '/memory',
  '/workflows',
  '/marketplace',
  '/tasks',
  '/agents',
  '/voice',
  '/settings',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ROUTES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // API: network only
  if (url.pathname.startsWith('/api/')) return;

  // App shell: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      const res = await network;
      if (res) return res;

      if (request.mode === 'navigate') {
        return (await cache.match('/')) || new Response('Offline — Nirva PWA', { status: 503 });
      }
      return new Response('Offline', { status: 503 });
    })
  );
});
