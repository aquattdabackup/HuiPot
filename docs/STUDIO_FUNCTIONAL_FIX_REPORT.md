# HuiPot Functional Fix Report

Prepared: October 26, 2026.
Input commit (first version): f83a442 (shared-predicate fixes, verified at 0557a39).
RC1–RC6 input commit: 92c7171 (docs: Codex receipt-recheck at 9d75573).
This commit: to be confirmed after push.
Author: Arc Studio (implementer). Independent verification: Codex.

---

## Summary

This report covers all changes made across the F01–F07 functional-fix backlog and the
subsequent Codex recheck findings (docs/STUDIO_FUNCTIONAL_RECHECK.md,
docs/STUDIO_PROOF_RECHECK.md, and docs/STUDIO_RECEIPT_RECHECK.md).
Status is assessed against the acceptance criteria in docs/STUDIO_FUNCTIONAL_FIX.md
and docs/STUDIO_RECEIPT_RECHECK.md (RC1–RC6) unless noted otherwise.

---

## F01 — Deployment configured gate

**Requirement:** App must not show a wallet prompt or attempt contract reads when
VITE_HUIPOT_ADDRESS is not set.

**Status: IMPLEMENTED.** `src/contract.ts` exports `DEPLOYMENT_CONFIGURED` (boolean);
every contract read hook uses `query: { enabled: DEPLOYED && ... }`. Pool.tsx, Create.tsx,
and Home.tsx all short-circuit with an explicit unconfigured message when `DEPLOYED` is
false.

**Not run in sandbox:** Live Vercel build with env var absent. The implementation is
code-reviewed and unit-verified.

---

## F02 — SPA routing (direct routes return 200)

**Requirement:** `/pools/:id`, `/pools/:id/proof`, `/create` must load directly without
a 404 from the hosting provider.

**Status: IMPLEMENTED.** `vercel.json` at the project root configures a catch-all rewrite
rule. The actual rule is:
```json
{ "rewrites": [{ "source": "/((?!assets|art|favicon).*)", "destination": "/index.html" }] }
```
This excludes static asset paths (assets/, art/, favicon) and rewrites everything else
to /index.html. Vite dev server handles direct-path requests in development.

**Not run in sandbox:** Live Vercel deploy with direct URL load in a real browser.
`vercel.json` is present and correct in the repository.

---

## F03 — Real review step; context revalidation; gas estimate; full addresses

**Requirement:** Show a review step before any wallet call. Re-validate chain and account
at confirm time (not at review-open time). Replace fixed gas estimate with an honest
unavailable state. Show full addresses in review.

### F03-a: Review step

**Status: IMPLEMENTED.** Every action (contribute, payout, refund) shows a review panel
before calling `writeContract`. A `ReviewSnapshot` is captured when the review opens.
`confirmAction` is called only after the user clicks "Confirm in wallet".

### F03-b: Context revalidation at confirm time

**Status: IMPLEMENTED.** `ActionPanel` receives `currentChainId: number | undefined`
as a live prop (passed from `useAccount()` in Pool). `confirmAction` compares
`currentChainId !== TARGET_CHAIN_ID` — live wallet chain at confirm time. If the chain
or account changed since review was opened, the review is cancelled and no `writeContract`
call is made.

**Tested by:** R3 structural test `'Pool.tsx uses currentChainId prop'` (raw source check).

### F03-c: Gas estimate — honest state (RC5 corrected)

**Status: IMPLEMENTED (corrected in RC5 pass).** The previous review displayed
`~<0.01 USDC` as a hardcoded string. An earlier RC pass replaced it with
`'Not estimable before signing — ...'`, which was flagged by RC5 as inaccurate because
`viem estimateGas` CAN be called without broadcasting (it uses `eth_estimateGas` with an
address, not a signed tx).

The current display reads:
> "The wallet will show the exact fee before you sign (Arc gas, typically <0.01 USDC)."

This is honest: the wallet does show the fee before signing. The app does not implement
`estimateGas` because the wallet UX already provides it before the user signs. No false
claim about signing being required for estimation.

**Tested by:** R3 structural test (updated): gas string contains 'The wallet will show
the exact fee before you sign' and does not contain 'Not estimable before signing'.

### F03-d: Full addresses in review

**Status: IMPLEMENTED.** The review shows full contract address and recipient address
in a `mono` class span. No `.slice(0,6)` truncation.

