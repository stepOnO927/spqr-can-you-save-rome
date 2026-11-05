# Map Lab · data, licensing and limitations

This experimental scene and the original campaign can transfer their current state in the same browser tab and share compatible save slots. The terrain-map scene does not replace the original campaign. Its contemporary land cover is a geographic visualization, not evidence for 49 BCE vegetation or settlement. City coordinates are approximate modern locations of ancient sites.

- MapLibre GL JS 5.9.0, BSD 3-Clause: https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt
- Esri World Imagery, modern satellite imagery: attribution Esri, Vantor, Earthstar Geographics and GIS User Community. Service terms and credits: https://goto.arcgisonline.com/maps/World_Imagery . This prototype uses a third-party hosted service, subject to its availability and terms; it is not bundled or relicensed.
- AWS / Mapzen Terrain Tiles, Terrarium digital elevation model and contributors, sources and attribution: https://github.com/tilezen/joerd/blob/master/docs/attribution.md and https://registry.opendata.aws/terrain-tiles/ . Terrain is present-day elevation, not an ancient reconstruction.
- Natural Earth 1:110m rivers, public domain: https://www.naturalearthdata.com/about/terms-of-use/ .
- Political shapes are the existing adapted AWMC c. 60 BCE (ODbL 1.0) and Seshat Cliopatria v0.2.1 (CC BY 4.0) data, with source details and transformations in ../MAP_SOURCES.md. A shared polygon does not establish separate internal boundaries or an exact allegiance at every point.
- Place identifications: Pleiades ancient place gazetteer https://pleiades.stoa.org/ ; Salona and civil-war context: https://www.armus.hr/en/collections/roman-provincial-collection ; Caesar and Illyricum: https://www.cambridge.org/core/books/abs/illyricum-in-roman-politics-229-bcad-68/construction-of-illyricum-caesar-in-illyricum-and-the-civil-wars-5944-bc/8C06B68D9FE789689625316A7B7A4E5B .
- Fonts: Cormorant Garamond and Manrope, SIL Open Font License 1.1, served by Google Fonts. All UI, markers and banners in this prototype are original CSS/SVG-like geometric designs.

Map tiles and fonts require a network connection. No ancient vegetation layer, complete dated province subdivision, exact 49 BCE road alignment, or exact 49 BCE control survey is claimed.

## Named road reconstructions

