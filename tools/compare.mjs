import { chromium } from 'playwright-core';
import fs from 'fs';
const svg = fs.readFileSync('../brand/nextohr-logo.svg','utf8').replace('<svg ','<svg style="position:absolute;left:296px;top:428px;width:876px;height:212px;opacity:.55" ');
const png = fs.readFileSync('../Nexthr logo.png').toString('base64');
const b = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport:{width:1448,height:1086} });
await p.setContent(`<body style="margin:0"><div style="position:relative"><img src="data:image/png;base64,${png}" style="display:block">${svg}</div></body>`);
await p.screenshot({ path:'cmp.png', clip:{x:290,y:420,width:880,height:230} });
await b.close();
