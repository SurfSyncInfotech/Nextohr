import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport:{width:1440,height:900} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:5180/', { waitUntil:'domcontentloaded' });
await p.waitForFunction(()=>window.gsap && document.getElementById('introLogo'));
const t0=Date.now();
for (const t of [150,500,800,1100,1400,1750,2100,2500,3100,3900,4300,4700,5600]) {
  const w=t-(Date.now()-t0); if(w>0) await p.waitForTimeout(w);
  await p.screenshot({ path:`intro/t${String(t).padStart(4,'0')}.jpg`, type:'jpeg', quality:70 });
}
console.log(errs.join('\n')||'no errors');
await b.close();
