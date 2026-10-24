// Independent review instrument: executes unchanged exported functions with local fixtures.
// Not part of the Studio application/test suite. No network or wallet calls occur.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const snapshot = resolve(process.argv[2] ?? process.cwd())
const outputPath = resolve(process.argv[3] ?? 'docs/evidence/independent-app-probes-2026-10-24.json')
const source = readFileSync(resolve(snapshot, 'src/pages/Proof.tsx'), 'utf8')
const config = readFileSync(resolve(snapshot, 'src/config.ts'), 'utf8')
const transpiler = new Bun.Transpiler({ loader: 'ts' })
const functionStart = source.indexOf('async function verifyTx(')
const functionEnd = source.indexOf('\nexport function Proof()', functionStart)
if (functionStart < 0 || functionEnd < 0) throw Error('Cannot locate unchanged verifier')
const verifierCode = transpiler.transformSync(source.slice(functionStart, functionEnd))
const contract = '0x81a139599d252eb2dc2bbb6c267e911a21264288'
const recipient = '0x1111111111111111111111111111111111111111'
const contributor = '0x2222222222222222222222222222222222222222'
const other = '0x3333333333333333333333333333333333333333'
const system = source.match(/const ARC_SYSTEM_EMITTER = '([^']+)'/)![1]
const payoutTopic = source.match(/const PAID_OUT_TOPIC = '([^']+)'/)![1]
const refundTopic = source.match(/const REFUNDED_TOPIC = '([^']+)'/)![1]
const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const word = (value: bigint) => '0x' + value.toString(16).padStart(64, '0')
const addr = (value: string) => '0x' + value.slice(2).padStart(64, '0')
const payout = (amount = 10n ** 18n) => ({ address: contract, topics: [payoutTopic, word(1n), addr(other), addr(recipient)], data: word(amount) })
const refund = () => ({ address: contract, topics: [refundTopic, word(1n), addr(contributor)], data: word(4n * 10n ** 17n) })
const transfer = (from = contract, to = recipient, amount = 10n ** 18n) => ({ address: system, topics: [transferTopic, addr(from), addr(to)], data: word(amount) })
const cases = [
  { name: 'valid payout control', logs: [payout(), transfer()] },
  { name: 'payout without native movement evidence', logs: [payout()] },
  { name: 'payout with transfer to wrong recipient', logs: [payout(), transfer(contract, other)] },
  { name: 'payout with transfer from unrelated sender', logs: [payout(), transfer(other)] },
  { name: 'payout with wrong native amount', logs: [payout(), transfer(contract, recipient, 1n)] },
  { name: 'payout event amount below expected 1 USDC target', logs: [payout(1n), transfer(contract, recipient, 1n)] },
  { name: 'refund with unrelated native movement', logs: [refund(), transfer(other, recipient, 1n)] },
  { name: 'valid contribution unsupported', logs: [{ address: contract, topics: ['0xdcfa71ee125a676f843733d9d39dce2c918ecf9e92f96db4f24bdb5244ed68a0', word(1n), addr(contributor)], data: word(4n * 10n ** 17n) + word(4n * 10n ** 17n).slice(2) }, transfer(contributor, contract, 4n * 10n ** 17n)] },
]
const results = []
for (const fixture of cases) {
  const fetch = async () => ({ json: async () => ({ result: { status: '0x1', to: contract, logs: fixture.logs } }) })
  const verifier = new Function('fetch', 'HUIPOT_ADDRESS', 'arcTestnet', 'ARC_SYSTEM_EMITTER', 'PAID_OUT_TOPIC', 'REFUNDED_TOPIC', verifierCode + '\nreturn verifyTx;')(fetch, contract, { rpcUrls: { default: { http: ['local-fixture://no-network'] } } }, system, payoutTopic, refundTopic)
  const result = await verifier('0x' + 'a'.repeat(64), '1', recipient)
  results.push({ case: fixture.name, overallValid: result.overallValid, eventFound: result.eventFound, movementFound: result.arcTransferFound, movementDestinationMatches: result.arcTransferToMatchesRecipient })
}

const amountStart = config.indexOf('export function parseProductAmount(')
const amountEnd = config.indexOf('\nexport function formatNativeAmount', amountStart)
const amountCode = transpiler.transformSync(config.slice(amountStart, amountEnd).replace('export function', 'function'))
const parse = new Function('PRODUCT_DECIMALS', 'QUANTUM', amountCode + '\nreturn parseProductAmount;')(6, 10n ** 12n)
const amountResults = []
for (const input of ['-0.4', '1e3', '0,4', '0.000001', '0.0000001', '1' + '0'.repeat(60)]) {
  // Copy the exact input sanitation expression observed in both Create.tsx and Pool.tsx.
  const displayed = input.replace(/[^0-9.]/g, '')
  try {
    const amount = parse(displayed)
    amountResults.push({ input, displayed, parsedNative: amount.toString(), exceedsUint256: amount > (2n ** 256n - 1n) })
  } catch (error) {
    amountResults.push({ input, displayed, error: String(error) })
  }
}

const output = { type: 'Codex independent review probes; synthetic local receipts, no chain execution', sourceRevision: '3f266fce3d0801a2c9df52cf535b371a33f27522', proofResults: results, amountResults }
writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify(output))
