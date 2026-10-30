# Verdict identity fix report — FV1–FV4

Date: studio run following Codex recheck of fc83aa6 (session 1) and VT1 follow-up (session 2).

**Input commit reviewed by Codex (FV1–FV4):** `fc83aa60750c92a41acee00931b2d6baa7ca4ff4`  
**Input to FV1–FV4 session (pulled from main):** `c7c74c9023ca63d9c3a571f03b964f93e3fb7143`  
**Output of FV1–FV4 session:** `d6d5c8e62f3b593b3e4736f08065ffb69c4b51cd`  
**Input to VT1 session (pulled from main):** `14645aa6191faeef30508a1c74f3f46d8578428f`  
**Output SHA (VT1 session):** see git commit below

---

## Findings addressed

### FV1 — settled verdict bound to verified identity

**Problem:** `revertedOnChain === true` was rendered whenever `isReceiptError` was true, regardless of whether the settled verdict had been verified for the current active lookup hash. After a hash A → hash B transition, the first render before effects run still showed A's verdict.

**Fix in `src/pages/Create.tsx`:**

- Added `verifiedForHash` state (initialized null). At the start of the effect it is cleared to null (alongside `setRevertedOnChain(null)` and `setRevertLookupHash(lookupHash)`) before the async fetch begins. It is then assigned the `lookupHash` in the `.then()` resolve handler after a successful receipt read, and cleared back to null in the `.catch()` reject handler. It is never written before the fetch completes.
- Added `activeLookup = replacedHash ?? hash` derived value.
- Render guard: `revertIdentityMatch = verifiedForHash !== null && verifiedForHash === revertLookupHash && verifiedForHash === activeLookup`. The revert UI is shown only when all three conditions hold.
- The `activeLookup` check is a synchronous render-time identity guard: it fails on the first render after a hash/replacement change (before effects run) because `verifiedForHash` still matches the old identity while `activeLookup` has already advanced to the new one.

### FV2 — replacement identity is reactive

**Problem:** `replacedHashRef.current` was a mutable ref. `onReplaced` wrote to it but did not schedule a re-render. The effect dependency list did not include the ref value, so a replacement callback arriving while `isReceiptError` was unchanged and `hash` was unchanged would not re-trigger the effect.

**Fix in `src/pages/Create.tsx`:**

- Replaced `replacedHashRef` (useRef) with `replacedHash` state (useState, initialized null).
- `onReplaced` callback now calls `setReplacedHash(transactionReceipt.transactionHash)`.
- Effect dependency list: `[isReceiptError, hash, replacedHash, publicClient]`. A replacement callback arriving at any point updates `replacedHash` state, triggers a re-render, and causes the effect to re-run with the new lookup identity.
- `replacedHashRef` removed; ref indices: `refs[0] = submittedRef` only.

**Effect body (unchanged logic, new deps):**

```ts
const lookupHash = replacedHash ?? hash
setRevertLookupHash(lookupHash)
setRevertedOnChain(null)      // synchronous reset before async
setVerifiedForHash(null)      // synchronous reset before async
void publicClient.getTransactionReceipt({ hash: lookupHash }).then(r => {
  if (cancelled) return
  setRevertedOnChain(r.status === 'reverted')
  setVerifiedForHash(lookupHash)   // record which hash this verdict is for
}).catch(() => {
  if (cancelled) return
  setRevertedOnChain(null)
  setVerifiedForHash(null)
})
return () => { cancelled = true }
```

### FV3 — maintained lifecycle coverage

**Problem:** FFR1-BEH assigned `refs[1]` directly (no longer valid now that `replacedHashRef` is removed). The stale-resolution and unmount tests used immediately-settling promises, so no genuine outstanding promise existed at cleanup time.

**Fixes in `src/lib/__tests__/createSafety.test.ts`:**

1. **Stable publicClient mock.** `usePublicClient` now returns `stablePublicClient`, a constant object whose `getTransactionReceipt` delegates to the per-test-controlled `publicClientGetReceipt` function. The object reference is stable across renders so unchanged-dep effect slots are not spuriously rescheduled.

2. **`publicClientGetReceipt` setter.** Tests can replace the per-call function with a deferred factory (`() => new Promise(res => { resolveFn = res })`), giving genuine async control over when the receipt resolves or rejects.

3. **`registeredOnReplaced` capture.** `useWaitForTransactionReceipt` mock now reads `args.onReplaced` and stores it in `registeredOnReplaced`. Tests that need to fire the replacement callback use `r.registeredOnReplaced({transactionReceipt:{transactionHash:HASH_B},...})` rather than writing to a ref.

