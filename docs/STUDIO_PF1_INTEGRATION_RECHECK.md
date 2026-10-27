# Independent PF1 follow-up review

Reviewed October 28, 2026. Verdict: **PF1 is not fully accepted. Two P2 gaps remain.** The standard suites and original 29 probes pass; additional production integration probes reproduce both gaps.

## Revision and method

- Input/parent: `4bdbe60a8f0189c6f753d383dd2d3000708ac973`.
- Studio output, local HEAD and GitHub main when checked: `41c68bd59b608e47d8185235b0b16c1a0e11070a`.
- Pulled with fast-forward only. Reviewed AGENTS.md, the complete PF1 follow-up acceptance document, classifier/tests, page diff and probe adaptation.
- Ran validation in a Git archive of the exact output commit under `.review/recheck-41c68bd/snapshot`, using the existing matching dependency installation. Manifest verifies 45 tracked source/config/contract files against the checkout (normalizing CRLF only). No application source changed. Tracked working tree remains clean.
- The GitHub main check confirms repository revision, not the revision deployed to Vercel.

## Findings

### P2 — PF1-C cannot decode InvalidPoolId with the actual frontend ABI

Location: `src/lib/poolQueryState.ts:41-61`, called at line 129; `src/contract.ts:11` defines the frontend ABI without an `InvalidPoolId` error entry.

The new detector recognizes `.data.errorName` or synthetic `.errorName` only. With the actual installed viem `readContract`, actual HUIPOT_ABI and a deterministic transport returning the contract's `InvalidPoolId()` revert bytes `0x0afa7ee8`, the error chain is `ContractFunctionExecutionError -> ContractFunctionRevertedError -> AbiErrorSignatureNotFoundError`. The reverted error has `raw`/`signature`, but no decoded `.data.errorName`.

When count is unavailable, the production classifier and both production page functions return **network**, not **not-found**. A probe-only positive control that adds the error entry from the built contract artifact to the ABI produces the expected not-found. Production ABI/source was not edited. This is a local integration reproduction, not a live RPC observation.

The PF1-C tests manually supply an already-decoded error name, so their realistic-looking nesting does not exercise ABI decoding. Studio should handle the known raw revert through a narrowly validated path, or explicitly coordinate the minimal frontend ABI addition with the handoff's ABI-preservation constraint; no contract change or redeployment is needed. Add coverage using real viem error generation with the actual application ABI, including unknown-revert controls.

### P2 — PF1-B still treats stale count during refetch as current absence evidence

Location: `src/lib/poolQueryState.ts:135-149`.

The condition `countData !== undefined && !countIsError && countFetchStatus !== 'paused'` accepts cached zero while a count refetch is in progress. Its not-found branch runs before the getPool loading branch. This can happen after a pool is created and the user opens its page while an older count remains cached.

Reproduced with the installed TanStack `QueryClient`/`QueryObserver`: count has `status=success`, `data=0`, `isStale=true`, `isError=false`, `fetchStatus=fetching`; requested pool has `status=pending`, `isLoading=true`, `fetchStatus=fetching`. Both production pages render **not-found**, although the reads needed to establish current existence are unfinished. A classifier case with a pool transport failure and the same refetching count also incorrectly returns not-found instead of a retryable error.

The loaded-pool priority is fixed: once pool data arrives, content wins. The remaining defect is premature absence before that result. Studio should distinguish unfinished/stale count evidence from an authoritative completed read, retaining waiting/error recovery until current evidence is available. Do not simply reject every TanStack `isStale` result: default staleTime can make a just-completed successful read stale immediately. Test the actual transition from cached zero through in-flight refetch to the completed result.

## Acceptance matrix assessment

| Requirement | Result |
| --- | --- |
| PF1-A: loaded pool beats old count and failed cached count | Pass in production classifier and synthetic page execution. Queries are keyed by ID; no previous-ID placeholder configuration found. Mounted route-transition evidence remains open. |
| PF1-B: failed refetch retaining zero cannot establish absence | Pass for the specified failed-refetch fixture. In-flight stale-count case above remains open. |
| PF1-C: InvalidPoolId without count | Hand-constructed decoded errors pass. Actual frontend ABI/viem integration fails as described above. Other tested transport/unknown errors remain retryable. |
| PF1-D: waiting, retry, recovery and invalid IDs | Original pending/paused, Retry/refetch, recovery and invalid-ID probes pass on both pages. Explicit loading/network/not-found branches replace the old unreachable loader. Remaining `if (!pool) return null` is a defensive guard after the total classifier, not a normal loading path. |
| PF2 preservation | Create.tsx is unchanged relative to input. All five production-handler probes pass: connect type/callback, disconnected submit, valid connected submit, invalid submit, wrong-chain switch. No real wallet invoked. |

