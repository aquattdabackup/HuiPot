# MetaMask warning: deeper source, deployment and calldata review

Reviewed October 29, 2026 (Asia/Ho_Chi_Minh). Pulled main before review: `589b8ec1d7e25693bd129df174de5e5facd433f3`; application source remains `53c8190ed2a5dde8e7eb1ed953e15fffa19271f7`. This is a focused investigation, not an audit or a determination that MetaMask's classification is incorrect. No wallet signature, broadcast, hosting change or application source edit was performed.

## Conclusion

The investigation found actual application issues, but has not established the cause of the **Malicious site** classification. The supplied calldata is a canonical createPool call, and succeeds in an RPC simulation using the expected contract and zero value. No approval, permit, transferFrom, arbitrary signing or alternate payment destination was found in the inspected application write paths. This does not prove the user's complete wallet request, runtime environment or all dependencies are safe.

## Exact user-supplied calldata

Decoded using installed viem and the compiled contract ABI, then re-encoded byte-for-byte: match, 292 bytes, selector `0x3afabdd5`.

| Field | Decoded value |
| --- | --- |
| Function | createPool(address,uint256,uint256,string,string) |
| Recipient | Matches the public wallet address shown in the user's form; omitted from this public report |
| Goal | 1000000000000000000 native units = 1 USDC |
| Deadline | 1793250000 = October 29, 2026 05:00 UTC / 12:00 Asia/Ho_Chi_Minh |
| Title | test |
| Purpose | 1 |

The title/purpose differ from the earlier **Demo — Refund** screenshot. This may be a different/pending request; the evidence does not establish an application input-substitution bug. Check the intended request before any later signing.

Calldata alone does not include `to`, `from`, `chainId` or native `value`. The complete MetaMask envelope has not been exported. Read-only simulation supplied the expected HuiPot address, the screenshot account and `value: 0x0`: `eth_call` returned `0x` (success), `eth_estimateGas` returned `0x2d9ce` (186830 gas units). This is not a measured USDC fee or a mined transaction.

## Deployed contract and payment paths

- Official configured RPC `https://rpc.testnet.arc.io` returned chain ID `0x4cef52` (5042002).
- Target runtime is 4134 bytes, keccak256 `0xf37dc66edae9c040ce487a64d6ac60e5f30da05f844ba77e4d4be7c96947e8b4`.
- Runtime matches the local compiled executable after removing each Solidity CBOR metadata trailer. Full byte equality is **false**; local runtime hash is `0x3cd32615ad423bff99ce09e0b50c4235069cd9ba3f8afe8897cbc1bedf7fa906`. Do not describe this as exact bytecode equality or explorer source verification.
- Reviewed complete HuiPotGoalPool.sol: createPool is nonpayable and records pool terms; contribute accepts only explicit native value; payout goes to the pool's fixed recipient; refund goes to the caller's recorded principal. No owner withdrawal, upgrade function, delegatecall or token allowance flow exists in this source. Payout/refund use ReentrancyGuard and update state before external calls. Recipient rejection can still prevent payout, as already disclosed by the application.
- Independent RPC controls: a valid representative create succeeds, a nonzero deposit to create reverts, zero recipient reverts with InvalidRecipient, expired deadline reverts with InvalidDeadline. These are simulations, not transaction executions.
- The historical deployment-labelled transaction has status 0x1 but receipt.contractAddress is null. Its receipt alone is not direct CREATE-address proof; no deployment-provenance conclusion is drawn from that field. Runtime was read directly at the configured target.

## Public frontend comparison

43 tracked source/config files match the existing reviewed build snapshot after CRLF normalization. Recursively fetched 93 same-origin JS/CSS assets referenced by the public entry/chunks. **92/93 match** local build content after replacing only generated eight-character JS/CSS filename hashes. The main entry matches under that rule.

