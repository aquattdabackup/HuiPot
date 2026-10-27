# PF1 / PF2 independent review

Date: October 28, 2026 (Asia/Ho_Chi_Minh).

- Previous input: f445be94091c576220febc7bc73d245143c1ce10.
- Studio source fix: a7a681f6025e1ca432cf7ea6f57e82f5574d60f3.
- Pulled and independently checked remote HEAD: 67ac7ea445fcaaa2a7c9cb41ea3ab8c7acc2946f.
- a7a681f to 67ac7ea changes only AGENTS.md. Validation at HEAD therefore exercises the same application/test source as the requested fix.
- Original review output: findings and local evidence only. On the subsequent user request, this report and evidence were published to the existing repository. No application source modification, deployment, hosting change or wallet transaction. Studio follow-up: [STUDIO_PF1_FOLLOWUP.md](STUDIO_PF1_FOLLOWUP.md).

## Verdict

PF1 is not accepted: source contradicts the stated stale-count non-override guarantee, and query failures/pending states can still be misclassified. PF2 is accepted at the inspected source and synthetic production-handler boundary; mounted browser/wallet acceptance remains open. All standard suites pass but the 13 new tests do not meet the requested production-path behavioral coverage.

## Findings

### P2 — Successfully loaded pools are hidden by stale count

Pool.tsx:730-735,814 and Proof.tsx:324-325,416 derive absence solely from ID > count. Neither guards against a successfully loaded pool. Fixture: ID=1, successful getPool(1) with valid terms, successful old poolCount=0. Both actual page functions render not found. This is a plausible independent-query race immediately after creation or when reading cached count; it hides valid pool actions/evidence. Proof has no periodic count refetch, so this is not guaranteed to self-correct. AGENTS.md's delivery summary claims the opposite.

### P2 — Cached count after failure and pending reads are treated as absence

Pool.tsx:720-735 and Proof.tsx:315-325 discard the count query's status/error metadata. data !== undefined does not establish a currently successful count read: TanStack Query retains data after refetch errors. Fixture: count data=0 with isError=true, getPool transport failure -> both pages render not found, suppressing the retryable network error.

Separately, Pool.tsx:734 and Proof.tsx:416 equate !pool && !isLoading && !isError with a successful empty read. A paused pending query has exactly these flags. The installed query-core queryObserver.ts defines isLoading = isPending && isFetching, and isPaused separately. Both page functions render not found for a pending/paused initial read with no absence evidence.

The final !pool fallback at Pool.tsx:824 and Proof.tsx:425 is logically unreachable for these booleans: loading already returns; if an error exists, either the network branch or count-absence branch returns; with no data/loading/error, the not-found branch returns. Thus it does not handle the claimed waiting state. The observed defect is false absence, not a reproduced infinite loader.

### P2 — New tests do not exercise production classification

publicFlow.test.ts has 12 source-text/regex checks and one locally defined classify function at lines 60-91. The classifier is a second implementation, never imports/invokes the page classification, and omits pool data/loading and query-status inputs. It even differs from production's no-data/no-loading/no-error not-found fallback. No test exercises a successful pool plus stale count, real query status transitions, retry recovery, or actual connected/disconnected form handler behavior. All 13 passing is insufficient for PF1 acceptance.

### Remaining discrepancy — InvalidPoolId is not decoded

The source does not inspect getPool.error in either page. An InvalidPoolId revert with unavailable count becomes a generic network error. The new AGENTS summary says absence is recognized from count OR InvalidPoolId; only count-based inference is implemented. Independent probes supply an InvalidPoolId error marker to the hook result; it is ignored exactly as any other error object would be. This is synthetic input, not a captured live wagmi error envelope.

## Confirmations that pass

- Both pages show retryable network error for pool read error with no count evidence. poolRpcError/poolError alone no longer selects not found.
- Both Retry callbacks actually invoke refetchPool and refetchPoolCount. After replacing the synthetic query result with successful reads, both render content.
- Both reject malformed, zero and overflowing IDs in the inspected paths; enabled guards prevent invalid-pool queries.
- Create uses ConnectKitButton.Custom and a real type=button element with onClick=show. Bare ConnectKitButton no longer appears inside the form.
- handleSubmit calls preventDefault, returns immediately when disconnected, then calls validate for connected submissions. Wrong-chain guard remains before write.
- Production callback probes: connect callback opens once without validation/write; disconnected submit does not validate/write; valid connected submit validates and writes once; invalid connected submit returns six errors and no write; wrong chain switches once and does not write.

## Exact validation results

Commands ran in an exact git-archive snapshot of HEAD using the already installed tool binaries/dependencies. package.json and bun.lock matched the previously validated installation. [manifest.json](evidence/recheck-67ac7ea/manifest.json) verifies 42 tracked source/config files against HEAD, including unchanged source after testing. No product test expectations were changed.

| Command | Exit | Result |
| --- | --- | --- |
| forge test --summary --fuzz-seed 1 | 0 | 120 passed, 0 failed, 0 skipped; 14 suites; 112.03 seconds |
| bun run test | 0 | 125 passed, 0 failed, 0 skipped; 5 files; Vitest duration 9.03 seconds; process 13.25 seconds |
| bun run check | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors; 25.36 seconds |
| bun run build | 0 | build succeeded; existing large-chunk warning; 47.78 seconds |
| node .review/recheck-67ac7ea/public-flow-probes.cjs .review/recheck-67ac7ea/snapshot .review/recheck-67ac7ea/public-flow-results.json | 1 | 21 passed, 8 failed, 29 independent review cases |

The eight probe failures are four conditions on each of Pool/Proof: successful pool with stale count; failed count retaining cached zero plus transport error; pending/paused no-data read; InvalidPoolId without count. These are separate from the 125 Studio tests. All five independent Create handler/control cases pass.

The review instrument transpiles unchanged page files and executes their exported functions and returned callbacks with controlled hook results. It does not implement a second pool classifier. It is not a mounted React renderer, DOM event propagation test, live wallet or chain test. Nested transaction ActionPanel is not executed by these read-state probes. See [review instrument](evidence/recheck-67ac7ea/public-flow-probes.cjs) and [results](evidence/recheck-67ac7ea/public-flow-results.json).

The prior run was not started because automatic approval review exhausted usage; after the user's continuation the same authorized runner executed successfully. That prior tool failure is not a failed Forge/Vitest run.

## Open checks

Mounted DOM behavior and actual ConnectKit wallet chooser, keyboard Enter/browser propagation, signed create/contribute/payout/refund, chain/account switching, live replacement, Proof against real receipts, mobile wallets, fee measurement, cross-session evidence, deployed SHA and hosting configuration were not tested in this review. Prior independent receipt/lifecycle probe suites were not rerun; their existing Studio regression tests are included in the 125 passing tests. No hosting or wallet action was performed.
