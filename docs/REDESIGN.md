# HuiPot — Dark / Lime Experience Redesign

October 24, 2026. Design handoff v2. Baseline inspected: `d2fecc8c1b412a4b9f7bbed42a93d8fe9a817dc4`.

## Authority and delivery status

The user requested a complete interface redesign, explicitly chose **dark backgrounds with lime accents**, asked for striking motion/cinematic effects, and retained **human-operated Arc Studio in the browser**. This document specifies that redesign. It supersedes the visual style, navigation, and four-screen layout in `DESIGN.md`; the financial rules D2-D8 and contract behavior in `SPEC.md` remain unchanged. D1's screen envelope becomes five screens, still within the adopted limit.

Codex prepared this design and the reference images. They are **concepts, not application screenshots or test evidence**. Studio must implement application code and tests. No redesign prompt has been executed by Codex; no redesigned app, public hosting, or wallet flow is claimed. The browser inventory exposed no enabled surfaces, so the current visual assessment is based on source and design references, not an inspected live page.

Primary references: [landing concept](design/landing-dark-lime-concept.png) and [asset provenance](design/README.md). Implement real text, layout and controls; never use a full-page mockup as the working interface.

## 1. Product and editorial direction

**Creative direction: a shared goal becomes visible as people contribute.** A precision lime ring is the recurring visual motif. It represents a funded fraction, a shared focus, and two possible outcomes. The landing can feel cinematic; the application should feel calm and exact.

The first ten seconds must answer: what does this do, when does money leave the pool, and how can I try it? A judge must reach the walkthrough in one click and source/contract evidence without connecting a wallet.

The current Home combines a short pitch, pool-ID lookup and up to twenty pool cards. The header prioritizes wallet connection before explanation. The redesign gives each visitor task its own space: learn, explore, commit, inspect. Do not add social feeds, trading charts, a token, governance, or a second application.

All UI copy is English. Never invent user counts, volume, testimonials, audit status, endorsements, mainnet availability, receipt hashes, or completed submission status. “No platform fee” must stay next to “Network fees apply.” Do not call refunds automatic or promise delivery of a pool's stated purpose.

## 2. Information architecture — five screens

| Route | Job | Main action |
| --- | --- | --- |
| `/` | Explain HuiPot; interactive illustrative walkthrough; judge evidence entry | Create a pool / Try the walkthrough |
| `/pools` | Discover the latest real pools and open a known pool ID | Open pool / Create a pool |
| `/create` | Enter fixed terms, review, then request creation | Review pool / Create pool |
| `/pools/:poolId` | Understand this pool, contribute or trigger the permitted outcome | Review contribution / payout / refund |
| `/pools/:poolId/proof` | Inspect receipts and the limits of available evidence | Verify transaction |

Keep existing `/create` and pool/proof deep links working. Migrate the current Home list to `/pools`. All “Back to pools” links point there; the brand points to `/`. A demo is a section/dialog on landing, not a sixth route. FAQ and “For judges” are landing anchors. No generated sample pool is ever inserted into the real index.

### Navigation

- Desktop landing: brand, How it works (`/#how-it-works`), Explore pools (`/pools`), For judges (`/#for-judges`), a persistent **Arc Testnet** badge, Open app (`/pools`). Network badge remains visible even when disconnected.
- App header: brand, Explore pools, Create a pool, network badge, Connect wallet/account control. Avoid two competing primary buttons.
- Mobile: compact brand + network + menu button. Menu contains the same destinations and wallet control; accessible focus handling and Escape dismissal. Close after navigation.
- Wallet connection is required only at the relevant write action. Reading, demo, source links and proof lookup remain usable without it.

## 3. Landing page, section by section

### L1 — Hero: understand and start

At 1440px: approximately 1200px content width, 52/48 split, minimum 620px hero region. At mobile: copy, actions, then a compact ring, no horizontal overflow and no viewport-height trap.

Exact copy:

