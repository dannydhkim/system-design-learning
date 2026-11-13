// Draws the app icons in icons/. Needs Playwright (not a dependency of the app). Run: node tools/make-icons.mjs icons
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2];
// The brand mark "◈" drawn as shapes, so the icon does not depend on a font.
const svg = (size, pad, round) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ee7ff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
<rect width="100" height="100" rx="${round}" fill="#0d1220"/>
<g transform="translate(50 50) scale(${pad}) translate(-50 -50)">
<path d="M50 12 L88 50 L50 88 L12 50 Z" fill="none" stroke="url(#g)" stroke-width="7" stroke-linejoin="round"/>
<path d="M50 34 L66 50 L50 66 L34 50 Z" fill="url(#g)"/></g></svg>`;
const b = await chromium.launch();
for (const [name, size, pad, round] of [['icon-192', 192, 0.9, 18], ['icon-512', 512, 0.9, 18], ['icon-maskable-512', 512, 0.62, 0], ['apple-touch-icon', 180, 0.78, 0]]) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="margin:0;background:transparent">${svg(size, pad, round)}</body>`);
  await p.screenshot({ path: `${out}/${name}.png`, omitBackground: true });
  await p.close();
}
await b.close();
