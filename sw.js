/* Kong Training offline worker.
   Online: always fetch the latest files (skipping the browser's HTTP cache), and keep a copy.
   Offline: serve the saved copy, so the app still opens at the gym with no signal.
   It only ever touches this site's own files; nothing is sent anywhere. */
const CACHE = "kong-v3";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, {cache: "reload"}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req, {cache: "no-cache"});
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, {ignoreSearch: true}) || (req.mode === "navigate" && await c.match("index.html"));
      if (hit) return hit;
      throw err;
    }
  })());
});
