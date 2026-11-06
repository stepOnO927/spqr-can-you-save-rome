# Map Lab validation notes

## Repeatable interaction measurement

The browser workflow records a 1920 × 1080 screenshot and six-second requestAnimationFrame samples for idle, repeated dragging, and wheel zoom, with terrain hillshade enabled and disabled. It verifies that panning and zooming move a map marker, that the relief preference survives a reload, and reports callback cadence, frame-time percentiles, long intervals, tile-request outcomes, browser version, CPU and WebGL renderer in `map-benchmark.json`. Download the workflow's `browser-smoke-evidence` artifact for the actual run and image. CI uses headless Chromium with SwiftShader software rendering; callback timing is not a measurement of displayed frames or a guarantee of performance on player hardware. Tile availability and runner load can change the result. The earlier notes below are historical snapshots.

The same workflow exercises the in-game screenshot button, including an unavailable screenshot library followed by a retry. It checks that the downloaded PNG is 1920 × 1080 and that its map area has varied pixels; the image is saved as `capture-control-1920x1080.png` in the artifact. Pixel variety is not a substitute for visual inspection. If map data has not settled after eight seconds, capture proceeds with a warning that the image may be incomplete; the screenshot library still requires network access.

- Earlier local browser: an initial 3-second requestAnimationFrame sample reported approximately 52 fps, including startup. The viewport size and hardware were not captured; this historical sample is not a benchmark or guarantee for other devices.
- 1366 × 768: browser screenshot captured. 1920 × 1080: screenshot exported by html2canvas 1.4.1 from the rendered DOM and WebGL canvas at scale 1. The export is a browser-generated composite; it does not use the external full-page screenshot path that drops the WebGL map.
- Browser flow: select XIII, order a march to northern Italy, advance a month, see casualties and the actual battle report, save to a test slot, advance again, reload and observe the February state. Switch to Chinese. Local automated engine tests: 15 passing.
- Remaining work: full bilingual coverage, complete Stage A province selection and command coverage, detailed location sourcing, objective and diplomatic systems, tested supply and military map modes, character art, a sustained interaction performance test, and full integration into the campaign screen. The existing campaign screen remains available and uses compatible save slots.
- The scene depends on network-hosted imagery, elevation tiles, fonts, MapLibre, and (for export) html2canvas. The prototype is not an offline-ready release.

## Phase V operational-flow check

At 1366 × 768 the opening camera, army selection, legal-destination highlight, route preview, confirmation, monthly advance, AI movement, casualties, owner/loyalty changes, and battle report were exercised in the browser. Screenshots A, B and C show the opening, preview, and battle result. Battle calculations occur immediately within a month; a live multi-tick battle and smooth animated travel are not simulated. The existing campaign remains a separate screen. Chinese and English army and battle panels were checked. The 17 Node tests pass, including preview purity and saved battle evidence. Historic boundaries and Rubicon location remain approximate, as documented in SOURCES.md.

## Phase VI faction identities

At 1366 × 768, inspected the default campaign, selected Caesarian and Senatorial armies, faction directory, and a zoomed northern Italian view. Separately inspected Ptolemaic, Parthian and Armenian faction information and map locations. Tested a Caesarian movement and battle, Chinese language switching, and the original campaign's diplomacy panel. The 18 Node tests include a check that major powers have distinct identity colors and motifs. The artwork is original interpretive UI, not a reconstruction of documented flags; see SOURCES.md for historical inspiration and qualifications.

## Phase VII onboarding and help

At 1366 × 768, exercised the Chinese beginner flow from a new game through selecting Rome and Legio XIII, previewing and confirming a legal march, advancing into a real battle, opening the battle report and resource explanation, and entering free play. Checked automatic time progression and battle pause, speed controls, wrong-action feedback, standard starting resources, tutorial restart/skip, help search and mid-tutorial language switching. These checks were performed by the developer; no independent novice playtest has yet been conducted. The tutorial belongs to the separate map-lab prototype; the original campaign remains available. Commander loyalty, research and construction are not implemented in the prototype, and supply limits are informational.

## Phase VIII interaction checks

Browser-checked the guided Caesar campaign in Chinese and English: select the legion, inspect statistics, preview and confirm a march, advance a month, inspect the real battle and city, and open resource guidance. Tested the Chronicle, save/load, restarting the tutorial, and language switching. An automated defeat test and the existing peace/interrupted-order test exercise alternate outcomes at engine level. The full UX still needs independent novice testing; the prototype remains separate from the original campaign, and its help identifies commands only available in the original campaign.

## Phase VIII completion and Phase IX correspondence foundation

