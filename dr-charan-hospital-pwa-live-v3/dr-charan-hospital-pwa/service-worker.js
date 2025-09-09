const CACHE='onestop-hospital-demo-v3';
const PATHS=['login.html?v=3','dashboard.html?v=3','patient.html?v=3','admin.html?v=3','portal.html?v=3','offline.html','styles.css','manifest.webmanifest','js/store.js?v=3','js/app.js?v=3','assets/logo.png'];
const ASSETS=PATHS.map(p=>new URL(p,self.registration.scope).toString());
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match(new URL('offline.html',self.registration.scope)))))});