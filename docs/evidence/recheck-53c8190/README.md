# Independent acceptance evidence for 53c8190

Reviewed SHA: 53c8190ed2a5dde8e7eb1ed953e15fffa19271f7. See ../../STUDIO_PFI_ACCEPTANCE.md.

Original suite logs: Forge 120/0/0; Vitest 165/0/0; check/build exit 0. Initial environment logs retain the missing-dependency compile failure before the source-identical successful retry. manifest.json confirms 45 source/config/contract files and probe equivalence with Studio output. No dependency trees or generated snapshots are included.

Independent probe results: original 29/29, additional 8/8, transition 18/18. The transition probe is Codex-authored review tooling, not application code or a Studio test. It uses real installed TanStack QueryObserver transitions and synthetic production-page rendering. No DOM mount, live RPC or wallet.

Reproduce after installing locked dependencies and running Forge (which builds the artifact needed by the additional probe):

```text
node docs/evidence/recheck-41c68bd/independent-original-probes.cjs . pf1-original-review-results.json
node docs/evidence/recheck-41c68bd/additional-probes.cjs . pf1-additional-review-results.json
node docs/evidence/recheck-53c8190/transition-probes.cjs . pf1-transition-review-results.json
```

Keep committed baseline evidence intact. The published transition probe changes only default root/output paths from the local review version.
