// Core: DOM helpers, sound, spaced repetition, persistent state, XP/streak/quest/badge logic.
window.SD = window.SD || {};
(function (SD) {
  'use strict';

  /* ---------- DOM helpers ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag), i, k;
    attrs = attrs || {};
    for (k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { add(el, x); });
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    var abs = Math.abs(n);
    if (abs >= 100 || abs === Math.round(abs)) return Math.round(n).toLocaleString('en-US');
    return (Math.round(n * 100) / 100).toLocaleString('en-US');
  }
  // True when focus is inside el or has fallen back to the page. A component that rebuilds itself after a click checks
  // this first, so it can put focus back on one of its own controls without taking it from wherever the player moved it.
  function ownsFocus(el) { var a = document.activeElement; return !a || a === document.body || el.contains(a); }
  SD.h = h; SD.clear = clear; SD.shuffle = shuffle; SD.pick = pick; SD.fmt = fmt; SD.ownsFocus = ownsFocus;

  /* ---------- Toasts, confetti, sound ---------- */
  SD.toast = function (msg, cls) {
    var box = document.getElementById('toasts');
    var t = h('div', { class: 'toast ' + (cls || '') }, msg);
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  };
  SD.confetti = function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var layer = h('div', { class: 'confetti' });
    var bits = ['🎉', '⭐', '✨', '🟡', '🔷', '🟢'];
    for (var i = 0; i < 26; i++) {
      var s = h('span', {}, pick(bits));
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDelay = Math.random() * 0.4 + 's';
      s.style.fontSize = 14 + Math.random() * 16 + 'px';
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 2200);
  };
  var actx;
  SD.beep = function (kind) {
    if (!SD.state || !SD.state.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var notes = { ok: [660, 880], bad: [220, 180], win: [523, 659, 784, 1047], tick: [520] }[kind] || [440];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
        g.gain.value = 0.05; o.connect(g); g.connect(actx.destination);
        var t0 = actx.currentTime + i * 0.09;
        o.start(t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14); o.stop(t0 + 0.15);
      });
    } catch (e) { /* audio is optional */ }
  };

  /* ---------- Dates ---------- */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function today() { return iso(new Date()); }
  function addDays(dateStr, n) { var p = dateStr.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return iso(d); }
  SD.today = today; SD.addDays = addDays;

  /* ---------- Spaced repetition (SM-2 style, same fields as questions/*.json) ---------- */
  // grade: 0 again · 1 hard · 2 good · 3 easy
  SD.srs = {
    next: function (c, grade) {
      c = c ? { iv: c.iv, ef: c.ef, reps: c.reps } : { iv: 0, ef: 2.5, reps: 0 };
      if (grade === 0) { c.reps = 0; c.iv = 1; c.ef = Math.max(1.3, c.ef - 0.2); }
      else if (grade === 1) { c.iv = Math.max(1, Math.round(c.iv * 1.2)); c.ef = Math.max(1.3, c.ef - 0.15); c.reps++; }
      else {
        if (c.reps === 0) c.iv = grade === 3 ? 3 : 1;
        else if (c.reps === 1) c.iv = grade === 3 ? 5 : 3;
        else c.iv = Math.max(c.iv + 1, Math.round(c.iv * c.ef * (grade === 3 ? 1.3 : 1)));
        if (grade === 3) c.ef += 0.15;
        c.reps++;
      }
      return c;
    },
    label: function (c, grade) { var d = SD.srs.next(c, grade).iv; return d === 1 ? '1 day' : d + ' days'; }
  };

  /* ---------- State ---------- */
  var KEY = 'sdq.state.v1';
  // resetAt: when this progress was last reset or replaced by an import. A copy from before that is discarded
  // rather than merged, so a deliberate reset is not undone by another tab or by progress/progress.json.
  function blank() {
    return {
      v: 1, updatedAt: 0, resetAt: 0, xp: 0, combo: 0, bestCombo: 0,
      streak: { count: 0, best: 0, last: null }, days: {},
      topics: {}, cards: {}, hi: {}, badges: {}, counts: {},
      quests: { date: null, prog: {}, done: {} },
      runs: {},   // a boss fight left part-way: boss id -> { i: next phase, scores: [0..1 per phase done], ms: time spent }
      tally: {},  // what each device has added to the running totals (see "Running totals" below)
      settings: { sound: true }
    };
  }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function num(x) { return typeof x === 'number' && isFinite(x) ? x : null; }
  function str(x) { return typeof x === 'string' ? x : null; }
  // The entries of a map that survive `fix` (which returns null to drop one). Anything that is not a map becomes {}.
  function only(o, fix) {
    var r = {};
    if (isObj(o)) Object.keys(o).forEach(function (k) { var v = k === '__proto__' ? null : fix(o[k]); if (v != null) r[k] = v; });
    return r;
  }
  function topicRec(t) {
    if (!isObj(t)) return null;
    var r = {}, k;
    for (k in t) if (num(t[k]) != null) r[k] = t[k];   // right, wrong and the per-station bests
    r.right = num(t.right) || 0; r.wrong = num(t.wrong) || 0;
    r.done = only(t.done, str); r.notes = only(t.notes, str);
    return r;
  }
  function runRec(r) {
    if (!isObj(r) || num(r.i) == null || r.i < 1 || !Array.isArray(r.scores) || r.scores.length !== r.i) return null;
    if (r.scores.some(function (x) { return num(x) == null || x < 0 || x > 1; })) return null;
    return { i: r.i, scores: r.scores.slice(), ms: Math.max(0, num(r.ms) || 0) };
  }
  /* ---------- Running totals ----------
     xp, days[date], counts[k] and each topic's right/wrong are sums that every answer adds to. Two devices used
     offline from the same starting point must add up after a sync (100 XP on one and 50 on the other is 150), so the
     state keeps a tally per device: tally[deviceId] = { xp, days, counts, topics: { id: { right, wrong } } }.
     A device only ever adds to its own entry, so merging two copies takes the larger of each number per device and
     nothing is lost or counted twice. The totals the rest of the app reads (s.xp and so on) are the sums across
     entries, recomputed by derive(). Totals from before tallies existed sit in one shared entry, 'legacy', so two
     devices that carry the same old history count it once. Nothing writes a total directly: use gain/count/tallyHit. */
  var DEVKEY = 'sdq.device', device = null;   // kept out of the progress file: it names this browser, not the progress
  function deviceId() {
    if (device) return device;
    try { device = localStorage.getItem(DEVKEY); } catch (e) { /* storage may be unavailable */ }
    if (!device || !/^d[0-9a-z]{6,}$/.test(device)) {
      device = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(DEVKEY, device); } catch (e) { /* this session only, then */ }
    }
    return device;
  }
  SD.deviceId = deviceId;
  function pos(x) { var n = num(x); return n != null && n > 0 ? n : null; }
  function tallyRec(t) {
    if (!isObj(t)) return null;
    return { xp: pos(t.xp) || 0, days: only(t.days, pos), counts: only(t.counts, pos),
      topics: only(t.topics, function (x) { return isObj(x) ? { right: pos(x.right) || 0, wrong: pos(x.wrong) || 0 } : null; }) };
  }
  function sumTally(tally) {
    var r = { xp: 0, days: {}, counts: {}, topics: {} };
    Object.keys(tally).forEach(function (d) {
      var e = tally[d], k;
      r.xp += e.xp;
      for (k in e.days) r.days[k] = (r.days[k] || 0) + e.days[k];
      for (k in e.counts) r.counts[k] = (r.counts[k] || 0) + e.counts[k];
      for (k in e.topics) { var x = r.topics[k] || (r.topics[k] = { right: 0, wrong: 0 }); x.right += e.topics[k].right; x.wrong += e.topics[k].wrong; }
    });
    return r;
  }
  // Set the totals the app reads from the tallies.
  function derive(s) {
    var sum = sumTally(s.tally), id;
    s.xp = sum.xp; s.days = sum.days; s.counts = sum.counts;
    for (id in sum.topics) if (!own(s.topics, id)) s.topics[id] = { done: {}, right: 0, wrong: 0, notes: {} };
    for (id in s.topics) if (own(s.topics, id)) { s.topics[id].right = own(sum.topics, id) ? sum.topics[id].right : 0; s.topics[id].wrong = own(sum.topics, id) ? sum.topics[id].wrong : 0; }
    return s;
  }
  // The totals of a state whose totals are already normalized, as one tally entry.
  function totalsOf(s) {
    var e = { xp: s.xp, days: only(s.days, pos), counts: only(s.counts, pos), topics: {} };
    Object.keys(s.topics).forEach(function (id) { var t = s.topics[id]; if (t.right > 0 || t.wrong > 0) e.topics[id] = { right: Math.max(0, t.right), wrong: Math.max(0, t.wrong) }; });
    return e;
  }
  // A copy written before tallies existed has totals and no tally: they become the shared 'legacy' entry. The same
  // goes for whatever a copy's totals hold beyond its tallies (an older version of the app added to them directly).
  function fixTally(s) {
    var had = isObj(s.tally), t = had ? only(s.tally, tallyRec) : {}, tot = totalsOf(s), sum = sumTally(t), k;
    var lg = t.legacy || { xp: 0, days: {}, counts: {}, topics: {} }, extra = false;
    function top(map, sums, key, v) { var d = v - (sums[key] || 0); if (d > 0) { map[key] = (map[key] || 0) + d; extra = true; } }
    if (tot.xp > sum.xp) { lg.xp += tot.xp - sum.xp; extra = true; }
    for (k in tot.days) top(lg.days, sum.days, k, tot.days[k]);
    for (k in tot.counts) top(lg.counts, sum.counts, k, tot.counts[k]);
    for (k in tot.topics) {
      var have = sum.topics[k] || { right: 0, wrong: 0 }, dr = tot.topics[k].right - have.right, dw = tot.topics[k].wrong - have.wrong;
      if (dr > 0 || dw > 0) { var x = lg.topics[k] || (lg.topics[k] = { right: 0, wrong: 0 }); x.right += Math.max(0, dr); x.wrong += Math.max(0, dw); extra = true; }
    }
    if (extra) t.legacy = lg;
    s.tally = t;
    return derive(s);
  }
  function mine() {
    var t = SD.state.tally, id = deviceId();
    return own(t, id) ? t[id] : (t[id] = { xp: 0, days: {}, counts: {}, topics: {} });
  }
  // Add XP earned now: to the total and to today.
  function gain(n) {
    if (!(n > 0)) return;
    var s = SD.state, e = mine(), d = today();
    e.xp += n; e.days[d] = (e.days[d] || 0) + n;
    s.xp += n; s.days[d] = (s.days[d] || 0) + n;
  }
  // Add to a named counter. once: a flag rather than a count, so it stops at 1.
  function count(k, once) {
    var s = SD.state, e = mine();
    if (once && s.counts[k]) return;
    e.counts[k] = (e.counts[k] || 0) + 1; s.counts[k] = (s.counts[k] || 0) + 1;
  }
  function tallyHit(topicId, correct) {
    var t = SD.topicState(topicId), e = mine(), x = own(e.topics, topicId) ? e.topics[topicId] : (e.topics[topicId] = { right: 0, wrong: 0 }), k = correct ? 'right' : 'wrong';
    x[k]++; t[k]++;
  }
  SD.count = count;

  function cardRec(c) {
    if (!isObj(c) || num(c.iv) == null || num(c.ef) == null || num(c.reps) == null || typeof c.due !== 'string') return null;
    var r = { iv: c.iv, ef: c.ef, reps: c.reps, due: c.due };
    if (typeof c.last === 'string') r.last = c.last;
    return r;
  }
  // Coerce whatever was loaded or imported into the shape blank() describes: a field of the wrong type falls back to
  // its blank value and a malformed entry inside a map is dropped, so one bad field cannot break every later load.
  function normalize(s) {
    var b = blank();
    if (!isObj(s)) return b;
    s.v = 1;
    ['updatedAt', 'resetAt', 'xp', 'combo', 'bestCombo'].forEach(function (k) { s[k] = Math.max(0, num(s[k]) || 0); });
    var st = isObj(s.streak) ? s.streak : b.streak, count = Math.max(0, num(st.count) || 0);
    s.streak = { count: count, best: Math.max(count, num(st.best) || 0), last: str(st.last) };
    s.days = only(s.days, num); s.hi = only(s.hi, num); s.counts = only(s.counts, num);
    s.badges = only(s.badges, str);
    s.topics = only(s.topics, topicRec); s.cards = only(s.cards, cardRec);
    s.runs = only(s.runs, runRec);
    var q = isObj(s.quests) ? s.quests : b.quests;
    s.quests = { date: str(q.date), prog: only(q.prog, num), done: only(q.done, num) };
    if (!isObj(s.settings)) s.settings = b.settings;
    if (typeof s.settings.sound !== 'boolean') s.settings.sound = true;
    return fixTally(s);
  }
  SD.normalize = normalize;

  /* ---------- Merging two copies (this browser and progress/progress.json, or two tabs) ---------- */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  // JSON with sorted keys, so two copies can be compared whatever order their fields were written in.
  function stable(x) {
    if (Array.isArray(x)) return '[' + x.map(stable).join(',') + ']';
    if (isObj(x)) return '{' + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(x[k]); }).join(',') + '}';
    return JSON.stringify(x === undefined ? null : x);
  }
  function cmp(x, y) { return x === y ? 0 : x == null ? -1 : y == null ? 1 : x < y ? -1 : 1; }
  function later(x, y) { return cmp(x, y) >= 0 ? x : y; }
  function earlier(x, y) { return cmp(x, y) <= 0 ? x : y; }
  function first(x) { return x; }
  // Combine two maps key by key; `both(x, y)` decides a key present in each.
  function eachKey(a, b, both) {
    var r = {}, k;
    for (k in a) if (own(a, k)) r[k] = own(b, k) ? both(a[k], b[k]) : a[k];
    for (k in b) if (own(b, k) && !own(r, k)) r[k] = b[k];
    return r;
  }
  // The copy of a card that was reviewed more recently; on a tie, the one further along.
  function newerCard(x, y) { return (cmp(x.last, y.last) || cmp(x.reps, y.reps) || cmp(x.due, y.due) || cmp(stable(x), stable(y))) >= 0 ? x : y; }
  function maxMap(x, y) { return eachKey(x, y, Math.max); }
  function mergeTally(x, y) {
    return { xp: Math.max(x.xp, y.xp), days: maxMap(x.days, y.days), counts: maxMap(x.counts, y.counts),
      topics: eachKey(x.topics, y.topics, function (p, q) { return { right: Math.max(p.right, q.right), wrong: Math.max(p.wrong, q.wrong) }; }) };
  }
  // Both copies must be normalized. Nothing earned in either is lost: running totals add up across devices (each
  // device's tally merges by its larger numbers, and the totals are their sum), every best keeps the larger value,
  // badges and passed stations are unions, each card keeps its more recently reviewed copy, and the later streak and
  // daily quests win. What cannot be combined (the current answer streak, settings, a note both copies have) comes
  // from the copy saved last.
  function merge(a, b) {
    if (a.resetAt !== b.resetAt) return clone(a.resetAt > b.resetAt ? a : b);
    var n = (cmp(a.updatedAt, b.updatedAt) || cmp(stable(a), stable(b))) >= 0 ? a : b, o = n === a ? b : a, m = {}, k;
    for (k in o) m[k] = o[k];
    for (k in n) m[k] = n[k];
    m.updatedAt = Math.max(a.updatedAt, b.updatedAt);
    m.bestCombo = Math.max(a.bestCombo, b.bestCombo);
    var s = (cmp(n.streak.last, o.streak.last) || cmp(n.streak.count, o.streak.count)) >= 0 ? n.streak : o.streak;
    m.streak = { count: s.count, best: Math.max(n.streak.best, o.streak.best), last: s.last };
    m.hi = maxMap(n.hi, o.hi);
    m.tally = eachKey(n.tally, o.tally, mergeTally);
    m.badges = eachKey(n.badges, o.badges, earlier);
    m.cards = eachKey(n.cards, o.cards, newerCard);
    m.topics = eachKey(n.topics, o.topics, function (x, y) {
      var r = {}, k;
      for (k in x) if (typeof x[k] === 'number') r[k] = x[k];
      for (k in y) if (typeof y[k] === 'number') r[k] = typeof r[k] === 'number' ? Math.max(r[k], y[k]) : y[k];
      r.done = eachKey(x.done, y.done, later); r.notes = eachKey(x.notes, y.notes, first);
      return r;
    });
    var qn = n.quests, qo = o.quests;
    m.quests = qn.date === qo.date ? { date: qn.date, prog: eachKey(qn.prog, qo.prog, Math.max), done: eachKey(qn.done, qo.done, Math.max) }
      : cmp(qn.date, qo.date) > 0 ? qn : qo;
    return derive(clone(m));
  }
  SD.merge = merge; SD.stable = stable;

  var listeners = [];
  SD.on = function (fn) { listeners.push(fn); };
  function emit() { listeners.forEach(function (fn) { fn(); }); }
  SD.notify = emit;

  // Cleanup for the current view, such as a live microphone or a stopwatch. route() runs and clears these on every navigation.
  var leaving = [];
  SD.onLeave = function (fn) { leaving.push(fn); };
  SD.leave = function () { var fns = leaving; leaving = []; fns.forEach(function (fn) { try { fn(); } catch (e) { /* the rest still run */ } }); };

  // Saving to serve.py. SD.sync.server: 'unknown' until the first save answers, then 'ok', 'retrying' (the server
  // answered before but a later save failed: kept as unsaved and retried with backoff), or 'none' (static hosting).
  var pushTimer = null, inflight = false, unsaved = false, backoff = 0;
  SD.sync = { server: 'unknown' };
  function setServer(v) { if (SD.sync.server !== v) { SD.sync.server = v; emit(); } }
  function schedulePush(ms) { clearTimeout(pushTimer); pushTimer = setTimeout(pushToServer, ms); }
  // Write the state to this browser and/or queue it for the server, without touching updatedAt.
  function persist(local, server) {
    if (local) try { localStorage.setItem(KEY, JSON.stringify(SD.state)); } catch (e) { /* storage may be unavailable */ }
    if (server) { unsaved = true; schedulePush(1200); }
  }
  SD.save = function () {
    SD.state.updatedAt = Math.max(Date.now(), SD.state.updatedAt + 1);   // always moves on, even twice in one millisecond
    persist(true, true);
    emit();
  };
  // serve.py accepts this and writes progress/progress.json into the repo. keepalive lets the last save outlive the page.
  function pushToServer(keepalive) {
    clearTimeout(pushTimer); pushTimer = null;
    if (SD.sync.server === 'none' || !unsaved) return;
    if (inflight && keepalive !== true) return schedulePush(500);
    inflight = true; unsaved = false;
    var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(SD.state) };
    if (keepalive === true) opts.keepalive = true;
    fetch('api/progress', opts).then(function (r) { if (r.ok) pushed(); else pushFailed(r.status); }, function () { pushFailed(0); });
  }
  function pushed() { inflight = false; backoff = 0; setServer('ok'); }
  function pushFailed(status) {
    inflight = false; unsaved = true;
    // The very first save being refused (404 or 405 from a static host, 501 from a plain file server) means there is no
    // save server here. A server that has answered before, or a network error, is worth retrying.
    if (SD.sync.server === 'unknown' && (location.protocol === 'file:' || status === 501 || (status >= 400 && status < 500 && status !== 408 && status !== 429))) return setServer('none');
    backoff = Math.min(60000, backoff ? backoff * 2 : 2000);
    schedulePush(backoff);
    setServer('retrying');
  }
  // Leaving or hiding the page flushes a save that is still waiting out its debounce.
  window.addEventListener('pagehide', function () { pushToServer(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') pushToServer(true); });

  // Replace the contents of SD.state in place, keeping each topic's object, because an open view may hold on to it.
  function adopt(m) {
    var s = SD.state, k;
    Object.keys(m.topics).forEach(function (id) {
      var t = own(s.topics, id) && s.topics[id];
      if (!t) return;
      for (k in t) delete t[k];
      for (k in m.topics[id]) t[k] = m.topics[id][k];
      m.topics[id] = t;
    });
    for (k in s) delete s[k];
    for (k in m) s[k] = m[k];
  }
  // Fold another normalized copy into SD.state. Whichever side lacks something the merge produced is written back,
  // without changing updatedAt, so the copies converge instead of bouncing saves between tabs.
  // from: 'storage' when the copy is what another tab just wrote to localStorage (so the server has it, or will),
  // 'cloud' when it is the online copy (js/sync.js), otherwise the copy serve.py holds.
  // Returns whether the result holds anything the other copy lacks.
  function reconcile(other, from) {
    var was = stable(SD.state), m = merge(SD.state, other), sm = stable(m), changed = sm !== was, ahead = sm !== stable(other);
    if (changed) adopt(m);
    if (from === 'storage') { if (ahead) persist(true, true); }
    else if (from === 'cloud') persist(changed, changed);
    else persist(changed, ahead);
    if (changed) emit();
    return ahead;
  }
  // Fold the online copy (already normalized) into this browser's progress.
  SD.foldCloud = function (other) { return reconcile(other, 'cloud'); };
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY || !e.newValue || !SD.state) return;
    var other = null;
    try { other = JSON.parse(e.newValue); } catch (err) { return; }
    if (isObj(other) && other.v === 1) reconcile(normalize(other), 'storage');
  });
  SD.load = function () {
    var local = null;
    try { local = JSON.parse(localStorage.getItem(KEY)); } catch (e) { local = null; }
    SD.state = normalize(local || blank());
    // Merge with the copy in the repo (e.g. you pulled progress made on another machine).
    return fetch('progress/progress.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (remote) {
        if (isObj(remote) && remote.v === 1) reconcile(normalize(remote), 'file');
        else if (SD.state.updatedAt) persist(false, true);   // no file yet: give the server this browser's progress
      })
      .catch(function () { /* no saved file yet */ });
  };
  // A reset time later than this device's last one and than `other`, so the copy it stamps wins every merge.
  function newReset(other) { return Math.max(Date.now(), (SD.state ? SD.state.resetAt : 0) + 1, (other || 0) + 1); }
  SD.replaceState = function (obj) {
    if (!isObj(obj) || obj.v !== 1) throw new Error('this is not a System Design Quest progress file (it must be a JSON object with "v": 1)');
    // The file's totals become the shared entry: whatever each device added before the import is part of them now.
    var s = normalize(obj);
    s.tally = { legacy: totalsOf(s) }; derive(s);
    s.resetAt = newReset(s.resetAt); SD.state = s; SD.save();
  };
  SD.resetState = function () { var at = newReset(0); SD.state = blank(); SD.state.resetAt = at; SD.save(); };
  // Keep this device's progress over a copy that was reset at `other`: stamp it as the later reset.
  SD.keepOver = function (other) { SD.state.resetAt = newReset(other); SD.save(); };

  /* ---------- Levels ---------- */
  var TITLES = [[1, 'Intern'], [3, 'Junior Engineer'], [6, 'Engineer'], [10, 'Senior Engineer'], [15, 'Staff Engineer'], [21, 'Principal Engineer'], [28, 'Distinguished Engineer']];
  function threshold(level) { return Math.round(120 * Math.pow(level - 1, 1.7)); }
  SD.levelInfo = function (xp) {
    var level = 1;
    while (threshold(level + 1) <= xp) level++;
    var title = TITLES[0][1];
    TITLES.forEach(function (t) { if (level >= t[0]) title = t[1]; });
    var lo = threshold(level), hi = threshold(level + 1);
    return { level: level, title: title, into: xp - lo, span: hi - lo, pct: (xp - lo) / (hi - lo) };
  };

  /* ---------- Daily activity, streak, quests ---------- */
  var QUESTS = [
    { id: 'review', text: 'Review 8 cards', goal: 8 },
    { id: 'quiz', text: 'Get 10 quiz answers right', goal: 10 },
    { id: 'teach', text: 'Explain or teach back 1 topic', goal: 1 }
  ];
  SD.QUESTS = QUESTS;
  function touchDay() {
    var s = SD.state, t = today();
    if (s.streak.last !== t) {
      s.streak.count = s.streak.last === addDays(t, -1) ? s.streak.count + 1 : 1;
      s.streak.last = t;
      s.streak.best = Math.max(s.streak.best, s.streak.count);
      if (s.streak.count > 1) SD.toast('🔥 ' + s.streak.count + '-day streak!', 'gold');
    }
    if (s.quests.date !== t) s.quests = { date: t, prog: {}, done: {} };
  }
  // A streak is only "alive" if you studied today or yesterday.
  SD.streakNow = function () {
    var s = SD.state.streak, t = today();
    return (s.last === t || s.last === addDays(t, -1)) ? s.count : 0;
  };
  SD.questState = function () {
    var q = SD.state.quests, live = q.date === today();
    return QUESTS.map(function (d) { return { id: d.id, text: d.text, goal: d.goal, n: Math.min(d.goal, live ? (q.prog[d.id] || 0) : 0), done: live && !!q.done[d.id] }; });
  };
  function bumpQuest(id, n) {
    var q = SD.state.quests, def = QUESTS.filter(function (d) { return d.id === id; })[0];
    q.prog[id] = (q.prog[id] || 0) + (n || 1);
    if (!q.done[id] && q.prog[id] >= def.goal) {
      q.done[id] = 1;
      gain(40);
      SD.toast('✅ Quest complete: ' + def.text + ' (+40 XP)', 'gold'); SD.beep('win');
    }
  }

  /* ---------- XP, combo, badges ---------- */
  SD.comboMult = function () { return 1 + Math.min(SD.state.combo, 10) * 0.1; };
  // Full XP the first time; a replay pays in full only what beats the best earlier attempt, and a fifth (at least 1)
  // of the rest, so practice still counts but cannot be farmed. base: what this attempt is worth;
  // prev: what the best earlier attempt was worth, or null if there was none.
  SD.replayXp = function (base, prev) {
    if (base <= 0) return 0;
    if (prev == null) return base;
    var gain = Math.max(0, base - prev);
    return gain + (base > gain ? Math.max(1, Math.round((base - gain) * 0.2)) : 0);
  };
  // Award XP. opts: {quest: 'review'|'quiz'|'teach', count: 'reviews'|...}
  SD.award = function (base, opts) {
    opts = opts || {};
    var s = SD.state, before = SD.levelInfo(s.xp).level;
    touchDay();
    var earned = Math.round(base * (opts.flat ? 1 : SD.comboMult()));
    gain(earned);
    if (opts.count) count(opts.count);
    if (opts.quest) bumpQuest(opts.quest, 1);
    var after = SD.levelInfo(s.xp);
    if (after.level > before) { SD.toast('⬆️ Level ' + after.level + ' — ' + after.title, 'gold'); SD.confetti(); SD.beep('win'); }
    checkBadges(); SD.save();
    return earned;
  };
  // Record a right/wrong answer: drives the combo (win streak) and per-topic accuracy.
  SD.hit = function (correct, topicId) {
    var s = SD.state;
    if (correct) { s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); if (s.combo === 5 || s.combo === 10 || s.combo % 25 === 0) SD.toast('⚡ ' + s.combo + ' in a row!', 'gold'); }
    else s.combo = 0;
    if (topicId) tallyHit(topicId, correct);
    SD.beep(correct ? 'ok' : 'bad');
  };
  SD.topicState = function (id) {
    var t = SD.state.topics[id];
    if (!t) t = SD.state.topics[id] = { done: {}, right: 0, wrong: 0, notes: {} };
    return t;
  };
  SD.setHigh = function (key, score) {
    var hi = SD.state.hi;
    if (score > (hi[key] || 0)) { hi[key] = score; SD.save(); return true; }
    return false;
  };

  SD.BADGES = [
    { id: 'first', icon: '🌱', name: 'First step', desc: 'Complete any station', test: function (s, c) { return c.stations >= 1; } },
    { id: 'streak3', icon: '🔥', name: 'Warming up', desc: '3-day streak', test: function (s) { return s.streak.best >= 3; } },
    { id: 'streak7', icon: '🌋', name: 'On fire', desc: '7-day streak', test: function (s) { return s.streak.best >= 7; } },
    { id: 'streak30', icon: '☄️', name: 'Unstoppable', desc: '30-day streak', test: function (s) { return s.streak.best >= 30; } },
    { id: 'combo10', icon: '⚡', name: 'Combo ×10', desc: '10 correct in a row', test: function (s) { return s.bestCombo >= 10; } },
    { id: 'combo25', icon: '🌩️', name: 'Combo ×25', desc: '25 correct in a row', test: function (s) { return s.bestCombo >= 25; } },
    { id: 'rev100', icon: '🧠', name: 'Deep grooves', desc: 'Review 100 cards', test: function (s) { return (s.counts.reviews || 0) >= 100; } },
    { id: 'duck5', icon: '🦆', name: 'Duck whisperer', desc: 'Teach the duck 5 topics', test: function (s, c) { return c.ducks >= 5; } },
    { id: 'architect', icon: '📐', name: 'Architect', desc: 'A perfect diagram', test: function (s) { return !!s.counts.perfectDiagram; } },
    { id: 'boss', icon: '🏆', name: 'Boss slayer', desc: 'Score 80+ on a boss fight', test: function (s) { return SD.bosses.some(function (b) { return (s.hi['boss.' + b.id] || 0) >= 80; }); } },
    { id: 'sprint', icon: '🧮', name: 'Human calculator', desc: '1,000+ in Estimation Sprint', test: function (s) { return (s.hi.sprint || 0) >= 1000; } },
    { id: 'master5', icon: '🎓', name: 'Scholar', desc: 'Master 5 topics', test: function (s, c) { return c.mastered >= 5; } },
    { id: 'master20', icon: '👑', name: 'Sage', desc: 'Master 20 topics', test: function (s, c) { return c.mastered >= 20; } }
  ];
  function checkBadges() {
    var s = SD.state, c = { stations: 0, ducks: 0, mastered: 0 };
    SD.topics.forEach(function (t) {
      var st = s.topics[t.id]; if (!st) return;
      c.stations += Object.keys(st.done).length;
      if (st.done.duck) c.ducks++;
      if (SD.topicProgress(t.id).pct >= 1) c.mastered++;
    });
    SD.BADGES.forEach(function (b) {
      if (!s.badges[b.id] && b.test(s, c)) { s.badges[b.id] = today(); SD.toast(b.icon + ' Badge earned: ' + b.name, 'gold'); SD.confetti(); }
    });
  }

  /* ---------- Topics, cards, progress ---------- */
  SD.cards = {};          // id -> {id, topic, q, a, key}
  SD.deckErrors = {};
  SD.topicById = {};
  SD.stationsOf = function (t) {
    var list = ['learn'];
    if (SD.cardsFor(t.id).length) list.push('recall');
    list.push('quiz');
    if (t.lab) list.push('lab');
    list.push('explain', 'duck');
    return list;
  };
  SD.cardsFor = function (topicId) {
    return Object.keys(SD.cards).filter(function (id) { return SD.cards[id].topic === topicId; });
  };
  SD.topicProgress = function (id) {
    var t = SD.topicById[id], st = SD.state.topics[id] || { done: {} }, all = SD.stationsOf(t);
    var n = all.filter(function (k) { return st.done[k]; }).length;
    return { n: n, total: all.length, pct: n / all.length };
  };
  SD.markStation = function (topicId, station) {
    var st = SD.topicState(topicId), first = !st.done[station];
    st.done[station] = today();
    if (first && SD.topicProgress(topicId).pct >= 1) { SD.toast('🎓 Topic mastered: ' + SD.topicById[topicId].title, 'gold'); SD.confetti(); SD.beep('win'); }
    return first;
  };
  // A topic's lab can be replaced by a different kind of lab (six Foundations labs became load tests on 2026-11-11).
  // A tick, a best score and mission progress earned on the old lab say nothing about the new one, so they are
  // dropped. notes.labSig records which lab the tick was earned on; a tick from before that was recorded is only
  // dropped when its date shows it predates the load tests.
  var RIGS_ADDED = '2026-11-11';
  SD.checkLabs = function () {
    var L = SD.labs, changed = false;
    if (!L || !L.sigOf) return;
    SD.topics.forEach(function (t) {
      var st = SD.state.topics[t.id];
      if (!st || !t.lab) return;
      var sig = L.sigOf(t.lab), old = st.notes.labSig;
      var stale = old ? old !== sig : !!st.done.lab && sig.indexOf('rig:') >= 0 && st.done.lab < RIGS_ADDED;
      if (!stale) return;
      delete st.done.lab; delete st.labBest; delete st.rigPaid; delete st.notes.labSig;
      Object.keys(st).forEach(function (k) { if (/^seqS\d+$/.test(k)) delete st[k]; });
      changed = true;
    });
    if (changed) SD.save();
  };
  SD.dueCards = function () {
    var t = today(), cs = SD.state.cards;
    return Object.keys(cs).filter(function (id) { return SD.cards[id] && cs[id].due <= t; })
      .sort(function (a, b) { return cs[a].due < cs[b].due ? -1 : 1; });
  };
  SD.newCards = function () { return Object.keys(SD.cards).filter(function (id) { return !SD.state.cards[id]; }); };
  SD.gradeCard = function (id, grade) {
    var n = SD.srs.next(SD.state.cards[id], grade);
    n.due = addDays(today(), n.iv); n.last = today();
    SD.state.cards[id] = n;
    SD.hit(grade >= 2, SD.cards[id].topic);
    return SD.award([2, 5, 8, 10][grade], { quest: 'review', count: 'reviews' });
  };

  // Build the card registry from topic content plus the existing decks in questions/*.json,
  // carrying over any review history those files already contain.
  SD.initContent = function () {
    SD.topics.forEach(function (t) {
      SD.topicById[t.id] = t;
      (t.cards || []).forEach(function (c, i) { var id = t.id + '.c' + (i + 1); SD.cards[id] = { id: id, topic: t.id, q: c[0], a: c[1] }; });
    });
    var files = [['1', 'questions/module-1-foundations.json'], ['5', 'questions/module-5-ml-systems.json']];
    SD.deckErrors = {};   // module id -> file that could not be read; the pages say so (see deckNotice in app.js)
    SD.checkLabs();
    return Promise.all(files.map(function (f) {
      return fetch(f[1]).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function () { SD.deckErrors[f[0]] = f[1]; return { cards: [] }; });
    })).then(function (decks) {
      var seeded = false;
      decks.forEach(function (d) {
        (d.cards || []).forEach(function (c) {
          SD.cards[c.id] = { id: c.id, topic: c.topic, q: c.question, a: c.answer, key: c.key_concept };
          if (!SD.state.cards[c.id] && c.reps > 0 && c.next_review) {
            SD.state.cards[c.id] = { iv: c.interval_days || 1, ef: c.ease_factor || 2.5, reps: c.reps, due: c.next_review, last: c.last_reviewed };
            seeded = true;
          }
        });
      });
      if (seeded) try { localStorage.setItem(KEY, JSON.stringify(SD.state)); } catch (e) { /* ignore */ }
    });
  };
})(window.SD);
