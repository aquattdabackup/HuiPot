# HuiPot Goal Pool

A small group pools USDC for one shared expense. The fixed recipient can receive the money when the target is fully funded; otherwise contributors can reclaim their deposits after the deadline.

Built with [Arc Studio](https://studio.arc.io)

**Status:** Studio delivered the contract and four-screen application; an unaudited Arc Testnet deployment is recorded below. Independent recheck of `307d862` passed 120 contract tests, build/typecheck, and lint, but application proof/transaction-state findings remain open. Browser and testnet user flows are not independently validated. See [the fix recheck](docs/STUDIO_FIX_RECHECK.md); this is not mainnet submission proof.

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

- [Bun](https://bun.sh) 1.3.14 (used for independent validation)
- [Foundry](https://getfoundry.sh) Forge 1.7.1 and Solidity 0.8.28 (used for independent contract validation)
- Node 20+ for JavaScript tooling; Foundry uses its own native toolchain

### Install

```bash
bun install --frozen-lockfile
```

### Environment variables

Copy `env.example` to `.env` and fill in:

| Variable | Purpose |
| --- | --- |
| `VITE_WALLETCONNECT_PROJECT_ID` | Required for WalletConnect/mobile. Missing/empty values now omit that connector; mobile operation is untested. Whitespace-only configuration still needs validation. |
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

### Compile and test the contract

```bash
forge build
forge test --summary
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

- [Independent review](docs/INDEPENDENT_REVIEW.md) ? reproduced findings, checks, and limits
- [Targeted Studio fixes](docs/STUDIO_TARGETED_FIXES.md) ? next executable prompt
- [Validation evidence](docs/evidence/independent-validation-summary-2026-10-24.json) ? independent results and linked raw logs in the review
- [Review instruments](docs/review-tools/README.md) ? local reproduction instructions
- [Execution log](docs/LOG.md) ? provenance and delivery history
- [Product specification](docs/SPEC.md) — money rules, state machine, acceptance criteria
- [Interface design](docs/DESIGN.md) — four-screen design, components, interaction states
- [Requirements](docs/REQUIREMENTS.md) — competition requirements and verification

## Notes

Contracts are unaudited. A funding target does not guarantee delivery of the stated purpose. All product code and fixes remain Studio-generated; Codex review instruments are labeled separately. Mainnet deployment requires resolved critical risks, local/testnet validation, explicit transaction approval and budget, and human wallet signatures. Hosting and submission retain separate authorization.

The user authorized automatic commits and pushes of completed repository work. Credentials, dependencies, caches, and temporary review snapshots are excluded. The original binary export ZIP is corrupt; use `huipot-review-export.transport.json` when recovering the validated source archive.
