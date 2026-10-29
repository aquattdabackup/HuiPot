# CWR1–CWR3 independent recheck — 00252d0

Date: October 29, 2026, Asia/Ho_Chi_Minh.

**Verdict: partial acceptance.** The paused-submission lock and finite receipt-wait recovery work in controlled production/library execution. Confirmed-revert classification is still ineffective through the installed wagmi path. New tests introduce reproducibility and build failures. Do not treat this revision as fully validated or MetaMask-cleared.

## Actual revisions and environment

- Input/parent: `4d9f3c07ac74a02689be16039d949e0bc413e03a`.
- Pulled/reviewed output: `00252d0e38e4bc9e047072246e905424c8878951`.
- Compared against STUDIO_CREATE_CONFIRMATION_RECHECK.md and its earlier confirmation-recovery specification.
- Changed source: Create.tsx and createSafety.test.ts. Other changes: AGENTS.md and three result JSON files. Application/contract/Studio test source was not modified by this review.
- Tests ran in an ignored Git archive of this exact revision with the same existing dependencies used for the previous successful review. All 46 inspected source/configuration files match after CRLF normalization. Manifest and logs: `docs/evidence/recheck-00252d0/`.
- Installed: wagmi 2.19.5, @wagmi/core 2.22.1, viem 2.57.10, TanStack query-core/react-query 5.104.5. Windows, Node, Bun and Forge local tooling; no wallet/RPC/hosting action.

## Findings requiring Studio changes

### CWR4 — P1: new test imports break the declared typecheck/build environment

createSafety.test.ts:320 imports `createRequire` from `module`, and lines 328, 330 and 396 refer to `typeof import('fs')`. The committed package manifest and lock do not declare @types/node, and it is absent in the reviewed installed dependency tree. These imports produce four TS2307 errors. `bun run check` exits 2; `bun run build` exits 1 before Vite runs. Lint itself remains clean.

This is a reproducibility gap in the delivered dependencies/test configuration, not a contract failure. A different Studio environment may have ambient Node types installed; that does not make them part of the delivered project.

Required: declare the types needed by maintained Node-based tests or use a properly configured test toolchain that avoids relying on undeclared ambient packages. Update the lockfile if dependencies change. Verify a reproducible install, check and build without weakening typechecking or excluding the regressions merely to hide errors.

### CWR5 — P2: production test runner is platform- and date-dependent

1. `new URL(..., import.meta.url).pathname` at createSafety.test.ts:329, 331 and 397 is not a portable filesystem path. On Windows it leads to `C:\C:\Users\...\src\contract.ts`. All ten tests invoking makeCreateRunner fail with ENOENT. Use a supported file URL directly or fileURLToPath.
2. The runner hardcodes October 29, 2026 at 12:00 local time in form state and event fixtures (lines 419 and 429), but never controls Date.now. After that time, the real production submit handler correctly rejects the fixture as expired and no snapshot/write exists. This will also affect a Linux environment once its local clock passes noon.

Independent extraction of the unchanged runner, with only a Windows read-path adapter, demonstrated one write at 08:00 and zero writes at 13:00, with `Deadline must be in the future.` The application source and validation were unchanged. This demonstrates the date defect independently of the Windows path failure; it is not an accepted rerun of the full suite.

Required: portable paths plus a controlled/restored test clock and coherent future deadline fixtures. Assert that the initial submission actually wrote once before testing later transitions. The official independent Vitest result remains **200 passed / 10 failed**, not 210/210.

### CWR6 — P2: confirmed-revert branch is unreachable through the normal watcher result

Create.tsx:267–270 assumes wagmi returns `isSuccess=true` with `receipt.status='reverted'`. The installed @wagmi/core action does the opposite: after receiving a reverted receipt it obtains the transaction, attempts a call for the reason, and throws. The query therefore reports an error without receipt data.

Execution through the actual installed wagmi query/action and actual QueryObserver with a controlled reverted receipt produced:

```text
status=error, isSuccess=false, isError=true, data absent
generic "Could not confirm the transaction" banner and retry visible
distinct "Transaction reverted" heading absent
```

