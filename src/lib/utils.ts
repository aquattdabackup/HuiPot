export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function parseOnchainError(error: unknown): string {
  const message =
    (error as { message?: string; shortMessage?: string })?.shortMessage ??
    (error as { message?: string })?.message ??
    ''
  const lower = message.toLowerCase()
  if (lower.includes('user rejected') || (error as { code?: number })?.code === 4001)
    return 'Transaction cancelled.'
  if (lower.includes('insufficient funds') || lower.includes('exceeds balance'))
    return 'Insufficient balance. Please add funds and try again.'
  if (lower.includes('reverted')) {
    const m = message.match(/reason="([^"]+)"/)
    if (m) return `Transaction failed: ${m[1]}`
    const m2 = message.match(/with reason: ([^\n]+)/)
    if (m2) return `Transaction failed: ${m2[1]}`
    return 'Transaction failed. Please try again.'
  }
  if (lower.includes('network') || lower.includes('timeout'))
    return 'Network error. Please check your connection and try again.'
  if (message.length > 0) return message.slice(0, 100)
  return 'Something went wrong. Please try again.'
}

/** Format a Unix timestamp as local date+time string with timezone label */
export function formatDeadline(unix: number): string {
  const d = new Date(unix * 1000)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/** Remaining seconds until unix timestamp */
export function secondsUntil(unix: number): number {
  return Math.max(0, unix - Math.floor(Date.now() / 1000))
}

/** Pool status numbers */
export const STATUS = {
  ACTIVE: 0,
  FUNDED: 1,
  PAID: 2,
  REFUNDING: 3,
  CLOSED: 4,
} as const

export type PoolStatus = (typeof STATUS)[keyof typeof STATUS]

export function statusLabel(s: number): string {
  switch (s) {
    case 0: return 'Active'
    case 1: return 'Funded'
    case 2: return 'Paid'
    case 3: return 'Refunding'
    case 4: return 'Closed'
    default: return 'Unknown'
  }
}

export function statusColor(s: number): string {
  switch (s) {
    case 0: return 'bg-blue-100 text-blue-800'
    case 1: return 'bg-green-100 text-green-800'
    case 2: return 'bg-emerald-100 text-emerald-800'
    case 3: return 'bg-amber-100 text-amber-800'
    case 4: return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}