Browser-tested recruiting in Cisalpine Gaul, selecting the resulting army, improving relations with Egypt, sending a letter, advancing four months to an actual declined response, and loading an earlier save with the letter pending. Tested the searchable gameplay/history categories and control highlight, and opened the original campaign. Engine tests cover costs, delay, pending saves, separate senders, disappearance of a government, refusal, no reply, and unverified responses. Ordinary diplomacy still resolves immediately; only direct inquiry is delayed. Full character, private-intelligence, espionage, succession and portrait systems are not implemented. No independent novice test has yet been conducted.

## Phase IX character and intelligence check

The 49 BCE character catalog records historical names, roles, uncertain birth ranges and source links. Portraits are original generated reconstructions; see assets/portraits/SOURCES.md. The campaign serializes actual character health and officeholders separately from each faction's reports. Health affects a named commander's battle effectiveness; annual illness, recovery, death and limited leadership succession are simulated game events. Egypt may experience a co-ruler dispute; intelligence can remain stale. Player missions, including letters, spies, envoys, travelers, audiences and allied exchange, consume resources and resolve on the monthly tick. Spies can be captured or detected; reports can conflict or be wrong. The AI uses stored strength reports or opening estimates rather than an exact current foreign total for its strategic choices.

At 1366 × 768, exercised character cards, hidden foreign troop counts, recruiting, tutorial battle, spy dispatch, actual detection, a lost/unanswered letter, a traveler report, save/load and language switching. Automated checks cover knowledge isolation, conflicting reports, old-save migration, health effects, succession, and correspondence outcomes. Original campaign remains available; the full historical map is still the separate map-lab prototype. This is a limited simulation: it does not yet model all government roles, individual diplomatic relationships, political ambitions, historical biographies, every type of succession or independent verification; no independent novice playtest has been completed. Foreign army markers show dated reports rather than authoritative current positions; observations update at controlled frontiers and stale reports remain. The UI is client-side, so saved game files contain simulated world state and are not a security boundary.

## Additional map modes

Browser-tested switching between political, terrain, military, supply, economy and loyalty overlays, their bilingual labels and their mode-specific legends, followed by selecting an army. Supply remains informational and does not add an operational penalty. Economic and loyalty views show only player-controlled theaters; mixed historic polygons aggregate known player theaters and are not new boundaries.

## Dated army sightings

Automated tests verify that an unseen foreign move does not change a player report, frontier observation updates it, and an army disappearing from the world does not silently erase an old sighting. Browser-tested the atlas tutorial and an original campaign opening after this change. Sightings are coarse strategic theater reports, not detailed line-of-sight simulation.

## Roman campaign selection

Browser-tested starting the Senate/Pompeian command at standard difficulty, its own military counters and limited foreign intelligence, its strategic objectives and its commander profile. The player choices are restricted to the two Roman commands. The interactive opening tutorial currently teaches the Caesarian campaign; the Senate campaign starts in free play.

## Atlas taxation

Browser-tested selecting a tax rate in the resources panel, advancing a month, and observing the actual treasury, food and selected-tax state. Tax and loyalty changes use the existing shared campaign engine.

# Phase VIII — Gameplay UX and tutorial recovery (2026-11-06)

Tested in a local browser through the visible controls:

| Scenario | Result |
| --- | --- |
| New Caesarian and Senatorial campaigns | Both opened with their own armies, objectives and tutorial text. |
| Beginner and Standard | Beginner received a limited resource bonus and Feather route advice; Standard kept the original opening resources. |
| Hard and Expert | Both were selectable; the same Caesarian opening month produced treasury/food changes of −3/−5 on Hard and −4/−6 on Expert. |
| First movement and cancellation | Previewed a friendly route, issued the march, cancelled it, and saw the tutorial return to the planning step. |
| First battle and tutorial defeat | The Senatorial levies lost at Cisalpine Gaul; the guide required opening the battle report and continued after the defeat. |
| Invalid movement | Unconnected destinations appeared disabled with an explicit reason; the order button explained its prerequisites. |
| Siege and occupation | A Caesarian force entered a two-month siege of Latium, could not march during the siege, and occupied it when the timer completed. |
| Completed objectives | All three Senatorial objectives were checked in one campaign; the interface still explained that final victory requires total enemy collapse and a courier delay. |
| Language switching | Switched between Simplified Chinese and English during the Senatorial tutorial; the step and game controls translated without losing progress. |
| Save and load during tutorial | Saved on the route decision step and loaded the slot; the same tutorial step was restored. |

Automated tests cover difficulty resource effects, tutorial branching and persistence, Roman victory conditions, hidden enemy intelligence, movement, combat and save migration. This remains a strategic simulation; enemy reports can be wrong, and neither a tutorial milestone nor three objectives alone is a final victory.

