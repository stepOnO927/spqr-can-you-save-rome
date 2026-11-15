# IMPERIUM VISUAL — design system (Stage B)

> A premium historical grand strategy game, not an AI-generated admin dashboard.

Source of truth: `imperium-visual.css` (tokens in §1). Han campaign page: `han/imperium-han.css`.
Icons: `ui-icons.js`. Entrance motion: `ui-motion.js`. All four are presentation only.

## Materials

| Material | Tokens | Used for | Never for |
|---|---|---|---|
| Basalt | `--iv-basalt-950…600` | Frames, panels, bars, lists | Documents |
| Bronze / aged gold | `--iv-bronze`, `--iv-gold` | Rules, icons, titles, the focal number | Fills |
| Burgundy | `--iv-burgundy*` | The one primary action; current selection | Decoration, body text |
| Limestone / parchment | `--iv-limestone`, `--iv-parchment*` | Letters, dossier sheets, strategy plaques | Panels and bars |
| Han lacquer / cinnabar | `--han-lacquer-*`, `--han-cinnabar*` | Han frames and primary actions | Roman screens |
| Bamboo / silk | `--han-bamboo`, `--han-silk` | Han records, map ground | Buttons |

Signal colours (`--iv-ok`, `--iv-warn`, `--iv-bad`) appear only where they carry meaning.

## Type

- **Display** `--iv-display`: titles, places, institutions. Spaced capitals.
- **Serif** `--iv-serif`: people, prose, letters.
- **UI** `--iv-ui`: labels, buttons, every number (tabular figures).
- **Han** `--han-display` (Kai) for titles, `--han-serif` (Song) for text.
- Scale 11 / 12 / 13 / 15 / 18 / 22 / 28. Nothing under 11px carries information.
- Web fonts are optional. The stacks are designed to work from system fonts because the Poki
  build ships without network fonts.

## Space and frame

4px grid (`--iv-1…8`). Top bar 58px, rail 72px, command panel 348px (312px at 1366). Corners are
square everywhere; a border radius is used only for wax seals and unread dots.

## Components

- **Top bar** — brand, campaign, six resources (icon, figure, label), language, mail.
- **Rail** — icon over label; active item is burgundy with a gold edge.
- **Command panel** — sticky title band, ledger rows (label left, figure right), unit cards.
- **Command bar** — date first, then controls; *Advance* is the only burgundy button.
- **Map** — coast wash, hairline borders, capitals for theatres, italic for cities, vexillum
  standards; reported armies are dashed.
- **Documents** — one paper per kind of letter: parchment (diplomatic), wax tablet (military),
  ruled register (government/treasury), private sheet (personal), bordered card (invitation),
  heavy-ruled proclamation (war, ultimatum). Each carries its own seal.
- **Boards** — National Strategy: stone plaques on a dark table. Legion Designer: roster,
  formation ledger, muster figures. Chessboard: paper dossier on the table.

## Motion

120ms for hover and press, 200ms for a surface appearing. A surface animates once, on the render
where it first appears (`ui-motion.js`), because the campaign view is rebuilt every month.
`prefers-reduced-motion` removes all of it.

## Rules

1. No new colour without a token. No hex values outside §1 except document inks.
2. No rounded cards, glass, neon, emoji or gradient fills.
3. A new screen states its one primary action before it is styled.
4. Presentation files never import simulation modules.
