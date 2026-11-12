# Player-facing feature audit

This is an incremental audit of the current 49 BCE Roman campaign. A feature is listed as browser-verified only when the test uses the visible controls and checks campaign state; engine tests alone do not establish player access.

| Feature | Player entry | Browser coverage |
| --- | --- | --- |
| New campaign, difficulty, tutorial and save/load | Opening setup | `tools/onboarding-smoke.mjs` |
| Army inspection, marches, battles and AI turns | Terrain map → army | `tools/phase-v-smoke.mjs`, `tools/browser-smoke.mjs` |
| Recruitment | Terrain map → owned city → manage theater | `tools/systems-smoke.mjs` |
| Family adoption and marriage | Campaign map → government → family tree | `tools/scenario-systems-smoke.mjs` |
| Family tree and private wills | Terrain map → Government, Families & Policies → family tree | `tools/systems-smoke.mjs` |
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
| Intelligence request to a trading partner | Same intelligence panel → trade partner | `tools/trade-intelligence-smoke.mjs` uses a trade fixture, checks pending save/load and the eventual result; the partner may refuse |
| Captured-agent release requests | Factions → foreign faction → Letters & Intelligence → request release | `tools/captive-release-smoke.mjs` starts from a captured-agent fixture, checks the cost confirmation, four-month wait, save/load and eventual release, refusal or no reply |
| Discounted intelligence missions | Factions → Letters & Intelligence / own faction → Internal Security | `tools/mission-discount-smoke.mjs` checks displayed costs, actual payment, insufficient funds, pending time and save/load for spy and counterintelligence |
| Spying and administrative appointments | Factions → foreign intelligence or own faction | `tools/systems-smoke.mjs` |
| Character travel, health and succession information | Factions → character | `tools/browser-smoke.mjs` |
| Illness, acting authority and actual succession | Factions → own faction → succession and acting authority | `tools/health-succession-smoke.mjs` uses a dying-leader fixture, designates and appoints a deputy, saves/loads, then checks simulated death, successor and chronicle |
| City authority and local administration | Terrain map → city → manage theater | `tools/browser-smoke.mjs` |
| Chronicle and map handoff | Chronicle / return to campaign | `tools/browser-smoke.mjs` |
| Terrain-map pan, zoom and relief | Map drag, wheel and relief control | `tools/map-benchmark.mjs` |
| Screenshot | Terrain map → Screenshot | `tools/capture-check.mjs` |

The remaining family actions, other treaty types, and other political movement stages have engine or component tests, but are not yet all verified through a complete player journey. Continue the audit before treating every system as fully playable. Foreign political information remains limited to the player's reports; letter outcomes remain delayed and can be lost or refused.

The health and succession browser scenario starts from an explicitly simulated dying-leader fixture; it does not imply that an ordinary new campaign starts with an imminent death.
