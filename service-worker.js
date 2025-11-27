// service-worker.js – PWA HarujaGdl (panel + tarjeta)
const CACHE_NAME = "haruja-panel-v1";

const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/plan-lealtad.html",
  "/registro-ventas.html",
  "/calculadora-pedidos.html",
  "/tarjeta-lealtad.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Instalar SW y guardar en caché archivos base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Limpiar cachés viejos cuando se actualiza el SW
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
});

// Cache-first solo para recursos del mismo dominio
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Si es otro dominio (Apps Script, etc.), dejamos pasar la petición sin cache
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

