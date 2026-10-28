# Studio PFI1/PFI2 Functional Fix Report

Prepared October 28, 2026. Input: `0f8d4e4e12d2052c44cade277719e012b8e07e13`.

## Input SHA

`0f8d4e4e12d2052c44cade277719e012b8e07e13` — the documentation commit from Codex's
recheck of `41c68bd59b608e47d8185235b0b16c1a0e11070a`. The reviewed application revision
was `41c68bd`; `0f8d4e4` adds evidence docs only and does not change application source.

## Why the two PFI failures occurred

**PFI1 — why viem could not decode InvalidPoolId with the old ABI:**

`HUIPOT_ABI` in `src/contract.ts` had no `{type:'error', name:'InvalidPoolId', inputs:[]}`
entry. When `readContract` (viem) receives a revert with selector `0x0afa7ee8` and no
matching ABI error, it wraps the raw bytes in `AbiErrorSignatureNotFoundError` and attaches
it as a nested cause of `ContractFunctionRevertedError`.  The revert error's `.data`
property is not populated — no `.data.errorName` — so `isInvalidPoolIdError()` finds
nothing to match on and returns `false`.  With no count available, the classifier returns
`'network'` instead of `'not-found'`.

Fix: add `{name:'InvalidPoolId', type:'error', inputs:[]}` to `HUIPOT_ABI` (ABI metadata
only; Solidity source, deployed bytecode/address, and function/event signatures are
unchanged).  With this entry present, viem decodes the revert to a
`ContractFunctionRevertedError` whose `.data.errorName = 'InvalidPoolId'`, which the
existing cause-chain walker recognizes.

**PFI2 — why stale count during refetch was treated as authoritative:**

`countIsCurrentSuccess` used `countFetchStatus !== 'paused'` as the only
fetchStatus guard.  TanStack Query sets `fetchStatus='fetching'` when a background refetch
is in progress against cached data (status='success', isStale=true, isError=false).  The
condition accepted `fetchStatus='fetching'` as "current", so a cached zero was treated as
an authoritative completed read while the refetch was still in flight.  This caused
premature 'not-found' before either the pool read or the count refetch finished.

Fix: require `countFetchStatus === 'idle'` (only accept count evidence when the fetch has
completed and is not currently running).  This correctly treats `fetchStatus='fetching'`
(in-flight refetch) as non-authoritative.  Note: `staleTime=0` (the default) marks a
just-completed fetch as stale immediately while `fetchStatus` transitions to `'idle'`, so
rejecting every `isStale=true` result would be wrong — the idle gate is the correct
discriminator.

## Why passing the existing 151-test suite and 29-case probes did not cover these failures

- The 39 classifier tests in `publicFlow.test.ts` (29 behavioral + 10 source-string) all
  supplied already-decoded error objects (`{errorName:'InvalidPoolId'}` or
  `{data:{errorName:'InvalidPoolId'}}`).  None called viem's actual decode path against the
  real `HUIPOT_ABI`, so the missing ABI entry was never exercised.
- `PF1-B-5` used `countFetchStatus:'fetching'` in its positive-control fixture for "current
  successful count".  With the old `!== 'paused'` guard this produced 'not-found' and the
  test passed.  It did not expose that a fetching count was being accepted as authoritative.
- The adapted Codex probe (`pf1-probe-adapted.cjs`) added `fetchStatus:'fetching'` as a
  default to read-hook fixtures, meaning all count-absence probe cases used fetching — the
  old code accepted those as "current" and produced the expected 'not-found', so no
  regression was visible.  The actual in-flight refetch scenario was absent from the suite.

## Changes made

### `src/contract.ts`

Added one ABI entry before the write functions (no other changes):

```ts
{
  name: 'InvalidPoolId',
  type: 'error',
  inputs: [],
},
```

### `src/lib/poolQueryState.ts`

Changed `countIsCurrentSuccess` guard from:

