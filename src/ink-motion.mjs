const sprites = new WeakMap();
const castAtlases = new WeakMap();
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const poseHolds = {
  jojo: [1450, 1050, 850, 1250, 1000],
  lyly: [430, 300, 240, 390, 340],
  yoyo: [950, 700, 550, 850, 750],
};

function canvas(width, height) {
  const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : document.createElement('canvas');
  c.width = width; c.height = height;
  return c;
}

/** Extract overlapping atlas columns by alpha connectivity, preserving each actor's pixels. */
export function splitCastAtlas(image) {
  if (castAtlases.has(image)) return castAtlases.get(image);
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  if (!width || !height) throw new TypeError('Load the cast atlas before splitting it.');
  const source = canvas(width, height), g = source.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0);
  const pixels = g.getImageData(0, 0, width, height).data, count = width * height;
  const labels = new Int32Array(count), queue = new Int32Array(count), components = [];
  // Exclude near-transparent pencil dust from connectivity, but restore it below.
  for (let p = 0; p < count; p++) {
    if (labels[p] || pixels[p * 4 + 3] < 16) continue;
    const firstX = p % width, firstY = (p - firstX) / width, id = components.length + 1;
    const c = { id, count: 0, cx: 0, cy: 0, minX: firstX, maxX: firstX, minY: firstY, maxY: firstY };
    let head = 0, tail = 1; queue[0] = p; labels[p] = id;
    while (head < tail) {
      const at = queue[head++], x = at % width, y = (at - x) / width;
      c.count++; c.cx += x; c.cy += y;
      c.minX = Math.min(c.minX, x); c.maxX = Math.max(c.maxX, x);
      c.minY = Math.min(c.minY, y); c.maxY = Math.max(c.maxY, y);
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
          const next = yy * width + xx;
          if (!labels[next] && pixels[next * 4 + 3] >= 16) { labels[next] = id; queue[tail++] = next; }
        }
      }
    }
    c.cx /= c.count; c.cy /= c.count; components.push(c);
  }
  const bodies = [...components].sort((a, b) => b.count - a.count).slice(0, 3).sort((a, b) => a.cx - b.cx);
  if (bodies.length !== 3 || bodies.some(c => c.count < 100)) throw new Error('The atlas must contain three separate opaque cast bodies.');
  const nearest = c => {
    let owner = 0, best = Infinity;
    bodies.forEach((b, i) => {
      const dx = Math.max(b.minX - c.maxX, c.minX - b.maxX, 0), dy = Math.max(b.minY - c.maxY, c.minY - b.maxY, 0);
      const score = Math.hypot(dx, dy) + .15 * Math.hypot(c.cx - b.cx, c.cy - b.cy);
      if (score < best) { best = score; owner = i + 1; }
    });
    return owner;
  };
  const componentOwners = new Uint8Array(components.length + 1);
  for (const c of components) componentOwners[c.id] = bodies.indexOf(c) + 1 || nearest(c);
  const owners = new Uint8Array(count), boxes = bodies.map(() => ({ minX: width, minY: height, maxX: -1, maxY: -1 }));
  for (let p = 0; p < count; p++) {
    if (!pixels[p * 4 + 3]) continue;
    const x = p % width, y = (p - x) / width;
    let owner = componentOwners[labels[p]];
    // Faint antialias pixels follow their nearest labelled neighbour before a body bbox.
    if (!owner) {
      let distance = Infinity;
      for (let yy = Math.max(0, y - 2); yy <= Math.min(height - 1, y + 2); yy++) {
        for (let xx = Math.max(0, x - 2); xx <= Math.min(width - 1, x + 2); xx++) {
          const candidate = componentOwners[labels[yy * width + xx]], d = (xx - x) ** 2 + (yy - y) ** 2;
          if (candidate && d < distance) { owner = candidate; distance = d; }
        }
      }
    }
    if (!owner) owner = nearest({ minX: x, maxX: x, minY: y, maxY: y, cx: x, cy: y });
    owners[p] = owner;
    if (pixels[p * 4 + 3] >= 16) {
      const b = boxes[owner - 1];
      b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x); b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
    }
  }
  const result = {};
  ['jojo', 'lyly', 'yoyo'].forEach((who, i) => {
    const b = boxes[i];
    // Four pixels retain the soft pencil fringe without distant alpha-1 dust inflating the actor.
    b.minX = Math.max(0, b.minX - 4); b.maxX = Math.min(width - 1, b.maxX + 4);
    b.minY = Math.max(0, b.minY - 4); b.maxY = Math.min(height - 1, b.maxY + 4);
    const w = b.maxX - b.minX + 1, h = b.maxY - b.minY + 1, cut = canvas(w, h);
    const ctx = cut.getContext('2d', { willReadFrequently: true }), data = ctx.createImageData(w, h);
    for (let y = b.minY; y <= b.maxY; y++) for (let x = b.minX; x <= b.maxX; x++) {
      const p = y * width + x;
      if (owners[p] !== i + 1) continue;
      const from = p * 4, to = ((y - b.minY) * w + x - b.minX) * 4;
      data.data[to] = pixels[from]; data.data[to + 1] = pixels[from + 1]; data.data[to + 2] = pixels[from + 2]; data.data[to + 3] = pixels[from + 3];
    }
    ctx.putImageData(data, 0, 0); result[who] = cut;
  });
  castAtlases.set(image, result);
  return result;
}

