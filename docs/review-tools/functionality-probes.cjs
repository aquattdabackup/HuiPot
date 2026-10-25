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
    const verify = new Function('fetch', 'HUIPOT_ADDRESS', 'arcTestnet', 'ARC_SYSTEM_EMITTER', 'PAID_OUT_TOPIC', 'REFUNDED_TOPIC', 'CONTRIBUTED_TOPIC',
      verifierJS + '\nreturn verifyTx;')(fetch, contract, {rpcUrls:{default:{http:['fixture://no-network']}}}, emitter, topics.paid, topics.refund, topics.contribution)
    const actual = await verify(txHash, '1', recipient, target)
    results.push({name, expected, actual: actual.overallValid, pass: expected === actual.overallValid, notes: actual.notes})
  }
}

const moneySource = read('src/config.ts')
const mstart = moneySource.indexOf('export function parseProductAmount(')
const mend = moneySource.indexOf('\nexport function explorerTxUrl', mstart)
const moneyJS = transpile(moneySource.slice(mstart, mend).replaceAll('export function', 'function'))
const money = new Function('PRODUCT_DECIMALS','QUANTUM','UINT256_MAX', moneyJS + '\nreturn {parseProductAmount,formatNativeAmount};')(6,10n**12n,(1n<<256n)-1n)
const abiSource=read('src/contract.ts')
const abiStart=abiSource.indexOf('export const HUIPOT_ABI =')
if(abiStart<0)throw Error('ABI declaration changed')
const abi=new Function(transpile(abiSource.slice(abiStart).replace('export const','const'))+'\nreturn HUIPOT_ABI;')()
let stateValues = [], stateIndex = 0, receipt = {}, writes = [], queryValues = {}, routeId = '1'
const noop = () => {}
const fakeReact = {...React, useState: () => [stateValues[stateIndex++], noop], useEffect: noop, useRef: v => ({current:v})}
const mocks = {
  react: fakeReact,
  'react-router-dom': {useParams:()=>({poolId:routeId}),Link:({children,to,...props})=>React.createElement('a',{href:to,...props},children)},
  wagmi: {
    useAccount:()=>({address:wallet,chainId:5042002,isConnected:true}),useSwitchChain:()=>({switchChain:noop}),
    useWriteContract:()=>({writeContract:arg=>writes.push(arg),data:txHash,isPending:false,isError:false}),
    useWaitForTransactionReceipt:()=>receipt,
    useReadContract:arg=>({...queryValues[arg.functionName],refetch:noop}),
  },
  connectkit:{ConnectKitButton:()=>null},
  'lucide-react':new Proxy({}, {get:()=>()=>null}),
  '../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:abi},
  '../config':{TARGET_CHAIN_ID:5042002,...money,explorerTxUrl:()=>'',explorerAddressUrl:()=>'',arcTestnet:{id:5042002}},
  '../components/CommitmentNotice':{CommitmentNotice:()=>null},
  '../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>'',formatAddress:x=>x,statusLabel:()=>'',statusColor:()=>'',STATUS:{ACTIVE:0,FUNDED:1,PAID:2,REFUNDING:3,CLOSED:4}},
}
function moduleFrom(file, expose = '') {
  const module = {exports:{}}
  new Function('require','module','exports', transpile(read(file)) + expose)(name=> name in mocks ? mocks[name] : load(name),module,module.exports)
  return module.exports
}
const {__ActionPanel:ActionPanel,Pool} = moduleFrom('src/pages/Pool.tsx','\nexports.__ActionPanel = ActionPanel;')
const {Create} = moduleFrom('src/pages/Create.tsx')
const {Proof} = moduleFrom('src/pages/Proof.tsx')
function reset(states=[]) {stateValues=states;stateIndex=0;writes=[];receipt={isLoading:false,isSuccess:false};queryValues={}}
const panel = {poolId:'1',poolIdBig:1n,status:0,target,remaining:target,myContribution:deposit,myClaimable:deposit,isConnected:true,wrongChain:false,onSuccess:noop}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree,...nodes(tree.props?.children)]
}
function uiProbe(name, expected, actual) {results.push({name,expected,actual,pass:expected===actual})}
function uiProbes() {
  for(const [action,status] of [['contribute',0],['payout',1],['claimRefund',3]]) {
    reset(['0.4',''])
    const tree=ActionPanel({...panel,status})
    const control=nodes(tree).find(n=>action==='contribute'?n.type==='form':n.type==='button'&&n.props.onClick?.name===(action==='payout'?'handlePayout':'handleRefund'))
    if(!control) throw Error('Cannot locate production action control '+action)
    if(action==='contribute')control.props.onSubmit({preventDefault:noop});else control.props.onClick()
    uiProbe('review '+action+' should not write before separate confirmation',0,writes.length)
    reset(['0.4',''])
    receipt={isLoading:false,isSuccess:true,data:{status:'success',to:wallet,logs:[],transactionHash:txHash}}
    const html=renderToStaticMarkup(React.createElement(ActionPanel,{...panel,status}))
    const label=action==='contribute'?'Contribution confirmed.':action==='payout'?'Payout confirmed.':'Refund confirmed.'
    uiProbe(action+' cancellation receipt without expected event must not confirm',false,html.includes(label))
  }
  reset(['',''])
  uiProbe('unloaded refund claim must not say wallet has no contribution',false,
    renderToStaticMarkup(React.createElement(ActionPanel,{...panel,status:3,myClaimable:undefined})).includes('This wallet has no unclaimed contribution.'))
  for(const Component of [Pool,Proof]) {
    reset(Component===Pool?[false]:['',{phase:'idle'}])
    queryValues={getPool:{isLoading:false,isError:true,data:undefined},getStatus:{data:undefined},poolCount:{data:undefined}}
    const html=renderToStaticMarkup(React.createElement(Component))
    uiProbe(Component.name+' RPC failure must not be reported as pool not found',false,/not found|does not exist/i.test(html))
  }
  reset(['Workshop','Shared expense','1','0x'+'0'.repeat(40),'2030-01-02','12:00',true,{}])
  const actualNow=Date.now;Date.now=()=>Date.parse('2030-01-01T00:00:00Z')
  try {
    const form=nodes(Create()).find(n=>n.type==='form')
    form.props.onSubmit({preventDefault:noop})
    uiProbe('zero recipient should be rejected before wallet request',0,writes.length)
  } finally {Date.now=actualNow}
  reset(['Workshop','Shared expense','1',recipient,'2030-01-02','12:00',true,{}])
  const eventTopics=viem.encodeEventTopics({abi,eventName:'PoolCreated',args:{poolId:1n,creator:wallet,recipient}})
  const eventData=viem.encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'string'},{type:'string'}],
    [2n*target,BigInt(Math.floor(Date.parse('2030-01-02T12:00:00Z')/1000)),'Workshop','Shared expense'])
  receipt={isLoading:false,isSuccess:true,data:{status:'success',to:contract,logs:[{address:contract,topics:eventTopics,data:eventData}],transactionHash:txHash}}
  uiProbe('creation event with 2-USDC target must not confirm a 1-USDC request',false,
    renderToStaticMarkup(React.createElement(Create)).includes('Pool created'))
}
(async()=>{
  await proofProbes();uiProbes()
  const sourceFiles=['src/pages/Proof.tsx','src/pages/Pool.tsx','src/pages/Create.tsx','src/config.ts','src/contract.ts']
  const report={kind:'Independent synthetic production-source probes, not browser or chain execution',sourceRevision:'37ee96c268ed68ac9b951d189aaf03cca978b462',
    method:'Unchanged verifier extracted and transpiled; unchanged component handlers rendered/invoked with controlled hooks. All network/wallet functions mocked.',
    sourceHashes:Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(read(f)).digest('hex')])),
    cases:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,syntheticFetchCalls:fetchCalls,results}
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
  process.exitCode=report.failed?1:0
})().catch(e=>{console.error(e);process.exitCode=2})