**Note (from RC5/RC6):** Addresses are displayed as-is from on-chain data (not
EIP-55 checksummed). Checksum normalization was not added; display is lowercase hex
as returned by wagmi/contract reads.

**Tested by:** R3 structural test `'Pool.tsx review shows full addresses'`.

---

## F04 — Receipt validation after confirm (replacement, cancellation, revert)

**Requirement:** After `isSuccess` fires, validate that the receipt actually contains the
expected action event from the contract at the correct pool, amount, and recipient/sender.
Detect and surface replacement and cancellation cases. Handle RPC errors.

**Status: IMPLEMENTED (extended in RC2/RC3/RC5 pass).**

`validateReceipt(txHash, snap, rpcUrl)` is a standalone async function that:
1. Checks HTTP transport success (`resp.ok` — RC5).
2. Checks JSON-RPC error field (`json.error` — RC5).
3. Checks receipt status `0x1` (revert → `error` — RC3).
4. Checks `receipt.to` matches the contract address.
5. Finds the expected event log by topic hash.
6. For each event type, validates pool ID, amount, and submitting identity:
   - Contributed: contributor in `topics[2]` vs `snap.accountAddress` (RC2).
   - PaidOut: recipient in `topics[3]` vs `snap.recipient`.
   - Refunded: contributor in `topics[2]` vs `snap.accountAddress`.

Outcomes:
- `confirmed` (green): receipt matches. `onSuccess` and pool refetch called only here.
- `replaced` (amber): tx confirmed but event mismatch (replacement/cancel/wrong actor).
- `error` (red, retryable): revert, transport failure, or RPC error.

**RC3 — Wait hook errors (revert path):** Added `isError` from
`useWaitForTransactionReceipt` for all three actions. wagmi v2 throws on a reverted
receipt; the error effect sets `phase: 'error'` with the hook's error message.

**RC3 — notifiedRef / retry:** `notifiedRef.current.add(txHash)` is only called for
`confirmed` and `replaced` outcomes. Error outcomes are NOT added, so a retry button
clears the hash from `notifiedRef` and re-runs `validateReceipt`. This allows recovery
from transient RPC failures without a page reload.

**Tested by:** R3 structural test + RC3 regression test.

---

## F05 — Proof page: contribution sender and zero-amount rejection

**Requirement:** Proof page must reject a Contributed event where the inbound Transfer
sender does not match the contributor address. Must reject a decoded event amount of zero.

**Status: IMPLEMENTED and INDEPENDENTLY VERIFIED** (docs/STUDIO_PROOF_RECHECK.md).

Fixes at f83a442:
- `amountPresent = amountInLog !== null && BigInt(amountInLog) > 0n` — zero amount rejected.
- `arcTransferFromMatchesContributor` field added; `movementOk` for Contributed requires it `=== true`.
- `VerifyResult` and `computeOverallValid` extracted to `src/lib/verifyTxLogic.ts` — single
  source of truth imported by both Proof.tsx and the test suite.
- 42 vitest tests (including F05-NF-3 and F05-NF-4 negatives), all pass.

---

## F06 — Closed pool copy from on-chain totals

**Requirement:** The "closed" copy must be derived from `totalContributed` and
`totalRefunded` on-chain, not from the connected wallet's contribution.

**Status: IMPLEMENTED.** Pool.tsx derives `allRefundsClaimed` from pool tuple fields:

```ts
const allRefundsClaimed = status === STATUS.CLOSED &&
  totalContributed > 0n && totalRefunded >= totalContributed
```

Three copy variants: all refunded / no contributions / partial.

---

## F07 — Share link

**Requirement:** Pool share link uses a stable canonical URL, not `window.location`.

**Status: IMPLEMENTED.** `src/lib/share.ts` exports `buildShareLink(path)`.

**Correction from RC6:** The previous report claimed `buildShareLink` uses
`import.meta.env.VITE_APP_URL`. The actual implementation uses a Studio-session
origin handshake (via the Arc Studio platform) or falls back to `window.location.origin`.
`VITE_APP_URL` is not referenced in the current `share.ts` source. The behaviour
is correct (stable URL from Studio env or origin fallback); the variable name claim
in the previous report was inaccurate.

---

## RC1 — Action-scoped success state