- Eyebrow: **SHARED GOALS. CLEAR RULES.**
- Heading: **Pool together. Make it happen.** Emphasize only “happen.” in lime; desktop line breaks may follow the reference, mobile follows available width.
- Body: **Pool USDC for one shared goal. Reach the target to make the funds payable to a fixed recipient. Miss the deadline and each contributor can claim their deposit back.**
- Primary: **Create a pool** → `/create`.
- Secondary: **Try the walkthrough** → `/#walkthrough`, focus its heading/controls.
- Helper: **No platform fee · Network fees apply**.

Right visual: a graphite torus with a lime progress segment, two quiet orbit lines and contribution particles. Center displays the illustrative amount and goal. The entire visual is labeled **Interactive demo · No funds moved**. Initially 0.40 / 1.00 USDC; only show a +0.40 chip and 0.60 remaining. The generated reference includes an extra +0.10 decorative chip; **omit it in implementation**, since demo amounts must agree. Decorative rocks/smoke are optional faint depth cues, never content or foreground clutter. No avatar portraits or pretend member identities.

Prefer Studio-created CSS/SVG motion or a lightweight canvas scene. Real text/numbers/buttons remain DOM elements. Do not require WebGL, a new animation framework, or a blocking video download to understand the page.

### L2 — How it works: three readable steps

Anchor `#how-it-works`. A horizontal editorial band with thin dividers, not three generic floating cards. On mobile use a vertical numbered list.

1. **Set the terms.** Choose one target, deadline and fixed recipient.
2. **Pool your USDC.** Share the link and contribute toward the exact goal.
3. **Payout or refund.** Reach the goal to make payout available; otherwise contributors claim refunds after the deadline.

Include the fine print **Terms cannot be changed after creation.** The third step must not imply an automatic transfer.

### L3 — Interactive walkthrough: let the visitor understand both outcomes

Anchor `#walkthrough`. Heading **One goal. Two clear outcomes.** A split between short narrative and the ring/receipt illustration. Use one shared small demo state model, isolated from wallet/RPC hooks and real pool data.

Two explicit tabs: **Goal reached** and **Deadline missed**. Persistent notice: **Illustration only — no wallet, no funds moved.**

- Success path: start at 0.40/1.00; button **Add 0.60 demo USDC** fills to 1.00; show **Goal reached — payout available**, not Paid. Then **Simulate payout** demonstrates a transfer to **Fixed recipient** and a clearly marked **Illustrative receipt**. No address or transaction hash. No automatic wallet opening.
- Failure path: start at 0.40/1.00; button **Advance demo deadline** shows **Goal not reached — refund available**. Then **Simulate refund** returns the illustrative 0.40 to **Contributor**. Keep **Refunds must be claimed. Fees are not refunded.** visible.
- Reset and replay controls; tab change resets only demo state. On reduced motion, jump to the next state with the same explanatory text.
- Below the demo: **Ready to try the app? Explore testnet pools** → `/pools`. A testnet checklist discloses a supported wallet, Arc Testnet and test funds are needed for real writes; no mainnet funding CTA.

### L4 — Use cases and commitment rules

Heading **For the things you do together.** Three compact editorial rows: **Community workshop**, **Shared team tools**, **Creative collaboration**. Treat them as examples, not active or endorsed pools. Do not create separate marketplaces or categories requiring new contract fields.

Adjacent concise rules block: **Know the commitment.** Fixed recipient and terms; no early withdrawal/cancellation; successful funding makes payout available immediately; refund principal only after failed expiry; the contract does not guarantee the stated real-world outcome. Never put essential terms solely inside an FAQ.

### L5 — Judge evidence area

Anchor `#for-judges`. Heading **Built to be inspected.** One section with a left-to-right reading order, not a wall of raw hashes:

1. **Try it:** walkthrough button and real pool lookup. No wallet required for these reads.
2. **Inspect it:** repository, specification, deployed contract and per-pool proof entry.
3. **Know its status:** **Arc Testnet · Unaudited**. Mainnet transaction: **Not recorded**; public live-app/submission readiness: show only actually verified status. Studio permalink: **Not recorded** until a real app-specific URL exists. The homepage is not a substitute.

