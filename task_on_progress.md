# Task On Progress

## Task
- Title: Review the user-reported Studio preview and testnet deployment.
- Status: transport recovered; source at Git 3f266fc independently reviewed. 112 contract tests pass, build/type check and lint pass. Six focused correctness/coverage findings keep the app gate open. See docs/INDEPENDENT_REVIEW.md and docs/STUDIO_TARGETED_FIXES.md.
- Goal: obtain and inspect actual Studio artifacts, reconcile them with the approved specification, and identify gaps before further deployment or use.
- Acceptance: recorded provenance, reviewed source, actual test evidence, source/deployment matching, and a clear list of remaining flow checks.

## Findings and Files
- Read AGENTS.md, PROMPT.md, comparison, requirements, tooling, setup/handoff, log, and project memory. User selected HuiPot Goal Pool and authorized Phase 2.
- All three optional local skills are absent, including arc-ui-craft; used the Phase 2 fallback in PROMPT.md.
- Preserved all existing local documentation work. Local main remains eb7e82b, behind fetched origin/main 3f266fc by one commit. Exported the fetched revision under .review/studio-3f266fc/snapshot without a merge, reset, or worktree.
- Browser inventory returned no enabled browsers or apps. Preserve the approved human-operated browser route; this does not block local ideation.
- Earlier in this conversation, Windows CLI 1.2.2 and authenticated `whoami` succeeded outside the sandbox. Do not repeat installation, login, or token entry. Historical cloud 403 reports describe a different environment.

## Changes
- Added SPEC.md with D1-D8 decisions, state machine, units/accounting, permissions, security review criteria, and AC01-AC13 validation matrix.
- Added DESIGN.md for four screens and complete interaction/evidence states.
- Added STUDIO_PROMPTS.md with exact A-D prompts, inputs/exports/evidence, and phase gates.
- Updated selection, requirements, setup/handoff, README, architecture memory, and log without erasing prior environment history.

## Verification
- Existing GitHub repo is public with default branch main; local and remote started at the same commit, 0216732.
- Fresh official document reads verified GitHub export, native units, system movement events, and runtime/simulation differences. Existing-repo import is not established by those sources; the start prompt checks real file access.
- Latest validation: frozen Bun 1.3.14 dependency restore; Forge 1.7.1/solc 0.8.28 compiled the source and ran 112 tests (112 passed, zero failed/skipped) with fuzz seed 1. Production build (tsc -b and Vite) and lint passed. Browser/testnet integration is not run.
- Local compilation exactly matches the exported full runtime and ABI; the saved onchain code matches the 4,081-byte prefix, while metadata differs. Shared Git/export files differ only in LF/CRLF. Current source is available; do not request another export to repeat the same review.
- Documentation checks and final results are recorded in docs/LOG.md.

## Remaining Steps / Handoff
1. User runs the focused R1-R6 fix prompt in docs/STUDIO_TARGETED_FIXES.md in the existing Studio project. No app/contract code fixes are made outside Studio. Obtain the actual Studio URL/revision with the corrected diff/logs.
2. Review/retest monetary input, Proof verdict, transaction replacements/state, render validation, block/deadline refresh, and missing multi-pool/receiver-retry tests. The real refetch ref updates every render; do not repeat the earlier unverified mount-only allegation.
3. After corrected source review, prepare the human-operated testnet funded-payout and failed-expiry/refund flows. Browser layout, Arc-specific runtime semantics, and real wallet outcomes remain open. No new wallet action or mainnet step was approved in this review.
- Archive SHA-256 66fa4177a65e06d1a880ec4f28c3da7a1bec91dd05472ca59e1acd07f36c507f, 266114 bytes, 63 CRC-valid files. Git revision 3f266fce3d0801a2c9df52cf535b371a33f27522. Source/ABI/runtime/test evidence lives under docs/evidence and the ignored .review directory.
- Codex inspected actual source and logs, independently compiled/tested the contract, built/linted the app, and executed local synthetic review probes. No browser preview, testnet wallet transaction, public hosting, or Studio prompt execution by Codex is claimed.
- Do not repeat setup or ask for tokens. Mainnet spending and public app/video publication remain separately authorized actions.

Last updated: October 24, 2026 (Asia/Ho_Chi_Minh).
