# HuiPot demo and finish checklist

**October 29 update:** user completed pool 7 funding/payout/Proof and pool 8 missed-goal/refund/Proof on the public app. RPC receipt/transfer checks are recorded in [TESTNET_DEMO_ACCEPTANCE.md](TESTNET_DEMO_ACCEPTANCE.md). This supersedes older “not yet run” statements below for these specific flows. Follow [STUDIO_FINAL_FIX_PASS.md](STUDIO_FINAL_FIX_PASS.md) for remaining source/build/test repairs. Other browser and mainnet/submission gates remain open.

Updated October 27, 2026 (Asia/Ho_Chi_Minh). Validated source: c3ae551f1ca541de415b75e4d2718b5b3cc73781; public follow-up input: 80d4778f2da5144d060d51e6f163dcf75c9ae8e6. See [source review](STUDIO_ERROR_DISPATCH_RECHECK.md), [public observations](PUBLIC_POSTDEPLOY_RECHECK.md) and [PF1/PF2 Studio handoff](STUDIO_PUBLIC_FLOW_FIX.md). Actual public deployment SHA remains unverified.

## What works and what “finished” means

HuiPot pools native USDC for a fixed goal, deadline and recipient. Reaching the exact goal enables a caller-triggered payout to that recipient. Missing the deadline without reaching the goal enables each contributor to claim their own principal. Terms cannot change, there is no early withdrawal, and fees are not refunded.

| Level | Current status | Finish condition |
| --- | --- | --- |
| Illustrative presentation | Both landing walkthroughs run successfully | Can explain payout/refund without a wallet; explicitly label all receipts illustrative |
| Automated source validation | At a7a681f/67ac7ea: 120 Forge / 125 Vitest / check / build pass; new independent page probes 21 pass / 8 fail | PF1 stale-count/query-state fixes and production behavioral coverage still required; PF2 source/handler checks accepted |
| Public testnet demo | Configuration warning gone after user redeployment; form and wallet chooser open; no signed flows verified | Correct read/error states, human-signed golden flow/refund/Proof and recorded receipts |
| Competition submission | Not complete | Live requirements/eligibility confirmation, Studio project provenance, required mainnet USDC proof, video and submission artifacts; human approval for funds and submission |

The supplied competition text requires mainnet USDC evidence. A testnet demo does not satisfy that requirement. Current mainnet availability, rules and eligibility must be reconfirmed before that separate phase; do not reuse the testnet address on another chain.

Planning estimate after the code/configuration blockers are actually resolved: allow **30–60 minutes for one guided testnet acceptance session**, including preparing the failed-goal pool first so its deadline runs while testing the successful goal. This is a scheduling allowance, not a completion promise. Wallet/network delays and fixes can extend it. No reliable final submission date can be given before the remaining gates are checked.

## Public configuration checkpoint

The public app is https://hui-pot.vercel.app. After user-reported redeployment on October 27, /create no longer shows the configuration warning. Direct routes render; the wallet chooser opens. Do not repeat configuration or redeploy a contract merely because older evidence says it was missing. Exact Vercel revision/value are still unverified. PF1/PF2 are separately open.

If the configuration gate returns, the expected public build variable is:

```text
VITE_HUIPOT_ADDRESS=0x81a139599d252eb2dc2bbb6c267e911a21264288
```

Apply it to the environment serving the public URL (Production; also Preview if that environment is used for testing), then create a fresh deployment from the intended reviewed revision. Vite embeds this value at build time; changing an environment setting does not repair an already-built bundle. Verify the selected source revision in Vercel. No token or secret needs to be sent in chat. No hosting-account change/redeployment was performed during this review.

After redeploy: open `/pools/1` directly and verify the configuration message is gone. Check `/pools` reads or gives an honest RPC error; an empty pool list alone is not proof of failure. Confirm the app links the intended Arc Testnet contract. Verify reads before connecting a wallet. Record deployed revision and URL.

## Demo A — safe illustrative walkthrough (already exercised)

Open https://hui-pot.vercel.app/#walkthrough.

