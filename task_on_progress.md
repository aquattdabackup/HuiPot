# Task On Progress

## Current checkpoint
- Reviewed bb992a6dfe15b1838d7570067f4ce055fcbadd35 after pull; GitHub HEAD matched. October 27, 2026, Asia/Ho_Chi_Minh. Read all six requested files in full.
- Report: docs/STUDIO_HASH_DISPATCH_RECHECK.md. Evidence: docs/evidence/recheck-bb992a6. Application, contract, dependency and Studio test source unchanged.
- Forge 120/0/0 exit 0; Vitest 105/0/0 exit 0; check exit 1 from unused opts parameter at lifecycle.test.ts:297 (one warning, --deny-warnings). Build exit 0 with chunk warnings. Separate typecheck exit 0; chained typecheck was not reached.
- Prior receipt/action 31/31 and lifecycle 21/21 probes pass. All four prior SC1-D replacement/success negatives now fixed for tested orderings.
- Additional wait-error probes 3 pass / 3 fail: obsolete errors bypass dispatch and overwrite current action UI, leaving stale hash and ineffective Retry. Current errors retry correctly. Synthetic production component callbacks/effects, not live browser/mempool proof.
- F02/F06/RC6 descriptions now match source. Lifecycle tests = 21 behavioral production module/dispatch API + 4 raw-source checks; Studio tests do not mount Pool. Browser/wallet/hosting not checked or changed this review.

## Next work
1. Studio follows CK1 + SC1-E prompt in report: fix unused test parameter, guard wait-error state changes by originating hash/epoch, and add real production adapter/component coverage. Preserve 31 + 21 accepted probe cases.
2. Hosting owner follows DEMO_RUNBOOK.md for build-time address and reviewed deployment. Last public browser configuration observation was October 26; do not present it as rechecked today.
3. Human testnet golden flow, real Proof receipts, multi-wallet and live replacement. No Codex signing.
4. Keep HuiPot; user requested stronger product/competition experience. Community workshop use case, readable Proof and actual activity/sharing were discussed; upgrade brief/implementation remain pending while explicit validation requests take priority. Studio implements all application work.
5. Mainnet proof, current eligibility, Studio permalink/video and submission retain separate gates. Do not repeat setup or token requests.
