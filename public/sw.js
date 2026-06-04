// MVP service worker — энгийн network-first навигаци + статик cache.
// (Дараа Workbox/илүү боловсронгуй стратеги — Build Plan Phase 4.)
const CACHE = "mlbb-static-v1";
const PRECACHE = ["/", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // зөвхөн GET-ийг cache хийнэ

  // Навигаци: network-first, offline бол cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }
});
