import { drawSkeleton } from './vendor/looseleaf/runtime/art-draw.mjs';
import { arrows } from './vendor/looseleaf/runtime/art/icons/arrows.mjs';
import { media } from './vendor/looseleaf/runtime/art/icons/media.mjs';
import { textNatureMisc } from './vendor/looseleaf/runtime/art/icons/text-nature-misc.mjs';
import { marks } from './vendor/looseleaf/runtime/art/doodles/marks.mjs';
import { loadFeedbackArt } from './src/feedback-art.mjs';
import { mountHeadingHighlights } from './src/heading-highlights.mjs';
import { seamCrossesRect, seamPath } from "./src/seam-layout.mjs";
import { NODES, EDGES, ROUTES, DEFAULT_ROUTE } from './src/story.mjs';
import { copy } from './src/copy.mjs';
import { sfx } from './src/sfx.mjs';
import { drawBoiledSprite, inkPhase, poseFrame, splitCastAtlas, splitCastSoon } from './src/ink-motion.mjs';
import { drawPencilArrow, pencilArrowPaths, makeTicketSvg } from './src/looseleaf.mjs';
import { drawMovingProp, PROP_SCORE } from './src/prop-motion.mjs';
import { createInstrumentChapters } from './src/instruments.mjs';
import { createRecordPlayer } from './src/record-player.mjs';
import { mountPaperPlayer } from './src/paper-player.mjs';
import { mountPaperStockSwitcher } from './src/paper-stock-switcher.mjs';
import { createRecordMusicController, RECORD_WORKBENCH_CSS } from './src/record-music.mjs';

const $ = (q) => document.querySelector(q);
const initialHash = location.hash, initialNavigation = new AbortController();
let initialNavigationCancelled = false;
for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'hashchange']) {
  addEventListener(event, () => { initialNavigationCancelled = true; }, { once: true, passive: true, signal: initialNavigation.signal });
}
const playerHost=document.querySelector('nav.player');
const player = mountPaperPlayer(playerHost);
player.sync({ playing: false, duration: '—:—', elapsed: 0, stepLabel: 'Preparing the record library.' });
for (const id of ['play', 'restart', 'speed', 'player-progress', 'player-sound']) playerHost.querySelector(`#${id}`).disabled = true;
const paperStock=mountPaperStockSwitcher($('#paper-stock-picker'));
document.querySelectorAll('[data-copy]').forEach(el => { const text = copy.page[el.dataset.copy]; if (text !== undefined) el.innerHTML = text; });
function drawPageIcon(slot) {
  const name = slot.dataset.inkIcon;
  const doodle = marks[name];
  const definition = doodle ?? media[name] ?? arrows[name] ?? textNatureMisc[name];
  if (!definition) return;
  const { w, h, pad, svg } = drawSkeleton(definition, 24, `jolly-page-${name}`, {
    kind: doodle ? 'doodle' : 'icon', tier: 'hi', grain: false, crisp: true, ink: 'ink',
  });
  slot.innerHTML = `<svg data-looseleaf-icon="${name}" viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}" aria-hidden="true" focusable="false">${svg}</svg>`;
}
document.querySelectorAll('[data-ink-icon]').forEach(drawPageIcon);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coverArt = $('.cover-art'), coverNumber = $('.cover>.eyebrow>span');
function alignCoverArt() {
  coverArt.style.translate = '';
  if (innerWidth <= 720) return;
  const underlineRight = $('.note-yoyo').getBoundingClientRect().right + 4;
  const offset = Math.min(0, coverNumber.getBoundingClientRect().right - underlineRight);
  coverArt.style.translate = `${offset}px 0`;
}
document.fonts.ready.then(alignCoverArt);
new ResizeObserver(alignCoverArt).observe($('.cover-layout'));

const C = { ink: '#2140d6', dark: '#193489', coral: '#e97780', coralText: '#a03953', green: '#376d34', lime: '#ade408', wine: '#8e1b2c', cream: '#fbf5e6', activeCard: '#f6ddd5' };
// The house lights, for the After Hours sample. Every drawing reads its ink from here, so a change is one repaint.
const HOUSE_UP = { ...C }, HOUSE_DOWN = { ink: '#efe6d0', dark: '#f2d48a', coral: '#f08a90', coralText: '#f7a6ac', green: '#b7d66a', lime: '#c9e85a', wine: '#ffb3bf', cream: '#2a1a12', activeCard: '#54202f' };
if (document.documentElement.dataset.house === 'down') Object.assign(C, HOUSE_DOWN);
let BOIL = 0, recordingActors = null, recordingProps = null, castFrames = [], motionReady = false, motionEpoch = 0;
const ACTOR_INK = { jojo: { fps:3.1, amount:1.9 }, lyly: { fps:6.4, amount:2.6 }, yoyo: { fps:4.7, amount:2.2 } };
const phaseAt = (time, fps = 5, salt = 0) => reduced ? 0 : Math.floor(Math.max(0,time) * fps / 1000 + salt) % 3;
const accentFor = id => [3,6].includes(nodeById.get(id)?.act) ? C.lime : [4,7,9].includes(nodeById.get(id)?.act) ? C.wine : nodeById.get(id)?.act===8?'#d7ad4e':C.coral;
const state = { route: DEFAULT_ROUTE, index: 0, started: false, playing: false, speed: 1, sound: false, elapsed: 0, changedAt: 0 };
const route = () => ROUTES[state.route];
const nodeById = new Map(NODES.map(n => [n.id, n]));
const desktop = [
  { checkin: [590, 90], premature: [590, 360] },
  { jojo: [680, 90], rest: [680, 320], detour: [680, 580] },
  { lyly: [785, 90], fork: [785, 224], hush: [590, 390], swing: [785, 390], roar: [985, 390], sync: [785, 610] },
  { yoyo: [925, 90], bite: [925, 400] },
];
const DESKTOP_H = [700, 720, 700, 640];
const NODE = { w: 230, h: 84, branchW: 170, branchH: 76 };
const nodeSize = (id, small) => isBranch(id) ? (small ? [186, 90] : [NODE.branchW, NODE.branchH]) : (small ? [365, 95] : [NODE.w, NODE.h]);
const REST_DETOUR = [[795, 91], [985, 105], [1050, 330], [985, 565], [795, 582]];
const REST_GAP = [.34, .66];
const mobile = [
  { checkin: [320, 575], premature: [320, 855] },
  { jojo: [320, 470], rest: [320, 690], detour: [320, 920] },
  { lyly: [320, 360], fork: [320, 555], hush: [110, 745], swing: [320, 745], roar: [530, 745], sync: [320, 950] },
  { yoyo: [320, 430], bite: [320, 665] },
];
const isBranch = id => ['hush', 'swing', 'roar'].includes(id);
const scenes = [];
copy.acts.forEach((act, i) => {
  const section = document.createElement('section');
  section.className = 'chapter'; section.id = `act-${i + 1}`;
  section.setAttribute('aria-labelledby', `act-title-${i + 1}`);
  section.innerHTML = `<header class="chapter-header"><div><p class="chapter-meta"><span class="roman">${act.roman}.</span>${act.tag}</p><h2 id="act-title-${i + 1}"><span class="chapter-title-ink">${act.title}</span></h2><p class="chapter-sub">${act.sub}</p></div><p class="chapter-side">${act.side.replace('\n', '<br>')}</p></header><div class="plate"><canvas aria-hidden="true"></canvas><div class="plate-nodes"></div>${i === 2 ? '<span class="branch-hint">↑ three ways to misbehave. pick one.</span>' : ''}</div><div class="plate-caption"><span>${act.caption}</span><span class="pencil-note">${act.aside}</span></div>`;
  $('#procedure').append(section);
  const scene = { section, canvas: section.querySelector('canvas'), plate: section.querySelector('.plate'), i, visible: false, dirty: true, buttons: new Map() };
  for (const n of NODES.filter(n => n.act === i + 1)) {
    const b = document.createElement('button'); b.className = 'node future' + (isBranch(n.id) ? ' branch' : ''); b.dataset.node = n.id;
    b.innerHTML = `<span class="node-tag">${isBranch(n.id) ? n.id.toUpperCase() : n.tag}</span><span class="node-label">${n.label.join('<br>')}</span><span class="node-index">${String(NODES.indexOf(n) + 1).padStart(2, '0')}</span>`;
    b.setAttribute('aria-label', `${n.label.join(' ')}. ${copy.notes[n.id]}`);
    b.addEventListener('click', () => { if (isBranch(n.id)) state.route = n.id; go(route().indexOf(n.id), { scroll: false }); });
    section.querySelector('.plate-nodes').append(b); scene.buttons.set(n.id, b);
  }
  scenes.push(scene);
});
const HOUSE_NOTES = [
  { objects:['trolley','looseleafTicket'], lines:['No luggage.','Plenty of baggage.'] },
  { objects:['champagne','vinyl'], lines:['The silence','is being decanted.'] },
  { objects:['shoe-tieclip','microphone'], lines:['No straight lines','beyond this point.'] },
  { objects:['do-not-disturb','rabbit-case'], lines:['Meet the','accomplices.'] },
];
const interludes=scenes.map((scene,i)=>{const element=document.createElement('div');element.className='house-interlude';element.setAttribute('role','img');element.setAttribute('aria-label',HOUSE_NOTES[i].lines.join(' '));element.innerHTML='<canvas aria-hidden="true"></canvas>';scene.section.insertBefore(element,scene.section.querySelector('.plate-caption'));return{plate:element,canvas:element.firstElementChild,i,visible:false,dirty:true}});
function resizeHouse(panel){const small=matchMedia('(max-width:720px)').matches;panel.W=small?640:1100;panel.H=small?225:150;panel.plate.style.aspectRatio=`${panel.W}/${panel.H}`;const r=panel.plate.getBoundingClientRect();panel.canvas.width=Math.round(r.width*Math.min(devicePixelRatio||1,2));panel.canvas.height=Math.round(panel.canvas.width*panel.H/panel.W);panel.dirty=true;}
// Optical bounds omit the transparent padding in the supplied interlude artwork.
const HOUSE_OPTICAL = [
  [[44, 454], [3, 129]],
  [[54, 418], [53, 491]],
  [[37, 361], [37, 473]],
  [[25, 451], [17, 359]],
];
function houseProps(panel) {
  const small = panel.W === 640;
  const optical = HOUSE_OPTICAL[panel.i];
  return HOUSE_NOTES[panel.i].objects.map((name, i) => {
    const im = images[name], [top, bottom] = optical[i];
    const height = small ? 116 : [0, 93, 102, 106][panel.i];
    const preferredWidth = panel.i === 0 ? (small ? [110, 136] : [132, 189])[i] : im.naturalWidth * height / (bottom - top);
    const width = small ? preferredWidth : .8 * Math.min(preferredWidth, (panel.H - 22) * im.naturalWidth / (bottom - top));
    const scale = width / im.naturalWidth;
    const center = panel.i === 0 ? (small ? [69, 555] : [110, 956])[i] : (small ? [86, 554] : [114, 986])[i];
    const rotation = panel.i === 2 && i === 1 ? .14 : panel.i === 3 && i === 0 ? -.23 : i ? .045 : -.035;
    return { name, x: center - width / 2, y: panel.H / 2 - (top + bottom) * scale / 2, width, rotation };
  });
}
function paintHouse(panel, time) {
  const g = panel.canvas.getContext('2d', { willReadFrequently: true }), scale = panel.canvas.width / panel.W;
  g.clearRect(0, 0, panel.canvas.width, panel.canvas.height);
  g.save(); g.scale(scale, scale);
  for (const object of houseProps(panel)) {
    drawMovingProp(g, images[object.name], object, time, { reducedMotion: reduced, age: (time - (panel.enterTime ?? time)) / 1000 });
  }
  const small = panel.W === 640, size = small ? 19 : 18;
  BOIL = phaseAt(time, 3.2, panel.i);
  const textY = panel.H / 2 - size * .29;
  note(g, HOUSE_NOTES[panel.i].lines.join('\n'), panel.W / 2, textY, {
    size, color: [C.ink, C.coralText, C.green, C.wine][panel.i], align: 'center', rotate: panel.i % 2 ? -.025 : .02,
  });
  g.restore(); panel.dirty = false;
}


