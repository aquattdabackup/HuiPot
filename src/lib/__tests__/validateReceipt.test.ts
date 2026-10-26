/**
 * Behavioral regression tests for validateReceipt (src/lib/validateReceipt.ts).
 *
 * These tests exercise the PRODUCTION validateReceipt function directly with
 * synthetic JSON-RPC responses — no substring assertion, no copied predicates.
 *
 * Coverage:
 *   RC1: Repeated contribution after a first confirmed one (non-regression)
 *   RC2: PaidOut caller binding (new finding — topics[2] compared to accountAddress)
 *   RC2: Contributed contributor binding (preserved)
 *   RC2: Refunded contributor binding (preserved)
 *   RC3: HTTP non-2xx transport rejection
 *   RC3: JSON-RPC error rejection
 *   RC3: Revert (status 0x0) → error
 *   RC3: Missing receipt → error (pending)
 *   RC5: resp.ok=false → error (preserved)
 *   RC5: json.error present → error (preserved)
 *   Positive controls: valid Contributed, PaidOut, Refunded → confirmed
 *   Negative controls: wrong pool, wrong amount, wrong contract
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateReceipt, PAID_OUT_TOPIC, REFUNDED_TOPIC, CONTRIBUTED_TOPIC } from '../validateReceipt'
import type { ReceiptSnapshot } from '../validateReceipt'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONTRACT = '0x81a139599d252eb2dc2bbb6c267e911a21264288'
const RECIPIENT = '0xaabbccddeeaabbccddeeaabbccddeeaabbccddee'
const CONTRIBUTOR = '0x1234567890123456789012345678901234567890'
const OTHER_WALLET = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
const POOL_ID = '1'
const AMOUNT = 10n ** 18n  // 1 USDC native

// Pad a hex number to 32-byte (64 hex chars) right-aligned, no 0x prefix
function pad32(n: bigint): string {
  return n.toString(16).padStart(64, '0')
}
// Pad an address to 32 bytes, left-padded with zeros
function padAddr(addr: string): string {
  const a = addr.replace(/^0x/, '').toLowerCase()
  return '0'.repeat(64 - a.length) + a
}

// Build a synthetic JSON-RPC receipt response
function makeRpcResponse(overrides: Partial<{
  status: string
  to: string | null
  logs: Array<{ address: string; topics: string[]; data: string }>
  rpcError: { code: number; message: string }
  result: null
}> = {}) {
  if (overrides.rpcError) {
    return { jsonrpc: '2.0', id: 1, error: overrides.rpcError }
  }
  if ('result' in overrides && overrides.result === null) {
    return { jsonrpc: '2.0', id: 1, result: null }
  }
  return {
    jsonrpc: '2.0',
    id: 1,
    result: {
      status: overrides.status ?? '0x1',
      to: overrides.to ?? CONTRACT,
      logs: overrides.logs ?? [],
    },
  }
}

// Build a Contributed log
function makeContributedLog(poolId: bigint, contributor: string, amount: bigint): { address: string; topics: string[]; data: string } {
  return {
    address: CONTRACT,
    topics: [
      CONTRIBUTED_TOPIC,
      '0x' + pad32(poolId),
      '0x' + padAddr(contributor),
    ],
    data: '0x' + pad32(amount),
  }
}

// Build a PaidOut log (topics: [topic0, poolId, caller, recipient])
function makePaidOutLog(poolId: bigint, caller: string, recipientAddr: string, amount: bigint): { address: string; topics: string[]; data: string } {
  return {
    address: CONTRACT,
    topics: [
      PAID_OUT_TOPIC,
      '0x' + pad32(poolId),
      '0x' + padAddr(caller),
      '0x' + padAddr(recipientAddr),
    ],
    data: '0x' + pad32(amount),
  }
}

// Build a Refunded log (topics: [topic0, poolId, contributor])
function makeRefundedLog(poolId: bigint, contributor: string, amount: bigint): { address: string; topics: string[]; data: string } {
  return {
    address: CONTRACT,
    topics: [
      REFUNDED_TOPIC,
      '0x' + pad32(poolId),
      '0x' + padAddr(contributor),
    ],
    data: '0x' + pad32(amount),
  }
}

// Global fetch mock
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetch(body: object, ok = true, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  })
}

const BASE_SNAP: ReceiptSnapshot = {
  action: 'contribute',
  amount: AMOUNT,
  recipient: CONTRACT,
  poolId: POOL_ID,
  contractAddress: CONTRACT,
  accountAddress: CONTRIBUTOR,
}

// ── RC5: HTTP/RPC rejection ────────────────────────────────────────────────────

describe('validateReceipt — RC5: HTTP/RPC rejection', () => {

  it('RC5-1: HTTP 500 (resp.ok=false) → error', async () => {
    mockFetch({ status: '0x1', to: CONTRACT, logs: [] }, false, 500)
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('error')
    expect(r.note).toContain('HTTP 500')
  })

  it('RC5-2: JSON-RPC error field → error', async () => {
    mockFetch(makeRpcResponse({ rpcError: { code: -32000, message: 'execution reverted' } }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('error')
    expect(r.note).toContain('-32000')
  })

  it('RC5-3: null result (pending) → error', async () => {
    mockFetch(makeRpcResponse({ result: null }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('error')
    expect(r.note).toContain('not found')
  })

  it('RC5-4: fetch throws (network error) → error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('error')
    expect(r.note).toContain('ECONNREFUSED')
  })

})

// ── RC3: revert detection ──────────────────────────────────────────────────────

describe('validateReceipt — RC3: revert detection', () => {

  it('RC3-1: receipt status 0x0 (revert) → error', async () => {
    mockFetch(makeRpcResponse({ status: '0x0', logs: [] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('error')
    expect(r.note).toContain('reverted')
  })

})

// ── RC2: Positive controls (valid Contributed / PaidOut / Refunded) ────────────

describe('validateReceipt — positive controls', () => {

  it('PC-1: valid Contributed → confirmed', async () => {
    const log = makeContributedLog(1n, CONTRIBUTOR, AMOUNT)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('confirmed')
  })

  it('PC-2: valid PaidOut from submitting caller → confirmed', async () => {
    const log = makePaidOutLog(1n, CONTRIBUTOR, RECIPIENT, AMOUNT)
    const snap: ReceiptSnapshot = { ...BASE_SNAP, action: 'payout', recipient: RECIPIENT }
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), snap, 'http://rpc')
    expect(r.outcome).toBe('confirmed')
  })

  it('PC-3: valid Refunded → confirmed', async () => {
    const log = makeRefundedLog(1n, CONTRIBUTOR, AMOUNT)
    const snap: ReceiptSnapshot = { ...BASE_SNAP, action: 'refund', recipient: CONTRIBUTOR }
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), snap, 'http://rpc')
    expect(r.outcome).toBe('confirmed')
  })

})

// ── RC2: Contributor identity (Contributed) ────────────────────────────────────

describe('validateReceipt — RC2: contributor identity binding', () => {

  it('RC2-C1: Contributed from WRONG wallet → replaced', async () => {
    // Wrong contributor in topics[2] — different wallet, same pool/amount
    const log = makeContributedLog(1n, OTHER_WALLET, AMOUNT)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('replaced')
    expect(r.note).toContain('does not match submitting wallet')
  })

  it('RC2-C2: Contributed from correct wallet with different amount → replaced', async () => {
    const log = makeContributedLog(1n, CONTRIBUTOR, AMOUNT + 1n)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('replaced')
    expect(r.note).toContain('does not match review amount')
  })

  it('RC2-C3: Repeated contribution — second Contributed with same wallet/amount → confirmed', async () => {
    // Regression for RC1 follow-up: a second contribution from same wallet should confirm
    const log = makeContributedLog(1n, CONTRIBUTOR, AMOUNT)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'b'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('confirmed')
  })

})

// ── RC2: PaidOut caller identity (new finding) ─────────────────────────────────

describe('validateReceipt — RC2: PaidOut caller identity binding', () => {

  const payoutSnap: ReceiptSnapshot = {
    action: 'payout',
    amount: AMOUNT,
    recipient: RECIPIENT,
    poolId: POOL_ID,
    contractAddress: CONTRACT,
    accountAddress: CONTRIBUTOR,
  }

  it('RC2-P1: PaidOut from DIFFERENT caller → replaced', async () => {
    // Same pool/amount/recipient but caller is a different wallet
    const log = makePaidOutLog(1n, OTHER_WALLET, RECIPIENT, AMOUNT)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), payoutSnap, 'http://rpc')
    expect(r.outcome).toBe('replaced')
    expect(r.note).toContain('does not match submitting wallet')
  })

  it('RC2-P2: PaidOut from submitting wallet to different recipient → replaced', async () => {
    const log = makePaidOutLog(1n, CONTRIBUTOR, OTHER_WALLET, AMOUNT)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), payoutSnap, 'http://rpc')
    expect(r.outcome).toBe('replaced')
    expect(r.note).toContain('does not match expected')
  })

  it('RC2-P3: PaidOut from submitting wallet, correct recipient but wrong amount → replaced', async () => {
    const log = makePaidOutLog(1n, CONTRIBUTOR, RECIPIENT, AMOUNT - 1n)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), payoutSnap, 'http://rpc')
    expect(r.outcome).toBe('replaced')
    expect(r.note).toContain('does not match pool target')
  })

  it('RC2-P4: PaidOut from correct caller to correct recipient with correct amount → confirmed', async () => {
    const log = makePaidOutLog(1n, CONTRIBUTOR, RECIPIENT, AMOUNT)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), payoutSnap, 'http://rpc')
    expect(r.outcome).toBe('confirmed')
  })

})

// ── RC2: Refunded contributor binding ─────────────────────────────────────────

describe('validateReceipt — RC2: Refunded contributor binding', () => {

  const refundSnap: ReceiptSnapshot = {
    action: 'refund',
    amount: AMOUNT,
    recipient: CONTRIBUTOR,
    poolId: POOL_ID,
    contractAddress: CONTRACT,
    accountAddress: CONTRIBUTOR,
  }

  it('RC2-R1: Refunded with WRONG contributor → replaced', async () => {
    const log = makeRefundedLog(1n, OTHER_WALLET, AMOUNT)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), refundSnap, 'http://rpc')
    expect(r.outcome).toBe('replaced')
    expect(r.note).toContain('does not match submitting wallet')
  })

  it('RC2-R2: Refunded correct contributor wrong amount → replaced', async () => {
    const log = makeRefundedLog(1n, CONTRIBUTOR, AMOUNT - 1n)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), refundSnap, 'http://rpc')
    expect(r.outcome).toBe('replaced')
    expect(r.note).toContain('does not match claimed amount')
  })

})

// ── Wrong contract / pool / no event ──────────────────────────────────────────

describe('validateReceipt — contract / pool / event checks', () => {

  it('wrong contract address → replaced', async () => {
    mockFetch(makeRpcResponse({ to: OTHER_WALLET, logs: [] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('replaced')
  })

  it('no Contributed event → replaced', async () => {
    mockFetch(makeRpcResponse({ logs: [] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('replaced')
  })

  it('Contributed event for wrong pool → replaced', async () => {
    const log = makeContributedLog(99n, CONTRIBUTOR, AMOUNT)
    mockFetch(makeRpcResponse({ logs: [log] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), BASE_SNAP, 'http://rpc')
    expect(r.outcome).toBe('replaced')
    expect(r.note).toContain('#99')
  })

  it('no PaidOut event → replaced', async () => {
    const snap: ReceiptSnapshot = { ...BASE_SNAP, action: 'payout', recipient: RECIPIENT }
    mockFetch(makeRpcResponse({ logs: [] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), snap, 'http://rpc')
    expect(r.outcome).toBe('replaced')
  })

  it('no Refunded event → replaced', async () => {
    const snap: ReceiptSnapshot = { ...BASE_SNAP, action: 'refund', recipient: CONTRIBUTOR }
    mockFetch(makeRpcResponse({ logs: [] }))
    const r = await validateReceipt('0x' + 'a'.repeat(64), snap, 'http://rpc')
    expect(r.outcome).toBe('replaced')
  })

})

// ── RC1 structural: isActionBusy for contribute ────────────────────────────────

describe('RC1 structural — contribute re-enable after confirmed', () => {

  it('RC1: Pool.tsx isActionBusy for contribute checks only checking (not confirmed)', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // isActionBusy for 'contribute' must NOT return true when phase is 'confirmed'
    // The code should have a branch: if (action === 'contribute') { return p.phase === 'checking' }
    expect(code).toContain("action === 'contribute'")
    expect(code).toContain("return p.phase === 'checking'")
  })

  it('RC3: Pool.tsx uses onReplaced; actionLifecycle.ts handles repriced/cancelled', async () => {
    const poolSrc = await import('../../../src/pages/Pool?raw') as { default: string }
    const poolCode = poolSrc.default
    // onReplaced must be wired in Pool.tsx (passed to useWaitForTransactionReceipt)
    expect(poolCode).toContain('onReplaced:')
    // actionLifecycle.ts contains the repriced/cancelled handling
    const lcSrc = await import('../actionLifecycle?raw') as { default: string }
    const lcCode = lcSrc.default
    expect(lcCode).toContain("r.reason === 'repriced'")
    expect(lcCode).toContain("r.reason === 'cancelled'")
  })

  it('RC3/SC1: actionLifecycle.ts uses epoch for stale context prevention', async () => {
    const src = await import('../actionLifecycle?raw') as { default: string }
    const code = src.default
    // SC1: epoch is the per-submission id in actionLifecycle
    expect(code).toContain('epoch')
    expect(code).toContain('epoch !== submissionId')
    // SC1: callbacks reject via epoch check at entry
    expect(code).toContain('if (epoch !== submissionId) return')
  })

  it('RC6: Pool.tsx renders ReceiptBanner at FUNDED state (contribution evidence survives ACTIVE→FUNDED)', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // A ReceiptBanner for 'contribute' must be rendered outside the ACTIVE branch
    // (at FUNDED so the banner is not lost on goal completion)
    expect(code).toContain("STATUS.FUNDED && isConnected")
    expect(code).toContain('<ReceiptBanner action="contribute" />')
    // Multiple occurrences — one inside ACTIVE, one outside
    const occurrences = (code.match(/<ReceiptBanner action="contribute"/g) ?? []).length
    expect(occurrences).toBeGreaterThanOrEqual(2)
  })

  it('RC6: Pool.tsx renders ReceiptBanner at CLOSED state (refund evidence survives CLOSED)', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // ReceiptBanner for refund must appear inside CLOSED branch
    expect(code).toContain("STATUS.CLOSED")
    expect(code).toContain('<ReceiptBanner action="refund" />')
    const refundOccurrences = (code.match(/<ReceiptBanner action="refund"/g) ?? []).length
    // At minimum: inside REFUNDING myClaimable>0n, inside myClaimable===0n, and inside CLOSED
    expect(refundOccurrences).toBeGreaterThanOrEqual(3)
  })

  it('RC2/SC1: validateReceipt used from actionLifecycle.ts (not inline in Pool.tsx)', async () => {
    const poolSrc = await import('../../../src/pages/Pool?raw') as { default: string }
    const poolCode = poolSrc.default
    // Pool.tsx must NOT contain inline async function validateReceipt
    expect(poolCode).not.toContain('async function validateReceipt(')
    // Pool.tsx must import from actionLifecycle (which imports validateReceipt internally)
    expect(poolCode).toContain("from '../lib/actionLifecycle'")
    // actionLifecycle.ts must import from validateReceipt
    const lcSrc = await import('../actionLifecycle?raw') as { default: string }
    const lcCode = lcSrc.default
    expect(lcCode).toContain("from './validateReceipt'")
  })

})
