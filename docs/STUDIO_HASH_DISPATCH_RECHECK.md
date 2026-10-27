# bb992a6 hash dispatch validation

October 27, 2026, Asia/Ho_Chi_Minh. Pulled main before review and independently checked GitHub HEAD.

- Earlier reviewed application: `9965d379518c86fd2a1c7350aa47e19ff575ec9f`.
- Studio input including the previous review: `139ed88a75a06a748bb585cacab71bcae2220435`.
- Studio output / application reviewed here: **`bb992a6dfe15b1838d7570067f4ce055fcbadd35`**.
- Read AGENTS.md, STUDIO_FUNCTIONAL_FIX_REPORT.md, STUDIO_CALLBACK_DISPATCH_RECHECK.md, actionLifecycle.ts, Pool.tsx and lifecycle.test.ts in full.
- Codex output is this review, evidence and project memory only. Application, contract, dependency and Studio test source are unchanged.

**SC1-D's four previously failing replacement/success cases now pass through the actual Pool callbacks/effects.** All previously accepted independent cases remain passing. Two items prevent an all-green acceptance: the required check command fails on an unused test parameter, and the wait-error effects still allow stale errors to replace the current action's displayed state. Neither finding is evidence of an on-chain fund-loss exploit.

## Commands and evidence

Tests ran against an exact Git archive, with existing dependencies reused after package.json and bun.lock matched byte-for-byte. Windows; existing local Bun/Forge executables. Build artifacts remained in the ignored snapshot. [Evidence directory](evidence/recheck-bb992a6/), [run exit codes/timing](evidence/recheck-bb992a6/runs.json), [source integrity manifest](evidence/recheck-bb992a6/manifest.json).

| Exact command | Exit | Result |
| --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 passed, 0 failed, 0 skipped |
| `bun run test` | 0 | 105 passed, 0 failed, 0 skipped; four files; Vitest duration 15.97s |
| `bun run check` | **1** | oxlint 1 warning, 0 errors; `--deny-warnings` makes lint fail; chained typecheck did not run |
| `bun run build` | 0 | TypeScript build and Vite bundle succeed; warnings include chunks over 500 kB |
| `bun run typecheck` (additional isolated check) | 0 | tsc 0 errors |

No application/test source changes or assertion suppression were used. Commands were run once each. After check failed, build and standalone typecheck were run separately to complete requested validation. Shell setup errors before the suite were not test failures; they did not execute or change source.

Vitest breakdown: 35 verifyTx + 17 parser + 28 validateReceipt + 25 lifecycle = 105. Lifecycle: **21 behavioral production-module/dispatch-API tests + 4 raw-source checks**. No import timeout. Studio's helper-check success is not equivalent to this repository's failing `bun run check`.

## Requested source/behavior confirmations

### 1. Dispatch uses the original transaction hash

Pool.tsx:111-115 passes stable wrappers calling `lifecycle.dispatchOnReplaced(r)`. The former per-action replacement-handler refs are gone. actionLifecycle.ts:213-219 reads `r.replacedTransaction.hash`, looks up `hashToCtx`, then invokes the bound handler; the epoch guard rejects old contexts before RPC/state updates. Pool's success effects use `dispatchSuccess(hash)` and the Retry button uses `dispatchRetry(phase.txHash)`.

Pool registers write hashes in effects at lines 173-189. These effects run before its success effects in the source. The tests below establish the original hash under its original submission before advancing to the next submission; this review does not prove every browser scheduling or delayed write-result ordering.

### 2. SC1-D tests reproduce the old registered-hash scenario

SC1-D-CONTRIB/PAYOUT/REFUND each register HASH_A under ctx1, advance to ctx2 and register HASH_C, then deliver A -> B through `dispatchOnReplaced`. All assert zero fetches and zero successes, and pass. They call the production dispatch API directly, not a mounted Pool component.

The independent instrument additionally executes the unchanged production ActionPanel, its actual callback passed to the wait hook, its effects, actionLifecycle and validateReceipt with synthetic hooks/RPC. All three old wrapper cases and the old-success-effect case now pass. The former four failures are accepted as repaired for those tested orderings.

### 3. Previously accepted cases remain passing

| Exact reproduction command | Exit | Passed / failed |
| --- | --- | --- |
| `node docs/evidence/recheck-bb992a6/receipt-probes.cjs . receipt-results.json` | 0 | 31 / 0 |
| `node docs/evidence/recheck-bb992a6/lifecycle-probes.cjs . lifecycle-results.json` | 0 | 21 / 0 |
| `node docs/evidence/recheck-bb992a6/error-probes.cjs . error-results.json` | 1 | 3 / 3; additional late-error scope below |

Actual runs used the archived snapshot as source and ignored output paths. The receipt instrument is unchanged except revision metadata. The lifecycle instrument additionally delivers the initial write hash after confirmAction and flushes effects, so the new production registerHash effect can run; expectations were not weakened. It covers the 17 previously accepted cases plus all four repaired cases. The extra error instrument is separate so its new findings are not presented as regressions in previously passing cases.

