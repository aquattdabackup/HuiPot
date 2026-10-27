/**
 * lifecycle.test.ts — submission-bound lifecycle regression tests.
 *
 * All tests call production makeActionLifecycle directly — no mirrored
 * re-implementation. Tests exercise both the module API and the component-path
 * dispatch API (dispatchOnReplaced / dispatchSuccess / dispatchRetry) that
 * Pool.tsx's stable wrappers call.
 *
 * SC1-D (this revision): stable wrappers previously read the current per-action
 * handler ref at dispatch time. After a second same-action submission the wrapper
 * would route an old event to the new handler, bypassing the epoch check.
 * Fix: hash-keyed dispatch via registerHash + dispatchOnReplaced/dispatchSuccess.
 * These tests exercise the dispatch path, not just the direct-module path.
 *
 * Accepted cases (preserved):
 *   - 31 receipt/action cases in validateReceipt.test.ts
 *   - All prior lifecycle behavioral cases below still pass
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { type ReceiptSnapshot, CONTRIBUTED_TOPIC as CT } from '../validateReceipt'
import { makeActionLifecycle as makeLifecycle } from '../actionLifecycle'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const RPC_URL = 'http://rpc.test'
const CONTRACT = '0x1111111111111111111111111111111111111111'
const POOL_ID = '42'
const ACCOUNT_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const ACCOUNT_C = '0xcccccccccccccccccccccccccccccccccccccccc'
const AMOUNT    = 1_000_000_000_000_000_000n

const HASH_A = '0x' + 'a'.repeat(64)
const HASH_B = '0x' + 'b'.repeat(64)
const HASH_C = '0x' + 'c'.repeat(64)
const HASH_D = '0x' + 'd'.repeat(64)

function pad32(n: bigint) { return n.toString(16).padStart(64, '0') }
function padAddr(a: string) { const h = a.replace('0x', '').toLowerCase(); return '0'.repeat(64 - h.length) + h }

function makeContribLog(poolId: string, contributor: string, amount: bigint) {
  return {
    address: CONTRACT,
    topics: [CT, '0x' + pad32(BigInt(poolId)), '0x' + padAddr(contributor)],
    data: '0x' + pad32(amount),
  }
}

function validReceiptFor(account: string, amount = AMOUNT) {
  return { status: '0x1', to: CONTRACT, logs: [makeContribLog(POOL_ID, account, amount)] }
}

const baseSnap: ReceiptSnapshot = {
  action: 'contribute',
  amount: AMOUNT,
  recipient: CONTRACT,
  poolId: POOL_ID,
  contractAddress: CONTRACT,
  accountAddress: ACCOUNT_A,
}

// Stub fetch with a hash→receipt map; unknown hashes return no-event receipt
function stubFetchMap(map: Map<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, opts?: { body?: string }) => {
    let hash = ''
    try { hash = (JSON.parse(opts?.body ?? '{}') as { params?: string[] }).params?.[0] ?? '' } catch {}
    const result = map.get(hash) ?? { status: '0x1', to: CONTRACT, logs: [] }
    return { ok: true, json: async () => ({ result }) } as Response
  }))
}

// Create a test lifecycle adapter with spies
function makeTestLifecycle(opts?: { rpcUrl?: string }) {
  const phases: Array<[string, unknown]> = []
  const successes: string[] = []
  const lc = makeLifecycle(opts?.rpcUrl ?? RPC_URL, {
    setPhase: (action, phase) => { phases.push([action, phase]) },
    onSuccess: (txHash, _action) => { successes.push(txHash) },
  })
  return { lc, phases, successes }
}

async function waitFor(pred: () => boolean, timeout = 500) {
  const t = Date.now()
  while (Date.now() - t < timeout) {
    if (pred()) return
    await new Promise(r => setTimeout(r, 5))
  }
  throw new Error('waitFor timeout')
}

function lastPhase(phases: Array<[string, unknown]>, action: string) {
  for (let i = phases.length - 1; i >= 0; i--) {
    if (phases[i][0] === action) return phases[i][1] as { phase: string }
  }
  return undefined
}

// ─── RL1 — direct module API (preserved) ──────────────────────────────────────

describe('RL1 — per-submission id via direct module API', () => {

  it('RL1-FAST: repriced B confirms via runReceiptValidation; isSuccess(A) discarded', async () => {
    stubFetchMap(new Map([[HASH_A, { status: '0x1', to: CONTRACT, logs: [] }], [HASH_B, validReceiptFor(ACCOUNT_A)]]))
    const { lc, successes } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    // onReplaced fires first: invalidate A, validate B
    lc.makeOnReplaced(ctx)({ reason: 'repriced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })
    await waitFor(() => successes.length > 0)

    // isSuccess for A arrives late
    void lc.runReceiptValidation(HASH_A, ctx)
    await new Promise(r => setTimeout(r, 30))

    expect(successes).toEqual([HASH_B])
  })

  it('RL1-SLOW: isSuccess(A) starts first; B wins after repricing', async () => {
    let resolveB!: () => void
    const bReady = new Promise<void>(r => { resolveB = r })
    vi.stubGlobal('fetch', vi.fn(async (_url: string, opts?: { body?: string }) => {
      let hash = ''
      try { hash = (JSON.parse(opts?.body ?? '{}') as { params?: string[] }).params?.[0] ?? '' } catch {}
      if (hash === HASH_B) { await bReady }
      const result = hash === HASH_B
        ? validReceiptFor(ACCOUNT_A)
        : { status: '0x1', to: CONTRACT, logs: [] }
      return { ok: true, json: async () => ({ result }) } as Response
    }))
    const { lc, successes } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    void lc.runReceiptValidation(HASH_A, ctx)
    await new Promise(r => setTimeout(r, 5))
    lc.makeOnReplaced(ctx)({ reason: 'repriced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })
    resolveB()

    await waitFor(() => successes.length > 0)
    expect(successes).toEqual([HASH_B])
  })

  it('RL1-DUP: both runReceiptValidation(A) and onReplaced(repriced) compete; onSuccess once', async () => {
    stubFetchMap(new Map([[HASH_A, validReceiptFor(ACCOUNT_A)], [HASH_B, validReceiptFor(ACCOUNT_A)]]))
    const { lc, successes } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    lc.makeOnReplaced(ctx)({ reason: 'repriced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })
    void lc.runReceiptValidation(HASH_A, ctx)

    await waitFor(() => successes.length > 0)
    await new Promise(r => setTimeout(r, 30))
    expect(successes).toHaveLength(1)
  })

  it('RL1-NEWSUB: second submission starts fresh; both onSuccess calls fire', async () => {
    stubFetchMap(new Map([[HASH_A, validReceiptFor(ACCOUNT_A)], [HASH_C, validReceiptFor(ACCOUNT_A)]]))
    const { lc, successes } = makeTestLifecycle()

    const ctx1 = lc.beginSubmission(baseSnap)
    void lc.runReceiptValidation(HASH_A, ctx1)
    await waitFor(() => successes.length === 1)
    expect(successes[0]).toBe(HASH_A)

    const ctx2 = lc.beginSubmission(baseSnap)
    void lc.runReceiptValidation(HASH_C, ctx2)
    await waitFor(() => successes.length === 2)
    expect(successes[1]).toBe(HASH_C)
  })

})

// ─── SC1-D — component-path dispatch: old event → new submission ───────────────
//
// These tests mirror the EXACT failure scenario Codex reproduced:
//   1. confirmAction for submission A → beginSubmission + registerHash(HASH_A, ctx1)
//   2. confirmAction for submission C → beginSubmission + registerHash(HASH_C, ctx2)
//   3. wagmi delivers onReplaced for tx A (A → B) → dispatchOnReplaced called
//   4. SC1-D fix: dispatchOnReplaced looks up ctx for HASH_A → finds ctx1 (epoch1)
//      → ctx1.submissionId(1) !== epoch(2) → REJECTED before fetch/state change
//
// Without the fix, stable wrapper read the newest handler ref (ctx2, epoch2),
// which passes the epoch check and validates B under C's context.

describe('SC1-D — component-path: old hash events rejected after new submission', () => {

  it('SC1-D-CONTRIB: contribute A→B repriced; submission C started; dispatchOnReplaced rejects B', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { lc, successes } = makeTestLifecycle()

    // Submission A
    const ctx1 = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx1)

    // Submission C (same action, advances epoch)
    const ctx2 = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_C, ctx2)

    // Old wagmi onReplaced event for tx A (A → B) arrives via stable wrapper
    lc.dispatchOnReplaced({ reason: 'repriced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })
    await new Promise(r => setTimeout(r, 30))

    // No fetch, no onSuccess — A's hash is stale
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(successes).toHaveLength(0)
  })

  it('SC1-D-PAYOUT: payout old hash rejected after new payout submission', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { lc, successes } = makeTestLifecycle()
    const payoutSnap: ReceiptSnapshot = { ...baseSnap, action: 'payout' }

    const ctx1 = lc.beginSubmission(payoutSnap)
    lc.registerHash(HASH_A, ctx1)

    const ctx2 = lc.beginSubmission(payoutSnap)
    lc.registerHash(HASH_C, ctx2)

    lc.dispatchOnReplaced({ reason: 'repriced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })
    await new Promise(r => setTimeout(r, 30))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(successes).toHaveLength(0)
  })

  it('SC1-D-REFUND: refund old hash rejected after new refund submission', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { lc, successes } = makeTestLifecycle()
    const refundSnap: ReceiptSnapshot = { ...baseSnap, action: 'refund' }

    const ctx1 = lc.beginSubmission(refundSnap)
    lc.registerHash(HASH_A, ctx1)

    const ctx2 = lc.beginSubmission(refundSnap)
    lc.registerHash(HASH_C, ctx2)

    lc.dispatchOnReplaced({ reason: 'repriced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })
    await new Promise(r => setTimeout(r, 30))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(successes).toHaveLength(0)
  })

  it('SC1-D-SUCCESS: late dispatchSuccess(HASH_A) after new submission is rejected', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { lc, successes } = makeTestLifecycle()

    const ctx1 = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx1)

    // New submission advances epoch
    const ctx2 = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_C, ctx2)

    // Late isSuccess for old hash A
    lc.dispatchSuccess(HASH_A)
    await new Promise(r => setTimeout(r, 30))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(successes).toHaveLength(0)
  })

  it('SC1-D-CURRENT: current submission dispatches correctly (positive control)', async () => {
    stubFetchMap(new Map([[HASH_C, validReceiptFor(ACCOUNT_A)]]))
    const { lc, successes } = makeTestLifecycle()

    const ctx = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_C, ctx)
    lc.dispatchSuccess(HASH_C)
    await waitFor(() => successes.length > 0)

    expect(successes).toEqual([HASH_C])
  })

  it('SC1-D-UNKNOWN: dispatchOnReplaced for unregistered hash is ignored', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { lc } = makeTestLifecycle()
    lc.beginSubmission(baseSnap)

    lc.dispatchOnReplaced({ reason: 'repriced', replacedTransaction: { hash: HASH_D }, transaction: { hash: HASH_B } })
    await new Promise(r => setTimeout(r, 20))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('SC1-D-RETRY: dispatchRetry re-runs validation for the registered hash', async () => {
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      callCount++
      const result = callCount < 2
        ? { ok: false, status: 500, json: async () => ({}) }  // first call fails
        : validReceiptFor(ACCOUNT_A)
      return { ok: callCount >= 2, json: async () => ({ result }) } as Response
    }))
    const { lc, successes, phases } = makeTestLifecycle()

    const ctx = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx)
    lc.dispatchSuccess(HASH_A)
    await waitFor(() => lastPhase(phases, 'contribute')?.phase === 'error')
    expect(successes).toHaveLength(0)

    // Retry via dispatch
    lc.dispatchRetry(HASH_A)
    await waitFor(() => successes.length > 0)
    expect(successes).toEqual([HASH_A])
  })

})

// ─── SC1-E — stale wait-hook errors rejected by dispatchError ─────────────────
//
// Pool.tsx wait-error effects previously called setPhase directly, guarded only
// by currentCtxRef.current.snap.action. A late wait-error from an older same-action
// submission would bypass the hash/epoch guard and overwrite the current phase.
//
// Fix: wait-error effects call lifecycle.dispatchError(hash, message). That method
// looks up hash → ctx, checks epoch, and rejects stale hashes before setPhase.

describe('SC1-E — stale wait-error rejected by dispatchError', () => {

  it('SC1-E-CONTRIB: stale contrib error after new submission is rejected', () => {
    const { lc, phases } = makeTestLifecycle()

    // Submission A
    const ctx1 = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx1)

    // Submission C (same action — advances epoch, ctx1 is now stale)
    const ctx2 = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_C, ctx2)

    // Late wait-error for HASH_A (old submission)
    lc.dispatchError(HASH_A, 'late revert')

    // Must not update current phase — HASH_A's epoch is stale
    expect(lastPhase(phases, 'contribute')).toBeUndefined()
  })

  it('SC1-E-PAYOUT: stale payout error after new payout submission is rejected', () => {
    const payoutSnap: ReceiptSnapshot = { ...baseSnap, action: 'payout' }
    const { lc, phases } = makeTestLifecycle()

    const ctx1 = lc.beginSubmission(payoutSnap)
    lc.registerHash(HASH_A, ctx1)

    const ctx2 = lc.beginSubmission(payoutSnap)
    lc.registerHash(HASH_C, ctx2)

    lc.dispatchError(HASH_A, 'late revert')
    expect(lastPhase(phases, 'payout')).toBeUndefined()
  })

  it('SC1-E-REFUND: stale refund error after new refund submission is rejected', () => {
    const refundSnap: ReceiptSnapshot = { ...baseSnap, action: 'refund' }
    const { lc, phases } = makeTestLifecycle()

    const ctx1 = lc.beginSubmission(refundSnap)
    lc.registerHash(HASH_A, ctx1)

    const ctx2 = lc.beginSubmission(refundSnap)
    lc.registerHash(HASH_C, ctx2)

    lc.dispatchError(HASH_A, 'late revert')
    expect(lastPhase(phases, 'refund')).toBeUndefined()
  })

  it('SC1-E-CURRENT: current submission error is displayed (positive control)', () => {
    const { lc, phases } = makeTestLifecycle()

    const ctx = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx)

    lc.dispatchError(HASH_A, 'current revert')

    const p = lastPhase(phases, 'contribute') as { phase: string; txHash: string; message: string } | undefined
    expect(p?.phase).toBe('error')
    expect(p?.txHash).toBe(HASH_A)
    expect(p?.message).toBe('current revert')
  })

  it('SC1-E-RETRY: after dispatchError, dispatchRetry re-runs validation (positive control)', async () => {
    stubFetchMap(new Map([[HASH_A, validReceiptFor(ACCOUNT_A)]]))
    const { lc, phases, successes } = makeTestLifecycle()

    const ctx = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx)

    // Deliver error first
    lc.dispatchError(HASH_A, 'temp revert')
    expect(lastPhase(phases, 'contribute')?.phase).toBe('error')
    expect(successes).toHaveLength(0)

    // Retry via dispatch — should confirm
    lc.dispatchRetry(HASH_A)
    await waitFor(() => successes.length > 0)
    expect(successes).toEqual([HASH_A])
  })

  it('SC1-E-UNKNOWN: dispatchError for unregistered hash is ignored', () => {
    const { lc, phases } = makeTestLifecycle()
    lc.beginSubmission(baseSnap)

    lc.dispatchError(HASH_D, 'phantom error')
    expect(lastPhase(phases, 'contribute')).toBeUndefined()
  })

  it('SC1-E-STRUCT: Pool.tsx wait-error effects call lifecycle.dispatchError (not setPhase)', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    // Must call dispatchError, not inline setPhase for wait errors
    expect(src).toContain('lifecycle.dispatchError(')
    // Must NOT contain inline setPhase calls for wait-hook error paths
    // (the old RC3 pattern was: setPhase('contribute', { phase: 'error' ...}) inside the wait-error effect)
    expect(src).not.toMatch(/contribWaitError[\s\S]{0,200}setPhase\('contribute'/)
    expect(src).not.toMatch(/payoutWaitError[\s\S]{0,200}setPhase\('payout'/)
    expect(src).not.toMatch(/refundWaitError[\s\S]{0,200}setPhase\('refund'/)
  })

})

// ─── SC1 — post-unmount and post-new-submission (preserved) ────────────────────

describe('SC1 — post-unmount and post-new-submission rejection', () => {

  it('SC1-POST-UNMOUNT: onReplaced callback after clear() is rejected before fetch', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { lc } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx)

    lc.clear()

    // Deliver old repriced event via component-path stable dispatch
    lc.dispatchOnReplaced({ reason: 'repriced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })
    await new Promise(r => setTimeout(r, 30))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('SC1-POST-NEWSUB: same result via direct makeOnReplaced (direct-module control)', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { lc } = makeTestLifecycle()
    const ctx1 = lc.beginSubmission(baseSnap)
    const handler = lc.makeOnReplaced(ctx1)

    // New submission advances epoch
    lc.beginSubmission(baseSnap)

    handler({ reason: 'repriced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })
    await new Promise(r => setTimeout(r, 30))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('SC1-POST-UNMOUNT-SUCCESS: RPC resolves after clear(); onSuccess not called', async () => {
    let resolveFetch!: () => void
    vi.stubGlobal('fetch', vi.fn(async () => {
      await new Promise<void>(r => { resolveFetch = r })
      return { ok: true, json: async () => ({ result: validReceiptFor(ACCOUNT_A) }) } as Response
    }))
    const { lc, successes } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx)

    lc.dispatchSuccess(HASH_A)
    await waitFor(() => /* checking started */ true)
    await new Promise(r => setTimeout(r, 5))

    lc.clear()
    resolveFetch()
    await new Promise(r => setTimeout(r, 30))

    expect(successes).toHaveLength(0)
  })

})

