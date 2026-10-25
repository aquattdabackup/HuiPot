# HuiPot production art inputs

Generated October 25, 2026 with the built-in image tool at the user's explicit request for usable backgrounds and visuals matching the original concept. Codex generated and inspected these raster images; **Studio has not integrated them into the application yet**. They are not screenshots, code, transaction evidence or video. Keep this provenance distinct from Studio-built application source.

| Asset | Dimensions | Bytes | Visual review |
| --- | --- | --- | --- |
| [Hero atmosphere](hero-atmosphere-v1.png) | 1672 x 940 | 1,760,319 | Dark negative space on left, directional sage light and graphite rocks on right/bottom; no baked text or UI |
| [Torus cutout](torus-cutout-v1.png) | 1254 x 1254 (1:1) | 2,010,370 | Detailed graphite body and translucent lime segment; no text or labels; alpha outside and inside the opening |
| [Outcomes atmosphere](outcomes-atmosphere-v1.png) | 1672 x 941 | 1,752,339 | Misty rock valley frames the bottom; upper area clear for heading and branching UI |

Put amounts, text, controls, connecting paths and motion in the Studio-built interface. Do not place the original full-page mockup in the app. The fixed torus artwork is illustrative, not a dynamically accurate balance chart.

Read [STUDIO_ASSET_INTEGRATION.md](../../STUDIO_ASSET_INTEGRATION.md) for layer ordering, desktop/mobile placement, runtime paths, motion and acceptance. It supersedes the earlier optional hero rendering approach. Read [exact prompts](../PRODUCTION_ASSET_PROMPTS.md) and [manifest](manifest.json) for reproducibility and metadata.

## Inspection and provenance

- All three returned images were visually inspected and copied without modification from their built-in output files; originals remain in place.
- System.Drawing decoded each file for dimensions and alpha. Torus top-left and center alpha are both 0; a sampled body pixel has alpha 252. Transparency is real, not a painted checkerboard or solid black background.
- SHA-256 and byte lengths are recorded in manifest.json. Source PNGs total 5,523,028 bytes. Studio should create and inspect optimized runtime derivatives; integration budgets are targets, not achieved measurements.
- Source output identifiers: hero `exec-0472ce1a-8215-4579-8f45-67d923c62e53.png`; torus `exec-9289571a-f5db-4338-9d6f-96ca2e12abf2.png`; outcomes `exec-a25fef73-eb8f-4f7d-ab15-e415e23d6ef4.png`. Built-in group: `01a16ba0-8570-77e1-a69f-36ebdb1ca520`.
- Style reference: [original concept](../landing-dark-lime-concept.png), generated previously in this project. No external stock asset was downloaded; no exclusive-rights claim is made.
- No rendered app, image-on-text contrast, transfer performance, browser fidelity or wallet flow was validated by these file checks.

Assets are intentionally versioned. Preserve source PNGs and the original concept when deriving runtime variants.
