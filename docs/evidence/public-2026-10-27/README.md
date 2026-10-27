# Public browser observations — October 27, 2026

Evidence captured through the in-app browser. No wallet connected or transaction submitted. Public deployment SHA not obtained.

- Top-level create/proof/pool text and pool-config.png: BEFORE user-reported redeployment; historical missing configuration gate. rpc-read.json is a separate environment HTTP 403 failure, not proof of an Arc outage.
- postdeploy/create.txt and create-configured.png: AFTER redeployment; gate absent. Screenshot is the visible viewport and can clip the page width; it is not a responsive-layout certification.
- postdeploy/proof.txt: pool #1 not-found UI.
- postdeploy/pool-loading.png: loading skeleton captured between retries. It is NOT a screenshot of the error text. Error/retry observations are recorded in PUBLIC_POSTDEPLOY_RECHECK.md.
- postdeploy/connect-button.json and connect-submit.txt: PF2 live DOM semantics and wallet chooser plus six empty-form validation errors. No provider selected. Form reset after observation.

See ../../PUBLIC_POSTDEPLOY_RECHECK.md and ../../STUDIO_PUBLIC_FLOW_FIX.md for conclusions and limitations. These artifacts do not establish successful creation, USDC movement, Proof validity or end-to-end acceptance.
