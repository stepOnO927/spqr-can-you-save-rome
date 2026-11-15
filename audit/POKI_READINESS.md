# Poki readiness

The **dedicated package** is produced by [build-poki.mjs](../scripts/build-poki.mjs). The public GitHub Pages/Cloudflare pages are development and historical-source views; they still request external map imagery, fonts or analytics and must not be uploaded to Poki as-is. The package removes those requests, substitutes local coastline data for remote raster and DEM tiles, and includes the platform SDK loader. The offline atlas labels its geography as approximate.

Official checks consulted: [Poki requirements](https://developers.poki.com/guide/requirements-quality), [HTML5 SDK](https://developers.poki.com/guide/sdk-html5), [SDK event order](https://developers.poki.com/guide/sdk-overview), and [external resources policy](https://developers.poki.com/guide/external-resources-policy).

| Requirement | Verified status | Evidence and remaining condition |
|---|---|---|
| 16:9 mobile/touch | PARTIAL | Roman Advance and page bounds passed at 640×360, 836×470 and 1031×580 in the dedicated [package run 43667759424](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759424). Han territory and atlas marker taps passed at 640×360. The full source browser suite still needs a green result. Roman Advance, Han territory, and atlas marker are exercised. |
| Short onboarding | PARTIAL | Roman and atlas start buttons are in the first viewport; full tutorial completion and retention require playtesting. |
| Load size | PARTIAL | The latest artifact has **330 files, 4,895,228 bytes uncompressed** including vendor code; the [GitHub Actions ZIP artifact](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759424/artifacts/14142827441) is 2,732,822 bytes. Local requests in one tested visit totaled Roman 1,397,970 B, atlas 2,470,756 B and Han 390,611 B (browser cache and transfer compression may change network bytes). Source masters and unused 512px portraits are excluded. |
| Incognito / storage denied | PARTIAL | [safe-storage.js](../safe-storage.js) keeps the current session playable and labels volatile saves. The three-entry browser flow is a release gate; check latest [browser run](https://github.com/stepOnO927/spqr-can-you-save-rome/actions). |
| SDK lifecycle | PARTIAL | Mock SDK test observed `gameLoadingFinished → gameplayStart` in **all three** entries, plus Roman `gameplayStop → commercialBreak → gameplayStart` after menu return in [run 43667759424](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759424). Real Poki Inspector event log remains required. |
| No unapproved external requests | PASS in automated package smoke | Three entry points produced zero unauthorized requests in [cloud run 43667759424](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43667759424). The SDK URL is the documented platform integration. |
| Local map JS/CSS/images | PASS in automated package smoke | MapLibre and html2canvas are copied locally; the atlas uses [poki-style.js](../map-lab/poki-style.js) and local [rome60.js](../rome60.js). |
| Page scrolling | PARTIAL | 640×360, 836×470 and 1031×580 Roman frames had no document scroll in cloud Chromium. More mobile/tablet devices need platform testing. |
| Save experience | PARTIAL | Session-only warning is visible when storage is blocked; manual file transfer is available. Cross-visit persistence cannot be guaranteed in privacy mode. |
| No debug tools in production package | PASS by build rule | The builder excludes the Inspector UI, test files, scripts and source portrait masters. The package artifact should be inspected before upload. |
| External links and privacy | BLOCKED for submission | Source links are routed via `PokiSDK.openExternalLink`; the owner must verify Poki's external-link and privacy-policy expectations for the submitted build. No legal policy has been invented here. |
| Store thumbnails and live review | BLOCKED for submission | Static and animated thumbnails and an actual Poki Inspector upload/review are outside this repository test. |

## Release decision

The automated package check passed a mock SDK and network gate. **Do not treat that as Poki approval.** Upload only the validated package artifact from [Poki release validation](https://github.com/stepOnO927/spqr-can-you-save-rome/actions), then inspect the live SDK event stream, touch controls, privacy/link handling and store assets on Poki's platform. A failing required cloud check blocks that package artifact.

## Separate readiness assessments

| Dimension | Assessment | Evidence or missing proof |
|---|---|---|
| Technical | **Close to ready** | The dedicated cloud build passes three-entry touch, mock SDK, package size and zero unauthorized-request checks. Full browser regression and official Poki Inspector still gate it. |
| Content and licensing | **Needs owner review** | [Map data sources](../MAP_SOURCES.md), [atlas sources](../map-lab/SOURCES.md) and [portrait sources](../assets/portraits/SOURCES.md) are retained in the package. This audit did not establish rights for every third-party dependency, portrait or linked historical source, and found no repository LICENSE file in the inspected tree. No legal conclusion is inferred. |
| Gameplay | **Partially verified** | New campaigns can start, inspect, advance and save under cloud touch testing. Human review of first-session clarity, battle pacing, long-term enjoyment and full victory loops is not established by those tests. |
| Submission materials | **Incomplete** | The validated ZIP artifact exists in Actions; required store thumbnails and owner-approved policy text are not present in the inspected repository. |
| Platform acceptance | **UNKNOWN** | Poki decides after its own Inspector and review. |

The public site has a richer remote terrain layer. The dedicated package deliberately presents a local coastline and approximate overlays with an offline label; the two distributions should be evaluated separately. The recorded 4,895,228-byte size is the uncompressed package file sum; transfer compression, caching and CDN behavior can change what a player downloads.
