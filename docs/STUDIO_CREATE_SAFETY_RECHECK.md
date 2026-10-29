# Independent CS1 / CS2 / wallet metadata recheck

Date: October 29, 2026 (Asia/Ho_Chi_Minh).

- Input: `e727ddf49503668b2d3ab812f2a6b95f9837c078`.
- Studio source output: `2e777fbabfa49db41e58af8fbd4d945e11d8a9e5`.
- Reviewed main / AGENTS output: `f7297fd1bc8655da80a2cc47b336b61ddb8080cd`.
- Pulled main successfully before review. Only the four reported files changed. Reviewed both handoffs, full Create.tsx and full createSafety.test.ts. Application/contract/Studio test source was not edited during this review.

**Decision: CS1 and appUrl correction accepted at source/synthetic-component scope. CS2 is partially fixed, not fully accepted. Independent check/build fail, despite Studio's reported success. MetaMask classification remains unresolved.**

## Findings requiring follow-up

### CSF1 — Missing context still relaxes receipt validation (P2)

`src/pages/Create.tsx:201–215`: creator comparison runs only if submittedAccount is truthy; recipient falls back to the live form; all target/deadline/title/purpose comparisons are skipped when snap is null. This directly violates the handoff's requirement that missing context must not relax validation.

Independent production-component execution confirms that a receipt from the expected contract with a matching live-form recipient, a **different creator and different target/title**, renders “Pool created” when the snapshot is missing. An empty snapshot account also allows a foreign creator. These are controlled missing-context fixtures, not evidence of a reproduced live wallet exploit. Require complete valid context before any success verdict; do not fall back to live inputs or accept an empty submitting account.

### CSF2 — Explorer links still point to the original hash (P2)

`src/pages/Create.tsx:249` and `:291` use `explorerTxUrl(hash!)` from useWriteContract. If the original hash A is replaced and the receipt is for hash B, both the success and cancellation/unmatched-result links still point to A. Independent fixtures reproduce this for both branches. Use the actual mined receipt hash for receipt evidence and add production-path assertions.

### CSF3 — Captured chain is not used to scope receipt watching (P2)

`src/pages/Create.tsx:37` calls `useWaitForTransactionReceipt({ hash })`; snapshot.chainId is captured but not used. Installed wagmi's `src/hooks/useWaitForTransactionReceipt.ts:61–65` defaults to the current config chain when chainId is omitted. A wallet/config network switch after submission can move receipt lookup away from Arc and prevent the valid Arc receipt from being found. The production-component probe confirms no explicit chainId is supplied after switching; actual live-wallet behavior remains untested. Pin receipt watching to the submitted/expected Arc chain, while retaining the original submitting account for event validation.

### CSF4 — New tests do not meet production-path coverage, and break typecheck/build (P2)

The 19 new cases are **12 source-string/ordering assertions + 7 ABI fixture construction/decoding checks**. None invokes Create's validator or receipt acceptance path. Comparing decoded `2 USDC` with a constant `1 USDC` demonstrates fixture values, not production rejection. Missing snapshot, empty account, mutable form, account switch, cancellation and replacement-link behavior are not exercised in this file, despite the opening comment's coverage implications.

Six `require('viem')` usages at lines 167, 180, 189, 197, 205 and 221 cause TS2580 in this environment. The reused dependencies are unchanged from the prior accepted build; @types/node is absent and not directly declared. Studio may have extra ambient types, but its check/build claim is not independently reproduced. Prefer the existing ESM import mechanism for decodeEventLog and execute the production validator/component path in the regression suite. Do not copy its predicate into a separate test implementation.

## What passed

