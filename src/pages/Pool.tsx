import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ArrowLeft, Copy, Check, ExternalLink, Loader2, AlertCircle, ShieldCheck, Share2 } from 'lucide-react'
import { HUIPOT_ADDRESS, HUIPOT_ABI, DEPLOYMENT_CONFIGURED } from '../contract'
import { TARGET_CHAIN_ID, parseProductAmount, formatNativeAmount, explorerTxUrl, explorerAddressUrl } from '../config'
import { CommitmentNotice } from '../components/CommitmentNotice'
import { formatDeadline, statusLabel, statusColor, parseOnchainError, STATUS } from '../lib/utils'
import { buildShareLink } from '../lib/share'

const DEPLOYED = DEPLOYMENT_CONFIGURED

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionType = 'contribute' | 'payout' | 'refund'

interface ReviewSnapshot {
  action: ActionType
  amount: bigint        // native 18-dec
  recipient: string     // for payout: fixed recipient; for refund: caller wallet
  poolId: string
  contractAddress: string
  chainId: number
  accountAddress: string
}

// ─── ActionPanel ──────────────────────────────────────────────────────────────
// All write hooks live here. Pool passes key={address+poolId} so React remounts
// this entire component (destroying every hook) on wallet or pool change.
// A ReviewSnapshot is captured before writeContract is called so we can
// validate the receipt event against the exact submitted terms.
interface ActionPanelProps {
  poolId: string
  poolIdBig: bigint
  status: number | undefined
  target: bigint
  remaining: bigint
  recipient: string
  myContribution: bigint | undefined
  myClaimable: bigint | undefined
  myClaimableLoading: boolean
  myClaimableError: boolean
  isConnected: boolean
  wrongChain: boolean
  accountAddress: string
  onSuccess: (txHash: string, action: ActionType) => void
}