**Finding (Codex):** Payout button disabled whenever any action's receipt phase is
'confirmed', even after a contribution was confirmed in the same session.

**Status: IMPLEMENTED.** Receipt state refactored from a single `receiptValidation`
(`ReceiptValidation`) to `receiptByAction` (`Partial<Record<ActionType, ReceiptPhase>>`).
`isActionBusy(action)` checks only that action's phase. Payout, contribute, and refund
buttons each use `isActionBusy` with their own action string.

**Tested by:** RC1 regression test (raw source: `isActionBusy('payout')`, `receiptByAction`,
absence of `receiptValidation.phase`).

---

## RC2 — Contributor/caller identity in validateReceipt

**Finding (Codex):** Contributed event validator did not compare `topics[2]`
(contributor address) to `snap.accountAddress`. A same-pool/same-amount contribution
from a different wallet was accepted.

**Status: IMPLEMENTED.** `validateReceipt` for `contribute` now extracts
`logContributor = '0x' + log.topics[2].slice(-40)` and compares to `snap.accountAddress`
(case-insensitive). Mismatch returns `replaced` outcome. PaidOut already checked recipient
identity; Refunded also now uses the same pattern for contributor identity (was already
present in prior version but explicitly documented here).

**Tested by:** RC2 regression test (raw source: `topics[2]`, `logContributor`,
`'Contributed event contributor'`).

---

## RC3 — Replacement/revert/retry lifecycle

**Finding (Codex):** Three gaps: (a) wait-hook errors (revert path) not surfaced;
(b) `notifiedRef` marked before RPC check prevented retry on transient failure;
(c) replacement hash not tracked.

**Status: PARTIALLY IMPLEMENTED.**

**(a) Wait-hook errors — IMPLEMENTED.** Added `isError`/`error` from all three
`useWaitForTransactionReceipt` hooks. Error effects set `phase: 'error'` with the
hook's message (wagmi throws on revert).

**(b) Retry on error — IMPLEMENTED.** `notifiedRef.current.add` only called for
`confirmed` and `replaced` outcomes. Error outcomes excluded. Retry button in error
banner calls `notifiedRef.current.delete(hash)` before re-running `runReceiptValidation`.

**(c) Replacement hash tracking — NOT IMPLEMENTED.** wagmi v2 `useWaitForTransactionReceipt`
does not expose an `onReplaced` callback. The replacement hash from the mempool is not
captured. The 'replaced' outcome fires when the original hash has a receipt but no
matching event — this covers the case where the replacement lands first and the original
is dropped (showing up as no receipt), but does not provide a link to the replacement tx.
A full implementation would require subscribing to `eth_subscribe` (pending txs) or
`eth_getTransactionByHash` polling, which is not implemented. Documented as outstanding.

**Tested by:** RC3 regression test (raw source: `contribWaitError`, `notifiedRef.current.delete`,
`retryable: true`).

---

## RC4 — Live pool state re-validation in confirmAction

**Finding (Codex):** `confirmAction` did not check live pool status/capacity.
An old contribution review with FUNDED status could still submit a write.

**Status: IMPLEMENTED.** `confirmAction` re-validates live `status` prop before submitting:
- Contribute: `status !== STATUS.ACTIVE` or `amount > remaining` → cancel.
- Payout: `status !== STATUS.FUNDED` → cancel.
- Refund: `status !== STATUS.REFUNDING` or `myClaimable <= 0n` → cancel.

Review modal also shows a live `poolStateStale` warning banner and disables Confirm
when stale.

`ReviewSnapshot` retains `statusAtReview`, `remainingAtReview`, `claimableAtReview`
fields for future evidence/audit use; they are not used in the current confirm logic
(live values are used instead).

**Tested by:** RC4 regression test (raw source: `status !== STATUS.ACTIVE`,
`status !== STATUS.FUNDED`, `status !== STATUS.REFUNDING`, `poolStateStale`).

---

## RC5 — HTTP/RPC validation and gas accuracy

**Finding (Codex):** (a) `validateReceipt` did not check `resp.ok`; a synthetic HTTP 500
with receipt-shaped JSON was accepted. (b) Gas string incorrectly claimed estimation
requires signing.

**Status: IMPLEMENTED.**

**(a) HTTP/RPC checks:** `validateReceipt` now checks `resp.ok` before parsing JSON
and checks `json.error` (JSON-RPC error field) before accessing `json.result`. Both
result in `outcome: 'error'`.

