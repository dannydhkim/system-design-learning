#!/usr/bin/env node
// Offline-copy checks. Run: node tools/check-sw.mjs          (fails, exit 1, when sw.js is out of date)
//                           node tools/check-sw.mjs --write  (brings sw.js up to date)
//
// sw.js lists every file the app needs offline, and a VERSION that fingerprints their contents. An installed copy of
// the app only notices a deploy when sw.js itself changes, so a stale list or VERSION means devices keep running old
// code, or miss a file with no connection. This fails when
//   · a script, stylesheet, icon, the manifest, a card deck or a library loaded on demand (js/vendor/…) is missing from the list
//   · the list names a file that does not exist, or one the app no longer loads
//   · VERSION does not match the contents of the listed files
//   · the manifest or index.html points at an icon that does not exist
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));
const errors = [];
const write = process.argv.includes('--write');

/* ---------- what the app loads ---------- */
const html = read('index.html');
const local = (u) => !/^(https?:|data:|\/\/)/.test(u);
const need = ['./'];
for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) if (local(m[1])) need.push(m[1]);
for (const m of html.matchAll(/<link[^>]*\shref="([^"]+)"/g)) if (local(m[1])) need.push(m[1]);
const manifestFile = (html.match(/<link rel="manifest" href="([^"]+)"/) || [])[1];
if (!manifestFile) errors.push('index.html: no <link rel="manifest">');
else {
  const man = JSON.parse(read(manifestFile));
  for (const i of man.icons || []) need.push(path.posix.join(path.posix.dirname(manifestFile), i.src));
  if (!(man.icons || []).some((i) => i.sizes === '192x192') || !(man.icons || []).some((i) => i.sizes === '512x512')) errors.push(manifestFile + ': install prompts need a 192 and a 512 pixel PNG icon');
  if (man.display !== 'standalone') errors.push(manifestFile + ': display must be "standalone"');
}
// Card decks and anything else the scripts fetch by a literal path.
for (const f of need.filter((f) => f.endsWith('.js'))) {
  if (!exists(f)) continue;
  for (const m of read(f).matchAll(/['"]((?:questions)\/[\w.-]+\.json)['"]/g)) need.push(m[1]);
  for (const m of read(f).matchAll(/['"](js\/vendor\/[\w.-]+\.js)['"]/g)) need.push(m[1]);   // libraries loaded with import()
}
const expected = [...new Set(need)];
for (const f of expected) if (f !== './' && !exists(f)) errors.push(f + ': loaded by the app but the file does not exist');
if (!/navigator\.serviceWorker\.register\('sw\.js'\)/.test(read('js/app.js'))) errors.push('js/app.js: does not register sw.js');

const hash = crypto.createHash('sha256');
for (const f of expected) { hash.update(f + '\0'); hash.update(fs.readFileSync(path.join(root, f === './' ? 'index.html' : f))); hash.update('\0'); }
const version = hash.digest('hex').slice(0, 12);

/* ---------- what sw.js says ---------- */
let sw = read('sw.js');
const vRe = /^const VERSION = '([^']*)';$/m, fRe = /^const FILES = (\[[^\]]*\]);$/m;
if (!vRe.test(sw) || !fRe.test(sw)) { console.error('sw.js: cannot find the VERSION and FILES lines'); process.exit(1); }
if (write) {
  sw = sw.replace(vRe, `const VERSION = '${version}';`).replace(fRe, 'const FILES = [\n' + expected.map((f) => `  '${f}'`).join(',\n') + '\n];');
  fs.writeFileSync(path.join(root, 'sw.js'), sw);
  console.log(`sw.js updated: version ${version}, ${expected.length} files`);
}
const listed = JSON.parse(sw.match(fRe)[1].replace(/'/g, '"'));
for (const f of expected) if (!listed.includes(f)) errors.push('sw.js: ' + f + ' is loaded by the app but not in FILES, so it would be missing offline');
for (const f of listed) if (!expected.includes(f)) errors.push('sw.js: FILES names ' + f + ', which the app does not load');
if (sw.match(vRe)[1] !== version) errors.push(`sw.js: VERSION is '${sw.match(vRe)[1]}' but the files now fingerprint as '${version}'. Installed copies would not pick up the change.`);
if (/skipWaiting\(\)/.test(sw.replace(/addEventListener\('message'[^\n]*/, ''))) errors.push('sw.js: skipWaiting outside the message handler would reload the app under a quiz in progress');

if (errors.length) { errors.forEach((e) => console.error('✗ ' + e)); console.error(`\n${errors.length} problem(s). Run: node tools/check-sw.mjs --write`); process.exit(1); }
console.log(`✓ sw.js lists all ${expected.length} files the app loads; version ${version} matches their contents`);
