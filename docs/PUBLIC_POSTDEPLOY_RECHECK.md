# Public post-deployment smoke check

Date: October 27, 2026 (Asia/Ho_Chi_Minh).
Public app: https://hui-pot.vercel.app
Repository main and local source inspected: 8ddf1ff69655d747c93e81f02c007120fef713ab.
Application previously validated: c3ae551f1ca541de415b75e4d2718b5b3cc73781.
Actual Vercel deployment SHA and configured environment value were not available in this check. No claim of exact deployed-source identity is made.

The user reported completing deployment and requested public testing. Codex made no hosting changes and submitted no wallet transactions.

## Browser results

- /create: direct navigation and reload render the form. The previous "Contract not deployed" warning is absent. This confirms the public configuration gate is open; it does not independently verify the exact configured address.
- /create: title, purpose, recipient and amount inputs accept text. Amount 0.4 displays "= 0.4 USDC on-chain". Date/time automation did not persist into React state, so deadline entry/review is NOT accepted as tested. Test inputs were cleared by reload.
- /create: "Connect wallet to create" opens a wallet chooser with MetaMask and Coinbase Wallet options. No provider was selected or wallet connected. Opening the chooser also surfaced missing-deadline/acknowledgement form errors; inspect whether the connection button unintentionally submits its parent form.
- /pools: direct navigation renders the list page and settles to "No pools yet". This is an observed UI state, not independently verified poolCount evidence.
- /pools/1: direct navigation renders the application, then "Could not reach the network. Please check your connection and try again." Retry returns through loading and reaches the same message.
- /pools/1/proof: direct navigation renders the application, then "Pool #1 not found on this deployment."
- /pools/abc/proof: renders "Invalid pool ID \"abc\"." without a crash.
- None of these directly opened routes returned a hosting 404.

## Finding: inconsistent missing-pool versus network-error handling

Observed public behavior is inconsistent for pool 1: Explore reports no pools, Pool reports a network failure, and Proof reports not found. Raw browser RPC receipts were not captured, so a general Arc network outage must NOT be inferred from the Pool message.

Source at the inspected revision explains a reproducible classification risk:
- Pool.tsx checks poolRpcError before its poolCount-based nonexistence branch.
- HuiPotGoalPool.getPool/getStatus call _requirePool; a nonexistent pool causes a contract revert, which can become a query error.
- Proof.tsx combines poolError with missing-pool conditions and always renders not found, so a genuine transport failure can also be mislabeled in the opposite direction.

Studio follow-up: distinguish invalid IDs, successfully established nonexistence, contract reverts, and transport/RPC failures on both Pool and Proof. Preserve retry for transient failures. Add focused production-path coverage for (1) successful poolCount=0 with getPool(1) reverting, (2) an existing pool loading successfully, and (3) genuine RPC failure. Also inspect ConnectKit's button type inside the Create form so opening wallet connection does not submit the form. Do not alter contract behavior, weaken receipt checks, or re-open accepted lifecycle fixes.

## Limits and next action

No create/contribute/payout/refund transaction was signed or submitted. No real transaction Proof, chain/account switch, wallet rejection, live replacement, mobile wallet, fee measurement or cross-session evidence was tested. End-to-end acceptance remains pending a human-operated wallet flow.

A separate read-only shell eth_chainId request failed DNS resolution (exit 1). This environment failure is not evidence that Arc itself is down. The previous 120 Forge / 112 Vitest / lint / typecheck / build results remain historical source-validation evidence; those commands were not rerun for this browser-only check.

The original configuration blocker is no longer visible. Next: human creates the first tiny testnet pool using their own verified recipient and a future deadline, then shares the actual pool URL/transaction hash for read-only follow-up. Do not ask the human to create pool 1 specifically or assume the new ID.
