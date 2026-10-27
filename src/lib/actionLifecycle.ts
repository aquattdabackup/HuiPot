/**
 * actionLifecycle.ts — submission-bound lifecycle logic for Pool action validation.
 *
 * Extracted from ActionPanel for direct unit-testability without React.
 *
 * SC1 fix (original): beginSubmission() returns an immutable SubmissionContext.
 * makeOnReplaced(ctx) closes over ctx.submissionId; first line rejects stale epoch.
 * Post-unmount and post-new-submission callbacks from late delivery are rejected.
 *
 * SC1-D fix (this revision): stable wrappers in Pool.tsx previously dispatched by
 * reading the *current* per-action handler ref, not the handler for the original hash.
 * After a second same-action submission, the stable wrapper would route an old event
 * to the new handler — bypassing the epoch check because the new handler's epoch matches.
 *
 * Fix: hash-keyed dispatch. Each confirmed hash is registered with its immutable context
 * via registerHash(). The three stable dispatch methods (dispatchOnReplaced,
 * dispatchSuccess, dispatchRetry) route by hash, not by action name. An unregistered
 * or stale hash is silently ignored before any RPC or state change.
 */

import { validateReceipt, type ReceiptSnapshot } from './validateReceipt'

// Re-export for consumers that need the type
export type { ReceiptSnapshot }

export type ActionType = 'contribute' | 'payout' | 'refund'

/** Immutable context captured at confirmAction time. */
export interface SubmissionContext {
  submissionId: number
  snap: ReceiptSnapshot
}

/** Phase variants for a single action's receipt validation. */
export type ReceiptPhase =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'confirmed'; txHash: string; action: ActionType }
  | { phase: 'replaced'; txHash: string; minedHash?: string; note: string }
  | { phase: 'repriced'; originalHash: string; minedHash: string; note: string }
  | { phase: 'cancelled'; originalHash: string; minedHash?: string; note: string }
  | { phase: 'error'; txHash: string; message: string; retryable: true }

export interface OnReplacedArg {
  reason: 'repriced' | 'cancelled' | 'replaced'
  transaction: { hash: string }
  replacedTransaction: { hash: string }
}

export interface LifecycleCallbacks {
  setPhase: (action: ActionType, phase: ReceiptPhase) => void
  onSuccess: (txHash: string, action: ActionType) => void
}

export interface ActionLifecycle {
  /** Call at confirmAction time — returns the immutable context to pass to callbacks. */
  beginSubmission: (snap: ReceiptSnapshot) => SubmissionContext

  /**
   * Register the write hash once it becomes available (from wagmi data).
   * SC1-D: binds txHash → ctx so stable dispatch methods can route by hash.
   * Call after beginSubmission, once the hook's data property is set.
   */
  registerHash: (txHash: string, ctx: SubmissionContext) => void

  /** Call on component unmount — invalidates all active submissions. */
  clear: () => void

  /**
   * Run receipt validation for a txHash under a given context.
   * Internal slot-claiming and stale-check logic lives here.
   */
  runReceiptValidation: (txHash: string, ctx: SubmissionContext) => Promise<void>

  /**
   * SC1-D: stable dispatch — looks up the context registered for
   * r.replacedTransaction.hash and delegates. Called by the stable wrapper.
   * Silently ignores unknown or stale hashes.
   */
  dispatchOnReplaced: (r: OnReplacedArg) => void

  /**
   * SC1-D: stable dispatch — looks up the context registered for txHash
   * and calls runReceiptValidation. Called by useEffect on isSuccess.
   * Silently ignores unknown or stale hashes.
   */
  dispatchSuccess: (txHash: string) => void

  /**
   * SC1-D: stable dispatch for retry — same lookup as dispatchSuccess.
   * Called by the Retry button in ReceiptBanner.
   * Clears the notifiedSet entry for txHash so validation can re-run.
   */
  dispatchRetry: (txHash: string) => void

  /**
   * SC1-E: stable dispatch for wait-hook errors.
   * Looks up the context registered for txHash and checks epoch before
   * calling setPhase(error). Rejects stale hashes silently.
   * Called by Pool.tsx wait-error useEffects instead of setPhase directly.
   */
  dispatchError: (txHash: string, message: string) => void

  /**
   * Build onReplaced handler bound to a specific context.
   * Used internally by dispatchOnReplaced; also exported for direct-module tests.
   */
  makeOnReplaced: (ctx: SubmissionContext) => (r: OnReplacedArg) => void
}