function ActionPanel({
  poolId, poolIdBig, status, target, remaining, recipient,
  myContribution, myClaimable, myClaimableLoading, myClaimableError,
  isConnected, wrongChain,
  accountAddress,
  onSuccess,
}: ActionPanelProps) {
  const { switchChain } = useSwitchChain()
  const navigate = useNavigate()

  // Contribution input state
  const [amountStr, setAmountStr] = useState('')
  const [amountError, setAmountError] = useState('')

  // Review step state
  const [reviewSnapshot, setReviewSnapshot] = useState<ReviewSnapshot | null>(null)

  // Each write hook is scoped to this component instance.
  const { writeContract: doContribute, data: contribHash, isPending: contribPending, isError: contribIsError, error: contribErr } = useWriteContract()
  const { isLoading: contribConfirming, isSuccess: contribSuccess } = useWaitForTransactionReceipt({
    hash: contribHash, chainId: TARGET_CHAIN_ID,
  })

  const { writeContract: doPayout, data: payoutHash, isPending: payoutPending, isError: payoutIsError, error: payoutErr } = useWriteContract()
  const { isLoading: payoutConfirming, isSuccess: payoutSuccess } = useWaitForTransactionReceipt({
    hash: payoutHash, chainId: TARGET_CHAIN_ID,
  })

  const { writeContract: doRefund, data: refundHash, isPending: refundPending, isError: refundIsError, error: refundErr } = useWriteContract()
  const { isLoading: refundConfirming, isSuccess: refundSuccess } = useWaitForTransactionReceipt({
    hash: refundHash, chainId: TARGET_CHAIN_ID,
  })

  // Notify parent on success with the tx hash and action type
  const notifiedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (contribSuccess && contribHash && !notifiedRef.current.has(contribHash)) {
      notifiedRef.current.add(contribHash)
      onSuccess(contribHash, 'contribute')
    }
  }, [contribSuccess, contribHash, onSuccess])
  useEffect(() => {
    if (payoutSuccess && payoutHash && !notifiedRef.current.has(payoutHash)) {
      notifiedRef.current.add(payoutHash)
      onSuccess(payoutHash, 'payout')
    }
  }, [payoutSuccess, payoutHash, onSuccess])
  useEffect(() => {
    if (refundSuccess && refundHash && !notifiedRef.current.has(refundHash)) {
      notifiedRef.current.add(refundHash)
      onSuccess(refundHash, 'refund')
    }
  }, [refundSuccess, refundHash, onSuccess])

  // ── Review step helpers ───────────────────────────────────────────────────
  function openContributeReview(e: React.FormEvent) {
    e.preventDefault()
    setAmountError('')
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    try {
      const val = parseProductAmount(amountStr)
      if (val <= 0n) { setAmountError('Enter an amount greater than zero.'); return }
      if (val % (10n ** 12n) !== 0n) { setAmountError('Amount must be a multiple of 0.000001 USDC.'); return }
      if (val > remaining) { setAmountError(`Exceeds remaining capacity (${formatNativeAmount(remaining)} USDC).`); return }
      setReviewSnapshot({
        action: 'contribute', amount: val,
        recipient: HUIPOT_ADDRESS, poolId, contractAddress: HUIPOT_ADDRESS,
        chainId: TARGET_CHAIN_ID, accountAddress,
      })
    } catch {
      setAmountError('Invalid amount. Use up to 6 decimal places.')
    }
  }

  function openPayoutReview() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    setReviewSnapshot({
      action: 'payout', amount: target,
      recipient, poolId, contractAddress: HUIPOT_ADDRESS,
      chainId: TARGET_CHAIN_ID, accountAddress,
    })
  }

  function openRefundReview() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (!myClaimable || myClaimable <= 0n) return
    setReviewSnapshot({
      action: 'refund', amount: myClaimable,
      recipient: accountAddress, poolId, contractAddress: HUIPOT_ADDRESS,
      chainId: TARGET_CHAIN_ID, accountAddress,
    })
  }

  function cancelReview() { setReviewSnapshot(null) }

  function confirmAction() {
    if (!reviewSnapshot) return
    // Re-validate context hasn't changed since review was opened
    if (reviewSnapshot.chainId !== TARGET_CHAIN_ID) { cancelReview(); return }
    if (reviewSnapshot.accountAddress !== accountAddress) { cancelReview(); return }
    if (reviewSnapshot.contractAddress !== HUIPOT_ADDRESS) { cancelReview(); return }
    if (reviewSnapshot.poolId !== poolId) { cancelReview(); return }

    const snap = reviewSnapshot
    setReviewSnapshot(null)

    if (snap.action === 'contribute') {
      doContribute({
        address: HUIPOT_ADDRESS, abi: HUIPOT_ABI,
        functionName: 'contribute', args: [poolIdBig],
        value: snap.amount, chainId: TARGET_CHAIN_ID,
      })
    } else if (snap.action === 'payout') {
      doPayout({
        address: HUIPOT_ADDRESS, abi: HUIPOT_ABI,
        functionName: 'payout', args: [poolIdBig],
        chainId: TARGET_CHAIN_ID,
      })
    } else if (snap.action === 'refund') {
      doRefund({
        address: HUIPOT_ADDRESS, abi: HUIPOT_ABI,
        functionName: 'claimRefund', args: [poolIdBig],
        chainId: TARGET_CHAIN_ID,
      })
    }
  }

  // ── Review modal ──────────────────────────────────────────────────────────
  if (reviewSnapshot) {
    const snap = reviewSnapshot
    const rows: [string, string, boolean?][] = [
      ['Action', snap.action === 'contribute' ? 'Contribute' : snap.action === 'payout' ? 'Trigger payout' : 'Claim refund'],
      ['Amount', `${formatNativeAmount(snap.amount)} USDC`],
      ['Pool', `#${snap.poolId}`],
      ['Contract', `${snap.contractAddress.slice(0, 6)}…${snap.contractAddress.slice(-4)}`],
      ['Chain', 'Arc Testnet (ID 5042002)'],
    ]
    if (snap.action === 'payout') {
      rows.push(['To (fixed recipient)', `${snap.recipient.slice(0, 6)}…${snap.recipient.slice(-4)}`])
      rows.push(['Principal vs fees', 'Full target amount to recipient; you pay Arc gas (~<0.01 USDC)'])
    } else if (snap.action === 'refund') {
      rows.push(['To (your wallet)', `${snap.recipient.slice(0, 6)}…${snap.recipient.slice(-4)}`])
      rows.push(['Principal vs fees', 'Full contribution returned; you pay Arc gas (~<0.01 USDC)'])
    } else {
      rows.push(['To (contract)', `${snap.recipient.slice(0, 6)}…${snap.recipient.slice(-4)}`])
      rows.push(['Principal vs fees', `${formatNativeAmount(snap.amount)} USDC sent; you pay Arc gas (~<0.01 USDC)`])
      rows.push(['Commitment', 'Contributions are irrevocable until the pool expires underfunded'])
    }

    return (
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Review before signing</h3>
        <dl className="space-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-40 shrink-0 font-medium" style={{ color: 'var(--muted)' }}>{k}</dt>
              <dd className="break-all" style={{ color: 'var(--ink)' }}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          These terms are derived from on-chain pool state. Confirming sends the transaction to your wallet for signing.
          If pool state or your account changes before signing, the transaction may revert.
        </p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={confirmAction}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            Confirm in wallet
          </button>
          <button
            onClick={cancelReview}
            className="rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
            style={{ background: 'var(--raised)', color: 'var(--ink)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
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
          {contribSuccess && contribHash && (
            <div className="rounded-xl p-3 text-sm mb-3" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
              Contribution confirmed.{' '}
              <a href={explorerTxUrl(contribHash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
              {' · '}
              <button
                onClick={() => navigate(`/pools/${poolId}/proof?tx=${contribHash}`)}
                className="underline"
              >
                Verify proof
              </button>
            </div>
          )}
          <form onSubmit={openContributeReview}>
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
            {contribIsError && (
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
          {payoutSuccess && payoutHash && (
            <div className="mb-3 rounded-xl p-3 text-sm" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
              Payout confirmed.{' '}
              <a href={explorerTxUrl(payoutHash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
              {' · '}
              <button
                onClick={() => navigate(`/pools/${poolId}/proof?tx=${payoutHash}`)}
                className="underline"
              >
                Verify proof
              </button>
            </div>
          )}
          {payoutIsError && (
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
            <button onClick={openPayoutReview} disabled={payoutPending || payoutConfirming || payoutSuccess} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
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
          ) : myClaimableLoading ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Checking your refund balance…</p>
          ) : myClaimableError ? (
            <p className="text-sm" style={{ color: 'var(--error-text)' }}>
              Could not load your refund balance. Please try again.
            </p>
          ) : myClaimable !== undefined && myClaimable > 0n ? (
            <>
              <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>
                Claim {formatNativeAmount(myClaimable)} USDC back to this wallet. You pay the network fee.
              </p>
              {refundSuccess && refundHash && (
                <div className="mb-3 rounded-xl p-3 text-sm" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                  Refund confirmed.{' '}
                  <a href={explorerTxUrl(refundHash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
                  {' · '}
                  <button
                    onClick={() => navigate(`/pools/${poolId}/proof?tx=${refundHash}`)}
                    className="underline"
                  >
                    Verify proof
                  </button>
                </div>
              )}
              {refundIsError && (
                <div className="mb-3 rounded-xl p-2.5 text-xs" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
                  {parseOnchainError(refundErr)}
                </div>
              )}
              {wrongChain ? (
                <button onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                  Switch to Arc Testnet
                </button>
              ) : (
                <button onClick={openRefundReview} disabled={refundPending || refundConfirming || refundSuccess} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                  {refundPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirm in wallet…</span>
                    : refundConfirming ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</span>
                    : 'Review refund'}
                </button>
              )}
            </>
          ) : myClaimable !== undefined && myClaimable === 0n ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              This wallet has no unclaimed contribution.{' '}Other contributors may still have claims.
            </p>
          ) : (
            // myClaimable is still undefined — don't say zero yet
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading refund balance…</p>
          )}
        </div>
      )}

      {/* Closed */}
      {status === STATUS.CLOSED && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          Closed — all claimable refunds have been processed.
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
  const [copiedLink, setCopiedLink] = useState(false)
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
  const { data: pool, isLoading: poolLoading, isError: poolRpcError, refetch: refetchPool } = useReadContract({
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
  const {
    data: myClaimable,
    isLoading: myClaimableLoading,
    isError: myClaimableError,
    refetch: refetchClaimable,
  } = useReadContract({
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

  // Stable ref to refetch callbacks — prevents ActionPanel's onSuccess recreating on every render
  const refetchAll = useRef({ refetchPool, refetchStatus, refetchContrib, refetchClaimable })
  useEffect(() => { refetchAll.current = { refetchPool, refetchStatus, refetchContrib, refetchClaimable } })

  // Track which tx we notified about to avoid re-triggering refetch
  const notifiedTxRef = useRef<Set<string>>(new Set())
  const handleActionSuccess = useRef((txHash: string, _action: ActionType) => {
    if (notifiedTxRef.current.has(txHash)) return
    notifiedTxRef.current.add(txHash)
    void refetchAll.current.refetchPool()
    void refetchAll.current.refetchStatus()
    void refetchAll.current.refetchContrib()
    void refetchAll.current.refetchClaimable()
  }).current

  function copyRecipient() {
    if (!pool) return
    const [, recv] = pool
    navigator.clipboard.writeText(recv).then(() => {
      setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000)
    })
  }

  function copyPoolLink() {
    void buildShareLink(`/pools/${poolId}`).then((url) =>
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000)
      })
    )
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
        <p style={{ color: 'var(--muted)' }}>Deployment not configured — set VITE_HUIPOT_ADDRESS in the build environment.</p>
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

  // Separate RPC error from "not found"
  if (poolRpcError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="mb-3" style={{ color: 'var(--error-text)' }}>Could not reach the network. Please check your connection and try again.</p>
        <button onClick={() => { void refetchPool() }} className="text-sm underline" style={{ color: 'var(--muted)' }}>Retry</button>
        <br />
        <Link to="/pools" className="mt-4 inline-block text-sm underline" style={{ color: 'var(--muted)' }}>Back to pools</Link>
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
  const [, recipient, target, deadline, title, purpose, totalContributed, totalRefunded] = pool
  const pct = target > 0n ? Number((totalContributed * 100n) / target) : 0
  const clampedPct = Math.min(100, pct)
  const remaining = target > totalContributed ? target - totalContributed : 0n

  // F06: Closed copy derived from pool totals, not wallet contribution
  const allRefundsClaimed = status === STATUS.CLOSED &&
    totalContributed > 0n &&
    totalRefunded >= totalContributed

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/pools" className="flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--muted)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to pools
        </Link>
        <div className="flex items-center gap-3">
          {/* F07: Share link */}
          <button
            onClick={copyPoolLink}
            className="flex items-center gap-1.5 text-sm no-underline"
            style={{ color: 'var(--muted)' }}
            title="Copy pool link"
          >
            {copiedLink ? <Check className="h-4 w-4" style={{ color: 'var(--success-text)' }} /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? 'Copied!' : 'Share'}
          </button>
          <Link to={`/pools/${poolId}/proof`} className="flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--muted)' }}>
            <ShieldCheck className="h-4 w-4" /> Proof
          </Link>
        </div>
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

          {/* F06: Closed copy from totals */}
          {status === STATUS.CLOSED && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              {allRefundsClaimed
                ? `Closed — all ${formatNativeAmount(totalContributed)} USDC contributed was refunded.`
                : totalContributed === 0n
                  ? 'Closed — no contributions were made.'
                  : `Closed — ${formatNativeAmount(totalRefunded)} of ${formatNativeAmount(totalContributed)} USDC refunded.`
              }
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
          recipient={recipient}
          myContribution={myContribution}
          myClaimable={myClaimable}
          myClaimableLoading={myClaimableLoading}
          myClaimableError={myClaimableError}
          isConnected={isConnected}
          wrongChain={wrongChain}
          accountAddress={address ?? ''}
          onSuccess={handleActionSuccess}
        />
      </div>
    </div>
  )
}
