# Independent recheck of 68fa8be

October 26, 2026 (Asia/Ho_Chi_Minh). Pulled main first with `git -c credential.helper= pull --ff-only origin main`. Local and GitHub HEAD both confirmed as **68fa8be1a5a121686afda3290abbeff711d14df6**. Read all seven requested files in full: AGENTS.md, STUDIO_RC_RECHECK.md, STUDIO_FUNCTIONAL_FIX_REPORT.md, validateReceipt.ts, validateReceipt.test.ts, Pool.tsx and verifyTx.test.ts.

**The five previously failing cases are repaired. All requested suites pass. RC3 replacement lifecycle is not yet fully fixed.** No application, contract or Studio test source was modified. Review instruments and this report are Codex-produced evidence, not Studio application code.

## Commands and results

Executed sequentially in an exact archive of the input commit, using the matching existing dependency cache. Node 24.19.0, Bun 1.3.14, Forge 1.7.1, solc 0.8.28 on Windows. Absolute executable paths were used with these command arguments. All requested suites passed on their first attempt.

| Command | Exit | Pass / fail / skip |
| --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 / 0 / 0 |
| `bun run test` | 0 | 80 / 0 / 0, three files, 8.63 seconds reported |
| `bun run check` | 0 | oxlint: 0 warnings, 0 errors; tsc: 0 errors |

No R3 import timeout. [Forge log](evidence/recheck-68fa8be/forge.log), [Vitest log](evidence/recheck-68fa8be/vitest.log), [check log](evidence/recheck-68fa8be/check.log), [run timing](evidence/recheck-68fa8be/runs.json), [integrity/environment manifest](evidence/recheck-68fa8be/manifest.json).

Correct test breakdown: **35 verifyTx + 17 parser + 28 validateReceipt = 80**. The new file contains **22 behavioral validator tests and 6 structural source checks**, not 28 behavioral tests all calling production. The repeated-contribution validator test does not itself exercise the button lifecycle. The Studio report's 52-test verifyTx and 11-new-test descriptions are incorrect.

## Requested confirmations

| Requested check | Result |
| --- | --- |
| Contribution lock | Pool.tsx:546 has the contribute-only branch returning `p.phase === 'checking'`. Confirmed partial contributions no longer lock the form. |
| Payout caller | validateReceipt.ts decodes `topics[2]` into `logCaller`, compares it to `snap.accountAddress`, and rejects a mismatch. Public contract payout permissions are unchanged. |
| Replacement hooks | Exactly three `onReplaced:` hook options: contribution, payout and refund, at Pool.tsx:192, 198, 204. Presence is confirmed; lifecycle correctness has the findings below. |
| Contribution banners | Three render sites: ACTIVE, FUNDED and CLOSED. |
| Refund banners | Three render sites: positive claimable, zero claimable and CLOSED. |
| Shared production module | Pool imports validateReceipt from the new module. The new behavioral tests call that production function; RC2/RC5 raw-source checks now target the shared module. |

## Legacy probe and adaptation

Ran the exact requested legacy command from the archived checkout:

```text
node docs/evidence/recheck-7467d1b/receipt-probes.cjs . probe-results.json
```

Exit **1**, **zero cases executed**: the harness searched Pool.tsx for topic declarations that moved into validateReceipt.ts. This was a harness incompatibility, not an application failure. [Original error](evidence/recheck-68fa8be/legacy-probe.log).

Adapted only the independent harness: load/transpile the unchanged shared module, supply it to the unchanged component import, and adjust synthetic ref slots for the added generation/ref hooks. All original 31 expectations were preserved. [Adapted harness](evidence/recheck-68fa8be/receipt-probes.cjs), [results](evidence/recheck-68fa8be/probes.json): **31 pass / 0 fail / 0 skip**, exit **0**.

All five old failures now pass: repeat partial contribution; wrong payout caller rejection; contribution evidence at FUNDED; refund evidence with zero claimable; refund evidence at CLOSED. Valid controls, live chain/status/capacity checks and HTTP/JSON-RPC rejection continue to pass.

Reproduce the adapted checks with dependencies installed in the source root:

```text
node docs/evidence/recheck-68fa8be/receipt-probes.cjs . probe-results.json
node docs/evidence/recheck-68fa8be/lifecycle-probes.cjs . lifecycle-results.json
```

Actual review used `.review/recheck-68fa8be/snapshot` as source root and ignored output paths. These review probes do not modify production source.

## Remaining RC3 findings

The [lifecycle harness](evidence/recheck-68fa8be/lifecycle-probes.cjs) executes unchanged ActionPanel callbacks/effects and the shared validator with controlled RPC completion order. It models hook state/ref/callback dependencies and explicitly flushes captured effects; it is not a full React renderer or browser. [Results](evidence/recheck-68fa8be/lifecycle-results.json): **8 pass / 6 fail / 0 skip**, exit **1**. There were no wallet transactions or real replacement events. The failures group into three findings below.

### RL1 — High: repriced transactions can remain stuck in checking

This fails for **all three actions** when the additional validation RPC is slower than the receipt hook's success update:

