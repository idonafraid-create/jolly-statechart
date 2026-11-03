import { drawFeedbackArt, loadFeedbackArt } from './feedback-art.mjs';
import { drawBoiledSprite, inkPhase } from './ink-motion.mjs';

const ASSET = '/jolly-statechart/assets/record-player/';
const FRAME_NAMES = ['hotel-curtain', 'hotel-needle', 'hotel-top-view', 'hotel-drive', 'hotel-arrow', 'hotel-side-view', 'hotel-side-b'];
// Each cel has its own horn lip, outward axis, and mark size.
const HORN_PORTS = [
  [.099, .210, -2.92, .081],
  [.005, .217, -3.00, .101],
  [.017, .218,  2.91, .104],
  [.024, .215, -3.06, .099],
  [.024, .215, -2.94, .098],
  [.969, .220,  -.19, .103],
  [.026, .217, -3.04, .101],
];
const GEAR_PORTS = [
  [.131,.583], [.129,.584], [.106,.630], [.131,.584],
  [.128,.583], [.112,.631], [.129,.584],
];
const HOLDS = [900, 850, 1200, 950, 1000, 1300, 1700];
const DURATION = HOLDS.reduce((sum, n) => sum + n, 0);
const CAPTIONS = ['The curtain checks in.', 'One bell. No wake-up call.', 'The night has another side.', 'The hotel runs on borrowed rhythm.', 'One arrow has checked out.', 'Guests quietly check out.', 'Side B is tomorrow.'];
const RECORD_IDS=new Set(['jojo-rest','lyly-lines','yoyo-bite']);
const HAS_HAN=/[\u3400-\u9fff]/u;
let chineseRecordFonts;
const prepareRecordFonts=record=>{
  if(record.labelFont!=='Huiwen Mincho')return Promise.resolve();
  return chineseRecordFonts??=(Promise.all([
    document.fonts.load('30px "Huiwen Mincho"',record.label),
    document.fonts.load('15px "Zhuque Fangsong"',record.label),
  ]).then(groups=>{if(groups.some(faces=>!faces.length||faces.some(face=>face.status!=='loaded')))throw new Error('The local Chinese record fonts must load before drawing the label.');}).catch(error=>{chineseRecordFonts=undefined;throw error;}));
};
const raster=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const imageLoads=new Map(),machineRigs=new WeakMap();
const MACHINE_INK={base:[2.6,.24],needle:[4.2,.34],facade:[2.1,.22],cap:[2.6,.15],disc:[3.3,.16]};
const partPhase=(time,part)=>Math.floor(time*MACHINE_INK[part][0])%3;
const machineInkKey=time=>[Math.floor(time*20/3),...Object.keys(MACHINE_INK).map(part=>partPhase(time,part))].join(':');
const loadImage=name=>{
  if(!imageLoads.has(name))imageLoads.set(name,(async()=>{const image=new Image();image.src=`${ASSET}${name}.webp`;await image.decode();return image;})());
  return imageLoads.get(name);
};
const storyCels = new Map();
function loadStoryCel(index) {
  if (!storyCels.has(index)) storyCels.set(index, loadImage(FRAME_NAMES[index]).then(image => {
    const ratio = Math.min(1, 1024 / image.naturalWidth);
    const frame = raster(Math.round(image.naturalWidth * ratio), Math.round(image.naturalHeight * ratio));
    frame.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0, frame.width, frame.height);
    return { image, frame };
  }));
  return storyCels.get(index);
}
const drawInk=(g,image,x,y,part,time,reduced,w=image.width,h=image.height)=>{
  drawBoiledSprite(g,image,[0,0,image.width,image.height],[x,y,w,h],{phase:reduced?0:partPhase(time,part),amplitude:reduced?0:MACHINE_INK[part][1]});
};
const warmMachine=(rig,g)=>rig.warm??=(async()=>{
  for(const[part,image]of[['base',rig.base],['needle',rig.needle.image],['facade',rig.facade.image],['cap',rig.cap.image]]){
    drawInk(g,image,0,0,part,0,false,1,1);await new Promise(resolve=>setTimeout(resolve,0));
  }
  rig.inkReady=true;
})();