function grain(frame, width, height, phase, amplitude) {
  const tile = canvas(64, 64), g = tile.getContext('2d', { willReadFrequently: true });
  let seed = 21917 + phase * 731;
  const random = () => { seed = Math.imul(seed ^ seed >>> 15, 2246822519); seed ^= seed >>> 13; return (seed >>> 0) / 4294967296; };
  for (let i = 0; i < 160; i++) {
    g.fillStyle = i % 3 ? `rgba(255,246,220,${.035 * amplitude})` : `rgba(38,40,54,${.025 * amplitude})`;
    g.fillRect(random() * 64, random() * 64, .45 + random() * .8, .5 + random());
  }
  g.strokeStyle = `rgba(255,246,220,${.035 * amplitude})`; g.lineWidth = .5;
  for (let i = 0; i < 6; i++) {
    const x = random() * 64, y = random() * 64;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.5, y - 2.5); g.stroke();
  }
  const f = frame.getContext('2d', { willReadFrequently: true });
  f.globalCompositeOperation = 'source-atop';
  f.fillStyle = f.createPattern(tile, 'repeat'); f.fillRect(0, 0, width, height);
  f.globalCompositeOperation = 'source-over';
}

function makeFrames(image, rect, amplitude) {
  const width = Math.max(1, Math.round(rect[2])), height = Math.max(1, Math.round(rect[3]));
  const original = canvas(width, height), g = original.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, ...rect, 0, 0, width, height);
  // Read once per crop: subsequent animation frames only copy a cached canvas.
  const pixels = g.getImageData(0, 0, width, height).data;
  const strengthField=new Float32Array(width*height),occupied=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=y*width+x,i=p*4,a=pixels[i+3],l=pixels[(y*width+Math.max(0,x-2))*4+3],r=pixels[(y*width+Math.min(width-1,x+2))*4+3],u=pixels[(Math.max(0,y-2)*width+x)*4+3],d=pixels[(Math.min(height-1,y+2)*width+x)*4+3];
    const high=Math.max(a,l,r,u,d);if(!high)continue;occupied[p]=1;
    const contour=(high-Math.min(a,l,r,u,d))/255,ink=1-(pixels[i]+pixels[i+1]+pixels[i+2])/765,taper=Math.min(1,x/3,y/3,(width-1-x)/3,(height-1-y)/3);
    strengthField[p]=amplitude*(.12+contour*1.6+ink*.13)*taper;
  }
  const frames = [];
  for (let phase = 0; phase < 3; phase++) {
    const angle = phase * Math.PI * 2 / 3, frame = canvas(width, height);
    const f = frame.getContext('2d', { willReadFrequently: true }), result = f.createImageData(width, height), dest = result.data;
    const xs = Array.from({ length: width }, (_, x) => [Math.sin(x * .043 + angle), Math.sin(x * .107 - angle)]);
    const ys = Array.from({ length: height }, (_, y) => [Math.sin(y * .037 + angle + .7), Math.cos(y * .083 - angle)]);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p=y*width+x,i=p*4;if(!occupied[p])continue;
      const strength=strengthField[p];
      const px = clamp(x + strength * (.64 * ys[y][0] + .36 * xs[x][1] * ys[y][1]), 0, width - 1);
      const py = clamp(y + strength * (.58 * xs[x][0] + .42 * ys[y][1] * xs[x][1]), 0, height - 1);
      const x0 = Math.floor(px), y0 = Math.floor(py), tx = px - x0, ty = py - y0;
      const x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),i0=(y0*width+x0)*4,i1=(y0*width+x1)*4,i2=(y1*width+x0)*4,i3=(y1*width+x1)*4;
      const a0=(1-tx)*(1-ty)*pixels[i0+3],a1=tx*(1-ty)*pixels[i1+3],a2=(1-tx)*ty*pixels[i2+3],a3=tx*ty*pixels[i3+3],a=a0+a1+a2+a3;
      if (!a) continue;
      // Premultiplied sampling keeps hidden RGB in transparent pixels out of the outline.
      const hash = Math.imul((x >> 1) + phase * 271, 374761393) ^ Math.imul(y >> 1, 668265263);
      const shade = (((hash ^ hash >>> 13) >>> 0) % 257 / 256 - .5) * 2.5 * amplitude;
      dest[i]=(pixels[i0]*a0+pixels[i1]*a1+pixels[i2]*a2+pixels[i3]*a3)/a+shade;
      dest[i+1]=(pixels[i0+1]*a0+pixels[i1+1]*a1+pixels[i2+1]*a2+pixels[i3+1]*a3)/a+shade;
      dest[i+2]=(pixels[i0+2]*a0+pixels[i1+2]*a1+pixels[i2+2]*a2+pixels[i3+2]*a3)/a+shade;dest[i+3]=a;
    }
    f.putImageData(result, 0, 0); grain(frame, width, height, phase, amplitude); frames.push(frame);
  }
  return frames;
}

