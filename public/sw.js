const CACHE_NAME = 'nemesis-v1.4.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/favicon.ico',
];

// 1. Install Phase: Cache core splash assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ SW: Caching core assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate Phase: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Phase: Stale-While-Revalidate for Assets, Network-Only for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ⚡ ONLY handle GET requests for our own origin
  // External APIs (Google, Supabase, Cloudflare) must bypass the SW to avoid CORS and CSP conflicts.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip API calls to Supabase (let Supabase handle its own state/caching)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache successful responses for assets
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for document requests when offline
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return null;
      });

      // Return cached response instantly if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
