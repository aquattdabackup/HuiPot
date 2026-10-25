import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ArrowLeft, Check, Loader2, AlertCircle, ShieldAlert } from 'lucide-react'
import { decodeEventLog } from 'viem'
import { HUIPOT_ADDRESS, HUIPOT_ABI } from '../contract'
import { TARGET_CHAIN_ID, parseProductAmount, formatNativeAmount, explorerTxUrl } from '../config'
import { CommitmentNotice } from '../components/CommitmentNotice'
import { formatDeadline, parseOnchainError } from '../lib/utils'

const DEPLOYED = HUIPOT_ADDRESS !== '0x0000000000000000000000000000000000000000'

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
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash })

  // Track the identity at the moment of submission so we can detect replacement/stale state
  const submittedRef = useRef<{ account: string; chainId: number } | null>(null)

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
    if (!validate()) return

    if (wrongChain) {
      switchChain({ chainId: TARGET_CHAIN_ID })
      return
    }

    const targetNative = parseProductAmount(targetStr)

    submittedRef.current = { account: address ?? '', chainId: chainId ?? TARGET_CHAIN_ID }
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

  // R3: Extract poolId only from a PoolCreated log emitted by the HuiPot contract itself.
  // A successful replacement/cancel transaction that emits no matching log must NOT be shown as success.
  let createdPoolId: string | undefined
  let poolCreatedEventFound = false
  if (isSuccess && receipt) {
    for (const log of receipt.logs) {
      // Must be emitted by our contract — reject logs from unrelated addresses
      if (log.address.toLowerCase() !== HUIPOT_ADDRESS.toLowerCase()) continue
      try {
        const decoded = decodeEventLog({
          abi: HUIPOT_ABI,
          eventName: 'PoolCreated',
          data: log.data,
          topics: log.topics,
        })
        const poolId = (decoded.args as { poolId?: bigint }).poolId?.toString()
        const logRecipient = (decoded.args as { recipient?: string }).recipient ?? ''
        const logCreator = (decoded.args as { creator?: string }).creator ?? ''
        // Verify the creator matches the submitting account (R3: not a replacement from a different sender)
        const submittedAccount = submittedRef.current?.account ?? ''
        if (
          poolId &&
          (!submittedAccount || logCreator.toLowerCase() === submittedAccount.toLowerCase()) &&
          logRecipient.toLowerCase() === recipient.trim().toLowerCase()
        ) {
          createdPoolId = poolId
          poolCreatedEventFound = true
        }
        break
      } catch {
        // not this event
      }
    }
  }

  if (isSuccess && receipt) {
    if (!poolCreatedEventFound) {
      // Receipt succeeded but no matching PoolCreated event — replacement or unrelated tx
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
              href={explorerTxUrl(hash!)}
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
            href={explorerTxUrl(hash!)}
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
          <div className="text-center">
            <ConnectKitButton label="Connect wallet to create" />
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
            disabled={!DEPLOYED || isPending || isConfirming}
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
            ) : (
              'Create pool'
            )}
          </button>
        )}
      </form>
    </div>
  )
}
