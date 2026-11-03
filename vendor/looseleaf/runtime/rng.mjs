// MIT: Looseleaf contributors. Generated from the unmodified upstream TypeScript.
const AVALANCHE = 0x9e3779b9;
function avalanche(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}
export function hashSeed(s) {
    if (typeof s === 'number') return (Number.isFinite(s) ? avalanche(s >>> 0) : 0) || AVALANCHE;
    let h = 0x811c9dc5;
    for(let i = 0; i < s.length; i++){
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return avalanche(h) || AVALANCHE;
}
function derive(base, name) {
    let h = (0x811c9dc5 ^ base) >>> 0;
    h = Math.imul(h, 0x01000193);
    for(let i = 0; i < name.length; i++){
        h ^= name.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return avalanche(h) || AVALANCHE;
}
function build(base) {
    let s = base;
    let spare = null;
    const next = ()=>{
        s = s + 0x6d2b79f5 >>> 0;
        let t = s;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const rng = next;
    rng.seed = base;
    rng.range = (a, b)=>a + (b - a) * next();
    rng.int = (a, b)=>a + Math.floor(next() * (b - a + 1));
    rng.chance = (p)=>next() < p;
    rng.sign = ()=>next() < 0.5 ? -1 : 1;
    rng.pick = (arr)=>arr[Math.floor(next() * arr.length)];
    rng.gauss = (mean = 0, sd = 1)=>{
        if (spare !== null) {
            const v = spare;
            spare = null;
            return mean + sd * v;
        }
        let u = 0;
        while(u === 0)u = next();
        const r = Math.sqrt(-2 * Math.log(u));
        const a = 2 * Math.PI * next();
        spare = r * Math.sin(a);
        return mean + sd * r * Math.cos(a);
    };
    rng.fork = (name)=>build(derive(base, String(name)));
    return rng;
}
export function makeRng(seed) {
    return build(hashSeed(seed));
}
export const clamp = (v, a, b)=>v < a ? a : v > b ? b : v;
export const lerp = (a, b, t)=>a + (b - a) * t;
export const smooth = (t)=>t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
