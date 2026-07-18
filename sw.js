/* =============================================================================
 * sw.js  —  SERVICE WORKER (offline cache / app shell)
 * -----------------------------------------------------------------------------
 * WHY A SERVICE WORKER
 * A PWA must work offline after the first load. This classic "cache-first app
 * shell" strategy stores every asset the app needs, so once visited, the app
 * opens with no network — perfect for a workbench with spotty WiFi.
 *
 * STRATEGY: on install we precache the whole shell. On fetch we serve from cache
 * first (instant + offline), and for navigations we fall back to the cached
 * index.html when offline. New deployments bump CACHE (the version) so the SW
 * re-caches fresh files. (Cache-first is fine here because the app is a fixed
 * set of static files; for an API-backed app you'd use network-first instead.)
 * ===========================================================================*/

const CACHE = 'msm-v3';
const SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/taxonomy.js',
  'js/catalog.js',
  'js/engine.js',
  'js/inventory.js',
  'js/ai.js',
  'js/ui.js',
  'js/detail.js',
  'js/app.js',
  'js/sketches-data.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', event => {
  // Precaching: wait until all shell files are stored before finishing install.
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // Clean up old caches so we don't pile up versions.
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;            // never cache POST/AI calls
  event.respondWith(
    caches.match(req).then(cached => {
      // Cache-first: return the saved copy if we have it.
      if (cached) return cached;
      // Otherwise go to network; on success, clone + store for next time.
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        // Offline + not cached: for page navigations, fall back to index.html.
        if (req.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
