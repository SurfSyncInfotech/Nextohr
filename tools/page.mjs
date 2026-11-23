import { chromium } from 'playwright-core';
import fs from 'fs';
const [w, h, tag, dpr] = [+process.argv[2] || 1440, +process.argv[3] || 900, process.argv[4] || 'd', +process.argv[5] || 1];
const out = `page-${tag}`; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 700, hasTouch: w < 700 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:5180/?nointro', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
const H = await p.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = 0; y < H; y += Math.round(h * 0.9)) {
  await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(1300);
  await p.screenshot({ path: `${out}/${String(i++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 72 });
}
const ow = await p.evaluate(() => document.documentElement.scrollWidth);
console.log('height', H, 'shots', i, 'scrollWidth', ow, 'errors:', errs.join(' | ') || 'none');
await b.close();
