import { drawFeedbackArt, loadFeedbackArt } from './feedback-art.mjs';
import { drawBoiledSprite } from './ink-motion.mjs';
import { drawPencilArrow, pencilArrowPaths, makeTicketSvg } from './looseleaf.mjs';

// The three objects have their own copy and motion scores, independent of the cast's story state.
export const INSTRUMENT_COPY = {
  en: {
    intro: 'THE ACCOMPLICES / AN INTERLUDE IN THREE OBJECTS',
    saxophone: { number: 'V', owner: "JOJO'S TENOR SAXOPHONE", title: 'An objection, in brass.', sub: 'No raised voice. Several raised keys.', actions: ['WORK THE KEYS', 'LET IT BREATHE'], caption: 'AIR → A SMALL DISAGREEMENT → A VERY LONG NOTE', aside: 'polished manners. questionable intentions.', labels: ['AIR IN', 'KEYS CONSIDER', 'OPINION OUT'], note: 'the mouthpiece has\nrequested no comment.' },
    'double-bass': { number: 'VI', owner: "LYLY'S DOUBLE BASS", title: 'Four strings. No straight answer.', sub: 'Pull one line. The whole procedure feels it.', actions: ['PLUCK A STRING', 'MAKE IT RESONATE'], caption: 'TENSION → RELEASE → CONSEQUENCES', aside: 'the bridge would like a word.', labels: ['HOLD A LINE', 'LET IT GO', 'FEEL IT EVERYWHERE'], note: 'a respectable amount\nof structural unrest.' },
    'rabbit-guitar': { number: 'VII', owner: "YOYO'S PLUSH RABBIT GUITAR", title: 'Soft toy. Hard opinions.', sub: 'A little plush. A lot of prior convictions.', actions: ['PLUCK THE RABBIT', 'LET IT MISBEHAVE'], caption: 'CUDDLE → AMPLIFY → DENY EVERYTHING', aside: 'the tail is not part of the warranty.', labels: ['CUDDLE', 'AMPLIFY', 'ALL BITE'], note: 'soft outside.\nno comment inside.' },
    loading: 'THE INSTRUMENT IS BEING POLITELY UNPACKED.', error: 'THIS INSTRUMENT HAS MISSED ITS CUE.',
  },
};

