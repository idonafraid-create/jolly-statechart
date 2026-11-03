// MIT: Looseleaf contributors. Generated from the unmodified upstream TypeScript.
export const PAINT_KEYS = [
    'ink',
    'ink-soft',
    'ink-you',
    'pencil',
    'pencil-mark',
    'red',
    'green',
    'marker',
    'hi',
    'focus',
    'paper',
    'paper-shade',
    'slip',
    'card',
    'graph',
    'kraft',
    'check',
    'photo',
    'desk',
    'desk-deep',
    'rule-blue',
    'rule-red',
    'pad',
    'pad-rule',
    'check-rule',
    'ink-muted',
    'pencil-text',
    'orange-text',
    'hi-deep',
    'tape',
    'tape-edge',
    'tomato',
    'tangerine',
    'lemon',
    'grass',
    'teal',
    'sky',
    'grape',
    'bubblegum',
    'sticky-yellow',
    'sticky-green',
    'sticky-orange',
    'sticky-pink',
    'sticky-blue',
    'current'
];
const KNOWN = new Set(PAINT_KEYS);
export const BLEND = 'var(--ll-blend)';
export function paint(key) {
    if (key === 'current') return 'currentColor';
    if (!KNOWN.has(key)) throw new Error(`ink: unknown paint key "${key}"`);
    return `var(--ll-${key})`;
}
export function fmtUnits(k, q) {
    if (k === 0) return '0';
    const neg = k < 0;
    const a = neg ? -k : k;
    const whole = Math.floor(a / q);
    const frac = a - whole * q;
    let s = whole === 0 ? '' : String(whole);
    if (frac !== 0) {
        const digits = q === 10 ? 1 : 2;
        const f = String(frac * (10 ** digits / q)).padStart(digits, '0').replace(/0+$/, '');
        s += '.' + f;
    }
    return neg ? '-' + s : s;
}
export function n(v, q = 20) {
    return Number.isFinite(v) ? fmtUnits(Math.round(v * q), q) : '0';
}
export function esc(s) {
    return s.replace(/[&<>"']/g, (c)=>c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;');
}
