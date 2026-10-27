// Independent review instrument, not application code or a replacement classifier.
// Executes unchanged transpiled page functions and their returned callbacks with
// controlled hook results. Not a mounted DOM, wallet, or live-chain test.
const fs = require('fs'), path = require('path'), { createRequire } = require('module');
const root = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
const load = createRequire(path.join(root, 'package.json'));
const ts = load('typescript'), React = load('react'), viem = load('viem');
const classifierModule={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/poolQueryState.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(load,classifierModule,classifierModule.exports);
const account = '0x1111111111111111111111111111111111111111';
const contract = '0x81a139599d252eb2dc2bbb6c267e911a21264288';
const samplePool = [account, account, 10n ** 18n, BigInt(Math.floor(Date.now()/1000)+86400), 'Existing pool', 'Production render fixture', 0n, 0n, false];
const noop = () => {};
const text = n => n == null || typeof n === 'boolean' ? '' : Array.isArray(n) ? n.map(text).join('') : typeof n === 'object' ? text(n.props?.children) : typeof n === 'function' ? '' : String(n);
const nodes = n => n == null || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)];
function makePage(page, options = {}) {
  const h = { id: '1', connected: false, chain: 5042002, reads: {}, states: [], refs: [], writes: [], refetches: [], stateWrites: [], switches: [], showCalls: 0, ...options };
  const Custom = () => null;
  const mocks = {
    '../lib/poolQueryState':classifierModule.exports,
    react: { ...React, useState(initial) { const i=h.si++; if (!(i in h.states)) h.states[i]=initial; return [h.states[i], v=>{h.stateWrites.push(i);h.states[i]=v;}]; }, useRef(v) {return h.refs[h.ri++] ??= {current:v};}, useEffect:noop, useMemo:f=>f() },
    'react-router-dom': { useParams:()=>({poolId:h.id}), useSearchParams:()=>[new URLSearchParams()], useNavigate:()=>noop, Link:()=>null },
    wagmi: { useAccount:()=>({isConnected:h.connected,address:h.connected?account:undefined,chainId:h.chain}), useReadContract:opts=>({isLoading:false,isError:false,...h.reads[opts.functionName],refetch:()=>{h.refetches.push(opts.functionName);return Promise.resolve();}}), useWriteContract:()=>({writeContract:x=>h.writes.push(x),isPending:false,isError:false}), useWaitForTransactionReceipt:()=>({isLoading:false,isSuccess:false}), useSwitchChain:()=>({switchChain:x=>h.switches.push(x)}) },
    connectkit: {ConnectKitButton:Object.assign(()=>null,{Custom})},
    'lucide-react':new Proxy({}, {get:()=>()=>null}),
    '../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:[],DEPLOYMENT_CONFIGURED:true},
    '../config':{TARGET_CHAIN_ID:5042002,arcTestnet:{name:'Arc Testnet',id:5042002,rpcUrls:{default:{http:['fixture://no-network']}}},parseProductAmount:s=>viem.parseUnits(s,18),formatNativeAmount:n=>viem.formatUnits(n,18),explorerTxUrl:String,explorerAddressUrl:String},
    '../lib/utils':{STATUS:{ACTIVE:0,FUNDED:1,PAID:2,REFUNDING:3,CLOSED:4},formatDeadline:String,formatAddress:String,statusLabel:String,statusColor:()=>'',parseOnchainError:String},
    '../components/CommitmentNotice':{CommitmentNotice:()=>null},
    '../lib/share':{buildShareLink:async()=>''},
    '../lib/actionLifecycle':{makeActionLifecycle:()=>{throw Error('Unexpected nested action execution');}},
    '../lib/verifyTxLogic':{computeOverallValid:()=>{throw Error('Unexpected receipt verification');}},
  };
  const source=fs.readFileSync(path.join(root,`src/pages/${page}.tsx`),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const m={exports:{}};
  new Function('require','module','exports',compiled)(n=>n in mocks?mocks[n]:load(n),m,m.exports);
  h.render=()=>{h.si=h.ri=0;h.tree=m.exports[page]();return h.tree;};
  h.kind=()=>{const t=text(h.render());return /Could not reach the network/.test(t)?'network':/not found|does not exist/.test(t)?'not-found':/Invalid pool ID/.test(t)?'invalid':nodes(h.tree).some(n=>String(n.props?.className).includes('animate-pulse'))?'loading':'content';};
  h.custom=()=>nodes(h.tree).find(n=>n.type===Custom).props.children({show:()=>h.showCalls++});
  h.submit=()=>nodes(h.tree).find(n=>n.type==='form').props.onSubmit({preventDefault:noop});
  return h;
}

module.exports={makePage};
