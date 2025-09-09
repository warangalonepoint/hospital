// service-worker.js — Dr. Charan PWA (fixes: query params, stale HTML, safe fallbacks)
const CACHE_NAME = "charan-hosp-cache-v3";

// Core assets (paths are relative to THIS file)
const ASSETS = [
  "./",
  "./login.html",
  "./dashboard.html",
  "./admin.html",
  "./settings.html",
  "./analytics.html",
  "./pharmacy-report.html",
  "./patient.html",
  "./portal.html",
  "./styles.css",          // don't pin ?v — we handle it via ignoreSearch
  "./js/store.js",
  "./assets/logo.png",
  "./assets/banner.png",
  "./manifest.webmanifest"
];

// Helper: cache.addAll but resilient (skips failures)
async function precache(list) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    list.map(u => cache.add(new Request(u, { cache: "reload" })))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache(ASSETS));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Treat any ?v= cache-busters as the same file
function cacheMatchIgnoreSearch(request) {
  return caches.match(request, { ignoreSearch: true });
}

// Same-origin helper
function isSameOrigin(req) {
  try { return new URL(req.url).origin === self.location.origin; }
  catch { return false; }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle same-origin GETs
  if (req.method !== "GET" || !isSameOrigin(req)) {
    return; // let the browser handle it
  }

  // 1) HTML navigations: network-first, fallback to cached copy, then to login
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const net = await fetch(req, { cache: "no-store" });
        // Optionally, update cache for offline use
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
        return net;
      } catch {
        // Try cached same page (ignore ?v=) → otherwise fallback to cached login
        const cached = await cacheMatchIgnoreSearch(req);
        if (cached) return cached;
        const cache = await caches.open(CACHE_NAME);
        const login = await cache.match("./login.html");
        return login || Response.error();
      }
    })());
    return;
  }

  // 2) Static assets (CSS/JS/images): cache-first, then network; update cache when online
  event.respondWith((async () => {
    const cached = await cacheMatchIgnoreSearch(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, net.clone());
      return net;
    } catch {
      // last resort: if styles/scripts fail, try root to keep app usable
      return cached || Response.error();
    }
  })());
});

// Optional: support a manual "SKIP_WAITING" message from the page (if you ever send it)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
