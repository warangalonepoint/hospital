// Force-refresh cache by bumping version when assets change
const CACHE = 'onestop-hospital-demo-v7';

const ASSET_PATHS = [
  'login.html?v=7','dashboard.html?v=7','patient.html?v=7','admin.html?v=7','portal.html?v=7',
  'offline.html',
  'styles.css?v=7','manifest.webmanifest',
  // keep your current app/store versions if unchanged
  'js/store.js?v=5','js/app.js?v=5',
  // images
  'assets/logo.png','assets/banner.png'
];

// Expand to absolute URLs so match() works reliably on GH Pages
const ASSETS = ASSET_PATHS.map(p => new URL(p, self.registration.scope).toString());

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() =>
      caches.match(new URL('offline.html', self.registration.scope))
    ))
  );
});
