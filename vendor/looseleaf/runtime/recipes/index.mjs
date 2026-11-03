// MIT: Looseleaf contributors. Generated from the unmodified upstream TypeScript.
import { Ink } from '../builder.mjs';
export const INK_LAYER_ORDER = [
    'rest',
    'disabled',
    'invalid',
    'checked',
    'indeterminate',
    'open',
    'busy',
    'hover',
    'pressed',
    'focus'
];
export function orderLayers(names) {
    const rank = (k)=>{
        const i = INK_LAYER_ORDER.indexOf(k);
        return i < 0 ? INK_LAYER_ORDER.length : i;
    };
    return [
        ...names
    ].sort((a, b)=>rank(a) - rank(b));
}
const ID_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const registry = new Map();
export function defineRecipe(def) {
    if (!ID_RE.test(def.id)) throw new Error(`ink recipe id "${def.id}" must be kebab-case (letters, digits, hyphens)`);
    const lazy = def.lazy ?? [];
    for (const l of lazy)if (!def.layers.includes(l)) throw new Error(`ink recipe "${def.id}": lazy layer "${l}" is not in layers`);
    const recipe = {
        ...def,
        lazy,
        kind: def.kind ?? def.id,
        isInkRecipe: true,
        rev: (registry.get(def.id)?.rev ?? 0) + 1
    };
    registry.set(def.id, recipe);
    return recipe;
}
export function getRecipe(id) {
    return registry.get(id);
}
export function allRecipes() {
    return [
        ...registry.values()
    ];
}
export const DEFAULT_KNOBS = {
    wobble: 1,
    misreg: 1,
    bleed: 1,
    width: 1
};
export function resolveKnobs(themeKnobs, density) {
    if (density === 'calm') return {
        ...DEFAULT_KNOBS,
        bleed: themeKnobs.bleed
    };
    if (density === 'compact') return {
        ...themeKnobs,
        misreg: themeKnobs.misreg * 0.85,
        width: themeKnobs.width * 0.94
    };
    return themeKnobs;
}
export const runCounter = {
    runs: 0
};
export function runRecipe(recipe, req) {
    const { box, params } = req;
    const calm = req.density === 'calm';
    const tier = calm ? 'lo' : req.tier;
    const wanted = new Set(req.lazy ?? []);
    const inkOpts = {
        tier,
        calm,
        knobs: req.knobs
    };
    const seed = `${req.seed}|${recipe.id}`;
    const lazyOnly = req.lazyOnly === true;
    const ctxBase = {
        tier,
        density: req.density,
        calm,
        knobs: req.knobs,
        dir: req.dir,
        seed,
        lazyOnly
    };
    const lazyParts = {};
    const pad0 = req.pad ?? (typeof recipe.pad === 'number' ? recipe.pad : undefined);
    const ctx = {
        ...ctxBase,
        wants: (layer)=>wanted.has(layer),
        lazy (layer, fn) {
            if (!wanted.has(layer)) return;
            const li = new Ink(`${seed}|${layer}`, inkOpts);
            li.layer(layer, ()=>fn(li));
            lazyParts[layer] = li.toSvg({
                w: box.w,
                h: box.h,
                pad: pad0 ?? 12
            }).parts[layer] ?? '';
        }
    };
    const ink = new Ink(seed, inkOpts);
    runCounter.runs++;
    recipe.draw(ink, box, params, ctx);
    const pad = req.pad ?? (typeof recipe.pad === 'number' ? recipe.pad : recipe.pad(box, params, ctx));
    const parts = {};
    if (!lazyOnly) {
        const res = ink.toSvg({
            w: box.w,
            h: box.h,
            pad
        });
        for (const k of res.layers){
            const markup = res.parts[k];
            if (markup) parts[k] = markup;
        }
    }
    const lazyLayers = [];
    for (const k of Object.keys(lazyParts)){
        if (lazyParts[k]) {
            parts[k] = lazyParts[k];
            lazyLayers.push(k);
        }
    }
    return {
        parts,
        layers: orderLayers(Object.keys(parts)),
        lazyLayers: orderLayers(lazyLayers),
        pad,
        w: box.w,
        h: box.h
    };
}
let warnedFn = false;
export function stableStringify(v) {
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '"NaN"';
    if (v === undefined) return 'null';
    if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
    if (typeof v === 'object') {
        const o = v;
        const keys = Object.keys(o).filter((k)=>o[k] !== undefined).sort();
        return `{${keys.map((k)=>`${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
    }
    if (!warnedFn) {
        warnedFn = true;
        console.error('ink: recipe params must be plain JSON (found a function or symbol); it cannot be part of the memo key');
    }
    return '"[unhashable]"';
}
export function knobsKey(k) {
    const f = (x)=>String(Math.round(x * 100) / 100);
    return `${f(k.wobble)},${f(k.misreg)},${f(k.bleed)},${f(k.width)}`;
}
export function bucketBox(w, h, q = [
    4,
    2
]) {
    return {
        w: Math.max(q[0], Math.round(w / q[0]) * q[0]),
        h: Math.max(q[1], Math.round(h / q[1]) * q[1])
    };
}
