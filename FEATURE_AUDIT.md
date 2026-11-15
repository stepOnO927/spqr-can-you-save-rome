# Player-facing feature audit

This is an incremental audit of the current 49 BCE Roman campaign. A feature is listed as browser-verified only when the test uses the visible controls and checks campaign state; engine tests alone do not establish player access.

| Feature | Player entry | Browser coverage |
| --- | --- | --- |
| New campaign, difficulty, tutorial and save/load | Opening setup | `tools/onboarding-smoke.mjs` |
| Short landscape Roman campaign | Opening setup and campaign controls at 640×360, 836×470 and 1031×580 | `tools/short-screen-smoke.mjs` checks visible faction and difficulty, touch start, advance, government access and save |
| Army inspection, marches, battles and AI turns | Terrain map → army | `tools/phase-v-smoke.mjs`, `tools/browser-smoke.mjs` |
| Recruitment | Terrain map → owned city → manage theater | `tools/systems-smoke.mjs` |
| Family adoption and marriage | Campaign map → government → family tree | `tools/scenario-systems-smoke.mjs` |
| Family tree and private wills | Terrain map → Government, Families & Policies → family tree | `tools/systems-smoke.mjs` |
| Own character condition and historical reference | Campaign map → government → select an own person in the family tree | `tools/genealogy-dossier-smoke.mjs` checks simulated health, loyalty and location, separately labeled historical reference, save/load and protection of a missing person's hidden state |
| Personal travel and audiences | Campaign map → government → select an own person in the family tree | `tools/genealogy-personal-actions-smoke.mjs` previews and starts a journey, saves and orders a stop, and sends delayed audience requests; it also checks a fictional recipient's dated reported name after a hidden rename |
| Foreign family correspondence | Campaign map → government → family guarantees | `tools/family-courier-smoke.mjs` sends and saves a real proposal, advances four months, and observes a lost reply; `test/family-couriers.test.js` also covers marriage, asylum, wardship, both journeys and old saves |
| Contested and unclaimed private estates | Campaign map → government → family tree | `tools/inheritance-settlement-smoke.mjs` uses explicit contested-estate fixtures, checks a paid division and an unclaimed family settlement, then saves and reloads |
| Fixed opening institution portraits | Campaign map → government → family tree | `tools/portrait-institutions-smoke.mjs` checks individual images and save/load; unit tests cover old IDs and foreign meeting snapshots |
| Legacy fictional identity across save slots | Campaign map → load slot → government → family tree | `tools/legacy-identity-smoke.mjs` checks that a missing old identity is unknown rather than another save's person, and that both saves remain playable |
| Damaged saves and denied storage | Campaign or terrain map → load | `tools/safe-save-smoke.mjs` checks a rejected migration and read-access failure, then verifies that active character names stay intact in both views |
| Material research and completed construction | Terrain map → Inventions → research; owned city → manage theater → construction | `tools/construction-smoke.mjs` |
| Defensive coalition, civic negotiations and political movement reform | Campaign map → government (coalition test uses a friendly-relations fixture) | `tools/scenario-systems-smoke.mjs` |
| National idea research and non-aggression treaties | Government, Families & Policies → national ideas / diplomatic agreements | `tools/systems-smoke.mjs` |
| Discounted inquiries and peace letters | Terrain-map diplomacy / campaign-map government | `tools/inquiry-price-smoke.mjs` verifies default and discounted prices, low-treasury availability, actual payment and delayed save/load |
| Letters and foreign intelligence | Government → Characters & Intelligence → faction → Letters & Intelligence | `tools/systems-smoke.mjs`, `tools/browser-smoke.mjs` |
| Intelligence exchange with a pact partner | Factions → foreign faction → Letters & Intelligence → select a partner | `tools/intelligence-partners-smoke.mjs` uses a pact fixture and verifies the delayed request and save/load; delivery may fail |
| Foreign fictional names in terrain-map intelligence | Factions → foreign faction → Letters & Intelligence → reported person | `tools/foreign-name-privacy-smoke.mjs` checks the report, faction header and dossier before and after save/load using a hidden rename fixture |
| Intelligence request to a trading partner | Same intelligence panel → trade partner | `tools/trade-intelligence-smoke.mjs` uses a trade fixture, checks pending save/load and the eventual result; the partner may refuse |
| Captured-agent release requests | Factions → foreign faction → Letters & Intelligence → request release | `tools/captive-release-smoke.mjs` starts from a captured-agent fixture, checks the cost confirmation, four-month wait, save/load and eventual release, refusal or no reply |
| Discounted intelligence missions | Factions → Letters & Intelligence / own faction → Internal Security | `tools/mission-discount-smoke.mjs` checks displayed costs, actual payment, insufficient funds, pending time and save/load for spy and counterintelligence |
| Spying and administrative appointments | Factions → foreign intelligence or own faction | `tools/systems-smoke.mjs` |
| Character travel, health and succession information | Factions → character | `tools/browser-smoke.mjs` |
| Illness, acting authority and actual succession | Factions → own faction → succession and acting authority | `tools/health-succession-smoke.mjs` uses a dying-leader fixture, designates and appoints a deputy, saves/loads, then checks simulated death, successor and chronicle |
| City authority and local administration | Terrain map → city → manage theater | `tools/browser-smoke.mjs` |
| Population satisfaction map | Terrain map → map mode → population satisfaction | `tools/satisfaction-map-smoke.mjs` checks owned values, a real policy change, privacy, visible map redraw and save/load; shared outlines summarize owned theaters only |
| Chronicle and map handoff | Chronicle / return to campaign | `tools/browser-smoke.mjs` |
| Terrain-map pan, zoom and relief | Map drag, wheel and relief control | `tools/map-benchmark.mjs` |
| Screenshot | Terrain map → Screenshot | `tools/capture-check.mjs` |

The remaining family actions, other treaty types, and other political movement stages have engine or component tests, but are not yet all verified through a complete player journey. Continue the audit before treating every system as fully playable. Letter outcomes remain delayed and can be lost or refused. The family audience selector and terrain-map intelligence views use delivered reported names for fictional foreign people; legacy reports without a saved name remain anonymous. Other views still require individual privacy and player-flow audits.

The health and succession browser scenario starts from an explicitly simulated dying-leader fixture; it does not imply that an ordinary new campaign starts with an imminent death.

When browser storage is denied at startup, the three views use temporary in-memory storage where the browser permits replacing the storage property. A bilingual warning explains that temporary saves must be exported before reload, and save messages say they are temporary. If session storage is unavailable, the game prevents cross-view handoffs instead of silently losing the campaign. Readable existing saves remain available if writing fails due to quota. `tools/storage-denied-smoke.mjs` tests actual starts, month advances, export and blocked handoffs; an environment that forbids even replacing its denied storage property is not covered by this fallback.

`tools/runtime-storage-failure-smoke.mjs` additionally checks that a session write which fails after startup blocks the attempted transition in either direction instead of navigating with an unsaved campaign.
