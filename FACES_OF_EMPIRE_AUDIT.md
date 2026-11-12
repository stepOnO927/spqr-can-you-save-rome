# Faces of Empire — repository audit (Stage A)

This is an implementation audit, not a claim that the expansion is present.
Baseline: `7924545` on `main` (2026-11-11). Counts below come from importing
`data.js` and `characters.js`, not from the UI.

## Progress on the draft branch

The baseline table is a historical snapshot. Later commits added an eastern
Han theater, a separate Shanshan polity, Han court personnel and succession
rules, and a browser exercised Han start and save restoration. The current
identity work gives every opening army a saved commander record and names
newly recruited officers, replacement officers, minor claimant field leaders,
and movement organizers from faction-aware pools. Civil-war settlements now
update those officers' political affiliation with their armies.
New opening officers are excluded from automatic dynastic succession; their
presence must not silently fill a vacant throne. The opening dynasty random
seed remains `786509145` for the Caesarian scenario.

The latest main also added a separate Mandate of Heaven Han simulation within
Roman campaigns, with its own eastern map, court, portraits, trade and delayed
reports. This optional Roman expansion coexists with the directly playable Han
campaign. The setup keeps the Roman option out of direct Han starts; neither
simulation silently replaces the other or changes an existing save.
Its opening armies and newly recruited formations now receive saved, named
field commanders from distinct Han, steppe, oasis and western cultural pools;
the independent campaign displays those names instead of raw IDs. Historical
leaders keep their documented identities. A browser regression checks a named
officer across save/load and both interface languages.
New Roman-campaign intelligence missions now assign saved fictional agents,
envoys and couriers. Captives retain the same person ID through release, and
the player's mission and captive lists display their names. Active missions
and held captives in older saves acquire an identity once; completed older
records remain as recorded.
Newborn fictional people now use their faction's naming tradition instead of
receiving Roman given names in every court. Han children retain a recorded
father's surname in the displayed name while legal lineage continues to rely
on saved parent IDs; Egyptian female children use Greek-speaking court names.
Generated fictional people also have a saved appearance seed. The atlas draws
a compact procedural portrait for the player's own people; a foreign portrait
is only observed after a successful personal meeting. That meeting stores the
observed seed and political affiliation, so later hidden changes do not alter
the previously observed artwork. Existing bespoke portraits remain in use.
The family tree now uses the same artwork and the portraits vary face shape,
details and age without changing the person's saved identity. A foreign
portrait remains gated by the viewer's own meeting record.
Main's new limited childhood/adult portrait pairs for campaign-born Roman
people are also integrated. Saved identity claims keep those authored assets
attached to one person, while the procedural renderer covers other named
people. A legacy record without a saved identity still shows a silhouette.
Reported sovereign labels now distinguish Han, Parthian, Egyptian and other
institutions. When an unrelated fictional court member succeeds a hereditary
ruler, the new house, founder and political cost are saved and shown in the
player's genealogy. A documented Liu descendant may succeed in the direct Han
campaign; an unrelated minister with a Liu-looking name cannot. These are
partial Stage D/E integrations, not a claim that every requested political
route or important portrait is finished.
An initial Stage F/G market ledger now records measured grain, horse, iron,
timber, silk and papyrus batches for existing theaters. Production,
consumption, bounded prices, stock, shortages, shipment escrow, actual route
legs, tariff receipts, delivery transactions and transport spending persist in
saves. A treaty-backed Parthia–Armenia horse shipment is tested across a save
and a wartime interruption. Direct-Han-campaign silk and horses can now move
to and from Parthia along the pre-existing Han oasis and Central Asian route
graph. Distinct intermediate authorities collect buyer-funded tariffs; a war
at an intermediate leg blocks the shipment until passage reopens. No direct
Han–Parthian shortcut or Han provincial ownership is invented.
Treaty partners now make bounded quarterly AI purchases through the
same order validation and escrow path. AI-to-AI deliveries do not generate
player dispatches, and AI buyers cannot silently take goods from a player
market. The atlas now exposes own market stocks, quotes, routes, prepaid
orders, shipments and deliveries in English and Chinese. A Chromium smoke
test places an order and checks delivery and save/load. Old and new trade
treaties grant market access instead of generating one treasury unit per
party each month without a payer. This is a first commercial behavior, not
the requested merchant-character network or continental competition. The
Roman campaign's optional Han NPC simulation still uses abstract silk income
and has not yet been joined to the physical market ledger.
The 120-month market simulation verifies that at least four AI courts place
orders against real surplus, deliveries complete, stocks and prices remain
bounded, escrow resolves, and save migration works halfway through.

