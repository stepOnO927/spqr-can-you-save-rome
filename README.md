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

This is a game slice, not the complete game described in the master directive. Coastlines and rivers are from [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), public domain, 1:110m. The Roman core is clipped to a simplified [Ancient World Mapping Center Roman extent, c. 60 BCE](https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_bce_60), based on the Barrington Atlas and OpenStreetMap and licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The source predates the campaign by approximately eleven years; areas outside that extent, including Caesar's later Gallic conquests, remain approximations. The source data is included in `rome60.js`, simplified to reduce file size. Colored operational areas are nearest-anchor cells around approximate historical places, clipped to land and, for the Roman core, the 60 BCE extent. **Internal theater divisions and non-Roman boundaries are gameplay approximations, not reconstructed ancient borders or historical province polygons.** Starting troop numbers, faction control of theaters, income, and ratings are gameplay estimates. The political setting, January 49 BCE Rubicon crisis, Caesar and Pompey's identities, and Rome's connection to the broader Mediterranean are grounded in the linked sources in the game. The opening puts Pompey in Rome; future historical events are not scripted to occur regardless of player action.

Not yet implemented: precise researched province geography, the full set of neighboring powers, sophisticated diplomacy and AI, other era bookmarks, characters and succession, research, religion, institutions, construction, national focuses, encyclopedia images, and multi-century simulation. Version 2 saves are migrated; version 1 saves cannot be loaded into the expanded map. The game does not represent those features as complete.

## Code layout

- `data.js` — theaters, routes, factions, initial armies, sources
- `engine.js` — pure simulation operations and AI
- `app.js` — UI and localization
- `style.css` — historical atlas style
- `engine.test.js` — gameplay checks

No commercial game art or maps are copied. The schematic coastline and interface are original.