const INSTRUMENTS = ['saxophone', 'double-bass', 'rabbit-guitar'];
const NODE_IDS = { saxophone: 'sax', 'double-bass': 'bass', 'rabbit-guitar': 'rabbit' };
const DAY = { paper: '#f7f2e5', ink: '#2140d6', coral: '#e97780', lime: '#ade408', green: '#376d34', wine: '#8e1b2c', gold: '#dcae42', quiet: '#a03953', card: '#fff8e9', cardShade: '#e7dccb', mark: null };
// The After Hours sample: only ever switched on from there.
const NIGHT = { paper: '#2a1a12', ink: '#efe6d0', coral: '#f08a90', lime: '#c9e85a', green: '#c9e85a', wine: '#ffb3cf', gold: '#f2d48a', quiet: '#f7a6ac', card: '#1c2a2c', cardShade: '#111c1e', mark: '#54402a' };
const C = { ...DAY };
if (document.documentElement.dataset.house === 'down') Object.assign(C, NIGHT);
const accentFor = id => (id === 'saxophone' ? C.ink : id === 'double-bass' ? C.green : C.wine);
const SCORE = { saxophone: [0, .65, 1, .35, 0], 'double-bass': [0, 1, -.65, .25, 0], 'rabbit-guitar': [0, .55, 1, -.6, 0] };
const HOLDS = { saxophone: [1250,1100,900,1300,1000], 'double-bass': [950,1250,1100,900,1400], 'rabbit-guitar': [1100,900,1350,1200,1050] };
const VIEWS = { saxophone: [0,1,0,2,0], 'double-bass': [0,2,0,1,0], 'rabbit-guitar': [0,1,0,2,0] };
const duration = id => HOLDS[id].reduce((sum,n)=>sum+n,0);
function heldPose(id,elapsed) { let t=Math.max(0,elapsed)%duration(id);for(let i=0;i<4;i++){if(t<HOLDS[id][i])return i;t-=HOLDS[id][i];}return 4; }
const CSS = `
.instrument-collection{position:relative;color:#2140d6;font-synthesis:none}
.instrument-collection>.instrument-intro{margin:56px 57px 0;border-top:1px dashed #2140d655;padding-top:23px;font:10px/1.6 "Courier Prime",monospace;letter-spacing:1.3px}
.instrument-chapter{position:relative;padding:52px 57px 0;border-bottom:1px solid #2140d625;scroll-margin-top:20px}
.instrument-heading{position:relative;max-width:100%}.instrument-eyebrow{font:10px/1.6 "Courier Prime",monospace;letter-spacing:1.3px;margin:0 0 13px;display:flex;align-items:center;gap:14px}.instrument-eyebrow b{font:24px/1 "Special Elite",serif;font-weight:400;color:var(--instrument-accent)}
.instrument-title{font:400 clamp(36px,4.3vw,61px)/1.14 "Special Elite",serif;letter-spacing:-1.15px;margin:0;width:fit-content;max-width:100%;position:relative;color:var(--instrument-accent)}
.instrument-subtitle{font:italic 16px/1.5 "Courier Prime",monospace;margin:23px 0 0;max-width:720px}
.instrument-figure{margin:14px 0 0;position:relative;aspect-ratio:1100/690;isolation:isolate;overflow:clip}
.instrument-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y}
.instrument-loading{position:absolute;inset:40% 15% auto;text-align:center;font:11px/1.6 "Courier Prime",monospace;letter-spacing:1px}
.instrument-controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:flex-start;margin:0 0 22px}
.instrument-control{font:11px/1.3 "Courier Prime",monospace;letter-spacing:.4px;color:#2140d6;background:#fff8e9;border:1px solid #2140d6;padding:12px 15px;min-height:44px;box-shadow:3px 3px 0 #2140d614;cursor:pointer;border-radius:1px}
.instrument-control:hover{background:var(--instrument-mark)}.instrument-control:focus-visible{outline:3px solid #8e1b2c;outline-offset:4px}.instrument-control:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #2140d625}
.instrument-control:disabled{opacity:.5;cursor:wait}.instrument-caption{margin:0;border-top:1px dashed #2140d655;padding:16px 0 25px;display:flex;justify-content:space-between;gap:30px;font:10px/1.6 "Courier Prime",monospace}
.instrument-caption>em{font-style:italic;color:var(--instrument-accent);text-align:right}
@media(min-width:721px){
  .instrument-chapter,.instrument-collection>.instrument-intro,.instrument-caption{border:0}
  .instrument-caption{justify-content:flex-start;gap:36px}
  .instrument-caption>em{text-align:left}
}
.instrument-saxophone .instrument-title,.instrument-saxophone .instrument-caption>em{color:#a03953;text-shadow:none}
.instrument-reader{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
@media(max-width:1100px){.instrument-collection>.instrument-intro{margin-left:35px;margin-right:35px}.instrument-chapter{padding-left:35px;padding-right:35px}.instrument-title{font-size:clamp(35px,4.8vw,51px)}.instrument-subtitle{font-size:14px}}
@media(max-width:720px){.instrument-collection>.instrument-intro{margin:40px 23px 0;font-size:8px;letter-spacing:.7px}.instrument-chapter{padding:35px 23px 0}.instrument-eyebrow{font-size:8px;letter-spacing:.6px;gap:10px}.instrument-eyebrow b{font-size:20px}.instrument-title{font-size:37px;line-height:1.14;letter-spacing:-.8px}.instrument-subtitle{font-size:13px;line-height:1.55;margin-top:22px}.instrument-figure{aspect-ratio:640/940;margin-top:14px}.instrument-controls{gap:9px;margin-bottom:20px}.instrument-control{font-size:9px;padding:12px 11px;flex:1;min-width:140px}.instrument-caption{font-size:8px;line-height:1.6;gap:14px;padding-bottom:23px}.instrument-caption>em{max-width:42%}}
`;

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function pathFor(poly, W, H) { const p = new Path2D(); poly.forEach(([x, y], i) => i ? p.lineTo(x * W, y * H) : p.moveTo(x * W, y * H)); p.closePath(); return p; }
function ellipsePoly(cx, cy, rx, ry, count = 32) { return Array.from({ length: count }, (_, i) => [cx + Math.cos(i / count * Math.PI * 2) * rx, cy + Math.sin(i / count * Math.PI * 2) * ry]); }

function alphaBounds(c) {
  const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=-1,y1=-1;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>=16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<0)throw new Error('Instrument artwork has no visible alpha.');
  return{x:Math.max(0,x0-4),y:Math.max(0,y0-4),w:Math.min(c.width-1,x1+4)-Math.max(0,x0-4)+1,h:Math.min(c.height-1,y1+4)-Math.max(0,y0-4)+1};
}

