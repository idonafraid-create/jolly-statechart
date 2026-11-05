// A cat has walked across the rug, and wherever she trod the pile has taken up gold. Her prints arrive one at a time, slowly, along a path that wanders from side to side;
// she slips under the sheet and comes out the other side; and behind her they fade.
// A print is the rug itself, lined up with the rug around it and recoloured, so the same fibres run straight through it. It is drawn once, then only opacity and scale change.
const STRIDE_MS = 1500, PRESS_MS = 1100, RECOVER_MS = 15000, UNDER_SHEET_MS = 4200, REST_MS = 7000;
// The dye and how bright it comes up, in the shade and in the sun.
const GOLD = '#d3ab62', IN_SHADE = 1.5, IN_SUN = 2.05;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const generator = seed => () => { seed = Math.imul(seed + 0x6d2b79f5, 1) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// One paw, one unit wide, toes toward -y. Four toes and the three-lobed pad behind them, spaced so the gaps survive being pressed into long pile.
function padShapes() {
  const oval = (cx, cy, rx, ry, turn) => Array.from({ length: 22 }, (_, i) => {
    const a = i / 22 * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * Math.cos(turn) - y * Math.sin(turn), cy + x * Math.sin(turn) + y * Math.cos(turn)];
  });
  const curve = (p0, p1, p2, p3, count) => Array.from({ length: count }, (_, i) => {
    const t = i / count, u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  });
  const half = [
    ...curve([0, -.02], [.15, -.02], [.2, .1], [.3, .19], 7),
    ...curve([.3, .19], [.43, .29], [.42, .46], [.26, .48], 7),
    ...curve([.26, .48], [.2, .49], [.14, .43], [.09, .44], 4),
    ...curve([.09, .44], [.06, .45], [.03, .49], [0, .49], 3),
  ];
  const pad = [...half, ...half.slice(1).reverse().map(([x, y]) => [-x, y])];
  return [oval(-.43, -.16, .118, .165, -.45), oval(-.155, -.41, .112, .17, -.12), oval(.155, -.41, .112, .17, .12), oval(.43, -.16, .118, .165, .45), pad];
}
const PADS = padShapes();

// The rug's brightness, a byte a pixel, stretched to the full range so a fibre's tip is near 1 and the valley under it near 0.
let rug = null;
async function loadRug() {
  if (rug) return rug;
  const image = new Image(), sunlight = new Image(); image.src = '/jolly-statechart/assets/after-hours/day-rug.webp'; sunlight.src = '/jolly-statechart/assets/after-hours/blinds-light.webp';
  await Promise.all([image.decode(), sunlight.decode()]);
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  const g = canvas.getContext('2d', { willReadFrequently: true }); g.drawImage(image, 0, 0);
  const rgba = g.getImageData(0, 0, image.width, image.height).data, values = new Float32Array(image.width * image.height);
  for (let i = 0; i < values.length; i++) values[i] = (rgba[i * 4] + rgba[i * 4 + 1] * 2 + rgba[i * 4 + 2]) / 1020;
  const sample = Array.from(values.filter((_, i) => i % 97 === 0)).sort((a, b) => a - b), low = sample[Math.floor(sample.length * .05)], high = sample[Math.floor(sample.length * .97)];
  const bytes = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) bytes[i] = Math.max(0, Math.min(255, (values[i] - low) / (high - low) * 255));
  // How large the tile is laid on the page, so a print lines up with the very fibres underneath it.
  rug = { image, sunlight, bytes, width: image.width, height: image.height, shown: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--day-size')) || image.width };
  return rug;
}
const fibreAt = (x, y) => {
  const k = rug.width / rug.shown, ix = Math.floor(x * k) % rug.width, iy = Math.floor(y * k) % rug.height;
  return rug.bytes[(iy < 0 ? iy + rug.height : iy) * rug.width + (ix < 0 ? ix + rug.width : ix)] / 255;
};
const ramp = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// A small box blur, run twice. canvas filters aren't everywhere, and this is only a few thousand pixels.
function blurred(values, side, radius) {
  const r = Math.max(1, Math.round(radius)), width = 2 * r + 1;
  let from = values, to = new Float32Array(values.length);
  for (let pass = 0; pass < 4; pass++) {
    const across = pass % 2 === 0;
    for (let line = 0; line < side; line++) {
      let sum = 0;
      for (let at = -r; at <= r; at++) { const c = Math.max(0, Math.min(side - 1, at)); sum += from[across ? line * side + c : c * side + line]; }
      for (let at = 0; at < side; at++) {
        to[across ? line * side + at : at * side + line] = sum / width;
        const leaving = Math.max(0, at - r), arriving = Math.min(side - 1, at + r + 1);
        sum += from[across ? line * side + arriving : arriving * side + line] - from[across ? line * side + leaving : leaving * side + line];
      }
    }
    if (pass === 0) { from = to; to = new Float32Array(values.length); } else { const held = from; from = to; to = held; }
  }
  return from;
}

