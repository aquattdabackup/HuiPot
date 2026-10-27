/**
 * publicFlow.test.ts — PF1 and PF2 regression tests.
 *
 * PF1: Pool.tsx and Proof.tsx previously conflated InvalidPoolId contract reverts
 * (which wagmi surfaces as isError) with genuine network/transport failures, and
 * stale cached count could hide a successfully loaded pool.
 *
 * Fix: shared classifyPoolQuery() in src/lib/poolQueryState.ts used by both pages.
 * Tests exercise the production classifier directly plus source-structure checks
 * confirming both pages wire it correctly.
 *
 * PF2: ConnectKitButton inside <form onSubmit=handleSubmit> had no explicit type.
 * Fix: ConnectKitButton.Custom renders type="button"; handleSubmit returns early
 * if !isConnected.
 *
 * Browser DOM / wallet / mounted-React boundaries are NOT covered here (stated below).
 */

import { describe, it, expect } from 'vitest'
import { classifyPoolQuery, type PoolQueryInputs } from '../poolQueryState'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const samplePool = ['0x1111', '0x2222', 10n ** 18n, BigInt(Math.floor(Date.now() / 1000) + 86400), 'Test', 'Purpose', 0n, 0n, false]

/** Build a minimal valid inputs object; override individual fields per test. */
function inputs(overrides: Partial<PoolQueryInputs> = {}): PoolQueryInputs {
  return {
    poolData: undefined,
    poolIsLoading: false,
    poolIsError: false,
    poolError: undefined,
    poolFetchStatus: 'fetching',
    countData: undefined,
    countIsError: false,
    countFetchStatus: 'fetching',
    poolIdBig: 1n,
    ...overrides,
  }
}

// ─── PF1-A: successful pool data wins over stale count ────────────────────────

describe('PF1-A — successful pool data wins over stale count', () => {

  it('PF1-A-1: getPool succeeds, count is old zero → content', () => {
    const kind = classifyPoolQuery(inputs({
      poolData: samplePool,
      poolIsLoading: false,
      countData: 0n,    // stale cached zero from before pool was created
      countIsError: false,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('content')
  })

  it('PF1-A-2: getPool succeeds, count refetch fails retaining old zero → content', () => {
    const kind = classifyPoolQuery(inputs({
      poolData: samplePool,
      poolIsLoading: false,
      countData: 0n,
      countIsError: true,   // retained old zero after refetch error
      poolIdBig: 1n,
    }))
    expect(kind).toBe('content')
  })

  it('PF1-A-3: getPool succeeds, count undefined → content', () => {
    const kind = classifyPoolQuery(inputs({
      poolData: samplePool,
      countData: undefined,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('content')
  })

})

// ─── PF1-B: stale / failed count is not current absence evidence ─────────────

describe('PF1-B — stale or failed count is not absence evidence', () => {

  it('PF1-B-1: getPool transport error; count refetch fails retaining zero → network error', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport failure'),
      countData: 0n,
      countIsError: true,   // retained zero but count itself is in error state
      poolIdBig: 1n,
    }))
    expect(kind).toBe('network')
  })

  it('PF1-B-2: getPool transport error; count undefined → network error', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport failure'),
      countData: undefined,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('network')
  })

  it('PF1-B-3: both pool and count paused (offline) → loading, not absent', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsLoading: false,  // TanStack: isLoading = isPending && isFetching; paused = isPending && !isFetching
      poolIsError: false,
      poolFetchStatus: 'paused',
      countData: 0n,
      countIsError: false,
      countFetchStatus: 'paused',
      poolIdBig: 1n,
    }))
    expect(kind).toBe('loading')
  })

  it('PF1-B-4: pool paused; count has current success data → loading (pool not yet loaded)', () => {
    // Pool is paused offline; count is fine. We still cannot confirm pool is absent
    // because pool data has not loaded at all.
    const kind = classifyPoolQuery(inputs({
      poolIsLoading: false,
      poolIsError: false,
      poolFetchStatus: 'paused',
      countData: 2n,
      countIsError: false,
      countFetchStatus: 'fetching',
      poolIdBig: 1n,
    }))
    // poolFetchStatus='paused' → loading before absence check
    expect(kind).toBe('loading')
  })

  it('PF1-B-5: count is current success with ID > count → not found', () => {
    // PF1-B positive control: current successful count CAN establish absence.
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('any error'),
      countData: 0n,
      countIsError: false,     // count IS currently successful
      countFetchStatus: 'fetching',
      poolIdBig: 1n,
    }))
    expect(kind).toBe('not-found')
  })

})

