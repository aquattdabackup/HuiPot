# Studio mainnet migration report

**Input SHA:** `1b1fa76cec88394bbe8eb46fd6b002b1d04d13ce`  
**Output SHA:** (see commit below)  
Date: November 1, 2026  
Prepared by: Arc Studio (automated preparation only — no deployment, signing, or hosting change)

---

## 1. Verified Arc mainnet parameters

Source: https://docs.arc.io/arc/references/connect-to-arc.md (fetched this session, November 2026).

| Field | Value |
|---|---|
| Chain ID | **5042** |
| Network name | Arc |
| RPC URL | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.arc.io` |
| Native currency | USDC (18 decimals) |
| Testnet flag | false |

Native USDC model: identical to Arc Testnet — 1 USDC = 10^18 native base units, 10^12 quantum, system emitter `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE` emits all Transfer events. The QUANTUM constant and parseProductAmount/formatNativeAmount functions in `src/config.ts` are correct and unchanged.

---

## 2. Existing deployment check

| Address | Network queried | Result |
|---|---|---|
| `0x81a139599d252eb2dc2bbb6c267e911a21264288` | Arc Testnet (5042002) | Contract present (testnet-only deployment) |
| `0x81a139599d252eb2dc2bbb6c267e911a21264288` | Arc Mainnet (5042) | **No contract code** (`eth_getCode` returned empty) |

The testnet address MUST NOT be used as a mainnet deployment. No verified mainnet HuiPotGoalPool contract exists at this time. The app requires `VITE_HUIPOT_ADDRESS` to be set to a verified mainnet contract address; without it, all writes are disabled.

---

## 3. Application changes

### 3.1 `src/config.ts` (rewritten)

- Added `arcMainnet` chain definition with chain ID 5042, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`, USDC 18-decimal native currency.
- Added `VITE_TARGET_NETWORK` env var switch: `"mainnet"` → `IS_MAINNET = true`, anything else (including absent) → `IS_MAINNET = false` (testnet default, no accidental mainnet activation).
- Exported `IS_MAINNET`, `TARGET_CHAIN`, `TARGET_CHAIN_ID` as the single source of truth.
- `explorerTxUrl` and `explorerAddressUrl` now use `TARGET_CHAIN.blockExplorers.default.url` — no hardcoded URL.
- `wagmiConfig` uses `TARGET_CHAIN` for both the chain list and transport URL.
- All USDC denomination constants (`NATIVE_DECIMALS`, `PRODUCT_DECIMALS`, `QUANTUM`) and amount functions are unchanged — identical on both networks.

### 3.2 `src/components/WrongChainBanner.tsx`

- Replaced direct `arcTestnet` import with `TARGET_CHAIN`.
- Banner now names the active network (`TARGET_CHAIN.name`) and switches to its chain ID.

### 3.3 `src/components/AppHeader.tsx`

- Replaced `arcTestnet` import with `TARGET_CHAIN, IS_MAINNET`.
- Wrong-chain detection uses `TARGET_CHAIN.id`.
- Network badge: testnet shows existing green "Arc Testnet" style; **mainnet shows amber "Arc — real funds"** badge to distinguish the build type visually.

### 3.4 `src/pages/Pool.tsx`

- Replaced `arcTestnet` import with `TARGET_CHAIN`.
- `RPC_URL` constant uses `TARGET_CHAIN.rpcUrls.default.http[0]` — receipt recovery calls the correct RPC for the active network.

### 3.5 `src/pages/Proof.tsx`

- Replaced `arcTestnet` import with `TARGET_CHAIN`.
- `verifyTx` reads `rpc` from `TARGET_CHAIN.rpcUrls.default.http[0]` — Proof verification uses the correct chain RPC.
- Evidence panel "Chain" and "Chain ID" rows display `TARGET_CHAIN.name` / `TARGET_CHAIN.id`.
- Evidence limitations paragraph names the active network, not a hardcoded "Arc Testnet" string.

### 3.6 `src/components/MainnetNoticeBanner.tsx` (new)

- Renders only when `IS_MAINNET` is true.
- Displays a persistent amber notice: "Arc mainnet — transactions use real USDC. This application has not been independently audited. Use at your own risk."
- Does NOT claim MetaMask has cleared the site or that any independent audit has been performed.

### 3.7 `src/App.tsx`

- Imports and renders `<MainnetNoticeBanner />` above the app header on every page.

### 3.8 `src/contract.ts`

- **No changes.** `DEPLOYMENT_CONFIGURED` already gates writes on a missing or zero-address `VITE_HUIPOT_ADDRESS`. This behavior is correct and sufficient for both networks.

### 3.9 Pool IDs and transaction history

- No pool IDs, transaction hashes, or demo accounts from the testnet are presented as mainnet data anywhere in the application.
- `AGENTS.md` testnet deployment records are explicitly testnet-labelled and unchanged.
- Explorer links in `explorerTxUrl` / `explorerAddressUrl` use the active chain, so saved testnet proof links will point to the testnet explorer; new mainnet transactions will point to `explorer.arc.io`.

