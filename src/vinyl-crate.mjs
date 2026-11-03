import { Ink } from '../vendor/looseleaf/runtime/builder.mjs';
import { boxLines, loopLines } from '../vendor/looseleaf/runtime/shapes.mjs';
import { esc } from '../vendor/looseleaf/runtime/paint.mjs';
import { drawSkeleton } from '../vendor/looseleaf/runtime/art-draw.mjs';
import { arrows } from '../vendor/looseleaf/runtime/art/icons/arrows.mjs';
import { drawTextSwipe } from './heading-highlights.mjs';

const PALETTES = ['#e97780', '#ade408', '#8e1b2c'];
const UI = {
  en: { root: 'Choose a Jolly record', rail: 'Record sleeves', eyebrow: 'THE JOLLY / THREE ORIGINAL SIDES', vertical: 'CHOOSE A RECORD', title: 'Pick a little trouble.', hint: 'Slide a sleeve. Pick a side.', previous: 'Previous record', next: 'Next record', selected: 'SELECTED SIDE', playing: 'NOW PLAYING', pick: 'PICK THIS SIDE', pending: 'SLEEVE ON ITS WAY', missing: 'SLEEVE NOT YET ON THE SHELF', choose: title => `Choose ${title}` },
  zh: { root: '选择JOLLY唱片', rail: '唱片封套', eyebrow: 'JOLLY／三位主角的唱片', vertical: '选择唱片', title: '挑一点小麻烦。', hint: '翻翻封套，挑一面听。', previous: '上一张唱片', next: '下一张唱片', selected: '当前唱片', playing: '正在播放', pick: '选这张唱片', pending: '封套准备中', missing: '封套暂未上架', choose: title => `选择《${title}》` },
};
let sequence = 0;
const CSS = `
.vinyl-crate{--vinyl-sleeve:clamp(218px,23vw,284px);--ll-ink:#2140d6;--ll-pencil:#69716f;--ll-ink-you:#2140d6;--ll-photo:#fff9ec;position:relative;width:100%;max-width:1080px;margin:42px auto 0;color:#2140d6;text-align:left;font:14px/1.5 "Courier Prime",monospace;isolation:isolate}
.vinyl-crate *{box-sizing:border-box}.vinyl-crate-heading{padding:0 24px;text-align:center}.vinyl-crate-eyebrow{font:10px/1.6 "Courier Prime",monospace;letter-spacing:1.6px;margin:0 0 13px}.vinyl-crate-title{font:400 clamp(31px,4vw,48px)/1.15 "Special Elite",serif;letter-spacing:-.8px;margin:0}.vinyl-crate-hint{font:italic 12px/1.5 "Courier Prime",monospace;margin:17px 0 0;color:#797660}
.vinyl-crate-rail{position:relative;display:flex;gap:28px;list-style:none;margin:0;padding:28px max(18px,calc((100% - var(--vinyl-sleeve)*1.48)/2)) 15px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:thin;scrollbar-color:#e9778055 transparent;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;cursor:grab;touch-action:pan-x pan-y}
.vinyl-crate-rail::-webkit-scrollbar{height:4px}.vinyl-crate-rail::-webkit-scrollbar-thumb{background:#e9778066;border-radius:3px}.vinyl-crate-rail.is-dragging{cursor:grabbing;scroll-snap-type:none;user-select:none}.vinyl-crate-rail:focus-visible{outline:2px solid #2140d6;outline-offset:4px}
.vinyl-crate-item{position:relative;flex:0 0 calc(var(--vinyl-sleeve)*1.48);width:calc(var(--vinyl-sleeve)*1.48);scroll-snap-align:center;scroll-snap-stop:always;margin:0;padding:0;isolation:isolate}
.vinyl-crate-choice{position:relative;display:block;width:100%;margin:0;padding:0 0 9px;background:none;border:0;border-radius:0;text-align:left;color:inherit;cursor:inherit;font:inherit;min-height:44px;user-select:none;-webkit-tap-highlight-color:transparent}
.vinyl-crate-choice:focus-visible{outline:3px solid #8e1b2c;outline-offset:6px}.vinyl-crate-choice:hover{filter:none;background:none}.vinyl-crate-art{position:relative;display:block;width:100%;height:calc(var(--vinyl-sleeve)*1.06);isolation:isolate}
.vinyl-crate-record{position:absolute;width:calc(var(--vinyl-sleeve)*.91);height:calc(var(--vinyl-sleeve)*.91);left:calc(var(--vinyl-sleeve)*.055);bottom:calc(var(--vinyl-sleeve)*.035);transform:translateX(0);transition:transform .46s steps(4,end);z-index:0;pointer-events:none}
.vinyl-crate-record-spin{display:block;width:100%;height:100%;animation:vinyl-crate-turn 6s steps(36,end) infinite;animation-play-state:paused}.vinyl-crate-record svg{display:block;width:100%;height:100%;overflow:visible}
.vinyl-crate-item.is-selected .vinyl-crate-record{transform:translateX(calc(var(--vinyl-sleeve)*.47))}.vinyl-crate-item.is-selected.is-playing .vinyl-crate-record-spin{animation-play-state:running}
.vinyl-crate-sleeve{position:absolute;left:0;bottom:0;display:block;width:var(--vinyl-sleeve);height:var(--vinyl-sleeve);z-index:1;background:transparent;box-shadow:4px 6px 0 #2140d611;transform:rotate(-1deg);transition:transform .35s steps(3,end)}
.vinyl-crate-item:nth-child(2) .vinyl-crate-sleeve{transform:rotate(1.1deg)}.vinyl-crate-item:nth-child(3) .vinyl-crate-sleeve{transform:rotate(-.6deg)}.vinyl-crate-item.is-selected .vinyl-crate-sleeve{transform:rotate(0)}
.vinyl-crate-sleeve img{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none;opacity:0}.vinyl-crate-item[data-cover-ready=true] .vinyl-crate-sleeve img{opacity:1}.vinyl-crate-sleeve>svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.vinyl-crate-cover-type{position:absolute;top:18px;left:16px;max-width:62%;display:block;z-index:2;pointer-events:none;color:var(--vinyl-title)}.vinyl-crate-cover-type .vinyl-crate-track-title{font-size:clamp(21px,1.9vw,27px);letter-spacing:-.7px;line-height:1.12;margin:0}
.vinyl-crate-pending{position:absolute;inset:0;display:grid;place-items:center;padding:30px;text-align:center;font:11px/1.6 "Courier Prime",monospace;border:1px dashed #2140d655;background:#f7f2e544}.vinyl-crate-item[data-cover-ready=true] .vinyl-crate-pending{display:none}
.vinyl-crate-copy{display:block;width:var(--vinyl-sleeve);padding:19px 3px 0;min-height:110px}.vinyl-crate-artist{display:flex;align-items:center;gap:8px;font:10px/1.4 "Courier Prime",monospace;letter-spacing:1.8px;margin-bottom:8px}.vinyl-crate-artist:before{content:"";display:inline-block;width:6px;height:6px;border:1px solid var(--vinyl-accent);border-radius:50%}.vinyl-crate-item.is-selected .vinyl-crate-artist:before{background:var(--vinyl-accent)}
.vinyl-crate-track-title{display:block;font:400 26px/1.13 "Special Elite",serif;letter-spacing:-.5px;margin:0 0 9px;max-width:100%}.vinyl-crate-genre{display:block;font:10px/1.5 "Courier Prime",monospace;color:#7a7866}.vinyl-crate-status{display:block;font:9px/1.5 "Courier Prime",monospace;margin-top:12px;letter-spacing:.7px;color:#7b7866}.vinyl-crate-item.is-selected .vinyl-crate-status{color:#8e1b2c}
.vinyl-crate-footer{display:flex;align-items:center;justify-content:center;gap:15px;margin:10px 20px 0}.vinyl-crate-nav{display:inline-grid;place-items:center;position:relative;min-width:44px;min-height:44px;width:44px;height:44px;background:none;border:0;color:#2140d6;cursor:pointer;padding:0}.vinyl-crate-nav:disabled{opacity:.3;cursor:default}.vinyl-crate-nav:focus-visible,.vinyl-crate-tab:focus-visible{outline:2px solid #8e1b2c;outline-offset:4px}.vinyl-crate-nav svg{width:24px;height:24px;overflow:visible}
.vinyl-crate-tabs{display:flex;gap:3px;align-items:center}.vinyl-crate-tab{min-height:44px;min-width:61px;padding:7px 10px;background:none;border:0;border-bottom:1px solid transparent;font:11px/1 "Courier Prime",monospace;color:#7b7866;cursor:pointer}.vinyl-crate-tab[aria-pressed=true]{color:#2140d6;border-bottom:2px solid var(--vinyl-accent)}
.vinyl-crate-announcement{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@keyframes vinyl-crate-turn{to{transform:rotate(360deg)}}
@media(max-width:600px){.vinyl-crate{--vinyl-sleeve:clamp(210px,56vw,250px);margin-top:30px}.vinyl-crate-heading{padding:0 18px}.vinyl-crate-eyebrow{font-size:8px;letter-spacing:1px}.vinyl-crate-title{font-size:31px;letter-spacing:-.7px}.vinyl-crate-hint{font-size:11px;margin-top:13px}.vinyl-crate-rail{gap:16px;padding-top:25px;padding-bottom:7px}.vinyl-crate-cover-type{top:16px;left:13px}.vinyl-crate-copy{padding-top:16px;min-height:105px}.vinyl-crate-genre{font-size:9px}.vinyl-crate-footer{gap:3px;margin-top:5px}.vinyl-crate-tab{font-size:10px;min-width:56px;padding:7px 8px}.vinyl-crate-artist{font-size:9px}}
@media(prefers-reduced-motion:reduce){.vinyl-crate-record,.vinyl-crate-sleeve{transition:none}.vinyl-crate-record-spin{animation:none}.vinyl-crate-rail{scroll-behavior:auto}}
.vinyl-crate.vinyl-crate-vertical{--vinyl-sleeve:82px;margin:0;max-width:none}.vinyl-crate-vertical .vinyl-crate-heading{padding:0;text-align:left}.vinyl-crate-vertical .vinyl-crate-eyebrow{font-size:9px;letter-spacing:1.2px;margin:0 0 8px}.vinyl-crate-vertical .vinyl-crate-title,.vinyl-crate-vertical .vinyl-crate-hint{display:none}
.vinyl-crate-vertical .vinyl-crate-rail{display:flex;flex-direction:column;gap:6px;height:310px;max-height:310px;padding:5px 4px 7px;overflow-x:hidden;overflow-y:auto;scroll-snap-type:y proximity;overscroll-behavior-y:contain;touch-action:pan-y;scrollbar-width:thin}
.vinyl-crate-vertical .vinyl-crate-item{flex:0 0 auto;width:100%;scroll-snap-align:start}.vinyl-crate-vertical .vinyl-crate-choice{display:grid;grid-template-columns:122px minmax(0,1fr);gap:12px;align-items:center;padding:2px 4px 4px;min-height:90px}.vinyl-crate-vertical .vinyl-crate-art{height:87px;width:122px}.vinyl-crate-vertical .vinyl-crate-sleeve{box-shadow:2px 3px 0 #2140d610}
.vinyl-crate-vertical .vinyl-crate-copy{width:auto;min-height:0;padding:0}.vinyl-crate-vertical .vinyl-crate-artist{font-size:8px;margin:0 0 4px;letter-spacing:1px}.vinyl-crate-vertical .vinyl-crate-track-title{font-size:20px;line-height:1.1;margin:0 0 5px;letter-spacing:-.4px}.vinyl-crate-vertical .vinyl-crate-genre{font-size:9px;line-height:1.35}.vinyl-crate-vertical .vinyl-crate-status{font-size:8px;line-height:1.35;margin-top:6px;letter-spacing:.5px}.vinyl-crate-vertical .vinyl-crate-footer{display:none}
@media(max-width:600px){.vinyl-crate.vinyl-crate-vertical{--vinyl-sleeve:76px}.vinyl-crate-vertical .vinyl-crate-choice{grid-template-columns:112px minmax(0,1fr);gap:10px;min-height:86px}.vinyl-crate-vertical .vinyl-crate-art{width:112px;height:81px}.vinyl-crate-vertical .vinyl-crate-rail{height:294px;max-height:294px}.vinyl-crate-vertical .vinyl-crate-track-title{font-size:18px}}
.vinyl-crate-track-title[lang^=zh]{font-family:"Huiwen Mincho",serif;font-size:22px;line-height:1.2;letter-spacing:.03em}.vinyl-crate-genre[lang^=zh],.vinyl-crate-status[lang^=zh],.vinyl-crate-pending[lang^=zh],.vinyl-crate-eyebrow[lang^=zh],.vinyl-crate-tab[lang^=zh]{font-family:"Zhuque Fangsong",serif;font-size:12px;letter-spacing:0;line-height:1.4}.vinyl-crate-title[lang^=zh]{font-family:"Huiwen Mincho",serif;letter-spacing:.02em}
.vinyl-crate-vertical .vinyl-crate-copy{position:relative;isolation:isolate}
.vinyl-crate-title-swipe{--ll-blend:multiply;--ll-bubblegum:var(--vinyl-accent);position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.46}
.vinyl-crate-item[data-track="lyly-lines"] .vinyl-crate-title-swipe{--ll-bubblegum:#91c638;opacity:.78}
.vinyl-crate-title-swipe>svg{position:absolute;display:block;overflow:visible}
`;

