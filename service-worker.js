// Service worker básico para que el navegador permita instalar la PWA

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  clients.claim();
});

// De momento no hacemos caché, solo dejamos el SW registrado
self.addEventListener("fetch", (event) => {
  // Aquí más adelante podemos meter lógica offline si quieres
});