The new Vitest revert case injects the impossible normal-hook combination directly, so it tests an artificial branch without validating the library boundary.

Required: classify confirmed reverts using authoritative receipt evidence on the correct chain/hash, including replacement identity where applicable. Do not classify generic RPC errors or text mentioning a revert as proof of an on-chain reverted receipt. Test the real installed watcher/action path (or an equivalent integration with its actual rejection semantics), not only `isSuccess: true` fixtures. Keep timeout/unknown distinct from confirmed revert and successful-but-unmatched receipt.

## Acceptance of CWR1 and the bounded portion of CWR2

- Paused/offline result: explorer remains visible, submit disabled. Actual QueryObserver `status=pending, fetchStatus=paused, isLoading=false, isError=false` now passes through production Create correctly.
- `if (hash) return` in handleSubmit prevents the second write and snapshot mutation during paused/error states, independent of UI disable. This accepts the post-hash duplicate prevention requested in CWR1; it is not a mounted keyboard or pre-hash wallet-prompt race test.
- `timeout: 30_000` is passed to the watcher. Actual viem timer execution timed out in 30,012 ms, produced WaitForTransactionReceiptTimeoutError, and rendered the honest unknown-outcome text while keeping the hash link and submission lock.
- After that timeout, the production retry callback read a matching receipt and validated the original submission with exactly one write total and two reads. No copied timeout predicate was used.
- This timer probe explicitly sets query retry=false to observe a single attempt. The app's default browser query retries can postpone the visible terminal timeout; do not promise that its banner always changes exactly 30 seconds after submission.
- Pending/unindexed does not falsely confirm a pool. Full snapshot comparison, missing-context rejection, mined links and fixed Arc chain are preserved.

### cancelRefetch explanation is incorrect, but a new independent pending read is no longer mandatory

Create.tsx:56–60 and the commit message claim cancelRefetch:true starts an independent pending read. The installed TanStack Query only cancels an in-flight refetch this way when cached data already exists. With no receipt data, it reuses the in-flight promise. The default refetch behavior already requests cancellation under the same conditions.

The old pending diagnostic still observes one waiter call, even after appropriate asynchronous settling. This is **not** a deferred-microtask increment. However, the specification explicitly allowed a finite waiter timeout followed by safe retry as an alternative. The actual 30-second timeout/retry probe passes, so independent pending-read creation is not required for acceptance of that bounded strategy. Correct the comment/report and make the maintained acceptance test describe the selected strategy honestly.

## CWR3 and the three expanded failures

makeCreateRunner does execute the transpiled production Create component with controlled hooks and real ABI decoding. This improves on the former self-string assertions. It does not duplicate the application predicate.

The new block actually has **16 cases: 10 production-component cases and 6 source assertions**, not 15 behavioral tests. Total createSafety is correctly 45 (29 preserved + 16), and total suite is 210. The suite currently fails for the environment/clock reasons above. Its mocked revert result also misses CWR6.

Reproduced the unchanged expanded probe: **10 pass / 3 fail**. Explanation of each:

1. Independent pending read: real TanStack deduplication, not microtask timing. It remains false with cancelRefetch:true; treat it as a diagnostic of a now-optional approach, not a required assertion for the finite-timeout design.
2. Query completion: Create's retry wrapper now returns void. The old probe's `await onClick()` therefore no longer awaits the underlying refetch promise. Waiting for actual query settlement makes this pass.
3. Settled-error retry success: same void-return timing change; waiting for actual query settlement makes it pass.

The assertion that a minimal receipt fixture fails wagmi's full TransactionReceipt type requirement is **not supported**. The exact same fixture succeeds after waiting for the query to settle. No receipt fields were added in the adapted probe. JavaScript type annotations do not impose runtime validation here.

The timing-adapted expanded probe gives **12 pass / 1 fail**, preserving all original assertions; the remaining diagnostic is the independent-pending-read claim. Separate real timer/revert probes give **2 pass / 1 fail**, the failure being CWR6.

