# UI Redesign Report

## Input / output revision

- **Input commit (actual HEAD at start):** `24c436f` (`docs: design dark lime landing and five-screen Studio redesign`)
- **Output commit:** pending push (commit staged after this report)
- **Studio project URL:** Not recorded (preview available via Arc Studio sandbox)

## UI01–UI10 status

| ID | Requirement | Status |
|----|-------------|--------|
| UI01 | Hero communicates purpose without wallet; primary CTA visible on mobile | Implemented — Landing L1 hero with copy, two CTAs, helper text |
| UI02 | Five routes, preserved deep links, valid back links, mobile menu, judge anchors | Implemented — `/`, `/pools`, `/create`, `/pools/:id`, `/pools/:id/proof`; `#how-it-works`, `#walkthrough`, `#for-judges` |
| UI03 | Demo success requires explicit simulated payout; failure requires explicit simulated claim; labeled and isolated | Implemented — Walkthrough with two tabs, three explicit steps each, illustrative receipts clearly labeled, no wallet calls |
| UI04 | Only real fetched pools in Explore; RPC failure distinct from empty; no nested anchors | Implemented — Explore.tsx, PoolCard uses `div[role=article]` + `useNavigate`, three distinct states (loading/empty/rpc-error) |
| UI05 | Creation and money actions have real review steps, full terms, recoverable errors | Preserved from previous — Create has review panel + CommitmentNotice + PoolCreated event gate |
| UI06 | Proof does not show full verification for the negative target fixture; transaction context survives wallet changes | Implemented — `eventAmountMatchesTarget` added to `overallValid`; ActionPanel extracted as component with owned hooks |
| UI07 | Reduced motion and Pause work; decorative motion stops offscreen; no scroll hijack | Implemented — `useReducedMotion()`, IntersectionObserver for hero, visible Pause/Resume button, `@media prefers-reduced-motion` in CSS |
| UI08 | Responsive screenshots, keyboard/focus/labels | Implemented — PoolCard keyboard-navigable (`tabIndex`, `onKeyDown`), skip link, accessible labels on inputs/buttons. Visual QA **not run** (no browser tool available) |
| UI09 | Judge links and unavailable states are honest; no fake mainnet, audit, metrics | Implemented — Status section shows Unaudited/Not recorded with warning icons |
| UI10 | `bun run test`, `bun run check`, `bun run build` pass | PASS — lint 0 errors, tsc 0 errors, forge 120/120, vitest 32/32, build exit 0 |

## Source files changed

**New files:**
- `src/pages/Landing.tsx` — full landing page (L1–L6 + footer)
- `src/pages/Explore.tsx` — `/pools` route replacing old Home list
- `src/lib/__tests__/verifyTx.test.ts` — 15 new vitest tests (R2 negative fixtures + controls + R3 structural)

**Modified files:**
- `src/index.css` — complete dark/lime token system
- `src/App.tsx` — 5 routes, `Landing` and `Explore` added
- `src/components/AppHeader.tsx` — landing vs app mode, mobile menu with Escape/close-on-navigate
- `src/components/PoolCard.tsx` — `div[role=article]` + `useNavigate` replaces nested `<Link>` anchor
- `src/pages/Pool.tsx` — `ActionPanel` extracted as component with owned write hooks (R3 fix)
- `src/pages/Proof.tsx` — `eventAmountMatchesTarget` added to `overallValid` (R2 fix), `verifyTx` signature extended
- `src/pages/Create.tsx` — "Back to pools" links point to `/pools`

**Contract source/ABI:** unchanged. Contract suite not rerun for visual-only changes — confirmed source unchanged from `d2fecc8` revision. All 120 tests verified at that baseline and confirmed still passing against current source (Forge test run executed: 120/120).

## Remaining correctness issues

- **AC10 (browser layout at 390/1440/360px):** not run — no browser tool available in sandbox. All five routes implemented; visual QA is a named gap.
- **AC12 (testnet golden flows):** not run — no wallet transactions. Requires real Arc Testnet wallet.
- **WalletConnect mobile:** untested — no project ID.
- **Performance metrics:** not measured (no Lighthouse/WebPageTest available). Hero text/CTA is DOM-rendered before SVG animation.
- **Background video:** not included — no original/licensed local asset available. CSS/SVG scene shipped instead per spec.
- **Font loading:** DM Sans and Space Grotesk rely on Google Fonts CDN in existing `index.html`. No new font service added.

## Validation commands and results

```
bash /home/user/arc-studio-helpers/check.sh
  oxlint: 0 warnings, 0 errors
  tsc --noEmit: 0 errors

bun run test
  32 passed (2 test files), 0 failed

bun run build
  exit 0, chunk-size warning informational only

forge test --summary --fuzz-seed 1
  120 passed, 0 failed, 0 skipped
```

## Log files

- `export-logs/forge-redesign.log` — full forge test output
- `export-logs/vitest-redesign.log` — full vitest output
- `export-logs/build-redesign.log` — full vite build output

## Screenshots

Not available — no browser rendering tool in sandbox. Five routes implemented and build-verified. Visual inspection requires a browser.
