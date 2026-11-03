# SPQR — Can You Save Rome?

Playable local 49 BCE civil war slice. Requires Node.js 20 or later and a current browser.

```powershell
npm start
```

Open `http://localhost:5173`. No package installation, account, API, or network access is needed. Run `npm test` for the simulation tests.

## How to play

Select an army marker or open **Military**. Choose **Order march**, then click a connected theater. Use **+1 month** or **Play** to advance the simulation. Legions cost treasury, manpower, and food. Sea routes cost 8 treasury and take longer. Battles use force size, morale, commander rating, experience, supply, terrain, and fortifications. An undefended fort requires a siege. The opposing command moves and recruits under the same rules. High taxation can trigger an armed provincial rebellion. Three local save slots are available.

Choose **New campaign** to play Caesar or the Senate. Neighboring kingdoms are AI-controlled. Under **Government**, improve relations, form or break alliances, declare war, and offer peace. Allies may join offensive and defensive wars; separate peace retains current territorial control and does not end allies' wars. A stronger opponent may reject peace. AI states consider border access, relative strength, food, finances and stability. Diplomatic choices and combat ratings are gameplay abstractions.

The entire visible interface can be switched between English and Simplified Chinese without resetting the campaign.

## Historical scope and limitations

This is a game slice, not the complete game described in the master directive. Coastlines and rivers are [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) public-domain 1:110m data. Political outlines are adapted from the dated [Seshat Cliopatria v0.2.1](https://github.com/Seshat-Global-History-Databank/cliopatria), CC BY 4.0. Roman regional shapes combine Cliopatria's 49 BCE Roman extent with the [Ancient World Mapping Center c. 60 BCE polygons](https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_bce_60), based on the Barrington Atlas and OpenStreetMap and licensed [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The 60 BCE data predates the campaign by eleven years and cannot establish exact 49 BCE provincial boundaries. Both historical reconstructions contain uncertainty. `historical-territories.js` contains the adapted polygons; [MAP_SOURCES.md](MAP_SOURCES.md) describes the transformations and remaining limits.

Some simulation theaters share a source polygon. Stripes indicate mixed military control, not a historical frontier; the theater picker identifies individual game areas. Gray Roman territory has no assigned gameplay theater. Starting troop numbers, faction control, income, and ratings are gameplay estimates. The opening puts Pompey in Rome; events are conditional on play.

Not yet implemented: precise researched province geography, the full set of neighboring powers, sophisticated diplomacy and AI, other era bookmarks, characters and succession, research, religion, institutions, construction, national focuses, encyclopedia images, and multi-century simulation. Version 2 saves are migrated; version 1 saves cannot be loaded into the expanded map. The game does not represent those features as complete.

## Code layout

- `data.js` — theaters, routes, factions, initial armies, sources
- `historical-territories.js` — dated polity outlines and adapted Roman polygons; see `MAP_SOURCES.md`
- `engine.js` — pure simulation operations and AI
- `app.js` — UI and localization
- `style.css` — historical atlas style
- `engine.test.js` — gameplay checks

No commercial game art or maps are copied. The schematic coastline and interface are original.

