import fs from 'fs';
const W=1448,H=1086; const b=fs.readFileSync('logo.rgb');
const px=(x,y)=>{const i=(y*W+x)*3;return [b[i],b[i+1],b[i+2]]};
const ink=(p)=>!(p[0]>235&&p[1]>215);
function runs(y){let out=[],s=-1;for(let x=300;x<1170;x++){const v=ink(px(x,y));if(v&&s<0)s=x;if(!v&&s>=0){out.push([s,x-1,Math.round((s+x-1)/2)]);s=-1;}}return out;}
function vruns(x){let out=[],s=-1;for(let y=420;y<640;y++){const v=ink(px(x,y));if(v&&s<0)s=y;if(!v&&s>=0){out.push([s,y-1,Math.round((s+y-1)/2)]);s=-1;}}return out;}
for(const y of [460,503,553,580,600]) console.log('row',y,JSON.stringify(runs(y)));
for(const x of [381,516,742,851,946,988,1031,1093,1120,1135]) console.log('col',x,JSON.stringify(vruns(x)));
