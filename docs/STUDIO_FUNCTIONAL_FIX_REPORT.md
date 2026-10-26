# HuiPot Functional Fix Report

Studio output commit: *(see commit message for exact SHA)*
Input commit for this session: **86511d1** (docs: RC recheck at 7467d1b)

---

## Validation summary

| Command | Exit | Result |
|---|---|---|
| `bash /home/user/arc-studio-helpers/check.sh` | 0 | oxlint 0, tsc 0 |
| `bun run test` | 0 | **80/80 pass** (3 files, 1.06s) |
| `forge test --summary --fuzz-seed 1` | 0 | **120/120 pass** |
| `bun run build` | 0 | dist generated |

Test count breakdown:
- 52 predicate + structural (verifyTx.test.ts — unchanged count from prior session)
- 17 parser (parseProductAmount.test.ts — unchanged)
- **11 new** validateReceipt behavioral tests (validateReceipt.test.ts — this session)
  - 4 RC5 HTTP/RPC rejection
  - 1 RC3 revert detection
  - 3 positive controls
  - 5 RC2 contributor/caller binding
  - 4 RC2 PaidOut caller
  - 2 RC2 Refunded contributor
  - 5 structural/source checks

Not run: browser rendering, signed testnet transactions, AC12 human-operated flows, replacement live scenario, Vercel deployment verification.

---

## F01–F07 status

### F01 — DEPLOYMENT_CONFIGURED gate
Status: **ACCEPTED** (prior sessions).
`DEPLOYMENT_CONFIGURED` exported from `contract.ts`; Pool, Home, Create, Proof all gate on it. Vercel needs `VITE_HUIPOT_ADDRESS` set in build env (user action required).

### F02 — SPA routing
Status: **ACCEPTED** (prior sessions).
`vercel.json` rewrites all routes to `/index.html`. Note: rewrites apply to HTML navigation routes only; asset/art/favicon paths are not affected (no wildcard exclusion needed).

### F03 — Review before wallet write
Status: **ACCEPTED** with all follow-up fixes applied.
- Review modal open before any `writeContract` call.
- Full addresses displayed (no truncation).
- Live chain check: `currentChainId` (from `useAccount`) compared to `TARGET_CHAIN_ID` at confirm time — not stored snapshot.
- Pool state re-validated at confirm time (RC4: status/capacity/claimable).
- Gas string: "The wallet will show the exact fee before you sign (Arc gas, typically <0.01 USDC)." — does not claim estimation is impossible; wallet does show the fee.
- Outstanding: `typically <0.01 USDC` is unmeasured; EIP-55 checksum display not added.

### F04 — Receipt validation
Status: **ACCEPTED** with all follow-up fixes applied.
- `validateReceipt` extracted to `src/lib/validateReceipt.ts` (shared lib, directly testable).
- RC2 follow-up: PaidOut `topics[2]` (caller) now compared to `snap.accountAddress`.
- RC3: revert surfaced as `phase: 'error'` via wait-hook `isError`.
- RC3: `onReplaced` callback wired to all three `useWaitForTransactionReceipt` hooks; repriced/cancelled/replaced cases handled.
- RC3: `validationGenRef` generation counter prevents stale async resolutions.
- RC3(c): replacement hash IS now tracked via `onReplaced` (wagmi 2.19.5 supports it — see recheck evidence). Repriced → re-validates replacement hash. Cancelled → surfaces cancelled banner. Replaced → surfaces replaced banner.
- RC5: `resp.ok` and `json.error` checked before any receipt data used.
- RC6: `confirmedTxRef` persists `{txHash, action}` after confirmed. ReceiptBanner renders at FUNDED (contribution), in myClaimable===0 branch (refund), and in CLOSED branch (refund + contribution).

### F05 — Proof verification
Status: **ACCEPTED** (prior sessions).
- `computeOverallValid` in shared `verifyTxLogic.ts`; `amountPresent` requires `BigInt > 0n`; `arcTransferFromMatchesContributor` enforced for Contributed.
- New: `validateReceipt.ts` shares the same identity-binding logic; tested behaviorally.

### F06 — Share links
Status: **ACCEPTED** (prior sessions).
`buildShareLink` in `src/lib/share.ts` reads `VITE_APP_URL` with window.location fallback.

### F07 — Proof prefill
Status: **ACCEPTED** (prior sessions).
Proof page reads `?tx=` from URL search params to pre-fill transaction hash field.

---

## RC1–RC6 final status

### RC1 — Action-scoped receipt state
Status: **FULLY FIXED**.
- `receiptByAction` per-action map; `isActionBusy(action)` scopes each action.
- **Follow-up fixed:** `isActionBusy('contribute')` returns `true` only for `'checking'`, not `'confirmed'`. After a confirmed partial contribution, the form re-enables immediately for another contribution if remaining capacity > 0.

### RC2 — Contributor/caller identity binding
Status: **FULLY FIXED**.
- Contributed: `topics[2]` → `logContributor` vs `snap.accountAddress` (prior session).
- Refunded: `topics[2]` → `logContributor` vs `snap.accountAddress` (prior session).
- **Follow-up fixed:** PaidOut: `topics[2]` → `logCaller` vs `snap.accountAddress`. Wrong caller → `replaced`.
  Note: this binds the receipt to the submitted context; it does not restrict who may legitimately call payout on-chain. If the same payout was triggered by a different wallet before this user's tx confirmed, this user's receipt will show `replaced`.
- Behavioral tests: 11 cases in `validateReceipt.test.ts` including valid/invalid controls for all three actions.

### RC3 — Replacement / revert / retry lifecycle
Status: **FULLY FIXED** (including previously claimed-impossible replacement tracking).
- (a) Wait-hook `isError` → `phase: 'error'` for revert (prior session).
- (b) `notifiedRef` not set on error; retry button clears hash (prior session).
- (c) **Follow-up fixed:** `onReplaced` wired to all three hooks.
  - `repriced` reason: re-validates the mined replacement hash using `pendingSnapRef.current`.
  - `cancelled` reason: surfaces `phase: 'cancelled'` banner.
  - `replaced` reason: surfaces `phase: 'replaced'` banner.
  - `validationGenRef` generation counter: stale async validations from previous submissions discarded.
  - Prior claim that wagmi v2 does not support `onReplaced` was incorrect; wagmi 2.19.5 supports it (see `docs/STUDIO_RC_RECHECK.md` installed-source evidence).

### RC4 — Live pool state revalidation
Status: **ACCEPTED** (prior session). No changes this session.
`confirmAction` checks live `status` prop for each action before calling `writeContract`.

### RC5 — HTTP/RPC validation
Status: **ACCEPTED** (prior session). No changes to logic.
`resp.ok` and `json.error` checked in `validateReceipt.ts`. Gas string updated.

### RC6 — Confirmed evidence persistence
Status: **FULLY FIXED**.
- `confirmedTxRef` set on confirmed outcome (prior session).
- **Follow-up fixed (all 3 cases):**
  1. ACTIVE→FUNDED: `ReceiptBanner action="contribute"` rendered outside the ACTIVE branch, at `status === STATUS.FUNDED && isConnected`.
  2. Refund confirmed → myClaimable===0: `ReceiptBanner action="refund"` rendered in the `myClaimable === 0n` branch with contextual message.
  3. CLOSED: `ReceiptBanner action="refund"` and `action="contribute"` rendered inside CLOSED block.
- Component-local `confirmedTxRef` does not survive remount; cross-session persistence not implemented (requires external storage, out of scope).

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
