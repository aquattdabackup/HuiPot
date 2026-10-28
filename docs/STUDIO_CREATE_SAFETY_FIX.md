# Studio handoff: complete Create validation and receipt binding

Pull main and state the full input SHA. Read AGENTS.md, docs/METAMASK_DEEP_RECHECK.md, src/pages/Create.tsx and docs/evidence/metamask-alert/deep/create-path-probes.json. Keep the change within the existing Studio-built app. Do not modify contracts, deploy, sign, change hosting, disable wallet security or claim this clears MetaMask's classification.

## CS1: reject zero recipient before wallet invocation

The production Create validator currently accepts the all-zero address. Reject it with a clear field error before writeContract. Preserve rejection of self-contract and malformed addresses and all existing disconnected/wrong-chain/amount/deadline/acknowledgement guards. Add a behavioral test invoking the actual production path: valid recipient creates one expected request; zero/self/malformed recipients create none. Avoid reimplementing the predicate in tests.

## CS2: bind successful creation to the submitted terms

Capture immutable account, chain, target contract, recipient, native target, deadline and trimmed title/purpose at submission. Validate a successful receipt against that submitted context, not mutable form fields. Require a matching PoolCreated event from the expected contract with all these applicable event fields equal. A receipt with matching creator/recipient but a different target currently yields “Pool created”; reject it. Apply the same requirement to different deadline/title/purpose. Missing context must not relax the creator check. Preserve correct replacement/cancellation behavior and show the actual confirmed receipt hash in evidence links. Never treat a cancellation or unrelated receipt as pool creation.

Use production-path tests for positive confirmation, field mismatches, form/account context changes, missing context and unrelated/cancelled receipts. Clearly separate mocked component coverage from mounted DOM/wallet tests. Do not copy lifecycle logic into a test-only harness.

Run bun run test, bun run check and bun run build; report exact counts and exits. Commit/push the Studio-authored source/tests and updated report. Return full input/output SHAs and any untested browser boundaries. Metadata correction in STUDIO_WALLET_IDENTITY_FIX.md may be included as a separate small commit. No assertion that these defects explain the provider's malicious-site classification is justified by the current evidence.
