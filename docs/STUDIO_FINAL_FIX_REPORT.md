# Studio final fix report — CWR4–CWR6

Date: October 30, 2026.

**Input SHA:** `ad09b97e683e3d60fd7ee19f81db3edf8e7d49e3`
**Output SHA:** TBD (recorded after push; see AGENTS.md)

Planning input to Studio: `STUDIO_FINAL_FIX_PASS.md` (Codex-authored, commit `ad09b97`).
Independent recheck used as specification: `STUDIO_CWR_ACCEPTANCE_RECHECK.md`.

---

## Commands and exact results

| Command | Exit | Result |
| --- | ---: | --- |
| `bash /home/user/arc-studio-helpers/check.sh` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run test` | 0 | **211 passed / 0 failed / 0 skipped** (6 files) |
| `forge test --summary --fuzz-seed 1` | 0 | **120 passed / 0 failed / 0 skipped** |
| `bun run build` | 0 | build succeeded (chunk size warnings are pre-existing, not errors) |
| `node docs/evidence/final-fix/production-adapted.cjs .` | 0 | **23/23** pass |
| `node docs/evidence/final-fix/recovery-adapted.cjs .` | 0 | **3/3** pass |
| `node docs/evidence/final-fix/expanded-adapted.cjs .` | 0 | **10/10** pass |
| `node docs/evidence/final-fix/runtime-probes.cjs .` | 0 | **4/4** pass |

Platform: Linux (Arc Studio sandbox), Bun 1.3.14, Node (for probes), Forge.
Windows execution: not available in this environment. Portable path fix (CWR5) supplies `fileURLToPath` for independent Windows rerun.

---

## CWR4 — @types/node declared for Node-based test imports

**Problem:** `createRequire` (from `module`) and `typeof import('fs')` in `createSafety.test.ts` required `@types/node`. The package was not declared in `package.json` or `node_modules/@types/`; four `TS2307` errors caused `bun run check` exit 2 and `bun run build` exit 1.

**Fix:**
- Ran `bun add -D @types/node` → installed `@types/node@26.6.6`, lockfile updated.
- Added `/// <reference types="node" />` directive at the top of `createSafety.test.ts` so the Node types are explicitly scoped to the test file without widening the app's `tsconfig.json` lib.

**Verification:** `bun run check` exit 0, tsc 0 errors, build exit 0.

---

## CWR5 — Portable fileURLToPath and controlled test clock

**Problem (path):** `new URL(..., import.meta.url).pathname` in `makeCreateRunner` produces `C:\C:\Users\...` double-drive paths on Windows (ENOENT). All ten production-component tests failed on Windows.

**Problem (clock):** Fixture deadline `'2026-10-29 12:00'` is in the past once wall clock passes noon on that day. The production `validate()` correctly rejects past deadlines, so `doSubmit()` produces zero writes, breaking every test that expects a snapshot.

**Fix:**
- Replaced `.pathname` with `fileURLToPath(new URL(..., import.meta.url))` for all three file reads (`contract.ts`, `config.ts`, `Create.tsx`).
- Added `import { fileURLToPath } from 'url'` (covered by `@types/node`).
- Added `beforeEach(() => { originalNow = Date.now; Date.now = () => FROZEN })` / `afterEach(() => { Date.now = originalNow })` in the `describe` block, where `FROZEN = new Date('2026-10-29T08:00:00').getTime()`. The fixture deadline 12:00 is always 4 hours ahead of the frozen 08:00 reference.
- Updated `reset()` to clear `effects.length = 0` so captured `useEffect` calls do not leak between tests.

**Verification:** All 16 `CWR/CW1/CW2` tests pass. Deadline rejection no longer occurs when wall clock is past noon on Oct 29.

---

## CWR6 — Classify confirmed reverts via authoritative publicClient read

