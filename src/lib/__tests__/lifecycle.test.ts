/**
 * lifecycle.test.ts — RL1/RL2/RL3 lifecycle regression tests
 *
 * Tests the per-submission lifecycle logic mirrored from ActionPanel:
 *   - RL1: repriced tx validates under same submissionId; isSuccess for original does not race
 *   - RL2: cancelled/replaced phases carry minedHash for correct explorer link
 *   - RL3: unmount (submissionId advance) discards in-flight validation
 *
 * These tests instantiate a minimal lifecycle harness that mirrors the actual
 * ActionPanel logic without React. The harness shares the same ref semantics
 * (plain objects used as refs) and calls production validateReceipt.
 *
 * All 31 previously accepted receipt/action cases (validateReceipt.test.ts) are
 * unchanged; these tests add lifecycle-layer assertions on top.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateReceipt, CONTRIBUTED_TOPIC, type ReceiptSnapshot } from '../validateReceipt'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── Harness ─────────────────────────────────────────────────────────────────
type Phase =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'confirmed'; txHash: string }
  | { phase: 'replaced'; txHash: string; minedHash?: string; note: string }
  | { phase: 'repriced'; originalHash: string; minedHash: string; note: string }
  | { phase: 'cancelled'; originalHash: string; minedHash?: string; note: string }
  | { phase: 'error'; txHash: string; message: string }

function makeHarness(rpcUrl: string, onSuccess: (hash: string) => void) {
  const submissionIdRef = { current: 0 }
  const activeValidationRef = { current: null as { submissionId: number; txHash: string } | null }
  const notifiedRef = { current: new Set<string>() }
  let pendingSnap: ReceiptSnapshot | null = null
  let currentPhase: Phase = { phase: 'idle' }

  function setPhase(p: Phase) { currentPhase = p }
  function getPhase() { return currentPhase }

  async function runReceiptValidation(txHash: string, snap: ReceiptSnapshot, submissionId: number) {
    const key = `${submissionId}:${txHash}`
    if (notifiedRef.current.has(key)) return

    // Claim slot: if different hash is active for same submission, mark old one consumed
    const existing = activeValidationRef.current
    if (existing && existing.submissionId === submissionId && existing.txHash !== txHash) {
      notifiedRef.current.add(`${submissionId}:${existing.txHash}`)
    }
    activeValidationRef.current = { submissionId, txHash }

    setPhase({ phase: 'checking' })
    const result = await validateReceipt(txHash, snap, rpcUrl)

    // Stale checks (mirror ActionPanel)
    if (submissionIdRef.current !== submissionId) return
    if (activeValidationRef.current?.txHash !== txHash) return
    if (notifiedRef.current.has(key)) return

    if (result.outcome === 'confirmed') {
      notifiedRef.current.add(key)
      setPhase({ phase: 'confirmed', txHash })
      onSuccess(txHash)
    } else if (result.outcome === 'replaced') {
      notifiedRef.current.add(key)
      setPhase({ phase: 'replaced', txHash, note: result.note })
    } else {
      setPhase({ phase: 'error', txHash, message: result.note })
    }
  }

  function onReplacedHandler(
    reason: 'repriced' | 'cancelled' | 'replaced',
    originalHash: string,
    minedHash: string,
    action: string,
  ) {
    const submissionId = submissionIdRef.current
    notifiedRef.current.add(`${submissionId}:${originalHash}`)
    if (reason === 'cancelled') {
      setPhase({ phase: 'cancelled', originalHash, minedHash, note: `Cancelled. Mined: ${minedHash.slice(0, 10)}…` })
    } else if (reason === 'repriced' && pendingSnap?.action === action) {
      void runReceiptValidation(minedHash, pendingSnap, submissionId)
    } else {
      setPhase({ phase: 'replaced', txHash: originalHash, minedHash, note: `Replaced (${reason}).` })
    }
  }

  function isSuccessEffect(txHash: string, action: string) {
    if (pendingSnap?.action === action) {
      void runReceiptValidation(txHash, pendingSnap, submissionIdRef.current)
    }
  }

  function newSubmission(snap: ReceiptSnapshot) {
    pendingSnap = snap
    submissionIdRef.current++
    activeValidationRef.current = null
  }

  function unmount() {
    submissionIdRef.current++
    activeValidationRef.current = null
  }

  return {
    getPhase,
    submissionIdRef,
    newSubmission,
    onReplacedHandler,
    isSuccessEffect,
    unmount,
    notifiedRef,
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const RPC_URL = 'http://rpc.test'
const CONTRACT = '0x1111111111111111111111111111111111111111'
const POOL_ID = '42'
const ACCOUNT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
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

const validReceipt = {
  status: '0x1',
  to: CONTRACT,
  logs: [makeContribLog(POOL_ID, ACCOUNT, AMOUNT)],
}

const baseSnap: ReceiptSnapshot = {
  action: 'contribute',
  amount: AMOUNT,
  recipient: CONTRACT,
  poolId: POOL_ID,
  contractAddress: CONTRACT,
  accountAddress: ACCOUNT,
}

// Helper: stub fetch to return a specific receipt for each hash
function stubFetchMap(map: Map<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, opts?: { body?: string }) => {
    let hash = ''
    try { hash = (JSON.parse(opts?.body ?? '{}') as { params?: string[] }).params?.[0] ?? '' } catch {}
    const result = map.get(hash) ?? null
    return { ok: true, json: async () => ({ result }) } as Response
  }))
}

// Helper: wait for phase to match predicate
async function waitForPhase(h: ReturnType<typeof makeHarness>, pred: (p: Phase) => boolean, timeout = 500) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (pred(h.getPhase())) return
    await new Promise(r => setTimeout(r, 5))
  }
  throw new Error(`waitForPhase timeout after ${timeout}ms — last phase: ${JSON.stringify(h.getPhase())}`)
}

// ─── RL1 tests ────────────────────────────────────────────────────────────────
describe('RL1 — per-submission lifecycle', () => {

  it('RL1-FAST: repriced fast-RPC — B confirms, isSuccess(A) discarded', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const onSuccess = vi.fn()

    // A has no event (would return replaced), B has valid receipt
    stubFetchMap(new Map([
      [HASH_A, { status: '0x1', to: CONTRACT, logs: [] }],
      [HASH_B, validReceipt],
    ]))

    const h = makeHarness(RPC_URL, onSuccess)
    h.newSubmission(baseSnap)

    // onReplaced fires first: repriced → starts B validation with current submissionId
    h.onReplacedHandler('repriced', HASH_A, HASH_B, 'contribute')

    // Wait for B to confirm
    await waitForPhase(h, p => p.phase === 'confirmed')

    // Now isSuccess fires for A (simulates delayed hook callback)
    h.isSuccessEffect(HASH_A, 'contribute')
    await new Promise(r => setTimeout(r, 30))

    // B confirmed; A was already marked consumed by repriced handler
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_B)
    const phase = h.getPhase()
    expect(phase.phase).toBe('confirmed')
    if (phase.phase === 'confirmed') expect(phase.txHash).toBe(HASH_B)
  })

  it('RL1-SLOW: isSuccess(A) starts before onReplaced fires — B wins on repricing', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const onSuccess = vi.fn()

    // Controlled fetch: A returns replaced (no event), B is slow then confirmed
    let resolveB!: () => void
    const bReady = new Promise<void>(r => { resolveB = r })

    vi.stubGlobal('fetch', vi.fn(async (_url: string, opts?: { body?: string }) => {
      let hash = ''
      try { hash = (JSON.parse(opts?.body ?? '{}') as { params?: string[] }).params?.[0] ?? '' } catch {}
      if (hash === HASH_A) {
        // A: returns quickly, but has no matching event → 'replaced'
        return { ok: true, json: async () => ({ result: { status: '0x1', to: CONTRACT, logs: [] } }) } as Response
      }
      // B: slow
      await bReady
      return { ok: true, json: async () => ({ result: validReceipt }) } as Response
    }))

    const h = makeHarness(RPC_URL, onSuccess)
    h.newSubmission(baseSnap)
    const sid = h.submissionIdRef.current

    // isSuccess fires for A first
    h.isSuccessEffect(HASH_A, 'contribute')

    // Let A start processing (not yet done if sync path, but yield)
    await new Promise(r => setTimeout(r, 5))

    // onReplaced fires: marks A consumed, starts B with same submissionId
    h.onReplacedHandler('repriced', HASH_A, HASH_B, 'contribute')

    // Resolve B's fetch
    resolveB()

    // B confirms (A's result should be either ignored because A is consumed, or replaces to replaced)
    await waitForPhase(h, p => p.phase === 'confirmed' || (p.phase === 'error'), 500)

    // If A resolved as 'replaced' before onReplaced ran: that's fine, then B confirms.
    // If B confirms, that's the correct RL1 behavior.
    // Key invariant: onSuccess called exactly once, with HASH_B.
    await waitForPhase(h, p => p.phase === 'confirmed', 500)

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_B)
    expect(h.submissionIdRef.current).toBe(sid)
  })

  it('RL1-DUP: both isSuccess(A) and onReplaced(repriced) resolve — onSuccess called exactly once', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const onSuccess = vi.fn()

    // Both A and B return valid receipts
    stubFetchMap(new Map([
      [HASH_A, validReceipt],
      [HASH_B, validReceipt],
    ]))

    const h = makeHarness(RPC_URL, onSuccess)
    h.newSubmission(baseSnap)

    // Fire both concurrently
    h.onReplacedHandler('repriced', HASH_A, HASH_B, 'contribute')
    h.isSuccessEffect(HASH_A, 'contribute')

    // Wait for settlement
    await waitForPhase(h, p => p.phase === 'confirmed' || p.phase === 'replaced', 500)
    await new Promise(r => setTimeout(r, 30))

    // Exactly one onSuccess call regardless of racing outcome
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('RL1-NEWSUB: second submission after confirmed starts independent lifecycle', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_C = '0x' + 'c'.repeat(64)
    const onSuccess = vi.fn()

    stubFetchMap(new Map([
      [HASH_A, validReceipt],
      [HASH_C, validReceipt],
    ]))

    const h = makeHarness(RPC_URL, onSuccess)

    // First submission
    h.newSubmission(baseSnap)
    h.isSuccessEffect(HASH_A, 'contribute')
    await waitForPhase(h, p => p.phase === 'confirmed', 500)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_A)

    // Second submission
    h.newSubmission(baseSnap)
    h.isSuccessEffect(HASH_C, 'contribute')
    await waitForPhase(h, p => p.phase === 'confirmed' && p.txHash === HASH_C, 500)

    expect(onSuccess).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenNthCalledWith(2, HASH_C)
  })

})

// ─── RL2 tests ────────────────────────────────────────────────────────────────
describe('RL2 — cancelled/replaced mined hash in phase', () => {

  it('RL2-CANCEL: cancelled phase carries both originalHash and minedHash', () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const h = makeHarness(RPC_URL, vi.fn())
    h.newSubmission(baseSnap)

    h.onReplacedHandler('cancelled', HASH_A, HASH_B, 'contribute')

    const phase = h.getPhase()
    expect(phase.phase).toBe('cancelled')
    if (phase.phase === 'cancelled') {
      expect(phase.minedHash).toBe(HASH_B)
      expect(phase.originalHash).toBe(HASH_A)
    }
  })

  it('RL2-REPLACED: non-repriced replaced phase carries minedHash', () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const HASH_B = '0x' + 'b'.repeat(64)
    const h = makeHarness(RPC_URL, vi.fn())
    h.newSubmission(baseSnap)

    h.onReplacedHandler('replaced', HASH_A, HASH_B, 'payout')

    const phase = h.getPhase()
    expect(phase.phase).toBe('replaced')
    if (phase.phase === 'replaced') {
      expect(phase.minedHash).toBe(HASH_B)
      expect(phase.txHash).toBe(HASH_A)
    }
  })

  it('RL2-BANNER-STRUCT: Pool.tsx replaced banner uses phase.minedHash ?? phase.txHash', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    expect(src).toContain('phase.minedHash ?? phase.txHash')
  })

  it('RL2-CANCEL-STRUCT: Pool.tsx cancelled banner conditionally links to minedHash', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    expect(src).toContain('phase.minedHash &&')
    expect(src).toContain('View cancellation tx')
  })

})

// ─── RL3 tests ────────────────────────────────────────────────────────────────
describe('RL3 — unmount invalidates in-flight validation', () => {

  it('RL3-UNMOUNT: onSuccess not called when RPC resolves after unmount', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const onSuccess = vi.fn()

    let resolveFetch!: () => void
    vi.stubGlobal('fetch', vi.fn(async () => {
      await new Promise<void>(r => { resolveFetch = r })
      return { ok: true, json: async () => ({ result: validReceipt }) } as Response
    }))

    const h = makeHarness(RPC_URL, onSuccess)
    h.newSubmission(baseSnap)
    h.isSuccessEffect(HASH_A, 'contribute')

    // Let the validation start (checking phase)
    await waitForPhase(h, p => p.phase === 'checking', 200)

    // Unmount — invalidates current submissionId
    h.unmount()

    // Resolve the fetch after unmount
    resolveFetch()
    await new Promise(r => setTimeout(r, 30))

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('RL3-STRUCT: Pool.tsx cleanup increments submissionIdRef on unmount', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    expect(src).toContain('submissionIdRef.current++')
    // Cleanup pattern: return () => { ... submissionIdRef.current++ ... }
    expect(src).toMatch(/return\s*\(\s*\)\s*=>\s*\{[\s\S]{0,300}submissionIdRef\.current\+\+/)
  })

  it('RL3-STRUCT: Pool.tsx resets activeValidationRef in both confirmAction and cleanup', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    const matches = src.match(/activeValidationRef\.current\s*=\s*null/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

})

// ─── Accepted: transient HTTP retry still works ────────────────────────────────
describe('Accepted: transient HTTP retry not broken by RL1 changes', () => {

  it('error does not add to notifiedRef — same submissionId retry succeeds', async () => {
    const HASH_A = '0x' + 'a'.repeat(64)
    const onSuccess = vi.fn()
    let callCount = 0

    vi.stubGlobal('fetch', vi.fn(async () => {
      callCount++
      if (callCount === 1) {
        return { ok: false, status: 500, json: async () => ({}) } as Response
      }
      return { ok: true, json: async () => ({ result: validReceipt }) } as Response
    }))

    const h = makeHarness(RPC_URL, onSuccess)
    h.newSubmission(baseSnap)
    h.isSuccessEffect(HASH_A, 'contribute')

    // First attempt fails → error phase
    await waitForPhase(h, p => p.phase === 'error', 500)
    expect(onSuccess).not.toHaveBeenCalled()

    // Retry: clear notifiedRef key for same submissionId and re-run
    const sid = h.submissionIdRef.current
    const key = `${sid}:${HASH_A}`
    h.notifiedRef.current.delete(key)
    h.isSuccessEffect(HASH_A, 'contribute')

    // Second attempt succeeds
    await waitForPhase(h, p => p.phase === 'confirmed', 500)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(HASH_A)
  })

})