---

## 4. Preserved behaviors

The following accepted behaviors are unchanged:

- D1–D8 money rules (no refund/payout rule changes, no admin/recovery powers).
- `parseProductAmount` strict format validation; no silent rewrite.
- Review-before-signing panel (CommitmentNotice).
- `useWaitForTransactionReceipt` pinned to `TARGET_CHAIN_ID` (CSF3).
- Submission snapshot capture and receipt identity validation (CS2).
- Duplicate-submit prevention via hash guard and handler-epoch check.
- Stale-result and post-unmount protection (FV1/FV2 reactive replacedHash, VT1 unmount rejection).
- `DEPLOYMENT_CONFIGURED` fail-closed guard on missing address.
- Native USDC accounting (no ERC-20 `approve` calls).
- `explorerTxUrl` uses mined receipt hash not submitted hash (CSF2).

---

## 5. Test results (this session)

All commands run against the prepared source. No live mainnet transactions were executed.

| Command | Exit | Result |
|---|---:|---|
| `forge test --summary --fuzz-seed 1` | 0 | **120 / 0 / 0** (all suites pass) |
| `bun run test` | 0 | **227 / 0 / 0**, 6 files (216 existing + 11 new NW tests) |
| `bun run check` (oxlint + tsc) | 0 | **0 warnings, 0 errors** |
| `bun run build` | 0 | Succeeded; existing chunk-size warning unchanged |

### New test suite: NW (network selection and mainnet config regression)

11 tests in `src/lib/__tests__/createSafety.test.ts`:

| ID | Assertion |
|---|---|
| NW-CHAIN-1 | arcTestnet: ID=5042002, testnet=true, RPC/explorer correct, USDC 18-decimal |
| NW-CHAIN-2 | arcMainnet: ID=5042, testnet=false, RPC/explorer correct, USDC 18-decimal |
| NW-CHAIN-3 | arcMainnet.id ≠ arcTestnet.id |
| NW-CONFIG-1 | TARGET_CHAIN is always arcMainnet or arcTestnet (not a third value) |
| NW-CONFIG-2 | TARGET_CHAIN_ID === TARGET_CHAIN.id (consistency) |
| NW-CONFIG-3 | IS_MAINNET is false when VITE_TARGET_NETWORK is absent (no accidental mainnet default) |
| NW-CONFIG-4 | arcMainnet explorer URL does not contain "testnet"; both explorers are distinct |
| NW-CONFIG-5 | Mainnet/testnet RPC URLs are distinct and labelled correctly |
| NW-STRUCT-1 | config.ts exports IS_MAINNET, TARGET_CHAIN, arcMainnet |
| NW-STRUCT-2 | config.ts uses VITE_TARGET_NETWORK; explorerTxUrl/explorerAddressUrl do not hardcode URLs |
| NW-STRUCT-3 | Pool.tsx, Proof.tsx, WrongChainBanner.tsx do not import arcTestnet directly |

These tests document and enforce the invariants of the migration. They run in the sandbox (testnet default) and will continue to pass in any CI where `VITE_TARGET_NETWORK` is unset.

---

## 6. Deployment status

**No mainnet contract is deployed.** The application source is prepared and all writes are disabled until `VITE_HUIPOT_ADDRESS` is set to a verified mainnet contract address.

The testnet contract at `0x81a139599d252eb2dc2bbb6c267e911a21264288` (Arc Testnet, October 24, 2026) is used for testnet builds only. It was not modified and is not used in mainnet builds.

---

## 7. Contract deployment procedure (human-operated, external to Studio)

Studio cannot deploy to mainnet. The following procedure keeps wallet signing under your control.

### Prerequisites

1. **Arc Foundry installed.** The EVM reference recommends arc-foundry for Arc deployments. Install from: https://docs.arc.io/arc/tutorials/install-arc-foundry.md. Ordinary `forge` does not reproduce Arc-specific protocol semantics.
2. **Mainnet USDC balance.** Deployment costs gas in USDC. The exact fee depends on contract bytecode size and network conditions at deployment time. Arc's current max-fee floor is 20 Gwei. Run `arc-cast gas-price --rpc-url https://rpc.mainnet.arc.io` to read the live gas price. Multiply by the estimated deployment gas to estimate the fee. Do not rely on testnet fee estimates for mainnet.
3. **Deployer wallet.** You control the private key. Do not share it with any tool or service. Store it in an environment variable, never in a file.
4. **Reviewed and tested source.** The Solidity contract at `contracts/HuiPotGoalPool.sol` compiles with solc 0.8.28, optimizer 200 runs, evmVersion cancun. Forge tests pass at 120/120 against the standard EVM. No Arc-specific fork testing has been run in this sandbox (Arc Foundry is not installed here). Perform your own review before deploying real-USDC pools.

