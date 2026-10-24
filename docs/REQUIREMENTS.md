# Competition requirements and source status

Recorded October 24, 2026 (Asia/Ho_Chi_Minh).

## Provenance

User-provided competition URL: https://dorahacks.io/hackathon/arc-microgrants-2/detail

Source actually read: the user's uploaded `Pasted text.txt`, headed "Arc Microgrants: Built with Arc Studio". The user identified it as competition information. An HTTPS request to the DoraHacks URL failed with proxy `403 Forbidden`; no live page content was obtained. The requirements below faithfully summarize the supplied text, but its current equivalence to the live page has not been independently checked. Use it for planning and confirm operational details before installation, spending, or submission.

## Requirements stated in the supplied text

| Topic | Stated requirement or fact | Planning implication |
| --- | --- | --- |
| Awards | Eight microgrants of $500 USDC; $4,000 USDC total pool. | This is a competitive award, not guaranteed funding. Counts may change. |
| Closing date | November 1, 2026; applications reviewed as they arrive and decisions made in batches. | The October 30 target is internal. Exact cutoff time and time zone are absent. Earlier submission can yield earlier answers. Dates may change. |
| Build tool | Use Arc Studio from first contract through working app; contracts written, tested, and reviewed in Studio before deployment. | Preserve Studio provenance across contracts, tests, app, and fixes. Codex review is supplemental. |
| Deployment | Contracts deployed to Arc mainnet and a working Studio-built app live at a public URL. | Localhost, design mockups, slide decks, and testnet-only builds do not qualify. |
| Funds proof | At least one Arc mainnet transaction moving USDC through the contract and app. | A deployment transaction alone or an unrelated transfer is insufficient. Verify the intended app flow and funds movement. |
| Scoring | Mainnet USDC proof 30%; Studio use 25%; working product 25%; potential 20%. | Use these as the supplied rubric; predicted scores are internal estimates. |
| Suggested ideas | Escrow/conditional payouts, scheduled payments, payroll, vesting, splits/shared treasuries, and software-to-software payments. | These categories are explicitly welcomed, not inherently disqualified as too ordinary. |
| Polish | Experiments welcome; polish optional. | Prioritize a working flow, proof, and completeness. A beautiful interface is a preference. |
| Prior work | First-round submissions can enter if Studio-built and otherwise compliant; one microgrant per project. Work already funded by a Circle or Arc program is ineligible. | No stated new-name/new-repository/brand-new-project rule. Check funding history. Do not assume every prior entrant is eligible. |
| Rights and submissions | Work must be yours or you must have the right to submit it. One submission per project; teams may submit distinct projects. | Check rights and avoid duplicate submissions for the same project. |
| Participants | Individuals and teams worldwide, subject to sanctions/restricted-jurisdiction screening; pseudonymous submissions permitted. | Do not promise universal eligibility. Identity verification is after conditional selection for the payout recipient. |
| Payout and ownership | USDC on Arc; recipient needs a compatible wallet. No equity, IP assignment, or exclusivity. | Keep wallet secrets private and use the organizer's verification process. |
| Contract risk and fees | Small amounts recommended; submissions not audited by Arc or Circle; USDC needed for gas. | Use a human-approved budget including fees; do not treat contest review as a security audit. |

## Submission checklist

- Arc Studio project URL. The supplied example is illustrative, not a real project to reuse.
- Public URL of the working application.
- Contract address or addresses and one example transaction hash, with explorer.arc.io evidence.
- Public repository containing the project code.
- Actual video walkthrough showing the build in Studio and the mainnet transaction.
- Short description of the product and how Studio was used.
- Public builder profile on GitHub, X, or Farcaster.

The live submission form has not been inspected; additional fields, URL formats, or limits remain unknown. A README, a video script, and locally passing tests do not replace the listed submission artifacts.

## Resource links supplied in the text

- Arc Studio: https://studio.arc.io
- Arc docs: https://docs.arc.io
- Arc explorer: https://explorer.arc.io
- Circle developer docs: https://developers.circle.com

The text mentions an Arc Studio CLI, including retrieving a project URL, but does not specify installation/authentication/export details or network parameters. Follow-up direct documentation checks and read-only RPC checks are recorded in `docs/ARC_TOOLING.md`: CLI 1.2.2 is installed, mainnet/testnet chain IDs match the official docs, and Studio deployment is documented as testnet-only. The token binding is now saved and present, but cloud Studio access returns HTTP 403 even without authentication. The user reports successful browser login; that supports the proposed human-operated browser workflow. The live competition page remains unverified (last result HTTP 405).

## Product preferences, not competition rules

The original kit's October 30 target, 12-idea shortlist process, three-contract/five-screen limits, distinctive concept, polished design, brand-new project/name/repository, and per-phase approvals are not requirements stated in the competition text. The revised kit retains the planning target, concise ideation, scope limits, and review gates as internal process choices; it removes mandatory renaming/restarting and category exclusions. It treats polish and differentiation as optional priorities after the required working product and proof.