These are Codex review instruments, not Studio-authored product tests or live browser/mempool evidence. Synthetic hooks emulate controlled callback/effect order without implementing the production lifecycle logic a second time.

### 4. Report corrections

- **F02 accepted:** the report now acknowledges the explicit static-path exclusions in vercel.json. The actual implementation is one negative-lookahead rewrite, not separate rewrite entries. No routing-source change was made.
- **F06 accepted:** the report now says there is no VITE_APP_URL support. Actual source uses current-origin + BASE_URL and the origin/source-checked Studio iframe handshake/fallback. No sharing-source change was made.
- **RC6 accepted:** the report now lists the actual ACTIVE/FUNDED contribution, FUNDED/PAID payout and REFUNDING/CLOSED refund/contribution branches instead of claiming every banner appears in every state.
- **Coverage partially clarified:** report counts and structural-test split match source, and it discloses no mounted React/wagmi, chain-switch or live replacement test. Its phrase "component-path dispatch" describes calls to the same API Pool uses; the Studio tests themselves do not execute Pool's wrapper, registration effects or wait-error effects. The independent probes provide synthetic component callback coverage. The lifecycle file header also incorrectly attributes 31 receipt/action cases to validateReceipt.test.ts; that file has 28 tests (22 behavioral + 6 structural); 31 refers to the separate Codex instrument.

`git diff 9965d37 bb992a6 -- vercel.json src/lib/share.ts contracts` is empty. Existing contract economics are unchanged.

## Remaining findings

### CK1 — Required check command fails

`src/lib/__tests__/lifecycle.test.ts:297` declares an unused `opts` parameter in the SC1-D-RETRY fetch stub. oxlint emits one warning; `bun run lint` uses `--deny-warnings`, so `bun run check` exits 1 before its typecheck stage. Remove the unused parameter through Studio and rerun the exact repository command. Do not relax lint policy to match the helper report.

### SC1-E — Stale wait-hook errors still update the current action (medium)

Pool.tsx:140-169 handles each wait-hook error by checking only that `currentCtxRef.current.snap.action` matches the action and then calling `setPhase` directly. It does not check the hash's registered submission/epoch.

Controlled reproduction for each action:

1. Confirm submission A and let the actual registration effect bind its hash.
2. Begin a new same-action submission C; its hash is not available yet.
3. Deliver a late wait-hook error with A's hash. The hash is unchanged, so the registration effect does not rerun; A still correctly maps to the obsolete context.
4. The error effect bypasses hash dispatch and changes the current action's phase from idle to error, displaying A's link.
5. Retry is visible but correctly rejects A's stale context, starting zero RPCs. The user sees an irrelevant error with an ineffective Retry button.

All three stale-error negatives fail; all three current-error/retry positive controls pass. These are synthetic late-hook signals, not evidence that a particular live wallet delivers this ordering. Impact is stale/misleading UI and retry behavior; the repaired replacement/success paths do not falsely confirm in these cases.

Route wait errors through a hash-and-epoch-aware production method (or equivalent guard) before changing state. Retain current-hash error display and retry. Add regression coverage that actually exercises the Pool error effects or a shared production adapter wired to them. Avoid claiming every asynchronous event is now submission-bound while these effects bypass that check.

## Not run / completion limits

No browser rendering or wallet connection this review; no signed testnet transaction, AC12, live replacement, WalletConnect mobile, mainnet proof, deployment or hosting configuration change. EIP-55 display, measured fee, cross-session evidence and Vercel build-time address/public-revision verification remain outstanding. The previously observed missing address on the public build was not rechecked here. Test passes and a local build do not establish live-demo or submission readiness.

## Exact Studio follow-up

Read latest main of https://github.com/aquattdabackup/HuiPot and record its full SHA. Read AGENTS.md and docs/STUDIO_HASH_DISPATCH_RECHECK.md in full. Reviewed source is bb992a6dfe15b1838d7570067f4ce055fcbadd35. Confirm access by stating that the previous four SC1-D cases now pass, and identify the exact unused parameter and the error effects that still bypass hash/epoch dispatch.

Fix CK1 and SC1-E only: remove the unused test parameter without weakening lint, bind wait-error updates to the originating registered hash and current epoch before state changes, and test stale errors for all three actions plus valid current error/retry controls through the real production adapter/component path. Preserve all 31 receipt/action and 21 lifecycle probe passes. Correct coverage wording/header and validation claims to match actual runs. Run forge test --summary --fuzz-seed 1, bun run test, bun run check and bun run build; return exact exits/counts and full input/output SHAs. Push through GitHub without force. Do not change money rules, deploy, sign transactions, change hosting settings or request setup/tokens. This prompt is prepared, not executed.
