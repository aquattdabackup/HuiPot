# Targeted fixes after independent review

Prepared October 24, 2026 (Asia/Ho_Chi_Minh). Reviewed source: Git `3f266fce3d0801a2c9df52cf535b371a33f27522`; archive SHA-256 `66fa4177a65e06d1a880ec4f28c3da7a1bec91dd05472ca59e1acd07f36c507f`.

Codex independently ran 112 passing contract tests (zero failures/skips), the production build/type check, and lint. The fixes below follow reproduced application findings and specific coverage gaps. The source transport is resolved. Read the reports directly from the existing GitHub repository; the user does not need to paste them into Studio. The user authorized committing and pushing completed repository work. This prompt has not been submitted by Codex.

```text
Continue the existing HuiPot Studio project connected to https://github.com/aquattdabackup/HuiPot. Read the latest main branch and record its actual commit. The reviewed implementation baseline is 3f266fce3d0801a2c9df52cf535b371a33f27522; the review/documentation was published in 7dcda652e20852996ddaa7ec498020cb6c7a49f2. Preserve later changes instead of resetting to either baseline. Check current jobs/revisions before starting another generation task.

Read these complete files directly from GitHub or the connected repository before editing:
1. AGENTS.md
2. docs/SPEC.md and docs/DESIGN.md
3. docs/INDEPENDENT_REVIEW.md
4. docs/STUDIO_TARGETED_FIXES.md (this workflow)
5. docs/ARC_TOOLING.md
6. docs/evidence/independent-validation-summary-2026-10-24.json
7. docs/evidence/independent-app-probes-2026-10-24.json and docs/evidence/independent-render-probes-2026-10-24.json
8. The latest entries of docs/LOG.md

GitHub page pattern: https://github.com/aquattdabackup/HuiPot/blob/main/<path>
Raw-file pattern: https://raw.githubusercontent.com/aquattdabackup/HuiPot/main/<path>
Use the supported repository/browser/raw route. Confirm real reads by stating the R1 example involving "0,4", why R2 can show "All checks passed", and SPEC AC12's actual flow requirement, then continue execution in the same turn. A connection or filename alone is not proof of content access. If an input is inaccessible, name the exact URL/error and continue independent work; do not invent its contents or ask the user to paste reports that you can read from the repository.

Independent review reproduced the findings below. Implement fixes and regression tests inside Studio. Preserve D1-D8 and the current deployment. Committing and pushing completed fixes, tests, and evidence to the existing repository is authorized. New deployments, public app hosting, wallet transactions, and grant submission are outside this task. Never expose credentials. If normal edits automatically deploy, report that limitation before dependent work.

R1 — Preserve monetary input meaning.
Create.tsx around line 299 and Pool.tsx around line 352 strip non-digit characters. Pasting "0,4" becomes 4 USDC; "1e3" becomes 13; "-0.4" becomes positive 0.4. Keep raw input and show invalid-format errors. Enforce positive quantum-aligned native amounts with at most six product decimals and uint256 bounds, using integer arithmetic. Validate principal plus estimated fees with honest fee precision. Add input-to-request tests covering pasted malformed values, valid small amounts, excess precision, and over-range values. Never silently rewrite or round money input.

R2 — Make Proof's verdict reflect the actual checks.
Proof.tsx lines 185-190 can return overallValid=true with absent movement evidence, a wrong transfer destination/sender/amount, a wrong payout event amount, or unrelated refund movement. Its UI then says "All checks passed". It also rejects valid Contributed receipts because it only recognizes PaidOut/Refunded.
Use the actual ABI to verify Contributed, PaidOut, and Refunded by action. Bind actual RPC chain ID, deployment, requested/returned transaction identity, successful receipt, pool ID, action, amount, and destination. Validate applicable transaction value and state. Match the documented native system Transfer emitter/from/to/18-decimal amount to the intended action; do not select an unrelated first transfer. Distinguish confirmed execution, incomplete movement evidence, and mismatches. Missing movement evidence is partial, never an all-checks success. Handle RPC errors honestly and invalidate pending/results when pool/hash/context changes. Test each reproduced negative case and valid controls.

R3 — Confirm the requested action, not merely a successful receipt query.
Create.tsx renders "Pool created" for a successful receipt with no PoolCreated event. A canceled transaction replaced by a successful self-transfer must not be reported as creation/contribution/payout/refund. Check emitting contract, expected event/pool/terms, intended account/chain, and resulting state. Pin the receipt chain, handle onReplaced/cancellation and receipt-query errors, reset stale action state across wallet/pool changes, and persist public pending identity for reload recovery. Do not auto-resend or re-sign. Include a switch from contributor A after refund to contributor B with an outstanding claim; B must not inherit a disabled success state.

R4 — Keep invalid input recoverable.
Create.tsx around line 405 calls parseProductAmount during render without a guard; a populated form with target "0.0000001" throws. Pool.tsx line 22 and Proof.tsx line 204 call BigInt before validating the route; /pools/abc and /pools/abc/proof throw. Guard parsing and show field/route errors. Test malformed, negative, over-range and valid values. Avoid an unhandled render exception.

R5 — Refresh chain state without requiring a reload.
Pool read queries only refresh on own transaction success or default query triggers. Add supported block/polling refresh so idle expiry exposes the refund state and another wallet's contribution updates remaining capacity/status. Use chain time, revalidate before signing, and distinguish RPC errors from missing pools or claims. Test idle deadline transitions and external-wallet updates. The existing refetch ref is updated after each render; do not describe it as mount-only.

R6 — Complete specified contract coverage.
The current stateful handler has only one pid. Add stateful multi-pool/wallet action interleavings and forced surplus with aggregate balance >= liabilities. Add rejecting-then-accepting receiver retries for payout/refund and full state/accounting/event rollback assertions. Preserve money behavior and report actual coverage/results. Existing 112 tests pass but do not cover these cases.

Also disable unavailable WalletConnect mobile support when its project ID is missing/blank instead of treating "demo" as usable, while retaining supported injected wallets. Restore the original AC11/AC12 mapping from SPEC.md in the report.

Run the final meaningful app regression tests, contract tests, production build, type checking, and lint. Return exact commands, exit codes, raw logs, actual counts, and checks not run. Keep ordinary EVM tests distinct from Arc runtime/browser/testnet execution.

Write docs/STUDIO_FIX_REPORT.md with the reviewed input commit, actual Studio project URL/revision, R1-R6 findings-to-changes-to-tests mapping, exact validation commands/exit codes/counts, unresolved issues, and whether contract source changed. Store actual new raw logs under a distinct export-logs directory/name and append observed execution evidence to docs/LOG.md. A report is not a substitute for the corrected source and tests. Any contract source change requires renewed artifact/deployment comparison; do not redeploy to make it match. Correct the metadata explanation: a new build alone does not make identical compiler metadata hash nondeterministically.

Before delivery, inspect the diff and reconcile current remote changes without discarding code, docs, or history. Commit and push the completed source, tests, report, and sanitized logs through Studio's supported GitHub integration to the existing repository. Prefer main when supported and safe; if the integration requires a separate branch, use a review branch and return its exact name/commit. Do not force-push, replace the repository, change visibility, include secrets, or publish dependencies/caches. Do not stop at saying the files are local when push is supported and authorized. Verify the remote commit before claiming delivery. If the integration cannot push these changes, report the exact limitation and provide the supported complete source/log export, using Base64 transport when binary download is unreliable.

Return a concise result with: Studio project URL, actual input/output revision, GitHub branch/commit and report link, validation counts, unresolved findings, and contract-source change status. Return links to committed reports/logs so the user can hand the source back to Codex directly.

Stop for independent review before human-operated testnet transactions. Keep mainnet/public-hosting/submission status unverified until those actions are separately performed with real evidence.
```
