// Arcade modes (timed drills with high scores) and boss fights (full mock interviews).
(function (SD) {
  'use strict';
  var h = SD.h, clear = SD.clear, shuffle = SD.shuffle, L = SD.labs;

  function endScreen(el, o) {
    var isHigh = SD.setHigh(o.key, o.score);
    var xp = SD.award(Math.min(150, o.xp), { flat: true });   // capped so the arcade cannot outpace real study
    if (isHigh && o.score > 0) { SD.confetti(); SD.beep('win'); }
    clear(el);
    el.appendChild(h('div', { class: 'result' },
      h('div', { class: 'label' }, o.title),
      h('div', { class: 'huge' }, SD.fmt(o.score)),
      h('p', {}, isHigh && o.score > 0 ? '🏅 New high score!' : 'High score: ' + SD.fmt(SD.state.hi[o.key] || 0)),
      o.detail ? h('p', { class: 'muted' }, o.detail) : null,
      h('p', { class: 'muted' }, '+' + xp + ' XP'),
      h('div', { class: 'row center' }, h('button', { class: 'btn primary', onclick: o.again }, 'Play again'), h('a', { class: 'btn', href: '#/arcade' }, 'Arcade'))));
    if (o.review && o.review.length) {
      el.appendChild(h('h3', {}, 'Worth another look'));
      el.appendChild(h('div', { class: 'reviewlist' }, o.review.map(function (r) { return h('div', { class: 'rv bad' }, h('b', {}, r[0]), h('div', { class: 'muted' }, r[1])); })));
    }
  }
  function timerBar() {
    var fill = h('div', { class: 'fill' }), txt = h('span', {});
    return { el: h('div', { class: 'timer' }, h('div', { class: 'track' }, fill), txt), set: function (frac, label) { fill.style.width = Math.max(0, frac * 100) + '%'; fill.classList.toggle('low', frac < 0.25); txt.textContent = label; } };
  }
  // Stop any running clock when the player navigates away.
  var activeTimer = null;
  SD.stopTimers = function () { if (activeTimer) { clearInterval(activeTimer); activeTimer = null; } };
  function every(ms, fn) { SD.stopTimers(); activeTimer = setInterval(fn, ms); }

  SD.arcade = {
    /* ----- Estimation Sprint: 90 seconds of back-of-envelope maths. The clock pauses while you read the working. ----- */
    sprint: function (el) {
      var left = 90000, running = true, score = 0, streak = 0, bestStreak = 0, n = 0, right = 0, missed = [];
      var bar = timerBar(), hud = h('div', { class: 'gamehud' }), body = h('div', {});
      clear(el); el.appendChild(bar.el); el.appendChild(hud); el.appendChild(body);
      function paint() { bar.set(left / 90000, Math.ceil(left / 1000) + 's'); clear(hud); hud.appendChild(h('span', {}, 'Score ', h('b', {}, SD.fmt(score)))); hud.appendChild(h('span', {}, 'Streak ', h('b', {}, '⚡' + streak))); }
      function finish() { SD.stopTimers(); endScreen(el, { key: 'sprint', title: 'Estimation Sprint', score: score, xp: Math.round(score / 25), detail: right + ' of ' + n + ' correct · best streak ' + bestStreak, review: missed, again: function () { SD.arcade.sprint(el); } }); }
      function next() {
        if (left <= 0) return finish();
        var p = L.genEstimate(); running = true;
        L.numQuestion(body, p, function () { next(); }, 'Next →', function (ok) {
          running = false; n++;
          SD.hit(ok);
          if (ok) { right++; streak++; bestStreak = Math.max(bestStreak, streak); score += Math.round(100 * (1 + Math.min(streak - 1, 10) * 0.1)); }
          else { streak = 0; missed.push([p.q, p.how]); }
          SD.save(); paint();
        });
      }
      every(100, function () { if (!running) return; left -= 100; paint(); if (left <= 0) { running = false; finish(); } });
      paint(); next();
    },

    /* ----- Survival: quiz questions from every topic. Three lives, 20 seconds each. ----- */
    survival: function (el) {
      var pool = [];
      SD.topics.forEach(function (t) { t.quiz.forEach(function (q) { pool.push([q[0], q[1], q[2], t.id]); }); });
      pool = shuffle(pool);
      var lives = 3, score = 0, streak = 0, bestStreak = 0, i = 0, left = 0, running = false, missed = [], onTimeout = null;
      var bar = timerBar(), hud = h('div', { class: 'gamehud' }), body = h('div', {});
      clear(el); el.appendChild(bar.el); el.appendChild(hud); el.appendChild(body);
      function paint() { bar.set(left / 20000, Math.ceil(left / 1000) + 's'); clear(hud); hud.appendChild(h('span', {}, 'Score ', h('b', {}, SD.fmt(score)))); hud.appendChild(h('span', {}, 'Streak ', h('b', {}, '⚡' + streak))); hud.appendChild(h('span', {}, '❤️'.repeat(lives) + '🖤'.repeat(3 - lives))); }
      function finish() { SD.stopTimers(); endScreen(el, { key: 'survival', title: 'Survival', score: score, xp: Math.round(score / 20), detail: 'Best streak this run: ' + bestStreak, review: missed, again: function () { SD.arcade.survival(el); } }); }
      function next() {
        if (lives <= 0 || i >= pool.length) return finish();
        var q = pool[i++], opts = shuffle(q[1].map(function (t, k) { return { t: t, ok: k === 0 }; })), after = h('div', {});
        function answer(ok, btn) {
          if (!running) return;
          running = false;
          btns.forEach(function (b, j) { b.disabled = true; if (opts[j].ok) b.classList.add('right'); });
          if (btn && !ok) btn.classList.add('wrong');
          SD.hit(ok, q[3]);
          if (ok) { streak++; bestStreak = Math.max(bestStreak, streak); score += Math.round(100 * (1 + Math.min(streak - 1, 10) * 0.1)); }
          else { streak = 0; lives--; missed.push([q[0], q[2]]); }
          SD.save(); paint();
          after.appendChild(h('div', { class: 'fb ' + (ok ? 'good' : 'bad') }, h('b', {}, ok ? '✓ ' : (btn ? '✗ ' : '⏱ Time. ')), q[2]));
          var nx = h('button', { class: 'btn primary', onclick: next }, lives > 0 ? 'Next →' : 'See results');
          after.appendChild(nx); nx.focus();
        }
        var btns = opts.map(function (o) { return h('button', { class: 'opt', onclick: function () { answer(o.ok, this); } }, o.t); });
        onTimeout = function () { answer(false, null); };
        clear(body);
        body.appendChild(h('div', { class: 'qcount' }, SD.topicById[q[3]].title));
        body.appendChild(h('h3', { class: 'question' }, q[0]));
        body.appendChild(h('div', { class: 'opts' }, btns)); body.appendChild(after);
        left = 20000; running = true; paint();
      }
      every(100, function () { if (!running) return; left -= 100; paint(); if (left <= 0) onTimeout(); });
      next();
    },

    /* ----- Sort Rush: 60 seconds of rapid classification. A miss costs 3 seconds. ----- */
    rush: function (el) {
      var pool = [];
      SD.topics.forEach(function (t) { if (t.lab && t.lab.type === 'sort') t.lab.items.forEach(function (it) { pool.push({ text: it[0], ok: it[1], buckets: t.lab.buckets, topic: t.id }); }); });
      pool = shuffle(pool);
      var left = 60000, score = 0, streak = 0, bestStreak = 0, i = 0, locked = false, missed = [];
      var bar = timerBar(), hud = h('div', { class: 'gamehud' }), body = h('div', {});
      clear(el); el.appendChild(bar.el); el.appendChild(hud); el.appendChild(body);
      function paint() { bar.set(left / 60000, Math.ceil(left / 1000) + 's'); clear(hud); hud.appendChild(h('span', {}, 'Score ', h('b', {}, SD.fmt(score)))); hud.appendChild(h('span', {}, 'Streak ', h('b', {}, '⚡' + streak))); }
      function finish() { SD.stopTimers(); endScreen(el, { key: 'rush', title: 'Sort Rush', score: score, xp: Math.round(score / 2), detail: 'Best streak this run: ' + bestStreak, review: missed, again: function () { SD.arcade.rush(el); } }); }
      function next() {
        if (left <= 0) return finish();
        if (i >= pool.length) { pool = shuffle(pool); i = 0; }
        var it = pool[i++]; locked = false;
        var btns = it.buckets.map(function (b, bi) {
          return h('button', { class: 'opt bucket', onclick: function () {
            if (locked) return; locked = true;
            var ok = bi === it.ok;
            btns[it.ok].classList.add('right');
            SD.hit(ok, it.topic);
            if (ok) { streak++; bestStreak = Math.max(bestStreak, streak); score += 10 + Math.min(streak, 10); }
            else { this.classList.add('wrong'); streak = 0; left -= 3000; missed.push([it.text, '→ ' + it.buckets[it.ok]]); }
            SD.save(); paint();
            setTimeout(next, ok ? 250 : 1100);
          } }, b);
        });
        clear(body);
        body.appendChild(h('div', { class: 'qcount' }, SD.topicById[it.topic].title));
        body.appendChild(h('div', { class: 'sortcard' }, it.text));
        body.appendChild(h('div', { class: 'opts buckets' }, btns));
      }
      every(100, function () { if (locked) return; left -= 100; paint(); if (left <= 0) { locked = true; finish(); } });
      paint(); next();
    }
  };

  SD.ARCADE = [
    { id: 'sprint', icon: '🧮', title: 'Estimation Sprint', desc: '90 seconds of back-of-envelope maths. The clock pauses while you read the working.' },
    { id: 'survival', icon: '❤️', title: 'Survival', desc: 'Questions from every topic. Three lives, 20 seconds each. How long is your streak?' },
    { id: 'rush', icon: '🗂️', title: 'Sort Rush', desc: '60 seconds of rapid classification. A miss costs three seconds.' }
  ];

  /* ---------- Boss fight ---------- */
  SD.runBoss = function (el, boss) {
    var i = 0, scores = [], t0 = Date.now();
    var steps = h('div', { class: 'steps' }), body = h('div', {}), foot = h('div', {});
    function paintSteps() {
      clear(steps);
      boss.phases.forEach(function (p, k) { steps.appendChild(h('div', { class: 'step' + (k < i ? ' done' : k === i ? ' now' : '') }, h('b', {}, k < i ? Math.round(scores[k] * 100) + '%' : String(k + 1)), h('span', {}, p.name))); });
    }
    function phase() {
      paintSteps(); clear(foot);
      if (i >= boss.phases.length) return finish();
      var p = boss.phases[i], shown = false;
      clear(body);
      body.appendChild(h('h2', {}, 'Phase ' + (i + 1) + ': ' + p.name));
      var mountEl = h('div', {}); body.appendChild(mountEl);
      L.mount(mountEl, p.lab, { onDone: function (score) {
        scores[i] = Math.max(scores[i] || 0, score);
        if (p.lab.type === 'teach') SD.award(10, { quest: 'teach' });
        if (shown) return; shown = true;
        var nx = h('button', { class: 'btn primary big', onclick: function () { i++; phase(); window.scrollTo(0, 0); } }, i + 1 < boss.phases.length ? 'Next phase →' : 'Finish interview');
        foot.appendChild(nx);
      } });
    }
    function finish() {
      var total = 0;
      boss.phases.forEach(function (p, k) { total += p.w * (scores[k] || 0); });
      total = Math.round(total);
      var mins = Math.round((Date.now() - t0) / 60000);
      var isHigh = SD.setHigh('boss.' + boss.id, total);
      var xp = SD.award(total, { flat: true });
      if (total >= 80) { SD.confetti(); SD.beep('win'); }
      clear(body); clear(foot);
      var weakest = boss.phases.map(function (p, k) { return [p.name, scores[k] || 0]; }).sort(function (a, b) { return a[1] - b[1]; })[0];
      body.appendChild(h('div', { class: 'result' },
        h('div', { class: 'label' }, boss.title + ' — interview complete'),
        h('div', { class: 'huge' }, total + ' / 100'),
        h('p', {}, total >= 80 ? 'Strong hire signal.' : total >= 60 ? 'Solid. Tighten the weakest phase and try again.' : 'Keep going — replay after revisiting the weak phase.'),
        h('p', { class: 'muted' }, (isHigh ? '🏅 New best · ' : 'Best: ' + SD.state.hi['boss.' + boss.id] + ' · ') + mins + ' min · +' + xp + ' XP'),
        h('p', {}, 'Weakest phase: ', h('b', {}, weakest[0] + ' (' + Math.round(weakest[1] * 100) + '%)')),
        h('div', { class: 'row center' }, h('button', { class: 'btn primary', onclick: function () { SD.runBoss(el, boss); } }, 'Fight again'), h('a', { class: 'btn', href: '#/boss' }, 'All bosses'))));
    }
    clear(el);
    el.appendChild(h('div', { class: 'bosshead' }, h('div', { class: 'bossicon' }, boss.icon), h('div', {}, h('h1', {}, boss.title + ' — ' + boss.sub), h('p', {}, boss.brief))));
    el.appendChild(steps); el.appendChild(body); el.appendChild(foot);
    phase();
  };
})(window.SD);
