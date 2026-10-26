# Independent receipt and action-flow recheck: 9d75573

Reviewed October 26, 2026 (Asia/Ho_Chi_Minh). Pulled main using fast-forward only before review. GitHub main and clean local input HEAD both resolved to `9d755735f35a59d8874d453f31fa30b57a0340fd`. Read AGENTS.md, docs/STUDIO_FUNCTIONAL_FIX_REPORT.md, the entire Pool.tsx and verifyTx.test.ts before validation. Application, contract and test source were not modified; no wallet signatures, hosting changes or force push.

## Requested confirmations

- **Live chain check: confirmed.** Pool passes useAccount().chainId as currentChainId. confirmAction compares currentChainId !== TARGET_CHAIN_ID and cancels. A synthetic invocation of the unchanged handler with a wrong live chain makes zero wallet-write requests.
- **Receipt validator and outcomes: present.** validateReceipt calls eth_getTransactionReceipt and returns confirmed/replaced/error. runReceiptValidation handles all three; onSuccess is called only in its confirmed branch, and ReceiptBanner has corresponding UI branches. This source fact does not establish complete replacement/revert lifecycle correctness; gaps below remain.
- **Import timeout fixed in this run.** All 46 Vitest tests pass on the first actual Vitest attempt. Six of the seven R3 checks use raw Pool/Landing source imports; the seventh directly checks the imported shared predicate. No runtime Pool/wagmi import remains in that group. They inspect source structure, not actual action lifecycle behavior.
- **Full review addresses: present.** Contract and destination are rendered without truncation. No checksum normalization was added, so the report's stronger 'checksummed' assertion is not established.

## Exact validation results

| Command | Exit | Passed / failed / skipped | Evidence |
| --- | --- | --- | --- |
| `forge test --summary --fuzz-seed 1` initial | 1 | No tests ran | Dependency junction creation was denied; OpenZeppelin import missing |
| `forge test --summary --fuzz-seed 1` retry | 0 | 120 / 0 / 0; 14 suites | Existing dependency link restored outside sandbox; no package/source changes |
| `bun run test` | 0 | 46 / 0 / 0; 2 files | First attempt; Vitest duration 10.92s, test execution 130ms; no import timeout |
| `bash /home/user/arc-studio-helpers/check.sh` | 127 | Not run | Linux Studio helper does not exist on this Windows machine |
| `bun run check` fallback | 0 | oxlint 0 errors/warnings; tsc 0 errors | Explicit repository fallback, not a claim that Studio helper passed |
| Independent receipt/action probes | 1 | 12 / 5 / 0; 17 cases | Unchanged production function/component with synthetic receipts/hooks |

Actual Vitest breakdown: **22 predicate tests + 7 structural tests + 17 parser tests = 46**. The Studio report's '29 predicate + 17 parser + 7 structural' double-counts the structural tests, and its later 48-test statement is incorrect. The measured duration here differs from Studio's 1.80s; no requirement for identical machine timings is implied.

Exact input archive and existing cached dependencies were used, with matching package.json/bun.lock and 37 source/config files checked against HEAD. All attempts and hashes are in [evidence/recheck-9d75573](evidence/recheck-9d75573/runs.json). Captured logs are UTF-8 with whitespace/line endings normalized; original captures remain in the ignored review folder.

## Event topics and deployed contract evidence

