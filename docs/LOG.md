# Project log

## October 24, 2026 — document review and Phase 0

### User direction and scope

The user first requested review and revision of the uploaded instruction kit, then supplied the competition announcement text and DoraHacks URL, and subsequently asked to proceed. Started Phase 0 with the reviewed guidance. Did not start ideation, application generation, deployment, publication, or submission.

### Decisions

- Retain HuiPot and its existing checkout. The supplied competition rules do not demand a new project, repository, or name.
- Use the supplied competition text as the planning source with explicit provenance; do not claim the live page has been checked.
- Keep code generation and code fixes in Studio for this submission. Codex prepares specifications, reviews, tests, and documentation.
- Use the explicit phase checklists because the three originally referenced advisory skills are not present.
- Prioritize the working app, Studio provenance, mainnet USDC proof, and complete submission over optional visual polish.
- Do not install a guessed Arc CLI or request credentials before learning the supported tool and authentication route.

### Evidence

- Node `v24.19.0`, npm `11.9.0`, Git `2.52.0`.
- GitHub read check succeeded: remote HEAD and main resolve to `15b8fface4eba991f5d64550517ee11e0f350078`.
- Candidate `arc`, `arc-studio`, and `studio` commands were not found on PATH; the documented executable remains unknown.
- Global npm inventory failed because its configured global package directory does not exist. This did not trigger a speculative CLI installation.
- An independent read-only npm registry query succeeded and returned npm version metadata `12.2.1`. Kept the installed npm version unchanged; used a temporary cache under `/tmp`.
- Name-only credential inspection found `GH_TOKEN`; no values were printed or copied. Existing GitHub read access was reused.
- Requests to Studio, Arc docs, Arc explorer, DoraHacks, and Circle developer docs failed with proxy tunnel HTTP 403.
- Saved the five exact domain additions in the environment configuration draft. The tool confirmed persistence and required publication. Runtime connectivity remains unverified until the settings apply and affected requests succeed.

### Artifacts

- `AGENTS.md`: adopted project guidance.
- `PROMPT.md`: phased delivery brief and gates.
- `docs/REQUIREMENTS.md`: source-qualified competition requirements.
- `docs/sources/competition-user-supplied.txt`: supplied source text.
- `docs/SETUP_STATUS.md`: observations, blockers, and next actions.
- `docs/STUDIO_HANDOFF.md`: browser discovery instructions and exact setup prompt.

### Studio activity

No prompt has been sent to Studio. The discovery prompt in `docs/STUDIO_HANDOFF.md` is prepared only. No Studio project, generated source, tests, screenshots, deployment, or transaction proof exists in this checkout.

### Pending gate

Resolve or explicitly acknowledge the Studio access limitation, review the Phase 0 report, and obtain approval before beginning Phase 1. The next product decision is selection of one idea after comparing the shortlist. Mainnet spending, publishing, and submission remain separately authorized actions.

## October 24, 2026 — follow-up after environment publication

- User reported saving and publishing the settings. Current configuration reports unrestricted networking; preserved that policy without another network edit.
- Retried Studio, Arc docs, explorer, and Circle docs: HTTP 200. DoraHacks now returns HTTP 405; its live terms remain unverified.
- Read official Studio documentation, verified the npm package identity and Node requirement, and installed `@circle-fin/arc-studio-cli@1.2.2` under `/workspace/.tools/arc-studio` with standard integrity verification.
- Verified CLI version, login help, and bundled agent guide. Executed the reusable installation script successfully after the first install.
- Diagnosed Node transport: direct fetch failed; `NODE_USE_ENV_PROXY=1` successfully reached Studio and the CLI authorization page. The unauthenticated API returned the expected HTTP 401.
- Inspected names/presence only for relevant environment bindings and checked existing configuration. No Arc token or cookie binding is present, and `whoami` exits 1 with "Not authenticated". No secret values were printed or written.
- Verified both public RPC chain IDs using read-only requests. Python default User-Agent received HTTP 403; a browser User-Agent succeeded: mainnet 5042, testnet 5042002.
- Confirmed from current docs that Studio auto-deployment is testnet-only; later mainnet deployment needs the separately reviewed human-signature workflow. The workspace preview is not by itself a verified public hosting link.
- Saved a new configuration draft containing the tested install script, CLI activation/start instructions, and the `ARC_STUDIO_TOKEN` requirement scoped to `studio.arc.io`. The save returned `status: saved`, `requires_publish: true`. No token value was supplied; authenticated Studio operations remain blocked pending the secure user action.
- Updated setup status, source qualifications, and browser fallback; added `docs/ARC_TOOLING.md` with exact authentication steps and verified technical references.
- No Studio generation job, app, contract, transaction, or deployment was started. Phase 1 remains behind its user approval gate.

