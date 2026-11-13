#!/usr/bin/env node
// Interview deck checks. Run: node tools/check-deck.mjs [--links]
//
// Fails (exit 1) when, in questions/ml-interview-deck.json,
//   · a card has no id, question or answer, repeats an id, or belongs to a section the deck does not define
//   · a knowledge card (every section except DIVE, which holds prompts about your own work) cites no source,
//     or cites one the deck does not list
//   · a DIVE card (prompts about your own work, which need no source) cites a source the deck does not list
//   · a card's "verified" field is not a date (YYYY-MM-DD), or is set on a card that cites no source
//   · a source has no title or no https URL, or is cited by no card
//   A source is [title, url] or [title, url, read_at]: read_at is the copy whose text the cards were checked against, when the
//   url is a publisher page that could not be read (a paywall, say).
// --links also requests every source URL and reports the ones that do not answer. An answer of 503 whose body is
// "upstream connect error ..." comes from this machine's network proxy, not the site: it is reported as unreachable from
// here, not as dead.
// Note what this does not check: that a card's claims match its sources. A card's "verified" date records the day its
// answer and probe were compared with the text of its cited sources; cards without it have not been checked.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(root, 'questions/ml-interview-deck.json'), 'utf8'));
const errors = [], seen = new Set(), used = new Set();
for (const c of d.cards) {
  const w = 'card ' + (c.id || '?');
  if (!c.id || seen.has(c.id)) errors.push(w + ': missing or repeated id');
  seen.add(c.id);
  if (!c.question || !c.answer) errors.push(w + ': needs a question and an answer');
  if (!d.sections[c.topic]) errors.push(w + ': unknown section ' + c.topic);
  for (const k of c.refs || []) { if (!d.sources[k]) errors.push(w + ': cites unknown source "' + k + '"'); else used.add(k); }
  if (c.verified !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(c.verified) || !(c.refs || []).length)) errors.push(w + ': "verified" must be a date and needs cited sources');
  if (c.topic === 'DIVE') continue;
  if (!Array.isArray(c.refs) || !c.refs.length) errors.push(w + ': cites no source');
}
for (const [k, s] of Object.entries(d.sources)) {
  if (!s[0] || !/^https?:\/\/\S+$/.test(s[1] || '')) errors.push('source ' + k + ': needs a title and a URL');
  if (!used.has(k)) errors.push('source ' + k + ': cited by no card');
}
for (const s of d.order || []) if (!d.sections[s]) errors.push('order names unknown section ' + s);

if (process.argv.includes('--links')) {
  let dead = 0; const unreachable = [];
  await Promise.all(Object.entries(d.sources).map(async ([k, s]) => {
    try {
      const r = await fetch(s[1], { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (link check)' } });
      if (r.status === 503 && /^upstream connect error/.test(await r.text().catch(() => ''))) { unreachable.push(k + ': ' + s[1]); return; }
      if (!r.ok && ![401, 403, 429].includes(r.status)) { dead++; errors.push('source ' + k + ': URL answered ' + r.status + ': ' + s[1]); }
    } catch (e) { dead++; errors.push('source ' + k + ': URL did not answer (' + (e.cause && e.cause.code || e.name) + '): ' + s[1]); }
  }));
  const n = Object.keys(d.sources).length;
  console.log(`links: ${n - dead - unreachable.length} of ${n} answered` + (unreachable.length ? `; ${unreachable.length} could not be reached from this machine (its proxy could not connect), so they were not checked:\n  ` + unreachable.join('\n  ') : ''));
}
if (errors.length) { errors.forEach((e) => console.error('✗ ' + e)); console.error(`\n${errors.length} problem(s)`); process.exit(1); }
const know = d.cards.filter((c) => c.topic !== 'DIVE'), checked = know.filter((c) => c.verified);
console.log(`✓ deck: ${d.cards.length} cards in ${Object.keys(d.sections).length} sections; every knowledge card cites a listed source (${Object.keys(d.sources).length} sources)` +
  `\n  ${checked.length} of ${know.length} knowledge cards have been checked against the text of their sources (field "verified")` +
  (checked.length < know.length ? '; the rest have not: ' + know.filter((c) => !c.verified).map((c) => c.id).join(' ') : ''));
