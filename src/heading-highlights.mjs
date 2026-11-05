import { inkViewBox } from '../vendor/looseleaf/runtime/builder.mjs';
import { highlight } from '../vendor/looseleaf/runtime/fills.mjs';
import { BOIL_MAX_FRAMES, boilKnobs } from '../vendor/looseleaf/runtime/recipes/boil-ink.mjs';
import { GUESS_RATIOS, highlighterPen, overshoot } from '../vendor/looseleaf/runtime/recipes/text-marks-ink.mjs';
import { defineRecipe, runRecipe } from '../vendor/looseleaf/runtime/recipes/index.mjs';

const round = value => Math.round(value * 4) / 4;
let swipeContext, swipeRange;
const HEADING_KEYWORDS = [
  ['#cover-title > span', 'ARROWS'],
  ['#act-title-1 .chapter-title-ink', 'orderly'],
  ['#act-title-2 .chapter-title-ink', 'nothing'],
  ['#act-title-3 .chapter-title-ink', 'swing'],
  ['#act-title-4 .chapter-title-ink', 'bite'],
  ['#instrument-sax .instrument-title', 'brass'],
  ['#instrument-bass .instrument-title', 'straight answer'],
  ['#instrument-rabbit .instrument-title', 'Hard opinions'],
  ['#theatre-title', 'bow'],
  ['#record-finale .record-title', 'turn'],
];

// Use the native pen and fill once, without the long-line overpass in highlightRecipe.
const textSwipe = defineRecipe({
  id: 'highlight', kind: 'highlight', layers: ['rest'], pad: 10,
  draw(ink, { w }, { size, y, band, first, last }) {
    const ends = overshoot(size) * .6;
    const start = first ? -ends : -1;
    const width = w + (last ? ends : 1) - start;
    ink.layer('rest', () => highlight(ink, start, y, width, band, highlighterPen('pink')));
  },
});

function measureLines(target, keyword, range, origin) {
  const start = target.textContent.indexOf(keyword);
  if (start === -1) return [];
  const end = start + keyword.length;
  const lines = [];
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  let textOffset = 0;
  while (textOffset < end && walker.nextNode()) {
    const node = walker.currentNode;
    let offset = Math.max(0, start - textOffset);
    const selected = node.data.slice(offset, end - textOffset);
    textOffset += node.length;
    for (const glyph of selected) {
      range.setStart(node, offset);
      range.setEnd(node, offset += glyph.length);
      const box = range.getBoundingClientRect();
      if (box.width < .5 || box.height < .5) continue;
      const x = round(box.left - origin.left), y = round(box.top - origin.top);
      const w = round(box.width), h = round(box.height);
      const line = lines.find(r => Math.min(r.y + r.h, y + h) - Math.max(r.y, y) > .6 * Math.min(r.h, h));
      if (line) {
        const right = Math.max(line.x + line.w, x + w);
        line.x = Math.min(line.x, x);
        line.w = right - line.x;
        line.text += glyph;
      } else {
        lines.push({ x, y, w, h, text: glyph });
      }
    }
  }
  return lines;
}

export function drawTextSwipe(art, text, keyword, seed, previousGeometry = '', { bandShare } = {}) {
  swipeContext ??= document.createElement('canvas').getContext('2d');
  swipeRange ??= document.createRange();
  const style = getComputedStyle(text);
  const size = Number.parseFloat(style.fontSize);
  const font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
  const lines = measureLines(text, keyword, swipeRange, art.getBoundingClientRect());
  const geometry = JSON.stringify([seed, font, lines]);
  if (geometry === previousGeometry) return geometry;

  swipeContext.font = font;
  art.innerHTML = lines.map(({ x, y, w, h, text }, index) => {
    const metrics = swipeContext.measureText(text);
    const fontAscent = metrics.fontBoundingBoxAscent || GUESS_RATIOS.asc * size;
    const fontDescent = metrics.fontBoundingBoxDescent ?? GUESS_RATIOS.desc * size;
    const baseline = h * fontAscent / (fontAscent + fontDescent);
    const ascent = metrics.actualBoundingBoxAscent || GUESS_RATIOS.cap * size;
    const glyphHeight = ascent + Math.max(0, metrics.actualBoundingBoxDescent || 0);
    const band = bandShare ? glyphHeight * bandShare : Math.max(1, glyphHeight * .43 - w * .004);
    const params = {
      size, band, y: baseline - ascent + glyphHeight * .58 - band / 2,
      first: index === 0, last: index === lines.length - 1,
    };
    const frames = Array.from({ length: BOIL_MAX_FRAMES }, (_, phase) => runRecipe(textSwipe, {
      box: { w, h }, params, seed: `${seed}:${index}`,
      tier: 'hi', density: 'comfortable', dir: style.direction,
      knobs: boilKnobs(phase, .35),
    }));
    const { pad } = frames[0];
    const layers = frames.map((frame, phase) =>
      `<g class="heading-highlight-frame" style="animation-delay:${phase ? (phase - BOIL_MAX_FRAMES) * .45 : 0}s">${frame.parts.rest}</g>`).join('');
    return `<svg data-looseleaf="highlight" focusable="false" preserveAspectRatio="none" viewBox="${inkViewBox(frames[0])}" style="left:${x - pad}px;top:${y - pad}px;width:${w + 2 * pad}px;height:${h + 2 * pad}px">${layers}</svg>`;
  }).join('');
  return geometry;
}

export function mountHeadingHighlights() {
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('highlight-visible', entry.isIntersecting);
  });
  const headings = HEADING_KEYWORDS.flatMap(([selector, keyword]) => {
    const text = document.querySelector(selector);
    if (!text) return [];
    const heading = text.closest('h1,h2');
    const host = heading.parentElement;
    const art = document.createElement('span');
    host.classList.add('heading-highlight-host');
    art.className = 'heading-highlights';
    art.setAttribute('aria-hidden', 'true');
    heading.before(art);
    visibility.observe(art);
    return [{ text, keyword, heading, host, art, geometry: '' }];
  });

  function draw() {
    for (const entry of headings) {
      const { text, keyword, heading, art } = entry;
      entry.geometry = drawTextSwipe(art, text, keyword, `jolly-heading:${heading.id || keyword}`, entry.geometry);
    }
  }

  let pending = 0;
  const resize = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(draw);
  });
  headings.forEach(({ host }) => resize.observe(host));
  draw();
}
