/**
 * R1 regression tests for parseProductAmount.
 *
 * Each test confirms the parser either:
 *   (a) throws with the right message for invalid/out-of-range input, or
 *   (b) returns the correct 18-decimal native bigint for valid input.
 *
 * These are the original R1 failure cases documented in STUDIO_FIX_RECHECK.md
 * plus positive controls and edge cases.
 */
import { describe, it, expect } from 'vitest'
import { parseProductAmount } from '../../config'

const QUANTUM = 10n ** 12n  // 1 product unit (0.000001 USDC) in native decimals

describe('parseProductAmount — R1 regression', () => {
  // ---- Originally failing cases (R1 finding) ----

  it('rejects "0,4" — comma must not be silently stripped to produce 4 USDC', () => {
    expect(() => parseProductAmount('0,4')).toThrow('Invalid amount format')
  })

  it('rejects "1e3" — scientific notation must not be silently stripped to produce 13 USDC', () => {
    expect(() => parseProductAmount('1e3')).toThrow('Invalid amount format')
  })

  it('rejects "-0.4" — minus sign must not be silently stripped to produce 0.4 USDC', () => {
    expect(() => parseProductAmount('-0.4')).toThrow('Invalid amount format')
  })

  // ---- Additional invalid-format cases ----

  it('rejects "+1.5" — plus sign', () => {
    expect(() => parseProductAmount('+1.5')).toThrow('Invalid amount format')
  })

  it('rejects "  " (whitespace-only) returns 0n — caller rejects zero', () => {
    expect(parseProductAmount('  ')).toBe(0n)
  })

  it('rejects "" (empty string) returns 0n — caller rejects zero', () => {
    expect(parseProductAmount('')).toBe(0n)
  })

  it('rejects "1.2.3" — multiple dots', () => {
    expect(() => parseProductAmount('1.2.3')).toThrow('Invalid amount format')
  })

  it('rejects ".5" — leading dot (no integer part)', () => {
    expect(() => parseProductAmount('.5')).toThrow('Invalid amount format')
  })

  // ---- Decimal precision boundary ----

  it('rejects "0.0000001" — 7 decimal places (max is 6)', () => {
    expect(() => parseProductAmount('0.0000001')).toThrow('Too many decimal places (max 6)')
  })

  it('accepts "0.000001" — exactly 6 decimal places → 1 quantum (10^12 native)', () => {
    expect(parseProductAmount('0.000001')).toBe(QUANTUM)
  })

  it('accepts "0.000000" — 6 trailing zeros → 0n', () => {
    expect(parseProductAmount('0.000000')).toBe(0n)
  })

  // ---- Valid small amounts ----

  it('accepts "1" — 1 USDC → 10^18 native', () => {
    expect(parseProductAmount('1')).toBe(10n ** 18n)
  })

  it('accepts "0.4" → 0.4 USDC in native units', () => {
    const expected = 4n * 10n ** 17n   // 0.4 * 10^18
    expect(parseProductAmount('0.4')).toBe(expected)
  })

  it('accepts "1.5" → 1.5 USDC', () => {
    const expected = 15n * 10n ** 17n
    expect(parseProductAmount('1.5')).toBe(expected)
  })

  it('accepts "100" → 100 USDC', () => {
    expect(parseProductAmount('100')).toBe(100n * 10n ** 18n)
  })

  // ---- uint256 overflow ----

  it('rejects uint256-overflowing value', () => {
    const overflow = '1' + '0'.repeat(80)   // >> uint256 max
    expect(() => parseProductAmount(overflow)).toThrow('Amount exceeds maximum')
  })

  // ---- Trailing/leading whitespace tolerance ----

  it('accepts "  1.5  " — trims whitespace', () => {
    expect(parseProductAmount('  1.5  ')).toBe(15n * 10n ** 17n)
  })
})
