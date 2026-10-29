# Create confirmation recovery review — b2bf1ef

Reviewed October 29, 2026 (Asia/Ho_Chi_Minh). **Partial acceptance; CW1/CW2 are not complete.** The new banner and retry after a settled receipt error work, but paused queries can reopen submission and prolonged pending has no effective in-app recovery boundary.

## Commits and scope

- Actual input/parent: `9e4ae8f5bc34a7d03432ea605acd15610adf3b6e`.
- Actual reviewed output: `b2bf1ef705f5eac6a14d047e391b701100a0cd3b`.
- Pulled main before review. Read AGENTS.md, STUDIO_CREATE_CONFIRMATION_RECOVERY.md, the Create source, test diff, and installed receipt/query implementations.
- Source delta is Create.tsx and createSafety.test.ts; AGENTS.md and recovery-results-new.json are reporting changes. No application, contract or Studio test source changed during this review.
- Validation used an ignored Git archive of the reviewed commit with existing installed dependencies. All 46 source/configuration files in manifest.json match the working checkout after CRLF normalization. No deployment, signing, broadcasting or hosting change.

## Findings

### CWR1 — P1: an unresolved paused query re-enables creation

`src/pages/Create.tsx:339` derives `hashPending` from `isLoading || isError`; line 689 disables submit using the same states plus wallet pending. These flags do not cover every unresolved receipt. With the installed TanStack Query, a hash whose lookup starts while offline has `status='pending'`, `fetchStatus='paused'`, `isLoading=false`, `isError=false`.

The real QueryObserver result fed into unchanged Create renders **no transaction link and an enabled Create pool button**. Invoking the enabled form handler causes a second write call (2 instead of 1). This can request another creation while the first transaction's outcome is unknown. It is not an automatic transaction or a wallet signature bypass.

`handleSubmit` at line 135 has no pending/hash guard either. Independently invoking it during a receipt error also makes a second write, though the visible submit button is correctly disabled in that error state. That latter probe is handler-level evidence, not proof of a browser keyboard bypass.

Required: base the unresolved-submission lock on the submitted transaction/context and resolved outcome, including paused/offline/query-idle transitions. Enforce it both in UI and before validation/snapshot mutation/write in the handler. Preserve the original context and explorer link until the submission is resolved. Test real query transitions, not only booleans selected by the test author.

### CWR2 — P2: pending status button does not provide bounded recovery

The watcher at Create.tsx:48 still supplies no timeout or delayed recovery mechanism. The installed wagmi core action supplies `timeout=0`. Create.tsx:412 simply invokes refetch. For a first fetch with no cached receipt, the installed TanStack query reuses the in-flight promise; it does not start a separate check.

Independent execution through the actual wagmi query/action and QueryObserver observed one waiter call before and after clicking the production status button, with timeout 0. The query remains pending until the original controlled waiter is explicitly resolved. The explorer link is a useful external recovery option, but the requested bounded wait/delayed in-app recovery is still missing.

Required: add a finite, honest delayed-confirmation state and a read-only recovery path that can complete or return a bounded unknown/error result when the original wait stalls. A finite waiter timeout followed by safe retry is one possible approach; an independently bounded receipt read is another. Do not interpret timeout or absent receipt as failure/no pool, clear the submission lock prematurely, or call writeContract. Preserve replacement hash and full snapshot checks. This test does not establish the cause of the user's original live spinner.

### CWR3 — P2: new regression tests do not execute the recovery path

The ten added Vitest cases are eight source-text checks, one self-constructed string assertion and one ABI decode check. None executes Create, clicks its retry callback, or passes real query states through the production component.

In particular, `CW2-BEH` at createSafety.test.ts:377 constructs the expected disabled expression inside the test and asserts that its own string contains `isReceiptError`; it can pass if the production guard is deleted. The retry source test at line 334 only proves two textual positions differ, which cannot prove the retry callback is read-only. The ABI positive control does not exercise retry or snapshot validation.

Required: replace these claims of behavioral coverage with production execution (mounted component or shared production logic plus component integration) for pending, paused, settled error, retry success, null/unindexed receipt, unmatched/reverted outcome and duplicate-submit prevention. Keep source assertions only as supplementary checks. The independent probes here are review instruments, not substitutes for maintained Studio regression tests.

## Accepted behavior and preserved fixes

- Pending (`isLoading=true`) renders the submitted hash's Arc explorer link outside the form. The status button is `type='button'` and invokes the receipt hook's refetch; it does not call writeContract.
- A settled receipt error displays its message, leaves submit disabled and exposes retry separately from write/wallet errors.
- A real errored query followed by the production retry callback performs two total reads, one total write and reaches validated success. Pending deduplication in CWR2 does not invalidate this settled-error recovery.
- Retry with a valid receipt uses the captured original snapshot despite form edits, preserves mined-hash links and creates no additional write. Different target and missing snapshot do not show intended-pool success. A controlled not-yet-indexed waiting state stays unknown and locked while loading.
- All prior 23 production probes remain unchanged and pass: zero/self/malformed recipient ordering, disconnected/wrong-chain/acknowledgement guards, all snapshot/event comparisons, changed live form/account, missing context, cancellation/unmatched receipt, mined links and Arc chain pinning.
- PF2 Custom/type=button and early disconnected return remain unchanged. No `require('viem')` was reintroduced. CS1/CS2/CSF acceptance remains valid for its prior scope.

