/* ============================================================
   service-worker.js
   Caches all app files for full offline support.
   Cache name uses a build timestamp injected by Netlify at
   deploy time — so every push automatically busts the old
   cache without you needing to change anything manually.
============================================================ */

// __BUILD_TIME__ is replaced with the actual deploy timestamp
// by Netlify via netlify.toml on every push to GitHub.
const CACHE_NAME = 'pallet-calc-__BUILD_TIME__';

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
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700;800&display=swap',
];

// ── Install: cache all files when the service worker first installs ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();  // Activate immediately without waiting
});

// ── Activate: delete any old cache versions automatically ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)  // Any cache that isn't the current version
                    .map(key => {
                        console.log('Deleting old cache:', key);
                        return caches.delete(key);
                    })
            )
        )
    );
    self.clients.claim();  // Take control of all open tabs immediately
});

// ── Fetch: serve from cache first, fall back to network ──
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});
