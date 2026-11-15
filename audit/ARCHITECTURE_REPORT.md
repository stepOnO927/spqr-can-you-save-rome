# Architecture report

## Entry points and state ownership

| Entry | Controller | State | Distribution |
|---|---|---|---|
| Roman campaign [index.html](../index.html) | [app.js](../app.js) → [engine.js](../engine.js) | Roman campaign save slots, `spqr-save-1..3` | Public and Poki |
| Terrain atlas [map-lab/index.html](../map-lab/index.html) | [map-lab/lab.js](../map-lab/lab.js) → shared Roman engine | Same Roman simulation via [view-handoff.js](../view-handoff.js) | Public and Poki offline style |
| Han campaign [han/index.html](../han/index.html) | [han/play.js](../han/play.js) → [han/engine.js](../han/engine.js) | Independent Han save key and dynasty rules | Public and Poki |
| Development Inspector [inspector.html](../inspector.html) | [inspector-ui.js](../inspector-ui.js) | New isolated fixtures; no normal save writes | Development source only; excluded by Poki builder |

The dependency inventory traverses HTML, JavaScript and CSS references and emits a complete file-role list and import graph as a cloud artifact ([script](../scripts/audit-inventory.mjs)). Dynamic asset references remain an explicit limitation of static reachability. The Poki builder includes display-sized portraits to cover dynamic portrait lookup.

## Confirmed structural issues

1. **Versioned import duplication (fixed, P2).** The same module was imported with different `?v=` suffixes in Roman, atlas and new diagnostic code. The new [module-version regression test](../test/module-versions.test.js) failed on that branch state and passed after imports were aligned ([fast run](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43662622032)).
2. **Large presentation controllers (open maintainability risk, P2).** [app.js](../app.js) and [atlas lab.js](../map-lab/lab.js) combine rendering, event binding, route handoff and user messages in large files (roughly 90 KB and 130 KB). This increases conflict risk; a broad rewrite is not justified without feature-chain tests.
3. **Repeated responsive rules (partly repaired, P2).** [style.css](../style.css) contains multiple historical overrides of `.top`, `.shell` and `.map-toolbar`. The 640×360 regression came from an earlier `min-height` surviving later overrides. A focused short-frame rule and touch test now constrain it.
4. **Runtime versus distribution assets (addressed for Poki).** Repository portrait masters and public remote terrain providers are not part of the Poki package. The offline atlas intentionally displays a local coastline and approximate historical overlay; it does not claim the remote elevation imagery is bundled.

## Boundaries preserved

- No Roman/Han state model was rewritten.
- [safe-storage.js](../safe-storage.js) is a narrow boundary around browser storage; old native saves remain readable.
- [inspector-diagnostics.js](../inspector-diagnostics.js) reads state and reports paths; it does not migrate or repair a player's save.
- [poki-bridge.js](../poki-bridge.js) is loaded by the dedicated package, leaving public analytics and historical-source behavior separate.

No module is classified as wrongly placed solely because its filename or import position looks unusual. See [DUPLICATION_REPORT.md](DUPLICATION_REPORT.md) for confirmed and unresolved candidates.
