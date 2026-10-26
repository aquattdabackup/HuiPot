import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ArrowLeft, Copy, Check, ExternalLink, Loader2, AlertCircle, ShieldCheck, Share2, AlertTriangle } from 'lucide-react'
import { HUIPOT_ADDRESS, HUIPOT_ABI, DEPLOYMENT_CONFIGURED } from '../contract'
import { TARGET_CHAIN_ID, arcTestnet, parseProductAmount, formatNativeAmount, explorerTxUrl, explorerAddressUrl } from '../config'
import { CommitmentNotice } from '../components/CommitmentNotice'
import { formatDeadline, statusLabel, statusColor, parseOnchainError, STATUS } from '../lib/utils'
import { buildShareLink } from '../lib/share'

const RPC_URL = arcTestnet.rpcUrls.default.http[0]

const DEPLOYED = DEPLOYMENT_CONFIGURED

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionType = 'contribute' | 'payout' | 'refund'

// State of receipt validation after a confirmed transaction
type ReceiptValidation =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'confirmed'; txHash: string; action: ActionType }
  | { phase: 'replaced'; txHash: string; note: string }   // replacement/cancel confirmed
  | { phase: 'error'; txHash: string; message: string }   // RPC error or revert

interface ReviewSnapshot {
  action: ActionType
  amount: bigint        // native 18-dec
  recipient: string     // for payout: fixed recipient; for refund: caller wallet
  poolId: string
  contractAddress: string
  accountAddress: string
  // currentChainId captured at confirm time for revalidation (NOT stored — read live)
}

// ABI event topics for receipt validation
const PAID_OUT_TOPIC = '0x648ae074e8c7e2b5c75fc82672c363a1b0fa293a1ce08cba5e9dbeec37eb8ae8'
const REFUNDED_TOPIC = '0x7ca5472b7ea78c2c0141c5a12ee6d170cf4ce8ed06be3d22c8252ddfc7a6a2c4'
const CONTRIBUTED_TOPIC = '0xdcfa71ee125a676f843733d9d39dce2c918ecf9e92f96db4f24bdb5244ed68a0'

/**
 * Validate a confirmed receipt against the review snapshot.
 * Returns 'confirmed' if the receipt matches expected action/amount/recipient,
 * 'replaced' if the tx succeeded but no matching event was emitted (replacement/cancel),
 * 'error' if the receipt is a revert or RPC lookup failed.
 */
