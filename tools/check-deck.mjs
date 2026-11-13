#!/usr/bin/env node
// Interview deck checks. Run: node tools/check-deck.mjs [--links]
//
// Fails (exit 1) when, in questions/ml-interview-deck.json,
//   · a card has no id, question or answer, repeats an id, or belongs to a section the deck does not define
//   · a knowledge card (every section except DIVE, which holds prompts about your own work) cites no source,
//     or cites one the deck does not list
//   · a source has no title or no https URL, or is cited by no card
// --links also requests every source URL and reports the ones that do not answer.
// Note what this does not check: that a card's claims match its sources. The deck's "verified" flag records that.
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
  if (c.topic === 'DIVE') continue;
  if (!Array.isArray(c.refs) || !c.refs.length) errors.push(w + ': cites no source');
  for (const k of c.refs || []) { if (!d.sources[k]) errors.push(w + ': cites unknown source "' + k + '"'); else used.add(k); }
}
for (const [k, s] of Object.entries(d.sources)) {
  if (!s[0] || !/^https?:\/\/\S+$/.test(s[1] || '')) errors.push('source ' + k + ': needs a title and a URL');
  if (!used.has(k)) errors.push('source ' + k + ': cited by no card');
}
for (const s of d.order || []) if (!d.sections[s]) errors.push('order names unknown section ' + s);

if (process.argv.includes('--links')) {
  let dead = 0;
  await Promise.all(Object.entries(d.sources).map(async ([k, s]) => {
    try {
      const r = await fetch(s[1], { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (link check)' } });
      if (!r.ok && ![401, 403, 429].includes(r.status)) { dead++; errors.push('source ' + k + ': URL answered ' + r.status + ': ' + s[1]); }
    } catch (e) { dead++; errors.push('source ' + k + ': URL did not answer (' + (e.cause && e.cause.code || e.name) + '): ' + s[1]); }
  }));
  console.log(`links: ${Object.keys(d.sources).length - dead} of ${Object.keys(d.sources).length} answered`);
}
if (errors.length) { errors.forEach((e) => console.error('✗ ' + e)); console.error(`\n${errors.length} problem(s)`); process.exit(1); }
console.log(`✓ deck: ${d.cards.length} cards in ${Object.keys(d.sections).length} sections; every knowledge card cites a listed source (${Object.keys(d.sources).length} sources)` + (d.verified ? '' : '\n  note: the deck is marked verified: false — its sources have not yet been compared with the cards'));
