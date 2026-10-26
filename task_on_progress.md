# Task On Progress

## Current checkpoint
- Independent review complete for 68fa8be1a5a121686afda3290abbeff711d14df6, pulled first October 26, 2026 (Asia/Ho_Chi_Minh). No application/contracts/Studio test changes.
- Current report and prepared Studio prompt: docs/STUDIO_REPLACEMENT_RECHECK.md. Evidence: docs/evidence/recheck-68fa8be.
- Requested suite passes first attempt: Forge 120/0/0, Vitest 80/0/0 (35 + 17 + 28), lint/typecheck exit 0. No import timeout; build not rerun.
- Old probe is incompatible with module extraction (exit 1 before cases); adapted harness preserves expectations and passes 31/31. All five prior behavioral failures are repaired.
- Lifecycle probes: 8 pass / 6 fail. RL1: repriced validation generation invalidated by original-hash success effect, leaving checking (all 3 actions). RL2: cancelled/replaced evidence lacks mined hash links. RL3: no unmount invalidation; old async completion still notifies.
- Studio report overstates acceptance and miscounts tests: new file has 22 behavioral + 6 structural, not 28 behavioral; share/rewrite descriptions again disagree with source.

## Next work (Studio-dependent)
1. Execute prepared Studio prompt for RL1–RL3; keep all 31 accepted cases and Proof checks passing. No application fixes outside Studio.
2. Pull next Studio output; rerun suites and targeted receipt/lifecycle probes, adapting only harness plumbing if refactored.
3. Browser/AC12/testnet wallet, deployed config/routes, fee validation, EIP-55 and cross-session evidence remain outstanding; mainnet and submission retain separate gates.
- No repeated setup/token requests. This prompt has been prepared, not executed. Human controls wallet signatures.
