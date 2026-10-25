import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ArrowLeft, Copy, Check, ExternalLink, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { HUIPOT_ADDRESS, HUIPOT_ABI } from '../contract'
import { TARGET_CHAIN_ID, parseProductAmount, formatNativeAmount, explorerTxUrl, explorerAddressUrl } from '../config'
import { CommitmentNotice } from '../components/CommitmentNotice'
import { formatDeadline, statusLabel, statusColor, parseOnchainError, STATUS } from '../lib/utils'

const DEPLOYED = HUIPOT_ADDRESS !== '0x0000000000000000000000000000000000000000'

// ─── ActionPanel ──────────────────────────────────────────────────────────────
// R3: All write hooks live HERE, not in Pool parent.
// Pool passes `key={walletAddress ?? 'disconnected'}` so React remounts
// this component (and destroys/recreates every hook) on wallet change.
// That guarantees wallet A's contribSuccess/refundSuccess never bleeds into wallet B.
interface ActionPanelProps {
  poolId: string
  poolIdBig: bigint
  status: number | undefined
  target: bigint
  remaining: bigint
  myContribution: bigint | undefined
  myClaimable: bigint | undefined
  isConnected: boolean
  wrongChain: boolean
  onSuccess: () => void
}

function ActionPanel({
  poolId, poolIdBig, status, target, remaining,
  myContribution, myClaimable,
  isConnected, wrongChain, onSuccess,
}: ActionPanelProps) {
  const { switchChain } = useSwitchChain()
  const [amountStr, setAmountStr] = useState('')
  const [amountError, setAmountError] = useState('')

  // Each write hook is scoped to this component instance.
  // When Pool passes a new key=, React destroys this instance and creates a fresh one,
  // so contribHash/payoutHash/refundHash all start as undefined for the new wallet.
  const { writeContract: doContribute, data: contribHash, isPending: contribPending, isError: contribError, error: contribErr } = useWriteContract()
  const { isLoading: contribConfirming, isSuccess: contribSuccess } = useWaitForTransactionReceipt({ hash: contribHash })

  const { writeContract: doPayout, data: payoutHash, isPending: payoutPending, isError: payoutError, error: payoutErr } = useWriteContract()
  const { isLoading: payoutConfirming, isSuccess: payoutSuccess } = useWaitForTransactionReceipt({ hash: payoutHash })

  const { writeContract: doRefund, data: refundHash, isPending: refundPending, isError: refundError, error: refundErr } = useWriteContract()
  const { isLoading: refundConfirming, isSuccess: refundSuccess } = useWaitForTransactionReceipt({ hash: refundHash })

  // Notify parent so it can refetch pool state after any success
  useEffect(() => {
    if (contribSuccess || payoutSuccess || refundSuccess) onSuccess()
  }, [contribSuccess, payoutSuccess, refundSuccess, onSuccess])

  function handleContribute(e: React.FormEvent) {
    e.preventDefault()
    setAmountError('')
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    try {
      const val = parseProductAmount(amountStr)
      if (val <= 0n) { setAmountError('Enter an amount greater than zero.'); return }
      if (val % (10n ** 12n) !== 0n) { setAmountError('Amount must be a multiple of 0.000001 USDC.'); return }
      if (val > remaining) { setAmountError(`Exceeds remaining capacity (${formatNativeAmount(remaining)} USDC).`); return }
      doContribute({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'contribute', args: [poolIdBig], value: val, chainId: TARGET_CHAIN_ID })
    } catch {
      setAmountError('Invalid amount. Use up to 6 decimal places.')
    }
  }

  function handlePayout() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    doPayout({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'payout', args: [poolIdBig], chainId: TARGET_CHAIN_ID })
  }

  function handleRefund() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    doRefund({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'claimRefund', args: [poolIdBig], chainId: TARGET_CHAIN_ID })
  }

  return (
    <div className="space-y-4">
      {!isConnected && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>Connect your wallet to contribute or check your position.</p>
          <ConnectKitButton />
        </div>
      )}

      {/* Active → Contribute */}
      {status === STATUS.ACTIVE && isConnected && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="mb-3 font-semibold" style={{ color: 'var(--ink)' }}>Contribute</h3>
          {contribSuccess && (
            <div className="rounded-xl p-3 text-sm mb-3" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
              Contribution confirmed.
              {contribHash && <a href={explorerTxUrl(contribHash)} target="_blank" rel="noopener noreferrer" className="ml-2 underline">View tx</a>}
            </div>
          )}
          <form onSubmit={handleContribute}>
            <div className="relative mb-1">
              <input
                type="text" inputMode="decimal" value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.000000"
                className="w-full rounded-xl px-4 py-3 pr-16 text-sm outline-none tabular-nums"
                style={{ background: 'var(--raised)', border: `1px solid ${amountError ? 'var(--error-text)' : 'var(--border-strong)'}`, color: 'var(--ink)' }}
                aria-label="Contribution amount in USDC"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--muted)' }}>USDC</span>
            </div>
            {amountError && (
              <p className="mb-2 flex items-center gap-1 text-xs" style={{ color: 'var(--error-text)' }}>
                <AlertCircle className="h-3.5 w-3.5" /> {amountError}
              </p>
            )}
            <button type="button" onClick={() => setAmountStr(formatNativeAmount(remaining))} className="mb-3 text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Use remaining goal ({formatNativeAmount(remaining)} USDC)
            </button>
            {myContribution !== undefined && myContribution > 0n && (
              <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>You have contributed: {formatNativeAmount(myContribution)} USDC</p>
            )}
            {contribError && (
              <div className="mb-3 rounded-xl p-2.5 text-xs" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
                {parseOnchainError(contribErr)}
              </div>
            )}
            {wrongChain ? (
              <button type="button" onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                Switch to Arc Testnet
              </button>
            ) : (
              <button type="submit" disabled={contribPending || contribConfirming} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                {contribPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirm in wallet…</span>
                  : contribConfirming ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</span>
                  : 'Review contribution'}
              </button>
            )}
          </form>
        </div>
      )}

      {/* Funded → Payout */}
      {status === STATUS.FUNDED && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid rgba(210,250,105,0.3)' }}>
          <h3 className="mb-2 font-semibold" style={{ color: 'var(--ink)' }}>Goal reached</h3>
          <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
            The goal is met. This sends {formatNativeAmount(target)} USDC to the fixed recipient. Anyone may trigger it.
          </p>
          {payoutSuccess && (
            <div className="mb-3 rounded-xl p-3 text-sm" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
              Payout confirmed.
              {payoutHash && <a href={explorerTxUrl(payoutHash)} target="_blank" rel="noopener noreferrer" className="ml-2 underline">View tx</a>}
            </div>
          )}
          {payoutError && (
            <div className="mb-3 rounded-xl p-2.5 text-xs" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
              {parseOnchainError(payoutErr)}
            </div>
          )}
          {!isConnected ? (
            <ConnectKitButton />
          ) : wrongChain ? (
            <button onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              Switch to Arc Testnet
            </button>
          ) : (
            <button onClick={handlePayout} disabled={payoutPending || payoutConfirming || payoutSuccess} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              {payoutPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirm in wallet…</span>
                : payoutConfirming ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</span>
                : 'Review payout'}
            </button>
          )}
        </div>
      )}

      {/* Paid */}
      {status === STATUS.PAID && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--success-bg)', border: '1px solid rgba(200,244,170,0.3)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--success-text)' }}>
            Payout complete. {formatNativeAmount(target)} USDC was sent to the fixed recipient.
          </p>
          <Link to={`/pools/${poolId}/proof`} className="mt-3 flex items-center gap-1 text-sm underline" style={{ color: 'var(--success-text)' }}>
            <ShieldCheck className="h-4 w-4" /> View payout proof
          </Link>
        </div>
      )}

      {/* Refunding */}
      {status === STATUS.REFUNDING && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="mb-2 font-semibold" style={{ color: 'var(--ink)' }}>Goal not reached</h3>
          {!isConnected ? (
            <><p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>Connect wallet to check your refund.</p><ConnectKitButton /></>
          ) : myClaimable !== undefined && myClaimable > 0n ? (
            <>
              <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>
                Claim {formatNativeAmount(myClaimable)} USDC back to this wallet. You pay the network fee.
              </p>
              {refundSuccess && (
                <div className="mb-3 rounded-xl p-3 text-sm" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                  Refund confirmed.
                  {refundHash && <a href={explorerTxUrl(refundHash)} target="_blank" rel="noopener noreferrer" className="ml-2 underline">View tx</a>}
                </div>
              )}
              {refundError && (
                <div className="mb-3 rounded-xl p-2.5 text-xs" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
                  {parseOnchainError(refundErr)}
                </div>
              )}
              {wrongChain ? (
                <button onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                  Switch to Arc Testnet
                </button>
              ) : (
                <button onClick={handleRefund} disabled={refundPending || refundConfirming || refundSuccess} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                  {refundPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirm in wallet…</span>
                    : refundConfirming ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</span>
                    : 'Review refund'}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {isConnected ? 'This wallet has no unclaimed contribution.' : 'Connect wallet to check your refund.'}
              {' '}Other contributors may still have claims.
            </p>
          )}
        </div>
      )}

      {/* Closed */}
      {status === STATUS.CLOSED && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          Closed — {myContribution !== undefined && myContribution > 0n ? 'all refunds claimed.' : 'no contributions.'}
        </div>
      )}
    </div>
  )
}

