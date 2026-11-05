// The overture, drawn live. renderAt(t) can paint any moment, so the picture stays sharp at any size and follows the cursor.
import { castPose } from './opening-cast.mjs';
import { drawPencilArrow } from './looseleaf.mjs';
import { brassFill, paintWalnut } from './opening-wood.mjs';
import { paintPencilTile } from './pencil-tile.mjs';

export const OVERTURE_SECONDS = 14.25;
const C = { brass: '#f2d48a', paper: '#f6f1e6', ink: '#16246e', cobalt: '#2140d6', coral: '#e4676f', coralRay: '#ee8086', lime: '#b1d42a', limeRay: '#c2e04a', wine: '#7f1f3b', wineRay: '#932a48', midnight: '#1b2bb4', midnightRay: '#2439ce', gold: '#d9a33a', pink: '#ed9ba9', dot: 'rgba(33,64,214,.22)' };
const STEP_LABELS = ['CHECK IN', 'SOUND CHECK', 'THE SHOW', 'GOODNIGHT'];

// Story beats, set on the hits of the music. scripts/mix-film-audio.py places its sound against these same times.
const REST_AT = 4.65, FREEZE_END = 5.22, LYLY_AT = 5.46, PLUCK_AT = 5.79, FORK_AT = 6.945, POUNCE_AT = 8.17, BITE_AT = 8.75, HALF_AT = 10.5, OPEN_AT = 10.79, BOW_AT = 11.97, TITLE_AT = 12.46;
// Paper takes a moment to land, so anything slapped down starts just ahead of its hit.
const LAND = .06, ticketHits = [1.834, 2.118, 2.403, 2.685], titleHits = [12.7, 13.106, 13.404], STAR_AT = 13.97;

const clamp = (t, a = 0, b = 1) => Math.max(a, Math.min(b, t));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const outCubic = t => 1 - (1 - t) ** 3;
const outBack = (t, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const inOut = t => t * t * (3 - 2 * t);
const kick = (t, at, strength, decay = 9) => (t >= at ? strength * Math.exp(-(t - at) * decay) : 0);
// During JOJO's rest the pencil itself stops: nothing boils until the silence ends.
const boilClock = t => (t >= REST_AT + .08 && t < FREEZE_END ? REST_AT + .08 : t);
const phaseAt = t => Math.floor(boilClock(t) * 5.13) % 3;
const seeded = seed => () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
const load = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });

