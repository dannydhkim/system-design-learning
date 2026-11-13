#!/usr/bin/env node
// Load-test checks for every diagram lab that has a `sim` block. Run: node tools/check-hld.mjs [-v]
//
// Runs the same code the browser runs (js/hld.js on the vendored Breakscale engine) and fails (exit 1) when
//   · the reference design does not pass cleanly, on any of three seeds
//   · the same design and seed give two different results, because a verdict has to be repeatable
//   · a design listed under sim.traps passes, because each trap is a mistake the load test exists to catch
//   · a hop, need or part names a component the lab does not offer
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('-v');
const sandbox = { console };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
// Every content file index.html loads, so a diagram lab in a new module is tested without editing this list.
const dataFiles = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(js\/data\/[^"]+)"/g)].map((m) => m[1]);
for (const f of ['js/vendor/breakscale-sim.js'].concat(dataFiles, ['js/hld.js'])) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}
const SD = sandbox.SD, SEEDS = [1, 2, 3];
const errors = [];
const labs = [];
// A diagram lab may be a topic's whole lab or the last part of a multi-part lab (the case studies).
for (const t of SD.topics) for (const p of !t.lab ? [] : t.lab.type === 'seq' ? t.lab.parts : [t.lab]) if (p.type === 'diagram') labs.push(['topic ' + t.id, p]);
for (const b of SD.bosses) for (const p of b.phases) if (p.lab.type === 'diagram') labs.push(['boss ' + b.id, p.lab]);

const design = (nodes, edges) => ({ nodes: Object.fromEntries(nodes.map((n) => [n, true])), edges: Object.fromEntries(edges.map((e) => [e[0] + '>' + e[1], true])) });
const show = (r) => `lost ${r.loss.toFixed(1)}% · p99 ${r.p99 == null ? '—' : Math.round(r.p99) + ' ms'}` + r.checks.slice(2).map((c) => ' · ' + c.label + ' ' + c.text).join('');

for (const [where, lab] of labs) {
  if (!lab.sim) { errors.push(where + ': diagram lab has no sim block, so its design cannot be load-tested'); continue; }
  const offered = new Set([...lab.required, ...Object.keys(lab.decoys || {})]);
  const named = [];
  lab.sim.flows.forEach((f) => { f.hops.forEach((h) => named.push(h[0], h[1], ...(h[2] && h[2].instead ? [].concat(h[2].instead) : []))); named.push(...(f.needs || []), ...(f.aside || [])); });
  named.push(...Object.keys(lab.sim.parts || {}));
  for (const id of named) if (!offered.has(id)) errors.push(where + ': sim names a component the lab does not offer: ' + id);
  for (const id of lab.required) if (!lab.sim.flows.some((f) => (f.needs || []).includes(id) || f.hops.some((h) => h.includes(id)))) errors.push(where + ': required component is on no flow: ' + id);

  const t0 = Date.now();
  console.log('\n' + where);
  for (const seed of SEEDS) {
    const r = SD.hld.check(lab, design(lab.required, lab.edges), seed);
    console.log('  reference, seed ' + seed + ': ' + (r.clean ? 'pass' : 'FAIL') + ' · ' + show(r));
    if (!r.clean) { errors.push(where + ': the reference design does not pass on seed ' + seed + ' (' + show(r) + ')'); r.problems.concat(r.findings).forEach((p) => console.log('      ' + p.text)); }
  }
  const once = SD.hld.check(lab, design(lab.required, lab.edges), 1), again = SD.hld.check(lab, design(lab.required, lab.edges), 1);
  if (once.loss !== again.loss || once.p99 !== again.p99) errors.push(where + ': the same design and seed gave two different results');
  for (const trap of lab.sim.traps || []) {
    const nodes = lab.required.filter((n) => !(trap.drop || []).includes(n)).concat(trap.add || []);
    const edges = lab.edges.filter((e) => nodes.includes(e[0]) && nodes.includes(e[1]) && !(trap.cut || []).some((c) => c[0] === e[0] && c[1] === e[1])).concat(trap.wire || []);
    for (const seed of SEEDS) {
      const r = SD.hld.check(lab, design(nodes, edges), seed);
      if (seed === 1 || r.passed) console.log('  trap "' + trap.name + '", seed ' + seed + ': ' + (r.passed ? 'PASSES (should fail)' : 'fails as intended') + ' · ' + show(r));
      if (seed === 1 && (verbose || r.passed)) r.problems.concat(r.findings).forEach((p) => console.log('      ' + p.text));
      if (r.passed) errors.push(where + ': trap "' + trap.name + '" passes the load test on seed ' + seed);
    }
  }
  console.log('  (' + (Date.now() - t0) + ' ms)');
}

if (errors.length) { console.error('\n' + errors.length + ' error(s):\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('\nLoad tests OK: ' + labs.length + ' diagram labs.');
