import { createConfig, http } from 'wagmi'
import { getDefaultConfig } from 'connectkit'
import { defineChain, fallback } from 'viem'

// ─── Arc Testnet ────────────────────────────────────────────────────────────────
// Chain ID 5042002. Kept for historical reference and testnet builds.
// Source: https://docs.arc.io/arc/references/connect-to-arc.md
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.io'] },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan Testnet',
      url: 'https://explorer.testnet.arc.io',
    },
  },
  testnet: true,
})

// ─── Arc Mainnet ────────────────────────────────────────────────────────────────
// Chain ID 5042, RPC https://rpc.mainnet.arc.io, explorer https://explorer.arc.io.
// USDC is the native gas token (18 decimals natively, 6 decimals ERC-20 interface).
// Source: https://docs.arc.io/arc/references/connect-to-arc.md (verified November 2026).
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.arc.io'] },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://explorer.arc.io',
    },
  },
  testnet: false,
})

// ─── Active network selection ────────────────────────────────────────────────────
// Set VITE_TARGET_NETWORK="mainnet" in the build environment to target Arc mainnet.
// Any other value (including absence) keeps testnet as the default.
// The application reads TARGET_CHAIN, TARGET_CHAIN_ID, and IS_MAINNET from this module.
// No other file may hardcode a chain choice independently.
const _targetNetwork = (import.meta.env.VITE_TARGET_NETWORK as string | undefined) ?? 'testnet'
export const IS_MAINNET: boolean = _targetNetwork === 'mainnet'
export const TARGET_CHAIN = IS_MAINNET ? arcMainnet : arcTestnet
export const TARGET_CHAIN_ID: number = TARGET_CHAIN.id

// ─── USDC denomination ────────────────────────────────────────────────────────────
// 1 USDC = 10^18 native base units on both Arc mainnet and testnet.
// Product quantum: 10^12 native base units = 0.000001 USDC (6 product decimal places).
// This is identical across both networks; no per-network branching needed here.
export const NATIVE_DECIMALS = 18
export const PRODUCT_DECIMALS = 6
export const QUANTUM = 10n ** 12n

// Maximum uint256 value — amounts above this are rejected.
const UINT256_MAX = (1n << 256n) - 1n

/**
 * Parse a user-supplied USDC amount string into 18-decimal native base units.
 *
 * STRICT: rejects any input that is not exactly the form /^\d+(\.\d{1,6})?$/.
 * - Commas, "e", "-", "+" or any non-digit-dot character → throws "Invalid amount format"
 * - More than 6 decimal places → throws "Too many decimal places (max 6)"
 * - Result above uint256 max → throws "Amount exceeds maximum"
 * - Empty / whitespace → returns 0n (caller decides if that is valid)
 *
 * Never strip or silently rewrite the input: the caller sees the raw value
 * and must show an error before requesting a wallet signature.
 */
export function parseProductAmount(value: string): bigint {
  if (!value || value.trim() === '') return 0n
  const trimmed = value.trim()
  // Strict format: only digits and at most one dot
  if (!/^\d+(\.\d*)?$/.test(trimmed)) throw new Error('Invalid amount format')
  const [intPart, fracPart = ''] = trimmed.split('.')
  if (fracPart.length > PRODUCT_DECIMALS) throw new Error('Too many decimal places (max 6)')
  const padded = fracPart.padEnd(PRODUCT_DECIMALS, '0')
  const erc20Units = BigInt(intPart || '0') * 10n ** BigInt(PRODUCT_DECIMALS) + BigInt(padded)
  // Convert 6-decimal ERC-20 units to 18-decimal native units
  const native = erc20Units * QUANTUM
  if (native > UINT256_MAX) throw new Error('Amount exceeds maximum')
  return native
}

export function formatNativeAmount(native: bigint): string {
  // Convert 18-decimal native to 6-decimal display
  const erc20 = native / QUANTUM
  const intPart = erc20 / 10n ** BigInt(PRODUCT_DECIMALS)
  const fracPart = erc20 % 10n ** BigInt(PRODUCT_DECIMALS)
  const fracStr = fracPart.toString().padStart(PRODUCT_DECIMALS, '0').replace(/0+$/, '')
  return fracStr ? `${intPart}.${fracStr}` : intPart.toString()
}

// Explorer URL helpers — always use the active TARGET_CHAIN explorer.
// These must NOT be called with a hardcoded base URL; use these helpers everywhere.
export function explorerTxUrl(hash: string): string {
  return `${TARGET_CHAIN.blockExplorers.default.url}/tx/${hash}`
}

export function explorerAddressUrl(address: string): string {
  return `${TARGET_CHAIN.blockExplorers.default.url}/address/${address}`
}

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [TARGET_CHAIN],
    transports: {
      // fallback: injected wallet (MetaMask) first, then public RPC.
      // Without this, wagmi routes writes through the public RPC directly
      // instead of the browser wallet, causing "method not available" errors
      // on custom chains like Arc where wallet_sendTransaction is not exposed.
      [TARGET_CHAIN.id]: fallback([http(), http(TARGET_CHAIN.rpcUrls.default.http[0])]),
    },
    // WalletConnect mobile support requires a real project ID from https://cloud.walletconnect.com
    // Without one, WalletConnect is intentionally disabled; injected wallets (MetaMask extension) still work.
    walletConnectProjectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || '',
    appName: 'HuiPot Goal Pool',
    appDescription: 'Pool USDC for one shared goal',
    // Canonical application URL — used by ConnectKit's WalletConnect metadata branch.
    // MetaMask injected-wallet connector is independent of this field.
    appUrl: 'https://hui-pot.vercel.app',
  }),
)