// ─── RL2 — cancelled/replaced phases carry minedHash ──────────────────────────

describe('RL2 — cancelled/replaced phases carry minedHash', () => {

  it('RL2-CANCEL: cancelled phase carries originalHash and minedHash', () => {
    const { lc, phases } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx)

    lc.dispatchOnReplaced({ reason: 'cancelled', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })

    const p = lastPhase(phases, 'contribute') as { phase: string; minedHash?: string; originalHash?: string }
    expect(p?.phase).toBe('cancelled')
    expect(p?.minedHash).toBe(HASH_B)
    expect(p?.originalHash).toBe(HASH_A)
  })

  it('RL2-REPLACED: replaced (non-repriced) carries txHash=A and minedHash=B', () => {
    const { lc, phases } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)
    lc.registerHash(HASH_A, ctx)

    lc.dispatchOnReplaced({ reason: 'replaced', replacedTransaction: { hash: HASH_A }, transaction: { hash: HASH_B } })

    const p = lastPhase(phases, 'contribute') as { phase: string; txHash?: string; minedHash?: string }
    expect(p?.phase).toBe('replaced')
    expect(p?.txHash).toBe(HASH_A)
    expect(p?.minedHash).toBe(HASH_B)
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

// ─── RL3 — clear() invalidates in-flight validation ───────────────────────────

describe('RL3 — clear() on unmount invalidates in-flight validation', () => {

  it('RL3-UNMOUNT: onSuccess not called when RPC resolves after clear()', async () => {
    let resolveFetch!: () => void
    vi.stubGlobal('fetch', vi.fn(async () => {
      await new Promise<void>(r => { resolveFetch = r })
      return { ok: true, json: async () => ({ result: validReceiptFor(ACCOUNT_A) }) } as Response
    }))
    const { lc, successes } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)
    void lc.runReceiptValidation(HASH_A, ctx)
    await new Promise(r => setTimeout(r, 5))

    lc.clear()
    resolveFetch()
    await new Promise(r => setTimeout(r, 30))

    expect(successes).toHaveLength(0)
  })

  it('RL3-STRUCT: Pool.tsx useEffect cleanup calls lifecycle.clear()', async () => {
    const { default: src } = await import('../../pages/Pool.tsx?raw')
    expect(src).toContain('lifecycle.clear()')
    expect(src).toMatch(/return\s*\(\s*\)\s*=>\s*\{\s*lifecycle\.clear\(\s*\)/)
  })

  it('RL3-STRUCT: actionLifecycle.ts clear() advances epoch and resets activeSlot', async () => {
    const { default: src } = await import('../actionLifecycle?raw')
    expect(src).toContain('function clear()')
    expect(src).toContain('epoch++')
    expect(src).toContain('activeSlot = null')
  })

})

// ─── Account/pool/chain scope — wrong context rejected by validateReceipt ──────

describe('account/pool/chain scope — wrong context rejected by validateReceipt', () => {

  it('wrong account → replaced (not confirmed)', async () => {
    stubFetchMap(new Map([[HASH_A, validReceiptFor(ACCOUNT_C)]]))  // log has ACCOUNT_C, snap expects ACCOUNT_A
    const { lc, phases } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)  // snap.accountAddress = ACCOUNT_A
    void lc.runReceiptValidation(HASH_A, ctx)
    await waitFor(() => lastPhase(phases, 'contribute')?.phase === 'replaced')
    expect(lastPhase(phases, 'contribute')?.phase).toBe('replaced')
  })

  it('wrong pool → replaced (not confirmed)', async () => {
    const wrongPoolSnap = { ...baseSnap, poolId: '99' }
    stubFetchMap(new Map([[HASH_A, validReceiptFor(ACCOUNT_A)]]))  // log has pool 42, snap says 99
    const { lc, phases } = makeTestLifecycle()
    const ctx = lc.beginSubmission(wrongPoolSnap)
    void lc.runReceiptValidation(HASH_A, ctx)
    await waitFor(() => lastPhase(phases, 'contribute')?.phase === 'replaced')
    expect(lastPhase(phases, 'contribute')?.phase).toBe('replaced')
  })

  it('wrong amount → replaced (not confirmed)', async () => {
    const wrongAmountSnap = { ...baseSnap, amount: AMOUNT * 2n }
    stubFetchMap(new Map([[HASH_A, validReceiptFor(ACCOUNT_A, AMOUNT)]]))  // log has AMOUNT, snap says 2*AMOUNT
    const { lc, phases } = makeTestLifecycle()
    const ctx = lc.beginSubmission(wrongAmountSnap)
    void lc.runReceiptValidation(HASH_A, ctx)
    await waitFor(() => lastPhase(phases, 'contribute')?.phase === 'replaced')
    expect(lastPhase(phases, 'contribute')?.phase).toBe('replaced')
  })

})

// ─── Retry — transient error allows retry ──────────────────────────────────────

describe('Accepted: transient HTTP error allows retry within same submission', () => {

  it('error does not mark notifiedSet — direct retry with runReceiptValidation succeeds', async () => {
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      callCount++
      if (callCount === 1) return { ok: false, status: 500, json: async () => ({}) } as Response
      return { ok: true, json: async () => ({ result: validReceiptFor(ACCOUNT_A) }) } as Response
    }))
    const { lc, phases, successes } = makeTestLifecycle()
    const ctx = lc.beginSubmission(baseSnap)

    void lc.runReceiptValidation(HASH_A, ctx)
    await waitFor(() => lastPhase(phases, 'contribute')?.phase === 'error')
    expect(successes).toHaveLength(0)

    // Direct retry — same ctx, same hash
    void lc.runReceiptValidation(HASH_A, ctx)
    await waitFor(() => successes.length > 0)
    expect(successes).toEqual([HASH_A])
  })

})
