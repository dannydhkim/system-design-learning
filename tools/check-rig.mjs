#!/usr/bin/env node
// Checks for the load-test rigs (js/rig.js). Run: node tools/check-rig.mjs [-v]
//
// Runs every mission on the vendored Breakscale engine, exactly as the browser does, and fails (exit 1) when
//   · a mission that only asks the player to run a fixed setup does not show the failure it describes
//   · a mission can be passed without changing anything, or its listed solution does not pass
//   · any of that differs between seeds 1, 2 and 3, because the lesson must not depend on luck
//   · the same settings and seed give two different results
//   · a topic names a rig that does not exist, or a rig's picture and its topology disagree
// With -v it also prints, for every mission, which values of each free control pass.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('-v');
const sandbox = { console };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const dataFiles = fs.readdirSync(path.join(root, 'js/data')).filter((f) => /^m\d+\.js$/.test(f)).sort().map((f) => 'js/data/' + f);
for (const f of ['js/vendor/breakscale-sim.js', 'js/data/meta.js', 'js/data/sources.js', ...dataFiles, 'js/rig.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}
const SD = sandbox.SD, RIGS = SD.rig.RIGS, SEEDS = [1, 2, 3];
const errors = [];
const show = (m) => `lost ${m.loss.toFixed(1)}% · p99 ${m.p99 == null ? '—' : Math.round(m.p99) + ' ms'} · ${Math.round(m.good)}/s answered`;
const values = (c) => c.options ? c.options.map((o) => o[0]) : c.stops ? c.stops : Array.from({ length: Math.round((c.max - c.min) / c.step) + 1 }, (_, i) => c.min + i * c.step);

/* Every rig a topic uses must exist. */
const used = new Set();
const labsOf = (lab) => !lab ? [] : lab.type === 'seq' ? lab.parts.flatMap(labsOf) : [lab];
for (const t of SD.topics) for (const lab of labsOf(t.lab)) if (lab.type === 'rig') {
  if (!RIGS[lab.rig]) errors.push('topic ' + t.id + ': names a rig that does not exist: ' + lab.rig); else used.add(lab.rig);
}

for (const [id, rig] of Object.entries(RIGS)) {
  const t0 = Date.now();
  console.log('\nrig ' + id + (used.has(id) ? '' : '  (not used by any topic)'));
  const drawn = new Set(rig.layout.map((n) => n[0]));
  const keys = new Set(rig.controls.map((c) => c.k));
  rig.missions.forEach((mission, mi) => {
    const where = 'rig ' + id + ' mission ' + (mi + 1);
    for (const k of Object.keys({ ...mission.fix, ...mission.start, ...mission.solution })) if (!keys.has(k)) errors.push(where + ': sets a control that does not exist: ' + k);
    if (!mission.text || !mission.win || !mission.goalText) errors.push(where + ': needs text, goalText and win');
    if (!mission.observe && !mission.solution) errors.push(where + ': needs a solution (or observe: true)');
    const begin = { ...mission.start };
    // The picture must have a box for everything the topology contains.
    const built = rig.build(SD.rig.settingsFor(rig, mi, { ...begin, ...mission.solution }));
    for (const n of built.nodes) if (!drawn.has(n[0])) errors.push(where + ': topology has a node the picture does not draw: ' + n[0]);
    for (const c of rig.controls) if (!c.options && !c.stops && c.min == null) errors.push(where + ': control ' + c.k + ' has no values');

    for (const seed of SEEDS) {
      const first = SD.rig.check(rig, mi, begin, seed);
      if (mission.observe) {
        if (seed === 1 || !first.passed) console.log('  ' + (mi + 1) + ' observe, seed ' + seed + ': ' + (first.passed ? 'shows it' : 'DOES NOT SHOW IT') + ' · ' + show(first.m));
        if (!first.passed) errors.push(where + ': running it does not show the failure on seed ' + seed + ' (' + show(first.m) + ')');
        continue;
      }
      const solved = SD.rig.check(rig, mi, { ...begin, ...mission.solution }, seed);
      if (seed === 1 || first.passed || !solved.passed) {
        console.log('  ' + (mi + 1) + ' as given, seed ' + seed + ': ' + (first.passed ? 'PASSES (should fail)' : 'fails as intended') + ' · ' + show(first.m));
        console.log('  ' + (mi + 1) + ' solution ' + JSON.stringify(mission.solution) + ', seed ' + seed + ': ' + (solved.passed ? 'pass' : 'FAIL') + ' · ' + show(solved.m));
      }
      if (first.passed) errors.push(where + ': passes without changing anything on seed ' + seed);
      if (!solved.passed) errors.push(where + ': the listed solution does not pass on seed ' + seed + ' (' + show(solved.m) + ')');
      if (mission.miss && !first.passed && typeof mission.miss(first.m, first.s) !== 'string') errors.push(where + ': miss() must return a hint');
    }
    const once = SD.rig.check(rig, mi, begin, 1), again = SD.rig.check(rig, mi, begin, 1);
    if (once.m.loss !== again.m.loss || once.m.p99 !== again.m.p99) errors.push(where + ': the same settings and seed gave two different results');

    if (verbose && !mission.observe) {
      // Which values of each free control pass, holding the others at the solution?
      for (const c of rig.controls) {
        if (mission.fix && c.k in mission.fix) continue;
        const s0 = SD.rig.settingsFor(rig, mi, { ...begin, ...mission.solution });
        if (c.when && !c.when(s0)) continue;
        const row = values(c).map((v) => {
          const ok = SEEDS.map((seed) => SD.rig.check(rig, mi, { ...begin, ...mission.solution, [c.k]: v }, seed).passed);
          return v + (ok.every(Boolean) ? '✓' : ok.some(Boolean) ? '~' : '✗');
        });
        console.log('      ' + c.k + ': ' + row.join('  '));
      }
    }
  });
  console.log('  (' + (Date.now() - t0) + ' ms)');
}

if (errors.length) { console.error('\n' + errors.length + ' error(s):\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('\nRigs OK: ' + Object.keys(RIGS).length + ' rigs, ' + Object.values(RIGS).reduce((n, r) => n + r.missions.length, 0) + ' missions.');
