# Map provenance and limitations

## Political geography

- **Cliopatria v0.2.1**, Seshat Global History Databank: Roman Republic, Ptolemaic Kingdom, Numidia, Mauretania, Armenia and Parthian Empire, using records whose inclusive year ranges contain −49. Source: [repository and dataset](https://github.com/Seshat-Global-History-Databank/cliopatria); [Bennett et al., Scientific Data (2025)](https://doi.org/10.1038/s41597-025-04516-9). Data licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The data is transformed, grouped and rounded for this game. The authors stress that ancient boundaries are uncertain and maps present one interpretation.
- **Ancient World Mapping Center**, [Roman geography c. 60 BCE](https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_bce_60), derived from the Barrington Atlas and OpenStreetMap; [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Features are grouped geographically and intersected with the Cliopatria 49 BCE Roman extent; coordinates are rounded to four decimal places. The adapted database is `historical-territories.js`. These shapes are a nearby-date reference, not a surveyed set of borders for 49 BCE.
- **Natural Earth**, [public domain](https://www.naturalearthdata.com/about/terms-of-use/), 1:110m land and river vectors, geographically filtered for this map.

## Transformations and game representation

AWMC features are grouped into Italy, Narbonensis, Greece, Hispania, Asia, Syria, Sicily and Africa. Their approximate contemporary extent is intersected with the Cliopatria Roman Republic polygon for −49. The northwest remainder of the 49 BCE Roman outline outside those AWMC shapes is shown as Further Gaul. Other unmatched portions of the Roman outline are left in a neutral base color; they are not treated as separate state ownership.

These sources do not provide a separate, verified 49 BCE polygon for every gameplay theater. Italy, Hispania and the Greek area therefore each contain multiple simulation theaters inside a **single** source-derived outline. Mixed ownership is drawn with stripes; no internal stripe edge represents a territorial boundary. Clicking such an outline selects the nearest theater anchor, and the theater picker allows exact selection. Illyricum has no verified matching polygon in this map and remains playable through the theater picker and its army markers; it is not assigned a misleading Greek outline. Dates, command allegiance, disputed influence, and border precision must not be inferred from the lines as if they were cadastral surveys.

The underlying source datasets have different source scales and chronologies. Coastal clipping, rounding, intersection and omission of unmatched fragments modify them. Starting military numbers and faction control are game rules, not measurements of ancient populations or political consensus.

To reproduce the adapted file, download and unzip the Cliopatria v0.2.1 GeoJSON and download the AWMC `roman_empire_bce_60.geojson` file at the links above. From the project directory, install `polygon-clipping` as a local development dependency and run `node tools/build-historical.cjs <cliopatria.geojson> <awmc60.geojson> historical-territories.js`. The tool selects dated records, groups AWMC feature IDs by geographic location, intersects shapes and rounds coordinates. The original datasets remain available from their respective publishers under the licences above.


## Internal boundaries and Illyricum research

* Džino, *Illyricum in Roman Politics*, chapter 5, describes Caesar’s eastern Adriatic command as lacking strictly defined borders: https://www.cambridge.org/core/books/abs/illyricum-in-roman-politics-229-bcad-68/construction-of-illyricum-caesar-in-illyricum-and-the-civil-wars-5944-bc/8C06B68D9FE789689625316A7B7A4E5B. Šačić Beća discusses the lack of fixed borders and regular administration: https://hrcak.srce.hr/file/443309. The selectable Salona marker represents a game theater, not a territorial polygon. Salona and Issa had different allegiances during the war: https://www.armus.hr/en/collections/roman-provincial-collection. Starting ownership is a game simplification.
* The Rubicon was a boundary of Cisalpine Gaul, but its modern identification is disputed: https://pleiades.stoa.org/indexes-old/river/late-antique?b_start%3Aint=360. The diamond marks the approximate modern Rubicone area, not a surveyed ancient course.
* Castulo / Saltus Castulonensis is a cited reference for the division between Republican Spanish provinces: https://www.mdpi.com/2071-1050/14/18/11581. The diamond marks the approximate Castulo area; a complete boundary cannot be inferred from this point.
* Both diamonds are approximate visual references, not reconstructed border lines.
