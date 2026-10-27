# Independent PF1/PF2 review evidence

Reviewed HEAD: 67ac7ea445fcaaa2a7c9cb41ea3ab8c7acc2946f. Studio application fix: a7a681f6025e1ca432cf7ea6f57e82f5574d60f3. Only AGENTS.md differs between those revisions.

- forge.log: 120 passed / 0 failed / 0 skipped, exit 0.
- vitest.log: 125 passed / 0 failed / 0 skipped, five files, exit 0.
- check.log: lint 0 warnings/errors, typecheck exit 0.
- build.log: successful build, exit 0; large-chunk warning retained.
- runs.json: actual command exit codes, durations and log names.
- manifest.json: 42 tracked source/config hashes, verified against Git and unchanged snapshot after validation.
- public-flow-probes.cjs: independent synthetic-hook execution of unchanged production page functions/callbacks; not Studio tests, mounted DOM or live wallet.
- public-flow-results.json: 29 cases, 21 pass / 8 fail; process exit 1. Four failing conditions reproduced on each of Pool and Proof. All five Create controls pass.

Run the probe from repository root with dependencies installed:

```text
node docs/evidence/recheck-67ac7ea/public-flow-probes.cjs . pf1-probe-results.json
```

The recorded run used an exact ignored git-archive snapshot; the report retains its actual command. Regenerated result files are review outputs, not application code. Do not replace the recorded baseline results with a new revision's results.

See ../../STUDIO_PUBLIC_FLOW_RECHECK.md for findings and limitations and ../../STUDIO_PF1_FOLLOWUP.md for the next Studio request. No live transactions or hosting changes occurred during validation.
