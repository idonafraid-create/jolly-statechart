// How the house lights change: a cat's shadow leaps out of the wall and grows until it is the room.
// The old page is a snapshot and the new one is live, both held by View Transitions. This file shapes the opening between them
// and draws what surrounds it on a canvas above. All of it runs off one clock, so any instant can be reproduced with seek().
const clamp = (t, a = 0, b = 1) => Math.max(a, Math.min(b, t));
const lerp = (a, b, t) => a + (b - a) * t;

// The cat comes in from off the edge of the screen and makes two leaps at you, the second bigger and a touch quicker, until her body is the whole room.
const LEAPS = {
  // Lights going down: in from the right. A long low bound along the floor, then a tall leap up and at you.
  night: { facing: 'l', duration: 980, split: .53, x: [1.22, .8, .4], y: [.66, .72, .52], rise: [.15, .36], lean: [[.2, -.2], [.32, -.12]] },
  // Lights coming up: in from the left. A tall springing bound, then a long flat-out one.
  day: { facing: 'r', duration: 940, split: .53, x: [-.24, .17, .62], y: [.8, .72, .5], rise: [.34, .19], lean: [[-.32, .24], [-.18, .1]] },
};
const CAT = {
  angles: [-.32, -.2133, -.1067, 0, .1067, .2133, .32],
  width: .78,                        // Her width as a share of the square frame.
  startWidth: .26,                   // Her width as she leaves the ground, as a share of the screen.
  landing: .16,                      // How far along the size scale she has got by the first landing: the first hop must read as a hop.
  // Rectangles that fit inside her body, for each screen shape, from build-cat-masks.py. Left-facing, upright.
  bodies: [[.272, .403, .359, .594], [.269, .425, .372, .594], [.269, .45, .384, .594], [.534, .478, .659, .603], [.528, .481, .691, .603], [.394, .494, .575, .606], [.397, .494, .603, .603], [.372, .494, .634, .603]],
};
function keyAt(track, t) {
  for (let i = 1; i < track.length; i++) if (t <= track[i][0]) return lerp(track[i - 1][1], track[i][1], (t - track[i - 1][0]) / (track[i][0] - track[i - 1][0]));
  return track[track.length - 1][1];
}
// The bulb complains before anything else happens, then the room sinks as her shadow grows.
const BROWNOUT = [[0, 0], [40, .16], [70, .05], [110, .2], [150, .08], [190, .12], [700, .16], [1300, .3]];
const SUNRISE = [[0, 0], [70, .06], [120, .02], [190, .05], [800, .08], [1300, .2]];

