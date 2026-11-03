// MIT: Looseleaf contributors. Generated from the unmodified upstream TypeScript.
import { validateArt } from './dsl.mjs';
const isDev = ()=>{
    const env = import.meta.env;
    if (env && typeof env.DEV === 'boolean') return env.DEV;
    return typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production';
};
function check(kind, id, def) {
    if (!isDev()) return;
    const errors = validateArt(def, {
        id,
        kind
    }).filter((p)=>p.level === 'error');
    if (errors.length) throw new Error(`ink art: ${kind} "${id}": ${errors.map((e)=>`${e.at ? e.at + ' ' : ''}${e.msg}`).join('; ')}`);
}
function make(kind, map) {
    const out = {};
    for (const id of Object.keys(map)){
        const def = {
            ...map[id],
            kind
        };
        check(kind, id, def);
        out[id] = def;
    }
    return out;
}
export const defineIcons = (map)=>make('icon', map);
export const defineDoodles = (map)=>make('doodle', map);
export const defineMascot = (map)=>make('mascot', map);
export const defineProps = (map)=>make('prop', map);
export function defineStickers(map) {
    const out = {};
    for (const id of Object.keys(map)){
        const def = map[id];
        if ('gen' in def) out[id] = {
            ...def,
            kind: 'sticker'
        };
        else {
            const d = {
                ...def,
                kind: 'sticker'
            };
            check('sticker', id, d);
            out[id] = d;
        }
    }
    return out;
}
export const defineIcon = (def)=>make('icon', {
        def
    }).def;
export const defineDoodle = (def)=>make('doodle', {
        def
    }).def;
export const defineSticker = (def)=>defineStickers({
        def
    }).def;
export const isGen = (d)=>'gen' in d;