function frameSvg(size, seed) {
  const ink = new Ink(seed, { tier: 'hi', grain: false });
  ink.lines(boxLines(ink.next('sleeve'), 1, 1, size - 2, size - 2, { corner: .8, loose: .65 }), 'bluepencil.fine', { width: 1.05, alpha: .8 });
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">${ink.toSvg({ w: size, h: size, pad: 0 }).svg}</svg>`;
}
function discSvg(track, index, token) {
  const ink = new Ink(`vinyl-disc-${track.id}`, { tier: 'hi', grain: false });
  for (const r of [141, 137, 131, 124, 116, 107, 97, 86, 74, 64]) ink.lines(loopLines(ink.next(`groove-${r}`), 150, 150, r, r, { clean: true }), 'pencil.fine', { width: .6, alpha: .28, color: 'ink' });
  const colour = PALETTES[index % PALETTES.length], labelInk = index === 2 ? '#fff5e5' : '#263e82';
  return `<svg viewBox="0 0 300 300" aria-hidden="true" focusable="false"><defs><mask id="${token}"><rect width="300" height="300" fill="white"/><circle cx="150" cy="150" r="4.2" fill="black"/></mask></defs><g mask="url(#${token})"><circle cx="150" cy="150" r="145" fill="#172330" stroke="#2140d6" stroke-width="1.3"/><g style="--ll-ink:#9aa7b2">${ink.toSvg({ w: 300, h: 300, pad: 0 }).svg}</g><circle cx="150" cy="150" r="49" fill="${colour}" stroke="#172330" stroke-width="1"/><circle cx="150" cy="150" r="43" fill="none" stroke="${labelInk}" stroke-opacity=".5" stroke-width=".6"/><text x="150" y="143" text-anchor="middle" fill="${labelInk}" font-family="Special Elite,serif" font-size="16">${esc(track.artist || 'THE JOLLY')}</text><text x="150" y="164" text-anchor="middle" fill="${labelInk}" font-family="Courier Prime,monospace" font-size="8">THE JOLLY · SIDE ${esc(track.side || 'A')}</text></g></svg>`;
}
function navSvg(direction) {
  const def = arrows[direction === 'previous' ? 'chevron-left' : 'chevron-right'];
  const art = drawSkeleton(def, 24, `vinyl-crate-${direction}`, { tier: 'hi', grain: false, kind: 'icon' });
  return `<svg viewBox="-${art.pad} -${art.pad} ${art.w + art.pad * 2} ${art.h + art.pad * 2}" aria-hidden="true" focusable="false">${art.svg}</svg>`;
}

