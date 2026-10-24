import { Link } from 'react-router-dom'
import { formatNativeAmount, explorerAddressUrl } from '../config'
import { formatAddress, formatDeadline, statusLabel, statusColor } from '../lib/utils'
import { ExternalLink } from 'lucide-react'

interface PoolCardProps {
  poolId: bigint
  title: string
  purpose: string
  recipient: string
  target: bigint
  deadline: number
  totalContributed: bigint
  status: number
  creator?: string
}

export function PoolCard({
  poolId,
  title,
  purpose,
  recipient,
  target,
  deadline,
  totalContributed,
  status,
}: PoolCardProps) {
  const pct = target > 0n ? Number((totalContributed * 100n) / target) : 0
  const clampedPct = Math.min(100, pct)

  return (
    <Link
      to={`/pools/${poolId.toString()}`}
      className="block rounded-2xl p-5 transition-shadow hover:shadow-md no-underline"
      style={{
        background: 'var(--surface-strong)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3
          className="display text-base font-semibold leading-tight"
          style={{ color: 'var(--ink)' }}
        >
          {title}
        </h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm" style={{ color: 'var(--muted)' }}>
        {purpose}
      </p>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="display tabular-nums text-lg font-bold" style={{ color: 'var(--ink)' }}>
            {formatNativeAmount(totalContributed)}
          </span>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            of {formatNativeAmount(target)} USDC
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--surface-muted)' }}
          role="progressbar"
          aria-valuenow={clampedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${clampedPct}% funded`}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${clampedPct}%`, background: 'var(--accent)' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
        <span>{formatDeadline(deadline)}</span>
        <a
          href={explorerAddressUrl(recipient)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 hover:underline"
          style={{ color: 'var(--muted)' }}
        >
          {formatAddress(recipient)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </Link>
  )
}
