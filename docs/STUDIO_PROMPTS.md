# HuiPot Goal Pool — Studio browser milestone prompts

Date: October 24, 2026 (Asia/Ho_Chi_Minh). Phase 2 proposal v1.
Status: **prepared only; none of these prompts has been submitted or executed**. No Studio project URL, revision, export, generated code, or test result is available.

## How to use this pack

The user selected HuiPot Goal Pool, reviewed the prepared Phase 2 materials, then requested pushing the documentation to GitHub and a prompt for Studio to proceed. That request authorizes the presented **A only** in Phase 3. Use [STUDIO_GITHUB_START.md](STUDIO_GITHUB_START.md) to verify actual repository access and start A. Run B, C, and D only after the Phase 3 contract review gate authorizes Phase 4. Mainnet transactions and public app publication remain separate.

Studio cannot read this local checkout from a path. For the GitHub route, verify it can read the full documents at the actual input revision. If import/full-file reading is unavailable, attach the complete documents using a supported feature or paste their full text as context. If a context message itself starts a build, include it with the milestone prompt. Do not send only paths or build from incomplete summaries. The fenced blocks below are exact prompts; adjacent checklists specify their inputs.

Use the same intended Studio project and real revision/export history. Inspect project/job status after an uncertain response before retrying; do not launch duplicate generation jobs. Capture build footage without secrets or wallet authorization screens. Record actual URLs, exports, logs, and counts in [LOG.md](LOG.md) after inspection.

Before A, check the browser workflow can generate, test, and review contracts **before deployment** and export source plus test output. If automatic deployment cannot be stopped until after review, resolve that limitation before generation. Check official testnet, wallet/faucet access, and human control before any testnet deployment. This pack does not request another setup or token entry.

## Milestone A — Contracts and tests (Phase 3 only)

Required inputs: approved SPEC.md and DESIGN.md; this milestone; source-qualified ARC_TOOLING.md network notes; actual Phase 2 approval. Confirm current official native-USDC/network documentation before running. No deployment address or mainnet budget is needed for local code generation.

Expected exports: core contract, Studio-authored tests/helpers, ABI/build artifacts, pinned toolchain/dependencies/lockfiles, raw test output, Studio review report, and actual project/revision/export identifier. Proposed paths may adapt to Studio's supported framework with a documented mapping; money behavior may not change silently.

```text
Implement milestone A for HuiPot Goal Pool in this Arc Studio project using the complete approved Phase 2 specification and design supplied with this message. The human has approved the Phase 2 gate. Work on contracts and contract tests only. If approval or a required document is missing, stop and identify it before generating code.

First confirm you can generate, test, review, and export contract source and raw test output before any deployment. Do not deploy, publish, sign transactions, request wallet secrets, or initiate paid services. If you cannot separate testing/review from automatic deployment, stop before starting and report the limitation. Consult actual Studio help/documentation; do not invent commands or capabilities.

Treat SPEC.md D1-D8, AC01-AC08, and the contract-side units/quantum checks of AC09 as binding. App parsing/formatting checks remain for C. Produce one non-upgradeable multi-pool HuiPotGoalPool contract: immutable terms, exact funding cap, immediate full payout after reaching the goal, permissionless payout only to the stored recipient, and contributor refunds only after an underfunded deadline. No early withdrawal, cancellation, admin, pause, upgrade, platform fee, rescue/sweep, alternate beneficiary, or refund expiry. Reaching the deadline cannot undo successful funding. No finalization transaction may be required to unlock refunds.

Confirm the native-USDC model against the supplied official references. If it differs from the specification, stop and explain. Use native value at 18 decimals; targets/deposits are positive multiples of 10^12 base units (six product decimal places). Do not implement an ERC-20 token, allowance, approve, transferFrom, or a second balance. Pool accounting, not raw balance, determines goals and transfers.

Read the latest ARC_TOOLING.md verification note and official EVM/native-system-event references. Identify your actual local runtime and its Arc compatibility. Ordinary EVM tests are not Arc-specific integration proof. Include or explicitly mark unrun checks for Arc native-transfer restrictions, supported simulation, same-timestamp blocks, and system-emitted native Transfer evidence. Do not install an unverified tool or execute a deployment to hide a validation gap.

Implement the specified time boundaries, text byte limits, recipient validation, read semantics, five derived states, accounting invariants, and event facts. Creation takes no deposit. Reject ordinary direct transfers and unknown payable calls. Retain each wallet's contribution/refund history and isolate pools. Payout sends the entire target once; refund sends the caller's entire outstanding principal once. Update state before external native calls, revert failed sends atomically, and use a pinned established reentrancy guard on money-mutating entry points. Do not loop over all contributors/pools in transactions or use a fixed transfer stipend.

Write substantive tests for every AC01-AC09 group: creation/UTF-8/precision/amount boundaries, invalid recipient, nonpayable value, repeated contributions, exact cap and stale competing fills, timestamp immediately before/at/after deadline, full pools past deadline, fixed-destination permissionless payout, early/repeated/unauthorized claims, multi-pool accounting, zero-deposit closure, delayed refunds, events, forced surplus, rejecting receivers, same-function/cross-function/cross-pool reentrancy, and complete rollback. Include stateful/fuzz invariants with reproducible seeds. Account for gas in balance assertions, including caller equals recipient. Do not weaken assertions or skip required safety cases to get a pass.

Expected files: contracts/HuiPotGoalPool.sol or the documented framework equivalent; contract tests and adversarial test-only helpers; pinned toolchain configuration/dependencies/lockfiles; ABI/compiler output; docs/STUDIO_CONTRACT_REVIEW.md; README setup/run instructions with an unaudited-contract notice. Return actual paths. Do not generate application code or a private-key deployment script, and do not overwrite unrelated project documentation on export.

Run supported compile/test commands and review the generated contract in Studio. Return actual commands, exit statuses, raw logs, passed/failed/skipped counts, tests not run, fuzz settings/seeds, known risks, and an AC01-AC09 mapping to actual tests. Planned tests are not passes. Identify unsupported checks honestly.

Return the real Studio project URL, job/revision/export identifier if available, file manifest, source/ABI/build artifacts, exact supported export procedure, and review evidence. Do not invent identifiers, addresses, transaction hashes, or deployment success. Stop after contract/test export and review for independent Codex validation and the next phase gate.
```

