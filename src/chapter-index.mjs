import { drawTextSwipe } from './heading-highlights.mjs';

const links = [...document.querySelectorAll('.chapter-index-links a')];
const swipes = new Map();
const resize = new ResizeObserver(entries => {
  for (const { target } of entries) swipes.get(target)?.();
});

for (const link of links) {
  const label = link.querySelector('i');
  const art = document.createElement('span');
  art.className = 'chapter-index-swipe';
  art.setAttribute('aria-hidden', 'true');
  link.append(art);
  let geometry = '';
  const paint = () => {
    geometry = drawTextSwipe(art, label, label.textContent, `jolly-index:${link.hash}`, geometry);
  };
  link.addEventListener('pointerenter', paint);
  link.addEventListener('focus', paint);
  swipes.set(link, () => {
    if (link.matches(':hover,:focus-visible')) paint();
  });
  resize.observe(link);
}