Known links:
- Source: `https://github.com/aquattdabackup/HuiPot`.
- Specification: `https://github.com/aquattdabackup/HuiPot/blob/main/docs/SPEC.md`.
- Contract: `https://explorer.testnet.arc.io/address/0x81a139599d252eb2dc2bbb6c267e911a21264288` (validate link during implementation QA).
- Proof: select a real pool first, then open its proof route. Do not invent a featured pool ID/hash.

Technical values are available in expandable details with copy controls, while status and primary actions remain immediately readable. Test counts, if shown, must be tied to a source revision/date and not marketed as a security audit; prefer linking the report over hard-coded badges.

### L6 — FAQ, close and footer

Use five concise accordion questions: **Can I withdraw early?** No. **What if the goal is not reached?** Claim deposited principal after expiry; gas is not refunded. **Who receives the money?** The immutable recipient. **Is this automatic?** Contract rules determine eligibility; a wallet transaction triggers payout/refund. **Is this mainnet?** Current deployment is testnet; no real-mainnet proof is claimed.

Closing line **Your next shared goal starts here.** One Create a pool CTA. Footer: brand, source, contract, accessibility/motion control, **Unaudited contracts. Testnet only.** No invented legal-policy links, social accounts or company endorsements.

## 4. Application screen composition

### Explore pools

Header **Find your shared goal.** Small explanatory line, Create a pool CTA, then a clearly labeled pool-ID lookup. Show the latest maximum 20 pools from this deployment and say so. Distinguish loading, successful zero results and unavailable RPC. A failed request must not produce an empty-state claim.

Each card has a title/status, one-line purpose, large actual contributed/target amount, progress, exact deadline and a short recipient with accessible full-address access. Use one card link and sibling explorer control; fix the current nested-anchor pattern in PoolCard. No invented photos, category labels, participants, yield or countdown urgency. Real amounts update from reads; never animate a made-up balance while loading. Pagination/search beyond the existing bounded list is excluded.

### Create

Heading **Give your goal a clear plan.** Three visual groups on one route: **The goal** (title/purpose), **The terms** (target/deadline), **The recipient** (full address). At desktop, 640px form + 360px sticky preview; at mobile, inline summary after fields. Input labels never rely on placeholders. UTF-8 byte counters can be quiet help under title/purpose, not headline information.

Primary **Review pool** opens a distinct review step/dialog showing all immutable terms, chain, full recipient, zero bundled deposit, and gas estimate or explicit unavailability. **Create pool** is only inside that review. Date/time includes an explicit timezone and UTC conversion per SPEC. Preserve invalid raw amounts; retain fields after wallet rejection. Creation success must match the actual PoolCreated event and intended terms.

### Pool detail

Desktop: breadcrumb, title/purpose/status; 720px content + 360px sticky action panel. Main column: amount/progress, exact deadline, recipient, wallet position, actual activity and Proof link. Put metadata behind accessible expansion, not before the core action.

Mobile order: title/status → raised/target/remaining → deadline + recipient → action → wallet position → activity/evidence. No bottom sticky payment bar that hides terms or keyboard fields.

The action panel contains the state-specific action, clear amount, fee status and concise commitment disclosure. Review before any signature. Distinguish **Funded** (payment available) from **Paid** (confirmed payment). Preserve historical raised amounts after payout/refund and label remaining liability separately. The safe action copy and all failure states from DESIGN v1 remain requirements. No visually optimistic success checkmarks or confetti before matching receipt/event/state.

### Proof

Heading **Follow the money.** Keep network, pool and contract context directly under the heading. Enter an actual hash, verify, then display a verdict and a compact evidence checklist. Expand details for chain, transaction identity, event, expected amount, sender/destination and native movement. A mismatch is specific and actionable; missing data is incomplete. Keep the permanent testnet label independent of the verification verdict.

**Known blocker at d2fecc8:** when both payout event and Transfer claim 1 base unit for a 1-USDC target, the existing verifier still returns true. The redesigned UI must not promote this into a more authoritative success badge. Complete target binding and regression tests in Studio before claiming full verification. Incoming contribution proof also needs action-appropriate movement/value checks; absence of outbound movement does not establish a fully verified contribution.

