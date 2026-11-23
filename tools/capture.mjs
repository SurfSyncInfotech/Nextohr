import { chromium } from 'playwright-core';
import fs from 'fs';
const BASE = process.env.BASE || 'http://localhost:5174/';
const logo = 'data:image/svg+xml;base64,' + Buffer.from(fs.readFileSync('../brand/nextohr-logo.svg')).toString('base64');
const override = `window.__NX_LOGO__=${JSON.stringify(logo)};` + fs.readFileSync('brand-override.js', 'utf8');
const routes = [
  ['dashboard', ''], ['approvals', 'approvals'], ['employees', 'people'], ['onboarding', 'onboarding'],
  ['attendance', 'attendance'], ['leave', 'leave'], ['goals', 'goals'], ['reports', 'reports'],
  ['payroll', 'payroll'], ['payroll-run', 'payroll/run'], ['announcements', 'announcements'], ['mail', 'mail'],
  ['assets', 'assets'], ['settings', 'settings'], ['login', 'login'],
];
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
async function run(kind, viewport, dpr) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dpr, colorScheme: 'light', isMobile: kind === 'mobile', hasTouch: kind === 'mobile' });
  await ctx.addInitScript(override);
  const p = await ctx.newPage();
  await p.goto(BASE); await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(1200); // seed, rewrite, reload
  for (const [name, r] of routes) {
    await p.goto(BASE + '#/' + r); await p.waitForTimeout(1300);
    await p.screenshot({ path: `../captures/${kind}/${name}.png` });
  }
  if (kind === 'desktop') {
    // profile of first employee
    await p.goto(BASE + '#/people'); await p.waitForTimeout(900);
    const link = await p.$('text=Aditya Singh');
    if (link) { await link.click(); await p.waitForTimeout(1300); await p.screenshot({ path: '../captures/desktop/profile.png' }); }
    await p.goto(BASE + '#/'); await p.waitForTimeout(1000);
    await p.screenshot({ path: '../captures/desktop/dashboard-full.png', fullPage: true });
    await p.keyboard.press('Control+k'); await p.waitForTimeout(700);
    await p.keyboard.type('pay', { delay: 60 }); await p.waitForTimeout(500);
    await p.screenshot({ path: '../captures/desktop/command-palette.png' });
  }
  await ctx.close();
}
await run('desktop', { width: 1440, height: 900 }, 2);
await run('mobile', { width: 390, height: 844 }, 3);
await b.close();
console.log('captured');
