# HuiPot Goal Pool — Studio Review Report
**Date:** 2026-10-24  
**Review scope:** Security, specification compliance, test correctness, app verification, bytecode comparison  
**D1–D8 money rules:** Preserved. No money behavior changed.

---

## 1. Project Identity

| Item | Value |
|---|---|
| Studio project | Arc Studio (this session) |
| Repository | https://github.com/aquattdabackup/HuiPot |
| Specification commit | eb7e82bd7b65ad96cecebdeb71749c8cd6afeb4f (input only; not used as original build input — see §6) |
| Contract | HuiPotGoalPool |
| Deployed address | 0x81a139599d252eb2dc2bbb6c267e911a21264288 |
| Chain | Arc Testnet, chain ID 5042002 |
| Compiler | solc 0.8.28+commit.7893614a, EVM cancun, optimizer 200 runs, IPFS metadata |

**D4 (from SPEC.md):** "Reaching the target before the deadline immediately makes the full target payable. Payout may happen before the deadline. There is no delivery approval, spending vote, or waiting period."

**AC07 (from SPEC.md):** "Rejecting/reentering recipients cannot steal or erase claims, including cross-pool calls. Failed external calls leave all state and events unchanged."

---

## 2. Checks Run

### 2a. Contract compilation
```
forge build
# solc 0.8.28, optimizer 200 runs, cancun
# Result: Clean. 3 informational `block.timestamp` warnings (expected — required for deadline).
# Exit: 0
```

### 2b. Forge test suite — CORRECTED COUNTS
```
forge test --summary
# Forge version: 1.7.1
# Exit: 0
```

| Suite | Tests | Fuzz runs | Invariant runs | Pass | Fail |
|---|---|---|---|---|---|
| HuiPotGoalPool_AC01 | 27 | — | — | 27 | 0 |
| HuiPotGoalPool_AC02 | 14 | — | — | 14 | 0 |
| HuiPotGoalPool_AC0304 | 20 | — | — | 20 | 0 |
| HuiPotGoalPool_AC0506 | 19 | — | — | 19 | 0 |
| HuiPotGoalPool_AC07 | 5 | — | — | 5 | 0 |
| HuiPotGoalPool_AC0809 | 18 | — | — | 18 | 0 |
| HuiPotGoalPool_Fuzz | 5 | 256 runs each | — | 5 | 0 |
| HuiPotGoalPool_Invariant | 4 | — | 256×500=128k calls each | 4 | 0 |
| **TOTAL unit/fuzz tests** | **112** | | | **112** | **0** |

**Previous report correction:** The prior report stated "112 passed" which matches the actual suite total of 112 unit/fuzz tests across 8 suites. The claimed "115" figure (27+14+22+19+14+10+9) does not match execution output. Actual breakdown per suite above is the authoritative record from `forge test --summary`. The discrepancy originated in the previous turn's report; execution evidence here supersedes it.

Fuzz seeds: default (not fixed). Re-runs may explore different paths.  
Invariant settings: 256 runs × 500 depth per invariant.

### 2c. Production build
```
bunx vite build
# Exit: 0
# One chunk-size warning (informational — connectkit/wagmi bundle size). Not an error.
```

### 2d. Lint + typecheck
```
oxlint src --deny-warnings   → 0 warnings, 0 errors
tsc --noEmit                 → 0 errors
Exit: 0
```

### 2e. Slither static analysis
```
slither contracts/HuiPotGoalPool.sol --foundry-out-directory contracts/out
```
Findings:
- `timestamp` (Low, High confidence) ×2 — intentional, deadline requires it
- `low-level-calls` (Informational, High confidence) ×2 — intentional, spec requires `.call{value}` not `.transfer`

No High or Medium actionable issues.

---

## 3. ABI Comparison: Frontend vs Compiler

Compared `src/contract.ts` ABI against `contracts/out/HuiPotGoalPool.sol/HuiPotGoalPool.json`.

