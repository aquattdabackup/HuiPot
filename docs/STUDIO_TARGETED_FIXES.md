# Targeted fixes after independent review

Prepared October 24, 2026 (Asia/Ho_Chi_Minh). Reviewed source: Git `3f266fce3d0801a2c9df52cf535b371a33f27522`; archive SHA-256 `66fa4177a65e06d1a880ec4f28c3da7a1bec91dd05472ca59e1acd07f36c507f`.

Codex independently ran 112 passing contract tests (zero failures/skips), the production build/type check, and lint. The fixes below follow reproduced application findings and specific coverage gaps. The source transport is resolved. This prompt has not been submitted by Codex.

```text
Continue the existing HuiPot project from the source delivered as Git commit 3f266fce3d0801a2c9df52cf535b371a33f27522. Capture the current revision and inspect any changes since that baseline before editing.

Independent review reproduced the findings below. Implement the fixes and regression tests inside Studio. Preserve D1-D8 and the current deployment. No new deployment, publication, GitHub push, wallet transaction, or credentials are authorized. If normal edits automatically deploy, report that limitation before dependent work.

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

Return the actual Studio project URL, corrected revision, diff/file manifest, focused findings-to-tests mapping, and source/log export. Use the working Base64 transport if a downloadable binary is unreliable. State whether the contract source changed; any source change requires renewed artifact/deployment comparison. Correct the metadata explanation: a new build alone does not make identical compiler metadata hash nondeterministically.

Stop for independent review before human-operated testnet transactions. Keep mainnet/public-hosting/submission status unverified until those actions are separately performed with real evidence.
```
