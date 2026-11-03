import { drawBoiledSprite } from './ink-motion.mjs';

// Ink and object motion are separate scores: steel holds, paper flutters, liquid rises.
export const PROP_SCORE = {
  hotel: { fps: 2.8, ink: .65, behavior: 'the cat vane turns, the sign changes and the cast passes behind the windows' },
  clock: { fps: 3, ink: .55, behavior: 'a one-second hand ticks; a separate pendulum swings' },
  metronome: { fps: 2.4, ink: .6, behavior: 'only the weighted arm moves, then holds in a rest' },
  bell: { fps: 6.5, ink: 1.8, behavior: 'a short button press launches decaying rings' },
  chandelier: { fps: 4.2, ink: .9, behavior: 'the hanging body lags and each candle has its own flame' },
  trolley: { fps: 3.7, ink: 1, behavior: 'arrival travel settles while wheels keep separate rolling ticks' },
  champagne: { fps: 5.6, ink: 1.15, behavior: 'separate bubbles rise through each glass; the table stays put' },
  vinyl: { fps: 3.3, ink: .8, behavior: 'the record turns at 33 1/3rpm; its pencil highlight slips independently' },
  microphone: { fps: 4.8, ink: .8, behavior: 'the grille pulses while its rigid stand and original cable stay put' },
  'do-not-disturb': { fps: 3.5, ink: 1.6, behavior: 'a paper hanger swings on its actual hole and slowly settles' },
  'shoe-tieclip': { fps: 2.2, ink: .5, behavior: 'a metal glint travels along the shoe; the clip does not bob' },
  'rabbit-case': { fps: 3.8, ink: 1.2, behavior: 'a loose spare string curls and the catch gives a small answer' },
  looseleafTicket: { fps: 4.5, ink: 1.4, behavior: 'one stamped admission settles into the perforated paper' },
};
const INK = '#2140d6', CORAL = '#e97780', WINE = '#8e1b2c';
const clamp = v => Math.max(0, Math.min(1, v));
const hash = s => [...s].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619),2166136261)>>>0;
const phaseOf = (id, time, reduced) => reduced ? 0 : (Math.floor(time * PROP_SCORE[id].fps / 1000 + hash(id) % 11) % 3);
const rigCache = new WeakMap();
const RIG_SIZE = { hotel: [960,840], clock: [50,60], metronome: [60,72], bell: [64,58], chandelier: [62,54], microphone: [52,62] };
const makeCanvas = (w,h) => { const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');c.width=w;c.height=h;return c; };
const inside = (x,y,poly) => { let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit; };

function propRig(image,name) {
  if(!RIG_SIZE[name])return null;
  let names=rigCache.get(image);if(!names){names=new Map();rigCache.set(image,names);}if(names.has(name))return names.get(name);
  const W=image.naturalWidth||image.width,H=image.naturalHeight||image.height,[uw,uh]=RIG_SIZE[name],sx=W/uw,sy=H/uh;
  const source=makeCanvas(W,H),sg=source.getContext('2d',{willReadFrequently:true});sg.drawImage(image,0,0);
  const pixels=sg.getImageData(0,0,W,H).data,parts={};
  const select=(id,draw,restore=null,accept=null,pixelFilter=null)=>{
    const mask=makeCanvas(W,H),mg=mask.getContext('2d',{willReadFrequently:true});mg.scale(sx,sy);mg.fillStyle=mg.strokeStyle='#fff';draw(mg);
    const coverage=mg.getImageData(0,0,W,H).data,repair=pixelFilter?coverage.slice():coverage,before=pixels.slice();let x0=W,y0=H,x1=-1,y1=-1;
    if(pixelFilter)for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=(y*W+x)*4;if(coverage[p+3]&&!pixelFilter(before,p,x/sx,y/sy))coverage[p+3]=0;}
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=(y*W+x)*4;if(repair[p+3]&&before[p+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
    if(x1<x0||y1<y0)throw new Error(`Missing ${name} rig part ${id}`);
    const c=makeCanvas(x1-x0+1,y1-y0+1),cg=c.getContext('2d',{willReadFrequently:true}),out=cg.createImageData(c.width,c.height);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const p=(y*W+x)*4,a=repair[p+3]/255;if(!a)continue;const o=((y-y0)*c.width+x-x0)*4;
      out.data[o]=before[p];out.data[o+1]=before[p+1];out.data[o+2]=before[p+2];out.data[o+3]=before[p+3]*coverage[p+3]/255;
      let replacement=-1,zone=restore?.(x/sx,y/sy)||0;
      if(zone)for(const radius of[4,8,12,20,32,48,72,96]){
        for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
          const xx=x+dx*radius,yy=y+dy*radius;if(xx<0||xx>=W||yy<0||yy>=H)continue;const q=(yy*W+xx)*4;
          if(repair[q+3]||before[q+3]<128||restore(xx/sx,yy/sy)!==zone||accept&&!accept(before,q,zone))continue;replacement=q;break;
        }
        if(replacement>=0)break;
      }
      // Thin painted borders may have no preferred colour sample; keep their material opaque.
      if(zone&&replacement<0)for(const radius of[4,8,16,32,64,96]){
        for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
          const xx=x+dx*radius,yy=y+dy*radius;if(xx<0||xx>=W||yy<0||yy>=H)continue;const q=(yy*W+xx)*4;
          if(!repair[q+3]&&before[q+3]>=128&&restore(xx/sx,yy/sy)===zone){replacement=q;break;}
        }
        if(replacement>=0)break;
      }
      if(zone&&replacement<0)replacement=p;
      for(let channel=0;channel<4;channel++)pixels[p+channel]=Math.round(before[p+channel]*(1-a)+(replacement>=0?before[replacement+channel]:0)*a);
    }
    cg.putImageData(out,0,0);return parts[id]={image:c,x:x0,y:y0,w:c.width,h:c.height};
  };
  if(name==='hotel'){
    select('vane',m=>m.fillRect(464,8,94,33));
  }else if(name==='clock'){
    select('second',m=>{m.lineCap='round';m.lineWidth=.65;m.beginPath();m.moveTo(25,24.5);m.lineTo(32,27.8);m.stroke();m.globalCompositeOperation='destination-out';m.beginPath();m.arc(25,24.5,1.05,0,Math.PI*2);m.fill();},()=>1,(d,p)=>d[p]>170&&d[p+1]>145&&d[p+2]>105);
    select('pendulum',m=>{m.lineWidth=1.05;m.beginPath();m.moveTo(25,42);m.lineTo(25,52.2);m.stroke();m.beginPath();m.ellipse(25,53,4.45,4.05,0,0,Math.PI*2);m.fill();});
  }else if(name==='metronome'){
    const face=[[21.8,11],[34.3,11],[42.5,54],[13.5,54]],body=[[19,7],[37,7],[49,62],[9,62]];
    select('arm',m=>{m.lineCap='round';m.lineWidth=1.4;m.beginPath();m.moveTo(28,52);m.lineTo(14,15);m.stroke();m.save();m.translate(18.6,27);m.rotate(-.36);m.fillRect(-2.4,-3.4,4.8,6.8);m.restore();m.globalCompositeOperation='destination-out';m.beginPath();m.arc(28,52,2.65,0,Math.PI*2);m.fill();},(x,y)=>inside(x,y,face)?x>=26.4&&x<=29&&y>=14&&y<=52?3:2:inside(x,y,body)?1:0,(d,p,zone)=>zone===3?d[p]>150&&d[p]>d[p+1]*1.15&&d[p+2]>70:zone===2?d[p]>170&&d[p+1]>145&&d[p+2]>105:d[p+1]>d[p]*1.08&&d[p+1]>d[p+2]*1.02,(d,p,x,y)=>{const dx=x-18.6,dy=y-27,lx=dx*Math.cos(.36)-dy*Math.sin(.36),ly=dx*Math.sin(.36)+dy*Math.cos(.36);return Math.abs(lx)<2.2&&Math.abs(ly)<3.2||d[p+2]>d[p]+3&&d[p+2]>d[p+1]+2;});
  }else if(name==='bell'){
    select('button',m=>{m.beginPath();m.ellipse(32,14,5.85,2.5,0,0,Math.PI*2);m.fill();m.fillRect(29.85,13.5,4.3,8.35);},(x,y)=>y>=20?1:0,(d,p)=>d[p]>130&&d[p+1]>90&&d[p+2]<165);
  }else if(name==='chandelier'){
    for(const[i,[x,y]]of[[9,27],[20,32],[42,32],[53,27]].entries())select(`flame${i}`,m=>{m.beginPath();m.ellipse(x,y-10.3,2.25,3.45,0,0,Math.PI*2);m.fill();});
    select('body',m=>m.fillRect(0,14,uw,uh-14));
  }else if(name==='microphone'){
    select('grille',m=>{m.beginPath();m.roundRect(19.35,6.65,15.3,16.7,5.5);m.fill();},()=>1,(d,p)=>d[p]<130&&d[p+2]>d[p]+35);
  }
  const base=makeCanvas(W,H),bg=base.getContext('2d',{willReadFrequently:true}),data=bg.createImageData(W,H);data.data.set(pixels);bg.putImageData(data,0,0);
  const rig={base,parts,W,H,point:(x,y)=>[x*sx,y*sy],sx,sy};names.set(name,rig);return rig;
}