function rng(seed) { let n = seed >>> 0; return () => { n += 0x6d2b79f5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function pen(g, points, { color = C.ink, width = 1.9, alpha = 1, seed = 0, close = false, dash = [] } = {}) {
  const r = rng(seed + BOIL * 7919), dense = [];
  for (let i = 0; i < points.length - 1; i++) { const a = points[i], b = points[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7)); for (let j = 0; j < n; j++) dense.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } dense.push(points.at(-1));
  g.save(); g.globalAlpha *= alpha; g.strokeStyle = g.createPattern(grain(color), 'repeat'); g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash);
  for (let pass = 0; pass < 3; pass++) { g.beginPath(); dense.forEach(([x, y], i) => { const j = .45 + width * .34, px = x + (r() - .5) * j, py = y + (r() - .5) * j; i ? g.lineTo(px, py) : g.moveTo(px, py); }); if (close) g.closePath(); g.globalAlpha *= pass ? .62 : 1; g.stroke(); } g.restore();
}
const grainCache = new Map();
function grain(color) {
  const key = color + BOIL; if (grainCache.has(key)) return grainCache.get(key);
  const tile = document.createElement('canvas'); tile.width = tile.height = 64; const g = tile.getContext('2d'), r = rng(hash(color) + BOIL * 7919);
  g.fillStyle = color; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1700; i++) { g.globalAlpha = r() * .8; g.fillRect(r() * 64, r() * 64, 1, 1); }
  grainCache.set(key, tile); return tile;
}
function hatch(g, path, box, color, alpha = .25, gap = 6) {
  g.save(); g.clip(path); g.globalAlpha = alpha; g.strokeStyle = g.createPattern(grain(color), 'repeat'); g.lineWidth = 1.6;
  for (let x = box.x - box.h; x < box.x + box.w + box.h; x += gap) { g.beginPath(); g.moveTo(x, box.y); g.lineTo(x + box.h, box.y + box.h); g.stroke(); } g.restore();
}
function ticket(g, x, y, w, h, { active = false, id = '', header = true } = {}) {
  const r = rng(hash(id)); const points = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2 + 1]];
  for (let i = 0; i <= 6; i++) points.push([x + w / 2 - i % 2 * 3, y - h / 2 + h * i / 6]);
  for (let i = 0; i <= 15; i++) points.push([x + w / 2 - w * i / 15, y + h / 2 + (i % 2 ? -4 : 1) + r()]);
  points.push([x - w / 2 + 1, y - h / 2]); const p = new Path2D(); points.forEach(([a, b], i) => i ? p.lineTo(a, b) : p.moveTo(a, b)); p.closePath();
  g.save(); g.shadowColor = '#453f3715'; g.shadowBlur = 0; g.shadowOffsetX = 5; g.shadowOffsetY = 5; g.fillStyle = active ? C.activeCard : C.cream; g.fill(p); g.restore();
  hatch(g, p, { x: x - w / 2, y: y - h / 2, w, h }, accentFor(id), active ? .45 : .19, 4.1);
  pen(g, points, { seed: hash(id), close: true, color: active ? C.wine : C.ink, width: active ? 2.3 : 1.6 });
  if (header) pen(g, [[x - w / 2 + 9, y - h / 2 + 21], [x + w / 2 - 9, y - h / 2 + 20]], { color: C.coral, alpha: .6, width: .8, seed: 17 });
  g.save(); g.fillStyle = active ? C.wine : C.ink; g.beginPath(); g.arc(x, y - h / 2 - 1, 4, 0, Math.PI * 2); g.fill(); g.restore();
  if (active) { const ext = points.map(([a, b]) => [x + (a - x) * 1.06, y + (b - y) * 1.13]); pen(g, ext, { seed: 91, close: true, color: C.coral, alpha: .65, width: 1.6 }); }
}
function note(g, text, x, y, { size = 16, color = C.ink, rotate = 0, align = 'left' } = {}) {
  g.save(); g.translate(x, y); g.rotate(rotate); g.font = `italic ${size}px "Courier Prime"`; g.fillStyle = size >= 17 ? g.createPattern(grain(color), 'repeat') : color; g.textAlign = align;
  text.split('\n').forEach((line, i) => g.fillText(line, 0, i * size * 1.3)); g.restore();
}
const BRANCH_WAVE = { hush: 3, swing: 15, roar: 15 };
function branchPath(start, end, branch) {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  const teeth = branch === 'roar' ? 10 : 34;
  return Array.from({ length: teeth + 1 }, (_, i) => {
    const t = i / teeth;
    const bend = branch === 'roar'
      ? (i % 2 ? 1 : -1)
      : Math.sin(t * Math.PI * (branch === 'hush' ? 2 : 4));
    const offset = (i === 0 || i === teeth ? 0 : bend) * BRANCH_WAVE[branch] * Math.sin(t * Math.PI);
    return [start[0] + dx * t - dy / length * offset, start[1] + dy * t + dx / length * offset];
  });
}

