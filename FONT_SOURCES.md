# Bundled Chinese typography

Noto Sans SC regular, Chinese Simplified WOFF2 from `@fontsource/noto-sans-sc` version **5.2.9**. The original binary is unchanged (1,142,552 bytes; SHA-256 `95e3633b6a98f764ba3adfb54504a0cd4799328c009adf9081d6c1850f9c4c78`).

- Exact source: https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.9/files/noto-sans-sc-chinese-simplified-400-normal.woff2
- Distribution: https://www.npmjs.com/package/@fontsource/noto-sans-sc/v/5.2.9
- Upstream: https://github.com/google/fonts/tree/main/ofl/notosanssc
- Full copyright and SIL Open Font License 1.1, including the Fontsource distribution's license notice: [assets/fonts/LICENSE.html](assets/fonts/LICENSE.html). This readable HTML file ships with runtime builds alongside the WOFF2.

`fonts.css` provides a same-origin Chinese fallback to the existing Latin font families, including controls that use explicit font shorthands. This avoids depending on installed Windows or Linux CJK fonts or an external font service. Han-map serif variables and dynamically inserted version, privacy and storage notices use the same fallback. The regular face supports normal and synthesized bold where the view permits synthesis; it is not an additional download per weight.

The atlas screenshot control waits for the font set before capture. `tools/typography-smoke.mjs` blocks Google font services, verifies the actual local font response, rasterizes distinct Chinese glyphs to detect missing-character boxes, checks visible CJK labels' computed fallback families in setup and play across all three existing views, and saves 1920×1080 browser screenshots. The standard capture/download and map benchmark checks remain in place. No OS font package is installed to hide a distribution defect.
