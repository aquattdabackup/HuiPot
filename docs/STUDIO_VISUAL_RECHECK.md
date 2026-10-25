# HuiPot visual fidelity recheck and Studio correction prompt

October 25, 2026 (Asia/Ho_Chi_Minh).

## Scope and actual input

User reports that the pushed interface looks worse than the selected concept and asks Codex to inspect it. Read GitHub main through the GitHub connector and the matching clean local checkout: **`74576a333c26230ed287c9f871a5e68b83525fd1`**. The implementation was added in `3a06e17`; `74576a3` removes a leftover embedded repository. The preferred reference remains [landing-dark-lime-concept.png](design/landing-dark-lime-concept.png), whose pixels were inspected again.

This is a **source-based design review**, not rendered visual QA. Browser inventory returned no enabled apps or browsers. GitHub repository metadata lists `https://hui-pot.vercel.app` as homepage; the web reader could not access it. Its current pixels, deployed commit and mobile behavior were not verified. No application source, contract or hosting was changed in this review.

## Why the implementation loses the reference's visual character

| Priority | Source evidence at this revision | Consequence and required correction |
| --- | --- | --- |
| P1 | `src/pages/Landing.tsx:25-72`: RingHero is a fixed 320 x 320 SVG, with two flat circles, 18-unit strokes and a drop shadow. | The concept's dominant thick graphite/lime object became a small progress chart. Build a dimensional torus with outer/inner bevels, directional highlights, dark inner cavity, contact shadow and a luminous lime segment. A flat stroke with glow is insufficient. |
| P1 | `Landing.tsx:515-540`: `1fr auto` columns, fixed ring width, heading capped at 80px. | The hero allocates its visual column to a 320px object; the image and typography no longer have the reference's balanced scale. Use an approximately 1200px desktop composition, a 500-560px scene, and responsive 88-104px headline where it fits. Verify actual line wrapping before acceptance. |
| P1 | `Landing.tsx:484-515` and `src/index.css:42-54`: flat canvas; no hero material/atmospheric scene. | Matching hexadecimal colors does not recreate depth. Add restrained directional light behind the torus, a soft ground shadow and subtle texture; keep text on a stable dark backing. Avoid indiscriminate neon glow. |
| P2 | `Landing.tsx:130-183`: centered walkthrough heading, warning strip, tabs, another identical ring and stacked cards. | The concept's large split narrative and branching outcome graphic became a generic demo panel. Keep the working two-outcome interaction, but place the editorial headline on the left and a connected outcome composition on the right. Show the active demo action below its branch. |
| P2 | `AppHeader.tsx:59-82`; Landing footer: square HP badge. Landing CTA uses a boxed secondary button. | The distinctive ring mark and lighter secondary action are missing. Reuse a simple ring brand mark, make the primary hero action pill-shaped, and use a text/play secondary action with an accessible hit area. App form buttons may remain rectangular. |
| P2 | Landing use cases and judge section repeat rounded surface cards; process steps use large filled numbers. | The page has less variation and less editorial structure. Use hairline-separated use-case rows, small outlined number circles and a compact evidence strip, with expanded details where needed. Preserve essential terms and honest evidence status. |
| P2 | `Create.tsx:254` remains `max-w-2xl`; its commit diff only changes navigation links. | The specified desktop form + preview arrangement was not implemented. Complete the existing five-screen design after fixing the hero; token replacement alone does not complete app layout work. |

The dark palette, five routes, explicit demo payout/refund actions and target-bound payout predicate are useful delivered work. Preserve them. The next pass should correct composition and visual assets, not restart the application or alter its financial rules.

## Concrete interaction gaps found during the design read

- `Walkthrough` passes `motionPaused={false}` to its ring (`Landing.tsx:176-179`), while the visible Pause control belongs to Landing. The control therefore does not pause that second decorative ring. Only the hero has an intersection observer; document visibility is not handled. Wire shared motion preferences to every decorative scene and stop each when offscreen/hidden.
- Hero starts at 0.40 and adds 0.40 with a cap at 1.00 (`Landing.tsx:585`). The second click adds only 0.20 while the label still says +0.40. Keep the hero illustrative and consistent; use a fixed 0.40 with a 0.60 remainder, and put actions in the walkthrough, or calculate the exact permitted increment.
- Landing mobile header hides the entire network-badge group behind `hidden md:flex`; the closed mobile menu has no network badge. Keep Arc Testnet visible outside the menu.
- AppHeader's comment says focus trap, but the listener only handles Escape. Use appropriate disclosure navigation semantics or implement the complete modal behavior if a modal is intended. Do not claim tested focus behavior from that comment.
- App wraps routes in `main` and Landing adds another `main`. Use one main landmark. Verify the sticky header does not obscure anchor targets.
- The community-workshop example says funds reach the vendor only when everyone has contributed. There is no mandatory member roster: the condition is reaching the target and a payout transaction. Correct that sentence.

