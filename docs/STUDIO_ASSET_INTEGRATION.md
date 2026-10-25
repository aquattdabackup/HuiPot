# HuiPot supplied artwork integration — implementation handoff

October 25, 2026. Source inspected: `ffc04fb5156a7f3dc68ae34ccea4e765c818f23f`, confirmed against GitHub main and the clean local checkout. Read newer main before implementation and preserve concurrent changes.

## User decision and why this handoff exists

The user still rejects the interface's resemblance to the selected concept, particularly the absent background. They explicitly requested usable background images and more concrete implementation guidance. Codex has now generated separate **text-free raster assets** from the original concept's visual direction. Studio must integrate these actual assets into application code; another gradient-only approximation is not the requested outcome.

The previous correction did improve the implementation: a layered SVG torus, 1200px container, larger headline, ring brand mark, outlined step numbers, shared pause prop and branching diagram now exist. Do not repeat obsolete claims about a 320px flat hero. However, the current hero still uses SVG gradients and a CSS radial background, and the walkthrough uses a solid surface. No production raster artwork was present in the inspected source. `RingTorus size={480}` is still an explicit pixel dimension. These source facts explain why the requested photographic material and rocky atmosphere have not been supplied. This review does not claim to have observed the deployed page or its current viewport.

This document supersedes the optional hero-art rendering choices in REDESIGN and STUDIO_VISUAL_RECHECK: **use the supplied hero background and transparent torus now**, with a dynamic diagram for the walkthrough. The original concept remains the composition target. Financial rules, provenance and wallet boundaries are unchanged.

## Files to read and use

Read AGENTS.md, this document, docs/REDESIGN.md, docs/design/assets/README.md, and the latest implementation report. Inspect the actual pixels of all supplied assets and the original concept.

| Source asset | Role | Intended runtime path after Studio integration |
| --- | --- | --- |
| [hero-atmosphere-v1.png](design/assets/hero-atmosphere-v1.png) | Full hero environment: empty dark left, right-side mist/light and graphite rocks | `/art/huipot/hero-atmosphere.webp` |
| [torus-cutout-v1.png](design/assets/torus-cutout-v1.png) | Foreground graphite/lime ring; real alpha outside and in its center | `/art/huipot/torus.webp` |
| [outcomes-atmosphere-v1.png](design/assets/outcomes-atmosphere-v1.png) | Lower landscape for the two-outcome narrative | `/art/huipot/outcomes-atmosphere.webp` |
| [Original concept](design/landing-dark-lime-concept.png) | Composition/typography reference ONLY | Never ship as a full-page background |

The runtime paths above are **planned**, not existing or verified production URLs. Copy/encode the repository assets into the Vite public directory through Studio; reference local files, not GitHub image-view HTML URLs or hotlinked raw files. If WebP encoding is unavailable, preserve the PNGs at equivalent `.png` paths and report actual transfer sizes; never reference a nonexistent `.webp`. Read manifest.json for measured source dimensions, bytes, alpha checks and hashes. These files are art inputs, not Studio screenshots or evidence of transactions. No generated video is supplied.

## Hero assembly: implement these layers

Use one hero scene with the following back-to-front order. Text and actions remain accessible HTML; decorative images have empty alt text and do not intercept pointer events.

| Layer | Placement and behavior |
| --- | --- |
| Base | Canvas `#0B100E`, full section width. Reserve dimensions before image download. |
| Background environment | Hero atmosphere covers the hero, anchored center bottom on desktop. Keep visible rock detail and right-side mist. Use the image at full visual strength initially; avoid hiding it beneath a large opaque surface. |
| Readability overlays | A left-only dark scrim if needed behind copy, fading before the right scene. A shallow bottom fade may blend into the process band. Do not apply a global heavy black overlay that removes the artwork. |
| Orbital rear layer | At most two quiet thin orbital paths behind the torus; generated hero image has no orbits. Keep them local to the right scene. |
| Torus cutout | Preserve aspect ratio with contain sizing, normal alpha compositing. No screen blend, inversion or arbitrary hue filter. Let the material and lime highlight come from the file. Add only a restrained environmental shadow if needed. |
| Center label | Real HTML in the transparent hole: fixed illustrative `0.40 / 1.00`, `USDC`, and a small explicitly illustrative progress bar if space permits. Keep all text inside the hole, approximately the middle third of the square. On small screens use two lines, not tiny type. |
| Front detail | Two small real-HTML chips: `+0.40 USDC` near upper left of the right scene and `0.60 to go` near upper right. Optional 2-3 tiny orbit particles. No avatars or invented members. |
| Controls | Hero copy/CTAs and visible `Illustrative demo · No funds moved`; Pause control remains operable and clearly labeled. |

The torus is fixed decorative art, not an exact live progress gauge. Keep the hero's illustrative numbers fixed. Do not animate it to a different balance or pretend its segment measures a real pool. Use the walkthrough's separate dynamic diagram/progress UI for changing states.

### Desktop composition target at 1440px

- Content width approximately 1200px, centered, with 120px outer margins. Header aligns to the same edges.
- Starting layout: 600px copy column, 40px gap, 560px scene column. Headline and image should have comparable visual weight. Adjust actual typography to fit without clipping or pushing the scene off the page.
- Hero around 660-720px high below the header; right scene roughly 520-560px square. The supplied cutout includes transparent margins, so size its box sufficiently for a substantial visible ring.
- Headline follows the reference rhythm: `Pool together.` / `Make it` / lime `happen.`. Start around 88-100px with tight line height; fit actual font metrics, avoid an accidental fourth line. Preserve the complete meaning of the body copy from REDESIGN.
- Use the existing pill primary CTA and quieter text/play secondary. Keep fees helper readable. Do not place the hero copy in an opaque rounded card.
- Maintain the thin divider and compact three-step editorial band immediately below the hero. Do not insert an additional oversized title or empty section between them.

