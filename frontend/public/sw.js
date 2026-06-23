// EduCare Service Worker — Offline-First Cache Strategy
const CACHE_NAME = 'educare-v1';

// Assets to cache on install (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Georgia:ital,wght@0,400;0,700;1,400&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css',
];

// Install — cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — Cache-first for app shell, Network-first for API calls
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always go network for backend API sync calls
  if (url.hostname === 'localhost' && url.port === '3000') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // API offline — silently fail, app uses localStorage
        return new Response(JSON.stringify({ status: 'offline', data: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first for everything else (app shell, fonts, icons)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful GET responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
