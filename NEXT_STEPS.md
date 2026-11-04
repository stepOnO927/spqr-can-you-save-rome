# SPQR — outstanding work and evidence

This is a development tracker, not a completion claim. The player chooses a Roman command; the independent countries remain AI-controlled. The 49 BCE atlas and the original campaign share a saved simulation, with a reversible transfer between views. New eras, religion and technology expansion remain outside the current visual and Phase IX work.

## Phase IX — current state and remaining work

| Requirement | Evidence in the current game | Still needed |
| --- | --- | --- |
| Historical figures and portraits | The catalog includes the 18 priority figures and individual generated portrait assets. Reconstructions and references are identified in `assets/portraits/SOURCES.md`. | Complete historical profile fields and source-by-source review; artistic reconstructions are not verified likenesses. |
| Health and succession | Aging, wounds, illness, death, co-rule, a limited Egyptian dispute, temporary deputies, succession plans and Roman political plots affect the simulation. | Broader contested inheritance, regency and civil-war outcomes; do not present simulated events as history. |
| Foreign knowledge | Dated, faction-specific reports, limited frontier sightings, contradictory evidence, stale intelligence, and independent source families are implemented. Actual state remains separate in client-side saves. | Continue auditing every UI and AI decision for information leaks. Local saves contain the true state and are not a security boundary. |
| Diplomacy and espionage | Delayed letters may be lost, refused or answered; spies, travelers, envoys, audiences, ally exchanges, claimant contacts and counter-investigations have costs and outcomes. Reports may be wrong. | Expand interactions and consequences without exposing hidden status. Political relationships and diplomacy remain simplified. |
| Characters on the map | Reported leadership and dated observed commanders can be inspected; sightings do not track unseen changes. | Broaden reporting of offices and political relationships without turning reports into omniscient state. |
| History versus simulation | Profiles label historical biographies separately from simulated health, travel, political office and reports. | Review date uncertainty, biographies and sourcing for every field before presenting additional historical claims. |

## Earlier phases still requiring work

- Continue verifying the atlas-to-campaign transition and the full command flow in both languages. The atlas currently remains a separate view, with the original campaign available.
- The Caesarian tutorial is interactive; the Senate choice starts in free play. An independent beginner playtest, broader accessibility and small-screen checks remain outstanding.
- Some systems are deliberately simplified: theater supply capacity is descriptive, battles resolve immediately rather than over several turns, and terrain/control boundaries are approximations where sources do not support a precise border. Maintain clear explanations and improve supported mechanics where appropriate.
- Continue historical boundary and geographic research only where defensible sources and licenses are available. `MAP_SOURCES.md` and `map-lab/SOURCES.md` document current source limitations.
- The master directive contains substantially wider campaigns and systems. These are not complete; prioritize the current 49 BCE Roman campaign and Phase IX before expanding the scope.

## Verification and release

Run `npm test` and the GitHub browser workflow for changes to gameplay. The workflow exercises both Roman starts, map interactions, save and view transfer, diplomacy, correspondence, characters, a 1920 × 1080 capture and map performance. Automated checks do not replace an independent usability test or guarantee that every feature in the original directives is complete. Verify the live GitHub Pages version after deployment. Historical claims and third-party map data need the sources and licensing documented alongside them.