// Facing left for the lights going down, right for coming up. Fetched and softened in the page's idle time, not while it is loading.
const cats = {};
function prepareCat(facing) {
  if (cats[facing]) return cats[facing];
  const set = cats[facing] = { frames: CAT.angles.map((_, index) => { const image = new Image(); image.src = `/jolly-statechart/assets/after-hours/cat-mask-${facing}${index}.webp`; return image; }) };
  // Lamplight round the dark going down, daylight spilling out of her going up.
  const colour = facing === 'l' ? '#f0b75c' : '#ffefc4';
  set.ready = Promise.all(set.frames.map(image => image.decode())).then(async () => {
    // Blurring is the one costly step, so it happens once, a frame at a time, and is then only stamped.
    set.soft = [];
    for (const image of set.frames) {
      const size = 320, canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const g = canvas.getContext('2d');
      g.filter = 'blur(6px)';
      g.drawImage(image, 0, 0, size, size);
      g.filter = 'none'; g.globalCompositeOperation = 'source-in'; g.fillStyle = colour; g.fillRect(0, 0, size, size);
      set.soft.push(canvas);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    set.ok = true;
  }).catch(() => { delete cats[facing]; });
  return set;
}
// The smallest she can end up and still cover a screen this shape, standing at the spot where the leap finishes.
function finalSize(leap, w, h) {
  const reachX = Math.max(leap.x[2], 1 - leap.x[2]) * w * 2, reachY = Math.max(leap.y[2], 1 - leap.y[2]) * h * 2;
  let best = null;
  for (const [left, top, right, bottom] of CAT.bodies) {
    const size = Math.max(reachX / (right - left), reachY / (bottom - top)) * 1.03;
    if (!best || size < best.size) best = { size, across: (left + right) / 2, down: (top + bottom) / 2 };
  }
  return best;
}
function catPose(t, leap, w, h) {
  const p = clamp(t / leap.duration), second = p >= leap.split ? 1 : 0;
  const phase = second ? (p - leap.split) / (1 - leap.split) : p / leap.split, arc = Math.sin(Math.PI * phase);
  const end = finalSize(leap, w, h), start = Math.max(w * CAT.startWidth, 170) / CAT.width;
  // The first hop grows a little. The second keeps its size through the top of its arc so it reads as a jump, and only then comes at you.
  const growth = second ? lerp(CAT.landing, 1, phase ** 3) : CAT.landing * phase;
  const size = start * (end.size / start) ** growth;
  // A hop covers its ground evenly; all the drama is in the height.
  const x = lerp(leap.x[second], leap.x[second + 1], phase) * w, y = (lerp(leap.y[second], leap.y[second + 1], phase) - arc * leap.rise[second]) * h;
  const angle = lerp(leap.lean[second][0], leap.lean[second][1], phase);
  // Long in the air, and flattened for an instant where she touches down between the two.
  const touchdown = Math.exp(-(((t - leap.duration * leap.split) / 34) ** 2));
  const sx = (1 + .14 * arc) * (1 + .12 * touchdown), sy = (1 - .1 * arc) * (1 - .16 * touchdown);
  // A right-facing frame leans the opposite way to the angle it was baked at.
  const wanted = leap.facing === 'l' ? angle : -angle;
  const frame = CAT.angles.reduce((best, value, index) => (Math.abs(value - wanted) < Math.abs(CAT.angles[best] - wanted) ? index : best), 0);
  const across = leap.facing === 'l' ? end.across : 1 - end.across;
  return { frame, left: x - size * sx * across, top: y - size * sy * end.down, width: size * sx, height: size * sy, growth };
}

// Nothing behind the door can be used until it has gone, so nothing behind it spends the door's time.
export function afterDoor(work) {
  const root = document.documentElement;
  const whenLoaded = () => { if (document.readyState === 'complete') work(); else addEventListener('load', work, { once: true }); };
  if (!root.classList.contains('opening-pending') && !root.classList.contains('opening-active')) return whenLoaded();
  // The door can also give up without a word, so this keeps looking as well as listening.
  let done = false;
  const go = () => { if (done) return; done = true; removeEventListener('jolly:door-left', go); whenLoaded(); };
  addEventListener('jolly:door-left', go);
  const look = () => { if (done) return; if (root.classList.contains('opening-pending') || root.classList.contains('opening-active')) setTimeout(look, 2000); else go(); };
  setTimeout(look, 2000);
}

export function createChange({ root, setHouse, sound }) {
  const canvas = document.createElement('canvas'); canvas.className = 'ah-change'; canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const g = canvas.getContext('2d');
  // Prepared ahead, so the first press is as quick as the tenth, but not while the page is still loading.
  const whenIdle = window.requestIdleCallback || (work => setTimeout(work, 200));
  const prepareNext = () => whenIdle(() => {
    const next = root.dataset.house === 'down' ? 'r' : 'l';
    // The way she'll go next first, then the way back, so going back and forth quickly never loses her.
    prepareCat(next).ready?.then(() => whenIdle(() => prepareCat(next === 'l' ? 'r' : 'l')));
  });
  afterDoor(prepareNext);
  let current = null, presses = 0;

  // Her body is the opening; every other frame's layer is size zero, so none of them has to be fetched again mid-flight.
  const catMask = pose => ({
    maskSize: CAT.angles.map((_, index) => (index === pose.frame ? `${pose.width}px ${pose.height}px` : '0px 0px')).join(','),
    maskPosition: CAT.angles.map(() => `${pose.left}px ${pose.top}px`).join(','),
  });
  function drawCatRoom(t, leap, down, w, h, pose) {
    // Everything here falls on the old room only: the last step cuts her shape back out of it.
    const shade = keyAt(down ? BROWNOUT : SUNRISE, t * 1300 / leap.duration);
    g.fillStyle = down ? `rgba(6,3,10,${shade})` : `rgba(255,236,190,${shade})`;
    g.fillRect(0, 0, w, h);
    // A thin lit edge, and the fainter places she has just been. The edge thins out as she grows, or it would swallow the room.
    const { soft, frames } = cats[leap.facing], stamp = (at, alpha, spread) => {
      g.globalAlpha = alpha;
      g.drawImage(soft[at.frame], at.left - at.width * spread / 2, at.top - at.height * spread / 2, at.width * (1 + spread), at.height * (1 + spread));
    };
    for (let back = 2; back >= 1; back--) { const when = t - back * 30; if (when > 0) stamp(catPose(when, leap, w, h), (down ? .1 : .16) * .6 ** (back - 1), .01); }
    stamp(pose, (down ? .62 : .7) * lerp(1, .4, pose.growth), .022);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(frames[pose.frame], pose.left, pose.top, pose.width, pose.height);
    g.globalCompositeOperation = 'source-over';
  }

  function run(down) {
    const w = innerWidth, h = innerHeight, leap = LEAPS[down ? 'night' : 'day'];
    canvas.width = w; canvas.height = h;
    const cue = () => { root.classList.add('ah-change-cat', down ? 'ah-to-night' : 'ah-to-day'); canvas.classList.add('on'); setHouse(down); };
    const transition = document.startViewTransition(cue);
    const clearUp = () => { root.classList.remove('ah-change-cat', 'ah-to-night', 'ah-to-day'); canvas.classList.remove('on'); g.clearRect(0, 0, w, h); };
    const state = { transition, stopped: false };
    current = state;
    const duration = leap.duration;
    let animation = null;
    const hold = keyframe => animation?.effect.setKeyframes([keyframe, keyframe]);
    const seek = t => {
      g.clearRect(0, 0, w, h);
      const pose = catPose(t, leap, w, h);
      hold(catMask(pose));
      drawCatRoom(t, leap, down, w, h, pose);
    };
    const finish = () => { if (state.stopped) return; state.stopped = true; animation?.finish(); };
    state.ready = transition.ready.then(() => {
      if (state.stopped) return;
      const start = catMask(catPose(0, leap, w, h));
      animation = root.animate([start, start], { duration: 1000, fill: 'both', pseudoElement: '::view-transition-new(root)' });
      animation.pause();
      if (window.__ahReview) { window.__ahReview.seek = seek; window.__ahReview.finish = finish; seek(0); return; }
      const started = performance.now();
      const frame = now => {
        if (state.stopped) return;
        const t = now - started;
        seek(Math.max(0, t));
        if (t >= duration) finish(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      // A hidden tab has no frames; the change still has to finish.
      setTimeout(finish, duration + 500);
    }).catch(() => {});
    transition.finished.finally(() => { if (current === state) { current = null; } state.stopped = true; clearUp(); });
    // Her one landing.
    sound('paw', { gain: .8, delay: leap.duration * leap.split / 1000 });
    return state;
  }
  return {
    press(down) {
      // Every fourth press, a word from YOYO on the way past, whether or not there's a cat to show for it.
      if (++presses % 4 === 0) sound('yoyo', { gain: .8, delay: .06 });
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (current) { current.stopped = true; current.transition.skipTransition(); current = null; }
      if (!document.startViewTransition || reduced || !cats[down ? 'l' : 'r']?.ok) { setHouse(down); return null; }
      return run(down);
    },
    get busy() { return Boolean(current); },
  };
}
