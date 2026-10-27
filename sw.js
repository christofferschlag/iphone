// Service worker: caches the app's files so it starts fast and works offline.
// Bump CACHE with every release so old files are cleaned up.
const CACHE = "peppy-v1";

const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "css/figures.css",
  "js/main.js",
  "js/state.js",
  "js/figures.js",
  "js/exercises.js",
  "js/progress.js",
  "js/player.js",
  "js/sound.js",
  "js/ui.js",
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

// Answer from the cache straight away and fetch a fresh copy in the background
// ("stale-while-revalidate"). Requests to other sites are left alone.
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
