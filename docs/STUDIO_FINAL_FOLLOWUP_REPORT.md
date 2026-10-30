# Studio final follow-up report — FFR1–FFR4

Date: October 30, 2026.
Input SHA: `c21016ead0f3d6765af709b28a81e11d2b517287`
Output SHA: TBD (see commit below).
Input based on: `docs/STUDIO_FINAL_FIX_RECHECK.md` (review of `5989686343724078521ff42b5dbf7ff9acb09907`).

---

## FFR1 — Replacement identity tracking

**Finding:** When A is repriced and replaced by B, and B reverts, the follow-up independent
receipt check fetched A (no mined receipt), leaving the component in unknown state with an A link.

**Implementation:**
- Added `const replacedHashRef = useRef<\`0x\${string}\` | null>(null)` declared after `submittedRef`
  (preserving ref indices: refs[0]=submittedRef, refs[1]=replacedHashRef).
- Added `onReplaced: ({ transactionReceipt }) => { replacedHashRef.current = transactionReceipt.transactionHash }`
  to `useWaitForTransactionReceipt`. The callback fires before wagmi throws, so the replacement
  identity is captured when the error handler runs.
- Effect changed: `const lookupHash = replacedHashRef.current ?? hash`. Fetches lookupHash (B if replaced,
  A otherwise). Sets `revertLookupHash` state to that hash synchronously.
- Added `const [revertLookupHash, setRevertLookupHash] = useState<\`0x\${string}\` | null>(null)`.
- In revert render block: `const revertExplorerHash = revertLookupHash ?? hash`. Explorer link uses this
  value so it shows the correct mined transaction (B for replaced, A for ordinary).

**Behavioral evidence (effect-review.cjs 7/7):**
- `Reverted replacement B renders confirmed revert with B link`: isError=true, actual wagmi QueryObserver
  with `onReplaced` fires before error, `revertLookupHash=HASH_B`, link = HASH_B.
- `Current reverted receipt actually renders reverted heading and A link`: ordinary revert (no replacement),
  link = HASH_A.

**Test evidence (createSafety.test.ts):**
- `FFR1-BEH`: sets `refs[1].current=HASH_B` (replacedHashRef), runs effects, asserts `revertedH1=true`,
  `links contains HASH_B`, `links does not contain HASH_A`, one write preserved.

---

## FFR2 — Asynchronous invalidation and stale result suppression

**Finding:** The prior `useEffect` had no cleanup. Pending promises always called `setRevertedOnChain`.
A stale A-read could fire after the component moved to B context; a state-setter call after unmount
could also occur.

**Implementation:**
- Effect returns `() => { cancelled = true }` cleanup.
- `setRevertedOnChain` and `setRevertLookupHash` calls are guarded by `if (cancelled) return`.
- On dependency change (new hash, error toggle, or publicClient): cleanup runs on old slot (cancelled=true),
  new effect scheduled with fresh cancelled flag.
- `setRevertedOnChain(null)` and `setRevertLookupHash(null)` run synchronously when the guard condition
  is not met (`!isReceiptError || !hash || !publicClient`), clearing stale verdicts immediately.

**Behavioral evidence (effect-review.cjs 7/7):**
- `Old A read cannot mark new B context reverted`: deferred A-read resolves after B context is set;
  cancellation prevents state update.
- `Unmount invalidates outstanding state update`: `lateSets=0` after unmount.

**Test evidence (createSafety.test.ts):**
- `FFR2-BEH: stale effect resolution...`: first pass sets revertedOnChain=true; second pass transitions
  to paused (isError=false), effect fires with !isReceiptError → clears; render shows no reverted heading.
- `FFR2-BEH: unmount cleanup runs...`: `lateSets=0` after unmount.

---

## FFR3 — State-preserving test runner and behavioral assertions

**Finding:** Prior `useState` mock returned `states[i]` but setter only saved `errors` (index 7).
`revertedOnChain` state (index 8) was never stored. CWR6 test checked `r.receipt.isError` and
`r.publicClientReceipt` fixture — not the rendered heading or link. Fixture self-checks cannot prove
the effect changed state or that the correct path rendered.

**Implementation in `makeCreateRunner`:**
- `useState` now state-preserving: `if (!(i in states)) states[i] = initial; return [states[i], setter]`.
  Setter: `states[i] = typeof x==='function' ? x(states[i]) : x`. All indices persist across renders.
- `useEffect` is dependency-aware: each slot tracks `deps` and `_fn`. On render, if deps changed
  (or first call), `_fn` is scheduled. `runEffects()` calls cleanup of old slot, runs `_fn`, stores returned cleanup.
- `unmount()` calls cleanup for every slot, sets `isUnmounted=true`. `lateSets` counts calls to setters after unmount.
- `reset()` clears `effectSlots`, `isUnmounted`, `lateSets`, and all states.

**New behavioral tests:**
- `CWR6-BEH: isError+publicClient reverted receipt shows "reverted" heading and hash link`:
  asserts `revertedH1(t)=true`, `links contains HASH_A`, `successH1=false`, `writes.length=1`.
  Fails if effect never sets verdict or always sets wrong verdict.