4. **`hashValue` setter exposed** on the runner so identity-transition tests can change the hash between renders without accessing closure internals.

5. **Updated `FFR1-BEH → FV1/FV2/FFR1-BEH`:** Uses `r.registeredOnReplaced(...)` to fire the callback; asserts `revertedH1(t)=true`, `links` contains B, does not contain A, one write.

6. **Updated `FFR2-BEH: unmount → FFR2/FV3-BEH: unmount discards deferred rejection`:** Install a never-resolving deferred promise, run effects (effect outstanding), then unmount. A deferred reject fired after unmount must not set state. `lateSets === 0`.

7. **New `FFR2/FV3-BEH: stale deferred resolution after dep change`:** Promise A created before hash change, kept outstanding. Before the second render, install a separate never-resolving promise for B. Run effects for B (cleanup A → `cancelled=true`, B starts own pending fetch). Resolve A. Drain 8 microtask rounds. A's `.then()` fires `cancelled=true` → returns. B pending → no verdict.

8. **New `FV1-BEH: settled A verdict hidden on first B render before effects run`:** Verify A, assert revert heading. Change hash to B with a never-resolving B promise. `tFirst = r.render()` — before any effect flush — must not show A's verdict. After `runEffects()` (effect clears null), `tAfter` also must not show it.

9. **State index comment updated:** indices 0–7 unchanged; 8=replacedHash, 9=revertedOnChain, 10=revertLookupHash, 11=verifiedForHash.

10. **`CWR6-STRUCT` updated** to check `replacedHash`, `setReplacedHash`, `verifiedForHash`, `revertIdentityMatch` instead of `replacedHashRef`.

Net Vitest addition in FV1–FV4 session: 214 → 216 (+2 net; four new tests were added while two prior tests were revised/merged). `createSafety` has 51 cases after this session.

### VT1 — unmount deferred rejection: full catch settlement and negative control

**Problem (from Codex review of d6d5c8e):** The maintained unmount test called `rejectFn(...)` then awaited only one `Promise.resolve()` before asserting `lateSets === 0`. A rejection from `getTransactionReceipt` passes through `.then()` (propagating rejection) and into `.catch()` — a minimum of two microtask hops. The assertion could run before the catch handler fired, so a missing catch cancellation guard would not be detected.

**Fix in `src/lib/__tests__/createSafety.test.ts`:**

1. Replaced `await Promise.resolve()` (one hop) with `for (let i = 0; i < 8; i++) await Promise.resolve()` after `rejectFn(...)`. Eight rounds ensure the full `.then().catch()` chain has settled and any guarded (or unguarded) setters have completed before the assertion.

2. Added an inline negative control at the end of the same test: after asserting `lateSets === 0` (real implementation), calls `r.triggerLateSet()` — a new runner helper that calls the same setter path without any cancelled guard, directly simulating the regression. Asserts `r.lateSets === 1`. This proves the bookkeeping detects an unguarded late setter, without touching production source.

3. Added `triggerLateSet()` to the `makeCreateRunner` return. It calls an inline setter for `states[9]` that respects `isUnmounted`/`lateSets` but has no `cancelled` guard. It must only be called after `unmount()`.

### FV4 — reporting/probe corrections

1. **cancelRefetch leading sentence removed.** The old comment said "cancelRefetch:true ensures a retry starts a new receipt read request" — this is only conditionally true (only when cached data exists). Rewritten to accurately describe both the cached-data case (cancels in-flight, starts fresh) and the no-cache case (deduplication means the same in-flight promise is used).

2. **runtime-probes.cjs CWR6 assertion.** The second assertion previously checked fixture values (`receipt.isError`, `publicClientReceipt.status`) rather than rendered behavior. Replaced with: run `flushEffects()` (state-preserving slot runner), re-render, assert `revertedH1(revertedTree) === true`. The probe now verifies that the component actually renders the "Transaction reverted" heading after the effect settles.

3. **runtime-probes.cjs made state-preserving.** `useState` mock updated to persist setter results into `states[i]` (same pattern as `createSafety.test.ts` runner). `useEffect` updated to use dependency-aware `effectSlots`. `render()` resets hook call indices. `stableRtClient` added.

4. **Exit codes.** `production-adapted.cjs` and `recovery-adapted.cjs` both now set `process.exitCode = 1` when `result.failed > 0`. Previously they always exited 0 regardless of assertion failures.