## Probe adaptation and coverage

- Studio adaptation compiles the real production classifier and injects it for `../lib/poolQueryState`; no second classifier was introduced.
- The original 29 case names and expectations match exactly. Both Studio's adapted script and an independently adapted original script pass 29/29.
- The Studio script also adds default `fetchStatus: 'fetching'` to read-hook fixtures. Its header's claim that only module injection changed is therefore imprecise. An independent adaptation that changes only module loading still passes all 29, so this additional default did not conceal the old failures in this revision.
- The root adapted script is a copied instrument, not a runtime patch of the original file as part of its header suggests. Its default output `/tmp/pf1-probe-adapted-results.json` is environment-specific; this review supplied an explicit output path on Windows.
- `publicFlow.test.ts` has **39 tests**, not the AGENTS.md claim of 43 new cases plus 5 preserved. Breakdown: A 3, B 5, C 7, D 3, matrix 10, source-structure group 6, PF2 5. Of these, 29 invoke the production classifier (including one smoke test), and 10 are raw-source assertions. The total suite is 112 other tests + 39 = 151; net increase from 125 is 26.
- The duplicated test-only classifier is removed. Source assertions alone do not prove page integration, but independent synthetic page probes complement them. They still do not mount React/DOM or ConnectKit.
- Additional probes: **1 pass / 7 fail** across 8 assertions, representing the two findings above across classifier/page layers, plus the ABI positive control. These are separate from the unchanged Studio suite; they are not seven independent defects.

## Commands and results

Working directory for the first four commands: `.review/recheck-41c68bd/snapshot`. The runner resolves installed local Windows Forge and Bun executables and puts their directories on PATH.

| Exact logical command | Exit | Result |
| --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 pass, 0 fail, 0 skip |
| `bun run test` | 0 | 151 pass, 0 fail, 0 skip; 5 files |
| `bun run check` | 0 | oxlint 0 warnings/0 errors; tsc 0 errors |
| `bun run build` | 0 | Build succeeded; large-chunk warning remains |

Probe commands below ran from the repository root. Each script targets the exact archived source; output paths are explicit to avoid the Studio script's platform-specific default.

```text
node pf1-probe-adapted.cjs .review/recheck-41c68bd/snapshot .review/recheck-41c68bd/studio-probes.json
  exit 0; 29 pass / 0 fail
node .review/recheck-41c68bd/prepare-independent.cjs
  exit 0; generates an import-only adaptation and reusable page harness
node .review/recheck-41c68bd/independent-original-probes.cjs .review/recheck-41c68bd/snapshot .review/recheck-41c68bd/independent-results.json
  exit 0; 29 pass / 0 fail
node .review/recheck-41c68bd/additional-probes.cjs
  exit 1; 1 pass / 7 fail; two reproducible residual defects
node .review/recheck-41c68bd/verify-evidence.cjs
  exit 0; source identity, test count and 29 unchanged expectations verified
```

Published evidence in `docs/evidence/recheck-41c68bd`: `runs.json`, `forge.log`, `vitest.log`, `check.log`, `build.log`, `studio-probes.json`, `independent-results.json`, `additional-results.json`, `manifest.json`; portable reproduction scripts are retained alongside them. Original local execution paths above are historical; use README.md in the evidence directory to rerun from another checkout.

## Open boundaries and next action

Ask Studio for a focused follow-up on the two findings and the inaccurate test/adaptation summary, retaining all accepted behavior. Re-run targeted integration probes and standard checks after that delivery. This review does not authorize replacing Studio-authored application code.

Not run: mounted browser/DOM wallet chooser and Enter-key behavior, real wallet/testnet create/contribute/payout/refund flows, live RPC absence cases, live replacement transactions, mobile WalletConnect, cross-session evidence, or deployed frontend revision/configuration verification. No transactions signed, contracts redeployed, or hosting settings changed. Passing these local checks is not full public-demo or submission acceptance.


## Delivery status

This review and the focused handoff `STUDIO_PF1_INTEGRATION_FIX.md` were prepared for repository delivery on user request. No new Studio job has been started or observed. Studio must execute the handoff in the existing project. The review describes application commit 41c68bd, not the subsequent documentation commit.
