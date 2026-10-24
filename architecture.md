# Architecture Memory

## Project Overview
- Purpose: deliver HuiPot Goal Pool, a focused Studio-built USDC application for the provisionally documented Arc microgrant program. The user selected the concept on October 24, 2026.
- Current checkout: `C:\Users\luong\HuiPot`; older `/workspace/HuiPot` references describe a previous cloud environment.
- Contract: one non-upgradeable multi-pool native-USDC contract. Current Studio source has four screens; the user-authorized redesign specifies five (Landing, Explore pools, Create, Pool, Proof) without changing financial behavior. Studio implementation and independent visual review of the redesign are pending.
- Implementation: `contracts/HuiPotGoalPool.sol`; Vite/React/wagmi/ConnectKit frontend in `src/`; Foundry configuration at repository root. Build: `bun run build`; lint: `bun run lint`; contract tests: `forge test --summary --fuzz-seed 1`.

## Components and Evidence
| File | Responsibility |
| --- | --- |
| `AGENTS.md`, `PROMPT.md` | Project boundaries and phase gates |
| `docs/REQUIREMENTS.md`, `docs/sources/competition-user-supplied.txt` | Supplied rules and verification status |
| `docs/IDEA_COMPARISON.md` | Phase 1 candidates, internal scoring, and shortlist |
| `docs/SPEC.md` | Proposed money rules, state machine, permissions, accounting, acceptance/test matrix |
| `docs/DESIGN.md` | Historical v1 design; retained interaction/error requirements, with v2 visual/layout overrides |
| `docs/REDESIGN.md`, `docs/STUDIO_REDESIGN.md` | Current dark/lime five-screen design and exact browser implementation handoff; v2 overrides v1 visual/layout direction |
| `docs/design/` | Generated visual references, exact image prompts and calculated token contrast; not runtime screenshots |
| `docs/STUDIO_PROMPTS.md` | Prepared, unexecuted A-D browser prompts and required exports |
| `docs/STUDIO_GITHUB_START.md` | Approved repo-based A entry prompt with full-file access checks |
| `docs/LOG.md` | Decisions and actual execution evidence |
| `docs/STUDIO_HANDOFF.md` | Approved browser workflow for later Studio work |

## Invariants
- Explain in Vietnamese; save artifacts in English.
- Studio produces contracts, tests, application code, and fixes. Codex prepares planning documents and reviews evidence.
- The user authorized the dark/lime redesign and existing-repository delivery. Studio browser implementation is the next step; prior A-C builds already exist. Hosting and wallet actions retain separate gates.
- Proposed funds model: exact capped target, fixed recipient, immediate payout on successful funding, individual principal refunds only after underfunded expiry, no early exit/cancellation or admin recovery.
- Keep planned, built, tested, deployed, and published states distinct.
- No credential values in files. Mainnet actions require separate human approval and signatures.

## External Integrations and Unknowns
- Arc Studio browser route and repo handoff are approved. Delivered source and logs are in GitHub; source/exports were independently reviewed. The real app-specific Studio permalink remains missing. See `docs/STUDIO_FIX_RECHECK.md` for current findings and evidence; do not treat test passes as app acceptance.
- Competition live page is unverified; supplied text is the provisional planning source.
- Public hosting and mainnet deployment of reviewed artifacts still need later validation.

Last updated: October 24, 2026 (Asia/Ho_Chi_Minh).
