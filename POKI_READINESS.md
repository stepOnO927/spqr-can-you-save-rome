# Poki readiness audit — 2026-11-14

**Status: not ready to submit.** This is an audit of the existing build, not a Poki upload or a claim that the SDK passes Poki Inspector.

## Evidence and method

- [Cloud Chromium audit run](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43658555768) on GitHub Actions Ubuntu. It tested 640×360 and 836×470 touch-enabled viewports, simulated blocked storage, recorded network requests, and attempted real touch starts and map selections. Screenshots and JSON are in the run artifact.
- Baseline source: `735d9ec0a400fcd7a6cb8c944cbc8494e798c94a`.
- No game or test command ran on the developer's computer.
- Poki's [requirements](https://developers.poki.com/guide/requirements-quality), [HTML5 SDK guide](https://developers.poki.com/guide/sdk-html5), and [external resources policy](https://developers.poki.com/guide/external-resources-policy) were checked against the source and cloud browser results.

## Release blockers

| Priority | Area | Observed result | Required correction |
| --- | --- | --- | --- |
| Must | SDK | No Poki SDK is loaded and no loading, start, stop, or commercial-break lifecycle is reported. | Add a Poki-specific entry, initialize the official SDK, emit `gameLoadingFinished` after readiness, `gameplayStart` on first input/resume, `gameplayStop` on pause/menu/end, and a break only when resuming from a natural pause. Guard duplicate events and keep play possible if SDK initialization fails. Verify in Inspector. |
| Must | External requests | The main page requests Cloudflare analytics. The atlas additionally requests MapLibre from unpkg, Google Fonts, Esri imagery, and AWS elevation tiles. | Exclude third-party analytics from the Poki build. Bundle allowed fonts and libraries locally. Replace the atlas' live tiles with licensed packaged map data or a local map mode; verify all network requests except the official Poki SDK are local. Review map and tile licenses before packaging. |
| Very high | Storage | Simulated denied `localStorage` and `sessionStorage` caused uncaught `Storage denied` errors. Roman and Han opening screens could not start; atlas code also errored. | Wrap storage access from startup onward, keep an in-memory fallback, clearly explain that progress cannot persist in this mode, and make cross-view navigation degrade safely. Retest with denied storage on all entries. |
| Must | 16:9 and mobile controls | At 640×360 the Roman page height was 545px, the map extended below the viewport, the advance button was at y=509, and the start button at y=884. At 836×470, page height was 583px and both controls were below the viewport. | Keep primary Start and Advance controls visible inside 640×360, 836×470, and 1031×580. Collapse secondary controls and use a compact, accessible menu; avoid page scrolling inside Poki's frame. |
| Very high | Touch hit testing | Roman touch start and army selection worked, but Advance remained outside the viewport. In Han, a route line intercepted a tap on the Chang'an territory. In the atlas, the guide overlapped the tested Rome marker. | Make route overlays non-interactive, reserve room for the atlas guide, enlarge crucial touch targets, and verify territory, army, menu, and time controls on touch. |
| Very high | First session | The Roman opening dialog contained about 979 characters and the Start button required scrolling in the tested 16:9 windows. | Present one primary start action first; defer advanced scenario, handicap, and expansion options behind an expandable control. Teach the first meaningful choice in play. |
| Very high | Initial download | The main page transferred about 1.50 MB of same-origin resources in the cold cloud run; atlas loaded about 1.51 MB locally **plus external map resources**. The repository contains about 10 MB of tracked files, including about 6.95 MB of portraits. These are not Poki package size or a throttled-phone load measurement. | Create a release-only build, exclude tests/master portraits, lazy-load advanced systems and portraits, bundle assets, then measure the uploaded ZIP and cold load on a throttled phone in Inspector. |

## Existing strengths

- Roman touch start and army inspection worked in both tested 16:9 viewports once Playwright scrolled the start dialog into view.
- The Han opening button was initially visible at 640×360; Han's main entry requested no third-party resource in the cloud run.
- Roman and atlas narrow layouts already have some collapsible panels. These need adjustment for short landscape windows.
- Existing save functions catch some write failures after startup; the failure is the unguarded reads during module initialization.

## Acceptance gate before Poki submission

1. A local Poki ZIP launches and remains playable with storage denied and external network blocked.
2. No non-Poki third-party request appears in the Inspector warning log.
3. Start, map selection, an order, and Advance work by touch at 640×360, 836×470, and 1031×580 without page scrolling.
4. The SDK event log shows exactly one loading-finished event, a start on first input, stop on pause/menu/end, and start on resume, without duplicate consecutive start/stop events. Ads do not accept game input.
5. The first meaningful action is reachable without scrolling through the setup dialog.
6. Measure compressed ZIP size, cold load, first interaction and return from an ad on real devices. No human-time or Inspector outcome is asserted by this audit.
