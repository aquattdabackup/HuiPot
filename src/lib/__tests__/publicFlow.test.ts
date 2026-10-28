/**
 * publicFlow.test.ts — PF1/PF2/PFI1/PFI2 regression tests.
 *
 * PFI1: HUIPOT_ABI now includes the InvalidPoolId error entry so viem can
 * decode the 0x0afa7ee8 revert selector to a named error.  Tests use real
 * installed viem (createPublicClient + custom transport returning the revert
 * bytes) with the actual application ABI to confirm end-to-end decoding.
 *
 * PFI2: classifyPoolQuery now requires countFetchStatus='idle' to accept count
 * as authoritative absence evidence.  A stale count whose refetch is still
 * in progress (fetchStatus='fetching') is not authoritative.  Tests cover the
 * TanStack transition states specified in the acceptance matrix.
 *
 * Prior PF1 (A-D) and PF2 tests are preserved with one fix: PF1-B-5's
 * positive-control fixture now uses countFetchStatus='idle' to match the
 * tighter PFI2 requirement; the semantics are unchanged (current successful
 * read establishes absence).
 *
 * Browser DOM / wallet / mounted-React boundaries are NOT covered here.
 */

import { describe, it, expect } from 'vitest'
import {
  createPublicClient,
  custom,
  RpcRequestError,
  encodeErrorResult,
} from 'viem'
import { classifyPoolQuery, type PoolQueryInputs } from '../poolQueryState'
import { HUIPOT_ABI } from '../../contract'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const samplePool = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  10n ** 18n,
  BigInt(Math.floor(Date.now() / 1000) + 86400),
  'Test',
  'Purpose',
  0n,
  0n,
  false,
]

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

/**
 * Build a real viem ContractFunctionExecutionError by calling readContract
 * against a deterministic local transport that returns the given revert bytes.
 */
async function viemErrorFromRevert(
  revertData: `0x${string}`,
  abi: typeof HUIPOT_ABI | unknown[],
): Promise<unknown> {
  const client = createPublicClient({
    transport: custom(
      {
        request: async () => {
          throw new RpcRequestError({
            body: { method: 'eth_call' },
            error: { code: 3, message: 'execution reverted', data: revertData },
            url: 'fixture://no-network',
          })
        },
      },
      { retryCount: 0 },
    ),
  })
  try {
    await client.readContract({
      address: '0x81a139599d252eb2dc2bbb6c267e911a21264288',
      abi: abi as typeof HUIPOT_ABI,
      functionName: 'getPool',
      args: [1n],
    })
    throw new Error('Unexpected success')
  } catch (err) {
    return err
  }
}

// ─── PFI1 — real viem ABI decoding ───────────────────────────────────────────

describe('PFI1 — real viem InvalidPoolId decoding through production ABI', () => {

  it('PFI1-ABI: HUIPOT_ABI now includes the InvalidPoolId error entry', () => {
    const entry = (HUIPOT_ABI as readonly { type: string; name: string }[]).find(
      (x) => x.type === 'error' && x.name === 'InvalidPoolId',
    )
    expect(entry).toBeDefined()
    expect(entry?.name).toBe('InvalidPoolId')
  })

  it('PFI1-DECODE: real viem readContract with production ABI + InvalidPoolId revert → not-found', async () => {
    // Encode InvalidPoolId() using the Foundry artifact's error ABI entry.
    // This is the canonical 4-byte selector 0x0afa7ee8.
    const errorEntry = (HUIPOT_ABI as readonly { type: string; name: string }[]).find(
      (x) => x.type === 'error' && x.name === 'InvalidPoolId',
    )!
    const revertData = encodeErrorResult({
      abi: [errorEntry] as Parameters<typeof encodeErrorResult>[0]['abi'],
      errorName: 'InvalidPoolId',
    })
    const error = await viemErrorFromRevert(revertData, HUIPOT_ABI)
    // With the error entry present, ContractFunctionRevertedError.data.errorName is populated.
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: error,
      countData: undefined,
      countIsError: true,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('not-found')
  })

  it('PFI1-UNRELATED: unrelated revert (not InvalidPoolId) with production ABI → network', async () => {
    // Simulate a revert with a 4-byte selector that is not in the ABI.
    const unknownRevert = '0xdeadbeef' as `0x${string}`
    const error = await viemErrorFromRevert(unknownRevert, HUIPOT_ABI)
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: error,
      countData: undefined,
      countIsError: true,
      poolIdBig: 1n,
    }))
    // Unknown selector → AbiErrorSignatureNotFoundError → no .data.errorName → network
    expect(kind).toBe('network')
  })

  it('PFI1-TRANSPORT: plain transport failure (no revert data) with production ABI → network', async () => {
    const error = new Error('Failed to fetch')
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: error,
      countData: undefined,
      countIsError: false,
      poolIdBig: 1n,
    }))
    expect(kind).toBe('network')
  })

})

// ─── PFI2 — stale count during refetch ───────────────────────────────────────

