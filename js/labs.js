// Interactive activities. Every activity is mounted with SD.labs.mount(el, spec, ctx)
// and reports a score between 0 and 1 through ctx.onDone(score).
(function (SD) {
  'use strict';
  var h = SD.h, clear = SD.clear, shuffle = SD.shuffle, pick = SD.pick, fmt = SD.fmt;
  var L = SD.labs = {};

  function scoreLine(score) { return Math.round(score * 100) + '%'; }
  function feedback(ok, text) { return h('div', { class: 'fb ' + (ok ? 'good' : 'bad') }, h('b', {}, ok ? '✓ ' : '✗ '), text); }

  /* ================= Quiz (multiple choice, immediate explanation) ================= */
  // qs: [question, [correct, wrong...], why, topicId?]
  L.quiz = function (el, spec, ctx) {
    var qs = spec.qs, i = 0, right = 0;
    function show() {
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
          SD.hit(o.ok, q[3] || ctx.topicId);
          if (o.ok) SD.award(6, { quest: 'quiz' }); else SD.save();
          after.appendChild(feedback(o.ok, q[2]));
          var nx = h('button', { class: 'btn primary', onclick: function () { i++; show(); } }, i + 1 < qs.length ? 'Next →' : 'Finish');
          after.appendChild(nx); nx.focus();
        } }, o.text);
      });
      el.appendChild(h('div', { class: 'qcount' }, 'Question ' + (i + 1) + ' of ' + qs.length));
      el.appendChild(h('h3', { class: 'question' }, q[0]));
      el.appendChild(h('div', { class: 'opts' }, btns));
      el.appendChild(after);
    }
    show();
  };

  /* ================= Recall (flashcards with spaced repetition) ================= */
  L.recall = function (el, spec, ctx) {
    var queue = spec.ids.slice(), again = {}, done = 0, total = queue.length, good = 0;
    function show() {
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
            show();
          } }, name, h('small', {}, g === 0 ? 'repeat now' : SD.srs.label(st, g)));
        })));
      } }, 'Reveal answer');
      el.appendChild(h('div', { class: 'qcount' }, 'Card ' + (done + 1) + ' of ' + total + (st ? '' : ' · new')));
      el.appendChild(h('h3', { class: 'question' }, c.q));
      el.appendChild(ta); el.appendChild(reveal); el.appendChild(answerBox);
    }
    show();
  };

  /* ================= Teach / explain (free text or speech, self-graded against a rubric) ================= */
  // spec: {prompt, rubric[], followups[], duck:boolean, saved:string}
  L.teach = function (el, spec, ctx) {
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    var texts = [], step = 0, prompts = [spec.prompt].concat(spec.followups || []);
    function words(s) { return (s.trim().match(/\S+/g) || []).length; }

    function ask() {
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
        tick = setInterval(function () { var s = Math.floor((Date.now() - t0) / 1000); clock.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 250);
      } }, '🗣 Start speaking timer');

      // Dictation, where the browser supports it
      var rec = null, mic = null;
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
        if (rec) rec.stop(); if (tick) clearInterval(tick);
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
          SD.hit(ok, ctx.topicId); if (ok) SD.award(3); else SD.save();
          setTimeout(function () { i++; show(); }, ok ? 450 : 1300);
        } }, b);
      });
      if (spec.brief) el.appendChild(h('p', { class: 'brief' }, spec.brief));
      el.appendChild(h('div', { class: 'qcount' }, (i + 1) + ' of ' + items.length));
      el.appendChild(h('div', { class: 'sortcard' }, it[0]));
      el.appendChild(h('div', { class: 'opts buckets' }, btns));
      el.appendChild(fb);
    }
    show();
  };

  /* ================= Order (arrange steps) ================= */
  L.order = function (el, spec, ctx) {
    var correct = spec.items, cur = shuffle(correct), tries = 0, firstScore = null;
    if (cur.join('|') === correct.join('|')) cur.reverse();
    function show(marks) {
      clear(el);
      if (spec.brief) el.appendChild(h('p', { class: 'brief' }, spec.brief));
      el.appendChild(h('ol', { class: 'orderlist' }, cur.map(function (text, i) {
        return h('li', { class: marks ? (marks[i] ? 'right' : 'wrong') : '' },
          h('span', { class: 'otext' }, text),
          h('button', { class: 'btn mini', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { swap(i, i - 1); } }, '↑'),
          h('button', { class: 'btn mini', 'aria-label': 'Move down', disabled: i === cur.length - 1, onclick: function () { swap(i, i + 1); } }, '↓'));
      })));
      el.appendChild(h('button', { class: 'btn primary', onclick: check }, 'Check order'));
    }
    function swap(a, b) { var t = cur[a]; cur[a] = cur[b]; cur[b] = t; show(); }
    function check() {
      tries++;
      var marks = cur.map(function (t, i) { return t === correct[i]; }), n = marks.filter(Boolean).length;
      if (firstScore === null) firstScore = n / correct.length;
      var ok = n === correct.length;
      SD.hit(ok, ctx.topicId);
      show(marks);
      if (ok) { SD.award(10); el.appendChild(feedback(true, 'Correct order' + (tries > 1 ? ' (attempt ' + tries + ').' : ' on the first try.'))); ctx.onDone(firstScore); }
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
        SD.hit(score === 1, ctx.topicId); SD.award(Math.round(12 * score));
        el.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, right + ' / ' + spec.want)));
        ctx.onDone(score);
      } }, 'Lock in'), count));
    }
    show();
  };

  /* ================= API builder ================= */
  var METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  var STATUSES = ['200', '201', '204', '302', '400', '404', '409', '429'];
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
        var ok = [r.m.value === r.t.method, r.p.value === r.t.path, r.s.value === r.t.status];
        [r.m, r.p, r.s].forEach(function (s, i) { s.classList.toggle('right', ok[i]); s.classList.toggle('wrong', !ok[i]); });
        pts += ok.filter(Boolean).length;
        var all = ok.every(Boolean);
        clear(r.fb).appendChild(feedback(all, (all ? '' : r.t.method + ' ' + r.t.path + ' → ' + r.t.status + '. ') + r.t.note));
      });
      var score = pts / max;
      clear(out).appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, pts + ' / ' + max), h('p', { class: 'muted' }, 'Real APIs vary in style; what matters is being able to justify each choice.')));
      if (!graded) { graded = true; SD.hit(score === 1, ctx.topicId); SD.award(Math.round(15 * score)); ctx.onDone(score); }
    } }, 'Check API'));
    el.appendChild(out);
  };

  /* ================= Diagram builder ================= */
  var COMP = {
    client: ['📱', 'Client'], cdn: ['🌍', 'CDN'], lb: ['⚖️', 'Load balancer'], gateway: ['🚪', 'API gateway'], app: ['🧩', 'App service'],
    cache: ['⚡', 'Cache'], db: ['🗄️', 'Database'], replica: ['📚', 'Read replica'], queue: ['📨', 'Queue'], worker: ['🛠️', 'Workers'],
    blob: ['🪣', 'Object storage'], search: ['🔎', 'Search index'], ws: ['🔌', 'WebSocket server'], idgen: ['🔢', 'ID generator'],
    ledger: ['📒', 'Ledger'], psp: ['🏦', 'Card processor (external)']
  };
  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function ekey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

  L.diagram = function (el, spec, ctx) {
    // Phones get a tall, narrow canvas so boxes stay finger-sized.
    var narrow = (el.clientWidth || window.innerWidth) < 560;
    var W = narrow ? 360 : 680, H = narrow ? 520 : 420, BW = narrow ? 112 : 124, BH = 46;
    var nodes = {}, edges = {}, selected = null, best = 0;
    var label = function (id) { return (spec.labels && spec.labels[id]) || COMP[id][1]; };
    var palette = shuffle(spec.required.concat(Object.keys(spec.decoys || {})));
    var canvas = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'diagram', role: 'img', 'aria-label': 'Architecture diagram canvas' });
    var gE = svg('g', {}), gN = svg('g', {});
    canvas.appendChild(gE); canvas.appendChild(gN);
    var pal = h('div', { class: 'palette' }), out = h('div', {}), hint = h('p', { class: 'muted' }, 'Tap a component to add or remove it. Drag boxes to arrange. Tap one box, then another, to connect or disconnect them.');

    function freeSpot() {
      var n = Object.keys(nodes).length;
      var cols = narrow ? 3 : 4, gap = (W - 16 - cols * BW) / (cols - 1);
      return [8 + (n % cols) * (BW + gap), 16 + Math.floor(n / cols) * (narrow ? 76 : 100)];
    }
    function drawPalette() {
      clear(pal);
      palette.forEach(function (id) {
        pal.appendChild(h('button', { class: 'chip' + (nodes[id] ? ' on' : ''), onclick: function () {
          if (nodes[id]) { delete nodes[id]; Object.keys(edges).forEach(function (k) { if (k.split('|').indexOf(id) >= 0) delete edges[k]; }); if (selected === id) selected = null; }
          else { var p = freeSpot(); nodes[id] = { x: p[0], y: p[1] }; }
          draw();
        } }, COMP[id][0] + ' ' + label(id)));
      });
    }
    function pt(evt) { var m = canvas.getScreenCTM().inverse(); var p = canvas.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY; return p.matrixTransform(m); }
    function draw() {
      drawPalette();
      while (gE.firstChild) gE.removeChild(gE.firstChild);
      while (gN.firstChild) gN.removeChild(gN.firstChild);
      Object.keys(edges).forEach(function (k) {
        var p = k.split('|'), a = nodes[p[0]], b = nodes[p[1]];
        if (!a || !b) return;
        gE.appendChild(svg('line', { x1: a.x + BW / 2, y1: a.y + BH / 2, x2: b.x + BW / 2, y2: b.y + BH / 2, class: 'edge' }));
      });
      Object.keys(nodes).forEach(function (id) {
        var n = nodes[id], g = svg('g', { class: 'node' + (selected === id ? ' sel' : ''), transform: 'translate(' + n.x + ',' + n.y + ')', tabindex: 0 });
        g.appendChild(svg('rect', { width: BW, height: BH, rx: 9 }));
        var t = svg('text', { x: BW / 2, y: BH / 2 + 4, 'text-anchor': 'middle' }); t.textContent = COMP[id][0] + ' ' + label(id);
        if (t.textContent.length > (narrow ? 14 : 17)) t.setAttribute('class', 'small');
        g.appendChild(t);
        var start = null, moved = false;
        g.addEventListener('pointerdown', function (e) { var p = pt(e); start = { dx: p.x - n.x, dy: p.y - n.y, x: p.x, y: p.y }; moved = false; g.setPointerCapture(e.pointerId); e.preventDefault(); });
        g.addEventListener('pointermove', function (e) {
          if (!start) return;
          var p = pt(e);
          if (!moved && Math.abs(p.x - start.x) + Math.abs(p.y - start.y) < 6) return;
          moved = true;
          n.x = Math.max(0, Math.min(W - BW, p.x - start.dx)); n.y = Math.max(0, Math.min(H - BH, p.y - start.dy));
          g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
          // redraw edges only, so the dragged element keeps its pointer capture
          while (gE.firstChild) gE.removeChild(gE.firstChild);
          Object.keys(edges).forEach(function (k) { var q = k.split('|'), a = nodes[q[0]], b = nodes[q[1]]; gE.appendChild(svg('line', { x1: a.x + BW / 2, y1: a.y + BH / 2, x2: b.x + BW / 2, y2: b.y + BH / 2, class: 'edge' })); });
        });
        g.addEventListener('pointerup', function () { var wasDrag = moved; start = null; if (!wasDrag) tap(id); });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(id); } });
        gN.appendChild(g);
      });
    }
    function tap(id) {
      if (selected === null) selected = id;
      else if (selected === id) selected = null;
      else { var k = ekey(selected, id); if (edges[k]) delete edges[k]; else edges[k] = 1; selected = null; }
      draw();
    }
    function check() {
      var req = spec.required, need = spec.edges.map(function (e) { return ekey(e[0], e[1]); });
      var haveN = req.filter(function (id) { return nodes[id]; }), haveE = need.filter(function (k) { return edges[k]; });
      var decoys = Object.keys(spec.decoys || {}).filter(function (id) { return nodes[id]; });
      var extra = Object.keys(edges).filter(function (k) { return need.indexOf(k) < 0; });
      var score = Math.max(0, (haveN.length + haveE.length) / (req.length + need.length) - 0.08 * decoys.length);
      clear(out);
      var list = h('div', { class: 'reviewlist' });
      req.forEach(function (id) { if (!nodes[id]) list.appendChild(h('div', { class: 'rv bad' }, h('b', {}, '✗ Missing: ' + label(id) + '. '), (spec.why && spec.why[id]) || '')); });
      spec.edges.forEach(function (e) { if (nodes[e[0]] && nodes[e[1]] && !edges[ekey(e[0], e[1])]) list.appendChild(h('div', { class: 'rv bad' }, h('b', {}, '✗ Not connected: '), label(e[0]) + ' ↔ ' + label(e[1]))); });
      decoys.forEach(function (id) { list.appendChild(h('div', { class: 'rv bad' }, h('b', {}, '✗ Unjustified: ' + label(id) + '. '), spec.decoys[id])); });
      if (extra.length) list.appendChild(h('div', { class: 'rv' }, h('b', {}, '· ' + extra.length + ' extra connection' + (extra.length > 1 ? 's' : '') + ' '), 'not in the reference design. Not penalised — but be ready to justify each arrow.'));
      req.forEach(function (id) { if (nodes[id] && spec.why && spec.why[id]) list.appendChild(h('div', { class: 'rv good' }, h('b', {}, '✓ ' + label(id) + ': '), spec.why[id])); });
      out.appendChild(h('div', { class: 'result' }, h('div', { class: 'big' }, scoreLine(score)), h('p', { class: 'muted' }, 'Compared with one reference design. Other valid designs exist — the test is whether you can defend yours.')));
      out.appendChild(list);
      out.appendChild(h('button', { class: 'btn', onclick: reveal }, 'Show reference design'));
      var first = best === 0;
      if (score > best) best = score;
      SD.hit(score >= 0.999, ctx.topicId);
      if (score >= 0.999) { SD.state.counts.perfectDiagram = 1; SD.confetti(); }
      if (first) SD.award(Math.round(25 * score)); else SD.save();
      ctx.onDone(best);
    }
    function reveal() {
      nodes = {}; edges = {}; selected = null;
      // Simple layered layout: breadth-first from the client.
      var adj = {}; spec.edges.forEach(function (e) { (adj[e[0]] = adj[e[0]] || []).push(e[1]); (adj[e[1]] = adj[e[1]] || []).push(e[0]); });
      var depth = {}, q = [spec.required[0]]; depth[q[0]] = 0;
      while (q.length) { var c = q.shift(); (adj[c] || []).forEach(function (n) { if (depth[n] == null) { depth[n] = depth[c] + 1; q.push(n); } }); }
      var cols = {}; spec.required.forEach(function (id) { var d = depth[id] == null ? 0 : depth[id]; (cols[d] = cols[d] || []).push(id); });
      var nc = Object.keys(cols).length;
      Object.keys(cols).forEach(function (d) {
        cols[d].forEach(function (id, i) {
          var along = d / Math.max(1, nc - 1), across = i - (cols[d].length - 1) / 2;
          nodes[id] = narrow ? { x: (W - BW) / 2 + across * (BW + 8), y: 10 + along * (H - BH - 20) }
            : { x: 10 + along * (W - BW - 20), y: (H - BH) / 2 + across * 84 };
        });
      });
      spec.edges.forEach(function (e) { edges[ekey(e[0], e[1])] = 1; });
      draw();
    }
    if (spec.brief) el.appendChild(h('p', { class: 'brief' }, spec.brief));
    el.appendChild(pal); el.appendChild(h('div', { class: 'canvaswrap' }, canvas)); el.appendChild(hint);
    el.appendChild(h('button', { class: 'btn primary', onclick: check }, 'Check design'));
    el.appendChild(out);
    nodes[spec.required[0]] = { x: 8, y: 16 };
    draw();
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
      L.numQuestion(body, ps[i], function (ok) { if (ok) right++; SD.hit(ok, ctx.topicId); if (ok) SD.award(8); else SD.save(); i++; show(); });
    }
    show();
  };

  /* ================= Simulations (move the sliders, complete the missions) ================= */
  var SIMS = {
    queue: {
      title: 'Utilisation and latency',
      note: 'Latency uses the simplest queueing model, service time ÷ (1 − utilisation). Real multi-slot servers queue somewhat less at the same utilisation, but the hockey-stick shape is the same.',
      params: [{ k: 'lam', label: 'Arrival rate', unit: 'req/s', min: 50, max: 1500, step: 10, val: 300 }, { k: 'slots', label: 'Slots', unit: '', min: 5, max: 120, step: 1, val: 40 }, { k: 'ms', label: 'Service time', unit: 'ms', min: 10, max: 200, step: 10, val: 100 }],
      calc: function (s) {
        var cap = s.slots * 1000 / s.ms, rho = s.lam / cap, lat = rho < 1 ? s.ms / (1 - rho) : Infinity;
        return { rho: rho, cap: cap, lat: lat, rows: [['Capacity', fmt(cap) + ' req/s'], ['Utilisation', fmt(rho * 100) + '%', rho > 1 ? 'bad' : rho > 0.8 ? 'warn' : 'good'], ['Latency (model)', rho < 1 ? fmt(lat) + ' ms  (' + fmt(lat / s.ms) + '× service time)' : 'unbounded — queue grows by ' + fmt(s.lam - cap) + ' req/s', rho < 0.8 ? 'good' : rho < 1 ? 'warn' : 'bad']],
          bars: [['Load', s.lam, 'load'], ['Capacity', cap, 'cap']] };
      },
      missions: [
        { text: '900 req/s arrive and each takes 50 ms. Find the smallest number of slots that keeps utilisation at or below 70%.', fix: { lam: 900, ms: 50 }, start: { slots: 40 }, check: function (s) { return s.slots === 65; }, win: '900 × 0.05 s = 45 slots busy on average (Little\'s Law). 45 ÷ 0.7 = 64.3, so 65 slots. The other 20 are headroom, not waste.' },
        { text: '50 slots at 100 ms gives 500 req/s of capacity. Raise the arrival rate until latency is 10× the service time.', fix: { slots: 50, ms: 100 }, start: { lam: 200 }, check: function (s, m) { return m.rho > 0.895 && m.rho < 0.905; }, win: 'That is 90% utilisation. From 50% to 90% latency went from 2× to 10×; the last few percent are the most expensive.' },
        { text: 'Now push the arrival rate above capacity and read the latency line.', fix: { slots: 50, ms: 100 }, start: { lam: 450 }, check: function (s, m) { return m.rho > 1; }, win: 'Above 100% there is no steady state: the queue grows every second, and it only shrinks once arrivals fall back below capacity.' }
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
        { text: 'Keep 3 retries. Lower user traffic to the highest level that causes no amplification at all.', fix: { cap: 100, n: 3 }, start: { base: 150 }, check: function (s) { return s.base === 100; }, win: 'At or below capacity, retries cost nothing; one step above, they multiply. That cliff is why storms appear suddenly. Defences: backoff with jitter, retry budgets, circuit breakers.' }
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
        SD.hit(true, ctx.topicId); SD.award(12);
        mission.appendChild(h('div', { class: 'fb good' }, h('b', {}, '✓ '), cur.win));
        mission.appendChild(h('button', { class: 'btn primary', onclick: function () { mi++; setMission(); render(false); if (mi >= S.missions.length) ctx.onDone(1); } }, mi + 1 < S.missions.length ? 'Next mission →' : 'Finish'));
        Object.keys(inputs).forEach(function (k) { inputs[k].r.disabled = true; });
      }
    }
    setMission(); render(false);
  };

  L.mount = function (el, spec, ctx) { clear(el); L[spec.type](el, spec, ctx); };
  L.NAMES = { sort: 'Sorting drill', order: 'Sequence puzzle', pick: 'Choose wisely', api: 'API builder', diagram: 'Diagram builder', estimate: 'Estimation drill', sim: 'Simulator' };
})(window.SD);