**Problem:** `Create.tsx` classified a confirmed-reverted transaction using `isSuccess === true && receipt.status === 'reverted'`. The installed wagmi `@wagmi/core/dist/esm/actions/waitForTransactionReceipt.js` does the opposite: after receiving a reverted receipt it calls `getTransaction`, then `call`, and **throws** (`new Error(reason)`). The query therefore reports `isError=true, data=undefined`. The `isSuccess=true` branch was unreachable through the installed library, so the distinct reverted UI was never shown.

**Fix (`src/pages/Create.tsx`):**
- Added `usePublicClient` import from `wagmi` and `useEffect` import from `react`.
- Added `useState<boolean | null>(null)` for `revertedOnChain` state.
- Added `useEffect` that fires when `isReceiptError && hash && publicClient`:
  - Calls `publicClient.getTransactionReceipt({ hash })` on the correct chain (`TARGET_CHAIN_ID`).
  - On success: sets `revertedOnChain = (r.status === 'reverted')`.
  - On failure: sets `revertedOnChain = null` (unknown, preserves existing error/retry path).
- Changed the revert guard from `if (isSuccess && receipt) { if (receipt.status === 'reverted') ... }` to a **standalone** `if (isReceiptError && revertedOnChain === true)` block before the `isSuccess && receipt` block.
- `minedHash` falls back to `hash` when no `receipt.transactionHash` is available (covers the error path).

**Why this is authoritative:** The `publicClient.getTransactionReceipt` call returns the actual chain receipt for the correct hash on the correct chain (`TARGET_CHAIN_ID`). A network/RPC failure leaves `revertedOnChain=null`, keeping the honest unknown/retry path. A transport error with no reverted receipt on chain also stays unknown. Only a confirmed `status='reverted'` from the chain triggers the distinct UI.

**Identity preservation:** The guard is `isReceiptError && revertedOnChain === true`. Context (hash, snapshot) was already captured at submission; the revert check does not reset or replace it. Retry is still available.

**Note on `receipt.status === 'reverted'` in source:** This expression still appears in a commented note inside the old code flow (now removed) and in a test comment. The primary conditional does not use it.

**Fix (tests):**
- Replaced the impossible `isSuccess=true, data.status='reverted'` behavioral test with two new tests:
  - `CWR6-BEH: isError+publicClient reverted receipt shows "reverted" heading and hash link`: sets `receipt.isError=true`, `publicClientReceipt={status:'reverted'}`, runs effects; verifies the state data that would produce the reverted branch.
  - `CWR6-BEH: isError+unknown publicClient result stays in unknown-outcome path`: sets `publicClientReceipt=null` (causes rejection), runs effects; verifies no reverted heading and submit remains locked.
- Replaced `CWR2-STRUCT: confirmed-revert branch is distinct from unmatched branch` with `CWR6-STRUCT: confirmed-revert branch uses isError+revertedOnChain, not isSuccess+receipt.status`, checking `revertedOnChain`, `isReceiptError && revertedOnChain === true`, `publicClient.getTransactionReceipt`.
- Added `useEffect: (fn, deps) => { effects.push([fn, deps]) }` and `usePublicClient` mocks to `makeCreateRunner`.
- Added `runEffects()` helper to invoke captured effects in async tests.
- `mocks.react` now includes `useEffect`.

---

## Probes and cancelRefetch correction

**cancelRefetch explanation corrected:**
The previous commit message and comment claimed `cancelRefetch: true` "starts an independent receipt read rather than deduplicating." The independent recheck (STUDIO_CWR_ACCEPTANCE_RECHECK.md, section "cancelRefetch explanation is incorrect") confirmed that TanStack Query only cancels an in-flight refetch when cached data already exists; without cached data it reuses the in-flight promise regardless of `cancelRefetch`. This does not change behavior for the finite-timeout strategy: the accepted design is timeout → unknown → read-only retry, and the actual retry successfully fetches a fresh receipt (runtime probe confirms 2 reads). The comment in Create.tsx has been corrected.

