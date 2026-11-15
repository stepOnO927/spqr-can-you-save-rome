# SPQR — Operation Full Audit

Audit date: 2026-11-15 UTC. Scope: Roman campaign, terrain atlas, Han campaign, developer diagnostics, and the dedicated Poki package. All execution and browser testing took place in GitHub Actions cloud runners; the user's computer was not used to run the game.

## Executive assessment

The game has three working entry points and a large, connected simulation. The latest cloud fast suite passed **892/892** tests ([run 43667759422](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759422)). The latest dedicated Poki package passed real touch interactions in all three entry points and the required Roman frame sizes with **zero unapproved runtime external requests** ([run 43667759424](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759424)). These results establish tested behavior only; they do not certify every campaign feature.

The audit found and repaired blocked-storage startup failures, short landscape controls, Han territory taps intercepted by decorative SVG layers, a floating save-transfer control obscuring Advance, inconsistent module cache versions, and a stale terrain-map campaign date. Mainline's early storage guard was integrated with the session-only save adapter; prohibited browser storage now remains playable without claiming that a volatile save will survive reload. See [BUG_REPORT.md](BUG_REPORT.md). The Inspector now runs read-only state checks and isolated diagnostics. The pre-guard full [browser regression](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43666565048) passed; the merged guard has a new [browser regression](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668184397) still pending.

## Source and architecture inventory

The merged branch inventory recorded **622 files, 10,915,008 bytes, 123 runtime source files**. It includes these ten report files and the latest main-branch additions. It identified three public entry points and generated a file-by-file dependency graph in the fast workflow artifact. The inventory was refined to include the developer Inspector and Poki-only roots and to avoid treating build-script string literals as imports. Static reachability is a candidate signal, never proof that a feature is dead.

- [Inventory generator](../scripts/audit-inventory.mjs)
- [Feature registry](../feature-registry.js)
- [Architecture report](ARCHITECTURE_REPORT.md)

## Tested scope and limits

| Area | Evidence | Assessment |
|---|---|---|
| Core simulation and invariants | 892/892 baseline fast tests | Passed tested assertions |
| Touch at 640×360 and 836×470 | Roman, Han and atlas interactions in cloud Chromium | Passed targeted interactions |
| Storage denied | Cloud browser flow across all three entries | Latest full regression status in [TEST_RESULTS.md](TEST_RESULTS.md) |
| Poki SDK and offline assets | Three-entry package smoke with SDK event assertions | Passed mock-SDK and network checks; real platform Inspector pending |
| 36-month Roman and Han simulations | Inspector browser diagnostic | Latest result in [TEST_RESULTS.md](TEST_RESULTS.md) |
| Full feature completeness | 20-feature manifest and targeted suites | Partial; no blanket certification |

## Verdict

**The repository passes its fast and Poki package gates; the full browser regression remains the final code gate.** A green package test is not a Poki submission approval. The real Poki Inspector run, platform review, and store assets remain external release steps. The detailed technical and policy gate is in [POKI_READINESS.md](POKI_READINESS.md) and [RELEASE_BLOCKERS.md](RELEASE_BLOCKERS.md).

## Coverage accounting

| Measure | Count / status | Basis |
|---|---:|---|
| Tracked files classified | 622 | [Generated inventory](../scripts/audit-inventory.mjs), [fast run 43667759422](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759422) |
| Runtime source files identified / statically reachable | 123 / 123 | Same inventory; static reachability is not runtime proof |
| Runtime source texts inspected for stubs and unsafe dynamic execution | 114 initial files | Original source scan; later additions reviewed when authored |
| Major feature groups | 20 | [Registry](../feature-registry.js) |
| Groups certified PASS end to end | 0 | Strict UI → state → consequence → save/load standard |
| PARTIAL / NOT TESTED groups | 11 / 9 | [Feature matrix](FEATURE_MATRIX.md) |
| Confirmed product defects / test-harness defects | 10 / 3 | [Bug report](BUG_REPORT.md) |
| Confirmed module identity duplication / redundant implementations deleted | 1 / 0 | [Duplication report](DUPLICATION_REPORT.md) |
| Confirmed code-only or UI-only feature claims | 0 / 0 | No such finding established by the available action traces |
| Unit tests in latest fast run | 892 pass, 0 fail | [Run 43667759422](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759422) |
| Poki package test | 3 entries, 0 unauthorized external requests | [Run 43667759424](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759424) |
| Remaining external submission gates | 5 | Official Inspector, store art, privacy/link review, device play, final platform review |
| Tests unavailable to this audit | Official Poki Inspector, physical devices, human strategy review | [Release blockers](RELEASE_BLOCKERS.md) |

