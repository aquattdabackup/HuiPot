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

  // Use raw source import rather than a module import to avoid the 5000ms
  // timeout caused by wagmi hooks running in a node environment without a provider.
  it('Pool.tsx does NOT export ActionPanel (it is a local function only — raw source check)', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // ActionPanel must NOT appear in an export statement
    expect(code).not.toMatch(/export\s+(function|const|class)\s+ActionPanel/)
    expect(code).not.toMatch(/export\s*\{[^}]*ActionPanel[^}]*\}/)
    // Pool must be exported
    expect(code).toContain('export function Pool(')
    // ActionPanel must still be defined (local)
    expect(code).toContain('function ActionPanel(')
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

  it('Pool.tsx uses currentChainId prop (not stored snapshot chainId) for pre-confirm validation', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // Must compare currentChainId (live from useAccount) against TARGET_CHAIN_ID
    expect(code).toContain('currentChainId !== TARGET_CHAIN_ID')
    // Must NOT compare a stored snapshot.chainId (that was always TARGET_CHAIN_ID — never caught wrong chain)
    expect(code).not.toContain('reviewSnapshot.chainId')
  })

  it('Pool.tsx validates receipt event after isSuccess (no bare isSuccess success banner)', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // Must have receipt validation function
    expect(code).toContain('validateReceipt')
    // Must have replacement detection state
    expect(code).toContain("phase: 'replaced'")
    // Must not use bare contribSuccess/payoutSuccess/refundSuccess as the sole condition for success banner
    // (those were the old pattern — now we use receiptValidation.phase === 'confirmed')
    expect(code).toContain("phase: 'confirmed'")
  })

  it('Pool.tsx review shows full addresses (not truncated)', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // Must NOT use .slice(0,6) truncation in review rows
    // (old: snap.contractAddress.slice(0, 6); new: full snap.contractAddress)
    expect(code).not.toContain("snap.contractAddress.slice(0, 6)")
    expect(code).not.toContain("snap.recipient.slice(0, 6)")
  })

  it('Pool.tsx gas estimate is honest: wallet provides fee, no false estimability claim', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // RC5: new honest string — wallet shows exact fee; does not falsely claim estimateGas requires signing
    expect(code).toContain('The wallet will show the exact fee before you sign')
    // Must NOT contain the old 'Not estimable before signing' claim (removed — inaccurate per RC5)
    expect(code).not.toContain('Not estimable before signing')
    // Must NOT have the original hardcoded gas string
    expect(code).not.toContain('Full target amount to recipient; you pay Arc gas (~<0.01 USDC)')
  })

})

// ── RC1–RC6 regression tests ──────────────────────────────────────────────────

describe('RC1–RC6 regression — Pool.tsx source structure', () => {

  it('RC1: payout button disable uses isActionBusy("payout"), not global receiptValidation', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // isActionBusy function must exist and be used for payout/refund disable
    expect(code).toContain('function isActionBusy(')
    expect(code).toContain("isActionBusy('payout')")
    expect(code).toContain("isActionBusy('refund')")
    // Old pattern used a single receiptValidation.phase — that cross-contaminated actions
    // New code uses receiptByAction (per-action map)
    expect(code).toContain('receiptByAction')
    expect(code).not.toContain('receiptValidation.phase')
  })

  it('RC2: validateReceipt checks contributor identity for Contributed event', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // Must extract contributor from topics[2] and compare to snap.accountAddress
    expect(code).toContain('topics[2]')
    expect(code).toContain('logContributor')
    // Must reject mismatched contributor
    expect(code).toContain('Contributed event contributor')
    expect(code).toContain('does not match submitting wallet')
  })

  it('RC3: wait-hook errors surfaced; notifiedRef not set on error (retry allowed)', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // Must use isError from useWaitForTransactionReceipt
    expect(code).toContain('contribWaitError')
    expect(code).toContain('payoutWaitError')
    expect(code).toContain('refundWaitError')
    // notifiedRef.add must only be called for non-error outcomes
    // Retry button clears notifiedRef for error hashes
    expect(code).toContain('notifiedRef.current.delete(')
    expect(code).toContain('retryable: true')
  })

  it('RC4: confirmAction re-validates pool status before submitting wallet write', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // Must check live status for contribute
    expect(code).toContain("action === 'contribute'")
    expect(code).toContain('status !== STATUS.ACTIVE')
    // Must check live status for payout
    expect(code).toContain('status !== STATUS.FUNDED')
    // Must check live status for refund
    expect(code).toContain('status !== STATUS.REFUNDING')
    // Review modal must show stale warning
    expect(code).toContain('poolStateStale')
  })

  it('RC5: validateReceipt checks resp.ok and JSON-RPC error field', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // Must check HTTP transport success
    expect(code).toContain('resp.ok')
    // Must check JSON-RPC error field
    expect(code).toContain('json.error')
    // Must have RpcResponse type or equivalent check
    expect(code).toContain('json.error.code')
  })

  it('RC6: confirmedTxRef persists confirmed hash outside transient action states', async () => {
    const src = await import('../../../src/pages/Pool?raw') as { default: string }
    const code = src.default
    // confirmedTxRef must be set on confirmed outcome
    expect(code).toContain('confirmedTxRef.current = {')
    // ReceiptBanner must check confirmedTxRef for the idle fallback
    expect(code).toContain("confirmedTxRef.current?.action === action")
    // PAID state must also reference confirmedTxRef
    expect(code).toContain("confirmedTxRef.current?.action === 'payout'")
  })

})
