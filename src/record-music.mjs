import { loadMusicCatalog, musicLanguage } from './music-catalog.mjs';
import { mountVinylCrate } from './vinyl-crate.mjs';

const clamp = value => Math.max(0, Math.min(1, value));
const timeLabel = seconds => { const n = Math.max(0, Math.floor(Number(seconds) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
const CSS = `.record-music-sides{display:flex;gap:8px;min-height:44px;margin:0 0 4px}.record-music-sides button{flex:1;min-width:0;min-height:44px;padding:7px 10px;background:transparent;border:1px solid #2140d62c;color:#2140d6;font:10px/1.4 "Courier Prime",monospace;letter-spacing:1.3px;cursor:pointer}.record-music-sides button[aria-pressed=true]{border-color:#2140d699;box-shadow:inset 0 -3px #e97780;background:#e9778008}.record-music-sides button:focus-visible{outline:2px solid #8e1b2c;outline-offset:3px}.record-music-status[lang^=zh],.record-music-refresh[lang^=zh],.record-music-sides[lang^=zh] button{font-family:"Zhuque Fangsong",serif;font-size:13px;letter-spacing:0}.record-workbench-heading h2[lang^=zh]{font-family:"Huiwen Mincho",serif;letter-spacing:.02em}.record-workbench-heading p[lang^=zh]{font-family:"Zhuque Fangsong",serif;letter-spacing:1px}.record-music{width:100%;margin:0;text-align:left;color:#2140d6}.record-music-notice{display:flex;align-items:center;gap:10px;min-height:44px;margin:0 0 8px}.record-music-status{flex:1;min-width:0;font:11px/1.5 "Courier Prime",monospace;margin:0;padding:0}.record-music[data-status=error] .record-music-status,.record-music[data-status=blocked] .record-music-status{color:#8e1b2c}.record-music-refresh{flex:0 0 auto;max-width:118px;min-height:44px;margin:0;padding:8px;border:0;border-bottom:1px solid #2140d677;background:none;color:#2140d6;font:9px/1.4 "Courier Prime",monospace;cursor:pointer}.record-music-refresh:focus-visible{outline:2px solid #8e1b2c;outline-offset:4px}.record-music-refresh[hidden]{display:none}.record-music audio{display:none}.record-music .vinyl-crate{margin:0}.record-music-transport .paper-player-title{white-space:normal;font-size:18px;line-height:1.15}.record-music-transport .paper-player-subtitle{font-size:9px}@media(max-width:600px){.record-music-status{font-size:10px}.record-music-transport .paper-player-title{font-size:16px}}`;

export const RECORD_WORKBENCH_CSS = `
.record-workbench{--workbench-columns:minmax(0,1.05fr) minmax(380px,.95fr);--workbench-gutter:28px;--workbench-inset:8px;display:grid;grid-template-columns:var(--workbench-columns);gap:18px var(--workbench-gutter);width:calc(100% - 72px);max-width:1080px;margin:38px auto 40px;color:#2140d6;align-items:start}
.record-workbench-heading{grid-column:1/-1;display:grid;grid-template-columns:var(--workbench-columns);column-gap:var(--workbench-gutter);align-items:center;padding-top:16px;border-top:1px dashed #2140d644}.record-workbench-heading p{font:9px/1.5 "Courier Prime",monospace;letter-spacing:1.2px;margin:0}.record-workbench-heading h2{font:400 32px/1.12 "Special Elite",serif;letter-spacing:-.8px;margin:0 var(--workbench-inset);color:#16246e}
.record-workbench-machine,.record-workbench-library{min-width:0}.record-workbench-library{container-type:inline-size;container-name:record-library}.record-workbench-machine .record-player{background:transparent}
.record-workbench-library :is(.record-music-notice,.record-music-sides){margin-inline:var(--workbench-inset)}
.record-workbench-library .paper-player[data-ink-phase]{width:min(480px,100%);margin:10px auto 0}.record-workbench-library .paper-player[data-ink-phase] .paper-player-album{display:none}.record-workbench-library .paper-player[data-ink-phase] .paper-player-main{grid-template-columns:minmax(0,1fr);gap:0}.record-workbench-library .paper-player[data-ink-phase] .paper-player-card{padding:6px 14px}.record-workbench-library .vinyl-crate-heading{display:none}.record-workbench-library .paper-player[data-ink-phase] #step-label{display:none}.record-workbench-library .paper-player[data-ink-phase] .paper-player-controls{gap:4px}.record-workbench-library .paper-player[data-ink-phase] .paper-player-transport{gap:6px}
@container record-library (min-width:410px){.record-workbench-library .paper-player[data-ink-phase] .paper-player-controls{flex-wrap:nowrap;gap:6px}.record-workbench-library .paper-player[data-ink-phase] .paper-player-tools{width:auto;gap:0}}
@media(min-width:901px){.record-workbench-heading h2{position:relative;top:16px}.record-workbench-machine{transform:translate(-24px,12px)}}
@media(max-width:900px){.record-workbench{--workbench-columns:minmax(0,1fr);width:calc(100% - 48px);gap:18px;margin-top:30px}.record-workbench-heading{grid-template-columns:minmax(0,560px);justify-content:center;row-gap:9px}.record-workbench-heading p{margin-inline:var(--workbench-inset)}.record-workbench-machine{max-width:520px;width:100%;margin:auto}.record-workbench-library{width:100%;max-width:560px;margin:auto}}
@media(max-width:600px){.record-workbench{width:calc(100% - 32px);gap:16px;margin:24px auto 30px}.record-workbench-heading{padding-top:18px}.record-workbench-heading h2{font-size:29px}.record-workbench-heading p{font-size:8px}.record-workbench-library .paper-player[data-ink-phase]{margin-top:8px}}
`;

export const MUSIC_LANGUAGE_KEY = 'jolly-record-language';
const RECORD_UI = {
  en: {
    sideLabel: 'Choose record side', en: 'A · ENGLISH', zh: 'B · CHINESE', retry: 'CHECK RECORDINGS',
    heading: 'Pick a little trouble.', eyebrow: 'THE JOLLY / THE LISTENING DESK',
    play: 'Play record', pause: 'Pause record', previous: 'Previous record', next: 'Next record', restart: 'Restart current record', overview: 'Choose a record', notReady: 'Recording not ready',
    messages: {
      pending: 'Preparing Suno recording. This side can only be previewed.', changing: 'Changing the record.', switching: 'Preparing the other side.', ready: 'The record is ready when you are.', available: 'Recording ready. Press Play.', paused: 'Record paused.', starting: 'Starting the record.', playing: 'The record is playing.', buffering: 'The recording is buffering.', ended: 'This side has finished.', cancelled: 'Record change cancelled. Choose a sleeve.', blocked: 'Playback was blocked. Press Play to try again.', loadError: 'This recording could not be loaded. Check recordings or choose it again.', playError: 'This recording could not be played. Press Play to try again.', placementError: 'The record could not be placed. Choose it again.', catalogError: 'This side could not be checked. Try again.', loading: 'Preparing the sleeve.', lifting: 'Lifting the needle.', ejecting: 'Returning the record.', inserting: 'Placing the record.', lowering: 'Lowering the needle.', flipping: 'Turning the record over.',
    },
  },
  zh: {
    sideLabel: '选择唱片面', en: 'A面 · 英文', zh: 'B面 · 中文', retry: '检查录音',
    heading: '挑一点小麻烦。', eyebrow: 'JOLLY／唱片工作台',
    play: '播放唱片', pause: '暂停唱片', previous: '上一张唱片', next: '下一张唱片', restart: '从头播放当前唱片', overview: '选择唱片', notReady: '录音尚未就绪',
    messages: {
      pending: '这一面的录音还在准备，当前仅预览换盘。', changing: '正在更换唱片。', switching: '正在准备另一面。', ready: '唱片已就位，可以播放了。', available: '录音已就绪，按播放即可。', paused: '唱片已暂停。', starting: '唱片正在开始播放。', playing: '唱片正在播放。', buffering: '录音正在缓冲。', ended: '这一面播放结束。', cancelled: '换盘已取消，请重新选择。', blocked: '播放被阻止，请再按一次播放。', loadError: '录音暂时无法载入，请检查录音或重新选择。', playError: '录音暂时无法播放，请再按一次播放。', placementError: '唱片暂时无法放上转盘，请重新选择。', catalogError: '暂时无法检查这一面的录音，请重试。', loading: '正在准备封套。', lifting: '正在抬起唱针。', ejecting: '正在收回唱片。', inserting: '正在放入唱片。', lowering: '正在落下唱针。', flipping: '正在翻转唱片。',
    },
  },
};

async function ensureMusicFonts(track) {
  if (track.language !== 'zh') return;
  await Promise.all([document.fonts.load('22px "Huiwen Mincho"', track.title), document.fonts.load('12px "Zhuque Fangsong"', track.genre || '唱片')]);
}

/** Music side is independent of page language; native HTMLAudio remains the only playback clock. */
export async function createRecordMusicController({ host, transportHost, player, machine, onStateChange } = {}) {
  if (!host || !transportHost || !player || typeof machine?.selectRecord !== 'function') throw new TypeError('Record music needs a host, transport and ready gramophone controller.');
  let preferredLanguage = 'en';
  try { const stored = localStorage.getItem(MUSIC_LANGUAGE_KEY); if (stored === 'en' || stored === 'zh') preferredLanguage = stored; } catch {}
  const catalog = await loadMusicCatalog({ language: preferredLanguage }), tracks = catalog.tracks;
  await ensureMusicFonts(tracks[0]);
  let activeLanguage = preferredLanguage, uiLanguage = musicLanguage(document.documentElement.lang);
  const scope = document.createElement('section'); scope.className = 'record-music';
  const style = document.createElement('style'); style.textContent = CSS;
  const status = document.createElement('p'); status.className = 'record-music-status'; status.id = 'record-music-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const retryButton = document.createElement('button'); retryButton.type = 'button'; retryButton.className = 'record-music-refresh';
  const notice = document.createElement('div'); notice.className = 'record-music-notice'; notice.append(status, retryButton);
  const sidePicker = document.createElement('div'); sidePicker.className = 'record-music-sides'; sidePicker.setAttribute('role', 'group');
  const sideButtons = ['en', 'zh'].map(language => { const button = document.createElement('button'); button.type = 'button'; button.dataset.musicLanguage = language; sidePicker.append(button); return button; });
  const crateHost = document.createElement('div'); crateHost.className = 'record-vinyl-library';
  const audio = document.createElement('audio'); audio.id = 'record-music-audio'; audio.preload = 'metadata'; audio.setAttribute('aria-hidden', 'true');
  scope.append(style, notice, sidePicker, crateHost, audio); host.append(scope); transportHost.classList.add('record-music-transport');
  const buttons = Object.fromEntries(['play', 'prev', 'next', 'restart', 'speed', 'player-sound', 'player-volume', 'player-progress', 'overview'].map(id => [id, transportHost.querySelector(`#${id}`)]));
  if (Object.values(buttons).some(button => !button)) throw new Error('The record transport is incomplete.');
  audio.volume = buttons['player-volume'].valueAsNumber / 100;
  const events = new AbortController();
  let disposed = false, version = 0, selected = 0, changing = false, hasSelection = false, running = false, intentToPlay = false, positionFrame = 0, changePromise = null;
  let stateStatus = 'ready', messageKey = 'ready', playbackError = null, machineReport = machine.machineState ?? null;
  const current = () => tracks[selected];
  const duration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
  const currentTime = () => Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const side = () => preferredLanguage === 'zh' ? 'B' : 'A';
  const text = () => RECORD_UI[uiLanguage].messages[messageKey] || RECORD_UI[uiLanguage].messages.ready;
  const sourceMatches = () => !current().src || !audio.currentSrc || audio.currentSrc === new URL(current().src, document.baseURI).href;
  const crate = mountVinylCrate(crateHost, { tracks, layout: 'workbench', onSelect: track => { void select(track.id, { autoplay: true, userGesture: true }); } });
  const listen = (element, type, fn) => element.addEventListener(type, fn, { signal: events.signal });
  function report() {
    return { selectedId: current().id, title: current().title, language: preferredLanguage, side: side(), loadedLanguage: activeLanguage, uiLanguage, status: stateStatus, message: text(), changing, hasSelection, playing: running, paused: audio.paused, ended: audio.ended, currentTime: currentTime(), duration: duration(), src: current().src, currentSrc: audio.currentSrc || null, playbackRate: audio.playbackRate, muted: audio.muted, volume: audio.volume, available: tracks.filter(track => track.src).length, machine: machineReport ? { ...machineReport } : null };
  }
  function setStatus(value, key) { stateStatus = value; messageKey = key; }
  function sync() {
    if (disposed) return;
    const track = current(), length = duration(), position = currentTime(), ui = RECORD_UI[uiLanguage], uiLang = uiLanguage === 'zh' ? 'zh-CN' : 'en';
    const matches = preferredLanguage === activeLanguage;
    player.sync({ uiLanguage, titleLanguage: track.language, playing: !audio.paused && !audio.ended, volume: audio.muted ? 0 : audio.volume, speed: audio.playbackRate, album: track.cover, progress: length ? clamp(position / length) : 0, elapsed: position, duration: length ? timeLabel(Math.round(length)) : '—:—', title: track.title, subtitle: track.artist, stepLabel: text(), count: `${String(selected + 1).padStart(2, '0')} / ${String(tracks.length).padStart(2, '0')} · ${side()}` });
    buttons.play.disabled = !matches || !track.src || changing;
    buttons.prev.disabled = selected === 0; buttons.next.disabled = selected === tracks.length - 1;
    buttons.restart.disabled = !matches || !track.src || !length || changing; buttons['player-progress'].disabled = !matches || !track.src || !length || changing; buttons.speed.disabled = !matches || !track.src; buttons['player-sound'].disabled = buttons['player-volume'].disabled = !matches || !track.src;
    const message = text();
    if (status.textContent !== message) status.textContent = message;
    if (status.lang !== uiLang) status.lang = uiLang;
    if (retryButton.textContent !== ui.retry) retryButton.textContent = ui.retry;
    if (retryButton.lang !== uiLang) retryButton.lang = uiLang;
    if (sidePicker.lang !== uiLang) sidePicker.lang = uiLang;
    if (sidePicker.getAttribute('aria-label') !== ui.sideLabel) sidePicker.setAttribute('aria-label', ui.sideLabel);
    for (const button of sideButtons) {
      const language = button.dataset.musicLanguage, pressed = String(language === preferredLanguage);
      if (button.textContent !== ui[language]) button.textContent = ui[language];
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
    }
    for (const [key, value] of Object.entries({ status: stateStatus, selected: track.id, changing: String(changing), musicLanguage: preferredLanguage, side: side() })) {
      if (scope.dataset[key] !== value) scope.dataset[key] = value;
    }
    const hideRetry = tracks.every(track => track.src) && stateStatus !== 'error';
    if (retryButton.hidden !== hideRetry) retryButton.hidden = hideRetry;
    crate.select(track.id); crate.setPlaying(running);
    if (onStateChange) onStateChange(report());
  }
  function translateUi() {
    uiLanguage = musicLanguage(document.documentElement.lang);
    crate.setUiLanguage(uiLanguage); player.setUiLanguage?.(uiLanguage);
    const lang = uiLanguage === 'zh' ? 'zh-CN' : 'en', ui = RECORD_UI[uiLanguage];
    const heading = host.closest('#record-workbench')?.querySelector('.record-workbench-heading');
    if (heading) { heading.querySelector('h2').textContent = ui.heading; heading.querySelector('p').textContent = ui.eyebrow; heading.querySelector('h2').lang = lang; heading.querySelector('p').lang = lang; }
    sync();
  }
  function syncMachine() { if (!disposed) { machine.setPlaying(running); machine.setPlaybackPosition(currentTime()); } }
  function stopPositionFrame() { if (positionFrame) cancelAnimationFrame(positionFrame); positionFrame = 0; }
  function samplePosition() {
    positionFrame = 0; if (disposed || audio.paused || audio.ended) return;
    const length = duration(), position = currentTime(); player.setProgress(length ? clamp(position / length) : 0);
    const label = transportHost.querySelector('#player-time'); if (label.textContent !== timeLabel(position)) label.textContent = timeLabel(position);
    machine.setPlaybackPosition(position); positionFrame = requestAnimationFrame(samplePosition);
  }
  function sampleWhilePlaying() { if (!positionFrame) positionFrame = requestAnimationFrame(samplePosition); }
  function prepareSource(track, reload = false) {
    const wanted = track.src ? new URL(track.src, document.baseURI).href : null;
    if (wanted && (audio.src !== wanted || audio.error || reload)) { audio.src = track.src; audio.load(); }
    else if (!wanted && audio.hasAttribute('src')) { audio.removeAttribute('src'); audio.load(); }
  }
  function applyCatalog(next) { next.tracks.forEach((track, index) => Object.assign(tracks[index], track)); activeLanguage = next.tracks[0].language; crate.updateTracks(tracks); }
  async function playCurrent(requestVersion) {
    if (disposed || requestVersion !== version || !intentToPlay || !current().src) return false;
    try { await audio.play(); if (disposed || requestVersion !== version) return false; playbackError = null; return true; }
    catch (error) { if (disposed || requestVersion !== version) return false; running = false; intentToPlay = false; playbackError = error; setStatus(error?.name === 'NotAllowedError' ? 'blocked' : 'error', error?.name === 'NotAllowedError' ? 'blocked' : 'playError'); syncMachine(); sync(); return false; }
  }
  async function select(id, { autoplay = false, userGesture = false, language = preferredLanguage, fromBeginning = false } = {}) {
    const index = tracks.findIndex(track => track.id === id); if (index < 0) throw new RangeError(`Unknown JOLLY record: ${id}`);
    const requestedLanguage = musicLanguage(language), requestVersion = ++version;
    preferredLanguage = requestedLanguage; selected = index; changing = true; intentToPlay = Boolean(autoplay && userGesture); running = false; playbackError = null;
    audio.pause(); stopPositionFrame(); hasSelection = true; setStatus('changing', requestedLanguage === activeLanguage ? 'changing' : 'switching'); syncMachine(); sync();
    try {
      const next = requestedLanguage === activeLanguage ? null : await loadMusicCatalog({ language: requestedLanguage });
      if (disposed || requestVersion !== version) return null;
      await ensureMusicFonts((next?.tracks ?? tracks)[index]);
      if (disposed || requestVersion !== version) return null;
      if (next) applyCatalog(next);
      prepareSource(current(), fromBeginning); sync();
      const request = Promise.resolve(machine.selectRecord({ id, label: current().title, cover: current().cover, language: requestedLanguage, side: side() })); changePromise = request;
      const loaded = await request;
      if (disposed || requestVersion !== version) return null;
      changing = false; changePromise = null;
      if (loaded !== id) { intentToPlay = false; setStatus('ready', 'cancelled'); sync(); return null; }
      syncMachine();
      if (!current().src) { intentToPlay = false; setStatus('awaiting-suno', 'pending'); sync(); return id; }
      if (audio.error || playbackError) { intentToPlay = false; setStatus('error', 'loadError'); sync(); return id; }
      setStatus('ready', 'ready'); sync(); if (intentToPlay) await playCurrent(requestVersion); return id;
    } catch (error) {
      if (disposed || requestVersion !== version) return null;
      changing = false; changePromise = null; intentToPlay = false; running = false;
      setStatus('error', activeLanguage !== requestedLanguage ? 'catalogError' : 'placementError'); syncMachine(); sync(); return null;
    }
  }
  async function setLanguage(value, { userGesture = true } = {}) {
    const next = musicLanguage(value); if (next === preferredLanguage && !changing) return current().id;
    const resume = (!audio.paused && !audio.ended) || intentToPlay;
    try { localStorage.setItem(MUSIC_LANGUAGE_KEY, next); } catch {}
    return select(current().id, { language: next, autoplay: resume, userGesture, fromBeginning: true });
  }
  function pause() { intentToPlay = false; audio.pause(); running = false; stopPositionFrame(); syncMachine(); if (current().src && !changing && !playbackError) setStatus('paused', 'paused'); sync(); }
  async function play() {
    if (activeLanguage !== preferredLanguage) return select(current().id, { autoplay: true, userGesture: true, language: preferredLanguage, fromBeginning: true });
    if (!current().src) { setStatus('awaiting-suno', 'pending'); sync(); return false; }
    if (changing) { intentToPlay = true; if (changePromise) await changePromise; if (changing) return false; }
    if (!audio.paused && !audio.ended) return true;
    const loaded = machine.machineState;
    if (!hasSelection || loaded?.loadedRecordId !== current().id || loaded?.loadedLanguage !== current().language || loaded?.loadedSide !== current().side || loaded?.mode === 'story') return select(current().id, { autoplay: true, userGesture: true });
    intentToPlay = true; if (audio.ended) audio.currentTime = 0; return playCurrent(version);
  }
  function toggle() { return audio.paused ? play() : pause(); }
  function seek(value, { fraction = false } = {}) { const length = duration(); if (!current().src || !length || changing || activeLanguage !== preferredLanguage) return false; const target = fraction ? clamp(Number(value)) * length : Math.max(0, Math.min(length, Number(value))); if (!Number.isFinite(target)) return false; audio.currentTime = target; machine.setPlaybackPosition(audio.currentTime); sync(); return true; }
  function restart() { return seek(0); }
  function next() { return selected < tracks.length - 1 ? select(tracks[selected + 1].id, { autoplay: true, userGesture: true }) : Promise.resolve(null); }
  function previous() { return selected > 0 ? select(tracks[selected - 1].id, { autoplay: true, userGesture: true }) : Promise.resolve(null); }
  function setSpeed(value) { if (!Number.isFinite(value) || value <= 0) throw new RangeError('Playback rate must be positive.'); audio.playbackRate = value; sync(); }
  function setMuted(value) { audio.muted = Boolean(value); sync(); }
  async function retry() {
    retryButton.disabled = true; const requestVersion = version, language = preferredLanguage;
    try { const latest = await loadMusicCatalog({ language }); if (disposed || requestVersion !== version) return; await ensureMusicFonts(latest.tracks[selected]); if (disposed || requestVersion !== version) return; applyCatalog(latest); prepareSource(current()); playbackError = null; setStatus(current().src ? running ? 'playing' : 'ready' : 'awaiting-suno', current().src ? running ? 'playing' : 'available' : 'pending'); sync(); }
    catch { if (!disposed && requestVersion === version) { setStatus('error', 'catalogError'); sync(); } }
    finally { retryButton.disabled = false; }
  }
  for (const type of ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked', 'ratechange']) listen(audio, type, () => { if (!sourceMatches()) return; syncMachine(); sync(); });
  listen(audio, 'volumechange', sync);
  listen(audio, 'play', () => { if (sourceMatches() && !changing && !audio.paused) { setStatus('starting', 'starting'); sync(); } });
  listen(audio, 'playing', () => { if (!sourceMatches() || audio.paused || changing || !current().src) return; running = true; playbackError = null; setStatus('playing', 'playing'); syncMachine(); sampleWhilePlaying(); sync(); });
  listen(audio, 'pause', () => { if (!audio.paused && !audio.ended) return; running = false; stopPositionFrame(); syncMachine(); if (!changing && current().src && !playbackError && !audio.ended) setStatus('paused', 'paused'); sync(); });
  listen(audio, 'ended', () => { if (!audio.ended) return; running = false; intentToPlay = false; stopPositionFrame(); setStatus('ended', 'ended'); syncMachine(); sync(); });
  for (const type of ['waiting', 'stalled']) listen(audio, type, () => { if (!audio.paused && !changing) { running = false; setStatus('buffering', 'buffering'); syncMachine(); sync(); } });
  listen(audio, 'error', () => { if (!current().src || !sourceMatches() || !audio.error) return; running = false; intentToPlay = false; playbackError = audio.error; setStatus('error', 'loadError'); stopPositionFrame(); syncMachine(); sync(); });
  listen(buttons.play, 'click', () => { void toggle(); }); listen(buttons.prev, 'click', () => { void previous(); }); listen(buttons.next, 'click', () => { void next(); }); listen(buttons.restart, 'click', restart);
  listen(buttons.speed, 'click', () => { const rates = [1, 1.25, 1.5, 2]; setSpeed(rates[(rates.indexOf(audio.playbackRate) + 1) % rates.length]); });
  listen(buttons['player-volume'], 'input', event => {
    audio.volume = event.target.valueAsNumber / 100;
    audio.muted = false;
    sync();
  });
  listen(buttons['player-progress'], 'input', event => seek(Number(event.target.value) / 1000, { fraction: true })); listen(retryButton, 'click', () => { void retry(); });
  sideButtons.forEach(button => listen(button, 'click', () => { void setLanguage(button.dataset.musicLanguage); }));
  listen(buttons.overview, 'click', () => scope.querySelector('.vinyl-crate')?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' }));
  const uiObserver = new MutationObserver(translateUi); uiObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  prepareSource(current()); setStatus(current().src ? 'ready' : 'awaiting-suno', current().src ? 'ready' : 'pending'); translateUi();
  return {
    select, setLanguage, play, pause, toggle, seek, restart, next, previous, setSpeed, setMuted, retry, audio,
    get state() { return report(); },
    onMachineUpdate(update) {
      const previous = machineReport; machineReport = update;
      if (disposed || previous?.mode === update.mode && previous?.phase === update.phase && previous?.recordId === update.recordId && previous?.loadedRecordId === update.loadedRecordId && previous?.side === update.side) return;
      if (changing && !playbackError && update.mode === 'record' && update.recordId === current().id && ['loading', 'lifting', 'ejecting', 'inserting', 'lowering', 'flipping'].includes(update.phase)) messageKey = current().src ? update.phase : 'pending';
      sync();
    },
    dispose() { disposed = true; ++version; events.abort(); uiObserver.disconnect(); stopPositionFrame(); audio.pause(); audio.removeAttribute('src'); audio.load(); machine.setPlaying(false); crate.dispose(); scope.remove(); transportHost.classList.remove('record-music-transport'); },
  };
}
