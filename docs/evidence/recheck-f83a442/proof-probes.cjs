// Codex review instrument. Executes unchanged production verifier/handlers with synthetic inputs.
// Not a Studio regression suite, browser test, RPC call, wallet transaction, or security audit.
// Usage: node functionality-probes.cjs SNAPSHOT OUTPUT_JSON
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const root = path.resolve(process.argv[2])
const output = path.resolve(process.argv[3])
const load = createRequire(path.join(root, 'package.json'))
const ts = load('typescript')
const React = load('react')
const { renderToStaticMarkup } = load('react-dom/server')
const viem = load('viem')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const transpile = text => ts.transpileModule(text, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
} }).outputText
const sharedExports = {};
new Function('exports', transpile(read('src/lib/verifyTxLogic.ts')))(sharedExports);
const {computeOverallValid} = sharedExports;
const proofSource = read('src/pages/Proof.tsx')
const contract = '0x81a139599d252eb2dc2bbb6c267e911a21264288'
const recipient = '0x1111111111111111111111111111111111111111'
const wallet = '0x2222222222222222222222222222222222222222'
const other = '0x3333333333333333333333333333333333333333'
const txHash = '0x' + 'a'.repeat(64)
const target = 10n ** 18n
const deposit = 4n * 10n ** 17n
const valueOf = name => proofSource.match(new RegExp(`const ${name} = '([^']+)'`))[1]
const emitter = valueOf('ARC_SYSTEM_EMITTER')
const topics = { paid: valueOf('PAID_OUT_TOPIC'), refund: valueOf('REFUNDED_TOPIC'), contribution: valueOf('CONTRIBUTED_TOPIC') }
const word = n => '0x' + n.toString(16).padStart(64, '0')
const addr = a => '0x' + a.slice(2).padStart(64, '0')
const paid = (n = target) => ({ address: contract, topics: [topics.paid, word(1n), addr(wallet), addr(recipient)], data: word(n) })
const contribution = (n = deposit) => ({ address: contract, topics: [topics.contribution, word(1n), addr(wallet)], data: word(n) + word(n).slice(2) })
const refund = () => ({ address: contract, topics: [topics.refund, word(1n), addr(wallet)], data: word(deposit) })
const transfer = (from = contract, to = recipient, n = target) => ({
  address: emitter, topics: [viem.toEventSelector('Transfer(address,address,uint256)'), addr(from), addr(to)], data: word(n),
})
const start = proofSource.indexOf('async function verifyTx(')
const end = proofSource.indexOf('\nexport function Proof()', start)
if (start < 0 || end < 0) throw Error('Verifier boundaries changed: inspect before running')
const verifierJS = transpile(proofSource.slice(start, end))
const proofCases = [
  ['valid payout', [paid(), transfer()], true],
  ['payout missing movement', [paid()], false],
  ['payout wrong transfer destination', [paid(), transfer(contract, other)], false],
  ['payout unrelated transfer sender', [paid(), transfer(other)], false],
  ['payout transfer amount 1 base unit', [paid(), transfer(contract, recipient, 1n)], false],
  ['payout event and transfer 1 base unit versus 1 USDC target', [paid(1n), transfer(contract, recipient, 1n)], false],
  ['valid refund', [refund(), transfer(contract, wallet, deposit)], true],
  ['refund unrelated movement', [refund(), transfer(other, recipient, 1n)], false],
  ['valid contribution with matching inbound movement', [contribution(), transfer(wallet, contract, deposit)], true],
  ['contribution without inbound evidence', [contribution()], false],
  ['contribution with wrong inbound amount', [contribution(), transfer(wallet, contract, 1n)], false],
  ['contribution with zero event amount', [contribution(0n)], false],
]
const results = []
let fetchCalls = 0
async function proofProbes() {
  for (const [name, logs, expected] of proofCases) {
    const fetch = async (_url, request) => {
      fetchCalls++
      const payload = JSON.parse(request.body)
      if (payload.method !== 'eth_getTransactionReceipt') throw Error('Unexpected method: ' + payload.method)
      return { ok: true, json: async () => ({ result: { status: '0x1', to: contract, transactionHash: txHash, logs } }) }
    }
    const verify = new Function('fetch', 'HUIPOT_ADDRESS', 'arcTestnet', 'ARC_SYSTEM_EMITTER', 'PAID_OUT_TOPIC', 'REFUNDED_TOPIC', 'CONTRIBUTED_TOPIC', 'computeOverallValid',
      verifierJS + '\nreturn verifyTx;')(fetch, contract, {rpcUrls:{default:{http:['fixture://no-network']}}}, emitter, topics.paid, topics.refund, topics.contribution, computeOverallValid)
    const actual = await verify(txHash, '1', recipient, target)
    results.push({name, expected, actual: actual.overallValid, pass: expected === actual.overallValid, amountInLog:actual.amountInLog,arcTransferFromMatchesContributor:actual.arcTransferFromMatchesContributor,notes: actual.notes})
  }
}


proofCases.push(['contribution zero event AND zero inbound movement', [contribution(0n), transfer(wallet, contract, 0n)], false]);
proofCases.push(['contribution inbound sender differs from event contributor', [contribution(), transfer(other, contract, deposit)], false]);
proofProbes().then(() => {
const base={receiptStatusOk:true,toMatchesContract:true,eventFound:'Contributed',poolIdMatches:true,recipientMatchesPool:null,eventAmountMatchesTarget:null,amountInLog:deposit.toString(),arcTransferFound:true,arcTransferAmountMatchesEvent:true,arcTransferFromMatchesContributor:true};
for(const [name,patch] of [['shared predicate: amountInLog zero',{amountInLog:'0'}],['shared predicate: sender flag false',{arcTransferFromMatchesContributor:false}]]) {
 const actual=computeOverallValid({...base,...patch}); results.push({name,expected:false,actual,pass:actual===false});
}
const summary={sourceRevision:'f83a442756d62f8477a5199f5732400976609ab8',scope:'Unchanged production verifier with synthetic receipts; no network or wallet',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results}; fs.writeFileSync(output,JSON.stringify(summary,null,2)); console.log(JSON.stringify(summary,null,2));process.exitCode=summary.failed?1:0}).catch(e=>{console.error(e);process.exitCode=2});
