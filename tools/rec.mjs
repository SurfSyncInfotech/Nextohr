import { chromium } from 'playwright-core';
import fs from 'fs';
import { execFileSync } from 'child_process';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const [tag, vp, scrollSteps] of [['desktop', { width: 1440, height: 900 }, 70], ['mobile', { width: 390, height: 844 }, 0]]) {
  const dir = `rec-${tag}`; fs.mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: vp, isMobile: tag === 'mobile', hasTouch: tag === 'mobile', deviceScaleFactor: tag === 'mobile' ? 2 : 1 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const n = frames.length; const file = `${dir}/f${String(n).padStart(5, '0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push([file, f.metadata.timestamp]);
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1, maxWidth: vp.width * (tag === 'mobile' ? 2 : 1), maxHeight: vp.height * (tag === 'mobile' ? 2 : 1) });
  await p.goto('http://localhost:5180/');
  await p.waitForTimeout(8000);
  for (let i = 0; i < scrollSteps; i++) { await p.mouse.wheel(0, 90); await p.waitForTimeout(70); }
  if (scrollSteps) await p.waitForTimeout(1500);
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  // concat list with real frame durations
  let list = '';
  for (let i = 0; i < frames.length; i++) {
    const d = i < frames.length - 1 ? Math.max(0.001, frames[i + 1][1] - frames[i][1]) : 0.5;
    list += `file '${frames[i][0].split('/')[1]}'\nduration ${d.toFixed(4)}\n`;
  }
  list += `file '${frames[frames.length - 1][0].split('/')[1]}'\n`;
  fs.writeFileSync(`${dir}/list.txt`, list);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', 'fps=60,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `../previews/nextohr-${tag}-preview.mp4`]);
  console.log(tag, frames.length, 'frames');
}
await b.close();
