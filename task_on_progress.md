# Task On Progress

## Current checkpoint
- Reviewed Studio output 41c68bd59b608e47d8185235b0b16c1a0e11070a, parent 4bdbe60a8f0189c6f753d383dd2d3000708ac973. Pulled again before this documentation handoff; remote unchanged.
- Standard checks: Forge 120/0/0; Vitest 151/0/0; check/build exit 0. Original/adapted independent probes 29/29. Evidence under docs/evidence/recheck-41c68bd; 45 source/config/contract files matched archived input.
- PF1 still has two P2 gaps: real viem/actual ABI InvalidPoolId cannot decode without count; stale cached zero during in-flight refetch is misclassified as absent. Additional probes 1 pass / 7 fail across these two findings and one positive control.
- PF1-A, failed-refetch/paused cases, Retry/recovery, invalid IDs and five PF2 handler controls pass. publicFlow.test.ts has 39 cases (29 classifier/smoke + 10 structural); full suite 151.
- User approved proceeding. Codex publishes English report, focused Studio handoff, portable probes/logs and corrected memory/AGENTS summary. Application/contract/test source unchanged. Full suites not rerun for documentation-only delivery; portable probe copies rechecked against the reviewed archive.

## Next action and boundaries
1. User runs the short repo-linked prompt in the existing HuiPot Studio project, following the selected manual browser workflow. Read docs/STUDIO_PF1_INTEGRATION_FIX.md. Handoff prepared, NOT executed; no new job/project/token/setup.
2. Studio fixes PFI1/PFI2 and adds real ABI/query-transition tests, preserving PF1-A/PF2 and accepted lifecycle/receipt behavior. Pull and record actual SHA before independent review of its output.
3. No contract redeployment, hosting change or wallet signing. A minimal frontend ABI error declaration is permitted in this focused handoff; deployed Solidity and function/event signatures stay unchanged.
4. Mounted DOM/wallet, human-signed testnet golden flow, live replacement, mobile, measured fee, cross-session evidence and deployed SHA verification remain open. Do not equate test passes with demo/submission acceptance.
