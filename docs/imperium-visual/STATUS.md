# IMPERIUM VISUAL — audit, evidence and status

Branch scope: Stages A–C in full, D–G for the classic campaign and the Han campaign, a first
pass on the Campaign Atlas, and Stage I checks. Evidence: `test/visual/imperium-visual/`.

## Audit of the previous interface (Stage 2)

Captured at 1600×900 before any change (left half of sheets 01–14).

| Finding | Where |
|---|---|
| Everything is beige parchment; controls and documents are the same material | All classic screens |
| Type at 6–10px for labels, resources and buttons | Top bar, toolbar, rail, Atlas mast |
| Victory terms and next-month forecast were rendered *behind* the map and never visible on desktop | Classic campaign |
| The guide box sat over the Legion Designer header and Chessboard title | Full-screen tabs |
| Unicode glyphs (▣ ⚔ ✠ § ◇ ¶ ✉ ✦) used as icons | Rail, brand, mail |
| Sender and family portraits as 42–54px circles | Mailbox, genealogy, Atlas |
| Every letter identical regardless of kind | Mailbox |
| Army markers were flat labelled boxes | Map |
| Three unrelated palettes: beige (classic), teal (Atlas), brown (Han) | Across entry pages |
| Default browser selects and buttons inside panels | Government, setup |

## What changed

| Area | Result | Sheet |
|---|---|---|
| Main menu | Title card on basalt; one primary action | 01 |
| HUD and map | Resource icons, segmented map modes, command bar, coast wash, vexilla, visible victory/forecast | 02 |
| Military | Unit cards; selected army card | 03 |
| Strategy, Legion Designer, Operations | Dark boards, ledger rows, stone plaques | 04–06, 17 |
| Government and families | Ruled institutional sections; framed portraits in the family tree | 07 |
| Chessboard | Paper dossier on a dark table | 08 |
| Han | Lacquer, cinnabar, bamboo slips; seal mark; own type | 09, 12 |
| Mailbox | Six document types with their own seals; framed sender portrait | 15–17 |
| Campaign Atlas | Shared palette, larger character portraits (first pass only) | 13–14 |

## Checks run (Stage I)

- `npm test`: 986 of 986 pass, same count as before the change.
- `node --check` on every tracked script; `scripts/audit-inventory.mjs`; `scripts/inspector-regression.mjs` — all pass.
- Browser, classic campaign, no page errors at 1920×1080, 1600×900, 1366×768, 1024×768 (touch),
  390×844 (touch), and Poki frames 640×360, 836×470, 1031×580: Start and Advance inside the
  frame, no page scroll, tapping an army opens the panel, mailbox opens and closes.
- Local replicas of `tools/short-screen-smoke.mjs` and the campaign/Han parts of
  `tools/save-transfer-controls-smoke.mjs` pass; a click-through of march order, recruit, every
  tab, focus selection and mail passes at 1280×720.

**Not run locally:** the ~100 Playwright smoke scripts in `tools/` and the Poki build (no Node
Playwright or esbuild in the authoring sandbox). They run in GitHub Actions on the pull request.

**Campaign Atlas caveat:** MapLibre could not be downloaded in the authoring sandbox, so the
Atlas was checked with a stand-in map object. Its panels and markers were seen; the real map
tiles under the new chrome were not. Sheets 13–14 show that stand-in background.

## Changed files

New: `imperium-visual.css`, `han/imperium-han.css`, `ui-icons.js`, `ui-motion.js`,
`docs/imperium-visual/*`, `test/visual/imperium-visual/*`.

Edited (presentation only): `index.html`, `han/index.html`, `map-lab/index.html` (stylesheet
links, body class), `app.js` (icons in rail, HUD and mail button; entrance hook), `map.js`
(standards, sea and coast layers), `mail-ui.js` (document-type attributes and seal text),
`map-lab/lab.css` (teal values retinted to basalt; no rule added or removed).

No simulation, AI, save, localisation or analytics module was touched.

## Remaining design issues

1. **Campaign Atlas structure.** Diplomacy, character dossiers, the government tree, offices,
   research and trade still live in a 320px side panel with 9–10px type. They need their own
   compositions (leader portraits facing each other, treaty terms, an institutional chart).
   This is the largest open item and should be its own staged change with the real map loaded.
2. **Character dossier.** Portraits are larger, but there is no full dossier layout (history,
   relationships, career record, interactions) yet.
3. **Government tree** is still a list of ruled sections, not a chart.
4. **Han map labels** overlap heavily at the All-Eurasia zoom (pre-existing).
5. **Fonts.** No display face is bundled; titles fall back to Palatino/Georgia-class system
   fonts. Bundling one licensed display font (WOFF2) would lift every title.
6. **Classic map labels** still collide where theatres are close (Achaia / Asia Minor).
7. **War Council, victory screens, trade, research**: restyled only as far as they inherit the
   shared components; none has had its own pass.
8. **Reference study** used published write-ups, not screenshot measurement (see
   `REFERENCE_ANALYSIS.md`).
