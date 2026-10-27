# Public flow follow-up: PF1 and PF2

October 27, 2026, Asia/Ho_Chi_Minh. Input pulled before investigation: `80d4778f2da5144d060d51e6f163dcf75c9ae8e6`. App source remains c3ae551. Actual Vercel deployment SHA is unknown.

Read AGENTS.md, PUBLIC_POSTDEPLOY_RECHECK.md, STUDIO_FUNCTIONAL_FIX_REPORT.md and this document in full. Work in the existing HuiPot Studio project/repository. Confirm actual input SHA and explain both findings before implementing. Do not restart setup, redeploy contracts, change hosting, sign transactions or weaken previous receipt/lifecycle checks.

## PF1 — missing pool and network errors are conflated

Public reproduction: /pools settles to "No pools yet"; /pools/1 reports "Could not reach the network" after loading and again after Retry; /pools/1/proof reports pool not found. These observations alone do not establish a network outage or independently verify poolCount.

Source evidence:
- Pool.tsx handles poolRpcError before the poolCount-based nonexistence branch.
- HuiPotGoalPool._requirePool reverts InvalidPoolId for zero or IDs above _poolCount; getPool/getStatus both invoke it. A nonexistent pool can therefore enter the generic query-error branch.
- Proof.tsx treats poolError as not found, hiding real transport failures.

Required behavior:
- Reject malformed, zero and overflowing IDs without querying an invalid pool.
- A successfully established absent pool (for example a current successful count read or a decoded InvalidPoolId revert) displays not found consistently on Pool and Proof.
- Transport, HTTP, RPC-provider and unknown read failures display an honest retryable error, not an empty list or not found.
- Do not turn an undefined/failed count into evidence that the pool is absent. Avoid classifying a newly created pool from stale cached count alone when getPool succeeds.
- Retry must refresh relevant failed reads. Preserve successful pool terms/status rendering.

Acceptance coverage must exercise production classification/render paths with controlled query results, not a duplicate classifier in tests. Include: successful count=0 plus getPool(1) InvalidPoolId; an existing pool with valid reads; genuine read transport failure; failed count without nonexistence evidence; stale count lower than a successfully loaded pool ID; successful retry; invalid ID. Cover Pool and Proof where applicable. Report actual outcomes.

## PF2 — wallet connection button submits Create form

Independently reproduced on a fresh empty public /create form with no connected wallet. The visible connection button returned:

```json
{"tag":"BUTTON","typeAttribute":null,"effectiveType":"submit","insideForm":true}
```

Clicking it opens the wallet chooser AND shows all six required-field/acknowledgement errors. No provider was selected, wallet connected, or signature requested. This is confirmed browser behavior.

Create.tsx renders ConnectKitButton inside form onSubmit=handleSubmit. The submit handler has no explicit disconnected-account guard before writeContract once validation succeeds. Fix button semantics and the handler boundary: connecting a wallet must not submit/validate creation or initiate a write; disconnected submission must never write even if triggered with Enter. Preserve validation/network checks for an intentional connected Create submission.

Use the installed supported ConnectKit API; inspect actual types/components rather than guessing a type prop. Prefer a real type=button control or placing connection UI outside the form. Do not bypass wallet authentication or auto-sign.

Acceptance: Connect on an empty form opens the chooser with zero validation errors and zero writes; disconnected Enter does not write; connected valid intentional submission validates and writes once; invalid connected submission does not write. Add a regression exercising the production component and DOM button semantics if the test setup permits. State any untested browser/wallet boundaries honestly.

## Validation and delivery

Run `forge test --summary --fuzz-seed 1`, `bun run test`, `bun run check`, `bun run build`. Report exact commands, exits, pass/fail/skip counts, full input/output SHAs, changed files and checks not run. Preserve accepted prior tests; do not claim independent probes were run unless actually executed. Keep contracts/deployment, artwork, money rules, Proof movement predicate and action lifecycle fixes unchanged.

Commit and push the focused Studio-authored fix and report via the existing GitHub integration without force push. Codex will independently review. No automatic deployment or wallet action is requested by this prompt.

## Handoff state

Prepared request, not executed Studio output. Codex checked studio.arc.io: the available browser session shows Sign in / Sign up and no existing project. The user's selected human-operated Studio browser handoff remains in effect. No project/job started; no token requested.