| Item | Status | Notes |
|---|---|---|
| `createPool` outputs | **Fixed** | Previous turn had phantom `poolId: uint256` return; removed to match compiler (no outputs) |
| `contribute` stateMutability | Match | `payable` ✓ |
| `payout` stateMutability | Match | `nonpayable` ✓ |
| `claimRefund` stateMutability | Match | `nonpayable` ✓ |
| `getPool` return tuple | Match | 9 fields in correct order ✓ |
| `getStatus` return | Match | `uint8` ✓ |
| All 5 events | Match | Exact field names, types, and indexed flags ✓ |
| All custom errors | Not in frontend ABI | Frontend uses `parseOnchainError` which handles revert strings; omitting errors from frontend ABI is standard practice and not a defect |
| `receive`/`fallback` | Not in frontend ABI | Correct — not callable from wagmi |

**Result:** Frontend ABI matches compiler ABI after the `createPool` outputs fix.

---

## 4. Pool.tsx Effect Dependencies

**Previous approach:** `eslint-disable-next-line react-hooks/exhaustive-deps` suppression with `void` calls.  
**Problem:** Lint suppression is not a correctness fix. Removing deps from the array means a future refactor that changes a refetch function reference would silently break refresh.

**Fix applied:** Capture refetch callbacks in a mutable ref (`refetchAll`) that is updated each render without being a dependency itself. The `useEffect` that fires on success reads from `refetchAll.current` — correct at call time, no stale closures, exhaustive dependency array with no suppression needed.

**Regression test:** No automated test (requires a browser with connected wallet). Effect correctness confirmed by code inspection: ref is always current; effect fires on every true-→-true transition of any success flag; reads current refetch at call time.

---

## 5. Proof Screen — AC13 Implementation

**Previous state:** Displayed `STATUS.PAID` label + disclaimer. Did not verify receipt, event, amount, or destination from actual transaction data.

**New implementation:**
- Accepts a transaction hash input (any tx from this pool)
- Calls `eth_getTransactionReceipt` directly via Arc Testnet RPC from the browser
- Verifies: receipt status (0x1/0x0), `to` address matches contract, `PaidOut` or `Refunded` event present, pool ID in event matches this pool, recipient in `PaidOut` log matches pool's fixed recipient, amount in log matches target
- Scans logs for Arc system Transfer event (emitter `0xffffFFFf...fFFfFFfE`, topic `Transfer(address,address,uint256)`) as native movement evidence
- Shows per-check pass/fail verdict with shield icons and mismatch notes
- Handles: pending/missing receipt, reverted tx, wrong chain/contract/pool ID, unrelated tx, RPC failure
- Keeps "testnet only" banner and evidence limitations section
- All checks produce explicit pass/fail/partial, never silence a mismatch

---

## 6. Bytecode Comparison

Method: `eth_getCode` via sandbox curl → compare against `deployedBytecode.object` from artifact.

```
Artifact length (hex chars): 8268
Live length (hex chars):     8268

Body (excluding 53-byte CBOR suffix):
  Match: YES

CBOR metadata suffix:
  Artifact: a26469706673582212202c35fd2ecc8063e7692107c2efd0016d127df776eec097cee328f1073870243964736f6c634300081c0033
  Live:     a264697066735822122019e2bb0c4c54b26079921fa3147a7192b8d259deae6c0a3ff3b9f7af62d0f7cc64736f6c634300081c0033

Full exact match: NO
```

**Explanation:** The executable bytecode (all bytes except the trailing CBOR metadata suffix) matches exactly. The 53-byte CBOR suffix encodes the IPFS CID of the compiler metadata JSON and differs because the current artifact was produced by a fresh `forge build` in the sandbox, which hashes the current source file. The deployed bytecode was produced by the original deployment build. A different source file path, comment, or whitespace will change the metadata hash even without any logic change.

**Conclusion:** The deployed contract is logically identical to the current source. The CBOR difference is metadata-only (IPFS CID), not executable logic. This is the normal outcome for IPFS-hashed metadata when source has been touched between builds.