## Historical probe adaptation and preserved CS/CSF/PF2

The two original scripts always supplied HASH_A before the first write. After adding `if (hash) return`, that fixture intentionally prevents their initial submission, leaving no snapshot. Unchanged results are **15/23** and **2/3**, both scripts still exit 0 because their harnesses do not set failing exit codes.

Changing only their mocked hash lifecycle to undefined before write, HASH_A after write, restores **23/23** and **3/3**. No assertion, production function or receipt field was weakened. Adapted scripts are included in the evidence folder. Studio's checked-in pass counts are consistent with this adaptation, but the changed probe script was not committed; the original invocation alone does not reproduce its reported results.

The adapted 23-case probe preserves all prior CS1/CS2/CSF/PF2 assertions: recipient guards; connected/chain/acknowledgement handling; all snapshot/event-field comparisons; live form/account changes; absent/empty snapshot rejection; cancellation/unmatched events; mined-hash links and chain pinning. ConnectKit Custom/type=button and the disconnected guard remain unchanged. App code has no new require('viem'); the test runner deliberately uses createRequire for its controlled execution.

## Exact independent commands and results

Suite working directory: `.review/recheck-00252d0/snapshot`, with local Bun and Forge binaries on PATH.

| Command | Exit | Result |
| --- | ---: | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 passed / 0 failed / 0 skipped |
| `bun run test` | 1 | 200 passed / 10 failed / 0 skipped; 5 files pass, 1 fails |
| `bun run check` | 2 | oxlint 0 warnings / 0 errors; 4 TypeScript TS2307 errors |
| `bun run build` | 1 | Same 4 TypeScript errors; Vite build not reached |

Probe commands from repository root; `SRC=.review/recheck-00252d0/snapshot`, `OUT=.review/recheck-00252d0`:

| Command with those path aliases | Exit | Pass / fail |
| --- | ---: | --- |
| `node docs/evidence/recheck-f7297fd/production-create-probes.cjs SRC OUT/production-results.json` | 0 | 15 / 8 |
| `node docs/evidence/create-confirming/recovery-probes.cjs SRC OUT/recovery-results.json` | 0 | 2 / 1 |
| `node docs/evidence/recheck-b2bf1ef/expanded-recovery-probes.cjs SRC OUT/expanded-results.json` | 1 | 10 / 3 |
| `node OUT/production-adapted.cjs SRC OUT/production-adapted-results.json` | 0 | 23 / 0 |
| `node OUT/recovery-adapted.cjs SRC OUT/recovery-adapted-results.json` | 0 | 3 / 0 |
| `node OUT/expanded-adapted.cjs SRC OUT/expanded-adapted-results.json` | 1 | 12 / 1 |
| `node OUT/runtime-recovery-probes.cjs SRC OUT/runtime-results.json` | 1 | 2 / 1 |
| `node OUT/runner-clock-probe.cjs SRC OUT/runner-clock-results.json` | 1 | 1 / 1 clock-control observations |

Saved runnable review scripts are under `docs/evidence/recheck-00252d0/`; they accept a checkout with dependencies as SRC. These are independent diagnostics, not Studio-authored application/tests or a substitute for the maintained suite. One early build-runner invocation occurred before Forge had written its runs.json and failed as an orchestration precondition; the subsequent actual `bun run build` result above is separately recorded.

## Focused next delivery and open items

Studio: fix CWR4–CWR6, preserve accepted CWR1 and bounded timeout/retry behavior, and correct the cancelRefetch/probe/test-count explanations. Commit any required dependency/lock/configuration changes and reproducible adapted probes. Freeze/restore the test clock, use portable paths, and include a real-library revert negative plus successful-receipt positive control. Rerun all commands and report actual counts/exits/full commits. No contract redeployment or wallet signature is needed for these changes.

Not run: mounted DOM/keyboard, public deployed-revision check, real wallet, live replacement, public RPC outage, mobile, cross-session recovery or complete contribution/payout/refund demo. Original live spinner cause remains unproven. No hosting changes, transactions or MetaMask clearance claim.
