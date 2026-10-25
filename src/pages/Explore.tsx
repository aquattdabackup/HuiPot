import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReadContract } from 'wagmi'
import { Plus, Search, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { HUIPOT_ADDRESS, HUIPOT_ABI, DEPLOYMENT_CONFIGURED } from '../contract'
import { TARGET_CHAIN_ID } from '../config'
import { PoolCard } from '../components/PoolCard'

const DEPLOYED = DEPLOYMENT_CONFIGURED
const MAX_DISPLAY = 20

function PoolLoader({ poolId }: { poolId: bigint }) {
  const { data: pool, isError: poolErr } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'getPool',
    args: [poolId],
    chainId: TARGET_CHAIN_ID,
  })
  const { data: status, isError: statusErr } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'getStatus',
    args: [poolId],
    chainId: TARGET_CHAIN_ID,
  })

  if (poolErr || statusErr) {
    return (
      <div
        className="rounded-2xl p-5 text-xs"
        style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid rgba(255,180,180,0.2)' }}
      >
        <AlertCircle className="inline h-3.5 w-3.5 mr-1.5" />
        Failed to load pool #{poolId.toString()}
      </div>
    )
  }

  if (!pool || status === undefined) {
    return (
      <div
        className="rounded-2xl p-5 animate-pulse"
        style={{ background: 'var(--surface)', height: 164 }}
      />
    )
  }

  const [creator, recipient, target, deadline, title, purpose, totalContributed] = pool

  return (
    <PoolCard
      poolId={poolId}
      title={title}
      purpose={purpose}
      recipient={recipient}
      target={target}
      deadline={Number(deadline)}
      totalContributed={totalContributed}
      status={Number(status)}
      creator={creator}
    />
  )
}

export function Explore() {
  const navigate = useNavigate()
  const [lookupId, setLookupId] = useState('')

  const { data: poolCount, isLoading: countLoading, isError: countError } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'poolCount',
    chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED },
  })

  const count = poolCount ? Number(poolCount) : 0
  const ids: bigint[] = []
  for (let i = Math.max(1, count - MAX_DISPLAY + 1); i <= count; i++) {
    ids.push(BigInt(i))
  }
  ids.reverse()

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const id = lookupId.trim()
    if (id && /^\d+$/.test(id)) navigate(`/pools/${id}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="display text-3xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
              Find your shared goal.
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Browse the latest testnet pools or look up a pool by ID.
              Showing up to {MAX_DISPLAY} most recent from this deployment.
            </p>
          </div>
          <Link
            to="/create"
            className="shrink-0 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            <Plus className="h-4 w-4" /> Create a pool
          </Link>
        </div>
      </div>

      {/* Pool ID lookup */}
      <div
        className="mb-8 rounded-2xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
          Open a pool by ID
        </h2>
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Pool ID (e.g. 1)"
            inputMode="numeric"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--raised)',
              border: '1px solid var(--border-strong)',
              color: 'var(--ink)',
            }}
            aria-label="Pool ID"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            <Search className="h-4 w-4" /> Open
          </button>
        </form>
      </div>

      {/* Pool list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-xl font-semibold" style={{ color: 'var(--ink)' }}>
            Recent pools
          </h2>
          {count > 0 && (
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Showing {Math.min(count, MAX_DISPLAY)} of {count}
            </span>
          )}
        </div>

        {!DEPLOYED ? (
          <div
            className="rounded-2xl px-6 py-12 text-center text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            Contract not deployed. No pools available.
          </div>
        ) : countError ? (
          // RPC error — distinct from empty results
          <div
            className="rounded-2xl px-6 py-12 text-center"
            style={{ background: 'var(--error-bg)', border: '1px solid rgba(255,180,180,0.2)' }}
          >
            <AlertCircle className="mx-auto mb-3 h-6 w-6" style={{ color: 'var(--error-text)' }} />
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--error-text)' }}>
              Could not reach the contract
            </p>
            <p className="text-xs" style={{ color: 'var(--error-text)' }}>
              RPC request failed. Check your connection and try again.
            </p>
          </div>
        ) : countLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ background: 'var(--surface)', height: 164 }}
              />
            ))}
          </div>
        ) : count === 0 ? (
          // Empty — true zero results, not RPC error
          <div
            className="rounded-2xl px-6 py-12 text-center text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            <Loader2 className="mx-auto mb-3 h-6 w-6 opacity-40" />
            <p className="font-medium mb-1" style={{ color: 'var(--ink)' }}>No pools yet</p>
            <p className="mb-4">Be the first to create a goal pool on this deployment.</p>
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              Create a pool <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {ids.map((id) => (
              <PoolLoader key={id.toString()} poolId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
