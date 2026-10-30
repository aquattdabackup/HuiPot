# Verdict identity independent acceptance — d6d5c8e

Date: October 30, 2026, Asia/Ho_Chi_Minh. Target: ARC-TESTNET, chain 5042002.

**Conclusion: FV1/FV2 functional fixes accepted at production-source/controlled-library scope. FV4 code/probe corrections accepted. FV3 substantially improved, with one remaining maintained-test timing gap.** No new functional blocker was reproduced in this review. This is not an audit, live-wallet/browser certification, MetaMask clearance or submission acceptance.

## Revisions and environment

- Actual input/parent: `c7c74c9023ca63d9c3a571f03b964f93e3fb7143`.
- Pulled/reviewed output/main: `d6d5c8e62f3b593b3e4736f08065ffb69c4b51cd`.
- Both match the request. Read the previous FV1–FV4 findings, current Studio report, Create source changes, maintained runner/tests, runtime/exit-code probe changes and saved Studio evidence.
- Windows archive: `.review/recheck-d6d5c8e/source snapshot` (path contains a space). 45 source/contract/configuration files match the reviewed checkout after CRLF normalization.
- package.json, bun.lock and tsconfig are unchanged from the independently verified 5989686 clean frozen-lock install. This run reused those dependencies through a junction; it was not a new clean installation. Bun 1.3.14; locked wagmi 2.19.5/core 2.22.1, viem 2.57.10 and TanStack 5.104.5.
- Codex edited only review documentation/evidence. No application/maintained test changes, deployment, hosting, RPC transaction, wallet signature or support message.

## Acceptance matrix

| Finding | Verdict | Independent basis |
| --- | --- | --- |
| FV1 settled verdict identity | Accepted | verifiedForHash must equal both stored lookup and current replacedHash-or-hash. Old A verdict is hidden on first B render before effects, and remains hidden while B is unresolved. Transition probe now 6/6. |
| FV2 reactive replacement | Accepted | Registered callback updates state; replacedHash is an effect dependency. With error/hash/client unchanged, callback B triggers lookup B and renders B's confirmed link. |
| FV3 stateful/deferred/callback tests | Partial, test-only gap below | Stable client, deferred A/B reads, captured callback, actual heading/link assertions and first-render guard assertions are present. Independent late resolution/rejection/unmount controls pass. Maintained unmount-rejection assertion still settles too early. |
| FV4 comment/runtime/exits | Accepted in code/probes; minor report cleanup | cancelRefetch wording corrected; runtime runner persists state and checks actual reverted heading; production/recovery scripts set nonzero exit on failures. Current report corrects historical SHA and avoids provider/cause claims for MetaMask. |

Both receipt hooks remain pinned to TARGET_CHAIN_ID=5042002. Effect cleanup guards both promise resolution and rejection. It clears previous verification before a new async lookup; the render-time identity comparison, rather than effect timing, prevents first-render stale verdicts. Verified identity is set to the lookup hash only after successful receipt retrieval; read failure clears it to null.

All prior CS/CSF/PF2 protections, complete immutable snapshot/event matching, unknown/paused lock, one-write read-only recovery, successful/unmatched mined links and ordinary/replacement revert paths remain accepted by suites/probes. Node types, portable paths and frozen/restored clock preserve CWR4/CWR5 on Windows. Contract, Pool and Proof source are unchanged; earlier pool 7/8 human demonstrations retain their documented scope.

## Remaining maintained-test finding — VT1 (P2, regression coverage only)

`src/lib/__tests__/createSafety.test.ts:768–770` rejects a deferred promise after unmount, waits only one `await Promise.resolve()`, then checks lateSets. Production attaches `.then(...).catch(...)`: the rejection must pass through the first promise before the catch callback executes. The assertion can run before the catch handler.

Independent negative control uses the exact maintained runner and test sequence, modifying **only the transpiled source in memory** to remove the catch cancellation guard. No source file was changed:

| Variant | lateSets at maintained assertion | lateSets after full microtask settlement | Existing assertion |
| --- | ---: | ---: | --- |
| Real production guard | 0 | 0 | Pass |
| Virtual missing catch guard | 0 | 2 | Also passes incorrectly |

