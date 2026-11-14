// Service worker: keeps a copy of the whole app on the device so it opens and works with no connection.
//
// FILES is everything the app loads; VERSION is a fingerprint of their contents. Both are checked by
// tools/check-sw.mjs, and `node tools/check-sw.mjs --write` rewrites them after any file changes. A new VERSION is
// what makes installed copies pick up a deploy: the browser sees sw.js changed, downloads the new files into a fresh
// cache, and the page offers a reload (js/app.js). Progress is not stored here; it lives in localStorage.
const VERSION = '2220db669b96';
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
  'js/audio.js',
  'js/ladder.js',
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
  'questions/ml-interview-deck.json',
  'audio/music/study.mp3',
  'audio/music/arcade.mp3',
  'audio/music/boss.mp3',
  'audio/sfx/ok.mp3',
  'audio/sfx/ok2.mp3',
  'audio/sfx/bad.mp3',
  'audio/sfx/coin.mp3',
  'audio/sfx/tick.mp3',
  'audio/sfx/hit.mp3',
  'audio/sfx/boom.mp3',
  'audio/sfx/laser.mp3',
  'audio/sfx/levelup.mp3',
  'audio/sfx/win.mp3',
  'audio/sfx/lose.mp3',
  'audio/sfx/rankup.mp3',
  'audio/sfx/quest.mp3',
  'audio/voice/prepare_yourself.mp3',
  'audio/voice/fight.mp3',
  'audio/voice/combo.mp3',
  'audio/voice/multi_kill.mp3',
  'audio/voice/combo_breaker.mp3',
  'audio/voice/flawless_victory.mp3',
  'audio/voice/winner.mp3',
  'audio/voice/you_lose.mp3',
  'audio/voice/final_round.mp3',
  'audio/voice/game_over.mp3',
  'audio/voice/level_up.mp3',
  'audio/voice/new_highscore.mp3',
  'audio/voice/objective_achieved.mp3',
  'audio/voice/congratulations.mp3',
  'audio/voice/hurry_up.mp3',
  'audio/voice/time_over.mp3',
  'audio/voice/power_up.mp3',
  'audio/voice/mission_completed.mp3'
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
