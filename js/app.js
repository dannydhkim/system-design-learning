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
    var cs = SD.cloud.describe();
    hud.appendChild(h('div', { class: 'meters' },
      cs.icon ? h('a', { class: 'meter cloud ' + cs.cls, href: '#/settings', title: 'Cloud sync: ' + cs.word, 'aria-label': 'Cloud sync: ' + cs.word }, cs.icon) : null,
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
  // XP the best earlier attempt at a free-text station was worth, or null on the first attempt (see SD.replayXp).
  function prevXp(best, passed, passMark, scale) {
    if (best == null && passed) best = passMark;   // passed before bests were recorded, so it scored at least the pass mark
    return best == null ? null : Math.round(scale * best) + 5;
  }
  function viewTopic(id, station) {
    var t = Object.prototype.hasOwnProperty.call(SD.topicById, id) ? SD.topicById[id] : null;
    if (!t) return location.replace('#/map');
    var all = SD.stationsOf(t);
    if (all.indexOf(station) < 0) station = nextStation(t);
    var st = SD.topicState(id);
    var idx = SD.topics.indexOf(t), prev = SD.topics[idx - 1], nxt = SD.topics[idx + 1];
    var boss = t.boss ? SD.bosses.filter(function (b) { return b.id === t.boss; })[0] : null;   // case studies with a mock interview

    main.appendChild(h('div', { class: 'crumbs' }, h('a', { href: '#/map' }, '← Map'), h('span', { class: 'spacer' }),
      prev ? h('a', { href: '#/topic/' + prev.id }, '‹ ' + prev.id) : null, nxt ? h('a', { href: '#/topic/' + nxt.id }, nxt.id + ' ›') : null));
    var head = h('div', {});
    main.appendChild(head);
    if (SD.deckErrors[t.mod]) main.appendChild(deckNotice([SD.deckErrors[t.mod]]));
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
      else if (boss) foot.appendChild(h('div', { class: 'row wrap' }, h('a', { class: 'btn primary big', href: '#/boss/' + boss.id }, 'Now the mock interview: ' + boss.icon + ' ' + boss.title + ' →'),
        nxt ? h('a', { class: 'btn big', href: '#/topic/' + nxt.id }, 'Next topic: ' + nxt.id + ' →') : null));
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
      if (boss) body.appendChild(h('div', { class: 'card' }, h('div', { class: 'label' }, '🏆 Mock interview for this case study'),
        h('p', {}, boss.icon + ' ', h('b', {}, boss.title), ' — ' + boss.sub + '. The stations here prepare for it; the boss fight is the full interview, scored out of 100.'),
        h('a', { class: 'btn', href: '#/boss/' + boss.id }, 'Go to the boss fight →')));
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
      // Correct answers up to the previous best pay replay XP; only answers beyond it pay in full.
      L.quiz(m2, { qs: t.quiz }, { topicId: id, paid: st.quizBest != null ? Math.round(st.quizBest * t.quiz.length) : st.done.quiz ? t.quiz.length : 0, onDone: function (score) {
        st.quizBest = Math.max(st.quizBest || 0, score);
        if (score >= 0.66) passed(score === 1 ? 'Perfect.' : 'Passed.'); else { SD.save(); retry('Pass mark is ' + Math.ceil(0.66 * t.quiz.length) + ' of ' + t.quiz.length + '. The questions and their options are reshuffled each time.'); }
      } });
    }
    else if (station === 'lab') {
      body.appendChild(h('div', { class: 'label' }, '🔧 ' + L.nameOf(t.lab)));
      var m3 = h('div', {}); body.appendChild(m3);
      // A tick with no record of which lab earned it may come from a lab since replaced, so it earns no replay discount.
      var sig = L.sigOf(t.lab);
      L.mount(m3, t.lab, { topicId: id, replay: !!st.done.lab && st.notes.labSig === sig, onDone: function (score) {
        st.labBest = Math.max(st.labBest || 0, score);
        if (score >= L.PASS) {
          st.notes.labSig = sig;
          Object.keys(st).forEach(function (k) { if (/^seqS\d+$/.test(k)) delete st[k]; });   // part scores are only kept until the lab is passed
          passed('Lab passed at ' + Math.round(score * 100) + '%.');
        } else { SD.save(); retry('Pass mark is ' + Math.round(L.PASS * 100) + '%. You scored ' + Math.round(score * 100) + '%.'); }
      } });
    }
    else if (station === 'explain') {
      body.appendChild(h('p', { class: 'brief' }, 'Summarise it in your own words. Writing forces you to find the gaps that re-reading hides.'));
      var m4 = h('div', {}); body.appendChild(m4);
      L.teach(m4, { prompt: t.explain[0], rubric: t.explain[1], saved: st.notes.explain }, { onDone: function (score, text) {
        var prev = prevXp(st.explainBest, st.done.explain, 0.5, 20);
        st.notes.explain = text; st.explainBest = Math.max(st.explainBest || 0, score);
        SD.award(SD.replayXp(Math.round(20 * score) + 5, prev), { quest: 'teach' });
        if (score >= 0.5) passed('Saved. You can re-read your own explanation here later.'); else retry('Covered under half the rubric — revisit Learn, then try again.');
      } });
    }
    else if (station === 'duck') {
      body.appendChild(h('p', { class: 'brief' }, 'The rubber duck method: teach it to someone who knows nothing. Speak out loud if you can — the duck will push back.'));
      var m5 = h('div', {}); body.appendChild(m5);
      L.teach(m5, { duck: true, prompt: 'Teach me "' + t.title + '" from scratch — what it is, why it matters, and when I would use it.', followups: t.duck, rubric: DUCK_RUBRIC, saved: st.notes.duck }, { onDone: function (score, text) {
        var prev = prevXp(st.duckBest, st.done.duck, 0.6, 25);
        st.notes.duck = text; st.duckBest = Math.max(st.duckBest || 0, score);
        SD.award(SD.replayXp(Math.round(25 * score) + 5, prev), { quest: 'teach' });
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
  // A card deck that failed to load must not pass for "this topic has no cards".
  function deckNotice(files) {
    return h('div', { class: 'fb bad', role: 'alert' }, h('b', {}, '⚠ Some flashcards did not load. '),
      'The file ' + files.join(' and ') + ' could not be read, so its cards are missing from Recall and from review until it loads. Your progress is not affected. ',
      h('button', { class: 'btn mini', onclick: function () { location.reload(); } }, 'Reload'));
  }
  function viewReview() {
    var due = SD.dueCards(), fresh = SD.newCards(), built = fresh.filter(function (id) { return SD.topicById[SD.cards[id].topic]; });
    main.appendChild(h('h1', {}, '🧠 Daily review'));
    var lost = Object.keys(SD.deckErrors).map(function (m) { return SD.deckErrors[m]; });
    if (lost.length) main.appendChild(deckNotice(lost));
    main.appendChild(h('p', { class: 'muted' }, 'Spaced repetition: each card returns just before you are likely to forget it. A few minutes daily beats an hour weekly.'));
    var body = h('section', { class: 'station' });
    var intro = h('div', { class: 'row wrap' });
    function start(ids) { clear(body); L.recall(body, { ids: ids }, { onDone: function () { body.appendChild(h('a', { class: 'btn primary big', href: '#/map' }, 'Back to the map')); } }); }
    if (due.length) intro.appendChild(h('button', { class: 'btn primary big', onclick: function () { start(due.slice(0, 20)); } }, 'Review ' + Math.min(20, due.length) + ' due card' + (due.length > 1 ? 's' : '')));
    else intro.appendChild(h('div', { class: 'fb good' }, h('b', {}, '✓ Nothing due. '), 'Come back tomorrow, or learn new cards.'));
    var pool = built.length ? built : fresh.filter(function (id) { return !SD.cards[id].section; });
    if (pool.length) intro.appendChild(h('button', { class: 'btn big', onclick: function () { start(pool.slice(0, 5)); } }, 'Learn 5 new cards (' + pool.length + ' unseen)'));
    body.appendChild(intro);
    // The interview deck: sections in the order the deck suggests. A session is that section's due cards, then new ones.
    if (SD.deckSections.length) {
      var t0 = SD.today(), cs = SD.state.cards;
      body.appendChild(h('h3', {}, '🎯 ' + SD.deckSections[0].deck));
      body.appendChild(h('p', { class: 'muted' }, 'Say the answer out loud, reveal, then answer the probe before you grade yourself. Sections are listed in suggested study order; each session is up to 10 cards, due ones first.'));
      body.appendChild(h('div', { class: 'grid' }, SD.deckSections.map(function (sec) {
        var ids = Object.keys(SD.cards).filter(function (id) { return SD.cards[id].section === sec.id; }).sort();
        var seen = ids.filter(function (id) { return cs[id]; }), dueNow = seen.filter(function (id) { return cs[id].due <= t0; }), unseen = ids.filter(function (id) { return !cs[id]; });
        var session = dueNow.concat(unseen).slice(0, 10);
        return h('button', { class: 'tile decktile', disabled: !session.length, onclick: function () { start(session); window.scrollTo(0, 0); } },
          h('h3', {}, sec.id + ' · ' + sec.title),
          h('div', { class: 'row wrap' }, h('span', { class: 'pill' }, seen.length + ' / ' + ids.length + ' seen'), dueNow.length ? h('span', { class: 'pill duepill' }, dueNow.length + ' due') : null, !session.length ? h('span', { class: 'pill' }, 'nothing due') : null));
      })));
    }
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
    if (mode && Object.prototype.hasOwnProperty.call(SD.arcade, mode)) { var el = h('section', { class: 'station' }); main.appendChild(h('div', { class: 'crumbs' }, h('a', { href: '#/arcade' }, '← Arcade'))); main.appendChild(el); return SD.arcade[mode](el); }
    main.appendChild(h('h1', {}, '🕹️ Arcade'));
    main.appendChild(h('p', { class: 'muted' }, 'Timed drills for speed and fluency. Wrong answers always show the working.'));
    main.appendChild(h('div', { class: 'grid' }, SD.ARCADE.map(function (a) {
      return h('a', { class: 'tile', href: '#/arcade/' + a.id }, h('div', { class: 'tileicon' }, a.icon), h('h3', {}, a.title), h('p', {}, a.desc), h('div', { class: 'pill' }, '🏅 High score: ' + SD.fmt(SD.state.hi[a.id] || 0)));
    })));
  }
  function viewBoss(id) {
    var b = SD.bosses.filter(function (x) { return x.id === id; })[0];
    if (b) { var el = h('section', { class: 'station' }); main.appendChild(h('div', { class: 'crumbs' }, h('a', { href: '#/boss' }, '← Bosses'))); main.appendChild(el); return SD.runBoss(el, b); }
    if (id) return location.replace('#/map');
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
  function viewSettings() {
    var s = SD.state;
    main.appendChild(h('h1', {}, '⚙️ Settings'));

    var snd = h('input', { type: 'checkbox' }); snd.checked = !!s.settings.sound;
    snd.addEventListener('change', function () { s.settings.sound = snd.checked; SD.save(); });
    main.appendChild(h('div', { class: 'card' }, h('label', { class: 'check' }, snd, ' Sound effects')));

    var status = SD.sync.server === 'ok' ? '✓ Also saving to progress/progress.json in this folder (serve.py is running). That file is a local backup and stays out of git.'
      : SD.sync.server === 'retrying' ? '⚠ The local save server stopped answering. Progress is kept in this browser and will be written to progress/progress.json once the server is back.'
      : SD.sync.server === 'none' ? 'Progress is saved in this browser. Export a copy now and then as a backup, or set up cloud sync below.'
        : 'Checking for the local save server…';
    var everywhere = SD.cloud.conf().token ? ' Cloud sync is on, so this applies to every synced device, including progress another device has not synced yet.' : '';
    main.appendChild(h('div', { class: 'card' }, h('div', { class: 'label' }, 'Progress file'), h('p', {}, status),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', onclick: function () {
          var a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(s, null, 1)], { type: 'application/json' })), download: 'progress.json' });
          document.body.appendChild(a); a.click(); a.remove();
        } }, '⬇ Export progress.json'),
        h('label', { class: 'btn' }, '⬆ Import progress.json', h('input', { type: 'file', accept: 'application/json', class: 'hidden', onchange: function (e) {
          var f = e.target.files[0]; if (!f) return;
          f.text().then(function (txt) {
            var obj;
            try { obj = JSON.parse(txt); } catch (err) { throw new Error('the file is not valid JSON'); }
            if (!confirm('Replace the progress on this device with the file?' + everywhere)) return;
            SD.replaceState(obj); SD.cloud.ackReset(); SD.toast('Progress imported'); route();
          }).catch(function (err) { SD.toast('Import failed: ' + err.message); });
        } })))));

    var card = h('div', { class: 'card' });
    main.appendChild(card);
    drawCloud(card);
    SD.cloud.onChange = function () { drawCloud(card); };
    SD.onLeave(function () { SD.cloud.onChange = null; });

    // Answer judge
    var J = SD.judge, jc = J.conf(), spent = J.spend();
    var jkey = h('input', { class: 'num wide', type: 'password', placeholder: 'sk-ant-…', value: jc.key, autocomplete: 'off', spellcheck: 'false' });
    jkey.addEventListener('change', function () { J.setConf('key', jkey.value); route(); });
    var jauto = h('input', { type: 'checkbox' }); jauto.checked = jc.auto;
    jauto.addEventListener('change', function () { J.setConf('auto', jauto.checked); });
    main.appendChild(h('div', { class: 'card' }, h('div', { class: 'label' }, 'Answer judge (optional)'),
      h('p', { class: 'muted' }, 'On flashcards, a small Claude model (' + jc.model + ') compares what you typed or dictated with the reference answer and says what you covered, missed or got wrong. You still pick the grade. It needs your own Claude API key from platform.claude.com; the key is stored only in this browser, is sent only to api.anthropic.com, and is never written to the progress file. Paste it on each device. With no connection (or no key), the offline judge below grades instead, if you have downloaded it.'),
      h('div', { class: 'fields' }, h('label', { class: 'field' }, h('span', {}, 'Claude API key'), jkey)),
      h('label', { class: 'check' }, jauto, ' Check my answer automatically when I reveal a card'),
      h('p', { class: 'muted' }, jc.calls ? 'Used so far on this device: ' + jc.calls + ' check' + (jc.calls === 1 ? '' : 's') + ', ' + SD.fmt(jc.inTok) + ' input and ' + SD.fmt(jc.outTok) + ' output tokens' + (spent != null ? ', about $' + spent.toFixed(4) + ' at list price.' : '.') : 'Nothing has been sent yet. Expect well under a tenth of a cent per card at list price; this page shows the running total.'),
      h('p', { class: 'muted' }, 'Dictation (the 🎙 button on a card) is separate and free: the browser transcribes your speech. It works in Chrome, Edge and Safari, with a connection.')));

    // Offline models
    var offline = h('div', { class: 'card' });
    main.appendChild(offline);
    drawOffline(offline);

    main.appendChild(h('div', { class: 'card pitfall' }, h('div', { class: 'label' }, 'Danger zone'),
      h('button', { class: 'btn', onclick: function () { if (confirm('Erase all progress, streaks and high scores? This cannot be undone.' + everywhere)) { SD.resetState(); SD.cloud.ackReset(); SD.toast('Progress reset'); route(); } } }, 'Reset all progress')));
  }

  // The offline-models card: download or remove the small grading model and the Whisper dictation model (js/local-ai.js).
  function drawOffline(card) {
    var A = SD.localAI;
    clear(card);
    card.appendChild(h('div', { class: 'label' }, 'Offline grading and dictation (optional)'));
    card.appendChild(h('p', { class: 'muted' }, 'With no connection, flashcards can still be graded and dictated by small models that run in this browser. Each is a one-time download from huggingface.co (the model) and cdn.jsdelivr.net (the library and runtime), kept in this browser afterwards; nothing you type or say leaves the device. The offline judge is much less reliable than Claude: treat its verdict as a hint. When online with an API key, Claude grades and the browser dictates, as before.'));
    function row(kind, title, planP, note) {
      var box = h('div', { class: 'fb' }), d = A.info(kind);
      card.appendChild(box);
      if (d) {
        box.appendChild(h('div', {}, h('b', {}, '✓ ' + title + ': '), d.name + ' (about ' + SD.fmt(d.mb) + ' MB, ' + (d.device === 'webgpu' ? 'runs on the GPU' : 'runs on the CPU') + '), downloaded ' + d.at + '.'));
        box.appendChild(h('button', { class: 'btn mini', onclick: function () { if (confirm('Delete the ' + title.toLowerCase() + ' from this browser?')) A.remove(kind).then(function () { drawOffline(card); }); } }, 'Remove'));
        return;
      }
      planP.then(function (spec) {
        if (!spec) { box.appendChild(h('div', {}, h('b', {}, title + ': '), note(null))); return; }
        var btn = h('button', { class: 'btn', onclick: function () {
          btn.disabled = true; btn.textContent = 'Downloading… 0%';
          A.download(kind, function (f) { btn.textContent = 'Downloading… ' + Math.floor(f * 100) + '%'; }).then(function () {
            SD.toast(title + ' ready offline'); drawOffline(card);
          }, function (e) { btn.disabled = false; btn.textContent = 'Download failed — try again'; SD.toast(title + ': ' + (e && e.message || e)); });
        } }, 'Download ' + spec.name + ' (about ' + SD.fmt(spec.mb) + ' MB)');
        box.appendChild(h('div', {}, h('b', {}, title + ': '), note(spec)));
        box.appendChild(btn);
      });
    }
    row('judge', 'Offline judge', A.judgePlan(), function (s) {
      return s ? 'runs on this device\'s GPU (WebGPU). Expect a rough hint: in testing it never called a wrong answer correct, but it often misjudged partly right ones.' : 'not offered on this device: it needs WebGPU on a laptop or desktop. Smaller models that fit a phone graded no better than chance in testing.';
    });
    row('asr', 'Offline dictation', Promise.resolve(A.ASR), function () { return 'used when there is no connection or the browser has no speech recognition; your answer is recorded, then transcribed when you stop.'; });
  }

  // The cloud sync card. Redrawn when the sync status changes, unless the owner is typing in one of its fields.
  function drawCloud(card) {
    var C = SD.cloud, active = document.activeElement;
    if (card.firstChild && active && card.contains(active) && /^(INPUT|SUMMARY)$/.test(active.tagName)) {
      var line = card.querySelector('.cloudstatus');
      if (line) { clear(line); fillStatus(line); }
      return;
    }
    var c = C.conf(), q = C.conflict, open = card.querySelector('details') ? card.querySelector('details').open : false;
    function fillStatus(el) { var d = C.describe(); el.className = 'cloudstatus fb ' + (d.cls === 'ok' ? 'good' : d.cls === 'bad' || d.cls === 'warn' ? 'bad' : ''); el.appendChild(h('b', {}, (d.icon ? d.icon + ' ' : '') + d.word + '. ')); el.appendChild(document.createTextNode(d.text)); }
    function field(k, label, type, ph) {
      var i = h('input', { class: 'num wide', type: type || 'text', placeholder: ph || '', value: c[k] || '', autocomplete: 'off', spellcheck: 'false' });
      i.addEventListener('change', function () { C.setConf(k, i.value); });
      return h('label', { class: 'field' }, h('span', {}, label), i);
    }
    clear(card);
    card.appendChild(h('div', { class: 'label' }, 'Cloud sync'));
    var st = h('div', { role: 'status' }); fillStatus(st); card.appendChild(st);
    if (q) {
      var when = new Date(q.at).toLocaleString();
      card.appendChild(h('div', { class: 'fb bad', role: 'alert' },
        h('p', {}, q.drops === 'online'
          ? 'This device was reset or had progress imported on ' + when + '. The online copy has progress from before that (' + SD.fmt(q.remote.xp) + ' XP), which syncing would erase. Which copy do you want to keep?'
          : 'The online copy was reset or replaced on ' + when + ' from another device. This device has progress that was never synced (' + SD.fmt(SD.state.xp) + ' XP here), which syncing would erase. Which copy do you want to keep?'),
        h('p', { class: 'muted' }, 'The copy you keep replaces the other on every synced device. Export this device\'s progress first if you are unsure.'),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn', onclick: function () { C.resolve('device').then(route); } }, 'Keep this device\'s progress'),
          h('button', { class: 'btn', onclick: function () { C.resolve('online').then(route); } }, 'Keep the online copy'))));
    }
    card.appendChild(h('div', { class: 'fields' }, field('token', 'Token', 'password', 'github_pat_…'), field('label', 'Device name (optional)', 'text', 'e.g. Laptop')));
    var more = h('details', {}, h('summary', {}, 'Repository details'),
      h('div', { class: 'fields' }, field('owner', 'Owner'), field('repo', 'Repository'), field('branch', 'Branch'), field('path', 'File path')));
    more.open = open;
    card.appendChild(more);
    card.appendChild(h('div', { class: 'row wrap' }, h('button', { class: 'btn', disabled: !c.token || C.status === 'syncing', onclick: function () { C.syncNow(); } }, '⟳ Sync now')));
    card.appendChild(h('details', {}, h('summary', {}, 'How to set this up'), h('ol', { class: 'points' },
      h('li', {}, 'On GitHub, create a new ', h('b', {}, 'private'), ' repository named ' + C.DEFAULTS.repo + '. Sync refuses a public one.'),
      h('li', {}, 'Create a fine-grained personal access token: Settings → Developer settings → Fine-grained tokens. Give it access to that one repository only, with “Contents: read and write”.'),
      h('li', {}, 'Paste the token here on each device. It is stored only in this browser and never written to the progress file.')),
      h('p', { class: 'muted' }, 'After that, progress syncs by itself: at launch, shortly after you answer, and when the connection comes back. Progress from two devices is merged, never overwritten.')));
  }

  /* ---------- App updates and offline ---------- */
  // sw.js keeps a copy of the app so it opens with no connection. When a newer version has been downloaded it waits;
  // the page offers a reload and never reloads by itself, so a quiz or boss fight is not interrupted. Closing
  // every window of the app also switches to the new version.
  function offerUpdate(worker) {
    var box = document.getElementById('toasts');
    if (box.querySelector('.update')) return;
    box.appendChild(h('div', { class: 'toast update', role: 'status' }, 'New version ready ',
      h('button', { class: 'btn mini', onclick: function () { reloading = true; worker.postMessage('activate'); } }, 'Reload'),
      h('button', { class: 'btn mini', 'aria-label': 'Dismiss', onclick: function () { box.querySelector('.update').remove(); } }, '✕')));
  }
  var reloading = false;
  function startOffline() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function watch(w) { if (w) w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); }); }
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      watch(reg.installing);
      reg.addEventListener('updatefound', function () { watch(reg.installing); });
    }).catch(function () { /* offline support is optional */ });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (reloading) location.reload(); });
    // Ask the browser not to evict this site's storage when space runs low (it matters most on iOS).
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  }

  /* ---------- Router ---------- */
  function route() {
    SD.stopTimers(); SD.leave();
    var parts = (location.hash || '#/map').replace(/^#\/?/, '').split('/'), id;
    try { id = decodeURIComponent(parts[1] || ''); } catch (e) { return location.replace('#/map'); }   // e.g. #/topic/%
    clear(main);
    var v = parts[0] || 'map';
    if (v === 'topic') viewTopic(id, parts[2]);
    else if (v === 'review') viewReview();
    else if (v === 'arcade') viewArcade(id);
    else if (v === 'boss') viewBoss(id);
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
      SD.cloud.start();
      startOffline();
    });
  });
})(window.SD);
