import fs from 'fs';
const W=1448,H=1086; const b=fs.readFileSync('logo.rgb');
const px=(x,y)=>{const i=(y*W+x)*3;return [b[i],b[i+1],b[i+2]]};
console.log('bg',px(50,50),px(700,300));
const cls=([r,g,bl])=>{ if(r>240&&g>225) return '.'; if(r<130&&g<60) return 'P'; if(r>230&&g>110&&g<175&&bl<140) return 'C'; return 'm';};
// bounding box of non-bg
let x0=W,x1=0,y0=H,y1=0; for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(cls(px(x,y))!=='.'){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
console.log({x0,x1,y0,y1});
// ascii map at step 6
for(let y=y0;y<=y1;y+=5){let s='';for(let x=x0;x<=x1;x+=5)s+=cls(px(x,y));console.log(String(y).padStart(4),s);}
// sample colors
console.log('plum',px(335,560),'coral',px(1035,560),'mid',px(870,600),px(900,560),px(960,520));
