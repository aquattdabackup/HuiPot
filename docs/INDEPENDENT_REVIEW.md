# Independent review of Studio revision 3f266fc

Date: October 24, 2026 (Asia/Ho_Chi_Minh).
Reviewed Git revision: `3f266fce3d0801a2c9df52cf535b371a33f27522` (`origin/main` as already fetched locally).
Result: the supplied contract suite and production build pass independently. Application correctness findings below keep the app review gate open. This is a review, not an audit or approval for mainnet use.

## Provenance and preserved work

Local `main` remains at `eb7e82b`, one commit behind the fetched `origin/main`; existing local documentation changes were preserved. The new revision was read from Git's existing object database and exported into `.review/studio-3f266fc/snapshot` without merging or creating a worktree. No new fetch, push, deployment, or wallet transaction was performed.

The transport JSON in the fetched commit decoded to a valid ZIP: 266,114 bytes, SHA-256 `66fa4177a65e06d1a880ec4f28c3da7a1bec91dd05472ca59e1acd07f36c507f`, 63 files, 1,137,728 uncompressed bytes. Every entry passed CRC and extraction-path checks. The separate binary ZIP committed alongside the JSON is still the malformed representation; use the validated transport data. The source export and Git snapshot have identical shared-file content after normalizing LF/CRLF. Compiler artifacts exist in the transport archive; vendored forge-std exists in the Git snapshot.

The actual Studio project URL and an explicit Studio revision identifier remain absent from the delivered report. The Git revision identifies the reviewed files, not a verified Studio session. [Transport validation](evidence/studio-export-validated-2026-10-24.json) records the exact inputs.

## Independent execution results

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Dependency restore | Passed with Bun 1.3.14, frozen lockfile, install scripts disabled | package.json and bun.lock remained unchanged. Tools were installed locally under `.review/tools` from packages whose registry metadata points to oven-sh/bun and foundry-rs/foundry; no global installation. |
| Contract compilation/tests | **112 passed, 0 failed, 0 skipped**, eight suites | Forge 1.7.1, solc 0.8.28; [raw log](evidence/independent-forge-test-2026-10-24.log). Includes 103 ordinary unit tests, five fuzz tests at 256 runs each, and four invariants at 256 runs/128,000 calls each. Ordinary EVM only. |
| Production build/type checking | Passed, exit 0 | `bun run build` executes `tsc -b && vite build`; [raw log](evidence/independent-app-build-2026-10-24.log). Bundle-size warning remains informational. Build used no real `.env`, so this does not establish configured wallet integration. |
| Lint | Passed, zero warnings/errors | `bun run lint`; [raw log](evidence/independent-app-lint-2026-10-24.log). Lint success does not establish behavioral correctness. |
| Source/artifact reproduction | Locally compiled full runtime and ABI exactly match exported artifact | [Comparison](evidence/independent-source-build-comparison-2026-10-24.json). Full build-info includes the contract and two OpenZeppelin sources; installed sources match it after newline normalization. |
| Runtime versus chain evidence | 4,081-byte prefix exactly matches saved onchain runtime; metadata differs | Both runtimes are 4,134 bytes. The two-byte trailer declares 51 metadata bytes. Compared against the independently fetched block-68799051 code snapshot, not a new RPC read in this turn. No link/immutable substitutions were needed. |
| App review probes | Defects reproduced in unchanged exported functions/components | [Verifier/input probes](evidence/independent-app-probes-2026-10-24.json), [render probes](evidence/independent-render-probes-2026-10-24.json). Synthetic local fixtures, no network/wallet. These are Codex review instruments, not Studio-authored app tests or testnet evidence. |
| Browser layouts, real wallet flows, Arc runtime semantics | Not run | AC10 and AC12 remain open. No automated app test suite/script was supplied. |

Commands ran in the snapshot directory. The contract command was `forge test --summary --fuzz-seed 0x0000000000000000000000000000000000000000000000000000000000000001`. Initial sandbox attempts failed because Forge could not resolve the Windows user directory and esbuild could not read an ancestor directory. Approved outside-sandbox reruns passed. The initial npm Bun wrapper was not a usable Windows executable with install scripts disabled; the registry-installed native `@oven/bun-windows-x64` executable worked. No validation was disabled.

