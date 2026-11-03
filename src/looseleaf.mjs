// Thin native-browser adapter around real Looseleaf drawing code (MIT, see vendor/looseleaf/LICENSE).
import { stroke } from '../vendor/looseleaf/runtime/pen.mjs';
import { pen } from '../vendor/looseleaf/runtime/pens.mjs';
import { makeRng } from '../vendor/looseleaf/runtime/rng.mjs';
import { arrowLines } from '../vendor/looseleaf/runtime/shapes.mjs';
import { boilKnobs, boilSeed, BOIL_MAX_FRAMES } from '../vendor/looseleaf/runtime/recipes/boil-ink.mjs';
import { ticketRecipe } from '../vendor/looseleaf/runtime/recipes/ticket-ink.mjs';
import { runRecipe } from '../vendor/looseleaf/runtime/recipes/index.mjs';
import { renderFaces } from '../vendor/looseleaf/runtime/paper/faces.mjs';
import { esc } from '../vendor/looseleaf/runtime/paint.mjs';

export { boilKnobs, boilSeed, BOIL_MAX_FRAMES };

/** Original Looseleaf ribbon geometry; cache these four seeded frames instead of recomputing each RAF. */
export function pencilArrowPaths(points, options = {}) {
  if (!Array.isArray(points) || points.length < 2 || points.some(p => !Array.isArray(p) || p.length < 2 || !p.slice(0, 2).every(Number.isFinite))) throw new TypeError('An arrow needs at least two finite [x,y] points.');
  const frame = options.reducedMotion ? 0 : (options.frame ?? 0);
  const knobs = boilKnobs(frame, options.strength ?? .55);
  const rng = makeRng(boilSeed(options.seed ?? 'jolly-arrow', frame));
  const base = pen(options.pen ?? 'bluepencil');
  const brush = { ...base, bleed: base.bleed * knobs.bleed };
  const start = points[0], end = points.at(-1), before = points.at(-2);
  const geometry = points.length === 2
    ? arrowLines(rng.fork('shape'), ...start, ...end, { curve: options.curve ?? .04, curl: options.curl ?? false, head: options.head ?? 'v', headLen: options.headLength ?? 10 })
    : [{ pts: points, o: { start: 'soft', end: 'flick' } }, ...arrowLines(rng.fork('head'), ...before, ...end, { curve: 0, head: options.head ?? 'v', headLen: options.headLength ?? 10 }).slice(1)];
  return geometry.flatMap((line, index) => stroke(line.pts, brush, rng.fork(`stroke-${index}`), {
    ...line.o, tier: 'hi', dry: .3, width: (options.width ?? 1.7) / base.W * knobs.width,
    wobble: knobs.wobble, alpha: options.alpha ?? 1,
  }).layers);
}

/** Synchronous Canvas2D drawing of upstream's actual pencil / waxy ribbons, holes and flecks. */
export function drawPencilArrow(ctx, points, options = {}) {
  const layers = options.paths ?? pencilArrowPaths(points, options);
  const alpha = ctx.globalAlpha;
  ctx.save();
  ctx.fillStyle = options.color ?? '#2140d6';
  for (const layer of layers) {
    ctx.globalAlpha = alpha * layer.op;
    ctx.fill(new Path2D(layer.d), layer.rule ?? 'nonzero');
  }
  ctx.restore();
  return layers;
}

const TOKENS = {
  ink: '#2140d6', umber: '#432c2b', photo: '#fffdf7', paper: '#f7f2e5', card: '#f6ebd5', slip: '#fff5df',
  'paper-shade': '#e5d7be', kraft: '#d6b984', 'sticky-yellow': '#fff092', 'sticky-green': '#d5ef83',
  'sticky-pink': '#f3abb5', 'sticky-blue': '#c3ddeb', 'sticky-orange': '#ffd29e', 'shadow-k': '1',
};

/** Original ticketRecipe: real stub notches, punched perforations, double frame, stock and contact shadow. */
export function makeTicketSvg(options = {}) {
  const w = options.width ?? 300, h = options.height ?? 132;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 120 || h < 56) throw new RangeError('Tickets need a finite width >=120 and height >=56.');
  const frame = runRecipe(ticketRecipe, {
    box: { w, h }, params: { stock: options.stock ?? 'card', stub: options.stub ?? 'end', stubWidth: options.stubWidth ?? 65, punched: options.punched ?? true },
    seed: String(options.seed ?? 'jolly-ticket'), tier: 'hi', density: 'comfortable', dir: 'ltr',
    knobs: { wobble: 1, misreg: 1, bleed: 1, width: 1 },
  });
  const tokens = { ...TOKENS, ...options.tokens };
  const body = renderFaces(frame.parts.rest ?? '').replace(/var\(--ll-([a-z-]+)\)/g, (_, name) => tokens[name] ?? '#f7f2e5');
  const title = options.title === undefined ? '' : `<text x="${(w - (options.stubWidth ?? 65)) / 2}" y="${h * .46}" text-anchor="middle" fill="${esc(tokens.ink)}" font-family="Kevin Serif,serif" font-size="${Math.min(31, h * .23)}">${esc(String(options.title))}</text>`;
  const detail = options.detail === undefined ? '' : `<text x="${(w - (options.stubWidth ?? 65)) / 2}" y="${h * .68}" text-anchor="middle" fill="${esc(tokens.ink)}" font-family="Courier Prime,monospace" font-size="${Math.min(12, h * .1)}">${esc(String(options.detail))}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" data-looseleaf="ticket" aria-hidden="true" focusable="false" viewBox="-${frame.pad} -${frame.pad} ${w + frame.pad * 2} ${h + frame.pad * 2}" width="${w}" height="${h}">${body}${title}${detail}</svg>`;
}

/** Decoration stays behind ordinary DOM text; this does not require React, Tailwind or Radix. */
export function mountPaperNote(host, { title = 'JOLLY FIELD NOTE', body = '', ...options } = {}) {
  if (!host || typeof host.append !== 'function') throw new TypeError('A note needs a DOM host.');
  const note = document.createElement('aside');
  note.dataset.looseleaf = 'paper-note';
  note.style.cssText = 'position:relative;display:grid;isolation:isolate;max-width:100%;padding:20px 80px 20px 24px;color:#2140d6;';
  const art = document.createElement('div');
  art.innerHTML = makeTicketSvg(options);
  art.style.cssText = 'position:absolute;inset:0;z-index:-1;pointer-events:none;';
  art.firstElementChild.style.cssText = 'width:100%;height:100%;overflow:visible;';
  const heading = document.createElement('strong');
  heading.textContent = title;
  heading.style.cssText = 'font:24px/1.2 "Kevin Serif",serif;';
  const text = document.createElement('p');
  text.textContent = body;
  text.style.cssText = 'font:13px/1.45 "Courier Prime",monospace;margin:8px 0 0;';
  note.append(art, heading, text);
  host.append(note);
  return note;
}
