# Task On Progress

## Current task
- User priority: reliable HuiPot functionality and competition fit; visual expansion is paused in favor of the golden flow.
- Reviewed source: 37ee96c268ed68ac9b951d189aaf03cca978b462, verified against GitHub; checkout initially clean.
- Independent review/testing complete; evidence and exact Studio fix prompt prepared. Studio fixes and rendered/wallet acceptance remain pending.

## Artifacts
- docs/FUNCTIONAL_READINESS.md: product/rubric mapping, public release blockers, findings F01-F07, exact validation outcomes and completion gates.
- docs/STUDIO_FUNCTIONAL_FIX.md: current exact browser execution prompt; preserve existing artwork and D2-D8.
- docs/evidence/functionality-37ee96c/: full attempts, validation summary, synthetic results, source hashes, public config/HTTP/RPC and bytecode comparison.
- docs/review-tools/functionality-probes.cjs: Codex review instrument, not Studio product tests; unchanged production code under mocked hooks/network.

## Verified results
- Forge 120/0/0 across 14 suites, exit 0; initial sandbox tool crash documented.
- Vitest 32/0 on unchanged warm retry, exit 0; prior run 31/1 timeout and sandbox startup failure retained.
- bun run check and build exit 0; chunk-size warning. Dependencies/toolchain reused, no setup/token/install.
- Independent probes 23 total: 9 pass/14 fail. Missing review steps, event-bound success, inbound Proof and truthful read-error states.
- Public app root 200, direct routes 404; public JS uses zero address for actual reads/writes despite nonzero landing fallback.
- Testnet chain 5042002, contract code present and poolCount=0; mainnet chain 5042 responds read-only. Executable runtime matches without Solidity metadata, full hashes differ.
- No source/contract edits, wallet actions, browser-rendered QA, hosting setting changes or submission. Competition live page 405; supplied rules remain planning source.

## Next
1. Commit/push completed review artifacts to existing main and verify remote SHA.
2. User runs docs/STUDIO_FUNCTIONAL_FIX.md in the existing Studio browser project; no repeated setup/token requests.
3. Independently review fixes and real browser evidence; verify public address configuration and direct-route rebuild through authorized hosting workflow.
4. Human-operated testnet success and refund flows, then separately approved mainnet budget/transaction plan and final submission evidence.

Last updated: October 25, 2026 (Asia/Ho_Chi_Minh).
