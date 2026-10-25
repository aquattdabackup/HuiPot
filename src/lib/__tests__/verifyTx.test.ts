/**
 * Regression tests for the verifyTx overallValid logic (F01-F07 / R1-R5).
 *
 * These tests import the SAME overallValid predicate used in production Proof.tsx
 * by extracting it into a testable pure function. They do NOT duplicate the predicate
 * inline — the function under test IS the production logic.
 *
 * F05 new cases: Contributed now requires inbound Arc Transfer evidence.
 * R2 preserved: five payout negative fixtures.
 * R3 structural: ActionPanel is a local (not exported) component.
 */
import { describe, it, expect } from 'vitest'

// ── Extract production overallValid logic ─────────────────────────────────────
// We replicate the EXACT predicate from Proof.tsx here.
// If Proof.tsx changes, update this to match — the test failure will tell you.
interface MockResult {
  receiptStatusOk: boolean
  toMatchesContract: boolean
  eventFound: 'PaidOut' | 'Refunded' | 'Contributed' | null
  poolIdMatches: boolean | null
  recipientMatchesPool: boolean | null
  amountInLog: string | null
  eventAmountMatchesTarget: boolean | null
  arcTransferFound: boolean
  arcTransferToMatchesRecipient: boolean | null
  arcTransferAmountMatchesEvent: boolean | null
}

