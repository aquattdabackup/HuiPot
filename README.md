# HuiPot Goal Pool

A small group pools USDC for one shared expense. The fixed recipient can receive the money when the target is fully funded; otherwise contributors can reclaim their deposits after the deadline.

**Status:** Independently reviewed Studio source from Git revision `3f266fc`. All 112 supplied contract tests pass (zero failures/skips); production build/type checking and lint pass. Application findings keep the review gate open: amount input can change monetary meaning, Proof can report success without required checks, and transaction/input handling needs fixes. See the [independent review](docs/INDEPENDENT_REVIEW.md) and [targeted Studio fix prompt](docs/STUDIO_TARGETED_FIXES.md).

The transport JSON successfully recovered the source archive. Local compilation reproduces the exported artifact; its 4,081-byte runtime prefix matches saved Arc Testnet bytecode, with a differing metadata suffix. Browser layouts, real wallet flows, and mainnet proof remain unverified. Local main and existing documentation changes were preserved; the fetched revision was reviewed in `.review/studio-3f266fc/snapshot`.

- [Product specification and proposed money rules](docs/SPEC.md)
- [Interface design](docs/DESIGN.md)
- [Studio browser prompts](docs/STUDIO_PROMPTS.md)
- [Start milestone A from the connected GitHub repo](docs/STUDIO_GITHUB_START.md)
- [Browser handoff and phase gate](docs/STUDIO_HANDOFF.md)
- [Competition requirements and source limitations](docs/REQUIREMENTS.md)
- [Execution log](docs/LOG.md)

Product scope: one native-USDC contract and four screens. Pool terms are fixed; contributions have no early withdrawal. Successful funding permits immediate payout to the fixed recipient. Failed goals permit individual principal refunds after the deadline; network fees are not refunded. Current work is correction and validation of the existing Studio implementation.

Contracts are unaudited. A funding target does not guarantee delivery of the stated purpose. Contract, test, application, and fix provenance must come from Studio. The review records actual setup/check commands and their limitations; passing tests does not establish contract safety.

Program planning follows the user-supplied competition text; current live terms and eligibility remain incompletely verified. The user authorized this documentation push to the existing public repo. Mainnet transactions, public app/video publication, and submission require later explicit authorization.
