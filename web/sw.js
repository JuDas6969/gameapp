// Offline-first service worker. Bump VERSION on every deploy (CI does this automatically).
const VERSION = "__VERSION__";
const CACHE = `raetsel-${VERSION}`;
const ASSETS = [
  "./", "index.html", "style.css", "app.js", "worker.js", "manifest.webmanifest",
  "engine/index.js", "engine/core.js", "engine/sudoku.js", "engine/queens.js", "engine/tango.js", "engine/zip.js", "engine/patches.js", "engine/nonogram.js", "engine/hashi.js", "engine/slitherlink.js", "engine/nurikabe.js", "engine/kakuro.js", "engine/woertle.js", "engine/wortpfad.js", "engine/treffpunkt.js", "data/treffpunkt.js", "engine/wortleiter.js", "data/wortleiter.js",
  "boards/index.js", "boards/_shared.js", "boards/sudoku.js", "boards/queens.js", "boards/tango.js", "boards/zip.js", "boards/patches.js", "boards/nonogram.js", "boards/hashi.js", "boards/slitherlink.js", "boards/nurikabe.js", "boards/kakuro.js", "boards/woertle.js", "boards/wortpfad.js", "boards/treffpunkt.js", "boards/wortleiter.js", "boards/_keyboard.js", "data/words.js",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-512-maskable.png",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; }).catch(() => hit);
      return hit || net;
    })
  );
});
