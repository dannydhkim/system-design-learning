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
  SD.h = h; SD.clear = clear; SD.shuffle = shuffle; SD.pick = pick; SD.fmt = fmt;

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
  function blank() {
    return {
      v: 1, updatedAt: 0, xp: 0, combo: 0, bestCombo: 0,
      streak: { count: 0, best: 0, last: null }, days: {},
      topics: {}, cards: {}, hi: {}, badges: {}, counts: {},
      quests: { date: null, prog: {}, done: {} },
      settings: { sound: true }
    };
  }
  function normalize(s) {
    var b = blank(), k;
    for (k in b) if (s[k] == null) s[k] = b[k];
    return s;
  }
  var listeners = [];
  SD.on = function (fn) { listeners.push(fn); };
  function emit() { listeners.forEach(function (fn) { fn(); }); }

  var pushTimer = null;
  SD.sync = { server: 'unknown' };
  SD.save = function () {
    SD.state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(SD.state)); } catch (e) { /* storage may be unavailable */ }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToServer, 1200);
    emit();
  };
  // serve.py accepts this and writes progress/progress.json into the repo. On static hosting it simply fails.
  function pushToServer() {
    if (SD.sync.server === 'none') return;
    fetch('api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(SD.state, null, 1) })
      .then(function (r) { SD.sync.server = r.ok ? 'ok' : 'none'; emit(); })
      .catch(function () { SD.sync.server = 'none'; emit(); });
  }
  SD.load = function () {
    var local = null;
    try { local = JSON.parse(localStorage.getItem(KEY)); } catch (e) { local = null; }
    SD.state = normalize(local || blank());
    // The copy in the repo wins if it is newer (e.g. you pulled progress made on another machine).
    return fetch('progress/progress.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (remote) {
        if (remote && remote.v === 1 && (remote.updatedAt || 0) > (SD.state.updatedAt || 0)) {
          SD.state = normalize(remote);
          try { localStorage.setItem(KEY, JSON.stringify(SD.state)); } catch (e) { /* ignore */ }
        }
      })
      .catch(function () { /* no saved file yet */ });
  };
  SD.replaceState = function (obj) {
    if (!obj || obj.v !== 1) throw new Error('Not a System Design Quest progress file');
    SD.state = normalize(obj); SD.save();
  };
  SD.resetState = function () { SD.state = blank(); SD.save(); };

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
      SD.state.xp += 40; SD.state.days[today()] = (SD.state.days[today()] || 0) + 40;
      SD.toast('✅ Quest complete: ' + def.text + ' (+40 XP)', 'gold'); SD.beep('win');
    }
  }

  /* ---------- XP, combo, badges ---------- */
  SD.comboMult = function () { return 1 + Math.min(SD.state.combo, 10) * 0.1; };
  // Award XP. opts: {quest: 'review'|'quiz'|'teach', count: 'reviews'|...}
  SD.award = function (base, opts) {
    opts = opts || {};
    var s = SD.state, before = SD.levelInfo(s.xp).level;
    touchDay();
    var gain = Math.round(base * (opts.flat ? 1 : SD.comboMult()));
    s.xp += gain; s.days[today()] = (s.days[today()] || 0) + gain;
    if (opts.count) s.counts[opts.count] = (s.counts[opts.count] || 0) + 1;
    if (opts.quest) bumpQuest(opts.quest, 1);
    var after = SD.levelInfo(s.xp);
    if (after.level > before) { SD.toast('⬆️ Level ' + after.level + ' — ' + after.title, 'gold'); SD.confetti(); SD.beep('win'); }
    checkBadges(); SD.save();
    return gain;
  };
  // Record a right/wrong answer: drives the combo (win streak) and per-topic accuracy.
  SD.hit = function (correct, topicId) {
    var s = SD.state;
    if (correct) { s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); if (s.combo === 5 || s.combo === 10 || s.combo % 25 === 0) SD.toast('⚡ ' + s.combo + ' in a row!', 'gold'); }
    else s.combo = 0;
    if (topicId) { var t = SD.topicState(topicId); if (correct) t.right++; else t.wrong++; }
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
    var files = ['questions/module-1-foundations.json', 'questions/module-5-ml-systems.json'];
    return Promise.all(files.map(function (f) {
      return fetch(f).then(function (r) { return r.ok ? r.json() : { cards: [] }; }).catch(function () { return { cards: [] }; });
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
