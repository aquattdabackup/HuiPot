# Start HuiPot Milestone A from GitHub

Date: October 24, 2026 (Asia/Ho_Chi_Minh).
Repository: https://github.com/aquattdabackup/HuiPot
Input branch: main. Record the actual input commit when Studio reads it.
Status: user authorized pushing the prepared documentation and handing the presented Phase 3 work to Studio. This closes the Phase 2 review gate for milestone A. Generation has not run; no contract/app/test/deployment result exists.

## Connection and input check

The user reports that Studio offers GitHub connection. The official [Studio overview](https://docs.arc.io/ai/arc-studio.md), read October 24, documents exporting code by pushing to GitHub; it does not establish import or bidirectional sync of an existing repository. Verify actual file access before generation. A connected account alone proves neither import nor successful export.

Connect only the intended repository using Studio's supported UI. Preserve the existing history and documentation. If Studio can read the existing repo or its full public files, use the prompt below. If it can only export a new Studio project, report that fact before changing the destination repo; use the full-document attachment/paste route in [STUDIO_HANDOFF.md](STUDIO_HANDOFF.md) instead. Do not force-push a generated template over main or create a replacement repository.

## Exact prompt to paste into Studio

```text
Continue HuiPot Goal Pool from https://github.com/aquattdabackup/HuiPot, input branch main.

I approve the documented Phase 2 specification/design and authorize Phase 3 Milestone A: Studio-generated contracts and tests. I have authorized this GitHub documentation handoff. Do not restart ideation or authentication. Milestones B-D, deployment, public app hosting, and mainnet spending are not authorized by this prompt.

First verify you can read the existing repository contents. Report the actual input commit if available. Read these files completely:
1. AGENTS.md and PROMPT.md
2. docs/SPEC.md
3. docs/DESIGN.md
4. docs/ARC_TOOLING.md, including the latest GitHub/native-USDC verification note
5. docs/STUDIO_PROMPTS.md
6. docs/STUDIO_HANDOFF.md and the latest entry of docs/LOG.md

Confirm access by reporting the SPEC.md version, decision D4, and acceptance criterion AC07 from the actual files. If repository import is unsupported, you may read the full files through a supported public GitHub/raw-file route and record that limitation. A GitHub connection or repository name alone is not evidence that you read the files. If full inputs are unavailable, stop and name the missing files; do not reconstruct the specification from this short prompt or generate a generic app.

Check your supported workflow can generate, compile, test, review, and export source/test output before any deployment. If automatic deployment cannot be disabled until after that review, stop and report the exact limitation. Use the verified native-USDC model and distinguish normal EVM unit tests from Arc-specific simulation/integration. Do not install guessed packages or claim unsupported controls.

Then execute only the exact Milestone A prompt in docs/STUDIO_PROMPTS.md with those full inputs. Preserve SPEC.md D1-D8 money behavior: one non-upgradeable multi-pool native-USDC contract, exact cap, immutable recipient/target/deadline, permissionless full payout immediately on goal, and individual principal refunds only after failed expiry. No early withdrawal, cancellation, admin recovery, or ERC-20 approvals.

All contract code, tests, and fixes must be produced in Studio. Preserve existing documents and history. If the GitHub integration supports exporting changes to a separate branch in this existing repo, use studio/goal-pool-contracts; inspect an existing branch/job before reuse. Do not overwrite main, force-push, change visibility, or sync local credential/config files. If branch export is unsupported, provide the supported source export and explain the limitation; do not invent flags or claim a sync happened.

Return the real Studio project URL, actual input and output revision/commit/export IDs where available, generated file manifest, complete source/tests/ABI/build configuration/lockfiles, actual compile/test commands and exit statuses, raw logs, passed/failed/skipped counts, checks not run, AC01-AC09 coverage mapping with the app portion of AC09 pending, and a Studio contract-review report. Append only observed execution evidence to docs/LOG.md.

Stop after Milestone A for independent contract review. Do not build the app, deploy, sign transactions, request wallet secrets, or claim any mainnet/public-app proof.
```

## What to return for review

- Actual Studio project link and input/output revision identifiers, including whether files were imported or read from public GitHub.
- Generated branch/commit or complete source export, with the original documentation preserved.
- Raw test logs, exact commands/tool versions, counts, skipped/not-run cases, and review findings.
- Build footage without credentials. Preserve it during the work; a later script is not a recording.

Code fixes stay in Studio. Codex reviews source and runs applicable checks on actual exports. The Phase 3 gate remains open until that review is complete.
