# FFR1–FFR4 independent recheck — fc83aa6

Date: October 30, 2026, Asia/Ho_Chi_Minh.

**Verdict: substantial improvement, partial acceptance.** All reported suites and six probe counts reproduce. Previously failing in-flight resolution/unmount/replacement scenarios pass. The requirement not to reuse an already-settled verdict across identity changes is still incomplete, and replacement identity updates are not reactive. Two maintained lifecycle tests still do not exercise the races named in their titles. No application or maintained test source was edited by Codex.

## Revisions and execution scope

- Actual input/parent: `c21016ead0f3d6765af709b28a81e11d2b517287`.
- Pulled and reviewed output/main: `fc83aa60750c92a41acee00931b2d6baa7ca4ff4`.
- These match the current user-supplied input/output. The follow-up report's historical claim about `ad09b97e683e3d60fd7ee19f81db3edf8e7d49e3` remains incorrect: 5989686's actual parent is `ad09b9786ae52dac42ea9484da9b148f1d43c26e`.
- Read the previous FFR specification/recheck, AGENTS changes, full follow-up report, source/test changes and restored query probe.
- Exact Git archive at `.review/recheck-fc83aa6/source snapshot`, Windows path containing a space. The 45-file source/config manifest matches the reviewed checkout after CRLF normalization. package.json, bun.lock and tsconfig are unchanged since 5989686; dependencies reused through a junction from that revision's independently verified clean frozen-lock install. No new clean install is claimed for this review.
- Bun 1.3.14; same locked wagmi 2.19.5 / core 2.22.1, viem 2.57.10, TanStack 5.104.5. No live RPC, browser or wallet used.

## Remaining functional findings

### FV1 — P2: a settled revert verdict survives a new lookup identity

Create.tsx:84–103 clears the verdict only when `!isReceiptError || !hash || !publicClient`. When the guard stays true and hash changes, the effect changes revertLookupHash and starts another read without resetting the old true verdict. The render at lines 319–322 does not require the verdict's verified identity to match the current submission.

Independent state-preserving execution first confirms A reverted, then switches to B while B's receipt remains unresolved. The first B render still shows A's verdict/link; after the effect, it shows **Transaction reverted** with B's link even though B has not been verified. Two assertions fail for the same underlying issue.

This is a synthetic component identity-transition test against an explicit FFR2 acceptance requirement. It does not show that the guarded form permits a second post-hash wallet write, or that funds were lost. The old in-flight-read cancellation test now passes; cancelling outstanding work alone does not invalidate an already-settled verdict.

Required: store/derive verdict together with its verified submission/hash, and render it only if that identity matches the active lookup. An effect-only reset is insufficient for the first render after a changed identity. Keep unknown/locked presentation until matching evidence is available. Add settled-A → pending-B, success-B and failure-B cases.

### FV2 — P2: replacement callback changes only a ref, not a lookup dependency

Create.tsx:55–58 updates replacedHashRef.current. The effect dependency list at line 103 contains only isReceiptError, original hash and publicClient. A callback arriving while these values stay unchanged neither schedules a render nor causes the effect to rerun on a later render. Thus a previously failed A lookup can remain unknown even after the replacement B identity is available.

Independent callback-boundary execution establishes error=true for A, resolves its independent lookup as unavailable, invokes the actual registered onReplaced callback for B, and rerenders with unchanged error/hash/client. Only A was requested; no B verification occurs. This controlled test models an unchanged-error/batched-observation boundary, not a live browser scheduling claim. The ordinary callback-before-first-error path passes 7/7 in the original review instrument.

Required: make the active lookup identity reactive, bind replacement updates to the active submission, and include that identity in verification scheduling/invalidation. Test the callback itself while the error flag is unchanged, rather than assigning refs[1] directly. Preserve the successful callback-before-error path and stale-read cleanup.

## Test and reporting gaps

### FV3 — complete maintained lifecycle coverage

- The new state-preserving useState and dependency-aware effect slots are real improvements. runEffects invokes cleanups and drains eight microtasks. The updated ordinary CWR6 test now asserts the rendered heading/link and one write; unknown-path assertions also work.
- createSafety.test.ts:698's test named stale effect resolution awaits the first read to completion, then toggles isError=false. It tests guard clearing, not a delayed resolution or a hash change.
- The unmount case at line 726 awaits the immediately rejected read before unmounting. There is no outstanding promise at unmount, so lateSets=0 does not test late completion. Use deferred resolve/reject after cleanup.
- FFR1's maintained test directly assigns refs[1]; it validates rendering from the ref but not callback wiring. Independent effect-review does exercise the actual callback through wagmi, so this is a maintained-test gap rather than absence of all evidence.
- The maintained mock returns a new publicClient object on every render, causing the dependency-aware effect to rerun even when real logical inputs are unchanged. Use a stable client for unchanged-dependency tests and spy on the requested hash/chain.
- Independent delayed rejection and unmount-rejection controls now pass. Keep those plus the previous delayed-resolution controls in maintained tests.