## Findings requiring Studio fixes

### R1 — High: amount fields silently change the requested amount

Locations: [Create.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Create.tsx#L298), [Pool.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Pool.tsx#L350), [config.ts](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/config.ts#L34). Affects AC09/AC11.

Both input handlers remove every character except digits and a dot before validation. Executing that exact expression and the unchanged parser gives `0,4` → `04` → **4 USDC**, `1e3` → `13` → **13 USDC**, and `-0.4` → `0.4`. A pasted malformed amount is silently converted into a different payable amount. The wallet still requires a signature, but the application must reject or explicitly resolve the input instead of making this conversion. The parser also accepts values beyond uint256.

Preserve the raw input, report invalid syntax, enforce the six-decimal/quantum/uint256 rules, and validate principal plus estimated fees before requesting a signature. Never silently round or rewrite monetary meaning. Add actual input-to-transaction regression tests, including paste operations.

### R2 — High: Proof's overall success ignores failed movement/amount checks

Locations: [Proof.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Proof.tsx#L81), particularly lines 155–190 and the verdict at 407–409. Affects AC13.

`overallValid` checks receipt success, outer destination, event presence, pool ID, and the payout recipient. It does not include the payout amount, native-transfer sender, transfer amount, or matching movement destination. It also never receives the expected pool target. The first system Transfer log is selected without matching the intended movement; refund movement is not matched to its contributor. Independent probes returned `overallValid: true` for missing movement evidence, a wrong movement destination, an unrelated sender, a wrong movement amount, a wrong payout event amount, and an unrelated refund transfer. The UI calls this "All checks passed", including when a detail row is false.

The same verifier rejects a legitimate Contributed receipt because it supports only PaidOut/Refunded. It does not query the RPC's chain ID or bind the response's transaction hash, and JSON-RPC errors can be reported as a missing receipt. Result state is not invalidated when the route/input changes, allowing stale verification to remain visible.

Use the actual ABI and per-action checks for contribution, payout, and refund. Bind chain/deployment/hash/pool/action/amount/destination; correlate the system movement's emitter/from/to/value with that action. Separate confirmed execution from incomplete transfer evidence. Missing evidence must stay partial; mismatched evidence must fail. Reset or invalidate obsolete requests/results. Test these negative cases and valid controls.

### R3 — Medium: successful replacement transactions can be shown as successful pool actions

Locations: [Create.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Create.tsx#L127), [Pool.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Pool.tsx#L67). Affects AC11/AC12.

Create renders "Pool created" for any successful receipt even if no matching PoolCreated event exists. It also decodes logs without checking their emitting address or matching the submitted terms. A local component probe with a successful unrelated/cancellation receipt and no logs reproduced that success screen.

Pool's contribution/payout/refund success also comes directly from receipt-query `isSuccess`, without matching action events/state. The pinned wagmi implementation rejects reverted receipts, so this finding does **not** claim that ordinary reverted receipts become success. It does permit a successful replacement receipt to resolve; the application must distinguish cancellation/replacement from the original action. Receipt-query errors are not surfaced (only submission errors are), chain ID is omitted from the wait hooks, and pending identity is not persisted or reset on account/route changes. A prior refund's success flag can disable another wallet's refund button after switching accounts.

Track the intended chain/contract/account/pool/action, handle replacement/cancellation and receipt errors, require matching expected events/state, and reset obsolete state. Persist only public pending-transaction identifiers for reload recovery. Never automatically re-sign or resend a monetary transaction.

### R4 — Medium: invalid input can throw during render

Locations: [Create.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Create.tsx#L405), [Pool.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Pool.tsx#L22), [Proof.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Proof.tsx#L204). Affects AC09–AC11.

With title, recipient, and deadline populated, a seven-decimal target (`0.0000001`) reaches an unguarded `parseProductAmount` call in Create's review panel and throws instead of showing validation. Both pool routes call `BigInt(poolId)` before their invalid-ID guard; `/pools/abc` and `/pools/abc/proof` throw. All three cases were reproduced by rendering the unchanged components with controlled hook inputs. App has no enclosing error boundary.

Use guarded validation before rendering/parsing, enforce decimal positive IDs within uint256, and show recoverable field/route errors. Test invalid precision, malformed/negative/over-range IDs, and valid boundaries.

### R5 — Medium: pool state does not refresh when only chain time or another wallet changes it

Locations: [Pool.tsx](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/src/pages/Pool.tsx#L25), particularly read queries and the own-transaction-success effect at 99–108. Affects AC11/AC12.

Reads have no block subscription, polling interval, or deadline-triggered refresh. Own-transaction success refreshes them; query refocus/reload may also refresh. A user who keeps the tab active while an underfunded pool expires can continue seeing Active and no refund action. Another wallet's contribution can likewise leave status/capacity stale until another refresh trigger.

Refresh relevant reads through a supported block/polling strategy, use chain time, and revalidate capacity/eligibility before signing. Handle RPC failure distinctly from a nonexistent pool/no claims. Test idle expiry and external-wallet updates.

The actual `useRef` fix updates callbacks in an effect after **every render**, unlike the earlier prose claim that they were captured only at mount. This review does not report stale refetch capture as an established defect. The remaining freshness issue is the lack of a refresh trigger.

### R6 — Medium: required contract coverage is incomplete despite 112 passing tests

Locations: [FuzzInvariant.t.sol](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/contracts/test/HuiPotGoalPool.FuzzInvariant.t.sol), [AC07.t.sol](https://github.com/aquattdabackup/HuiPot/blob/3f266fce3d0801a2c9df52cf535b371a33f27522/contracts/test/HuiPotGoalPool.AC07.t.sol). Affects AC06/AC07.

The stateful handler creates one pool and keeps one `pid`; the multiple-pool checks are deterministic examples, not stateful interleavings across pools. No forced-surplus case exercises the specified `balance >= aggregate liabilities` invariant. The five adversarial tests check reverts/selected state, but do not cover receivers switching from rejection to acceptance and successfully retrying both payout and refund, nor all required rollback accounting/event assertions.

Request those missing tests in Studio and report real coverage. This is a coverage gap, not a reproduced contract theft or accounting exploit. The inspected contract uses fixed recipients, per-pool accounting, global nonReentrant money entry points, and rollback on failed transfers; the existing tests pass. Its specified receiver-lock risk remains.

### Additional integration/documentation gaps

- `src/config.ts:69` retains the WalletConnect `demo` fallback; an empty configured value also remains unusable. Clearly disable unavailable mobile connection while preserving supported injected-wallet use. A WalletConnect ID is not an independent competition requirement.
- The delivered Studio report remaps AC11/AC12 descriptions; restore the original SPEC mapping. AC12 is the local/testnet funded-payout and expired-refund flow, not merely network-switch UI.
- No source change or code fix was authored by Codex. Reproducible Codex review instruments are in [review-tools](review-tools/README.md); product code and product tests remain Studio's responsibility.
- The bytecode evidence's claim that IPFS metadata CIDs change nondeterministically for identical inputs is unsupported. This independent Windows build reproduced the exported full runtime exactly. Obtain the original deployment metadata/inputs if explaining that differing CID; retain the honest prefix-match/full-runtime-difference distinction.

## Review decision and next work

Use [STUDIO_TARGETED_FIXES.md](STUDIO_TARGETED_FIXES.md) for fixes and regression tests in the existing Studio project. The prompt is prepared, not executed. Review the resulting diff and rerun affected checks before the human-operated testnet flows. Keep funded-recipient/refund-recipient incompatibility disclosed; do not silently introduce recovery powers or change D1–D8.

No new source export is needed merely to repeat this review: the current transport problem is resolved. Future evidence should identify the corrected source revision and deliver its changes/logs. Public hosting, actual app-flow proof, mainnet signatures/budget, and submission remain later gates.