function drawPrint({ x, y, size, angle }) {
  const span = Math.ceil(size * 1.8), mid = span / 2, cos = Math.cos(angle), sin = Math.sin(angle);
  // On whole pixels, so the print's fibres sit exactly on the rug's.
  const left = Math.round(x - mid), top = Math.round(y - mid);
  const shapeSheet = document.createElement('canvas'); shapeSheet.width = shapeSheet.height = span;
  const g = shapeSheet.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff';
  for (const pad of PADS) {
    g.beginPath();
    pad.forEach(([px, py], i) => { const ux = px * size, uy = (py - .04) * size, wx = mid + ux * cos - uy * sin, wy = mid + ux * sin + uy * cos; if (i) g.lineTo(wx, wy); else g.moveTo(wx, wy); });
    g.closePath(); g.fill();
  }
  const raw = g.getImageData(0, 0, span, span).data, shape = new Float32Array(span * span);
  for (let i = 0; i < shape.length; i++) shape[i] = raw[i * 4 + 3] / 255;
  // A dye boundary and not a cut: soft, and following the strands that are actually there.
  const soft = blurred(shape, span, size * .022), edge = g.createImageData(span, span);
  for (let py = 0, i = 0; py < span; py++) for (let px = 0; px < span; px++, i++) {
    edge.data[i * 4 + 3] = 255 * ramp(.34, .66, soft[i] + (fibreAt(left + px, top + py) - .42) * .3);
  }
  g.putImageData(edge, 0, 0);
  const paint = brightness => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = span;
    const c = canvas.getContext('2d'), tile = rug.shown;
    // Tile by tile rather than with a canvas pattern, which measured over 30ms each time it was made.
    for (let ty = Math.floor(top / tile); ty * tile < top + span; ty++) for (let tx = Math.floor(left / tile); tx * tile < left + span; tx++) c.drawImage(rug.image, tx * tile - left, ty * tile - top, tile, tile);
    c.globalCompositeOperation = 'color'; c.fillStyle = GOLD; c.fillRect(0, 0, span, span);
    // brightness() without a filter, which keeps this working wherever canvas filters don't.
    c.globalCompositeOperation = 'lighter';
    for (let more = brightness - 1; more > .001; more--) { c.globalAlpha = Math.min(1, more); c.drawImage(canvas, 0, 0); }
    c.globalAlpha = 1;
    return { canvas, c };
  };
  // The stripes of sun fall across it as they do across the rug. Baked in here, so a print needn't live inside the masked full-screen sun layer, where every change would touch the whole layer.
  const { canvas: print, c } = paint(IN_SHADE), { canvas: inSun, c: sunny } = paint(IN_SUN);
  sunny.globalCompositeOperation = 'destination-in';
  sunny.drawImage(rug.sunlight, -left, -top, document.documentElement.clientWidth, innerHeight);
  c.globalCompositeOperation = 'source-over'; c.drawImage(inSun, 0, 0);
  c.globalCompositeOperation = 'destination-in'; c.drawImage(shapeSheet, 0, 0);
  print.style.width = print.style.height = `${span}px`;
  return { left, top, print };
}