async function validateReceipt(
  txHash: string,
  snap: ReviewSnapshot,
  rpcUrl: string,
): Promise<{ outcome: 'confirmed' | 'replaced' | 'error'; note: string }> {
  try {
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionReceipt', params: [txHash], id: 1 }),
    })
    const json = await resp.json() as {
      result: null | {
        status: string
        to: string | null
        logs: Array<{ address: string; topics: string[]; data: string }>
      }
    }
    const receipt = json.result
    if (!receipt) return { outcome: 'error', note: 'Receipt not found — transaction may still be pending.' }
    if (receipt.status !== '0x1') return { outcome: 'error', note: 'Transaction reverted (status 0x0).' }

    // Check contract target
    const contractMatch = (receipt.to ?? '').toLowerCase() === snap.contractAddress.toLowerCase()
    if (!contractMatch) return { outcome: 'replaced', note: `Transaction reached a different contract (${receipt.to ?? '–'}) — not this deployment.` }

    // Look for the expected event from the contract
    const contractLogs = receipt.logs.filter(
      (l) => l.address.toLowerCase() === snap.contractAddress.toLowerCase()
    )

    if (snap.action === 'contribute') {
      const log = contractLogs.find((l) => l.topics[0] === CONTRIBUTED_TOPIC)
      if (!log) return { outcome: 'replaced', note: 'No Contributed event from this contract — transaction may have been replaced or cancelled.' }
      // Validate pool ID and amount
      const logPoolId = BigInt(log.topics[1]).toString()
      const logAmount = BigInt('0x' + log.data.slice(2, 66))
      if (logPoolId !== snap.poolId) return { outcome: 'replaced', note: `Contributed event is for pool #${logPoolId}, not pool #${snap.poolId}.` }
      if (logAmount !== snap.amount) return { outcome: 'replaced', note: `Contributed amount (${logAmount}) does not match review amount (${snap.amount}).` }
      return { outcome: 'confirmed', note: '' }

    } else if (snap.action === 'payout') {
      const log = contractLogs.find((l) => l.topics[0] === PAID_OUT_TOPIC)
      if (!log) return { outcome: 'replaced', note: 'No PaidOut event from this contract — transaction may have been replaced or cancelled.' }
      const logPoolId = BigInt(log.topics[1]).toString()
      const logRecipient = '0x' + log.topics[3].slice(-40)
      const logAmount = BigInt(log.data)
      if (logPoolId !== snap.poolId) return { outcome: 'replaced', note: `PaidOut event is for pool #${logPoolId}, not pool #${snap.poolId}.` }
      if (logRecipient.toLowerCase() !== snap.recipient.toLowerCase()) return { outcome: 'replaced', note: `PaidOut recipient (${logRecipient}) does not match expected (${snap.recipient}).` }
      if (logAmount !== snap.amount) return { outcome: 'replaced', note: `PaidOut amount (${logAmount}) does not match pool target (${snap.amount}).` }
      return { outcome: 'confirmed', note: '' }

    } else if (snap.action === 'refund') {
      const log = contractLogs.find((l) => l.topics[0] === REFUNDED_TOPIC)
      if (!log) return { outcome: 'replaced', note: 'No Refunded event from this contract — transaction may have been replaced or cancelled.' }
      const logPoolId = BigInt(log.topics[1]).toString()
      const logContributor = '0x' + log.topics[2].slice(-40)
      const logAmount = BigInt(log.data)
      if (logPoolId !== snap.poolId) return { outcome: 'replaced', note: `Refunded event is for pool #${logPoolId}, not pool #${snap.poolId}.` }
      if (logContributor.toLowerCase() !== snap.accountAddress.toLowerCase()) return { outcome: 'replaced', note: `Refunded contributor (${logContributor}) does not match submitting wallet (${snap.accountAddress}).` }
      if (logAmount !== snap.amount) return { outcome: 'replaced', note: `Refunded amount (${logAmount}) does not match claimed amount (${snap.amount}).` }
      return { outcome: 'confirmed', note: '' }
    }

    return { outcome: 'error', note: 'Unknown action type.' }
  } catch (err) {
    return { outcome: 'error', note: `RPC error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ─── ActionPanel ──────────────────────────────────────────────────────────────
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
  currentChainId: number | undefined   // live wallet chain, passed from Pool
  accountAddress: string
  rpcUrl: string
  onSuccess: (txHash: string, action: ActionType) => void
}

function ActionPanel({
  poolId, poolIdBig, status, target, remaining, recipient,
  myContribution, myClaimable, myClaimableLoading, myClaimableError,
  isConnected, currentChainId,
  accountAddress, rpcUrl,
  onSuccess,
}: ActionPanelProps) {
  const { switchChain } = useSwitchChain()
  const navigate = useNavigate()
  const wrongChain = isConnected && currentChainId !== TARGET_CHAIN_ID

  const [amountStr, setAmountStr] = useState('')
  const [amountError, setAmountError] = useState('')
  const [reviewSnapshot, setReviewSnapshot] = useState<ReviewSnapshot | null>(null)
  const [receiptValidation, setReceiptValidation] = useState<ReceiptValidation>({ phase: 'idle' })

  // Write hooks — scoped to this component; React remounts on key change
  const { writeContract: doContribute, data: contribHash, isPending: contribPending, isError: contribIsError, error: contribErr } = useWriteContract()
  const { isLoading: contribConfirming, isSuccess: contribSuccess } = useWaitForTransactionReceipt({ hash: contribHash, chainId: TARGET_CHAIN_ID })

  const { writeContract: doPayout, data: payoutHash, isPending: payoutPending, isError: payoutIsError, error: payoutErr } = useWriteContract()
  const { isLoading: payoutConfirming, isSuccess: payoutSuccess } = useWaitForTransactionReceipt({ hash: payoutHash, chainId: TARGET_CHAIN_ID })

  const { writeContract: doRefund, data: refundHash, isPending: refundPending, isError: refundIsError, error: refundErr } = useWriteContract()
  const { isLoading: refundConfirming, isSuccess: refundSuccess } = useWaitForTransactionReceipt({ hash: refundHash, chainId: TARGET_CHAIN_ID })

  // Capture snapshot at confirm time so receipt validation knows what to expect
  const pendingSnapRef = useRef<ReviewSnapshot | null>(null)

  // Receipt validation: after isSuccess, fetch receipt and check event/amount/recipient
  const notifiedRef = useRef<Set<string>>(new Set())

  const runReceiptValidation = useCallback(async (txHash: string, snap: ReviewSnapshot) => {
    if (notifiedRef.current.has(txHash)) return
    notifiedRef.current.add(txHash)
    setReceiptValidation({ phase: 'checking' })
    const result = await validateReceipt(txHash, snap, rpcUrl)
    if (result.outcome === 'confirmed') {
      setReceiptValidation({ phase: 'confirmed', txHash, action: snap.action })
      onSuccess(txHash, snap.action)
    } else if (result.outcome === 'replaced') {
      setReceiptValidation({ phase: 'replaced', txHash, note: result.note })
    } else {
      setReceiptValidation({ phase: 'error', txHash, message: result.note })
    }
  }, [rpcUrl, onSuccess])

  useEffect(() => {
    if (contribSuccess && contribHash && pendingSnapRef.current?.action === 'contribute') {
      void runReceiptValidation(contribHash, pendingSnapRef.current)
    }
  }, [contribSuccess, contribHash, runReceiptValidation])

  useEffect(() => {
    if (payoutSuccess && payoutHash && pendingSnapRef.current?.action === 'payout') {
      void runReceiptValidation(payoutHash, pendingSnapRef.current)
    }
  }, [payoutSuccess, payoutHash, runReceiptValidation])

  useEffect(() => {
    if (refundSuccess && refundHash && pendingSnapRef.current?.action === 'refund') {
      void runReceiptValidation(refundHash, pendingSnapRef.current)
    }
  }, [refundSuccess, refundHash, runReceiptValidation])

  // ── Review helpers ────────────────────────────────────────────────────────
  function openContributeReview(e: React.FormEvent) {
    e.preventDefault()
    setAmountError('')
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    try {
      const val = parseProductAmount(amountStr)
      if (val <= 0n) { setAmountError('Enter an amount greater than zero.'); return }
      if (val % (10n ** 12n) !== 0n) { setAmountError('Amount must be a multiple of 0.000001 USDC.'); return }
      if (val > remaining) { setAmountError(`Exceeds remaining capacity (${formatNativeAmount(remaining)} USDC).`); return }
      setReviewSnapshot({ action: 'contribute', amount: val, recipient: HUIPOT_ADDRESS, poolId, contractAddress: HUIPOT_ADDRESS, accountAddress })
    } catch {
      setAmountError('Invalid amount. Use up to 6 decimal places.')
    }
  }

  function openPayoutReview() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    setReviewSnapshot({ action: 'payout', amount: target, recipient, poolId, contractAddress: HUIPOT_ADDRESS, accountAddress })
  }

  function openRefundReview() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (!myClaimable || myClaimable <= 0n) return
    setReviewSnapshot({ action: 'refund', amount: myClaimable, recipient: accountAddress, poolId, contractAddress: HUIPOT_ADDRESS, accountAddress })
  }

  function cancelReview() { setReviewSnapshot(null) }

  function confirmAction() {
    if (!reviewSnapshot) return
    // Re-validate context at confirm time using LIVE wallet state
    if (currentChainId !== TARGET_CHAIN_ID) {
      cancelReview()
      return
    }
    if (reviewSnapshot.accountAddress !== accountAddress) {
      cancelReview()
      return
    }
    if (reviewSnapshot.contractAddress !== HUIPOT_ADDRESS) {
      cancelReview()
      return
    }
    if (reviewSnapshot.poolId !== poolId) {
      cancelReview()
      return
    }

    const snap = reviewSnapshot
    setReviewSnapshot(null)
    pendingSnapRef.current = snap  // save for receipt validation

    if (snap.action === 'contribute') {
      doContribute({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'contribute', args: [poolIdBig], value: snap.amount, chainId: TARGET_CHAIN_ID })
    } else if (snap.action === 'payout') {
      doPayout({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'payout', args: [poolIdBig], chainId: TARGET_CHAIN_ID })
    } else if (snap.action === 'refund') {
      doRefund({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'claimRefund', args: [poolIdBig], chainId: TARGET_CHAIN_ID })
    }
  }

  // ── Review modal ──────────────────────────────────────────────────────────
  if (reviewSnapshot) {
    const snap = reviewSnapshot
    const chainValid = currentChainId === TARGET_CHAIN_ID
    const accountValid = snap.accountAddress === accountAddress

    return (
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Review before signing</h3>

        {/* Context warnings if state drifted after review opened */}
        {(!chainValid || !accountValid) && (
          <div className="flex items-start gap-2 rounded-xl p-3 text-xs" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {!chainValid && 'Wrong network — switch to Arc Testnet before confirming. '}
              {!accountValid && 'Wallet account changed since review was opened. '}
              This review will be cancelled if you confirm.
            </span>
          </div>
        )}

        <dl className="space-y-2 text-sm">
          {[
            ['Action', snap.action === 'contribute' ? 'Contribute' : snap.action === 'payout' ? 'Trigger payout' : 'Claim refund'],
            ['Amount', `${formatNativeAmount(snap.amount)} USDC`],
            ['Pool', `#${snap.poolId}`],
            ['Contract', snap.contractAddress],
            ['Chain', `Arc Testnet (ID ${TARGET_CHAIN_ID})`],
            snap.action === 'payout'
              ? ['To (fixed recipient)', snap.recipient]
              : snap.action === 'refund'
                ? ['To (your wallet)', snap.recipient]
                : ['To (contract)', snap.recipient],
            ['Network fee', 'Not estimable before signing — you pay Arc gas (typically <0.01 USDC; exact amount shown in wallet)'],
            snap.action === 'contribute'
              ? ['Commitment', 'Contributions are irrevocable until the pool expires underfunded']
              : null,
          ].filter((r): r is [string, string] => r !== null).map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-36 shrink-0 font-medium" style={{ color: 'var(--muted)' }}>{k}</dt>
              <dd className="break-all mono text-xs" style={{ color: 'var(--ink)' }}>{v}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Terms derived from on-chain pool state at time of review. Confirming sends the transaction to your wallet for signing.
          If chain, account, or pool state changes before signing, confirmation will be cancelled.
        </p>

        <div className="flex gap-3 pt-1">
          <button
            onClick={confirmAction}
            disabled={!chainValid || !accountValid}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

  // ── Receipt validation banner ─────────────────────────────────────────────
  function ReceiptBanner() {
    if (receiptValidation.phase === 'checking') {
      return (
        <div className="rounded-xl p-3 text-sm mb-3 flex items-center gap-2" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Verifying transaction receipt…
        </div>
      )
    }
    if (receiptValidation.phase === 'confirmed') {
      const labels: Record<ActionType, string> = { contribute: 'Contribution confirmed', payout: 'Payout confirmed', refund: 'Refund confirmed' }
      return (
        <div className="rounded-xl p-3 text-sm mb-3" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
          {labels[receiptValidation.action]}.{' '}
          <a href={explorerTxUrl(receiptValidation.txHash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
          {' · '}
          <button onClick={() => navigate(`/pools/${poolId}/proof?tx=${receiptValidation.txHash}`)} className="underline">
            Verify proof
          </button>
        </div>
      )
    }
    if (receiptValidation.phase === 'replaced') {
      return (
        <div className="rounded-xl p-3 text-sm mb-3 flex items-start gap-2" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Transaction confirmed but no matching event was found — it may have been replaced or cancelled.{' '}
            <a href={explorerTxUrl(receiptValidation.txHash)} target="_blank" rel="noopener noreferrer" className="underline">Check on explorer</a>.
            {receiptValidation.note ? ` ${receiptValidation.note}` : ''}
          </span>
        </div>
      )
    }
    if (receiptValidation.phase === 'error') {
      return (
        <div className="rounded-xl p-3 text-sm mb-3 flex items-start gap-2" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Receipt check failed.{' '}
            <a href={explorerTxUrl(receiptValidation.txHash)} target="_blank" rel="noopener noreferrer" className="underline">View on explorer</a>.
            {receiptValidation.message ? ` ${receiptValidation.message}` : ''}
          </span>
        </div>
      )
    }
    return null
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
          <ReceiptBanner />
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
              <button type="button" onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                Switch to Arc Testnet
              </button>
            ) : (
              <button type="submit" disabled={contribPending || contribConfirming || receiptValidation.phase === 'checking'} className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
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
          <ReceiptBanner />
          {payoutIsError && (
            <div className="mb-3 rounded-xl p-2.5 text-xs" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
              {parseOnchainError(payoutErr)}
            </div>
          )}
          {!isConnected ? (
            <ConnectKitButton />
          ) : wrongChain ? (
            <button onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              Switch to Arc Testnet
            </button>
          ) : (
            <button
              onClick={openPayoutReview}
              disabled={payoutPending || payoutConfirming || receiptValidation.phase === 'confirmed' || receiptValidation.phase === 'checking'}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
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
            <p className="text-sm" style={{ color: 'var(--error-text)' }}>Could not load your refund balance. Please try again.</p>
          ) : myClaimable !== undefined && myClaimable > 0n ? (
            <>
              <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>
                Claim {formatNativeAmount(myClaimable)} USDC back to this wallet. You pay the network fee.
              </p>
              <ReceiptBanner />
              {refundIsError && (
                <div className="mb-3 rounded-xl p-2.5 text-xs" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
                  {parseOnchainError(refundErr)}
                </div>
              )}
              {wrongChain ? (
                <button onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                  Switch to Arc Testnet
                </button>
              ) : (
                <button
                  onClick={openRefundReview}
                  disabled={refundPending || refundConfirming || receiptValidation.phase === 'confirmed' || receiptValidation.phase === 'checking'}
                  className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  {refundPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirm in wallet…</span>
                    : refundConfirming ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</span>
                    : 'Review refund'}
                </button>
              )}
            </>
          ) : myClaimable !== undefined && myClaimable === 0n ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>This wallet has no unclaimed contribution. Other contributors may still have claims.</p>
          ) : (
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
  const { data: myClaimable, isLoading: myClaimableLoading, isError: myClaimableError, refetch: refetchClaimable } = useReadContract({
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
    navigator.clipboard.writeText(recv).then(() => { setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000) })
  }

  function copyPoolLink() {
    void buildShareLink(`/pools/${poolId}`).then((url) =>
      navigator.clipboard.writeText(url).then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) })
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

  const allRefundsClaimed = status === STATUS.CLOSED && totalContributed > 0n && totalRefunded >= totalContributed

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/pools" className="flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--muted)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to pools
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={copyPoolLink} className="flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--muted)' }} title="Copy pool link">
            {copiedLink ? <Check className="h-4 w-4" style={{ color: 'var(--success-text)' }} /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? 'Copied!' : 'Share'}
          </button>
          <Link to={`/pools/${poolId}/proof`} className="flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--muted)' }}>
            <ShieldCheck className="h-4 w-4" /> Proof
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>{title}</h1>
            {status !== undefined && (
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(status)}`}>{statusLabel(status)}</span>
            )}
          </div>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{purpose}</p>

          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="display tabular-nums text-4xl font-bold" style={{ color: 'var(--ink)' }}>{formatNativeAmount(totalContributed)}</span>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>/ {formatNativeAmount(target)} USDC</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full mb-2" style={{ background: 'var(--raised)' }}
              role="progressbar" aria-valuenow={clampedPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${clampedPct}% of goal funded`}>
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

          <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}>Fixed recipient</p>
            <div className="flex items-center gap-2">
              <a href={explorerAddressUrl(recipient)} target="_blank" rel="noopener noreferrer" className="mono text-sm break-all underline" style={{ color: 'var(--ink)' }}>{recipient}</a>
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
              <p style={{ color: 'var(--muted)' }}>Your contribution: <strong style={{ color: 'var(--ink)' }}>{formatNativeAmount(myContribution)} USDC</strong></p>
            </div>
          )}

          {status === STATUS.CLOSED && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              {allRefundsClaimed
                ? `Closed — all ${formatNativeAmount(totalContributed)} USDC contributed was refunded.`
                : totalContributed === 0n
                  ? 'Closed — no contributions were made.'
                  : `Closed — ${formatNativeAmount(totalRefunded)} of ${formatNativeAmount(totalContributed)} USDC refunded.`}
            </div>
          )}

          <CommitmentNotice />
        </div>

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
          currentChainId={chainId}
          accountAddress={address ?? ''}
          rpcUrl={RPC_URL}
          onSuccess={handleActionSuccess}
        />
      </div>
    </div>
  )
}
