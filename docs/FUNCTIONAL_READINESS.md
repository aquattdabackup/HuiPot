# HuiPot functional and competition readiness review

October 25, 2026 (Asia/Ho_Chi_Minh). **Decision: keep the product; fix the working flow before preparing a submission. Not submission-ready.**

Reviewed source: `37ee96c268ed68ac9b951d189aaf03cca978b462`, matching GitHub main and the clean checkout at review start. Tests ran against an archive of that commit. Hashes of 37 source/configuration files match the checkout. Existing Bun 1.3.14, Forge 1.7.1, solc 0.8.28 and cached dependencies were reused; package.json and bun.lock match the dependency snapshot. No Studio setup, token request, source fix, wallet transaction or hosting-setting change was performed.

## Competition fit and what matters next

HuiPot fits the supplied conditional-payment/shared-treasury examples: a small known group commits USDC toward one fixed expense, funds become payable only when the exact target is reached, and failed pools permit individual principal refunds. Keep that promise narrow. It does not guarantee delivery, offer dispute resolution, rotate savings, or pay interest. No new contract, token, voting system or marketplace is needed for this submission.

The [user-supplied text](sources/competition-user-supplied.txt) remains the planning authority. Fresh access to the DoraHacks page returned HTTP 405, so the date, awards and eligibility terms are still not authenticated against the live announcement. November 1, 2026 is the supplied closing date; cutoff time/time zone remain unknown. Do not invent a deadline hour or an earned score.

| Supplied criterion | Weight | Actual evidence and remaining gap |
| --- | --- | --- |
| Real USDC on Arc mainnet | 30% | Not met by the current testnet app. No mainnet contract/app transaction evidence was verified. Deployment alone would not suffice. |
| Studio across contracts, tests and app | 25% | Studio-attributed source and logs exist. Actual app-specific Studio project URL and recorded build/video provenance still need to be attached. Codex review instruments and generated art are separately identified. |
| Working product | 25% | Contract suite passes, but the public build is configured with a zero contract address, direct routes fail, and important confirmation/proof behaviors fail synthetic checks. Passing unit tests is not acceptance. |
| Potential | 20% | Clear use case and small scope. Demonstrate one concrete group expense and explain the funding condition, fee cost and recovery limits. Actual user demand remains unvalidated; do not fabricate adoption. |

Submission inventory: public repo exists; public app root responds but the usable flow is blocked; Studio permalink, mainnet address/transaction, build + mainnet walkthrough video and final short description remain incomplete/unverified. A GitHub builder profile can satisfy that field once the intended profile is confirmed. Prior Circle/Arc funding and submission rights must be confirmed before claiming eligibility.

## Public app and network checks

| Check | Observed result |
| --- | --- |
| `https://hui-pot.vercel.app/` | HTTP 200; serves the SPA shell. This is not a rendered-app pass. |
| `/create`, `/pools/1`, `/pools/1/proof` | Initial direct requests returned 404. Repeat `/create` and `/pools/1/proof` also returned 404; repeat `/pools/1` closed the connection without response. `/pools` returned 404. |
| Served JS `/assets/index-CJWlboYm.js` | SHA-256 `01bfb8fbbb21749b9ed6360aaf79d19f5a3ae19b2549d050fe60b1b0f0a7ae18`. Contract binding is **zero address**, and createPool uses that binding. The landing's separate hard-coded address does not configure application reads/writes. Deployed source commit is not established from this bundle. |
| Testnet RPC | `eth_chainId` = 5042002; recorded contract has 4,134 bytes of code; `poolCount()` = 0 at this check. No completed testnet app flow is evidenced at this deployment. |
| Mainnet RPC | `eth_chainId` = 5042. Read-only connectivity is not deployment or funds proof. |
| Runtime comparison | Local and deployed runtime both 4,134 bytes. Full hashes differ; executable bytes match after removing each 51-byte Solidity metadata section and its length suffix. Do not describe this as byte-for-byte artifact identity or an audit. |

