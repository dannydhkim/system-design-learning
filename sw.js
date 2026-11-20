// Service worker: keeps a copy of the whole app on the device so it opens and works with no connection.
//
// FILES is everything the app loads; VERSION is a fingerprint of their contents. Both are checked by
// tools/check-sw.mjs, and `node tools/check-sw.mjs --write` rewrites them after any file changes. A new VERSION is
// what makes installed copies pick up a deploy: the browser sees sw.js changed, downloads the new files into a fresh
// cache, and the page offers a reload (js/app.js). Progress is not stored here; it lives in localStorage.
const VERSION = 'd2e3fd9b1ade';
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
  'js/data/m9.js',
  'js/data/d0.js',
  'js/data/d1.js',
  'js/data/d2.js',
  'js/data/d3.js',
  'js/data/d4.js',
  'js/data/d5.js',
  'js/data/d6.js',
  'js/data/d7.js',
  'js/data/d8.js',
  'js/data/d9.js',
  'js/data/frames.js',
  'js/data/bosses.js',
  'js/vendor/breakscale-sim.js',
  'js/core.js',
  'js/audio.js',
  'js/ladder.js',
  'js/player.js',
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
  'audio/music/study1.mp3',
  'audio/music/study2.mp3',
  'audio/music/study3.mp3',
  'audio/music/study4.mp3',
  'audio/music/study5.mp3',
  'audio/music/study6.mp3',
  'audio/music/study7.mp3',
  'audio/music/study8.mp3',
  'audio/music/study9.mp3',
  'audio/music/arcade1.mp3',
  'audio/music/arcade2.mp3',
  'audio/music/arcade3.mp3',
  'audio/music/arcade4.mp3',
  'audio/music/arcade5.mp3',
  'audio/music/arcade6.mp3',
  'audio/music/arcade7.mp3',
  'audio/music/arcade8.mp3',
  'audio/music/arcade9.mp3',
  'audio/music/boss1.mp3',
  'audio/music/boss2.mp3',
  'audio/music/boss3.mp3',
  'audio/music/boss4.mp3',
  'audio/music/boss5.mp3',
  'audio/music/boss6.mp3',
  'audio/voice/arcade/prepare_yourself.mp3',
  'audio/voice/arcade/fight.mp3',
  'audio/voice/arcade/combo.mp3',
  'audio/voice/arcade/combo_breaker.mp3',
  'audio/voice/arcade/flawless_victory.mp3',
  'audio/voice/arcade/winner.mp3',
  'audio/voice/arcade/you_lose.mp3',
  'audio/voice/arcade/final_round.mp3',
  'audio/voice/arcade/game_over.mp3',
  'audio/voice/arcade/level_up.mp3',
  'audio/voice/arcade/new_highscore.mp3',
  'audio/voice/arcade/objective_achieved.mp3',
  'audio/voice/arcade/congratulations.mp3',
  'audio/voice/arcade/hurry_up.mp3',
  'audio/voice/arcade/time_over.mp3',
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
  'audio/voice/female/go.mp3',
  'audio/voice/female/ready.mp3',
  'audio/voice/female/final_round.mp3',
  'audio/voice/female/mission_completed.mp3',
  'audio/voice/female/mission_failed.mp3',
  'audio/voice/female/congratulations.mp3',
  'audio/voice/female/new_highscore.mp3',
  'audio/voice/female/game_over.mp3',
  'audio/voice/female/time_over.mp3',
  'audio/voice/female/hurry_up.mp3',
  'audio/voice/female/level_up.mp3',
  'audio/voice/female/objective_achieved.mp3',
  'audio/voice/male/go.mp3',
  'audio/voice/male/ready.mp3',
  'audio/voice/male/final_round.mp3',
  'audio/voice/male/mission_completed.mp3',
  'audio/voice/male/mission_failed.mp3',
  'audio/voice/male/congratulations.mp3',
  'audio/voice/male/new_highscore.mp3',
  'audio/voice/male/game_over.mp3',
  'audio/voice/male/time_over.mp3',
  'audio/voice/male/hurry_up.mp3',
  'audio/voice/male/level_up.mp3',
  'audio/voice/male/objective_achieved.mp3'
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
    // Only old copies of the app itself (sdq-<12 hex digits>); other caches, such as the offline-AI library, stay.
    .then((keys) => Promise.all(keys.filter((k) => /^sdq-[0-9a-f]{12}$/.test(k) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page asks for this when the owner presses Reload on the "New version ready" notice.
self.addEventListener('message', (e) => {
  if (e.data === 'activate') self.skipWaiting();
  // Settings asks which version this worker is, to compare with the deployed one.
  if (e.data === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage({ version: VERSION });
});

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
