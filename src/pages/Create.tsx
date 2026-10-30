import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, usePublicClient } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ArrowLeft, Check, Loader2, AlertCircle, ShieldAlert, RefreshCw, ExternalLink } from 'lucide-react'
import { decodeEventLog } from 'viem'
import { HUIPOT_ADDRESS, HUIPOT_ABI, DEPLOYMENT_CONFIGURED } from '../contract'
import { TARGET_CHAIN_ID, parseProductAmount, formatNativeAmount, explorerTxUrl } from '../config'
import { CommitmentNotice } from '../components/CommitmentNotice'
import { formatDeadline, parseOnchainError } from '../lib/utils'

const DEPLOYED = DEPLOYMENT_CONFIGURED

function fieldError(errors: Record<string, string>, field: string) {
  return errors[field] ? (
    <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--error-text)' }}>
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {errors[field]}
    </p>
  ) : null
}

export function Create() {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()

  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [targetStr, setTargetStr] = useState('')
  const [recipient, setRecipient] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('12:00')
  const [reviewed, setReviewed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { writeContract, data: hash, isPending, isError, error } = useWriteContract()
  // CSF3: pin receipt watching to the submitted Arc Testnet chain so that a wallet
  // or config network switch after submission does not redirect lookup to another chain.
  // CW2: destructure isError/error/refetch/fetchStatus so receipt-query failures are
  // surfaced and a read-only retry is available without calling writeContract.
  // CWR2: timeout=30_000ms gives a finite recovery boundary; wagmi default is 0 (no bound).
  //
  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
    isError: isReceiptError,
    error: receiptError,
    refetch: _rawRefetch,
    fetchStatus: receiptFetchStatus,
  } = useWaitForTransactionReceipt({
    hash,
    chainId: TARGET_CHAIN_ID,
    timeout: 30_000,
    onReplaced: ({ transactionReceipt }) => {
      // FFR1: capture the mined replacement hash for use in the independent revert check.
      replacedHashRef.current = transactionReceipt.transactionHash
    },
  })

  // CWR2: cancelRefetch:true ensures a retry starts a new receipt read request.
  // Note: TanStack Query deduplicates in-flight promises when no cached data exists
  // so the effect is equivalent to a default refetch when no cached receipt exists;
  // it cancels an in-flight fetch and starts fresh when cached data is present.
  // This is per attempt; query retries may postpone the final timeout banner.
  // Never calls writeContract.
  function retryReceipt() {
    void _rawRefetch({ cancelRefetch: true })
  }

  // CWR6/FFR1/FFR2: When the wagmi watcher reports an error, fetch the receipt
  // independently to classify whether the active submission was confirmed as reverted.
  // FFR1: prefer the replacement hash (replacedHashRef.current) over the original hash
  // so that a replacement B reverted case looks up B, not A. Explorer link follows the
  // same hash so it shows the correct mined transaction.
  // FFR2: bind verification to the current (hash, replacedHashRef.current) pair.
  // Return a cleanup function so that a stale resolution/rejection after the hash or
  // isReceiptError changes cannot overwrite a newer verdict.
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID })
  const [revertedOnChain, setRevertedOnChain] = useState<boolean | null>(null)
  // FFR1: expose the hash used for the independent revert lookup so the explorer link
  // matches the looked-up transaction.
  const [revertLookupHash, setRevertLookupHash] = useState<`0x${string}` | null>(null)
  useEffect(() => {
    if (!isReceiptError || !hash || !publicClient) {
      setRevertedOnChain(null)
      setRevertLookupHash(null)
      return
    }
    // FFR2: cancelled flag so stale resolution does not clobber a newer verdict.
    let cancelled = false
    // FFR1: use replacement hash if available, otherwise the original submitted hash.
    const lookupHash = replacedHashRef.current ?? hash
    setRevertLookupHash(lookupHash)
    void publicClient.getTransactionReceipt({ hash: lookupHash }).then(r => {
      if (cancelled) return
      setRevertedOnChain(r.status === 'reverted')
    }).catch(() => {
      if (cancelled) return
      setRevertedOnChain(null)
    })
    return () => { cancelled = true }
  }, [isReceiptError, hash, publicClient])

  // CS2: Immutable submission snapshot — captured at the moment writeContract is called.
  // Receipt validation checks all these fields against the PoolCreated event so that a
  // receipt with matching creator/recipient but a different target, deadline, title or
  // purpose is never shown as successful pool creation.
  const submittedRef = useRef<{
    account: string
    chainId: number
    contractAddress: string
    recipient: string
    targetNative: bigint
    deadlineUnix: number
    title: string
    purpose: string
  } | null>(null)

  // FFR1: capture the mined replacement hash when wagmi fires onReplaced.
  // Declared here (after submittedRef) so ref indices are: refs[0]=submittedRef, refs[1]=replacedHashRef.
  const replacedHashRef = useRef<`0x${string}` | null>(null)

  const wrongChain = isConnected && chainId !== TARGET_CHAIN_ID

  // Derive deadline Unix timestamp from local date+time inputs
  function getDeadlineUnix(): number | null {
    if (!deadlineDate || !deadlineTime) return null
    const dt = new Date(`${deadlineDate}T${deadlineTime}:00`)
    if (isNaN(dt.getTime())) return null
    return Math.floor(dt.getTime() / 1000)
  }

  const deadlineUnix = getDeadlineUnix()

  function validate(): boolean {
    const errs: Record<string, string> = {}

    const titleBytes = new TextEncoder().encode(title.trim()).length
    if (title.trim().length === 0) errs.title = 'Title is required.'
    else if (titleBytes < 1 || titleBytes > 80) errs.title = `Title must be 1–80 bytes (currently ${titleBytes}).`

    const purposeBytes = new TextEncoder().encode(purpose.trim()).length
    if (purpose.trim().length === 0) errs.purpose = 'Purpose is required.'
    else if (purposeBytes < 1 || purposeBytes > 280) errs.purpose = `Purpose must be 1–280 bytes (currently ${purposeBytes}).`

    if (!targetStr.trim()) {
      errs.target = 'Target amount is required.'
    } else {
      try {
        const targetNative = parseProductAmount(targetStr)
        if (targetNative <= 0n) errs.target = 'Target must be greater than zero.'
        else if (targetNative % (10n ** 12n) !== 0n) errs.target = 'Amount must be a multiple of 0.000001 USDC.'
      } catch {
        errs.target = 'Invalid amount. Use up to 6 decimal places.'
      }
    }

    if (!recipient.trim()) {
      errs.recipient = 'Recipient address is required.'
    } else if (!/^0x[0-9a-fA-F]{40}$/.test(recipient.trim())) {
      errs.recipient = 'Enter a valid 0x Ethereum address.'
    } else if (/^0x0{40}$/.test(recipient.trim())) {
      // CS1: reject the all-zero address before wallet invocation.
      // The contract would revert with InvalidRecipient, but we reject early
      // so no wallet prompt is shown for a clearly invalid recipient.
      errs.recipient = 'Recipient cannot be the zero address.'
    } else if (recipient.trim().toLowerCase() === HUIPOT_ADDRESS.toLowerCase()) {
      errs.recipient = 'Recipient cannot be this contract.'
    }

    const now = Math.floor(Date.now() / 1000)
    if (!deadlineDate) {
      errs.deadline = 'Deadline date is required.'
    } else if (!deadlineUnix) {
      errs.deadline = 'Invalid date or time.'
    } else if (deadlineUnix <= now) {
      errs.deadline = 'Deadline must be in the future.'
    } else if (deadlineUnix > now + 30 * 24 * 60 * 60) {
      errs.deadline = 'Deadline must be at most 30 days from now.'
    }

    if (!reviewed) {
      errs.reviewed = 'Please acknowledge the terms before creating.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // CWR1: if a hash is already submitted and outcome is still unknown (pending,
    // paused/offline, or receipt error), block any new submission at the handler
    // level. This prevents a duplicate creation even if the visible button is
    // somehow enabled (e.g. keyboard Enter, programmatic trigger, or a paused
    // query with isLoading=false and isError=false).
    if (hash) return

    // PF2: disconnected submit must never reach writeContract even if triggered
    // by a keyboard Enter or an unexpected button click. Return silently — the
    // connection UI is shown by the render path below.
    if (!isConnected) return

    if (!validate()) return

    if (wrongChain) {
      switchChain({ chainId: TARGET_CHAIN_ID })
      return
    }

    const targetNative = parseProductAmount(targetStr)

    // CS2: capture full immutable submission context before wallet prompt.
    submittedRef.current = {
      account: address ?? '',
      chainId: chainId ?? TARGET_CHAIN_ID,
      contractAddress: HUIPOT_ADDRESS,
      recipient: recipient.trim(),
      targetNative,
      deadlineUnix: deadlineUnix!,
      title: title.trim(),
      purpose: purpose.trim(),
    }
    writeContract({
      address: HUIPOT_ADDRESS,
      abi: HUIPOT_ABI,
      functionName: 'createPool',
      args: [
        recipient.trim() as `0x${string}`,
        targetNative,
        BigInt(deadlineUnix!),
        title.trim(),
        purpose.trim(),
      ],
      chainId: TARGET_CHAIN_ID,
    })
  }

  // CSF1 + CS2 + R3: Extract poolId only from a PoolCreated log emitted by the expected contract.
  // Require a complete submission snapshot — if missing or incomplete, no success is shown.
  // Validate the event against every field of the immutable snapshot; a receipt with a
  // different target, deadline, title, purpose, creator, or recipient is not success.
  // A receipt with no matching log (replacement, cancellation, unrelated tx) is not success.
  let createdPoolId: string | undefined
  let poolCreatedEventFound = false
  if (isSuccess && receipt) {
    const snap = submittedRef.current
    // CSF1: require a complete, non-empty snapshot before accepting any receipt.
    // An absent or empty submitting account must not relax the creator check.
    const snapOk = snap !== null &&
      snap.account !== '' &&
      snap.contractAddress !== '' &&
      snap.recipient !== ''
    if (snapOk) {
      for (const log of receipt.logs) {
        // Must be emitted by the expected contract address — reject logs from unrelated addresses
        if (log.address.toLowerCase() !== snap.contractAddress.toLowerCase()) continue
        try {
          const decoded = decodeEventLog({
            abi: HUIPOT_ABI,
            eventName: 'PoolCreated',
            data: log.data,
            topics: log.topics,
          })
          const args = decoded.args as {
            poolId?: bigint
            creator?: string
            recipient?: string
            target?: bigint
            deadline?: bigint
            title?: string
            purpose?: string
          }
          const poolId = args.poolId?.toString()
          const logCreator = (args.creator ?? '').toLowerCase()
          const logRecipient = (args.recipient ?? '').toLowerCase()
          const logTarget = args.target
          const logDeadline = args.deadline
          const logTitle = args.title ?? ''
          const logPurpose = args.purpose ?? ''

          // CSF1: creator must equal the submitting account — empty account is rejected above.
          if (logCreator !== snap.account.toLowerCase()) break

          // Recipient must match the snapshot recipient.
          if (logRecipient !== snap.recipient.toLowerCase()) break

          // CS2: target, deadline, title and purpose must all match the submission snapshot.
          if (logTarget !== snap.targetNative) break
          if (logDeadline !== BigInt(snap.deadlineUnix)) break
          if (logTitle !== snap.title) break
          if (logPurpose !== snap.purpose) break

          if (poolId) {
            createdPoolId = poolId
            poolCreatedEventFound = true
          }
          break
        } catch {
          // not this event
        }
      }
    }
  }

  // CSF2: use the mined receipt hash for all explorer links so that a replaced transaction
  // (hash A replaced by hash B) shows the correct on-chain evidence.
  const minedHash = (isSuccess && receipt?.transactionHash) ? receipt.transactionHash : hash

  // CWR6/FFR1: Confirmed on-chain revert path.
  // wagmi's waitForTransactionReceipt action throws (isError=true) when it receives a
  // reverted receipt; data is absent. We independently fetch the receipt via publicClient
  // to confirm it was actually mined as reverted — not a network/RPC error.
  // revertedOnChain=null means the check hasn't resolved yet or the read failed (unknown).
  // FFR1: revertLookupHash is the hash that was actually looked up (replacement B if present,
  // original A otherwise), so the explorer link shows the correct mined transaction.
  if (isReceiptError && revertedOnChain === true) {
    // FFR1: use the hash that was confirmed reverted (replacement or original)
    const revertExplorerHash = revertLookupHash ?? hash
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full mx-auto"
          style={{ background: 'var(--error-bg)' }}
        >
          <AlertCircle className="h-8 w-8" style={{ color: 'var(--error-text)' }} />
        </div>
        <h1 className="display text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Transaction reverted — no pool created
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--muted)' }}>
          The transaction was confirmed on-chain but reverted. No pool was created. This may be
          caused by a validation error in the contract (e.g. invalid recipient or expired deadline).
          Check the transaction for details, then try again with corrected terms.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href={explorerTxUrl(revertExplorerHash!)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
            style={{ color: 'var(--muted)' }}
          >
            View reverted transaction on ArcScan
          </a>
          <Link to="/create" className="text-sm" style={{ color: 'var(--muted)' }} onClick={() => window.location.reload()}>
            Try again
          </Link>
        </div>
      </div>
    )
  }

  if (isSuccess && receipt) {
    if (!poolCreatedEventFound) {
      // Receipt succeeded (status=success) but no matching PoolCreated event — replaced or unrelated tx
      return (
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full mx-auto"
            style={{ background: 'var(--warning-bg)' }}
          >
            <ShieldAlert className="h-8 w-8" style={{ color: 'var(--warning-text)' }} />
          </div>
          <h1 className="display text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
            Transaction succeeded — no pool created
          </h1>
          <p className="mb-6 text-sm" style={{ color: 'var(--muted)' }}>
            The transaction was confirmed but contained no matching PoolCreated event from this
            contract. It may have been replaced, cancelled, or is unrelated to this pool creation.
            No pool was recorded.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={explorerTxUrl(minedHash!)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
              style={{ color: 'var(--muted)' }}
            >
              View transaction on ArcScan
            </a>
            <Link to="/create" className="text-sm" style={{ color: 'var(--muted)' }} onClick={() => window.location.reload()}>
              Try again
            </Link>
          </div>
        </div>
      )
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full mx-auto"
          style={{ background: 'var(--success-bg)' }}
        >
          <Check className="h-8 w-8" style={{ color: 'var(--success-text)' }} />
        </div>
        <h1 className="display text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Pool created
        </h1>
        {createdPoolId && (
          <p className="mb-6 text-sm" style={{ color: 'var(--muted)' }}>
            Pool #{createdPoolId} is now live on Arc Testnet.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {createdPoolId && (
            <Link
              to={`/pools/${createdPoolId}`}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: 'var(--accent)', display: 'block' }}
            >
              View pool #{createdPoolId}
            </Link>
          )}
          <a
            href={explorerTxUrl(minedHash!)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
            style={{ color: 'var(--muted)' }}
          >
            View transaction on ArcScan
          </a>
          <Link to="/pools" className="text-sm" style={{ color: 'var(--muted)' }}>
            Back to pools
          </Link>
        </div>
      </div>
    )
  }

  // Safe parse for inline display hint — never throws into the render tree
  const targetNative = (() => {
    try {
      const n = parseProductAmount(targetStr)
      return n > 0n ? n : null
    } catch { return null }
  })()

  // CWR1/CW1/CW2: determine whether a submitted hash is still unresolved.
  // isConfirming covers isLoading=true (active fetch).
  // isReceiptError covers a settled RPC/transport error.
  // receiptFetchStatus==='paused' covers the TanStack offline/paused state where
  // isLoading and isError are both false but the query has not completed — the
  // outcome is still unknown and must not re-enable the create form.
  const hashPending = !!hash && (isConfirming || isReceiptError || receiptFetchStatus === 'paused')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          to="/pools"
          className="flex items-center gap-1.5 text-sm no-underline"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to pools
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="display text-3xl font-bold" style={{ color: 'var(--ink)' }}>
          Create a pool
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>
          Set a fixed goal, recipient, and deadline. Terms cannot be changed after creation.
        </p>
      </div>

      {/* CW1/CW2: confirmation status banner — shown whenever a hash exists but outcome is
          still unknown (waiting for receipt, or receipt query errored). This section is
          read-only: the retry button calls retryReceipt (a wagmi refetch) and never calls
          writeContract or requests a new signature. It is rendered outside the <form> so
          it cannot be accidentally submitted. */}
      {hashPending && (
        <div
          className="mb-6 rounded-xl p-4 text-sm"
          style={{
            background: isReceiptError ? 'var(--error-bg)' : 'var(--warning-bg)',
            border: `1px solid ${isReceiptError ? 'var(--error-text)' : 'var(--border)'}`,
            color: isReceiptError ? 'var(--error-text)' : 'var(--warning-text)',
          }}
        >
          <div className="flex items-start gap-3">
            {isReceiptError ? (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            ) : receiptFetchStatus === 'paused' ? (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin" />
            )}
            <div className="flex-1 min-w-0">
              {isReceiptError ? (
                <>
                  {/* CWR2: distinguish timeout (outcome unknown) from transport/RPC error */}
                  <p className="font-medium mb-1">
                    {receiptError?.name === 'WaitForTransactionReceiptTimeoutError'
                      ? 'Confirmation timed out — outcome unknown'
                      : 'Could not confirm the transaction'}
                  </p>
                  <p className="text-xs opacity-80 mb-3">
                    {receiptError?.name === 'WaitForTransactionReceiptTimeoutError'
                      ? 'The transaction may still be pending or already mined. A timeout is not proof of failure. Check ArcScan or retry.'
                      : (receiptError instanceof Error ? receiptError.message : 'Receipt lookup failed. The transaction may still have been mined.')}
                  </p>
                </>
              ) : receiptFetchStatus === 'paused' ? (
                <>
                  {/* CWR1: offline/paused — outcome unknown, do not claim failure */}
                  <p className="font-medium mb-1">Waiting for confirmation — offline</p>
                  <p className="text-xs opacity-80 mb-3">
                    Network is unavailable. The transaction was submitted but confirmation is paused.
                    Do not create another pool. Check ArcScan when back online.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">Waiting for confirmation…</p>
                  <p className="text-xs opacity-80 mb-3">
                    Your transaction was submitted. Do not create another pool — check the status below.
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-3 items-center">
                {/* CW1: explorer link available as soon as hash exists */}
                <a
                  href={explorerTxUrl(hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Check transaction on ArcScan
                </a>
                {/* CW2: read-only retry — only calls refetch, never writeContract */}
                <button
                  type="button"
                  onClick={() => retryReceipt()}
                  className="inline-flex items-center gap-1 text-xs underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  {isReceiptError ? 'Retry confirmation check' : 'Check transaction status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!DEPLOYED && (
        <div
          className="mb-6 rounded-xl p-4 text-sm"
          style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}
        >
          Contract not deployed. Deploy HuiPotGoalPool to Arc Testnet first.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div
          className="rounded-2xl p-6 mb-5"
          style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
            Pool details
          </h2>
          <div className="flex flex-col gap-5">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block mb-1.5 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. Workshop recording kit"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--surface-muted)',
                  border: `1px solid ${errors.title ? 'var(--error-text)' : 'var(--border-strong)'}`,
                  color: 'var(--ink)',
                }}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              <div className="flex justify-between">
                {errors.title ? fieldError(errors, 'title') : <span />}
                <span className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                  {new TextEncoder().encode(title).length}/80 bytes
                </span>
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label htmlFor="purpose" className="block mb-1.5 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                Purpose
              </label>
              <textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                placeholder="Describe what this pool funds and why"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
                style={{
                  background: 'var(--surface-muted)',
                  border: `1px solid ${errors.purpose ? 'var(--error-text)' : 'var(--border-strong)'}`,
                  color: 'var(--ink)',
                }}
              />
              <div className="flex justify-between">
                {errors.purpose ? fieldError(errors, 'purpose') : <span />}
                <span className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                  {new TextEncoder().encode(purpose).length}/280 bytes
                </span>
              </div>
            </div>

            {/* Target */}
            <div>
              <label htmlFor="target" className="block mb-1.5 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                Funding goal (USDC)
              </label>
              <div className="relative">
                <input
                  id="target"
                  type="text"
                  inputMode="decimal"
                  value={targetStr}
                  onChange={(e) => setTargetStr(e.target.value)}
                  placeholder="0.000000"
                  className="w-full rounded-xl px-4 py-2.5 pr-16 text-sm outline-none tabular-nums"
                  style={{
                    background: 'var(--surface-muted)',
                    border: `1px solid ${errors.target ? 'var(--error-text)' : 'var(--border-strong)'}`,
                    color: 'var(--ink)',
                  }}
                />
                <span
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  USDC
                </span>
              </div>
              {fieldError(errors, 'target')}
              {targetNative !== null && targetNative > 0n && (
                <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                  = {formatNativeAmount(targetNative)} USDC on-chain
                </p>
              )}
            </div>

            {/* Recipient */}
            <div>
              <label htmlFor="recipient" className="block mb-1.5 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                Fixed recipient address
              </label>
              <input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x…"
                className="mono w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--surface-muted)',
                  border: `1px solid ${errors.recipient ? 'var(--error-text)' : 'var(--border-strong)'}`,
                  color: 'var(--ink)',
                }}
              />
              {fieldError(errors, 'recipient')}
              <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                The full target will go to this address on successful payout. This cannot be changed later.
              </p>
            </div>

            {/* Deadline */}
            <div>
              <label className="block mb-1.5 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                Deadline (your local time)
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--surface-muted)',
                    border: `1px solid ${errors.deadline ? 'var(--error-text)' : 'var(--border-strong)'}`,
                    color: 'var(--ink)',
                  }}
                  aria-label="Deadline date"
                />
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--surface-muted)',
                    border: `1px solid ${errors.deadline ? 'var(--error-text)' : 'var(--border-strong)'}`,
                    color: 'var(--ink)',
                  }}
                  aria-label="Deadline time"
                />
              </div>
              {fieldError(errors, 'deadline')}
              {deadlineUnix && !errors.deadline && (
                <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                  {formatDeadline(deadlineUnix)}
                </p>
              )}
              <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                Deadline must be 1 minute – 30 days from now.
              </p>
            </div>
          </div>
        </div>

        {/* Review panel */}
        {title && targetStr && recipient && deadlineUnix && (
          <div
            className="rounded-2xl p-5 mb-5"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
          >
            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
              Review
            </h2>
            <dl className="grid gap-2 text-sm">
              {[
                ['Title', title],
                ['Goal', (() => { try { const n = parseProductAmount(targetStr); return n > 0n ? `${formatNativeAmount(n)} USDC` : '—' } catch { return targetStr } })()],
                ['Recipient', recipient],
                ['Deadline', deadlineUnix ? formatDeadline(deadlineUnix) : '–'],
                ['Deposit bundled with creation', 'None'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-40 shrink-0 font-medium" style={{ color: 'var(--muted)' }}>{k}</dt>
                  <dd
                    className={`break-all ${k === 'Recipient' ? 'mono' : ''}`}
                    style={{ color: 'var(--ink)' }}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <CommitmentNotice />

        <div className="mt-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer text-sm" style={{ color: 'var(--ink-2)' }}>
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded"
              aria-label="I acknowledge the terms"
            />
            <span>
              I understand that pool terms and recipient cannot be changed after creation, and the pool
              cannot be cancelled.
            </span>
          </label>
          {fieldError(errors, 'reviewed')}
        </div>

        {/* Error */}
        {isError && (
          <div
            className="mb-4 rounded-xl p-3 text-sm"
            style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}
          >
            {parseOnchainError(error)}
          </div>
        )}

        {/* Submit */}
        {!isConnected ? (
          // PF2: render the connect button with explicit type="button" so clicking
          // it inside the form does not trigger form submission or validation.
          <div className="text-center">
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  type="button"
                  onClick={show}
                  className="rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  Connect wallet to create
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        ) : wrongChain ? (
          <button
            type="button"
            onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
            className="w-full rounded-xl py-3.5 text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Switch to Arc Testnet
          </button>
        ) : (
          <button
            type="submit"
            disabled={!DEPLOYED || isPending || isConfirming || isReceiptError || receiptFetchStatus === 'paused'}
            className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Confirm in wallet…
              </span>
            ) : isConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
              </span>
            ) : isReceiptError ? (
              <span className="flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" /> Confirmation error — use retry above
              </span>
            ) : (
              'Create pool'
            )}
          </button>
        )}
      </form>
    </div>
  )
}
