# Task On Progress

## Current independent review — fc83aa6, October 30
- Pulled fc83aa60750c92a41acee00931b2d6baa7ca4ff4, parent c21016ead0f3d6765af709b28a81e11d2b517287. Report docs/STUDIO_FFR_ACCEPTANCE_RECHECK.md; evidence/recheck-fc83aa6.
- Windows exact archive, 45 source/config matches; unchanged dependencies reused from prior clean locked install. Forge 120/120, Vitest 214/214, check/build exit 0. Six supplied probes all pass (7/13/23/3/13/4).
- Ordinary replacement and pending-read cleanup repaired. Additional settled-verdict/new-identity and unchanged-error replacement callback checks expose FV1/FV2 (3 pass/3 fail). Deferred rejection and unmount rejection controls pass. Maintained lifecycle tests/reporting still need FV3/FV4 corrections.
- No application source changes, Studio job, hosting or signing. User requires an explicit copyable Arc prompt with every repair handoff. Next: deliver review and FV1–FV4 prompt; then review Studio output. Review committed locally; push failed because GitHub authentication cannot prompt. Remote main verified fc83aa60750c92a41acee00931b2d6baa7ca4ff4. User must push from an authenticated terminal before Studio reads the new report.

## Current independent review — 5989686, October 30
- Pulled 5989686343724078521ff42b5dbf7ff9acb09907; actual parent ad09b9786ae52dac42ea9484da9b148f1d43c26e, not Studio's reported full input SHA.
- Clean locked dependency install in Windows path containing a space. Forge 120/120; Vitest 211/211; check/build exit 0. CWR4/CWR5 accepted. No source edits. Evidence: docs/evidence/recheck-5989686; report docs/STUDIO_FINAL_FIX_RECHECK.md.
- CWR6 partial: ordinary revert and unknown controls pass; replacement identity and stale/unmount guards missing. Stateful production probe 4/7; maintained revert tests/runtime assertion are fixture-only for the new verdict. Studio expanded probe removed real-query coverage; restored independent version 13/13.
- Next Studio work: FFR1–FFR4 in the report (replacement identity, async invalidation, actual stateful tests, coverage/report accuracy). Existing live demo evidence remains accepted for those scenarios. No deployment, signing or MetaMask claim.
- Documentation/evidence committed locally. Push failed because this session cannot prompt for GitHub authentication; direct ls-remote confirms remote main still 5989686343724078521ff42b5dbf7ff9acb09907. User must push from an authenticated terminal before Studio can read the new report. Preserve pending Studio handoff context until independently accepted.

## Active closure handoff — after successful testnet demo
- User asked to close remaining defects. Pulled main ba02ec6e686c5b490239c42e32811c262fad3d10; source still 00252d0. No need to rerun unchanged suites solely for documentation.
- Human completed pool 7 0.4+0.6 contributions, 1-USDC payout to Buyer and Proof; pool 8 0.2 contribution, expiry, refund to TTuan and Proof. RPC receipts/transfers independently checked; user screenshots inspected. See docs/TESTNET_DEMO_ACCEPTANCE.md and evidence/testnet-demo-2026-10-29.
- Prepared docs/STUDIO_FINAL_FIX_PASS.md for existing manual Studio browser workflow: CWR4 types/build, CWR5 portable paths/clock, CWR6 actual-library revert handling plus correct reproducible probes/report. Do not reopen accepted live happy paths or promise MetaMask/mainnet clearance.
- Source not modified and Studio prompt not executed. Next user action: push documentation from an authenticated terminal, run the focused prompt in Studio, then independently review its resulting commit.
- October 30 delivery check: documentation committed locally; push failed because GitHub credentials cannot be prompted in this session. Direct ls-remote returned main 00252d0e38e4bc9e047072246e905424c8878951, despite local planning HEAD ba02ec6. Local presence is not evidence of publication. Do not force push; reconcile any subsequent remote changes before delivery.

## Current review — 00252d0, October 29
- Pulled 00252d0e38e4bc9e047072246e905424c8878951 from 4d9f3c07ac74a02689be16039d949e0bc413e03a. Report: docs/STUDIO_CWR_ACCEPTANCE_RECHECK.md; evidence docs/evidence/recheck-00252d0. Source unchanged.
- Forge 120/120; Vitest 200 pass / 10 fail due Windows URL pathname; check exit 2/build exit 1 due four missing Node type errors. Runner additionally uses expired fixed noon fixture without a controlled clock; independently reproduced before/after deadline.
- Accept CWR1 paused/hash guard and CWR2 finite waiter timeout/read-only retry (actual viem timer 30012ms then success, one write). CWR6 remains: actual wagmi rejects reverted receipt, so new isSuccess+reverted branch is not reached.
- Original probes 15/23 and 2/3; after hash-only fixture adaptation 23/23 and 3/3. Expanded 10/13 unchanged; settle actual query rather than await void callback gives 12/13. Remaining diagnostic is true deduplication, not microtask timing; finite-timeout strategy makes independent pending reads optional. New test block 10 behavioral + 6 structural, not 15 behavioral.
- Next Studio task: CWR4 dependency/typecheck/build, CWR5 portable paths/controlled clock, CWR6 actual revert path; correct report/comment and commit adapted probes. No new application implementation by Codex, wallet or hosting action. Browser/live wallet/MetaMask gates remain open.
- Repository delivery: review committed locally; push failed because GitHub authentication cannot prompt in this session. Remote main verified still 00252d0e38e4bc9e047072246e905424c8878951. User can push from the authenticated terminal; verify remote before claiming publication.

## Previous review — b2bf1ef, October 29
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
