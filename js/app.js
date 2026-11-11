// Views and routing.
(function (SD) {
  'use strict';
  var h = SD.h, clear = SD.clear, L = SD.labs;
  var main, hud;

  var STATION = {
    learn: ['📖', 'Learn'], recall: ['🧠', 'Recall'], quiz: ['⚡', 'Quiz'], lab: ['🔧', 'Lab'], explain: ['✍️', 'Explain'], duck: ['🦆', 'Teach']
  };
  var DUCK_RUBRIC = ['I explained it without looking at notes', 'I used an analogy or a concrete example', 'I named a trade-off, or when NOT to use it', 'I answered the follow-ups without hand-waving', 'A new graduate could have followed it'];

  function ring(pct, label, cls) {
    var r = h('div', { class: 'ring ' + (cls || '') }, h('span', {}, label));
    r.style.setProperty('--p', Math.round(pct * 100));
    return r;
  }
  function nextTopic() {
    for (var i = 0; i < SD.topics.length; i++) if (SD.topicProgress(SD.topics[i].id).pct < 1) return SD.topics[i];
    return null;
  }
  function nextStation(t) {
    var st = SD.topicState(t.id), all = SD.stationsOf(t);
    for (var i = 0; i < all.length; i++) if (!st.done[all[i]]) return all[i];
    return all[0];
  }

  /* ---------- HUD ---------- */
  function drawHud() {
    var s = SD.state, lv = SD.levelInfo(s.xp), due = SD.dueCards().length, route = (location.hash || '#/map').split('/')[1] || 'map';
    clear(hud);
    function link(id, icon, text, badge) { return h('a', { href: '#/' + id, class: 'nav' + (route === id || (id === 'map' && route === 'topic') ? ' on' : '') }, h('span', { class: 'ni' }, icon), h('span', { class: 'nt' }, text), badge ? h('i', { class: 'badge' }, badge) : null); }
    var fill = h('div', { class: 'fill' }); fill.style.width = Math.round(lv.pct * 100) + '%';
    hud.appendChild(h('a', { class: 'brand', href: '#/map' }, '◈ System Design Quest'));
    hud.appendChild(h('nav', { class: 'navs' }, link('map', '🗺️', 'Map'), link('review', '🧠', 'Review', due || null), link('arcade', '🕹️', 'Arcade'), link('boss', '🏆', 'Bosses'), link('stats', '📊', 'Stats'), link('settings', '⚙️', 'Settings')));
    hud.appendChild(h('div', { class: 'meters' },
      h('div', { class: 'lvl', title: lv.into + ' / ' + lv.span + ' XP to next level' }, h('b', {}, 'Lv ' + lv.level), h('span', { class: 'ltitle' }, lv.title), h('div', { class: 'track' }, fill)),
      h('div', { class: 'meter', title: 'Daily streak' }, '🔥 ', h('b', {}, SD.streakNow())),
      h('div', { class: 'meter' + (s.combo >= 5 ? ' hot' : ''), title: 'Correct answers in a row' }, '⚡ ', h('b', {}, s.combo))));
  }

  /* ---------- Map ---------- */
  function viewMap() {
    var nt = nextTopic(), due = SD.dueCards().length, s = SD.state;
    var hero = h('section', { class: 'hero' });
    hero.appendChild(h('div', { class: 'herocol' },
      h('h1', {}, s.xp ? 'Welcome back.' : 'Learn system design by doing it.'),
      h('p', {}, 'Each topic has six stations: read it, recall it, get quizzed, manipulate it, write it in your own words, then teach it to a rubber duck. Cards you learn return on a spaced schedule.'),
      h('div', { class: 'row wrap' },
        nt ? h('a', { class: 'btn primary big', href: '#/topic/' + nt.id + '/' + nextStation(nt) }, '▶ Continue: ' + nt.id + ' ' + nt.title) : h('span', { class: 'btn' }, 'Every built topic mastered 🎓'),
        due ? h('a', { class: 'btn big', href: '#/review' }, '🧠 ' + due + ' card' + (due > 1 ? 's' : '') + ' due') : null)));
    hero.appendChild(h('div', { class: 'quests' }, h('div', { class: 'label' }, 'Today\'s quests'), SD.questState().map(function (q) {
      var f = h('div', { class: 'fill' }); f.style.width = (q.n / q.goal * 100) + '%';
      return h('div', { class: 'quest' + (q.done ? ' done' : '') }, h('span', {}, (q.done ? '✅ ' : '◻️ ') + q.text), h('div', { class: 'track' }, f), h('em', {}, q.n + '/' + q.goal));
    })));
    main.appendChild(hero);

    SD.worlds.forEach(function (w) {
      var sec = h('section', { class: 'world' }, h('h2', {}, w.title), h('p', { class: 'muted' }, w.blurb));
      w.mods.forEach(function (mid) {
        var m = SD.mods[mid], topics = SD.topics.filter(function (t) { return t.mod === mid; });
        var done = topics.filter(function (t) { return SD.topicProgress(t.id).pct >= 1; }).length;
        var head = h('div', { class: 'modhead' }, h('span', { class: 'modicon' }, m.icon), h('h3', {}, (mid.length > 1 ? mid + ' · ' : 'Module ' + mid + ' · ') + m.title), m.locked ? h('span', { class: 'pill' }, '🔒 coming soon') : h('span', { class: 'pill' }, done + ' / ' + topics.length + ' mastered'));
        var path = h('div', { class: 'path' });
        if (m.locked) m.locked.forEach(function (name) { path.appendChild(h('div', { class: 'node locked' }, ring(0, '🔒', 'lock'), h('span', { class: 'nname' }, name))); });
        else topics.forEach(function (t) {
          var p = SD.topicProgress(t.id);
          path.appendChild(h('a', { class: 'node' + (p.pct >= 1 ? ' mastered' : '') + (nt && nt.id === t.id ? ' next' : ''), href: '#/topic/' + t.id + '/' + nextStation(t) },
            ring(p.pct, p.pct >= 1 ? '★' : t.id), h('span', { class: 'nname' }, t.title), h('span', { class: 'nsub' }, p.n + '/' + p.total)));
        });
        sec.appendChild(h('div', { class: 'module' + (m.locked ? ' lockedmod' : '') }, head, path));
      });
      main.appendChild(sec);
    });
  }

  /* ---------- Topic ---------- */
  function viewTopic(id, station) {
    var t = SD.topicById[id];
    if (!t) return (location.hash = '#/map');
    var all = SD.stationsOf(t);
    if (all.indexOf(station) < 0) station = nextStation(t);
    var st = SD.topicState(id);
    var idx = SD.topics.indexOf(t), prev = SD.topics[idx - 1], nxt = SD.topics[idx + 1];

    main.appendChild(h('div', { class: 'crumbs' }, h('a', { href: '#/map' }, '← Map'), h('span', { class: 'spacer' }),
      prev ? h('a', { href: '#/topic/' + prev.id }, '‹ ' + prev.id) : null, nxt ? h('a', { href: '#/topic/' + nxt.id }, nxt.id + ' ›') : null));
    var head = h('div', {});
    main.appendChild(head);
    // Redrawn whenever a station is passed, so the ring and tab ticks update immediately.
    function drawHead() {
      var p = SD.topicProgress(id);
      clear(head);
      head.appendChild(h('header', { class: 'topichead' }, ring(p.pct, p.pct >= 1 ? '★' : p.n + '/' + p.total, 'bigring'),
        h('div', {}, h('div', { class: 'label' }, SD.mods[t.mod].icon + ' ' + SD.mods[t.mod].title + ' · ' + t.id), h('h1', {}, t.title), h('p', { class: 'muted' }, t.tag))));
      head.appendChild(h('div', { class: 'tabs', role: 'tablist' }, all.map(function (k) {
        return h('a', { class: 'tab' + (k === station ? ' on' : '') + (st.done[k] ? ' done' : ''), href: '#/topic/' + id + '/' + k, role: 'tab' }, h('span', {}, STATION[k][0]), ' ' + STATION[k][1], st.done[k] ? h('i', {}, '✓') : null);
      })));
    }
    drawHead();

    var body = h('section', { class: 'station' }), foot = h('div', { class: 'stationfoot' });
    main.appendChild(body); main.appendChild(foot);

    // Called when a station is passed: mark it, then offer the next step.
    function passed(msg) {
      var first = SD.markStation(id, station);
      SD.save(); drawHead();
      clear(foot);
      var i = all.indexOf(station), nk = all[i + 1];
      if (msg) foot.appendChild(h('p', { class: 'muted' }, msg));
      if (nk) foot.appendChild(h('a', { class: 'btn primary big', href: '#/topic/' + id + '/' + nk }, 'Next station: ' + STATION[nk][0] + ' ' + STATION[nk][1] + ' →'));
      else if (nxt) foot.appendChild(h('a', { class: 'btn primary big', href: '#/topic/' + nxt.id }, 'Next topic: ' + nxt.id + ' ' + nxt.title + ' →'));
      else foot.appendChild(h('a', { class: 'btn primary big', href: '#/boss' }, 'Face a boss →'));
      return first;
    }
    function retry(msg) { clear(foot); foot.appendChild(h('p', { class: 'muted' }, msg)); foot.appendChild(h('button', { class: 'btn', onclick: route }, 'Try again')); }

    if (station === 'learn') {
      body.appendChild(h('div', { class: 'card analogy' }, h('div', { class: 'label' }, '💡 Picture it'), h('p', {}, t.analogy)));
      body.appendChild(h('div', { class: 'card' }, h('div', { class: 'label' }, 'Key ideas'), h('ul', { class: 'points' }, t.points.map(function (x) { return h('li', {}, x); }))));
      body.appendChild(h('div', { class: 'card pitfall' }, h('div', { class: 'label' }, '⚠️ Common mistake'), h('p', {}, t.pitfall)));
      body.appendChild(h('div', { class: 'card say' }, h('div', { class: 'label' }, '🎙️ Say it in the interview'), h('p', {}, '“' + t.say + '”')));
      if (t.refs && t.refs.length) body.appendChild(h('div', { class: 'card sources' }, h('div', { class: 'label' }, '📚 Evidence — where these claims come from'), L.sourceList(t.refs)));
      foot.appendChild(h('button', { class: 'btn primary big', onclick: function () { if (!st.done.learn) SD.award(10); passed('Reading is the weakest way to learn. The next stations make it stick.'); } }, st.done.learn ? 'Read again ✓ — continue' : 'Got it — mark as read (+10 XP)'));
    }
    else if (station === 'recall') {
      var ids = SD.cardsFor(id);
      body.appendChild(h('p', { class: 'brief' }, ids.length + ' card' + (ids.length > 1 ? 's' : '') + '. Answer from memory before revealing — the effort of retrieving is what builds the memory. Your grade schedules the next review.'));
      var m1 = h('div', {}); body.appendChild(m1);
      L.recall(m1, { ids: ids }, { topicId: id, onDone: function () { passed('These cards are now in your review deck.'); } });
    }
    else if (station === 'quiz') {
      var m2 = h('div', {}); body.appendChild(m2);
      L.quiz(m2, { qs: t.quiz }, { topicId: id, onDone: function (score) {
        st.quizBest = Math.max(st.quizBest || 0, score);
        if (score >= 0.66) passed(score === 1 ? 'Perfect.' : 'Passed.'); else { SD.save(); retry('Pass mark is ' + Math.ceil(0.66 * t.quiz.length) + ' of ' + t.quiz.length + '. The options are reshuffled each time.'); }
      } });
    }
    else if (station === 'lab') {
      body.appendChild(h('div', { class: 'label' }, '🔧 ' + L.NAMES[t.lab.type]));
      var m3 = h('div', {}); body.appendChild(m3);
      L.mount(m3, t.lab, { topicId: id, onDone: function (score) {
        st.labBest = Math.max(st.labBest || 0, score);
        if (score >= 0.7) passed('Lab passed at ' + Math.round(score * 100) + '%.'); else { SD.save(); retry('Pass mark is 70%. You scored ' + Math.round(score * 100) + '%.'); }
      } });
    }
    else if (station === 'explain') {
      body.appendChild(h('p', { class: 'brief' }, 'Summarise it in your own words. Writing forces you to find the gaps that re-reading hides.'));
      var m4 = h('div', {}); body.appendChild(m4);
      L.teach(m4, { prompt: t.explain[0], rubric: t.explain[1], saved: st.notes.explain }, { onDone: function (score, text) {
        st.notes.explain = text; SD.award(Math.round(20 * score) + 5, { quest: 'teach' });
        if (score >= 0.5) passed('Saved. You can re-read your own explanation here later.'); else retry('Covered under half the rubric — revisit Learn, then try again.');
      } });
    }
    else if (station === 'duck') {
      body.appendChild(h('p', { class: 'brief' }, 'The rubber duck method: teach it to someone who knows nothing. Speak out loud if you can — the duck will push back.'));
      var m5 = h('div', {}); body.appendChild(m5);
      L.teach(m5, { duck: true, prompt: 'Teach me "' + t.title + '" from scratch — what it is, why it matters, and when I would use it.', followups: t.duck, rubric: DUCK_RUBRIC, saved: st.notes.duck }, { onDone: function (score, text) {
        st.notes.duck = text; SD.award(Math.round(25 * score) + 5, { quest: 'teach' });
        if (score >= 0.6) passed('The duck is satisfied. 🦆'); else retry('The duck is still confused — teach it again once the gaps are filled.');
      } });
    }
  }

  /* ---------- Review ---------- */
  function forecast() {
    var cs = SD.state.cards, t = SD.today(), days = [];
    for (var i = 0; i < 7; i++) days.push({ d: SD.addDays(t, i), n: 0 });
    Object.keys(cs).forEach(function (id) { if (!SD.cards[id]) return; var due = cs[id].due; if (due <= t) days[0].n++; else days.forEach(function (x) { if (x.d === due) x.n++; }); });
    return days;
  }
  function viewReview() {
    var due = SD.dueCards(), fresh = SD.newCards(), built = fresh.filter(function (id) { return SD.topicById[SD.cards[id].topic]; });
    main.appendChild(h('h1', {}, '🧠 Daily review'));
    main.appendChild(h('p', { class: 'muted' }, 'Spaced repetition: each card returns just before you are likely to forget it. A few minutes daily beats an hour weekly.'));
    var body = h('section', { class: 'station' });
    var intro = h('div', { class: 'row wrap' });
    function start(ids) { clear(body); L.recall(body, { ids: ids }, { onDone: function () { body.appendChild(h('a', { class: 'btn primary big', href: '#/map' }, 'Back to the map')); } }); }
    if (due.length) intro.appendChild(h('button', { class: 'btn primary big', onclick: function () { start(due.slice(0, 20)); } }, 'Review ' + Math.min(20, due.length) + ' due card' + (due.length > 1 ? 's' : '')));
    else intro.appendChild(h('div', { class: 'fb good' }, h('b', {}, '✓ Nothing due. '), 'Come back tomorrow, or learn new cards.'));
    var pool = built.length ? built : fresh;
    if (pool.length) intro.appendChild(h('button', { class: 'btn big', onclick: function () { start(pool.slice(0, 5)); } }, 'Learn 5 new cards (' + pool.length + ' unseen)'));
    body.appendChild(intro);
    main.appendChild(body);
    var fc = forecast(), max = Math.max.apply(null, fc.map(function (x) { return x.n; })) || 1;
    main.appendChild(h('h3', {}, 'Next 7 days'));
    main.appendChild(h('div', { class: 'forecast' }, fc.map(function (x, i) {
      var b = h('div', { class: 'col' }); b.style.height = Math.max(4, x.n / max * 80) + 'px';
      return h('div', { class: 'fday' }, h('em', {}, x.n), b, h('span', {}, i === 0 ? 'Today' : x.d.slice(5)));
    })));
  }

  /* ---------- Arcade & bosses ---------- */
  function viewArcade(mode) {
    if (mode && SD.arcade[mode]) { var el = h('section', { class: 'station' }); main.appendChild(h('div', { class: 'crumbs' }, h('a', { href: '#/arcade' }, '← Arcade'))); main.appendChild(el); return SD.arcade[mode](el); }
    main.appendChild(h('h1', {}, '🕹️ Arcade'));
    main.appendChild(h('p', { class: 'muted' }, 'Timed drills for speed and fluency. Wrong answers always show the working.'));
    main.appendChild(h('div', { class: 'grid' }, SD.ARCADE.map(function (a) {
      return h('a', { class: 'tile', href: '#/arcade/' + a.id }, h('div', { class: 'tileicon' }, a.icon), h('h3', {}, a.title), h('p', {}, a.desc), h('div', { class: 'pill' }, '🏅 High score: ' + SD.fmt(SD.state.hi[a.id] || 0)));
    })));
  }
  function viewBoss(id) {
    var b = SD.bosses.filter(function (x) { return x.id === id; })[0];
    if (b) { var el = h('section', { class: 'station' }); main.appendChild(h('div', { class: 'crumbs' }, h('a', { href: '#/boss' }, '← Bosses'))); main.appendChild(el); return SD.runBoss(el, b); }
    main.appendChild(h('h1', {}, '🏆 Boss fights'));
    main.appendChild(h('p', { class: 'muted' }, 'A full mock interview: requirements → estimation → API → high-level design → deep dive → teach it back. Scored out of 100.'));
    main.appendChild(h('div', { class: 'grid' }, SD.bosses.map(function (x) {
      var hi = SD.state.hi['boss.' + x.id] || 0;
      return h('a', { class: 'tile', href: '#/boss/' + x.id }, h('div', { class: 'tileicon' }, x.icon), h('h3', {}, x.title), h('p', {}, x.sub), h('div', { class: 'row wrap' }, h('span', { class: 'pill' }, x.level), h('span', { class: 'pill' }, hi ? '🏅 Best: ' + hi + '/100' : 'Not attempted')));
    })));
  }

  /* ---------- Stats ---------- */
  function viewStats() {
    var s = SD.state, lv = SD.levelInfo(s.xp), cs = s.cards;
    var known = Object.keys(cs).filter(function (id) { return SD.cards[id]; });
    var mature = known.filter(function (id) { return cs[id].iv >= 21; }).length;
    var right = 0, wrong = 0;
    SD.topics.forEach(function (t) { var x = s.topics[t.id]; if (x) { right += x.right; wrong += x.wrong; } });
    function stat(v, label) { return h('div', { class: 'statbox' }, h('b', {}, v), h('span', {}, label)); }
    main.appendChild(h('h1', {}, '📊 Progress'));
    main.appendChild(h('div', { class: 'statgrid' },
      stat('Lv ' + lv.level, lv.title), stat(SD.fmt(s.xp), 'XP'), stat('🔥 ' + SD.streakNow(), 'day streak (best ' + s.streak.best + ')'), stat('⚡ ' + s.bestCombo, 'best answer streak'),
      stat(known.length + ' / ' + Object.keys(SD.cards).length, 'cards learned'), stat(mature, 'cards with 3+ week interval'), stat(right + wrong ? Math.round(right / (right + wrong) * 100) + '%' : '—', 'accuracy'), stat(s.counts.reviews || 0, 'reviews done')));

    main.appendChild(h('h3', {}, 'Last 5 weeks'));
    var cal = h('div', { class: 'cal' }), t = SD.today();
    for (var i = 34; i >= 0; i--) { var d = SD.addDays(t, -i), xp = s.days[d] || 0; cal.appendChild(h('div', { class: 'day l' + (xp === 0 ? 0 : xp < 50 ? 1 : xp < 150 ? 2 : 3), title: d + ': ' + xp + ' XP' })); }
    main.appendChild(cal);

    main.appendChild(h('h3', {}, 'Mastery by module'));
    [].concat.apply([], SD.worlds.map(function (w) { return w.mods; })).forEach(function (mid) {
      var ts = SD.topics.filter(function (x) { return x.mod === mid; }); if (!ts.length) return;
      var sum = 0; ts.forEach(function (x) { sum += SD.topicProgress(x.id).pct; });
      var f = h('div', { class: 'fill' }); f.style.width = Math.round(sum / ts.length * 100) + '%';
      main.appendChild(h('div', { class: 'bar' }, h('span', {}, SD.mods[mid].icon + ' ' + SD.mods[mid].title), h('div', { class: 'track' }, f), h('em', {}, Math.round(sum / ts.length * 100) + '%')));
    });

    var weak = SD.topics.map(function (x) { var y = s.topics[x.id]; return y && y.right + y.wrong >= 3 ? { t: x, acc: y.right / (y.right + y.wrong), n: y.right + y.wrong } : null; })
      .filter(Boolean).filter(function (x) { return x.acc < 0.8; }).sort(function (a, b) { return a.acc - b.acc; }).slice(0, 5);
    main.appendChild(h('h3', {}, 'Weak spots'));
    main.appendChild(weak.length ? h('div', { class: 'reviewlist' }, weak.map(function (w) { return h('a', { class: 'rv bad', href: '#/topic/' + w.t.id + '/learn' }, h('b', {}, w.t.id + ' ' + w.t.title), ' — ' + Math.round(w.acc * 100) + '% over ' + w.n + ' answers. Revisit →'); }))
      : h('p', { class: 'muted' }, 'Nothing below 80% yet (needs at least 3 answers on a topic).'));

    main.appendChild(h('h3', {}, 'High scores'));
    main.appendChild(h('div', { class: 'statgrid' }, SD.ARCADE.map(function (a) { return stat(SD.fmt(s.hi[a.id] || 0), a.icon + ' ' + a.title); }).concat(SD.bosses.map(function (b) { return stat((s.hi['boss.' + b.id] || 0) + '/100', b.icon + ' ' + b.title); }))));

    main.appendChild(h('h3', {}, 'Badges'));
    main.appendChild(h('div', { class: 'badges' }, SD.BADGES.map(function (b) { return h('div', { class: 'bdg' + (s.badges[b.id] ? ' got' : ''), title: b.desc }, h('div', { class: 'bi' }, b.icon), h('b', {}, b.name), h('span', {}, b.desc)); })));
  }

  /* ---------- Settings & sync ---------- */
  var GHKEY = 'sdq.github';   // kept out of the progress file on purpose: it holds a token
  function ghConf() { try { return JSON.parse(localStorage.getItem(GHKEY)) || {}; } catch (e) { return {}; } }
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function unb64(str) { return decodeURIComponent(escape(atob(str.replace(/\s/g, '')))); }
  function ghCall(c, method, body) {
    var url = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + c.path + (method === 'GET' ? '?ref=' + encodeURIComponent(c.branch) : '');
    return fetch(url, { method: method, headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json' }, body: body ? JSON.stringify(body) : undefined });
  }
  SD.github = {
    push: function (c) {
      return ghCall(c, 'GET').then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('GitHub answered ' + r.status); return r.json(); })
        .then(function (cur) { return ghCall(c, 'PUT', { message: 'Update study progress', content: b64(JSON.stringify(SD.state, null, 1)), branch: c.branch, sha: cur ? cur.sha : undefined }); })
        .then(function (r) { if (!r.ok) throw new Error('GitHub answered ' + r.status); });
    },
    pull: function (c) {
      return ghCall(c, 'GET').then(function (r) { if (!r.ok) throw new Error(r.status === 404 ? 'No progress file in the repository yet' : 'GitHub answered ' + r.status); return r.json(); })
        .then(function (f) { SD.replaceState(JSON.parse(unb64(f.content))); });
    }
  };
  function viewSettings() {
    var s = SD.state, c = ghConf();
    main.appendChild(h('h1', {}, '⚙️ Settings'));

    var snd = h('input', { type: 'checkbox' }); snd.checked = !!s.settings.sound;
    snd.addEventListener('change', function () { s.settings.sound = snd.checked; SD.save(); });
    main.appendChild(h('div', { class: 'card' }, h('label', { class: 'check' }, snd, ' Sound effects')));

    var status = SD.sync.server === 'ok' ? '✓ Auto-saving to progress/progress.json in this folder. Commit and push that file to keep it on GitHub.'
      : SD.sync.server === 'none' ? 'No local save server detected, so progress lives in this browser only. Run “python serve.py” for auto-save to a file, or use the options below.'
        : 'Checking for the local save server…';
    main.appendChild(h('div', { class: 'card' }, h('div', { class: 'label' }, 'Progress file'), h('p', {}, status),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', onclick: function () {
          var a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(s, null, 1)], { type: 'application/json' })), download: 'progress.json' });
          document.body.appendChild(a); a.click(); a.remove();
        } }, '⬇ Export progress.json'),
        h('label', { class: 'btn' }, '⬆ Import progress.json', h('input', { type: 'file', accept: 'application/json', class: 'hidden', onchange: function (e) {
          var f = e.target.files[0]; if (!f) return;
          f.text().then(function (txt) { SD.replaceState(JSON.parse(txt)); SD.toast('Progress imported'); route(); }).catch(function (err) { SD.toast('Import failed: ' + err.message); });
        } })))));

    function field(k, label, type, ph) { var i = h('input', { class: 'num wide', type: type || 'text', placeholder: ph || '', value: c[k] || '', autocomplete: 'off' }); i.addEventListener('change', function () { c[k] = i.value.trim(); localStorage.setItem(GHKEY, JSON.stringify(c)); }); return h('label', { class: 'field' }, h('span', {}, label), i); }
    c.owner = c.owner || 'dannydhkim'; c.repo = c.repo || 'system-design-learning'; c.branch = c.branch || 'main'; c.path = c.path || 'progress/progress.json';
    function run(fn, okMsg) { if (!c.token) return SD.toast('Add a token first'); fn(c).then(function () { SD.toast(okMsg, 'gold'); route(); }).catch(function (e) { SD.toast('GitHub sync failed: ' + e.message); }); }
    main.appendChild(h('div', { class: 'card' }, h('div', { class: 'label' }, 'Sync straight to GitHub (optional)'),
      h('p', { class: 'muted' }, 'Commits the progress file through the GitHub API, for when you are not running serve.py. Needs a fine-grained personal access token with “Contents: read and write” on this one repository. The token is stored only in this browser and is never written to the progress file.'),
      h('div', { class: 'fields' }, field('owner', 'Owner'), field('repo', 'Repository'), field('branch', 'Branch'), field('path', 'File path'), field('token', 'Token', 'password', 'github_pat_…')),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: function () { run(SD.github.push, 'Progress pushed to GitHub'); } }, '⬆ Push to GitHub'),
        h('button', { class: 'btn', onclick: function () { if (confirm('Replace the progress in this browser with the copy on GitHub?')) run(SD.github.pull, 'Progress pulled from GitHub'); } }, '⬇ Pull from GitHub'))));

    main.appendChild(h('div', { class: 'card pitfall' }, h('div', { class: 'label' }, 'Danger zone'),
      h('button', { class: 'btn', onclick: function () { if (confirm('Erase all progress, streaks and high scores? This cannot be undone.')) { SD.resetState(); SD.toast('Progress reset'); route(); } } }, 'Reset all progress')));
  }

  /* ---------- Router ---------- */
  function route() {
    SD.stopTimers();
    var parts = (location.hash || '#/map').replace(/^#\/?/, '').split('/');
    clear(main);
    var v = parts[0] || 'map';
    if (v === 'topic') viewTopic(decodeURIComponent(parts[1] || ''), parts[2]);
    else if (v === 'review') viewReview();
    else if (v === 'arcade') viewArcade(parts[1]);
    else if (v === 'boss') viewBoss(parts[1]);
    else if (v === 'stats') viewStats();
    else if (v === 'settings') viewSettings();
    else viewMap();
    drawHud();
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    main = document.getElementById('main'); hud = document.getElementById('hud');
    SD.load().then(SD.initContent).then(function () {
      SD.on(drawHud);
      window.addEventListener('hashchange', route);
      route();
    });
  });
})(window.SD);
