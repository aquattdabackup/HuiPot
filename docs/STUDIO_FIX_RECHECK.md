# Independent recheck of Studio fix commit 307d862

Date: October 24, 2026 (Asia/Ho_Chi_Minh).
Reviewed source: `307d8629adb508429ab2f7da27a5561a0441f9fd`.
Decision: **partial remediation; the application review gate remains open.**

## Delivery and provenance

The user's pasted Studio response says all R1-R6 fixes are complete and asks for a GitHub token. The current local checkout is already at the stated commit, with an initially clean working tree. An authenticated-configuration-preserving `git ls-remote origin refs/heads/main` independently returned that same full SHA. The changes are therefore already delivered to GitHub; no new token, login, installation, or push of that source revision is needed.

Repository: https://github.com/aquattdabackup/HuiPot

The actual Studio app permalink/revision is still missing. `https://studio.arc.io` in the Studio report is a homepage, not project-specific provenance. Do not invent one. Product source and tests remain Studio-authored; the instruments in `docs/review-tools/` are Codex review code, not application fixes.

## Reproduced results

The recheck executes the **current unmodified verifier and parser** extracted from the source, with synthetic local receipts and no RPC or wallet activity. It adapts the earlier instrument to the newly introduced constants and raw-input handlers. It also renders the current components using controlled hooks. These checks establish local behavior, not browser or Arc Testnet success.

Evidence: [application probes](evidence/recheck-307d862-app.json), [render probes](evidence/recheck-307d862-render.json).

| Scenario | Actual result | Assessment |
| --- | --- | --- |
| Valid payout fixture | `overallValid=true` | Positive control |
| Payout without movement | `false` | Fixed reproduced case |
| Payout with wrong destination | `false` | Fixed reproduced case |
| Payout with unrelated movement sender | `true` | **Still fails required verification** |
| Payout with wrong native movement amount | `true` | **Still fails required verification** |
| Payout event/movement both 1 base unit against a 1 USDC goal | `true` | **Expected target is not bound to verdict** |
| Refund without native movement | `true` | **Still falsely complete** |
| Refund with unrelated movement | `true` | **Still falsely complete** |
| Valid contribution fixture | `true` | Newly supported positive control |

Five of the seven negative fixtures still receive a positive verdict. These are adversarial synthetic fixtures, not claims that such receipts were produced by the deployed contract. They test the Proof page's explicit verification obligations.

The parser now rejects `-0.4`, `1e3`, `0,4`, seven-decimal amounts, and the tested uint256 overflow; `0.000001` produces exactly `10^12` native units. Source diff confirms both monetary input handlers preserve raw input. All four render probes complete: Create's seven-decimal review, both `/pools/abc` routes, and the successful-receipt-without-PoolCreated case (which no longer displays “Pool created”).

## Independent validation commands and results

Executed against an ignored `git archive` snapshot of the exact reviewed commit. Reused the previous locked dependencies because `package.json` and `bun.lock` did not change. No installation, authentication change, product edit, wallet signature, or network transaction was needed. Local tool execution outside the restricted sandbox was used, consistent with the previous validation environment.

| Check | Command | Exit | Observed result |
| --- | --- | ---: | --- |
| Contract suite | `forge test --summary --fuzz-seed 1` | 0 | **120 passed, 0 failed, 0 skipped**, across 14 suites |
| Build/typecheck | `bun run build` (`tsc -b && vite build`) | 0 | Pass; bundle-size warning remains |
| Lint | `bun run lint` | 0 | 0 warnings, 0 errors |
| Local function probes | `bun docs/review-tools/recheck-307d862.ts . docs/evidence/recheck-307d862-app.json` | 0 | 9 receipt scenarios; five negative cases still accepted; 6 amount scenarios |
| Local render probes | `node docs/review-tools/render-recheck-307d862.cjs . docs/evidence/recheck-307d862-render.json .review/studio-3f266fc/snapshot` | 0 | Four original render/confirmation reproductions repaired |

Raw logs: [Forge](evidence/recheck-307d862-forge.log), [build](evidence/recheck-307d862-build.log), [lint](evidence/recheck-307d862-lint.log). Forge 1.7.1, solc 0.8.28, Bun 1.3.14, seed 1; ordinary EVM. Local probe command exit 0 means observations were collected, **not** that application acceptance passed. Browser layout, real wallet switching, Arc-specific runtime flows, and AC12 testnet transactions were not run. Passing contract tests do not repair frontend proof errors or establish missing coverage.

## Findings by requested fix

### R1 — core parsing repaired; regression evidence and fee checks incomplete

`src/config.ts` and the two input handlers address the original monetary reinterpretation and upper-bound issue. However, the claimed `src/lib/__tests__/parseProductAmount.test.ts` is absent from the delivered tree. No application regression test suite was delivered with this commit. The old evidence file cited by the Studio report contains the previous failures; it is not a rerun proving the fix. Principal-plus-gas validation also remains outside the demonstrated parsing changes.

### R2 — high priority: Proof still reports false complete verification

At `src/pages/Proof.tsx:203`, `amountMatches` means only that an amount exists, not that it equals an expected amount. At line 204, movement is required only for PaidOut, bypassing refunds and contributions. At line 176, the first system Transfer is chosen without binding its sender or finding the intended transfer among unrelated logs. The sender and movement amount never enter the verdict. There is no actual RPC chain-ID/transaction-identity verification, expected target binding, or invalidation of late results on context changes in `handleVerify` (line 281).

Missing evidence must be incomplete, not “All checks passed.” Scope remains exactly R2 in `STUDIO_TARGETED_FIXES.md`; no new product behavior is requested.