// Where she goes on this walk. Each leg is a wander along one side of the sheet, and between them she is out of sight under it.
function planWalk({ gl, gr, width, height, edgeL, edgeR, downward, seed }) {
  const random = generator(seed);
  const size = Math.min(84, Math.max(56, Math.min(gl, gr) * .32)), stride = size * 1.9, gait = size * .26;
  const leg = (gutter, centre, inner, from, to, enters) => {
    const amount = Math.min(gutter * .2, 52), wave = Math.max(360, Math.min(height * .56, 600)) * (.88 + random() * .3), phase = random() * 6.28, phase2 = random() * 6.28;
    const span = to - from, sign = Math.sign(span);
    // Back and forth, with a slower drift through it so no two bends are the same.
    const xAt = y => {
      const along = (y - from) / span;
      const wander = centre + amount * Math.sin(y / wave * 6.283 + phase) + amount * .3 * Math.sin(y / (wave * .56) * 6.283 + phase2);
      const blend = enters ? smooth((along - .76) / .24) : smooth((.24 - along) / .24);
      return lerp(wander, inner, blend);
    };
    const prints = []; let y = from, x = xAt(y), travelled = 0, side = random() < .5 ? 1 : -1;
    const fine = 2 * sign;
    while ((to - y) * sign > 0) {
      const ny = y + fine, nx = xAt(ny), piece = Math.hypot(nx - x, ny - y);
      travelled += piece;
      if (travelled >= stride) {
        travelled = 0; side = -side;
        const fx = (nx - x) / piece, fy = (ny - y) / piece, px = nx - fy * gait * side, py = ny + fx * gait * side;
        // Mostly she keeps walking, but now and then she stops to think about it.
        prints.push({ x: px, y: py, angle: Math.atan2(fx, -fy) + (random() - .5) * .22, size: size * (.94 + random() * .1), weight: .86 + random() * .14, pace: .9 + random() * .25, linger: random() < .12 ? 1400 + random() * 1200 : 0 });
      }
      x = nx; y = ny;
    }
    return prints.filter(print => print.y > -size * 1.3 && print.y < height + size * 1.3);
  };
  const leftAt = gl / 2, rightAt = width - gr / 2;
  const legs = downward
    ? [leg(gl, leftAt, edgeL + size * .4, -size * 2, height * (.5 + random() * .16), true), leg(gr, rightAt, edgeR - size * .4, height * (.28 + random() * .16), height + size * 2, false)]
    : [leg(gr, rightAt, edgeR - size * .4, height + size * 2, height * (.34 + random() * .16), true), leg(gl, leftAt, edgeL + size * .4, height * (.56 + random() * .16), -size * 2, false)];
  return [...legs[0], { under: true }, ...legs[1]];
}

export function createPaws({ root, sun, sheet, held }) {
  const layer = document.createElement('div'); layer.className = 'ah-paws'; layer.setAttribute('aria-hidden', 'true');
  sun.after(layer);
  const roomy = matchMedia('(min-width:1720px)'), still = matchMedia('(prefers-reduced-motion: reduce)');
  let timer = 0, plan = [], downward = true, seed = 1963, pressed = 0;
  const measure = () => {
    const box = sheet.getBoundingClientRect(), width = document.documentElement.clientWidth;
    return { gl: box.left, gr: width - box.right, width, height: innerHeight, edgeL: box.left, edgeR: box.right };
  };
  const place = step => {
    const { left, top, print } = drawPrint(step);
    const paw = document.createElement('div'); paw.className = 'ah-paw';
    paw.style.transform = `translate(${left}px,${top}px)`;
    paw.style.opacity = step.weight;
    paw.append(print); layer.append(paw);
    return { paw, print };
  };
  function press(step) {
    pressed++;
    const { paw, print } = place(step);
    // It takes her weight and the colour comes up under it, slowly. On held frames, like the rest of the site, and because it costs less.
    print.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1.015)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: PRESS_MS, easing: 'steps(16)' });
    paw.animate([{ opacity: step.weight }, { opacity: step.weight, offset: .14 }, { opacity: 0 }], { duration: RECOVER_MS, easing: 'steps(12)', fill: 'forwards' }).onfinish = () => paw.remove();
  }
  const plan_ = () => { seed = Math.imul(seed, 16807) % 2147483647; plan = planWalk({ ...measure(), downward, seed }); downward = !downward; };
  function step() {
    timer = 0;
    if (root.dataset.house !== 'up') return;
    if (held()) { timer = setTimeout(step, 1000); return; }
    if (!plan.length) plan_();
    const next = plan.shift();
    if (next.under) { timer = setTimeout(step, UNDER_SHEET_MS); return; }
    press(next);
    timer = setTimeout(step, plan.length ? STRIDE_MS * next.pace + next.linger : REST_MS);
  }
  const clear = () => { clearTimeout(timer); timer = 0; plan = []; layer.replaceChildren(); };
  // With motion turned off she has already been: one quiet trail, and nothing moves.
  const trail = () => {
    layer.replaceChildren();
    planWalk({ ...measure(), downward: true, seed }).filter(step => !step.under).forEach((step, index) => { place(step).paw.style.opacity = .5 + .4 * Math.sin(index * .9) ** 2; });
  };
  let turn = 0;
  async function sync() {
    clear();
    const mine = ++turn;
    if (root.dataset.house !== 'up' || !roomy.matches || document.readyState !== 'complete') return;
    try { await loadRug(); } catch { return; }
    if (mine !== turn) return;
    if (still.matches) trail(); else timer = setTimeout(step, 1600);
  }
  roomy.addEventListener('change', sync); still.addEventListener('change', sync);
  let settling = 0;
  addEventListener('resize', () => { if (!still.matches) return; clearTimeout(settling); settling = setTimeout(sync, 200); });
  return { sync, stop() { turn++; clear(); }, get pressed() { return pressed; }, get walking() { return Boolean(timer); } };
}
