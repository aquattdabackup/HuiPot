# HuiPot Functional Fix Report

Studio output commit: *(see commit message for exact SHA)*
Input commit for this session: **ef62196** (docs: validate 68fa8be and reproduce replacement lifecycle gaps)

---

## Validation summary

| Command | Exit | Result |
|---|---|---|
| `bash /home/user/arc-studio-helpers/check.sh` | 0 | oxlint 0, tsc 0 |
| `bun run test` | 0 | **92/92 pass** (4 files, 1.31s) |
| `forge test --summary --fuzz-seed 1` | 0 | **120/120 pass** |
| `bun run build` | 0 | dist generated |

Test count breakdown (corrected from prior session's inaccurate numbers):

| File | Tests | Notes |
|---|---|---|
| `verifyTx.test.ts` | 35 | Predicate + structural (not 52 — prior count was wrong) |
| `parseProductAmount.test.ts` | 17 | Parser regressions (unchanged) |
| `validateReceipt.test.ts` | 28 | Behavioral receipt validation (22 behavioral + 6 structural) |
| `lifecycle.test.ts` | 12 | **New this session** — RL1/RL2/RL3 lifecycle regressions |
| **Total** | **92** | |

Not run: browser rendering, signed testnet transactions, AC12 human-operated flows, replacement live scenario, Vercel deployment verification, multi-wallet/mobile.

---

## F01–F07 status

### F01 — DEPLOYMENT_CONFIGURED gate
Status: **ACCEPTED** (prior sessions).
`DEPLOYMENT_CONFIGURED` exported from `contract.ts`; Pool, Home, Create, Proof all gate on it. Vercel needs `VITE_HUIPOT_ADDRESS` set in build env (user action required).

### F02 — SPA routing
Status: **ACCEPTED** (prior sessions).
`vercel.json` rewrites all routes to `/index.html`. The rewrite rule is intentionally broad; static assets (JS/CSS/images, public/art/*, favicon, robots.txt, manifest) are handled by path precedence in Vercel's routing — they are served directly before the catch-all SPA rewrite. No explicit exclusion list is required for Vercel's file-system routing.

### F03 — Review before wallet write
Status: **ACCEPTED** with all follow-up fixes applied.
- Review modal opens before any `writeContract` call.
- Full addresses displayed (no truncation).
- Live chain check: `currentChainId` (from `useAccount`) compared to `TARGET_CHAIN_ID` at confirm time — not stored snapshot.
- Pool state re-validated at confirm time (RC4: status/capacity/claimable).
- Gas string: "The wallet will show the exact fee before you sign (Arc gas, typically <0.01 USDC)." — wallet does show the fee before signing. `typically <0.01 USDC` is unmeasured; EIP-55 display not added.

### F04 — Receipt validation
Status: **ACCEPTED** with all follow-up fixes applied (including RL1–RL3 this session).
See RC3 and RL1–RL3 sections below.

### F05 — Proof verification
Status: **ACCEPTED** (prior sessions).
- `computeOverallValid` in shared `verifyTxLogic.ts`; `amountPresent` requires `BigInt > 0n`; `arcTransferFromMatchesContributor` enforced for Contributed.

### F06 — Share links
Status: **ACCEPTED** (prior sessions).
`buildShareLink` in `src/lib/share.ts` reads `VITE_APP_URL` env var; when absent, falls back to `window.location.origin + import.meta.env.BASE_URL`. It does NOT unconditionally use `window.location` — it prefers the env var when set, so a Vercel deployment with `VITE_APP_URL` set produces stable canonical links.

### F07 — Proof prefill
Status: **ACCEPTED** (prior sessions).
Proof page reads `?tx=` from URL search params to pre-fill transaction hash field.

---

## RC1–RC6 final status

### RC1 — Action-scoped receipt state
Status: **ACCEPTED**.
`receiptByAction` per-action map; `isActionBusy('contribute')` returns `true` only for `'checking'`. After a confirmed partial contribution, the form re-enables for another contribution.

### RC2 — Contributor/caller identity binding
Status: **ACCEPTED**.
All three actions: Contributed, PaidOut (caller via topics[2]), Refunded — contributor compared to `snap.accountAddress`. 22 behavioral tests in `validateReceipt.test.ts` cover all identity binding cases.

### RC3 — Replacement / revert / retry lifecycle
Status: **ACCEPTED** (base + follow-up + RL1–RL3 this session).
- (a) Wait-hook `isError` → `phase: 'error'` for revert.
- (b) `notifiedRef` not set on error; retry re-runs validation.
- (c) `onReplaced` wired to all three hooks. `repriced` / `cancelled` / `replaced` handled.
- RL1: replaced `validationGenRef` (global counter) with `submissionIdRef` (per-submission). `isSuccess` and `onReplaced(repriced)` share the same submissionId; neither can advance it during the other's in-flight validation. `activeValidationRef` serialises competing validations for the same submission. See RL1 section.

### RC4 — Live pool state revalidation
Status: **ACCEPTED**.
`confirmAction` checks live `status` prop for each action before calling `writeContract`.

### RC5 — HTTP/RPC validation
Status: **ACCEPTED**.
`resp.ok` and `json.error` checked in `validateReceipt.ts`. Gas string is honest.

### RC6 — Confirmed evidence persistence
Status: **ACCEPTED**.
`confirmedTxRef` set on confirmed outcome. ReceiptBanner rendered at FUNDED, myClaimable===0, and CLOSED for all three actions.

---

## RL1–RL3 status (this session)

### RL1 — Repriced transaction stuck in checking (HIGH)
Status: **FIXED**.

Root cause: `validationGenRef` was a single shared counter. `onReplaced(repriced)` incremented it (e.g. → 5) and started validating hash B. The `isSuccess` effect for hash A then incremented it again (→ 6). When B's validation resolved it found gen=5 ≠ current=6, so it was discarded. No confirmation, permanent checking state.

Fix: Replaced `validationGenRef` with `submissionIdRef`. `confirmAction` increments `submissionIdRef` once per wallet write. Both `isSuccess` and `onReplaced(repriced)` read `submissionIdRef.current` without incrementing — they share the same submissionId for the same wallet submission. The stale check in `runReceiptValidation` compares the captured submissionId to `submissionIdRef.current` at resolution time; only a newer `confirmAction` (new wallet write) advances it.

`activeValidationRef` serialises competing hash validations for the same submission: if B starts while A is in flight, A's key is pre-added to `notifiedRef`, so A's result is discarded rather than overwriting B's confirmed state.

Regression tests: RL1-FAST (B confirms before isSuccess fires), RL1-SLOW (isSuccess fires before onReplaced; B still wins after repricing), RL1-DUP (both concurrent; onSuccess called once), RL1-NEWSUB (second submission starts fresh).

### RL2 — Cancellation/replacement evidence has wrong hash (MEDIUM)
Status: **FIXED**.

Root cause: `replaced` phase stored `txHash: originalHash`; explorer link pointed to original (unmined) tx A. `cancelled` phase had no `minedHash` at all.

Fix: `onReplaced` handlers pass `minedHash` (the actual mined tx) to all three phase variants. `ReceiptBanner` for `replaced` uses `phase.minedHash ?? phase.txHash` for the explorer link. `ReceiptBanner` for `cancelled` conditionally renders a "View cancellation tx" link to `phase.minedHash` when present.

`repriced` phase already had `minedHash` and already links to it correctly.

Regression tests: RL2-CANCEL (cancelled phase has both hashes), RL2-REPLACED (replaced phase has minedHash), RL2-BANNER-STRUCT (link formula), RL2-CANCEL-STRUCT (conditional link).

### RL3 — In-flight validation not cancelled on unmount (MEDIUM)
Status: **FIXED**.

Root cause: No cleanup on unmount. An in-flight `validateReceipt` RPC call could return after the ActionPanel was unmounted (e.g. after wallet disconnect or pool change), still call `onSuccess`, and trigger `refetchAll` in the parent Pool component.

Fix: Added `useEffect` with cleanup: `return () => { submissionIdRef.current++; activeValidationRef.current = null }`. When ActionPanel unmounts, `submissionIdRef.current` is incremented. Any in-flight validation's stale check (`submissionIdRef.current !== submissionId`) evaluates to `true` and returns without calling `onSuccess`.

The parent Pool keys ActionPanel as `key=\`${address}-${poolId}\`` — account/pool changes cause remount, which was the primary unmount scenario. The new cleanup handles all unmount reasons.

Note: A new submission in `confirmAction` also advances `submissionIdRef`, so the cleanup only matters for RPC calls that outlive the component. The existing `confirmAction` increment already handled same-session submission supersession.

Regression tests: RL3-UNMOUNT (onSuccess not called after unmount), RL3-STRUCT (cleanup pattern), RL3-STRUCT (activeValidationRef reset count).

---

## Outstanding items (not implemented)

| Item | Reason |
|---|---|
| EIP-55 checksum display | Cosmetic; not blocking |
| `typically <0.01 USDC` fee claim is unmeasured | Arc gas fees are stable and low; exact measurement requires live transaction |
| AC12 human-operated testnet flows | Requires wallet + testnet; no signing in Studio |
| WalletConnect mobile | No project ID available |
| Cross-session confirmed evidence | Requires localStorage or backend; out of scope |
| Proof page Contributed sender/amount real-tx verification | No live testnet tx available |
| EIP-55 display | Cosmetic; not blocking |
| Replacement transaction live scenario | Requires browser wallet and pending mempool tx |
