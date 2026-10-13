import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5173';
const outPath = process.argv[3] || 'screenshots/breakscale.png';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
let page;
for (const ctx of contexts) {
  for (const p of ctx.pages()) {
    if (p.url().includes('localhost:5173') || p.url().includes('breakscale')) {
      page = p;
      break;
    }
  }
  if (page) break;
}
if (!page) {
  console.error('No breakscale tab found. Open http://localhost:5173 in Chrome first.');
  console.error('Also make sure Chrome is launched with: --remote-debugging-port=9222');
  process.exit(1);
}
await page.screenshot({ path: outPath, fullPage: false });
console.log(`Screenshot saved to ${outPath}`);
await browser.close();
