// A transparent native player: real Looseleaf pen ribbons, buttons, slider and media icons.
import { runRecipe } from '../vendor/looseleaf/runtime/recipes/index.mjs';
import { Ink } from '../vendor/looseleaf/runtime/builder.mjs';
import { boxLines } from '../vendor/looseleaf/runtime/shapes.mjs';
import { boilKnobs, boilSeed } from '../vendor/looseleaf/runtime/recipes/boil-ink.mjs';
import { buttonRecipe } from '../vendor/looseleaf/runtime/recipes/button-ink.mjs';
import { sliderTrackRecipe, sliderRangeRecipe, sliderThumbRecipe } from '../vendor/looseleaf/runtime/recipes/slider-ink.mjs';
import { drawSkeleton } from '../vendor/looseleaf/runtime/art-draw.mjs';
import { media } from '../vendor/looseleaf/runtime/art/icons/media.mjs';
import { arrows } from '../vendor/looseleaf/runtime/art/icons/arrows.mjs';
import { layout } from '../vendor/looseleaf/runtime/art/icons/layout.mjs';
import { inkDefsSvg } from '../vendor/looseleaf/runtime/textures.mjs';

const CSS = `
.paper-player[data-ink-phase]{position:relative;left:auto;right:auto;top:auto;bottom:auto;transform:none;width:min(480px,100%);display:block;margin:22px auto 0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;color:#344248;isolation:isolate;z-index:0;text-align:left;font:12px/1.4 "Courier Prime",monospace;--ll-ink:#344248;--ll-ink-soft:#536065;--ll-ink-you:#3157a4;--ll-pencil:#69716f;--ll-pencil-mark:#a0a39a;--ll-marker:#e88b55;--ll-hi:#f8d59c;--ll-paper:#f7f2e5;--ll-paper-shade:#e1ded0;--ll-card:#f7f2e5;--ll-slip:#fffaf0;--ll-photo:#fffdf8;--ll-umber:#665b4b;--ll-shade:75 64 49;--ll-shadow-k:.5;--ll-blend:multiply;--ll-red:#c86b52;--ll-green:#537153;--ll-focus:#3157a4;--ll-orange-text:#a85a35;--ll-tape:#e8d4a7;--ll-tape-edge:#bea777}
.paper-player *{box-sizing:border-box}.paper-player [hidden]{display:none!important}.paper-player .paper-player-card{position:relative;padding:17px 16px 15px;isolation:isolate;background:transparent;box-shadow:none;filter:none}
.paper-player .paper-player-outline{position:absolute;inset:0;z-index:-1;pointer-events:none}.paper-player .paper-player-outline>svg{display:block;width:100%;height:100%;overflow:visible}
.paper-player .paper-player-ink-phase{position:absolute;inset:0;opacity:0}.paper-player .paper-player-ink-phase>svg{display:block;width:100%;height:100%;overflow:visible}.paper-player[data-ink-phase="0"] [data-boil="0"],.paper-player[data-ink-phase="1"] [data-boil="1"],.paper-player[data-ink-phase="2"] [data-boil="2"]{opacity:1}
.paper-player .paper-player-main{display:grid;grid-template-columns:124px minmax(0,1fr);gap:16px;align-items:center}
.paper-player .paper-player-album{width:124px;height:124px;position:relative;overflow:hidden;isolation:isolate;border-radius:5px;background:transparent;align-self:center;margin:0}
.paper-player .paper-player-album:before{content:none}
.paper-player .paper-player-album img{display:block;width:100%;height:100%;object-fit:cover;margin:0;transform:none}
.paper-player .paper-player-content{min-width:0}.paper-player .paper-player-top{display:flex;gap:10px;align-items:center;min-width:0}.paper-player .paper-player-titles{min-width:0;flex:1}
.paper-player .paper-player-title{font:21px/1.12 "Special Elite",serif;letter-spacing:.2px;margin:0;color:#344248;white-space:nowrap}.paper-player .paper-player-subtitle{font:9px/1.35 "Courier Prime",monospace;margin:5px 0 0;letter-spacing:.2px;color:#71756e}
.paper-player #step-label{font:9px/1.4 "Courier Prime",monospace;letter-spacing:0;color:#646c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;margin-top:4px;max-width:100%}
.paper-player .paper-player-button{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;width:44px;height:44px;min-width:44px;min-height:44px;margin:0;padding:0;border:0;background:none;border-radius:0;color:#344248;box-shadow:none;cursor:pointer;isolation:isolate;font:12px/1 "Courier Prime",monospace;line-height:1}
.paper-player .paper-player-button:focus-visible{outline:2px solid #3157a4;outline-offset:3px}.paper-player .paper-player-button:disabled{opacity:.38;cursor:default}.paper-player .paper-player-button:enabled:hover{background:#f7e7df;filter:none;color:#344248}.paper-player .paper-player-button:active{transform:translateY(1px)}
.paper-player .paper-player-button-ink{position:absolute;inset:0;z-index:-1;pointer-events:none}.paper-player .paper-player-button-ink>svg{width:100%;height:100%;overflow:visible}.paper-player .paper-player-button-ink [data-layer]:not([data-layer=rest]){opacity:0}.paper-player .paper-player-button:hover [data-layer=hover],.paper-player .paper-player-button:active [data-layer=pressed],.paper-player .paper-player-button:focus-visible [data-layer=focus]{opacity:1}
.paper-player .paper-player-glyph{display:block;width:22px;height:22px;pointer-events:none;overflow:visible}.paper-player .paper-player-button-label{font:12px/1 "Courier Prime",monospace;position:relative}
.paper-player #play{width:48px;height:48px;min-width:48px;min-height:48px;border:0;border-radius:50%;box-shadow:none;--ll-ink:#bb6234;--ll-pencil:#bb6234}.paper-player #play .paper-player-glyph{width:24px;height:24px}
.paper-player #player-collapse{margin-left:auto}.paper-player .paper-player-compact-slot{display:none}
.paper-player .paper-player-slider{position:relative;height:32px;margin-top:3px;--paper-player-progress:0%}
.paper-player .paper-player-track{position:absolute;left:0;right:0;top:13px;height:9px;pointer-events:none}.paper-player .paper-player-track-art{display:block;position:absolute;inset:0}.paper-player .paper-player-track-art>svg,.paper-player .paper-player-fill>svg{display:block;width:100%;height:100%;overflow:visible}
.paper-player .paper-player-fill{position:absolute;inset:0;display:block;width:100%!important;clip-path:inset(-12px calc(100% - var(--paper-player-progress)) -12px -12px);pointer-events:none}
.paper-player .paper-player-thumb{position:absolute;left:calc(10px + (100% - 20px) * var(--paper-player-ratio,0));top:-5px;width:19px;height:19px;transform:translateX(-50%);pointer-events:none}.paper-player .paper-player-thumb>svg{width:100%;height:100%;overflow:visible}
.paper-player .paper-player-thumb [data-layer]:not([data-layer=rest]){opacity:0}.paper-player .paper-player-slider:hover .paper-player-thumb [data-layer=hover],.paper-player .paper-player-slider:focus-within .paper-player-thumb [data-layer=focus]{opacity:1}
.paper-player .paper-player-range{position:relative;z-index:2;display:block;width:100%;height:44px;min-height:44px;margin:0;top:-2px;background:transparent;border:0;appearance:none;-webkit-appearance:none;cursor:pointer;touch-action:pan-x;outline:none;padding:0}
.paper-player .paper-player-range::-webkit-slider-runnable-track{height:10px;background:transparent}.paper-player .paper-player-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;background:transparent;border:0;width:20px;height:20px;margin-top:-5px;border-radius:50%}.paper-player .paper-player-range::-moz-range-track{height:10px;background:transparent;border:0}.paper-player .paper-player-range::-moz-range-thumb{background:transparent;border:0;width:20px;height:20px}.paper-player .paper-player-range:focus-visible{outline:2px solid #3157a4;outline-offset:1px}
.paper-player .paper-player-times{display:flex;justify-content:space-between;gap:12px;font:10px/1 "Courier Prime",monospace;color:#70756e;margin:0 0 7px;font-variant-numeric:tabular-nums}
.paper-player .paper-player-controls{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:5px}.paper-player .paper-player-transport{display:flex;align-items:center;gap:9px}.paper-player .paper-player-tools{display:flex;align-items:center;justify-content:center;width:100%;gap:1px}.paper-player #count{font:9px/1 "Courier Prime",monospace;white-space:nowrap;margin:0 4px 0 1px;min-width:40px;color:#68716b}
.paper-player .paper-player-volume{display:grid;grid-template-columns:auto minmax(0,1fr) 4ch;gap:8px;align-items:center;margin:1px 4px 0;font-size:11px}
.paper-player .paper-player-volume-range{min-width:0;height:44px;margin:0}.paper-player .paper-player-volume-range .paper-player-track{top:18px}.paper-player .paper-player-volume-range .paper-player-range{top:0;scroll-margin-block:4px}
.paper-player .paper-player-volume-range .paper-player-fill{--ll-marker:#e97780;opacity:.62}
.paper-player .paper-player-volume output{text-align:right;font-variant-numeric:tabular-nums}
.paper-player.paper-player-collapsed .paper-player-card{padding:10px 13px}.paper-player.paper-player-collapsed .paper-player-main{grid-template-columns:54px minmax(0,1fr);gap:12px}.paper-player.paper-player-collapsed .paper-player-album{width:54px;height:54px;margin:0;border-radius:5px}.paper-player.paper-player-collapsed .paper-player-album img{width:100%;height:100%;margin:0}.paper-player.paper-player-collapsed .paper-player-compact-slot{display:block}.paper-player.paper-player-collapsed #play{width:44px;height:44px;min-width:44px;min-height:44px}.paper-player.paper-player-collapsed .paper-player-subtitle{display:none}.paper-player.paper-player-collapsed .paper-player-title{font-size:18px}.paper-player.paper-player-collapsed .paper-player-top{gap:3px}
@media(max-width:600px){.paper-player{width:100%;bottom:auto;margin-top:18px}.paper-player .paper-player-card{padding:12px 13px}.paper-player .paper-player-main{grid-template-columns:68px minmax(0,1fr);gap:12px}.paper-player .paper-player-album{width:68px;height:68px}.paper-player .paper-player-album img{width:100%;height:100%;margin:0}.paper-player .paper-player-title{font-size:18px}.paper-player .paper-player-subtitle{font-size:8px}.paper-player #step-label{font-size:8px}.paper-player .paper-player-controls{flex-wrap:wrap;gap:2px}.paper-player .paper-player-transport{margin:auto}.paper-player .paper-player-tools{justify-content:center;width:100%;gap:1px}.paper-player #count{font-size:8px;min-width:36px}.paper-player.paper-player-collapsed .paper-player-main{grid-template-columns:47px minmax(0,1fr);gap:9px}.paper-player.paper-player-collapsed .paper-player-album{width:47px;height:47px}.paper-player.paper-player-collapsed .paper-player-album img{width:100%;height:100%}.paper-player.paper-player-collapsed #player-collapse{width:44px;min-width:44px}.paper-player.paper-player-collapsed .paper-player-title{font-size:16px}.paper-player.paper-player-collapsed #step-label{font-size:7px;max-width:132px}}
@media(prefers-reduced-motion:reduce){.paper-player *{transition:none!important;animation:none!important}}
`;

