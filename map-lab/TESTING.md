# Map Lab validation notes

- Local browser: initial 3-second requestAnimationFrame sample reported approximately 52 fps, including startup. The viewport size and hardware were not captured for that sample; this is not a benchmark or a guarantee for other devices. No sustained pan/zoom frame-time benchmark was completed.
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
