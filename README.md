# SPQR — Can You Save Rome?

Playable independent 49 BCE civil war grand campaign and persistent Legacy of Rome hub. Requires Node.js 20 or later and a current browser.

```powershell
npm start
```

Open `http://localhost:5173` for the campaign, `/map-lab/` for the zoomable atlas, or `/legacy/` for the out-of-run city. New campaigns and city scenarios open in the zoomable atlas; its Return button reaches the older campaign view. The campaign, hub, atlas map engine, geography, and overview terrain work without network access. Higher-zoom terrain detail and web fonts need network access. No account is needed. Run `npm test` for simulation tests.

## Phase XV and XVI

The default campaign contains **120 controllable strategic territories**, including 30 in Italy and Sicily. Settlement anchors, operational polygons, graph routes, leg-by-leg pathfinding, roads, port-only sea crossings with actual transport fleets, supply connectivity and bottleneck defense, encirclement attrition, defensive preparation, coordinated flanking from distinct positions, retreats, and territory-level construction are implemented. Regional population, migration, faith mix and accommodation affect income, manpower and loyalty. The old 22-theater campaign can still be loaded; the main menu offers an explicit choice to convert it or continue in legacy mode. Existing characters, diplomacy, intelligence and battle records survive conversion. Run `node tools/grand-browser-smoke.mjs` for the bilingual browser flow and `node tools/phase-xi-atlas-smoke.mjs` for the Senate tutorial, scouting and combat flow. Both Caesar and the Senate have passed 120-month simulation and save-roundtrip checks.

**Legacy of Rome** is a persistent, clickable city outside campaign turns. Laurels are separate from campaign treasury. The Curia has state-changing petitions; the Museum collects illustrated objects; the Archive and Arch preserve victories; the Circus opens a 2D, five-driver, three-lap chariot race with a second narrow circuit. Six districts have twelve permanent, one-time civic choices. The shop also unlocks a historically inspired alternate Thessaly start in 48 BCE. Purchases, cosmetics, achievements, race records, and rewards survive refresh and save loading. The city profile can be exported and imported as JSON for another browser or device. Rewards are keyed to campaign/run or minigame completion to prevent duplicate claims. Test an automated three-lap race with `node tools/race-playtest.mjs`.

The entry screen and in-game menu support JSON save upload and download. Older files are preserved; import does not overwrite any local save slot. The atlas also has direct JSON transfer buttons. Both maps use cropped Natural Earth 1:10m land geometry and three modern bathymetry bands. The atlas uses the matching ocean polygon as a sea mask, a crisp coastline, subdued ownership fills, visible faction banners, elevation-based land color, and optional hillshade. Its focus button opens an unobstructed terrain view. Run `node tools/live-grand-atlas.mjs <output-directory>` against a local server on port 5174 to test live tiles, pan and map modes.

## Mare Nostrum and campaign achievements

Phase XI military reconnaissance is separate from court espionage. An army can send scouts, probe enemy positions, delay an attack, or ask for reinforcements. Reports preserve source, observation and arrival dates, estimated ranges, confidence, reliability and conflicting evidence. The prebattle screen uses only available knowledge; the after-action review separates prior risks from battle observations and later conclusions. The War Council can mark a target, request scouts, compare reports and revise plans. Military troop density uses neutral counters while political identity remains faction-colored. The Senate Standard tutorial allows reconnaissance and does not require an immediate attack. `node tools/phase-xi-atlas-smoke.mjs` checks the Chinese and English browser flows.

The independent campaign now has eleven connected Mediterranean sea zones, persistent fleets, dated naval sightings, shipyard queues, fleet orders, combat, piracy, military transports and stock-limited merchant routes. Maritime trade consumes actual goods and payment; cargo price depends on distance and demand, and partial deliveries occur when the buyer cannot afford a full shipment. Hostile raids transfer captured goods to the raider; blockades, war, diplomacy and merchant capacity can interrupt deliveries. A hostile blockade also reduces the supply of armies stationed at that port. Fleet speed, crew shortages, storms, repairs and sailor replacement affect operations. Patrols can fight pirate vessels with real sailor losses; AI orders each available fleet and can embark an army when transport ships and a reachable hostile coast exist. Naval officers have travel times, salary, experience and real effects on ports, shipbuilding, trade, repairs and reconnaissance. Amphibious assaults have a combat readiness cost, reviewed before and after battle. Sea-zone boundaries, ship values and commercial routes are gameplay approximations of the ancient Mediterranean.

Campaign achievements are recorded silently in the save as dated evidence. The player can formally end a run in either campaign view. Only then are Ordinary, Hidden and Legendary achievements revealed and eligible Laurel Coins claimed once in the permanent Legacy profile. A military victory can be played beyond without revealing achievements. Finished saves retain their results and can be downloaded or imported.

The atlas uses a distinct deep-water palette and restrained elevation colors. Extra hill shading is off by default and can be enabled in Settings. Settings also credit stephen chu and link to the creator's GitHub profile.

## Phase XIV development system

