# HuiPot Goal Pool

A small group pools USDC for one shared expense. The fixed recipient can receive the money when the target is fully funded; otherwise contributors can reclaim their deposits after the deadline.

Built with [Arc Studio](https://studio.arc.io)

**Status:** Milestones A–C complete. Contract deployed to Arc Testnet. Four-screen app running. Contracts are unaudited; this is a testnet deployment only.

## Deployed contract

| Contract | Network | Address |
| --- | --- | --- |
| HuiPotGoalPool | Arc Testnet | `0x81a139599d252eb2dc2bbb6c267e911a21264288` |

Explorer: https://explorer.testnet.arc.io/address/0x81a139599d252eb2dc2bbb6c267e911a21264288

## What it does

Pools USDC from multiple contributors toward a single shared goal. Terms are fixed at creation: exact funding target, fixed recipient, and deadline. If the target is fully reached before the deadline, anyone can trigger the full payout to the fixed recipient. If the target is not reached by the deadline, each contributor can individually claim back their own deposit. There is no early withdrawal and no cancellation.

## Tech stack

- Smart contract: Solidity 0.8.28, OpenZeppelin ReentrancyGuard, native Arc USDC (18-decimal payable/call)
- Frontend: Vite, React 18, TypeScript, Tailwind CSS
- Onchain: wagmi v2, viem, ConnectKit
- Chain: Arc Testnet (chain ID 5042002, USDC as native gas)

## Development

### Prerequisites

- [Bun](https://bun.sh) 1.x
- [Foundry](https://getfoundry.sh) (for contract compilation)
- Node 20+ (for Foundry toolchain)

### Install

```bash
bun install
```

### Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
| --- | --- |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID (optional; falls back to demo mode) |
| `VITE_HUIPOT_ADDRESS` | Deployed HuiPotGoalPool contract address |

### Run

```bash
bun run dev
```

The app runs on http://localhost:5173.

### Build

```bash
bun run build
```

### Compile contract

```bash
forge build
```

### Typecheck + lint

```bash
bun run check
```

## Four screens

| Route | Description |
| --- | --- |
| `/` | Home — recent pools, pool ID lookup, create link |
| `/create` | Create a new goal pool |
| `/pools/:poolId` | Pool detail — progress, contribute/payout/refund actions |
| `/pools/:poolId/proof` | Proof — on-chain evidence for the pool |

## Docs

- [Product specification](docs/SPEC.md) — money rules, state machine, acceptance criteria
- [Interface design](docs/DESIGN.md) — four-screen design, components, interaction states
- [Requirements](docs/REQUIREMENTS.md) — competition requirements and verification

## Notes

Contracts are unaudited. A funding target does not guarantee delivery of the stated purpose. Mainnet deployment requires separate authorization, an independent audit, and human-signed transactions outside of Arc Studio.
