# Task On Progress

## Current checkpoint
- Independent validation of Studio source 2ae2f71b6814a7b57e0ff0bd5903f1f1f6c031c3; application/contracts/tests unchanged.
- See docs/STUDIO_FUNCTIONAL_RECHECK.md and docs/evidence/recheck-2ae2f71 for exact attempts and findings.
- Forge 120 pass; Vitest first 37 pass/1 timeout then unchanged retry 38 pass; lint/typecheck and build pass (large-chunk warning).
- Production verifier: 12 pass/2 fail. Zero event+movement and wrong inbound sender still accepted.
- Studio still duplicates the verdict predicate in tests; receipt-event binding and review context/fee behavior remain incomplete.

## Remaining work
1. Studio implements remaining acceptance from docs/STUDIO_FUNCTIONAL_FIX.md and the new recheck; no repeated setup/token requests.
2. Human-approved Vercel public-address configuration/rebuild, then browser and real-wallet testnet acceptance.
3. Mainnet budget/transactions and submission retain separate approval gates.

Last updated: October 25, 2026 (Asia/Ho_Chi_Minh).
