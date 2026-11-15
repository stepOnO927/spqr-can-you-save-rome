# Cloud test results

All game execution, package building and browser interaction in this audit ran on GitHub Actions hosted runners. No game or test was run on the user's computer. Each link identifies a reproducible workflow run, and failures are retained as evidence rather than hidden.

| Gate | Cloud evidence | Result and scope |
|---|---|---|
| Fast unit and integration suite | [Run 43668500427](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500427) | PASS, 892/892 tests. Controlled negative fixture reported an invalid army size, then passed after restoration; player save unchanged. Inventory: 626 files, 123 reachable runtime sources, zero missing local references. |
| Latest Poki package | [Run 43668500422](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500422) | PASS: three-entry touch and SDK load/start order, Roman stop/break/resume, zero unauthorized requests. 331 files / 4,905,430 B. |
| Storage denied in all three entries | [Merged-main run 43668500474](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500474) | PASS: Roman, atlas and Han remain playable, session-only saves are labeled, unsafe handoff is blocked, and local persistence survives reload when only session storage is denied. |
| Developer Inspector | [Merged-main browser run 43668500474](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500474) | PASS for selected checks: eleven independently selectable categories completed on isolated fixtures with no change to a sentinel save. Core, data, Han and save checks PASS; broad domains remain honestly PARTIAL. |
| 36-month simulation | [Merged-main browser run 43668500474](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500474) | PASS for the scripted Roman/Han Inspector fixtures and the multipolar/Imperium 36-month cloud simulations. This verifies continuity/invariants, not strategic fairness. |
| Full browser regression | [Merged-main run 43668500474](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500474) | PASS: all browser scripts, Roman and Senate commanders/march/battle/AI, both 36-month scripts, denied-storage and transfer controls, 1920×1080 screenshot and map benchmark. The report-only follow-up has the same runtime tree. |
| 640×360, 836×470, 1031×580 | [Touch script](../tools/poki-mobile-smoke.mjs), [package run](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500422), [source browser run](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500474) | PASS: Roman Advance stays in frame and receives real taps at all three sizes; Han territory and atlas markers are selectable at 640×360. |
| Save/load | [Unit suite](../test/safe-storage.test.js), [storage browser smoke](../tools/storage-fallback-smoke.mjs) | Existing saves remain readable through the safe adapter; denied-storage sessions can start, advance and save to memory. Cross-visit persistence is impossible when the browser denies storage. |
| Source terrain performance | [Run 43666565048](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43666565048), `map-benchmark.json` artifact | At 1920×1080 on Linux SwiftShader, full-relief pan averaged 7.99 animation callbacks/s and zoom 3.88; idle was 60.04. This measures callback cadence on software rendering, not actual display FPS or a physical device. The Poki package uses an offline flat map and needs separate device review. |
| Actual Poki platform | No platform run | NOT TESTED. Mock SDK and cloud network interception do not replace Poki Inspector. |

## Failure history used to repair the product

- [43661090801](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43661090801): Advance outside the 640×360 frame.
- [43661697678](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43661697678): Han river layer intercepted a touch.
- [43662488226](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43662488226): inconsistent module query versions.
- [43662621960](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43662621960): transfer shortcut intercepted Advance.
- [43663154916](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43663154916): legacy test assumed advanced setup was visible.
- [43667611524](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667611524): Inspector cached an older engine version after the mainline merge.
- [43667759362](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759362): storage-denied smoke asserted a fixed English save phrase; three view messages were aligned.

The [quality](../.github/workflows/spqr-quality.yml), [browser](../.github/workflows/browser-smoke.yml) and [package](../.github/workflows/poki-release.yml) workflows are the repeatable gates. “PASS” here applies only to the asserted behavior and the linked commit, not to every strategic possibility.

## Requested campaign walkthrough coverage

| Scenario | Observed evidence | Remaining unverified sequence |
|---|---|---|
| Caesar | [Roman hundred-days browser smoke](../tools/roman-hundred-days-smoke.mjs), [military actions in Inspector](../inspector-ui.js), save and blocked-storage tests | One continuous human-facing run from first battle through objective completion and archived endgame |
| Senate | [Onboarding browser smoke](../tools/onboarding-smoke.mjs) reported Senate guide, directions, save/load and atlas handoff in [run 43663570479](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43663570479) before that run later failed a stale assertion | Full legal election/appointment and multi-turn defeat/victory arc in one browser scenario |
| Han | [Han court browser smoke](../tools/han-court-smoke.mjs) reported appointment, save/load and bilingual interaction in the same run; Inspector tested a forged non-Liu ruler | Complete frontier trade delivery and succession across all claimant types |
| Diplomacy and social events | Mail, invitation and delegation browser scripts completed before the later stale assertion in that run | One continuous letter → meeting → consequence → save/load chain across all variants |
| Trade | Existing tests and scripts are listed in the source inventory | Buy → transport → delivery → inventory and in-transit reload was **NOT TESTED as a complete browser chain** in this audit |
| Endgame and achievements | Existing unit tests exist in the fast suite | Complete victory/defeat, final archive, continue play and reward replay resistance were **NOT TESTED as a complete browser chain** |
| Long AI simulation | [Imperium simulation](../scripts/imperium-sim.mjs) uses four seeds, two openings and 36 months; [multipolar simulation](../scripts/multipolar-sim.mjs) uses multiple countries/seeds | The merged-main browser suite passed; continuity alone does not prove strategic fairness |

These gaps are recorded in [FEATURE_MATRIX.md](FEATURE_MATRIX.md) and [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md); they are not silently counted as PASS.

## Reproducible cloud commands

| Command in GitHub Actions | What it checks |
|---|---|
| `git ls-files '*.js' '*.mjs' '*.cjs' \| xargs -r -n 1 node --check` | Syntax of tracked JavaScript |
| `node scripts/audit-inventory.mjs` | File roles, entrypoints, dependency graph and missing local references |
| `npm test` | 892 unit/integration assertions at the latest fast gate |
| `node scripts/inspector-regression.mjs` | Deliberate negative troop fixture is detected, restored and leaves the save untouched |
| `node tools/inspector-smoke.mjs` | Real browser selection, report export and non-destructive diagnostics |
| `node tools/poki-mobile-smoke.mjs` and `node tools/storage-fallback-smoke.mjs` | Touch frames and denied-storage gameplay in the live app |
| `node scripts/build-poki.mjs` then `node tools/poki-build-smoke.mjs` | Dedicated package, mock SDK event order, network block and three-entry touch |
| `node scripts/multipolar-sim.mjs` and `node scripts/imperium-sim.mjs` | Multi-country and long-run AI behavior in the browser workflow |

The full browser workflow also runs its remaining named `tools/*-smoke.mjs` scripts in order; its success or first failure is linked above. Actual Poki Inspector, physical devices, license adjudication and human enjoyment tests were not available in this environment.
