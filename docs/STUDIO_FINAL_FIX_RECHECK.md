# Independent final-fix review — 5989686

Date: October 30, 2026 (Asia/Ho_Chi_Minh).

**Verdict: CWR4 and CWR5 accepted; CWR6 partially accepted.** Clean Windows install, suites, check and build pass. Ordinary confirmed-revert classification works with state-preserving production execution. Replacement identity and asynchronous invalidation remain incomplete, and the delivered revert tests do not assert their claimed outcome. No application or maintained test source changed in this review.

## Actual commits and environment

- Pulled/reviewed main: `5989686343724078521ff42b5dbf7ff9acb09907`.
- Actual parent: `ad09b9786ae52dac42ea9484da9b148f1d43c26e`.
- Reported input `ad09b97e683e3d60fd7ee19f81db3edf8e7d49e3` is not the actual parent. The shared short prefix concealed this discrepancy. STUDIO_FINAL_FIX_REPORT.md still leaves output SHA TBD; AGENTS.md does not supply the full output SHA either.
- Read AGENTS.md, STUDIO_FINAL_FIX_PASS.md, STUDIO_CWR_ACCEPTANCE_RECHECK.md, Studio's report, source diff, current Create control paths, test runner, four delivered probes and preceding real-query probes.
- Clean Git archive at `.review/recheck-5989686/clean snapshot` (Windows path deliberately includes a space), no pre-existing node_modules. `bun install --frozen-lockfile` succeeded, installing 590 packages. Bun 1.3.14; @types/node 26.6.6; wagmi 2.19.5 / core 2.22.1, viem 2.57.10, TanStack query 5.104.5.
- All 45 tracked source/contract/configuration files in the review manifest match the checkout after CRLF normalization, including package.json and bun.lock. Logs, results and independent instruments are in `docs/evidence/recheck-5989686/`.

## Remaining findings

### FFR1 — P2: reverted replacement is still looked up by the original hash

Create.tsx:43–54 does not register an onReplaced callback. The new effect at lines 73–83 fetches `{ hash }`, where hash is the original useWriteContract result. If A is repriced/replaced by B and B reverts, the real wagmi action receives B's reverted receipt and throws without returning receipt data. The follow-up fetch then queries A, which has no mined receipt. The page stays unknown and links A instead of classifying B's confirmed revert.

Independent production execution through the actual wagmi query/action reproduced this with a controlled replacement receipt: isError=true, no replacement callback registered, independent lookup only A, no reverted heading, explorer only A. This is not a live wallet scenario; it verifies the application/library boundary requested by CWR6. The old successful-receipt mined-hash path still passes.

Required: capture replacement identity for the active submission before the watcher rejection discards receipt data; bind follow-up reads and the reverted explorer link to that submission's mined transaction. Preserve the immutable snapshot and read-only recovery. Test original-A/mine-B revert, ordinary-A revert, and successful matching B.

### FFR2 — P2: independent receipt effect has no invalidation or context-bound result

Create.tsx:72–83 stores a single boolean and returns no effect cleanup. Pending promises always call setRevertedOnChain. The new spec explicitly required rejecting stale work after context replacement/unmount. A controlled hash-transition probe starts A's read, moves the component to B, then resolves A: the page incorrectly displays a reverted heading with B's link. Cleanup probing also observes a state-setter call after unmount.

This hash-transition probe is a synthetic component-boundary test, not proof that the ordinary form permits a second post-hash submission. That handler remains protected. React may ignore an update after unmount; no fund-loss claim is made. Nevertheless the requested cancellation/context invariant is absent and is particularly needed when implementing replacement tracking.

Required: bind verification state to hash/submission identity, invalidate prior requests on dependency change/unmount, and suppress stale success and rejection handlers. Do not carry a previous true verdict into a new identity while its read is unresolved. Add delayed resolution/rejection and cleanup coverage.

### FFR3 — P2: CWR6 tests pass without exercising the asserted UI transition

createSafety.test.ts:387 ignores every state setter except errors at index 7. The new revertedOnChain state at index 8 is never stored. The test at lines 601–619 titled as showing a reverted heading/hash merely checks its injected isError flag and publicClientReceipt fixture. It never asserts the heading/link or even a receipt-call argument. The unknown case also cannot prove that the effect changed state. runEffects invokes a void-returning effect and does not itself await its receipt promise.

The delivered runtime-probes.cjs has the same non-persistent state mock. Its second assertion checks isError, an error message and the supplied fixture's status; it does not check the rendered outcome or correct hash despite its name. Thus 4/4 does not validate the new revert UI. An independent state-preserving runner does verify ordinary revert and unknown controls, but also exposes FFR1/FFR2 (4 pass / 3 fail).

Required: make the maintained runner persist state and model effect cleanup/settlement, assert actual rendered heading/link and absence of false success, and assert chain/hash read identity. The tests should fail if the effect never sets a verdict or always sets the wrong verdict. Use the actual wagmi rejection semantics with these assertions, not fixture self-checks.

### FFR4 — coverage/reporting corrections

