# PF1 follow-up — stale count, query state and real regression coverage

Prepared October 28, 2026 (Asia/Ho_Chi_Minh). Reviewed source fix: a7a681f6025e1ca432cf7ea6f57e82f5574d60f3. Reviewed main: 67ac7ea445fcaaa2a7c9cb41ea3ab8c7acc2946f; its additional change is AGENTS.md only. This handoff will be committed after that input. Pull current main and record the actual full input SHA; do not reset to an older revision.

## Read and confirm before implementing

Read AGENTS.md, STUDIO_PUBLIC_FLOW_FIX.md, STUDIO_PUBLIC_FLOW_RECHECK.md, this document, Pool.tsx, Proof.tsx and publicFlow.test.ts. Read the relevant Create.tsx paths to preserve PF2. State the actual input SHA, explain why successfully loaded pool data currently loses to stale count, and acknowledge that the 13 Studio tests comprise 12 source checks plus one duplicated classifier.

The latest AGENTS.md delivery summary contains claims contradicted by source. Treat the independent recheck as evidence: PF1 is not accepted; PF2 passed source and synthetic handler checks, with mounted DOM/wallet acceptance still open. Correct the summary when reporting the new implementation.

## Required focused correction

1. **PF1-A: successful pool data wins over stale count.** Both pages must render successfully loaded pool data for the requested ID even if a separately cached count is lower. Do not hide it or disable the page solely because ID > old count. Do not use a placeholder/previous-ID pool as evidence for the current ID.
2. **PF1-B: distinguish current success from retained cache.** Read the count query status as well as its data. A failed count refetch retaining zero is not current absence evidence. With a genuine getPool transport failure, show a retryable read error rather than not found. Preserve loading/paused states when no query establishes existence or absence; !isLoading && !isError does not mean successful empty data. The installed TanStack Query defines isLoading as isPending && isFetching, so paused initial reads may have both isLoading=false and isError=false.
3. **PF1-C: recognized contract absence versus transport failures.** Decode the installed viem/wagmi error chain to identify the contract's InvalidPoolId revert when count is unavailable. Inspect the actual installed error types/cause traversal; do not infer absence from arbitrary message substrings or from every revert. Unknown errors remain retryable errors. A current successful count can establish absence when no successful pool result contradicts it, but do not call a stale/failed cached count current evidence.
4. **PF1-D: reachable waiting/retry paths and behavioral coverage.** Replace the unreachable final !pool loader with explicit state handling, or remove it if made redundant by a total classifier. Retry must refresh relevant failed reads and recover to content after success. Preserve invalid-ID guards and keep disabled invalid queries from running.

Prefer a small shared production classifier used by both pages if appropriate. Tests must import that module or execute real page/component paths; no second classifier defined only in tests. Shared-function tests must be complemented by evidence that both pages use it correctly and Retry calls the required refetches. Do not satisfy source-string assertions by comments or keep an obsolete implementation solely for regex tests.

## Acceptance matrix

Exercise each relevant case on Pool and Proof, using production paths:

| Case | Required result |
| --- | --- |
| getPool succeeds for ID 1, count is old zero | Render pool/Proof content |
| getPool succeeds; count refetch fails retaining old zero | Successful pool is not classified absent |
| getPool transport error; count refetch fails retaining zero | Retryable read error |
| Initial query pending and paused, no data or absence evidence | Waiting/offline state; never not found |
| Current count=0 plus InvalidPoolId for ID 1 | Not found |
| Decoded InvalidPoolId in realistic viem/wagmi cause chain, count unavailable | Not found |
| Unrelated revert or transport failure, count unavailable | Retryable error, not absent |
| Existing pool with successful current reads | Content and normal actions preserved |
| Retry after transient failure | Required reads refetched; later success renders content |
| Invalid text/zero/uint256 overflow ID | Invalid-ID state; no invalid getPool query |

Preserve PF2 without unnecessary changes: connection control is type=button, calls show without validation/write, disconnected submit cannot write, connected valid submit validates and writes once, invalid submit does not write, wrong-chain guard still works. Add meaningful production handler/component tests instead of only checking strings where feasible. State DOM/wallet boundaries honestly.

The independent review instrument is at docs/evidence/recheck-67ac7ea/public-flow-probes.cjs. Baseline: 29 cases, 21 pass / 8 fail, including five passing Create controls. It transpiles unchanged page source with synthetic hooks, not a browser mount. Its error marker is intentionally synthetic; new coverage must additionally use realistic error nesting. If source extraction/imports change, adapt the instrument's module loading only as needed and explicitly report adaptations; do not weaken expected outcomes to get green results.

Reproduction from repository root:

```text
node docs/evidence/recheck-67ac7ea/public-flow-probes.cjs . pf1-probe-results.json
forge test --summary --fuzz-seed 1
bun run test
bun run check
bun run build
```

## Scope and delivery

Studio authors application/test changes. Preserve accepted lifecycle, receipt, USDC movement checks, contract source/ABI/deployment, money rules, artwork and hosting configuration. Do not redeploy contracts, change Vercel, sign transactions or start mainnet work.

Commit and push focused fixes/tests and an accurate report to the existing repository without force push, preserving concurrent commits. Report full input/output SHAs, changed files, exact commands, exit codes, pass/fail/skip counts, adaptations and checks not run. Keep Studio tests separate from independent review probes. Do not equate passing suites with mounted browser/wallet acceptance.

This is a prepared handoff, not evidence that Studio has executed it. Use the existing HuiPot Studio project via the user's chosen browser workflow; do not create a duplicate project or ask for new tokens.
