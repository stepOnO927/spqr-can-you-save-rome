# IMPERIUM — 国家意志: implementation status

National Focus Trees, the Legion Designer and the Operational Battle Planner, built on the existing simulation. All three are available to human and AI factions. AI factions use them from their own state and intelligence only.

## Stage A — audit (what existed, what was reused)

| Requirement | Existing system reused | New work |
|---|---|---|
| Monthly progression | `tick()` | Focus progress, reorganization and plan execution run inside the same tick |
| Modifiers | `activeModifiers` (policies/inventions) | Completed focuses add to the same modifier table in `engine.js` |
| Diplomacy | `proposeAgreement`, `sendInquiry('peace')`, relations, political memory | Focuses only *open* proposals; the other court decides with existing thresholds |
| Characters / ambition | `politicalAmbition`, influence, loyalty, `improveLeaderTrust`, conspiracies | Elite/general reactions, command concentration → influence (no automatic rebellion) |
| Succession | `successionCandidates`, `successionPlans` | “The Dictator’s Future” designates an heir through it |
| Recruitment / battle / march / siege / economy | `recruit`, `resolveBattle`, `previewMarch`, `arrive`, `economy`, `forecastEconomy` | Formation factor, march delta, siege reduction, upkeep delta hooked into each |
| Fog of war | `observeArmies` sightings, `reportedControl`, `reportedDiplomacy`, `estimatedStrength` | Scout/recon sightings use the same format; sightings carry a coarse formation profile |
| War Council orders | `issueMilitaryOrder`, `moveArmy` | Plans issue only these orders, so all constraints apply unchanged |
| Chronicle | Log → `syncChronicleDispatches` | Focus, formation and plan events are logged as dispatches |
| Achievements | `finalizeCampaign` (finalization only) | Three IMPERIUM distinctions added there; no Laurel/permanent reward exists to duplicate |
| Commander specialties | Not present | Minimal simulated specialties (cavalry, engineering, caution), labelled as gameplay traits |
| Map | 24-theater territory graph (`ROUTES`) | Plans and arrows use real theater IDs and links; no decorative provinces |

## Systems

**National focus** (`imperium-focus-data.js`, `national-focus.js`)
- There are 123 focuses across 9 trees: Caesar 28, Senate 23, Egypt 14, Parthia 11, Armenia 11, and Numidia, Mauretania, Galatia and Bosporus 9 each.
- The four client kingdoms share a 6-focus institutional core, and each has its own unique branch.
- Every focus has a stable ID, a branch, an original icon, bilingual name, description and historical context, cost, duration, prerequisites, exclusions, preconditions, invalidation conditions, concrete effects and AI evaluation data. Alternate-history focuses are marked.
- A focus can be available, in progress, completed, locked, mutually exclusive, suspended or invalidated.
- Costs are paid at the start. Setting a focus aside keeps its progress. If a focus is invalidated (leader dead, government collapse, civil war), half the treasury cost is refunded and stability drops by 2; both are logged.
- The AI scores focuses from its treasury trend, stability, food, wars, its leader’s personality, its own sightings and the focus reports it has received. Hard and expert AIs also weigh anticipated threats.
- The AI keeps a treasury reserve, favours revenue focuses when its treasury is falling, and abandons a suspended or clearly outclassed strategy.
- Courts that have contact with a faction learn of its completed focuses as dated reports.

**Legion Designer** (`legion-designer.js`)
- There are 27 components across 7 military cultures: Roman cohorts and attachments, Hellenistic, Parthian, Armenian, North African, Galatian and Bosporan. Some components are unlocked by focuses.
- Each template calculates: personnel, recruitment and equipment cost, upkeep, food, speed class, attack, holding power, morale, training, terrain fit, reconnaissance, siege capability, supply support, reinforcement cost and profile.
- Battle power uses the main body; support attachments add small explicit bonuses. Every preset is below 1.0 in at least one terrain.
- An army carries a snapshot of its formation, so editing a template never transforms existing armies.
- Reorganization needs friendly ground, a supply link, no enemy present, treasury, manpower, food and 1–4 months. Partial conversion is possible down to 25%.
- Commander specialties adjust combat by a few percent and never change march time.
- The AI searches templates within a budget: standard 1 candidate, hard 3, expert 6. It recruits only with a reserve, reorganizes quarterly or after a defeat, and adapts to the formation profiles it has sighted.

