# f00c80d review and public-demo checkpoint

October 26, 2026, Asia/Ho_Chi_Minh. Pulled main before reviewing; local/GitHub input HEAD: **f00c80da0168afacd136b1c8f0cf44e077952888**. Read all six requested files in full. Application, contract and Studio test sources were not modified.

The earlier RL1 race, RL2 links and already-running-RPC unmount case now pass the independent probes. Late callback delivery is still not bound to the original submission. Separately, the public app loads but its real pool routes are blocked by build configuration. See [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md) for the practical finish criteria and demo steps.

## Validation

Exact archive of input HEAD; matching cached package.json/bun.lock dependency installation; Windows, Node 24.19.0, Bun 1.3.14, Forge 1.7.1, solc 0.8.28. Executables resolved by absolute path with these command arguments. Requested suites ran sequentially and passed on first attempts.

| Command | Exit | Result |
| --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 pass / 0 fail / 0 skip |
| `bun run test` | 0 | 92 pass / 0 fail / 0 skip; four files; 8.20 seconds reported |
| `bun run check` | 0 | oxlint 0 warnings/errors; tsc 0 errors |
| `bun run build` | 0 | Build succeeds; Vite warns about chunks over 500 kB |

Vitest counts: 35 verifyTx + 17 parser + 28 validateReceipt + 12 lifecycle = 92. No import timeout. Build was additionally run for the user's demo-readiness request; it does not prove the public deployment has the right environment or revision.

[Logs and reproduction instruments](evidence/recheck-f00c80d/), [run exits/timing](evidence/recheck-f00c80d/runs.json), [build exit](evidence/recheck-f00c80d/build-run.json), [source integrity manifest](evidence/recheck-f00c80d/manifest.json).

## Requested source checks

- Pool uses `submissionIdRef`; `validationGenRef` is removed.
- All three repricing callbacks read `submissionIdRefLocal.current` without incrementing it. Success effects also read the current id.
- `confirmAction` increments `submissionIdRef.current` exactly once, before its action-specific write, and clears activeValidationRef.
- The empty-dependency effect returns cleanup that increments the id and clears activeValidationRef (Pool.tsx:163–168).
- Replaced banner uses `const linkHash = phase.minedHash ?? phase.txHash` (line 520).
- Cancelled banner conditionally links `phase.minedHash` with “View cancellation tx” (line 552).

## Independent behavioral evidence

The prior instruments execute the unchanged production ActionPanel/validator with synthetic hooks, callbacks and RPC responses. They do not copy its lifecycle logic. Adaptation was limited to revision metadata and the extra synthetic ref slot. No browser/wallet lifecycle was simulated as a real transaction.

- [31 receipt/action cases](evidence/recheck-f00c80d/probes.json): **31 pass / 0 fail**, exit 0.
- All **14 prior lifecycle cases pass**, including slow/fast repricing for all actions, mined cancellation/replacement links, unmount during an already-started validation, new-submission invalidation and transient retry.
- Two additional cases exercise the explicitly requested *late callbacks* aspect of RL3. Both fail. [Full lifecycle results](evidence/recheck-f00c80d/lifecycle-results.json): **14 pass / 2 fail**, exit 1.

Reproduction with dependencies available in the source root:

```text
node docs/evidence/recheck-f00c80d/receipt-probes.cjs . probe-results.json
node docs/evidence/recheck-f00c80d/lifecycle-probes.cjs . lifecycle-results.json
```

Actual run used the ignored `.review/recheck-f00c80d/snapshot` source root and ignored output paths. These instruments are Codex review tooling, not Studio-authored application tests.

## SC1 — Late replacement callbacks adopt the current submission

All three callbacks obtain the id and snapshot from mutable refs **when the callback arrives**, rather than from the transaction that caused the callback (Pool.tsx:189–234).

1. **Callback after unmount:** cleanup increments the id, but a later repricing callback reads that new id, starts a new validation and can call onSuccess. The independent case started one RPC and invoked onSuccess once; expected both zero. Cleanup now correctly blocks RPC work started *before* unmount, but not callback work started *after* it.
2. **Old callback after a new same-action submission:** confirm a new submission, then deliver the old transaction's repricing callback. It reads the new id and latest snapshot. With matching pool/account/amount, the old mined receipt is accepted as the new submission's confirmation. The independent case invoked onSuccess once and entered confirmed, rather than ignoring the old callback. No real mismatched transaction was signed; this is a synthetic lifecycle/context boundary failure.

