const CACHE = 'onestop-hospital-demo-v2';
const ASSETS = [
  '/', '/index.html','/login.html','/dashboard.html','/patient.html','/admin.html','/portal.html','/offline.html',
  '/styles.css','/manifest.webmanifest','/service-worker.js','/js/store.js','/js/app.js','/assets/logo.png','/assets/banner.png'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).catch(()=> caches.match('/offline.html')))
  );
});
