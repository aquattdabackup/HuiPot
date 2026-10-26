# Independent RC1–RC6 recheck

Reviewed October 26, 2026 (Asia/Ho_Chi_Minh). Input and GitHub main HEAD: **7467d1b51fc89c18e68c49ad57d6394153aad029**. Pulled with `git -c credential.helper= pull --ff-only origin main` before validation. Read AGENTS.md, STUDIO_RECEIPT_RECHECK.md, STUDIO_FUNCTIONAL_FIX_REPORT.md, Pool.tsx and verifyTx.test.ts in full.

The requested suite passes. Functional acceptance remains partial: five independent behavioral probes fail. Application, contract and Studio test sources were not changed. This is a review, not an audit or confirmation of deployed behavior.

## Exact validation

Executed sequentially in an exact Git archive of the reviewed commit, with existing cached dependencies linked into the archive. Package manifest and lockfile match the dependency cache. Node 24.19.0, Bun 1.3.14, Forge 1.7.1, solc 0.8.28, Windows. Absolute executable paths were used; these are the exact command arguments. No suite retries were needed.

| Command | Exit | Pass / fail / skip | Evidence |
| --- | --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 / 0 / 0 | [Forge log](evidence/recheck-7467d1b/forge.log) |
| `bun run test` | 0 | 52 / 0 / 0, 2 files | [Vitest log](evidence/recheck-7467d1b/vitest.log) |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors | [Check log](evidence/recheck-7467d1b/check.log) |

Vitest reports 12.49 seconds locally, not Studio's 1.60 seconds; no R3 import timeout occurred. Count: 22 predicate + 17 parser + 7 R3 structural + 6 RC structural checks = 52. All raw-source imports use `?raw`; the shared-predicate test imports the production module normally. The six new RC checks assert source strings, not receipt/action behavior.

[Run timing](evidence/recheck-7467d1b/runs.json), [integrity/environment manifest](evidence/recheck-7467d1b/manifest.json), [independent probe results](evidence/recheck-7467d1b/probes.json).

## Requested source confirmations

| Item | Verified result |
| --- | --- |
| Per-action state | `receiptByAction`, `getPhase` and `isActionBusy(action)` replace the single receipt state. A confirmed contribution no longer disables payout. |
| Contributor binding | Contributed `topics[2]` is decoded and compared case-insensitively to `snap.accountAddress`; wrong contributor returns `replaced`. |
| Transport/RPC checks | `resp.ok` is checked before parsing; `json.error` is checked before using result. Both reject a receipt-shaped success body in the independent probes. |
| Live state | `confirmAction` checks live `currentChainId` and live `status` for contribute/payout/refund, not `statusAtReview`. It also checks contribution capacity and positive claimable refund. Valid controls write once; stale-state/chain/capacity controls write zero times. |
| Confirmed reference | `confirmedTxRef` is assigned only after confirmed validation; ReceiptBanner has the requested idle fallback. Both exist, but rendering still hides evidence in some states below. |
| Receipt outcomes | `confirmed`, `replaced`, `error` branches exist. Errors from all three wait hooks are surfaced; errors do not enter the notified set, and the error banner can retry validation. Replacement hash tracking is absent. |

## Remaining findings

### RC1 follow-up — confirmed partial contribution blocks another contribution

Pool.tsx:554–557 treats `confirmed` as busy. The ACTIVE submit button at line 606 calls `isActionBusy('contribute')`. After a partial contribution succeeds and remaining capacity stays positive, the button remains disabled. The old cross-action payout block is fixed, but normal repeated contributions are blocked until state is reset/remounted.

Independent result: `another contribution enabled after a confirmed partial contribution` fails. Keep confirmation history separate from an in-flight lock; allow a new valid contribution after confirmation without losing its prior evidence or accepting late results from an older submission.

### RC2 follow-up — PaidOut caller still unbound

Pool.tsx:122–137 validates pool, recipient and amount, but does not compare PaidOut `topics[2]` (caller) to the submitted wallet snapshot. A synthetic same-pool/same-amount/same-recipient log with another caller returns `confirmed`. The contribution and refund wrong-actor controls correctly return `replaced`.

The previous RC2 requested both contributor and payout caller binding; marking RC2 fully implemented is inaccurate. Anyone may legitimately call payout under the contract. This requirement binds this submitted transaction to its reviewed context; it must not turn the general Proof page into a connected-wallet-only verifier. This synthetic mismatch is not evidence of contract fund theft or a real forged on-chain receipt.

### RC3 follow-up — replacement handling remains missing; stated library limitation is false

All three hooks still validate the original write hash and discard the mined receipt data. There is no `onReplaced` handler. A missing original receipt returns `error`, not `replaced`; the report's claim that the current branch covers a dropped original is incorrect.

