# 9965d37 callback dispatch recheck

October 27, 2026, Asia/Ho_Chi_Minh. Pulled main first; GitHub and local input HEAD both **9965d379518c86fd2a1c7350aa47e19ff575ec9f**. Read AGENTS.md, STUDIO_SUBMISSION_CONTEXT_RECHECK.md, STUDIO_FUNCTIONAL_FIX_REPORT.md, actionLifecycle.ts, lifecycle.test.ts and Pool.tsx in full. No application, contract, dependency or Studio test source was modified.

**Conclusion: partial acceptance.** The shared production module and its stale-context guard are improvements. Post-unmount callback rejection now works through ActionPanel. SC1 after a newer same-action submission still fails at the component dispatch boundary: the stable wrapper routes an old event to the newest context-bound handler. Passing module tests do not close that integration gap.

## Independent validation

Exact Git archive of input HEAD; cached dependency installation reused only after package.json and bun.lock matched byte-for-byte. Commands resolved to existing local Bun/Forge executables. Full [logs, run records and source manifest](evidence/recheck-9965d37/) are included.

| Exact command | Exit | Observed result |
| --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 passed, 0 failed, 0 skipped |
| `bun run test` (first attempt) | 1 | Bun `CouldntReadCurrentDirectory`; no tests started |
| `bun run test` (unchanged-source retry with directory access) | 0 | 98 passed, 0 failed, 0 skipped, 4 files; Vitest duration 18.17s |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |

The initial sequential chain stopped at Bun's startup failure, so check was run after the successful retry. This is not a first-attempt all-green run. Forge also emitted compiler warnings and a nonfatal signature-cache write warning; its suites and process succeeded. No assertions were removed or relaxed.

Vitest breakdown: 35 verifyTx + 17 parser + 28 validateReceipt + 18 lifecycle = 98. No import timeout. The lifecycle file contains **14 behavioral production-module tests and 4 raw-source checks**, not 18 behavioral integration tests.

Not run this review: build, browser rendering, browser wallet/testnet transactions, AC12, live replacement, WalletConnect mobile, mainnet, hosting configuration changes or deployment verification. Historical public configuration observations remain historical, not a new live check.

## Requested confirmations

1. HEAD matches expected `9965d37`; full SHA above, independently checked through GitHub.
2. Requested commands and exact outcomes are recorded above, including startup failure/retry.
3. `src/lib/actionLifecycle.ts:75` exports `makeActionLifecycle` and Pool imports/calls it.
4. The first executable statement of the function returned by `makeOnReplaced` is `if (epoch !== submissionId) return` at line 148, before fetch/state changes.
5. SC1-POST-UNMOUNT explicitly asserts `expect(fetchSpy).not.toHaveBeenCalled()` and no onSuccess (lifecycle.test.ts:202-203). It passes. The component-path probe also starts zero RPCs after cleanup.
6. SC1-POST-NEWSUB asserts one onSuccess for HASH_C. It does not explicitly assert the fetch list. An additional direct-production-module probe confirms zero old-hash fetches and only HASH_C confirmation when the OLD context is actually passed. This does **not** describe Pool's mutable dispatch wrapper; see SC1-D below.
7. `function makeHarness` is absent. `makeTestLifecycle` delegates to production `makeActionLifecycle`, collecting callbacks only; fixture builders and fetch stubs do not reproduce lifecycle logic. Four tests inspect raw source instead of executing lifecycle behavior.
8. `git diff 08f8bb1 9965d37 -- vercel.json src/lib/share.ts` is empty. Both files are unchanged. The report was edited, but its F02/F06 descriptions are still incorrect.
9. Remaining discrepancies and unexecuted acceptance work are below.

## SC1-D — Old event dispatched to the newest handler

Relevant source: Pool.tsx:111-124 (mutable handler refs and stable wrappers), 279-287 (new context and handler assignment), 184-197 (success effects), 469-476 (retry).

Reproduction executes the unchanged production ActionPanel callbacks plus unchanged actionLifecycle and validateReceipt, with synthetic hooks and controlled RPC responses:

1. Confirm submission A using the actual review-button handler; retain the onReplaced wrapper passed to the wait hook.
2. Begin a newer submission C for the same action/account/pool/amount using the actual confirm handler.
3. Deliver A's repricing event (A -> B) to the retained wrapper.
4. The wrapper reads `onContribReplacedRef.current` (or payout/refund equivalent), which now points to C's handler. That handler has the CURRENT epoch, so the module's stale guard passes.
5. B is fetched and confirmed under C's context: **one RPC and one onSuccess**, expected zero of each for the obsolete event. This reproduces for contribute, payout and refund.

The success effect has the related binding problem: it passes `currentCtxRef.current` alongside a hash from the hook. A deliberately late old-hash success signal after a newer submission also confirms under the current context in the synthetic probe. Retry likewise reads current context instead of a context associated with its displayed hash; this is a source finding, not an additional separately executed failure count.

