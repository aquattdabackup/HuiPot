# Studio browser handoff — HuiPot dark/lime redesign

Prepared October 24, 2026. User-authorized direction: dark + lime, cinematic landing motion, reorganized product flows. Browser-operated Studio retained by explicit user preference. Codex has not submitted this prompt or started a generation job.

## Inputs and precedence

Read the latest existing repository main branch and record the **actual input commit**, not this handoff's inspected code baseline (`d2fecc8c1b412a4b9f7bbed42a93d8fe9a817dc4`). Preserve later Studio fixes. Use the same Studio project and repository; no replacement project or duplicate running job.

1. `AGENTS.md` — authority/provenance and financial boundaries.
2. `docs/REDESIGN.md` — primary design, exact copy, five routes, motion and acceptance UI01–UI10.
3. `docs/design/README.md` and reference images — visual direction only, not screenshots of implemented code.
4. `docs/SPEC.md` — financial behavior; D1 now has five screens, D2–D8 unchanged.
5. `docs/DESIGN.md` — retained interaction/error/commitment requirements; v2 overrides old visual style and four-screen layout.
6. `docs/STUDIO_FIX_RECHECK.md`, `docs/STUDIO_FIX_REPORT.md` and latest `docs/LOG.md` — evidence versus claims. Do not infer all functional issues are closed from a summary.
7. Current `src/App.tsx`, `src/index.css`, `src/components/*`, `src/pages/*`, parser tests, package manifest/lockfile and actual contract ABI.

Full repository: https://github.com/aquattdabackup/HuiPot

Reference images:
- https://github.com/aquattdabackup/HuiPot/blob/main/docs/design/landing-dark-lime-concept.png
- Product screen layouts: `docs/REDESIGN.md`, section 4. Companion image generation failed; no product-interface image is included.

Use GitHub's supported raw/image view to inspect the actual pixels. If image access fails, report that and follow the complete written spec; do not claim visual inspection. Do not copy a full-page image into the app as the page.

## Exact execution prompt

```text
Continue the existing HuiPot Arc Studio project and its existing GitHub repository https://github.com/aquattdabackup/HuiPot. The user has authorized a comprehensive UI redesign, selected dark backgrounds with lime accents, and wants a polished cinematic landing plus a much clearer usable app. Keep all application code generation in Studio. Check for a running job and read latest main before editing; record the actual input SHA and preserve concurrent work.

Read every input listed in docs/STUDIO_REDESIGN.md in full, especially docs/REDESIGN.md and the actual reference image pixels. Confirm content access by stating: the five routes, why a Funded pool is not yet Paid, the two explicit simulated actions in the landing walkthrough, and the remaining 1-base-unit-versus-1-USDC Proof fixture. Then continue implementation in the same turn. This is execution authorization for this redesign, not a request for another plan or a request to ask the user for a token.

Implement the complete design in docs/REDESIGN.md, not just a palette swap:
1. Dedicated landing at / with strong typographic hierarchy, cinematic lime/graphite ring hero, usable CTAs, numbered process narrative, interactive goal-success/failure walkthrough, use cases/commitment terms, judge evidence section, FAQ and footer. Keep all sample content visibly illustrative and isolated from live wallet/RPC state. Funded needs an explicit simulated payout; failed funding needs an explicit simulated refund claim. No automatic real transactions.
2. Move real pool discovery and ID lookup to /pools. Preserve /create and existing /pools/:poolId and /pools/:poolId/proof deep links. Five screens total. Fix nested anchors in pool cards, distinguish RPC error from empty results, and do not inject sample cards into real data.
3. Redesign Create, Pool and Proof using the shared dark/lime tokens, proper spacing, typography, review steps, readable exact amounts, fixed recipient/deadline/terms, state-specific actions and accessible mobile layouts. Landing motion should be expressive; wallet and money controls should be stable.
4. Add intentional motion with existing Framer Motion/CSS/SVG: hero entrance, restrained orbit/particles, user-controlled walkthrough, section reveals and small hover feedback. Respect prefers-reduced-motion, add a visible pause control, stop offscreen animation, preserve natural scrolling and keyboard access. A background video is optional only with an original/licensed local file, poster, muted playback, size budget and fallback; do not invent or hotlink one. Do not introduce heavy dependencies just for visual effects.
5. Implement honest proof and action confirmations. If still present at current HEAD, bind payout amount to the verified pool target (event and native transfer both equal 1 base unit must not pass against a 1-USDC target). Validate inbound contribution evidence appropriately. key={actionKey} on a child div does not reset hooks owned by parent Pool: implement real transaction-context reset/isolation and expected-action receipt checks, with executable regressions. Do not regress fixes already present on newer main. Preserve native 18-decimal accounting, raw monetary input, and D2-D8.

Do not change contract source/ABI, add custody/fees, redeploy, sign transactions, publish hosting, invent mainnet proof, or submit anything. Repository delivery is already authorized; public app hosting and wallet actions are separate gates. A mockup, internal preview, or green build is not completed visual/mainnet validation.

Validate the final source with bun run test, bun run check, and bun run build. Run full Forge tests if contract/test code changed; otherwise confirm source/ABI unchanged, cite the previously checked revision and explicitly say the contract suite was not rerun for visual-only changes. Add meaningful regressions for demo isolation and its two outcomes, navigation/form recovery, the Proof target fixture and transaction-context behavior. Do not weaken assertions or fabricate logs to obtain passes.

When browser preview is available, inspect all five routes at 390px and 1440px plus overflow at 360px. Exercise keyboard/menu/modal focus, reduced motion/pause, loading/empty/error, rejected/pending/mismatched receipt UI. Capture actual screenshots with viewport/route/data-source labels and report each check as pass/fail/not run. Do not label the design PNGs as screenshots of the app. If browser tools are unavailable, finish implementation and other checks, deliver the real preview link if available, and explicitly list visual checks not run; do not claim visual QA completed.

Write docs/UI_REDESIGN_REPORT.md with input/output revision, actual Studio project URL or explicit unavailability, UI01-UI10 mapping, source files changed, remaining correctness issues, exact commands/exits/counts, screenshot paths and checks not run. Save sanitized raw logs under export-logs with a distinct redesign prefix; preserve all historical review evidence. Correct stale completion claims in current status documents without rewriting historical logs.

Commit and push completed source, tests, reports, references and screenshots through the existing supported GitHub integration. Reconcile remote changes without force-push, verify the remote commit and return SHA, preview/project links, report link and remaining gaps. If integration fails, give the exact failure and a complete supported source/log export; do not require another token merely because the shell gh command is unauthenticated. Do not start a duplicate generation job after an uncertain response.

Stop after implementation and validation for independent review. Do not perform mainnet, testnet wallet, public hosting, video upload or submission actions.
```

## Handoff checklist

- User opens the same Studio browser project, not a new unrelated template.
- Send only the short repository instruction; the full prompt and files are accessible in the repo.
- Record Studio's actual input SHA and whether text/image reads succeeded.
- Preserve the reported source revision, real preview URL, screenshots and command logs. Missing screenshots are a named QA gap, not a reason to fabricate a result.
- Codex independently reviews the returned source, checks the remaining correctness fixtures, and inspects actual rendered UI when a browser surface becomes available.
- Design direction and implementation request are already authorized; no repeated setup/token or color-approval step is needed.
