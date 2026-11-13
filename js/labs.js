// Interactive activities. Every activity is mounted with SD.labs.mount(el, spec, ctx)
// and reports a score between 0 and 1 through ctx.onDone(score).
(function (SD) {
  'use strict';
  var h = SD.h, clear = SD.clear, shuffle = SD.shuffle, pick = SD.pick, fmt = SD.fmt;
  var L = SD.labs = {};

  function scoreLine(score) { return Math.round(score * 100) + '%'; }
  function feedback(ok, text) { return h('div', { class: 'fb ' + (ok ? 'good' : 'bad') }, h('b', {}, ok ? '✓ ' : '✗ '), text); }
  // XP for an award inside an activity: ctx.replay (a lab passed before, a boss fought before) pays a fifth, see SD.replayXp.
  function xp(ctx, base) { return ctx.replay ? SD.replayXp(base, base) : base; }
  function srcLink(key) { var s = SD.sources[key]; return s ? h('a', { href: s[1], target: '_blank', rel: 'noopener noreferrer' }, s[0]) : null; }

  /* ================= Evidence (every answer cites its sources: js/data/sources.js) ================= */
  // ev: array of source keys, or 'calc' when the explanation itself derives the answer.
  L.evidence = function (ev) {
    if (!ev) return null;
    if (ev === 'calc') return h('div', { class: 'evidence' }, h('span', { class: 'label' }, 'Evidence'), 'Derived in the explanation above — check the working.');
    var links = [];
    ev.forEach(function (k) { var a = srcLink(k); if (a) { if (links.length) links.push(' · '); links.push(a); } });
    return links.length ? h('div', { class: 'evidence' }, h('span', { class: 'label' }, 'Evidence'), links) : null;
  };
  // refs: [[sourceKey, what it supports — usually with the passage quoted]]
  L.sourceList = function (refs) {
    return h('ul', { class: 'points' }, refs.map(function (r) { var a = srcLink(r[0]); return a ? h('li', {}, a, ' — ' + r[1]) : null; }));
  };

  /* ================= Quiz (multiple choice, immediate explanation) ================= */
  // qs: [question, [correct, wrong...], why, evidence, topicId?]. The data lists the correct option first; what is shown is
  // shuffled each time a question is drawn, so neither a position nor a sequence of positions can be memorised.
  // ctx.paid: how many correct answers an earlier run already paid in full; those pay replay XP this time.
  L.quiz = function (el, spec, ctx) {
    var qs = shuffle(spec.qs), i = 0, right = 0;   // question order and option order both change on every attempt
    function show() {
      var refocus = i > 0 && SD.ownsFocus(el);
      clear(el);
      if (i >= qs.length) {
        el.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, right + ' / ' + qs.length), h('p', {}, right === qs.length ? 'Flawless.' : 'Read the explanations for the ones you missed — they come back in Survival mode.')));
        return ctx.onDone(right / qs.length);
      }
      var q = qs[i], opts = shuffle(q[1].map(function (text, idx) { return { text: text, ok: idx === 0 }; }));
      var after = h('div', {});
      var btns = opts.map(function (o) {
        return h('button', { class: 'opt', onclick: function () {
          btns.forEach(function (b, j) { b.disabled = true; if (opts[j].ok) b.classList.add('right'); });
          if (!o.ok) this.classList.add('wrong'); else right++;
          SD.hit(o.ok, q[4] || ctx.topicId);
          if (o.ok) SD.award(right > (ctx.paid || 0) ? xp(ctx, 6) : SD.replayXp(6, 6), { quest: 'quiz' }); else SD.save();
          var fbEl = feedback(o.ok, q[2]), evEl = L.evidence(q[3]);
          if (evEl) fbEl.appendChild(evEl);
          after.appendChild(fbEl);
          var nx = h('button', { class: 'btn primary', onclick: function () { i++; show(); } }, i + 1 < qs.length ? 'Next →' : 'Finish');
          after.appendChild(nx); nx.focus();
        } }, o.text);
      });
      el.appendChild(h('div', { class: 'qcount' }, 'Question ' + (i + 1) + ' of ' + qs.length));
      el.appendChild(h('h3', { class: 'question' }, q[0]));
      el.appendChild(h('div', { class: 'opts' }, btns));
      el.appendChild(after);
      if (refocus) btns[0].focus();
    }
    show();
  };

  /* ================= Recall (flashcards with spaced repetition) ================= */
  L.recall = function (el, spec, ctx) {
    var queue = spec.ids.slice(), again = {}, done = 0, total = queue.length, good = 0;
    function show(graded) {
      var refocus = graded && SD.ownsFocus(el);
      clear(el);
      if (!queue.length) {
        el.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, '🧠 ' + total + ' card' + (total === 1 ? '' : 's') + ' reviewed'), h('p', {}, 'Each one is now scheduled to return just before you would forget it.')));
        return ctx.onDone(total ? good / total : 1);
      }
      var id = queue[0], c = SD.cards[id], st = SD.state.cards[id];
      var answerBox = h('div', {});
      var ta = h('textarea', { class: 'ta', rows: 3, placeholder: 'Answer from memory first — type it, or say it out loud. Then reveal.' });
      var reveal = h('button', { class: 'btn primary', onclick: function () {
        reveal.remove(); ta.readOnly = true;
        answerBox.appendChild(h('div', { class: 'answer' }, h('div', { class: 'label' }, 'Answer'), c.a, c.key ? h('div', { class: 'keyc' }, '💡 ' + c.key) : null));
        answerBox.appendChild(h('div', { class: 'label' }, 'How well did you recall it?'));
        answerBox.appendChild(h('div', { class: 'grades' }, ['Again', 'Hard', 'Good', 'Easy'].map(function (name, g) {
          return h('button', { class: 'btn grade g' + g, onclick: function () {
            SD.gradeCard(id, g);
            queue.shift();
            if (g === 0 && !again[id]) { again[id] = 1; queue.push(id); } else { done++; if (g >= 2) good++; }
            show(true);
          } }, name, h('small', {}, g === 0 ? 'repeat now' : SD.srs.label(st, g)));
        })));
        answerBox.querySelector('.grade').focus();   // the reveal button that had focus is gone
      } }, 'Reveal answer');
      el.appendChild(h('div', { class: 'qcount' }, 'Card ' + (done + 1) + ' of ' + total + (st ? '' : ' · new')));
      el.appendChild(h('h3', { class: 'question' }, c.q));
      el.appendChild(ta); el.appendChild(reveal); el.appendChild(answerBox);
      if (refocus) reveal.focus();
    }
    show();
  };

  /* ================= Teach / explain (free text or speech, self-graded against a rubric) ================= */
  // spec: {prompt, rubric[], followups[], duck:boolean, saved:string}
  L.teach = function (el, spec, ctx) {
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    var texts = [], step = 0, prompts = [spec.prompt].concat(spec.followups || []);
    var halt = function () {};   // stops the current step's microphone and stopwatch
    function words(s) { return (s.trim().match(/\S+/g) || []).length; }
    SD.onLeave(function () { halt(); });

    function ask() {
      halt();
      clear(el);
      var isFollow = step > 0;
      var ta = h('textarea', { class: 'ta', rows: isFollow ? 4 : 7, placeholder: 'No notes. Plain words, as if to someone who has never heard of it.' });
      var wc = h('span', { class: 'muted' }, '0 words');
      var spoke = h('input', { type: 'checkbox', id: 'spoke' });
      ta.addEventListener('input', function () { wc.textContent = words(ta.value) + ' words'; });

      // Stopwatch for explaining out loud
      var t0 = null, tick = null, clock = h('span', { class: 'clock' }, '0:00');
      var aloud = h('button', { class: 'btn', onclick: function () {
        if (tick) { clearInterval(tick); tick = null; aloud.textContent = '🗣 Start speaking timer'; spoke.checked = true; return; }
        t0 = Date.now(); aloud.textContent = '⏹ Stop';
        tick = setInterval(function () { if (!clock.isConnected) return halt(); var s = Math.floor((Date.now() - t0) / 1000); clock.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 250);
      } }, '🗣 Start speaking timer');

      // Dictation, where the browser supports it
      var rec = null, mic = null;
      halt = function () {
        if (tick) { clearInterval(tick); tick = null; }
        if (rec) { var r = rec; rec = null; r.onresult = null; r.onerror = null; try { r.abort(); } catch (e) { /* already stopped */ } }
      };
      if (Rec) {
        mic = h('button', { class: 'btn', onclick: function () {
          if (rec) { rec.stop(); return; }
          try {
            rec = new Rec(); rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
            rec.onresult = function (e) {
              for (var i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) ta.value += (ta.value && !/\s$/.test(ta.value) ? ' ' : '') + e.results[i][0].transcript.trim();
              ta.dispatchEvent(new Event('input'));
            };
            rec.onend = function () { rec = null; mic.textContent = '🎤 Dictate'; mic.classList.remove('live'); };
            rec.onerror = function (e) { SD.toast('Dictation unavailable: ' + e.error); };
            rec.start(); mic.textContent = '⏹ Stop dictation'; mic.classList.add('live');
          } catch (e) { rec = null; SD.toast('Dictation could not start'); }
        } }, '🎤 Dictate');
      }

      if (spec.duck) el.appendChild(h('div', { class: 'duck' }, h('div', { class: 'duck-face' }, '🦆'), h('div', { class: 'bubble' }, isFollow ? prompts[step] : 'Quack. I know nothing about this. ' + prompts[0])));
      else el.appendChild(h('h3', { class: 'question' }, prompts[step]));
      el.appendChild(ta);
      el.appendChild(h('div', { class: 'row wrap' }, mic, aloud, clock, h('span', { class: 'spacer' }), wc));
      el.appendChild(h('label', { class: 'check' }, spoke, ' I explained it out loud instead of typing'));
      var warn = h('div', { class: 'muted' });
      el.appendChild(warn);
      el.appendChild(h('button', { class: 'btn primary', onclick: function () {
        if (words(ta.value) < (isFollow ? 5 : 15) && !spoke.checked) { warn.textContent = 'Give it a real attempt first — write at least ' + (isFollow ? 5 : 15) + ' words, or tick the box if you said it aloud.'; return; }
        halt();
        texts.push(ta.value.trim() || '(spoken aloud)');
        step++; if (step < prompts.length) ask(); else grade();
      } }, step + 1 < prompts.length ? 'Answer →' : 'Compare with the rubric →'));
      if (!isFollow && spec.saved) el.appendChild(h('details', { class: 'prev' }, h('summary', {}, 'Your previous attempt'), h('p', {}, spec.saved)));
      ta.focus();
    }

    function grade() {
      clear(el);
      var boxes = [];
      el.appendChild(h('h3', { class: 'question' }, 'Mark your own work'));
      el.appendChild(h('p', { class: 'muted' }, 'Be strict. Tick a point only if you actually said it — not if you merely recognise it now.'));
      el.appendChild(h('div', { class: 'yours' }, prompts.map(function (p, i) { return h('div', {}, i ? h('div', { class: 'label' }, '🦆 ' + p) : h('div', { class: 'label' }, 'You said'), h('p', {}, texts[i])); })));
      el.appendChild(h('div', { class: 'rubric' }, spec.rubric.map(function (r) {
        var cb = h('input', { type: 'checkbox' }); boxes.push(cb);
        return h('label', { class: 'check' }, cb, ' ' + r);
      })));
      el.appendChild(h('button', { class: 'btn primary', onclick: function () {
        var n = boxes.filter(function (b) { return b.checked; }).length, score = n / boxes.length;
        var missed = spec.rubric.filter(function (r, i) { return !boxes[i].checked; });
        clear(el);
        el.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, n + ' / ' + boxes.length + ' points covered'),
          missed.length ? h('div', {}, h('p', {}, 'Say these out loud once now — that is the gap closing:'), h('ul', {}, missed.map(function (m) { return h('li', {}, m); }))) : h('p', {}, 'Complete. You could teach this.')));
        ctx.onDone(score, texts.join('\n\n'));
      } }, 'Score it'));
    }
    ask();
  };

  /* ================= Sort (classify items into buckets) ================= */
  L.sort = function (el, spec, ctx) {
    var items = shuffle(spec.items), i = 0, right = 0, misses = [];
    function show() {
      var refocus = i > 0 && SD.ownsFocus(el);
      clear(el);
      if (i >= items.length) {
        el.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, right + ' / ' + items.length),
          misses.length ? h('ul', {}, misses.map(function (m) { return h('li', {}, m[0] + ' → ', h('b', {}, spec.buckets[m[1]])); })) : h('p', {}, 'All sorted correctly.')));
        return ctx.onDone(right / items.length);
      }
      var it = items[i], fb = h('div', {});
      var btns = spec.buckets.map(function (b, bi) {
        return h('button', { class: 'opt bucket', onclick: function () {
          var ok = bi === it[1];
          btns.forEach(function (x, j) { x.disabled = true; if (j === it[1]) x.classList.add('right'); });
          if (ok) right++; else { this.classList.add('wrong'); misses.push(it); }
          SD.hit(ok, ctx.topicId); if (ok) SD.award(xp(ctx, 3)); else SD.save();
          setTimeout(function () { i++; show(); }, ok ? 450 : 1300);
        } }, b);
      });
      if (spec.brief) el.appendChild(h('p', { class: 'brief' }, spec.brief));
      el.appendChild(h('div', { class: 'qcount' }, (i + 1) + ' of ' + items.length));
      el.appendChild(h('div', { class: 'sortcard' }, it[0]));
      el.appendChild(h('div', { class: 'opts buckets' }, btns));
      el.appendChild(fb);
      if (refocus) btns[0].focus();
    }
    show();
  };

  /* ================= Order (arrange steps) ================= */
  L.order = function (el, spec, ctx) {
    var correct = spec.items, cur = shuffle(correct), tries = 0, firstScore = null, solved = false, moves = [];
    if (cur.join('|') === correct.join('|')) cur.reverse();
    // Once solved the board is locked, so the check cannot be pressed again for more XP.
    function show(marks) {
      clear(el); moves = [];
      if (spec.brief) el.appendChild(h('p', { class: 'brief' }, spec.brief));
      el.appendChild(h('ol', { class: 'orderlist' }, cur.map(function (text, i) {
        var up = h('button', { class: 'btn mini', 'aria-label': 'Move up', disabled: solved || i === 0, onclick: function () { swap(i, i - 1, 0); } }, '↑');
        var down = h('button', { class: 'btn mini', 'aria-label': 'Move down', disabled: solved || i === cur.length - 1, onclick: function () { swap(i, i + 1, 1); } }, '↓');
        moves.push([up, down]);
        return h('li', { class: marks ? (marks[i] ? 'right' : 'wrong') : '' }, h('span', { class: 'otext' }, text), up, down);
      })));
      var chk = h('button', { class: 'btn primary', disabled: solved, onclick: check }, 'Check order');
      el.appendChild(chk);
      return chk;
    }
    // Keep focus on the moved item's button (or its other one, at either end of the list).
    function swap(a, b, dir) {
      if (solved) return;
      var t = cur[a]; cur[a] = cur[b]; cur[b] = t; show();
      var btn = moves[b][dir].disabled ? moves[b][1 - dir] : moves[b][dir];
      btn.focus();
    }
    function check() {
      if (solved) return;
      tries++;
      var marks = cur.map(function (t, i) { return t === correct[i]; }), n = marks.filter(Boolean).length;
      if (firstScore === null) firstScore = n / correct.length;
      var ok = n === correct.length;
      solved = ok;
      SD.hit(ok, ctx.topicId);
      var chk = show(marks);
      if (!ok) chk.focus();
      if (ok) { SD.award(xp(ctx, 10)); el.appendChild(feedback(true, 'Correct order' + (tries > 1 ? ' (attempt ' + tries + ').' : ' on the first try.'))); ctx.onDone(firstScore); }
      else { SD.save(); el.appendChild(feedback(false, n + ' of ' + correct.length + ' in the right place. Adjust and check again.')); }
    }
    show();
  };

  /* ================= Pick (choose the N best options) ================= */
  L.pick = function (el, spec, ctx) {
    var opts = shuffle(spec.options), chosen = {};
    function show() {
      clear(el);
      if (spec.brief) el.appendChild(h('p', { class: 'brief' }, spec.brief));
      var count = h('span', { class: 'muted' }, '0 of ' + spec.want + ' chosen');
      var btns = opts.map(function (o, i) {
        return h('button', { class: 'opt', onclick: function () {
          if (!chosen[i] && Object.keys(chosen).length >= spec.want) return SD.toast('Only ' + spec.want + ' — deselect one first');
          if (chosen[i]) delete chosen[i]; else chosen[i] = 1;
          this.classList.toggle('sel', !!chosen[i]);
          count.textContent = Object.keys(chosen).length + ' of ' + spec.want + ' chosen';
        } }, o[0]);
      });
      el.appendChild(h('div', { class: 'opts' }, btns));
      el.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: function () {
        if (Object.keys(chosen).length < spec.want) return SD.toast('Choose ' + spec.want);
        var right = 0;
        clear(el);
        el.appendChild(h('div', { class: 'reviewlist' }, opts.map(function (o, i) {
          var sel = !!chosen[i]; if (sel && o[1]) right++;
          return h('div', { class: 'rv ' + (o[1] ? 'good' : 'bad') + (sel ? ' sel' : '') },
            h('b', {}, (sel ? (o[1] ? '✓ Chosen, good: ' : '✗ Chosen, weak: ') : (o[1] ? '○ Missed: ' : '· Skipped: '))), o[0], h('div', { class: 'muted' }, o[2]));
        })));
        var score = right / spec.want;
        SD.hit(score === 1, ctx.topicId); SD.award(xp(ctx, Math.round(12 * score)));
        el.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, right + ' / ' + spec.want)));
        ctx.onDone(score);
      } }, 'Lock in'), count));
    }
    show();
  };

  /* ================= API builder ================= */
  var METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  var STATUSES = ['200', '201', '202', '204', '302', '400', '404', '409', '429'];
  L.api = function (el, spec, ctx) {
    var paths = shuffle(spec.paths), rows = [], graded = false;
    function sel(options, ph) { return h('select', { class: 'sel' }, [h('option', { value: '' }, ph)].concat(options.map(function (o) { return h('option', { value: o }, o); }))); }
    if (spec.brief) el.appendChild(h('p', { class: 'brief' }, spec.brief + ' For each need, choose the method, path and success status.'));
    spec.tasks.forEach(function (t) {
      var r = { t: t, m: sel(METHODS, 'method'), p: sel(paths, 'path'), s: sel(STATUSES, 'status'), fb: h('div', {}) };
      rows.push(r);
      el.appendChild(h('div', { class: 'apirow' }, h('div', { class: 'need' }, t.need), h('div', { class: 'apisel' }, r.m, r.p, r.s), r.fb));
    });
    var out = h('div', {});
    el.appendChild(h('button', { class: 'btn primary', onclick: function () {
      if (rows.some(function (r) { return !r.m.value || !r.p.value || !r.s.value; })) return SD.toast('Fill in every row first');
      var pts = 0, max = rows.length * 3;
      rows.forEach(function (r) {
        var want = [].concat(r.t.status);   // a task may accept more than one success status
        var ok = [r.m.value === r.t.method, r.p.value === r.t.path, want.indexOf(r.s.value) >= 0];
        [r.m, r.p, r.s].forEach(function (s, i) { s.classList.toggle('right', ok[i]); s.classList.toggle('wrong', !ok[i]); });
        pts += ok.filter(Boolean).length;
        var all = ok.every(Boolean);
        clear(r.fb).appendChild(feedback(all, (all ? '' : r.t.method + ' ' + r.t.path + ' → ' + want.join(' or ') + '. ') + r.t.note));
      });
      var score = pts / max;
      clear(out).appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, pts + ' / ' + max), h('p', { class: 'muted' }, 'Real APIs vary in style; what matters is being able to justify each choice.')));
      if (!graded) { graded = true; SD.hit(score === 1, ctx.topicId); SD.award(xp(ctx, Math.round(15 * score))); ctx.onDone(score); }
    } }, 'Check API'));
    el.appendChild(out);
  };

  /* ================= Diagram builder ================= */
  var COMP = {
    client: ['📱', 'Client'], cdn: ['🌍', 'CDN'], lb: ['⚖️', 'Load balancer'], gateway: ['🚪', 'API gateway'], app: ['🧩', 'App service'],
    cache: ['⚡', 'Cache'], db: ['🗄️', 'Database'], replica: ['📚', 'Read replica'], queue: ['📨', 'Queue'], worker: ['🛠️', 'Workers'],
    blob: ['🪣', 'Object storage'], search: ['🔎', 'Search index'], ws: ['🔌', 'WebSocket server'], idgen: ['🔢', 'ID generator'],
    ledger: ['📒', 'Ledger'], psp: ['🏦', 'Card processor (external)'],
    index: ['🧭', 'Candidate index (ANN)'], features: ['🧮', 'Online feature store'], ranker: ['🧠', 'Ranking model (GPU)'], warehouse: ['🏛️', 'Warehouse (offline store)']
  };
  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  // Build a design, then load-test it. The picture borrows Breakscale's vocabulary: dashes moving along
  // an arrow are requests (denser and faster means more of them), and the bar in each box is how many of
  // its slots are taken. The numbers come from js/hld.js, which runs the design on Breakscale's engine.
  L.diagram = function (el, spec, ctx) {
    // Phones get a tall, narrow canvas so boxes stay finger-sized.
    var narrow = (el.clientWidth || window.innerWidth) < 560;
    var W = narrow ? 360 : 760, H = narrow ? 560 : 440, BW = narrow ? 112 : 120, BH = 54;
    var HLD = SD.hld, canSim = !!(spec.sim && window.BreakscaleSim && HLD);
    var nodes = {}, edges = {}, selected = null, best = 0, awarded = false, revealed = false, fails = 0, counted = false;
    var running = null, shown = null, nodeEls = {}, edgeEls = {};
    var label = function (id) { return (spec.labels && spec.labels[id]) || COMP[id][1]; };
    var palette = shuffle(spec.required.concat(Object.keys(spec.decoys || {})));
    var canvas = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'diagram', role: 'group', 'aria-label': 'Architecture diagram canvas: select a caller, then the component it calls' });
    var gE = svg('g', {}), gN = svg('g', {});
    canvas.appendChild(gE); canvas.appendChild(gN);
    var pal = h('div', { class: 'palette' }), out = h('div', {}), hud = h('div', { class: 'lt-hud' });
    var hint = h('p', { class: 'muted' }, 'Tap a component to add or remove it, and drag boxes to arrange them. To draw an arrow, tap the caller and then the thing it calls. Tap the same pair again to remove it.');
    var runBtn = h('button', { class: 'btn primary', onclick: function () { if (running) finish(true); else run(); } });
    var revealBtn = h('button', { class: 'btn hidden', onclick: reveal }, 'Show reference design');

    function freeSpot() {
      var n = Object.keys(nodes).length;
      var cols = narrow ? 3 : 4, gap = (W - 16 - cols * BW) / (cols - 1);
      return [8 + (n % cols) * (BW + gap), 16 + Math.floor(n / cols) * (narrow ? 84 : 104)];
    }
    function edited() { if (shown) { shown = null; clear(out); paintHud(null); } }
    // Redrawing replaces every chip and box, so the one that had focus is found by id and focused again.
    function focusedId(box) { var a = document.activeElement; return a && box.contains(a) ? a.getAttribute('data-id') : null; }
    function drawPalette() {
      var again = focusedId(pal);
      clear(pal);
      palette.forEach(function (id) {
        var chip = h('button', { class: 'chip' + (nodes[id] ? ' on' : ''), 'data-id': id, 'aria-pressed': nodes[id] ? 'true' : 'false', disabled: !!running, onclick: function () {
          if (nodes[id]) { delete nodes[id]; Object.keys(edges).forEach(function (k) { if (k.split('>').indexOf(id) >= 0) delete edges[k]; }); if (selected === id) selected = null; }
          else { var p = freeSpot(); nodes[id] = { x: p[0], y: p[1] }; }
          edited(); draw();
        } }, COMP[id][0] + ' ' + label(id));
        pal.appendChild(chip);
        if (id === again) chip.focus();
      });
    }
    function pt(evt) { var m = canvas.getScreenCTM().inverse(); var p = canvas.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY; return p.matrixTransform(m); }

    // An arrow runs from the edge of one box to the edge of the other, so the head is never hidden.
    function ends(a, b) {
      var ax = a.x + BW / 2, ay = a.y + BH / 2, bx = b.x + BW / 2, by = b.y + BH / 2, dx = bx - ax, dy = by - ay;
      var len = Math.sqrt(dx * dx + dy * dy) || 1, t = Math.min((BW / 2 + 3) / Math.abs(dx || 1e-9), (BH / 2 + 3) / Math.abs(dy || 1e-9));
      if (t > 0.5) t = 0.5;
      return { x1: ax + dx * t, y1: ay + dy * t, x2: bx - dx * t, y2: by - dy * t, ux: dx / len, uy: dy / len, len: len * (1 - 2 * t) };
    }
    function placeEdge(k) {
      var p = k.split('>'), a = nodes[p[0]], b = nodes[p[1]], e = edgeEls[k];
      if (!a || !b || !e) return;
      var g = ends(a, b), hx = g.x2 - g.ux * 9, hy = g.y2 - g.uy * 9;
      [e.wire, e.flow].forEach(function (ln) { ln.setAttribute('x1', g.x1); ln.setAttribute('y1', g.y1); ln.setAttribute('x2', hx); ln.setAttribute('y2', hy); });
      e.head.setAttribute('points', [g.x2, g.y2, hx - g.uy * 5, hy + g.ux * 5, hx + g.uy * 5, hy - g.ux * 5].map(function (v) { return v.toFixed(1); }).join(' '));
    }
    function draw() {
      drawPalette();
      var again = focusedId(gN);
      while (gE.firstChild) gE.removeChild(gE.firstChild);
      while (gN.firstChild) gN.removeChild(gN.firstChild);
      nodeEls = {}; edgeEls = {};
      Object.keys(edges).forEach(function (k) {
        var p = k.split('>');
        if (!nodes[p[0]] || !nodes[p[1]]) return;
        var g = svg('g', { class: 'edge' }), e = edgeEls[k] = { g: g, wire: svg('line', { class: 'wire' }), flow: svg('line', { class: 'flow' }), head: svg('polygon', { class: 'head' }) };
        g.appendChild(e.wire); g.appendChild(e.flow); g.appendChild(e.head); gE.appendChild(g);
        placeEdge(k);
      });
      Object.keys(nodes).forEach(function (id) {
        var n = nodes[id], g = svg('g', { class: 'node' + (selected === id ? ' sel' : ''), transform: 'translate(' + n.x + ',' + n.y + ')', tabindex: 0,
          role: 'button', 'aria-pressed': selected === id ? 'true' : 'false', 'aria-label': label(id), 'data-id': id });
        g.appendChild(svg('rect', { class: 'box', width: BW, height: BH, rx: 9 }));
        var t = svg('text', { class: 'name', x: BW / 2, y: 20, 'text-anchor': 'middle' }), full = label(id), fits = narrow ? 17 : 18;
        // A long name is shortened to fit the box; the chip above the canvas and the tooltip keep it whole.
        t.textContent = COMP[id][0] + ' ' + (full.length > fits ? full.slice(0, fits - 1).trim() + '…' : full);
        if (full.length > (narrow ? 11 : 13)) t.setAttribute('class', 'name small');
        var tip = svg('title', {}); tip.textContent = full; g.appendChild(tip);
        var read = svg('text', { class: 'read', x: BW / 2, y: 36, 'text-anchor': 'middle' });
        var track = svg('rect', { class: 'track', x: 8, y: 43, width: BW - 16, height: 5, rx: 2.5 }), fill = svg('rect', { class: 'meter', x: 8, y: 43, width: 0, height: 5, rx: 2.5 });
        var shed = svg('text', { class: 'shed', x: BW - 2, y: -5, 'text-anchor': 'end' });
        [t, read, track, fill, shed].forEach(function (c) { g.appendChild(c); });
        nodeEls[id] = { g: g, read: read, fill: fill, shed: shed };
        var start = null, moved = false;
        g.addEventListener('pointerdown', function (e) { var p = pt(e); start = { dx: p.x - n.x, dy: p.y - n.y, x: p.x, y: p.y }; moved = false; g.setPointerCapture(e.pointerId); e.preventDefault(); });
        g.addEventListener('pointermove', function (e) {
          if (!start) return;
          var p = pt(e);
          if (!moved && Math.abs(p.x - start.x) + Math.abs(p.y - start.y) < 6) return;
          moved = true;
          n.x = Math.max(0, Math.min(W - BW, p.x - start.dx)); n.y = Math.max(12, Math.min(H - BH, p.y - start.dy));
          g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
          // Move the arrows in place, so the dragged box keeps its pointer capture and a running test keeps its picture.
          Object.keys(edgeEls).forEach(function (k) { if (k.split('>').indexOf(id) >= 0) placeEdge(k); });
        });
        g.addEventListener('pointerup', function () { var wasDrag = moved; start = null; if (!wasDrag) tap(id); });
        g.addEventListener('pointercancel', function () { start = null; });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(id); } });
        gN.appendChild(g);
        if (id === again) g.focus();
      });
      if (shown) paint(shown);
    }
    function tap(id) {
      if (running) return;
      if (selected === null) selected = id;
      else if (selected === id) selected = null;
      else {
        var k = selected + '>' + id, back = id + '>' + selected;
        if (edges[k]) delete edges[k]; else { delete edges[back]; edges[k] = 1; }   // drawing the opposite way turns the arrow round
        selected = null; edited();
      }
      draw();
    }
    function design() {
      var d = { nodes: {}, edges: {} };
      Object.keys(nodes).forEach(function (id) { d.nodes[id] = true; });
      Object.keys(edges).forEach(function (k) { var p = k.split('>'); if (nodes[p[0]] && nodes[p[1]]) d.edges[k] = true; });
      return d;
    }

    /* ---------- the live picture ---------- */
    function rate(n) { return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : fmt(Math.round(n)); }
    function tile(name, value, cls) { return h('div', { class: 'stat ' + (cls || '') }, h('span', {}, name), h('b', {}, value)); }
    function paintHud(v, phase, progress) {
      clear(hud);
      if (!v) return;
      var g = spec.sim.goals, lost = 100 * v.errorRate;
      hud.appendChild(h('div', { class: 'lt-phase' }, h('span', {}, phase), h('div', { class: 'track' }, (function () { var f = h('div', { class: 'fill' }); f.style.width = Math.round(progress * 100) + '%'; return f; })())));
      hud.appendChild(h('div', { class: 'readout lt-tiles' },
        tile('Arriving', rate(v.offered) + ' /s'), tile('Answered', rate(v.good) + ' /s'),
        tile('Lost (goal ≤ ' + g.errors + '%)', (lost < 10 ? lost.toFixed(1) : Math.round(lost)) + '%', lost > g.errors ? 'bad' : 'good'),
        tile('p99 (goal ≤ ' + g.p99 + ' ms)', v.p99 ? Math.round(v.p99) + ' ms' : '—', v.p99 > g.p99 ? 'bad' : 'good')));
      hud.appendChild(h('p', { class: 'muted lt-key' }, 'Moving dashes are requests: closer together means more of them. The bar in a box is how many of its slots are taken. Red means requests are being turned away, and a grey dashed arrow carries nothing. Simulated with the ',
        h('a', { href: 'https://github.com/workersio/breakscale', target: '_blank', rel: 'noopener noreferrer' }, 'Breakscale'), ' engine; the capacities are illustrative.'));
    }
    function paint(v) {
      var top = 1;
      Object.keys(v.edges).forEach(function (k) { top = Math.max(top, v.edges[k].flow); });
      Object.keys(edgeEls).forEach(function (k) {
        var e = edgeEls[k], s = v.edges[k], to = v.nodes[k.split('>')[1]];
        var live = s && s.flow > 0, share = live ? Math.log(1 + 30 * s.flow / top) / Math.log(31) : 0;   // 0..1, compressed so small flows still show
        e.g.setAttribute('class', 'edge ' + (live ? (to && to.shed > 0.01 * Math.max(1, to.arriving) ? 'live hurt' : 'live') : 'idle'));
        var cycle = 30 - 20 * share;                      // heavy flow packs the dashes together
        e.flow.style.setProperty('--on', '3');
        e.flow.style.setProperty('--off', (cycle - 3).toFixed(1));
        e.flow.style.setProperty('--cycle', (-cycle).toFixed(1));
        e.flow.style.setProperty('--dur', (1.1 - 0.75 * share).toFixed(2) + 's');
      });
      Object.keys(nodeEls).forEach(function (id) {
        var e = nodeEls[id], n = v.nodes[id];
        if (!n) { e.g.setAttribute('data-state', 'off'); e.read.textContent = 'no traffic'; e.fill.setAttribute('width', 0); e.shed.textContent = ''; return; }
        var level = n.kind === 'queue' ? n.queueFill : n.busy, losing = n.shed > 0.01 * Math.max(1, n.arriving);
        e.g.setAttribute('data-state', n.kind === 'client' ? 'src' : losing ? 'bad' : level > 0.8 ? 'warn' : 'ok');
        e.read.textContent = n.kind === 'client' ? rate(n.arriving || v.offered) + ' /s sent' : n.kind === 'queue' ? rate(n.queued) + ' waiting' : rate(n.arriving) + ' /s · ' + Math.round(level * 100) + '%';
        e.fill.setAttribute('width', Math.max(0, Math.min(1, level)) * (BW - 16));
        e.shed.textContent = losing ? '−' + rate(n.shed) + ' /s' : '';
      });
    }

    /* ---------- run ---------- */
    function setBusy(on) { runBtn.textContent = on ? 'Skip to the result' : '▶ Run load test'; canvas.classList.toggle('running', on); drawPalette(); }
    function run() {
      if (!canSim) return checkStatic();
      clear(out); selected = null; draw();
      var compiled = HLD.compile(spec, design(), label);
      if (!compiled.topology.edges.length) {
        out.appendChild(feedback(false, 'No request can leave the client yet. Draw an arrow from the client to whatever it calls first.'));
        return;
      }
      var r = HLD.start(spec, compiled, 1), speed = r.endMs / 8000, last = performance.now(), lastPaint = 0;
      running = { r: r, compiled: compiled, raf: 0 };
      setBusy(true);
      function frame(now) {
        if (!running) return;
        if (!canvas.isConnected) { running = null; return; }      // the player left the page
        var more = r.step(Math.min(100, now - last) * speed); last = now;
        if (now - lastPaint > 100 || !more) {
          lastPaint = now; shown = r.view(); paint(shown);
          var t = r.timeMs();
          paintHud(shown, t < r.warmMs ? 'Warming up' : 'Measuring', t / r.endMs);
        }
        if (more) running.raf = requestAnimationFrame(frame); else finish(false);
      }
      running.raf = requestAnimationFrame(frame);
    }
    function finish(skip) {
      var run = running; if (!run) return;
      cancelAnimationFrame(run.raf); running = null;
      if (skip) { while (run.r.step(2000)) { /* run it out */ } }
      shown = run.r.view(); paint(shown); paintHud(shown, 'Finished', 1);
      setBusy(false);
      verdict(HLD.judge(spec, run.compiled, run.r, label));
    }
    function row(cls, bold, text) { return h('div', { class: 'rv ' + cls }, h('b', {}, bold), text); }
    function verdict(v) {
      clear(out);
      var score = v.score;
      if (revealed) score = Math.min(score, 0.5);
      var list = h('div', { class: 'reviewlist' });
      v.checks.forEach(function (c) { list.appendChild(row(c.ok ? 'good' : 'bad', (c.ok ? '✓ ' : '✗ ') + c.label + ': ' + c.text, ' (' + c.limit + ')')); });
      v.problems.forEach(function (p) { if (p.type === 'unserved') list.appendChild(row('bad', '✗ ', p.text)); });
      v.findings.forEach(function (f) { list.appendChild(row('bad', f.root ? '✗ Where it breaks — ' : '· ', f.text)); });
      v.problems.forEach(function (p) { if (p.type !== 'unserved') list.appendChild(row('warn', '△ ', p.text)); });
      var missing = spec.required.filter(function (id) { return !nodes[id]; });
      if (!v.passed && fails >= 1 && missing.length) list.appendChild(row('', '· Hint: ', 'the reference design uses ' + missing.length + ' component' + (missing.length > 1 ? 's' : '') + ' you have not placed' + (fails >= 2 ? ': ' + missing.map(label).join(', ') + '.' : '.')));
      if (v.passed) spec.required.forEach(function (id) { if (nodes[id] && spec.why && spec.why[id]) list.appendChild(row('good', '✓ ' + label(id) + ': ', spec.why[id])); });
      var head = v.passed ? (v.clean ? 'It holds.' : 'It holds, with loose ends.') : v.held ? 'It runs, but the design is incomplete.' : 'It falls over.';
      var note = v.passed
        ? (revealed ? 'Scored at 50% because the reference design was shown.' : v.clean ? 'Other valid designs exist. The test is whether yours carries the load and you can defend every arrow.' : 'Each box or arrow that carries nothing costs 10%. Be ready to justify everything you draw.')
        : 'Change the design and run it again. Nothing is scored until it holds.';
      out.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, head + (v.passed ? ' ' + scoreLine(score) : '')), h('p', { class: 'muted' }, note)));
      out.appendChild(list);
      // Only the first clean run counts as a right answer; re-running a design that already held proves nothing new.
      var perfect = v.clean && !revealed, firstPerfect = perfect && !counted;
      if (!counted) { SD.hit(perfect, ctx.topicId); counted = perfect; }
      if (!v.passed) { fails++; revealBtn.classList.remove('hidden'); SD.save(); return; }
      if (score > best) best = score;
      if (firstPerfect) { SD.count('perfectDiagram', true); SD.confetti(); }
      if (!awarded) { awarded = true; SD.award(xp(ctx, Math.round(25 * score))); } else SD.save();
      ctx.onDone(best);
    }
    // Without the engine (the script failed to load) fall back to comparing against the reference design.
    function checkStatic() {
      var need = spec.edges.map(function (e) { return e[0] + '>' + e[1]; });
      var haveN = spec.required.filter(function (id) { return nodes[id]; }), haveE = need.filter(function (k) { return edges[k]; });
      var decoys = Object.keys(spec.decoys || {}).filter(function (id) { return nodes[id]; });
      var score = Math.max(0, (haveN.length + haveE.length) / (spec.required.length + need.length) - 0.08 * decoys.length);
      clear(out);
      var list = h('div', { class: 'reviewlist' });
      spec.required.forEach(function (id) { if (!nodes[id]) list.appendChild(row('bad', '✗ Missing: ' + label(id) + '. ', (spec.why && spec.why[id]) || '')); });
      spec.edges.forEach(function (e) { if (nodes[e[0]] && nodes[e[1]] && !edges[e[0] + '>' + e[1]]) list.appendChild(row('bad', '✗ No arrow: ', label(e[0]) + ' → ' + label(e[1]))); });
      decoys.forEach(function (id) { list.appendChild(row('bad', '✗ Unjustified: ' + label(id) + '. ', spec.decoys[id])); });
      out.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, scoreLine(score)), h('p', { class: 'muted' }, 'The load test could not start, so this compares your design with the reference one.')));
      out.appendChild(list);
      revealBtn.classList.remove('hidden');
      if (score > best) best = score;
      if (!counted) { counted = score >= 0.999; SD.hit(counted, ctx.topicId); }
      if (!awarded) { awarded = true; SD.award(xp(ctx, Math.round(25 * score))); } else SD.save();
      ctx.onDone(best);
    }
    function reveal() {
      if (running) return;
      revealed = true; nodes = {}; edges = {}; selected = null; edited();
      // Simple layered layout: breadth-first from the client.
      var adj = {}; spec.edges.forEach(function (e) { (adj[e[0]] = adj[e[0]] || []).push(e[1]); (adj[e[1]] = adj[e[1]] || []).push(e[0]); });
      var depth = {}, q = [spec.required[0]]; depth[q[0]] = 0;
      while (q.length) { var c = q.shift(); (adj[c] || []).forEach(function (n) { if (depth[n] == null) { depth[n] = depth[c] + 1; q.push(n); } }); }
      var cols = {}; spec.required.forEach(function (id) { var d = depth[id] == null ? 0 : depth[id]; (cols[d] = cols[d] || []).push(id); });
      // One band per depth. A phone is three boxes wide, so a crowded depth wraps onto a second band.
      var bands = [];
      Object.keys(cols).sort(function (a, b) { return a - b; }).forEach(function (d) {
        var ids = cols[d], rows = narrow ? Math.ceil(ids.length / 3) : 1, per = Math.ceil(ids.length / rows);
        for (var r = 0; r < rows; r++) bands.push(ids.slice(r * per, (r + 1) * per));
      });
      bands.forEach(function (ids, bi) {
        var along = bi / Math.max(1, bands.length - 1);
        ids.forEach(function (id, i) {
          var across = i - (ids.length - 1) / 2;
          nodes[id] = narrow ? { x: (W - BW) / 2 + across * (BW + 8), y: 14 + along * (H - BH - 24) }
            : { x: 10 + along * (W - BW - 20), y: (H - BH) / 2 + across * 92 };
        });
      });
      // A crowded design can give its own positions for the wide canvas, where the layered layout would hide arrows.
      if (!narrow && spec.layout) Object.keys(spec.layout).forEach(function (id) { if (nodes[id]) nodes[id] = { x: spec.layout[id][0], y: spec.layout[id][1] }; });
      spec.edges.forEach(function (e) { edges[e[0] + '>' + e[1]] = 1; });
      draw();
      out.appendChild(feedback(true, canSim ? 'This is one reference design. Run the load test to watch it carry the traffic.' : 'This is one reference design.'));
    }
    if (spec.brief) el.appendChild(h('p', { class: 'brief' }, spec.brief));
    if (canSim) el.appendChild(h('p', { class: 'lt-load' }, h('b', {}, 'The load test: '), spec.sim.load + ' It passes if no more than ' + spec.sim.goals.errors + ' in 100 requests are lost and the slowest 1 in 100 (p99) take no longer than ' + spec.sim.goals.p99 + ' ms.' + (spec.sim.scale ? ' Simulated at 1/' + spec.sim.scale + ' scale; the figures shown are scaled back up.' : '')));
    el.appendChild(hint); el.appendChild(pal); el.appendChild(h('div', { class: 'canvaswrap' }, canvas));
    el.appendChild(h('div', { class: 'row' }, runBtn, revealBtn));
    el.appendChild(hud); el.appendChild(out);
    nodes[spec.required[0]] = { x: 8, y: 16 };
    setBusy(false); draw();
    // The canvas is sized once, for a phone or for a desktop. If the window later crosses that line (a rotated phone,
    // a resized window) the drawing would only shrink until its labels cannot be read, so it is laid out again:
    // a wide canvas reads left to right and a tall one top to bottom, so the boxes keep their order along that axis.
    function relayout() {
      if (!canvas.isConnected) return window.removeEventListener('resize', relayout);
      var nowNarrow = (el.clientWidth || window.innerWidth) < 560;
      if (running || nowNarrow === narrow) return;
      var ids = Object.keys(nodes), oldBW = BW, wasNarrow = narrow;
      // Group the boxes into lanes along the old reading direction and across it (boxes that were level share a lane).
      function lanes(key, tol) {
        var sorted = ids.slice().sort(function (p, q) { return nodes[p][key] - nodes[q][key]; }), lane = {}, n = -1, last = null;
        sorted.forEach(function (id) { var v = nodes[id][key]; if (last === null || v - last > tol) n++; lane[id] = n; last = v; });
        return { of: lane, count: n + 1 };
      }
      var along = wasNarrow ? lanes('y', BH / 2) : lanes('x', oldBW / 2), across = wasNarrow ? lanes('x', oldBW / 2) : lanes('y', BH / 2);
      narrow = nowNarrow; W = narrow ? 360 : 760; H = narrow ? 560 : 440; BW = narrow ? 112 : 120;
      canvas.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var seen = {}, clash = ids.some(function (id) { var k = along.of[id] + ':' + across.of[id]; if (seen[k]) return true; seen[k] = 1; return false; });
      var fits = narrow ? along.count * (BH + 10) <= H - 12 && across.count * (BW + 8) <= W + 8 : along.count * (BW + 8) <= W + 8 && across.count * (BH + 10) <= H - 12;
      function at(i, n, lo, hi) { return n < 2 ? (lo + hi) / 2 : lo + i * (hi - lo) / (n - 1); }
      if (!clash && fits) ids.forEach(function (id) {
        var a = along.of[id], c = across.of[id];
        nodes[id] = narrow ? { x: at(c, across.count, 0, W - BW), y: at(a, along.count, 12, H - BH) } : { x: at(a, along.count, 0, W - BW), y: at(c, across.count, 12, H - BH) };
      });
      else {   // too many lanes for the new shape: fall back to a plain grid in reading order
        var order = ids.slice().sort(function (p, q) { return along.of[p] - along.of[q] || across.of[p] - across.of[q]; });
        ids.forEach(function (id) { delete nodes[id]; });
        order.forEach(function (id) { var sp = freeSpot(); nodes[id] = { x: sp[0], y: sp[1] }; });
      }
      draw();
    }
    window.addEventListener('resize', relayout);
  };

  /* ================= Estimation ================= */
  function parseNum(s) {
    var m = String(s).replace(/[, _]/g, '').toLowerCase().match(/^(-?\d*\.?\d+(?:e\d+)?)([kmbt])?/);
    if (!m) return NaN;
    return parseFloat(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[m[2]] || 1);
  }
  L.checkNum = function (input, p) {
    var v = parseNum(input);
    if (isNaN(v)) return false;
    return p.tol === 0 ? Math.abs(v - p.a) < 1e-9 : Math.abs(v - p.a) <= Math.abs(p.a) * p.tol;
  };
  var GEN = {
    qps: function () { var d = pick([1, 5, 10, 50, 100]), n = pick([2, 5, 10, 20]), a = d * 1e6 * n / 86400; return { q: d + 'M daily users each make ' + n + ' requests a day. Average requests per second?', a: a, unit: 'req/s', tol: 0.25, how: d + 'M × ' + n + ' = ' + fmt(d * n) + 'M a day ÷ 86,400 s ≈ ' + fmt(a) + '. Shortcut: a day ≈ 10⁵ seconds.' }; },
    storage: function () { var w = pick([1, 10, 100]), s = pick([[200, '200 bytes'], [1000, '1 KB'], [2000, '2 KB']]), y = pick([1, 5]), gb = w * 1e6 * s[0] * 365 * y / 1e9, tb = gb >= 1000; return { q: w + 'M writes a day at ' + s[1] + ' each, kept for ' + y + ' year' + (y > 1 ? 's' : '') + '. Storage in ' + (tb ? 'TB' : 'GB') + '?', a: tb ? gb / 1000 : gb, unit: tb ? 'TB' : 'GB', tol: 0.25, how: w + 'M × ' + s[1] + ' = ' + fmt(w * s[0] / 1000) + ' GB a day × 365 × ' + y + ' ≈ ' + fmt(tb ? gb / 1000 : gb) + (tb ? ' TB.' : ' GB.') }; },
    bandwidth: function () { var q = pick([1000, 5000, 10000]), p = pick([10, 100, 500]), a = q * p / 1000; return { q: fmt(q) + ' requests/s, each returning ' + p + ' KB. Outbound bandwidth in MB/s?', a: a, unit: 'MB/s', tol: 0.1, how: fmt(q) + ' × ' + p + ' KB = ' + fmt(q * p) + ' KB/s = ' + fmt(a) + ' MB/s.' }; },
    downtime: function () { var o = pick([['99%', 3.65, 'days'], ['99.9%', 8.76, 'hours'], ['99.99%', 52.6, 'minutes'], ['99.999%', 5.26, 'minutes']]); return { q: o[0] + ' availability allows how many ' + o[2] + ' of downtime per year?', a: o[1], unit: o[2] + '/year', tol: 0.2, how: 'A year is 8,760 hours (525,600 minutes). The unavailable fraction of that is ≈ ' + o[1] + ' ' + o[2] + '.' }; },
    throughput: function () { var r = pick([1, 2, 4]), s = pick([8, 10, 16, 50]), ms = pick([20, 50, 100, 200]), a = r * s * 1000 / ms; return { q: r + ' server' + (r > 1 ? 's' : '') + ', each with ' + s + ' slots and a ' + ms + ' ms service time. Maximum throughput?', a: a, unit: 'req/s', tol: 0.05, how: r + ' × ' + s + ' slots × (1000 ÷ ' + ms + ') = ' + fmt(a) + ' req/s.' }; },
    util: function () { var s = pick([10, 20, 50]), ms = pick([50, 100, 200]), cap = s * 1000 / ms, u = pick([0.4, 0.5, 0.7, 0.8, 0.9]), lam = cap * u; return { q: fmt(lam) + ' req/s arrive at a server with ' + s + ' slots and a ' + ms + ' ms service time. Utilisation in %?', a: u * 100, unit: '%', tol: 0.05, how: 'Capacity = ' + s + ' × (1000 ÷ ' + ms + ') = ' + fmt(cap) + ' req/s. ' + fmt(lam) + ' ÷ ' + fmt(cap) + ' = ' + fmt(u * 100) + '%.' }; },
    servers: function () { var p = pick([2000, 6000, 12000]), c = pick([200, 500]), a = Math.ceil(p / (c * 0.7)); return { q: 'Peak load is ' + fmt(p) + ' req/s. Each server handles ' + c + ' req/s. How many servers to stay at or below 70% utilisation?', a: a, unit: 'servers', tol: 0.1, how: 'Usable capacity per server = ' + c + ' × 0.7 = ' + fmt(c * 0.7) + '. ' + fmt(p) + ' ÷ ' + fmt(c * 0.7) + ' → round up to ' + a + '.' }; },
    littles: function () { var l = pick([50, 200, 1000, 2000]), w = pick([20, 50, 100, 500]), a = l * w / 1000; return { q: fmt(l) + ' req/s arrive and each spends ' + w + ' ms in the system. Average requests in flight?', a: a, unit: 'requests', tol: 0.05, how: 'L = λ × W = ' + fmt(l) + ' × ' + (w / 1000) + ' s = ' + fmt(a) + '.' }; },
    backlog: function () { var c = pick([100, 500, 1000]), f = pick([1.2, 1.5, 2]), d = pick([30, 60, 120]), a = (c * f - c) * d; return { q: 'Capacity is ' + fmt(c) + ' req/s. Traffic spikes to ' + fmt(c * f) + ' req/s for ' + d + ' s. Queue depth at the end?', a: a, unit: 'requests', tol: 0.05, how: 'Excess = ' + fmt(c * f) + ' − ' + fmt(c) + ' = ' + fmt(c * f - c) + ' req/s × ' + d + ' s = ' + fmt(a) + '.' }; },
    drain: function () { var c = pick([100, 500, 1000]), b = c * pick([6, 12, 30]), f = pick([0.5, 0.8, 0.9]), a = b / (c - c * f); return { q: fmt(b) + ' requests are queued. Capacity is ' + fmt(c) + ' req/s and traffic has dropped to ' + fmt(c * f) + ' req/s. Seconds to drain?', a: a, unit: 'seconds', tol: 0.05, how: 'Spare capacity = ' + fmt(c) + ' − ' + fmt(c * f) + ' = ' + fmt(c - c * f) + ' req/s. ' + fmt(b) + ' ÷ ' + fmt(c - c * f) + ' = ' + fmt(a) + ' s.' }; },
    quorum: function () { var n = pick([3, 5, 7]), w = 1 + Math.floor(Math.random() * n), a = n - w + 1; return { q: 'N = ' + n + ' replicas; writes wait for W = ' + w + ' acknowledgement' + (w > 1 ? 's' : '') + '. Smallest R that guarantees a read sees the latest write?', a: a, unit: 'replicas', tol: 0, how: 'Need R + W > N, so R > ' + n + ' − ' + w + ' = ' + (n - w) + ' → R = ' + a + '.' }; }
  };
  L.genEstimate = function (kind) { return GEN[kind || pick(Object.keys(GEN))](); };
  L.estimateKinds = Object.keys(GEN);

  // One numeric question; calls back(ok) once answered and acknowledged.
  L.numQuestion = function (el, p, back, nextLabel, onAnswered) {
    clear(el);
    var input = h('input', { class: 'num', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. 1200 or 1.2k' });
    var fb = h('div', {}), answered = false;
    function submit() {
      if (answered || !input.value.trim()) return;
      if (isNaN(parseNum(input.value))) return SD.toast('Enter a number (suffixes k, M, B are fine)');
      answered = true; input.disabled = true; go.remove();
      var ok = L.checkNum(input.value, p);
      if (onAnswered) onAnswered(ok);
      fb.appendChild(feedback(ok, (ok ? '' : 'Answer: ' + fmt(p.a) + ' ' + p.unit + '. ') + p.how));
      var nx = h('button', { class: 'btn primary', onclick: function () { back(ok); } }, nextLabel || 'Next →');
      fb.appendChild(nx); nx.focus();
    }
    var go = h('button', { class: 'btn primary', onclick: submit }, 'Check');
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    el.appendChild(h('h3', { class: 'question' }, p.q));
    el.appendChild(h('div', { class: 'row' }, input, h('span', { class: 'unit' }, p.unit), go));
    el.appendChild(h('div', { class: 'muted' }, p.tol === 0 ? 'Exact answer required.' : 'Within ±' + Math.round(p.tol * 100) + '% counts — round aggressively.'));
    el.appendChild(fb);
    input.focus();
  };
  L.estimate = function (el, spec, ctx) {
    var ps = spec.fixed ? spec.fixed.slice() : [], i = 0, right = 0;
    if (!spec.fixed) for (var k = 0; k < spec.n; k++) ps.push(L.genEstimate(spec.kinds[k % spec.kinds.length]));
    var head = h('div', {}), body = h('div', {});
    el.appendChild(head); el.appendChild(body);
    if (spec.brief) head.appendChild(h('p', { class: 'brief' }, spec.brief));
    var count = h('div', { class: 'qcount' }); head.appendChild(count);
    function show() {
      if (i >= ps.length) {
        clear(body); count.textContent = '';
        body.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, right + ' / ' + ps.length), h('p', { class: 'muted' }, spec.fixed ? '' : 'Numbers are regenerated each time — come back for a fresh set.')));
        return ctx.onDone(right / ps.length);
      }
      count.textContent = 'Problem ' + (i + 1) + ' of ' + ps.length;
      L.numQuestion(body, ps[i], function (ok) { if (ok) right++; SD.hit(ok, ctx.topicId); if (ok) SD.award(xp(ctx, 8)); else SD.save(); i++; show(); });
    }
    show();
  };

  /* ================= Simulations (move the sliders, complete the missions) ================= */
  var SIMS = {
    queue: {
      title: 'Utilisation and latency',
      note: 'Latency uses the standard multi-server queueing model (M/M/c, Erlang C), which assumes random arrivals and service times. The single-slot line shows service time ÷ (1 − utilisation) for comparison: pooling many slots delays the queueing until much closer to 100%, then it climbs just as steeply.',
      params: [{ k: 'lam', label: 'Arrival rate', unit: 'req/s', min: 50, max: 1500, step: 10, val: 300 }, { k: 'slots', label: 'Slots', unit: '', min: 5, max: 120, step: 1, val: 40 }, { k: 'ms', label: 'Service time', unit: 'ms', min: 10, max: 200, step: 10, val: 100 }],
      calc: function (s) {
        var cap = s.slots * 1000 / s.ms, rho = s.lam / cap, lat = Infinity, x = Infinity;
        if (rho < 1) {
          // Erlang C: probability an arrival has to queue, via the Erlang B recurrence.
          var a = s.lam * s.ms / 1000, b = 1;
          for (var k = 1; k <= s.slots; k++) b = a * b / (k + a * b);
          var pWait = b / (1 - rho * (1 - b));
          lat = s.ms + pWait * s.ms / (s.slots * (1 - rho)); x = lat / s.ms;
        }
        return { rho: rho, cap: cap, lat: lat, x: x, rows: [['Capacity', fmt(cap) + ' req/s'], ['Utilisation', fmt(rho * 100) + '%', rho > 1 ? 'bad' : rho > 0.8 ? 'warn' : 'good'],
          ['Latency with ' + s.slots + ' slots', rho < 1 ? fmt(lat) + ' ms  (' + fmt(x) + '× service time)' : 'unbounded — queue grows by ' + fmt(s.lam - cap) + ' req/s', x < 1.2 ? 'good' : rho < 1 ? 'warn' : 'bad'],
          ['Same utilisation, one slot', rho < 1 ? fmt(1 / (1 - rho)) + '× service time' : 'unbounded']],
          bars: [['Load', s.lam, 'load'], ['Capacity', cap, 'cap']] };
      },
      missions: [
        { text: '900 req/s arrive and each takes 50 ms. Find the smallest number of slots that keeps utilisation at or below 70%.', fix: { lam: 900, ms: 50 }, start: { slots: 40 }, check: function (s) { return s.slots === 65; }, win: '900 × 0.05 s = 45 slots busy on average (Little\'s Law). 45 ÷ 0.7 = 64.3, so 65 slots. The other 20 are headroom, not waste.' },
        { text: '50 slots at 100 ms gives 500 req/s of capacity. Raise the arrival rate until latency reaches 1.5× the service time — and notice how far you have to go.', fix: { slots: 50, ms: 100 }, start: { lam: 200 }, check: function (s, m) { return m.rho < 1 && m.x >= 1.5; }, win: 'It takes about 97% utilisation. A single slot would be at 1.5× by 33%; fifty pooled slots hide the queueing until the last few percent, then it explodes. That cliff is why you keep headroom: this close to the edge, a small burst, a retry wave or one lost node tips you over.' },
        { text: 'Now push the arrival rate above capacity and read the latency line.', fix: { slots: 50, ms: 100 }, start: { lam: 490 }, check: function (s, m) { return m.rho > 1; }, win: 'Above 100% there is no steady state: the queue grows every second, and it only shrinks once arrivals fall back below capacity.' }
      ]
    },
    retry: {
      title: 'Retry amplification',
      note: 'Simplified model: requests beyond capacity fail, and every failure is retried immediately up to the retry limit. Real storms also involve timeouts and several layers.',
      params: [{ k: 'base', label: 'User traffic', unit: 'req/s', min: 50, max: 300, step: 10, val: 80 }, { k: 'cap', label: 'Capacity', unit: 'req/s', min: 50, max: 300, step: 10, val: 100 }, { k: 'n', label: 'Retries per request', unit: '', min: 0, max: 5, step: 1, val: 0 }],
      calc: function (s) {
        var load = s.base, p = 0;
        for (var i = 0; i < 200; i++) { p = Math.max(0, 1 - s.cap / load); var sum = 0; for (var k = 0; k <= s.n; k++) sum += Math.pow(p, k); load = s.base * sum; }
        var amp = load / s.base;
        return { amp: amp, p: p, load: load, rows: [['Attempts failing', fmt(p * 100) + '%', p > 0.3 ? 'bad' : p > 0 ? 'warn' : 'good'], ['Load on the service', fmt(load) + ' req/s'], ['Amplification', fmt(amp) + '×', amp > 1.5 ? 'bad' : amp > 1 ? 'warn' : 'good']],
          bars: [['User traffic', s.base, 'load'], ['Actual load', load, amp > 1 ? 'bad' : 'load'], ['Capacity', s.cap, 'cap']] };
      },
      missions: [
        { text: 'The service is 20% over capacity (120 vs 100). Increase retries until the actual load is more than double the user traffic.', fix: { base: 120, cap: 100 }, start: { n: 0 }, check: function (s, m) { return m.amp > 2; }, win: 'A 20% overload became more than a 100% overload — created entirely by clients trying to be reliable.' },
        { text: 'Keep 3 retries. Lower user traffic to the highest level that causes no amplification at all.', fix: { cap: 100, n: 3 }, start: { base: 150 }, check: function (s) { return s.base === 100; }, win: 'In this simplified model, at or below capacity retries cost nothing; one step above, they multiply. That cliff is why storms appear suddenly. Defences: backoff with jitter, retry budgets, circuit breakers.' }
      ]
    },
    cache: {
      title: 'Cache hit ratio and database load',
      note: 'Assumes 1 ms for a cache hit and 20 ms more for a miss that goes to the database.',
      params: [{ k: 'qps', label: 'Read traffic', unit: 'req/s', min: 1000, max: 10000, step: 500, val: 2000 }, { k: 'hit', label: 'Cache hit ratio', unit: '%', min: 0, max: 99, step: 1, val: 50 }, { k: 'db', label: 'Database capacity', unit: 'req/s', min: 200, max: 2000, step: 100, val: 800 }],
      calc: function (s) {
        var load = s.qps * (1 - s.hit / 100), u = load / s.db;
        return { u: u, load: load, rows: [['Database load', fmt(load) + ' req/s'], ['Database utilisation', fmt(u * 100) + '%', u > 1 ? 'bad' : u > 0.7 ? 'warn' : 'good'], ['Average read latency', u > 1 ? 'database overloaded' : fmt(1 + (1 - s.hit / 100) * 20) + ' ms', u > 1 ? 'bad' : 'good']],
          bars: [['Read traffic', s.qps, 'load'], ['Reaching the DB', load, u > 1 ? 'bad' : 'load'], ['DB capacity', s.db, 'cap']] };
      },
      missions: [
        { text: '5,000 reads/s against a database that handles 800. Find the lowest hit ratio that keeps the database at or below 70% utilisation.', fix: { qps: 5000, db: 800 }, start: { hit: 50 }, check: function (s) { return s.hit === 89; }, win: '70% of 800 is 560 req/s, so at most 11.2% of reads may miss → 89% hits. The cache is not an optimisation here; the system does not work without it.' },
        { text: 'The cache node restarts empty. Drop the hit ratio to 0%.', fix: { qps: 5000, db: 800 }, start: { hit: 89 }, check: function (s) { return s.hit === 0; }, win: 'The database is now at 625% of capacity. This is the cold-start problem: plan cache warm-up, gradual traffic ramp, or request coalescing before you need them.' }
      ]
    }
  };
  L.sim = function (el, spec, ctx) {
    var S = SIMS[spec.sim], state = {}, mi = 0, inputs = {}, free = false;
    S.params.forEach(function (p) { state[p.k] = p.val; });
    var mission = h('div', { class: 'mission' }), controls = h('div', { class: 'controls' }), read = h('div', { class: 'readout' }), bars = h('div', { class: 'bars' });
    el.appendChild(h('h3', { class: 'question' }, S.title));
    el.appendChild(mission); el.appendChild(controls); el.appendChild(bars); el.appendChild(read);
    el.appendChild(h('p', { class: 'muted' }, S.note));
    S.params.forEach(function (p) {
      var val = h('b', {}), r = h('input', { type: 'range', min: p.min, max: p.max, step: p.step, 'aria-label': p.label });
      r.addEventListener('input', function () { state[p.k] = +r.value; render(false); });
      // Missions are judged when the slider is released, not while it is being dragged past the answer.
      r.addEventListener('change', function () { state[p.k] = +r.value; render(true); });
      inputs[p.k] = { r: r, val: val, p: p };
      controls.appendChild(h('label', { class: 'slider' }, h('span', {}, p.label + ' ', val), r));
    });
    function setMission() {
      var m = S.missions[mi];
      clear(mission);
      if (!m) {
        free = true;
        mission.appendChild(h('div', { class: 'fb good' }, h('b', {}, '✓ All missions complete. '), 'The sliders are unlocked — try to break it.'));
        Object.keys(inputs).forEach(function (k) { inputs[k].r.disabled = false; });
        return;
      }
      Object.keys(inputs).forEach(function (k) {
        var fixed = m.fix[k] != null;
        if (fixed) state[k] = m.fix[k]; else if (m.start && m.start[k] != null) state[k] = m.start[k];
        inputs[k].r.disabled = fixed;
      });
      mission.appendChild(h('div', { class: 'label' }, 'Mission ' + (mi + 1) + ' of ' + S.missions.length));
      mission.appendChild(h('p', {}, m.text));
    }
    function render(judge) {
      var m = S.calc(state);
      Object.keys(inputs).forEach(function (k) { var i = inputs[k]; i.r.value = state[k]; i.val.textContent = fmt(state[k]) + (i.p.unit ? ' ' + i.p.unit : ''); });
      clear(read); m.rows.forEach(function (r) { read.appendChild(h('div', { class: 'stat ' + (r[2] || '') }, h('span', {}, r[0]), h('b', {}, r[1]))); });
      clear(bars);
      var max = Math.max.apply(null, m.bars.map(function (b) { return b[1]; })) || 1;
      m.bars.forEach(function (b) { var f = h('div', { class: 'fill ' + b[2] }); f.style.width = Math.max(1, b[1] / max * 100) + '%'; bars.appendChild(h('div', { class: 'bar' }, h('span', {}, b[0]), h('div', { class: 'track' }, f), h('em', {}, fmt(b[1])))); });
      var cur = S.missions[mi];
      if (judge && !free && cur && !mission.querySelector('.fb') && cur.check(state, m)) {
        SD.hit(true, ctx.topicId); SD.award(xp(ctx, 12));
        mission.appendChild(h('div', { class: 'fb good' }, h('b', {}, '✓ '), cur.win));
        mission.appendChild(h('button', { class: 'btn primary', onclick: function () { mi++; setMission(); render(false); if (mi >= S.missions.length) ctx.onDone(1); } }, mi + 1 < S.missions.length ? 'Next mission →' : 'Finish'));
        Object.keys(inputs).forEach(function (k) { inputs[k].r.disabled = true; });
      }
    }
    setMission(); render(false);
  };

  L.mount = function (el, spec, ctx) { clear(el); L[spec.type](el, spec, ctx); };
  L.PASS = 0.7;   // the score a lab needs to count as passed
  L.NAMES = { sort: 'Sorting drill', order: 'Sequence puzzle', pick: 'Choose wisely', api: 'API builder', diagram: 'Diagram builder', estimate: 'Estimation drill', sim: 'Simulator' };
})(window.SD);
