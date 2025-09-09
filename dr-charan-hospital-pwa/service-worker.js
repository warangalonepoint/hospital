// service-worker.js — offline-first + Chart.js support
const CACHE_NAME = "charan-hosp-cache-v3"; // bump version whenever assets change

const ASSETS = [
  "./",
  "./login.html",
  "./dashboard.html",
  "./admin.html",
  "./analytics.html",
  "./settings.html",
  "./styles.css?v=24",
  "./js/store.js",
  "./assets/banner.png",
  "./assets/logo.png",
  "./assets/chart.umd.min.js",
  "./manifest.webmanifest"
];

// Install: precache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS)
    )
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

// Fetch: network-first for HTML, cache-first for others
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(req, { ignoreSearch: true })) ||
                 (await cache.match("./offline.html"));
        }
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req))
  );
});
