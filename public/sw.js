// MVP service worker — network-first навигаци + version-тэй cache.
// VERSION-ийг өөрчлөхөд хуучин cache-ууд activate дээр устаж шинэчлэгдэнэ —
// эс бөгөөс анхны зочлолтын "/" HTML cache-д үүрд хөлдөж, deploy-ийн дараа
// offline fallback эвдэрхий (хуучин asset хэсэгтэй) хуудас үзүүлдэг байсан.
const VERSION = "v2";
const STATIC_CACHE = `mlbb-static-${VERSION}`;
const PAGE_CACHE = `mlbb-pages-${VERSION}`;
const PRECACHE = ["/", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // зөвхөн GET-ийг cache хийнэ
  const url = new URL(request.url);

  // Навигаци: network-first. Амжилттай хариу бүрийг PAGE_CACHE-д хуулж байдаг тул
  // offline үед install-ийн үеийнх биш ХАМГИЙН СҮҮЛД үзсэн хувилбар үйлчилнэ.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/"))
        )
    );
    return;
  }

  // Hash-тай (immutable) build asset-ууд: cache-first — offline fallback хуудас
  // өөрийн JS/CSS-ээ ачаалж чаддаг болно.
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
  }
});
