# Task On Progress

## Current checkpoint
- Reviewed f00c80da0168afacd136b1c8f0cf44e077952888 after pull, October 26, 2026 (Asia/Ho_Chi_Minh). No app/contract/Studio test source changes.
- Current report: docs/STUDIO_SUBMISSION_CONTEXT_RECHECK.md. Demo plan: docs/DEMO_RUNBOOK.md. Evidence: docs/evidence/recheck-f00c80d.
- Forge 120/0/0, Vitest 92/0/0, check/build exit 0. 31 receipt/action and 14 previous lifecycle probes all pass. Two extended late-callback cases fail (after unmount, after newer same-action submission).
- New lifecycle suite copies lifecycle behavior in a harness; needs production-path coverage. Report F02/F06 still misdescribe unchanged source.
- Browser actually exercised landing illustrations: payout and refund pass. Direct real routes render but configuration gates block reads/writes/Proof; /pools/1 explicitly requests VITE_HUIPOT_ADDRESS build config. Public deployed SHA unknown, hosting not changed. Demo tab left open for user.

## Next work
1. Studio executes prepared SC1 prompt, fixes late callback identity/unmounted checks with production-path tests and preserves accepted cases.
2. Hosting owner sets build-time address and redeploys reviewed revision per DEMO_RUNBOOK.md; verify reads before wallet.
3. Human runs testnet creation, partial/final contributions, payout/Proof and expired-pool refund; record real receipts. No signatures performed by Codex.
4. Mainnet proof, eligibility/current rules, Studio permalink/video and submission remain separate gates. No repeated setup/token requests.