**Known R3 source issue:** `key={actionKey}` on the child action-panel div does not reset receipt/write hooks owned by parent Pool. Real context isolation must move/reset the owning hooks and bind confirmations to the intended action/account/pool/chain. A visual remount alone is not a functional fix. Do not regress later fixes if the repository has advanced.

## 5. Visual system

Use the existing React/Vite/Tailwind/Framer Motion stack and icon family. Retain DM Sans for readable body and Space Grotesk for display if already available, with robust system fallbacks. Fonts must not delay content. No added font service is required; self-host only with proper licensing if changed. Address/hash text uses the existing monospace stack. Numbers use tabular figures and exact formatting.

| Token | Value | Purpose |
| --- | --- | --- |
| Canvas | `#0B100E` | Root background |
| Surface | `#141D17` | Cards/forms/dialogs |
| Raised | `#1C2920` | Hover and secondary surfaces |
| Text | `#F2F5EA` | Main body/headings |
| Secondary text | `#A1B1A5` | Labels and supporting copy |
| Accent | `#D2FA69` | Primary CTA, selected state, demonstration progress |
| Accent ink | `#10160D` | Text/icons on lime |
| Accent hover | `#BEE353` | Hover CTA |
| Border decorative | `#2B3B30` | Cards and separators only |
| Control border | `#73877A` | Meaningful input/control boundary |
| Focus | `#D2FA69` | 3px outline + 3px offset |
| Warning text / fill | `#FFD38B` / `#302414` | Incomplete evidence, commitments |
| Error text / fill | `#FFB4B4` / `#351C22` | Reverts and validation errors |
| Success text / fill | `#C8F4AA` / `#1D3020` | Confirmed applicable outcomes |

Text over cinematic areas needs a stable opaque backing/scrim; token contrast alone is insufficient. Normal text >=4.5:1, large text and meaningful controls >=3:1, keyboard focus plainly visible. Status uses words/icons as well as color.

Type scale: hero 88–112px desktop / 48–56px mobile with 0.98–1.04 line height; section heading 44–56 / 32–36; app H1 36–40 / 28–32; hero body 18/28; app body 16/24; labels/help 14/20; captions at least 12/18. Body measure 55–65 characters. No cramped all-uppercase paragraph text.

Spacing scale 4/8/12/16/24/32/48/64/96/128. Landing max-width 1200px; app 1120px. Desktop gutter minimum 32px, mobile 20px (16px at 360px if required). Section gaps 96–128px desktop, 56–72px mobile. Card radius 20px, controls 12px, pill only for tags/hero CTA. App buttons >=48px high; all targets >=44px. Use modest shadows and one directional highlight, not glowing borders on every element.

## 6. Motion and cinematic treatment

Animation is presentation, never automatic signing or fund movement. Every automated sequence must have a clear stop/replay path. Use existing Framer Motion and CSS/SVG where practical; no scroll hijacking, custom cursor, loading intro, autoplay audio, or blocking canvas.

| Element | Behavior | Limits/fallback |
| --- | --- | --- |
| Hero entry | Heading reveals in two or three groups; opacity + 16px rise, 600ms; 70ms stagger | Essential copy remains available without animation; no per-letter screen-reader fragmentation |
| Hero ring | Slow 16s orbit/rotation and subtle 6px float; contribution particles along 2 paths | Stop when offscreen/tab hidden; global Pause motion; reduced-motion static |
| Pointer depth | Ring tilt max 4 degrees and translate max 8px on fine pointers | Disable on touch/reduced motion; no movement of text or controls |
| Walkthrough | Deliberate state transition, ring progress 650ms, receipt entry 250ms | Only illustrative amounts; user-triggered; accessible state narration |
| Section arrival | Opacity + 20px rise, 450ms, once | No long scroll pinning; preserve natural scrolling and anchor navigation |
| Buttons/cards | 160–200ms background/border; arrow move 3px; card lift at most 3px | Keyboard parity; never move a payment CTA under the pointer |
| Real data | Progress width can ease after confirmed read, 250ms | Exact number text updates without animated monetary counting; no fabricated values |
| App route | 180ms fade, at most 8px shift | Restore focus appropriately; no delays to errors/wallet dialogs |