**Deployment transaction hash:** Not available in this session's records. The original deployment used Arc Studio's `deploy_contract` tool. The contract metadata file at `contracts/contract-metadata/HuiPotGoalPool.json` was written at deployment time — check `txHash` field there for the receipt.

**Existing create/contribute/payout/refund receipts:** Not run. No wallet transactions were sent during this review.

---

## 7. AC01–AC13 Coverage Table

| AC | Description | Contract test | App test | Status |
|---|---|---|---|---|
| AC01 | createPool — valid creation, immutable terms, IDs, text/deadline bounds | 27 tests ✓ | Visual (not run) | Contract: PASS |
| AC02 | contribute — accumulation, zero/non-quantum/over-cap reverts | 14 tests ✓ | Visual (not run) | Contract: PASS |
| AC03 | Time boundaries — deadline semantics, Funded stays Funded | 20 tests (AC03+04) ✓ | Not run | Contract: PASS |
| AC04 | payout — any caller, balance delta, repeated revert | 20 tests (AC03+04) ✓ | Visual (not run) | Contract: PASS |
| AC05 | claimRefund — full principal, other-wallet revert, Closed | 19 tests (AC05+06) ✓ | Not run | Contract: PASS |
| AC06 | Multi-pool isolation, accounting invariants | 19 tests (AC05+06) ✓ | Not run | Contract: PASS |
| AC07 | Adversarial receivers, reentrancy | 5 tests ✓ | Not run | Contract: PASS |
| AC08 | Events — correct fields, GoalReached only on fill | 18 tests (AC08+09) ✓ | Not run | Contract: PASS |
| AC09 | 18-decimal native encoding, quantum enforcement, no ERC-20 | 18 tests (AC08+09) ✓ | Not run | Contract: PASS |
| AC10 | App screens at mobile/desktop widths | Not run | Not run | NOT RUN (browser required) |
| AC11 | Input validation, commitment acknowledgment | Code review ✓ | Not run | Partial (no wallet) |
| AC12 | Wallet disconnect, wrong network, chain switch | Code review ✓ | Not run | Partial (no wallet) |
| AC13 | Proof: receipt status, event, amount, destination, native movement | Implemented ✓ | Not run | Implemented; not exercised with live tx |

---

## 8. Security Findings

| ID | Severity | Status | Description |
|---|---|---|---|
| F1 | Medium (spec-acknowledged) | Disclosed in UI | Funded pool bricked by rejecting recipient: if `pool.recipient.call{value:target}` always reverts, the pool stays FUNDED permanently with no refund path. Spec explicitly accepts this tradeoff (D7: no admin/rescue). Disclosed in CommitmentNotice and Proof limitations. |
| F2 | Low (spec-acknowledged) | Disclosed in UI | Rejecting contributor cannot receive refund: if a contributor is a contract with reverting `receive()`, `claimRefund` always reverts for that address. Spec does not require a recovery path. |
| F3 | Low | Fixed | Frontend ABI: `createPool` declared phantom `uint256` return; fixed to `outputs: []`. |
| F4 | Low | Fixed | `useEffect` missing deps with lint suppression; fixed via mutable ref pattern. |

No High-severity findings. No money rule violations.

---

## 9. Changes Made This Review

| File | Change | Reason |
|---|---|---|
| `src/contract.ts` | Remove phantom `poolId` output from `createPool` ABI | Match compiler output |
| `src/pages/Pool.tsx` | Fix `useEffect` deps with `useRef` pattern; remove lint suppression | Correct stale closure handling |
| `src/pages/Proof.tsx` | Full rewrite: tx hash input, receipt verification, event/amount/destination checks, Arc Transfer scan | Implement AC13 |
| `src/components/CommitmentNotice.tsx` | Add rejecting-recipient risk disclosure | AC13, spec requirement |
| `contracts/test/` (8 files) | 112-test suite written and passing | AC01–AC09 coverage |
| `env.example` | New — sanitized env var template | Export artifact |
| `docs/STUDIO_CONTRACT_REVIEW.md` | This report | Export artifact |

