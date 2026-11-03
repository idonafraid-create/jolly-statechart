// Stable ids are shared by the stage, the player and the checked model.
export const NODES = [
  { id: 'checkin', act: 1, label: ['A perfectly', 'ordinary evening'], tag: 'HOUSE RULES / 00:00' },
  { id: 'premature', act: 1, label: ['The end', 'already approved'], tag: 'FILED IN ADVANCE' },
  { id: 'jojo', act: 2, label: ['JOJO declines', 'to hurry'], tag: 'SAXOPHONE / A QUIET REVISION' },
  { id: 'rest', act: 2, label: ['An authorised', 'moment of nothing'], tag: 'REST IS ALSO AN EVENT' },
  { id: 'detour', act: 2, label: ['The clock takes', 'the long way'], tag: 'PLEASE ALLOW FOR SILENCE' },
  { id: 'lyly', act: 3, label: ['LYLY plucks', 'the procedure'], tag: 'DOUBLE BASS / NO STRAIGHT LINES' },
  { id: 'fork', act: 3, label: ['Elegance is', 'now optional'], tag: 'CHOOSE AN IMPROVISATION' },
  { id: 'hush', act: 3, label: ['A whisper with', 'sharp corners'], tag: 'HUSH / UNDER THE CHANDELIER' },
  { id: 'swing', act: 3, label: ['The line learns', 'to swing'], tag: 'SWING / MIND THE GLASS' },
  { id: 'roar', act: 3, label: ['A respectable', 'little riot'], tag: 'ROAR / HATS MAY LEAVE HEADS' },
  { id: 'sync', act: 3, label: ['Three voices', 'one bad idea'], tag: 'ALL TOGETHER / VERY DELIBERATELY' },
  { id: 'yoyo', act: 4, label: ['YOYO inspects', 'the shortcut'], tag: 'RABBIT GUITAR / QUALITY CONTROL' },
  { id: 'bite', act: 4, label: ['The shortcut', 'has been eaten'], tag: 'DO NOT FEED THE ARROWS' },
  { id: 'sax', act: 5, label: ['Brass keeps', 'a little breath'], tag: 'TENOR / THE FIRST ACCOMPLICE' },
  { id: 'bass', act: 6, label: ['Wood remembers', 'every pluck'], tag: 'DOUBLE BASS / THE SECOND ACCOMPLICE' },
  { id: 'rabbit', act: 7, label: ['A soft friend', 'with sharp ideas'], tag: 'RABBIT GUITAR / THE THIRD ACCOMPLICE' },
  { id: 'encore', act: 8, label: ['The curtain', 'lets them in'], tag: 'THE JOLLY / OPEN THE NIGHT' },
  { id: 'bow', act: 8, label: ['A proper bow', 'Eventually.'], tag: 'THREE VOICES / ONE STAGE' },
  { id: 'side-b', act: 9, label: ['Turn the night', 'over'], tag: 'SIDE B / TOMORROW IS LISTENING' },
];

export const EDGES = [
  { from: 'checkin', to: 'premature', label: 'everything is in order' },
  { from: 'premature', to: 'jojo', label: 'JOJO has a small objection' },
  { from: 'jojo', to: 'rest', label: 'a rest is placed here' },
  { from: 'rest', to: 'detour', label: 'silence is given room' },
  { from: 'detour', to: 'lyly', label: 'the clock looks away' },
  { from: 'lyly', to: 'fork', label: 'the line is plucked' },
  { from: 'fork', to: 'hush', label: 'keep it between us' },
  { from: 'fork', to: 'swing', label: 'take the scenic rhythm' },
  { from: 'fork', to: 'roar', label: 'wake the respectable guests' },
  { from: 'hush', to: 'sync', label: 'a whisper finds its company' },
  { from: 'swing', to: 'sync', label: 'the rhythm comes around' },
  { from: 'roar', to: 'sync', label: 'the chandelier survives' },
  { from: 'sync', to: 'yoyo', label: 'YOYO has been watching' },
  { from: 'yoyo', to: 'bite', label: 'the shortcut fails inspection' },
  { from: 'bite', to: 'sax', label: 'meet the accomplices' },
  { from: 'sax', to: 'bass', label: 'a breath finds its pulse' },
  { from: 'bass', to: 'rabbit', label: 'the pulse grows teeth' },
  { from: 'rabbit', to: 'encore', label: 'the house opens its curtains' },
  { from: 'encore', to: 'bow', label: 'eventually means eventually' },
  { from: 'bow', to: 'side-b', label: 'the night asks for the other side' },
];

const before = ['checkin', 'premature', 'jojo', 'rest', 'detour', 'lyly', 'fork'];
const after = ['sync', 'yoyo', 'bite', 'sax', 'bass', 'rabbit', 'encore', 'bow', 'side-b'];
export const ROUTES = Object.fromEntries(['hush', 'swing', 'roar'].map(id => [id, [...before, id, ...after]]));
export const DEFAULT_ROUTE = 'swing';
export default DEFAULT_ROUTE;
