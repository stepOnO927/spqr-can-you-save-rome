# Map Lab validation notes

- Local browser: initial 3-second requestAnimationFrame sample reported approximately 52 fps, including startup. The viewport size and hardware were not captured for that sample; this is not a benchmark or a guarantee for other devices. No sustained pan/zoom frame-time benchmark was completed.
- 1366 × 768: browser screenshot captured. 1920 × 1080: screenshot exported by html2canvas 1.4.1 from the rendered DOM and WebGL canvas at scale 1. The export is a browser-generated composite; it does not use the external full-page screenshot path that drops the WebGL map.
- Browser flow: select XIII, order a march to northern Italy, advance a month, see casualties and the actual battle report, save to a test slot, advance again, reload and observe the February state. Switch to Chinese. Local automated engine tests: 15 passing.
- Remaining work: full bilingual coverage, complete Stage A province selection and command coverage, detailed location sourcing, objective and diplomatic systems, tested supply and military map modes, character art, a sustained interaction performance test, and full integration into the campaign screen. The existing campaign screen remains available and uses compatible save slots.
- The scene depends on network-hosted imagery, elevation tiles, fonts, MapLibre, and (for export) html2canvas. The prototype is not an offline-ready release.
