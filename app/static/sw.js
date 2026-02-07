const CACHE_NAME = 'yanindayim-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/static/css/style.css',
    '/static/js/reading-mode.js',
    '/static/js/global-help.js',
    '/static/manifest.json',
    '/static/img/logo.png',
    '/static/img/icon-192.png',
    '/static/img/icon-512.png',
    '/offline',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install Event - Cache Core Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching core assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Network First, then Cache, then Offline Page
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and external links (optional, but good practice)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Create a clone of the response to save in cache
                const responseClone = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    // Only cache valid responses from our own origin or specific CDNs
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, responseClone);
                    }
                });

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If navigation request (HTML page) and not in cache, show offline page
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline');
                    }
                });
            })
    );
});
