# HuiPot Goal Pool — Interface design

> **Superseded visual/layout direction:** the user requested and selected the dark/lime redesign on October 24, 2026. Read [REDESIGN.md](REDESIGN.md) for the authoritative five-screen layout, cinematic landing, tokens, content and motion; use [STUDIO_REDESIGN.md](STUDIO_REDESIGN.md) for execution. This v1 document remains a reference for interaction/error/financial disclosures. Its old implementation-status statements are historical, not the current checkpoint.

Date: October 24, 2026 (Asia/Ho_Chi_Minh). Phase 2 proposal v1.
Status: design specification approved as context for milestone A through the GitHub handoff request. App implementation remains behind the Phase 3 review gate. No UI code, executed Studio prompt, rendered screenshot, or visual test exists yet. The optional `arc-ui-craft` skill is absent; this uses the Phase 2 checklist in [PROMPT.md](../PROMPT.md).

## Design intent

Make a shared expense legible: what it funds, who receives it, how close it is to the goal, and exactly when a contributor can recover money. The primary visual is a large USDC amount and one progress bar, with the recipient and commitment rules beside the action. Use a calm, practical club-budget interface. Avoid trading charts, decorative wallet balances, animated earnings, and success imagery before confirmation.

All product copy is English. User-facing project discussions remain Vietnamese. The product name is **HuiPot**, with the descriptor **Goal Pool**. Main line: “Fund one shared goal.” Supporting line: “A fixed goal, a fixed recipient, and clear refund rules.”

## Four screens

| Screen / proposed route | Content and primary action | Acceptance links |
| --- | --- | --- |
| Home `/` | Value statement; Create a pool; open by pool ID; at most 20 recent pools from the configured deployment, newest first, with explicit limited coverage. Show network and wallet status. | AC10–AC12 |
| Create `/create` | Title, purpose, goal in USDC, recipient address, deadline; live terms preview; review panel, then Create pool. No contribution bundled into creation. | AC01, AC09–AC11 |
| Pool `/pools/:poolId` | Purpose, exact progress, deadline, fixed recipient, terms, wallet's deposit/refund, status-specific action, and bounded event history. Link to Proof. | AC02–AC12 |
| Proof `/pools/:poolId/proof` | Evidence for this chain/deployment/pool: immutable terms, actual receipts and movements, evidence limitations, Studio provenance if available. | AC08, AC10, AC13 |

Modals, wallet dialogs, and receipt expansion stay within these screens. No extra dashboard, account page, or public explorer index. Pool URLs are relative until real hosting exists; never invent a public app origin. Local links must not be advertised as publicly reachable. Chain/deployment identity must remain visible; if the app later supports multiple deployments, links must disambiguate them.

## Layout and hierarchy

At 1440px, use a centered content width of 1120px, 32px page padding, and a simple top bar with wordmark, network badge, and wallet control. Pool content uses a flexible main column and a 340px action/terms panel. On smaller widths below 900px, stack the action panel immediately after the goal summary and before history. Use a single column at 390px with 16px margins. No fixed element may cover an input, wallet message, or primary action.

Pool desktop wireframe (layout description, not a screenshot):

```text
HuiPot / Goal Pool                  Arc Testnet       Connect wallet
Back to pools
Workshop recording kit             Active
Purpose and organizer

0.4 / 1 USDC                       Contribute
[40% goal progress]                [amount in USDC          ]
0.6 USDC remaining                 You have contributed: 0.4 USDC
Exact deadline + zone              [Review contribution]
                                   Fixed recipient: address + copy
Contributions and activity         Commitment and refund terms
[bounded actual events]            [View proof]
```

On mobile, order: title/status, amount/progress, deadline, recipient, action, commitment terms, wallet position, activity, proof link. Keep recipient and the concise commitment disclosure visible in the contribution review panel before signing, even if their full explanation sits below the action. Avoid using a truncated address as the only confirmation of a money destination.

Create uses a readable single form column, with a side preview on desktop and an inline review section on mobile. Deadline input explicitly labels `Asia/Ho_Chi_Minh (UTC+07:00)`; show an unambiguous date, time, and corresponding UTC instant before signing. Convert once to Unix seconds. Other browser-local display may be secondary only if its zone is labeled. The deadline is not an estimated time for payout.

## Typography, color, and spacing

