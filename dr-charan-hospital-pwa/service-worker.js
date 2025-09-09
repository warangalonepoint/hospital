const CACHE='onestop-hospital-demo-v2';
const ASSET_PATHS=['login.html','dashboard.html','patient.html','admin.html','portal.html','offline.html','styles.css','manifest.webmanifest','js/store.js','js/app.js','assets/logo.png'];
const ASSETS=ASSET_PATHS.map(p=>new URL(p,self.registration.scope).toString());
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match(new URL('offline.html',self.registration.scope)))))});