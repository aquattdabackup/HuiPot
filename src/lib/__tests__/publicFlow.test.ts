/**
 * publicFlow.test.ts — PF1 and PF2 regression tests.
 *
 * PF1: Pool.tsx and Proof.tsx previously conflated InvalidPoolId contract reverts
 * (which wagmi surfaces as isError) with genuine network/transport failures.
 * Fix: derive poolAbsentByCount (ID > loaded count) and poolNetworkError
 * (isError without absence evidence) independently before rendering.
 *
 * PF2: ConnectKitButton inside <form onSubmit=handleSubmit> had no explicit type.
 * Clicking it triggered form submission, showing validation errors before any
 * wallet connection attempt. Fix: ConnectKitButton.Custom renders type="button";
 * handleSubmit also returns early if !isConnected.
 *
 * These tests verify production source structure. No mounted React/wagmi browser
 * test is included; that boundary is stated explicitly below. Source probes use
 * the raw import pattern already established in verifyTx.test.ts and
 * validateReceipt.test.ts.
 */

import { describe, it, expect } from 'vitest'

// ─── PF1 classification logic (production source proof) ───────────────────────

describe('PF1 — Pool.tsx: network error vs not-found classification', () => {

  it('PF1-STRUCT: Pool.tsx derives poolAbsentByCount from count and ID', async () => {
    const src = await import('../../pages/Pool?raw') as { default: string }
    const code = src.default
    // Must derive absence from count
    expect(code).toContain('poolAbsentByCount')
    // Must only show not-found when count evidence exists
    expect(code).toContain('poolNotFound')
    // Must distinguish transport error from absence
    expect(code).toContain('poolNetworkError')
  })

  it('PF1-STRUCT: Pool.tsx poolNetworkError requires !poolAbsentByCount', async () => {
    const src = await import('../../pages/Pool?raw') as { default: string }
    const code = src.default
    expect(code).toContain('poolRpcError && !poolAbsentByCount')
  })

  it('PF1-STRUCT: Pool.tsx Retry button refetches both pool and count', async () => {
    const src = await import('../../pages/Pool?raw') as { default: string }
    const code = src.default
    // Retry in the network error branch must also refetch count so classification can resolve
    expect(code).toContain('refetchPoolCount')
    // The network error branch must call both refetch functions
    expect(code).toMatch(/refetchPool\(\)[\s\S]{0,80}refetchPoolCount\(\)/)
  })

  it('PF1-STRUCT: Pool.tsx not-found branch does NOT appear when poolRpcError alone', async () => {
    const src = await import('../../pages/Pool?raw') as { default: string }
    const code = src.default
    // Old code: if (poolRpcError) → not found. New code must NOT conflate them.
    // The poolRpcError guard must lead to poolNetworkError, not directly to not-found message.
    expect(code).not.toMatch(/poolRpcError[\s\S]{0,50}Pool not found/)
  })

  it('PF1-CLASSIFY: absent-by-count logic — ID > count means absent', () => {
    // Simulate the production classification: poolAbsentByCount = count loaded AND id > count
    function classify(poolRpcError: boolean, poolCount: bigint | undefined, poolIdBig: bigint) {
      const countLoaded = poolCount !== undefined
      const poolAbsentByCount = countLoaded && poolIdBig > poolCount
      const poolNotFound = poolAbsentByCount
      const poolNetworkError = poolRpcError && !poolAbsentByCount
      return { poolNotFound, poolNetworkError }
    }

    // count=0, getPool(1) errors → absent (InvalidPoolId revert → classified as not-found)
    expect(classify(true, 0n, 1n)).toEqual({ poolNotFound: true, poolNetworkError: false })

    // count=5, ID=3 errors → network (pool 3 should exist)
    expect(classify(true, 5n, 3n)).toEqual({ poolNotFound: false, poolNetworkError: true })

    // count=5, ID=6 errors → absent
    expect(classify(true, 5n, 6n)).toEqual({ poolNotFound: true, poolNetworkError: false })

    // no error, count not loaded → no classification yet
    expect(classify(false, undefined, 1n)).toEqual({ poolNotFound: false, poolNetworkError: false })

    // count not loaded, getPool errors → transport error (no count evidence)
    expect(classify(true, undefined, 1n)).toEqual({ poolNotFound: false, poolNetworkError: true })

    // count=2, ID=2 (existing pool) → no error, no absent
    expect(classify(false, 2n, 2n)).toEqual({ poolNotFound: false, poolNetworkError: false })
  })

})

