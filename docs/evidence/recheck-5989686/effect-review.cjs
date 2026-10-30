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
 start();fail();getReceipt=async()=>({status:'reverted',transactionHash:HASH_A});render();await flush();let t=render();
 record('Current reverted receipt actually renders reverted heading and A link',revertedH1(t)&&links(t).includes(HASH_A)&&writes.length===1);
 record('Both receipt APIs pinned to Arc',clientOptions.chainId===5042002&&waitOptions.chainId===5042002);
 start();fail();render();await flush();t=render();record('Failed independent read remains unknown and locked',!revertedH1(t)&&submitButton(t)?.props.disabled===true&&links(t).includes(HASH_A));
 start();fail();getReceipt=async()=>({status:'success',transactionHash:HASH_A,logs:[]});render();await flush();t=render();record('Successful independent receipt does not falsely mark reverted or bypass matching',!revertedH1(t)&&!success(t));
 start();fail();const old=deferred();getReceipt=()=>old.promise;render();await flush();hashValue=HASH_B;getReceipt=()=>new Promise(()=>{});render();await flush();old.resolve({status:'reverted',transactionHash:HASH_A});await flush();t=render();
 record('Old A read cannot mark new B context reverted',!revertedH1(t),true,{reverted:revertedH1(t),links:links(t),requests});
 start();fail();const late=deferred();getReceipt=()=>late.promise;render();await flush();unmount();late.resolve({status:'reverted',transactionHash:HASH_A});await flush();record('Unmount invalidates outstanding state update',lateSets===0,true,{lateSets});
 // Actual wagmi rejection for a mined replacement B; original A no longer has a receipt.
 start();render();const {QueryClient,QueryObserver}=load('@tanstack/query-core');const {waitForTransactionReceiptQueryOptions}=load('@wagmi/core/query');
 const mined={status:'reverted',transactionHash:HASH_B,logs:[]};let trackedReplacement=false;
 const client={chain:{id:5042002},waitForTransactionReceipt:async args=>{if(args.onReplaced){trackedReplacement=true;args.onReplaced({reason:'repriced',replacedTransaction:{hash:HASH_A},transaction:{hash:HASH_B},transactionReceipt:mined})}return mined},getTransaction:async()=>({from:wallet,to:contract,input:'0x',type:'eip1559',maxFeePerGas:1n,maxPriorityFeePerGas:1n}),call:async()=>({})};
 const qc=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});const obs=new QueryObserver(qc,{...waitForTransactionReceiptQueryOptions({getClient:()=>client},waitArgs),enabled:false});const unsub=obs.subscribe(()=>{});await obs.refetch();receipt=obs.getCurrentResult();
 getReceipt=async({hash})=>{if(hash===HASH_B)return mined;throw Error('original replaced hash has no receipt')};render();await flush();t=render();record('Reverted replacement B renders confirmed revert with B link',revertedH1(t)&&links(t).includes(HASH_B),true,{isError:receipt.isError,trackedReplacement,requests,links:links(t),reverted:revertedH1(t)});unsub();qc.clear();
}
main().catch(e=>{record('Instrument error',String(e),'no error')}).finally(()=>{Date.now=originalNow;const result={scope:'Production Create executed with state-preserving hooks and dependency/cleanup effects, controlled deferred receipt reads; actual wagmi QueryObserver for replacement rejection. No DOM or wallet.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));process.exitCode=result.failed?1:0});
