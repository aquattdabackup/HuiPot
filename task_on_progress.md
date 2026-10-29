# Task On Progress

## Current review — b2bf1ef, October 29
- Pulled/reviewed b2bf1ef705f5eac6a14d047e391b701100a0cd3b, parent 9e4ae8f5bc34a7d03432ea605acd15610adf3b6e. Report: docs/STUDIO_CREATE_CONFIRMATION_RECHECK.md; evidence: docs/evidence/recheck-b2bf1ef.
- Independent Forge 120/120, Vitest 204/204, check/build exit 0. Historical production/recovery probes 23/23 and 3/3 unchanged. Expanded production/real-query probes 8 pass / 5 fail (13 assertions). Source untouched.
- Partial acceptance: pending link and settled-error retry work, full snapshot/mined links/chain pin/prior guards preserved. CWR1: paused query unlocks Create and hides link; handler has no unresolved guard. CWR2: pending refetch reuses unbounded waiter. CWR3: ten new tests are source/self-string/ABI assertions, no production retry execution. Test-file count 39, not 40.
- Next: Studio fixes CWR1–CWR3 and distinct confirmed-revert presentation using report's acceptance criteria. Prompt prepared in report, not executed. No signing/hosting/deployment or MetaMask clearance. Full public browser/wallet flow remains pending.
- Repository delivery: review docs/evidence committed locally; push failed because this execution session cannot authenticate to GitHub without an interactive prompt. Remote main independently remains b2bf1ef705f5eac6a14d047e391b701100a0cd3b. User can run git push origin main from their authenticated terminal. Do not claim the report is published until remote verification.

## Original public issue — Create stuck Confirming, October 29
- User transaction 0xa1cfc4e3f0e3547a9a965eb9d83e785cd2a1767036b914c339ac4dd2c617c08b created pool #3 successfully, but supplied UI screenshot still shows Confirming. Exact browser trigger/hash/network logs unknown.
- Installed wagmi core read-only waiter resolves the same receipt in 339 ms. Public bundle contains current Create repair markers.
- Confirmed gaps: no pending transaction link/recovery, no finite app wait, receipt-query errors ignored and submit can re-enable while outcome unknown. Controlled production probes 1 pass / 2 fail.
- Studio task prepared, not executed: docs/STUDIO_CREATE_CONFIRMATION_RECOVERY.md. No duplicate pool submission, contract change or signing. Prior 23/23 acceptance is scoped and did not cover this waiting/error recovery.

## Latest review — a526ce6, October 29
- Pulled/reviewed a526ce6a551651f059988539e2fe9fbe20a366bc from input a348fb2e1e65a01ab38409532912f7c4dba0c639. CSF1–CSF3 and ESM repair accepted at source/synthetic production scope.
- Independent Forge 120/120, Vitest 194/194, check/build exit 0; production probes 23/23, identical to Studio results. No source edits.
- Remaining regression coverage: createSafety has 29 cases (19 source + 7 ABI + 2 hash fixtures + 1 constant), not 30; it does not execute Create. Production behavior currently covered by a separate tracked probe, not bun run test. See docs/STUDIO_CREATE_SAFETY_ACCEPTANCE.md.
- No new functional blocker found in these fixes. Public revision, DOM/wallet/replacement/mobile/cross-session and MetaMask classification remain separate gates. Prior real testnet createPool #1 is confirmed, not the rest of the golden flow.

## Active blocker — MetaMask classification, October 29
- Main pulled at 589b8ec; app 53c8190 unchanged. User requested deep investigation, and authorized MetaMask Support contact. Concise message/follow-up sent; no human ticket/detection reason established.
- See docs/METAMASK_DEEP_RECHECK.md. Exact user calldata is createPool, 1 USDC goal, title test/purpose 1, deadline Oct 29 noon Vietnam; canonical encoding and read-only call pass at expected target/value. Full wallet envelope unavailable. Runtime executable matches after CBOR removal, full byte hashes differ.
- 93 public JS/CSS assets inspected: 92 match normalized local build; one vendor chunk has helper-wrapper/build differences, full provenance remains open. No confirmed cause of warning.
- Historical Create/metadata defects have since received Studio fixes accepted above at source/synthetic scope. Installed injected MetaMask connector does not receive appUrl; classification cause remains unknown.
- Do not sign/bypass warning or claim false positive. No app source, contracts or hosting modified. Keep raw wallet calldata/account out of public evidence.


## Current checkpoint
- Reviewed Studio output 53c8190ed2a5dde8e7eb1ed953e15fffa19271f7, parent 0f8d4e4e12d2052c44cade277719e012b8e07e13. PFI1/PFI2 accepted at local source/integration/synthetic-page scope.
- Forge 120/0/0; Vitest 165/0/0; check/build exit 0. Initial missing-dependency Forge compile failed before tests, then unchanged source passed after environment repair. Original probes 29/29; additional probes 8/8; real TanStack transition probes 18/18. Manifest: 45 matching files.
- Reporting discrepancy: publicFlow 53 (40 classifier/smoke + 1 ABI + 12 structural), not Studio's 57. Two real-viem transport tests; PFI2 suite uses state fixtures, complemented by independent real-query transition evidence. No new functional blocker found in the two fixes.
- Report docs/STUDIO_PFI_ACCEPTANCE.md; evidence docs/evidence/recheck-53c8190. App/contract/Studio test source unmodified by Codex; documentation/evidence delivery only.

## Next action and boundaries
1. Prioritize public deployed-SHA verification and human-operated testnet create/contribute/payout/Proof/refund acceptance using docs/DEMO_RUNBOOK.md. Do not require another code iteration solely for reporting typos. No tested assertion proves the public revision is updated.
2. Human controls wallet and signatures. No contract redeployment required for frontend error ABI metadata. No hosting/mainnet/submission action inferred from review acceptance.
3. Mounted DOM, real wallet flow, live replacement, mobile, measured fee, cross-session evidence remain open; Studio project URL, required mainnet proof/video and current competition eligibility are separate submission gates.
4. Preserve Studio provenance: further application/test fixes belong to Studio, independent review scripts belong to Codex. Pull before reviewing future output; preserve concurrent work and never force push.