function machineRig(source){
  if(machineRigs.has(source))return machineRigs.get(source);
  const W=source.naturalWidth||source.width,H=source.naturalHeight||source.height,sx=W/1312,sy=H/1199;
  const plate=new Path2D();plate.ellipse(690,531,426,174,0,0,Math.PI*2);
  const joint=new Path2D();joint.ellipse(1198,329,34,38,0,0,Math.PI*2);
  const front=new Path2D();front.rect(0,718,1312,481);
  [[619,713],[619,695],[658,687],[658,677],[683,673],[684,661],[730,660],[733,674],[758,673],[760,686],[784,685],[788,694],[817,694],[817,718]].forEach(([x,y],i)=>i?front.lineTo(x,y):front.moveTo(x,y));front.closePath();
  // Follow both edges of the curved brass arm, including its dark lower side.
  // A narrow centre-line mask leaves that side behind when the bell is lifted.
  const arm=new Path2D();arm.moveTo(1172,277);arm.bezierCurveTo(1154,274,1140,285,1122,296);arm.lineTo(1039,348);arm.bezierCurveTo(1019,362,1005,379,1005,401);arm.bezierCurveTo(1001,423,1001,441,989,457);arm.lineTo(1026,469);arm.bezierCurveTo(1041,453,1043,434,1047,417);arm.bezierCurveTo(1050,405,1056,399,1062,395);arm.bezierCurveTo(1084,378,1107,365,1122,355);arm.bezierCurveTo(1135,350,1143,348,1152,356);arm.lineTo(1173,360);arm.lineTo(1187,296);arm.bezierCurveTo(1184,283,1178,279,1172,277);arm.closePath();
  const knob=new Path2D();knob.ellipse(985,415,23,10,0,0,Math.PI*2);
  const neck=new Path2D();neck.rect(977,420,20,25);
  const collar=new Path2D();collar.ellipse(985,445,20,8,0,0,Math.PI*2);
  const stem=new Path2D();stem.rect(973,445,28,22);
  const bell=new Path2D();bell.moveTo(980,455);bell.bezierCurveTo(946,456,926,477,920,499);bell.bezierCurveTo(910,515,912,531,923,544);bell.bezierCurveTo(946,558,1039,563,1065,541);bell.bezierCurveTo(1071,529,1063,515,1059,507);bell.bezierCurveTo(1053,478,1027,456,998,455);bell.closePath();
  const tip=new Path2D();tip.moveTo(976,547);tip.lineTo(994,547);tip.lineTo(989,570);tip.lineTo(984,582);tip.lineTo(980,570);tip.closePath();
  const layer=(paths,box,subtract)=>{
    const x=Math.floor(box[0]*sx),y=Math.floor(box[1]*sy),w=Math.ceil(box[2]*sx),h=Math.ceil(box[3]*sy),mask=raster(w,h),m=mask.getContext('2d');
    m.translate(-x,-y);m.scale(sx,sy);
    // Paint sub-parts separately: opposite path windings must not punch holes
    // where the bell neck overlaps the curved arm.
    for(const path of Array.isArray(paths)?paths:[paths])m.fill(path);
    if(subtract){m.globalCompositeOperation='destination-out';m.fill(subtract);}
    const c=raster(w,h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(source,-x,-y);g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);return{image:c,mask,x,y};
  };
  const needle=layer([arm,knob,neck,collar,stem,bell,tip],[900,274,342,318],joint),facade=layer(front,[0,654,1312,545]),cap=layer(joint,[1160,288,78,84]);
  const base=raster(W,H),g=base.getContext('2d',{willReadFrequently:true});g.drawImage(source,0,0);g.save();g.scale(sx,sy);g.globalCompositeOperation='destination-out';for(const p of[plate,front,joint])g.fill(p);g.restore();g.save();g.globalCompositeOperation='destination-out';g.drawImage(needle.mask,needle.x,needle.y);g.restore();
  // The original arm hides a small piece of the cream desk. Reveal adjacent
  // original wood grain there, rather than leaving a paper-coloured notch.
  const deskBehindArm=new Path2D();deskBehindArm.moveTo(1000,407);deskBehindArm.lineTo(1080,421);deskBehindArm.lineTo(1080,489);deskBehindArm.lineTo(1000,489);deskBehindArm.closePath();
  g.save();g.scale(sx,sy);g.clip(arm);g.clip(deskBehindArm);g.drawImage(source,1080*sx,438*sy,70*sx,70*sy,1000,407,80,82);g.restore();
  const grain=raster(96,96),gg=grain.getContext('2d');gg.drawImage(source,430*sx,425*sy,70*sx,70*sy,0,0,96,96);
  const felt=raster(512,512),fg=felt.getContext('2d');fg.fillStyle='#29444b';fg.beginPath();fg.arc(256,256,256,0,Math.PI*2);fg.fill();fg.save();fg.clip();fg.globalAlpha=.24;fg.fillStyle=fg.createPattern(grain,'repeat');fg.fillRect(0,0,512,512);fg.globalAlpha=1;fg.strokeStyle='#7a95981c';fg.lineWidth=.55;for(let x=-512;x<1024;x+=9){fg.beginPath();fg.moveTo(x,0);fg.lineTo(x+512,512);fg.stroke();}fg.restore();
  const rig={source,base,needle,facade,cap,grain,felt,W,H,sx,sy,cx:690*sx,cy:531*sy,rx:426*sx,ry:174*sy,pivot:[1198*sx,329*sy]};
  machineRigs.set(source,rig);return rig;
}

async function recordCover(cover){
  if(!cover)return null;
  if(typeof cover==='string'){const image=new Image();image.src=cover;await image.decode();return image;}
  if(typeof cover.decode==='function')await cover.decode();
  if(!(cover.naturalWidth||cover.width)||!(cover.naturalHeight||cover.height))throw new TypeError('A record cover needs a loaded image or an image URL.');
  return cover;
}

