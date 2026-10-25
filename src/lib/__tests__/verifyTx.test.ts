/**
 * Regression tests for the verifyTx overallValid logic.
 *
 * IMPORTANT: computeOverallValid and VerifyResult are imported directly from
 * the production module (src/lib/verifyTxLogic.ts). There is no hand-written
 * duplicate of the predicate in this file. If production logic changes, these
 * tests will catch divergence automatically.
 *
 * Coverage:
 *   R2 preserved  — 5 payout negative fixtures
 *   F05 new       — 3 contribution negative fixtures (no inbound, wrong amount, zero amount)
 *   NF extras     — 8 additional negative cases
 *   PC controls   — 3 positive controls (PaidOut, Refunded, Contributed)
 *   R3 structural — ActionPanel not exported; Landing has no write hooks
 */
import { describe, it, expect } from 'vitest'
import { computeOverallValid, type VerifyResult } from '../verifyTxLogic'

// ── Base fixtures ─────────────────────────────────────────────────────────────

const BASE_PAIDOUT: VerifyResult = {
  txHash: '0x' + 'a'.repeat(64),
  receiptStatus: '0x1',
  receiptStatusOk: true,
  toAddress: '0x81a139599d252eb2dc2bbb6c267e911a21264288',
  toMatchesContract: true,
  eventFound: 'PaidOut',
  poolIdInLog: '1',
  poolIdMatches: true,
  amountInLog: (10n ** 18n).toString(),       // 1 USDC in native 18-dec
  recipientInLog: '0xaabbccddeeaabbccddeeaabbccddeeaabbccddee',
  recipientMatchesPool: true,
  eventAmountMatchesTarget: true,
  arcTransferFound: true,
  arcTransferAmount: (10n ** 18n).toString(),
  arcTransferTo: '0xaabbccddeeaabbccddeeaabbccddeeaabbccddee',
  arcTransferFrom: '0x81a139599d252eb2dc2bbb6c267e911a21264288',
  arcTransferToMatchesRecipient: true,
  arcTransferAmountMatchesEvent: true,
  arcTransferFromMatchesContributor: null,
  overallValid: true,
  notes: [],
}

const BASE_REFUNDED: VerifyResult = {
  txHash: '0x' + 'b'.repeat(64),
  receiptStatus: '0x1',
  receiptStatusOk: true,
  toAddress: '0x81a139599d252eb2dc2bbb6c267e911a21264288',
  toMatchesContract: true,
  eventFound: 'Refunded',
  poolIdInLog: '1',
  poolIdMatches: true,
  amountInLog: (4n * 10n ** 17n).toString(),  // 0.4 USDC
  recipientInLog: '0x1234567890123456789012345678901234567890',
  recipientMatchesPool: null,
  eventAmountMatchesTarget: null,
  arcTransferFound: true,
  arcTransferAmount: (4n * 10n ** 17n).toString(),
  arcTransferTo: '0x1234567890123456789012345678901234567890',
  arcTransferFrom: '0x81a139599d252eb2dc2bbb6c267e911a21264288',
  arcTransferToMatchesRecipient: true,
  arcTransferAmountMatchesEvent: true,
  arcTransferFromMatchesContributor: null,
  overallValid: true,
  notes: [],
}

const BASE_CONTRIBUTED: VerifyResult = {
  txHash: '0x' + 'c'.repeat(64),
  receiptStatus: '0x1',
  receiptStatusOk: true,
  toAddress: '0x81a139599d252eb2dc2bbb6c267e911a21264288',
  toMatchesContract: true,
  eventFound: 'Contributed',
  poolIdInLog: '1',
  poolIdMatches: true,
  amountInLog: (4n * 10n ** 17n).toString(),  // 0.4 USDC
  recipientInLog: '0x1234567890123456789012345678901234567890', // contributor
  recipientMatchesPool: null,
  eventAmountMatchesTarget: null,
  arcTransferFound: true,
  arcTransferAmount: (4n * 10n ** 17n).toString(),
  arcTransferTo: '0x81a139599d252eb2dc2bbb6c267e911a21264288', // to contract
  arcTransferFrom: '0x1234567890123456789012345678901234567890', // from contributor
  arcTransferToMatchesRecipient: null,
  arcTransferAmountMatchesEvent: true,
  arcTransferFromMatchesContributor: true,    // sender matches contributor
  overallValid: true,
  notes: [],
}

