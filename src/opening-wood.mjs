// Walnut, painted once on a 2D canvas. The house sign, the desk card and the overture's desk are all cut from it.
export function paintWalnut(g, width, height, { seed = 1963, density = 1 } = {}) {
  const rand = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
  // Three boards with their own tone, then a lot of grain.
  [[0, .34, '#4f2913'], [.34, .69, '#5a3118'], [.69, 1, '#4b2711']].forEach(([from, to, tone]) => { g.fillStyle = tone; g.fillRect(0, from * height, width, (to - from) * height + 1); });
  const lines = Math.round(height * .6 * density);
  for (let i = 0; i < lines; i++) {
    const y = rand() * height, wave = 2 + rand() * 9, rate = .002 + rand() * .004, phase = rand() * 7;
    g.strokeStyle = rand() < .72 ? `rgba(26,10,5,${.06 + rand() * .2})` : `rgba(164,104,56,${.04 + rand() * .13})`;
    g.lineWidth = .6 + rand() * 2;
    g.beginPath();
    for (let x = -20; x <= width + 40; x += 40) g.lineTo(x, y + Math.sin(x * rate + phase) * wave);
    g.stroke();
  }
  g.fillStyle = 'rgba(16,6,3,.55)';
  for (const at of [.34, .69]) g.fillRect(0, at * height - 1.5, width, 3);
  const edge = g.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .3, width / 2, height / 2, Math.max(width, height) * .62);
  edge.addColorStop(0, 'rgba(16,6,3,0)'); edge.addColorStop(1, 'rgba(16,6,3,.62)');
  g.fillStyle = edge; g.fillRect(0, 0, width, height);
}

// The same brass everywhere it is only painted: bright at the top edge, deep through the middle, a return of light below.
export function brassFill(g, top, bottom) {
  const fill = g.createLinearGradient(0, top, 0, bottom);
  fill.addColorStop(0, '#fbe7a8'); fill.addColorStop(.42, '#dcaa44'); fill.addColorStop(.72, '#a9741f'); fill.addColorStop(1, '#e8c264');
  return fill;
}
