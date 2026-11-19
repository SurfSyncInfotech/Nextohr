import { chromium } from 'playwright-core';
import fs from 'fs';
const png = fs.readFileSync('../Nexthr logo.png').toString('base64');
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1448, height: 1086 } });
await p.goto('http://localhost:5180/?nointro', { waitUntil: 'networkidle' });
// Build a test page from the live site's own logo markup: the <symbol> (nav/footer) and the intro SVG in its final state.
await p.evaluate((png) => {
  const sym = document.getElementById('nx-logo').outerHTML.replace('<symbol', '<g').replace('</symbol>', '</g>');
  const defs = document.querySelector('svg[width="0"] defs').cloneNode(true); defs.querySelector('symbol')?.remove();
  document.body.innerHTML = `
    <div style="position:relative;width:1448px;height:1086px;background:url(data:image/png;base64,${png})">
      <svg viewBox="0 0 1448 1086" style="position:absolute;inset:0;opacity:.5">${defs.outerHTML}${sym}</svg>
    </div>`;
  document.body.style.margin = '0';
}, png);
await p.screenshot({ path: 'logo-site.png', clip: { x: 290, y: 420, width: 880, height: 230 } });
// intro final state
await p.goto('http://localhost:5180/', { waitUntil: 'networkidle' });
await p.evaluate(() => {
  const L = document.getElementById('introLogo').cloneNode(true);
  L.querySelectorAll('path,circle,ellipse').forEach((e) => { e.style.transform = ''; e.removeAttribute('transform'); }); L.querySelectorAll('.ix').forEach((e) => { e.style.strokeDashoffset = 0; e.style.strokeDasharray = 'none'; });
  L.querySelector('.d-h').style.opacity = 1; L.querySelector('.d-glow').remove(); L.querySelector('.ix-seed').remove();
  L.setAttribute('viewBox', '0 0 1448 1086'); L.setAttribute('style', 'position:absolute;inset:0;opacity:.5;width:1448px;height:1086px');
  window.__svg = L.outerHTML;
});
const svg = await p.evaluate(() => window.__svg);
const p2 = await b.newPage({ viewport: { width: 1448, height: 1086 } });
await p2.setContent(`<body style="margin:0"><div style="position:relative;width:1448px;height:1086px;background:url(data:image/png;base64,${png})">${svg}</div></body>`);
await p2.screenshot({ path: 'logo-intro.png', clip: { x: 290, y: 420, width: 880, height: 230 } });
await b.close();
console.log('ok');
