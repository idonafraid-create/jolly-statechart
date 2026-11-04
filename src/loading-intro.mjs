// The door stands in front of the page on every visit. Deep links, reduced motion and ?entrance=off go straight in.
// The first frame of the home cover is still measured underneath, because the page has to be there when the door opens.
import { deferInkWork } from './ink-motion.mjs';

const report = window.jollyEntrance = { state: 'pending', shownAt: null, resourcesReadyAt: null, firstFrameAt: null, exitAt: null, reason: null };
const coverImages = [...document.querySelectorAll('.cover-cast img')];
const coverFonts = ['16px "Special Elite"', '16px "Courier Prime"', 'italic 16px "Courier Prime"'];
const root = document.documentElement;
let settled = false;

function enter(reason) {
  if (settled) return;
  settled = true;
  report.state = report.shownAt === null ? 'skipped' : 'entered';
  report.reason = reason; report.exitAt = performance.now();
  performance.mark('jolly:entrance-exit');
}

async function coverFrame() {
  try {
    await Promise.all([
      ...coverImages.map(image => image.decode()),
      ...coverFonts.map(font => document.fonts.load(font)),
    ]);
    report.resourcesReadyAt = performance.now();
    requestAnimationFrame(() => {
      report.firstFrameAt = performance.now();
      performance.mark('jolly:home-first-frame');
      enter('home-frame');
    });
  } catch { enter('home-resource-error'); }
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Cutting sprites reads millions of pixels. Off the main thread it can't hold up the door, the film or a scroll.
deferInkWork(!reduced);
if (root.classList.contains('opening-pending')) {
  // The door reports its own exit from here on.
  settled = true;
  import('./opening.mjs').then(async ({ mountDoor }) => {
    // The head's failsafe already gave the page back: a door must not appear in front of someone reading it.
    if (!root.classList.contains('opening-pending')) throw new Error('door too late');
    window.jollyDoor = await mountDoor({ report });
  }).catch(() => {
    report.state = 'entered'; report.reason = 'door-error';
    root.classList.remove('opening-active', 'opening-pending');
  });
}
coverFrame();
if (location.hash) enter('deep-link');
else if (reduced) enter('reduced-motion');
else if (new URL(location.href).searchParams.get('entrance') === 'off') enter('disabled');
