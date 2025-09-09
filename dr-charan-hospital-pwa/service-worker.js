const CACHE_NAME = "charan-hosp-cache-v1";
const ASSETS = [
  "/",
  "/login.html",
  "/dashboard.html",
  "/admin.html",
  "/settings.html",
  "/styles.css?v=14",
  "/js/store.js?v=14",
  "/assets/logo.png",
  "/manifest.webmanifest"
];

// Install
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Fetch
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