/** RAF milliseconds in; three held drawings at five frames per second out. */
export function inkPhase(time, reducedMotion = false) {
  return reducedMotion ? 0 : Math.floor(Math.max(0, Number.isFinite(time) ? time : 0) / 200) % 3;
}

/** Five held atlas poses with a different rhythm per performer; time is RAF milliseconds. */
export function poseFrame(time, who, reducedMotion = false) {
  const holds = poseHolds[String(who).toLowerCase()];
  if (!Array.isArray(holds)) throw new RangeError(`Unknown JOLLY performer: ${who}`);
  if (reducedMotion) return 0;
  let t = Math.max(0, Number.isFinite(time) ? time : 0) % holds.reduce((sum, hold) => sum + hold, 0);
  for (let pose = 0; pose < holds.length - 1; pose++) {
    if (t < holds[pose]) return pose;
    t -= holds[pose];
  }
  return holds.length - 1;
}

/** Source/destination rectangles are [x, y, width, height]; amplitude is in source pixels. */
export function drawBoiledSprite(ctx, image, sourceRect, destRect, { phase = 0, amplitude = 1 } = {}) {
  for (const rect of [sourceRect, destRect]) {
    if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isFinite) || rect[2] <= 0 || rect[3] <= 0) {
      throw new TypeError('Sprite rectangles must be [x, y, positive width, positive height].');
    }
  }
  const amount = clamp(Number.isFinite(amplitude) ? amplitude : 1, 0, 4);
  if (!amount) { ctx.drawImage(image, ...sourceRect, ...destRect); return; }
  let crops = sprites.get(image);
  if (!crops) { crops = new Map(); sprites.set(image, crops); }
  const key = sourceRect.join(','); let cached = crops.get(key);
  // A crop keeps only its current amplitude, so changing a shot cannot grow an unbounded cache.
  if (!cached || cached.amplitude !== amount) {
    cached = { amplitude: amount, frames: makeFrames(image, sourceRect, amount) }; crops.set(key, cached);
  }
  const held = ((Math.floor(Number.isFinite(phase) ? phase : 0) % 3) + 3) % 3;
  ctx.drawImage(cached.frames[held], ...destRect);
}