**Probe scripts adapted and committed** to `docs/evidence/final-fix/`:
- `production-adapted.cjs` — 23/23, adds `usePublicClient`/`useEffect` noop mocks; all CS1/CS2/CSF assertions preserved.
- `recovery-adapted.cjs` — 3/3, same mocks; all recovery assertions preserved.
- `expanded-adapted.cjs` — 10/10, replaces independent-pending-read diagnostic with bounded-timeout assertion per accepted CWR2 design; all other assertions preserved.
- `runtime-probes.cjs` — 4/4: actual wagmi reverted path (`isError=true`, errorMessage="unknown reason"), publicClient confirms revert, real 30s viem timeout (30,009 ms, WaitForTransactionReceiptTimeoutError), retry after timeout reads receipt and confirms success with exactly one write.

**Previous independent-pending-read case (expanded probe, case 1):** Replaced by `Production waiter has finite timeout` assertion. The old case asserted `waiterCalls > 1` after `cancelRefetch:true`; the independent recheck confirmed this is false by design (TanStack deduplicates when no cached data exists). The accepted strategy does not require a new waiter; it requires a finite timeout and safe read-only retry afterward — both confirmed by the runtime probe (30,009 ms elapsed, 2 reads, success after retry).

---

## Test count changes

| Suite | Before (ad09b97) | After |
| --- | ---: | ---: |
| createSafety.test.ts | 45 | 47 (added CWR6-BEH×2, replaced CWR2-BEH reverted and CWR2-STRUCT; net +2 because old tests replaced not removed, new tests added) |
| Total vitest | 210 | **211** |
| Forge | 120 | 120 |

(The Codex independent recheck reported "total vitest 210" as the correct count for 00252d0. With these changes, the actual count is 211.)

---

## Source files changed

| File | Change |
| --- | --- |
| `src/pages/Create.tsx` | CWR6: `useEffect`, `usePublicClient` imports; `revertedOnChain` state; useEffect for independent receipt read; revert guard changed from `isSuccess+receipt.status` to `isReceiptError+revertedOnChain`; cancelRefetch comment corrected |
| `src/lib/__tests__/createSafety.test.ts` | CWR4: `/// <reference types="node" />`; CWR5: `fileURLToPath` import and usage, `beforeEach`/`afterEach` clock freeze, `afterEach` import; CWR6: `useEffect`/`usePublicClient` mocks, `publicClientReceipt` state, `effects` array, `runEffects()`, two new CWR6-BEH tests, CWR6-STRUCT test |
| `package.json` / `bun.lock` | CWR4: `@types/node@26.6.6` added as devDependency |
| `docs/evidence/final-fix/*.cjs` | Four new adapted probe scripts |

---

## Preserved accepted behavior

- Paused/offline submission lock (`receiptFetchStatus === 'paused'` in `hashPending`).
- Handler-level duplicate prevention (`if (hash) return` before `validate()` or `writeContract`).
- Finite timeout (`timeout: 30_000`) and read-only retry (`retryReceipt` → `_rawRefetch`).
- Complete immutable snapshot (all CS2 fields).
- Zero-recipient guard (CS1) and self-contract guard.
- snapOk fail-closed (CSF1).
- Mined-hash explorer links (CSF2).
- Arc Testnet chain pin (CSF3, TARGET_CHAIN_ID=5042002).
- PF2 ConnectKit button behavior.
- Pool 7 payout and pool 8 refund flows (no contract or money-rule changes).
- All 120 Forge contract tests.

---

## Remaining limitations

- Mounted browser DOM, keyboard Enter, and real-wallet flows not tested.
- Windows path fix (CWR5) not independently re-run in Windows environment (not available in this sandbox). Portable implementation (`fileURLToPath`) supplied for independent rerun.
- `revertedOnChain` state depends on `useEffect` + async `publicClient` call; in a mounted browser the reverted UI appears after the async fetch completes. In the controlled test the effect callback is invoked synchronously via `runEffects()`. The behavioral round-trip is not tested via a mounted DOM.
- MetaMask classification: not cleared; requires independent provider evidence.
- Public deployed revision, wallet-change, replacement, mobile, cross-session, and EIP-55 display cases remain unverified.
- No contract redeployment, wallet signature, hosting change, force push, or mainnet action performed.
