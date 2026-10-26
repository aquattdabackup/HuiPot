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
import { validateReceipt } from '../lib/validateReceipt'

const RPC_URL = arcTestnet.rpcUrls.default.http[0]

const DEPLOYED = DEPLOYMENT_CONFIGURED

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionType = 'contribute' | 'payout' | 'refund'

// State of receipt validation after a confirmed transaction
type ReceiptPhase =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'confirmed'; txHash: string; action: ActionType }
  | { phase: 'replaced'; txHash: string; note: string }
  | { phase: 'repriced'; originalHash: string; minedHash: string; note: string }
  | { phase: 'cancelled'; originalHash: string; note: string }
  | { phase: 'error'; txHash: string; message: string; retryable: true }

interface ReviewSnapshot {
  action: ActionType
  amount: bigint          // native 18-dec
  recipient: string       // for payout: fixed recipient; for refund/contribute: caller wallet
  poolId: string
  contractAddress: string
  accountAddress: string
  // Live pool state at review-open time — used in confirmAction re-validation (RC4)
  statusAtReview: number | undefined
  remainingAtReview: bigint
  claimableAtReview: bigint
}

// validateReceipt is imported from ../lib/validateReceipt

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
  currentChainId: number | undefined   // live wallet chain, passed from Pool (RC: live check)
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

  // RC1: receipt state is keyed by action so a confirmed contribution does not
  // disable the payout button. Each action has its own phase slot.
  const [receiptByAction, setReceiptByAction] = useState<Partial<Record<ActionType, ReceiptPhase>>>({})

  // RC6: confirmed tx hash persisted so ReceiptBanner remains available after
  // pool state transitions away from ACTIVE/FUNDED/REFUNDING
  const confirmedTxRef = useRef<{ txHash: string; action: ActionType } | null>(null)

  function getPhase(action: ActionType): ReceiptPhase {
    return receiptByAction[action] ?? { phase: 'idle' }
  }
  function setPhase(action: ActionType, phase: ReceiptPhase) {
    setReceiptByAction((prev) => ({ ...prev, [action]: phase }))
  }

  const pendingSnapRef = useRef<ReviewSnapshot | null>(null)

  // RC3: generation counter — cancels stale async validations when a new tx is submitted
  // or when the component re-runs confirmAction before a previous validation completes.
  const validationGenRef = useRef(0)

  // RC3: notifiedRef only prevents re-entry for confirmed/replaced outcomes.
  // It is NOT set for errors, so a transient RPC failure can be retried.
  const notifiedRef = useRef<Set<string>>(new Set())

  const runReceiptValidation = useCallback(async (txHash: string, snap: ReviewSnapshot, gen: number) => {
    // Guard: only skip if we already got a non-error outcome for this hash
    if (notifiedRef.current.has(txHash)) return
    setPhase(snap.action, { phase: 'checking' })
    const result = await validateReceipt(txHash, snap, rpcUrl)
    // Stale check: if a newer validation was started, discard this result
    if (validationGenRef.current !== gen) return
    if (result.outcome === 'confirmed') {
      // RC3: mark confirmed so we do not re-run for this hash
      notifiedRef.current.add(txHash)
      setPhase(snap.action, { phase: 'confirmed', txHash, action: snap.action })
      // RC6: persist so banner survives pool state transitions
      confirmedTxRef.current = { txHash, action: snap.action }
      onSuccess(txHash, snap.action)
    } else if (result.outcome === 'replaced') {
      notifiedRef.current.add(txHash)
      setPhase(snap.action, { phase: 'replaced', txHash, note: result.note })
    } else {
      // RC3: error is NOT added to notifiedRef — user can retry via the banner button
      setPhase(snap.action, { phase: 'error', txHash, message: result.note, retryable: true })
    }
  }, [rpcUrl, onSuccess])

  // RC3: stable refs so onReplaced callbacks can safely close over latest values.
  // Updated every render so closures stay current without changing hook identity.
  const runReceiptValidationRef = useRef(runReceiptValidation)
  runReceiptValidationRef.current = runReceiptValidation
  const pendingSnapRefLocal = pendingSnapRef
  const validationGenRefLocal = validationGenRef
  const notifiedRefLocal = notifiedRef
  const setPhaseLocal = setPhase

  // RC3: onReplaced type (wagmi 2.19.5 WaitForTransactionReceiptOptions)
  type OnReplacedArg = {
    reason: 'repriced' | 'cancelled' | 'replaced'
    transaction: { hash: `0x${string}` }
    replacedTransaction: { hash: `0x${string}` }
  }

  // RC3: onReplaced handlers — one per action, stable identity via useCallback.
  // wagmi 2.19.5 supports onReplaced in useWaitForTransactionReceipt options
  // (see docs/STUDIO_RC_RECHECK.md installed-source evidence).
  const onContribReplaced = useCallback((r: OnReplacedArg) => {
    const originalHash = r.replacedTransaction.hash as string
    const minedHash = r.transaction.hash as string
    notifiedRefLocal.current.add(originalHash)
    if (r.reason === 'cancelled') {
      setPhaseLocal('contribute', { phase: 'cancelled', originalHash, note: `Original transaction was cancelled. (${originalHash.slice(0, 10)}…)` })
    } else if (r.reason === 'repriced' && pendingSnapRefLocal.current?.action === 'contribute') {
      const gen = ++validationGenRefLocal.current
      void runReceiptValidationRef.current(minedHash, pendingSnapRefLocal.current, gen)
    } else {
      setPhaseLocal('contribute', { phase: 'replaced', txHash: originalHash, note: `Transaction was replaced (${r.reason}). Mined: ${minedHash.slice(0, 10)}…` })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onPayoutReplaced = useCallback((r: OnReplacedArg) => {
    const originalHash = r.replacedTransaction.hash as string
    const minedHash = r.transaction.hash as string
    notifiedRefLocal.current.add(originalHash)
    if (r.reason === 'cancelled') {
      setPhaseLocal('payout', { phase: 'cancelled', originalHash, note: `Original transaction was cancelled. (${originalHash.slice(0, 10)}…)` })
    } else if (r.reason === 'repriced' && pendingSnapRefLocal.current?.action === 'payout') {
      const gen = ++validationGenRefLocal.current
      void runReceiptValidationRef.current(minedHash, pendingSnapRefLocal.current, gen)
    } else {
      setPhaseLocal('payout', { phase: 'replaced', txHash: originalHash, note: `Transaction was replaced (${r.reason}). Mined: ${minedHash.slice(0, 10)}…` })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefundReplaced = useCallback((r: OnReplacedArg) => {
    const originalHash = r.replacedTransaction.hash as string
    const minedHash = r.transaction.hash as string
    notifiedRefLocal.current.add(originalHash)
    if (r.reason === 'cancelled') {
      setPhaseLocal('refund', { phase: 'cancelled', originalHash, note: `Original transaction was cancelled. (${originalHash.slice(0, 10)}…)` })
    } else if (r.reason === 'repriced' && pendingSnapRefLocal.current?.action === 'refund') {
      const gen = ++validationGenRefLocal.current
      void runReceiptValidationRef.current(minedHash, pendingSnapRefLocal.current, gen)
    } else {
      setPhaseLocal('refund', { phase: 'replaced', txHash: originalHash, note: `Transaction was replaced (${r.reason}). Mined: ${minedHash.slice(0, 10)}…` })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Write hooks
  const { writeContract: doContribute, data: contribHash, isPending: contribPending, isError: contribIsError, error: contribErr, reset: resetContrib } = useWriteContract()
  const { isLoading: contribConfirming, isSuccess: contribSuccess, isError: contribWaitError, error: contribWaitErr } = useWaitForTransactionReceipt({
    hash: contribHash, chainId: TARGET_CHAIN_ID,
    onReplaced: onContribReplaced,
  })

  const { writeContract: doPayout, data: payoutHash, isPending: payoutPending, isError: payoutIsError, error: payoutErr, reset: resetPayout } = useWriteContract()
  const { isLoading: payoutConfirming, isSuccess: payoutSuccess, isError: payoutWaitError, error: payoutWaitErr } = useWaitForTransactionReceipt({
    hash: payoutHash, chainId: TARGET_CHAIN_ID,
    onReplaced: onPayoutReplaced,
  })

  const { writeContract: doRefund, data: refundHash, isPending: refundPending, isError: refundIsError, error: refundErr, reset: resetRefund } = useWriteContract()
  const { isLoading: refundConfirming, isSuccess: refundSuccess, isError: refundWaitError, error: refundWaitErr } = useWaitForTransactionReceipt({
    hash: refundHash, chainId: TARGET_CHAIN_ID,
    onReplaced: onRefundReplaced,
  })

  // RC3: surface wait-hook errors (revert path — wagmi throws on revert)
  useEffect(() => {
    if (contribWaitError && contribHash && pendingSnapRef.current?.action === 'contribute') {
      setPhase('contribute', {
        phase: 'error',
        txHash: contribHash,
        message: contribWaitErr instanceof Error ? contribWaitErr.message : 'Transaction reverted or could not be confirmed.',
        retryable: true,
      })
    }
  }, [contribWaitError, contribHash, contribWaitErr])

  useEffect(() => {
    if (payoutWaitError && payoutHash && pendingSnapRef.current?.action === 'payout') {
      setPhase('payout', {
        phase: 'error',
        txHash: payoutHash,
        message: payoutWaitErr instanceof Error ? payoutWaitErr.message : 'Transaction reverted or could not be confirmed.',
        retryable: true,
      })
    }
  }, [payoutWaitError, payoutHash, payoutWaitErr])

  useEffect(() => {
    if (refundWaitError && refundHash && pendingSnapRef.current?.action === 'refund') {
      setPhase('refund', {
        phase: 'error',
        txHash: refundHash,
        message: refundWaitErr instanceof Error ? refundWaitErr.message : 'Transaction reverted or could not be confirmed.',
        retryable: true,
      })
    }
  }, [refundWaitError, refundHash, refundWaitErr])

  useEffect(() => {
    if (contribSuccess && contribHash && pendingSnapRef.current?.action === 'contribute') {
      const gen = ++validationGenRef.current
      void runReceiptValidation(contribHash, pendingSnapRef.current, gen)
    }
  }, [contribSuccess, contribHash, runReceiptValidation])

  useEffect(() => {
    if (payoutSuccess && payoutHash && pendingSnapRef.current?.action === 'payout') {
      const gen = ++validationGenRef.current
      void runReceiptValidation(payoutHash, pendingSnapRef.current, gen)
    }
  }, [payoutSuccess, payoutHash, runReceiptValidation])

  useEffect(() => {
    if (refundSuccess && refundHash && pendingSnapRef.current?.action === 'refund') {
      const gen = ++validationGenRef.current
      void runReceiptValidation(refundHash, pendingSnapRef.current, gen)
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
      setReviewSnapshot({
        action: 'contribute', amount: val, recipient: HUIPOT_ADDRESS, poolId,
        contractAddress: HUIPOT_ADDRESS, accountAddress,
        statusAtReview: status, remainingAtReview: remaining,
        claimableAtReview: myClaimable ?? 0n,
      })
    } catch {
      setAmountError('Invalid amount. Use up to 6 decimal places.')
    }
  }

  function openPayoutReview() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    setReviewSnapshot({
      action: 'payout', amount: target, recipient, poolId,
      contractAddress: HUIPOT_ADDRESS, accountAddress,
      statusAtReview: status, remainingAtReview: remaining,
      claimableAtReview: 0n,
    })
  }

  function openRefundReview() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (!myClaimable || myClaimable <= 0n) return
    setReviewSnapshot({
      action: 'refund', amount: myClaimable, recipient: accountAddress, poolId,
      contractAddress: HUIPOT_ADDRESS, accountAddress,
      statusAtReview: status, remainingAtReview: remaining,
      claimableAtReview: myClaimable,
    })
  }

  function cancelReview() { setReviewSnapshot(null) }

  function confirmAction() {
    if (!reviewSnapshot) return

    // RC: live chain (not stored snapshot chain)
    if (currentChainId !== TARGET_CHAIN_ID) { cancelReview(); return }
    if (reviewSnapshot.accountAddress !== accountAddress) { cancelReview(); return }
    if (reviewSnapshot.contractAddress !== HUIPOT_ADDRESS) { cancelReview(); return }
    if (reviewSnapshot.poolId !== poolId) { cancelReview(); return }

    // RC4: re-validate pool state at confirm time (not just at review-open time)
    if (reviewSnapshot.action === 'contribute') {
      // Pool must still be ACTIVE and have enough remaining capacity
      if (status !== STATUS.ACTIVE) { cancelReview(); return }
      if (reviewSnapshot.amount > remaining) { cancelReview(); return }
    } else if (reviewSnapshot.action === 'payout') {
      // Pool must still be FUNDED
      if (status !== STATUS.FUNDED) { cancelReview(); return }
    } else if (reviewSnapshot.action === 'refund') {
      // Pool must still be REFUNDING and claimable amount must still be valid
      if (status !== STATUS.REFUNDING) { cancelReview(); return }
      if (!myClaimable || myClaimable <= 0n) { cancelReview(); return }
    }

    const snap = reviewSnapshot
    setReviewSnapshot(null)
    pendingSnapRef.current = snap
    // RC3: bump generation so any in-flight validation from a previous attempt is discarded
    validationGenRef.current++

    if (snap.action === 'contribute') {
      resetContrib()
      doContribute({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'contribute', args: [poolIdBig], value: snap.amount, chainId: TARGET_CHAIN_ID })
    } else if (snap.action === 'payout') {
      resetPayout()
      doPayout({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'payout', args: [poolIdBig], chainId: TARGET_CHAIN_ID })
    } else if (snap.action === 'refund') {
      resetRefund()
      doRefund({ address: HUIPOT_ADDRESS, abi: HUIPOT_ABI, functionName: 'claimRefund', args: [poolIdBig], chainId: TARGET_CHAIN_ID })
    }
  }

  // ── Review modal ──────────────────────────────────────────────────────────
  if (reviewSnapshot) {
    const snap = reviewSnapshot
    const chainValid = currentChainId === TARGET_CHAIN_ID
    const accountValid = snap.accountAddress === accountAddress

    // RC4: detect live pool state changes while review is open
    let poolStateStale = false
    if (snap.action === 'contribute' && (status !== STATUS.ACTIVE || snap.amount > remaining)) poolStateStale = true
    if (snap.action === 'payout' && status !== STATUS.FUNDED) poolStateStale = true
    if (snap.action === 'refund' && (status !== STATUS.REFUNDING || !myClaimable || myClaimable <= 0n)) poolStateStale = true

    const canConfirm = chainValid && accountValid && !poolStateStale

    return (
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Review before signing</h3>

        {/* Context warnings if state drifted after review opened */}
        {(!chainValid || !accountValid || poolStateStale) && (
          <div className="flex items-start gap-2 rounded-xl p-3 text-xs" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {!chainValid && 'Wrong network — switch to Arc Testnet before confirming. '}
              {!accountValid && 'Wallet account changed since review was opened. '}
              {poolStateStale && 'Pool state changed since review was opened — this action may no longer be valid. '}
              This review will be cancelled if you confirm now.
            </span>
          </div>
        )}

        <dl className="space-y-2 text-sm">
          {([
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
            // RC5: honest gas string — does not claim estimation requires signing;
            // wallet provides the exact fee before the user signs.
            ['Network fee', 'The wallet will show the exact fee before you sign (Arc gas, typically <0.01 USDC).'],
            snap.action === 'contribute'
              ? ['Commitment', 'Contributions are irrevocable until the pool expires underfunded']
              : null,
          ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null).map(([k, v]) => (
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
            disabled={!canConfirm}
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
  // RC6: also show for confirmedTxRef if the current action's phase is idle
  // (pool may have transitioned to PAID/CLOSED and remounted ActionPanel)
  function ReceiptBanner({ action }: { action: ActionType }) {
    const phase = getPhase(action)

    // RC6: if this action has no active phase but we have a confirmed tx for it,
    // show the persistent confirmed banner
    if (phase.phase === 'idle' && confirmedTxRef.current?.action === action) {
      const { txHash } = confirmedTxRef.current
      return (
        <div className="rounded-xl p-3 text-sm mb-3" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
          {action === 'contribute' ? 'Contribution confirmed' : action === 'payout' ? 'Payout confirmed' : 'Refund confirmed'}.{' '}
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
          {' · '}
          <button onClick={() => navigate(`/pools/${poolId}/proof?tx=${txHash}`)} className="underline">
            Verify proof
          </button>
        </div>
      )
    }

    if (phase.phase === 'checking') {
      return (
        <div className="rounded-xl p-3 text-sm mb-3 flex items-center gap-2" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Verifying transaction receipt…
        </div>
      )
    }
    if (phase.phase === 'confirmed') {
      const labels: Record<ActionType, string> = { contribute: 'Contribution confirmed', payout: 'Payout confirmed', refund: 'Refund confirmed' }
      return (
        <div className="rounded-xl p-3 text-sm mb-3" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
          {labels[phase.action]}.{' '}
          <a href={explorerTxUrl(phase.txHash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
          {' · '}
          <button onClick={() => navigate(`/pools/${poolId}/proof?tx=${phase.txHash}`)} className="underline">
            Verify proof
          </button>
        </div>
      )
    }
    if (phase.phase === 'replaced') {
      return (
        <div className="rounded-xl p-3 text-sm mb-3 flex items-start gap-2" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Transaction confirmed but no matching event was found — it may have been replaced or cancelled.{' '}
            <a href={explorerTxUrl(phase.txHash)} target="_blank" rel="noopener noreferrer" className="underline">Check on explorer</a>.
            {phase.note ? ` ${phase.note}` : ''}
          </span>
        </div>
      )
    }
    // RC3: repriced — sped-up tx with same intent; re-validated
    if (phase.phase === 'repriced') {
      return (
        <div className="rounded-xl p-3 text-sm mb-3 flex items-start gap-2" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Transaction was repriced (speed-up). Validating replacement hash…{' '}
            <a href={explorerTxUrl(phase.minedHash)} target="_blank" rel="noopener noreferrer" className="underline">View on explorer</a>.
            {phase.note ? ` ${phase.note}` : ''}
          </span>
        </div>
      )
    }
    // RC3: cancelled — tx was cancelled in wallet
    if (phase.phase === 'cancelled') {
      return (
        <div className="rounded-xl p-3 text-sm mb-3 flex items-start gap-2" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Transaction was cancelled.{' '}
            {phase.note}
          </span>
        </div>
      )
    }
    if (phase.phase === 'error') {
      return (
        <div className="rounded-xl p-3 text-sm mb-3 flex items-start gap-2" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Receipt check failed — you may retry.{' '}
            {phase.txHash && (
              <><a href={explorerTxUrl(phase.txHash)} target="_blank" rel="noopener noreferrer" className="underline">View on explorer</a>.{' '}</>
            )}
            {phase.message}
            {/* RC3: allow retry for transient errors */}
            {phase.retryable && pendingSnapRef.current?.action === action && phase.txHash && (
              <button
                className="ml-2 underline font-semibold"
                onClick={() => {
                  if (pendingSnapRef.current) {
                    // Clear notifiedRef entry so retry is allowed
                    notifiedRef.current.delete(phase.txHash)
                    const gen = ++validationGenRef.current
                    void runReceiptValidation(phase.txHash, pendingSnapRef.current, gen)
                  }
                }}
              >
                Retry
              </button>
            )}
          </span>
        </div>
      )
    }
    return null
  }

  // RC1: action-scoped disable.
  // For payout/refund: disable while checking or already confirmed (one-shot actions).
  // For contribute: disable only while checking — confirmed contribution does NOT permanently
  // lock the form; the user may contribute again if capacity remains (repeated contributions).
  function isActionBusy(action: ActionType): boolean {
    const p = getPhase(action)
    if (action === 'contribute') {
      return p.phase === 'checking'
    }
    return p.phase === 'confirmed' || p.phase === 'checking'
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
          <ReceiptBanner action="contribute" />
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
              <button type="submit" disabled={contribPending || contribConfirming || isActionBusy('contribute')} className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                {contribPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirm in wallet…</span>
                  : contribConfirming ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</span>
                  : 'Review contribution'}
              </button>
            )}
          </form>
        </div>
      )}

      {/* RC6: contribution evidence — shown at FUNDED (transition from ACTIVE) so banner is not lost */}
      {status === STATUS.FUNDED && isConnected && (
        <ReceiptBanner action="contribute" />
      )}

      {/* Funded → Payout */}
      {status === STATUS.FUNDED && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid rgba(210,250,105,0.3)' }}>
          <h3 className="mb-2 font-semibold" style={{ color: 'var(--ink)' }}>Goal reached</h3>
          <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
            The goal is met. This sends {formatNativeAmount(target)} USDC to the fixed recipient. Anyone may trigger it.
          </p>
          <ReceiptBanner action="payout" />
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
            // RC1: disable only when payout action's phase is confirmed/checking
            <button
              onClick={openPayoutReview}
              disabled={payoutPending || payoutConfirming || isActionBusy('payout')}
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
          {/* RC6: show confirmedTxRef if payout was confirmed this session */}
          {confirmedTxRef.current?.action === 'payout' && (
            <p className="mt-2 text-xs" style={{ color: 'var(--success-text)' }}>
              <a href={explorerTxUrl(confirmedTxRef.current.txHash)} target="_blank" rel="noopener noreferrer" className="underline">View confirmed tx</a>
              {' · '}
              <button onClick={() => navigate(`/pools/${poolId}/proof?tx=${confirmedTxRef.current!.txHash}`)} className="underline">Verify proof</button>
            </p>
          )}
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
              <ReceiptBanner action="refund" />
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
                // RC1: disable only when refund action's phase is confirmed/checking
                <button
                  onClick={openRefundReview}
                  disabled={refundPending || refundConfirming || isActionBusy('refund')}
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
            <>
              {/* RC6: show refund evidence even after myClaimable drops to 0 (refund just claimed) */}
              <ReceiptBanner action="refund" />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {getPhase('refund').phase === 'confirmed' || confirmedTxRef.current?.action === 'refund'
                  ? 'Refund processed — your contribution has been returned.'
                  : 'This wallet has no unclaimed contribution. Other contributors may still have claims.'}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading refund balance…</p>
          )}
        </div>
      )}

      {/* Closed */}
      {status === STATUS.CLOSED && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          {/* RC6: show refund and contribution evidence before generic closed message */}
          {isConnected && <ReceiptBanner action="refund" />}
          {isConnected && <ReceiptBanner action="contribute" />}
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
