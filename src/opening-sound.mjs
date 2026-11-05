// Everything audible at the door runs on one Web Audio clock, so light and picture can sit exactly on the beat.
const CUES = ['bell', 'sax', 'bass', 'guitar'];
const MUSIC = { loop: '/jolly-statechart/assets/opening/door-loop.mp3', overture: '/jolly-statechart/assets/opening/overture.mp3' };

async function decode(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  // An offline context decodes without asking for permission to make sound.
  return new OfflineAudioContext(2, 1, 48000).decodeAudioData(await response.arrayBuffer());
}

export function createOpeningSound() {
  const buffers = {};
  let context = null, master = null, loopSource = null, loopGain = null, loopStartedAt = 0, muted = false, map = null, overtureStartedAt = null;

  async function preload() {
    map = await (await fetch('/jolly-statechart/assets/opening/door-loop.json')).json();
    await Promise.all([
      ...CUES.map(async name => { buffers[name] = await decode(`/jolly-statechart/assets/audio/${name}.mp3`); }),
      ...Object.entries(MUSIC).map(async ([name, url]) => { buffers[name] = await decode(url); }),
    ]);
    return map;
  }
  // Must run inside a user gesture.
  function unlock() {
    if (!context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return false;
      context = new Context();
      master = context.createGain(); master.gain.value = muted ? 0 : 1;
      // Bell, cues and band can land together; a limiter keeps that from clipping.
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -3; limiter.knee.value = 3; limiter.ratio.value = 12; limiter.attack.value = .002; limiter.release.value = .1;
      master.connect(limiter); limiter.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume();
    return true;
  }
  function play(name, { gain = 1, rate = 1 } = {}) {
    if (!context || !buffers[name]) return;
    const source = context.createBufferSource(), level = context.createGain();
    source.buffer = buffers[name]; source.playbackRate.value = rate; level.gain.value = gain;
    source.connect(level); level.connect(master); source.start();
  }
  function startLoop(level = .6) {
    if (!context || loopSource || !buffers.loop || !map) return false;
    loopSource = context.createBufferSource(); loopGain = context.createGain();
    loopSource.buffer = buffers.loop; loopSource.loop = true; loopSource.loopStart = map.loopStart; loopSource.loopEnd = map.loopStart + map.duration;
    loopGain.gain.value = 0; loopGain.gain.linearRampToValueAtTime(level, context.currentTime + .08);
    loopSource.connect(loopGain); loopGain.connect(master);
    loopStartedAt = context.currentTime + .02;
    loopSource.start(loopStartedAt, map.loopStart);
    return true;
  }
  function stopLoop(fade = .12) {
    if (!loopSource) return;
    const source = loopSource, now = context.currentTime;
    loopGain.gain.cancelScheduledValues(now); loopGain.gain.setValueAtTime(loopGain.gain.value, now); loopGain.gain.linearRampToValueAtTime(0, now + fade);
    source.stop(now + fade + .02);
    loopSource = null;
  }
  return {
    preload, unlock, play, startLoop, stopLoop,
    get map() { return map; },
    get playing() { return Boolean(loopSource); },
    get ready() { return Boolean(buffers.overture); },
    // Seconds into the loop, or null while it is not running.
    loopTime() {
      if (!loopSource || !map) return null;
      const elapsed = context.currentTime - loopStartedAt;
      return elapsed < 0 ? 0 : elapsed % map.duration;
    },
    startOverture() {
      if (!context || !buffers.overture) return false;
      const source = context.createBufferSource();
      source.buffer = buffers.overture; source.connect(master);
      overtureStartedAt = context.currentTime; source.start();
      return true;
    },
    overtureTime() { return overtureStartedAt === null ? null : context.currentTime - overtureStartedAt; },
    hold(paused) { if (context) void (paused ? context.suspend() : context.resume()); },
    setMuted(value) {
      muted = value;
      if (master) master.gain.setTargetAtTime(value ? 0 : 1, context.currentTime, .02);
    },
    get muted() { return muted; },
    dispose() { stopLoop(.05); setTimeout(() => context?.close().catch(() => {}), 400); },
  };
}
