// Service worker: caches the app's files so it starts fast and works offline.
// Bump CACHE with every release so old files are cleaned up.
const CACHE = "peppy-v2";

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
  "js/coach.js",
  "js/ui.js",
  "icons/icon.svg",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// The voice clips are listed in audio/clips.json. They are nice to have offline,
// so a clip that fails to download doesn't stop the install.
async function install() {
  const cache = await caches.open(CACHE);
  await cache.addAll(FILES);
  try {
    const clips = await (await fetch("audio/clips.json")).json();
    await Promise.all(clips.map((id) => cache.add(`audio/${id}.mp3`).catch(() => {})));
  } catch {
    /* clips load when needed instead */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(install());
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

function refresh(request) {
  return fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  });
}

// Answer from the cache straight away and fetch a fresh copy in the background
// ("stale-while-revalidate"). Requests to other sites are left alone.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const cached = caches.match(request, { ignoreSearch: true });
  // Voice clips only change with a new CACHE, so a cached clip is used as it is.
  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(cached.then((hit) => hit || refresh(request)));
    return;
  }
  const fresh = refresh(request);
  event.waitUntil(fresh.catch(() => {}));
  event.respondWith(cached.then((hit) => hit || fresh));
});
