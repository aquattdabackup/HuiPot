# HuiPot Goal Pool

A small group pools USDC for one shared expense. The fixed recipient can receive the money when the target is fully funded; otherwise contributors can reclaim their deposits after the deadline.

**Status:** Phase 2 approved for milestone A; GitHub documentation handoff authorized. Studio contract/test generation is next. No contracts or application have been generated, tested, deployed, or published.

- [Product specification and proposed money rules](docs/SPEC.md)
- [Interface design](docs/DESIGN.md)
- [Studio browser prompts](docs/STUDIO_PROMPTS.md)
- [Start milestone A from the connected GitHub repo](docs/STUDIO_GITHUB_START.md)
- [Browser handoff and phase gate](docs/STUDIO_HANDOFF.md)
- [Competition requirements and source limitations](docs/REQUIREMENTS.md)
- [Execution log](docs/LOG.md)

Approved scope for milestone A: one native-USDC contract and four planned screens. Pool terms are fixed; contributions have no early withdrawal. Successful funding permits immediate payout to the fixed recipient. Failed goals permit individual principal refunds after the deadline; network fees are not refunded. App generation follows the separate contract-review gate.

Contracts are unaudited; none exists yet in this checkout. A funding target does not guarantee delivery of the stated purpose. Studio will generate source, tests, app code, and fixes after the applicable phase approval. Setup/run instructions will be added from actual reviewed exports, not guessed now.

Program planning follows the user-supplied competition text; current live terms and eligibility remain incompletely verified. The user authorized this documentation push to the existing public repo. Mainnet transactions, public app/video publication, and submission require later explicit authorization.