Installed **wagmi 2.19.5 / @wagmi/core 2.22.1** supports the callback: hook parameters include `WaitForTransactionReceiptOptions`, the hook forwards parameters, and the core query explicitly passes `onReplaced: options.onReplaced`. See [installed-source evidence](evidence/recheck-7467d1b/replacement-support.txt). [Official documentation](https://wagmi.sh/react/api/hooks/useWaitForTransactionReceipt#onreplaced) also documents replacement reasons and callback data; installed source is the evidence specific to this v2 dependency.

Use the supported replacement/mined-receipt information to validate and link the actual mined transaction. Distinguish repricing, cancellation and different-action replacement. Keep the original review context bound to the submitted hash, invalidate stale async results, and make retries use that hash's snapshot. Current retry code consults one mutable `pendingSnapRef`, and there is no context-generation cancellation after the asynchronous validator. These are source findings; no signed replacement scenario was performed.

### RC6 follow-up — confirmed evidence still disappears in three transitions

The actual ActionPanel rendering fails these independent cases:

1. Contribution reaches the goal: ACTIVE → FUNDED renders only the payout banner, hiding the confirmed contribution hash.
2. Refund succeeds while others still have claims: `myClaimable === 0n` renders generic text and hides the refund banner.
3. Final refund closes the pool: CLOSED renders generic text without the confirmed refund hash.

Positive controls pass: the contribution idle fallback while ACTIVE, and payout evidence after PAID. Render confirmed evidence outside action-availability branches, scoped to wallet/pool/chain. A component-local ref does not survive remount; do not claim otherwise. Refresh/cross-session history is not established by this review.

### Acceptance and report boundaries

- RC4 live-status checks and RC5 HTTP/JSON-RPC rejection are accepted within the tested scope. Revert/retry wiring is source-confirmed, not a browser lifecycle acceptance result.
- All six new RC tests are structural; they can pass alongside the failures above. Studio must add executable regressions against the real implementation, with valid controls. Do not satisfy these by adding comments or string assertions.
- EIP-55 checksum display is still absent. The fee copy no longer falsely claims estimation requires signing, but `typically <0.01 USDC` is unmeasured here; fee estimation/balance-plus-fee validation remains outstanding.
- Earlier Create context binding, broader read/RPC states and other open F01–F07 items are not automatically accepted by this narrowly scoped Pool review.

## Independent reproduction

The [review instrument](evidence/recheck-7467d1b/receipt-probes.cjs) transpiles and executes the unchanged production validator and ActionPanel with synthetic receipts, hook state and callbacks. It does not reimplement their verdicts. It is Codex review tooling, not Studio application code or the official Studio suite. It does not model the React effect scheduler, a browser or a wallet.

From repository root with the reviewed dependency installation available:

```text
node docs/evidence/recheck-7467d1b/receipt-probes.cjs . probe-results.json
```

Actual review invocation used `.review/recheck-7467d1b/snapshot` as the source root and an ignored review output path. Result: **26 pass / 5 fail / 0 skip**, exit **1**, 31 cases. The instrument is intentionally specific to the reviewed source boundaries; adapt its harness if Studio refactors, while preserving behavioral expectations.

Not run: browser rendering/navigation, AC12 human-operated testnet flows, multi-wallet/mobile flows, signed replacement/revert scenarios, Vercel deployment verification, mainnet or submission. `bun run build` was not rerun this turn; its pass remains Studio-reported. Prior topic/bytecode evidence is in STUDIO_RECEIPT_RECHECK.md; it was not refreshed here. No wallet transaction was signed, deployment made, or force push performed.

## Exact next Studio prompt

Read current main of https://github.com/aquattdabackup/HuiPot and record the actual input SHA. Read AGENTS.md, docs/STUDIO_RC_RECHECK.md, docs/STUDIO_RECEIPT_RECHECK.md and docs/STUDIO_FUNCTIONAL_FIX_REPORT.md in full, then the affected source and tests. Confirm content access by explaining the partial-contribution lock and the three disappearing-evidence cases. This review tested application revision 7467d1b51fc89c18e68c49ad57d6394153aad029; later review commits contain documentation/evidence only.

Implement the remaining RC1, RC2, RC3 and RC6 findings in STUDIO_RC_RECHECK.md. Preserve accepted contributor checks, per-action payout availability, live chain/status/capacity checks, HTTP/RPC rejection, shared Proof verdict and negative fixtures. Make the repeated-contribution button reusable, bind payout caller to the submitted context, track the actual mined/replacement hash using supported wagmi APIs, prevent stale/duplicate async confirmations, and retain per-action confirmation evidence across the listed state changes. Keep wallet/pool/chain contexts isolated. Do not change contract economics, public payout permissions or unrelated visual scope.

Add real production-path regression tests (not substring-only checks and not copied predicates): valid controls, repeated contribution, wrong payout caller, all evidence transitions, wait-hook revert/error, transient retry, repricing/cancellation/replacement, and stale context after async resolution. Reuse the review cases as acceptance examples, not as an application implementation. Correct the completion report, including the onReplaced claim and RC status. Run `forge test --summary --fuzz-seed 1`, `bun run test`, `bun run check`, and `bun run build`; report exact exits/counts and unrun browser/wallet checks. Commit and push through the supported GitHub integration, preserve concurrent changes, and return input/output SHAs. Do not deploy, sign wallet transactions, force push, or claim full acceptance from structural checks alone.
