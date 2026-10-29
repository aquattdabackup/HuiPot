# Task On Progress

## Latest review — CS1/CS2 at f7297fd, October 29
- Pulled f7297fd1bc8655da80a2cc47b336b61ddb8080cd (source 2e777fb). CS1 and appUrl accepted; CS2 incomplete. See docs/STUDIO_CREATE_SAFETY_RECHECK.md.
- Independent Forge 120/120, Vitest 184/184; check exit 2 and build exit 1 with six TS2580 require errors in new createSafety tests.
- Historical probes 8/8, but receipt mock incomplete; valid receipt positive control fails. Expanded persistent-ref production probes 18 pass/5 fail: missing/empty context, two original-hash links, receipt chain not pinned.
- Studio next: CSF1-CSF4 in report; tests must execute production logic. No source edits, signatures, deployment or hosting changes by Codex.

## Active blocker — MetaMask classification, October 29
- Main pulled at 589b8ec; app 53c8190 unchanged. User requested deep investigation, and authorized MetaMask Support contact. Concise message/follow-up sent; no human ticket/detection reason established.
- See docs/METAMASK_DEEP_RECHECK.md. Exact user calldata is createPool, 1 USDC goal, title test/purpose 1, deadline Oct 29 noon Vietnam; canonical encoding and read-only call pass at expected target/value. Full wallet envelope unavailable. Runtime executable matches after CBOR removal, full byte hashes differ.
- 93 public JS/CSS assets inspected: 92 match normalized local build; one vendor chunk has helper-wrapper/build differences, full provenance remains open. No confirmed cause of warning.
- Production Create probes 6 pass/2 fail: zero recipient reaches wallet; wrong-target receipt can confirm. Studio fixes prepared in STUDIO_CREATE_SAFETY_FIX.md. Incorrect appUrl correction prepared separately; installed injected MetaMask connector does not receive that field.
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
