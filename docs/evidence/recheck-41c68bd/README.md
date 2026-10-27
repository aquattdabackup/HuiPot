# PF1 integration review evidence

Reviewed source: `41c68bd59b608e47d8185235b0b16c1a0e11070a`.
Codex-authored review instruments, not Studio application code or the Studio test suite.

`runs.json` and the four suite logs are the original exact-snapshot runs: Forge 120, Vitest 151, check/build exit 0. `manifest.json` records the 45-file source identity check. `studio-probes.json` and `independent-results.json` each record 29/29. `additional-results.json` records 1 pass / 7 fail across two defects and one positive control. Do not overwrite committed baseline evidence with a new run.

Install the repository's locked dependencies and run Forge first to generate `contracts/out/HuiPotGoalPool.sol/HuiPotGoalPool.json`. From repository root:

```text
node docs/evidence/recheck-41c68bd/independent-original-probes.cjs . pf1-original-new-results.json
node docs/evidence/recheck-41c68bd/additional-probes.cjs . pf1-additional-new-results.json
```

Expected at reviewed commit: original probe exit 0 (29/29); additional probe exit 1 (1/8). Additional probe uses installed viem readContract and TanStack QueryObserver with deterministic local fixtures; no live RPC, wallet, or mounted DOM.

Published additional-probe changes from the local review instrument are root/output CLI arguments only. Its adjacent page-harness.cjs is the original production-page harness with only production-classifier module loading added. Expectations are unchanged. Published copies were rerun against the exact archived source before delivery and reproduced both baseline counts. Baseline logs can contain local machine paths; no credentials, dependency trees, snapshot archives or generated app builds are included.

After Studio changes inputs/source structure, adapt module wiring only as necessary and report every adaptation. Do not weaken the eight expected outcomes. Add transition tests and unrelated/unknown-revert controls in the Studio suite; the supplied probes are a minimum regression instrument, not exhaustive acceptance.
