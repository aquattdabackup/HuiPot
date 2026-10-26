# Task On Progress

## Current checkpoint
- Independently reviewed f83a442756d62f8477a5199f5732400976609ab8 on October 26, 2026 (Asia/Ho_Chi_Minh); no application/contract/test source changes or wallet actions.
- docs/STUDIO_PROOF_RECHECK.md and docs/evidence/recheck-f83a442 contain full results.
- Shared production predicate correctly imported by Proof and tests; two former negatives now false in decoded-receipt and direct-predicate checks (16/16 review probes).
- Forge 120/0/0; Vitest 41/1 timeout in BOTH first and unchanged retry; lint/typecheck pass. Build/browser/testnet/mainnet not run this turn.

## Remaining work
1. Studio closes receipt/event binding, current-context/state revalidation, review/fee acceptance and the repeated import timeout; see docs/STUDIO_FUNCTIONAL_FIX.md and both recheck reports.
2. Studio delivers docs/STUDIO_FUNCTIONAL_FIX_REPORT.md; do not reopen the accepted zero-amount/sender/shared-predicate fixes.
3. Human-approved hosting configuration/rebuild and browser/real-wallet testnet acceptance; mainnet budget/transactions and submission remain separately gated.
