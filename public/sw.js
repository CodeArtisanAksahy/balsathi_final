const CACHE_NAME = "balsathi-shell-v1";
const APP_SHELL = ["/login", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  // Never cache API responses or child-record pages: those are private and authorization-bound.
  if (requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(event.request)) || caches.match("/offline")),
  );
});
