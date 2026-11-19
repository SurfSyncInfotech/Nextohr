import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:5180/?nointro', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
for (const y of [3000, 3600, 4200, 4800, 5400]) {
  await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(1200);
  console.log(y, JSON.stringify(await p.evaluate(() => {
    const t = gsap.getTweensOf('.tstep')[0];
    return { p: t && +t.progress().toFixed(2), paused: t && t.paused(), st: t && [t.scrollTrigger.start, t.scrollTrigger.isActive], op: getComputedStyle(document.querySelector('.tstep')).opacity, sy: scrollY };
  })));
}
await b.close();