The [official connection reference](https://docs.arc.io/arc/references/connect-to-arc.md), [system-event reference](https://docs.arc.io/arc/references/usdc-system-events.md) and [Studio overview](https://docs.arc.io/ai/arc-studio.md) were fetched successfully via direct HTTPS. They support native 18-decimal USDC, distinct system-emitted movement evidence and Studio's testnet deployment boundary. Mainnet remains a separate human-controlled plan. Official [Vite-on-Vercel guidance](https://vercel.com/docs/frameworks/frontend/vite) documents the SPA deep-link rewrite needed for this routing model.

## Prioritized functional findings

Severity labels describe product/release priority, not a claim of exploitable contract fund theft. Evidence is marked live, synthetic or source-only.

### F01 — Release blocker: public build has no configured contract (live bundle)

`src/contract.ts` reads VITE_HUIPOT_ADDRESS and defaults to zero. The served bundle contains `const In="0x0000000000000000000000000000000000000000"` and uses In for createPool/poolCount. The app consequently disables reads/writes and displays deployment-unavailable states. This verifies the **build output**, not whether a dashboard variable has subsequently been set.

Concrete testnet configuration: `VITE_HUIPOT_ADDRESS=0x81a139599d252eb2dc2bbb6c267e911a21264288` for the intended Vercel build environment, followed by a rebuilt deployment through the approved hosting workflow. This is a public address, not a token or key. Do not redeploy the contract or substitute an unverified address. Studio must validate missing/malformed/zero configuration, use one shared deployment identity everywhere, and say “Deployment not configured” instead of falsely asserting no contract exists. Confirm the resulting public JS and actual reads, not merely environment-variable presence. Hosting changes/rebuild are not executed by this review.

### F02 — Release blocker: shared/reloaded pool URLs fail (live HTTP)

BrowserRouter routes exist in source but direct requests do not reach the app. Add the supported Vercel SPA routing configuration through Studio, preserving static assets and any existing server routes. Verify direct requests and reload/back/forward navigation for all five routes after the hosting change is approved/applied. A client-side click from the root does not validate sharing a URL. See the recorded responses above.

### F03 — High: Review buttons immediately request a wallet write (synthetic handlers)

`Pool.tsx` handlers at lines 57, 72 and 77 call writeContract immediately. Buttons labeled Review contribution/payout/refund do not open a distinct review step. All three handler probes recorded a wallet-write request before a separate confirmation. Add a real review step containing action, chain, pool/contract, exact amount, full destination, principal-versus-fee separation and commitment terms. Only its explicit final action requests the wallet. Capture the reviewed terms so later state changes invalidate confirmation.

No balance read, fee estimate or simulation is present in the action flow. Add action-appropriate estimation/simulation and recoverable insufficient-principal-plus-gas handling. If a fee cannot be estimated, disclose that explicitly and require final wallet review; never show an invented zero. Preserve 18-decimal native amounts and 6-decimal product input.

### F04 — High: unrelated successful receipts can produce action success (synthetic + source)

ActionPanel derives success from the receipt hook's isSuccess without checking the expected action event, destination, amount or submitting context. Synthetic successful cancellation receipts with no HuiPot event produce Contribution/Payout/Refund confirmed. Waiting hooks also omit an explicit chain and their error states are not displayed. Their current component key covers account and pool, not chain/deployment/action context.

Create verifies event emitter/creator/recipient but not all submitted immutable terms. A production-component probe accepted a PoolCreated event with a 2-USDC target while its form requested 1 USDC. Capture the full request snapshot and bind confirmations to it, including replacement/cancellation behavior and the actual confirmed transaction hash. Reset/invalidate stale state on account, chain, deployment, route or action changes. Preserve fields after rejection. Handle receipt errors separately from submission errors.

Source-only concern: handleActionSuccess is recreated on every parent render while ActionPanel's effect depends on it and persistent success booleans. Make refetch notification stable and idempotent per confirmed transaction; add a behavioral regression. This review did not measure a live request loop.

### F05 — High: contribution Proof can be fully verified without matching funds (synthetic production verifier)

The five former payout negatives now correctly return overallValid=false, including event+transfer both 1 base unit versus a 1-USDC target. Preserve those repairs.

However, Contributed excludes movement from the validity requirement. Three negative production-verifier probes still return true: no inbound movement evidence, wrong inbound movement amount and zero event amount. Bind the transaction identity/from/to/value and expected action/pool/amount to the decoded event and appropriate inbound system Transfer. Missing evidence must be incomplete, contradictory evidence invalid. Do not treat the absence of an outbound transfer as verified inbound movement. Keep payout/refund direction and amount checks.

Proof state also lacks invalidation for route/context changes and late responses. Add request cancellation/identity guards. The existing unit tests duplicate the predicate and inspect module exports; replace/extend them with tests that call production verification and exercise actual transitions. A failed synthetic fixture is not evidence that the immutable contract emits those impossible logs; it exposes the verifier's acceptance boundary.

### F06 — Medium/high: unavailable data is presented as nonexistent money/pools (synthetic + source)

- Pool and Proof render “not found” on RPC failure. Separate invalid ID, confirmed nonexistent ID, loading, transport error and stale cached data; provide retry.
- An undefined refund-claim read displays “This wallet has no unclaimed contribution.” Render loading/error until a successful read proves zero; otherwise a contributor may believe their claim disappeared.
- Closed-state copy uses the current wallet's contribution instead of pool totals to distinguish no contributions from all refunds claimed. Use pool-level history.
- Create accepts the zero recipient before requesting the wallet; the contract will reject it. Validate zero/self/malformed destinations before simulation/signing.
- Explore lacks explicit interval/block freshness while Pool polls every 12 seconds. Require refresh after confirmed actions and prove idle expiry transitions with a controlled test and later live observation. Do not add a manual finalization requirement.

### F07 — Demo/usability: the golden flow needs reachable evidence (source)

The pool screen has no share-link control or transaction activity list; buildShareLink exists but is unused. Proof requires the user to obtain and paste a hash separately. Within the existing five screens, add a copy/share pool link and an action-success link to Proof prefilled with the **confirmed** transaction. Keep a clear receipt/history path after navigation; recover relevant events through bounded deployment-scoped reads or clearly label the limits of local history. Do not fake receipts or add a backend custody service. Keep the wallet-free illustrative walkthrough, with a clear transition to real testnet usage.

## Independent validation at the reviewed source

All captured outputs and the machine-readable summary are under [evidence/functionality-37ee96c](evidence/functionality-37ee96c/validation-summary.json). PowerShell output was decoded to UTF-8, line endings normalized, and trailing whitespace removed for repository readability; messages and exit results were retained. Original captures remain in the ignored local review snapshot.

| Exact suite command | Exit | Pass / fail / skip | Notes |
| --- | --- | --- | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 / 0 / 0, 14 suites | Outside-sandbox retry. Initial sandbox execution crashed before tests (exit -1073740791: home directory detection). |
| `bun run test` | 0 on unchanged warm retry | 32 / 0 / 0, 2 files | Earlier outside-sandbox cold run: exit 1, 31 pass / 1 timeout in a Pool module-import test. Initial sandbox attempt: exit 1 before tests due directory/config access. Assertions/timeouts were not changed. |
| `bun run check` | 0 | Lint 0 errors/warnings; typecheck passes | Not a browser or behavior test. |
| `bun run build` | 0 | Build succeeds | Large chunk warning; largest emitted index chunk about 1.54MB / 497KB gzip. No device performance claim. |
| Independent source probes (command below) | 1 | 9 pass / 14 fail, 23 cases | Deliberately tests missing behavior using unchanged verifier and component handlers with mocked hooks/network/wallet. Not part of the Studio unit-suite count. |

```text
node docs/review-tools/functionality-probes.cjs .review/functionality-37ee96c/snapshot .review/functionality-37ee96c/functional-probes.json
```

The review script is Codex-authored investigative tooling; Studio must write production fixes and regression tests. No contract source or ABI changes were found against d2fecc8. Passing contract tests does not establish Arc-specific wallet execution, full security or frontend correctness.

**Not run:** actual browser rendering/accessibility/mobile/performance, real-wallet testnet golden and refund flows, mainnet deployment or funds movement, submission/video upload. Public HTTP and RPC reads are not substitutes for those checks.

## Completion gates and next action

1. Studio fixes F01-F06 with production-path regressions and F07's minimal share/evidence path; keep the existing artwork and product scope. Exact prompt: [STUDIO_FUNCTIONAL_FIX.md](STUDIO_FUNCTIONAL_FIX.md).
2. Verify the public rebuilt app has the correct testnet identity and all direct routes load. Then human-operated testnet success fixture (1 USDC target, 0.4 + 0.6, explicit payout) and a separate failed-pool refund fixture (0.4 principal returned). These are test scenarios, not mainnet spending approval. Capture every transaction/receipt and user-visible state.
3. After functional acceptance, prepare a mainnet plan with current network/fee checks, reviewed artifact identity, exact actions and a human-selected funds-plus-fees budget. No automatic signing or deployment is authorized here.
4. Complete Studio URL, actual video, public app/repo, mainnet transaction evidence, description, profile and eligibility checks. Recheck the live submission form and deadline when accessible. Submit only after separate approval.
