# World expansion progress

This file tracks the four supplied specifications as one development goal. The expansion is **in progress**. A functioning slice is not a claim of world coverage.

## Implemented in this checkpoint

- Reproducible audit of Roman and Han territory references, routes, historical polygons and local entity placement (`node scripts/audit-territories.mjs`). The audit reports 24 Roman theaters, 28 routes, 15 historical polygon features, 94 Han regions and 124 Han routes. It does not equate map imagery with ownerless land.
- Canonical theater record is still `state.regions`. It now keeps controller, legal sovereign, military occupier, administrative status and control date. Conquest, siege, secession and command reunification use one transfer function. Legacy saves gain default fields without changing owners or foreign reports.
- Occupied theaters yield less tax. A player or AI with a garrison, resources and adequate loyalty can fund a three-month administration project; loss of the garrison pauses it. Administration improves tax collection without changing legal sovereignty.
- Main campaign and Map Lab show the new political layers for owned theaters while concealing foreign actual state. Non-playable geography can be inspected without claiming it is vacant. A city marker remains clickable when an army is on top of it.
- Massilia is a sourced, autonomous city-state within the existing Narbonensian theater. It has its own controller, legal title, militia, resources, delayed and fallible port-access/protectorate offers, tribute, siege, occupation and local administration. The host theater does not change owner when the city is taken. Its military and resource figures are explicitly simulated. See [Caesar, *Civil Wars* I.34–36](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/1B%2A.html) for the historical city and conflict.
- AI can negotiate port access, besiege after a refused offer and administer captured territory through the same functions. The Inspector validates local entity geography, type, controller and militia.
- Border policies now persist in new and upgraded saves. Military transit checks use reported control in route previews and actual control on arrival. Trade and ordinary alliances confer no automatic army passage. Military access treaties may be bilateral or limited to a named permitted party and reported theater; the government panel can propose either scope. Existing full military-access treaties retain their behavior.
- Map Lab now offers an explicit unauthorized border crossing for a known closed neighbor. On arrival, a real defending army may repel the crossing with limited losses; an undefended frontier records an unopposed crossing. Either outcome creates a persistent local incident, harms relations and credibility, and does not automatically declare war or transfer the theater. The player log reveals own losses without giving exact foreign casualties.

## Verification

- Full `npm test -- --test-reporter=dot --test-concurrency=1` passed after the changes. One parallel run tripped two pre-existing timing thresholds under test contention; both performance tests passed together in isolation.
- `npm run build:pages` produced 228 public files in `dist/`, 4.08 MiB total, largest 1.06 MiB. The new runtime module is included by dependency tracing; internal documents and tests are excluded.
- Real Chrome on the built output: `/` and `/map-lab/` load without JavaScript exceptions; the main campaign advances a month; a save with occupied northern Italy transfers into Map Lab; theater administration starts; Massilia port access starts, a real three-month siege takes the city, and city administration pauses when the host theater loses its garrison.
- 120 AI-driven monthly ticks reached January 39 BCE; save roundtrip and startup Inspector returned zero fatal findings and zero warnings.
- After merging the then-current `main`, the full serial test suite passed again. The scoped border-access tests, module-version check and public build passed, and Chrome verified that treaty scope controls appear for military-access offers and stay hidden for trade. New commits landed on `main` during this work and must be reconciled before review is complete.
- Chrome also confirmed that closed-border destinations keep the ordinary march button disabled and expose a separate force-crossing command. Tests cover an unopposed crossing, a real defender repelling one, persistence, no fabricated battle and no automatic annexation or full war.
- The complete serial test suite passed after the unauthorized-crossing engine and UI changes.

## Remaining work from the four specifications

1. Complete the Italian slice with several settlement-level targets, treaty-based legal transfers, resistance, connected supply and a visible route planner.
2. Add sourced tribes, microstates, strongmen, villages, nomadic groups and classified wilderness in regionally appropriate density. Keep all unsourced or approximate boundaries clearly labeled.
3. Add border-incident responses and escalation decisions, AI use, and route alternatives; extend border access to emissaries and trade across the route graph.
4. Add persistent footholds, outposts, village development, administrative capacity and long-distance expedition logistics, with player and AI actions.
5. Add layered suzerainty and organizations with independent membership and map modes; expand discovery, diplomatic mail and social meetings without exposing hidden state.
6. Extend the model and browser playtests across the Mediterranean, Iran, Central Asia and Han map; retain the Liu-lineage and hidden-achievement constraints.

The public repository still hosts the current GitHub Pages deployment. Expansion changes are isolated in draft PR #242; no Pages deployment, visibility or Cloudflare cutover has been changed.
