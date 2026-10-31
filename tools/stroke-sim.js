// Stroke quality simulation. Run from the repo root: node tools/stroke-sim.js
// Extracts the engine from index.html, then compares strokes against a supersampled ideal edge.
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const eng=html.split('/*ENGINE-START*/')[1].split('/*ENGINE-END*/')[0];
const {Stroke,TILE}=new Function(eng+';return {Stroke,TILE};')();
const N=TILE;
function target(){const buf=new Uint8Array(N*N);return {buf,T:{get:(tx,ty)=>(tx===0&&ty===0)?E:null}};var E;}
function mkT(){const E={buf:new Uint8Array(N*N),x0:N,y0:N,x1:-1,y1:-1};return {E,T:{get:(tx,ty)=>tx===0&&ty===0?E:null}};}
// ideal: supersampled capsule coverage
function ideal(ax,ay,bx,by,r){const out=new Float32Array(N*N);const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;const SS=6;
 const x0=Math.max(0,Math.floor(Math.min(ax,bx)-r-2)),x1=Math.min(N-1,Math.ceil(Math.max(ax,bx)+r+2)),y0=Math.max(0,Math.floor(Math.min(ay,by)-r-2)),y1=Math.min(N-1,Math.ceil(Math.max(ay,by)+r+2));
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){let c=0;for(let j=0;j<SS;j++)for(let i=0;i<SS;i++){const px=x+(i+.5)/SS,py=y+(j+.5)/SS;let t=((px-ax)*dx+(py-ay)*dy)/L2;t=Math.max(0,Math.min(1,t));const qx=px-ax-dx*t,qy=py-ay-dy*t;if(qx*qx+qy*qy<=r*r)c++;}out[y*N+x]=c/(SS*SS);}return out;}
// old v1 engine: stamped 128px hard mask, bilinear, flow .9 source-over, spacing 12%
const M=128,mask=new Float32Array(M*M);for(let y=0;y<M;y++)for(let x=0;x<M;x++){const u=(x+.5)/M*2-1,v=(y+.5)/M*2-1;mask[y*M+x]=Math.max(0,Math.min(1,(1-Math.hypot(u,v))*M/2));}
function oldStroke(pts,r){const a=new Float32Array(N*N);const dab=(cx,cy)=>{const s=M/(2*r);for(let y=Math.floor(cy-r-1);y<=Math.ceil(cy+r+1);y++)for(let x=Math.floor(cx-r-1);x<=Math.ceil(cx+r+1);x++){if(x<0||y<0||x>=N||y>=N)continue;const lx=(x+.5-cx)*s+M/2-.5,ly=(y+.5-cy)*s+M/2-.5;const ix=Math.floor(lx),iy=Math.floor(ly),fx=lx-ix,fy=ly-iy;const g=(u,v)=>(u<0||v<0||u>=M||v>=M)?0:mask[v*M+u];const sm=(g(ix,iy)*(1-fx)+g(ix+1,iy)*fx)*(1-fy)+(g(ix,iy+1)*(1-fx)+g(ix+1,iy+1)*fx)*fy;const al=sm*.9;const i=y*N+x;a[i]=al+a[i]*(1-al);}};
 let L=pts[0];dab(L.x,L.y);let need=Math.max(.4,2*r*.12);for(let k=1;k<pts.length;k++){const P=pts[k],dx=P.x-L.x,dy=P.y-L.y,d=Math.hypot(dx,dy);let done=0;while(done+need<=d){done+=need;dab(L.x+dx*done/d,L.y+dy*done/d);need=Math.max(.4,2*r*.12);}need-=d-done;L=P;}return a;}
function newStroke(pts,r,pSize){const {E,T}=mkT();const s=new Stroke(T,{size:2*r,opacity:1,pSize:!!pSize,pOpac:false,spacing:.12,rot:'none',mats:[[1,0,0,1]],cx:0,cy:0,tip:{type:'round',hard:1,grain:false}});for(const p of pts)s.add(p.x,p.y,p.p);s.finish();const a=new Float32Array(N*N);for(let i=0;i<N*N;i++)a[i]=E.buf[i]/255;return a;}
function metrics(img,id,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;let se=0,n=0,mx=0;for(let i=0;i<N*N;i++){const v=id[i];if(v<=0.02||v>=0.98)continue;const x=i%N+.5,y=(i/N|0)+.5;const t=((x-ax)*dx+(y-ay)*dy)/L2;if(t<.1||t>.9)continue;const e=Math.abs(img[i]-v);se+=e;n++;if(e>mx)mx=e;}return {mae:se/n,max:mx};}
const sizes=[0.5,1,2,4,8,20,60],angles=[];for(let a=0;a<=90;a+=7.5)angles.push(a);
const rows=[];
for(const r of sizes){let o={mae:0,max:0},w={mae:0,max:0};for(const a of angles){const rad=a*Math.PI/180,len=300;const ax=100.3,ay=400.7,bx=ax+Math.cos(rad)*len,by=ay-Math.sin(rad)*len;const pts=[];for(let d=0;d<=len+1e-9;d+=1.7){pts.push({x:ax+Math.cos(rad)*Math.min(d,len),y:ay-Math.sin(rad)*Math.min(d,len),p:1});}if(pts[pts.length-1].x!==bx)pts.push({x:bx,y:by,p:1});
 const id=ideal(ax,ay,bx,by,r);const m1=metrics(oldStroke(pts,r),id,ax,ay,bx,by),m2=metrics(newStroke(pts,r),id,ax,ay,bx,by);o.mae+=m1.mae/angles.length;o.max=Math.max(o.max,m1.max);w.mae+=m2.mae/angles.length;w.max=Math.max(w.max,m2.max);}
 rows.push([2*r,o.mae,o.max,w.mae,w.max]);}
console.log('diam | old edge err (mean/max) | new edge err (mean/max)');
for(const r of rows)console.log(r[0].toString().padStart(4),'|',(r[1]*100).toFixed(1)+'% /',(r[2]*100).toFixed(0)+'%','|',(r[3]*100).toFixed(1)+'% /',(r[4]*100).toFixed(0)+'%');
// pressure taper: width per cross-section should rise monotonically
{const pts=[];for(let d=0;d<=400;d+=1.3)pts.push({x:50+d,y:256+d*0.37,p:d/400});const img=newStroke(pts,15,true);let prev=0,rev=0,steps=0;for(let k=20;k<380;k+=2){const cx=50+k,cy=256+k*.37;let sum=0;const nx=-.37/Math.hypot(1,.37),ny=1/Math.hypot(1,.37);for(let s=-20;s<=20;s+=.25){const x=cx+nx*s,y=cy+ny*s;const ix=Math.floor(x-.5),iy=Math.floor(y-.5),fx=x-.5-ix,fy=y-.5-iy;const g=(u,v)=>img[v*N+u];sum+=.25*((g(ix,iy)*(1-fx)+g(ix+1,iy)*fx)*(1-fy)+(g(ix,iy+1)*(1-fx)+g(ix+1,iy+1)*fx)*fy);}if(sum<prev-0.02)rev++;steps++;prev=sum;}console.log('pressure taper: width reversals',rev,'of',steps,'samples');}
// timing
{const t0=Date.now();const pts=[];for(let d=0;d<=400;d+=1.5)pts.push({x:56+d,y:256+Math.sin(d/40)*60,p:1});for(let i=0;i<10;i++)newStroke(pts,40);console.log('400px stroke, 80px brush:',((Date.now()-t0)/10).toFixed(1),'ms');}
