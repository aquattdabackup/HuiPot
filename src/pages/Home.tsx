import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReadContract } from 'wagmi'
import { Plus, Search, ArrowRight } from 'lucide-react'
import { HUIPOT_ADDRESS, HUIPOT_ABI } from '../contract'
import { TARGET_CHAIN_ID } from '../config'
import { PoolCard } from '../components/PoolCard'
import { WrongChainBanner } from '../components/WrongChainBanner'

const DEPLOYED = HUIPOT_ADDRESS !== '0x0000000000000000000000000000000000000000'

function PoolLoader({ poolId }: { poolId: bigint }) {
  const { data: pool } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'getPool',
    args: [poolId],
    chainId: TARGET_CHAIN_ID,
  })
  const { data: status } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'getStatus',
    args: [poolId],
    chainId: TARGET_CHAIN_ID,
  })

  if (!pool || status === undefined) {
    return (
      <div
        className="rounded-2xl p-5 animate-pulse"
        style={{ background: 'var(--surface-muted)', height: 148 }}
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

export function Home() {
  const navigate = useNavigate()
  const [lookupId, setLookupId] = useState('')

  const { data: poolCount, isLoading: countLoading } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'poolCount',
    chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED },
  })

  const count = poolCount ? Number(poolCount) : 0
  // Show at most the 20 most recent pools
  const MAX_DISPLAY = 20
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
      <WrongChainBanner />

      {/* Hero */}
      <div className="mb-10 text-center">
        <h1
          className="display mb-3 text-4xl font-bold tracking-tight"
          style={{ color: 'var(--ink)' }}
        >
          Fund one shared goal.
        </h1>
        <p className="mx-auto max-w-md text-base" style={{ color: 'var(--muted)' }}>
          A fixed goal, a fixed recipient, and clear refund rules.
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm" style={{ color: 'var(--subtle)' }}>
          Pool USDC with your group. Money goes to the recipient only when the goal is fully funded.
          Otherwise everyone can reclaim their share after the deadline.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          {DEPLOYED ? (
            <Link
              to="/create"
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Plus className="h-4 w-4" />
              Create a pool
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
              style={{ background: 'var(--accent)' }}
            >
              <Plus className="h-4 w-4" />
              Create a pool
            </button>
          )}
        </div>

        {!DEPLOYED && (
          <p
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}
          >
            Contract not deployed yet. Deploy <code>HuiPotGoalPool</code> to Arc Testnet to enable
            pool creation.
          </p>
        )}
      </div>

      {/* Lookup by pool ID */}
      <div
        className="mb-8 rounded-2xl p-5"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
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
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2"
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border-strong)',
              color: 'var(--ink)',
            }}
            aria-label="Pool ID"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            <Search className="h-4 w-4" />
            Open
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
              Showing up to {MAX_DISPLAY} of {count} pools from this deployment
            </span>
          )}
        </div>

        {!DEPLOYED ? (
          <div
            className="rounded-2xl px-6 py-12 text-center text-sm"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            Contract not deployed. No pools available.
          </div>
        ) : countLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ background: 'var(--surface-muted)', height: 148 }}
              />
            ))}
          </div>
        ) : count === 0 ? (
          <div
            className="rounded-2xl px-6 py-12 text-center text-sm"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            <p className="font-medium mb-1">No pools found in this deployment yet.</p>
            <p className="mb-4">Be the first to create a goal pool.</p>
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}
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
