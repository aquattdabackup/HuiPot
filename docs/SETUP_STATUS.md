# Phase 0 — setup status

## Current checkpoint — October 25, 2026 functional review

The Phase 0/3 descriptions below are historical. Studio source now includes one contract and five screens with supplied artwork, and a testnet contract exists. Setup/authentication should not be restarted. [FUNCTIONAL_READINESS.md](FUNCTIONAL_READINESS.md) records the current source, passing suites, failing functional probes, zero-address public build and direct-route errors. [STUDIO_FUNCTIONAL_FIX.md](STUDIO_FUNCTIONAL_FIX.md) is the next browser handoff. Existing local Bun/Forge and matching cached dependencies were reused for validation; no new token or tool installation was needed. Testnet wallet flows and mainnet evidence are still outstanding.

## Current checkpoint — Phase 3 authorized; GitHub handoff

On October 24, 2026, the user selected **HuiPot Goal Pool**, reviewed the Phase 2 proposal, then requested pushing the prepared work to GitHub and a prompt for Studio to proceed. This authorizes milestone A contract/test generation through the previously approved browser route. [STUDIO_GITHUB_START.md](STUDIO_GITHUB_START.md) is the entry point; actual repo import/read access must be checked. The next gate is review of actual generated contracts/tests before B-D app work. Setup is not being restarted.

The approved scope uses one native-USDC contract and four screens. Contract/app generation, tests, and deployment have not occurred. The existing GitHub repo is verified public; the documentation push is authorized. The three optional skills remain absent; PROMPT.md fallbacks were used. New documentation-only checks for native units/system events and GitHub export are in ARC_TOOLING.md; no new authentication, RPC, or wallet check was performed.

This checkout is now on Windows at `C:\Users\luong\HuiPot`. Earlier in the current conversation, CLI `1.2.2`, `agent-guide`, and `whoami` were checked; `whoami` succeeded outside the sandbox against `https://studio.arc.io`. The sandbox-only authentication check failed. This supersedes the old blanket statement that CLI authentication is unverified **for this Windows session**, without claiming the previous cloud transport problem was repaired. No installation, login, token entry, or authentication retry was performed during Phase 1.

The browser-control inventory exposed no enabled browser/app surfaces during Phase 1. The approved human-operated browser handoff remains usable; no browser generation job, project, or source export was inspected or created. Product planning is not blocked by browser automation availability.

The sections below retain the earlier **cloud Phase 0 history**. Their `/workspace` paths, proxy settings, and token-binding observations do not describe the current Windows runtime.

## Historical cloud setup observations

Checked: October 24, 2026 (Asia/Ho_Chi_Minh).

Current status: local prerequisites and Arc Studio CLI 1.2.2 are installed; the token binding is saved and present in the running environment. Cloud access to Studio is now blocked by HTTP 403 HTML responses bearing a Cloudflare-related page title. The user reports successful browser login. The proposed development route is therefore human-operated Studio in the browser with Codex preparing prompts and reviewing exported artifacts. Cloud CLI authentication and generation remain unverified. No application has been built or deployed.

Latest authentication follow-up: after the user saved, the configuration read showed `draft_id: null`, `has_saved_binding: true`, and no credential binding error. Name/presence-only inspection found `ARC_STUDIO_TOKEN` present. `whoami` still exited 1, but direct diagnostics found HTTP 403 from Studio both with and without an Authorization header. Studio's homepage and authorization page also returned HTTP 403; Arc CLI documentation remained HTTP 200. No evidence establishes that the token is invalid. Do not ask the user to repeat saving, replace the token, or create a duplicate requirement to address this access failure.

## Prepared

- Adopted the reviewed project guidance as `AGENTS.md` and the phased brief as `PROMPT.md` after the user asked to proceed.
- Recorded the supplied competition rules and their provenance in `docs/REQUIREMENTS.md`; retained the supplied text in `docs/sources/competition-user-supplied.txt`.
- Preserved the existing checkout, initial commit, and README. Did not create a new repository or worktree.
- Prepared a browser fallback in `docs/STUDIO_HANDOFF.md`.
- Created `docs/LOG.md` to track decisions, verification, and future Studio prompts.

## Observed tools and access