The classification is broad for all tracked files; it is **not** a line-by-line semantic audit of every asset or script. The feature matrix explicitly discloses unverified gameplay chains. Real user onboarding and strategic enjoyment require human observation, so neither is certified by a green build.

## Direct answers to release questions

- **Launch, campaign, save:** Roman, Han and atlas launch in cloud Chromium. New campaigns advance; old browser saves remain readable through the storage adapter. A browser that denies storage can play within the current session.
- **AI and strategic meaning:** The Inspector advances isolated Roman and Han fixtures for 36 months without fatal state errors. This checks simulation continuity, not AI fairness, fun, or a full victory arc.
- **Mobile:** Real touch works in tested game frames. Physical devices and all menu branches are still unverified.
- **Code-only, UI-only, placeholder and unused modules:** None confirmed. A conservative static graph found no unreached runtime candidates after adding the developer and package roots. This is not proof that every feature is complete.
- **Architecture:** One versioned-module identity defect was fixed; large controller files and overlapping CSS remain maintainability risks. No broad rewrite was made.
- **Poki verdict:** **CLOSE TO READY** pending the complete browser gate and official Poki Inspector, store assets and owner-controlled policy review. This is a technical assessment of the inspected branch, not a prediction of acceptance.

## Security and save integrity limits

The original 114-source text scan found no `eval(`, `new Function(` or `document.write(`. Roman, Han and atlas parse saves through their existing validators and the new diagnostics add read-only reference checks; a corrupt-save browser script is in the full regression. This is **not** a complete taint audit of generated letters, `innerHTML` templates or every uploaded save field. No injection flaw is reported as confirmed without a reproducible payload. The remaining review is listed in [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md).

The source tree has historical map and portrait attribution files but no repository license file. The audit does not infer ownership or grant submission rights from those facts; owner review of third-party assets and policy text remains a submission condition.

## The audit's twenty release questions

| # | Answer |
|---:|---|
| 1. Launch? | Yes in cloud Chromium for Roman, atlas and Han. |
| 2. New-player clarity? | Short start path and guide are reachable; full first-session comprehension is not established. |
| 3. Enjoyable and strategic? | Not objectively certified by automation; human play review remains. |
| 4. Advertised features working? | Targeted starts, movement/recruitment, map selection, save fallback, some mail/government/Han flows have evidence; see [matrix](FEATURE_MATRIX.md). |
| 5. Code-only features? | None confirmed; nine feature groups lack a complete action trace. |
| 6. UI-only shells? | None confirmed from inspected paths; do not infer absence elsewhere. |
| 7. Major unfinished mechanics? | Full election, trade delivery, endgame and other complete chains remain unverified, not declared broken. |
| 8. Placeholder logic? | No implementation stub confirmed in the 114-source scan; offline map simplification is explicit. |
| 9. Duplicates? | Versioned shared-module identity mismatch fixed; CSS responsive overlap remains. |
| 10. Poor organization? | Large Roman and atlas presentation controllers increase maintenance risk. |
| 11. Unused files? | No runtime source was proven unused; graph has zero unreached candidates. |
| 12. Major bugs remaining? | No known P0/P1 source failure after the described repairs; full browser and platform checks remain gates. |
| 13. Complete campaign? | A 36-month simulation advances; a complete browser victory/defeat arc is not verified. |
| 14. Save and resume? | Targeted Roman/Han/atlas save flows work; every legacy schema is not tested. |
| 15. AI independent? | Existing multi-country scripted simulations record autonomous activity; fairness is not fully proven. |
| 16. Mobile/tablet? | Real taps and frame bounds pass at three target dimensions in cloud Chromium; physical devices untested. |
| 17. Poki technical suitability? | Dedicated artifact passes mock SDK/network/touch gate; official Inspector unknown. |
| 18. Submission blockers? | Official Inspector, store art, legal/privacy/link review and device/human play checks. |
| 19. First fix? | Finish any failing full browser gate, then official platform validation. |
| 20. Shortest release-candidate path? | Green same-head CI → inspect validated ZIP on Poki → finish store/policy assets → human device play → submit for review. |
