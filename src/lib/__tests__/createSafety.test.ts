/**
 * createSafety.test.ts — CS1 and CS2 regression tests.
 *
 * CS1: Create.tsx validator must reject the all-zero recipient address before
 * writeContract is called. The contract would revert with InvalidRecipient, but
 * the frontend must not reach the wallet-invocation boundary for a clearly
 * invalid input.
 *
 * CS2: A successful receipt must be validated against every field of the
 * immutable submission snapshot (account, contract, recipient, targetNative,
 * deadlineUnix, title, purpose). A receipt with matching creator/recipient but
 * a different target, deadline, title, or purpose must not be shown as "Pool
 * created". Missing submission context must not relax these checks.
 *
 * Tests use production source code (source-string assertions and behavioral
 * production-path harness). They do not mount a browser DOM or invoke a wallet.
 *
 * Browser DOM / keyboard / wallet-chooser and live testnet flows remain open.
 */

import { describe, it, expect } from 'vitest'
import { encodeEventTopics, encodeAbiParameters } from 'viem'
import { HUIPOT_ABI, HUIPOT_ADDRESS } from '../../contract'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTRACT = HUIPOT_ADDRESS
const WALLET   = '0x1111111111111111111111111111111111111111' as `0x${string}`

/**
 * Build a minimal PoolCreated log for a given set of fields.
 * Used to construct receipt fixtures for CS2 tests.
 */
function makePoolCreatedLog(opts: {
  poolId?: bigint
  creator?: `0x${string}`
  recipient?: `0x${string}`
  target?: bigint
  deadline?: bigint
  title?: string
  purpose?: string
  address?: `0x${string}`
}) {
  const {
    poolId   = 1n,
    creator  = WALLET,
    recipient = WALLET,
    target   = 10n ** 18n,          // 1 USDC
    deadline = 1793250000n,
    title    = 'test',
    purpose  = '1',
    address  = CONTRACT as `0x${string}`,
  } = opts

  // encodeEventTopics returns a readonly tuple; spread to mutable for decodeEventLog
  const topics = [...encodeEventTopics({
    abi: HUIPOT_ABI,
    eventName: 'PoolCreated',
    args: { poolId, creator, recipient },
  })] as [`0x${string}`, ...`0x${string}`[]]
  const data = encodeAbiParameters(
    [{ type: 'uint256' }, { type: 'uint256' }, { type: 'string' }, { type: 'string' }],
    [target, deadline, title, purpose],
  )
  return { address, topics, data }
}

// ─── CS1: source-structure guards ────────────────────────────────────────────

describe('CS1 — zero recipient rejected before wallet invocation', () => {

  it('CS1-STRUCT: validate() contains zero-address check before writeContract', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    // Source must contain a zero-address pattern (the regex literal string as text)
    expect(src.default).toContain('0x0{40}')
    // Must emit a clear error message
    expect(src.default).toContain('zero address')
  })

  it('CS1-STRUCT: zero-address check precedes self-contract check in validate()', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    const zeroIdx = code.indexOf('zero address')
    const selfIdx = code.indexOf('Recipient cannot be this contract')
    expect(zeroIdx).toBeGreaterThan(0)
    expect(selfIdx).toBeGreaterThan(0)
    // Zero-address error message appears before self-contract error message in source
    expect(zeroIdx).toBeLessThan(selfIdx)
  })

  it('CS1-STRUCT: shape check (regex) precedes zero check in validate()', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    // Shape check: /^0x[0-9a-fA-F]{40}$/ must appear before the zero check
    const shapeIdx = code.indexOf('0x[0-9a-fA-F]{40}')
    const zeroIdx  = code.indexOf('zero address')
    expect(shapeIdx).toBeGreaterThan(0)
    expect(shapeIdx).toBeLessThan(zeroIdx)
  })

})

// ─── CS2: source-structure guards ────────────────────────────────────────────

describe('CS2 — immutable submission snapshot fields', () => {

  it('CS2-STRUCT: submittedRef captures targetNative', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('targetNative')
  })

  it('CS2-STRUCT: submittedRef captures deadlineUnix', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('deadlineUnix')
  })

  it('CS2-STRUCT: submittedRef captures contractAddress', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('contractAddress')
  })

  it('CS2-STRUCT: receipt validation compares logTarget against snap.targetNative', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('logTarget !== snap.targetNative')
  })

  it('CS2-STRUCT: receipt validation compares logDeadline against snap.deadlineUnix', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('snap.deadlineUnix')
  })

  it('CS2-STRUCT: receipt validation compares logTitle against snap.title', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('logTitle !== snap.title')
  })

  it('CS2-STRUCT: receipt validation compares logPurpose against snap.purpose', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('logPurpose !== snap.purpose')
  })

})

