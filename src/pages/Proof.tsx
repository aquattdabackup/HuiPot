import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useReadContract } from 'wagmi'
import { ArrowLeft, ShieldCheck, ShieldAlert, ExternalLink, Search, AlertCircle, Loader2 } from 'lucide-react'
import { HUIPOT_ADDRESS, HUIPOT_ABI, DEPLOYMENT_CONFIGURED } from '../contract'
import { TARGET_CHAIN_ID, arcTestnet, formatNativeAmount, explorerTxUrl, explorerAddressUrl } from '../config'
import { formatAddress, formatDeadline, statusLabel, STATUS } from '../lib/utils'
import { type VerifyResult, computeOverallValid } from '../lib/verifyTxLogic'

const DEPLOYED = DEPLOYMENT_CONFIGURED

// Arc system USDC Transfer emitter address (native value moves appear as Transfer from this address)
const ARC_SYSTEM_EMITTER = '0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE'

// Keccak256 of PaidOut(uint256,address,address,uint256) — used to verify event presence in receipt
const PAID_OUT_TOPIC = '0x648ae074e8c7e2b5c75fc82672c363a1b0fa293a1ce08cba5e9dbeec37eb8ae8'

// Keccak256 of Refunded(uint256,address,uint256)
const REFUNDED_TOPIC = '0x7ca5472b7ea78c2c0141c5a12ee6d170cf4ce8ed06be3d22c8252ddfc7a6a2c4'

// Keccak256 of Contributed(uint256,address,uint256,uint256)
const CONTRIBUTED_TOPIC = '0xdcfa71ee125a676f843733d9d39dce2c918ecf9e92f96db4f24bdb5244ed68a0'

type VerifyState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'done'; result: VerifyResult }

// VerifyResult and computeOverallValid are imported from ../lib/verifyTxLogic
// so the test suite exercises the exact same predicate as production.

function EvidenceRow({
  label,
  value,
  verified,
  link,
  mono,
}: {
  label: string
  value: string
  verified?: boolean | null
  link?: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <dt className="w-44 shrink-0 text-sm" style={{ color: 'var(--muted)' }}>{label}</dt>
      <dd className="flex-1 text-right">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <span className={`text-sm break-all ${mono ? 'mono' : ''}`} style={{ color: 'var(--ink)' }}>
            {value}
          </span>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)' }}>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {verified === true && <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: 'var(--success-text)' }} />}
          {verified === false && <ShieldAlert className="h-4 w-4 shrink-0" style={{ color: 'var(--error-text)' }} />}
          {verified === null && <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>}
        </div>
      </dd>
    </div>
  )
}

