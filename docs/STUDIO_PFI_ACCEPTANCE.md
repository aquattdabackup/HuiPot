# Independent acceptance review — PFI1/PFI2 at 53c8190

Reviewed October 28, 2026 (Asia/Ho_Chi_Minh).

- Input/parent: `0f8d4e4e12d2052c44cade277719e012b8e07e13`.
- Studio output and remote main verified before documentation delivery: `53c8190ed2a5dde8e7eb1ed953e15fffa19271f7`.
- Verdict: **PFI1 and PFI2 accepted within local source/integration/synthetic-page scope. No remaining functional blocker found in these two fixes.** Reporting discrepancies below do not block proceeding to human-operated public testnet acceptance.

## Findings and reporting accuracy

### P3 — publicFlow test count is still incorrect in the Studio report

At the reviewed commit, `docs/STUDIO_FUNCTIONAL_FIX_REPORT.md:92`, `:106`, `:127-128` and `AGENTS.md:17` claim 57 tests. The actual file has **53**, confirmed by source and Vitest: PFI1 4 + PFI2 8 + PF1-A/B/C/D 18 + acceptance matrix 10 + source-structure group 8 + PF2 5. The group counts sum to 53, not 57. Other files retain 112 tests, giving **112 + 53 = 165**, net +14 from 151.

The 53 cases comprise 40 production-classifier calls including smoke, one ABI-metadata assertion, and 12 raw-source assertions. Of the four PFI1 tests, two execute real viem readContract with deterministic transport; one checks ABI presence and one supplies a plain Error. The PFI2 tests supply individual state fixtures, not an asynchronous QueryObserver lifecycle. Independent transition probes below provide the missing real-query transition evidence for this review.

### Probe description is partly corrected, with minor wording issues

The report correctly acknowledges that root `pf1-probe-adapted.cjs` adds default fetchStatus='fetching' as well as module injection. The independently adapted original changes only module loading and passes 29/29. Neither probe script nor any baseline expectation was modified by this Studio commit.

The root script's existing header still inaccurately describes a runtime patch/read of the original and says module injection is its only change. The report's explanation that the extra default passes because it matches the supplied default is not a useful causal account: the absent-pool fixtures also contain the recognized InvalidPoolId marker, which establishes absence before the count check. Thus green 29-case probes alone cannot validate a completed-count guard. The eight additional probes and the new transition checks provide that evidence.

The test comment at `publicFlow.test.ts:110` says the selector is encoded from the Foundry artifact, but that test actually takes the entry from HUIPOT_ABI. This does not invalidate the fix: the independent additional probe uses the built contract artifact and verifies the same real viem decoding path.

## PFI1 verification

- `src/contract.ts:15-19` adds exactly the existing contract's `InvalidPoolId()` error metadata (zero inputs). No Solidity, address, function/event ABI signature, or money-rule change.
- The independent probe encodes the error from the generated Foundry artifact, passes the bytes to installed viem readContract using actual HUIPOT_ABI, and receives a decoded ContractFunctionRevertedError with errorName=InvalidPoolId.
- The production classifier and both production page functions return not-found when count is unavailable. All formerly failing ABI-path assertions pass.
- Studio's real-viem unknown-selector control remains network; the plain transport-error and unrelated named-revert controls remain retryable. No arbitrary message-substring classification added.

## PFI2 verification

- `src/lib/poolQueryState.ts:142-145` accepts count only when data exists, the query is not errored, and countFetchStatus is exactly idle. Fetching/paused count cannot establish absence.
- Successful pool data still wins first, preserving PF1-A. The guard does not reject every isStale result, which is appropriate for staleTime=0.
- Both pages already forward the real count fetchStatus; no page wiring changes were needed.
- Eight prior additional assertions now pass unchanged. Actual QueryObserver transition checks add **18/18** page-level assertions: cached-zero refetch with pending/error pool; successful count completion; content preserved during further refetch and retained-cache error; retryable error without pool; a separate completed-zero fixture establishes absence; successful pool overrides lower count. These execute unchanged production page functions with synthetic React/wagmi hooks, not mounted DOM.

## PF1/PF2 preservation

| Area | Result |
| --- | --- |
| PF1-A | Loaded pool overrides old/refetching/failed count; passed |
| PF1-B | Failed cached zero and in-flight cached zero do not establish absence; completed idle lower count can; passed |
| PF1-C | Actual ABI/viem InvalidPoolId decoding and retryable unknown/transport controls; passed |
| PF1-D | Pending/paused/invalid IDs, Retry refetching pool and count, recovery; passed in existing production-page probes |
| PF2 | Five unchanged synthetic handler/control cases pass; Create source unchanged |

Pool.tsx, Proof.tsx, Create.tsx, contract Solidity/tests, receipt validation, action lifecycle, proof verdict module, hosting configuration and historical evidence scripts are unchanged from input. Previously accepted suites still pass. Route placeholder behavior and mounted wallet/DOM boundaries were not newly exercised.

## Independent commands and results

Validation used a Git archive of the exact Studio output at `.review/recheck-53c8190/snapshot`, with the unchanged locked dependency installation. A 45-file normalized source/config/contract manifest matches the checkout. Full logs and probe results are published in `docs/evidence/recheck-53c8190/`.

| Command | Exit | Pass / fail / skip or result |
| --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 / 0 / 0 |
| `bun run test` | 0 | 165 / 0 / 0, 5 files |
| `bun run check` | 0 | oxlint 0 warnings/0 errors; tsc 0 errors |
| `bun run build` | 0 | Success; existing large-chunk warning |
| `node docs/evidence/recheck-41c68bd/independent-original-probes.cjs .review/recheck-53c8190/snapshot .review/recheck-53c8190/original-results.json` | 0 | 29 / 0 / 0 |
| `node docs/evidence/recheck-41c68bd/additional-probes.cjs .review/recheck-53c8190/snapshot .review/recheck-53c8190/additional-results.json` | 0 | 8 / 0 / 0 |
| `node .review/recheck-53c8190/transition-probes.cjs` | 0 | 18 / 0 / 0 |

The first four commands ran inside the archive; probe commands ran from repository root. Exact names/expected/actual results in the two supplied probe runs match Studio's committed JSON. Transition probes are separate independent evidence and are not added to the 165 Studio tests.

Initial environment attempt: dependency-junction creation was denied, so Forge exited 1 before any tests because OpenZeppelin imports were unavailable. After creating the junction with authorized filesystem access, the unchanged source completed all checks above. Both the initial failure log and successful-run logs are retained; this was an environment setup failure, not a failing contract assertion.

## Remaining open items and next step

Proceed to public testnet acceptance instead of another application-code iteration solely for reporting typos. Confirm the deployed revision, then human-operated create -> partial contribution -> complete funding -> payout -> Proof, plus underfunded expiry -> refund. Record actual receipts and relevant explorer evidence. These two PFI issues are not a reason to redeploy the contract.

Not run here: mounted browser/ConnectKit/keyboard boundaries, live wallet or RPC flows, live transaction replacement, mobile WalletConnect, cross-session evidence, measured fees, deployed revision/configuration verification, mainnet proof, video, or submission. No signing, hosting change or deployment performed. Competition eligibility and required mainnet/video evidence remain separate gates; automated acceptance is not submission completion.
