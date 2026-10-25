# Task On Progress

## Current task
- Review the first Studio dark/lime implementation against the user's preferred concept; prepare a precise Studio visual correction.
- Input main/local HEAD: 74576a333c26230ed287c9f871a5e68b83525fd1; initially clean. First implementation: 3a06e17.
- Source-based review complete. Corrected application implementation and rendered review remain pending in the existing human-operated Studio browser workflow.

## Findings and artifacts
- docs/STUDIO_VISUAL_RECHECK.md contains evidence, visual priorities, interaction issues, limits and exact implementation prompt.
- Flat fixed 320px SVG ring, 80px heading cap and missing material/atmosphere explain a substantial mismatch with the reference. Walkthrough composition and Create layout also need work.
- Pause does not reach the walkthrough ring; hero capped +0.40 action can add only 0.20; closed mobile landing header hides network badge.
- Inspected Landing, AppHeader, App, CSS, Create diff, relevant Pool/Proof sections, regression-test source, report and Studio log tails. Reference PNG visually inspected.
- Updated architecture and LOG; no application/contract code changed.

## Validation and limits
- GitHub connector verified input SHA. Browser inventory empty; homepage metadata points to https://hui-pot.vercel.app but web-reader access failed. No live rendered review or deployed revision verification.
- Studio log reports 32 Vitest passes and build success; not independently rerun. New tests are weaker than their behavioral claims.
- Bun absent from PATH and node_modules absent. No new test/check/build/Forge runs, no browser or testnet-wallet tests.

## Remaining
1. Deliver review documents to existing main and verify remote SHA.
2. User runs the short repo-linked correction prompt in the same Studio browser project; no repeated setup/token requests.
3. Review Studio's returned source and actual rendered screenshots/preview. Do not claim visual quality accepted without observing it.

Last updated: October 25, 2026 (Asia/Ho_Chi_Minh).
