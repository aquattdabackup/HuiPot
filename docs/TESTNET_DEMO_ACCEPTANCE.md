# Human-operated testnet demo — October 29, 2026

The user completed both principal flows through the public HuiPot UI and personally signed the transactions. Codex checked public receipts/events and pool state via https://rpc.testnet.arc.io on chain 5042002. Explorer pages were inaccessible to the web reader; verification used RPC. Contract: `0x81a139599d252eb2dc2bbb6c267e911a21264288`, unaudited testnet deployment.

## Pool 7 — successful funding and payout

Creator/contributor/caller: `0x7719878979FabB28e5C35F9aEB1F4614Bf2a3EEE`. Fixed recipient: `0x2b270B135667f38bB58Fc9376F29c95173641D31`.

- User screenshot showed initial 0.4 USDC contribution, 40%. Its individual transaction hash was not supplied.
- Subsequent contribution: `0x9c714e0155cb0b160a66a29a7f076e354073ba3ed47e04d7278c98c072ac0f5b`. RPC receipt success, Contributed for pool 7 amount 0.6 USDC, total 1 USDC, GoalReached; pool FUNDED. Checked 18:56 Vietnam time.
- Payout: `0xcf550318ea8148d68dae63a1d4d3d38c2b0b98e4bb320cbc1efd032013b3f1f9`. RPC receipt success, PaidOut and Arc system Transfer from contract to the fixed recipient for 1 USDC; pool PAID. Checked 18:57 Vietnam time. Actual fee: 0.001669675 test USDC, not a future estimate.
- User screenshots showed PAID, persistent payout evidence and Proof with All checks passed, PaidOut, pool 7, matching recipient and 1-USDC transfer.

## Pool 8 — missed goal and refund

Creator/contributor/refund recipient: the same `0x7719…3EEE` account. Successful-payout recipient remains `0x2b270…41D31` and receives no refund.

- Creation: `0x177184a3e8a088090fa5f0f4f4b9cacbd0ad95655ec6f837cd65f0e86e79c9c6`. RPC receipt success, PoolCreated 8, goal 2 USDC, deadline October 29 at 19:10 Vietnam time. Checked 19:00 Vietnam time.
- User screenshots showed contribution confirmed for 0.2 USDC, 10%, then REFUNDING with 0.2 claimable. Contribution hash was not supplied. Whether expiry updated automatically or after refresh was not recorded.
- Refund: `0x0b3cb3825d36607b91e809604b1c22afdc6805e274c7389b02ab8f90bc326355`. RPC receipt success, Refunded and Arc system Transfer from contract to original contributor for 0.2 USDC; contributed/refunded totals both 0.2, pool CLOSED. Checked 19:16 Vietnam time. Actual refund fee: 0.002269775 test USDC.
- User screenshots showed CLOSED, persistent refund/contribution banners and Proof with All checks passed, Refunded, pool 8 and matching 0.2-USDC return transfer.

## Scope

These specific human-operated payout/refund/Proof scenarios passed. RPC evidence captured at those times is in `evidence/testnet-demo-2026-10-29/`. Screenshots were inspected in conversation; wallet-panel images are not copied into the public repository.

No exact public deployment SHA was established. This does not prove all browser/keyboard/account-switch/replacement/mobile/cross-session cases, live intentional reverts or automatic idle-deadline behavior. It does not resolve CWR4–CWR6, clear MetaMask classification, constitute an audit or supply mainnet proof. No automated signature was performed.
