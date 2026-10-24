# Assessment of the supplied Studio review report

Latest status: source transport was recovered and the actual Git 3f266fc implementation was independently reviewed and tested. See [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md) for current findings and [STUDIO_TARGETED_FIXES.md](STUDIO_TARGETED_FIXES.md) for the next prompt. The report-only assessment below is retained as history.

Date: October 24, 2026 (Asia/Ho_Chi_Minh).
Basis: the user pasted a report titled "HuiPot Goal Pool — Studio Review Report" dated October 24, 2026 UTC. The reported `docs/STUDIO_CONTRACT_REVIEW.md` file, contract/application source, compiler artifacts, and raw test output have not been supplied. This is an assessment of that report and read-only chain evidence, not an independent source security review or audit.

## Latest follow-up — corrected summary, export still missing

The user subsequently pasted a revised Studio summary (repeated three times in the message; treat this as one supplied report, not three executions).

- Corrected suite counts are 27 + 14 + 20 + 19 + 5 + 18 + 5 + 4 = **112**, including four invariant tests. The arithmetic inconsistency is resolved in the report. Passing results, Forge 1.7.1, seeds, and actual invariant call counts still require raw output; multiplying configured runs/depth/invariants does not independently establish calls executed.
- Studio now reports a matching 8,162-hex-character runtime prefix with differing CBOR metadata. Parsing the previously saved onchain runtime's final two-byte metadata-length field gives 4,134 total bytes, 51 declared metadata bytes, and a two-byte length trailer, leaving exactly 8,162 hex characters. This independently confirms the reported prefix length only. No compiler artifact is available to compare the actual bytes.
- A new build with identical inputs/settings does not inherently change a content-addressed compiler metadata CID. Export both metadata records and build inputs to explain the difference. Keep a proven prefix match, a full-bytecode match, and verified source provenance as separate conclusions; do not infer all three from a reported prefix match.
- Studio reports a new mount-time `useRef` pattern in Pool.tsx, a rewritten Proof screen, an environment example, and passing lint/type/build checks. Source/diffs and the sequence of final checks were not supplied. Capturing refetch functions once may preserve stale query bindings; correctness depends on the actual implementation and account/network/pool transitions. No defect is independently reproduced here.
- The new Proof description mentions PaidOut/Refunded verification, but does not establish the required Contributed path or executed negative tests. A creation transaction does not require a payout/refund transfer log. Per-action evidence requirements must govern results; "all eight checks green for each hash" is not a sufficient universal acceptance rule.
- An HTML button opening `docs/STUDIO_CONTRACT_REVIEW.md` inside Studio is a report link, not a source archive delivered to this workspace. The actual Studio URL/revision and source/artifact/log export remain the immediate prerequisite for independent review.

The initial assessment and corrective prompt below are retained as history. The next handoff should request export of the existing result, not another broad regeneration/review pass. No wallet transactions are proposed before inspecting that result.

## Directly checked evidence

- Git status initially contained the previous local review documentation changes; they were preserved. The checkout still has no generated contract, application, tests, dependency manifests, or compiler artifacts.
- The earlier GitHub check confirmed documentation commit `eb7e82bd7b65ad96cecebdeb71749c8cd6afeb4f` on `main`. No new remote branch check was made during this report assessment.
- At `2026-10-24T03:52:45.5537949Z`, the official testnet RPC returned chain ID `5042002`, the supplied transaction, and a successful receipt (`status: 0x1`) for `0x174bb2ea8914729caf1feb8147384aeef15fd0985e62cbc3f0c07303c25f4486` in block `0x419c0ec`.
- The transaction calls `0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`, with zero outer value. Its receipt has a null top-level `contractAddress`. These facts are compatible with an internal deployment; a null address alone does not establish failure. A log from `0xa3039a54856ed74b5aec999eef3fc954ab010cf6` includes the reported HuiPot address as an indexed topic. Without the emitting contract's verified event definition or a creation trace, do not treat this topic alone as conclusive deployment linkage.
- Runtime code at `0x81a139599d252eb2dc2bbb6c267e911a21264288` remains 4,134 bytes at block `68799051`.
- A read-only `debug_traceTransaction` request with `callTracer` returned JSON-RPC error `-32601`, `method not supported: debug_traceTransaction`. Internal creation linkage remains incomplete through this provider. Do not retry unsupported tracing in a loop or infer a source match from transaction success.
- Raw public RPC evidence is saved in [deployment receipt/transaction/runtime](evidence/studio-deployment-rpc-2026-10-24.json) and [trace capability response](evidence/studio-deployment-trace-2026-10-24.json). The observed system Transfer log in the transaction is not evidence of a HuiPot contribution, payout, or refund.