1. `onReplaced('repriced')` marks original hash A notified, increments the generation, and starts validating mined hash B (Pool.tsx:146–184).
2. The wait hook then reports success for its query keyed by A. Its success effect increments the generation again (lines 242–258).
3. `runReceiptValidation(A, ...)` exits immediately because A is already in the notified set (line 106).
4. Validation of B returns a valid receipt but is discarded by the generation comparison (line 110). No confirmation callback runs; phase remains `checking`, leaving the action disabled without a retry banner.

The installed viem implementation emits onReplaced before resolving its receipt promise: [source-order evidence](evidence/recheck-68fa8be/replacement-order.txt). A separate RPC launched from that callback can therefore finish after the success effect. The fast-RPC ordering passes for all three actions, confirming the failure depends on ordering rather than invalid receipt fixtures. Ordinary receipt confirmation controls also pass.

Acceptance: both completion orders confirm B exactly once, expose B as the evidence hash, and leave no permanent checking state. A duplicate completion for A must not invalidate the active B validation. Use one coherent per-submission lifecycle; do not fix this by removing stale-result protection globally.

### RL2 — Medium: cancellation/replacement evidence points to the wrong hash or has no link

For non-repriced replacements, callbacks store `txHash: originalHash` and only a truncated mined hash in prose. The replaced banner links to A rather than mined B. For cancellations, state stores no mined hash and the banner has no explorer link. Both evidence assertions fail, although the cancelled/replaced phases correctly appear and do not call onSuccess.

Acceptance: preserve full original and mined hashes for all reasons; link to the actual mined cancellation/replacement. Do not label a cancellation or different action as a successful intended action. Repricing may confirm only after validation of B against the bound snapshot.

### RL3 — Medium: unmount/context invalidation remains incomplete

The generation is advanced on submission, receipt success, repricing and retry, but there is no unmount cleanup invalidating an in-flight validation. Start validation, unmount the wallet/pool context, then resolve the RPC: the old component still calls onSuccess. The parent keys ActionPanel by address/pool and its stable success handler reads current refetch refs, so an old completion can trigger refresh work in a newer context. This is not evidence of a wrong wallet transaction being signed.

The control in which a new submission increments the generation correctly suppresses the old completion. Explicit context/unmount invalidation and per-submission snapshot/hash binding are still needed; a single mutable pendingSnapRef is not that binding.

Acceptance: old RPC completions and replacement callbacks after account/pool/chain context changes or unmount cannot notify or mutate a newer submission. Transient retry should continue to validate the correct submission; the existing same-context transient HTTP retry control passes.

## Report discrepancies and unrun checks

- RC1, RC2 and the three specified RC6 transition repairs are accepted within the 31-probe scope. Do not revert those fixes while repairing RC3.
- The new report's F06 `VITE_APP_URL` description is false: share.ts still uses the Studio-parent handshake or current origin plus BASE_URL. F02 also misdescribes the actual explicit asset/art/favicon/robots/manifest exclusions in vercel.json. Correct documentation to current code rather than changing these unrelated implementations.
- Blanket F01–F07 / RC3 “ACCEPTED” or “FULLY FIXED” claims exceed the evidence. The shared receipt module does not replace Proof's separate USDC-movement verification. Public payout permissions and contract economics must remain unchanged.
- EIP-55 display, measured fee handling, AC12 and cross-session evidence remain outstanding as reported. The `typically <0.01 USDC` statement was not independently measured. Earlier Create/read-state acceptance items are not closed by this Pool review.
- Not run: browser render/navigation, human-operated testnet flows, multi-wallet/mobile flows, actual replacement/revert transactions, Vercel deployed-build/config checks, mainnet or submission. `bun run build` was not rerun; its pass remains Studio-reported. No signatures, deployments or force pushes.

## Exact next Studio prompt

Read current main of https://github.com/aquattdabackup/HuiPot and record its actual input SHA. Read AGENTS.md, docs/STUDIO_REPLACEMENT_RECHECK.md and docs/STUDIO_FUNCTIONAL_FIX_REPORT.md in full, then Pool.tsx and the related receipt modules/tests. This review tested application commit 68fa8be1a5a121686afda3290abbeff711d14df6; later review commits contain documentation/evidence only. Confirm access by explaining the RL1 generation race and the correct test breakdown.

Fix RL1–RL3 with production-path lifecycle regressions. Preserve all 31 accepted receipt/action cases and the existing Proof negatives. Test slow and fast replacement RPC ordering for all three actions, duplicate completion, cancellation/replacement mined-hash links, wait-hook errors, transient retry, and stale resolution/callbacks after context changes or unmount. Bind each original/mined hash to its own immutable submission snapshot and prevent duplicate success. Do not satisfy this with source-string assertions, copied predicates or by disabling generation protection. Preserve contract economics/public payout permissions and avoid unrelated UI changes.

Correct the report's RC3 status, test composition, share-link behavior and rewrite description. Run `forge test --summary --fuzz-seed 1`, `bun run test`, `bun run check`, and `bun run build`; report exact exit codes/pass/fail/skip counts and unrun checks. Commit and push through the supported GitHub integration, preserve concurrent work, and return input/output SHAs. Do not deploy, sign transactions, force push or claim browser/testnet acceptance from unit tests. These instructions are prepared for Studio; they have not been executed by this review.
