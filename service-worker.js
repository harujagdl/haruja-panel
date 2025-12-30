/* service-worker.js  (HarujaGdl)
 * - Cachea solo assets estáticos
 * - NO cachea /api/gs (ni nada de /api/)
 * - Navegación: Network-first para que el index se actualice
 * - Activa inmediatamente nuevas versiones
 */

const CACHE_VERSION = "haruja-panel-v2025-12-30-01";
const STATIC_CACHE = `static-${CACHE_VERSION}`;

// Ajusta esta lista a tus archivos reales
const STATIC_ASSETS = [
  "/",                 // ojo: navegación
  "/index.html",
  "/manifest.webmanifest",
  "/config.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/registro-ventas.html",
  "/plan-lealtad.html",
  "/calculadora-pedidos.html",
  "/movimientos-ropa.html",
  "/scanner.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
      await self.skipWaiting(); // ✅ activa la nueva versión YA
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("static-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim(); // ✅ toma control inmediato
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ NUNCA cachear API
  if (url.pathname.startsWith("/api/")) {
    return; // deja que pase directo a la red
  }

  // ✅ Navegación (index/links): NETWORK FIRST para evitar “versión vieja”
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match(req);
          return cached || caches.match("/index.html");
        }
      })()
    );
    return;
  }

  // ✅ Assets: CACHE FIRST
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const fresh = await fetch(req);
      // Cachea solo GET y solo same-origin
      if (req.method === "GET" && url.origin === self.location.origin) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    })()
  );
});
