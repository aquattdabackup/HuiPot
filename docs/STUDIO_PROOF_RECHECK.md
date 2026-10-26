# Independent Proof recheck: f83a442

Reviewed October 26, 2026 (Asia/Ho_Chi_Minh). Input HEAD on GitHub main and local checkout: `f83a442756d62f8477a5199f5732400976609ab8`. The checkout was clean. AGENTS.md, docs/STUDIO_FUNCTIONAL_RECHECK.md, src/lib/verifyTxLogic.ts and src/lib/__tests__/verifyTx.test.ts were read in full before validation. No application, contract or test source was changed; no wallet transactions were signed.

## Confirmed fixes

- `src/lib/__tests__/verifyTx.test.ts:17` imports computeOverallValid from `../verifyTxLogic`. It does not redefine that function. The single production definition is in `src/lib/verifyTxLogic.ts:51`.
- `src/pages/Proof.tsx:8` imports the same function and calls it at line 263. The new interface fields are populated by the receipt decoder, including the sender comparison, and the evidence UI includes Transfer from.
- Amount validity now requires a non-null decoded integer greater than zero. A contribution with amountInLog='0' returns overallValid=false, even with matching zero inbound movement.
- Contribution movement now requires arcTransferFromMatchesContributor===true. A receipt with the correct amount but a different inbound sender returns overallValid=false.

Independent review probes execute the unchanged production receipt verifier with its actual shared predicate. All 14 receipt fixtures pass, including the two formerly failing negatives; two direct calls to the shared predicate also pass. Total: 16 passed, 0 failed, 0 skipped, exit 0. Positive payout/refund/contribution controls remain true. These are mocked receipts, not browser/chain/wallet execution.

## Suite evidence

| Exact command | Exit | Passed / failed / skipped | Notes |
| --- | --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 / 0 / 0; 14 suites | Pass |
| `bun run test` first attempt | 1 | 41 / 1 / 0; 1 file passed, 1 failed | Pool module import exceeded 5000ms |
| `bun run test` unchanged warm retry | 1 | 41 / 1 / 0; 1 file passed, 1 failed | Same import timeout |
| `bun run check` separately | 0 | oxlint 0 errors/warnings; tsc 0 errors | Pass |
| Independent verifier/predicate probes | 0 | 16 / 0 / 0 | Synthetic receipts and direct production predicate |

The requested chained sequence stopped at the first Vitest failure. One unchanged Vitest retry and a separate check command followed. The claimed 42/42 pass is **not reproduced** on this machine. All assertions and timeouts were preserved. The 25-test verification file has 24 passes and 1 import-timeout failure; all 17 parser tests pass. Logs are UTF-8 with line endings/trailing whitespace normalized for the repository; original captures remain in the ignored review folder.

Testing used a git archive of the recorded input SHA and the existing cached dependency installation after package.json and bun.lock matched. All 37 source/config files match input HEAD after CRLF/LF normalization; saved hashes describe the tested snapshot. No package installation, login or token request. See [run exits](evidence/recheck-f83a442/runs.json), [source hashes](evidence/recheck-f83a442/source-hashes.json) and [probe results](evidence/recheck-f83a442/proof-probes.json).

The probe wrapper was adapted only to inject the real imported predicate into the extracted unchanged verifyTx function, retain the original fixtures, and add the two requested direct-predicate cases. It does not implement another verdict predicate. Reproduction:

```text
node docs/evidence/recheck-f83a442/proof-probes.cjs .review/recheck-f83a442/snapshot .review/recheck-f83a442/proof-probes.json
```

## Remaining discrepancies and limits

These specific Proof fixes and removal of the duplicated predicate are accepted. This does not close the entire F01-F07 backlog.

- The full Vitest suite timed out on the same structural Pool import in both attempts. This is not a failed Proof-verdict assertion, but it prevents a clean full-suite acceptance. Studio should replace the heavy structural import with a focused, meaningful test or diagnose its cost; do not present this local run as 42/42.
- Pool.tsx and Create.tsx are unchanged from 2ae2f71. Pool confirmations still rely on receipt-hook isSuccess without matching the expected action event/amount/recipient; prior receipt replacement/context findings remain open.
- Pool confirmAction still compares the saved chain to TARGET_CHAIN_ID rather than current wallet chain, and does not revalidate pool status/capacity. The review still displays a fixed `~<0.01 USDC` gas string and truncated addresses. Per-action fee estimation/simulation and balance-plus-fee handling remain unverified/unimplemented in that path.
- The unit suite now exercises the production predicate, but its boolean fixtures do not exercise receipt extraction, RPC response validation, asynchronous page changes or wallet behavior. The independent receipt probes cover the listed fixtures only.
- docs/STUDIO_FUNCTIONAL_FIX_REPORT.md remains absent. The commit message's assertion that this report requires Codex confirmation first is not a project requirement. Studio can now document these verified fixes and the genuinely outstanding items without claiming full acceptance.
- Vercel environment/redeploy, direct-route live behavior, rendered browser/mobile checks, real-wallet testnet flows and mainnet proof were not checked this turn. Prior deployment findings are historical, not a new observation of the live app.
- `bun run build` was not rerun in this focused validation; Studio's reported build success is not independently reconfirmed here.

Next: Studio should finish the outstanding receipt/context/review/fee requirements in docs/STUDIO_FUNCTIONAL_FIX.md and deliver the requested report. Do not redo the accepted shared-predicate work. Preserve D2-D8 and current artwork. Hosting/wallet/mainnet/submission gates remain separate.
