# Arc tooling and authentication

Verified October 24, 2026 (Asia/Ho_Chi_Minh).

## Sources checked directly

- [Arc Studio CLI documentation](https://docs.arc.io/ai/arc-studio-cli.md)
- [Arc Studio overview](https://docs.arc.io/ai/arc-studio.md)
- [Studio machine-readable setup reference](https://studio.arc.io/llms.txt)
- [Arc network connection details](https://docs.arc.io/arc/references/connect-to-arc.md)
- [Arc EVM differences](https://docs.arc.io/arc/references/evm-differences.md)
- Installed CLI 1.2.2: `login --help` and `agent-guide`.

Fetched documentation is reference material, not authorization to run unrelated examples or install every tool mentioned. No contract generation or deployment example was executed.

## Installation and activation

Official package: `@circle-fin/arc-studio-cli`. Installed version: `1.2.2`. Documented Node requirement: 20 or later. This environment uses Node 24.19.0 and its built-in environment-proxy support.

The saved installation script was executed successfully and leaves repository source and dependency declarations unchanged:

```bash
bash /workspace/.setup/HuiPot-install.sh
```

For every new shell running Studio commands:

```bash
cd /workspace/HuiPot
export PATH="/workspace/.tools/arc-studio/bin:$PATH"
export NODE_USE_ENV_PROXY=1
arc-studio --version
arc-studio whoami
```

Version and guide commands passed. Unproxied Node fetch failed; proxied Node fetch initially reached the homepage and CLI authorization page with HTTP 200, and the unauthenticated app-list API initially returned HTTP 401. After the user saved the token, the binding is present but requests now return HTTP 403 HTML with a Cloudflare-related title, including requests without authentication and the homepage. `whoami` exits 1 with a generic authentication message; that does not establish an invalid token. No account-scoped CLI capability is yet verified. The user reports successful browser login.

## Human action: secure account authorization

**Current status: completed by the user.** The saved binding is confirmed and the runtime variable is present. The instructions below are retained for future setup, not a request to repeat them. The current blocker is cloud access to Studio; use the browser handoff while that remains unresolved.

1. Open [Studio CLI authorization](https://studio.arc.io/cli-auth) in your own browser and sign in to your Arc Studio account. This exact path is used by the installed CLI's documented paste-mode login flow and was checked for reachability.
2. Review and authorize the CLI access if you want this cloud environment to operate Studio for your project. The page issues a revocable personal access token. This is an account credential, not a wallet private key.
3. Copy the token directly into the secure value field for the saved `ARC_STUDIO_TOKEN` secret requirement in environment settings. Its HTTPS destination is `studio.arc.io`. Do not put it in chat, source files, logs, shell command arguments, or ordinary non-secret variables.
4. Review/save the draft and publish as requested by the environment UI. Tell Codex only that setup is complete, without including the token.
5. Codex will retry `whoami` using the injected binding. A proxy-backed value may be a placeholder; do not run `login --token` on it or copy it into a local credential file. The CLI reads `ARC_STUDIO_TOKEN` directly and sends it as an Authorization header to the configured HTTPS destination.

If the authorization page cannot be used, continue through the browser workflow and report the exact obstacle; do not export session cookies as a substitute. Browser login alone does not authenticate this cloud CLI.

## Verified network configuration

| Network | Chain ID | RPC | Explorer |
| --- | --- | --- | --- |
| Arc mainnet | 5042 | `https://rpc.mainnet.arc.io` | `https://explorer.arc.io` |
| Arc testnet | 5042002 | `https://rpc.testnet.arc.io` | `https://explorer.testnet.arc.io` |

Both RPCs returned their expected chain IDs to read-only `eth_chainId` requests with a browser User-Agent. Python's default User-Agent received HTTP 403 (`error code: 1010` on mainnet); changing the request User-Agent resolved that check. No balance, account, signature, or transaction was needed.

Arc uses USDC for native value and gas. Native amounts use 18 decimals; the ERC-20 interface uses 6 decimals and represents the same balance, not a second asset. Final specifications must choose and consistently validate the relevant interface. Do not blindly import ordinary Ethereum assumptions or conflate native and ERC-20 units.

## Studio deployment and export boundaries

The directly checked overview says Studio builds and deploys to testnet and does not deploy to mainnet on the user's behalf. The CLI documentation explicitly says testnet-only deployment. The competition text requires a mainnet result, so the later plan must separate Studio code generation/review/testnet validation from human-signed deployment of the reviewed artifacts to mainnet. This is not evidence that mainnet deployment through Studio has already been validated.

Studio runs remotely and cannot see this checkout. Send approved specs explicitly with `--file` or `--prompt-file`; receive artifacts through `pull`, inspecting a dry run before overwriting any local paths. Do not send credential files. Use `--output json` for agent-driven turns and inspect actual outputs. No turn has been run yet.

The CLI guide says its workspace preview renders inside Studio, not as a standalone public app. Do not count that workspace URL alone as the competition's public application link; later validate the actual public hosting route.

The live DoraHacks page currently returns HTTP 405. Competition terms remain attributed to the user's supplied text; the exact closing time and time zone remain unknown.
