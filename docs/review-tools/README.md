# Independent review instruments

These scripts were written by Codex to inspect the unchanged Studio source from Git revision `3f266fce3d0801a2c9df52cf535b371a33f27522`. They are review instruments, not Studio-authored product code or the application's regression test suite. They use synthetic local receipts and controlled React hook values; no wallet or network requests occur.

The source being inspected must retain the reviewed function/component structure. A later implementation can require changes to these instruments; their output does not automatically validate a newer revision. Results have been recorded in [the independent review](../INDEPENDENT_REVIEW.md).

With Bun 1.3.14, Node, and the reviewed project's locked dependencies installed, run from the repository root:

```text
bun docs/review-tools/review-probes.ts <reviewed-source-directory> <output-json-path>
node docs/review-tools/render-probes.cjs <reviewed-source-directory> <output-json-path>
```

Use distinct output paths to preserve the historical evidence. With no arguments, each script uses the current directory and its corresponding dated JSON file under `docs/evidence`. The first script executes the original receipt verifier and amount parser against local fixtures. The second renders the original components with controlled query/receipt/form values to reproduce render errors and false creation confirmation.

Successful script execution means the observations were collected. It does not mean the tested application behaviors passed; inspect the result fields and the review findings.
