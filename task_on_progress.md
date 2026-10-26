# Task On Progress

## Current checkpoint
- Independent review complete for 7467d1b51fc89c18e68c49ad57d6394153aad029, pulled first on October 26, 2026 (Asia/Ho_Chi_Minh). Application/contracts/Studio tests unchanged.
- docs/STUDIO_RC_RECHECK.md is the current review and exact next Studio prompt. Evidence: docs/evidence/recheck-7467d1b.
- Forge 120/0/0, Vitest 52/0/0 without import timeout, bun run check exit 0; first attempts all passed. Build not rerun.
- Independent synthetic execution: 26 pass / 5 fail. Remaining failures: repeat partial contribution disabled, wrong payout caller accepted, contribution/refund evidence disappears in three transitions.
- Replacement tracking absent. Installed wagmi 2.19.5 and core 2.22.1 support onReplaced; Studio's stated library limitation is false. Six RC regressions are structural only.

## Next work (Studio-dependent)
1. Run the exact prompt in docs/STUDIO_RC_RECHECK.md through the approved Studio browser workflow; implement fixes and executable regressions there.
2. Pull Studio's next commit, independently rerun suites and behavioral cases, preserve this checkpoint as historical evidence.
3. Browser/testnet wallet AC12, deployed Vercel config/routes, fee validation, EIP-55 display and other open acceptance items remain unverified. Human signs transactions; mainnet budget and submission remain separate gates.
- Do not repeat setup or request tokens. No application fixes outside Studio. Do not claim this prepared prompt was executed.