## October 24, 2026 — token entry follow-up

- User reported adding the token. Read the existing draft's credential metadata without values: `ARC_STUDIO_TOKEN` is declared but `has_saved_binding` remains false.
- Checked only variable presence in the running instance: `ARC_STUDIO_TOKEN`, `ARC_STUDIO_COOKIE`, and `ARC_STUDIO_API_URL` are absent.
- Retried `arc-studio whoami` with the installed CLI and `NODE_USE_ENV_PROXY=1`: exit 1, "Not authenticated".
- No credential was available for validation; do not infer that the user's entered token is invalid. The remaining action is to finish secure value saving and apply/publish the configuration, then retry the affected read-only operation.
- Did not add another secret requirement, change network policy, reinstall tooling, or start a Studio generation task.

## October 24, 2026 — saved token and browser fallback

- User reported saving. Configuration now has no pending draft, confirms `has_saved_binding: true`, and reports no binding error. Runtime name/presence-only inspection confirms `ARC_STUDIO_TOKEN` is present.
- Retried `whoami`: exit 1 with its generic "Not authenticated" message. Investigated the underlying requests instead of assuming an invalid credential.
- Authenticated requests to `/api/apps?pageSize=1` and `/api/whoami` returned HTTP 403 HTML. The app-list endpoint also returned HTTP 403 without authentication, using the installed CLI's own User-Agent. Responses had a Cloudflare-related page title. Both Node through the proxy and Python reported HTTP 403. No response bodies or credentials were printed.
- Studio's public homepage and `/cli-auth` also returned HTTP 403 without authentication, while the Arc CLI documentation still returned HTTP 200. The evidence establishes a cloud access failure, not a failed token validation result.
- User reports successful login in their own browser. Proposed continuing through human-operated Studio with Codex-authored prompts, artifact review, and existing phase gates.
- Updated the browser handoff and setup status. No duplicate secret, token replacement, repeated publication, automatic build, or transaction was requested. Cloud CLI access remains unresolved; Phase 1 awaits the user's approval of the Phase 0 browser workflow.

## October 24, 2026 — Windows session and Phase 1 approval

### Authorization and environment reconciliation

- The user explicitly approved Phase 1 using Arc Studio in the browser, instructed not to repeat setup or request a token, and required stopping for idea selection before specifications or code.
- Read `AGENTS.md` and `PROMPT.md` first, then `REQUIREMENTS.md`, `SETUP_STATUS.md`, this log, and `STUDIO_HANDOFF.md`; checked the preserved competition source and `ARC_TOOLING.md`.
- Git status was clean before edits. Current checkout is `C:\Users\luong\HuiPot`; the old `/workspace/HuiPot` records describe a previous cloud runtime.
- Earlier in this conversation, before Phase 1: installed CLI 1.2.2 using `npm.cmd`; npm warned that its postinstall script was not allowed. Version and agent-guide nevertheless succeeded. The user completed login. `whoami` failed in the sandbox and succeeded outside it against `https://studio.arc.io`. No claim is made that the postinstall script ran or that cloud access was repaired.
- During Phase 1, did not reinstall, retry authentication, change credentials, or request token entry. Preserved the user's browser preference despite the earlier successful CLI check.

### Phase 1 work and sources