This is a frontend receipt-attribution defect, not evidence of an on-chain fund-loss exploit. The probes isolate callback ordering; they are not a mounted React/wagmi browser test or a signed mempool replacement demonstration. The three same-action probes deliberately exercise the late-delivery boundary requested by SC1; they do not claim that every wallet routinely produces that ordering.

Required repair: bind each write result, receipt observer, replacement event, retry and error result to its originating immutable submission and transaction hash. A stable wrapper must resolve by verified original/replacement hash identity or retain the originating bound handler; it must not choose the latest handler solely by action. Reject obsolete events before fetch/state mutation. Do not pass a hash from one submission with another submission's context. Preserve accepted retry, repricing, account/pool teardown and repeated-partial-contribution behavior.

## Probe results and scope

| Instrument | Exit | Passed / failed |
| --- | --- | --- |
| `node docs/evidence/recheck-9965d37/receipt-probes.cjs . receipt-results.json` | 0 | 31 / 0 |
| `node docs/evidence/recheck-9965d37/lifecycle-probes.cjs . lifecycle-results.json` | 1 | 17 / 4 |

Actual execution passed the archived snapshot path instead of `.` and wrote results in the ignored review directory. The lifecycle instrument contains 19 component-path cases plus two direct-production-module controls. The four failures are three action-specific stale wrapper cases and one late success-effect case. These are related manifestations, not four independent vulnerabilities. All 14 previously accepted lifecycle cases still pass; post-unmount late callback now passes; both direct-module controls pass.

Adaptations from the f00c80d instruments: load the new production lifecycle import, simulate useMemo, initialize refs through real component initialization, invoke confirmAction to establish submissions, and adjust write counts for that initialization. No lifecycle implementation was copied into the probes. No live RPC calls, wallet signing, or application-source edits were made.

## Report corrections still needed

- **F02:** actual vercel.json has explicit exclusions for assets, art, favicon.ico, robots.txt and manifest.json. The report's claim that the file has no explicit exclusions is false. This is a source-description correction, not a request to alter routing.
- **F06:** actual share.ts contains no VITE_APP_URL reference. It uses current origin + BASE_URL outside an iframe; inside an iframe it uses the origin-checked Studio handshake with that fallback. The report's assertion that the current source supports VITE_APP_URL is false. Preserve source unless a separately justified change is requested.
- **Coverage:** 18 lifecycle tests include four raw-source checks; the scope group tests wrong account, pool and amount, not a chain-switch lifecycle scenario. Do not claim full component or chain-change coverage.
- **RL1-SLOW fixture:** its A fetch resolves immediately and the test waits 5ms before invoking repricing; the comment claiming A is still in flight is not guaranteed by a controlled deferred A promise. Keep a genuine controlled-order regression (the independent component probe already controls the pending RPC explicitly).
- **RC6:** FUNDED/zero-claimable/CLOSED do not render every action's banner at every state. Describe the actual contribution/refund branches and PAID payout evidence without the blanket "all three actions" claim.

## Open acceptance work

SC1-D integration repair and regression coverage remain required. Existing outstanding work is unchanged: EIP-55 display, measured fee (the UI still says typically <0.01 USDC without measurement), AC12 and multi-wallet flows, live replacement, cross-session evidence, WalletConnect mobile, Vercel build-time VITE_HUIPOT_ADDRESS configuration and public revision verification. The last browser observation in the prior report showed a missing deployment configuration; it was not rechecked today. No mainnet proof or competition completion is claimed.

## Exact Studio follow-up

Read current main of https://github.com/aquattdabackup/HuiPot and record its full SHA. Read AGENTS.md and docs/STUDIO_CALLBACK_DISPATCH_RECHECK.md in full, then Pool.tsx, actionLifecycle.ts, lifecycle.test.ts and the linked probes. Reviewed input application: 9965d379518c86fd2a1c7350aa47e19ff575ec9f. Confirm access by explaining why a correct stale-context guard is bypassed when Pool's stable wrapper selects the newest handler.

Fix SC1-D at the real component dispatch boundary. Bind replacement/success/error/retry events and write results to their originating submission plus original/mined hashes; reject obsolete callbacks before RPC/state changes. Add production component/adapter tests for the actual hook wrapper, with old callbacks after a newer same-action submission for all three actions, late success/error, account/pool teardown, and valid current controls. Preserve the 31 receipt/action and 17 accepted lifecycle probe cases. Do not weaken expectations or replace the component coverage with only direct module calls. Correct F02/F06/coverage/RC6 report descriptions to match source. Do not change contract economics, routing or sharing behavior just to match the report. Run Forge seed 1, Vitest, check and build; return exact commands, exits/counts, input/output commits and remaining limits. Commit/push through GitHub without force. Do not deploy, change hosting configuration, request new tokens or sign transactions. This handoff is prepared, not executed.
