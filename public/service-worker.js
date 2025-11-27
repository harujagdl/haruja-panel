// service-worker.js – Tarjeta HarujaGdl
const CACHE_NAME = "haruja-card-v1";

const URLS_TO_CACHE = [
  "/tarjeta-lealtad.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

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

// Cache-first solo para recursos estáticos del mismo origen.
// La API de Apps Script se deja pasar directo (no se cachea).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Si no es mismo origen (Apps Script, etc.), no intervenimos
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
