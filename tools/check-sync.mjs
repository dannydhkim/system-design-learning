#!/usr/bin/env node
// Cloud sync checks. Run: node tools/check-sync.mjs
//
// Runs the real js/core.js and js/sync.js for two or three simulated devices against an in-memory stand-in for the
// GitHub Contents API (same status codes: 404 for no file, 409 for a write that names a stale version). Fails
// (exit 1) when
//   · progress made offline on two devices does not add up after they sync, in either order
//   · history both devices already shared is counted twice
//   · syncing again with nothing new writes anything, or changes anything
//   · a write that loses a race overwrites the other device instead of merging and retrying
//   · a reset is undone by an older copy, or silently erases progress that was never synced
//   · a rejected token keeps being retried
//   · the token turns up in a request body, the online file, or the saved progress
//   · a public repository, or a file that is not a progress file, gets written to
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const errors = [];
let section = '';
const check = (ok, msg) => { if (!ok) errors.push(section + ': ' + msg); };
const eq = (got, want, msg) => check(JSON.stringify(got) === JSON.stringify(want), `${msg} (got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)})`);
const TOKEN = 'github_pat_SECRET_do_not_leak_0123456789';

/* ---------- a stand-in for GitHub ---------- */
function makeHub() {
  const hub = {
    file: null, version: 0, isPrivate: true, exists: true, requests: [], offline: false, reject: 0, beforePut: null,
    sha() { return 'sha' + hub.version; },
    setFile(text) { hub.file = text; hub.version++; },
    state() { return hub.file == null ? null : JSON.parse(hub.file); },
    puts() { return hub.requests.filter((r) => r.method === 'PUT').length; },
    fetch(url, o = {}) {
      const method = o.method || 'GET';
      if (hub.offline) return Promise.reject(new TypeError('Failed to fetch'));
      hub.requests.push({ method, url, body: o.body || '', keepalive: !!o.keepalive });
      const res = (status, json) => Promise.resolve({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: () => Promise.resolve(json) });
      if ((o.headers || {}).Authorization !== 'Bearer ' + TOKEN || hub.reject) return res(hub.reject || 401, {});
      if (!hub.exists) return res(404, {});
      if (/\/repos\/[^/]+\/[^/]+$/.test(url)) return res(200, { private: hub.isPrivate });
      if (method === 'GET') return hub.file == null ? res(404, {}) : res(200, { sha: hub.sha(), content: Buffer.from(hub.file, 'utf8').toString('base64').replace(/(.{60})/g, '$1\n') });
      if (hub.beforePut) { const f = hub.beforePut; hub.beforePut = null; f(); }
      const body = JSON.parse(o.body);
      if (hub.file != null && !body.sha) return res(422, {});
      if (hub.file != null && body.sha !== hub.sha()) return res(409, {});
      if (hub.file == null && body.sha) return res(409, {});
      hub.setFile(Buffer.from(body.content, 'base64').toString('utf8'));
      return res(200, { content: { sha: hub.sha() } });
    }
  };
  return hub;
}