The independent Phase XIV build adds a playable **Development** panel, five-category **National Ideas** panel, province construction, and knowledge trade to both campaign views. Each nation begins with one empty idea slot in each category. Research spends treasury and advances by month; ideas need a separate timed adoption, while material knowledge only unlocks construction. A province project consumes treasury and stone or timber, takes months, checks terrain and modeled metal deposits, and then affects the monthly economy or combat. Category-specific expansion can raise capacity to three slots when the command has enough knowledge and working institutions, at an ongoing administrative cost. International purchases take two months to deliver and do not equip or build anything; sales, reciprocal exchanges and visiting scholars add further choices. AI countries research, build, adopt, buy, and exchange knowledge, sell to other AI countries, and make time-limited offers to the player when relations permit. Accepting an offer is the only way an AI sale charges the player.

This build includes 34 material innovations, 33 building types, and 26 national ideas, each with an original interpretive vector drawing. The building families in the directive are represented, including dams, sewers, monuments, barracks, mines, roads, ports and shipyards. Geography checks, resource purchases, maintenance, food storage, seasonal water stress, recruitment, illness risk, siege and movement effects connect them to the simulation. Five Great Figure specialties are represented by named historical candidates, with appointment cost, travel time and modest research, adoption or construction effects. Faith composition, local rites policy and migration of traditions form an approximate society model, not a reconstruction of individual ancient religious practice. Bilingual historical notes and background reading links are included for the implemented nodes; the direct source review for each card is recorded in TECH_SOURCE_AUDIT.md. Gameplay values are balance settings, not historical measurements.

Run `node tools/phase-xiv-smoke.mjs` after installing Playwright locally to check the main browser flow. The smoke script serves project files through Playwright route interception, so it does not need a networked dev server; it uses a locally installed Chrome browser.

The **Terrain Map Lab** and **Return to Campaign** controls transfer the current game between the two views in the same browser tab. The transfer uses temporary session storage and does not overwrite the three save slots. Save separately for longer-term persistence.

## How to play

Select an army marker or open **Military**. Choose **Order march**, then select a reachable territory. The route advances one connected leg at a time. Use **+1 month** or **Play** to advance the simulation. Legions cost treasury, manpower, and food. Sea routes require ports, cost 8 treasury per leg, and take longer. Battles use force size, morale, commander rating, experience, operational supply, terrain, and fortifications. An undefended fort requires a siege. The opposing command moves and recruits under the same rules. High taxation can trigger an armed provincial rebellion. Three local save slots are available, plus JSON import/export.

Choose **New campaign** to play Caesar or the Senate. Neighboring kingdoms are AI-controlled. Under **Government**, improve relations, form or break alliances, declare war, and offer peace. Allies may join offensive and defensive wars; separate peace retains current territorial control and does not end allies' wars. A stronger opponent may reject peace. AI states consider border access, relative strength, food, finances and stability. Diplomatic choices and combat ratings are gameplay abstractions.

The entire visible interface can be switched between English and Simplified Chinese without resetting the campaign.

## Historical scope and limitations

This is a game slice, not the complete game described in the master directive. Coastlines and rivers are [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) public-domain 1:110m data. Political outlines are adapted from the dated [Seshat Cliopatria v0.2.1](https://github.com/Seshat-Global-History-Databank/cliopatria), CC BY 4.0. Roman regional shapes combine Cliopatria's 49 BCE Roman extent with the [Ancient World Mapping Center c. 60 BCE polygons](https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_bce_60), based on the Barrington Atlas and OpenStreetMap and licensed [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The 60 BCE data predates the campaign by eleven years and cannot establish exact 49 BCE provincial boundaries. Both historical reconstructions contain uncertainty. `historical-territories.js` contains the adapted polygons; [MAP_SOURCES.md](MAP_SOURCES.md) describes the transformations and remaining limits.

Some simulation theaters share a source polygon. Stripes indicate mixed military control, not a historical frontier; the theater picker identifies individual game areas. Gray Roman territory has no assigned gameplay theater. Starting troop numbers, faction control, income, and ratings are gameplay estimates. The opening puts Pompey in Rome; events are conditional on play.

The atlas includes historical characters, interpretive portraits, health, succession, espionage, and dated faction-specific intelligence. Letters and audiences can take time, be lost, or receive no useful reply. These are evolving gameplay models, not complete historical reconstructions. The 120 territories are operational gameplay cells clipped to historical source outlines, **not** attested ancient administrative provinces. Routes, resources, population, faith mix and political values remain approximations. The Rubicon challenge is alternate history; the Thessaly scenario is a historically inspired 48 BCE start with alternate deployment, not a full reconstruction of that date. Later eras are not simulated as historical campaign starts. Older supported saves can be preserved or converted explicitly.

New campaigns begin with foreign army sightings only in a faction's own theaters or adjacent theaters, including linked sea routes. Later observations update these dated reports; a disappeared or moved army can leave an outdated sighting. This is a coarse gameplay model, not literal visibility or a historical claim. Existing saves retain their accumulated reports.

## Code layout

- `data.js` — theaters, routes, factions, initial armies, sources
- `historical-territories.js` — dated polity outlines and adapted Roman polygons; see `MAP_SOURCES.md`
- `engine.js` — pure simulation operations and AI
- `grand-map-data.js`, `grand-territory-polygons.js`, `grand-operations.js` — expanded geography and operational warfare
- `app.js` — UI and localization
- `map-lab/` — zoomable atlas, character panels and tutorial
- `legacy/` — persistent city, shop, Curia, Museum and chariot race
- `view-handoff.js` — temporary campaign transfer between the two views
- `style.css` — historical atlas style
- `engine.test.js` — gameplay checks

No commercial game art or maps are copied. The coast is from the public-domain Natural Earth dataset; the interface artwork is original.
