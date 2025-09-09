// v5 cache (bump this when you change assets)
const CACHE = 'onestop-hospital-demo-v5';
const ASSET_PATHS = [
  'login.html?v=5','dashboard.html?v=5','patient.html?v=5','admin.html?v=5','portal.html?v=5',
  'offline.html','styles.css?v=5','manifest.webmanifest',
  'js/store.js?v=5','js/app.js?v=5',
  'assets/logo.png','assets/banner.png'
];
const ASSETS = ASSET_PATHS.map(p => new URL(p, self.registration.scope).toString());

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() =>
      caches.match(new URL('offline.html', self.registration.scope))
    ))
  );
});
