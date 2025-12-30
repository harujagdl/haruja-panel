/* service-worker.js — HarujaGdl (SAFE CACHE) */
const SW_VERSION = "haruja-sw-2025-01-01"; // cambia el texto si vuelves a editar
const CACHE_NAME = `haruja-static-${SW_VERSION}`;

// Archivos “seguros” para cachear (estáticos)
const STATIC_ASSETS = [
  "/",               // si tu index.html es la raíz
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Rutas que JAMÁS deben cachearse
const NEVER_CACHE = [
  "/api/gs",     // tu proxy Vercel
  "/config.js",  // config dinámico
];

// Helper
function isNeverCache(url) {
  return NEVER_CACHE.some((p) => url.pathname.startsWith(p));
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // borrar caches viejos
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("haruja-static-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo mismo origen
  if (url.origin !== self.location.origin) return;

  // NUNCA cachear API ni config
  if (isNeverCache(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // Navegaciones (HTML): NETWORK FIRST (clave para iOS/Android)
  const isNav = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isNav) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match(req);
          return cached || caches.match("/index.html");
        }
      })()
    );
    return;
  }

  // Estáticos (CSS/JS/IMG): CACHE FIRST con actualización en background
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) {
        event.waitUntil(
          (async () => {
            try {
              const fresh = await fetch(req);
              const cache = await caches.open(CACHE_NAME);
              cache.put(req, fresh.clone());
            } catch (_) {}
          })()
        );
        return cached;
      }

      // si no está cacheado, trae de red y guarda
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    })()
  );
});
