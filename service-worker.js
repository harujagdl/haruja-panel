// ===============================
// service-worker.js (FINAL v12)
// PWA estable + NO rompe JSONP (Apps Script)
// ===============================

const CACHE_NAME = "haruja-static-v13";

// Cache SOLO de assets (NO metas HTML aquí)
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/haruja-logo.png",
];

// Pantallas que NO deben ser tocadas por SW
const BYPASS_PATHS = [
  "/registro-ventas.html",
];

// Hosts externos que NO deben ser interceptados
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

  // 0) Si es cross-origin, no lo toques (incluye Apps Script / CDNs / etc.)
  if (url.origin !== self.location.origin) return;

  // 1) NO tocar hosts externos (por si algún día cambia a proxy dentro del mismo origin)
  // (Se deja por seguridad extra; normalmente ya cubre el origin check de arriba)
  if (
    BYPASS_HOSTS.includes(url.hostname) ||
    BYPASS_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))
  ) {
    return;
  }

  // 2) NO tocar pantallas específicas
  if (BYPASS_PATHS.includes(url.pathname)) return;

  // 3) NO cachear HTML nunca (evita versión vieja en PWA)
  const accept = req.headers.get("accept") || "";
  const isHTML =
    req.mode === "navigate" ||
    req.destination === "document" ||
    accept.includes("text/html");

  if (isHTML) return; // network-only

  // 4) Assets de tu dominio: cache-first
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(request) {
  // Para assets, a veces se agregan query params (?v=123)
  // ignoreSearch ayuda a reutilizar el mismo archivo cacheado.
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const res = await fetch(request);

  // Solo cachea si la respuesta está OK y es "básica" (misma origen)
  if (res && res.ok && res.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, res.clone());
  }

  return res;
}

