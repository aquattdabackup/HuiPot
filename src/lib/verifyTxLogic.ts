/**
 * Shared verification logic for HuiPotGoalPool transactions.
 *
 * This module exports the VerifyResult interface and computeOverallValid predicate.
 * Both Proof.tsx (production) and the vitest suite import from here — there is
 * exactly one copy of this logic. Tests that import computeOverallValid are
 * exercising the real production predicate, not a hand-written duplicate.
 */

export interface VerifyResult {
  txHash: string
  receiptStatus: '0x1' | '0x0' | string
  receiptStatusOk: boolean
  toAddress: string | null
  toMatchesContract: boolean
  poolIdInLog: string | null
  poolIdMatches: boolean | null
  eventFound: 'PaidOut' | 'Refunded' | 'Contributed' | null
  amountInLog: string | null
  recipientInLog: string | null
  recipientMatchesPool: boolean | null
  arcTransferFound: boolean
  arcTransferAmount: string | null
  arcTransferTo: string | null
  arcTransferFrom: string | null
  arcTransferToMatchesRecipient: boolean | null
  arcTransferAmountMatchesEvent: boolean | null
  arcTransferFromMatchesContributor: boolean | null
  eventAmountMatchesTarget: boolean | null
  overallValid: boolean
  notes: string[]
}

/**
 * Compute the overallValid verdict from a VerifyResult.
 *
 * Rules (all must hold for overallValid = true):
 * - Receipt succeeded (status 0x1)
 * - Transaction targeted the HuiPot contract
 * - A recognised event (PaidOut / Refunded / Contributed) is present
 * - The event's poolId matches the expected pool
 * - Amount in the event log is non-null AND non-zero
 * - PaidOut: recipient in log matches pool's fixed recipient
 * - PaidOut: event amount equals the on-chain pool target (not just matches Transfer)
 * - Movement evidence (Arc Transfer) is present and correct:
 *     PaidOut / Refunded: outbound Transfer, destination matches recipient/contributor,
 *                          amount matches event amount
 *     Contributed:        inbound Transfer, SENDER matches contributor,
 *                          amount matches event amount
 */
export function computeOverallValid(r: VerifyResult): boolean {
  // Amount must be non-null AND non-zero ("0" is a decoded zero — invalid event amount)
  const amountPresent = r.amountInLog !== null && BigInt(r.amountInLog) > 0n

  const movementRequired =
    r.eventFound === 'PaidOut' ||
    r.eventFound === 'Refunded' ||
    r.eventFound === 'Contributed'

  const movementOk = !movementRequired ||
    (r.eventFound === 'Contributed'
      // Inbound: amount must match event AND sender must be the contributor
      ? (r.arcTransferFound &&
          r.arcTransferAmountMatchesEvent === true &&
          r.arcTransferFromMatchesContributor === true)
      // Outbound: destination must match recipient/contributor AND amount must match event
      : (r.arcTransferFound &&
          r.arcTransferToMatchesRecipient === true &&
          r.arcTransferAmountMatchesEvent === true)
    )

  return (
    r.receiptStatusOk &&
    r.toMatchesContract &&
    r.eventFound !== null &&
    r.poolIdMatches === true &&
    (r.eventFound !== 'PaidOut' || r.recipientMatchesPool === true) &&
    (r.eventFound !== 'PaidOut' || r.eventAmountMatchesTarget === true) &&
    amountPresent &&
    movementOk
  )
}