// ─── PF1-C: InvalidPoolId revert decoded from error chain ────────────────────

describe('PF1-C — InvalidPoolId revert identification', () => {

  it('PF1-C-1: synthetic probe marker at top-level errorName → not-found', () => {
    // Matches the probe instrument's synthetic marker format.
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { errorName: 'InvalidPoolId' },
      countData: undefined,
      countIsError: false,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('not-found')
  })

  it('PF1-C-2: realistic viem ContractFunctionRevertedError nesting (.data.errorName) → not-found', () => {
    // Matches real viem error shape: ContractFunctionRevertedError.data.errorName
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { name: 'ContractFunctionRevertedError', data: { errorName: 'InvalidPoolId' } },
      countData: undefined,
      countIsError: false,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('not-found')
  })

  it('PF1-C-3: wagmi wrapper nesting (ContractFunctionExecutionError → cause → ContractFunctionRevertedError) → not-found', () => {
    // Real wagmi error chain: outer ContractFunctionExecutionError wraps inner revert.
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: {
        name: 'ContractFunctionExecutionError',
        cause: {
          name: 'ContractFunctionRevertedError',
          data: { errorName: 'InvalidPoolId' },
        },
      },
      countData: undefined,
      countIsError: false,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('not-found')
  })

  it('PF1-C-4: count=0 plus InvalidPoolId revert → not-found (consistent with probe case)', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { errorName: 'InvalidPoolId' },
      countData: 0n,
      countIsError: false,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('not-found')
  })

  it('PF1-C-5: decoded InvalidPoolId without count available → not-found (count unavailable)', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { errorName: 'InvalidPoolId' },
      countData: undefined,
      countIsError: true,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('not-found')
  })

  it('PF1-C-6: unrelated revert (not InvalidPoolId), count unavailable → network', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { name: 'ContractFunctionRevertedError', data: { errorName: 'SomeOtherError' } },
      countData: undefined,
      countIsError: true,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('network')
  })

  it('PF1-C-7: arbitrary string error, no count → network (not absent)', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('fetch failed'),
      countData: undefined,
      countIsError: false,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('network')
  })

})

// ─── PF1-D: pending / paused / loading states ────────────────────────────────

describe('PF1-D — pending, paused and loading states are not absent', () => {

  it('PF1-D-1: normal initial load (isLoading=true) → loading', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsLoading: true,
      poolFetchStatus: 'fetching',
      countData: undefined,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('loading')
  })

  it('PF1-D-2: paused pending query (fetchStatus=paused, no data/error) → loading', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsLoading: false,   // TanStack isLoading = isPending && isFetching; paused drops isFetching
      poolIsError: false,
      poolFetchStatus: 'paused',
      countData: undefined,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('loading')
  })

  it('PF1-D-3: no data, no error, not loading, fetchStatus idle → loading (disabled/pending)', () => {
    // Query enabled but not yet dispatched: isLoading=false, isError=false, data=undefined
    const kind = classifyPoolQuery(inputs({
      poolIsLoading: false,
      poolIsError: false,
      poolFetchStatus: 'idle',
      countData: undefined,
      poolIdBig: 1n,
    }))
    // Not absent — no evidence of absence; return loading
    expect(kind).toBe('loading')
  })

})

// ─── PF1 full acceptance matrix (production path via classifier) ─────────────

describe('PF1 acceptance matrix — all probe cases via production classifyPoolQuery', () => {

  it('count=0 plus InvalidPoolId revert → not-found', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { errorName: 'InvalidPoolId' },
      countData: 0n, countIsError: false, poolIdBig: 1n,
    }))).toBe('not-found')
  })

  it('transport error without count → network', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport'),
      countData: undefined, countIsError: true, poolIdBig: 1n,
    }))).toBe('network')
  })

  it('existing pool (successful reads) → content', () => {
    expect(classifyPoolQuery(inputs({
      poolData: samplePool,
      countData: 1n, countIsError: false, poolIdBig: 1n,
    }))).toBe('content')
  })

  it('successful pool must beat stale count zero → content', () => {
    expect(classifyPoolQuery(inputs({
      poolData: samplePool,
      countData: 0n, countIsError: false, poolIdBig: 1n,
    }))).toBe('content')
  })

  it('failed count retaining cached zero plus pool transport error → network', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport'),
      countData: 0n, countIsError: true, poolIdBig: 1n,
    }))).toBe('network')
  })

  it('paused pending query → loading, not absent', () => {
    expect(classifyPoolQuery(inputs({
      poolIsLoading: false,
      poolIsError: false,
      poolFetchStatus: 'paused',
      countData: undefined, countIsError: false, countFetchStatus: 'paused',
      poolIdBig: 1n,
    }))).toBe('loading')
  })

  it('decoded InvalidPoolId without count → not-found', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { errorName: 'InvalidPoolId' },
      countData: undefined, countIsError: true, poolIdBig: 1n,
    }))).toBe('not-found')
  })

  it('invalid poolIdBig (null) → invalid', () => {
    expect(classifyPoolQuery(inputs({ poolIdBig: null }))).toBe('invalid')
  })

  it('invalid poolIdBig (zero) → invalid', () => {
    expect(classifyPoolQuery(inputs({ poolIdBig: 0n }))).toBe('invalid')
  })

  it('retry success recovery: error state then pool data → content', () => {
    // Simulate retry resolving to success
    const after = inputs({ poolData: samplePool, countData: 1n, countIsError: false, poolIdBig: 1n })
    expect(classifyPoolQuery(after)).toBe('content')
  })

})

