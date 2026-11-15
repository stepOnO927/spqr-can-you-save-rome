# Remediation and maintenance plan

This plan distinguishes completed repairs from additional evidence needed to raise coverage. It is not a promise that unverified systems are broken.

| Order | Work | Acceptance evidence | Status |
|---|---|---|---|
| 1 | Keep campaigns playable when browser storage is denied, preserve old saves and warn about session-only data | Roman, Han, atlas blocked-storage browser flow and adapter tests | Implemented; cloud gate in [TEST_RESULTS.md](TEST_RESULTS.md) |
| 2 | Fit touch controls within Poki mobile frames | Real tap and bounding-box checks at 640×360, 836×470, 1031×580 | Implemented; latest full gate pending |
| 3 | Package local dependencies, remove external map/analytics/font traffic, use honest offline map labels | Build artifact, zero unauthorized network calls, three entrypoints | Implemented; minified package gate passed [run 43663802643](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43663802643) |
| 4 | Send correct Poki lifecycle events and external-link handling | Mock SDK event-order test, then real Poki Inspector | Mock automated check implemented; platform check outstanding |
| 5 | Detect corrupt initial state without mutating player saves | Read-only Roman/Han invariant tests and controlled negative fixture | Implemented |
| 6 | Keep a complete source inventory and feature ownership register | Generated inventory JSON/Markdown and conservative 20-feature registry | Implemented |
| 7 | Expand Inspector checks where statuses remain PARTIAL or NOT TESTED | Isolated UI → state → visible result → save/load tests for appointments, elections, siege, diplomacy, trade, research, victory | Follow-up coverage; do not promote status without evidence |
| 8 | Review balance, localization and long-run strategy on real devices | Bilingual play logs, 36+ month simulations, human play review | Partially covered by automation; human review outstanding |
| 9 | Submit on Poki | Official Inspector log, store assets, privacy/link review | Owner/platform step |

The [bug report](BUG_REPORT.md) records the concrete failures repaired in this branch. The [feature matrix](FEATURE_MATRIX.md) avoids presenting code presence as completion. Broad refactoring of the Roman and atlas controllers should follow additional feature-chain coverage so existing campaign behavior remains intact.

## Complexity and dependencies

| Work | Estimated complexity | Depends on | Acceptance condition |
|---|---|---|---|
| Additional feature-chain tests for government, elections and succession | Medium | Stable scripted campaign fixtures | Player appointment/election action changes state, appears in UI and survives load |
| Military battle/siege and endgame walkthrough | Medium | Deterministic campaign setup | Move, battle/siege, win or defeat and final archive verified in browser |
| Trade, construction and research walkthroughs | Medium | Existing entrypoints and save fixtures | Costs and delayed effects match visible predictions and survive load |
| CSS consolidation | Medium | Green mobile and desktop visual baselines | No control escapes 640×360, 836×470, 1031×580 or desktop frames |
| Real Poki platform review | Low engineering; external scheduling | Green validated package and platform access | Inspector logs and actual devices show correct SDK, touch and network behavior |
| Save-file and generated-prose injection review | Medium | Stable corrupt-save fixtures | Every untrusted field inserted through text nodes or escaping, with browser payload tests |
| Store assets and legal/privacy review | Owner content task | Poki submission requirements | Platform accepts thumbnails and reviewed text/links |

No task in this table should be silently reclassified as completed because a module or menu exists. The branch repairs the confirmed release-critical defects; additional feature-chain tests raise confidence before broader claims about completeness.