describe('PFI2 — stale count during refetch is not authoritative absence', () => {

  it('PFI2-1: cached count=0 refetching (fetchStatus=fetching); pool pending → loading', () => {
    // This is the core PFI2 case: count.data=0, count is NOT errored, but its
    // fetchStatus='fetching' means a background refetch is in progress.
    // The refetch may return count=1+, so we cannot treat zero as authoritative.
    const kind = classifyPoolQuery(inputs({
      poolIsError: false,
      poolIsLoading: true,
      poolFetchStatus: 'fetching',
      countData: 0n,
      countIsError: false,
      countFetchStatus: 'fetching',  // in-flight refetch
      poolIdBig: 1n,
    }))
    expect(kind).toBe('loading')
  })

  it('PFI2-2: cached count=0 refetching; pool transport error → network (not not-found)', () => {
    // Pool errored; count is still being refetched. Cannot conclude absence.
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport'),
      poolFetchStatus: 'idle',
      countData: 0n,
      countIsError: false,
      countFetchStatus: 'fetching',  // still refetching
      poolIdBig: 1n,
    }))
    expect(kind).toBe('network')
  })

  it('PFI2-3: count refetch fails retaining zero; pool transport error → network', () => {
    // Retained zero after error: countIsError=true, so not authoritative regardless.
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport'),
      countData: 0n,
      countIsError: true,
      countFetchStatus: 'idle',
      poolIdBig: 1n,
    }))
    expect(kind).toBe('network')
  })

  it('PFI2-4: pool succeeds while count is still old/refetching → content', () => {
    // PF1-A rule: successful pool data always wins.
    const kind = classifyPoolQuery(inputs({
      poolData: samplePool,
      countData: 0n,
      countIsError: false,
      countFetchStatus: 'fetching',
      poolIdBig: 1n,
    }))
    expect(kind).toBe('content')
  })

  it('PFI2-5: count refetch completes (idle) with count >= ID; pool succeeds → content', () => {
    const kind = classifyPoolQuery(inputs({
      poolData: samplePool,
      countData: 1n,
      countIsError: false,
      countFetchStatus: 'idle',
      poolIdBig: 1n,
    }))
    expect(kind).toBe('content')
  })

  it('PFI2-6: count refetch completes (idle) with authoritative lower count; no pool → not-found', () => {
    // Count finished at 0 (idle), no pool data → genuinely absent.
    const kind = classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport'),
      countData: 0n,
      countIsError: false,
      countFetchStatus: 'idle',   // completed, authoritative
      poolIdBig: 1n,
    }))
    expect(kind).toBe('not-found')
  })

  it('PFI2-7: repeated refetch after content loaded → content remains', () => {
    // Simulate next-render where pool data is still present.
    const kind = classifyPoolQuery(inputs({
      poolData: samplePool,
      countData: 1n,
      countIsError: false,
      countFetchStatus: 'fetching',  // background refetch, irrelevant
      poolIdBig: 1n,
    }))
    expect(kind).toBe('content')
  })

  it('PFI2-8: pending/paused initial queries without evidence → loading', () => {
    const kind = classifyPoolQuery(inputs({
      poolIsLoading: false,
      poolIsError: false,
      poolFetchStatus: 'paused',
      countData: undefined,
      countIsError: false,
      countFetchStatus: 'paused',
      poolIdBig: 1n,
    }))
    expect(kind).toBe('loading')
  })

})

// ─── PF1-A: successful pool data wins over stale count ────────────────────────

describe('PF1-A — successful pool data wins over stale count', () => {

  it('PF1-A-1: getPool succeeds, count is old zero → content', () => {
    expect(classifyPoolQuery(inputs({
      poolData: samplePool,
      poolIsLoading: false,
      countData: 0n,
      countIsError: false,
      poolIdBig: 1n,
    }))).toBe('content')
  })

  it('PF1-A-2: getPool succeeds, count refetch fails retaining old zero → content', () => {
    expect(classifyPoolQuery(inputs({
      poolData: samplePool,
      poolIsLoading: false,
      countData: 0n,
      countIsError: true,
      poolIdBig: 1n,
    }))).toBe('content')
  })

  it('PF1-A-3: getPool succeeds, count undefined → content', () => {
    expect(classifyPoolQuery(inputs({
      poolData: samplePool,
      countData: undefined,
      poolIdBig: 1n,
    }))).toBe('content')
  })

})

// ─── PF1-B: stale / failed count is not current absence evidence ─────────────

