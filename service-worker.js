// Nombre del caché estático
const CACHE_NAME = "haruja-static-v1";

// Archivos estáticos que queremos cachear (no HTML dinámico)
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/registro-ventas.html",
  "/plan-lealtad.html",
  "/calculadora-pedidos.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// INSTALACIÓN: precache de archivos estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // que tome el control lo antes posible
});

// ACTIVACIÓN: limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH: estrategia
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // 1) Para navegaciones / páginas HTML → NETWORK FIRST
  if (
    request.mode === "navigate" ||
    (request.destination === "document" && request.method === "GET")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 2) Para otros recursos estáticos → CACHE FIRST
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // Si no hay red, intenta devolver lo que haya en caché
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response("Sin conexión 😢", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const networkResponse = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}
