// Bump to refresh cached files
const VERSION = "reno-v1";
const PAGES = ["index", "diet", "exercise", "medication", "environment", "health", "results", "numbers", "donate"];
const CORE = [
  "/",
  ...PAGES.map((page) => `/${page}.html`),
  "/css/styles.css",
  "/js/app.js",
  "/js/layout.js",
  "/js/storage.js",
  "/js/i18n.js",
  "/js/profile.js",
  "/js/score.js",
  "/js/install.js",
  ...PAGES.filter((page) => page !== "donate").map((page) => `/js/pages/${page === "index" ? "home" : page}.js`),
  "/data/i18n/es.json",
  "/data/exercises.json",
  "/data/food-flags.json",
  "/data/nephro-meds.json",
  "/img/icons.svg",
  "/img/logo.png",
  "/img/logo-128.png",
  "/img/favicon.png",
  "/img/icon-192.png",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Live data always from network
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return;
  if (url.origin !== location.origin && !url.hostname.endsWith("fonts.googleapis.com") && !url.hostname.endsWith("fonts.gstatic.com")) return;

  // Network first, cache if offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match("/index.html")))
  );
});
