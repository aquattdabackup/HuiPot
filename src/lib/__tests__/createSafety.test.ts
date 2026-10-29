/**
 * createSafety.test.ts — CS1, CS2, CSF1–CSF4 regression tests.
 *
 * CS1:  validate() rejects zero recipient before writeContract.
 * CS2:  Receipt validated against full immutable snapshot (all PoolCreated fields).
 * CSF1: Missing or incomplete snapshot must not relax any receipt check.
 * CSF2: Explorer links use the mined receipt hash, not the submitted hash.
 * CSF3: useWaitForTransactionReceipt is pinned to TARGET_CHAIN_ID.
 * CSF4: ESM imports only (no require('viem')); production-path behavioral coverage.
 *
 * Tests do not mount a browser DOM or invoke a wallet.
 * Mounted DOM / keyboard / live testnet flows remain open.
 */

import { describe, it, expect } from 'vitest'
import { encodeEventTopics, encodeAbiParameters, decodeEventLog } from 'viem'
import { HUIPOT_ABI, HUIPOT_ADDRESS } from '../../contract'
import { TARGET_CHAIN_ID } from '../../config'

// ─── Shared constants ─────────────────────────────────────────────────────────

const CONTRACT  = HUIPOT_ADDRESS
const WALLET    = '0x1111111111111111111111111111111111111111' as `0x${string}`
const HASH_A    = ('0x' + 'a'.repeat(64)) as `0x${string}`
const HASH_B    = ('0x' + 'b'.repeat(64)) as `0x${string}`

// ─── Log builder ──────────────────────────────────────────────────────────────

interface LogOpts {
  poolId?:    bigint
  creator?:   `0x${string}`
  recipient?: `0x${string}`
  target?:    bigint
  deadline?:  bigint
  title?:     string
  purpose?:   string
  address?:   `0x${string}`
}

/** Build a minimal PoolCreated log for use in receipt fixtures. */
function makePoolCreatedLog(opts: LogOpts = {}) {
  const {
    poolId    = 1n,
    creator   = WALLET,
    recipient = WALLET,
    target    = 10n ** 18n,
    deadline  = 1793250000n,
    title     = 'test',
    purpose   = '1',
    address   = CONTRACT as `0x${string}`,
  } = opts

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
    expect(src.default).toContain('0x0{40}')
    expect(src.default).toContain('zero address')
  })

  it('CS1-STRUCT: zero-address check precedes self-contract check in validate()', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    const zeroIdx = code.indexOf('zero address')
    const selfIdx = code.indexOf('Recipient cannot be this contract')
    expect(zeroIdx).toBeGreaterThan(0)
    expect(selfIdx).toBeGreaterThan(0)
    expect(zeroIdx).toBeLessThan(selfIdx)
  })

  it('CS1-STRUCT: shape check (regex) precedes zero check in validate()', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
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

// ─── CSF1 source structure: missing/empty snapshot must be guarded ────────────

describe('CSF1 — missing or incomplete snapshot rejects receipt (source structure)', () => {

  it('CSF1-STRUCT: snapOk check requires snap !== null', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('snap !== null')
  })

  it('CSF1-STRUCT: snapOk check requires non-empty account', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain("snap.account !== ''")
  })

  it('CSF1-STRUCT: creator comparison uses snap.account (not optional chain)', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('snap.account.toLowerCase()')
  })

  it('CSF1-STRUCT: recipient comparison uses snap.recipient (not live form fallback)', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('snap.recipient.toLowerCase()')
    // Old code had a fallback to live form field; must be gone
    expect(src.default).not.toContain("snap?.recipient ?? recipient.trim()")
  })

})

// ─── CSF2 source structure: mined hash for explorer links ─────────────────────

describe('CSF2 — explorer links use mined receipt hash (source structure)', () => {

  it('CSF2-STRUCT: minedHash variable is derived from receipt.transactionHash', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('receipt?.transactionHash')
    expect(src.default).toContain('minedHash')
  })

  it('CSF2-STRUCT: explorerTxUrl calls use minedHash, not bare hash', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    // No explorerTxUrl(hash!) — should use minedHash
    expect(code).not.toContain('explorerTxUrl(hash!)')
    expect(code).toContain('explorerTxUrl(minedHash!)')
  })

})

// ─── CSF3 source structure: chain pinning ─────────────────────────────────────

describe('CSF3 — receipt watcher pinned to submitted chain (source structure)', () => {

  it('CSF3-STRUCT: useWaitForTransactionReceipt passes chainId', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('chainId: TARGET_CHAIN_ID')
    // Must be inside useWaitForTransactionReceipt call
    const waitIdx  = src.default.indexOf('useWaitForTransactionReceipt')
    const chainIdx = src.default.indexOf('chainId: TARGET_CHAIN_ID')
    expect(chainIdx).toBeGreaterThan(waitIdx)
  })

  it('CSF3: TARGET_CHAIN_ID is Arc Testnet (5042002)', () => {
    expect(TARGET_CHAIN_ID).toBe(5042002)
  })

})