function viewCanvas(image) {
  const source=canvas(image.naturalWidth,image.naturalHeight);source.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0);
  const b=alphaBounds(source),c=canvas(600,900),scale=Math.min(580/b.w,880/b.h),w=b.w*scale,h=b.h*scale,x=(600-w)/2,y=890-h;
  c.getContext('2d',{willReadFrequently:true}).drawImage(source,b.x,b.y,b.w,b.h,x,y,w,h);
  return{image:c,W:600,H:900,bounds:{x,y,w,h}};
}

function fitBox(shape,reserved) {
  const b=shape.bounds,scale=Math.min(reserved.w/b.w,reserved.h/b.h);
  return{x:reserved.x+reserved.w/2-(b.x+b.w/2)*scale,y:reserved.y+reserved.h-(b.y+b.h)*scale,w:shape.W*scale,h:shape.H*scale};
}

async function prepareTickets(scene) {
  const [dw,dh]=scene.id==='saxophone'?[245,66]:scene.id==='double-bass'?[235,66]:[250,70];
  const sizes=[[dw,dh,0],[dw,dh,1],[dw,dh,2],[166,65,0],[172,65,1],[164,65,2]];
  await Promise.all(sizes.flatMap(([w,h,index])=>[false,true].map(async active=>{
    const key=`${w}:${h}:${index}:${active}`,image=new Image();
    image.src='data:image/svg+xml,'+encodeURIComponent(makeTicketSvg({width:w,height:h,stubWidth:23,seed:`instrument-${scene.id}-${index}`,tokens:{ink:scene.accent,card:active?C.mark??scene.mark:C.card,paper:active?C.mark??scene.mark:C.card,'paper-shade':C.cardShade}}));
    await image.decode();scene.tickets.set(key,image);
  })));
}

/** Separate actual image parts; the actor never translates or rocks as a single bitmap. */
function makeRig(image, id) {
  const H = 900, W = Math.round(image.width / image.height * H), base = canvas(W, H), g = base.getContext('2d',{willReadFrequently:true});
  g.drawImage(image, 0, 0, W, H);
  const bounds=alphaBounds(base);
  const parts = [];
  const cut = (name, poly, pivot, frames, underfill) => {
    const mask = pathFor(poly, W, H), xs = poly.map(p => p[0] * W), ys = poly.map(p => p[1] * H);
    const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys)), w = Math.ceil(Math.max(...xs) - x + 1), h = Math.ceil(Math.max(...ys) - y + 1);
    const patch = canvas(w, h), pg = patch.getContext('2d'); pg.translate(-x, -y); pg.clip(mask); pg.drawImage(base, 0, 0);
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(mask); g.restore();
    if (underfill) { g.save(); g.clip(mask); g.fillStyle = underfill; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(46,25,42,.25)'; g.lineWidth = .7; for (let n = x - h; n < x + w; n += 3) { g.beginPath(); g.moveTo(n, y); g.lineTo(n + h, y + h); g.stroke(); } g.restore(); }
    parts.push({ name, image: patch, x, y, pivot: [pivot[0] * W, pivot[1] * H], frames });
  };
  if (id === 'saxophone') {
    [[.516, .264], [.535, .36], [.558, .395], [.566, .429]].forEach(([x, y], i) => cut(`key-${i}`, ellipsePoly(x, y, .024, .016), [x - .026, y], [0, .08, -.09, .035, 0], '#bb822a'));
  } else if (id === 'double-bass') {
    cut('bridge', [[.398, .623], [.574, .623], [.576, .648], [.398, .649]], [.487, .647], [0, -.012, .018, -.007, 0], '#e8a43f');
  } else {
    cut('ear-left', [[.285, .357], [.182, .39], [.125, .528], [.13, .641], [.175, .66], [.24, .63], [.29, .51], [.358, .43]], [.34, .435], [0, -.055, .10, -.035, 0]);
    cut('ear-right', [[.65, .45], [.76, .47], [.85, .54], [.88, .60], [.84, .66], [.76, .65], [.71, .60], [.68, .55], [.61, .51]], [.64, .49], [0, .05, -.085, .035, 0]);
    cut('button-eye', ellipsePoly(.594, .594, .038, .028), [.594, .594], [0, .13, -.18, .08, 0], '#3c2436');
    cut('cotton-tail', ellipsePoly(.792, .786, .063, .061), [.748, .786], [0, -.025, .045, -.02, 0]);
    cut('bell', [[.672, .908], [.743, .908], [.769, .974], [.666, .974]], [.705, .910], [0, .19, -.27, .12, 0]);
  }
  return { base, parts, W, H, mask: image,bounds };
}