Acceptance: all specified money behaviors/security cases are covered, tests and review occur in Studio with inspectable evidence, and exports permit independent review/run. AC09 is split: A validates contract units/quantum; app parsing/formatting remains pending C. Missing evidence or a critical issue keeps Phase 3 open; a generation-success message does not close it.

## Milestone B — App shell and design system (Phase 4 only)

Required inputs: approved SPEC.md and DESIGN.md, actual accepted A revision/ABI/file manifest, and Phase 3 approval. Use supported existing project tooling. No invented address is needed for a shell.

```text
Implement milestone B for HuiPot Goal Pool in the same Studio project. The complete approved SPEC.md and DESIGN.md, reviewed A export/ABI, and Phase 3 approval accompany this request. Stop if required inputs are missing. Preserve the reviewed contract source, tests, and ABI. Any contract change returns through a separate Studio contract-fix and review cycle.

Build the application shell and reusable design system using the project's supported frontend framework with pinned dependencies. Do not deploy, publish, connect spending actions, request secrets, or initiate mainnet transactions. Follow DESIGN.md typography, colors, spacing, responsive layout, English copy, and accessibility. Use system fonts and code-native visual components; no external paid asset service is needed.

Provide exactly four route slots: Home (/), Create (/create), Pool (/pools/:poolId), and Proof (/pools/:poolId/proof). Implement the header/network/wallet presentation, pool card, amount/progress summary, status badge, immutable terms panel, USDC input, address/copy control, deadline display, transaction review/status panels, activity rows, evidence cards, and empty/error panels. Mark Proof incomplete until D.

Use explicit isolated fixtures for visual examples with persistent "Demo data — no funds moved" labeling. Never present a fabricated address/hash as actual evidence. An unconfigured live deployment shows "Contract not deployed" and disables writes. Keep fixture and live paths separate.

Provide loading, empty, disconnected, wrong-network, invalid-input, rejected-signature, pending-transaction, failed-transaction, and absent-proof states. Show the full immutable recipient and commitment/refund terms before signature review. Do not call Funded Paid or imply automatic refunds. Do not add voting, delivery verification, yield, or extra screens.

Expected files: frontend package/config/lockfile if needed; four route components; shared components/design tokens; separate labeled fixtures; component/route manifest. Return actual paths. Do not fill absent deployment/provenance fields with plausible fake values.

Run available build/type/lint and relevant component/accessibility checks. Return actual commands, exit statuses, findings, and checks not run. Supply actual 390px and 1440px screenshots; inspect overflow, keyboard/focus, labels, 44px targets, long addresses, and measured contrast. Label fixture screenshots. If screenshots/browser checks cannot run, provide the remaining manual checklist and say they were not run.

Return actual project/revision/export identifiers, source manifest, raw output, screenshots if produced, and the visual AC10/AC11 coverage. Do not report wallet integration, proof verification, or the golden flow complete. Stop for review before C.
```