async function verifyTx(txHash: string, expectedPoolId: string, expectedRecipient: string, expectedTarget: bigint): Promise<VerifyResult> {
  const rpc = arcTestnet.rpcUrls.default.http[0]
  const notes: string[] = []

  // Fetch receipt via eth_getTransactionReceipt
  const receiptResp = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionReceipt', params: [txHash], id: 1 }),
  })
  const receiptJson = await receiptResp.json() as { result: null | {
    status: string; to: string | null; logs: Array<{ address: string; topics: string[]; data: string }> 
  } }
  const receipt = receiptJson.result
  if (!receipt) {
    notes.push('Transaction receipt not found — transaction may be pending or not on this chain.')
    return {
      txHash, receiptStatus: 'not found', receiptStatusOk: false,
      toAddress: null, toMatchesContract: false,
      poolIdInLog: null, poolIdMatches: null,
      eventFound: null, amountInLog: null, recipientInLog: null,
      recipientMatchesPool: null,
      arcTransferFound: false, arcTransferAmount: null, arcTransferTo: null, arcTransferFrom: null,
      arcTransferToMatchesRecipient: null, arcTransferAmountMatchesEvent: null,
      arcTransferFromMatchesContributor: null,
      eventAmountMatchesTarget: null,
      overallValid: false, notes,
    }
  }

  const receiptStatusOk = receipt.status === '0x1'
  if (!receiptStatusOk) notes.push('Transaction reverted (status 0x0).')

  const toAddress = receipt.to
  const toMatchesContract = (toAddress ?? '').toLowerCase() === HUIPOT_ADDRESS.toLowerCase()
  if (!toMatchesContract) notes.push(`Transaction target (${toAddress}) does not match contract (${HUIPOT_ADDRESS}).`)

  // Scan logs for PaidOut or Refunded from this contract
  const contractLogs = receipt.logs.filter(
    (l) => l.address.toLowerCase() === HUIPOT_ADDRESS.toLowerCase()
  )

  let eventFound: 'PaidOut' | 'Refunded' | 'Contributed' | null = null
  let poolIdInLog: string | null = null
  let poolIdMatches: boolean | null = null
  let amountInLog: string | null = null
  let recipientInLog: string | null = null
  let recipientMatchesPool: boolean | null = null

  const paidOutLog = contractLogs.find((l) => l.topics[0] === PAID_OUT_TOPIC)
  const refundedLog = contractLogs.find((l) => l.topics[0] === REFUNDED_TOPIC)
  const contributedLog = contractLogs.find((l) => l.topics[0] === CONTRIBUTED_TOPIC)

  if (paidOutLog) {
    eventFound = 'PaidOut'
    // topic[1] = poolId (indexed uint256), topic[2] = caller (indexed address), topic[3] = recipient (indexed address)
    poolIdInLog = BigInt(paidOutLog.topics[1]).toString()
    poolIdMatches = poolIdInLog === expectedPoolId
    // data = amount (uint256)
    amountInLog = BigInt(paidOutLog.data).toString()
    // recipient is topic[3], lower 20 bytes
    recipientInLog = '0x' + paidOutLog.topics[3].slice(-40)
    recipientMatchesPool = recipientInLog.toLowerCase() === expectedRecipient.toLowerCase()
    if (!poolIdMatches) notes.push(`PaidOut log poolId (${poolIdInLog}) does not match expected pool #${expectedPoolId}.`)
    if (!recipientMatchesPool) notes.push(`PaidOut log recipient (${recipientInLog}) does not match pool recipient (${expectedRecipient}).`)
  } else if (refundedLog) {
    eventFound = 'Refunded'
    poolIdInLog = BigInt(refundedLog.topics[1]).toString()
    poolIdMatches = poolIdInLog === expectedPoolId
    amountInLog = BigInt(refundedLog.data).toString()
    recipientInLog = '0x' + refundedLog.topics[2].slice(-40)
    recipientMatchesPool = null // refund goes back to contributor, not fixed recipient
    if (!poolIdMatches) notes.push(`Refunded log poolId (${poolIdInLog}) does not match expected pool #${expectedPoolId}.`)
  } else if (contributedLog) {
    eventFound = 'Contributed'
    poolIdInLog = BigInt(contributedLog.topics[1]).toString()
    poolIdMatches = poolIdInLog === expectedPoolId
    // data = abi.encode(amount, newTotal); amount is first 32 bytes
    amountInLog = BigInt('0x' + contributedLog.data.slice(2, 66)).toString()
    // contributor is topic[2] (indexed address)
    recipientInLog = '0x' + contributedLog.topics[2].slice(-40)
    recipientMatchesPool = null  // contribution goes from contributor to contract, not to fixed recipient
    if (!poolIdMatches) notes.push(`Contributed log poolId (${poolIdInLog}) does not match expected pool #${expectedPoolId}.`)
  } else {
    notes.push('No PaidOut, Refunded, or Contributed event found from this contract in this transaction.')
  }

  // Look for Arc system Transfer log indicating native USDC movement.
  // Arc Transfer(address indexed from, address indexed to, uint256 value)
  // keccak256("Transfer(address,address,uint256)") = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

  // For PaidOut/Refunded: Transfer FROM the contract (topics[1] = HuiPot) — outbound movement.
  // For Contributed: Transfer TO the contract (topics[2] = HuiPot) — inbound movement.
  const arcOutboundLogs = receipt.logs.filter(
    (l) =>
      l.address.toLowerCase() === ARC_SYSTEM_EMITTER.toLowerCase() &&
      l.topics[0] === TRANSFER_TOPIC &&
      ('0x' + l.topics[1].slice(-40)).toLowerCase() === HUIPOT_ADDRESS.toLowerCase()
  )
  const arcInboundLogs = receipt.logs.filter(
    (l) =>
      l.address.toLowerCase() === ARC_SYSTEM_EMITTER.toLowerCase() &&
      l.topics[0] === TRANSFER_TOPIC &&
      ('0x' + l.topics[2].slice(-40)).toLowerCase() === HUIPOT_ADDRESS.toLowerCase()
  )
  // Choose which set to use based on event type
  const arcLogs = eventFound === 'Contributed' ? arcInboundLogs : arcOutboundLogs

  // For PaidOut: verify the event amount equals the on-chain pool target.
  // arcTransferAmountMatchesEvent alone is insufficient — if event=1 and transfer=1
  // they match each other but both are wrong against a 1e18 target.
  let eventAmountMatchesTarget: boolean | null = null
  if (eventFound === 'PaidOut' && amountInLog !== null) {
    eventAmountMatchesTarget = BigInt(amountInLog) === expectedTarget
    if (!eventAmountMatchesTarget) {
      notes.push(`PaidOut event amount (${amountInLog}) does not match pool target (${expectedTarget.toString()}).`)
    }
  }

  let arcTransferFound = false
  let arcTransferAmount: string | null = null
  let arcTransferTo: string | null = null
  let arcTransferFrom: string | null = null
  let arcTransferToMatchesRecipient: boolean | null = null
  let arcTransferAmountMatchesEvent: boolean | null = null
  let arcTransferFromMatchesContributor: boolean | null = null

  if (arcLogs.length > 0) {
    // For PaidOut: find the Transfer whose destination matches the event recipient.
    // For Refunded: find the Transfer whose destination matches the contributor (topics[2] of Refunded).
    // For Contributed: find the Transfer whose SENDER matches the contributor (topics[1] of Transfer = contributor).
    const targetAddr = recipientInLog ?? null
    const matchedLog = eventFound === 'Contributed' && targetAddr
      // Inbound: match sender (topics[1]) to contributor address
      ? arcLogs.find((l) => ('0x' + l.topics[1].slice(-40)).toLowerCase() === targetAddr.toLowerCase())
        ?? arcLogs[0]
      : targetAddr
        ? arcLogs.find((l) => ('0x' + l.topics[2].slice(-40)).toLowerCase() === targetAddr.toLowerCase())
          ?? arcLogs[0]
        : arcLogs[0]

    arcTransferFound = true
    arcTransferFrom = '0x' + matchedLog.topics[1].slice(-40)
    arcTransferTo = '0x' + matchedLog.topics[2].slice(-40)
    arcTransferAmount = BigInt(matchedLog.data).toString()

    if (eventFound === 'PaidOut' && recipientInLog) {
      arcTransferToMatchesRecipient = arcTransferTo.toLowerCase() === recipientInLog.toLowerCase()
      if (!arcTransferToMatchesRecipient) notes.push(`Arc Transfer destination (${arcTransferTo}) does not match PaidOut recipient (${recipientInLog}).`)
    } else if (eventFound === 'Refunded' && recipientInLog) {
      // For refunds, the Transfer destination should match the contributor address
      arcTransferToMatchesRecipient = arcTransferTo.toLowerCase() === recipientInLog.toLowerCase()
      if (!arcTransferToMatchesRecipient) notes.push(`Arc Transfer destination (${arcTransferTo}) does not match refund contributor (${recipientInLog}).`)
    } else if (eventFound === 'Contributed' && recipientInLog) {
      // For contributions, the Transfer SENDER must match the contributor (the one who called contribute())
      arcTransferFromMatchesContributor = arcTransferFrom.toLowerCase() === recipientInLog.toLowerCase()
      if (!arcTransferFromMatchesContributor) notes.push(`Arc Transfer sender (${arcTransferFrom}) does not match contributor (${recipientInLog}).`)
    }

    // Check amount in Arc Transfer matches amount in event log
    if (amountInLog !== null) {
      arcTransferAmountMatchesEvent = arcTransferAmount === amountInLog
      if (!arcTransferAmountMatchesEvent) {
        notes.push(`Arc Transfer amount (${arcTransferAmount}) does not match event amount (${amountInLog}).`)
      }
    }
  } else {
    if (eventFound === 'PaidOut') {
      notes.push('No Arc system Transfer from this contract found. A payout should produce a Transfer from the contract to the recipient. Verify independently on ArcScan.')
    } else if (eventFound === 'Refunded') {
      notes.push('No Arc system Transfer from this contract found. A refund should produce a Transfer from the contract to the contributor. Verify independently on ArcScan.')
    } else if (eventFound === 'Contributed') {
      notes.push('No Arc system inbound Transfer to this contract found. A contribution should produce a Transfer to the contract. Verify independently on ArcScan.')
    } else {
      notes.push('No Arc system Transfer found. Verify independently on ArcScan.')
    }
  }

  if (amountInLog && eventFound === 'PaidOut') {
    notes.push(`Payout amount in event: ${BigInt(amountInLog).toString()} native base units (18 dec).`)
  }

  // Build the partial result and delegate overallValid to the shared predicate
  // (imported from ../lib/verifyTxLogic — same code path as the test suite).
  const partial: VerifyResult = {
    txHash, receiptStatus: receipt.status, receiptStatusOk,
    toAddress, toMatchesContract,
    poolIdInLog, poolIdMatches,
    eventFound, amountInLog, recipientInLog, recipientMatchesPool,
    arcTransferFound, arcTransferAmount, arcTransferTo, arcTransferFrom,
    arcTransferToMatchesRecipient, arcTransferAmountMatchesEvent,
    arcTransferFromMatchesContributor, eventAmountMatchesTarget,
    overallValid: false, notes,
  }
  const overallValid = computeOverallValid(partial)

  return {
    txHash, receiptStatus: receipt.status, receiptStatusOk,
    toAddress, toMatchesContract,
    poolIdInLog, poolIdMatches,
    eventFound, amountInLog, recipientInLog, recipientMatchesPool,
    arcTransferFound, arcTransferAmount, arcTransferTo, arcTransferFrom,
    arcTransferToMatchesRecipient, arcTransferAmountMatchesEvent,
    arcTransferFromMatchesContributor, eventAmountMatchesTarget,
    overallValid, notes,
  }
}

