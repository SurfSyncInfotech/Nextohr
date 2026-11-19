import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5180/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const vis = (s) => [...document.querySelectorAll(s)].every((e) => { const c = getComputedStyle(e); return c.opacity !== '0' && c.visibility !== 'hidden'; });
  return {
    introGone: !document.documentElement.classList.contains('intro-on'),
    hero: vis('.hero__title, .hero__sub, .hero__frame-wrap, .chip'), steps: vis('.tstep'), cards: vis('.card'),
    t2: vis('.mess__t2'), ring: document.querySelector('.ring__n').textContent, net: document.querySelector('.pay__net b').textContent,
  };
});
console.log(JSON.stringify(r), errs.join('|') || 'no errors');
await b.close();
