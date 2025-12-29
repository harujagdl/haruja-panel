// ===============================
// service-worker.js (FINAL)
// Fix PWA iOS/Android + JSONP (Tiendanube / Apps Script)
// ===============================

// Sube versión cada vez que cambies este archivo
const CACHE_NAME = "haruja-static-v9";

// Archivos estáticos que queremos cachear (solo UI, NO endpoints externos)
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/registro-ventas.html",
  "/plan-lealtad.html",
  "/calculadora-pedidos.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/haruja-logo.png"
];

// Rutas que NO deben pasar por el SW (para evitar romper JSONP / auth)
const BYPASS_PATHS = [
  "/registro-ventas.html" // <- pantalla de comisiones (usa JSONP)
];

// Hosts externos que NO deben ser interceptados por el SW
const BYPASS_HOSTS = [
  "script.google.com",
  "script.googleusercontent.com",
  "googleusercontent.com"
];

// ---------------- INSTALL ----------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ---------------- ACTIVATE ----------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---------------- FETCH ----------------
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Solo manejar GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1) BYPASS por host externo (Apps Script / googleusercontent)
  if (BYPASS_HOSTS.includes(url.hostname) || BYPASS_HOSTS.some(h => url.hostname.endsWith("." + h))) {
    return; // deja que el navegador lo maneje
  }

  // 2) BYPASS por ruta (pantallas que usan JSONP o cosas sensibles)
  if (BYPASS_PATHS.includes(url.pathname)) {
    return; // deja que el navegador lo maneje
  }

  // 3) Navegaciones / HTML -> NETWORK FIRST
  //    (pero ojo: si es la ruta bypass, ya salió arriba)
  const isHTML =
    request.mode === "navigate" ||
    (request.destination === "document" && request.headers.get("accept")?.includes("text/html"));

  if (isHTML) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 4) Assets -> CACHE FIRST
  event.respondWith(cacheFirst(request));
});

// ---------------- STRATEGIES ----------------
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // cachea solo si es de tu dominio
    const url = new URL(request.url);
    if (url.origin === self.location.origin) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response("Sin conexión 😢", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);

  // cachea solo si es de tu dominio
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}
