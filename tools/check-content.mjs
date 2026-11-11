#!/usr/bin/env node
// Answer-key checks. Run: node tools/check-content.mjs [--links]
//
// Fails (exit 1) when
//   · a built topic is missing from curriculum.md, or a curriculum item in a built module has no topic
//   · a topic or boss has no evidence list, or cites a source that is not in js/data/sources.js
//   · a quiz question does not cite evidence (source keys, or 'calc' when the explanation derives the answer)
//   · a quiz, lab or boss phase is malformed (wrong number of options, bad bucket index, weights not 100…)
// --links additionally requests every source URL and reports the ones that do not answer.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['meta', 'sources', 'm0', 'm1', 'm2', 'bosses']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js/data', f + '.js'), 'utf8'), sandbox, { filename: f + '.js' });
}
const SD = sandbox.SD;
const errors = [], warnings = [];
const err = (where, msg) => errors.push(where + ': ' + msg);
const warn = (where, msg) => warnings.push(where + ': ' + msg);

/* ---------- sources ---------- */
const used = new Set();
for (const [key, s] of Object.entries(SD.sources)) {
  if (!Array.isArray(s) || typeof s[0] !== 'string' || !s[0].trim()) err('source ' + key, 'needs a title');
  if (!/^https:\/\/\S+$/.test(s[1] || '')) err('source ' + key, 'needs an https URL');
}
function checkEvidence(where, ev) {
  if (ev === 'calc') return;
  if (!Array.isArray(ev) || !ev.length) return err(where, 'no evidence — cite source keys, or \'calc\' if the explanation derives the answer');
  for (const k of ev) { if (!SD.sources[k]) err(where, 'unknown source "' + k + '"'); else used.add(k); }
}
function checkRefs(where, refs, min) {
  if (!Array.isArray(refs) || refs.length < min) return err(where, 'needs at least ' + min + ' evidence entries in refs');
  for (const r of refs) {
    if (!SD.sources[r[0]]) err(where, 'refs cite unknown source "' + r[0] + '"'); else used.add(r[0]);
    if (typeof r[1] !== 'string' || r[1].length < 15) err(where, 'ref "' + r[0] + '" must say what it supports');
  }
}

/* ---------- quiz questions ---------- */
function checkQuiz(where, qs, min) {
  if (!Array.isArray(qs) || qs.length < min) return err(where, 'needs at least ' + min + ' quiz questions');
  qs.forEach((q, i) => {
    const w = where + ' quiz #' + (i + 1);
    if (typeof q[0] !== 'string' || q[0].length < 10) err(w, 'missing question');
    if (!Array.isArray(q[1]) || q[1].length !== 4 || new Set(q[1]).size !== 4) err(w, 'needs exactly 4 distinct options (correct one first)');
    if (typeof q[2] !== 'string' || q[2].length < 10) err(w, 'missing explanation');
    checkEvidence(w, q[3]);
    if (Array.isArray(q[1]) && q[1].length === 4) {
      const len = q[1].map((s) => s.length), longest = Math.max(len[1], len[2], len[3]);
      if (len[0] > 60 && len[0] > 1.6 * longest) warn(w, 'correct option is much longer than every distractor (' + len.join('/') + ')');
    }
  });
}

/* ---------- labs ---------- */
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const STATUSES = ['200', '201', '202', '204', '302', '400', '404', '409', '429'];
function checkLab(where, lab) {
  if (!lab) return;
  if (lab.type === 'sort') lab.items.forEach((it) => { if (!(it[1] >= 0 && it[1] < lab.buckets.length)) err(where, 'sort item "' + it[0] + '" has no valid bucket'); });
  if (lab.type === 'pick') { const n = lab.options.filter((o) => o[1]).length; if (n !== lab.want) err(where, 'pick lab wants ' + lab.want + ' but marks ' + n + ' correct'); }
  if (lab.type === 'api') lab.tasks.forEach((t) => {
    if (!lab.paths.includes(t.path)) err(where, 'api task path not offered: ' + t.path);
    if (!METHODS.includes(t.method)) err(where, 'api task method not offered: ' + t.method);
    [].concat(t.status).forEach((st) => { if (!STATUSES.includes(st)) err(where, 'api task status not offered: ' + st); });
  });
  if (lab.type === 'diagram') {
    lab.edges.forEach((e) => e.forEach((id) => { if (!lab.required.includes(id)) err(where, 'diagram edge uses a component that is not required: ' + id); }));
    Object.keys(lab.decoys || {}).forEach((id) => { if (lab.required.includes(id)) err(where, 'diagram decoy is also required: ' + id); });
  }
  if (lab.type === 'estimate' && lab.fixed) lab.fixed.forEach((p) => { if (typeof p.a !== 'number' || !p.how) err(where, 'estimate needs a numeric answer and its working: ' + p.q); });
  if (lab.type === 'quiz') checkQuiz(where, lab.qs, 3);
}