- CS1 order: blank → malformed shape → zero address → self-contract. Zero recipient error is exactly `Recipient cannot be the zero address.` and validation returns before wallet write. Production probes confirm zero/self/malformed rejection and a valid write.
- Full snapshot captures account, chainId, contractAddress, recipient, targetNative, deadlineUnix and trimmed title/purpose before writeContract.
- With a complete snapshot, expected emitter/creator/recipient and target/deadline/title/purpose comparisons work. Different-target rejection is independently verified using a snapshot created by the real submit handler, with a matching positive receipt control.
- Original terms continue to validate after live form edits or a live account change; validation uses the captured submitting account. Cancellation with no event does not claim pool creation.
- appUrl is exactly `https://hui-pot.vercel.app`; chain, RPC, contract ABI, write args and native value behavior were not changed by the metadata fix. Installed injected MetaMask connector does not receive this field; this correction is not classification clearance.

## Exact validation results

Tests ran in `.review/recheck-f7297fd/snapshot`, exported from the reviewed commit, using existing installed dependencies via a junction. 44 tracked source/config files match the checkout after newline normalization. The initial redundant attempt to junction `lib` failed because the archive already contained that directory; its existing contract test dependencies worked without alteration.

| Command | Exit | Result |
| --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 passed, 0 failed, 0 skipped |
| `bun run test` | 0 | 184 passed, 0 failed, 0 skipped; 6 files |
| `bun run check` | 2 | oxlint 0 errors / 0 warnings; TypeScript 6 TS2580 errors |
| `bun run build` | 1 | Same 6 TypeScript errors; Vite build not reached |
| `node docs/evidence/metamask-alert/deep/create-path-probes.cjs` | 0 | Historical probe: 8 passed, 0 failed |
| `node .review/recheck-f7297fd/production-create-probes.cjs .review/recheck-f7297fd/snapshot .review/recheck-f7297fd/production-results.json` | 0 | 23 acceptance probes: 18 passed, 5 failed |
| `node .review/recheck-f7297fd/original-positive-control.cjs` | 0 | Historical harness with matching-receipt control: 7 passed, 1 failed |

Probe processes write reports and return 0 even when assertions fail; inspect their pass/fail fields. Forge/check/test ran sequentially; build was invoked separately after the runner stopped on check failure. No failed check was relabelled as a pass.

### Why historical 8/8 is insufficient

The original instrument fabricates only `{account, chainId}` in useRef for its receipt case and never submits first in that case. After this fix `snap.targetNative` is undefined, so any nonempty target is rejected. Thus the old different-target test passes even though its context is incomplete; replacing its log with a matching 1-USDC log still fails the positive control. The zero-recipient improvement is valid. The different-target repair is separately accepted based on the new persistent-ref production probes, not this vacuous historical negative.

The new independent instrument executes unchanged production Create, keeps its ref across submit and receipt renders, uses real viem-encoded logs, and checks actual rendered success and links. It contains no copied acceptance predicate. Its five failing cases are missing snapshot, empty account, replacement success link, cancellation link and chain-scoped watcher. It is still synthetic hook coverage, not mounted DOM/wallet coverage.

Evidence: `docs/evidence/recheck-f7297fd/` contains command logs, runs.json, manifest, original and expanded results, and the reproducible expanded probe. The expanded probe accepts source-root and output arguments; it requires that source root's dependencies to be installed.

## Exact next Studio task

Pull current main and read this report plus the original two handoffs. Resolve CSF1–CSF4 with the smallest application/test changes. Require complete submission context, retain all existing field comparisons, pin receipt polling to the submitted network, link the actual mined receipt hash, and replace ABI-only/source-only assertions with production-path regression coverage including positive controls. Fix the ESM TypeScript errors without relying on undeclared ambient dependencies. Run the full suite and the expanded independent probes, report actual counts/exits and full SHAs, then commit/push source and report. No contract change, deployment, signing, hosting configuration change or security bypass is authorized by this review.

## Remaining open boundaries

Mounted DOM/keyboard behavior, live wallet/replacement/chain-switch flow, public deployed revision, cross-session evidence, mobile compatibility and MetaMask's classification have not been verified by this review. No support clearance or live classification observation was obtained. These fixes must not be presented as removing the malicious-site warning.
