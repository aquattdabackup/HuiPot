# Focused remaining-fix delivery

Prepared October 30, 2026. Planning input: `ba02ec6e686c5b490239c42e32811c262fad3d10`; application source remains `00252d0e38e4bc9e047072246e905424c8878951`. Pull latest main and record the actual full SHA. This handoff is prepared for the existing Studio browser project; Codex has not launched a Studio job.

Read AGENTS.md, STUDIO_CWR_ACCEPTANCE_RECHECK.md, TESTNET_DEMO_ACCEPTANCE.md, Create.tsx, createSafety.test.ts, package/lock/configuration and evidence/recheck-00252d0. Do not repeat setup or redesign. Application and regression-test implementation remains Studio-authored.

## Repair all confirmed defects in one delivery

| ID | Required repair | Acceptance |
| --- | --- | --- |
| CWR4 | Declare required Node test types/dependencies and proper test configuration; commit lock changes | Reproducible install, check and build exit 0; no weakened typechecking or skipped regression files |
| CWR5 | Portable file URL/fileURLToPath handling instead of URL.pathname; controlled/restored clock with coherent future deadlines | Runner works on Windows/Linux and paths with spaces; fixtures never expire with wall clock; assert first write before testing later transitions |
| CWR6 | Handle actual wagmi rejection using authoritative reverted-receipt evidence and correct chain/hash/submission identity | Actual library error path produces distinct reverted UI and correct mined link; network/timeout/null stays unknown; matching success still passes full snapshot validation |
| Reporting/probes | Correct cancelRefetch/test-count/fixture explanations and commit runnable adaptations | Actual query settlement awaited; hash appears only after write; exact reproducible counts/exits |

For CWR6 preserve context during asynchronous recovery and reject stale results after context replacement/unmount. An error string mentioning a revert is not proof of a mined revert. Preserve replacement identity and never unlock another create because a read failed.

The proven finite waiter timeout followed by read-only retry is accepted. Independent first-fetch restart is not required. Replace the obsolete diagnostic demanding a second pending waiter with an explicit bounded timeout/unknown/retry assertion; explain this acceptance change and preserve every other assertion and positive control. cancelRefetch:true still deduplicates when no cached receipt exists. Account for default query retries when describing UI timing: 30 seconds is per attempt, not necessarily the terminal banner delay.

## Preserve accepted behavior

- Paused/offline evidence and submit lock; post-hash duplicate prevention in the handler.
- Recovery reads existing submissions without writeContract or a new signature.
- Recipient guards, complete immutable snapshot, missing-context rejection, every event-field comparison, mined-hash links, fixed Arc chain and PF2 connection-button behavior.
- Pool 7 partial/repeated contributions, fixed-recipient payout and Proof; pool 8 missed-goal refund to contributor, CLOSED evidence and Proof. These live scenarios now passed; do not recreate them just to repair tests.

No contract, money-rule, deployment-address, visual overhaul, hosting, redeployment, signing or force-push changes.

## Validation and delivery

1. Validate against committed dependencies, not ambient Studio packages. Run `forge test --summary --fuzz-seed 1`, `bun run test`, `bun run check`, `bun run build`. Report all exits and pass/fail/skip counts.
2. Preserve the 23 production and 3 recovery assertions using the documented hash-lifecycle adaptation. Commit scripts used, not only result JSON.
3. Run actual-query settlement tests and the chosen finite-timeout strategy. Include actual-library revert negatives and matching-success controls, not impossible `isSuccess=true` reverted fixtures alone.
4. Test portable paths and deterministic clock behavior. If Windows execution is unavailable, say so and supply portable implementation for independent Windows rerun. Do not claim it passed.
5. Current CWR block is 16 cases: 10 production executions and 6 source assertions. createSafety is 45 and suite 210. Report actual new counts rather than targeting a number.
6. Write `docs/STUDIO_FINAL_FIX_REPORT.md` mapping CWR4–CWR6 to source/tests, actual input/output commits, install/test logs, probe adaptations and remaining limits. Commit/push repairs, dependencies, tests and report; verify remote output SHA. No force push.

Codex will independently verify the delivered revision. No item is closed merely because its name appears in a test.

## Separate gates

MetaMask classification requires independent provider evidence and is not cleared by these fixes. Exact public deployment revision, mounted keyboard/account-change/replacement cases, WalletConnect mobile and cross-session evidence remain unverified unless separately demonstrated. EIP-55 display and broader fee characterization are earlier polish/evidence items, not reasons to expand these repairs. Studio permalink/provenance, video, eligibility and required mainnet proof remain submission work. No hosting, mainnet or support-message action is authorized by this repair handoff.
