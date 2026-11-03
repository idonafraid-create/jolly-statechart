// MIT: Looseleaf contributors. Generated from the unmodified upstream TypeScript.
import { GRAIN_TILES } from './textures.generated.mjs';
import { PAPER_TILES, PAPER_RELIEF, PAPER_SLIP, PAPER_FIBRE, PAPER_CLOUD, PAPER_LINEN, PAPER_KRAFT } from './textures-paper.generated.mjs';
export { GRAIN_TILES, PAPER_TILES };
export const GRAIN_KINDS = [
    'felt',
    'marker',
    'graphite',
    'waxy',
    'stamp'
];
export const GRAIN_VARIANTS = 6;
export function grainPhase(variant) {
    const v = (Math.trunc(variant) % GRAIN_VARIANTS + GRAIN_VARIANTS) % GRAIN_VARIANTS;
    const rots = [
        0,
        90,
        180,
        270,
        0,
        180
    ];
    return {
        x: v * 0.618034 % 1,
        y: (v * 0.381966 + 0.17) % 1,
        rot: rots[v]
    };
}
const idPrefix = (p)=>p ?? 'll';
const num = (v)=>String(Math.round(v * 100) / 100);
export function grainMaskId(kind, variant, prefix) {
    if (variant === undefined) return `${idPrefix(prefix)}-${kind}`;
    return `${idPrefix(prefix)}-${kind}-${(Math.trunc(variant) % GRAIN_VARIANTS + GRAIN_VARIANTS) % GRAIN_VARIANTS}`;
}
export const grainMaskUrl = (kind, variant, prefix)=>`url(#${grainMaskId(kind, variant, prefix)})`;
export const grainVariantFor = (seed)=>(Math.imul(seed | 0, 0x9e3779b1) >>> 7) % GRAIN_VARIANTS;
const DEFAULT_REGION = {
    x: -2048,
    y: -2048,
    width: 8192,
    height: 8192
};
export function svgMaskDefs(o = {}) {
    const kinds = o.kinds ?? GRAIN_KINDS;
    const p = idPrefix(o.prefix);
    const region = o.region ?? DEFAULT_REGION;
    const maskAttrs = region === 'bbox' ? 'x="-0.1" y="-0.1" width="1.2" height="1.2"' : `maskUnits="userSpaceOnUse" x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}"`;
    const fill = region === 'bbox' ? {
        x: -4000,
        y: -4000,
        width: 9000,
        height: 9000
    } : region;
    let s = '';
    for (const kind of kinds){
        const t = GRAIN_TILES[kind];
        s += `<image id="${p}-${kind}-img" width="${t.css}" height="${t.css}" href="${t.uri}"/>`;
        for(let v = 0; v < GRAIN_VARIANTS; v++){
            const ph = grainPhase(v);
            const tf = ` patternTransform="translate(${num(ph.x * t.css)} ${num(ph.y * t.css)})${ph.rot ? ` rotate(${ph.rot})` : ''}"`;
            s += `<pattern id="${p}-${kind}-pat-${v}" width="${t.css}" height="${t.css}" patternUnits="userSpaceOnUse"${tf}><use href="#${p}-${kind}-img"/></pattern>`;
        }
        const rect = (v)=>`<rect x="${fill.x}" y="${fill.y}" width="${fill.width}" height="${fill.height}" fill="url(#${p}-${kind}-pat-${v})"/>`;
        s += `<mask id="${p}-${kind}" ${maskAttrs}>${rect(0)}</mask>`;
        for(let v = 0; v < GRAIN_VARIANTS; v++)s += `<mask id="${p}-${kind}-${v}" ${maskAttrs}>${rect(v)}</mask>`;
    }
    return s;
}
export const PAPER_STOCKS = {
    paper: 'var(--ll-paper)',
    slip: 'var(--ll-slip)',
    card: 'var(--ll-card)',
    graph: 'var(--ll-graph)',
    check: 'var(--ll-check)',
    kraft: 'var(--ll-kraft)',
    yellow: 'var(--ll-sticky-yellow)',
    green: 'var(--ll-sticky-green)',
    orange: 'var(--ll-sticky-orange)',
    pink: 'var(--ll-sticky-pink)',
    blue: 'var(--ll-sticky-blue)'
};
function hash32(seed) {
    let h = 0x811c9dc5;
    const s = String(seed);
    for(let i = 0; i < s.length; i++){
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    return h >>> 0;
}
function offsetFor(seed, i, w, h) {
    if (seed === undefined) return '0 0';
    const a = hash32(`${seed}:${i}`);
    return `${-(a % Math.round(w))}px ${-((a >>> 11) % Math.round(h))}px`;
}
const url = (uri)=>`url(${uri})`;
const tileSize = (t)=>`${t.cssWidth}px ${t.cssHeight}px`;
export function paperBackground(stock = 'paper', o = {}) {
    const cold = (o.tooth ?? (stock === 'paper' ? 'cold' : 'fine')) === 'cold';
    const on = {
        relief: cold && stock !== 'kraft',
        slip: !cold && stock !== 'kraft',
        fibre: true,
        cloud: true,
        kraft: stock === 'kraft',
        ...o.layers
    };
    const order = [
        'fibre',
        'kraft',
        'relief',
        'slip',
        'cloud'
    ].filter((n)=>on[n]);
    const byName = {
        relief: PAPER_RELIEF,
        slip: PAPER_SLIP,
        fibre: PAPER_FIBRE,
        cloud: PAPER_CLOUD,
        kraft: PAPER_KRAFT
    };
    const tiles = order.map((n)=>byName[n]);
    const color = PAPER_STOCKS[stock] ?? stock;
    return {
        backgroundColor: color,
        backgroundImage: tiles.map((t)=>url(t.uri)).join(', '),
        backgroundSize: tiles.map(tileSize).join(', '),
        backgroundPosition: tiles.map((t, i)=>offsetFor(o.seed, i, t.cssWidth, t.cssHeight)).join(', '),
        backgroundRepeat: tiles.map(()=>'repeat').join(', ')
    };
}
export function deskBackground(o = {}) {
    const v = o.vignette ?? 0.05;
    const vig = `radial-gradient(ellipse 92% 82% at 50% 40%, rgb(var(--ll-shade) / 0) 52%, rgb(var(--ll-shade) / ${v}) 100%)`;
    const linen = PAPER_LINEN;
    return {
        backgroundColor: 'var(--ll-desk)',
        backgroundImage: [
            vig,
            url(linen.uri)
        ].join(', '),
        backgroundSize: [
            '100% 100%',
            tileSize(linen)
        ].join(', '),
        backgroundPosition: [
            '0 0',
            offsetFor(o.seed, 0, linen.cssWidth, linen.cssHeight)
        ].join(', '),
        backgroundRepeat: [
            'no-repeat',
            'repeat'
        ].join(', ')
    };
}
export function styleToCss(s) {
    return `background-color:${s.backgroundColor};background-image:${s.backgroundImage};background-size:${s.backgroundSize};background-position:${s.backgroundPosition};background-repeat:${s.backgroundRepeat}`;
}
export const paperCss = (stock, o)=>styleToCss(paperBackground(stock, o));
export const deskCss = (o)=>styleToCss(deskBackground(o));
export function textureCssVars(names = [
    'relief',
    'slip',
    'fibre',
    'cloud',
    'mottle',
    'linen',
    'kraft'
]) {
    return `:root{${names.map((n)=>`--ll-tex-${n}:${url(PAPER_TILES[n].uri)}`).join(';')}}`;
}
export const PATTERN_OFFSETS = [
    [
        0,
        0
    ],
    [
        67,
        113
    ],
    [
        131,
        29
    ],
    [
        23,
        171
    ]
];
export function svgPatternDefs(o = {}) {
    const names = o.tiles ?? [
        'relief',
        'slip',
        'fibre',
        'cloud',
        'mottle',
        'linen',
        'kraft'
    ];
    const p = idPrefix(o.prefix);
    let s = '';
    for (const name of names){
        const t = PAPER_TILES[name];
        s += `<image id="${p}-tex-${name}-img" width="${t.cssWidth}" height="${t.cssHeight}" href="${t.uri}"/>`;
        PATTERN_OFFSETS.forEach(([x, y], i)=>{
            const id = i === 0 ? `${p}-tex-${name}` : `${p}-tex-${name}-${i}`;
            const tf = i === 0 ? '' : ` patternTransform="translate(${x} ${y})"`;
            s += `<pattern id="${id}" width="${t.cssWidth}" height="${t.cssHeight}" patternUnits="userSpaceOnUse"${tf}><use href="#${p}-tex-${name}-img"/></pattern>`;
        });
    }
    return s;
}
export function inkDefsSvg(o = {}) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${svgMaskDefs(o)}${o.paper ? svgPatternDefs({
        prefix: o.prefix
    }) : ''}</defs></svg>`;
}
export function textureBytes() {
    const of = (uri, png)=>({
            png,
            base64: uri.length
        });
    const masks = Object.fromEntries(GRAIN_KINDS.map((k)=>[
            k,
            of(GRAIN_TILES[k].uri, GRAIN_TILES[k].bytes)
        ]));
    const paper = Object.fromEntries(Object.keys(PAPER_TILES).map((k)=>[
            k,
            of(PAPER_TILES[k].uri, PAPER_TILES[k].bytes)
        ]));
    const sum = (r)=>Object.values(r).reduce((a, b)=>({
                png: a.png + b.png,
                base64: a.base64 + b.base64
            }), {
            png: 0,
            base64: 0
        });
    return {
        masks,
        paper,
        totals: {
            masks: sum(masks),
            paper: sum(paper)
        }
    };
}