**Background video is optional, not required for quality.** First preference is a lightweight controllable hero scene. If Studio can supply an original/licensed local video of the ring, use it only behind that hero, muted/playsInline, short seamless loop, no audio, with a poster and pause control. Target <=2.5 MB, load after core content; avoid video on reduced-motion or constrained connections. Do not hotlink stock clips or use an unverified license. No full-page video behind forms. If no valid asset exists, ship the CSS/SVG scene instead and report it.

Performance goals (measure, do not assert): hero text/CTA must render before graphics; reserve media dimensions; no layout shift from animation; responsive images and lazy loading below the fold; defer the illustrative scene off critical path; keep screenshot mockups out of runtime bundles. Record mobile performance evidence when tooling permits, otherwise mark unmeasured.

## 7. Accessibility, money states, and QA

Preserve every error/recovery state in DESIGN v1, AC09–AC13 and SPEC. Semantic landmarks and one H1 per screen; skip link; named icon buttons; real labels/errors; focus trap and restoration for modal review; Escape/menu handling; polite announcements for transactions, not continuous decorative motion; 200% zoom; hashes wrap without overflow. Add a visible Pause motion control and respect OS reduced motion on first render.

Required rendered evidence: all five screens at **390px and 1440px**, plus a 360px overflow check. Capture real route content and clearly label any fixtures. Include landing with demo paused, demo failure outcome, Explore empty and RPC-error states, invalid Create input, Pool Active/Funded/Refunding, Proof incomplete/mismatch, wallet rejection and pending transaction UI. No real-wallet actions without the separate user flow.

Acceptance checklist:

| ID | Acceptance |
| --- | --- |
| UI01 | Hero communicates purpose and next action without wallet connection; primary CTA is visible on mobile. |
| UI02 | Five routes, preserved old deep links, valid back links, functioning mobile menu and judge anchors. |
| UI03 | Demo success requires explicit simulated payout; failure requires explicit simulated claim. All demo states are labeled and isolated from real wallet calls. |
| UI04 | Only real fetched pools in Explore; query failure is distinct from empty; no nested anchors. |
| UI05 | Creation and money actions have real review steps, full recipient/amount/terms and recoverable errors. |
| UI06 | Proof does not show full verification for the remaining negative target fixture; transaction context survives/invalidates correctly on wallet/pool changes. |
| UI07 | Reduced motion and Pause work; decorative motion stops offscreen; no scroll hijack, autoplay audio or flashing. |
| UI08 | Responsive screenshots, keyboard/focus/labels and measured contrast; no horizontal overflow at 360/390/1440px. |
| UI09 | Judge links and unavailable states are honest; no fake mainnet, audit, metrics, project URL or receipts. |
| UI10 | `bun run test`, `bun run check`, `bun run build` pass on final source. Run full Forge suite if contracts/tests changed; otherwise cite the unchanged baseline and say not rerun. |

Final delivery must distinguish implemented, tested, visually inspected and unrun. The design reference is a quality target, not proof that screenshots or browser tests passed.

## 8. Design verification and sources

The seven foreground/background token pairs in [contrast-check.json](design/contrast-check.json) were calculated before handoff. All pass their assigned thresholds: body 17.38:1, secondary text 7.68:1, CTA 15.42:1, input boundary 4.50:1, warning 10.76:1, error 9.28:1, success 11.35:1. Comparisons use unrounded values; reported ratios are rounded for readability. This checks solid-color pairs only, not image overlays or the final rendered app.

Official references read October 24, 2026: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [W3C pause/stop/hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html). The design adds a global decorative-motion control and reduced-motion treatment; neither is a claim that a not-yet-built interface meets WCAG. Rendered accessibility/performance checks remain Studio delivery requirements.