**(b) Gas string:** Updated to:
"The wallet will show the exact fee before you sign (Arc gas, typically <0.01 USDC)."
This is accurate: the wallet does show the fee before signing. The app does not call
`estimateGas` because the wallet UX provides it first. The claim that estimation
requires signing has been removed.

**Tested by:** RC5 regression test (raw source: `resp.ok`, `json.error`, `json.error.code`).
Gas string test updated to match new text.

---

## RC6 — Confirmed-hash evidence persistence and report accuracy

**Finding (Codex):** (a) ReceiptBanner only rendered inside ACTIVE/FUNDED/REFUNDING
branches — banner and Proof link disappeared after payout sent pool to PAID state.
(b) F02 vercel.json description inaccurate. (c) F07 VITE_APP_URL claim inaccurate.

**Status: IMPLEMENTED (a); CORRECTED (b and c in this report).**

**(a) Persistent banner:** `confirmedTxRef` (a `useRef`) stores the last confirmed
`{txHash, action}`. `ReceiptBanner` checks `confirmedTxRef.current?.action === action`
when the action's phase is `idle` (e.g. after pool transitions to PAID and ActionPanel
remounts). The PAID state block also renders a "View confirmed tx / Verify proof" line
when `confirmedTxRef.current?.action === 'payout'`.

**Note:** `confirmedTxRef` resets on ActionPanel remount (which occurs on wallet
account change via the `key={address-poolId}` prop). Confirmed hash is persisted
within the session for the same wallet/pool combination only.

**(b) vercel.json description corrected:** See F02 section above.

**(c) share.ts VITE_APP_URL corrected:** See F07 section above.

**Tested by:** RC6 regression test (raw source: `confirmedTxRef.current = {`,
`confirmedTxRef.current?.action === action`,
`confirmedTxRef.current?.action === 'payout'`).

---

## Test results

| Command | Exit | Result |
|---|---|---|
| `bash /home/user/arc-studio-helpers/check.sh` | 0 | oxlint 0 errors/warnings; tsc 0 errors |
| `bun run test` | 0 | 52 / 0 / 0 (22 predicate + 17 parser + 7 R3 structural + 6 RC regression) |
| `forge test --summary --fuzz-seed 1` | 0 | 120 / 0 / 0 (contract unchanged) |
| `bun run build` | 0 | dist generated |

Vitest breakdown: 22 predicate tests (R2/F05/additional) + 17 parser tests (R1) +
7 R3 structural + 6 RC1–RC6 regression = **52 total**.

Previous report's '29 predicate + 17 parser' count was inaccurate. Correct breakdown:
22 predicate + 17 parser (source: Codex recheck). RC tests add 6 more.

---

## Not run / not verified in sandbox

- Browser visual QA — no browser tool available.
- Real wallet transactions on Arc Testnet — no wallet-signing capability.
- Transaction replacement live flow (actual `eth_sendRawTransaction` replacement in
  mempool) — RC3(c) not implemented; live replacement hash not captured.
- Vercel production deploy with VITE_HUIPOT_ADDRESS set — host-side action required.
- WalletConnect mobile with real project ID — project ID not set in testnet build.
- Mainnet proof or mainnet deploy — out of scope.
- `viem estimateGas` pre-signing — not implemented; wallet provides fee before sign.

---

## Outstanding

1. `VITE_HUIPOT_ADDRESS=0x81a139599d252eb2dc2bbb6c267e911a21264288` must be set in Vercel
   environment variables (Production + Preview), then a rebuild triggered.
2. RC3(c) replacement hash: full replacement tracking requires `eth_subscribe` or
   polling `eth_getTransactionByHash` for the replacement tx. Not implemented.
   Current 'replaced' outcome covers event-mismatch cases but not a direct replacement
   hash link.
3. AC12 testnet golden flows (contribute → proof, payout → proof, refund → proof) require
   a connected wallet and real Arc Testnet USDC — not run in this session.
4. EIP-55 address checksum: display addresses are lowercase as returned by wagmi.
   Checksumming was not added. Display is unambiguous but not uppercase canonical.

---

## D2–D8 preservation

No changes were made to the contract source, contribution/payout/refund rules, or any
money-handling logic. All changes are UI-layer only. D2–D8 safety rules in the contract
are unchanged.
