// service-worker.js – Tarjeta HarujaGdl PWA
const CACHE_NAME = "haruja-card-v1";

const URLS_TO_CACHE = [
  "/tarjeta-lealtad.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Se instala el SW y se guardan en caché los archivos base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Limpia versiones viejas del caché cuando se actualiza el SW
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

// Estrategia cache-first SOLO para recursos del mismo dominio (Vercel)
// La API de Apps Script no se cachea, pasa directo en red.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Si es otro dominio (Apps Script, etc.), no intervenimos
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
