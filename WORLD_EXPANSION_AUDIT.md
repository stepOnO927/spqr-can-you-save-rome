# Territory coverage audit — 15 November 2026

Run `node scripts/audit-territories.mjs` to reproduce the structural counts below.

| Surface | Current model | Classification and gap |
| --- | --- | --- |
| Main campaign | 24 playable theaters, 28 routes | All route ends resolve and all theaters have a route. Theater ownership and movement use `state.regions` and `data.js` IDs. |
| Map Lab | 15 historical polygon features | 14 have associated theater IDs. `roman-extent` has none: it is a broad historical reference overlay, **not** an ownerless playable territory. |
| Playable theaters without historical polygon | `illyricum`, `galatia`, `bosporus` | These are simulated theaters with separate markers or anchors. Their historical boundaries are not asserted by current polygon data. |
| Other land visible in Map Lab | Terrain and basemap | No claim of political vacancy or playable coverage is justified. Each area needs sourced classification and a gameplay route before it becomes a territory. |
| Local entities | One sourced city-state, Massilia | It is a point inside the broad Narbonensian theater, with separate local sovereignty, militia, diplomacy, occupation and administration. No precise city-state border is asserted. |
| Han campaign | 94 playable regions, 124 routes | All route ends resolve. The SVG map creates clipped Voronoi cells from region coordinates; 44 regions have extra geometry anchors and the others fall back to their coordinates. Lack of extra anchors does not mean an invisible region. |

## Architectural findings

- The root SVG map renders historical coastlines and schematic theater anchors, while Map Lab uses historical polygons and separate markers. Neither is a complete cadastral map. Its displayed boundaries must not be treated as precise legal borders.
- The single mutable source of theater control is `state.regions[].owner`. Combat, economy, recruitment, AI, knowledge, and saves read it. Before this work, legal title and military occupation were not separately represented.
- Theater records now carry legal title, military occupier, administrative status and control date. Local entities are nested inside their host theater so their sovereignty cannot silently overwrite the theater owner.
- Map Lab's political layer skips historical features without a `regions` association. Clicking a multi-region feature offers theater choices. A polygon association alone must not grant territorial ownership.
- The Han campaign has a distinct engine, military graph and dependency system. Main-campaign territory changes must not silently alter Han saves or claim that its Voronoi borders are surveyed boundaries.

## Implementation order

1. **Implemented:** legal sovereign, occupier and administrative status on theaters, with save migration and a single capture transition.
2. **Implemented:** show those layers in both campaign inspectors while retaining foreign fog of war; occupied tax and administration now have real costs and progression.
3. **Partly implemented:** sourced Massilia city-state with local diplomacy, port access, militia, siege, occupation and administration. Supply corridors and political border rights remain to be modeled.
4. Expand the registry and movement graph by region only after classification and historical review. Add diplomacy, local actors, organizations and social interactions incrementally through the existing systems.

This audit measures structural coverage, not land area. It deliberately reports no percentage of world land covered.
