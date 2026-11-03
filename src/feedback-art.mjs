import { drawBoiledSprite } from './ink-motion.mjs';

const artLoads = new Map();

export async function loadFeedbackArt(names) {
  return Object.fromEntries(await Promise.all(names.map(async name => {
    if (!artLoads.has(name)) {
      const image = new Image();
      image.src = `/jolly-statechart/assets/feedback-art/${name}.webp`;
      artLoads.set(name, image.decode().then(() => image).catch(error => {
        console.warn(`Feedback artwork could not load: ${name}`, error);
        return null;
      }));
    }
    return [name, await artLoads.get(name)];
  })));
}

export function drawFeedbackArt(g, sprite, x, y, width, time, {
  angle = 0, reduced = false, phaseOffset = 0, opacity = 1,
} = {}) {
  if (!sprite) return;
  const frame = reduced ? 0 : (Math.floor(time / 190) + phaseOffset) % 4;
  const phase = reduced ? 0 : (Math.floor(time / 155) + phaseOffset) % 3;
  const w = width * [1, .86, 1.06, .93][frame], h = w * sprite.naturalHeight / sprite.naturalWidth;
  g.save();
  g.translate(x, y);
  g.rotate(angle + [0, .065, -.06, .035][frame]);
  g.globalAlpha *= opacity * [1, .9, .96, .91][frame];
  drawBoiledSprite(g, sprite, [0, 0, sprite.naturalWidth, sprite.naturalHeight], [0, -h / 2, w, h], {
    phase, amplitude: reduced ? 0 : .85,
  });
  g.restore();
}
