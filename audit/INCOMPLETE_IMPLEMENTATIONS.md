# Incomplete implementations and unverified claims

This report separates **confirmed limitations** from **coverage gaps**. A test file or visible button is not proof of a complete loop. No “fake” feature is alleged without a reproducible action and state trace.

## Confirmed scope limits

| Area | Current behavior | Required follow-up |
|---|---|---|
| Poki offline atlas | The package replaces remote aerial imagery and elevation with a local coastline plus approximate historical overlays ([builder](../scripts/build-poki.mjs), [style](../map-lab/poki-style.js)). The package labels this view “Historical Map (Offline)”. | Decide whether an approved, locally licensed terrain dataset is worth the additional download. Do not call the offline coastline elevation relief. |
| Inspector feature status | The [dashboard](../inspector-ui.js) executes real selected checks but marks broad systems PARTIAL or NOT TESTED. Its government check covers basic state/tax and its military check covers recruitment/order persistence, not every office or battle branch. | Add action-chain fixtures for appointments, election transitions, battle/siege, delivered trade and endgame before promoting those features to PASS. |
| Poki platform validation | Mock SDK event order and blocked-network cloud checks pass. | Run the actual package in Poki Inspector and review its event log and devices. |
| Full localization review | Territory bilingual data and targeted Chinese browser screens are checked; every generated event and help string was not manually reviewed. | Add screen coverage for both languages and record specific missing strings rather than claiming completion. |
| Long-run balance | A 36-month diagnostic and existing simulations can detect crashes and invalid state. | Human review is still required for strategic balance, AI fairness and meaningful victory pace. |

## Features with no complete audit chain

Election campaigns, full government appointments, conspiracies, Han trade delivery, construction effects, espionage uncertainty, research unlock use, achievements and final victory/defeat all have code and/or tests in the repository. This audit has **not** demonstrated every required UI → controller → simulation → visible consequence → save/load sequence for them. Their status in [FEATURE_MATRIX.md](FEATURE_MATRIX.md) remains NOT TESTED or PARTIAL, not PASS.

## Searches performed

A scan of 114 original runtime source files for TODO/FIXME/stub/“not implemented” found no implementation stub. “placeholder” matches were search/input attributes and “todo” matches were local worklist variable names. A scan found no `eval(`, `new Function(` or `document.write(` in those files. These static searches are useful leads, not proof of correctness or security.
