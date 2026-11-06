# SPQR — remaining work

This tracker records the state of the **independent development branch**. A working mechanic is not a claim that every phase directive has been fulfilled. The 49 BCE Roman campaign remains the main playable scenario.

## Implemented and checked

- **Phase XI reconnaissance:** scouts, probes, waiting, dated and uncertain reports, prebattle estimates, battle reviews, a War Council, neutral military density markers, and later campaign AI scouting. The Senate Standard 5,200-man opening is covered in English and Chinese browser smoke tests.
- **Phase XIV development:** two research branches with 34 material innovations and 25 national ideas, 59 distinct interpretive vector illustrations, five idea categories, construction, institutional slot expansion, knowledge purchase/sale/exchange, visiting scholars, and local religion policy. Roads, bridges, harbor storage, and coastal forts have simulation effects.
- **Phase XVIII naval core:** fleets, shipbuilding, officer assignments, sea combat, piracy, transport, maritime trade, and AI fleet orders. Patrols can now fight actual pirate vessels, and amphibious attacks use a battle penalty shown in the review.
- **Legacy achievements:** silent in active campaigns, revealed on formal conclusion or terminal defeat, with one-time reward keys. New campaigns have unique IDs; older imported saves receive a stable ID based on the imported file.
- **Regression:** `npm test` and browser smoke scripts for the atlas, Senate reconnaissance, development, and grand campaign.

## Still incomplete

1. **Phase XIV source and art review.** Every technology card now has a different original schematic drawing. These are interpretive game illustrations, not images of excavated artifacts. Cards still use broad historical background links; each historical note needs a checked source that directly supports it. The 34/25 catalog is a playable slice; the broader directive's deeper policy, religious, cultural, and civilization-specific content remains unfinished.
2. **Phase XIV balance and long campaigns.** The default Caesar opening can end in terminal defeat by July 49 BCE on the older map when the player makes no moves. The simulation should be played and balanced across factions and difficulties without scripting a guaranteed result. Research, economy, faith, migration, and diplomacy need longer campaign review.
3. **Phase XVIII naval depth.** Piracy and sea battles use aggregate fleet calculations. Tactical choices, detailed cargo capture, commander capture, AI troop transport, maritime supply, distance-sensitive market prices, and more nuanced detection remain to be built and balanced.
4. **Phase XV map geography and visual review.** The 120 territories are gameplay cells based on imperfect historical sources. Coastlines, borders, names, terrain, contrast, zoom behavior, small screens, and accessibility still need a cartographic review and user acceptance. This remains the user's principal visual complaint.
5. **Phase XVI Legacy hub depth.** The city, shop, museum, archive, race, and campaign rewards are playable, but building-specific activities and museum curation are narrower than the full directive.
6. **Phase XI continued playtesting.** One Senate Standard path and both languages are covered by browser smoke, plus targeted simulation tests. More independent human campaigns, alternate decisions, long intelligence chains, AI mistakes, and save/import flows need playtesting. Local saves contain actual simulation state, so fog of war is a gameplay interface boundary, not file encryption.
7. **Historical audit.** Figures, politics, religion, regional boundaries, and economic values are approximations. Check source and license records before presenting any additional historical statement as fact.

## Release checks

Run `npm test`, `node tools/phase-xi-atlas-smoke.mjs`, `node tools/phase-xiv-smoke.mjs`, and `node tools/grand-browser-smoke.mjs`. Inspect both languages and actual browser rendering. Keep the independent branch separate from `main` until the user chooses otherwise.