- The local `arc-idea-forge` advisory skill is absent (`.agents` does not exist); used the explicit Phase 1 fallback in `PROMPT.md`.
- Browser inventory returned no enabled browsers/apps. No Studio prompt was sent. Under the adopted handoff, idea selection is local planning; later Studio work remains human-operated in the browser.
- Re-read the supplied competition text. A fresh live DoraHacks request returned HTTP 405, so contest claims remain provisional and source-qualified.
- Checked primary comparable-product sources: [Kickstarter funding](https://www.kickstarter.com/help/handbook/funding), [Splits protocol](https://splits.org/protocol/docs/), and [Sablier overview](https://docs.sablier.com/concepts/what-is-sablier). These inform differentiation, not Arc integration availability or worldwide novelty.
- Checked the [Studio homepage](https://studio.arc.io/), which describes testnet deployment and excludes Studio signing/funding/submitting mainnet transactions on the user's behalf. Retained the separate human-signature gate.
- Added `docs/IDEA_COMPARISON.md`: 12 concepts with users/problems/differentiators/USDC rationale, exact rubric weights, internal scores, separate feasibility/clarity/risk assessment, six eliminated options, and three recommendations with scope estimates.
- Recommended order: HuiPot Goal Pool, TeamSplit Invoice, One-Delivery Escrow. This is advice only; no idea is selected.
- Updated setup, requirements, tooling environment note, browser handoff, and lightweight project memory to preserve the current gate without erasing cloud history.

### Studio provenance and validation

- Studio project URL: none created or inspected for Phase 1.
- Prompt submitted, resulting revision/export, generated files, and test evidence: none; planning only.
- No specification, design document, contracts, application code, transaction, deployment, publication, or submission was created.
- Validation: rechecked source weights, 12 unique candidates, shortlist/kill-list consistency, and weighted arithmetic; ran `git diff --check`. Application tests/build are not applicable to this documentation-only phase.

### Pending decision

The user chooses one idea or requests a revision. Do not begin Phase 2 specifications or Studio code generation before that choice and the applicable authorization. Do not repeat setup or token requests.

## October 24, 2026 — Goal Pool selected and Phase 2 prepared

### Authorization and preserved work

- The user explicitly selected HuiPot Goal Pool and authorized Phase 2 product specification, interface design, and browser Studio prompts, with a review of scope/spending/refunds before code.
- Initial Git status already contained modifications to ARC_TOOLING.md, LOG.md, REQUIREMENTS.md, SETUP_STATUS.md, STUDIO_HANDOFF.md and untracked architecture.md, IDEA_COMPARISON.md, task_on_progress.md. Preserved that work and the historical cloud/Windows records; no new repository or worktree was created.
- Sandbox command startup failed with a setup-refresh error. Approved read-only commands outside the sandbox allowed inspection; this was a local tool limitation, not a Studio authentication failure. No installation, token entry, login retry, or external generation was performed.
- Rechecked the three optional local skill paths: all absent. Used the explicit Phase 2 design/specification checklist in PROMPT.md, not a claimed execution of arc-ui-craft.

### Artifacts and proposed money decisions

- Added [SPEC.md](SPEC.md): selected problem/audience, one golden flow, one contract/four screens, proposed D1-D8 rules, five states, actor permissions, native-USDC units and accounting, exits/events/external-call risks, AC01-AC13 acceptance/test groups, exclusions, and network/evidence assumptions.
- Proposed fixed target/recipient/deadline, an exact funding cap, permissionless full payout to the fixed recipient immediately on successful funding, and contributor-claimed full-principal refunds after underfunded expiry. No early exit/cancellation, refund after successful funding, platform fee, or privileged recovery. These detailed rules await approval.
- Added [DESIGN.md](DESIGN.md): four routes, text wireframe, tokens/typography/spacing, responsive layouts, components, accessibility, full wallet/transaction/error states, money-rule copy, and honest proof/empty states. No rendered screenshot is claimed.
- Added [STUDIO_PROMPTS.md](STUDIO_PROMPTS.md): exact A-D browser prompts with full-context inputs, expected exports, acceptance checks, raw evidence requirements, and separate contract/app gates. A is for Phase 3 after this review; B-D remain behind the Phase 3 gate.
- Updated README, selection status, requirements, setup/handoff, and project memory to point to the Phase 2 gate.

### Provenance, validation status, and unresolved facts

- All Phase 2 artifacts are Codex-written planning documentation. Studio project URL, submitted prompt, job/revision/export, generated code, build logs, test output, deployment, transaction, public hosting, and screenshots: none created or inspected in this phase.
- A-D prompts: prepared only. Contract/app tests and builds: not run because no generated source/toolchain exists. AC01-AC13 are planned groups, not a test count. No pass/fail/skipped count is invented.
- Documentation validation: checked 14 Markdown files and 40 relative links, paired code fences, conflict markers, and trailing whitespace. Confirmed eight decision rows, thirteen unique acceptance groups, four screen routes, four milestone prompts, and zero generated application/contract source files. The initial broad route-row matcher also counted the "Pool state" table header; corrected it to route rows and the check passed. No product scope change was needed.
- Final documentation review: current checkpoints no longer request idea selection; git diff --check passed. Git emitted an LF-to-CRLF normalization notice for README.md, not a whitespace failure. Manually reviewed deadline priority, no early exit, native units/precision, full-principal refund accounting, failed external calls, and A-versus-B-D phase boundaries for consistency. These are specification checks, not an executed contract review or security audit.
- Network/native-USDC claims reference the earlier October 24 official documentation/RPC snapshot in ARC_TOOLING.md; no new live check was made in Phase 2. Recheck current units before generation and chain/wallet/faucet readiness before use.
- Before generation, validate Studio's supported source/test export and ability to test/review before deployment. If automatic deployment cannot be separated, resolve that limitation before starting. Preserve the user's human-operated browser preference.
- Current competition terms/form, precise official cutoff/time zone, ownership/funding eligibility, public hosting, and reviewed human-signed mainnet deployment remain future verification items. No mainnet budget, signing, publication, or submission is authorized by this phase.

### Pending gate

The user reviews SPEC.md D1-D8, DESIGN.md, and STUDIO_PROMPTS.md, especially immediate payout on goal, immutable destination, no early withdrawal/cancellation, and individual principal refunds only after failed expiry. Wait for that choice/approval before Phase 3 Studio generation. Routine revisions to these planning documents remain within Phase 2.

## October 24, 2026 — GitHub handoff authorized

- After the Phase 2 result and milestone A instructions, the user reported a GitHub connection option in Studio and explicitly asked Codex to push the prepared work and write a prompt for Studio to proceed. This authorizes the existing-repository documentation push and the presented milestone A. No additional confirmation is required for that scope. B-D, mainnet spending, public app/video publication, and submission remain separately gated.
- Preserved all existing changes. The checkout is on main at 0216732; fetched origin and observed zero commits ahead/behind origin/main. GitHub's public API identifies aquattdabackup/HuiPot as public, non-archived, default branch main. No visibility change or new repository is needed. The gh executable is absent; Git is available.
- Re-read official Studio overview, EVM differences, native model, USDC system events, and Studio llms.txt via HTTPS with HTTP 200. Recorded source-qualified findings in ARC_TOOLING.md. Fetched instructions did not authorize tool installation; none was installed.
- Official Studio overview confirms export/push to GitHub, not existing-repo import. Added STUDIO_GITHUB_START.md with the exact prompt to check full repository reads, actual input revision, pre-deployment testing/review/export, and then execute A only. It prefers a supported review branch and falls back to a source export without claiming unsupported sync.
- Confirmed 18 native decimals and 6 ERC-20 decimals for the same balance. Clarified Arc system-emitted native-transfer evidence and runtime/simulation limitations in the spec/design/prompts. D1-D8 money behavior is unchanged.
- Updated current checkpoints to the authorized Phase 3 handoff; historical log entries retain their prior gates. Added a minimal .gitignore for local credentials, signing files, dependencies, and generated local output.
- Studio prompt execution, project/revision/export, contract/app code, test outcomes, deployment, and transactions: none yet. GitHub handoff is preparation, not Studio build provenance.
- Pre-push validation passed: reviewed all 17 intended workspace files, checked 33 relative Markdown links, code fences/conflict markers/whitespace, eight decision rows, thirteen acceptance groups, four screen routes, and four milestone prompts. Four high-confidence credential-pattern checks reported no findings; no unexpected file type was found. Git diff --check passed. Contract/app tests remain not run because no generated code exists.
- GitHub push execution and remote verification are recorded below only after actual success.
