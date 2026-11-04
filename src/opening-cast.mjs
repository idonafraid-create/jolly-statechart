// Cut each pose sheet once and share it between the door and the overture.
import { splitCastSoon } from './ink-motion.mjs';

const poses = new Map();
export function castPose(name) {
  if (!poses.has(name)) poses.set(name, (async () => {
    const image = new Image();
    image.src = `/jolly-statechart/assets/cast/${name}.webp`;
    await image.decode();
    return splitCastSoon(image);
  })());
  return poses.get(name);
}
export function forgetPoses() { poses.clear(); }