Bind callbacks, receipt effects and retries to immutable submission identity plus original/mined hashes; reject callbacks for an obsolete or unmounted context before they claim a validation slot. Include account/pool/chain scope. Preserve the accepted slow/fast repricing behavior and ordinary retries. Do not simply remove cleanup or stale checks.

## Test/report discrepancies

- The new lifecycle file has **8 model-harness checks + 4 raw-source checks**. Its `makeHarness` redefines runReceiptValidation, the replacement handler, success effect, newSubmission and unmount behavior. It calls production validateReceipt, but it does **not** execute production ActionPanel lifecycle code. Passing these tests is weaker than the requested production-path regression coverage. Refactor a shared production lifecycle module or mount the real component with controlled hooks; do not keep a second implementation as the acceptance oracle.
- F02/F06 documentation still disagrees with delivered source. vercel.json explicitly excludes assets/art/favicon/robots/manifest; share.ts contains no VITE_APP_URL support and uses the Studio handshake/current-origin + BASE_URL fallback. Neither source file changed in this revision. Correct the report instead of asserting they were fixed or changing unrelated behavior.
- RC6's “for all three actions” wording overstates its render branches. Previously requested contribution/refund transitions and PAID payout evidence are accepted; cross-session persistence remains unimplemented.

## Public browser demo actually run

Opened https://hui-pot.vercel.app in the in-app browser, at its narrow viewport. Public deployment SHA was not exposed/confirmed; do not equate it with the GitHub input SHA.

| Browser action | Observed result |
| --- | --- |
| Landing → Try the walkthrough → Add 0.60 demo USDC → Simulate payout | Payout complete; illustrative PaidOut receipt for 1.000000 USDC |
| Deadline missed → Advance demo deadline → Simulate refund claim | Refund confirmed; illustrative Refunded receipt for 0.400000 USDC |
| Direct `/pools` | Route renders; “Contract not deployed. No pools available.” |
| Direct `/create` | Form renders; “Contract not deployed. Deploy HuiPotGoalPool to Arc Testnet first.” |
| Direct `/pools/1` | “Deployment not configured — set VITE_HUIPOT_ADDRESS in the build environment.” |
| Direct `/pools/1/proof` | Proof route renders; “Contract not deployed.” |

These navigations no longer returned the historical direct-route 404. The current blocking gate is build configuration, not evidence that the known contract ceased to exist. In src/contract.ts a missing, malformed or zero VITE_HUIPOT_ADDRESS makes the gate false. Actual Vercel settings and deployed revision were not inspected; no hosting setting was changed. [Configuration screenshot](evidence/recheck-f00c80d/browser/public-pool-config-blocked.png), [payout illustration](evidence/recheck-f00c80d/browser/walkthrough-payout.png), [refund illustration](evidence/recheck-f00c80d/browser/walkthrough-refund.png).

No browser wallet was connected and no transaction signed. AC12, real Proof receipts, live replacement, WalletConnect mobile, measured fees, EIP-55 display, cross-session evidence, mainnet and competition submission remain open. The two walkthroughs move no funds and are not on-chain proof.

## Exact Studio follow-up

Read current main of https://github.com/aquattdabackup/HuiPot and record its actual SHA. Read AGENTS.md, docs/STUDIO_SUBMISSION_CONTEXT_RECHECK.md and docs/STUDIO_FUNCTIONAL_FIX_REPORT.md in full. Input application reviewed: f00c80da0168afacd136b1c8f0cf44e077952888. Confirm access by explaining why cleanup stops an existing RPC but does not stop a callback arriving later.

Fix SC1 by binding callbacks/receipt effects/retries to immutable submission context and original/mined hashes, and rejecting obsolete/unmounted contexts before starting work. Preserve all 31 receipt/action and 14 accepted lifecycle cases. Replace mirrored lifecycle acceptance tests with production-path tests; add both late-callback cases, account/pool/chain changes and valid controls. Correct F02/F06 and lifecycle coverage claims to match source. Do not change contract economics or unrelated visual scope. Run Forge seed 1, Vitest, check and build; return exact results plus input/output SHAs. Commit/push through GitHub without force. Do not deploy or sign transactions. The public Vercel build configuration blocker is a separate host-side action in DEMO_RUNBOOK.md; do not claim it is resolved by a source commit. This prompt is prepared, not executed.
