/**
 * poolQueryState.ts — shared PF1 pool-existence classifier.
 *
 * Used by Pool.tsx and Proof.tsx to decide whether a failed/missing getPool
 * result represents:
 *   (a) a confirmed absent pool (not-found)
 *   (b) a retryable transport / network failure
 *   (c) a still-loading / paused / waiting state
 *
 * Rules (PF1-A through PF1-D):
 *   A. Successful pool data always wins over any stale count evidence — a loaded
 *      pool is never classified as absent because of a separately cached count.
 *   B. Count evidence must be currently successful: retained data from a failed
 *      refetch is NOT current absence evidence.  We accept count as "fresh" only
 *      when its query has data AND is not currently in an error state.
 *   C. When count is unavailable we attempt to decode the InvalidPoolId revert
 *      from the viem/wagmi error cause chain.  Only InvalidPoolId specifically
 *      triggers absence; any other revert or transport error remains retryable.
 *   D. A query that is pending but paused (offline) returns a 'waiting' kind so
 *      the page can show a waiting/offline state rather than falsely showing not-found.
 */

/** The four mutually exclusive outcome kinds. */
export type PoolQueryKind =
  | 'content'   // pool data is present — render it
  | 'not-found' // pool is confirmed absent
  | 'network'   // retryable transport/RPC error
  | 'loading'   // still loading or paused — show spinner/offline state
  | 'invalid'   // malformed / zero / overflow ID — show invalid-ID message

/**
 * Traverse a viem/wagmi error's cause chain looking for an InvalidPoolId
 * custom revert.  The viem error chain is typically:
 *   ContractFunctionExecutionError
 *     .cause = ContractFunctionRevertedError
 *       .data = { errorName: 'InvalidPoolId', ... }
 * wagmi may also surface the error one level up or wrapped differently, so we
 * walk up to 4 levels of .cause and check both .errorName (synthetic marker
 * compatible with the probe instrument) and .data.errorName (real viem shape).
 */
function isInvalidPoolIdError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  let e: Record<string, unknown> = error as Record<string, unknown>
  for (let depth = 0; depth < 5; depth++) {
    // Direct errorName on the error object (probe synthetic marker)
    if (typeof e.errorName === 'string' && e.errorName === 'InvalidPoolId') return true
    // ContractFunctionRevertedError stores decoded data at .data.errorName
    if (
      e.data &&
      typeof e.data === 'object' &&
      (e.data as Record<string, unknown>).errorName === 'InvalidPoolId'
    ) return true
    // Walk into .cause
    if (e.cause && typeof e.cause === 'object') {
      e = e.cause as Record<string, unknown>
    } else {
      break
    }
  }
  return false
}

/**
 * Inputs describing the current state of the three relevant wagmi query results.
 * All fields are optional so callers only need to pass what useReadContract exposes.
 */
export interface PoolQueryInputs {
  /** Pool data returned by getPool, if any. */
  poolData: unknown | undefined
  /** Whether the getPool query is currently loading (isPending && isFetching in TanStack). */
  poolIsLoading: boolean
  /** Whether the getPool query is in an error state. */
  poolIsError: boolean
  /** The error object from the getPool query, if any. */
  poolError: unknown
  /**
   * fetchStatus of the getPool query.  'paused' means the query is pending but
   * TanStack has not issued the fetch yet (e.g. offline).  When not provided,
   * treated as 'fetching' (normal).
   */
  poolFetchStatus?: 'fetching' | 'paused' | 'idle'

  /** Cached count data, if any. */
  countData: bigint | undefined
  /** Whether the count query is currently in an error state. */
  countIsError: boolean
  /**
   * fetchStatus of the count query.  'paused' means offline/pending.
   * When not provided, treated as 'fetching' (normal).
   */
  countFetchStatus?: 'fetching' | 'paused' | 'idle'

  /** The pool ID being viewed (parsed from URL). */
  poolIdBig: bigint | null
}

/**
 * Classify the current pool query state into one of the five outcome kinds.
 *
 * This is the single production classifier used by both Pool and Proof pages.
 * Tests import and exercise it directly so they exercise the same code path.
 */
export function classifyPoolQuery(inputs: PoolQueryInputs): PoolQueryKind {
  const {
    poolData, poolIsLoading, poolIsError, poolError,
    poolFetchStatus = 'fetching',
    countData, countIsError,
    countFetchStatus = 'fetching',
    poolIdBig,
  } = inputs

  // Invalid ID: malformed, zero, or above uint256 max (already rejected by enabled guard).
  // Callers should return 'invalid' before calling this, but handle it defensively.
  if (poolIdBig === null || poolIdBig === 0n) return 'invalid'

  // PF1-A: successful pool data always wins — never classify a loaded pool as absent.
  if (poolData !== undefined && poolData !== null) return 'content'

  // PF1-D: paused/offline queries (not yet fetched) are waiting, not absent.
  // TanStack sets fetchStatus='paused' when the query is pending but offline.
  if (poolFetchStatus === 'paused') return 'loading'
  if (!poolIsLoading && !poolIsError && !poolData) {
    // If count is also paused, we're waiting for both.
    if (countFetchStatus === 'paused') return 'loading'
  }

  // PF1-C: attempt to identify InvalidPoolId revert even without count evidence.
  if (poolIsError && isInvalidPoolIdError(poolError)) {
    // Confirmed absence via decoded revert — this is not-found regardless of count.
    return 'not-found'
  }

  // PF1-B (PFI2): count is authoritative absence evidence only when it has data AND
  // the most recent fetch completed successfully — i.e. the count query is not currently
  // in an error state and is not currently fetching (refetching stale data).
  // TanStack Query can have status='success' with stale data while a background
  // refetch is in progress (fetchStatus='fetching').  Cached zero during a refetch
  // is not authoritative: the refetch may raise the count above the requested ID.
  // Do not simply reject every isStale=true result: default staleTime=0 makes a
  // just-completed fetch stale immediately after it finishes (fetchStatus='idle').
  // Accept count only when fetchStatus='idle' (fetch completed, not in progress).
  const countIsCurrentSuccess =
    countData !== undefined &&
    !countIsError &&
    countFetchStatus === 'idle'

  // PF1-A + PF1-B: ID above a currently successful count means absent.
  if (countIsCurrentSuccess && poolIdBig > countData!) {
    return 'not-found'
  }

  // Pool is in an error state with no absence evidence → retryable network error.
  if (poolIsError) return 'network'

  // Pool is still loading (normal initial fetch).
  if (poolIsLoading) return 'loading'

  // No data, no error, not loading: TanStack query may be idle/disabled or pending
  // without paused fetchStatus.  Treat as still loading.
  return 'loading'
}
