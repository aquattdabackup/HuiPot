# Review the reported Studio build

Date: October 24, 2026 (Asia/Ho_Chi_Minh).
Status: a Studio completion summary was supplied by the user; source, tests, preview, and build provenance have not yet been independently inspected.

Latest follow-up: the user subsequently supplied a review report and deployment transaction. See [STUDIO_REVIEW_ASSESSMENT.md](STUDIO_REVIEW_ASSESSMENT.md) for direct RPC evidence, report discrepancies, and the current corrective/export prompt. The initial prompt below is retained as history.

## What is established

- The supplied summary reports `HuiPotGoalPool`, four connected screens, and an Arc Testnet deployment at `0x81a139599d252eb2dc2bbb6c267e911a21264288`.
- A read-only RPC check at `2026-10-24T03:36:18.4446693Z` returned chain ID `5042002` and 4,134 bytes of runtime code at that address at block `68797100`. This establishes code presence, not its identity, correctness, source match, or a successful pool flow.
- The existing GitHub remote advertises only `main`, at `eb7e82bd7b65ad96cecebdeb71749c8cd6afeb4f`. No Studio source branch was found. The local checkout still contains documentation only.
- The Studio project URL, actual input/output revisions, deployment transaction, exported source/ABI, raw test logs, app-flow receipts, and preview inspection are outstanding.
- The report covers app generation and deployment beyond the earlier milestone A handoff. No preceding contract-review gate evidence was supplied. Review the existing result before advancing; do not regenerate it to reconstruct a missing history.

Preview availability and testnet code presence do not establish a public live app or the supplied competition's mainnet USDC proof. See [REQUIREMENTS.md](REQUIREMENTS.md).

## Prompt for the existing Studio project

Prepared only. Codex has not submitted this prompt or inspected its results.

```text
Review and export the existing HuiPot Goal Pool project that produced the completion summary. Preserve the current project and capture its current revision before doing anything else.

The reported deployment is HuiPotGoalPool at 0x81a139599d252eb2dc2bbb6c267e911a21264288 on Arc Testnet, chain ID 5042002. Independently checking runtime code presence does not establish a match to your source or a successful app flow.

Read the existing project inputs and the full approved docs/SPEC.md and docs/DESIGN.md from https://github.com/aquattdabackup/HuiPot at commit eb7e82bd7b65ad96cecebdeb71749c8cd6afeb4f. Report whether these were the actual original build inputs; do not retroactively claim they were. If you cannot read the documents, identify the missing inputs instead of guessing. Use docs/ARC_TOOLING.md and docs/STUDIO_PROMPTS.md for the documented review and evidence requirements.

Perform review and run existing checks only. Do not start another generation job, change code, deploy, publish, or send wallet transactions. Any proposed source/test/UI fixes must subsequently be produced in Studio after findings are reviewed.

Return these concrete artifacts:

1. The real Studio project URL, current revision/export ID, original input commit if actually recorded, and build/test/deployment sequence. Distinguish recorded history from unavailable history. Give the preview URL and access limitations separately from any independently accessible public app URL.

2. A supported source export containing complete contracts, contract tests and helpers, app source and tests, actual ABI, build configuration, compiler version/settings, dependency manifests and lockfiles, and deployment metadata. Provide a file manifest and sanitized environment-variable example; exclude credentials and local secret files. If already exported to GitHub, give the exact existing repository, branch, and commit. Otherwise provide the supported downloadable export; do not overwrite the existing repo or publish a new branch as part of this review request. If exporting is unsupported, state the exact limitation.

3. Actual compile, contract-test, app-test, build, type-check, and lint commands where the project supports them, their tool versions, exit statuses, complete raw logs, and passed/failed/skipped counts. Mark absent or unexecuted checks as not run. Map existing evidence to AC01-AC13; identify missing tests separately. Ordinary EVM tests must not be represented as Arc runtime integration coverage.

4. A security review with severity, file/line, failure scenario, affected funds, evidence, and proposed correction for each finding. Check D1-D8 against the actual source: immutable terms and recipient, exact cap, native 18-decimal amounts with the 10^12-unit quantum, cross-pool accounting, no early exit or privileged withdrawal, permissionless full payout only to the stored recipient, and full individual principal refunds only after an underfunded expiry. Check exactly-at-deadline behavior, Funded remaining payable after expiry, rejecting receivers, reentrancy across functions/pools, rollback on failed external calls, repeated claims/payouts, and unsolicited balances. A review is not an audit; tests passing do not establish safety.

5. The actual deployment transaction hash, receipt status, chain, address, and explorer link. Explain whether the reviewed compiler output matches the deployed runtime bytecode, including any constructor/immutable/library considerations. If this comparison cannot be performed, mark the source-to-deployment match unverified.

6. Review app amount parsing, principal-plus-gas handling, wallet/account/network changes, pending/replaced/reverted/unknown transactions, and success being based on the correct receipt/event/pool. Review whether Proof independently checks the chain, contract, pool, event, and native movement, rather than just displaying a supplied hash. Keep testnet evidence labeled as testnet. Report WalletConnect configuration as present/absent without printing credentials, and distinguish tested injected-wallet support from untested mobile support.

7. Existing create/contribute/payout and failed-pool/refund receipts and app-flow recordings, if any. If no such flows have been executed, state that explicitly; do not send new transactions just to fill this report. Distinguish a contract deployment from USDC moving through a pool, and a contract event from independently checked recipient movement.

Stop with the export, evidence, findings, and missing-check list for independent review. Keep all unverified claims explicit.
```

## Review gate

Codex can inspect and run appropriate checks on the actual export once available. A supported project URL alone may still require the user's browser to export files. The current browser handoff remains in effect; no new login or token is requested.

After source review and resolution of critical findings, prepare the supported testnet golden-flow and failed-pool refund checks with the human operating the wallet. WalletConnect setup is needed for the reported mobile integration; it is not evidence that the existing injected-wallet flow works. Mainnet, hosting, and submission remain later decisions supported by concrete artifacts.