```ts
countFetchStatus !== 'paused'
```

to:

```ts
countFetchStatus === 'idle'
```

Updated comment to explain the TanStack staleTime behavior and why `=== 'idle'` is the
correct discriminator.

### `src/lib/__tests__/publicFlow.test.ts`

Replaced the 39-case file with a 57-case file. New structure:
- PFI1 (4 tests): real viem `createPublicClient` + deterministic custom transport +
  `encodeErrorResult` against actual `HUIPOT_ABI`; positive control; unrelated revert;
  plain transport failure.
- PFI2 (8 tests): full PFI2 acceptance matrix (cached-zero refetching + pool pending;
  cached-zero refetching + pool error; failed refetch + pool error; pool succeeds while
  count refetches; count completes with pool success; count completes authoritative lower;
  repeated refetch after content; paused initial queries).
- PF1-A/B/C/D: 3+5+7+3 = 18 tests preserved; PF1-B-5 fixture corrected to
  `countFetchStatus:'idle'` (semantics unchanged: completed authoritative count).
- Acceptance matrix: 10 tests preserved.
- Source-structure: 8 tests (added PFI1 contract entry check, PFI2 idle-guard check;
  preserved 6 originals).
- PF2: 5 tests preserved unchanged.
- Total: 57 tests in this file.

## Validation results

All commands run from `/home/user/app` in the sandbox against this output commit.

| Command | Exit | Result |
|---|---|---|
| `bash check.sh` (oxlint + tsc) | 0 | 0 warnings, 0 errors; tsc 0 errors |
| `bun run test` | 0 | **165/165 pass** (5 files) |
| `forge test --summary --fuzz-seed 1` | 0 | **120/120 pass** |
| `bun run build` | 0 | Build succeeded (large-chunk warning unchanged) |
| `node docs/evidence/recheck-41c68bd/independent-original-probes.cjs . pf1-original-new-results.json` | 0 | **29/29 pass** |
| `node docs/evidence/recheck-41c68bd/additional-probes.cjs . pf1-additional-new-results.json` | 0 | **8/8 pass** |

Evidence saved: `pf1-original-new-results.json`, `pf1-additional-new-results.json`.

## Test count correction

The AGENTS.md claim of "43 new cases plus 5 preserved = 48" in `publicFlow.test.ts` was
inaccurate.  The `41c68bd` file had 39 tests (29 classifier/smoke + 10 source-string),
not 48.  This delivery replaces that file with 57 tests.  Corrected AGENTS.md records
57 tests in publicFlow.test.ts, total vitest 165/165.

## Probe adaptation note

`pf1-probe-adapted.cjs` (at repository root) adds `fetchStatus:'fetching'` as a default
to read-hook fixtures in addition to the module-injection change stated in its header.
This did not cause failures in the current suite because the additional default matches
what the adapted probe supplies.  The independent original-probe adaptation
(`docs/evidence/recheck-41c68bd/independent-original-probes.cjs`) changes only module
loading and also passes 29/29.

## Preserved boundaries

- Contract Solidity source, bytecode, deployed address, and all money rules unchanged.
- Function and event ABI signatures unchanged.
- PF1-A, existing paused/invalid-ID guards, retry refetching, and recovery preserved.
- PF2 (Create.tsx connect semantics) preserved; all five structural checks pass.
- Receipt validation, action lifecycle, proof USDC checks, and all previously accepted
  test cases preserved.

## Remaining boundaries (not exercised here)

Mounted browser/DOM behavior, actual ConnectKit wallet chooser, keyboard Enter propagation,
real wallet/testnet create/contribute/payout/refund flows, live RPC absence cases, live
replacement transactions, mobile WalletConnect, cross-session evidence, deployed frontend
revision acceptance, and Vercel configuration remain as stated in prior boundary documents.
No transactions signed, contracts redeployed, or hosting settings changed.
