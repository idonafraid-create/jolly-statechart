// MIT: Looseleaf contributors. Generated from the unmodified upstream TypeScript.
import { Ink } from './builder.mjs';
import { flatFill } from './fills.mjs';
import { PathWriter, TIERS, smoothClosed } from './geom.mjs';
import { noise1 } from './noise.mjs';
import { n } from './paint.mjs';
import { pen as penSpec } from './pens.mjs';
import { clamp, hashSeed } from './rng.mjs';
import { parsePath, polygonsOf, kindOfDef } from './art/dsl.mjs';
import { capHeight, textPath } from './art/glyph-text.mjs';
import { isGen } from './art/types.mjs';
import { badgeSkeleton } from './art/badge-gen.mjs';
import { stamp } from './art/rubber-stamp.mjs';
export { badgeSkeleton };
export { stamp };
export { measureText, textPath } from './art/glyph-text.mjs';
export function variantFor(kind, size) {
    switch(kind){
        case 'icon':
            return size <= 13 ? 'micro' : size <= 19 ? 'small' : size <= 40 ? 'master' : 'hi';
        case 'doodle':
            return size < 72 ? 'small' : size < 120 ? 'master' : 'hi';
        case 'sticker':
            return size < 80 ? 'small' : size < 120 ? 'master' : 'hi';
        case 'mascot':
            return size < 40 ? 'micro' : size < 72 ? 'small' : size < 140 ? 'master' : 'hi';
        default:
            return 'master';
    }
}
export function partsFor(def, variant) {
    if (variant === 'micro') return def.micro ?? def.small ?? def.parts;
    if (variant === 'small') return def.small ?? def.parts;
    if (variant === 'hi' && def.hi) return [
        ...def.parts,
        ...def.hi
    ];
    return def.parts;
}
const NIB = {
    icon: {
        k: 0.068,
        min: 1.45,
        max: 3.4
    },
    doodle: {
        k: 0.05,
        min: 1.7,
        max: 5.2
    },
    sticker: {
        k: 0.055,
        min: 1.8,
        max: 5.2
    },
    mascot: {
        k: 0.05,
        min: 1.6,
        max: 5
    },
    prop: {
        k: 0.05,
        min: 1.6,
        max: 5
    },
    scene: {
        k: 0.04,
        min: 1.4,
        max: 4
    }
};
function wander(pts, rng, k, amp) {
    let L = 20;
    for(let i = 1; i < pts.length; i++)L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * k;
    const nx = noise1(rng.fork('x'), L, 7 * k), ny = noise1(rng.fork('y'), L, 7 * k);
    const ox = rng.gauss(0, amp * 0.6), oy = rng.gauss(0, amp * 0.6);
    let s = 0;
    return pts.map(([x, y], i)=>{
        if (i) s += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]) * k;
        return [
            x * k + ox + nx(s) * amp,
            y * k + oy + ny(s) * amp
        ];
    });
}
function roundCorners(pts, anchor, r) {
    if (pts.length < 3 || r < 0.2) return pts;
    const out = [
        pts[0]
    ];
    for(let i = 1; i < pts.length - 1; i++){
        const a = pts[i - 1], b = pts[i], c = pts[i + 1];
        if (!anchor[i]) {
            out.push(b);
            continue;
        }
        const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
        if (l1 < r * 1.6 || l2 < r * 1.6) {
            out.push(b);
            continue;
        }
        const cos = ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])) / (l1 * l2);
        if (cos > 0.85) {
            out.push(b);
            continue;
        }
        const rr = Math.min(r, l1 * 0.4, l2 * 0.4);
        const p1 = [
            b[0] + (a[0] - b[0]) / l1 * rr,
            b[1] + (a[1] - b[1]) / l1 * rr
        ];
        const p2 = [
            b[0] + (c[0] - b[0]) / l2 * rr,
            b[1] + (c[1] - b[1]) / l2 * rr
        ];
        for(let t = 0; t <= 4; t++){
            const u = t / 4, v = 1 - u;
            out.push([
                v * v * p1[0] + 2 * u * v * b[0] + u * u * p2[0],
                v * v * p1[1] + 2 * u * v * b[1] + u * u * p2[1]
            ]);
        }
    }
    out.push(pts[pts.length - 1]);
    return out;
}
const openPath = (pts)=>{
    const w = new PathWriter(10);
    pts.forEach((p, i)=>i ? w.L(p[0], p[1]) : w.M(p[0], p[1]));
    return w.d;
};
const WASH_ALPHA = 0.42;
const DARK = new Set([
    'ink',
    'ink-soft',
    'ink-you',
    'pencil',
    'red',
    'green',
    'focus'
]);
export function paintSkeleton(ink, def, size, o = {}, origin = [
    0,
    0
]) {
    const kind = o.kind ?? kindOfDef(def);
    const variant = o.variant ?? variantFor(kind, size);
    const parts = partsFor(def, variant);
    const [gw, gh] = def.grid === 24 || def.grid === 64 ? [
        def.grid,
        def.grid
    ] : def.grid;
    const k = size / Math.max(gw, gh);
    const tone = o.tone ?? (kind === 'icon' ? 'ui' : 'doodle');
    const nibSpec = NIB[kind];
    const nib = o.nib ?? clamp(size * (def.nibK ?? nibSpec.k), nibSpec.min, nibSpec.max);
    const inkKey = o.ink ?? (tone === 'ui' ? 'current' : 'ink');
    const accent = o.accent ?? def.accent ?? 'hi';
    const icon = kind === 'icon';
    const sticker = kind === 'sticker';
    const sPen = icon ? penSpec('ink.fine', {
        step: size <= 40 ? 0.7 : 1.2
    }) : penSpec('ink');
    const penW = sPen.W;
    const wob = 0.12;
    const amp = clamp(size * 0.002, 0.04, 0.22);
    const root = ink.rng.fork('skel');
    const sil = {
        fills: [],
        lines: [],
        pts: [],
        W: nib
    };
    const seenFills = new Set();
    let lastFill = '';
    const off = (ps)=>origin[0] || origin[1] ? ps.map(([x, y])=>[
                x + origin[0],
                y + origin[1]
            ]) : ps;
    const tc = Math.cos((def.tilt ?? 0) * Math.PI / 180), ts = Math.sin((def.tilt ?? 0) * Math.PI / 180);
    const turn = def.tilt ? (ps)=>ps.map(([x, y])=>[
                gw / 2 + (x - gw / 2) * tc - (y - gh) * ts,
                gh + (x - gw / 2) * ts + (y - gh) * tc
            ]) : (ps)=>ps;
    const fillAlpha = sticker ? 1 : icon ? 0.9 : 0.95;
    const fillMaterial = sticker ? 'wash' : 'marker';
    const cornerR = nib * 0.55;
    parts.forEach((p, i)=>{
        const pr = root.fork('p' + i);
        const tag = p[0];
        if (tag === 'f') {
            const colour = p[1];
            const isSil = colour === 'sil';
            if (colour === 'acc' && tone === 'ui') return;
            polygonsOf(p[2], {
                rnd: pr
            }).forEach((poly, pi)=>{
                const px = off(wander(turn(poly), pr.fork('w' + pi), k, amp));
                sil.fills.push(smoothPath(px));
                for(let q = 0; q < px.length; q += 2)sil.pts.push(px[q]);
                if (isSil) return;
                const wash_ = colour === 'acc' || colour.endsWith('~');
                const key = colour === 'acc' ? accent : wash_ ? colour.slice(0, -1) : colour;
                if (wash_) {
                    flatFill(ink, px, key, WASH_ALPHA, 'marker');
                } else {
                    const run = ()=>flatFill(ink, px, key, fillAlpha, sticker ? 'wash' : DARK.has(key) ? 'text' : fillMaterial);
                    if (sticker && seenFills.has(key) && lastFill !== key) ink.group({}, run, 'wash');
                    else run();
                    seenFills.add(key);
                    lastFill = key;
                }
            });
        } else if (tag === 's' || tag === 'c') {
            const path = tag === 's' ? p[1] : p[2];
            const wm = (tag === 's' ? p[2] : p[3]) ?? 1;
            const hand = (tag === 's' ? p[3] : p[4]) ?? {};
            const colour = tag === 's' ? inkKey : p[1];
            const washStroke = colour.endsWith('~');
            const key = colour === 'acc' ? accent : washStroke ? colour.slice(0, -1) : colour;
            if (colour === 'acc' && tone === 'ui') return;
            parsePath(path, {
                step: Math.max(0.35, 0.9 / k),
                rnd: pr
            }).forEach((sub, j)=>{
                if (sub.pts.length < 2) return;
                const r = pr.fork('s' + j);
                const px = off(wander(turn(sub.pts), r.fork('w'), k, amp));
                if (tag === 's' || o.silAll) {
                    sil.lines.push(openPath(px));
                    for(let q = 0; q < px.length; q += 3)sil.pts.push(px[q]);
                }
                const pts = roundCorners(px, sub.anchor, cornerR);
                const brush = tag === 'c';
                const w = nib * wm * (brush ? 1.5 : 1) / penW;
                ink.stroke(pts, sPen, {
                    poly: true,
                    color: key,
                    width: w,
                    alpha: washStroke ? 0.5 : brush ? 0.95 : 1,
                    wobble: wob,
                    speed: 1,
                    dry: 0,
                    simple: o.crisp,
                    start: hand.start ?? 'soft',
                    end: hand.end ?? 'soft',
                    press: hand.taper ? (t)=>Math.max(0.3, 1 + hand.taper * (0.5 - t) * 1.5) : undefined
                });
            });
        } else if (tag === 'd') {
            const rr = Math.max((p[3] ?? 1.4) * k, nib * 0.62);
            const [tx, ty] = turn([
                [
                    p[1],
                    p[2]
                ]
            ])[0];
            const x = tx * k + origin[0], y = ty * k + origin[1];
            sil.lines.push(openPath([
                [
                    x,
                    y
                ],
                [
                    x + 0.01,
                    y
                ]
            ]));
            sil.pts.push([
                x,
                y
            ]);
            ink.dot(x, y, rr, sPen, {
                color: inkKey
            });
        } else if (tag === 't') {
            const [, text, x, y, em, colour, font] = p;
            const px = em * k;
            const key = colour ? colour === 'acc' ? accent : colour.endsWith('~') ? colour.slice(0, -1) : colour : inkKey;
            const t = textPath(text, x * k + origin[0], y * k + origin[1], px, pr.fork('t'), {
                font: font ?? 'hand',
                jitter: 0
            });
            ink.flat('text', t.d, key, 1, {
                bbox: t.bbox
            });
            const cap = capHeight(font ?? 'hand', px);
            sil.lines.push(openPath([
                [
                    t.bbox[0],
                    y * k + origin[1] - cap * 0.5
                ],
                [
                    t.bbox[2],
                    y * k + origin[1] - cap * 0.5
                ]
            ]));
            sil.pts.push([
                t.bbox[0],
                t.bbox[1]
            ], [
                t.bbox[2],
                t.bbox[3]
            ]);
        }
    });
    return {
        silhouette: sil,
        variant,
        kind,
        nib,
        k,
        w: gw * k,
        h: gh * k
    };
}
function smoothPath(px) {
    return smoothClosed(px, TIERS.lo);
}
export function drawSkeleton(def, size, seed, o = {}) {
    const kind = o.kind ?? kindOfDef(def);
    const tier = o.tier ?? (size >= 128 && (kind === 'doodle' || kind === 'mascot') ? 'hi' : 'lo');
    const ink = new Ink(`${seed}`, {
        tier,
        grain: o.grain,
        calm: o.calm,
        knobs: o.knobs
    });
    const r = paintSkeleton(ink, def, size, {
        ...o,
        kind
    });
    const res = ink.toSvg({
        w: r.w,
        h: r.h,
        pad: o.pad
    });
    return {
        ...res,
        variant: r.variant,
        kind,
        nib: r.nib,
        k: r.k,
        silhouette: r.silhouette
    };
}
export function dieCut(def, size, seed, o = {}) {
    const kind = o.kind ?? 'sticker';
    const border = o.border ?? clamp(size * 0.075, 3.5, 8);
    const off = Math.ceil(border + 2);
    const [gw, gh] = def.grid === 24 || def.grid === 64 ? [
        def.grid,
        def.grid
    ] : def.grid;
    const k = size / Math.max(gw, gh);
    const W = gw * k + 2 * off, H = gh * k + 2 * off;
    const tier = o.tier ?? (size >= 96 ? 'hi' : 'lo');
    const ink = new Ink(`die:${seed}`, {
        tier,
        grain: o.grain,
        calm: o.calm,
        knobs: o.knobs
    });
    const id = o.idPrefix ?? `ll-sil-${hashSeed(`${seed}:${size}:${def.parts.length}:${W}`).toString(36)}`;
    const art = paintSkeleton(ink, def, size, {
        silAll: true,
        ...o,
        kind,
        tone: o.tone ?? 'doodle',
        nib: o.nib ?? clamp(size * (def.nibK ?? 0.055), 1.8, 4.6)
    }, [
        off,
        off
    ]);
    const S = art.silhouette;
    const bw = 2 * border;
    const defs = `<defs><g id="${id}f">${S.fills.map((d)=>`<path d="${d}"/>`).join('')}</g><g id="${id}l">${S.lines.map((d)=>`<path d="${d}" fill="none"/>`).join('')}</g></defs>`;
    const layer = (fill, stroke, extra, op, dx = 0, dy = 0)=>{
        const t = dx || dy ? ` transform="translate(${n(dx)} ${n(dy)})"` : '';
        const opa = op < 1 ? ` opacity="${n(op, 100)}"` : '';
        return `<g${t}${opa}><use href="#${id}f" fill="${fill}" stroke="${stroke}" stroke-width="${n(bw + extra)}" stroke-linejoin="round"/>` + `<use href="#${id}l" stroke="${stroke}" stroke-width="${n(bw + extra + S.W)}" stroke-linejoin="round" stroke-linecap="round"/></g>`;
    };
    let under = defs;
    if (o.shadow) under += layer('var(--ll-ink)', 'var(--ll-ink)', 1, 0.1, 0.4, 3.4) + layer('var(--ll-ink)', 'var(--ll-ink)', 0.4, 0.2, 0.2, 1.1);
    under += layer('var(--ll-pencil-mark)', 'var(--ll-pencil-mark)', 1.3, 0.55);
    under += layer('var(--ll-photo)', 'var(--ll-photo)', 0, 1);
    ink.raw(under, 'under');
    ink.grow([
        0,
        0,
        W,
        H
    ]);
    let res = ink.toSvg({
        w: W,
        h: H,
        pad: o.pad ?? 2
    });
    if (o.peel) res = {
        ...res,
        svg: peelCorner(res.svg, S, id, off, border, W, H, o.peel === true ? clamp(size * 0.2, 12, 26) : o.peel, `${seed}`)
    };
    return {
        ...res,
        variant: art.variant,
        kind,
        nib: art.nib,
        k: art.k,
        silhouette: S,
        off,
        border
    };
}
function peelCorner(svg, S, id, _off, border, W, H, s, seed) {
    const R = Math.SQRT1_2;
    const d = (p)=>(p[0] + p[1]) * R;
    let dmax = -Infinity;
    let tip = [
        W,
        H
    ];
    for (const p of S.pts){
        if (d(p) > dmax) {
            dmax = d(p);
            tip = p;
        }
    }
    dmax += border + 1;
    const fold = dmax - s;
    const big = 4000;
    const at = (dd, tt)=>[
            (dd + tt) * R,
            (dd - tt) * R
        ];
    const half = (dd0, dd1)=>{
        const a = at(dd0, -big), b = at(dd0, big), c = at(dd1, big), e = at(dd1, -big);
        return `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}L${n(c[0])} ${n(c[1])}L${n(e[0])} ${n(e[1])}Z`;
    };
    const tag = hashSeed(`peel:${seed}`).toString(36);
    const keep = `${id}k${tag}`, cut = `${id}r${tag}`, grad = `${id}g${tag}`;
    const tt = (tip[0] - tip[1]) * R;
    const edge = at(fold, tt);
    const far = at(fold + s * 0.95, tt);
    const m = Math.SQRT2 * fold;
    const flap = `<g transform="matrix(0 -1 -1 0 ${n(m)} ${n(m)})"><g clip-path="url(#${cut})">` + `<use href="#${id}f" fill="url(#${grad})" stroke="url(#${grad})" stroke-width="${n(2 * border)}" stroke-linejoin="round"/>` + `<use href="#${id}l" stroke="url(#${grad})" stroke-width="${n(2 * border + S.W)}" stroke-linejoin="round" stroke-linecap="round"/></g></g>`;
    const crease = `<path d="M${n(at(fold, tt - s * 1.6)[0])} ${n(at(fold, tt - s * 1.6)[1])}L${n(at(fold, tt + s * 1.6)[0])} ${n(at(fold, tt + s * 1.6)[1])}" stroke="var(--ll-pencil-mark)" stroke-opacity=".35" stroke-width=".8" stroke-linecap="round"/>`;
    const defs = `<defs><clipPath id="${keep}"><path d="${half(-big, fold)}"/></clipPath><clipPath id="${cut}"><path d="${half(fold, big)}"/></clipPath>` + `<linearGradient id="${grad}" gradientUnits="userSpaceOnUse" x1="${n(edge[0])}" y1="${n(edge[1])}" x2="${n(far[0])}" y2="${n(far[1])}">` + `<stop offset="0" stop-color="var(--ll-pencil-mark)" stop-opacity=".55"/><stop offset=".3" stop-color="var(--ll-paper)"/><stop offset="1" stop-color="var(--ll-photo)"/></linearGradient></defs>`;
    return `${defs}<g clip-path="url(#${keep})">${svg}</g>${flap}${crease}`;
}
export function renderSticker(def, size, seed, o = {}) {
    if (isGen(def)) {
        if (def.gen === 'badge') return dieCut(badgeSkeleton(def.text, def), size, seed, o);
        return stamp(def.text, def.shape, {
            ...def,
            seed
        });
    }
    return dieCut(def, size, seed, o);
}
const CACHE = new Map();
export function memo(key, make, max = 400) {
    const hit = CACHE.get(key);
    if (hit !== undefined) {
        CACHE.delete(key);
        CACHE.set(key, hit);
        return hit;
    }
    const v = make();
    CACHE.set(key, v);
    if (CACHE.size > max) CACHE.delete(CACHE.keys().next().value);
    return v;
}
