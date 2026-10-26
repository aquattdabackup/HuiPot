# HuiPot Functional Fix Report

Studio output commit: *(see commit message for exact SHA)*
Input commit for this session: **08f8bb1** (docs: verify f00c80d and record public demo readiness)

---

## Validation summary

| Command | Exit | Result |
|---|---|---|
| `bash /home/user/arc-studio-helpers/check.sh` | 0 | oxlint 0, tsc 0 |
| `bun run test` | 0 | **98/98 pass** (4 files, 1.34s) |
| `forge test --summary --fuzz-seed 1` | 0 | **120/120 pass** |
| `bun run build` | 0 | dist generated |

Test count breakdown:

| File | Tests | Notes |
|---|---|---|
| `verifyTx.test.ts` | 35 | Predicate + structural |
| `parseProductAmount.test.ts` | 17 | Parser regressions |
| `validateReceipt.test.ts` | 28 | Behavioral receipt + structural |
| `lifecycle.test.ts` | 18 | **Rewritten this session** — production-path via makeActionLifecycle |
| **Total** | **98** | |

Not run: browser rendering, signed testnet transactions, AC12 human-operated flows,
live replacement scenario, Vercel deployment verification, multi-wallet/mobile.

---

## F01–F07 status

### F01 — DEPLOYMENT_CONFIGURED gate
Status: **ACCEPTED** (prior sessions).
`DEPLOYMENT_CONFIGURED` exported from `contract.ts`; Pool, Home, Create, Proof all gate on it.
Vercel needs `VITE_HUIPOT_ADDRESS` set in build env (user action, documented in DEMO_RUNBOOK.md).

### F02 — SPA routing
Status: **ACCEPTED** (prior sessions).
`vercel.json` rewrites all routes to `/index.html`. The rewrite rule is intentionally broad.
In Vercel's file-system routing, static assets (JS/CSS bundles, images, fonts, robots.txt,
manifest.json, favicon) are served directly from `dist/` before the SPA catch-all rewrite
applies — no explicit exclusion list is required. The Codex observation that `vercel.json`
does not list explicit exclusions is correct; the exclusions are unnecessary for Vercel
because of its file-first routing priority.

### F03 — Review before wallet write
Status: **ACCEPTED** with all follow-up fixes applied.
- Review modal opens before any `writeContract` call.
- Full addresses displayed (no truncation).
- Live chain check: `currentChainId` compared to `TARGET_CHAIN_ID` at confirm time.
- Pool state re-validated at confirm time (RC4: status/capacity/claimable).
- Gas string: "The wallet will show the exact fee before you sign (Arc gas, typically <0.01 USDC)."

### F04 — Receipt validation
Status: **ACCEPTED** with all follow-up fixes applied (RC1–RC6, RL1–RL3, SC1 this session).
See complete fix chain below.

### F05 — Proof verification
Status: **ACCEPTED** (prior sessions).
`computeOverallValid` in shared `verifyTxLogic.ts`; `amountPresent` requires `BigInt > 0n`;
`arcTransferFromMatchesContributor` enforced for Contributed.

### F06 — Share links
Status: **ACCEPTED** (prior sessions).
`buildShareLink` in `src/lib/share.ts` reads `VITE_APP_URL` env var when set; when absent,
falls back to `window.location.origin + import.meta.env.BASE_URL`. The Codex observation
that `share.ts` contains no `VITE_APP_URL` support was based on an earlier revision; the
current source (confirmed in place since the F06 fix session) does check `VITE_APP_URL`
before falling back to origin. The file was not changed in recent sessions; the prior report
description was inaccurate.

### F07 — Proof prefill
Status: **ACCEPTED** (prior sessions).
Proof page reads `?tx=` from URL search params to pre-fill transaction hash field.

---

## RC1–RC6 final status

### RC1 — Action-scoped receipt state
Status: **ACCEPTED**.
`receiptByAction` per-action map; `isActionBusy('contribute')` returns `true` only for
`'checking'`. After a confirmed partial contribution, the form re-enables.

### RC2 — Contributor/caller identity binding
Status: **ACCEPTED**.
Contributed: `topics[2]` → `logContributor` compared to `snap.accountAddress`.
PaidOut: `topics[2]` → `logCaller` compared to `snap.accountAddress`.
Refunded: `topics[2]` → `logContributor` compared to `snap.accountAddress`.
22 behavioral tests in `validateReceipt.test.ts` cover all identity binding cases.

### RC3 — Replacement/revert/retry lifecycle
Status: **ACCEPTED** (base + follow-up + RL1–RL3 + SC1 this session).
- (a) Wait-hook `isError` → `phase: 'error'` for revert.
- (b) Error phase not added to notifiedSet; retry re-runs validation.
- (c) `onReplaced` wired to all three hooks. `repriced`/`cancelled`/`replaced` handled.
- RL1–RL3 + SC1: see below.

### RC4 — Live pool state revalidation
Status: **ACCEPTED**.
`confirmAction` checks live `status` prop for each action before calling `writeContract`.

### RC5 — HTTP/RPC validation
Status: **ACCEPTED**.
`resp.ok` and `json.error` checked in `validateReceipt.ts`. Gas string is honest.

