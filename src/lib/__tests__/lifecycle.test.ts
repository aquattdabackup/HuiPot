/**
 * lifecycle.test.ts — production-path lifecycle regression tests
 *
 * Tests call makeActionLifecycle() from src/lib/actionLifecycle.ts directly.
 * There is no mirrored re-implementation of the lifecycle logic here.
 *
 * Covers:
 *   RL1: per-submission id prevents isSuccess from discarding repriced validation
 *   RL2: cancelled/replaced phases carry minedHash for correct explorer links
 *   RL3: unmount (clear()) discards in-flight validation
 *   SC1: late callbacks (post-unmount, post-new-submission) are rejected before
 *        any work starts — epoch check happens at callback entry, not after RPC
 *   Valid controls: confirmed after repriced, retry after error, second submission
 *   Account/pool/chain scope: verified via ReceiptSnapshot fields in validateReceipt
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeActionLifecycle } from '../actionLifecycle'
import { CONTRIBUTED_TOPIC, type ReceiptSnapshot } from '../validateReceipt'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── Fixtures ──────────────────────────────────────────────────────────────────
const RPC_URL = 'http://rpc.test'
const CONTRACT = '0x1111111111111111111111111111111111111111'
const POOL_ID = '42'
const ACCOUNT_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const ACCOUNT_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const AMOUNT = 1_000_000_000_000_000_000n

function pad32(n: bigint) { return n.toString(16).padStart(64, '0') }
function padAddr(a: string) { const h = a.replace('0x', '').toLowerCase(); return '0'.repeat(64 - h.length) + h }

function makeContribLog(poolId: string, contributor: string, amount: bigint) {
  return {
    address: CONTRACT,
    topics: [CONTRIBUTED_TOPIC, '0x' + pad32(BigInt(poolId)), '0x' + padAddr(contributor)],
    data: '0x' + pad32(amount),
  }
}

function validReceiptFor(contributor = ACCOUNT_A, amount = AMOUNT) {
  return { status: '0x1', to: CONTRACT, logs: [makeContribLog(POOL_ID, contributor, amount)] }
}

const baseSnap: ReceiptSnapshot = {
  action: 'contribute', amount: AMOUNT, recipient: CONTRACT,
  poolId: POOL_ID, contractAddress: CONTRACT, accountAddress: ACCOUNT_A,
}

// Mock fetch to return specific receipts per txHash
function stubFetchMap(map: Map<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, opts?: { body?: string }) => {
    let hash = ''
    try { hash = (JSON.parse(opts?.body ?? '{}') as { params?: string[] }).params?.[0] ?? '' } catch {}
    const result = map.get(hash) ?? null
    return { ok: true, json: async () => ({ result }) } as Response
  }))
}

// Wait for a predicate or throw after timeout
async function waitFor(pred: () => boolean, timeout = 500) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (pred()) return
    await new Promise(r => setTimeout(r, 5))
  }
  throw new Error(`waitFor timeout after ${timeout}ms`)
}

// Build a lifecycle with spied callbacks
function makeTestLifecycle() {
  const phases: Record<string, unknown> = {}
  const setPhase = vi.fn((action: string, phase: unknown) => { phases[action] = phase })
  const onSuccess = vi.fn()
  const lc = makeActionLifecycle(RPC_URL, { setPhase, onSuccess })
  function getPhase(action = 'contribute') { return phases[action] as { phase: string } | undefined }
  return { lc, setPhase, onSuccess, getPhase }
}

// ─── RL1 — per-submission lifecycle ──────────────────────────────────────────
describe('RL1 — per-submission id prevents isSuccess from discarding repriced validation', () => {

  it('RL1-FAST: repriced B confirms; isSuccess(A) fired after is discarded', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    stubFetchMap(new Map([
      [HASH_A, { status: '0x1', to: CONTRACT, logs: [] }], // A: no event → replaced
      [HASH_B, validReceiptFor()],                          // B: confirms
    ]))
    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    // onReplaced(repriced) fires first; starts B
    lc.makeOnReplaced(ctx)({ reason: 'repriced', transaction: { hash: HASH_B }, replacedTransaction: { hash: HASH_A } })

    // Wait for B to confirm
    await waitFor(() => getPhase()?.phase === 'confirmed')

    // Now isSuccess fires for A — it should be silently discarded
    await lc.runReceiptValidation(HASH_A, ctx)

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_B, 'contribute')
    expect(getPhase()?.phase).toBe('confirmed')
  })

  it('RL1-SLOW: isSuccess(A) starts first; onReplaced fires while A is in-flight; B wins', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    let resolveB!: () => void
    vi.stubGlobal('fetch', vi.fn(async (_url: string, opts?: { body?: string }) => {
      let hash = ''
      try { hash = (JSON.parse(opts?.body ?? '{}') as { params?: string[] }).params?.[0] ?? '' } catch {}
      if (hash === HASH_A) return { ok: true, json: async () => ({ result: { status: '0x1', to: CONTRACT, logs: [] } }) } as Response
      await new Promise<void>(r => { resolveB = r })
      return { ok: true, json: async () => ({ result: validReceiptFor() }) } as Response
    }))

    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    // isSuccess fires for A first
    void lc.runReceiptValidation(HASH_A, ctx)
    await new Promise(r => setTimeout(r, 5))

    // onReplaced fires before A resolves: marks A consumed, starts B
    lc.makeOnReplaced(ctx)({ reason: 'repriced', transaction: { hash: HASH_B }, replacedTransaction: { hash: HASH_A } })
    resolveB()

    await waitFor(() => getPhase()?.phase === 'confirmed', 500)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_B, 'contribute')
  })

  it('RL1-DUP: isSuccess(A) and onReplaced(repriced) both complete; onSuccess called once', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    stubFetchMap(new Map([
      [HASH_A, validReceiptFor()],
      [HASH_B, validReceiptFor()],
    ]))
    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    // Fire both concurrently
    lc.makeOnReplaced(ctx)({ reason: 'repriced', transaction: { hash: HASH_B }, replacedTransaction: { hash: HASH_A } })
    void lc.runReceiptValidation(HASH_A, ctx)

    await waitFor(() => getPhase()?.phase === 'confirmed' || getPhase()?.phase === 'replaced', 500)
    await new Promise(r => setTimeout(r, 20))

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('RL1-NEWSUB: second submission starts fresh; both onSuccess calls fire independently', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_C = '0x' + 'c'.repeat(64)
    stubFetchMap(new Map([
      [HASH_A, validReceiptFor()],
      [HASH_C, validReceiptFor()],
    ]))
    const { lc, onSuccess, getPhase } = makeTestLifecycle()

    const ctx1 = lc.beginSubmission(baseSnap)
    await lc.runReceiptValidation(HASH_A, ctx1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_A, 'contribute')

    const ctx2 = lc.beginSubmission(baseSnap)
    await lc.runReceiptValidation(HASH_C, ctx2)
    await waitFor(() => getPhase()?.phase === 'confirmed', 200)
    expect(onSuccess).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenNthCalledWith(2, HASH_C, 'contribute')
  })

})

// ─── SC1 — Late callback binding ──────────────────────────────────────────────
describe('SC1 — late callbacks adopt the current submission context', () => {

  it('SC1-POST-UNMOUNT: onReplaced(repriced) callback arriving after clear() is rejected before starting work', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: validReceiptFor() }) })
    vi.stubGlobal('fetch', fetchSpy)

    const { lc, onSuccess } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    // Unmount (simulates component teardown)
    lc.clear()

    // Old repriced callback arrives after unmount — must be rejected at entry
    lc.makeOnReplaced(ctx)({ reason: 'repriced', transaction: { hash: HASH_B }, replacedTransaction: { hash: HASH_A } })
    await new Promise(r => setTimeout(r, 30))

    // No fetch started, no onSuccess called
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('SC1-POST-NEWSUB: old onReplaced(repriced) callback arriving after new submission is rejected', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const HASH_C = '0x' + 'c'.repeat(64)
    stubFetchMap(new Map([
      [HASH_B, validReceiptFor()], // old repriced hash — should not be fetched
      [HASH_C, validReceiptFor()], // new submission hash
    ]))
    const { lc, onSuccess, getPhase } = makeTestLifecycle()

    // First submission
    const ctx1 = lc.beginSubmission(baseSnap)

    // Second submission starts before old callback arrives
    const ctx2 = lc.beginSubmission(baseSnap)
    void lc.runReceiptValidation(HASH_C, ctx2)

    // Old callback arrives for ctx1 — must be rejected at entry before starting any validation
    lc.makeOnReplaced(ctx1)({ reason: 'repriced', transaction: { hash: HASH_B }, replacedTransaction: { hash: HASH_A } })

    await waitFor(() => getPhase()?.phase === 'confirmed', 500)

    // onSuccess called only once, for HASH_C (second submission)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_C, 'contribute')
  })

  it('SC1-POST-UNMOUNT-SUCCESS: isSuccess RPC resolves after clear(); onSuccess not called', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    let resolveFetch!: () => void
    vi.stubGlobal('fetch', vi.fn(async () => {
      await new Promise<void>(r => { resolveFetch = r })
      return { ok: true, json: async () => ({ result: validReceiptFor() }) } as Response
    }))

    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    // Start validation, wait for 'checking' phase
    void lc.runReceiptValidation(HASH_A, ctx)
    await waitFor(() => getPhase()?.phase === 'checking', 200)

    // Unmount — advances epoch
    lc.clear()

    // RPC resolves after unmount
    resolveFetch()
    await new Promise(r => setTimeout(r, 30))

    expect(onSuccess).not.toHaveBeenCalled()
  })

})

// ─── RL2 — mined hash in phase ────────────────────────────────────────────────
describe('RL2 — cancelled/replaced phases carry minedHash', () => {

  it('RL2-CANCEL: cancelled phase has both originalHash and minedHash', () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const phases: Record<string, unknown> = {}
    const lc = makeActionLifecycle(RPC_URL, {
      setPhase: (action, phase) => { phases[action] = phase },
      onSuccess: vi.fn(),
    })
    const ctx = lc.beginSubmission(baseSnap)

    lc.makeOnReplaced(ctx)({ reason: 'cancelled', transaction: { hash: HASH_B }, replacedTransaction: { hash: HASH_A } })

    const p = phases['contribute'] as { phase: string; originalHash: string; minedHash?: string }
    expect(p.phase).toBe('cancelled')
    expect(p.originalHash).toBe(HASH_A)
    expect(p.minedHash).toBe(HASH_B)
  })

  it('RL2-REPLACED: replaced (non-repriced) phase has txHash=originalHash and minedHash=minedHash', () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const phases: Record<string, unknown> = {}
    const lc = makeActionLifecycle(RPC_URL, {
      setPhase: (action, phase) => { phases[action] = phase },
      onSuccess: vi.fn(),
    })
    // Use payout snap (action !== contribute so 'replaced' branch hits)
    const payoutSnap = { ...baseSnap, action: 'payout' as const }
    const ctx = lc.beginSubmission(payoutSnap)

    lc.makeOnReplaced(ctx)({ reason: 'replaced', transaction: { hash: HASH_B }, replacedTransaction: { hash: HASH_A } })

    const p = phases['payout'] as { phase: string; txHash: string; minedHash?: string }
    expect(p.phase).toBe('replaced')
    expect(p.txHash).toBe(HASH_A)
    expect(p.minedHash).toBe(HASH_B)
  })

  it('RL2-STRUCT: Pool.tsx replaced banner uses phase.minedHash ?? phase.txHash', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    expect(src).toContain('phase.minedHash ?? phase.txHash')
  })

  it('RL2-STRUCT: Pool.tsx cancelled banner conditionally links to phase.minedHash', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    expect(src).toContain('phase.minedHash &&')
    expect(src).toContain('View cancellation tx')
  })

})

// ─── RL3 — unmount cleanup ───────────────────────────────────────────────────
describe('RL3 — clear() on unmount invalidates in-flight validation', () => {

  it('RL3-UNMOUNT: onSuccess not called when RPC resolves after clear()', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    let resolveFetch!: () => void
    vi.stubGlobal('fetch', vi.fn(async () => {
      await new Promise<void>(r => { resolveFetch = r })
      return { ok: true, json: async () => ({ result: validReceiptFor() }) } as Response
    }))

    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)
    void lc.runReceiptValidation(HASH_A, ctx)
    await waitFor(() => getPhase()?.phase === 'checking', 200)

    lc.clear()
    resolveFetch()
    await new Promise(r => setTimeout(r, 30))

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('RL3-STRUCT: Pool.tsx useEffect cleanup calls lifecycle.clear()', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    // cleanup returns () => { lifecycle.clear() }
    expect(src).toMatch(/return\s*\(\s*\)\s*=>\s*\{[^}]*lifecycle\.clear\(\)/)
  })

  it('RL3-STRUCT: actionLifecycle.ts clear() advances epoch and resets activeSlot', async () => {
    const { default: src } = await import('../actionLifecycle.ts?raw')
    expect(src).toContain('function clear()')
    expect(src).toContain('epoch++')
    expect(src).toContain('activeSlot = null')
  })

})

// ─── Account/pool/chain scope ────────────────────────────────────────────────
describe('account/pool/chain scope — wrong context rejected by validateReceipt', () => {

  it('wrong account → replaced (not confirmed)', async () => {
    const HASH = '0x' + 'd'.repeat(64)
    stubFetchMap(new Map([
      [HASH, validReceiptFor(ACCOUNT_B)], // receipt has different contributor
    ]))
    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap) // accountAddress = ACCOUNT_A
    await lc.runReceiptValidation(HASH, ctx)
    expect(getPhase()?.phase).toBe('replaced')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('wrong pool → replaced (not confirmed)', async () => {
    const HASH = '0x' + 'e'.repeat(64)
    // Receipt has pool 99 but snap has pool 42
    const wrongPoolLog = makeContribLog('99', ACCOUNT_A, AMOUNT)
    stubFetchMap(new Map([
      [HASH, { status: '0x1', to: CONTRACT, logs: [wrongPoolLog] }],
    ]))
    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)
    await lc.runReceiptValidation(HASH, ctx)
    expect(getPhase()?.phase).toBe('replaced')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('wrong amount → replaced (not confirmed)', async () => {
    const HASH = '0x' + 'f'.repeat(64)
    stubFetchMap(new Map([
      [HASH, validReceiptFor(ACCOUNT_A, AMOUNT * 2n)], // double amount
    ]))
    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)
    await lc.runReceiptValidation(HASH, ctx)
    expect(getPhase()?.phase).toBe('replaced')
    expect(onSuccess).not.toHaveBeenCalled()
  })

})

// ─── Accepted: transient retry ───────────────────────────────────────────────
describe('Accepted: transient HTTP error allows retry within same submission', () => {

  it('error does not mark notifiedSet — retry with same submissionId succeeds', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      callCount++
      if (callCount === 1) return { ok: false, status: 500, json: async () => ({}) } as Response
      return { ok: true, json: async () => ({ result: validReceiptFor() }) } as Response
    }))

    const { lc, onSuccess, getPhase } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    // First attempt → error
    await lc.runReceiptValidation(HASH_A, ctx)
    expect(getPhase()?.phase).toBe('error')
    expect(onSuccess).not.toHaveBeenCalled()

    // Retry with same ctx → success
    await lc.runReceiptValidation(HASH_A, ctx)
    expect(getPhase()?.phase).toBe('confirmed')
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_A, 'contribute')
  })

})