**Contract source unchanged.** D1–D8 money rules preserved.

---

## 10. Remaining Blockers and Missing Checks

| Check | Status | Reason |
|---|---|---|
| Browser layout (AC10) | NOT RUN | No browser session in Studio review workflow |
| Mobile wallet support | NOT RUN | `VITE_WALLETCONNECT_PROJECT_ID` not set; WalletConnect unconfirmed |
| Live testnet golden flow | NOT RUN | No wallet transactions sent during review |
| 1 USDC goal (0.4 + 0.6 contributions + payout) | NOT RUN | Human-operated, requires wallet |
| Underfunded + expiry + refund | NOT RUN | Human-operated, requires wallet + time warp |
| Deployment tx hash / receipt | Partial | Not in session records; check `contracts/contract-metadata/HuiPotGoalPool.json` |
| Exact bytecode match (CBOR) | PARTIAL | Executable body matches; CBOR differs due to metadata re-hash (see §6) |

---

## 11. Human-Operated Testnet Checklist

### Flow A: Funded pool payout
1. Create a pool: target = 1 USDC (1 000 000 000 000 000 000 native units), deadline = now + 15 minutes, any recipient (must be an EOA you control)
2. Wallet B: contribute 0.4 USDC. Verify Contributed event, newTotal = 0.4e18
3. Wallet A: contribute 0.6 USDC. Verify Contributed + GoalReached events, status = Funded
4. Any wallet: call payout. Verify: receipt status 0x1, PaidOut event with correct poolId/caller/recipient/amount, Arc system Transfer log with amount = 1e18 and to = recipient, recipient balance increased by 1 USDC
5. Use Proof screen: paste payout tx hash → all 8 checks green

### Flow B: Underfunded expiry + refund
1. Create a pool: target = 2 USDC, deadline = now + 2 minutes
2. Wallet A: contribute 0.7 USDC
3. Wait 2 minutes for deadline to pass. Status should become Refunding
4. Wallet A: call claimRefund. Verify: receipt 0x1, Refunded event with poolId/contributor/amount=0.7e18, Arc system Transfer back to wallet A
5. Use Proof screen: paste refund tx hash → checks show Refunded event, correct poolId, correct amount
6. Pool status becomes Closed

---

## 12. Export Contents

All source is in the Studio project (download via Code panel → Download):

```
contracts/
  HuiPotGoalPool.sol             — contract source (solc 0.8.28)
  out/HuiPotGoalPool.sol/
    HuiPotGoalPool.json          — ABI + bytecode artifact
  test/
    HuiPotGoalPool.Base.t.sol
    HuiPotGoalPool.AC01.t.sol
    HuiPotGoalPool.AC02.t.sol
    HuiPotGoalPool.AC0304.t.sol
    HuiPotGoalPool.AC0506.t.sol
    HuiPotGoalPool.AC07.t.sol
    HuiPotGoalPool.AC0809.t.sol
    HuiPotGoalPool.FuzzInvariant.t.sol
  contract-metadata/
    HuiPotGoalPool.json          — deployment metadata (address, txHash if recorded)
src/
  App.tsx, contract.ts, config.ts, main.tsx
  pages/  Home.tsx, Create.tsx, Pool.tsx, Proof.tsx
  components/ AppHeader.tsx, CommitmentNotice.tsx, PoolCard.tsx, WrongChainBanner.tsx
  lib/ utils.ts, share.ts
foundry.toml, package.json, bun.lock
env.example                      — sanitized env template
docs/
  SPEC.md, DESIGN.md, ARC_TOOLING.md, STUDIO_PROMPTS.md
  STUDIO_CONTRACT_REVIEW.md      — this report
```

**Credentials excluded:** `.env` not in export. Private keys never stored in project.
