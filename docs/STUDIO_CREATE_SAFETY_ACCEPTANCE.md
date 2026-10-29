# Independent a526ce6 Create safety acceptance

Date: October 29, 2026 (Asia/Ho_Chi_Minh).

- Input: `a348fb2e1e65a01ab38409532912f7c4dba0c639`.
- Reviewed output/main: `a526ce6a551651f059988539e2fe9fbe20a366bc`.
- Pulled main before review. Four changed files match the reported scope. Application source, contract source and Studio tests were not modified by this review.

**Decision:** CSF1–CSF3 and the CSF4 ESM/typecheck repair are accepted at source and synthetic production-component scope. All five previously failing production probes now pass. No remaining functional blocker was found in these specific fixes. CSF4's request to put production-path behavioral coverage in the automated regression suite remains incomplete; the separate independent probe supplies that evidence today. MetaMask classification is not cleared by these results.

## Findings and reporting corrections

### P2 — Production-path coverage is still separate from the Vitest suite

`src/lib/__tests__/createSafety.test.ts` still does not import or execute Create's validator/receipt acceptance. Its 29 cases consist of **19 source assertions, 7 ABI fixture checks, 2 hash fixture checks and 1 chain constant check**. The two new tests labelled behavioral only compare HASH_A/HASH_B constants and cannot catch an application link regression. The chain source assertion starts at the import occurrence and finds a later chainId string; by itself it does not prove the argument belongs to the receipt hook.

The 23-case production instrument independently executes the unchanged Create component, including the actual submit handler and persistent ref across receipt renders, and verifies all five repairs. It is tracked and reproducible but is not invoked by `bun run test` or `bun run check`. Integrate a production component/shared-validator test path into the normal regression suite, or explicitly enforce the independent component probes in automated validation and accurately describe the split. Do not claim this Vitest file itself provides production-path behavioral coverage. This is a regression-maintenance gap, not a newly reproduced functional failure in a526ce6.

### P3 — New test-file count is 29, not 30

Studio's total **194** is correct: prior 165 + current 29. The earlier file had 19 cases, so this commit adds 10, not 11. Correct the AGENTS delivery description and any other claim of 30. This reporting typo does not justify another application rewrite.

The AGENTS shorthand `receipt?.transactionHash ?? hash` is not the literal source expression. Actual code is `(isSuccess && receipt?.transactionHash) ? receipt.transactionHash : hash`; both rendered receipt-result branches require success, so the reviewed link behavior is correct.

## Verified repairs and preservation

| Requirement | Evidence and outcome |
| --- | --- |
| CSF1 | snapOk rejects null snapshot and empty account/contract/recipient before entering the loop. Creator and recipient use snapshot fields directly. No live-form fallback remains. Missing snapshot and empty-account probes now reject foreign receipts. |
| CSF2 | Both explorer links use minedHash. Production probes with submitted A / mined B return B for success and cancellation/unmatched receipt branches. |
| CSF3 | useWaitForTransactionReceipt explicitly receives TARGET_CHAIN_ID (5042002). The post-submission chain-switch probe remains pinned to Arc. |
| CSF4 ESM | decodeEventLog uses the top-level viem ESM import. AST inspection finds zero executable require calls; the text appears only in a comment. Previous six TS2580 errors are absent; check/build pass. |
| CS1 | Valid submission still works; zero/self/malformed recipients block writes with expected errors. Existing guard ordering and zero-address message remain intact. |
| CS2 | The actual submit handler captures every snapshot field and trimmed text. Matching receipt succeeds; mismatched creator, recipient, emitter, target, deadline, title or purpose fails. Original receipt remains tied to captured terms after live form/account changes. |
| PF2 | Disconnected early return and ConnectKitButton.Custom/type=button remain unchanged. Existing publicFlow tests pass; no DOM/keyboard claim follows from source checks. |
| Metadata and money rules | src/config.ts/appUrl, contract ABI, Solidity and payment paths are unchanged from the accepted metadata correction. |

snapOk checks the three non-empty identity strings explicitly; the other terms remain required by the typed snapshot producer and receipt comparisons. This review does not claim arbitrary corrupted JavaScript objects or a hostile runtime were exhaustively tested.

## Exact independent commands and results

Ran against a Git archive of a526ce6 in `.review/recheck-a526ce6/snapshot` with the existing installed dependencies, unchanged package/lock files, and no source patches. Manifest confirms 44 source/config files match the checkout after CRLF normalization.

| Command | Exit | Passed | Failed | Skipped / notes |
| --- | --- | --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 | 0 | 0 skipped |
| `bun run test` | 0 | 194 | 0 | 0 skipped; 6 files |
| `bun run check` | 0 | — | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run build` | 0 | — | 0 | tsc and Vite complete; ordinary chunk-size/dependency build warnings are not claimed absent |
| `node docs/evidence/recheck-f7297fd/production-create-probes.cjs .review/recheck-a526ce6/snapshot .review/recheck-a526ce6/production-results.json` | 0 | 23 | 0 | No skipped cases; result equals Studio's checked-in create-probe-results.json |

The independent probe returns process exit 0 after writing its report, so the actual 23/0 fields were checked rather than relying on exit status alone. No repeat test run was needed. Logs, manifest, coverage classification and probe result are in `docs/evidence/recheck-a526ce6/`.

## Open boundaries and next priority

- No public deployment/revision inspection, mounted DOM/keyboard test, live replacement/chain-switch, mobile or cross-session test was run in this review.
- The user's separately inspected transaction `0xf9c0d0e665381bb6d941bc1a2ffd073d0df2595f44ad57eb67456fbe5c61d4dd` established a successful Arc Testnet createPool and PoolCreated #1. It is evidence of that earlier real creation, not of a526ce6 deployment or of contribution/payout/refund success. It does not clear the MetaMask warning.
- MetaMask's classification, public demo acceptance and the outstanding competition submission requirements remain separate. No signing, deployment or hosting changes occurred here.
- Prioritize verified public revision and the human-operated golden flow once the warning is appropriately resolved. Correct the reporting/automated-coverage gaps without reopening accepted contract money rules or redesigning the app.
