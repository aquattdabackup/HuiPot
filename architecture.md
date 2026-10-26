# Architecture Memory

## Project Overview
- Purpose: deliver HuiPot Goal Pool, a focused Studio-built USDC application for the provisionally documented Arc microgrant program. The user selected the concept on October 24, 2026.
- Current checkout: `C:\Users\luong\HuiPot`; older `/workspace/HuiPot` references describe a previous cloud environment.
- Contract: one non-upgradeable multi-pool native-USDC contract. Studio source has five routes (Landing, Explore pools, Create, Pool, Proof); 37ee96c integrates the supplied raster artwork. 2ae2f71 adds deployment validation, SPA routing, a review panel and inbound Proof checks, but acceptance remains partial (docs/STUDIO_FUNCTIONAL_RECHECK.md). Current priority is functional acceptance and competition evidence, not additional visual scope. See docs/FUNCTIONAL_READINESS.md.
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
| `src/pages/Landing.tsx` | Landing, layered SVG RingTorus and local-state success/failure walkthrough; ffc04fb improves the SVG composition but does not include production raster assets |
| `docs/STUDIO_VISUAL_RECHECK.md` | Source-based visual fidelity findings, interaction gaps and exact Studio correction prompt |
| `docs/STUDIO_ASSET_INTEGRATION.md`, `docs/design/assets/` | Supplied-art provenance and composition requirements; Studio integration exists at 37ee96c, rendered acceptance remains unverified |
| `docs/FUNCTIONAL_READINESS.md`, `docs/STUDIO_FUNCTIONAL_FIX.md` | Current competition/functional review and Studio execution handoff, findings F01-F07 |
| `docs/evidence/functionality-37ee96c/`, `docs/review-tools/functionality-probes.cjs` | Independent suite logs, public HTTP/RPC/build-config evidence and synthetic execution of unchanged production functions; distinct from Studio tests |
| `docs/STUDIO_PROMPTS.md` | Prepared, unexecuted A-D browser prompts and required exports |
| `docs/STUDIO_GITHUB_START.md` | Approved repo-based A entry prompt with full-file access checks |
| `src/lib/verifyTxLogic.ts` | Shared production verdict and VerifyResult used by Proof and unit tests; f83a442 rejects zero amounts and mismatched contribution senders |
| `docs/STUDIO_PROOF_RECHECK.md` | Independent f83a442 validation: specific Proof repairs accepted; historical import timeout resolved at 9d75573, other functional acceptance items remain open |
| `docs/STUDIO_RECEIPT_RECHECK.md` | Latest 9d75573 review: 46 tests pass, live chain check repaired; receipt identity/lifecycle and action-transition findings RC1-RC6 remain |
| `docs/LOG.md` | Decisions and actual execution evidence |
| `docs/STUDIO_HANDOFF.md` | Approved browser workflow for later Studio work |

## Invariants
- Explain in Vietnamese; save artifacts in English.
- Studio produces contracts, tests, application code, and fixes. Codex prepares planning documents and reviews evidence.
- The user authorized reliable-functionality/competition review after the visual work. Studio must produce application fixes and regression tests; existing-repository review delivery is authorized. Hosting-account settings and wallet actions retain separate gates.
- Proposed funds model: exact capped target, fixed recipient, immediate payout on successful funding, individual principal refunds only after underfunded expiry, no early exit/cancellation or admin recovery.
- Keep planned, built, tested, deployed, and published states distinct.
- No credential values in files. Mainnet actions require separate human approval and signatures.

## External Integrations and Unknowns
- Arc Studio browser route and repo handoff are approved. Delivered source and logs are in GitHub; source/exports were independently reviewed. The real app-specific Studio permalink remains missing. See `docs/STUDIO_FIX_RECHECK.md` for current findings and evidence; do not treat test passes as app acceptance.
- Competition live page is unverified; supplied text is the provisional planning source.
- Public root https://hui-pot.vercel.app responded HTTP 200, but direct app paths returned 404 and the served JS compiled the write/read contract address to zero. Landing's separate nonzero fallback does not configure the app. Deployed commit/rendered behavior remain unverified. Mainnet evidence remains separately gated.

Last updated: October 26, 2026 (Asia/Ho_Chi_Minh).
