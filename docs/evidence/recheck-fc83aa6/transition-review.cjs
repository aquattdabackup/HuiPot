// Adapted from docs/evidence/recheck-00252d0/runtime-recovery-probes.cjs
// CWR6: adds usePublicClient and useEffect mocks. Uses actual QueryObserver/wagmi.
// CWR6 revert test now uses actual wagmi action path (throws on reverted receipt → isError=true)
// and the component fetches the receipt via publicClient independently.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]),load=createRequire(path.join(root,'package.json'));
const ts=load('typescript'),React=load('react'),v=load('viem');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const js=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const c=read('src/config.ts');
const money=new Function('PRODUCT_DECIMALS','QUANTUM','UINT256_MAX',js(c.slice(c.indexOf('export function parseProductAmount'),c.indexOf('export function explorerTxUrl')).replaceAll('export function','function'))+';return {parseProductAmount,formatNativeAmount}')(6,10n**12n,(1n<<256n)-1n);
const a=read('src/contract.ts');
const abi=new Function(js(a.slice(a.indexOf('export const HUIPOT_ABI')).replace('export const','const'))+';return HUIPOT_ABI')();
const contract='0x81a139599d252eb2dc2bbb6c267e911a21264288',wallet='0x1111111111111111111111111111111111111111';
let hashValue,retries,nextReceipt;
let states,index,writes,connected,chain,receipt,errors,account,refs,refIndex,waitArgs;
// CWR6: capture effects for manual invocation
const effects=[]; let effectSlots=[],effectIndex=0,requests=[],unmounted=false,lateSets=0,clientOptions,waitOptions;
let getReceipt=()=>Promise.reject(new Error('not found'));
const stableClient={getTransactionReceipt:args=>{requests.push(args.hash);return getReceipt(args)}};
function effectHook(fn,deps){const i=effectIndex++;const old=effectSlots[i];if(!old||deps.some((x,j)=>!Object.is(x,old.deps[j]))){effects.push(()=>{old?.cleanup?.();const cleanup=fn();effectSlots[i]={deps,cleanup};})}}
function unmount(){unmounted=true;for(const x of effectSlots)x?.cleanup?.()}
async function flush(){const pending=effects.splice(0);for(const fn of pending)fn();for(let i=0;i<8;i++)await Promise.resolve()}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
// CWR6: controlled public client receipt
let publicClientReceipt=null;
const HASH_A='0x'+'a'.repeat(64),HASH_B='0x'+'b'.repeat(64);
const noop=()=>{};
const mocks={react:{...React,useState:initial=>{const i=index++;if(!(i in states))states[i]=initial;return [states[i],x=>{if(unmounted)lateSets++;states[i]=typeof x==='function'?x(states[i]):x;if(i===7)errors=x}]},useRef:initial=>{const i=refIndex++;return refs[i]??(refs[i]={current:initial})},useEffect:effectHook},'react-router-dom':{Link:'a'},wagmi:{useAccount:()=>({address:account,chainId:chain,isConnected:connected}),useSwitchChain:()=>({switchChain:()=>{}}),useWriteContract:()=>({writeContract:x=>{writes.push(x);hashValue=HASH_A},data:hashValue,isPending:false,isError:false}),useWaitForTransactionReceipt:args=>{waitArgs=args;waitOptions=args;return {...receipt,refetch:receipt.refetch??(()=>{retries++;if(nextReceipt)receipt=nextReceipt;return Promise.resolve({data:receipt.data})})}},usePublicClient:opts=>{clientOptions=opts;return stableClient}},connectkit:{ConnectKitButton:{Custom:()=>null}},'lucide-react':new Proxy({},{get:()=>()=>null}),'../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:abi,DEPLOYMENT_CONFIGURED:true},'../config':{...money,TARGET_CHAIN_ID:5042002,explorerTxUrl:x=>x},'../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>''},'../components/CommitmentNotice':{CommitmentNotice:()=>null}};
const mod={exports:{}};new Function('require','module','exports',js(read('src/pages/Create.tsx')))(n=>mocks[n]??load(n),mod,mod.exports);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
function reset(){hashValue=undefined;retries=0;nextReceipt=null;states=[' test ',' 1 ','1',wallet,'2026-10-29','12:00',true,{}];index=0;refIndex=0;refs=[];account=wallet;waitArgs=null;writes=[];errors={};connected=true;chain=5042002;receipt={isLoading:false,isSuccess:false};publicClientReceipt=null;effects.length=0;effectSlots=[];effectIndex=0;requests=[];unmounted=false;lateSets=0;getReceipt=()=>Promise.reject(new Error('not found'))}
const results=[];
function render(){index=0;refIndex=0;effects.length=0;effectIndex=0;return mod.exports.Create()}
function submit(){const t=render();nodes(t).find(x=>x.type==='form').props.onSubmit({preventDefault:noop});return t}
function log(opts={}){const values={poolId:1n,creator:wallet,recipient:wallet,target:10n**18n,deadline:BigInt(new Date('2026-10-29T12:00:00').getTime()/1000),title:'test',purpose:'1',address:contract,...opts};return {address:values.address,topics:v.encodeEventTopics({abi,eventName:'PoolCreated',args:values}),data:v.encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'string'},{type:'string'}],[values.target,values.deadline,values.title,values.purpose])}}
function success(tree){return nodes(tree).some(x=>x.type==='h1'&&x.props.children==='Pool created')}
function revertedH1(tree){return nodes(tree).some(x=>x.type==='h1'&&String(x.props.children).includes('Transaction reverted'))}
function links(tree){return nodes(tree).filter(x=>x.type==='a'&&typeof x.props.href==='string').map(x=>x.props.href)}
function textOf(tree){return JSON.stringify(tree,(_,x)=>typeof x==='bigint'?x.toString():x)}
function submitButton(t){return nodes(t).find(x=>x.type==='button'&&x.props.type==='submit')}
function record(name,actual,expected=true,details={}){results.push({name,actual,expected,pass:actual===expected,...details})}
async function settle(observer){for(let i=0;i<200;i++){const r=observer.getCurrentResult();if(r.status!=='pending'&&r.fetchStatus==='idle')return;await new Promise(r=>setTimeout(r,5));}throw new Error('did not settle')}