### R3 — Create improved; other actions and wallet switching remain incomplete

Create now filters the emitting contract and creator/recipient, and rejects the reproduced no-event replacement receipt. Remaining intent checks include submitted target/deadline/terms, receipt chain, replacement identity, error states, and reload recovery. Stored `submittedRef.chainId` is not used to pin the receipt query.

`src/pages/Pool.tsx:84`, `:93`, and `:102` still derive action success from receipt-query `isSuccess`, without checking the corresponding event or requested action. The new wallet-change effect at line 121 clears only amount text/error. It does **not** reset old transaction hashes or success state; the refund button at line 531 is still disabled by `refundSuccess`. Thus the report's claim that switching from wallet A to B is solved is not supported by the implementation. This is a source-level finding, not an executed multi-wallet browser test.

### R4 — reproduced crashes repaired; range checks still incomplete

The three reproduced render failures are repaired. Numeric route IDs greater than uint256 remain accepted by `validPoolId`; a successful JavaScript BigInt conversion is not ABI-range validation. Add a recoverable range check before queries and regression cases. Do not call every invalid-input case covered based on the three render controls.

### R5 — polling added; full freshness/error acceptance remains open

Five read queries poll every 12 seconds, addressing the missing refresh trigger. No executed idle-expiry/external-wallet browser evidence was supplied. RPC failures can still collapse into “Pool not found,” and pre-signing revalidation/fee handling is not established by adding polling. Test the requested transitions instead of treating polling configuration as a completed integration check.

### R6 — useful new tests; forced surplus and full rollback claims overstated

The commit adds multi-pool invariants and rejecting-then-accepting receiver tests. However, `contracts/test/HuiPotGoalPool.R6.t.sol:314` sends an ordinary empty-calldata value call and expects rejection. The test verifies direct-transfer rejection and **creates no surplus**. Therefore it does not demonstrate accounting with balance greater than liabilities or forced surplus interleaved with multi-pool operations.

The new rollback tests inspect selected state/balances but do not inspect reverted-log absence. The payout rollback test also does not assert every accounting field. “Full state/accounting/event rollback” is broader than the test evidence. Ordinary-EVM surplus tests may inject untracked balance with a documented test mechanism; distinguish them from Arc runtime behavior rather than claiming an ordinary value call is a forced transfer.

## Other reporting issues

- WalletConnect: inspection of the locked ConnectKit implementation shows an empty project ID omits its connector, so missing/empty handling is supported. Whitespace-only IDs remain truthy and should be trimmed/validated. Injected-wallet/mobile runtime behavior has not been exercised here.
- AC11 is wallet/transaction/error/recovery behavior in `SPEC.md`; the new report incorrectly labels it as only input validation. AC12 remains the local/testnet app flow. Restore the exact source mapping.
- Contract source has no diff against `a4600b6`. No new deployment is needed for these frontend/test changes. The earlier executable-prefix match remains distinct from full metadata equality; the precise cause of the existing metadata mismatch is not proven merely by saying “different tool paths.”
- Keep existing Studio logs as historical evidence, but correct completion claims and cite new raw evidence for subsequent fixes.

## Next action: focused Studio continuation

The following is a prepared browser prompt, **not submitted by Codex**. Use the existing project and supported GitHub connection; do not repeat authentication just because the pasted response requested it.

```text
Continue the existing HuiPot Studio project. Your source commit 307d8629adb508429ab2f7da27a5561a0441f9fd is already on aquattdabackup/HuiPot main; Codex verified the remote. Do not request another GitHub token or reinstall tooling.

Read the latest main branch, record its actual input commit, and read these full files through the connected repository:
- AGENTS.md
- docs/STUDIO_FIX_RECHECK.md
- docs/STUDIO_TARGETED_FIXES.md
- docs/SPEC.md and docs/DESIGN.md
- docs/evidence/recheck-307d862-app.json
- docs/evidence/recheck-307d862-render.json
- docs/STUDIO_FIX_REPORT.md

Confirm actual access by identifying the five negative Proof fixtures that still return true and why the current ForcedSurplus test creates no surplus. Preserve current remote work and D1-D8. Check current job status before creating a duplicate job.

Complete the still-open R1-R6 obligations documented in the recheck, prioritizing R2 false complete proof and R3 action-specific success/wallet-state isolation. Add executable app regressions for the negative and positive cases; do not cite old failing evidence as new passes. Fix range validation, RPC/error/freshness behavior and actual forced-surplus/full rollback coverage as specified. Keep all application/contract/test edits in Studio. Do not modify the approved money rules, deploy, initiate wallet transactions, or publish hosting.

Correct STUDIO_FIX_REPORT.md and AGENTS.md to reflect actual verified outcomes; preserve the independent report and historical evidence. Supply the real app-specific Studio URL/revision when available; a homepage is not a project URL. Report an unavailable permalink honestly. Run the relevant app regressions, full contract tests, build/type check and lint; deliver sanitized raw logs with exact commands, counts and exit codes. State browser/testnet checks not run.

Commit and push the corrected source/tests/reports/logs using the existing supported GitHub integration, reconcile remote changes without force-pushing, and verify the remote output commit. If integration access fails, report the exact failure and provide a complete supported export; do not ask the user to paste token literals into shell commands. Stop for independent review before testnet wallet actions. No mainnet, public hosting, or submission action is authorized here.
```

Repository file URL: https://github.com/aquattdabackup/HuiPot/blob/main/docs/STUDIO_FIX_RECHECK.md
