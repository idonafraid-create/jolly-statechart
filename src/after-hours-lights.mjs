// The light in the room around the sheet: two old wall lamps at night, sun through blinds by day.
import { afterDoor } from './after-hours-change.mjs';
import { createPaws } from './after-hours-paws.mjs';

// Levels only change on a timer and only touch opacity on small layers that are already prepared, so a lamp costs almost nothing between steps.
// Nothing runs until the page has loaded, while the door is up, in a hidden tab, on a window too narrow to show the lamps, or under reduced motion.
const STEP = 72, RESTING = 170, SLOW_AFTER = 8, LATE = 130;
const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

// Pure functions of time, so a frame can be reproduced exactly when reviewing.
// Bad current, not a slow breath: the lamp holds, then stumbles. Short stumbles, sometimes a run of them, sometimes one long sputter.
const STUTTERS = [
  [.3, 1, .45, 1],
  [.55, .2, .9, .35, 1],
  [.7, .3, 1, .25, .85, .4, 1],
  [.2, .15, .8, .3, .95, .2, .7, .25, 1],
  [.6, 1, .6],
  [.35, .9, .2, .15, .1, .7, .3, .95, .25, .85, .4, 1],
];
const EVERY = 4800;
function stutterAt(side, t) {
  const bucket = Math.floor(t / EVERY);
  for (let b = bucket - 1; b <= bucket; b++) {
    if (hash(b * 7.7 + 2) < .22) continue;
    // One dip on the wiring reaches both lamps, a beat apart, and each takes it in its own way.
    const lead = hash(b * 3.3) < .5 ? 0 : 1, lag = side === lead ? 0 : 160 + hash(b * 5.1) * 380;
    const start = b * EVERY + hash(b * 7.7) * EVERY * .72 + lag, score = STUTTERS[Math.floor(hash(b * 7.7 + side * 31 + 1) * STUTTERS.length)];
    const index = Math.floor((t - start) / STEP);
    if (index >= 0 && index < score.length) return score[index];
  }
  return 1;
}
export const lampLevel = (side, t) => stutterAt(side, t);
// Looks a resting step ahead, so a stumble is never caught halfway through.
export const lampIsStumbling = (side, t) => [0, STEP, STEP * 2, STEP * 3].some(ahead => stutterAt(side, t + ahead) < 1);
const STRIKE = [0, 0, .62, .08, .9, .22, .7, 1];

export function createLights({ root, sheet }) {
  const make = (className, parent) => { const element = document.createElement('div'); element.className = className; element.setAttribute('aria-hidden', 'true'); parent.append(element); return element; };
  const back = make('ah-room ah-room-back', document.body), front = make('ah-room ah-room-front', document.body);
  const sides = ['left', 'right'].map((name, side) => {
    const sconce = make(`ah-sconce ${name}`, back);
    sconce.innerHTML = '<img src="/jolly-statechart/assets/after-hours/sconce.webp" alt=""><img class="ah-sconce-lit" src="/jolly-statechart/assets/after-hours/sconce.webp" alt=""><i class="ah-bloom"></i>';
    return { side, shown: -1, lit: [make(`ah-lamp ${name}`, back), sconce.querySelector('.ah-sconce-lit'), sconce.querySelector('.ah-bloom')] };
  });
  const sun = make('ah-sun', back); make('ah-blinds', front);
  // The fixed parts of the wall, in front of the lit paper so the lamps fall on the paper and not on the woodwork.
  make('ah-wainscot', back); make('ah-cornice', back);
  const place = () => {
    const box = sheet.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    for (const room of [back, front]) { room.style.setProperty('--gl', `${box.left}px`); room.style.setProperty('--gr', `${Math.max(0, width - box.right)}px`); room.style.setProperty('--cw', `${width}px`); }
  };
  place(); new ResizeObserver(place).observe(document.documentElement);

  const paint = (lamp, level) => {
    if (Math.abs(level - lamp.shown) < .012) return;
    lamp.shown = level;
    for (const layer of lamp.lit) layer.style.opacity = level;
  };
  const held = () => document.hidden || root.classList.contains('opening-active') || root.classList.contains('opening-pending');
  const allowed = matchMedia('(min-width:1720px) and (prefers-reduced-motion:no-preference)');
  let timer = 0, due = 0, late = 0, frozen = false, loaded = document.readyState === 'complete';
  const strikeAt = [-1e9, -1e9];
  const steady = () => { for (const lamp of sides) paint(lamp, 1); };
  function renderAt(t) {
    if (root.dataset.house !== 'down') return;
    for (const lamp of sides) {
      const into = Math.floor((t - strikeAt[lamp.side]) / 72);
      paint(lamp, into < 0 ? 0 : into < STRIKE.length ? STRIKE[into] : lampLevel(lamp.side, t));
    }
  }
  function tick() {
    timer = 0;
    if (frozen || !loaded || !allowed.matches) return steady();
    if (held()) { timer = setTimeout(tick, 1000); return; }
    const now = performance.now();
    // If the machine can't keep up, the lamps simply stop flickering. Reading matters more.
    late = due && now - due > LATE ? late + 1 : 0;
    if (late >= SLOW_AFTER) { frozen = true; return steady(); }
    renderAt(now);
    // Daylight doesn't change, and a lamp that is holding steady needs fewer looks.
    if (root.dataset.house !== 'down') return;
    let wait = STEP;
    if (!sides.some(lamp => lampIsStumbling(lamp.side, now) || (now > strikeAt[lamp.side] - RESTING && now < strikeAt[lamp.side] + 72 * STRIKE.length))) wait = RESTING;
    due = now + wait;
    timer = setTimeout(tick, wait);
  }
  const start = () => { if (!timer) { due = 0; tick(); } };
  const stop = () => { clearTimeout(timer); timer = 0; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  allowed.addEventListener('change', () => { stop(); start(); });
  const paws = createPaws({ root, sun, sheet, held });
  afterDoor(() => paws.sync());
  addEventListener('load', () => { loaded = true; start(); }, { once: true });
  steady();
  start();
  return {
    // The lamps catch one after the other, as the dark reaches them.
    strike(leftDelay = 0, rightDelay = 0) { const now = performance.now(); strikeAt[0] = now + leftDelay; strikeAt[1] = now + rightDelay; start(); },
    changed() { sides.forEach(lamp => { lamp.shown = -1; }); stop(); start(); paws.sync(); },
    paws,
    renderAt, stop,
    get frozen() { return frozen; }, get running() { return Boolean(timer); },
  };
}
