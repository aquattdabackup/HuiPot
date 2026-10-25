# Studio handoff — competition-focused functional completion

Prepared October 25, 2026. The user shifted priority from visual polish to a sensible, dependable working product suitable for the supplied competition requirements. Current reviewed input: `37ee96c268ed68ac9b951d189aaf03cca978b462`. This prompt is prepared, not executed by Codex.

## Read first and confirm access

Read latest main and record its actual SHA; preserve newer work. Read AGENTS.md, docs/FUNCTIONAL_READINESS.md, docs/SPEC.md, docs/REQUIREMENTS.md and evidence/functionality-37ee96c under docs, including functional-probes.json, validation-summary.json, public-config-evidence.json and network-live-results.json. Read the real Create, Pool, Proof, Explore, config/contract and test source. Do not infer functionality from prior reports.

Confirm content access by stating: (1) the contract address actually compiled into the inspected public JS, (2) the failed direct routes, (3) why Review currently opens the wallet, (4) which three contribution-proof negatives pass incorrectly, and (5) why the 32 green unit tests do not cover these failures. Then implement the prompt in the same turn.

## Exact execution prompt

```text
Continue the existing HuiPot Arc Studio project and GitHub repository. The user now prioritizes reliable functionality and competition readiness. Read all inputs listed in docs/STUDIO_FUNCTIONAL_FIX.md and confirm the required five content-access points. Record actual latest-main SHA, preserve concurrent changes and existing artwork. Do the work, not another plan.

Use docs/FUNCTIONAL_READINESS.md findings F01-F07 as the acceptance backlog. Keep one non-upgradeable contract, five screens and D2-D8 unchanged. No added token, yield, voting, custody backend or mainnet default. All production code and regression tests must be written in Studio. Codex review probes are evidence, not a Studio-authored test suite.

1. Deployment configuration and direct links (F01/F02): validate one shared deployment identity for reads, writes, labels and evidence. The observed Vercel JS compiled VITE_HUIPOT_ADDRESS to zero, while a separate landing fallback displayed a real address. Provide a clear configuration error and disabled writes for missing/zero/malformed values; verify the selected chain and code. Record the concrete public testnet build variable VITE_HUIPOT_ADDRESS=0x81a139599d252eb2dc2bbb6c267e911a21264288 and the need to rebuild the intended hosting environment. Do not request a token or invent an address. Add supported Vercel SPA routing configuration so direct /pools, /create, /pools/:id and /pools/:id/proof requests can reach the app without breaking assets. Prepare these source/config changes; do not change Vercel account settings or manually trigger hosting deployment in this job. Return the exact remaining host-side action if needed. A code push may use the user's existing integration; do not claim its automatic deployment was verified without checking it.

2. Real review and request snapshots (F03): Review contribution/payout/refund must open an actual review step, not call writeContract. Show action, exact amount, chain, full recipient, pool/contract, fee estimate or clear unavailability, principal/fee distinction and commitment terms. Final confirmation alone asks the wallet. Validate zero/self addresses and amounts; simulate/estimate appropriate calls and check principal plus gas. Use exact integer units, never round requested deposits. If terms, pool state or identity change, invalidate the review. Preserve user input after rejection or recoverable failure.

3. Receipt and context correctness (F04): bind each action to its captured account, chain, deployment, pool, function, amount and immutable terms. Explicitly pin receipt reads to that chain; validate successful status and the matching expected contract event and action data before success. Cancellation or unrelated replacement receipts must not confirm. Handle replacement hashes and receipt errors visibly. Create must compare all submitted terms, not only creator/recipient. Reset/invalidate stale action state on account/chain/deployment/route change. Make post-confirmation refetch stable and idempotent per transaction; do not run an effect repeatedly due to changing callback identity.

4. Proof (F05): invoke shared production verification from tests. For contributions, bind transaction identity/from/to/native value, intended pool/action/amount and decoded Contributed event to the matching inbound system Transfer. Preserve the repaired payout target/from/to/amount checks and refund checks. Missing data means incomplete; mismatched data means invalid. Reject zero/invalid amounts. Guard HTTP/JSON-RPC errors and malformed logs. Prevent late/stale verification results after route/context/input changes. Do not convert fixed test flags into a fake verifier or duplicate a simplified predicate in tests.

5. Read states and flow usability (F06/F07): separate loading, RPC failure, confirmed empty/not-found and stale data. Undefined refund reads must never say the claim is zero. Add retries, fresh reads after writes, and controlled idle-deadline coverage. Derive closed copy from pool totals. Add a working share/copy link and a one-click Proof path from a confirmed action using its actual hash. Provide an honest receipt/history path across navigation; never invent transactions. Keep illustrative demo state separate from real wallet state and retain all risk/fee/commitment disclosures.

Write meaningful production-path regressions for the 14 failing independent cases and account/chain changes, replacements, stale async responses, fee/simulation errors, expiry and review cancellation. Retain the old five payout-negative regressions. Fix the import-test timeout/coverage weakness through better focused tests; do not hide flaky results or just raise a timeout and call it behavioral coverage.

Run bun run test, bun run check, bun run build and the full forge test --summary --fuzz-seed 1 on the final source. Report exact commands, exits, pass/fail/skip counts and each failed/retried attempt. Re-run/adapt the independent probes as review evidence where their extraction assumptions still apply; if refactoring changes those assumptions, document it and prove equivalent behavior through production tests, not weakened assertions.

When browser tooling exists, exercise all five routes including direct-load/reload, wallet-disconnected/wrong-chain, loading/error/retry and controlled action/receipt fixtures. Label fixture-based browser checks honestly. Human-operated testnet wallet flows and mainnet actions are separate: do not sign transactions or fabricate receipts. If browser tools are absent, finish source/tests and list browser checks as not run.

Write docs/STUDIO_FUNCTIONAL_FIX_REPORT.md mapping F01-F07 to implementation and evidence. Include actual input/output revisions, Studio project/preview URL or unavailability, source/test changes, raw sanitized logs, browser screenshots where available, public hosting checks actually performed and outstanding human steps. Correct current status overclaims while preserving historical reports. Repository commit/push through the existing supported integration is authorized; verify remote SHA, do not force-push. If integration is unavailable, provide a supported complete export without repeating setup/token requests.

Stop after source delivery and validation for independent review. No contract redeployment, mainnet configuration activation, wallet signing, public video upload or competition submission. Mainnet planning follows functional acceptance and a separately approved human budget and transaction plan.
```

## Human-controlled evidence after source fixes

- Vercel build setting: the public testnet address above, scoped to the intended environment, then rebuild through the approved hosting workflow. This is configuration of an existing deployment, not a new contract deployment or credential request.
- Recheck root and direct routes, built contract identity and actual reads before requesting a wallet transaction.
- Testnet: a success pool and a failed pool, two contributors where needed, explicit payout/refund actions, rejection/retry, account switch and receipt capture. No mainnet budget is implied by the 1 / 0.4 / 0.6 test fixtures.
- Mainnet and final submission remain gated as stated in FUNCTIONAL_READINESS. Existing testnet addresses must never be relabeled mainnet.
