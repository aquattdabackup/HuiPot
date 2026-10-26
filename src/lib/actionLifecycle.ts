/**
 * actionLifecycle.ts — submission-bound lifecycle logic for Pool action validation.
 *
 * This module is extracted from ActionPanel so it can be directly unit-tested
 * without React. ActionPanel imports and calls makeActionLifecycle(); the
 * returned object is wired to useEffect dependencies and wagmi callbacks.
 *
 * SC1 fix: each confirmAction call captures an immutable SubmissionContext
 * (submissionId + snap). All callbacks (onReplaced, isSuccess, retry) receive
 * the context at dispatch time rather than reading mutable refs at callback time.
 * Post-unmount or post-new-submission callbacks find their submissionId stale
 * and are rejected before any work starts.
 *
 * The lifecycle manager also exposes a clear() method called on unmount that
 * advances the epoch counter, ensuring any in-flight async work after unmount
 * cannot call onSuccess.
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

  /** Call on component unmount — invalidates current submission. */
  clear: () => void

  /**
   * Run receipt validation for a txHash under a given context.
   * All entry points (isSuccess, onReplaced repriced, retry) call this.
   * Context is immutable: stale contexts are rejected before any async work.
   */
  runReceiptValidation: (txHash: string, ctx: SubmissionContext) => Promise<void>

  /**
   * Build onReplaced handler bound to a specific context.
   * Returns a function suitable for wagmi's useWaitForTransactionReceipt onReplaced.
   * SC1: context is passed in, not read from a mutable ref.
   */
  makeOnReplaced: (ctx: SubmissionContext) => (r: OnReplacedArg) => void
}

export function makeActionLifecycle(
  rpcUrl: string,
  callbacks: LifecycleCallbacks,
): ActionLifecycle {
  // Epoch counter. Incremented on each beginSubmission and on clear().
  // runReceiptValidation captures its epoch at call time; the stale check
  // compares it at resolution time.
  let epoch = 0

  // Tracks the current active validation slot per epoch.
  // If two hashes race for the same epoch, the second one invalidates the first.
  let activeSlot: { epoch: number; txHash: string } | null = null

  // notifiedSet: keyed by `${epoch}:${txHash}` — prevents duplicate onSuccess.
  const notifiedSet = new Set<string>()

  function beginSubmission(snap: ReceiptSnapshot): SubmissionContext {
    epoch++
    activeSlot = null
    return { submissionId: epoch, snap }
  }

  function clear() {
    epoch++
    activeSlot = null
  }

  async function runReceiptValidation(txHash: string, ctx: SubmissionContext): Promise<void> {
    const { submissionId, snap } = ctx

    // SC1: reject immediately if context is stale (new submission or unmount)
    if (epoch !== submissionId) return

    const key = `${submissionId}:${txHash}`
    if (notifiedSet.has(key)) return

    // Claim active slot: if another hash is validating for this same submission,
    // invalidate the old one so it cannot call onSuccess.
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
      // SC1: reject if context has been superseded (new submission or unmount)
      if (epoch !== submissionId) return

      const originalHash = r.replacedTransaction.hash
      const minedHash = r.transaction.hash

      // Mark original hash consumed for this submission
      notifiedSet.add(`${submissionId}:${originalHash}`)

      if (r.reason === 'cancelled') {
        callbacks.setPhase(snap.action, {
          phase: 'cancelled',
          originalHash,
          minedHash,
          note: `Transaction was cancelled. Mined: ${minedHash.slice(0, 10)}…`,
        })
      } else if (r.reason === 'repriced') {
        // Same submission, new mined hash — validate B
        void runReceiptValidation(minedHash, ctx)
      } else {
        // 'replaced' — different tx won the slot
        callbacks.setPhase(snap.action, {
          phase: 'replaced',
          txHash: originalHash,
          minedHash,
          note: `Transaction was replaced (${r.reason}). Mined: ${minedHash.slice(0, 10)}…`,
        })
      }
    }
  }

  return { beginSubmission, clear, runReceiptValidation, makeOnReplaced }
}