function movingPart(g,rig,id,phase,ink,{pivot=[0,0],angle=0,dx=0,dy=0,scaleX=1,scaleY=1}={}){
  const p=rig.parts[id];g.save();g.translate(pivot[0]+dx,pivot[1]+dy);g.rotate(angle);g.scale(scaleX,scaleY);
  drawBoiledSprite(g,p.image,[0,0,p.w,p.h],[p.x-pivot[0],p.y-pivot[1],p.w,p.h],{phase,amplitude:ink});g.restore();
}
function line(g, points, color = INK, width = .5, alpha = 1, phase = 0) {
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha *= alpha;
  for(let pass=0;pass<2;pass++){g.beginPath();points.forEach(([x,y],i)=>{const d=Math.sin(i*2.3+phase*2.1+pass)*.18;i?g.lineTo(x+d,y-d):g.moveTo(x+d,y-d)});g.stroke();g.globalAlpha*=.45}g.restore();
}
function ring(g,x,y,r,color=INK,alpha=1,width=.5){g.save();g.strokeStyle=color;g.globalAlpha*=alpha;g.lineWidth=width;g.beginPath();g.ellipse(x,y,r,r,0,0,Math.PI*2);g.stroke();g.restore()}
function sparkle(g,x,y,r,color,phase){line(g,[[x-r,y],[x+r,y]],color,.45,.8,phase);line(g,[[x,y-r],[x,y+r]],color,.45,.8,phase)}

