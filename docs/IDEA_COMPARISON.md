# Phase 1 — Twelve ideas and a three-option shortlist

Date: October 24, 2026 (Asia/Ho_Chi_Minh).
Status: comparison complete. On October 24, 2026, the user selected **HuiPot Goal Pool** and authorized Phase 2. The comparison below preserves the Phase 1 rationale; the proposed specification, design, and browser prompts are now prepared for review. Nothing has been built.

## Decision in brief

The user selected **HuiPot Goal Pool**, the recommendation for understandable value, meaningful contract behavior, and a compact demonstration. **TeamSplit Invoice** was the simplest delivery alternative. **One-Delivery Escrow** had a strong customer problem but greater dispute and deadline complexity. Selecting the concept does not approve its detailed money rules; those are proposed in [SPEC.md](SPEC.md).

The user approved Phase 1 and the Arc Studio browser route. Installation and authentication are not prerequisites to repeat. Under `PROMPT.md` and `STUDIO_HANDOFF.md`, Phase 1 is a planning exercise; Studio generation starts only after idea selection and specification approval. No prompt was sent to Studio for this comparison.

## Sources, assumptions, and limits

- Rubric and submission requirements: [user-supplied competition text](sources/competition-user-supplied.txt), summarized in [requirements](REQUIREMENTS.md). The live [DoraHacks page](https://dorahacks.io/hackathon/arc-microgrants-2/detail) again returned HTTP 405 during this check. These are supplied rules, not independently authenticated current contest terms.
- Supplied weights: real mainnet USDC proof 30%, Studio use across contracts/tests/app 25%, working product 25%, potential 20%.
- Suggested categories include escrow, scheduled payments, splitting, shared treasuries, and software payments. None is rejected merely for belonging to a common category.
- Internal scope preference: one clear user flow, at most three contracts and five screens. October 30 is a proposed internal target, not a confirmed deadline commitment. The supplied November 1 closing date has no stated hour or time zone.
- All ideas assume willing wallet users who already have USDC on the relevant network. Fiat onboarding, bridges, exchange-rate guarantees, and gas sponsorship are excluded from the shortlist. For local cash-only groups, a bank transfer or spreadsheet may be more useful.
- Mainnet availability/configuration, public hosting, eligibility/funding history, and the live submission form remain later verification gates. The [Arc Studio homepage](https://studio.arc.io/) currently describes testnet deployment and says Studio does not sign, fund, or submit mainnet transactions for the user. This common delivery dependency applies to all candidates; no score proves it has been solved.
- Customer demand, adoption, willingness to pay, and a production security review are unvalidated. Comparative research below is narrow; no claim of worldwide novelty is made.

## Twelve concepts

Names are working labels, not trademark checks or a proposal to rename the repository.

| ID | Concept and target user | Problem | Proposed differentiator | Why USDC / a shared contract helps |
| --- | --- | --- | --- | --- |
| 1 | **HuiPot Goal Pool** — small clubs and online teams already using USDC | Nobody wants to hold everyone's money before a shared expense is fully funded. | One purpose, one funding target, one deadline, one disclosed recipient; unsuccessful pools give contributors a claimable refund. | Shared custody enforces the funding condition and visible contribution ledger instead of requiring the organizer's personal wallet. USDC gives a common unit for the budget. |
| 2 | **TeamSplit Invoice** — small freelance teams | A client pays one person, who must manually redistribute the invoice. | A named invoice with fixed recipients and shares, plus a receipt showing each allocation. | One app payment allocates USDC under agreed rules; collaborators can inspect their entitlements without relying on the team lead to redistribute. |
| 3 | **One-Delivery Escrow** — a freelancer and one client | The freelancer cannot see whether payment is reserved; the client does not want to pay fully before acceptance. | One funded deliverable with visible approval and exit deadlines, without a marketplace or arbitration service. | A contract visibly reserves USDC and enforces the agreed release/exit conditions. It cannot judge work quality. |
| 4 | **Stipend Unlock** — small community programs paying contributors | Recipients cannot tell whether promised future installments are actually funded. | A small, prepaid stipend with a clear next claim date and funded balance. | USDC is reserved and unlockable on agreed dates without depending on a monthly manual transfer. Users still submit transactions; no assumed automation. |
| 5 | **Sponsor Bounty Pot** — open-source maintainers and a sponsor | A promised bounty may disappear after someone does the work. | One funded task, one named reviewer, and a public award/refund record. | USDC funding is visible and the award is constrained by agreed authority and expiry; acceptance remains a human judgment. |
| 6 | **Club Reimburse** — a small club with a few approvers | Expense repayments are opaque and depend on one treasurer. | A bounded expense request with multiple approvals and a shared payment history. | Shared USDC custody can enforce approval rules, though it adds signer coordination and governance complexity. |
| 7 | **RSVP Deposit** — small workshop organizers | Free reservations become no-shows. | A small refundable reservation deposit tied to check-in. | A contract can hold deposits and record refunds, but it cannot independently prove attendance. |
| 8 | **Rotating Savings Circle** — trusted saving groups | Members want a visible schedule for rotating pooled payouts. | Public contributions and payout order for each round. | USDC makes transfers legible, but a contract cannot make later members contribute after receiving an early payout. |
| 9 | **Yield Goal Pool** — groups saving for an expense | Idle pooled money does not earn yield. | Combine a group target with a lending strategy. | USDC can enter a yield protocol, but that introduces external protocol, liquidity, and asset risks unrelated to the core expense problem. |
| 10 | **Autonomous API Budget** — developers running paid agents | An agent needs limits and receipts when purchasing API services. | Per-service spending caps and a visible USDC usage budget. | Programmable payments can enforce limits, but a real demo needs a live paid service, metering, signing, and settlement integration. |
| 11 | **Cross-chain Remittance Desk** — cross-border senders | Recipients use different chains or need local currency. | A transfer journey spanning source funding to recipient settlement. | USDC is a common settlement unit, but a useful product depends on supported routes, liquidity, and potentially fiat providers. |
| 12 | **Plain USDC Payment Link** — solo sellers | Sharing an address and reconciling payments is inconvenient. | A reusable payment link and receipt page. | USDC transfer is useful, but the proposed custom contract adds little over direct wallet payment without a stronger workflow. |

## Internal scoring

Score each official category from 1 to 5, where 1 means weak expected evidence/delivery, 3 means plausible but dependency-heavy, and 5 means an unusually direct demonstration or strongly bounded product. For potential, 5 would need stronger demand evidence than this exercise has; no candidate receives it.

**Weighted total = 6P + 5S + 5W + 4G**, out of 100, where P = mainnet proof, S = Studio use, W = working product, and G = growth potential.

These are internal forecasts of how convincingly a tightly scoped version could demonstrate the rubric. They are not organizer scores, probabilities of winning, earned marks, or evidence that anything works today. A missing mandatory artifact cannot be offset by a high total. All candidates receive S=4 because the same Studio-first provenance plan applies, but no Studio build evidence exists. A different score here merely because an idea is fashionable would be misleading.

| ID | Idea | P /5 (30%) | S /5 (25%) | W /5 (25%) | G /5 (20%) | Total /100 | Basis for differences |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | HuiPot Goal Pool | 5 | 4 | 5 | 4 | **91** | Funding/payout or failed-goal refund makes funds movement and user value visible; bounded scope, reusable group use case. |
| 2 | TeamSplit Invoice | 5 | 4 | 5 | 3 | **87** | Very clear payment/allocation receipt and compact flow; weaker differentiation in an established category. |
| 3 | One-Delivery Escrow | 4 | 4 | 4 | 4 | **80** | Useful funded work agreement; release, expiry, and disagreement paths make a reliable demo harder. |
| 4 | Stipend Unlock | 4 | 4 | 4 | 3 | **76** | Straightforward funded claims, but time-dependent demonstration and established alternatives limit the advantage. |
| 5 | Sponsor Bounty Pot | 4 | 4 | 3 | 4 | **75** | Strong funded-incentive story; reviewer discretion, work acceptance, and expiry expand the product. |
| 6 | Club Reimburse | 4 | 4 | 3 | 3 | **71** | Clear payout evidence; approver coordination, recovery, and receipt privacy complicate completion. |
| 7 | RSVP Deposit | 3 | 4 | 3 | 3 | **65** | Deposits are easy to show; trustworthy attendance and fair forfeiture are unresolved. |
| 8 | Rotating Savings Circle | 3 | 4 | 2 | 3 | **60** | A first payout proves little about the later-round default problem; robust behavior exceeds the scope. |
| 9 | Yield Goal Pool | 2 | 4 | 2 | 3 | **54** | Yield integration and withdrawal availability weaken the near-term proof and completion path. |
| 10 | Autonomous API Budget | 2 | 4 | 2 | 4 | **58** | Plausible software-payment expansion, but a real paid service and secure agent operation are unverified. |
| 11 | Cross-chain Remittance Desk | 2 | 4 | 2 | 4 | **58** | Significant use case, but multi-network/fiat dependencies exceed a compact Arc-only proof. |
| 12 | Plain USDC Payment Link | 5 | 4 | 4 | 1 | **74** | Easy transaction evidence, but weak incremental contract value and unclear reason to adopt this product. |

The payment-link result illustrates why the total is not the sole selection rule: the rubric heavily rewards a working transaction, yet the concept still fails the user-value filter. Low scores on integration-heavy ideas do not imply that those categories are ineligible.

## Separate feasibility and risk assessment

These columns are internal planning filters, not additional competition weights. Risk describes the proposed fund exposure relative to other concepts, not audited safety.

| ID | Feasibility for a compact build | Clarity to a new user | Fund-loss / trapped-fund exposure | Decision |
| --- | --- | --- | --- | --- |
| 1 | High, subject to refund/deadline review | High | Medium: pooled custody, refund accounting, recipient cannot be recalled after valid payout | Top 3 |
| 2 | High | High | Lower relative exposure: recipient/rounding errors and failed claims still matter | Top 3 |
| 3 | Medium | High | Medium-high: deadline mistakes or disagreement can unfairly release or lock funds | Top 3 |
| 4 | Medium-high | High | Medium: cancellation policy, time boundaries, and long-lived balances | Reserve |
| 5 | Medium | Medium-high | Medium-high: subjective reviewer decisions and unclaimed awards | Reserve |
| 6 | Medium-low | Medium | Medium-high: lost signers, unauthorized approvals, treasury exposure | Reserve |
| 7 | Medium-low | High | Medium-high: false check-in or unfair forfeiture | Eliminate for this round |
| 8 | Low | Medium | High: participant default is an economic risk beyond contract correctness | Eliminate for this round |
| 9 | Low | Medium | High: strategy loss, liquidity, external dependency | Eliminate for this round |
| 10 | Low until real integration is validated | Medium-low | High: agent signing/abuse, metering, settlement | Eliminate for this round |
| 11 | Low | High at pitch level, low operationally | High: bridge/provider and settlement failure | Eliminate for this round |
| 12 | High | High | Lower relative exposure, still address/payment errors | Eliminate for weak product value |

## Kill list and reconsideration conditions

- **7 — RSVP Deposit:** attendance needs a trusted attestation and disputes over penalties. Reconsider only with an actual organizer and a simple accepted check-in policy.
- **8 — Rotating Savings Circle:** early recipients can stop contributing; the contract does not solve that default. Requiring full pre-funding changes the customer benefit. Exclude lending, credit scoring, and enforcement mechanisms from this round.
- **9 — Yield Goal Pool:** adds investment and external liquidity risk to a problem that works without yield. Reconsider only after a separately reviewed strategy and network integration; it is unnecessary for the current goal.
- **10 — Autonomous API Budget:** real service availability, metering, and key handling are not validated. Do not present a mock API as proof of paid autonomous commerce. Reconsider after an end-to-end provider integration is demonstrated.
- **11 — Cross-chain Remittance Desk:** bridges, supported assets, settlement, and possibly fiat/compliance operations multiply dependencies. Reconsider a much narrower single-network version; that would be a different concept.
- **12 — Plain USDC Payment Link:** the initial version is largely a wallet transfer interface. Retain only if a concrete unmet workflow makes the contract necessary, such as candidate 2's fixed team allocation.

These are product/scope decisions, not legal determinations or claims that the competition prohibits these categories.

## Recommended three and tradeoffs

### 1. HuiPot Goal Pool — recommended balance

**Pitch:** a small group funds a shared purpose in USDC; the disclosed recipient can receive funds only when the goal is met, otherwise contributors can reclaim them under the agreed deadline rules.

- Proposed first audience: a small online club pooling a known workshop or shared-tool expense, with members who already use USDC. Do not promise that funds prove the organizer delivered the event or purchase.
- Demonstration concept: create a tiny pool, contribute through the app, and show a confirmed recipient payout; additionally validate the unsuccessful-pool refund path. Exact amounts require later approval.
- Planning envelope: about one core contract and four screens, approximately 3–4 focused implementation/review days after specification approval. This is an effort estimate, not a deadline guarantee; hosting, access, wallet actions, and revision delays are outside it.
- Main tradeoff: custody plus expiry/refund accounting is more complex than a simple split. Fixed funding conditions and recipient intent must be clear before contributors commit. Thresholds do not guarantee the real-world outcome.
- Potential: repeated pools for existing communities. Demand still needs validation with a real organizer.
- Boundary: this is not rotating savings, lending, yield, pooled investment, or an open marketplace. The existing HuiPot repository/name can remain.

### 2. TeamSplit Invoice — strongest simplicity

**Pitch:** a client pays one USDC invoice and the agreed team allocations become visible and claimable without a team lead manually redistributing them.

- Proposed first audience: a small freelance design/development team sharing one project payment.
- Demonstration concept: show fixed recipients and shares, pay the invoice in the app, then show actual recipient receipt/claim evidence. Allocation alone must not be mislabeled as completed payout.
- Planning envelope: about one core contract and three screens; approximately 2–3 focused implementation/review days after specification approval, excluding external gates.
- Main tradeoff: simplest flow but less differentiated. Invoice context, clear recipient confirmation, and readable receipts must provide more value than a generic splitter.
- Potential: recurring team invoices. Exclude tax calculations, legal payroll claims, fiat conversion, changing shares after payment, and streaming from the first version.

### 3. One-Delivery Escrow — strongest funded-work story

**Pitch:** a client visibly reserves USDC for one deliverable, with a simple acceptance and exit agreement both parties can inspect.

- Proposed first audience: a freelancer and a known client completing one small fixed-price task.
- Demonstration concept: client funds through the app, approves delivery, and freelancer receives USDC; separately validate the chosen timeout/exit policy.
- Planning envelope: one or at most two contracts and four to five screens; approximately 4–5 focused implementation/review days after specification approval, excluding external gates.
- Main tradeoff: the chain cannot judge quality. Auto-refund can disadvantage a freelancer who has worked; auto-release can disadvantage a client. The user must choose an explicit tradeoff in Phase 2. No claim of trustless dispute resolution is justified.
- Potential: repeat client/freelancer relationships. Exclude arbitration, marketplaces, multiple milestones, identity scores, and automatic offchain quality verification.

## Comparable products checked

Read October 24, 2026. These sources establish related mechanisms, not compatibility with Arc, available integrations, licenses to copy code, or market validation for our version.

| Primary source | Observed mechanism | Implication for this shortlist |
| --- | --- | --- |
| [Kickstarter funding handbook](https://www.kickstarter.com/help/handbook/funding) | All-or-nothing funding; unsuccessful campaigns do not collect funds. | Goal-based funding is established. HuiPot proposes small group onchain deposits/refunds, which is a different custody flow, not a globally new funding mechanism. |
| [Splits protocol documentation](https://splits.org/protocol/docs/) | Existing splitter contracts and fund-distribution components. | TeamSplit must differentiate through a focused invoice experience, not claim invention of splitting. No Splits integration is assumed. |
| [Sablier overview](https://docs.sablier.com/concepts/what-is-sablier) | Token distribution over time, including vesting and recurring-payment products. | Stipend Unlock has existing category comparables; a generic schedule alone is a weak differentiator. No Sablier deployment or integration is assumed. |

## Phase gate

Completed October 24, 2026: the user chose **1 — HuiPot Goal Pool**, reviewed Phase 2, then requested the GitHub push and Studio handoff. Milestone A contract/test generation is now authorized; see [STUDIO_GITHUB_START.md](STUDIO_GITHUB_START.md). The next gate is review of actual contract/test exports before app generation.
