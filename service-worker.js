// ===============================
// service-worker.js (FINAL v13)
// PWA estable + fetch + proxy Vercel
// NO cachea API / NO cachea HTML
// ===============================

const CACHE_NAME = "haruja-static-v13";

// Cache SOLO de assets estáticos
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/haruja-logo.png",
];

// Pantallas que NO deben ser tocadas por el SW
const BYPASS_PATHS = [
  "/registro-ventas.html",
];

// ===============================
// INSTALL
// ===============================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ===============================
// ACTIVATE
// ===============================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ===============================
// FETCH
// ===============================
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 0) 🔥 NUNCA interceptar API (proxy Vercel)
  if (url.pathname.startsWith("/api/")) return;

  // 1) No tocar cross-origin (CDNs, Google, etc.)
  if (url.origin !== self.location.origin) return;

  // 2) No tocar pantallas específicas
  if (BYPASS_PATHS.includes(url.pathname)) return;

  // 3) NO cachear HTML (evita versiones viejas en PWA)
  const accept = req.headers.get("accept") || "";
  const isHTML =
    req.mode === "navigate" ||
    req.destination === "document" ||
    accept.includes("text/html");

  if (isHTML) return; // network-only

  // 4) Assets del dominio: cache-first
  event.respondWith(cacheFirst(req));
});

// ===============================
// CACHE-FIRST PARA ASSETS
// ===============================
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
