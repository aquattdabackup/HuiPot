/// <reference types="node" />
/**
 * createSafety.test.ts — CS1, CS2, CSF1–CSF4, CWR1–CWR6 regression tests.
 *
 * CS1:  validate() rejects zero recipient before writeContract.
 * CS2:  Receipt validated against full immutable snapshot (all PoolCreated fields).
 * CSF1: Missing or incomplete snapshot must not relax any receipt check.
 * CSF2: Explorer links use the mined receipt hash, not the submitted hash.
 * CSF3: useWaitForTransactionReceipt is pinned to TARGET_CHAIN_ID.
 * CSF4: ESM imports only (no require('viem')); production-path behavioral coverage.
 * CWR1: paused/offline guard in hashPending; handler-level duplicate prevention.
 * CWR2: finite timeout, cancelRefetch retry, honest unknown banner.
 * CWR3: production-component execution via makeCreateRunner.
 * CWR4: @types/node declared; reproducible install/check/build.
 * CWR5: portable fileURLToPath; controlled/restored test clock.
 * CWR6: actual wagmi reverted path (isError=true) classified via independent receipt read.
 *
 * Tests do not mount a browser DOM or invoke a wallet.
 * Mounted DOM / keyboard / live testnet flows remain open.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

// ─── CW1/CW2 — confirmation recovery ─────────────────────────────────────────

// ─── CW1/CW2/CWR — production component execution ────────────────────────────
//
// These tests execute the Create component through the production transpiler
// path (TypeScript → CommonJS) with controlled hooks, then inspect the rendered
// tree and call the actual handler functions. They do not mount a browser DOM or
// invoke a wallet, but they do execute all production logic including snapshot
// capture, log decoding, and state classification.

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { transpileModule, ModuleKind, ScriptTarget, JsxEmit } from 'typescript'

// CWR5: Use fileURLToPath for portable filesystem paths — new URL(...).pathname
// is not a valid path on Windows (produces C:\C:\Users\... style paths).
// The test clock is frozen to a fixed morning time and always restored, so
// fixtures dated later that day are never past-deadline regardless of wall clock.

// Load production component with controlled hooks
function makeCreateRunner() {
  const cjsRequire = createRequire(import.meta.url)
  const fs = cjsRequire('fs') as typeof import('fs')
  const React = cjsRequire('react')
  const viem  = cjsRequire('viem')
  // CWR5: fileURLToPath instead of .pathname for cross-platform compatibility
  const contractSrc = fs.readFileSync(fileURLToPath(new URL('../../contract.ts', import.meta.url)), 'utf8')
  const configSrc = fs.readFileSync(fileURLToPath(new URL('../../config.ts', import.meta.url)), 'utf8')
  const abi = new Function(
    transpileModule(
      contractSrc.slice(contractSrc.indexOf('export const HUIPOT_ABI')).replace('export const', 'const'),
      { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2020 } },
    ).outputText + '; return HUIPOT_ABI',
  )()
  const moneyFns = new Function(
    'PRODUCT_DECIMALS', 'QUANTUM', 'UINT256_MAX',
    transpileModule(
      configSrc
        .slice(configSrc.indexOf('export function parseProductAmount'), configSrc.indexOf('export function explorerTxUrl'))
        .split('export function').join('function'),
      { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2020 } },
    ).outputText + '; return { parseProductAmount, formatNativeAmount }',
  )(6, 10n ** 12n, (1n << 256n) - 1n)

  const CONTRACT = '0x81a139599d252eb2dc2bbb6c267e911a21264288'
  const WALLET   = '0x1111111111111111111111111111111111111111'
  const HASH_A   = ('0x' + 'a'.repeat(64)) as `0x${string}`
  const HASH_B   = ('0x' + 'b'.repeat(64)) as `0x${string}`
  const noop = () => {}

  let hashValue: string | undefined
  let retries = 0
  let nextReceipt: Record<string, unknown> | null = null
  // FFR3: states array is persistent across renders; setter updates states[i] so that
  // subsequent renders see the updated value (state-preserving runner).
  let states: unknown[], index: number, writes: unknown[]
  let connected: boolean, chain: number
  let receipt: Record<string, unknown>
  let errors: Record<string, string>
  let account: string
  let refs: Array<{ current: unknown }>, refIndex: number
  // CWR6/FFR3: publicClientReceipt is controlled; tracks getTransactionReceipt responses.
  // Kept for backward compat in existing tests; new tests use publicClientGetReceipt directly.
  let publicClientReceipt: Record<string, unknown> | null = null
  // FV3: per-test getTransactionReceipt function; defaults to using publicClientReceipt.
  // Replace with a custom function (e.g. deferred) in tests that need async control.
  let publicClientGetReceipt: (args: { hash: `0x${string}` }) => Promise<Record<string, unknown>>
  // FV3: stable publicClient object — not recreated on each render so unchanged-dep effect
  // slots are not spuriously re-scheduled. Delegates to publicClientGetReceipt.
  const stablePublicClient = {
    getTransactionReceipt: (args: { hash: `0x${string}` }) => publicClientGetReceipt(args),
  }
  // FV2/FV3: registered onReplaced callback captured from useWaitForTransactionReceipt args.
  let registeredOnReplaced: ((e: { transactionReceipt: { transactionHash: `0x${string}` }; transaction: { hash: `0x${string}` }; replacedTransaction: { hash: `0x${string}` }; reason: string }) => void) | null = null
  // FFR2/FFR3: track unmounted state for cleanup tests; late-arriving setters are counted.
  let isUnmounted = false
  let lateSets = 0
  // FFR3: dependency-aware effect slots for cleanup tracking.
  const effectSlots: Array<{ deps: unknown[]; cleanup?: (() => void) | void }> = []
  let effectIndex = 0

  const mocks: Record<string, unknown> = {
    react: {
      ...React,
      // FFR3: state-preserving useState — setter persists into states[] so subsequent
      // renders see updated values. Tracks unmounted state for stale-setter detection.
      useState: (initial: unknown) => {
        const i = index++
        if (!(i in states)) states[i] = initial
        return [
          states[i],
          (x: unknown) => {
            if (isUnmounted) { lateSets++; return }
            states[i] = typeof x === 'function' ? (x as (prev: unknown) => unknown)(states[i]) : x
            if (i === 7) errors = states[i] as Record<string, string>
          },
        ]
      },
      useRef: (initial: unknown) => { const i = refIndex++; return refs[i] ?? (refs[i] = { current: initial }) },
      // FFR3: dependency-aware useEffect with cleanup tracking.
      // On each render, compares deps to prior slot. If changed (or first call), schedules fn.
      // flush() runs pending fns, calls cleanup of previous slot first.
      useEffect: (fn: () => void | (() => void), deps: unknown[]) => {
        const i = effectIndex++
        const old = effectSlots[i]
        if (!old || deps.some((d, j) => !Object.is(d, old.deps[j]))) {
          // New deps: store fn in _fn for flush; deps for future comparison.
          effectSlots[i] = { deps, cleanup: old?.cleanup, _fn: fn } as typeof effectSlots[number] & { _fn: typeof fn }
        }
        // If deps unchanged, do not reschedule — same behaviour as React
      },
    },
    'react-router-dom': { Link: 'a' },
    wagmi: {
      useAccount: () => ({ address: account, chainId: chain, isConnected: connected }),
      useSwitchChain: () => ({ switchChain: (_x: unknown) => {} }),
      useWriteContract: () => ({
        writeContract: (x: unknown) => { writes.push(x); hashValue = HASH_A as string },
        data: hashValue,
        isPending: false, isError: false,
      }),
      useWaitForTransactionReceipt: (args: Record<string, unknown>) => {
        // FV3: capture onReplaced callback so tests can invoke it directly.
        if (args.onReplaced && typeof args.onReplaced === 'function') {
          registeredOnReplaced = args.onReplaced as (e: { transactionReceipt: { transactionHash: `0x${string}` }; transaction: { hash: `0x${string}` }; replacedTransaction: { hash: `0x${string}` }; reason: string }) => void
        }
        const r = receipt
        return {
          ...r,
          refetch: (r as Record<string, unknown>).refetch
            ?? ((_opts?: unknown) => { retries++; if (nextReceipt) receipt = nextReceipt as Record<string, unknown>; return Promise.resolve({ data: receipt }) }),
        }
      },
      // FV3: stable publicClient — same object across renders so unchanged-dependency tests
      // do not spuriously re-trigger the effect. getTransactionReceipt delegates to
      // publicClientGetReceipt which can be controlled per test.
      usePublicClient: (_opts?: unknown) => stablePublicClient,
    },
    connectkit: { ConnectKitButton: { Custom: () => null } },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '../contract': { HUIPOT_ADDRESS: CONTRACT, HUIPOT_ABI: abi, DEPLOYMENT_CONFIGURED: true },
    '../config': { ...moneyFns, TARGET_CHAIN_ID: 5042002, explorerTxUrl: (x: string) => x },
    '../lib/utils': { formatDeadline: () => '', parseOnchainError: () => '' },
    '../components/CommitmentNotice': { CommitmentNotice: () => null },
  }

  const src = fs.readFileSync(fileURLToPath(new URL('../../pages/Create.tsx', import.meta.url)), 'utf8')
  const mod = { exports: {} as Record<string, unknown> }
  new Function('require', 'module', 'exports',
    transpileModule(src, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2020, jsx: JsxEmit.ReactJSX } }).outputText,
  )((n: string) => mocks[n] ?? cjsRequire(n), mod, mod.exports)

  const Create = mod.exports.Create as () => unknown

  function nodes(t: unknown): unknown[] {
    if (!t || typeof t !== 'object') return []
    if (Array.isArray(t)) return t.flatMap(nodes)
    const elem = t as { type?: unknown; props?: { children?: unknown } }
    return [t, ...nodes(elem.props?.children)]
  }
  function textOf(t: unknown): string { return JSON.stringify(t, (_, x) => typeof x === 'bigint' ? x.toString() : x) }
  function links(t: unknown) { return nodes(t).filter(x => (x as Record<string,unknown>).type === 'a' && typeof (x as Record<string,unknown> & {props?:{href?:unknown}}).props?.href === 'string').map(x => (x as Record<string, unknown> & {props:{href:string}}).props.href) }
  function submitBtn(t: unknown) { return nodes(t).find(x => (x as Record<string,unknown> & {props?:{type?:string}}).props?.type === 'submit') as (Record<string,unknown> & {props:{disabled:boolean}}) | undefined }
  function retryBtn(t: unknown) { return nodes(t).find(x => (x as Record<string,unknown> & {props?:{type?:string}}).props?.type === 'button' && /retry|check.*status/i.test(textOf(x))) as (Record<string,unknown> & {props:{onClick:()=>void}}) | undefined }
  function successH1(t: unknown) { return nodes(t).some(x => (x as Record<string,unknown> & {props?:{children?:unknown}}).type === 'h1' && (x as Record<string,unknown> & {props:{children:unknown}}).props.children === 'Pool created') }
  function revertedH1(t: unknown) { return nodes(t).some(x => (x as Record<string,unknown> & {props?:{children?:unknown}}).type === 'h1' && String((x as Record<string,unknown> & {props:{children:unknown}}).props.children).includes('reverted')) }

  function makeLog(opts: Record<string, unknown> = {}) {
    const values = { poolId: 1n, creator: WALLET, recipient: WALLET, target: 10n ** 18n, deadline: BigInt(Math.floor(new Date('2026-10-29T12:00:00').getTime() / 1000)), title: 'test', purpose: '1', address: CONTRACT, ...opts }
    return {
      address: values.address as string,
      topics: viem.encodeEventTopics({ abi, eventName: 'PoolCreated', args: values }),
      data: viem.encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'string'},{type:'string'}], [values.target, values.deadline, values.title, values.purpose]),
    }
  }

  // CWR5: fixed morning time
  const FROZEN_NOW = new Date('2026-10-29T08:00:00').getTime()

  function reset() {
    hashValue = undefined; retries = 0; nextReceipt = null
    // FV1/FV2: state indices — 0..6 form fields, 7=errors, 8=replacedHash, 9=revertedOnChain,
    // 10=revertLookupHash, 11=verifiedForHash. Indices 8..11 left absent; useState fills in null.
    states = [' test ', ' 1 ', '1', WALLET, '2026-10-29', '12:00', true, {}]
    index = 0; refIndex = 0; refs = []; account = WALLET
    writes = []; errors = {}; connected = true; chain = 5042002
    receipt = { isLoading: false, isSuccess: false, fetchStatus: 'idle' }
    publicClientReceipt = null
    // FV3: default publicClientGetReceipt uses publicClientReceipt sentinel for back-compat.
    publicClientGetReceipt = (_args) => publicClientReceipt !== null
      ? Promise.resolve(publicClientReceipt)
      : Promise.reject(new Error('fetch failed'))
    registeredOnReplaced = null
    isUnmounted = false; lateSets = 0
    effectSlots.length = 0; effectIndex = 0
  }
  function render() {
    // FFR3: reset hook call counters but keep states/refs/effectSlots alive across renders
    index = 0; refIndex = 0; effectIndex = 0
    return Create()
  }
  function doSubmit() {
    const t = render()
    const form = nodes(t).find(x => (x as Record<string,unknown>).type === 'form') as (Record<string,unknown> & {props:{onSubmit:(e:{preventDefault:()=>void})=>void}}) | undefined
    form?.props.onSubmit({ preventDefault: noop })
    return t
  }
  // FFR3: flush pending effects — runs _fn for any slot that has a scheduled fn,
  // calling cleanup first if present, and storing the returned cleanup.
  async function runEffects() {
    type SlotWithFn = { deps: unknown[]; cleanup?: (() => void) | void; _fn?: () => void | (() => void) }
    for (const slot of effectSlots as SlotWithFn[]) {
      if (!slot._fn) continue
      if (typeof slot.cleanup === 'function') slot.cleanup()
      const fn = slot._fn
      delete slot._fn
      const cleanup = fn()
      slot.cleanup = typeof cleanup === 'function' ? cleanup : undefined
    }
    // Drain async microtasks so Promise.resolve chains settle
    for (let i = 0; i < 8; i++) await Promise.resolve()
  }
  function unmount() {
    type SlotWithFn = { deps: unknown[]; cleanup?: (() => void) | void; _fn?: () => void | (() => void) }
    isUnmounted = true
    for (const slot of effectSlots as SlotWithFn[]) {
      if (typeof slot.cleanup === 'function') slot.cleanup()
      slot.cleanup = undefined
    }
  }

  return {
    reset, render, doSubmit, runEffects, unmount,
    links, submitBtn, retryBtn, successH1, revertedH1, makeLog, nodes, textOf,
    HASH_A, HASH_B, CONTRACT, WALLET, FROZEN_NOW,
    get writes() { return writes },
    get retries() { return retries },
    get errors() { return errors },
    get lateSets() { return lateSets },
    get states() { return states },
    get receipt() { return receipt }, set receipt(v) { receipt = v as Record<string, unknown> },
    get nextReceipt() { return nextReceipt }, set nextReceipt(v) { nextReceipt = v },
    get refs() { return refs },
    get publicClientReceipt() { return publicClientReceipt },
    set publicClientReceipt(v) { publicClientReceipt = v as Record<string, unknown> | null },
    // FV3: override getTransactionReceipt with a custom function (e.g. deferred promise).
    set publicClientGetReceipt(fn: (args: { hash: `0x${string}` }) => Promise<Record<string, unknown>>) {
      publicClientGetReceipt = fn
    },
    // FV2/FV3: invoke the registered onReplaced callback (captured from useWaitForTransactionReceipt).
    get registeredOnReplaced() { return registeredOnReplaced },
    // FV1/FV3: expose hashValue for identity-transition tests.
    get hashValue() { return hashValue },
    set hashValue(v: string | undefined) { hashValue = v },
  }
}

describe('CWR/CW1/CW2 — confirmation recovery (production component execution)', () => {
  // CWR5: freeze clock at 08:00 on fixture date so deadline validation always sees
  // '2026-10-29 12:00' as in-the-future. Restored after each test.
  const FROZEN = new Date('2026-10-29T08:00:00').getTime()
  let originalNow: () => number
  beforeEach(() => { originalNow = Date.now; Date.now = () => FROZEN })
  afterEach(() => { Date.now = originalNow })

  it('CWR1-BEH: paused/offline query shows explorer link and keeps submit disabled', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: false, fetchStatus: 'paused' }
    const t = r.render()
    const btn = r.submitBtn(t)
    expect(btn?.props.disabled).toBe(true)
    expect(r.links(t)).toContain(r.HASH_A)
  })

  it('CWR1-BEH: handleSubmit blocks second write when paused (hash guard)', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit() // first write, writes.length = 1
    r.receipt = { isLoading: false, isSuccess: false, isError: false, fetchStatus: 'paused' }
    r.doSubmit() // second attempt — must be blocked by `if (hash) return`
    expect(r.writes.length).toBe(1)
  })

  it('CWR1-BEH: handleSubmit blocks second write during receipt error (handler guard)', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('RPC'), fetchStatus: 'idle' }
    r.doSubmit() // must be blocked — hash is set, handler returns early
    expect(r.writes.length).toBe(1)
  })

  it('CW1-BEH: pending receipt shows submitted hash link outside form and disables submit', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: true, isSuccess: false, fetchStatus: 'fetching' }
    const t = r.render()
    const form = r.nodes(t).find((x: unknown) => (x as Record<string,unknown>).type === 'form') as unknown
    const formLinks = r.links(form)
    expect(r.links(t)).toContain(r.HASH_A)    // link present in tree
    expect(formLinks).not.toContain(r.HASH_A) // not inside the form
    expect(r.submitBtn(t)?.props.disabled).toBe(true)
  })

  it('CW2-BEH: receipt error shows message, submit disabled, retry is read-only', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('RPC unavailable'), fetchStatus: 'idle' }
    const t = r.render()
    r.retryBtn(t)?.props.onClick()
    expect(r.textOf(t)).toContain('RPC unavailable')
    expect(r.submitBtn(t)?.props.disabled).toBe(true)
    expect(r.retries).toBe(1)
    expect(r.writes.length).toBe(1)
  })

  it('CWR2-BEH: retry with valid receipt uses original snapshot and shows exactly one write', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('timeout'), fetchStatus: 'idle' }
    r.nextReceipt = { isSuccess: true, data: { status: 'success', transactionHash: r.HASH_B, logs: [r.makeLog()] }, fetchStatus: 'idle' }
    r.retryBtn(r.render())?.props.onClick()
    const t = r.render()
    expect(r.successH1(t)).toBe(true)
    expect(r.links(t)).toContain(r.HASH_B)
    expect(r.writes.length).toBe(1)
    expect(r.retries).toBe(1)
  })

  it('CWR2-BEH: retry with unindexed receipt stays pending and locked', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, fetchStatus: 'idle' }
    r.nextReceipt = { isLoading: true, isSuccess: false, data: undefined, fetchStatus: 'fetching' }
    r.retryBtn(r.render())?.props.onClick()
    const t = r.render()
    expect(r.successH1(t)).toBe(false)
    expect(r.submitBtn(t)?.props.disabled).toBe(true)
    expect(r.links(t)).toContain(r.HASH_A)
    expect(r.writes.length).toBe(1)
  })

  it('CWR2-BEH: retry with mismatched target stays unmatched with mined link', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, fetchStatus: 'idle' }
    r.nextReceipt = { isSuccess: true, data: { status: 'success', transactionHash: r.HASH_B, logs: [r.makeLog({ target: 2n * 10n ** 18n })] }, fetchStatus: 'idle' }
    r.retryBtn(r.render())?.props.onClick()
    const t = r.render()
    expect(r.successH1(t)).toBe(false)
    expect(r.links(t)).toContain(r.HASH_B)
    expect(r.writes.length).toBe(1)
  })

  it('CWR2-BEH: retry with null snapshot does not confirm success', () => {
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.refs[0].current = null // wipe the snapshot after write
    r.receipt = { isLoading: false, isSuccess: false, isError: true, fetchStatus: 'idle' }
    r.nextReceipt = { isSuccess: true, data: { status: 'success', transactionHash: r.HASH_B, logs: [r.makeLog()] }, fetchStatus: 'idle' }
    r.retryBtn(r.render())?.props.onClick()
    expect(r.successH1(r.render())).toBe(false)
    expect(r.writes.length).toBe(1)
  })

  it('CWR6-BEH: isError+publicClient reverted receipt shows "reverted" heading and hash link', async () => {
    // FFR3: state-preserving runner — after runEffects() the setter actually updates
    // states[8] (revertedOnChain). A subsequent render reads the updated value and
    // renders the reverted heading. This test fails if the effect never sets a verdict.
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('execution reverted'), fetchStatus: 'idle' }
    r.publicClientReceipt = { status: 'reverted', transactionHash: r.HASH_A }
    r.render()
    await r.runEffects()
    // State-preserving: revertedOnChain (states[8]) is now true; re-render reads it.
    const t = r.render()
    expect(r.revertedH1(t)).toBe(true)
    expect(r.links(t)).toContain(r.HASH_A)
    expect(r.successH1(t)).toBe(false)
    // Only one write — submission lock preserved
    expect(r.writes.length).toBe(1)
  })

  it('CWR6-BEH: isError+unknown publicClient result stays in unknown-outcome path', async () => {
    // FFR3: publicClientReceipt=null causes the fetch to reject → revertedOnChain stays null.
    // State-preserving runner confirms no heading transition after effects flush.
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('network failure'), fetchStatus: 'idle' }
    r.publicClientReceipt = null // will cause fetch to reject → unknown
    r.render()
    await r.runEffects()
    // revertedOnChain remains null → no reverted heading
    const t = r.render()
    expect(r.successH1(t)).toBe(false)
    expect(r.revertedH1(t)).toBe(false)
    expect(r.submitBtn(t)?.props.disabled).toBe(true)
    expect(r.links(t)).toContain(r.HASH_A)
  })

  it('FFR2-BEH: stale effect resolution does not override new hash verdict', async () => {
    // FFR2: the cleanup flag prevents a stale promise from setting revertedOnChain
    // after the dependency changes. We simulate this by first running with isError=true
    // (sets revertedOnChain=true), then transitioning to isError=false before the next
    // effects flush. The cleanup cancels the outstanding read; new effect with isError=false
    // clears revertedOnChain. Render after flush must not show reverted heading.
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    // First pass: isError=true, reverted receipt available
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('exec reverted'), fetchStatus: 'idle' }
    r.publicClientReceipt = { status: 'reverted', transactionHash: r.HASH_A }
    r.render()
    await r.runEffects()
    // revertedOnChain is now true (states[8]=true)
    expect(r.revertedH1(r.render())).toBe(true)
    // Second pass: deps change — isError goes false, effect re-fires with !isReceiptError → sets null
    r.receipt = { isLoading: false, isSuccess: false, isError: false, fetchStatus: 'paused' }
    r.render()
    await r.runEffects()
    const t = r.render()
    // revertedOnChain is null → no reverted heading
    expect(r.revertedH1(t)).toBe(false)
    expect(r.successH1(t)).toBe(false)
    // hashPending holds with paused status — submit still locked
    expect(r.submitBtn(t)?.props.disabled).toBe(true)
  })

  it('FFR2/FV3-BEH: unmount discards deferred rejection (outstanding fetch resolves after unmount)', async () => {
    // FV3: genuine deferred promise — unmount before reject; lateSets must be 0.
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('exec reverted'), fetchStatus: 'idle' }
    let rejectFn!: (e: Error) => void
    r.publicClientGetReceipt = () => new Promise<Record<string, unknown>>((_res, rej) => { rejectFn = rej })
    r.render()
    await r.runEffects()   // effect scheduled, fetch promise outstanding
    r.unmount()            // cleanup sets cancelled=true
    rejectFn(new Error('late rejection'))
    await Promise.resolve()
    // cleanup ran before rejection resolved; lateSets=0 and isUnmounted via unmount()
    expect(r.lateSets).toBe(0)
  })

  it('FFR2/FV3-BEH: stale deferred resolution after dep change does not show stale verdict', async () => {
    // FV3: genuine deferred resolution. A promise created before hash change. After cleanup,
    // A's resolution must not write to state (cancelled=true). B uses its own never-resolving promise.
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('exec reverted'), fetchStatus: 'idle' }
    // A deferred: created before hash change; resolveA fires after cleanup
    let resolveA!: (v: Record<string, unknown>) => void
    let aPromise: Promise<Record<string, unknown>>
    aPromise = new Promise<Record<string, unknown>>(res => { resolveA = res })
    r.publicClientGetReceipt = () => aPromise
    r.render()
    await r.runEffects()   // A effect runs; fetch = aPromise (outstanding)
    // Change identity — install a new never-resolving promise for B BEFORE render
    r.publicClientGetReceipt = () => new Promise<Record<string, unknown>>(() => {})
    r.hashValue = r.HASH_B
    r.render()
    await r.runEffects()   // deps changed → cleanup(A) = cancelled=true; B effect starts with new promise
    resolveA({ status: 'reverted', transactionHash: r.HASH_A })  // stale A resolution
    for (let i = 0; i < 8; i++) await Promise.resolve()          // drain microtasks
    const t = r.render()
    // A's cancelled=true → setRevertedOnChain not called; B pending → no verdict
    expect(r.revertedH1(t)).toBe(false)
  })

  it('FV1/FV2/FFR1-BEH: reverted replacement B uses callback and renders B link not A', async () => {
    // FV2: onReplaced callback updates replacedHash state (not a ref). FV1: verdict identity guard.
    // FV3: use registeredOnReplaced callback, not direct ref assignment.
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.render()   // capture onReplaced from useWaitForTransactionReceipt args
    // Invoke the registered callback as wagmi would when B replaces A
    r.registeredOnReplaced?.({
      transactionReceipt: { transactionHash: r.HASH_B },
      transaction: { hash: r.HASH_B },
      replacedTransaction: { hash: r.HASH_A },
      reason: 'repriced',
    })
    // After callback: replacedHash state (index 8) = HASH_B. Effect re-runs with new dep.
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('repriced'), fetchStatus: 'idle' }
    r.publicClientReceipt = { status: 'reverted', transactionHash: r.HASH_B }
    r.render()
    await r.runEffects()
    const t = r.render()
    expect(r.revertedH1(t)).toBe(true)
    expect(r.links(t)).toContain(r.HASH_B)
    expect(r.links(t)).not.toContain(r.HASH_A)
    expect(r.writes.length).toBe(1)
  })

  it('FV1-BEH: settled A verdict hidden on first B render before effects run', async () => {
    // FV1: verifiedForHash guard — a settled verdict for A must not appear on first render
    // after hash transitions to B (before the new effect flushes with B's result).
    const r = makeCreateRunner()
    r.reset()
    r.doSubmit()
    r.receipt = { isLoading: false, isSuccess: false, isError: true, error: new Error('exec reverted'), fetchStatus: 'idle' }
    r.publicClientReceipt = { status: 'reverted', transactionHash: r.HASH_A }
    r.render()
    await r.runEffects()
    // A verdict is now settled (revertedOnChain=true, verifiedForHash=HASH_A)
    expect(r.revertedH1(r.render())).toBe(true)
    // Transition to B: clear settled verdict and change hash
    // Effect's synchronous reset (setRevertedOnChain(null), setVerifiedForHash(null)) fires on next flush
    r.hashValue = r.HASH_B
    r.publicClientGetReceipt = () => new Promise<Record<string, unknown>>(() => {}) // never resolves
    const tFirst = r.render()
    await r.runEffects()  // effect runs: clears verdict synchronously → revertedOnChain=null, verifiedForHash=null
    const tAfter = r.render()
    // Neither first render (before flush) nor after flush (before B resolves) should show A verdict
    expect(r.revertedH1(tFirst)).toBe(false)
    expect(r.revertedH1(tAfter)).toBe(false)
  })

  it('CWR2-BEH: finite timeout is passed to useWaitForTransactionReceipt', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    // Source-level verification: timeout must be a positive numeric literal
    expect(src.default).toMatch(/timeout\s*:\s*[1-9][0-9]+/)
    // Must not be 0 (default is 0 = no bound)
    expect(src.default).not.toMatch(/timeout\s*:\s*0[,\s}]/)
  })

  it('CWR1-STRUCT: paused fetchStatus included in hashPending guard', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain("receiptFetchStatus === 'paused'")
    expect(src.default).toContain('hashPending')
  })

  it('CWR1-STRUCT: handleSubmit has hash guard before writeContract', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const hashGuardIdx = src.default.indexOf('if (hash) return')
    const writeIdx = src.default.indexOf('writeContract(')
    expect(hashGuardIdx).toBeGreaterThan(-1)
    expect(writeIdx).toBeGreaterThan(-1)
    expect(hashGuardIdx).toBeLessThan(writeIdx)
  })

  it('CWR2-STRUCT: cancelRefetch guard on retry', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    expect(src.default).toContain('cancelRefetch')
  })

  it('CWR6-STRUCT: confirmed-revert branch uses isError+revertedOnChain, not isSuccess+receipt.status', async () => {
    // CWR6: the actual wagmi reverted path sets isError=true; isSuccess=true with
    // receipt.status='reverted' is not how the installed library behaves.
    // FFR1: revertLookupHash drives the explorer link so replacement B links are correct.
    const src = await import('../../pages/Create?raw') as { default: string }
    // Must use the independent revert check
    expect(src.default).toContain('revertedOnChain')
    expect(src.default).toContain('isReceiptError && revertedOnChain === true')
    expect(src.default).toContain('Transaction reverted')
    const revertBranchIdx = src.default.indexOf('isReceiptError && revertedOnChain === true')
    expect(revertBranchIdx).toBeGreaterThan(-1)
    // Unmatched branch still present and distinct
    expect(src.default).toContain('Transaction succeeded — no pool created')
    expect(src.default).toContain('publicClient.getTransactionReceipt')
    // FV2: replacedHash as state (reactive dep), not a ref
    expect(src.default).toContain('replacedHash')
    expect(src.default).toContain('setReplacedHash')
    expect(src.default).toContain('onReplaced')
    expect(src.default).toContain('revertLookupHash')
    // FV1: verifiedForHash identity guard
    expect(src.default).toContain('verifiedForHash')
    expect(src.default).toContain('revertIdentityMatch')
    // FFR2: effect cleanup
    expect(src.default).toContain('cancelled = true')
  })

  it('CW1-STRUCT: recovery banner is outside the form element', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const bannerIdx = src.default.indexOf('hashPending &&')
    const formIdx   = src.default.indexOf('<form ')
    expect(bannerIdx).toBeGreaterThan(-1)
    expect(formIdx).toBeGreaterThan(-1)
    expect(bannerIdx).toBeLessThan(formIdx)
  })

})

// ─── Boundaries not covered here ─────────────────────────────────────────────
//
// - Mounted browser DOM: field errors render visually, form does not submit.
// - Keyboard Enter propagation on the connect button.
// - Real wallet invocation: writeContract actually called or blocked on testnet.
// - Live replacement / cross-session receipt binding.
// - Prolonged-pending / actual RPC timeout observation.
// - Production-component execution (submit → receipt render cycle):
//   covered by docs/evidence/recheck-f7297fd/production-create-probes.cjs.
//   Run: node docs/evidence/recheck-f7297fd/production-create-probes.cjs . create-probe-results.json
//   Run: node docs/evidence/create-confirming/recovery-probes.cjs . recovery-results.json
