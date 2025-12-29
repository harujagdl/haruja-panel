// ===============================
// Haruja PWA Service Worker (v8)
// - NO cachea HTML (evita bugs en PWA con páginas dinámicas/JSONP)
// - Excluye páginas sensibles de cache
// ===============================

const CACHE_NAME = "haruja-static-v8";

// Solo assets realmente estáticos (NO HTML)
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/haruja-logo.png"
];

// Páginas que NO deben cachearse (HTML dinámico / JSONP / etc.)
const NO_CACHE_PAGES = [
  "/registro-ventas.html",
  "/comisiones.html",          // si tu página se llama así, déjalo
  "/calculadora-pedidos.html"  // si también te da lata, déjalo
];

// ---------- INSTALL ----------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ---------- ACTIVATE ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Permite forzar actualización desde la página
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---------- FETCH ----------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo controlamos requests del MISMO ORIGEN
  if (url.origin !== self.location.origin) return;

  // 1) Navegaciones (HTML)
  if (req.mode === "navigate" || req.destination === "document") {
    // Si es una página “sensible”, NO cachear nunca
    if (NO_CACHE_PAGES.includes(url.pathname)) {
      event.respondWith(fetch(req, { cache: "no-store" }));
      return;
    }

    // Para otras páginas: network-first (pero sin precachearlas)
    event.respondWith(networkFirstNoHTMLCache(req));
    return;
  }

  // 2) Assets estáticos: cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirstNoHTMLCache(request) {
  try {
    // cache: no-store evita que el navegador “pegue” la respuesta vieja
    return await fetch(request, { cache: "no-store" });
  } catch (e) {
    // fallback mínimo: intenta caché
    const cached = await caches.match(request);
    return cached || new Response("Sin conexión 😢", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const res = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, res.clone());
  return res;
}