function recordDisc(record,cover,rig){
  const c=raster(512,512),g=c.getContext('2d');g.beginPath();g.arc(256,256,254,0,Math.PI*2);g.clip();g.fillStyle='#1f2530';g.fillRect(0,0,512,512);
  g.globalAlpha=.16;g.fillStyle=g.createPattern(rig.grain,'repeat');g.fillRect(0,0,512,512);g.globalAlpha=1;
  for(let r=103;r<250;r+=2.4){g.strokeStyle=Math.round(r)%3?'#b9c2d15b':'#11192b70';g.lineWidth=.65;g.beginPath();g.arc(256,256,r,0,Math.PI*2);g.stroke();}
  for(const[a,b]of[[-.85,-.25],[2.45,3.05]])for(let r=107;r<249;r+=2.4){g.strokeStyle='#e1d3b638';g.lineWidth=.9;g.beginPath();g.arc(256,256,r,a,b);g.stroke();}
  g.fillStyle='#f0e3c9';g.beginPath();g.arc(256,256,94,0,Math.PI*2);g.fill();
  if(cover){
    const w=cover.naturalWidth||cover.width,h=cover.naturalHeight||cover.height,side=Math.min(w,h);
    g.save();g.beginPath();g.arc(256,256,92,0,Math.PI*2);g.clip();
    g.drawImage(cover,(w-side)/2,(h-side)/2,side,side,164,164,184,184);g.restore();
  }else{
    g.save();g.beginPath();g.arc(256,256,92,0,Math.PI*2);g.clip();g.fillStyle='#f3e7d0e8';g.fillRect(164,164,184,184);g.fillStyle='#452c37';g.textAlign='center';
    g.font='20px "Courier Prime",monospace';g.fillText(`SIDE ${record.side||'A'} · ${record.language==='zh'?'ZH':'EN'}`,256,215,150);
    g.strokeStyle=record.side==='B'?'#8e1b2c99':'#e97780cc';g.lineWidth=1;g.beginPath();g.moveTo(193,225);g.lineTo(319,225);g.stroke();
    const chinese=record.labelFont==='Huiwen Mincho',family=record.labelFont||'Special Elite',tokens=chinese?[...record.label]:record.label.split(/\s+/);let size=chinese?30:24,lines;
    // Reviewed Chinese titles are short enough for one line. Fit them before
    // wrapping, so a final character never hangs alone below the title.
    if(chinese&&tokens.length<=7){do{g.font=`${size}px "${family}",serif`;if(g.measureText(record.label).width<=150||size<=18)break;size--;}while(size>=18);lines=[record.label];}
    else{
    do{g.font=`${size}px "${family}",serif`;lines=[];let line='';for(const word of tokens){const next=line+(line&&!chinese?' ':'')+word;if(line&&g.measureText(next).width>150){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);if(lines.length<=2||size<=14)break;size--;}while(size>=14);
    }
    if(lines.length>2)lines=[lines[0],lines.slice(1).join(chinese?'':' ')];
    lines.forEach((line,i)=>g.fillText(line,256,lines.length===1?295:283+i*24,150));g.restore();
  }
  g.strokeStyle='#b9955c';g.lineWidth=1.5;g.beginPath();g.arc(256,256,94,0,Math.PI*2);g.stroke();g.globalCompositeOperation='destination-out';g.beginPath();g.arc(256,256,5,0,Math.PI*2);g.fill();return c;
}

function drawMachine(g,rig,machine,reduced){
  const time=machine.busy?(machine.inkStep||0)*.2:machine.position,still=reduced||!rig.inkReady;
  g.save();g.scale(g.canvas.width/rig.W,g.canvas.height/rig.H);drawInk(g,rig.base,0,0,'base',time,still);
  const ellipse=(image,dx=0,dy=0,angle=0,scale=1,ink=false,squash=1)=>{g.save();g.translate(rig.cx+dx,rig.cy+dy);g.scale(rig.rx/256*scale,rig.ry/256*scale*squash);g.rotate(angle);if(ink)drawInk(g,image,-256,-256,'disc',time,still,512,512);else g.drawImage(image,-256,-256,512,512);g.restore();};
  ellipse(rig.felt);
  const hub=()=>{g.save();g.translate(rig.cx,rig.cy);g.scale(rig.sx,rig.sy);const gold=g.createLinearGradient(-9,0,9,0);gold.addColorStop(0,'#86602d');gold.addColorStop(.45,'#f8d78b');gold.addColorStop(1,'#a37838');g.fillStyle=gold;g.fillRect(-8,-19,16,22);g.beginPath();g.ellipse(0,-19,9,5,0,0,Math.PI*2);g.fill();g.strokeStyle='#6d5435';g.lineWidth=.8;g.stroke();g.beginPath();g.ellipse(0,2,10,4,0,0,Math.PI*2);g.fill();g.restore();};
  let record=machine.current,dx=0,dy=0,floating=false,squash=1,angle=(reduced?0:Math.floor(machine.position*20/3))*Math.PI/6;
  if(machine.pending)angle=machine.outgoingStep*Math.PI/6;
  if(machine.phase==='ejecting'){dx=-rig.W*machine.progress;dy=-rig.H*.26*machine.progress;floating=true;angle+=machine.progress*.1;}
  if(machine.phase==='inserting'||machine.phase==='lowering'&&machine.pending){record=machine.pending;dx=rig.W*.95*(1-machine.progress);dy=-rig.H*.23*(1-machine.progress);floating=machine.progress<1;angle=(1-machine.progress)*.14;}
  if(machine.phase==='lowering'&&machine.pending){dx=dy=0;floating=false;angle=0;}
  if(machine.phase==='flipping'&&machine.pending){
    const p=machine.progress,lift=Math.min(1,p/.125,(1-p)/.125),turn=Math.max(0,Math.min(1,(p-.125)/.75));
    // Turn through an edge-on held cel, then show the other printed face.
    // Positive thickness keeps both Latin and Chinese lettering unmirrored.
    record=p<.5?machine.current:machine.pending;squash=Math.max(.035,Math.abs(Math.cos(turn*Math.PI)));
    dx=rig.W*.055*lift;dy=-rig.H*.2*lift;floating=p>0&&p<1;angle=p<.5?machine.outgoingStep*Math.PI/6*(1-lift):0;
  }
  if(floating)hub();if(record?.disc)ellipse(record.disc,dx,dy,angle,.977,true,squash);if(!floating)hub();
  g.save();g.translate(...rig.pivot);g.rotate(machine.needle);drawInk(g,rig.needle.image,rig.needle.x-rig.pivot[0],rig.needle.y-rig.pivot[1],'needle',time,still);g.restore();
  drawInk(g,rig.facade.image,rig.facade.x,rig.facade.y,'facade',time,still);drawInk(g,rig.cap.image,rig.cap.x,rig.cap.y,'cap',time,still);g.restore();
}

/** Five physical states and two intentional camera cuts, all held pencil drawings. */
export async function createRecordPlayer(host, { reducedMotion = false, compact = false, storyLoop = false, deferStory = false, onActivate, onTimeUpdate, onMachineUpdate } = {}) {
  reducedMotion = reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scope = document.createElement('section'); scope.className = 'record-player';
  scope.innerHTML = `<style>
  .record-player{padding:72px 36px 55px;color:#263e82;text-align:center;overflow:hidden;background:#f6f1e6}
  .record-player .record-kicker{font:12px "Courier Prime",monospace;letter-spacing:2px;margin:0 0 18px}
  .record-player .record-title{font:clamp(34px,5vw,62px)/1.08 "Special Elite",serif;margin:0}
  .record-player .record-deck{font:17px/1.6 "Courier Prime",monospace;margin:20px auto 0;max-width:560px}
  .record-player .record-art{position:relative;max-width:760px;aspect-ratio:1.09;margin:25px auto 0}
  .record-player .record-art>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  .record-player .record-caption{font:italic 15px/1.5 "Courier Prime",monospace;color:#8a4453;margin:16px 0 0;min-height:24px}
  .record-player .record-turn{font:13px "Courier Prime",monospace;letter-spacing:.5px;color:#263e82;border:1px solid #566896;background:#f7e7df;padding:14px 22px;margin-top:23px;cursor:pointer}
  .record-player .record-turn:focus-visible{outline:3px solid #a84665;outline-offset:5px}
  .record-player .record-small{font:11px/1.6 "Courier Prime",monospace;color:#797460;margin:17px 0 0}
  .record-player.record-compact{padding:0;background:transparent;overflow:visible}
  .record-player.record-compact .record-art{margin:0;max-width:none}
  .record-player.record-compact .record-caption{font-size:12px;margin-top:9px}
  @media(max-width:640px){.record-player{padding:50px 20px 40px}.record-player .record-deck{font-size:14px}.record-player .record-kicker{font-size:9px}.record-player .record-art{margin-top:24px}}
  </style><p class="record-kicker">THE JOLLY / AFTER THE LAST GUEST</p><h2 class="record-title">Please turn the night over.</h2><p class="record-deck">The hotel has folded itself into a record player.<br>Management calls this a quiet night.</p><div class="record-art" role="img" aria-label="A cream-and-cobalt hotel front desk becomes an antique gramophone, with a coral curtain horn, hotel-bell needle and luggage-wheel clockwork"><canvas class="record-drawing" aria-hidden="true"></canvas></div><p class="record-caption">Side B is tomorrow.</p><button type="button" class="record-turn" data-node="side-b">Turn the night over ↗</button><p class="record-small">JJ / LL / YY. No guests were turned away.</p>`;
  if(compact){scope.classList.add('record-compact');for(const e of scope.querySelectorAll('.record-kicker,.record-title,.record-deck,.record-turn,.record-small'))e.remove();}
  host.replaceChildren(scope);
  const art = scope.querySelector('.record-art'), drawing = scope.querySelector('.record-drawing'), caption = scope.querySelector('.record-caption');
  const effects = document.createElement('canvas');
  effects.className = 'record-sound-marks';
  effects.setAttribute('aria-hidden', 'true');
  effects.style.cssText = 'inset:0 auto auto -14%;width:128%;height:100%;pointer-events:none';
  art.append(effects);
  const fx = effects.getContext('2d');
  let leftRoom=0,rightRoom=0;
  const allIndices = FRAME_NAMES.map((_, index) => index);
  // Reduced motion already opens on the final still; cel 1 supplies the compact rig.
  const initialIndices = deferStory ? (reducedMotion ? [1, allIndices.at(-1)] : [0, 1]) : allIndices;
  const [initial, sprites] = await Promise.all([
    compact ? loadImage(FRAME_NAMES[1]) : Promise.all(initialIndices.map(loadStoryCel)),
    loadFeedbackArt(['horn-sound','gear-sound']),
  ]);
  const paintSoundMarks = (frameIndex, time) => {
    const w = drawing.width, h = drawing.height, margin = w * .14;
    fx.clearRect(0, 0, effects.width, effects.height);
    const [x, y, angle, size] = HORN_PORTS[frameIndex], horn = sprites['horn-sound'];
    if (horn) {
      const gap = w * .012, dx = Math.cos(angle), dy = Math.sin(angle);
      const room = dx < 0 ? leftRoom + x * w : rightRoom + (1 - x) * w;
      const spread = 1.06 * (Math.abs(dx) + Math.abs(dy) * horn.naturalHeight / horn.naturalWidth / 2);
      const width = Math.min(w * size, (room - Math.abs(dx) * gap - 4) / spread);
      if (width >= 5) {
        drawFeedbackArt(fx, horn, margin + x * w + dx * gap, y * h + dy * gap, width, time,
          { reduced: reducedMotion, angle });
        // Leave only the part of the pencil mark that is in front of the paper, clear of the painted horn.
        fx.globalCompositeOperation = 'destination-out';
        fx.drawImage(drawing, margin, 0);
        fx.globalCompositeOperation = 'source-over';
      }
    }
    const [gx, gy] = GEAR_PORTS[frameIndex];
    const gearWidth = Math.min(w * .059, (leftRoom + gx * w - 4) / 1.08);
    if (gearWidth >= 5) drawFeedbackArt(fx, sprites['gear-sound'], margin + gx * w, gy * h, gearWidth, time,
      { reduced: reducedMotion, angle: -2.66, phaseOffset: 1 });
  };
  const g = drawing.getContext('2d'), scratch = document.createElement('canvas'); scratch.width = scratch.height = 1;
  const sg = scratch.getContext('2d');
  const frames = [];
  const rigImage = compact ? initial : initial[initialIndices.indexOf(1)].image;
  const aspect = rigImage.naturalHeight / rigImage.naturalWidth;
  art.style.aspectRatio=String(1/aspect);
  const warmCel = frame => {
    if (!reducedMotion) drawBoiledSprite(sg, frame, [0, 0, frame.width, frame.height], [0, 0, 1, 1]);
  };
  if (!compact) for (const [i, { frame }] of initial.entries()) {
    warmCel(frame);
    frames[initialIndices[i]] = frame;
    if (!reducedMotion) await new Promise(resolve => setTimeout(resolve, 0));
  }
  let disposed=false,ready=false,visible=false,activated=false,playing=false,resumeRequested=false;
  let position=reducedMotion?DURATION:0,speed=1,lastClock=null,raf=0,lastDraw='';
  const machine={mode:compact,rig:compact?machineRig(rigImage):null,current:null,pending:null,busy:false,phase:'idle',progress:0,needle:.17,playing:false,position:0,outgoingStep:0,inkStep:0};
  if(compact&&!reducedMotion)await warmMachine(machine.rig,sg);
  let machineToken=0,machineTimer=0,machineWake=null;
  const machineState=()=>({mode:machine.mode?'record':'story',recordId:(machine.pending||machine.current)?.id||null,loadedRecordId:machine.current?.id||null,label:(machine.pending||machine.current)?.label||'',language:(machine.pending||machine.current)?.language||null,side:(machine.pending||machine.current)?.side||null,loadedLanguage:machine.current?.language||null,loadedSide:machine.current?.side||null,phase:machine.phase,progress:machine.progress,playing:machine.playing,position:machine.position});
  const machineCaption=()=>{
    const zh=document.documentElement.lang.toLowerCase().startsWith('zh'),next=machine.pending;
    if(machine.phase==='loading')return zh?'新的一面，正在入住。':'A new side is checking in.';
    if(machine.phase==='lifting')return zh?'请稍候，唱针抬起。':'Please mind the needle.';
    if(machine.phase==='ejecting')return zh?'上一位客人正在退房。':'The last guest checks out.';
    if(machine.phase==='inserting')return zh?`正在入住：${next?.label||''}`:`Checking in: ${next?.label||''}`;
    if(machine.phase==='flipping')return zh?`翻到 ${next?.side||'B'} 面，夜晚还有另一面。`:`Turning to Side ${next?.side||'B'}. The night has another side.`;
    if(machine.phase==='lowering')return zh?'铃响一声，可以入席。':'One bell. The room is ready.';
    return machine.current?.label||(zh?'房间已经准备好了。':'The room is ready.');
  };
  const updateCaption=()=>{
    const text=machine.mode?machineCaption():CAPTIONS[poseAt(position)];
    if(caption.textContent!==text)caption.textContent=text;
    const lang=HAS_HAN.test(text)?'zh-CN':'en';
    if(caption.lang!==lang){
      caption.lang=lang;
      caption.style.fontFamily=lang==='zh-CN'?'"Zhuque Fangsong",serif':'"Courier Prime",monospace';
    }
  };
  const emitMachine=()=>{if(!disposed)onMachineUpdate?.(machineState());};
  const cancelMachine=()=>{machineToken++;if(machineTimer)clearTimeout(machineTimer);machineTimer=0;const wake=machineWake;machineWake=null;wake?.();return machineToken;};
  const machineWait=ms=>new Promise(resolve=>{machineWake=resolve;machineTimer=setTimeout(()=>{machineTimer=0;machineWake=null;resolve();},ms);});
  const leaveRecordView=()=>{if(!machine.mode)return;cancelMachine();machine.mode=false;machine.busy=false;machine.pending=null;machine.phase=machine.current?(machine.playing?'playing':'paused'):'idle';emitMachine();};
  const poseAt = ms => {
    let t = Math.max(0, ms);
    for (let i = 0; i < HOLDS.length - 1; i++) { if (t < HOLDS[i]) return i; t -= HOLDS[i]; }
    return HOLDS.length - 1;
  };
  const pendingCels = new Map();
  function prepareCel(index) {
    if (frames[index] || disposed) return Promise.resolve();
    if (!pendingCels.has(index)) pendingCels.set(index, loadStoryCel(index).then(async ({ frame }) => {
      if (disposed) return;
      await new Promise(resolve => setTimeout(resolve, 0));
      if (disposed) return;
      warmCel(frame);
      frames[index] = frame;
      if (!machine.mode && poseAt(position) === index) render();
    }).catch(error => console.warn('Record overture drawing could not load:', FRAME_NAMES[index], error.message)));
    return pendingCels.get(index);
  }
  let preparation;
  function prepareOverture() {
    if (compact || reducedMotion || !deferStory) return;
    preparation ??= (async () => {
      // Start all transfers together, then yield between the expensive pencil holds.
      const remaining = allIndices.filter(index => !frames[index]);
      for (const index of remaining) void loadImage(FRAME_NAMES[index]).catch(() => {});
      for (const index of remaining) await prepareCel(index);
    })();
  }
  const settle = now => {
    if(!playing||lastClock===null)return;
    const next = position + Math.max(0,now-lastClock)*speed;
    lastClock=now;
    const index = poseAt(storyLoop && next >= DURATION ? next % DURATION : next);
    if (!frames[index]) { void prepareCel(index); return; }
    position=next;
    if(position>=DURATION){if(storyLoop&&!compact&&!reducedMotion)position%=DURATION;else{position=DURATION;playing=false;resumeRequested=false;lastClock=null;}}
  };
  const state = () => ({time:compact?0:position/1000,duration:compact?0:DURATION/1000,playing,frameIndex:compact?0:poseAt(position),frameCount:compact?1:FRAME_NAMES.length,caption:machine.mode?machineCaption():CAPTIONS[poseAt(position)],speed,mode:machine.mode?'record':'story'});
  const render = () => {
    if (disposed || compact && (!visible || document.hidden)) return;
    const index=poseAt(position),frame=frames[index];
    if (!machine.mode && !frame) { void prepareCel(index); return; }
    g.clearRect(0, 0, drawing.width, drawing.height);
    if(machine.mode)drawMachine(g,machine.rig,machine,reducedMotion);else drawBoiledSprite(g, frame, [0, 0, frame.width, frame.height], [0, 0, drawing.width, drawing.height], { phase: inkPhase(position, reducedMotion), amplitude: reducedMotion ? 0 : 1 });
    paintSoundMarks(machine.mode ? 1 : index, machine.mode ? machine.position * 1000 : position);
    updateCaption();drawing.dataset.frame=String(index);drawing.dataset.mode=machine.mode?'record':'story';lastDraw=`${index}:${Math.floor(position/200)}`;
    onTimeUpdate?.(state());
  };
  const cancelFrame=()=>{if(raf)cancelAnimationFrame(raf);raf=0;};
  const schedule=()=>{if(playing&&!raf)raf=requestAnimationFrame(tick);};
  const tick=now=>{
    raf=0;if(disposed||!playing)return;settle(now);
    if(`${poseAt(position)}:${Math.floor(position/200)}`!==lastDraw||!playing)render();
    schedule();
  };
  const reconcile=()=>{
    if(disposed)return;const now=performance.now();settle(now);
    playing=resumeRequested&&!reducedMotion&&visible&&!document.hidden&&position<DURATION;
    lastClock=playing?now:null;cancelFrame();render();schedule();
  };
  const play=()=>{
    if(disposed)return;if(compact){setPlaying(true);return;}prepareOverture();leaveRecordView();settle(performance.now());activated=true;
    if(reducedMotion)position=DURATION;else if(position>=DURATION)position=0;
    resumeRequested=!reducedMotion;reconcile();
  };
  const pause=()=>{
    if(disposed)return;settle(performance.now());activated=true;playing=resumeRequested=false;lastClock=null;cancelFrame();render();
  };
  const seek=seconds=>{
    if(!Number.isFinite(seconds))throw new RangeError('Record time must be finite seconds.');
    if(disposed)return;if(compact){setPlaybackPosition(seconds);return;}leaveRecordView();activated=true;playing=resumeRequested=false;lastClock=null;cancelFrame();
    position=reducedMotion?DURATION:Math.max(0,Math.min(DURATION,seconds*1000));render();
  };
  const step=direction=>{
    if(!Number.isFinite(direction)||direction===0)throw new RangeError('Frame direction must be nonzero and finite.');
    if(disposed)return;settle(performance.now());const current=poseAt(position),target=Math.max(0,Math.min(FRAME_NAMES.length-1,current+Math.sign(direction)));
    if(target===current)pause();else seek(HOLDS.slice(0,target).reduce((sum,n)=>sum+n,0)/1000);
  };
  const setSpeed=value=>{
    if(!Number.isFinite(value)||value<=0)throw new RangeError('Record speed must be positive and finite.');
    if(disposed)return;const now=performance.now();settle(now);speed=value;lastClock=playing?now:null;render();schedule();
  };
  const replay=()=>{if(disposed)return;if(compact){showRecord();return;}playing=resumeRequested=false;lastClock=null;cancelFrame();position=reducedMotion?DURATION:0;play();};
  const activate=()=>{if(disposed)return;if(compact){render();return;}if(!activated)play();else reconcile();};
  const paintMachine=()=>{updateCaption();render();emitMachine();};
  const selectRecord=async record=>{
    if(!record||!RECORD_IDS.has(record.id)||typeof record.label!=='string'||!record.label.trim())throw new TypeError('Select a known JOLLY record with its actual label.');
    const language=record.language??(record.side==='B'?'zh':'en'),side=record.side??(language==='zh'?'B':'A');
    if(!['en','zh'].includes(language)||side!==(language==='zh'?'B':'A'))throw new TypeError('A JOLLY record uses English Side A or Chinese Side B.');
    if(disposed)return null;pause();const token=cancelMachine(),outgoingStep=machine.busy?machine.outgoingStep:Math.floor(machine.position*20/3);
    if(!machine.rig)machine.rig=machineRig(rigImage);
    machine.mode=true;machine.busy=true;machine.outgoingStep=outgoingStep;machine.position=0;machine.playing=false;machine.phase='loading';machine.progress=0;machine.inkStep=0;
    const incoming={id:record.id,label:record.label.trim(),language,side,labelFont:language==='zh'||HAS_HAN.test(record.label)?'Huiwen Mincho':'Special Elite',disc:null},flip=machine.current?.id===incoming.id&&(machine.current.side!==side||machine.current.language!==language);machine.pending=incoming;paintMachine();
    try{
      const[cover]=await Promise.all([recordCover(record.cover),prepareRecordFonts(incoming),reducedMotion?null:warmMachine(machine.rig,sg)]);if(disposed||token!==machineToken)return null;
      incoming.disc=recordDisc(incoming,cover,machine.rig);
      if(!reducedMotion){drawInk(sg,incoming.disc,0,0,'disc',0,false,1,1);await new Promise(resolve=>setTimeout(resolve,0));if(disposed||token!==machineToken)return null;}
      const initialNeedle=machine.needle;
      const steps=reducedMotion?[]:flip?[
        ['lifting',.5,150],['lifting',1,150],
        ...[0,.125,.25,.375,.5,.625,.75,.875,1].map(p=>['flipping',p,p===.5?180:140]),
        ['lowering',.5,150],['lowering',1,150],
      ]:[['lifting',.5,180],['lifting',1,180],['ejecting',.35,180],['ejecting',.7,180],['ejecting',1,140],['inserting',0,100],['inserting',.35,200],['inserting',.7,200],['inserting',1,160],['lowering',.5,160],['lowering',1,140]];
      for(const[phase,progress,hold]of steps){
        if(disposed||token!==machineToken)return null;
        machine.phase=phase;machine.progress=progress;machine.inkStep++;machine.needle=phase==='lifting'?initialNeedle+(.17-initialNeedle)*progress:phase==='lowering'?.17*(1-progress):.17;
        paintMachine();await machineWait(hold);
      }
      if(disposed||token!==machineToken)return null;
      machine.current=incoming;machine.pending=null;machine.busy=false;machine.phase='ready';machine.progress=1;machine.needle=0;paintMachine();return incoming.id;
    }catch(error){
      if(disposed||token!==machineToken)return null;
      machine.pending=null;machine.busy=false;machine.phase='error';machine.progress=0;machine.needle=.17;paintMachine();throw error;
    }
  };
  const setPlaying=value=>{
    if(typeof value!=='boolean')throw new TypeError('Music playing state must be boolean.');
    if(disposed||machine.busy||!machine.current||value===machine.playing)return;
    machine.playing=value;
    if(!machine.mode){machine.phase=value?'playing':'paused';emitMachine();return;}
    const target=value?0:.17,initial=machine.needle,token=cancelMachine();
    if(reducedMotion||Math.abs(initial-target)<.001){machine.needle=target;machine.phase=value?'playing':'paused';machine.progress=1;paintMachine();return;}
    const animate=async()=>{
      for(const progress of[.5,1]){if(disposed||token!==machineToken)return;machine.phase=value?'lowering':'lifting';machine.progress=progress;machine.needle=initial+(target-initial)*progress;paintMachine();await machineWait(150);}
      if(disposed||token!==machineToken)return;machine.phase=value?'playing':'paused';paintMachine();
    };void animate();
  };
  const setPlaybackPosition=seconds=>{
    if(!Number.isFinite(seconds))throw new RangeError('Music position must be finite seconds.');
    if(disposed||machine.busy||!machine.current)return;
    const previous=machineInkKey(machine.position);machine.position=Math.max(0,seconds);
    if(machine.mode&&!reducedMotion&&previous!==machineInkKey(machine.position))render();emitMachine();
  };
  const showRecord=()=>{
    if(disposed||!machine.current||machine.busy)return false;if(machine.mode)return true;
    settle(performance.now());activated=true;playing=resumeRequested=false;lastClock=null;cancelFrame();
    machine.mode=true;machine.phase=machine.playing?'playing':'paused';machine.progress=1;machine.needle=machine.playing?0:.17;paintMachine();return true;
  };
  const resize = () => {
    if(disposed)return;settle(performance.now());
    const box=art.getBoundingClientRect(),clip=(compact?(scope.closest('.paper-world')||scope):scope).getBoundingClientRect();
    const width = Math.max(1, Math.round(box.width)), px = Math.min(1.6, devicePixelRatio || 1);
    leftRoom=Math.min(width*.14,Math.max(0,box.left-clip.left))*px;
    rightRoom=Math.min(width*.14,Math.max(0,clip.right-box.right))*px;
    drawing.width = Math.round(width * px); drawing.height = Math.round(width * aspect * px);
    effects.width = Math.round(drawing.width * 1.28); effects.height = drawing.height;
    render();
  };
  const button = scope.querySelector('.record-turn'), turn = () => { onActivate?.('side-b'); replay(); };
  button?.addEventListener('click', turn);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(art);
  const preloadObserver = !compact && deferStory && !reducedMotion ? new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { preloadObserver.disconnect(); prepareOverture(); }
  }, { rootMargin: '1200px' }) : null;
  preloadObserver?.observe(scope);
  const observer=new IntersectionObserver(([entry])=>{
    settle(performance.now());visible=entry.isIntersecting;
    if(compact){if(visible)render();return;}
    if(visible&&!activated)activate();else reconcile();
  },{threshold:.2});observer.observe(art);
  const visibilityChanged=()=>{if(compact)render();else reconcile();};document.addEventListener('visibilitychange',visibilityChanged);
  const captionLanguage=new MutationObserver(updateCaption);captionLanguage.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  ready=true;resize();
  return { get ready(){return ready&&!disposed;},get currentTime(){settle(performance.now());return compact?0:position/1000;},get duration(){return compact?0:DURATION/1000;},get playing(){settle(performance.now());return playing;},get frameIndex(){settle(performance.now());return compact?0:poseAt(position);},get frameCount(){return compact?1:FRAME_NAMES.length;},
    play,pause,seek,step,setSpeed,activate,replay,selectRecord,setPlaying,setPlaybackPosition,showRecord,get machineState(){return machineState();},
    dispose(){settle(performance.now());playing=resumeRequested=false;lastClock=null;disposed=true;ready=false;cancelFrame();cancelMachine();observer.disconnect();preloadObserver?.disconnect();resizeObserver.disconnect();captionLanguage.disconnect();document.removeEventListener('visibilitychange',visibilityChanged);button?.removeEventListener('click',turn);machine.current=machine.pending=machine.rig=null;frames.length=0;drawing.width=drawing.height=0;scope.remove();},
    review:{render:seek,seek,frameNames:[...FRAME_NAMES],holds:[...HOLDS],duration:DURATION} };
}
