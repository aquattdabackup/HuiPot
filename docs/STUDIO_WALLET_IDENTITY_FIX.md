# Studio task: correct HuiPot wallet identity metadata

Pull current main and record the full SHA. Read AGENTS.md and docs/METAMASK_ALERT_REVIEW.md. This focused correction concerns truthful application identity; no claim is made that it will remove the MetaMask malicious-site warning.

In src/config.ts, the ConnectKit getDefaultConfig appUrl incorrectly identifies `https://studio.arc.io` as HuiPot's application URL. Set the canonical application URL to `https://hui-pot.vercel.app`. Preserve the actual builder attribution elsewhere; do not impersonate Studio or claim a verified/audited wallet status. Inspect the installed ConnectKit metadata mapping to confirm which connectors receive this field, and report the effect accurately, especially that the MetaMask injected-wallet warning may be independent.

Keep the existing truthful name and description, chain ID 5042002, RPC, contract address, ABI, transaction arguments, value behavior and money rules unchanged. Do not add network calls, tracking, approvals, signing permissions, security-disable instructions or a new domain. Do not redeploy contracts or change hosting.

Run bun run check and bun run build, report exact exit codes, commit/push the minimal Studio-authored change and report full input/output SHAs. No new mirror/source-string test is necessary for a one-field metadata correction. Do not claim the warning is fixed until it is independently observed absent with protection enabled. Keep the external classification review open.
