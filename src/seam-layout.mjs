const CLEARANCE = 14;

export function seamCrossesRect([x0, y0], [x1, y1], [left, top, right, bottom]) {
  if (y0 === y1) {
    return y0 > top && y0 < bottom && Math.min(x0, x1) < right && Math.max(x0, x1) > left;
  }
  const enter = Math.max(0, (top - y0) / (y1 - y0));
  const exit = Math.min(1, (bottom - y0) / (y1 - y0));
  if (enter >= exit) return false;
  const firstX = x0 + (x1 - x0) * enter;
  const lastX = x0 + (x1 - x0) * exit;
  return Math.min(firstX, lastX) < right && Math.max(firstX, lastX) > left;
}

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const clearance = ([x, y], [left, top, right, bottom]) =>
  Math.max(left - x, x - right, top - y, y - bottom);

export function seamPath(a, b, obstacles, sweep) {
  if (a[1] >= b[1]) return [a, b];
  const relevant = obstacles.filter(rect =>
    rect[1] < b[1] && rect[3] > a[1] && clearance(a, rect) >= 0 && clearance(b, rect) >= 0);
  const blocks = relevant.map(rect => {
    const [left, top, right, bottom] = rect;
    const pad = Math.min(CLEARANCE, clearance(a, rect), clearance(b, rect));
    return [left - pad, top - pad, right + pad, bottom + pad];
  });
  const isClear = (from, to, rects) => !rects.some(rect => seamCrossesRect(from, to, rect));
  if (sweep) {
    const { at = .5, x } = sweep;
    const center = mix(a, b, at)[0];
    const ease = t => t * t * (3 - 2 * t);
    for (const strength of x == null ? [0] : [1, .88, .75, .62, .5]) {
      const peak = center + ((x ?? center) - center) * strength;
      const curve = [a, ...Array.from({ length: 63 }, (_, i) => {
        const t = (i + 1) / 64;
        const [from, to, progress] = x == null ? [a[0], b[0], t]
          : t < at ? [a[0], peak, t / at] : [peak, b[0], (t - at) / (1 - at)];
        return [from + (to - from) * ease(progress), mix(a, b, t)[1]];
      }), b];
      if (curve.slice(1).every((p, i) => isClear(curve[i], p, blocks))) return curve;
    }
  }

  // Start and end along the flow column when the adjacent space permits.
  const lead = Math.min(36, (b[1] - a[1]) * .18);
  const start = [a[0], a[1] + lead], end = [b[0], b[1] - lead];
  const first = isClear(a, start, blocks) ? start : a;
  const last = isClear(end, b, blocks) ? end : b;
  const corners = blocks.flatMap(([left, top, right, bottom]) =>
    [[left, top], [right, top], [left, bottom], [right, bottom]]);
  const route = shortestRoute(first, last, corners, blocks, isClear)
    ?? shortestRoute(a, b, corners, blocks, isClear);
  // shortcut: impossible descending routes stay direct, adjust the layout if this reaches text.
  if (!route) return [a, b];
  if (route[0] !== a) route.unshift(a);
  if (route.at(-1) !== b) route.push(b);

  const points = [a];
  for (let i = 1; i < route.length - 1; i++) {
    const prev = route[i - 1], corner = route[i], next = route[i + 1];
    const before = mix(corner, prev, Math.min(.3, 42 / distance(corner, prev)));
    const after = mix(corner, next, Math.min(.3, 42 / distance(corner, next)));
    const curve = Array.from({ length: 9 }, (_, j) => {
      const t = j / 8;
      return mix(mix(before, corner, t), mix(corner, after, t), t);
    });
    points.push(...(curve.slice(1).every((p, j) => isClear(curve[j], p, relevant)) ? curve : [corner]));
  }
  points.push(b);
  return points;
}

function shortestRoute(start, end, corners, blocks, isClear) {
  if (isClear(start, end, blocks)) return [start, end];
  const points = [start, end, ...corners.filter(([x, y]) => x >= 0 && y >= start[1] && y <= end[1])];
  const lengths = points.map(() => Infinity), parents = points.map(() => -1);
  const open = new Set(points.keys());
  lengths[0] = 0;
  while (open.size) {
    const from = [...open].reduce((best, i) => lengths[i] < lengths[best] ? i : best);
    if (!Number.isFinite(lengths[from])) return null;
    if (from === 1) {
      const route = [];
      for (let i = from; i >= 0; i = parents[i]) route.unshift(points[i]);
      return route;
    }
    open.delete(from);
    for (const to of open) {
      if (points[to][1] < points[from][1]) continue;
      const length = lengths[from] + distance(points[from], points[to]);
      if (length >= lengths[to] || !isClear(points[from], points[to], blocks)) continue;
      lengths[to] = length;
      parents[to] = from;
    }
  }
  return null;
}