const HOTEL_VANE = [1, .74, .38, .14, -.23, -.59, -.85, -1, -.88, -.67, -.31, -.12, .29, .63, .86, 1];
const HOTEL_SIGNS = [null, 'AFTER HOURS', 'STILL OPEN', 'LATE NIGHT JAZZ'];
const HOTEL_WINDOWS = [
  [[0,'jojo'],[7,'yoyo']],
  [[1,'jojo'],[4,'lyly'],[7,'yoyo']],
  [[4,'lyly'],[8,'yoyo']],
  [[5,'jojo'],[3,'lyly']],
  [[5,'jojo'],[3,'lyly'],[9,'yoyo']],
  [[2,'yoyo'],[6,'lyly']],
];
const HOTEL_LIGHTS = { jojo: CORAL, lyly: '#ade408', yoyo: '#ff5ca0' };
const HOTEL_HEADS = {
  jojo: [.19, 0, .71, .45],
  lyly: [.27, .035, .42, .42],
  yoyo: [.05, 0, .66, .51],
};
const silhouettes = new WeakMap();

function windowSilhouette(image, who) {
  if (silhouettes.has(image)) return silhouettes.get(image);
  const [x, y, w, h] = HOTEL_HEADS[who], sprite = makeCanvas(60, 74);
  const g = sprite.getContext('2d');
  g.drawImage(image, x * image.width, y * image.height, w * image.width, h * image.height, 0, 0, sprite.width, sprite.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#27334d';
  g.fillRect(0, 0, sprite.width, sprite.height);
  silhouettes.set(image, sprite);
  return sprite;
}

function hotelPennant(g, scaleX, phase) {
  g.save();
  g.translate(511, 38);
  g.scale(scaleX, 1);
  line(g, [[-12, 4], [6, 4], [27, 5]], WINE, 5.4, .8, phase);
  g.restore();
}

function drawHotel(g, image, rig, cast, age, phase, ink) {
  const turn = Math.floor(age * 4) % 24;
  const vaneScale = HOTEL_VANE[turn] ?? 1;
  movingPart(g, rig, 'vane', phase, ink, { pivot: rig.point(511, 38), scaleX: vaneScale });
  g.save();
  g.scale(rig.sx, rig.sy);
  hotelPennant(g, vaneScale, phase);
  const sign = HOTEL_SIGNS[Math.floor(age / 4.6) % HOTEL_SIGNS.length];
  if (sign) {
    // A blank strip from the actual nameboard retains the original paper and outline.
    g.drawImage(image, 262 * rig.sx, 523 * rig.sy, 62 * rig.sx, 53 * rig.sy, 260, 523, 428, 53);
    g.fillStyle = '#365784';
    g.font = '41px "Special Elite", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(sign, 474 + (phase - 1) * .7, 553, 412);
  }
  const beat = Math.floor(age / 1.8) % HOTEL_WINDOWS.length;
  for (const [cell, who] of HOTEL_WINDOWS[beat]) {
    const x = 204 + cell % 5 * 120, y = cell < 5 ? 265 : 393;
    const sprite = cast?.[who] && windowSilhouette(cast[who], who);
    g.save();
    g.beginPath();
    // The center and transom bars stay in front of the lit panes.
    for (const [dx, w] of [[0, 32], [35, 32]]) {
      g.rect(x + dx, y, w, 29);
      g.rect(x + dx, y + 32, w, 57);
    }
    g.clip();
    g.globalAlpha *= .62 + ((cell + phase) % 3) * .055;
    g.fillStyle = HOTEL_LIGHTS[who];
    g.fillRect(x, y, 67, 89);
    if (sprite) {
      g.globalAlpha = .82;
      g.drawImage(sprite, x + 3 + ((cell + beat) % 3) * 2, y + 16, 59, 74);
    }
    g.restore();
  }
  g.restore();
}

export function drawMovingProp(g, image, object, time, { reducedMotion = false, age = 99, rest = false, cast } = {}) {
  const { name, x, y, width, rotation = 0 } = object, score = PROP_SCORE[name] || { fps:3, ink:.8 };
  const W=image.naturalWidth||image.width,H=image.naturalHeight||image.height,h=width*H/W;
  // Hold physical poses on each object's own cadence, independently of the display's RAF.
  const t = reducedMotion ? 0 : Math.floor(time*score.fps/1000)/score.fps, phase = PROP_SCORE[name] ? phaseOf(name,time,reducedMotion) : 0;
  g.save(); g.translate(x+width/2,y+h/2); g.rotate(rotation);
  if (reducedMotion) {
    drawBoiledSprite(g,image,[0,0,W,H],[-width/2,-h/2,width,h],{phase:0,amplitude:0});
    if (name === 'hotel') {
      g.translate(-width / 2, -h / 2);
      g.scale(width / 960, h / 840);
      hotelPennant(g, 1, 0);
    }
    g.restore();
    return;
  }
  if(name==='do-not-disturb') { g.translate(0,-h*.25);g.rotate(Math.sin(t*1.5)*.075*(.35+.65*Math.exp(-age*.28)));g.translate(0,h*.25); }
  if(name==='trolley'&&!reducedMotion) g.translate(Math.max(0,1-age/2.6)*-width*.18,Math.sin(t*8)*.22);
  if(name==='vinyl')g.rotate(t*Math.PI*2*33.333/60);
  const rig=propRig(image,name);
  g.translate(-width/2,-h/2);g.scale(width/W,h/H);
  drawBoiledSprite(g,rig?.base||image,[0,0,W,H],[0,0,W,H],{phase,amplitude:score.ink});
  if(rig){
    if(name==='hotel'){
      drawHotel(g,image,rig,cast,Math.max(0,age),phase,score.ink);
    }else if(name==='clock'){
      movingPart(g,rig,'second',phase,score.ink,{pivot:rig.point(25,24.5),angle:Math.floor(t)%60*Math.PI/30-Math.PI/2-Math.atan2(3.3,7)});
      movingPart(g,rig,'pendulum',phase,score.ink,{pivot:rig.point(25,41),angle:Math.sin(t*2.7)*.18});
    }else if(name==='metronome'){
      const angle=rest?-.12:Math.sin(t*Math.PI*2*1.07)*.34;
      movingPart(g,rig,'arm',phase,score.ink,{pivot:rig.point(28,52),angle:angle-Math.PI/2-Math.atan2(-37,-14)});
    }else if(name==='bell'){
      const cycle=t%4.7,hit=cycle<.32?Math.sin(cycle/.32*Math.PI):0;
      movingPart(g,rig,'button',phase,score.ink,{dy:hit*1.2*rig.sy});
    }else if(name==='chandelier'){
      const pivot=rig.point(31,14);g.save();g.translate(...pivot);g.rotate(Math.sin(t*1.15-.22)*.026);g.translate(-pivot[0],-pivot[1]);
      movingPart(g,rig,'body',phase,score.ink);
      for(const[i,[cx,cy]]of[[9,27],[20,32],[42,32],[53,27]].entries())movingPart(g,rig,`flame${i}`,phase,.35,{pivot:rig.point(cx,cy-7.4),angle:Math.sin(t*(3.7+i*.43)+i*2.2)*.06,scaleY:.96+Math.sin(t*(3.7+i*.43)+i*2.2)*.12});
      g.restore();
    }else if(name==='microphone'){
      const pulse=Math.pow(Math.sin(t*.75),4);
      movingPart(g,rig,'grille',phase,.4,{pivot:rig.point(27,15),scaleX:1+pulse*.035,scaleY:1-pulse*.025});
    }
  }
  g.scale(W/100,H/100);
  if(name==='metronome'){
    if(rest) { g.fillStyle=WINE;g.font='italic 6px "Courier Prime"';g.fillText('a rest.',61,82); }
  }else if(name==='bell'){
    const cycle=t%4.7;
    for(let i=0;i<3;i++){const q=(cycle-.12-i*.15)/1.1;if(q<=0||q>=1)continue;const r=22+q*22;g.save();g.globalAlpha=(1-q)*.7;line(g,[[50-r,35-r*.35],[45-r,28-r*.4]],WINE,.7,1,phase);line(g,[[50+r,35-r*.35],[55+r,28-r*.4]],WINE,.7,1,phase);g.restore()}
  }else if(name==='trolley'){
    for(const cx of [21.7,78.3]){const cy=88.3;for(let i=0;i<3;i++){const a=t*4+i*Math.PI/3;line(g,[[cx-Math.cos(a)*4,cy-Math.sin(a)*4],[cx+Math.cos(a)*4,cy+Math.sin(a)*4]],'#ddb45d',.55,.9,phase)}}
    const swing=reducedMotion?0:Math.sin(t*2.7)*2.1;line(g,[[74,26],[75+swing,33]],WINE,.5,1,phase);
  }else if(name==='champagne'){
    for(const [cx,base]of[[31.7,28],[61.7,26]])for(let i=0;i<4;i++){
      const q=(t*.42+i*.27+(cx>40?.15:0))%1,xx=cx+Math.sin(i*1.7+q*4)*2.2,yy=base-q*12;
      ring(g,xx,yy,.45+(1-q)*.25,'#bd8b36',(1-q)*.85,.25);
    }
    const sway=reducedMotion?0:Math.sin(t*2)*.7;line(g,[[24,24+sway],[39,24-sway]],'#d4a54f',.3,.6,phase);
  }else if(name==='microphone'){
    const amount=reducedMotion?0:(.4+.6*Math.pow(Math.sin(t*.75),4));
    for(let i=0;i<3;i++){g.save();g.globalAlpha=amount*(.6-i*.15);g.strokeStyle=INK;g.lineWidth=.4;g.beginPath();g.arc(52,24,17+i*5,-.8,.8);g.stroke();g.restore()}
  }else if(name==='shoe-tieclip'){
    const q=(t*.21)%1;if(q<.45)sparkle(g,28+q*98,42-q*28,2.1,CORAL,phase);
  }else if(name==='rabbit-case'){
    const pts=Array.from({length:25},(_,i)=>[48+i*1.25,33-i*.1+Math.sin(i*.39-t*1.7)*Math.sin(i/24*Math.PI)*2.2]);line(g,pts,INK,.5,.85,phase);
    if(Math.sin(t*.75)>.85)sparkle(g,52,80,2.6,'#c39b46',phase);
  }else if(name==='looseleafTicket'){
    const p=clamp(age/.55),bounce=reducedMotion?0:Math.sin(clamp(age/.75)*Math.PI)*2;
    g.save();g.globalAlpha=p;g.translate(39.7,50-bounce);g.rotate(-.06);g.fillStyle=WINE;g.font='8px "Special Elite"';g.textAlign='center';g.fillText('ONE MORE',0,0);g.font='4px "Courier Prime"';g.fillText('APPROVED / PROBABLY',0,14);g.restore();
  }
  g.restore();
}

export function validatePropScore(){return Object.values(PROP_SCORE).every(s=>s.fps>0&&s.ink>0&&typeof s.behavior==='string')&&new Set(Object.values(PROP_SCORE).map(s=>s.fps)).size>8;}
