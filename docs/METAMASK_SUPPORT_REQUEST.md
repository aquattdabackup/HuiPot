# MetaMask support request — prepared detail and submission status

Please help investigate a possible incorrect website classification and route this to manual review if appropriate.

Website: https://hui-pot.vercel.app/
Network: Arc Testnet, chain ID 5042002
Contract: 0x81a139599d252eb2dc2bbb6c267e911a21264288
Explorer: https://explorer.testnet.arc.io/address/0x81a139599d252eb2dc2bbb6c267e911a21264288
Repository: https://github.com/aquattdabackup/HuiPot
Deployment source shown in Vercel: 589b8ec1d7e25693bd129df174de5e5facd433f3

MetaMask displays “Malicious site” during a request to create a pool. The operator has stopped signing pending investigation. The intended function is createPool(address,uint256,uint256,string,string), selector 0x3afabdd5, with no native-token deposit attached. This is an unaudited testnet application built using Arc Studio.

Read-only inspection found the expected contract address and createPool construction in the public main JavaScript asset. Its content matches a local build after normalizing generated chunk filenames; this is not a full website security assessment. We also found incorrect ConnectKit appUrl metadata pointing to studio.arc.io rather than the actual application origin, and have prepared a correction. We do not know whether this is related to the warning.

Please identify whether the flag concerns the URL, contract address or transaction simulation, and advise the review/remediation process. We are not requesting that a legitimate warning be bypassed and do not claim the classification is necessarily false. If a manual review is opened, please provide a case reference and indicate which further evidence is needed.

## Submission status

The user explicitly authorized sending public project details. A concise version was sent through https://support.metamask.io/chat, followed by a request for a human agent/manual-review form. The initial AI response did not identify the detection reason or create a case reference. This full prepared text was not sent verbatim; no confirmed human ticket or delisting is claimed. Subsequent technical evidence is in METAMASK_DEEP_RECHECK.md.
