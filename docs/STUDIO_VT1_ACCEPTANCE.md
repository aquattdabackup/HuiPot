# VT1 independent acceptance — b8f59c9

Date: October 30, 2026, Asia/Ho_Chi_Minh. Target application chain remains ARC-TESTNET (5042002).

**Verdict: VT1 accepted and closed.** No remaining actionable implementation or regression-test finding was identified within this requested follow-up. Previous FV1/FV2 functional acceptance is preserved. This is scoped review acceptance, not a security audit, mainnet readiness, MetaMask clearance or submission acceptance.

## Revisions and scope

- Actual input/parent: `14645aa6191faeef30508a1c74f3f46d8578428f`.
- Pulled/reviewed output: `b8f59c937da64df9e1bf90e7d1333b921eea03c3`.
- Git confirms only `src/lib/__tests__/createSafety.test.ts` and `docs/STUDIO_VERDICT_IDENTITY_FIX_REPORT.md` changed in the delivery. Application, contracts, configuration, dependencies and all seven earlier acceptance probe scripts are unchanged.
- Exact Windows Git archive in `.review/recheck-b8f59c9/source snapshot`; 45-file source/configuration manifest matches the checkout after CRLF normalization. Dependencies reused from the earlier verified clean locked installation, with unchanged package.json/bun.lock. No new clean install claimed.
- Codex changed review documentation/evidence only. No deployment, hosting change, RPC transaction or signature.

## Requested checks

### (a) Eight microtask drains cover the current chain

The maintained test now rejects the outstanding receipt promise after unmount, drains eight microtasks, and only then checks lateSets. For this controlled native-Promise `.then(...).catch(...)` chain, eight rounds are sufficient: there are no timers, extra network awaits or unbounded promise stages in the fixture. This is not a general claim that eight rounds settle arbitrary asynchronous code.

The independent instrument used the exact maintained runner and updated eight-round sequence. It also removed only the catch cancellation guard from the transpiled application **in memory**, without modifying any source file:

| Variant | lateSets at real assertion | After further settlement | After triggerLateSet |
| --- | ---: | ---: | ---: |
| Current production | 0 | 0 | 1 |
| Virtual missing catch guard | 2 | 2 | 3 |

The real implementation passes. The virtual regression now fails the real `lateSets === 0` assertion, unlike the preceding one-round version. VT1's timing defect is closed.

### (b) Inline negative control is sound within its scope

triggerLateSet is called after unmount and after the real assertion. It simulates a setter without the cancelled guard and increments lateSets once; asserting 1 is correct. Test reset clears the counter between cases.

Precisely, this helper recreates the mock setter's bookkeeping; it is not a captured production setter or a real React setState invocation. It validates the runner's late-set detection, not the complete async wiring by itself. The independent virtual missing-guard control above separately verifies that the actual asynchronous regression is detected. Together with the production assertion, this satisfies the requested negative-control objective without shipping a production mutation.

### (c) Report accuracy

The updated report correctly states that verifiedForHash is cleared before fetch, assigned the lookup hash on resolution, and cleared on rejection. It correctly distinguishes the two Studio sessions, net suite count 214→216/createSafety 51, unchanged application/probes, skip rationale and unverified public deployment/configuration. No MetaMask provider or clearance assertion is made.

Two minor wording qualifications do not block acceptance: “never written before fetch completes” should be understood as “never assigned a non-null verified hash” (null resets occur earlier); the VT1 output field points to Git rather than containing a full SHA. The actual full output is recorded above. Also, triggerLateSet duplicates the mock setter logic rather than calling the same captured closure; its scope is described accurately in this independent review.

## Exact validation

Suite cwd: `C:/Users/luong/HuiPot/.review/recheck-b8f59c9/source snapshot`, local Bun 1.3.14 on PATH.

| Command | Exit | Result |
| --- | ---: | --- |
| `bun run test` | 0 | 216 passed / 0 failed / 0 skipped; 6 files; createSafety 51 |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run build` | 0 | Succeeded; existing chunk-size warning |
| `node .review/recheck-b8f59c9/unmount-assertion-review.cjs SRC OUT/unmount-assertion-results.json` | 0 | Real guard passes; virtual missing guard correctly fails the maintained assertion; inline control increments once |

For the last command, SRC is the quoted snapshot path above and OUT is `.review/recheck-b8f59c9`. Script, results, logs and source manifest are saved in `docs/evidence/recheck-b8f59c9/`.

Not rerun: Forge and seven acceptance probe sets, because their source, application code, contracts and dependencies are unchanged. Previous independent evidence at d6d5c8e remains 120/120 Forge and 69/69 probe assertions; these are prior results, not newly executed results. No browser/keyboard, live wallet/replacement, mobile/WalletConnect, cross-session, public deployment SHA/configuration or mainnet check was performed.

## Handoff

No further Arc repair prompt is needed for VT1. Close this Create recovery/identity repair cycle at the reviewed source/test scope. Next work is deployed-revision confirmation and submission/video preparation, subject to existing project gates. Preserve earlier pool 7 payout/Proof and pool 8 refund/Proof evidence without presenting it as fresh execution of this revision or as mainnet proof.