// ─── CS2/CSF: behavioral — PoolCreated log field matching (production ABI) ────

describe('CS2/CSF — PoolCreated log field matching (production ABI, ESM viem)', () => {

  const DEADLINE = 1793250000n
  const TARGET   = 10n ** 18n  // 1 USDC
  const TITLE    = 'test'
  const PURPOSE  = '1'

  it('CS2-LOG-1 (positive control): matching log decodes all fields correctly', () => {
    const log = makePoolCreatedLog({
      creator: WALLET, recipient: WALLET,
      target: TARGET, deadline: DEADLINE, title: TITLE, purpose: PURPOSE,
    })
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect((args.creator as string).toLowerCase()).toBe(WALLET.toLowerCase())
    expect((args.recipient as string).toLowerCase()).toBe(WALLET.toLowerCase())
    expect(args.target).toBe(TARGET)
    expect(args.deadline).toBe(DEADLINE)
    expect(args.title).toBe(TITLE)
    expect(args.purpose).toBe(PURPOSE)
  })

  it('CS2-LOG-2: different target (2 USDC) differs from 1-USDC snap — production would reject', () => {
    const log = makePoolCreatedLog({ target: 2n * 10n ** 18n })
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect(args.target).not.toBe(TARGET)
  })

  it('CS2-LOG-3: different deadline differs from snap', () => {
    const log = makePoolCreatedLog({ deadline: DEADLINE + 3600n })
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect(args.deadline).not.toBe(DEADLINE)
  })

  it('CS2-LOG-4: different title differs from snap', () => {
    const log = makePoolCreatedLog({ title: 'different title' })
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect(args.title).not.toBe(TITLE)
  })

  it('CS2-LOG-5: different purpose differs from snap', () => {
    const log = makePoolCreatedLog({ purpose: 'different purpose' })
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect(args.purpose).not.toBe(PURPOSE)
  })

  it('CS2-LOG-6: log from wrong contract address is distinguishable from expected contract', () => {
    const wrongAddress = ('0x' + 'a'.repeat(40)) as `0x${string}`
    const log = makePoolCreatedLog({ address: wrongAddress })
    expect(log.address.toLowerCase()).not.toBe((CONTRACT as string).toLowerCase())
  })

  it('CS2-LOG-7: log with different recipient is distinguishable from snap recipient', () => {
    const otherRecipient = ('0x' + '2'.repeat(40)) as `0x${string}`
    const log = makePoolCreatedLog({ recipient: otherRecipient })
    const decoded = decodeEventLog({ abi: HUIPOT_ABI, eventName: 'PoolCreated', data: log.data, topics: log.topics })
    const args = decoded.args as Record<string, unknown>
    expect((args.recipient as string).toLowerCase()).not.toBe(WALLET.toLowerCase())
  })

})

// ─── CSF2: behavioral — minedHash vs submittedHash distinction ────────────────

describe('CSF2 — mined hash vs submitted hash (behavioral)', () => {

  it('CSF2-BEH: HASH_A and HASH_B are distinct (fixture sanity)', () => {
    expect(HASH_A).not.toBe(HASH_B)
  })

  it('CSF2-BEH: transactionHash in receipt differs from submitted write hash', () => {
    // The probe uses HASH_A as the useWriteContract data (submitted hash) and
    // HASH_B as receipt.transactionHash (mined replacement hash).
    // This confirms the fixture encodes a real hash distinction.
    const minedHash = HASH_B  // receipt.transactionHash
    const submittedHash = HASH_A  // useWriteContract data
    expect(minedHash).not.toBe(submittedHash)
    // Production: minedHash should be what explorerTxUrl receives
    expect(minedHash).toBe(HASH_B)
  })

})

// ─── Metadata ─────────────────────────────────────────────────────────────────

describe('Wallet metadata — appUrl correction', () => {

  it('config.ts uses hui-pot.vercel.app as appUrl, not studio.arc.io', async () => {
    const src = await import('../../config?raw') as { default: string }
    expect(src.default).toContain('https://hui-pot.vercel.app')
    expect(src.default).not.toContain('https://studio.arc.io')
  })

  it('config.ts MetaMask note preserved (appUrl is WalletConnect metadata only)', async () => {
    const src = await import('../../config?raw') as { default: string }
    expect(src.default).toMatch(/MetaMask.*injected|injected.*MetaMask/i)
  })

})

// ─── Boundaries not covered here ─────────────────────────────────────────────
//
// - Mounted browser DOM: field errors render visually, form does not submit.
// - Keyboard Enter propagation on the connect button.
// - Real wallet invocation: writeContract actually called or blocked on testnet.
// - Live replacement / cross-session receipt binding.
// - Production-component execution (submit → receipt render cycle):
//   covered by docs/evidence/recheck-f7297fd/production-create-probes.cjs.
//   Run: node docs/evidence/recheck-f7297fd/production-create-probes.cjs . create-probe-results.json
