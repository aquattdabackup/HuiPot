import { createConfig, http } from 'wagmi'
import { getDefaultConfig } from 'connectkit'
import { defineChain } from 'viem'

// Arc Testnet — chain ID 5042002, USDC is the native gas token (18 decimals native, 6 decimals ERC-20)
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

export const TARGET_CHAIN_ID = arcTestnet.id

// 1 USDC = 10^18 native base units
// Product quantum: 10^12 native base units = 0.000001 USDC (6 product decimal places)
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

export function explorerTxUrl(hash: string): string {
  return `${arcTestnet.blockExplorers.default.url}/tx/${hash}`
}

export function explorerAddressUrl(address: string): string {
  return `${arcTestnet.blockExplorers.default.url}/address/${address}`
}

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [arcTestnet],
    transports: {
      [arcTestnet.id]: http('https://rpc.testnet.arc.io'),
    },
    // WalletConnect mobile support requires a real project ID from https://cloud.walletconnect.com
    // Without one, WalletConnect is intentionally disabled; injected wallets (MetaMask extension) still work.
    walletConnectProjectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || '',
    appName: 'HuiPot Goal Pool',
    appDescription: 'Pool USDC for one shared goal',
    // Canonical application URL — used by ConnectKit's WalletConnect metadata branch.
    // MetaMask injected-wallet connector is independent of this field (see METAMASK_DEEP_RECHECK.md).
    appUrl: 'https://hui-pot.vercel.app',
  }),
)