### Deployment steps

```bash
# 1. Install Arc Foundry (once, follow the official guide)
# https://docs.arc.io/arc/tutorials/install-arc-foundry.md

# 2. Build the contract
cd /path/to/HuiPotGoalPool/contracts
arc-forge build

# 3. Verify the compiled artifact bytecode matches your reviewed source
# Compare contracts/out/HuiPotGoalPool.sol/HuiPotGoalPool.json
# with the bytecode from forge (standard Foundry) as a cross-check.

# 4. Deploy (private key in env, never in the command)
export PRIVATE_KEY="<your deployer private key>"
arc-forge create contracts/HuiPotGoalPool.sol:HuiPotGoalPool \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key "$PRIVATE_KEY" \
  --broadcast

# 5. Record the deployed contract address from the output.
# Verify it on https://explorer.arc.io — confirm:
#   a. The contract code matches the expected bytecode.
#   b. The deployment transaction succeeded (status 0x1).
#   c. The deployer address matches your expected wallet.

# 6. If arc-forge is unavailable, standard forge with --rpc-url mainnet may also work
#    for a simple deployment, but Arc-specific runtime semantics are not simulated.
#    Verify the result on-chain before configuring the frontend.
```

### Post-deployment: configure Vercel

After a successful deployment, set the following environment variables in the Vercel project settings (Settings → Environment Variables). Do NOT commit these to the repository.

| Variable | Value |
|---|---|
| `VITE_TARGET_NETWORK` | `mainnet` |
| `VITE_HUIPOT_ADDRESS` | `<verified mainnet contract address>` |
| `VITE_WALLETCONNECT_PROJECT_ID` | `<your WalletConnect project ID>` (optional) |

Trigger a new Vercel deployment after setting these variables. The existing testnet deployment remains active until you manually redeploy or promote the mainnet build.

The app fails closed if `VITE_HUIPOT_ADDRESS` is missing or the zero address. If `VITE_TARGET_NETWORK` is not set to `"mainnet"`, the app uses Arc Testnet regardless of any contract address.

---

## 8. Before the first real-USDC transaction

Steps you must complete independently before any real-USDC pool is created:

1. **Obtain an independent professional audit of the Solidity contract.** The existing test suite (Foundry 120/120, Vitest 227/227) and the internal code reviews in this repository are NOT a professional security audit. They do not give assurances about mainnet safety.
2. **Deploy the contract on mainnet** following the procedure in section 7.
3. **Verify the deployed bytecode on-chain** at `https://explorer.arc.io`. Confirm the address, bytecode, and deployment transaction before configuring the frontend.
4. **Configure Vercel** with `VITE_TARGET_NETWORK=mainnet` and the verified contract address.
5. **Trigger a new Vercel build** and confirm the amber "Arc — real funds" badge appears.
6. **Run a small-amount smoke test** (the minimum meaningful pool amount, with a wallet you control for both creator and recipient) before promoting the app to other users.
7. **Confirm the transaction on the mainnet explorer** (`https://explorer.arc.io`) before claiming the migration is complete.

---

## 9. Git push behavior

The GitHub repository has a Vercel integration. Pushing this prepared source to `main` will trigger a new Vercel build automatically. **That build will use testnet** because `VITE_TARGET_NETWORK` is not set in Vercel's environment. The app will continue to show "Arc Testnet" and disable writes (no `VITE_HUIPOT_ADDRESS` is set for mainnet). This is the safe failure-closed behavior.

Production activation requires you to separately set `VITE_TARGET_NETWORK=mainnet` and a verified `VITE_HUIPOT_ADDRESS` in Vercel, then trigger a new build. Do not promote the mainnet build to production until section 8 is complete.

---

## 10. Next concrete actions (in order)

**Preparation (now complete):**
- Source prepared, tested, and committed. Testnet and mainnet configs centralized. All writes disabled until a mainnet address is configured.

**Your next steps (require external human action):**

1. **Obtain an independent professional audit** of `contracts/HuiPotGoalPool.sol`. This step is a prerequisite for real-USDC use.
2. **Set a budget.** Account for: deployment gas (estimated at deployment time via `arc-cast gas-price`), demo pool funds, and any ongoing pool operations.
3. **Install Arc Foundry** on your own machine. Follow: https://docs.arc.io/arc/tutorials/install-arc-foundry.md
4. **Deploy the contract** following section 7 of this report. Keep your private key secure.
5. **Verify the deployment** on https://explorer.arc.io.
6. **Set `VITE_TARGET_NETWORK=mainnet`** and the verified contract address in Vercel. Trigger a new build.
7. **Run a small smoke test** end-to-end with real-USDC amounts.
8. **Confirm** on the mainnet explorer before broader use.

**Do not claim the migration is complete** until step 7 produces a confirmed transaction on `https://explorer.arc.io`.
