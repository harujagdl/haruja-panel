// ===============================
// service-worker.js (FINAL v14)
// PWA estable + NO rompe API (/api/gs) + NO rompe Apps Script
// ===============================

const CACHE_NAME = "haruja-static-v14";

// Cache SOLO de assets (NO metas HTML aquí)
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/haruja-logo.png",
];

// Pantallas / rutas que NO deben ser tocadas por SW
const BYPASS_PATHS = [
  "/registro-ventas.html",
];

// Hosts externos que NO deben ser interceptados (por seguridad extra)
const BYPASS_HOSTS = [
  "script.google.com",
  "script.googleusercontent.com",
  "googleusercontent.com",
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

  // 1) NO tocar endpoints API (CRÍTICO)
  if (url.pathname === "/api/gs" || url.pathname.startsWith("/api/")) return;

  // 2) Seguridad extra
  if (
    BYPASS_HOSTS.includes(url.hostname) ||
    BYPASS_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))
  ) {
    return;
  }

  // 3) NO tocar pantallas específicas
  if (BYPASS_PATHS.includes(url.pathname)) return;

  // 4) NO cachear HTML nunca
  const accept = req.headers.get("accept") || "";
  const isHTML =
    req.mode === "navigate" ||
    req.destination === "document" ||
    accept.includes("text/html");

  if (isHTML) return; // network-only

  // 5) Assets de tu dominio: cache-first
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
