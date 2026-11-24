# IMPERIUM VISUAL — reference analysis (Stage A)

What SPQR adapts from five commercial strategy games, and why. Nothing here is copied: no art,
icons, logos, screenshots or layouts from these games are in the repository.

**Method and its limit.** This analysis rests on the developers' own published UI write-ups,
interviews and press coverage (linked below), not on a frame-by-frame study of screenshots. It
records principles, not measurements. Anything that needs pixel-level study of a reference
(exact proportions, type sizes) is still open and is listed in `STATUS.md`.

| Game | Principle taken | Where it lands in SPQR | Deliberately not taken |
|---|---|---|---|
| **Anno 117: Pax Romana** | The UI team aimed for a period-appropriate interface that does *not* look aged or worn, kept backgrounds understated so content can sit on them, and built everything from one design system. | Clean basalt and bronze chrome instead of distressed parchment; one token file (`imperium-visual.css` §1) for every screen; no fake wear, stains or torn edges. | Its fabric texture and its icon set. |
| **Total War: Three Kingdoms** | The art team moved away from skeuomorphic panels and from "parchment", and let one cultural material (ink) carry the whole interface. Reviewers singled out portraits and the amount of detail kept in pop-ups rather than on screen. | The Han screens get their own material language (lacquer, cinnabar, bamboo slips, silk) rather than a recoloured Roman skin; court appointments are literally written on slips. | Flowing-ink effects and painted portraits — that is their signature, and SPQR has no painted art to support it. |
| **Crusader Kings III** | Character focus as the art-direction starting point; "clean, with breathing room"; people shown large against context. | Portraits become framed rectangles (letters, genealogy, atlas character cards) instead of 42–54px circles; a letter is laid out around its sender. | 3D portraits, the court scene, the radial menus. |
| **Europa Universalis V** | Dense information made navigable by structure: map modes as a first-class control, alerts and unit panels that collapse instead of covering the map. | Map mode is a segmented control at a fixed corner; standing information (victory terms, next-month forecast) is a slim strip that yields to the panel; the guide folds to a chip on full-screen boards. | Its panel density — SPQR targets Poki frames as small as 640×360. |
| **Total War: Rome II** | Culture-specific unit cards: Mediterranean factions as flat pictograms in a restricted palette, larger and more stylised than a text row. Reviewers also warned that icon-only cards hurt legibility. | Army rows are cards with a standard, a name and one focal number; map armies are vexilla on poles in faction colours. Every icon in the rail keeps a text label. | The pottery-figure illustration style. |

## Compositional rules derived

1. **Materials mean something.** Dark chrome is for controls; paper is for documents. A screen
   that is all one material has no hierarchy.
2. **One primary action per surface**, in burgundy. Everything else is quiet.
3. **Two type voices.** Spaced capitals for institutions and places; a text serif for people and
   prose; a sans with tabular figures for every number.
4. **The map is the screen.** Chrome hugs the edges; nothing central is permanent.
5. **Culture changes the material, not just the hue.** Rome: stone, bronze, wax, parchment.
   Han: lacquer, cinnabar, bamboo, silk.

## Sources

- Anno Union — "DevBlog: The User Interface Team and a deeper dive into the visuals": https://www.anno-union.com/devblog-the-user-interface-team-and-a-deeper-dive-into-the-visuals/
- Ubisoft News — "Anno 117: Pax Romana Accessibility Spotlight": https://news.ubisoft.com/en-gb/article/2FfSSEUp1jtg9isC9NxowP/anno-117-pax-romana-accessibility-spotlight
- TheSixthAxis — interview on Total War: Three Kingdoms: https://www.thesixthaxis.com/2018/08/16/interview-exploring-ancient-china-in-total-war-three-kingdoms/
- GamesBeat — "How Creative Assembly conceived the art for Total War: Three Kingdoms": https://gamesbeat.com/how-creative-assembly-conceived-the-art-for-total-war-three-kingdoms/
- TechSpot — Total War: Three Kingdoms review: https://www.techspot.com/review/1854-total-war-three-kingdoms/
- Paradox forum — "CKIII Dev Diary #28: Art Focus": https://forum.paradoxplaza.com/forum/threads/ckiii-dev-diary-28-art-focus.1393627/
- GameWatcher — Europa Universalis V update 1.1 interface changes: https://www.gamewatcher.com/news/europa-universalis-5-rossbach-update-1-1-hidden-alerts-army-navy-templates-quality-of-life-changes
- PC Gamer — Total War: Rome II previews: https://www.pcgamer.com/uk/total-war-rome-2-preview-ambush-and-betrayal-in-the-ancient-world-rts and https://pcgamer.com/total-war-rome-ii-preview-a-run-down-of-new-features-in-creative-assemblys-latest
- GamesRadar — Total War: Rome II review: https://www.gamesradar.com/uk/total-war-rome-2-review
