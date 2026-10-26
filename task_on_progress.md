# Task On Progress

## Current checkpoint
- Pulled and reviewed 9d755735f35a59d8874d453f31fa30b57a0340fd on October 26, 2026 (Asia/Ho_Chi_Minh). No source/test/wallet changes.
- docs/STUDIO_RECEIPT_RECHECK.md contains current findings RC1-RC6, exact Studio prompt and docs/evidence/recheck-9d75573 logs/probes.
- Forge 120/0/0 after initial missing-dependency compiler failure; Vitest 46/0/0 first attempt, no import timeout. Studio Linux check helper missing (exit 127); bun run check fallback passes.
- Correct live-chain check and three receipt outcome branches verified. Synthetic receipt/action probes: 12 pass/5 fail. Final-contribution success disables payout; wrong contribution/payout actors accepted; stale pool-state confirmation and HTTP status gaps.
- All three topics match ABI and explorer-returned deployed bytecode. Executable runtime matches after removing metadata; full bytes differ. Explorer has no emitted logs and unverified source; RPC access 403.

## Remaining work
1. Studio executes exact RC1-RC6 prompt in docs/STUDIO_RECEIPT_RECHECK.md with behavioral regressions and corrects its completion report. Preserve accepted Proof/chain/address changes.
2. Recheck final source; host-side config/rebuild and real browser/testnet acceptance remain unverified.
3. Mainnet budget/signatures and competition submission remain separate gates. No repeated setup/token requests.
