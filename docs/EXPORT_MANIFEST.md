# HuiPot Review Export Manifest

**Archive:** `huipot-review-export.zip`  
**Size:** 258 KB (263,497 bytes uncompressed content)  
**Files:** 62  
**Generated:** 2026-10-24  
**Chain:** Arc Testnet (chain ID 5042002)  
**Deployed contract:** `0x81a139599d252eb2dc2bbb6c267e911a21264288`

---

## Contents

### Contract source and tests
| Path in archive | Description |
|---|---|
| `huipot/contracts/HuiPotGoalPool.sol` | Contract source (solc 0.8.28, cancun, optimizer 200 runs) |
| `huipot/contracts/foundry.toml` | Foundry project config inside contracts/ |
| `huipot/foundry.toml` | Root Foundry config (src=contracts, test=contracts/test) |
| `huipot/contracts/test/HuiPotGoalPool.Base.t.sol` | Shared test base contract |
| `huipot/contracts/test/HuiPotGoalPool.AC01.t.sol` | 27 tests: createPool |
| `huipot/contracts/test/HuiPotGoalPool.AC02.t.sol` | 14 tests: contribute |
| `huipot/contracts/test/HuiPotGoalPool.AC0304.t.sol` | 20 tests: time boundaries + payout |
| `huipot/contracts/test/HuiPotGoalPool.AC0506.t.sol` | 19 tests: claimRefund + multi-pool isolation |
| `huipot/contracts/test/HuiPotGoalPool.AC07.t.sol` | 5 tests: adversarial receivers + reentrancy |
| `huipot/contracts/test/HuiPotGoalPool.AC0809.t.sol` | 18 tests: events + 18-decimal encoding |
| `huipot/contracts/test/HuiPotGoalPool.FuzzInvariant.t.sol` | 5 fuzz + 4 invariant tests |

**Total unit/fuzz tests: 112 — all pass (Forge 1.7.1)**

### Compiler artifacts and build info
| Path in archive | Description |
|---|---|
| `huipot/contracts/out/HuiPotGoalPool.sol/HuiPotGoalPool.json` | Full Foundry artifact: ABI, bytecode, deployedBytecode, sourceMap, rawMetadata, AST |
| `huipot/contracts/out/build-info/85cd82b019729764.json` | Full compiler build-info (solc input/output, all source hashes) |
| `huipot/contracts/out/build-info/9007c0ddd4fe3faf.json` | Secondary build-info entry |
| `huipot/contracts/contract-metadata/HuiPotGoalPool.json` | Circle SCP deployment metadata |

### Frontend source
| Path in archive | Description |
|---|---|
| `huipot/src/App.tsx` | App entry / router |
| `huipot/src/main.tsx` | Wagmi/ConnectKit providers |
| `huipot/src/config.ts` | Arc Testnet chain config, parseProductAmount, formatNativeAmount |
| `huipot/src/contract.ts` | HUIPOT_ABI + HUIPOT_ADDRESS |
| `huipot/src/pages/Home.tsx` | Pool list screen |
| `huipot/src/pages/Create.tsx` | Pool creation form |
| `huipot/src/pages/Pool.tsx` | Pool detail + contribute/payout/refund actions |
| `huipot/src/pages/Proof.tsx` | Full AC13 tx-hash verification screen |
| `huipot/src/components/AppHeader.tsx` | Header with wallet button |
| `huipot/src/components/CommitmentNotice.tsx` | Locking risk disclosure |
| `huipot/src/components/PoolCard.tsx` | Pool list card |
| `huipot/src/components/WrongChainBanner.tsx` | Network mismatch banner |
| `huipot/src/lib/utils.ts` | Status labels, formatAddress, parseOnchainError |
| `huipot/src/lib/share.ts` | Share URL helpers |
| `huipot/src/index.css` | Tailwind + design tokens |
| `huipot/src/vite-env.d.ts` | Vite env type declarations |
| `huipot/index.html` | HTML entry point |

### Build configuration
| Path in archive | Description |
|---|---|
| `huipot/vite.config.ts` | Vite config (host, port, @ alias) |
| `huipot/tailwind.config.js` | Tailwind config |
| `huipot/postcss.config.js` | PostCSS config |
| `huipot/tsconfig.json` | TypeScript config |
| `huipot/tsconfig.node.json` | TypeScript config for Vite node |

### Dependency manifests
| Path in archive | Description |
|---|---|
| `huipot/package.json` | npm/bun dependencies and scripts |
| `huipot/bun.lock` | Bun lockfile (exact resolved versions) |

### Sanitized environment example
| Path in archive | Description |
|---|---|
| `huipot/env.example` | Env variable template, no credentials |

### Documentation and spec
| Path in archive | Description |
|---|---|
| `huipot/docs/SPEC.md` | Full product specification (D1–D8, AC01–AC13) |
| `huipot/docs/DESIGN.md` | Design decisions |
| `huipot/docs/REQUIREMENTS.md` | Requirements |
| `huipot/docs/ARC_TOOLING.md` | Arc tooling notes |
| `huipot/docs/STUDIO_PROMPTS.md` | Original build prompts |
| `huipot/docs/STUDIO_HANDOFF.md` | Handoff notes |
| `huipot/docs/STUDIO_GITHUB_START.md` | GitHub setup notes |
| `huipot/docs/LOG.md` | Development log |
| `huipot/docs/IDEA_COMPARISON.md` | Idea comparison |
| `huipot/docs/SETUP_STATUS.md` | Setup status |
| `huipot/docs/sources/competition-user-supplied.txt` | Competition reference |
| `huipot/docs/STUDIO_CONTRACT_REVIEW.md` | **Full security review report (AC01–AC13 table)** |
| `huipot/AGENTS.md` | Agent notes, deployed addresses |
| `huipot/architecture.md` | Architecture notes |

### Logs and evidence
| Path in archive | Description |
|---|---|
| `huipot/export-logs/forge-test-full.log` | Complete `forge test --summary` output (112 tests pass) |
| `huipot/export-logs/forge-test-summary.log` | Per-suite summary table |
| `huipot/export-logs/forge-build.log` | `forge build` output |
| `huipot/export-logs/forge-review-build.log` | Secondary build log |
| `huipot/export-logs/slither.log` | Slither static analysis output |
| `huipot/export-logs/slither-run2.log` | Slither secondary run |
| `huipot/export-logs/vite-build.log` | Production build output (clean, exit 0) |
| `huipot/export-logs/bytecode-comparison.txt` | Bytecode comparison evidence (body match, CBOR diff explained) |

---

## Excluded artifacts

| Item | Reason |
|---|---|
| `.env` | Contains live credentials — never exported |
| `node_modules/` | Reproducible from `package.json` + `bun.lock` via `bun install` |
| `contracts/cache/` | Build cache — reproducible |
| `contracts/out/` (all except listed files) | Foundry outputs for OZ and test contracts — reproducible |
| `dist/` | Production build output — reproducible via `bun run build` |
| Private keys, seed phrases | Not present in project |

---

## Reproduce locally

```bash
# Install dependencies
bun install

# Compile contract
forge build

# Run full test suite
forge test --summary

# Start dev server
bun run dev

# Production build
bun run build

# Lint + typecheck
bun run check   # or: bash /path/to/arc-studio-helpers/check.sh
```

**Deployment:** The contract at `0x81a139599d252eb2dc2bbb6c267e911a21264288` on Arc Testnet was deployed
via the Circle Smart Contract Platform. Re-deployment from this source requires a funded deployer wallet
and a separate Foundry/SCP deploy step; it is NOT triggered by `bun run build`.
