export const MUSIC_IDS = ['jojo-rest', 'lyly-lines', 'yoyo-bite'];
const ZH_TITLES = { 'jojo-rest': '零钱太响', 'lyly-lines': '歪得刚刚好', 'yoyo-bite': '晚安有机关' };
const ZH_GENRES = { 'jojo-rest': '冷爵士／萨克斯夜曲', 'lyly-lines': '摇滚比利／跳跃爵士', 'yoyo-bite': '暗色歌舞／小调摇摆吉他' };
export const musicLanguage = value => String(value).toLowerCase().startsWith('zh') ? 'zh' : 'en';

/** Titles and sleeves come from the reviewed briefs; only the manifest may supply an audio source. */
export function buildMusicCatalog(briefs, manifest, { language = 'en' } = {}) {
  language = musicLanguage(language);
  if (!Array.isArray(briefs)) throw new TypeError('JOLLY music briefs must be an array.');
  const records = Array.isArray(manifest) ? manifest : manifest?.tracks ?? [];
  if (!Array.isArray(records)) throw new TypeError('JOLLY tracks manifest must contain an array.');
  const byId = new Map();
  for (const record of records) {
    if (!record || !MUSIC_IDS.includes(record.id)) continue;
    if (byId.has(record.id)) throw new TypeError(`Duplicate JOLLY recording: ${record.id}`);
    byId.set(record.id, record);
  }
  const tracks = MUSIC_IDS.map(id => {
    const brief = briefs.find(track => track.id === id), recording = byId.get(id);
    if (!brief?.title || !brief?.artist) throw new TypeError(`Missing reviewed JOLLY brief: ${id}`);
    const src = typeof recording?.src === 'string' && recording.src.trim() ? recording.src.trim() : null;
    return {
      id, title: recording?.title || (language === 'zh' ? ZH_TITLES[id] : brief.title), artist: recording?.artist || brief.artist, genre: recording?.genre || (language === 'zh' ? ZH_GENRES[id] : brief.genre),
      cover: typeof recording?.cover === 'string' && recording.cover ? recording.cover : `/jolly-statechart/assets/music/covers/${id}.webp`,
      src, sourceUrl: typeof recording?.sourceUrl === 'string' ? recording.sourceUrl : null,
      metadataDuration: Number.isFinite(recording?.duration) ? recording.duration : null,
      status: src ? 'available' : 'awaiting-suno', language, side: language === 'zh' ? 'B' : 'A',
    };
  });
  return { tracks, available: tracks.filter(track => track.src).length, status: tracks.every(track => track.src) ? 'available' : 'awaiting-suno' };
}

export async function loadMusicCatalog({ language = 'en' } = {}) {
  language = musicLanguage(language);
  const briefsResponse = await fetch('/jolly-statechart/assets/music/song-briefs.json', { cache: 'no-store' });
  if (!briefsResponse.ok) throw new Error('The reviewed music list could not be loaded.');
  const briefs = await briefsResponse.json();
  const manifestResponse = await fetch(language === 'zh' ? '/jolly-statechart/assets/music/tracks-zh.json' : '/jolly-statechart/assets/music/tracks.json', { cache: 'no-store' });
  if (manifestResponse.status === 404) return buildMusicCatalog(briefs, { tracks: [] }, { language });
  if (!manifestResponse.ok) throw new Error('The recordings list could not be checked.');
  return buildMusicCatalog(briefs, await manifestResponse.json(), { language });
}
