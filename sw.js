// Service worker: keeps a copy of the whole app on the device so it opens and works with no connection.
//
// FILES is everything the app loads; VERSION is a fingerprint of their contents. Both are checked by
// tools/check-sw.mjs, and `node tools/check-sw.mjs --write` rewrites them after any file changes. A new VERSION is
// what makes installed copies pick up a deploy: the browser sees sw.js changed, downloads the new files into a fresh
// cache, and the page offers a reload (js/app.js). Progress is not stored here; it lives in localStorage.
const VERSION = 'c2e1f97a1aff';
const FILES = [
  './',
  'js/data/meta.js',
  'js/data/sources.js',
  'js/data/m0.js',
  'js/data/m1.js',
  'js/data/m2.js',
  'js/data/m3.js',
  'js/data/m4.js',
  'js/data/m5.js',
  'js/data/m6.js',
  'js/data/m7.js',
  'js/data/m8.js',
  'js/data/bosses.js',
  'js/vendor/breakscale-sim.js',
  'js/core.js',
  'js/sync.js',
  'js/local-ai.js',
  'js/judge.js',
  'js/hld.js',
  'js/rig.js',
  'js/labs.js',
  'js/riglab.js',
  'js/game.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'css/style.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'questions/module-1-foundations.json',
  'questions/module-5-ml-systems.json',
  'questions/ml-interview-deck.json'
];
const CACHE = 'sdq-' + VERSION;
// While developing on localhost the network copy wins, so an edit shows up on reload; the cache is only the fallback.
const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

self.addEventListener('install', (e) => {
  // cache: 'reload' goes past the browser's HTTP cache, so the copy stored is the one deployed now.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sdq-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page asks for this when the owner presses Reload on the "New version ready" notice.
self.addEventListener('message', (e) => { if (e.data === 'activate') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // GitHub's API and saves go straight out
  const scope = new URL(self.registration.scope).pathname, rel = url.pathname.startsWith(scope) ? url.pathname.slice(scope.length) : null;
  if (rel == null || rel.startsWith('api/') || rel.startsWith('progress/')) return;
  const key = rel === '' || rel === 'index.html' ? './' : url.origin + url.pathname;   // ignore ?query
  const cached = () => caches.open(CACHE).then((c) => c.match(key));
  if (DEV) e.respondWith(fetch(req).catch(() => cached().then((r) => r || Response.error())));
  else e.respondWith(cached().then((r) => r || fetch(req)));
});
