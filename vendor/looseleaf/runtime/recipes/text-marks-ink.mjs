// MIT: Looseleaf contributors. Generated from the unmodified upstream TypeScript.
export const GUESS_RATIOS = {
    asc: 1.06,
    desc: 0.53,
    xh: 0.52,
    cap: 0.74,
    pdesc: 0.22
};
export function lineMetrics(h, fs, r = GUESS_RATIOS) {
    const total = r.asc + r.desc || 1;
    return {
        fs: Math.max(6, Math.round(fs)),
        ch: Math.round(h),
        base: Math.round(r.asc / total * h),
        xh: Math.max(2, Math.round(r.xh * fs)),
        cap: Math.max(3, Math.round(r.cap * fs)),
        desc: Math.max(1, Math.round(r.pdesc * fs))
    };
}
export const HIGHLIGHT_TONES = {
    yellow: {
        alpha: 1
    },
    pink: {
        color: 'bubblegum',
        alpha: 0.8
    },
    green: {
        color: 'grass',
        alpha: 0.7
    },
    blue: {
        color: 'sky',
        alpha: 0.75
    },
    orange: {
        color: 'tangerine',
        alpha: 0.75
    },
    lilac: {
        color: 'grape',
        alpha: 0.6
    },
    teal: {
        color: 'teal',
        alpha: 0.7
    }
};
const FELT = {
    ink: 'ink',
    blue: 'blue',
    red: 'redfelt',
    green: 'greenfelt',
    pencil: 'pencil',
    marker: 'terracotta',
    orange: 'orange'
};
const PENCIL = {
    red: 'red',
    green: 'green'
};
export function markPen(tone, weight, fs, o = {}) {
    const k = Math.min(1.7, Math.max(0.85, fs / 18));
    if (tone === 'marker') return {
        pen: 'terracotta',
        width: 0.3 * k,
        dry: 1
    };
    const base = o.pencil && PENCIL[tone] || FELT[tone];
    const w = weight === 'regular' && fs < 15 ? 'fine' : weight;
    return {
        pen: w === 'regular' ? base : `${base}.${w}`,
        width: k,
        dry: 1
    };
}
export const STRUCTURAL_DRY = 0.3;
export function highlighterPen(tone) {
    const t = HIGHLIGHT_TONES[tone] ?? HIGHLIGHT_TONES.yellow;
    return {
        pen: 'hi',
        opts: t.color ? {
            color: t.color,
            alpha: t.alpha
        } : {}
    };
}
export function overshoot(fs) {
    return Math.max(1.5, fs * 0.14);
}
