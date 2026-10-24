# Arc Studio browser fallback — Phase 0

Current route proposed at the Phase 0 gate: human-operated Arc Studio in the browser. The user reports being able to log in. CLI 1.2.2 is installed and the token is saved and injected, but cloud requests to Studio now receive HTTP 403 with and without authentication. No token replacement or repeated save is requested. No Studio project or source export has been inspected yet. The discovery prompt below is retained for reference; its CLI research has been completed locally, so the user need not run it again merely to proceed.

## Collaboration through the browser

1. Approve the Phase 0 browser workflow, then compare ideas with Codex in Phase 1. Select one idea before building.
2. Codex prepares `docs/SPEC.md`, `docs/DESIGN.md`, and the exact Studio milestone prompts in Phase 2; the user approves them.
3. The user creates or opens the intended Studio project, runs each approved prompt in order, and records the project URL and build footage. Do not treat a prompt pasted but not executed as completed work.
4. Share the public project URL and use Studio's supported code export or GitHub integration to provide the generated files and actual test results. Do not share tokens, wallet keys, or credential files. Obtain the separate authorization required before public repository publication.
5. Codex reviews the exported code and evidence, runs applicable checks, and writes focused fix prompts for the user to run in the same Studio project. Code changes remain in Studio; repeat validation after fixes.
6. Deployment, public hosting, video publication, and submission remain separately reviewed actions. Studio's documented automatic deployment is testnet-only; mainnet transactions require human signatures under the approved budget.

The browser route allows product planning to continue despite the cloud access issue. It does not establish that the app has been built, exported, tested, or publicly hosted.

The supplied competition text identifies https://studio.arc.io as the product entry point. Open that link from the competition page in your own browser, follow its normal sign-in flow, and consult its documentation. Do not send authentication tokens, private keys, or seed phrases to chat. If the product cannot be reached or its identity does not match the competition, report the observed issue rather than using an unrelated Arc service.

If Studio supports a documentation/help conversation without starting a build, the following is an exact discovery prompt. Otherwise, use the documentation manually; do not start generation merely to submit this prompt.

> I am preparing a project for "Arc Microgrants: Built with Arc Studio" at https://dorahacks.io/hackathon/arc-microgrants-2/detail. We are in setup only and have not selected the application idea. Do not generate contracts or app code, deploy, initiate transactions, or incur paid build charges for this request.
>
> Please point me to current official documentation for: (1) your CLI package and installation instructions, supported Node versions, authentication method, and a read-only verification command; (2) retrieving the Studio project URL; (3) exporting source code and test output or connecting an existing GitHub repository; (4) reviewing and testing contracts before deployment; and (5) supported Arc networks and human-controlled deployment. Cite actual documentation links and mark unsupported or unknown capabilities explicitly. Do not invent CLI flags or request wallet secrets. If this chat cannot answer documentation questions without starting a build, stop and say so.

Share only public documentation URLs and non-secret command/help text back with Codex. A generated answer is a lead to verify against documentation, not proof that a command exists or a test passed. No app-generation prompt should run until the idea and specification gates are approved.

For later phases, keep a record of the real Studio project URL, prompts used, resulting revisions/source exports, test output, and build footage needed by the submission. The phase-specific generation prompts will be written after the user selects an idea and approves its specification.
