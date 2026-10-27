// Service worker: gemmer appens filer, så den åbner hurtigt og også uden net.
// Hæv versionen ved hver ny udgivelse, så gamle filer ryddes op.
const CACHE = "stjerneven-v1";

const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/main.js",
  "js/state.js",
  "js/alien.js",
  "js/planet.js",
  "js/companion.js",
  "js/claude.js",
  "js/speech.js",
  "js/ui.js",
  "vendor/anthropic-sdk.js",
  "icons/icon.svg",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Svar straks fra cachen og hent en frisk kopi i baggrunden ("stale-while-revalidate").
// Kald til andre domæner (fx api.anthropic.com) røres ikke.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const fresh = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  });
  event.waitUntil(fresh.catch(() => {}));
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((cached) => cached || fresh));
});
