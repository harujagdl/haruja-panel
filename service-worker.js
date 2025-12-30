/* service-worker.js — HarujaGdl (SAFE CACHE) */
const SW_VERSION = "haruja-sw-2025-01-02"; // cambia el texto si vuelves a editar
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

  // 🚫 Nunca interceptar nada que no sea GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 🚫 NUNCA tocar APIs, JSONP ni config
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("script.google.com") ||
    url.pathname.endsWith(".json") ||
    url.pathname.includes("callback=") ||
    url.pathname.includes("action=")
  ) {
    return;
  }

  // 🚫 Solo mismo origen
  if (url.origin !== self.location.origin) return;

  // ✅ Navegación HTML → NETWORK FIRST (clave para iOS)
  const isNav =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    event.respondWith(
      fetch(req)
        .then((fresh) => {
          const copy = fresh.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return fresh;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("/index.html");
        })
    );
    return;
  }

  // ✅ Assets estáticos → CACHE FIRST
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((fresh) => {
        const copy = fresh.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return fresh;
      });
    })
  );
});
