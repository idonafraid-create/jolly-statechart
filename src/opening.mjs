// The front door. The house curtain is down from the first frame; raise it and the desk is behind it,
// ring for service, or step inside through the star and watch the overture.
import { forgetPoses } from './opening-cast.mjs';
import { createOpeningSound } from './opening-sound.mjs';
import { drawTextSwipe } from './heading-highlights.mjs';

const STAR_INNER = .4457;
const DESK_LINE = {
  midnight: ['AFTER HOURS DEPARTMENT · EST. 1963', '#16246e'],
  jojo: ['JOJO / no talk.', '#5f1230'],
  lyly: ['LYLY / all bark.', '#1f4a1a'],
  yoyo: ['YOYO / all bite. ♡', '#5f1230'],
  trio: ['NO TALK. ALL BARK. ALL BITE.', '#5f1230'],
};
const FILM_MAX_WIDTH = 1920;

function starPoints(x, y, radius, rotation) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + rotation + i * Math.PI / 5, r = radius * (i % 2 ? STAR_INNER : 1);
    points.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r]);
  }
  return points;
}
const pointsAttribute = points => points.map(point => point.join(',')).join(' ');
const animate = (duration, draw) => new Promise(resolve => {
  const start = performance.now();
  const tick = now => {
    const t = Math.min(1, (now - start) / duration);
    draw(t);
    t < 1 ? requestAnimationFrame(tick) : resolve();
  };
  requestAnimationFrame(tick);
});

