// service-worker.js sencillo para la PWA de HarujaGdl

self.addEventListener('install', (event) => {
  // Tomar control lo antes posible
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Reclamar clientes existentes
  event.waitUntil(clients.claim());
});

// 👇 IMPORTANTE:
// No interceptamos ningún fetch.
// Así no rompemos las peticiones hacia script.google.com ni otros orígenes.