function pointsFor(scene, edge) {
  const a = scene.pos[edge.from], b = scene.pos[edge.to]; if (!a || !b) return null;
  const inset = id => scene.small ? (isBranch(id) ? 92 * .41 : 46) : nodeSize(id, false)[1] / 2;
  const start = [a[0], a[1] + inset(edge.from)], end = [b[0], b[1] - inset(edge.to) - 9];
  if (!scene.small) {
    if (edge.from === 'rest') return [start, end];
    const branch = isBranch(edge.from) ? edge.from : edge.to;
    if (isBranch(branch)) {
      const offset = branch === 'hush' ? -48 : branch === 'roar' ? 48 : 0;
      if (edge.from === 'fork') start[0] += offset;
      else end[0] += offset;
      return branchPath(start, end, branch);
    }
  }
  const middleY = start[1] + (end[1] - start[1]) * .5;
  const points = [start];
  if (Math.abs(a[0] - b[0]) > 15) points.push([start[0], middleY - 12], [start[0] + (b[0] - a[0]) * .08, middleY], [b[0] - (b[0] - a[0]) * .08, middleY], [b[0], middleY + 12]);
  else points.push([a[0] + Math.sin(scene.i) * 6, middleY]);
  points.push(end); return points;
}
const arrowCache = new Map();
function arrow(g, points, opts = {}) {
  const key = JSON.stringify([points.map(p => p.map(n => +n.toFixed(1))), opts.seed, opts.width, BOIL]);
  if (!arrowCache.has(key)) { if (arrowCache.size > 400) arrowCache.delete(arrowCache.keys().next().value); arrowCache.set(key, pencilArrowPaths(points, { seed: String(opts.seed || 'jolly'), frame: BOIL, width: opts.width || 2.2, strength: .72, reducedMotion: reduced })); }
  g.save(); g.globalAlpha *= opts.alpha ?? 1; drawPencilArrow(g, null, { paths: arrowCache.get(key), color: opts.color || C.ink }); g.restore();
}
const images = {};
async function loadImage(name, path) { const im = new Image(); im.src = path; await im.decode(); images[name] = im; }
function sprite(g, who, x, y, height) {
  if (recordingActors) { recordingActors.push({ who, x, y, height }); return; }
  drawActor(g, { who, x, y, height }, 0);
}
function drawActor(g, actor, time) {
  const { who, x, y, height } = actor, base = castFrames[0][who], image = castFrames[poseFrame(motionReady ? time - motionEpoch : 0, who, reduced)][who];
  const scale = height / base.height, w = image.width * scale, h = image.height * scale, cx = x + base.width * scale / 2;
  const ink=ACTOR_INK[who];
  drawBoiledSprite(g, image, [0, 0, image.width, image.height], [cx - w / 2, y + height - h, w, h], { phase:phaseAt(time,ink.fps,hash(who)%5), amplitude:ink.amount });
}
function prop(g, name, x, y, width, rotation = 0) {
  if (recordingProps) { recordingProps.push({ name, x, y, width, rotation }); return; }
  const im = images[name]; if (!im) return; const h = width * im.naturalHeight / im.naturalWidth;
  g.save(); g.translate(x + width / 2, y + h / 2); g.rotate(rotation); drawBoiledSprite(g, im, [0, 0, im.naturalWidth, im.naturalHeight], [-width / 2, -h / 2, width, h], { phase: BOIL, amplitude: .75 }); g.restore();
}
function circle(g, x, y, radius, color = C.ink) { const pts = Array.from({ length: 46 }, (_, i) => [x + Math.cos(i / 45 * Math.PI * 2) * radius, y + Math.sin(i / 45 * Math.PI * 2) * radius]); pen(g, pts, { close: true, color, seed: 33 }); }
function drawIllustration(g, scene) {
  const m = scene.small;
  if (scene.i === 0) {
    prop(g, 'hotel', m ? 86 : 15, m ? -16 : 220, m ? 420 : 400);
    prop(g, 'clock', m ? 519 : 448, m ? 39 : 210, m ? 77 : 74, .04);
    sprite(g, 'jojo', m ? 61 : 909, m ? 330 : 430, m ? 172 : 250);
    sprite(g, 'lyly', m ? 229 : 605, m ? 318 : 410, m ? 193 : 280);
    sprite(g, 'yoyo', m ? 428 : 783, m ? 391 : 523, m ? 113 : 157);
    note(g, 'the staff have been briefed.\nthe staff have other plans.', m ? 320 : 215, m ? 981 : 618, { align: 'center', color: C.coralText, size: m ? 17 : 16, rotate: -.035 });
    const sx = m ? 600 : 940, sy = m ? 617 : 80;
    const shortcut = m
      ? [[sx - 3, sy], [sx, sy + 160], [sx - 48, sy + 210]]
      : [[705, 92], [850, 101], [968, 170], [940, 282]];
    arrow(g, shortcut, { color: C.wine, alpha: m ? .45 : .85, seed: 88 });
    note(g, 'END?', sx - 8, sy + 242, { color: C.wine, size: m ? 23 : 25, align: 'center', rotate: .1 });
    pen(g, [[sx - 52, sy + 230], [sx + 25, sy + 244]], { color: C.coral, width: 2.5 });
    note(g, 'too soon.', sx - 72, sy + 280, { color: C.coralText, rotate: -.1, size: m ? 17 : 16 });
  } else if (scene.i === 1) {
    sprite(g, 'jojo', m ? 62 : 75, m ? 25 : 225, m ? 330 : 485);
    prop(g, 'metronome', m ? 481 : 900, m ? 40 : 205, m ? 92 : 84, .08);
    note(g, m ? 'she has nothing to add.' : 'she has\nnothing to add.', m ? 345 : 868, m ? 405 : 345, { color: C.coralText, size: 18, align: m ? 'center' : 'left', rotate: -.035 });
    const x = m ? 471 : 680, y = m ? 196 : 446;
    const restMark = m
      ? [[x, y - 32], [x - 10, y - 3], [x + 12, y - 8], [x - 4, y + 15], [x + 12, y + 33]]
      : [[x - 2, y - 18], [x - 12, y - 3], [x + 10, y - 8], [x - 6, y + 10], [x + 8, y + 18]];
    pen(g, restMark, { width: 4, color: C.ink, seed: 41 });
    note(g, 'a rest,\nnot a delay.', m ? x + 15 : 505, m ? y + 69 : 445, { color: C.ink, size: m ? 17 : 18, rotate: .06 });
    if (!m) {
      circle(g, 442, 328, 11, C.coral);
      arrow(g, [[454, 326], [515, 310], [565, 318]], { color: C.coral, width: 1.6, seed: 4 });
    }
  } else if (scene.i === 2) {
    sprite(g, 'lyly', m ? 85 : 10, m ? -5 : 190, m ? 314 : 505);
    prop(g, 'chandelier', m ? 435 : 965, 4, m ? 142 : 108);
    note(g, 'again.', m ? 355 : 505, m ? 150 : 640, { color: C.green, size: m ? 22 : 27, rotate: -.09 });
    note(g, '(the last time)', m ? 356 : 504, m ? 176 : 671, { color: C.green, size: m ? 14 : 16 });
    if (!m) {
      for (let i = 0; i < 4; i++) {
        pen(g, [[367, 425 + 9 * i], [480, 335 + 10 * i], [670, 211 + 8 * i]], { color: C.green, alpha: .55, width: 1.3, seed: i + 100 });
      }
    }
  } else {
    sprite(g, 'yoyo', m ? 157 : 440, m ? -5 : 205, m ? 278 : 420);
    prop(g, 'bell', m ? 429 : 70, m ? 90 : 500, 104, .16);
    note(g, 'quality control.', m ? 340 : 205, m ? 305 : 566, { align: m ? 'center' : 'left', color: C.wine, size: m ? 20 : 21, rotate: -.045 });
    if (!m) {
      arrow(g, [[100, 434], [176, 425], [244, 391], [298, 333], [350, 308], [405, 312]], { color: C.wine, width: 2.1, alpha: .52, seed: 88 });
      note(g, 'this line looked\ndelicious.', 96, 330, { color: C.wine, size: 17, rotate: -.1 });
    }
    const x = m ? 70 : 830, y = m ? 645 : 300;
    pen(g, [[x, y - 38], [x + 20, y - 32], [x + 4, y - 16], [x + 23, y - 2], [x + 5, y + 16], [x + 21, y + 30], [x, y + 36]], { color: C.wine, seed: 6, width: 2.7 });
    note(g, 'nom.', x - (m ? 9 : 59), y + 77, { color: C.wine, size: 20, rotate: -.13 });
  }
  // Registration marks belong to the print, not the moving actors.
  const bottom = scene.H - 22; pen(g, [[12, bottom], [29, bottom]], { alpha: .35, width: 1 }); pen(g, [[20, bottom - 8], [20, bottom + 8]], { alpha: .35, width: 1 });
}
function buildScene(scene) {
  scene.small = matchMedia('(max-width:720px)').matches; scene.W = scene.small ? 640 : 1100; scene.H = scene.small ? (scene.i === 3 ? 850 : 1050) : DESKTOP_H[scene.i];
  scene.plate.style.aspectRatio = `${scene.W} / ${scene.H}`;
  scene.pos = (scene.small ? mobile : desktop)[scene.i];
  const rect = scene.plate.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); scene.px = Math.round(rect.width * dpr);
  scene.padX = 50*dpr; scene.padY = 20*dpr;
  scene.canvas.style.cssText = 'left:-50px;top:-20px;width:calc(100% + 100px);height:calc(100% + 40px)';
  scene.canvas.width = scene.px + scene.padX*2; scene.canvas.height = Math.round(scene.px * scene.H / scene.W) + scene.padY*2;
  scene.layers = []; scene.actors = []; scene.props = [];
  for (let phase = 0; phase < 3; phase++) {
  BOIL = phase;
  const layer = document.createElement('canvas'); layer.width = scene.canvas.width; layer.height = scene.canvas.height;
  const g = layer.getContext('2d', { willReadFrequently: true }); g.translate(scene.padX,scene.padY); g.scale(scene.px / scene.W, scene.px / scene.W);
  recordingActors = phase === 0 ? scene.actors : []; recordingProps = phase === 0 ? scene.props : []; drawIllustration(g, scene); recordingActors = null; recordingProps = null;
  scene.edgePoints = new Map();
  for (const e of EDGES) {
    const points = pointsFor(scene, e); if (!points) continue;
    scene.edgePoints.set(`${e.from}:${e.to}`, points);
  }
  scene.buttons.forEach((button, id) => {
    const [x, y] = scene.pos[id], [w, h] = nodeSize(id, scene.small);
    button.querySelector('.node-label').innerHTML = (scene.small && copy.compactNodes[id] ? copy.compactNodes[id] : nodeById.get(id).label).join('<br>');
    button.style.left = `${x / scene.W * 100}%`; button.style.top = `${y / scene.H * 100}%`;
    button.style.width = `${w / scene.W * 100}%`; button.style.height = `${h / scene.H * 100}%`;
  });
  scene.layers.push(layer);
  }
  scene.layer = scene.layers[0];
  if (scene.inReach) settleScene(scene);
  scene.dirty = true;
}
function pointAt(points, t) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1])), sum = lengths.reduce((a, b) => a + b, 0); let d = sum * t;
  for (let i = 0; i < lengths.length; i++) { if (d <= lengths[i] || i === lengths.length - 1) { const f = lengths[i] ? d / lengths[i] : 0; return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f]; } d -= lengths[i]; } return points.at(-1);
}
function partialPath(points, progress){
  if(progress>=1)return points;if(progress<=0)return[points[0],[points[0][0],points[0][1]+.1]];
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);let remaining=total*progress;const out=[points[0]];
  for(let i=0;i<lengths.length;i++){if(remaining>=lengths[i]){out.push(points[i+1]);remaining-=lengths[i]}else{const f=remaining/lengths[i];out.push([points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f]);break}}return out;
}
function drawDiagram(g,scene,time){
  const ids=route(),id=ids[state.index],elapsed=reduced?10:Math.max(0,(time-state.changedAt)/1000),arrival=Math.min(1,elapsed/1.1);
  for(const edge of EDGES){const points=scene.edgePoints.get(`${edge.from}:${edge.to}`);if(!points)continue;
    const to=ids.indexOf(edge.to),from=ids.indexOf(edge.from),visited=state.started&&to>=0&&from>=0&&to<=state.index,active=visited&&edge.to===id;
    BOIL=phaseAt(time,3.2+(hash(edge.to)%25)/10,hash(edge.from)%7);
    const progress = active ? arrival * arrival * (3 - 2 * arrival) : 1;
    const gapped = !scene.small && edge.from === 'rest';
    const baseStyle = { color: C.ink, width: 2.3, alpha: .9, seed: hash(edge.from + edge.to) };
    const highlight = { color: accentFor(edge.to), width: 4.5, alpha: .95, seed: hash(edge.from) };
    if (gapped) {
      const [gapStart, gapEnd] = REST_GAP;
      const stroke = (amount, style) => {
        if (amount > 0) pen(g, [points[0], pointAt(points, Math.min(amount, gapStart))], style);
        if (amount > gapEnd) arrow(g, [pointAt(points, gapEnd), pointAt(points, amount)], style);
      };
      stroke(1, baseStyle);
      if (visited) stroke(progress, highlight);
    } else {
      arrow(g, points, baseStyle);
      if (visited) {
        const path = partialPath(points, progress);
        arrow(g, path, highlight);
        arrow(g, path, { ...highlight, color: C.ink, width: 1.25, alpha: .8 });
      }
    }
    if (active && arrival < 1 && (!gapped || progress < REST_GAP[0] || progress > REST_GAP[1])) {
      const [x, y] = pointAt(points, progress);
      g.fillStyle = '#d5a339'; g.beginPath(); g.arc(x, y, 5.2, 0, Math.PI * 2); g.fill();
    }
    if(!isBranch(edge.from)&&!isBranch(edge.to)){
      let text=edge.label;if(scene.small&&text.length>25)text=text.replace('the procedure','it').replace('the shortcut','it');
      if(active&&elapsed<1.5)text=text.slice(0,Math.floor(Math.max(0,elapsed-.25)/1.1*text.length));
      const lines=[];let line='';for(const word of text.split(' ')){if((line+' '+word).trim().length>(scene.small?22:24)){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line);
      const labelY = (points[0][1] + points.at(-1)[1]) / 2 - (lines.length - 1) * 10;
      note(g, lines.join('\n'), points[0][0] + 21, labelY - (gapped ? 44 : 0), { size: scene.small ? 18 : 16 });
    }
  }
  scene.buttons.forEach((b,bid)=>{const[x,y]=scene.pos[bid],active=state.started&&bid===id,[w,h]=nodeSize(bid,scene.small);
    BOIL=phaseAt(time,2.7+(hash(bid)%26)/10,hash(bid)%13);
    const p=active&&!reduced?Math.min(1,elapsed/.55):1,pop=active&&!reduced?.86+.14*p+Math.sin(p*Math.PI)*.04:1;
    g.save();g.translate(x,y);g.scale(pop,pop);ticket(g,0,0,w,h,{id:bid,active});g.restore();
  });
}
function paintScene(scene, time) {
  BOIL = inkPhase(time, reduced);
  const g = scene.canvas.getContext('2d', { willReadFrequently: true }); g.clearRect(0, 0, scene.canvas.width, scene.canvas.height); g.save(); g.translate(scene.padX,scene.padY); g.scale(scene.px / scene.W, scene.px / scene.W);
  if (scene.i === 0) {
    for (const { who, x, y, height } of scene.actors) {
      const base = castFrames[0][who], width = height * base.width / base.height;
      g.save();
      g.translate(x + width / 2, y + height - 5);
      g.scale(width * .44, height * .032);
      const shade = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      shade.addColorStop(0, 'rgba(76,56,38,.30)');
      shade.addColorStop(.45, 'rgba(76,56,38,.19)');
      shade.addColorStop(1, 'rgba(76,56,38,0)');
      g.fillStyle = shade;
      g.fillRect(-1, -1, 2, 2);
      g.restore();
    }
  }
  scene.actors.forEach(actor => drawActor(g, actor, time));
  scene.props.forEach(object => drawMovingProp(g, images[object.name], object, time, { reducedMotion: reduced, age: (time-(scene.enterTime||0))/1000, rest: route()[state.index]==='rest', cast: castFrames[0] }));g.restore();
  g.drawImage(scene.layers[BOIL], 0, 0); g.save(); g.translate(scene.padX,scene.padY); g.scale(scene.px / scene.W, scene.px / scene.W);
  drawDiagram(g,scene,time);
  const id = route()[state.index];
  if (scene.i === 1 && !scene.small) {
    BOIL = inkPhase(time, reduced);
    const detouring = state.started && id === 'detour';
    arrow(g, REST_DETOUR, { color: detouring ? C.wine : C.coral, width: detouring ? 3 : 2, seed: 171 });
  }
  if (state.started && scene.pos[id]) drawPerformance(g, scene, id, time);
  g.restore(); scene.dirty = false;
}
function drawPerformance(g, scene, id, time) {
  const t = reduced ? 0 : time / 1000, m = scene.small;
  if (scene.i === 1) {
    const x = m ? 345 : 505, y = m ? 185 : 520;
    for (let i = 0; i < 3; i++) { const ps = Array.from({ length: 19 }, (_, n) => [x + n * 5, y + i * 15 + Math.sin(n * .35 - t * 2 + i) * 5]); pen(g, ps, { color: C.coral, alpha: .25 + i * .07, width: 1.3, seed: i }); }
    if (m && id === 'detour') arrow(g, [[510, 511], [563, 530], [563, 974], [520, 992]], { color: C.coral, width: 1.8, dash: [4, 5], seed: 171 });
  }
  if (scene.i === 2) {
    const x = m ? 285 : 480, y = m ? 231 : 335, span = m ? 130 : 145;
    for (let i = 0; i < 3; i++) { const ps = Array.from({ length: 27 }, (_, n) => [x + n / 26 * span, y + i * 12 + Math.sin(n / 26 * Math.PI) * Math.sin(t * 7 + i * .7) * (id === 'roar' ? 13 : 7)]); pen(g, ps, { color: '#719245', alpha: .65, width: 1.5, seed: i + 91 }); }
    if (!m) note(g, id === 'hush' ? 'pianissimo. allegedly.' : id === 'roar' ? 'fortissimo. obviously.' : 'swing, not straight.', 900, 226, { color: C.green, size: 16, rotate: -.02 });
  }
  if (scene.i === 3 && ['bite', 'encore', 'bow'].includes(id)) {
    const x = m ? 89 : 416, y = m ? 525 : 312;
    for (let i = 0; i < 5; i++) { const a = i * 1.1 + .2, d = 17 + (reduced ? 7 : Math.sin(t * 2 + i) * 4); pen(g, [[x + Math.cos(a) * d, y + Math.sin(a) * d], [x + Math.cos(a) * (d + 7), y + Math.sin(a) * (d + 7)]], { color: C.wine, alpha: .7, width: 1.3, seed: i }); }
    if (id === 'encore' || id === 'bow') {
      g.save(); g.translate(m ? 111 : 650, m ? 153 : 108); g.rotate(-.09); g.strokeStyle = C.wine; g.lineWidth = 2; g.strokeRect(-79, -25, 158, 49); g.font = '24px "Special Elite"'; g.textAlign = 'center'; g.fillStyle = C.wine; g.fillText('ENCORE', 0, 8); g.restore();
    }
    if (id === 'bow') {
      const x0 = m ? 555 : 1000, y0 = m ? 1008 : 600; arrow(g, [[x0 - 18, y0 + Math.sin(t * 3) * 4], [x0, y0 - 15 + Math.cos(t * 3) * 4], [x0 + 21, y0 - 5]], { color: C.coral, width: 2, seed: 3 });
      const sx = m ? 373 : 380, sy = m ? 252 : 470;
      const spare = Array.from({ length: 50 }, (_, i) => { const a = i / 49 * Math.PI * 4; const r = 3 + i / 49 * 13; return [sx + Math.cos(a) * r, sy + Math.sin(a) * r]; });
      pen(g, [[sx - 25, sy - 28], ...spare], { color: C.wine, width: 1.3, seed: 203 }); note(g, 'spare.', sx - 12, sy + 36, { color: C.wine, size: m ? 15 : 12, rotate: -.09 });
    }
  }
}
// null until the visitor has chosen; the door's choice carries over into the page.
let soundChoice = null;
function setSound(on, chosen = true) {
  state.sound = on; if (chosen) soundChoice = on;
  $('#sound').setAttribute('aria-pressed', String(on)); $('#sound .sound-label').textContent = on ? copy.ui.soundOn : copy.ui.soundOff;
}
async function soundFor(id) {
  if (!state.sound || id === 'rest') return;
  try {
    const instrument = id==='rabbit'?'guitar':['yoyo', 'bite', 'encore', 'bow', 'checkin','side-b'].includes(id) ? 'bell' : id==='bass'||nodeById.get(id)?.act === 3 ? 'bass' : 'sax';
    await sfx.play(instrument, { gain: .7 });
  } catch { setSound(false, false); }
}
const adoptDoorSound = () => { if (window.jollyDoorSound !== undefined && soundChoice === null) setSound(window.jollyDoorSound); };
addEventListener('jolly:door-sound', adoptDoorSound);
const SEAM_EDGES = EDGES.filter(edge => nodeById.get(edge.from).act !== nodeById.get(edge.to).act);
const SEAM_SWEEPS = { 'sync:yoyo': {}, 'bite:sax': { x: .53, at: .56 }, 'bass:rabbit': { x: .77, at: .64 } };
const COMPACT_SEAM_SWEEPS = { 'bite:sax': { x: .53, at: .68 }, 'bass:rabbit': { x: .82, at: .60 } };
// Match the existing instrument tickets; the figures retain their own layout.
const INSTRUMENT_PORTS = { sax: [857.5, 96, 552], bass: [154.5, 153, 567], rabbit: [180, 118, 590] };
const main = $('main');
const spine = document.createElement('div');
spine.id = 'spine';
spine.setAttribute('aria-hidden', 'true');
main.append(spine);
const seams = SEAM_EDGES.map(edge => {
  const canvas = document.createElement('canvas');
  canvas.className = 'seam';
  canvas.dataset.edge = edge.from + ':' + edge.to;
  canvas.hidden = true;
  spine.append(canvas);
  return { edge, canvas, plate: canvas, visible: false, dirty: true };
});

function seamAnchor(id, outgoing) {
  const scene = scenes.find(item => item.buttons.has(id));
  if (scene) {
    const rect = scene.buttons.get(id).getBoundingClientRect();
    return [rect.left + rect.width / 2, outgoing ? rect.bottom : rect.top - 8];
  }
  if (INSTRUMENT_PORTS[id]) {
    const [x, entry, exit] = INSTRUMENT_PORTS[id];
    const rect = $(`#instrument-${id} .instrument-figure`)?.getBoundingClientRect();
    if (rect) return [rect.left + rect.width * x / 1100, rect.top + rect.height * (outgoing ? exit : entry - 7) / 690];
  }
  const selector = { encore: '.theatre-heading .eyebrow', bow: '.theatre-cues', 'side-b': '#record-finale .record-kicker' }[id];
  const rect = selector && $(selector)?.getBoundingClientRect();
  return rect && [rect.left + rect.width / 2, outgoing ? rect.bottom + 5 : rect.top - 9];
}

function layoutSeams() {
  if (scenes.some(scene => !scene.actors)) return;
  if (matchMedia('(max-width:720px)').matches) {
    for (const seam of seams) seam.canvas.hidden = true;
    return;
  }
  const bounds = main.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
  const compact = matchMedia('(max-width:1100px)').matches, narrowPortrait = matchMedia('(max-width:1000px)').matches;
  const relative = ([x, y]) => [x - bounds.left, y - bounds.top];
  const box = (left, top, right, bottom) => [left - bounds.left, top - bounds.top, right - bounds.left, bottom - bounds.top];
  const range = document.createRange(), portraitBounds = [];
  const obstacles = [...main.querySelectorAll('.chapter-header p,.chapter h2,.plate-caption span,.instrument-heading p,.instrument-title,.instrument-intro,.instrument-control,.instrument-caption>*,.instrument-cameo')]
    .flatMap(element => {
      if (element.matches('button, canvas')) {
        const r = element.getBoundingClientRect();
        if (element.matches('.instrument-cameo')) {
          const scale = r.width / element.width;
          // Keep the full-size IV–V route steady as the portraits approach it.
          portraitBounds.push(...trioStops().map(([x, foot]) => box(r.left + (x - 235) * scale, r.top + (foot - 325) * scale,
            r.left + (x + 235) * scale, r.top + foot * scale)));
          return narrowPortrait ? portraitBounds : [];
        }
        return [box(r.left, r.top, r.right, r.bottom)];
      }
      range.selectNodeContents(element);
      return [...range.getClientRects()].filter(r => r.width).map(r => box(r.left, r.top, r.right, r.bottom + (element.matches('h2') ? 8 : 0)));
    });
  for (const scene of scenes) {
    const rect = scene.plate.getBoundingClientRect(), scale = rect.width / scene.W;
    for (const actor of scene.actors) {
      const base = castFrames[0][actor.who], scaleArt = actor.height / base.height;
      const maxWidth = Math.max(...castFrames.map(frame => frame[actor.who].width)) * scaleArt;
      const maxHeight = Math.max(...castFrames.map(frame => frame[actor.who].height)) * scaleArt;
      const center = actor.x + base.width * scaleArt / 2;
      obstacles.push(box(rect.left + (center - maxWidth / 2) * scale, rect.top + (actor.y + actor.height - maxHeight) * scale,
        rect.left + (center + maxWidth / 2) * scale, rect.top + (actor.y + actor.height) * scale));
    }
  }

  // The illustrations and interlude captions are painted on canvas rather than exposed as DOM text.
  const reserve = (element, designWidth, [x, y, w, h]) => {
    if (!element) return;
    const r = element.getBoundingClientRect(), scale = r.width / designWidth;
    obstacles.push(box(r.left + x * scale, r.top + y * scale, r.left + (x + w) * scale, r.top + (y + h) * scale));
  };
  for (const panel of interludes) {
    reserve(panel.plate, panel.W, [450, panel.H / 2 - 31, 200, 56]);
    for (const object of houseProps(panel)) {
      const im = images[object.name], height = object.width * im.naturalHeight / im.naturalWidth;
      reserve(panel.plate, panel.W, [object.x - 4, object.y, object.width + 8, height]);
    }
  }
  reserve($('#instrument-sax .instrument-figure'), 1100, [740, 607, 240, 57]);
  reserve($('#instrument-bass .instrument-figure'), 1100, [530, 1, 155, 145]);
  reserve($('#instrument-rabbit .instrument-figure'), 1100, [80, 625, 240, 55]);
  reserve($('#instrument-rabbit .instrument-figure'), 1100, [510, 542, 480, 125]);

  const labelObstacles = narrowPortrait ? obstacles : [...obstacles, ...portraitBounds];
  const context = seams[0].canvas.getContext('2d');
  context.font = 'italic 16px "Courier Prime"';
  const layouts = seams.map(seam => {
    const start = seamAnchor(seam.edge.from, true), end = seamAnchor(seam.edge.to, false);
    if (!start || !end) return null;
    const key = seam.canvas.dataset.edge;
    const sweep = (compact && COMPACT_SEAM_SWEEPS[key]) || SEAM_SWEEPS[key];
    const points = seamPath(relative(start), relative(end), obstacles, sweep && {
      at: sweep.at, x: sweep.x == null ? undefined : sweep.x * bounds.width,
    });
    const width = Math.ceil(context.measureText(seam.edge.label).width) + 4;
    const labels = [.42, .3, .55, .66, .22, .75, .15, .84, .09, .94].flatMap(progress => {
      const [x, y] = pointAt(points, progress);
      return [[x + 20, y], [x - width - 20, y]];
    });
    let label = labels.find(([x, y]) => {
      if (x < 12 || x + width >= bounds.width - 12) return false;
      const labelBox = [x - 4, y - 20, x + width + 4, y + 7];
      const [left, top, right, bottom] = labelBox;
      return !labelObstacles.some(([l, t, r, b]) => left < r && right > l && top < b && bottom > t)
        && !points.slice(1).some((point, i) => seamCrossesRect(points[i], point, labelBox));
    });
    if (seam.edge.from === 'detour' && seam.edge.to === 'lyly') {
      const panel = interludes[1], vinyl = houseProps(panel)[1], rect = panel.plate.getBoundingClientRect();
      const scale = rect.width / panel.W;
      const center = relative([rect.left + (vinyl.x + vinyl.width / 2) * scale,
        rect.top + (vinyl.y + vinyl.width * 491 / 544) * scale + 25]);
      label = [center[0] - (width - 4) / 2, center[1]];
    }
    let captions = label && key !== 'bite:sax' ? [[seam.edge.label, ...label]] : [];
    if (key === 'bow:side-b') {
      const [x, y] = pointAt(points, .47);
      const leftPhrase = 'the night asks', rightPhrase = 'for the other side';
      captions = [[leftPhrase, x - 16 - context.measureText(leftPhrase).width, y], [rightPhrase, x + 16, y]];
    }
    const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
    for (const [phrase, x, y] of captions) {
      xs.push(x, x + Math.ceil(context.measureText(phrase).width) + 4);
      ys.push(y - 17, y + 5);
    }
    const left = Math.max(0, Math.floor(Math.min(...xs) - 12)), top = Math.floor(Math.min(...ys) - 10);
    const right = Math.min(bounds.width, Math.ceil(Math.max(...xs) + 12)), bottom = Math.ceil(Math.max(...ys) + 10);
    return { left, top, width: right - left, height: bottom - top, points, captions };
  });
  seams.forEach((seam, index) => {
    const layout = layouts[index], canvas = seam.canvas;
    canvas.hidden = !layout;
    if (!layout) return;
    const { left, top, width, height, points, captions } = layout;
    canvas.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
    const pixelsX = Math.ceil(width * dpr), pixelsY = Math.ceil(height * dpr);
    if (canvas.width !== pixelsX) canvas.width = pixelsX;
    if (canvas.height !== pixelsY) canvas.height = pixelsY;
    seam.points = points.map(([x, y]) => [x - left, y - top]);
    seam.captions = captions.map(([phrase, x, y]) => [phrase, x - left, y - top]);
    seam.dpr = dpr;
    seam.dirty = true;
  });
}

let seamTimer;
function scheduleSeams() {
  clearTimeout(seamTimer);
  seamTimer = setTimeout(layoutSeams, 120);
}

function paintSeam(seam, time) {
  if (seam.canvas.hidden || !seam.points) return;
  const { from, to } = seam.edge;
  const ids = route(), toIndex = ids.indexOf(to), fromIndex = ids.indexOf(from);
  const visited = state.started && fromIndex >= 0 && toIndex >= 0 && toIndex <= state.index;
  const g = seam.canvas.getContext('2d');
  g.clearRect(0, 0, seam.canvas.width, seam.canvas.height);
  g.save(); g.scale(seam.dpr, seam.dpr);
  BOIL = phaseAt(time, 3.2 + (hash(to) % 25) / 10, hash(from) % 7);
  if (visited) {
    arrow(g, seam.points, { color: accentFor(to), width: 4.5, alpha: .95, seed: hash(from) });
    arrow(g, seam.points, { color: C.ink, width: 1.25, alpha: .8, seed: hash(from) });
  } else {
    const seed = hash(from + to);
    pen(g, seam.points, { color: C.ink, width: 1.35, alpha: .48, seed, dash: [6, 7] });
    const [x, y] = seam.points.at(-1), [px, py] = pointAt(seam.points, .98);
    const angle = Math.atan2(y - py, x - px);
    const wings = [-.58, .58].map(offset => [x - 8 * Math.cos(angle + offset), y - 8 * Math.sin(angle + offset)]);
    pen(g, [wings[0], [x, y], wings[1]], { color: C.ink, width: 1.2, alpha: .54, seed });
  }
  for (const [phrase, x, y] of seam.captions) note(g, phrase, x, y, { size: 16 });
  g.restore();
  seam.dirty = false;
}

let theatre, recordPlayer, interactiveRecordPlayer, musicController, musicError = null, extrasReady = false;
const supplementAnchors = { sax:'#instrument-sax', bass:'#instrument-bass', rabbit:'#instrument-rabbit', encore:'#paper-theatre', bow:'#paper-theatre', 'side-b':'#record-finale' };
function sync() {
  seams.forEach(seam => { seam.dirty = true; });
  const ids = route(), id = ids[state.index];
  scenes.forEach(s => s.buttons.forEach((b, bid) => { const ix = ids.indexOf(bid), current = state.started && bid === id, visited = state.started && ix >= 0 && ix <= state.index;
    b.classList.toggle('current', current); b.classList.toggle('visited', visited); b.classList.toggle('future', !visited);
    current ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current');
    if (isBranch(bid)) b.setAttribute('aria-pressed', String(state.route === bid));
    s.dirty = true;
  }));
  document.querySelectorAll('[data-node]').forEach(b=>{if(!b.classList.contains('node')){b.dataset.node===id&&state.started?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current')}});
  if (theatre) { theatre.setAct(Math.min(3,nodeById.get(id).act - 1)); theatre.setRoute(state.route); theatre.setProgress(id==='encore'?.65:['bow','side-b'].includes(id)?1:0); }
  if (state.started) $('#announcement').textContent = copy.notes[id];
}
function focusStep() {
  const id = route()[state.index];
  if(supplementAnchors[id]){$(supplementAnchors[id])?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});return}
  const s = scenes[nodeById.get(id).act - 1], el = s?.buttons.get(id); if (!el) return;
  if (!s.small) {
    const plate = s.plate.getBoundingClientRect();
    const header = s.section.querySelector('.chapter-header').getBoundingClientRect();
    const top = Math.min(plate.top, header.top);
    if (plate.bottom - top <= innerHeight - 48) {
      if (top < 0 || plate.bottom > innerHeight) {
        window.scrollTo({ top: scrollY + top - 24, behavior: reduced ? 'instant' : 'smooth' });
      }
      return;
    }
  }
  const rect = el.getBoundingClientRect(), vh = innerHeight - 50;
  if (rect.top > vh * .25 && rect.bottom < vh * .7) return;
  const chapterTop = s.section.getBoundingClientRect().top + scrollY;
  const y = state.index === 0 ? chapterTop - 25 : scrollY + rect.top - vh * .43;
  window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'instant' : 'smooth' });
}
function go(index, { scroll = true, play = false, cue = true } = {}) {
  state.index = Math.max(0, Math.min(route().length - 1, index)); state.elapsed = 0; state.changedAt=performance.now(); state.started = true; state.playing = play; sync(); const id=route()[state.index];if(cue)soundFor(id);if(id==='side-b')recordPlayer?.activate();if(id==='encore')theatre?.replayReveal?.();if(scroll)focusStep();
}
$('#start').onclick = () => {
  const heading = $('#act-1 h2');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  go(0, { play: true });
};
const book = {
  toggle() { if (!state.started || state.index === route().length - 1) return go(0, { play: true }); state.playing = !state.playing; sync(); if (state.playing) focusStep(); },
  next() { go(state.started ? state.index + 1 : 0); }, previous() { go(state.index - 1); }, restart() { go(0, { play: true }); },
  setSpeed(value) { if (!Number.isFinite(value) || value <= 0) throw new RangeError('Book speed must be positive.'); state.speed = value; sync(); },
};
$('#sound').onclick = () => { setSound(!state.sound); if (state.sound) soundFor(route()[state.index]); else sfx.stopAll();sync(); };
adoptDoorSound();
$('#open-curtain').onclick=()=>go(route().indexOf('encore'),{scroll:false});
$('#curtain-call').onclick=()=>go(route().indexOf('bow'),{scroll:false});
for (const event of ['wheel', 'touchstart']) addEventListener(event, () => { if (state.playing) { state.playing = false; sync(); } }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) { state.playing = false; sync(); } });
document.addEventListener('keydown', e => {
  if (e.target.matches('button,a,input,textarea,select') || $('#score-dialog').open) return;
  if (e.key === ' ') { e.preventDefault(); book.toggle(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); book.next(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); book.previous(); }
  if (e.key.toLowerCase() === 'r') book.restart();
});
let layout;
async function openScore() {
  if (state.playing) { state.playing = false; sync(); }
  const dialog = $('#score-dialog'); dialog.showModal();
  try {
    layout ??= await fetch('/jolly-statechart/model/layout.json').then(r => { if (!r.ok) throw new Error('No diagram'); return r.json(); });
    const c = $('#score-canvas'), displayW = Math.min(dialog.clientWidth - 60, 800), scale = displayW / layout.width, dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(displayW * dpr); c.height = Math.round(layout.height * scale * dpr); c.style.width = `${displayW}px`; c.style.height = `${layout.height * scale}px`;
    const g = c.getContext('2d'); g.scale(scale * dpr, scale * dpr);
    for (const e of layout.edges) { const chosen = route().includes(e.from) && route().includes(e.to); arrow(g, e.points, { color: chosen ? C.coral : C.ink, alpha: chosen ? 1 : .3, width: chosen ? 2 : 1, seed: hash(e.from) }); }
    for (const n of layout.nodes) { ticket(g, n.cx, n.cy, n.w, Math.max(n.h, 58), { id: n.id, active: state.started && route()[state.index] === n.id, header: false }); g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '16px "Special Elite"'; const labels = nodeById.get(n.id)?.label || [n.id]; labels.forEach((line, i) => g.fillText(line, n.cx, n.cy - (labels.length - 1) * 9 + i * 21 + 5)); }
  } catch { $('#score-canvas').hidden = true; }
}
$('#show-score').onclick = openScore; $('#close-score').onclick = () => $('#score-dialog').close();
$('#score-dialog').addEventListener('click', e => { if (e.target === $('#score-dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });

const instruments=createInstrumentChapters($('#instrument-studies'),{reducedMotion:reduced,onActivate:id=>go(route().indexOf(id),{scroll:false,cue:false}),onSound:({instrument})=>soundFor(instrument==='double-bass'?'bass':instrument==='rabbit-guitar'?'rabbit':'sax')});
const recordReady=createRecordPlayer($('#record-finale'),{
  reducedMotion:reduced,storyLoop:true,deferStory:true,onActivate:id=>go(route().indexOf(id),{scroll:false}),
}).then(async instance=>{
  recordPlayer=instance;
  const heroReplay=$('#record-finale .record-turn');heroReplay.innerHTML='REPLAY THE HOTEL OVERTURE <span data-ink-icon="arrow-up-right" aria-hidden="true">↗</span>';drawPageIcon(heroReplay.querySelector('[data-ink-icon]'));heroReplay.setAttribute('aria-label','Replay the seven-scene hotel overture');
  const workbench=document.createElement('section');workbench.id='record-workbench';workbench.className='record-workbench';workbench.setAttribute('aria-labelledby','record-workbench-title');
  const workbenchStyle=document.createElement('style');workbenchStyle.textContent=RECORD_WORKBENCH_CSS;workbench.append(workbenchStyle);
  const heading=document.createElement('header');heading.className='record-workbench-heading';heading.innerHTML='<p>THE JOLLY / THE LISTENING DESK</p><h2 id="record-workbench-title">Pick a little trouble.</h2>';
  const machineHost=document.createElement('div');machineHost.id='record-interactive-machine';machineHost.className='record-workbench-machine';
  const library=document.createElement('div');library.className='record-workbench-library';const musicHost=document.createElement('div');musicHost.id='record-music-library';library.append(musicHost,playerHost);
  workbench.append(heading,machineHost,library);$('#record-finale').append(workbench);player.refresh();
  interactiveRecordPlayer=await createRecordPlayer(machineHost,{reducedMotion:reduced,compact:true,onMachineUpdate:update=>musicController?.onMachineUpdate(update)});
  try { musicController=await createRecordMusicController({host:musicHost,transportHost:playerHost,player,machine:interactiveRecordPlayer}); }
  catch(error){musicError=error.message;const status=document.createElement('p');status.id='record-music-status';status.setAttribute('role','status');status.textContent='The record library could not be loaded. Please refresh this page.';musicHost.append(status);}
});
recordReady.then(()=>{extrasReady=true;sync();scheduleSeams()}).catch(error=>console.error('An after-hours chapter could not load:',error));
let instrumentCheck, instrumentsReady = false;
function allInstrumentsReady() {
  instrumentCheck ??= instruments.ready.then(() => {
    instrumentsReady = true;
    sync(); scheduleSeams();
  }).catch(error => console.error('An instrument chapter could not load:', error));
  return instrumentsReady;
}

const imageSources = { cast: '/jolly-statechart/assets/cast/trio-pencil.webp', ...Object.fromEntries([1, 2, 3, 4].map(i => [`cast${i}`, `/jolly-statechart/assets/cast/action-${i}.webp`])), ...Object.fromEntries(['hotel','bell','metronome','vinyl','clock','trolley','shoe-tieclip','champagne','chandelier','microphone','do-not-disturb','rabbit-case'].map(id => [id, `/jolly-statechart/assets/generated/${id}.webp`])), looseleafTicket: 'data:image/svg+xml,' + encodeURIComponent(makeTicketSvg({ width: 300, height: 132, seed: 'yoyo-approval', stubWidth: 62, tokens: { paper: '#e3a82b', ink: '#16246e' } })) };
const actionIds = ['cast1', 'cast2', 'cast3', 'cast4'];
const actionImagesReady = Promise.all(actionIds.map(id => loadImage(id, imageSources[id])));
await Promise.all([document.fonts.ready, ...Object.entries(imageSources).filter(([id]) => !actionIds.includes(id)).map(([id, url]) => loadImage(id, url))]);
castFrames = [splitCastAtlas(images.cast)];
const coverActors = [...document.querySelectorAll('.cover-cast .sprite')].map(el => {
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); canvas.style.cssText = 'position:absolute;left:-40px;top:-70px;width:calc(100% + 80px);height:calc(100% + 70px);';
  el.style.overflow = 'visible'; el.append(canvas); return { el, canvas, who: el.dataset.character };
});
const accentPaints = new Map();
const accentObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const item = accentPaints.get(entry.target);
    item.visible = entry.isIntersecting;
    if (item.visible) paintAccent(item, performance.now());
  }
});
const PROP_GESTURES = {
  reed: { beat: 420, holds: [0, 0, 1, -.65, 0] },
  fork: { beat: 260, holds: [0, 0, 1, -1, .45, 0, 0] },
  stitch: { beat: 300, holds: [0, 1, 2, 3, 2, 1, 0, 0] },
  dial: { beat: 330, holds: [0, 1, .25, -1, -.25, 0] },
};
function paintPropCel(g, item, image, w, h, gesture, phase) {
  const { canvas, rotation, name } = item;
  const layer = item.layer ??= document.createElement('canvas');
  const sw = Math.ceil(w), sh = Math.ceil(h);
  if (layer.width !== sw || layer.height !== sh) { layer.width = sw; layer.height = sh; }
  const ink = layer.getContext('2d', { willReadFrequently: name === 'stitch' });
  ink.clearRect(0, 0, sw, sh);
  drawBoiledSprite(ink, image, [0, 0, image.naturalWidth, image.naturalHeight], [0, 0, sw, sh],
    { phase, amplitude: reduced ? 0 : .85 });
  g.save();
  g.translate(canvas.width / 2, canvas.height / 2);
  g.rotate(rotation + (name === 'stitch' ? [0, -.25, .07, .18][gesture] : 0));
  if (name === 'stitch') {
    const size = [1, .94, 1.04, 1.08][gesture];
    g.scale(size, size);
  }
  g.translate(-sw / 2, -sh / 2);
  if (name === 'stitch' && gesture) {
    // A few original golden embroidery pixels catch light in sequence.
    const pixels = ink.getImageData(0, 0, sw, sh);
    const start = Math.floor((gesture - 1) * sh / 3), end = start + Math.ceil(sh / 3);
    for (let y = start; y < Math.min(end, sh); y++) for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const r = pixels.data[i], green = pixels.data[i + 1], b = pixels.data[i + 2];
      if (r > 145 && green > 105 && green > b * 1.22) {
        pixels.data[i] += 36; pixels.data[i + 1] += 29; pixels.data[i + 2] += 12;
      }
    }
    ink.putImageData(pixels, 0, 0);
  }
  if (!gesture) g.drawImage(layer, 0, 0);
  else for (let y = 0; y < sh; y++) {
    const t = y / sh;
    if (name === 'fork' && t < .49) {
      const flex = (1 - t / .49) ** 2 * gesture * 2.4, middle = Math.floor(sw / 2);
      g.drawImage(layer, 0, y, middle, 1, -flex, y, middle, 1);
      g.drawImage(layer, middle, y, sw - middle, 1, middle + flex, y, sw - middle, 1);
    } else {
      const bend = name === 'dial' ? Math.max(0, (t - .69) / .31)
        : name === 'reed' ? Math.max(0, (t - .74) / .26) : Math.max(0, (t - .58) / .42);
      g.drawImage(layer, 0, y, sw, 1, bend * bend * gesture * 2.1, y, sw, 1);
    }
  }
  g.restore();
}
function trioStops() {
  if (matchMedia('(max-width:720px)').matches) return [[404, 496], [524, 565], [661, 632]];
  if (matchMedia('(max-width:1000px)').matches) return [[476, 393], [626, 516], [807, 644]];
  if (matchMedia('(max-width:1100px)').matches) {
    const room = Math.max(0, Math.min(1, (innerWidth - 800) / 300));
    return [[476, 393], [586 - room * 80, 516], [732 - room * 50, 644]];
  }
  return [[431, 308], [596, 510], [776, 665]];
}
function cameoMarks(g, x, foot, w, h, frame, phase) {
  BOIL = phase;
  const shifts = [[0, -8], [13, 5], [-11, 13]];
  const [shiftX, shiftY] = shifts[frame];
  const side = w / 2 + 12, y = foot - h * .68;
  pen(g, [[x-side,y+shiftY],[x-side-15,y-8+shiftY],[x-side-19-shiftX*.36,y-26+shiftY]],
    { color:C.coral, alpha:.68, width:2.6, seed:319 });
  pen(g, [[x-side+1,y-25+shiftY],[x-side-7+shiftX*.3,y-42+shiftY]],
    { color:C.wine, alpha:.52, width:2.2, seed:320 });
  pen(g, [[x+side,y-11-shiftY],[x+side+16,y-22-shiftY],[x+side+20+shiftX*.36,y-41-shiftY]],
    { color:C.green, alpha:.62, width:2.6, seed:321 });
  pen(g, [[x+side+5,y+11-shiftY],[x+side+24-shiftX*.3,y+2-shiftY]],
    { color:C.coral, alpha:.57, width:2.2, seed:322 });
}
function paintAccent(item, time) {
  const { canvas, sprites, trio, logo, name } = item;
  const g = canvas.getContext('2d'), { width, height } = canvas;
  const frame = trio && !reduced ? [0, 1, 2][Math.floor(time / 680) % 3] : 0;
  const image = sprites[frame];
  if (!image) return;
  const score = PROP_GESTURES[name];
  const gesture = !reduced && score ? score.holds[Math.floor(time / score.beat) % score.holds.length] : 0;
  const phase = phaseAt(time, 4.5);
  const logoFrame = logo && !reduced ? Math.floor(time / 160) % 6 : 0;
  const stop = trio && trioStops()[frame];
  const key = `${frame}:${gesture}:${phase}:${logoFrame}:${stop || ''}`;
  if (item.last === key) return;
  item.last = key;
  g.clearRect(0, 0, width, height);
  const w = Math.min(width * (trio ? .36 : .75), height * (trio ? .427 : .78) * image.naturalWidth / image.naturalHeight);
  const h = w * image.naturalHeight / image.naturalWidth;
  if (trio || logo) {
    g.save();
    if (trio) {
      const [x, foot] = stop;
      cameoMarks(g, x, foot, w, h, frame, phase);
      g.translate(x, foot);
    } else g.translate(width / 2, (height + h) / 2);
    if (logo) g.rotate([0, 0, 0, -.08, .07, 0][logoFrame]);
    drawBoiledSprite(g, image, [0, 0, image.naturalWidth, image.naturalHeight],
      [-w / 2, -h, w, h], { phase: phaseAt(time, 4.5), amplitude: reduced ? 0 : 1.05 });
    g.restore();
    return;
  }
  paintPropCel(g, item, image, w, h, gesture, phase);
}
function watchAccent(canvas, sprites, options = {}) {
  const item = { canvas, sprites, rotation: 0, ...options, visible: false };
  accentPaints.set(canvas, item);
  paintAccent(item, 0);
  accentObserver.observe(canvas);
}
function placeAccent(host, sprite, name, left, top, width, rotation) {
  const canvas = document.createElement('canvas');
  canvas.className = 'house-accent';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.prop = name;
  canvas.width = canvas.height = 256;
  // This one gets measured right after it is painted. On the CPU that is instant; on the GPU it stalls until everything queued has finished.
  if (name === 'dial') canvas.getContext('2d', { willReadFrequently: true });
  canvas.style.cssText = `position:absolute;left:${left};top:${top};width:${width};height:auto;transform:translate(-50%,-50%);pointer-events:none`;
  host.append(canvas);
  watchAccent(canvas, [sprite], { rotation, name });
  return canvas;
}
const accentMobile = matchMedia('(max-width:720px)');
loadFeedbackArt(['reed','fork','stitch','logo','dial','trio-0','trio-1','trio-2']).then(async art => {
  for (const [id, name, left, top, rotation] of [
    ['sax', 'reed', '9%', '45%', -.36],
    ['bass', 'fork', '87%', '43%', .40],
    ['rabbit', 'stitch', '43%', '23%', .12],
  ]) {
    const canvas = placeAccent($(`#instrument-${id} .instrument-figure`), art[name], name, left, top, 'clamp(50px, 8vw, 111px)', rotation);
    if (id !== 'bass') {
      const move = () => {
        canvas.style.left = accentMobile.matches ? (id === 'rabbit' ? '13%' : '11.5%') : left;
        canvas.style.top = accentMobile.matches && id === 'sax' ? '53%' : top;
      };
      move();
      accentMobile.addEventListener('change', move);
    }
  }
  for (const canvas of document.querySelectorAll('.jolly-mark-raster')) watchAccent(canvas, [art.logo], { logo: true });

  const cameo = document.createElement('canvas');
  cameo.className = 'instrument-cameo';
  cameo.width = 1080; cameo.height = 700;
  cameo.setAttribute('role', 'img');
  cameo.setAttribute('aria-label', 'JOJO, LYLY and YOYO pull faces for a group portrait.');
  const positionCameo = () => {
    const right = matchMedia('(max-width:1000px)').matches
      ? 'clamp(-43px,-3vw,-27px)'
      : matchMedia('(max-width:1100px)').matches
        ? 'clamp(20px, 42vw - 396px, 67px)'
        : 'clamp(-7px, 33vw - 370px, 86px)';
    cameo.style.cssText = accentMobile.matches
      ? 'display:block;width:min(66vw,264px);height:auto;margin:-36px 0 0 auto;pointer-events:none'
      : `position:absolute;width:clamp(310px,37vw,529px);height:auto;right:${right};top:clamp(-205px,-14.2vw,-102px);pointer-events:none`;
    cameo.style.translate = '22px 0';
  };
  positionCameo();
  accentMobile.addEventListener('change', positionCameo);
  matchMedia('(max-width:1100px)').addEventListener('change', positionCameo);
  matchMedia('(max-width:1000px)').addEventListener('change', positionCameo);
  $('#instrument-sax .instrument-heading').append(cameo);
  scheduleSeams();
  watchAccent(cameo, [art['trio-0'], art['trio-1'], art['trio-2']], { trio: true });

  await recordReady;
  const library = $('#record-music-library');
  const title = $('#record-workbench-title'), notice = library.querySelector('.record-music-notice');
  const sides = library.querySelector('.record-music-sides');
  if (!art.dial || !notice || !sides) return;
  const status = notice.querySelector('.record-music-status'), retry = notice.querySelector('.record-music-refresh');
  library.style.position = 'relative';
  // Nothing down here can be seen from the door, and measuring the dial below stalls: it can wait until the page is on show and has a moment.
  await new Promise(resolve => {
    const look = () => (document.documentElement.matches('.opening-active,.opening-pending') ? setTimeout(look, 500) : (window.requestIdleCallback || setTimeout)(resolve));
    look();
  });
  const decoration = placeAccent(library, art.dial, 'dial', '100%', '50%', '76px', .13);
  const { width: pixelsWide, height: pixelsHigh } = decoration;
  const pixels = decoration.getContext('2d').getImageData(0, 0, pixelsWide, pixelsHigh).data;
  let firstInk = pixelsHigh, lastInk = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 64) continue;
    const row = Math.floor(i / (4 * pixelsWide));
    firstInk = Math.min(firstInk, row);
    lastInk = Math.max(lastInk, row + 1);
  }
  const inkTop = firstInk / pixelsHigh, inkHeight = (lastInk - firstInk) / pixelsHigh;
  const range = document.createRange();
  const fit = () => {
    const bounds = library.getBoundingClientRect(), buttons = sides.getBoundingClientRect();
    range.selectNodeContents(title);
    const titleInk = range.getBoundingClientRect();
    const dialTop = titleInk.top + 4;
    range.selectNodeContents(status);
    const occupiedRight = Math.max(titleInk.right, range.getBoundingClientRect().right, retry.hidden ? 0 : retry.getBoundingClientRect().right);
    const width = Math.min(112, buttons.right - occupiedRight - 14, (buttons.top - dialTop - 8) / inkHeight);
    decoration.hidden = width < 45;
    if (!decoration.hidden) {
      decoration.style.width = `${width}px`;
      decoration.style.left = `${buttons.right - bounds.left - width / 2}px`;
      decoration.style.top = `${dialTop - bounds.top + width * (.5 - inkTop)}px`;
    }
  };
  const dialResize = new ResizeObserver(fit);
  [title, notice, sides].forEach(element => dialResize.observe(element));
  const dialContent = new MutationObserver(fit);
  [title, notice].forEach(element => dialContent.observe(element, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }));
  fit();
}).catch(error => console.warn('Feedback artwork could not be placed:', error.message));

