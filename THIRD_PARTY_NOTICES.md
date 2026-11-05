# Third-party notices

Looseleaf by Kevin T. Ngo is used under MIT. Its original pencil ribbons, arrow geometry, waxy pens, four-frame boil controls and ticket/paper recipes are compiled from the vendored TypeScript sources into browser ESM. `src/looseleaf.mjs` is a thin native Canvas/SVG adapter, without the React/Tailwind/Radix runtime. The full license, exact upstream revision and conversion instructions are retained in `vendor/looseleaf/LICENSE` and `vendor/looseleaf/JOLLY-INTEGRATION.md`.

The English interface uses Special Elite, distributed by Google Fonts under Apache License 2.0, and Courier Prime, copyright 2015 The Courier Prime Project Authors, under SIL OFL 1.1. Their unmodified font files and full licenses are retained in `assets/fonts/`. Three.js and Pele are MIT dependencies; their original licenses remain with the local packages. The statechart Skill is by Lauren Tan under MIT, with its complete license retained in the installed Skill directory.

The hand-drawn plate generator uses the original dry-media implementation and Kevin fonts from [statechart-art by Kevin T. Ngo](https://github.com/kevintngo/statechart-art), licensed under the MIT License, copyright (c) 2026 Kevin T. Ngo. The complete upstream license is retained at `vendor/statechart-art/LICENSE`.

Pinned upstream revision: `09c959c79e25767cc34a5beddf3df234b085636e`.

Included upstream files are `tools/` (the per-pixel dry-media kit, masks, plate helpers and Kevin Serif / Kevin Sans fonts) and `business/art/` (source reference examples). `scripts/build-art.cjs` directly calls the upstream classic plate, dry-media kit, cutout masks and paper-tooth lettering to produce the local illustrations; these are not pre-rendered upstream drawings.

Kevin Serif and Kevin Sans are upstream's simulated-pen interpretations of A. V. Hershey's public-domain 1967 letterforms, distributed under the repository's MIT license.

The native canvas encoder is [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) (MIT). Dependency licenses remain in the installed packages.

The optional Chinese display font is [Huiwen Mincho Improved](https://github.com/bosswnx/huiwenmincho-improved), fixed to release 20241203, distributed by its source repository under CC0 1.0. Its own font metadata declares Public Domain. The unchanged upstream WOFF2 and full CC0 text are retained in `assets/fonts/chinese/`.

The optional Chinese text font is [Zhuque Fangsong](https://github.com/TrionesType/zhuque), official technical-preview release v0.212, copyright Zhejiang JadeFoci Technology Co. LTD, under the SIL Open Font License 1.1. Its Latin and symbol glyphs use Alegreya by Juan Pablo del Peral / Huerta Tipográfica, also under OFL 1.1, as documented by the upstream project. The complete official TTF was converted to WOFF2 without glyph subsetting or outline changes. The full license and source records are retained in `assets/fonts/chinese/`. Neither Chinese font is loaded by the current English UI.

The short sounds in `assets/audio/` are cut from CC0 recordings on Freesound: 149268 (bell), 567145 (double bass), 8403 (guitar) and 254806 (saxophone). Slices, tuning and sources are recorded in `research/sound/SOURCES.md`.
