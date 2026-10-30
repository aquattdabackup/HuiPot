// FFR4: restored real-query completion, errored-query retry, and actual offline QueryObserver.
// Replaces only the optional independent-pending-read diagnostic with a bounded-timeout assertion.
// usePublicClient and useEffect stubs added per CWR6/FFR1/FFR2 (no-op for these probes).
// See docs/evidence/recheck-5989686/preserved-query-review.cjs for the accepted reference.
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
const HASH_A='0x'+'a'.repeat(64),HASH_B='0x'+'b'.repeat(64);
const noop=()=>{};
const mocks={react:{...React,useState:()=>{const i=index++;return [states[i],x=>{if(i===7)errors=x}]},useRef:initial=>{const i=refIndex++;return refs[i]??(refs[i]={current:initial})},useEffect:()=>{}},'react-router-dom':{Link:'a'},wagmi:{useAccount:()=>({address:account,chainId:chain,isConnected:connected}),useSwitchChain:()=>({switchChain:()=>{}}),useWriteContract:()=>({writeContract:x=>{writes.push(x);hashValue=HASH_A},data:hashValue,isPending:false,isError:false}),useWaitForTransactionReceipt:args=>{waitArgs=args;return {...receipt,refetch:receipt.refetch??(()=>{retries++;if(nextReceipt)receipt=nextReceipt;return Promise.resolve({data:receipt.data})})}},usePublicClient:()=>({getTransactionReceipt:()=>Promise.reject(new Error('no-op'))})},connectkit:{ConnectKitButton:{Custom:()=>null}},'lucide-react':new Proxy({},{get:()=>()=>null}),'../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:abi,DEPLOYMENT_CONFIGURED:true},'../config':{...money,TARGET_CHAIN_ID:5042002,explorerTxUrl:x=>x},'../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>''},'../components/CommitmentNotice':{CommitmentNotice:()=>null}};
const mod={exports:{}};new Function('require','module','exports',js(read('src/pages/Create.tsx')))(n=>mocks[n]??load(n),mod,mod.exports);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
function reset(){hashValue=undefined;retries=0;nextReceipt=null;states=[' test ',' 1 ','1',wallet,'2026-10-29','12:00',true,{}];index=0;refIndex=0;refs=[];account=wallet;waitArgs=null;writes=[];errors={};connected=true;chain=5042002;receipt={isLoading:false,isSuccess:false}}
const results=[];
function render(){index=0;refIndex=0;return mod.exports.Create()}
function submit(){const t=render();nodes(t).find(x=>x.type==='form').props.onSubmit({preventDefault:noop});return t}
function log(opts={}){const values={poolId:1n,creator:wallet,recipient:wallet,target:10n**18n,deadline:BigInt(new Date('2026-10-29T12:00:00').getTime()/1000),title:'test',purpose:'1',address:contract,...opts};return {address:values.address,topics:v.encodeEventTopics({abi,eventName:'PoolCreated',args:values}),data:v.encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'string'},{type:'string'}],[values.target,values.deadline,values.title,values.purpose])}}
function success(tree){return nodes(tree).some(x=>x.type==='h1'&&x.props.children==='Pool created')}
function links(tree){return nodes(tree).filter(x=>x.type==='a'&&typeof x.props.href==='string').map(x=>x.props.href)}
function textOf(tree){return JSON.stringify(tree,(_,x)=>typeof x==='bigint'?x.toString():x)}
function retryButton(t){return nodes(t).find(x=>x.type==='button'&&/Check transaction status|Retry confirmation check/.test(textOf(x)))}
function submitButton(t){return nodes(t).find(x=>x.type==='button'&&x.props.type==='submit')}
function record(name,actual,expected=true,details={}){results.push({name,actual,expected,pass:actual===expected,...details})}
async function settle(observer){for(let i=0;i<200;i++){const r=observer.getCurrentResult();if(r.status!=='pending'&&r.fetchStatus==='idle')return;await new Promise(r=>setTimeout(r,5));}throw new Error('query did not settle within bound')}
const originalNow=Date.now;Date.now=()=>new Date('2026-10-29T08:00:00').getTime();
async function main(){
 // Preserved controlled-mock assertions (7 cases)
 reset();submit();render();
 receipt={isLoading:true,isSuccess:false};const tree0=render();const form0=nodes(tree0).find(x=>x.type==='form');
 record('Pending link is outside form and submit is disabled',links(tree0).includes(HASH_A)&&!links(form0).includes(HASH_A)&&submitButton(tree0).props.disabled===true&&retryButton(tree0).props.type==='button');
 reset();submit();render();
 receipt={isLoading:false,isSuccess:false,isError:true,error:new Error('RPC unavailable')};const t1=render();retryButton(t1).props.onClick();
 record('Receipt error shows message, keeps submit disabled, retry calls refetch only',textOf(t1).includes('RPC unavailable')&&submitButton(t1).props.disabled===true&&retries===1&&writes.length===1);
 reset();submit();states[0]='edited';receipt={isError:true,isLoading:false,error:new Error('t')};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log()]}};retryButton(render()).props.onClick();const t2=render();
 record('Retry valid receipt keeps original snapshot and one write',success(t2)&&links(t2).includes(HASH_B)&&writes.length===1&&retries===1);
 reset();submit();receipt={isError:true,isLoading:false};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log({target:2n*10n**18n})]}};retryButton(render()).props.onClick();const t3=render();
 record('Retry different target remains unmatched with mined link',!success(t3)&&links(t3).includes(HASH_B)&&writes.length===1);
 reset();submit();receipt={isError:true,isLoading:false};nextReceipt={isLoading:true,isSuccess:false,data:undefined};retryButton(render()).props.onClick();const t4=render();
 record('Retry unindexed pending receipt stays unknown and locked',!success(t4)&&submitButton(t4).props.disabled===true&&links(t4).includes(HASH_A)&&writes.length===1);
 reset();submit();refs[0].current=null;receipt={isError:true,isLoading:false};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log()]}};retryButton(render()).props.onClick();
 record('Retry missing snapshot does not accept matching event',!success(render())&&writes.length===1);
 reset();submit();receipt={isError:true,isLoading:false};submit();
 record('Submit handler itself blocks repeat submission during receipt error',writes.length,1,{writes:writes.length});

 // FFR4: real QueryObserver — actual query completion (replaces independent-pending-read diagnostic)
 const {QueryClient,QueryObserver,onlineManager}=load('@tanstack/query-core');
 const {waitForTransactionReceiptQueryOptions}=load('@wagmi/core/query');
 reset();submit();render();let waiterCalls=0,resolveWait,seenTimeout;
 const client={chain:{id:5042002},waitForTransactionReceipt:args=>{waiterCalls++;seenTimeout=args.timeout;return new Promise(r=>{resolveWait=r})}};
 const config={getClient:()=>client};
 const qc=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const observer=new QueryObserver(qc,{...waitForTransactionReceiptQueryOptions(config,waitArgs),enabled:true});
 const unsubscribe=observer.subscribe(()=>{});
 await Promise.resolve();receipt=observer.getCurrentResult();
 const pendingTree=render();const again=retryButton(pendingTree).props.onClick();await Promise.resolve();
 record('Pending retry keeps a single write and finite waiter',writes.length===1&&seenTimeout===30000,true,{waiterCalls,actualTimeout:seenTimeout,status:receipt.status,fetchStatus:receipt.fetchStatus});
 record('Production waiter has finite timeout',Number.isFinite(seenTimeout)&&seenTimeout>0,true,{actualTimeout:seenTimeout});
 resolveWait({status:'success',transactionHash:HASH_B,logs:[log()]});await again;await settle(observer);
 receipt=observer.getCurrentResult();record('Real query completion validates original receipt',success(render())&&writes.length===1);
 unsubscribe();qc.clear();

 // FFR4: real errored-query retry
 reset();submit();render();let retryCalls=0;
 const retryClient={chain:{id:5042002},waitForTransactionReceipt:async()=>{retryCalls++;if(retryCalls===1)throw new Error('RPC temporary failure');return {status:'success',transactionHash:HASH_B,logs:[log()]}}};
 const retryQC=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const retryObserver=new QueryObserver(retryQC,{...waitForTransactionReceiptQueryOptions({getClient:()=>retryClient},waitArgs),enabled:false});
 const retryUnsub=retryObserver.subscribe(()=>{});
 await retryObserver.refetch();receipt=retryObserver.getCurrentResult();
 const failedTree=render();await retryButton(failedTree).props.onClick();await settle(retryObserver);receipt=retryObserver.getCurrentResult();
 record('Real errored query retries a read and validates success without another write',success(render())&&writes.length===1&&retryCalls===2,true,{waiterCalls:retryCalls,writes:writes.length});
 retryUnsub();retryQC.clear();

 // FFR4: real offline QueryObserver (actual pausedTree)
 reset();submit();render();onlineManager.setOnline(false);
 const offlineQC=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const offlineObserver=new QueryObserver(offlineQC,{...waitForTransactionReceiptQueryOptions(config,waitArgs),enabled:true});
 const offlineUnsub=offlineObserver.subscribe(()=>{});receipt=offlineObserver.getCurrentResult();
 const pausedTree=render();
 const details={status:receipt.status,fetchStatus:receipt.fetchStatus,isLoading:receipt.isLoading,isError:receipt.isError,disabled:submitButton(pausedTree).props.disabled,hasExplorer:links(pausedTree).includes(HASH_A)};
 record('Real offline-paused receipt retains link and submit lock',details.disabled===true&&details.hasExplorer,true,details);
 if(!submitButton(pausedTree).props.disabled)submit();
 record('Real offline-paused user submit cannot create second write',writes.length,1,{writes:writes.length});
 offlineUnsub();offlineQC.clear();onlineManager.setOnline(true);
}
main().catch(e=>{record('Instrument error',String(e),'no error')}).finally(()=>{
 Date.now=originalNow;
 const result={scope:'Unchanged production Create with CWR6/FFR mocks; real QueryObserver for actual query completion, errored retry and offline state; controlled mock for 7 preserved assertions. No DOM, RPC, wallet or transaction.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 if(result.failed&&!process.exitCode)process.exitCode=1;
});
