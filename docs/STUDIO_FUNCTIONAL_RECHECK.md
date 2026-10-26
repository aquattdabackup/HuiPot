# Independent validation of Studio revision 2ae2f71

Historical findings at 2ae2f71. The shared-predicate and two Proof-verdict fixes are verified at f83a442 in [STUDIO_PROOF_RECHECK.md](STUDIO_PROOF_RECHECK.md); other acceptance items remain open.

Date: October 25, 2026 (Asia/Ho_Chi_Minh).
Input HEAD: `2ae2f71b6814a7b57e0ff0bd5903f1f1f6c031c3`, independently confirmed as GitHub main and clean local HEAD. Read AGENTS.md and docs/STUDIO_FIX_REPORT.md in full before validation. Application source, contracts and tests were not modified.

## Content access and scope

`src/contract.ts` exports DEPLOYMENT_CONFIGURED as the validity of VITE_HUIPOT_ADDRESS: exact `0x` followed by 40 hex digits, excluding the zero address. Missing/malformed/zero input yields false and HUIPOT_ADDRESS falls back to zero. This checks build configuration syntax, not deployed bytecode, chain correctness, receipt validity or a completed wallet flow. Whitespace is not trimmed.

The requested STUDIO_FIX_REPORT.md is still historical Rev 2 (R1-R6, 17 Vitest tests), not an F01-F07 completion report. docs/STUDIO_FUNCTIONAL_FIX_REPORT.md is absent at this input revision. The Studio message and commit description must be checked against source rather than treated as independent validation.

## Validation

Tests ran on a git archive of the exact input commit under `.review/recheck-2ae2f71/snapshot`. Existing cached dependencies were reused after package.json and bun.lock matched; Bun 1.3.14 / Forge 1.7.1 toolchain reused, no installation or token request. Raw captured logs and all command exits: [evidence](evidence/recheck-2ae2f71/runs.json).

| Command | Exit | Passed / failed / skipped | Result |
| --- | --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 / 0 / 0; 14 suites | Pass |
| `bun run test` first run | 1 | 37 / 1 / 0 | Pool module-import test timed out after 5000ms; chained checks stopped |
| `bun run test` unchanged warm retry | 0 | 38 / 0 / 0; 2 files | Pass; timeout/assertions unchanged |
| `bun run check` | 0 | Lint 0 errors, 0 warnings; tsc 0 errors | Pass |
| `bun run build` | 0 | Not a test count | Pass; large-chunk warning |
| Production verifier probes | 1 | 12 / 2 / 0; 14 synthetic cases | Two false-positive verdicts remain |

Execution notes: the first wrapper failed executable lookup before any test ran. With absolute paths Forge passed, then the wrapper stopped while printing its Unicode table; the completed Forge log/exit were preserved and Vitest resumed separately. The first actual Vitest run failed and was retained before the unchanged retry. No all-green single chained run is claimed. Log timestamps are execution-host output; the review date above uses the user time zone.

## What the source supports

- Added Vercel SPA rewrite configuration. This alone does not prove the live deployment or direct routes work; hosting and rendered-browser acceptance were not checked this turn.
- Review buttons now open a review panel before a separate wallet confirmation; receipt hooks explicitly specify the target chain.
- Contribution Proof now rejects missing inbound movement and mismatched movement amount. The original zero-event/no-movement fixture is rejected because movement is missing.
- Share links, Proof `?tx=` prefill, Pool RPC error and refund loading/error states have source changes. Full browser acceptance remains unverified.

## Remaining discrepancies

1. **Tests still duplicate the predicate.** `src/lib/__tests__/verifyTx.test.ts:30` declares its own computeOverallValid; it does not import production verifyTx. The claim that this approach was removed is false. There are 38 tests across two files, not 38 in verifyTx.test.ts alone. Its zero-amount fixture substitutes null for zero, so it does not prove rejection of decoded numeric zero.
2. **Production Proof still accepts two synthetic negatives.** Directly executing the unchanged production function accepts both event + inbound Transfer amounts equal to zero, and a nonzero inbound Transfer from a different sender than the event contributor. Expected overallValid=false; actual=true for both. Original 12 verifier cases now pass. These are synthetic verifier-boundary checks, not claims that the contract can emit impossible events or that funds were stolen.
3. **Receipt success remains insufficiently bound.** Pool ActionPanel still derives confirmations from useWaitForTransactionReceipt.isSuccess without inspecting the corresponding action event/amount/recipient. The review snapshot is cleared when submitting. Pinning the receipt chain is an improvement, but does not implement the requested successful replacement/cancellation handling.
4. **Review context/fees remain partial.** confirmAction compares the captured chain to the target constant, not the current wallet chain, and does not revalidate changed pool status/capacity before calling the write hook. Wagmi may reject a wrong-chain submission; that is not a proved UI invalidation flow. Displayed gas `~<0.01 USDC` is a fixed string rather than a measured per-action estimate; no balance-plus-fee/simulation acceptance was demonstrated. Review addresses are truncated.
5. **Completion reporting is incomplete.** The F01-F07 report required in the previous prompt was not delivered. No public configuration, browser, wallet or mainnet success should be inferred from the passing suites.

Reproduction instrument: [proof-probes.cjs](evidence/recheck-2ae2f71/proof-probes.cjs), adapted from the existing Codex reviewer instrument to run only the unchanged verifier and add the two negatives. It extracts production verifyTx and supplies synthetic RPC responses, with no actual network or wallet calls. It is not Studio app/test code.

```text
node docs/evidence/recheck-2ae2f71/proof-probes.cjs .review/recheck-2ae2f71/snapshot .review/recheck-2ae2f71/proof-probes.json
```

## Next Studio action

Read latest main, AGENTS.md, this report and docs/STUDIO_FUNCTIONAL_FIX.md. State the actual input SHA and explain why the test file still duplicates production logic and why both attached negative fixtures return true. Finish the remaining acceptance requirements with production-path tests, without changing D2-D8 or replacing existing artwork. Retain failed/retried test evidence, write docs/STUDIO_FUNCTIONAL_FIX_REPORT.md, and deliver through the existing repository integration. Do not repeat setup, request tokens, sign wallet transactions or deploy mainnet.

Host-side action remains: set the public testnet VITE_HUIPOT_ADDRESS to `0x81a139599d252eb2dc2bbb6c267e911a21264288` in the intended Vercel build environment and rebuild through the authorized hosting workflow. This review did not change hosting settings or trigger a deployment manually.

Not run: rendered browser/deep-link acceptance, real-wallet testnet flows, mainnet transactions/deployment, submission. Passing local tests does not close these gates.