export function makeActionLifecycle(
  rpcUrl: string,
  callbacks: LifecycleCallbacks,
): ActionLifecycle {
  // Epoch counter. Incremented on each beginSubmission and on clear().
  let epoch = 0

  // Tracks the current active validation slot per epoch.
  let activeSlot: { epoch: number; txHash: string } | null = null

  // notifiedSet: keyed by `${epoch}:${txHash}` — prevents duplicate onSuccess.
  const notifiedSet = new Set<string>()

  // SC1-D: hash → SubmissionContext. Populated by registerHash().
  // Stable dispatch methods use this to route events by hash identity.
  const hashToCtx = new Map<string, SubmissionContext>()

  function beginSubmission(snap: ReceiptSnapshot): SubmissionContext {
    epoch++
    activeSlot = null
    return { submissionId: epoch, snap }
  }

  function registerHash(txHash: string, ctx: SubmissionContext): void {
    // SC1-D: only register if the context is still current
    if (epoch !== ctx.submissionId) return
    hashToCtx.set(txHash, ctx)
  }

  function clear() {
    epoch++
    activeSlot = null
    hashToCtx.clear()
  }

  async function runReceiptValidation(txHash: string, ctx: SubmissionContext): Promise<void> {
    const { submissionId, snap } = ctx

    // SC1: reject immediately if context is stale (new submission or unmount)
    if (epoch !== submissionId) return

    const key = `${submissionId}:${txHash}`
    if (notifiedSet.has(key)) return

    // Claim active slot — invalidate any competing hash for the same submission
    const existing = activeSlot
    if (existing && existing.epoch === submissionId && existing.txHash !== txHash) {
      notifiedSet.add(`${submissionId}:${existing.txHash}`)
    }
    activeSlot = { epoch: submissionId, txHash }

    callbacks.setPhase(snap.action, { phase: 'checking' })

    const result = await validateReceipt(txHash, snap, rpcUrl)

    // Post-async stale checks
    if (epoch !== submissionId) return
    if (activeSlot?.txHash !== txHash) return
    if (notifiedSet.has(key)) return

    if (result.outcome === 'confirmed') {
      notifiedSet.add(key)
      callbacks.setPhase(snap.action, { phase: 'confirmed', txHash, action: snap.action })
      callbacks.onSuccess(txHash, snap.action)
    } else if (result.outcome === 'replaced') {
      notifiedSet.add(key)
      callbacks.setPhase(snap.action, { phase: 'replaced', txHash, note: result.note })
    } else {
      // error: NOT added to notifiedSet — retry is possible
      callbacks.setPhase(snap.action, {
        phase: 'error', txHash, message: result.note, retryable: true,
      })
    }
  }

  function makeOnReplaced(ctx: SubmissionContext): (r: OnReplacedArg) => void {
    const { submissionId, snap } = ctx

    return function onReplaced(r: OnReplacedArg) {
      // SC1: reject if context has been superseded
      if (epoch !== submissionId) return

      const originalHash = r.replacedTransaction.hash
      const minedHash = r.transaction.hash

      notifiedSet.add(`${submissionId}:${originalHash}`)

      if (r.reason === 'cancelled') {
        callbacks.setPhase(snap.action, {
          phase: 'cancelled',
          originalHash,
          minedHash,
          note: `Transaction was cancelled. Mined: ${minedHash.slice(0, 10)}…`,
        })
      } else if (r.reason === 'repriced') {
        // Register the replacement hash under the same context
        hashToCtx.set(minedHash, ctx)
        void runReceiptValidation(minedHash, ctx)
      } else {
        callbacks.setPhase(snap.action, {
          phase: 'replaced',
          txHash: originalHash,
          minedHash,
          note: `Transaction was replaced (${r.reason}). Mined: ${minedHash.slice(0, 10)}…`,
        })
      }
    }
  }

  // SC1-D: stable dispatch — routes by hash identity, not by current action ref
  function dispatchOnReplaced(r: OnReplacedArg): void {
    const originalHash = r.replacedTransaction.hash
    const ctx = hashToCtx.get(originalHash)
    if (!ctx) return  // unknown hash — not from a registered submission
    // Epoch check — if ctx is stale, makeOnReplaced will reject at first line
    makeOnReplaced(ctx)(r)
  }

  function dispatchSuccess(txHash: string): void {
    const ctx = hashToCtx.get(txHash)
    if (!ctx) return
    void runReceiptValidation(txHash, ctx)
  }

  function dispatchRetry(txHash: string): void {
    const ctx = hashToCtx.get(txHash)
    if (!ctx) return
    // Clear the notifiedSet entry so the validation can re-run
    const key = `${ctx.submissionId}:${txHash}`
    notifiedSet.delete(key)
    void runReceiptValidation(txHash, ctx)
  }

  function dispatchError(txHash: string, message: string): void {
    // SC1-E: guard — only update state if hash belongs to the current epoch
    const ctx = hashToCtx.get(txHash)
    if (!ctx) return
    if (epoch !== ctx.submissionId) return
    callbacks.setPhase(ctx.snap.action, {
      phase: 'error', txHash, message, retryable: true,
    })
  }

  return {
    beginSubmission,
    registerHash,
    clear,
    runReceiptValidation,
    dispatchOnReplaced,
    dispatchSuccess,
    dispatchRetry,
    dispatchError,
    makeOnReplaced,
  }
}
