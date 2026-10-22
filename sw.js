/* =====================================================================
   LeoFX — sw.js ("service worker")
   ---------------------------------------------------------------------
   Pequeño programa que el navegador instala junto con la app (solo en la
   página web de GitHub, no en las copias del archivo). Guarda una copia
   de LeoFX y de lo último que descargó, para que la app se abra aunque
   no haya internet.

   Regla: siempre intenta primero internet (para tener lo más nuevo); si
   no hay conexión, usa la copia guardada.
   ===================================================================== */

const CACHE = "leofx-v1";
const ARCHIVOS_BASE = ["./", "LeoFX.html", "manifest.webmanifest", "icono-192.png", "icono-512.png"];

// Al instalarse: guardar los archivos básicos de la app.
self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS_BASE)).then(() => self.skipWaiting()));
});

// Al activarse: borrar copias de versiones anteriores.
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Cada pedido: primero internet; si funciona, se guarda una copia; si no
// hay conexión, se responde con la copia guardada.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  evento.respondWith(
    fetch(evento.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put(evento.request, copia)).catch(() => {});
        return respuesta;
      })
      .catch(() => caches.match(evento.request, { ignoreSearch: true }).then((guardada) => guardada || caches.match("LeoFX.html")))
  );
});