## Initial report claims and required corrections

| Area | Reported result | Assessment / required evidence |
| --- | --- | --- |
| Studio provenance/export | "Arc Studio (this session)"; source paths listed | Still missing the actual project URL, original/final revision IDs, downloadable source export, and file manifest. A named session or file path is not an inspected artifact. |
| Contract test total | 112 passed, zero failed/skipped | Listed suite counts are 27 + 14 + 22 + 19 + 14 + 10 + 9 = **115**. Reconcile with raw per-suite/per-test results and the actual final command. Do not assume which number is correct or count fuzz executions as distinct tests. |
| Toolchain | solc 0.8.28, OZ 5.6.1, Cancun, optimizer 200; Foundry "pre-installed" | These are report claims. Export the lockfiles/compiler configuration and actual Foundry version, not just installation status. |
| App validation | Lint/type checks reported successful; AC09 app and AC11 marked code-review PASS | No app test logs or production-build result supplied. Static inspection does not satisfy the required behavioral tests. Retain separate code-review and execution statuses. |
| AC13 | Code review + fix PASS, with state-based confirmation and evidence disclosures | Disclosure is required but insufficient. Need actual receipt/chain/address/pool/event verification and negative tests. Mark the aggregate acceptance incomplete until its required evidence is available. |
| F3 effect dependencies | Added `void` to refetch calls and an ESLint comment | `void` changes handling of a returned value; it does not repair dependency tracking. A suppression comment does not establish correctness. Inspect the actual effect, dependencies, refetch identities, and stale wallet/network behavior before accepting the fix. |
| F1 ABI correction | Removed a nonexistent createPool output | Plausible correction, not independently verified. Compare the complete app ABI with the compiler ABI and identify the actual simulation/decoding path; a transaction-submission hash does not itself decode the Solidity return value. |
| F2 rejecting receiver | Medium; spec-acknowledged indefinite lock risk | Consistent with the specified lack of recovery, but not a resolved risk. Do not change D7/D8 silently. Validate intended receiver behavior and retain residual risk: successful receipt once does not guarantee future acceptance or absence of network restrictions. |
| Slither | Four classified findings, exit 255 | Need actual version, full stdout/stderr, and JSON to distinguish detector results from tool failures. Retain exit 255 and classifications honestly; this is not a clean pass or an audit. |
| Source/deployment match | Same-session compile/deploy and tool freshness gate | Neither demonstrates byte-for-byte runtime identity. Need compiler artifact/runtime comparison accounting for metadata, immutable references, and linking. Getter behavior is insufficient. |
| AC10/AC12/Arc runtime | Browser checks, app money flows, Arc simulation not run | Open acceptance/coverage gaps. Ordinary EVM tests and a generic fork do not automatically implement Arc-specific restrictions. |
| WalletConnect | `demo` fallback; mobile untested | A real ID is needed for that mobile integration, not inherently for a tested injected-wallet demo or the supplied grant requirements. Disable unavailable mobile support clearly rather than implying `demo` is valid configuration. |

## Next action

Use the focused prompt below in the existing Studio project. It continues the previously requested correction/export workflow. No new product scope or money rules are proposed. This prompt is prepared only; Codex has not submitted it.