/* ---------- a device: its own storage, its own copy of the app ---------- */
const scripts = [...read('index.html').matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((f) => /js\/data\/|js\/core\.js|js\/sync\.js/.test(f));
const sources = scripts.map((f) => [f, new vm.Script(read(f), { filename: f })]);
function node() {
  const el = { nodeType: 1, children: [], style: {}, className: '', appendChild(c) { el.children.push(c); return c; }, remove() {}, setAttribute() {}, addEventListener() {}, classList: { add() {}, remove() {} } };
  return el;
}
async function device(hub, storage = {}) {
  const listeners = {};
  const on = (t, f) => { (listeners[t] = listeners[t] || []).push(f); };
  const env = {
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, btoa, atob, escape, unescape,
    localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } },
    location: { protocol: 'http:', hash: '' }, navigator: {},
    document: { addEventListener: on, visibilityState: 'visible', body: node(), activeElement: null, getElementById: node, createElement: node, createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }) },
    matchMedia: () => ({ matches: true }),
    fetch: (url, o) => (String(url).startsWith('https://api.github.com/') ? hub.fetch(url, o) : Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }))
  };
  env.window = env; env.addEventListener = on;
  vm.createContext(env);
  for (const [, s] of sources) s.runInContext(env);
  const SD = env.SD;
  SD.beep = SD.confetti = () => {};
  await SD.load(); await SD.initContent(); await SD.cloud.start();   // as js/app.js does at launch
  return { SD, storage, fire: (t) => (listeners[t] || []).forEach((f) => f({})), state: () => JSON.parse(JSON.stringify(SD.state)) };
}
const withToken = (extra = {}) => ({ 'sdq.github': JSON.stringify({ token: TOKEN, ...extra }) });
const TOPIC = '1.1';
// Study: XP, a counted review, and right/wrong answers on one topic.
function study(d, xp, right = 0, wrong = 0) {
  for (let i = 0; i < right; i++) d.SD.hit(true, TOPIC);
  for (let i = 0; i < wrong; i++) d.SD.hit(false, TOPIC);
  d.SD.award(xp, { flat: true, count: 'reviews' });
}
const totals = (d) => { const s = d.SD.state, t = s.topics[TOPIC] || { right: 0, wrong: 0 }; return { xp: s.xp, today: s.days[d.SD.today()] || 0, reviews: s.counts.reviews || 0, right: t.right, wrong: t.wrong }; };
// Progress saved by a version of the app from before per-device tallies.
const oldProgress = () => ({ 'sdq.state.v1': JSON.stringify({ v: 1, updatedAt: 1000, resetAt: 0, xp: 200, combo: 0, bestCombo: 3, streak: { count: 1, best: 2, last: '2026-11-01' }, days: { '2026-11-01': 200 }, topics: { [TOPIC]: { done: { learn: '2026-11-01' }, right: 4, wrong: 1, notes: {} } }, cards: {}, hi: {}, badges: {}, counts: { reviews: 7 }, quests: { date: null, prog: {}, done: {} }, runs: {}, settings: { sound: true } }) });

/* ---------- 1. offline progress on two devices adds up ---------- */
for (const order of ['laptop first', 'phone first']) {
  section = 'adding up, ' + order;
  const hub = makeHub();
  const a = await device(hub, { ...withToken({ label: 'Laptop' }), ...oldProgress() }), b = await device(hub, { ...withToken(), ...oldProgress() });
  eq(totals(a), { xp: 200, today: 0, reviews: 7, right: 4, wrong: 1 }, 'progress from before tallies must load unchanged');
  hub.offline = true;
  study(a, 100, 3, 1); study(b, 50, 2, 2);
  await a.SD.cloud.syncNow();
  eq(a.SD.cloud.status, 'offline', 'a sync with no connection must report offline');
  eq(totals(a).xp, 300, 'progress made offline must be kept on the device');
  hub.offline = false;
  const [x, y] = order === 'laptop first' ? [a, b] : [b, a];
  await x.SD.cloud.syncNow(); await y.SD.cloud.syncNow(); await x.SD.cloud.syncNow();
  const want = { xp: 350, today: 150, reviews: 9, right: 9, wrong: 4 };
  eq(totals(a), want, 'laptop totals after syncing'); eq(totals(b), want, 'phone totals after syncing');
  eq(a.SD.cloud.status, 'synced', 'laptop status'); eq(b.SD.cloud.status, 'synced', 'phone status');
  eq(a.SD.stable(a.SD.state), b.SD.stable(b.SD.state), 'both devices must hold the same progress');
  eq(a.SD.stable(a.SD.normalize(hub.state())), a.SD.stable(a.SD.state), 'the online file must hold the same progress');
  check(hub.requests.some((r) => r.method === 'PUT' && JSON.parse(r.body).message === 'Sync from Laptop'), 'the commit message should name the device');

  section = 'syncing again, ' + order;
  const puts = hub.puts(), before = a.SD.stable(a.SD.state), fileBefore = hub.file;
  await a.SD.cloud.syncNow(); await b.SD.cloud.syncNow(); await a.SD.cloud.syncNow();
  eq(hub.puts(), puts, 'nothing new must mean no write');
  eq(a.SD.stable(a.SD.state), before, 'nothing new must change nothing on the device');
  eq(hub.file, fileBefore, 'nothing new must change nothing online');

  section = 'a third device joining, ' + order;
  const c = await device(hub, withToken());
  await c.SD.cloud.syncNow();
  eq(totals(c), want, 'a new device must receive the totals');
  study(c, 25); await c.SD.cloud.syncNow(); await a.SD.cloud.syncNow();
  eq(totals(a).xp, 375, 'and add its own on top');
}

