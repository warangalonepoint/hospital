// service-worker.js — FINAL
// Cache-bust when you change this version:
const CACHE_NAME = "charan-hosp-v7";

// Keep paths RELATIVE to the SW location
const ASSETS = [
  "./",
  "./login.html",
  "./dashboard.html",
  "./admin.html",
  "./analytics.html",
  "./pharmacy.html",
  "./pharmacy-report.html",
  "./bookings.html",
  "./settings.html",
  "./staff.html",
  "./patient.html",
  "./portal.html",

  "./styles.css?v=26",

  "./js/store.js",

  "./assets/logo.png",
  "./assets/banner.png",
  "./assets/chart.umd.min.js",

  "./manifest.webmanifest"
];

// ——— Install: pre-cache core
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ——— Activate: nuke old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ——— Fetch strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Navigations: network-first; fallback to cached dashboard -> login
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("./dashboard.html")) ||
               (await cache.match("./login.html")) ||
               Response.error();
      }
    })());
    return;
  }

  // Static assets: cache-first; if miss, fetch & cache
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    } catch {
      // Last-resort fallback for CSS/JS requests: try top-level root
      return caches.match("./");
    }
  })());
});