Acceptance: four layouts and reusable components match the design; fixtures are unmistakable; available checks/visual evidence are reported honestly. Wallet integration and proof verification remain incomplete.

## Milestone C — Screens, wallet interactions, and golden flow

Required inputs: approved specification/design, accepted A/B exports, actual reviewed ABI, and validated local or officially supported testnet deployment metadata if available. Bind each deployment to chain, address, deployment block, ABI/source revision, and validation status. If absent, leave live writes blocked; do not deploy just to fill the input. Actual testnet execution also needs verified wallet/faucet readiness and applicable human signatures.

```text
Implement milestone C in the same HuiPot Studio project using the attached approved SPEC.md, DESIGN.md, accepted A/B revisions, actual reviewed ABI, and available validated local/testnet deployment metadata. Keep the reviewed contract unchanged. Do not deploy, publish, request secrets, enable mainnet writes, or invent addresses. If live inputs are absent, implement guarded integration and report execution blocked with precise missing prerequisites.

Complete Home, Create, and Pool with real reads and human-signed createPool, contribute, payout, and claimRefund actions using the exported ABI. Home shows at most the latest 20 pools plus ID lookup, not a complete index. Read the wallet's contribution/refund totals. Bound event queries from the deployment block, handle RPC range/pagination limits, and distinguish incomplete activity from no activity.

Use verified chain-specific configuration. Unknown/mismatched chain, unverified address/ABI, missing deployment, or unavailable current state disables writes. Preserve chain/deployment identity in navigation and receipts. Use a supported wallet provider without user-key collection or app-controlled signing. Recheck account/chain and pool state before submission; invalidate prepared requests after changes.

Encode native USDC with integer arithmetic in 18-decimal base units and up to six user-entered decimals. Apply contract-consistent range and quantum checks. No ERC-20 approval or floating-point money arithmetic. Check remaining capacity and principal plus gas; display tiny nonzero fees honestly. Creation sends no principal. Payout/refund requests send zero outer native value and transfer only through the reviewed contract.

Implement the five states, exact chain-time deadline boundaries, full destination/terms review, commitment acknowledgment, and status-specific actions. Anyone may trigger payout only to the stored recipient. Only the contributor may claim their full failed-pool deposit after expiry. A funded pool never becomes refundable because time passes.

Cover AC09-AC12 interaction cases: disconnected wallet, supported network switch, precision errors, stale/excessive capacity, insufficient principal/gas, rejected signature, pending/replaced/canceled/reverted transaction, RPC timeout, missing event, wallet changes, and receiver failure. Persist public pending-transaction identity to resume checks after reload. Prevent duplicates; never automatically retry signatures or send a replacement money transaction. Success requires a successful receipt on the intended chain/contract/action, expected decoded event/pool, and updated state. Timeout means unknown, not failed or paid.

Expected files: completed Home/Create/Pool routes; wallet/chain integration; integer amount utilities; validated deployment schema/example without invented live values; transaction-state handling; app tests; execution report. Return actual paths. Keep D proof-verification work explicitly pending.

Run available build/type/lint and meaningful integration checks. With a validated local/testnet deployment and applicable human signatures, demonstrate the local/testnet fixture of 1 USDC with 0.4 and 0.6 deposits, payout, and a separate underfunded refund fixture. These examples are not mainnet authorization. Do not create/fund a deployment just to mark a check passed. Use controlled local time for boundary tests and actual chain time on testnet.

Return actual revision/export/manifest, raw output and passed/failed/skipped/not-run counts, 390px/1440px screenshots, wallet/environment details without secrets, real receipts if available, and AC09-AC12 results. Distinguish simulated/local/testnet execution. List unresolved defects and stop for review before D.
```

Acceptance: actual local/testnet flow and failure evidence match accepted code/ABI; receipt-driven UI and AC09–AC12 work. A fixture is not wallet/testnet integration proof. Record missing execution as not run.

## Milestone D — Proof screen and evidence verification