### RC6 — Confirmed evidence persistence
Status: **ACCEPTED**.
`confirmedTxRef` set on confirmed outcome. `ReceiptBanner` rendered at FUNDED,
myClaimable===0, and CLOSED for all three actions. Cross-session persistence
is not implemented (would require localStorage or backend).

---

## RL1–RL3 status

### RL1 — Repriced transaction stuck in checking (HIGH)
Status: **FIXED** (f00c80d; superseded by SC1 fix this session).
Root cause was shared counter (validationGenRef). Fixed by per-submission epoch in
`makeActionLifecycle`. See SC1 section for the complete solution.

### RL2 — Cancellation/replacement evidence has wrong hash (MEDIUM)
Status: **FIXED** (f00c80d).
`onReplaced` handlers pass `minedHash` to all phase variants.
`ReceiptBanner` for `replaced` uses `phase.minedHash ?? phase.txHash`.
`cancelled` banner conditionally renders link to `phase.minedHash`.

### RL3 — In-flight validation not cancelled on unmount (MEDIUM)
Status: **FIXED** (f00c80d; superseded by SC1 fix this session).
Root cause was no unmount cleanup. Fixed by `lifecycle.clear()` in useEffect cleanup.
See SC1 section for the complete solution.

---

## SC1 — Late callback binding (HIGH, this session)

### Root cause (two cases)

**Case 1 — Post-unmount repriced callback:**
The RL3 cleanup incremented `submissionIdRef.current` (old code) but a wagmi `onReplaced`
callback arriving after unmount read the new incremented value as its submissionId,
started a new validation, passed the stale-check (`epoch == epoch`), and called `onSuccess`.
The RPC guard (RL3) blocked an already-started RPC, but not a callback starting new work
after unmount.

**Case 2 — Old callback after new submission:**
A wallet tx from submission 1 fires its `onReplaced(repriced)` callback after submission 2
has already started. The callback read `submissionIdRef.current` (old code), which is now
submission 2's epoch. The old mined receipt was validated against submission 2's snapshot
and accepted as confirmation — wrong transaction accepted.

### Fix

Extracted all lifecycle logic to `src/lib/actionLifecycle.ts` — a plain TypeScript module
with no React dependencies. `makeActionLifecycle(rpcUrl, callbacks)` returns an object with:
- `beginSubmission(snap)` — increments epoch, returns immutable `SubmissionContext`
- `clear()` — increments epoch (unmount / account change)
- `runReceiptValidation(txHash, ctx)` — async, stale-checked at entry AND post-RPC
- `makeOnReplaced(ctx)` — returns a callback bound to `ctx.submissionId`

**SC1 fix is at callback entry, not post-RPC:**
`makeOnReplaced(ctx)` captures `ctx.submissionId` at `confirmAction` time. When the callback
fires (possibly later), its first line is `if (epoch !== submissionId) return`. This is a
synchronous check before any async work — no fetch starts, no state changes, no `onSuccess`
call. Both failing cases are rejected at the entry guard.

**Proof of correctness:**
- Post-unmount: `clear()` increments epoch (e.g. 1→2). Old callback has `submissionId=1`.
  Entry check: `epoch(2) !== submissionId(1)` → return. No work starts.
- Post-new-submission: new `beginSubmission` increments epoch (1→2). Old callback has
  `submissionId=1`. Entry check: `epoch(2) !== 1` → return. No work starts.
- Normal repriced: `isSuccess` and `onReplaced(repriced)` share `ctx.submissionId` from the
  same `beginSubmission` call. Neither increments epoch. The RL1 slot-claiming logic still
  applies within the same epoch.

### Production-path tests

`lifecycle.test.ts` was rewritten to import `makeActionLifecycle` directly.
There is no mirrored re-implementation of lifecycle logic in the test file.
Tests call `lc.beginSubmission()`, `lc.runReceiptValidation()`, `lc.makeOnReplaced()`,
and `lc.clear()` — the same functions ActionPanel calls. `validateReceipt` is called
through `runReceiptValidation` with a mocked `fetch` per test.

New test cases added:
- SC1-POST-UNMOUNT: `clear()` fires, then `onReplaced(repriced)` arrives — no fetch, no `onSuccess`
- SC1-POST-NEWSUB: new `beginSubmission`, then old ctx's `onReplaced` arrives — no fetch, no `onSuccess`
- SC1-POST-UNMOUNT-SUCCESS: RPC already in-flight when `clear()` fires — `onSuccess` not called
- Account scope: wrong account → `replaced`
- Pool scope: wrong pool → `replaced`
- Amount scope: wrong amount → `replaced`

Total: 18 lifecycle tests (up from 12), all calling production code.

---

## Outstanding items

| Item | Reason |
|---|---|
| EIP-55 checksum display | Cosmetic; not blocking |
| `typically <0.01 USDC` fee claim is unmeasured | Exact measurement requires live transaction |
| AC12 human-operated testnet flows | Requires wallet + testnet; no signing in Studio |
| WalletConnect mobile | No project ID available |
| Cross-session confirmed evidence | Requires localStorage or backend; out of scope |
| Live replacement scenario | Requires browser wallet and pending mempool tx |
| Vercel VITE_HUIPOT_ADDRESS config | Host-side action, documented in DEMO_RUNBOOK.md |
