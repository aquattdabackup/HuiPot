# Studio handoff — PF1 real ABI and count-refetch integration

Prepared October 28, 2026. This is an unexecuted handoff for the existing HuiPot Studio project. Do not create another project or repeat setup/authentication.

## Read and confirm content access

Pull current main of https://github.com/aquattdabackup/HuiPot without overwriting concurrent work. Record the actual full input SHA. Reviewed application revision: `41c68bd59b608e47d8185235b0b16c1a0e11070a`; its parent was `4bdbe60a8f0189c6f753d383dd2d3000708ac973`. Current main may include the documentation handoff after that application commit; do not reset to an older SHA.

Read in full:

1. AGENTS.md.
2. docs/STUDIO_PF1_FOLLOWUP.md and docs/STUDIO_PF1_INTEGRATION_RECHECK.md.
3. This handoff and docs/evidence/recheck-41c68bd/README.md.
4. src/contract.ts, src/lib/poolQueryState.ts, src/pages/Pool.tsx, src/pages/Proof.tsx and src/lib/__tests__/publicFlow.test.ts.
5. docs/evidence/recheck-41c68bd/additional-probes.cjs and additional-results.json.

Before implementing, state the actual input SHA, explain why actual viem cannot populate InvalidPoolId's decoded name with the current frontend ABI, and explain how a TanStack query can have status=success while still holding stale zero during refetch. Acknowledge that the 151-test suite and 29-case probe passing do not cover these two failures.

## PFI1 — recognize real contract absence through the production ABI path

The actual frontend HUIPOT_ABI has no InvalidPoolId custom error. Installed viem readContract given the known contract revert `0x0afa7ee8` produces ContractFunctionRevertedError with raw/signature and an AbiErrorSignatureNotFoundError cause, not `.data.errorName`. With count unavailable both pages currently show a network error for this contract absence.

Implement the smallest focused correction. A minimal frontend ABI declaration for the existing deployed `InvalidPoolId()` error is within this handoff's scope and supersedes only the earlier blanket instruction to preserve frontend ABI text. Preserve Solidity source, deployed bytecode/address, function/event signatures, transaction construction and money rules. Alternatively, use a narrowly validated raw-revert decoding path tied to the actual contract error. Do not identify absence through arbitrary message substrings, every revert, or an unrelated unverified error object.

Add Studio tests invoking real installed viem error construction or readContract with the actual application ABI and deterministic local transport. Do not satisfy coverage by manually supplying an already-decoded errorName only. Known InvalidPoolId without count must show not-found on both pages; unrelated revert, undecodable selector and transport failure must remain retryable unless separately authoritative count evidence establishes absence. Keep current-count absence and successfully loaded-pool priority.

## PFI2 — stale count during refetch is not authoritative absence

Reproduction uses the installed TanStack QueryClient/QueryObserver: preseed cached count=0, start a pending count refetch, and start the requested pool read. Count has status=success, isStale=true, isError=false, fetchStatus=fetching; pool has status=pending, isLoading=true. Current classifier wrongly renders not-found before either new read finishes. A pool transport error plus the same in-flight stale count also wrongly renders not-found.

Distinguish an unfinished cached-count refetch from an authoritative completed result. Expose only the query metadata necessary to make this distinction. Do not simply reject every isStale=true result: the default staleTime can make a freshly completed read stale immediately. Both pages must preserve waiting or retryable error until current evidence establishes absence, then recover correctly when reads finish.

Add production-path transition coverage with actual TanStack states (or tests derived from and verified against those states), covering:

| State / transition | Required outcome |
| --- | --- |
| Cached count=0 refetching; pool pending | Waiting, never premature not-found |
| Cached count=0 refetching; pool transport error | Retryable read error |
| Count refetch fails retaining zero; pool transport error | Retryable read error |
| Pool succeeds while count remains old/refetching/errored | Content |
| Count refetch completes with count including requested ID; pool succeeds | Content |
| Count refetch completes with authoritative lower count and no contradictory successful pool | Not found |
| Repeated polling/refetch after content loaded | Content remains visible |
| Pending/paused initial queries without authoritative evidence | Waiting |

## Preserve acceptance and evidence integrity

- Preserve PF1-A, existing waiting/invalid-ID guards, Retry refetching both pool and count, and recovery. Do not allow previous-ID placeholder data to establish current-ID existence.
- Preserve PF2: connection control type=button; clicking connect invokes show without submission/validation; disconnected submit returns early; valid connected submit validates/writes once; invalid submit cannot write; wrong-chain guard preserved.
- Preserve receipt/action lifecycle, proof USDC movement checks and all previously accepted test cases.
- Tests must call production modules or page/component paths. No duplicated classifier. Source-string assertions may complement behavioral evidence but cannot replace it.
- The original 29 cases/expectations remain unchanged. The additional eight assertions must also pass after fixes; adapt input wiring if necessary when metadata changes, explain all adaptations and do not weaken expectations. Keep committed baseline result files intact; save new run evidence separately.
- Correct reporting: reviewed publicFlow.test.ts has 39 cases (29 classifier/smoke, 10 source checks), not 43 new plus 5 preserved. Report actual final counts, not a predetermined total. The existing adapted script copies the original and adds a fetchStatus default as well as module injection; describe its behavior accurately.

## Validate and deliver

Run and report exact commands, exit codes, pass/fail/skip counts:

```text
forge test --summary --fuzz-seed 1
bun run test
bun run check
bun run build
node docs/evidence/recheck-41c68bd/independent-original-probes.cjs . pf1-original-new-results.json
node docs/evidence/recheck-41c68bd/additional-probes.cjs . pf1-additional-new-results.json
```

The additional probe requires the generated Foundry artifact, so run Forge first. Add the new transition/unknown-revert tests to Studio's test suite; green baseline probes alone are insufficient. If an environment cannot run a check, report that explicitly rather than inheriting a previous result.

Update docs/STUDIO_FUNCTIONAL_FIX_REPORT.md with PFI1/PFI2 evidence, actual test breakdown and all remaining boundaries. Update the current AGENTS.md checkpoint honestly. Commit and push focused Studio-authored source/tests/report via the existing GitHub workflow without force push; verify remote output SHA. Return full input/output SHAs, changed files, exact checks and saved evidence paths.

Do not redeploy contracts, change hosting, sign transactions, broaden product scope or begin mainnet/submission work. Mounted DOM/wallet, actual testnet flow and public deployed-revision acceptance remain separate unless explicitly performed with suitable authorization. Do not claim this prepared prompt or a successful local suite proves those boundaries.