/* ---------- topics vs curriculum ---------- */
const curriculum = {};
for (const line of fs.readFileSync(path.join(root, 'curriculum.md'), 'utf8').split('\n')) {
  const m = line.match(/^- \[.\] (\d+[A-D]?\.\d+) (.+)$/);
  if (m) curriculum[m[1]] = m[2];
}
const builtMods = new Set(SD.topics.map((t) => t.mod));
const seen = new Set();
for (const t of SD.topics) {
  const where = 'topic ' + t.id;
  if (seen.has(t.id)) err(where, 'duplicate id'); seen.add(t.id);
  if (!curriculum[t.id]) err(where, 'is not an item in curriculum.md');
  for (const k of ['title', 'analogy', 'pitfall', 'say']) if (!t[k]) err(where, 'missing ' + k);
  if (!Array.isArray(t.points) || t.points.length < 3) err(where, 'needs at least 3 key points');
  checkRefs(where, t.refs, 2);
  checkQuiz(where, t.quiz, 3);
  (t.cards || []).forEach((c, i) => { if (!c[0] || !c[1]) err(where + ' card #' + (i + 1), 'needs a question and an answer'); });
  if (!t.explain || !Array.isArray(t.explain[1]) || t.explain[1].length < 3) err(where, 'explain needs a rubric');
  checkLab(where + ' lab', t.lab);
}
for (const id of Object.keys(curriculum)) {
  const mod = id.split('.')[0];
  if (builtMods.has(mod) && !seen.has(id)) err('curriculum ' + id, 'is in a built module but has no topic: ' + curriculum[id]);
}

/* ---------- bosses ---------- */
for (const b of SD.bosses) {
  const where = 'boss ' + b.id;
  const total = b.phases.reduce((n, p) => n + p.w, 0);
  if (total !== 100) err(where, 'phase weights sum to ' + total + ', not 100');
  checkRefs(where, b.refs, 2);
  b.phases.forEach((p) => checkLab(where + ' · ' + p.name, p.lab));
}

for (const key of Object.keys(SD.sources)) if (!used.has(key)) warn('source ' + key, 'is never cited');

/* ---------- optional: do the URLs answer? ---------- */
async function checkLinks() {
  const entries = Object.entries(SD.sources);
  let i = 0, dead = 0;
  async function worker() {
    while (i < entries.length) {
      const [key, s] = entries[i++];
      const get = () => fetch(s[1], { redirect: 'follow', signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'Mozilla/5.0 (link check)', accept: 'text/html,application/pdf,*/*' } });
      try {
        const r = await get().catch(() => get());   // one retry: several sources share a host and some hosts throttle bursts
        // 401/403/429 mean "a server is there but refuses robots", which is not a dead link.
        if (!r.ok && ![401, 403, 429].includes(r.status)) { dead++; err('source ' + key, 'URL answered ' + r.status + ': ' + s[1]); }
        else if (!r.ok) warn('source ' + key, 'URL answered ' + r.status + ' to a script (open it in a browser): ' + s[1]);
      } catch (e) { dead++; err('source ' + key, 'URL did not answer (' + (e.cause && e.cause.code || e.name) + '): ' + s[1]); }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log('Checked ' + entries.length + ' source URLs, ' + dead + ' unreachable.');
}
if (process.argv.includes('--links')) await checkLinks();

const nq = SD.topics.reduce((n, t) => n + t.quiz.length, 0);
const cited = SD.topics.reduce((n, t) => n + t.quiz.filter((q) => Array.isArray(q[3])).length, 0);
console.log(SD.topics.length + ' topics · ' + nq + ' quiz questions (' + cited + ' cite sources, ' + (nq - cited) + ' are derived in the explanation) · ' +
  SD.bosses.length + ' bosses · ' + Object.keys(SD.sources).length + ' sources');
if (warnings.length) console.log('\n' + warnings.length + ' warning(s):\n  ' + warnings.join('\n  '));
if (errors.length) { console.error('\n' + errors.length + ' error(s):\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('\nAnswer key OK.');
