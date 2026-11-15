# Duplication and reachability report

## Verified findings

| Finding | Status | Evidence | Safe action |
|---|---|---|---|
| Shared ESM modules imported under different cache query strings | Fixed | [module-versions.test.js](../test/module-versions.test.js) failed before the fix; [fast run 43662622032](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43662622032) passed after alignment | Keep one query suffix for each shared module and run the test on every PR. |
| Responsive rules for top bar and map controls overlap across [style.css](../style.css) | Partially repaired | Measured 76px top bar in a 640×360 cloud browser despite a later 54px rule; [failure log](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43661090801) | Keep targeted viewport assertions. Consolidate only after visual checks across all sizes. |
| Source portrait masters included in repository but not needed at runtime | Excluded from package | [build-poki.mjs](../scripts/build-poki.mjs) and [build-pages.mjs](../scripts/build-pages.mjs) select display-sized portraits | Retain source assets in repository; omit them from release packages. |

## Candidate review, not deletions

The first three-entry static graph marked `rome60.js` as unreached. The Poki offline atlas now imports it through [poki-style.js](../map-lab/poki-style.js), so it was **not dead code**. The Inspector and Poki bridge were also invisible to a public-only graph; the inventory now includes their explicit development/build roots. This is why automatic deletion based only on an import graph would be unsafe.

The Roman schematic map, terrain atlas and Han map use different presentation controllers. They share some game state or supporting data, but this audit did not prove an unnecessary duplicate implementation. No source module was removed on suspicion alone.

A text scan of the original 114 runtime files found no actual TODO/FIXME implementation stubs; matches for “placeholder” were input attributes and matches for “todo” were local worklist variable names. This scan cannot prove feature completeness. See [INCOMPLETE_IMPLEMENTATIONS.md](INCOMPLETE_IMPLEMENTATIONS.md).
