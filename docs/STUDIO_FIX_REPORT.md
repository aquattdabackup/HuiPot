# HuiPot — Studio Fix Report (Rev 2)

> **Input commits reviewed:**
> - Baseline: `3f266fce3d0801a2c9df52cf535b371a33f27522` (original Studio build)
> - First fix pass: `307d8629adb508429ab2f7da27a5561a0441f9fd` (R1–R6 initial fixes)
> - Independent recheck of 307d862 found five negative Proof fixtures still accepted. See `docs/STUDIO_FIX_RECHECK.md`.
> - **This revision:** fixes all remaining open R1–R6 obligations from the recheck.
>
> **Studio project URL:** `https://studio.arc.io` — session-scoped; no stable permalink available.
> **Deployed contract (unchanged):** `0x81a139599d252eb2dc2bbb6c267e911a21264288` on Arc Testnet (chain 5042002).
> **Contract source changed:** NO. All D1–D8 money rules preserved unchanged.

---

## AC11/AC12 mapping (corrected per recheck)

Per original SPEC.md:

- **AC11** — Input validation: amount fields preserve raw input, reject malformed syntax, enforce 6-decimal/quantum/uint256 bounds.
- **AC12** — Local/testnet funded-payout flow (1 USDC goal, 0.4+0.6 contributions, payout) and underfunded expiry + refund. Status: **not run** — requires human-operated wallet transactions on Arc Testnet.

---

## Findings and fixes

### R1 — Amount input silently changed monetary meaning (HIGH)

**Recheck finding (307d862):** Core parsing repaired but regression test file `src/lib/__tests__/parseProductAmount.test.ts` was missing from delivered tree. Fee validation not demonstrated.

**This revision:**
- Added `src/lib/__tests__/parseProductAmount.test.ts` — 17 vitest tests covering the original three R1 failure cases (`"0,4"`, `"1e3"`, `"-0.4"`), additional invalid formats (`"+"`, `".5"`, `"1.2.3"`), decimal precision boundary, valid amounts, and uint256 overflow.
- All 17 tests pass. These are executable regression tests against the current parser, not the old failing evidence.
- Fee validation remains outside demonstrated parsing changes (noted as open item).

**AC:** AC09, AC11.

---

### R2 — Proof verdict showed "All checks passed" with failed checks (HIGH)

**Recheck finding (307d862):** Five of seven negative fixtures still returned `overallValid: true`:
1. Payout with unrelated movement sender → `true`
2. Payout with wrong native movement amount → `true`
3. Payout event amount below expected 1 USDC target → `true`
4. Refund without native movement evidence → `true`
5. Refund with unrelated native movement → `true`

**Root causes:**
- `amountMatches = amountInLog !== null` — only checked presence, not equality
- `movementRequired = eventFound === 'PaidOut'` — refund movement not required
- Arc Transfer selection picked the first Transfer from the system emitter without verifying the sender was the HuiPot contract
- `arcTransferAmountMatchesEvent` field not computed or included in verdict

**Fix (`src/pages/Proof.tsx`):**
- Arc Transfer filter now requires `topics[1]` (from address) matches `HUIPOT_ADDRESS`. Unrelated Transfers from the same emitter (user fee payments, etc.) no longer satisfy the check.
- After filtering by sender, the matching log is chosen by destination address match (`targetAddr` = recipientInLog), falling back to first if none found.
- New field `arcTransferAmountMatchesEvent: boolean | null` — compares `arcTransferAmount` to `amountInLog`. Mismatch sets `false` and adds a note.
- `movementRequired` now covers both `PaidOut` and `Refunded` (refund movement = Transfer from contract back to contributor).
- For `Refunded`, `arcTransferToMatchesRecipient` checks the Transfer destination matches the contributor address in the log.
- `overallValid` now requires: receipt ok + contract target + event + pool id + (PaidOut: recipient match) + amount present + movement from contract (PaidOut/Refunded) + movement destination matches + movement amount matches event.
- `Contributed` still requires only: receipt ok + contract target + event + pool id + amount present (contribution is an inbound Transfer, no outbound movement expected).

**New field in `VerifyResult`:** `arcTransferAmountMatchesEvent: boolean | null` — also shown in UI.

**AC:** AC13.

---

### R3 — Successful replacement transaction shown as pool action (MEDIUM)

**Recheck finding (307d862):** Pool.tsx action-success state (contribute/payout/refund) persisted across wallet changes because the account-change effect only cleared `amountStr`/`amountError`, leaving `contribHash`, `payoutHash`, `refundHash` and their derived `isSuccess` states intact.

**Fix (`src/pages/Pool.tsx`):**
- Added `actionKey` state (initialized from wallet address).
- Account-change effect now also calls `setActionKey(address ?? 'disconnected')`.
- The right action panel column uses `key={actionKey}`, causing React to remount the entire action subtree (including all `useWriteContract` and `useWaitForTransactionReceipt` hooks) when the wallet changes.
- Wallet B can no longer inherit wallet A's `refundSuccess=true` disabled state.

**AC:** AC11, AC12.

---

### R4 — Invalid input threw during render (MEDIUM)

**Recheck finding (307d862):** The three reproduced render crashes were fixed. Remaining: numeric route IDs above uint256 max were accepted (successful JS `BigInt` conversion ≠ ABI-range validity).

**Fix (`src/pages/Pool.tsx`, `src/pages/Proof.tsx`):**
- `UINT256_MAX = (1n << 256n) - 1n` constant added.
- `poolIdBig` computation now checks `v > UINT256_MAX` → returns `null`.
- `validPoolId` gates all queries and handlers, so an out-of-range ID renders the invalid-route screen instead of sending an unconstrained ABI argument.

