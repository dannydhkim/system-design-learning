#!/usr/bin/env node
// Answer-position checks. Run: node tools/check-shuffle.mjs
//
// The data files list the correct option first. This runs the real quiz code (js/labs.js on a stand-in DOM) and
// fails (exit 1) when
//   · a question's correct option does not turn up in all four positions, or favours one, over 200 draws
//   · across all questions the four positions are not used equally often
//   · the questions of a quiz always come in the same order, or a "pick" lab always lists its options the same way
//   · any code draws a question's options without shuffling them
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const errors = [];
const err = (where, msg) => errors.push(where + ': ' + msg);

/* ---------- a DOM just large enough for SD.h and the quiz ---------- */
function node(tag) {
  const el = {
    nodeType: 1, tag, children: [], attrs: {}, on: {}, style: {}, className: '', disabled: false, value: '',
    appendChild(c) { el.children.push(c); c.parent = el; return c; },
    removeChild(c) { el.children.splice(el.children.indexOf(c), 1); return c; },
    remove() { if (el.parent) el.parent.removeChild(el); },
    get firstChild() { return el.children[0] || null; },
    setAttribute(k, v) { el.attrs[k] = v; }, getAttribute(k) { return el.attrs[k]; },
    addEventListener(t, f) { el.on[t] = f; },
    click() { if (!el.disabled && el.on.click) el.on.click.call(el, {}); },
    focus() {}, contains() { return true; },
    classList: { add(c) { el.className += ' ' + c; }, remove() {}, toggle() {}, contains(c) { return (' ' + el.className + ' ').includes(' ' + c + ' '); } },
    get textContent() { return el.children.map((c) => c.textContent).join(''); },
    set textContent(v) { el.children = [{ nodeType: 3, textContent: String(v) }]; }
  };
  return el;
}
const find = (el, cls) => { if (el.nodeType !== 1) return null; if ((' ' + el.className + ' ').includes(' ' + cls + ' ')) return el; for (const c of el.children) { const r = find(c, cls); if (r) return r; } return null; };
const store = {};
const env = {
  console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  location: { protocol: 'http:', hash: '' }, navigator: {},
  document: { addEventListener() {}, visibilityState: 'visible', body: node('body'), activeElement: null, getElementById: () => node('div'), createElement: node, createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }), createElementNS: (ns, t) => node(t) },
  matchMedia: () => ({ matches: true }),
  fetch: () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
};
env.window = env; env.addEventListener = () => {};
vm.createContext(env);
const scripts = [...read('index.html').matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
for (const f of scripts.filter((f) => /js\/data\/|js\/core\.js|js\/labs\.js/.test(f))) vm.runInContext(read(f), env, { filename: f });
const SD = env.SD, L = SD.labs;
// The quiz pays XP and records hits; neither matters here.
SD.hit = SD.award = SD.save = () => {};

/* ---------- 1. where the correct option lands ---------- */
const DRAWS = 200, total = [0, 0, 0, 0];
function drawPosition(q) {
  const el = node('div');
  L.quiz(el, { qs: [q] }, { onDone() {} });
  const btns = find(el, 'opts').children, texts = btns.map((b) => b.textContent);
  if (texts.slice().sort().join('\n') !== q[1].slice().sort().join('\n')) return -1;
  return texts.indexOf(q[1][0]);
}
const quizzes = [];
SD.topics.forEach((t) => { quizzes.push(['topic ' + t.id, t.quiz]); const parts = !t.lab ? [] : t.lab.type === 'seq' ? t.lab.parts : [t.lab]; parts.forEach((p) => { if (p.type === 'quiz') quizzes.push(['topic ' + t.id + ' lab', p.qs]); }); });
SD.bosses.forEach((b) => b.phases.forEach((p) => { if (p.lab.type === 'quiz') quizzes.push(['boss ' + b.id + ' · ' + p.name, p.lab.qs]); }));
let nq = 0;
for (const [where, qs] of quizzes) qs.forEach((q, i) => {
  nq++;
  const seen = [0, 0, 0, 0];
  for (let d = 0; d < DRAWS; d++) { const p = drawPosition(q); if (p < 0) return err(where + ' quiz #' + (i + 1), 'the options shown are not the four options in the data'); seen[p]++; total[p]++; }
  // With a fair shuffle each position gets 25% ± 3%. Under 10% or over 40% in 200 draws does not happen by chance.
  if (seen.some((c) => c < DRAWS * 0.1 || c > DRAWS * 0.4)) err(where + ' quiz #' + (i + 1), 'correct option landed in positions 1–4 ' + seen.join('/') + ' times out of ' + DRAWS);
});
const n = total.reduce((a, b) => a + b, 0), chi = total.reduce((s, c) => s + (c - n / 4) ** 2 / (n / 4), 0);
if (chi > 25) err('all quizzes', 'positions are not used equally: ' + total.join('/') + ' (chi-square ' + chi.toFixed(1) + ', limit 25)');

/* ---------- 2. the order of the questions ---------- */
const five = quizzes.find((x) => x[1].length >= 4);
const firsts = new Set();
for (let d = 0; d < DRAWS; d++) { const el = node('div'); L.quiz(el, { qs: five[1] }, { onDone() {} }); firsts.add(find(el, 'question').textContent); }
if (firsts.size !== five[1].length) err(five[0], 'only ' + firsts.size + ' of its ' + five[1].length + ' questions ever came first in ' + DRAWS + ' attempts');

/* ---------- 3. "pick" labs ---------- */
let picks = 0;
const pickLabs = [];
SD.topics.forEach((t) => (!t.lab ? [] : t.lab.type === 'seq' ? t.lab.parts : [t.lab]).forEach((p) => { if (p.type === 'pick') pickLabs.push(['topic ' + t.id, p]); }));
SD.bosses.forEach((b) => b.phases.forEach((p) => { if (p.lab.type === 'pick') pickLabs.push(['boss ' + b.id, p.lab]); }));
for (const [where, lab] of pickLabs) {
  picks++;
  const orders = new Set(), firstGood = [0, 0];
  for (let d = 0; d < DRAWS; d++) {
    const el = node('div'); L.pick(el, lab, { onDone() {} });
    const texts = find(el, 'opts').children.map((b) => b.textContent);
    orders.add(texts.join('\n')); firstGood[lab.options.find((o) => o[0] === texts[0])[1] ? 0 : 1]++;
  }
  const share = lab.want / lab.options.length;
  if (orders.size < DRAWS * 0.9) err(where + ' pick lab', 'its options came out in only ' + orders.size + ' different orders in ' + DRAWS + ' attempts');
  if (Math.abs(firstGood[0] / DRAWS - share) > 0.2) err(where + ' pick lab', 'a good option was listed first ' + firstGood[0] + ' times in ' + DRAWS + '; expected about ' + Math.round(share * DRAWS));
}

/* ---------- 4. no code path draws options unshuffled ---------- */
for (const f of scripts.filter((f) => /^js\/[a-z]+\.js$/.test(f))) {
  const src = read(f);
  for (const m of src.matchAll(/q\[1\]\.(map|forEach|slice)\(/g)) {
    if (src.slice(Math.max(0, m.index - 8), m.index) !== 'shuffle(') err(f, 'draws a question\'s options without shuffle() near: ' + src.slice(m.index, m.index + 60));
  }
  if (/\.sort\(\s*function\s*\(\s*\)\s*\{\s*return\s+(0\.5\s*-\s*Math\.random|Math\.random\(\)\s*-\s*0\.5)/.test(src)) err(f, 'shuffles with sort(() => Math.random() - 0.5), which is biased; use SD.shuffle');
}

console.log(nq + ' quiz questions × ' + DRAWS + ' draws: correct option shown in position 1/2/3/4 ' + total.map((c) => (100 * c / n).toFixed(1) + '%').join(' / ') +
  ' · question order varies · ' + picks + ' pick labs reshuffle');
if (errors.length) { console.error('\n' + errors.length + ' error(s):\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('\nAnswer positions OK.');