1. Explain: “One shared expense, fixed terms, one clear outcome.”
2. Goal reached → Add 0.60 demo USDC: progress changes from 0.40/1.00 to 1.00/1.00.
3. Simulate payout: shows 1.000000 USDC to the fixed recipient and an illustrative PaidOut receipt.
4. Deadline missed → Advance demo deadline → Simulate refund claim: shows 0.400000 USDC back to the contributor.
5. Say clearly: this walkthrough moves no funds. Open the real pool/Proof pages only after configuration is repaired.

## Demo B — real testnet flow (human-operated; not yet run)

Use the intended Arc Testnet connection and test funds only. Confirm network/contract and transaction details in the wallet before each signature. The human owns the wallet and signs; this document does not authorize automated signing or mainnet spending. Use only a wallet the operator controls; never share its keys.

The amounts below are the project's testnet fixtures, not a mainnet budget. Keep enough test funds for network fees. Do not assume a fee amount before the wallet displays it.

1. **Prepare failed-goal pool first:** target 1 test USDC, a controlled recipient, deadline approximately 10–15 minutes ahead within the UI's permitted window. Deposit 0.4 test USDC and leave it below target. Record pool ID and contribution hash.
2. **Create successful-goal pool:** title “HuiPot demo — shared workshop”; target 1 test USDC; controlled fixed recipient; deadline comfortably after the demo. Review immutable terms. Sign creation; record pool ID/receipt.
3. **Partial contribution:** contribute 0.4 test USDC. Verify confirmed receipt and ACTIVE status. Confirm that contributing again is enabled. If available, use a second controlled wallet for the next deposit and test the account-change review guard separately.
4. **Complete funding:** contribute exactly 0.6 test USDC. Verify FUNDED, no excess contribution allowed, preserved contribution evidence and enabled payout.
5. **Payout:** review full target and fixed recipient; sign payout. Verify PAID and the actual mined hash. Check the explorer receipt/event and recipient's intended USDC movement. A successful-looking banner alone is insufficient.
6. **Proof:** open the generated `?tx=` link. Verify that the hash prefilled, the pool/recipient/amount agree and available Arc USDC movement evidence passes. Record the actual URL and hash. Negative-input checks must not display success.
7. **Refund recovery:** once the failed-goal pool's on-chain deadline passes, verify REFUNDING and a 0.4 test USDC claim. Sign claimRefund; verify the principal is returned, claimable becomes zero, and refund evidence remains visible. With only one contributor, the pool should become CLOSED after all claims are processed. Fees are not refunded.
8. **Replacement check:** only if a transaction remains pending and the wallet supports it, exercise speed-up/cancellation under human control and verify the actual mined hash. If it cannot be exercised, record “not run”; do not manufacture evidence.

## Evidence to keep

For each real action record: timestamp/timezone, source/deployed revision, network, contract, pool ID, action, account/recipient, principal amount, transaction hash, status/event, explorer URL and relevant Proof screenshot. Use public test accounts; do not record secrets. No real transaction evidence exists from this review.

Record a concise walkthrough: product problem → fixed terms → contribution → funded payout → Proof → failed-goal refund → explicit testnet/unaudited limits. Capture actual Studio build provenance separately. For a contest video, illustrative or testnet footage cannot stand in for required mainnet proof.

## Remaining gates

- Studio: [PF1 follow-up](STUDIO_PF1_FOLLOWUP.md) for stale-count/query-state failures and real behavioral coverage. Preserve PF2 source/handler correction and accepted lifecycle fixes; mounted DOM acceptance remains open.
- Hosting: configuration gate is visibly cleared; still record exact deployed revision/address and verify a real pool read. No repeat redeployment is required solely by this checklist.
- Human + reviewer: testnet signing session, receipts/Proof, multi-wallet and deadline behavior, measured fees; WalletConnect mobile only when configured.
- Submission phase: confirm current program requirements, funding eligibility, authentic Studio project URL, mainnet route/budget/signatures, public builder profile, final video and submission approval.

Do not present “all tests pass” as complete product or submission acceptance.