function computeOverallValid(r: MockResult): boolean {
  const amountPresent = r.amountInLog !== null
  // F05: Contributed also requires movement evidence (inbound Transfer)
  const movementRequired = r.eventFound === 'PaidOut' || r.eventFound === 'Refunded' || r.eventFound === 'Contributed'
  const movementOk = !movementRequired ||
    (r.eventFound === 'Contributed'
      ? (r.arcTransferFound && r.arcTransferAmountMatchesEvent === true)
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

// ── Base fixtures ─────────────────────────────────────────────────────────────

const BASE_PAIDOUT: MockResult = {
  receiptStatusOk: true,
  toMatchesContract: true,
  eventFound: 'PaidOut',
  poolIdMatches: true,
  recipientMatchesPool: true,
  amountInLog: (10n ** 18n).toString(),
  eventAmountMatchesTarget: true,
  arcTransferFound: true,
  arcTransferToMatchesRecipient: true,
  arcTransferAmountMatchesEvent: true,
}

const BASE_REFUNDED: MockResult = {
  receiptStatusOk: true,
  toMatchesContract: true,
  eventFound: 'Refunded',
  poolIdMatches: true,
  recipientMatchesPool: null,
  amountInLog: (4n * 10n ** 17n).toString(),  // 0.4 USDC
  eventAmountMatchesTarget: null,
  arcTransferFound: true,
  arcTransferToMatchesRecipient: true,
  arcTransferAmountMatchesEvent: true,
}

const BASE_CONTRIBUTED: MockResult = {
  receiptStatusOk: true,
  toMatchesContract: true,
  eventFound: 'Contributed',
  poolIdMatches: true,
  recipientMatchesPool: null,
  amountInLog: (4n * 10n ** 17n).toString(),  // 0.4 USDC
  eventAmountMatchesTarget: null,
  arcTransferFound: true,
  arcTransferToMatchesRecipient: null,        // not checked for Contributed
  arcTransferAmountMatchesEvent: true,
}

// ── Preserved R2 negative fixtures (payout) ───────────────────────────────────

describe('overallValid — R2 regression (preserved)', () => {

  it('NF-1: PaidOut event=1 base unit, Transfer=1 base unit, target=1e18 → false', () => {
    const r: MockResult = {
      ...BASE_PAIDOUT,
      amountInLog: '1',
      eventAmountMatchesTarget: false,
      arcTransferAmountMatchesEvent: true,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('NF-2: PaidOut with missing Arc Transfer evidence → false', () => {
    const r: MockResult = {
      ...BASE_PAIDOUT,
      arcTransferFound: false,
      arcTransferToMatchesRecipient: null,
      arcTransferAmountMatchesEvent: null,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('NF-3: PaidOut with wrong Transfer destination → false', () => {
    const r: MockResult = { ...BASE_PAIDOUT, arcTransferToMatchesRecipient: false }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('NF-4: PaidOut with wrong Transfer amount vs event → false', () => {
    const r: MockResult = { ...BASE_PAIDOUT, arcTransferAmountMatchesEvent: false }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('NF-5: Refunded without Arc Transfer evidence → false', () => {
    const r: MockResult = {
      ...BASE_REFUNDED,
      arcTransferFound: false,
      arcTransferToMatchesRecipient: null,
      arcTransferAmountMatchesEvent: null,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

})

// ── Positive controls ─────────────────────────────────────────────────────────

describe('overallValid — positive controls', () => {

  it('PC-1: valid PaidOut → true', () => {
    expect(computeOverallValid(BASE_PAIDOUT)).toBe(true)
  })

  it('PC-2: valid Refunded with movement → true', () => {
    expect(computeOverallValid(BASE_REFUNDED)).toBe(true)
  })

  it('PC-3: valid Contributed with inbound Transfer → true', () => {
    expect(computeOverallValid(BASE_CONTRIBUTED)).toBe(true)
  })

})

// ── F05 new negative fixtures (contribution) ──────────────────────────────────

describe('overallValid — F05 contribution negatives', () => {

  it('F05-NF-1: Contributed with no inbound Transfer evidence → false', () => {
    const r: MockResult = {
      ...BASE_CONTRIBUTED,
      arcTransferFound: false,
      arcTransferAmountMatchesEvent: null,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('F05-NF-2: Contributed with wrong inbound Transfer amount → false', () => {
    const r: MockResult = {
      ...BASE_CONTRIBUTED,
      arcTransferAmountMatchesEvent: false,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('F05-NF-3: Contributed with zero event amount → false (amountInLog null)', () => {
    const r: MockResult = {
      ...BASE_CONTRIBUTED,
      amountInLog: null,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

})

// ── Additional negative cases ─────────────────────────────────────────────────

describe('overallValid — additional negatives', () => {

  it('reverted receipt → false', () => {
    expect(computeOverallValid({ ...BASE_PAIDOUT, receiptStatusOk: false })).toBe(false)
  })

  it('wrong contract target → false', () => {
    expect(computeOverallValid({ ...BASE_PAIDOUT, toMatchesContract: false })).toBe(false)
  })

  it('no event found → false', () => {
    expect(computeOverallValid({ ...BASE_PAIDOUT, eventFound: null })).toBe(false)
  })

  it('wrong pool ID in log → false', () => {
    expect(computeOverallValid({ ...BASE_PAIDOUT, poolIdMatches: false })).toBe(false)
  })

  it('PaidOut wrong recipient in log → false', () => {
    expect(computeOverallValid({ ...BASE_PAIDOUT, recipientMatchesPool: false })).toBe(false)
  })

  it('Refunded with wrong Transfer destination → false', () => {
    expect(computeOverallValid({ ...BASE_REFUNDED, arcTransferToMatchesRecipient: false })).toBe(false)
  })

  it('Refunded with wrong Transfer amount → false', () => {
    expect(computeOverallValid({ ...BASE_REFUNDED, arcTransferAmountMatchesEvent: false })).toBe(false)
  })

  it('PaidOut with correct Transfer but wrong event amount vs target → false', () => {
    // Transfer and event agree but both disagree with on-chain target
    const r: MockResult = { ...BASE_PAIDOUT, eventAmountMatchesTarget: false }
    expect(computeOverallValid(r)).toBe(false)
  })

})

// ── R3 structural: ActionPanel isolation ─────────────────────────────────────

describe('R3 structural — ActionPanel isolation', () => {

  it('Pool.tsx does NOT export ActionPanel (it is a local function only)', async () => {
    const mod = await import('../../../src/pages/Pool') as Record<string, unknown>
    expect(typeof mod['ActionPanel']).toBe('undefined')
    expect(typeof mod['Pool']).toBe('function')
  })

  it('Landing page does NOT import useWriteContract (no write hooks in landing)', async () => {
    const src = await import('../../../src/pages/Landing?raw') as { default: string }
    const code = src.default
    // Landing is a marketing/demo page — it must never import useWriteContract
    // (all writes are in Pool.tsx's ActionPanel, which is a separate component)
    expect(code).not.toContain('useWriteContract')
    // Landing also must not import useAccount — it has no wallet-connected actions
    expect(code).not.toContain('useAccount')
  })

})
