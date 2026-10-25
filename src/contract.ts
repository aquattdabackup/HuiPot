// Contract address — set VITE_HUIPOT_ADDRESS in your build environment.
// If missing, malformed, or zero, the app shows a "Deployment not configured" banner
// and disables all writes. This is not a deployed-contract error; it is a build-config error.
const _rawAddr = (import.meta.env.VITE_HUIPOT_ADDRESS as string | undefined) ?? ''
const _isValidAddr = /^0x[0-9a-fA-F]{40}$/.test(_rawAddr) && _rawAddr !== '0x0000000000000000000000000000000000000000'
export const HUIPOT_ADDRESS: `0x${string}` = _isValidAddr
  ? (_rawAddr as `0x${string}`)
  : '0x0000000000000000000000000000000000000000'
export const DEPLOYMENT_CONFIGURED = _isValidAddr

export const HUIPOT_ABI = [
  // Write functions
  {
    name: 'createPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'target', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'title', type: 'string' },
      { name: 'purpose', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'contribute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'payout',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claimRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [],
  },
  // Read functions
  {
    name: 'poolCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'target', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'title', type: 'string' },
      { name: 'purpose', type: 'string' },
      { name: 'totalContributed', type: 'uint256' },
      { name: 'totalRefunded', type: 'uint256' },
      { name: 'paidOut', type: 'bool' },
    ],
  },
  {
    name: 'getStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getContribution',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'wallet', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getRefunded',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'wallet', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getClaimable',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'wallet', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Events
  {
    name: 'PoolCreated',
    type: 'event',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'target', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
      { name: 'title', type: 'string', indexed: false },
      { name: 'purpose', type: 'string', indexed: false },
    ],
  },
  {
    name: 'Contributed',
    type: 'event',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'contributor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newTotal', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'GoalReached',
    type: 'event',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'target', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PaidOut',
    type: 'event',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Refunded',
    type: 'event',
    inputs: [
      { name: 'poolId', type: 'uint256', indexed: true },
      { name: 'contributor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const
