# Mandate of Heaven · The Silk Road / 天命 · 丝路诸国

## Play

Open `/han/` to start an independent campaign in January 49 BCE. Select Han, an oasis kingdom, a Central Asian confederation, Parthia, Armenia, Commagene, or another listed polity. Each campaign has its own browser save under `spqr-han-save-browser`.

In the Roman campaign, enable **Mandate of Heaven** at setup. Rome's **East** panel continues to show delayed and uncertain merchant reports. Its save remains separate from the playable eastern campaign. The two campaigns do not share player commands or save state.

## World model

- The eastern simulation runs on its own region, army, court and trade state. The historical Roman campaign remains playable without the DLC.
- Playable political centers from the Tarim Basin to the eastern Mediterranean use approximate locations. These points are **not claimed as precise 49 BCE borders**. Historical confidence and source links are recorded in `eurasia-data.js`; uncertain affiliations are modeled as adjustable dependencies, not permanent annexation.
- Caravan routes connect Chang'an, the Tarim Basin, Bactria, Parthia and the eastern Mediterranean. Caravans advance one leg at a time, pay tolls, turn back if access is lost and can be raided. Legacy saves with old Kangju relays still resolve.
- The Han emperor in January 49 BCE is Liu Xun (Emperor Xuan); Liu Shi is crown prince. The older January 48 BCE accession setup remains available internally for save and regression compatibility.
- Known rulers are recorded by name where sources support them. Unattested local rulers are left unspecified.
- Every polity has local treasury, food and manpower from the shared economy. Dependencies can grant autonomy or send limited manpower; war can break political influence. New regional AI reacts to nearby war and local resources.

## Controls

Select a polity, click a region or one of your armies, then click an adjacent region to issue a march. The inspector shows movement, supply, recruitment costs and diplomatic actions. Use the camera and mode selectors to inspect political control, terrain, local supply, taxes and your own forces. Save, load and language switching are available in the header.

## Verification

`npm test` includes 120-month simulations for Han, Shanshan, Parthia and Commagene, route disruption, dependency actions, movement rules, save/load and map modes. The playable interface was also exercised in cloud Chromium at 1366×768 and 600×800. The map of the wider world is an abstraction; province scale and military cultures are simplified for gameplay.
