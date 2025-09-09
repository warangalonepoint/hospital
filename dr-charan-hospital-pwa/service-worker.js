// Simple, solid offline cache with install prompt support
const CACHE_NAME = "charan-hosp-cache-v1";

// Keep these paths RELATIVE to where this SW file lives
const ASSETS = [
  "./",
  "./login.html",
  "./dashboard.html",
  "./admin.html",
  "./settings.html",
  "./styles.css?v=14",
  "./js/store.js?v=14",
  "./assets/logo.png",
  "./assets/banner.png",
  "./manifest.webmanifest"
];

// Install: precache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin; network fallback
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // For navigations (HTML pages), try network first then fallback to cached login
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match("./login.html")) || Response.error();
        }
      })()
    );
    return;
  }

  // For others: cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
