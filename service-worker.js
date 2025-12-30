// ===============================
// service-worker.js (FINAL v14)
// PWA estable + NO rompe API / JSONP
// ===============================

const CACHE_NAME = "haruja-static-v14";

// Cache SOLO de assets (NO metas HTML aquí)
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/haruja-logo.png",
];

// Rutas que NO deben ser tocadas por SW
const BYPASS_PATH_PREFIXES = [
  "/api/",                // <-- IMPORTANTÍSIMO (proxy Vercel)
  "/registro-ventas.html" // tu pantalla
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 0) Si es cross-origin, no lo toques
  if (url.origin !== self.location.origin) return;

  // 1) BYPASS rutas sensibles (API + pantallas)
  if (BYPASS_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // 2) NO cachear HTML nunca
  const accept = req.headers.get("accept") || "";
  const isHTML =
    req.mode === "navigate" ||
    req.destination === "document" ||
    accept.includes("text/html");

  if (isHTML) return; // network-only

  // 3) NO cachear JSON
  const isJSON = accept.includes("application/json");
  if (isJSON) return; // network-only

  // 4) Assets: cache-first
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const res = await fetch(request);

  if (res && res.ok && res.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, res.clone());
  }

  return res;
}
