// Cutting sprites reads millions of pixels. Out here it can't hold up the door or the overture.
import { makeFrames, splitCastAtlas } from './ink-motion.mjs';

self.onmessage = ({ data: { id, kind, bitmap, amount } }) => {
  try {
    if (kind === 'frames') {
      const frames = makeFrames(bitmap, [0, 0, bitmap.width, bitmap.height], amount).map(frame => frame.transferToImageBitmap());
      self.postMessage({ id, frames }, frames);
    } else {
      const actors = Object.fromEntries(Object.entries(splitCastAtlas(bitmap)).map(([who, cut]) => [who, cut.transferToImageBitmap()]));
      self.postMessage({ id, actors }, Object.values(actors));
    }
  } catch (error) { self.postMessage({ id, error: error.message }); }
  bitmap.close();
};