### FV4 — finish reporting/exit-code corrections

- Restored expanded-adapted.cjs now really contains 13 cases, actual QueryObserver completion/error retry/offline transitions, onlineManager use and settle polling. This part of FFR4 is accepted.
- The report claims the unconditional cancelRefetch sentence was removed, but Create.tsx:61 still says it ensures a new receipt request. Its qualification is correct; remove the contradictory lead sentence.
- Current follow-up output SHA is still TBD, and AGENTS does not contain the full current output SHA. The historical ad09b97 SHA claim is still wrong. Correct these without rewriting earlier raw evidence.
- production-adapted.cjs/recovery-adapted.cjs still exit 0 on failed assertions, acknowledged but not repaired. Make failure exits reliable; do not treat zero exit alone as acceptance.
- runtime-probes.cjs's second assertion is still the older injected-fixture check, not rendered revert UI verification. Its timer/retry checks remain useful; correct that assertion or its description. The stronger independent effect-review supplies real stateful coverage separately.
- The report attributes MetaMask classification to named providers and excludes app-code causation without new provider evidence. State only that classification remains unresolved; this review establishes neither its cause nor clearance.

## Accepted changes and preserved behavior

- FFR1 ordinary A and callback-before-error replacement B now render the correct reverted heading and corresponding link. submittedRef remains refs[0], replacedHashRef refs[1]; existing snapshot probes pass. Successful receipt mined-hash behavior remains unchanged.
- FFR2 returned cleanup cancels both promise resolution and rejection setters. Guard-miss clears both states inside the effect. Note this is synchronous within an effect callback, not a synchronous render-time identity guard. Outstanding result after dependency cleanup/unmount is rejected by independent probes.
- FFR3 ordinary revert test is no longer a fixture-only assertion. State updates persist, effects compare dependencies and clean up; remaining test gaps are listed above.
- CWR4/CWR5 preserved: declared Node types/lock unchanged, fileURLToPath reads retained, fixture clock frozen/restored. Windows full suite and build pass in a path with spaces.
- CS/CSF/PF2, full event/snapshot validation, zero-recipient guard, post-hash duplicate protection, paused lock, bounded waiter, read-only retry, successful/unmatched mined links remain accepted by the preserved suites/probes.
- Contract, Pool and Proof source remain unchanged. Earlier pool 7 payout/Proof and pool 8 refund/Proof user demonstrations remain accepted in their recorded scope, not as proof of this revision's public deployment.

## Exact commands and results

Suite cwd: `C:/Users/luong/HuiPot/.review/recheck-fc83aa6/source snapshot`, local Bun/Forge on PATH.

| Command | Exit | Result |
| --- | ---: | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 pass / 0 fail / 0 skip |
| `bun run test` | 0 | 214 pass / 0 fail / 0 skip, 6 files; createSafety 49 |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run build` | 0 | Succeeded; existing chunk-size warning |

Forge's denied signature-cache flush outside the workspace is nonfatal and did not fail tests. No repeated full-suite runs were needed.

Probe commands from repo root: `SRC` is the quoted cwd above; `OUT=.review/recheck-fc83aa6`.

| Command | Exit | Pass / fail |
| --- | ---: | ---: |
| `node docs/evidence/recheck-5989686/effect-review.cjs SRC OUT/effect-review-results.json` | 0 | 7 / 0 |
| `node docs/evidence/recheck-5989686/preserved-query-review.cjs SRC OUT/preserved-query-review-results.json` | 0 | 13 / 0 |
| `node docs/evidence/final-fix/production-adapted.cjs SRC OUT/production-adapted-results.json` | 0 | 23 / 0 |
| `node docs/evidence/final-fix/recovery-adapted.cjs SRC OUT/recovery-adapted-results.json` | 0 | 3 / 0 |
| `node docs/evidence/final-fix/expanded-adapted.cjs SRC OUT/expanded-adapted-results.json` | 0 | 13 / 0 |
| `node docs/evidence/final-fix/runtime-probes.cjs SRC OUT/runtime-probes-results.json` | 0 | 4 / 0 (assertion limitation above) |
| `node OUT/transition-review.cjs SRC OUT/transition-results.json` | 1 | 3 / 3 |

The transition instrument and results are saved in `docs/evidence/recheck-fc83aa6/`. It executes unchanged Create with controlled state/effects, not duplicated application logic. Three failing assertions map to two functional findings; three controls pass. These are review instruments, not Studio-authored maintained tests.

## Next delivery / open boundaries

Studio: address FV1/FV2 with identity-bound reactive verification, finish FV3 deferred/callback tests and FV4 accurate reporting. Preserve all accepted fixes. Rerun the suites and original probes plus transition-review; commit exact evidence and full SHAs. No redesign, new contract, hosting action or wallet transaction is required. This follow-up is prepared, not executed by Codex.

Not run: mounted DOM/keyboard, live wallet/replacement, mobile/WalletConnect, cross-session, public deployed SHA/configuration or Linux. No deployment, signature, support message, mainnet transaction or MetaMask clearance claim.
