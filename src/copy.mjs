// Add a reviewed edition here; node ids and model actions never change with language.
export const EDITIONS = {
  en: {
    lang: 'en', titleFont: 'Special Elite', bodyFont: 'Courier Prime',
    // Matching data-copy hooks keep the cover and navigation out of the player logic.
    page: {
      coverTitle: 'DO NOT<br>FEED THE<br><span>ARROWS.</span>',
      coverNote: 'an orderly evening.<br>more or less.',
      coverDeck: 'One immaculate plan.<br>Three very questionable musicians.',
      start: 'LET IT UNFOLD', runtime: 'an after-hours irregularity ·<br>best enjoyed slowly',
      instruction: 'PLEASE FOLLOW THE ARROWS.', exception: 'unless the arrows follow you.', scroll: 'SCROLL TO THE INCIDENT',
      procedure: 'TONIGHT’S PROCEDURE', theatreEyebrow: 'THE SAME PROCEDURE, WITH FEELING',
      theatreTitle: 'The paper takes a bow.', theatreSub: 'Step back. It was a score all along.',
      theatreFoot: 'one arrow is still dancing. management is aware.',
      colophon: 'NO TALK. ALL BARK. ALL BITE.<br><span>A small performance about taking the long way.</span>',
      score: 'UNFOLD THE WHOLE SCORE', scoreTitle: 'A score for three.',
      scoreIntro: 'Every detour finds its way back. No musician left behind.',
    },
    ui: { ready: 'THE HOUSE IS NOT QUITE READY', soundOn: 'SOUND ON', soundOff: 'SOUND OFF', play: 'Play the performance', pause: 'Pause the performance', count: (step, total) => `${String(step).padStart(2, '0')} / ${total}` },
    compactNodes: { hush: ['A sharp', 'whisper'], swing: ['A little', 'swing'], roar: ['A little', 'riot'] },
    acts: [
      { roman: 'I', tag: 'THE HOUSE HAS A PLAN', title: 'An orderly evening.', sub: 'All the right steps. In almost the right order.', side: 'The ending was approved\nbefore anyone arrived.', caption: '01 / CHECK IN · LOOK PRESENTABLE · OBEY THE CLOCK', aside: 'nothing to see here. yet.', note: 'A perfectly ordinary evening. Management has already approved the ending.' },
      { roman: 'II', tag: 'JOJO / AN AMENDMENT IN SILENCE', title: 'Please allow for nothing.', sub: 'A pause is a perfectly legitimate form of progress.', side: 'No explanation\nwill be provided.', caption: '02 / NO TALK · A LITTLE BREATHING ROOM', aside: 'the clock can wait. she cannot.', note: 'JOJO places a rest in the procedure. The clock is asked to take the long way.' },
      { roman: 'III', tag: 'LYLY / THE PROCEDURE IS PLUCKED', title: 'The line learns to swing.', sub: 'One small pluck. Several unforeseen consequences.', side: 'Please secure\nyour respectable hat.', caption: '03 / ALL BARK · THREE WAYS TO MISBEHAVE', aside: 'again. for the very last time. again.', note: 'LYLY finds a bass string where a straight line used to be. Choose an improvisation.' },
      { roman: 'IV', tag: 'YOYO / QUALITY CONTROL', title: 'A small corrective bite.', sub: 'Some shortcuts are simply too delicious to leave alone.', side: 'Inspected by the\nsmallest member of staff.', caption: '04 / ALL BITE · THE END OF END', aside: 'spare string. do not ask where it came from.', note: 'YOYO eats the shortcut. END becomes ENCORE. All three get their proper bow.' },
    ],
    notes: {
      checkin: 'One immaculate plan. Three very questionable musicians.',
      premature: 'The ending has been filed in advance. JOJO has not been consulted.',
      jojo: 'JOJO declines to hurry. The paperwork will just have to breathe.',
      rest: 'Silence is not a missing event. It is this event.',
      detour: 'The clock has been politely sent the long way round.',
      lyly: 'LYLY plucks the procedure. It turns out to be in B-flat.',
      fork: 'Keep it quiet, let it swing, or wake the respectable guests?',
      hush: 'A whisper with sharp corners. Even the chandelier leans closer.',
      swing: 'Take the scenic rhythm. Mind the glass.',
      roar: 'A respectable little riot. Hats may leave heads.',
      sync: 'Three voices find each other. Entirely on purpose, allegedly.',
      yoyo: 'YOYO has been watching that shortcut all evening.',
      bite: 'The shortcut fails inspection. The inspector eats the evidence.',
      sax: 'The tenor keeps a little air in reserve. Work the keys, then let it breathe.',
      bass: 'Four strings pass a little trouble through the bridge and into the wood.',
      rabbit: 'The softest instrument has the sharpest ideas. Its ears are listening.',
      encore: 'The curtains open. Three accomplices finally share one stage.',
      bow: 'A proper bow. Eventually. One arrow is still dancing.',
      'side-b': 'Turn the night over. Side B is tomorrow.',
    },
  },
};
export const typography = {
  en: { display: 'Special Elite', text: 'Courier Prime', note: 'Courier Prime' },
  zh: { display: 'Huiwen Mincho', text: 'Zhuque Fangsong', note: 'Zhuque Fangsong', reviewed: false },
};
export const copy = EDITIONS.en;