const originalNow=Date.now;Date.now=()=>new Date('2026-10-29T08:00:00').getTime();
function start(){reset();submit();if(writes.length!==1)throw Error('initial write missing')}
function fail(){receipt={isError:true,isSuccess:false,isLoading:false,fetchStatus:'idle',error:new Error('execution reverted')}}

async function main(){
 // Previously settled true is distinct from the previously tested in-flight stale resolution.
 start();fail();getReceipt=async()=>({status:'reverted',transactionHash:HASH_A});render();await flush();
 record('Ordinary A confirmed revert control',revertedH1(render()));
 hashValue=HASH_B;getReceipt=()=>new Promise(()=>{});let t=render();
 record('Settled A verdict not visible during first B render',!revertedH1(t),true,{links:links(t),reverted:revertedH1(t)});
 await flush();t=render();
 record('Settled A verdict not relabelled as pending B after effect',!revertedH1(t),true,{links:links(t),reverted:revertedH1(t),requests});
 // Replacement ref updates are not a dependency/state update. No intermediate render of loading.
 start();fail();getReceipt=()=>Promise.reject(Error('original not mined'));render();await flush();
 getReceipt=async({hash})=>hash===HASH_B?{status:'reverted',transactionHash:HASH_B}:Promise.reject(Error('A not mined'));
 waitOptions.onReplaced({transactionReceipt:{status:'reverted',transactionHash:HASH_B},transaction:{hash:HASH_B},replacedTransaction:{hash:HASH_A},reason:'repriced'});
 render();await flush();t=render();
 record('Replacement update invalidates unchanged error-state lookup',revertedH1(t)&&links(t).includes(HASH_B),true,{requests,links:links(t),reverted:revertedH1(t)});
 // Catch branch must reject old failures too, not only old successful resolutions.
 start();fail();const d=deferred();getReceipt=()=>d.promise;render();await flush();hashValue=HASH_B;
 getReceipt=async()=>({status:'reverted',transactionHash:HASH_B});render();await flush();d.reject(Error('old read failed'));await flush();t=render();
 record('Late A rejection cannot erase confirmed B verdict',revertedH1(t)&&links(t).includes(HASH_B));
 start();fail();const u=deferred();getReceipt=()=>u.promise;render();await flush();unmount();u.reject(Error('late failure'));await flush();
 record('Unmount discards delayed rejection setter',lateSets===0,true,{lateSets});
}
main().catch(e=>{record('Instrument error',String(e),'no error')}).finally(()=>{Date.now=originalNow;const result={scope:'Unchanged Create with state-preserving effect harness; synthetic settled-verdict identity transition and callback update while error flag stays true; delayed rejection controls. No browser or wallet.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));process.exitCode=result.failed?1:0});
