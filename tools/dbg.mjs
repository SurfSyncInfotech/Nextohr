import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport:{width:1440,height:900} });
p.on('console',m=>console.log('console:',m.text()));
await p.addInitScript(()=>{ const t0=performance.now(); window.__log=(m)=>console.log((performance.now()-t0|0)+'ms '+m);
  document.addEventListener('DOMContentLoaded',()=>__log('DCL; intro-on='+document.documentElement.classList.contains('intro-on')));
  addEventListener('load',()=>__log('load'));});
await p.goto('http://localhost:5180/');
for (let i=0;i<8;i++){ await p.waitForTimeout(500); console.log(await p.evaluate(()=>{const i=document.getElementById('intro'); const L=document.getElementById('introLogo'); return (performance.now()|0)+' intro:'+(!!i)+' bg:'+(i?getComputedStyle(i.querySelector('.intro__bg')).transform:'-')+' logo:'+(L?L.style.transform:'-')+' html:'+document.documentElement.className;})); }
await b.close();