function drawRig(g, rig, box, id, frame, boil,view) {
  if(view){drawBoiledSprite(g,view.image,[0,0,view.W,view.H],[box.x,box.y,box.w,box.h],{phase:boil,amplitude:id==='saxophone'?.35:id==='double-bass'?.52:.85});return;}
  g.save(); g.translate(box.x, box.y); g.scale(box.w / rig.W, box.h / rig.H);
  drawBoiledSprite(g, rig.base, [0, 0, rig.W, rig.H], [0, 0, rig.W, rig.H], { phase: boil, amplitude: id === 'saxophone' ? .35 : id === 'double-bass' ? .52 : .85 });
  for (const p of rig.parts) {
    g.save(); g.translate(...p.pivot); g.rotate(p.frames[frame]);
    if (p.name.startsWith('key')) g.scale(1, [1, .87, .48, .75, 1][(frame + Number(p.name.at(-1))) % 5]);
    if (p.name === 'bridge') g.translate(0, SCORE[id][frame] * -1.6);
    if (p.name === 'cotton-tail') g.scale(1 + SCORE[id][frame] * .06, 1 - SCORE[id][frame] * .045);
    g.drawImage(p.image, p.x - p.pivot[0], p.y - p.pivot[1]); g.restore();
  }
  g.restore();
}