// Old theatre stock: heavy coloured card, foil rules, a punched stub. Each is drawn once, large, and scaled down.
const TICKET_STOCK = [['#1b2bb4', '#f2d48a'], ['#b1d42a', '#16246e'], ['#e4676f', '#16246e'], ['#e3a82b', '#16246e']];
function paintTicket(index) {
  const width = 840, height = 340, canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const c = canvas.getContext('2d'), [stock, ink] = TICKET_STOCK[index], rand = seeded(211 + index * 17), stubAt = width * .77;
  c.fillStyle = stock; c.fillRect(0, 0, width, height);
  // Card fibre.
  for (let i = 0; i < 1500; i++) { c.fillStyle = rand() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'; c.fillRect(rand() * width, rand() * height, 2 + rand() * 12, .8 + rand() * 1.2); }
  c.strokeStyle = ink; c.lineWidth = 5; c.strokeRect(20, 20, width - 40, height - 40);
  c.lineWidth = 1.6; c.strokeRect(31, 31, width - 62, height - 62);
  c.fillStyle = ink; c.textBaseline = 'middle'; c.textAlign = 'center';
  c.font = 'bold 25px "Courier Prime"'; c.fillText('THE JOLLY · ADMIT THREE', stubAt / 2 + 12, 76);
  let size = 104;
  c.font = `${size}px "Special Elite"`;
  size = Math.min(size, size * (stubAt - 96) / c.measureText(STEP_LABELS[index]).width);
  c.font = `${size}px "Special Elite"`; c.fillText(STEP_LABELS[index], stubAt / 2 + 12, height * .54);
  c.font = 'italic bold 25px "Courier Prime"'; c.fillText(['no refunds', 'no rehearsal', 'no exits', 'no comment'][index], stubAt / 2 + 12, height - 66);
  c.save(); c.translate((stubAt + width) / 2 - 4, height / 2); c.rotate(-Math.PI / 2);
  c.font = '44px "Special Elite"'; c.fillText(`Nº 196${index}`, 0, 0); c.restore();
  // The holes go right through: half-moons at the sides and a perforated stub.
  c.globalCompositeOperation = 'destination-out';
  for (const x of [0, width]) { c.beginPath(); c.arc(x, height / 2, 30, 0, 7); c.fill(); }
  for (let y = 12; y < height; y += 24) { c.beginPath(); c.arc(stubAt, y, 5, 0, 7); c.fill(); }
  return canvas;
}

async function loadArt() {
  await Promise.all(['64px "Special Elite"', '40px "Courier Prime"', 'italic 40px "Courier Prime"'].map(font => document.fonts.load(font)));
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  const poses = {};
  // One sheet at a time: cutting them all at once would hitch the door behind us.
  for (const [pose, sheet] of [['play', 'action-2'], ['stop', 'action-1'], ['big', 'action-3'], ['bow', 'action-4']]) { poses[pose] = await castPose(sheet); await pause(); }
  const [closed, half, open, saxMark, bassMark, burst, burstCall, audience] = await Promise.all([
    load('/jolly-statechart/assets/stage-cels/closed.webp'), load('/jolly-statechart/assets/stage-cels/half.webp'), load('/jolly-statechart/assets/stage-cels/open-blue.webp'),
    load('/jolly-statechart/assets/feedback-art/sax-sound.webp'), load('/jolly-statechart/assets/feedback-art/bass-sound.webp'),
    load('/jolly-statechart/assets/feedback-art/cheer-burst.webp'), load('/jolly-statechart/assets/feedback-art/cheer-call.webp'),
    Promise.all([0, 1, 2].map(i => load(`/jolly-statechart/assets/feedback-art/audience-${i}.webp`))),
  ]);
  return { poses, closed, half, open, saxMark, bassMark, burst, burstCall, audience, tickets: STEP_LABELS.map((_, i) => paintTicket(i)), tile: paintPencilTile() };
}

export async function createOverture(canvas) {
  const art = await loadArt();
  const g = canvas.getContext('2d', { alpha: false });
  const grain = g.createPattern(art.tile, 'repeat');
  const par = { x: 0, y: 0, goalX: 0, goalY: 0 };
  let W = 0, H = 0, WIDE = true, U = 1, flecks = [], paperSheet = null, deskSheet = null, PLAN = null, PLAN_LINE = [], JOJO_LINE = [], biteLayers = new Map(), plates = new Map();

  // Polyline helpers for the one line that runs through the whole film.
  function revealPolyline(points, amount) {
    if (amount <= 0) return points.slice(0, 1);
    if (amount >= 1) return points;
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const goal = lengths.at(-1) * amount, out = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (lengths[i] < goal) { out.push(points[i]); continue; }
      const k = (goal - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
      out.push([lerp(points[i - 1][0], points[i][0], k), lerp(points[i - 1][1], points[i][1], k)]);
      break;
    }
    return out;
  }
  function curve(anchors, step = 22) {
    const pts = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      const p0 = anchors[Math.max(0, i - 1)], p1 = anchors[i], p2 = anchors[i + 1], p3 = anchors[Math.min(anchors.length - 1, i + 2)];
      for (let s = 0; s < step; s++) {
        const u = s / step, u2 = u * u, u3 = u2 * u;
        pts.push([.5 * (2 * p1[0] + (p2[0] - p0[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * u3),
          .5 * (2 * p1[1] + (p2[1] - p0[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * u3)]);
      }
    }
    pts.push(anchors.at(-1));
    return pts;
  }

  function resize(width, height) {
    W = canvas.width = Math.round(width); H = canvas.height = Math.round(height);
    WIDE = W > H; U = Math.min(W, H) / 1080;
    biteLayers = new Map(); plates = new Map();
    // Tooth flecks and the dotted sheet are prepared once per size, then only re-stamped.
    flecks = [0, 1, 2].map(phase => {
      const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
      const c = layer.getContext('2d'), rand = seeded(901 + phase * 77); c.fillStyle = 'rgba(255,248,232,.5)';
      for (let i = 0; i < 2400; i++) c.fillRect(rand() * W, rand() * H, (.6 + rand() * 1.6) * U, (.5 + rand() * 1.2) * U);
      return layer;
    });
    paperSheet = document.createElement('canvas'); paperSheet.width = W; paperSheet.height = H;
    const sheet = paperSheet.getContext('2d'); sheet.fillStyle = C.paper; sheet.fillRect(0, 0, W, H); sheet.fillStyle = C.dot;
    const gap = 38 * U;
    for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) { sheet.beginPath(); sheet.arc(x, y, 1.9 * U, 0, 7); sheet.fill(); }
    // The plan is laid out on the reception desk, under the banker's lamp.
    deskSheet = document.createElement('canvas'); deskSheet.width = W; deskSheet.height = H;
    const desk = deskSheet.getContext('2d');
    paintWalnut(desk, W, H, { seed: 31 });
    const lamp = desk.createRadialGradient(W * .46, H * .42, 0, W * .46, H * .42, Math.max(W, H) * .62);
    lamp.addColorStop(0, 'rgba(255,206,130,.26)'); lamp.addColorStop(.6, 'rgba(255,206,130,.07)'); lamp.addColorStop(1, 'rgba(255,206,130,0)');
    desk.fillStyle = lamp; desk.fillRect(0, 0, W, H);
    PLAN = WIDE
      ? { star: [.075 * W, .5 * H], stops: [[.235, .36], [.44, .64], [.65, .36], [.855, .62]].map(([x, y]) => [x * W, y * H]), ticket: .225 * W, head: [.5 * W, .13 * H], foot: [.5 * W, .88 * H], size: 104, stamp: [.875 * W, .3 * H] }
      : { star: [.18 * W, .22 * H], stops: [[.62, .31], [.36, .46], [.64, .61], [.38, .76]].map(([x, y]) => [x * W, y * H]), ticket: .54 * W, head: [.5 * W, .125 * H], foot: [.5 * W, .9 * H], size: 76, stamp: [.82 * W, .79 * H] };
    PLAN_LINE = curve([PLAN.star, ...PLAN.stops]);
    JOJO_LINE = WIDE
      ? curve([[1.04 * W, .34 * H], [.8 * W, .44 * H], [.62 * W, .38 * H], [.47 * W, .46 * H]])
      : curve([[1.05 * W, .2 * H], [.7 * W, .24 * H], [.42 * W, .18 * H]]);
  }

  function flood(color) { g.fillStyle = color; g.fillRect(0, 0, W, H); }
  function rays(cx, cy, color, rotation = 0, count = 14) {
    const reach = Math.hypot(W, H) * 1.3; g.fillStyle = color;
    cx -= par.x * 22 * U; cy -= par.y * 14 * U;
    for (let i = 0; i < count; i++) {
      const a = rotation + i / count * Math.PI * 2, b = a + Math.PI / count;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach); g.lineTo(cx + Math.cos(b) * reach, cy + Math.sin(b) * reach); g.closePath(); g.fill();
    }
  }
  function grainOver(t) {
    const phase = phaseAt(t), ox = [0, 137, 261][phase], oy = [0, 83, 41][phase], scale = U * 1.5;
    // The tile sits around mid grey, so overlay adds pencil strokes without dimming the paper.
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .46; g.translate(ox, oy); g.scale(scale, scale); g.fillStyle = grain; g.fillRect(-ox / scale, -oy / scale, W / scale, H / scale); g.restore();
    g.drawImage(flecks[phase], 0, 0);
  }
  function starPath(x, y, radius, rotation = -Math.PI / 2, inner = .4457) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = rotation + i * Math.PI / 5, r = radius * (i % 2 ? inner : 1); g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath();
  }
  function wobblyCircle(x, y, radius, t) {
    const phase = phaseAt(t); g.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = i / 96 * Math.PI * 2, r = radius + (Math.sin(a * 5 + phase * 1.1) * 8 + Math.sin(a * 11 - phase * .7) * 5) * U;
      g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.closePath();
  }
  // The scene change is always pushed out from something on screen.
  function hoop(t, start, duration, x, y, from, to, bands) {
    const age = seg(t, start, start + duration);
    if (age <= 0) return from();
    if (age >= 1) return to();
    from();
    const reach = Math.hypot(W, H) * 1.15, radius = reach * (1 - (1 - age) ** 2.6), gap = 46 * U;
    bands.forEach((color, i) => { g.fillStyle = color; wobblyCircle(x, y, radius + gap * (bands.length - i), t); g.fill(); });
    g.save(); wobblyCircle(x, y, radius, t); g.clip(); to(); g.restore();
  }
  function shot(zoom, fx, fy, draw) {
    g.save(); g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-fx, -fy); draw(); g.restore();
  }
  function actor(pose, who, x, baseY, height, { flip = false, rotate = 0, squash = 0, t = 0, depth = 16 } = {}) {
    const image = art.poses[pose][who], phase = phaseAt(t), width = height * image.width / image.height;
    g.save(); g.translate(x + (phase - 1) * 1.1 * U + par.x * depth * U, baseY + par.y * depth * .6 * U); g.rotate(rotate); g.scale((flip ? -1 : 1) * (1 + squash * .5), 1 - squash);
    g.drawImage(image, -width / 2, -height, width, height); g.restore();
  }
  function slap(t, start, x, y, { rotation = 0, drop = 1.5, shadow = true } = {}, draw) {
    if (t < start) return;
    const age = seg(t, start, start + .2);
    const scale = lerp(1 + drop, 1, outCubic(age)), settle = t < start + .4 ? Math.sin((t - start - .2) * 34) * (1 - seg(t, start + .2, start + .4)) * .006 : 0;
    g.save(); g.translate(x, y); g.rotate(rotation + settle * 2); g.scale(scale + Math.max(0, settle), scale - Math.max(0, settle));
    if (shadow) { g.shadowColor = 'rgba(22,36,110,.35)'; g.shadowBlur = lerp(30, 3, age) * U; g.shadowOffsetX = lerp(16, 3, age) * U; g.shadowOffsetY = lerp(24, 4, age) * U; }
    draw(); g.restore();
  }
  // A brushed brass nameplate with the words cut into it, made once for each line at this size.
  function plate(text, size) {
    const key = `${text}|${Math.round(size)}`;
    if (plates.has(key)) return plates.get(key);
    const canvas = document.createElement('canvas'), c = canvas.getContext('2d'), font = `${size}px "Special Elite"`;
    c.font = font;
    const textWidth = c.measureText(text).width, pad = size * .78, height = Math.round(size * 1.56), rand = seeded(text.length * 37);
    canvas.width = Math.round(textWidth + pad * 2); canvas.height = height;
    const width = canvas.width, edge = Math.max(2, size * .05), corner = size * .12;
    c.beginPath(); c.roundRect(edge / 2, edge / 2, width - edge, height - edge, corner); c.fillStyle = C.ink; c.fill();
    c.beginPath(); c.roundRect(edge * 1.1, edge * 1.1, width - edge * 2.2, height - edge * 2.2, corner * .8); c.save(); c.clip();
    c.fillStyle = brassFill(c, 0, height); c.fillRect(0, 0, width, height);
    for (let i = 0; i < width / 2; i++) { c.fillStyle = rand() < .5 ? 'rgba(255,248,214,.13)' : 'rgba(70,36,4,.1)'; c.fillRect(rand() * width, rand() * height, 12 + rand() * size * 1.6, Math.max(.7, size * .012)); }
    c.restore();
    for (const x of [pad * .42, width - pad * .42]) {
      const r = size * .1, y = height / 2;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#8a5c17'; c.fill();
      c.beginPath(); c.arc(x - r * .12, y - r * .12, r * .78, 0, 7); c.fillStyle = '#f0d58e'; c.fill();
      c.strokeStyle = '#4a2a0f'; c.lineWidth = Math.max(1, r * .24); c.beginPath(); c.moveTo(x - r * .55, y + r * .3); c.lineTo(x + r * .55, y - r * .3); c.stroke();
    }
    c.font = font; c.textBaseline = 'middle'; c.textAlign = 'left';
    const y = height * .53;
    c.fillStyle = 'rgba(255,246,206,.75)'; c.fillText(text, pad, y + Math.max(1, size * .028));
    c.fillStyle = '#2a1608'; c.fillText(text, pad, y);
    canvas.pad = pad;
    plates.set(key, canvas);
    return canvas;
  }
  function caption(t, start, text, x, y, { size = 74, rotation = -.022 } = {}) {
    slap(t, start, x + par.x * 6 * U, y + par.y * 4 * U, { rotation, drop: .55 }, () => {
      const art = plate(text, size * U);
      g.drawImage(art, -art.width / 2, -art.height / 2);
    });
  }
  function note(text, x, y, size, color, rotation = -.03) {
    g.save(); g.translate(x, y); g.rotate(rotation); g.font = `italic ${size * U}px "Courier Prime"`; g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, 0, 0); g.restore();
  }
  function ticket(index, width, bite = 0) {
    const image = art.tickets[index], height = width * image.height / image.width;
    if (bite <= 0) {
      g.drawImage(image, -width / 2, -height / 2, width, height);
      return;
    }
    // Cut the bite from a private layer so the ticket's own edge shows, not a mask over the scene.
    const key = `${Math.round(bite * 24)}:${Math.round(width)}`;
    let layer = biteLayers.get(key);
    if (!layer) {
      layer = document.createElement('canvas'); layer.width = Math.ceil(width); layer.height = Math.ceil(height);
      const c = layer.getContext('2d'), rand = seeded(44), amount = Math.round(bite * 24) / 24;
      c.drawImage(image, 0, 0, width, height);
      c.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + (i - 4) * .36; c.beginPath(); c.arc(width + Math.cos(a) * width * .2 * amount, height * .46 + Math.sin(a) * height * .48 * amount, (width * .05 + rand() * width * .022) * amount, 0, 7); c.fill(); }
      c.beginPath(); c.arc(width, height * .46, width * .18 * amount, 0, 7); c.fill();
      biteLayers.set(key, layer);
    }
    g.drawImage(layer, -width / 2, -height / 2);
  }
  function pencilLine(points, t, { width = 5, color = C.cobalt, seed = 'overture', head = 'v', headLength = 26, pen = 'bluepencil' } = {}) {
    if (points.length < 2) return;
    drawPencilArrow(g, points, { width: width * U, color, seed, frame: phaseAt(t), head, headLength: headLength * U, pen, strength: .55 });
  }
  function approvedStamp(x, y, radius, rotation) {
    // Sealing wax: a blob that ran a little, with the die pressed into it.
    g.save(); g.translate(x, y); g.rotate(rotation); g.fillStyle = C.wine;
    g.beginPath();
    for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2, r = radius * (1.02 + .05 * Math.sin(a * 5 + 1) + .035 * Math.sin(a * 11)); g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
    g.strokeStyle = '#5f1230'; g.lineWidth = 5 * U; g.beginPath(); g.arc(0, 0, radius * .84, 0, 7); g.stroke();
    g.strokeStyle = '#b4476a'; g.lineWidth = 1.6 * U; g.beginPath(); g.arc(-1 * U, -1.5 * U, radius * .84, 0, 7); g.stroke();
    g.fillStyle = C.brass; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${radius * .27}px "Special Elite"`; g.fillText('APPROVED', 0, -radius * .12);
    g.font = `italic ${radius * .21}px "Courier Prime"`; g.fillText('to go wrong', 0, radius * .24);
    g.restore();
  }

  // — The plan: the star closes on a sheet of paper and a line sets off. The camera rides the pen, then steps back.
  function planCamera(t) {
    const pull = inOut(seg(t, 2.46, 3.02)), zoom = lerp(WIDE ? 1.3 : 1.12, 1, pull);
    const pen = revealPolyline(PLAN_LINE, seg(t, 1.5, 2.75)).at(-1);
    return { zoom, fx: WIDE ? lerp(clamp(pen[0], W * .36, W * .64), W / 2, pull) : W / 2, fy: WIDE ? H / 2 : lerp(clamp(pen[1], H * .3, H * .7), H / 2, pull) };
  }
  function scenePlan(t) {
    g.drawImage(deskSheet, 0, 0);
    const { zoom, fx, fy } = planCamera(t);
    shot(zoom, fx, fy, () => {
      pencilLine(revealPolyline(PLAN_LINE, seg(t, 1.5, 2.75)), t, { width: 10, headLength: 40, color: C.brass });
      ticketHits.forEach((at, i) => slap(t, at - LAND, PLAN.stops[i][0], PLAN.stops[i][1], { rotation: [-.03, .02, -.016, .025][i], drop: 1 }, () => ticket(i, PLAN.ticket)));
      const [sx, sy] = PLAN.star;
      g.fillStyle = C.ink; starPath(sx, sy, 71 * U); g.fill();
      g.fillStyle = C.coral; starPath(sx, sy, 62 * U); g.fill();
    });
    caption(t, 1.62, 'ONE IMMACULATE PLAN.', PLAN.head[0], PLAN.head[1], { size: PLAN.size, rotation: 0 });
    if (t > 2.9) {
      const text = 'THREE VERY QUESTIONABLE MUSICIANS.', size = (WIDE ? 56 : 36) * U, art = plate(text, size);
      g.save(); g.font = `${size}px "Special Elite"`;
      const x = PLAN.foot[0] - art.width / 2, y = PLAN.foot[1];
      g.drawImage(art, x, y - art.height / 2);
      const before = g.measureText('THREE VERY ').width, word = g.measureText('QUESTIONABLE').width;
      // The highlighter goes over the brass like any other surface.
      g.globalCompositeOperation = 'multiply'; g.fillStyle = C.pink;
      g.fillRect(x + art.pad + before - 6 * U, y - size * .36, (word + 12 * U) * outCubic(seg(t, 3.02, 3.2)), size * .72); g.restore();
    }
    slap(t, 2.966 - LAND, PLAN.stamp[0], PLAN.stamp[1], { drop: .7, shadow: false }, () => approvedStamp(0, 0, (WIDE ? 104 : 70) * U, .22));
  }

  function restGlyph(size, color, edge) {
    // A quarter rest, heavy enough to land.
    const p = (a, b) => [a * size, b * size];
    g.beginPath(); g.moveTo(...p(-.14, -1));
    g.lineTo(...p(.3, -.44)); g.quadraticCurveTo(...p(.06, -.26), ...p(.1, -.02)); g.lineTo(...p(.38, .32));
    g.quadraticCurveTo(...p(.04, .16), ...p(-.04, .36)); g.quadraticCurveTo(...p(-.08, .62), ...p(.16, .9));
    g.quadraticCurveTo(...p(-.38, .66), ...p(-.34, .32)); g.quadraticCurveTo(...p(-.28, .08), ...p(.02, .12));
    g.lineTo(...p(-.28, -.28)); g.quadraticCurveTo(...p(-.02, -.5), ...p(-.02, -.72)); g.closePath();
    g.lineJoin = 'round'; g.lineWidth = 14 * U; g.strokeStyle = edge; g.stroke(); g.fillStyle = color; g.fill();
  }
  // — JOJO: the line arrives, the paw goes up, a rest lands. Sound and pencil both stop for it.
  function sceneJojo(t) {
    const motion = boilClock(t);
    flood(C.midnight); rays(WIDE ? .3 * W : .5 * W, WIDE ? .46 * H : .34 * H, C.midnightRay, motion * .08);
    const enter = outBack(seg(t, 3.46, 3.8));
    const baseY = WIDE ? H * 1.04 : H * .86, height = WIDE ? H * 1.02 : H * .62;
    const x = (WIDE ? .26 * W : .48 * W) - (1 - enter) * W * .6;
    const stopped = t >= REST_AT - .34;
    // A dead-straight push in on the paw while nothing else moves.
    const push = inOut(seg(t, REST_AT + .1, FREEZE_END)) * (1 - inOut(seg(t, FREEZE_END, LYLY_AT))), zoom = 1 + push * .16 + kick(t, REST_AT + .1, .05);
    const focusX = WIDE ? .4 * W : .55 * W, focusY = WIDE ? .36 * H : .34 * H;
    shot(zoom, lerp(W / 2, focusX, push), lerp(H / 2, focusY, push), () => {
      if (!stopped && t > 3.66) {
        // Tenor breath leaves the bell of the sax in slow puffs.
        const bellX = x + height * .23, bellY = baseY - height * .86;
        for (let i = 0; i < 3; i++) {
          const life = ((t - 3.66) * 1.3 + i * .34) % 1, s = (WIDE ? 210 : 120) * U * (.65 + life * .6);
          g.save(); g.globalAlpha = Math.sin(life * Math.PI) * .95; g.translate(bellX + life * 240 * U, bellY - life * 70 * U + i * 22 * U); g.rotate(-.18 + i * .08);
          g.drawImage(art.saxMark, 0, -s * .2, s, s * art.saxMark.height / art.saxMark.width); g.restore();
        }
      }
      actor(stopped ? 'stop' : 'play', 'jojo', x, baseY, height, { t, flip: !stopped, squash: t >= REST_AT - .34 && t < REST_AT - .22 ? .03 : 0 });
      // The line pushes in, is stopped by the paw, and sags when the rest lands on it.
      const sag = seg(t, REST_AT + .02, REST_AT + .28), shown = revealPolyline(JOJO_LINE, inOut(seg(t, 3.6, REST_AT - .3)));
      const lined = shown.map(([px, py], i) => [px, py + Math.sin(i / shown.length * Math.PI) * outBack(sag) * 92 * U]);
      pencilLine(lined, t, { width: 8, color: C.brass, headLength: 40, seed: 'jojo-line' });
      if (t >= REST_AT) {
        const fall = seg(t, REST_AT, REST_AT + .1), restX = WIDE ? .68 * W : .76 * W, restY = WIDE ? .52 * H : .17 * H, size = (WIDE ? 300 : 170) * U;
        const squash = t < REST_AT + .3 ? Math.exp(-(t - REST_AT - .1) * 16) * .16 : 0;
        g.save(); g.translate(restX, lerp(-size * 1.4, restY, fall * fall)); g.scale(1 + squash, 1 - squash);
        restGlyph(size, C.brass, C.ink); g.restore();
      }
    });
    caption(t, REST_AT + .16, 'JOJO PUTS IN A REST.', WIDE ? .68 * W : .5 * W, WIDE ? .9 * H : .92 * H, { size: WIDE ? 62 : 62 });
  }

  // — LYLY: the line turns out to be a bass string, and after one pluck it has two opinions.
  function sceneLyly(t) {
    flood(C.lime);
    const shake = kick(t, PLUCK_AT, 18 * U, 7) * Math.sin(t * 74);
    rays(WIDE ? .72 * W : .5 * W, WIDE ? .5 * H : .34 * H, C.limeRay, -t * .1 + kick(t, PLUCK_AT, .1, 3));
    const enter = outBack(seg(t, LYLY_AT + .02, PLUCK_AT + .02));
    const height = WIDE ? H * 1.04 : H * .62, baseY = WIDE ? H * 1.05 : H * .84;
    const x = (WIDE ? .74 * W : .54 * W) + (1 - enter) * W * .6;
    const zoom = 1 + kick(t, PLUCK_AT, .06, 6) + seg(t, 6, 7.8) * .03;
    shot(zoom, W / 2, H / 2 + shake, () => {
      actor(t > 7.1 ? 'big' : 'play', 'lyly', x, baseY, height, { t, squash: t >= PLUCK_AT && t < PLUCK_AT + .1 ? .025 : 0 });
      const stringY = WIDE ? .62 * H : .3 * H, startX = -40 * U, endX = WIDE ? .63 * W : .46 * W;
      const age = Math.max(0, t - PLUCK_AT), amp = (WIDE ? 210 : 120) * U * Math.exp(-age * 1.9) * (t > PLUCK_AT ? 1 : 0);
      if (t < FORK_AT) {
        for (const ghost of [-1, 1, 0]) {
          const pts = [];
          for (let i = 0; i <= 44; i++) { const k = i / 44; pts.push([lerp(startX, endX, k), stringY + Math.sin(k * Math.PI) * amp * Math.sin(age * 38 + ghost * .7) * (ghost ? .72 : 1)]); }
          g.globalAlpha = ghost ? .34 : 1;
          pencilLine(pts, t, { width: ghost ? 4 : 9, color: C.ink, head: 'none', headLength: 1, seed: `string-${ghost}` });
        }
        g.globalAlpha = 1;
      } else {
        const fork = outCubic(seg(t, FORK_AT, FORK_AT + .34)), rootX = lerp(startX, endX, .36);
        pencilLine([[startX, stringY], [rootX, stringY]], t, { width: 9, color: C.ink, head: 'none', headLength: 1, seed: 'fork-root' });
        const reach = WIDE ? .2 * W : .36 * W, rise = (WIDE ? 170 : 130) * U;
        pencilLine(revealPolyline(curve([[rootX, stringY], [rootX + reach * .5, stringY - rise * .25], [rootX + reach, stringY - rise]]), fork), t, { width: 9, color: C.ink, headLength: 40, seed: 'fork-a' });
        pencilLine(revealPolyline(curve([[rootX, stringY], [rootX + reach * .5, stringY + rise * .25], [rootX + reach, stringY + rise]]), fork), t, { width: 9, color: C.wine, headLength: 40, seed: 'fork-b' });
      }
      if (t > PLUCK_AT && t < PLUCK_AT + 1.1) {
        g.save(); g.globalAlpha = 1 - seg(t, PLUCK_AT + .6, PLUCK_AT + 1.1);
        const s = (WIDE ? .24 : .4) * W * (.8 + seg(t, PLUCK_AT, PLUCK_AT + .4) * .3);
        g.translate(WIDE ? .36 * W : .1 * W, WIDE ? .2 * H : .12 * H); g.rotate(-.1); g.drawImage(art.bassMark, 0, 0, s, s * art.bassMark.height / art.bassMark.width); g.restore();
      }
    });
    caption(t, 6.1, 'LYLY PLUCKS THE PROCEDURE.', WIDE ? .32 * W : .5 * W, WIDE ? .9 * H : .92 * H, { size: WIDE ? 58 : 50, rotation: .018 });
    if (t > 6.5) note('it turns out to be in B-flat.', WIDE ? .3 * W : .5 * W, WIDE ? .82 * H : .875 * H, WIDE ? 36 : 36, C.ink);
  }

  // — YOYO: quality control, delivered by mouth.
  function sceneYoyo(t) {
    flood(C.wine); rays(.5 * W, WIDE ? .46 * H : .36 * H, C.wineRay, t * .12);
    const ticketX = WIDE ? .36 * W : .4 * W, ticketY = WIDE ? .44 * H : .3 * H, ticketW = WIDE ? .46 * W : .72 * W;
    const biteAmount = t < BITE_AT ? 0 : outBack(seg(t, BITE_AT, BITE_AT + .1), 2.4);
    const notchX = ticketX + ticketW * .47;
    const zoom = 1 + kick(t, BITE_AT, .13, 5) + seg(t, 9, 9.8) * .03;
    shot(zoom, lerp(W / 2, notchX, kick(t, BITE_AT, .8, 4)), lerp(H / 2, ticketY, kick(t, BITE_AT, .8, 4)), () => {
      // The arrow is still hurrying towards the exit it was promised.
      const arrow = WIDE ? curve([[-.02 * W, .84 * H], [.08 * W, .72 * H], [.12 * W, .62 * H], [ticketX - ticketW * .51, ticketY + 40 * U]]) : curve([[-.05 * W, .56 * H], [.04 * W, .46 * H], [ticketX - ticketW * .47, ticketY + 70 * U]]);
      pencilLine(revealPolyline(arrow, seg(t, 7.86, 8.5)), t, { width: 9, color: C.brass, headLength: 40, seed: 'to-exit' });
      const shake = t > BITE_AT && t < BITE_AT + .25 ? Math.sin(t * 90) * 8 * U * (1 - seg(t, BITE_AT, BITE_AT + .25)) : 0;
      slap(t, 7.92, ticketX + shake, ticketY, { rotation: -.03, drop: .8 }, () => ticket(3, ticketW, biteAmount));
      // She winds up low on the right, leaps, lands against the ticket's edge and chews without hurry.
      const height = WIDE ? H * .74 : H * .42;
      const fromX = WIDE ? .84 * W : .74 * W, toX = ticketX + ticketW * .86, toY = ticketY + height * .56;
      const groundY = WIDE ? H * 1.05 : H * .84;
      const air = seg(t, POUNCE_AT, BITE_AT), crouch = t < POUNCE_AT ? outBack(seg(t, 7.9, 8.1)) : 1;
      const chew = t > BITE_AT + .2 ? Math.abs(Math.sin((t - BITE_AT) * 9)) * 7 * U : 0;
      const px = t < POUNCE_AT ? fromX + (1 - crouch) * W * .4 : lerp(fromX, toX, inOut(air));
      const py = (t < POUNCE_AT ? groundY : lerp(groundY, toY, air) - Math.sin(air * Math.PI) * 170 * U) + chew;
      const pose = t < POUNCE_AT ? 'play' : t < BITE_AT ? 'big' : 'stop';
      const wind = t < POUNCE_AT ? seg(t, 8.06, POUNCE_AT) * .1 : 0, landing = kick(t, BITE_AT, .07, 12);
      actor(pose, 'yoyo', px, py, height * (t >= BITE_AT ? .94 : 1), { t, flip: true, rotate: t >= POUNCE_AT && t < BITE_AT ? -.24 * Math.sin(air * Math.PI) : 0, squash: wind + landing });
      if (t >= BITE_AT) {
        const rand = seeded(731), age = t - BITE_AT; g.fillStyle = TICKET_STOCK[3][0];
        for (let i = 0; i < 30; i++) {
          const a = rand() * Math.PI * 2, speed = 240 + rand() * 720, size = (5 + rand() * 14) * U;
          const cx = notchX + Math.cos(a) * speed * age * U, cy = ticketY + Math.sin(a) * speed * age * U + 900 * age * age * U;
          g.save(); g.translate(cx, cy); g.rotate(a + age * 8); g.fillRect(-size / 2, -size / 2, size, size * .7); g.restore();
        }
      }
    });
    if (t >= BITE_AT) caption(t, BITE_AT + .16, 'YOYO EATS THE EXIT.', WIDE ? .36 * W : .5 * W, WIDE ? .84 * H : .92 * H, { size: 62, rotation: -.02 });
  }

  // — The stage: the existing cels, held, one opening at a time, with the whole house watching.
  const CONFETTI = (() => {
    const rand = seeded(2207);
    return Array.from({ length: 70 }, () => ({ x: rand(), speed: .34 + rand() * .5, delay: rand() * .5, spin: (rand() - .5) * 7, sway: rand() * 6, size: 6 + rand() * 11, color: [C.coral, C.gold, C.paper, C.lime, C.pink][Math.floor(rand() * 5)], arrow: rand() < .2 }));
  })();
  function sceneStage(t) {
    flood(C.midnight); rays(W / 2, .4 * H, C.midnightRay, t * .16, 18);
    const rise = outBack(seg(t, 9.84, 10.28), 1.3);
    const cel = t < HALF_AT ? art.closed : t < OPEN_AT ? art.half : art.open;
    const celW = WIDE ? H * 1.24 : W * 1.3, celH = celW * cel.height / cel.width;
    const baseY = WIDE ? H * .97 : H * .72;
    const y = baseY - celH + (1 - rise) * H * 1.1, x = (W - celW) / 2;
    const thump = (t >= HALF_AT && t < HALF_AT + .12) || (t >= OPEN_AT && t < OPEN_AT + .12) ? 3 * U : 0;
    const push = 1 + seg(t, OPEN_AT, TITLE_AT) * .035 + kick(t, OPEN_AT, .04, 8);
    shot(push, W / 2 + par.x * 6 * U, H * .56 + par.y * 4 * U, () => {
      g.drawImage(cel, x, y + thump, celW, celH);
      if (t >= OPEN_AT) {
        const floor = y + celH * .78, tall = celH * .43, pop = outBack(seg(t, OPEN_AT, OPEN_AT + .22));
        const bowing = t > BOW_AT;
        for (const [who, fx, scale] of [['jojo', .35, 1], ['lyly', .52, 1.06], ['yoyo', .69, .66]]) actor(bowing ? 'bow' : 'play', who, x + celW * fx, floor, tall * scale * pop, { t, depth: 6 });
      }
    });
    if (t >= OPEN_AT) {
      // Two follow spots, plus a beat of lamp-flash as the curtain clears.
      g.save(); g.globalCompositeOperation = 'screen';
      for (const [from, sweep] of [[.12, .08], [.88, -.08]]) {
        const aim = W * (.5 + sweep * Math.sin((t - OPEN_AT) * 3.1)), floorY = baseY - celH * .2, spread = 150 * U;
        const light = g.createLinearGradient(0, 0, 0, floorY);
        light.addColorStop(0, 'rgba(255,240,190,.36)'); light.addColorStop(1, 'rgba(255,240,190,.05)');
        g.fillStyle = light; g.beginPath(); g.moveTo(W * from, -20); g.lineTo(aim - spread, floorY); g.lineTo(aim + spread, floorY); g.closePath(); g.fill();
      }
      const flash = 1 - seg(t, OPEN_AT, OPEN_AT + .22);
      if (flash > 0) { g.globalAlpha = flash * .6; g.fillStyle = '#fff3c2'; g.fillRect(0, 0, W, H); }
      g.restore();
      for (const piece of CONFETTI) {
        const age = t - OPEN_AT - piece.delay;
        if (age < 0) continue;
        const px = piece.x * W + Math.sin(age * 2.4 + piece.sway) * 34 * U, py = -30 * U + age * piece.speed * H * 1.3;
        g.save(); g.translate(px, py); g.rotate(age * piece.spin); g.fillStyle = piece.color;
        const s = piece.size * U;
        if (piece.arrow) { g.beginPath(); g.moveTo(-s, -s * .3); g.lineTo(s * .3, -s * .3); g.lineTo(s * .3, -s * .7); g.lineTo(s * 1.2, 0); g.lineTo(s * .3, s * .7); g.lineTo(s * .3, s * .3); g.lineTo(-s, s * .3); g.closePath(); g.fill(); }
        else g.fillRect(-s / 2, -s / 3, s, s * .66);
        g.restore();
      }
    }
    // The house, in silhouette, close to the lens.
    const house = art.audience[t > OPEN_AT ? Math.floor(t * 3.2) % 3 : 0], houseW = WIDE ? W * 1.08 : W * 2.7, houseH = houseW * house.height / house.width;
    const lift = outCubic(seg(t, 10.02, 10.42));
    g.drawImage(house, (W - houseW) / 2 - par.x * 34 * U, H - houseH * (.86 * lift) + (t > OPEN_AT ? Math.abs(Math.sin(t * 10)) * -6 * U : 0), houseW, houseH);
    const burst = (image, at, bx, by, size, rotation) => {
      if (t < at) return;
      const pop = outBack(seg(t, at, at + .18), 2.6), gone = 1 - seg(t, at + .62, at + .78);
      if (gone <= 0) return;
      g.save(); g.translate(bx, by); g.rotate(rotation); g.scale(pop * gone, pop * gone); g.drawImage(image, -size / 2, -size / 2 * image.height / image.width, size, size * image.height / image.width); g.restore();
    };
    burst(art.burst, OPEN_AT + .08, WIDE ? .84 * W : .78 * W, WIDE ? .3 * H : .26 * H, (WIDE ? 300 : 230) * U, .12);
    burst(art.burstCall, OPEN_AT + .3, WIDE ? .15 * W : .24 * W, WIDE ? .36 * H : .2 * H, (WIDE ? 260 : 200) * U, -.14);
    caption(t, OPEN_AT + .18, 'NO TALK. ALL BARK. ALL BITE.', W / 2, WIDE ? .075 * H : .2 * H, { size: WIDE ? 56 : 48, rotation: -.012 });
  }

  // — The title, set where the page will set it, so the star opens on what you have just read.
  function sceneTitle(t) {
    g.drawImage(paperSheet, 0, 0);
    const size = (WIDE ? 150 : 158) * U, x = WIDE ? .05 * W : .07 * W, top = WIDE ? .34 * H : .22 * H, gap = size * 1.14;
    ['DO NOT', 'FEED THE', 'ARROWS.'].forEach((text, i) => slap(t, titleHits[i] - LAND, x, top + gap * i, { drop: .34, shadow: false }, () => {
      g.font = `${size}px "Special Elite"`; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      if (i === 2) {
        const width = g.measureText('ARROWS').width;
        g.fillStyle = C.pink; g.fillRect(-10 * U, -size * .46, (width + 20 * U) * outCubic(seg(t, 13.46, 13.69)), size * .46);
        g.fillStyle = C.ink;
      }
      g.fillText(text, 0, 0);
    }));
    const pop = outBack(seg(t, 13.52, 13.74));
    if (pop > 0) {
      const base = WIDE ? .92 * H : .86 * H, height = (WIDE ? .58 * H : .36 * H) * pop;
      const places = WIDE ? [['jojo', .655, 1], ['lyly', .79, 1.03], ['yoyo', .915, .62]] : [['jojo', .22, 1], ['lyly', .54, 1.03], ['yoyo', .84, .62]];
      for (const [who, fx, scale] of places) actor('play', who, fx * W, base, height * scale, { t, depth: 10 });
    }
    // One arrow is still dancing. Management is aware.
    if (t > 13.62) {
      const dance = [];
      const cx = WIDE ? .72 * W : .5 * W, cy = WIDE ? .17 * H : .58 * H;
      for (let i = 0; i <= 40; i++) { const k = i / 40; dance.push([cx + (k - .5) * 300 * U, cy + Math.sin(k * 9 + t * 6) * 26 * U * (1 - k * .4)]); }
      pencilLine(revealPolyline(dance, seg(t, 13.62, 14)), t, { width: 6, color: C.wine, headLength: 26, seed: 'dancing' });
    }
    const star = outBack(seg(t, STAR_AT - .06, STAR_AT + .16), 2.2);
    if (star > 0) {
      const sx = W / 2, sy = H / 2;
      g.fillStyle = C.ink; starPath(sx, sy, 26 * U * star + 7 * U, -Math.PI / 2 + (1 - star)); g.fill();
      g.fillStyle = C.coral; starPath(sx, sy, 26 * U * star, -Math.PI / 2 + (1 - star)); g.fill();
    }
  }

  function renderAt(t) {
    par.x += (par.goalX - par.x) * .08; par.y += (par.goalY - par.y) * .08;
    g.save();
    if (t < 3.4) {
      // The overture opens inside the star that flew off the bell, then closes on the plan.
      const close = seg(t, .92, 1.52), camera = planCamera(t);
      // The closing star lands exactly on the one drawn in the scene, wherever the camera has it.
      const sx = W / 2 + (PLAN.star[0] - camera.fx) * camera.zoom, sy = H / 2 + (PLAN.star[1] - camera.fy) * camera.zoom;
      if (close <= 0) { flood(C.coral); rays(W / 2, H / 2, C.coralRay, t * .1, 16); }
      else {
        scenePlan(t);
        if (close < 1) {
          const outer = Math.hypot(W, H) * 1.9, radius = lerp(outer, 62 * U * camera.zoom, inOut(close) ** .42), rotation = -Math.PI / 2 + (1 - close) * 1.5;
          g.fillStyle = C.ink; starPath(sx, sy, radius + 9 * U * camera.zoom, rotation); g.fill();
          g.save(); starPath(sx, sy, radius, rotation); g.clip(); flood(C.coral); rays(W / 2, H / 2, C.coralRay, t * .1, 16); g.restore();
        }
      }
    } else if (t < LYLY_AT) {
      hoop(t, 3.4, .42, PLAN.stops[0][0], PLAN.stops[0][1], () => scenePlan(3.399), () => sceneJojo(t), [C.gold, C.paper]);
    } else if (t < 7.8) {
      hoop(t, LYLY_AT, .42, WIDE ? .8 * W : .6 * W, WIDE ? .6 * H : .4 * H, () => sceneJojo(LYLY_AT - .001), () => sceneLyly(t), [C.coral, C.paper]);
    } else if (t < 9.8) {
      hoop(t, 7.8, .42, WIDE ? .2 * W : .4 * W, WIDE ? .6 * H : .4 * H, () => sceneLyly(7.799), () => sceneYoyo(t), [C.gold, C.lime]);
    } else if (t < TITLE_AT) {
      hoop(t, 9.8, .42, WIDE ? .72 * W : .6 * W, WIDE ? .44 * H : .32 * H, () => sceneYoyo(9.799), () => sceneStage(t), [C.paper, C.coral]);
    } else {
      hoop(t, TITLE_AT, .36, W / 2, WIDE ? .46 * H : .4 * H, () => sceneStage(TITLE_AT - .001), () => sceneTitle(t), [C.gold, C.coral]);
    }
    grainOver(t);
    g.restore();
  }
  return {
    resize, renderAt,
    // The film leans towards the cursor, a thing a video could never do.
    setPointer(x, y) { par.goalX = x; par.goalY = y; },
  };
}
