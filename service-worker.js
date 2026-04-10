/* ============================================================
   service-worker.js
   Caches all app files on first load so the app works
   completely offline on subsequent visits.
============================================================ */

const CACHE_NAME = 'pallet-calc-v1';

// All files that need to be cached for offline use
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/config.js',
    '/js/calculator.js',
    '/js/history.js',
    '/js/ui.js',
    '/manifest.json',
    // Google Fonts — cached on first load so they work offline too
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700;800&display=swap',
];

// ── Install: cache all files when the service worker is first installed ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();  // Activate immediately without waiting for old SW to finish
});

// ── Activate: remove any old caches from previous versions ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)  // Find old cache versions
                    .map(key => caches.delete(key))      // Delete them
            )
        )
    );
    self.clients.claim();  // Take control of all open tabs immediately
});

// ── Fetch: serve from cache first, fall back to network ──
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Return cached version if available, otherwise fetch from network
            return cachedResponse || fetch(event.request);
        })
    );
});