One vendor chunk differs: public `index-CT6o0N0L.js`, local `index-DTtD7o2N.js`. Additional structural inspection localizes visible operation differences to a CommonJS helper around Function.prototype.apply (direct reference versus lazy cached wrapper and its usages), alongside minifier binding renames. An additional lexical-binding comparison is not equal. This is **not** a verified byte-identical full deployment and not evidence by itself of injected malicious code. Matching dependency/build provenance for this chunk remains open; do not suppress the discrepancy in reporting.

The fetched HTML contains one local module entry and a Google Fonts stylesheet. No extra script was observed in that response. These checks exclude dynamically constructed resource URLs, external responses, extension injection and the user's live browser runtime.

## Confirmed application defects

1. **Incorrect application URL metadata:** src/config.ts declares `https://studio.arc.io` rather than the HuiPot origin. Installed ConnectKit routes appUrl into the WalletConnect metadata branch, conditional on project ID and complete metadata. Its MetaMask connector is `injected({ target: 'metaMask' })` and does not receive appUrl. Therefore this correction should **not be presented as the demonstrated cause or fix of the injected MetaMask warning**. See STUDIO_WALLET_IDENTITY_FIX.md.
2. **Zero recipient reaches wallet boundary:** Create.validate accepts the all-zero address because it only checks shape and self-contract equality. A controlled execution of the unchanged production component produced one write request. The deployed contract rejects it. Fix the frontend validation; no drain was demonstrated.
3. **Incomplete create receipt binding:** a controlled receipt with matching creator/recipient but a 2-USDC target is rendered as “Pool created” for a 1-USDC form. Create compares creator/recipient but not target/deadline/title/purpose against a full immutable submission snapshot. This is a confirmation-integrity gap after a replacement/context change, not evidence that this specific unsigned request was malicious. See STUDIO_CREATE_SAFETY_FIX.md.

Focused production-component probes: **6 passed / 2 failed / 0 skipped**. They execute the real component with controlled hooks and receipt fixtures, not a duplicate validator. They do not mount the DOM or use a wallet. Script exits 0 after writing the report; pass/fail counts, not process exit, indicate acceptance. The two failures above must not be described as passed checks.

## Commands and evidence

- `git -c credential.helper= pull --ff-only origin main`: exit 0, already up to date (initial non-elevated attempt failed on FETCH_HEAD permissions, then succeeded with authorization).
- `node .review/metamask-alert/deep-inspect.cjs`: exit 0, read-only RPC evidence.
- `python .review/metamask-alert/asset-inspect.py`: exit 0, 93 assets fetched, 92 normalized matches.
- `node .review/metamask-alert/create-path-probes.cjs`: exit 0, 6 pass / 2 fail, standalone rerun recorded separately.
- Calldata decode and exact-calldata simulation: exit 0; raw wallet calldata retained only in ignored local review storage. Public evidence omits the wallet address.
- No full Forge/Vitest/check/build rerun this deep review: application source unchanged; prior independent checkpoint remains Forge 120/Vitest 165/check and build exit 0. Do not report those as new runs.
- No signed/browser-wallet flow, live replacement, malicious-classification clearance, mobile flow or full dependency audit was completed.

Evidence: docs/evidence/metamask-alert/deep/.

## Next actions

1. Studio fixes metadata and the two reproduced Create gaps, with real production-path regression tests. Preserve contracts and hosting configuration.
2. Complete the deployment vendor-chunk provenance check and capture the full unsigned transaction envelope if available, without re-requesting signatures.
3. Continue the already-authorized MetaMask manual-review request. The initial AI support response did not supply a detection reason or case reference. Do not label this a confirmed false positive.
4. Keep protection enabled and the flagged request unsigned. Reassess public-demo readiness only after evidence resolves the warning.

Official source: https://support.metamask.io/configure/wallet/security-alerts (read October 29). MetaMask describes multiple threat-data inputs and provides manual review for disputed classifications. This supports investigation rather than assuming either a guaranteed compromise or a harmless new-project warning.