5. **ad09b97 SHA.** The prior report incorrectly listed `ad09b97e683e3d60fd7ee19f81db3edf8e7d49e3` as the parent of `5989686`. The actual parent is `ad09b9786ae52dac42ea9484da9b148f1d43c26e`. This report does not repeat that error; historical raw evidence files are not rewritten.

6. **MetaMask classification.** This report states only that classification remains unresolved. No cause or provider is named and no clearance is claimed.

---

## Exact commands and results

Suite cwd: `/home/user/app` (Linux sandbox). Bun 1.x, same locked wagmi/viem/TanStack as prior session.

| Command | Exit | Result |
| --- | ---: | --- |
| `forge test --summary --fuzz-seed 1` | 0 | 120 pass / 0 fail / 0 skip |
| `bun run test` | 0 | 216 pass / 0 fail / 0 skip, 6 files; createSafety 51 |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run build` | 0 | Succeeded; existing chunk-size warning unchanged |

Probe commands from repo root (`SRC=.`, `OUT=docs/evidence/fv-results`):

| Command | Exit | Pass / fail |
| --- | ---: | ---: |
| `node docs/evidence/recheck-5989686/effect-review.cjs SRC OUT/effect-review-results.json` | 0 | 7 / 0 |
| `node docs/evidence/recheck-5989686/preserved-query-review.cjs SRC OUT/preserved-query-review-results.json` | 0 | 13 / 0 |
| `node docs/evidence/final-fix/production-adapted.cjs SRC OUT/production-adapted-results.json` | 0 | 23 / 0 |
| `node docs/evidence/final-fix/recovery-adapted.cjs SRC OUT/recovery-adapted-results.json` | 0 | 3 / 0 |
| `node docs/evidence/final-fix/expanded-adapted.cjs SRC OUT/expanded-adapted-results.json` | 0 | 13 / 0 |
| `node docs/evidence/final-fix/runtime-probes.cjs SRC OUT/runtime-probes-results.json` | 0 | 4 / 0 |
| `node docs/evidence/recheck-fc83aa6/transition-review.cjs SRC OUT/transition-results.json` | 0 | 6 / 0 |

All seven probe sets pass (FV1–FV4 session). The transition instrument's three previously failing cases (test 2, 3, 4) now pass:

### VT1 session commands

Probe sets were not rerun in the VT1 session: only `createSafety.test.ts` was modified; no probe file depends on the test runner or the `makeCreateRunner` helper. The six probe sets, transition-review, Forge, and build evidence from the FV1–FV4 session (d6d5c8e) remain valid for the unmodified application source.

| Command | Exit | Result |
| --- | ---: | --- |
| `bun run test` | 0 | 216 pass / 0 fail / 0 skip, 6 files; createSafety 51 |
| `bun run check` | 0 | oxlint 0 warnings / 0 errors; tsc 0 errors |
| `bun run build` | 0 | Succeeded; existing chunk-size warning unchanged |

Forge, probe sets, and transition-review not rerun: application source (`src/pages/Create.tsx`, contracts, other source files) unchanged. Evidence from d6d5c8e session remains valid.

- Test 2 "Settled A verdict not visible during first B render": `reverted=false`, links show HASH_B (pending state) — correct.
- Test 3 "Settled A verdict not relabelled as pending B after effect": `reverted=false`, links show HASH_B — correct.
- Test 4 "Replacement update invalidates unchanged error-state lookup": `requests=[A,B]`, `links=[B]`, `reverted=true` — B receipt requested and confirmed; B link shown — correct.

---

## Accepted changes preserved

- FFR1/FFR2 ordinary and callback-before-error replacement paths continue to pass.
- CWR4/CWR5: Node types/lock, fileURLToPath, clock freeze/restore unchanged.
- CS/CSF/PF2, full event/snapshot validation, zero-recipient guard, post-hash duplicate protection, paused lock, bounded waiter, read-only retry, successful/unmatched mined links remain accepted by their suites and probes.
- Contract, Pool and Proof source unchanged; 120/120 Forge tests pass.
- Earlier pool 7 payout and pool 8 refund demonstrations remain accepted in their recorded scope.

---

## Not run

- Mounted browser DOM, keyboard navigation, live wallet, live replacement, mobile/WalletConnect, cross-session.
- Windows path test: portable implementation delivered in prior session; Linux sandbox cannot claim a Windows pass.
- MetaMask malicious-site classification: unresolved, no cause named, no clearance claimed.
- Production deployment SHA verification: the live Vercel deployment and its configuration status were not verified in either session. Deployed revision and environment variable configuration remain unconfirmed for the current output; see `docs/DEMO_RUNBOOK.md` for runbook details.
