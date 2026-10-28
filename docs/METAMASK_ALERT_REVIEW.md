# MetaMask malicious-site warning: investigation and remediation

Date: October 28, 2026. Reviewed source HEAD: `589b8ec1d7e25693bd129df174de5e5facd433f3` (application source at `53c8190`). User supplied screenshots show MetaMask labelling the site “Malicious site” during a createPool request. This is an unresolved public-demo blocker, not a proven compromise or a confirmed false positive.

## Evidence obtained without wallet signing

- Public origin `https://hui-pot.vercel.app/` returned HTTP 200 without redirect. Its HTML references `/assets/index-DKsGIngY.js` and the application stylesheet.
- Main JavaScript asset SHA-256: `e8a7c443330042d10ec4bc30ed2cfb7538b687ee866e19f87838b7b8d7e419f1`.
- That main asset contains the expected contract `0x81a139599d252eb2dc2bbb6c267e911a21264288`, the new InvalidPoolId error ABI, and createPool(address,uint256,uint256,string,string) call construction without a native value deposit.
- Its 1,592,452-character content matches a local build of reviewed source after normalizing eight-character generated JS/CSS chunk filename hashes. Raw byte hashes differ. This comparison covers only the main asset, not all dynamic chunks, runtime extension behavior or the entire deployment.
- Installed viem independently computes createPool selector `0x3afabdd5`, matching the visible prefix in the user's screenshot. Full wallet request bytes were not available; complete recipient/amount/deadline/value matching remains unverified.
- The fetched public MetaMask eth-phishing-detect `src/config.json` snapshot has 111,796 blacklist entries. No exact `hui-pot.vercel.app`, parent `vercel.app`, or string containing `hui-pot` was found. Snapshot SHA-256: `60e720b7b7006b06310d4b4520feee03d7ebbb2ca387f5697d59914030cb89b5`. This is one public list, not a live MetaMask/Blockaid verdict; fuzzy rules, other feeds and transaction classification remain untested. Absence from it does not prove safety.

## Concrete metadata defect (cause of warning NOT established)

`src/config.ts` passes `appUrl: 'https://studio.arc.io'` to ConnectKit getDefaultConfig while the actual application origin is `https://hui-pot.vercel.app`. The same mismatch is present in the public bundle. Studio is the builder, not the application's identity. Correct the app URL metadata through Studio as specified in STUDIO_WALLET_IDENTITY_FIX.md. This is a truthfulness/interoperability correction, not a guaranteed way to remove the MetaMask label. The current warning may originate from an injected-wallet domain assessment independent of that metadata.

## External review route

MetaMask's official security-alert documentation directs URL classification disputes to its support team when a report action is unavailable. The support homepage exposes Continue without wallet, leading to `https://support.metamask.io/chat`. That route opens an AI-powered support conversation; reaching the screen is not submission or a human-reviewed ticket. The user explicitly authorized contact, and the concise request and human-escalation follow-up were sent. The first AI response provided no detection reason or case reference; human review is not confirmed.

Prepared message: METAMASK_SUPPORT_REQUEST.md. It shares only public project facts and asks for the detection reason/manual review; it does not assert that the site is safe or audited. User authorization for this support contact was received. No wallet connection, email, keys or seed phrase is required for this prepared first message. If the service later requests contact details or screenshots, collect only what is necessary with permission.

Sources read:
- https://support.metamask.io/configure/wallet/security-alerts
- https://support.metamask.io/
- https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/README.md
- https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json

## Exit criteria

1. Studio corrects application identity metadata and runs check/build; independently review its diff. No contract redeployment needed.
2. A support report receives a reference or actionable guidance; do not claim one exists without a response.
3. Recheck the site's classification with security protection enabled after the review and any legitimate fixes. Only then reassess the unsigned createPool request and the human-operated demo.
4. Do not disable security checks, switch domains or wallets to bypass the warning, or call a test pass proof of site safety. Continue preparing non-transactional demo footage while this issue is open.

## October 29 deeper recheck

See METAMASK_DEEP_RECHECK.md: exact user calldata decoded and simulated, executable bytecode compared, 93 assets inspected (92 normalized matches), and two real Create validation/receipt gaps reproduced. The installed MetaMask injected connector does not receive appUrl; metadata correction is not a demonstrated alert fix.
