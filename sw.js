// ============== NOTESOWNIK SERVICE WORKER ==============
// Bump the version to invalidate old caches on redeploy.
const VERSION = 'notesownik-v1.0.0';
const CACHE_NAME = VERSION;

const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.webmanifest',
    './icon.svg',
    './icon-maskable.svg',
    'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;500;600;700;800;900&display=swap',
];

// INSTALL: precache app shell
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            await cache.addAll(APP_SHELL);
        } catch (e) {
            // Individual add fallback in case one URL fails (e.g. Google Fonts)
            for (const url of APP_SHELL) {
                try { await cache.add(url); } catch {}
            }
        }
        await self.skipWaiting();
    })());
});

// ACTIVATE: remove old caches
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

// FETCH: stale-while-revalidate for GET requests
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Skip cross-origin non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // For navigation requests, always try network first, fall back to cached shell
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const fresh = await fetch(req);
                const cache = await caches.open(CACHE_NAME);
                cache.put(req, fresh.clone());
                return fresh;
            } catch {
                const cached = await caches.match('./index.html');
                return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
            }
        })());
        return;
    }

    // Stale-while-revalidate for assets
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        const networkFetch = fetch(req).then((res) => {
            if (res && res.status === 200 && res.type !== 'opaque') {
                cache.put(req, res.clone()).catch(() => {});
            }
            return res;
        }).catch(() => cached);
        return cached || networkFetch;
    })());
});

// MESSAGE: allow the page to trigger an update
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