All three Pool.tsx constants equal keccak256 of their Solidity event signatures. The [Arc explorer contract endpoint](https://explorer.testnet.arc.io/api/v2/smart-contracts/0x81a139599d252eb2dc2bbb6c267e911a21264288) returned deployed runtime bytecode containing all three expected constants:

| Event | Verified topic |
| --- | --- |
| Contributed(uint256,address,uint256,uint256) | `0xdcfa71ee125a676f843733d9d39dce2c918ecf9e92f96db4f24bdb5244ed68a0` |
| PaidOut(uint256,address,address,uint256) | `0x648ae074e8c7e2b5c75fc82672c363a1b0fa293a1ce08cba5e9dbeec37eb8ae8` |
| Refunded(uint256,address,uint256) | `0x7ca5472b7ea78c2c0141c5a12ee6d170cf4ce8ed06be3d22c8252ddfc7a6a2c4` |

Explorer address data identifies a contract and the recorded creation transaction, but is_verified=false and has_logs=false; its logs endpoint returned an empty first page with no continuation. No actual emitted Contributed/PaidOut/Refunded log was observed. Local/deployed runtime are both 4,134 bytes; executable bytes match after removing Solidity metadata, while full runtime bytes differ. This is source/bytecode corroboration, not verified explorer ABI, observed transaction success or an audit. See [comparison](evidence/recheck-9d75573/deployed-topic-comparison.json). Direct Arc RPC requests returned HTTP 403 in this run; public explorer GET requests succeeded after sandbox DNS failures.

## Remaining findings

### RC1 — High: final contribution can disable payout

The payout button disables whenever receiptValidation.phase==='confirmed', without checking which action was confirmed. After the same wallet's final contribution changes the pool to FUNDED, its contribution-confirmed state persists and disables Review payout. An unchanged ActionPanel probe reproduces this: a fresh funded panel enables payout; the same funded panel with a confirmed contribution disables it. Scope success/pending state to action and transaction, and preserve the next legitimate action.

### RC2 — High: receipt identity checks remain incomplete

validateReceipt checks contribution pool/amount but never compares Contributed topics[2] to snap.accountAddress. A synthetic same-pool/same-amount contribution from a different wallet is accepted as confirmed. PaidOut checks recipient/amount but not its caller against the submitting snapshot; a different caller is likewise accepted. Refund correctly rejects a different contributor. Require matching action-specific submitting identity and transaction identity before confirming this user's submitted action. These fixtures expose acceptance boundaries; they do not demonstrate contract fund theft or authentic mismatched logs from a real transaction.

### RC3 — High: replacement/revert/retry lifecycle is only partly wired (source finding)

All receipt hooks discard receipt data/error and only retain isLoading/isSuccess. No onReplaced handler captures a replacement hash. Validation requests the original write hash, which may have no receipt after replacement; the 'replaced' branch for a different target alone does not solve replacement tracking. The installed wagmi waitForTransactionReceipt action throws on a reverted receipt, so the isSuccess-only effect never invokes this validator's revert branch in that path. Surface wait-hook errors/reverts and validate/link the actual mined hash. Also notifiedRef is marked before the RPC check, preventing a retry for the same hash after transient failure; add explicit retry and stale-result invalidation. These lifecycle gaps were identified from source, not a signed replacement transaction.

### RC4 — Medium/high: changed pool state still permits a stale confirmation

The live chain/account check is repaired, but confirmAction does not revalidate status, remaining capacity or refund claimable amount. An unchanged-handler probe with an old contribution review, current FUNDED status and remaining=0 still requests a contribution write. The UI claim that a changed pool state cancels confirmation is therefore inaccurate. Revalidate fresh eligibility and invalidate stale reviews before wallet submission.

### RC5 — Medium: HTTP failures can be accepted; gas explanation is inaccurate

validateReceipt does not check resp.ok or JSON-RPC errors explicitly. A synthetic HTTP 500 response with a receipt-shaped JSON body is accepted as confirmed. Require successful transport and valid RPC/result shape.

The new review still hard-codes 'typically <0.01 USDC' and says gas is 'Not estimable before signing'. This is not a measured estimate and incorrectly presents an implementation limitation as a protocol limitation: the [official viem estimateGas action](https://viem.sh/docs/actions/public/estimateGas) estimates a transaction without broadcasting it and supports a JSON-RPC account address. Implement appropriate estimation/simulation and principal-plus-fee checks, or truthfully say this app could not obtain an estimate and the wallet will provide one, without asserting estimation requires signing.

### RC6 — Evidence path and report accuracy

- ReceiptBanner only appears in ACTIVE/FUNDED/positive-claim REFUNDING branches. After payout becomes PAID or a refund clears the claim/status, the success-hash Proof link can disappear. Keep receipt access outside transient action eligibility states; verify those transitions behaviorally.
- Studio F02 quotes a different rewrite than the actual vercel.json (which excludes assets/art/etc. and targets /index.html). F07 claims VITE_APP_URL support, absent from share.ts; actual code uses a Studio-parent handshake or window origin plus BASE_URL. Correct the report to the delivered source.
- The 7 structural checks do not execute validateReceipt or component transitions; substring presence can pass despite RC1-RC5. Add meaningful production-path regression tests. Prior requirements for Create confirmation binding, broader RPC/read-state handling and other F01-F07 items are not automatically closed by this Pool rewrite.

## Reproduction and next Studio prompt

The [review instrument](evidence/recheck-9d75573/receipt-probes.cjs) is Codex investigation tooling, not Studio application/test code:

```text
node docs/evidence/recheck-9d75573/receipt-probes.cjs .review/recheck-9d75573/snapshot .review/recheck-9d75573/receipt-probes.json
```

```text
Read latest main of https://github.com/aquattdabackup/HuiPot and record its actual SHA. Read AGENTS.md, docs/STUDIO_RECEIPT_RECHECK.md and docs/STUDIO_FUNCTIONAL_FIX.md in full. Confirm access by explaining RC1 and the missing contribution actor check, then implement RC1-RC6 with production-path regressions.
Preserve the accepted shared Proof predicate, correct event topics, live-chain check, full addresses, existing artwork and D2-D8. Fix action-scoped success, event/transaction identity, actual replacement hashes, wait-hook errors, retries and stale async results, fresh pool-state validation, HTTP/RPC validation and truthful gas handling. Preserve confirmed-hash evidence across pool transitions. Correct the Studio report's test counts and source descriptions.
Run Forge seed 1, Vitest, lint/typecheck and build. Record exact exits/counts and retries; label browser and wallet checks honestly. Update docs/STUDIO_FUNCTIONAL_FIX_REPORT.md and commit/push through the existing integration, verifying remote SHA without force push. No setup/token repetition, wallet signing, hosting account changes, mainnet deployment or submission.
```

Not run: build in this turn, real browser/mobile/accessibility acceptance, signed testnet transactions (including replacements/cancellation), mainnet or submission. No live-site acceptance is inferred from local tests.