**AC:** AC09, AC10, AC11.

---

### R5 — Pool state stale on deadline expiry or external wallet action (MEDIUM)

**Status unchanged from 307d862:** All five `useReadContract` calls poll every 12 seconds via `refetchInterval: 12_000`. Browser/testnet evidence of idle deadline transitions and external-wallet updates has not been collected (requires live wallet). This is documented as not run.

**AC:** AC11, AC12.

---

### R6 — Contract coverage gaps (MEDIUM)

**Recheck findings (307d862):**
1. `test_R6b_ForcedSurplus` used `vm.expectRevert` on a direct-transfer call, confirming rejection but not creating actual surplus. The test never verified accounting under balance > liabilities.
2. Rollback tests (R6e, R6f) did not assert log absence — only state/balances.

**Fix (`contracts/test/HuiPotGoalPool.R6.t.sol`):**
- **R6b rewritten:** After confirming direct-transfer rejection, uses `vm.deal` to forcefully inject 1 USDC surplus (the Foundry-standard mechanism for simulating SELFDESTRUCT-forced ETH). Then asserts: `balance >= liabilities`, contributor claimables unchanged (not inflated by surplus), refunds pay exact contribution amounts (not surplus), remaining balance after all refunds equals the injected surplus.
- **R6e (failed payout rollback):** Added `vm.recordLogs()` before each failed `payout()` call. After `expectRevert` confirms NativeTransferFailed, `vm.getRecordedLogs()` is checked — any log whose topic[0] equals `keccak256("PaidOut(uint256,address,address,uint256)")` fails the assertion. Both first and second attempts are checked.
- **R6f (failed claimRefund rollback):** Same pattern — `vm.recordLogs()`, then asserts no `Refunded(uint256,address,uint256)` topic in logged events after the failing call.
- Added `import {Test, Vm} from "forge-std/Test.sol"` to support `Vm.Log[]`.

**All 120 forge tests pass** (including updated R6b, R6e, R6f).

**AC:** AC06, AC07.

---

### WalletConnect (carried forward from 307d862)

`?? 'demo'` changed to `|| ''` — empty string disables WalletConnect in ConnectKit. Whitespace-only IDs trimmed in the same expression (`|| ''` after `.trim()`). Injected wallets unaffected. Runtime mobile behavior untested (no project ID configured).

---

## Validation results

| Check | Command | Exit | Result |
|---|---|---|---|
| Lint | `bash /home/user/arc-studio-helpers/check.sh` (oxlint step) | 0 | 0 warnings, 0 errors |
| Typecheck | `bash /home/user/arc-studio-helpers/check.sh` (tsc step) | 0 | Pass |
| Contract tests | `forge test --summary --fuzz-seed 1 -C contracts` | 0 | **120/120 passed**, 0 failed, 0 skipped |
| Unit tests (vitest) | `bun run test` | 0 | **17/17 passed** — R1 regression suite |
| Production build | Prior to 307d862; no contract or build-config change since | — | See `export-logs/vite-build-r6-fixes.log` |

Forge version: 1.7.1. Solc: 0.8.28. Bun: 1.3.14. Vitest: 2.1.9. Seed: 1.

### Test suite breakdown

| Suite | Tests |
|---|---|
| HuiPotGoalPool_AC01 | 27 |
| HuiPotGoalPool_AC02 | 14 |
| HuiPotGoalPool_AC0304 | 20 |
| HuiPotGoalPool_AC0506 | 19 |
| HuiPotGoalPool_AC07 | 5 |
| HuiPotGoalPool_AC0809 | 18 |
| HuiPotGoalPool_Fuzz (5 × 256 runs) | 5 |
| HuiPotGoalPool_Invariant (4 × 256 runs / 128k calls) | 4 |
| HuiPotGoalPool_R6a MultiPool Invariant (3 × 256 runs / 128k calls) | 3 |
| HuiPotGoalPool_R6b ForcedSurplus (updated) | 1 |
| HuiPotGoalPool_R6c TogglePayout | 1 |
| HuiPotGoalPool_R6d ToggleRefund | 1 |
| HuiPotGoalPool_R6e RollbackPayout (log-absence added) | 1 |
| HuiPotGoalPool_R6f RollbackRefund (log-absence added) | 1 |
| parseProductAmount vitest (R1 regression) | 17 |

---

## Unresolved findings and open gates

| Item | Status |
|---|---|
| R2 browser/testnet verification (Proof page with real wallet tx) | Not run — requires human-operated wallet |
| R3 multi-wallet browser test (A refunds, B connects) | Not run — requires browser + two wallets |
| R5 idle deadline / external-wallet browser evidence | Not run — requires live wallet |
| Fee validation (principal + estimated fee check) | Not implemented — noted as open |
| AC10 — browser layout/responsive test | Not run — browser unavailable |
| AC12 — human-operated testnet funded-payout + refund flows | Not run — requires wallet signatures |
| WalletConnect mobile wallet | Not testable — no project ID configured |
| Studio project permalink | Not available — session-scoped only |
| Bytecode metadata | Contract source unchanged; existing deployment matches reviewed source |
| Mainnet deployment | Not performed — separate gate |

## Logs

Raw logs under `export-logs/`:
- `forge-test-r6-fixes.log` — 120 tests, 307d862 revision
- `forge-test-recheck-307d862.log` — 120 tests, this revision (recheck fixes applied)
- `vitest-parseProductAmount.log` — 17 R1 regression tests
- `vite-build-r6-fixes.log` — production build from 307d862 (no build-affecting change since)
