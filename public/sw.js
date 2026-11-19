const CACHE_NAME = 'police-duty-app-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/badge.png',
  '/badge-512.png',
  '/badge-192.png',
  '/badge-maskable-512.png',
  '/badge-maskable-192.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER cache Supabase API, realtime WebSockets, or non-GET calls
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/realtime/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 2. Navigation requests (HTML pages): ALWAYS Network-First
  // Guarantees mobile phones immediately get new deployments when online!
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Fall back to offline cached HTML only when network is completely offline
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 3. Static assets: Network-First with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
