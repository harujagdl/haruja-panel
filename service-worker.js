/* service-worker.js — HarujaGdl (BLINDADO) */
const SW_VERSION = "haruja-sw-2025-01-01-v3"; // <-- súbele v1/v2/v3 cada cambio
const CACHE_NAME = `haruja-static-${SW_VERSION}`;

// Solo estáticos (NO HTML, NO API)
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/config.js",
];

// Rutas que JAMÁS se deben cachear
const NEVER_CACHE_PREFIXES = [
  "/api/",       // tu proxy Vercel
];

function isNeverCache(url) {
  return NEVER_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p));
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
      // limpia caches viejos
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

  // Nunca cachear /api/
  if (isNeverCache(url)) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // ✅ HTML / navegaciones: NETWORK FIRST (clave para iOS/Android)
  const isNav =
    req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          return fresh;
        } catch (e) {
          // si no hay red, cae a cache si existe (pero NO guardamos HTML)
          return (await caches.match("/")) || (await caches.match("/index.html"));
        }
      })()
    );
    return;
  }

  // ✅ Estáticos: CACHE FIRST + refresh
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

      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return cached;
      }
    })()
  );
});