describe('PF1 — Proof.tsx: network error vs not-found classification', () => {

  it('PF1-PROOF-STRUCT: Proof.tsx derives poolAbsentByCount and poolNetworkError', async () => {
    const src = await import('../../pages/Proof?raw') as { default: string }
    const code = src.default
    expect(code).toContain('poolAbsentByCount')
    expect(code).toContain('poolNetworkError')
    expect(code).toContain('poolError && !poolAbsentByCount')
  })

  it('PF1-PROOF-STRUCT: Proof.tsx poolNetworkError branch has a Retry button', async () => {
    const src = await import('../../pages/Proof?raw') as { default: string }
    const code = src.default
    // Must show retryable error for transport failures
    expect(code).toContain('refetchPool')
    expect(code).toContain('refetchPoolCount')
    // Network error message must differ from not-found
    expect(code).toContain('Could not reach the network')
  })

  it('PF1-PROOF-STRUCT: Proof.tsx not-found does not show for poolError alone', async () => {
    const src = await import('../../pages/Proof?raw') as { default: string }
    const code = src.default
    // Old pattern was: if (poolError || !pool || count > id) → not found
    // New pattern must use poolNetworkError and poolAbsentByCount separately
    expect(code).not.toMatch(/poolError[\s\S]{0,80}not found/)
  })

})

// ─── PF2 — Create.tsx: connect button must not submit form ────────────────────

describe('PF2 — Create.tsx: connect button semantics', () => {

  it('PF2-STRUCT: ConnectKitButton.Custom used inside form for connect (not plain ConnectKitButton)', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    // Must use Custom renderer so we control the button element
    expect(code).toContain('ConnectKitButton.Custom')
  })

  it('PF2-STRUCT: connect button has explicit type="button" to prevent form submit', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    // The connect button inside the form must be type="button"
    expect(code).toContain('type="button"')
    // And it must be in the connect path (not just the switchChain button)
    // The switchChain button already had type="button"; the new connect button adds a second
    expect((code.match(/type="button"/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('PF2-STRUCT: handleSubmit returns early when disconnected', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    // Must guard against disconnected submission
    expect(code).toContain('if (!isConnected) return')
  })

  it('PF2-STRUCT: ConnectKitButton.Custom onClick calls show() to open wallet chooser', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    // The custom render must call the show() callback
    expect(code).toContain('onClick={show}')
  })

  it('PF2-STRUCT: plain ConnectKitButton (without .Custom) no longer appears inside form', async () => {
    const src = await import('../../pages/Create?raw') as { default: string }
    const code = src.default
    // ConnectKitButton.Custom is still imported via ConnectKitButton namespace
    // but the bare <ConnectKitButton ... /> inside the form must be gone
    // (it was replaced by ConnectKitButton.Custom renderer)
    // Check: no bare ConnectKitButton with label= or without .Custom suffix inside a form context
    // The original had: <ConnectKitButton label="Connect wallet to create" />
    expect(code).not.toContain('label="Connect wallet to create"')
  })

  // Note: browser DOM and wallet-chooser behavior (zero validation errors on connect click,
  // wallet chooser opening, no writeContract on disconnected Enter) cannot be verified in
  // vitest without a full React/wagmi/JSDOM mount. These structural checks confirm the
  // source encodes the correct semantics; browser validation is out of scope here.

})
