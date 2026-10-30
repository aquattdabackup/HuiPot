# HuiPot video walkthrough script

Prepared October 30, 2026. English narration and recording instructions.

## One final video

Record short clips and assemble **one walkthrough containing both the Studio build evidence and the app transaction**. Suggested length: 3–4 minutes. This is an editorial recommendation, not a competition limit. The supplied competition text does not specify a duration or editing service. See [REQUIREMENTS.md](REQUIREMENTS.md).

Record landing/Studio footage now and rehearse on testnet. Current accepted live evidence is testnet only. The final submission transaction segment requires separately verified mainnet operation, a concrete human-approved plan and funds-and-fees budget, and human signing. This script authorizes no deployment or spending. Never read mainnet narration over testnet footage. A deployment-only transaction does not demonstrate USDC moving through the app.

## Before recording

- Open the [existing Studio thread](https://studio.arc.io/app/019740f2-a909-4f38-9f87-4b5c0a448fbf?thread=bdac681b-ff5b-4fcd-9bb3-2c01c946c6bb), [app](https://hui-pot.vercel.app), and [repository](https://github.com/aquattdabackup/HuiPot). Studio content and reviewer access have not been independently inspected.
- Prefer readable 1920×1080, 16:9 footage. Close unrelated tabs and notifications. Never show keys, recovery phrases or authentication tokens. Public addresses/hashes are appropriate evidence.
- Record each scene separately; add voiceover afterward if easier. Trim waiting while retaining the network, pool and transaction identity across cuts.
- Locate actual Studio generation messages and their outputs. Do not rerun generation or fabricate build history just for recording. Label any fresh test run as fresh; do not relabel independent Codex results as Studio results.
- The MetaMask malicious-site classification remains unresolved. Do not bypass, disable or conceal a warning to manufacture a clean wallet demonstration.
- Before the mainnet segment, record verified network, app revision, contract, pool ID, contributor, recipient, approved amounts/fees and hashes. Do not reuse the testnet address as a mainnet address.

## 1. Landing and problem — 0:00–0:20

**Screen:** Show the hero, animation and “Pool together. Make it happen.” Slowly scroll a little. The hero animation illustrates the product; it is not transaction evidence.

**Voiceover:**

“When a group collects money for a shared goal, two questions matter: where will the money go, and what happens if the goal is missed? HuiPot makes those rules explicit: a fixed recipient, a funding target, and a deadline.”

## 2. Built with Arc Studio — 0:20–1:00

**Screen, in order:**

1. Existing HuiPot Studio project name and URL.
2. An actual historical contract/app generation prompt and its output.
3. `contracts/HuiPotGoalPool.sol`: briefly show `createPool`, `contribute`, `payout`, `claimRefund` in the available viewer.
4. Actual Studio test output and generated app preview/files. Only use counts visible in the actual run.

**Voiceover:**

“I built HuiPot with Arc Studio, from the smart contract and tests to the working application. Here is the actual project history, the generated contract, and the test results. The contract defines how pools are created, how contributions are recorded, and when payouts or refunds are available.”

**Condition:** Match these statements with visible real evidence. If messages/results are unavailable, identify the gap instead of inventing it. The recording-assistance prompt below is not proof of the original build.

## 3. Create a pool — 1:00–1:25

**Screen:** Create form → review → human wallet action → confirmed pool page. Use a separately authorized network and budget for any new transaction.

| Field | Content |
| --- | --- |
| Title | Community Workshop Fund |
| Purpose | Pool USDC to fund equipment for a community workshop. |
| Goal | Separately approved small demo amount; this script sets no spending amount. |
| Recipient | Verified demo recipient; different from contributor makes the transfer easier to follow. |
| Deadline | Valid future local date/time, leaving enough recording time. |

**Voiceover:**

“Let's create a community workshop fund. I set the USDC goal, the recipient, and the deadline. These terms cannot change after creation. The review shows exactly what I am submitting, and creating the pool does not include a contribution.”

## 4. Contribute through the app — 1:25–1:55

**Screen:** Pool terms and ID → contribution amount → Review contribution → human wallet confirmation → confirmed contribution and progress. Keep the network visible. One contribution reaching the goal is sufficient; two contributions are optional and require fees for both.

**Final mainnet voiceover — only with verified mainnet footage:**

“Now I contribute real USDC through the app on Arc mainnet. Before signing, I review the amount and the pool terms. Once the transaction confirms, HuiPot updates the funding progress and provides a link to the transaction.”

**Testnet rehearsal alternative:**

“This rehearsal uses test USDC on Arc Testnet. I review the contribution, confirm it in my wallet, and check the updated funding progress.”

## 5. Payout — 1:55–2:20

**Screen:** Funded → Review payout with recipient/amount → human confirmation → Paid. This is a triggered transaction, not an automatic background payment.

**Voiceover:**

“The target is reached. Anyone can trigger the payout, but the destination is always the recipient fixed when the pool was created. I review the payout and confirm it. The pool now shows Paid.”

## 6. Verify the payment — 2:20–2:50

**Screen:** Open Proof with the payout hash. Show receipt status, pool ID, PaidOut event, recipient and transfer amount. Open that same transaction in the official explorer; show success and transfer from contract to recipient. Verify network/contract/hash and funds movement, not just the green banner. The submission version must show mainnet evidence.

**Voiceover:**

“The Proof page checks the receipt, pool event, amount, and recipient. The explorer independently shows the transaction and the USDC transfer from the contract to the intended recipient. This connects the app interaction to an actual onchain payment.”

## 7. Refund alternative — 2:50–3:15

**Screen:** Existing [testnet pool 8](https://hui-pot.vercel.app/pools/8), Closed state and refund Proof. Add visible caption: **Separate Arc Testnet refund example**. Genuine earlier screenshots/recordings may illustrate Refunding → Closed. Do not stage the completed pool as a new transaction.

**Voiceover:**

“There is also a refund path. In this separate testnet example, the deadline passed before the target was reached. The contributor claimed their deposit back. The proof shows the refund returning to that contributor. Refunds must be claimed, and network fees are not refunded.”

**Evidence:** 0.2 test USDC returned to the contributor, transaction `0x0b3cb3825d36607b91e809604b1c22afdc6805e274c7389b02ab8f90bc326355`. See [TESTNET_DEMO_ACCEPTANCE.md](TESTNET_DEMO_ACCEPTANCE.md). This optional scene does not replace the mainnet requirement. Existing paid pool 7 and closed pool 8 cannot be reused for new contributions.

## 8. Close — 3:15–3:35

**Screen:** Landing/end card with app, repo and Studio project links; readable “Unaudited contracts” note. Put clickable links alongside the video in the submission too.

**Voiceover:**

“HuiPot is for groups funding a shared purpose with clear rules and verifiable payments. It enforces the funding rules, but does not guarantee delivery of the project itself. The app, source code, and Arc Studio project are linked with this demo.”

## Optional Studio prompt: locate real recording evidence

Prepared, not executed. Paste in the existing project if assistance locating evidence is needed:

```text
Help me prepare a factual video walkthrough of this existing HuiPot project.
This is a read-only recording-preparation task. Do not change code, create a
new project, deploy, request signatures or change hosting.

Identify actual existing messages, files and test output that demonstrate
the contract, tests and app were built in Arc Studio. Return an ordered
shot list with exact available message/file locations for a 40-second
Studio segment. Include contracts/HuiPotGoalPool.sol and createPool,
contribute, payout, claimRefund; actual test output; and the generated app
preview/files where available.

Distinguish historical evidence, fresh test execution and independent
review results. Do not invent build history, test counts, deployment,
transactions or MetaMask clearance. State any missing evidence explicitly.
Do not start generation again merely to create footage. I will record the
screen and narration myself. Return the short shot list in English.
```

## Assemble and check

Name clips `01-landing` through `08-close`; assemble one timeline with English voiceover and optional subtitles. Gentle cuts are sufficient. Preserve transaction continuity. Label testnet footage and remove all placeholders. Never overwrite a testnet badge with a mainnet caption, describe payouts/refunds as automatic, or claim an audit or wallet clearance.

Confirm reviewer access to the final video, Studio project, app, repository and explorer links. Export one final video; publishing/submitting are separate user actions. This task produced a script, not a recorded/uploaded video or mainnet evidence.
