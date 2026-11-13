// Load-test rigs: a fixed system, a few controls, and missions judged on what the Breakscale engine
// (js/vendor/breakscale-sim.js) measures when the system is run. The diagram builder asks "can you draw a
// design that holds?"; a rig asks "this one is failing: which setting fixes it, and why?".
// Pure logic, no DOM: js/riglab.js draws it, and tools/check-rig.mjs runs every mission in Node.
//
// A rig has
//   layout    the boxes of the picture: [id, icon, name, column, row, optional]. An optional box is only
//             drawn when the current settings put it in the system.
//   controls  what the player can change. `options` is a list of [value, label]; `stops` is a list of
//             values for a slider. `when(s)` hides a control that does nothing in the current mission.
//   build(s)  the engine topology for a set of settings: nodes [id, kind, config], edges [from, to, weight],
//             timed events ({ at, node, slow | clear | cfg, label }), and how long to warm up and measure.
//   missions  each sets `env` (the situation), `fix` (locked settings) and `start` (where the free settings
//             begin), and passes when goal(measured, settings) is true. `observe` missions only ask the
//             player to run a fixed setup and see it fail. `solution` is a setting that passes, for the checker.
// All capacities are illustrative, chosen so the failure and the fix are both unmistakable.
window.SD = window.SD || {};
(function (SD) {
  'use strict';

  var FRAME = 1000 / 60, SAMPLE_MS = 250, UNBOUNDED = 100000;
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) t[k] = s[k]; } return t; }
  function pct(sorted, p) { return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] : null; }
  function sum(o, keys) { var n = 0; (keys || Object.keys(o)).forEach(function (k) { n += o[k] || 0; }); return n; }

  /* ---------- settings ---------- */
  function defaults(rig) { var s = {}; rig.controls.forEach(function (c) { s[c.k] = c.val; }); return s; }
  // The settings a mission actually runs with: the player's, then the mission's locked ones, plus its situation.
  // Past the last mission (free play) nothing is locked, and `sit` picks which mission's situation applies.
  function settingsFor(rig, mi, s, sit) {
    var n = rig.missions.length, free = mi >= n;
    var m = rig.missions[free ? Math.max(0, Math.min(n - 1, sit == null ? n - 1 : sit)) : mi];
    return assign({}, defaults(rig), s, free ? null : m.fix, { env: m.env || {} });
  }

  /* ---------- run ---------- */
  function start(rig, mi, settings, seed, sit) {
    var s = settingsFor(rig, mi, settings, sit), built = rig.build(s), Sim = window.BreakscaleSim;
    var topo = {
      nodes: built.nodes.map(function (n) { return { id: n[0], kind: n[1], label: n[0], x: 0, y: 0, config: assign({}, Sim.defaultConfig(n[1]), n[2]) }; }),
      edges: built.edges.map(function (e) { return { id: e[0] + '->' + e[1], from: e[0], to: e[1], weight: e[2] == null ? 1 : e[2] }; })
    };
    var engine = new Sim.Engine(topo, seed || 1);
    var warm = (built.warmS == null ? 5 : built.warmS) * 1000, end = warm + (built.windowS || 15) * 1000;
    var events = (built.events || []).slice().sort(function (a, b) { return a.at - b.at; }), ei = 0;
    var t = 0, tallying = false, samples = [], nextSample = 0;
    var slots = {};
    topo.nodes.forEach(function (n) { slots[n.id] = (n.config.capacity || 1) * (n.config.instances || 1); });

    function fire() {
      while (ei < events.length && events[ei].at * 1000 <= t + 1e-6) {
        var e = events[ei++];
        if (e.clear) engine.clearFailure(e.node);
        else if (e.cfg) engine.updateNodeConfig(e.node, e.cfg);
        else if (e.slow) engine.injectFailure(e.node, 'slow', { factor: e.slow });
      }
    }
    function nodeView(id, st) {
      var kind = topo.nodes.filter(function (n) { return n.id === id; })[0].kind;
      var passive = kind === 'client' || kind === 'ratelimiter' || kind === 'breaker' || kind === 'loadshedder' || kind === 'lb';
      var taken = st.inFlight + (st.waitingOnDownstream || 0);
      var refused = Math.max(st.shedRate || 0, st.throttledRate || 0, (st.highSheddedRate || 0) + (st.lowSheddedRate || 0));
      return { kind: kind, busy: passive ? 0 : Math.min(1, taken / slots[id]), queued: st.queued, arriving: st.arrivalRate, done: st.throughput, refused: refused, errors: st.errorRate || 0, state: st.breakerState || null };
    }
    function view() {
      var snap = engine.snapshot(), nodes = {}, edges = {};
      topo.nodes.forEach(function (n) { nodes[n.id] = nodeView(n.id, snap.nodes[n.id]); });
      topo.edges.forEach(function (e) { edges[e.from + '>' + e.to] = snap.edgeFlow[e.id] || 0; });
      return { t: t / 1000, offered: snap.system.offeredRps, good: snap.system.goodputRps, lost: 100 * snap.system.errorRate, p99: snap.system.p99, nodes: nodes, edges: edges };
    }
    return {
      endMs: end, warmMs: warm, settings: s, built: built,
      // Advance by up to `ms` of simulated time. Returns false once the run is over.
      step: function (ms) {
        var until = Math.min(end, t + ms);
        while (t < until - 1e-6) {
          fire();
          if (!tallying && t >= warm - 1e-6) { engine.startTally(); tallying = true; }
          if (t >= nextSample - 1e-6) { samples.push(view()); nextSample += SAMPLE_MS; }
          var dt = Math.min(FRAME, until - t, tallying ? Infinity : Math.max(warm - t, 1e-3));
          engine.advance(dt); t += dt;
        }
        return t < end - 1e-6;
      },
      timeMs: function () { return t; },
      view: view,
      samples: function () { return samples; },
      // What the mission is judged on: everything that arrived inside the measuring window.
      result: function () {
        var T = engine.readTally(), secs = (end - warm) / 1000;
        function figures(x) {
          var settled = x.completed + x.failed, lat = Array.prototype.slice.call(x.latencies).sort(function (a, b) { return a - b; });
          return { loss: settled ? 100 * x.failed / settled : 100, good: x.completed / secs, offered: x.arrived / secs, p50: pct(lat, 0.5), p99: pct(lat, 0.99), failed: assign({}, x.failuresByReason), arrived: x.arrived };
        }
        var m = figures(T);
        m.routes = {};
        Object.keys(T.byRoute || {}).forEach(function (id) { m.routes[id] = figures(T.byRoute[id]); });
        m.end = view(); m.samples = samples; m.seconds = secs;
        if (rig.measure) rig.measure(m, s);
        return m;
      }
    };
  }
  // Convenience for tests: run a mission to the end with the given settings and judge it.
  function check(rig, mi, settings, seed) {
    var r = start(rig, mi, settings, seed);
    while (r.step(1000)) { /* keep going */ }
    var m = r.result(), mission = rig.missions[mi];
    return { m: m, s: r.settings, passed: !!mission.goal(m, r.settings) };
  }

  function ms(v) { return v == null ? '—' : Math.round(v) + ' ms'; }
  function p1(v) { return (v < 10 ? v.toFixed(1) : String(Math.round(v))) + '%'; }
  var ON_OFF = [[false, 'Off'], [true, 'On']];
  var RIGS = {};

  /* ================= 1.5 Load balancers ================= */
  RIGS.lb = {
    title: 'One bad server behind a load balancer',
    note: 'Each server has 8 slots and takes 25 ms per request, so it can finish 320 a second. Round robin is modelled as an even random split, which gives every server the same share. Ejection is shown as already having happened: the load balancer has stopped sending to the server.',
    layout: [['client', '📱', 'Clients', 0, 1], ['lb', '⚖️', 'Load balancer', 1, 1], ['a', '🧩', 'Server A', 2, 0], ['b', '🧩', 'Server B', 2, 1], ['c', '🧩', 'Server C', 2, 2]],
    controls: [
      { k: 'policy', label: 'Routing', options: [['rr', 'Round robin'], ['lc', 'Least connections']], val: 'rr' },
      { k: 'eject', label: 'Eject servers that return errors', options: ON_OFF, val: false }
    ],
    chart: [{ label: 'Requests lost', unit: '%', get: function (v) { return v.lost; }, max: 100 }, { label: 'Waiting at server C', unit: '', get: function (v) { return v.nodes.c ? v.nodes.c.queued : 0; } }],
    build: function (s) {
      var server = { capacity: 8, serviceMs: 25, serviceCv: 0.6, queueLimit: 64 };
      var bad = s.env.fault === 'slow' ? { serviceMs: 250 } : { serviceMs: 1, errorRate: 1 };
      // Equal weights make the engine pick the least loaded target; unequal ones make it split at random by weight.
      var w = s.policy === 'rr' ? [1, 1.000001, 0.999999] : [1, 1, 1];
      var edges = [['client', 'lb'], ['lb', 'a', w[0]], ['lb', 'b', w[1]]];
      if (!(s.eject && s.env.fault === 'errors')) edges.push(['lb', 'c', w[2]]);
      return {
        nodes: [['client', 'client', { rps: 450, timeoutMs: 3000 }], ['lb', 'lb', {}], ['a', 'service', server], ['b', 'service', server], ['c', 'service', assign({}, server, bad)]],
        edges: edges, warmS: 5, windowS: 15
      };
    },
    missions: [
      { observe: true, env: { fault: 'slow' }, fix: { policy: 'rr', eject: false },
        text: '450 requests a second go to three servers that can each finish 320. Server C has a failing disk: it still answers, but takes 250 ms a request instead of 25. Routing is round robin. Run it and see what one slow server costs.',
        goalText: 'Run it.', goal: function (m) { return m.loss > 10; },
        win: 'Round robin kept handing C a third of the traffic: about 150 requests a second to a server that can now finish 32. Its queue filled, it turned the rest away, and the requests it did answer waited over two seconds. A ping health check would not have helped, because C still answers pings.' },
      { env: { fault: 'slow' }, fix: { eject: false }, start: { policy: 'rr' }, solution: { policy: 'lc' },
        text: 'Same fault. Change the routing so that no more than 1 request in 100 is lost.',
        goalText: 'Lost ≤ 1%', goal: function (m) { return m.loss <= 1; },
        miss: function () { return 'C is still being sent more than it can finish. Which policy looks at how busy each server is?'; },
        win: 'Least connections sees requests pile up on C and sends it only what it can finish, about 30 a second. Nothing detected a fault: a slow server simply looks busy. The slowest requests are still the ones that landed on C, which is why p99 is several hundred milliseconds rather than 70.' },
      { observe: true, env: { fault: 'errors' }, fix: { policy: 'lc', eject: false },
        text: 'The disk is replaced, but a bad deploy now makes C return an error within a millisecond of receiving a request. Routing is still least connections. Run it.',
        goalText: 'Run it.', goal: function (m) { return m.loss > 50; },
        win: 'A server that fails instantly never has a request in flight, so it always looks like the least busy one. Least connections sent it roughly two thirds of all traffic; round robin would have sent one third. The smarter policy made this failure worse.' },
      { env: { fault: 'errors' }, fix: { policy: 'lc' }, start: { eject: false }, solution: { eject: true },
        text: 'Stop the black hole without giving up least connections: lose no more than 1 request in 100.',
        goalText: 'Lost ≤ 1%', goal: function (m) { return m.loss <= 1; },
        miss: function () { return 'C still receives traffic and fails all of it. What removes a server because of the answers it gives, rather than whether it answers?'; },
        win: 'Ejecting on error rate (outlier detection) takes C out of rotation, and the two healthy servers carry 450 a second at about 70% busy. That is the pairing to say out loud in an interview: least connections for slow servers, error-rate ejection for fast-failing ones. Note what is left: two servers at 70% cannot lose another.' }
    ]
  };

  /* ================= 1.7 Timeouts ================= */
  var TIMEOUTS = [0, 10, 20, 30, 50, 80, 100, 150, 200, 500, 1000, 2000, 5000];
  RIGS.timeout = {
    title: 'A slow dependency and the calls that wait for it',
    note: 'The app has 40 slots and holds one for as long as a request is waiting on the cache or the database. The database has 16 slots at 20 ms a query and queues what it cannot start.',
    layout: [['client', '📱', 'Clients', 0, 0], ['app', '🧩', 'App service', 1, 0], ['cache', '⚡', 'Cache', 2, 0], ['db', '🗄️', 'Database', 3, 0]],
    controls: [{ k: 'timeout', label: 'Timeout on the app\'s calls', stops: TIMEOUTS, val: 0, show: function (v) { return v ? v + ' ms' : 'none'; } }],
    chart: [{ label: 'App slots in use', unit: '%', get: function (v) { return 100 * v.nodes.app.busy; }, max: 100 }, { label: 'Requests lost', unit: '%', get: function (v) { return v.lost; }, max: 100 }],
    build: function (s) {
      var slow = s.env.fault === 'slow';
      return {
        nodes: [['client', 'client', { rps: 200, timeoutMs: 3000 }], ['app', 'service', { capacity: 40, serviceMs: 5, serviceCv: 0.4, queueLimit: 100, timeoutMs: s.timeout }],
          ['cache', 'cache', { capacity: 64, serviceMs: 1, hitRate: slow ? 0.8 : 0, queueLimit: 512 }], ['db', 'db', { capacity: 16, serviceMs: 20, serviceCv: 0.6, queueLimit: 2000, lockMs: 0 }]],
        edges: [['client', 'app'], ['app', 'cache'], ['cache', 'db']],
        events: slow ? [{ at: 5, node: 'db', slow: 100, label: 'Database slows' }] : [], warmS: 5, windowS: 15
      };
    },
    missions: [
      { observe: true, env: { fault: 'slow' }, fix: { timeout: 0 },
        text: '200 requests a second. The cache answers 8 in 10; the other 2 read the database. Five seconds in, the database slows from 20 ms to 2 seconds a query. The app has no timeout on its calls. Run it.',
        goalText: 'Run it.', goal: function (m) { return m.loss > 50; },
        win: 'Only 2 requests in 10 needed the database, yet about 8 in 10 failed. Every request that reached the database held one of the app\'s 40 slots while it waited. Slots held = arrivals × time held: 40 a second × 2 s is 80, twice what the app has. Once every slot was held by a waiting request, the ones the cache could have answered in 6 ms were turned away at the door.' },
      { env: { fault: 'slow' }, start: { timeout: 0 }, solution: { timeout: 200 },
        text: 'Same fault. Set a timeout that keeps the cached requests working: lose no more than 25% of requests.',
        goalText: 'Lost ≤ 25%', goal: function (m) { return m.loss <= 25; },
        miss: function (m, s) { return s.timeout ? 'At ' + s.timeout + ' ms each waiting call still holds its slot too long: 40 calls a second × ' + (s.timeout / 1000) + ' s is ' + Math.round(40 * s.timeout / 1000) + ' slots, and the app has 40.' : 'With no timeout a waiting call holds its slot until the database answers.'; },
        win: 'The app now gives up on the database and takes its slot back. The 2 in 10 that need the database still fail, because a timeout does not make anything faster, but they fail quickly and the other 8 are answered in about 6 ms. A timeout turns a slow dependency from everyone\'s outage into its own.' },
      { env: { fault: 'none' }, start: { timeout: 20 }, solution: { timeout: 100 },
        text: 'The database is healthy again, but the cache has just been emptied, so every request reads the database: 20 ms on average, about 60 ms for the slowest 1 in 100. Someone set the timeout to 20 ms "to be safe". Run it, then find a tight timeout that fails fewer than 1 request in 100.',
        goalText: 'Lost ≤ 1% with a timeout of at most 150 ms', goal: function (m, s) { return m.loss <= 1 && s.timeout > 0 && s.timeout <= 150; },
        miss: function (m, s) { return !s.timeout || s.timeout > 150 ? 'That stops the false timeouts by barely having a timeout. Keep it at 150 ms or less.' : p1(m.loss) + ' of healthy requests were cut off. The timeout is inside the normal spread of query times.'; },
        win: 'A timeout at the average cut off nearly half of all healthy requests, and each of those would normally be retried, adding load. Timeouts are set from the tail: choose the false-timeout rate you can accept, take that percentile of the dependency\'s latency, and add padding. With p99 near 60 ms, 80 to 100 ms is tight without being wrong.' }
    ]
  };

  /* ================= 1.8 Circuit breakers ================= */
  RIGS.breaker = {
    title: 'A fault that ends and an outage that does not',
    note: 'The pricing service has 4 slots at 35 ms a call, so it can finish about 114 a second. The app waits 300 ms for each call. The breaker looks at the last 4 seconds of calls, stays open for 3 seconds, then lets 3 probe calls through.',
    layout: [['client', '📱', 'Clients', 0, 0], ['app', '🧩', 'App service', 1, 0], ['cb', '🔌', 'Circuit breaker', 2, 0, true], ['dep', '💲', 'Pricing service', 3, 0]],
    controls: [
      { k: 'breaker', label: 'Circuit breaker', options: ON_OFF, val: false },
      { k: 'threshold', label: 'Open when this share of calls fail', stops: [5, 10, 15, 20, 30, 40, 50, 60], val: 50, show: function (v) { return v + '%'; }, when: function (s) { return s.breaker && s.env.fault === 'flaky'; } }
    ],
    chart: [{ label: 'Calls reaching the pricing service', unit: '/s', get: function (v) { return v.nodes.dep.arriving; }, ref: 114, refLabel: 'what it can finish' }, { label: 'Requests lost', unit: '%', get: function (v) { return v.lost; }, max: 100 }],
    build: function (s) {
      var flaky = s.env.fault === 'flaky';
      var nodes = [['client', 'client', { rps: 90, timeoutMs: 3000 }], ['app', 'service', { capacity: 64, serviceMs: 5, serviceCv: 0.4, queueLimit: 256, timeoutMs: 300, retries: flaky ? 0 : 2 }],
        ['dep', 'service', { capacity: 4, serviceMs: 35, serviceCv: 0.5, queueLimit: 64, errorRate: flaky ? 0.1 : 0 }]];
      var edges = [['client', 'app']];
      if (s.breaker) { nodes.push(['cb', 'breaker', { errorThreshold: s.threshold / 100, windowMs: 4000, openMs: 3000, halfOpenProbes: 3 }]); edges.push(['app', 'cb'], ['cb', 'dep']); }
      else edges.push(['app', 'dep']);
      return flaky ? { nodes: nodes, edges: edges, warmS: 5, windowS: 25 }
        : { nodes: nodes, edges: edges, warmS: 20, windowS: 15, events: [{ at: 5, node: 'dep', slow: 6, label: 'Pricing slows' }, { at: 12, node: 'dep', clear: true, label: 'Pricing healthy' }] };
    },
    missions: [
      { observe: true, env: { fault: 'blip' }, fix: { breaker: false, threshold: 50 },
        text: '90 requests a second, each needing one call to a pricing service that can finish about 114. The app retries a failed call twice. From second 5 to second 12 the pricing service runs six times slower; after that it is completely healthy. Only the time after second 20 is measured. Run it.',
        goalText: 'Run it.', goal: function (m) { return m.loss > 90; },
        win: 'The fault lasted 7 seconds and the outage never ended. While pricing was slow every call timed out and was sent three times, so 90 requests a second became about 270 against a service that finishes 114. When the fault cleared it was still buried: its queue was full of calls whose callers had already given up, those timed out too, and each was retried. Nothing is broken any more and nothing works. This is a metastable failure, held in place by the retries.' },
      { env: { fault: 'blip' }, fix: { threshold: 50 }, start: { breaker: false }, solution: { breaker: true },
        text: 'Same fault, same retries. Make the system recover by itself once the fault clears: lose no more than 1 request in 100 after second 20.',
        goalText: 'Lost ≤ 1% after second 20', goal: function (m) { return m.loss <= 1; },
        miss: function () { return 'The pricing service is healthy but still receives about three times what it can finish. Something has to stop the calls for long enough to let it empty its queue.'; },
        win: 'Once half the calls in its window had failed, the breaker opened and the app stopped calling. With nothing arriving, the pricing service emptied its queue. After the cool-down the breaker let three probe calls through, they succeeded, and it closed. Users still saw errors during the 7 seconds of the fault: a breaker protects recovery, and it needs a fallback beside it to protect the user.' },
      { env: { fault: 'flaky' }, fix: { breaker: true }, start: { threshold: 5 }, solution: { threshold: 30 },
        text: 'A different day, and nothing is wrong: this dependency always fails about 1 call in 10 and the app copes. Someone has set the breaker to open at a 5% error rate. Run it, then choose a threshold that leaves a healthy service alone: lose no more than 20% of requests.',
        goalText: 'Lost ≤ 20%', goal: function (m) { return m.loss <= 20; },
        miss: function (m, s) { return 'At ' + s.threshold + '% the breaker still opens on an ordinary day: ' + p1(m.loss) + ' of requests were lost, most of them refused by the breaker itself.'; },
        win: 'At 5% the breaker read normal behaviour as an outage. It opened, probed, closed and opened again, and turned a 10% error rate into more than 90% lost. A threshold belongs clearly above the error rate of a good day and below that of a real outage, and a breaker that has been open for an hour should be paging someone.' }
    ]
  };

  /* ================= 1.9 Rate limiting ================= */
  RIGS.ratelimit = {
    title: 'A token bucket in front of a small server',
    note: 'The app has 8 slots at 40 ms a request, so it can finish 200 a second, and its own queue holds 200. A refused request is answered in microseconds (a 429).',
    layout: [['a', '🏢', 'Tenant A', 0, 0], ['b', '🏠', 'Tenant B', 0, 1], ['rl', '🚦', 'Rate limiter', 1, 0.5, true], ['rla', '🚦', 'Limiter for A', 1, 0, true], ['rlb', '🚦', 'Limiter for B', 1, 1, true], ['app', '🧩', 'App service', 2, 0.5]],
    controls: [
      { k: 'scope', label: 'Buckets', options: [['global', 'One shared bucket'], ['tenant', 'One per tenant']], val: 'global' },
      { k: 'limit', label: 'Refill rate (the limit)', stops: [40, 60, 80, 100, 120, 140, 160, 180, 200, 250, 300], val: 300, show: function (v, s) { return v + ' req/s' + (s.scope === 'tenant' ? ' each' : ''); } },
      { k: 'bucket', label: 'Bucket size', stops: [1, 10, 25, 50, 100, 150, 300, 600, 1000, 2000], val: 2000, show: function (v) { return SD.fmt ? SD.fmt(v) + ' tokens' : v + ' tokens'; }, when: function (s) { return s.env.traffic === 'bursts'; } }
    ],
    chart: [{ label: 'Waiting at the app', unit: '', get: function (v) { return v.nodes.app.queued; } }, { label: 'Arriving from tenants', unit: '/s', get: function (v) { return v.offered; } }],
    tiles: function (m) {
      return [['Tenant A lost', p1(m.routes.a.loss), m.routes.a.loss > 1 ? 'warn' : 'good'], ['Tenant B lost', p1(m.routes.b.loss), m.routes.b.loss > 1 ? 'bad' : 'good']];
    },
    build: function (s) {
      var bursts = s.env.traffic === 'bursts';
      var nodes = [['a', 'client', { rps: bursts ? 60 : 260, timeoutMs: 2000 }], ['b', 'client', { rps: 40, timeoutMs: 2000 }], ['app', 'service', { capacity: 8, serviceMs: 40, serviceCv: 0.5, queueLimit: 200 }]];
      var size = bursts ? s.bucket : s.limit, edges, events = [];
      if (s.scope === 'tenant') {
        nodes.push(['rla', 'ratelimiter', { rateLimitRps: s.limit, burst: size }], ['rlb', 'ratelimiter', { rateLimitRps: s.limit, burst: size }]);
        edges = [['a', 'rla'], ['b', 'rlb'], ['rla', 'app'], ['rlb', 'app']];
      } else {
        nodes.push(['rl', 'ratelimiter', { rateLimitRps: s.limit, burst: size }]);
        edges = [['a', 'rl'], ['b', 'rl'], ['rl', 'app']];
      }
      if (bursts) [6, 16, 26].forEach(function (t) { events.push({ at: t, node: 'a', cfg: { rps: 560 }, label: 'Burst' }, { at: t + 2, node: 'a', cfg: { rps: 60 } }); });
      return { nodes: nodes, edges: edges, events: events, warmS: 5, windowS: bursts ? 30 : 20 };
    },
    missions: [
      { env: { traffic: 'steady' }, fix: { scope: 'global' }, start: { limit: 300 }, solution: { limit: 160 },
        text: 'The app can finish 200 requests a second. Tenant A sends 260 and tenant B sends 40. The limit is 300, so everything is let in. Run it, then lower the limit until what you accept is answered quickly: p99 at most 200 ms, while still answering at least 145 requests a second.',
        goalText: 'p99 ≤ 200 ms and ≥ 145 answered a second', goal: function (m) { return m.p99 != null && m.p99 <= 200 && m.good >= 145; },
        miss: function (m, s) { return m.good < 145 ? 'Fast, but only ' + Math.round(m.good) + ' a second are answered and the app sits half idle. The limit is lower than it needs to be.' : (s.limit >= 200 ? 'The limit lets in at least as much as the app can finish, so the app is still full and everyone it accepts waits in its queue.' : 'Closer. The app is no longer overloaded, but it is so near full that requests still queue.'); },
        win: 'A limiter adds no capacity. It refuses the excess in microseconds so that the rest never queue: at this limit the app runs at about 80% and answers in roughly 100 ms. Note that a limit of 200, exactly what the app can do, was not enough: at 100% busy the queue never empties. Set the limit below capacity, not at it.' },
      { env: { traffic: 'steady' }, start: { scope: 'global', limit: 160 }, solution: { scope: 'tenant', limit: 120 },
        text: 'Now look at who pays. Tenant B sends 40 a second, well inside any fair share, and with one shared bucket it is refused as often as noisy tenant A. Change the limiter so that B loses under 1 request in 100 and p99 stays at or under 200 ms.',
        goalText: 'Tenant B lost ≤ 1% and p99 ≤ 200 ms', goal: function (m) { return m.routes.b.loss <= 1 && m.p99 != null && m.p99 <= 200; },
        miss: function (m, s) { return s.scope === 'global' ? 'A shared bucket cannot tell the tenants apart: whoever arrives when it is empty is refused, and that is B as often as A.' : (m.routes.b.loss > 1 ? 'B sends 40 a second, and its own bucket refills more slowly than that.' : 'B is safe, but the two buckets together now admit more than the app can finish: A alone is allowed ' + s.limit + ' a second.'); },
        win: 'With a bucket each, A\'s excess is refused from A\'s bucket and B never notices. The limits still have to add up: two tenants allowed 160 each could send 320 into an app that finishes 200. This is why limits are keyed by user, API key or IP, and why the shared store has to check and decrement the bucket in one atomic step.' },
      { env: { traffic: 'bursts' }, fix: { scope: 'global', limit: 160 }, start: { bucket: 2000 }, solution: { bucket: 50 },
        text: 'Normal traffic is now 100 a second, well under the limit of 160, but every ten seconds tenant A sends a two-second burst that takes the total to 600 a second. The bucket holds 2,000 tokens, so every burst passes straight through. Run it, then shrink the bucket until p99 is at most 300 ms without refusing more than half of all requests.',
        goalText: 'p99 ≤ 300 ms and lost ≤ 50%', goal: function (m) { return m.p99 != null && m.p99 <= 300 && m.loss <= 50; },
        miss: function (m) { return m.loss > 50 ? 'That bucket is so small it refuses ordinary clumps of traffic, not just the bursts: ' + p1(m.loss) + ' lost.' : 'The bucket still admits more of each burst than the app can absorb, and everyone waits behind it (p99 ' + ms(m.p99) + ').'; },
        win: 'The refill rate sets the long-run average; the bucket size sets how much of a burst gets through at once. A bucket of 2,000 admitted whole bursts, and the app\'s queue turned them into a second of waiting for everybody. A small bucket admits what the app can smooth out and refuses the rest immediately. Size the bucket to the burst the system behind it can absorb.' }
    ]
  };

  /* ================= 1.10 Backpressure ================= */
  RIGS.shed = {
    title: 'An overloaded server and its queue',
    note: 'The server has 10 slots at 50 ms a request, so it can finish 200 a second. Clients give up after one second. Priority-based admission keeps part of its budget for high-priority requests and refuses the others first.',
    layout: [['client', '📱', 'Clients', 0, 0], ['sh', '🚧', 'Admission control', 1, 0, true], ['app', '🧩', 'Server', 2, 0]],
    controls: [
      { k: 'queue', label: 'Most requests that can wait', stops: [0, 10, 25, 50, 100, 200, 400, 1000, 5000], val: 5000, show: function (v) { return SD.fmt ? SD.fmt(v) : String(v); } },
      { k: 'priority', label: 'Priority-based admission', options: ON_OFF, val: false, when: function (s) { return s.env.mix; } },
      { k: 'admit', label: 'Requests admitted a second', stops: [120, 140, 160, 180, 200, 220, 260], val: 260, show: function (v) { return v + ' req/s'; }, when: function (s) { return s.env.mix && s.priority; } }
    ],
    chart: [{ label: 'Waiting at the server', unit: '', get: function (v) { return v.nodes.app.queued; } }, { label: 'Answered in time', unit: '/s', get: function (v) { return v.good; }, ref: 200, refLabel: 'what the server can finish' }],
    tiles: function (m, s) {
      return s.env.mix ? [['Checkouts lost', p1(m.hiLoss), m.hiLoss > 2 ? 'bad' : 'good'], ['Recommendations lost', p1(m.loLoss), '']] : [];
    },
    // 60% of traffic is checkout (high priority). A full queue or a timeout cannot tell the two kinds apart.
    measure: function (m) {
      var f = m.failed, blind = sum(f) - (f.throttled || 0) - (f.deprioritized || 0), hi = 0.6 * m.arrived, lo = 0.4 * m.arrived;
      m.hiLoss = hi ? Math.min(100, 100 * ((f.throttled || 0) + 0.6 * blind) / hi) : 0;
      m.loLoss = lo ? Math.min(100, 100 * ((f.deprioritized || 0) + 0.4 * blind) / lo) : 0;
    },
    build: function (s) {
      var nodes = [['client', 'client', { rps: 300, timeoutMs: 1000 }], ['app', 'service', { capacity: 10, serviceMs: 50, serviceCv: 0.5, queueLimit: s.queue }]], edges;
      if (s.env.mix && s.priority) { nodes.push(['sh', 'loadshedder', { rateLimitRps: s.admit, burst: s.admit, lowPriorityShare: 0.4, priorityReserve: 0.3 }]); edges = [['client', 'sh'], ['sh', 'app']]; }
      else edges = [['client', 'app']];
      return { nodes: nodes, edges: edges, warmS: 5, windowS: 20 };
    },
    missions: [
      { observe: true, env: {}, fix: { queue: 5000 },
        text: '300 requests a second arrive at a server that can finish 200. Clients give up after one second. The queue holds 5,000 requests, "so nothing is dropped". Run it.',
        goalText: 'Run it.', goal: function (m) { return m.good < 20; },
        win: 'The server finished about 200 requests every second, and not one of their callers was still waiting. Each request sat in the queue for longer than the client\'s timeout, so all of the work went to requests that had already been abandoned. Nothing was dropped and everything failed.' },
      { env: {}, start: { queue: 5000 }, solution: { queue: 25 },
        text: 'Make the queue short enough that what you accept is answered in time: p99 at most 500 ms, with at least 60% of requests answered.',
        goalText: 'p99 ≤ 500 ms and lost ≤ 40%', goal: function (m) { return m.p99 != null && m.p99 <= 500 && m.loss <= 40; },
        miss: function (m, s) { return s.queue === 0 ? 'With no queue at all, even a momentary clump of arrivals is refused while slots are about to come free: ' + p1(m.loss) + ' lost.' : m.good < 20 ? 'Still nothing answered in time. ' + s.queue + ' waiting ÷ 200 finished a second is ' + (s.queue / 200) + ' s in the queue, and clients leave after 1 s.' : 'Requests are answered now, but the last one in the queue waits ' + ms(s.queue / 200 * 1000) + ' before it starts.'; },
        win: 'With a short queue the server refuses the excess at once and spends its time on callers who are still there: about 200 a second answered, which is everything it can do. A third of requests are refused either way. The difference is that the other two thirds now succeed. Queue length ÷ service rate is the wait you add: 25 ÷ 200 a second is 125 ms.' },
      { env: { mix: true }, fix: { queue: 50 }, start: { priority: false, admit: 260 }, solution: { priority: true, admit: 180 },
        text: 'Of the 300 requests a second, 180 are checkouts and 120 load a recommendations widget. A full queue refuses them blindly, so a third of checkouts fail. Change admission so that fewer than 2 checkouts in 100 are lost and p99 stays at or under 500 ms.',
        goalText: 'Checkouts lost ≤ 2% and p99 ≤ 500 ms', goal: function (m) { return m.hiLoss <= 2 && m.p99 != null && m.p99 <= 500; },
        miss: function (m, s) { return !s.priority ? 'The queue is full and it cannot tell a checkout from a widget.' : s.admit > 200 ? 'More is admitted than the server can finish, so the queue fills again and refuses blindly (' + p1(m.hiLoss) + ' of checkouts lost).' : 'Fewer requests are admitted than there are checkouts (180 a second), so checkouts are refused too.'; },
        win: 'The admission controller holds part of its budget back for high-priority traffic, so recommendations are refused first and checkouts keep getting in. About as many requests are lost as before. What changed is which ones: the widget is hidden and the order goes through. That is graceful degradation, and it only works while less is admitted than the server can finish.' }
    ]
  };

  /* ================= 1.1 Queues ================= */
  RIGS.spike = {
    title: 'A ten-second spike and the backlog it leaves',
    note: 'The server has 4 slots at 40 ms a request, so it can finish 100 a second. Traffic runs at 80 a second, rises to 130 from second 5 to second 15, then settles at the level you choose. Clients here are patient and wait a full minute.',
    layout: [['client', '📱', 'Clients', 0, 0], ['app', '🧩', 'Server', 1, 0]],
    controls: [
      { k: 'after', label: 'Traffic after the spike', min: 50, max: 100, step: 5, val: 100, show: function (v) { return v + ' req/s'; } },
      { k: 'queue', label: 'Most requests that can wait', stops: [50, 100, 200, 500, UNBOUNDED], val: UNBOUNDED, show: function (v) { return v >= UNBOUNDED ? 'no limit' : String(v); } }
    ],
    chart: [{ label: 'Arriving', unit: '/s', get: function (v) { return v.offered; }, ref: 100, refLabel: 'what the server can finish' }, { label: 'Waiting at the server', unit: '', get: function (v) { return v.nodes.app.queued; } }],
    tiles: function (m) {
      return [['Most waiting at once', String(Math.round(m.peak)), ''], ['Backlog gone', m.clearedAt == null ? 'never' : Math.max(0, m.clearedAt - 15).toFixed(1) + ' s after the spike', m.clearedAt == null ? 'bad' : 'good']];
    },
    measure: function (m) {
      m.peak = 0; m.clearedAt = null;
      m.samples.forEach(function (v) { var q = v.nodes.app.queued; if (q > m.peak) m.peak = q; if (m.clearedAt == null && v.t > 15 && q <= 2) m.clearedAt = v.t; });
      m.endQueue = m.end.nodes.app.queued;
    },
    build: function (s) {
      return {
        nodes: [['client', 'client', { rps: 80, timeoutMs: 60000 }], ['app', 'service', { capacity: 4, serviceMs: 40, serviceCv: 0.5, queueLimit: s.queue }]],
        edges: [['client', 'app']],
        events: [{ at: 5, node: 'client', cfg: { rps: 130 }, label: 'Spike starts' }, { at: 15, node: 'client', cfg: { rps: s.after }, label: 'Spike ends' }], warmS: 0, windowS: 40
      };
    },
    missions: [
      { observe: true, env: {}, fix: { after: 100, queue: UNBOUNDED },
        text: 'A server finishes 100 requests a second. Traffic runs at 80, jumps to 130 for ten seconds, then settles at exactly 100. Before you run it, decide: how many requests are waiting when the spike ends, and how long until they are gone?',
        goalText: 'Run it.', goal: function (m) { return m.endQueue > 150; },
        win: 'About 300 were waiting when the spike ended: (130 − 100) × 10 s. And they are still waiting, because with 100 arriving and 100 finishing there is nothing left over to work the backlog down. Every request now waits about 3 seconds behind it, although the spike is long over and the server is perfectly healthy.' },
      { env: {}, fix: { queue: UNBOUNDED }, start: { after: 100 }, solution: { after: 70 },
        text: 'Find the highest level of traffic after the spike at which the backlog is gone within 10 seconds of the spike ending.',
        goalText: 'Backlog gone within 10 s, with traffic at 65 req/s or more', goal: function (m, s) { return m.clearedAt != null && m.clearedAt <= 26 && s.after >= 65; },
        miss: function (m, s) { return s.after < 65 ? 'That clears it, but traffic does not need to fall that far. Find the highest level that still clears it in 10 s.' : 'Spare capacity is 100 − ' + s.after + ' = ' + (100 - s.after) + ' a second, and 300 are waiting' + (s.after < 100 ? ': that takes ' + Math.round(300 / (100 - s.after)) + ' s.' : ': that never drains.'); },
        win: 'Drain time = backlog ÷ spare capacity. Clearing 300 in 10 seconds needs 30 a second of headroom, so traffic has to fall to 70. At 90 it takes 30 seconds; at 95, a minute. Headroom is what pays off a backlog, which is one reason a server planned to run at 70% recovers and one planned at 95% does not.' },
      { env: {}, fix: { after: 80 }, start: { queue: UNBOUNDED }, solution: { queue: 100 },
        text: 'Traffic returns to 80 after the spike. With no limit on the queue, requests wait up to three seconds, and a real caller would be long gone. Bound the queue so that the slowest answered requests take about a second: p99 at most 1,200 ms, losing no more than 10% of requests.',
        goalText: 'p99 ≤ 1,200 ms and lost ≤ 10%', goal: function (m) { return m.p99 != null && m.p99 <= 1200 && m.loss <= 10; },
        miss: function (m, s) { return 'A queue of ' + (s.queue >= UNBOUNDED ? 'unlimited length' : s.queue) + ' in front of a server that finishes 100 a second lets a request wait ' + (s.queue >= UNBOUNDED ? 'as long as the backlog is deep' : (s.queue / 100) + ' s') + ' before it starts.'; },
        win: 'A queue of 100 in front of a server that finishes 100 a second means nobody waits much more than a second. The price was a couple of hundred requests refused during the spike: refused at once, while the caller could still try elsewhere, instead of answered three seconds late. A bound on the queue is a bound on latency.' }
    ]
  };

  SD.rig = { RIGS: RIGS, start: start, check: check, defaults: defaults, settingsFor: settingsFor, UNBOUNDED: UNBOUNDED };
})(window.SD);
