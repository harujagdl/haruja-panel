// ===============================
// service-worker.js (FINAL v8)
// PWA estable + NO rompe JSONP (Apps Script)
// ===============================

const CACHE_NAME = "haruja-static-v10";

// Cache SOLO de assets (NO metas HTML aquí)
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/haruja-logo.png"
];

// Pantallas que NO deben ser tocadas por SW
const BYPASS_PATHS = [
  "/registro-ventas.html"
];

// Hosts externos que NO deben ser interceptados
const BYPASS_HOSTS = [
  "script.google.com",
  "script.googleusercontent.com",
  "googleusercontent.com"
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

  // 1) NO tocar hosts externos (Apps Script / googleusercontent)
  if (
    BYPASS_HOSTS.includes(url.hostname) ||
    BYPASS_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))
  ) {
    return; // deja al navegador manejarlo
  }

  // 2) NO tocar esta pantalla (para evitar broncas con JSONP)
  if (BYPASS_PATHS.includes(url.pathname)) {
    return;
  }

  // 3) NO cachear HTML nunca (evita versión vieja en PWA)
  const accept = req.headers.get("accept") || "";
  const isHTML =
    req.mode === "navigate" ||
    req.destination === "document" ||
    accept.includes("text/html");

  if (isHTML) {
    return; // navegador directo (network only)
  }

  // 4) Assets: cache first (solo para tu dominio)
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const res = await fetch(request);
  const url = new URL(request.url);

  // Solo cachea si es tu dominio y la respuesta está OK
  if (url.origin === self.location.origin && res && res.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, res.clone());
  }
  return res;
}