/* ---------- 2. a write that loses a race ---------- */
{
  section = 'losing a race';
  const hub = makeHub();
  const a = await device(hub, withToken()), b = await device(hub, withToken());
  study(a, 10); await a.SD.cloud.syncNow(); await b.SD.cloud.syncNow();
  study(a, 100, 1); study(b, 50, 0, 1);
  // The phone writes in the gap between the laptop reading the file and writing it back.
  let raced = false;
  hub.beforePut = () => { raced = true; const s = b.state(); hub.setFile(JSON.stringify(s)); };
  await a.SD.cloud.syncNow();
  check(raced, 'the race was not simulated');
  eq(totals(a).xp, 160, 'the laptop must merge what the phone wrote and keep its own');
  eq(a.SD.normalize(hub.state()).xp, 160, 'the online file must hold both, not just the last writer');
  eq(a.SD.cloud.status, 'synced', 'status after the retry');
  await b.SD.cloud.syncNow();
  eq(totals(b), totals(a), 'both devices converge');
}

/* ---------- 3. leaving the page ---------- */
{
  section = 'leaving the page';
  const hub = makeHub();
  const a = await device(hub, withToken()), b = await device(hub, withToken());
  study(a, 10); await a.SD.cloud.syncNow();
  study(a, 5);
  a.fire('pagehide'); await new Promise((r) => setTimeout(r, 5));
  const last = hub.requests[hub.requests.length - 1];
  check(last.method === 'PUT' && last.keepalive, 'hiding the page with unsynced changes must send one keepalive write');
  eq(a.SD.normalize(hub.state()).xp, 15, 'that write must land when nobody else wrote since');
  // Now the other device writes first; the leaving write names a stale version and must be refused, not win.
  await a.SD.cloud.syncNow();
  study(a, 7);
  await b.SD.cloud.syncNow(); study(b, 100); await b.SD.cloud.syncNow();
  a.fire('pagehide'); await new Promise((r) => setTimeout(r, 5));
  eq(b.SD.normalize(hub.state()).xp, 115, 'a leaving write must not overwrite a newer online copy');
  await a.SD.cloud.syncNow();
  eq(totals(a).xp, 122, 'the next sync merges both');
}