export async function mountDoor({ report = {}, onExit } = {}) {
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = '/jolly-statechart/src/opening.css';
  document.head.append(link);
  await new Promise(resolve => { link.onload = link.onerror = resolve; });
  await Promise.all(['16px "Special Elite"', '16px "Courier Prime"'].map(font => document.fonts.load(font))).catch(() => {});

  const root = document.createElement('div');
  root.className = 'opening'; root.dataset.phase = 'curtain';
  root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'The Jolly front desk');
  root.innerHTML = `
    <button class="opening-raise" type="button" aria-label="Raise the curtain"></button>
    <div class="opening-small-print"><button class="opening-sound" type="button" aria-pressed="true">♪ <span>SOUND ON</span></button><span class="opening-call-note" aria-live="polite"></span><a class="opening-call-skip" href="#top">SKIP TO THE PAGE →</a></div>
    <button class="opening-bell-hit" type="button" aria-label="Ring the Jolly desk bell"></button>
    <div class="opening-plaque">
      <p class="opening-plate"><span class="opening-wordmark">THE <i class="jo">JO</i><i class="ll">LL</i><i class="y">Y</i></span><span class="opening-dept" aria-live="polite">AFTER HOURS DEPARTMENT · EST. 1963</span></p>
      <div class="opening-actions">
        <button class="opening-action ring" type="button"><img src="/jolly-statechart/assets/entrance-icons/ring.webp" alt=""><span class="heading-highlight-host"><span class="action-label">RING ONCE MORE</span></span></button>
        <a class="opening-action enter" href="#top"><img src="/jolly-statechart/assets/entrance-icons/enter.webp" alt=""><span class="heading-highlight-host"><span class="action-label">ENTER THE JOLLY</span></span></a>
      </div>
      <button class="opening-sound" type="button" aria-pressed="true">♪ <span>SOUND ON</span></button>
    </div>
    <svg class="opening-star-bands" aria-hidden="true"><polygon class="cream" points=""/><polygon class="gold" points=""/></svg>
    <div class="opening-film"><canvas></canvas></div>
    <svg class="opening-star-line" aria-hidden="true"><polygon points=""/></svg>
    <button class="opening-skip" type="button">SKIP THE OVERTURE →</button>`;
  document.documentElement.classList.add('opening-active');
  document.documentElement.classList.remove('opening-pending');
  // The page keeps loading underneath, but keyboard and screen reader stay at the door until it opens.
  const held = [...document.body.children];
  held.forEach(element => { element.inert = true; });
  document.body.append(root);
  report.state = 'door'; report.shownAt = performance.now();

  const film = root.querySelector('.opening-film'), filmCanvas = film.querySelector('canvas'), skip = root.querySelector('.opening-skip');
  const bands = root.querySelector('.opening-star-bands'), line = root.querySelector('.opening-star-line'), linePolygon = line.querySelector('polygon');
  const ringButton = root.querySelector('.opening-action.ring'), enterLink = root.querySelector('.opening-action.enter'), soundButtons = root.querySelectorAll('.opening-sound');
  const raiseButton = root.querySelector('.opening-raise'), raiseNote = root.querySelector('.opening-call-note');
  const deskLine = root.querySelector('.opening-dept'), sound = createOpeningSound();
  let scene = null, overture = null, busy = false, finished = false, raising = false, byKeyboard = false, filmStarted = false, filmFrame = 0, lastStrum = 0, filmSize = '';

  const arm = () => { sound.unlock(); };
  root.addEventListener('pointerdown', arm, { capture: true });
  root.addEventListener('keydown', arm, { capture: true });

  function settle() {
    root.dataset.phase = 'ready';
    // Whoever raised the curtain from the keyboard carries on from the keyboard.
    if (byKeyboard) ringButton.focus({ preventScroll: true });
  }
  function sizeFilm() {
    if (!overture) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5), scale = Math.min(1, FILM_MAX_WIDTH / (innerWidth * ratio));
    // Repainting the film's sheets is slow, so ENTER must not repeat it when nothing has changed.
    const size = `${innerWidth}x${innerHeight}x${ratio}`;
    if (size === filmSize) return;
    filmSize = size;
    overture.resize(innerWidth * ratio * scale, innerHeight * ratio * scale);
  }
  const onKey = event => {
    if (event.key === 'Escape') { leave('escape', 300); return; }
    // The curtain is the one thing on screen, so Enter or Space answers it from anywhere.
    const onControl = event.target.closest?.('a,button');
    if (root.dataset.phase === 'curtain' && (event.key === 'Enter' || event.key === ' ') && (!onControl || onControl === raiseButton)) { event.preventDefault(); byKeyboard = true; raiseCurtain(); }
  };
  // The band and the film both stop when nobody is in the room.
  const onVisibility = () => sound.hold(document.hidden);
  document.addEventListener('visibilitychange', onVisibility);
  const onPointer = event => overture?.setPointer(event.clientX / innerWidth * 2 - 1, event.clientY / innerHeight * 2 - 1);
  const onResize = () => { if (film.style.visibility === 'visible') sizeFilm(); };
  // Trying to scroll is a clear answer: nobody has to find a button to reach the page.
  let wheelTotal = 0, wheelAt = 0, touchStartY = null;
  const onWheel = event => {
    const now = performance.now();
    if (now - wheelAt > 400) wheelTotal = 0;
    wheelAt = now; wheelTotal += event.deltaY;
    if (wheelTotal > 160) leave('scroll', 440);
  };
  const onTouchStart = event => { touchStartY = event.touches[0]?.clientY ?? null; };
  const onTouchMove = event => { if (touchStartY !== null && touchStartY - (event.touches[0]?.clientY ?? touchStartY) > 90) leave('scroll', 440); };

  // Sound and the desk behind the curtain load while the visitor reads the sign. The sign doesn't wait for them.
  const soundLoaded = sound.preload().catch(() => {});
  // Building the desk blocks for a moment, so the sign gets its chance to paint first.
  const painted = new Promise(resolve => { requestAnimationFrame(() => setTimeout(resolve, 0)); setTimeout(resolve, 400); });
  const stageBuilt = painted.then(() => import('./opening-scene.mjs')).then(({ createOpeningScene }) => createOpeningScene(root, {
    onRing(shift) {
      sound.play('bell', { gain: .95 });
      shift.cues.forEach((cue, order) => setTimeout(() => sound.play(cue, { gain: .7 }), 150 + order * 110));
    },
    // The bell dropping through the parted curtain is the first thing heard on top of the band.
    onLand() { sound.play('bell', { gain: .9 }); },
    onShift(shift) {
      const [text, color] = DESK_LINE[shift.id] ?? [];
      if (!text) return;
      deskLine.textContent = text; deskLine.style.color = color;
      deskLine.dataset.who = shift.cast?.join(' ') ?? '';
    },
    // Sweeping across the sound strokes plays them, softly, like the strings they look like.
    onStrum(index) {
      const now = performance.now();
      if (now - lastStrum < 70) return;
      lastStrum = now;
      sound.play('bell', { gain: .22, rate: [1, 1.122, 1.335, 1.498][index % 4] });
    },
    onActorTap(who) { sound.play({ jojo: 'sax', lyly: 'bass', yoyo: 'guitar' }[who], { gain: .8 }); },
    reportPhase(phase) { if (phase === 'settled' && !finished) settle(); },
    beats: { map: () => sound.map ?? REHEARSAL, time: () => sound.loopTime() },
  })).then(async built => {
    if (finished) { built.dispose(); return null; }
    scene = built;
    root.dataset.cloth = '';
    // Keep the overture's slow work behind the curtain too, so ENTER is ready as soon as it appears.
    void import('./overture.mjs').then(({ createOverture }) => createOverture(filmCanvas)).then(madeFilm => { overture = madeFilm; report.filmReady = true; sizeFilm(); return scene?.learnPoses(); }).catch(() => {});
    await built.ready;
    if (!finished) root.dataset.stage = 'ready';
    return built;
  }).catch(() => { void leave('webgl-error', 0); return null; });

  const startBand = () => { if (!finished && !filmStarted) sound.startLoop(); };
  async function raiseCurtain() {
    if (raising || finished) return;
    raising = true;
    sound.unlock();
    // The rope goes first and the curtain answers it, as the plunger does the bell.
    raiseButton.dataset.pulled = '';
    scene?.pull();
    await new Promise(resolve => setTimeout(resolve, 170));
    if (root.dataset.stage !== 'ready') {
      // No progress theatre: this only appears when someone is actually waiting, and gives up rather than hold them.
      raiseNote.textContent = 'ONE MOMENT…';
      const giveUp = setTimeout(() => leave('load-timeout', 0), 6000);
      await stageBuilt;
      clearTimeout(giveUp);
      raiseNote.textContent = '';
    }
    if (finished || !scene) return;
    if (!sound.startLoop()) void soundLoaded.then(startBand);
    scene.raise();
  }
  root.addEventListener('click', event => {
    if (root.dataset.phase !== 'curtain' || event.target.closest('.opening-small-print')) return;
    byKeyboard = event.detail === 0;
    raiseCurtain();
  });
  raiseButton.addEventListener('pointerenter', () => { if (!raising) scene?.peek(.07); });
  raiseButton.addEventListener('pointerleave', () => { if (!raising) scene?.peek(0); });
  root.querySelector('.opening-call-skip').addEventListener('click', event => { event.preventDefault(); leave('curtain-skip', 380); });

  for (const [control, color, name] of [[ringButton, '#ed9ba9', 'ring'], [enterLink, '#c5de8a', 'enter']]) {
    const label = control.querySelector('.action-label'), art = document.createElement('span');
    art.className = 'heading-highlights'; art.setAttribute('aria-hidden', 'true');
    art.style.setProperty('--ll-bubblegum', color);
    label.parentElement.append(art);
    drawTextSwipe(art, label, label.textContent, `jolly-opening-action:${name}`);
  }
  // The stroke finishes before the thing it promises happens, as on the stage backdrop buttons.
  const strike = control => new Promise(resolve => {
    control.dataset.swiped = '';
    setTimeout(resolve, 165);
  });

  ringButton.addEventListener('click', async () => {
    if (busy || finished) return;
    busy = true;
    await strike(ringButton);
    scene.ring();
    setTimeout(() => { delete ringButton.dataset.swiped; busy = false; }, 420);
  });
  root.querySelector('.opening-bell-hit').addEventListener('click', () => { if (!finished) scene?.ring(); });
  soundButtons.forEach(button => button.addEventListener('click', () => {
    const muted = !sound.muted;
    sound.setMuted(muted);
    soundButtons.forEach(each => {
      each.setAttribute('aria-pressed', String(!muted));
      each.querySelector('span').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    });
  }));

  // Star hoops: the same cream-then-gold edge as the colour waves, cut to the star.
  function drawStarEdge(x, y, radius, rotation) {
    bands.children[0].setAttribute('points', pointsAttribute(starPoints(x, y, radius * 1.12, rotation)));
    bands.children[1].setAttribute('points', pointsAttribute(starPoints(x, y, radius * 1.06, rotation)));
    linePolygon.setAttribute('points', pointsAttribute(starPoints(x, y, radius, rotation)));
  }
  async function revealThroughStar(anchor, duration) {
    const reach = Math.hypot(innerWidth, innerHeight) / STAR_INNER * 1.2;
    film.style.visibility = 'visible';
    for (const svg of [bands, line]) { svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`); svg.style.display = 'block'; }
    await animate(duration, t => {
      const eased = t * t * (3 - 2 * t);
      const radius = anchor.radius * (reach / anchor.radius) ** eased, rotation = anchor.rotation + eased * 1.3;
      const points = starPoints(anchor.x, anchor.y, radius, rotation);
      film.style.clipPath = `polygon(${points.map(([x, y]) => `${x}px ${y}px`).join(',')})`;
      drawStarEdge(anchor.x, anchor.y, radius, rotation);
      linePolygon.style.strokeWidth = `${6 + eased * 22}px`;
    });
    film.style.clipPath = ''; bands.style.display = line.style.display = 'none';
  }

  function finish(reason) {
    report.state = 'entered'; report.reason = reason; report.exitAt = performance.now();
    document.documentElement.classList.remove('opening-active');
    held.forEach(element => { element.inert = false; });
    cancelAnimationFrame(filmFrame);
    root.remove();
    setTimeout(() => { scene?.dispose(); sound.dispose(); }, 0);
    if (scene) setTimeout(() => (window.requestIdleCallback ?? (run => run()))(() => scene.loseContext()), 1500);
    removeEventListener('keydown', onKey); removeEventListener('pointermove', onPointer); removeEventListener('resize', onResize);
    removeEventListener('wheel', onWheel); removeEventListener('touchstart', onTouchStart); removeEventListener('touchmove', onTouchMove);
    forgetPoses();
    document.removeEventListener('visibilitychange', onVisibility);
    link.remove();
    // Whoever left from the keyboard keeps their place on the page.
    if (byKeyboard || reason === 'escape') document.querySelector('#start')?.focus({ preventScroll: true });
    onExit?.(reason);
  }
  // The real page opens through a star-shaped hole in whatever is showing, with the same hoops at its edge.
  async function leave(reason, duration = 680) {
    if (finished) return;
    finished = true;
    skip.classList.remove('visible');
    sound.stopLoop(.2);
    if (duration) {
      const w = innerWidth, h = innerHeight, reach = Math.hypot(w, h) / STAR_INNER * 1.2, frameRect = `M0 0H${w}V${h}H0Z`;
      for (const svg of [bands, line]) { svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.style.display = 'block'; svg.style.zIndex = '6'; }
      await animate(duration, t => {
        const eased = t * t * (3 - 2 * t), radius = 3 + reach * eased ** 2, rotation = eased * 1.1;
        const path = starPoints(w / 2, h / 2, radius, rotation).map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z';
        root.style.clipPath = `path(evenodd,"${frameRect}${path}")`;
        drawStarEdge(w / 2, h / 2, radius, rotation);
        linePolygon.style.strokeWidth = `${4 + eased * 14}px`;
      });
    }
    finish(reason);
  }
  function playFilm(startedAt) {
    const clock = () => sound.overtureTime() ?? (performance.now() - startedAt) / 1000;
    const paint = () => {
      if (finished) return;
      const t = Math.max(0, clock());
      if (t >= filmDuration) { void leave('film-end'); return; }
      overture.renderAt(t);
      filmFrame = requestAnimationFrame(paint);
    };
    paint();
  }
  let filmDuration = Infinity;

  enterLink.addEventListener('click', async event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault();
    if (busy || finished) return;
    busy = true;
    sound.unlock();
    await strike(enterLink);
    const hasFilm = Boolean(overture);
    if (hasFilm) {
      const { OVERTURE_SECONDS } = await import('./overture.mjs');
      filmDuration = OVERTURE_SECONDS;
      sizeFilm();
      filmStarted = true;
      sound.stopLoop(.1);
      const startedAt = performance.now();
      sound.startOverture();
      playFilm(startedAt);
    } else sound.play('bell', { gain: .95 });
    const anchor = await scene.launchStar();
    // Nothing prepared yet: go straight to the page rather than hold anyone at the door.
    if (!hasFilm) return leave('no-film', 560);
    await revealThroughStar(anchor, 760);
    setTimeout(() => scene?.dispose(), 0);
    skip.classList.add('visible');
  });
  skip.addEventListener('click', () => leave('film-skip', 380));
  addEventListener('keydown', onKey);
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('wheel', onWheel, { passive: true });
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: true });
  return { root, raise: raiseCurtain, ring: () => scene?.ring(), leave, get scene() { return scene; } };
}

// Until the real chart has loaded the wall still breathes, on an even four.
const REHEARSAL = { duration: 4.444, events: Array.from({ length: 8 }, (_, beat) => ({ t: beat * .5555, beat, bar: beat >> 2, inBar: beat % 4, kind: 'beat', strength: beat % 2 ? .3 : .6 })) };
