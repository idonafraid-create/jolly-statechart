// The page's short sounds all go through one small desk: one context, one limiter, so a pile-up can't clip.
// The door keeps its own context, because its picture runs on that context's clock.
const FILES = {
  bell: '/jolly-statechart/assets/audio/bell.mp3', sax: '/jolly-statechart/assets/audio/sax.mp3', bass: '/jolly-statechart/assets/audio/bass.mp3', guitar: '/jolly-statechart/assets/audio/guitar.mp3',
  'switch-down': '/jolly-statechart/assets/after-hours/sfx/switch-down.mp3', 'switch-up': '/jolly-statechart/assets/after-hours/sfx/switch-up.mp3',
  paw: '/jolly-statechart/assets/after-hours/sfx/paw.mp3', yoyo: '/jolly-statechart/assets/after-hours/sfx/yoyo.mp3',
};
const decoded = new Map(), sounding = new Set();
let context = null, master = null;

async function wake() {
  if (!context) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('No Web Audio');
    context = new Context();
    master = context.createDynamicsCompressor();
    master.threshold.value = -6; master.knee.value = 6; master.ratio.value = 8; master.attack.value = .002; master.release.value = .12;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') await context.resume();
  return context;
}
function buffer(name) {
  if (!decoded.has(name)) {
    // An offline context decodes without asking for permission to make sound, so this can run before any click.
    decoded.set(name, fetch(FILES[name]).then(response => {
      if (!response.ok) throw new Error(`${name} ${response.status}`);
      return response.arrayBuffer();
    }).then(data => new OfflineAudioContext(1, 1, 48000).decodeAudioData(data)));
  }
  return decoded.get(name);
}
export const sfx = {
  preload(...names) { for (const name of names) buffer(name).catch(() => decoded.delete(name)); },
  // Resolves false if the sound could not be played; a missing noise never gets in the way of what caused it.
  async play(name, { gain = 1, rate = 1, delay = 0 } = {}) {
    const [audio, sound] = await Promise.all([wake(), buffer(name)]);
    const source = audio.createBufferSource(), level = audio.createGain();
    source.buffer = sound; source.playbackRate.value = rate; level.gain.value = gain;
    source.connect(level); level.connect(master); sounding.add(source);
    source.onended = () => { sounding.delete(source); source.disconnect(); level.disconnect(); };
    source.start(audio.currentTime + delay);
    return true;
  },
  stopAll() { for (const source of sounding) { try { source.stop(); } catch { /* already over */ } } },
  dispose() { void context?.close(); context = null; },
};
