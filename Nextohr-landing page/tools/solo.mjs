import { chromium } from 'playwright-core';
import fs from 'fs';
const svg = fs.readFileSync('../brand/nextohr-logo.svg','utf8').replace('<svg ','<svg style="width:880px;display:block" ');
const png = fs.readFileSync('../Nexthr logo.png').toString('base64');
const b = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport:{width:900,height:480} });
await p.setContent(`<body style="margin:0;background:#FEF2EE;padding:10px"><div style="width:880px;height:213px;background:url(data:image/png;base64,${png}) -296px -428px no-repeat"></div>${svg}</body>`);
await p.screenshot({ path:'solo.png' });
await b.close();