function resizeCoverActors() { coverActors.forEach(a => { const dpr = Math.min(devicePixelRatio || 1, 2); a.baseHeight = a.el.clientHeight * dpr; a.canvas.width = Math.round((a.el.clientWidth + 80) * dpr); a.canvas.height = Math.round((a.el.clientHeight + 70) * dpr); }); }
function paintCover(time) {
  BOIL = inkPhase(time, reduced);
  for (const a of coverActors) {
    const g = a.canvas.getContext('2d', { willReadFrequently: true }); g.clearRect(0, 0, a.canvas.width, a.canvas.height);
    const base = castFrames[0][a.who], image = castFrames[poseFrame(motionReady ? time - motionEpoch : 0, a.who, reduced)][a.who];
    const scale = a.baseHeight * (a.who === 'yoyo' ? .86 : .98) / base.height;
    const w = image.width * scale, h = image.height * scale;
    const ink=ACTOR_INK[a.who];drawBoiledSprite(g,image,[0,0,image.width,image.height],[(a.canvas.width-w)/2,a.canvas.height-h,w,h],{phase:phaseAt(time,ink.fps,hash(a.who)%5),amplitude:ink.amount});
  }
}
// A chapter's drawing is only recorded when it is built. It gets rasterised the first time it is used, which is a long stall if that comes in the middle of a scroll.
// So each chapter's three frames are done ahead of time as it comes within reach: one per idle moment, and never while the door is up.
const settling = [];
let settlingWait = 0;
function settleNext() {
  settlingWait = 0;
  if (!settling.length) return;
  if (document.hidden || document.documentElement.matches('.opening-active,.opening-pending')) { settlingWait = setTimeout(settleNext, 1000); return; }
  settlingWait = 1;
  (window.requestIdleCallback || (work => setTimeout(work, 120)))(() => {
    const layer = settling.shift();
    if (layer) { layer.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 1, 1); layer.settled = true; }
    settleNext();
  }, { timeout: 2000 });
}
function settleScene(scene) {
  for (const layer of scene.layers || []) if (!layer.settled && !settling.includes(layer)) settling.push(layer);
  if (!settlingWait) settleNext();
}
const withinReach = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const scene = scenes.find(item => item.plate === entry.target);
    scene.inReach = entry.isIntersecting;
    if (entry.isIntersecting) settleScene(scene);
  }
}, { rootMargin: '150% 0px' });
scenes.forEach(scene => withinReach.observe(scene.plate));
resizeCoverActors(); scenes.forEach(buildScene);interludes.forEach(resizeHouse);paintCover(0);
// Only what is on screen now: the rest stay marked dirty and the frame loop paints each as it comes into view, instead of the whole page in one long task.
scenes.forEach(s=>{const box=s.canvas.getBoundingClientRect();if(box.bottom>0&&box.top<innerHeight)paintScene(s,0)});interludes.forEach(s=>paintHouse(s,0));sync();
coverActors.forEach(a => { a.el.querySelector('img').hidden = true; });
mountHeadingHighlights();
// Paint the cover cel first, then split and warm the later drawings between frames.
const castReady = (async () => {
  await actionImagesReady;
  const frames = [...castFrames];
  for (const id of actionIds) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    frames.push(await splitCastSoon(images[id]));
  }
  castFrames = frames;
  scheduleSeams();
  const scratch = document.createElement('canvas'); scratch.width = scratch.height = 1; const g = scratch.getContext('2d', { willReadFrequently: true });
  for (const pose of reduced ? castFrames.slice(0, 1) : castFrames) for (const [who,image] of Object.entries(pose)) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    drawBoiledSprite(g, image, [0, 0, image.width, image.height], [0, 0, 1, 1], { phase: 0, amplitude: ACTOR_INK[who].amount });
  }
  motionEpoch = performance.now(); motionReady = true;
})();
layoutSeams();
new ResizeObserver(scheduleSeams).observe(main);
scenes.forEach(s => s.canvas.addEventListener('contextrestored', () => { buildScene(s); s.dirty = true; }));
const observer = new IntersectionObserver(entries => entries.forEach(e => { const s = [...scenes,...interludes,...seams].find(s => s.plate === e.target); if (s) { s.visible = e.isIntersecting;if(s.visible&&s.enterTime==null)s.enterTime=performance.now();s.dirty = true; } }), { rootMargin: '150px' }); [...scenes,...interludes,...seams].forEach(s => observer.observe(s.plate));
let resizeTimer,lastPaperWidth=$('.paper-world').getBoundingClientRect().width;
const resizeObserver = new ResizeObserver(([entry]) => {if(Math.abs(entry.contentRect.width-lastPaperWidth)<.5)return;lastPaperWidth=entry.contentRect.width;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{resizeCoverActors();if(reduced)paintCover(0);scenes.forEach(buildScene);interludes.forEach(resizeHouse);scenes.forEach(s=>paintScene(s,performance.now()));interludes.forEach(s=>paintHouse(s,performance.now()));sync();scheduleSeams()},120)});resizeObserver.observe($('.paper-world'));
let coverVisible = true, lastTick = -1;
new IntersectionObserver(([entry]) => { coverVisible = entry.isIntersecting; }).observe($('.cover-art'));
let previous = performance.now();
function frame(time) {
  const delta = Math.min(time - previous, 1000); previous = time;
  if (!document.hidden) {
    if (state.playing) { state.elapsed += delta * state.speed;if (state.elapsed >= 9400) { if (state.index < route().length - 1) go(state.index + 1, { play: true }); else { state.playing = false; sync(); } } }
    // Nobody can see the page while the door stands in front of it.
    const tick = Math.floor(time / (document.documentElement.matches('.opening-active,.opening-pending') ? 500 : 66.667));
    if (coverVisible && (!reduced && tick !== lastTick)) paintCover(time);
    for (const scene of scenes) if (scene.visible && (scene.dirty || (!reduced && tick !== lastTick))) paintScene(scene, time);
    for(const panel of interludes)if(panel.visible&&(panel.dirty||(!reduced&&tick!==lastTick)))paintHouse(panel,time);
    for (const seam of seams) if (seam.visible && (seam.dirty || (!reduced && tick !== lastTick))) paintSeam(seam, time);
    if (!reduced && tick !== lastTick) for (const item of accentPaints.values()) if (item.visible) paintAccent(item, time);
    lastTick = tick;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Chapters added asynchronously need one anchor restore after their final initial layout.
Promise.allSettled([recordReady, document.fonts.ready]).then(() => requestAnimationFrame(() => {
  initialNavigation.abort();
  if (!initialHash || initialNavigationCancelled || location.hash !== initialHash) return;
  try { document.getElementById(decodeURIComponent(initialHash.slice(1)))?.scrollIntoView({ behavior: 'instant', block: 'start' }); }
  catch { /* A malformed bookmark leaves the native document available. */ }
}));
const theatreObserver = new IntersectionObserver(async entries => {
  if (!entries.some(e => e.isIntersecting)) return;
  theatreObserver.disconnect();
  try {
    const [{ createTheatre }] = await Promise.all([import('./src/theatre.mjs'), castReady]);
    theatre = createTheatre($('#theatre'), { reducedMotion: reduced, castSprites: castFrames, castAtlas: '/jolly-statechart/assets/cast/trio-pencil.webp', castAtlases: ['/jolly-statechart/assets/cast/trio-pencil.webp', ...[1,2,3,4].map(i => `/jolly-statechart/assets/cast/action-${i}.webp`)], reference: '/jolly-statechart/assets/stage-reference.webp', onReady: () => document.querySelectorAll('.theatre-fallback').forEach(el => el.hidden = true) });
    if (theatre) { theatre.setAct(3);theatre.setProgress(['bow','side-b'].includes(route()[state.index])?1:.65); }
  } catch (error) { console.warn('The paper edition remains available:', error.message); }
}, { rootMargin: '700px' }); theatreObserver.observe($('#paper-theatre'));
addEventListener('pagehide', () => { musicController?.dispose();theatre?.dispose();instruments.dispose();recordPlayer?.dispose();interactiveRecordPlayer?.dispose();sfx.dispose();player.dispose?.();paperStock.dispose(); });
// Named steps keep visual checks reproducible across the three routes.
window.jolly = { get soundChoice() { return soundChoice; }, setNight(down) { Object.assign(C, down ? HOUSE_DOWN : HOUSE_UP); for (const group of [scenes, seams, interludes]) for (const item of group) item.dirty = true; instruments.setNight(down); }, get state() { return { ...state }; },book,get music(){return musicController},get musicState(){return musicController?.state??{status:musicError?'error':'loading',message:musicError,selectedId:null,changing:false,paused:true,currentTime:0,duration:null,src:null}},get record(){return interactiveRecordPlayer},get recordHero(){return recordPlayer},get coreReady(){return images.cast?.complete&&scenes.every(s=>!!s.layer)&&motionReady},get ready(){const ready=allInstrumentsReady();return this.coreReady&&extrasReady&&ready},get theatreReady(){return!!theatre?.ready},get stageReport(){return theatre?.diagnostics},get recordReady(){return!!recordPlayer?.ready&&!!interactiveRecordPlayer?.ready},get poseCount(){return castFrames.length},go:id=>{if(isBranch(id))state.route=id;const i=route().indexOf(id);if(i>=0)go(i)},get notes(){return copy.notes},get chapterCount(){return 9},get characterBounds(){return scenes.flatMap(s=>s.actors.flatMap(a=>castFrames.map((pose,index)=>{const base=castFrames[0][a.who],im=pose[a.who],scale=a.height/base.height,k=s.plate.getBoundingClientRect().width/s.W,cx=a.x+base.width*scale/2,left=s.plate.getBoundingClientRect().left+(cx-im.width*scale/2)*k,right=left+im.width*scale*k,canvas=s.canvas.getBoundingClientRect(),paper=$('.paper-world').getBoundingClientRect();return{who:a.who,act:s.i+1,pose:index,left,right,clipped:left<Math.max(canvas.left,paper.left)+2||right>Math.min(canvas.right,paper.right)-2}})))}};