function text(g, value, x, y, { size = 18, color = C.ink, align = 'left', title = false } = {}) {
  g.fillStyle = color; g.font = `${title ? '' : 'italic '}${size}px "${title ? 'Special Elite' : 'Courier Prime'}"`; g.textAlign = align; g.textBaseline = 'alphabetic';
  value.split('\n').forEach((line, i) => g.fillText(line, x, y + i * size * 1.45));
}
function stroked(g, points, color, width = 1, alpha = 1) {
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.globalAlpha = alpha; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); points.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.stroke(); g.restore();
}
function circle(g, x, y, r, color, width = 1) { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
function graph(scene, g, boxes, connections) {
  const labelSize = scene.small ? 23 : 18;
  boxes.forEach(([x, y, w, h], i) => {
    const active = i === scene.pose % 3;
    const card=scene.tickets.get(`${w}:${h}:${i}:${active}`);g.drawImage(card,x,y,w,h);
    g.save();g.strokeStyle=scene.accent;g.globalAlpha=.24;g.lineWidth=.65;
    for(let n=x+13;n<x+w-28;n+=6){g.beginPath();g.moveTo(n,y+h-10);g.lineTo(n+5,y+h-5);g.stroke();}g.restore();
    g.fillStyle=scene.accent;g.beginPath();g.arc(x+w/2,y+4,3.4,0,Math.PI*2);g.fill();g.fillStyle='#fff7db';g.beginPath();g.arc(x+w/2-1,y+3,.9,0,Math.PI*2);g.fill();
    g.font = `${labelSize}px "Special Elite"`;
    let label = scene.copy.labels[i];
    if (g.measureText(label).width > w - 46) {
      const words = label.split(' '), split = Math.ceil(words.length / 2); label = words.slice(0, split).join(' ') + '\n' + words.slice(split).join(' ');
    }
    const lines = label.split('\n');
    text(g, label, x + (w-23) / 2, y + h / 2 + labelSize * .35 - (lines.length - 1) * labelSize * 1.45 / 2, { size: labelSize, align: 'center', title: true, color: scene.accent });
    text(g,String(i+1).padStart(2,'0'),x+w-12,y+h-12,{size:scene.small?9:8,align:'center',color:scene.accent});
  });
  connections.forEach((points, i) => {
    const key = `${scene.small}:${i}`;
    if (!scene.arrows.has(key)) scene.arrows.set(key, pencilArrowPaths(points, { seed: `instrument-${scene.id}-${i}`, width: 1.5 }));
    drawPencilArrow(g, null, { paths: scene.arrows.get(key), color: scene.accent });
  });
}

function drawSax(scene, g, time, boil) {
  const m = scene.small,view=scene.viewIndex?scene.views[scene.viewIndex]:null,reserved=m?{x:100,y:7,w:440,h:660}:{x:110,y:15,w:480,h:626},box=fitBox(view||scene.rig,reserved);
  const f = SCORE.saxophone[scene.pose], pulse = scene.impulse === 'secondary' ? 1.6 : 1;
  // The diagram shares the actual airway: an inhale enters at the mouthpiece and leaves through the bell.
  const mouth = [box.x + box.w * .13, box.y + box.h * .11], bell = [box.x + box.w * .72, box.y + box.h * .54];
  if(!view)for (let i = 0; i < 3; i++) {
    const wave = Array.from({ length: 35 }, (_, n) => [bell[0] + 35 + n * (m ? 2.7 : 4), bell[1] + (i - 1) * 21 + Math.sin(n * .24 + scene.pose) * f * 7 * pulse]);
    stroked(g, wave, C.coral, 1.25, .3 + f * .4);
  }
  drawRig(g, scene.rig, box, scene.id, scene.pose, boil,view);
  // A narrow reflected light is clipped to the actual golden tube, not translated with the picture.
  if (!view&&f > 0) {
    if(!scene.shines.has(scene.pose)){const shine=canvas(600,900),sg=shine.getContext('2d');sg.drawImage(scene.rig.mask,0,0,600,900);sg.globalCompositeOperation='source-in';const x=200+scene.pose*47,gradient=sg.createLinearGradient(x-30,0,x+30,0);gradient.addColorStop(0,'#fff7c600');gradient.addColorStop(.5,'#fff7c66e');gradient.addColorStop(1,'#fff7c600');sg.fillStyle=gradient;sg.fillRect(0,0,600,900);scene.shines.set(scene.pose,shine);}
    g.globalAlpha=.42;g.drawImage(scene.shines.get(scene.pose),box.x,box.y,box.w,box.h);g.globalAlpha=1;
  }
  if (m) {
    graph(scene, g, [[22, 748, 166, 65], [236, 748, 172, 65], [454, 748, 164, 65]], [[[188, 780], [228, 780]], [[408, 780], [449, 780]]]);
    text(g, 'a breath goes in.\na point of view comes out.', 320, 879, { align: 'center', size: 22, color: C.wine });
  } else {
    graph(scene, g, [[735, 96, 245, 66], [735, 279, 245, 66], [735, 486, 245, 66]], [[[856, 165], [856, 270]], [[856, 348], [856, 477]]]);
    if(!view){stroked(g, [[mouth[0], mouth[1] - 6], [mouth[0] - 55, mouth[1] - 40], [60, mouth[1] - 40]], C.coral, .8, .8);
    text(g, scene.copy.note, 62, 215, { size: 16, color: C.wine });
    text(g, 'pearl keys /\nsmall decisions', 620, 220, { size: 15, color: C.wine });
    stroked(g, [[box.x + box.w * .56, box.y + box.h * .39], [575, 220], [610, 220]], C.coral, 1, .7);}
    text(g, 'THE QUIETEST PART\nIS MADE OF AIR.', 745, 624, { size: 20, color: C.quiet, title: true });
  }
}

function drawBass(scene, g, time, boil) {
  const m = scene.small,view=scene.viewIndex?scene.views[scene.viewIndex]:null,reserved=m?{x:95,y:2,w:450,h:675}:{x:350,y:4,w:500,h:656},box=fitBox(view||scene.rig,reserved);
  const f = SCORE['double-bass'][scene.pose], amplitude = (scene.impulse === 'secondary' ? 15 : 10) * f;
  const center = [box.x + box.w * .50, box.y + box.h * .72];
  const bridgeY = box.y + box.h * .637;
  // Body resonance is a five-cel pressure field; the body itself stays anchored on its endpin.
  if(!view)for (const sign of [-1, 1]) for (let i = 0; i < 3; i++) {
    const wave = Array.from({ length: 39 }, (_, n) => { const a = -.95 + n / 38 * 1.9; return [center[0] + sign * (box.w * .31 + 24 + i * 20 + Math.abs(amplitude)) * Math.cos(a), center[1] + (box.h * .16 + i * 7) * Math.sin(a)]; });
    stroked(g, wave, i === 1 ? C.green : C.lime, 1 + i * .15, .25 + Math.abs(f) * .4);
  }
  drawRig(g, scene.rig, box, scene.id, scene.pose, boil,view);
  if(!view){for (let i = 0; i < 4; i++) {
    const x1 = box.x + box.w * (.486 + i * .0105), y1 = box.y + box.h * .16, x2 = box.x + box.w * (.45 + i * .025), y2 = box.y + box.h * .749;
    const string = Array.from({ length: 44 }, (_, n) => { const t = n / 43; return [x1 + (x2 - x1) * t + Math.sin(t * Math.PI) * amplitude * (i === scene.string ? 1 : .13), y1 + (y2 - y1) * t]; });
    stroked(g, string, i === scene.string ? '#fff6a8' : '#e5d2a1', i === scene.string ? 1.7 : .8, .95);
  }
  stroked(g, [[box.x + box.w * .4, bridgeY + 23], [box.x + box.w * .57, bridgeY + 23 + f * 3]], C.green, 1.4, .8);}
  if (m) {
    graph(scene, g, [[22, 748, 166, 65], [236, 748, 172, 65], [454, 748, 164, 65]], [[[188, 780], [228, 780]], [[408, 780], [449, 780]]]);
    text(g, 'the line remembers\nbeing straight.', 320, 879, { align: 'center', size: 22, color: C.green });
  } else {
    graph(scene, g, [[37, 153, 235, 66], [37, 310, 235, 66], [37, 501, 235, 66]], [[[154, 225], [154, 301]], [[154, 382], [154, 492]]]);
    if(!view){stroked(g, [[272, 343], [335, 343], [box.x + box.w * .48, box.y + box.h * .48]], C.green, 1, .7);
    text(g, 'FOUR LINES.\nONE VERY BAD IDEA.', 816, 141, { size: 19, color: C.green, title: true });
    text(g, 'bridge / temporary\nstructural unrest', 814, 459, { size: 15, color: C.green });
    stroked(g, [[810, 474], [746, 474], [box.x + box.w * .55, bridgeY]], C.green, .8, .65);
    text(g, 'endpin: still behaving.', 790, 631, { size: 14, color: C.green });}
  }
}

function drawRabbit(scene, g, time, boil) {
  const m = scene.small,view=scene.viewIndex?scene.views[scene.viewIndex]:null,reserved=m?{x:95,y:3,w:450,h:675}:{x:495,y:4,w:500,h:656},box=fitBox(view||scene.rig,reserved);
  const f = SCORE['rabbit-guitar'][scene.pose];
  const sourceX = box.x + box.w * .89, sourceY = box.y + box.h * .67;
  drawFeedbackArt(g, scene.feedback, sourceX, sourceY, Math.min(scene.W - sourceX - 18, 72 + Math.abs(f) * 18), time, {
    angle: -.17, reduced: scene.reduced, phaseOffset: scene.pose, opacity: .66,
  });
  drawRig(g, scene.rig, box, scene.id, scene.pose, boil,view);
  if(!view){for (let i = 0; i < 6; i++) {
    const top = [box.x + box.w * (.505 + i * .012), box.y + box.h * .21], bottom = [box.x + box.w * (.425 + i * .021), box.y + box.h * .773];
    const string = Array.from({ length: 37 }, (_, n) => { const t = n / 36; return [top[0] + (bottom[0] - top[0]) * t + Math.sin(t * Math.PI * 2) * f * (i === scene.string ? 6 : .25), top[1] + (bottom[1] - top[1]) * t]; });
    stroked(g, string, i === scene.string ? '#ffe9c9' : '#dbad65', .72, .75);
  }}
  const tail = [box.x + box.w * .80, box.y + box.h * .79], bell = [box.x + box.w * .716, box.y + box.h * .95];
  if (!view&&Math.abs(f) > .25) for (const sign of [-1, 1]) {
    stroked(g, [[bell[0] + sign * 20, bell[1] - 8], [bell[0] + sign * 29, bell[1] - 13]], C.gold, 1.4, .9);
    stroked(g, [[tail[0] + 25, tail[1] - 15], [tail[0] + 32, tail[1] - 20]], C.wine, 1, .7);
  }
  if (m) {
    graph(scene, g, [[22, 748, 166, 65], [236, 748, 172, 65], [454, 748, 164, 65]], [[[188, 780], [228, 780]], [[408, 780], [449, 780]]]);
    text(g, 'the button eye\nhas seen things.', 320, 879, { align: 'center', size: 22, color: C.wine });
  } else {
    graph(scene, g, [[55, 118, 250, 70], [160, 319, 250, 70], [55, 520, 250, 70]], [[[180, 196], [180, 248], [285, 248], [285, 310]], [[285, 397], [285, 442], [180, 442], [180, 511]]]);
    if(!view){text(g, 'a button,\nnot an alibi.', 80, 264, { size: 19, color: C.wine });
    stroked(g, [[410, 354], [470, 354], [box.x + box.w * .595, box.y + box.h * .594]], C.wine, 1, .55);
    text(g, 'PLEASE DO NOT\nFEED THE AMPLIFIER.', 85, 645, { size: 18, color: C.wine, title: true });
    text(g, 'cotton tail /\nuncensored tremolo', 1080, 620, { align: 'right', size: 13, color: C.wine });}
  }
}

/** Insert after the cast chapters and before the theatre. onSound receives {instrument, action, velocity}. */
export function createInstrumentChapters(host, { reducedMotion = false, onSound, onActivate } = {}) {
  if (!host || typeof host.append !== 'function') throw new TypeError('An instrument collection needs a DOM host.');
  const reduced = reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed = false, raf = 0, tick = -1, ready;
  const root = document.createElement('div'); root.className = 'instrument-collection';
  const style = document.createElement('style'); style.textContent = CSS; root.append(style);
  const intro = document.createElement('p'); intro.className = 'instrument-intro'; intro.textContent = INSTRUMENT_COPY.en.intro; root.append(intro);
  const scenes = INSTRUMENTS.map(id => {
    const copy = INSTRUMENT_COPY.en[id], chapter = document.createElement('section'); chapter.className = `instrument-chapter instrument-${id}`; chapter.id = `instrument-${NODE_IDS[id]}`; chapter.style.setProperty('--instrument-accent', accentFor(id)); chapter.style.setProperty('--instrument-mark', id === 'saxophone' ? '#f4b9ac' : id === 'double-bass' ? '#d5ec89' : '#f2a2bd');
    const titleId = `${chapter.id}-title`; chapter.setAttribute('aria-labelledby', titleId);
    chapter.innerHTML = `<header class="instrument-heading"><p class="instrument-eyebrow"><b>${copy.number}.</b><span>${copy.owner}</span></p><h2 class="instrument-title" id="${titleId}">${copy.title}</h2><p class="instrument-subtitle">${copy.sub}</p></header><figure class="instrument-figure"><canvas class="instrument-canvas" aria-hidden="true"></canvas><p class="instrument-loading">${INSTRUMENT_COPY.en.loading}</p><figcaption class="instrument-reader">${copy.caption}. ${copy.sub}</figcaption></figure><div class="instrument-controls"></div><p class="instrument-caption"><span>${copy.caption}</span><em>${copy.aside}</em></p>`;
    const scene = { id, chapter, copy, canvas: chapter.querySelector('canvas'), figure: chapter.querySelector('figure'), pose: 0,viewIndex:0,views:[],tickets:new Map(),shines:new Map(),enterTime:null,actionStart:0,string: 0, visible: false, dirty: true, rig: null, impulse: null, until: 0, arrows: new Map(), accent: accentFor(id), mark: id === 'saxophone' ? '#f5c4bd' : id === 'double-bass' ? '#d6eb9e' : '#f2b9ca' };
    copy.actions.forEach((label, index) => {
      const button = document.createElement('button'); button.className = 'instrument-control'; button.type = 'button'; button.disabled = true; button.dataset.instrumentAction = index === 0 ? 'primary' : 'secondary'; button.textContent = label;
      if (index === 0) button.dataset.node = NODE_IDS[id];
      button.addEventListener('click', () => { if (onActivate) onActivate(NODE_IDS[id]); scene.impulse = index ? 'secondary' : 'primary';const now=performance.now();
        // The front mechanical cel starts with the audible cue; the full view sequence follows.
        scene.actionStart=scene.enterTime=now-(reduced?0:HOLDS[id][0]+HOLDS[id][1]);scene.until=now+duration(id);scene.string=(scene.string+1)%(id==='double-bass'?4:6);scene.pose=reduced?(scene.pose+1)%5:2;scene.dirty=true;queueFrame();if(onSound)onSound({instrument:id,action:scene.impulse,velocity:index ? .8 : .6}); });
      chapter.querySelector('.instrument-controls').append(button);
    });
    root.append(chapter); return scene;
  });
  host.append(root);
  function resize(scene) {
    scene.small = matchMedia('(max-width:720px)').matches; scene.W = scene.small ? 640 : 1100; scene.H = scene.small ? 940 : 690;
    const width = scene.figure.getBoundingClientRect().width, dpr = Math.min(devicePixelRatio || 1, 1.6); scene.canvas.width = Math.max(1, Math.round(width * dpr)); scene.canvas.height = Math.max(1, Math.round(scene.canvas.width * scene.H / scene.W)); scene.arrows.clear(); scene.dirty = true;
  }
  function draw(scene, time) {
    if (!scene.rig) return;
    scene.viewIndex=VIEWS[scene.id][scene.pose];
    const g = scene.canvas.getContext('2d'); g.clearRect(0, 0, scene.canvas.width, scene.canvas.height); g.save(); g.scale(scene.canvas.width / scene.W, scene.canvas.height / scene.H);
    const boil = reduced ? 0 : Math.floor(time / (scene.id === 'saxophone' ? 310 : scene.id === 'double-bass' ? 170 : 230)) % 3;
    (scene.id === 'saxophone' ? drawSax : scene.id === 'double-bass' ? drawBass : drawRabbit)(scene, g, time, boil);
    g.restore(); scene.chapter.dataset.instrumentFrame = String(scene.pose);scene.chapter.dataset.instrumentView=['front','left','right'][scene.viewIndex]; scene.dirty = false;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const scene = scenes.find(s => s.figure === entry.target);
      scene.visible = entry.isIntersecting;
      if (scene.visible && scene.rig && scene.enterTime === null) scene.enterTime = performance.now();
      scene.dirty = true;
    }
    queueFrame();
  }, { rootMargin: '160px' });
  const resizeObserver = new ResizeObserver(() => {
    for (const scene of scenes) if (scene.rig) resize(scene);
    queueFrame();
  });
  resizeObserver.observe(root);
  function loadScene(scene) {
    return scene.load ??= prepareScene(scene);
  }
  async function prepareScene(scene) {
    if (disposed) return;
    try{
      const artwork=await Promise.all(['','-left','-right'].map(async suffix=>{const image=new Image();image.src=new URL(`../assets/instruments/${scene.id}${suffix}.webp`,import.meta.url).href;await image.decode();return image;}));
      if(disposed)return;const rig=makeRig(artwork[0],scene.id),views=[null,viewCanvas(artwork[1]),viewCanvas(artwork[2])];
      await Promise.all([prepareTickets(scene),document.fonts.load('18px "Special Elite"'),document.fonts.load('16px "Courier Prime"')]);
      if (scene.id === 'rabbit-guitar') {
        const { 'guitar-sound': feedback } = await loadFeedbackArt(['guitar-sound']);
        scene.feedback = feedback;
        scene.reduced = reduced;
      }

      const warm=canvas(1,1).getContext('2d'),ink=scene.id==='saxophone'?.35:scene.id==='double-bass'?.52:.85;
      for(const c of[rig.base,views[1].image,views[2].image]){if(disposed)return;drawBoiledSprite(warm,c,[0,0,c.width,c.height],[0,0,1,1],{phase:0,amplitude:ink});await new Promise(resolve=>setTimeout(resolve,0));}
      if(disposed)return;scene.views=views;scene.rig=rig;if(scene.visible)scene.enterTime=performance.now();resize(scene);draw(scene,0);scene.chapter.dataset.instrumentReady='true';scene.chapter.querySelector('.instrument-loading').remove();scene.chapter.querySelectorAll('button').forEach(b=>b.disabled=false);queueFrame();
    }catch(error){if(!disposed)scene.chapter.querySelector('.instrument-loading').textContent=INSTRUMENT_COPY.en.error;throw new Error(`Instrument artwork failed to load: ${scene.id}`,{cause:error});}
  }
  const preload = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      preload.unobserve(entry.target);
      const scene = scenes.find(s => s.figure === entry.target);
      void loadScene(scene).catch(error => { if (!disposed) console.error(error); });
    }
  }, { rootMargin: '900px' });
  for (const { figure } of scenes) {
    observer.observe(figure);
    preload.observe(figure);
  }
  function queueFrame() {
    if (!disposed && !raf && scenes.some(scene => scene.visible && scene.rig && (!reduced || scene.dirty))) {
      raf = requestAnimationFrame(frame);
    }
  }
  function frame(time) {
    raf = 0;
    if (disposed) return;
    const next = Math.floor(time / 100);
    if (!document.hidden && next !== tick) for (const scene of scenes) if (scene.visible && scene.rig) {
      if (!reduced) {
        if(scene.enterTime===null)scene.enterTime=time;
        scene.pose=heldPose(scene.id,time-(time<scene.until?scene.actionStart:scene.enterTime));
        if(time>=scene.until)scene.impulse=null;
      }
      if (!reduced || scene.dirty) draw(scene, time);
    }
    tick = next; queueFrame();
  }
  return {
    get ready() { return ready ??= Promise.all(scenes.map(loadScene)); },
    sections: Object.fromEntries(scenes.map(s => [NODE_IDS[s.id], s.chapter])),
    setNight(down) {
      Object.assign(C, down ? NIGHT : DAY);
      for (const scene of scenes) {
        scene.accent = accentFor(scene.id); scene.chapter.style.setProperty('--instrument-accent', scene.accent);
        scene.dirty = true;
        if (scene.tickets.size) prepareTickets(scene).then(() => { scene.dirty = true; }).catch(() => {});
      }
    },
    dispose() { disposed = true; cancelAnimationFrame(raf); observer.disconnect(); preload.disconnect(); resizeObserver.disconnect(); root.remove(); scenes.forEach(s => { s.rig = null;s.views=[];s.tickets.clear();s.shines.clear(); s.arrows.clear(); }); },
  };
}