**Operational planner** (`battle-plans.js`)
- Roles: offensive line, siege objective, frontline, defensive line, fallback, reserve, reconnaissance, supply-route guard. A plan-level supply priority costs 3 treasury a month and adds +2 supply on the route.
- Modes:
  - Manual: the plan tracks progress only.
  - Assisted: the plan produces recommendations for you to approve.
  - Automatic: orders go through `issueMilitaryOrder`.
- Preparation costs treasury and food each month. It is capped at 3 months, or fewer with focus modifiers. Morale gain is capped at 85, and siege works at 2.
- Plans react to:
  - army loss or defection;
  - recapture of a captured theater;
  - stronger reported enemies at the objective;
  - supply failure;
  - sieges that run long;
  - destinations that can no longer be entered;
  - new wars.

  A human player is asked to decide. The AI recalculates or abandons by itself.
- Loop guards stop an army after repeated moves into the same place, or 4 months without progress.
- The risk assessment shows: friendly strength, known enemy forces, intelligence age, terrain, supply, travel time, reinforcement distance, fortified objectives, counterattack threats and political or diplomatic risks.
- Up to three advisers give counsel. Each judges from their own acumen, integrity, ambition, loyalty and caution, using only the faction’s information.
- AI plans by difficulty:
  - Standard: defensive lines only.
  - Hard and expert: multi-army operations with reserves and frontlines.
  - Expert also adds supply guards and reconnaissance when spare forces exist and there is no troop sighting at the objective. It coordinates with allies’ live objectives.

**Interface** (`imperium-ui.js`, `imperium.css`): three new rail tabs.
- *National Strategy*: full-screen tree with zoom, pan, prerequisite links, exclusion marks, progress bars and a detail drawer showing effects and history.
- *Legion Designer*: template list, comparison of up to 3 templates, slot editor, calculated statistics, terrain bars, commander and power-concentration view, reorganization and recruitment quotes.
- *Operations*: plan editor in the side panel with route drawing on the map, role markers and arrows on the map, risk assessment, counsel and plan log.
- All screens are in English and Simplified Chinese.

## Tests and measurements

- `npm test`: 618 tests pass. 589 existed before; 29 are new, in `test/imperium-focus.test.js`, `test/legion-designer.test.js`, `test/battle-plans.test.js` and `test/imperium-integration.test.js`.
- Five existing seed-engineered tests (seven test cases) pin the exact random roll of an older subsystem. They now run with `world.imperium.enabled=false`; their assertions are unchanged.
- `node scripts/imperium-sim.mjs`: 4 fully automated expert campaigns over 36 months.
  - Mean month 3–8 ms, slowest 43 ms.
  - Save size about 170 KB.
  - 37–40 focuses completed per run, by all 9 courts.
  - 4–5 AI armies organized under templates.
  - 3 operations per run, 2 of them multi-army.
- `node scripts/multipolar-sim.mjs` still passes.
- Chrome walkthrough, run locally through Python Playwright: focus started, tree zoomed, template saved and compared, reorganization quoted and applied, route drawn on the map, plan approved and executed, language switched. No page errors. `tools/imperium-smoke.mjs` repeats this in CI.

## Save migration

`upgradeSave` adds empty focus and plan records and preset templates only. Armies, treasury, characters and territories are untouched; existing armies stay unorganized (combat factor 1). Verified by test.

## Remaining limitations

- In the default 49 BCE opening, the AI fields only 2–3 armies. Its operations therefore use offensive, reserve and frontline roles. Reconnaissance and supply-guard roles appear when spare forces and a missing objective sighting exist (covered by a test). Ally coordination needs an allied pair at war with the same enemy; it is implemented but was not observed in the default opening.
- Formation profiles reach other courts only through sightings. There is no espionage report of an enemy’s template list.
- The terrain atlas (`map-lab`) does not yet show the IMPERIUM screens; they are in the campaign view.
- Commander specialties are simulated defaults for named characters and hashed values for others.
- `engine.js`, `app.js` and other shared modules keep their existing `?v=` cache version. New modules use `?v=imperium-1`.
- The browser smoke test has run locally in Chrome. It has not yet run in GitHub Actions.
