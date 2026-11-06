# SPQR — Can You Save Rome?

Playable independent 49 BCE civil war grand campaign and persistent Legacy of Rome hub. Requires Node.js 20 or later and a current browser.

```powershell
npm start
```

Open `http://localhost:5173` for the campaign, `/map-lab/` for the zoomable atlas, or `/legacy/` for the out-of-run city. The campaign and hub work without network access. The atlas bundles its land and sea geometry; MapLibre, optional elevation tiles and web fonts need network access. No account is needed. Run `npm test` for simulation tests.

## Phase XV and XVI

The default campaign contains **120 controllable strategic territories**, including 30 in Italy and Sicily. Settlement anchors, operational polygons, graph routes, leg-by-leg pathfinding, roads, port-only sea crossings with limited naval lift, supply connectivity and bottleneck defense, encirclement attrition, defensive preparation, coordinated flanking from distinct positions, retreats, and territory-level construction are implemented. Regional population, migration, faith mix and accommodation affect income, manpower and loyalty. The old 22-theater campaign can still be loaded; the main menu offers an explicit choice to convert it or continue in legacy mode. Existing characters, diplomacy, intelligence and battle records survive conversion. Run `node tools/grand-browser-smoke.mjs` for the bilingual browser flow and `node tools/phase-xi-atlas-smoke.mjs` for the Senate tutorial, scouting and combat flow. Both Caesar and the Senate have passed 120-month simulation and save-roundtrip checks.

**Legacy of Rome** is a persistent, clickable city outside campaign turns. Laurels are separate from campaign treasury. The Curia has state-changing petitions; the Museum collects illustrated objects; the Archive and Arch preserve victories; the Circus opens a 2D, five-driver, three-lap chariot race with a second narrow circuit. Six districts have twelve permanent, one-time civic choices. The shop also unlocks a historically inspired alternate Thessaly start in 48 BCE. Purchases, cosmetics, achievements, race records, and rewards survive refresh and save loading. The city profile can be exported and imported as JSON for another browser or device. Rewards are keyed to campaign/run or minigame completion to prevent duplicate claims. Test an automated three-lap race with `node tools/race-playtest.mjs`.

The entry screen and in-game menu support JSON save upload and download. Older files are preserved; import does not overwrite any local save slot. The atlas also has direct JSON transfer buttons. Both maps now use cropped Natural Earth 1:10m land geometry. The atlas uses the matching ocean polygon as an opaque sea mask, a crisp coastline, subdued ownership fills, visible faction borders and banners, and optional land relief. Run `node tools/live-grand-atlas.mjs <output-directory>` against a local server on port 5174 to test live tiles, pan and map modes.

## Phase XIV development system

The independent Phase XIV build adds a playable **Development** panel, five-category **National Ideas** panel, province construction, and knowledge trade to both campaign views. Each nation begins with one empty idea slot in each category. Research spends treasury and advances by month; ideas need a separate timed adoption, while material knowledge only unlocks construction. A province project consumes treasury and stone or timber, takes months, checks terrain and modeled metal deposits, and then affects the monthly economy or combat. Category-specific expansion can raise capacity to three slots at an ongoing administrative cost. International purchases take two months to deliver and do not equip or build anything. AI countries research, build, adopt, and seek foreign knowledge when resources allow.

This build includes 29 material innovations, 29 building types, and 15 national ideas. The building families in the directive are represented, including dams, sewers, monuments, barracks, mines, roads, ports and shipyards. Geography checks, resource purchases, maintenance, food storage, seasonal water stress, recruitment, illness risk, siege and movement effects connect them to the simulation. Five Great Figure specialties are represented by named historical candidates, with appointment cost, travel time and modest research, adoption or construction effects. Faith composition is an approximate local society model that affects satisfaction; it is not a reconstruction of individual ancient religious practice. Bilingual historical notes and source links are included for the implemented nodes. Gameplay values are balance settings, not historical measurements.

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