/* ---------- 4. resets ---------- */
{
  section = 'a reset with everything synced';
  const hub = makeHub();
  const a = await device(hub, withToken()), b = await device(hub, withToken());
  study(a, 100); await a.SD.cloud.syncNow(); await b.SD.cloud.syncNow();
  a.SD.resetState(); a.SD.cloud.ackReset();
  await a.SD.cloud.syncNow();
  eq(a.SD.normalize(hub.state()).xp, 0, 'a confirmed reset must reach the online copy');
  await b.SD.cloud.syncNow();
  eq(totals(b).xp, 0, 'and the other device, whose progress was all synced');
  eq(b.SD.cloud.status, 'synced', 'without asking');
  study(b, 30); await b.SD.cloud.syncNow(); await a.SD.cloud.syncNow();
  eq(totals(a).xp, 30, 'progress after the reset counts from zero on both');

  section = 'a reset while the other device has unsynced progress';
  a.SD.resetState(); a.SD.cloud.ackReset(); await a.SD.cloud.syncNow();
  study(b, 40);
  await b.SD.cloud.syncNow();
  eq(b.SD.cloud.status, 'conflict', 'the device with unsynced progress must be asked');
  eq(totals(b).xp, 70, 'and keep its progress until the owner answers');
  eq(a.SD.normalize(hub.state()).xp, 0, 'and write nothing meanwhile');
  const reqs = hub.requests.length;
  b.fire('online'); await new Promise((r) => setTimeout(r, 5));
  eq(hub.requests.length, reqs, 'sync stays paused until the owner answers');
  await b.SD.cloud.resolve('device');
  eq(b.SD.cloud.status, 'synced', 'status after choosing this device');
  await a.SD.cloud.syncNow();
  eq(totals(a).xp, 70, 'the copy that was kept reaches the other device');
  eq(a.SD.cloud.status, 'synced', 'which had nothing unsynced, so it is not asked');

  section = 'a device reset before sync was set up';
  const hub2 = makeHub();
  const c = await device(hub2, withToken()); study(c, 500); await c.SD.cloud.syncNow();
  const d = await device(hub2, {}); d.SD.resetState(); study(d, 5);
  d.storage['sdq.github'] = JSON.stringify({ token: TOKEN });
  await d.SD.cloud.syncNow();
  eq(d.SD.cloud.status, 'conflict', 'a reset nobody confirmed for sync must not erase the online copy unasked');
  eq(d.SD.normalize(hub2.state()).xp, 500, 'the online copy is untouched');
  await d.SD.cloud.resolve('online');
  eq(totals(d).xp, 500, 'choosing the online copy brings it to this device');
  await c.SD.cloud.syncNow();
  eq(totals(c).xp, 500, 'and leaves the other device as it was');
  study(c, 1); study(d, 2); await c.SD.cloud.syncNow(); await d.SD.cloud.syncNow(); await c.SD.cloud.syncNow();
  eq([totals(c).xp, totals(d).xp], [503, 503], 'later progress adds up as usual');
}

/* ---------- 5. refusals ---------- */
{
  section = 'a rejected token';
  const hub = makeHub();
  const a = await device(hub, withToken());
  study(a, 10);
  hub.reject = 401;
  await a.SD.cloud.syncNow();
  eq(a.SD.cloud.status, 'auth', 'status');
  const n = hub.requests.length;
  a.fire('online'); a.fire('focus'); study(a, 5); a.fire('visibilitychange'); await new Promise((r) => setTimeout(r, 5));
  eq(hub.requests.length, n, 'a rejected token must not be retried');
  eq(totals(a).xp, 15, 'saving on the device carries on');
  hub.reject = 0;
  a.SD.cloud.setConf('token', TOKEN); await new Promise((r) => setTimeout(r, 5));
  eq(a.SD.cloud.status, 'synced', 'entering a token starts sync again');
  eq(a.SD.normalize(hub.state()).xp, 15, 'and the progress goes online');

  section = 'a public repository';
  const pub = makeHub(); pub.isPrivate = false;
  const b = await device(pub, withToken()); study(b, 10);
  await b.SD.cloud.syncNow();
  eq(b.SD.cloud.status, 'setup', 'status');
  eq(pub.puts(), 0, 'progress must never be written to a public repository');

  section = 'a missing repository';
  const gone = makeHub(); gone.exists = false;
  const c = await device(gone, withToken()); study(c, 10);
  await c.SD.cloud.syncNow();
  eq(c.SD.cloud.status, 'setup', 'status');

  section = 'a file that is not progress';
  const other = makeHub(); other.setFile('{"name":"something else"}');
  const d = await device(other, withToken()); study(d, 10);
  await d.SD.cloud.syncNow();
  eq(d.SD.cloud.status, 'setup', 'status');
  eq(other.file, '{"name":"something else"}', 'the file must not be overwritten');

  section = 'no token';
  const none = makeHub();
  const e = await device(none, {}); study(e, 10);
  eq(e.SD.cloud.status, 'off', 'status');
  eq(none.requests.length, 0, 'without a token nothing is sent');

  section = 'the old setting that pointed at the public code repository';
  const f = await device(makeHub(), { 'sdq.github': JSON.stringify({ owner: 'dannydhkim', repo: 'system-design-learning', branch: 'main', path: 'progress/progress.json', token: TOKEN }) });
  const conf = f.SD.cloud.conf();
  eq([conf.repo, conf.path, conf.token], ['system-design-progress', 'progress.json', TOKEN], 'must move to the private defaults');
}