The displayed linework is a subset of [Ancient World Mapping Center road data](https://github.com/AWMC/geodata/tree/master/Cultural-Data/roads), derived from the Barrington Atlas and AWMC modifications to OpenStreetMap, © AWMC and OpenStreetMap contributors, available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The derived database is `../republican-roads.js`, generated from AWMC `roads.geojson` blob `e5b53dfb7aab621eb25d31d66457562240524ff2` by `../tools/build-republican-roads.mjs`. It selects named features 637 (Via Appia, Rome–Capua), 1467 (Via Aemilia), and 1480 and 1550 (Via Flaminia), preserves the source feature IDs and source-map attributes, and rounds coordinates to five decimal places. Decimal precision is not a claim of survey accuracy.

The [Umbrian heritage authority](https://sabapumbria.cultura.gov.it/archeologia-e-territorio/archeologia-via-flaminia/) dates Via Flaminia's construction to 220–219 BCE. [LacusCurtius' reproduction of the Britannica entry](https://penelope.uchicago.edu/Thayer/E/Gazetteer/Periods/Roman/Topics/Engineering/roads/Aemilia/Britannica_1911%2A.html) dates Via Aemilia to 187 BCE. [UNESCO](https://whc.unesco.org/en/list/1708) dates the original Rome–Capua Via Appia to 312 BCE. These dates establish the historical roads, not the exact date of every mapped segment: the AWMC lines are later reconstructions, may incorporate changes or uncertain alignments, and are not presented as a surveyed 49 BCE network. Other unnamed or potentially later roads have not been imported. The lines are informational and do not change the campaign's abstract movement graph.

- html2canvas 1.4.1 (MIT), loaded on demand for screenshot export: https://github.com/niklasvh/html2canvas/blob/master/LICENSE

## Faction identity art direction

All faction marks, banners and counters are original vector drawings used as modern game identifiers; their colors, compositions, and use as faction flags are not claimed as historically attested. Caesar and the Senate are opposing Roman commands, not separate ancient states. Roman stacked discs evoke military standards and the Senate mark evokes the fasces of Republican magistrates. Roman standards and unit shield devices are discussed by the Metropolitan Museum: https://www.metmuseum.org/essays/the-decoration-of-european-armor .

The Egyptian cornucopia is inspired by Ptolemaic coin types: https://resources.metmuseum.org/resources/metpublications/pdf/Pergamon_and_the_Hellenistic_Kingdoms_of_the_Ancient_World.pdf . The Parthian bow evokes Arsacid archer coin types: https://www.metmuseum.org/essays/the-parthian-empire-247-b-c-224-a-d . The Armenian tiara is inspired by the contemporary Artavasdes II coinage documented by the Central Bank of Armenia: https://www.cba.am/en/history-ancient-to-1918 . The remaining spear, palm, and unmarked bands are deliberately general gameplay identifiers, not attributed to any specific historical standard. Mixed-control Roman areas use a neutral shared treatment rather than implying a third sovereign faction.

### Egypt: joint rule and official reports
The 49 BCE opening recognizes Cleopatra VII and Ptolemy XIII as joint rulers, based on the Metropolitan Museum of Art chronological table: https://resources.metmuseum.org/resources/metpublications/pdf/Pergamon_and_the_Hellenistic_Kingdoms_of_the_Ancient_World.pdf. In-game correspondence and subsequent succession are simulated, not historical evidence; official claims may be unverified or outdated.


### Galatian and Bosporan courts

Deiotarus’ western Galatian rule and relationship to Rome are summarized by the [Oxford Classical Dictionary](https://academic.oup.com/edited-volume/61673/chapter-abstract/548724362); Pharnaces II’s Bosporan kingship is documented by the [Royal Library of Belgium’s numismatic catalog](https://silver.kbr.be/Pharnaces_II_of_Pontus_%28king_of_the_Bosporan_Kingdom%2C_63-47_BC%29). Pleiades describes [Gordion](https://pleiades.stoa.org/indexes-old/settlement/hellenistic-republican?b_start%3Aint=1900) and [Panticapaeum](https://pleiades.stoa.org/indexes-old/index-by-select-time-periods/roman?b_start%3Aint=15860); Pleiades content is CC BY 3.0, credited to its contributors. Approximate theater markers are game aids and do not claim that Gordion was Deiotarus’ capital or define political borders. The broad source polygons are not evidence of their exact internal limits. Routes, resources, forces, and later events are simulation abstractions.

### Eastern operational theaters

Thebes (Diospolis Magna) and Ecbatana are mapped as approximate ancient places. [Pleiades, Diospolis Magna/Thebai](https://pleiades.stoa.org/places/786017), creators T. Wilfong, S. E. Sidebotham and J. Keenan and contributors (CC BY 3.0), places Thebes at approximately 25.665° N, 32.632° E. [Encyclopaedia Iranica, Ecbatana](https://www.iranicaonline.org/articles/ecbatana/) identifies the Median city and Parthian royal residence around 34.8° N, 48.52° E. These are evidence of places, not precise political borders or the location of either claimant in 49 BCE. The northern/upper Egyptian and Mesopotamian/Median theaters and their links are game abstractions within the existing broad historical outlines. Historical source polygons are shared rather than partitioned with invented lines.

### Simulated claimant commands

The alternative Egyptian and Parthian claimant banners reuse each realm’s original game motif with distinct colors. These are original game identifiers, not historical flags or evidence that these particular alternate-history uprisings occurred. Territorial control, army strength, aid and later outcomes are simulated.