## Independent validation

Run from `.review/recheck-b2bf1ef/snapshot` with local bun/forge binaries on PATH:

| Exact command | Exit | Result |
| --- | ---: | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 passed, 0 failed, 0 skipped |
| `bun run test` | 0 | 204 passed, 0 failed, 0 skipped; 6 files |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; TypeScript 0 errors |
| `bun run build` | 0 | Build succeeds; Vite emits chunk-size warnings |

Probe commands run from repository root (SOURCE below was `.review/recheck-b2bf1ef/snapshot`; OUT was `.review/recheck-b2bf1ef`):

| Exact command with those path aliases | Exit | Result |
| --- | ---: | --- |
| `node docs/evidence/recheck-f7297fd/production-create-probes.cjs SOURCE OUT/production-results.json` | 0 | 23 passed / 0 failed; no adaptation |
| `node docs/evidence/create-confirming/recovery-probes.cjs SOURCE OUT/recovery-results.json` | 0 | 3 passed / 0 failed; no adaptation |
| `node OUT/expanded-recovery-probes.cjs SOURCE OUT/expanded-results.json` | 1 | 8 passed / 5 failed across 13 checks |

The five expanded failures are two diagnostics for CWR2, two paused-state assertions for CWR1, and the repeat-handler guard assertion. They are not five unrelated defects. The expanded probe executes unchanged Create with controlled hooks, persistent refs, real viem logs and actual TanStack QueryObserver/wagmi query/action for refetch and offline states. It controls the final waiter instead of sending RPC or wallet requests; it is not a mounted browser test. It changes hash availability from the older always-present fixture to availability after write, supplies callable refetch, and adds actual query-state inputs. The original probes were run unchanged, not weakened.

Reproducible copy: `docs/evidence/recheck-b2bf1ef/expanded-recovery-probes.cjs`. Pass a checkout with dependencies installed as SOURCE. The original two probes return exit 0 even for assertion failures; their JSON counts were explicitly inspected. The expanded probe returns 1 on failed assertions.

Initial environment attempt: Forge exited 1 before tests because the dependency junction could not be created under default permissions. Re-established the existing dependency link with approved execution access and reran unchanged source. Initial and final logs are both retained; this was not a failing contract assertion. The first development run of the new review instrument also required correcting when its post-write hash was supplied to the query observer; final results contain no instrumentation error.

## Reporting corrections

- AGENTS.md's new full input hash is incorrect. Use the actual full parent above, not the reconstructed value in the Studio note.
- createSafety.test.ts contains **39 tests, previously 29**, not 40/30. The total 204 is correct. The ten new tests should not be described as three recovery behavioral tests.
- Both reported historical probe pass counts are reproduced, but the 3-case recovery probe uses permissive OR assertions and does not click retry. It cannot establish completeness of the handoff acceptance matrix.
- Installed versions: wagmi 2.19.5, @wagmi/core 2.22.1, viem 2.57.10, TanStack query-core/react-query 5.104.5. Evidence conclusions rely on these installed sources. The [official wagmi hook documentation](https://wagmi.sh/react/api/hooks/useWaitForTransactionReceipt) also documents that a reverted transaction throws an error; an error is not inherently a transport failure.

## Remaining scope and next Studio task

Receipt errors are surfaced, but the source still routes both receipt-read errors and confirmed-revert errors into the same generic confirmation-error/retry banner. The requested distinct confirmed-reverted presentation is not implemented or covered. Preserve the existing unmatched-receipt safeguards while adding accurate outcome classification; do not claim a timeout proves no pool exists.

No mounted DOM/keyboard, public deployment revision, live wallet, live replacement, mobile, cross-session restoration or live prolonged-delay recovery was tested in this review. Reload has no automatic write effect; it also has no recovery persistence. The user's original spinner trigger remains unknown. MetaMask malicious-site classification is unresolved and is not cleared by these code fixes or successful transactions.

Studio: pull main, record its actual full SHA, read this report and STUDIO_CREATE_CONFIRMATION_RECOVERY.md, and fix CWR1–CWR3 plus the confirmed-revert classification requirement. Do not change contracts, hosting or wallet protections. Keep prior CS/PF2 behavior and all 23 historical assertions. Run the full suite, both unchanged historical probes and the expanded probes, documenting instrumentation adaptations where the hook composition changes. Return exact source/output commits, command exits and honest coverage. Do not sign or deploy.
