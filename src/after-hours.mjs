// After Hours: the rug the sheet lies on by day, the notice board it turns into at night, and the switch between them.
import { afterDoor, createChange } from './after-hours-change.mjs';
import { createLights } from './after-hours-lights.mjs';
import { sfx } from './sfx.mjs';

const root = document.documentElement, sheet = document.querySelector('.paper-world');
const FELT = [['.cover', '#0d1444'], ['#act-1', '#0f1850'], ['#act-2', '#38101e'], ['#act-3', '#0c2a1f'], ['#act-4', '#370b24'], ['#instrument-studies', '#0a2a31'], ['#paper-theatre', '#0c070e'], ['#record-finale', '#1e0f08']];

const felt = document.createElement('div'); felt.className = 'ah-felt'; felt.setAttribute('aria-hidden', 'true');
sheet.prepend(felt);
const frame = document.createElement('div'); frame.className = 'ah-frame'; frame.setAttribute('aria-hidden', 'true');
sheet.append(frame);
const prop = (name, className) => {
  const image = new Image(); image.src = `/jolly-statechart/assets/after-hours/${name}.webp`; image.alt = ''; image.className = className;
  image.setAttribute('aria-hidden', 'true'); sheet.append(image);
};
['tl', 'tr', 'bl', 'br'].forEach(corner => prop('corner', `ah-corner ${corner}`));
// The clips grip the sheet from outside it, so they hang on the page and not in the clipped sheet.
for (const side of ['left', 'right']) {
  const clip = new Image(); clip.src = '/jolly-statechart/assets/after-hours/clip.webp'; clip.alt = ''; clip.className = `ah-clip ${side}`;
  clip.setAttribute('aria-hidden', 'true'); document.body.append(clip);
}

// The cloth changes as a chapter arrives, not once it is half read: the line sits low on the screen going down and high going up.
const chapters = [];
let lastY = scrollY, heading = 1, cloth = null, queued = false;
function chooseCloth() {
  queued = false;
  // A small nudge the other way doesn't count as turning back, or a colour could flicker at the boundary.
  const moved = scrollY - lastY;
  if (Math.abs(moved) >= 48) { heading = Math.sign(moved); lastY = scrollY; }
  const line = innerHeight * (heading > 0 ? .78 : .22);
  let colour = null;
  for (const section of chapters) if (section.getBoundingClientRect().top <= line) colour = section.dataset.felt;
  if (colour && colour !== cloth) { cloth = colour; felt.style.setProperty('--felt', colour); }
}
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(chooseCloth); } }, { passive: true });
addEventListener('resize', chooseCloth);
// The chapters are built after the page starts, so keep looking until they have all turned up.
const waiting = new Set(FELT.map(([selector]) => selector));
const watchChapters = () => {
  for (const [selector, colour] of FELT) {
    const section = waiting.has(selector) && document.querySelector(selector);
    if (section) { section.dataset.felt = colour; chapters.push(section); waiting.delete(selector); }
  }
  // In reading order, whichever order they turned up in.
  chapters.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  chooseCloth();
  if (waiting.size) setTimeout(watchChapters, 300);
};
watchChapters();