- Use a system sans-serif stack for body and headings, with no external font dependency. Use system monospace for addresses/hashes. Amounts use tabular numerals.
- Body 16px/24px; secondary text 14px/20px; screen title 32px/40px desktop and 28px/36px mobile; primary amount 40px/48px desktop and 32px/40px mobile. Avoid all-caps body labels.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48px. Inputs/buttons at least 44px high; cards use 24px desktop or 16px mobile padding. Corner radius 12px cards, 8px inputs/buttons. Use borders and only subtle shadows.

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#F7F8FA` | Page background |
| Surface | `#FFFFFF` | Forms, cards, dialogs |
| Text | `#16202A` | Main labels/body |
| Muted | `#52606D` | Secondary text; never for disabled-only communication |
| Primary | `#0B5D4B` | Main action, with white text |
| Primary hover | `#084C3D` | Hover/pressed action |
| Border | `#D8DEE5` | Decorative separators/cards; not the sole control boundary |
| Control border | `#64748B` | Input boundary and interactive outlines |
| Focus | `#1D4ED8` | Visible keyboard focus, 3px outline plus 2px offset |
| Success | `#166534` on `#DCFCE7` | Confirmed paid/refunded labels |
| Warning | `#92400E` on `#FEF3C7` | Locking terms, wrong network, incomplete evidence |
| Error | `#B91C1C` on `#FEE2E2` | Reverted transaction and field errors |

These are proposed tokens, not a claim of measured rendered contrast. Studio must check WCAG AA text contrast (4.5:1 normal, 3:1 large) and 3:1 meaningful non-text controls. Status always includes words/icons, never color alone.

## Reusable components

Use a consistent app header, network badge, wallet button, pool card, amount/progress summary, status badge, fixed-terms panel, USDC input, address/copy control, deadline display, transaction review panel, transaction status panel, activity row, evidence card, and empty/error panel. Reuse the same amount formatter and chain identity everywhere.

The progress bar has an accessible name and exact numeric value; it cannot exceed 100%. Pool cards show the goal, amount, status, and exact deadline. Funded/Paid progress remains at 100%; refunds do not rewrite the historical amount raised. Refunding shows both historical deposits and remaining refundable principal. Avoid implying that all historical deposits are still held after payout/refund.

The review panel shows network, contract target, action, pool ID, recipient of the eventual transfer, exact principal, gas estimate when available, and effect on withdrawal rights. For contribution, distinguish “Deposit to pool contract” from “Successful pool pays [fixed recipient].” For payout/refund, show transfer destination and amount. Creation shows zero deposit plus fee and all immutable terms. Do not request an allowance for native USDC. If gas cannot be estimated, show that it is unavailable; mainnet review must resolve the reason before a proposal to sign.

Address controls expose the full checksummed address in review, allow copy with keyboard feedback, and use real explorer links only on a validated configured network. Explorer link templates must be checked before use. No invented transaction hashes or plausible-looking placeholder addresses.

## Money rules and action copy

Before creation and every contribution, show:

> Contributions are locked. If the goal is reached before the deadline, anyone can send the full pool to the fixed recipient immediately. If the goal is not reached, you can claim your deposit after the deadline. Network fees are not refunded. The pool does not guarantee delivery of the stated purpose.

Create review requires acknowledgment that terms and recipient cannot be changed and the pool cannot be canceled. Contribution review requires acknowledgment of the locking/payout/refund terms. Acknowledgment clarifies behavior; it is not a security guarantee.

| Pool state | Main action / helper copy |
| --- | --- |
| Active | “Review contribution”; show remaining capacity. A “Use remaining goal” shortcut fills only that amount, never the wallet's entire gas balance. |
| Funded | “Review payout”; “The goal is met. This sends [amount] USDC to the fixed recipient. Anyone may trigger it.” |
| Paid | “View payout proof”; show confirmed amount and destination. No contribution or refund control. |
| Refunding, wallet has claim | “Review refund”; “Claim [amount] USDC back to this wallet. You pay the network fee.” |
| Refunding, disconnected | “Connect wallet to check your refund.” |
| Refunding, no wallet claim | “This wallet has no unclaimed contribution.” Other contributors may still have claims. |
| Closed, all refunded | “Closed — all refunds claimed.” Retain that wallet's actual refund receipt when available. |
| Closed, no deposits | “Closed — no contributions.” Never say a refund was transferred. |

After a signature request, label the state “Waiting for your wallet.” After a transaction hash, use “Transaction submitted” or “Confirming transaction.” Use “Contribution confirmed,” “Payout confirmed,” or “Refund confirmed” only after verified successful execution for the intended action. “Funded” is not “Paid.” The app cannot make refunds automatic.

## Required interaction and error states

