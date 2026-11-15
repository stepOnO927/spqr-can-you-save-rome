# Cloud test results

All game execution, package building and browser interaction in this audit ran on GitHub Actions hosted runners. No game or test was run on the user's computer. Each link identifies a reproducible workflow run, and failures are retained as evidence rather than hidden.

| Gate | Cloud evidence | Result and scope |
|---|---|---|
| Fast unit and integration suite | [Run 43667759422](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759422) | PASS, 892/892 tests. Controlled negative fixture reported an invalid army size, then passed after restoration; player save unchanged. Inventory: 622 files, 123 reachable runtime sources, zero missing local references. |
| Latest Poki package | [Run 43667759424](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759424) | PASS: three-entry touch and SDK load/start order, Roman stop/break/resume, zero unauthorized requests. 330 files / 4,895,228 B. |
| Storage denied in all three entries | [Browser run 43663154916](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43663154916) | The storage and Inspector steps passed before a legacy onboarding test failed. The subsequent full [browser run 43666565048](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43666565048) passed, before the new mainline storage guard was integrated. The latest run is pending. |
| Developer Inspector | [Browser run 43663154916](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43663154916) | Ten independently selectable checks completed on isolated fixtures, with no changes to a sentinel player save. Core, data, Han and save checks PASS; broader domains honestly PARTIAL. |
| 36-month simulation | [Inspector browser](../tools/inspector-smoke.mjs) and [extended workflow](../.github/workflows/spqr-quality.yml) | Inspector executes Roman and Han 36-month fixtures. Extended scheduled/manual runs are not claimed as green without their run logs. |
| Full browser regression | [Run 43666565048](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43666565048) | PASS on the pre-guard merge: all named browser flows, both 36-month scripts, screenshot and map benchmark. The new mainline guard created an additional assertion; [run 43667759362](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759362) failed on English save wording, which is fixed. [Latest run 43668184397](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668184397) is pending. |
| 640×360, 836×470, 1031×580 | [Touch script](../tools/poki-mobile-smoke.mjs) | All three Roman frame sizes passed in [the package run](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759424). The full source mobile suite passed before the newer guard merge; latest regression is pending. |
| Save/load | [Unit suite](../test/safe-storage.test.js), [storage browser smoke](../tools/storage-fallback-smoke.mjs) | Existing saves remain readable through the safe adapter; denied-storage sessions can start, advance and save to memory. Cross-visit persistence is impossible when the browser denies storage. |
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
| Long AI simulation | [Imperium simulation](../scripts/imperium-sim.mjs) uses four seeds, two openings and 36 months; [multipolar simulation](../scripts/multipolar-sim.mjs) uses multiple countries/seeds | Browser suite must finish successfully; no claim of complete strategic fairness from continuity alone |

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
