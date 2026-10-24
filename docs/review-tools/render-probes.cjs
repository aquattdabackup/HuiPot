// Local review instrument: render unchanged Studio components with controlled hook values.
// No wallet, RPC, or application source changes.
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const root = path.resolve(process.argv[2] ?? process.cwd())
const outputPath = path.resolve(process.argv[3] ?? 'docs/evidence/independent-render-probes-2026-10-24.json')
const load = createRequire(path.join(root, 'package.json'))
const ts = load('typescript')
const React = load('react')
const { renderToStaticMarkup } = load('react-dom/server')
const contract = '0x81a139599d252eb2dc2bbb6c267e911a21264288'
const recipient = '0x1111111111111111111111111111111111111111'
const noop = () => {}
let states = [], stateIndex = 0, routeId = '1', receiptState = {}, queryState = {}
const fakeReact = { ...React, useState: () => [states[stateIndex++], noop], useEffect: noop, useRef: (value) => ({ current: value }) }
const configText = fs.readFileSync(path.join(root, 'src/config.ts'), 'utf8')
const start = configText.indexOf('export function parseProductAmount(')
const end = configText.indexOf('\nexport function explorerTxUrl', start)
const moneyCode = ts.transpileModule(configText.slice(start,end).replaceAll('export function','function'), { compilerOptions:{target:ts.ScriptTarget.ES2020} }).outputText
const money = new Function('PRODUCT_DECIMALS','QUANTUM',moneyCode+';return {parseProductAmount, formatNativeAmount}')(6,10n**12n)
const mocks = {
  react: fakeReact,
  'react-router-dom': { useParams: () => ({poolId:routeId}), Link: ({children,to,...props}) => React.createElement('a',{href:to,...props},children) },
  wagmi: {useAccount:()=>({chainId:5042002,isConnected:true,address:recipient}),useSwitchChain:()=>({switchChain:noop}),useWriteContract:()=>({writeContract:noop,data:'0x'+'a'.repeat(64),isPending:false,isError:false}),useWaitForTransactionReceipt:()=>receiptState,useReadContract:()=>queryState},
  connectkit: {ConnectKitButton:()=>null},
  'lucide-react': new Proxy({}, {get:()=>()=>null}),
  '../contract': {HUIPOT_ADDRESS:contract,HUIPOT_ABI:[]},
  '../config': {TARGET_CHAIN_ID:5042002,...money,explorerTxUrl:()=>'',explorerAddressUrl:()=>'',arcTestnet:{id:5042002}},
  '../components/CommitmentNotice':{CommitmentNotice:()=>null},
  '../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>'',formatAddress:(x)=>x,statusLabel:()=>'',statusColor:()=>'',STATUS:{ACTIVE:0,FUNDED:1,PAID:2,REFUNDING:3,CLOSED:4}},
}
function component(file, name) {
  const text = fs.readFileSync(path.join(root,file),'utf8')
  const js = ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText
  const module={exports:{}}
  new Function('require','module','exports',js)((name)=>name in mocks?mocks[name]:load(name),module,module.exports)
  return module.exports[name]
}
const Create = component('src/pages/Create.tsx','Create')
const Pool = component('src/pages/Pool.tsx','Pool')
const Proof = component('src/pages/Proof.tsx','Proof')
const results=[]
function check(name, fn) { try { results.push({case:name,...fn()}) } catch(error) {results.push({case:name,threw:true,error:error.message})} }
receiptState={isLoading:false,isSuccess:false,data:undefined}
states=['Workshop','Purpose','0.0000001',recipient,'2026-10-25','12:00',false,{}];stateIndex=0
check('Create review panel with 7-decimal target',()=>({rendered:!!renderToStaticMarkup(React.createElement(Create))}))
for(const Component of [Pool,Proof]) {
  routeId='abc';states=[false,'',''];stateIndex=0
  check(Component.name+' invalid route /pools/abc',()=>({rendered:!!renderToStaticMarkup(React.createElement(Component))}))
}
routeId='1';states=['Workshop','Purpose','1',recipient,'2026-10-25','12:00',true,{}];stateIndex=0
receiptState={isLoading:false,isSuccess:true,data:{status:'success',to:recipient,logs:[],transactionHash:'0x'+'b'.repeat(64)}}
check('Create receives successful replacement/cancel receipt without PoolCreated',()=>({showsPoolCreated:renderToStaticMarkup(React.createElement(Create)).includes('Pool created')}))
fs.writeFileSync(outputPath,JSON.stringify({type:'Synthetic local component render probes; not browser/testnet execution',sourceRevision:'3f266fce3d0801a2c9df52cf535b371a33f27522',results},null,2)+'\n')
console.log(JSON.stringify(results))