// ─── Pool ─────────────────────────────────────────────────────────────────────
export function Pool() {
  const { poolId } = useParams<{ poolId: string }>()
  const { address, chainId, isConnected } = useAccount()
  const [copiedAddr, setCopiedAddr] = useState(false)
  const wrongChain = isConnected && chainId !== TARGET_CHAIN_ID

  // R4: guard BigInt conversion
  const UINT256_MAX = (1n << 256n) - 1n
  const poolIdBig = (() => {
    if (!poolId) return 0n
    if (!/^\d+$/.test(poolId)) return null
    try {
      const v = BigInt(poolId)
      if (v > UINT256_MAX) return null
      return v
    } catch { return null }
  })()
  const validPoolId = poolIdBig !== null && poolIdBig > 0n

  // R5: 12s polling
  const { data: pool, isLoading: poolLoading, refetch: refetchPool } = useReadContract({
    address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'getPool',
    args: [poolIdBig ?? 0n], chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED && validPoolId, refetchInterval: 12_000 },
  })
  const { data: rawStatus, refetch: refetchStatus } = useReadContract({
    address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'getStatus',
    args: [poolIdBig ?? 0n], chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED && validPoolId, refetchInterval: 12_000 },
  })
  const { data: myContribution, refetch: refetchContrib } = useReadContract({
    address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'getContribution',
    args: [poolIdBig ?? 0n, address ?? '0x0000000000000000000000000000000000000000'],
    chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED && !!address && validPoolId, refetchInterval: 12_000 },
  })
  const { data: myClaimable, refetch: refetchClaimable } = useReadContract({
    address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'getClaimable',
    args: [poolIdBig ?? 0n, address ?? '0x0000000000000000000000000000000000000000'],
    chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED && !!address && validPoolId, refetchInterval: 12_000 },
  })
  const { data: poolCount } = useReadContract({
    address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'poolCount',
    chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED, refetchInterval: 12_000 },
  })

  const status = rawStatus !== undefined ? Number(rawStatus) : undefined

  // Stable ref to refetch callbacks
  const refetchAll = useRef({ refetchPool, refetchStatus, refetchContrib, refetchClaimable })
  useEffect(() => { refetchAll.current = { refetchPool, refetchStatus, refetchContrib, refetchClaimable } })

  const handleActionSuccess = () => {
    void refetchAll.current.refetchPool()
    void refetchAll.current.refetchStatus()
    void refetchAll.current.refetchContrib()
    void refetchAll.current.refetchClaimable()
  }

  if (!poolId || !validPoolId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p style={{ color: 'var(--muted)' }}>Invalid pool ID{poolId ? ` "${poolId}"` : ''}.</p>
        <Link to="/pools" className="mt-4 inline-block text-sm underline" style={{ color: 'var(--muted)' }}>Back to pools</Link>
      </div>
    )
  }

  if (!DEPLOYED) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p style={{ color: 'var(--muted)' }}>Contract not deployed.</p>
        <Link to="/pools" className="mt-4 inline-block text-sm underline" style={{ color: 'var(--muted)' }}>Back to pools</Link>
      </div>
    )
  }

  if (poolLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded" style={{ background: 'var(--surface)' }} />
          <div className="h-40 rounded-2xl" style={{ background: 'var(--surface)' }} />
        </div>
      </div>
    )
  }

  if (!pool || (poolCount !== undefined && poolIdBig !== null && poolIdBig > poolCount)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="display text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Pool not found</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Pool #{poolId} does not exist on this deployment.</p>
        <Link to="/pools" className="text-sm underline" style={{ color: 'var(--muted)' }}>Back to pools</Link>
      </div>
    )
  }

  const safePoolIdBig = poolIdBig as bigint
  const [, recipient, target, deadline, title, purpose, totalContributed] = pool
  const pct = target > 0n ? Number((totalContributed * 100n) / target) : 0
  const clampedPct = Math.min(100, pct)
  const remaining = target - totalContributed

  function copyRecipient() {
    navigator.clipboard.writeText(recipient).then(() => {
      setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000)
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/pools" className="flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--muted)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to pools
        </Link>
        <Link to={`/pools/${poolId}/proof`} className="flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--muted)' }}>
          <ShieldCheck className="h-4 w-4" /> View proof
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        {/* Left: main info */}
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>{title}</h1>
            {status !== undefined && (
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(status)}`}>
                {statusLabel(status)}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{purpose}</p>

          {/* Progress card */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="display tabular-nums text-4xl font-bold" style={{ color: 'var(--ink)' }}>
                {formatNativeAmount(totalContributed)}
              </span>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>/ {formatNativeAmount(target)} USDC</span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full mb-2"
              style={{ background: 'var(--raised)' }}
              role="progressbar" aria-valuenow={clampedPct} aria-valuemin={0} aria-valuemax={100}
              aria-label={`${clampedPct}% of goal funded`}
            >
              <div className="h-full rounded-full transition-all" style={{ width: `${clampedPct}%`, background: 'var(--accent)' }} />
            </div>
            <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted)' }}>
              <span>{clampedPct}% funded</span>
              {status === STATUS.ACTIVE && <span>{formatNativeAmount(remaining)} USDC remaining</span>}
            </div>
            <div className="mt-3 pt-3 border-t text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Deadline: <span style={{ color: 'var(--ink)' }}>{formatDeadline(Number(deadline))}</span>
            </div>
          </div>

          {/* Recipient */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}>
              Fixed recipient
            </p>
            <div className="flex items-center gap-2">
              <a href={explorerAddressUrl(recipient)} target="_blank" rel="noopener noreferrer" className="mono text-sm break-all underline" style={{ color: 'var(--ink)' }}>
                {recipient}
              </a>
              <button onClick={copyRecipient} className="shrink-0 rounded-lg p-1.5" style={{ color: 'var(--muted)' }} aria-label="Copy recipient address">
                {copiedAddr ? <Check className="h-4 w-4" style={{ color: 'var(--success-text)' }} /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <a href={explorerAddressUrl(recipient)} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              View on ArcScan <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {myContribution !== undefined && myContribution > 0n && status !== STATUS.ACTIVE && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--muted)' }}>
                Your contribution: <strong style={{ color: 'var(--ink)' }}>{formatNativeAmount(myContribution)} USDC</strong>
              </p>
            </div>
          )}

          <CommitmentNotice />
        </div>

        {/* Right: ActionPanel — key isolates all write/receipt hooks per wallet+pool */}
        <ActionPanel
          key={`${address ?? 'disconnected'}-${poolId}`}
          poolId={poolId}
          poolIdBig={safePoolIdBig}
          status={status}
          target={target}
          remaining={remaining}
          myContribution={myContribution}
          myClaimable={myClaimable}
          isConnected={isConnected}
          wrongChain={wrongChain}
          onSuccess={handleActionSuccess}
        />
      </div>
    </div>
  )
}