export function Proof() {
  const { poolId } = useParams<{ poolId: string }>()

  // R4: guard BigInt conversion — poolId may be non-numeric (e.g. /pools/abc/proof)
  // Also reject values above uint256 max to avoid ABI encoding errors.
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

  const [searchParams] = useSearchParams()
  const prefillTx = searchParams.get('tx') ?? ''
  const [txHashInput, setTxHashInput] = useState(prefillTx)
  const [verifyState, setVerifyState] = useState<VerifyState>({ phase: 'idle' })

  const { data: pool, isLoading, isError: poolError, refetch: refetchPool } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'getPool',
    args: [poolIdBig ?? 0n],
    chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED && validPoolId },
  })
  const { data: rawStatus } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'getStatus',
    args: [poolIdBig ?? 0n],
    chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED && validPoolId },
  })
  const { data: poolCount, refetch: refetchPoolCount } = useReadContract({
    address: HUIPOT_ADDRESS,
    abi: HUIPOT_ABI,
    functionName: 'poolCount',
    chainId: TARGET_CHAIN_ID,
    query: { enabled: DEPLOYED },
  })

  // PF1: separate not-found (ID above successful count) from transport error.
  const poolAbsentByCount = poolCount !== undefined && poolIdBig !== null && poolIdBig > poolCount
  const poolNetworkError = poolError && !poolAbsentByCount

  const status = rawStatus !== undefined ? Number(rawStatus) : undefined

  // F07: Auto-verify when ?tx= prefill is present and pool data just loaded
  useEffect(() => {
    if (!prefillTx || !pool || verifyState.phase !== 'idle') return
    if (!/^0x[0-9a-fA-F]{64}$/.test(prefillTx)) return
    const [, rcpt, tgt] = pool
    setVerifyState({ phase: 'loading' })
    verifyTx(prefillTx, poolId ?? '', rcpt, tgt)
      .then((result) => setVerifyState({ phase: 'done', result }))
      .catch((err) => setVerifyState({ phase: 'error', message: `RPC error: ${err instanceof Error ? err.message : String(err)}` }))
  // pool reference changing triggers the effect; other deps are stable strings/primitives
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillTx, pool])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const hash = txHashInput.trim()
    if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      setVerifyState({ phase: 'error', message: 'Enter a valid 0x-prefixed 32-byte transaction hash.' })
      return
    }
    if (!pool) {
      setVerifyState({ phase: 'error', message: 'Pool data not loaded yet.' })
      return
    }
    setVerifyState({ phase: 'loading' })
    try {
      const [, recipient, target] = pool
      const result = await verifyTx(hash, poolId ?? '', recipient, target)
      setVerifyState({ phase: 'done', result })
    } catch (err) {
      setVerifyState({ phase: 'error', message: `RPC error: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  if (!DEPLOYED) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link to="/" className="flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--muted)' }}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <h1 className="display text-xl font-bold mb-3" style={{ color: 'var(--ink)' }}>Proof</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Contract not deployed.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded" style={{ background: 'var(--surface-muted)' }} />
          <div className="h-64 rounded-2xl" style={{ background: 'var(--surface-muted)' }} />
        </div>
      </div>
    )
  }

  if (!validPoolId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p style={{ color: 'var(--muted)' }}>Invalid pool ID{poolId ? ` "${poolId}"` : ''}.</p>
        <Link to="/" className="mt-4 inline-block text-sm underline" style={{ color: 'var(--muted)' }}>Back to home</Link>
      </div>
    )
  }

  // PF1: transport failure — honest retryable error
  if (poolNetworkError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="mb-3" style={{ color: 'var(--error-text)' }}>Could not reach the network. Please check your connection and try again.</p>
        <button
          onClick={() => { void refetchPool(); void refetchPoolCount() }}
          className="text-sm underline"
          style={{ color: 'var(--muted)' }}
        >
          Retry
        </button>
        <br />
        <Link to="/" className="mt-4 inline-block text-sm underline" style={{ color: 'var(--muted)' }}>Back to home</Link>
      </div>
    )
  }

  // PF1: pool absent — either ID exceeds a successfully loaded count, or pool loaded as undefined
  if (poolAbsentByCount || (!pool && !isLoading && !poolError)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p style={{ color: 'var(--muted)' }}>Pool #{poolId} not found on this deployment.</p>
        <Link to="/" className="mt-4 inline-block text-sm underline" style={{ color: 'var(--muted)' }}>Back to home</Link>
      </div>
    )
  }

  if (!pool) {
    // Count not yet loaded; still waiting
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded" style={{ background: 'var(--surface-muted)' }} />
          <div className="h-64 rounded-2xl" style={{ background: 'var(--surface-muted)' }} />
        </div>
      </div>
    )
  }

  const [creator, recipient, target, deadline, title, , totalContributed] = pool

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link to={`/pools/${poolId}`} className="flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--muted)' }}>
          <ArrowLeft className="h-4 w-4" /> Pool #{poolId}
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-6 w-6" style={{ color: 'var(--accent)' }} />
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Proof</h1>
      </div>

      <div className="mb-5 rounded-xl px-4 py-3 text-xs" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
        Testnet evidence only — not mainnet submission proof.
      </div>

      {/* Chain & deployment */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Chain &amp; deployment</h2>
        <dl>
          <EvidenceRow label="Chain" value={arcTestnet.name} verified />
          <EvidenceRow label="Chain ID" value={arcTestnet.id.toString()} verified />
          <EvidenceRow
            label="Contract"
            value={HUIPOT_ADDRESS}
            link={explorerAddressUrl(HUIPOT_ADDRESS)}
            mono
            verified
          />
        </dl>
      </div>

      {/* Pool terms */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Pool terms (live on-chain read)</h2>
        <dl>
          <EvidenceRow label="Pool ID" value={poolId ?? '–'} verified />
          <EvidenceRow label="Title" value={title} />
          <EvidenceRow label="Goal" value={`${formatNativeAmount(target)} USDC`} verified />
          <EvidenceRow label="Contributed" value={`${formatNativeAmount(totalContributed)} USDC`} />
          <EvidenceRow label="Deadline" value={formatDeadline(Number(deadline))} />
          <EvidenceRow
            label="Creator"
            value={formatAddress(creator)}
            link={explorerAddressUrl(creator)}
            mono
          />
          <EvidenceRow
            label="Fixed recipient"
            value={formatAddress(recipient)}
            link={explorerAddressUrl(recipient)}
            mono
            verified
          />
          <EvidenceRow
            label="Current status"
            value={status !== undefined ? statusLabel(status) : '–'}
            verified={status === STATUS.PAID ? true : status === STATUS.FUNDED ? null : null}
          />
        </dl>
      </div>

      {/* Transaction verifier */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <h2 className="mb-1 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Verify a transaction</h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--muted)' }}>
          Paste a transaction hash from this pool to verify receipt status, expected event, amount, and destination.
        </p>
        <form onSubmit={handleVerify} className="flex gap-2">
          <input
            type="text"
            value={txHashInput}
            onChange={(e) => setTxHashInput(e.target.value)}
            placeholder="0x..."
            className="mono flex-1 rounded-xl px-3 py-2.5 text-xs outline-none"
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border-strong)',
              color: 'var(--ink)',
            }}
            aria-label="Transaction hash"
          />
          <button
            type="submit"
            disabled={verifyState.phase === 'loading'}
            className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {verifyState.phase === 'loading'
              ? <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</span>
              : <span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Verify</span>
            }
          </button>
        </form>

        {verifyState.phase === 'error' && (
          <div className="mt-3 flex items-center gap-2 rounded-xl p-3 text-xs" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>
            <AlertCircle className="h-4 w-4 shrink-0" /> {verifyState.message}
          </div>
        )}

        {verifyState.phase === 'done' && (() => {
          const r = verifyState.result
          const nativeAmount = r.amountInLog ? BigInt(r.amountInLog) : null
          return (
            <div className="mt-4 space-y-3">
              {/* Overall verdict */}
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: r.overallValid ? 'var(--success-bg)' : 'var(--error-bg)',
                  color: r.overallValid ? 'var(--success-text)' : 'var(--error-text)',
                }}
              >
                {r.overallValid
                  ? <><ShieldCheck className="h-4 w-4 shrink-0" /> All checks passed</>
                  : <><ShieldAlert className="h-4 w-4 shrink-0" /> One or more checks failed</>
                }
              </div>

              {/* Detailed rows */}
              <dl className="rounded-xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <EvidenceRow
                  label="Tx hash"
                  value={formatAddress(r.txHash)}
                  link={explorerTxUrl(r.txHash)}
                  mono
                />
                <EvidenceRow
                  label="Receipt status"
                  value={r.receiptStatus === '0x1' ? 'Success (0x1)' : r.receiptStatus === '0x0' ? 'Reverted (0x0)' : r.receiptStatus}
                  verified={r.receiptStatusOk}
                />
                <EvidenceRow
                  label="To address"
                  value={r.toAddress ? formatAddress(r.toAddress) : '–'}
                  link={r.toAddress ? explorerAddressUrl(r.toAddress) : undefined}
                  verified={r.toMatchesContract}
                  mono
                />
                <EvidenceRow
                  label="Event"
                  value={r.eventFound ?? 'Not found'}
                  verified={r.eventFound !== null}
                />
                <EvidenceRow
                  label="Pool ID in log"
                  value={r.poolIdInLog ?? '–'}
                  verified={r.poolIdMatches ?? false}
                />
                {r.eventFound === 'PaidOut' && (
                  <>
                    <EvidenceRow
                      label="Recipient in log"
                      value={r.recipientInLog ? formatAddress(r.recipientInLog) : '–'}
                      link={r.recipientInLog ? explorerAddressUrl(r.recipientInLog) : undefined}
                      verified={r.recipientMatchesPool ?? false}
                      mono
                    />
                    <EvidenceRow
                      label="Amount (event)"
                      value={nativeAmount !== null ? `${formatNativeAmount(nativeAmount)} USDC` : '–'}
                      verified={r.eventAmountMatchesTarget ?? null}
                    />
                  </>
                )}
                {r.eventFound === 'Refunded' && (
                  <EvidenceRow
                    label="Refund amount"
                    value={nativeAmount !== null ? `${formatNativeAmount(nativeAmount)} USDC` : '–'}
                  />
                )}
                <EvidenceRow
                  label="Arc Transfer found"
                  value={r.arcTransferFound ? 'Yes' : 'No (see notes)'}
                  verified={r.arcTransferFound ? true : null}
                />
                {r.arcTransferFound && (
                  <>
                    {r.arcTransferFrom && (
                      <EvidenceRow
                        label="Transfer from"
                        value={formatAddress(r.arcTransferFrom)}
                        link={explorerAddressUrl(r.arcTransferFrom)}
                        verified={r.eventFound === 'Contributed' ? (r.arcTransferFromMatchesContributor ?? null) : null}
                        mono
                      />
                    )}
                    <EvidenceRow
                      label="Transfer to"
                      value={r.arcTransferTo ? formatAddress(r.arcTransferTo) : '–'}
                      link={r.arcTransferTo ? explorerAddressUrl(r.arcTransferTo) : undefined}
                      verified={r.arcTransferToMatchesRecipient ?? null}
                      mono
                    />
                    <EvidenceRow
                      label="Transfer amount"
                      value={r.arcTransferAmount ? `${formatNativeAmount(BigInt(r.arcTransferAmount))} USDC (native)` : '–'}
                      verified={r.arcTransferAmountMatchesEvent ?? null}
                    />
                  </>
                )}
              </dl>

              {/* Notes */}
              {r.notes.length > 0 && (
                <ul className="space-y-1 rounded-xl p-3 text-xs" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                  {r.notes.map((n, i) => <li key={i} className="flex gap-1.5"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{n}</li>)}
                </ul>
              )}
            </div>
          )
        })()}
      </div>

      {/* Inline status-based summary (no tx input required) */}
      {status === STATUS.FUNDED && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-2 text-sm" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Goal reached — payout not yet triggered. No payout receipt to verify.
        </div>
      )}
      {(status === STATUS.REFUNDING || status === STATUS.CLOSED) && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-2 text-sm" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Pool ended without payout. Verify individual refund transactions above.
        </div>
      )}

      {/* Evidence limitations */}
      <div className="rounded-xl p-4 text-xs leading-relaxed" style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}>
        <p className="mb-2 font-semibold" style={{ color: 'var(--muted)' }}>Evidence limitations</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Pool terms are read live from the contract on Arc Testnet (chain ID {arcTestnet.id}). Data reflects state at query time.</li>
          <li>Receipt verification calls the Arc Testnet RPC directly from your browser. RPC availability and rate limits apply.</li>
          <li>Contract state confirms execution but not off-chain recipient receipt of value.</li>
          <li>
            Native USDC payout/refund transactions may show <strong>zero outer transaction value</strong> in some explorers.
            The Arc system Transfer event (emitter <span className="mono">{ARC_SYSTEM_EMITTER}</span>, 18-decimal value) is the canonical native movement evidence.
          </li>
          <li>
            If the fixed recipient cannot accept native USDC, payout may fail and funded pools may be permanently locked.
            Verify the recipient address before contributing.
          </li>
          <li>This page shows testnet evidence only. Mainnet requires a separate deployment and real USDC transactions.</li>
          <li>A valid transaction hash alone does not prove it was submitted through this app. App-flow capture is separate evidence.</li>
          <li>Wrong-chain or wrong-pool transactions will show mismatched contract address or pool ID in verification results.</li>
        </ul>
      </div>
    </div>
  )
}