describe('PF1-B — stale or failed count is not absence evidence', () => {

  it('PF1-B-1: getPool transport error; count refetch fails retaining zero → network error', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport failure'),
      countData: 0n,
      countIsError: true,
      poolIdBig: 1n,
    }))).toBe('network')
  })

  it('PF1-B-2: getPool transport error; count undefined → network error', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('transport failure'),
      countData: undefined,
      poolIdBig: 1n,
    }))).toBe('network')
  })

  it('PF1-B-3: both pool and count paused (offline) → loading, not absent', () => {
    expect(classifyPoolQuery(inputs({
      poolIsLoading: false,
      poolIsError: false,
      poolFetchStatus: 'paused',
      countData: 0n,
      countIsError: false,
      countFetchStatus: 'paused',
      poolIdBig: 1n,
    }))).toBe('loading')
  })

  it('PF1-B-4: pool paused; count has data → loading (pool not yet loaded)', () => {
    expect(classifyPoolQuery(inputs({
      poolIsLoading: false,
      poolIsError: false,
      poolFetchStatus: 'paused',
      countData: 2n,
      countIsError: false,
      countFetchStatus: 'idle',
      poolIdBig: 1n,
    }))).toBe('loading')
  })

  it('PF1-B-5: count is authoritative (idle) with ID > count → not found', () => {
    // Positive control: completed, non-errored count CAN establish absence.
    // Uses countFetchStatus='idle' (authoritative completed read per PFI2 requirement).
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('any error'),
      countData: 0n,
      countIsError: false,
      countFetchStatus: 'idle',   // completed read — authoritative
      poolIdBig: 1n,
    }))).toBe('not-found')
  })

})

// ─── PF1-C: InvalidPoolId revert decoded from error chain ────────────────────

describe('PF1-C — InvalidPoolId revert identification', () => {

  it('PF1-C-1: synthetic probe marker at top-level errorName → not-found', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { errorName: 'InvalidPoolId' },
      countData: undefined,
      countIsError: false,
      poolIdBig: 1n,
    }))).toBe('not-found')
  })

  it('PF1-C-2: ContractFunctionRevertedError .data.errorName → not-found', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { name: 'ContractFunctionRevertedError', data: { errorName: 'InvalidPoolId' } },
      countData: undefined,
      countIsError: false,
      poolIdBig: 1n,
    }))).toBe('not-found')
  })

  it('PF1-C-3: wagmi wrapper nesting (ExecutionError → cause → RevertedError) → not-found', () => {
    expect(classifyPoolQuery(inputs({
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
    }))).toBe('not-found')
  })

  it('PF1-C-4: count=0 plus InvalidPoolId revert → not-found', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { errorName: 'InvalidPoolId' },
      countData: 0n,
      countIsError: false,
      poolIdBig: 1n,
    }))).toBe('not-found')
  })

  it('PF1-C-5: decoded InvalidPoolId without count available → not-found', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { errorName: 'InvalidPoolId' },
      countData: undefined,
      countIsError: true,
      poolIdBig: 1n,
    }))).toBe('not-found')
  })

  it('PF1-C-6: unrelated revert (not InvalidPoolId), count unavailable → network', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: { name: 'ContractFunctionRevertedError', data: { errorName: 'SomeOtherError' } },
      countData: undefined,
      countIsError: true,
      poolIdBig: 1n,
    }))).toBe('network')
  })

  it('PF1-C-7: arbitrary string error, no count → network', () => {
    expect(classifyPoolQuery(inputs({
      poolIsError: true,
      poolError: new Error('fetch failed'),
      countData: undefined,
      countIsError: false,
      poolIdBig: 1n,
    }))).toBe('network')
  })

})

// ─── PF1-D: pending / paused / loading states ────────────────────────────────

describe('PF1-D — pending, paused and loading states are not absent', () => {

  it('PF1-D-1: normal initial load (isLoading=true) → loading', () => {
    expect(classifyPoolQuery(inputs({
      poolIsLoading: true,
      poolFetchStatus: 'fetching',
      countData: undefined,
      poolIdBig: 1n,
    }))).toBe('loading')
  })

  it('PF1-D-2: paused pending query (fetchStatus=paused) → loading', () => {
    expect(classifyPoolQuery(inputs({
      poolIsLoading: false,
      poolIsError: false,
      poolFetchStatus: 'paused',
      countData: undefined,
      poolIdBig: 1n,
    }))).toBe('loading')
  })

  it('PF1-D-3: no data, no error, not loading, fetchStatus idle → loading', () => {
    expect(classifyPoolQuery(inputs({
      poolIsLoading: false,
      poolIsError: false,
      poolFetchStatus: 'idle',
      countData: undefined,
      poolIdBig: 1n,
    }))).toBe('loading')
  })

})

// ─── PF1 full acceptance matrix ──────────────────────────────────────────────

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
    expect(classifyPoolQuery(inputs({
      poolData: samplePool,
      countData: 1n, countIsError: false, poolIdBig: 1n,
    }))).toBe('content')
  })

})

// ─── PF1 source-structure ────────────────────────────────────────────────────

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

  it('poolQueryState.ts exports classifyPoolQuery (smoke test)', async () => {
    const { classifyPoolQuery: fn } = await import('../poolQueryState')
    expect(typeof fn).toBe('function')
    expect(fn(inputs({ poolData: samplePool, poolIdBig: 1n }))).toBe('content')
  })

  it('contract.ts includes InvalidPoolId error entry (PFI1)', async () => {
    const src = await import('../../contract?raw') as { default: string }
    expect(src.default).toContain("name: 'InvalidPoolId'")
    expect(src.default).toContain("type: 'error'")
  })

  it('poolQueryState.ts uses countFetchStatus === \'idle\' for authoritative count (PFI2)', async () => {
    const src = await import('../poolQueryState?raw') as { default: string }
    expect(src.default).toContain("countFetchStatus === 'idle'")
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

})