```text
Continue the existing HuiPot review workflow. Resolve the concrete gaps below and deliver the actual artifacts. Preserve the current project, original revision, D1-D8 money behavior, and existing deployment.

Work inside Studio. Do not deploy, publish, push to GitHub, or send wallet transactions. Do not expose credentials. If supported editing/checking automatically redeploys, explain that limitation before editing.

1. Export first: provide the real Studio project URL, actual current revision, and a supported downloadable source export with contracts, tests/helpers, app, compiler artifacts/ABI, configuration, dependency manifests/lockfiles, sanitized environment example, and a file manifest. If any part is unsupported, provide the available artifacts and name the exact missing capability. File paths and a prose report alone are not an export. If a GitHub export already exists, identify its exact repository/branch/commit without publishing new changes.

2. Reconcile the test count. Your listed suites total 115 (27+14+22+19+14+10+9), but the report says 112. Run the applicable suite, attach complete raw results and an actual test inventory, and correct the report to match execution. Separate unique tests, inherited tests, fuzz iterations, and invariant run/depth/call counts. Include reproducible seeds/settings and exact forge --version output. Do not choose a number just to make the table agree.

3. Close the app-validation gap. Run the supported production build and meaningful tests for AC09 app parsing/formatting and AC11 transaction/account/network states. Add or fix necessary tests inside Studio. Include commands, exit codes, complete logs, counts, and explicit not-run cases. Code review is a separate status from an executed behavioral test.

4. Reassess F3 against the real Pool.tsx effect. Prefixing a promise with void and adding an ESLint suppression do not establish correct dependency tracking. Inspect the dependency array, function identities, and account/network/transaction changes; implement the appropriate fix if needed and test stale requests or missed refreshes. Show the relevant diff and rationale. Compare the full frontend ABI against the compiler ABI as part of validating F1.

5. Finish AC13 or mark it incomplete. Showing current Paid state, an emitter address, and a limitation notice does not establish receipt verification. Implement/test the approved Proof behavior: configured chain and deployment, successful receipt, intended pool, expected event, and matching action/amount/destination. For native movement, check an available documented system Transfer log's emitter/from/to/value/transaction against the expected pool action, using native 18-decimal units. Keep unavailable movement evidence explicitly partial. Reject unrelated system transfers in the same transaction. Test wrong chain/address/pool, unrelated successful transactions, pending/reverted receipts, absent events, wrong emitter/amount/destination, and RPC failure. Never promote testnet data to mainnet proof.

6. Compare source and deployment. Obtain the compiler deployed-runtime artifact and eth_getCode on chain 5042002 for 0x81a139599d252eb2dc2bbb6c267e911a21264288. Report exact comparison results and account explicitly for metadata, immutable references, and library linking. Do not silently strip differences and call it an exact match.

The supplied deployment tx is 0x174bb2ea8914729caf1feb8147384aeef15fd0985e62cbc3f0c07303c25f4486. Independent RPC checks found a successful outer receipt calling 0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789; top-level contractAddress is null. This can be an internal deployment. Establish the internal creation linkage using a supported trace or verified factory event definition plus deployment records; do not infer failure from the null field. The public RPC returned method-not-supported for debug_traceTransaction with callTracer, so report the limitation if no other supported evidence exists. A matching getter or artifact freshness gate is not a runtime comparison.

7. Attach actual Slither output/JSON and version. Keep detector findings, accepted design limitations, execution errors, and unresolved findings separate. F2 remains a known custody risk; do not add recipient changes, admin recovery, or other changes to D7/D8. Ordinary EVM/fork tests must not be labeled Arc-specific simulation without evidence of the required runtime semantics.

8. Remove misleading WalletConnect 'demo' behavior if present: when a real project ID is absent, keep supported injected-wallet use available and clearly disable unavailable mobile connection. Test the configured/unconfigured cases where supported. A WalletConnect ID is not a prerequisite for all testnet demonstrations.

9. Run the final applicable checks after fixes and provide the final downloadable export, revision, diff summary, raw logs, and corrected AC table. Capture actual 390px/1440px checks if browser tooling is available; otherwise leave AC10 unexecuted. Keep AC12 unexecuted until human-operated testnet receipts and app-flow evidence exist. Do not submit transactions to fill that gap.

Return concrete artifacts and execution results, followed by only the remaining blockers. Distinguish report claims, inspected source, executed tests, deployed bytecode, and public hosting. Do not declare the review gate complete while these required evidence gaps remain.
```

The next independent contract/app review depends on the exported files. The local assessment has not run contract/app tests and does not approve mainnet use. Human-operated testnet flow validation remains pending after source review; mainnet, hosting, and submission retain their existing gates.