Therefore the maintained test cannot detect the regression it claims to cover. **The real implementation is correct for this case:** the independent delayed-rejection/unmount instrument fully settles and observes no late setters. This is not evidence of a current wallet/fund-loss defect.

Required narrow Studio follow-up: await the entire controlled catch settlement before asserting. Add a control proving the assertion detects an unguarded late setter (test/instrument only); keep application behavior unchanged. Retain genuine deferred reads, stable client, callback wiring and original assertions. Do not rewrite the accepted lifecycle implementation for this test-only issue.

## Minor report accuracy notes (non-blocking)

- Studio report still has output SHA TBD. This review records the actual output above; use the verified SHA in subsequent delivery metadata.
- FV1 prose says verifiedForHash is set before fetching. Source actually clears it to null first and records the lookup hash after resolution; the code excerpt is correct. Align the prose.
- The new output adds two net Vitest cases (214→216), not four net additions: callback/unmount cases were also revised. createSafety has 51 cases.
- The report's blanket claim that public Vercel rebuild requires an env-var action is not newly verified here. Public deployment/config status remains unverified for this revision; do not imply a previously completed configuration must be repeated.
- Tracked tsconfig.tsbuildinfo changed in Studio output. It is generated build metadata, not a functional fix; avoid using it as source acceptance evidence.

## Exact commands and results

Suite cwd: `C:/Users/luong/HuiPot/.review/recheck-d6d5c8e/source snapshot`, local Bun/Forge binaries on PATH.

| Command | Exit | Result |
| --- | ---: | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 passed / 0 failed / 0 skipped |
| `bun run test` | 0 | 216 passed / 0 failed / 0 skipped; 6 files; createSafety 51 |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run build` | 0 | Success; existing chunk-size warning |

Forge emits a nonfatal denied signature-cache flush outside the workspace. Test result remains exit 0. No repeated full-suite run was needed.

From repo root, `SRC` is the quoted snapshot path above and `OUT=.review/recheck-d6d5c8e`:

| Command | Exit | Pass / fail |
| --- | ---: | ---: |
| `node docs/evidence/recheck-5989686/effect-review.cjs SRC OUT/effect-review-results.json` | 0 | 7 / 0 |
| `node docs/evidence/recheck-5989686/preserved-query-review.cjs SRC OUT/preserved-query-review-results.json` | 0 | 13 / 0 |
| `node docs/evidence/final-fix/production-adapted.cjs SRC OUT/production-adapted-results.json` | 0 | 23 / 0 |
| `node docs/evidence/final-fix/recovery-adapted.cjs SRC OUT/recovery-adapted-results.json` | 0 | 3 / 0 |
| `node docs/evidence/final-fix/expanded-adapted.cjs SRC OUT/expanded-adapted-results.json` | 0 | 13 / 0 |
| `node docs/evidence/final-fix/runtime-probes.cjs SRC OUT/runtime-probes-results.json` | 0 | 4 / 0 |
| `node docs/evidence/recheck-fc83aa6/transition-review.cjs SRC OUT/transition-review-results.json` | 0 | 6 / 0 |
| `node OUT/unmount-assertion-review.cjs SRC OUT/unmount-assertion-results.json` | 0 | Two diagnostic variants; exposes VT1 as shown above |

All seven acceptance probe sets pass (69/69 assertions), reproducing Studio's counts. Review scripts/logs/results and source manifest are saved in `docs/evidence/recheck-d6d5c8e/`. The negative-control script is a review instrument, not maintained application code.

## Next step and remaining boundaries

Close functional FV1/FV2. Request only the small VT1 test correction and report cleanup from Studio; do not reopen accepted behavior or require new transactions for it. After that, shift to deployed-revision confirmation and submission/video evidence within the user's existing authorization, with separate approval for any spending or hosting change.

Not run in this review: mounted DOM/keyboard, live wallet/replacement, mobile/WalletConnect, cross-session, public deployment SHA/configuration, Linux, mainnet or competition submission. The previous testnet demos do not establish those broader checks. MetaMask classification remains unresolved, with no new cause or clearance evidence.