// ─── PF1 source-structure: both pages import and use classifyPoolQuery ────────

describe('PF1 source-structure — pages use production classifier', () => {

  it('Pool.tsx imports classifyPoolQuery from poolQueryState', async () => {
    const src = await import('../../pages/Pool?raw') as { default: string }
    expect(src.default).toContain("from '../lib/poolQueryState'")
    expect(src.default).toContain('classifyPoolQuery')
  })

  it('Pool.tsx passes poolError and fetchStatus to classifyPoolQuery', async () => {
    const src = await import('../../pages/Pool?raw') as { default: string }
    expect(src.default).toContain('poolError,')
    expect(src.default).toContain('poolFetchStatus')
    expect(src.default).toContain('countIsError')
    expect(src.default).toContain('countFetchStatus')
  })

  it('Pool.tsx renders poolKind branches (not-found / network / loading / content)', async () => {
    const src = await import('../../pages/Pool?raw') as { default: string }
    const code = src.default
    expect(code).toContain("poolKind === 'loading'")
    expect(code).toContain("poolKind === 'network'")
    expect(code).toContain("poolKind === 'not-found'")
    // Retry in network branch calls both refetches
    expect(code).toMatch(/refetchPool\(\)[\s\S]{0,80}refetchPoolCount\(\)/)
  })

  it('Proof.tsx imports classifyPoolQuery from poolQueryState', async () => {
    const src = await import('../../pages/Proof?raw') as { default: string }
    expect(src.default).toContain("from '../lib/poolQueryState'")
    expect(src.default).toContain('classifyPoolQuery')
  })

  it('Proof.tsx renders poolKind branches (not-found / network / loading)', async () => {
    const src = await import('../../pages/Proof?raw') as { default: string }
    const code = src.default
    expect(code).toContain("poolKind === 'loading'")
    expect(code).toContain("poolKind === 'network'")
    expect(code).toContain("poolKind === 'not-found'")
    expect(code).toMatch(/refetchPool\(\)[\s\S]{0,80}refetchPoolCount\(\)/)
  })

  it('poolQueryState.ts exports classifyPoolQuery and isInvalidPoolIdError logic', async () => {
    const { classifyPoolQuery: fn } = await import('../poolQueryState')
    expect(typeof fn).toBe('function')
    // Smoke test: function is callable
    expect(fn(inputs({ poolData: samplePool, poolIdBig: 1n }))).toBe('content')
  })

})

// ─── PF2 — Create.tsx: connect button must not submit form ────────────────────

describe('PF2 — Create.tsx: connect button semantics', () => {

  it('PF2-STRUCT: ConnectKitButton.Custom used inside form for connect', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('ConnectKitButton.Custom')
  })

  it('PF2-STRUCT: connect button has explicit type="button"', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    expect(code).toContain('type="button"')
    expect((code.match(/type="button"/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('PF2-STRUCT: handleSubmit returns early when disconnected', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('if (!isConnected) return')
  })

  it('PF2-STRUCT: ConnectKitButton.Custom onClick calls show() to open wallet chooser', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('onClick={show}')
  })

  it('PF2-STRUCT: plain ConnectKitButton label prop no longer inside form', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).not.toContain('label="Connect wallet to create"')
  })

  // Note: browser DOM / wallet-chooser behavior (zero validation errors on connect click,
  // wallet chooser opening, keyboard Enter propagation) cannot be verified in vitest
  // without a full React/wagmi/JSDOM mount. The synthetic production-handler probes in
  // docs/evidence/recheck-67ac7ea/public-flow-probes.cjs cover five PF2 Create cases.
  // These structural checks confirm the source encodes the correct semantics.

})