## Validation limits

The committed Studio log reports 32 passing Vitest cases in two files, and its build log ends successfully with a large-chunk warning. These are **Studio-provided logs**, not new local runs. The report contradicts itself about whether Forge was rerun; the included Forge log exists. Preserve history and clarify provenance in the next report.

The new verifier tests reproduce the predicate rather than invoking the production verifier. The R3 and demo tests inspect module exports/importability, not wallet changes or walkthrough behavior. Passing those tests does not establish the claimed interaction coverage. Production-path regression work remains a distinct correctness follow-up; do not claim it solved by this visual pass.

No new `bun run test`, `bun run check`, `bun run build` or Forge suite was run: this task changes documentation only; Bun was not found on PATH and this checkout has no node_modules. No dependency installation was attempted for this review. Browser screenshots, Vercel revision verification, performance and testnet wallet tests were not run.

## Exact Studio execution prompt

```text
Continue the same HuiPot project. Read latest main and report the actual input SHA. Read AGENTS.md, docs/REDESIGN.md and docs/STUDIO_VISUAL_RECHECK.md in full, then inspect the pixels of docs/design/landing-dark-lime-concept.png. Preserve any newer work. The user likes that concept and rejects the current implementation's visual fidelity. Implement this correction, not another design document.

First confirm access by describing the concept's thick graphite/lime torus, large left headline, outlined step numbers and split outcome composition. If image access fails, state that explicitly and use the detailed written requirements. Never claim a screenshot was inspected if it was not.

Implement all P1/P2 corrections and interaction gaps in this review. Prioritize hero scale, dimensional material, typography and visual hierarchy. A 320px flat progress circle with a glow is not an acceptable replacement for the selected artwork. At 1440px aim for a roughly 1200px composition, a 500-560px visual scene and a dominant 88-104px headline adjusted to actual fit. Match the concept's visual balance and line rhythm rather than mechanically enforcing a size that clips. At 390/360px, keep copy and CTA first, scale the scene to available width and prevent horizontal overflow.

Choose a concrete rendering method: a layered SVG/CSS torus with visible bevel/highlight/shadow/material treatment, or an original/licensed isolated torus render with separately animated orbital layers. Use a real 3D scene only if it is lightweight, deferred and has a static fallback. A full-page mockup, cropped mockup containing text, or screenshot stretched as a background is forbidden. All copy, balances, controls and labels must remain real accessible DOM. Do not claim the old flat SVG matches the concept. No video is required: introduce a local original/licensed video only if actually available and within the existing size/motion constraints.

Keep the demonstrative torus explicitly illustrative and its arithmetic consistent. Use one shared pause preference, per-scene offscreen/hidden handling and reduced-motion behavior. Give the success/failure walkthrough the concept's branching composition while preserving explicit simulate-payout/claim-refund steps. Retain all commitment disclosures. Finish the specified Create preview layout and consistent app hierarchy. Preserve routes, latest correctness fixes, native 18-decimal accounting and contract source/ABI. Do not deploy, sign, change hosting settings or submit anything.

Validate the actual application at 1440px and 390px, plus 360px overflow, whenever browser tools are available. Capture real screenshots for all five screens with route/viewport/data-source labels; label fixture-driven previews honestly. Compare the hero and walkthrough with the concept and correct the largest visual differences before delivery. Exercise pause, reduced motion, keyboard/menu/anchor behavior and both demo outcomes. If no browser is available, implement the source and report visual fidelity as UNVERIFIED, not completed.

Run bun run test, bun run check and bun run build. Record exact commands, exit codes and counts; do not present module import tests as behavior tests. Correct the evidence distinctions in docs/UI_REDESIGN_REPORT.md, save sanitized logs and actual screenshots if available, and include the real Studio/preview URL or explicit unavailability. Commit/push the completed changes through the existing GitHub integration, preserve concurrent work, and verify remote SHA. Do not request another token/setup or launch a duplicate job. Stop for independent review after source delivery; no wallet or hosting actions.
```

This prompt is prepared, not executed by Codex. Code implementation remains Studio's responsibility under the adopted project guidance.
