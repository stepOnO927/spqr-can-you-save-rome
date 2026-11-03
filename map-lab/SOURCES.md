# Map Lab · data, licensing and limitations

This is an experimental scene, separate from the playable campaign. It uses a separate initial simulation state and can issue orders and advance months with optional saves compatible with the existing campaign, without replacing its screen. Its use of contemporary land cover is a geographic visualization, not evidence for 49 BCE vegetation or settlement. The marked Via Flaminia is a schematic connection between known places, not a surveyed archaeological route. City coordinates are approximate modern locations of ancient sites.

- MapLibre GL JS 5.9.0, BSD 3-Clause: https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt
- Esri World Imagery, modern satellite imagery: attribution Esri, Vantor, Earthstar Geographics and GIS User Community. Service terms and credits: https://goto.arcgisonline.com/maps/World_Imagery . This prototype uses a third-party hosted service, subject to its availability and terms; it is not bundled or relicensed.
- AWS / Mapzen Terrain Tiles, Terrarium digital elevation model and contributors, sources and attribution: https://github.com/tilezen/joerd/blob/master/docs/attribution.md and https://registry.opendata.aws/terrain-tiles/ . Terrain is present-day elevation, not an ancient reconstruction.
- Natural Earth 1:110m rivers, public domain: https://www.naturalearthdata.com/about/terms-of-use/ .
- Political shapes are the existing adapted AWMC c. 60 BCE (ODbL 1.0) and Seshat Cliopatria v0.2.1 (CC BY 4.0) data, with source details and transformations in ../MAP_SOURCES.md. A shared polygon does not establish separate internal boundaries or an exact allegiance at every point.
- Place identifications: Pleiades ancient place gazetteer https://pleiades.stoa.org/ ; Salona and civil-war context: https://www.armus.hr/en/collections/roman-provincial-collection ; Caesar and Illyricum: https://www.cambridge.org/core/books/abs/illyricum-in-roman-politics-229-bcad-68/construction-of-illyricum-caesar-in-illyricum-and-the-civil-wars-5944-bc/8C06B68D9FE789689625316A7B7A4E5B .
- Fonts: Cormorant Garamond and Manrope, SIL Open Font License 1.1, served by Google Fonts. All UI, markers and banners in this prototype are original CSS/SVG-like geometric designs.

Map tiles and fonts require a network connection. No ancient vegetation layer, detailed dated province subdivision, archaeological road alignment, or exact 49 BCE control survey is claimed.

- html2canvas 1.4.1 (MIT), loaded on demand for screenshot export: https://github.com/niklasvh/html2canvas/blob/master/LICENSE

## Faction identity art direction

All faction marks, banners and counters are original vector drawings used as modern game identifiers; their colors, compositions, and use as faction flags are not claimed as historically attested. Caesar and the Senate are opposing Roman commands, not separate ancient states. Roman stacked discs evoke military standards and the Senate mark evokes the fasces of Republican magistrates. Roman standards and unit shield devices are discussed by the Metropolitan Museum: https://www.metmuseum.org/essays/the-decoration-of-european-armor .

The Egyptian cornucopia is inspired by Ptolemaic coin types: https://resources.metmuseum.org/resources/metpublications/pdf/Pergamon_and_the_Hellenistic_Kingdoms_of_the_Ancient_World.pdf . The Parthian bow evokes Arsacid archer coin types: https://www.metmuseum.org/essays/the-parthian-empire-247-b-c-224-a-d . The Armenian tiara is inspired by the contemporary Artavasdes II coinage documented by the Central Bank of Armenia: https://www.cba.am/en/history-ancient-to-1918 . The remaining spear, palm, and unmarked bands are deliberately general gameplay identifiers, not attributed to any specific historical standard. Mixed-control Roman areas use a neutral shared treatment rather than implying a third sovereign faction.