const button = document.createElement('button');
button.className = 'ah-switch'; button.type = 'button';
button.innerHTML = '<span class="ah-chain"></span><img class="ah-pull-star" src="/jolly-statechart/assets/after-hours/pull.webp" alt="">';
document.body.append(button);
// The cord hangs in the empty stretch of the masthead, halfway between the two groups of words.
function hangCord() {
  const mast = document.querySelector('.masthead'), sound = document.querySelector('#sound');
  const words = mast.querySelector('p'), group = words && getComputedStyle(words).display !== 'none' ? words : mast.querySelector('.wordmark');
  const range = document.createRange(); range.selectNodeContents(group);
  const from = range.getBoundingClientRect().right, to = sound.getBoundingClientRect().left;
  const row = mast.getBoundingClientRect(), middle = range.getBoundingClientRect().top + range.getBoundingClientRect().height / 2 + scrollY;
  const x = (from + to) / 2;
  button.style.setProperty('--pull-x', `${x}px`);
  button.style.setProperty('--pull-drop', `${Math.max(row.height ? middle + 21 : 60, 42)}px`);
  // The clips line up with the two ends of the rule under the masthead.
  document.querySelectorAll('.ah-clip').forEach(clip => {
    const width = clip.offsetWidth; if (!width) return;
    clip.style.left = `${(clip.classList.contains('left') ? row.left : row.right - width) + scrollX}px`;
  });
}
hangCord();
addEventListener('resize', hangCord);
document.fonts?.ready.then(hangCord);
addEventListener('load', hangCord, { once: true });
// The door hides the scrollbar, so what was measured behind it is a few pixels out once it has gone.
addEventListener('jolly:door-left', hangCord);
// Once the masthead has scrolled away the cord is drawn up, so the star isn't hanging over what's being read.
const drawUp = () => button.classList.toggle('drawn-up', scrollY > 90);
addEventListener('scroll', drawUp, { passive: true });
drawUp();
// Left alone, it swings a little every few seconds, so it gets noticed. Only ever when nothing else is going on.
const SWAY_EVERY = 6000;
{
  button.addEventListener('animationend', () => button.classList.remove('sway', 'tug'));
  const sway = () => {
    if (!document.hidden && document.readyState === 'complete' && !root.classList.contains('opening-active') && !root.classList.contains('opening-pending') && !button.classList.contains('tug') && !button.classList.contains('drawn-up')) button.classList.add('sway');
    setTimeout(sway, SWAY_EVERY);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(sway, SWAY_EVERY / 2);
}
const label = () => button.setAttribute('aria-label', root.dataset.house === 'down' ? 'Bring the house lights up' : 'Take the house lights down');
label();

const lights = createLights({ root, sheet });
let change = null;
// Paper can't take a bow on a felt board, so the line changes with the room. The heading's words are wrapped for its highlight, so only the one word is touched.
const retitle = down => {
  const heading = document.querySelector('#theatre-title');
  if (!heading || !root.lang.startsWith('en')) return false;
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) walker.currentNode.nodeValue = walker.currentNode.nodeValue.replace(down ? 'The paper' : 'The house', down ? 'The house' : 'The paper');
  return true;
};
// The page writes its own copy in once it starts, so wait for that first.
const firstTitle = () => { if (window.jolly) retitle(root.dataset.house === 'down'); else setTimeout(firstTitle, 300); };
firstTitle();

function setHouse(down) {
  root.dataset.house = down ? 'down' : 'up';
  window.jolly?.setNight?.(down);
  const url = new URL(location.href); if (down) url.searchParams.set('house', 'down'); else url.searchParams.delete('house'); history.replaceState(null, '', url);
  label(); retitle(down); hangCord();
  lights.changed();
  // The lamps catch as the dark reaches them.
  if (down) lights.strike(760, 400);
}
// A lever is heard whenever it is thrown, unless the visitor has turned the sound off themselves.
const sound = (name, options) => { if (window.jolly?.soundChoice !== false) sfx.play(name, options).catch(() => {}); };
change = createChange({ root, setHouse, sound });
// What the visitor last asked for: during a change the page may not have caught up with it yet.
let wanted = root.dataset.house === 'down';
const throwSwitch = () => {
  wanted = !wanted;
  // Restarting the tug even if the last one is still settling.
  button.classList.remove('tug', 'sway'); void button.offsetWidth; button.classList.add('tug');
  sound(wanted ? 'switch-down' : 'switch-up');
  change.press(wanted);
};
button.addEventListener('click', throwSwitch);
// During a change the browser sends every click to the root, so a second throw is recognised by where it landed.
addEventListener('click', event => {
  if (!change.busy || event.target !== root) return;
  const box = button.getBoundingClientRect();
  if (event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) throwSwitch();
}, true);
const whenIdle = window.requestIdleCallback || (work => setTimeout(work, 200));
afterDoor(() => whenIdle(() => sfx.preload('switch-down', 'switch-up', 'paw', 'yoyo')));
// For reviewing frames and measuring cost, never used by the page itself.
window.jollyHouse = { lights, change };