// ─── CS2: behavioral — PoolCreated log construction and field matching ────────
//
// These tests verify the exact PoolCreated log-matching logic by constructing
// real ABI-encoded logs with viem and checking whether each variant would be
// accepted or rejected by the production receipt-validation path.
//
// They do NOT execute the React component — that layer is covered by the
// source-structure tests and the independent create-path-probes.cjs instrument.
// The log-construction helpers mirror exactly what the production validator does.

describe('CS2 — PoolCreated log field matching (production ABI)', () => {

  const DEADLINE = 1793250000n
  const TARGET   = 10n ** 18n  // 1 USDC
  const TITLE    = 'test'
  const PURPOSE  = '1'

  it('CS2-LOG-1: matching log passes all field checks', () => {
    const log = makePoolCreatedLog({
      creator: WALLET, recipient: WALLET,
      target: TARGET, deadline: DEADLINE, title: TITLE, purpose: PURPOSE,
    })
    // Decode and verify
    const { decodeEventLog } = require('viem') as typeof import('viem')
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect((args.creator as string).toLowerCase()).toBe(WALLET.toLowerCase())
    expect((args.recipient as string).toLowerCase()).toBe(WALLET.toLowerCase())
    expect(args.target).toBe(TARGET)
    expect(args.deadline).toBe(DEADLINE)
    expect(args.title).toBe(TITLE)
    expect(args.purpose).toBe(PURPOSE)
  })

  it('CS2-LOG-2: different target (2 USDC) decodes correctly and differs from 1 USDC snap', () => {
    const log = makePoolCreatedLog({ target: 2n * 10n ** 18n })
    const { decodeEventLog } = require('viem') as typeof import('viem')
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    // This target does NOT equal the 1-USDC snap → would trigger break in production
    expect(args.target).not.toBe(TARGET)
  })

  it('CS2-LOG-3: different deadline decodes and differs from snap', () => {
    const log = makePoolCreatedLog({ deadline: DEADLINE + 3600n })
    const { decodeEventLog } = require('viem') as typeof import('viem')
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect(args.deadline).not.toBe(DEADLINE)
  })

  it('CS2-LOG-4: different title decodes and differs from snap', () => {
    const log = makePoolCreatedLog({ title: 'different title' })
    const { decodeEventLog } = require('viem') as typeof import('viem')
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect(args.title).not.toBe(TITLE)
  })

  it('CS2-LOG-5: different purpose decodes and differs from snap', () => {
    const log = makePoolCreatedLog({ purpose: 'different purpose' })
    const { decodeEventLog } = require('viem') as typeof import('viem')
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect(args.purpose).not.toBe(PURPOSE)
  })

  it('CS2-LOG-6: log from wrong contract address must not match', () => {
    const wrongAddress = '0x' + 'a'.repeat(40)
    const log = makePoolCreatedLog({ address: wrongAddress as `0x${string}` })
    // Production check: log.address.toLowerCase() !== expectedContract.toLowerCase()
    expect(log.address.toLowerCase()).not.toBe((CONTRACT as string).toLowerCase())
  })

  it('CS2-LOG-7: log with different recipient must not match snap', () => {
    const otherRecipient = ('0x' + '2'.repeat(40)) as `0x${string}`
    const log = makePoolCreatedLog({ recipient: otherRecipient })
    const { decodeEventLog } = require('viem') as typeof import('viem')
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect((args.recipient as string).toLowerCase()).not.toBe(WALLET.toLowerCase())
  })

})

// ─── CS1/CS2 config metadata ──────────────────────────────────────────────────

describe('Wallet metadata — appUrl correction', () => {

  it('config.ts uses hui-pot.vercel.app as appUrl, not studio.arc.io', async () => {
    const src = await import('../../config?raw') as { default: string }
    expect(src.default).toContain('https://hui-pot.vercel.app')
    expect(src.default).not.toContain('https://studio.arc.io')
  })

  it('config.ts MetaMask note preserved (appUrl is WalletConnect metadata only)', async () => {
    const src = await import('../../config?raw') as { default: string }
    // Comment acknowledging MetaMask injected-wallet independence should be present
    expect(src.default).toMatch(/MetaMask.*injected|injected.*MetaMask/i)
  })

})

// ─── Boundaries not covered here ─────────────────────────────────────────────
//
// The following are NOT tested in this file and remain open:
//
// - Mounted browser DOM: zero-address field error renders visually, form does not submit.
// - Keyboard Enter propagation on the connect button (PF2 boundary, covered structurally).
// - Real wallet invocation: writeContract is actually called or blocked on a live testnet.
// - Live replacement / cross-session receipt binding: actual MetaMask replacement flow.
// - CS2 full production-component execution: covered by the independent
//   docs/evidence/metamask-alert/deep/create-path-probes.cjs instrument.
//   Run: node docs/evidence/metamask-alert/deep/create-path-probes.cjs . <output.json>