/** Visual selection only: tracks and onSelect stay owned by the real audio/record-machine controller. */
export function mountVinylCrate(host, { tracks, onSelect, layout = 'horizontal' } = {}) {
  if (!host || typeof host.append !== 'function') throw new TypeError('A vinyl crate needs a DOM host.');
  if (!Array.isArray(tracks) || !tracks.length || new Set(tracks.map(track => track.id)).size !== tracks.length || tracks.some(track => !track || typeof track.id !== 'string' || typeof track.title !== 'string' || typeof track.cover !== 'string' || !track.cover)) throw new TypeError('Pass unique tracks with real id, title and cover metadata.');
  const vertical = layout === 'workbench';
  const token = `vinyl-crate-${++sequence}`, root = document.createElement('section'); root.className = `vinyl-crate${vertical ? ' vinyl-crate-vertical' : ''}`; root.setAttribute('aria-label', 'Choose a Jolly record');
  const style = document.createElement('style'); style.textContent = CSS; root.append(style);
  const heading = document.createElement('header'); heading.className = 'vinyl-crate-heading'; heading.innerHTML = '<p class="vinyl-crate-eyebrow">THE JOLLY / THREE ORIGINAL SIDES</p><h2 class="vinyl-crate-title">Pick a little trouble.</h2><p class="vinyl-crate-hint">Slide a sleeve. Pick a side.</p>'; root.append(heading);
  if (vertical) heading.querySelector('.vinyl-crate-eyebrow').textContent = 'CHOOSE A RECORD';
  const rail = document.createElement('ul'); rail.className = 'vinyl-crate-rail'; rail.id = `${token}-rail`; rail.setAttribute('aria-label', 'Record sleeves');
  const items = [], choices = [], tabs = [], disposers = [];
  const footer = document.createElement('div'); footer.className = 'vinyl-crate-footer';
  const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'vinyl-crate-nav'; previous.setAttribute('aria-label', 'Previous record'); previous.setAttribute('aria-controls', rail.id); previous.innerHTML = navSvg('previous');
  const next = document.createElement('button'); next.type = 'button'; next.className = 'vinyl-crate-nav'; next.setAttribute('aria-label', 'Next record'); next.setAttribute('aria-controls', rail.id); next.innerHTML = navSvg('next');
  const tablist = document.createElement('div'); tablist.className = 'vinyl-crate-tabs'; tablist.setAttribute('aria-label', 'Choose a side');
  const announcement = document.createElement('p'); announcement.className = 'vinyl-crate-announcement'; announcement.setAttribute('aria-live', 'polite');
  root.append(rail, footer, announcement); footer.append(previous, tablist, next); host.append(root);
  let selected = 0, tabStop = 0, playing = false, disposed = false, drag = null, suppressClickUntil = 0, programmaticUntil = 0, settleTimer = 0, resizeFrame = 0;
  let uiLanguage = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const swipe = vertical ? document.createElement('span') : null;
  let swipeGeometry = '';
  const swipeVisibility = swipe && new IntersectionObserver(([entry]) => swipe.classList.toggle('highlight-visible', entry.isIntersecting));
  if (swipe) {
    swipe.className = 'vinyl-crate-title-swipe';
    swipe.setAttribute('aria-hidden', 'true');
    swipeVisibility.observe(root);
  }
  function paintTrackSwipe() {
    if (!swipe || disposed) return;
    const title = items[selected].querySelector('.vinyl-crate-track-title');
    if (swipe.parentElement !== title.parentElement) title.parentElement.append(swipe);
    swipeGeometry = drawTextSwipe(swipe, title, title.textContent, `jolly-track:${tracks[selected].id}`, swipeGeometry);
  }
  const listen = (element, event, fn, options) => { element.addEventListener(event, fn, options); disposers.push(() => element.removeEventListener(event, fn, options)); };
  function sync() {
    const ui = UI[uiLanguage], lang = uiLanguage === 'zh' ? 'zh-CN' : 'en';
    root.setAttribute('aria-label', ui.root); rail.setAttribute('aria-label', ui.rail);
    for (const [selector, text] of [['.vinyl-crate-eyebrow', vertical ? ui.vertical : ui.eyebrow], ['.vinyl-crate-title', ui.title], ['.vinyl-crate-hint', ui.hint]]) { const element = heading.querySelector(selector); element.textContent = text; element.lang = lang; }
    previous.setAttribute('aria-label', ui.previous); next.setAttribute('aria-label', ui.next);
    items.forEach((item, index) => {
      const current = index === selected; item.classList.toggle('is-selected', current); item.classList.toggle('is-playing', current && playing);
      choices[index].setAttribute('aria-pressed', String(current)); choices[index].tabIndex = index === tabStop ? 0 : -1; tabs[index].setAttribute('aria-pressed', String(current));
      const stateLabel = item.querySelector('.vinyl-crate-status'); stateLabel.textContent = current ? playing ? ui.playing : ui.selected : ui.pick; stateLabel.lang = lang;
      choices[index].setAttribute('aria-label', ui.choose(tracks[index].title)); tabs[index].setAttribute('aria-label', ui.choose(tracks[index].title));
    });
    previous.disabled = selected === 0; next.disabled = selected === tracks.length - 1;
    root.dataset.selected = tracks[selected].id; root.dataset.playing = String(playing);
  }
  function center(index, animate = true) {
    programmaticUntil = performance.now() + (animate && !reduced.matches ? 750 : 100);
    const axis = vertical ? { top: items[index].offsetTop - 5 } : { left: items[index].offsetLeft - (rail.clientWidth - items[index].offsetWidth) / 2 };
    rail.scrollTo({ ...axis, behavior: animate && !reduced.matches ? 'smooth' : 'auto' });
  }
  function choose(index, { notify = false, scroll = true, focus = false } = {}) {
    if (disposed || index < 0 || index >= tracks.length) return;
    const changed = index !== selected; selected = index; if (changed) playing = false;
    if (focus || !rail.contains(document.activeElement)) tabStop = index;
    sync();
    if (changed) paintTrackSwipe();
    if (scroll) center(index);
    if (focus) choices[index].focus({ preventScroll: true });
    if (notify) { announcement.textContent = `${tracks[index].title} — ${tracks[index].artist || 'THE JOLLY'}`; if (onSelect) onSelect(tracks[index]); }
  }
  tracks.forEach((track, index) => {
    const item = document.createElement('li'); item.className = 'vinyl-crate-item'; item.dataset.track = track.id; item.dataset.coverReady = 'false'; item.style.setProperty('--vinyl-accent', PALETTES[index % PALETTES.length]); item.style.setProperty('--vinyl-title', ['#2140d6', '#315f35', '#8e1b2c'][index % 3]);
    const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'vinyl-crate-choice'; choice.dataset.track = track.id; choice.setAttribute('aria-label', `Choose ${track.title}${track.artist ? ` by ${track.artist}` : ''}`);
    const art = document.createElement('span'); art.className = 'vinyl-crate-art';
    const disc = document.createElement('span'); disc.className = 'vinyl-crate-record'; disc.innerHTML = `<span class="vinyl-crate-record-spin">${discSvg(track, index, `${token}-disc-${index}`)}</span>`;
    const sleeve = document.createElement('span'); sleeve.className = 'vinyl-crate-sleeve'; sleeve.innerHTML = `<span class="vinyl-crate-pending">SLEEVE ON ITS WAY</span>${frameSvg(300, `sleeve-${track.id}`)}`;
    const image = new Image(); image.alt = ''; image.draggable = false; image.decoding = 'async';
    image.onload = () => { item.dataset.coverReady = 'true'; }; image.onerror = () => { item.dataset.coverReady = 'false'; item.querySelector('.vinyl-crate-pending').textContent = 'SLEEVE NOT YET ON THE SHELF'; }; image.src = track.cover; sleeve.prepend(image); art.append(disc, sleeve);
    const copy = document.createElement('span'); copy.className = 'vinyl-crate-copy';
    const artist = document.createElement('span'); artist.className = 'vinyl-crate-artist'; artist.textContent = track.artist || 'THE JOLLY';
    const title = document.createElement('span'); title.className = 'vinyl-crate-track-title'; title.textContent = track.title;
    title.lang = track.language === 'zh' ? 'zh-CN' : 'en';
    const coverType = document.createElement('span'); coverType.className = 'vinyl-crate-cover-type'; coverType.append(title); sleeve.append(coverType);
    const genre = document.createElement('span'); genre.className = 'vinyl-crate-genre'; genre.textContent = track.genre || '';
    genre.lang = track.language === 'zh' ? 'zh-CN' : 'en'; artist.lang = 'en';
    const status = document.createElement('span'); status.className = 'vinyl-crate-status'; copy.append(artist, genre, status); choice.append(art, copy); item.append(choice); rail.append(item); items.push(item); choices.push(choice);
    if (vertical) { coverType.remove(); copy.insertBefore(title, genre); }
    const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'vinyl-crate-tab'; tab.textContent = track.artist || `SIDE ${index + 1}`; tab.style.setProperty('--vinyl-accent', PALETTES[index % PALETTES.length]); tab.setAttribute('aria-label', `Choose ${track.title}`); tablist.append(tab); tabs.push(tab);
    listen(choice, 'click', event => { if (performance.now() < suppressClickUntil) { event.preventDefault(); return; } choose(index, { notify: true }); });
    listen(tab, 'click', () => choose(index, { notify: true }));
    listen(choice, 'focus', () => {
      if (index === tabStop) return;
      choices[tabStop].tabIndex = -1;
      tabStop = index;
      choice.tabIndex = 0;
    });
    listen(choice, 'keydown', event => {
      const nextIndex = event.key === 'ArrowRight' || vertical && event.key === 'ArrowDown' ? Math.min(tracks.length - 1, index + 1) : event.key === 'ArrowLeft' || vertical && event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? tracks.length - 1 : null;
      if (nextIndex === null) return;
      event.preventDefault();
      if (nextIndex === index) return;
      center(nextIndex);
      choices[nextIndex].focus({ preventScroll: true });
    });
  });
  listen(previous, 'click', () => choose(selected - 1, { notify: true, focus: true }));
  listen(next, 'click', () => choose(selected + 1, { notify: true, focus: true }));
  listen(rail, 'pointerdown', event => {
    programmaticUntil = 0;
    if (event.pointerType === 'mouse' && event.button === 0) drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rail.scrollLeft, top: rail.scrollTop, moved: false };
  });
  listen(rail, 'pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    const primary = vertical ? dy : dx, secondary = vertical ? dx : dy;
    if (!drag.moved && Math.abs(primary) > 6 && Math.abs(primary) > Math.abs(secondary)) { drag.moved = true; rail.classList.add('is-dragging'); rail.setPointerCapture(event.pointerId); }
    if (drag.moved) { event.preventDefault(); if (vertical) rail.scrollTop = drag.top - dy; else rail.scrollLeft = drag.left - dx; }
  });
  const endDrag = event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) suppressClickUntil = performance.now() + 280;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    const moved = drag.moved; drag = null; rail.classList.remove('is-dragging'); if (moved) queueSettle();
  };
  listen(rail, 'pointerup', endDrag); listen(rail, 'pointercancel', endDrag);
  listen(rail, 'wheel', () => { programmaticUntil = 0; }, { passive: true });
  function queueSettle() {
    clearTimeout(settleTimer);
    if (vertical) return;
    if (performance.now() < programmaticUntil) return;
    settleTimer = setTimeout(() => {
      if (drag || disposed || performance.now() < programmaticUntil) return;
      const middle = rail.scrollLeft + rail.clientWidth / 2;
      let nearest = 0; items.forEach((item, index) => { if (Math.abs(item.offsetLeft + item.offsetWidth / 2 - middle) < Math.abs(items[nearest].offsetLeft + items[nearest].offsetWidth / 2 - middle)) nearest = index; });
      if (nearest !== selected) choose(nearest, { notify: true, scroll: false });
    }, 170);
  }
  listen(rail, 'scroll', queueSettle, { passive: true });
  const resize = new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { center(rail.contains(document.activeElement) ? tabStop : selected, false); paintTrackSwipe(); }); }); resize.observe(rail);
  sync(); paintTrackSwipe(); resizeFrame = requestAnimationFrame(() => center(0, false));
  if (swipe) void document.fonts.ready.then(paintTrackSwipe);
  return {
    select(id) { const index = tracks.findIndex(track => track.id === id); if (index < 0) throw new RangeError(`Unknown Jolly record: ${id}`); if (index !== selected) choose(index); return tracks[index]; },
    setPlaying(value) { if (disposed || playing === Boolean(value)) return; playing = Boolean(value); sync(); },
    setUiLanguage(value) { uiLanguage = String(value).startsWith('zh') ? 'zh' : 'en'; sync(); },
    updateTracks(nextTracks) {
      if (!Array.isArray(nextTracks) || nextTracks.length !== tracks.length || nextTracks.some((track, index) => track.id !== tracks[index].id)) throw new RangeError('Updating record sides must preserve the three artist ids and order.');
      nextTracks.forEach((track, index) => {
        Object.assign(tracks[index], track);
        const item = items[index], title = item.querySelector('.vinyl-crate-track-title'), genre = item.querySelector('.vinyl-crate-genre'), image = item.querySelector('.vinyl-crate-sleeve img');
        title.textContent = track.title; title.lang = track.language === 'zh' ? 'zh-CN' : 'en'; genre.textContent = track.genre || ''; genre.lang = title.lang; item.querySelector('.vinyl-crate-artist').textContent = track.artist || 'THE JOLLY'; tabs[index].textContent = track.artist || `SIDE ${track.side || index + 1}`;
        if (image.getAttribute('src') !== track.cover) { item.dataset.coverReady = 'false'; image.src = track.cover; }
        item.querySelector('.vinyl-crate-record-spin').innerHTML = discSvg(track, index, `${token}-disc-${index}`);
      });
      sync();
      paintTrackSwipe();
    },
    dispose() { disposed = true; clearTimeout(settleTimer); cancelAnimationFrame(resizeFrame); resize.disconnect(); swipeVisibility?.disconnect(); disposers.forEach(dispose => dispose()); root.remove(); },
  };
}
