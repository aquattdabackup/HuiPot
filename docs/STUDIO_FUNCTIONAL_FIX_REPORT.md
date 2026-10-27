# HuiPot Functional Fix Report

Studio output commit: *(see commit message for exact SHA)*
Input commit for this session: **139ed88** (docs: verify 9965d37 and isolate stale callback dispatch)

---

## Validation summary

| Command | Exit | Result |
|---|---|---|
| `bash /home/user/arc-studio-helpers/check.sh` | 0 | oxlint 0, tsc 0 |
| `bun run test` | 0 | **105/105 pass** (4 files, ~1.6s) |
| `forge test --summary --fuzz-seed 1` | 0 | **120/120 pass** |
| `bun run build` | 0 | dist generated |

Test count breakdown:

| File | Tests | Notes |
|---|---|---|
| `verifyTx.test.ts` | 35 | Predicate + structural |
| `parseProductAmount.test.ts` | 17 | Parser regressions |
| `validateReceipt.test.ts` | 28 | Behavioral receipt validation (22 behavioral + 6 structural) |
| `lifecycle.test.ts` | 25 | RL1×4 + SC1-D×7 + SC1×3 + RL2×4 + RL3×3 + scope×3 + retry×1 |
| **Total** | **105** | |

Not run: browser rendering, signed testnet transactions, AC12 human-operated flows,
live replacement scenario, Vercel deployment verification, multi-wallet/mobile.

---

## F01–F07 status

### F01 — DEPLOYMENT_CONFIGURED gate
Status: **ACCEPTED** (prior sessions).
`DEPLOYMENT_CONFIGURED` exported from `contract.ts`; Pool, Home, Create, Proof all gate on it.
Vercel needs `VITE_HUIPOT_ADDRESS` set in build env (user action required; see DEMO_RUNBOOK.md).

### F02 — SPA routing
Status: **ACCEPTED** (prior sessions).
`vercel.json` rewrites all routes to `/index.html`. The file also includes explicit
exclusion rules for `/assets/*`, `/art/*`, `/favicon.ico`, `/robots.txt`, and
`/manifest.json` so those static paths are served directly. The SPA rewrite catches
everything else.

### F03 — Review before wallet write
Status: **ACCEPTED** with all follow-up fixes applied.
- Review modal opens before any `writeContract` call.
- Full addresses displayed (no truncation).
- Live chain check: `currentChainId` (from `useAccount`) compared to `TARGET_CHAIN_ID` at confirm time.
- Pool state re-validated at confirm time (RC4: status/capacity/claimable).
- Gas string: "The wallet will show the exact fee before you sign (Arc gas, typically <0.01 USDC)."
  `typically <0.01 USDC` is unmeasured; EIP-55 display not added.

### F04 — Receipt validation
Status: **ACCEPTED** with all follow-up fixes applied (including RC1–RC6, RL1–RL3, SC1, SC1-D).
See RC3/SC1/SC1-D sections below.

### F05 — Proof verification
Status: **ACCEPTED** (prior sessions).
`computeOverallValid` in shared `verifyTxLogic.ts`; `amountPresent` requires `BigInt > 0n`;
`arcTransferFromMatchesContributor` enforced for Contributed.

### F06 — Share links
Status: **ACCEPTED** (prior sessions).
`buildShareLink` in `src/lib/share.ts` uses `window.location.origin + import.meta.env.BASE_URL`
as the base, with an iframe-origin check for the Studio handshake. The source does NOT read
a `VITE_APP_URL` environment variable; setting that variable has no effect on share link URLs.

### F07 — Proof prefill
Status: **ACCEPTED** (prior sessions).
Proof page reads `?tx=` from URL search params to pre-fill transaction hash field.

---

## RC1–RC6 final status

### RC1 — Action-scoped receipt state
Status: **ACCEPTED**.
`receiptByAction` per-action map; `isActionBusy('contribute')` returns `true` only for `'checking'`.

### RC2 — Contributor/caller identity binding
Status: **ACCEPTED**.
All three actions bind contributor/caller via topics[2]; 22 behavioral tests in validateReceipt.test.ts.

### RC3 — Replacement / revert / retry lifecycle
Status: **ACCEPTED** (base + RC follow-up + RL1–RL3 + SC1 + SC1-D).
See RL1–RL3 and SC1/SC1-D sections below.

### RC4 — Live pool state revalidation
Status: **ACCEPTED**.
`confirmAction` checks live `status` prop for each action before calling `writeContract`.

### RC5 — HTTP/RPC validation
Status: **ACCEPTED**.
`resp.ok` and `json.error` checked in `validateReceipt.ts`. Gas string is honest.

### RC6 — Confirmed evidence persistence
Status: **ACCEPTED**.
`confirmedTxRef` set on confirmed outcome (inside `setPhase`). ReceiptBanner rendered at:
- ACTIVE and FUNDED: contribute evidence
- FUNDED: payout action panel
- PAID: payout evidence via `confirmedTxRef`
- REFUNDING (myClaimable > 0): refund action panel
- REFUNDING (myClaimable === 0): refund evidence
- CLOSED: both contribute and refund evidence via ReceiptBanner

