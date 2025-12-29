// service-worker.js
// Cache estático SOLO para assets (no HTML)
const CACHE_NAME = "haruja-static-v8";

// OJO: NO metas HTML aquí (index/registro/etc). Eso congela versiones en PWA.
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // si tienes css/js estáticos, agrégalos aquí:
  // "/styles.css",
  // "/app.js",
];

// INSTALACIÓN: precache de assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// ACTIVACIÓN: limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejar requests del mismo origen
  if (url.origin !== self.location.origin) return;

  // 1) HTML / navegaciones -> NETWORK FIRST (SIN cachear HTML)
  if (req.mode === "navigate" || (req.destination === "document" && req.method === "GET")) {
    event.respondWith(networkFirstNoCache(req));
    return;
  }

  // 2) Assets -> CACHE FIRST
  event.respondWith(cacheFirst(req));
});

async function networkFirstNoCache(request) {
  try {
    // cache: "no-store" ayuda MUCHO en iOS/Android PWA
    const networkResponse = await fetch(request, { cache: "no-store" });
    return networkResponse;
  } catch (error) {
    // fallback offline: intenta servir index.html si existiera en cache (opcional)
    // Como NO cacheamos HTML, devolvemos mensaje simple.
    return new Response("Sin conexión 😢", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}