/* ---------- 6. the token stays put ---------- */
{
  section = 'the token';
  const hub = makeHub();
  const a = await device(hub, withToken({ label: 'Laptop' }));
  study(a, 10); await a.SD.cloud.syncNow(); study(a, 5); a.fire('pagehide'); await new Promise((r) => setTimeout(r, 5));
  check(hub.requests.length >= 4, 'expected requests to inspect');
  for (const r of hub.requests) {
    check(!r.body.includes(TOKEN) && !r.url.includes(TOKEN), 'the token must not appear in a request body or URL');
    if (r.body) check(!Buffer.from(JSON.parse(r.body).content, 'base64').toString('utf8').includes(TOKEN), 'the token must not appear in the file that is written');
  }
  check(!hub.file.includes(TOKEN) && !hub.file.includes('sdq.github'), 'the token must not be in the online file');
  check(!a.storage['sdq.state.v1'].includes(TOKEN), 'the token must not be in the saved progress');
  check(!JSON.stringify(a.SD.cloud.describe()).includes(TOKEN) && !a.SD.cloud.text.includes(TOKEN), 'the token must not be in a status message');
}

/* ---------- 7. the merge itself ---------- */
{
  section = 'merge';
  const hub = makeHub();
  const a = await device(hub, oldProgress()), b = await device(hub, oldProgress());
  study(a, 100, 2); study(b, 50, 0, 3);
  const SD = a.SD, x = SD.normalize(a.state()), y = SD.normalize(b.state());
  const xy = SD.merge(x, y), yx = SD.merge(y, x);
  eq(SD.stable(xy), SD.stable(yx), 'merging must give the same result in either order');
  eq(xy.xp, 350, 'shared history once, plus what each device added');
  eq(SD.stable(SD.merge(xy, x)), SD.stable(xy), 'merging a copy in again must change nothing');
  eq(SD.stable(SD.merge(xy, xy)), SD.stable(xy), 'merging a copy with itself must change nothing');
  eq(Object.keys(xy.tally).length, 3, 'one tally for the shared history and one per device');
  eq(SD.normalize(JSON.parse(JSON.stringify(xy))).xp, 350, 'loading the merged copy again must not change the totals');
  // A copy saved by an older version of the app that added to the totals directly.
  const old = JSON.parse(JSON.stringify(xy)); old.xp += 30; old.counts.reviews += 1;
  const fixed = SD.normalize(old);
  eq([fixed.xp, fixed.counts.reviews], [380, xy.counts.reviews + 1], 'totals beyond the tallies must be kept');
  // Importing a file keeps its totals.
  a.SD.replaceState(JSON.parse(JSON.stringify(xy)));
  eq(totals(a).xp, 350, 'an import must keep the totals of the file');
  study(a, 10);
  eq(totals(a).xp, 360, 'and count on from there');
  // Malformed tallies do not break a load.
  const bad = SD.normalize({ v: 1, xp: 5, tally: { __proto__: { xp: 9 }, d1: { xp: 'many', days: { x: -3, y: 2 }, counts: null, topics: { t: 7 } }, d2: 'nope' } });
  eq([bad.xp, bad.days.y, Object.keys(bad.tally).sort()], [5, 2, ['d1', 'legacy']], 'a malformed tally must be coerced, not crash');
}

if (errors.length) { errors.forEach((e) => console.error('✗ ' + e)); console.error(`\n${errors.length} problem(s)`); process.exit(1); }
console.log('✓ cloud sync: totals add up across devices in either order, races merge, resets ask before erasing, refusals stop cleanly, the token stays on the device');
