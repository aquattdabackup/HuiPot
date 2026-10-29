# Create confirmation recovery: observed public spinner

Date: October 29, 2026 (Asia/Ho_Chi_Minh). Input HEAD: `9182db2f6e7fcdf9f0d913494175bc8a1296f68f`; application source `a526ce6a551651f059988539e2fe9fbe20a366bc`.

## Observed incident and scope

The user submitted transaction `0xa1cfc4e3f0e3547a9a965eb9d83e785cd2a1767036b914c339ac4dd2c617c08b`. Arc Testnet receipt was independently read with status 0x1, expected HuiPot target, native value zero and a matching PoolCreated event for pool #3: title `test`, purpose `a`, target 1 USDC, deadline October 29 at 14:25 Vietnam time. The user subsequently supplied a screenshot showing the original Create form still on **Confirming…**.

This establishes a discrepancy between the mined transaction and the observed UI. The browser's actual query hash, timing, network requests and query state were not captured, so the exact trigger is **unknown**. Do not claim a universal RPC outage, MetaMask causality, wrong hash or library defect without evidence.

Read-only live check using the installed wagmi core waitForTransactionReceipt, chain 5042002 and this exact hash returned success in 339 ms. A 15-second timeout was supplied for that diagnostic call. No transaction was broadcast. Public HTML currently references `/assets/index-BylnSpvN.js`, SHA-256 `f6f8a126aaf8d342be5e26163b2dfc4f3b982bfed3e6b0f77a3a6f1d2baf5bac`; inspected excerpts contain canonical appUrl, zero-address guard, full snapshot/guard and minedHash logic. This is evidence of the repaired code markers in the fetched bundle, not proof of the exact asset loaded in the user's existing tab or a full deployment SHA attestation.

## Confirmed recovery gaps

1. Create destructures only isLoading, isSuccess and data from useWaitForTransactionReceipt. It does not surface receipt-query errors or refetch/recovery. The displayed isError/error belong to useWriteContract, a different stage.
2. While receipt loading persists, the user sees only a disabled Confirming button, without a transaction link or read-only recovery control.
3. The installed wagmi core action defaults timeout to 0. Create supplies no timeout, so this flow has no application-level upper bound or delayed-confirmation recovery state. A single successful RPC diagnostic does not reproduce the original delay.
4. A controlled receipt-query error with isLoading false is invisible and re-enables the create submit button. This can encourage another submission when the original transaction's on-chain outcome is still unknown.

Independent unchanged-production component probes: 1 pass / 2 fail. Pending state has no recovery/link; receipt RPC error is not surfaced and does not keep the unresolved submission protected; a valid matching receipt still succeeds. These probes use controlled hooks, not a mounted DOM/network reproduction. Prior 23/23 CSF acceptance remains valid for its cases; it did not cover receipt waiting/error recovery.

## Studio implementation request

Pull current main and record its full SHA. Read AGENTS.md, this document, STUDIO_CREATE_SAFETY_ACCEPTANCE.md, Create.tsx and evidence/create-confirming. Make a focused Studio-authored fix; do not change contracts, money rules, hosting or wallet protections.

### CW1: expose transaction status while waiting

- Once a write hash exists, show its Arc explorer link and an honest pending/confirmation-check status independently of the form submit button. Keep the captured submission context and expected chain.
- Provide a bounded wait or delayed-confirmation state with a **Check transaction status / Retry confirmation check** action. A timeout is not proof that the transaction failed or that no pool exists.
- Retry must only read/check the existing hash. It must never call writeContract, request a signature or create another pool. Continue to support proper replacement handling and use the mined hash once available.

### CW2: handle receipt-query failures distinctly

- Surface read/transport/timeout failures from the receipt watcher, separately from wallet rejection/write errors and a confirmed reverted transaction.
- While an existing submission's outcome is unknown, do not silently present a ready-to-resubmit Create action. Preserve the hash and snapshot for recovery.
- A successful retry must run the accepted full snapshot/event validation before showing success. Preserve CSF1's fail-closed missing-context behavior, CSF2's mined evidence links, CSF3's fixed Arc chain, and CS1/PF2 guards. Status 0x1 alone is not enough to confirm this intended pool.
- Distinguish pending/not-yet-indexed, confirmed valid, confirmed unmatched/replaced/cancelled, confirmed reverted and temporarily unavailable states accurately. Do not display “no pool created” merely because a read timed out.
- Reload/navigation must not automatically resubmit. Do not introduce secrets or signing data into any persisted state. Cross-session restoration, if implemented, must validate the recovered context and remain explicitly covered by tests.

### Required tests and delivery

Execute the real production path/shared production functions; do not copy acceptance predicates into fixture-only tests. Cover:

1. Hash present + receipt pending: explorer link visible, create not duplicated.
2. Prolonged pending: finite recovery state/action, no false failure claim.
3. Receipt RPC error/timeout: visible error and retry, no second write.
4. Retry after transient error with a valid receipt: original snapshot validated, correct pool link, original write count remains one.
5. Retry with null/unindexed receipt: stays pending/unknown, never reports success.
6. Revert/unmatched event: accurate outcome; no intended-pool success.
7. All existing 23 production probes remain accepted or receive a documented instrumentation adaptation if hook composition changes. Preserve their assertions and positive controls.

Run bun run test, bun run check, bun run build and the independent production probe. Report exact counts/exits and source/input/output SHAs. Commit/push source/tests and a concise report. Explain which browser/network scenario was actually reproduced and which remains unknown. Do not claim MetaMask classification clearance. Do not sign, deploy or change hosting as part of this task.

## User recovery for this incident

Pool #3 exists. The user can view `/pools/3` in a separate tab without creating another pool. That is a navigation workaround, not a fix for the confirmation UI. The screenshot does not establish the app's post-reload behavior or completion of contribution/payout/refund flows.