| Check | Result | Meaning |
| --- | --- | --- |
| `node --version` | `v24.19.0` | Compatible with the documented CLI requirement of Node 20+. Node 24's environment-proxy support is used in this cloud setup. |
| `npm --version` | `11.9.0` | npm is available. |
| `npm --cache /tmp/huipot-npm-cache view npm version --registry=https://registry.npmjs.org` | Exit 0, returned `12.2.1` | Registry metadata access works. This did not install or upgrade npm or establish Studio package availability. |
| `git --version` | `2.52.0` | Git is available. |
| `git ls-remote origin HEAD refs/heads/main` | Both point to `15b8fface4eba991f5d64550517ee11e0f350078` | Read-only GitHub access works with existing authentication. No new GitHub token is needed for this operation. |
| Arc Studio installation | `@circle-fin/arc-studio-cli@1.2.2` installed under `/workspace/.tools/arc-studio` | Official package identity confirmed from Arc documentation; npm integrity verification retained. |
| `arc-studio --version` / `agent-guide` | Version `1.2.2`; both exit 0 | CLI executable and bundled guidance work. Installation script was executed successfully after the first installation. |
| `arc-studio whoami` | Exit 1, "Not authenticated" | This message masks HTTP 403 access failures; token validity is unresolved. |
| `npm list --global --depth=0` | Failed with ENOENT for `/home/agent/.local/lib` | The configured global npm package directory does not exist. This inventory failure is not proof that npm installation or a specific CLI is broken. No directory or package was created to guess a fix. |
| Exported credential names | `ARC_STUDIO_TOKEN` now present; `GH_TOKEN` was present in the earlier check | No values were printed or copied. |
| Saved credential requirement | `ARC_STUDIO_TOKEN`, scoped to `studio.arc.io`; saved binding confirmed | Secure user entry is complete; no further save or token replacement is currently requested. |
| Arc/competition HTTPS access | Studio previously HTTP 200, now HTTP 403 including unauthenticated pages; Arc CLI docs currently HTTP 200; last DoraHacks result HTTP 405 | Cloud Studio access is blocked; live competition verification remains incomplete. |
| Node HTTPS | Unproxied fetch failed; `NODE_USE_ENV_PROXY=1` reached Studio HTTP 200 | Export this setting for CLI commands so the platform proxy is used. |
| Studio API transport | `/api/apps?pageSize=1` and `/api/whoami` return HTTP 403 HTML; app-list endpoint also fails without authentication | Tested Node and Python transports. The response is not an application-level token validation result. |
| User browser access | User reports successful login to `https://studio.arc.io` | Supports a human-operated browser fallback; no Studio project or generated output has been inspected yet. |
| Arc RPC read checks | Mainnet chain ID 5042; testnet chain ID 5042002 | Read-only `eth_chainId` responses match the official network documentation. Python default User-Agent received HTTP 403; browser User-Agent succeeded. No transaction was sent. |

The three advisory skills named in the original kit are absent. The adopted brief provides fallback checklists and does not claim those skills were executed.

## Configuration and publication

A configuration draft was successfully saved with these custom allowed domains:

- `studio.arc.io`
- `docs.arc.io`
- `explorer.arc.io`
- `dorahacks.io`
- `developers.circle.com`

The existing package-manager preset was preserved. The previous custom domain list was empty. No credentials or unrelated settings were added. The save returned `status: saved` and `requires_publish: true`.

The user subsequently reported saving and publishing. The latest configuration read reports unrestricted networking, and current requests confirm restored access to the Arc sites. This agent did not broaden the network policy in the follow-up turn. The current observed policy was preserved.

The tested `install_script`, CLI activation/authentication guidance in `start_skill`, and the `ARC_STUDIO_TOKEN` requirement were saved. The user subsequently saved the credential. The latest read has no pending draft and confirms the saved binding; the running instance confirms variable presence. No additional configuration edit is needed for the observed HTTP 403 issue. CLI authenticated access is still not verified.

The install script is also at `/workspace/.setup/HuiPot-install.sh`; it pins CLI 1.2.2 and installs outside the checkout. There is no application dependency manifest or application service yet. New-task restoration and authenticated generation have not been verified.

## Historical next work at the Phase 0 gate

1. Review the Phase 0 result and approve continuing with the browser route: the human operates Studio, Codex prepares milestone prompts and reviews actual exports. The browser login is user-reported; generation is not yet validated.
2. Retest cloud CLI access only after a meaningful access change or new diagnosis. Do not loop requests, change credentials without evidence, or bypass the access challenge. Cloud CLI access is an unresolved limitation of this route, not a prerequisite for comparing ideas.
3. Preserve the distinction between Studio's documented testnet-only deployment capability and the competition's required mainnet result. A separate human-signed mainnet plan remains necessary. Continue to mark the exact competition cutoff/time zone unresolved.
4. Present Phase 0 results at its gate. With approval to proceed, Phase 1 will compare 12 concise ideas and recommend three; the user selects one before specification or code generation.

Only when relevant to the chosen workflow will the user need to provide a public builder profile, clarify prior project funding, authorize public hosting/repository publication, or approve a spending budget. No wallet secret is needed at any point.
