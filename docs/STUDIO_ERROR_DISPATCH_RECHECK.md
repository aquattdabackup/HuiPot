# c3ae551 CK1 / SC1-E validation

October 27, 2026, Asia/Ho_Chi_Minh. Pulled main first and independently checked GitHub HEAD. Read AGENTS.md and STUDIO_FUNCTIONAL_FIX_REPORT.md in full, then inspected all changed source and test sections against the previous reviewed revision.

- Studio input / previous review delivery: `9aecf5739f67b05223809f23e4e1f74dc2ca626c`.
- Studio output / application reviewed: **`c3ae551f1ca541de415b75e4d2718b5b3cc73781`**.
- Codex output: this report, evidence and project memory only. No application, contract, dependency or Studio test source edits.

**CK1 and SC1-E are accepted for the tested cases.** The required check command now succeeds. All three stale wait-error cases that failed at bb992a6 now preserve the current action state; current-error/retry controls remain functional. Previously accepted receipt and lifecycle cases still pass. This is scoped validation, not a security audit or live-wallet acceptance.

## Exact validation results

Tests ran sequentially against an exact Git archive of the input SHA. Existing dependency installation was reused only after package.json and bun.lock matched byte-for-byte. Source integrity is recorded in the [manifest](evidence/recheck-c3ae551/manifest.json); build artifacts remained in the ignored snapshot.

| Command | Exit | Result |
| --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 passed, 0 failed, 0 skipped |
| `bun run test` | 0 | 112 passed, 0 failed, 0 skipped; four files; Vitest duration 10.89s |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run build` | 0 | TypeScript/Vite build succeeds; warning about chunks over 500 kB |

All four commands passed on their first run. Full [command exits/timing](evidence/recheck-c3ae551/runs.json) and [logs](evidence/recheck-c3ae551/) are retained. Assertions and lint policy were not weakened by this review.

Vitest breakdown: 35 verifyTx + 17 parser + 28 validateReceipt + 32 lifecycle = **112**. Lifecycle contains **27 behavioral production-module/dispatch-API tests + 5 raw-source checks**. No import timeout. These are not 32 independent Codex probes or mounted React/wagmi tests.

## Requested confirmations

1. **CK1:** the unused parameter is removed from the SC1-D-RETRY fetch stub; the exact repository command `bun run check` exits 0, including its typecheck stage.
2. **SC1-E-CONTRIB/PAYOUT/REFUND:** all three tests pass. Each registers the old hash under ctx1, advances to ctx2, dispatches the old error and asserts no phase for the corresponding action. Precisely, they use a callback-backed phase collector and `lastPhase(...).toBeUndefined()`, not a `setPhase` spy assertion. The independent component probes also confirm no current-state change.
3. **SC1-E-CURRENT:** verifies current hash, error phase and error message. SC1-E-RETRY preserves successful retry; SC1-E-UNKNOWN rejects an unregistered hash. All pass.
4. **SC1-E-STRUCT:** checks that Pool calls `lifecycle.dispatchError` and excludes the old inline setPhase pattern. Direct source inspection confirms all three wait-error effects call dispatchError. The module looks up `hashToCtx.get(txHash)`, rejects an unknown context, then rejects `epoch !== ctx.submissionId` before `callbacks.setPhase`.
5. **Earlier cases:** 31 independent receipt/action probes pass; all 32 Studio lifecycle tests pass. Independent lifecycle evidence is **21 lifecycle probes plus 6 error probes**, all passing, rather than a separate 32-probe suite. Counts are kept distinct below.

## Independent production-path regression evidence

| Reproduction command | Exit | Passed / failed |
| --- | --- | --- |
| `node docs/evidence/recheck-c3ae551/receipt-probes.cjs . receipt-results.json` | 0 | 31 / 0 |
| `node docs/evidence/recheck-c3ae551/lifecycle-probes.cjs . lifecycle-results.json` | 0 | 21 / 0 |
| `node docs/evidence/recheck-c3ae551/error-probes.cjs . error-results.json` | 0 | 6 / 0 |

Actual commands use the archived snapshot as the source root and ignored output paths; see [probe run records](evidence/recheck-c3ae551/probe-runs.json). Instruments are identical to the bb992a6 review except source-revision metadata. They execute unchanged production ActionPanel callbacks/effects plus shared lifecycle/receipt modules with controlled synthetic hooks and RPC responses; they do not reproduce lifecycle logic as a second implementation. They are review tools, not Studio-authored product tests.

The three stale-error negatives now remain idle with no stale error banner, no Retry button and zero RPCs. The three current-error/retry controls each reach confirmed and invoke onSuccess once. The four earlier SC1-D failures remain passing in the 21-case lifecycle instrument, along with teardown, repricing and retry controls.

## Report and source consistency

F02/F06/RC6 descriptions retain the prior accepted corrections. Contracts, package manifests, vercel.json and share.ts are unchanged by this Studio revision. No new functional discrepancy was reproduced within the requested CK1/SC1-E scope.

Small wording qualifications: the report labels the SC1-E group as three stale negatives, three current/retry positives and one structural test; actually the remaining three behavioral cases are CURRENT, RETRY and UNKNOWN (unknown-hash rejection, not a current-hash positive). The lifecycle file's older header still attributes 31 receipt/action cases to validateReceipt.test.ts, which has 28 tests; the report itself now distinguishes those counts correctly. These are documentation precision issues, not failed acceptance cases.

## Completion boundary and next step

This closes the reproduced CK1 and SC1-E findings and preserves previously accepted cases. No further source-fix prompt is needed for these specific findings on this evidence.

Not run: browser rendering, wallet connection, signed testnet transactions/AC12, multi-wallet use, live mempool replacement, WalletConnect mobile, deployment verification, mainnet proof. No deployment, transaction signing or hosting configuration changes were performed.

Next operational gate: follow [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md), verify the public build's contract-address configuration and source revision, then perform human-operated testnet contribution/payout/refund/Proof flows and record actual receipts. The last observed public configuration blocker is historical (October 26), not rechecked here. EIP-55 display, measured fees, cross-session evidence, Studio permalink/video and competition/mainnet requirements remain separately outstanding. Passing local checks does not establish public-demo or submission completion.