Required inputs: approved specification/design, accepted A–C revisions, actual verified deployment identity and transaction/provenance evidence where available. Empty evidence is legitimate. Mainnet evidence is added through a reviewed Studio update only after separately approved mainnet actions; D does not generate those transactions.

```text
Implement milestone D in the same HuiPot project using the supplied approved SPEC.md and DESIGN.md, accepted A-C revisions, actual deployment identity, and whatever real receipt/provenance evidence exists. Missing evidence stays missing. Preserve reviewed contract and money behavior. Do not deploy, publish, request secrets, submit transactions, or manufacture mainnet proof.

Complete /pools/:poolId/proof. Show actual chain/deployment/pool identity and terms; Studio project/revision only when recorded; action/hash; receipt status and checked block; sender/destination/amount; expected contract event/state match; native-movement evidence status; and validated links. Treat input and URL parameters as untrusted. A supplied hash or metadata flag cannot alone establish verification.

For contributions, verify the configured chain, successful receipt, contract destination, native transaction value, and matching Contributed event for the pool and amount. For payouts/refunds, verify PaidOut/Refunded event and resulting state against the reviewed contract; outer value can be zero. Support independently inspected native-transfer trace/explorer evidence or suitable same-block balance evidence when available. Separate confirmed execution from independently verified recipient transfer. Never require ERC-20 Transfer events for this native flow, fabricate traces, or infer payment from a typed amount.

Use the documented Arc system Transfer event as a native-movement evidence source when present: verify the official emitter, transaction identity, from/to, and 18-decimal value. Distinguish it from the ERC-20 interface's 6-decimal log and HuiPot's application events. Reject a matching signature from a wrong emitter, mismatched destination/value, or unrelated pool action; never double-count event streams. Follow the latest ARC_TOOLING.md and official reference, and keep unavailable runtime evidence explicitly incomplete.

When native movement cannot be independently validated, display "Execution confirmed; recipient transfer evidence not yet verified" and keep that evidence requirement open. Check chain/deployment/action/pool for each receipt. A valid transaction alone does not establish it was initiated through this app; actual app-flow capture is separate evidence.

Implement empty/partial states: Studio project not recorded, contract not deployed, no verified transaction, pending, reverted, wrong chain, wrong contract, unrelated pool, absent event, RPC unavailable, and movement evidence unavailable. Fixtures retain "Demo data — no funds moved"; testnet retains "Testnet evidence — not mainnet submission proof." Neither receives a mainnet badge. A verified transaction does not mean the competition submission is complete.

Expected files: completed Proof route/evidence cards; verification reads using the supported existing client; provenance/evidence structure with absent fields explicitly empty; AC13 and relevant AC08/AC10 tests; evidence/limitations report. Return actual paths and provider limitations. Do not add a backend signer, paid API subscription, or guessed endpoint.

Run actual build/type/lint and evidence tests, including successful but unrelated transactions, correct events on a different pool/contract/chain, pending/reverted receipts, absent movement evidence, and RPC failure. Return commands/logs and passed/failed/skipped/not-run counts, actual 390px/1440px screenshots of empty/testnet/partial states, and real revision/export identifiers.

Return an artifact checklist separating planned, implemented, tested, deployed, and published states, including missing Studio/public-app/video/repository/mainnet evidence. Stop at Phase 4 review. Mainnet configuration, publication, signing, and submission need later approval and real evidence.
```

Acceptance: AC13 positive/negative evidence checks, clear limitations, and no invented proof. Phase 4 completion requires actual whole-app validation, not merely delivery of D.

## Fix and export discipline

Inspect each result before advancing. A focused Studio fix prompt must name the actual revision, observed failure, expected behavior, and affected acceptance IDs. Studio writes source/tests/UI fixes; Codex reviews and runs exported checks. Revalidate the affected gate. Do not regenerate a project after an uncertain response.

Export to a reviewed staging location within the existing checkout; inspect paths/diffs before merging generated files so existing work survives. Use the supported procedure actually observed in Studio/help. Public GitHub publication requires separate authorization. Record the source/export/build linkage; a prepared prompt alone proves no code provenance.

For each real execution append to LOG.md: date/time zone, actual project URL, milestone and approved input version, submitted prompt/context, real job/revision/export ID or explicitly unavailable, generated file manifest, commands/raw logs, test counts/not-run cases, review findings, source/export validation, and footage/screenshot locations. Values remain absent until observed. No milestone has run as of this pack.