- `CWR6-BEH: isError+unknown publicClient result stays in unknown-outcome path`:
  asserts `revertedH1=false`, `successH1=false`, `submitBtn.disabled=true`, `links contains HASH_A`.
- `FFR2-BEH: stale effect resolution...` and `FFR2-BEH: unmount cleanup...`: cleanup coverage.
- `FFR1-BEH: reverted replacement B renders with B explorer link not A`: replacement hash coverage.

**Test count:** vitest 214/214 (was 211; net +3 new tests: FFR1-BEH, FFR2-BEH x2).

---

## FFR4 — Coverage restoration and reporting corrections

**expanded-adapted.cjs restored to 13 assertions:**
- Preserved 7 controlled-mock assertions (unchanged).
- Restored real QueryObserver: actual query completion (resolveWait → success with 1 write).
- Restored real errored-query retry: RPC failure on first call, success on second; 2 reads, 1 write.
- Restored real offline QueryObserver: actual paused QueryObserver, not a manually supplied object.
- `onlineManager` is now used (real offline state), not just imported.
- `settle()` helper awaits actual query state transitions.
- Independent-pending-read diagnostic replaced with bounded-timeout assertion (accepted per
  STUDIO_CWR_ACCEPTANCE_RECHECK.md: finite-timeout → unknown → retry, not new-waiter creation).

**cancelRefetch wording corrected:**
- Prior: "cancelRefetch:true ensures a retry starts a new receipt read request" was removed.
  Current wording: "deduplicates in-flight promises when no cached data exists; without cached data
  both approaches behave the same." This is per attempt; query retries may delay the final banner.

**SHA corrections:**
- STUDIO_FINAL_FIX_REPORT.md output SHA was TBD; now corrected in AGENTS.md.
- Full parent SHA `ad09b97e683e3d60fd7ee19f81db3edf8e7d49e3` matches repository history.

**Probe counts and exit codes:**
- All probes now require explicit `SRC OUT/file.json` arguments. Scripts already had correct argv[2]/argv[3].
- All probes exit 1 on failure (expanded/preserved/effect-review/runtime all have `process.exitCode=1` guards).
- production-adapted.cjs and recovery-adapted.cjs still exit 0 on assertion failures; this is a pre-existing
  limitation of those scripts and is noted in this report. Counts must be inspected. A future pass may add exit guards.

---

## Validation summary

All commands run from sandbox `/home/user/app`, date `2026-10-30`.

| Command | Exit | Result |
| --- | ---: | --- |
| `bun run check` | 0 | oxlint 0/0, tsc 0 |
| `bun run test` | 0 | **214/214** (6 files, +3 vs prior) |
| `forge test --summary --fuzz-seed 1` | 0 | **120/120** |
| `bun run build` | 0 | succeeded, chunk-size warnings only |

Probes from repo root (`SRC=.` `OUT=/tmp`):

| Probe | Exit | Pass / fail |
| --- | ---: | ---: |
| `node docs/evidence/recheck-5989686/effect-review.cjs . /tmp/...json` | 0 | **7 / 0** |
| `node docs/evidence/recheck-5989686/preserved-query-review.cjs . /tmp/...json` | 0 | **13 / 0** |
| `node docs/evidence/final-fix/production-adapted.cjs . /tmp/...json` | 0 | **23 / 0** |
| `node docs/evidence/final-fix/recovery-adapted.cjs . /tmp/...json` | 0 | **3 / 0** |
| `node docs/evidence/final-fix/expanded-adapted.cjs . /tmp/...json` | 0 | **13 / 0** |
| `node docs/evidence/final-fix/runtime-probes.cjs . /tmp/...json` | 0 | **4 / 0** |

Note: effect-review.cjs and preserved-query-review.cjs are independent review instruments
(not Studio-authored); they execute unchanged production source.

---

## CWR4/CWR5 preservation

No changes to `@types/node`, `tsconfig.json`, `fileURLToPath` usage, or beforeEach/afterEach clock freeze.
CWR4/CWR5 independently validated on Windows by Codex (STUDIO_FINAL_FIX_RECHECK.md, accepted).

---

## Accepted and preserved safeguards

CS1/CS2/CSF1–CSF3/PF2 production assertions: 23/23 (production-adapted.cjs).
CWR1 paused lock / hash handler guard: still present and tested.
CWR2 finite 30s timeout / cancelRefetch retry: still present and tested.
CWR3 recovery assertions: 3/3 (recovery-adapted.cjs).
CWR6 ordinary revert path: heading and link render correctly (effect-review 7/7).
Pool 7 payout / pool 8 refund: contract and config unchanged; prior demonstration remains valid.

---

## Not exercised

- Mounted browser DOM, keyboard navigation, or screen reader.
- Live wallet invocation (MetaMask or WalletConnect).
- Live replacement transaction: coverage is via controlled wagmi QueryObserver (actual library action,
  not live RPC). Real wallet replacement requires network execution outside the sandbox.
- Cross-session, mobile, or WalletConnect-specific flows.
- MetaMask malicious-site classification: not from app code; unresolved at Blockaid/PhishFort.
- production-adapted.cjs and recovery-adapted.cjs exit 0 on assertion failure: counts must be inspected.
- Windows platform: fileURLToPath supplied; not run in this session.
