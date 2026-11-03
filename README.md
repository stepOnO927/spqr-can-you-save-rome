# SPQR — Can You Save Rome?

Playable local 49 BCE civil war slice. Requires Node.js 20 or later and a current browser.

```powershell
npm start
```

Open `http://localhost:5173`. No package installation, account, API, or network access is needed. Run `npm test` for the simulation tests.

## How to play

Select an army marker or open **Military**. Choose **Order march**, then click a connected theater. Use **+1 month** or **Play** to advance the simulation. Legions cost treasury, manpower, and food. Sea routes cost 8 treasury and take longer. Battles use force size, morale, commander rating, experience, supply, terrain, and fortifications. An undefended fort requires a siege. The opposing command moves and recruits under the same rules. High taxation can trigger an armed provincial rebellion. Three local save slots are available.

Under **Government**, the player can declare war, improve relations, form or break an alliance, and make peace with Egypt, Numidia, Mauretania, Armenia, or Parthia. Allied kingdoms join wars newly declared by Caesar; separate peace does not end their wars. Peace is automatic and retains current territorial control. The kingdoms have independent resources, armies, and wartime AI. This is an initial implementation of the neighboring kingdoms milestone, not a complete diplomatic simulation.

The entire visible interface can be switched between English and Simplified Chinese without resetting the campaign.

## Historical scope and limitations

This is Milestone 1, a game slice, not the complete game described in the master directive. The map is a **schematic operational theater map** with a hand-drawn coastline. It does not represent exact ancient province boundaries. Starting troop numbers, faction control of theaters, income, and ratings are gameplay estimates. The political setting, January 49 BCE Rubicon crisis, Caesar and Pompey's identities, and Rome's connection to the broader Mediterranean are grounded in the linked sources in the game. The opening puts Pompey in Rome; future historical events are not scripted to occur regardless of player action.

Not yet implemented: precise researched province geography, playable neighboring countries, sophisticated independent diplomacy, other era bookmarks, characters and succession, research, religion, institutions, construction, national focuses, encyclopedia images, and multi-century simulation. Version 1 saves cannot be loaded into the expanded map; start a new campaign. The game does not represent those features as complete.

## Code layout

- `data.js` — theaters, routes, factions, initial armies, sources
- `engine.js` — pure simulation operations and AI
- `app.js` — UI and localization
- `style.css` — historical atlas style
- `engine.test.js` — gameplay checks

No commercial game art or maps are copied. The schematic coastline and interface are original.