const DEFAULT_VOLUME_PERCENT = 66;
const DEFAULT = { tier: 'hi', density: 'comfortable', dir: 'ltr', knobs: { wobble: 1, misreg: 1, bleed: 1, width: 1 } };
export const PLAYER_ALBUMS = [
  { src: '/jolly-statechart/assets/player-covers/01-house.webp', title: 'The house has a plan' },
  { src: '/jolly-statechart/assets/player-covers/02-breath.webp', title: 'A little breathing room' },
  { src: '/jolly-statechart/assets/player-covers/03-swing.webp', title: 'No straight answer' },
  { src: '/jolly-statechart/assets/player-covers/04-bite.webp', title: 'All bite' },
];
const seconds = value => { const n = Math.max(0, Math.floor(Number(value) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
const uiLanguage=value=>String(value||'en').toLowerCase().startsWith('zh')?'zh':'en';
const PLAYER_UI={
  en:{player:'Jolly record player',play:'Play record',pause:'Pause record',previous:'Previous record',next:'Next record',restart:'Restart record',speed:'Playback speed',volume:'Volume',overview:'Choose a record',collapse:'Collapse player',expand:'Expand player',progress:'Playback progress',pending:'Recording not ready'},
  zh:{player:'JOLLY 唱片播放器',play:'播放唱片',pause:'暂停唱片',previous:'上一张唱片',next:'下一张唱片',restart:'从头播放',speed:'播放速度',volume:'音量',overview:'选择唱片',collapse:'收起播放器',expand:'展开播放器',progress:'播放进度',pending:'录音尚未就绪'},
};
const wrap = (body, w, h, kind) => `<svg xmlns="http://www.w3.org/2000/svg" data-looseleaf="${kind}" aria-hidden="true" focusable="false" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${body}</svg>`;

function recipeSvg(recipe, w, h, params, seed, phase = 0) {
  const frame = runRecipe(recipe, { ...DEFAULT, knobs: boilKnobs(phase, .45), box: { w, h }, params, seed: boilSeed(seed, phase), lazy: ['focus'] });
  const layers = recipe === buttonRecipe ? frame.layers.filter(layer => layer === 'rest' || layer === 'focus') : frame.layers;
  const markup = layers.map(layer => `<g data-layer="${layer}">${frame.parts[layer] ?? ''}</g>`).join('');
  return wrap(markup, w, h, recipe.id);
}
function outlineSvg(w, h, phase) {
  const ink = new Ink(boilSeed('jolly-player-open-frame', phase), { tier: 'hi', grain: false, knobs: boilKnobs(phase, .45) });
  ink.lines(boxLines(ink.next('frame'), 2, 2, w - 4, h - 4, { corner: 9, loose: .65 }), 'bluepencil.fine', { width: .95, alpha: .7 });
  return wrap(ink.toSvg({ w, h, pad: 0 }).svg, w, h, 'pen-frame');
}
const phases = make => [0, 1, 2].map(phase => `<span class="paper-player-ink-phase" data-boil="${phase}">${make(phase)}</span>`).join('');
function iconSvg(name, seed) {
  const def = media[name] ?? arrows[name] ?? layout[name];
  if (!def) throw new RangeError(`Unknown Looseleaf media icon: ${name}`);
  const art = drawSkeleton(def, 24, seed, { kind: 'icon', tier: 'hi', grain: false, crisp: true, ink: 'ink' });
  return `<svg class="paper-player-glyph" xmlns="http://www.w3.org/2000/svg" data-looseleaf-icon="${name}" viewBox="-${art.pad} -${art.pad} ${art.w + art.pad * 2} ${art.h + art.pad * 2}" aria-hidden="true" focusable="false">${art.svg}</svg>`;
}

const sliderArt = (fillId = '') => `<div class="paper-player-track" aria-hidden="true"><span class="paper-player-track-art"></span><i class="paper-player-fill"${fillId ? ` id="${fillId}"` : ''}></i><span class="paper-player-thumb"></span></div>`;

/** The timeline and all transport ids remain owned by the main performance controller. */
export function mountPaperPlayer(host) {
  if (!host || typeof host.replaceChildren !== 'function') throw new TypeError('A paper player needs its existing nav host.');
  const originalClassName = host.className;
  const originalLang=host.getAttribute('lang'),originalLabel=host.getAttribute('aria-label');
  host.className = 'paper-player'; host.dataset.inkPhase = '0'; host.setAttribute('aria-label', 'Jolly performance player');
  host.innerHTML = `<style>${CSS}</style>${inkDefsSvg({ paper: false })}<article class="paper-player-card" data-slot="card"><div class="paper-player-outline" aria-hidden="true"></div><div class="paper-player-main"><div class="paper-player-album" aria-hidden="true"><img src="${PLAYER_ALBUMS[0].src}" alt=""></div><div class="paper-player-content"><div class="paper-player-top"><div class="paper-player-titles"><p class="paper-player-title">THE JOLLY</p><p class="paper-player-subtitle">DO NOT FEED THE ARROWS</p><span id="step-label">THE HOUSE IS NOT QUITE READY</span></div><div class="paper-player-compact-slot"></div><button id="player-collapse" class="paper-player-button" type="button" aria-label="Collapse player" aria-expanded="true" aria-controls="paper-player-details"></button></div><div class="paper-player-body" id="paper-player-details"><div class="paper-player-slider paper-player-progress">${sliderArt('timeline-fill')}<input class="paper-player-range" id="player-progress" type="range" min="0" max="1000" step="1" value="0" aria-label="Progress through the Jolly performance"></div><div class="paper-player-times"><span id="player-time">0:00</span><span id="player-duration">0:00</span></div><div class="paper-player-controls"><div class="paper-player-transport"><button id="prev" class="paper-player-button" type="button" aria-label="Previous step" title="Previous step"></button><button id="play" class="paper-player-button" type="button" aria-label="Play the performance" title="Play / pause"></button><button id="next" class="paper-player-button" type="button" aria-label="Next step" title="Next step"></button></div><div class="paper-player-tools"><button id="restart" class="paper-player-button" type="button" aria-label="Restart the performance" title="Restart"></button><span id="count">00 / 00</span><button id="speed" class="paper-player-button" type="button" aria-label="Playback speed" title="Playback speed"></button><button id="player-sound" class="paper-player-button" type="button" aria-label="Volume" aria-expanded="false" aria-controls="paper-player-volume" title="Volume"></button><button id="overview" class="paper-player-button" type="button" aria-label="Show the whole score" title="Show the whole score"></button></div></div><div class="paper-player-volume" id="paper-player-volume" hidden><label for="player-volume">Volume</label><div class="paper-player-slider paper-player-volume-range">${sliderArt()}<input class="paper-player-range" id="player-volume" type="range" min="0" max="100" step="1" value="${DEFAULT_VOLUME_PERCENT}" aria-valuetext="${DEFAULT_VOLUME_PERCENT}%"></div><output for="player-volume" aria-hidden="true">${DEFAULT_VOLUME_PERCENT}%</output></div></div></div></div></article>`;
  const find = selector => host.querySelector(selector);
  const card = find('.paper-player-card'), body = find('.paper-player-body'), play = find('#play'), input = find('#player-progress'), progress = find('.paper-player-progress'), collapse = find('#player-collapse');
  const volumeButton = find('#player-sound'), volumePanel = find('#paper-player-volume'), volumeInput = find('#player-volume');
  const volumeRange = find('.paper-player-volume-range'), volumeLabel = volumePanel.querySelector('label'), volumeOutput = volumePanel.querySelector('output');
  const state = { playing: false, volume: DEFAULT_VOLUME_PERCENT, speed: 1, progress: 0, collapsed: false, album: 0,uiLanguage:uiLanguage(document.documentElement.lang),titleLanguage:'en',elapsed:'0:00',duration:'0:00' };
  const configurations = { prev: ['skip-back', 'ghost'], play: ['play', 'ghost'], next: ['skip-forward', 'ghost'], restart: ['repeat', 'ghost'], speed: [null, 'ghost'], 'player-sound': ['volume-off', 'ghost'], overview: ['layout-grid', 'ghost'], 'player-collapse': ['chevron-down', 'ghost'] };
  let frame = 0, disposed = false, manualCollapse = false;
  const dimensions = new Map();
  function localize(){
    const language=state.uiLanguage,copy=PLAYER_UI[language];host.lang=language==='zh'?'zh-CN':'en';host.setAttribute('aria-label',copy.player);
    const labels={prev:copy.previous,play:state.playing?copy.pause:copy.play,next:copy.next,restart:copy.restart,speed:`${copy.speed} · ${state.speed}×`,'player-sound':copy.volume,overview:copy.overview,'player-collapse':state.collapsed?copy.expand:copy.collapse};
    for(const[id,text]of Object.entries(labels)){const button=find(`#${id}`);button.setAttribute('aria-label',text);button.title=text;}
    if (volumeLabel.textContent !== copy.volume) volumeLabel.textContent = copy.volume;
    input.setAttribute('aria-label',copy.progress);input.setAttribute('aria-valuetext',state.duration&&state.duration!=='—:—'&&state.duration!=='0:00'?(language==='zh'?`已播放 ${state.elapsed}，共 ${state.duration}`:`${state.elapsed} of ${state.duration}`):copy.pending);
    const title=find('.paper-player-title'),subtitle=find('.paper-player-subtitle'),status=find('#step-label');
    title.lang=state.titleLanguage==='zh'?'zh-CN':'en';title.style.fontFamily=state.titleLanguage==='zh'?'"Huiwen Mincho",serif':'"Special Elite",serif';
    subtitle.lang='en';subtitle.style.fontFamily='"Courier Prime",monospace';
    status.lang=language==='zh'?'zh-CN':'en';status.style.fontFamily=language==='zh'?'"Zhuque Fangsong",serif':'"Courier Prime",monospace';
  }
  function setUiLanguage(value){if(disposed)return;state.uiLanguage=uiLanguage(value);localize();schedule();}
  function decorate(button) {
    const id = button.id, config = configurations[id], w = Math.max(44, Math.round(button.clientWidth || 44)), h = Math.max(44, Math.round(button.clientHeight || 44));
    const glyph = id === 'play' ? state.playing ? 'pause' : 'play' : id === 'player-sound' ? state.volume > 0 ? 'volume-2' : 'volume-off' : id === 'player-collapse' ? state.collapsed ? 'chevron-up' : 'chevron-down' : config[0];
    const stamp = `${w}:${h}:${glyph}:${state.speed}`;
    if (dimensions.get(id) === stamp && button.querySelector('.paper-player-button-ink')) return;
    button.innerHTML = `<span class="paper-player-button-ink">${phases(phase => recipeSvg(buttonRecipe, w, h, { variant: config[1], size: 'icon', shape: id === 'play' ? 'pill' : 'default' }, `jolly-player-${id}`, phase))}</span>${glyph ? iconSvg(glyph, `jolly-player-icon-${id}`) : `<span class="paper-player-button-label">${state.speed}×</span>`}`;
    dimensions.set(id, stamp);
  }
  function refreshSlider(slider, key) {
    const width = Math.max(100, Math.round(slider.clientWidth));
    if (dimensions.get(key) === width) return;
    slider.querySelector('.paper-player-track-art').innerHTML = recipeSvg(sliderTrackRecipe, width, 9, {}, `jolly-player-${key}-track`);
    slider.querySelector('.paper-player-fill').innerHTML = recipeSvg(sliderRangeRecipe, width, 9, { tone: 'marker' }, `jolly-player-${key}-fill`);
    slider.querySelector('.paper-player-thumb').innerHTML = recipeSvg(sliderThumbRecipe, 19, 19, {}, `jolly-player-${key}-thumb`);
    dimensions.set(key, width);
  }
  function refresh() {
    if (disposed) return;
    const w = Math.max(200, Math.round(card.clientWidth)), h = Math.max(60, Math.round(card.clientHeight)), key = `${w}:${h}`;
    if (dimensions.get('outline') !== key) {
      find('.paper-player-outline').innerHTML = phases(phase => outlineSvg(w, h, phase)); dimensions.set('outline', key);
    }
    host.querySelectorAll('.paper-player-button').forEach(decorate);
    if (!state.collapsed) refreshSlider(progress, 'progress');
    if (!volumePanel.hidden) refreshSlider(volumeRange, 'volume');
  }
  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh); }
  function updateSliderArt(slider, ratio) {
    slider.style.setProperty('--paper-player-progress', `${ratio * 100}%`);
    slider.style.setProperty('--paper-player-ratio', String(ratio));
  }
  function setProgress(value) {
    state.progress = Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));
    input.value = String(Math.round(state.progress * 1000)); updateSliderArt(progress, state.progress);
  }
  function setAlbum(value) {
    const cover = typeof value === 'number' ? PLAYER_ALBUMS[((Math.floor(value) % PLAYER_ALBUMS.length) + PLAYER_ALBUMS.length) % PLAYER_ALBUMS.length] : { src: String(value), title: 'The Jolly sleeve' };
    const image = find('.paper-player-album img');
    if (image.getAttribute('src') !== cover.src) image.src = cover.src;
    find('.paper-player-album').title = cover.title; host.dataset.album = cover.src; state.album = value;
  }
  function setVolumeOpen(open) {
    volumePanel.hidden = !open;
    volumeButton.setAttribute('aria-expanded', String(open));
    if (open) {
      updateSliderArt(volumeRange, state.volume / 100);
      refreshSlider(volumeRange, 'volume');
      volumeInput.focus({ preventScroll: true });
      const rect = volumeInput.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > innerHeight) volumeInput.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  const toggleVolume = () => setVolumeOpen(volumePanel.hidden);
  const dismissVolume = event => {
    if (event.key !== 'Escape' || volumePanel.hidden) return;
    event.stopPropagation();
    setVolumeOpen(false);
    volumeButton.focus();
  };
  function setCollapsed(value, manual = true) {
    state.collapsed = Boolean(value); if (manual) manualCollapse = true;
    host.classList.toggle('paper-player-collapsed', state.collapsed); body.hidden = state.collapsed;
    if (state.collapsed) {
      setVolumeOpen(false);
      find('.paper-player-compact-slot').append(play);
    } else find('.paper-player-transport').insertBefore(play, find('#next'));
    collapse.setAttribute('aria-expanded', String(!state.collapsed));localize();schedule();
  }
  const onToggle = () => setCollapsed(!state.collapsed), onInput = () => setProgress(Number(input.value) / 1000);
  collapse.addEventListener('click', onToggle); input.addEventListener('input', onInput);
  volumeButton.addEventListener('click', toggleVolume);
  host.addEventListener('keydown', dismissVolume);
  const small = matchMedia('(max-width:600px)'), onMedia = () => { if (!manualCollapse) setCollapsed(small.matches, false); };
  small.addEventListener('change', onMedia); setCollapsed(small.matches, false);
  const resize = new ResizeObserver(schedule); resize.observe(card);
  let visible = false, phase = 0;
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); visibility.observe(host);
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const boil = setInterval(() => { if (reduced.matches) { phase = 0; host.dataset.inkPhase = '0'; } else if (visible && !document.hidden) { phase = (phase + 1) % 3; host.dataset.inkPhase = String(phase); } }, 280);
  setAlbum(0);
  refresh();
  return {
    refresh, setProgress, setCollapsed, setAlbum,setUiLanguage,
    sync(values = {}) {
      if(values.uiLanguage!==undefined)state.uiLanguage=uiLanguage(values.uiLanguage);
      if(values.titleLanguage!==undefined)state.titleLanguage=uiLanguage(values.titleLanguage);
      else if(values.title!==undefined)state.titleLanguage=/[\u3400-\u9fff]/u.test(String(values.title))?'zh':'en';
      if (values.playing !== undefined) state.playing = Boolean(values.playing);
      if (values.volume !== undefined) {
        state.volume = Math.round(values.volume * 100);
        volumeInput.value = String(state.volume);
        const percent = `${state.volume}%`;
        volumeOutput.value = percent;
        updateSliderArt(volumeRange, state.volume / 100);
        volumeInput.setAttribute('aria-valuetext', percent);
      }
      if (values.speed !== undefined) state.speed = Math.max(.1, Number(values.speed) || 1);
      if (values.progress !== undefined) setProgress(values.progress);
      if (values.album !== undefined) setAlbum(values.album);
      else if (values.count !== undefined) { const match = String(values.count).match(/(\d+)\s*\/\s*(\d+)/); if (match) setAlbum(Math.min(3, Math.floor(Math.max(0, Number(match[1]) - 1) / Math.max(1, Number(match[2])) * 4))); }
      for (const [name, selector] of [['title', '.paper-player-title'], ['subtitle', '.paper-player-subtitle'], ['stepLabel', '#step-label'], ['count', '#count'], ['elapsed', '#player-time'], ['duration', '#player-duration']]) {
        if (values[name] === undefined) continue;
        const timed = name === 'elapsed' || name === 'duration';
        const text = timed && typeof values[name] !== 'string' ? seconds(values[name]) : String(values[name]);
        if (timed) state[name] = text;
        const element = find(selector);
        if (element.textContent !== text) element.textContent = text;
      }
      localize();refresh();
    },
    dispose() { disposed = true; cancelAnimationFrame(frame); clearInterval(boil); visibility.disconnect(); resize.disconnect(); small.removeEventListener('change', onMedia); collapse.removeEventListener('click', onToggle); input.removeEventListener('input', onInput); volumeButton.removeEventListener('click', toggleVolume); host.removeEventListener('keydown', dismissVolume); host.replaceChildren(); host.className = originalClassName;originalLang===null?host.removeAttribute('lang'):host.setAttribute('lang',originalLang);originalLabel===null?host.removeAttribute('aria-label'):host.setAttribute('aria-label',originalLabel);delete host.dataset.inkPhase; delete host.dataset.album; },
  };
}