Note: each state branch renders the banners relevant to that state, not all three
actions at every state.

---

## RL1–RL3 status

### RL1 — Repriced transaction stuck in checking (HIGH)
Status: **FIXED** (see RL1 section in prior reports).
`beginSubmission` increments epoch once per wallet write. `isSuccess` and `onReplaced(repriced)`
share the same submissionId. `activeSlot` serialises competing validations.

### RL2 — Cancellation/replacement evidence has wrong hash (MEDIUM)
Status: **FIXED**.
`replaced` and `cancelled` phases carry `minedHash`. Banners link to `minedHash ?? txHash`.

### RL3 — In-flight validation not cancelled on unmount (MEDIUM)
Status: **FIXED**.
`useEffect` cleanup calls `lifecycle.clear()` which advances epoch.

---

## SC1 and SC1-D status

### SC1 — Late callbacks adopt current submission context (HIGH)
Status: **FIXED** (9965d37).
`makeOnReplaced(ctx)` closes over `ctx.submissionId` at call time. First line: `if (epoch !== submissionId) return`.
Post-unmount and post-new-submission late deliveries are rejected before fetch/state change.

### SC1-D — Old hash event dispatched to newest handler (HIGH)
Status: **FIXED** (this revision).

Root cause: Pool.tsx stable wrappers (`onContribReplaced = (r) => onContribReplacedRef.current(r)`)
read the current per-action handler ref at dispatch time. After a second same-action submission,
`onContribReplacedRef.current` pointed to the new handler (new epoch). An old onReplaced event
for tx A arrived via the stable wrapper, resolved to the new handler, passed the epoch check
(`epoch === submissionId` because both were the same new epoch), and validated the old receipt
under the new submission's context.

Fix: hash-keyed dispatch. `actionLifecycle.ts` now exposes:
- `registerHash(txHash, ctx)` — called in `useEffect` when write data becomes available
- `dispatchOnReplaced(r)` — looks up ctx for `r.replacedTransaction.hash`
- `dispatchSuccess(txHash)` — looks up ctx for txHash
- `dispatchRetry(txHash)` — clears notifiedSet entry and re-runs validation

Pool.tsx stable wrappers now call `lifecycle.dispatchOnReplaced(r)` for all three actions.
`isSuccess` useEffects call `lifecycle.dispatchSuccess(hash)`.
Retry button calls `lifecycle.dispatchRetry(phase.txHash)`.

An old hash that belongs to a stale submission: its registered ctx has an old submissionId.
`dispatchOnReplaced` looks up ctx → finds ctx1 (epoch1). Delegates to `makeOnReplaced(ctx1)(r)`.
First line: `epoch(2) !== submissionId(1)` → returns before fetch/state change.
If the hash is not registered (post-`clear()`), lookup returns undefined → ignored.

Regression tests (7 new SC1-D tests in lifecycle.test.ts, using dispatchOnReplaced / dispatchSuccess):
- SC1-D-CONTRIB, SC1-D-PAYOUT, SC1-D-REFUND: all three action types, old repriced event after new submission
- SC1-D-SUCCESS: late `dispatchSuccess(HASH_A)` after new submission rejected
- SC1-D-CURRENT: current submission confirms correctly (positive control)
- SC1-D-UNKNOWN: unregistered hash silently ignored
- SC1-D-RETRY: `dispatchRetry` re-runs validation after transient error

---

## Lifecycle test coverage

| Count | Description |
|---|---|
| 4 | RL1 behavioral (direct-module API) |
| 7 | SC1-D (component-path dispatch: all 3 actions, late success, retry, unknown, control) |
| 3 | SC1 post-unmount/post-new-submission (direct-module + dispatch path) |
| 4 | RL2 (2 behavioral + 2 structural) |
| 3 | RL3 (1 behavioral + 2 structural) |
| 3 | account/pool/amount scope |
| 1 | Retry (direct-module) |
| **25** | **Total lifecycle** |

Limitations: no chain-switch lifecycle scenario; no mounted React/wagmi browser test; no
live mempool replacement.

---

## Outstanding items

| Item | Reason |
|---|---|
| EIP-55 checksum display | Cosmetic; not blocking |
| `typically <0.01 USDC` fee claim is unmeasured | Arc gas fees are stable and low; measurement requires live tx |
| AC12 human-operated testnet flows | Requires wallet + testnet; no signing in Studio |
| WalletConnect mobile | No project ID |
| Cross-session confirmed evidence | Requires localStorage or backend |
| Live replacement scenario | Requires browser wallet and pending mempool tx |
| Vercel VITE_HUIPOT_ADDRESS build env | User action required (see DEMO_RUNBOOK.md) |
