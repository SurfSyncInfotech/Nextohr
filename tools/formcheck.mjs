import { chromium } from 'playwright-core';
import fs from 'fs';
fs.mkdirSync('fc', { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const [tag, vp] of [['d', { width: 1440, height: 900 }], ['m', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: tag === 'm', hasTouch: tag === 'm', deviceScaleFactor: tag === 'm' ? 2 : 1 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  const reqs = []; p.on('request', (r) => { if (r.method() === 'POST') reqs.push(r.url()); });
  await p.goto('http://localhost:5180/?nointro', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  // plans
  await p.evaluate(() => document.getElementById('plans').scrollIntoView()); await p.waitForTimeout(400);
  await p.evaluate(() => window.scrollBy(0, 1)); await p.waitForTimeout(1800);
  await p.screenshot({ path: `fc/${tag}-plans1.jpg`, type: 'jpeg', quality: 75 });
  await p.evaluate(() => window.scrollBy(0, innerHeight * .8)); await p.waitForTimeout(1500);
  await p.screenshot({ path: `fc/${tag}-plans2.jpg`, type: 'jpeg', quality: 75 });
  // click White-label "Book a demo" -> scrolls to the form with plan preselected
  await p.click('.pbtn[data-plan="white-label"]'); await p.waitForTimeout(2200);
  const plan = await p.evaluate(() => document.querySelector('input[name=plan]:checked').value);
  await p.screenshot({ path: `fc/${tag}-form.jpg`, type: 'jpeg', quality: 75 });
  // empty submit -> errors
  await p.click('.dform__submit'); await p.waitForTimeout(400);
  const errCount = await p.evaluate(() => [...document.querySelectorAll('.fld__err')].filter((e) => e.textContent).length);
  const focused = await p.evaluate(() => document.activeElement.id);
  await p.screenshot({ path: `fc/${tag}-errors.jpg`, type: 'jpeg', quality: 75 });
  // fill + chips + submit
  await p.fill('#f-name', 'Asha Verma'); await p.fill('#f-company', 'Test Co'); await p.fill('#f-email', 'asha@test.co'); await p.fill('#f-phone', '+91 98765 43210');
  await p.selectOption('#f-size', { index: 2 });
  await p.click('.ch:nth-child(3) span');
  await p.click('.dform__submit'); await p.waitForTimeout(2200);
  const doneShown = await p.evaluate(() => !document.getElementById('demoDone').hidden && document.querySelector('.dn-name').textContent);
  await p.screenshot({ path: `fc/${tag}-done.jpg`, type: 'jpeg', quality: 75 });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(tag, JSON.stringify({ plan, errCount, focused, doneShown, posts: reqs.length, scrollWidth: sw, errs }));
  await ctx.close();
}
await b.close();