- `expanded-adapted.cjs` is not merely the old 13-case script with one optional diagnostic replaced. It now has 10 assertions: real query completion and real errored-query retry cases were removed, real offline QueryObserver execution was replaced by a manually supplied paused object, and the independent-pending diagnostic was dropped while the pre-existing finite-timeout assertion remains. Importing onlineManager without using it does not exercise an offline query. Restore actual-query coverage; the independent preserved version passes 13/13 after replacing only the optional diagnostic with a one-write/bounded-wait assertion.
- All four documented `node ... .` commands omit their mandatory output-file argument. The documented production command independently exits 1 with ERR_INVALID_ARG_TYPE before execution. With explicit source and output paths, results reproduce as 23/23, 3/3, 10/10 and 4/4. The production/recovery scripts also still exit 0 on assertion failures; counts must be inspected or exit handling corrected.
- Correct createSafety count is **46**, not 47. The CWR block now has **17**, not the report's 16. Net suite change is +1: 210 to 211. Revert fixture checks must not be described as end-to-end behavioral verification.
- cancelRefetch's qualification now correctly explains deduplication without cached data. Its leading sentence still unconditionally says it ensures a new request; remove that ambiguity. Timeout is per attempt; query retries may delay the final banner.
- Correct the full parent SHA and output SHA in the report. Do not leave the older AGENTS paragraph saying this delivery is still pending without marking it historical.

## Accepted and preserved

- CWR4: @types/node is declared and locked; clean installation and both checks/build pass without ambient types or excluding tests.
- CWR5: all three runner reads use fileURLToPath; Date.now is frozen to fixture-day 08:00 and restored after each test, with local noon deadline four hours ahead. The suite ran successfully on Windows in a path containing a space on October 30, after the former uncontrolled deadline. Linux was not independently run in this review.
- Ordinary CWR6: both receipt APIs are pinned to TARGET_CHAIN_ID; actual reverted receipt makes the distinct heading/link render with stateful execution. Read rejection stays unknown/locked. A successful direct read does not become a reverted verdict or bypass full event matching.
- Prior CS1/CS2/CSF/PF2 production assertions pass 23/23; recovery assertions pass 3/3. Full snapshot, all event-field comparisons, no-context rejection, zero-recipient validation, original snapshot after account/form edits, successful/unmatched mined links, disconnected guard and Custom/type=button remain.
- Paused lock, handler duplicate prevention, finite wait, one-write read-only retry, actual query success/error settlement and offline state remain accepted. Preserved real-query instrument passes 13/13. Actual viem timer takes 30,022 ms; subsequent retry succeeds with two reads and one write.
- Pool/Proof/action lifecycle and contract source are unchanged. The previously observed human pool 7 payout/Proof and pool 8 refund/Proof evidence remains valid for those earlier demonstrations, not a new deployed-revision certification.

## Exact validation

Suite directory: `C:/Users/luong/HuiPot/.review/recheck-5989686/clean snapshot`, local Bun/Forge binaries on PATH.

| Command | Exit | Result |
| --- | ---: | --- |
| `bun install --frozen-lockfile` | 0 | 590 packages installed from committed lock |
| `forge test --summary --fuzz-seed 1` | 0 | 120 passed / 0 failed / 0 skipped |
| `bun run test` | 0 | 211 passed / 0 failed / 0 skipped; 6 files |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run build` | 0 | Build succeeded; existing chunk-size warnings |

Initial restricted Bun invocations exited 1 before loading the project (CouldntReadCurrentDirectory); reran the unchanged snapshot with the needed process access. This was an execution restriction, not a source failure. Forge passed despite a nonfatal denied signature-cache flush outside the workspace.

Probe commands from repo root, with `SRC` = the quoted snapshot path above and `OUT` = `.review/recheck-5989686`:

| Command | Exit | Pass / fail |
| --- | ---: | ---: |
| `node docs/evidence/final-fix/production-adapted.cjs SRC OUT/production-adapted-results.json` | 0 | 23 / 0 |
| `node docs/evidence/final-fix/recovery-adapted.cjs SRC OUT/recovery-adapted-results.json` | 0 | 3 / 0 |
| `node docs/evidence/final-fix/expanded-adapted.cjs SRC OUT/expanded-adapted-results.json` | 0 | 10 / 0 (coverage limits above) |
| `node docs/evidence/final-fix/runtime-probes.cjs SRC OUT/runtime-probes-results.json` | 0 | 4 / 0 (revert assertion limit above) |
| `node OUT/effect-review.cjs SRC OUT/effect-results.json` | 1 | 4 / 3 |
| `node OUT/preserved-query-review.cjs SRC OUT/preserved-query-results.json` | 0 | 13 / 0 |

The last two scripts are saved under this review's evidence directory for reruns. They are independent review instruments executing unchanged production source, not Studio-authored maintained application tests.

## Focused next action and boundaries

Studio should implement FFR1/FFR2, repair the maintained tests in FFR3, restore the real-query coverage and correct reporting in FFR4. Keep CWR4/CWR5 and the accepted flows unchanged. No redesign, contract change, deployment or fresh wallet transaction is required. Deliver actual source/test changes, reproducible scripts, exact counts and full commits, then request independent recheck.

Not run: mounted browser/keyboard, live wallet/replacement, public deployment SHA/configuration, mobile, cross-session or Linux. No hosting/deployment/signing or support message. No MetaMask clearance, audit, mainnet or submission acceptance claim.
