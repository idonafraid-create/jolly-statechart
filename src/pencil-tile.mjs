// A dense neutral pencil fill, drawn stroke by stroke so it tiles exactly and costs no download.
export function paintPencilTile(size = 512) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = '#b4b4b4'; g.fillRect(0, 0, size, size);
  let seed = 40961;
  const rand = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
  g.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    const count = [2600, 1900, 900][pass], angle = [-1.04, -1.14, -.86][pass];
    for (let i = 0; i < count; i++) {
      const x = rand() * size, y = rand() * size, length = 26 + rand() * 90, bend = (rand() - .5) * 9;
      const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length, shade = rand();
      g.strokeStyle = shade < .55 ? `rgba(255,255,255,${.1 + rand() * .22})` : `rgba(40,40,40,${.06 + rand() * .16})`;
      g.lineWidth = .5 + rand() * 1.5;
      // Draw at every wrapped offset so strokes cross the tile edge without a seam.
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
        g.beginPath(); g.moveTo(x + ox, y + oy);
        g.quadraticCurveTo(x + ox + dx / 2 + bend, y + oy + dy / 2 - bend, x + ox + dx, y + oy + dy);
        g.stroke();
      }
    }
  }
  return canvas;
}