### Mobile composition at 390px and 360px

- Header retains the network badge. Copy and both CTAs come before artwork; use approximately 48-54px heading, tuned to viewport width.
- Scene width equals available content width, capped near 360px, with a square aspect ratio. At 360px with 20px gutters, the scene must fit 320px. Remove the fixed 480px width rather than merely clipping overflow.
- Background can anchor toward the right to retain atmosphere; protect copy with a local scrim. Do not squeeze the desktop two-column layout onto mobile.
- Keep decorative chips within the scene or simplify them; never shrink money text to fit. Essential illustrative notice remains visible. Buttons and links retain usable hit areas.

## Two-outcome section

Use the supplied outcomes atmosphere as the full section environment, anchored bottom so the rocks frame the lower edges. Keep the large left heading and a right-side branching narrative above the rocks. Place white/lime lines, labels and active-state indicators in SVG/HTML **over** the background; the image intentionally contains none of those elements.

Keep both branches legible: goal reached permits a user-triggered simulated payout; deadline missed permits a user-triggered simulated refund. Retain the working tabs/actions and explicit illustration notice, with controls immediately under the active branch. The notice can be a concise readable line rather than a large panel covering the composition. Keep essential refund/fee/commitment disclosures. Avoid stacking another full torus plus another large opaque demo card in front of this artwork.

On mobile, heading then diagram then active control. Expand vertical room instead of shrinking labels. Use a local backing only where contrast needs it; the scene should remain visible around the content.

## Motion, assets and performance

- Art is static raster. Create the cinematic movement with a slow 6px float of the ring over 7-9 seconds, restrained independent orbits and small entrance transitions. Do not rotate the entire ring continuously: its lighting and material direction should remain stable. Fine-pointer tilt, if included, stays within 3 degrees and excludes text/controls.
- Shared Pause and reduced-motion preferences stop every decorative animation. Track section visibility and document visibility separately. Current handler only sets heroVisible false when hidden; returning to the tab needs proper recomputation. Treat the walkthrough as its own observed scene.
- The same SVG currently repeats hard-coded gradient/mask IDs when rendered twice. If retained for any diagrams, make referenced IDs instance-unique; replacing hero art alone is not an excuse to break the walkthrough.
- Studio should derive visually checked WebP/AVIF variants from these source PNGs, preserving alpha on the torus. Suggested desktop max widths: background 1672px, torus 960-1254px, outcomes 1672px; supply smaller mobile variants where useful. Targets, not existing measurements: first-viewport art <=1.2MB total, lower-section art <=500KB. Report actual bytes and deviations. Do not destroy the pitted graphite detail with aggressive compression.
- Reserve image space, prioritize at most the essential hero image, lazy-load lower artwork, and avoid downloading desktop and mobile variants together. No new 3D framework or video dependency is needed for this delivery.
- Keep a solid-color and readable-text fallback when images fail. A failed asset must not hide CTAs, cause layout jumps or make the app unusable.

## Exact Studio execution prompt

```text
Continue the existing HuiPot project. Read latest main and record the actual input SHA. Read AGENTS.md and docs/STUDIO_ASSET_INTEGRATION.md in full, plus the original concept and every actual image under docs/design/assets. The user explicitly wants the supplied background, material and visual composition, not another SVG/gradient approximation.

Confirm image access by describing the empty dark-left hero environment, the alpha-cutout graphite/lime torus, and the rock-framed outcomes background. Then implement in the same turn. If image access fails, report the exact failure and use supported repository binary download; do not claim inspection or silently replace these supplied assets with generic shapes.

Use the three supplied assets as specified. Produce optimized runtime derivatives in the Vite public directory, preserve the torus alpha, and wire actual local asset URLs into application code. Replace the hero RingTorus artwork with the supplied cutout; layer orbital motion and real DOM amounts/chips over it. Do not use the original full-page concept as a runtime background. Implement the desktop/mobile assembly, background visibility, typography and outcomes composition in the handoff. Retain the functional improvements in ffc04fb and newer revisions. Keep live/demo state distinct and preserve the contract, all financial rules, routes and correctness fixes.

This task is actual source integration, not another specification, image generation task or documentation-only commit. Verify all referenced art files exist and load. Run bun run test, bun run check and bun run build; report exact exits/counts and actual transferred image bytes. Inspect the real app at 1440x900, 390x844 and 360x800 when tools permit. Capture hero/steps and outcomes screenshots, plus the five route checks required by REDESIGN. Compare actual screenshots with the original concept and fix major composition differences before claiming visual acceptance. Check reduced motion, pause/resume after tab hide/show, image failure, keyboard operation and overflow. Do not call a build pass visual QA.

Update docs/UI_REDESIGN_REPORT.md with actual source/runtime asset paths, source/output revisions, Studio project/preview URL or explicit unavailability, screenshot paths and checks not run. Save sanitized command logs. Commit and push through the existing GitHub integration without discarding remote work, verify remote SHA, and return the changed source files and evidence. If rendering is unavailable, finish the code integration and state visual acceptance remains unverified. Do not request another token/setup, start duplicate jobs, sign transactions, change hosting configuration, deploy contracts or submit anything.
```

Prepared by Codex; not submitted to Studio. Adding these art inputs to the repository does not itself wire them into the running app. No claim is made that the Vercel deployment now matches the concept.