// ── Preserved R2 negative fixtures (payout) ───────────────────────────────────

describe('overallValid — R2 regression (preserved)', () => {

  it('NF-1: PaidOut event=1 base unit, Transfer=1 base unit, target=1e18 → false', () => {
    const r: VerifyResult = {
      ...BASE_PAIDOUT,
      amountInLog: '1',
      eventAmountMatchesTarget: false,
      arcTransferAmountMatchesEvent: true,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('NF-2: PaidOut with missing Arc Transfer evidence → false', () => {
    const r: VerifyResult = {
      ...BASE_PAIDOUT,
      arcTransferFound: false,
      arcTransferTo: null,
      arcTransferFrom: null,
      arcTransferToMatchesRecipient: null,
      arcTransferAmountMatchesEvent: null,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('NF-3: PaidOut with wrong Transfer destination → false', () => {
    const r: VerifyResult = { ...BASE_PAIDOUT, arcTransferToMatchesRecipient: false }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('NF-4: PaidOut with wrong Transfer amount vs event → false', () => {
    const r: VerifyResult = { ...BASE_PAIDOUT, arcTransferAmountMatchesEvent: false }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('NF-5: Refunded without Arc Transfer evidence → false', () => {
    const r: VerifyResult = {
      ...BASE_REFUNDED,
      arcTransferFound: false,
      arcTransferTo: null,
      arcTransferFrom: null,
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

  it('PC-3: valid Contributed with inbound Transfer from correct sender → true', () => {
    expect(computeOverallValid(BASE_CONTRIBUTED)).toBe(true)
  })

})

// ── F05 new negative fixtures (contribution) ──────────────────────────────────

describe('overallValid — F05 contribution negatives', () => {

  it('F05-NF-1: Contributed with no inbound Transfer evidence → false', () => {
    const r: VerifyResult = {
      ...BASE_CONTRIBUTED,
      arcTransferFound: false,
      arcTransferAmount: null,
      arcTransferAmountMatchesEvent: null,
      arcTransferFromMatchesContributor: null,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('F05-NF-2: Contributed with wrong inbound Transfer amount → false', () => {
    const r: VerifyResult = {
      ...BASE_CONTRIBUTED,
      arcTransferAmountMatchesEvent: false,
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('F05-NF-3: Contributed with zero event amount → false (BigInt("0") > 0n fails)', () => {
    // amountInLog="0" is a decoded zero — not null, but BigInt("0") > 0n is false
    const r: VerifyResult = {
      ...BASE_CONTRIBUTED,
      amountInLog: '0',
    }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('F05-NF-4: Contributed with inbound Transfer from WRONG sender → false', () => {
    // Transfer exists and amount matches, but sender is not the contributor
    const r: VerifyResult = {
      ...BASE_CONTRIBUTED,
      arcTransferFrom: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      arcTransferFromMatchesContributor: false,
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
    const r: VerifyResult = { ...BASE_PAIDOUT, eventAmountMatchesTarget: false }
    expect(computeOverallValid(r)).toBe(false)
  })

  it('PaidOut with amountInLog null → false', () => {
    expect(computeOverallValid({ ...BASE_PAIDOUT, amountInLog: null })).toBe(false)
  })

  it('Contributed with amountInLog null → false', () => {
    expect(computeOverallValid({ ...BASE_CONTRIBUTED, amountInLog: null })).toBe(false)
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
    expect(code).not.toContain('useWriteContract')
    expect(code).not.toContain('useAccount')
  })

  it('verifyTxLogic exports computeOverallValid as a function (production path confirmed)', () => {
    expect(typeof computeOverallValid).toBe('function')
  })

})