The expansion remains incomplete: wider Central Asian name datasets and
characters, major fixed portraits, additional routes to fictional sovereignty,
integrated physical commodity trade with the Roman campaign's Han NPC world,
broader market AI and the full acceptance
scenarios are still outstanding. New names
and emblems are game reconstructions, not documented personal identities.

## Existing foundations

| System | Reusable implementation | Limitation for Faces of Empire |
| --- | --- | --- |
| Campaign | `engine.js`, `data.js`, `map.js`, `map-lab/lab.js` | 24 theaters, 28 routes, 12 initial armies; no Han faction or Eurasian geography. `PLAYABLE` contains nine Mediterranean powers. The schematic projection and atlas overlays cover the Mediterranean. |
| Characters | `characters.js`, `character-system.js`, `dynasties.js` | 19 catalogued historical characters; fictional IDs and save-persistent family records exist. `createFictionalPerson` requires callers to supply a name and records generic “Simulated” culture. There are no structured Han, Central Asian, or culture-specific name generators. |
| Portraits | `portrait-registry.js`, `map-lab/character-ui.js`, `assets/portraits/` | Individual artwork exists for historical characters and selected fixed fictional people. Other fictional people use a silhouette. There is no deterministic procedural appearance seed or layered renderer. |
| Government | `governance.js`, `office-system.js`, `dynasties.js` | Roman offices and several Mediterranean succession models work. There is no Liu-lineage record, Han court, Han imperial eligibility check, or culture-specific title table for the requested new states. |
| Diplomacy | `agreements.js`, `inventions.js` | A `trade` agreement grants flat treasury each month, and knowledge exchange has its own travel/adaptation rules. Neither moves physical commodities. These mechanisms must be migrated deliberately rather than counted as market trade. |
| Economy and AI | `engine.js`, `strategic-planning.js` | Treasury, food, manpower, tax, recruitment, and fog-aware military AI exist. There are no commodity units, local inventories, prices, shipments, tariffs, or merchant characters. |
| Persistence | `engine.js:upgradeSave`, `view-handoff.js`, dynasty and chronicle migrations | New systems must initialize missing fields without resetting old campaign state, character identities, treaties, or knowledge. |

## Build order and acceptance gates

1. **Han theater and balance.** Add an eastern geographic layer and connected theaters before enabling Han in campaign setup. Historical 49 BCE ruler identity must be bookmark-specific; Han core production, treasury, recruitment, frontier transport cost, and AI reserve behavior must be measurable in simulation tests. Do not represent Western Regions kingdoms as directly administered Han core theaters merely to make the map continuous.
2. **Identity and lineage.** Add structured culture-specific name datasets and deterministic ID allocation. Every persistent event actor must point to a saved character. Model verified Liu descent as parentage/adoption evidence, not a surname string; enforce the orthodox throne invariant at every succession, coup, and save-upgrade entry point.
3. **Portraits.** Give major fixed people individual artwork and generated people stable appearance seeds. Keep portrait visibility tied to existing identity knowledge. Cache small renditions and do not create new random faces while rendering.
4. **Trade state.** Define commodity units, per-market inventory/production/consumption, bounded prices, order escrow, shipments, route legs, tariffs, and transaction records. Migrate the existing flat `trade` agreement to explicit terms before using it to authorize a shipment.
5. **Transport, diplomacy, AI, UI.** Route only across real adjacent markets or maritime links with access checks. AI should use the same inventory/payment/route validation as the player. Expose observed foreign information, not exact hidden stocks. Build market screens only after orders and delivery work headlessly.
6. **Regression.** Run the supplied Han strength, Liu succession, foreign ruler, horse shipment, Silk Road, four-AI-market, and 120-month scenarios, plus existing `npm test` and browser smoke. Verify conservation of goods and payment across save/load and interrupted routes.

## Risks that must be resolved in code

- Adding Han to `FACTIONS` alone would make it appear in some loops but leave it outside `PLAYABLE`, opening leaders, geographic overlays, AI geography, succession, and save migration.
- The current atlas and schematic map cannot honestly show a Eurasian campaign by simply placing off-screen coordinates into the existing Mediterranean projection.
- Reusing the present flat trade-treaty income as commodity commerce would create value without production, inventory, transport, or a payer.
- A Liu surname, high ambition, or marriage is not sufficient evidence for orthodox Han succession.
- Fixed fictional portrait IDs are guarded by saved identity and birth year; a general portrait generator must preserve that isolation across old saves.