| State | Required behavior |
| --- | --- |
| Initial loading | Skeleton for known layout; no fabricated amounts, progress, or receipts; mark region busy. |
| Empty home | “No pools found in this deployment yet.” Offer Create or pool-ID lookup. Distinguish from failed RPC. |
| Unknown pool | “Pool not found on this deployment.” Show network/contract identity and back/lookup actions. |
| Disconnected wallet | Read-only browsing stays available; write action offers Connect. No request to enter a secret. |
| Wrong network | Label expected/current network; offer a supported wallet switch request; disable money actions until wallet and read client agree. |
| Invalid form | Field-specific explanation beside the field; keep values. Include amount precision/cap, recipient, UTF-8 limits, and expired/too-distant deadline. |
| Insufficient balance | Explain principal plus gas requirement. Do not promise that a transaction will succeed from a stale estimate. |
| Stale data / unavailable RPC | Show last checked block/time when known and a retry action. Disable writes if current chain/pool state cannot be validated. Never turn stale zero into “no funds.” |
| Wallet/account change | Invalidate previous simulations/prepared requests and re-read the new wallet's claim. Confirmed history stays associated with its original account and chain. |
| Rejected signature | “You declined the wallet request.” Preserve inputs; allow an explicit retry; no success indicator. |
| Submitted/pending | Disable duplicate submission for that action; show actual hash and validated explorer link, plus persistent status. No automatic resubmission. |
| Replaced transaction | Follow the actual replacement only if it performs the intended action; a cancellation or changed action cannot become app success. |
| Failed/reverted | State that the operation did not complete and fees may have been spent; refresh status/capacity and offer a reviewed retry. |
| Uncertain timeout | “Confirmation unavailable.” Recheck the known hash/account before allowing a duplicate; never claim failure or refund from a timeout alone. |
| Receiver failure | Explain the unsuccessful payout/refund and unchanged entitlement; retry only to the original destination. Do not offer an unsupported rescue/change-recipient action. |
| Countdown boundary | Re-read chain state at expiry; the local clock alone never enables refund. |

## Proof screen and absent evidence

Use evidence cards, not promotional success counters. Show the selected chain/deployment/pool, expected action, actual hash, receipt status, checked block, amount, sender/destination, event match, and native-transfer evidence status. Label what was observed and what could not be verified.

- No generated project: “Studio project not recorded yet.” No fake URL or success badge.
- No deployment: “Contract not deployed.” Do not show sample addresses as live ones.
- No verified transaction: “No verified transaction yet.” Preserve a readable explanation of what the future proof will show.
- Local fixture: a persistent “Demo data — no funds moved” notice.
- Testnet receipt: “Testnet evidence — not mainnet submission proof.”
- Known successful payout event but no independently checked movement: “Execution confirmed; recipient transfer evidence not yet verified.”
- Pending, failed, wrong-chain, wrong-contract, unrelated-pool, missing-event, or inaccessible evidence: label the specific state; never award a verified badge.

Native payouts/refunds can have zero outer transaction value. An ERC-20-interface Transfer event is not required by the chosen native flow. The current Arc system Transfer log is a separate native-evidence path: validate its official emitter, from/to, and 18-decimal amount as described in SPEC.md and ARC_TOOLING.md. The app must not infer recipient payment from a typed amount or a hash alone. A verified mainnet transaction is only one submission artifact; it does not imply the public app, video, eligibility, or submission is complete.

## Accessibility and visual acceptance

Use semantic headings, labels, buttons, links, and form errors associated with their inputs. Support keyboard-only navigation, logical focus order, visible focus, modal focus trapping/restoration, and Escape dismissal when safe. Announce transaction progress with a polite live region; show actionable errors without repeated alerts. Touch targets are at least 44px. Respect reduced-motion settings; no essential animation. Wrap long addresses/hashes without horizontal overflow. Keep status and text understandable at 200% zoom.

Studio must supply actual 390px and 1440px screenshots for the four screens and relevant Active, Funded, Refunding, empty-proof, pending, and failure states. Record which are real chain data and which are labeled fixtures. Inspect overflow, control sizes, measured contrast, keyboard/focus, error labels, full-address review, and loss of information after wallet changes. If screenshots or browser execution are unavailable, mark visual checks not run and provide a manual checklist; a written design is not visual evidence.

## Design gate

This design accompanies the approved D1–D8 specification for milestone A. Studio implements it only after the Phase 3 review gate authorizes the app phase, using milestones B–D in [STUDIO_PROMPTS.md](STUDIO_PROMPTS.md). Future UI fixes must also go through Studio.
