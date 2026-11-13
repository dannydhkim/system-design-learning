// Draws the load-test rigs of js/rig.js: the system as a picture, the controls, the run, and the verdict.
// Also `seq`, which chains a short drill and a rig into one lab. Loaded after js/labs.js.
(function (SD) {
  'use strict';
  var h = SD.h, clear = SD.clear, fmt = SD.fmt, L = SD.labs, RIG = SD.rig;
  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function feedback(ok, text) { return h('div', { class: 'fb ' + (ok ? 'good' : 'bad') }, h('b', {}, ok ? '✓ ' : '✗ '), text); }
  function rate(n) { return n >= 10000 ? (n / 1000).toFixed(1) + 'k' : fmt(Math.round(n)); }
  function pc(v) { return (v < 10 ? v.toFixed(1) : String(Math.round(v))) + '%'; }
  function tile(name, value, cls) { return h('div', { class: 'stat ' + (cls || '') }, h('span', {}, name), h('b', {}, value)); }
  var PASSIVE = { client: 1, lb: 1, ratelimiter: 1, breaker: 1, loadshedder: 1 };

  L.rig = function (el, spec, ctx) {
    var rig = RIG.RIGS[spec.rig];
    if (!rig || !window.BreakscaleSim) { el.appendChild(feedback(false, 'The simulator could not be loaded, so this lab cannot run. Reload the page to try again.')); return; }
    var narrow = (el.clientWidth || window.innerWidth) < 560;
    var W = narrow ? 360 : 760, BW = narrow ? 108 : 128, BH = 54, PAD = 12;
    var mi = 0, s = RIG.defaults(rig), running = null, paid = {}, inputs = {}, nodeEls = {}, edgeEls = {};
    var sit = rig.missions.length - 1, resumed = 0;
    // Missions already passed are remembered with the topic, so leaving the page mid-lab neither sends the player
    // back to mission 1 nor pays for the same missions again. A lab passed before (a replay) starts afresh.
    var st = ctx.topicId && !ctx.replay ? SD.topicState(ctx.topicId) : null;
    if (ctx.resume) { mi = ctx.resume.mi; s = ctx.resume.s; paid = ctx.resume.paid; sit = ctx.resume.sit; }   // redrawn after a resize
    else if (st && st.rigPaid > 0 && st.rigPaid < rig.missions.length) { for (var k = 0; k < st.rigPaid; k++) paid[k] = 1; mi = resumed = st.rigPaid; }
    var mission = h('div', { class: 'mission' }), controls = h('div', { class: 'controls' }), hud = h('div', { class: 'lt-hud' });
    var charts = h('div', { class: 'rigcharts' }), out = h('div', { role: 'status' });
    var canvas = svg('svg', { class: 'diagram rig', role: 'img' }), gE = svg('g', {}), gN = svg('g', {});
    canvas.appendChild(gE); canvas.appendChild(gN);
    var runBtn = h('button', { class: 'btn primary', onclick: function () { if (running) finish(true); else run(); } });
    function free() { return mi >= rig.missions.length; }
    function cur() { return RIG.settingsFor(rig, mi, s, sit); }

    /* ---------- the picture ---------- */
    var cols = 0, rows = 0;
    rig.layout.forEach(function (n) { cols = Math.max(cols, n[3]); rows = Math.max(rows, n[4]); });
    // Wide screens read left to right; a phone turns the same grid on its side and reads top to bottom.
    var along = narrow ? 84 : (W - BW - 2 * PAD) / Math.max(1, cols), across = narrow ? (rows ? (W - BW - 2 * PAD) / rows : 0) : 76;
    var H = narrow ? 2 * PAD + cols * along + BH + 10 : 2 * PAD + rows * across + BH + 10;
    canvas.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function pos(n) {
      return narrow ? { x: rows ? PAD + n[4] * across : (W - BW) / 2, y: PAD + 10 + n[3] * along }
        : { x: PAD + n[3] * along, y: PAD + 10 + n[4] * across };
    }
    function ends(a, b) {
      var ax = a.x + BW / 2, ay = a.y + BH / 2, bx = b.x + BW / 2, by = b.y + BH / 2, dx = bx - ax, dy = by - ay;
      var len = Math.sqrt(dx * dx + dy * dy) || 1, t = Math.min((BW / 2 + 3) / Math.abs(dx || 1e-9), (BH / 2 + 3) / Math.abs(dy || 1e-9));
      if (t > 0.5) t = 0.5;
      return { x1: ax + dx * t, y1: ay + dy * t, x2: bx - dx * t, y2: by - dy * t, ux: dx / len, uy: dy / len };
    }
    function drawPicture() {
      var built = rig.build(cur()), present = {}, at = {}, names = [];
      built.nodes.forEach(function (n) { present[n[0]] = 1; });
      while (gE.firstChild) gE.removeChild(gE.firstChild);
      while (gN.firstChild) gN.removeChild(gN.firstChild);
      nodeEls = {}; edgeEls = {};
      rig.layout.forEach(function (n) {
        var id = n[0];
        if (n[5] && !present[id]) return;
        var p = at[id] = pos(n), g = svg('g', { class: 'node', transform: 'translate(' + p.x + ',' + p.y + ')' });
        g.appendChild(svg('rect', { class: 'box', width: BW, height: BH, rx: 9 }));
        var t = svg('text', { class: 'name' + (n[2].length > 12 ? ' small' : ''), x: BW / 2, y: 20, 'text-anchor': 'middle' });
        t.textContent = n[1] + ' ' + n[2];
        var read = svg('text', { class: 'read', x: BW / 2, y: 36, 'text-anchor': 'middle' });
        var track = svg('rect', { class: 'track', x: 8, y: 43, width: BW - 16, height: 5, rx: 2.5 }), fill = svg('rect', { class: 'meter', x: 8, y: 43, width: 0, height: 5, rx: 2.5 });
        var shed = svg('text', { class: 'shed', x: BW - 2, y: -4, 'text-anchor': 'end' });
        [t, read, track, fill, shed].forEach(function (c) { g.appendChild(c); });
        if (!present[id]) g.setAttribute('data-state', 'off');
        nodeEls[id] = { g: g, read: read, fill: fill, shed: shed };
        names.push(n[2]);
        gN.appendChild(g);
      });
      built.edges.forEach(function (e) {
        var a = at[e[0]], b = at[e[1]];
        if (!a || !b) return;
        var q = ends(a, b), hx = q.x2 - q.ux * 9, hy = q.y2 - q.uy * 9;
        var g = svg('g', { class: 'edge' }), wire = svg('line', { class: 'wire' }), flow = svg('line', { class: 'flow' }), head = svg('polygon', { class: 'head' });
        [wire, flow].forEach(function (ln) { ln.setAttribute('x1', q.x1); ln.setAttribute('y1', q.y1); ln.setAttribute('x2', hx); ln.setAttribute('y2', hy); });
        head.setAttribute('points', [q.x2, q.y2, hx - q.uy * 5, hy + q.ux * 5, hx + q.uy * 5, hy - q.ux * 5].map(function (v) { return v.toFixed(1); }).join(' '));
        g.appendChild(wire); g.appendChild(flow); g.appendChild(head); gE.appendChild(g);
        edgeEls[e[0] + '>' + e[1]] = { g: g, flow: flow };
      });
      canvas.setAttribute('aria-label', 'The system under test: ' + names.join(', ') + '. The figures are repeated in the tiles below while it runs.');
    }
    function paint(v) {
      var top = 1;
      Object.keys(v.edges).forEach(function (k) { top = Math.max(top, v.edges[k]); });
      Object.keys(edgeEls).forEach(function (k) {
        var e = edgeEls[k], f = v.edges[k] || 0, to = v.nodes[k.split('>')[1]];
        // A worker-style pull has no flow of its own; fall back to what the target takes in.
        if (!f && to && to.arriving > 0 && Object.keys(edgeEls).filter(function (x) { return x.split('>')[1] === k.split('>')[1]; }).length === 1) f = to.arriving;
        var live = f > 0.5, share = live ? Math.log(1 + 30 * f / top) / Math.log(31) : 0;
        e.g.setAttribute('class', 'edge ' + (live ? (to && to.refused > 0.02 * Math.max(1, to.arriving) ? 'live hurt' : 'live') : 'idle'));
        var cycle = 30 - 20 * share;
        e.flow.style.setProperty('--on', '3'); e.flow.style.setProperty('--off', (cycle - 3).toFixed(1));
        e.flow.style.setProperty('--cycle', (-cycle).toFixed(1)); e.flow.style.setProperty('--dur', (1.1 - 0.75 * share).toFixed(2) + 's');
      });
      Object.keys(nodeEls).forEach(function (id) {
        var e = nodeEls[id], n = v.nodes[id];
        if (!n) return;
        var losing = n.kind !== 'client' && (n.refused > 0.02 * Math.max(1, n.arriving) || n.errors > 0.5), passive = PASSIVE[n.kind];
        e.g.setAttribute('data-state', n.kind === 'client' ? 'src' : losing ? 'bad' : n.busy > 0.8 ? 'warn' : 'ok');
        if (passive) e.g.setAttribute('data-passive', '1');
        e.read.textContent = n.kind === 'client' ? rate(n.arriving || 0) + ' /s sent' : n.state ? n.state + ' · ' + rate(n.arriving) + ' /s'
          : passive ? rate(n.arriving) + ' /s in' : n.queued >= 1 ? (narrow ? '' : rate(n.arriving) + ' /s · ') + rate(n.queued) + ' waiting' : rate(n.arriving) + ' /s · ' + Math.round(n.busy * 100) + '%';
        e.fill.setAttribute('width', passive ? 0 : Math.max(0, Math.min(1, n.busy)) * (BW - 16));
        e.shed.textContent = n.kind === 'client' ? '' : n.refused > 0.02 * Math.max(1, n.arriving) ? '−' + rate(n.refused) + ' /s' : n.errors > 0.5 ? 'errors' : '';
      });
    }

    /* ---------- charts: one strip per series, time left to right ---------- */
    var CH = 64;
    function drawCharts(r, samples) {
      clear(charts);
      if (!r) return;
      var endS = r.endMs / 1000, warmS = r.warmMs / 1000, x = function (t) { return (t / endS) * W; };
      (rig.chart || []).forEach(function (c, ci) {
        var vals = samples.map(c.get), max = c.max || 1;
        vals.forEach(function (y) { if (y > max) max = y; });
        if (c.ref && c.ref > max) max = c.ref;
        max *= c.max ? 1 : 1.1;
        var g = svg('svg', { class: 'rigchart', viewBox: '0 0 ' + W + ' ' + CH, preserveAspectRatio: 'none', role: 'img', 'aria-label': c.label + ' over the run' }), marks = [];
        g.appendChild(svg('rect', { class: 'measured', x: x(warmS), y: 0, width: W - x(warmS), height: CH }));
        if (c.ref) g.appendChild(svg('line', { class: 'ref', x1: 0, x2: W, y1: CH - 2 - (c.ref / max) * (CH - 6), y2: CH - 2 - (c.ref / max) * (CH - 6) }));
        (r.built.events || []).forEach(function (e) {
          if (!e.label) return;
          g.appendChild(svg('line', { class: 'event', x1: x(e.at), x2: x(e.at), y1: 0, y2: CH }));
          if (ci === 0) { var t = h('span', { class: 'evlabel' }, e.label); t.style.left = (100 * e.at / endS).toFixed(1) + '%'; marks.push(t); }
        });
        if (vals.length) g.appendChild(svg('polyline', { class: 'series', points: vals.map(function (y, i) { return x(samples[i].t).toFixed(1) + ',' + (CH - 2 - (Math.min(y, max) / max) * (CH - 6)).toFixed(1); }).join(' ') }));
        var last = vals.length ? vals[vals.length - 1] : 0;
        charts.appendChild(h('div', { class: 'rigstrip' },
          h('div', { class: 'righead' }, h('span', {}, c.label), h('b', {}, rate(last) + (c.unit === '%' ? '%' : c.unit ? ' ' + c.unit : '')), c.ref ? h('em', {}, '┄ ' + c.refLabel + ' (' + rate(c.ref) + ')') : null), h('div', { class: 'rigplot' }, g, marks)));
      });
      if (rig.chart && rig.chart.length) charts.appendChild(h('p', { class: 'muted lt-key' }, 'Time runs left to right over ' + Math.round(endS) + ' simulated seconds. ' + (warmS > 0 ? 'Only the shaded part is measured.' : 'The whole run is measured.')));
    }

    /* ---------- controls ---------- */
    function valuesOf(c) { if (c.stops) return c.stops; var a = []; for (var v = c.min; v <= c.max + 1e-9; v += c.step) a.push(v); return a; }
    function buildControls() {
      clear(controls); inputs = {};
      rig.controls.forEach(function (c) {
        var o = inputs[c.k] = { c: c };
        if (c.options) {
          o.btns = c.options.map(function (opt) {
            return h('button', { class: 'chip', type: 'button', onclick: function () { if (running) return; s[c.k] = opt[0]; edited(); } }, opt[1]);
          });
          o.lock = h('em', { class: 'riglock' }, '🔒 set by this mission');
          o.wrap = h('div', { class: 'field rigfield' }, h('span', {}, c.label, o.lock), h('div', { class: 'seg', role: 'group', 'aria-label': c.label }, o.btns));
        } else {
          var vals = valuesOf(c);
          o.vals = vals; o.val = h('b', {});
          o.r = h('input', { type: 'range', min: 0, max: vals.length - 1, step: 1, 'aria-label': c.label });
          o.r.addEventListener('input', function () { s[c.k] = vals[+o.r.value]; edited(); });
          o.lock = h('em', { class: 'riglock' }, '🔒 set by this mission');
          o.wrap = h('label', { class: 'slider' }, h('span', {}, c.label + ' ', o.val, o.lock), o.r);
        }
        controls.appendChild(o.wrap);
      });
    }
    function syncControls() {
      var now = cur(), m = rig.missions[mi], fix = (!free() && m.fix) || {};
      Object.keys(inputs).forEach(function (k) {
        var o = inputs[k], c = o.c, locked = k in fix || !!running, v = now[k];
        o.wrap.classList.toggle('hidden', !!(c.when && !c.when(now)));
        o.lock.classList.toggle('hidden', !(k in fix));
        if (o.btns) o.btns.forEach(function (b, i) { var on = c.options[i][0] === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = locked; });
        else { o.r.value = Math.max(0, o.vals.indexOf(v)); o.r.disabled = locked; var text = c.show ? c.show(v, now) : fmt(v) + (c.unit ? ' ' + c.unit : ''); o.val.textContent = text; o.r.setAttribute('aria-valuetext', text); }
      });
    }
    function edited() {
      clear(out); clear(hud); drawCharts(null); syncControls(); drawPicture();
      if (!free() && paid[mi]) { out.appendChild(h('p', { class: 'muted' }, 'Mission passed. Run this setting to see what it does, or move on.')); out.appendChild(nextBtn()); }
    }
    function nextBtn() {
      var lastOne = mi + 1 >= rig.missions.length;
      return h('button', { class: 'btn primary', onclick: function () { mi++; setMission(); if (lastOne) ctx.onDone(1); runBtn.focus(); } }, lastOne ? 'Finish' : 'Next mission →');
    }

    /* ---------- missions ---------- */
    function setMission() {
      var m = rig.missions[mi];
      clear(mission); clear(out); clear(hud); drawCharts(null);
      if (free()) {
        mission.appendChild(h('div', { class: 'fb good' }, h('b', {}, '✓ All missions complete. '), 'Every control is unlocked. Try to break it, and predict the result before each run.'));
        // Each mission put the system in a situation (which fault, which traffic). Free play can use any of them.
        var groups = [];
        rig.missions.forEach(function (x, k) {
          var key = JSON.stringify(x.env || {}), g = groups.filter(function (y) { return y.key === key; })[0];
          if (g) g.last = k; else groups.push({ key: key, first: k, last: k });
        });
        if (groups.length > 1) mission.appendChild(h('div', { class: 'field rigfield' }, h('span', {}, 'Situation'), h('div', { class: 'seg', role: 'group', 'aria-label': 'Situation' }, groups.map(function (g) {
          var on = sit >= g.first && sit <= g.last && JSON.stringify(rig.missions[sit].env || {}) === g.key;
          return h('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false', title: rig.missions[g.first].text,
            onclick: function () { if (running) return; sit = g.first; setMission(); } }, g.first === g.last ? 'As in mission ' + (g.first + 1) : 'As in missions ' + (g.first + 1) + '–' + (g.last + 1));
        }))));
      } else {
        assign(s, m.start);
        mission.appendChild(h('div', { class: 'label' }, 'Mission ' + (mi + 1) + ' of ' + rig.missions.length));
        if (resumed && mi === resumed) mission.appendChild(h('p', { class: 'muted' }, 'Picked up where you left off: ' + (resumed > 1 ? 'missions 1–' + resumed + ' are' : 'mission 1 is') + ' already passed. ',
          h('button', { class: 'btn mini', onclick: function () { resumed = 0; mi = 0; setMission(); runBtn.focus(); } }, 'Start again from mission 1')));
        mission.appendChild(h('p', {}, m.text));
        if (!m.observe) mission.appendChild(h('p', { class: 'riggoal' }, h('b', {}, 'Goal: '), m.goalText));
      }
      syncControls(); drawPicture(); setBusy(false);
    }
    function assign(t, src) { if (src) for (var k in src) t[k] = src[k]; return t; }

    /* ---------- run ---------- */
    function setBusy(on) { runBtn.textContent = on ? 'Skip to the result' : '▶ Run'; canvas.classList.toggle('running', on); }
    function liveHud(v, phase, progress) {
      clear(hud);
      hud.appendChild(h('div', { class: 'lt-phase' }, h('span', {}, phase), h('div', { class: 'track' }, (function () { var f = h('div', { class: 'fill' }); f.style.width = Math.round(progress * 100) + '%'; return f; })())));
      hud.appendChild(h('div', { class: 'readout lt-tiles' }, tile('Arriving', rate(v.offered) + ' /s'), tile('Answered', rate(v.good) + ' /s'), tile('Lost right now', pc(v.lost), v.lost > 1 ? 'bad' : 'good'), tile('p99 right now', v.p99 ? Math.round(v.p99) + ' ms' : '—')));
    }
    function run() {
      clear(out);
      var r = RIG.start(rig, mi, s, 1, sit), speed = r.endMs / 7000, last = performance.now(), lastPaint = 0;
      running = { r: r, raf: 0 };
      setBusy(true); syncControls();
      function frame(now) {
        if (!running) return;
        if (!canvas.isConnected) { running = null; return; }      // the player left the page
        var more = r.step(Math.min(100, now - last) * speed); last = now;
        if (now - lastPaint > 110 || !more) {
          lastPaint = now;
          var v = r.view(), t = r.timeMs();
          paint(v); liveHud(v, t < r.warmMs ? 'Before measuring' : 'Measuring', t / r.endMs); drawCharts(r, r.samples());
        }
        if (more) running.raf = requestAnimationFrame(frame); else finish(false);
      }
      running.raf = requestAnimationFrame(frame);
    }
    function finish(skip) {
      var cur = running; if (!cur) return;
      cancelAnimationFrame(cur.raf); running = null;
      var r = cur.r;
      if (skip) { while (r.step(2000)) { /* run it out */ } }
      var m = r.result(), used = r.settings;
      paint(m.end); drawCharts(r, r.samples());
      clear(hud);
      hud.appendChild(h('div', { class: 'lt-phase' }, h('span', {}, 'Measured'), h('div', { class: 'track' }, (function () { var f = h('div', { class: 'fill' }); f.style.width = '100%'; return f; })())));
      var tiles = [tile('Answered', rate(m.good) + ' /s of ' + rate(m.offered)), tile('Lost', pc(m.loss), m.loss > 1 ? 'bad' : 'good'), tile('Slowest 1 in 100 (p99)', m.p99 == null ? 'nothing answered' : Math.round(m.p99) + ' ms')];
      (rig.tiles ? rig.tiles(m, used) : []).forEach(function (t) { tiles.push(tile(t[0], t[1], t[2])); });
      hud.appendChild(h('div', { class: 'readout lt-tiles' }, tiles));
      setBusy(false); syncControls();
      verdict(m, used);
    }
    function verdict(m, used) {
      clear(out);
      if (free()) return;
      var mission = rig.missions[mi], ok = !!mission.goal(m, used);
      if (!ok) {
        out.appendChild(feedback(false, (paid[mi] ? 'This setting misses the goal (' : 'Not yet (') + mission.goalText + '). ' + (mission.miss ? mission.miss(m, used) : '')));
        if (paid[mi]) { out.appendChild(h('p', { class: 'muted' }, 'You passed this mission with an earlier setting, so you can still move on.')); out.appendChild(nextBtn()); }
        else out.appendChild(h('p', { class: 'muted' }, 'Change a setting and run it again. A failed run costs nothing.'));
        return;
      }
      if (!paid[mi]) {
        paid[mi] = 1;
        if (st) st.rigPaid = Math.max(st.rigPaid || 0, mi + 1);
        if (!mission.observe) SD.hit(true, ctx.topicId);
        var base = mission.observe ? 4 : 12;
        SD.award(ctx.replay ? SD.replayXp(base, base) : base);   // a lab passed before pays a fifth
      }
      out.appendChild(feedback(true, mission.win));
      var nx = nextBtn();
      out.appendChild(nx); nx.focus();
    }

    el.appendChild(h('h3', { class: 'question' }, rig.title));
    el.appendChild(mission);
    el.appendChild(h('div', { class: 'canvaswrap' }, canvas));
    el.appendChild(controls);
    el.appendChild(h('div', { class: 'row' }, runBtn));
    el.appendChild(hud); el.appendChild(charts); el.appendChild(out);
    el.appendChild(h('p', { class: 'muted lt-key' }, rig.note + ' Moving dashes are requests; the bar in a box is how many of its slots are taken; red means requests are being refused or failed. Simulated with the ',
      h('a', { href: 'https://github.com/workersio/breakscale', target: '_blank', rel: 'noopener noreferrer' }, 'Breakscale'), ' engine; the capacities are illustrative.'));
    buildControls();
    if (ctx.resume) { var keep = assign({}, s); setMission(); assign(s, keep); edited(); } else setMission();   // edited() also offers "Next" again if this mission was passed
    // The picture is laid out once, for a phone or for a desktop. If the window later crosses that line (a rotated
    // phone, a resized window) it would only shrink, down to labels a few pixels high, so the lab is drawn again.
    function relayout() {
      if (!canvas.isConnected) return window.removeEventListener('resize', relayout);
      if (running || ((el.clientWidth || window.innerWidth) < 560) === narrow) return;
      window.removeEventListener('resize', relayout);
      var c2 = {}; for (var k in ctx) c2[k] = ctx[k];
      c2.resume = { mi: mi, s: s, paid: paid, sit: sit };
      clear(el); L.rig(el, spec, c2);
    }
    window.addEventListener('resize', relayout);
  };

  /* ================= Sequence: a short drill, then the rig ================= */
  L.seq = function (el, spec, ctx) {
    var i = 0, n = spec.parts.length, scores = [], done = [], resumed = 0;
    // Part scores are kept with the topic until the lab is passed, so leaving mid-lab does not mean redoing (and being
    // paid again for) the parts already done. A lab passed before (a replay) starts afresh.
    var st = ctx.topicId && !ctx.replay ? SD.topicState(ctx.topicId) : null;
    if (st) {
      for (var k = 0; k < n; k++) if (typeof st['seqS' + k] === 'number') { scores[k] = st['seqS' + k]; done[k] = true; }
      while (i < n && done[i]) i++;
      if (i >= n) { i = 0; done = []; }   // every part was done and the lab still failed: go round again, keeping the bests
      else resumed = i;
    }
    function show() {
      clear(el);
      var part = spec.parts[i], body = h('div', {}), foot = h('div', {});
      el.appendChild(h('div', { class: 'qcount' }, 'Part ' + (i + 1) + ' of ' + n + ' · ' + L.NAMES[part.type]));
      if (resumed && i === resumed) el.appendChild(h('p', { class: 'muted' }, 'Picked up where you left off: part' + (resumed > 1 ? 's 1–' + resumed + ' are' : ' 1 is') + ' already done. ',
        h('button', { class: 'btn mini', onclick: function () { resumed = 0; i = 0; done = []; show(); } }, 'Start again from part 1')));
      el.appendChild(body); el.appendChild(foot);
      L[part.type](body, part, { topicId: ctx.topicId, replay: ctx.replay, onDone: function (score) {
        scores[i] = Math.max(scores[i] || 0, score); done[i] = true;
        if (st) { st['seqS' + i] = scores[i]; SD.save(); }
        var next = 0; while (next < n && done[next]) next++;   // the first part not yet attempted (a retry can leave i behind it)
        if (next >= n) return ctx.onDone(scores.reduce(function (a, b) { return a + b; }, 0) / n);
        if (foot.firstChild) return;
        // The lab's score is the average of its parts. If the parts done so far have put the pass mark out of reach even
        // with full marks on the rest, say so now and offer the weakest part again, not after the player has done the rest.
        var sofar = 0, left = 0, weak = i;
        for (var k = 0; k < n; k++) { if (!done[k]) left++; else { sofar += scores[k]; if (scores[k] < scores[weak]) weak = k; } }
        var doomed = (sofar + left) / n < L.PASS - 1e-9, name = L.NAMES[spec.parts[next].type];
        var nx = h('button', { class: 'btn big' + (doomed ? '' : ' primary'), onclick: function () { i = next; show(); } }, doomed ? 'Continue anyway →' : 'Part ' + (next + 1) + ': ' + name + ' →');
        if (doomed) {
          var again = h('button', { class: 'btn primary big', onclick: function () { i = weak; show(); } }, 'Retry part ' + (weak + 1));
          foot.appendChild(feedback(false, 'Part ' + (weak + 1) + ' scored ' + Math.round(scores[weak] * 100) + '%. The lab needs ' + Math.round(L.PASS * 100) + '% across its parts, which is now out of reach even with ' +
            (left === 1 ? 'a perfect ' + name.toLowerCase() : 'full marks on the parts still to come') + '. Your best score for a part is the one that counts, so retry it first.'));
          foot.appendChild(h('div', { class: 'row wrap' }, again, nx));
          again.focus();
        } else { foot.appendChild(nx); nx.focus(); }
      } });
    }
    show();
  };

  L.NAMES.rig = 'Load test';
  L.NAMES.seq = 'Drill, then load test';
  // Identifies which lab a topic has, so that progress on a lab that has since been replaced is not counted for the new one.
  L.sigOf = function (lab) {
    return lab.type === 'seq' ? 'seq:' + lab.parts.map(L.sigOf).join('+') : lab.type === 'rig' ? 'rig:' + lab.rig : lab.type;
  };
  // What to call a lab: a drill-then-rig lab keeps that name, and a sequence of plain drills says how many parts it has.
  L.nameOf = function (lab) {
    if (lab.type !== 'seq') return L.NAMES[lab.type];
    if (lab.parts.some(function (p) { return p.type === 'rig' || p.type === 'diagram'; })) return L.NAMES.seq;
    return ['', '', 'Two', 'Three', 'Four'][lab.parts.length] + '-part drill';
  };
})(window.SD);
