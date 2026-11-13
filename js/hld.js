// Load test for the diagram builder: turns the design the player drew into a topology for the
// Breakscale engine (js/vendor/breakscale-sim.js), runs it, and judges the result.
// Pure logic, no DOM: tools/check-hld.mjs runs the same code in Node against every diagram lab.
//
// A lab's `sim` block says what the system has to carry:
//   flows   the kinds of request, each with a rate and the calls it may make ("hops"). A hop is
//           [caller, callee] or [caller, callee, { instead: other }] for a fallback that is only
//           taken when the caller has no arrow to `other`, or to any of them if it is a list (a
//           client with no load balancer calls the app directly). `aside: [cache, store]` marks a cache-aside read: the caller asks the
//           cache, and only a miss goes on to the store. `needs` lists what the flow must reach.
//   parts   engine settings per component. `solo` overrides apply when nothing balances load in
//           front of it, because a client can only address one server.
//   goals   the most errors (percent) and the slowest acceptable p99 (ms).
//   scale   the engine runs at 1/scale of the stated rates so a browser can keep up; every rate
//           shown to the player is multiplied back.
window.SD = window.SD || {};
(function (SD) {
  'use strict';

  var KIND = {
    client: 'client', cdn: 'cdn', lb: 'lb', gateway: 'apigateway', app: 'service', cache: 'cache', db: 'db', replica: 'db',
    queue: 'queue', worker: 'worker', blob: 'objectstore', search: 'searchindex', ws: 'service', idgen: 'service', ledger: 'db', psp: 'service',
    index: 'service', features: 'service', ranker: 'service', warehouse: 'db'
  };
  var FRONTS = { lb: 1, apigateway: 1 };       // kinds that spread traffic over a fleet
  var ABSORBS = { cache: 1, cdn: 1 };          // kinds that answer a share of requests themselves
  // Helper nodes the player never sees. Wide and fast enough never to be the limit.
  var HIDDEN = { capacity: 100000, instances: 1, serviceMs: 0.01, serviceCv: 0, queueLimit: 100000, errorRate: 0, timeoutMs: 0, retries: 0 };

  function ek(a, b) { return a + '>' + b; }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) t[k] = s[k]; } return t; }

  /* ---------- compile ---------- */
  // design: { nodes: { id: true }, edges: { 'from>to': true } }
  function compile(spec, design, label) {
    var sim = spec.sim, parts = sim.parts || {}, scale = sim.scale || 1;
    var defaults = window.BreakscaleSim.defaultConfig;
    var name = label || function (id) { return id; };
    var drawn = function (a, b) { return !!design.edges[ek(a, b)]; };
    var problems = [], usedEdge = {}, reached = {};

    function kindOf(id) { return (parts[id] && parts[id].kind) || KIND[id] || 'service'; }

    /* Which arrows does each flow travel? */
    var flows = sim.flows.map(function (f) {
      var out = {};
      f.hops.forEach(function (hp) {
        var u = hp[0], v = hp[1], opt = hp[2] || {};
        if (!drawn(u, v)) return;
        if (opt.instead && [].concat(opt.instead).some(function (w) { return drawn(u, w); })) return;
        (out[u] = out[u] || []).push(v);
      });
      // Walk from the client; only arrows a request can actually get to count.
      var seen = { client: 1 }, order = ['client'], edges = [];
      for (var i = 0; i < order.length; i++) {
        (out[order[i]] || []).forEach(function (v) { edges.push([order[i], v, ek(order[i], v)]); if (!seen[v]) { seen[v] = 1; order.push(v); } });
      }
      // Cache-aside: the caller asks the cache first, and the store only sees the misses.
      if (f.aside) {
        var c = f.aside[0], d = f.aside[1];
        edges.forEach(function (e) {
          if (e[1] !== d) return;
          var viaCache = edges.some(function (x) { return x[0] === e[0] && x[1] === c; });
          if (viaCache) e[0] = c;      // engine edge cache -> store, still credited to the arrow the player drew
        });
      }
      (f.needs || []).forEach(function (id) {
        if (!seen[id]) problems.push({ type: 'unserved', flow: f.label, id: id, text: f.label + ' never reach the ' + name(id) + '. ' + ((sim.needWhy && sim.needWhy[id]) || (spec.why && spec.why[id]) || '') });
      });
      edges.forEach(function (e) { usedEdge[e[2]] = 1; });
      Object.keys(seen).forEach(function (id) { reached[id] = 1; });
      return { spec: f, edges: edges, seen: seen };
    });

    /* Arrows nobody travels, and boxes nothing reaches. */
    var hopSet = {};
    sim.flows.forEach(function (f) { f.hops.forEach(function (hp) { hopSet[ek(hp[0], hp[1])] = 1; }); });
    (sim.ok || []).forEach(function (e) { hopSet[ek(e[0], e[1])] = 2; });
    Object.keys(design.edges).forEach(function (k) {
      if (usedEdge[k] || hopSet[k] === 2) return;
      var p = k.split('>'), a = p[0], b = p[1], why;
      if (spec.decoys && (spec.decoys[a] || spec.decoys[b])) return;      // the unjustified box is reported once, below
      if (sim.bad && sim.bad[k]) why = sim.bad[k];
      else if (hopSet[ek(b, a)] && !design.edges[ek(b, a)]) why = 'This arrow points the wrong way. An arrow goes from the caller to the thing it calls, and the ' + name(a) + ' never calls the ' + name(b) + '.';
      else if (hopSet[k]) why = 'No request gets this far, or another arrow already carries this traffic.';
      else why = 'No request in this brief makes that call. What would the ' + name(a) + ' ask the ' + name(b) + ' for?';
      problems.push({ type: 'idle', edge: k, text: name(a) + ' → ' + name(b) + ' carries no traffic. ' + why });
    });
    Object.keys(design.nodes).forEach(function (id) {
      if (spec.decoys && spec.decoys[id]) problems.push({ type: 'decoy', id: id, text: 'Unjustified: ' + name(id) + '. ' + spec.decoys[id] });
      else if (!reached[id]) problems.push({ type: 'orphan', id: id, text: name(id) + ' is on the canvas but no request ever reaches it.' });
    });

    /* Engine nodes for what the player drew. */
    var nodes = [], edges = [], credit = {}, solo = {}, total = 0;
    sim.flows.forEach(function (f) { total += f.rps; });
    var workerPulls = {};
    flows.forEach(function (f) { f.edges.forEach(function (e) { if (kindOf(e[0]) === 'queue' && kindOf(e[1]) === 'worker') workerPulls[e[1]] = 1; }); });
    function config(id) {
      var kind = engineKind(id), p = parts[id] || {}, cfg = assign({}, defaults(kind), p.cfg);
      if (p.solo) {
        var fronted = Object.keys(design.edges).some(function (k) { var q = k.split('>'); return q[1] === id && usedEdge[k] && FRONTS[kindOf(q[0])]; });
        if (!fronted) { assign(cfg, p.solo); solo[id] = 1; }
      }
      if (id === 'client') assign(cfg, { rps: total / scale, timeoutMs: sim.timeoutMs || 3000, retries: 0 });
      return cfg;
    }
    // A worker that is called directly instead of pulling from a queue behaves like any other server.
    function engineKind(id) { var k = kindOf(id); return k === 'worker' && !workerPulls[id] ? 'service' : k; }
    function node(id, kind, cfg) { nodes.push({ id: id, kind: kind, label: id, x: 0, y: 0, config: cfg }); }
    function edge(from, to, weight, playerEdge) {
      var id = from + '->' + to;
      if (!edges.some(function (e) { return e.id === id; })) edges.push({ id: id, from: from, to: to, weight: weight || 1 });
      if (playerEdge) { (credit[playerEdge] = credit[playerEdge] || []); if (credit[playerEdge].indexOf(id) < 0) credit[playerEdge].push(id); }
    }
    Object.keys(reached).forEach(function (id) { node(id, engineKind(id), config(id)); });
    var cfgById = {}; nodes.forEach(function (n) { cfgById[n.id] = n.config; });

    /* How much of each flow arrives at each node (needed to split traffic where flows part ways). */
    flows.forEach(function (f) {
      var rate = { client: f.spec.rps }, indeg = {}, queue = ['client'];
      f.edges.forEach(function (e) { indeg[e[1]] = (indeg[e[1]] || 0) + 1; });
      while (queue.length) {
        var u = queue.shift(), pass = ABSORBS[kindOf(u)] ? 1 - (cfgById[u] ? cfgById[u].hitRate : 0) : 1;
        f.edges.forEach(function (e) {
          if (e[0] !== u) return;
          rate[e[1]] = (rate[e[1]] || 0) + (rate[u] || 0) * pass;
          if (--indeg[e[1]] === 0) queue.push(e[1]);
        });
      }
      f.rate = rate;
    });

    /* Wire it. Where flows leave a node by different arrows, a hidden dispatcher sends each request
       down one flow's arrows, in proportion to how much of that flow arrives. Breakscale's own
       examples split traffic the same way, with weighted edges out of a gateway. */
    Object.keys(reached).forEach(function (u) {
      var groups = {};
      flows.forEach(function (f) {
        if (!f.seen[u] || !(f.rate[u] > 0)) return;
        var outs = f.edges.filter(function (e) { return e[0] === u; });
        var key = outs.map(function (e) { return e[1]; }).sort().join(',');
        var g = groups[key] = groups[key] || { outs: [], rate: 0 };
        g.rate += f.rate[u];
        outs.forEach(function (e) { if (!g.outs.some(function (x) { return x[1] === e[1] && x[2] === e[2]; })) g.outs.push(e); });
      });
      var keys = Object.keys(groups);
      if (keys.length <= 1 || kindOf(u) === 'queue') {
        keys.forEach(function (k) { groups[k].outs.forEach(function (e) { edge(u, e[1], 1, e[2]); }); });
        return;
      }
      var d = '~split:' + u;
      node(d, 'lb', assign({}, defaults('lb'), HIDDEN));
      edge(u, d, 1);
      keys.forEach(function (k, i) {
        var g = groups[k], w = Math.max(g.rate, 1e-6);
        if (g.outs.length === 1) return edge(d, g.outs[0][1], w, g.outs[0][2]);
        var h = '~' + (g.outs.length ? 'fan:' : 'end:') + u + ':' + i;
        node(h, 'service', assign({}, defaults('service'), HIDDEN));
        edge(d, h, w);
        g.outs.forEach(function (e) { edge(h, e[1], 1, e[2]); });
      });
    });

    return { topology: { nodes: nodes, edges: edges }, credit: credit, problems: problems, solo: solo, scale: scale, reached: reached, usedEdge: usedEdge };
  }

  /* ---------- run ---------- */
  var FRAME = 1000 / 60;
  function start(spec, compiled, seed) {
    var sim = spec.sim, engine = new window.BreakscaleSim.Engine(compiled.topology, seed || 1);
    var warm = (sim.warmupS || 5) * 1000, end = warm + (sim.windowS || 15) * 1000, t = 0, tallying = false;
    var byId = {}, kinds = {};
    compiled.topology.edges.forEach(function (e) { byId[e.id] = e; });
    compiled.topology.nodes.forEach(function (n) { kinds[n.id] = n.kind; });
    return {
      endMs: end, warmMs: warm,
      // Advance by up to `ms` of simulated time. Returns false once the run is over.
      step: function (ms) {
        var until = Math.min(end, t + ms);
        while (t < until - 1e-6) {
          if (!tallying && t >= warm - 1e-6) { engine.startTally(); tallying = true; }
          var dt = Math.min(FRAME, until - t, tallying ? Infinity : Math.max(warm - t, 1e-3));
          engine.advance(dt); t += dt;
        }
        return t < end - 1e-6;
      },
      timeMs: function () { return t; },
      // What the canvas shows: figures per box and per arrow the player drew.
      view: function () {
        var s = engine.snapshot(), k = compiled.scale, nodes = {}, edges = {};
        compiled.topology.nodes.forEach(function (n) {
          if (n.id.charAt(0) === '~') return;
          var st = s.nodes[n.id], slots = (n.config.capacity || 1) * (st.instances || n.config.instances || 1);
          var taken = st.inFlight + (st.waitingOnDownstream || 0);
          nodes[n.id] = {
            kind: n.kind, busy: Math.min(1, n.kind === 'queue' || n.kind === 'client' ? 0 : taken / slots), work: st.utilization,
            waiting: (st.waitingOnDownstream || 0) / slots, queued: st.queued * k, queueFill: st.queueLimit > 0 ? Math.min(1, st.queued / st.queueLimit) : 0,
            arriving: st.arrivalRate * k, done: st.throughput * k, shed: Math.max(st.shedRate, st.throttledRate || 0, taken >= 0.97 * slots && n.kind !== 'queue' ? st.arrivalRate - st.throughput : 0) * (n.kind === 'client' ? 0 : k), errors: st.errorRate, hit: st.hitRate
          };
        });
        Object.keys(compiled.credit).forEach(function (pk) {
          var f = 0, state = 'idle';
          compiled.credit[pk].forEach(function (id) {
            var e = byId[id], flow = s.edgeFlow[id] || 0;
            // A worker pulls from a queue, and the engine counts no flow on a pull. What the worker takes in is that flow.
            if (!flow && kinds[e.from] === 'queue' && s.nodes[e.to]) flow = s.nodes[e.to].arrivalRate;
            f += flow; if (s.edgeState[id] === 'live') state = 'live';
          });
          edges[pk] = { flow: f * k, state: f > 0 ? 'live' : state };
        });
        return { timeMs: s.system.timeMs, offered: s.system.offeredRps * k, good: s.system.goodputRps * k, errorRate: s.system.errorRate, p99: s.system.p99, nodes: nodes, edges: edges };
      },
      tally: function () { return engine.readTally(); }
    };
  }

  /* ---------- judge ---------- */
  function pct(sorted, p) { return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] : null; }
  function judge(spec, compiled, run, label) {
    var sim = spec.sim, goals = sim.goals, name = label || function (id) { return id; };
    var t = run.tally(), v = run.view(), k = compiled.scale;
    var settled = t.completed + t.failed, lat = Array.prototype.slice.call(t.latencies).sort(function (a, b) { return a - b; });
    var loss = settled ? 100 * t.failed / settled : 100, p99 = pct(lat, 0.99);
    var keptUp = t.arrived ? settled / t.arrived : 0;
    var checks = [
      { label: 'Requests lost', value: loss, text: (loss < 10 ? loss.toFixed(1) : Math.round(loss)) + '%', limit: 'at most ' + goals.errors + '%', ok: loss <= goals.errors && keptUp >= 0.98 },
      { label: 'Slowest 1 in 100 (p99)', value: p99, text: p99 == null ? 'nothing finished' : Math.round(p99) + ' ms', limit: 'at most ' + goals.p99 + ' ms', ok: p99 != null && p99 <= goals.p99 }
    ];
    // A queue hides overload from the caller, so look at the backlog as well.
    var findings = [];
    Object.keys(v.nodes).forEach(function (id) {
      var n = v.nodes[id];
      if (n.kind !== 'queue') return;
      var limit = Math.max(2 * n.arriving, 50 * k);
      var ok = n.queued <= limit && t.jobsFailed <= 0.01 * Math.max(1, t.jobsQueued);
      checks.push({ label: name(id) + ' backlog', value: n.queued, text: SD.fmt ? SD.fmt(Math.round(n.queued)) + ' waiting' : Math.round(n.queued) + ' waiting', limit: 'drains as fast as it fills', ok: ok });
      if (!ok) findings.push({ id: id, text: name(id) + ': ' + Math.round(n.queued).toLocaleString('en-US') + ' jobs are waiting and the pile is still growing. Whatever reads from it is too slow, so the work is late rather than lost, until the queue fills.' });
    });
    // Where did it break? Start from the part furthest downstream that is full or turning work away.
    var full = {}, down = {};
    compiled.topology.edges.forEach(function (e) { (down[e.from] = down[e.from] || []).push(e.to); });
    Object.keys(v.nodes).forEach(function (id) { var n = v.nodes[id]; if (n.kind !== 'client' && n.kind !== 'queue' && (n.shed > 0.005 * Math.max(1, n.arriving) || n.busy > 0.97)) full[id] = 1; });
    function fullBelow(id, seen) {
      return (down[id] || []).some(function (c) { if (seen[c]) return false; seen[c] = 1; return (full[c] && c.charAt(0) !== '~') || fullBelow(c, seen); });
    }
    Object.keys(full).forEach(function (id) {
      var n = v.nodes[id], root = !fullBelow(id, {}), part = (sim.parts || {})[id] || {};
      var text = name(id) + ': ' + Math.round(n.arriving).toLocaleString('en-US') + ' requests a second arrive';
      if (n.shed > 0) text += ' and it turns away ' + Math.round(n.shed).toLocaleString('en-US') + ' of them';
      if (root) text += '. Every slot is taken ' + (n.waiting > 0.5 ? 'waiting for what it calls, which is too slow for this load.' : 'doing its own work: this is where the system runs out.');
      else text += '. Its slots are stuck waiting on the part behind it, so the trouble starts further along.';
      if (root && compiled.solo[id] && part.soloWhy) text += ' ' + part.soloWhy;
      else if (root && part.fullWhy) text += ' ' + part.fullWhy;
      findings.push({ id: id, root: root, text: text });
    });
    findings.sort(function (a, b) { return (b.root ? 1 : 0) - (a.root ? 1 : 0); });

    var blockers = compiled.problems.filter(function (p) { return p.type === 'unserved'; });
    var held = checks.every(function (c) { return c.ok; });
    var passed = held && !blockers.length;
    var untidy = compiled.problems.filter(function (p) { return p.type !== 'unserved'; }).length;
    var score = passed ? Math.max(0.6, 1 - 0.1 * untidy) : 0;
    return { passed: passed, held: held, clean: passed && !untidy, score: score, checks: checks, findings: findings, problems: compiled.problems, loss: loss, p99: p99 };
  }

  // Convenience for tests: compile, run to the end, judge.
  function check(spec, design, seed, label) {
    var c = compile(spec, design, label), r = start(spec, c, seed);
    while (r.step(1000)) { /* keep going */ }
    return assign(judge(spec, c, r, label), { compiled: c, view: r.view() });
  }

  SD.hld = { compile: compile, start: start, judge: judge, check: check, edgeKey: ek, KIND: KIND };
})(window.SD);
